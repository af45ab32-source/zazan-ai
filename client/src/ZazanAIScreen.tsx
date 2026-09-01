import React, { useState } from 'react';
import { MoreVertical, Send, Volume2, VolumeX, Trash2 } from 'lucide-react';

export interface ZazanAIScreenProps {
  onAsk?: (text?: string) => Promise<void> | void;
  onMenu?: () => void;
  onVoice?: () => Promise<void> | void;
  listening?: boolean;
  isThinking?: boolean;
  messages?: Array<{ role: 'user' | 'assistant'; text: string }>;
  onClearMessages?: () => void;
}

export default function ZazanAIScreen({
  onAsk,
  onMenu,
  onVoice,
  listening = false,
  isThinking = false,
  messages = [],
  onClearMessages,
}: ZazanAIScreenProps) {
  const [inputText, setInputText] = useState('');
  const [internalMessages, setInternalMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const displayMessages = messages.length > 0 ? messages : internalMessages;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputText.trim();
    if (!query) return;

    if (onAsk) {
      setInputText('');
      await onAsk(query);
    } else {
      setInternalMessages((prev) => [...prev, { role: 'user', text: query }]);
      setInputText('');
      setTimeout(() => {
        setInternalMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `I received your request: "${query}". How else may I assist you today?`,
          },
        ]);
      }, 1000);
    }
  };

  const handleVoiceToggle = () => {
    if (onVoice) {
      onVoice();
    }
  };

  const handleMenuClick = () => {
    if (onMenu) {
      onMenu();
    } else {
      setMenuOpen(!menuOpen);
    }
  };

  const handleClear = () => {
    if (onClearMessages) {
      onClearMessages();
    } else {
      setInternalMessages([]);
    }
    setMenuOpen(false);
  };

  return (
    <main className="relative min-h-screen w-full bg-black text-slate-100 flex flex-col justify-between overflow-x-hidden select-none font-sans">
      {/* Background Ambient Glow & Star Particles */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-cyan-600/15 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:32px_32px] opacity-15" />
      </div>

      {/* 1. TOP NAVIGATION HEADER */}
      <header className="w-full max-w-md mx-auto px-6 pt-5 pb-3 flex items-center justify-between z-30 relative">
        {/* Brand Avatar */}
        <div className="flex items-center gap-3.5 group cursor-pointer">
          <div className="relative flex items-center justify-center">
            <div className="w-11 h-11 rounded-full border border-cyan-400/80 bg-black/80 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.45)] group-hover:shadow-[0_0_22px_rgba(6,182,212,0.7)] transition-all">
              <span className="font-serif text-xl font-bold tracking-wider text-cyan-50 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                Z
              </span>
            </div>
            <div className="absolute -inset-1 rounded-full border border-cyan-500/20 animate-pulse pointer-events-none" />
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[19px] font-medium tracking-wide text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]">
                Zazan AI
              </h1>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse" />
            </div>
            <p className="text-[13px] font-light text-cyan-200/70 tracking-wider">AI Assistant</p>
          </div>
        </div>

        {/* Action Menu */}
        <div className="relative">
          <button
            onClick={handleMenuClick}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/30 transition-all cursor-pointer"
            title="Menu"
            aria-label="Open menu"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 w-56 rounded-2xl bg-[#070e1b]/95 border border-cyan-500/30 shadow-2xl p-2 z-50 backdrop-blur-xl">
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-cyan-950/50"
              >
                <span>Voice Output</span>
                {ttsEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </button>
              {displayMessages.length > 0 && (
                <button
                  onClick={handleClear}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/30"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Conversation</span>
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 2. MAIN CENTER HERO AREA */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center w-full max-w-md mx-auto px-4 py-2">
        {displayMessages.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-between my-auto space-y-4">
            {/* Cybernetic Eyes Visor HUD */}
            <div className="relative w-full max-h-60 flex items-center justify-center overflow-hidden">
              <div className="relative w-4/5 aspect-[16/9] border border-cyan-500/40 rounded-2xl p-3 flex items-center justify-around bg-cyan-950/20 backdrop-blur-xs shadow-[0_0_30px_rgba(6,182,212,0.25)]">
                {/* Left Eye */}
                <div className="relative w-16 h-10 rounded-full border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_15px_#06b6d4]">
                  <div className="w-6 h-6 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9] animate-pulse" />
                </div>
                {/* Right Eye */}
                <div className="relative w-16 h-10 rounded-full border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_15px_#06b6d4]">
                  <div className="w-6 h-6 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9] animate-pulse" />
                </div>
              </div>
            </div>

            {/* Editorial Greeting */}
            <div className="text-center space-y-2 select-none">
              <h2 className="font-serif text-4xl md:text-5xl font-semibold text-white tracking-wide drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
                Zazan AI
              </h2>
              <p className="font-serif text-2xl md:text-[28px] text-slate-100/95 font-normal tracking-wide leading-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                How can Zazan<br />help you today?
              </p>
            </div>

            {/* Concentric Energy Sphere */}
            <div
              onClick={handleVoiceToggle}
              className="relative w-48 h-48 mx-auto flex items-center justify-center cursor-pointer group select-none"
            >
              {/* Outer Aura */}
              <div
                className={`absolute inset-0 rounded-full blur-2xl transition-all duration-700 ${
                  listening ? 'bg-cyan-400/50 scale-125' : isThinking ? 'bg-blue-600/50 animate-pulse' : 'bg-cyan-500/25 group-hover:scale-110'
                }`}
              />

              {/* Rotating Outer Gyro Ring */}
              <div className="absolute inset-1 rounded-full border border-cyan-400/40 animate-spin [animation-duration:20s]" />

              {/* Core Neon Sphere */}
              <div className="relative w-36 h-36 rounded-full border-2 border-cyan-300/60 shadow-[0_0_35px_rgba(6,182,212,0.6)] flex items-center justify-center bg-black/80 overflow-hidden">
                <div className="w-full h-full rounded-full bg-radial from-cyan-400/40 via-blue-900/60 to-black animate-pulse" />
                {listening && (
                  <span className="absolute text-[10px] font-mono tracking-widest text-cyan-200 uppercase font-bold">
                    LISTENING
                  </span>
                )}
                {isThinking && (
                  <span className="absolute text-[10px] font-mono tracking-widest text-cyan-200 uppercase font-bold">
                    THINKING
                  </span>
                )}
              </div>

              {/* Bottom Glow Beam */}
              <div className="absolute -bottom-5 w-28 h-2 bg-cyan-400/80 blur-md rounded-full shadow-[0_0_20px_#22d3ee]" />
            </div>
          </div>
        ) : (
          /* Active Chat Thread */
          <div className="w-full flex-1 overflow-y-auto space-y-3 p-2">
            {displayMessages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-50'
                      : 'bg-[#081020]/90 border border-slate-700/60 text-slate-100'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. GLOWING PILL INPUT BAR WITH AUDIO WAVEFORM */}
      <div className="w-full max-w-md mx-auto px-4 pb-6 pt-2 z-30 relative">
        <form
          onSubmit={handleSend}
          className="relative flex items-center justify-between w-full h-[62px] px-6 rounded-full bg-[#060c18]/85 hover:bg-[#081020]/90 border border-blue-500/40 focus-within:border-cyan-400 shadow-[0_0_20px_rgba(14,165,233,0.15)] focus-within:shadow-[0_0_25px_rgba(6,182,212,0.45)] backdrop-blur-xl transition-all"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={listening ? 'Listening...' : 'Ask anything...'}
            className="w-full bg-transparent text-slate-100 placeholder:text-slate-400/80 text-[16px] tracking-wide focus:outline-none pr-3"
          />

          {inputText.trim() ? (
            <button
              type="submit"
              className="w-9 h-9 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center transition-all shadow-[0_0_12px_rgba(6,182,212,0.6)] shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleVoiceToggle}
              className="group flex items-center gap-[3px] h-6 shrink-0 cursor-pointer"
              title="Voice Input"
            >
              <span className="w-[3px] h-3 bg-cyan-400 rounded-full shadow-[0_0_6px_#22d3ee] transition-all group-hover:h-4" />
              <span className="w-[3px] h-5 bg-cyan-400 rounded-full shadow-[0_0_6px_#22d3ee] transition-all group-hover:h-5.5" />
              <span className="w-[3px] h-6 bg-cyan-300 rounded-full shadow-[0_0_8px_#67e8f9] transition-all group-hover:h-6" />
              <span className="w-[3px] h-4 bg-cyan-400 rounded-full shadow-[0_0_6px_#22d3ee] transition-all group-hover:h-5" />
              <span className="w-[3px] h-2.5 bg-cyan-400 rounded-full shadow-[0_0_6px_#22d3ee] transition-all group-hover:h-3.5" />
            </button>
          )}
        </form>
      </div>
    </main>
  );
}