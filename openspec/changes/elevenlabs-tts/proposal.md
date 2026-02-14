## Why

The current talk mode uses the browser's built-in `SpeechSynthesis` API for TTS, which produces robotic, low-quality voices that vary wildly across browsers and operating systems. Switching to ElevenLabs provides high-quality, consistent, human-like voices for each agent — giving them real personality. Using the `eleven_flash_v2_5` model keeps costs minimal.

## What Changes

- Replace browser `SpeechSynthesis` with ElevenLabs streaming TTS API for agent voice output
- Add a server-side API route (`/api/tts`) that proxies ElevenLabs requests (keeps API key server-side)
- Assign fixed ElevenLabs voice IDs per agent:
  - **Miso** (architect): `UaYTS0wayjmO9KD1LR4R` (male)
  - **Nori** (coder): `uYXf8XasLslADfZ2MB4u` (female)
  - **Koji** (reviewer): `8quEMRkSpwEaWBzHvTLv` (female)
  - **Toro** (tester): `UaYTS0wayjmO9KD1LR4R` (male, same voice as Miso)
- Update `useVoiceChat` hook to use audio streaming playback (`AudioContext` / `<audio>`) instead of `SpeechSynthesis`
- Keep browser `SpeechRecognition` for STT input (unchanged, still free)
- Add `ELEVENLABS_API_KEY` environment variable

## Capabilities

### New Capabilities
- `elevenlabs-tts`: ElevenLabs text-to-speech integration — API route, audio streaming, per-agent voice configuration

### Modified Capabilities
- `voice-chat`: TTS output changes from browser SpeechSynthesis to ElevenLabs streaming audio; STT input unchanged

## Impact

- **New API route**: `apps/web/src/app/api/tts/route.ts` — proxies text to ElevenLabs, returns audio stream
- **Hook rewrite**: `apps/web/src/hooks/use-voice-chat.ts` — replace `SpeechSynthesis` calls with fetch-to-audio pipeline
- **Constants**: `apps/web/src/lib/chat-constants.ts` — update `VOICE_PROFILES` with ElevenLabs voice IDs
- **Environment**: New `ELEVENLABS_API_KEY` env var (server-side only)
- **Dependencies**: None — ElevenLabs REST API called directly via fetch, audio played via Web Audio API
