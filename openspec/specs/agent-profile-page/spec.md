## ADDED Requirements

### Requirement: Agent listing page at /agents
The system SHALL provide a page at `/agents` that displays all 4 agents (Miso, Nori, Koji, Toro) as clickable cards. Each card SHALL show the agent's mascot emoji, display name, role, and a brief personality summary. Cards SHALL link to the individual agent profile page.

#### Scenario: User navigates to agents listing
- **WHEN** user navigates to `/agents`
- **THEN** the page displays 4 agent cards arranged in a responsive grid, each showing mascot, name, role badge, and personality summary

#### Scenario: User clicks an agent card
- **WHEN** user clicks on an agent card (e.g., Miso)
- **THEN** the browser navigates to `/agents/miso`

### Requirement: Agent profile hero section
The system SHALL display a full-width hero section at the top of each agent profile page (`/agents/[name]`). The hero SHALL include the agent's mascot emoji rendered large, the agent's display name, role badge, personality traits as tags, and a gradient background using the agent's role color (indigo for architect, blue for coder, pink for reviewer, jade for tester).

#### Scenario: Viewing Miso's profile hero
- **WHEN** user navigates to `/agents/miso`
- **THEN** a hero section displays with an indigo gradient background, the mascot emoji at large scale, "Miso" as the heading, "Architect" role badge, and personality traits as tag pills

#### Scenario: Viewing Toro's profile hero
- **WHEN** user navigates to `/agents/toro`
- **THEN** a hero section displays with a jade gradient background, the mascot emoji at large scale, "Toro" as the heading, "Tester" role badge, and personality traits as tag pills

### Requirement: Agent statistics dashboard
The system SHALL display a statistics section on each agent profile page showing: total runs completed, success rate (percentage of runs with status "completed" out of total), average run duration, and most recent run timestamp. Stats SHALL be fetched from the orchestrator API.

#### Scenario: Agent with run history
- **WHEN** user views an agent profile that has completed runs
- **THEN** the stats section shows total runs, success rate as a percentage, average duration formatted as human-readable time, and "last active" relative timestamp

#### Scenario: Agent with no run history
- **WHEN** user views an agent profile that has zero runs
- **THEN** the stats section shows "0" for total runs, "—" for success rate, "—" for average duration, and "Never" for last active

### Requirement: Calendar heatmap component
The system SHALL display a 52-week calendar heatmap on each agent profile page showing daily activity. The heatmap SHALL use 5 intensity levels (0=none through 4=high) with the agent's role color. Activity counts SHALL be derived from agent run start dates over the past 365 days.

#### Scenario: Agent with scattered activity
- **WHEN** user views an agent profile with runs spread across multiple days
- **THEN** the heatmap renders a 52-week grid with cells colored at varying intensity levels corresponding to daily run counts, with a total contributions count displayed

#### Scenario: Hovering a heatmap cell
- **WHEN** user hovers over a heatmap cell
- **THEN** the cell scales up and shows a visual highlight indicating the date and contribution count

### Requirement: Recent runs timeline
The system SHALL display the most recent agent runs (up to 20) in a timeline or list format on the agent profile page. Each entry SHALL show the feature name, project name, run status, duration, and relative timestamp.

#### Scenario: Viewing recent runs
- **WHEN** user views an agent profile with recent runs
- **THEN** a list shows up to 20 runs in reverse chronological order, each displaying feature name, project, status badge (completed/failed), duration, and relative time

#### Scenario: Agent with no runs
- **WHEN** user views an agent profile with zero runs
- **THEN** the recent runs section shows an empty state message

### Requirement: Agent memories section
The system SHALL display a list of the agent's memories on the profile page, grouped by project. Each memory entry SHALL show the content text, source type (extraction/manual/system), and creation date.

#### Scenario: Agent with memories across projects
- **WHEN** user views an agent profile that has memories stored
- **THEN** memories are displayed grouped by project name, each showing content, source badge, and date

#### Scenario: Agent with no memories
- **WHEN** user views an agent profile with zero memories
- **THEN** the memories section shows an empty state message

### Requirement: Sidebar navigation for agents
The system SHALL add an "Agents" link to the sidebar navigation in the app layout, positioned between Projects and the remaining nav items. The link SHALL navigate to `/agents`.

#### Scenario: Sidebar shows agents link
- **WHEN** user is on any authenticated page
- **THEN** the sidebar navigation includes an "Agents" link with an appropriate icon

### Requirement: Orchestrator API endpoints for agent data
The system SHALL expose the following orchestrator API endpoints:
- `GET /agents/:name/profile` — returns agent personality data (displayName, persona, traits, communicationStyle)
- `GET /agents/:name/stats` — returns aggregated stats (totalRuns, successRate, avgDurationMs, lastRunAt)
- `GET /agents/:name/activity` — returns `{ date: string, count: number }[]` for the last 365 days
- `GET /agents/:name/runs` — returns the 20 most recent agent runs
- `GET /agents/:name/memories` — returns agent memories grouped by project

#### Scenario: Fetching agent stats
- **WHEN** client sends `GET /agents/miso/stats`
- **THEN** the API returns `{ totalRuns, successRate, avgDurationMs, lastRunAt }` computed from agent_runs table

#### Scenario: Fetching agent activity for heatmap
- **WHEN** client sends `GET /agents/nori/activity`
- **THEN** the API returns an array of `{ date, count }` objects covering the last 365 days

#### Scenario: Fetching unknown agent
- **WHEN** client sends `GET /agents/unknown-name/profile`
- **THEN** the API returns a 404 status
