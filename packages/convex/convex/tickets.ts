import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Upsert a ticket synced from Linear. If a ticket with the given
 * linearIssueId already exists, it is updated in place. Otherwise
 * a new ticket document is created. The syncedAt timestamp is always
 * refreshed to track when the last sync occurred.
 */
export const syncTicket = mutation({
  args: {
    projectId: v.id("projects"),
    linearIssueId: v.string(),
    linearIssueUrl: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.number(),
    status: v.string(),
    labels: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Look up existing ticket by the unique Linear issue ID
    const existing = await ctx.db
      .query("tickets")
      .withIndex("by_linearIssueId", (q) =>
        q.eq("linearIssueId", args.linearIssueId)
      )
      .unique();

    if (existing) {
      // Update the existing ticket with fresh data from Linear
      await ctx.db.patch(existing._id, {
        projectId: args.projectId,
        linearIssueUrl: args.linearIssueUrl,
        title: args.title,
        description: args.description,
        priority: args.priority,
        status: args.status,
        labels: args.labels,
        syncedAt: now,
      });
      return existing._id;
    }

    // Create a new ticket
    const ticketId = await ctx.db.insert("tickets", {
      projectId: args.projectId,
      linearIssueId: args.linearIssueId,
      linearIssueUrl: args.linearIssueUrl,
      title: args.title,
      description: args.description,
      priority: args.priority,
      status: args.status,
      labels: args.labels,
      syncedAt: now,
    });
    return ticketId;
  },
});

/**
 * Update the status of an existing ticket (e.g., when the agent
 * completes work and the Linear issue should be moved to "Done").
 */
export const updateTicketStatus = mutation({
  args: {
    ticketId: v.id("tickets"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${args.ticketId} not found`);
    }

    await ctx.db.patch(args.ticketId, {
      status: args.status,
      syncedAt: Date.now(),
    });
  },
});
