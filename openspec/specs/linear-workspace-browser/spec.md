## MODIFIED Requirements

### Requirement: Linear workspace API routes
The system SHALL expose server-side API routes that fetch Linear workspace data using the OAuth access token resolved from the workspace record.

#### Scenario: Fetch Linear teams
- **WHEN** the frontend requests `/api/linear/teams?projectId=<id>`
- **THEN** the API SHALL resolve the access token from the project's workspace and return the teams accessible via that token

#### Scenario: Fetch Linear issues for a team
- **WHEN** the frontend requests `/api/linear/issues?projectId=<id>` with optional query, status, project, and pagination parameters
- **THEN** the API SHALL resolve the access token from the project's workspace and return matching Linear issues

#### Scenario: Fetch Linear projects for a team
- **WHEN** the frontend requests `/api/linear/projects?projectId=<id>`
- **THEN** the API SHALL resolve the access token from the project's workspace and return the Linear projects for the connected team

#### Scenario: Workspace has no Linear token
- **WHEN** the project's workspace has no `linearAccessToken` (disconnected or never connected)
- **THEN** the API SHALL return HTTP 401 with a message prompting the user to connect Linear in workspace settings
