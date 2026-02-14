#!/usr/bin/env bun
/**
 * memory-helper.ts -- CLI helper for agent memory and personality operations.
 *
 * Invoked by agent-entrypoint.sh to interact with DynamoDB for memory
 * injection/extraction and personality loading.
 *
 * Subcommands:
 *   fetch-memory      --agent <name> --project <id>
 *   fetch-personality  --agent <name>
 *   save-memory        --agent <name> --project <id>  (reads JSON array from stdin)
 */

import {
  createMemory,
  listMemories,
  getPersonality,
  getDefaultPersonality,
} from "@omakase/dynamodb";

const args = process.argv.slice(2);
const command = args[0];

function getArg(name: string): string {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) {
    console.error(`Missing required argument: --${name}`);
    process.exit(1);
  }
  return args[idx + 1]!;
}

async function fetchMemory() {
  const agentName = getArg("agent");
  const projectId = getArg("project");

  const memories = await listMemories({ agentName, projectId });

  if (memories.length === 0) {
    // Output nothing — entrypoint will skip memory file creation
    return;
  }

  // Format as markdown for MEMORY.md
  const lines = [
    `# ${agentName} — Project Memories`,
    "",
    `Memories accumulated across previous runs on this project.`,
    "",
  ];

  for (const memory of memories) {
    lines.push(`- ${memory.content}`);
  }

  console.log(lines.join("\n"));
}

async function fetchPersonality() {
  const agentName = getArg("agent");

  // Try DynamoDB first, fall back to defaults
  let personality = await getPersonality({ agentName });

  if (!personality) {
    const defaults = getDefaultPersonality(agentName);
    if (!defaults) {
      // No personality configured and no default — output nothing
      return;
    }
    // Use defaults (don't persist — just return them)
    personality = { ...defaults, updatedAt: new Date().toISOString() };
  }

  // Format as CLAUDE.md personality section
  const lines = [
    "# Personality",
    "",
    personality.persona,
    "",
    `**Name:** ${personality.displayName}`,
    `**Traits:** ${personality.traits.join(", ")}`,
    `**Communication Style:** ${personality.communicationStyle}`,
    "",
  ];

  console.log(lines.join("\n"));
}

async function saveMemory() {
  const agentName = getArg("agent");
  const projectId = getArg("project");

  // Read JSON array from stdin
  let input = "";
  for await (const chunk of Bun.stdin.stream()) {
    input += new TextDecoder().decode(chunk);
  }

  input = input.trim();
  if (!input) {
    return;
  }

  let learnings: string[];
  try {
    learnings = JSON.parse(input);
  } catch {
    console.error("Failed to parse stdin as JSON array");
    process.exit(1);
  }

  if (!Array.isArray(learnings) || learnings.length === 0) {
    return;
  }

  let saved = 0;
  for (const learning of learnings) {
    if (typeof learning === "string" && learning.trim()) {
      await createMemory({
        agentName,
        projectId,
        content: learning.trim(),
        source: "extraction",
      });
      saved++;
    }
  }

  console.error(`Saved ${saved} memories for ${agentName} in project ${projectId}`);
}

// Dispatch subcommand
switch (command) {
  case "fetch-memory":
    await fetchMemory();
    break;
  case "fetch-personality":
    await fetchPersonality();
    break;
  case "save-memory":
    await saveMemory();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error("Usage: memory-helper.ts <fetch-memory|fetch-personality|save-memory> [options]");
    process.exit(1);
}
