## ADDED Requirements

### Requirement: Linear OAuth connection
The system SHALL allow users to connect their Linear workspace via OAuth, storing the access token securely in Convex.

#### Scenario: User connects Linear workspace
- **WHEN** a user clicks "Connect Linear" and completes OAuth
- **THEN** the Linear access token is stored for their team and Linear teams/projects are synced

#### Scenario: User disconnects Linear
- **WHEN** a user clicks "Disconnect Linear"
- **THEN** the stored token is deleted and Linear sync stops

### Requirement: Ticket ingestion from Linear
The system SHALL sync Linear issues (filtered by label or project) into the feature backlog as features in Convex.

#### Scenario: New Linear issue creates a feature
- **WHEN** a Linear issue is created with the configured label (e.g., "omakase")
- **THEN** a webhook fires and a corresponding feature is created in Convex with the issue title, description, priority, and Linear issue ID

#### Scenario: Linear issue update syncs to feature
- **WHEN** a Linear issue's title, description, or priority is updated
- **THEN** the corresponding feature in Convex is updated to match

### Requirement: Bidirectional status sync
The system SHALL update Linear issue status when agent work progresses, and sync Linear status changes back to features.

#### Scenario: Agent starts working on feature
- **WHEN** an agent claims a feature linked to a Linear issue
- **THEN** the Linear issue status is updated to "In Progress"

#### Scenario: Agent completes feature
- **WHEN** an agent marks a feature as "passing"
- **THEN** the Linear issue status is updated to "Done" and a comment is posted with implementation details

#### Scenario: Agent fails on feature
- **WHEN** an agent marks a feature as "failing"
- **THEN** the Linear issue status is updated to "In Review" and a comment is posted with the failure details

### Requirement: Linear webhook receiver
The system SHALL expose a Next.js API route (`/api/webhooks/linear`) that receives and validates Linear webhook events.

#### Scenario: Valid webhook received
- **WHEN** Linear sends a webhook event with valid signature
- **THEN** the event is processed and the corresponding Convex mutation is called

#### Scenario: Invalid webhook rejected
- **WHEN** a request arrives at the webhook endpoint without a valid Linear signature
- **THEN** the request is rejected with HTTP 401

### Requirement: Dependency mapping from Linear
The system SHALL map Linear issue relations (blocks/blocked-by) to feature dependencies in Convex.

#### Scenario: Linear blocking relation creates dependency
- **WHEN** a Linear issue A has a "blocks" relation to issue B, and both are synced as features
- **THEN** feature B has feature A in its dependency list
