## MODIFIED Requirements

### Requirement: Text-to-speech output
The system SHALL read agent responses aloud using ElevenLabs TTS via the `/api/tts` route when talk mode is active. The system SHALL speak responses sentence-by-sentence as they stream in.

#### Scenario: Agent response streams in during talk mode
- **WHEN** talk mode is active and the agent sends streaming tokens
- **THEN** tokens SHALL be buffered until a sentence boundary is detected (`.`, `!`, `?` followed by whitespace or end of stream), then the sentence SHALL be sent to `/api/tts` with the agent's `elevenLabsVoiceId`, and the returned audio SHALL be queued for playback

#### Scenario: Audio playback queue
- **WHEN** multiple sentences are ready for playback
- **THEN** each audio segment SHALL play sequentially — the next segment starts when the current one ends via the `ended` event on the `<audio>` element

#### Scenario: Agent response completes
- **WHEN** the streaming response completes and there is remaining buffered text
- **THEN** the remaining buffer SHALL be sent to `/api/tts` and played as the final audio segment

#### Scenario: User interrupts TTS
- **WHEN** the user taps the stop-speaking button or starts a new voice input
- **THEN** the current audio playback SHALL stop immediately, the audio queue SHALL be cleared, and `isSpeaking` SHALL become `false`

#### Scenario: Markdown and code stripping
- **WHEN** text is prepared for TTS
- **THEN** markdown syntax (headers, bold, italic, links), code blocks (fenced and inline), URLs, and emojis SHALL be stripped, leaving only prose content

#### Scenario: TTS API error during playback
- **WHEN** a `/api/tts` request fails during streaming playback
- **THEN** the failed sentence SHALL be skipped, `isSpeaking` SHALL remain `true` if there are queued sentences, and the error SHALL be logged but not surfaced to the user

### Requirement: Per-agent voice profiles
The system SHALL assign each agent a distinct ElevenLabs voice via `VOICE_PROFILES` containing an `elevenLabsVoiceId` and `gender` field.

#### Scenario: Miso speaks
- **WHEN** the architect agent (Miso) response is spoken via TTS
- **THEN** the ElevenLabs voice ID `UaYTS0wayjmO9KD1LR4R` SHALL be used

#### Scenario: Nori speaks
- **WHEN** the coder agent (Nori) response is spoken via TTS
- **THEN** the ElevenLabs voice ID `uYXf8XasLslADfZ2MB4u` SHALL be used

#### Scenario: Koji speaks
- **WHEN** the reviewer agent (Koji) response is spoken via TTS
- **THEN** the ElevenLabs voice ID `8quEMRkSpwEaWBzHvTLv` SHALL be used

#### Scenario: Toro speaks
- **WHEN** the tester agent (Toro) response is spoken via TTS
- **THEN** the ElevenLabs voice ID `UaYTS0wayjmO9KD1LR4R` SHALL be used

#### Scenario: Voice selection fallback
- **WHEN** an agent's voice ID is missing from `VOICE_PROFILES`
- **THEN** the system SHALL fall back to the architect voice ID as default

## REMOVED Requirements

### Requirement: Browser SpeechSynthesis TTS
**Reason**: Replaced by ElevenLabs TTS for higher quality, consistent voices
**Migration**: All `speechSynthesis.speak()` / `SpeechSynthesisUtterance` usage replaced by `/api/tts` fetch + `<audio>` playback. The `findVoiceForRole()` function and browser voice matching logic are removed. `pitch` and `rate` fields removed from `VoiceProfile`.
