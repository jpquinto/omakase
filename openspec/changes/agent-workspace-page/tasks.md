# Tasks: agent-workspace-page

## Group 1: Backend — Workspace File Endpoints

- [x] 1.1: Add `GET /api/agents/:agentName/workspace/files` endpoint to `apps/orchestrator/src/index.ts` — resolves workspace path as `{LOCAL_WORKSPACE_ROOT}/work/{projectId}/`, lists directory entries excluding `.git`, `node_modules`, `.next`, `.claude`, `__pycache__`, `.turbo`. Returns `{ entries: [{ name, type, size, modifiedAt }] }`. Includes path traversal prevention. Returns 404 if workspace directory doesn't exist.
- [x] 1.2: Add `GET /api/agents/:agentName/workspace/file` endpoint to `apps/orchestrator/src/index.ts` — reads file content from workspace. Query params: `projectId`, `path`. Returns `{ content, path, size }`. 100KB max file size limit. Path traversal prevention.

## Group 2: Frontend — Adapt WorkspaceExplorer Component

- [x] 2.1: Modify `apps/web/src/components/chat/workspace-explorer.tsx` to accept an alternative prop shape: `{ agentName: string; projectId: string }` alongside the existing `{ runId: string }`. When `agentName + projectId` are provided, use `/api/agents/:agentName/workspace/files` and `/api/agents/:agentName/workspace/file` endpoints instead of the work-session endpoints. Extract the API URL logic into a helper so both modes share the same tree/viewer code.

## Group 3: Frontend — Workspace Page

- [x] 3.1: Create `apps/web/src/app/(app)/agents/[name]/workspace/page.tsx` — full-page workspace browser. Includes a project selector dropdown at the top (fetches projects from `/api/projects`) and renders `WorkspaceExplorer` with the selected `agentName + projectId`. Use the frontend-design skill for the page layout and styling.
- [x] 3.2: Add a "Workspace" navigation link on the agent profile page `apps/web/src/app/(app)/agents/[name]/page.tsx` — button or link that navigates to `/agents/[name]/workspace`
