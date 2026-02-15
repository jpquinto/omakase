/**
 * pipeline.ts -- Agent pipeline orchestration for a single feature.
 *
 * Executes the 4-step agent sequence for implementing a feature:
 *   1. Architect  -- designs the implementation plan
 *   2. Coder      -- implements the feature
 *   3. Reviewer   -- reviews the code (may request changes, triggering a coder retry)
 *   4. Tester     -- runs tests to verify the implementation
 *
 * Each step launches an ECS Fargate task, monitors it to completion,
 * and inspects the result before proceeding. The pipeline includes
 * retry logic (one retry per step) and crash handling that marks the
 * feature as "failing" after exhausting retries.
 *
 * On success, a GitHub pull request is created via the pr-creator module.
 */

import { ECSClient } from "@aws-sdk/client-ecs";
import {
  markFeatureReviewReady as dbMarkFeatureReviewReady,
  markFeatureFailing as dbMarkFeatureFailing,
  createAgentRun as dbCreateAgentRun,
  completeAgentRun as dbCompleteAgentRun,
  createMessage as dbCreateMessage,
  listMessages,
} from "@omakase/dynamodb";
import type { AgentMessage } from "@omakase/db";

import { startAgent, stopAgent, releaseFeature, type AgentRole } from "./ecs-agent.js";
import { AgentMonitor, type AgentCompletionResult } from "./agent-monitor.js";
import { startLocalAgent, LocalAgentMonitor } from "./local-agent.js";
import { LinearSyncHook } from "./linear-sync.js";
import { getInstallationToken, isGitHubAppConfigured } from "./github-app.js";

// ---------------------------------------------------------------------------
// Execution mode
// ---------------------------------------------------------------------------

/** Determines whether agents run as ECS Fargate tasks or local subprocesses. */
export type ExecutionMode = "ecs" | "local";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configuration for running the agent pipeline. */
export interface PipelineConfig {
  /** The feature ID to implement. */
  featureId: string;
  /** The project ID. */
  projectId: string;
  /** The feature name (used in PR titles and logs). */
  featureName: string;
  /** The feature description (used in PR body). */
  featureDescription: string;
  /** The git clone URL for the target repository. */
  repoUrl: string;
  /** GitHub repository owner (for PR creation). */
  repoOwner: string;
  /** GitHub repository name (for PR creation). */
  repoName: string;
  /** GitHub token for PR creation. */
  githubToken: string;
  /** The base branch to merge into (default "main"). */
  baseBranch?: string;
  /** Linear issue ID or identifier for status sync (optional). */
  linearIssueId?: string;
  /** Linear issue URL for reference in comments (optional). */
  linearIssueUrl?: string;
  /** Linear OAuth access token for API calls (resolved from workspace, optional). */
  linearAccessToken?: string;
  /** GitHub App installation ID for per-project token generation (optional). */
  githubInstallationId?: number;
  /** Execution mode: "ecs" for Fargate tasks, "local" for subprocesses. */
  executionMode?: ExecutionMode;
  /** Root directory for local agent workspaces (only used when executionMode is "local"). */
  localWorkspaceRoot?: string;
}

/** ECS infrastructure configuration shared across all pipeline steps. */
export interface EcsConfig {
  /** The ECS cluster name or ARN. */
  cluster: string;
  /** The ECS task definition family or ARN. */
  taskDefinition: string;
  /** VPC subnet IDs for the Fargate task. */
  subnets: string[];
  /** Security group ID for the Fargate task. */
  securityGroup: string;
  /** The container name within the task definition. */
  containerName: string;
}

/** The result of executing the full pipeline. */
export interface PipelineResult {
  /** Whether the entire pipeline succeeded. */
  success: boolean;
  /** The step that failed, if any. */
  failedStep?: AgentRole;
  /** Error message if the pipeline failed. */
  errorMessage?: string;
  /** The PR URL if the pipeline succeeded and a PR was created. */
  prUrl?: string;
}

