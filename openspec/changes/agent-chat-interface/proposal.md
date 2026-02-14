## Why

Omakase agents currently run as isolated ECS tasks with no way for users to interact with them during execution. Users can only observe status updates (started/thinking/coding/completed) and view mock log output. There is no mechanism for a developer to ask an agent a clarifying question, redirect its approach, provide additional context, or review intermediate output in real time. A chat interface would close this feedback loop, turning the autonomous pipeline into a collaborative one where humans can steer agents when needed.

## What Changes

- Add a new **chat panel component** to the frontend that allows users to send messages to running agents and receive responses in real time
- Add a **messages data layer** (DynamoDB table + CRUD operations) to persist chat history between users and agent runs
- Add **chat API endpoints** to the orchestrator for sending/receiving messages and streaming updates
- Add a **WebSocket or SSE connection** for real-time message delivery from agents to the frontend
- Integrate the chat panel into the **project detail page** as a slide-out sidebar accessible from Agent Mission Control and Log Viewer
- Modify the **agent entrypoint** to check for and respond to user messages during execution

## Capabilities

### New Capabilities
- `agent-chat`: Bidirectional messaging between users and running agents, including message persistence, real-time delivery, and chat UI
- `agent-message-streaming`: Real-time streaming of agent output and chat messages to the frontend via WebSocket or SSE

### Modified Capabilities
- `realtime-dashboard`: Add chat panel integration to the agent activity view — clicking an agent card or log entry opens the chat sidebar
- `autonomous-agent-team`: Extend agent execution to periodically check for and respond to user messages, adding a communication channel alongside the existing status update mechanism

## Impact

- **Frontend (`apps/web/`)**: New chat panel component, WebSocket hook, modifications to project detail page layout, agent mission control, and log viewer for chat entry points
- **Backend (`apps/orchestrator/`)**: New message API endpoints, WebSocket/SSE server setup, message routing to ECS tasks
- **Database (`packages/db/` + DynamoDB)**: New `agent-messages` table schema, message CRUD operations, GSIs for feature-based and time-based queries
- **Agent runtime**: Modified entrypoint or wrapper to poll for messages and inject them into the agent's context
- **Dependencies**: May need `ws` or similar WebSocket library for the orchestrator; frontend may need a WebSocket client hook
