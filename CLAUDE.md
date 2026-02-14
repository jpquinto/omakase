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
│   ├── dynamodb/          # DynamoDB data access layer
│   ├── db/               # TypeScript type definitions
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

# Type checking (all packages)
bun --filter '*' run typecheck
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
# Frontend E2E tests
bun --filter @omakase/web run test:e2e
bun --filter @omakase/web run test:e2e:ui    # With Playwright UI
```

### CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to main:
- Typecheck all packages
- Lint web app
- Run Playwright E2E tests

## Architecture

### Frontend (`apps/web/`)

Next.js 15 App Router with React 19, Tailwind CSS v4 (Liquid Glass design system), and Auth0 v4 authentication. For full design system details, see [STYLE_GUIDE.md](STYLE_GUIDE.md).

**Route groups:**
- `(public)/` -- Landing page, unauthenticated routes
- `(app)/` -- Protected dashboard routes (requires Auth0 session)

**Key files:**
- `src/middleware.ts` -- Auth0 middleware, protects `(app)/` routes
- `src/lib/auth0.ts` -- Auth0Client singleton
- `src/providers/auth-provider.tsx` -- Auth0 React context
- `src/providers/query-provider.tsx` -- TanStack Query provider for data fetching
- `src/hooks/use-keyboard-shortcuts.ts` -- Global keyboard shortcuts
- `src/components/kanban-board.tsx` -- Feature kanban with status columns
- `src/components/dependency-graph.tsx` -- dagre-based dependency visualization
- `src/components/agent-mission-control.tsx` -- Live agent status dashboard
- `src/components/log-viewer.tsx` -- Agent output log viewer
- `src/components/celebration-overlay.tsx` -- Completion animations
- `src/components/linear-ticket-badge.tsx` -- Linear issue link badges

**API routes:**
- `api/auth/[auth0]/route.ts` -- Auth0 SDK handler
- `api/auth/sync/route.ts` -- User sync to DynamoDB
- `api/auth/linear/route.ts` -- Linear OAuth initiation
- `api/auth/linear/callback/route.ts` -- Linear OAuth callback
- `api/webhooks/linear/route.ts` -- Linear webhook receiver

**Linear integration (`src/lib/linear/`):**
- `client.ts` -- Linear GraphQL client
- `ticket-sync.ts` -- Bidirectional Linear issue <-> DynamoDB feature sync
- `status-sync.ts` -- Status mapping between Linear and Omakase
- `comments.ts` -- Linear comment sync
- `dependency-sync.ts` -- Dependency mapping

### Backend (`apps/orchestrator/`)

Bun + Elysia server that polls DynamoDB for ready features and orchestrates agent pipelines on ECS Fargate.

**Key files:**
- `src/index.ts` -- Elysia server entry point with `/health` endpoint and request logging
- `src/feature-watcher.ts` -- Polls DynamoDB every 30s for pending features across all projects
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
- `DYNAMODB_TABLE_PREFIX` -- DynamoDB table name prefix
- `ECS_CLUSTER` -- ECS cluster name/ARN
- `ECS_TASK_DEFINITION` -- Task definition family/ARN
- `ECS_SUBNETS` -- Comma-separated subnet IDs
- `ECS_SECURITY_GROUP` -- Security group ID
- `GITHUB_TOKEN` -- For PR creation (optional)
- `POLL_INTERVAL_MS` -- Poll interval (default: 30000)

### Database (`packages/dynamodb/`)

DynamoDB data access layer with 6 tables: `users`, `projects`, `features`, `agents`, `agent_runs`, `tickets`.

**Key modules:**
- `src/repositories/projects.ts` -- Project CRUD + `listActiveProjects`
- `src/repositories/features.ts` -- Feature status transitions, `getReadyFeatures` (dependency-aware)
- `src/repositories/agent-runs.ts` -- Agent execution record tracking
- `src/repositories/tickets.ts` -- Linear ticket sync and lookup
- `src/lib/graph-utils.ts` -- BFS cycle detection for feature dependencies

### Type Layer (`packages/db/`)

TypeScript type definitions (`Feature`, `Project`, `Agent`, `User`, `Ticket`, `AgentRun`) used across the monorepo. Serves as the shared type system.

### Infrastructure (`infra/`)

AWS CDK stack creating: VPC (2 AZs), ECS Cluster, ALB, ECR repository, Orchestrator Fargate service, Agent task definition, IAM roles, Secrets Manager, CloudWatch log groups.

See `infra/lib/omakase-stack.ts` for the full resource definition.

## Design System (Liquid Glass)

For the complete style reference, see [STYLE_GUIDE.md](STYLE_GUIDE.md). Interactive showcase at `/style-system`.

**When writing frontend code, follow these rules:**

- **Fonts:** Instrument Serif (`font-serif`) for headings, Outfit (`font-sans`) for body, JetBrains Mono (`font-mono`) for code, Noto Serif JP (`font-jp`) for Japanese text
- **Colors:** Use `oma-*` tokens — primary: Sakura `#f472b6`, secondary: Beni `#f87171`, accents: Gold `#fbbf24`, Jade `#6ee7b7`, Indigo `#818cf8`
- **Backgrounds:** `bg-oma-bg` (main), `bg-oma-bg-elevated` (cards), `bg-oma-bg-surface` (interactive)
- **Text:** `text-oma-text` (primary), `text-oma-text-muted` (secondary), `text-oma-text-subtle` (tertiary)
- **Glass surfaces:** Use `.glass`, `.glass-sm`, `.glass-lg` utility classes — never set `backdrop-filter` manually
- **Tinted glass:** `.glass-primary` (pink), `.glass-secondary` (red), `.glass-gold`
- **Borders:** `border-oma-glass-border` (subtle), `border-oma-glass-border-bright` (prominent)
- **Radii:** `rounded-oma` (12px default), `rounded-oma-lg` (16px cards), `rounded-oma-full` (pills)
- **Shadows:** `shadow-oma-sm`, `shadow-oma`, `shadow-oma-lg`; glows: `glow-primary`, `glow-gold`
- **Animations:** `animate-oma-fade-up` for reveals, `animate-oma-scale-in` for pop-ins, `animate-oma-blur-in` for soft entrances
- **Semantic colors:** `oma-success` (green), `oma-warning` (gold), `oma-error` (red), `oma-info` (blue)
- **Status colors:** `oma-pending`, `oma-progress`, `oma-done`, `oma-fail`
- **Icons:** Lucide React exclusively (`lucide-react`)
- **Components:** shadcn/ui in `src/components/ui/`, use `cn()` from `src/lib/utils.ts` for class merging
- **Theme:** Dark mode default, light mode via `.light` class (next-themes)

