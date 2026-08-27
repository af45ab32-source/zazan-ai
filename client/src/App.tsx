import { useEffect, useState } from "react";
import { sendChatMessage, type ChatMessage } from "./api/client";
import { supabase } from "./lib/supabase";
import type { User } from "@supabase/supabase-js";
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

  async function handleNewChat() {
    setConversationId(null);
    setMessages([]);
    setInput("");
    setError(null);
  }

  async function handleSend() {
    if (!user || !input.trim() || loading) return;

    const text = input.trim();

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
      <div className="app">
        <h1>Zazan AI</h1>
        <p>Checking your account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <h1>Zazan AI</h1>

        <p className="subtitle">
          {isSignup
            ? "Create your Zazan account"
            : "Login to Zazan AI"}
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
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Password"
            autoComplete={
              isSignup
                ? "new-password"
                : "current-password"
            }
          />

          <button
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
    );
  }

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>Zazan AI</h1>
          <p className="subtitle">{user.email}</p>
        </div>

        <button onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="chat-actions">
        <button onClick={handleNewChat}>
          + New Chat
        </button>
      </div>

      {conversations.length > 0 && (
        <div className="conversation-list">
          <h3>Chat History</h3>

          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() =>
                loadConversation(conversation.id)
              }
              className={
                conversation.id === conversationId
                  ? "active-conversation"
                  : ""
              }
            >
              {conversation.title}
            </button>
          ))}
        </div>
      )}

      <div className="chat-log">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`message ${m.role}`}
          >
            <strong>{m.role}:</strong>{" "}
            {m.content}
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            Zazan is thinking…
          </div>
        )}
      </div>

      {error && (
        <div className="error">{error}</div>
      )}

      <div className="input-row">
        <input
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSend();
            }
          }}
          placeholder="Talk to Zazan…"
          disabled={loading}
        />

        <button
          onClick={handleSend}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default App;
