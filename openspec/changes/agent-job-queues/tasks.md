# Tasks: agent-job-queues

## Group 1: Data Model & Types

- [x] 1.1: Add `QueuedJob` type to `packages/db/src/types.ts` with fields: `jobId`, `agentName`, `projectId`, `featureId`, `prompt`, `threadId`, `status` (queued|processing|completed|failed), `queuedAt`, `startedAt`, `completedAt`, `queuedBy` (user|auto), `position`
- [x] 1.2: Extend `AgentLiveStatus` type in `packages/db/src/types.ts` to include optional `queueDepth: number` and `nextJob?: { jobId: string; prompt: string; queuedAt: string }` fields
- [x] 1.3: Add dispatch result union type: `DispatchResult = { queued: false; runId: string; threadId: string } | { queued: true; position: number; jobId: string }`

## Group 2: DynamoDB Queue Repository

- [x] 2.1: Create `packages/dynamodb/src/repositories/agent-queues.ts` with functions: `enqueueJob(job)`, `dequeueJob(agentName)`, `peekJob(agentName)`, `removeJob(agentName, jobId)`, `reorderJob(agentName, jobId, newPosition)`, `listQueue(agentName)`, `getQueueDepth(agentName)`, `markJobCompleted(agentName, jobId)`, `markJobFailed(agentName, jobId, error)`. Use DynamoDB table `omakase-agent-queues` with `agentName` PK and position-based SK with gap numbering (10, 20, 30...).
- [x] 2.2: Export queue repository from `packages/dynamodb/src/index.ts`

## Group 3: Queue Manager (Orchestrator)

- [x] 3.1: Create `apps/orchestrator/src/queue-manager.ts` — `AgentQueueManager` class that wraps the DynamoDB repository with in-memory caching and orchestration logic. Methods: `enqueue()`, `dequeue()`, `peek()`, `remove()`, `reorder()`, `getQueue()`, `getQueueDepth()`, `processNext(agentName)` which dequeues and starts a work session
- [x] 3.2: Integrate `AgentQueueManager` into the orchestrator's main `index.ts` — instantiate at startup, pass to relevant handlers

## Group 4: Backend API Endpoints

- [x] 4.1: Add `GET /api/agents/:agentName/queue` endpoint — returns ordered array of queued jobs for an agent
- [x] 4.2: Add `POST /api/agents/:agentName/queue` endpoint — enqueues a new job, returns `{ jobId, position }`
- [x] 4.3: Add `DELETE /api/agents/:agentName/queue/:jobId` endpoint — removes a queued job
- [x] 4.4: Add `PATCH /api/agents/:agentName/queue/:jobId` endpoint — reorders a job (body: `{ position: number }`)
- [x] 4.5: Add `GET /api/agents/queues` endpoint — returns all agents' queue summaries (depth + next job)

## Group 5: Modified Backend Endpoints

- [x] 5.1: Modify `POST /api/agents/:agentName/work-sessions` — when agent is busy, enqueue the job and return HTTP 202 with `{ queued: true, position, jobId }` instead of starting a session. When idle, start session as before.
- [x] 5.2: Modify `POST /api/features/:featureId/assign` — when agent is busy or concurrency limit reached, enqueue instead of returning 409/429. Return HTTP 202 with queue position.
- [x] 5.3: Modify `GET /api/agents/status` — include `queueDepth` and `nextJob` in each agent's status response by querying the queue manager.

## Group 6: Work Session Completion → Queue Processing

- [x] 6.1: Add completion callback to `WorkSessionManager` — when a session completes (success or failure), call `queueManager.processNext(agentName)` to auto-start the next queued job
- [x] 6.2: Modify `FeatureWatcher` — when ready features are found but agents are at capacity, enqueue them via `AgentQueueManager` instead of silently skipping. Log "Feature {id} queued for pipeline" instead of skipping.

## Group 7: Frontend — Queue Hook & Dispatch Changes

- [x] 7.1: Create `apps/web/src/hooks/use-agent-queue.ts` — `useAgentQueue(agentName?)` hook that polls `GET /api/agents/:agentName/queue` (or `/api/agents/queues` for all). Returns `{ queue, isLoading, removeJob, reorderJob, refetch }`
- [x] 7.2: Modify `apps/web/src/hooks/use-agent-dispatch.ts` — remove the busy guard that throws an error. Instead, when agent is busy, call `POST /api/agents/:agentName/queue` to enqueue. Return `{ queued: true, position }` to the caller. Show success toast "Queued as #N" instead of busy error.
- [x] 7.3: Modify `apps/web/src/hooks/use-agent-status.ts` — parse and expose `queueDepth` from the status response for each agent

## Group 8: Frontend — Mission Control Queue Display

- [x] 8.1: Modify `apps/web/src/components/agent-mission-control.tsx` — add queue depth badge on agent cards when agent is working and has queued jobs. Show "+N queued" with the agent's color below the current task indicator. Use the frontend-design skill for the queue badge component styling.

## Group 9: Frontend — Agent Profile Queue List

- [x] 9.1: Create queue list component `apps/web/src/components/agent-queue-list.tsx` — displays ordered list of queued jobs with position number, prompt summary (truncated), project name, time since queued, and a remove button. Include drag-to-reorder or up/down arrow controls. Empty state shows "No jobs queued". Use the frontend-design skill for the component styling.
- [x] 9.2: Add queue list component to agent profile page `apps/web/src/app/(app)/agents/[name]/page.tsx` — render the `AgentQueueList` in a new "Job Queue" section on the agent profile page

## Group 10: Frontend — Ticket Dispatch Integration

- [x] 10.1: Modify ticket assignment popover — when an agent is busy, show the row as selectable with "Queue (#N)" label instead of disabling it. Selecting a busy agent enqueues the feature and shows a success toast.
- [x] 10.2: Modify ticket rows — for features that are queued (not yet actively processing), show "Queued #N for {agentEmoji}" badge in the agent's color instead of just "In Progress"
