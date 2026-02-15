"use client";

// ---------------------------------------------------------------------------
// PR Created Card Component
//
// Renders when a pull request has been created on GitHub. Shows a link to the
// PR with the PR number and a GitHub icon. Uses a subtle glass-primary surface
// to indicate completion.
// ---------------------------------------------------------------------------

import { cn } from "@/lib/utils";
import { ExternalLink, Github, GitPullRequestDraft } from "lucide-react";

interface PrCreatedCardProps {
  /** The full URL to the GitHub pull request */
  prUrl: string;
  /** The PR number (e.g. 42) */
  prNumber: number;
  /** Optional title of the PR */
  prTitle?: string;
  className?: string;
}

export function PrCreatedCard({
  prUrl,
  prNumber,
  prTitle,
  className,
}: PrCreatedCardProps) {
  return (
    <div
      className={cn(
        "glass-primary rounded-oma-lg border border-oma-primary/20 p-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {/* GitHub icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-oma bg-oma-bg-surface/50">
          <Github className="size-4 text-oma-text" />
        </div>

        {/* PR info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <GitPullRequestDraft className="size-3.5 text-oma-jade" />
            <span className="text-sm font-semibold text-oma-text">
              PR #{prNumber}
            </span>
          </div>
          {prTitle && (
            <p className="mt-0.5 truncate text-xs text-oma-text-muted">
              {prTitle}
            </p>
          )}
        </div>

        {/* Link to PR */}
        <a
          href={prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-oma bg-oma-bg-surface/50 px-3 py-1.5 text-xs font-medium text-oma-text transition-colors hover:bg-oma-bg-surface hover:text-oma-primary"
        >
          View on GitHub
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}
