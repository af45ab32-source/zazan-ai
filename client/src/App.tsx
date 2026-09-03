import { useEffect, useState } from "react";
import { VoiceActions } from "./api/voiceActions";
import { VoiceAssistant } from "./api/voiceAssistant";
import { sendChatMessage, speak, type ChatMessage } from "./api/client";
import { supabase } from "./lib/supabase";
import type { User } from "@supabase/supabase-js";
import ZazanAIScreen from "./ZazanAIScreen";
import "./App.css";

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (mounted) {
        setUser(data.session?.user ?? null);
        setCheckingAuth(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setConversationId(null);
      setMessages([]);
      return;
    }

    loadConversations(user.id);
  }, [user]);

  async function loadConversations(userId: string) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to load conversations:", error);
      return;
    }

    setConversations(data ?? []);
  }

  async function createConversation(firstMessage?: string) {
    if (!user) return null;

    const title =
      firstMessage?.trim().slice(0, 50) || "New Chat";

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title,
      })
      .select("id, title, created_at, updated_at")
      .single();

    if (error) {
      throw error;
    }

    setConversations((previous) => [data, ...previous]);
    setConversationId(data.id);
    setMessages([]);

    return data.id;
  }

  async function loadConversation(id: string) {
    if (!user) return;

    const { data, error } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      setError("Could not load this conversation.");
      console.error(error);
      return;
    }

    setConversationId(id);

    setMessages(
      (data ?? []).map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }))
    );

    setError(null);
    setSidebarOpen(false);
  }

  async function saveMessage(
    id: string,
    message: ChatMessage
  ) {
    if (!user) return;

    const { error } = await supabase.from("messages").insert({
      conversation_id: id,
      user_id: user.id,
      role: message.role,
      content: message.content,
    });

    if (error) {
      throw error;
    }
  }

  async function handleAuth() {
    setAuthError(null);
    setAuthMessage(null);

    if (!email.trim() || !password) {
      setAuthError("Please enter your email and password.");
      return;
    }

    setAuthLoading(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (!data.session) {
          setAuthMessage(
            "Account created. Please check your email to confirm your account."
          );
        } else {
          setUser(data.user);
        }
      } else {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (error) throw error;

        setUser(data.user);
      }
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : "Authentication failed."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    setUser(null);
    setMessages([]);
    setConversationId(null);
    setConversations([]);
  }

  function handleNewChat() {
    setConversationId(null);
    setMessages([]);
    setInput("");
    setError(null);
    setSidebarOpen(false);
  }

  async function handleVoice() {
    if (!user || loading || listening) return;

    try {
      setListening(true);
      setError(null);

      const result = await VoiceAssistant.listen();
      const text = result.text?.trim();

      if (!text) return;

      const handled = await handleVoiceCommand(text);

      if (handled) return;

      await handleVoiceSend(text);
    } catch (err) {
      console.error("Voice assistant error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not understand your voice."
      );
    } finally {
      setListening(false);
    }
  }

  async function handleVoiceSend(text: string) {
    if (!user || !text.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const voiceMessage: ChatMessage = {
        role: "user",
        content: text.trim(),
      };

      const voiceMessages = [...messages, voiceMessage];

      const reply = await sendChatMessage(voiceMessages);

      if (!reply) {
        throw new Error("Zazan returned an empty response.");
      }

      try {
        const audioBlob = await speak(reply);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      } catch (voiceError) {
        console.error("Voice playback error:", voiceError);
        throw new Error("Zazan answered, but voice playback failed.");
      }
    } catch (err) {
      console.error("Voice send error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not process voice request."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVoiceCommand(text: string): Promise<boolean> {
    const command = text.toLowerCase().trim();

    const apps: Record<string, string> = {
      whatsapp: "com.whatsapp",
      facebook: "com.facebook.katana",
      tiktok: "com.zhiliaoapp.musically",
      youtube: "com.google.android.youtube",
    };

    for (const [name, packageName] of Object.entries(apps)) {
      if (command.includes("open " + name) || command === name) {
        try {
          await VoiceActions.openApp({ packageName });
          return true;
        } catch (error) {
          console.error("Could not open app:", error);
          return false;
        }
      }
    }

    return false;
  }

  async function handleSend() {
    if (!user || !input.trim() || loading) return;

    const text = input.trim();

    const handled = await handleVoiceCommand(text);
    if (handled) {
      setInput("");
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
    };

    let activeConversationId = conversationId;

    setLoading(true);
    setError(null);
    setInput("");

    try {
      if (!activeConversationId) {
        activeConversationId = await createConversation(text);
      }

      if (!activeConversationId) {
        throw new Error("Could not create conversation.");
      }

      const nextMessages = [...messages, userMessage];

      setMessages(nextMessages);

      await saveMessage(activeConversationId, userMessage);

      const reply = await sendChatMessage(nextMessages);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: reply,
      };

      setMessages([...nextMessages, assistantMessage]);

      await saveMessage(
        activeConversationId,
        assistantMessage
      );

      try {
        const audioBlob = await speak(reply);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      } catch (voiceError) {
        console.error("Voice playback error:", voiceError);
      }

      await supabase
        .from("conversations")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeConversationId)
        .eq("user_id", user.id);

      await loadConversations(user.id);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : typeof err === "object"
            ? JSON.stringify(err)
            : String(err)
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="app auth-screen">
        <div className="auth-card">
          <div className="zazan-logo">Z</div>
          <h1>Zazan AI</h1>
          <p className="subtitle">Checking your account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app auth-screen">
        <div className="auth-card">
          <div className="zazan-logo">Z</div>

          <h1>Zazan AI</h1>

          <p className="subtitle">
            {isSignup
              ? "Create your Zazan account"
              : "Welcome back"}
          </p>

          <div className="auth-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={
                isSignup ? "new-password" : "current-password"
              }
            />

            <button
              className="primary-button"
              onClick={handleAuth}
              disabled={authLoading}
            >
              {authLoading
                ? "Please wait..."
                : isSignup
                  ? "Create Account"
                  : "Login"}
            </button>

            {authError && (
              <div className="error">{authError}</div>
            )}

            {authMessage && (
              <div className="message assistant">
                {authMessage}
              </div>
            )}

            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setAuthError(null);
                setAuthMessage(null);
              }}
            >
              {isSignup
                ? "Already have an account? Login"
                : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="small-logo">Z</div>
            <span>Zazan AI</span>
          </div>

          <button
            className="icon-button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>

        <button
          className="new-chat-button"
          onClick={handleNewChat}
        >
          <span>＋</span>
          New Chat
        </button>

        <div className="history-section">
          <div className="history-title">
            <span>Recent Chats</span>
          </div>

          {conversations.length === 0 ? (
            <p className="empty-history">
              No conversations yet.
            </p>
          ) : (
            <div className="conversation-list">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() =>
                    loadConversation(conversation.id)
                  }
                  className={
                    conversation.id === conversationId
                      ? "conversation-item active"
                      : "conversation-item"
                  }
                >
                  <span className="chat-icon">◌</span>
                  <span>{conversation.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">
              {(user.email?.[0] || "U").toUpperCase()}
            </div>

            <div className="profile-info">
              <strong>Account</strong>
              <span>{user.email}</span>
            </div>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        {messages.length > 0 && (
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            ⋮
          </button>

          <div className="topbar-title">
            <div className="top-logo">Z</div>
            <div>
              <strong>Zazan AI</strong>
              <span>AI Assistant</span>
            </div>
          </div>

          <button
            className="top-new-chat"
            onClick={handleNewChat}
          >
            ＋
          </button>
        </header>
        )}

        <section className="chat-area">
          {messages.length === 0 && !loading ? (
            <ZazanAIScreen onAsk={handleSend} onMenu={() => setSidebarOpen(true)} onVoice={handleVoice} listening={listening} />
          ) : (
            <div className="chat-log">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`message ${m.role}`}
                >
                  <strong>
                    {m.role === "user"
                      ? "You"
                      : "Zazan"}
                  </strong>
                  <div>{m.content}</div>
                </div>
              ))}

              {loading && (
                <div className="message assistant">
                  <strong>Zazan</strong>
                  <div className="thinking">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {error && (
          <div className="error chat-error">
            {error}
          </div>
        )}

        {messages.length > 0 && (
          <div className="composer-area">
            <div className="input-row">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSend();
                  }
                }}
                placeholder="Message Zazan..."
                disabled={loading}
              />

              <button
                className="send-button"
                onClick={handleSend}
                disabled={loading || !input.trim()}
              >
                ↑
              </button>
            </div>

            <p className="composer-note">
              Zazan AI can make mistakes. Check important information.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

