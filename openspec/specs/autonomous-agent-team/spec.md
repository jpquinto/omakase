## ADDED Requirements

### Requirement: Agent role definitions
The system SHALL define four agent roles, each with specialized CLAUDE.md instructions and tool access: architect, coder, reviewer, and tester.

#### Scenario: Architect agent receives planning prompt
- **WHEN** an architect agent is started for a feature
- **THEN** it receives a CLAUDE.md instructing it to read the feature requirements, analyze affected files, and produce an implementation plan

#### Scenario: Coder agent receives implementation prompt
- **WHEN** a coder agent is started with an implementation plan
- **THEN** it receives a CLAUDE.md instructing it to implement the plan, write code, and run lint/type-check

#### Scenario: Reviewer agent receives review prompt
- **WHEN** a reviewer agent is started for completed code changes
- **THEN** it receives a CLAUDE.md instructing it to review the diff for quality, security, and correctness issues

#### Scenario: Tester agent receives testing prompt
- **WHEN** a tester agent is started for a feature
- **THEN** it receives a CLAUDE.md instructing it to write tests covering the feature's acceptance criteria and run them

### Requirement: Orchestrator service
The system SHALL run an orchestrator that watches for ready features, assigns them to agents in the correct role sequence, and manages the pipeline.

#### Scenario: Orchestrator picks up ready feature
- **WHEN** a feature has status "pending" and all dependencies are met
- **THEN** the orchestrator assigns it to an architect agent to begin the pipeline

#### Scenario: Pipeline progresses through roles
- **WHEN** the architect agent completes successfully
- **THEN** the orchestrator starts a coder agent with the architect's plan
- **WHEN** the coder agent completes successfully
- **THEN** the orchestrator starts a reviewer agent with the code diff
- **WHEN** the reviewer agent approves
- **THEN** the orchestrator starts a tester agent

#### Scenario: Pipeline failure triggers retry or escalation
- **WHEN** an agent in the pipeline fails (non-zero exit or explicit failure)
- **THEN** the orchestrator retries the step once, and if it fails again, marks the feature as "failing" and alerts

### Requirement: Agent status reporting
The system SHALL report agent status to Convex in real-time, including current phase (thinking, coding, testing), output logs, and completion status.

#### Scenario: Agent status updates during execution
- **WHEN** an agent is running and produces output
- **THEN** status updates are written to the agent_runs table in Convex every 5 seconds

#### Scenario: Agent completion recorded
- **WHEN** an agent finishes (success or failure)
- **THEN** the final status, duration, and output summary are recorded in Convex

### Requirement: Concurrent agent execution with limits
The system SHALL support running multiple agent pipelines concurrently, respecting per-project concurrency limits.

#### Scenario: Multiple features processed in parallel
- **WHEN** 3 features are ready and the concurrency limit is 3
- **THEN** 3 architect agents are launched simultaneously

#### Scenario: Concurrency limit enforced
- **WHEN** the concurrency limit is 2 and 2 pipelines are active
- **THEN** additional ready features wait in queue until a pipeline completes

### Requirement: Agent workspace isolation
The system SHALL give each agent an isolated workspace with its own git branch and working directory.

#### Scenario: Agent works on isolated branch
- **WHEN** a coder agent starts working on a feature
- **THEN** it creates a branch named `agent/<feature-id>` from the main branch and commits changes there

#### Scenario: Completed work is submitted as PR
- **WHEN** the full agent pipeline completes successfully for a feature
- **THEN** a pull request is created from the agent's branch to main with the implementation details

### Requirement: Agent message checking during execution
The agent execution wrapper SHALL poll the orchestrator for user messages at a configurable interval (default: 5 seconds) and at natural breakpoints between pipeline steps.

#### Scenario: Agent checks for messages during execution
- **WHEN** an agent is running and the poll interval elapses
- **THEN** the agent queries `GET /api/agent-runs/:runId/messages?since=<lastCheck>&sender=user` for new user messages

#### Scenario: Agent receives user message
- **WHEN** the agent poll returns one or more user messages
- **THEN** the agent processes the messages and posts a response via `POST /api/agent-runs/:runId/messages` with `sender: "agent"`

#### Scenario: Agent checks between pipeline steps
- **WHEN** the pipeline transitions between steps (e.g., architect completes, coder starts)
- **THEN** the orchestrator checks for pending user messages and includes them as context for the next agent step

### Requirement: Agent status messages posted to chat
The orchestrator SHALL post status messages to the agent-messages table when an agent transitions between phases, so users can see lifecycle events in the chat.

#### Scenario: Agent phase transition creates status message
- **WHEN** an agent run's status changes (e.g., from "thinking" to "coding")
- **THEN** the orchestrator creates a message with `type: "status"` and `content` describing the transition (e.g., "Started coding phase")

#### Scenario: Agent failure creates error message
- **WHEN** an agent run fails
- **THEN** the orchestrator creates a message with `type: "error"` and `content` containing the error summary
