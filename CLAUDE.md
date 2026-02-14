# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Prerequisites

- Bun 1.2+ (runtime for all packages)
- Node.js 20+ (for AWS CDK only)
- Claude Code CLI

## Project Overview

Omakase is an autonomous development platform that uses a team of AI agents (architect, coder, reviewer, tester) to implement features from Linear tickets. The orchestrator polls for ready features, runs a 4-step agent pipeline on AWS ECS Fargate, and reports results back to a real-time dashboard.

For full tech stack details, see [TECH_STACK.md](TECH_STACK.md).

## Monorepo Structure

```
/
├── apps/
│   ├── web/              # Next.js 15 frontend (Vercel)
│   └── orchestrator/     # Elysia backend (ECS Fargate)
├── packages/
│   ├── convex/           # Convex schema + server functions
│   ├── db/               # Drizzle ORM type schemas
│   └── shared/           # Shared utilities + types
├── infra/                # AWS CDK infrastructure
├── openspec/             # OpenSpec change management
└── .claude/              # Commands, agents, skills
```

Managed via Bun workspaces (`"workspaces": ["apps/*", "packages/*"]` in root `package.json`).

## Commands

### Development

```bash
# Install all dependencies
bun install

# Frontend (Next.js)
bun --filter @omakase/web run dev        # Dev server at localhost:3000
bun --filter @omakase/web run build      # Production build
bun --filter @omakase/web run lint       # ESLint

# Backend (Elysia orchestrator)
bun --filter @omakase/orchestrator run dev   # Dev server with watch mode
bun --filter @omakase/orchestrator run start # Production start

# Convex
bun --filter @omakase/convex run dev      # Local Convex dev server
bun --filter @omakase/convex run deploy   # Deploy to Convex cloud

# Type checking (all packages)
bun --filter '*' run typecheck

# Drizzle ORM
bun --filter @omakase/db run generate    # Generate migrations
bun --filter @omakase/db run migrate     # Run migrations
```

### Infrastructure (CDK)

```bash
cd infra
npm ci
npx cdk diff      # Preview changes
npx cdk deploy    # Deploy to AWS
```

## Testing

```bash
# Convex unit tests
bun --filter @omakase/convex run test

# Frontend E2E tests
bun --filter @omakase/web run test:e2e
bun --filter @omakase/web run test:e2e:ui    # With Playwright UI
```

### CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to main:
- Typecheck all packages
- Lint web app
- Run Convex tests
- Run Playwright E2E tests

## Architecture

### Frontend (`apps/web/`)

Next.js 15 App Router with React 19, Tailwind CSS v4 (neobrutalism design), and Auth0 v4 authentication.

**Route groups:**
- `(public)/` -- Landing page, unauthenticated routes
- `(app)/` -- Protected dashboard routes (requires Auth0 session)

**Key files:**
- `src/middleware.ts` -- Auth0 middleware, protects `(app)/` routes
- `src/lib/auth0.ts` -- Auth0Client singleton
- `src/providers/auth-provider.tsx` -- Auth0 React context
- `src/providers/convex-provider.tsx` -- Convex React client for real-time subscriptions
- `src/hooks/use-keyboard-shortcuts.ts` -- Global keyboard shortcuts
- `src/components/kanban-board.tsx` -- Feature kanban with status columns
- `src/components/dependency-graph.tsx` -- dagre-based dependency visualization
- `src/components/agent-mission-control.tsx` -- Live agent status dashboard
- `src/components/log-viewer.tsx` -- Agent output log viewer
- `src/components/celebration-overlay.tsx` -- Completion animations
- `src/components/linear-ticket-badge.tsx` -- Linear issue link badges

**API routes:**
- `api/auth/[auth0]/route.ts` -- Auth0 SDK handler
- `api/auth/sync/route.ts` -- User sync to Convex
- `api/auth/linear/route.ts` -- Linear OAuth initiation
- `api/auth/linear/callback/route.ts` -- Linear OAuth callback
- `api/webhooks/linear/route.ts` -- Linear webhook receiver

**Linear integration (`src/lib/linear/`):**
- `client.ts` -- Linear GraphQL client
- `ticket-sync.ts` -- Bidirectional Linear issue <-> Convex feature sync
- `status-sync.ts` -- Status mapping between Linear and Omakase
- `comments.ts` -- Linear comment sync
- `dependency-sync.ts` -- Dependency mapping

### Backend (`apps/orchestrator/`)

Bun + Elysia server that polls Convex for ready features and orchestrates agent pipelines on ECS Fargate.

**Key files:**
- `src/index.ts` -- Elysia server entry point with `/health` endpoint and request logging
- `src/feature-watcher.ts` -- Polls Convex every 30s for pending features across all projects
- `src/pipeline.ts` -- 4-step agent pipeline: architect -> coder -> reviewer -> tester
- `src/ecs-agent.ts` -- Launches/stops ECS Fargate tasks via AWS SDK v3
- `src/agent-monitor.ts` -- Monitors ECS task completion and exit codes
- `src/concurrency.ts` -- Per-project concurrency limits
- `src/pr-creator.ts` -- GitHub PR creation on pipeline success

