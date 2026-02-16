## ADDED Requirements

### Requirement: Live agent status in ticket assignment popover
The system SHALL display live agent status (idle/working/errored) in the ticket assignment popover, using data from `useAgentStatus`.

#### Scenario: All agents idle
- **WHEN** a user opens the agent assignment popover for a pending feature and all agents are idle
- **THEN** all four agents (Miso, Nori, Koji, Toro) are shown as selectable with their role labels and agent-colored idle indicators

#### Scenario: Agent is working
- **WHEN** a user opens the assignment popover and an agent has status "working"
- **THEN** that agent's row shows a pulsing dot in their agent color, displays "Working on: {currentTask}" text, and the row is visually disabled (not selectable)

#### Scenario: Agent is errored
- **WHEN** a user opens the assignment popover and an agent has status "errored"
- **THEN** that agent's row shows a red dot, displays "Last run failed" text, but the agent remains selectable (errors don't block new assignments)

### Requirement: Pipeline progress indicator on ticket rows
The system SHALL show pipeline progress on ticket rows that are currently being worked on by an agent.

#### Scenario: Feature in progress with active agent
- **WHEN** a feature has status "in_progress" and the assigned agent has a "working" live status with a matching currentTask
- **THEN** the ticket row displays a progress indicator showing the agent's mascot emoji and "Working..." with a pulsing animation

#### Scenario: Feature in progress but no active agent session
- **WHEN** a feature has status "in_progress" but no agent currently has an active session for it
- **THEN** the ticket row displays "In Progress" status badge without an active agent indicator (pipeline may be between steps)

### Requirement: Ticket dispatch feedback
The system SHALL provide clear feedback when a ticket is dispatched to an agent.

#### Scenario: Successful dispatch
- **WHEN** a user selects an idle agent from the assignment popover
- **THEN** the popover closes, the feature row immediately updates to show "in_progress" status, and the assigned agent's status indicator begins showing as "working"

#### Scenario: Dispatch rejected — agent busy
- **WHEN** a user somehow attempts to dispatch to a busy agent (race condition between UI check and server)
- **THEN** the system displays a toast error with "Agent {name} is currently busy" and the popover remains open for selecting a different agent

#### Scenario: Dispatch rejected — feature not pending
- **WHEN** a dispatch is attempted but the feature is no longer pending (claimed by another user or auto-watcher)
- **THEN** the system displays a toast error with "Feature is no longer available for assignment" and refreshes the feature list

### Requirement: Refresh feature list on status changes
The system SHALL automatically refresh the feature list to reflect pipeline progress.

#### Scenario: Polling keeps feature status current
- **WHEN** the tickets tab is active and features are displayed
- **THEN** the feature list refetches periodically (matching existing TanStack Query intervals) to show updated statuses as pipelines progress through steps
