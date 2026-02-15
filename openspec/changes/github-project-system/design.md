## Context

Omakase projects store a `repoUrl` string and the orchestrator uses a global `GITHUB_TOKEN` env var for PR creation. There is no GitHub OAuth or App integration — the existing "Connect GitHub" button in project settings points to an unbuilt endpoint. The Linear integration (OAuth flow, token storage, webhook receiver) provides a proven pattern to follow.

The agent pipeline currently auto-creates PRs immediately on pipeline success. Users have no opportunity to review agent output in chat before code is pushed as a PR. Work session workspace provisioning (spec'd in `work-session-workspace`) requires authenticated repo cloning, which currently relies on the global token.

## Goals / Non-Goals

**Goals:**
- Users can install a GitHub App and connect repos to projects through the UI
- Per-project authenticated repo access via GitHub App installation tokens
- Users control when PRs are created — via explicit chat interaction, not auto-creation
- Workspace provisioning uses project-scoped tokens for clone/fetch operations
- Follow the same integration patterns as the existing Linear integration

**Non-Goals:**
- GitHub Actions integration or CI/CD pipeline management
- GitHub webhook processing for push/PR events (future enhancement)
- Multi-repo projects (one repo per project for now)
- GitHub user OAuth for SSO (Auth0 remains the identity provider)
- Branch protection rule management or repo settings modification

## Decisions

### D1: GitHub App vs. OAuth App vs. Personal Access Token

**Decision:** GitHub App (organization/user installation)

**Rationale:**
- GitHub Apps have granular repo-level permissions (only access repos the user installs on)
- Installation tokens are short-lived (1 hour) and auto-refreshable from the App's private key
- No dependency on a single user's token — works for orgs where members come and go
- GitHub is deprecating OAuth App flows for new integrations
- Personal access tokens don't scale (tied to one user, no installation-level scoping)

**Alternatives considered:**
- OAuth App: Simpler flow but coarser permissions, deprecated path
- PAT: Current approach — doesn't scale, no per-project scoping, single point of failure

### D2: Token management — Installation tokens with server-side refresh

**Decision:** Store `githubInstallationId` on the Project. Generate short-lived installation tokens server-side using the App's private key when needed (clone, fetch, PR creation). Cache tokens in-memory with TTL.

**Rationale:**
- Installation tokens expire in 1 hour — storing them long-term is pointless
- The App private key (stored as env var/secret) can generate tokens for any installation on demand
- No user-facing token refresh flow needed — fully server-side
- Same pattern used by GitHub Actions runners internally

### D3: Repo selection via GitHub App installation API

**Decision:** After GitHub App installation, use `GET /app/installations/{id}/repositories` to list accessible repos. User picks from a dropdown in project settings.

**Rationale:**
- Only shows repos the user explicitly granted access to during App installation
- No need to paginate through all user repos (could be thousands)
- Respects the principle of least privilege — App only sees what's installed

### D4: Chat-triggered PR creation

**Decision:** When the agent pipeline completes (all 4 steps pass), the agent posts a summary message in chat with a "Create PR" action. The user can review, ask follow-up questions, request changes, or approve PR creation. A chat command (`/pr` or button) triggers actual PR creation.

**Rationale:**
- Gives users control over what gets pushed as a PR
- Allows post-pipeline conversation (e.g., "change the commit message", "squash these commits")
- The agent already has all context (plan, code, review, tests) accumulated in the run
- Non-blocking — user can come back later to create the PR

**Implementation:**
- Pipeline completion sets feature status to `review_ready` (new status) instead of `passing`
- Agent posts a structured message with type `pr_ready` containing branch name, diff summary, test results
- Frontend renders a "Create PR" button on `pr_ready` messages
- Button triggers `POST /api/agent-runs/:runId/create-pr` which calls the existing `pr-creator.ts`
- After PR creation, feature transitions to `passing`

### D5: Project schema expansion

**Decision:** Add GitHub-specific fields to the Project model:

```
githubInstallationId?: number    // GitHub App installation ID
githubRepoOwner?: string         // e.g., "acme-corp"
githubRepoName?: string          // e.g., "web-app"
githubDefaultBranch?: string     // e.g., "main" (fetched from GitHub API)
```

**Rationale:**
- `githubInstallationId` is the key to generate installation tokens — it's the only persistent credential
- `repoOwner`/`repoName` are parsed from repoUrl today but should be explicit fields
- `defaultBranch` avoids hardcoding "main" — repos may use "master", "develop", etc.
- Keep `repoUrl` for backwards compatibility but derive it from owner/name going forward

### D6: GitHub App webhook for installation events

**Decision:** Register a webhook endpoint (`/api/webhooks/github`) to receive `installation` and `installation_repositories` events. This keeps the installation ID in sync when users modify repo access.

**Rationale:**
- If a user removes the App from a repo, we need to know and update the project
- Follows the same pattern as the existing Linear webhook at `/api/webhooks/linear`
- Only handle installation lifecycle events — not push/PR events (non-goal)

## Risks / Trade-offs

**[Risk] GitHub App private key security** → Store as AWS Secrets Manager secret (same as other credentials). Never expose in frontend. Only orchestrator and API routes access it.

**[Risk] Installation token expiry during long pipeline runs** → Pipeline runs can exceed 1 hour. Mitigation: generate a fresh token at each pipeline step boundary, not once at start. The `refreshInstallationToken()` helper checks TTL and regenerates if < 10 minutes remaining.

**[Risk] User removes GitHub App mid-pipeline** → Installation token revocation mid-run. Mitigation: pipeline catches 401 from GitHub API, marks feature as `failing` with clear error message ("GitHub access revoked"). Agent chat shows the error.

**[Risk] `review_ready` is a new feature status** → Existing code expects `pending | in_progress | passing | failing`. Mitigation: add the status to the Feature type and update all status transition logic. The kanban board gains a "Ready for Review" column.

**[Trade-off] No GitHub user identity on PRs** → PRs are authored by the GitHub App bot, not the user. Acceptable for v1 — can add `Co-authored-by` trailer later using the user's GitHub username if they link their account.

**[Trade-off] One repo per project** → Simplifies everything. Multi-repo support can be added later without breaking changes (project just gets an array of repos).
