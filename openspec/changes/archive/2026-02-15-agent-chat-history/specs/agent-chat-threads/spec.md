## ADDED Requirements

### Requirement: Thread data model
The system SHALL store conversation threads in a DynamoDB `agent-threads` table with `agentName` as partition key and `threadId` (ULID) as sort key. Each thread SHALL include `id` (same as `threadId`), `agentName`, `projectId`, `title` (string), `status` ("active" | "archived"), `lastMessageAt` (ISO 8601), `messageCount` (number), `createdAt` (ISO 8601), and `updatedAt` (ISO 8601).

#### Scenario: Thread table structure
- **WHEN** the `agent-threads` DynamoDB table is provisioned
- **THEN** it has partition key `agentName` (String), sort key `threadId` (String), and a GSI `by_project` with partition key `projectId` and sort key `lastMessageAt`

### Requirement: Create thread
The system SHALL expose a `POST /api/agents/:agentName/threads` endpoint that creates a new conversation thread for the specified agent.

#### Scenario: Create a new thread
- **WHEN** a user sends `POST /api/agents/:agentName/threads` with `{ projectId, title? }`
- **THEN** the system creates a thread with a ULID `threadId`, status "active", `messageCount: 0`, the provided title (or "New conversation" if omitted), and returns the created thread with a 201 status

#### Scenario: Create thread with invalid agent name
- **WHEN** a user sends `POST /api/agents/:agentName/threads` with an agent name that does not match any known agent
- **THEN** the system returns a 404 with an error message

### Requirement: List threads for an agent
The system SHALL expose a `GET /api/agents/:agentName/threads` endpoint that returns all threads for a given agent within a project, ordered by most recent activity.

#### Scenario: List active threads
- **WHEN** a user sends `GET /api/agents/:agentName/threads?projectId=<id>`
- **THEN** the system returns all threads with status "active" for that agent and project, ordered by `lastMessageAt` descending

#### Scenario: List threads including archived
- **WHEN** a user sends `GET /api/agents/:agentName/threads?projectId=<id>&includeArchived=true`
- **THEN** the system returns all threads (both active and archived) for that agent and project, ordered by `lastMessageAt` descending

#### Scenario: No threads exist
- **WHEN** a user lists threads for an agent that has no threads in the project
- **THEN** the system returns an empty array with a 200 status

### Requirement: Update thread
The system SHALL expose a `PATCH /api/agents/:agentName/threads/:threadId` endpoint for renaming or archiving a thread.

#### Scenario: Rename a thread
- **WHEN** a user sends `PATCH /api/agents/:agentName/threads/:threadId` with `{ title: "New title" }`
- **THEN** the system updates the thread's title and `updatedAt`, and returns the updated thread

#### Scenario: Archive a thread
- **WHEN** a user sends `PATCH /api/agents/:agentName/threads/:threadId` with `{ status: "archived" }`
- **THEN** the system sets the thread status to "archived" and `updatedAt`, and returns the updated thread

#### Scenario: Unarchive a thread
- **WHEN** a user sends `PATCH /api/agents/:agentName/threads/:threadId` with `{ status: "active" }`
- **THEN** the system sets the thread status to "active" and `updatedAt`, and returns the updated thread

### Requirement: Thread metadata auto-update on message creation
The system SHALL update the thread's `lastMessageAt` timestamp and increment `messageCount` whenever a new message is created with that thread's `threadId`.

#### Scenario: Message added to thread
- **WHEN** a new message is created with a `threadId`
- **THEN** the system updates the corresponding thread's `lastMessageAt` to the message timestamp and increments `messageCount` by 1

### Requirement: Auto-create thread on first message
The system SHALL automatically create a thread when a user sends a message to an agent and no active thread is selected.

#### Scenario: First message without thread
- **WHEN** a user sends a message to an agent without specifying a `threadId`
- **THEN** the system creates a new thread with title "New conversation", associates the message with it, and returns the created thread ID alongside the message response
