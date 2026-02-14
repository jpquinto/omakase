## ADDED Requirements

### Requirement: Workspace provisioning before work session
The system SHALL provision a workspace directory with the project's source code before spawning the Claude Code subprocess for a work session. The workspace path SHALL be `${LOCAL_WORKSPACE_ROOT}/work/${projectId}`.

#### Scenario: First work session for a project
- **WHEN** a work session is started for a project that has no existing workspace
- **THEN** the system clones the project's repository into `${LOCAL_WORKSPACE_ROOT}/work/${projectId}`, installs dependencies, and spawns Claude Code in that directory

#### Scenario: Subsequent work session for a project with existing workspace
- **WHEN** a work session is started for a project that already has a cloned workspace
- **THEN** the system fetches latest changes from the remote, skips dependency install if lockfiles are unchanged, and spawns Claude Code in the existing directory

#### Scenario: Project has no repo URL configured
- **WHEN** a work session is started for a project with no `repoUrl` in DynamoDB
- **THEN** the system returns a 400 error with message "Project has no repository URL configured"

### Requirement: Agent context injection for work sessions
The system SHALL inject the agent's role-specific CLAUDE.md, personality, and project-scoped memories into the workspace before spawning Claude Code, so the agent operates with its configured persona.

#### Scenario: CLAUDE.md is copied to workspace root
- **WHEN** a work session starts for agent "nori" (coder)
- **THEN** the coder's CLAUDE.md from `agent-roles/coder/CLAUDE.md` is copied to `${workspace}/CLAUDE.md`

#### Scenario: Personality is prepended to CLAUDE.md
- **WHEN** the agent has a personality configured in DynamoDB
- **THEN** the personality block is prepended to the workspace CLAUDE.md above the role instructions

#### Scenario: Memories are injected
- **WHEN** the agent has project-scoped memories in DynamoDB
- **THEN** the memories are written to `${workspace}/.claude/memory/MEMORY.md`

### Requirement: Work setup shell script
The system SHALL provide a `work-setup.sh` script that orchestrates workspace provisioning and agent context injection. This script SHALL reuse `agent-setup.sh` for clone/fetch and dependency install.

#### Scenario: Setup script runs successfully
- **WHEN** `work-setup.sh` is invoked with `REPO_URL`, `WORKSPACE`, `AGENT_ROLE`, and `PROJECT_ID` environment variables
- **THEN** the script runs `agent-setup.sh` for repo clone/fetch and dependency install, copies the role CLAUDE.md, injects personality, injects memories, and exits with code 0

#### Scenario: Setup script runs for cached workspace
- **WHEN** `work-setup.sh` is invoked and the workspace already has a `.git` directory and unchanged lockfiles
- **THEN** the script completes in under 10 seconds by skipping clone and install

### Requirement: Persistent workspace across sessions
The workspace directory SHALL persist across work sessions for the same project. Subsequent sessions SHALL reuse the existing clone without re-cloning.

#### Scenario: Workspace persists after session ends
- **WHEN** a work session ends (user closes it or it times out)
- **THEN** the workspace directory at `${LOCAL_WORKSPACE_ROOT}/work/${projectId}` is NOT deleted

#### Scenario: New session reuses existing workspace
- **WHEN** a new work session starts for the same project
- **THEN** the system detects the existing `.git` directory, runs `git fetch origin` instead of a full clone, and checks the lockfile hash to skip dependency install if unchanged

### Requirement: One active work session per project
The system SHALL enforce a limit of one active work session per project to prevent workspace conflicts.

#### Scenario: Second session requested for same project
- **WHEN** a work session start is requested for a project that already has an active session
- **THEN** the system returns the existing session's `runId` and `threadId` instead of creating a new one

#### Scenario: Session ended, new session allowed
- **WHEN** a previous work session for a project has ended and a new one is requested
- **THEN** the system creates a new work session normally
