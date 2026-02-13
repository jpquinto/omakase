import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Bulk-create features for a project. Each feature starts as "pending"
 * with an empty dependencies array. Used by the initializer agent to
 * populate the feature board from an app spec.
 */
export const createFeaturesBulk = mutation({
  args: {
    projectId: v.id("projects"),
    features: v.array(
      v.object({
        name: v.string(),
        description: v.optional(v.string()),
        priority: v.number(),
        category: v.optional(v.string()),
        steps: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids = [];

    for (const feature of args.features) {
      const id = await ctx.db.insert("features", {
        projectId: args.projectId,
        name: feature.name,
        description: feature.description,
        priority: feature.priority,
        category: feature.category,
        steps: feature.steps,
        status: "pending",
        dependencies: [],
        createdAt: now,
        updatedAt: now,
      });
      ids.push(id);
    }

    return ids;
  },
});

/**
 * Atomically claim the next available feature for an agent.
 *
 * A feature is "ready" when it is "pending" and ALL of its dependencies
 * have status "passing". Features are claimed in priority order (lower
 * priority number = higher importance).
 *
 * Returns the claimed feature document, or null if nothing is available.
 */
export const claimFeature = mutation({
  args: {
    projectId: v.id("projects"),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    // Fetch all pending features for this project using the composite index
    const pendingFeatures = await ctx.db
      .query("features")
      .withIndex("by_project_status", (q) =>
        q.eq("projectId", args.projectId).eq("status", "pending")
      )
      .collect();

    // Sort by priority (ascending: lower number = higher priority)
    pendingFeatures.sort((a, b) => a.priority - b.priority);

    // Find the first feature whose dependencies are all "passing"
    for (const feature of pendingFeatures) {
      if (feature.dependencies.length === 0) {
        // No dependencies -- immediately claimable
        await ctx.db.patch(feature._id, {
          status: "in_progress",
          assignedAgentId: args.agentId,
          updatedAt: Date.now(),
        });
        return { ...feature, status: "in_progress" as const, assignedAgentId: args.agentId };
      }

      // Check every dependency
      let allPassing = true;
      for (const depId of feature.dependencies) {
        const dep = await ctx.db.get(depId);
        if (!dep || dep.status !== "passing") {
          allPassing = false;
          break;
        }
      }

      if (allPassing) {
        await ctx.db.patch(feature._id, {
          status: "in_progress",
          assignedAgentId: args.agentId,
          updatedAt: Date.now(),
        });
        return { ...feature, status: "in_progress" as const, assignedAgentId: args.agentId };
      }
    }

    return null;
  },
});

/**
 * Mark a feature as passing (complete). Clears the assigned agent and
 * records the completion timestamp.
 */
export const markFeaturePassing = mutation({
  args: {
    featureId: v.id("features"),
  },
  handler: async (ctx, args) => {
    const feature = await ctx.db.get(args.featureId);
    if (!feature) {
      throw new Error(`Feature ${args.featureId} not found`);
    }

    await ctx.db.patch(args.featureId, {
      status: "passing",
      completedAt: Date.now(),
      assignedAgentId: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Mark a feature as failing. Clears the assigned agent so it can be
 * retried or investigated.
 */
export const markFeatureFailing = mutation({
  args: {
    featureId: v.id("features"),
  },
  handler: async (ctx, args) => {
    const feature = await ctx.db.get(args.featureId);
    if (!feature) {
      throw new Error(`Feature ${args.featureId} not found`);
    }

    await ctx.db.patch(args.featureId, {
      status: "failing",
      assignedAgentId: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Mark a feature as in-progress and assign it to a specific agent.
 */
export const markFeatureInProgress = mutation({
  args: {
    featureId: v.id("features"),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const feature = await ctx.db.get(args.featureId);
    if (!feature) {
      throw new Error(`Feature ${args.featureId} not found`);
    }

    await ctx.db.patch(args.featureId, {
      status: "in_progress",
      assignedAgentId: args.agentId,
      updatedAt: Date.now(),
    });
  },
});

/**
 * List all features for a project, ordered by creation time (default).
 * Uses the by_project index for efficient retrieval.
 */
export const listFeatures = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("features")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

/**
 * Get features that are ready to be worked on: status is "pending" and
 * every dependency has status "passing".
 */
export const getReadyFeatures = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const pendingFeatures = await ctx.db
      .query("features")
      .withIndex("by_project_status", (q) =>
        q.eq("projectId", args.projectId).eq("status", "pending")
      )
      .collect();

    const ready = [];
    for (const feature of pendingFeatures) {
      if (feature.dependencies.length === 0) {
        ready.push(feature);
        continue;
      }

      let allPassing = true;
      for (const depId of feature.dependencies) {
        const dep = await ctx.db.get(depId);
        if (!dep || dep.status !== "passing") {
          allPassing = false;
          break;
        }
      }
      if (allPassing) {
        ready.push(feature);
      }
    }

    return ready;
  },
});

/**
 * Get features that are blocked: status is "pending" but at least one
 * dependency does NOT have status "passing".
 */
export const getBlockedFeatures = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const pendingFeatures = await ctx.db
      .query("features")
      .withIndex("by_project_status", (q) =>
        q.eq("projectId", args.projectId).eq("status", "pending")
      )
      .collect();

    const blocked = [];
    for (const feature of pendingFeatures) {
      // A feature with no dependencies is never blocked
      if (feature.dependencies.length === 0) {
        continue;
      }

      let hasBlocker = false;
      for (const depId of feature.dependencies) {
        const dep = await ctx.db.get(depId);
        if (!dep || dep.status !== "passing") {
          hasBlocker = true;
          break;
        }
      }
      if (hasBlocker) {
        blocked.push(feature);
      }
    }

    return blocked;
  },
});

/**
 * Get aggregate feature statistics for a project dashboard.
 * Returns counts broken down by status.
 */
export const getFeatureStats = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const features = await ctx.db
      .query("features")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const stats = {
      total: features.length,
      pending: 0,
      inProgress: 0,
      passing: 0,
      failing: 0,
    };

    for (const feature of features) {
      switch (feature.status) {
        case "pending":
          stats.pending++;
          break;
        case "in_progress":
          stats.inProgress++;
          break;
        case "passing":
          stats.passing++;
          break;
        case "failing":
          stats.failing++;
          break;
      }
    }

    return stats;
  },
});
