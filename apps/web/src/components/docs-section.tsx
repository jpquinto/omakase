"use client";

// ---------------------------------------------------------------------------
// Docs Section
//
// Comprehensive in-app documentation for the Omakase platform. Features a
// sticky left sidebar with IntersectionObserver-driven active section
// highlighting and a scrollable right content area covering architecture,
// agent pipeline, work sessions, Linear integration, streaming, the style
// system, infrastructure, and the API surface.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  Layers,
  GitBranch,
  Terminal,
  ArrowLeftRight,
  Radio,
  Palette,
  Cloud,
  FileJson,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Section metadata — drives the sidebar and anchor IDs
// ---------------------------------------------------------------------------

interface SectionMeta {
  id: string;
  label: string;
  icon: ReactNode;
}

const SECTIONS: SectionMeta[] = [
  { id: "architecture", label: "Architecture Overview", icon: <Layers className="h-4 w-4" /> },
  { id: "pipeline", label: "Agent Pipeline", icon: <GitBranch className="h-4 w-4" /> },
  { id: "sessions", label: "Work Sessions", icon: <Terminal className="h-4 w-4" /> },
  { id: "linear", label: "Linear Integration", icon: <ArrowLeftRight className="h-4 w-4" /> },
  { id: "streaming", label: "Real-Time Streaming", icon: <Radio className="h-4 w-4" /> },
  { id: "style", label: "Style System", icon: <Palette className="h-4 w-4" /> },
  { id: "infrastructure", label: "Infrastructure", icon: <Cloud className="h-4 w-4" /> },
  { id: "api", label: "API Overview", icon: <FileJson className="h-4 w-4" /> },
];

// ---------------------------------------------------------------------------
// Helper sub-components
// ---------------------------------------------------------------------------

function SectionHeading({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-3 font-serif text-xl font-bold tracking-tight text-oma-text">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-oma-sm glass-sm text-oma-primary">
        {icon}
      </span>
      {children}
    </h2>
  );
}

function Pseudocode({ children }: { children: string }) {
  return (
    <pre
      className={cn(
        "my-4 overflow-x-auto rounded-oma border border-oma-glass-border",
        "bg-oma-bg-surface p-4 font-mono text-sm leading-relaxed text-oma-text-muted",
      )}
    >
      {children}
    </pre>
  );
}

function Callout({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "my-4 glass-sm rounded-oma border-l-2 border-oma-indigo pl-4 py-3 pr-4",
        "text-sm leading-relaxed text-oma-text-muted",
      )}
    >
      {children}
    </div>
  );
}

