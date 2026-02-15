/**
 * feature-watcher.ts -- Polls DynamoDB for ready features and starts pipelines.
 *
 * The FeatureWatcher runs a continuous polling loop that:
 *   1. Queries DynamoDB for all active projects
 *   2. For each project, queries for features that are ready to work on
 *      (status "pending" with all dependencies met)
 *   3. Checks per-project concurrency limits
 *   4. Launches agent pipelines for ready features that fit within limits
 *
 * The watcher is the main driver of the orchestrator. It bridges the gap
 * between the DynamoDB data layer (features, projects) and the ECS compute
 * layer (agent pipelines).
 */

import { ECSClient } from "@aws-sdk/client-ecs";
import {
  listActiveProjects,
  getReadyFeatures,
} from "@omakase/dynamodb";

import { ConcurrencyManager } from "./concurrency.js";
import {
  AgentPipeline,
  type PipelineConfig,
  type EcsConfig,
  type ExecutionMode,
} from "./pipeline.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal project shape returned from the DynamoDB query. */
interface Project {
  id: string;
  name: string;
  status: "active" | "archived";
  repoUrl?: string;
  maxConcurrency: number;
  linearAccessToken?: string;
  linearTeamId?: string;
  githubInstallationId?: number;
  githubRepoOwner?: string;
  githubRepoName?: string;
  githubDefaultBranch?: string;
}

/** Minimal feature shape returned from the DynamoDB query. */
interface Feature {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  priority: number;
  status: string;
  dependencies: string[];
  linearIssueId?: string;
  linearIssueUrl?: string;
}

/** Configuration for the FeatureWatcher. */
export interface FeatureWatcherConfig {
  /** Polling interval in milliseconds (default: 30 seconds). */
  pollIntervalMs?: number;
  /** ECS infrastructure configuration. */
  ecsConfig: EcsConfig;
  /** GitHub token for PR creation (optional). */
  githubToken?: string;
  /** Execution mode: "ecs" for Fargate tasks, "local" for subprocesses (default: "ecs"). */
  executionMode?: ExecutionMode;
  /** Root directory for local agent workspaces (only used when executionMode is "local"). */
  localWorkspaceRoot?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_POLL_INTERVAL_MS = 30 * 1000; // 30 seconds

// ---------------------------------------------------------------------------
// FeatureWatcher
// ---------------------------------------------------------------------------

/**
 * Continuously polls DynamoDB for ready features and launches agent pipelines.
 *
 * The watcher is designed to be started once at orchestrator boot and
 * stopped on shutdown. It manages its own polling timer and delegates
 * pipeline execution to `AgentPipeline` instances.
 */
export class FeatureWatcher {
  private readonly ecsClient: ECSClient;
  private readonly concurrency: ConcurrencyManager;
  private readonly pollIntervalMs: number;
  private readonly ecsConfig: EcsConfig;
  private readonly githubToken: string | undefined;
  private readonly executionMode: ExecutionMode;
  private readonly localWorkspaceRoot: string | undefined;

  /** The polling timer handle, or null if stopped. */
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  /** Whether the watcher is actively polling. */
  private running = false;

  /** Whether a poll is currently in progress (prevents overlapping polls). */
  private polling = false;

  constructor(
    ecsClient: ECSClient,
    config: FeatureWatcherConfig,
  ) {
    this.ecsClient = ecsClient;
    this.ecsConfig = config.ecsConfig;
    this.githubToken = config.githubToken;
    this.executionMode = config.executionMode ?? "ecs";
    this.localWorkspaceRoot = config.localWorkspaceRoot;
    this.pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.concurrency = new ConcurrencyManager();
  }

  /**
   * Start the polling loop. Immediately runs the first poll, then
   * schedules subsequent polls at the configured interval.
   */
  start(): void {
    if (this.running) {
      console.warn("[feature-watcher] Already running. Ignoring start() call.");
      return;
    }

    this.running = true;
    console.log(
      `[feature-watcher] Starting. Polling every ${this.pollIntervalMs / 1000}s.`
    );

    // Run the first poll immediately
    void this.poll();

    // Schedule recurring polls
    this.schedulePoll();
  }

  /**
   * Stop the polling loop and clean up the timer.
   * Does not cancel in-flight pipelines (they will complete independently).
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.pollTimer !== null) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    console.log("[feature-watcher] Stopped.");
  }

  // -------------------------------------------------------------------------
  // Polling logic
  // -------------------------------------------------------------------------

  /**
   * Schedule the next poll after the configured interval.
   */
  private schedulePoll(): void {
    if (!this.running) {
      return;
    }

    this.pollTimer = setTimeout(() => {
      void this.poll();
      this.schedulePoll();
    }, this.pollIntervalMs);
  }

