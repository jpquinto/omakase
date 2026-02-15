## MODIFIED Requirements

### Requirement: Ticket ingestion from Linear
The system SHALL sync Linear issues (filtered by label or project) into the feature backlog as features, and sync Linear status changes back to Omakase feature statuses.

#### Scenario: New Linear issue creates a feature
- **WHEN** a Linear issue is created with the configured label (e.g., "omakase")
- **THEN** a webhook fires and a corresponding feature is created in DynamoDB with the issue title, description, priority, and Linear issue ID

#### Scenario: Linear issue update syncs to feature
- **WHEN** a Linear issue's title, description, or priority is updated
- **THEN** the corresponding feature in DynamoDB is updated to match

#### Scenario: Linear status change syncs to feature
- **WHEN** a Linear issue's workflow state changes (e.g., moved to "Done" or "In Progress" in Linear)
- **THEN** the corresponding Omakase feature status is updated using reverse status mapping: Linear "Todo"/unstarted → `pending`, Linear "In Progress"/started → `in_progress`, Linear "Done"/completed → `passing`

### Requirement: Dependency mapping from Linear
The system SHALL map Linear issue relations (blocks/blocked-by) to feature dependencies in DynamoDB, with full API support.

#### Scenario: Linear blocking relation creates dependency
- **WHEN** a Linear issue A has a "blocks" relation to issue B, and both are synced as features
- **THEN** feature B has feature A in its dependency list

#### Scenario: Linear blocking relation removed
- **WHEN** a "blocks" relation between two synced Linear issues is removed
- **THEN** the corresponding feature dependency is removed

## ADDED Requirements

### Requirement: Linear connection UI in project settings
The system SHALL display Linear connection status and controls in the project settings tab.

#### Scenario: Project with no Linear connection
- **WHEN** a user views settings for a project without a connected Linear workspace
- **THEN** a "Connect Linear" button is displayed that initiates the OAuth flow

#### Scenario: Project with active Linear connection
- **WHEN** a user views settings for a project with a connected Linear workspace
- **THEN** the connected team name is displayed along with a "Disconnect" button

#### Scenario: User disconnects Linear
- **WHEN** a user clicks "Disconnect" and confirms
- **THEN** the stored Linear access token and team ID are cleared from the project, and Linear sync stops for this project

### Requirement: Linear issue ID index
The system SHALL use a DynamoDB Global Secondary Index for looking up features by Linear issue ID instead of a table scan.

#### Scenario: Feature lookup by Linear issue ID
- **WHEN** the system needs to find a feature by its `linearIssueId`
- **THEN** it queries the `by_linearIssueId` GSI on the features table, returning results in O(1) time instead of scanning the entire table
