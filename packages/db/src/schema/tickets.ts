import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { features } from "./features.js";

/**
 * Tickets table — Linear issue tracking integration.
 *
 * Maps from the Convex `tickets` table. Each ticket represents a
 * synced Linear issue, optionally linked to a feature. The `labels`
 * column stores an array of label strings as `jsonb`.
 */
export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  featureId: uuid("feature_id").references(() => features.id),
  linearIssueId: text("linear_issue_id").notNull().unique(),
  linearIssueUrl: text("linear_issue_url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: integer("priority").notNull(),
  status: text("status").notNull(),
  /** Array of label strings associated with the Linear issue. */
  labels: jsonb("labels").$type<string[]>().notNull().default([]),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});
