## ADDED Requirements

### Requirement: REST API endpoints for data access
The system SHALL expose REST API endpoints on the Elysia orchestrator server for all data the frontend needs, replacing direct Convex query subscriptions.

#### Scenario: List projects endpoint
- **WHEN** a GET request is made to `/api/projects?userId={userId}`
- **THEN** the server returns a JSON array of projects where the user is owner or member

#### Scenario: Get project endpoint
- **WHEN** a GET request is made to `/api/projects/{projectId}`
- **THEN** the server returns the project JSON or 404

#### Scenario: List features endpoint
- **WHEN** a GET request is made to `/api/projects/{projectId}/features`
- **THEN** the server returns a JSON array of all features for the project

#### Scenario: Get feature stats endpoint
- **WHEN** a GET request is made to `/api/projects/{projectId}/features/stats`
- **THEN** the server returns aggregate counts: total, pending, inProgress, passing, failing

#### Scenario: List active agents endpoint
- **WHEN** a GET request is made to `/api/projects/{projectId}/agents/active`
- **THEN** the server returns a JSON array of active agent runs

#### Scenario: Get agent logs endpoint
- **WHEN** a GET request is made to `/api/projects/{projectId}/agents/logs?featureId={featureId}`
- **THEN** the server returns agent run logs filtered by feature, ordered by startedAt

### Requirement: Polling-based data freshness
The system SHALL support polling from the frontend at configurable intervals to achieve near-real-time data updates.

#### Scenario: Dashboard polls for feature updates
- **WHEN** the dashboard is open and polling is active
- **THEN** the frontend fetches updated feature data every 5 seconds for the active project view

#### Scenario: Background views poll less frequently
- **WHEN** a project view is not the active tab/route
- **THEN** polling interval increases to 30 seconds or pauses entirely

### Requirement: Frontend data fetching layer
The system SHALL provide React hooks or utilities for fetching data from the REST API with automatic polling and caching.

#### Scenario: useProjectFeatures hook
- **WHEN** a component calls `useProjectFeatures(projectId)`
- **THEN** it receives the current features list, a loading state, and an error state, with automatic polling at the configured interval

#### Scenario: Data refreshes on mutation
- **WHEN** the frontend triggers a mutation (e.g., creating a feature)
- **THEN** the relevant query data is invalidated and refetched immediately