## Key Patterns

### Agent Pipeline Flow

1. `FeatureWatcher` polls DynamoDB for active projects and pending features
2. For each ready feature (dependencies met, within concurrency limits), launches an `AgentPipeline`
3. Pipeline runs 4 sequential ECS Fargate tasks: architect -> coder -> reviewer -> tester
4. If reviewer requests changes (exit code 2), coder re-runs once
5. On success: feature marked `passing` in DynamoDB, PR created on GitHub
6. On failure: feature marked `failing` with error details

### Data Updates

The frontend fetches data from the orchestrator REST API via TanStack Query. Polling is used to keep the dashboard updated with current feature statuses, agent runs, and project state.

### Authentication

Auth0 v4 SDK with `Auth0Client` singleton pattern. Middleware protects `(app)/` routes. Public routes under `(public)/` are open. RBAC roles (`admin`, `developer`, `viewer`) stored in DynamoDB.

### Linear Integration

Bidirectional sync: Linear issues <-> DynamoDB features. OAuth for connecting projects to Linear teams. Webhook receiver for real-time ticket updates. Status mapping between Linear states and feature statuses.

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
- **DynamoDB**: `DYNAMODB_TABLE_PREFIX`
- **Orchestrator**: `NEXT_PUBLIC_ORCHESTRATOR_URL`
- **AWS**: `AWS_REGION`, `AWS_ACCOUNT_ID`, `ECS_CLUSTER_NAME`, `ECR_REPO_URI`
- **Linear**: `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`, `LINEAR_WEBHOOK_SECRET`
- **Claude**: `ANTHROPIC_API_KEY`
