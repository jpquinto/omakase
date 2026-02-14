## ADDED Requirements

### Requirement: Chat message persistence
The system SHALL store chat messages in a DynamoDB `agent-messages` table with `runId` as partition key and `timestamp` as sort key. Each message SHALL include `id`, `featureId`, `projectId`, `sender` ("user" | "agent"), `role` (agent role), `content` (string), and `type` ("message" | "status" | "error").

#### Scenario: User sends a message to an agent
- **WHEN** a user submits a chat message for an active agent run
- **THEN** the message is stored in the `agent-messages` table with `sender: "user"`, the current timestamp, and the agent run's `runId` as partition key

#### Scenario: Agent posts a response
- **WHEN** an agent posts a response through the orchestrator
- **THEN** the message is stored in the `agent-messages` table with `sender: "agent"`, the agent's `role`, and `type: "message"`

#### Scenario: Retrieve chat history for an agent run
- **WHEN** a user opens the chat panel for an agent run
- **THEN** the system fetches all messages for that `runId` from DynamoDB, ordered by timestamp ascending

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

### Requirement: Chat panel UI component
The system SHALL provide an `AgentChatPanel` React component that displays a message thread and an input field for sending messages. The component SHALL follow the Omakase liquid glass design system.

#### Scenario: Display message thread
- **WHEN** the chat panel is open for an agent run
- **THEN** messages are displayed in chronological order with sender avatar (agent mascot or user icon), sender name, timestamp, and message content

#### Scenario: Send message from chat panel
- **WHEN** the user types a message and presses Enter or clicks Send
- **THEN** the message is posted to the orchestrator API and appears immediately in the thread with an optimistic update

#### Scenario: Empty state
- **WHEN** the chat panel is open and no messages exist for the agent run
- **THEN** a placeholder message is shown: "Send a message to [agent name] while they work on [feature name]"

#### Scenario: Agent is not running
- **WHEN** the chat panel is open for an agent run that has completed or failed
- **THEN** the message input is disabled and a banner reads "This conversation has ended"

### Requirement: Chat panel integration with project detail page
The system SHALL integrate the chat panel as a slide-out sidebar on the project detail page, accessible from Agent Mission Control and the Log Viewer.

#### Scenario: Open chat from Agent Mission Control
- **WHEN** a user clicks an agent card in Agent Mission Control that has a running agent
- **THEN** a slide-out panel opens on the right side of the page showing the chat panel for that agent's current run

#### Scenario: Open chat from Log Viewer
- **WHEN** a user clicks an agent name tag in the Log Viewer
- **THEN** the chat sidebar opens for that agent's most recent run

#### Scenario: Close chat panel
- **WHEN** the user clicks the close button or presses Escape
- **THEN** the chat sidebar slides closed and the full-width tab content is restored

#### Scenario: Chat panel persists across tab switches
- **WHEN** the chat sidebar is open and the user switches tabs (e.g., from Agents to Logs)
- **THEN** the chat sidebar remains open with the same conversation

### Requirement: Chat message types and formatting
The system SHALL support three message types: `message` (regular chat), `status` (agent phase transitions), and `error` (agent errors). Each type SHALL be visually distinct in the chat panel.

#### Scenario: Regular message rendering
- **WHEN** a message of type "message" is displayed
- **THEN** it renders with the sender's name, content text, and timestamp in the standard chat bubble style

#### Scenario: Status message rendering
- **WHEN** a message of type "status" is displayed (e.g., "Switched to coding phase")
- **THEN** it renders as a centered, muted inline notice without a chat bubble

#### Scenario: Error message rendering
- **WHEN** a message of type "error" is displayed
- **THEN** it renders with a red accent border and the `oma-error` color token

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
