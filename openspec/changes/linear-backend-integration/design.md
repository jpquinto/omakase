## Context

The Omakase platform has a partial Linear integration: OAuth routes exist in the Next.js web app, a webhook receiver validates signatures and routes events, and library modules (`status-sync.ts`, `comments.ts`, `ticket-sync.ts`, `client.ts`) provide GraphQL utilities. However, the webhook handlers contain TODO placeholders referencing orchestrator API calls instead of making actual requests, the orchestrator (`apps/orchestrator/`) has no Linear awareness, and the OAuth callback doesn't persist the access token.

The DynamoDB data model already has the right shape — the `Feature` type has `linearIssueId` and `linearIssueUrl` optional fields, the `Project` type has `linearTeamId` and `linearAccessToken` optional fields, and there's a `tickets` table with `by_linearIssueId` GSI. The `features` table has a `by_project` GSI with primary key on `id`, and the `projects` table has a `by_status` GSI with primary key on `id`. What's missing is the glue: DynamoDB data-access functions for creating/querying features by Linear issue ID, orchestrator REST API endpoints that expose those functions to the web app, actual calls from webhook handlers to those endpoints, and orchestrator-side code to push status changes back to Linear.

The web app has no direct database access. All data operations go through the orchestrator REST API via `apiFetch` from `src/lib/api-client.ts`, which calls `NEXT_PUBLIC_ORCHESTRATOR_URL`.

## Goals / Non-Goals

**Goals:**
- Linear issues (labeled with trigger label) create features in DynamoDB via webhooks calling orchestrator API
- Linear issue updates propagate to DynamoDB features via orchestrator API
- The orchestrator updates Linear issue status when pipeline steps complete (in_progress, passing, failing)
- The orchestrator posts implementation summary comments to Linear issues on pipeline completion
- OAuth callback persists the access token to the project's DynamoDB record via orchestrator API
- The orchestrator retrieves Linear access tokens from DynamoDB project records

**Non-Goals:**
- PR creation from Linear (already exists, out of scope per user request)
- Frontend UI for connecting/disconnecting Linear (separate change)
- Linear dependency sync (`dependency-sync.ts`) — address in a follow-up
- Bidirectional status sync (Linear -> Omakase status) — webhook-based ticket ingestion is sufficient for now

## Decisions

### 1. Webhook handlers call the orchestrator REST API (web app has no direct DB access)

**Decision**: The webhook handlers in `apps/web/src/lib/linear/ticket-sync.ts` call the orchestrator REST API using `apiFetch` from `@/lib/api-client`. The web app never accesses DynamoDB directly — all data mutations flow through orchestrator endpoints.

**Rationale**: This is the established architecture pattern. The web app already uses `apiFetch` to call orchestrator endpoints like `GET /api/projects` and `GET /api/projects/:id/features`. Keeping webhook handlers consistent with this pattern avoids introducing a second data access path and keeps the orchestrator as the single point of data authority.

**Alternative considered**: Direct DynamoDB calls from the web app — rejected because it breaks the established REST API pattern and would require the web app to have AWS credentials.

### 2. Orchestrator exposes new REST API endpoints for Linear operations

**Decision**: Add the following endpoints to the orchestrator's Elysia server in `apps/orchestrator/src/index.ts`:

- `POST /api/features/from-linear` — Creates a feature from Linear webhook data. Accepts `{ projectId, name, description, priority, category, linearIssueId, linearIssueUrl }`.
- `GET /api/features/by-linear-issue/:linearIssueId` — Looks up a feature by its `linearIssueId`. Returns the feature or 404.
- `PATCH /api/features/:featureId/from-linear` — Updates a feature's name, description, and priority from Linear webhook data.
- `POST /api/projects/:projectId/linear-token` — Stores a Linear OAuth access token and team ID on a project record. Accepts `{ linearAccessToken, linearTeamId }`.
- `GET /api/projects/by-linear-team/:teamId` — Looks up a project by its `linearTeamId`. Returns the project or 404.

**Rationale**: Each endpoint maps 1:1 to a DynamoDB function, keeping the API surface thin and predictable. The naming follows the existing pattern (e.g., `/api/projects/:projectId/features`).

**Alternative considered**: A single `POST /api/linear/webhook` endpoint on the orchestrator that handles all Linear logic — rejected because it would duplicate the webhook signature verification already in the web app and tightly couple the orchestrator to Linear's webhook format.

