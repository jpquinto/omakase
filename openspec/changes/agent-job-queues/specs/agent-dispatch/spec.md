## MODIFIED Requirements

### Requirement: Busy guard becomes queue-add
The `useAgentDispatch` hook SHALL enqueue jobs for busy agents instead of rejecting with a busy error. The dispatch function SHALL return queue position information when the job is queued.

#### Scenario: Dispatch to busy agent enqueues
- **WHEN** a component calls `dispatch({ agentName: "nori", ... })` and Nori is currently working
- **THEN** the dispatch function enqueues the job via `POST /api/agents/nori/queue` and returns `{ queued: true, position: N, jobId: "..." }` without throwing an error

#### Scenario: Dispatch to idle agent starts immediately
- **WHEN** a component calls `dispatch({ agentName: "nori", ... })` and Nori is idle
- **THEN** the dispatch function starts a work session immediately as before, returning `{ runId, threadId, status }`

#### Scenario: Optimistic queue update
- **WHEN** a job is enqueued for a busy agent
- **THEN** the dispatch hook optimistically updates the local queue depth for that agent before the API confirms

### Requirement: Unified dispatch hook return type
The dispatch function SHALL return a union type that distinguishes between immediate start and queued responses.

#### Scenario: Caller checks if job was queued
- **WHEN** the dispatch function returns
- **THEN** the caller can check `result.queued` to determine if the job started immediately (`false`/undefined) or was queued (`true`) and access `result.position` for queue placement
