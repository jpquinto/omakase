## ADDED Requirements

### Requirement: GitHub App installation flow
The system SHALL provide a GitHub App installation flow that allows users to install the Omakase GitHub App on their GitHub organization or personal account, granting access to selected repositories.

#### Scenario: User initiates GitHub App installation
- **WHEN** a user clicks "Connect GitHub" in project settings
- **THEN** the system redirects to `https://github.com/apps/{app-slug}/installations/new` with a `state` parameter containing the project ID

#### Scenario: GitHub App installation callback
- **WHEN** GitHub redirects back to `/api/auth/github/callback` with `installation_id` and `setup_action=install`
- **THEN** the system stores the `installation_id` on the project in DynamoDB and redirects the user back to project settings

#### Scenario: User has existing GitHub App installation
- **WHEN** a user clicks "Connect GitHub" and already has the Omakase App installed on their GitHub account
- **THEN** GitHub shows the existing installation's repo selection screen, allowing them to add repos without reinstalling

### Requirement: Repository selection from installation
The system SHALL allow users to select a repository from their GitHub App installation's accessible repos and link it to a project.

#### Scenario: List accessible repositories
- **WHEN** a project has a `githubInstallationId` but no `githubRepoName`
- **THEN** the system calls `GET /app/installations/{id}/repositories` using an installation token and presents the repo list in a dropdown

#### Scenario: User selects a repository
- **WHEN** the user selects a repo from the dropdown and confirms
- **THEN** the system stores `githubRepoOwner`, `githubRepoName`, `githubDefaultBranch`, and derived `repoUrl` on the project

#### Scenario: No repositories accessible
- **WHEN** the GitHub App installation has no repositories granted
- **THEN** the system shows a message directing the user to GitHub App settings to grant repo access

### Requirement: Installation token generation
The system SHALL generate short-lived GitHub App installation tokens server-side using the App's private key, with in-memory caching and automatic refresh.

#### Scenario: Token generated for installation
- **WHEN** the system needs to authenticate a GitHub API call for a project with `githubInstallationId`
- **THEN** it generates a JWT from the App's private key, calls `POST /app/installations/{id}/access_tokens`, and returns the installation token

#### Scenario: Token cached and reused
- **WHEN** an installation token was generated less than 50 minutes ago for the same installation
- **THEN** the cached token is returned without a new API call

#### Scenario: Token near expiry is refreshed
- **WHEN** a cached token has less than 10 minutes remaining before expiry
- **THEN** the system generates a fresh token before returning it

### Requirement: GitHub App webhook for installation lifecycle
The system SHALL expose `/api/webhooks/github` to receive GitHub App webhook events for installation changes.

#### Scenario: App installed on new account
- **WHEN** a `installation.created` webhook event is received with valid signature
- **THEN** the system logs the installation for future reference

#### Scenario: App uninstalled
- **WHEN** an `installation.deleted` webhook event is received
- **THEN** the system clears `githubInstallationId`, `githubRepoOwner`, `githubRepoName`, and `githubDefaultBranch` from all projects using that installation ID

#### Scenario: Repository access changed
- **WHEN** an `installation_repositories.added` or `installation_repositories.removed` event is received
- **THEN** the system updates which repos are accessible; if a project's connected repo was removed, the project's GitHub fields are cleared

#### Scenario: Invalid webhook signature
- **WHEN** a request arrives at `/api/webhooks/github` without a valid HMAC-SHA256 signature
- **THEN** the request is rejected with HTTP 401

### Requirement: GitHub disconnect
The system SHALL allow users to disconnect a GitHub repo from a project without uninstalling the GitHub App.

#### Scenario: User disconnects GitHub from project
- **WHEN** a user clicks "Disconnect GitHub" in project settings
- **THEN** the system clears `githubRepoOwner`, `githubRepoName`, `githubDefaultBranch`, and `repoUrl` from the project but retains `githubInstallationId`

#### Scenario: User fully removes GitHub App
- **WHEN** a user uninstalls the Omakase GitHub App from GitHub.com
- **THEN** the webhook handler clears all GitHub fields from affected projects

### Requirement: Project schema GitHub fields
The system SHALL extend the Project data model with GitHub-specific fields for installation-based access.

#### Scenario: Project with GitHub connected
- **WHEN** a project has completed the GitHub App flow and repo selection
- **THEN** the project record contains `githubInstallationId` (number), `githubRepoOwner` (string), `githubRepoName` (string), and `githubDefaultBranch` (string)

#### Scenario: Project without GitHub connected
- **WHEN** a project has not connected GitHub
- **THEN** the `githubInstallationId`, `githubRepoOwner`, `githubRepoName`, and `githubDefaultBranch` fields are undefined

### Requirement: GitHub App environment configuration
The system SHALL require GitHub App credentials as environment variables on the orchestrator and Next.js API routes.

#### Scenario: Required environment variables
- **WHEN** the system starts
- **THEN** it reads `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` (PEM-encoded), `GITHUB_APP_WEBHOOK_SECRET`, and `GITHUB_APP_SLUG` from environment variables

#### Scenario: Missing GitHub App configuration
- **WHEN** `GITHUB_APP_ID` or `GITHUB_APP_PRIVATE_KEY` is not set and a GitHub operation is attempted
- **THEN** the system returns a 503 error with message "GitHub App not configured"
