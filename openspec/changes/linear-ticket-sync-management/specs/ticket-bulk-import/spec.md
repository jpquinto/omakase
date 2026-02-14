## ADDED Requirements

### Requirement: Select Linear issues for import
The system SHALL allow users to select multiple Linear issues from the workspace browser for import as Omakase features.

#### Scenario: User selects individual issues
- **WHEN** a user clicks the checkbox on one or more Linear issues in the workspace browser
- **THEN** the issues are added to the import selection and a floating action bar shows the count of selected issues

#### Scenario: User selects all visible issues
- **WHEN** a user clicks "Select All" in the workspace browser
- **THEN** all currently visible (filtered) issues are added to the selection

#### Scenario: User deselects an issue
- **WHEN** a user unchecks a previously selected issue
- **THEN** the issue is removed from the selection and the count updates

### Requirement: Bulk import issues as features
The system SHALL import selected Linear issues as features in the current project, with conflict detection.

#### Scenario: Successful bulk import
- **WHEN** a user clicks "Import Selected" with one or more issues selected
- **THEN** the system creates a feature for each selected issue with mapped title, description, priority, Linear issue ID, and Linear issue URL, and displays a success summary

#### Scenario: Duplicate detection during import
- **WHEN** a selected issue already exists as a feature (matched by `linearIssueId`)
- **THEN** the duplicate is skipped (not overwritten) and the summary reports how many were skipped vs. created

#### Scenario: Priority mapping on import
- **WHEN** a Linear issue has a priority value (0=no priority, 1=urgent, 2=high, 3=medium, 4=low)
- **THEN** the system maps it to Omakase priority (0→3, 1→1, 2→2, 3→3, 4→4, 5→5) where 1 is critical

#### Scenario: Import with no selection
- **WHEN** a user clicks "Import Selected" with no issues selected
- **THEN** the button is disabled and no action is taken

### Requirement: Bulk feature creation API endpoint
The system SHALL expose an orchestrator API endpoint for creating multiple features in a single request.

#### Scenario: Bulk create features
- **WHEN** a `POST /api/projects/:projectId/features/bulk` request is received with an array of feature objects
- **THEN** the system creates all features using `createFeaturesBulk`, skipping any with duplicate `linearIssueId`, and returns the list of created features and skipped identifiers

#### Scenario: Empty array submitted
- **WHEN** the bulk create endpoint receives an empty array
- **THEN** the system returns HTTP 400 with an error message
