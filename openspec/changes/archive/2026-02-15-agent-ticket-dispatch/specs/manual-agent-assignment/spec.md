## MODIFIED Requirements

### Requirement: Assign feature to a specific agent
The system SHALL allow users to select a pending feature and assign it to a specific agent (Miso, Nori, Koji, or Toro), immediately triggering the agent pipeline for that feature. The system SHALL reject assignment if the target agent already has an active work session.

#### Scenario: User assigns a pending feature to an idle agent
- **WHEN** a user selects a feature with status "pending" and clicks "Assign to Agent", then chooses an idle agent (e.g., Nori)
- **THEN** the system calls `POST /api/features/:featureId/assign` with `{ agentName: "nori" }`, the feature is claimed (status transitions to "in_progress"), and the full pipeline (architect → coder → reviewer → tester) begins execution

#### Scenario: Assignment rejected for non-pending feature
- **WHEN** a user attempts to assign a feature that is not in "pending" status
- **THEN** the API returns HTTP 409 with an error message explaining the feature must be pending to be assigned

#### Scenario: Assignment rejected when concurrency limit reached
- **WHEN** a user attempts to assign a feature but the project's concurrency limit is already reached
- **THEN** the API returns HTTP 429 with an error message indicating the concurrency limit

#### Scenario: Assignment rejected when agent is busy
- **WHEN** a user attempts to assign a feature to an agent that already has an active work session
- **THEN** the API returns HTTP 409 with an error message indicating the agent is currently busy and the name of the task they are working on

#### Scenario: Concurrent assignment conflict
- **WHEN** a user assigns a feature at the same moment the FeatureWatcher auto-claims it
- **THEN** only one claim succeeds (DynamoDB conditional write ensures atomicity), and the other receives a 409 error
