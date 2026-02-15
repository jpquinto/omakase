## ADDED Requirements

### Requirement: Voice chat hook
The system SHALL provide a `useVoiceChat` hook that manages speech-to-text input and text-to-speech output using the browser's Web Speech API. The hook SHALL expose: `isTalkMode`, `isListening`, `isSpeaking`, `transcript`, `toggleTalkMode`, `startListening`, `stopListening`, `stopSpeaking`, and `speakText`.

#### Scenario: Enable talk mode
- **WHEN** the user calls `toggleTalkMode()` and talk mode is off
- **THEN** `isTalkMode` becomes `true` and the hook initializes `SpeechRecognition` with `lang: "en-US"` and `interimResults: true`

#### Scenario: Disable talk mode
- **WHEN** the user calls `toggleTalkMode()` and talk mode is on
- **THEN** `isTalkMode` becomes `false`, any active recognition is stopped, and any active speech synthesis is cancelled

#### Scenario: Browser does not support SpeechRecognition
- **WHEN** the hook initializes and `SpeechRecognition` is not available in the browser
- **THEN** `isTalkMode` SHALL remain `false` and `toggleTalkMode` SHALL be a no-op, and a `isSupported` flag SHALL be `false`

### Requirement: Speech-to-text input
The system SHALL capture user speech via `SpeechRecognition` and convert it to text for sending as a chat message.

#### Scenario: User holds mic button to speak
- **WHEN** the user presses and holds the mic button while talk mode is active
- **THEN** `SpeechRecognition.start()` is called, `isListening` becomes `true`, and interim results are displayed in the transcript area

#### Scenario: User releases mic button
- **WHEN** the user releases the mic button
- **THEN** `SpeechRecognition.stop()` is called, the final transcript is submitted as a chat message via the existing `sendMessage` function, and `isListening` becomes `false`

#### Scenario: Recognition error
- **WHEN** `SpeechRecognition` fires an `error` event
- **THEN** `isListening` becomes `false` and the error is surfaced to the user without crashing the chat

#### Scenario: Tap-to-toggle mode
- **WHEN** the user taps (not holds) the mic button
- **THEN** recognition toggles between started and stopped — first tap starts listening, second tap stops and sends the transcript

### Requirement: Text-to-speech output
The system SHALL read agent responses aloud using `SpeechSynthesis` when talk mode is active. The system SHALL speak responses sentence-by-sentence as they stream in.

#### Scenario: Agent response streams in during talk mode
- **WHEN** talk mode is active and the agent sends streaming tokens
- **THEN** tokens are buffered until a sentence boundary is detected (`.`, `!`, `?` followed by whitespace or end of stream), then the sentence is queued to `SpeechSynthesis` for speaking

#### Scenario: Agent response completes
- **WHEN** the streaming response completes and there is remaining buffered text
- **THEN** the remaining buffer is spoken as the final utterance

#### Scenario: User interrupts TTS
- **WHEN** the user taps the stop-speaking button or starts a new voice input
- **THEN** `speechSynthesis.cancel()` is called immediately, `isSpeaking` becomes `false`, and any queued sentences are discarded

#### Scenario: Markdown and code stripping
- **WHEN** text is prepared for TTS
- **THEN** markdown syntax (headers, bold, italic, links), code blocks (fenced and inline), and URLs SHALL be stripped, leaving only prose content

### Requirement: Per-agent voice profiles
The system SHALL assign each agent a distinct voice profile that determines their TTS voice characteristics.

#### Scenario: Miso speaks
- **WHEN** the architect agent (Miso) response is spoken via TTS
- **THEN** a male voice SHALL be used with standard pitch (1.0) and slightly slower rate (0.9)

#### Scenario: Nori speaks
- **WHEN** the coder agent (Nori) response is spoken via TTS
- **THEN** a female voice SHALL be used with standard pitch (1.0) and standard rate (1.0)

#### Scenario: Koji speaks
- **WHEN** the reviewer agent (Koji) response is spoken via TTS
- **THEN** a female voice SHALL be used with slightly higher pitch (1.1) and standard rate (1.0)

#### Scenario: Toro speaks
- **WHEN** the tester agent (Toro) response is spoken via TTS
- **THEN** a male voice SHALL be used with slightly lower pitch (0.9) and standard rate (1.0)

#### Scenario: Voice selection fallback
- **WHEN** the preferred voice name is not available on the user's system
- **THEN** the system SHALL fall back to any available voice matching the specified gender, or the system default voice if no gender match is found

### Requirement: Talk mode visual feedback
The system SHALL provide visual indicators for voice states (listening, speaking, idle).

#### Scenario: Listening state
- **WHEN** `isListening` is `true`
- **THEN** the mic button SHALL pulse with the agent's palette color, and a waveform or pulse animation SHALL be displayed in the input area

#### Scenario: Speaking state
- **WHEN** `isSpeaking` is `true`
- **THEN** the agent's mascot or message area SHALL display a speaking indicator (e.g., sound wave bars) using the agent's palette color

#### Scenario: Talk mode idle
- **WHEN** talk mode is active but neither listening nor speaking
- **THEN** the mic button SHALL be displayed in a ready state with the agent's palette accent color
