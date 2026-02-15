## ADDED Requirements

### Requirement: Sync Linear projects to Omakase projects
The system SHALL provide a mechanism to discover Linear projects from the connected workspace and create/update corresponding Omakase projects with a 1:1 mapping.

#### Scenario: User triggers project sync
- **WHEN** a user clicks "Sync Projects" after connecting Linear
- **THEN** the system SHALL fetch all Linear projects from the workspace's teams and create an Omakase project for each Linear project that doesn't already have a corresponding record (matched by `linearProjectId`)

#### Scenario: Existing project updated on sync
- **WHEN** a project sync runs and an Omakase project already exists for a Linear project (matched by `linearProjectId`)
- **THEN** the Omakase project's `name` and `linearProjectName` SHALL be updated to match the Linear project's current name

#### Scenario: Auto-sync after OAuth connection
- **WHEN** the Linear OAuth flow completes successfully
- **THEN** a project sync SHALL run automatically, creating Omakase projects for all discovered Linear projects

### Requirement: Project-to-Linear-project 1:1 mapping
Each Omakase project connected to Linear SHALL have a `linearProjectId` that maps it to exactly one Linear project.

#### Scenario: Project created from Linear project
- **WHEN** a new Omakase project is auto-created from a Linear project
- **THEN** it SHALL have `linearProjectId` set to the Linear project UUID, `linearProjectName` set to the Linear project name, and `workspaceId` set to the workspace's ID

#### Scenario: Project lookup by Linear project ID
- **WHEN** the system needs to find an Omakase project for a given Linear project
- **THEN** it SHALL query the `by_linear_project` GSI on the projects table using `linearProjectId`

### Requirement: Project schema changes
The `Project` type SHALL remove per-project Linear token fields and add a workspace reference.

#### Scenario: Project no longer stores Linear token
- **WHEN** a project record is created or updated
- **THEN** the fields `linearAccessToken` and `linearTeamId` SHALL NOT exist on the project. The Linear token SHALL be resolved from the workspace.

#### Scenario: Project references workspace
- **WHEN** a project is connected to Linear
- **THEN** it SHALL have a `workspaceId` field referencing the workspace that holds the Linear credentials

### Requirement: Remove tickets table
The `tickets` DynamoDB table, schema type, and repository SHALL be removed as dead code.

#### Scenario: Tickets table code removed
- **WHEN** the codebase is updated
- **THEN** `packages/db/src/schema/tickets.ts`, `packages/dynamodb/src/tickets.ts`, and all related exports SHALL be deleted
