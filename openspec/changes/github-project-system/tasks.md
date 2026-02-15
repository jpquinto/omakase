## 1. Project Schema & Type Expansion

- [x] 1.1 Add `githubInstallationId`, `githubRepoOwner`, `githubRepoName`, `githubDefaultBranch` fields to the `Project` type in `packages/db/src/schema/projects.ts`
- [x] 1.2 Add `review_ready` to the `Feature` status union type in `packages/db/src/schema/features.ts`
- [x] 1.3 Update `packages/dynamodb/src/repositories/projects.ts` to handle new GitHub fields in CRUD operations (create, update, get)
- [x] 1.4 Add `clearGitHubConnection(projectId)` method to projects repository that clears all GitHub fields except `githubInstallationId`
- [x] 1.5 Add `clearGitHubInstallation(installationId)` method that finds all projects with the given installation ID and clears all GitHub fields

## 2. GitHub App Token Management

- [x] 2.1 Create `apps/orchestrator/src/github-app.ts` with JWT generation from App private key, installation token creation, and in-memory token caching with TTL
- [x] 2.2 Add `getInstallationToken(installationId)` that returns a cached token or generates a fresh one if cache miss or < 10 min remaining
- [x] 2.3 Add environment variable validation for `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_WEBHOOK_SECRET`, `GITHUB_APP_SLUG`

## 3. GitHub App Installation Flow (Frontend)

- [x] 3.1 Create `apps/web/src/app/api/auth/github/route.ts` — redirect to `https://github.com/apps/{slug}/installations/new` with state containing projectId
- [x] 3.2 Create `apps/web/src/app/api/auth/github/callback/route.ts` — receive `installation_id` and `setup_action`, store on project, redirect to project settings
- [x] 3.3 Update project settings GitHub section in `apps/web/src/app/(app)/projects/[id]/page.tsx` to show: Connect button (if no installation), repo selector (if installation but no repo), connected repo info + disconnect button (if repo connected)
- [x] 3.4 Create repo selector component that calls orchestrator API to list repos from the installation and lets user pick one

## 4. Orchestrator GitHub API Endpoints

- [x] 4.1 Add `GET /api/projects/:projectId/github/repos` endpoint on orchestrator that generates an installation token and lists accessible repos via GitHub API
- [x] 4.2 Add `POST /api/projects/:projectId/github/connect-repo` endpoint that stores selected repo owner, name, default branch, and derived repoUrl on the project
- [x] 4.3 Add `POST /api/projects/:projectId/github/disconnect` endpoint that clears GitHub repo fields from the project
- [x] 4.4 Add `POST /api/agent-runs/:runId/create-pr` endpoint that validates feature is `review_ready`, generates installation token, calls `createPullRequest()`, posts `pr_created` message, transitions feature to `passing`

## 5. GitHub Webhook Handler

- [x] 5.1 Create `apps/web/src/app/api/webhooks/github/route.ts` with HMAC-SHA256 signature verification using `GITHUB_APP_WEBHOOK_SECRET`
- [x] 5.2 Handle `installation.deleted` event — call `clearGitHubInstallation(installationId)` to clean all affected projects
- [x] 5.3 Handle `installation_repositories.removed` event — check if any project's connected repo was removed, clear GitHub repo fields if so

## 6. Pipeline Completion Flow Changes

- [x] 6.1 Update `apps/orchestrator/src/pipeline.ts` to transition feature to `review_ready` instead of `passing` on successful pipeline completion
- [x] 6.2 Remove or gate the auto-PR-creation call in pipeline completion — PR creation now happens via `POST /api/agent-runs/:runId/create-pr`
- [x] 6.3 Post a `pr_ready` message (type: `pr_ready`) to the agent chat on pipeline success, containing branch name, diff summary, test results summary, and implementation plan summary
- [x] 6.4 Update the feature watcher to not pick up `review_ready` features for new pipeline runs (they are already completed, awaiting PR)

## 7. Workspace Provisioning Token Integration

- [x] 7.1 Update `work-setup.sh` to accept `GITHUB_TOKEN` env var and use it for authenticated clone/fetch via `https://x-access-token:{token}@github.com/{owner}/{repo}.git`
- [x] 7.2 Update pipeline agent launch to generate a fresh installation token and pass it as `GITHUB_TOKEN` env var to the ECS task / local subprocess
- [x] 7.3 Update work session start handler to generate installation token and pass it to `work-setup.sh` when the project has `githubInstallationId`

## 8. Frontend PR Creation UI

- [x] 8.1 Create a `PrReadyCard` component that renders the `pr_ready` message type with diff summary, test results, and "Create PR" button
- [x] 8.2 Wire "Create PR" button to call `POST /api/agent-runs/:runId/create-pr` with loading/success/error states
- [x] 8.3 Create a `PrCreatedCard` component that renders the `pr_created` message type with a link to the PR on GitHub
- [x] 8.4 Update the kanban board to show a "Ready for Review" column for `review_ready` features, positioned between "In Progress" and "Passing"

## 9. Status Transition Updates

- [x] 9.1 Update `packages/dynamodb/src/repositories/features.ts` to add `markFeatureReviewReady(featureId)` and `transitionReviewReadyToPassing(featureId)` methods
- [x] 9.2 Update Linear sync to map `review_ready` to an appropriate Linear status (e.g., "In Review")
- [x] 9.3 Update any frontend status color/label mappings to include `review_ready` with appropriate styling