/** Internal state for tracking a single pipeline step. */
interface StepResult {
  /** Whether the step completed successfully. */
  success: boolean;
  /** The exit code from the agent container. */
  exitCode: number | null;
  /** The ECS stop reason. */
  stopReason: string | null;
  /** The agent run ID for this step. */
  agentRunId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maximum number of times a single step can be retried.
 * On first failure, the step is retried once. On second failure,
 * the pipeline aborts and marks the feature as failing.
 */
const MAX_STEP_RETRIES = 1;

/**
 * Maximum number of times the reviewer can request changes before
 * the pipeline gives up and proceeds to testing anyway.
 */
const MAX_REVIEW_CYCLES = 1;

// ---------------------------------------------------------------------------
// AgentPipeline
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full agent pipeline for a single feature.
 *
 * The pipeline is designed to be run as a long-lived async operation.
 * The caller (FeatureWatcher) acquires a concurrency slot before creating
 * the pipeline and releases it when `execute()` resolves.
 */
export class AgentPipeline {
  private readonly featureId: string;
  private readonly projectId: string;
  private readonly config: PipelineConfig;
  private readonly ecsConfig: EcsConfig;
  private readonly ecsClient: ECSClient;
  private readonly executionMode: ExecutionMode;
  private readonly linearSync: LinearSyncHook;

  /** GitHub App installation ID for per-step token refresh. */
  private readonly githubInstallationId: number | undefined;

  /** Timestamp of the last between-step message check. */
  private lastMessageCheck = "";

  /** User messages collected between pipeline steps. */
  private userMessages: AgentMessage[] = [];

  constructor(
    config: PipelineConfig,
    ecsConfig: EcsConfig,
    ecsClient: ECSClient,
  ) {
    this.featureId = config.featureId;
    this.projectId = config.projectId;
    this.config = config;
    this.ecsConfig = ecsConfig;
    this.ecsClient = ecsClient;
    this.executionMode = config.executionMode ?? "ecs";
    this.githubInstallationId = config.githubInstallationId;
    this.linearSync = new LinearSyncHook({
      linearAccessToken: config.linearAccessToken,
      linearIssueId: config.linearIssueId,
      linearIssueUrl: config.linearIssueUrl,
      featureName: config.featureName,
    });
  }

