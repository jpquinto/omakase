## ADDED Requirements

### Requirement: Browse Linear workspace issues
The system SHALL provide a UI for browsing issues from the connected Linear workspace, accessible from the project detail page.

#### Scenario: User opens the workspace browser
- **WHEN** a user clicks "Browse Linear" on a project with a connected Linear workspace
- **THEN** a full-screen drawer opens showing Linear issues from the connected team, with the most recent issues displayed first

#### Scenario: User searches Linear issues
- **WHEN** a user types a search query in the workspace browser search field
- **THEN** the issue list filters to show only issues matching the query by title or identifier

#### Scenario: User filters by Linear project
- **WHEN** a user selects a Linear project from the project filter dropdown
- **THEN** only issues belonging to that Linear project are displayed

#### Scenario: User filters by Linear status
- **WHEN** a user selects a status from the status filter dropdown
- **THEN** only issues with that Linear workflow state are displayed

#### Scenario: Issues paginate on scroll
- **WHEN** the user scrolls to the bottom of the issue list
- **THEN** the next page of issues is loaded and appended (up to 50 per page)

#### Scenario: Project has no Linear connection
- **WHEN** a user attempts to browse Linear on a project without a connected workspace
- **THEN** the system displays a prompt to connect Linear via project settings

### Requirement: Linear workspace API routes
The system SHALL expose server-side API routes that fetch Linear workspace data using the stored OAuth access token.

#### Scenario: Fetch Linear teams
- **WHEN** the frontend requests `/api/linear/teams?projectId=<id>`
- **THEN** the API returns the teams accessible via the project's stored Linear access token

#### Scenario: Fetch Linear issues for a team
- **WHEN** the frontend requests `/api/linear/issues?projectId=<id>` with optional query, status, project, and pagination parameters
- **THEN** the API returns matching Linear issues with id, identifier, title, description, priority, status, labels, url, and assignee name

#### Scenario: Fetch Linear projects for a team
- **WHEN** the frontend requests `/api/linear/projects?projectId=<id>`
- **THEN** the API returns the Linear projects for the connected team

#### Scenario: Missing or invalid access token
- **WHEN** the stored Linear access token is missing or expired
- **THEN** the API returns HTTP 401 with a message prompting the user to reconnect Linear
