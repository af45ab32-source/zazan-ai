# Zazan AI

Futuristic AI Assistant for Web and Android.

## Architecture

- **Frontend**: React + Vite + TypeScript with Tailwind CSS & signature cybernetic HUD.
- **Backend**: Node.js + Express proxying Gemini and ElevenLabs so credentials never touch the browser.
- **AI Brain**: Google Gemini via `@google/genai` (`gemini-3.8-flash`).
- **Voice**: Speech recognition + ElevenLabs TTS streaming with browser Web Speech synthesis fallback.
- **Storage & Auth**: Supabase Cloud Auth & Conversation Persistence with seamless local storage Guest Mode.
- **Mobile**: Capacitor Android with native Intent plugins (`VoiceActionsPlugin`, `VoiceAssistantPlugin`).

## Features

- **Futuristic Visor & HUD**: Animated cybernetic eyes, concentric energy sphere, live audio waveforms, and glowing cyberpunk aesthetics.
- **7 Specialized Modes**:
  1. *General* — Versatile, polite, and intelligent AI companion.
  2. *Islamic* — Authentic guidance grounded in verified Quran and Sunnah.
  3. *Study* — Interactive academic tutor for learning and problem-solving.
  4. *Coding* — Production-ready software engineering and debugging.
  5. *Translator* — Nuanced multilingual translations.
  6. *Summarizer* — Key takeaways and executive briefs.
  7. *Research* — Analytical synthesis and structured breakdowns.
- **Multilingual & RTL Support**: English, Pashto (پښتو), Urdu (اردو), and Arabic (العربية) with native script alignment.
- **Smart Voice Actions**: Voice commands for YouTube, WhatsApp, Google Maps, Camera, and installed mobile applications.

## Vercel Deployment

Deploy the fullstack application (Vite frontend + Serverless API functions) directly to Vercel:

1. **Import Git Repository**: In your Vercel Dashboard, import this repository.
2. **Framework Preset**: Vite (detected automatically).
3. **Build Command**: `npm run build`
4. **Output Directory**: `client/dist`
5. **Environment Variables**:
   - `GEMINI_API_KEY`: Your Gemini API key from Google AI Studio.
   - `GEMINI_MODEL`: `gemini-3.5-flash` (optional).
   - `ELEVENLABS_API_KEY`: Your ElevenLabs API key (optional).
   - `ELEVENLABS_VOICE_ID`: Your ElevenLabs voice ID (optional).
6. **Endpoints deployed**:
   - `GET /api/health` -> Serverless health check (`{"ok": true, "status": "ok", "service": "zazan-ai"}`)
   - `POST /api/chat` -> AI chat powered by Gemini
   - `POST /api/voice/tts` -> ElevenLabs TTS with browser fallback

