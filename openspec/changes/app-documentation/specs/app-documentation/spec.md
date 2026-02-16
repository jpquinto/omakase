## ADDED Requirements

### Requirement: Settings page tab navigation
The settings page supports multiple tabs. "General" shows the existing orchestrator health card. "Documentation" shows the docs section.

#### Scenario: User visits settings page
- **WHEN** user navigates to `/settings`
- **THEN** the "General" tab is active by default, showing orchestrator health

#### Scenario: User switches to Documentation tab
- **WHEN** user clicks the "Documentation" tab
- **THEN** the documentation content replaces the general settings content

### Requirement: Documentation sidebar navigation
The documentation section has a left sidebar listing all documentation sections with anchor links.

#### Scenario: User views documentation
- **WHEN** the Documentation tab is active
- **THEN** a sidebar lists all sections: Architecture Overview, Agent Pipeline, Work Sessions, Linear Integration, Real-Time Streaming, Style System, Infrastructure, API Overview

#### Scenario: User clicks a sidebar section
- **WHEN** user clicks a section name in the sidebar
- **THEN** the page scrolls to that section's content

### Requirement: Documentation content sections
Each section covers a major system area with high-level descriptions and pseudocode.

#### Scenario: Architecture Overview section
- **WHEN** user views the Architecture Overview section
- **THEN** it shows the monorepo structure, key services (frontend, orchestrator, DynamoDB), and how they connect

#### Scenario: Agent Pipeline section
- **WHEN** user views the Agent Pipeline section
- **THEN** it describes the 4-step flow (architect → coder → reviewer → tester), retry logic, review cycles, and success/failure paths using pseudocode

#### Scenario: Work Sessions section
- **WHEN** user views the Work Sessions section
- **THEN** it describes how Claude Code CLI subprocesses are spawned, message routing, session lifecycle, and inactivity timeouts

#### Scenario: Linear Integration section
- **WHEN** user views the Linear Integration section
- **THEN** it describes the OAuth flow, bidirectional sync, webhook handling, and status mapping

#### Scenario: Real-Time Streaming section
- **WHEN** user views the Real-Time Streaming section
- **THEN** it describes the SSE architecture: message POST → stream-bus → EventSource, including event types and buffer replay

#### Scenario: Style System section
- **WHEN** user views the Style System section
- **THEN** it lists the Liquid Glass design tokens: typography, colors (with swatches), agent colors, glass surfaces, border radii, shadows, and animation classes

#### Scenario: Infrastructure section
- **WHEN** user views the Infrastructure section
- **THEN** it describes the AWS resources (EC2, DynamoDB, VPC, Elastic IP), deployment flow, and environment configuration

#### Scenario: API Overview section
- **WHEN** user views the API Overview section
- **THEN** it lists the major API endpoint groups (projects, features, agents, work sessions, Linear) with brief descriptions of each group's purpose

### Requirement: Documentation uses pseudocode
Workflow descriptions use pseudocode blocks, not actual source code. This keeps documentation stable across refactors.

#### Scenario: Pipeline flow description
- **WHEN** displaying the agent pipeline workflow
- **THEN** the flow is shown as pseudocode (e.g., `for each step in [architect, coder, reviewer, tester]: launch(step)`) rather than TypeScript
