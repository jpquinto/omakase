## ADDED Requirements

### Requirement: Create feature from Linear issue
The system SHALL provide a DynamoDB data-access function `createFromLinear` in `packages/dynamodb/src/features.ts` that creates a feature from Linear webhook data.

#### Scenario: Create feature with all Linear fields
- **WHEN** `createFromLinear` is called with projectId, name, description, priority, linearIssueId, linearIssueUrl, and optional category
- **THEN** a new feature item SHALL be inserted into the features table with status "pending", empty dependencies array, a generated ULID as `id`, ISO timestamps for `createdAt` and `updatedAt`, and all provided fields

#### Scenario: Duplicate linearIssueId is rejected
- **WHEN** `createFromLinear` is called with a `linearIssueId` that already exists in the features table
- **THEN** the function SHALL return the existing feature without creating a duplicate

### Requirement: Query feature by Linear issue ID
The system SHALL provide a DynamoDB data-access function `getByLinearIssueId` in `packages/dynamodb/src/features.ts` that looks up a feature by its `linearIssueId` field.

#### Scenario: Feature exists with matching linearIssueId
- **WHEN** `getByLinearIssueId` is called with a linearIssueId that matches a feature
- **THEN** the full feature object SHALL be returned

#### Scenario: No feature matches linearIssueId
- **WHEN** `getByLinearIssueId` is called with a linearIssueId that does not match any feature
- **THEN** `null` SHALL be returned

### Requirement: Update feature from Linear issue
The system SHALL provide a DynamoDB data-access function `updateFromLinear` in `packages/dynamodb/src/features.ts` that updates a feature's fields from Linear webhook data.

#### Scenario: Update name, description, and priority
- **WHEN** `updateFromLinear` is called with featureId, name, description, and priority
- **THEN** the feature item SHALL be updated with the new values via an UpdateCommand and `updatedAt` SHALL be refreshed to the current ISO timestamp

#### Scenario: Feature not found
- **WHEN** `updateFromLinear` is called with a featureId that does not exist
- **THEN** the UpdateCommand SHALL execute without error (DynamoDB UpdateCommand does not throw on missing keys by default)

### Requirement: Query project by Linear team ID
The system SHALL provide a DynamoDB data-access function `getByLinearTeamId` in `packages/dynamodb/src/projects.ts` that looks up a project by its `linearTeamId` field.

#### Scenario: Project exists with matching linearTeamId
- **WHEN** `getByLinearTeamId` is called with a linearTeamId that matches a project
- **THEN** the full project object SHALL be returned

#### Scenario: No project matches linearTeamId
- **WHEN** `getByLinearTeamId` is called with a linearTeamId that does not match any project
- **THEN** `null` SHALL be returned

### Requirement: Store Linear access token on project
The system SHALL use the existing `updateProject` function in `packages/dynamodb/src/projects.ts` to store a Linear OAuth access token and team ID on a project record.

#### Scenario: Store token and team ID
- **WHEN** `updateProject` is called with projectId, linearAccessToken, and linearTeamId
- **THEN** the project item SHALL be updated with the token, team ID, and `updatedAt` refreshed

### Requirement: Export new functions from DynamoDB package
The system SHALL export `createFromLinear`, `getByLinearIssueId`, `updateFromLinear`, and `getByLinearTeamId` from `packages/dynamodb/src/index.ts`.

#### Scenario: Functions are importable
- **WHEN** a consumer imports from `@omakase/dynamodb`
- **THEN** `createFromLinear`, `getByLinearIssueId`, `updateFromLinear`, and `getByLinearTeamId` SHALL be available as named exports
