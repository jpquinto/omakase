## ADDED Requirements

### Requirement: Live feature progress display
The system SHALL display real-time feature progress using Convex reactive queries, showing passing/total counts and a progress bar that updates without page refresh.

#### Scenario: Feature marked passing updates progress
- **WHEN** an agent marks a feature as "passing"
- **THEN** the dashboard progress bar and count update within 1 second without user interaction

### Requirement: Agent activity feed
The system SHALL display a real-time activity feed showing agent actions (started, thinking, coding, testing, completed, failed) with timestamps.

#### Scenario: Agent starts working
- **WHEN** an agent begins working on a feature
- **THEN** an entry appears in the activity feed: "[Agent name] started working on [feature name]" with the agent's mascot avatar

#### Scenario: Activity feed updates in real-time
- **WHEN** multiple agents are active
- **THEN** the feed shows interleaved updates from all agents ordered by timestamp, updating without polling

### Requirement: Agent log streaming
The system SHALL stream agent output logs to the dashboard in real-time, filterable by agent and feature.

#### Scenario: View agent logs
- **WHEN** a user clicks on an active agent in mission control
- **THEN** a panel opens showing the agent's live output stream (similar to a terminal)

#### Scenario: Filter logs by feature
- **WHEN** a user selects a feature card
- **THEN** logs from all agents that worked on that feature are shown in chronological order

### Requirement: Linear ticket status overlay
The system SHALL display Linear ticket metadata on feature cards, including the Linear issue identifier, status, and a link to the Linear issue.

#### Scenario: Feature card shows Linear info
- **WHEN** a feature is linked to a Linear issue
- **THEN** the feature card displays the Linear issue ID (e.g., "ENG-123") as a clickable link and the current Linear status

### Requirement: Celebration overlay on completion
The system SHALL display a celebration animation (confetti) when all features in a project reach "passing" status, preserving the existing UX pattern.

#### Scenario: All features passing triggers celebration
- **WHEN** the last feature in a project is marked "passing"
- **THEN** a confetti animation plays on the dashboard

### Requirement: Notifications for agent events
The system SHALL display toast notifications for important agent events (feature completed, agent failed, pipeline finished).

#### Scenario: Feature completion notification
- **WHEN** an agent marks a feature as "passing"
- **THEN** a toast notification appears: "[Feature name] completed by [agent name]"

#### Scenario: Agent failure notification
- **WHEN** an agent fails on a feature
- **THEN** a toast notification appears with error context and a link to view logs

### Requirement: Chat entry point on agent cards
The Agent Mission Control component SHALL provide a clickable action on each running agent card that opens the chat sidebar for that agent's current run.

#### Scenario: Click running agent card opens chat
- **WHEN** a user clicks an agent card with status "running"
- **THEN** the chat sidebar opens showing the conversation for that agent's active run

#### Scenario: Click idle agent card does not open chat
- **WHEN** a user clicks an agent card with status "idle"
- **THEN** no chat sidebar opens (there is no active run to chat with)

### Requirement: Chat entry point in log viewer
The Log Viewer component SHALL make agent name tags clickable, opening the chat sidebar for that agent's most recent run.

#### Scenario: Click agent name in log entry opens chat
- **WHEN** a user clicks an agent name tag (e.g., "[Miso]") in a log entry
- **THEN** the chat sidebar opens for that agent's most recent active run

### Requirement: Unread message indicator on agent cards
The Agent Mission Control component SHALL display an unread message badge on agent cards when new messages arrive that the user has not seen.

#### Scenario: New agent message shows badge
- **WHEN** an agent posts a new message and the chat panel for that agent is not open
- **THEN** a small badge appears on the agent's card in Mission Control indicating unread messages

#### Scenario: Opening chat clears badge
- **WHEN** the user opens the chat sidebar for an agent
- **THEN** the unread badge on that agent's card is cleared
