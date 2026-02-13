import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { agents } from "./agents.js";

/**
 * Feature status values. Matches the Convex schema union type.
 */
export type FeatureStatus = "pending" | "in_progress" | "passing" | "failing";

/**
 * Features table — individual work items within a project.
 *
 * Maps from the Convex `features` table. The `dependencies` column stores
 * an array of feature UUIDs as `jsonb`, mirroring the Convex
 * `v.array(v.id("features"))`. This avoids a separate join table while
 * keeping the relational model close to the Convex document model.
 */
export const features = pgTable("features", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  name: text("name").notNull(),
  description: text("description"),
  priority: integer("priority").notNull(),
  category: text("category"),
  status: text("status").$type<FeatureStatus>().notNull().default("pending"),
  steps: text("steps"),
  /** Array of feature UUIDs that must be completed before this feature. */
  dependencies: jsonb("dependencies").$type<string[]>().notNull().default([]),
  assignedAgentId: uuid("assigned_agent_id").references(() => agents.id),
  linearIssueId: text("linear_issue_id"),
  linearIssueUrl: text("linear_issue_url"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
