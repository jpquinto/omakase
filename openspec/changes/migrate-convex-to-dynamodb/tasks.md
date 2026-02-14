## 1. CDK Infrastructure - DynamoDB Tables

- [x] 1.1 Add DynamoDB table constructs to `infra/lib/autoforge-stack.ts` for all 6 tables (autoforge-users, autoforge-projects, autoforge-features, autoforge-agents, autoforge-agent-runs, autoforge-tickets) with on-demand billing and ULID partition keys
- [x] 1.2 Add GSIs to each table as defined in the design (by_auth0Id, by_email, by_project, by_project_status, by_linearIssueId, by_status, by_feature, by_agent)
- [x] 1.3 Add DynamoDB read/write IAM policies to orchestrator task role, scoped to `autoforge-*` table ARNs (including GSI ARNs)
- [x] 1.4 Pass DynamoDB table name prefix and region as environment variables to the orchestrator container

## 2. Type Layer - Update packages/db

- [x] 2.1 Remove Drizzle ORM dependency from `packages/db/package.json` and `drizzle.config.ts`
- [x] 2.2 Convert Drizzle schema files in `packages/db/src/schema/` to plain TypeScript interfaces with ULID `id` fields replacing UUIDs, keeping all enum types (UserRole, FeatureStatus, AgentRole, etc.)
- [x] 2.3 Verify all type exports from `@autoforge/db` still compile and are correct

## 3. DynamoDB Data Access Layer - packages/dynamodb

- [x] 3.1 Create `packages/dynamodb/` package with `package.json` (name: `@autoforge/dynamodb`), `tsconfig.json`, and register it in root workspace
- [x] 3.2 Add `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` and `ulid` as dependencies
- [x] 3.3 Create `src/client.ts` with configured DynamoDBDocumentClient singleton and table name helpers using `DYNAMODB_TABLE_PREFIX` env var
- [x] 3.4 Create `src/users.ts` with `upsertUser`, `getUserByAuth0Id`, `getUserByEmail` functions
- [x] 3.5 Create `src/projects.ts` with `createProject`, `getProject`, `listProjects`, `listActiveProjects`, `updateProject`, `deleteProject` functions
- [x] 3.6 Create `src/features.ts` with `createFeaturesBulk`, `listFeatures`, `getReadyFeatures`, `claimFeature` (conditional write), `markFeaturePassing`, `markFeatureFailing`, `markFeatureInProgress` functions
- [x] 3.7 Create `src/dependencies.ts` with `addDependency` (BFS cycle detection), `removeDependency` functions - port graph-utils.ts logic
- [x] 3.8 Create `src/agent-runs.ts` with `createAgentRun`, `updateAgentStatus`, `completeAgentRun`, `listActiveAgents`, `getAgentLogs` functions
- [x] 3.9 Create `src/tickets.ts` with `syncTicket`, `updateTicketStatus` functions
- [x] 3.10 Create `src/index.ts` barrel export for all functions and the client

## 4. Orchestrator - Replace Convex with DynamoDB

- [x] 4.1 Add `@autoforge/dynamodb` as a dependency of `apps/orchestrator/`
- [x] 4.2 Remove `convex` dependency from `apps/orchestrator/package.json`
- [x] 4.3 Update `src/index.ts` to remove ConvexHttpClient initialization
- [x] 4.4 Update `src/feature-watcher.ts` to use `listActiveProjects()` and `getReadyFeatures()` from `@autoforge/dynamodb` instead of Convex queries
- [x] 4.5 Update `src/pipeline.ts` to use `markFeaturePassing`, `markFeatureFailing`, `createAgentRun`, `completeAgentRun` from `@autoforge/dynamodb`

## 5. Orchestrator - REST API Endpoints

- [x] 5.1 Add GET `/api/projects` endpoint (query by userId) returning project list
- [x] 5.2 Add GET `/api/projects/:projectId` endpoint returning single project
- [x] 5.3 Add GET `/api/projects/:projectId/features` endpoint returning feature list
- [x] 5.4 Add GET `/api/projects/:projectId/features/stats` endpoint returning aggregate counts
- [x] 5.5 Add GET `/api/projects/:projectId/agents/active` endpoint returning active agent runs
- [x] 5.6 Add GET `/api/projects/:projectId/agents/logs` endpoint (query by featureId) returning agent logs

## 6. Frontend - Replace Convex with REST API

- [x] 6.1 Remove `convex` and `convex-nextjs` dependencies from `apps/web/package.json`
- [x] 6.2 Remove `src/providers/convex-provider.tsx` and its usage from the provider tree
- [x] 6.3 Create `src/lib/api-client.ts` with fetch wrapper pointing to the orchestrator API base URL
- [x] 6.4 Create React hooks (`useProjects`, `useProject`, `useProjectFeatures`, `useFeatureStats`, `useActiveAgents`, `useAgentLogs`) with polling support (5s active, 30s background)
- [x] 6.5 Update dashboard components (kanban-board, agent-mission-control, log-viewer, dependency-graph) to use new hooks instead of mock data / Convex queries
- [x] 6.6 Update `src/app/api/auth/sync/route.ts` to call orchestrator API or DynamoDB directly for user upsert
- [x] 6.7 Update Linear integration files (`ticket-sync.ts`, `dependency-sync.ts`) to call orchestrator API or DynamoDB functions

## 7. Cleanup - Remove Convex

- [x] 7.1 Delete `packages/convex/` directory entirely
- [x] 7.2 Remove `@autoforge/convex` from root `package.json` workspaces if referenced
- [x] 7.3 Remove Convex-related environment variables from `.env.example` (`NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOY_KEY`)
- [x] 7.4 Add DynamoDB-related environment variables to `.env.example` (`DYNAMODB_TABLE_PREFIX`, `AWS_REGION`, `ORCHESTRATOR_API_URL`)
- [x] 7.5 Update CI/CD workflow (`.github/workflows/ci.yml`) to remove Convex deploy/test steps
- [x] 7.6 Update `CLAUDE.md` and `TECH_STACK.md` to reflect DynamoDB instead of Convex

## 8. Testing

- [x] 8.1 Write unit tests for `packages/dynamodb/` data access functions (mock DynamoDB client)
- [x] 8.2 Write unit tests for cycle detection logic in `src/dependencies.ts`
- [x] 8.3 Verify orchestrator builds and starts with DynamoDB configuration
- [x] 8.4 Verify frontend builds and renders with REST API hooks
- [ ] 8.5 Run existing Playwright E2E tests and fix any failures from the migration
