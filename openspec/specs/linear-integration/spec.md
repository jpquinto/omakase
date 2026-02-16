## MODIFIED Requirements

### Requirement: Ticket ingestion from Linear
The system SHALL sync Linear issues (filtered by project mapping) into the feature backlog as features in DynamoDB, including cached Linear metadata for display. Issues are routed to projects by matching the issue's Linear project to an Omakase project via `linearProjectId`.

#### Scenario: New Linear issue creates a feature
- **WHEN** a Linear issue is created and its `projectId` matches an Omakase project's `linearProjectId`
- **THEN** a webhook fires and a corresponding feature is created in DynamoDB with the issue title, description, priority, Linear issue ID, and cached metadata (`linearStateName`, `linearLabels`, `linearAssigneeName`)

#### Scenario: Linear issue update syncs to feature
- **WHEN** a Linear issue's title, description, priority, state, labels, or assignee is updated
- **THEN** the corresponding feature in DynamoDB is updated to match, including refreshed cached metadata fields

#### Scenario: Webhook resolves project by Linear project ID
- **WHEN** a webhook event arrives for an issue with a `projectId`
- **THEN** the system SHALL query the `by_linear_project` GSI to find the matching Omakase project (instead of scanning by `linearTeamId`)

#### Scenario: Issue has no Linear project
- **WHEN** a webhook event arrives for an issue that has no `projectId` (unscoped issue)
- **THEN** the system SHALL skip the event — only issues assigned to a Linear project are tracked

#### Scenario: Webhook resolves Linear token from workspace
- **WHEN** the webhook handler needs to verify project membership or create a feature
- **THEN** it SHALL resolve the Linear access token from the workspace associated with the project, not from the project record