### 3. DynamoDB functions for Linear data access

**Decision**: Add to `packages/dynamodb/src/features.ts`:
- `createFromLinear` — creates a feature with Linear fields (name, description, priority, category, linearIssueId, linearIssueUrl). Checks for duplicate `linearIssueId` before inserting. Uses the `by_project` GSI to scan for duplicates within the project.
- `getByLinearIssueId` — queries features by `linearIssueId`. Since there is no dedicated GSI on `linearIssueId` for the features table, this uses a Scan with a filter expression (acceptable at current scale).
- `updateFromLinear` — updates name, description, and priority on an existing feature by primary key (`id`).

Add to `packages/dynamodb/src/projects.ts`:
- `getByLinearTeamId` — queries projects by `linearTeamId`. Uses a Scan with filter (no dedicated GSI needed at current scale).

For token storage, use the existing `updateProject` function which already accepts `linearAccessToken` and `linearTeamId` fields.

**Rationale**: These are the minimum functions needed. The existing `updateProject` already handles token persistence, so no new mutation is needed for that — the orchestrator endpoint calls `updateProject({ projectId, linearAccessToken, linearTeamId })`.

### 4. Linear lib modules extracted to shared package

**Decision**: Extract `client.ts`, `status-sync.ts`, and `comments.ts` from `apps/web/src/lib/linear/` into `packages/shared/src/linear/` so both the web app and orchestrator can import them. Create `packages/shared/src/index.ts` to re-export the Linear modules. Update `apps/web/src/lib/linear/` files to re-export from `@omakase/shared` for backward compatibility.

**Rationale**: These modules are pure functions with no Next.js dependencies — they use `fetch` for GraphQL calls. The shared package (`packages/shared/`) already exists in the monorepo for cross-cutting utilities. Duplicating them across the web app and orchestrator would create maintenance burden and drift.

**Alternative considered**: Keep them in the web app and duplicate into the orchestrator — rejected due to maintenance burden.

### 5. Pipeline hooks for Linear sync — post-step callbacks

**Decision**: Add a `LinearSyncHook` class in `apps/orchestrator/src/linear-sync.ts` that the pipeline calls after `markFeaturePassing` and `markFeatureFailing`. The hook: (a) uses the project's `linearAccessToken`, (b) calls `syncFeatureStatusToLinear` from `@omakase/shared`, and (c) on pipeline success, calls `postImplementationComment` from `@omakase/shared`.

All methods are no-ops if `linearAccessToken` or `linearIssueId` is missing. All methods catch and log errors without throwing — Linear sync is non-critical and must never fail the pipeline.

**Rationale**: Keeps Linear logic out of the core pipeline flow. The pipeline calls the hook; the hook is a no-op if the feature isn't linked to Linear or the project has no token. The orchestrator already has direct access to DynamoDB (via `@omakase/dynamodb`), so it reads the Linear token from the project record directly — no extra REST hop needed.

## Risks / Trade-offs

- **Linear API rate limits** — The orchestrator calls Linear 2-3 times per pipeline completion (fetch issue, fetch states, update state, post comment). At scale this could hit rate limits. Mitigation: Linear's rate limit is 1500 req/hour per token, which supports ~375 feature completions/hour — well above expected throughput.

- **Stale Linear access tokens** — OAuth tokens may expire or be revoked. Mitigation: Wrap Linear API calls in try/catch; log failures but don't fail the pipeline. Linear sync is non-critical.

- **Shared package extraction** — Moving files from `apps/web` to `packages/shared` changes import paths. Mitigation: Re-export from `apps/web/src/lib/linear/` to avoid breaking existing imports.

- **DynamoDB scans for Linear lookups** — `getByLinearIssueId` and `getByLinearTeamId` use table scans with filter expressions rather than dedicated GSIs. Mitigation: At current scale (< 1000 features, < 100 projects) this is acceptable. If scale increases, add dedicated GSIs in a follow-up change.

- **Project lookup in orchestrator** — Each pipeline needs the project record (including Linear token) from DynamoDB. Mitigation: The `FeatureWatcher` already queries projects each poll cycle via `listActiveProjects`; pass the project record (including `linearAccessToken` and `linearTeamId`) through to the pipeline config.
