import { useState } from "react";
import { sendChatMessage, type ChatMessage } from "./api/client";
import "./App.css";

/**
 * Foundation-only placeholder UI. This proves the client -> server ->
 * Gemini round trip works end to end. The futuristic JARVIS-style
 * Zazan interface and voice interaction come in the next phase.
 */
function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!input.trim()) return;
    const userMessage: ChatMessage = { role: "user", content: input };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const reply = await sendChatMessage(nextMessages);
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <h1>Zazan AI</h1>
      <p className="subtitle">Foundation build — chat wired to Gemini via backend proxy</p>

      <div className="chat-log">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <strong>{m.role}:</strong> {m.content}
          </div>
        ))}
        {loading && <div className="message assistant">Zazan is thinking…</div>}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Talk to Zazan…"
        />
        <button onClick={handleSend} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}

export default App;
