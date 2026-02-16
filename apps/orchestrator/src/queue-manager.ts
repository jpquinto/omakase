/**
 * queue-manager.ts -- Wraps the DynamoDB agent-queues repository with
 * orchestrator-level logic for auto-starting work sessions when an idle
 * agent's queue receives a new job.
 *
 * The AgentQueueManager is the single point of contact for all queue
 * operations. Route handlers call into it; it delegates to the DynamoDB
 * layer and coordinates with the WorkSessionManager to process queued
 * jobs when agents become available.
 */

import {
  enqueueJob,
  dequeueJob,
  peekJob,
  removeJob,
  reorderJob,
  listQueue,
  getQueueDepth,
  markJobCompleted,
  markJobFailed,
  getProject,
  getWorkspace,
} from "@omakase/dynamodb";
import type { QueuedJob, AgentName } from "@omakase/db";
import type { WorkSessionManager } from "./work-session-manager.js";
import { isGitHubAppConfigured, getInstallationToken } from "./github-app.js";

// ---------------------------------------------------------------------------
// AgentQueueManager
// ---------------------------------------------------------------------------

export class AgentQueueManager {
  /**
   * Reference to the WorkSessionManager, set after both managers are
   * instantiated (avoids circular constructor dependencies).
   */
  private sessionManager: WorkSessionManager | null = null;

  /** Wire up the session manager so processNext() can start work sessions. */
  setSessionManager(manager: WorkSessionManager): void {
    this.sessionManager = manager;
  }

  // -------------------------------------------------------------------------
  // Queue operations
  // -------------------------------------------------------------------------

  /**
   * Add a job to an agent's queue. If the agent is currently idle (no
   * active work session) the job is dequeued and a work session is
   * started immediately.
   *
   * @returns The new jobId and its position in the queue.
   */
  async enqueue(params: {
    agentName: AgentName;
    projectId: string;
    prompt: string;
    threadId?: string;
    featureId?: string;
    queuedBy: "user" | "auto";
  }): Promise<{ jobId: string; position: number }> {
    const now = new Date().toISOString();

    const job = await enqueueJob({
      agentName: params.agentName,
      projectId: params.projectId,
      prompt: params.prompt,
      threadId: params.threadId,
      featureId: params.featureId,
      queuedBy: params.queuedBy,
      status: "queued",
      queuedAt: now,
      position: 0, // overwritten by enqueueJob
    });

    console.log(
      `[queue-manager] Enqueued job ${job.jobId} for ${params.agentName} (position=${job.position}, queuedBy=${params.queuedBy})`,
    );

    // If the agent is idle, kick off processing immediately
    if (this.isAgentIdle(params.agentName)) {
      console.log(`[queue-manager] Agent ${params.agentName} is idle — processing immediately`);
      // Fire-and-forget; errors are logged inside processNext
      this.processNext(params.agentName).catch((err) =>
        console.error(`[queue-manager] Immediate processNext failed:`, err),
      );
    }

    return { jobId: job.jobId, position: job.position };
  }

  /** Dequeue the next queued job for an agent, marking it as "processing". */
  async dequeue(agentName: AgentName): Promise<QueuedJob | null> {
    return dequeueJob(agentName);
  }

  /** Peek at the next queued job without changing its status. */
  async peek(agentName: AgentName): Promise<QueuedJob | null> {
    return peekJob(agentName);
  }

  /** Remove a specific job from an agent's queue. */
  async remove(agentName: AgentName, jobId: string): Promise<void> {
    await removeJob(agentName, jobId);
    console.log(`[queue-manager] Removed job ${jobId} from ${agentName} queue`);
  }

  /** Move a job to a new position in the queue. */
  async reorder(agentName: AgentName, jobId: string, newPosition: number): Promise<void> {
    await reorderJob(agentName, jobId, newPosition);
    console.log(`[queue-manager] Reordered job ${jobId} in ${agentName} queue to position ${newPosition}`);
  }

  /** List all queued jobs for an agent, ordered by position ascending. */
  async getQueue(agentName: AgentName): Promise<QueuedJob[]> {
    return listQueue(agentName);
  }

  /** Return the count of queued jobs for an agent. */
  async getQueueDepth(agentName: AgentName): Promise<number> {
    return getQueueDepth(agentName);
  }

  // -------------------------------------------------------------------------
  // Processing — bridge between queue and work sessions
  // -------------------------------------------------------------------------

  /**
   * Dequeue the next job for an agent and start a work session for it.
   * Called either:
   *   - Immediately after enqueue() when the agent is idle
   *   - Via the onSessionComplete callback when a session finishes
   */
  async processNext(agentName: AgentName): Promise<void> {
    if (!this.sessionManager) {
      console.warn("[queue-manager] processNext called but no sessionManager is set");
      return;
    }

    const job = await this.dequeue(agentName);
    if (!job) {
      console.log(`[queue-manager] No queued jobs for ${agentName}`);
      return;
    }

    console.log(
      `[queue-manager] Processing next job for ${agentName}: jobId=${job.jobId} prompt="${job.prompt.slice(0, 80)}"`,
    );

    try {
      // Create a thread if the job doesn't already have one
      let threadId = job.threadId;
      if (!threadId) {
        const { createThread } = await import("@omakase/dynamodb");
        const thread = await createThread({
          agentName,
          projectId: job.projectId,
          title: job.prompt.slice(0, 80),
          mode: "work",
        });
        threadId = thread.threadId;
        console.log(`[queue-manager] Created thread ${threadId} for queued job ${job.jobId}`);
      }

      // Resolve project repo URL and GitHub token for workspace setup
      const projectId = job.projectId !== "general" ? job.projectId : undefined;
      let repoUrl: string | undefined;
      let githubToken: string | undefined;

      if (projectId) {
        const project = await getProject({ projectId });
        if (project) {
          repoUrl = project.repoUrl;
          if (project.githubInstallationId && isGitHubAppConfigured()) {
            try {
              githubToken = await getInstallationToken(project.githubInstallationId);
            } catch (err) {
              console.warn(`[queue-manager] Failed to get GitHub installation token:`, err);
            }
          }
        }
      }

      // Start a work session
      const result = await this.sessionManager.startSession({
        agentName,
        projectId,
        threadId,
        prompt: job.prompt,
        repoUrl,
        githubToken,
      });

      console.log(`[queue-manager] Work session started: runId=${result.runId} status=${result.status}`);
      await markJobCompleted(agentName, job.jobId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[queue-manager] Failed to process job ${job.jobId}:`, message);
      await markJobFailed(agentName, job.jobId, message);
    }
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /** Check whether an agent currently has an active work session. */
  private isAgentIdle(agentName: AgentName): boolean {
    if (!this.sessionManager) return false;
    const sessions = this.sessionManager.listSessions(agentName);
    return sessions.length === 0;
  }
}
