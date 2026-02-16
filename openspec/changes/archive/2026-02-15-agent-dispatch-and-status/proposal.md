## Why

Currently, agents can only be dispatched through work mode in the chat UI — the user selects "work" mode, types a message, and a Claude Code subprocess is spawned. There's no way to trigger an agent from other contexts (e.g. a ticket detail page, mission control, a quick-action button) and no centralized tracking of whether an agent is currently busy. This means a user could accidentally dispatch the same agent twice, leading to resource conflicts and confusing behavior.

## What Changes

- **Multiple dispatch entry points**: Agents can be dispatched from anywhere in the frontend — not just the chat page. Entry points include: ticket/feature detail pages ("assign agent"), agent profile cards, mission control dashboard, and a global command palette. All dispatch paths funnel through a single `useAgentDispatch` hook.
- **Centralized agent status tracking**: A real-time agent status system that tracks whether each agent is idle, working, or errored. Status is derived from the orchestrator's in-memory WorkSessionManager state and exposed via a dedicated API endpoint. The frontend polls or subscribes to this status.
- **Busy guard / dispatch lock**: Before dispatching an agent, the system checks if that agent is already busy. If so, the dispatch is blocked with a clear message showing what the agent is currently working on. This prevents concurrent work sessions for the same agent.
- **Dispatch confirmation flow**: A unified dispatch modal/sheet that collects: which agent, which project, optional prompt/instructions, and shows current agent status before confirming.

## Capabilities

### New Capabilities
- `agent-dispatch`: Unified dispatch system — hook, confirmation UI, multiple entry points, and the dispatch lock that prevents double-dispatching a busy agent
- `agent-status-tracking`: Real-time agent status (idle/working/errored) exposed from orchestrator to frontend, with polling and UI indicators across the app

### Modified Capabilities
_None — existing chat/work-mode behavior remains unchanged. The new dispatch system wraps and extends it._

## Impact

- **Frontend**: New `useAgentDispatch` hook + `useAgentStatus` hook. Dispatch buttons added to agent cards, ticket pages, and mission control. Agent status indicators added to sidebar and agent profile pages.
- **Orchestrator API**: New `GET /api/agents/status` endpoint returning status for all agents (or per-agent). Leverages existing `WorkSessionManager` in-memory state.
- **No database schema changes**: Agent status is derived from existing `AgentRun` records + in-memory session state. No new tables needed.
- **No breaking changes**: Existing chat page work mode continues to function. The new dispatch system is additive.
