# Tech Stack Overview

## Runtime: Bun

Bun is the JavaScript/TypeScript runtime used everywhere. It replaces Node.js entirely for development and production.

- `.bun-version` at monorepo root pins `1.2.0`
- All `package.json` scripts use `bun` (no `node`, `npx`, or `tsx`)
- Docker containers use `oven/bun:1` base image
- CI uses `oven/setup-bun@v2`
- Bun runs TypeScript natively -- no transpilation step, no `tsx` dependency

**Deployed:** Bun is the runtime in every deployed environment (Vercel, ECS containers).

---

## Monorepo Structure

```
/
├── apps/
│   ├── web/              # Next.js frontend
│   └── orchestrator/     # Elysia backend
├── packages/
│   ├── convex/           # Convex schema + functions
│   ├── db/               # Drizzle ORM schemas + types
│   └── shared/           # Shared utilities + types
└── infra/                # AWS CDK infrastructure
```

Managed via Bun workspaces (`"workspaces": ["apps/*", "packages/*"]` in root `package.json`).

---

## Frontend: Next.js 15 + React 19

**Location:** `apps/web/`

Server-rendered React app using the App Router.

**Key tech:**

- **Next.js 15** with App Router (route groups: `(public)/` for landing, `(app)/` for authenticated pages)
- **React 19** with server components
- **Tailwind CSS v4** with neobrutalism design system
- **Convex React client** for real-time data subscriptions (projects, features, agents update live)
- **Auth0 v4 SDK** (`@auth0/nextjs-auth0`) -- `Auth0Client` singleton pattern with middleware-first auth
- **dagre** for dependency graph layout
- **sonner** for toast notifications
- **Playwright** for E2E testing

**Pages:**

- `/` -- Public landing page
- `/projects` -- Project list (authenticated)
- `/projects/[id]` -- Dashboard with kanban, dependency graph, agent mission control, log viewer

**Deployed to: Vercel**

- `vercel.json` configures `bun install` and `bun run build`
- Git push to `main` triggers deploy via `deploy-web.yml` workflow using `amondnet/vercel-action@v25`
- Vercel handles CDN, edge functions, and serverless rendering

---

## Authentication: Auth0

Auth0 handles all user authentication.

- `apps/web/src/lib/auth0.ts` -- Singleton `Auth0Client` instance
- `apps/web/src/middleware.ts` -- Protects `(app)/` routes, redirects unauthenticated users to `/auth/login`
- Routes under `(public)/` are open; routes under `(app)/` require a session
- RBAC roles: `admin`, `developer`, `viewer` (stored in Convex `users` table)
- M2M tokens for orchestrator-to-Convex communication

**Deployed:** Auth0 is a managed SaaS -- configured via environment variables (`AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`).

---

## Database: Convex

**Location:** `packages/convex/`

Real-time serverless database with reactive queries.

### Schema (6 tables)

| Table | Purpose |
|---|---|
| `users` | Auth0 users with roles (indexed by `auth0Id`, `email`) |
| `projects` | Repos with Linear integration, concurrency limits |
| `features` | Work items with status, priority, dependencies, Linear issue links |
| `agents` | Agent instances per project (architect/coder/reviewer/tester) with ECS task ARN |
| `agent_runs` | Execution log for each pipeline step with status, output, duration |
| `tickets` | Synced Linear tickets with labels and priority |

### Key Convex functions

- `projects.ts` -- CRUD + `listActiveProjects` query
- `features.ts` -- Status transitions, ready-feature query (checks dependency resolution)
- `dependencies.ts` -- BFS cycle detection for feature dependencies
- `agentRuns.ts` -- Create/complete/query agent execution records
- `tickets.ts` -- Linear ticket sync and lookup

**Deployed:** Convex is a managed service (convex.dev). `bun convex deploy` pushes schema + functions. No infrastructure to manage.

---

## Type Layer: Drizzle ORM

**Location:** `packages/db/`

TypeScript type definitions using Drizzle ORM's `pgTable` builder.

This isn't connected to an actual PostgreSQL database right now. It serves as the **shared type system** -- Drizzle schema definitions export TypeScript types (`Feature`, `Project`, `Agent`, `User`, `Ticket`, `AgentRun`) that other packages can import for type safety.

**Deployed:** Not deployed independently. It's a build-time package consumed by other workspace packages.

---

## Backend: Elysia (Bun-native)

**Location:** `apps/orchestrator/`

The brain of the system. An HTTP server + background polling loop.

**Framework:** Elysia -- Bun-native web framework with typed routes and lifecycle hooks.

### Components

| File | Purpose |
|---|---|
| `index.ts` | Elysia server with `/health` endpoint, request logging, graceful shutdown |
| `feature-watcher.ts` | Polls Convex every 30s for pending features across all projects |
| `pipeline.ts` | 4-step agent pipeline: architect -> coder -> reviewer -> tester |
| `ecs-agent.ts` | Launches/stops ECS Fargate tasks with environment variables |
| `agent-monitor.ts` | Watches an ECS task until completion, reports exit codes |
| `concurrency.ts` | Per-project concurrency limits (prevents overloading) |
| `pr-creator.ts` | Creates GitHub PRs when a pipeline succeeds |

