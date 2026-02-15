## ADDED Requirements

### Requirement: Tickets tab on project detail page
The system SHALL display a "Tickets" tab on the project detail page that shows all features as a sortable, filterable table.

#### Scenario: User navigates to the Tickets tab
- **WHEN** a user clicks the "Tickets" tab on the project detail page
- **THEN** a table of all features for the project is displayed with columns: name, priority, status, category, Linear issue link, and created date

#### Scenario: User sorts the table
- **WHEN** a user clicks a column header (name, priority, status, created date)
- **THEN** the table sorts by that column, toggling between ascending and descending

#### Scenario: User filters by status
- **WHEN** a user selects a status filter (pending, in_progress, passing, failing)
- **THEN** only features with that status are shown

#### Scenario: User searches features
- **WHEN** a user types in the search field
- **THEN** the table filters to show features whose name contains the search query (case-insensitive)

### Requirement: Inline feature editing
The system SHALL allow users to edit feature details inline from the tickets table.

#### Scenario: User edits a feature name
- **WHEN** a user clicks on a feature name in the table and types a new name
- **THEN** the feature name is updated via the API and the table reflects the change

#### Scenario: User changes feature priority
- **WHEN** a user selects a new priority from the priority dropdown in the table row
- **THEN** the feature priority is updated via the API

#### Scenario: User changes feature status
- **WHEN** a user selects a new status from the status dropdown in the table row
- **THEN** the feature status is updated via the API

### Requirement: Manual feature creation
The system SHALL allow users to manually create new features from the Tickets tab.

#### Scenario: User creates a new feature
- **WHEN** a user clicks "Add Feature" and fills in the name, description, priority, and category
- **THEN** a new feature is created in the project via the API and appears in the table

#### Scenario: User creates feature with minimal info
- **WHEN** a user provides only a feature name (required) and submits
- **THEN** the feature is created with default priority (3) and no category

### Requirement: Feature deletion
The system SHALL allow users to delete features from the Tickets tab.

#### Scenario: User deletes a feature
- **WHEN** a user clicks the delete action on a feature and confirms the deletion dialog
- **THEN** the feature is removed from DynamoDB and disappears from the table

#### Scenario: User cancels deletion
- **WHEN** a user clicks delete but dismisses the confirmation dialog
- **THEN** no deletion occurs

### Requirement: Feature detail panel
The system SHALL display a slide-out panel with full feature details when a feature is selected.

#### Scenario: User opens feature detail
- **WHEN** a user clicks on a feature row in the table
- **THEN** a slide-out panel opens showing: name, description, priority, status, category, dependencies, Linear issue link (if linked), created/updated timestamps

#### Scenario: User edits from detail panel
- **WHEN** a user edits fields in the detail panel and saves
- **THEN** the feature is updated via the API and the table reflects changes

### Requirement: Dependency management in detail panel
The system SHALL allow users to add and remove feature dependencies from the detail panel.

#### Scenario: User adds a dependency
- **WHEN** a user clicks "Add Dependency" in the detail panel and selects another feature from the dropdown
- **THEN** the selected feature is added to the dependency list via the API

#### Scenario: User removes a dependency
- **WHEN** a user clicks the remove button next to a dependency in the detail panel
- **THEN** the dependency is removed via the API

#### Scenario: Circular dependency prevented
- **WHEN** a user attempts to add a dependency that would create a cycle
- **THEN** the system rejects the operation and displays an error message

### Requirement: Feature CRUD API endpoints
The system SHALL expose orchestrator API endpoints for creating, updating, and deleting individual features.

#### Scenario: Create a feature
- **WHEN** a `POST /api/projects/:projectId/features` request is received with name, description, priority, and category
- **THEN** the system creates the feature and returns the created object

#### Scenario: Update a feature
- **WHEN** a `PATCH /api/features/:featureId` request is received with updated fields
- **THEN** the system updates the feature and returns success

#### Scenario: Delete a feature
- **WHEN** a `DELETE /api/features/:featureId` request is received
- **THEN** the system deletes the feature from DynamoDB and returns success

### Requirement: Dependency management API endpoints
The system SHALL expose orchestrator API endpoints for adding and removing feature dependencies.

#### Scenario: Add a dependency
- **WHEN** a `POST /api/features/:featureId/dependencies` request is received with `dependsOnId`
- **THEN** the system adds the dependency (with cycle detection) and returns success

#### Scenario: Remove a dependency
- **WHEN** a `DELETE /api/features/:featureId/dependencies/:dependsOnId` request is received
- **THEN** the system removes the dependency and returns success

### Requirement: Linear ticket badge on feature cards
The system SHALL display the Linear ticket badge on feature cards in the Kanban board when a feature is linked to a Linear issue.

#### Scenario: Feature linked to Linear issue
- **WHEN** a feature card is rendered in the Kanban board and the feature has a `linearIssueId`
- **THEN** the `LinearTicketBadge` component is displayed on the card with the issue identifier and a link to Linear

#### Scenario: Feature not linked to Linear
- **WHEN** a feature card is rendered and the feature has no `linearIssueId`
- **THEN** no Linear badge is shown
