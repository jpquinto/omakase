## Architecture

### Overview

The agent workspace page provides a full-page file browser for inspecting agent working directories. It reuses the existing `WorkspaceExplorer` component (currently embedded in the chat sidebar) with minor adaptations to support browsing by agent name rather than requiring an active work session runId.

### Component Structure

```
/agents/[name]/workspace (page)
├── WorkspaceExplorer (existing, adapted)
│   ├── TreeEntry (recursive file tree)
│   └── FileViewer (file content display)
└── Project selector (dropdown to switch between project workspaces)
```

### Backend Approach

Add two new endpoints that mirror the existing work-session file endpoints but resolve the workspace path from agent name + project ID:

- `GET /api/agents/:agentName/workspace/files?projectId=X&path=/` — list directory
- `GET /api/agents/:agentName/workspace/file?projectId=X&path=/src/index.ts` — read file

These endpoints resolve the workspace directory as: `{LOCAL_WORKSPACE_ROOT}/work/{projectId}/` — the same path used by work sessions.

### Frontend Approach

Adapt `WorkspaceExplorer` to accept either `runId` (existing behavior) or `agentName + projectId` (new behavior) as props. The component internally switches which API endpoints it calls based on the props provided.

The page itself renders a full-width layout with a project selector at the top and the explorer filling the remaining space.

## File Changes

### New Files
- `apps/web/src/app/(app)/agents/[name]/workspace/page.tsx` — Workspace browser page

### Modified Files
- `apps/web/src/components/chat/workspace-explorer.tsx` — Accept `agentName + projectId` as alternative props, use new endpoints when provided
- `apps/orchestrator/src/index.ts` — Add workspace file listing/reading endpoints by agent name
- `apps/web/src/app/(app)/agents/[name]/page.tsx` — Add link to workspace page

## Decisions

- **Reuse WorkspaceExplorer** rather than building a new component — it already has tree rendering, lazy loading, file viewing, and path traversal protection
- **Agent-scoped endpoints** rather than generic workspace endpoints — maintains the agent-centric architecture and keeps permissions clear
- **Project selector on page** — agents may have workspaces for multiple projects, so the user needs to choose which one to browse
- **No write capability** — this is read-only browsing; file editing stays in chat work mode
