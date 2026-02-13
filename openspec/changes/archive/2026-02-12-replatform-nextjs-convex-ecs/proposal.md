## Why

AutoForge currently runs as a local Python/FastAPI application with SQLite storage, a React SPA frontend, and the Claude Agent SDK for autonomous coding. This architecture limits it to single-developer, local-only usage and cannot scale to team-based autonomous development. Replatforming to a cloud-native stack (Convex, Next.js/Vercel, ECS, Auth0) enables multi-tenant team access, real-time collaboration, and lays the foundation for an autonomous dev team that reads Linear tickets and implements them independently.

## What Changes

- **BREAKING** Replace SQLite database (features.db, registry.db) with Convex as the primary database, using Drizzle ORM for TypeScript-based schema management and queries
- **BREAKING** Replace FastAPI Python backend with a Node.js/TypeScript backend deployed on AWS ECS (containerized)
- **BREAKING** Replace React SPA (Vite) frontend with Next.js App Router, deployed on Vercel
- **BREAKING** Add Auth0 authentication — all routes and API endpoints require authenticated sessions
- Add Linear integration for ticket ingestion — agents read assigned tickets and report status back
- Add autonomous agent team system — multiple specialized Claude Code agents (architect, coder, reviewer, tester) coordinated by an orchestrator
- **BREAKING** Remove Python-based agent orchestration (`autonomous_agent_demo.py`, `parallel_orchestrator.py`, `agent.py`, `client.py`) — replaced by TypeScript-based ECS agent management
- **BREAKING** Remove local CLI launcher (`start.py`, `start.bat`, `start.sh`) — replaced by web-based access
- Remove MCP feature server (`mcp_server/feature_mcp.py`) — replaced by Convex functions accessed directly
- Retain core concepts: feature-based progress tracking, dependency graphs, real-time UI updates, agent mascots

## Capabilities

### New Capabilities

- `convex-database`: Convex backend with reactive queries, real-time subscriptions, schema for features/projects/agents/tickets. Replaces SQLite + SQLAlchemy.
- `drizzle-orm`: Drizzle ORM integration for type-safe TypeScript schema definitions and migrations used alongside Convex
- `nextjs-frontend`: Next.js App Router frontend with server components, API routes, and Vercel deployment. Replaces Vite React SPA.
- `auth0-authentication`: Auth0-based authentication with login/logout, session management, role-based access (admin, developer, viewer), and protected routes/API endpoints
- `ecs-backend`: AWS ECS Fargate service for running the backend API and agent orchestration. Docker containerized Node.js/TypeScript runtime.
- `linear-integration`: Two-way Linear sync — ingest tickets as features, update ticket status as agents work, comment with implementation details
- `autonomous-agent-team`: Multi-agent system with specialized roles (architect, coder, reviewer, tester), orchestrator for task assignment, Claude Code execution per agent, and real-time status reporting
- `realtime-dashboard`: Next.js dashboard consuming Convex reactive queries for live agent status, feature progress, ticket flow, and team activity

### Modified Capabilities

_(No existing specs to modify — this is the first OpenSpec setup for this project)_

## Impact

- **Codebase**: Near-complete rewrite. Python backend (`server/`, `api/`, `mcp_server/`, core modules) replaced by TypeScript. React UI (`ui/`) migrated to Next.js. npm CLI wrapper (`bin/`, `lib/`) deprecated in favor of Vercel-hosted web app.
- **APIs**: REST + WebSocket endpoints replaced by Convex functions (queries, mutations, actions) + Next.js API routes for external integrations (Linear webhooks, Auth0 callbacks)
- **Dependencies**: Python dependencies (`requirements.txt`) removed. New: `convex`, `drizzle-orm`, `next`, `@auth0/nextjs-auth0`, `@aws-sdk/*`, `@linear/sdk`
- **Infrastructure**: New AWS resources (ECS cluster, ECR, VPC, ALB). Vercel project. Convex project. Auth0 tenant. Linear OAuth app.
- **Data migration**: Feature data from SQLite → Convex. Project registry from SQLite → Convex. No user data migration needed (new auth system).
- **Developer workflow**: Local development via `next dev` + Convex dev server. No more `start.bat` / Python venv management.
