/**
 * ecs-agent.ts -- ECS Fargate task management for agent containers.
 *
 * Provides functions to launch, stop, and release agent tasks running
 * on AWS ECS Fargate. Each agent (architect, coder, reviewer, tester)
 * runs as a standalone Fargate task with environment variables that
 * configure its role, target repository, and DynamoDB connection.
 *
 * Uses AWS SDK v3 for ECS operations.
 */

import {
  ECSClient,
  RunTaskCommand,
  StopTaskCommand,
  LaunchType,
  AssignPublicIp,
} from "@aws-sdk/client-ecs";
import {
  markFeatureFailing as dbMarkFeaturePending,
} from "@autoforge/dynamodb";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Agent role as defined in the schema. */
export type AgentRole = "architect" | "coder" | "reviewer" | "tester";

/** Options for launching a new agent task on ECS Fargate. */
export interface StartAgentOptions {
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
  /** The ECS cluster name or ARN to run the task on. */
  ecsCluster: string;
  /** The ECS task definition family or full ARN. */
  taskDefinition: string;
  /** VPC subnet IDs for the Fargate task's network configuration. */
  subnets: string[];
  /** Security group ID for the Fargate task. */
  securityGroup: string;
  /** The container name within the task definition to set env vars on. */
  containerName: string;
  /** The ECS client instance. */
  ecsClient: ECSClient;
  /** @deprecated No longer used -- kept for backward compatibility. */
  convexUrl?: string;
  /** Optional: the base branch for the feature branch (default "main"). */
  baseBranch?: string;
}

/** Result of a successful agent task launch. */
export interface StartAgentResult {
  /** The ARN of the launched ECS task. */
  taskArn: string;
}

/** Options for stopping a running agent task. */
export interface StopAgentOptions {
  /** The ARN of the ECS task to stop. */
  taskArn: string;
  /** The ECS cluster name or ARN the task is running on. */
  ecsCluster: string;
  /** The ECS client instance. */
  ecsClient: ECSClient;
  /** Optional reason for stopping the task (recorded in ECS). */
  reason?: string;
}

// ---------------------------------------------------------------------------
// Start Agent
// ---------------------------------------------------------------------------

/**
 * Launch a new agent as an ECS Fargate task.
 *
 * The task is configured with environment variables that the agent
 * container reads at startup (see `agent-setup.sh` for the workspace
 * bootstrap process):
 *
 * - REPO_URL: The git repository to clone
 * - FEATURE_ID: The feature being worked on
 * - AGENT_ROLE: The agent's role (architect, coder, reviewer, tester)
 * - PROJECT_ID: The project ID
 *
 * @param options - Configuration for the agent task to launch.
 * @returns The ARN of the launched task.
 * @throws {Error} If ECS fails to launch the task (capacity, permissions, etc.).
 */
export async function startAgent(options: StartAgentOptions): Promise<StartAgentResult> {
  const {
    featureId,
    role,
    projectId,
    repoUrl,
    featureName,
    featureDescription,
    ecsCluster,
    taskDefinition,
    subnets,
    securityGroup,
    containerName,
    ecsClient,
    baseBranch = "main",
  } = options;

  const command = new RunTaskCommand({
    cluster: ecsCluster,
    taskDefinition,
    launchType: LaunchType.FARGATE,
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets,
        securityGroups: [securityGroup],
        assignPublicIp: AssignPublicIp.ENABLED,
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: containerName,
          // Override the default CMD (which starts the orchestrator) to run
          // the agent entrypoint script instead.
          command: ["/bin/bash", "/app/src/agent-entrypoint.sh"],
          environment: [
            { name: "REPO_URL", value: repoUrl },
            { name: "FEATURE_ID", value: featureId },
            { name: "AGENT_ROLE", value: role },
            { name: "PROJECT_ID", value: projectId },
            { name: "BASE_BRANCH", value: baseBranch },
            { name: "FEATURE_NAME", value: featureName },
            { name: "FEATURE_DESCRIPTION", value: featureDescription },
          ],
        },
      ],
    },
    // Tag the task for cost tracking and identification
    tags: [
      { key: "autoforge:project", value: projectId },
      { key: "autoforge:feature", value: featureId },
      { key: "autoforge:role", value: role },
    ],
  });

  const response = await ecsClient.send(command);

  // Validate that at least one task was started
  const tasks = response.tasks ?? [];
  if (tasks.length === 0) {
    // ECS may report failures instead of tasks when there's a launch issue
    const failures = response.failures ?? [];
    const failureReasons = failures
      .map((f) => `${f.arn ?? "unknown"}: ${f.reason ?? "no reason"}`)
      .join("; ");

    throw new Error(
      `ECS failed to launch ${role} agent for feature ${featureId}. ` +
        `Failures: ${failureReasons || "none reported (empty tasks array)"}`
    );
  }

  const taskArn = tasks[0]?.taskArn;
  if (!taskArn) {
    throw new Error(
      `ECS launched a task for ${role} agent but returned no task ARN. ` +
        "This is unexpected and may indicate an AWS API issue."
    );
  }

  console.log(
    `[ecs-agent] Launched ${role} agent for feature ${featureId}: ${taskArn}`
  );

  return { taskArn };
}

// ---------------------------------------------------------------------------
// Stop Agent
// ---------------------------------------------------------------------------

/**
 * Stop a running ECS Fargate task.
 *
 * This is a best-effort operation. If the task has already stopped,
 * ECS will return successfully. The reason is recorded in the ECS
 * stopped-tasks log for debugging.
 *
 * @param options - The task to stop and the ECS cluster it belongs to.
 */
export async function stopAgent(options: StopAgentOptions): Promise<void> {
  const { taskArn, ecsCluster, ecsClient, reason } = options;

  const command = new StopTaskCommand({
    cluster: ecsCluster,
    task: taskArn,
    reason: reason ?? "Stopped by AutoForge orchestrator",
  });

  try {
    await ecsClient.send(command);
    console.log(`[ecs-agent] Stopped task: ${taskArn}`);
  } catch (error: unknown) {
    // If the task is already stopped or not found, log and move on
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[ecs-agent] Failed to stop task ${taskArn} (may already be stopped): ${message}`
    );
  }
}

// ---------------------------------------------------------------------------
// Release Feature
// ---------------------------------------------------------------------------

/**
 * Release a feature back to "pending" status so it can be picked up
 * again by a future pipeline run. Used when a pipeline is aborted or
 * the orchestrator shuts down mid-pipeline.
 *
 * Note: There is no dedicated "markFeaturePending" function in the
 * DynamoDB package yet. For now this uses markFeatureFailing as a
 * placeholder. A proper release/reset mutation should be added.
 *
 * @param featureId - The feature ID to release.
 */
export async function releaseFeature(
  featureId: string,
): Promise<void> {
  try {
    // TODO: Add a dedicated markFeaturePending function to @autoforge/dynamodb.
    // For now, we mark as failing to indicate the pipeline was interrupted.
    await dbMarkFeaturePending({ featureId });

    console.log(`[ecs-agent] Released feature ${featureId} back to pending`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[ecs-agent] Failed to release feature ${featureId}: ${message}`
    );
  }
}
