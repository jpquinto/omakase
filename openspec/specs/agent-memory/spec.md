## ADDED Requirements

### Requirement: Agent memory persistence
The system SHALL store agent memories in a DynamoDB `agent-memories` table with `agentName#projectId` as partition key and `createdAt` as sort key. Each memory item SHALL include `id` (ULID), `agentName`, `projectId`, `content` (string), `source` ("extraction" | "manual" | "system"), and `createdAt` (ISO 8601 timestamp).

#### Scenario: Memory created after agent run
- **WHEN** an agent pipeline step completes and the post-run extraction produces learnings
- **THEN** each learning is stored as a separate item in the `agent-memories` table with `source: "extraction"`, the agent's name, and the current project ID

#### Scenario: Memory created manually via API
- **WHEN** a user sends `POST /api/agents/:agentName/memories` with `{ projectId, content }`
- **THEN** the memory is stored with `source: "manual"` and returned with a 201 status

#### Scenario: Retrieve memories for an agent and project
- **WHEN** the system fetches memories via `GET /api/agents/:agentName/memories?projectId=<id>`
- **THEN** all memories for that agent+project combination are returned, ordered by `createdAt` descending, limited to the 50 most recent

### Requirement: Memory injection before agent run
The system SHALL fetch all memories for the agent's name and current project from DynamoDB and write them to `.claude/memory/MEMORY.md` in the agent workspace before invoking Claude Code CLI.

#### Scenario: Agent workspace receives memory file
- **WHEN** an agent step is about to launch and the agent has 3 existing memories for the project
- **THEN** the entrypoint creates `.claude/memory/MEMORY.md` containing all 3 memories formatted as a markdown list, and Claude Code auto-discovers it as persistent context

#### Scenario: Agent has no memories for the project
- **WHEN** an agent step is about to launch and no memories exist for this agent+project
- **THEN** no `.claude/memory/MEMORY.md` file is created, and the agent runs without memory context

### Requirement: Memory extraction after agent run
The system SHALL run a lightweight post-run extraction step after the main Claude Code invocation completes, to identify and persist new learnings from the agent's work.

#### Scenario: Extraction produces learnings
- **WHEN** the main Claude Code invocation exits and the extraction prompt identifies 2 new learnings
- **THEN** 2 new memory items are created in the `agent-memories` table with `source: "extraction"`

#### Scenario: Extraction fails gracefully
- **WHEN** the post-run extraction step fails (timeout, API error, empty output)
- **THEN** the pipeline continues without saving memories and logs a warning

#### Scenario: Extraction produces no learnings
- **WHEN** the extraction prompt determines there are no new noteworthy learnings
- **THEN** no memory items are created and the pipeline continues normally

### Requirement: Memory cap enforcement
The system SHALL enforce a maximum of 50 memories per agent+project combination. When fetching memories for injection, only the 50 most recent SHALL be returned.

#### Scenario: Memory count exceeds cap
- **WHEN** an agent+project has 55 memories and the entrypoint fetches memories
- **THEN** only the 50 most recent memories (by `createdAt`) are returned and written to MEMORY.md

### Requirement: Memory CRUD API endpoints
The system SHALL expose REST endpoints on the orchestrator for managing agent memories.

#### Scenario: List memories
- **WHEN** a client sends `GET /api/agents/:agentName/memories?projectId=<id>`
- **THEN** the orchestrator returns the 50 most recent memories for that agent+project, ordered by `createdAt` descending

#### Scenario: Create memory
- **WHEN** a client sends `POST /api/agents/:agentName/memories` with `{ projectId, content }`
- **THEN** the orchestrator creates the memory with `source: "manual"` and returns it with a 201 status

#### Scenario: Delete memory
- **WHEN** a client sends `DELETE /api/agents/:agentName/memories/:id`
- **THEN** the orchestrator deletes the memory item and returns a 204 status

#### Scenario: Delete all memories for agent+project
- **WHEN** a client sends `DELETE /api/agents/:agentName/memories?projectId=<id>`
- **THEN** the orchestrator deletes all memory items for that agent+project and returns a 204 status
