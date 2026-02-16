## MODIFIED Requirements

### Requirement: Status includes queue depth
The agent status endpoint SHALL include queue depth and next queued job summary alongside the existing status fields.

#### Scenario: Agent working with queued jobs
- **WHEN** a client requests `GET /api/agents/status` and Nori is working with 2 jobs queued
- **THEN** Nori's status includes `{ status: "working", ..., queueDepth: 2, nextJob: { jobId: "...", prompt: "...", queuedAt: "..." } }`

#### Scenario: Agent idle with no queue
- **WHEN** a client requests `GET /api/agents/status` and Miso is idle with no queue
- **THEN** Miso's status includes `{ status: "idle", queueDepth: 0 }`

### Requirement: Status hook exposes queue depth
The `useAgentStatus` React hook SHALL expose `queueDepth` as part of each agent's status object.

#### Scenario: Frontend reads queue depth
- **WHEN** a component accesses `agents.nori.queueDepth`
- **THEN** it receives the current number of queued jobs for Nori (0 if none)
