## 1. Data Layer — Agent Messages

- [x] 1.1 Create `AgentMessage` type in `packages/db/src/schema/agent-messages.ts` with fields: `id`, `runId`, `featureId`, `projectId`, `sender` ("user" | "agent"), `role` (AgentRunRole | null), `content`, `type` ("message" | "status" | "error"), `timestamp`
- [x] 1.2 Create `packages/dynamodb/src/agent-messages.ts` with CRUD functions: `createMessage`, `listMessages(runId, since?)`, `listMessagesByFeature(featureId)` using DynamoDB `agent-messages` table with `runId` PK, `timestamp` SK, and `by_feature` GSI
- [x] 1.3 Export new functions from `packages/dynamodb/src/index.ts`
- [x] 1.4 Add DynamoDB `agent-messages` table definition to `infra/lib/omakase-stack.ts` with `by_feature` GSI (featureId → timestamp)

## 2. Orchestrator API — Chat Endpoints

- [x] 2.1 Add `POST /api/agent-runs/:runId/messages` endpoint to `apps/orchestrator/src/index.ts` — validates agent run exists and is active, creates message in DynamoDB, returns 201 with created message (or 409 if run is inactive)
- [x] 2.2 Add `GET /api/agent-runs/:runId/messages` endpoint — returns all messages for a run ordered by timestamp, with optional `since` and `sender` query params for filtering
- [x] 2.3 Add `GET /api/agent-runs/:runId/messages/stream` SSE endpoint — sends existing messages as initial batch, then polls DynamoDB every 1 second for new messages and streams them as `data:` events. Sends `event: close` when the agent run completes/fails
- [x] 2.4 Post status messages to `agent-messages` when agent run status changes (in `updateAgentStatus` / `completeAgentRun` flows) with `type: "status"` or `type: "error"`

## 3. Frontend — Chat Hook

- [x] 3.1 Create `apps/web/src/hooks/use-agent-chat.ts` — `useAgentChat(runId)` hook that manages an `EventSource` SSE connection to `/api/agent-runs/:runId/messages/stream`, exposes `messages`, `sendMessage(content)`, `error`, and `isConnected` state
- [x] 3.2 Handle optimistic message insertion on `sendMessage` — add message to local state immediately, POST to API in background, roll back on failure
- [x] 3.3 Handle SSE reconnection — use `Last-Event-ID` to resume from last received message timestamp; clean up EventSource on unmount

## 4. Frontend — Chat Panel Component (use /frontend-design skill, follow Omakase liquid glass style guide)

- [x] 4.1 Create `apps/web/src/components/agent-chat-panel.tsx` — slide-out sidebar panel with message thread, input field, and close button. Follow Omakase liquid glass design: `glass` surfaces, `oma-*` color tokens, Instrument Serif headings, Outfit body text
- [x] 4.2 Render messages with sender differentiation — agent messages show mascot + name + role badge (using `roleBadgeColor` pattern from mission control), user messages show user icon and align right
- [x] 4.3 Render `type: "status"` messages as centered muted inline notices (no bubble), and `type: "error"` messages with `oma-error` accent border
- [x] 4.4 Show empty state placeholder: "Send a message to [agent name] while they work on [feature name]"
- [x] 4.5 Show disabled input with "This conversation has ended" banner when agent run is completed/failed
- [x] 4.6 Auto-scroll to bottom on new messages; show "new messages" indicator if user has scrolled up

## 5. Frontend — Integration with Project Detail Page

- [x] 5.1 Add chat sidebar state to `apps/web/src/app/(app)/projects/[id]/page.tsx` — `activeChatRunId` state, slide-out animation (right side, ~400px width), Escape key to close
- [x] 5.2 Make agent cards in `AgentMissionControl` clickable — `onClick` callback that opens chat for the clicked agent's current run (only for running agents)
- [x] 5.3 Make agent name tags in `LogViewer` clickable — `onClick` callback that opens chat for that agent's most recent run
- [x] 5.4 Add unread message badge to agent cards in `AgentMissionControl` — small dot/count badge when messages arrive while chat panel is closed, cleared on open

## 6. Agent-Side Message Polling

- [x] 6.1 Add message polling to the agent monitor loop in `apps/orchestrator/src/agent-monitor.ts` — every 5 seconds (alongside status polling), check for new user messages via `listMessages(runId, since)` and store pending messages for relay
- [x] 6.2 Add between-step message check in `apps/orchestrator/src/pipeline.ts` — after each pipeline step completes, check for pending user messages and include them as context for the next step's environment variables or CLAUDE.md injection
