/**
 * Linear comment posting for implementation updates.
 *
 * When an Omakase agent completes work on a feature linked to a
 * Linear issue, this module posts a formatted summary comment to the
 * issue so stakeholders get visibility without leaving Linear.
 */

import { linearGraphQL } from "./client";

// -----------------------------------------------------------------------
// GraphQL Mutation
// -----------------------------------------------------------------------

export const COMMENT_CREATE_MUTATION = `
  mutation CommentCreate($issueId: String!, $body: String!) {
    commentCreate(input: { issueId: $issueId, body: $body }) {
      success
      comment {
        id
        body
        url
      }
    }
  }
`;

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface CommentOptions {
  /** The Linear issue ID (UUID). */
  linearIssueId: string;
  /** The name of the agent that performed the work. */
  agentName: string;
  /** The human-readable feature name. */
  featureName: string;
  /** URL of the pull request (optional). */
  prUrl?: string;
  /** Free-text summary of what was implemented. */
  summary: string;
  /** Test results summary (optional). */
  testResults?: string;
  /** A valid Linear OAuth access token. */
  linearAccessToken: string;
}

interface CommentCreateResponse {
  commentCreate: {
    success: boolean;
    comment: {
      id: string;
      body: string;
      url: string;
    };
  };
}

// -----------------------------------------------------------------------
// Comment Formatting
// -----------------------------------------------------------------------

function formatComment(options: CommentOptions): string {
  const lines: string[] = [];

  lines.push(`## Omakase Implementation Update`);
  lines.push("");
  lines.push(`**Feature:** ${options.featureName}`);
  lines.push(`**Agent:** ${options.agentName}`);

  if (options.prUrl) {
    lines.push(`**Pull Request:** [View PR](${options.prUrl})`);
  }

  lines.push("");
  lines.push("### Summary");
  lines.push("");
  lines.push(options.summary);

  if (options.testResults) {
    lines.push("");
    lines.push("### Test Results");
    lines.push("");
    lines.push(options.testResults);
  }

  lines.push("");
  lines.push("---");
  lines.push("*Posted by [Omakase](https://omakase.dev)*");

  return lines.join("\n");
}

// -----------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------

export async function postImplementationComment(
  options: CommentOptions,
): Promise<string | undefined> {
  const body = formatComment(options);

  const result = await linearGraphQL<CommentCreateResponse>(
    COMMENT_CREATE_MUTATION,
    {
      issueId: options.linearIssueId,
      body,
    },
    options.linearAccessToken,
  );

  if (result.commentCreate.success) {
    console.log(
      `[Linear Comments] Posted implementation comment for ` +
        `"${options.featureName}" -> ${result.commentCreate.comment.url}`,
    );
    return result.commentCreate.comment.url;
  }

  console.warn(
    `[Linear Comments] commentCreate returned success=false for ` +
      `issue ${options.linearIssueId}.`,
  );
  return undefined;
}
