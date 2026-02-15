## ADDED Requirements

### Requirement: PR-ready status after pipeline completion
The system SHALL transition features to a `review_ready` status when the agent pipeline completes all four steps successfully, instead of directly transitioning to `passing`.

#### Scenario: Pipeline completes all steps
- **WHEN** the tester agent exits with code 0 (all tests pass)
- **THEN** the feature status transitions from `in_progress` to `review_ready`

#### Scenario: Pipeline fails at any step
- **WHEN** any agent step fails after retry
- **THEN** the feature status transitions to `failing` (unchanged from current behavior)

### Requirement: PR-ready message in agent chat
The system SHALL post a structured `pr_ready` message in the agent chat when a feature reaches `review_ready` status, containing the information needed for the user to decide on PR creation.

#### Scenario: PR-ready message posted
- **WHEN** a feature transitions to `review_ready`
- **THEN** the orchestrator posts a message with `type: "pr_ready"` containing: branch name (`agent/{featureId}`), diff summary (files changed, insertions, deletions), test results summary, and implementation plan summary

#### Scenario: PR-ready message rendered in UI
- **WHEN** the frontend receives a `pr_ready` message
- **THEN** it renders a card with the diff summary, test results, and a "Create PR" button

### Requirement: User-initiated PR creation via chat
The system SHALL allow users to create a GitHub pull request by clicking the "Create PR" button or sending a PR creation command in the agent chat.

#### Scenario: User clicks "Create PR" button
- **WHEN** a user clicks the "Create PR" button on a `pr_ready` message
- **THEN** the frontend calls `POST /api/agent-runs/:runId/create-pr` and shows a loading state

#### Scenario: PR created successfully
- **WHEN** the PR creation API call succeeds
- **THEN** the system posts a `pr_created` message in chat with the PR URL, the feature status transitions from `review_ready` to `passing`, and the "Create PR" button is replaced with a link to the PR

#### Scenario: PR creation fails
- **WHEN** the PR creation API call fails (e.g., branch conflict, token expired)
- **THEN** the system posts an `error` message in chat with the failure reason, the feature remains in `review_ready` status, and the "Create PR" button remains enabled for retry

### Requirement: PR creation API endpoint
The system SHALL expose `POST /api/agent-runs/:runId/create-pr` on the orchestrator to create a pull request for the feature associated with the agent run.

#### Scenario: Valid PR creation request
- **WHEN** `POST /api/agent-runs/:runId/create-pr` is called for a run whose feature is in `review_ready` status
- **THEN** the system generates a GitHub installation token for the project, calls `createPullRequest()` with the feature branch, base branch, and accumulated pipeline context, and returns the PR URL

#### Scenario: Feature not in review_ready status
- **WHEN** `POST /api/agent-runs/:runId/create-pr` is called for a run whose feature is NOT in `review_ready` status
- **THEN** the system returns HTTP 409 with message "Feature is not ready for PR creation"

#### Scenario: Project has no GitHub connection
- **WHEN** `POST /api/agent-runs/:runId/create-pr` is called for a run whose project has no `githubInstallationId`
- **THEN** the system returns HTTP 400 with message "Project has no GitHub connection"

### Requirement: Post-pipeline conversation before PR
The system SHALL allow users to converse with the agent after pipeline completion and before PR creation, to request changes or ask questions about the implementation.

#### Scenario: User asks agent about implementation
- **WHEN** a feature is in `review_ready` status and the user sends a message in the agent chat
- **THEN** the agent responds using its accumulated context from the pipeline run (plan, code changes, review notes, test results)

#### Scenario: User requests changes before PR
- **WHEN** a user sends a message like "change the commit message" or "update the function name" while in `review_ready`
- **THEN** the agent makes the requested changes on the feature branch and posts an updated diff summary

### Requirement: Feature status type expansion
The system SHALL add `review_ready` as a valid feature status in the Feature type definition.

#### Scenario: Feature status includes review_ready
- **WHEN** the Feature type is defined
- **THEN** the `status` field accepts values: `pending`, `in_progress`, `review_ready`, `passing`, `failing`

#### Scenario: Kanban board shows review_ready column
- **WHEN** the kanban board renders features
- **THEN** features with status `review_ready` appear in a "Ready for Review" column between "In Progress" and "Passing"
