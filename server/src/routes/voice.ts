import { Router, type Request, type Response } from "express";
import { config } from "../config.js";

export const voiceRouter = Router();

interface TtsRequestBody {
  text: string;
  voiceId?: string;
}

/**
 * POST /api/voice/tts
 * Body: { text: string, voiceId?: string }
 *
 * The frontend NEVER talks to ElevenLabs directly. It calls this route,
 * and this route attaches the real ElevenLabs API key server-side, then
 * streams the resulting audio back to the client.
 */
voiceRouter.post("/tts", async (req: Request, res: Response) => {
  const body = req.body as Partial<TtsRequestBody>;

  if (!body.text || typeof body.text !== "string") {
    return res.status(400).json({ error: "`text` is required." });
  }

  const voiceId = body.voiceId || config.elevenlabs.voiceId;
  if (!voiceId) {
    return res.status(400).json({
      error:
        "No voiceId provided and no ELEVENLABS_VOICE_ID configured on the server.",
    });
  }

  try {
    const upstream = await fetch(
      `${config.elevenlabs.apiUrl}/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
          "xi-api-key": config.elevenlabs.apiKey,
        },
        body: JSON.stringify({
          text: body.text,
          model_id: "eleven_multilingual_v2",
        }),
      }
    );

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text();
      console.error("ElevenLabs API error:", upstream.status, errText);
      return res
        .status(upstream.status)
        .json({ error: "ElevenLabs API request failed." });
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
    return res.status(500).json({ error: "Internal server error." });
  }
});
