/**
 * Zazan AI - frontend API client.
 *
 * IMPORTANT: This file must NEVER contain a Gemini or ElevenLabs API key,
 * and must NEVER call generativelanguage.googleapis.com or elevenlabs.io
 * directly. All requests
 * go to our own backend ("/api/..."), which holds the real keys server-side.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function sendChatMessage(
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function speak(text: string, voiceId?: string): Promise<Blob> {
  const res = await fetch("/api/voice/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voiceId }),
  });

  if (!res.ok) {
    throw new Error(`Voice request failed: ${res.status}`);
  }

  return res.blob();
}
