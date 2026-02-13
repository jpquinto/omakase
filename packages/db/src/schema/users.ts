import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * User roles within the system. Matches the Convex schema union type.
 */
export type UserRole = "admin" | "developer" | "viewer";

/**
 * Users table — stores authenticated user profiles.
 *
 * Maps from the Convex `users` table. The `auth0Id` and `email` fields
 * each have a unique index to support fast lookups during authentication
 * and invitation flows.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  auth0Id: text("auth0_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  picture: text("picture"),
  role: text("role").$type<UserRole>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
