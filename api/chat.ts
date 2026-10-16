import { processChat } from "../server/src/routes/chat.js";
import { handleCors, parseRequestBody } from "../server/src/cors.js";

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} not allowed. Please use POST.` });
  }

  try {
    const body = await parseRequestBody(req);
    const result = await processChat(body);
    return res.status(result.status).json(result.data);
  } catch (err: any) {
    console.error("Unhandled error in /api/chat serverless function:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
}
