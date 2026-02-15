/**
 * index.ts -- Entry point for the Omakase orchestrator service.
 *
 * Uses Elysia (Bun-native web framework) for the HTTP server with typed
 * routes and request logging middleware. Initializes the ECS client and
 * starts the feature watcher polling loop. Exposes REST API endpoints
 * for frontend data access via DynamoDB.
 *
 * Environment variables:
 *   PORT                    - HTTP server port (default: 8080)
 *   EXECUTION_MODE          - "ecs" for Fargate tasks, "local" for subprocesses (default: "ecs")
 *   AWS_REGION              - AWS region (default: "us-east-1")
 *   LOCAL_WORKSPACE_ROOT    - Root dir for local agent workspaces (default: "/tmp/omakase-agents")
 *   DYNAMODB_TABLE_PREFIX   - DynamoDB table name prefix (default: "omakase-")
 *   GITHUB_TOKEN            - GitHub PAT for PR creation (optional)
 *   POLL_INTERVAL_MS        - Feature watcher poll interval in ms (default: 30000)
 *
 * ECS-only (when EXECUTION_MODE=ecs):
 *   ECS_CLUSTER             - ECS cluster name or ARN
 *   ECS_TASK_DEFINITION     - ECS task definition family or ARN
 *   ECS_SUBNETS             - Comma-separated VPC subnet IDs
 *   ECS_SECURITY_GROUP      - Security group ID for Fargate tasks
 *   ECS_CONTAINER_NAME      - Container name in the task definition (default: "agent")
 */

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { ECSClient } from "@aws-sdk/client-ecs";
import { join, resolve } from "path";
import { readdir, stat, readFile } from "fs/promises";
import {
  createProject,
  listProjects,
  listActiveProjects,
  getProject,
  listFeatures,
  getFeatureStats,
  listActiveAgents,
  getAgentLogs,
  getAgentRun,
  getFeature,
  createFromLinear,
  createFeature,
  createFeaturesBulk,
  getByLinearIssueId,
  updateFromLinear,
  bulkSyncFromLinear,
  updateFeature,
  deleteFeature,
  getByLinearTeamId,
  updateProject,
  markFeatureInProgress,
  clearGitHubConnection,
  clearGitHubInstallation,
  transitionReviewReadyToPassing,
  addDependency,
  removeDependency,
  createMessage,
  listMessages,
  listMessagesByThread,
  createThread,
  getThread,
  listThreadsByAgent,
  updateThread,
  createMemory,
  listMemories,
  deleteMemory,
  deleteMemoriesByAgentProject,
  getPersonality,
  putPersonality,
  deletePersonality,
  listRunsByAgentName,
  getAgentStatsByName,
  getAgentActivityByName,
  getDefaultPersonality,
} from "@omakase/dynamodb";
import type { AgentMessageSender, AgentMessageType, AgentRunRole, AgentThreadMode, AgentThreadStatus, QuizMetadata } from "@omakase/db";

import { FeatureWatcher, type FeatureWatcherConfig } from "./feature-watcher.js";
import { AgentPipeline, type EcsConfig, type ExecutionMode } from "./pipeline.js";
import { fetchAllTeamIssues } from "@omakase/shared";
import { generateAgentResponse } from "./agent-responder.js";
import { handleQuizMessage } from "./quiz-handler.js";
import { subscribe } from "./stream-bus.js";
import { WorkSessionManager } from "./work-session-manager.js";
import {
  isGitHubAppConfigured,
  getInstallationToken,
  listInstallationRepos,
} from "./github-app.js";
import { createPullRequest, buildPrBody } from "./pr-creator.js";

// ---------------------------------------------------------------------------
// Environment configuration
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        "Set it before starting the orchestrator.",
    );
  }
  return value;
}

const PORT = parseInt(process.env["PORT"] ?? "8080", 10);
const EXECUTION_MODE = (process.env["EXECUTION_MODE"] ?? "ecs") as ExecutionMode;
const AWS_REGION = process.env["AWS_REGION"] ?? "us-east-1";
const GITHUB_TOKEN = process.env["GITHUB_TOKEN"];
const POLL_INTERVAL_MS = parseInt(process.env["POLL_INTERVAL_MS"] ?? "30000", 10);
const LOCAL_WORKSPACE_ROOT = process.env["LOCAL_WORKSPACE_ROOT"] ?? "/tmp/omakase-agents";

// ECS configuration -- only required when running in ECS mode
const ECS_CLUSTER = EXECUTION_MODE === "ecs" ? requireEnv("ECS_CLUSTER") : "";
const ECS_TASK_DEFINITION = EXECUTION_MODE === "ecs" ? requireEnv("ECS_TASK_DEFINITION") : "";
const ECS_SUBNETS = EXECUTION_MODE === "ecs"
  ? requireEnv("ECS_SUBNETS").split(",").map((s) => s.trim())
  : [];
const ECS_SECURITY_GROUP = EXECUTION_MODE === "ecs" ? requireEnv("ECS_SECURITY_GROUP") : "";
const ECS_CONTAINER_NAME = process.env["ECS_CONTAINER_NAME"] ?? "agent";

// ---------------------------------------------------------------------------
// Client initialization
// ---------------------------------------------------------------------------

const ecsClient = new ECSClient({ region: AWS_REGION });

const ecsConfig: EcsConfig = {
  cluster: ECS_CLUSTER,
  taskDefinition: ECS_TASK_DEFINITION,
  subnets: ECS_SUBNETS,
  securityGroup: ECS_SECURITY_GROUP,
  containerName: ECS_CONTAINER_NAME,
};

