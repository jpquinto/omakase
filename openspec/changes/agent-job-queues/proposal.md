## Why

Currently, when an agent is busy working on a task, any new dispatch attempt is rejected with a "busy" error. Features pending in the system simply wait for the next 30-second poll cycle to check availability again. There is no visibility into what work is queued for each agent, and users have no way to line up multiple tasks for an agent to process sequentially. This creates friction — users must manually wait and retry, and there's no way to batch-assign work across agents.

## What Changes

- **Per-agent job queue**: Each agent (Miso, Nori, Koji, Toro) gets a persistent job queue stored in DynamoDB. When a job is dispatched to a busy agent, it's added to their queue instead of being rejected.
- **Queue processing**: When an agent finishes a job, it automatically checks its queue and starts the next pending job. This replaces the current "skip and wait for next poll" behavior.
- **Queue-aware dispatch**: The dispatch hook and API endpoint accept jobs for busy agents, enqueuing them instead of returning a busy error. The frontend dispatch flow shows queue position feedback.
- **Frontend queue visibility**: Agent cards, mission control, and the agent profile page show the current job queue for each agent — what's running now and what's queued next.
- **Queue management**: Users can reorder or remove jobs from an agent's queue before they start processing.
- **Pipeline integration**: The FeatureWatcher and concurrency manager work with the queue system so auto-dispatched features respect queue ordering.

## Capabilities

### New Capabilities
- `agent-job-queue`: Core queue data model, enqueue/dequeue operations, queue processing lifecycle, DynamoDB persistence, and queue management API endpoints
- `agent-queue-ui`: Frontend components showing per-agent job queues — queue cards on mission control, queue list on agent profile pages, queue position indicators on dispatch, and queue management (reorder/remove)

### Modified Capabilities
- `agent-dispatch`: Dispatch hook and API reworked to enqueue jobs for busy agents instead of rejecting. Busy guard becomes a queue-add operation.
- `agent-status-tracking`: Agent status endpoint extended to include queue depth and next queued job info alongside current working status.
- `ticket-dispatch-status-integration`: Ticket assignment popover shows queue position when dispatching to a busy agent. Ticket rows show queue position for queued features.
- `manual-agent-assignment`: Assignment to busy agents succeeds by adding to queue instead of returning 409. Concurrency limit check becomes queue-aware.

## Impact

- **Backend (orchestrator)**: New DynamoDB table `omakase-agent-queues` for queue persistence. New queue manager module. Modified FeatureWatcher, ConcurrencyManager, dispatch endpoints, and agent status endpoint.
- **Frontend (web)**: Modified `useAgentDispatch` hook, `useAgentStatus` hook, agent mission control, agent profile pages, ticket assignment popover. New queue UI components.
- **DynamoDB**: New table with GSI for per-agent queue ordering.
- **No breaking changes**: Existing dispatch still works — it just enqueues instead of rejecting when busy.
