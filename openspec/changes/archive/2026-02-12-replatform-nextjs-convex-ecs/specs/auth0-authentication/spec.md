## ADDED Requirements

### Requirement: Auth0 tenant configuration
The system SHALL use an Auth0 tenant with a Regular Web Application configured for the Next.js frontend, supporting email/password and social login providers.

#### Scenario: Auth0 application is configured
- **WHEN** the Auth0 dashboard is accessed
- **THEN** a Regular Web Application exists with callback URLs pointing to the Vercel deployment and localhost:3000

### Requirement: Login and logout flows
The system SHALL provide login and logout functionality using `@auth0/nextjs-auth0` with server-side session management.

#### Scenario: User logs in
- **WHEN** an unauthenticated user visits any protected route
- **THEN** they are redirected to the Auth0 Universal Login page

#### Scenario: Successful login redirects to dashboard
- **WHEN** a user completes Auth0 login successfully
- **THEN** they are redirected to `/projects` with an active session

#### Scenario: User logs out
- **WHEN** a user clicks the logout button
- **THEN** their session is destroyed and they are redirected to the login page

### Requirement: Route protection via middleware
The system SHALL use Next.js middleware to protect all routes under `/(app)/` requiring authentication. Public routes (`/`, `/login`, `/api/auth/*`) SHALL be accessible without authentication.

#### Scenario: Unauthenticated access to protected route
- **WHEN** an unauthenticated user navigates to `/projects`
- **THEN** they are redirected to `/api/auth/login`

#### Scenario: Authenticated access to protected route
- **WHEN** an authenticated user navigates to `/projects`
- **THEN** the page renders normally with the user's session data available

### Requirement: Role-based access control
The system SHALL support three roles: `admin`, `developer`, and `viewer`. Roles are stored in Auth0 user metadata and included in the session token.

#### Scenario: Admin can manage projects and agents
- **WHEN** a user with role `admin` accesses the platform
- **THEN** they can create/delete projects, start/stop agents, and manage team members

#### Scenario: Developer can view and interact with projects
- **WHEN** a user with role `developer` accesses the platform
- **THEN** they can view projects, add features, and monitor agents but cannot delete projects or manage members

#### Scenario: Viewer has read-only access
- **WHEN** a user with role `viewer` accesses the platform
- **THEN** they can view projects, features, and agent status but cannot modify anything

### Requirement: Machine-to-machine authentication for ECS
The system SHALL use Auth0 machine-to-machine tokens for ECS backend services to authenticate with Convex and Next.js API routes.

#### Scenario: ECS service authenticates with Convex
- **WHEN** the ECS orchestrator needs to update feature status in Convex
- **THEN** it uses an Auth0 M2M token to authenticate the Convex action call