const watcherConfig: FeatureWatcherConfig = {
  pollIntervalMs: POLL_INTERVAL_MS,
  ecsConfig,
  githubToken: GITHUB_TOKEN,
  executionMode: EXECUTION_MODE,
  localWorkspaceRoot: EXECUTION_MODE === "local" ? LOCAL_WORKSPACE_ROOT : undefined,
};

const watcher = new FeatureWatcher(ecsClient, watcherConfig);
const workSessionManager = new WorkSessionManager(LOCAL_WORKSPACE_ROOT);

// ---------------------------------------------------------------------------
// Elysia HTTP server
// ---------------------------------------------------------------------------

const app = new Elysia()
  .use(cors({ origin: true }))
  // Request logging middleware
  .onBeforeHandle(({ request, store }) => {
    (store as Record<string, number>).startTime = performance.now();
  })
  .onAfterHandle(({ request, store, set }) => {
    const duration = (performance.now() - (store as Record<string, number>).startTime).toFixed(1);
    const url = new URL(request.url);
    console.log(
      `[orchestrator] ${request.method} ${url.pathname} ${set.status ?? 200} ${duration}ms`,
    );
  })
  // Health check endpoint
  .get("/health", () => ({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }))
  // REST API endpoints for frontend data access
  .get("/api/projects", async ({ query }) => {
    const userId = query.userId;
    if (!userId) return { error: "userId query parameter required" };
    return await listProjects({ userId });
  })
  .post("/api/projects", async ({ body, set }) => {
    const { name, description, ownerId } = body as {
      name: string;
      description?: string;
      ownerId: string;
    };
    if (!name || !ownerId) {
      set.status = 400;
      return { error: "name and ownerId are required" };
    }
    return await createProject({ name, description, ownerId });
  })
  .get("/api/projects/:projectId", async ({ params }) => {
    const project = await getProject({ projectId: params.projectId });
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });
    }
    return project;
  })
  .patch("/api/projects/:projectId", async ({ params, body }) => {
    const { name, description } = body as { name?: string; description?: string };
    await updateProject({ projectId: params.projectId, name, description });
    return { success: true };
  })
  .get("/api/projects/:projectId/features", async ({ params }) => {
    return await listFeatures({ projectId: params.projectId });
  })
  .get("/api/projects/:projectId/features/stats", async ({ params }) => {
    return await getFeatureStats({ projectId: params.projectId });
  })
  .get("/api/projects/:projectId/agents/active", async ({ params }) => {
    return await listActiveAgents({ projectId: params.projectId });
  })
  .get("/api/projects/:projectId/agents/logs", async ({ params, query }) => {
    const featureId = query.featureId;
    const agentId = query.agentId;
    if (!featureId && !agentId) return { error: "featureId or agentId query parameter required" };
    return await getAgentLogs({ featureId, agentId });
  })
  // Linear integration endpoints
  .post("/api/features/from-linear", async ({ body }) => {
    const { projectId, name, description, priority, category, linearIssueId, linearIssueUrl, linearStateName, linearLabels, linearAssigneeName } = body as {
      projectId: string;
      name: string;
      description?: string;
      priority: number;
      category?: string;
      linearIssueId: string;
      linearIssueUrl: string;
      linearStateName?: string;
      linearLabels?: string[];
      linearAssigneeName?: string;
    };
    return await createFromLinear({ projectId, name, description, priority, category, linearIssueId, linearIssueUrl, linearStateName, linearLabels, linearAssigneeName });
  })
  .get("/api/features/by-linear-issue/:linearIssueId", async ({ params }) => {
    const feature = await getByLinearIssueId({ linearIssueId: params.linearIssueId });
    if (!feature) {
      return new Response(JSON.stringify({ error: "Feature not found" }), { status: 404 });
    }
    return feature;
  })
  .patch("/api/features/:featureId/from-linear", async ({ params, body }) => {
    const { name, description, priority, linearStateName, linearLabels, linearAssigneeName } = body as {
      name: string;
      description?: string;
      priority: number;
      linearStateName?: string;
      linearLabels?: string[];
      linearAssigneeName?: string;
    };
    await updateFromLinear({ featureId: params.featureId, name, description, priority, linearStateName, linearLabels, linearAssigneeName });
    return { success: true };
  })
  .post("/api/projects/:projectId/linear-token", async ({ params, body }) => {
    const { linearAccessToken, linearTeamId } = body as {
      linearAccessToken: string;
      linearTeamId: string;
    };
    await updateProject({ projectId: params.projectId, linearAccessToken, linearTeamId });
    return { success: true };
  })
  .patch("/api/projects/:projectId/linear/project", async ({ params, body }) => {
    const { linearProjectId, linearProjectName } = body as {
      linearProjectId: string;
      linearProjectName: string;
    };
    await updateProject({ projectId: params.projectId, linearProjectId, linearProjectName });
    return { success: true };
  })
  .get("/api/projects/by-linear-team/:teamId", async ({ params }) => {
    const project = await getByLinearTeamId({ linearTeamId: params.teamId });
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });
    }
    return project;
  })
  // Feature CRUD endpoints (bulk before single to avoid route matching conflicts)
  .post("/api/projects/:projectId/features/bulk", async ({ params, body, set }) => {
    const { features } = body as {
      features: Array<{
        name: string;
        description?: string;
        priority: number;
        category?: string;
        linearIssueId?: string;
        linearIssueUrl?: string;
      }>;
    };
    if (!features || features.length === 0) {
      set.status = 400;
      return { error: "features array is required and must not be empty" };
    }
    // Check for duplicates by linearIssueId and separate linear vs plain features
    const skipped: string[] = [];
    const linearFeatures: typeof features = [];
    const plainFeatures: typeof features = [];
    for (const f of features) {
      if (f.linearIssueId) {
        const existing = await getByLinearIssueId({ linearIssueId: f.linearIssueId });
        if (existing) {
          skipped.push(f.linearIssueId);
          continue;
        }
        linearFeatures.push(f);
      } else {
        plainFeatures.push(f);
      }
    }
    const created = [];
    // Create features with Linear fields individually (uses createFromLinear which sets linear fields)
    for (const f of linearFeatures) {
      const feature = await createFromLinear({
        projectId: params.projectId,
        name: f.name,
        description: f.description,
        priority: f.priority,
        category: f.category,
        linearIssueId: f.linearIssueId!,
        linearIssueUrl: f.linearIssueUrl ?? "",
      });
      created.push(feature);
    }
    // Create plain features in bulk
    if (plainFeatures.length > 0) {
      const bulk = await createFeaturesBulk({
        projectId: params.projectId,
        features: plainFeatures.map((f) => ({
          name: f.name,
          description: f.description,
          priority: f.priority,
          category: f.category,
        })),
      });
      created.push(...bulk);
    }
    set.status = 201;
    return { created, skipped };
  })
  .post("/api/projects/:projectId/features", async ({ params, body, set }) => {
    const { name, description, priority, category } = body as {
      name: string;
      description?: string;
      priority?: number;
      category?: string;
    };
    if (!name) {
      set.status = 400;
      return { error: "name is required" };
    }
    const feature = await createFeature({
      projectId: params.projectId,
      name,
      description,
      priority,
      category,
    });
    set.status = 201;
    return feature;
  })
  .patch("/api/features/:featureId", async ({ params, body }) => {
    const { name, description, priority, status, category } = body as {
      name?: string;
      description?: string;
      priority?: number;
      status?: string;
      category?: string;
    };
    await updateFeature({
      featureId: params.featureId,
      name,
      description,
      priority,
      status: status as "pending" | "in_progress" | "review_ready" | "passing" | "failing" | undefined,
      category,
    });
    return { success: true };
  })
  .delete("/api/features/:featureId", async ({ params }) => {
    await deleteFeature({ featureId: params.featureId });
    return { success: true };
  })
  // Dependency management endpoints
  .post("/api/features/:featureId/dependencies", async ({ params, body, set }) => {
    const { dependsOnId } = body as { dependsOnId: string };
    if (!dependsOnId) {
      set.status = 400;
      return { error: "dependsOnId is required" };
    }
    try {
      await addDependency({ featureId: params.featureId, dependsOnId });
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("circular")) {
        set.status = 409;
        return { error: msg };
      }
      throw error;
    }
  })
  .delete("/api/features/:featureId/dependencies/:dependsOnId", async ({ params }) => {
    await removeDependency({ featureId: params.featureId, dependsOnId: params.dependsOnId });
    return { success: true };
  })
  // Linear sync endpoint — bulk fetch and upsert from Linear
  .post("/api/projects/:projectId/linear/sync", async ({ params, set }) => {
    const project = await getProject({ projectId: params.projectId });
    if (!project) {
      set.status = 404;
      return { error: "Project not found" };
    }
    if (!project.linearAccessToken || !project.linearTeamId) {
      set.status = 400;
      return { error: "Project is not connected to Linear" };
    }

    try {
      const issues = await fetchAllTeamIssues({
        accessToken: project.linearAccessToken,
        teamId: project.linearTeamId,
        label: "omakase",
        projectId: project.linearProjectId,
      });

      const mapped = issues.map((issue) => ({
        linearIssueId: issue.id,
        linearIssueUrl: issue.url,
        name: issue.title,
        description: issue.description ?? undefined,
        priority: issue.priority,
        category: issue.labels.nodes
          .filter((l) => l.name.toLowerCase() !== "omakase")
          .map((l) => l.name)
          .join(", ") || undefined,
        linearStateName: issue.state.name,
        linearLabels: issue.labels.nodes.map((l) => l.name),
        linearAssigneeName: issue.assignee?.name ?? undefined,
      }));

      const result = await bulkSyncFromLinear({
        projectId: params.projectId,
        issues: mapped,
      });

      return { synced: mapped.length, created: result.created, updated: result.updated };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("401") || message.includes("Unauthorized")) {
        set.status = 401;
        return { error: "Linear access token is expired or revoked. Please reconnect Linear." };
      }
      set.status = 500;
      return { error: `Sync failed: ${message}` };
    }
  })
  // Feature assignment endpoint — manually assign a feature to an agent
  .post("/api/features/:featureId/assign", async ({ params, body, set }) => {
    const { agentName } = body as { agentName: string };
    const KNOWN_AGENTS = ["miso", "nori", "koji", "toro"];
    if (!agentName || !KNOWN_AGENTS.includes(agentName)) {
      set.status = 400;
      return { error: `agentName must be one of: ${KNOWN_AGENTS.join(", ")}` };
    }

    const feature = await getFeature({ featureId: params.featureId });
    if (!feature) {
      set.status = 404;
      return { error: "Feature not found" };
    }
    if (feature.status !== "pending") {
      set.status = 409;
      return { error: `Feature must be in "pending" status to assign (current: "${feature.status}")` };
    }

    const project = await getProject({ projectId: feature.projectId });
    if (!project) {
      set.status = 404;
      return { error: "Project not found" };
    }
    if (!project.repoUrl) {
      set.status = 400;
      return { error: "Project has no repository configured" };
    }

    // Check concurrency
    const activeAgents = await listActiveAgents({ projectId: project.id });
    if (activeAgents.length >= project.maxConcurrency) {
      set.status = 429;
      return { error: `Concurrency limit reached (${activeAgents.length}/${project.maxConcurrency} active pipelines)` };
    }

    // Claim the feature
    try {
      await markFeatureInProgress({ featureId: feature.id, agentId: agentName });
    } catch (err) {
      const errObj = err as { name?: string };
      if (errObj.name === "ConditionalCheckFailedException") {
        set.status = 409;
        return { error: "Feature was already claimed by another process" };
      }
      throw err;
    }

    // Build pipeline config and launch
    const repoOwner = project.githubRepoOwner ?? "";
    const repoName = project.githubRepoName ?? "";

    let githubToken = GITHUB_TOKEN ?? "";
    if (project.githubInstallationId && isGitHubAppConfigured()) {
      try {
        githubToken = await getInstallationToken(project.githubInstallationId);
      } catch {
        // Fall through to GITHUB_TOKEN
      }
    }

    const pipelineConfig: import("./pipeline.js").PipelineConfig = {
      featureId: feature.id,
      projectId: project.id,
      featureName: feature.name,
      featureDescription: feature.description ?? "",
      repoUrl: project.repoUrl,
      repoOwner,
      repoName,
      githubToken,
      baseBranch: project.githubDefaultBranch,
      linearIssueId: feature.linearIssueId,
      linearIssueUrl: feature.linearIssueUrl,
      linearAccessToken: project.linearAccessToken,
      githubInstallationId: project.githubInstallationId,
      executionMode: EXECUTION_MODE,
      localWorkspaceRoot: EXECUTION_MODE === "local" ? LOCAL_WORKSPACE_ROOT : undefined,
    };

    const pipeline = new AgentPipeline(pipelineConfig, ecsConfig, ecsClient);

    // Fire and forget
    pipeline.execute().then((result) => {
      if (result.success) {
        console.log(`[orchestrator] Manual pipeline succeeded for feature ${feature.id}`);
      } else {
        console.error(`[orchestrator] Manual pipeline failed for feature ${feature.id}: ${result.errorMessage}`);
      }
    }).catch((err) => {
      console.error(`[orchestrator] Manual pipeline error for feature ${feature.id}:`, err);
    });

    set.status = 202;
    return { success: true, featureId: feature.id, assignedTo: agentName };
  })
  // Linear disconnect endpoint
  .delete("/api/projects/:projectId/linear-token", async ({ params }) => {
    await updateProject({ projectId: params.projectId, linearAccessToken: "", linearTeamId: "", linearProjectId: "", linearProjectName: "" });
    return { success: true };
  })
  // GitHub App integration endpoints
  .post("/api/projects/:projectId/github/install", async ({ params, body, set }) => {
    const { githubInstallationId } = body as { githubInstallationId: number };
    if (!githubInstallationId) {
      set.status = 400;
      return { error: "githubInstallationId is required" };
    }
    await updateProject({ projectId: params.projectId, githubInstallationId });
    return { success: true };
  })
  .get("/api/projects/:projectId/github/repos", async ({ params, set }) => {
    if (!isGitHubAppConfigured()) {
      set.status = 503;
      return { error: "GitHub App not configured" };
    }
    const project = await getProject({ projectId: params.projectId });
    if (!project) {
      set.status = 404;
      return { error: "Project not found" };
    }
    if (!project.githubInstallationId) {
      set.status = 400;
      return { error: "Project has no GitHub App installation" };
    }
    const repos = await listInstallationRepos(project.githubInstallationId);
    return repos;
  })
  .post("/api/projects/:projectId/github/connect-repo", async ({ params, body, set }) => {
    const { owner, name, defaultBranch } = body as {
      owner: string;
      name: string;
      defaultBranch: string;
    };
    if (!owner || !name) {
      set.status = 400;
      return { error: "owner and name are required" };
    }
    await updateProject({
      projectId: params.projectId,
      githubRepoOwner: owner,
      githubRepoName: name,
      githubDefaultBranch: defaultBranch || "main",
      repoUrl: `https://github.com/${owner}/${name}.git`,
    });
    return { success: true };
  })
  .post("/api/projects/:projectId/github/disconnect", async ({ params }) => {
    await clearGitHubConnection({ projectId: params.projectId });
    return { success: true };
  })
  .delete("/api/github/installations/:installationId", async ({ params }) => {
    await clearGitHubInstallation({ installationId: parseInt(params.installationId, 10) });
    return { success: true };
  })
  .post("/api/github/installations/:installationId/repos-removed", async ({ params, body }) => {
    const { removedRepos } = body as { removedRepos: string[] };
    const installationId = parseInt(params.installationId, 10);
    // Find projects with this installation and check if their repo was removed
    const allProjects = await listActiveProjects();
    for (const project of allProjects) {
      if (
        project.githubInstallationId === installationId &&
        project.githubRepoOwner &&
        project.githubRepoName
      ) {
        const fullName = `${project.githubRepoOwner}/${project.githubRepoName}`;
        if (removedRepos.includes(fullName)) {
          await clearGitHubConnection({ projectId: project.id });
        }
      }
    }
    return { success: true };
  })
  // PR creation endpoint (chat-triggered)
  .post("/api/agent-runs/:runId/create-pr", async ({ params, set }) => {
    const run = await getAgentRun({ runId: params.runId });
    if (!run) {
      set.status = 404;
      return { error: "Agent run not found" };
    }
    const feature = await getFeature({ featureId: run.featureId });
    if (!feature) {
      set.status = 404;
      return { error: "Feature not found" };
    }
    if (feature.status !== "review_ready") {
      set.status = 409;
      return { error: "Feature is not ready for PR creation" };
    }
    const project = await getProject({ projectId: run.projectId });
    if (!project) {
      set.status = 404;
      return { error: "Project not found" };
    }
    if (!project.githubInstallationId) {
      set.status = 400;
      return { error: "Project has no GitHub connection" };
    }
    if (!project.githubRepoOwner || !project.githubRepoName) {
      set.status = 400;
      return { error: "Project has no connected repository" };
    }

    try {
      const token = await getInstallationToken(project.githubInstallationId);
      const baseBranch = project.githubDefaultBranch || "main";
      const featureBranch = `agent/${feature.id}`;

      const prBody = buildPrBody({
        featureDescription: feature.description ?? feature.name,
        implementationPlanSummary: "See branch for implementation details.",
        testResultsSummary: "All tests passed.",
      });

      const result = await createPullRequest({
        repoOwner: project.githubRepoOwner,
        repoName: project.githubRepoName,
        featureBranch,
        baseBranch,
        title: `feat: ${feature.name}`,
        body: prBody,
        githubToken: token,
      });

      // Transition feature from review_ready to passing
      await transitionReviewReadyToPassing({ featureId: feature.id });

      // Post pr_created message to chat
      await createMessage({
        runId: params.runId,
        featureId: feature.id,
        projectId: run.projectId,
        sender: "system",
        role: run.role,
        content: `Pull request created: [#${result.number}](${result.url})`,
        type: "pr_created",
      });

      return { success: true, prUrl: result.url, prNumber: result.number };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Post error message to chat
      await createMessage({
        runId: params.runId,
        featureId: feature.id,
        projectId: run.projectId,
        sender: "system",
        role: run.role,
        content: `Failed to create pull request: ${message}`,
        type: "error",
      });
      set.status = 500;
      return { error: `PR creation failed: ${message}` };
    }
  })
  // Agent chat endpoints
  .post("/api/agent-runs/:runId/messages", async ({ params, body, set }) => {
    const { content, sender, role, type, threadId, metadata } = body as {
      content: string;
      sender: AgentMessageSender;
      role?: AgentRunRole | null;
      type?: AgentMessageType;
      threadId?: string;
      metadata?: QuizMetadata;
    };
    if (!content) {
      set.status = 400;
      return { error: "content is required" };
    }
    let run = await getAgentRun({ runId: params.runId });

    // For synthetic chat-* runIds (from global agent chat), create an in-memory stub
    // so messages can be stored without a real DynamoDB agent-run record.
    if (!run && params.runId.startsWith("chat-")) {
      const roleFromId = params.runId.replace("chat-", "") as AgentRunRole;
      const CHAT_ROLE_TO_AGENT: Record<string, string> = {
        architect: "miso", coder: "nori", reviewer: "koji", tester: "toro",
      };
      run = {
        id: params.runId,
        agentId: CHAT_ROLE_TO_AGENT[roleFromId] ?? roleFromId,
        projectId: "general",
        featureId: "chat",
        role: roleFromId,
        status: "started",
        startedAt: new Date().toISOString(),
      } as NonNullable<typeof run>;
    }

    if (!run) {
      set.status = 404;
      return { error: "Agent run not found" };
    }
    if (sender === "user" && (run.status === "completed" || run.status === "failed")) {
      set.status = 409;
      return { error: "Agent run is no longer active" };
    }

    // Auto-create thread if not provided and sender is user
    let resolvedThreadId = threadId;
    let createdThread = null;
    if (!resolvedThreadId && (sender ?? "user") === "user") {
      try {
        const ROLE_TO_AGENT: Record<string, string> = {
          architect: "miso", coder: "nori", reviewer: "koji", tester: "toro",
        };
        const agentName = ROLE_TO_AGENT[run.role] ?? run.role;
        createdThread = await createThread({
          agentName,
          projectId: run.projectId,
        });
        resolvedThreadId = createdThread.threadId;
      } catch (err) {
        console.error("[orchestrator] Failed to auto-create thread (table may not exist):", err);
        // Continue without a thread — message will still be saved
      }
    }

    const message = await createMessage({
      runId: params.runId,
      featureId: run.featureId,
      projectId: run.projectId,
      sender: sender ?? "user",
      role: role ?? run.role,
      content,
      type: type ?? "message",
      threadId: resolvedThreadId,
      metadata,
    });
    // Route user messages based on type and thread mode
    if ((sender ?? "user") === "user") {
      // Quiz messages get routed to the quiz handler
      if ((type ?? "message") === "quiz" && metadata) {
        handleQuizMessage(params.runId, content, metadata, resolvedThreadId, {
          featureId: run.featureId,
          projectId: run.projectId,
          role: run.role,
        }).catch((err) =>
          console.error("[orchestrator] Quiz handler error:", err)
        );
      } else {
        // Check if this thread is a work mode thread
        let isWorkMode = false;
        if (resolvedThreadId) {
          try {
            const ROLE_TO_AGENT_MAP: Record<string, string> = {
              architect: "miso", coder: "nori", reviewer: "koji", tester: "toro",
            };
            const agentName = ROLE_TO_AGENT_MAP[run.role] ?? run.role;
            const thread = await getThread({ agentName, threadId: resolvedThreadId });
            isWorkMode = thread?.mode === "work";
          } catch (err) {
            console.error("[orchestrator] Failed to get thread for mode check:", err);
          }
        }

        if (isWorkMode) {
          // Route to WorkSessionManager for follow-up messages.
          // The initial prompt is already sent by startSession().
          // Only forward messages that are genuine follow-ups (session must exist and not be busy with initial prompt).
          const session = workSessionManager.getSession(params.runId);
          if (session) {
            const sessionAge = Date.now() - new Date(session.startedAt).getTime();
            if (sessionAge > 5_000) {
              // This is a genuine follow-up message
              console.log(`[orchestrator] Routing work follow-up to session runId=${params.runId}`);
              workSessionManager.sendMessage(params.runId, content).catch((err) =>
                console.error("[orchestrator] Work session message error:", err)
              );
            } else {
              // Session was just created — initial prompt already sent, skip duplicate
              console.log(`[orchestrator] Skipping duplicate send — session just started (${sessionAge}ms ago)`);
            }
          } else {
            console.warn(`[orchestrator] Work mode but no session for runId=${params.runId}`);
          }
        } else {
          // Route to Anthropic API personality chat
          generateAgentResponse(params.runId, content, resolvedThreadId).catch((err) =>
            console.error("[orchestrator] Agent response error:", err)
          );
        }
      }
    }
    set.status = 201;
    return { ...message, ...(createdThread ? { createdThread } : {}) };
  })
  .get("/api/agent-runs/:runId/messages", async ({ params, query }) => {
    const since = query.since as string | undefined;
    const sender = query.sender as AgentMessageSender | undefined;
    return await listMessages({ runId: params.runId, since, sender });
  })
  .get("/api/agent-runs/:runId/messages/stream", async ({ params, request }) => {
    const runId = params.runId;
    const lastEventId = request.headers.get("Last-Event-ID");
    const url = new URL(request.url);
    const threadId = url.searchParams.get("threadId") ?? undefined;

    console.log(`[sse] New SSE connection: runId=${runId} threadId=${threadId ?? "none"} lastEventId=${lastEventId ?? "none"}`);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let lastTimestamp = lastEventId ?? "";
        let closed = false;
        let eventsSent = 0;

        const send = (event: string, data: string, id?: string) => {
          eventsSent++;
          if (eventsSent <= 10) {
            const preview = data.length > 80 ? data.slice(0, 80) + "..." : data;
            console.log(`[sse] send #${eventsSent} runId=${runId} event=${event} data=${preview}`);
          } else if (eventsSent === 11) {
            console.log(`[sse] (suppressing further SSE send logs for runId=${runId})`);
          }
          let payload = "";
          if (event !== "message") payload += `event: ${event}\n`;
          if (id) payload += `id: ${id}\n`;
          payload += `data: ${data}\n\n`;
          controller.enqueue(encoder.encode(payload));
        };

        // Send initial batch of existing messages (thread-scoped or run-scoped)
        const initial = threadId
          ? await listMessagesByThread({ threadId, since: lastTimestamp || undefined })
          : await listMessages({ runId, since: lastTimestamp || undefined });
        console.log(`[sse] Sending ${initial.length} initial messages for runId=${runId}`);
        for (const msg of initial) {
          send("message", JSON.stringify(msg), msg.timestamp);
          lastTimestamp = msg.timestamp;
        }

        // Subscribe to real-time token stream from agent-responder
        const unsubscribe = subscribe(runId, (event) => {
          if (closed) return;
          if (event.type === "thinking_start") {
            send("thinking_start", "{}");
          } else if (event.type === "token") {
            send("token", JSON.stringify({ token: event.token }));
          } else if (event.type === "thinking_end") {
            send("thinking_end", "{}");
          } else if (event.type === "stream_error") {
            send("stream_error", JSON.stringify({ error: event.error }));
          }
        });

        // Poll for new messages every 1 second (picks up saved messages from DynamoDB)
        const interval = setInterval(async () => {
          if (closed) return;
          try {
            // Check if run is still active (skip for synthetic chat-* runIds)
            const isSyntheticChat = runId.startsWith("chat-");
            const run = isSyntheticChat ? null : await getAgentRun({ runId });
            const newMessages = threadId
              ? await listMessagesByThread({ threadId, since: lastTimestamp || undefined })
              : await listMessages({ runId, since: lastTimestamp || undefined });
            for (const msg of newMessages) {
              send("message", JSON.stringify(msg), msg.timestamp);
              lastTimestamp = msg.timestamp;
            }
            if (!isSyntheticChat && run && (run.status === "completed" || run.status === "failed")) {
              send("close", JSON.stringify({ status: run.status }));
              clearInterval(interval);
              unsubscribe();
              controller.close();
              closed = true;
            }
          } catch {
            clearInterval(interval);
            unsubscribe();
            if (!closed) {
              controller.close();
              closed = true;
            }
          }
        }, 1000);

        // Clean up when client disconnects
        request.signal.addEventListener("abort", () => {
          console.log(`[sse] Client disconnected: runId=${runId} eventsSent=${eventsSent}`);
          clearInterval(interval);
          unsubscribe();
          if (!closed) {
            closed = true;
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  })
  // Agent thread endpoints
  .post("/api/agents/:agentName/threads", async ({ params, body, set }) => {
    const KNOWN_AGENTS = ["miso", "nori", "koji", "toro"];
    if (!KNOWN_AGENTS.includes(params.agentName)) {
      set.status = 404;
      return { error: "Agent not found" };
    }
    const { projectId, title, mode } = body as { projectId?: string; title?: string; mode?: AgentThreadMode };
    const thread = await createThread({
      agentName: params.agentName,
      projectId: projectId || "general",
      title,
      mode,
    });
    set.status = 201;
    return thread;
  })
  .get("/api/agents/:agentName/threads", async ({ params, query }) => {
    const projectId = query.projectId as string | undefined;
    const includeArchived = query.includeArchived === "true";
    const limit = query.limit ? parseInt(query.limit as string, 10) : 20;
    const cursor = query.cursor as string | undefined;
    try {
      return await listThreadsByAgent({
        agentName: params.agentName,
        projectId: projectId || undefined,
        includeArchived,
        limit,
        cursor: cursor || undefined,
      });
    } catch (err) {
      console.error("[orchestrator] Failed to list threads (table may not exist):", err);
      return { threads: [], nextCursor: null };
    }
  })
  .patch("/api/agents/:agentName/threads/:threadId", async ({ params, body }) => {
    const { title, status } = body as { title?: string; status?: AgentThreadStatus };
    const updated = await updateThread({
      agentName: params.agentName,
      threadId: params.threadId,
      title,
      status,
    });
    if (!updated) {
      return new Response(JSON.stringify({ error: "Thread not found" }), { status: 404 });
    }
    return updated;
  })
  // Thread messages endpoint (query by thread GSI)
  .get("/api/threads/:threadId/messages", async ({ params }) => {
    return await listMessagesByThread({ threadId: params.threadId });
  })
  // Agent memory endpoints
  .get("/api/agents/:agentName/memories", async ({ params, query }) => {
    const projectId = query.projectId as string | undefined;
    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId query parameter required" }), { status: 400 });
    }
    return await listMemories({ agentName: params.agentName, projectId });
  })
  .post("/api/agents/:agentName/memories", async ({ params, body, set }) => {
    const { projectId, content } = body as { projectId: string; content: string };
    if (!projectId || !content) {
      set.status = 400;
      return { error: "projectId and content are required" };
    }
    const memory = await createMemory({
      agentName: params.agentName,
      projectId,
      content,
      source: "manual",
    });
    set.status = 201;
    return memory;
  })
  .delete("/api/agents/:agentName/memories/all", async ({ params, query }) => {
    const projectId = query.projectId as string | undefined;
    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId query parameter required" }), { status: 400 });
    }
    await deleteMemoriesByAgentProject({ agentName: params.agentName, projectId });
    return new Response(null, { status: 204 });
  })
  .delete("/api/agents/:agentName/memories/:createdAt", async ({ params, query }) => {
    const projectId = query.projectId as string | undefined;
    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId query parameter required" }), { status: 400 });
    }
    await deleteMemory({
      agentName: params.agentName,
      projectId,
      createdAt: params.createdAt,
    });
    return new Response(null, { status: 204 });
  })
  // Agent personality endpoints
  .get("/api/agents/:agentName/personality", async ({ params }) => {
    const personality = await getPersonality({ agentName: params.agentName });
    if (!personality) {
      return new Response(JSON.stringify({ error: "Personality not found" }), { status: 404 });
    }
    return personality;
  })
  .put("/api/agents/:agentName/personality", async ({ params, body }) => {
    const { displayName, persona, traits, communicationStyle } = body as {
      displayName: string;
      persona: string;
      traits: string[];
      communicationStyle: string;
    };
    const personality = await putPersonality({
      agentName: params.agentName,
      displayName,
      persona,
      traits,
      communicationStyle,
    });
    return personality;
  })
  .delete("/api/agents/:agentName/personality", async ({ params }) => {
    await deletePersonality({ agentName: params.agentName });
    return new Response(null, { status: 204 });
  })
  // Work session endpoints
  .post("/api/agents/:agentName/work-sessions", async ({ params, body, set }) => {
    const KNOWN_AGENTS = ["miso", "nori", "koji", "toro"];
    if (!KNOWN_AGENTS.includes(params.agentName)) {
      set.status = 404;
      return { error: "Agent not found" };
    }
    const { projectId, threadId, prompt } = body as { projectId?: string; threadId: string; prompt: string };
    if (!threadId || !prompt) {
      set.status = 400;
      return { error: "threadId and prompt are required" };
    }
    // Look up project to get repoUrl and GitHub token (optional)
    let repoUrl: string | undefined;
    let githubToken: string | undefined;
    if (projectId) {
      const project = await getProject({ projectId });
      if (!project) {
        set.status = 404;
        return { error: "Project not found" };
      }
      repoUrl = project.repoUrl;
      // Generate installation token if GitHub App is configured
      if (project.githubInstallationId && isGitHubAppConfigured()) {
        try {
          githubToken = await getInstallationToken(project.githubInstallationId);
        } catch (err) {
          console.warn("[orchestrator] Failed to get GitHub installation token:", err);
        }
      }
    }
    try {
      console.log(`[orchestrator] Starting work session: agent=${params.agentName} project=${projectId ?? "none"} thread=${threadId} repoUrl=${repoUrl ?? "none"}`);
      const result = await workSessionManager.startSession({
        agentName: params.agentName,
        projectId,
        threadId,
        prompt,
        repoUrl,
        githubToken,
      });
      console.log(`[orchestrator] Work session result: runId=${result.runId} status=${result.status}`);
      set.status = result.status === "existing" ? 200 : 201;
      return result;
    } catch (err) {
      console.error(`[orchestrator] Work session start failed:`, err);
      set.status = 500;
      return { error: err instanceof Error ? err.message : String(err) };
    }
  })
  .delete("/api/work-sessions/:runId", async ({ params, set }) => {
    try {
      await workSessionManager.endSession(params.runId);
      return { status: "completed" };
    } catch (err) {
      set.status = 404;
      return { error: err instanceof Error ? err.message : String(err) };
    }
  })
  .get("/api/agents/:agentName/work-sessions", async ({ params }) => {
    const sessions = workSessionManager.listSessions(params.agentName);
    return sessions.map((s) => ({
      runId: s.runId,
      projectId: s.projectId,
      threadId: s.threadId,
      startedAt: s.startedAt,
    }));
  })
  .get("/api/agents/:agentName/work-sessions/active", async ({ params, query }) => {
    const threadId = (query as Record<string, string>).threadId;
    if (!threadId) {
      return { active: false };
    }
    const session = workSessionManager.findSessionByThread(threadId);
    if (session) {
      return { active: true, runId: session.runId };
    }
    return { active: false };
  })
  // Workspace file browser endpoints
  .get("/api/work-sessions/:runId/files", async ({ params, query, set }) => {
    const cwd = workSessionManager.getSessionCwd(params.runId);
    if (!cwd) {
      set.status = 404;
      return { error: "Work session not found" };
    }
    const reqPath = (query as Record<string, string>).path ?? "/";

    // Prevent directory traversal
    if (reqPath.includes("..")) {
      set.status = 400;
      return { error: "Invalid path" };
    }

    const EXCLUDED_DIRS = new Set([".git", "node_modules", ".next", ".claude", "__pycache__", ".turbo"]);
    const fullPath = join(cwd, reqPath);

    // Ensure resolved path is within the workspace
    const resolved = resolve(fullPath);
    if (!resolved.startsWith(resolve(cwd))) {
      set.status = 400;
      return { error: "Path outside workspace" };
    }

    try {
      const dirents = await readdir(resolved, { withFileTypes: true });
      const entries: Array<{ name: string; type: "file" | "dir"; size: number; modifiedAt: string }> = [];

      for (const dirent of dirents) {
        if (EXCLUDED_DIRS.has(dirent.name)) continue;
        if (dirent.name.startsWith(".") && dirent.name !== ".env.example") continue;

        try {
          const entryPath = join(resolved, dirent.name);
          const s = await stat(entryPath);
          entries.push({
            name: dirent.name,
            type: dirent.isDirectory() ? "dir" : "file",
            size: s.size,
            modifiedAt: s.mtime.toISOString(),
          });
        } catch {
          // Skip entries we can't stat
        }
      }

      // Sort: directories first, then files, alphabetically
      entries.sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      return { entries };
    } catch {
      set.status = 404;
      return { error: "Directory not found" };
    }
  })
  .get("/api/work-sessions/:runId/file", async ({ params, query, set }) => {
    const cwd = workSessionManager.getSessionCwd(params.runId);
    if (!cwd) {
      set.status = 404;
      return { error: "Work session not found" };
    }
    const reqPath = (query as Record<string, string>).path;
    if (!reqPath) {
      set.status = 400;
      return { error: "path query parameter is required" };
    }

    // Prevent directory traversal
    if (reqPath.includes("..")) {
      set.status = 400;
      return { error: "Invalid path" };
    }

    const fullPath = join(cwd, reqPath);
    const resolved = resolve(fullPath);
    if (!resolved.startsWith(resolve(cwd))) {
      set.status = 400;
      return { error: "Path outside workspace" };
    }

    const MAX_FILE_SIZE = 100 * 1024; // 100KB

    try {
      const s = await stat(resolved);
      if (s.isDirectory()) {
        set.status = 400;
        return { error: "Path is a directory" };
      }
      if (s.size > MAX_FILE_SIZE) {
        set.status = 413;
        return { error: "File too large", size: s.size, maxSize: MAX_FILE_SIZE };
      }

      const content = await readFile(resolved, "utf-8");
      return { content, path: reqPath, size: s.size };
    } catch {
      set.status = 404;
      return { error: "File not found" };
    }
  })
  // Agent profile endpoints
  .get("/api/agents/:agentName/profile", async ({ params }) => {
    const personality = await getPersonality({ agentName: params.agentName });
    if (personality) return personality;
    const fallback = getDefaultPersonality(params.agentName);
    if (fallback) return { ...fallback, updatedAt: new Date().toISOString() };
    return new Response(JSON.stringify({ error: "Agent not found" }), { status: 404 });
  })
  .get("/api/agents/:agentName/stats", async ({ params }) => {
    return await getAgentStatsByName({ agentName: params.agentName });
  })
  .get("/api/agents/:agentName/activity", async ({ params }) => {
    return await getAgentActivityByName({ agentName: params.agentName });
  })
  .get("/api/agents/:agentName/runs", async ({ params, query }) => {
    const limit = query.limit ? parseInt(query.limit as string, 10) : 20;
    return await listRunsByAgentName({ agentName: params.agentName, limit });
  })
  // Catch-all error handler
  .onError(({ set, error, code }) => {
    console.error(`[orchestrator] Error (${code}):`, error);
    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Not found" };
    }
    set.status = 500;
    return { error: "Internal server error", message: String(error) };
  })
  .listen(PORT);

