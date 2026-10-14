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

export const STORAGE_KEYS = {
  API_BASE: "zazan_api_base",
  MODE: "zazan_active_mode",
  LANG: "zazan_active_lang",
  TTS: "zazan_tts_enabled",
  CONTINUOUS: "zazan_continuous_assistant",
  CONVOS: "zazan_convos_",
  MSGS: "zazan_msgs_",
};

export const DEFAULT_PRODUCTION_API_BASE =
  "https://ais-pre-cdmri3slamuy2l6thzyprc-397168373823.asia-southeast1.run.app";

function isDisallowedLocalhost(url: string): boolean {
  if (!url) return false;
  // If in dev mode in browser, localhost is allowed
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
    return false;
  }
  const clean = url.trim().toLowerCase();
  return (
    clean.includes("127.0.0.1:5000") ||
    clean.includes("localhost:5000") ||
    clean.includes("127.0.0.1") ||
    clean.includes("localhost")
  );
}

export function getStoredApiBase(): string {
  if (typeof window !== "undefined") {
    try {
      const val =
        localStorage.getItem("zazan_api_base") ||
        (window as any).localStorage?.["zazan_api_base"] ||
        localStorage.getItem(STORAGE_KEYS.API_BASE) ||
        "";
      return val.trim();
    } catch {
      return "";
    }
  }
  return "";
}

export function setCustomApiBase(url: string): void {
  if (typeof window !== "undefined") {
    try {
      const clean = url.trim().replace(/\/+$/, "");
      if (clean) {
        localStorage.setItem("zazan_api_base", clean);
        localStorage.setItem(STORAGE_KEYS.API_BASE, clean);
      } else {
        localStorage.removeItem("zazan_api_base");
        localStorage.removeItem(STORAGE_KEYS.API_BASE);
      }
    } catch (e) {
      console.warn("Could not save custom API base URL", e);
    }
  }
}

export function getApiBase(): string {
  // 1. User manual override from Settings stored in localStorage["zazan_api_base"]
  const userOverride = getStoredApiBase();
  if (userOverride && !isDisallowedLocalhost(userOverride)) {
    return userOverride.replace(/\/+$/, "");
  }

  // 2. Build-time environment variables (VITE_API_BASE_URL or VITE_API_BASE)
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const envUrl = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || "")?.trim();
    if (envUrl && !isDisallowedLocalhost(envUrl)) {
      return envUrl.replace(/\/+$/, "");
    }
  }

  // 3. Web browser environment: If hosted on a live web origin (Cloud Run / Vercel etc.)
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const isCapacitorLocal =
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      window.location.protocol === "capacitor:" ||
      window.location.protocol === "ionic:";

    if (!isCapacitorLocal && origin.startsWith("http")) {
      return origin.replace(/\/+$/, "");
    }
  }

  // 4. In development mode on localhost
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
    return "";
  }

  // 5. Default production backend for Android APK
  return DEFAULT_PRODUCTION_API_BASE;
}

export async function testApiConnection(customUrl?: string): Promise<{
  ok: boolean;
  status: number;
  message: string;
}> {
  const base = (customUrl !== undefined ? customUrl : getApiBase()).replace(/\/+$/, "");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${base}/api/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json().catch(() => null);
      return {
        ok: true,
        status: res.status,
        message: data?.service ? `Connected to ${data.service}` : "Connected successfully",
      };
    }

    if (contentType.includes("text/html")) {
      return {
        ok: false,
        status: res.status,
        message: "Endpoint returned HTML instead of API JSON. URL may be incorrect.",
      };
    }

    return {
      ok: false,
      status: res.status,
      message: `Endpoint returned HTTP ${res.status}`,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return { ok: false, status: 0, message: "Connection timed out (8s)." };
    }
    return { ok: false, status: 0, message: err.message || "Network request failed." };
  }
}

export async function sendChatMessage(
  messages: ChatMessage[],
  mode: ZazanMode = "general",
  language: ZazanLanguage = "en"
): Promise<string> {
  const base = getApiBase();
  const targetUrl = `${base}/api/chat`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ messages, mode, language }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Chat request timed out after 35 seconds. Please check your network connection.");
    }
    const msg = err.message || String(err);
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      throw new Error(
        `Unable to reach Zazan AI backend at ${base || "current host"}. Please check your internet connection or configure the API URL in Settings.`
      );
    }
    throw new Error(`Network error: ${msg}`);
  }

  const contentType = res.headers.get("content-type") || "";

  // Handle non-OK status codes cleanly
  if (!res.ok) {
    let errorMessage = `Server error (${res.status})`;

    if (contentType.includes("application/json")) {
      const errorData = await res.json().catch(() => null);
      if (errorData?.error) errorMessage = errorData.error;
    } else {
      const rawText = await res.text().catch(() => "");
      if (rawText.includes("<!DOCTYPE") || rawText.includes("<html")) {
        errorMessage = `Received HTML error page (${res.status}) from backend. Please verify your Backend API URL in Settings.`;
      } else if (rawText) {
        errorMessage = rawText.slice(0, 160);
      }
    }
    throw new Error(errorMessage);
  }

  // Handle case where status is 200 but content is HTML (Capacitor SPA fallback when hitting localhost)
  if (!contentType.includes("application/json")) {
    const textPreview = await res.text().catch(() => "");
    if (textPreview.includes("<!DOCTYPE") || textPreview.includes("<html") || textPreview.includes("<head")) {
      throw new Error(
        `Backend returned HTML instead of JSON. The Android APK may be attempting to call local assets. Please verify the Backend API URL in Settings.`
      );
    }
    if (textPreview.trim()) {
      try {
        const parsed = JSON.parse(textPreview);
        const replyContent =
          parsed.choices?.[0]?.message?.content ??
          parsed.reply ??
          parsed.text ??
          parsed.content ??
          "";
        if (replyContent) return replyContent;
      } catch {
        return textPreview.trim();
      }
    }
    throw new Error("Chat service returned an unexpected non-JSON response.");
  }

  const data = await res.json();

  // Support both { choices: [{ message: { content: "..." } }] } and { reply: "..." } and { text: "..." }
  const replyContent =
    data.choices?.[0]?.message?.content ??
    data.reply ??
    data.text ??
    data.content ??
    "";

  if (!replyContent && data.error) {
    throw new Error(data.error);
  }

  return replyContent;
}

export async function speak(
  text: string,
  voiceId?: string,
  language?: ZazanLanguage
): Promise<Blob> {
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
    }
  } catch {
    // Smoothly proceed to Web Speech API fallback
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
