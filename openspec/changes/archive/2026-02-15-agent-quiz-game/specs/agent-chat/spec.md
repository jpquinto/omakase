## MODIFIED Requirements

### Requirement: Chat panel UI component
The system SHALL provide an `AgentChatPanel` React component that displays a message thread and an input field for sending messages. The component SHALL follow the Omakase liquid glass design system. The component SHALL include a game menu button in the header for launching interactive game modes.

#### Scenario: Display message thread
- **WHEN** the chat panel is open for an agent run
- **THEN** messages are displayed in chronological order with sender avatar (agent mascot or user icon), sender name, timestamp, and message content

#### Scenario: Send message from chat panel
- **WHEN** the user types a message and presses Enter or clicks Send
- **THEN** the message is posted to the orchestrator API and appears immediately in the thread with an optimistic update

#### Scenario: Empty state
- **WHEN** the chat panel is open and no messages exist for the agent run
- **THEN** a placeholder message is shown: "Send a message to [agent name] while they work on [feature name]"

#### Scenario: Agent is not running
- **WHEN** the chat panel is open for an agent run that has completed or failed
- **THEN** the message input is disabled and a banner reads "This conversation has ended"

#### Scenario: Game menu display
- **WHEN** the chat panel is in chat mode
- **THEN** a game menu button (gamepad icon) is visible in the header area, allowing the user to launch available game modes

#### Scenario: Game menu hidden in work mode
- **WHEN** the chat panel is in work mode
- **THEN** the game menu button is not rendered

### Requirement: Chat message types and formatting
The system SHALL support four message types: `message` (regular chat), `status` (agent phase transitions), `error` (agent errors), and `quiz` (interactive quiz components). Each type SHALL be visually distinct in the chat panel.

#### Scenario: Regular message rendering
- **WHEN** a message of type "message" is displayed
- **THEN** it renders with the sender's name, content text, and timestamp in the standard chat bubble style

#### Scenario: Status message rendering
- **WHEN** a message of type "status" is displayed (e.g., "Switched to coding phase")
- **THEN** it renders as a centered, muted inline notice without a chat bubble

#### Scenario: Error message rendering
- **WHEN** a message of type "error" is displayed
- **THEN** it renders with a red accent border and the `oma-error` color token

#### Scenario: Quiz message rendering
- **WHEN** a message of type "quiz" is displayed
- **THEN** it renders the agent's conversational text content AND the appropriate quiz UI component (topic prompt, question card, answer result, or results summary) based on the message's quiz metadata phase
