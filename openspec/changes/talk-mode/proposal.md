## Why

Agent chat is currently text-only. Adding a voice mode lets users talk to agents hands-free — useful during development when hands are on the keyboard, or for quick back-and-forth that's faster spoken than typed. This also gives each agent a distinct vocal identity, reinforcing their personality.

## What Changes

- Add a "Talk Mode" toggle to the chat input area that switches between text and voice interaction
- Capture user speech via the browser's Web Speech API (`SpeechRecognition`) — free, no API costs
- Stream agent text responses to browser `SpeechSynthesis` for real-time voice output — also free
- Assign each agent a distinct voice profile: Miso and Toro use male voices, Nori and Koji use female voices
- Add visual feedback for listening state (waveform/pulse animation) and speaking state
- Voice mode works in both modal chat and fullscreen chat

## Capabilities

### New Capabilities
- `voice-chat`: Browser-based speech-to-text input and text-to-speech output for agent conversations, including per-agent voice profiles and visual state indicators

### Modified Capabilities
- `agent-chat`: Chat input component gains a talk-mode toggle; chat message area gains speaking-state visual feedback; chat hook gains voice lifecycle management

## Impact

- **Components**: `chat-input.tsx`, `chat-message-area.tsx`, `chat-header.tsx` — modified for voice UI controls and state
- **Hooks**: New `use-voice-chat.ts` hook for STT/TTS lifecycle; `use-agent-chat.ts` gains voice integration points
- **Constants**: `chat-constants.ts` — new voice profile config per agent (voice name, pitch, rate)
- **Dependencies**: None — Web Speech API is built into modern browsers (Chrome, Edge, Safari)
- **Cost**: $0 — entirely browser-side APIs, no external services
- **Backend**: No changes required — voice is decoded to text client-side before sending as regular messages
