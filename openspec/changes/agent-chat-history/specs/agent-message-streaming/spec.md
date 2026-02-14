## MODIFIED Requirements

### Requirement: SSE stream for agent messages
The system SHALL expose an SSE endpoint at `GET /api/agent-runs/:runId/messages/stream` that pushes new messages to the frontend in real time. The endpoint SHALL accept an optional `threadId` query parameter to filter streamed messages to a specific thread.

#### Scenario: Frontend subscribes to message stream with thread filter
- **WHEN** the frontend opens an SSE connection with `?threadId=<id>`
- **THEN** the orchestrator sends existing messages for that thread as an initial batch, then streams only new messages belonging to that thread

#### Scenario: Frontend subscribes without thread filter
- **WHEN** the frontend opens an SSE connection without a `threadId` parameter
- **THEN** the orchestrator sends all existing messages for the run as an initial batch, then streams all new messages (backward-compatible behavior)

#### Scenario: New message is streamed
- **WHEN** a new message is created in the `agent-messages` table (from user or agent)
- **THEN** the SSE stream emits the message as a JSON event within 1 second of creation

#### Scenario: SSE reconnection
- **WHEN** the frontend SSE connection drops and reconnects with a `Last-Event-ID` header
- **THEN** the orchestrator sends all messages created after that event ID's timestamp (filtered by `threadId` if provided), then resumes streaming

#### Scenario: Agent run completes
- **WHEN** the agent run transitions to "completed" or "failed" status
- **THEN** the SSE stream sends a final `event: close` message with the terminal status and then closes the connection

### Requirement: Frontend SSE hook
The system SHALL provide a `useAgentChat` React hook that manages the SSE connection, message state, and message sending. The hook SHALL accept an optional `threadId` parameter to scope the connection to a specific thread.

#### Scenario: Hook establishes SSE connection with thread
- **WHEN** the `useAgentChat(runId, { threadId })` hook mounts with a `threadId`
- **THEN** it opens an SSE connection to `/api/agent-runs/:runId/messages/stream?threadId=<id>` and populates the messages state with thread-scoped messages

#### Scenario: Hook sends a message with thread
- **WHEN** `sendMessage(content)` is called on the hook and a `threadId` is configured
- **THEN** it posts the message via `POST /api/agent-runs/:runId/messages` with the `threadId` in the body and adds an optimistic entry to the messages state

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
- **WHEN** an agent sends `POST /api/agent-runs/:runId/messages` with `{ content, sender: "agent", role, type, threadId }`
- **THEN** the message is stored with the `threadId` and streamed to connected frontends via SSE

### Requirement: Agent response context from thread
The system SHALL load conversation history from the thread (up to 50 most recent messages) when generating agent responses, providing persistent context across runs.

#### Scenario: Agent responds with thread context
- **WHEN** an agent generates a response for a message in a thread
- **THEN** the agent responder loads the last 50 messages from the thread (via `threadId`) as conversation history, regardless of which `runId` they belong to

#### Scenario: Agent responds without thread (legacy)
- **WHEN** an agent generates a response for a message without a `threadId`
- **THEN** the agent responder loads conversation history from the current `runId` only (backward-compatible behavior)
