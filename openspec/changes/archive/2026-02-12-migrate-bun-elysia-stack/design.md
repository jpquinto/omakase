## Context

The AutoForge platform was recently replatformed from Python/FastAPI to a TypeScript monorepo with Next.js frontend and Node.js orchestrator backend. The backend uses a raw `http.createServer` for the health endpoint and the `tsx` package for development. The entire monorepo uses pnpm as the package manager and Node.js 20 as the runtime.

Bun is a drop-in replacement for Node.js that executes TypeScript natively, has a significantly faster package manager, and starts ~4x faster — directly beneficial for agent containers that spin up frequently on ECS.

## Goals / Non-Goals

**Goals:**
- Replace Node.js with Bun as the runtime for all apps and packages
- Replace pnpm with Bun's built-in package manager
- Replace the raw `http` module in the orchestrator with Elysia
- Update Docker images, CI/CD pipelines, and dev scripts for Bun
- Maintain full backward compatibility of all API behavior and endpoints

**Non-Goals:**
- Rewriting business logic (feature watcher, pipeline, ECS agent management)
- Changing the Next.js framework or Convex database layer
- Migrating Auth0 or Linear integration code (unchanged)
- Optimizing Bun-specific APIs beyond the runtime swap (e.g., Bun.file, Bun.serve)

## Decisions

### D1: Bun 1.x as the unified runtime

**Choice**: Bun 1.x (latest stable)
**Rationale**: Bun natively runs TypeScript without transpilation, eliminating the need for `tsx` in development and reducing build steps. Bun's package manager is 3-10x faster than pnpm for installs. Agent Docker containers benefit from faster cold starts (~150ms vs ~600ms for Node.js).
**Alternatives considered**:
- Stay with Node.js: No performance benefit, keeps `tsx` dependency
- Deno: Good runtime but weaker npm compatibility, no native Next.js support

### D2: Elysia as the orchestrator HTTP framework

**Choice**: Elysia 1.x
**Rationale**: Elysia is Bun-native, provides end-to-end type safety (request/response types inferred), has a plugin system for middleware, and benchmarks at ~3x the throughput of Express/Fastify on Bun. The orchestrator currently only has a `/health` endpoint but will grow as we add admin APIs.
**Alternatives considered**:
- Hono: More portable (runs on Cloudflare Workers, Deno) but we're committed to Bun
- Fastify: Mature but not Bun-native, slower on Bun than Elysia
- Keep raw `http`: Works but no type safety, no middleware, no routing

### D3: Bun workspace instead of pnpm workspace

**Choice**: Replace `pnpm-workspace.yaml` with `bunfig.toml` workspace configuration
**Rationale**: Bun's workspace support is feature-complete and eliminates a separate tool. The `bun.lock` format is binary and faster to parse than `pnpm-lock.yaml`.
**Alternatives considered**:
- Keep pnpm alongside Bun: Confusing to have two package managers

### D4: `oven/bun:1` Docker base image

**Choice**: `oven/bun:1` (Debian-based)
**Rationale**: Official Bun Docker image, smaller than `node:20-slim`, includes all necessary system libraries. Agent containers start faster due to Bun's reduced startup time.
**Alternatives considered**:
- `oven/bun:1-alpine`: Even smaller but potential glibc compatibility issues with native modules
- Multi-stage build: Not needed since Bun runs TypeScript directly (no build artifact)

### D5: Next.js with Bun runtime

**Choice**: Use `bun next dev` / `bun next build` / `bun next start`
**Rationale**: Next.js 15 officially supports Bun as a runtime. Bun handles the `next` CLI commands and benefits from faster module resolution and startup. No code changes needed in Next.js app code.
**Alternatives considered**:
- Keep Node.js for Next.js only: Split runtime makes CI/CD more complex

## Risks / Trade-offs

- **[Bun compatibility with AWS SDK]** → Mitigation: AWS SDK v3 is confirmed compatible with Bun 1.x. The `@aws-sdk/client-ecs` and `@aws-sdk/client-cloudwatch-logs` packages work without modification.
- **[Bun compatibility with Convex SDK]** → Mitigation: Convex SDK works on Bun. The `ConvexHttpClient` uses standard `fetch` which Bun implements natively.
- **[Next.js edge cases on Bun]** → Mitigation: Run the full E2E test suite after migration. Next.js 15 has official Bun support documented.
- **[Elysia ecosystem maturity]** → Mitigation: Elysia has a smaller plugin ecosystem than Express/Fastify, but the orchestrator only needs basic routing + health checks. If plugins are needed later, Elysia supports Express-style middleware via `@elysiajs/express`.
- **[CI/CD caching]** → Mitigation: Bun has built-in `setup-bun` GitHub Action with cache support. Binary lockfile (`bun.lock`) caches efficiently.

## Open Questions

1. **Bun build vs tsc**: Should we use `bun build` to produce bundled output for production, or keep `tsc` for type checking and output? Recommendation: Use `tsc --noEmit` for type checking in CI, and `bun run` directly in production (no build step needed).
