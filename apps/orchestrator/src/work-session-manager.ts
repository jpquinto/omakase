/**
 * work-session-manager.ts -- Manages Claude Code subprocesses for work mode conversations.
 *
 * Each work session spawns a `claude` CLI process with `--output-format stream-json`.
 * User follow-up messages are piped to stdin. stdout is parsed for structured JSON
 * events and streamed through the stream-bus for SSE delivery to the frontend.
 */

import { createAgentRun, completeAgentRun } from "@omakase/dynamodb";
import { getDefaultPersonality } from "@omakase/dynamodb";
import { emit } from "./stream-bus.js";
import type { Subprocess } from "bun";
import type { AgentRunRole } from "@omakase/db";

const AGENT_ROLE_MAP: Record<string, AgentRunRole> = {
  miso: "architect",
  nori: "coder",
  koji: "reviewer",
  toro: "tester",
};

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const GRACEFUL_SHUTDOWN_MS = 5_000; // 5 seconds

export interface WorkSession {
  runId: string;
  agentName: string;
  projectId: string;
  threadId: string;
  process: Subprocess;
  startedAt: string;
  lastActivityAt: string;
  inactivityTimer: ReturnType<typeof setTimeout>;
}

/**
 * WorkSessionManager maintains a map of active sessions keyed by `runId`.
 * Each session holds the child process handle and session metadata.
 */
export class WorkSessionManager {
  private sessions = new Map<string, WorkSession>();
  private localWorkspaceRoot: string;

  constructor(localWorkspaceRoot: string) {
    this.localWorkspaceRoot = localWorkspaceRoot;
  }

  /**
   * Start a new work session: create an AgentRun, spawn the claude CLI, and begin parsing output.
   */
  async startSession(params: {
    agentName: string;
    projectId: string;
    threadId: string;
    prompt: string;
  }): Promise<{ runId: string; status: string }> {
    const role = AGENT_ROLE_MAP[params.agentName];
    if (!role) throw new Error(`Unknown agent: ${params.agentName}`);

    // Verify claude CLI is available
    const whichResult = Bun.spawnSync(["which", "claude"]);
    if (whichResult.exitCode !== 0) {
      throw new Error("Claude CLI not found in PATH. Install it to use work mode.");
    }

    // Create AgentRun record (Task 3.1)
    const runId = await createAgentRun({
      agentId: params.agentName,
      projectId: params.projectId,
      featureId: `work-session-${params.threadId}`,
      role,
    });

    // Build system prompt from agent personality
    const personality = getDefaultPersonality(params.agentName);
    const systemPrompt = personality
      ? `${personality.persona}\nCommunication style: ${personality.communicationStyle}`
      : `You are an AI agent with the role of ${role}.`;

    // Set working directory to project workspace
    const cwd = `${this.localWorkspaceRoot}/${params.projectId}`;

    // Spawn the claude CLI subprocess
    const args = [
      "claude",
      "--output-format", "stream-json",
      "--system-prompt", systemPrompt,
      "-p", params.prompt,
    ];

    const proc = Bun.spawn(args, {
      cwd,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });

    const now = new Date().toISOString();

    // Set up inactivity timeout
    const inactivityTimer = setTimeout(() => {
      this.handleInactivityTimeout(runId);
    }, INACTIVITY_TIMEOUT_MS);

    const session: WorkSession = {
      runId,
      agentName: params.agentName,
      projectId: params.projectId,
      threadId: params.threadId,
      process: proc,
      startedAt: now,
      lastActivityAt: now,
      inactivityTimer,
    };

    this.sessions.set(runId, session);

    // Start parsing stdout in the background
    this.parseOutputStream(runId, proc);

    // Handle process exit
    proc.exited.then((exitCode) => {
      this.handleProcessExit(runId, exitCode);
    });

    return { runId, status: "started" };
  }

  /**
   * Send a follow-up message to an active work session's stdin.
   */
  async sendMessage(runId: string, message: string): Promise<void> {
    const session = this.sessions.get(runId);
    if (!session) {
      throw new Error(`Work session ${runId} not found or has ended`);
    }

    // Check if process is still alive
    if (session.process.exitCode !== null) {
      throw new Error(`Work session ${runId} has ended (exit code: ${session.process.exitCode})`);
    }

    // Write message to stdin (Bun's FileSink)
    const stdin = session.process.stdin as import("bun").FileSink;
    stdin.write(new TextEncoder().encode(message + "\n"));
    stdin.flush();

    // Reset inactivity timeout
    clearTimeout(session.inactivityTimer);
    session.lastActivityAt = new Date().toISOString();
    session.inactivityTimer = setTimeout(() => {
      this.handleInactivityTimeout(runId);
    }, INACTIVITY_TIMEOUT_MS);
  }

