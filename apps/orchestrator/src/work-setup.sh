#!/bin/bash
# ---------------------------------------------------------------------------
# Work Session Workspace Setup Script
#
# Provisions a workspace for interactive work sessions. Reuses agent-setup.sh
# for clone/fetch and dependency install, then injects agent context (CLAUDE.md,
# personality, memories) so the agent operates with its configured persona.
#
# Unlike agent-entrypoint.sh (which runs the full pipeline lifecycle), this
# script only sets up the workspace and exits -- Claude Code is spawned
# separately by the WorkSessionManager.
#
# Required environment variables:
#   REPO_URL    - Git clone URL (HTTPS or SSH) for the target repository
#   WORKSPACE   - Workspace directory path
#   AGENT_ROLE  - One of: architect, coder, reviewer, tester
#   AGENT_NAME  - One of: miso, nori, koji, toro
#
# Optional environment variables:
#   PROJECT_ID  - Project ID for memory scoping
#   BASE_BRANCH - Branch to stay on (default: main)
# ---------------------------------------------------------------------------

set -euo pipefail

# ---------------------------------------------------------------------------
# Validate required environment variables
# ---------------------------------------------------------------------------

REPO_URL="${REPO_URL:?REPO_URL is required.}"
WORKSPACE="${WORKSPACE:?WORKSPACE is required.}"
AGENT_ROLE="${AGENT_ROLE:?AGENT_ROLE is required.}"
AGENT_NAME="${AGENT_NAME:?AGENT_NAME is required.}"

# ---------------------------------------------------------------------------
# Configure optional variables
# ---------------------------------------------------------------------------

PROJECT_ID="${PROJECT_ID:-}"
BASE_BRANCH="${BASE_BRANCH:-main}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROLES_DIR="${SCRIPT_DIR}/agent-roles"
MEMORY_HELPER="${SCRIPT_DIR}/memory-helper.ts"

echo "=== Omakase Work Session Setup ==="
echo "  Repository : ${REPO_URL}"
echo "  Workspace  : ${WORKSPACE}"
echo "  Agent      : ${AGENT_NAME} (${AGENT_ROLE})"
echo ""

# ---------------------------------------------------------------------------
# Step 1: Clone/fetch and install dependencies via agent-setup.sh
#
# We export the vars agent-setup.sh expects and unset FEATURE_ID so it
# stays on the base branch instead of creating a feature branch.
# ---------------------------------------------------------------------------

echo "--- Step 1: Workspace provisioning ---"

export REPO_URL WORKSPACE BASE_BRANCH
unset FEATURE_ID 2>/dev/null || true

bash "${SCRIPT_DIR}/agent-setup.sh"

# ---------------------------------------------------------------------------
# Step 2: Copy role-specific CLAUDE.md to workspace root
# ---------------------------------------------------------------------------

echo "--- Step 2: Setting up ${AGENT_ROLE} agent instructions ---"

ROLE_CLAUDE_MD="${ROLES_DIR}/${AGENT_ROLE}/CLAUDE.md"

if [ -f "${ROLE_CLAUDE_MD}" ]; then
  cp "${ROLE_CLAUDE_MD}" "${WORKSPACE}/CLAUDE.md"
  echo "Copied ${AGENT_ROLE} CLAUDE.md to workspace root."
else
  echo "WARNING: Role instructions not found at ${ROLE_CLAUDE_MD}"
fi

# ---------------------------------------------------------------------------
# Step 2b: Fetch personality and prepend to CLAUDE.md
# ---------------------------------------------------------------------------

echo "--- Step 2b: Injecting personality for ${AGENT_NAME} ---"

if [ -f "${MEMORY_HELPER}" ]; then
  PERSONALITY_BLOCK=$(bun run "${MEMORY_HELPER}" fetch-personality --agent "${AGENT_NAME}" 2>/dev/null || true)

  if [ -n "${PERSONALITY_BLOCK}" ]; then
    EXISTING_CLAUDE_MD=$(cat "${WORKSPACE}/CLAUDE.md" 2>/dev/null || true)
    printf '%s\n\n%s' "${PERSONALITY_BLOCK}" "${EXISTING_CLAUDE_MD}" > "${WORKSPACE}/CLAUDE.md"
    echo "Injected ${AGENT_NAME} personality into CLAUDE.md."
  else
    echo "No personality configured for ${AGENT_NAME}, using role instructions only."
  fi
else
  echo "Memory helper not found, skipping personality injection."
fi

# ---------------------------------------------------------------------------
# Step 2c: Fetch memories and write to .claude/memory/MEMORY.md
# ---------------------------------------------------------------------------

echo "--- Step 2c: Injecting memories for ${AGENT_NAME} ---"

if [ -n "${PROJECT_ID}" ] && [ -f "${MEMORY_HELPER}" ]; then
  MEMORY_CONTENT=$(bun run "${MEMORY_HELPER}" fetch-memory --agent "${AGENT_NAME}" --project "${PROJECT_ID}" 2>/dev/null || true)

  if [ -n "${MEMORY_CONTENT}" ]; then
    mkdir -p "${WORKSPACE}/.claude/memory"
    echo "${MEMORY_CONTENT}" > "${WORKSPACE}/.claude/memory/MEMORY.md"
    echo "Wrote memories to .claude/memory/MEMORY.md"
  else
    echo "No memories found for ${AGENT_NAME} in project ${PROJECT_ID}."
  fi
else
  echo "Skipping memory injection (no PROJECT_ID or memory-helper not found)."
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------

echo ""
echo "=== Work Session Workspace Ready ==="
echo "  Path   : ${WORKSPACE}"
echo "  Branch : $(cd "${WORKSPACE}" && git branch --show-current)"
echo ""
