## ADDED Requirements

### Requirement: Workspace entity stores Linear OAuth credentials
The system SHALL maintain a `workspaces` DynamoDB table that stores a single Linear OAuth access token per Linear organization, along with organization metadata.

#### Scenario: Workspace record created after OAuth
- **WHEN** a user completes the Linear OAuth flow for the first time
- **THEN** a workspace record SHALL be created in DynamoDB with `linearAccessToken`, `linearOrganizationId`, `linearOrganizationName`, `linearDefaultTeamId`, and `ownerId`

#### Scenario: Workspace record updated on re-authorization
- **WHEN** a user re-runs the Linear OAuth flow and a workspace already exists for that `linearOrganizationId`
- **THEN** the existing workspace record SHALL be updated with the new `linearAccessToken` (not duplicated)

#### Scenario: Workspace lookup by organization ID
- **WHEN** the system needs to find a workspace for a given Linear organization
- **THEN** it SHALL query the `by_linear_org` GSI on the workspaces table using `linearOrganizationId`

### Requirement: OAuth flow is workspace-scoped
The Linear OAuth initiation route SHALL NOT require a `projectId` parameter. The connection is made at the workspace level, not per-project.

#### Scenario: User initiates Linear connection
- **WHEN** a user clicks "Connect Linear" in workspace settings
- **THEN** the system SHALL redirect to Linear's OAuth authorize endpoint with scopes `read,write` and store a CSRF state token in an HTTP-only cookie

#### Scenario: OAuth callback stores token on workspace
- **WHEN** Linear redirects back with an authorization code
- **THEN** the system SHALL exchange the code for an access token, fetch the organization and team info via GraphQL, and store the token on the workspace record (creating the workspace if it doesn't exist)

#### Scenario: OAuth callback redirects to workspace settings
- **WHEN** the OAuth callback completes successfully
- **THEN** the user SHALL be redirected to the workspace or projects page with a success indicator

### Requirement: Token resolution from workspace
All code paths that need a Linear access token SHALL resolve it by looking up the workspace record, not the project record.

#### Scenario: Orchestrator resolves token for pipeline
- **WHEN** the feature watcher launches a pipeline for a feature in a project with a `workspaceId`
- **THEN** it SHALL fetch the workspace record and pass `workspace.linearAccessToken` in the `PipelineConfig`

#### Scenario: Frontend API routes resolve token
- **WHEN** a frontend API route (e.g., `/api/linear/issues`) needs to call the Linear API
- **THEN** it SHALL resolve the token from the project's associated workspace, not from the project record directly

#### Scenario: Project has no workspace
- **WHEN** a project has no `workspaceId` (not connected to Linear)
- **THEN** all Linear operations SHALL be skipped silently

### Requirement: Workspace disconnect
The system SHALL allow disconnecting a workspace from Linear, which removes the stored token.

#### Scenario: User disconnects Linear
- **WHEN** a user clicks "Disconnect Linear" in workspace settings
- **THEN** the workspace's `linearAccessToken` SHALL be cleared, and all projects in the workspace SHALL lose Linear API access
