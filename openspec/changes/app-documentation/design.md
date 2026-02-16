## Context

The settings page currently has a single section (orchestrator health). We need to add comprehensive documentation covering the entire platform — architecture, agent pipeline, work sessions, Linear integration, streaming, style system, and more. Documentation should be high-level with pseudocode, not raw source code.

## Goals / Non-Goals

**Goals:**
- Add a "Documentation" tab to the settings page alongside the existing "General" (orchestrator health) section
- Create ~8 documentation pages covering all major systems
- Use the Liquid Glass design system for documentation rendering
- Make documentation navigable with a sidebar table-of-contents
- Write in a high-level, conceptual style with pseudocode for flows

**Non-Goals:**
- No auto-generated API reference from code
- No versioning or changelog in the docs section
- No external documentation site (everything in-app)
- No backend changes

## Decisions

### 1. Settings page gets tab navigation
Add a top-level tab bar to the settings page: "General" (existing health card) and "Documentation". This keeps settings and docs co-located without cluttering the sidebar nav.

### 2. Documentation as static content components
Each doc page is a React component with hardcoded content (not fetched from an API or markdown files at runtime). This keeps things simple — no CMS, no MDX tooling, no build step. Content lives in a `docs/` directory under the settings route.

### 3. Documentation sidebar for section navigation
Within the Documentation tab, render a left sidebar listing all doc sections (Architecture, Agent Pipeline, Work Sessions, etc.). Clicking a section scrolls to or navigates to that content. Single-page scroll layout with anchor links.

### 4. Pseudocode style for flows
All workflow descriptions use pseudocode blocks styled with the `font-mono` class, not actual TypeScript/JavaScript. This keeps docs stable across refactors and focuses on concepts.

## Risks / Trade-offs

- **Maintenance burden** — Documentation will drift from code over time. Mitigation: keep descriptions high-level so they survive minor refactors.
- **Large single page** — All docs on one scrollable page could be long. Mitigation: sidebar with anchor links provides quick navigation; sections are collapsible if needed later.
- **Static content** — Hardcoded React components means updating docs requires a code change. Acceptable for now given the team size.
