## Why

Projects currently store a `repoUrl` string but have no proper GitHub integration — no OAuth flow, no repo selection UI, no installation-based access, and no user-controlled PR creation. The agent pipeline auto-creates PRs on completion, but users need to review agent work in chat first and explicitly trigger PR creation. Connecting a GitHub repo to a project should be as smooth as the existing Linear integration, and agents need proper workspace provisioning with authenticated repo access.

## What Changes

- **GitHub App installation flow**: Users install the Omakase GitHub App on their org/account, granting repo access. Installation tokens replace the global `GITHUB_TOKEN` env var for per-project authenticated access.
- **Repo connection UI**: Project settings get a GitHub section where users select from repos accessible via their GitHub App installation — no manual URL entry.
- **Project model expansion**: Add `githubInstallationId`, `githubAccessToken`, `githubRepoOwner`, `githubRepoName`, and `githubDefaultBranch` fields to the Project schema.
- **Chat-triggered PR creation**: Remove auto-PR-creation from the pipeline completion step. Instead, agents report completion in chat and the user explicitly requests PR creation via a chat command or button. The agent then creates the PR with the accumulated context.
- **Workspace provisioning with GitHub auth**: Work sessions and pipeline agents clone/fetch repos using the GitHub App installation token instead of a global token, enabling per-project repo access with proper scoping.
- **GitHub OAuth for user identity** (optional): Allow users to link their GitHub account for richer attribution on PRs (authored by the user, not a bot).

## Capabilities

### New Capabilities
- `github-app-connection`: GitHub App installation, repo selection, installation token management, and project-repo linking
- `chat-triggered-pr`: User-initiated PR creation from agent chat, with accumulated context from the pipeline run, replacing auto-PR on pipeline completion

### Modified Capabilities
- `work-session-workspace`: Workspace provisioning uses project-scoped GitHub installation tokens instead of a global `GITHUB_TOKEN`; repo clone/fetch authenticated via installation token
- `autonomous-agent-team`: Pipeline no longer auto-creates PRs on completion; instead reports readiness in chat and waits for user instruction

## Impact

- **Frontend**: New GitHub connection UI in project settings, PR creation button/command in agent chat panel
- **Backend (orchestrator)**: Pipeline completion flow changes — PR creation deferred to chat command handler; installation token refresh logic added
- **Database**: Project schema gains GitHub fields (`githubInstallationId`, `githubRepoOwner`, `githubRepoName`, `githubDefaultBranch`)
- **API routes**: New Next.js routes for GitHub App callback (`/api/auth/github/callback`), installation webhook (`/api/webhooks/github`), and repo listing
- **Infrastructure**: GitHub App registration required (app ID, private key, webhook secret as env vars)
- **Dependencies**: No new runtime dependencies — uses GitHub REST API via native fetch (same pattern as existing `pr-creator.ts`)
