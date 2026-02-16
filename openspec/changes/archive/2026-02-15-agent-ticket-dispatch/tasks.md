## 1. Server-Side Busy Guard

- [x] 1.1 Add busy guard to `POST /api/features/:featureId/assign` in `apps/orchestrator/src/index.ts`. Before launching the pipeline, check `workSessionManager.listAllSessions()` for an active session matching the requested `agentName`. Return HTTP 409 with `{ error: "Agent {name} is currently busy: {currentTask}" }` if busy.

## 2. Tickets Table Agent Status Integration

- [x] 2.1 Import and consume `useAgentStatus` in the tickets table component (`tickets-table.tsx`). Pass live agent statuses into the agent assignment popover.
- [x] 2.2 Update the agent assignment popover to show live status for each agent: idle agents are selectable, working agents show a pulsing dot in agent color + "Working on: {task}" text and are disabled, errored agents show red dot + "Last run failed" but remain selectable.
- [x] 2.3 Add error handling for assignment responses: display toast for 409 (busy agent or non-pending feature) and 429 (concurrency limit) errors. Refresh feature list on any assignment error.

## 3. Pipeline Progress on Ticket Rows

- [x] 3.1 Add a progress indicator to ticket rows with status "in_progress": show the assigned agent's mascot emoji with a pulsing animation and "Working..." text when the agent has an active session.
- [x] 3.2 Ensure the tickets table feature list refetches on a reasonable polling interval (use existing TanStack Query `refetchInterval` or similar) to reflect pipeline progress in near-real-time.

## 4. End-to-End Verification

- [x] 4.1 Verify the full dispatch flow works: assign from tickets table → feature status changes to in_progress → pipeline runs → feature status updates → Linear issue status syncs → PR is created (or feature marked failing on error). Fix any gaps found.
