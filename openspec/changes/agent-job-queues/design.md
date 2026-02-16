## Architecture

### Queue Data Model

Each agent has a persistent job queue stored in a new DynamoDB table `omakase-agent-queues`.

**Table schema:**
- **PK**: `agentName` (string) — e.g., "miso", "nori", "koji", "toro"
- **SK**: `position#jobId` — zero-padded position for ordering (e.g., "0001#job-abc")
- **Attributes**: `jobId`, `agentName`, `projectId`, `featureId`, `prompt`, `threadId`, `status` (queued|processing|completed|failed), `queuedAt`, `startedAt`, `completedAt`, `queuedBy` (user|auto)

**GSI `by_status`**: `agentName` (PK) + `status` (SK) — for querying pending jobs per agent.

### Queue Manager (`queue-manager.ts`)

New orchestrator module that owns all queue operations:

```
class AgentQueueManager {
  enqueue(agentName, job): QueuedJob       // Add job to end of agent's queue
  dequeue(agentName): QueuedJob | null     // Get and mark next job as processing
  peek(agentName): QueuedJob | null        // View next job without consuming
  remove(agentName, jobId): void           // Remove a queued job
  reorder(agentName, jobId, newPos): void  // Move a job to a different position
  getQueue(agentName): QueuedJob[]         // List all queued jobs for an agent
  getQueueDepth(agentName): number         // Count of queued jobs
  markCompleted(agentName, jobId): void    // Mark job as completed
  markFailed(agentName, jobId, error): void // Mark job as failed
}
```

### Dispatch Flow Change

**Before (current):**
1. User dispatches to agent → check if busy → reject with error if busy → start work session if idle

**After (with queue):**
1. User dispatches to agent → check if busy → if busy, enqueue job and return queue position → if idle, start work session immediately
2. When work session completes → `AgentQueueManager.dequeue()` → if job exists, auto-start next work session

### Pipeline Integration

The `FeatureWatcher` currently skips features when concurrency limits are reached. With queues:

1. **Auto-dispatch features**: When `FeatureWatcher` finds ready features but agents are busy, it enqueues them into the appropriate agent's queue (architect first, as the pipeline entry point).
2. **Pipeline completion hook**: When a pipeline step completes, before releasing the concurrency slot, check the queue for the next job.
3. **Queue-aware concurrency**: The `ConcurrencyManager` treats queued jobs as "planned" — the queue depth is visible but doesn't count against concurrency limits (only actively running jobs do).

### Work Session Completion → Queue Check

The `WorkSessionManager` needs a completion callback:

```
onSessionComplete(agentName: string, runId: string) {
  queueManager.markCompleted(agentName, runId);
  const nextJob = queueManager.dequeue(agentName);
  if (nextJob) {
    // Auto-start next work session
    startWorkSession(agentName, nextJob);
  }
}
```

This replaces the current fire-and-forget behavior where completed sessions just end.

## Key Decisions

### Queue per agent, not per project
Jobs are queued per-agent because each agent has exactly one Claude Code subprocess capacity. A per-project queue wouldn't solve the bottleneck — the constraint is the agent's ability to run one task at a time.

### DynamoDB for persistence (not in-memory)
The current `ConcurrencyManager` is in-memory and resets on restart. The queue must survive orchestrator restarts so queued jobs aren't lost. DynamoDB provides this durability with minimal complexity.

### Position-based ordering with sort keys
Using zero-padded position numbers in the sort key (`0001#job-abc`) enables efficient ordered queries and reordering. When a user reorders, we update the position prefix in the sort key. Gap numbering (10, 20, 30...) allows inserts between positions without renumbering.

### Optimistic dispatch UX
When dispatching to a busy agent, the frontend shows immediate feedback: "Queued as #N for {agentName}" rather than an error. The dispatch hook returns `{ queued: true, position: N }` instead of throwing.

## API Endpoints

### New endpoints
- `GET /api/agents/:agentName/queue` — List queued jobs for an agent
- `POST /api/agents/:agentName/queue` — Enqueue a new job
- `DELETE /api/agents/:agentName/queue/:jobId` — Remove a queued job
- `PATCH /api/agents/:agentName/queue/:jobId` — Reorder a queued job (body: `{ position: number }`)
- `GET /api/agents/queues` — Get all agents' queue summaries (depths + next job)

### Modified endpoints
- `GET /api/agents/status` — Extended to include `queueDepth` and `nextJob` per agent
- `POST /api/agents/:agentName/work-sessions` — Falls through to enqueue if agent is busy (instead of 409)
- `POST /api/features/:featureId/assign` — Enqueues if agent is busy (instead of 409)

## File Changes

### New files
- `apps/orchestrator/src/queue-manager.ts` — AgentQueueManager class
- `packages/dynamodb/src/repositories/agent-queues.ts` — DynamoDB operations for queue table
- `apps/web/src/hooks/use-agent-queue.ts` — React hook for queue data
- `apps/web/src/components/agent-queue-list.tsx` — Queue list UI component

### Modified files
- `apps/orchestrator/src/index.ts` — New queue API endpoints, modified dispatch/assign endpoints
- `apps/orchestrator/src/work-session-manager.ts` — Completion callback to check queue
- `apps/orchestrator/src/feature-watcher.ts` — Queue features instead of silently skipping
- `apps/orchestrator/src/concurrency.ts` — Queue-aware concurrency checks
- `apps/web/src/hooks/use-agent-dispatch.ts` — Queue fallback instead of busy error
- `apps/web/src/hooks/use-agent-status.ts` — Include queue depth in status polling
- `apps/web/src/components/agent-mission-control.tsx` — Show queue depth on agent cards
- `apps/web/src/app/(app)/agents/[name]/page.tsx` — Show queue list on agent profile
- `packages/db/src/types.ts` — QueuedJob type, extended AgentLiveStatus
- `packages/dynamodb/src/index.ts` — Export queue repository
