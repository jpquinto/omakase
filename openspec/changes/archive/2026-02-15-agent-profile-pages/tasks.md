## 1. Reusable Components

- [x] 1.1 Extract CalendarHeatmap from style-system page into `src/components/calendar-heatmap.tsx` with props: `data: { date: string, level: number }[]`, `colorScheme` (role color), `totalLabel`
- [x] 1.2 Create `AgentProfileHero` component with full-width gradient, large mascot emoji, name heading, role badge, and personality trait tag pills
- [x] 1.3 Create `AgentStatsGrid` component displaying 4 stat cards: total runs, success rate, average duration, last active

## 2. Orchestrator API Endpoints

- [x] 2.1 Add `GET /agents/:name/profile` endpoint returning agent personality data from DynamoDB
- [x] 2.2 Add `GET /agents/:name/stats` endpoint that queries agent_runs by agent name and computes totalRuns, successRate, avgDurationMs, lastRunAt
- [x] 2.3 Add `GET /agents/:name/activity` endpoint that returns daily run counts for the past 365 days as `{ date, count }[]`
- [x] 2.4 Add `GET /agents/:name/runs` endpoint returning the 20 most recent agent runs with feature and project info
- [x] 2.5 Add `GET /agents/:name/memories` endpoint returning agent memories grouped by project

## 3. Frontend API Hooks

- [x] 3.1 Add `useAgentProfile(name)` hook to `use-api.ts` fetching personality data
- [x] 3.2 Add `useAgentStats(name)` hook to `use-api.ts` fetching aggregated stats
- [x] 3.3 Add `useAgentActivity(name)` hook to `use-api.ts` fetching heatmap activity data
- [x] 3.4 Add `useAgentRuns(name)` hook to `use-api.ts` fetching recent runs
- [x] 3.5 Add `useAgentMemories(name)` hook to `use-api.ts` fetching memories

## 4. Agent Listing Page

- [x] 4.1 Create `/agents` route page at `src/app/(app)/agents/page.tsx` with a hero header and responsive grid of 4 agent cards
- [x] 4.2 Each agent card shows mascot, name, role, personality summary, and links to `/agents/[name]`
- [x] 4.3 Use frontend-design skill for polished, distinctive card design

## 5. Agent Profile Page

- [x] 5.1 Create `/agents/[name]` route page at `src/app/(app)/agents/[name]/page.tsx`
- [x] 5.2 Integrate AgentProfileHero at top of page with data from useAgentProfile
- [x] 5.3 Integrate AgentStatsGrid section with data from useAgentStats
- [x] 5.4 Integrate CalendarHeatmap section with data from useAgentActivity, using agent role color
- [x] 5.5 Add recent runs timeline section with data from useAgentRuns, showing feature name, project, status, duration, and relative time
- [x] 5.6 Add memories section with data from useAgentMemories, grouped by project with source badges
- [x] 5.7 Add graceful empty states for all sections when no data exists
- [x] 5.8 Use frontend-design skill for hero section and overall page layout

## 6. Navigation

- [x] 6.1 Add "Agents" link to sidebar navigation in `src/app/(app)/layout.tsx` between Projects and remaining nav items, with a Bot or Users icon from lucide-react
