## Context

Omakase runs a 4-agent pipeline (Miso/architect, Nori/coder, Koji/reviewer, Toro/tester) for each feature. Each run starts fresh — the agent-entrypoint.sh clones the repo, copies a role-specific CLAUDE.md, invokes Claude Code CLI, and exits. There is no mechanism for agents to remember what they learned in previous runs or to express a distinctive personality beyond their role instructions.

Claude Code natively supports two mechanisms we can leverage:
1. **CLAUDE.md** at workspace root — auto-loaded as project instructions
2. **`.claude/memory/MEMORY.md`** — persistent memory file that Claude Code reads automatically

Currently, the entrypoint copies the role CLAUDE.md to the workspace root (line 88 of agent-entrypoint.sh). We need to extend this to also inject personality and memory content before launching Claude Code, and extract new memories after.

### Current Flow
```
agent-entrypoint.sh:
  1. Bootstrap workspace (agent-setup.sh)
  2. Copy role CLAUDE.md → workspace root
  3. Configure git identity
  4. Build prompt
  5. Invoke Claude Code CLI
  6. Push commits
  7. Parse exit code
```

### Proposed Flow
```
agent-entrypoint.sh:
  1. Bootstrap workspace (agent-setup.sh)
  2. Copy role CLAUDE.md → workspace root
  2b. Fetch personality from DynamoDB → prepend to CLAUDE.md
  2c. Fetch memories from DynamoDB → write to .claude/memory/MEMORY.md
  3. Configure git identity (use personality name if available)
  4. Build prompt
  5. Invoke Claude Code CLI
  6. Push commits
  6b. Extract new memories from agent output → save to DynamoDB
  7. Parse exit code
```

## Goals / Non-Goals

**Goals:**
- Give each agent persistent, project-scoped memory that accumulates across pipeline runs
- Give each agent a configurable personality (name, voice, traits) that shapes its communication style
- Leverage Claude Code's native CLAUDE.md and memory file mechanisms (no custom tooling)
- Keep the memory injection/extraction lightweight — must not add more than ~5 seconds to each agent step
- Make personality and memory manageable via REST API endpoints on the orchestrator

**Non-Goals:**
- Cross-project memory sharing (memories are scoped to agent + project)
- Real-time memory updates during a run (memory is loaded at start, saved at end)
- Frontend UI for editing memories/personalities (API only for now)
- Agent "skills" as separate .claude/commands/ files (future enhancement, not this change)
- Memory-based agent routing or decision-making at the orchestrator level

## Decisions

### Decision 1: Two separate DynamoDB tables (not a single table)

**Choice**: `agent-memories` and `agent-personalities` as separate tables.

**Rationale**: Memories and personalities have fundamentally different access patterns and lifecycles. Memories are append-heavy and project-scoped (agent+project → many memory entries). Personalities are rarely updated and agent-scoped (one config per agent). Separate tables avoid hot partitions and keep queries simple.

**Alternative considered**: Single `agent-config` table with a `type` discriminator. Rejected because it complicates GSI design and mixes high-write (memories) with low-write (personality) data.

### Decision 2: Memory stored as individual items, not a single blob

**Choice**: Each memory is a separate DynamoDB item with `agentName#projectId` as partition key and `createdAt` as sort key.

**Rationale**: This allows efficient time-range queries (fetch recent N memories), individual memory deletion, and avoids the 400KB DynamoDB item size limit. The entrypoint script fetches all memories for the agent+project and concatenates them into MEMORY.md.

**Alternative considered**: Single item per agent+project with a `memories: string[]` array. Rejected because it requires read-modify-write for appends (race conditions under concurrent pipelines) and hits size limits for long-running projects.

### Decision 3: Personality injected as CLAUDE.md preamble (not separate file)

**Choice**: Personality content is prepended to the role CLAUDE.md before writing to workspace root.

**Rationale**: Claude Code treats CLAUDE.md as the primary instruction source. Personality traits (communication style, name, persona prompt) are behavioral instructions — they belong in CLAUDE.md alongside role instructions. A separate file would require Claude Code to discover and prioritize it, which isn't guaranteed.

**Alternative considered**: Write personality to `.claude/personality.md`. Rejected because Claude Code doesn't natively read this path — only CLAUDE.md and .claude/memory/MEMORY.md are auto-discovered.

### Decision 4: Memory extraction via a lightweight post-run Claude call

**Choice**: After the main Claude Code invocation completes, run a second, minimal `claude -p` call that reads the agent's output and extracts 1-5 key learnings as JSON. The entrypoint script then writes these to DynamoDB via a small helper.

**Rationale**: The agent itself is best positioned to identify what it learned. A second, focused call with a tight prompt and `--max-tokens 500` keeps it fast (~2-3 seconds). The main agent run shouldn't be burdened with memory management — separation of concerns.

**Alternative considered**: (a) Have the main agent write memories during its run. Rejected because it changes the agent's focus and adds complexity to role CLAUDE.md. (b) Parse output logs with regex. Rejected because agent output is unstructured natural language.

### Decision 5: Personality table keyed by agent name (not agent ID)

**Choice**: `agentName` ("miso", "nori", "koji", "toro") as partition key in agent-personalities table.

**Rationale**: Agent names are stable identifiers in Omakase. The existing `agents` table uses per-project ULIDs as IDs, but personality is agent-identity-level (Miso is Miso across all projects). Using the name directly avoids a join through the agents table.

**Alternative considered**: Use agent ID from agents table. Rejected because agent IDs are project-scoped ULIDs — Miso in project A has a different ID than Miso in project B, but should have the same personality.

### Decision 6: DynamoDB fetch/write via a helper script (not inline bash)

**Choice**: A TypeScript helper script (`memory-helper.ts`) that the entrypoint invokes with `bun run` for DynamoDB operations (fetch memories, fetch personality, save memories).

**Rationale**: DynamoDB SDK calls are complex in bash. Bun is already available in the agent container (it's the runtime). A single helper script with subcommands (`fetch-memory`, `fetch-personality`, `save-memory`) keeps the entrypoint clean and the DynamoDB logic in TypeScript where it can share the existing client configuration.

**Alternative considered**: AWS CLI calls from bash. Rejected because it requires parsing JSON output in bash, doesn't share the existing DynamoDB client config, and adds error handling complexity.

## Risks / Trade-offs

**Memory accumulation bloat** → Cap memories at 50 per agent+project. When exceeding the cap, the fetch query returns only the 50 most recent. Older memories can be pruned by a future cleanup job.

**Post-run extraction adds latency** → The extraction call is bounded by `--max-tokens 500` and a focused prompt. Expected overhead: 2-3 seconds. If it fails, the pipeline continues (extraction is best-effort).

**Personality prompt injection could conflict with role instructions** → Personality is prepended as a clearly delimited `# Personality` section before the role instructions. The role CLAUDE.md always takes precedence for behavioral constraints.

**Concurrent pipeline runs for same agent+project could write conflicting memories** → Each memory is an individual item with a unique timestamp sort key. Concurrent writes append independently without conflicts. Duplicate learnings may occur but are harmless (dedup can be added later).

**Container must have DynamoDB access for memory operations** → The agent ECS task role already has DynamoDB access for the existing tables (agent-messages, agent-runs). The two new tables need to be added to the IAM policy in CDK.
