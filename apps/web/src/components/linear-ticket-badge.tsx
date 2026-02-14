"use client";

// ---------------------------------------------------------------------------
// Linear Ticket Badge Component
//
// Renders a compact, clickable badge that links to a Linear issue. Uses
// neobrutalism styling consistent with the rest of the Omakase UI.
//
// The badge displays:
//   [L icon] [Issue ID]  [status dot]
//
// Clicking the badge opens the Linear issue in a new tab.
// ---------------------------------------------------------------------------

interface LinearTicketBadgeProps {
  /** The human-readable Linear issue identifier (e.g. "ENG-123"). */
  linearIssueId: string;
  /** Direct URL to the issue in Linear. */
  linearIssueUrl: string;
  /** Current status of the Linear issue for the colored indicator dot. */
  status?: "backlog" | "todo" | "in_progress" | "done" | "cancelled";
}

/** Maps Linear status to a Tailwind background color class. */
function statusDotColor(status: LinearTicketBadgeProps["status"]): string {
  switch (status) {
    case "backlog":
      return "bg-neo-muted-foreground";
    case "todo":
      return "bg-neo-pending";
    case "in_progress":
      return "bg-neo-progress";
    case "done":
      return "bg-neo-done";
    case "cancelled":
      return "bg-neo-fail";
    default:
      return "bg-neo-muted-foreground";
  }
}

/**
 * Inline SVG of the Linear logomark.
 *
 * This is a simplified version of the Linear "L" mark rendered at
 * 14x14 so it fits within the compact badge without requiring an
 * external icon library.
 */
function LinearIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M1.22 61.52c-.97-6.83-.26-13.84 2.09-20.4 2.34-6.55 6.23-12.43 11.31-17.1l7.07 7.07c-3.81 3.51-6.73 7.91-8.49 12.84-1.76 4.93-2.32 10.24-1.62 15.46L1.22 61.52Zm6.3 12.05 12.09-4.55c2.78 5.16 6.81 9.55 11.73 12.77l-4.55 12.09c-8.45-5.41-15.22-13.17-19.27-20.31Zm31.28 25.21c-3.3-1.24-6.44-2.86-9.37-4.83l4.55-12.09c3.97 2.71 8.49 4.45 13.25 5.06l-1.76 11.58c-2.23.44-4.5.57-6.66.28ZM50 99c-1.13 0-2.26-.04-3.38-.13l1.76-11.59c1.08.08 2.17.08 3.25 0l1.75 11.59c-1.12.09-2.25.13-3.38.13Zm11.2-.23c-2.22.3-4.45.2-6.66-.22l1.76-11.58c4.75-.62 9.28-2.35 13.25-5.06l4.55 12.09c-2.93 1.97-6.08 3.59-9.37 4.83l-2.52.04ZM82.5 88.5l-4.55-12.09c4.92-3.22 8.95-7.61 11.73-12.77l12.09 4.55c-4.04 8.11-10.77 14.87-19.27 20.31Zm16.28-26.98-10.36-2.13c.7-5.22.15-10.53-1.62-15.46-1.76-4.93-4.68-9.34-8.49-12.84l7.07-7.07c5.08 4.67 8.97 10.54 11.31 17.1 2.34 6.56 3.06 13.57 2.09 20.4Zm-13.4-37.49-7.07 7.07c-3.51-3.81-7.91-6.73-12.84-8.49-4.93-1.76-10.24-2.32-15.46-1.62l-2.13-10.36c6.83-.97 13.84-.26 20.4 2.09 6.55 2.34 12.43 6.23 17.1 11.31ZM38.01 21.01l-2.13 10.36c-5.22-.7-10.53-.15-15.46 1.62-4.93 1.76-9.34 4.68-12.84 8.49l-7.07-7.07c4.67-5.08 10.54-8.97 17.1-11.31 6.56-2.34 13.57-3.06 20.4-2.09Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function LinearTicketBadge({
  linearIssueId,
  linearIssueUrl,
  status,
}: LinearTicketBadgeProps) {
  return (
    <a
      href={linearIssueUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${linearIssueId} in Linear`}
      className={
        "neo-border inline-flex items-center gap-1.5 bg-white px-2 py-1 " +
        "text-[11px] font-bold text-neo-foreground no-underline " +
        "transition-all hover:-translate-y-px hover:shadow-neo-sm " +
        "active:translate-y-px active:shadow-none"
      }
    >
      <LinearIcon />

      <span className="leading-none">{linearIssueId}</span>

      {status && (
        <span
          className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusDotColor(status)}`}
          aria-label={`Status: ${status}`}
        />
      )}
    </a>
  );
}
