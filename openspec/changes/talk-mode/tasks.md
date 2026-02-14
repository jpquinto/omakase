## 1. Voice Chat Constants & Config

- [x] 1.1 Add `VOICE_PROFILES` to `chat-constants.ts` mapping each agent role to `{ gender: "male" | "female", pitch: number, rate: number, preferredVoice?: string }` — Miso/Toro male, Nori/Koji female
- [x] 1.2 Add `isVoiceChatSupported()` utility that checks for `SpeechRecognition` / `webkitSpeechRecognition` availability

## 2. Core useVoiceChat Hook

- [x] 2.1 Create `use-voice-chat.ts` hook with STT lifecycle: `startListening`, `stopListening`, `isListening`, `transcript` (interim + final), `error`
- [x] 2.2 Add TTS lifecycle to the hook: `speakText(text, role)`, `stopSpeaking`, `isSpeaking` — uses `SpeechSynthesis` with voice profile lookup
- [x] 2.3 Implement sentence-level TTS chunking — buffer streaming tokens, split on `.!?` + whitespace, queue sentences to `SpeechSynthesis`
- [x] 2.4 Add markdown/code stripping utility for TTS — strip fenced code blocks, inline code, markdown syntax, URLs before speaking
- [x] 2.5 Implement voice selection logic: match by `preferredVoice` name → fallback to gender match → fallback to system default
- [x] 2.6 Add anti-feedback coordination: pause STT while TTS is speaking, resume after TTS finishes

## 3. Chat Input Integration

- [x] 3.1 Add talk mode toggle button to `ChatInput` — only rendered when `isVoiceChatSupported()` is true
- [x] 3.2 Replace send button with mic button when talk mode is active — hold-to-talk interaction (mousedown starts, mouseup stops and sends)
- [x] 3.3 Add tap-to-toggle fallback for the mic button (for accessibility / touch devices)
- [x] 3.4 Display interim transcript in the textarea area while listening
- [x] 3.5 Auto-send final transcript as a message when recognition completes

## 4. Visual Feedback

- [x] 4.1 Add pulse animation to the mic button during `isListening` state — uses agent palette color
- [x] 4.2 Add speaking indicator to the streaming message area during `isSpeaking` state — sound wave bars or similar
- [x] 4.3 Style the talk-mode-idle mic button with agent palette accent color

## 5. Chat Message Area Integration

- [x] 5.1 Wire `useVoiceChat` into `AgentChatPanel` and fullscreen chat page — pass `streamingContent` to TTS sentence chunker when talk mode is active
- [x] 5.2 Add stop-speaking button to message area during TTS playback
- [x] 5.3 Ensure TTS stops when user navigates away, switches threads, or closes the chat
