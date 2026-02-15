## ADDED Requirements

### Requirement: Assign feature to a specific agent
The system SHALL allow users to select a pending feature and assign it to a specific agent (Miso, Nori, Koji, or Toro), immediately triggering the agent pipeline for that feature.

#### Scenario: User assigns a pending feature to an agent
- **WHEN** a user selects a feature with status "pending" and clicks "Assign to Agent", then chooses an agent (e.g., Nori)
- **THEN** the system calls `POST /api/features/:featureId/assign` with `{ agentName: "nori" }`, the feature is claimed (status transitions to "in_progress"), and the full pipeline (architect → coder → reviewer → tester) begins execution

#### Scenario: Assignment rejected for non-pending feature
- **WHEN** a user attempts to assign a feature that is not in "pending" status
- **THEN** the API returns HTTP 409 with an error message explaining the feature must be pending to be assigned

#### Scenario: Assignment rejected when concurrency limit reached
- **WHEN** a user attempts to assign a feature but the project's concurrency limit is already reached
- **THEN** the API returns HTTP 429 with an error message indicating the concurrency limit

#### Scenario: Concurrent assignment conflict
- **WHEN** a user assigns a feature at the same moment the FeatureWatcher auto-claims it
- **THEN** only one claim succeeds (DynamoDB conditional write ensures atomicity), and the other receives a 409 error

### Requirement: Agent assignment UI
The system SHALL provide an agent assignment interface in the tickets table for selecting and assigning features to agents.

#### Scenario: Assign button shown for pending features
- **WHEN** the tickets table renders a feature with status "pending"
- **THEN** an "Assign" button or action menu is visible for that feature

#### Scenario: Agent selection dropdown
- **WHEN** a user clicks the assign action on a pending feature
- **THEN** a dropdown or popover shows the four agents (Miso, Nori, Koji, Toro) with their role labels (Architect, Coder, Reviewer, Tester) and color accents

#### Scenario: Assignment confirmation feedback
- **WHEN** a user selects an agent and the assignment succeeds
- **THEN** the feature's status updates to "in_progress" in the table, and a toast notification confirms the assignment

#### Scenario: Assignment error feedback
- **WHEN** an assignment fails (409 conflict, 429 concurrency limit, or network error)
- **THEN** a toast notification shows the error message
