import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createServer as createViteServer } from "vite";
import { chatRouter } from "./server/src/routes/chat.js";
import { voiceRouter } from "./server/src/routes/voice.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "1mb" }));

  // API endpoints
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "zazan-ai-server" });
  });

  app.use("/api/chat", chatRouter);
  app.use("/api/voice", voiceRouter);

  // Explicit 404 for unmatched /api routes so they NEVER fall through to the HTML SPA fallback
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found` });
  });

  const isDev = process.env.NODE_ENV !== "production";
  const clientDir = path.resolve(__dirname, "client");

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0" },
      appType: "spa",
      root: clientDir,
    });

    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(clientDir, "index.html");
        let template = fs.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distDir, "index.html"));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Zazan AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
