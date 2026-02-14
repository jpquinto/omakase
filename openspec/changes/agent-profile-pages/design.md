## Context

Omakase has 4 AI agents — Miso (architect), Nori (coder), Koji (reviewer), Toro (tester) — with rich data spread across DynamoDB tables (`agent_runs`, `agent_personalities`, `agent_memories`). Currently agents only appear as status cards in the sidebar and a grid in AgentMissionControl. There is no dedicated space to view an agent's identity, track record, or activity patterns.

The style-system page already has a CalendarHeatmap component rendering a 52-week contribution grid with 5 intensity levels. The Liquid Glass design system provides all visual patterns needed.

Existing data access: `agent-runs.ts` supports queries by agent/project/feature; `agent-personalities.ts` provides personality CRUD; `agent-memories.ts` provides memory listing. Stats aggregation does not currently exist.

## Goals / Non-Goals

**Goals:**
- Give each agent a visually rich, navigable profile page with hero section, stats, heatmap, and run history
- Extract CalendarHeatmap into a reusable component from the style-system page
- Add API endpoints and hooks for agent stats and activity aggregation
- Add `/agents` listing page and `/agents/[name]` profile routes
- Use the frontend-design skill for high-quality, distinctive UI

**Non-Goals:**
- Real-time WebSocket streaming on profile pages (polling is sufficient)
- Editing agent personalities from the profile page
- Cross-project aggregate views (profiles are per-agent across all projects initially)
- Agent-to-agent comparison views

## Decisions

### 1. Route structure: `/agents/[name]` keyed by agent name

**Decision**: Use agent name (miso, nori, koji, toro) as the URL param, not agent ID.

**Rationale**: Agent names are stable, human-readable identifiers. The 4 agents are fixed constants in the system. IDs are project-scoped UUIDs that would make URLs ugly and require extra lookups. Names are used as keys in `agent_personalities` already.

**Alternative considered**: `/agents/[id]` with UUID — rejected because agents are a fixed set, not dynamic entities.

### 2. Stats aggregation: Compute on-read in the orchestrator API

**Decision**: Add an orchestrator endpoint that queries `agent_runs` by agent name, computes totals/rates/averages, and returns the stats object.

**Rationale**: Agent run volume is moderate (hundreds to low thousands per agent). Scanning and aggregating on read is simpler than maintaining materialized counters. DynamoDB queries with the `by_agent` GSI are efficient enough.

**Alternative considered**: Pre-computed stats in a separate DynamoDB item updated on each run — unnecessary complexity at current scale.

### 3. Heatmap data: 52-week activity-by-date from agent_runs

**Decision**: A new orchestrator endpoint returns `{ date: string, count: number }[]` for the last 365 days, computed by grouping agent runs by `startedAt` date.

**Rationale**: The CalendarHeatmap expects a simple date→count mapping. Computing this from agent_runs is straightforward with the `by_agent` GSI.

### 4. Component extraction: CalendarHeatmap as standalone component

**Decision**: Extract the heatmap from `style-system/page.tsx` into `src/components/calendar-heatmap.tsx` with props for data, color scheme, and onClick handler.

**Rationale**: The style-system page has a working implementation. Extracting it enables reuse on agent profile pages and potentially elsewhere (project activity, etc.). The component takes `{ date: string, level: number }[]` data and maps to the 5-level color classes.

### 5. Hero section: Full-width gradient hero with agent identity

**Decision**: Each agent profile opens with a large hero section featuring the agent's mascot emoji at scale, name, role badge, personality traits as tags, and a gradient background using the agent's role color.

**Rationale**: The user explicitly requested "big and flashy" sections. The role color mapping (indigo/blue/pink/jade) already exists in AgentMissionControl. Scaling this up into a hero creates visual impact.

### 6. Navigation: Add Agents link to sidebar

**Decision**: Add an Agents entry to the sidebar nav in `(app)/layout.tsx`, positioned between Projects and Analytics.

**Rationale**: Agents are a top-level concept. The sidebar already shows agent status cards; a nav link makes the full profiles discoverable.

## Risks / Trade-offs

- **Stats query performance at scale**: If agent_runs grows to millions, on-read aggregation will slow down. → Mitigation: Add materialized counters later if needed. Current GSI queries are fast for thousands of items.
- **Fixed agent set assumption**: Routes assume 4 agents with known names. → Mitigation: This matches the current architecture. If agents become dynamic, the route already supports any name param.
- **Heatmap data volume**: 365 days of daily counts is a small payload (~1KB). No pagination needed. → No risk.
- **Mock data for new deployments**: Fresh installs will have empty stats/heatmaps. → Mitigation: Show graceful empty states with "No activity yet" messaging.
