## MODIFIED Requirements

### Requirement: Chat message persistence
The system SHALL store chat messages in a DynamoDB `agent-messages` table with `runId` as partition key and `timestamp` as sort key. Each message SHALL include `id`, `featureId`, `projectId`, `sender` ("user" | "agent"), `role` (agent role), `content` (string), `type` ("message" | "status" | "error"), and an optional `threadId` (string). The table SHALL have a GSI `by_thread` with partition key `threadId` and sort key `timestamp` for efficient thread-scoped queries.

#### Scenario: User sends a message to an agent
- **WHEN** a user submits a chat message for an active agent run
- **THEN** the message is stored in the `agent-messages` table with `sender: "user"`, the current timestamp, the agent run's `runId` as partition key, and the active thread's `threadId`

#### Scenario: Agent posts a response
- **WHEN** an agent posts a response through the orchestrator
- **THEN** the message is stored in the `agent-messages` table with `sender: "agent"`, the agent's `role`, `type: "message"`, and the active thread's `threadId`

#### Scenario: Retrieve chat history for a thread
- **WHEN** a user opens a conversation thread
- **THEN** the system fetches all messages for that `threadId` from DynamoDB using the `by_thread` GSI, ordered by timestamp ascending

#### Scenario: Retrieve chat history for an agent run (legacy)
- **WHEN** a user opens the chat panel for an agent run without a thread
- **THEN** the system fetches all messages for that `runId` from DynamoDB, ordered by timestamp ascending

### Requirement: Chat message API endpoints
The system SHALL expose REST endpoints on the orchestrator for sending and retrieving chat messages. The send endpoint SHALL accept an optional `threadId` parameter.

#### Scenario: Send message endpoint with thread
- **WHEN** the frontend sends `POST /api/agent-runs/:runId/messages` with `{ content, sender: "user", threadId }`
- **THEN** the orchestrator validates the agent run exists, creates the message in DynamoDB with the provided `threadId`, updates the thread metadata, and returns the created message with a 201 status

#### Scenario: Retrieve messages by thread
- **WHEN** the frontend sends `GET /api/threads/:threadId/messages`
- **THEN** the orchestrator queries the `by_thread` GSI and returns all messages for that thread, ordered by timestamp ascending

#### Scenario: Send message to inactive agent run
- **WHEN** the frontend sends a message to an agent run with status "completed" or "failed"
- **THEN** the orchestrator returns a 409 Conflict with an error message indicating the agent is no longer active

### Requirement: Chat panel UI component
The system SHALL provide an `AgentChatPanel` React component that displays a message thread and an input field for sending messages. The component SHALL accept a `threadId` prop in addition to `runId` and display messages scoped to the selected thread. The component SHALL follow the Omakase liquid glass design system.

#### Scenario: Display message thread
- **WHEN** the chat panel is open for a thread
- **THEN** messages are displayed in chronological order with sender avatar (agent mascot or user icon), sender name, timestamp, and message content

#### Scenario: Send message from chat panel
- **WHEN** the user types a message and presses Enter or clicks Send
- **THEN** the message is posted to the orchestrator API with the current `threadId` and appears immediately in the thread with an optimistic update

#### Scenario: Empty state
- **WHEN** the chat panel is open for a thread with no messages
- **THEN** a placeholder message is shown: "Start a conversation with [agent name]"

#### Scenario: Agent is not running
- **WHEN** the chat panel is open and no agent run is active for the current thread
- **THEN** the message input is disabled and a banner reads "No active agent run. Start a new run to continue this conversation."

### Requirement: Chat panel integration with project detail page
The system SHALL integrate the chat panel as a slide-out sidebar on the project detail page, accessible from Agent Mission Control and the Log Viewer. The panel SHALL include the thread history sidebar.

#### Scenario: Open chat from Agent Mission Control
- **WHEN** a user clicks an agent card in Agent Mission Control that has a running agent
- **THEN** a slide-out panel opens on the right side of the page showing the thread history sidebar and the chat panel for that agent's current thread

#### Scenario: Open chat from Log Viewer
- **WHEN** a user clicks an agent name tag in the Log Viewer
- **THEN** the chat sidebar opens for that agent's most recent thread

#### Scenario: Close chat panel
- **WHEN** the user clicks the close button or presses Escape
- **THEN** the chat sidebar slides closed and the full-width tab content is restored

#### Scenario: Chat panel persists across tab switches
- **WHEN** the chat sidebar is open and the user switches tabs (e.g., from Agents to Logs)
- **THEN** the chat sidebar remains open with the same thread and conversation

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
