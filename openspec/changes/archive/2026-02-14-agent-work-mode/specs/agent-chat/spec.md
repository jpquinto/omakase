## MODIFIED Requirements

### Requirement: Chat message API endpoints
The system SHALL expose REST endpoints on the orchestrator for sending and retrieving chat messages. The work session start endpoint SHALL resolve the project's `repoUrl` from DynamoDB and pass it to the workspace provisioning system.

#### Scenario: Send message endpoint
- **WHEN** the frontend sends `POST /api/agent-runs/:runId/messages` with `{ content, sender: "user" }`
- **THEN** the orchestrator validates the agent run exists and is active, creates the message in DynamoDB, and returns the created message with a 201 status

#### Scenario: Retrieve messages endpoint
- **WHEN** the frontend sends `GET /api/agent-runs/:runId/messages`
- **THEN** the orchestrator returns all messages for that run, ordered by timestamp ascending

#### Scenario: Send message to inactive agent run
- **WHEN** the frontend sends a message to an agent run with status "completed" or "failed"
- **THEN** the orchestrator returns a 409 Conflict with an error message indicating the agent is no longer active

#### Scenario: Start work session resolves repo URL
- **WHEN** the frontend sends `POST /api/agents/:agentName/work-sessions` with `{ projectId, threadId, prompt }`
- **THEN** the orchestrator looks up the project's `repoUrl` from DynamoDB and passes it to the workspace provisioning system before spawning Claude Code

## ADDED Requirements

### Requirement: Active work session lookup endpoint
The system SHALL expose an endpoint to check if a thread has an active work session, enabling the frontend to reconnect instead of starting a new session.

#### Scenario: Thread has an active work session
- **WHEN** the frontend sends `GET /api/agents/:agentName/work-sessions/active?threadId=<threadId>`
- **THEN** the orchestrator returns `{ active: true, runId: "<runId>" }` if a live session exists for that thread

#### Scenario: Thread has no active work session
- **WHEN** the frontend sends `GET /api/agents/:agentName/work-sessions/active?threadId=<threadId>`
- **THEN** the orchestrator returns `{ active: false }`

### Requirement: Frontend work session reconnection
The system SHALL reconnect to an existing active work session when a user opens a work-mode thread that already has one running, instead of starting a new session.

#### Scenario: User opens thread with active work session
- **WHEN** a user opens a work-mode thread and the thread has an active work session
- **THEN** the frontend queries the active session endpoint, receives the existing `runId`, sets it as `workSessionRunId`, and opens an SSE stream to resume receiving output

#### Scenario: User opens thread with no active work session
- **WHEN** a user opens a work-mode thread with no active session
- **THEN** the frontend behaves normally — the next message sent starts a new work session
