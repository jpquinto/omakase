## Context

The orchestrator already has `POST /api/features/:featureId/assign` which validates feature status (must be "pending"), checks project concurrency limits, claims the feature via DynamoDB conditional write, and launches the 4-step agent pipeline (architect → coder → reviewer → tester). The pipeline already handles PR creation and Linear status sync via `LinearSyncHook`.

The previous change (`agent-dispatch-and-status`) added:
- `WorkSessionManager.listAllSessions()` for enumerating active agent sessions
- `GET /api/agents/status` returning live status for all 4 agents
- `useAgentStatus` hook polling every 5 seconds
- `useAgentDispatch` hook with busy guard for chat-based dispatch

The tickets table (`tickets-table.tsx`) already has an agent assignment popover, but it doesn't consume `useAgentStatus` — it shows all 4 agents as always-available. The assign endpoint doesn't check WorkSessionManager for busy agents.

## Goals / Non-Goals

**Goals:**
- Enforce server-side busy guard on `POST /api/features/:featureId/assign` — reject when agent has active work session
- Show live agent status in the tickets table assignment popover — idle agents selectable, busy agents disabled with "Working" badge
- Reflect pipeline progress on ticket rows — show which step is running via polling
- Ensure the full flow works: assign → pipeline → feature status updates → Linear sync → PR creation

**Non-Goals:**
- WebSocket/SSE for real-time updates (polling at 5s is sufficient, matches existing patterns)
- Multi-agent parallel pipelines (agents run sequentially within a pipeline)
- Auto-assignment intelligence (user selects agent manually)
- Changing the pipeline step sequence or retry logic

## Decisions

### 1. Server-side busy guard via WorkSessionManager

Check `workSessionManager.listAllSessions()` for an active session matching the requested `agentName`. Return HTTP 409 with a clear error message if the agent is busy.

**Why WorkSessionManager and not a DB query**: WorkSessionManager is the source of truth for currently-running processes. A DB query for recent runs could show stale data (a run record might exist for a session that's already finished but not yet updated).

### 2. Reuse `useAgentStatus` in tickets table

The tickets table component will consume `useAgentStatus()` to get live agent status and pass it into the assignment popover. Busy agents shown with a pulsing dot and "Working on: X" text, disabled from selection.

**Why not a separate hook**: `useAgentStatus` already polls efficiently at 5 seconds. Adding it to the tickets table component is trivial and avoids duplicate status polling.

### 3. Pipeline progress on ticket rows via feature status polling

Feature status already transitions during pipeline execution: pending → in_progress → (steps run) → review_ready / passing / failing. The tickets table already refetches features. We'll add a subtle indicator on in-progress ticket rows showing the assigned agent's current task (from `useAgentStatus`).

**Why feature status + agent status combo**: Feature status tells us "this ticket is being worked on". Agent status tells us "which step is currently running". Combining both gives rich progress info without new API endpoints.

### 4. No changes to the pipeline itself

The existing `AgentPipeline` already handles: PR creation via `pr-creator.ts`, Linear status sync via `LinearSyncHook` (moves issue to "In Progress" at start, "Done" on success), and feature status transitions. We just need to verify this works end-to-end.

## Risks / Trade-offs

- **[Race condition]** User clicks assign just as a chat dispatch starts the same agent → Mitigated by DynamoDB conditional write on feature claim + WorkSessionManager check. Worst case: one gets a 409 error.
- **[Stale UI]** Agent finishes between poll intervals, UI still shows "Working" → Mitigated by 5-second polling interval. Acceptable for this use case.
- **[Pipeline agent != assigned agent]** The pipeline runs ALL 4 agents sequentially regardless of which agent was "assigned" → This is existing behavior and correct. The assigned agent just indicates who initiated the pipeline. The busy guard checks the specific requested agent's current session.
