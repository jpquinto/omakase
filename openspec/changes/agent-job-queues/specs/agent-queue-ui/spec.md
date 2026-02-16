## ADDED Requirements

### Requirement: Queue display on agent cards in mission control
The agent cards in mission control SHALL display the current queue depth and a preview of queued jobs when the agent is busy.

#### Scenario: Agent is busy with queued jobs
- **WHEN** an agent has status "working" and has 3 jobs in their queue
- **THEN** the agent card shows a queue badge (e.g., "+3 queued") below the current task indicator

#### Scenario: Agent is busy with empty queue
- **WHEN** an agent has status "working" and has no queued jobs
- **THEN** the agent card shows only the current task with no queue indicator

#### Scenario: Agent is idle
- **WHEN** an agent has status "idle"
- **THEN** no queue indicator is shown on the agent card

### Requirement: Queue list on agent profile page
The agent profile page SHALL display the full job queue in an ordered list with management controls.

#### Scenario: Agent has queued jobs
- **WHEN** a user views an agent's profile page and the agent has queued jobs
- **THEN** a "Job Queue" section displays showing each queued job with: position number, prompt summary (truncated), project name, time since queued, and a remove button

#### Scenario: User removes a queued job
- **WHEN** a user clicks the remove button on a queued job
- **THEN** the job is removed from the queue with a confirmation, and remaining jobs reorder

#### Scenario: User reorders a queued job
- **WHEN** a user drags a queued job to a new position (or uses up/down controls)
- **THEN** the job moves to the new position and the queue order updates

#### Scenario: Empty queue
- **WHEN** a user views an agent's profile page and the queue is empty
- **THEN** the queue section shows "No jobs queued" with muted text

### Requirement: Queue position feedback on dispatch
When dispatching to a busy agent, the UI SHALL show queue position feedback instead of an error.

#### Scenario: User dispatches to busy agent
- **WHEN** a user dispatches a task to an agent that is currently busy
- **THEN** the UI shows a success toast with "Queued as #N for {agentName}" instead of a busy error

#### Scenario: User dispatches to idle agent
- **WHEN** a user dispatches a task to an agent that is idle
- **THEN** the behavior is unchanged — work session starts immediately with existing feedback

### Requirement: Queue hook for frontend data
The system SHALL provide a `useAgentQueue` React hook that fetches and manages queue data.

#### Scenario: Hook provides queue data
- **WHEN** a component uses `useAgentQueue(agentName)`
- **THEN** the hook returns `{ queue, isLoading, removeJob, reorderJob }` with polling updates

#### Scenario: Hook refreshes on dispatch
- **WHEN** a new job is dispatched to an agent
- **THEN** the queue hook refetches to include the new job