### How it works

1. `FeatureWatcher` polls Convex for active projects and pending features
2. For each ready feature (dependencies met, within concurrency limit), launches an `AgentPipeline`
3. Pipeline runs 4 sequential ECS Fargate tasks (architect -> coder -> reviewer -> tester)
4. Each agent is a Docker container running Claude Code with a role-specific `CLAUDE.md`
5. If reviewer requests changes (exit code 2), coder re-runs once
6. On success: feature marked `passing` in Convex, PR created on GitHub
7. On failure: feature marked `failing` with error details

**Deployed to: AWS ECS Fargate** (see Infrastructure below)

---

## Agent Containers

Each agent (architect, coder, reviewer, tester) runs as a short-lived ECS Fargate task.

The Dockerfile (`apps/orchestrator/Dockerfile`) builds a single image used by both the orchestrator and agents:

- Base: `oven/bun:1`
- Installs: `git`, `curl`, `@anthropic-ai/claude-code`
- Runs: `bun src/index.ts` (orchestrator) or Claude Code with a role-specific CLAUDE.md (agents)

### Environment variables passed to each agent

- `REPO_URL` -- Git repo to clone
- `FEATURE_ID` -- Feature to implement
- `AGENT_ROLE` -- architect/coder/reviewer/tester
- `PROJECT_ID` -- Convex project reference
- `CONVEX_URL` -- For reporting status back
- `ANTHROPIC_API_KEY` -- From AWS Secrets Manager

**Deployed to:** Launched on-demand by the orchestrator via `ecs:RunTask`. Not a persistent service -- spins up, does work, exits.

---

## Infrastructure: AWS CDK

**Location:** `infra/lib/omakase-stack.ts`

Infrastructure-as-code using AWS CDK (TypeScript).

### Resources created

| Resource | Purpose |
|---|---|
| **VPC** | 2 AZs, public subnets (ALB), private subnets (ECS tasks), 1 NAT gateway |
| **ECS Cluster** | `omakase` cluster with Container Insights |
| **ALB** | Public Application Load Balancer, HTTP on port 80 -> orchestrator port 8080 |
| **ECR Repository** | `omakase-agent` -- stores Docker images, keeps last 10, scan on push |
| **Orchestrator Service** | Fargate service (1 replica, 2GB RAM, 1 vCPU) behind ALB in private subnets |
| **Agent Task Definition** | Fargate task def (2GB RAM, 1 vCPU) launched on-demand |
| **Secrets Manager** | `omakase/api-keys` -- stores `ANTHROPIC_API_KEY`, injected into containers |
| **IAM Roles** | 3 roles: task execution (ECR pull + logs), orchestrator (RunTask + PassRole), agent (logs + secrets read) |
| **CloudWatch Logs** | `/omakase/orchestrator` and `/omakase/agents` with 30-day retention |

### Security

- ECS tasks in private subnets, only reachable from ALB
- ALB security group allows HTTP/HTTPS from anywhere
- ECS security group allows traffic only from ALB on port 8080
- Orchestrator can launch/stop/describe agent tasks (scoped to its cluster)
- Agents can only read secrets and write logs

**Deployed via:** `deploy-infra.yml` workflow -- on push to `main` when `infra/**` changes. Uses `actions/setup-node@v4` (CDK itself runs on Node), `aws-actions/configure-aws-credentials@v4`, then `cdk diff` + `cdk deploy`.

---

## CI/CD: GitHub Actions

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Push/PR to `main` | Typecheck all packages, lint web app, run Convex tests, run Playwright E2E |
| `deploy-web.yml` | Push to `main` (`apps/web/**`) | `bun install` -> Vercel deploy |
| `deploy-agent-image.yml` | Push to `main` (`apps/orchestrator/**`) | Docker build -> push to ECR (SHA + `latest` tags) |
| `deploy-infra.yml` | Push to `main` (`infra/**`) | CDK diff -> CDK deploy |

---

## External Integrations

### Linear -- Ticket management

- OAuth flow for connecting projects to Linear teams
- Webhook receiver for real-time ticket updates
- Bidirectional sync: Linear issues <-> Convex features
- Status mapping: Linear states map to feature statuses

### GitHub -- Code management

- Agents clone repos, create branches, commit code
- Orchestrator creates PRs via GitHub API on pipeline success
- Branch naming: `agent/{featureId}`

---

## Data Flow Summary

```
Linear ticket created
  -> Webhook syncs to Convex "tickets" table
    -> Feature created in Convex "features" table
      -> FeatureWatcher picks up ready feature
        -> AgentPipeline launches on ECS Fargate:
          1. Architect (plans)
          2. Coder (implements)
          3. Reviewer (reviews, may send back to coder)
          4. Tester (verifies)
        -> Feature marked "passing" in Convex
        -> PR created on GitHub
          -> Dashboard updates in real-time via Convex subscriptions
```
