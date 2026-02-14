## Context

Omakase agents run as isolated ECS Fargate tasks orchestrated by a Bun/Elysia backend. The frontend (Next.js 15) displays agent status and logs via mock data, with no real-time connection or bidirectional communication. The backend stores agent run records in DynamoDB (`agent-runs` table) with status, output summary, and error fields — but no message history. Users currently have no way to interact with agents during execution.

The frontend uses a tabbed project detail page (`/projects/[id]`) with Kanban, Graph, Agents (mission control), Logs, and Settings tabs. The design system follows a "liquid glass" neobrutalism aesthetic with `glass` surfaces, `oma-*` color tokens, and Instrument Serif / Outfit typography.

## Goals / Non-Goals

**Goals:**
- Enable users to send text messages to running agents and receive responses in real time
- Persist chat history per agent run so conversations survive page reloads
- Stream agent output and chat responses to the frontend with sub-second latency
- Integrate the chat panel naturally into the existing project detail page without disrupting existing workflows
- Follow the Omakase liquid glass design system for all new UI components

**Non-Goals:**
- Multi-user collaboration (one user chatting at a time per agent is sufficient)
- Rich media in messages (images, file attachments) — text only for now
- Voice or audio interaction with agents
- Modifying the ECS task definition or agent Docker image (communication happens through the orchestrator as a relay)
- Chat with agents that are not currently running (historical chat is read-only)

## Decisions

### 1. SSE over WebSocket for real-time streaming

**Decision:** Use Server-Sent Events (SSE) from the orchestrator to the frontend for streaming agent messages and output.

**Rationale:** SSE is simpler than WebSocket for this use case — the primary flow is server-to-client streaming (agent output). User messages are infrequent and fit naturally as REST POST calls. Elysia has native SSE support via generators. SSE auto-reconnects, works through HTTP/2, and doesn't require a separate WebSocket server or connection upgrade. WebSocket would add complexity (heartbeats, reconnect logic, protocol handling) without a clear benefit since we don't need high-frequency bidirectional streaming.

**Alternative considered:** WebSocket — better for high-frequency bidirectional communication, but overkill here. The user sends occasional messages (POST), and the agent streams output (SSE). Mixing these two patterns keeps each simple.

### 2. Orchestrator as message relay (not direct agent communication)

**Decision:** The frontend communicates with agents exclusively through the orchestrator. Messages are stored in DynamoDB and relayed to agents. Agents post responses back to the orchestrator, which streams them to the frontend via SSE.

**Rationale:** Agents run as ephemeral ECS Fargate tasks with no stable network address. Direct frontend-to-agent communication would require service discovery, load balancing, and exposing agent containers. Using the orchestrator as a relay keeps the architecture simple — the orchestrator already manages agent lifecycle and DynamoDB access.

**Flow:**
1. User sends message → `POST /api/agent-runs/:runId/messages` → stored in DynamoDB
2. Agent polls orchestrator → `GET /api/agent-runs/:runId/messages?since=<timestamp>` → receives pending messages
3. Agent posts response → `POST /api/agent-runs/:runId/messages` (with `sender: "agent"`) → stored in DynamoDB
4. Frontend receives response via SSE stream → `GET /api/agent-runs/:runId/messages/stream`

**Alternative considered:** Direct agent-to-frontend WebSocket — rejected due to ephemeral nature of ECS tasks and added networking complexity.

### 3. Separate `agent-messages` DynamoDB table

**Decision:** Create a new `agent-messages` table rather than embedding messages in the `agent-runs` table.

**Rationale:** Messages are an unbounded, append-only list. Embedding them in `agent-runs` items would hit DynamoDB's 400KB item limit for long conversations. A separate table with `runId` as partition key and `timestamp` as sort key gives efficient range queries ("all messages since X"), natural ordering, and independent scaling. GSI on `featureId` allows fetching all messages for a feature across agent runs.

**Schema:**
```
Table: omakase-agent-messages
  PK: runId (string)
  SK: timestamp (string, ISO 8601)
  Attributes: id, featureId, projectId, sender ("user" | "agent"), role (AgentRunRole), content (string), type ("message" | "status" | "error")
  GSI: by_feature (featureId → timestamp)
```

### 4. Chat panel as slide-out sidebar on the project detail page

**Decision:** The chat panel renders as a right-side slide-out panel that overlays the current tab content, triggered by clicking an agent card in Mission Control or an agent name in the Log Viewer.

**Rationale:** A sidebar avoids navigating away from the current view (kanban, graph, agents, logs) while chatting. It maintains spatial context — the user can see agent status and chat simultaneously. This pattern is common in tools like Linear, Slack, and GitHub. The panel can be dismissed to return to full-width content.

**Alternative considered:** A new "Chat" tab — rejected because it forces a context switch and hides the current agent view. A modal — rejected because it blocks interaction with the underlying page. The sidebar is the best balance of visibility and non-disruption.

### 5. Agent-side polling with configurable interval

**Decision:** Agents poll the orchestrator for new messages at a configurable interval (default: 5 seconds) via a lightweight HTTP endpoint.

**Rationale:** ECS Fargate tasks are stateless containers. Adding a message-checking loop to the agent entrypoint is the simplest integration path — no changes to the ECS task definition or Docker image needed. The orchestrator exposes a simple `GET` endpoint that returns messages since a timestamp. A 5-second poll interval balances responsiveness with API load. Agents can also check for messages at natural breakpoints (between pipeline steps).

**Alternative considered:** SQS queue per agent — more scalable but adds AWS resource management complexity and cost. For the expected message volume (a few messages per agent run), HTTP polling is adequate.

## Risks / Trade-offs

**[Agent responsiveness depends on poll interval]** → Users may wait up to 5 seconds for their message to be seen by the agent. Mitigation: configurable poll interval, and agents also check between pipeline steps. For v1 this is acceptable.

**[SSE connection limits]** → Browsers limit SSE connections per domain (~6 for HTTP/1.1). If a user has many agent panels open, connections may be exhausted. Mitigation: multiplex multiple agent streams into a single SSE connection per project, or use HTTP/2 (no per-domain limit).

**[Agent output volume]** → Verbose agent output could generate large message volumes. Mitigation: chunk agent output into reasonable sizes (e.g., one message per meaningful step, not per line). Summarize in the agent-side message posting.

**[No offline message delivery]** → If the frontend disconnects and reconnects, it needs to catch up on missed messages. Mitigation: SSE reconnect fetches messages since the last received timestamp from DynamoDB. Messages are persistent, so no data is lost.

**[Mock data transition]** → Agent Mission Control and Log Viewer currently use mock data. The chat feature depends on real agent run data. Mitigation: the chat panel can work with mock data initially, and the wire-up to real data is a separate concern tracked in the realtime-dashboard capability.
