## ADDED Requirements

### Requirement: Work session lifecycle management
The orchestrator SHALL provide a `WorkSessionManager` that spawns, tracks, and cleans up Claude Code subprocesses for work mode conversations. Each session SHALL be identified by its `runId` and maintain a reference to the child process, stdin writer, and session metadata.

#### Scenario: Starting a work session
- **WHEN** user sends the first message to a work-mode thread
- **THEN** the system creates an `AgentRun` record with status `"started"`, spawns a `claude` CLI subprocess with `--output-format stream-json`, and pipes the user's message as the initial prompt

#### Scenario: Session cleanup on inactivity timeout
- **WHEN** no user message is received for 30 minutes
- **THEN** the system terminates the Claude Code process, completes the `AgentRun` with status `"completed"`, and sends a status message to the chat indicating the session timed out

#### Scenario: User explicitly ends a session
- **WHEN** user clicks the "End Session" button
- **THEN** the system sends `/exit` to Claude Code stdin, waits for graceful shutdown (5s), terminates the process, and completes the `AgentRun`

### Requirement: Claude Code subprocess spawning
The system SHALL spawn the `claude` CLI with `--output-format stream-json` flag, the agent's personality injected via `--system-prompt`, and the working directory set to the project's local workspace. The process SHALL stay alive between user messages for multi-turn conversation.

#### Scenario: Spawning with correct configuration
- **WHEN** a work session starts for agent "nori" on project "abc"
- **THEN** the subprocess is spawned with working directory `{LOCAL_WORKSPACE_ROOT}/{projectId}/`, system prompt containing nori's personality, and `--output-format stream-json`

#### Scenario: Claude CLI not available
- **WHEN** the `claude` CLI is not found in PATH
- **THEN** the system returns an error to the user and does not create an `AgentRun`

### Requirement: User message routing to Claude Code
The system SHALL pipe user follow-up messages to the Claude Code process's stdin. Each message SHALL be written as a line of text followed by a newline, which Claude Code interprets as a new prompt in its conversation.

#### Scenario: Sending a follow-up message
- **WHEN** user sends a message to an active work session
- **THEN** the message content is written to the subprocess stdin and the inactivity timeout is reset

#### Scenario: Sending a message to an ended session
- **WHEN** user sends a message to a work session whose process has exited
- **THEN** the system returns an error indicating the session has ended

### Requirement: Claude Code output streaming
The system SHALL parse the subprocess stdout (stream-JSON format), extract text content from assistant messages, and emit tokens through the stream-bus for real-time SSE delivery to the frontend.

#### Scenario: Streaming assistant text
- **WHEN** Claude Code outputs an `assistant` event with text content
- **THEN** the system emits `thinking_start` at the beginning, individual `token` events for text deltas, and `thinking_end` when the message is complete

#### Scenario: Streaming tool use output
- **WHEN** Claude Code outputs a `tool_use` or `result` event
- **THEN** the system emits `token` events with a formatted representation of the tool action (e.g., "Reading file: src/index.ts")

#### Scenario: Process exits unexpectedly
- **WHEN** the Claude Code process exits with a non-zero code
- **THEN** the system emits a `stream_error` event, completes the `AgentRun` with status `"failed"`, and sends an error message to the chat

### Requirement: Work session API endpoints
The orchestrator SHALL expose endpoints for managing work sessions.

#### Scenario: Starting a work session
- **WHEN** client sends `POST /api/agents/:agentName/work-sessions` with `{ projectId, threadId, prompt }`
- **THEN** the system spawns a Claude Code session and returns `{ runId, status: "started" }`

#### Scenario: Ending a work session
- **WHEN** client sends `DELETE /api/work-sessions/:runId`
- **THEN** the system gracefully terminates the session and returns `{ status: "completed" }`

#### Scenario: Listing active work sessions
- **WHEN** client sends `GET /api/agents/:agentName/work-sessions`
- **THEN** the system returns an array of active work sessions with their runId, projectId, and startedAt

### Requirement: AgentRun integration for work sessions
Work sessions SHALL create `AgentRun` records so they appear in agent profile page stats, recent runs, and activity heatmaps.

#### Scenario: Work session creates a run record
- **WHEN** a work session starts
- **THEN** an `AgentRun` is created with the agent's role, associated projectId, a synthetic featureId (or "work-session"), status "started", and the current timestamp

#### Scenario: Work session completion updates the run
- **WHEN** a work session ends (timeout, user-initiated, or error)
- **THEN** the `AgentRun` is updated with completedAt, durationMs, and final status ("completed" or "failed")
