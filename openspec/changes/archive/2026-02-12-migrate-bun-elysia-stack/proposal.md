## Why

The replatformed AutoForge stack currently uses Node.js as the runtime for both the Next.js frontend (`apps/web`) and the orchestrator backend (`apps/orchestrator`). Bun offers significantly faster startup times, native TypeScript execution (no transpilation step), and a built-in package manager with faster installs — all critical for a system that spins up agent containers frequently. Pairing Bun with Elysia (a Bun-native web framework) for the backend replaces the raw `http` module with end-to-end type safety and much better DX.

## What Changes

- **BREAKING** Replace Node.js runtime with Bun across the monorepo (frontend + backend + packages)
- **BREAKING** Replace `pnpm` package manager with `bun` (lockfile changes from `pnpm-lock.yaml` to `bun.lock`)
- **BREAKING** Replace raw Node.js `http` server in the orchestrator with Elysia framework
- Replace `tsx` dev runner with Bun's native TypeScript execution (`bun run`)
- Replace `tsc` build step with Bun's bundler where applicable
- Update Dockerfile from `node:20-slim` to `oven/bun:1` base image
- Update all CI/CD workflows from Node.js/pnpm to Bun
- Update `pnpm-workspace.yaml` to `bunfig.toml` workspace config
- Update Next.js scripts to use `bun` runner (`bun next dev`, `bun next build`)

## Capabilities

### New Capabilities

- `elysia-backend`: Elysia-based HTTP server for the orchestrator with typed routes, middleware, and plugin system replacing the raw Node.js `http` module
- `bun-runtime`: Bun runtime configuration across the monorepo — workspace config, scripts, lockfile, native TypeScript execution, and Bun-optimized Docker images

### Modified Capabilities

_(No existing spec-level requirement changes — this is an implementation-level runtime swap. The orchestrator's health check endpoint, feature watcher, and ECS agent management all retain the same behavior.)_

## Impact

- **Runtime**: Node.js 20 → Bun 1.x everywhere (dev, CI, Docker containers)
- **Package manager**: pnpm → bun install (faster installs, single lockfile format)
- **Backend framework**: Raw `http.createServer` → Elysia with typed routes and middleware
- **Docker**: `node:20-slim` → `oven/bun:1` (smaller image, faster startup)
- **CI/CD**: All GitHub Actions workflows switch from `setup-node` + `pnpm` to `setup-bun`
- **Dev scripts**: `tsx watch` → `bun --watch`, `tsc` build → `bun build` where possible
- **Dependencies removed**: `tsx`, `@types/node` (Bun includes its own types)
- **Files affected**: All `package.json` scripts, `Dockerfile`, `pnpm-workspace.yaml`, `.github/workflows/*.yml`, `apps/orchestrator/src/index.ts`
