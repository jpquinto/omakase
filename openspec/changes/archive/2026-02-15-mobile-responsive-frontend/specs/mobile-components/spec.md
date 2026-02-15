## ADDED Requirements

### Requirement: Mobile modal presentation
Dialogs and modals SHALL render as full-screen overlays on viewports below 768px. On desktop, they SHALL retain their current sizing.

#### Scenario: Dialog on mobile
- **WHEN** a dialog opens on a viewport below 768px
- **THEN** it fills the entire screen (100dvh height, 100vw width) with no border radius

#### Scenario: Dialog on desktop
- **WHEN** a dialog opens on a viewport 768px or above
- **THEN** it renders with its configured width and centered positioning

### Requirement: Mobile kanban view
The kanban board SHALL display one status column at a time on mobile, with tab navigation to switch between columns.

#### Scenario: Kanban on mobile
- **WHEN** the kanban board is viewed on a viewport below 768px
- **THEN** a horizontal tab bar shows the status column names, and only the selected column's cards are visible

#### Scenario: Switching kanban columns on mobile
- **WHEN** the user taps a different column tab on mobile
- **THEN** the view switches to show that column's cards

#### Scenario: Kanban on desktop
- **WHEN** the kanban board is viewed on a viewport 768px or above
- **THEN** all columns are displayed side-by-side as a grid

### Requirement: Mobile table card view
Data tables SHALL switch to a card/list layout on viewports below 768px. Each row MUST render as a distinct card showing key fields.

#### Scenario: Tickets table on mobile
- **WHEN** the tickets table is viewed below 768px
- **THEN** each ticket renders as a card with title, status, and assignee visible

#### Scenario: Table on desktop
- **WHEN** the tickets table is viewed at 768px or above
- **THEN** it renders as a standard horizontal table with columns

### Requirement: Feature detail panel mobile
The feature detail panel SHALL render as a full-screen overlay on mobile instead of a side panel.

#### Scenario: Feature detail on mobile
- **WHEN** a feature is selected on a viewport below 768px
- **THEN** the detail panel opens as a full-screen overlay with a back/close button

#### Scenario: Feature detail on desktop
- **WHEN** a feature is selected at 768px or above
- **THEN** the detail panel slides in from the right as a side panel

### Requirement: Agent stats grid mobile layout
The agent stats grid SHALL stack vertically on mobile with 2 columns maximum.

#### Scenario: Stats grid on mobile
- **WHEN** the agent stats grid is viewed below 768px
- **THEN** stats display in a 2-column grid

#### Scenario: Stats grid on desktop
- **WHEN** the agent stats grid is viewed at 768px or above
- **THEN** stats display in their full multi-column layout
