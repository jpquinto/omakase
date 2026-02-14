## Context

The agent chat system currently has one mode: Anthropic API chat with personality prompts (`agent-responder.ts`). The `claude` CLI is already used in the pipeline via `agent-entrypoint.sh` (local mode spawns it as a subprocess via `Bun.spawn()`). The stream-bus provides real-time pub/sub for token streaming over SSE. Threads persist conversations across runs. The existing `AgentRun` schema tracks pipeline executions. Work mode needs to spawn an interactive Claude Code process that stays alive for back-and-forth conversation, unlike the pipeline's fire-and-forget pattern.

## Goals / Non-Goals

**Goals:**
- Let users choose Chat or Work mode when starting a conversation thread
- Work mode spawns a `claude` CLI subprocess that can read/write files and run commands
- Stream Claude Code output back to the chat panel in real time
- User follow-up messages are piped to Claude Code's stdin as new prompts
- Work sessions create `AgentRun` records so they appear on agent profile pages
- Reuse existing stream-bus → SSE infrastructure for output delivery
- Graceful session lifecycle: start, interact, end (timeout or user-initiated)

**Non-Goals:**
- Running work mode on ECS Fargate (local subprocess only for now)
- Modifying the existing pipeline's agent execution (pipeline stays as-is)
- Rendering rich tool-use UI (file diffs, command output panels) — plain streamed text is sufficient for v1
- Multi-agent collaboration within a single work session
- Workspace isolation per work session (shares the project workspace)

## Decisions

### 1. Claude Code invocation: Interactive `--json` streaming mode

**Decision**: Spawn `claude` with `--output-format stream-json` to get structured JSON events on stdout. Each line is a JSON object with `type` field (e.g., `assistant`, `tool_use`, `result`). Pipe user follow-up messages to stdin as new prompts.

**Rationale**: The `--output-format stream-json` flag gives us structured events we can parse and stream through the bus. This is more reliable than parsing raw terminal output. The process stays alive between prompts, maintaining Claude Code's conversation context and tool state.

**Alternative considered**: Using `claude -p` with a single prompt per interaction (fire-and-forget like pipeline). Rejected because it loses conversation context and requires re-setup for each message.

### 2. Work session manager: New `WorkSessionManager` class in orchestrator

**Decision**: Create a `WorkSessionManager` that maintains a map of active sessions keyed by `runId`. Each session holds the child process handle, stdin writer, and session metadata. The manager handles spawning, message routing, output streaming, and cleanup.

**Rationale**: Centralizing session lifecycle in one class keeps the orchestrator index clean and makes it testable. Sessions need to be long-lived (unlike pipeline agents), so a manager pattern with cleanup on disconnect/timeout is appropriate.

### 3. Thread mode field: `mode: "chat" | "work"` on thread creation

**Decision**: Add a `mode` field to thread records in DynamoDB. Mode is set at thread creation time and is immutable for the thread's lifetime. The API routes messages to either `agent-responder.ts` (chat) or `WorkSessionManager` (work) based on the thread's mode.

**Rationale**: Mode is a thread-level concept, not a message-level one. Once you start a work session, all messages in that thread go to Claude Code. Switching modes mid-conversation would cause context confusion.

### 4. AgentRun creation: Work sessions create runs immediately

**Decision**: When a work session starts, create an `AgentRun` record with status `"started"` and role matching the agent. When the session ends (user closes, timeout, or error), complete the run with `"completed"` or `"failed"`. This makes work sessions visible on agent profile pages alongside pipeline runs.

**Rationale**: Reusing `AgentRun` means the profile page's recent runs, stats, and heatmap automatically include work sessions without any frontend changes.

### 5. Workspace: Use project's local workspace root

**Decision**: Work mode sessions run in `{LOCAL_WORKSPACE_ROOT}/{projectId}/` — the same workspace used by the pipeline's local mode. Claude Code has access to the full repo checkout.

**Rationale**: Agents need access to the actual codebase to be useful. Using the existing workspace avoids creating a new workspace management system. Concurrent work sessions on the same project are possible since Claude Code manages its own file operations.

### 6. Session timeout: 30 minutes default, configurable

**Decision**: Work sessions automatically terminate after 30 minutes of inactivity (no user messages). The timeout resets on each user message. Users can also explicitly end a session via the UI.

**Rationale**: Prevents orphaned Claude Code processes from consuming resources. 30 minutes matches the pipeline timeout. The reset-on-activity pattern allows long interactive sessions while cleaning up abandoned ones.

## Risks / Trade-offs

- **Resource consumption**: Each work session is a Claude Code process consuming memory and API credits. → Mitigation: Limit concurrent work sessions per user/project. Timeout after inactivity.
- **No workspace isolation**: Multiple work sessions on the same project can conflict. → Mitigation: Acceptable for v1 since work sessions are user-initiated and users understand they're modifying the workspace. Can add per-session branches later.
- **Claude CLI availability**: Requires `claude` CLI installed in the orchestrator environment. → Mitigation: Already required for local pipeline execution mode. Add a health check for CLI availability.
- **stdin/stdout parsing**: Stream-JSON output format may change across Claude CLI versions. → Mitigation: Pin CLI version, add defensive parsing with error recovery.
- **Process orphaning**: If the orchestrator crashes, work session processes may be orphaned. → Mitigation: Use process groups and cleanup on shutdown signal. Record PID in session metadata for recovery.
