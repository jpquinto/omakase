/**
 * index.ts -- Entry point for the AutoForge orchestrator service.
 *
 * Uses Elysia (Bun-native web framework) for the HTTP server with typed
 * routes and request logging middleware. Initializes the Convex and ECS
 * clients and starts the feature watcher polling loop.
 *
 * Environment variables:
 *   PORT                    - HTTP server port (default: 8080)
 *   CONVEX_URL              - Convex deployment URL (required)
 *   ECS_CLUSTER             - ECS cluster name or ARN (required)
 *   ECS_TASK_DEFINITION     - ECS task definition family or ARN (required)
 *   ECS_SUBNETS             - Comma-separated VPC subnet IDs (required)
 *   ECS_SECURITY_GROUP      - Security group ID for Fargate tasks (required)
 *   ECS_CONTAINER_NAME      - Container name in the task definition (default: "agent")
 *   AWS_REGION              - AWS region for ECS client (default: "us-east-1")
 *   GITHUB_TOKEN            - GitHub PAT for PR creation (optional)
 *   POLL_INTERVAL_MS        - Feature watcher poll interval in ms (default: 30000)
 */

import { Elysia } from "elysia";
import { ECSClient } from "@aws-sdk/client-ecs";
import { ConvexHttpClient } from "convex/browser";

import { FeatureWatcher, type FeatureWatcherConfig } from "./feature-watcher.js";
import type { EcsConfig } from "./pipeline.js";

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
const CONVEX_URL = requireEnv("CONVEX_URL");
const ECS_CLUSTER = requireEnv("ECS_CLUSTER");
const ECS_TASK_DEFINITION = requireEnv("ECS_TASK_DEFINITION");
const ECS_SUBNETS = requireEnv("ECS_SUBNETS").split(",").map((s) => s.trim());
const ECS_SECURITY_GROUP = requireEnv("ECS_SECURITY_GROUP");
const ECS_CONTAINER_NAME = process.env["ECS_CONTAINER_NAME"] ?? "agent";
const AWS_REGION = process.env["AWS_REGION"] ?? "us-east-1";
const GITHUB_TOKEN = process.env["GITHUB_TOKEN"];
const POLL_INTERVAL_MS = parseInt(process.env["POLL_INTERVAL_MS"] ?? "30000", 10);

// ---------------------------------------------------------------------------
// Client initialization
// ---------------------------------------------------------------------------

const convex = new ConvexHttpClient(CONVEX_URL);
const ecsClient = new ECSClient({ region: AWS_REGION });

const ecsConfig: EcsConfig = {
  cluster: ECS_CLUSTER,
  taskDefinition: ECS_TASK_DEFINITION,
  subnets: ECS_SUBNETS,
  securityGroup: ECS_SECURITY_GROUP,
  containerName: ECS_CONTAINER_NAME,
  convexUrl: CONVEX_URL,
};

const watcherConfig: FeatureWatcherConfig = {
  pollIntervalMs: POLL_INTERVAL_MS,
  ecsConfig,
  githubToken: GITHUB_TOKEN,
};

const watcher = new FeatureWatcher(convex, ecsClient, watcherConfig);

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
  // Catch-all 404
  .onError(({ set }) => {
    set.status = 404;
    return { error: "Not found" };
  })
  .listen(PORT);

console.log(`[orchestrator] Elysia server listening on port ${PORT}`);
console.log(`[orchestrator] Convex URL: ${CONVEX_URL}`);
console.log(`[orchestrator] ECS cluster: ${ECS_CLUSTER}`);
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
