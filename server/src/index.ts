import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { chatRouter } from "./routes/chat.js";
import { voiceRouter } from "./routes/voice.js";

const app = express();

app.use(
  cors({
    origin: config.clientOrigin,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "zazan-ai-server" });
});

app.use("/api/chat", chatRouter);
app.use("/api/voice", voiceRouter);

app.listen(config.port, () => {
  console.log(`Zazan AI server listening on http://localhost:${config.port}`);
});
