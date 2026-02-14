## Context

The Omakase app has a working talk mode that uses browser-native `SpeechSynthesis` for TTS and `SpeechRecognition` for STT. The TTS quality is poor and inconsistent across browsers. The user has an ElevenLabs account with specific voice IDs assigned to each agent. STT (speech-to-text) remains unchanged — browser `SpeechRecognition` stays.

Current TTS flow: `useVoiceChat` hook buffers streaming tokens → splits on sentence boundaries → calls `speechSynthesis.speak()` per sentence with a `SpeechSynthesisUtterance`.

Target TTS flow: hook buffers streaming tokens → splits on sentence boundaries → POSTs sentence to `/api/tts` → receives MP3 audio stream → plays via `Audio` element.

## Goals / Non-Goals

**Goals:**
- Replace browser TTS with ElevenLabs `eleven_flash_v2_5` model for high-quality, consistent voices
- Keep the API key server-side only (Next.js API route proxy)
- Maintain sentence-level streaming for low-latency playback during agent responses
- Preserve all existing talk mode UX (VoiceBlob overlay, waveform indicators, hold-to-talk)

**Non-Goals:**
- Changing STT (speech-to-text) — stays browser-native
- WebSocket streaming from ElevenLabs (REST streaming is sufficient for sentence chunks)
- Caching/storing generated audio
- Lip-sync or viseme-based animations
- Fallback to browser TTS when ElevenLabs fails (just show error)

## Decisions

### 1. Server-side proxy via Next.js API route

**Decision:** Create `/api/tts` route that accepts `{ text, voiceId }` and returns the ElevenLabs audio stream.

**Rationale:** Keeps `ELEVENLABS_API_KEY` server-side. The client never sees the key. Next.js API routes run on the same domain, so no CORS issues.

**Alternative considered:** Client-side direct calls with a short-lived token — adds complexity, token management, and key exposure risk.

### 2. Sentence-level requests (not full-text)

**Decision:** Continue the existing sentence-chunking approach. Each sentence boundary triggers a separate `/api/tts` request. Audio segments are queued and played sequentially.

**Rationale:** Matches the existing streaming architecture. Agent responses stream token-by-token; waiting for the full response before speaking would add unacceptable latency. Sentence-level chunks are natural speech units.

**Alternative considered:** ElevenLabs WebSocket streaming API — lower latency but requires a persistent connection, more complex error handling, and the sentence-level approach already feels instant.

### 3. Audio playback via `<audio>` element with blob URLs

**Decision:** Convert the ElevenLabs response stream to a Blob, create an object URL, and play via a hidden `<audio>` element. Queue multiple audio segments and play sequentially using the `ended` event.

**Rationale:** Simple, well-supported, handles MP3 natively. No need for `AudioContext` decoding complexity. Object URLs are cleaned up after playback.

**Alternative considered:** `AudioContext` + `decodeAudioData` — more control but unnecessary complexity for sequential sentence playback.

### 4. Voice ID configuration in `VOICE_PROFILES`

**Decision:** Add `elevenLabsVoiceId` to the existing `VoiceProfile` interface. Remove `pitch`, `rate`, and `preferredVoice` fields (ElevenLabs handles voice characteristics server-side).

**Rationale:** Single source of truth for voice config. The voice IDs are static constants, not secrets.

### 5. Model: `eleven_flash_v2_5`

**Decision:** Hardcode the model in the API route as `eleven_flash_v2_5`.

**Rationale:** Cheapest ElevenLabs model. The user explicitly chose this. If they want to change it later, it's a single constant.

## Risks / Trade-offs

- **[Latency]** Each sentence requires a round-trip to ElevenLabs (~200-400ms). → Mitigation: Sentence chunking means the first sentence starts speaking while the rest of the response streams in. Perceived latency is low.
- **[Cost]** ElevenLabs charges per character. → Mitigation: `eleven_flash_v2_5` is the cheapest model. Markdown/code/emoji stripping reduces character count.
- **[Rate limits]** ElevenLabs has per-minute rate limits. → Mitigation: Sentence-level batching naturally throttles requests. Unlikely to hit limits in single-user chat.
- **[API key missing]** If `ELEVENLABS_API_KEY` is not set, TTS fails silently. → Mitigation: API route returns 500, hook sets error state, talk mode toggle is still shown but TTS won't play.
