## Why

Projects connected to Linear currently ingest tickets via webhooks and manual browse-and-import, but there's no way to view, filter, or manage those synced tickets directly on the project page's Tickets tab. Users also can't trigger a re-sync to pull the latest state from Linear, and there's no mechanism to assign a specific ticket to an agent of their choosing (bypassing the automatic orchestrator polling).

## What Changes

- **Tickets tab overhaul**: Show Linear-synced features with richer metadata (Linear status, labels, assignee) and add filtering by Linear state alongside existing Omakase status filters
- **Re-sync button**: Add a "Sync from Linear" action that pulls all issues matching the project's Linear team/label filter and creates or updates corresponding features in DynamoDB
- **Agent assignment**: Add the ability to select one or more tickets and assign them to a specific agent (Miso/Nori/Koji/Toro), which triggers the pipeline for those features immediately with the chosen agent configuration
- **Orchestrator endpoints**: New API routes for bulk Linear re-sync and manual agent assignment/pipeline triggering

## Capabilities

### New Capabilities
- `linear-ticket-sync`: Bulk re-sync of Linear issues to project features, with a UI trigger and orchestrator endpoint
- `manual-agent-assignment`: User-initiated assignment of features to a specific agent, bypassing the automatic feature watcher polling

### Modified Capabilities
- `linear-integration`: Adding sync-on-demand and richer ticket display metadata (Linear state, labels) to the existing integration

## Impact

- **Frontend**: `tickets-table.tsx`, project detail page, new hooks for sync and assignment
- **Backend**: New orchestrator endpoints for sync trigger and manual assignment
- **Data layer**: May extend Feature schema with cached Linear metadata (state name, labels array)
- **Shared**: Linear workspace module gains a bulk-fetch-and-upsert function
- **No breaking changes**: Existing webhook-driven sync continues unchanged
