## Why

The Linear integration frontend scaffolding exists (OAuth routes, webhook receiver, GraphQL client, status-sync, comments, ticket-sync modules) but the backend plumbing is incomplete. The webhook handlers log events but don't call the orchestrator REST API, the orchestrator has zero Linear awareness, and there are no DynamoDB functions for creating/updating features from Linear issues. Until these gaps are closed, Linear issues cannot flow into the agent pipeline and agents cannot report status back to Linear.

## What Changes

- Add DynamoDB data-access functions for Linear-linked feature management (`createFromLinear`, `getByLinearIssueId`, `updateFromLinear`) in `packages/dynamodb/src/features.ts`
- Add a DynamoDB query for project lookup by Linear team ID (`getByLinearTeamId`) in `packages/dynamodb/src/projects.ts`
- Add orchestrator REST API endpoints that expose the new DynamoDB functions to the web app (`POST /api/features/from-linear`, `GET /api/features/by-linear-issue/:linearIssueId`, `PATCH /api/features/:featureId/from-linear`, `POST /api/projects/:projectId/linear-token`, `GET /api/projects/by-linear-team/:teamId`)
- Wire the existing webhook handlers (`ticket-sync.ts`) to call the orchestrator REST API instead of logging TODOs
- Add Linear status sync to the orchestrator pipeline — when a feature transitions to `in_progress`, `passing`, or `failing`, push the status change to the linked Linear issue
- Add Linear comment posting to the orchestrator pipeline — post implementation summary comments on pipeline completion
- Store and retrieve Linear access tokens from the project's DynamoDB record so the orchestrator can authenticate against the Linear API
- Complete the OAuth callback to persist the access token via the orchestrator REST API
- Extract shared Linear modules (`client.ts`, `status-sync.ts`, `comments.ts`) into `packages/shared/src/linear/` so both the web app and orchestrator can import them

## Capabilities

### New Capabilities
- `linear-orchestrator-sync`: Orchestrator-side integration that pushes feature status changes and implementation comments to Linear issues after each pipeline step

### Modified Capabilities
- `linear-integration`: Complete the backend wiring — orchestrator REST API endpoints for feature creation/update from webhooks, OAuth token persistence via orchestrator API, and webhook handler completion
- `dynamodb-data-access`: Add Linear-specific functions to the features and projects modules (createFromLinear, getByLinearIssueId, updateFromLinear, getByLinearTeamId)

## Impact

- **DynamoDB (`packages/dynamodb/`)**: New functions in `features.ts` and `projects.ts`, new exports in `index.ts`
- **Orchestrator (`apps/orchestrator/`)**: New REST API endpoints in `index.ts`, new `linear-sync.ts` module, changes to `pipeline.ts` to call Linear status sync and comment posting after step completion, `feature-watcher.ts` updated to pass Linear fields through to pipeline config
- **Web (`apps/web/`)**: Wire `ticket-sync.ts` handlers to orchestrator REST API, complete OAuth callback token persistence via orchestrator API
- **Shared (`packages/shared/`)**: New `src/linear/` directory with `client.ts`, `status-sync.ts`, `comments.ts` extracted from `apps/web/src/lib/linear/`, plus `src/index.ts` with exports
- **Environment**: Orchestrator retrieves Linear access tokens from project records in DynamoDB; no new infrastructure or environment variables required
