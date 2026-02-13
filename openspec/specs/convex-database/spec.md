## ADDED Requirements

### Requirement: Convex project initialization
The system SHALL have a Convex project configured with a schema defining tables for projects, features, agents, agent_runs, tickets, and users.

#### Scenario: Schema defines all required tables
- **WHEN** the Convex dev server starts
- **THEN** the schema validates successfully with tables: projects, features, agents, agent_runs, tickets, users

### Requirement: Project CRUD via Convex mutations
The system SHALL support creating, reading, updating, and deleting projects through Convex mutations.

#### Scenario: Create a new project
- **WHEN** a mutation `createProject` is called with name, description, and owner
- **THEN** a new project document is inserted with status "active" and a generated ID

#### Scenario: List projects for authenticated user
- **WHEN** a query `listProjects` is called with a user ID
- **THEN** it returns all projects where the user is an owner or member

### Requirement: Feature management via Convex
The system SHALL manage features (name, description, priority, category, status, dependencies, steps) through Convex queries and mutations, replacing the SQLite features.db.

#### Scenario: Create features in bulk
- **WHEN** a mutation `createFeaturesBulk` is called with an array of feature definitions
- **THEN** all features are inserted atomically with status "pending"

#### Scenario: Claim next available feature
- **WHEN** a mutation `claimFeature` is called by an agent
- **THEN** the first feature with status "pending" and all dependencies met is atomically updated to "in_progress" with the agent's ID, and the feature data is returned

#### Scenario: Mark feature as passing
- **WHEN** a mutation `markFeaturePassing` is called with a feature ID
- **THEN** the feature status is updated to "passing" and a timestamp is recorded

### Requirement: Real-time data subscriptions
The system SHALL provide reactive queries that automatically push updates to all connected clients when data changes.

#### Scenario: Feature status change propagates to dashboard
- **WHEN** an agent marks a feature as "passing" via mutation
- **THEN** all clients subscribed to that project's features query receive the updated feature within 1 second

#### Scenario: Agent status updates propagate in real-time
- **WHEN** an agent's run status changes (started, thinking, coding, testing, completed, failed)
- **THEN** all subscribed dashboard clients reflect the new status without polling

### Requirement: Dependency graph storage
The system SHALL store feature dependencies as references between feature documents with cycle detection on write.

#### Scenario: Add valid dependency
- **WHEN** a mutation `addDependency` is called linking feature A → feature B
- **THEN** the dependency is stored and feature A's `blockedBy` list includes feature B

#### Scenario: Reject circular dependency
- **WHEN** a mutation `addDependency` would create a cycle (A→B→C→A)
- **THEN** the mutation throws an error and no dependency is created
