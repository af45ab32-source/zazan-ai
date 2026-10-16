import { Router, type Request, type Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";

export const chatRouter = Router();

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequestBody {
  messages?: ChatMessage[];
  message?: string;
  prompt?: string;
  text?: string;
  mode?: string;
  language?: string;
}

export interface ChatResponseResult {
  status: number;
  data:
    | {
        choices: Array<{ message: { role: string; content: string } }>;
        reply: string;
        text: string;
      }
    | {
        error: string;
      };
}

function getGenAI(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: config.gemini.apiKey || process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function getSystemInstruction(mode?: string, language?: string): string {
  const langRules: Record<string, string> = {
    en: "Communicate clearly in English.",
    ps: "Respond primarily in Pashto (پښتو) using proper script and natural phrasing.",
    ur: "Respond primarily in Urdu (اردو) using clean, respectful phrasing.",
    ar: "Respond primarily in Modern Standard Arabic (العربية الفصحى) with proper grammar and eloquence.",
  };

  const selectedLangRule = (language && langRules[language]) || langRules.en;

  const modeInstructions: Record<string, string> = {
    general:
      "You are Zazan AI, a sleek, intelligent, futuristic, polite, and versatile AI assistant.",
    islamic:
      "You are Zazan AI in Islamic Guidance Mode. Provide accurate, respectful, and well-contextualized Islamic knowledge based on authentic sources (Quran and established Sunnah). STRICT ACCURACY RULE: NEVER fabricate or guess any Quran verses, Surah names, Ayah numbers, or Hadith narrations. If you are unsure of an exact reference or authenticity, explicitly state so.",
    study:
      "You are Zazan AI in Study & Academic Mode. Act as a patient, encouraging tutor. Break down difficult concepts, provide illustrative analogies, solve step-by-step problems, and test the user's understanding.",
    coding:
      "You are Zazan AI in Software Engineering Mode. Provide robust, idiomatic, production-ready code with concise explanations, modern best practices, and edge case awareness.",
    translator:
      "You are Zazan AI in Translation Mode. Translate text accurately, preserving nuance, idioms, cultural context, and tone across languages including English, Pashto (پښتو), Urdu (اردو), and Arabic (العربية).",
    summarizer:
      "You are Zazan AI in Summarization Mode. Distill complex text, discussions, and articles into sharp, well-structured summaries with key bullet points and core takeaways.",
    research:
      "You are Zazan AI in In-Depth Research Mode. Provide deep, structured analysis, objective synthesis, multi-perspective evaluations, and rigorous critical thinking. Note: you cannot browse live external web links unless provided directly in context.",
  };

  const selectedMode = (mode && modeInstructions[mode]) || modeInstructions.general;
  return `${selectedMode}\n\nLanguage requirement: ${selectedLangRule}`;
}

function toGeminiRequest(messages: ChatMessage[], mode?: string, language?: string) {
  const systemBase = getSystemInstruction(mode, language);
  const extraSystemParts = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const systemInstruction = extraSystemParts
    ? `${systemBase}\n\n${extraSystemParts}`
    : systemBase;

  const contents = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  return { systemInstruction, contents };
}

export function formatGeminiError(err: unknown): ChatResponseResult {
  console.error("Gemini chat error:", err);

  const status =
    (typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status?: unknown }).status)
      : undefined) ?? undefined;

  const message = err instanceof Error ? err.message : String(err);
  const isQuotaOrRateLimit =
    status === 429 || /quota|rate.?limit|RESOURCE_EXHAUSTED/i.test(message);
  const isUnavailable =
    status === 503 || /high demand|temporarily unavailable|UNAVAILABLE/i.test(message);
  const isAuthError =
    status === 401 ||
    status === 403 ||
    /API key not valid|API_KEY_INVALID|UNAUTHENTICATED/i.test(message);

  if (isQuotaOrRateLimit) {
    return {
      status: 429,
      data: {
        error: "Gemini API quota or rate limit reached. Please wait a moment and try again.",
      },
    };
  }

  if (isUnavailable) {
    return {
      status: 503,
      data: {
        error: "Gemini model is currently experiencing high demand. Please try again in a few seconds.",
      },
    };
  }

  if (isAuthError) {
    return {
      status: 401,
      data: {
        error: "Gemini API authentication failed. Please verify that GEMINI_API_KEY is configured.",
      },
    };
  }

  return {
    status: status && status >= 400 && status < 600 ? status : 500,
    data: {
      error: err instanceof Error ? err.message : "Gemini API request failed.",
    },
  };
}

export async function processChat(body: ChatRequestBody): Promise<ChatResponseResult> {
  const rawBody = body || {};
  let messages: ChatMessage[] = [];

  if (Array.isArray(rawBody.messages)) {
    messages = rawBody.messages;
  } else if (typeof rawBody.prompt === "string" && rawBody.prompt.trim()) {
    messages = [{ role: "user", content: rawBody.prompt.trim() }];
  } else if (typeof rawBody.message === "string" && rawBody.message.trim()) {
    messages = [{ role: "user", content: rawBody.message.trim() }];
  } else if (typeof rawBody.text === "string" && rawBody.text.trim()) {
    messages = [{ role: "user", content: rawBody.text.trim() }];
  }

  if (messages.length === 0) {
    return {
      status: 400,
      data: { error: "`messages` array or `prompt`/`message` string is required." },
    };
  }

  try {
    const { systemInstruction, contents } = toGeminiRequest(
      messages,
      rawBody.mode,
      rawBody.language
    );

    if (contents.length === 0) {
      return {
        status: 400,
        data: { error: "At least one user or assistant message is required." },
      };
    }

    const genAI = getGenAI();
    const primaryModel = config.gemini.model || "gemini-3.5-flash";
    const modelsToTry = Array.from(
      new Set([
        primaryModel,
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-flash-lite-latest",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
        "gemini-flash-latest",
      ])
    );

    let text = "";
    let lastError: unknown = null;

    for (const model of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const result = await genAI.models.generateContent({
            model,
            contents,
            config: systemInstruction ? { systemInstruction } : undefined,
          });
          text = result.text ?? "";
          lastError = null;
          break;
        } catch (err: unknown) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);
          const isUnavailable = /high demand|temporarily unavailable|UNAVAILABLE|503/i.test(msg);
          const isQuota = /quota|rate.?limit|RESOURCE_EXHAUSTED|429/i.test(msg);

          if (isUnavailable && attempt < 2) {
            console.warn(`Model ${model} 503 spike, retrying...`);
            await new Promise((r) => setTimeout(r, 800));
            continue;
          }
          if (isUnavailable || isQuota) {
            console.warn(`Model ${model} unavailable or quota reached, trying next fallback model...`);
          }
          break;
        }
      }

      if (text) {
        break;
      }
    }

    if (lastError && !text) {
      throw lastError;
    }

    return {
      status: 200,
      data: {
        choices: [
          {
            message: { role: "assistant", content: text },
          },
        ],
        reply: text,
        text: text,
      },
    };
  } catch (err: unknown) {
    return formatGeminiError(err);
  }
}

chatRouter.post(["/", ""], async (req: Request, res: Response) => {
  const result = await processChat(req.body);
  return res.status(result.status).json(result.data);
});
