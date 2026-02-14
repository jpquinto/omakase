## ADDED Requirements

### Requirement: SSE stream for agent messages
The system SHALL expose an SSE endpoint at `GET /api/agent-runs/:runId/messages/stream` that pushes new messages to the frontend in real time as they are created.

#### Scenario: Frontend subscribes to message stream
- **WHEN** the frontend opens an SSE connection for an agent run
- **THEN** the orchestrator sends existing messages as an initial batch, then streams new messages as `data:` events with JSON-encoded message objects

#### Scenario: New message is streamed
- **WHEN** a new message is created in the `agent-messages` table (from user or agent)
- **THEN** the SSE stream emits the message as a JSON event within 1 second of creation

#### Scenario: SSE reconnection
- **WHEN** the frontend SSE connection drops and reconnects with a `Last-Event-ID` header
- **THEN** the orchestrator sends all messages created after that event ID's timestamp, then resumes streaming

#### Scenario: Agent run completes
- **WHEN** the agent run transitions to "completed" or "failed" status
- **THEN** the SSE stream sends a final `event: close` message with the terminal status and then closes the connection

### Requirement: Frontend SSE hook
The system SHALL provide a `useAgentChat` React hook that manages the SSE connection, message state, and message sending for a given agent run.

#### Scenario: Hook establishes SSE connection
- **WHEN** the `useAgentChat(runId)` hook mounts
- **THEN** it opens an SSE connection to `/api/agent-runs/:runId/messages/stream` and populates the messages state as events arrive

#### Scenario: Hook sends a message
- **WHEN** `sendMessage(content)` is called on the hook
- **THEN** it posts the message via `POST /api/agent-runs/:runId/messages` and adds an optimistic entry to the messages state

#### Scenario: Hook cleans up on unmount
- **WHEN** the component using `useAgentChat` unmounts
- **THEN** the SSE connection is closed and no further state updates occur

#### Scenario: Hook handles connection errors
- **WHEN** the SSE connection fails
- **THEN** the hook sets an `error` state and the EventSource automatically retries connection per the SSE specification

### Requirement: Agent-side message polling
The system SHALL provide an HTTP endpoint that agents poll to receive pending user messages during execution.

#### Scenario: Agent polls for messages
- **WHEN** an agent sends `GET /api/agent-runs/:runId/messages?since=<timestamp>&sender=user`
- **THEN** the orchestrator returns all user messages created after the given timestamp

#### Scenario: No pending messages
- **WHEN** an agent polls and no new user messages exist since the given timestamp
- **THEN** the orchestrator returns an empty array with a 200 status

#### Scenario: Agent posts output as message
- **WHEN** an agent sends `POST /api/agent-runs/:runId/messages` with `{ content, sender: "agent", role, type }`
- **THEN** the message is stored and streamed to connected frontends via SSE
