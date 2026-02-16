## 1. Agent Status API (Orchestrator)

- [x] 1.1 Add `GET /api/agents/status` endpoint to the Elysia server that reads from WorkSessionManager to return status (idle/working/errored) for all 4 agents. Include session metadata (runId, threadId, projectId, startedAt, currentTask) when working.
- [x] 1.2 Add `GET /api/agents/:agentName/status` endpoint for single-agent status lookup. Return 404 for invalid agent names.
- [x] 1.3 Add error detection: query the most recent AgentRun per agent and return "errored" status when the last run failed and no active session exists.

## 2. Frontend Status Hook

- [x] 2.1 Create `useAgentStatus` hook in `apps/web/src/hooks/use-agent-status.ts`. Use TanStack Query with 5-second polling interval against `GET /api/agents/status`. Return `{ agents, isLoading, error, isStale }`.
- [x] 2.2 Add `AgentStatus` TypeScript types to `packages/db/src/schema/` — status enum (idle/working/errored), status detail type with optional session metadata.

## 3. Frontend Dispatch Hook

- [x] 3.1 Create `useAgentDispatch` hook in `apps/web/src/hooks/use-agent-dispatch.ts`. Accept `{ agentName, projectId, prompt, threadId? }`. Check agent status before dispatching — reject if busy. Call existing work-session start endpoint on success. Return `{ dispatch, isDispatching, error }`.
- [x] 3.2 Add optimistic status update: immediately set local agent status to "working" via TanStack Query cache mutation when dispatch starts. Rollback on failure.
- [x] 3.3 Integrate `useAgentDispatch` into the existing chat page's work mode flow (`useAgentChat`), replacing the direct work-session API call with the dispatch hook to get busy-guard protection.

## 4. Status Indicators (UI)

- [x] 4.1 Add agent status indicators to the sidebar agent list — pulsing dot in agent color when working, red dot when errored, no dot when idle.
- [x] 4.2 Add status banner to agent profile pages — "Currently working on..." when active (with link to chat thread), "Available" when idle, "Last run failed" when errored.
- [x] 4.3 Update mission control agent rows to show live status from `useAgentStatus` and disable action buttons when agent is busy.

## 5. Dispatch Entry Points

- [x] 5.1 Add "Start Work" button to agent profile cards/pages that calls `useAgentDispatch`. Disable with tooltip when agent is busy.
- [x] 5.2 Add "Assign Agent" dropdown to ticket/feature detail pages. Show all 4 agents with their current status. Busy agents shown with "Working" badge and not selectable. Selecting an idle agent dispatches it with feature context.
- [x] 5.3 Add dispatch action buttons to mission control agent rows. Show inline prompt input (popover) on click. Submit dispatches the agent.
