## MODIFIED Requirements

### Requirement: Ticket ingestion from Linear
The system SHALL sync Linear issues (filtered by label) into the feature backlog as features in DynamoDB. Webhook handlers SHALL call the orchestrator REST API instead of logging placeholders.

#### Scenario: New Linear issue creates a feature
- **WHEN** a Linear issue is created with the configured trigger label (e.g., "omakase")
- **THEN** the webhook handler SHALL resolve the project by calling `GET /api/projects/by-linear-team/:teamId` via `apiFetch`, then call `POST /api/features/from-linear` with the issue title, description, mapped priority, `linearIssueId`, `linearIssueUrl`, and category (from non-trigger labels)

#### Scenario: Linear issue update syncs to feature
- **WHEN** a Linear issue's title, description, or priority is updated and a corresponding feature exists in DynamoDB
- **THEN** the webhook handler SHALL call `GET /api/features/by-linear-issue/:linearIssueId` to find the feature, then call `PATCH /api/features/:featureId/from-linear` to update the feature's name, description, and priority

#### Scenario: Updated issue gains trigger label
- **WHEN** a Linear issue is updated and now has the trigger label but no corresponding feature exists
- **THEN** the webhook handler SHALL create a new feature via `POST /api/features/from-linear`

#### Scenario: Issue without trigger label is ignored
- **WHEN** a Linear issue is created or updated without the configured trigger label
- **THEN** no orchestrator API call SHALL be made

### Requirement: Linear OAuth connection
The system SHALL allow users to connect their Linear workspace via OAuth, storing the access token securely in DynamoDB via the orchestrator REST API.

#### Scenario: User connects Linear workspace
- **WHEN** a user clicks "Connect Linear" and completes OAuth
- **THEN** the Linear access token SHALL be stored on the project record in DynamoDB via a `POST /api/projects/:projectId/linear-token` call to the orchestrator

#### Scenario: OAuth callback persists token
- **WHEN** the OAuth callback receives a valid access token from Linear
- **THEN** the callback route SHALL call `POST /api/projects/:projectId/linear-token` on the orchestrator to store the token and team ID on the associated project record, then redirect to the projects page

### Requirement: Webhook handler resolves project from Linear team
The webhook handler SHALL resolve which project a Linear issue belongs to using the issue's team ID via the orchestrator API.

#### Scenario: Team ID maps to a project
- **WHEN** a webhook event contains a team ID and the orchestrator returns a project for that `linearTeamId`
- **THEN** the handler SHALL use that project's ID when creating or updating features

#### Scenario: No project matches team ID
- **WHEN** a webhook event's team ID does not match any project (orchestrator returns 404)
- **THEN** the handler SHALL log a warning and skip processing

### Requirement: Orchestrator REST API endpoints for Linear operations
The orchestrator SHALL expose REST API endpoints that the web app's webhook handlers and OAuth callback use to manage Linear-linked data.

#### Scenario: Create feature from Linear
- **WHEN** a `POST /api/features/from-linear` request is received with valid body fields
- **THEN** the orchestrator SHALL call `createFromLinear` from `@omakase/dynamodb` and return the created feature

#### Scenario: Look up feature by Linear issue ID
- **WHEN** a `GET /api/features/by-linear-issue/:linearIssueId` request is received
- **THEN** the orchestrator SHALL call `getByLinearIssueId` from `@omakase/dynamodb` and return the feature, or 404 if not found

#### Scenario: Update feature from Linear
- **WHEN** a `PATCH /api/features/:featureId/from-linear` request is received with valid body fields
- **THEN** the orchestrator SHALL call `updateFromLinear` from `@omakase/dynamodb` and return a success response

#### Scenario: Store Linear token on project
- **WHEN** a `POST /api/projects/:projectId/linear-token` request is received with `linearAccessToken` and `linearTeamId`
- **THEN** the orchestrator SHALL call `updateProject` from `@omakase/dynamodb` with the token and team ID fields

#### Scenario: Look up project by Linear team ID
- **WHEN** a `GET /api/projects/by-linear-team/:teamId` request is received
- **THEN** the orchestrator SHALL call `getByLinearTeamId` from `@omakase/dynamodb` and return the project, or 404 if not found
