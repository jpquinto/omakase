## Context

AutoForge currently uses Convex as its primary data store across 6 tables (users, projects, features, agents, agent_runs, tickets). The orchestrator backend uses `ConvexHttpClient` for queries/mutations, while the frontend has a `ConvexProvider` wired up but currently uses mock data. The existing CDK stack in `infra/` already provisions VPC, ECS, ALB, ECR, IAM, and Secrets Manager. Convex is the only non-AWS dependency in the data path.

The frontend is not yet actively consuming Convex real-time queries (components use mock data), which makes this an ideal time to migrate before real-time subscriptions are deeply embedded.

## Goals / Non-Goals

**Goals:**
- Replace all Convex data storage with DynamoDB tables provisioned via CDK
- Create a `packages/dynamodb/` package with typed data access functions mirroring current Convex server functions
- Update the orchestrator to use DynamoDB SDK instead of ConvexHttpClient
- Update the frontend to fetch data via Elysia API endpoints (REST) instead of Convex queries
- Remove the `packages/convex/` package and all Convex dependencies
- Maintain all existing data access patterns: CRUD, dependency-aware feature claiming, cycle detection

**Non-Goals:**
- Real-time push (WebSocket/SSE) for dashboard -- polling is acceptable for now; real-time can be added later via DynamoDB Streams + API Gateway WebSocket
- Data migration from existing Convex instance (fresh start is fine since the platform is pre-production)
- Changes to the Auth0 authentication flow
- Changes to the Linear integration webhook logic (only the data layer it writes to)
- Changes to ECS agent pipeline logic (only the Convex calls it makes)

## Decisions

### 1. DynamoDB single-table vs multi-table: **Multi-table**

Use one DynamoDB table per entity (6 tables) rather than single-table design.

**Rationale:** The access patterns are straightforward (lookup by ID, query by project, filter by status). Single-table design adds complexity in key design and GSI management that isn't justified here. Multi-table is easier to reason about, maps directly to the existing schema, and each table can have its own capacity settings.

**Alternative considered:** Single-table with PK/SK overloading. Rejected because the 6 entities have distinct access patterns and don't benefit from item collection co-location.

### 2. Primary keys: **ULID-based partition keys**

Use ULIDs (Universally Unique Lexicographically Sortable Identifiers) as partition keys instead of UUIDs.

**Rationale:** ULIDs are sortable by creation time, K-Sortable, and URL-safe. This eliminates the need for a separate `createdAt` sort key for chronological ordering. The `ulid` package is tiny and has no dependencies.

**Alternative considered:** UUIDs (random, no ordering) and auto-increment (not native to DynamoDB). ULIDs give us both uniqueness and time-ordering.

### 3. Data access layer: **New `packages/dynamodb/` package**

Create a shared package exporting typed functions (e.g., `createProject()`, `listFeatures()`, `claimFeature()`) using `@aws-sdk/lib-dynamodb` DocumentClient.

**Rationale:** Centralizes all DynamoDB access in one place, consumed by both the orchestrator and Elysia API routes. Mirrors the role `packages/convex/` played. TypeScript types from `packages/db/` are reused.

**Alternative considered:** Inline SDK calls in each consumer. Rejected for duplication and lack of type safety.

### 4. Frontend data fetching: **Elysia REST API + polling**

Add REST endpoints to the orchestrator's Elysia server for all data the frontend needs. The frontend fetches via `fetch()` or a thin React Query / SWR wrapper with polling for near-real-time updates.

**Rationale:** The frontend currently uses mock data, not live Convex subscriptions. Switching to REST + polling is the simplest path. Real-time push can be layered on later via WebSocket or SSE without changing the data layer. The orchestrator already runs Elysia and has the DynamoDB client.

**Alternative considered:** API Gateway + Lambda. Rejected because the orchestrator already exists as a long-running Elysia service, adding endpoints there avoids new infrastructure.

