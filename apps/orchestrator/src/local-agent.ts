/**
 * local-agent.ts -- Local subprocess agent launcher and monitor.
 *
 * Replaces ecs-agent.ts + agent-monitor.ts when EXECUTION_MODE=local.
 * Instead of launching ECS Fargate tasks, spawns agent-entrypoint.sh as
 * a local child process using Bun.spawn(). The same shell scripts and
 * Claude Code CLI invocation are reused -- the only difference is the
 * compute substrate (local process vs Fargate container).
 *
 * Each feature gets an isolated workspace directory under
 * LOCAL_WORKSPACE_ROOT to avoid conflicts between concurrent pipelines.
 */

import { spawn, type Subprocess } from "bun";
import { resolve } from "path";
import { mkdir } from "fs/promises";
import {
  updateAgentStatus as dbUpdateAgentStatus,
  completeAgentRun as dbCompleteAgentRun,
} from "@omakase/dynamodb";

import type { AgentRole } from "./ecs-agent.js";
import type { AgentCompletionResult } from "./agent-monitor.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for launching a local agent subprocess. */
export interface StartLocalAgentOptions {
  /** The feature ID this agent will work on. */
  featureId: string;
  /** The role of the agent to launch. */
  role: AgentRole;
  /** The project ID. */
  projectId: string;
  /** The git clone URL for the target repository. */
  repoUrl: string;
  /** Human-readable feature name (used in agent prompts). */
  featureName: string;
  /** Feature description and acceptance criteria (used in agent prompts). */
  featureDescription: string;
  /** Optional: the base branch for the feature branch (default "main"). */
  baseBranch?: string;
  /** Root directory for local workspaces (default: /tmp/omakase-agents). */
  workspaceRoot?: string;
}

/** Result of a successful local agent launch. */
export interface StartLocalAgentResult {
  /** The spawned child process. */
  process: Subprocess;
  /** The process PID. */
  pid: number;
  /** The workspace directory used for this agent. */
  workspace: string;
}

/** Configuration for the LocalAgentMonitor. */
export interface LocalAgentMonitorOptions {
  /** The spawned child process to monitor. */
  process: Subprocess;
  /** The agent_runs document ID to update in DynamoDB. */
  agentRunId: string;
  /** Timeout in milliseconds (default: 30 minutes). */
  timeoutMs?: number;
  /** Status update interval in milliseconds (default: 10 seconds). */
  statusUpdateIntervalMs?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_WORKSPACE_ROOT = "/tmp/omakase-agents";
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const DEFAULT_STATUS_UPDATE_INTERVAL_MS = 10 * 1000; // 10 seconds

// ---------------------------------------------------------------------------
// Start Local Agent
// ---------------------------------------------------------------------------

/**
 * Launch an agent as a local child process.
 *
 * Spawns `agent-entrypoint.sh` with the same environment variables that
 * ECS would provide. The workspace is a directory under the configured
 * workspace root, keyed by feature ID and role to allow concurrent runs.
 *
 * @param options - Configuration for the agent to launch.
 * @returns The spawned process and workspace path.
 */
export async function startLocalAgent(
  options: StartLocalAgentOptions,
): Promise<StartLocalAgentResult> {
  const {
    featureId,
    role,
    projectId,
    repoUrl,
    featureName,
    featureDescription,
    baseBranch = "main",
    workspaceRoot = DEFAULT_WORKSPACE_ROOT,
  } = options;

  // Create a workspace directory for this feature+role combination
  const workspace = resolve(workspaceRoot, featureId, role);
  await mkdir(workspace, { recursive: true });

  // Resolve the entrypoint script path relative to this file
  const entrypoint = resolve(import.meta.dir, "agent-entrypoint.sh");

  const childProcess = spawn(["bash", entrypoint], {
    env: {
      ...process.env,
      AGENT_ROLE: role,
      REPO_URL: repoUrl,
      FEATURE_ID: featureId,
      PROJECT_ID: projectId,
      FEATURE_NAME: featureName,
      FEATURE_DESCRIPTION: featureDescription,
      BASE_BRANCH: baseBranch,
      WORKSPACE: workspace,
    },
    stdout: "inherit",
    stderr: "inherit",
  });

  console.log(
    `[local-agent] Launched ${role} agent for feature ${featureId} ` +
      `(PID: ${childProcess.pid}, workspace: ${workspace})`,
  );

  return {
    process: childProcess,
    pid: childProcess.pid,
    workspace,
  };
}

// ---------------------------------------------------------------------------
// LocalAgentMonitor
// ---------------------------------------------------------------------------

/**
 * Monitors a local child process until it completes or times out.
 *
 * Provides the same `waitForCompletion()` interface as `AgentMonitor`
 * so the pipeline can use either transparently. Updates DynamoDB status
 * periodically while the process runs.
 */
export class LocalAgentMonitor {
  private readonly process: Subprocess;
  private readonly agentRunId: string;
  private readonly timeoutMs: number;
  private readonly statusUpdateIntervalMs: number;

