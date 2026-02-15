## ADDED Requirements

### Requirement: Bulk sync Linear issues to project features
The system SHALL provide an orchestrator endpoint that fetches all Linear issues matching the project's team and label filter, then upserts them as features in DynamoDB.

#### Scenario: User triggers sync for a connected project
- **WHEN** a user clicks "Sync from Linear" on the Tickets tab of a project with a valid Linear connection
- **THEN** the system calls `POST /api/projects/:projectId/linear/sync`, which fetches all issues from the project's Linear team with the "omakase" label, creates new features for untracked issues, and updates existing features with the latest title, description, priority, and cached Linear metadata

#### Scenario: Sync updates cached Linear metadata
- **WHEN** a bulk sync runs
- **THEN** each feature record is updated with `linearStateName` (e.g., "Todo", "In Progress"), `linearLabels` (array of label names), and `linearAssigneeName` (display name or null)

#### Scenario: Sync is idempotent
- **WHEN** a sync runs and a Linear issue already exists as a feature (matched by `linearIssueId`)
- **THEN** the feature is updated with the latest data rather than duplicated

#### Scenario: Sync handles pagination
- **WHEN** the project's Linear team has more than 50 matching issues
- **THEN** the sync paginates through all pages using the `after` cursor until all issues are fetched

#### Scenario: Sync fails gracefully on expired token
- **WHEN** the project's Linear access token has expired or been revoked
- **THEN** the sync returns a 401 error with a message indicating the user needs to reconnect Linear

### Requirement: Sync cooldown
The system SHALL prevent rapid repeated syncs by disabling the sync button for 30 seconds after a successful sync.

#### Scenario: Sync button disabled after trigger
- **WHEN** a sync completes successfully
- **THEN** the "Sync from Linear" button is disabled for 30 seconds with a countdown indicator

### Requirement: Linear metadata display in tickets table
The system SHALL display cached Linear metadata (issue state, labels) alongside feature data in the tickets table.

#### Scenario: Tickets table shows Linear state
- **WHEN** the tickets table renders a feature with a linked Linear issue
- **THEN** the Linear issue state name (e.g., "Todo", "In Progress", "Done") is displayed in a dedicated column

#### Scenario: Filter by Linear state
- **WHEN** a user selects a Linear state from the filter dropdown
- **THEN** the table shows only features whose `linearStateName` matches the selected state
