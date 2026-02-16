## Context

Omakase currently stores Linear OAuth tokens per-project in DynamoDB. Users must run the OAuth flow for each project, and the token is duplicated across rows despite being workspace-scoped by nature. Projects in Omakase are manually created and then manually linked to a Linear team. There is no structural mapping between Omakase projects and Linear projects.

The `tickets` table and its repository are dead code — exported but never called by any active code path. The `getByLinearTeamId` lookup on the projects table is a full table scan (no GSI).

The proposed rework centralizes the Linear connection at a workspace level and maps Omakase projects 1:1 to Linear projects.

## Goals / Non-Goals

**Goals:**
- Single Linear OAuth connection per workspace (connect once, done)
- Omakase projects mirror Linear projects 1:1 — auto-created from Linear
- Webhook handler routes by `linearProjectId` (GSI) instead of `linearTeamId` (scan)
- Remove dead `tickets` table code
- Simplify token resolution across orchestrator and frontend

**Non-Goals:**
- Multi-workspace support (one Omakase instance = one Linear workspace for now)
- Moving the access token to Secrets Manager (keep current plaintext DynamoDB storage)
- Changing the shared Linear GraphQL client API (it accepts tokens as params, stays the same)
- UI redesign of the project pages (functional changes only, minimal UI additions)
- Reworking the agent pipeline itself

## Decisions

### 1. New `workspaces` DynamoDB table for Linear credentials

Store the Linear OAuth token and organization metadata in a dedicated `workspaces` table rather than on individual project records.

**Schema:**
```
workspaces table
  id: string (ULID)
  ownerId: string (Auth0 user ID)
  linearAccessToken: string
  linearOrganizationId: string (from webhook payload / OAuth)
  linearOrganizationName: string
  linearDefaultTeamId: string (first team captured during OAuth)
  createdAt: string
  updatedAt: string
```

**GSI:** `by_linear_org` with partition key `linearOrganizationId` for webhook lookups.

**Why not store on User?** Workspaces are shared across team members. A User-level token would not support multi-user access to the same Linear workspace.

**Why not reuse the projects table?** The token is organization-scoped, not project-scoped. Storing it on one "primary" project would be arbitrary.

### 2. Projects gain `linearProjectId` as the primary Linear mapping key

Each project gets a `linearProjectId` (Linear project UUID) that establishes the 1:1 relationship. The `linearTeamId` field is removed from projects — team context comes from the workspace.

**Project schema changes:**
- Remove: `linearAccessToken`, `linearTeamId`
- Keep: `linearProjectId`, `linearProjectName`
- Add: `workspaceId` (FK to workspaces table)

**New GSI:** `by_linear_project` with partition key `linearProjectId` for webhook routing.

**Why `linearProjectId` over `linearTeamId`?** The user wants 1:1 project mapping. Linear projects are the structural equivalent. Teams are organizational groupings that can contain many projects.

### 3. OAuth flow becomes workspace-scoped

The OAuth initiation route drops the `projectId` requirement. Instead:
1. User clicks "Connect Linear" in workspace settings (not project settings)
2. OAuth flow runs normally (redirect → authorize → callback)
3. Callback stores the token on the workspace record
4. After successful connection, fetch Linear teams and projects for discovery

**State cookie changes:** Replace `linear_oauth_project_id` with `linear_oauth_workspace_id` (or create workspace on callback if first connection).

### 4. Project sync from Linear projects

After workspace connection, a sync mechanism discovers Linear projects and creates/updates corresponding Omakase projects:
1. Call `listLinearProjects()` for each team in the workspace
2. For each Linear project: find or create an Omakase project with matching `linearProjectId`
3. Sync name, description from Linear

This runs on-demand (user clicks "Sync Projects") and optionally after OAuth callback.

**Auto-create vs manual mapping:** Auto-create is simpler and matches the user's intent of "connect once, everything syncs." Users can archive projects they don't want in Omakase.

### 5. Webhook routes by `linearProjectId` instead of `linearTeamId`

Current flow: webhook receives issue event → extract `team.id` → scan projects table → find project.

New flow: webhook receives issue event → extract `project.id` from the issue → GSI query on `by_linear_project` → find project.

Issues without a Linear project are matched by team: look up workspace by `organizationId` from the webhook payload, then find projects in that workspace.

**Fallback:** If an issue has no `projectId`, skip it (unscoped issues don't map to an Omakase project in the 1:1 model).

### 6. Token resolution via workspace lookup

All code paths that currently read `project.linearAccessToken` change to:
1. Read project's `workspaceId`
2. Fetch workspace record
3. Use `workspace.linearAccessToken`

This applies to: feature watcher, pipeline config, read-only Linear API routes, bulk sync endpoint.

**Caching:** The workspace token is stable (rarely changes). Add a simple in-memory TTL cache in the orchestrator to avoid repeated DynamoDB reads for the same workspace within a polling cycle.

### 7. Remove tickets table

The `tickets` table, schema, and repository are dead code. Remove:
- `packages/db/src/schema/tickets.ts`
- `packages/dynamodb/src/tickets.ts`
- Exports from package index files
- The DynamoDB table itself (or leave empty — removing infra is a separate concern)

## Risks / Trade-offs

**[Breaking change] Projects lose `linearAccessToken`** → Migration required. Existing projects need a workspace created and their tokens moved. Write a one-time migration script that groups projects by `linearTeamId`, creates a workspace per unique team, moves the token, and sets `workspaceId` on each project.

**[Breaking change] Webhook routing changes** → During migration, webhooks might fail to route if projects haven't been migrated yet. Mitigation: deploy the migration before the code change, or support both routing paths temporarily.

**[Linear projects are optional]** → Not all Linear issues belong to a project. Issues without a project won't have a 1:1 mapping. Mitigation: fall back to workspace-level handling, or require that tracked issues belong to a Linear project.

**[Token revocation affects all projects]** → With a single workspace token, if revoked, all projects lose Linear access. This is already true (same token was duplicated), just more explicit now.

**[No multi-workspace support]** → If users need to connect multiple Linear workspaces, this design doesn't support it. Acceptable for now — revisit if needed.

## Migration Plan

1. Deploy new `workspaces` table to DynamoDB (CDK or manual)
2. Run migration script: group existing projects by `linearTeamId`, create workspace per group, move token, set `workspaceId`
3. Deploy updated code (new OAuth flow, workspace-based token resolution, updated webhook handler)
4. Verify webhooks route correctly
5. Remove old `linearAccessToken` field from project records (cleanup)

**Rollback:** If issues arise, re-deploy old code. The workspace table is additive — old code ignores it. The risk is in removing `linearAccessToken` from projects, so keep it populated during migration (dual-write) until verified.

## Open Questions

- Should unscoped Linear issues (no project) be handled at all, or strictly require project assignment in Linear?
- Should project sync be automatic (on every webhook event) or manual (user-triggered)?
- Should the workspace entity support multiple Linear teams, or assume one primary team?
