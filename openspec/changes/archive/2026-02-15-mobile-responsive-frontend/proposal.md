## Why

The Omakase dashboard is currently desktop-only — the fixed sidebar, large modals, 5-column kanban, and hardcoded widths make it unusable on phones and tablets. Mobile access is a primary interaction mode for monitoring agent pipelines, reviewing status, and chatting with agents on the go.

## What Changes

- **Mobile navigation**: Replace fixed sidebar with a collapsible drawer/hamburger menu on small screens
- **Responsive header**: Stack or hide header widgets (weather, Spotify) on mobile, compact breadcrumbs
- **Adaptive layouts**: All page grids (projects, agents, kanban, stats) collapse to single-column on mobile
- **Mobile-friendly modals**: Dialogs become full-screen or bottom sheets on small viewports
- **Touch optimization**: Minimum 44px tap targets, touch-friendly spacing throughout
- **Responsive visualizations**: Kanban horizontal swipe, dependency graph pan/zoom, table-to-card views
- **Chat mobile experience**: Full-screen chat adapts to mobile with collapsible explorer sidebar
- **Viewport configuration**: Add proper viewport meta, theme-color, and mobile-web-app meta tags

## Capabilities

### New Capabilities

- `mobile-navigation`: Hamburger menu, slide-out drawer, bottom navigation patterns for mobile viewports
- `responsive-layout`: Breakpoint-driven layout system — sidebar collapse, content reflow, adaptive spacing
- `mobile-components`: Touch-optimized component variants — bottom sheets, swipeable cards, mobile tables

### Modified Capabilities

- `nextjs-frontend`: Layout structure changes from fixed sidebar to responsive sidebar/drawer hybrid
- `realtime-dashboard`: Dashboard grids and visualizations adapt to mobile viewports
- `agent-chat`: Chat page layout becomes responsive with collapsible explorer panel

## Impact

- **Layout files**: `(app)/layout.tsx` (sidebar/header restructure), `layout.tsx` (viewport meta)
- **All page routes**: Projects, agents, agent detail, chat — grid and spacing adjustments
- **15+ components**: kanban-board, dependency-graph, tickets-table, agent-stats-grid, feature-detail-panel, create-project-wizard, agent-mission-control, calendar-heatmap, dialog, chat panels
- **Design system**: New mobile-specific utility classes and breakpoint conventions in globals.css
- **No API changes**: This is purely a frontend presentation layer change
- **No breaking changes**: Desktop experience preserved, mobile added as progressive enhancement
