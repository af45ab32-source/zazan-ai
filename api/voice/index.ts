import { processTts } from "../../server/src/routes/voice.js";
import { handleCors, parseRequestBody } from "../../server/src/cors.js";

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method === "POST") {
    try {
      const body = await parseRequestBody(req);
      await processTts(body, res);
      return;
    } catch (err: any) {
      console.error("Unhandled error in /api/voice serverless function:", err);
      return res.status(500).json({ error: err?.message || "Internal server error" });
    }
  }

  return res.status(200).json({
    ok: true,
    service: "zazan-ai-voice",
    endpoints: ["/api/voice/tts"],
  });
}
