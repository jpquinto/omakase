/**
 * work-session-manager.ts -- Manages Claude Code subprocesses for work mode conversations.
 *
 * Uses `-p` (print/one-shot) mode for each message. Follow-up messages use
 * `--resume <sessionId>` to continue the same Claude Code conversation.
 * stdout is parsed for structured JSON events and streamed through the
 * stream-bus for SSE delivery to the frontend.
 */

import { createAgentRun, completeAgentRun, createMessage } from "@omakase/dynamodb";
import { getDefaultPersonality } from "@omakase/dynamodb";
import { emit } from "./stream-bus.js";
import { resolve } from "path";
import type { Subprocess } from "bun";
import type { AgentRunRole } from "@omakase/db";

const AGENT_ROLE_MAP: Record<string, AgentRunRole> = {
  miso: "architect",
  nori: "coder",
  koji: "reviewer",
  toro: "tester",
};

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export interface WorkSession {
  runId: string;
  agentName: string;
  projectId: string;
  threadId: string;
  cwd: string;
  /** Claude Code session ID for --resume */
  claudeSessionId: string | null;
  /** Currently running process (null when idle between turns) */
  activeProcess: Subprocess | null;
  /** Whether a response is currently being generated */
  busy: boolean;
  startedAt: string;
  lastActivityAt: string;
  inactivityTimer: ReturnType<typeof setTimeout>;
}

/**
 * WorkSessionManager maintains a map of active sessions keyed by `runId`.
 * Each message spawns a short-lived `claude -p` process. Follow-ups use `--resume`.
 */
export class WorkSessionManager {
  private sessions = new Map<string, WorkSession>();
  private localWorkspaceRoot: string;

  /**
   * Optional callback invoked when a work session completes (success, failure,
   * or timeout). The orchestrator sets this to trigger queue processing so the
   * next queued job can start automatically.
   */
  onSessionComplete: ((agentName: string) => void) | null = null;

  constructor(localWorkspaceRoot: string) {
    this.localWorkspaceRoot = localWorkspaceRoot;
  }

  /**
   * Start a new work session: provision workspace, create an AgentRun,
   * and send the first message to Claude Code.
   */
  async startSession(params: {
    agentName: string;
    projectId?: string;
    threadId: string;
    prompt: string;
    repoUrl?: string;
    githubToken?: string;
  }): Promise<{ runId: string; status: string }> {
    const role = AGENT_ROLE_MAP[params.agentName];
    if (!role) throw new Error(`Unknown agent: ${params.agentName}`);

    // Enforce one active session per project (or per thread if no project).
    if (params.projectId) {
      const existing = this.findSessionByProject(params.projectId);
      if (existing) {
        // Kill any active process from a dead/stale session
        if (existing.activeProcess && existing.activeProcess.exitCode !== null) {
          existing.activeProcess = null;
        }
        if (!existing.busy) {
          // Reuse existing session — clean session, send new prompt
          return { runId: existing.runId, status: "existing" };
        }
        return { runId: existing.runId, status: "existing" };
      }
    } else {
      const existing = this.findSessionByThread(params.threadId);
      if (existing) {
        if (existing.activeProcess && existing.activeProcess.exitCode !== null) {
          existing.activeProcess = null;
        }
        return { runId: existing.runId, status: "existing" };
      }
    }

    // Verify claude CLI is available
    const whichResult = Bun.spawnSync(["which", "claude"]);
    if (whichResult.exitCode !== 0) {
      throw new Error("Claude CLI not found in PATH. Install it to use work mode.");
    }

    // Set working directory
    let cwd: string;

    if (params.projectId && params.repoUrl) {
      cwd = resolve(this.localWorkspaceRoot, "work", params.projectId);

      const setupScript = resolve(import.meta.dir, "work-setup.sh");
      const setupResult = Bun.spawnSync(["bash", setupScript], {
        env: {
          ...process.env,
          REPO_URL: params.repoUrl,
          WORKSPACE: cwd,
          AGENT_ROLE: role,
          AGENT_NAME: params.agentName,
          PROJECT_ID: params.projectId,
          BASE_BRANCH: "main",
          ...(params.githubToken ? { GITHUB_TOKEN: params.githubToken } : {}),
        },
        stdout: "inherit",
        stderr: "inherit",
      });

      if (setupResult.exitCode !== 0) {
        throw new Error(`Workspace setup failed (exit code ${setupResult.exitCode})`);
      }
    } else {
      cwd = this.localWorkspaceRoot;
    }

    // Create AgentRun record
    const runId = await createAgentRun({
      agentId: params.agentName,
      projectId: params.projectId ?? "general",
      featureId: `work-session-${params.threadId}`,
      role,
    });

    const now = new Date().toISOString();

    const inactivityTimer = setTimeout(() => {
      this.handleInactivityTimeout(runId);
    }, INACTIVITY_TIMEOUT_MS);

    const session: WorkSession = {
      runId,
      agentName: params.agentName,
      projectId: params.projectId ?? "general",
      threadId: params.threadId,
      cwd,
      claudeSessionId: null,
      activeProcess: null,
      busy: false,
      startedAt: now,
      lastActivityAt: now,
      inactivityTimer,
    };

    this.sessions.set(runId, session);

    // Send the initial prompt
    console.log(`[work-session] Created session runId=${runId}, sending initial prompt`);
    this.spawnClaudeForMessage(runId, params.prompt);

    return { runId, status: "started" };
  }

