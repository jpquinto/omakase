## ADDED Requirements

### Requirement: Queue data persistence
The system SHALL store agent job queues in a DynamoDB table `omakase-agent-queues` with `agentName` as partition key and a position-based sort key for ordered retrieval.

#### Scenario: Job enqueued for idle agent
- **WHEN** a job is enqueued for an agent with no current work session
- **THEN** the job is stored in DynamoDB and immediately dequeued for processing (queue acts as pass-through)

#### Scenario: Job enqueued for busy agent
- **WHEN** a job is enqueued for an agent with an active work session
- **THEN** the job is stored with status "queued" and assigned the next position in the queue, and the enqueue response includes the queue position

#### Scenario: Queue survives orchestrator restart
- **WHEN** the orchestrator process restarts
- **THEN** all queued jobs are preserved in DynamoDB and processing resumes from the front of each queue

### Requirement: Queue processing lifecycle
The system SHALL automatically process the next queued job when an agent completes its current work session.

#### Scenario: Agent completes work and queue has jobs
- **WHEN** an agent's work session completes (success or failure) and there are queued jobs
- **THEN** the system dequeues the next job (lowest position), creates a new work session, and begins processing

#### Scenario: Agent completes work and queue is empty
- **WHEN** an agent's work session completes and the queue is empty
- **THEN** the agent transitions to "idle" status with no further action

#### Scenario: Queued job fails to start
- **WHEN** the system dequeues a job but fails to start a work session for it
- **THEN** the job is marked as "failed" with the error message, and the system attempts to dequeue the next job

### Requirement: Queue management API
The system SHALL expose REST endpoints for managing agent queues.

#### Scenario: List queue for an agent
- **WHEN** a client sends `GET /api/agents/:agentName/queue`
- **THEN** the endpoint returns an ordered array of queued jobs with their position, prompt summary, project, and queued timestamp

#### Scenario: Remove a queued job
- **WHEN** a client sends `DELETE /api/agents/:agentName/queue/:jobId`
- **THEN** the job is removed from the queue and remaining jobs maintain their relative order

#### Scenario: Reorder a queued job
- **WHEN** a client sends `PATCH /api/agents/:agentName/queue/:jobId` with `{ position: 2 }`
- **THEN** the job moves to position 2 and other jobs shift accordingly

#### Scenario: Get all queue summaries
- **WHEN** a client sends `GET /api/agents/queues`
- **THEN** the endpoint returns each agent's queue depth and next queued job summary

### Requirement: Queue-aware work session creation
The work session creation endpoint SHALL enqueue jobs for busy agents instead of rejecting them.

#### Scenario: Work session requested for busy agent
- **WHEN** a client sends `POST /api/agents/:agentName/work-sessions` and the agent has an active session
- **THEN** the system enqueues the job and returns `{ queued: true, position: N, jobId: "..." }` with HTTP 202

#### Scenario: Work session requested for idle agent
- **WHEN** a client sends `POST /api/agents/:agentName/work-sessions` and the agent is idle
- **THEN** the system starts the work session immediately as before (no queue involvement)
