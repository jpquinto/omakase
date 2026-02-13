import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Create a new project with the given name, description, and owner.
 * Initializes with "active" status, empty members array, and default concurrency of 3.
 */
export const createProject = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      ownerId: args.ownerId,
      members: [],
      status: "active",
      maxConcurrency: 3,
      createdAt: now,
      updatedAt: now,
    });
    return projectId;
  },
});

/**
 * Update an existing project with partial fields.
 * Only the provided fields are overwritten; updatedAt is always refreshed.
 */
export const updateProject = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    members: v.optional(v.array(v.id("users"))),
    repoUrl: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    linearTeamId: v.optional(v.string()),
    linearAccessToken: v.optional(v.string()),
    maxConcurrency: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { projectId, ...fields } = args;

    const existing = await ctx.db.get(projectId);
    if (!existing) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Build the patch object containing only the fields that were provided
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    await ctx.db.patch(projectId, patch);
  },
});

/**
 * Permanently delete a project by its ID.
 */
export const deleteProject = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.projectId);
    if (!existing) {
      throw new Error(`Project ${args.projectId} not found`);
    }
    await ctx.db.delete(args.projectId);
  },
});

/**
 * List all projects where the given user is the owner or a member.
 * Uses the by_owner index for owned projects, then supplements with
 * membership-based projects to avoid a full table scan.
 */
export const listProjects = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Fetch projects owned by this user via the by_owner index
    const ownedProjects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();

    // Fetch all projects to find ones where the user is a member.
    // Convex does not support indexing into array elements, so we
    // must filter in-memory for the membership check.
    const allProjects = await ctx.db.query("projects").collect();
    const memberProjects = allProjects.filter(
      (p) =>
        p.ownerId !== args.userId && p.members.includes(args.userId)
    );

    return [...ownedProjects, ...memberProjects];
  },
});

/**
 * Get a single project by its ID. Returns null if not found.
 */
export const getProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});
