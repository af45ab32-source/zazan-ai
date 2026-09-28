import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MoreVertical,
  Send,
  Volume2,
  VolumeX,
  Trash2,
  Plus,
  X,
  Globe,
  BookOpen,
  Code,
  Languages,
  FileText,
  Compass,
  User as UserIcon,
  LogIn,
  LogOut,
  Copy,
  Check,
  Sparkles,
  MessageSquare,
  ArrowDown,
} from "lucide-react";
import type { ZazanMode, ZazanLanguage, ChatMessage } from "./api/client";
import type { User } from "@supabase/supabase-js";
import cyberEyesImg from "./assets/images/zazan_cyber_eyes.jpg";
import glowingOrbImg from "./assets/images/zazan_glowing_orb.jpg";

export interface ZazanAIScreenProps {
  onAsk: (text: string) => Promise<void> | void;
  onVoice: () => Promise<void> | void;
  listening: boolean;
  isThinking: boolean;
  messages: Array<ChatMessage>;
  onClearMessages: () => void;
  onNewChat: () => void;
  onReplayAudio?: (text: string) => void;
  ttsEnabled: boolean;
  onToggleTts: () => void;

  currentMode: ZazanMode;
  onSelectMode: (mode: ZazanMode) => void;
  currentLanguage: ZazanLanguage;
  onSelectLanguage: (lang: ZazanLanguage) => void;

  conversations: Array<{ id: string; title: string }>;
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation?: (id: string) => void;

  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  authModalOpen: boolean;
  onCloseAuth: () => void;
  onAuthSubmit: (email: string, pass: string, isSignup: boolean) => Promise<void>;
  authLoading: boolean;
  authError: string | null;
  authMessage: string | null;
  onContinueAsGuest: () => void;

  voiceNotice?: string | null;
  onDismissVoiceNotice?: () => void;
}

