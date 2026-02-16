## MODIFIED Requirements

### Requirement: Orchestrator retrieves Linear credentials from workspace record
The orchestrator SHALL fetch the Linear access token from the workspace record associated with the project, not from the project record directly.

#### Scenario: Project has workspace with Linear token
- **WHEN** the orchestrator starts a pipeline and the project has a `workspaceId`
- **THEN** the orchestrator SHALL fetch the workspace record and include `workspace.linearAccessToken` in the pipeline configuration

#### Scenario: Project has no workspace
- **WHEN** the project record has no `workspaceId`
- **THEN** all Linear sync operations SHALL be skipped for that pipeline run

### Requirement: FeatureWatcher passes Linear fields to pipeline
The `FeatureWatcher` SHALL resolve the Linear access token from the workspace and include it along with the feature's Linear fields in the `PipelineConfig`.

#### Scenario: Workspace token passed to pipeline
- **WHEN** `listActiveProjects` returns a project with a `workspaceId`
- **THEN** the `FeatureWatcher` SHALL fetch the workspace record and pass `workspace.linearAccessToken` through to the `PipelineConfig`

#### Scenario: Feature record includes Linear issue ID
- **WHEN** `getReadyFeatures` returns a feature with `linearIssueId` and `linearIssueUrl`
- **THEN** these fields SHALL be passed through to the `PipelineConfig`

### Requirement: Pipeline configuration includes Linear fields
The `PipelineConfig` interface SHALL include optional Linear fields so the pipeline can pass them to the `LinearSyncHook`.

#### Scenario: Feature has Linear fields
- **WHEN** the `FeatureWatcher` launches a pipeline for a feature with `linearIssueId` and the workspace has a `linearAccessToken`
- **THEN** `PipelineConfig` SHALL contain `linearIssueId`, `linearIssueUrl`, and `linearAccessToken`

#### Scenario: Feature has no Linear fields
- **WHEN** the feature has no `linearIssueId` or the workspace has no `linearAccessToken`
- **THEN** the Linear fields in `PipelineConfig` SHALL be `undefined` and the `LinearSyncHook` SHALL be a no-op
