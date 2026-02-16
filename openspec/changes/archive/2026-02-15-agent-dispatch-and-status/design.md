## Context

Agents are currently dispatched only through the chat page's work mode flow: user selects "work" mode → types a message → `useAgentChat` calls `POST /api/agents/:name/work-sessions` → orchestrator spawns a Claude Code subprocess. The `WorkSessionManager` tracks active sessions in memory (keyed by runId), but this state isn't exposed as a unified "agent status" to the frontend. There's no guard against dispatching the same agent twice.

The orchestrator already has all the building blocks: `WorkSessionManager` holds active sessions with `busy` flags, `AgentRun` records track execution history, and the stream-bus handles real-time events. The gap is a status aggregation layer and a dispatch abstraction on the frontend.

## Goals / Non-Goals

**Goals:**
- Unified dispatch hook (`useAgentDispatch`) that any component can call to start an agent on a task
- Real-time agent status (idle/working/errored) visible across the frontend
- Busy guard that prevents dispatching an agent that's already working
- Multiple dispatch entry points: agent cards, ticket pages, mission control, command palette

**Non-Goals:**
- Queuing dispatches for busy agents (future enhancement)
- Multi-agent orchestration or pipeline dispatch from frontend (existing pipeline system handles this)
- Changing the underlying Claude Code subprocess mechanism
- Persistent agent status in DynamoDB (derived from in-memory state is sufficient)

## Decisions

### 1. Agent status derived from WorkSessionManager, not a new DB table

**Decision**: Expose agent status via a new `GET /api/agents/status` endpoint that reads from `WorkSessionManager`'s in-memory session map + recent `AgentRun` records for error state.

**Rationale**: The WorkSessionManager already tracks active sessions with `busy` flags, session metadata, and subprocess handles. Adding a database table would create sync issues — the source of truth for "is this agent working right now" is whether a subprocess is alive, which is in-memory state.

**Alternative considered**: Persisting status to DynamoDB. Rejected because status changes rapidly during work (busy flag toggles per message), and the orchestrator is a single instance — no need for distributed state.

### 2. Status model: idle / working / errored per agent

**Decision**: Each of the 4 agents (miso, nori, koji, toro) has exactly one status: `idle`, `working`, or `errored`.

- `working`: Agent has an active work session (any session in WorkSessionManager for that agentName)
- `errored`: Agent's most recent run failed and no active session exists
- `idle`: No active session and last run wasn't a failure (or no runs at all)

When `working`, status includes: `runId`, `threadId`, `projectId`, `startedAt`, and `currentTask` (derived from the initial prompt or thread title).

**Rationale**: Simple, reflects reality. An agent is either doing something or it's not. The "errored" state is informational — lets the user know the last attempt failed before they dispatch again.

### 3. Frontend dispatch via `useAgentDispatch` hook

**Decision**: Create a single `useAgentDispatch()` hook that:
1. Checks agent status (from `useAgentStatus`)
2. If busy, returns error with current task info
3. If idle, calls the existing work-session start endpoint
4. Returns the new `runId` and navigates to the chat page (or opens a drawer)

Any component that wants to dispatch an agent calls this hook. The chat page's existing work mode flow continues to work — `useAgentChat` internally uses `useAgentDispatch` for the initial work session start.

**Alternative considered**: A dispatch modal component instead of a hook. Rejected as too rigid — some entry points want inline dispatch (e.g., "Assign Nori" button on a ticket), others want a modal (e.g., command palette). The hook provides the logic; UI is left to the consumer.

### 4. Polling for status, not WebSocket/SSE

**Decision**: Frontend polls `GET /api/agents/status` every 5 seconds via TanStack Query with `refetchInterval`.

**Rationale**: Agent status changes infrequently (start/end of work sessions, not per-token). Polling at 5s is simple, reliable, and matches existing patterns in the codebase (thread list polls at 10s). SSE would add complexity for minimal benefit at this frequency.

### 5. Dispatch entry points as thin UI wrappers

**Decision**: Each dispatch entry point (agent card button, ticket page button, mission control action, command palette) is a thin UI component that calls `useAgentDispatch`. They share the same dispatch flow but have context-specific UX:

- **Agent card**: "Start Work" button, disabled with tooltip when busy
- **Ticket/feature page**: "Assign to Agent" dropdown, shows agent status inline
- **Mission control**: Action buttons per agent row, disabled when busy
- **Command palette**: `dispatch <agent> <prompt>` command (future)

No shared dispatch modal — each entry point handles its own confirmation inline.

## Risks / Trade-offs

**[Risk] Orchestrator restart loses status** → Acceptable. Work sessions are already lost on restart (in-memory subprocesses die). Status endpoint returns "idle" for all agents after restart, which is correct since no sessions are active.

**[Risk] Stale status from polling lag** → 5-second window where UI might show idle but agent just started. Mitigated by optimistic updates in `useAgentDispatch` — immediately set status to "working" locally before server confirms.

**[Risk] Race condition: two tabs dispatch same agent simultaneously** → The orchestrator's `startSession()` already checks for existing sessions per agent. Second dispatch will get back `{ status: "existing" }` and the hook will surface this as a "busy" error. No code change needed on the orchestrator side for this.

**[Trade-off] No queue for busy agents** → If an agent is busy, dispatch is simply blocked. User must wait or cancel the current session. Queuing adds significant complexity (ordering, cancellation, priority) for a v1 feature. Can be added later.
