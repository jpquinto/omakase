## ADDED Requirements

### Requirement: Unified dispatch hook
The system SHALL provide a `useAgentDispatch` React hook that any component can use to dispatch an agent to work on a task. The hook SHALL accept an agent name, project ID, and prompt, and SHALL return a dispatch function, loading state, and error state.

#### Scenario: Successful dispatch from any component
- **WHEN** a component calls `dispatch({ agentName: "nori", projectId: "proj-1", prompt: "Implement login page" })`
- **THEN** the system creates a new thread with mode "work", starts a work session via the orchestrator API, and returns `{ runId, threadId }` to the caller

#### Scenario: Dispatch with thread reuse
- **WHEN** a component calls `dispatch({ agentName: "nori", projectId: "proj-1", prompt: "Continue the login work", threadId: "existing-thread-123" })`
- **THEN** the system starts a work session on the existing thread instead of creating a new one

### Requirement: Busy guard prevents double-dispatch
The system SHALL prevent dispatching an agent that is currently working. If an agent has an active work session, the dispatch function SHALL reject with an error containing the current task details.

#### Scenario: Dispatch blocked when agent is busy
- **WHEN** Nori is currently working on a task and a component calls `dispatch({ agentName: "nori", ... })`
- **THEN** the dispatch function returns an error with `{ busy: true, currentTask: "Implement login page", runId: "run-xyz", startedAt: "..." }`

#### Scenario: Dispatch succeeds after previous session ends
- **WHEN** Nori's previous work session has completed and a component calls `dispatch({ agentName: "nori", ... })`
- **THEN** the dispatch succeeds and a new work session is started

### Requirement: Dispatch from agent profile cards
The system SHALL render a "Start Work" action on each agent's card/profile that triggers the dispatch flow. The button SHALL be disabled with a tooltip when the agent is busy.

#### Scenario: Agent card shows dispatch button when idle
- **WHEN** an agent card is rendered and the agent status is "idle"
- **THEN** a "Start Work" button is shown and is clickable

#### Scenario: Agent card shows busy state
- **WHEN** an agent card is rendered and the agent status is "working"
- **THEN** the "Start Work" button is disabled and a tooltip shows what the agent is currently working on

### Requirement: Dispatch from ticket/feature detail page
The system SHALL allow users to assign an agent to a ticket/feature from its detail page. An "Assign Agent" action SHALL show available agents with their current status.

#### Scenario: Assign idle agent to ticket
- **WHEN** a user clicks "Assign Agent" on a feature detail page and selects an idle agent
- **THEN** the system dispatches that agent with the feature context as the prompt and navigates to the agent's chat page

#### Scenario: Busy agent shown as unavailable in assignment
- **WHEN** a user opens the "Assign Agent" dropdown on a feature detail page
- **THEN** busy agents are shown with a "Working" badge and cannot be selected

### Requirement: Dispatch from mission control
The system SHALL allow dispatching agents directly from the mission control dashboard via action buttons on each agent's row.

#### Scenario: Dispatch from mission control when idle
- **WHEN** a user clicks the dispatch action for an idle agent in mission control
- **THEN** a prompt input appears (inline or popover) and submitting it dispatches the agent

#### Scenario: Mission control shows live status
- **WHEN** mission control is rendered
- **THEN** each agent row shows the agent's current status (idle/working/errored) with real-time updates

### Requirement: Optimistic status update on dispatch
The system SHALL optimistically update the local agent status to "working" immediately when a dispatch is initiated, before the server confirms the work session has started.

#### Scenario: Immediate UI feedback on dispatch
- **WHEN** a user dispatches an agent
- **THEN** the agent's status across all UI components immediately shows "working" without waiting for the next poll cycle

#### Scenario: Rollback on dispatch failure
- **WHEN** a dispatch is initiated but the orchestrator returns an error
- **THEN** the agent's status reverts to its previous state and an error is shown to the user