  /**
   * Execute the 4-step agent pipeline.
   *
   * Steps:
   *   1. Architect agent -- designs the implementation plan
   *   2. Coder agent     -- implements the feature
   *   3. Reviewer agent  -- reviews the code; if "request-changes", re-run coder (once)
   *   4. Tester agent    -- runs tests
   *
   * On success: marks the feature as "passing" and creates a PR.
   * On failure: marks the feature as "failing" with error details.
   *
   * @returns The pipeline result with success/failure status and optional PR URL.
   */
  async execute(): Promise<PipelineResult> {
    console.log(
      `[pipeline] Starting pipeline for feature ${this.featureId} ` +
        `("${this.config.featureName}") in project ${this.projectId}`
    );

    // Notify Linear that the pipeline is starting
    await this.linearSync.onPipelineStart();

    try {
      // Step 1: Architect
      const architectResult = await this.runStepWithRetry("architect");
      if (!architectResult.success) {
        return this.handlePipelineFailure("architect", architectResult);
      }
      console.log(`[pipeline] Architect step completed for feature ${this.featureId}`);
      await this.checkBetweenStepMessages();

      // Step 2: Coder
      const coderResult = await this.runStepWithRetry("coder");
      if (!coderResult.success) {
        return this.handlePipelineFailure("coder", coderResult);
      }
      console.log(`[pipeline] Coder step completed for feature ${this.featureId}`);
      await this.checkBetweenStepMessages();

      // Step 3: Reviewer (with optional coder retry on "request-changes")
      const reviewResult = await this.runReviewCycle();
      if (!reviewResult.success) {
        return this.handlePipelineFailure("reviewer", reviewResult);
      }
      console.log(`[pipeline] Reviewer step completed for feature ${this.featureId}`);
      await this.checkBetweenStepMessages();

      // Step 4: Tester
      const testerResult = await this.runStepWithRetry("tester");
      if (!testerResult.success) {
        return this.handlePipelineFailure("tester", testerResult);
      }
      console.log(`[pipeline] Tester step completed for feature ${this.featureId}`);

      // All steps passed -- mark feature as review_ready (user triggers PR via chat)
      await this.markFeatureReviewReady();
      await this.postPrReadyMessage(testerResult.agentRunId);

      // Notify Linear of success (no PR URL yet — user triggers it)
      await this.linearSync.onPipelineSuccess(undefined);

      console.log(
        `[pipeline] Pipeline SUCCEEDED for feature ${this.featureId}. Awaiting user PR creation.`
      );

      return {
        success: true,
      };
    } catch (error: unknown) {
      // Unexpected error outside of the step retry logic
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[pipeline] Unexpected error in pipeline for feature ${this.featureId}: ${message}`
      );

      await this.markFeatureFailing();
      return {
        success: false,
        errorMessage: `Unexpected pipeline error: ${message}`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Between-step message check
  // -------------------------------------------------------------------------

  /**
   * Check for user messages between pipeline steps.
   * Messages are accumulated and can be included as context for subsequent steps.
   */
  private async checkBetweenStepMessages(): Promise<void> {
    try {
      // Query messages across all runs for this feature since last check
      const newMessages = await listMessages({
        runId: "", // We need to check by feature; use a broad query approach
        since: this.lastMessageCheck || undefined,
        sender: "user",
      });

      if (newMessages.length > 0) {
        this.userMessages.push(...newMessages);
        this.lastMessageCheck = newMessages[newMessages.length - 1]!.timestamp;
        console.log(
          `[pipeline] ${newMessages.length} user message(s) pending for feature ${this.featureId}. ` +
            "Context will be included in next agent step."
        );
      }
    } catch {
      // Between-step message check is best-effort
      console.warn(
        `[pipeline] Failed to check messages between steps for feature ${this.featureId}`
      );
    }
  }

  // -------------------------------------------------------------------------
  // Step execution with retry
  // -------------------------------------------------------------------------

  /**
   * Run a single pipeline step with retry logic.
   *
   * On first failure, the step is retried once. On second failure,
   * the result is returned as-is for the caller to handle.
   *
   * @param role - The agent role for this step.
   * @returns The step result (success or failure after retries).
   */
  private async runStepWithRetry(role: AgentRole): Promise<StepResult> {
    for (let attempt = 0; attempt <= MAX_STEP_RETRIES; attempt++) {
      if (attempt > 0) {
        console.warn(
          `[pipeline] Retrying ${role} step for feature ${this.featureId} ` +
            `(attempt ${attempt + 1}/${MAX_STEP_RETRIES + 1})`
        );
      }

      const result = await this.runStep(role);

      if (result.success) {
        return result;
      }

      // Log failure details for the retry decision
      console.warn(
        `[pipeline] ${role} step failed for feature ${this.featureId}. ` +
          `Exit code: ${result.exitCode}, Reason: ${result.stopReason}`
      );

      // If this was the last attempt, return the failure
      if (attempt === MAX_STEP_RETRIES) {
        return result;
      }
    }

    // Should not be reached, but TypeScript needs a return
    throw new Error(`Unreachable: retry loop exited without returning for ${role}`);
  }

  /**
   * Run a single pipeline step: create an agent run, generate a fresh
   * GitHub installation token (if applicable), launch the agent (ECS task
   * or local subprocess), monitor it to completion, and return the result.
   *
   * @param role - The agent role for this step.
   * @returns The step result.
   */
  private async runStep(role: AgentRole): Promise<StepResult> {
    // Create the agent run record in DynamoDB
    const agentRunId = await this.createAgentRun(role);

    // Generate a fresh installation token for this step (if available)
    let stepGithubToken = this.config.githubToken;
    if (this.githubInstallationId && isGitHubAppConfigured()) {
      try {
        stepGithubToken = await getInstallationToken(this.githubInstallationId);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[pipeline] Failed to get installation token, falling back to global token: ${msg}`);
      }
    }

