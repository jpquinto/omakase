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
 *   ECS_CLUSTER             - ECS cluster name or ARN (required when EXECUTION_MODE=ecs)
 *   ECS_TASK_DEFINITION     - ECS task definition family or ARN (required when EXECUTION_MODE=ecs)
 *   ECS_SUBNETS             - Comma-separated VPC subnet IDs (required when EXECUTION_MODE=ecs)
 *   ECS_SECURITY_GROUP      - Security group ID for Fargate tasks (required when EXECUTION_MODE=ecs)
 *   ECS_CONTAINER_NAME      - Container name in the task definition (default: "agent")
 *   AWS_REGION              - AWS region for ECS client (default: "us-east-1")
 *   LOCAL_WORKSPACE_ROOT    - Root dir for local agent workspaces (default: "/tmp/omakase-agents")
 *   GITHUB_TOKEN            - GitHub PAT for PR creation (optional)
 *   POLL_INTERVAL_MS        - Feature watcher poll interval in ms (default: 30000)
 */

import { Elysia } from "elysia";
import { ECSClient } from "@aws-sdk/client-ecs";
import {
  listProjects,
  getProject,
  listFeatures,
  getFeatureStats,
  listActiveAgents,
  getAgentLogs,
  getAgentRun,
  createFromLinear,
  getByLinearIssueId,
  updateFromLinear,
  getByLinearTeamId,
  updateProject,
  createMessage,
  listMessages,
} from "@omakase/dynamodb";
import type { AgentMessageSender, AgentMessageType, AgentRunRole } from "@omakase/db";

import { FeatureWatcher, type FeatureWatcherConfig } from "./feature-watcher.js";
import type { EcsConfig, ExecutionMode } from "./pipeline.js";

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

// ---------------------------------------------------------------------------
// Elysia HTTP server
// ---------------------------------------------------------------------------

const app = new Elysia()
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
  .get("/api/projects/:projectId", async ({ params }) => {
    const project = await getProject({ projectId: params.projectId });
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });
    }
    return project;
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
    const { projectId, name, description, priority, category, linearIssueId, linearIssueUrl } = body as {
      projectId: string;
      name: string;
      description?: string;
      priority: number;
      category?: string;
      linearIssueId: string;
      linearIssueUrl: string;
    };
    return await createFromLinear({ projectId, name, description, priority, category, linearIssueId, linearIssueUrl });
  })
  .get("/api/features/by-linear-issue/:linearIssueId", async ({ params }) => {
    const feature = await getByLinearIssueId({ linearIssueId: params.linearIssueId });
    if (!feature) {
      return new Response(JSON.stringify({ error: "Feature not found" }), { status: 404 });
    }
    return feature;
  })
  .patch("/api/features/:featureId/from-linear", async ({ params, body }) => {
    const { name, description, priority } = body as {
      name: string;
      description?: string;
      priority: number;
    };
    await updateFromLinear({ featureId: params.featureId, name, description, priority });
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
  .get("/api/projects/by-linear-team/:teamId", async ({ params }) => {
    const project = await getByLinearTeamId({ linearTeamId: params.teamId });
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });
    }
    return project;
  })
  // Agent chat endpoints
  .post("/api/agent-runs/:runId/messages", async ({ params, body, set }) => {
    const { content, sender, role, type } = body as {
      content: string;
      sender: AgentMessageSender;
      role?: AgentRunRole | null;
      type?: AgentMessageType;
    };
    if (!content) {
      set.status = 400;
      return { error: "content is required" };
    }
    const run = await getAgentRun({ runId: params.runId });
    if (!run) {
      set.status = 404;
      return { error: "Agent run not found" };
    }
    if (sender === "user" && (run.status === "completed" || run.status === "failed")) {
      set.status = 409;
      return { error: "Agent run is no longer active" };
    }
    const message = await createMessage({
      runId: params.runId,
      featureId: run.featureId,
      projectId: run.projectId,
      sender: sender ?? "user",
      role: role ?? run.role,
      content,
      type: type ?? "message",
    });
    set.status = 201;
    return message;
  })
  .get("/api/agent-runs/:runId/messages", async ({ params, query }) => {
    const since = query.since as string | undefined;
    const sender = query.sender as AgentMessageSender | undefined;
    return await listMessages({ runId: params.runId, since, sender });
  })
  .get("/api/agent-runs/:runId/messages/stream", async ({ params, request }) => {
    const runId = params.runId;
    const lastEventId = request.headers.get("Last-Event-ID");

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let lastTimestamp = lastEventId ?? "";
        let closed = false;

        const send = (event: string, data: string, id?: string) => {
          let payload = "";
          if (event !== "message") payload += `event: ${event}\n`;
          if (id) payload += `id: ${id}\n`;
          payload += `data: ${data}\n\n`;
          controller.enqueue(encoder.encode(payload));
        };

        // Send initial batch of existing messages
        const initial = await listMessages({ runId, since: lastTimestamp || undefined });
        for (const msg of initial) {
          send("message", JSON.stringify(msg), msg.timestamp);
          lastTimestamp = msg.timestamp;
        }

        // Poll for new messages every 1 second
        const interval = setInterval(async () => {
          if (closed) return;
          try {
            // Check if run is still active
            const run = await getAgentRun({ runId });
            const newMessages = await listMessages({ runId, since: lastTimestamp || undefined });
            for (const msg of newMessages) {
              send("message", JSON.stringify(msg), msg.timestamp);
              lastTimestamp = msg.timestamp;
            }
            if (run && (run.status === "completed" || run.status === "failed")) {
              send("close", JSON.stringify({ status: run.status }));
              clearInterval(interval);
              controller.close();
              closed = true;
            }
          } catch {
            clearInterval(interval);
            if (!closed) {
              controller.close();
              closed = true;
            }
          }
        }, 1000);

        // Clean up when client disconnects
        request.signal.addEventListener("abort", () => {
          clearInterval(interval);
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
  // Catch-all 404
  .onError(({ set }) => {
    set.status = 404;
    return { error: "Not found" };
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
