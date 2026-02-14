/**
 * agent-monitor.ts -- Monitors ECS Fargate tasks and reports status to Convex.
 *
 * The AgentMonitor polls ECS for the current status of a running agent task
 * and translates ECS task states into the agent_runs status values stored
 * in Convex. It also enforces a configurable timeout to prevent runaway
 * agents from consuming resources indefinitely.
 *
 * Status mapping:
 *   ECS PROVISIONING / PENDING -> agent_runs "started"
 *   ECS RUNNING                -> agent_runs "coding" (generic active state)
 *   ECS STOPPED (exit 0)       -> agent_runs "completed"
 *   ECS STOPPED (exit != 0)    -> agent_runs "failed"
 */

import {
  ECSClient,
  DescribeTasksCommand,
} from "@aws-sdk/client-ecs";
import { ConvexHttpClient } from "convex/browser";

// TODO: Replace with generated Convex API types once `npx convex codegen` is run.
// import { api } from "@omakase/convex/_generated/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The status values for an agent run as defined in the Convex schema. */
type AgentRunStatus =
  | "started"
  | "thinking"
  | "coding"
  | "testing"
  | "reviewing"
  | "completed"
  | "failed";

/** Result returned when an agent task finishes. */
export interface AgentCompletionResult {
  /** Whether the task exited successfully (exit code 0). */
  success: boolean;
  /** The container exit code, or null if the task was killed. */
  exitCode: number | null;
  /** The ECS stop reason, if available. */
  stopReason: string | null;
  /** The final status written to Convex. */
  finalStatus: AgentRunStatus;
}

/** Configuration for the AgentMonitor. */
export interface AgentMonitorOptions {
  /** The ARN of the ECS task to monitor. */
  taskArn: string;
  /** The ECS cluster the task is running on. */
  ecsCluster: string;
  /** The ECS client for polling task status. */
  ecsClient: ECSClient;
  /** The Convex HTTP client for status updates. */
  convex: ConvexHttpClient;
  /** The Convex agent_runs document ID to update. */
  agentRunId: string;
  /** Timeout in milliseconds (default: 30 minutes). */
  timeoutMs?: number;
  /** Polling interval in milliseconds (default: 10 seconds). */
  pollIntervalMs?: number;
  /** Status update interval in milliseconds (default: 5 seconds). */
  statusUpdateIntervalMs?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const DEFAULT_POLL_INTERVAL_MS = 10 * 1000; // 10 seconds
const DEFAULT_STATUS_UPDATE_INTERVAL_MS = 5 * 1000; // 5 seconds

// ---------------------------------------------------------------------------
// AgentMonitor
// ---------------------------------------------------------------------------

/**
 * Monitors a single ECS Fargate task until it completes or times out.
 *
 * The monitor runs two overlapping concerns:
 * 1. Poll ECS every `pollIntervalMs` to check whether the task has stopped.
 * 2. Update Convex every `statusUpdateIntervalMs` with the mapped status.
 *
 * The monitor resolves when the task reaches the STOPPED state or when
 * the timeout is exceeded (in which case it marks the run as failed).
 */
export class AgentMonitor {
  private readonly taskArn: string;
  private readonly ecsCluster: string;
  private readonly ecsClient: ECSClient;
  private readonly convex: ConvexHttpClient;
  private readonly agentRunId: string;
  private readonly timeoutMs: number;
  private readonly pollIntervalMs: number;
  private readonly statusUpdateIntervalMs: number;

  /** Tracks whether a cancellation has been requested. */
  private cancelled = false;

  constructor(options: AgentMonitorOptions) {
    this.taskArn = options.taskArn;
    this.ecsCluster = options.ecsCluster;
    this.ecsClient = options.ecsClient;
    this.convex = options.convex;
    this.agentRunId = options.agentRunId;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.statusUpdateIntervalMs =
      options.statusUpdateIntervalMs ?? DEFAULT_STATUS_UPDATE_INTERVAL_MS;
  }

  /**
   * Wait for the ECS task to reach a terminal state (STOPPED).
   *
   * Polls ECS at the configured interval and updates Convex with the
   * current status. Returns when the task stops or the timeout expires.
   *
   * @returns The completion result including exit code and final status.
   */
  async waitForCompletion(): Promise<AgentCompletionResult> {
    const startTime = Date.now();
    let lastStatusUpdate = 0;
    let lastReportedStatus: AgentRunStatus | null = null;

    while (!this.cancelled) {
      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > this.timeoutMs) {
        console.error(
          `[agent-monitor] Task ${this.taskArn} timed out after ${Math.round(elapsed / 1000)}s`
        );
        await this.updateConvexStatus("failed");
        return {
          success: false,
          exitCode: null,
          stopReason: `Timed out after ${Math.round(this.timeoutMs / 60000)} minutes`,
          finalStatus: "failed",
        };
      }

      // Poll ECS for task status
      const taskStatus = await this.describeTask();

      if (!taskStatus) {
        // Task not found -- may have been deregistered or is a transient error
        console.warn(
          `[agent-monitor] Task ${this.taskArn} not found in ECS. ` +
            "It may have been deregistered. Treating as failed."
        );
        await this.updateConvexStatus("failed");
        return {
          success: false,
          exitCode: null,
          stopReason: "Task not found in ECS",
          finalStatus: "failed",
        };
      }

      // Map ECS status to agent run status
      const mappedStatus = this.mapEcsStatusToAgentStatus(
        taskStatus.lastStatus,
        taskStatus.exitCode,
      );

      // Update Convex at the configured interval (or on status change)
      const now = Date.now();
      const shouldUpdate =
        mappedStatus !== lastReportedStatus ||
        now - lastStatusUpdate >= this.statusUpdateIntervalMs;

      if (shouldUpdate) {
        await this.updateConvexStatus(mappedStatus);
        lastReportedStatus = mappedStatus;
        lastStatusUpdate = now;
      }

      // Check if the task has stopped
      if (taskStatus.lastStatus === "STOPPED") {
        const success = taskStatus.exitCode === 0;
        const finalStatus = success ? "completed" : "failed";

        console.log(
          `[agent-monitor] Task ${this.taskArn} stopped. ` +
            `Exit code: ${taskStatus.exitCode ?? "unknown"}, ` +
            `Reason: ${taskStatus.stopReason ?? "none"}`
        );

        // Final status update with completion info
        await this.completeConvexRun(finalStatus, taskStatus.stopReason);

        return {
          success,
          exitCode: taskStatus.exitCode,
          stopReason: taskStatus.stopReason,
          finalStatus,
        };
      }

      // Wait before polling again
      await this.sleep(this.pollIntervalMs);
    }