console.log(`[orchestrator] Elysia server listening on port ${PORT}`);
console.log(`[orchestrator] Execution mode: ${EXECUTION_MODE}`);
if (EXECUTION_MODE === "ecs") {
  console.log(`[orchestrator] ECS cluster: ${ECS_CLUSTER}`);
} else {
  console.log(`[orchestrator] Local workspace root: ${LOCAL_WORKSPACE_ROOT}`);
}
console.log(`[orchestrator] Poll interval: ${POLL_INTERVAL_MS}ms`);

// Start the feature watcher after the HTTP server is ready
watcher.start();

console.log("[orchestrator] Orchestrator started successfully.");

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown(signal: string): void {
  console.log(`[orchestrator] Received ${signal}. Shutting down gracefully...`);

  // Stop the feature watcher (stops polling, does not cancel in-flight pipelines)
  watcher.stop();

  // Clean up all active work sessions
  workSessionManager.cleanup().catch((err) =>
    console.error("[orchestrator] Work session cleanup error:", err)
  );

  // Stop the Elysia server
  app.stop().then(() => {
    console.log("[orchestrator] Elysia server stopped.");

    // Destroy the ECS client to release connections
    ecsClient.destroy();

    console.log("[orchestrator] Shutdown complete.");
    process.exit(0);
  });

  // Force exit if the server doesn't close within 10 seconds
  setTimeout(() => {
    console.error("[orchestrator] Forced exit after shutdown timeout.");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
