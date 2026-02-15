## Context

Projects connected to Linear currently ingest issues via webhooks (filtered by "omakase" label) and through a manual browse-and-import modal (`LinearWorkspaceBrowser`). The `TicketsTable` component displays features with basic Omakase status filtering but doesn't expose Linear-specific metadata (issue state, labels) or provide bulk sync/re-sync capabilities.

The orchestrator's `FeatureWatcher` polls DynamoDB every 30s for pending features with met dependencies, then auto-assigns them through the 4-step pipeline (architect → coder → reviewer → tester). There's no mechanism for users to manually assign a feature to a specific agent or trigger the pipeline on-demand.

**Current data flow**: Linear webhook → `handleIssueCreated` → `createFromLinear` (DynamoDB) → `FeatureWatcher` polls → auto-assigns.

**Desired flow**: Add a user-triggered sync (pull from Linear API) + manual agent assignment (push to pipeline) alongside the existing webhook flow.

## Goals / Non-Goals

**Goals:**
- Users can view all Linear-synced features with richer metadata on the Tickets tab
- Users can filter by Linear issue state (Todo, In Progress, Done, etc.) in addition to Omakase status
- Users can trigger a full re-sync from Linear that upserts all matching issues
- Users can select features and assign them to a specific agent (Miso/Nori/Koji/Toro), immediately triggering the pipeline

**Non-Goals:**
- Changing the existing webhook-driven sync flow (it continues as-is)
- Supporting non-Linear issue trackers
- Agent role customization beyond the existing four roles
- Editing Linear issue fields from the Omakase UI (read-only sync direction for metadata)

## Decisions

### 1. Sync strategy: server-side bulk upsert via orchestrator

**Decision**: The "Sync from Linear" button calls a new orchestrator endpoint `POST /api/projects/:projectId/linear/sync` that fetches all issues from the project's Linear team (with the "omakase" label filter), then upserts them into DynamoDB using `createFromLinear` (new) or `updateFromLinear` (existing).

**Rationale**: Keeping sync logic in the orchestrator (which already has the DynamoDB data access layer) avoids duplicating data access in the Next.js frontend. The orchestrator is the authoritative owner of feature state.

**Alternatives considered**: Client-side sync via Next.js API route that calls Linear API then orchestrator — rejected because it adds an unnecessary hop and splits sync logic across two services.

### 2. Linear metadata caching on Feature records

**Decision**: Extend the Feature type with optional cached fields: `linearStateName`, `linearLabels` (string array), and `linearAssigneeName`. These are populated during sync and webhook processing.

**Rationale**: Displaying Linear metadata in the tickets table requires this data to be available without a separate Linear API call per-row. Caching on the Feature record keeps the table fast and works even if the Linear token expires.

**Trade-off**: Cached data can go stale between syncs. Acceptable since users can hit "Sync" to refresh, and webhooks keep critical fields (title, priority, status) in sync.

### 3. Manual agent assignment: direct pipeline trigger

**Decision**: A new endpoint `POST /api/features/:featureId/assign` accepts `{ agentName: string }` and immediately starts an `AgentPipeline` for that feature, bypassing the `FeatureWatcher` queue. The feature must be in `pending` status.

**Rationale**: Users want to choose which agent handles a ticket rather than waiting for the auto-poller. This gives control while reusing the existing pipeline infrastructure.

**Constraint**: Only pending features can be assigned. Features already in_progress, review_ready, passing, or failing are rejected. The agent name maps to the pipeline's starting role but the full 4-step pipeline still runs (architect → coder → reviewer → tester). The "agent" in "assign to Nori" means the pipeline runs under Nori's work identity but all four roles execute.

### 4. UI: enhance existing TicketsTable rather than new component

**Decision**: Extend `TicketsTable` with a Linear state filter dropdown, a "Sync" button in the toolbar, and an "Assign to Agent" action on selected rows. No new page or component — enrich what exists.

**Rationale**: The table already handles features well. Adding filters and actions to it is less disruptive than replacing it.

## Risks / Trade-offs

**[Rate limiting]** → Linear API has rate limits. Bulk sync of a large team could hit them. Mitigation: paginate with `first: 50` and respect `after` cursor. Add a cooldown (disable sync button for 30s after trigger).

**[Stale cached metadata]** → Linear state/labels cached on Feature records drift between syncs. Mitigation: webhooks keep title/priority current; the "Sync" button refreshes everything. Good enough for a dashboard view.

**[Concurrent assignment conflicts]** → User assigns a feature manually while FeatureWatcher is also trying to claim it. Mitigation: `claimFeature` uses a DynamoDB conditional write (status=pending), so only one wins. The loser gets a 409 response.

**[Pipeline already running]** → User tries to assign a feature that's already in_progress. Mitigation: API rejects assignment for non-pending features with a clear error message.