  /**
   * Send a follow-up message to an active work session.
   * Spawns a new `claude -p --resume` process.
   */
  async sendMessage(runId: string, message: string): Promise<void> {
    const session = this.sessions.get(runId);
    if (!session) {
      throw new Error(`Work session ${runId} not found or has ended`);
    }

    if (session.busy) {
      console.warn(`[work-session] Session ${runId} is busy, queuing will not occur — message dropped`);
      emit(runId, { type: "stream_error", error: "Agent is still processing the previous message. Please wait." });
      return;
    }

    if (!session.claudeSessionId) {
      console.error(`[work-session] Session ${runId} has no Claude session ID yet — cannot resume`);
      emit(runId, { type: "stream_error", error: "Session not ready. Please wait for the first response." });
      return;
    }

    console.log(`[work-session] sendMessage runId=${runId} claudeSession=${session.claudeSessionId} message="${message.slice(0, 100)}"`);

    this.spawnClaudeForMessage(runId, message);
  }

  /**
   * Spawn a claude -p process for a single message.
   * If session has a claudeSessionId, uses --resume.
   */
  private spawnClaudeForMessage(runId: string, prompt: string): void {
    const session = this.sessions.get(runId);
    if (!session) return;

    session.busy = true;
    session.lastActivityAt = new Date().toISOString();

    // Reset inactivity timeout
    clearTimeout(session.inactivityTimer);
    session.inactivityTimer = setTimeout(() => {
      this.handleInactivityTimeout(runId);
    }, INACTIVITY_TIMEOUT_MS);

    const args = [
      "claude",
      "-p", prompt,
      "--output-format", "stream-json",
      "--verbose",
      "--dangerously-skip-permissions",
    ];

    // Resume existing conversation if we have a session ID
    if (session.claudeSessionId) {
      args.push("--resume", session.claudeSessionId);
    }

    console.log(`[work-session] Spawning: claude -p "${prompt.slice(0, 80)}..." ${session.claudeSessionId ? `--resume ${session.claudeSessionId}` : "(new session)"}`);
    console.log(`[work-session] cwd: ${session.cwd}`);

    // Clear CLAUDECODE env var
    const childEnv = { ...process.env };
    delete childEnv["CLAUDECODE"];

    const proc = Bun.spawn(args, {
      cwd: session.cwd,
      env: childEnv,
      stdin: "inherit",
      stdout: "pipe",
      stderr: "pipe",
    });

    session.activeProcess = proc;
    console.log(`[work-session] Process spawned, pid=${proc.pid}`);

    // Emit thinking_start immediately
    emit(runId, { type: "thinking_start" });

    // Parse stdout and stderr
    this.parseOutputStream(runId, proc);
    this.readStderr(runId, proc);

    // Handle process exit — auto-end session so agent returns to "idle"
    proc.exited.then(async (exitCode) => {
      console.log(`[work-session] Process exited: runId=${runId} pid=${proc.pid} exitCode=${exitCode}`);
      session.busy = false;
      session.activeProcess = null;

      if (exitCode !== 0 && exitCode !== null) {
        console.error(`[work-session] Non-zero exit: ${exitCode}`);
        emit(runId, { type: "stream_error", error: `Claude Code exited with code ${exitCode}` });
      }

      // Wait briefly for any final result events to be processed
      await new Promise((r) => setTimeout(r, 2000));

      // Clean up the session so the agent status returns to idle
      if (this.sessions.has(runId)) {
        console.log(`[work-session] Auto-ending session after process exit: runId=${runId}`);
        await this.endSession(runId);
      }
    });
  }

