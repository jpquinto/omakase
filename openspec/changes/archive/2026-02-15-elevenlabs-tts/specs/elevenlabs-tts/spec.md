## ADDED Requirements

### Requirement: TTS API route
The system SHALL provide a Next.js API route at `/api/tts` that accepts a POST request with `{ text: string, voiceId: string }` and returns an audio stream from ElevenLabs.

#### Scenario: Successful TTS request
- **WHEN** a POST request is made to `/api/tts` with valid `text` and `voiceId`
- **THEN** the route SHALL call the ElevenLabs text-to-speech API with model `eleven_flash_v2_5`, stream the response audio back to the client with `Content-Type: audio/mpeg`, and return status 200

#### Scenario: Empty text
- **WHEN** a POST request is made to `/api/tts` with an empty or missing `text` field
- **THEN** the route SHALL return status 400 with `{ error: "text is required" }`

#### Scenario: Missing API key
- **WHEN** the `ELEVENLABS_API_KEY` environment variable is not set
- **THEN** the route SHALL return status 500 with `{ error: "TTS not configured" }`

#### Scenario: ElevenLabs API error
- **WHEN** the ElevenLabs API returns a non-200 status
- **THEN** the route SHALL return the same status code with `{ error: "TTS generation failed" }`

### Requirement: Per-agent ElevenLabs voice IDs
The system SHALL store an ElevenLabs voice ID for each agent role in `VOICE_PROFILES`.

#### Scenario: Voice ID lookup
- **WHEN** the system needs the ElevenLabs voice ID for an agent role
- **THEN** it SHALL read `VOICE_PROFILES[role].elevenLabsVoiceId` to get the voice ID string

#### Scenario: Miso voice ID
- **WHEN** the architect agent (Miso) speaks
- **THEN** the voice ID SHALL be `UaYTS0wayjmO9KD1LR4R`

#### Scenario: Nori voice ID
- **WHEN** the coder agent (Nori) speaks
- **THEN** the voice ID SHALL be `uYXf8XasLslADfZ2MB4u`

#### Scenario: Koji voice ID
- **WHEN** the reviewer agent (Koji) speaks
- **THEN** the voice ID SHALL be `8quEMRkSpwEaWBzHvTLv`

#### Scenario: Toro voice ID
- **WHEN** the tester agent (Toro) speaks
- **THEN** the voice ID SHALL be `UaYTS0wayjmO9KD1LR4R`
