import { Router, type Request, type Response } from "express";
import { config } from "../config.js";

export const voiceRouter = Router();

export interface TtsRequestBody {
  text: string;
  voiceId?: string;
}

export async function processTts(body: Partial<TtsRequestBody>, res: any): Promise<void> {
  if (!body || !body.text || typeof body.text !== "string") {
    res.status(400).json({ error: "`text` is required." });
    return;
  }

  const voiceId = body.voiceId || config.elevenlabs.voiceId;
  const apiKey = config.elevenlabs.apiKey || process.env.ELEVENLABS_API_KEY;

  if (!apiKey || !voiceId) {
    res.status(200).json({
      fallback: true,
      provider: "browser",
      message: "ElevenLabs TTS is not configured. Using browser speech synthesis fallback.",
    });
    return;
  }

  try {
    const upstream = await fetch(
      `${config.elevenlabs.apiUrl}/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: body.text,
          model_id: "eleven_multilingual_v2",
        }),
      }
    );

    if (!upstream.ok || !upstream.body) {
      console.warn(
        `ElevenLabs TTS unavailable (status ${upstream.status}). Falling back to browser speech synthesis.`
      );
      res.status(200).json({
        fallback: true,
        provider: "browser",
        message: "ElevenLabs TTS unavailable. Using browser speech synthesis.",
      });
      return;
    }

    res.setHeader("Content-Type", "audio/mpeg");
    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err) {
    console.error("Voice route error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}

voiceRouter.post("/tts", async (req: Request, res: Response) => {
  await processTts(req.body, res);
});
