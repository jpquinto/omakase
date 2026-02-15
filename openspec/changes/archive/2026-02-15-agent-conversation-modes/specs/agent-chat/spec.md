## MODIFIED Requirements

### Requirement: Chat panel supports conversation mode selection
The agent chat panel SHALL display a mode selector when starting a new conversation, allowing the user to choose between "Chat" and "Work" modes. Chat mode uses the existing Anthropic API personality chat. Work mode spawns a Claude Code subprocess for real coding work.

#### Scenario: User starts a new conversation in Chat mode
- **WHEN** user opens the chat panel and selects "Chat" mode
- **THEN** a thread is created with `mode: "chat"` and messages are routed to the Anthropic API personality responder

#### Scenario: User starts a new conversation in Work mode
- **WHEN** user opens the chat panel and selects "Work" mode
- **THEN** a thread is created with `mode: "work"`, a Claude Code subprocess is spawned, and messages are routed to the subprocess stdin

#### Scenario: Mode indicator in active conversation
- **WHEN** user is in an active conversation
- **THEN** the chat panel header displays the current mode (Chat or Work) with a visual indicator

#### Scenario: Work mode end session button
- **WHEN** user is in an active Work mode conversation
- **THEN** an "End Session" button is visible in the chat panel header that terminates the Claude Code process

### Requirement: Thread mode field
Each thread SHALL have a `mode` field set at creation time. The mode is immutable for the thread's lifetime and determines message routing.

#### Scenario: Thread created with chat mode
- **WHEN** a thread is created with `mode: "chat"`
- **THEN** all messages in the thread are processed by `agent-responder.ts`

#### Scenario: Thread created with work mode
- **WHEN** a thread is created with `mode: "work"`
- **THEN** all messages in the thread are processed by the `WorkSessionManager`

### Requirement: Message routing based on thread mode
The message creation endpoint SHALL route user messages to the appropriate backend based on the thread's mode field.

#### Scenario: User message in chat thread
- **WHEN** a user message is posted to a chat-mode thread
- **THEN** the system calls `generateAgentResponse()` as before

#### Scenario: User message in work thread
- **WHEN** a user message is posted to a work-mode thread
- **THEN** the system pipes the message to the active Claude Code subprocess via the `WorkSessionManager`
