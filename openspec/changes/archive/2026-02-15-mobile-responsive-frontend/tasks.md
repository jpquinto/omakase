## 1. Foundation & Viewport Setup

- [x] 1.1 Add viewport meta tag (`width=device-width, initial-scale=1, viewport-fit=cover`) to root layout metadata
- [x] 1.2 Add mobile-specific CSS utilities to globals.css (safe-area insets, touch-action helpers, 100dvh support)

## 2. Mobile Navigation — Sidebar Drawer

- [x] 2.1 Add mobile state management to AppLayout: `mobileDrawerOpen` state, hamburger toggle handler, viewport-aware rendering
- [x] 2.2 Implement mobile drawer overlay: sidebar becomes `translate-x` animated drawer below `md` with backdrop overlay
- [x] 2.3 Add hamburger menu button to header (visible only below `md`, 44px touch target)
- [x] 2.4 Remove `pl-60`/`pl-16` main content offset below `md` — content spans full width on mobile
- [x] 2.5 Auto-close drawer on navigation (link click) and backdrop tap
- [x] 2.6 Force sidebar to expanded state on mobile (never show collapsed icon-only mode)

## 3. Header Responsiveness

- [x] 3.1 Hide WeatherWidget and SpotifyNowPlaying below `md` breakpoint
- [x] 3.2 Simplify breadcrumbs on mobile — show only current page title (last segment)
- [x] 3.3 Adjust header height and padding for mobile (compact spacing, centered title)

## 4. Main Content Padding & Spacing

- [x] 4.1 Change main content padding from `p-8` to `p-4 md:p-8`
- [x] 4.2 Reduce heading font sizes on mobile (text-4xl → text-2xl, text-5xl → text-3xl below `md`)

## 5. Dialog / Modal Mobile Adaptation

- [x] 5.1 Update `DialogContent` base component: add `max-md:h-[100dvh] max-md:w-screen max-md:max-w-none max-md:rounded-none` responsive styles
- [x] 5.2 Update chat modal in AppLayout — full-screen on mobile with back/close button
- [x] 5.3 Update create-project-wizard modal — full-screen on mobile

## 6. Kanban Board Mobile View

- [x] 6.1 Add mobile tab navigation for kanban columns — horizontal tabs showing column names
- [x] 6.2 Show only the selected column's cards on mobile (below `md`)
- [x] 6.3 Preserve desktop 5-column grid layout unchanged at `md` and above

## 7. Tables → Card View

- [x] 7.1 Create mobile card variant for tickets-table — each row renders as a card with title, status, assignee
- [x] 7.2 Toggle between table (desktop) and card list (mobile) views based on viewport

## 8. Feature Detail Panel

- [x] 8.1 Render feature-detail-panel as full-screen overlay on mobile (instead of fixed-width side panel)
- [x] 8.2 Add back/close button for mobile panel dismissal

## 9. Agent Pages Responsiveness

- [x] 9.1 Make agent listing grid responsive: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- [x] 9.2 Adapt agent profile page — stack hero section, reduce heading sizes, responsive stats grid (2-col on mobile)
- [x] 9.3 Adapt agent-stats-grid to `grid-cols-2` on mobile
- [x] 9.4 Make calendar-heatmap horizontally scrollable on mobile with `overflow-x-auto`

## 10. Chat Page Mobile Layout

- [x] 10.1 Hide thread/explorer sidebar by default on mobile, add toggle button to show as overlay
- [x] 10.2 Chat area takes full width on mobile
- [x] 10.3 Chat input fixed at bottom with 44px minimum height and touch-friendly action buttons
- [x] 10.4 Ensure chat messages have appropriate mobile padding and font sizing

## 11. Projects Page Responsiveness

- [x] 11.1 Make projects grid responsive: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`
- [x] 11.2 Adapt project detail page tabs for mobile — scrollable horizontal tabs or dropdown
- [x] 11.3 Make GitHub repo selector modal full-screen on mobile

## 12. Touch Target Audit

- [x] 12.1 Audit all buttons and interactive elements for 44px minimum touch target
- [x] 12.2 Expand tap areas on sidebar agent status card action buttons (currently 24px)
- [x] 12.3 Ensure theme toggle, collapse button, and other small controls meet 44px minimum

## 13. Visual Testing & Verification

- [x] 13.1 Test all pages at 375px (iPhone SE), 390px (iPhone 14), and 768px (iPad) using Playwright
- [x] 13.2 Verify sidebar drawer open/close behavior on mobile
- [x] 13.3 Verify modals render full-screen on mobile and normal on desktop
- [x] 13.4 Verify kanban tab view works correctly on mobile
- [x] 13.5 Verify no horizontal overflow on any page at 375px
