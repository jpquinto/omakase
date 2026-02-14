## Why

Work mode exists in the UI (ConversationModeSelector, useAgentChat work-session path, WorkSessionManager) but is non-functional for real work. When a user starts a work session, Claude Code spawns in `${localWorkspaceRoot}/${projectId}` — a directory that has no git clone, no dependencies installed, no agent CLAUDE.md, and no project context. The agent can't read files, explore the codebase, or do any meaningful work because the workspace is empty.

## What Changes

- **Workspace provisioning for work sessions**: Before spawning Claude Code, clone the project repo (or reuse an existing clone), install dependencies, and set up the workspace — reusing the same `agent-setup.sh` flow that pipeline agents use.
- **Project repo URL resolution**: Look up the project's `repoUrl` from DynamoDB when starting a work session, so the workspace can be cloned without the frontend needing to know the URL.
- **Agent context injection**: Copy the agent's role-specific CLAUDE.md to the workspace root, inject personality, and inject project-scoped memories — the same Steps 2/2b/2c from `agent-entrypoint.sh`.
- **Persistent work workspace**: Use `${localWorkspaceRoot}/work/${projectId}` as a persistent workspace that survives across work sessions. Subsequent sessions for the same project skip the clone and reuse the existing repo (fetch + skip install if lockfiles unchanged).
- **Work session resume on reconnect**: When a user opens a thread that has an active work session, reconnect to that session's stream instead of starting a new one.

## Capabilities

### New Capabilities
- `work-session-workspace`: Workspace provisioning, agent context injection, and lifecycle management for interactive work sessions. Covers repo cloning, dependency caching, CLAUDE.md setup, and persistent workspace across sessions.

### Modified Capabilities
- `agent-chat`: Work mode message routing needs the project's `repoUrl` resolved from DynamoDB before starting the work session. The frontend needs to reconnect to an existing active session when revisiting a work-mode thread.

## Impact

- **`apps/orchestrator/src/work-session-manager.ts`**: Major changes — add workspace provisioning before spawning Claude Code, resolve repo URL from DynamoDB, inject agent context.
- **`apps/orchestrator/src/index.ts`**: Work session start route needs to look up project repo URL. May need a "reconnect to existing session" endpoint.
- **`apps/web/src/hooks/use-agent-chat.ts`**: Handle session reconnection when opening a thread with an active work session.
- **`packages/dynamodb/`**: Need to read project `repoUrl` from the projects table (may already exist).
- **`apps/orchestrator/src/agent-setup.sh`**: Reused as-is for workspace setup (already supports shared workspace with lockfile caching).
