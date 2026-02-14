## 1. Voice Profile Config

- [ ] 1.1 Update `VoiceProfile` interface: replace `pitch`, `rate`, `preferredVoice` with `elevenLabsVoiceId: string` (keep `gender`)
- [ ] 1.2 Update `VOICE_PROFILES` constant with ElevenLabs voice IDs: architect `UaYTS0wayjmO9KD1LR4R`, coder `uYXf8XasLslADfZ2MB4u`, reviewer `8quEMRkSpwEaWBzHvTLv`, tester `UaYTS0wayjmO9KD1LR4R`

## 2. TTS API Route

- [ ] 2.1 Add `ELEVENLABS_API_KEY` to `.env.example`
- [ ] 2.2 Create `/api/tts/route.ts` — POST handler that accepts `{ text, voiceId }`, calls ElevenLabs `v1/text-to-speech/{voiceId}/stream` with model `eleven_flash_v2_5`, and streams back the MP3 audio response
- [ ] 2.3 Add input validation (400 for empty text) and error handling (500 for missing API key, passthrough for ElevenLabs errors)

## 3. Hook Rewrite — TTS Playback

- [ ] 3.1 Remove `findVoiceForRole()` function and all `SpeechSynthesis`/`SpeechSynthesisUtterance` usage from `use-voice-chat.ts`
- [ ] 3.2 Add `speakSentenceViaElevenLabs()` — fetches `/api/tts` with `{ text, voiceId }`, converts response to Blob, creates object URL, returns it
- [ ] 3.3 Add audio queue system — maintain a `<audio>` element ref, queue blob URLs, play sequentially using `ended` event, revoke object URLs after playback
- [ ] 3.4 Update `feedStreamingToken` / sentence buffer to call the new ElevenLabs pipeline instead of `speechSynthesis.speak()`
- [ ] 3.5 Update `stopSpeaking` to pause the `<audio>` element, clear the queue, and revoke all pending object URLs
- [ ] 3.6 Update `isSpeaking` state to track audio element `playing` / queue non-empty rather than `speechSynthesis.speaking`

## 4. Wiring & Cleanup

- [ ] 4.1 Pass agent role's `elevenLabsVoiceId` from `VOICE_PROFILES` into the TTS pipeline (both `agent-chat-panel.tsx` and fullscreen `page.tsx`)
- [ ] 4.2 Remove the `findVoiceForRole` function, `voicesLoaded` state, and `voiceschanged` event listener from the hook
- [ ] 4.3 Verify talk mode still works end-to-end: toggle on, hold mic to speak, agent response plays via ElevenLabs audio