  constructor(options: LocalAgentMonitorOptions) {
    this.process = options.process;
    this.agentRunId = options.agentRunId;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.statusUpdateIntervalMs =
      options.statusUpdateIntervalMs ?? DEFAULT_STATUS_UPDATE_INTERVAL_MS;
  }

  /**
   * Wait for the child process to exit or timeout.
   *
   * Updates DynamoDB status periodically while waiting. Returns the
   * same AgentCompletionResult shape as AgentMonitor for pipeline
   * compatibility.
   *
   * @returns The completion result including exit code and final status.
   */
  async waitForCompletion(): Promise<AgentCompletionResult> {
    // Set initial status to "coding" (generic active state)
    await this.updateStatus("coding");

    // Race the process exit against the timeout
    const result = await Promise.race([
      this.waitForExit(),
      this.waitForTimeout(),
    ]);

    return result;
  }

  /**
   * Wait for the child process to exit naturally.
   */
  private async waitForExit(): Promise<AgentCompletionResult> {
    // Start periodic status updates
    const statusInterval = setInterval(async () => {
      await this.updateStatus("coding");
    }, this.statusUpdateIntervalMs);

    try {
      // Bun.spawn provides .exited as a Promise<number>
      const exitCode = await this.process.exited;

      const success = exitCode === 0;
      const finalStatus = success ? "completed" : "failed";
      const stopReason = success
        ? "Process completed successfully"
        : `Process exited with code ${exitCode}`;

      console.log(
        `[local-agent] Process ${this.process.pid} exited. ` +
          `Exit code: ${exitCode}`,
      );

      await this.completeRun(finalStatus, stopReason);

      return {
        success,
        exitCode,
        stopReason,
        finalStatus,
      };
    } finally {
      clearInterval(statusInterval);
    }
  }

  /**
   * Wait for the timeout to expire, then kill the process.
   */
  private async waitForTimeout(): Promise<AgentCompletionResult> {
    await new Promise((resolve) => setTimeout(resolve, this.timeoutMs));

    console.error(
      `[local-agent] Process ${this.process.pid} timed out after ` +
        `${Math.round(this.timeoutMs / 60000)} minutes. Killing process.`,
    );

    // Kill the process
    this.process.kill();

    const stopReason = `Timed out after ${Math.round(this.timeoutMs / 60000)} minutes`;
    await this.completeRun("failed", stopReason);

    return {
      success: false,
      exitCode: null,
      stopReason,
      finalStatus: "failed",
    };
  }

  // -------------------------------------------------------------------------
  // DynamoDB helpers
  // -------------------------------------------------------------------------

  private async updateStatus(
    status: "started" | "coding" | "completed" | "failed",
  ): Promise<void> {
    try {
      await dbUpdateAgentStatus({
        runId: this.agentRunId,
        status,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[local-agent] Failed to update status for run ${this.agentRunId}: ${message}`,
      );
    }
  }

  private async completeRun(
    status: "completed" | "failed",
    stopReason: string,
  ): Promise<void> {
    try {
      await dbCompleteAgentRun({
        runId: this.agentRunId,
        status,
        outputSummary: stopReason,
        errorMessage: status === "failed" ? stopReason : undefined,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[local-agent] Failed to complete run ${this.agentRunId}: ${message}`,
      );
    }
  }
}
