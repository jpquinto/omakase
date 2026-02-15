## ADDED Requirements

### Requirement: Viewport meta configuration
The root layout MUST include a viewport meta tag with `width=device-width, initial-scale=1, viewport-fit=cover` to enable proper mobile rendering.

#### Scenario: Viewport meta present
- **WHEN** any page is loaded on a mobile browser
- **THEN** the page renders at device width without default zoom or overflow

### Requirement: Mobile content padding
The main content area SHALL use reduced padding on mobile viewports. Padding MUST be `p-4` below 768px and `p-8` at 768px and above.

#### Scenario: Padding on mobile
- **WHEN** the viewport is below 768px
- **THEN** the main content area has 16px padding on all sides

#### Scenario: Padding on desktop
- **WHEN** the viewport is 768px or above
- **THEN** the main content area has 32px padding on all sides

### Requirement: Sidebar layout switching
Below 768px, the sidebar MUST NOT push main content. The main content SHALL take full viewport width. The sidebar operates as an overlay drawer only.

#### Scenario: Content width on mobile
- **WHEN** the viewport is below 768px
- **THEN** the main content spans the full viewport width with no left padding offset

#### Scenario: Content width on desktop
- **WHEN** the viewport is 768px or above
- **THEN** the main content is offset by the sidebar width (240px expanded, 64px collapsed)

### Requirement: Page grid responsiveness
All page-level grids (projects, agents) SHALL collapse to single-column layout on mobile and expand to multi-column on desktop.

#### Scenario: Projects grid on mobile
- **WHEN** the viewport is below 768px
- **THEN** project cards display in a single-column stack

#### Scenario: Agents grid on mobile
- **WHEN** the viewport is below 768px
- **THEN** agent cards display in a single-column stack

### Requirement: Touch-friendly tap targets
All interactive elements (buttons, links, toggles) MUST have a minimum touch target size of 44x44px on mobile viewports.

#### Scenario: Small buttons have adequate touch area
- **WHEN** a button is displayed on a mobile viewport
- **THEN** its clickable area is at least 44x44 pixels, even if visually smaller
