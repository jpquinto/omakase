/**
 * @omakase/db — Drizzle ORM schema definitions for PostgreSQL.
 *
 * This package mirrors the Convex document schema into relational tables,
 * enabling analytical queries, reporting, and data export via PostgreSQL.
 *
 * Usage:
 *   import { users, projects, features, agents, agentRuns, tickets } from "@omakase/db";
 *   import type { Project, NewProject } from "@omakase/db";
 */

// Re-export all table definitions and enum types from the schema barrel
export {
  users,
  projects,
  features,
  agents,
  agentRuns,
  tickets,
} from "./schema/index.js";

export type {
  UserRole,
  ProjectStatus,
  FeatureStatus,
  AgentRole,
  AgentStatus,
  AgentRunRole,
  AgentRunStatus,
} from "./schema/index.js";

// ---------------------------------------------------------------------------
// Inferred select types (represent a row read from the database)
// ---------------------------------------------------------------------------

import type { users } from "./schema/users.js";
import type { projects } from "./schema/projects.js";
import type { features } from "./schema/features.js";
import type { agents } from "./schema/agents.js";
import type { agentRuns } from "./schema/agent-runs.js";
import type { tickets } from "./schema/tickets.js";

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Feature = typeof features.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type AgentRun = typeof agentRuns.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;

// ---------------------------------------------------------------------------
// Inferred insert types (represent the shape needed to insert a new row)
// ---------------------------------------------------------------------------

export type NewUser = typeof users.$inferInsert;
export type NewProject = typeof projects.$inferInsert;
export type NewFeature = typeof features.$inferInsert;
export type NewAgent = typeof agents.$inferInsert;
export type NewAgentRun = typeof agentRuns.$inferInsert;
export type NewTicket = typeof tickets.$inferInsert;