### 5. Feature claiming: **DynamoDB conditional writes**

Use `UpdateCommand` with `ConditionExpression` to atomically claim features, preventing double-assignment.

**Rationale:** DynamoDB conditional writes provide the same atomicity guarantees as Convex mutations for the `claimFeature` use case. The condition checks `status = "pending" AND attribute_not_exists(assignedAgentId)`.

### 6. Dependency cycle detection: **Application-level BFS (unchanged)**

Keep the existing BFS cycle detection logic from `packages/convex/convex/lib/graph-utils.ts` in the new `packages/dynamodb/` package.

**Rationale:** Cycle detection requires graph traversal that can't be expressed as a DynamoDB operation. The existing pure function works on in-memory data and can be reused directly.

### 7. GSI strategy

| Table | GSI | PK | SK | Purpose |
|-------|-----|----|----|---------|
| users | by_auth0Id | auth0Id | - | Auth0 login lookup |
| users | by_email | email | - | Email lookup |
| projects | by_status | status | createdAt | List active projects |
| features | by_project | projectId | createdAt | List features for project |
| features | by_project_status | projectId | status | Query features by status |
| features | by_linearIssueId | linearIssueId | - | Linear sync lookup |
| agents | by_project | projectId | createdAt | List agents for project |
| agents | by_project_status | projectId | status | Query agents by status |
| agent_runs | by_project | projectId | startedAt | List runs for project |
| agent_runs | by_feature | featureId | startedAt | List runs for feature |
| agent_runs | by_agent | agentId | startedAt | List runs for agent |
| tickets | by_project | projectId | syncedAt | List tickets for project |
| tickets | by_linearIssueId | linearIssueId | - | Linear sync lookup |

### 8. Packages/DB role: **Keep as type-only layer**

`packages/db/` continues to export TypeScript types (`Feature`, `Project`, etc.) but drops Drizzle ORM dependency. Types are defined as plain TypeScript interfaces/types since there is no SQL database.

**Rationale:** The types are consumed across the monorepo for type safety. Drizzle was only needed for PostgreSQL migration generation, which is no longer relevant.

## Risks / Trade-offs

**[No built-in real-time]** DynamoDB doesn't have Convex-style reactive queries. → **Mitigation:** Frontend uses polling (5-10s interval). Acceptable for current stage. DynamoDB Streams + WebSocket can be added as a future enhancement.

**[Eventual consistency]** DynamoDB reads are eventually consistent by default. → **Mitigation:** Use `ConsistentRead: true` for `claimFeature` and other operations requiring strong consistency. Accept eventual consistency for dashboard reads.

**[Cold start on GSI]** New GSIs may take time to backfill on large tables. → **Mitigation:** Tables start empty (pre-production), no backfill needed.

**[IAM permissions]** Orchestrator and agent task roles need DynamoDB access. → **Mitigation:** Add DynamoDB read/write policies scoped to `autoforge-*` table ARNs in CDK stack.

**[Cost]** DynamoDB on-demand pricing is pay-per-request. → **Mitigation:** On-demand mode is ideal for the current low/variable traffic. Can switch to provisioned capacity later if needed.

## Migration Plan

1. Add DynamoDB tables to CDK stack and deploy
2. Create `packages/dynamodb/` with client and data access functions
3. Update `packages/db/` types (drop Drizzle, keep TypeScript types)
4. Add REST endpoints to orchestrator Elysia server
5. Update orchestrator to use DynamoDB instead of Convex
6. Update frontend to use REST API instead of Convex
7. Remove `packages/convex/` and Convex dependencies
8. Update CI/CD to remove Convex deploy step

No rollback is needed since this is a pre-production migration with no live data.

## Open Questions

- **Polling interval**: What polling interval is acceptable for the dashboard? 5s, 10s, or 30s? (Recommend 5s for active views, 30s for background)
- **DynamoDB capacity mode**: On-demand vs provisioned? (Recommend on-demand for now)
