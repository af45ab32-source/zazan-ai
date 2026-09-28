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
  mode?: string;
  language?: string;
}

function getGenAI(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
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

chatRouter.post(["/", ""], async (req: Request, res: Response) => {
  const body = req.body as Partial<ChatRequestBody>;

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: "`messages` array is required." });
  }

  try {
    const { systemInstruction, contents } = toGeminiRequest(
      body.messages,
      body.mode,
      body.language
    );

    if (contents.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one user or assistant message is required." });
    }

    const genAI = getGenAI();
    const targetModel = "gemini-3.8-flash";

    let text = "";
    let lastError: unknown = null;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await genAI.models.generateContent({
          model: targetModel,
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
        if (isUnavailable && attempt < maxAttempts) {
          console.warn(`Gemini 503 high demand spike, retrying (attempt ${attempt}/${maxAttempts})...`);
          await new Promise((r) => setTimeout(r, 600 * attempt));
          continue;
        }
        break;
      }
    }

    if (lastError && !text) {
      throw lastError;
    }

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

function handleGeminiError(err: unknown, res: Response): void {
  console.error("Gemini chat route error:", err);

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
    res.status(429).json({
      error:
        "Gemini API quota or rate limit reached. Please wait a moment and try again.",
    });
    return;
  }

  if (isUnavailable) {
    res.status(503).json({
      error:
        "Gemini model is currently experiencing high demand. Please try again in a few seconds.",
    });
    return;
  }

  if (isAuthError) {
    res.status(401).json({
      error:
        "Gemini API authentication failed. Please verify that GEMINI_API_KEY is configured.",
    });
    return;
  }

  res.status(status && status >= 400 && status < 600 ? status : 500).json({
    error: err instanceof Error ? err.message : "Gemini API request failed.",
  });
}
