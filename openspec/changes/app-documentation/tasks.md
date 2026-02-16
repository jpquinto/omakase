## Tasks

### Group 1: Settings page tab navigation
- [x] Add tab navigation to settings page with "General" and "Documentation" tabs. Move the existing orchestrator health card under the "General" tab. "Documentation" tab renders a new `DocsSection` component.

### Group 2: Documentation layout and sidebar
- [x] Create the `DocsSection` component with a left sidebar listing all doc sections (Architecture Overview, Agent Pipeline, Work Sessions, Linear Integration, Real-Time Streaming, Style System, Infrastructure, API Overview). Use anchor links for scroll-to-section navigation. Follow Liquid Glass design patterns.

### Group 3: Documentation content
- [x] Write the Architecture Overview section: monorepo structure diagram, service overview (Next.js frontend, Elysia orchestrator, DynamoDB layer, shared type packages), and how they connect.
- [x] Write the Agent Pipeline section: 4-step flow with pseudocode (architect → coder → reviewer → tester), retry logic, review cycle, success/failure paths, feature status transitions.
- [x] Write the Work Sessions section: Claude Code CLI subprocess lifecycle, session start/message/end flow with pseudocode, inactivity timeout, workspace directory structure.
- [x] Write the Linear Integration section: OAuth flow, workspace connection, bidirectional sync pseudocode, webhook handling, status mapping table.
- [x] Write the Real-Time Streaming section: SSE architecture with pseudocode (POST message → stream-bus emit → SSE subscribe → EventSource), event types, buffer replay for late clients.
- [x] Write the Style System section: typography (font families), color palette with visual swatches, agent color assignments, glass surface classes, border radii, shadows, animations.
- [x] Write the Infrastructure section: AWS resource diagram (EC2, DynamoDB, VPC, Elastic IP), deployment flow, environment variables, cost overview.
- [x] Write the API Overview section: grouped endpoint listing (Projects, Features, Agents, Work Sessions, Linear, Workspace) with brief purpose descriptions for each group.
