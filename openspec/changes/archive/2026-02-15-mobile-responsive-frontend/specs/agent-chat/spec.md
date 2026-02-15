## MODIFIED Requirements

### Requirement: Chat page responsive layout
The agent chat page SHALL adapt its layout for mobile viewports. The explorer/thread sidebar MUST be collapsible on mobile. The chat area MUST take full viewport width on mobile. The chat input MUST remain fixed at the bottom with adequate touch spacing.

#### Scenario: Chat page on mobile
- **WHEN** the agent chat page is viewed below 768px
- **THEN** the chat area fills the full viewport width, the thread/explorer sidebar is hidden by default, and a toggle button allows showing the sidebar as an overlay

#### Scenario: Chat page on desktop
- **WHEN** the agent chat page is viewed at 768px or above
- **THEN** the chat area and sidebar display side-by-side using the existing resizable panel layout

#### Scenario: Chat input on mobile
- **WHEN** the chat input is displayed on mobile
- **THEN** the input area is fixed at the bottom of the viewport with 44px minimum height and touch-friendly action buttons

### Requirement: Chat modal mobile presentation
The agent chat modal (opened from sidebar quick-chat) SHALL render as a full-screen overlay on mobile instead of a centered dialog.

#### Scenario: Chat modal on mobile
- **WHEN** the chat modal opens on a viewport below 768px
- **THEN** it fills the entire screen with a close/back button in the top-left corner

#### Scenario: Chat modal on desktop
- **WHEN** the chat modal opens at 768px or above
- **THEN** it renders as an 85vw centered dialog with max-width 1100px