**Agent roles (`src/agent-roles/`):**
- `architect/CLAUDE.md` -- Plans implementation approach
- `coder/CLAUDE.md` -- Implements the feature
- `reviewer/CLAUDE.md` -- Code review (exit code 2 = request changes)
- `tester/CLAUDE.md` -- Runs tests to verify implementation

**Environment variables:**
- `PORT` -- HTTP port (default: 8080)
- `CONVEX_URL` -- Convex deployment URL
- `ECS_CLUSTER` -- ECS cluster name/ARN
- `ECS_TASK_DEFINITION` -- Task definition family/ARN
- `ECS_SUBNETS` -- Comma-separated subnet IDs
- `ECS_SECURITY_GROUP` -- Security group ID
- `GITHUB_TOKEN` -- For PR creation (optional)
- `POLL_INTERVAL_MS` -- Poll interval (default: 30000)

### Database (`packages/convex/`)

Convex real-time serverless database with 6 tables: `users`, `projects`, `features`, `agents`, `agent_runs`, `tickets`.

**Server functions:**
- `convex/projects.ts` -- Project CRUD + `listActiveProjects`
- `convex/features.ts` -- Feature status transitions, `getReadyFeatures` (dependency-aware)
- `convex/dependencies.ts` -- BFS cycle detection for feature dependencies
- `convex/agentRuns.ts` -- Agent execution record tracking
- `convex/tickets.ts` -- Linear ticket sync and lookup

**Test utilities:**
- `convex/lib/graph-utils.ts` -- Graph traversal helpers
- `convex/lib/feature-utils.ts` -- Feature logic helpers
- `convex/__tests__/` -- Unit tests (cycle detection, feature logic)

### Type Layer (`packages/db/`)

Drizzle ORM schemas that export TypeScript types (`Feature`, `Project`, `Agent`, `User`, `Ticket`, `AgentRun`) used across the monorepo. Not connected to a live database -- serves as the shared type system.

### Infrastructure (`infra/`)

AWS CDK stack creating: VPC (2 AZs), ECS Cluster, ALB, ECR repository, Orchestrator Fargate service, Agent task definition, IAM roles, Secrets Manager, CloudWatch log groups.

See `infra/lib/omakase-stack.ts` for the full resource definition.

## Key Patterns

### Agent Pipeline Flow

1. `FeatureWatcher` polls Convex for active projects and pending features
2. For each ready feature (dependencies met, within concurrency limits), launches an `AgentPipeline`
3. Pipeline runs 4 sequential ECS Fargate tasks: architect -> coder -> reviewer -> tester
4. If reviewer requests changes (exit code 2), coder re-runs once
5. On success: feature marked `passing` in Convex, PR created on GitHub
6. On failure: feature marked `failing` with error details

### Real-time Updates

The frontend subscribes to Convex queries via `convex-nextjs`. All data changes (feature status, agent runs, project updates) propagate instantly to connected clients.

### Authentication

Auth0 v4 SDK with `Auth0Client` singleton pattern. Middleware protects `(app)/` routes. Public routes under `(public)/` are open. RBAC roles (`admin`, `developer`, `viewer`) stored in Convex.

### Linear Integration

Bidirectional sync: Linear issues <-> Convex features. OAuth for connecting projects to Linear teams. Webhook receiver for real-time ticket updates. Status mapping between Linear states and feature statuses.

## Claude Code Integration

**Slash commands** (`.claude/commands/`):
- `/check-code` -- Run lint and type-check
- `/checkpoint` -- Create comprehensive checkpoint commit
- `/review-pr` -- Review pull requests
- `/create-spec` -- Interactive spec creation
- `/expand-project` -- Expand project with new features
- `/opsx:new` -- Start a new OpenSpec change
- `/opsx:ff` -- Fast-forward through artifact creation
- `/opsx:apply` -- Implement tasks from a change
- `/opsx:archive` -- Archive a completed change

**Custom agents** (`.claude/agents/`):
- `coder.md` -- Software architect agent for code implementation
- `code-review.md` -- Code review agent
- `deep-dive.md` -- Technical investigator for deep analysis

## Environment Variables

See `.env.example` for the full list. Key groups:
- **Auth0**: `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
- **Convex**: `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOY_KEY`
- **AWS**: `AWS_REGION`, `AWS_ACCOUNT_ID`, `ECS_CLUSTER_NAME`, `ECR_REPO_URI`
- **Linear**: `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`, `LINEAR_WEBHOOK_SECRET`
- **Claude**: `ANTHROPIC_API_KEY`
