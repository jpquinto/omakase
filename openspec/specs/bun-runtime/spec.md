## ADDED Requirements

### Requirement: Bun as monorepo runtime
The monorepo SHALL use Bun as the JavaScript/TypeScript runtime for all apps and packages, replacing Node.js.

#### Scenario: TypeScript files execute without transpilation
- **WHEN** `bun run src/index.ts` is executed in any package
- **THEN** the TypeScript file runs directly without a prior build step

#### Scenario: Bun version is pinned
- **WHEN** the project is set up
- **THEN** a `.bun-version` file at the root specifies the minimum Bun version (1.x)

### Requirement: Bun workspace configuration
The monorepo SHALL use Bun's workspace feature configured via the root `package.json` `workspaces` field, replacing `pnpm-workspace.yaml`.

#### Scenario: Workspace packages are resolved
- **WHEN** `bun install` is run at the monorepo root
- **THEN** all packages in `apps/*` and `packages/*` are linked and their dependencies installed

#### Scenario: Cross-package imports work
- **WHEN** `apps/web` imports from `@omakase/db`
- **THEN** the import resolves to the local workspace package without publishing

### Requirement: Bun package manager replaces pnpm
The monorepo SHALL use `bun install` for dependency management, producing a `bun.lock` lockfile. The `pnpm-lock.yaml` file SHALL be removed.

#### Scenario: Dependencies install with bun
- **WHEN** `bun install` is run
- **THEN** all dependencies are installed and a `bun.lock` file is created or updated

#### Scenario: No pnpm artifacts remain
- **WHEN** the migration is complete
- **THEN** `pnpm-workspace.yaml` and `pnpm-lock.yaml` do not exist in the repository

### Requirement: Bun-based Next.js execution
The Next.js frontend SHALL run via Bun using `bun --bun next dev`, `bun --bun next build`, and `bun --bun next start`.

#### Scenario: Next.js dev server starts with Bun
- **WHEN** `bun run dev` is executed in `apps/web/`
- **THEN** the Next.js development server starts using Bun runtime with hot reload

#### Scenario: Next.js production build succeeds
- **WHEN** `bun run build` is executed in `apps/web/`
- **THEN** the Next.js production build completes without errors

### Requirement: Bun Docker image for containers
Agent and orchestrator Docker containers SHALL use the `oven/bun:1` base image instead of `node:20-slim`.

#### Scenario: Orchestrator Dockerfile uses Bun
- **WHEN** the orchestrator Dockerfile is built
- **THEN** it uses `FROM oven/bun:1` and runs the app with `bun run src/index.ts`

#### Scenario: Docker image starts faster
- **WHEN** the container starts
- **THEN** the Bun process begins executing within 200ms (no transpilation delay)

### Requirement: Bun-based CI/CD pipelines
All GitHub Actions workflows SHALL use `oven/setup-bun` instead of `actions/setup-node` and `pnpm/action-setup`.

#### Scenario: CI installs dependencies with Bun
- **WHEN** a CI job runs
- **THEN** it uses `oven/setup-bun@v2` and `bun install --frozen-lockfile`

#### Scenario: CI runs tests with Bun
- **WHEN** the test job runs
- **THEN** it executes `bun test` (Vitest) and `bun run test:e2e` (Playwright)

### Requirement: Dev scripts use Bun natively
All `package.json` scripts SHALL use `bun` commands, removing the need for `tsx`, `ts-node`, or `npx`.

#### Scenario: Orchestrator dev mode uses Bun watch
- **WHEN** `bun run dev` is executed in `apps/orchestrator/`
- **THEN** Bun runs the TypeScript entry point with `--watch` for auto-reload

#### Scenario: No tsx dependency
- **WHEN** the migration is complete
- **THEN** `tsx` is not listed in any `package.json` in the monorepo
