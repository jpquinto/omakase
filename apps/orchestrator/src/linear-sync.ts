/**
 * linear-sync.ts -- Hook for syncing pipeline progress to Linear.
 *
 * The LinearSyncHook is instantiated per-pipeline and calls Linear's
 * GraphQL API to update issue status and post implementation comments
 * at key pipeline lifecycle points.
 *
 * All methods are no-ops if `linearAccessToken` or `linearIssueId` is
 * missing. All methods catch and log errors without throwing -- Linear
 * sync is non-critical and must not block the pipeline.
 */

import {
  syncFeatureStatusToLinear,
  postImplementationComment,
} from "@omakase/shared";

import type { AgentRole } from "./ecs-agent.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LinearSyncHookConfig {
  /** Linear OAuth access token (optional -- no-op if missing). */
  linearAccessToken?: string;
  /** Linear issue ID or identifier (optional -- no-op if missing). */
  linearIssueId?: string;
  /** Linear issue URL for reference in comments (optional). */
  linearIssueUrl?: string;
  /** Human-readable feature name for comments. */
  featureName: string;
}

// ---------------------------------------------------------------------------
// LinearSyncHook
// ---------------------------------------------------------------------------

export class LinearSyncHook {
  private readonly config: LinearSyncHookConfig;
  private readonly enabled: boolean;

  constructor(config: LinearSyncHookConfig) {
    this.config = config;
    this.enabled = Boolean(config.linearAccessToken && config.linearIssueId);
  }

  /**
   * Called when the pipeline starts executing.
   * Moves the Linear issue to "In Progress".
   */
  async onPipelineStart(): Promise<void> {
    if (!this.enabled) return;

    try {
      await syncFeatureStatusToLinear({
        linearIssueId: this.config.linearIssueId!,
        featureStatus: "in_progress",
        linearAccessToken: this.config.linearAccessToken!,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[linear-sync] Failed to sync pipeline start: ${message}`);
    }
  }

  /**
   * Called when the pipeline completes successfully.
   * Moves the Linear issue to "Done" and posts a success comment.
   */
  async onPipelineSuccess(prUrl?: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await syncFeatureStatusToLinear({
        linearIssueId: this.config.linearIssueId!,
        featureStatus: "passing",
        linearAccessToken: this.config.linearAccessToken!,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[linear-sync] Failed to sync passing status: ${message}`);
    }

    try {
      await postImplementationComment({
        linearIssueId: this.config.linearIssueId!,
        agentName: "Omakase Pipeline",
        featureName: this.config.featureName,
        prUrl,
        summary: "All pipeline steps completed successfully (architect, coder, reviewer, tester).",
        testResults: "All tests passed.",
        linearAccessToken: this.config.linearAccessToken!,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[linear-sync] Failed to post success comment: ${message}`);
    }
  }

  /**
   * Called when the pipeline fails at a step.
   * Moves the Linear issue to "In Review" and posts a failure comment.
   */
  async onPipelineFailure(failedStep: AgentRole, errorMessage: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await syncFeatureStatusToLinear({
        linearIssueId: this.config.linearIssueId!,
        featureStatus: "failing",
        linearAccessToken: this.config.linearAccessToken!,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[linear-sync] Failed to sync failing status: ${message}`);
    }

    try {
      await postImplementationComment({
        linearIssueId: this.config.linearIssueId!,
        agentName: "Omakase Pipeline",
        featureName: this.config.featureName,
        summary: `Pipeline failed at the **${failedStep}** step.\n\n${errorMessage}`,
        linearAccessToken: this.config.linearAccessToken!,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[linear-sync] Failed to post failure comment: ${message}`);
    }
  }
}
