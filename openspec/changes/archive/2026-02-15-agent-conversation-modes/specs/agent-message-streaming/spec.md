## MODIFIED Requirements

### Requirement: SSE stream carries work mode events
The SSE endpoint SHALL support work mode events in addition to existing chat events. Work mode events include tool use notifications and structured output from Claude Code.

#### Scenario: Streaming Claude Code assistant text
- **WHEN** Claude Code produces assistant text in a work session
- **THEN** the SSE stream delivers `thinking_start`, `token` events with text content, and `thinking_end` — matching the existing chat streaming protocol

#### Scenario: Streaming tool use activity
- **WHEN** Claude Code executes a tool (file read, edit, bash command)
- **THEN** the SSE stream delivers a `token` event with formatted tool activity text (e.g., "Reading file: src/index.ts" or "Running: npm test")

#### Scenario: Work session ended event
- **WHEN** the Claude Code process exits (graceful or timeout)
- **THEN** the SSE stream delivers a `close` event with the session's final status
