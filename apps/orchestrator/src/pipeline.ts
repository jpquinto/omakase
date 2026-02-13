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
import { ConvexHttpClient } from "convex/browser";

import { startAgent, stopAgent, releaseFeature, type AgentRole } from "./ecs-agent.js";
import { AgentMonitor, type AgentCompletionResult } from "./agent-monitor.js";
import { createPullRequest, buildPrBody } from "./pr-creator.js";

// TODO: Replace with generated Convex API types once `npx convex codegen` is run.
// import { api } from "@autoforge/convex/_generated/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configuration for running the agent pipeline. */
export interface PipelineConfig {
  /** The Convex feature ID to implement. */
  featureId: string;
  /** The Convex project ID. */
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
  /** The Convex deployment URL. */
  convexUrl: string;
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
  /** The Convex agent run ID for this step. */
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
  private readonly convex: ConvexHttpClient;

  constructor(
    config: PipelineConfig,
    ecsConfig: EcsConfig,
    ecsClient: ECSClient,
    convex: ConvexHttpClient,
  ) {
    this.featureId = config.featureId;
    this.projectId = config.projectId;
    this.config = config;
    this.ecsConfig = ecsConfig;
    this.ecsClient = ecsClient;
    this.convex = convex;
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

    try {
      // Step 1: Architect
      const architectResult = await this.runStepWithRetry("architect");
      if (!architectResult.success) {
        return this.handlePipelineFailure("architect", architectResult);
      }
      console.log(`[pipeline] Architect step completed for feature ${this.featureId}`);

      // Step 2: Coder
      const coderResult = await this.runStepWithRetry("coder");
      if (!coderResult.success) {
        return this.handlePipelineFailure("coder", coderResult);
      }
      console.log(`[pipeline] Coder step completed for feature ${this.featureId}`);

      // Step 3: Reviewer (with optional coder retry on "request-changes")
      const reviewResult = await this.runReviewCycle();
      if (!reviewResult.success) {
        return this.handlePipelineFailure("reviewer", reviewResult);
      }
      console.log(`[pipeline] Reviewer step completed for feature ${this.featureId}`);

      // Step 4: Tester
      const testerResult = await this.runStepWithRetry("tester");
      if (!testerResult.success) {
        return this.handlePipelineFailure("tester", testerResult);
      }
      console.log(`[pipeline] Tester step completed for feature ${this.featureId}`);

      // All steps passed -- mark feature as passing and create PR
      await this.markFeaturePassing();
      const prUrl = await this.createPullRequest();

      console.log(
        `[pipeline] Pipeline SUCCEEDED for feature ${this.featureId}. PR: ${prUrl ?? "none"}`
      );

      return {
        success: true,
        prUrl: prUrl ?? undefined,
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
   * Run a single pipeline step: create an agent run, launch the ECS task,
   * monitor it to completion, and return the result.
   *
   * @param role - The agent role for this step.
   * @returns The step result.
   */
  private async runStep(role: AgentRole): Promise<StepResult> {
    // Create the agent run record in Convex
    const agentRunId = await this.createAgentRun(role);

    // Launch the ECS task
    let taskArn: string;
    try {
      const launchResult = await startAgent({
        featureId: this.featureId,
        role,
        projectId: this.projectId,
        repoUrl: this.config.repoUrl,
        ecsCluster: this.ecsConfig.cluster,
        taskDefinition: this.ecsConfig.taskDefinition,
        subnets: this.ecsConfig.subnets,
        securityGroup: this.ecsConfig.securityGroup,
        containerName: this.ecsConfig.containerName,
        ecsClient: this.ecsClient,
        convexUrl: this.ecsConfig.convexUrl,
        baseBranch: this.config.baseBranch,
      });
      taskArn = launchResult.taskArn;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[pipeline] Failed to launch ${role} task: ${message}`);

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
      convex: this.convex,
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

    return {
      success: false,
      failedStep,
      errorMessage,
    };
  }

  /**
   * Mark the feature as passing in Convex.
   */
  private async markFeaturePassing(): Promise<void> {
    try {
      // TODO: Replace with generated Convex API types.
      // e.g., await this.convex.mutation(api.features.markFeaturePassing, { featureId: this.featureId });
      const mutationRef = "features:markFeaturePassing" as unknown;
      await this.convex.mutation(
        mutationRef as never,
        { featureId: this.featureId } as never,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[pipeline] Failed to mark feature ${this.featureId} as passing: ${message}`
      );
    }
  }

  /**
   * Mark the feature as failing in Convex.
   */
  private async markFeatureFailing(): Promise<void> {
    try {
      // TODO: Replace with generated Convex API types.
      // e.g., await this.convex.mutation(api.features.markFeatureFailing, { featureId: this.featureId });
      const mutationRef = "features:markFeatureFailing" as unknown;
      await this.convex.mutation(
        mutationRef as never,
        { featureId: this.featureId } as never,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[pipeline] Failed to mark feature ${this.featureId} as failing: ${message}`
      );
    }
  }

  // -------------------------------------------------------------------------
  // Convex helpers
  // -------------------------------------------------------------------------

  /**
   * Create an agent run record in Convex for tracking a pipeline step.
   *
   * @param role - The agent role for this step.
   * @returns The Convex agent run document ID.
   */
  private async createAgentRun(role: AgentRole): Promise<string> {
    try {
      // TODO: Replace with generated Convex API types.
      // e.g., return await this.convex.mutation(api.agentRuns.createAgentRun, { ... });
      const mutationRef = "agentRuns:createAgentRun" as unknown;
      const runId = await this.convex.mutation(
        mutationRef as never,
        {
          // TODO: agentId should come from an agents table entry for this project.
          // For now, we pass a placeholder. The Convex mutation expects an Id<"agents">,
          // so this will need to be resolved once agents are pre-created per project.
          agentId: `placeholder-${role}` as never,
          projectId: this.projectId,
          featureId: this.featureId,
          role,
        } as never,
      );
      return runId as string;
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
   * Mark an agent run as failed in Convex with an error message.
   *
   * @param agentRunId - The Convex agent run document ID.
   * @param errorMessage - Description of the failure.
   */
  private async failAgentRun(agentRunId: string, errorMessage: string): Promise<void> {
    try {
      // TODO: Replace with generated Convex API types.
      // e.g., await this.convex.mutation(api.agentRuns.completeAgentRun, { ... });
      const mutationRef = "agentRuns:completeAgentRun" as unknown;
      await this.convex.mutation(
        mutationRef as never,
        {
          runId: agentRunId,
          status: "failed",
          outputSummary: errorMessage,
          errorMessage,
        } as never,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[pipeline] Failed to update agent run ${agentRunId} as failed: ${message}`
      );
    }
  }

  // -------------------------------------------------------------------------
  // PR creation
  // -------------------------------------------------------------------------

  /**
   * Create a GitHub pull request for the completed feature.
   *
   * @returns The PR URL, or null if PR creation failed (non-fatal).
   */
  private async createPullRequest(): Promise<string | null> {
    const { repoOwner, repoName, githubToken, baseBranch = "main" } = this.config;

    // Skip PR creation if GitHub credentials are not configured
    if (!githubToken || !repoOwner || !repoName) {
      console.warn(
        `[pipeline] Skipping PR creation for feature ${this.featureId}: ` +
          "GitHub credentials not configured."
      );
      return null;
    }

    const featureBranch = `agent/${this.featureId}`;

    const body = buildPrBody({
      featureDescription: this.config.featureDescription,
      // TODO: Extract actual summaries from agent run outputs once
      // CloudWatch log integration is available.
      implementationPlanSummary: "See branch for implementation details.",
      testResultsSummary: "All tests passed.",
    });

    try {
      const result = await createPullRequest({
        repoOwner,
        repoName,
        featureBranch,
        baseBranch,
        title: `feat: ${this.config.featureName}`,
        body,
        githubToken,
      });

      console.log(`[pipeline] PR created: ${result.url}`);
      return result.url;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[pipeline] Failed to create PR for feature ${this.featureId}: ${message}`
      );
      // PR creation failure is non-fatal -- the feature is already marked as passing
      return null;
    }
  }
}
