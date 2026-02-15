## MODIFIED Requirements

### Requirement: Live feature progress display
The system SHALL display feature progress using polling-based REST API calls, showing passing/total counts and a progress bar that updates at the polling interval.

#### Scenario: Feature marked passing updates progress
- **WHEN** an agent marks a feature as "passing"
- **THEN** the dashboard progress bar and count update within the next polling cycle (5 seconds) without user interaction

### Requirement: Agent activity feed
The system SHALL display an activity feed showing agent actions (started, thinking, coding, testing, completed, failed) with timestamps, refreshed via polling.

#### Scenario: Agent starts working
- **WHEN** an agent begins working on a feature
- **THEN** an entry appears in the activity feed within the next polling cycle: "[Agent name] started working on [feature name]" with the agent's mascot avatar

#### Scenario: Activity feed updates via polling
- **WHEN** multiple agents are active
- **THEN** the feed shows interleaved updates from all agents ordered by timestamp, refreshing at the polling interval

### Requirement: Agent log streaming
The system SHALL fetch agent output logs from the REST API, filterable by agent and feature, refreshed via polling.

#### Scenario: View agent logs
- **WHEN** a user clicks on an active agent in mission control
- **THEN** a panel opens showing the agent's output, refreshed at the polling interval

#### Scenario: Filter logs by feature
- **WHEN** a user selects a feature card
- **THEN** logs from all agents that worked on that feature are shown in chronological order

## REMOVED Requirements

### Requirement: Real-time data subscriptions
**Reason**: Convex reactive queries are removed as part of the DynamoDB migration. Replaced by polling-based REST API calls.
**Migration**: All `useQuery` / Convex subscription calls are replaced with REST API fetch hooks with polling. Real-time push via WebSocket/SSE can be added as a future enhancement.