const MODES: Array<{ id: ZazanMode; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = [
  { id: "general", label: "General", icon: Globe, desc: "Futuristic multi-purpose assistant" },
  { id: "islamic", label: "Islamic", icon: BookOpen, desc: "Authentic Quran & Sunnah references" },
  { id: "study", label: "Study", icon: Sparkles, desc: "Interactive academic tutoring" },
  { id: "coding", label: "Coding", icon: Code, desc: "Production-ready software engineering" },
  { id: "translator", label: "Translator", icon: Languages, desc: "Nuanced multilingual translations" },
  { id: "summarizer", label: "Summarizer", icon: FileText, desc: "Concise key takeaways & notes" },
  { id: "research", label: "Research", icon: Compass, desc: "Deep analytical synthesis" },
];

const LANGUAGES: Array<{ id: ZazanLanguage; label: string; nativeName: string; isRtl?: boolean }> = [
  { id: "en", label: "English", nativeName: "English", isRtl: false },
  { id: "ps", label: "Pashto", nativeName: "پښتو", isRtl: true },
  { id: "ur", label: "Urdu", nativeName: "اردو", isRtl: true },
  { id: "ar", label: "Arabic", nativeName: "العربية", isRtl: true },
];

export default function ZazanAIScreen({
  onAsk,
  onVoice,
  listening,
  isThinking,
  messages,
  onClearMessages,
  onNewChat,
  onReplayAudio,
  ttsEnabled,
  onToggleTts,
  currentMode,
  onSelectMode,
  currentLanguage,
  onSelectLanguage,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  user,
  onOpenAuth,
  onLogout,
  authModalOpen,
  onCloseAuth,
  onAuthSubmit,
  authLoading,
  authError,
  authMessage,
  onContinueAsGuest,
  voiceNotice,
  onDismissVoiceNotice,
}: ZazanAIScreenProps) {
  const [inputText, setInputText] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Auth modal form state
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const isRtl = currentLanguage === "ps" || currentLanguage === "ur" || currentLanguage === "ar";

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
  }, []);

  // Handle user scroll detection for floating scroll-to-bottom button
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
    setShowScrollBottomBtn(distanceToBottom > 120);
  }, []);

  // Auto-scroll whenever messages change (added by user or assistant) or thinking status changes
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
      const timer1 = setTimeout(() => scrollToBottom(true), 60);
      const timer2 = setTimeout(() => scrollToBottom(true), 200);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [messages, isThinking, scrollToBottom]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputText.trim();
    if (!query || isThinking) return;
    setInputText("");
    await onAsk(query);
  };

  const handleCopy = (text: string, index: number) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const activeModeObj = MODES.find((m) => m.id === currentMode) || MODES[0];
  const activeLangObj = LANGUAGES.find((l) => l.id === currentLanguage) || LANGUAGES[0];

  return (
    <main
      className="relative min-h-screen w-full bg-black text-slate-100 flex flex-col justify-between overflow-x-hidden font-sans select-none"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Background Stardust & Deep Obsidian Space */}
      <div className="fixed inset-0 pointer-events-none z-0 stardust-field opacity-60" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-sky-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-1/3 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* 1. TOP BAR — Matches exact reference layout */}
      <header className="w-full max-w-md md:max-w-lg mx-auto px-5 pt-4 pb-1 flex items-center justify-between z-30 relative">
        {/* Left: Avatar with Z and Title */}
        <div
          onClick={onNewChat}
          className="flex items-center gap-3.5 group cursor-pointer"
          title="New Chat"
        >
          {/* Avatar Ring */}
          <div className="w-[42px] h-[42px] rounded-full border-[1.5px] border-sky-400 bg-black flex items-center justify-center shadow-[0_0_12px_rgba(56,189,248,0.7)] group-hover:shadow-[0_0_18px_rgba(56,189,248,0.9)] transition-all shrink-0">
            <span className="font-serif text-2xl text-white font-normal drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]">
              Z
            </span>
          </div>

          {/* Title & Subtitle */}
          <div className="flex flex-col text-left">
            <h1 className="text-[17px] font-semibold text-white tracking-wide leading-tight group-hover:text-sky-200 transition-colors">
              Zazan AI
            </h1>
            <p className="text-[12.5px] font-normal text-[#7b91a7] leading-tight pt-0.5">
              AI Assistant
            </p>
          </div>
        </div>

        {/* Right: Three Dots Menu */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-[#94a3b8] hover:text-white hover:bg-sky-950/30 transition-all cursor-pointer"
          title="Open Menu & History"
          aria-label="Open menu"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </header>

      {/* 2. MAIN CENTER HERO OR CHAT STREAM */}
      <div className="relative z-10 flex-1 flex flex-col justify-between items-center w-full max-w-md md:max-w-lg mx-auto px-4 py-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* PRISTINE HERO MATCHING REFERENCE IMAGE */
          <div className="w-full flex-1 flex flex-col items-center justify-between my-auto py-2">
            {/* Top Visor & Cybernetic Eyes */}
            <div className="relative w-full max-w-[380px] mx-auto flex items-center justify-center overflow-hidden pt-1">
              <div className="relative w-full aspect-[16/9] flex items-center justify-center">
                {/* Seamless radial fade so the asset blends naturally into the pitch-black backdrop */}
                <img
                  src={cyberEyesImg}
                  alt="Zazan AI Cybernetic Visor"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain filter drop-shadow-[0_0_25px_rgba(14,165,233,0.3)] transition-transform duration-700 hover:scale-[1.02]"
                  style={{
                    maskImage: "radial-gradient(ellipse 95% 85% at 50% 50%, black 70%, transparent 100%)",
                    WebkitMaskImage: "radial-gradient(ellipse 95% 85% at 50% 50%, black 70%, transparent 100%)",
                  }}
                />

                {/* Subtle cybernetic scan beam overlay */}
                <div className="absolute inset-x-4 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-sky-400/30 to-transparent pointer-events-none animate-pulse" />
              </div>
            </div>

            {/* Editorial Serif Typography */}
            <div className="text-center space-y-1.5 my-auto select-none px-2 py-3">
              <h2 className="font-serif text-[40px] sm:text-[46px] font-normal text-white tracking-wide leading-none drop-shadow-[0_0_16px_rgba(255,255,255,0.3)]">
                Zazan AI
              </h2>
              <p className="font-serif text-[26px] sm:text-[30px] font-normal text-white tracking-wide leading-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                How can Zazan<br />help you today?
              </p>
              {currentMode !== "general" && (
                <div className="pt-2">
                  <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-mono text-sky-300/90 bg-sky-950/40 border border-sky-500/30">
                    {activeModeObj.label} Mode • {activeLangObj.nativeName}
                  </span>
                </div>
              )}
            </div>

            {/* Glowing Orb / Energy Core with Light Pedestal */}
            <div
              onClick={onVoice}
              className="relative w-44 h-44 sm:w-48 sm:h-48 mx-auto flex flex-col items-center justify-center cursor-pointer group select-none mt-auto mb-2"
              title="Tap to speak"
            >
              {/* Outer Blue Aura Glow */}
              <div
                className={`absolute inset-0 rounded-full blur-2xl transition-all duration-700 ${
                  listening
                    ? "bg-sky-400/50 scale-125"
                    : isThinking
                      ? "bg-blue-600/50 animate-pulse"
                      : "bg-sky-500/25 group-hover:scale-110 group-hover:bg-sky-400/35"
                }`}
              />

              {/* Glowing Orb Asset */}
              <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full flex items-center justify-center overflow-hidden animate-orb-float">
                <img
                  src={glowingOrbImg}
                  alt="Zazan AI Core Orb"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full filter drop-shadow-[0_0_30px_rgba(56,189,248,0.7)] group-hover:brightness-110 transition-all"
                  style={{
                    maskImage: "radial-gradient(circle at 50% 50%, black 80%, transparent 100%)",
                    WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 80%, transparent 100%)",
                  }}
                />

                {/* Status Indicator over Orb */}
                {listening && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full backdrop-blur-xs">
                    <span className="text-[11px] font-mono tracking-widest text-sky-200 uppercase font-bold animate-pulse drop-shadow-[0_0_8px_#38bdf8]">
                      LISTENING
                    </span>
                  </div>
                )}
                {isThinking && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full backdrop-blur-xs">
                    <span className="text-[11px] font-mono tracking-widest text-sky-200 uppercase font-bold animate-pulse drop-shadow-[0_0_8px_#38bdf8]">
                      THINKING
                    </span>
                  </div>
                )}
              </div>

              {/* Horizontal Neon Blue Light Pedestal Flare */}
              <div className="w-28 sm:w-32 h-[3px] bg-sky-400/90 blur-[2px] rounded-full shadow-[0_0_22px_6px_#38bdf8] animate-pedestal-beam -mt-1" />
            </div>
          </div>
        ) : (
          /* CONVERSATION STREAM (When active chat messages exist) */
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="w-full flex-1 overflow-y-auto space-y-4 p-2 scroll-smooth relative"
          >
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative group ${
                      isUser
                        ? "bg-[#09152b] border border-sky-500/40 text-sky-50 shadow-[0_0_15px_rgba(14,165,233,0.15)]"
                        : "bg-[#050a16] border border-[#1b2b48] text-slate-100 shadow-[0_0_20px_rgba(0,0,0,0.6)]"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>

                    {!isUser && (
                      <div className="flex items-center gap-2 pt-2 mt-1 border-t border-slate-700/30 text-xs text-slate-400">
                        {onReplayAudio && (
                          <button
                            onClick={() => onReplayAudio(m.content)}
                            className="flex items-center gap-1 hover:text-sky-300 transition-colors cursor-pointer"
                            title="Listen to response"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                            <span className="text-[10px]">Play</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(m.content, idx)}
                          className="flex items-center gap-1 hover:text-sky-300 transition-colors cursor-pointer ml-auto"
                          title="Copy message"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-[10px] text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="text-[10px]">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-[#050a16] border border-[#1b2b48] rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                  <span className="text-xs text-sky-300 font-medium">Zazan is thinking</span>
                  <div className="flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shadow-[0_0_6px_#38bdf8]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse [animation-delay:0.2s] shadow-[0_0_6px_#38bdf8]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse [animation-delay:0.4s] shadow-[0_0_6px_#38bdf8]" />
                  </div>
                </div>
              </div>
            )}

            {/* Bottom scroll anchor */}
            <div ref={chatBottomRef} className="h-1 w-full shrink-0" />

            {/* Quick scroll to bottom button when user scrolled up */}
            {showScrollBottomBtn && (
              <div className="sticky bottom-1 left-0 right-0 flex justify-center pointer-events-none z-20">
                <button
                  type="button"
                  onClick={() => scrollToBottom(true)}
                  className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#09152b]/95 border border-sky-400/60 text-sky-200 text-xs shadow-[0_0_15px_rgba(56,189,248,0.4)] backdrop-blur-md hover:bg-sky-900/60 transition-all cursor-pointer animate-in fade-in"
                  title="Scroll to latest messages"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-sky-400 animate-bounce" />
                  <span>Scroll to bottom</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Voice Notification Toast */}
      {voiceNotice && (
        <div className="w-full max-w-md md:max-w-lg mx-auto px-5 pb-2 z-30 relative animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#09152b]/95 border border-sky-500/40 text-sky-200 text-xs shadow-[0_0_20px_rgba(56,189,248,0.25)] backdrop-blur-xl">
            <div className="flex items-center gap-2.5">
              <VolumeX className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="leading-snug">{voiceNotice}</span>
            </div>
            {onDismissVoiceNotice && (
              <button
                onClick={onDismissVoiceNotice}
                className="text-sky-400/80 hover:text-white p-1 ml-2 cursor-pointer shrink-0"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. BOTTOM INPUT CAPSULE — Exact match to reference image */}
      <div className="w-full max-w-md md:max-w-lg mx-auto px-5 pb-6 pt-1 z-30 relative">
        <form
          onSubmit={handleSend}
          className="relative flex items-center justify-between w-full h-[58px] sm:h-[62px] px-5 rounded-full bg-[#050a16]/95 hover:bg-[#070e20]/95 border border-[#1b2b48] hover:border-[#28416d] focus-within:border-sky-500/80 shadow-[0_0_25px_rgba(2,132,199,0.12)] focus-within:shadow-[0_0_30px_rgba(56,189,248,0.3)] backdrop-blur-xl transition-all"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              listening
                ? "Listening..."
                : isThinking
                  ? "Processing..."
                  : "Ask anything..."
            }
            disabled={isThinking}
            className="w-full bg-transparent text-slate-100 placeholder:text-[#64748b] text-[15.5px] sm:text-[16px] tracking-normal focus:outline-none pr-3"
          />

          {/* Right Action: Send Button or Glowing Audio Waveform */}
          {inputText.trim() ? (
            <button
              type="submit"
              disabled={isThinking}
              className="w-9 h-9 rounded-full bg-sky-400 hover:bg-sky-300 text-black flex items-center justify-center transition-all shadow-[0_0_15px_rgba(56,189,248,0.7)] shrink-0 cursor-pointer disabled:opacity-50"
              title="Send"
            >
              <Send className="w-4 h-4 ml-0.5 text-black" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onVoice}
              disabled={isThinking}
              className="group flex items-center gap-[3.5px] h-7 px-1 shrink-0 cursor-pointer"
              title="Voice Input"
            >
              {/* Electric-blue vertical waveform bars */}
              <span
                className={`w-[3px] rounded-full bg-gradient-to-t from-sky-500 to-cyan-300 shadow-[0_0_8px_#38bdf8] transition-all ${
                  listening ? "h-5 animate-waveform-bar-1" : "h-3 group-hover:h-4"
                }`}
              />
              <span
                className={`w-[3px] rounded-full bg-gradient-to-t from-sky-500 to-cyan-300 shadow-[0_0_8px_#38bdf8] transition-all ${
                  listening ? "h-6 animate-waveform-bar-2" : "h-5 group-hover:h-5.5"
                }`}
              />
              <span
                className={`w-[3px] rounded-full bg-gradient-to-t from-sky-400 to-cyan-200 shadow-[0_0_10px_#67e8f9] transition-all ${
                  listening ? "h-7 animate-waveform-bar-3" : "h-6 group-hover:h-6.5"
                }`}
              />
              <span
                className={`w-[3px] rounded-full bg-gradient-to-t from-sky-500 to-cyan-300 shadow-[0_0_8px_#38bdf8] transition-all ${
                  listening ? "h-5 animate-waveform-bar-4" : "h-4.5 group-hover:h-5"
                }`}
              />
              <span
                className={`w-[3px] rounded-full bg-gradient-to-t from-sky-500 to-cyan-300 shadow-[0_0_8px_#38bdf8] transition-all ${
                  listening ? "h-4 animate-waveform-bar-5" : "h-3 group-hover:h-3.5"
                }`}
              />
            </button>
          )}
        </form>
      </div>

      {/* 4. FUTURISTIC SIDE DRAWER */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 ${
          isRtl ? "right-0" : "left-0"
        } w-72 sm:w-80 bg-[#050a16] border-r border-[#1b2b48] flex flex-col z-50 shadow-[0_0_40px_rgba(0,0,0,0.9)] transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : isRtl ? "translate-x-full" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 flex items-center justify-between border-b border-[#1b2b48]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full border border-sky-400 bg-black flex items-center justify-center font-serif text-lg text-white shadow-[0_0_10px_rgba(56,189,248,0.5)]">
              Z
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Zazan AI</h3>
              <p className="text-[11px] text-[#7b91a7]">Control Panel</p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-sky-950/40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions: New Chat & Clear */}
        <div className="p-3 space-y-2 border-b border-[#1b2b48]">
          <button
            onClick={() => {
              onNewChat();
              setDrawerOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 font-medium text-xs shadow-[0_0_15px_rgba(56,189,248,0.2)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>

          {messages.length > 0 && (
            <button
              onClick={() => {
                onClearMessages();
                setDrawerOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900/80 hover:bg-rose-950/30 border border-slate-700/50 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Current Chat</span>
            </button>
          )}
        </div>

        {/* Assistant Modes */}
        <div className="px-3 pt-3 pb-1 border-b border-[#1b2b48]">
          <div className="px-2 pb-1.5 text-[10px] uppercase tracking-wider text-sky-300/80 font-semibold">
            Assistant Mode
          </div>
          <div className="grid grid-cols-2 gap-1.5 pb-2">
            {MODES.map((m) => {
              const Icon = m.icon;
              const isSelected = m.id === currentMode;
              return (
                <button
                  key={m.id}
                  onClick={() => onSelectMode(m.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all text-left truncate cursor-pointer ${
                    isSelected
                      ? "bg-sky-500/20 text-sky-200 font-semibold border border-sky-500/40"
                      : "text-slate-300 hover:bg-sky-950/30 hover:text-white"
                  }`}
                  title={m.desc}
                >
                  <Icon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Selection */}
        <div className="px-3 pt-3 pb-2 border-b border-[#1b2b48]">
          <div className="px-2 pb-1.5 text-[10px] uppercase tracking-wider text-sky-300/80 font-semibold flex items-center gap-1.5">
            <Languages className="w-3 h-3 text-sky-400" />
            <span>Language</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                onClick={() => onSelectLanguage(l.id)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  l.id === currentLanguage
                    ? "bg-sky-500/20 text-sky-200 font-semibold border border-sky-500/40"
                    : "text-slate-300 hover:bg-sky-950/30 hover:text-white"
                }`}
              >
                <span>{l.label}</span>
                <span className="text-[11px] text-sky-400">{l.nativeName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3 text-sky-400" />
            <span>Recent Chats</span>
          </div>

          {conversations.length === 0 ? (
            <p className="px-2 py-4 text-xs text-slate-500 text-center">No conversation history yet.</p>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeConversationId;
              return (
                <div
                  key={c.id}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                    isActive
                      ? "bg-sky-500/20 text-sky-200 border border-sky-500/30 font-medium"
                      : "text-slate-300 hover:bg-sky-950/30 hover:text-white"
                  }`}
                  onClick={() => {
                    onSelectConversation(c.id);
                    setDrawerOpen(false);
                  }}
                >
                  <span className="truncate flex-1">{c.title || "Chat"}</span>
                  {onDeleteConversation && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(c.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-1 transition-opacity cursor-pointer"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer: TTS toggle & Account */}
        <div className="p-3 border-t border-[#1b2b48] space-y-2">
          {/* TTS Toggle */}
          <button
            onClick={onToggleTts}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs bg-slate-900/60 border border-slate-700/40 text-slate-200 hover:bg-sky-950/40 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {ttsEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              <span>Voice Speech Output</span>
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${ttsEnabled ? "bg-sky-500/20 text-sky-300" : "bg-slate-800 text-slate-400"}`}>
              {ttsEnabled ? "ON" : "OFF"}
            </span>
          </button>

          {/* User Account / Supabase Sync */}
          <button
            onClick={() => {
              setDrawerOpen(false);
              onOpenAuth();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs bg-sky-950/40 border border-sky-500/30 text-sky-100 hover:bg-sky-900/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <UserIcon className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="truncate">
                {user ? (user.email ? user.email : "Account") : "Cloud Sync (Supabase)"}
              </span>
            </div>
            {user ? (
              <span className="text-[10px] text-emerald-400 font-semibold shrink-0">Synced</span>
            ) : (
              <LogIn className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            )}
          </button>
        </div>
      </aside>

      {/* 5. FLOATING GLASS AUTH MODAL */}
      {authModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-[#050a16] border border-sky-500/40 shadow-[0_0_40px_rgba(56,189,248,0.25)] p-6 space-y-4">
            <button
              onClick={onCloseAuth}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-1">
              <div className="w-12 h-12 rounded-full border border-sky-400 bg-black flex items-center justify-center font-serif text-2xl text-white shadow-[0_0_15px_rgba(56,189,248,0.6)]">
                Z
              </div>
              <h3 className="font-semibold text-lg text-white">
                {user ? "Zazan AI Account" : isSignup ? "Create Zazan Account" : "Sync With Supabase"}
              </h3>
              <p className="text-xs text-sky-200/70">
                {user
                  ? `Signed in as ${user.email}`
                  : "Sign in to persist your conversations across devices"}
              </p>
            </div>

            {user ? (
              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/30 text-xs text-sky-200 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Account:</span>
                    <span className="font-medium text-white">{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-emerald-400">Cloud Synced</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onLogout();
                    onCloseAuth();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-semibold hover:bg-rose-900/50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await onAuthSubmit(authEmail, authPassword, isSignup);
                }}
                className="space-y-3"
              >
                <div>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-sky-500/30 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-sky-500/30 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
                  />
                </div>

                {authError && (
                  <p className="text-rose-400 text-xs p-2 rounded-lg bg-rose-950/30 border border-rose-500/30">
                    {authError}
                  </p>
                )}

                {authMessage && (
                  <p className="text-sky-300 text-xs p-2 rounded-lg bg-sky-950/30 border border-sky-500/30">
                    {authMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-black font-semibold text-xs transition-all shadow-[0_0_15px_rgba(56,189,248,0.4)] disabled:opacity-50 cursor-pointer"
                >
                  {authLoading ? "Processing..." : isSignup ? "Create Account" : "Sign In"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onContinueAsGuest();
                    onCloseAuth();
                  }}
                  className="w-full py-2 rounded-xl bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer"
                >
                  ⚡ Continue as Guest (Local)
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignup(!isSignup);
                    }}
                    className="text-xs text-sky-300/80 hover:text-sky-200 transition-colors cursor-pointer"
                  >
                    {isSignup ? "Already have an account? Sign In" : "Need an account? Sign Up"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
