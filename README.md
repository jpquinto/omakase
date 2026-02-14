# Omakase

An autonomous development platform powered by Claude Code. Omakase uses a team of specialized AI agents -- architect, coder, reviewer, and tester -- to implement features from Linear tickets, running on AWS ECS Fargate with a real-time Next.js dashboard.

## How It Works

1. Connect a project to Linear and configure a GitHub repo
2. Create or sync tickets as features in the dashboard
3. The orchestrator picks up ready features (dependencies met, within concurrency limits)
4. A 4-step agent pipeline runs on ECS Fargate:
   - **Architect** -- designs the implementation plan
   - **Coder** -- implements the feature
   - **Reviewer** -- reviews the code (may request changes)
   - **Tester** -- runs tests to verify
5. On success, a pull request is created on GitHub
6. The dashboard updates in real-time via Convex subscriptions

## Tech Stack

| Layer | Technology | Deployed To |
|---|---|---|
| Runtime | Bun 1.2+ | Everywhere |
| Frontend | Next.js 15, React 19, Tailwind CSS v4 | Vercel |
| Auth | Auth0 v4 SDK | Managed SaaS |
| Database | Convex (real-time serverless) | Convex Cloud |
| Backend | Elysia (Bun-native) | AWS ECS Fargate |
| Agents | Claude Code in Docker containers | AWS ECS Fargate (on-demand) |
| Infrastructure | AWS CDK (VPC, ECS, ALB, ECR, IAM) | AWS |
| Ticket Management | Linear (bidirectional sync) | Managed SaaS |
| Types | Drizzle ORM schemas | Build-time only |

For detailed architecture, see [TECH_STACK.md](TECH_STACK.md).

## Prerequisites

- **Bun 1.2+** -- [Install Bun](https://bun.sh)
- **Node.js 20+** -- Required for AWS CDK only
- **Claude Code CLI** -- For running agents

### Claude Code CLI

**macOS / Linux:**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://claude.ai/install.ps1 | iex
```

## Quick Start

```bash
# Clone the repo
git clone https://github.com/your-org/omakase.git
cd omakase

# Install dependencies
bun install

# Copy environment config
cp .env.example .env
# Fill in Auth0, Convex, AWS, Linear, and Claude credentials

# Start the frontend
bun --filter @omakase/web run dev

# Start the orchestrator (in another terminal)
bun --filter @omakase/orchestrator run dev

# Start Convex dev server (in another terminal)
bun --filter @omakase/convex run dev
```

## Project Structure

```
omakase/
├── apps/
│   ├── web/                    # Next.js 15 frontend
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   │   ├── (public)/   # Landing page (unauthenticated)
│   │   │   │   ├── (app)/      # Dashboard (authenticated)
│   │   │   │   └── api/        # Auth0, Linear webhooks
│   │   │   ├── components/     # Kanban, dependency graph, agent dashboard
│   │   │   ├── lib/            # Auth0, Linear client, utilities
│   │   │   ├── providers/      # Auth0 + Convex React providers
│   │   │   └── hooks/          # Keyboard shortcuts
│   │   └── vercel.json         # Vercel deployment config
│   └── orchestrator/           # Elysia backend
│       ├── src/
│       │   ├── index.ts        # Elysia server entry point
│       │   ├── feature-watcher.ts  # Polls Convex for ready features
│       │   ├── pipeline.ts     # 4-step agent pipeline
│       │   ├── ecs-agent.ts    # ECS Fargate task management
│       │   ├── agent-monitor.ts    # Task completion monitoring
│       │   ├── concurrency.ts  # Per-project concurrency limits
│       │   ├── pr-creator.ts   # GitHub PR creation
│       │   └── agent-roles/    # CLAUDE.md files per agent role
│       └── Dockerfile          # oven/bun:1 based image
├── packages/
│   ├── convex/                 # Convex database
│   │   └── convex/
│   │       ├── schema.ts       # 6-table schema definition
│   │       ├── projects.ts     # Project CRUD
│   │       ├── features.ts     # Feature management + dependency checks
│   │       ├── dependencies.ts # BFS cycle detection
│   │       ├── agentRuns.ts    # Agent execution records
│   │       ├── tickets.ts      # Linear ticket sync
│   │       └── __tests__/      # Unit tests
│   ├── db/                     # Drizzle ORM type schemas
│   │   └── src/schema/         # TypeScript type exports
│   └── shared/                 # Shared utilities
├── infra/                      # AWS CDK
│   └── lib/
│       └── omakase-stack.ts  # VPC, ECS, ALB, ECR, IAM, Secrets Manager
├── .github/workflows/          # CI/CD pipelines
│   ├── ci.yml                  # Typecheck, lint, test
│   ├── deploy-web.yml          # Vercel deployment
│   ├── deploy-agent-image.yml  # ECR Docker push
│   └── deploy-infra.yml        # CDK deploy
├── .claude/                    # Claude Code customization
│   ├── commands/               # Slash commands
│   ├── agents/                 # Custom agent definitions
│   └── skills/                 # Specialized skills
├── openspec/                   # Change management specs
├── CLAUDE.md                   # Claude Code project guidance
├── TECH_STACK.md               # Detailed tech stack documentation
└── package.json                # Bun workspace root
```

## Development

### Frontend

```bash
bun --filter @omakase/web run dev        # localhost:3000
bun --filter @omakase/web run build      # Production build
bun --filter @omakase/web run lint       # ESLint
bun --filter @omakase/web run test:e2e   # Playwright E2E tests
```

### Backend

```bash
bun --filter @omakase/orchestrator run dev    # Watch mode, localhost:8080
bun --filter @omakase/orchestrator run start  # Production
```

### Database

```bash
bun --filter @omakase/convex run dev      # Local dev server
bun --filter @omakase/convex run deploy   # Deploy to Convex cloud
bun --filter @omakase/convex run test     # Unit tests
```

### Infrastructure

```bash
cd infra
npm ci
npx cdk diff       # Preview changes
npx cdk deploy     # Deploy to AWS
```

### Type Checking

```bash
bun --filter '*' run typecheck    # All packages
```

## Configuration

Copy `.env.example` to `.env` and configure:

| Group | Variables | Purpose |
|---|---|---|
| Auth0 | `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` | User authentication |
| Convex | `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOY_KEY` | Database connection |
| AWS | `AWS_REGION`, `AWS_ACCOUNT_ID`, `ECS_CLUSTER_NAME`, `ECR_REPO_URI` | Infrastructure |
| Linear | `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`, `LINEAR_WEBHOOK_SECRET` | Ticket management |
| Claude | `ANTHROPIC_API_KEY` | AI agent API access |

## CI/CD

| Workflow | Trigger | Action |
|---|---|---|
| `ci.yml` | Push/PR to main | Typecheck, lint, Convex tests, Playwright E2E |
| `deploy-web.yml` | Push to main (`apps/web/**`) | Deploy to Vercel |
| `deploy-agent-image.yml` | Push to main (`apps/orchestrator/**`) | Build + push Docker image to ECR |
| `deploy-infra.yml` | Push to main (`infra/**`) | CDK diff + deploy |

## License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE.md](LICENSE.md) file for details.
