import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Project status values. Matches the Convex schema union type.
 */
export type ProjectStatus = "active" | "archived";

/**
 * Projects table — top-level container for features, agents, and tickets.
 *
 * Maps from the Convex `projects` table. The `members` column uses `jsonb`
 * to store an array of user IDs, mirroring the Convex `v.array(v.id("users"))`.
 * The `ownerId` column references the `users` table for referential integrity.
 */
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  /** Array of user UUIDs who are members of this project. */
  members: jsonb("members").$type<string[]>().notNull().default([]),
  repoUrl: text("repo_url"),
  status: text("status").$type<ProjectStatus>().notNull().default("active"),
  linearTeamId: text("linear_team_id"),
  linearAccessToken: text("linear_access_token"),
  maxConcurrency: integer("max_concurrency").notNull().default(3),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
