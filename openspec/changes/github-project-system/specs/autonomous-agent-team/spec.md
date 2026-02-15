## MODIFIED Requirements

### Requirement: Orchestrator service
The system SHALL run an orchestrator that watches for ready features, assigns them to agents in the correct role sequence, and manages the pipeline. Upon successful pipeline completion, the orchestrator SHALL transition the feature to `review_ready` status and post a `pr_ready` message in the agent chat, instead of directly creating a pull request.

#### Scenario: Orchestrator picks up ready feature
- **WHEN** a feature has status "pending" and all dependencies are met
- **THEN** the orchestrator assigns it to an architect agent to begin the pipeline

#### Scenario: Pipeline progresses through roles
- **WHEN** the architect agent completes successfully
- **THEN** the orchestrator starts a coder agent with the architect's plan
- **WHEN** the coder agent completes successfully
- **THEN** the orchestrator starts a reviewer agent with the code diff
- **WHEN** the reviewer agent approves
- **THEN** the orchestrator starts a tester agent

#### Scenario: Pipeline failure triggers retry or escalation
- **WHEN** an agent in the pipeline fails (non-zero exit or explicit failure)
- **THEN** the orchestrator retries the step once, and if it fails again, marks the feature as "failing" and alerts

#### Scenario: Pipeline completion defers PR creation
- **WHEN** all four pipeline steps complete successfully (tester exits with code 0)
- **THEN** the orchestrator marks the feature as `review_ready`, posts a `pr_ready` message with branch name, diff summary, and test results, and does NOT automatically create a pull request

### Requirement: Agent workspace isolation
The system SHALL give each agent an isolated workspace with its own git branch and working directory. The workspace SHALL be provisioned using the project's GitHub App installation token for authenticated repo access.

#### Scenario: Agent works on isolated branch with installation token
- **WHEN** a coder agent starts working on a feature for a project with `githubInstallationId`
- **THEN** the orchestrator generates an installation token, provisions the workspace with authenticated clone/fetch, and the agent creates a branch named `agent/<feature-id>` from the default branch

#### Scenario: Agent works on isolated branch without installation token
- **WHEN** a coder agent starts working on a feature for a project without `githubInstallationId` but with `repoUrl`
- **THEN** the agent clones using the plain `repoUrl` and creates a branch named `agent/<feature-id>` from the default branch

#### Scenario: Completed work awaits user review
- **WHEN** the full agent pipeline completes successfully for a feature
- **THEN** the feature branch is pushed to the remote and the feature enters `review_ready` status, awaiting user instruction to create a pull request
