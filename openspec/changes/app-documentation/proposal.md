## Why

There is no in-app documentation for Omakase. As the platform grows (agent pipelines, work sessions, Linear integration, job queues, style system), new users and contributors have no reference for how the system works. Adding a documentation section to the settings page provides a self-contained, always-accessible guide to every major system.

## What Changes

- Add a "Documentation" tab/section to the existing settings page
- Create comprehensive documentation pages covering: architecture overview, agent pipeline, work sessions, Linear integration, real-time streaming, style system, API reference, and infrastructure
- Documentation uses high-level descriptions and pseudocode (no raw source code)
- Navigable via sidebar or tab-based layout within the settings area

## Capabilities

### New Capabilities
- `app-documentation`: In-app documentation system accessible from the settings page, covering all major architecture, workflows, and design system details

### Modified Capabilities
_(none — settings page gains a new tab but no existing requirements change)_

## Impact

- **Frontend only** — new route(s) or section under `apps/web/src/app/(app)/settings/`
- No backend changes, no DB schema changes, no API changes
- New documentation components and markdown/content files
- Settings page layout updated to include documentation navigation
