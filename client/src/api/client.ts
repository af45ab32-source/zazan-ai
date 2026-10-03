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

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    let errorMessage = `Chat request failed (${res.status})`;
    if (contentType.includes("application/json")) {
      const errorData = await res.json().catch(() => null);
      if (errorData?.error) errorMessage = errorData.error;
    } else {
      const text = await res.text().catch(() => "");
      if (text && !text.startsWith("<!")) errorMessage = text.slice(0, 150);
    }
    throw new Error(errorMessage);
  }

  if (!contentType.includes("application/json")) {
    throw new Error("Chat service returned unexpected non-JSON response.");
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function speak(text: string, voiceId?: string, language?: ZazanLanguage): Promise<Blob> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/api/voice/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId, language }),
    });

    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("audio/")) {
        return await res.blob();
      }
      // If server returned fallback indicator, smoothly proceed to browser speech
    }
  } catch {
    // Proceed to Web Speech API fallback
  }

  // Fallback to browser Web Speech API
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      if (language) {
        const langMap: Record<ZazanLanguage, string> = {
          en: "en-US",
          ps: "ps-AF",
          ur: "ur-PK",
          ar: "ar-SA",
        };
        utterance.lang = langMap[language] || "en-US";
      }
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // safe fallback
    }
    return new Blob([], { type: "audio/mpeg" });
  }

  return new Blob([], { type: "audio/mpeg" });
}
