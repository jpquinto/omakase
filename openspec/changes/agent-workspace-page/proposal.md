## Why

The agent workspace file explorer currently only appears as a sidebar within the chat interface, and only when a work session is active. There's no way to browse the full workspace directory structure outside of an active chat session — users can't inspect what files agents have created, review workspace state between sessions, or explore the cloned repository contents independently. A dedicated workspace page would provide persistent visibility into each agent's working directory.

## What Changes

- Add a new `/agents/[name]/workspace` page that renders a full-page file explorer for the agent's workspace
- Add a backend endpoint to list workspace directories and files by agent name (not requiring an active work session runId)
- Reuse the existing `WorkspaceExplorer` component from the chat interface, adapted for standalone use
- Add navigation link to the workspace page from the agent profile page

## Capabilities

### New Capabilities
- `agent-workspace-browser`: Full-page workspace file browser for viewing agent working directories, file contents, and directory structure outside of active work sessions

### Modified Capabilities

## Impact

- **Frontend**: New page at `apps/web/src/app/(app)/agents/[name]/workspace/page.tsx`, minor modifications to `WorkspaceExplorer` component to support both runId-based and agent-name-based browsing
- **Backend**: New endpoint `GET /api/agents/:agentName/workspace/files` and `GET /api/agents/:agentName/workspace/file` that resolve the workspace path from agent name + project context instead of requiring a runId
- **No breaking changes**: Existing chat-based workspace explorer continues to work unchanged
