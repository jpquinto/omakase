## ADDED Requirements

### Requirement: Agent message checking during execution
The agent execution wrapper SHALL poll the orchestrator for user messages at a configurable interval (default: 5 seconds) and at natural breakpoints between pipeline steps.

#### Scenario: Agent checks for messages during execution
- **WHEN** an agent is running and the poll interval elapses
- **THEN** the agent queries `GET /api/agent-runs/:runId/messages?since=<lastCheck>&sender=user` for new user messages

#### Scenario: Agent receives user message
- **WHEN** the agent poll returns one or more user messages
- **THEN** the agent processes the messages and posts a response via `POST /api/agent-runs/:runId/messages` with `sender: "agent"`

#### Scenario: Agent checks between pipeline steps
- **WHEN** the pipeline transitions between steps (e.g., architect completes, coder starts)
- **THEN** the orchestrator checks for pending user messages and includes them as context for the next agent step

### Requirement: Agent status messages posted to chat
The orchestrator SHALL post status messages to the agent-messages table when an agent transitions between phases, so users can see lifecycle events in the chat.

#### Scenario: Agent phase transition creates status message
- **WHEN** an agent run's status changes (e.g., from "thinking" to "coding")
- **THEN** the orchestrator creates a message with `type: "status"` and `content` describing the transition (e.g., "Started coding phase")

#### Scenario: Agent failure creates error message
- **WHEN** an agent run fails
- **THEN** the orchestrator creates a message with `type: "error"` and `content` containing the error summary
