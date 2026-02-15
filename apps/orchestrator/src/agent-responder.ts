/**
 * agent-responder.ts -- Generates AI responses for agent chat conversations.
 *
 * When a user sends a message to an agent, this module:
 * 1. Fetches the agent run details (role, feature context)
 * 2. Loads the agent's personality (custom or default)
 * 3. Retrieves conversation history
 * 4. Streams Claude's response token-by-token via the stream bus
 * 5. Stores the final response in DynamoDB
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  getAgentRun,
  getFeature,
  listMessages,
  listMessagesByThread,
  createMessage,
  getDefaultPersonality,
} from "@omakase/dynamodb";
import { emit } from "./stream-bus.js";

const ROLE_TO_AGENT: Record<string, string> = {
  architect: "miso",
  coder: "nori",
  reviewer: "koji",
  tester: "toro",
};

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export async function generateAgentResponse(runId: string, userMessage: string, threadId?: string): Promise<void> {
  let run = await getAgentRun({ runId });

  // For synthetic chat-* runIds (global agent chat), create an in-memory stub
  if (!run && runId.startsWith("chat-")) {
    const roleFromId = runId.replace("chat-", "");
    run = {
      id: runId,
      agentId: ROLE_TO_AGENT[roleFromId] ?? roleFromId,
      projectId: "general",
      featureId: "chat",
      role: roleFromId,
      status: "started",
      startedAt: new Date().toISOString(),
    } as NonNullable<typeof run>;
  }

  if (!run) {
    console.error(`[agent-responder] Agent run ${runId} not found`);
    return;
  }

  const feature = run.featureId !== "chat" ? await getFeature({ featureId: run.featureId }) : null;
  const agentName = ROLE_TO_AGENT[run.role] ?? run.role;
  const personality = getDefaultPersonality(agentName);

  // Build system prompt
  const systemParts: string[] = [];

  if (personality) {
    systemParts.push(personality.persona);
    systemParts.push(`Communication style: ${personality.communicationStyle}`);
  } else {
    systemParts.push(`You are an AI agent with the role of ${run.role}.`);
  }

  if (feature) {
    systemParts.push(
      `\nYou are working on the feature "${feature.name}".` +
      (feature.description ? ` Description: ${feature.description}` : "") +
      ` Current status: ${feature.status}.`
    );
  }

  systemParts.push(
    "\nCRITICAL RULE — BREVITY: You MUST keep responses extremely short. " +
    "For casual or conversational messages (greetings, small talk, simple questions), reply in 1 sentence only. " +
    "For straightforward questions, reply in 1–2 sentences max. " +
    "Only write longer responses when the user explicitly asks for detailed explanation, code, or in-depth analysis. " +
    "Think of yourself as a teammate texting — not writing an email. " +
    "Never sign off with your name or a signature line. " +
    "When discussing code, use markdown formatting. " +
    "Stay in character and focus on your role's area of expertise."
  );

  // Build conversation history (prefer thread context for persistence across runs)
  const history = threadId
    ? await listMessagesByThread({ threadId, limit: 50 })
    : await listMessages({ runId });
  const messages: Anthropic.MessageParam[] = history.map((msg) => ({
    role: msg.sender === "user" ? "user" as const : "assistant" as const,
    content: msg.content,
  }));

  // Ensure the conversation ends with the user message
  // (it should already be in history, but if timing is tight, add it)
  if (messages.length === 0 || messages[messages.length - 1].content !== userMessage) {
    messages.push({ role: "user", content: userMessage });
  }

  // Merge consecutive same-role messages to satisfy API constraints
  const merged: Anthropic.MessageParam[] = [];
  for (const msg of messages) {
    if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
      merged[merged.length - 1] = {
        role: msg.role,
        content: merged[merged.length - 1].content + "\n\n" + msg.content,
      };
    } else {
      merged.push({ ...msg });
    }
  }

  // Ensure conversation starts with a user message
  if (merged.length > 0 && merged[0].role !== "user") {
    merged.shift();
  }

  if (merged.length === 0) {
    merged.push({ role: "user", content: userMessage });
  }

  // Signal that the agent is thinking
  emit(runId, { type: "thinking_start" });

  try {
    let fullText = "";

    const stream = getClient().messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 512,
      system: systemParts.join("\n"),
      messages: merged,
    });

    stream.on("text", (text) => {
      fullText += text;
      emit(runId, { type: "token", token: text });
    });

    // Wait for the stream to complete
    await stream.finalMessage();

    // Signal streaming is done
    emit(runId, { type: "thinking_end" });

    if (!fullText) {
      console.warn(`[agent-responder] Empty response for run ${runId}`);
      return;
    }

    await createMessage({
      runId,
      featureId: run.featureId,
      projectId: run.projectId,
      sender: "agent",
      role: run.role,
      content: fullText,
      type: "message",
      threadId,
    });
  } catch (error) {
    emit(runId, { type: "stream_error", error: error instanceof Error ? error.message : String(error) });
    emit(runId, { type: "thinking_end" });
    console.error(`[agent-responder] Failed to generate response for run ${runId}:`, error);
  }
}
