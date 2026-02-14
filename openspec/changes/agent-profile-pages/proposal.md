## Why

The 4 AI agents (Miso, Nori, Koji, Toro) are core to Omakase but currently only appear as small status cards in the sidebar and a grid in AgentMissionControl. Users have no way to view an agent's personality, track record, activity history, or memories. Dedicated agent profile pages give each agent a presence and let users understand their behavior and performance at a glance.

## What Changes

- Add `/agents` route listing all 4 agents with hero cards showing mascot, role, personality summary, and key stats
- Add `/agents/[name]` route with a full profile page per agent featuring:
  - Hero section with agent mascot, name, role, personality traits, and communication style
  - Statistics dashboard: total runs, success rate, average duration, most recent run
  - Calendar heatmap showing daily contribution activity (reusing the pattern from style-system page)
  - Recent runs timeline
  - Agent memories list (per-project)
- Add sidebar navigation entry for Agents
- Add new API hooks for agent profile data, stats aggregation, and activity-by-date
- Add orchestrator API endpoints for agent stats and activity data

## Capabilities

### New Capabilities
- `agent-profile-page`: Dedicated profile pages for each agent with hero section, stats dashboard, calendar heatmap, recent runs, and memories. Includes agent listing page and individual profile pages.

### Modified Capabilities
_(none — no existing spec requirements change)_

## Impact

- **Frontend**: New routes at `(app)/agents/` and `(app)/agents/[name]/`, new reusable `CalendarHeatmap` component extracted from style-system, new `AgentProfileHero`, `AgentStatsGrid`, and `AgentRunTimeline` components. Sidebar layout updated with Agents link.
- **API hooks**: New `useAgentProfile`, `useAgentStats`, `useAgentActivity`, `useAgentMemories` hooks in `use-api.ts`
- **Backend**: New orchestrator endpoints for agent stats aggregation and activity-by-date queries against DynamoDB agent_runs table
- **Database**: No schema changes — reads from existing `agent_runs`, `agent_personalities`, and `agent_memories` tables with new query patterns (aggregation by agent name, activity counts by date)
