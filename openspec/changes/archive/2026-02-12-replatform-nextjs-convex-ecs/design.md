## Context

Omakase is currently a local-first Python/FastAPI application with SQLite storage, a Vite-based React SPA, and Claude Agent SDK integration for autonomous coding. It runs on the developer's machine via CLI or a local web server.

The goal is to transform it into a cloud-native, multi-tenant platform where teams of autonomous AI agents read Linear tickets, implement them, and report progress through a real-time dashboard. This requires replacing the entire runtime stack while preserving the core domain model (features, projects, agents, dependencies).

**Current stack**: Python 3.11, FastAPI, SQLite/SQLAlchemy, React 19/Vite 7, local Claude CLI
**Target stack**: TypeScript/Node.js, Convex, Drizzle ORM, Next.js 15, Auth0, AWS ECS Fargate, Linear API

## Goals / Non-Goals

**Goals:**
- Replace SQLite with Convex for real-time, multi-client data sync
- Move frontend to Next.js on Vercel with SSR and Auth0 authentication
- Run agent orchestration on ECS Fargate for scalable, persistent compute
- Integrate with Linear for ticket-driven autonomous development
- Support multiple specialized agents (architect, coder, reviewer, tester) working concurrently
- Maintain existing UX concepts (kanban board, dependency graph, agent mascots, celebrations)

**Non-Goals:**
- Supporting self-hosted/on-premise deployment (cloud-only for now)
- Backward compatibility with the Python CLI or local SQLite databases
- Supporting AI providers other than Claude (Vertex AI, Ollama, etc. deferred)
- Billing/payment integration (free tier only initially)
- Mobile-responsive UI (desktop-first)
- Migrating existing project data from SQLite to Convex (clean start)

## Decisions

### D1: Convex as primary database over PostgreSQL/PlanetScale

**Choice**: Convex
**Rationale**: Convex provides real-time subscriptions out of the box, eliminating the need for a separate WebSocket layer. The current system uses manual WebSocket broadcasting (`/ws/projects/{project_name}`); Convex replaces this with reactive queries that automatically push updates to all connected clients. Convex functions (queries, mutations, actions) also serve as the API layer, reducing backend surface area.
**Alternatives considered**:
- PostgreSQL + Supabase Realtime: More mature but requires managing real-time subscriptions separately
- PlanetScale: No built-in real-time; would still need WebSocket infrastructure

### D2: Drizzle ORM for schema management

**Choice**: Drizzle ORM alongside Convex
**Rationale**: Drizzle provides type-safe schema definitions and migration tooling in TypeScript. While Convex has its own schema system, Drizzle is used for any relational data patterns that benefit from traditional ORM capabilities (complex joins, reporting queries). Drizzle schemas serve as the canonical type definitions shared between backend and frontend.
**Alternatives considered**:
- Prisma: Heavier runtime, slower cold starts on serverless
- Convex-only schemas: Sufficient for most cases but lacks migration tooling for complex schema evolution

### D3: Next.js App Router on Vercel over standalone React SPA

**Choice**: Next.js 15 with App Router, deployed on Vercel
**Rationale**: Server components reduce client bundle size. Server actions provide type-safe API calls. Vercel deployment gives zero-config CI/CD, preview deployments, and edge functions. Auth0's Next.js SDK (`@auth0/nextjs-auth0`) integrates seamlessly with middleware for route protection.
**Alternatives considered**:
- Keep Vite SPA + deploy to S3/CloudFront: No SSR benefits, requires separate auth middleware
- Remix: Comparable features but smaller ecosystem and less Vercel integration

### D4: AWS ECS Fargate for agent execution

**Choice**: ECS Fargate (serverless containers)
**Rationale**: Agents are long-running processes (minutes to hours) that need persistent compute. Lambda's 15-minute timeout is insufficient. ECS Fargate provides containerized execution without managing EC2 instances. Each agent runs as a Fargate task with its own Claude Code session, isolated filesystem, and resource limits.
**Alternatives considered**:
- EC2 instances: Require capacity planning and instance management
- Lambda + Step Functions: Timeout limitations, complex state management
- Fly.io Machines: Good fit but adds another vendor; ECS keeps compute in AWS

### D5: Auth0 for authentication over Clerk/NextAuth

