## 1. Thread Mode Field

- [x] 1.1 Add `mode: "chat" | "work"` field to the thread schema in `packages/db/src/schema/agent-messages.ts`
- [x] 1.2 Update thread creation in `packages/dynamodb/src/agent-messages.ts` to accept and store the `mode` field (default: `"chat"`)
- [x] 1.3 Update the orchestrator's thread creation endpoint (`POST /api/agents/:agentName/threads`) to accept `mode` in the request body

## 2. Work Session Manager

- [x] 2.1 Create `apps/orchestrator/src/work-session-manager.ts` with the `WorkSessionManager` class that manages a map of active sessions keyed by `runId`
- [x] 2.2 Implement `startSession(agentName, projectId, threadId, prompt)` — spawns `claude` CLI with `--output-format stream-json`, `--system-prompt` with agent personality, and working directory set to project workspace
- [x] 2.3 Implement stdout parser that reads stream-JSON lines from the Claude Code process and emits `thinking_start`, `token`, `thinking_end`, and `stream_error` events to the stream-bus
- [x] 2.4 Implement `sendMessage(runId, message)` — writes message to subprocess stdin as a new prompt, resets inactivity timeout
- [x] 2.5 Implement `endSession(runId)` — gracefully terminates the subprocess, completes the `AgentRun` record
- [x] 2.6 Implement inactivity timeout (30 min default) that auto-terminates sessions and completes the `AgentRun`
- [x] 2.7 Implement `getSession(runId)` and `listSessions(agentName)` for session queries
- [x] 2.8 Add cleanup logic on orchestrator shutdown (kill all active work session processes)

## 3. AgentRun Integration

- [x] 3.1 Create an `AgentRun` record when a work session starts, using the agent's role and a featureId of `"work-session-{threadId}"`
- [x] 3.2 Update the `AgentRun` with `completedAt`, `durationMs`, and status when the session ends
- [x] 3.3 Store the session's output summary (last assistant message or truncated conversation) in the run's `outputSummary` field

## 4. Orchestrator API Endpoints

- [x] 4.1 Add `POST /api/agents/:agentName/work-sessions` endpoint that accepts `{ projectId, threadId, prompt }`, starts a work session, and returns `{ runId, status }`
- [x] 4.2 Add `DELETE /api/work-sessions/:runId` endpoint that gracefully ends an active work session
- [x] 4.3 Add `GET /api/agents/:agentName/work-sessions` endpoint that returns active work sessions
- [x] 4.4 Update the message creation endpoint (`POST /api/agent-runs/:runId/messages`) to route user messages to the `WorkSessionManager` when the thread mode is `"work"`

## 5. Frontend Mode Selector

- [x] 5.1 Create a `ConversationModeSelector` component with Chat and Work mode options, styled as toggle pills with glass surfaces
- [x] 5.2 Integrate the mode selector into the chat panel — show it before the first message is sent, hide once conversation begins
- [x] 5.3 Add a mode indicator badge in the chat panel header showing current mode (Chat/Work)
- [x] 5.4 Add an "End Session" button in the chat header that appears only in Work mode, calls `DELETE /api/work-sessions/:runId`

## 6. Frontend Message Routing

- [x] 6.1 Update `useAgentChat` hook to accept a `mode` parameter and include it when creating threads
- [x] 6.2 When mode is `"work"` and no session exists, call `POST /api/agents/:agentName/work-sessions` on first message send
- [x] 6.3 Update message sending logic to work with both chat and work backends (work mode routes through the same SSE stream)

## 7. Claude Code Output Rendering

- [x] 7.1 Parse tool-use formatted tokens in the chat panel to display tool activity (file reads, edits, commands) with subtle formatting
- [x] 7.2 Show a "Session ended" status message when a work session terminates (timeout or user-initiated)
