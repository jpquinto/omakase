## MODIFIED Requirements

### Requirement: Workspace provisioning before work session
The system SHALL provision a workspace directory with the project's source code before spawning the Claude Code subprocess for a work session. The workspace path SHALL be `${LOCAL_WORKSPACE_ROOT}/work/${projectId}`. The system SHALL authenticate repo clone/fetch operations using the project's GitHub App installation token when available, falling back to unauthenticated HTTPS clone for public repos.

#### Scenario: First work session for a project with GitHub App connection
- **WHEN** a work session is started for a project that has `githubInstallationId` set and no existing workspace
- **THEN** the system generates an installation token, clones the project's repository using `https://x-access-token:{token}@github.com/{owner}/{repo}.git` into `${LOCAL_WORKSPACE_ROOT}/work/${projectId}`, installs dependencies, and spawns Claude Code in that directory

#### Scenario: First work session for a project without GitHub App connection
- **WHEN** a work session is started for a project that has `repoUrl` but no `githubInstallationId`
- **THEN** the system clones using the plain `repoUrl` (unauthenticated HTTPS or SSH), installs dependencies, and spawns Claude Code in that directory

#### Scenario: Subsequent work session refreshes token for fetch
- **WHEN** a work session is started for a project that already has a cloned workspace and has `githubInstallationId`
- **THEN** the system generates a fresh installation token, configures the git remote URL with the token, fetches latest changes, skips dependency install if lockfiles are unchanged, and spawns Claude Code

#### Scenario: Project has no repo URL configured
- **WHEN** a work session is started for a project with no `repoUrl` and no `githubRepoOwner`/`githubRepoName` in DynamoDB
- **THEN** the system returns a 400 error with message "Project has no repository URL configured"

### Requirement: Work setup shell script
The system SHALL provide a `work-setup.sh` script that orchestrates workspace provisioning and agent context injection. This script SHALL accept a `GITHUB_TOKEN` environment variable for authenticated clone/fetch operations when provided.

#### Scenario: Setup script runs with GitHub token
- **WHEN** `work-setup.sh` is invoked with `REPO_URL`, `WORKSPACE`, `AGENT_ROLE`, `PROJECT_ID`, and `GITHUB_TOKEN` environment variables
- **THEN** the script configures git credentials using the token, runs clone/fetch, installs dependencies, copies role CLAUDE.md, injects personality, injects memories, and exits with code 0

#### Scenario: Setup script runs without GitHub token
- **WHEN** `work-setup.sh` is invoked without a `GITHUB_TOKEN` environment variable
- **THEN** the script runs clone/fetch using the plain `REPO_URL` without token authentication (suitable for public repos)

#### Scenario: Setup script runs for cached workspace with token refresh
- **WHEN** `work-setup.sh` is invoked and the workspace already has a `.git` directory and a `GITHUB_TOKEN` is provided
- **THEN** the script updates the remote URL with the fresh token before fetching, completes in under 10 seconds if lockfiles are unchanged
