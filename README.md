# SautiFlow

> **Voice that gets things done.**

SautiFlow is a voice-first AI phone-action agent. The PWA is the interface and planning layer; Android native code is the execution layer. The browser must never claim that a call, message, USSD session, or app hand-off completed unless a native bridge reports that result.

## Current implementation

- Installable PWA with a standalone manifest, SVG app icons, offline shell, cache-first static assets, and online/offline status.
- Minimal voice-first UI preserved: one primary orb, streamed response text, accessible controls, confirmation for sensitive actions, and browser speech fallback.
- `/api/agent` produces a strict, allow-listed tool plan. Qwen is used when `QWEN_API_URL`, `QWEN_API_KEY`, and `QWEN_MODEL` are configured; otherwise a safe local planner is used.
- `/api/capabilities` reports the registered tool contract and clearly reports that the Android bridge is not connected in the PWA.
- `/api/ussd/lookup` and `/api/ussd/verify` expose a narrow, source-backed Kenya registry for Safaricom, Airtel Kenya, and Telkom Kenya. Untrusted or malformed codes are rejected.
- `/api/africastalking/ussd` intentionally reports configuration/implementation status until the current Africa's Talking API and callback contract is provided. It does not invent an external integration.
- `/api/voice` remains a server-only ElevenLabs proxy. The browser calls it when configured and falls back to speech synthesis without exposing credentials.

## Architecture boundary

```text
PWA voice UI → /api/agent → Qwen/local safe planner → registered tool plan
                                      ↓
                         Capacitor/Kotlin Android bridge (next phase)
                                      ↓
                           Android intents/accessibility/native APIs
```

The current PWA prepares and reports plans honestly. It does not pretend to open Android apps, read private messages, send SMS, execute USSD, or place calls from a browser.

## Server environment

Set only the variables for integrations that are actually configured:

```text
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
QWEN_API_URL=
QWEN_API_KEY=
QWEN_MODEL=
AFRICASTALKING_API_KEY=
AFRICASTALKING_USERNAME=
AFRICASTALKING_USSD_SERVICE_CODE=
AFRICASTALKING_CALLBACK_URL=
```

Never use `VITE_` prefixes for secrets. Never store PINs, OTPs, passwords, or mobile-money credentials.

## Run and test locally

```bash
pnpm install
pnpm run build
pnpm run dev
```

The next implementation phase is the Android wrapper and Kotlin execution layer for contextual permissions, contacts, dialer, SMS, WhatsApp/Messenger hand-offs, and verified USSD opening.
