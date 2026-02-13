/**
 * pr-creator.ts -- GitHub Pull Request creation utility.
 *
 * Creates a pull request via the GitHub REST API after a successful agent
 * pipeline run (Architect -> Coder -> Reviewer -> Tester). The PR body
 * includes the feature description, implementation plan summary, and test
 * results so that human reviewers have full context.
 *
 * Uses the native `fetch` API (Node 18+) with no external HTTP dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options required to create a pull request. */
export interface CreatePullRequestOptions {
  /** GitHub repository owner (user or organization). */
  repoOwner: string;
  /** GitHub repository name. */
  repoName: string;
  /** The head branch containing the agent's changes. */
  featureBranch: string;
  /** The base branch to merge into (e.g. "main"). */
  baseBranch: string;
  /** PR title -- should be concise and descriptive. */
  title: string;
  /** Full PR body in GitHub-flavored markdown. */
  body: string;
  /** GitHub personal access token or fine-grained token with `repo` scope. */
  githubToken: string;
  /** Optional: mark the PR as a draft. Defaults to false. */
  draft?: boolean;
}

/** Subset of the GitHub API response for a created pull request. */
export interface PullRequestResult {
  /** The URL of the created pull request. */
  url: string;
  /** The PR number (e.g. 42). */
  number: number;
  /** The full API URL of the pull request resource. */
  apiUrl: string;
  /** The node ID used by the GraphQL API. */
  nodeId: string;
}

/** Structured error thrown when the GitHub API rejects the request. */
export class GitHubApiError extends Error {
  /** HTTP status code returned by the API. */
  public readonly statusCode: number;
  /** Raw JSON body from the API error response, if available. */
  public readonly responseBody: unknown;

  constructor(message: string, statusCode: number, responseBody?: unknown) {
    super(message);
    this.name = "GitHubApiError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Maximum allowed length for the PR body. GitHub silently truncates bodies
 * beyond 65536 characters, so we enforce a slightly lower limit and append
 * a truncation notice if needed.
 */
const MAX_BODY_LENGTH = 65_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the pull request body from pipeline artifacts.
 *
 * Combines the feature description, a summary extracted from the
 * implementation plan, and the test report into a single markdown document.
 */
export function buildPrBody(options: {
  featureDescription: string;
  implementationPlanSummary: string;
  testResultsSummary: string;
  reviewVerdict?: string;
}): string {
  const sections: string[] = [];

  sections.push("## Feature Description\n");
  sections.push(options.featureDescription.trim());
  sections.push("");

  sections.push("## Implementation Plan Summary\n");
  sections.push(options.implementationPlanSummary.trim());
  sections.push("");

  if (options.reviewVerdict) {
    sections.push("## Review Verdict\n");
    sections.push(options.reviewVerdict.trim());
    sections.push("");
  }

  sections.push("## Test Results\n");
  sections.push(options.testResultsSummary.trim());
  sections.push("");

  sections.push("---");
  sections.push("*This PR was created automatically by the AutoForge agent pipeline.*");

  let body = sections.join("\n");

  // Truncate if the body exceeds GitHub's limit
  if (body.length > MAX_BODY_LENGTH) {
    const truncationNotice =
      "\n\n---\n*[Body truncated due to GitHub character limit. See the implementation plan and test report in the branch for full details.]*";
    body = body.slice(0, MAX_BODY_LENGTH - truncationNotice.length) + truncationNotice;
  }

  return body;
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

/**
 * Create a GitHub pull request using the REST API.
 *
 * @param options - Configuration for the PR to create.
 * @returns The URL and metadata of the created pull request.
 * @throws {GitHubApiError} If the GitHub API returns a non-2xx response.
 * @throws {Error} If the network request fails entirely.
 *
 * @example
 * ```ts
 * const result = await createPullRequest({
 *   repoOwner: "acme",
 *   repoName: "web-app",
 *   featureBranch: "agent/feature-42",
 *   baseBranch: "main",
 *   title: "feat(auth): add two-factor authentication",
 *   body: buildPrBody({ ... }),
 *   githubToken: process.env.GITHUB_TOKEN!,
 * });
 * console.log(`PR created: ${result.url}`);
 * ```
 */
export async function createPullRequest(
  options: CreatePullRequestOptions,
): Promise<PullRequestResult> {
  const {
    repoOwner,
    repoName,
    featureBranch,
    baseBranch,
    title,
    body,
    githubToken,
    draft = false,
  } = options;

  // Validate inputs to fail fast with clear messages
  if (!repoOwner) {
    throw new Error("repoOwner is required and must not be empty.");
  }
  if (!repoName) {
    throw new Error("repoName is required and must not be empty.");
  }
  if (!featureBranch) {
    throw new Error("featureBranch is required and must not be empty.");
  }
  if (!baseBranch) {
    throw new Error("baseBranch is required and must not be empty.");
  }
  if (!title) {
    throw new Error("title is required and must not be empty.");
  }
  if (!githubToken) {
    throw new Error("githubToken is required and must not be empty.");
  }

  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(repoOwner)}/${encodeURIComponent(repoName)}/pulls`;

  const requestBody = {
    title,
    body,
    head: featureBranch,
    base: baseBranch,
    draft,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "Content-Type": "application/json",
      // Recommended by GitHub to pin the API version
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(requestBody),
  });

  // Parse the response body regardless of status to extract error details
  let responseData: Record<string, unknown>;
  try {
    responseData = (await response.json()) as Record<string, unknown>;
  } catch {
    // If the body is not JSON (unlikely for GitHub API), wrap the text
    const text = await response.text().catch(() => "(unreadable response body)");
    responseData = { message: text };
  }

  if (!response.ok) {
    const ghMessage =
      typeof responseData.message === "string"
        ? responseData.message
        : JSON.stringify(responseData);

    throw new GitHubApiError(
      `GitHub API responded with ${response.status}: ${ghMessage}`,
      response.status,
      responseData,
    );
  }

  // Extract the fields we need from the successful response
  const htmlUrl = responseData.html_url;
  const prNumber = responseData.number;
  const apiUrl = responseData.url;
  const nodeId = responseData.node_id;

  if (typeof htmlUrl !== "string" || typeof prNumber !== "number") {
    throw new Error(
      "Unexpected GitHub API response shape: missing html_url or number. " +
        `Response: ${JSON.stringify(responseData).slice(0, 500)}`,
    );
  }

  return {
    url: htmlUrl,
    number: prNumber,
    apiUrl: typeof apiUrl === "string" ? apiUrl : "",
    nodeId: typeof nodeId === "string" ? nodeId : "",
  };
}
