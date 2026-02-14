## Why

Omakase agents (Miso, Nori, Koji, Toro) are currently stateless — each pipeline run starts with a blank slate. They have no memory of past work on the same project and no distinctive personality. This means agents repeat mistakes, don't learn project conventions over time, and feel generic. Adding persistent memory and personality gives agents a "clawdbot"-like identity: they accumulate project-specific knowledge across runs and communicate with a distinctive voice, making the autonomous pipeline smarter and the developer experience more engaging.

## What Changes

- Add a new `agent-memories` DynamoDB table to store per-agent, per-project memories
- Add a new `agent-personalities` DynamoDB table to store per-agent personality configuration (name, voice, traits, persona prompt)
- Create a DynamoDB repository module for reading/writing agent memories
- Create a DynamoDB repository module for reading/writing agent personality configs
- Add TypeScript type definitions for `AgentMemory` and `AgentPersonality`
- Modify the agent entrypoint script to fetch memories + personality from DynamoDB and inject them into the workspace as `.claude/memory/MEMORY.md` and into the CLAUDE.md personality preamble before launching Claude Code
- Add a post-run memory extraction step that parses agent output for learnings and persists new memories to DynamoDB
- Add CDK infrastructure for the two new DynamoDB tables
- Add orchestrator API endpoints for managing agent memories and personalities (CRUD)
- Export new repository functions from `@omakase/dynamodb`

## Capabilities

### New Capabilities
- `agent-memory`: Persistent per-agent, per-project memory storage and retrieval — fetched before agent runs and updated after with learned project patterns, conventions, and past mistakes
- `agent-personality`: Per-agent personality configuration — persona prompt, communication style, name, and traits injected into CLAUDE.md to give each agent a distinctive voice

### Modified Capabilities
- `autonomous-agent-team`: Agent entrypoint modified to inject memory and personality context before launching Claude Code, and to extract new memories after completion

## Impact

- **New DynamoDB tables**: `omakase-agent-memories`, `omakase-agent-personalities` (CDK + repository modules)
- **New type definitions**: `AgentMemory`, `AgentPersonality` in `packages/db`
- **Modified entrypoint**: `apps/orchestrator/src/agent-entrypoint.sh` gains pre-run injection and post-run extraction steps
- **New repository modules**: `packages/dynamodb/src/agent-memories.ts`, `packages/dynamodb/src/agent-personalities.ts`
- **Modified exports**: `packages/dynamodb/src/index.ts` gains new exports
- **New API routes**: orchestrator endpoints for memory/personality CRUD
- **CDK stack**: two new table resources in `infra/lib/omakase-stack.ts`
