## Why

Convex is a managed serverless database that locks us into a proprietary runtime. As we expand AutoForge's AWS footprint (ECS, ECR, ALB, Secrets Manager), DynamoDB provides an AWS-native data layer that is cheaper at scale, fully IaC-manageable via CDK, and eliminates a separate vendor dependency. Consolidating on AWS services simplifies operations and billing.

## What Changes

- **BREAKING**: Remove Convex SDK (`convex`, `convex-nextjs`) from all packages
- **BREAKING**: Remove `packages/convex/` package entirely (schema, server functions, tests)
- **BREAKING**: Replace all `ConvexHttpClient` calls in orchestrator with DynamoDB SDK calls
- **BREAKING**: Replace all `useQuery`/`useMutation` Convex hooks in frontend with REST API + polling or WebSocket
- Add DynamoDB tables (projects, features, agents, agent_runs, tickets, users) via CDK
- Add a new `packages/dynamodb/` package with DynamoDB client, table definitions, and data access functions
- Update `packages/db/` Drizzle schemas to align with DynamoDB attribute naming
- Replace Convex real-time subscriptions with DynamoDB Streams + API Gateway WebSocket or polling
- Update CDK stack in `infra/` to provision DynamoDB tables with GSIs

## Capabilities

### New Capabilities
- `dynamodb-data-layer`: DynamoDB table definitions, client setup, and data access functions replacing Convex server functions
- `dynamodb-realtime`: Real-time data delivery mechanism replacing Convex reactive queries (polling, WebSocket, or SSE)

### Modified Capabilities
- `realtime-dashboard`: Data fetching changes from Convex reactive queries to the new real-time mechanism
- `drizzle-orm`: Schema alignment shifts from Convex to DynamoDB; Drizzle may be replaced or repurposed as a type-only layer

## Impact

- **Frontend (`apps/web/`)**: ConvexProvider removed, new data fetching layer (REST + WebSocket or polling), all dashboard components rewired
- **Backend (`apps/orchestrator/`)**: ConvexHttpClient replaced with DynamoDB DocumentClient, feature-watcher and pipeline updated
- **Database (`packages/convex/`)**: Entire package deleted
- **Types (`packages/db/`)**: Drizzle schemas updated or simplified to pure TypeScript types
- **Infrastructure (`infra/`)**: CDK stack gains DynamoDB tables, GSIs, and optional DynamoDB Streams
- **Dependencies**: Remove `convex`, `convex-nextjs`; add `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`
- **CI/CD**: Convex deploy step removed, DynamoDB table provisioning added
- **Tests**: Convex unit tests replaced with DynamoDB-compatible tests