  /**
   * Gracefully end a work session.
   */
  async endSession(runId: string): Promise<void> {
    const session = this.sessions.get(runId);
    if (!session) return;

    clearTimeout(session.inactivityTimer);

    // Try graceful shutdown: send /exit to stdin
    try {
      const stdin = session.process.stdin as import("bun").FileSink;
      stdin.write(new TextEncoder().encode("/exit\n"));
      stdin.flush();
    } catch {
      // stdin may already be closed
    }

    // Wait for graceful shutdown, then force kill
    const exitPromise = Promise.race([
      session.process.exited,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), GRACEFUL_SHUTDOWN_MS)),
    ]);

    const exitCode = await exitPromise;
    if (exitCode === null) {
      // Process didn't exit in time, force kill
      session.process.kill();
    }

    // Complete the AgentRun (Task 3.2)
    await completeAgentRun({
      runId,
      status: "completed",
      outputSummary: "Work session ended by user",
    });

    emit(runId, { type: "thinking_end" });
    this.sessions.delete(runId);
  }

  /**
   * Get a session by runId.
   */
  getSession(runId: string): WorkSession | undefined {
    return this.sessions.get(runId);
  }

  /**
   * List active sessions for an agent.
   */
  listSessions(agentName: string): WorkSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.agentName === agentName,
    );
  }

  /**
   * Clean up all active sessions on shutdown.
   */
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
   * Parse stream-JSON output from Claude Code's stdout and emit events to the stream-bus.
   */
  private async parseOutputStream(runId: string, proc: Subprocess): Promise<void> {
    const stdout = proc.stdout;
    if (!stdout || typeof stdout === "number") return;

    const reader = (stdout as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let inAssistantMessage = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete JSON lines
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (!line) continue;

          try {
            const event = JSON.parse(line);
            this.handleStreamEvent(runId, event, { inAssistantMessage });

            // Track if we're inside an assistant message
            if (event.type === "assistant" && event.subtype === "start") {
              inAssistantMessage = true;
            } else if (event.type === "assistant" && event.subtype === "end") {
              inAssistantMessage = false;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch {
      // Stream ended or errored
    }
  }

  /**
   * Handle individual stream-JSON events from Claude Code.
   */
  private handleStreamEvent(
    runId: string,
    event: Record<string, unknown>,
    state: { inAssistantMessage: boolean },
  ): void {
    const type = event.type as string;
    const subtype = event.subtype as string | undefined;

    if (type === "assistant") {
      if (subtype === "start") {
        emit(runId, { type: "thinking_start" });
      } else if (subtype === "end") {
        emit(runId, { type: "thinking_end" });
      }
    } else if (type === "content_block_delta") {
      // Text delta from assistant response
      const delta = event.delta as Record<string, unknown> | undefined;
      if (delta && delta.type === "text_delta") {
        emit(runId, { type: "token", token: delta.text as string });
      }
    } else if (type === "tool_use") {
      // Tool use events — format as readable text
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
        emit(runId, { type: "token", token: `\n\`${toolText}\`\n` });
      }
    } else if (type === "result") {
      // Final result from Claude Code
      const text = event.result as string | undefined;
      if (text) {
        emit(runId, { type: "token", token: text });
      }
      emit(runId, { type: "thinking_end" });
    }
  }

  /**
   * Handle inactivity timeout — terminate the session.
   */
  private async handleInactivityTimeout(runId: string): Promise<void> {
    const session = this.sessions.get(runId);
    if (!session) return;

    console.log(`[work-session] Session ${runId} timed out after inactivity`);

    // Kill the process
    try {
      session.process.kill();
    } catch {
      // Process may already be dead
    }

    // Complete the AgentRun (Task 3.2)
    await completeAgentRun({
      runId,
      status: "completed",
      outputSummary: "Work session timed out after 30 minutes of inactivity",
    });

    // Notify the frontend
    emit(runId, { type: "stream_error", error: "Session timed out after 30 minutes of inactivity" });

    this.sessions.delete(runId);
  }

  /**
   * Handle unexpected process exit.
   */
  private async handleProcessExit(runId: string, exitCode: number): Promise<void> {
    const session = this.sessions.get(runId);
    if (!session) return; // Already cleaned up

    clearTimeout(session.inactivityTimer);

    if (exitCode !== 0) {
      console.error(`[work-session] Session ${runId} exited with code ${exitCode}`);

      // Complete the AgentRun with failure (Task 3.2)
      await completeAgentRun({
        runId,
        status: "failed",
        errorMessage: `Claude Code exited with code ${exitCode}`,
      });

      emit(runId, { type: "stream_error", error: `Claude Code process exited unexpectedly (code ${exitCode})` });
    } else {
      // Graceful exit (Task 3.2 + 3.3)
      await completeAgentRun({
        runId,
        status: "completed",
        outputSummary: "Work session completed",
      });
    }

    this.sessions.delete(runId);
  }
}
