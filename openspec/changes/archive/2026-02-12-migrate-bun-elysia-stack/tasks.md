## 1. Bun Runtime & Workspace Setup

- [x] 1.1 Create `.bun-version` file at monorepo root specifying Bun 1.x
- [x] 1.2 Update root `package.json` to add `"workspaces": ["apps/*", "packages/*"]` field
- [x] 1.3 Remove `pnpm-workspace.yaml`
- [x] 1.4 Update all `package.json` scripts to use `bun` instead of `node`/`npx`/`tsx`
- [x] 1.5 Remove `tsx` from all `devDependencies`
- [x] 1.6 Replace `@types/node` with `bun-types` in all packages

## 2. Elysia Backend Migration

- [x] 2.1 Add `elysia` dependency to `apps/orchestrator/package.json`
- [x] 2.2 Rewrite `apps/orchestrator/src/index.ts` to use Elysia instead of `http.createServer`
- [x] 2.3 Add request logging middleware using Elysia's `onBeforeHandle`/`onAfterHandle` hooks
- [x] 2.4 Implement graceful shutdown with Elysia's `stop()` method and signal handlers
- [x] 2.5 Update dev script from `tsx watch src/index.ts` to `bun --watch src/index.ts`
- [x] 2.6 Remove `tsx` dependency from orchestrator `package.json`

## 3. Next.js Frontend Bun Adaptation

- [x] 3.1 Update `apps/web/package.json` scripts to use `bun --bun next dev/build/start`
- [x] 3.2 Verify Convex client provider works under Bun runtime
- [x] 3.3 Verify Auth0 SDK works under Bun runtime
- [x] 3.4 Update `vercel.json` install command from `pnpm install` to `bun install`

## 4. Docker & Infrastructure Updates

- [x] 4.1 Rewrite `apps/orchestrator/Dockerfile` to use `oven/bun:1` base image
- [x] 4.2 Update CDK ECS task definition for Bun runtime (command: `bun run src/index.ts`)
- [x] 4.3 Update agent Dockerfile to use `oven/bun:1` base image

## 5. CI/CD Pipeline Updates

- [x] 5.1 Update `.github/workflows/ci.yml` to use `oven/setup-bun@v2` and `bun install`
- [x] 5.2 Update `.github/workflows/deploy-infra.yml` for Bun (infra uses npm directly, minimal change)
- [x] 5.3 Update `.github/workflows/deploy-agent-image.yml` for Bun Docker build
- [x] 5.4 Update `.github/workflows/deploy-web.yml` for Bun install

## 6. Package-Level Updates

- [x] 6.1 Update `packages/db/package.json` scripts for Bun
- [x] 6.2 Update `packages/shared/package.json` scripts for Bun
- [x] 6.3 Update `packages/convex/package.json` scripts and test runner for Bun
- [x] 6.4 Verify Vitest tests pass under Bun runtime (`bun test` or `bun vitest run`)

## 7. Cleanup

- [x] 7.1 Delete `pnpm-workspace.yaml` if not already removed
- [x] 7.2 Add `bun.lock` to version control, remove `pnpm-lock.yaml` from tracking
- [x] 7.3 Update root `CLAUDE.md` to reference Bun commands instead of pnpm/Node.js
