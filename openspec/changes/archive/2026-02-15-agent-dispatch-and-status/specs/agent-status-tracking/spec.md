## ADDED Requirements

### Requirement: Agent status API endpoint
The orchestrator SHALL expose a `GET /api/agents/status` endpoint that returns the current status of all agents (miso, nori, koji, toro). Each agent's status SHALL be one of: `idle`, `working`, or `errored`.

#### Scenario: All agents idle
- **WHEN** no active work sessions exist and no recent runs failed
- **THEN** the endpoint returns `{ agents: { miso: { status: "idle" }, nori: { status: "idle" }, koji: { status: "idle" }, toro: { status: "idle" } } }`

#### Scenario: Agent is working
- **WHEN** Nori has an active work session
- **THEN** the endpoint returns Nori's status as `{ status: "working", runId: "run-xyz", threadId: "t-123", projectId: "proj-1", startedAt: "2026-02-15T10:00:00Z", currentTask: "Implement login page" }`

#### Scenario: Agent errored on last run
- **WHEN** Koji's most recent run has status "failed" and no active session exists
- **THEN** the endpoint returns Koji's status as `{ status: "errored", lastError: "Process exited with code 1", lastRunId: "run-abc", erroredAt: "2026-02-15T09:30:00Z" }`

### Requirement: Single-agent status endpoint
The orchestrator SHALL expose a `GET /api/agents/:agentName/status` endpoint that returns the status of a specific agent.

#### Scenario: Query specific agent status
- **WHEN** a client requests `GET /api/agents/nori/status`
- **THEN** the endpoint returns only Nori's status object

#### Scenario: Invalid agent name
- **WHEN** a client requests `GET /api/agents/invalid/status`
- **THEN** the endpoint returns a 404 error

### Requirement: Status derived from in-memory session state
Agent status SHALL be derived from the orchestrator's `WorkSessionManager` in-memory state as the primary source, supplemented by the most recent `AgentRun` record for error detection.

#### Scenario: Status reflects active subprocess
- **WHEN** a Claude Code subprocess is running for an agent
- **THEN** the agent's status is "working" regardless of the AgentRun record status

#### Scenario: Status reflects subprocess termination
- **WHEN** a Claude Code subprocess terminates (success or timeout)
- **THEN** the agent's status transitions to "idle" or "errored" based on the run's completion status

### Requirement: Frontend status polling hook
The system SHALL provide a `useAgentStatus` React hook that polls the agent status endpoint and exposes status for all agents or a specific agent.

#### Scenario: Poll all agent statuses
- **WHEN** `useAgentStatus()` is called without arguments
- **THEN** it returns `{ agents: Record<AgentName, AgentStatus>, isLoading, error }` and polls every 5 seconds

#### Scenario: Poll single agent status
- **WHEN** `useAgentStatus("nori")` is called with an agent name
- **THEN** it returns `{ status: AgentStatus, isLoading, error }` for only that agent and polls every 5 seconds

#### Scenario: Stale data handling
- **WHEN** the status endpoint is unreachable
- **THEN** the hook returns the last known status with `isStale: true` and continues polling

### Requirement: Agent status indicators in sidebar
The app sidebar SHALL display a status indicator (dot or badge) next to each agent's name reflecting their current status.

#### Scenario: Idle agent in sidebar
- **WHEN** an agent's status is "idle"
- **THEN** no special indicator is shown (or a subtle neutral dot)

#### Scenario: Working agent in sidebar
- **WHEN** an agent's status is "working"
- **THEN** a pulsing indicator in the agent's color is shown next to their name

#### Scenario: Errored agent in sidebar
- **WHEN** an agent's status is "errored"
- **THEN** a red indicator is shown next to their name

### Requirement: Agent status on profile page
Each agent's profile page SHALL display their current status prominently, including details of what they're working on if active.

#### Scenario: Working agent profile
- **WHEN** an agent's profile page is viewed and the agent is working
- **THEN** the page shows a "Currently working" banner with the project name, task description, duration, and a link to the active chat thread

#### Scenario: Idle agent profile
- **WHEN** an agent's profile page is viewed and the agent is idle
- **THEN** the page shows the agent as available with a "Start Work" dispatch button
