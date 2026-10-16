import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { chatRouter } from "./routes/chat.js";
import { voiceRouter } from "./routes/voice.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
  })
);
app.options("*", cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    status: "ok",
    service: "zazan-ai",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/chat", chatRouter);
app.use("/api/voice", voiceRouter);

app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found` });
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`Zazan AI server listening on http://0.0.0.0:${config.port}`);
});
