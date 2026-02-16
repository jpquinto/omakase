## MODIFIED Requirements

### Requirement: Ticket assignment popover shows queue option
The ticket assignment popover SHALL allow assigning to busy agents by showing queue position instead of disabling the row.

#### Scenario: Agent is busy in assignment popover
- **WHEN** a user opens the assignment popover and an agent has status "working"
- **THEN** the agent row shows a "Queue (#N)" label indicating the job would be queued at position N, and the row remains selectable

#### Scenario: User assigns ticket to busy agent
- **WHEN** a user selects a busy agent in the assignment popover
- **THEN** the ticket is enqueued for that agent with a toast showing "Queued as #N for {agentName}"

### Requirement: Ticket rows show queue position
Ticket rows for features that are queued (not yet actively being processed) SHALL show their queue position.

#### Scenario: Feature is queued for an agent
- **WHEN** a feature has been dispatched but is waiting in an agent's queue
- **THEN** the ticket row shows "Queued #N for {agentEmoji}" with the agent's color
