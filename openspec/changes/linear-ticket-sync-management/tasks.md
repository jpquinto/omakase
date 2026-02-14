## 1. Database & Infrastructure

- [x] 1.1 Add `by_linearIssueId` GSI to the features DynamoDB table in `infra/lib/omakase-stack.ts`
- [x] 1.2 Update `getByLinearIssueId` in `packages/dynamodb/src/repositories/features.ts` to use the new GSI instead of `ScanCommand`
- [x] 1.3 Add `deleteFeature` function to `packages/dynamodb/src/repositories/features.ts`
- [x] 1.4 Add `updateFeature` function to `packages/dynamodb/src/repositories/features.ts` for general-purpose field updates (name, description, priority, status, category)
- [x] 1.5 Add `createFeature` function for manual feature creation (without Linear fields) to `packages/dynamodb/src/repositories/features.ts`
- [x] 1.6 Export new functions from `packages/dynamodb/src/index.ts`

## 2. Orchestrator API Endpoints

- [x] 2.1 Add `POST /api/projects/:projectId/features` endpoint for manual feature creation
- [x] 2.2 Add `POST /api/projects/:projectId/features/bulk` endpoint for bulk feature import with duplicate detection
- [x] 2.3 Add `PATCH /api/features/:featureId` endpoint for general feature updates
- [x] 2.4 Add `DELETE /api/features/:featureId` endpoint for feature deletion
- [x] 2.5 Add `POST /api/features/:featureId/dependencies` endpoint for adding dependencies (with cycle detection)
- [x] 2.6 Add `DELETE /api/features/:featureId/dependencies/:dependsOnId` endpoint for removing dependencies
- [x] 2.7 Add `DELETE /api/projects/:projectId/linear-token` endpoint for disconnecting Linear

## 3. Linear GraphQL Queries

- [x] 3.1 Add `listTeams` GraphQL query to `packages/shared/src/linear/` for fetching accessible teams
- [x] 3.2 Add `listIssues` GraphQL query with filtering by team, project, status, and search query, with cursor-based pagination
- [x] 3.3 Add `listProjects` GraphQL query for fetching Linear projects within a team
- [x] 3.4 Add `getTeam` GraphQL query for fetching team details (name, key) by team ID

## 4. Next.js API Routes for Linear Workspace

- [x] 4.1 Create `apps/web/src/app/api/linear/teams/route.ts` — fetch teams using stored access token
- [x] 4.2 Create `apps/web/src/app/api/linear/issues/route.ts` — fetch issues with search, status, project, and pagination params
- [x] 4.3 Create `apps/web/src/app/api/linear/projects/route.ts` — fetch Linear projects for a team
- [x] 4.4 Add shared helper to retrieve the Linear access token from a project via the orchestrator API

## 5. Webhook Enhancements

- [x] 5.1 Add reverse status sync to `handleIssueUpdated` in `apps/web/src/lib/linear/ticket-sync.ts` — detect status field changes and update feature status using reverse mapping
- [x] 5.2 Wire up `handleRelationCreated` in `dependency-sync.ts` to call `POST /api/features/:featureId/dependencies`
- [x] 5.3 Wire up `handleRelationRemoved` in `dependency-sync.ts` to call `DELETE /api/features/:featureId/dependencies/:dependsOnId`

## 6. Tickets Tab UI

- [x] 6.1 Add "Tickets" tab to `TABS` array in `apps/web/src/app/(app)/projects/[id]/page.tsx`
- [x] 6.2 Create `apps/web/src/components/tickets-table.tsx` — sortable, filterable table component showing all features with columns: name, priority, status, category, Linear link, created date
- [x] 6.3 Add search input and status filter controls to the tickets table
- [x] 6.4 Add inline editing for feature name, priority, and status in table rows
- [x] 6.5 Add "Add Feature" button and creation form/modal for manual feature creation
- [x] 6.6 Add delete action with confirmation dialog to each table row
- [x] 6.7 Add TanStack Query hooks in `apps/web/src/hooks/use-api.ts` for feature CRUD, bulk import, and dependency management

## 7. Feature Detail Panel

- [x] 7.1 Create `apps/web/src/components/feature-detail-panel.tsx` — slide-out panel showing full feature details
- [x] 7.2 Add editable fields: name, description, priority, status, category
- [x] 7.3 Add dependency management section: list current dependencies, add/remove with dropdown selector
- [x] 7.4 Show `LinearTicketBadge` when feature is linked to a Linear issue
- [x] 7.5 Wire panel open/close to table row click in `tickets-table.tsx`

## 8. Linear Workspace Browser

- [x] 8.1 Create `apps/web/src/components/linear-workspace-browser.tsx` — full-screen drawer with issue list
- [x] 8.2 Add search input, status filter, and Linear project filter to the browser
- [x] 8.3 Add multi-select checkboxes with "Select All" and floating action bar showing selected count
- [x] 8.4 Add "Import Selected" button that calls `POST /api/projects/:projectId/features/bulk` and shows success/skip summary
- [x] 8.5 Add infinite scroll pagination (50 issues per page) using cursor-based pagination from Linear API
- [x] 8.6 Add "Browse Linear" button to the Tickets tab that opens the browser drawer

## 9. Linear Settings UI

- [x] 9.1 Add "Linear Integration" section to `SettingsTab` in `apps/web/src/app/(app)/projects/[id]/page.tsx`
- [x] 9.2 Show connection status: connected team name or "Not connected" state
- [x] 9.3 Add "Connect Linear" button (links to existing OAuth flow) when not connected
- [x] 9.4 Add "Disconnect" button with confirmation dialog that calls `DELETE /api/projects/:projectId/linear-token`

## 10. Kanban Board Integration

- [x] 10.1 Wire `KanbanBoard` to use real feature data from the API instead of `MOCK_FEATURES`
- [x] 10.2 Add `LinearTicketBadge` to feature cards in the Kanban board when `linearIssueId` is present
