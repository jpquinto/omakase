## 1. DynamoDB Functions in `packages/dynamodb/`

- [x] 1.1 Add `createFromLinear` function to `packages/dynamodb/src/features.ts` — accepts `{ projectId, name, description, priority, category, linearIssueId, linearIssueUrl }`; checks for duplicate `linearIssueId` via Scan with filter before inserting; generates ULID, sets status "pending", empty dependencies, ISO timestamps; returns the created Feature (or existing one if duplicate)
- [x] 1.2 Add `getByLinearIssueId` function to `packages/dynamodb/src/features.ts` — accepts `{ linearIssueId: string }`; uses ScanCommand with FilterExpression on `linearIssueId`; returns Feature or null
- [x] 1.3 Add `updateFromLinear` function to `packages/dynamodb/src/features.ts` — accepts `{ featureId, name, description, priority }`; uses UpdateCommand to SET name, description, priority, updatedAt on the feature by primary key
- [x] 1.4 Add `getByLinearTeamId` function to `packages/dynamodb/src/projects.ts` — accepts `{ linearTeamId: string }`; uses ScanCommand with FilterExpression on `linearTeamId`; returns Project or null
- [x] 1.5 Export `createFromLinear`, `getByLinearIssueId`, `updateFromLinear` from features and `getByLinearTeamId` from projects in `packages/dynamodb/src/index.ts`

## 2. Linear Modules in Shared Package

- [x] 2.1 Create `packages/shared/src/linear/client.ts` — copy from `apps/web/src/lib/linear/client.ts`
- [x] 2.2 Create `packages/shared/src/linear/status-sync.ts` — copy from `apps/web/src/lib/linear/status-sync.ts`
- [x] 2.3 Create `packages/shared/src/linear/comments.ts` — copy from `apps/web/src/lib/linear/comments.ts`
- [x] 2.4 Create `packages/shared/src/index.ts` — re-export all Linear modules (`export * from "./linear/client.js"`, etc.)
- [x] 2.5 Update `apps/web/src/lib/linear/client.ts`, `status-sync.ts`, and `comments.ts` to re-export from `@omakase/shared` for backward compatibility

## 3. Orchestrator REST API Endpoints

- [x] 3.1 Add `POST /api/features/from-linear` endpoint to `apps/orchestrator/src/index.ts` — parses body, calls `createFromLinear` from `@omakase/dynamodb`, returns created feature
- [x] 3.2 Add `GET /api/features/by-linear-issue/:linearIssueId` endpoint to `apps/orchestrator/src/index.ts` — calls `getByLinearIssueId`, returns feature or 404
- [x] 3.3 Add `PATCH /api/features/:featureId/from-linear` endpoint to `apps/orchestrator/src/index.ts` — parses body, calls `updateFromLinear`, returns success response
- [x] 3.4 Add `POST /api/projects/:projectId/linear-token` endpoint to `apps/orchestrator/src/index.ts` — parses body `{ linearAccessToken, linearTeamId }`, calls `updateProject` from `@omakase/dynamodb`, returns success response
- [x] 3.5 Add `GET /api/projects/by-linear-team/:teamId` endpoint to `apps/orchestrator/src/index.ts` — calls `getByLinearTeamId`, returns project or 404
- [x] 3.6 Add `@omakase/shared` as a dependency in `apps/orchestrator/package.json`
- [x] 3.7 Add `createFromLinear`, `getByLinearIssueId`, `updateFromLinear`, `getByLinearTeamId` to the import from `@omakase/dynamodb` in `apps/orchestrator/src/index.ts`

## 4. Wire Webhook Handlers to Orchestrator API

- [x] 4.1 In `apps/web/src/lib/linear/ticket-sync.ts`, replace TODO in `handleIssueCreated` with actual `apiFetch` calls — resolve projectId by calling `GET /api/projects/by-linear-team/:teamId`, then call `POST /api/features/from-linear` with mapped fields
- [x] 4.2 In `apps/web/src/lib/linear/ticket-sync.ts`, replace TODO in `handleIssueUpdated` with actual `apiFetch` calls — look up feature via `GET /api/features/by-linear-issue/:linearIssueId`, if not found and has trigger label call `handleIssueCreated`, otherwise call `PATCH /api/features/:featureId/from-linear`
- [x] 4.3 Add `import { apiFetch } from "@/lib/api-client"` to `ticket-sync.ts` (if not already imported)

## 5. Complete OAuth Callback

- [x] 5.1 In `apps/web/src/app/api/auth/linear/callback/route.ts`, replace the TODO token storage with an `apiFetch("POST /api/projects/:projectId/linear-token", { body: JSON.stringify({ linearAccessToken, linearTeamId }) })` call — determine the target projectId from the OAuth state parameter

## 6. Orchestrator Linear Sync

- [x] 6.1 Create `apps/orchestrator/src/linear-sync.ts` — a `LinearSyncHook` class that:
  - Takes `{ linearAccessToken?, linearIssueId?, linearIssueUrl?, featureName }` in the constructor
  - Exposes `onPipelineStart()` — calls `syncFeatureStatusToLinear` from `@omakase/shared` with status "in_progress"
  - Exposes `onPipelineSuccess()` — calls `syncFeatureStatusToLinear` with status "passing" + calls `postImplementationComment` with success details
  - Exposes `onPipelineFailure(failedStep, errorMessage)` — calls `syncFeatureStatusToLinear` with status "failing" + calls `postImplementationComment` with failure details
  - All methods are no-ops if `linearAccessToken` or `linearIssueId` is missing
  - All methods catch and log errors without throwing (Linear sync is non-critical)
- [x] 6.2 Update `PipelineConfig` interface in `apps/orchestrator/src/pipeline.ts` to include optional `linearIssueId`, `linearIssueUrl`, and `linearAccessToken` fields
- [x] 6.3 Update `pipeline.ts` `execute()` method to instantiate `LinearSyncHook` and call `onPipelineStart()` at the beginning, `onPipelineSuccess()` or `onPipelineFailure()` at the end
- [x] 6.4 Update `FeatureWatcher`'s internal `Project` interface in `apps/orchestrator/src/feature-watcher.ts` to include `linearAccessToken` and `linearTeamId` fields
- [x] 6.5 Update `FeatureWatcher`'s internal `Feature` interface in `apps/orchestrator/src/feature-watcher.ts` to include `linearIssueId` and `linearIssueUrl` fields
- [x] 6.6 Update `launchPipeline()` in `feature-watcher.ts` to pass `linearIssueId`, `linearIssueUrl`, and `linearAccessToken` to the `PipelineConfig`

## 7. Verification

- [x] 7.1 Verify type-checking passes across all packages: `bun --filter '*' run typecheck`
- [ ] 7.2 Manually test webhook flow: send a mock Linear issue.create webhook payload to `/api/webhooks/linear` and verify a feature is created in DynamoDB via the orchestrator API
