## ADDED Requirements

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
- **WHEN** a user clicks an agent name tag (e.g., "[Spark]") in a log entry
- **THEN** the chat sidebar opens for that agent's most recent active run

### Requirement: Unread message indicator on agent cards
The Agent Mission Control component SHALL display an unread message badge on agent cards when new messages arrive that the user has not seen.

#### Scenario: New agent message shows badge
- **WHEN** an agent posts a new message and the chat panel for that agent is not open
- **THEN** a small badge appears on the agent's card in Mission Control indicating unread messages

#### Scenario: Opening chat clears badge
- **WHEN** the user opens the chat sidebar for an agent
- **THEN** the unread badge on that agent's card is cleared
