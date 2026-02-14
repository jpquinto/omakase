## 1. Work Setup Script

- [x] 1.1 Create `apps/orchestrator/src/work-setup.sh` that accepts `REPO_URL`, `WORKSPACE`, `AGENT_ROLE`, `AGENT_NAME`, and `PROJECT_ID` env vars. Call `agent-setup.sh` (with `BASE_BRANCH` set to the repo default branch and no `FEATURE_ID` branch override) for clone/fetch and dependency install, then copy role-specific CLAUDE.md, inject personality via `memory-helper.ts`, and inject memories to `.claude/memory/MEMORY.md`.
- [x] 1.2 Ensure `agent-setup.sh` works when `FEATURE_ID` is unset — the work session operates on the default branch, so skip the `agent/${FEATURE_ID}` branch checkout and stay on `BASE_BRANCH`. Add a guard: if `FEATURE_ID` is empty, skip branch creation and just ensure we're on `BASE_BRANCH`.

## 2. WorkSessionManager Workspace Provisioning

- [x] 2.1 Add `repoUrl` to the `startSession` params interface and resolve it from DynamoDB in the route handler before calling `startSession`.
- [x] 2.2 Update `WorkSessionManager.startSession()` to run `work-setup.sh` synchronously (via `Bun.spawnSync` or awaited `Bun.spawn`) before spawning the `claude` CLI. Set workspace path to `${localWorkspaceRoot}/work/${projectId}`. Pass `REPO_URL`, `WORKSPACE`, `AGENT_ROLE`, `AGENT_NAME`, and `PROJECT_ID` as env vars.
- [x] 2.3 Add `--dangerously-skip-permissions` flag to the Claude Code spawn args so the agent can use tools without interactive prompts.
- [x] 2.4 Enforce one active session per project: before starting a new session, check if a session for the same `projectId` already exists. If so, return the existing session's `runId` instead of creating a new one.

## 3. API Route Changes

- [x] 3.1 In `POST /api/agents/:agentName/work-sessions`, look up the project from DynamoDB to get `repoUrl`. Return 400 if `repoUrl` is missing. Pass `repoUrl` to `workSessionManager.startSession()`.
- [x] 3.2 Add `GET /api/agents/:agentName/work-sessions/active?threadId=<threadId>` endpoint that checks if the given thread has an active work session and returns `{ active: boolean, runId?: string }`.

## 4. Frontend Session Reconnection

- [x] 4.1 In `useAgentChat`, when mode is `"work"` and a `threadId` is present, query `GET /api/agents/:agentName/work-sessions/active?threadId=<threadId>` on mount. If an active session exists, set `workSessionRunId` to the returned `runId` and open the SSE stream — skip starting a new session.
- [x] 4.2 Ensure the reconnection flow sets `isConnected` and `isThinking` states correctly so the UI reflects the agent's current state.

## 5. Testing & Verification

- [ ] 5.1 Verify end-to-end: start a work session via the chat UI, confirm Claude Code can read files in the workspace, ask a question about a source file, and receive a meaningful response.
- [ ] 5.2 Verify workspace reuse: end a work session, start a new one for the same project, confirm it skips clone and install (check logs for "Dependencies unchanged" and "Fetching latest changes" messages).
- [ ] 5.3 Verify session reconnection: start a work session, navigate away, return to the thread, confirm the frontend reconnects to the existing session without starting a new one.
- [ ] 5.4 Verify one-session-per-project: try starting two work sessions for the same project, confirm the second returns the existing session.
