# Zazan AI

A brand-new project (not connected to any previous "Zazan" work). Foundation phase:
React + Vite + TypeScript frontend, Node.js + Express + TypeScript backend, with
Google Gemini (via the official `@google/genai` SDK) as the AI brain and
ElevenLabs for text-to-speech.

## Architecture

```
Browser (React)  --->  /api/...  --->  Express backend  --->  Gemini / ElevenLabs
     (no keys)                          (holds real keys)
```

The frontend never talks to Gemini or ElevenLabs directly. It only ever calls
our own backend at relative `/api/...` paths. The backend attaches the real API
keys server-side and forwards the request. This is the only way to keep the keys
out of browser devtools, the JS bundle, and network logs.

## Project layout

```
zazan-ai/
├── server/     Express + TypeScript backend (holds API keys)
├── client/     React + Vite + TypeScript frontend (no keys, ever)
└── .gitignore  keeps .env and node_modules out of git
```

## First-time setup

### 1. Backend

```bash
cd server
cp .env.example .env
# then edit .env and fill in:
#   GEMINI_API_KEY=...       (get one free at https://aistudio.google.com/apikey)
#   ELEVENLABS_API_KEY=...
#   ELEVENLABS_VOICE_ID=...
npm install
npm run dev
```

Server starts on `http://localhost:5000`. It will refuse to start if
`GEMINI_API_KEY` or `ELEVENLABS_API_KEY` is missing — this is intentional,
so a misconfigured deployment fails immediately instead of silently.

`GEMINI_MODEL` defaults to `gemini-2.5-flash`, which is on Google's free
tier as of this writing — rate-limited (a fixed number of requests per
minute/day), **not unlimited**. Check
[Google's current pricing and rate-limit docs](https://ai.google.dev/gemini-api/docs/rate-limits)
for the live numbers, since free-tier terms change over time.

### 2. Frontend

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Client starts on `http://localhost:5173` and proxies `/api/*` requests to the
backend on port 5000 (see `client/vite.config.ts`).

Open `http://localhost:5173` — you should see a minimal chat box. Sending a
message calls our backend, which calls Gemini, and the reply comes back.
This proves the full secure round trip works before we build the real UI.

## Security model (why it's safe)

- API keys live only in `server/.env`, which is git-ignored.
- No key is ever prefixed in a way that a bundler would expose to the browser.
- The frontend's entire network surface is `src/api/client.ts`, and it only
  calls our own `/api/...` routes — never `generativelanguage.googleapis.com`
  or `elevenlabs.io` directly.
- In production, keys are set as real environment variables on the hosting
  platform (not committed anywhere, not baked into the frontend build).

## What's next

This is the **foundation only** — plumbing proven end to end with a plain
chat box. Next phases (on your go-ahead):

1. The futuristic JARVIS-style Zazan interface (visual design pass).
2. Voice interaction: mic input, ElevenLabs TTS playback, wake-word/voice UX.
3. Packaging for Android via Capacitor, once the web app is feature-complete.

## Android packaging (future phase, not started yet)

Planned approach: [Capacitor](https://capacitorjs.com/) wraps the built
`client/dist` output in a native Android shell, talking to the hosted backend
over HTTPS — no separate mobile codebase needed. We'll set this up once the
web app is stable.
