## ADDED Requirements

### Requirement: Orchestrator pushes status changes to Linear
The orchestrator SHALL update the linked Linear issue's workflow state when a feature's status changes during the agent pipeline.

#### Scenario: Feature moves to in_progress
- **WHEN** the orchestrator starts a pipeline for a feature that has a `linearIssueId` and the project has a `linearAccessToken`
- **THEN** the Linear issue's state SHALL be updated to "In Progress" (or the team's equivalent started-type state)

#### Scenario: Feature marked as passing
- **WHEN** the pipeline completes successfully and marks the feature as "passing"
- **THEN** the Linear issue's state SHALL be updated to "Done" (or the team's equivalent completed-type state)

#### Scenario: Feature marked as failing
- **WHEN** the pipeline fails and marks the feature as "failing"
- **THEN** the Linear issue's state SHALL be updated to "In Review" (or the team's equivalent started-type state)

#### Scenario: Feature has no Linear link
- **WHEN** a feature does not have a `linearIssueId` or the project has no `linearAccessToken`
- **THEN** Linear status sync SHALL be skipped silently (no error, no log warning)

#### Scenario: Linear API call fails
- **WHEN** the Linear status sync API call fails (network error, invalid token, rate limit)
- **THEN** the failure SHALL be logged but the pipeline SHALL NOT fail — Linear sync is non-critical

### Requirement: Orchestrator posts implementation comments to Linear
The orchestrator SHALL post a formatted Markdown comment to the linked Linear issue when the agent pipeline completes (success or failure).

#### Scenario: Pipeline succeeds — comment posted
- **WHEN** the pipeline completes successfully for a Linear-linked feature
- **THEN** a comment SHALL be posted to the Linear issue containing: feature name, agent role that completed last, and an implementation summary

#### Scenario: Pipeline fails — comment posted
- **WHEN** the pipeline fails for a Linear-linked feature
- **THEN** a comment SHALL be posted to the Linear issue containing: feature name, the step that failed, and the error message

#### Scenario: Comment posting fails
- **WHEN** the comment creation API call fails
- **THEN** the failure SHALL be logged but the pipeline result SHALL NOT be affected

### Requirement: Orchestrator retrieves Linear credentials from DynamoDB project record
The orchestrator SHALL fetch the project's `linearAccessToken` from DynamoDB to authenticate against the Linear API.

#### Scenario: Project has Linear token
- **WHEN** the orchestrator starts a pipeline and the `FeatureWatcher` passes the project record through to the pipeline config
- **THEN** the `linearAccessToken` field SHALL be included in the pipeline configuration and available to the `LinearSyncHook`

#### Scenario: Project has no Linear token
- **WHEN** the project record has no `linearAccessToken`
- **THEN** all Linear sync operations SHALL be skipped for that pipeline run

### Requirement: Linear sync module in shared package
The Linear GraphQL client, status-sync, and comments modules SHALL be available in the shared package (`packages/shared/`) so both the web app and orchestrator can import them.

#### Scenario: Orchestrator imports shared Linear modules
- **WHEN** the orchestrator needs to call the Linear API
- **THEN** it SHALL import `syncFeatureStatusToLinear` and `postImplementationComment` from `@omakase/shared`

#### Scenario: Web app imports shared Linear modules
- **WHEN** the web app webhook handler needs the Linear GraphQL client
- **THEN** it SHALL import from `@omakase/shared` (or re-export locally for backward compatibility)

### Requirement: Pipeline configuration includes Linear fields
The `PipelineConfig` interface in `apps/orchestrator/src/pipeline.ts` SHALL include optional Linear fields so the pipeline can pass them to the `LinearSyncHook`.

#### Scenario: Feature has Linear fields
- **WHEN** the `FeatureWatcher` launches a pipeline for a feature with `linearIssueId` and the project has `linearAccessToken`
- **THEN** `PipelineConfig` SHALL contain `linearIssueId`, `linearIssueUrl`, and `linearAccessToken`

#### Scenario: Feature has no Linear fields
- **WHEN** the feature has no `linearIssueId` or the project has no `linearAccessToken`
- **THEN** the Linear fields in `PipelineConfig` SHALL be `undefined` and the `LinearSyncHook` SHALL be a no-op

### Requirement: FeatureWatcher passes Linear fields to pipeline
The `FeatureWatcher` in `apps/orchestrator/src/feature-watcher.ts` SHALL include Linear fields from the project and feature records in the `PipelineConfig` it constructs.

#### Scenario: Project record includes Linear token
- **WHEN** `listActiveProjects` returns a project with `linearAccessToken`
- **THEN** the `FeatureWatcher`'s internal `Project` interface SHALL include `linearAccessToken` and `linearTeamId`, and these SHALL be passed through to the `PipelineConfig`

#### Scenario: Feature record includes Linear issue ID
- **WHEN** `getReadyFeatures` returns a feature with `linearIssueId` and `linearIssueUrl`
- **THEN** the `FeatureWatcher`'s internal `Feature` interface SHALL include these fields, and they SHALL be passed through to the `PipelineConfig`
