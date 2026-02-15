# Changelog

All notable changes to Omakase are documented in this file.

## [Unreleased]

### Linear Workspace Integration (2026-02-15)
- Reworked Linear integration from per-project tokens to workspace-level connection
- Linear OAuth now connects once per workspace and auto-discovers all Linear projects
- Omakase projects map 1:1 to Linear projects via `linearProjectId`
- Added `workspaces` DynamoDB table with GSI `by_linear_org`
- Added `by_linear_project` GSI to projects table for webhook routing
- Webhook handler routes issues by Linear project instead of team
- Removed dead `tickets` table and repository code
- Fixed OAuth callback: workspace lookup returns valid JSON for empty results

### Orchestrator & Pipeline (2026-02-14)
- Refactored orchestrator for GitHub App integration (installation-based auth)
- Added `review_ready` pipeline status — reviewer can request changes
- Rewrote work session management for Claude Code subprocess execution
- Added work session enhancements: optional projectId, repoUrl resolution
- Feature watcher resolves Linear token from workspace record

### Frontend — Agent Chat & Voice (2026-02-13 – 2026-02-14)
- Added voice chat with ElevenLabs TTS (replaced browser SpeechSynthesis)
- Added voice blob visualizer with CSS animations
- Integrated voice talk mode into chat input and agent chat panel
- Refactored agent chat hook to use transient SSE streams with reconnection
- Added fullscreen chat with file explorer sidebar and resizable panels
- Added chat threading, conversation management, and thread sidebar
- Improved chat input UX: always-visible textarea, LiquidTabs mode selector

### Frontend — Dashboard & Components (2026-02-12 – 2026-02-14)
- Added project creation wizard with multi-step flow (details, GitHub connect, confirm)
- Added GitHub repo selector component for App installation integration
- Added PR notification cards for pipeline results
- Added breadcrumb navigation to app header
- Added agent profile pages with hero, stats grid, and activity heatmap
- Added kanban board with `review_ready` status column
- Added dependency graph visualization (dagre-based)
- Added agent mission control and log viewer
- Added calendar heatmap with timezone fix
- Added resizable panels UI component

### Frontend — Style System (2026-02-12 – 2026-02-13)
- Added style system showcase page at `/style-system`
- Added Liquid Glass design system tokens and utility classes
- Added voice section to style system
- Added Spotify player demos with design system tokens
- Added global CSS utilities and glass surface variants

### Frontend — Integrations (2026-02-12 – 2026-02-13)
- Added Spotify now-playing integration with playback controls
- Added weather widget with location-based forecast
- Added Linear ticket badge component

### Backend — Data Layer (2026-02-11 – 2026-02-12)
- Added DynamoDB tables for agent threads, memories, and personalities
- Added agent run stats and activity tracking
- Added feature bulk import operations
- Added Linear API routes and sync operations
- Added quiz handler for in-chat agent quiz games
- Added stream bus and personality-driven agent responder
- Added shared Linear workspace utilities

### Infrastructure (2026-02-10 – 2026-02-11)
- AWS CDK stack: VPC, EC2 (t3.micro), Elastic IP, DynamoDB tables
- Systemd service for orchestrator on EC2
- Deploy script with SSH-based git pull and restart
- Auth0 v4 integration with middleware-protected routes
