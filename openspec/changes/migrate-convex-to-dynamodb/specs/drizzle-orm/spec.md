## MODIFIED Requirements

### Requirement: Drizzle schema definitions
The system SHALL define TypeScript type definitions in `packages/db/` that serve as canonical types shared between backend services and frontend. Drizzle ORM dependency is removed; types are plain TypeScript interfaces.

#### Scenario: Type files compile and export types
- **WHEN** the TypeScript project builds
- **THEN** type files in `packages/db/src/schema/` compile without errors and export types for all 6 entities (User, Project, Feature, Agent, AgentRun, Ticket)

### Requirement: Drizzle-Convex schema alignment
The system SHALL maintain TypeScript type definitions that align with the DynamoDB table schemas, ensuring type consistency across the stack.

#### Scenario: Types match DynamoDB attributes
- **WHEN** a Feature type is defined in `packages/db/`
- **THEN** the field names and types match the DynamoDB item attributes for the features table

### Requirement: Shared type exports
The system SHALL export TypeScript types (e.g., `Feature`, `Project`, `Agent`, `Ticket`) from `@autoforge/db` consumed by both frontend and backend.

#### Scenario: Frontend imports shared types
- **WHEN** a Next.js component imports `Feature` from `@autoforge/db`
- **THEN** the type includes all fields defined in the schema with correct TypeScript types

#### Scenario: Backend imports shared types
- **WHEN** the orchestrator imports `Project` from `@autoforge/db`
- **THEN** the type matches the DynamoDB item structure

## REMOVED Requirements

### Requirement: Migration support for schema evolution
**Reason**: Drizzle Kit migrations are for SQL databases. DynamoDB schema changes are managed via CDK (table/GSI modifications) and application-level attribute handling.
**Migration**: Schema changes are expressed as CDK updates for table/GSI changes and TypeScript type updates for new attributes. DynamoDB is schemaless at the item level.
