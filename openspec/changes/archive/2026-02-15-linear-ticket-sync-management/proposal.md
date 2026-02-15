## Why

The current Linear integration only syncs issues reactively via webhooks when they carry an "omakase" label. There is no way to browse, bulk-import, or manually manage Linear tickets from within the Omakase UI. Users need full visibility into their Linear workspace from the dashboard — with the ability to sync entire backlogs, cherry-pick tickets, adjust synced items, and manually create features that may or may not originate from Linear.

## What Changes

- Add a Linear workspace browser UI that shows teams, projects, and issues from the connected Linear workspace
- Add bulk import: select multiple Linear issues and sync them as features in one action
- Add a unified ticket/feature management UI on the project detail page with inline editing, manual creation, and Linear badge visibility
- Add bidirectional status sync: Linear status changes propagate back to Omakase features
- Add Linear connection status and settings to the project settings UI (connect, disconnect, configure sync preferences)
- Add a ticket detail panel with full metadata, Linear link, edit capabilities, and dependency management
- Wire up the existing `LinearTicketBadge` component and dependency sync handlers that are currently unused

## Capabilities

### New Capabilities
- `linear-workspace-browser`: UI and API for browsing Linear teams, projects, and issues from within Omakase, with filtering and search
- `ticket-bulk-import`: Bulk selection and import of Linear issues as features, with conflict detection and priority/status mapping
- `ticket-management-ui`: Unified feature/ticket management interface with inline editing, manual creation, deletion, and dependency management on the project detail page

### Modified Capabilities
- `linear-integration`: Add reverse status sync (Linear → Omakase), Linear connection UI in project settings, disconnect flow, and wire up unused dependency sync handlers

## Impact

- **Frontend**: New pages/panels in `apps/web/src/app/(app)/projects/[id]/`, new components for workspace browser, ticket management, and bulk import
- **API routes**: New Next.js API routes for fetching Linear workspace data (teams, issues, projects) and bulk import
- **Orchestrator**: New endpoints for bulk feature creation and dependency management
- **DynamoDB**: May need a GSI on `linearIssueId` for the features table to replace the current scan-based lookup
- **Packages**: `@omakase/shared` Linear client will need additional GraphQL queries for listing teams, projects, and issues
