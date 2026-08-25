export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const API_BASE = "http://127.0.0.1:5000";

export async function sendChatMessage(
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/chat`, {
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
  const res = await fetch(`${API_BASE}/api/voice/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voiceId }),
  });

  if (!res.ok) {
    throw new Error(`Voice request failed: ${res.status}`);
  }

  return res.blob();
}
