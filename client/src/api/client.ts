export type ZazanMode =
  | "general"
  | "islamic"
  | "study"
  | "coding"
  | "translator"
  | "summarizer"
  | "research";

export type ZazanLanguage = "en" | "ps" | "ur" | "ar";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function getApiBase(): string {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
    if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE;
  }
  return "";
}

export async function sendChatMessage(
  messages: ChatMessage[],
  mode: ZazanMode = "general",
  language: ZazanLanguage = "en"
): Promise<string> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, mode, language }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || `Chat request failed: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function speak(text: string, voiceId?: string): Promise<Blob> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/api/voice/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId }),
    });

    if (res.ok) {
      return await res.blob();
    }
  } catch (err) {
    console.warn("Server TTS route error, falling back to Web Speech:", err);
  }

  // Fallback to browser Web Speech API
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    return new Blob([], { type: "audio/mpeg" });
  }

  return new Blob([], { type: "audio/mpeg" });
}
