import { handleCors } from "../server/src/cors.js";

export default function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ error: `Method ${req.method} not allowed. Please use GET.` });
  }

  return res.status(200).json({
    ok: true,
    status: "ok",
    service: "zazan-ai",
  });
}