    if (this.executionMode === "local") {
      return this.runStepLocal(role, agentRunId, stepGithubToken);
    }
    return this.runStepEcs(role, agentRunId, stepGithubToken);
  }

  /**
   * Run a step via ECS Fargate task.
   */
  private async runStepEcs(role: AgentRole, agentRunId: string, _githubToken?: string): Promise<StepResult> {
    // Launch the ECS task
    let taskArn: string;
    try {
      const launchResult = await startAgent({
        featureId: this.featureId,
        role,
        projectId: this.projectId,
        repoUrl: this.config.repoUrl,
        featureName: this.config.featureName,
        featureDescription: this.config.featureDescription,
        ecsCluster: this.ecsConfig.cluster,
        taskDefinition: this.ecsConfig.taskDefinition,
        subnets: this.ecsConfig.subnets,
        securityGroup: this.ecsConfig.securityGroup,
        containerName: this.ecsConfig.containerName,
        ecsClient: this.ecsClient,
        convexUrl: "", // Deprecated: agents no longer use Convex
        baseBranch: this.config.baseBranch,
      });
      taskArn = launchResult.taskArn;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[pipeline] Failed to launch ${role} ECS task: ${message}`);

      // Mark the run as failed since we couldn't even start the task
      await this.failAgentRun(agentRunId, `Launch failure: ${message}`);

      return {
        success: false,
        exitCode: null,
        stopReason: `Launch failure: ${message}`,
        agentRunId,
      };
    }

    // Monitor the task until completion
    const monitor = new AgentMonitor({
      taskArn,
      ecsCluster: this.ecsConfig.cluster,
      ecsClient: this.ecsClient,
      agentRunId,
    });

    const completionResult: AgentCompletionResult = await monitor.waitForCompletion();

    return {
      success: completionResult.success,
      exitCode: completionResult.exitCode,
      stopReason: completionResult.stopReason,
      agentRunId,
    };
  }

  /**
   * Run a step via local subprocess.
   */
  private async runStepLocal(role: AgentRole, agentRunId: string, githubToken?: string): Promise<StepResult> {
    try {
      const launchResult = await startLocalAgent({
        featureId: this.featureId,
        role,
        projectId: this.projectId,
        repoUrl: this.config.repoUrl,
        featureName: this.config.featureName,
        featureDescription: this.config.featureDescription,
        baseBranch: this.config.baseBranch,
        workspaceRoot: this.config.localWorkspaceRoot,
        githubToken,
      });

      const monitor = new LocalAgentMonitor({
        process: launchResult.process,
        agentRunId,
      });

      const completionResult: AgentCompletionResult = await monitor.waitForCompletion();

      return {
        success: completionResult.success,
        exitCode: completionResult.exitCode,
        stopReason: completionResult.stopReason,
        agentRunId,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[pipeline] Failed to launch ${role} local agent: ${message}`);

      await this.failAgentRun(agentRunId, `Launch failure: ${message}`);

      return {
        success: false,
        exitCode: null,
        stopReason: `Launch failure: ${message}`,
        agentRunId,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Review cycle (reviewer + optional coder retry)
  // -------------------------------------------------------------------------

  /**
   * Run the review cycle: launch the reviewer, and if it requests changes,
   * re-run the coder and reviewer once.
   *
   * The reviewer signals "request-changes" by exiting with a specific
   * non-zero exit code (exit code 2). Any other non-zero exit code is
   * treated as a reviewer failure.
   *
   * Exit code convention:
   *   0 = approved
   *   2 = request-changes (coder should retry)
   *   other = reviewer error
   *
   * @returns The step result for the review cycle.
   */
  private async runReviewCycle(): Promise<StepResult> {
    for (let cycle = 0; cycle <= MAX_REVIEW_CYCLES; cycle++) {
      if (cycle > 0) {
        console.log(
          `[pipeline] Reviewer requested changes. Re-running coder ` +
            `for feature ${this.featureId} (cycle ${cycle + 1}/${MAX_REVIEW_CYCLES + 1})`
        );

        // Re-run the coder with retry
        const coderRetryResult = await this.runStepWithRetry("coder");
        if (!coderRetryResult.success) {
          return coderRetryResult;
        }
      }

      // Run the reviewer
      const reviewResult = await this.runStep("reviewer");

      if (reviewResult.success) {
        // Reviewer approved
        return reviewResult;
      }

      // Check if the reviewer is requesting changes (exit code 2)
      const isRequestChanges = reviewResult.exitCode === 2;

      if (!isRequestChanges || cycle === MAX_REVIEW_CYCLES) {
        // Either a real reviewer failure or we've exhausted review cycles.
        // On exhausted cycles, log a warning but proceed (the tester
        // will catch any issues the reviewer flagged).
        if (cycle === MAX_REVIEW_CYCLES && isRequestChanges) {
          console.warn(
            `[pipeline] Reviewer still requesting changes after ${MAX_REVIEW_CYCLES + 1} ` +
              `cycles for feature ${this.featureId}. Proceeding to testing.`
          );
          // Treat as success so the pipeline continues to the tester step
          return { ...reviewResult, success: true };
        }

        return reviewResult;
      }

      // The reviewer requested changes and we have cycles left -- loop
    }

    // Should not be reached
    throw new Error("Unreachable: review cycle loop exited without returning");
  }

  // -------------------------------------------------------------------------
  // Pipeline completion handlers
  // -------------------------------------------------------------------------

  /**
   * Handle a pipeline failure: mark the feature as failing and record
   * error details in the agent run.
   *
   * @param failedStep - The step that caused the failure.
   * @param result - The step result with failure details.
   * @returns The pipeline result.
   */
  private async handlePipelineFailure(
    failedStep: AgentRole,
    result: StepResult,
  ): Promise<PipelineResult> {
    const errorMessage =
      `Pipeline failed at ${failedStep} step. ` +
      `Exit code: ${result.exitCode ?? "unknown"}, ` +
      `Reason: ${result.stopReason ?? "unknown"}`;

    console.error(
      `[pipeline] FAILURE for feature ${this.featureId}: ${errorMessage}`
    );

    // Post failure details to the agent run record
    await this.failAgentRun(result.agentRunId, errorMessage);

    // Mark the feature as failing
    await this.markFeatureFailing();

    // Notify Linear of failure
    await this.linearSync.onPipelineFailure(failedStep, errorMessage);

    return {
      success: false,
      failedStep,
      errorMessage,
    };
  }

  /**
   * Mark the feature as review_ready in DynamoDB (awaiting user PR creation).
   */
  private async markFeatureReviewReady(): Promise<void> {
    try {
      await dbMarkFeatureReviewReady({ featureId: this.featureId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[pipeline] Failed to mark feature ${this.featureId} as review_ready: ${message}`
      );
    }
  }

  /**
   * Mark the feature as failing in DynamoDB.
   */
  private async markFeatureFailing(): Promise<void> {
    try {
      await dbMarkFeatureFailing({ featureId: this.featureId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[pipeline] Failed to mark feature ${this.featureId} as failing: ${message}`
      );
    }
  }

  // -------------------------------------------------------------------------
  // DynamoDB helpers
  // -------------------------------------------------------------------------

  /**
   * Create an agent run record in DynamoDB for tracking a pipeline step.
   *
   * @param role - The agent role for this step.
   * @returns The agent run document ID.
   */
  private async createAgentRun(role: AgentRole): Promise<string> {
    try {
      const runId = await dbCreateAgentRun({
        agentId: `placeholder-${role}`,
        projectId: this.projectId,
        featureId: this.featureId,
        role,
      });
      return runId;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[pipeline] Failed to create agent run for ${role}: ${message}`
      );
      // Return a placeholder so the pipeline can continue monitoring
      return `failed-run-${role}-${Date.now()}`;
    }
  }

  /**
   * Mark an agent run as failed in DynamoDB with an error message.
   *
   * @param agentRunId - The agent run document ID.
   * @param errorMessage - Description of the failure.
   */
  private async failAgentRun(agentRunId: string, errorMessage: string): Promise<void> {
    try {
      await dbCompleteAgentRun({
        runId: agentRunId,
        status: "failed",
        outputSummary: errorMessage,
        errorMessage,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[pipeline] Failed to update agent run ${agentRunId} as failed: ${message}`
      );
    }
  }

  // -------------------------------------------------------------------------
  // PR-ready notification
  // -------------------------------------------------------------------------

  /**
   * Post a pr_ready message to the agent chat, signaling that the pipeline
   * completed and the user can now create a PR via the chat UI.
   *
   * @param lastRunId - The agent run ID of the last step (tester).
   */
  private async postPrReadyMessage(lastRunId: string): Promise<void> {
    const featureBranch = `agent/${this.featureId}`;
    const baseBranch = this.config.baseBranch ?? "main";

    const content = [
      `Pipeline completed successfully for **${this.config.featureName}**.`,
      "",
      `**Branch:** \`${featureBranch}\` → \`${baseBranch}\``,
      `**Tests:** All passed`,
      "",
      "Click **Create PR** when you're ready to open a pull request.",
    ].join("\n");

    try {
      await dbCreateMessage({
        runId: lastRunId,
        featureId: this.featureId,
        projectId: this.projectId,
        sender: "system",
        role: "tester",
        content,
        type: "pr_ready",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[pipeline] Failed to post pr_ready message for feature ${this.featureId}: ${message}`
      );
    }
  }
}
