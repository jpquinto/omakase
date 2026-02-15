## 1. Type Definitions

- [x] 1.1 Add `AgentThread` type to `packages/db/src/schema/` with fields: `id`, `threadId`, `agentName`, `projectId`, `title`, `status`, `lastMessageAt`, `messageCount`, `createdAt`, `updatedAt`
- [x] 1.2 Add optional `threadId` field to the `AgentMessage` interface in `packages/db/src/schema/agent-messages.ts`
- [x] 1.3 Export new types from `packages/db/src/schema/index.ts` and `packages/db/src/index.ts`

## 2. DynamoDB Data Layer

- [x] 2.1 Create `packages/dynamodb/src/agent-threads.ts` with `createThread`, `getThread`, `listThreadsByAgent`, `updateThread` functions
- [x] 2.2 Add `by_thread` GSI query function `listMessagesByThread` to `packages/dynamodb/src/agent-messages.ts`
- [x] 2.3 Add `updateThreadMetadata` helper that increments `messageCount` and updates `lastMessageAt` — called from `createMessage` when `threadId` is present
- [x] 2.4 Update `createMessage` in `packages/dynamodb/src/agent-messages.ts` to accept and store optional `threadId`
- [x] 2.5 Export new functions from `packages/dynamodb/src/index.ts`

## 3. Infrastructure

- [x] 3.1 Add `agent-threads` DynamoDB table to `infra/lib/omakase-stack.ts` with partition key `agentName`, sort key `threadId`, and GSI `by_project` (partition: `projectId`, sort: `lastMessageAt`)
- [x] 3.2 Add `by_thread` GSI to the existing `agent-messages` table (partition: `threadId`, sort: `timestamp`)

## 4. Backend API Endpoints

- [x] 4.1 Add `POST /api/agents/:agentName/threads` endpoint to orchestrator — creates a new thread
- [x] 4.2 Add `GET /api/agents/:agentName/threads` endpoint — lists threads for an agent in a project (query param `projectId`, optional `includeArchived`)
- [x] 4.3 Add `PATCH /api/agents/:agentName/threads/:threadId` endpoint — rename or archive a thread
- [x] 4.4 Add `GET /api/threads/:threadId/messages` endpoint — fetch messages for a thread via `by_thread` GSI
- [x] 4.5 Update `POST /api/agent-runs/:runId/messages` to accept optional `threadId` in body, auto-create thread if not provided
- [x] 4.6 Update `GET /api/agent-runs/:runId/messages/stream` SSE endpoint to accept optional `threadId` query param and filter messages accordingly

## 5. Agent Responder Update

- [x] 5.1 Update `apps/orchestrator/src/agent-responder.ts` to load conversation history from thread (last 50 messages via `listMessagesByThread`) when `threadId` is present, falling back to `runId`-scoped history when absent

## 6. Frontend Hooks

- [x] 6.1 Create `useAgentThreads` hook — fetches and caches thread list for an agent+project pair using TanStack Query
- [x] 6.2 Update `useAgentChat` hook to accept optional `threadId` parameter, pass it to SSE URL and message POST body
- [x] 6.3 Create `useThreadMessages` hook — fetches messages for a thread via `GET /api/threads/:threadId/messages`

## 7. Frontend UI Components

- [x] 7.1 Create `ThreadListSidebar` component — collapsible sidebar showing thread list with title, last message time, message count, and "New conversation" button
- [x] 7.2 Add thread context menu to `ThreadListSidebar` — rename and archive actions
- [x] 7.3 Update `AgentChatPanel` to accept `threadId` prop, display thread title in header, and integrate with `ThreadListSidebar` in a side-by-side layout
- [x] 7.4 Add inline thread title editing in chat header (click to rename)
- [x] 7.5 Add empty state for no threads ("No conversations yet" + prompt to start)

## 8. Integration & Wiring

- [x] 8.1 Update project detail page to pass `threadId` through when opening agent chat from Mission Control or Log Viewer
- [x] 8.2 Wire agent profile page to show a "Conversations" section listing recent threads for that agent
- [x] 8.3 Ensure thread selection state persists across tab switches within the project detail page
