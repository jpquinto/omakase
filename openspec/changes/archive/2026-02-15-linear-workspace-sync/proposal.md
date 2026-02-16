## Why

Linear OAuth tokens are already workspace-scoped, yet Omakase stores them per-project — requiring users to re-authorize for every project and duplicating the same token across rows. Projects are manually created in Omakase and then manually linked to a Linear team, with no structural relationship to Linear projects. This makes setup tedious and the data model inconsistent. Reworking to a single workspace-level connection with 1:1 project mapping eliminates redundant auth, simplifies onboarding, and enables automatic project discovery from Linear.

## What Changes

- **BREAKING**: Linear OAuth tokens move from the `projects` table to a new `workspaces` table. The `linearAccessToken` and `linearTeamId` fields are removed from `Project`.
- **BREAKING**: Omakase projects become 1:1 mirrors of Linear projects. Each project gets a `linearProjectId` (required for Linear-connected projects) and syncs its name/description from Linear.
- A new `Workspace` entity stores the Linear OAuth token, organization ID, and default team. One workspace per Linear organization.
- The OAuth flow becomes workspace-scoped: connect once, and all Linear projects become available as Omakase projects.
- A new "project sync" mechanism auto-creates/updates Omakase projects from Linear projects.
- The webhook handler resolves projects by `linearProjectId` instead of `linearTeamId`.
- The `tickets` table and repository are removed (dead code — never called in any active code path).
- The feature watcher and pipeline resolve the Linear access token from the workspace, not the project.
- Read-only Linear API routes (`/api/linear/teams`, `/api/linear/issues`, `/api/linear/projects`) resolve tokens from the workspace.

## Capabilities

### New Capabilities
- `workspace-linear-connection`: Workspace-level Linear OAuth connection that stores a single token per organization. Includes the workspace entity, DynamoDB table, OAuth flow rework, and token resolution.
- `linear-project-sync`: Automatic discovery and sync of Linear projects to Omakase projects. Includes project creation, name/description sync, and the 1:1 mapping model.

### Modified Capabilities
- `linear-integration`: Webhook handler changes from team-based to project-based routing. Feature creation uses workspace token instead of project token.
- `linear-orchestrator-sync`: Pipeline and feature watcher resolve Linear access token from workspace instead of project. PipelineConfig source changes.
- `linear-workspace-browser`: Token resolution changes from project-level to workspace-level.
- `linear-ticket-sync`: Bulk sync scoped to Linear project ID instead of team ID. Token comes from workspace.

## Impact

- **Database**: New `workspaces` DynamoDB table. `projects` table loses `linearAccessToken` and `linearTeamId` fields, keeps `linearProjectId`/`linearProjectName`. `tickets` table removed. New GSI on projects for `linearProjectId` lookup.
- **Orchestrator**: All Linear token endpoints change. New workspace CRUD endpoints. Feature watcher token resolution changes. Pipeline config source changes.
- **Frontend**: OAuth flow no longer requires project context. New workspace settings UI for managing the Linear connection. Project creation can be driven by Linear project discovery.
- **Shared package**: No changes (all functions accept token as parameter).
- **Webhook handler**: Project resolution changes from `getByLinearTeamId` scan to `getByLinearProjectId` GSI query.
- **Security**: Reduces token copies from N (one per project) to 1 (one per workspace). Token still stored in DynamoDB (plaintext) — no change to storage security model.
