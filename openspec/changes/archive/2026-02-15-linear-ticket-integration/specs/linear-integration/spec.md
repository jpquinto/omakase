## MODIFIED Requirements

### Requirement: Ticket ingestion from Linear
The system SHALL sync Linear issues (filtered by label or project) into the feature backlog as features in DynamoDB, including cached Linear metadata for display.

#### Scenario: New Linear issue creates a feature
- **WHEN** a Linear issue is created with the configured label (e.g., "omakase")
- **THEN** a webhook fires and a corresponding feature is created in DynamoDB with the issue title, description, priority, Linear issue ID, and cached metadata (`linearStateName`, `linearLabels`, `linearAssigneeName`)

#### Scenario: Linear issue update syncs to feature
- **WHEN** a Linear issue's title, description, priority, state, labels, or assignee is updated
- **THEN** the corresponding feature in DynamoDB is updated to match, including refreshed cached metadata fields