**Choice**: Auth0
**Rationale**: Auth0 provides enterprise-grade authentication with SSO, MFA, and role-based access control. The `@auth0/nextjs-auth0` SDK handles session management, token refresh, and middleware integration. Auth0's machine-to-machine tokens also secure ECS-to-Convex communication.
**Alternatives considered**:
- Clerk: Simpler but less enterprise features (no machine-to-machine tokens)
- NextAuth.js: More DIY, requires managing provider configs and session storage

### D6: Linear as the ticket system over GitHub Issues/Jira

**Choice**: Linear API + webhooks
**Rationale**: Linear has a modern GraphQL API, excellent webhook support, and is designed for engineering teams. The integration is bidirectional: tickets flow in as features, agent status updates flow back as comments and state changes. Linear's API is simpler and faster than Jira's REST API.
**Alternatives considered**:
- GitHub Issues: Limited workflow states, no native priority/estimation fields
- Jira: Complex API, heavy enterprise overhead

### D7: Agent architecture — specialized roles with orchestrator

**Choice**: Multi-agent system with role specialization
**Architecture**:
- **Orchestrator** (ECS service): Watches for new tickets, assigns work to agents, manages lifecycle
- **Architect agent**: Reads ticket requirements, creates implementation plan, identifies affected files
- **Coder agent**: Implements the plan, writes code, runs lint/type-check
- **Reviewer agent**: Reviews code changes, checks for quality/security issues
- **Tester agent**: Writes and runs tests, validates acceptance criteria

Each agent is a Fargate task running Claude Code with role-specific CLAUDE.md instructions and tool access.

**Rationale**: Mirrors human dev team workflows. Specialized prompts produce better results than a single generalist agent. The orchestrator pattern allows scaling each role independently.

## Risks / Trade-offs

- **[Convex vendor lock-in]** → Mitigation: Drizzle ORM abstracts schema definitions; core business logic in pure TypeScript functions can be ported. Convex's query/mutation pattern is similar to tRPC.
- **[ECS cold start latency]** → Mitigation: Keep a minimum task count of 1 for the orchestrator. Agent tasks are pre-warmed when tickets arrive. Use Fargate Spot for cost savings on non-urgent work.
- **[Agent coordination complexity]** → Mitigation: Start with sequential agent execution (architect → coder → reviewer → tester). Add parallelism only after the pipeline is stable.
- **[Linear API rate limits]** → Mitigation: Use webhooks for real-time events (avoid polling). Cache ticket data in Convex. Implement exponential backoff.
- **[Auth0 cost at scale]** → Mitigation: Auth0 free tier supports 25k MAUs. Evaluate Clerk or custom auth if costs become prohibitive.
- **[Convex function execution limits]** → Mitigation: Long-running agent operations use Convex actions (not queries/mutations) which support async workflows. Heavy compute stays on ECS.

## Migration Plan

### Phase 1: Foundation
1. Initialize Next.js project with TypeScript, Tailwind CSS v4, and Auth0
2. Set up Convex project with schema (features, projects, agents, tickets)
3. Create ECS infrastructure (Terraform/CDK): cluster, task definitions, ECR repos

### Phase 2: Core Platform
4. Implement Auth0 login/logout, middleware, and role-based access
5. Build Convex functions for feature CRUD, project management
6. Port dashboard UI from React SPA to Next.js (kanban, dependency graph, agent controls)

### Phase 3: Agent System
7. Build orchestrator service on ECS
8. Implement agent role definitions (CLAUDE.md per role)
9. Create agent lifecycle management (start, monitor, stop Fargate tasks)

### Phase 4: Linear Integration
10. OAuth app setup, webhook receiver
11. Ticket → feature sync pipeline
12. Agent status → Linear comment/state updates

### Rollback Strategy
- Each phase is independently deployable
- Convex supports schema rollbacks via `npx convex deploy --preview`
- ECS task definitions are versioned; rollback via previous revision
- Vercel deployments are immutable; rollback to previous deployment

## Open Questions

1. **Convex vs. Convex + PostgreSQL**: Should we use Convex exclusively, or add PostgreSQL (via Neon/Supabase) for complex analytical queries and reporting?
2. **Agent compute isolation**: Should each agent get its own Fargate task, or can multiple agents share a task with process-level isolation?
3. **Git workflow**: How should agents commit code? Shared repo with branches per ticket, or fork-based workflow?
4. **Cost model**: What's the expected ECS Fargate cost per agent-hour? Need to benchmark before setting concurrency limits.
5. **Monorepo structure**: Should the new codebase be a monorepo (Next.js + Convex + ECS services) or separate repos?