  /**
   * Execute a single poll cycle:
   *   1. Fetch active projects from DynamoDB
   *   2. For each project, fetch ready features
   *   3. Launch pipelines for features that fit within concurrency limits
   */
  private async poll(): Promise<void> {
    // Guard against overlapping polls (e.g., if a poll takes longer than the interval)
    if (this.polling) {
      console.log("[feature-watcher] Previous poll still in progress. Skipping.");
      return;
    }

    this.polling = true;

    try {
      const projects = await this.fetchActiveProjects();

      if (projects.length === 0) {
        console.log("[feature-watcher] No active projects found.");
        return;
      }

      let totalLaunched = 0;

      for (const project of projects) {
        // Skip projects without a repo URL (they can't run agents)
        if (!project.repoUrl) {
          continue;
        }

        const launched = await this.pollProject(project);
        totalLaunched += launched;
      }

      if (totalLaunched > 0) {
        console.log(`[feature-watcher] Launched ${totalLaunched} pipeline(s) this cycle.`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[feature-watcher] Poll error: ${message}`);
    } finally {
      this.polling = false;
    }
  }

  /**
   * Poll a single project for ready features and launch pipelines.
   *
   * @param project - The project to check for ready features.
   * @returns The number of pipelines launched.
   */
  private async pollProject(project: Project): Promise<number> {
    // Check if the project has capacity for more pipelines
    if (!this.concurrency.canStart(project.id, project.maxConcurrency)) {
      return 0;
    }

    // Fetch features that are ready to work on
    const readyFeatures = await this.fetchReadyFeatures(project.id);

    if (readyFeatures.length === 0) {
      return 0;
    }

    console.log(
      `[feature-watcher] Project "${project.name}": ` +
        `${readyFeatures.length} ready feature(s), ` +
        `${this.concurrency.getActiveCount(project.id)}/${project.maxConcurrency} active`
    );

    let launched = 0;

    // Sort by priority (lower number = higher priority)
    readyFeatures.sort((a, b) => a.priority - b.priority);

    for (const feature of readyFeatures) {
      // Re-check concurrency after each launch (it may have filled up)
      if (!this.concurrency.canStart(project.id, project.maxConcurrency)) {
        break;
      }

      // Skip features that already have active pipelines
      if (this.concurrency.isActive(project.id, feature.id)) {
        continue;
      }

      // Launch the pipeline (fire-and-forget; it runs independently)
      this.launchPipeline(project, feature);
      launched++;
    }

    return launched;
  }

  // -------------------------------------------------------------------------
  // Pipeline launch
  // -------------------------------------------------------------------------

  /**
   * Launch an agent pipeline for a feature. Acquires a concurrency slot,
   * runs the pipeline, and releases the slot when done.
   *
   * This method is intentionally fire-and-forget. Errors are logged but
   * do not propagate to the watcher loop.
   *
   * @param project - The project the feature belongs to.
   * @param feature - The feature to implement.
   */
  private launchPipeline(project: Project, feature: Feature): void {
    // Acquire concurrency slot before starting
    this.concurrency.acquire(project.id, feature.id);

    // Parse repo owner/name from the repo URL for PR creation
    const { owner: repoOwner, name: repoName } = parseRepoUrl(project.repoUrl ?? "");

    const pipelineConfig: PipelineConfig = {
      featureId: feature.id,
      projectId: project.id,
      featureName: feature.name,
      featureDescription: feature.description ?? "",
      repoUrl: project.repoUrl ?? "",
      repoOwner: project.githubRepoOwner ?? repoOwner,
      repoName: project.githubRepoName ?? repoName,
      githubToken: this.githubToken ?? "",
      baseBranch: project.githubDefaultBranch,
      linearIssueId: feature.linearIssueId,
      linearIssueUrl: feature.linearIssueUrl,
      linearAccessToken: project.linearAccessToken,
      githubInstallationId: project.githubInstallationId,
      executionMode: this.executionMode,
      localWorkspaceRoot: this.localWorkspaceRoot,
    };

    const pipeline = new AgentPipeline(
      pipelineConfig,
      this.ecsConfig,
      this.ecsClient,
    );

    // Run the pipeline asynchronously. Release the concurrency slot when done.
    pipeline
      .execute()
      .then((result) => {
        if (result.success) {
          console.log(
            `[feature-watcher] Pipeline succeeded for feature ${feature.id} ` +
              `("${feature.name}")${result.prUrl ? `. PR: ${result.prUrl}` : ""}`
          );
        } else {
          console.error(
            `[feature-watcher] Pipeline failed for feature ${feature.id} ` +
              `("${feature.name}"): ${result.errorMessage}`
          );
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `[feature-watcher] Unhandled pipeline error for feature ${feature.id}: ${message}`
        );
      })
      .finally(() => {
        this.concurrency.release(project.id, feature.id);
      });
  }

  // -------------------------------------------------------------------------
  // DynamoDB queries
  // -------------------------------------------------------------------------

  /**
   * Fetch all active projects from DynamoDB.
   *
   * @returns Array of active project documents.
   */
  private async fetchActiveProjects(): Promise<Project[]> {
    try {
      const projects = await listActiveProjects();
      return projects as Project[];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[feature-watcher] Failed to fetch projects: ${message}`);
      return [];
    }
  }

  /**
   * Fetch features that are ready to work on for a project.
   *
   * @param projectId - The project ID.
   * @returns Array of ready feature documents.
   */
  private async fetchReadyFeatures(projectId: string): Promise<Feature[]> {
    try {
      const features = await getReadyFeatures({ projectId });
      return features as Feature[];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[feature-watcher] Failed to fetch ready features for project ${projectId}: ${message}`
      );
      return [];
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a GitHub repository URL to extract the owner and name.
 *
 * Supports both HTTPS and SSH URL formats:
 *   - https://github.com/owner/repo.git
 *   - git@github.com:owner/repo.git
 *
 * @param url - The repository clone URL.
 * @returns The parsed owner and name, or empty strings if parsing fails.
 */
function parseRepoUrl(url: string): { owner: string; name: string } {
  const empty = { owner: "", name: "" };

  if (!url) {
    return empty;
  }

  // Try HTTPS format: https://github.com/owner/repo.git
  const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (httpsMatch) {
    return { owner: httpsMatch[1]!, name: httpsMatch[2]! };
  }

  // Try SSH format: git@github.com:owner/repo.git
  const sshMatch = url.match(/github\.com:([^/]+)\/([^/.]+)/);
  if (sshMatch) {
    return { owner: sshMatch[1]!, name: sshMatch[2]! };
  }

  console.warn(`[feature-watcher] Could not parse repo URL: ${url}`);
  return empty;
}
