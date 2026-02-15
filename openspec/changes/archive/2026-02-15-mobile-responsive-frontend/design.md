## Context

The Omakase frontend is a Next.js 15 dashboard with a fixed 240px sidebar, sticky header, and desktop-optimized components. The layout uses `fixed inset-y-0 left-0` sidebar positioning with `pl-60` on main content — no mobile breakpoints exist for core navigation. Key pain points: kanban is 5-column fixed grid, modals use hardcoded `w-[85vw] max-w-[1100px]`, tables have no card alternative, and there are no viewport meta tags.

The user interacts with the app primarily on mobile for monitoring agent status, reviewing pipelines, and chatting with agents. This is a progressive enhancement — desktop stays unchanged, mobile adapts.

## Goals / Non-Goals

**Goals:**
- Mobile-first responsive navigation with hamburger menu and slide-out drawer
- All pages usable on 375px+ viewports (iPhone SE as minimum target)
- Touch-friendly tap targets (44px minimum) throughout the UI
- Modals adapt to full-screen or bottom-sheet on mobile
- Complex visualizations (kanban, graphs, tables) have mobile-appropriate views
- Proper viewport meta configuration

**Non-Goals:**
- PWA / offline support (separate effort)
- Native app wrapper or React Native
- Redesigning desktop layout (must remain unchanged above `md` breakpoint)
- Performance optimization for low-end devices (separate concern)
- Responsive images / next/image optimization

## Decisions

### 1. Sidebar → Mobile Drawer Pattern

**Decision**: Hide sidebar below `md` (768px), show hamburger icon in header, open sidebar as an overlay drawer with backdrop.

**Rationale**: The standard mobile pattern. Keeps sidebar component intact — just toggles visibility and positioning. No structural refactor needed.

**Alternatives considered**:
- Bottom tab bar: More native-feeling but limits to 5 items and loses agent status cards
- Collapsible sidebar always visible: Still takes too much space on 375px screens

**Implementation**:
- Below `md`: sidebar gets `translate-x-[-100%]` by default, hamburger button in header triggers `translate-x-0`
- Backdrop overlay behind drawer catches taps to dismiss
- Sidebar always expanded (never collapsed) on mobile — collapsed icons are too small for touch
- `pl-60`/`pl-16` main content padding removed below `md` (sidebar overlays instead of pushing)

### 2. Responsive Breakpoint Strategy

**Decision**: Use Tailwind's mobile-first approach with `md:` (768px) as the primary desktop/mobile breakpoint.

**Rationale**: Most components already use `md:` for grid changes. 768px is where sidebar + content both fit comfortably.

**Breakpoints used**:
- Default (< 768px): Mobile layout
- `md:` (>= 768px): Desktop layout (current behavior)
- `lg:` / `xl:`: Only for multi-column grids that need more room

### 3. Modal → Full-Screen Sheet on Mobile

**Decision**: Modals become full-viewport overlays on mobile (`w-screen h-screen` below `md`), retain current sizing on desktop.

**Rationale**: 85vw modal on a 375px screen is only 319px — too cramped for chat panels and forms. Full-screen removes the cramping and feels native.

**Implementation**:
- Update `DialogContent` base styles: add `max-md:h-[100dvh] max-md:w-screen max-md:max-w-none max-md:rounded-none`
- Chat modal: full-screen on mobile with a back-arrow close button
- Create project wizard: full-screen on mobile, steps remain the same

### 4. Kanban Board → Horizontal Swipe Tabs

**Decision**: On mobile, show one status column at a time with horizontal tab navigation at the top.

**Rationale**: 5 columns don't fit on mobile. Vertical stacking makes boards very long. Tab-per-column is the established mobile kanban pattern (Trello, Linear).

**Alternatives considered**:
- Horizontal scroll: Hard to discover offscreen columns, no overview
- Vertical accordion: Collapses context, harder to scan
- Single list with status badges: Loses the visual board metaphor

### 5. Tables → Card/List View on Mobile

**Decision**: Tables switch to a stacked card view below `md`. Each row becomes a card with key fields visible.

**Rationale**: Horizontal scrolling tables on mobile are frustrating. Card views are touch-friendly and scannable.

### 6. Header Adaptation

**Decision**: On mobile, header shows hamburger + page title only. Weather and Spotify widgets hidden below `md`.

**Rationale**: 375px header can't fit breadcrumbs + 2 widgets. Page title provides context; widgets are non-essential on mobile.

### 7. Touch Target Sizing

**Decision**: Ensure all interactive elements are at minimum 44x44px touch target on mobile, using padding expansion where needed.

**Rationale**: Apple HIG and WCAG 2.5.5 both recommend 44px minimum. Current sidebar buttons are 24px (size-6).

**Implementation**: Use `min-h-[44px] min-w-[44px]` on buttons, or expand padding. Don't increase visual size — increase tap area.

## Risks / Trade-offs

- **Risk**: Complex components (dependency graph SVG, calendar heatmap) may not translate well to small screens → **Mitigation**: These are lower priority; start with simplified views and iterate
- **Risk**: Sidebar drawer animation may conflict with chat page's sidebar swap behavior → **Mitigation**: On chat pages, the drawer shows thread list instead of nav; same drawer mechanism
- **Risk**: Full-screen modals on mobile may feel like new pages, confusing navigation → **Mitigation**: Use consistent close/back button positioning (top-left) and slide-up animation
- **Trade-off**: Hiding widgets on mobile means less ambient information → Acceptable since the core use case is monitoring agents, not checking weather
- **Trade-off**: Kanban tab view loses the multi-column overview → Users can swipe between columns; full board view available on desktop
