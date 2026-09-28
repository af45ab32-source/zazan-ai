import "dotenv/config";

const DEPRECATED_MODELS = new Set([
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-pro",
  "gemini-2.0-flash",
  "gemini-2.0-pro",
  "gemini-2.0-flash-thinking",
  "gemini-2.5-flash",
]);

function resolveModel(envModel?: string): string {
  if (!envModel || DEPRECATED_MODELS.has(envModel.trim())) {
    return "gemini-3.8-flash";
  }
  return envModel.trim();
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "*",

  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    model: resolveModel(process.env.GEMINI_MODEL),
  },

  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY ?? "",
    voiceId: process.env.ELEVENLABS_VOICE_ID ?? "",
    apiUrl: process.env.ELEVENLABS_API_URL ?? "https://api.elevenlabs.io/v1",
  },
};
