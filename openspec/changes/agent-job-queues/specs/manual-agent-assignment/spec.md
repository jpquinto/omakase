## MODIFIED Requirements

### Requirement: Assignment to busy agent enqueues instead of rejecting
The feature assignment API SHALL enqueue the feature for the target agent when the agent is busy, instead of returning HTTP 409.

#### Scenario: Assign feature to busy agent
- **WHEN** a user assigns a feature via `POST /api/features/:featureId/assign` with `{ agentName: "nori" }` and Nori is busy
- **THEN** the API enqueues the feature for Nori and returns HTTP 202 with `{ queued: true, position: N, jobId: "..." }`

#### Scenario: Assign feature to idle agent
- **WHEN** a user assigns a feature to an idle agent
- **THEN** the behavior is unchanged — the pipeline starts immediately with HTTP 200

### Requirement: Concurrency limit queues instead of blocking
When the project concurrency limit is reached, feature assignment SHALL enqueue instead of returning HTTP 429.

#### Scenario: Concurrency limit reached
- **WHEN** a user assigns a feature but the project's concurrency limit is at capacity
- **THEN** the API enqueues the feature and returns HTTP 202 with queue position, instead of HTTP 429
