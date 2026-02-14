## Context

Work mode has UI and backend infrastructure in place: `ConversationModeSelector` toggles between chat/work, `useAgentChat` routes first work-mode messages to `POST /api/agents/:agentName/work-sessions`, and `WorkSessionManager` spawns `claude --output-format stream-json` with stdin/stdout communication. However, `WorkSessionManager.startSession()` sets `cwd` to `${localWorkspaceRoot}/${projectId}` — a directory with no repo clone, no dependencies, and no agent context. Claude Code opens in an empty directory and cannot do meaningful work.

Pipeline agents (architect/coder/reviewer/tester) get full workspace setup through `agent-entrypoint.sh` → `agent-setup.sh`: git clone, branch checkout, dependency install, CLAUDE.md copy, personality injection, memory injection. Work sessions need the same setup but adapted for interactive use (no feature branch, no automated prompts, no git push).

Key existing infrastructure:
- `agent-setup.sh` — handles clone-or-fetch, branch checkout, lockfile-cached dependency install
- `agent-entrypoint.sh` Steps 2/2b/2c — CLAUDE.md copy, personality prepend, memory injection
- `WorkSessionManager` — Claude Code subprocess lifecycle, stream-JSON parsing, SSE emission
- `useAgentChat` — work session start/message/end flow on frontend

## Goals / Non-Goals

**Goals:**
- Work mode spawns Claude Code in a fully provisioned workspace with the project's source code
- Agent context (CLAUDE.md, personality, memories) is injected so the agent has its role's persona
- Workspace is persistent across sessions — second session for same project skips clone/install
- Frontend reconnects to an active work session when revisiting a work-mode thread
- Reuse existing `agent-setup.sh` for workspace provisioning (don't duplicate clone/install logic)

**Non-Goals:**
- Feature branch management — work sessions operate on the project's default branch, not feature branches
- Git push from work sessions — interactive work stays local, user decides when to push
- ECS-based work sessions — work mode is local-only (same as current)
- File browser UI — this change is about making the existing chat-based work mode functional, not adding new UI widgets
- Multi-project workspaces — one workspace per project

## Decisions

### 1. Workspace path: `${localWorkspaceRoot}/work/${projectId}`

Separate from pipeline workspaces (`${localWorkspaceRoot}/${featureId}`) to avoid conflicts. Pipeline workspaces are per-feature and may be on a feature branch; work workspaces are per-project and stay on the default branch.

**Alternative considered**: Reuse pipeline workspace. Rejected because pipeline workspaces are tied to feature branches and may have dirty state from agent runs.

### 2. Workspace setup via shell script, not TypeScript

Extract a reusable `work-setup.sh` that calls `agent-setup.sh` for clone/deps, then does agent context injection (CLAUDE.md, personality, memories). This mirrors the entrypoint pattern and keeps workspace setup in bash where git/npm commands run natively.

**Alternative considered**: Port setup logic to TypeScript in `WorkSessionManager`. Rejected because `agent-setup.sh` already handles all the edge cases (lockfile detection, shallow clone, package manager detection) and we'd be duplicating 100+ lines of tested shell logic.

### 3. Resolve repo URL from DynamoDB at session start

The `POST /api/agents/:agentName/work-sessions` route already receives `projectId`. Look up the project in DynamoDB to get `repoUrl`. Fail fast with a clear error if the project has no repo URL configured.

### 4. Run workspace setup synchronously before spawning Claude Code

`WorkSessionManager.startSession()` runs the setup script and waits for it to complete before spawning `claude`. The frontend sees a "thinking" indicator during setup. This is simpler than async setup with progress events and avoids Claude Code starting in a half-provisioned workspace.

**Alternative considered**: Async setup with SSE progress events. Rejected — adds complexity, and setup typically takes <10s for cached workspaces. The "thinking" indicator is sufficient UX feedback.

### 5. Session reconnection via existing session lookup

When `useAgentChat` starts in work mode and a thread already has an active session, skip `startSession` and reconnect to the existing SSE stream. The backend needs an endpoint to check if a thread has an active session.

### 6. Claude Code flags for work mode

Spawn with `--dangerously-skip-permissions` (same as pipeline agents) so the agent can use tools without interactive prompts. Add `--output-format stream-json` (already present) for structured output parsing.

## Risks / Trade-offs

**[Risk] Setup script fails (missing git, bad repo URL)** → Fail fast with clear error message in the SSE stream. Frontend shows the error in chat. User can fix config and retry.

**[Risk] Workspace grows large over time** → Accepted trade-off. Workspaces are under `/tmp/` by default and cleared on reboot. Could add explicit cleanup later but not needed now.

**[Risk] Concurrent work sessions for same project** → Two work sessions writing to the same workspace would conflict. Mitigate by limiting to one active work session per project. If a session already exists for the project, return the existing session instead of creating a new one.

**[Trade-off] `--dangerously-skip-permissions`** → Required for non-interactive work. The agent can execute arbitrary commands in the workspace. Acceptable because this is a local dev tool, not a production service.
