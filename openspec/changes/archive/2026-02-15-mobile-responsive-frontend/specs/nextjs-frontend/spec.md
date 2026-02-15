## MODIFIED Requirements

### Requirement: App layout structure
The app layout SHALL use a responsive sidebar that is fixed and visible on desktop (768px+) and hidden as an overlay drawer on mobile (below 768px). The main content area SHALL span full width on mobile with no sidebar offset. The layout MUST maintain the existing animated gradient background, breadcrumb navigation, and agent status sidebar content.

#### Scenario: Desktop layout unchanged
- **WHEN** the viewport is 768px or above
- **THEN** the layout shows a fixed sidebar (240px expanded / 64px collapsed) on the left, with main content offset by the sidebar width, a sticky header with breadcrumbs and widgets, and animated gradient blobs in the background

#### Scenario: Mobile layout
- **WHEN** the viewport is below 768px
- **THEN** the sidebar is hidden by default, main content spans full width, the header shows a hamburger menu and page title, and the sidebar opens as an overlay drawer when triggered

#### Scenario: Layout transition
- **WHEN** the viewport is resized across the 768px breakpoint
- **THEN** the layout transitions smoothly between mobile and desktop modes
