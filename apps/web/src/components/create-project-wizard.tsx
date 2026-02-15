"use client";

/**
 * CreateProjectWizard — Multi-step modal for creating a new project.
 *
 * Step 1: Project name & description
 * Step 2: Connect GitHub (optional — can skip)
 * Step 3: Success confirmation with next actions
 *
 * Uses the Omakase Liquid Glass design system throughout.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateProject } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import {
  Folder,
  Github,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Sparkles,
  GitBranch,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStep = 1 | 2 | 3;

interface CreateProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after project is created with the new project's ID */
  onCreated?: (projectId: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CURRENT_USER_ID = "user_test_001";

const STEP_META: Record<WizardStep, { title: string; subtitle: string }> = {
  1: {
    title: "Create a project",
    subtitle: "Give your project a name to get started",
  },
  2: {
    title: "Connect GitHub",
    subtitle: "Link a repository for automated PR creation",
  },
  3: {
    title: "You're all set",
    subtitle: "Your project is ready for the agents",
  },
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CreateProjectWizard({
  open,
  onOpenChange,
  onCreated,
}: CreateProjectWizardProps) {
  const router = useRouter();
  const createProject = useCreateProject();

  // Wizard state
  const [step, setStep] = useState<WizardStep>(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // API state
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus name input when dialog opens
  useEffect(() => {
    if (open && step === 1) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [open, step]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      // Delay reset so close animation completes
      const timer = setTimeout(() => {
        setStep(1);
        setDirection("forward");
        setName("");
        setDescription("");
        setCreating(false);
        setError(null);
        setCreatedProjectId(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const goForward = useCallback(() => {
    setDirection("forward");
    setStep((s) => Math.min(s + 1, 3) as WizardStep);
  }, []);

  const goBack = useCallback(() => {
    setDirection("backward");
    setStep((s) => Math.max(s - 1, 1) as WizardStep);
  }, []);

  // -----------------------------------------------------------------------
  // Step 1 -> Create project
  // -----------------------------------------------------------------------

  const handleCreateProject = useCallback(async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        ownerId: CURRENT_USER_ID,
      });
      setCreatedProjectId(project.id);
      onCreated?.(project.id);
      goForward();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }, [name, description, createProject, onCreated, goForward]);

  // -----------------------------------------------------------------------
  // Step 2 -> Connect GitHub (redirect)
  // -----------------------------------------------------------------------

  const handleConnectGitHub = useCallback(() => {
    if (!createdProjectId) return;
    // Redirect to GitHub App installation — the callback will redirect
    // back to the project settings page automatically
    window.location.href = `/api/auth/github?projectId=${createdProjectId}`;
  }, [createdProjectId]);

  const handleSkipGitHub = useCallback(() => {
    goForward();
  }, [goForward]);

  // -----------------------------------------------------------------------
  // Step 3 -> Go to project
  // -----------------------------------------------------------------------

  const handleGoToProject = useCallback(() => {
    if (createdProjectId) {
      onOpenChange(false);
      router.push(`/projects/${createdProjectId}`);
    }
  }, [createdProjectId, onOpenChange, router]);

  // Validation
  const isNameValid = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "glass-lg flex w-full max-w-lg flex-col overflow-hidden rounded-oma-lg border border-oma-glass-border bg-oma-bg-elevated p-0 shadow-oma-lg",
        )}
      >
        <DialogTitle className="sr-only">Create Project</DialogTitle>

        {/* ---- Step indicator bar ---- */}
        <div className="flex items-center gap-2 border-b border-oma-glass-border/50 px-6 pt-6 pb-4">
          {([1, 2, 3] as WizardStep[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                  s < step
                    ? "bg-oma-jade/20 text-oma-jade"
                    : s === step
                      ? "bg-oma-primary/20 text-oma-primary shadow-[0_0_12px_rgba(244,114,182,0.15)]"
                      : "bg-oma-bg-surface text-oma-text-subtle",
                )}
              >
                {s < step ? <Check className="size-3.5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    "h-px w-8 transition-colors duration-300",
                    s < step ? "bg-oma-jade/40" : "bg-oma-glass-border/50",
                  )}
                />
              )}
            </div>
          ))}

          {/* Step label */}
          <div className="ml-auto text-right">
            <p className="text-xs font-medium text-oma-text-muted">
              Step {step} of 3
            </p>
          </div>
        </div>

        {/* ---- Content area with transitions ---- */}
        <div className="relative min-h-[320px] overflow-hidden">
          {/* Step 1: Project Details */}
          <StepPanel visible={step === 1} direction={direction}>
            <div className="space-y-6 px-6 py-6">
              {/* Icon + Header */}
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-oma bg-gradient-to-br from-oma-primary/20 to-oma-primary/5 ring-1 ring-oma-primary/10">
                  <Folder className="size-5 text-oma-primary" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-semibold text-oma-text">
                    {STEP_META[1].title}
                  </h2>
                  <p className="mt-0.5 text-sm text-oma-text-muted">
                    {STEP_META[1].subtitle}
                  </p>
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="project-name"
                    className="mb-1.5 block text-xs font-medium text-oma-text-muted"
                  >
                    Project name
                  </label>
                  <input
                    ref={nameInputRef}
                    id="project-name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isNameValid && !creating) {
                        void handleCreateProject();
                      }
                    }}
                    placeholder="My Awesome App"
                    className="glass-sm w-full rounded-oma border border-oma-glass-border bg-transparent px-3 py-2.5 text-sm text-oma-text outline-none transition-colors placeholder:text-oma-text-faint focus:border-oma-primary focus:ring-1 focus:ring-oma-primary/30"
                  />
                </div>

                <div>
                  <label
                    htmlFor="project-description"
                    className="mb-1.5 block text-xs font-medium text-oma-text-muted"
                  >
                    Description{" "}
                    <span className="text-oma-text-subtle">(optional)</span>
                  </label>
                  <textarea
                    id="project-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A brief description of what this project is about..."
                    rows={3}
                    className="glass-sm w-full resize-none rounded-oma border border-oma-glass-border bg-transparent px-3 py-2.5 text-sm leading-relaxed text-oma-text outline-none transition-colors placeholder:text-oma-text-faint focus:border-oma-primary focus:ring-1 focus:ring-oma-primary/30"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-oma border border-oma-fail/30 bg-oma-fail/10 px-3 py-2.5">
                  <AlertCircle className="size-3.5 shrink-0 text-oma-fail" />
                  <p className="text-xs text-oma-fail">{error}</p>
                </div>
              )}
            </div>
          </StepPanel>

          {/* Step 2: GitHub Connection */}
          <StepPanel visible={step === 2} direction={direction}>
            <div className="space-y-6 px-6 py-6">
              {/* Icon + Header */}
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-oma bg-gradient-to-br from-oma-text/10 to-oma-text/5 ring-1 ring-oma-text/10">
                  <Github className="size-5 text-oma-text" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-semibold text-oma-text">
                    {STEP_META[2].title}
                  </h2>
                  <p className="mt-0.5 text-sm text-oma-text-muted">
                    {STEP_META[2].subtitle}
                  </p>
                </div>
              </div>

              {/* GitHub benefits */}
              <div className="space-y-3">
                {[
                  {
                    icon: GitBranch,
                    text: "Agents push code to branches and create pull requests",
                  },
                  {
                    icon: Sparkles,
                    text: "Review agent work and approve PRs from the chat",
                  },
                  {
                    icon: ExternalLink,
                    text: "Workspace clones your repo automatically for each run",
                  },
                ].map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-center gap-3 rounded-oma bg-oma-bg-surface/60 px-3.5 py-3"
                  >
                    <Icon className="size-4 shrink-0 text-oma-text-muted" />
                    <p className="text-sm text-oma-text-muted">{text}</p>
                  </div>
                ))}
              </div>

              {/* Connect / Skip actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConnectGitHub}
                  className="flex w-full items-center justify-center gap-2 rounded-oma bg-oma-text px-4 py-2.5 text-sm font-medium text-oma-bg transition-all hover:bg-oma-text/90 hover:shadow-oma"
                >
                  <Github className="size-4" />
                  Connect GitHub Repository
                </button>

                <button
                  onClick={handleSkipGitHub}
                  className="text-sm text-oma-text-muted transition-colors hover:text-oma-text"
                >
                  Skip for now — you can connect later in settings
                </button>
              </div>
            </div>
          </StepPanel>

          {/* Step 3: Success */}
          <StepPanel visible={step === 3} direction={direction}>
            <div className="flex flex-col items-center space-y-6 px-6 py-8 text-center">
              {/* Success icon */}
              <div className="relative">
                <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-oma-jade/20 to-oma-jade/5 ring-1 ring-oma-jade/20">
                  <Check className="size-7 text-oma-jade" />
                </div>
                <div className="absolute inset-0 animate-ping rounded-full bg-oma-jade/10" style={{ animationDuration: "2s" }} />
              </div>

              <div>
                <h2 className="font-serif text-lg font-semibold text-oma-text">
                  {STEP_META[3].title}
                </h2>
                <p className="mt-1 text-sm text-oma-text-muted">
                  <span className="font-medium text-oma-text">{name}</span>{" "}
                  has been created. Add features and the agents will take it
                  from there.
                </p>
              </div>

              {/* Quick info cards */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between rounded-oma bg-oma-bg-surface/60 px-4 py-3 text-sm">
                  <span className="text-oma-text-muted">Pipeline</span>
                  <span className="text-xs text-oma-text">
                    Architect → Coder → Reviewer → Tester
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-oma bg-oma-bg-surface/60 px-4 py-3 text-sm">
                  <span className="text-oma-text-muted">GitHub</span>
                  <span className="text-xs text-oma-text-subtle">
                    {createdProjectId && step === 3
                      ? "Not connected"
                      : "Connected"}
                  </span>
                </div>
              </div>
            </div>
          </StepPanel>
        </div>

        {/* ---- Footer with navigation buttons ---- */}
        <div className="flex items-center justify-between border-t border-oma-glass-border/50 px-6 py-4">
          {/* Left side: Back or Cancel */}
          <div>
            {step === 1 ? (
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-oma px-4 py-2 text-sm text-oma-text-muted transition-colors hover:bg-oma-bg-surface hover:text-oma-text"
              >
                Cancel
              </button>
            ) : step === 2 ? (
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 rounded-oma px-4 py-2 text-sm text-oma-text-muted transition-colors hover:bg-oma-bg-surface hover:text-oma-text"
              >
                <ArrowLeft className="size-3.5" />
                Back
              </button>
            ) : null}
          </div>

          {/* Right side: Next or Create */}
          <div>
            {step === 1 && (
              <button
                onClick={() => void handleCreateProject()}
                disabled={!isNameValid || creating}
                className={cn(
                  "flex items-center gap-2 rounded-oma px-5 py-2.5 text-sm font-medium transition-all duration-200",
                  isNameValid && !creating
                    ? "bg-gradient-to-r from-oma-primary to-oma-primary-dim text-white shadow-oma-sm hover:shadow-oma-glow-primary hover:brightness-110"
                    : "cursor-not-allowed bg-oma-bg-surface text-oma-text-subtle",
                )}
              >
                {creating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Project
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleGoToProject}
                className="flex items-center gap-2 rounded-oma bg-gradient-to-r from-oma-primary to-oma-primary-dim px-5 py-2.5 text-sm font-medium text-white shadow-oma-sm transition-all duration-200 hover:shadow-oma-glow-primary hover:brightness-110"
              >
                Go to Project
                <ArrowRight className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// StepPanel — wraps each step's content with enter/exit transitions
// ---------------------------------------------------------------------------

function StepPanel({
  visible,
  direction,
  children,
}: {
  visible: boolean;
  direction: "forward" | "backward";
  children: React.ReactNode;
}) {
  const [shouldRender, setShouldRender] = useState(visible);
  const [animClass, setAnimClass] = useState("");

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      // Enter from the appropriate side
      requestAnimationFrame(() => {
        setAnimClass(
          direction === "forward"
            ? "translate-x-0 opacity-100"
            : "translate-x-0 opacity-100",
        );
      });
    } else if (shouldRender) {
      // Exit to the opposite side
      setAnimClass(
        direction === "forward"
          ? "-translate-x-8 opacity-0"
          : "translate-x-8 opacity-0",
      );
      const timer = setTimeout(() => setShouldRender(false), 250);
      return () => clearTimeout(timer);
    }
  }, [visible, direction, shouldRender]);

  // Set initial position for entering
  useEffect(() => {
    if (visible && shouldRender) {
      // Micro-delay to trigger transition
    } else if (!visible && !shouldRender) {
      setAnimClass(
        direction === "forward"
          ? "translate-x-8 opacity-0"
          : "-translate-x-8 opacity-0",
      );
    }
  }, [visible, shouldRender, direction]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "w-full transition-all duration-250 ease-out",
        animClass || (visible ? "" : "opacity-0"),
      )}
    >
      {children}
    </div>
  );
}
