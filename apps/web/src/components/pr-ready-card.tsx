"use client";

// ---------------------------------------------------------------------------
// PR Ready Card Component
//
// Renders when a pipeline completes successfully and a PR is ready to be
// created. Shows the branch name, test results summary, and a prominent
// "Create PR" button. Uses glass surface styling with jade success accents.
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";
import {
  GitBranch,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface PrReadyCardProps {
  /** Agent run ID used to trigger PR creation */
  runId: string;
  /** Git branch name for the feature */
  branchName: string;
  /** Number of tests that passed */
  testsPassed?: number;
  /** Total number of tests run */
  testsTotal?: number;
  /** Summary text about the pipeline results */
  summary?: string;
  /** Called after a PR has been successfully created */
  onPrCreated?: (prUrl: string, prNumber: number) => void;
  className?: string;
}

export function PrReadyCard({
  runId,
  branchName,
  testsPassed,
  testsTotal,
  summary,
  onPrCreated,
  className,
}: PrReadyCardProps) {
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [prUrl, setPrUrl] = useState<string | null>(null);

  const handleCreatePr = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<{ url: string; number: number }>(
        `/api/agent-runs/${runId}/create-pr`,
        { method: "POST" },
      );
      setCreated(true);
      setPrUrl(result.url);
      toast.success(`PR #${result.number} created successfully!`);
      onPrCreated?.(result.url, result.number);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create pull request",
      );
    } finally {
      setLoading(false);
    }
  }, [runId, onPrCreated]);

  const hasTestResults =
    testsPassed !== undefined && testsTotal !== undefined;

  return (
    <div
      className={cn(
        "glass rounded-oma-lg border border-oma-jade/20 p-5",
        className,
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 className="size-4 text-oma-jade" />
        <span className="text-sm font-semibold text-oma-text">
          Pipeline Complete
        </span>
      </div>

      {/* Branch info */}
      <div className="mb-3 flex items-center gap-2 rounded-oma bg-oma-bg-surface/50 px-3 py-2">
        <GitBranch className="size-3.5 text-oma-text-subtle" />
        <code className="font-mono text-xs text-oma-text">{branchName}</code>
      </div>

      {/* Test results (if available) */}
      {hasTestResults && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-medium text-oma-jade">
            {testsPassed}/{testsTotal} tests passed
          </span>
          {testsPassed === testsTotal && (
            <span className="rounded-oma-full bg-oma-jade/15 px-2 py-0.5 text-[10px] font-medium text-oma-jade">
              All passing
            </span>
          )}
        </div>
      )}

      {/* Summary (if available) */}
      {summary && (
        <p className="mb-4 text-xs leading-relaxed text-oma-text-muted">
          {summary}
        </p>
      )}

      {/* Create PR button / Success state */}
      {created && prUrl ? (
        <a
          href={prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-oma bg-oma-jade/15 px-4 py-2.5 text-xs font-medium text-oma-jade transition-colors hover:bg-oma-jade/25"
        >
          <CheckCircle2 className="size-3.5" />
          PR Created
          <ExternalLink className="size-3" />
        </a>
      ) : (
        <button
          onClick={handleCreatePr}
          disabled={loading}
          className={cn(
            "inline-flex items-center gap-2 rounded-oma px-4 py-2.5 text-xs font-semibold text-white transition-all duration-200",
            "bg-gradient-to-r from-oma-jade to-oma-jade-dim shadow-oma-sm",
            "hover:shadow-oma hover:brightness-110",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Creating PR...
            </>
          ) : (
            <>
              <GitBranch className="size-3.5" />
              Create Pull Request
            </>
          )}
        </button>
      )}
    </div>
  );
}
