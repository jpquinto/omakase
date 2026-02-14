## MODIFIED Requirements

### Requirement: Agent role definitions
The system SHALL define four agent roles, each with specialized CLAUDE.md instructions and tool access: architect, coder, reviewer, and tester. Before invoking Claude Code, the system SHALL prepend any configured personality to the role CLAUDE.md and inject fetched memories into `.claude/memory/MEMORY.md` in the workspace.

#### Scenario: Architect agent receives planning prompt
- **WHEN** an architect agent is started for a feature
- **THEN** it receives a CLAUDE.md with personality preamble (if configured) followed by role instructions to read the feature requirements, analyze affected files, and produce an implementation plan
- **AND** it receives a `.claude/memory/MEMORY.md` containing any existing memories for this agent and project

#### Scenario: Coder agent receives implementation prompt
- **WHEN** a coder agent is started with an implementation plan
- **THEN** it receives a CLAUDE.md with personality preamble (if configured) followed by role instructions to implement the plan, write code, and run lint/type-check
- **AND** it receives a `.claude/memory/MEMORY.md` containing any existing memories for this agent and project

#### Scenario: Reviewer agent receives review prompt
- **WHEN** a reviewer agent is started for completed code changes
- **THEN** it receives a CLAUDE.md with personality preamble (if configured) followed by role instructions to review the diff for quality, security, and correctness issues
- **AND** it receives a `.claude/memory/MEMORY.md` containing any existing memories for this agent and project

#### Scenario: Tester agent receives testing prompt
- **WHEN** a tester agent is started for a feature
- **THEN** it receives a CLAUDE.md with personality preamble (if configured) followed by role instructions to write tests covering the feature's acceptance criteria and run them
- **AND** it receives a `.claude/memory/MEMORY.md` containing any existing memories for this agent and project

### Requirement: Agent status reporting
The system SHALL report agent status to DynamoDB in real-time, including current phase (thinking, coding, testing), output logs, and completion status.

#### Scenario: Agent status updates during execution
- **WHEN** an agent is running and produces output
- **THEN** status updates are written to the agent_runs table in DynamoDB every 5 seconds

#### Scenario: Agent completion recorded
- **WHEN** an agent finishes (success or failure)
- **THEN** the final status, duration, and output summary are recorded in DynamoDB

#### Scenario: Post-run memory extraction recorded
- **WHEN** an agent finishes successfully and the memory extraction step runs
- **THEN** extracted memories are saved to the agent-memories table and a status message is posted noting how many memories were saved

## ADDED Requirements

### Requirement: Memory-helper script for DynamoDB operations
The system SHALL include a TypeScript helper script (`memory-helper.ts`) in the orchestrator that the agent entrypoint invokes via `bun run` for DynamoDB operations during the agent lifecycle.

#### Scenario: Fetch memories subcommand
- **WHEN** the entrypoint runs `bun run memory-helper.ts fetch-memory --agent <name> --project <id>`
- **THEN** the script queries the agent-memories table and outputs the memories as a markdown-formatted list to stdout

#### Scenario: Fetch personality subcommand
- **WHEN** the entrypoint runs `bun run memory-helper.ts fetch-personality --agent <name>`
- **THEN** the script queries the agent-personalities table and outputs the personality markdown block to stdout, or outputs nothing if no personality exists

#### Scenario: Save memories subcommand
- **WHEN** the entrypoint runs `bun run memory-helper.ts save-memory --agent <name> --project <id>` with JSON input piped to stdin
- **THEN** the script parses the JSON array of learning strings and creates individual memory items in the agent-memories table
