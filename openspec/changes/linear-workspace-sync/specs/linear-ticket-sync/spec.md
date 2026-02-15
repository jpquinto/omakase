## MODIFIED Requirements

### Requirement: Bulk sync Linear issues to project features
The system SHALL provide an orchestrator endpoint that fetches all Linear issues for a specific Linear project (via `linearProjectId`), then upserts them as features in DynamoDB. The access token SHALL be resolved from the workspace.

#### Scenario: User triggers sync for a connected project
- **WHEN** a user clicks "Sync from Linear" on a project with a valid `linearProjectId` and `workspaceId`
- **THEN** the system SHALL fetch the workspace's access token, call `fetchAllTeamIssues` scoped to the project's `linearProjectId`, create new features for untracked issues, and update existing features with the latest title, description, priority, and cached Linear metadata

#### Scenario: Sync scoped to Linear project
- **WHEN** a bulk sync runs for a project
- **THEN** it SHALL only fetch issues belonging to that project's `linearProjectId` (not all team issues with the "omakase" label)

#### Scenario: Sync resolves token from workspace
- **WHEN** the sync endpoint needs to call the Linear API
- **THEN** it SHALL fetch the access token from the project's workspace record, not from the project record

#### Scenario: Sync is idempotent
- **WHEN** a sync runs and a Linear issue already exists as a feature (matched by `linearIssueId`)
- **THEN** the feature is updated with the latest data rather than duplicated

#### Scenario: Sync handles pagination
- **WHEN** the Linear project has more than 50 issues
- **THEN** the sync SHALL paginate through all pages using the `after` cursor

#### Scenario: Sync fails gracefully on expired token
- **WHEN** the workspace's Linear access token has expired or been revoked
- **THEN** the sync SHALL return a 401 error with a message indicating the user needs to reconnect Linear in workspace settings
