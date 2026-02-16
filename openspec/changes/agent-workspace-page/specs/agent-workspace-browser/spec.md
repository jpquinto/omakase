## NEW Capability: agent-workspace-browser

### Requirement: Workspace file listing by agent name
The system SHALL provide an API endpoint to list files and directories within an agent's workspace for a given project, without requiring an active work session.

#### Scenario: List root directory
- **WHEN** a client requests `GET /api/agents/nori/workspace/files?projectId=abc123&path=/`
- **THEN** the API returns a JSON array of file entries (`{ name, type, size, modifiedAt }`) for the workspace root, excluding `.git`, `node_modules`, `.next`, `.claude`, `__pycache__`, and `.turbo` directories

#### Scenario: List subdirectory
- **WHEN** a client requests `GET /api/agents/nori/workspace/files?projectId=abc123&path=/src`
- **THEN** the API returns entries for the `/src` subdirectory, sorted with directories first then alphabetically

#### Scenario: No workspace exists
- **WHEN** a client requests a workspace listing for a project that has no workspace directory
- **THEN** the API returns HTTP 404 with `{ error: "Workspace not found" }`

#### Scenario: Path traversal prevention
- **WHEN** a client requests a path containing `..` segments
- **THEN** the API returns HTTP 400 with an error, preventing directory traversal outside the workspace

### Requirement: Workspace file reading by agent name
The system SHALL provide an API endpoint to read file contents from an agent's workspace.

#### Scenario: Read a file
- **WHEN** a client requests `GET /api/agents/nori/workspace/file?projectId=abc123&path=/README.md`
- **THEN** the API returns `{ content, path, size }` with the file's UTF-8 text content

#### Scenario: File too large
- **WHEN** a client requests a file larger than 100KB
- **THEN** the API returns HTTP 413 with `{ error: "File too large" }`

### Requirement: Full-page workspace browser
The frontend SHALL provide a dedicated page at `/agents/[name]/workspace` that displays the agent's workspace file tree and file contents.

#### Scenario: Browse workspace with project selector
- **WHEN** a user navigates to `/agents/nori/workspace`
- **THEN** the page displays a project selector and the workspace file tree for the selected project

#### Scenario: View file contents
- **WHEN** a user clicks a file in the workspace tree
- **THEN** the file's contents are displayed in a viewer panel alongside the tree

### Requirement: Navigation from agent profile
The agent profile page SHALL include a link to the workspace browser.

#### Scenario: Link to workspace
- **WHEN** a user views an agent's profile at `/agents/nori`
- **THEN** a "Workspace" link or button is visible that navigates to `/agents/nori/workspace`
