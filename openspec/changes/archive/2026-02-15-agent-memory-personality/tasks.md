## 1. Type Definitions

- [x] 1.1 Create `AgentMemory` type in `packages/db/src/schema/agent-memories.ts` with fields: `id`, `agentName`, `projectId`, `content`, `source` ("extraction" | "manual" | "system"), `createdAt`
- [x] 1.2 Create `AgentPersonality` type in `packages/db/src/schema/agent-personalities.ts` with fields: `agentName`, `displayName`, `persona`, `traits` (string[]), `communicationStyle`, `updatedAt`
- [x] 1.3 Export new types from `packages/db/src/schema/index.ts` and `packages/db/src/index.ts`

## 2. DynamoDB Infrastructure

- [x] 2.1 Add `agent-memories` table to CDK stack in `infra/lib/omakase-stack.ts` with PK `agentProjectKey` (string), SK `createdAt` (string), and GSI `by_agent_project` on `agentName` + `projectId`
- [x] 2.2 Add `agent-personalities` table to CDK stack with PK `agentName` (string), on-demand billing
- [x] 2.3 Grant the agent ECS task role read/write access to both new tables

## 3. DynamoDB Repository Modules

- [x] 3.1 Create `packages/dynamodb/src/agent-memories.ts` with functions: `createMemory`, `listMemories` (with 50-item cap), `deleteMemory`, `deleteMemoriesByAgentProject`
- [x] 3.2 Create `packages/dynamodb/src/agent-personalities.ts` with functions: `getPersonality`, `putPersonality`, `deletePersonality`
- [x] 3.3 Add default personality definitions for Miso, Nori, Koji, Toro in `packages/dynamodb/src/default-personalities.ts`
- [x] 3.4 Export all new functions from `packages/dynamodb/src/index.ts`

## 4. Memory Helper Script

- [x] 4.1 Create `apps/orchestrator/src/memory-helper.ts` with subcommands: `fetch-memory`, `fetch-personality`, `save-memory`
- [x] 4.2 `fetch-memory` subcommand: query agent-memories table, format as markdown list, output to stdout
- [x] 4.3 `fetch-personality` subcommand: query agent-personalities table (with default fallback), output personality markdown block to stdout
- [x] 4.4 `save-memory` subcommand: read JSON array from stdin, create individual memory items in DynamoDB

## 5. Agent Entrypoint Modifications

- [x] 5.1 Add Step 2b to `agent-entrypoint.sh`: invoke `memory-helper.ts fetch-personality` and prepend output to workspace CLAUDE.md
- [x] 5.2 Add Step 2c to `agent-entrypoint.sh`: invoke `memory-helper.ts fetch-memory`, create `.claude/memory/MEMORY.md` in workspace with output
- [x] 5.3 Add Step 6b to `agent-entrypoint.sh`: run post-run memory extraction via `claude -p` with extraction prompt, pipe JSON output to `memory-helper.ts save-memory`
- [x] 5.4 Update git identity in Step 3 to use personality display name if available (e.g., "Miso (Omakase Architect)")

## 6. Orchestrator API Endpoints

- [x] 6.1 Add `GET /api/agents/:agentName/memories` endpoint (query param: `projectId`) to orchestrator
- [x] 6.2 Add `POST /api/agents/:agentName/memories` endpoint (body: `{ projectId, content }`) to orchestrator
- [x] 6.3 Add `DELETE /api/agents/:agentName/memories/:id` endpoint to orchestrator
- [x] 6.4 Add `DELETE /api/agents/:agentName/memories` endpoint (query param: `projectId`) to orchestrator
- [x] 6.5 Add `GET /api/agents/:agentName/personality` endpoint to orchestrator
- [x] 6.6 Add `PUT /api/agents/:agentName/personality` endpoint (body: personality fields) to orchestrator
- [x] 6.7 Add `DELETE /api/agents/:agentName/personality` endpoint to orchestrator

## 7. Verification

- [x] 7.1 Run `bun --filter '*' run typecheck` to verify all type definitions compile
- [x] 7.2 Run `bun --filter @omakase/web run lint` to verify no lint errors (pre-existing ESLint not installed issue — no regressions from our changes)
- [ ] 7.3 Test memory-helper.ts subcommands locally with mock DynamoDB data (requires running DynamoDB)
- [ ] 7.4 Test modified agent-entrypoint.sh flow end-to-end in local execution mode (requires running DynamoDB + Claude CLI)
