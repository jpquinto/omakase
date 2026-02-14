## Context

Omakase currently has a reactive Linear integration: a webhook receiver creates features when Linear issues carry an "omakase" label, and status/comments sync back to Linear during agent pipeline execution. However, there is no proactive way to browse a Linear workspace, bulk-import issues, or manage synced tickets from the Omakase UI. The `LinearTicketBadge` component and dependency sync handlers exist but are not wired up. The `getByLinearIssueId` lookup uses an unindexed DynamoDB scan.

The project detail page has a tabbed layout (Kanban, Graph, Agents, Logs, Settings) and the Settings tab has no Linear connection UI.

## Goals / Non-Goals

**Goals:**
- Users can browse their connected Linear workspace (teams, projects, issues) from within Omakase
- Users can bulk-import selected Linear issues as features with conflict detection
- Users can manage features inline: edit, create manually, delete, and manage dependencies
- Linear connection status is visible in project settings with connect/disconnect controls
- Reverse status sync: Linear status changes propagate to Omakase features via webhooks
- The `LinearTicketBadge` is shown on feature cards in the Kanban board
- Dependency sync handlers are fully wired up with orchestrator API endpoints

**Non-Goals:**
- Real-time push updates (SSE/WebSocket) for the workspace browser — polling is sufficient
- Assignee sync between Linear users and Omakase agents
- Custom field mapping beyond title, description, priority, status, and labels
- Multi-workspace support (one Linear workspace per project)
- Linear project grouping (we map Linear teams to Omakase projects, not Linear projects)

## Decisions

### 1. Linear workspace data flows through Next.js API routes, not the orchestrator

**Decision:** New API routes in `apps/web/src/app/api/linear/` will fetch workspace data (teams, issues) directly from the Linear GraphQL API using the stored access token. The orchestrator handles feature CRUD only.

**Rationale:** The frontend already handles OAuth and webhook processing. Fetching read-only workspace data through Next.js keeps the orchestrator focused on pipeline execution. The access token is stored in DynamoDB and accessible from both services.

**Alternative considered:** Routing all Linear API calls through the orchestrator. Rejected because it adds unnecessary latency and coupling for read-only browsing.

### 2. Bulk import creates features via the orchestrator API

**Decision:** The bulk import UI sends a batch request to a new `POST /api/projects/:projectId/features/bulk` endpoint on the orchestrator, which uses `createFeaturesBulk` from the DynamoDB package.

**Rationale:** Feature creation must go through the orchestrator to maintain data integrity and trigger the feature watcher. The existing `createFromLinear` function handles single-feature creation; a bulk endpoint avoids N+1 API calls.

### 3. Ticket management lives on a new "Tickets" tab in the project detail page

**Decision:** Add a "Tickets" tab to the project detail page between "Kanban" and "Graph". This tab shows a sortable/filterable table of all features with inline editing, manual creation, and a slide-out detail panel.

**Rationale:** The Kanban board focuses on status workflow; a dedicated table view is better for bulk management, editing, and searching. Keeping it as a tab maintains the single-page project experience.

### 4. Linear workspace browser is a modal/drawer launched from the Tickets tab

**Decision:** A "Browse Linear" button in the Tickets tab opens a full-screen drawer showing the connected Linear workspace. Users can search, filter, and multi-select issues to import.

**Rationale:** Keeps the primary ticket management view clean while giving the workspace browser enough space. A drawer can be dismissed without losing table state.

### 5. Reverse status sync via webhook event handling

**Decision:** Extend the existing `handleIssueUpdated` webhook handler to detect Linear status changes and map them back to Omakase feature statuses using the existing `status-sync.ts` mapping (in reverse).

**Rationale:** The webhook infrastructure already exists. Adding reverse status detection is a small change to the existing handler. No new infrastructure needed.

### 6. Add GSI on linearIssueId for the features table

**Decision:** Add a DynamoDB Global Secondary Index `by_linearIssueId` on the features table to replace the current `ScanCommand`-based lookup.

**Rationale:** The current scan will degrade linearly with table size. A GSI gives O(1) lookups and is required for efficient conflict detection during bulk import.

## Risks / Trade-offs

- **Linear API rate limits** → The workspace browser fetches issues on-demand with pagination (max 50 per request). Bulk import is a single operation that writes locally only. No risk of hitting Linear API limits under normal usage.
- **Stale workspace data** → The browser shows point-in-time data from Linear. We don't cache workspace data; each browse fetches fresh data. A refresh button provides manual control.
- **Conflict on bulk import** → When importing issues that already exist as features, we skip duplicates (by `linearIssueId`) and report which were skipped vs. created. No upsert to avoid overwriting manual edits.
- **Token security** → The Linear access token is stored in DynamoDB. Next.js API routes access it server-side only; it never reaches the client. Future improvement: move to Secrets Manager.
- **GSI eventual consistency** → The `by_linearIssueId` GSI uses eventual consistency by default. For conflict detection during import, this is acceptable since the import operation is user-initiated and not time-critical.
