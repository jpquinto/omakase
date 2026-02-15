## ADDED Requirements

### Requirement: Mobile hamburger menu trigger
The system SHALL display a hamburger menu icon in the header on viewports below 768px (md breakpoint). The icon MUST be a minimum 44x44px touch target.

#### Scenario: Hamburger visible on mobile
- **WHEN** the viewport width is below 768px
- **THEN** a hamburger menu icon is displayed in the header on the left side

#### Scenario: Hamburger hidden on desktop
- **WHEN** the viewport width is 768px or above
- **THEN** no hamburger menu icon is displayed (sidebar is permanently visible)

### Requirement: Slide-out navigation drawer
The system SHALL open a full-height slide-out drawer from the left when the hamburger menu is tapped. The drawer MUST contain the same navigation items and agent status cards as the desktop sidebar.

#### Scenario: Opening the drawer
- **WHEN** the user taps the hamburger menu icon
- **THEN** the sidebar slides in from the left with a backdrop overlay behind it

#### Scenario: Closing the drawer via backdrop
- **WHEN** the drawer is open and the user taps the backdrop overlay
- **THEN** the drawer slides out and the backdrop fades away

#### Scenario: Closing the drawer via navigation
- **WHEN** the drawer is open and the user taps a navigation link
- **THEN** the drawer closes and the app navigates to the selected route

#### Scenario: Drawer shows expanded content
- **WHEN** the drawer is open on mobile
- **THEN** the sidebar is always in expanded state (never collapsed icon-only mode)

### Requirement: Mobile header simplification
The system SHALL show only the hamburger icon and current page title in the header on mobile viewports. Weather and Spotify widgets MUST be hidden below 768px.

#### Scenario: Header on mobile
- **WHEN** the viewport is below 768px
- **THEN** the header shows the hamburger icon (left) and page title (center), without weather or Spotify widgets

#### Scenario: Header on desktop
- **WHEN** the viewport is 768px or above
- **THEN** the header shows breadcrumbs (left) and weather/Spotify widgets (right) as before
