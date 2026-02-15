## Context

Agent chat currently supports text-only interaction through `ChatInput` (textarea + send button) and `ChatMessageArea` (streaming markdown display). Messages flow: user types → POST to orchestrator → SSE stream back with tokens → Streamdown renders markdown. There is no audio/voice code anywhere in the frontend.

The Web Speech API is natively available in Chrome, Edge, and Safari — covering the vast majority of users. It provides both `SpeechRecognition` (STT) and `SpeechSynthesis` (TTS) at zero cost.

## Goals / Non-Goals

**Goals:**
- Add a talk mode toggle that switches the chat input between text and voice
- Capture user speech via `SpeechRecognition` and send as regular text messages
- Read agent responses aloud via `SpeechSynthesis` as they stream in
- Give each agent a distinct voice profile (male/female, pitch, rate)
- Provide clear visual feedback for listening and speaking states
- Keep it entirely client-side — no backend changes, no API costs

**Non-Goals:**
- Real-time voice conversation (walkie-talkie style) — this is turn-based
- Server-side STT/TTS (e.g., Whisper, ElevenLabs) — too expensive
- Voice commands for navigation or app control — voice is chat-only
- Custom voice cloning or voice model training
- Supporting browsers without Web Speech API (graceful degradation only)

## Decisions

### 1. Use Web Speech API for both STT and TTS

**Choice:** Browser-native `SpeechRecognition` + `SpeechSynthesis`
**Over:** OpenAI Whisper ($0.006/min), Deepgram ($0.0043/min), ElevenLabs ($0.30/1K chars)

**Rationale:** The user's primary constraint is cost. Web Speech API is free and requires zero backend infrastructure. Quality is good enough for conversational chat — Chrome's recognition is powered by Google's speech models. TTS voices have improved significantly with neural voices in modern browsers.

### 2. Single `useVoiceChat` hook encapsulating all voice logic

**Choice:** One hook that owns STT state, TTS state, voice profiles, and lifecycle
**Over:** Separate `useSpeechRecognition` + `useSpeechSynthesis` hooks

**Rationale:** Voice chat is a single cohesive feature — the STT and TTS states are tightly coupled (e.g., stop TTS when user starts speaking, start TTS when streaming finishes). A single hook keeps the coordination logic in one place and exposes a clean API to consumers: `{ isTalkMode, isListening, isSpeaking, toggleTalkMode, startListening, stopListening, stopSpeaking }`.

### 3. Talk mode toggle in the chat input area

**Choice:** Replace the send button with a mic button when talk mode is active; add a small toggle in the input bar
**Over:** Header toggle, separate voice panel, floating action button

**Rationale:** The input area is where interaction happens. Placing the toggle there keeps the UI change minimal and discoverable. When talk mode is on, the textarea becomes a transcript display and the send button becomes a mic button — the spatial mapping is intuitive.

### 4. Per-agent voice profiles in `chat-constants.ts`

**Choice:** Add a `VOICE_PROFILES` constant mapping agent role → `{ gender, pitch, rate, voiceName? }`
**Over:** Random voice assignment, user-configurable voices, hardcoded in hook

**Rationale:** Voice identity reinforces agent personality. Keeping it in `chat-constants.ts` alongside existing palette/greeting configs is consistent with the codebase pattern. Gender assignments: Miso (architect) = male, Toro (tester) = male, Nori (coder) = female, Koji (reviewer) = female.

### 5. Sentence-level TTS chunking for streaming responses

**Choice:** Buffer streaming tokens and speak one sentence at a time
**Over:** Speak entire response after completion, speak individual tokens

**Rationale:** Speaking token-by-token sounds robotic and choppy. Waiting for the full response adds latency. Sentence-level chunking (split on `.!?` followed by space/newline) gives natural cadence while keeping perceived latency low. The buffer accumulates tokens until a sentence boundary is detected, then queues that sentence for speech.

### 6. Push-to-talk as the default voice input mode

**Choice:** User holds mic button to record, releases to send
**Over:** Always-on continuous listening, tap-to-toggle

**Rationale:** Push-to-talk gives explicit control over when speech is captured, avoids accidental sends, and maps naturally to the send-on-release gesture. It also avoids the complexity of silence detection for auto-sending. A toggle mode (tap to start, tap to stop) is offered as an alternative for accessibility.

## Risks / Trade-offs

- **Browser compatibility:** `SpeechRecognition` is not available in Firefox. → Mitigation: Hide the talk mode toggle entirely on unsupported browsers. Feature-detect with `'SpeechRecognition' in window || 'webkitSpeechRecognition' in window`.
- **TTS voice availability varies by OS/browser.** Exact voice names differ. → Mitigation: Voice profiles specify preferred voice name + fallback to any voice matching the gender. Use `speechSynthesis.getVoices()` to find the best match at runtime.
- **SpeechRecognition requires HTTPS** (except localhost). → Mitigation: Already deployed on HTTPS via Vercel. No action needed.
- **Simultaneous TTS + STT can cause feedback loops** (mic picks up speaker output). → Mitigation: Automatically pause STT while TTS is speaking. Resume listening after TTS finishes.
- **Code stripping in TTS** — agent responses contain markdown/code blocks that sound terrible when read aloud. → Mitigation: Strip markdown syntax, code blocks, and URLs from text before passing to `SpeechSynthesis`. Only speak prose content.
