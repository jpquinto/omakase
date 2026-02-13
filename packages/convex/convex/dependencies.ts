import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Add a dependency edge: featureId depends on dependsOnId.
 *
 * Before adding, performs a BFS reachability check to ensure that
 * dependsOnId does not already (transitively) depend on featureId,
 * which would create a cycle.
 *
 * Also prevents duplicate dependencies and self-references.
 */
export const addDependency = mutation({
  args: {
    featureId: v.id("features"),
    dependsOnId: v.id("features"),
  },
  handler: async (ctx, args) => {
    if (args.featureId === args.dependsOnId) {
      throw new Error("A feature cannot depend on itself");
    }

    const feature = await ctx.db.get(args.featureId);
    if (!feature) {
      throw new Error(`Feature ${args.featureId} not found`);
    }

    const dependsOn = await ctx.db.get(args.dependsOnId);
    if (!dependsOn) {
      throw new Error(`Dependency feature ${args.dependsOnId} not found`);
    }

    // Skip if this dependency already exists
    if (feature.dependencies.includes(args.dependsOnId)) {
      return;
    }

    // Cycle detection via BFS: starting from dependsOnId, traverse its
    // dependency chain. If we reach featureId, adding this edge would
    // create a cycle.
    const visited = new Set<string>();
    const queue: Id<"features">[] = [args.dependsOnId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (currentId === args.featureId) {
        throw new Error(
          `Adding this dependency would create a cycle: ` +
          `${args.featureId} -> ${args.dependsOnId} -> ... -> ${args.featureId}`
        );
      }

      if (visited.has(currentId)) {
        continue;
      }
      visited.add(currentId);

      const current = await ctx.db.get(currentId);
      if (current) {
        for (const depId of current.dependencies) {
          if (!visited.has(depId)) {
            queue.push(depId);
          }
        }
      }
    }

    // Safe to add -- no cycle detected
    await ctx.db.patch(args.featureId, {
      dependencies: [...feature.dependencies, args.dependsOnId],
      updatedAt: Date.now(),
    });
  },
});

/**
 * Remove a dependency edge: featureId no longer depends on dependsOnId.
 * Silently succeeds if the dependency does not exist.
 */
export const removeDependency = mutation({
  args: {
    featureId: v.id("features"),
    dependsOnId: v.id("features"),
  },
  handler: async (ctx, args) => {
    const feature = await ctx.db.get(args.featureId);
    if (!feature) {
      throw new Error(`Feature ${args.featureId} not found`);
    }

    const updatedDeps = feature.dependencies.filter(
      (depId) => depId !== args.dependsOnId
    );

    // Only patch if there was actually a change
    if (updatedDeps.length !== feature.dependencies.length) {
      await ctx.db.patch(args.featureId, {
        dependencies: updatedDeps,
        updatedAt: Date.now(),
      });
    }
  },
});
