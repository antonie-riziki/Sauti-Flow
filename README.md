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

## Android / Capacitor

The repository now includes a Capacitor Android project and the `SautiFlowBridge` Kotlin plugin. The browser keeps using the predictable `NATIVE_BRIDGE_UNAVAILABLE` result; Android performs only allow-listed, structured operations.

Implemented native methods:

- `getStatus()` — real Android handshake, installed-app and permission status.
- `openApp()` — trusted package registry for WhatsApp, Messenger, and Messages.
- `openDialer()` / `makeCall()` — safe `ACTION_DIAL` flows for phone numbers and verified USSD codes.
- `composeSms()` — opens a new SMS conversation for a direct number with the message prefilled; the user taps Send.
- `composeWhatsApp()` — opens a WhatsApp `wa.me` conversation for a direct number with the message prefilled; the user taps Send.
- `executeUssd()` — validates the code, requests contextual phone permission, calls Android `sendUssdRequest()` where supported, and returns the carrier callback or a structured failure.
- `searchContacts()` — contextual `READ_CONTACTS` permission and ambiguity-aware local search.
- `getAccessibilityStatus()` — reports the opt-in service state without enabling it automatically.

Direct numbers do not require a saved contact. For example, `Text 0712345678 saying I am running late` opens an SMS conversation for that number, while `Call 0712345678` opens the dialer with the number ready. The app does not silently send messages or place calls.

### Android requirements

Install Node/pnpm, Android Studio, an Android SDK with the project compile/target API, and a JDK supported by the installed Android Gradle Plugin. Then:

```bash
pnpm install
pnpm run cap:sync
pnpm run cap:open:android
```

In Android Studio, select an emulator or physical Android device and run the `app` configuration. For a physical device, enable Developer options and USB debugging. Test with Logcat filtered to `SAUTIFLOW_BRIDGE`.

The manifest declares `INTERNET`, `CALL_PHONE`, `READ_CONTACTS`, `SEND_SMS`, and `READ_SMS`; runtime permissions are requested contextually. Accessibility is optional and must be enabled by the user in Android Settings. Android/carrier support for native USSD varies; the fallback is opening the dialer with the verified code. The current environment has no Java/Android SDK, so an APK build and physical-device verification must be completed from Android Studio or a configured Android CI runner.
