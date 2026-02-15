## Why

Agent chat currently only supports a personality-driven conversation via the Anthropic API — agents can talk in character but cannot actually read files, run commands, or make code changes. Users need the ability to have agents perform real work (coding, reviewing, testing) through the chat interface by spinning up Claude Code instances, while keeping the lightweight chat mode for casual Q&A and status discussions.

## What Changes

- Add a conversation mode selector at the start of each conversation: **Chat** (default) or **Work**
- **Chat mode**: Unchanged — uses Anthropic API with personality prompts for lightweight conversation
- **Work mode**: Spawns a Claude Code subprocess (`claude` CLI) that can read/write files, run commands, and make commits. Streams Claude Code's output back to the chat panel in real time. The agent works in the project's workspace with full tool access.
- Add a `mode` field to threads so the system knows which backend to route messages to
- Add orchestrator endpoint to start/manage Claude Code work sessions
- Stream Claude Code output tokens back through the existing stream-bus → SSE pipeline
- Track work sessions in `agent_runs` so they appear on the agent profile page's "Recent Runs"

## Capabilities

### New Capabilities
- `agent-work-mode`: Claude Code subprocess lifecycle management, including spawning, streaming output, accepting user messages as follow-up prompts, and graceful termination. Covers the orchestrator-side process management and the new API endpoints.

### Modified Capabilities
- `agent-chat`: Adding conversation mode selector UI (Chat/Work toggle), routing messages to the correct backend based on mode, and displaying Claude Code output in the chat panel.
- `agent-message-streaming`: Extending the SSE stream to carry Claude Code tool-use events and structured output alongside existing token/thinking events.

## Impact

- **Orchestrator**: New work session manager that spawns `claude` CLI subprocesses, pipes stdin/stdout, and bridges to stream-bus. New API endpoints for starting/stopping work sessions.
- **Frontend**: Mode selector UI in chat panel header. Chat panel must render Claude Code structured output (tool calls, file edits, command results) in addition to plain text.
- **DynamoDB**: `mode` field added to thread schema. Work sessions create `agent_run` records so they appear in profile pages.
- **Dependencies**: Requires `claude` CLI available in the orchestrator environment (already present for pipeline agents).
- **Infrastructure**: No new AWS resources — work mode uses local subprocess execution like the existing `local` execution mode.