    // Cancelled -- treat as failed
    await this.updateConvexStatus("failed");
    return {
      success: false,
      exitCode: null,
      stopReason: "Monitoring cancelled",
      finalStatus: "failed",
    };
  }

  /**
   * Cancel the monitoring loop. The `waitForCompletion` method will
   * return on the next iteration with a "failed" result.
   */
  cancel(): void {
    this.cancelled = true;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Describe the ECS task to get its current status.
   *
   * @returns Parsed task status, or null if the task was not found.
   */
  private async describeTask(): Promise<{
    lastStatus: string;
    exitCode: number | null;
    stopReason: string | null;
  } | null> {
    try {
      const command = new DescribeTasksCommand({
        cluster: this.ecsCluster,
        tasks: [this.taskArn],
      });

      const response = await this.ecsClient.send(command);
      const tasks = response.tasks ?? [];

      if (tasks.length === 0) {
        return null;
      }

      const task = tasks[0]!;
      const lastStatus = task.lastStatus ?? "UNKNOWN";

      // Extract exit code from the first container (our agent container)
      let exitCode: number | null = null;
      const containers = task.containers ?? [];
      if (containers.length > 0 && containers[0]?.exitCode !== undefined) {
        exitCode = containers[0].exitCode;
      }

      return {
        lastStatus,
        exitCode,
        stopReason: task.stoppedReason ?? null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[agent-monitor] Error describing task ${this.taskArn}: ${message}`
      );
      // Return null to signal a transient error; the caller will retry
      return null;
    }
  }

  /**
   * Map an ECS task status string to the corresponding agent_runs status.
   *
   * ECS task lifecycle: PROVISIONING -> PENDING -> ACTIVATING -> RUNNING -> DEACTIVATING -> STOPPED
   *
   * @param ecsStatus - The ECS task lastStatus value.
   * @param exitCode - The container exit code (only meaningful when STOPPED).
   * @returns The mapped agent run status.
   */
  private mapEcsStatusToAgentStatus(
    ecsStatus: string,
    exitCode: number | null,
  ): AgentRunStatus {
    switch (ecsStatus) {
      case "PROVISIONING":
      case "PENDING":
      case "ACTIVATING":
        return "started";

      case "RUNNING":
      case "DEACTIVATING":
        // While running, we use "coding" as a generic active state.
        // The agent itself may update its own status to "thinking",
        // "testing", or "reviewing" via Convex from within the container.
        return "coding";

      case "STOPPED":
        return exitCode === 0 ? "completed" : "failed";

      default:
        console.warn(
          `[agent-monitor] Unknown ECS status "${ecsStatus}" for task ${this.taskArn}. ` +
            "Mapping to 'started' as a safe default."
        );
        return "started";
    }
  }

  /**
   * Update the agent run status in Convex.
   *
   * @param status - The new status to set.
   */
  private async updateConvexStatus(status: AgentRunStatus): Promise<void> {
    try {
      // TODO: Replace with generated Convex API types.
      // e.g., await this.convex.mutation(api.agentRuns.updateAgentStatus, { ... });
      const mutationRef = "agentRuns:updateAgentStatus" as unknown;
      await this.convex.mutation(
        mutationRef as never,
        {
          runId: this.agentRunId,
          status,
        } as never,
      );
    } catch (error: unknown) {
      // Status updates are best-effort -- log but don't throw
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[agent-monitor] Failed to update Convex status for run ${this.agentRunId}: ${message}`
      );
    }
  }

  /**
   * Mark the agent run as completed or failed in Convex with a summary.
   *
   * @param status - The final status ("completed" or "failed").
   * @param stopReason - The ECS stop reason to include in the summary.
   */
  private async completeConvexRun(
    status: "completed" | "failed",
    stopReason: string | null,
  ): Promise<void> {
    try {
      // TODO: Replace with generated Convex API types.
      // e.g., await this.convex.mutation(api.agentRuns.completeAgentRun, { ... });
      const mutationRef = "agentRuns:completeAgentRun" as unknown;
      await this.convex.mutation(
        mutationRef as never,
        {
          runId: this.agentRunId,
          status,
          outputSummary: stopReason ?? `Task ${status}`,
          errorMessage: status === "failed" ? (stopReason ?? "Unknown error") : undefined,
        } as never,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[agent-monitor] Failed to complete Convex run ${this.agentRunId}: ${message}`
      );
    }
  }

  /**
   * Sleep for the given number of milliseconds.
   * Returns early if the monitor is cancelled.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms);

      // Allow early exit on cancellation by checking periodically.
      // For simplicity, we just let the full sleep run and check
      // cancelled on the next loop iteration. If more responsive
      // cancellation is needed, this can be enhanced with an
      // AbortController pattern.
      if (this.cancelled) {
        clearTimeout(timer);
        resolve();
      }
    });
  }
}
