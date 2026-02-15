## 1. Database Schema & Types

- [x] 1.1 Add `Workspace` type to `packages/db/src/schema/` with fields: `id`, `ownerId`, `linearAccessToken`, `linearOrganizationId`, `linearOrganizationName`, `linearDefaultTeamId`, `createdAt`, `updatedAt`
- [x] 1.2 Update `Project` type in `packages/db/src/schema/projects.ts`: remove `linearAccessToken` and `linearTeamId`, add `workspaceId`
- [x] 1.3 Remove `packages/db/src/schema/tickets.ts` and its export from the package index
- [x] 1.4 Update `packages/db/src/index.ts` exports to include `Workspace` and remove `Ticket`

## 2. DynamoDB Repositories

- [x] 2.1 Create `packages/dynamodb/src/workspaces.ts` repository with: `createWorkspace`, `getWorkspace`, `getByLinearOrgId` (GSI query), `updateWorkspace`, `clearLinearConnection`
- [x] 2.2 Update `packages/dynamodb/src/projects.ts`: remove `getByLinearTeamId`, add `getByLinearProjectId` (new GSI query on `by_linear_project`), remove `linearAccessToken`/`linearTeamId` from `updateProject` params
- [x] 2.3 Remove `packages/dynamodb/src/tickets.ts` and its export from the package index
- [x] 2.4 Update `packages/dynamodb/src/index.ts` exports

## 3. Infrastructure (DynamoDB Tables)

- [x] 3.1 Add `workspaces` DynamoDB table definition to CDK stack with GSI `by_linear_org` (partition key: `linearOrganizationId`)
- [x] 3.2 Add GSI `by_linear_project` (partition key: `linearProjectId`) to the projects table in CDK stack

## 4. OAuth Flow Rework

- [x] 4.1 Update `apps/web/src/app/api/auth/linear/route.ts`: remove `projectId` requirement, store workspace context in cookie instead
- [x] 4.2 Update `apps/web/src/app/api/auth/linear/callback/route.ts`: store token on workspace record (create or update), fetch organization info, trigger project sync after connection
- [x] 4.3 Update `apps/web/src/lib/linear/get-project-token.ts`: resolve token from workspace via project's `workspaceId` instead of from project directly

## 5. Orchestrator Endpoints

- [x] 5.1 Add workspace CRUD endpoints: `POST /api/workspaces`, `GET /api/workspaces/:id`, `GET /api/workspaces/by-linear-org/:orgId`, `PATCH /api/workspaces/:id`, `DELETE /api/workspaces/:id/linear-token`
- [x] 5.2 Add project sync endpoint: `POST /api/workspaces/:id/sync-projects` — fetches Linear projects and creates/updates Omakase projects
- [x] 5.3 Update `POST /api/projects/:projectId/linear-token` → remove (replaced by workspace-level token storage)
- [x] 5.4 Update `DELETE /api/projects/:projectId/linear-token` → remove (replaced by workspace disconnect)
- [x] 5.5 Update `GET /api/projects/by-linear-team/:teamId` → replace with `GET /api/projects/by-linear-project/:projectId` using new GSI
- [x] 5.6 Update `POST /api/projects/:projectId/linear/sync` to resolve token from workspace

## 6. Webhook Handler Updates

- [x] 6.1 Update `apps/web/src/lib/linear/ticket-sync.ts` `handleIssueCreated`: resolve project by `linearProjectId` (from issue's `projectId`) instead of `linearTeamId`, skip issues with no Linear project
- [x] 6.2 Update `apps/web/src/lib/linear/ticket-sync.ts` `handleIssueUpdated`: use same project resolution logic
- [x] 6.3 Update webhook route to use workspace `organizationId` from payload for any fallback routing

## 7. Orchestrator Pipeline Token Resolution

- [x] 7.1 Update `apps/orchestrator/src/feature-watcher.ts`: resolve `linearAccessToken` from workspace record instead of project record when building `PipelineConfig`
- [x] 7.2 Update `apps/orchestrator/src/pipeline.ts` `PipelineConfig` interface comments to note token comes from workspace

## 8. Frontend API Route Updates

- [x] 8.1 Update `apps/web/src/app/api/linear/teams/route.ts` to resolve token from workspace
- [x] 8.2 Update `apps/web/src/app/api/linear/issues/route.ts` to resolve token from workspace
- [x] 8.3 Update `apps/web/src/app/api/linear/projects/route.ts` to resolve token from workspace

## 9. Frontend Hook & UI Updates

- [x] 9.1 Update `apps/web/src/hooks/use-api.ts`: replace `useDisconnectLinear` and `useSyncLinear` to use workspace endpoints
- [x] 9.2 Move "Connect Linear" button from project settings to workspace-level settings (or a global settings area)
- [x] 9.3 Add "Sync Projects" UI action that calls the project sync endpoint after Linear connection
