## ADDED Requirements

### Requirement: Agent personality persistence
The system SHALL store agent personality configurations in a DynamoDB `agent-personalities` table with `agentName` as partition key. Each personality item SHALL include `agentName` (string), `displayName` (string), `persona` (string — the personality prompt injected into CLAUDE.md), `traits` (string array — adjective descriptors), `communicationStyle` (string — description of how the agent communicates), and `updatedAt` (ISO 8601 timestamp).

#### Scenario: Personality created for an agent
- **WHEN** a user sends `PUT /api/agents/:agentName/personality` with personality fields
- **THEN** the personality is stored in the `agent-personalities` table, creating or replacing any existing personality for that agent

#### Scenario: Retrieve personality for an agent
- **WHEN** the system fetches personality via `GET /api/agents/:agentName/personality`
- **THEN** the personality configuration for that agent is returned, or a 404 if none exists

### Requirement: Personality injection before agent run
The system SHALL fetch the agent's personality from DynamoDB and prepend it as a `# Personality` section to the CLAUDE.md written to the agent workspace, before the role-specific instructions.

#### Scenario: Agent with personality configured
- **WHEN** an agent step is about to launch and the agent has a personality configured with persona "You are Miso, a meticulous architect who speaks in precise, measured prose..."
- **THEN** the entrypoint prepends a `# Personality` section containing the persona text to the workspace CLAUDE.md, above the role instructions

#### Scenario: Agent without personality configured
- **WHEN** an agent step is about to launch and no personality is configured for the agent
- **THEN** the CLAUDE.md contains only the role instructions with no personality preamble

### Requirement: Default personality seeding
The system SHALL provide a mechanism to seed default personalities for the four standard agents (Miso, Nori, Koji, Toro) if no personality exists when first referenced.

#### Scenario: Default personality for Miso (architect)
- **WHEN** the entrypoint fetches Miso's personality and none exists
- **THEN** a default personality is used with display name "Miso", traits like "meticulous", "thorough", "cautious", and a persona prompt establishing Miso as a careful architect who documents everything

#### Scenario: Default personality for Nori (coder)
- **WHEN** the entrypoint fetches Nori's personality and none exists
- **THEN** a default personality is used with display name "Nori", traits like "pragmatic", "efficient", "pattern-aware", and a persona prompt establishing Nori as a focused implementer who respects existing conventions

#### Scenario: Default personality for Koji (reviewer)
- **WHEN** the entrypoint fetches Koji's personality and none exists
- **THEN** a default personality is used with display name "Koji", traits like "discerning", "constructive", "security-minded", and a persona prompt establishing Koji as a quality-focused reviewer who gives actionable feedback

#### Scenario: Default personality for Toro (tester)
- **WHEN** the entrypoint fetches Toro's personality and none exists
- **THEN** a default personality is used with display name "Toro", traits like "thorough", "systematic", "edge-case-aware", and a persona prompt establishing Toro as a relentless tester who covers all scenarios

### Requirement: Personality CRUD API endpoints
The system SHALL expose REST endpoints on the orchestrator for managing agent personalities.

#### Scenario: Get personality
- **WHEN** a client sends `GET /api/agents/:agentName/personality`
- **THEN** the orchestrator returns the personality configuration, or 404 if none exists

#### Scenario: Set personality
- **WHEN** a client sends `PUT /api/agents/:agentName/personality` with `{ displayName, persona, traits, communicationStyle }`
- **THEN** the orchestrator creates or replaces the personality and returns it with a 200 status

#### Scenario: Delete personality
- **WHEN** a client sends `DELETE /api/agents/:agentName/personality`
- **THEN** the orchestrator deletes the personality and returns a 204 status, causing the agent to fall back to defaults
