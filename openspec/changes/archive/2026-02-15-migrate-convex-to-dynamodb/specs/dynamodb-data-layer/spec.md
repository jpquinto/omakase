## ADDED Requirements

### Requirement: DynamoDB table provisioning via CDK
The system SHALL provision 6 DynamoDB tables (users, projects, features, agents, agent_runs, tickets) via AWS CDK with on-demand capacity mode and appropriate GSIs.

#### Scenario: CDK deploys all DynamoDB tables
- **WHEN** `npx cdk deploy` is executed
- **THEN** 6 DynamoDB tables are created with prefix `autoforge-` (e.g., `autoforge-users`, `autoforge-projects`) in the configured AWS region

#### Scenario: Tables have required GSIs
- **WHEN** the DynamoDB tables are provisioned
- **THEN** each table has the GSIs defined in the design document (e.g., `by_auth0Id` on users, `by_project` on features, `by_linearIssueId` on tickets)

### Requirement: DynamoDB client package
The system SHALL provide a `packages/dynamodb/` package that exports a configured DynamoDB DocumentClient and typed data access functions for all 6 tables.

#### Scenario: Package exports DocumentClient
- **WHEN** `@autoforge/dynamodb` is imported
- **THEN** a configured `DynamoDBDocumentClient` instance is available, using the `DYNAMODB_TABLE_PREFIX` and `AWS_REGION` environment variables

#### Scenario: Package is consumable by orchestrator and web
- **WHEN** `@autoforge/dynamodb` is added as a workspace dependency
- **THEN** it can be imported and used in both `apps/orchestrator/` and `apps/web/`

### Requirement: Project CRUD via DynamoDB
The system SHALL support creating, reading, updating, listing, and deleting projects through typed DynamoDB functions.

#### Scenario: Create a new project
- **WHEN** `createProject({ name, description, ownerId })` is called
- **THEN** a new item is inserted into the projects table with a ULID primary key, status "active", maxConcurrency 3, and timestamps

#### Scenario: List active projects
- **WHEN** `listActiveProjects()` is called
- **THEN** it returns all projects with status "active" using the `by_status` GSI

#### Scenario: List projects for a user
- **WHEN** `listProjects({ userId })` is called
- **THEN** it returns all projects where the user is the owner or a member

#### Scenario: Get project by ID
- **WHEN** `getProject({ projectId })` is called
- **THEN** it returns the project item or null if not found

#### Scenario: Update project fields
- **WHEN** `updateProject({ projectId, ...fields })` is called
- **THEN** the specified fields are updated and `updatedAt` is set to the current timestamp

#### Scenario: Delete a project
- **WHEN** `deleteProject({ projectId })` is called
- **THEN** the project item is removed from the table

### Requirement: Feature management via DynamoDB
The system SHALL manage features through typed DynamoDB functions supporting bulk creation, status transitions, dependency-aware claiming, and querying.

#### Scenario: Create features in bulk
- **WHEN** `createFeaturesBulk({ projectId, features })` is called with an array of feature definitions
- **THEN** all features are inserted into the features table using `BatchWriteItem` with status "pending" and ULID keys

#### Scenario: List features for a project
- **WHEN** `listFeatures({ projectId })` is called
- **THEN** it returns all features for the project using the `by_project` GSI

#### Scenario: Get ready features (dependency-aware)
- **WHEN** `getReadyFeatures({ projectId })` is called
- **THEN** it returns features with status "pending" whose dependencies all have status "passing"

#### Scenario: Claim a feature atomically
- **WHEN** `claimFeature({ projectId, agentId })` is called
- **THEN** the first ready feature is atomically updated to status "in_progress" with the agent's ID using a DynamoDB conditional write (`ConditionExpression: status = "pending"`)
- **AND** no two agents can claim the same feature

#### Scenario: Mark feature passing
- **WHEN** `markFeaturePassing({ featureId })` is called
- **THEN** the feature status is updated to "passing", `completedAt` is set, and `assignedAgentId` is cleared

