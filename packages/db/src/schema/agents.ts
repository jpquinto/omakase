import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";

/**
 * Agent role values. Matches the Convex schema union type.
 */
export type AgentRole = "architect" | "coder" | "reviewer" | "tester";

/**
 * Agent operational status values. Matches the Convex schema union type.
 */
export type AgentStatus = "idle" | "running" | "stopped" | "failed";

/**
 * Agents table — autonomous coding agents assigned to a project.
 *
 * Maps from the Convex `agents` table. The `currentFeatureId` is stored
 * as a plain UUID text reference rather than a foreign key to avoid
 * circular dependency issues with the features table (which references
 * agents via `assignedAgentId`).
 */
export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  name: text("name").notNull(),
  role: text("role").$type<AgentRole>().notNull(),
  mascot: text("mascot"),
  status: text("status").$type<AgentStatus>().notNull().default("idle"),
  ecsTaskArn: text("ecs_task_arn"),
  /**
   * UUID of the feature currently being worked on.
   * Stored as text to break the circular FK between agents and features.
   */
  currentFeatureId: uuid("current_feature_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