function DocParagraph({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-sm leading-relaxed text-oma-text-muted">{children}</p>;
}

// ---------------------------------------------------------------------------
// Color swatch used in the Style System section
// ---------------------------------------------------------------------------

function ColorSwatch({ name, hex, token }: { name: string; hex: string; token: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-8 w-8 shrink-0 rounded-oma-sm border border-oma-glass-border"
        style={{ backgroundColor: hex }}
      />
      <div className="min-w-0">
        <span className="block text-sm font-medium text-oma-text">{name}</span>
        <span className="block text-xs text-oma-text-subtle">
          {hex} ({token})
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DocsSection() {
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
  const contentRef = useRef<HTMLDivElement>(null);

  // Track which section is visible via IntersectionObserver
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const sectionEls = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean,
    ) as HTMLElement[];

    if (sectionEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the first intersecting section (top-most visible)
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        root: container,
        rootMargin: "-10% 0px -60% 0px",
        threshold: 0,
      },
    );

    sectionEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleNavClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex gap-8">
      {/* ---- Sidebar ---- */}
      <nav className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-8 max-h-[calc(100vh-12rem)] overflow-y-auto">
          <ul className="space-y-1">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => handleNavClick(section.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-oma px-3 py-2 text-left text-sm transition-all duration-200",
                    activeSection === section.id
                      ? "glass-primary text-oma-primary font-medium"
                      : "text-oma-text-muted hover:bg-oma-bg-surface/60 hover:text-oma-text",
                  )}
                >
                  <span className="shrink-0">{section.icon}</span>
                  <span className="truncate">{section.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* ---- Content ---- */}
      <div ref={contentRef} className="flex-1 min-w-0 space-y-16 pb-24">
        {/* 1. Architecture Overview */}
        <section id="architecture">
          <SectionHeading icon={<Layers className="h-4 w-4" />}>
            Architecture Overview
          </SectionHeading>

          <DocParagraph>
            Omakase is structured as a Bun monorepo with two applications and three shared packages.
            The frontend serves the dashboard while the orchestrator manages agent work sessions and
            pipelines.
          </DocParagraph>

          <Pseudocode>{`omakase/
\u251C\u2500\u2500 apps/
\u2502   \u251C\u2500\u2500 web/           \u2192 Next.js 15 frontend (Vercel)
\u2502   \u2514\u2500\u2500 orchestrator/  \u2192 Elysia backend (EC2)
\u251C\u2500\u2500 packages/
\u2502   \u251C\u2500\u2500 dynamodb/      \u2192 Data access layer
\u2502   \u251C\u2500\u2500 db/            \u2192 Shared TypeScript types
\u2502   \u2514\u2500\u2500 shared/        \u2192 Linear client & utilities
\u251C\u2500\u2500 infra/             \u2192 AWS CDK stack
\u2514\u2500\u2500 openspec/          \u2192 Change management`}</Pseudocode>

          <DocParagraph>
            <strong className="text-oma-text">Frontend</strong> (Next.js 15, React 19, Tailwind v4)
            &mdash; Serves the dashboard, connects to the orchestrator via REST and SSE for
            real-time updates.
          </DocParagraph>

          <DocParagraph>
            <strong className="text-oma-text">Orchestrator</strong> (Bun + Elysia) &mdash; Polls
            DynamoDB for pending work, manages agent pipelines and Claude Code work sessions, and
            exposes the REST API consumed by the frontend.
          </DocParagraph>

          <DocParagraph>
            <strong className="text-oma-text">Database</strong> (DynamoDB) &mdash; Stores projects,
            features, agent runs, messages, threads, and workspace configuration with on-demand
            capacity.
          </DocParagraph>

          <Callout>
            All services share types via the <code className="font-mono text-oma-indigo">@omakase/db</code> package.
            The frontend communicates with the orchestrator at the URL configured in{" "}
            <code className="font-mono text-oma-indigo">NEXT_PUBLIC_ORCHESTRATOR_URL</code>.
          </Callout>
        </section>

        {/* 2. Agent Pipeline */}
        <section id="pipeline">
          <SectionHeading icon={<GitBranch className="h-4 w-4" />}>
            Agent Pipeline
          </SectionHeading>

          <DocParagraph>
            Each feature flows through a four-step sequential pipeline. If the reviewer requests
            changes, the coder re-runs once with the reviewer&apos;s feedback before continuing.
          </DocParagraph>

          <Pseudocode>{`PIPELINE(feature):
  for step in [architect, coder, reviewer, tester]:
    run = launch_agent(step, feature)
    wait_for_completion(run)

    if step == reviewer AND run.exit_code == 2:
      // Reviewer requested changes \u2014 retry coder once
      rerun = launch_agent(coder, feature, feedback=run.output)
      wait_for_completion(rerun)
      continue to reviewer again

    if run.failed:
      mark_feature("failing", error=run.output)
      return

  mark_feature("review_ready")
  notify_linear("Pipeline complete")`}</Pseudocode>

          <div className="my-6 space-y-3">
            <h3 className="text-sm font-semibold text-oma-text">Agent Roles</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="glass-sm rounded-oma p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-lg">&#127836;</span>
                  <span className="text-sm font-semibold text-oma-gold">Miso</span>
                  <span className="text-xs text-oma-text-subtle">(Architect)</span>
                </div>
                <p className="text-xs leading-relaxed text-oma-text-muted">
                  Plans the implementation approach, defines file structure and data models.
                </p>
              </div>
              <div className="glass-sm rounded-oma p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-lg">&#127833;</span>
                  <span className="text-sm font-semibold text-oma-indigo">Nori</span>
                  <span className="text-xs text-oma-text-subtle">(Coder)</span>
                </div>
                <p className="text-xs leading-relaxed text-oma-text-muted">
                  Implements the feature, creates a branch, and writes the code.
                </p>
              </div>
              <div className="glass-sm rounded-oma p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-lg">&#127798;</span>
                  <span className="text-sm font-semibold text-oma-secondary">Koji</span>
                  <span className="text-xs text-oma-text-subtle">(Reviewer)</span>
                </div>
                <p className="text-xs leading-relaxed text-oma-text-muted">
                  Reviews code quality. Exit code 2 requests changes from the coder.
                </p>
              </div>
              <div className="glass-sm rounded-oma p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-lg">&#127843;</span>
                  <span className="text-sm font-semibold text-oma-jade">Toro</span>
                  <span className="text-xs text-oma-text-subtle">(Tester)</span>
                </div>
                <p className="text-xs leading-relaxed text-oma-text-muted">
                  Runs the test suite to verify the implementation is correct.
                </p>
              </div>
            </div>
          </div>

          <h3 className="mb-2 text-sm font-semibold text-oma-text">Feature Status Transitions</h3>
          <Pseudocode>{`pending \u2192 in_progress \u2192 review_ready \u2192 passing
                    \u2198 failing (on error)`}</Pseudocode>
        </section>

        {/* 3. Work Sessions */}
        <section id="sessions">
          <SectionHeading icon={<Terminal className="h-4 w-4" />}>
            Work Sessions
          </SectionHeading>

          <DocParagraph>
            Work sessions wrap the Claude Code CLI. Each agent gets a dedicated workspace
            provisioned from the project&apos;s connected Git repository. Output is streamed in
            real-time to the browser via the stream bus.
          </DocParagraph>

          <Pseudocode>{`START_SESSION(agent, prompt):
  workspace = provision_workspace(project)
  session_id = spawn("claude", "-p", prompt, cwd=workspace)
  store(session_id)
  stream_output \u2192 stream_bus \u2192 SSE \u2192 browser

SEND_MESSAGE(session, message):
  spawn("claude", "-p", message, "--resume", session.id)
  stream_output \u2192 stream_bus \u2192 SSE \u2192 browser

END_SESSION(session):
  terminate process
  cleanup after 30min inactivity timeout`}</Pseudocode>

          <DocParagraph>
            Only one active session is allowed per agent at any given time. Sessions that remain
            idle for 30 minutes are automatically terminated and cleaned up. The workspace is
            provisioned from the project&apos;s connected Git repository, ensuring each agent
            operates on an isolated copy of the codebase.
          </DocParagraph>
        </section>

        {/* 4. Linear Integration */}
        <section id="linear">
          <SectionHeading icon={<ArrowLeftRight className="h-4 w-4" />}>
            Linear Integration
          </SectionHeading>

          <DocParagraph>
            Omakase supports bidirectional synchronization with Linear. Projects are connected to a
            Linear workspace via OAuth, and issues are synced as features in DynamoDB.
          </DocParagraph>

          <Pseudocode>{`CONNECT_LINEAR:
  user clicks "Connect Linear" \u2192 OAuth redirect
  callback stores access_token in workspace record
  workspace linked to Linear organization + default team

SYNC_ISSUES(project):
  token = workspace.linearAccessToken
  issues = linear_api.list_team_issues(team_id)
  for each issue:
    upsert_feature(linearIssueId=issue.id, title, description, status)

WEBHOOK(event):
  if event.type == "Issue":
    feature = lookup_by_linear_id(event.data.id)
    update_feature(status=map_linear_status(event.data.state))`}</Pseudocode>

          <h3 className="mb-3 text-sm font-semibold text-oma-text">Status Mapping</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-oma border border-oma-glass-border bg-oma-bg-surface p-4">
            <span className="text-xs font-medium uppercase tracking-wider text-oma-text-subtle">Linear Status</span>
            <span className="text-xs font-medium uppercase tracking-wider text-oma-text-subtle">Omakase Status</span>

            <span className="text-sm text-oma-text-muted">Backlog / Triage</span>
            <span className="text-sm text-oma-pending">pending</span>

            <span className="text-sm text-oma-text-muted">In Progress</span>
            <span className="text-sm text-oma-progress">in_progress</span>

            <span className="text-sm text-oma-text-muted">In Review</span>
            <span className="text-sm text-oma-review">review_ready</span>

            <span className="text-sm text-oma-text-muted">Done</span>
            <span className="text-sm text-oma-done">passing</span>

            <span className="text-sm text-oma-text-muted">Cancelled</span>
            <span className="text-sm text-oma-text-subtle">cancelled</span>
          </div>
        </section>

        {/* 5. Real-Time Streaming */}
        <section id="streaming">
          <SectionHeading icon={<Radio className="h-4 w-4" />}>
            Real-Time Streaming
          </SectionHeading>

          <DocParagraph>
            Agent responses are streamed token-by-token to the browser using Server-Sent Events.
            The stream bus buffers events so late-connecting clients can replay missed tokens.
          </DocParagraph>

          <Pseudocode>{`MESSAGE_FLOW:
  1. Browser POSTs message to /api/agent-runs/:runId/messages
  2. Server saves to DynamoDB, fires agent response (async)
  3. Browser opens EventSource to /api/agent-runs/:runId/messages/stream

  4. Agent generates response:
     emit("thinking_start")
     for each token from Claude API:
       emit("token", token)          \u2192 stream_bus \u2192 SSE \u2192 browser
     emit("thinking_end")
     save_complete_message(DynamoDB)

  5. SSE endpoint also polls DynamoDB every 1s for saved messages
  6. Browser accumulates tokens \u2192 renders markdown in real-time`}</Pseudocode>

          <h3 className="mb-3 text-sm font-semibold text-oma-text">Event Types</h3>
          <div className="space-y-2">
            {[
              { event: "thinking_start", desc: "Agent begins generating a response" },
              { event: "token", desc: "Single text token for streaming display" },
              { event: "thinking_end", desc: "Generation complete" },
              { event: "message", desc: "Complete message (from DynamoDB poll)" },
              { event: "stream_error", desc: "Error occurred during generation" },
              { event: "close", desc: "Session ended" },
            ].map(({ event, desc }) => (
              <div key={event} className="flex items-start gap-3">
                <code className="shrink-0 rounded-oma-sm bg-oma-bg-surface px-2 py-0.5 font-mono text-xs text-oma-indigo">
                  {event}
                </code>
                <span className="text-sm text-oma-text-muted">{desc}</span>
              </div>
            ))}
          </div>

          <Callout>
            Late-connecting clients receive buffered events via the stream-bus replay mechanism,
            ensuring no tokens are lost.
          </Callout>
        </section>

        {/* 6. Style System */}
        <section id="style">
          <SectionHeading icon={<Palette className="h-4 w-4" />}>
            Style System
          </SectionHeading>

          <DocParagraph>
            Omakase uses a custom &ldquo;Liquid Glass&rdquo; design system built on Tailwind CSS v4
            with glassmorphism surfaces, Japanese-inspired typography, and a curated color palette.
          </DocParagraph>

          {/* Typography */}
          <h3 className="mb-3 text-sm font-semibold text-oma-text">Typography</h3>
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <div className="glass-sm rounded-oma p-3">
              <span className="block font-serif text-lg text-oma-text">Instrument Serif</span>
              <span className="text-xs text-oma-text-subtle">font-serif &mdash; Headings</span>
            </div>
            <div className="glass-sm rounded-oma p-3">
              <span className="block font-sans text-lg text-oma-text">Outfit</span>
              <span className="text-xs text-oma-text-subtle">font-sans &mdash; Body text</span>
            </div>
            <div className="glass-sm rounded-oma p-3">
              <span className="block font-mono text-lg text-oma-text">JetBrains Mono</span>
              <span className="text-xs text-oma-text-subtle">font-mono &mdash; Code</span>
            </div>
            <div className="glass-sm rounded-oma p-3">
              <span className="block font-jp text-lg text-oma-text">Noto Serif JP</span>
              <span className="text-xs text-oma-text-subtle">font-jp &mdash; Japanese text</span>
            </div>
          </div>

          {/* Color Palette */}
          <h3 className="mb-3 text-sm font-semibold text-oma-text">Color Palette</h3>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ColorSwatch name="Sakura" hex="#f472b6" token="oma-primary" />
            <ColorSwatch name="Beni" hex="#f87171" token="oma-secondary" />
            <ColorSwatch name="Gold" hex="#fbbf24" token="oma-gold" />
            <ColorSwatch name="Jade" hex="#6ee7b7" token="oma-jade" />
            <ColorSwatch name="Indigo" hex="#818cf8" token="oma-indigo" />
          </div>

          {/* Agent Colors */}
          <h3 className="mb-3 text-sm font-semibold text-oma-text">Agent Colors</h3>
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {[
              { agent: "Miso", role: "Architect", color: "#fbbf24", cls: "text-oma-gold" },
              { agent: "Nori", role: "Coder", color: "#818cf8", cls: "text-oma-indigo" },
              { agent: "Koji", role: "Reviewer", color: "#f87171", cls: "text-oma-secondary" },
              { agent: "Toro", role: "Tester", color: "#6ee7b7", cls: "text-oma-jade" },
            ].map(({ agent, role, color, cls }) => (
              <div key={agent} className="flex items-center gap-3">
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className={cn("text-sm font-medium", cls)}>{agent}</span>
                <span className="text-xs text-oma-text-subtle">({role})</span>
              </div>
            ))}
          </div>

          {/* Glass Surfaces */}
          <h3 className="mb-3 text-sm font-semibold text-oma-text">Glass Surfaces</h3>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="glass-sm rounded-oma p-4 text-center">
              <code className="text-xs font-mono text-oma-text-muted">.glass-sm</code>
              <p className="mt-1 text-[11px] text-oma-text-subtle">12px blur, subtle</p>
            </div>
            <div className="glass rounded-oma p-4 text-center">
              <code className="text-xs font-mono text-oma-text-muted">.glass</code>
              <p className="mt-1 text-[11px] text-oma-text-subtle">20px blur, standard</p>
            </div>
            <div className="glass-lg rounded-oma p-4 text-center">
              <code className="text-xs font-mono text-oma-text-muted">.glass-lg</code>
              <p className="mt-1 text-[11px] text-oma-text-subtle">32px blur, prominent</p>
            </div>
          </div>

          {/* Border Radii */}
          <h3 className="mb-3 text-sm font-semibold text-oma-text">Border Radii</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-oma border border-oma-glass-border-bright bg-oma-bg-surface" />
              <div>
                <code className="block text-xs font-mono text-oma-text-muted">rounded-oma</code>
                <span className="text-[11px] text-oma-text-subtle">12px</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-oma-lg border border-oma-glass-border-bright bg-oma-bg-surface" />
              <div>
                <code className="block text-xs font-mono text-oma-text-muted">rounded-oma-lg</code>
                <span className="text-[11px] text-oma-text-subtle">16px</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-16 rounded-oma-full border border-oma-glass-border-bright bg-oma-bg-surface" />
              <div>
                <code className="block text-xs font-mono text-oma-text-muted">rounded-oma-full</code>
                <span className="text-[11px] text-oma-text-subtle">pill</span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Infrastructure */}
        <section id="infrastructure">
          <SectionHeading icon={<Cloud className="h-4 w-4" />}>
            Infrastructure
          </SectionHeading>

          <DocParagraph>
            Omakase runs on a single EC2 instance behind an Elastic IP. The CDK stack provisions the
            VPC, compute, storage, and secrets. All infrastructure is defined in{" "}
            <code className="font-mono text-oma-indigo">infra/lib/omakase-stack.ts</code>.
          </DocParagraph>

          <Pseudocode>{`AWS ARCHITECTURE:
  VPC (1 AZ, public subnet)
  \u2514\u2500\u2500 EC2 t3.small (Elastic IP)
      \u251C\u2500\u2500 Bun + Elysia orchestrator (port 8080)
      \u251C\u2500\u2500 Claude Code CLI (authenticated)
      \u251C\u2500\u2500 nginx (SSL termination)
      \u2514\u2500\u2500 CloudWatch agent \u2192 /omakase/orchestrator logs

  DynamoDB (on-demand capacity)
  \u251C\u2500\u2500 omakase-projects
  \u251C\u2500\u2500 omakase-features
  \u251C\u2500\u2500 omakase-agent_runs
  \u251C\u2500\u2500 omakase-users
  \u251C\u2500\u2500 omakase-tickets
  \u2514\u2500\u2500 omakase-agent_threads (+ queues, memories, personalities)

  Secrets Manager
  \u2514\u2500\u2500 /omakase/api-keys (ANTHROPIC_API_KEY, GITHUB_TOKEN)`}</Pseudocode>

          <h3 className="mb-2 text-sm font-semibold text-oma-text">Deployment</h3>
          <Pseudocode>{`DEPLOY:
  ./scripts/deploy.sh <elastic-ip>
  \u2192 SSH to EC2
  \u2192 git pull --ff-only
  \u2192 bun install
  \u2192 systemctl restart omakase-orchestrator
  \u2192 health check: curl localhost:8080/health`}</Pseudocode>
        </section>

        {/* 8. API Overview */}
        <section id="api">
          <SectionHeading icon={<FileJson className="h-4 w-4" />}>
            API Overview
          </SectionHeading>

          <DocParagraph>
            The orchestrator exposes a REST API consumed by the Next.js frontend. Endpoints are
            grouped by domain, each serving a specific area of the platform.
          </DocParagraph>

          <div className="space-y-3">
            {[
              {
                group: "Projects",
                desc: "CRUD for projects, GitHub repo connection, Linear sync",
              },
              {
                group: "Features",
                desc: "CRUD for features, dependency management, status transitions, assignment and dispatch",
              },
              {
                group: "Agent Chat",
                desc: "Message posting, history retrieval, SSE streaming",
              },
              {
                group: "Work Sessions",
                desc: "Start and stop Claude Code sessions, list active sessions, file browser",
              },
              {
                group: "Agent Status",
                desc: "Real-time agent status (idle, working, errored), job queues, activity timeline",
              },
              {
                group: "Agent Profiles",
                desc: "Personality management, stats, memories",
              },
              {
                group: "Linear",
                desc: "Feature creation from Linear issues, bidirectional sync, workspace OAuth",
              },
              {
                group: "Workspace",
                desc: "Workspace CRUD, Linear token management, project sync",
              },
            ].map(({ group, desc }) => (
              <div key={group} className="flex items-start gap-3">
                <span className="shrink-0 rounded-oma-sm bg-oma-bg-surface px-2.5 py-1 text-xs font-semibold text-oma-text">
                  {group}
                </span>
                <span className="pt-0.5 text-sm text-oma-text-muted">{desc}</span>
              </div>
            ))}
          </div>

          <Callout>
            All endpoints are served by the Elysia orchestrator. The frontend accesses them via the{" "}
            <code className="font-mono text-oma-indigo">apiFetch()</code> utility which prepends
            the orchestrator base URL.
          </Callout>
        </section>
      </div>
    </div>
  );
}
