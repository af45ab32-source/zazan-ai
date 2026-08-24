import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Copy server/.env.example to server/.env and fill in real values.`
    );
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 5000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",

  gemini: {
    apiKey: required("GEMINI_API_KEY"),
    // gemini-2.5-flash is on Google's free tier (rate-limited) as of this
    // writing. Override via GEMINI_MODEL if you need a different model.
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  },

  elevenlabs: {
    apiKey: required("ELEVENLABS_API_KEY"),
    voiceId: process.env.ELEVENLABS_VOICE_ID ?? "",
    apiUrl: process.env.ELEVENLABS_API_URL ?? "https://api.elevenlabs.io/v1",
  },
};
