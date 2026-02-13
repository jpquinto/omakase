import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Record the start of a new agent run. Creates an entry in agent_runs
 * with status "started" and the current timestamp.
 */
export const createAgentRun = mutation({
  args: {
    agentId: v.id("agents"),
    projectId: v.id("projects"),
    featureId: v.id("features"),
    role: v.union(
      v.literal("architect"),
      v.literal("coder"),
      v.literal("reviewer"),
      v.literal("tester")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const runId = await ctx.db.insert("agent_runs", {
      agentId: args.agentId,
      projectId: args.projectId,
      featureId: args.featureId,
      role: args.role,
      status: "started",
      startedAt: now,
    });
    return runId;
  },
});

/**
 * Update the status of an in-flight agent run. Optionally appends
 * output text (e.g., streaming log lines from the agent).
 */
export const updateAgentStatus = mutation({
  args: {
    runId: v.id("agent_runs"),
    status: v.union(
      v.literal("started"),
      v.literal("thinking"),
      v.literal("coding"),
      v.literal("testing"),
      v.literal("reviewing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    output: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) {
      throw new Error(`Agent run ${args.runId} not found`);
    }

    const patch: Record<string, unknown> = { status: args.status };
    if (args.output !== undefined) {
      patch.output = args.output;
    }

    await ctx.db.patch(args.runId, patch);
  },
});

/**
 * Mark an agent run as completed or failed. Records the completion
 * timestamp, calculates duration from startedAt, and stores the
 * output summary and optional error message.
 */
export const completeAgentRun = mutation({
  args: {
    runId: v.id("agent_runs"),
    status: v.union(v.literal("completed"), v.literal("failed")),
    outputSummary: v.string(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) {
      throw new Error(`Agent run ${args.runId} not found`);
    }

    const now = Date.now();
    const durationMs = now - run.startedAt;

    await ctx.db.patch(args.runId, {
      status: args.status,
      outputSummary: args.outputSummary,
      errorMessage: args.errorMessage,
      completedAt: now,
      durationMs,
    });
  },
});

/**
 * List agent runs that are still active (not completed or failed)
 * for a given project. Uses the by_project index and filters in memory
 * since there is no single index for "not in (completed, failed)".
 */
export const listActiveAgents = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const allRuns = await ctx.db
      .query("agent_runs")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return allRuns.filter(
      (run) => run.status !== "completed" && run.status !== "failed"
    );
  },
});

/**
 * Get agent run logs filtered by agentId or featureId (at least one
 * must be provided). Results are sorted by startedAt ascending.
 */
export const getAgentLogs = query({
  args: {
    agentId: v.optional(v.id("agents")),
    featureId: v.optional(v.id("features")),
  },
  handler: async (ctx, args) => {
    if (!args.agentId && !args.featureId) {
      throw new Error("At least one of agentId or featureId must be provided");
    }

    // If agentId is provided, use the by_agent index for efficiency
    if (args.agentId) {
      const runs = await ctx.db
        .query("agent_runs")
        .withIndex("by_agent", (q) => q.eq("agentId", args.agentId!))
        .collect();

      // If both filters are provided, narrow down by featureId too
      const filtered = args.featureId
        ? runs.filter((r) => r.featureId === args.featureId)
        : runs;

      return filtered.sort((a, b) => a.startedAt - b.startedAt);
    }

    // Only featureId provided -- use the by_feature index
    const runs = await ctx.db
      .query("agent_runs")
      .withIndex("by_feature", (q) => q.eq("featureId", args.featureId!))
      .collect();

    return runs.sort((a, b) => a.startedAt - b.startedAt);
  },
});
