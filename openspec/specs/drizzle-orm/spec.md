## ADDED Requirements

### Requirement: Drizzle schema definitions
The system SHALL define TypeScript schema files using Drizzle ORM that serve as canonical type definitions shared between backend services and frontend.

#### Scenario: Schema files compile and export types
- **WHEN** the TypeScript project builds
- **THEN** Drizzle schema files in `packages/db/schema/` compile without errors and export inferred types for all tables

### Requirement: Drizzle-Convex schema alignment
The system SHALL maintain Drizzle schema definitions that align with the Convex schema, ensuring type consistency across the stack.

#### Scenario: Types match between Drizzle and Convex
- **WHEN** a feature type is defined in both Drizzle and Convex schemas
- **THEN** the field names, types, and nullability constraints are identical

### Requirement: Migration support for schema evolution
The system SHALL use Drizzle Kit for generating and applying schema migrations when the data model changes.

#### Scenario: Generate migration after schema change
- **WHEN** a developer modifies a Drizzle schema file and runs `drizzle-kit generate`
- **THEN** a SQL migration file is created in `packages/db/migrations/` reflecting the diff

#### Scenario: Apply pending migrations
- **WHEN** `drizzle-kit migrate` is executed
- **THEN** all pending migrations are applied in order and the migration state is updated

### Requirement: Shared type exports
The system SHALL export Drizzle-inferred types (e.g., `Feature`, `Project`, `Agent`, `Ticket`) from a shared package consumed by both frontend and backend.

#### Scenario: Frontend imports shared types
- **WHEN** a Next.js component imports `Feature` from `@autoforge/db`
- **THEN** the type includes all fields defined in the Drizzle schema with correct TypeScript types