  /**
   * Gracefully end a work session.
   */
  async endSession(runId: string): Promise<void> {
    const session = this.sessions.get(runId);
    if (!session) return;

    clearTimeout(session.inactivityTimer);

    // Kill active process if running
    if (session.activeProcess && session.activeProcess.exitCode === null) {
      try {
        session.activeProcess.kill();
      } catch {
        // Process may already be dead
      }
    }

    const { agentName } = session;

    await completeAgentRun({
      runId,
      status: "completed",
      outputSummary: "Work session ended by user",
    });

    emit(runId, { type: "thinking_end" });
    this.sessions.delete(runId);

    // Notify the queue manager so it can process the next queued job
    if (this.onSessionComplete) {
      try { this.onSessionComplete(agentName); } catch { /* logged by caller */ }
    }
  }

  getSession(runId: string): WorkSession | undefined {
    return this.sessions.get(runId);
  }

  getSessionCwd(runId: string): string | undefined {
    return this.sessions.get(runId)?.cwd;
  }

  listSessions(agentName: string): WorkSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.agentName === agentName,
    );
  }

  findSessionByProject(projectId: string): WorkSession | undefined {
    return Array.from(this.sessions.values()).find(
      (s) => s.projectId === projectId,
    );
  }

  findSessionByThread(threadId: string): WorkSession | undefined {
    return Array.from(this.sessions.values()).find(
      (s) => s.threadId === threadId,
    );
  }

  /** Return all active sessions across all agents. */
  listAllSessions(): WorkSession[] {
    return Array.from(this.sessions.values());
  }

  async cleanup(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [runId] of this.sessions) {
      promises.push(this.endSession(runId));
    }
    await Promise.allSettled(promises);
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  /**
   * Parse stream-JSON output from Claude Code's stdout.
   */
  private async parseOutputStream(runId: string, proc: Subprocess): Promise<void> {
    const stdout = proc.stdout;
    if (!stdout || typeof stdout === "number") {
      console.error(`[work-session] parseOutputStream: no stdout for runId=${runId}`);
      return;
    }

    const reader = (stdout as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let chunkCount = 0;
    let lineCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`[work-session] stdout ended runId=${runId} (${chunkCount} chunks, ${lineCount} lines)`);
          break;
        }

        chunkCount++;
        const chunk = decoder.decode(value, { stream: true });
        if (chunkCount <= 3) {
          console.log(`[work-session] stdout chunk #${chunkCount} (${chunk.length} bytes): "${chunk.slice(0, 200).replace(/\n/g, "\\n")}"`);
        }
        buffer += chunk;

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (!line) continue;
          lineCount++;

          try {
            const event = JSON.parse(line);
            const eventType = event.type as string;
            const eventSubtype = event.subtype as string | undefined;
            console.log(`[work-session] event #${lineCount}: type=${eventType} subtype=${eventSubtype ?? "-"}`);

            this.handleStreamEvent(runId, event);
          } catch (err) {
            console.warn(`[work-session] JSON parse error line #${lineCount}: ${err}`);
            console.warn(`[work-session] Raw: "${line.slice(0, 200)}"`);
          }
        }
      }
    } catch (err) {
      console.error(`[work-session] parseOutputStream error runId=${runId}:`, err);
    }
  }

  /**
   * Read stderr for diagnostics.
   */
  private async readStderr(runId: string, proc: Subprocess): Promise<void> {
    const stderr = proc.stderr;
    if (!stderr || typeof stderr === "number") return;

    const reader = (stderr as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (line) {
            console.error(`[work-session] stderr: ${line.slice(0, 300)}`);
          }
        }
      }
      if (buffer.trim()) {
        console.error(`[work-session] stderr (final): ${buffer.trim().slice(0, 300)}`);
      }
    } catch {
      // stderr stream ended
    }
  }

  /** Tracks how many assistant text blocks we've emitted in the current turn */
  private turnBlockCount = new Map<string, number>();

  /**
   * Handle stream-JSON events from Claude Code.
   */
  private handleStreamEvent(
    runId: string,
    event: Record<string, unknown>,
  ): void {
    const type = event.type as string;
    const session = this.sessions.get(runId);

    if (type === "system" && event.subtype === "init") {
      // Capture session ID for --resume on follow-ups
      const sessionId = event.session_id as string | undefined;
      if (sessionId && session) {
        console.log(`[work-session] Captured Claude session ID: ${sessionId}`);
        session.claudeSessionId = sessionId;
      }
      // Reset turn block counter for this run
      this.turnBlockCount.set(runId, 0);
    } else if (type === "assistant") {
      const message = event.message as Record<string, unknown> | undefined;
      if (message) {
        const content = message.content as Array<Record<string, unknown>> | undefined;
        if (content) {
          console.log(`[work-session] assistant message: ${content.length} blocks`);
          const blockNum = this.turnBlockCount.get(runId) ?? 0;

          // Add separator before subsequent assistant blocks
          // (e.g., after tool use, when Claude speaks again)
          if (blockNum > 0) {
            emit(runId, { type: "token", token: "\n\n---\n\n" });
          }

          for (const block of content) {
            if (block.type === "text" && typeof block.text === "string") {
              const text = block.text as string;
              console.log(`[work-session] emitting text (${text.length} chars)`);
              emit(runId, { type: "token", token: text });
            }
          }

          this.turnBlockCount.set(runId, blockNum + 1);
        }
      }
    } else if (type === "content_block_delta") {
      const delta = event.delta as Record<string, unknown> | undefined;
      if (delta && delta.type === "text_delta") {
        emit(runId, { type: "token", token: delta.text as string });
      }
    } else if (type === "tool_use") {
      const toolName = event.name as string | undefined;
      const input = event.input as Record<string, unknown> | undefined;
      let toolText = "";

      if (toolName === "Read") {
        toolText = `Reading file: ${input?.file_path ?? "unknown"}`;
      } else if (toolName === "Edit") {
        toolText = `Editing file: ${input?.file_path ?? "unknown"}`;
      } else if (toolName === "Write") {
        toolText = `Writing file: ${input?.file_path ?? "unknown"}`;
      } else if (toolName === "Bash") {
        const cmd = input?.command as string | undefined;
        toolText = `Running: ${cmd ? cmd.slice(0, 100) : "command"}`;
      } else if (toolName === "Glob" || toolName === "Grep") {
        toolText = `Searching: ${input?.pattern ?? "files"}`;
      } else if (toolName) {
        toolText = `Using tool: ${toolName}`;
      }

      if (toolText) {
        console.log(`[work-session] tool_use: ${toolText}`);
        emit(runId, { type: "token", token: `\n\n\`${toolText}\`\n` });
      }
    } else if (type === "result") {
      const resultText = event.result as string | undefined;
      console.log(`[work-session] result (${resultText ? resultText.length + " chars" : "none"})`);
      emit(runId, { type: "thinking_end" });
      this.turnBlockCount.delete(runId);

      // Save the complete response as a message in DynamoDB.
      // This triggers the SSE polling to send a `message` event,
      // which clears streamingContent on the frontend.
      if (resultText && session) {
        const ROLE_MAP: Record<string, AgentRunRole> = {
          miso: "architect", nori: "coder", koji: "reviewer", toro: "tester",
        };
        createMessage({
          runId,
          featureId: `work-session-${session.threadId}`,
          projectId: session.projectId,
          sender: "agent",
          role: ROLE_MAP[session.agentName] ?? "coder",
          content: resultText,
          type: "message",
          threadId: session.threadId,
        }).catch((err) =>
          console.error(`[work-session] Failed to save response message:`, err)
        );
      }
    } else {
      // Log unknown event types for debugging
      if (type !== "tool_result") {
        console.log(`[work-session] unhandled event: ${type}`);
      }
    }
  }

  private async handleInactivityTimeout(runId: string): Promise<void> {
    const session = this.sessions.get(runId);
    if (!session) return;

    const { agentName } = session;
    console.log(`[work-session] Session ${runId} timed out`);

    if (session.activeProcess && session.activeProcess.exitCode === null) {
      try { session.activeProcess.kill(); } catch {}
    }

    await completeAgentRun({
      runId,
      status: "completed",
      outputSummary: "Work session timed out after 30 minutes of inactivity",
    });

    emit(runId, { type: "stream_error", error: "Session timed out after 30 minutes of inactivity" });
    this.sessions.delete(runId);

    // Notify the queue manager so it can process the next queued job
    if (this.onSessionComplete) {
      try { this.onSessionComplete(agentName); } catch { /* logged by caller */ }
    }
  }
}
