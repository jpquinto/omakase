## MODIFIED Requirements

### Requirement: Chat panel UI component
The system SHALL provide an `AgentChatPanel` React component that displays a message thread and an input field for sending messages. The component SHALL follow the Omakase liquid glass design system. The component SHALL support a talk mode that replaces text input with voice input and reads agent responses aloud.

#### Scenario: Display message thread
- **WHEN** the chat panel is open for an agent run
- **THEN** messages are displayed in chronological order with sender avatar (agent mascot or user icon), sender name, timestamp, and message content

#### Scenario: Send message from chat panel
- **WHEN** the user types a message and presses Enter or clicks Send
- **THEN** the message is posted to the orchestrator API and appears immediately in the thread with an optimistic update

#### Scenario: Send message via voice
- **WHEN** talk mode is active and the user completes a voice input
- **THEN** the transcribed text is posted to the orchestrator API as a regular message and appears in the thread

#### Scenario: Empty state
- **WHEN** the chat panel is open and no messages exist for the agent run
- **THEN** a placeholder message is shown: "Send a message to [agent name] while they work on [feature name]"

#### Scenario: Agent is not running
- **WHEN** the chat panel is open for an agent run that has completed or failed
- **THEN** the message input is disabled and a banner reads "This conversation has ended"

#### Scenario: Talk mode toggle visibility
- **WHEN** the browser supports Web Speech API
- **THEN** a talk mode toggle button SHALL be visible in the chat input area

#### Scenario: Talk mode toggle hidden
- **WHEN** the browser does not support Web Speech API
- **THEN** the talk mode toggle SHALL not be rendered
