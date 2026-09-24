# SautiFlow

> **Voice that gets things done.**

SautiFlow is an Android-first voice operating layer for calls, messages, supported app hand-offs and verified telecom workflows. This repository currently delivers the polished, responsive voice-first interface and a safe frontend demonstration flow.

## Product safety

- Financial, subscription and account-changing actions stop at an explicit **Confirm** step.
- The app does not claim external completion; it says it will open or prepare the platform hand-off.
- Production USSD lookup belongs behind a trusted backend registry that records an official source, verification timestamp and confidence. It is intentionally not hardcoded in this client.
- Keys are server-side only. Set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in Vercel; do not use `VITE_`-prefixed secret variables.

## Architecture direction

| Layer | Responsibility |
| --- | --- |
| Voice UI | Accessible tap-to-talk control, state feedback and streamed transcript |
| Intent orchestration | Classify a spoken request, extract entities and decide whether confirmation is necessary |
| Telecom knowledge | Backend-managed, official-source USSD registry with validation and expiry |
| Android automation | Kotlin modules for contacts, dial intents, SMS compose intents, WhatsApp deep links and graceful fallbacks |
| Voice output | Browser fallback now; `/api/voice` is a server-only ElevenLabs streaming proxy for production integration |

The browser demo uses the Web Speech API when available, and gracefully demonstrates the Airtel balance flow where speech recognition is unavailable. Android production integration should use native recognition and Android intents instead of pretending that a web page can execute calls, USSD sessions, or WhatsApp messages.

## Run locally

```bash
npm install
npm run dev
```

## Deploy on Vercel

Import the repository in Vercel, add the server-side environment variables described above, and deploy. The included SPA rewrite keeps the single voice screen available at every route.
