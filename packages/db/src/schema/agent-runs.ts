import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { projects } from "./projects.js";
import { features } from "./features.js";

/**
 * Agent run role values. Matches the Convex schema union type.
 * Identical to AgentRole but kept separate for clarity since the run
 * captures the role at the time of execution.
 */
export type AgentRunRole = "architect" | "coder" | "reviewer" | "tester";

/**
 * Agent run status values. Matches the Convex schema union type.
 * Represents the lifecycle stages of a single agent run.
 */
export type AgentRunStatus =
  | "started"
  | "thinking"
  | "coding"
  | "testing"
  | "reviewing"
  | "completed"
  | "failed";

/**
 * Agent runs table — individual execution records for agent work.
 *
 * Maps from the Convex `agent_runs` table. Each row captures a single
 * invocation of an agent against a feature, including timing data,
 * output logs, and error information.
 */
export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  featureId: uuid("feature_id")
    .notNull()
    .references(() => features.id),
  role: text("role").$type<AgentRunRole>().notNull(),
  status: text("status").$type<AgentRunStatus>().notNull().default("started"),
  output: text("output"),
  outputSummary: text("output_summary"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
});
