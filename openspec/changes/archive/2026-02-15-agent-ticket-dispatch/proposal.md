## Why

The agent dispatch and status system is in place, but the existing ticket assignment flow (`POST /api/features/:featureId/assign`) doesn't enforce the busy guard — an agent can be dispatched to a ticket even if they're already running a work session. The frontend tickets table also doesn't show live agent status, so users can't see which agents are available before assigning. We need to wire the new agent live status system into the ticket dispatch flow end-to-end: busy guard on the backend, live status in the assignment UI, and proper status feedback as the pipeline progresses.

## What Changes

- Add server-side busy guard to the feature assign endpoint — reject assignment if the target agent already has an active work session in WorkSessionManager
- Update the tickets table agent assignment popover to show live agent status (idle/working/errored) from `useAgentStatus` and disable busy agents
- Add a dedicated "Dispatch" column/action to the tickets table for pending features with clear visual affordance
- Show pipeline progress feedback on the ticket row (which agent step is running)
- Ensure feature status transitions propagate correctly: pending → in_progress → review_ready → passing/failing, with corresponding Linear issue state updates
- Add real-time status refresh so the tickets table reflects pipeline progress without manual reload

## Capabilities

### New Capabilities
- `ticket-dispatch-status-integration`: Wiring agent live status into the ticket dispatch flow — busy guard enforcement, live agent status in assignment UI, and pipeline progress feedback on ticket rows

### Modified Capabilities
- `manual-agent-assignment`: Adding server-side busy guard that rejects assignment when agent has an active work session

## Impact

- **Backend**: `apps/orchestrator/src/index.ts` — modify `POST /api/features/:featureId/assign` to check WorkSessionManager
- **Frontend**: `apps/web/src/components/tickets-table.tsx` — update agent assignment popover with live status
- **Frontend**: `apps/web/src/app/(app)/projects/[id]/page.tsx` — may need to pass agent status context
- **Hooks**: `apps/web/src/hooks/use-agent-status.ts` — already exists, will be consumed by tickets table
- **Types**: No new types needed — uses existing `AgentLiveStatus` from previous change