#### Scenario: Mark feature failing
- **WHEN** `markFeatureFailing({ featureId })` is called
- **THEN** the feature status is updated to "failing" and `assignedAgentId` is cleared

### Requirement: Dependency graph with cycle detection
The system SHALL store feature dependencies and prevent circular dependencies using BFS cycle detection on write.

#### Scenario: Add a valid dependency
- **WHEN** `addDependency({ featureId, dependsOnId })` is called and no cycle would result
- **THEN** the dependency is added to the feature's `dependencies` array

#### Scenario: Reject circular dependency
- **WHEN** `addDependency({ featureId, dependsOnId })` would create a cycle (e.g., A->B->C->A)
- **THEN** the function throws an error and no dependency is added

#### Scenario: Remove a dependency
- **WHEN** `removeDependency({ featureId, dependsOnId })` is called
- **THEN** the dependency is removed from the feature's `dependencies` array

### Requirement: Agent run tracking via DynamoDB
The system SHALL track agent execution runs with status lifecycle, output logs, and duration.

#### Scenario: Create an agent run
- **WHEN** `createAgentRun({ agentId, projectId, featureId, role })` is called
- **THEN** a new agent run item is inserted with status "started" and `startedAt` timestamp

#### Scenario: Update agent run status
- **WHEN** `updateAgentStatus({ runId, status, output })` is called
- **THEN** the run's status is updated and output is appended

#### Scenario: Complete an agent run
- **WHEN** `completeAgentRun({ runId, status, outputSummary, errorMessage })` is called
- **THEN** the run's status is set to "completed" or "failed", `completedAt` is set, and `durationMs` is calculated from `startedAt`

#### Scenario: List active agent runs
- **WHEN** `listActiveAgents({ projectId })` is called
- **THEN** it returns all agent runs for the project with status not in ["completed", "failed"]

#### Scenario: Get agent logs by feature
- **WHEN** `getAgentLogs({ featureId })` is called
- **THEN** it returns all agent runs for the feature using the `by_feature` GSI, ordered by `startedAt`

### Requirement: User management via DynamoDB
The system SHALL support user upsert (create or update) and lookup by Auth0 ID or email.

#### Scenario: Upsert user from Auth0
- **WHEN** `upsertUser({ auth0Id, email, name, picture })` is called
- **THEN** the user is created if not found (by auth0Id), or updated if existing

#### Scenario: Get user by Auth0 ID
- **WHEN** `getUserByAuth0Id({ auth0Id })` is called
- **THEN** it returns the user item using the `by_auth0Id` GSI, or null if not found

### Requirement: Ticket sync via DynamoDB
The system SHALL support upserting and updating Linear tickets linked to projects and features.

#### Scenario: Sync a ticket from Linear
- **WHEN** `syncTicket({ projectId, linearIssueId, title, status, ... })` is called
- **THEN** the ticket is created if not found (by linearIssueId), or updated if existing, with `syncedAt` set to current timestamp

#### Scenario: Update ticket status
- **WHEN** `updateTicketStatus({ ticketId, status })` is called
- **THEN** the ticket's status is updated and `syncedAt` is refreshed

### Requirement: IAM permissions for DynamoDB access
The system SHALL grant DynamoDB read/write permissions to the orchestrator and agent ECS task roles via CDK.

#### Scenario: Orchestrator can read/write DynamoDB
- **WHEN** the orchestrator ECS task runs
- **THEN** it has IAM permissions to perform `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:UpdateItem`, `dynamodb:DeleteItem`, `dynamodb:Query`, `dynamodb:BatchWriteItem` on all `autoforge-*` tables

#### Scenario: Permissions are scoped to autoforge tables
- **WHEN** IAM policies are evaluated
- **THEN** DynamoDB permissions are restricted to table ARNs matching `arn:aws:dynamodb:*:*:table/autoforge-*`
