## 1. Data Layer — Extend Feature Schema & DynamoDB

- [x] 1.1 Add `linearStateName: string`, `linearLabels: string[]`, and `linearAssigneeName: string` optional fields to the `Feature` type in `packages/db/src/schema/features.ts`
- [x] 1.2 Update `createFromLinear` in `packages/dynamodb/src/features.ts` to accept and store the new cached Linear metadata fields
- [x] 1.3 Update `updateFromLinear` in `packages/dynamodb/src/features.ts` to accept and update the cached Linear metadata fields
- [x] 1.4 Add `bulkSyncFromLinear` function in `packages/dynamodb/src/features.ts` — accepts an array of Linear issues, upserts each (create if new linearIssueId, update if existing)
- [x] 1.5 Export the new function from `packages/dynamodb/src/index.ts`

## 2. Shared — Linear Bulk Fetch

- [x] 2.1 Add `fetchAllTeamIssues(params: { linearAccessToken: string, teamId: string, label?: string })` to `packages/shared/src/linear/workspace.ts` — paginates through all issues matching the team and optional label filter, returns full issue data including state, labels, and assignee

## 3. Orchestrator — Sync & Assignment Endpoints

- [x] 3.1 Add `POST /api/projects/:projectId/linear/sync` endpoint in `apps/orchestrator/src/index.ts` — fetches project's Linear token + teamId, calls `fetchAllTeamIssues`, then calls `bulkSyncFromLinear` to upsert all issues. Returns `{ synced: number, created: number, updated: number }`
- [x] 3.2 Add `POST /api/features/:featureId/assign` endpoint in `apps/orchestrator/src/index.ts` — accepts `{ agentName: string }`, validates feature is pending, claims it, and triggers an `AgentPipeline` for the feature with the project's configuration. Returns `{ success: true, runId: string }`
- [x] 3.3 Handle concurrency limit check in the assign endpoint — return 429 if project's active pipeline count >= maxConcurrency

## 4. Webhook — Cache Metadata on Ingest

- [x] 4.1 Update `handleIssueCreated` in `apps/web/src/lib/linear/ticket-sync.ts` to include `linearStateName`, `linearLabels`, and `linearAssigneeName` when creating features from webhook events
- [x] 4.2 Update `handleIssueUpdated` in `apps/web/src/lib/linear/ticket-sync.ts` to update cached metadata fields when issue state, labels, or assignee changes

## 5. Frontend — Hooks & API

- [x] 5.1 Add `useSyncLinear(projectId)` hook in `apps/web/src/hooks/use-api.ts` — calls `POST /api/projects/:projectId/linear/sync`, returns mutation state (loading, error, data)
- [x] 5.2 Add `useAssignFeature()` hook in `apps/web/src/hooks/use-api.ts` — calls `POST /api/features/:featureId/assign` with `{ agentName }`, returns mutation state

## 6. Frontend — Tickets Table Enhancements

- [x] 6.1 Add a "Linear State" column to `TicketsTable` that displays `feature.linearStateName` with a colored badge (matching Linear's state palette)
- [x] 6.2 Add a Linear state filter dropdown alongside the existing Omakase status filter — options are dynamically derived from the unique `linearStateName` values present in the feature list
- [x] 6.3 Add a "Sync from Linear" button to the table toolbar that calls `useSyncLinear`, shows loading state, and triggers `onRefetch` on completion. Disable for 30s after successful sync with countdown text
- [x] 6.4 Add an "Assign" action button/menu on each feature row where `status === "pending"` — clicking opens a popover with the 4 agents (Miso/Nori/Koji/Toro) showing name, role, and agent color accent
- [x] 6.5 Wire agent selection to `useAssignFeature` hook — on success show a toast confirmation and refetch features; on error show a toast with the error message

## 7. Frontend — Project Page Wiring

- [x] 7.1 Pass the new `linearStateName` filtering props through the project detail page to `TicketsTable`
- [x] 7.2 Ensure `useProjectFeatures` polling picks up the new cached metadata fields without additional work (they're already part of the Feature response)
