## 1. Project Scaffolding & Monorepo Setup

- [x] 1.1 Initialize monorepo structure with `packages/` (db, shared) and `apps/` (web, orchestrator) directories
- [x] 1.2 Set up pnpm workspace with `pnpm-workspace.yaml` linking packages and apps
- [x] 1.3 Configure root `tsconfig.json` with path aliases for `@omakase/db`, `@omakase/shared`
- [x] 1.4 Add root ESLint and Prettier configuration with TypeScript support
- [x] 1.5 Create `.env.example` with all required environment variables (Auth0, Convex, AWS, Linear)

## 2. Convex Database Setup

- [x] 2.1 Initialize Convex project (`npx convex init`) in `packages/convex/`
- [x] 2.2 Define Convex schema with tables: projects, features, agents, agent_runs, tickets, users
- [x] 2.3 Implement project CRUD mutations: `createProject`, `updateProject`, `deleteProject`
- [x] 2.4 Implement project queries: `listProjects` (by user), `getProject` (by ID)
- [x] 2.5 Implement feature mutations: `createFeaturesBulk`, `claimFeature`, `markFeaturePassing`, `markFeatureFailing`, `markFeatureInProgress`
- [x] 2.6 Implement feature queries: `listFeatures` (by project), `getReadyFeatures`, `getBlockedFeatures`, `getFeatureStats`
- [x] 2.7 Implement dependency mutations: `addDependency`, `removeDependency` with cycle detection (Kahn's algorithm)
- [x] 2.8 Implement agent_runs mutations: `createAgentRun`, `updateAgentStatus`, `completeAgentRun`
- [x] 2.9 Implement agent_runs queries: `listActiveAgents` (by project), `getAgentLogs`
- [x] 2.10 Implement ticket mutations: `syncTicket`, `updateTicketStatus`

## 3. Drizzle ORM & Shared Types

- [x] 3.1 Set up `packages/db/` with Drizzle ORM and `drizzle-kit`
- [x] 3.2 Define Drizzle schema files mirroring Convex tables (projects, features, agents, tickets)
- [x] 3.3 Export inferred TypeScript types (`Feature`, `Project`, `Agent`, `Ticket`, `AgentRun`) from `@omakase/db`
- [x] 3.4 Configure `drizzle-kit` for migration generation and verify alignment with Convex schema

## 4. Next.js Frontend Foundation

- [x] 4.1 Initialize Next.js 15 app with App Router in `apps/web/` using TypeScript and Tailwind CSS v4
- [x] 4.2 Port neobrutalism design system: CSS variables, custom animations (`animate-slide-in`, `animate-pulse-neo`, `animate-shimmer`), color tokens
- [x] 4.3 Set up route group structure: `(public)/` for landing/login, `(app)/` for authenticated routes
- [x] 4.4 Create shared layout with navigation sidebar, header with user avatar, and logout button
- [x] 4.5 Configure Convex client provider wrapping the app for reactive queries
- [x] 4.6 Set up Vercel project with automatic deployments from main branch

## 5. Auth0 Authentication

- [x] 5.1 Install and configure `@auth0/nextjs-auth0` with Auth0 tenant credentials
- [x] 5.2 Create `/api/auth/[auth0]/route.ts` handler for login/logout/callback
- [x] 5.3 Implement Next.js middleware protecting all `(app)/` routes, redirecting unauthenticated users to login
- [x] 5.4 Add `UserProvider` wrapper and `useUser` hook for client components
- [x] 5.5 Create user sync: on first login, upsert user record in Convex with Auth0 profile data
- [x] 5.6 Implement role-based access control: define `admin`, `developer`, `viewer` roles in Auth0 and read from session
- [x] 5.7 Create `withRole()` middleware helper for API routes requiring specific roles
- [x] 5.8 Configure Auth0 Machine-to-Machine application for ECS service authentication

## 6. Dashboard Pages

- [x] 6.1 Build `/projects` page: list projects with name, progress bar (X/Y passing), active agent count using Convex `useQuery`
- [x] 6.2 Build `/projects/[id]` page with tab layout: Kanban, Graph, Agents, Logs, Settings
- [x] 6.3 Implement Kanban board tab: columns for pending/in_progress/passing/failing with feature cards (name, priority badge, category, dependency count)
- [x] 6.4 Implement Dependency Graph tab: interactive dagre graph with feature nodes and dependency edges (port from existing `DependencyGraph.tsx`)
- [x] 6.5 Implement Agent Mission Control tab: active agents with mascot avatars, role labels, current status, and assigned feature
- [x] 6.6 Implement Log Viewer tab: real-time agent output streaming, filterable by agent and feature
- [x] 6.7 Implement Celebration Overlay: confetti animation when all features reach "passing"
- [x] 6.8 Implement toast notifications for agent events (feature completed, agent failed)
- [x] 6.9 Add keyboard shortcuts: `G` (graph toggle), `N` (new feature), `D` (debug), `,` (settings)

## 7. ECS Backend Infrastructure

- [x] 7.1 Create AWS CDK project in `infra/` with VPC, private subnets, ALB, and security groups
- [x] 7.2 Define ECR repository for agent Docker image
- [x] 7.3 Create Dockerfile for agent runtime: Node.js 20, Claude Code CLI, git, project tooling
- [x] 7.4 Define ECS Fargate task definition for orchestrator service (1 vCPU, 2GB memory, always-on)
- [x] 7.5 Define ECS Fargate task definition for agent tasks (1 vCPU, 2GB memory, on-demand)
- [x] 7.6 Set up IAM roles: task execution role (ECR pull, CloudWatch), task role (Convex access, git operations)
- [x] 7.7 Configure CloudWatch log groups for orchestrator and agent tasks
- [x] 7.8 Create deployment pipeline: `cdk deploy` from CI, ECR image push on merge

## 8. Orchestrator Service

- [x] 8.1 Create orchestrator Node.js service in `apps/orchestrator/` with Convex client and ECS SDK
- [x] 8.2 Implement feature watcher: poll Convex for ready features (pending, dependencies met) every 30 seconds
- [x] 8.3 Implement agent pipeline: architect → coder → reviewer → tester sequence for each feature
- [x] 8.4 Implement `startAgent(featureId, role)`: launch Fargate task with role-specific env vars and CLAUDE.md
- [x] 8.5 Implement `monitorAgent(taskArn)`: poll ECS task status, stream CloudWatch logs to Convex
- [x] 8.6 Implement `stopAgent(taskArn)`: stop Fargate task and release feature to pending
- [x] 8.7 Implement crash handling: detect non-zero exits, retry once, mark feature as failing on second failure
- [x] 8.8 Implement concurrency control: respect per-project max agent limit (default 3), queue excess work
- [x] 8.9 Implement agent status reporting: write status updates to Convex agent_runs table every 5 seconds

## 9. Agent Role Definitions

- [x] 9.1 Create architect agent CLAUDE.md: read feature requirements, analyze codebase, produce implementation plan
- [x] 9.2 Create coder agent CLAUDE.md: implement plan, write code, run lint/type-check, commit to feature branch
- [x] 9.3 Create reviewer agent CLAUDE.md: review diff for quality/security/correctness, approve or request changes
- [x] 9.4 Create tester agent CLAUDE.md: write tests for acceptance criteria, run test suite, report results
- [x] 9.5 Create shared agent setup script: clone repo, checkout `agent/<feature-id>` branch, install dependencies
- [x] 9.6 Implement PR creation on successful pipeline completion: create PR from agent branch to main

## 10. Linear Integration

- [x] 10.1 Create Linear OAuth flow: `/api/auth/linear` route for connecting workspace, store token in Convex
- [x] 10.2 Implement webhook receiver at `/api/webhooks/linear` with signature validation
- [x] 10.3 Implement ticket ingestion: Linear issue created/updated with configured label → create/update Convex feature
- [x] 10.4 Implement status sync (feature → Linear): update Linear issue state when agent claims, completes, or fails a feature
- [x] 10.5 Implement comment posting: post implementation details to Linear issue on feature completion
- [x] 10.6 Implement dependency mapping: sync Linear "blocks"/"blocked-by" relations to Convex feature dependencies
- [x] 10.7 Add Linear ticket overlay to feature cards: show issue ID (e.g., "ENG-123") as clickable link with status badge

## 11. Testing & CI/CD

- [x] 11.1 Set up Vitest for unit testing Convex functions and shared utilities
- [x] 11.2 Write unit tests for Convex mutations: feature CRUD, dependency cycle detection, agent lifecycle
- [x] 11.3 Set up Playwright for E2E testing the Next.js frontend
- [x] 11.4 Write E2E tests: login flow, project creation, kanban board interaction, agent monitoring
- [x] 11.5 Configure GitHub Actions CI: lint, type-check, unit tests, E2E tests on PR
- [x] 11.6 Configure CD pipeline: Vercel auto-deploy for frontend, CDK deploy for ECS on merge to main
