import { useEffect, useState, useCallback } from "react";
import { VoiceActions } from "./api/voiceActions";
import { VoiceAssistant } from "./api/voiceAssistant";
import {
  sendChatMessage,
  speak,
  type ChatMessage,
  type ZazanMode,
  type ZazanLanguage,
} from "./api/client";
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

const STORAGE_KEYS = {
  MODE: "zazan_active_mode",
  LANG: "zazan_active_lang",
  TTS: "zazan_tts_enabled",
  CONVOS: "zazan_convos_",
  MSGS: "zazan_msgs_",
};

function getLocalConversations(userId: string): Conversation[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.CONVOS}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalConversations(userId: string, list: Conversation[]) {
  try {
    localStorage.setItem(`${STORAGE_KEYS.CONVOS}${userId}`, JSON.stringify(list));
  } catch (e) {
    console.warn("Storage write error", e);
  }
}

function getLocalMessages(convoId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.MSGS}${convoId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMessage(convoId: string, msg: ChatMessage) {
  try {
    const list = getLocalMessages(convoId);
    list.push(msg);
    localStorage.setItem(`${STORAGE_KEYS.MSGS}${convoId}`, JSON.stringify(list));
  } catch (e) {
    console.warn("Storage write error", e);
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const [currentMode, setCurrentMode] = useState<ZazanMode>(() => {
    return (localStorage.getItem(STORAGE_KEYS.MODE) as ZazanMode) || "general";
  });

  const [currentLanguage, setCurrentLanguage] = useState<ZazanLanguage>(() => {
    return (localStorage.getItem(STORAGE_KEYS.LANG) as ZazanLanguage) || "en";
  });

  const [ttsEnabled, setTtsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TTS);
    return saved !== null ? saved === "true" : true;
  });

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [listening, setListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  // Auto-dismiss voice notice after 7 seconds
  useEffect(() => {
    if (voiceNotice) {
      const timer = setTimeout(() => setVoiceNotice(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [voiceNotice]);

  // Load Session from Supabase on start
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted && data.session?.user) {
          setUser(data.session.user);
        }
      } catch (err) {
        console.warn("Supabase auth session load fallback:", err);
      }
    }

    initSession();

    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch {
      return () => {
        mounted = false;
      };
    }
  }, []);

  const loadConversations = useCallback(async (userId: string) => {
    if (userId === "guest-user") {
      setConversations(getLocalConversations(userId));
      return;
    }

    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setConversations(data ?? []);
    } catch (err) {
      console.warn("Failed to load conversations from Supabase, using local:", err);
      setConversations(getLocalConversations(userId));
    }
  }, []);

  // When user changes, reload conversations
  useEffect(() => {
    const activeUserId = user ? user.id : "guest-user";
    loadConversations(activeUserId);
  }, [user, loadConversations]);

  const handleSelectMode = (mode: ZazanMode) => {
    setCurrentMode(mode);
    localStorage.setItem(STORAGE_KEYS.MODE, mode);
  };

  const handleSelectLanguage = (lang: ZazanLanguage) => {
    setCurrentLanguage(lang);
    localStorage.setItem(STORAGE_KEYS.LANG, lang);
  };

  const handleToggleTts = () => {
    setTtsEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEYS.TTS, String(next));
      return next;
    });
  };

  const createConversation = async (firstQuery?: string): Promise<string> => {
    const activeUserId = user ? user.id : "guest-user";
    const title = firstQuery?.trim().slice(0, 40) || "New Conversation";
    const newConvo: Conversation = {
      id: "conv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (activeUserId === "guest-user") {
      const updated = [newConvo, ...conversations];
      setConversations(updated);
      setLocalConversations(activeUserId, updated);
      setActiveConversationId(newConvo.id);
      return newConvo.id;
    }

    try {
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user!.id,
          title,
        })
        .select("id, title, created_at, updated_at")
        .single();

      if (error) throw error;

      setConversations((prev) => [data, ...prev]);
      setActiveConversationId(data.id);
      return data.id;
    } catch (err) {
      console.warn("Remote createConversation failed, falling back to local:", err);
      const updated = [newConvo, ...conversations];
      setConversations(updated);
      setLocalConversations(activeUserId, updated);
      setActiveConversationId(newConvo.id);
      return newConvo.id;
    }
  };

  const loadConversation = async (id: string) => {
    const activeUserId = user ? user.id : "guest-user";
    setActiveConversationId(id);

    if (activeUserId === "guest-user") {
      setMessages(getLocalMessages(id));
      return;
    }

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", id)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(
        (data ?? []).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
    } catch (err) {
      console.warn("Remote loadConversation failed, falling back to local:", err);
      setMessages(getLocalMessages(id));
    }
  };

  const saveMessage = async (convoId: string, message: ChatMessage) => {
    const activeUserId = user ? user.id : "guest-user";
    saveLocalMessage(convoId, message);

    if (activeUserId === "guest-user") return;

    try {
      await supabase.from("messages").insert({
        conversation_id: convoId,
        user_id: user!.id,
        role: message.role,
        content: message.content,
      });
    } catch (err) {
      console.warn("Could not save message to remote Supabase:", err);
    }
  };

  const handleVoiceCommand = async (text: string): Promise<boolean> => {
    const cmd = text.toLowerCase().trim();

    // YouTube
    if (cmd.includes("open youtube") || cmd === "youtube") {
      await VoiceActions.openYouTube({});
      return true;
    }
    if (cmd.startsWith("search youtube for ") || cmd.startsWith("youtube ")) {
      const query = cmd.replace(/^(search youtube for|youtube)\s+/, "");
      await VoiceActions.openYouTube({ query });
      return true;
    }

    // Maps
    if (cmd.includes("open maps") || cmd.includes("open google maps")) {
      await VoiceActions.openMaps({});
      return true;
    }
    if (cmd.startsWith("directions to ") || cmd.startsWith("navigate to ") || cmd.startsWith("maps ")) {
      const query = cmd.replace(/^(directions to|navigate to|maps)\s+/, "");
      await VoiceActions.openMaps({ query });
      return true;
    }

    // Camera
    if (cmd === "open camera" || cmd === "take a picture" || cmd === "camera") {
      await VoiceActions.openCamera();
      return true;
    }

    // WhatsApp
    if (cmd.includes("open whatsapp") || cmd === "whatsapp") {
      await VoiceActions.openWhatsApp({});
      return true;
    }

    // App Launchers
    const apps: Record<string, string> = {
      whatsapp: "com.whatsapp",
      facebook: "com.facebook.katana",
      tiktok: "com.zhiliaoapp.musically",
      youtube: "com.google.android.youtube",
      instagram: "com.instagram.android",
    };

    for (const [name, packageName] of Object.entries(apps)) {
      if (cmd.includes("open " + name) || cmd === name) {
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
  };

  const handleAsk = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isThinking) return;

    // Check voice / action commands first
    const isCommand = await handleVoiceCommand(trimmed);
    if (isCommand) return;

    let convoId = activeConversationId;
    if (!convoId) {
      convoId = await createConversation(trimmed);
    }

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    if (convoId) {
      await saveMessage(convoId, userMessage);
    }

    setIsThinking(true);

    try {
      const reply = await sendChatMessage(nextMessages, currentMode, currentLanguage);
      const assistantMessage: ChatMessage = { role: "assistant", content: reply };
      setMessages([...nextMessages, assistantMessage]);

      if (convoId) {
        await saveMessage(convoId, assistantMessage);
      }

      if (ttsEnabled && reply) {
        try {
          const audioBlob = await speak(reply);
          if (audioBlob && audioBlob.size > 0) {
            const url = URL.createObjectURL(audioBlob);
            const audio = new Audio(url);
            audio.onended = () => URL.revokeObjectURL(url);
            await audio.play();
          }
        } catch (voiceErr) {
          console.warn("TTS playback warning:", voiceErr);
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg: ChatMessage = {
        role: "assistant",
        content:
          err instanceof Error
            ? `⚠️ ${err.message}`
            : "⚠️ Unable to process request. Please try again.",
      };
      setMessages([...nextMessages, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const getLanguageTag = (lang: ZazanLanguage): string => {
    switch (lang) {
      case "ps":
        return "ps-AF";
      case "ur":
        return "ur-PK";
      case "ar":
        return "ar-SA";
      case "en":
      default:
        return "en-US";
    }
  };

  const handleVoiceInput = async () => {
    if (listening || isThinking) return;
    setVoiceNotice(null);

    try {
      setListening(true);
      const res = await VoiceAssistant.listen({ lang: getLanguageTag(currentLanguage) });

      if (res.error === "not-allowed") {
        setVoiceNotice(
          "Microphone access was denied or is blocked by your browser. Please allow microphone permissions or type your question below."
        );
        return;
      }

      if (res.error === "not-supported") {
        setVoiceNotice(
          "Voice input is not supported in this browser. Please type your message below or try Google Chrome."
        );
        return;
      }

      if (res.error) {
        setVoiceNotice("Could not capture speech. Please try again or type your message.");
        return;
      }

      const text = res.text?.trim();
      if (text) {
        await handleAsk(text);
      }
    } catch (err) {
      console.warn("Voice input notice:", err);
      setVoiceNotice("Microphone unavailable. Please type your message below.");
    } finally {
      setListening(false);
    }
  };

  const handleReplayAudio = async (text: string) => {
    try {
      const audioBlob = await speak(text);
      if (audioBlob && audioBlob.size > 0) {
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
      }
    } catch (e) {
      console.warn("Replay audio error:", e);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleClearMessages = () => {
    setMessages([]);
  };

  const handleDeleteConversation = (id: string) => {
    const activeUserId = user ? user.id : "guest-user";
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    setLocalConversations(activeUserId, updated);

    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }

    if (user) {
      supabase.from("conversations").delete().eq("id", id).eq("user_id", user.id).then();
    }
  };

  const handleAuthSubmit = async (email: string, pass: string, isSignup: boolean) => {
    setAuthError(null);
    setAuthMessage(null);

    if (!email.trim() || !pass) {
      setAuthError("Please provide both email and password.");
      return;
    }

    setAuthLoading(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pass,
        });

        if (error) throw error;

        if (!data.session) {
          setAuthMessage("Account created! Please check your email inbox to verify your account.");
        } else {
          setUser(data.user);
          setAuthModalOpen(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pass,
        });

        if (error) throw error;

        setUser(data.user);
        setAuthModalOpen(false);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Sign out notice", e);
    }
    setUser(null);
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleContinueAsGuest = () => {
    setUser(null);
    setAuthModalOpen(false);
  };

  return (
    <ZazanAIScreen
      onAsk={handleAsk}
      onVoice={handleVoiceInput}
      listening={listening}
      isThinking={isThinking}
      messages={messages}
      onClearMessages={handleClearMessages}
      onNewChat={handleNewChat}
      onReplayAudio={handleReplayAudio}
      ttsEnabled={ttsEnabled}
      onToggleTts={handleToggleTts}
      currentMode={currentMode}
      onSelectMode={handleSelectMode}
      currentLanguage={currentLanguage}
      onSelectLanguage={handleSelectLanguage}
      conversations={conversations}
      activeConversationId={activeConversationId}
      onSelectConversation={loadConversation}
      onDeleteConversation={handleDeleteConversation}
      user={user}
      onOpenAuth={() => setAuthModalOpen(true)}
      onLogout={handleLogout}
      authModalOpen={authModalOpen}
      onCloseAuth={() => setAuthModalOpen(false)}
      onAuthSubmit={handleAuthSubmit}
      authLoading={authLoading}
      authError={authError}
      authMessage={authMessage}
      onContinueAsGuest={handleContinueAsGuest}
      voiceNotice={voiceNotice}
      onDismissVoiceNotice={() => setVoiceNotice(null)}
    />
  );
}
