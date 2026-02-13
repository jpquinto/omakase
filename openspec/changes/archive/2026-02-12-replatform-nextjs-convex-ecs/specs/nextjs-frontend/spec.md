## ADDED Requirements

### Requirement: Next.js App Router project structure
The system SHALL use Next.js 15 with App Router, organized with route groups for authenticated and public pages.

#### Scenario: Application starts in development
- **WHEN** `next dev` is run
- **THEN** the development server starts and serves pages at localhost:3000 with hot reload

#### Scenario: Production build succeeds
- **WHEN** `next build` is run
- **THEN** the build completes without TypeScript or lint errors

### Requirement: Project dashboard page
The system SHALL provide a dashboard page at `/projects` displaying all projects for the authenticated user as a list with status indicators.

#### Scenario: User views project list
- **WHEN** an authenticated user navigates to `/projects`
- **THEN** they see a list of their projects with name, feature progress (X/Y passing), and active agent count

### Requirement: Project detail page with kanban board
The system SHALL provide a project detail page at `/projects/[id]` with a kanban board showing features organized by status (pending, in_progress, passing, failing).

#### Scenario: View kanban board
- **WHEN** an authenticated user navigates to `/projects/[id]`
- **THEN** they see a kanban board with columns for each feature status, and features as draggable cards

#### Scenario: Feature cards show detail
- **WHEN** a feature card is displayed on the kanban board
- **THEN** it shows the feature name, priority badge, category tag, and dependency count

### Requirement: Dependency graph visualization
The system SHALL provide an interactive dependency graph view (toggle from kanban) using dagre layout, showing feature nodes and dependency edges.

#### Scenario: Toggle to graph view
- **WHEN** the user presses "G" or clicks the graph toggle
- **THEN** the view switches to an interactive node graph with features as nodes and dependencies as directed edges

### Requirement: Agent mission control panel
The system SHALL display an agent mission control panel showing active agents with their status, current task, role, and mascot avatar.

#### Scenario: View active agents
- **WHEN** agents are running for a project
- **THEN** the mission control panel shows each agent's name/mascot, role (architect/coder/reviewer/tester), current status, and the feature they're working on

### Requirement: Vercel deployment
The system SHALL be deployable to Vercel with automatic deployments from the main branch and preview deployments for pull requests.

#### Scenario: Push to main triggers deployment
- **WHEN** code is pushed to the main branch
- **THEN** Vercel builds and deploys the application to the production URL

#### Scenario: PR creates preview deployment
- **WHEN** a pull request is opened
- **THEN** Vercel creates a preview deployment with a unique URL

### Requirement: Responsive layout with neobrutalism design
The system SHALL use Tailwind CSS v4 with the existing neobrutalism design system (bold borders, shadow offsets, vibrant colors).

#### Scenario: Design system tokens are available
- **WHEN** the application renders
- **THEN** CSS variables for neo-pending, neo-progress, neo-done colors and neobrutalist shadow/border utilities are available
