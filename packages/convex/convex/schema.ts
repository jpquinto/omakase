import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    auth0Id: v.string(),
    email: v.string(),
    name: v.string(),
    picture: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("developer"), v.literal("viewer")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth0Id", ["auth0Id"])
    .index("by_email", ["email"]),

  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    members: v.array(v.id("users")),
    repoUrl: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived")),
    linearTeamId: v.optional(v.string()),
    linearAccessToken: v.optional(v.string()),
    maxConcurrency: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  features: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    priority: v.number(),
    category: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("passing"),
      v.literal("failing"),
    ),
    steps: v.optional(v.string()),
    dependencies: v.array(v.id("features")),
    assignedAgentId: v.optional(v.id("agents")),
    linearIssueId: v.optional(v.string()),
    linearIssueUrl: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_status", ["projectId", "status"])
    .index("by_linearIssueId", ["linearIssueId"]),

  agents: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    role: v.union(
      v.literal("architect"),
      v.literal("coder"),
      v.literal("reviewer"),
      v.literal("tester"),
    ),
    mascot: v.optional(v.string()),
    status: v.union(
      v.literal("idle"),
      v.literal("running"),
      v.literal("stopped"),
      v.literal("failed"),
    ),
    ecsTaskArn: v.optional(v.string()),
    currentFeatureId: v.optional(v.id("features")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_status", ["projectId", "status"]),

  agent_runs: defineTable({
    agentId: v.id("agents"),
    projectId: v.id("projects"),
    featureId: v.id("features"),
    role: v.union(
      v.literal("architect"),
      v.literal("coder"),
      v.literal("reviewer"),
      v.literal("tester"),
    ),
    status: v.union(
      v.literal("started"),
      v.literal("thinking"),
      v.literal("coding"),
      v.literal("testing"),
      v.literal("reviewing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    output: v.optional(v.string()),
    outputSummary: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
  })
    .index("by_agent", ["agentId"])
    .index("by_project", ["projectId"])
    .index("by_feature", ["featureId"])
    .index("by_project_status", ["projectId", "status"]),

  tickets: defineTable({
    projectId: v.id("projects"),
    featureId: v.optional(v.id("features")),
    linearIssueId: v.string(),
    linearIssueUrl: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.number(),
    status: v.string(),
    labels: v.array(v.string()),
    syncedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_linearIssueId", ["linearIssueId"]),
});
