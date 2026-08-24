import { Router, type Request, type Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";

export const chatRouter = Router();

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
}

// Single shared client — safe to reuse across requests, holds no per-request state.
const genAI = new GoogleGenAI({ apiKey: config.gemini.apiKey });

/**
 * Gemini has no "system" role in its content array — system instructions
 * are passed separately via `config.systemInstruction`. This splits our
 * OpenAI-style message list into that shape, and maps
 * assistant -> "model" (Gemini's name for the assistant turn).
 */
function toGeminiRequest(messages: ChatMessage[]) {
  const systemParts = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const contents = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  return { systemInstruction: systemParts || undefined, contents };
}

/**
 * POST /api/chat
 * Body: { messages: [{ role, content }, ...] }
 *
 * The frontend NEVER talks to Gemini directly. It calls this route, and
 * this route attaches the real Gemini API key server-side via the
 * official Google GenAI SDK.
 *
 * Response shape is kept OpenAI/DeepSeek-style ({ choices: [{ message }] })
 * so the existing frontend client code does not need to change.
 */
chatRouter.post("/", async (req: Request, res: Response) => {
  const body = req.body as Partial<ChatRequestBody>;

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: "`messages` array is required." });
  }

  try {
    const { systemInstruction, contents } = toGeminiRequest(body.messages);

    if (contents.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one user or assistant message is required." });
    }

    const result = await genAI.models.generateContent({
      model: config.gemini.model,
      contents,
      config: systemInstruction ? { systemInstruction } : undefined,
    });

    const text = result.text ?? "";

    return res.json({
      choices: [
        {
          message: { role: "assistant", content: text },
        },
      ],
    });
  } catch (err: unknown) {
    handleGeminiError(err, res);
  }
});

/**
 * Gemini SDK errors carry an HTTP-like status on `err.status` (or embed one
 * in the message for quota/rate-limit cases). We map the common cases to
 * clear, distinct responses instead of a generic 500.
 */
function handleGeminiError(err: unknown, res: Response): void {
  console.error("Gemini chat route error:", err);

  const status =
    (typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status?: unknown }).status)
      : undefined) ?? undefined;

  const message = err instanceof Error ? err.message : String(err);
  const isQuotaOrRateLimit =
    status === 429 || /quota|rate.?limit|RESOURCE_EXHAUSTED/i.test(message);
  const isAuthError =
    status === 401 ||
    status === 403 ||
    /API key|permission|unauthenticated|UNAUTHENTICATED/i.test(message);

  if (isQuotaOrRateLimit) {
    res.status(429).json({
      error:
        "Gemini API quota or rate limit exceeded. Google's free tier is rate-limited, not unlimited — wait a bit and try again, or check your quota in Google AI Studio.",
    });
    return;
  }

  if (isAuthError) {
    res.status(401).json({
      error:
        "Gemini API rejected the request — check that GEMINI_API_KEY in server/.env is valid.",
    });
    return;
  }

  res.status(status && status >= 400 && status < 600 ? status : 500).json({
    error: "Gemini API request failed.",
  });
}
