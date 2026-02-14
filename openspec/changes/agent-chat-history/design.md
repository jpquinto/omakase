## Context

Agent conversations are currently scoped to a single `runId`. When an agent run ends, the conversation is effectively closed — there is no way to browse past conversations or continue a thread across runs. Messages live in the `agent-messages` DynamoDB table keyed by `runId` + `timestamp`.

Users want to see a history of their conversations with each agent (Miso, Nori, Koji, Toro) and organize them into threads. A thread is a persistent conversation container that can span multiple agent runs and exists independently of any single run lifecycle.

## Goals / Non-Goals

**Goals:**
- Introduce a `thread` concept that groups messages into named conversations per agent
- Provide a chat history sidebar showing all threads for the active agent
- Allow users to switch between threads, create new threads, and archive old ones
- Persist threads across agent runs — new runs can continue existing threads
- Keep the existing run-scoped message flow working (backward-compatible)

**Non-Goals:**
- Multi-agent threads (a thread belongs to exactly one agent)
- Cross-project threads (threads are scoped to a project + agent pair)
- Full-text search across threads
- Thread sharing between users
- Message editing or deletion within threads

## Decisions

### 1. Thread data model — new DynamoDB table

**Decision:** Create a new `agent-threads` table rather than overloading the existing `agent-messages` table.

**Rationale:** Threads are a distinct entity with their own lifecycle (create, archive, rename). Mixing thread metadata into the messages table would complicate queries and violate single-responsibility. A dedicated table keeps the partition design clean.

**Schema:**
- Partition key: `agentName` (String) — e.g., "miso", "nori"
- Sort key: `threadId` (String, ULID) — chronological ordering by creation
- Attributes: `projectId`, `title`, `status` ("active" | "archived"), `lastMessageAt`, `messageCount`, `createdAt`, `updatedAt`
- GSI `by_project`: Partition = `projectId`, Sort = `lastMessageAt` — list threads for a project ordered by recency

**Alternatives considered:**
- Composite key `projectId#agentName` as partition → rejected because it makes listing all threads for an agent across projects harder and the access pattern is primarily per-agent within a project.

### 2. Linking messages to threads — `threadId` attribute on messages

**Decision:** Add an optional `threadId` field to `AgentMessage`. New messages include it; legacy messages without it still work (backward-compatible).

**Rationale:** This is the lightest-weight change. Adding a new GSI `by_thread` (partition=`threadId`, sort=`timestamp`) enables efficient thread-scoped queries without changing the existing `runId`-based access pattern.

**Migration:** No backfill required. Existing messages remain queryable by `runId`. The UI shows them under a "Legacy" label if no `threadId` is present.

### 3. Thread creation — automatic on first message if none selected

**Decision:** When a user opens chat for an agent and no active thread is selected, a new thread is auto-created with a default title ("New conversation"). Users can rename it later.

**Rationale:** Reduces friction. Users don't have to explicitly create a thread before chatting. The auto-creation pattern matches Slack/ChatGPT behavior.

### 4. UI layout — sidebar + chat panel

**Decision:** Add a collapsible thread list sidebar to the left of the existing `AgentChatPanel`. The sidebar shows thread titles, timestamps, and message counts. Clicking a thread loads its messages into the chat panel.

**Layout:**
```
┌──────────────────────────────────────────────────┐
│ Agent Chat Header (agent name, close button)     │
├──────────────┬───────────────────────────────────┤
│ Thread List  │  Chat Messages                    │
│              │                                   │
│ > Thread 1   │  [message bubbles...]             │
│   Thread 2   │                                   │
│   Thread 3   │                                   │
│              │                                   │
│ [+ New]      │  [input field]                    │
└──────────────┴───────────────────────────────────┘
```

**Rationale:** Side-by-side layout keeps the conversation visible while browsing history. Collapsible sidebar means the chat panel can go full-width when history isn't needed.

### 5. Agent responder context — load from thread

**Decision:** The agent responder loads conversation history from the thread (via `threadId`) rather than the run. This gives agents persistent memory across runs.

**Rationale:** The whole point of threads is continuity. If the agent only sees the current run's messages, thread history is cosmetic only. Loading the full thread gives agents real context.

**Safeguard:** Cap context to the last 50 messages to avoid token overflow. Summarize older messages if thread grows large (future enhancement, not in scope now).

### 6. Thread scoping — per project + per agent

**Decision:** Threads are scoped to a `(projectId, agentName)` pair. The thread list in the sidebar only shows threads for the current project and the selected agent.

**Rationale:** Agents work on features within a project. Cross-project threads don't make sense given the agent pipeline is project-scoped.

## Risks / Trade-offs

- **Backward compatibility**: Existing messages lack `threadId`. → Mitigation: `threadId` is optional. Legacy messages are still accessible via `runId` queries. UI shows a "Previous runs" section for un-threaded messages.
- **Thread sprawl**: Users may accumulate many threads. → Mitigation: Auto-archive threads with no messages for 30 days. Archive action in UI. Default sort by `lastMessageAt` keeps recent threads visible.
- **Context window bloat**: Loading full thread history for agent responses could exceed token limits. → Mitigation: Cap at 50 most recent messages per thread for agent context. Display all messages in UI regardless.
- **DynamoDB costs**: New table + new GSI on messages table. → Mitigation: Thread metadata is small. The `by_thread` GSI only projects necessary attributes. Negligible cost increase for expected message volumes.
