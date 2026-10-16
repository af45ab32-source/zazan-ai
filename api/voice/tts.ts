import { processTts } from "../../server/src/routes/voice.js";
import { handleCors, parseRequestBody } from "../../server/src/cors.js";

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} not allowed. Please use POST.` });
  }

  try {
    const body = await parseRequestBody(req);
    await processTts(body, res);
  } catch (err: any) {
    console.error("Unhandled error in /api/voice/tts serverless function:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
}
