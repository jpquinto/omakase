## Why

Agent conversations are currently ephemeral — each chat is tied to a single `runId` and disappears once the run ends. Users have no way to review past conversations with an agent or continue a discussion across runs. Chat history grouped into threads per agent gives users persistent context and lets them pick up where they left off.

## What Changes

- Introduce **conversation threads** as a first-class concept — each thread groups messages for a specific agent, independent of individual runs
- Add a **chat history sidebar** alongside the existing chat panel showing all past threads for the current agent
- Store threads in a new DynamoDB table with agent-scoped partitioning
- Allow users to **create new threads** and **switch between threads** within the chat UI
- Messages within a thread persist across agent runs — a new run on the same feature can continue an existing thread
- Threads are scoped per agent (each of the four agents — Miso, Nori, Koji, Toro — has their own thread history)

## Capabilities

### New Capabilities
- `agent-chat-threads`: Thread data model, CRUD operations, DynamoDB table, and API endpoints for creating/listing/archiving conversation threads per agent
- `agent-chat-history-ui`: Chat history sidebar component, thread list, thread switching, and integration with the existing chat panel

### Modified Capabilities
- `agent-chat`: Messages now belong to a thread (via `threadId`) rather than only a `runId`. Chat panel updated to display thread context and allow thread selection.
- `agent-message-streaming`: SSE stream scoped to a thread instead of (or in addition to) a run. Hook updated to accept `threadId`.

## Impact

- **DynamoDB**: New `agent-threads` table; `agent-messages` table gets a `threadId` attribute and a new GSI (`by_thread`)
- **Orchestrator API**: New thread CRUD endpoints; existing message endpoints updated to support `threadId` parameter
- **Frontend**: New chat history sidebar component; `AgentChatPanel` updated to show thread context; `useAgentChat` hook updated to work with threads; agent profile pages gain a "Conversations" section
- **Agent responder**: Loads conversation history from thread instead of just the current run
- **Shared types**: New `AgentThread` type definition
