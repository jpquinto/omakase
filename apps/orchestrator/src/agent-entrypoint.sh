#!/bin/bash
# ---------------------------------------------------------------------------
# Agent Entrypoint Script
#
# The main entrypoint for AutoForge agent containers. Orchestrates the full
# agent lifecycle:
#   1. Bootstrap workspace (clone repo, checkout branch, install deps)
#   2. Copy role-specific CLAUDE.md to workspace root
#   3. Build a prompt with feature context for the Claude Code CLI
#   4. Invoke Claude Code CLI in autonomous mode
#   5. Push commits to remote
#   6. Determine exit code (special handling for reviewer verdict)
#
# Required environment variables:
#   AGENT_ROLE          - One of: architect, coder, reviewer, tester
#   REPO_URL            - Git clone URL for the target repository
#   FEATURE_ID          - Unique identifier for the feature being worked on
#   ANTHROPIC_API_KEY   - API key for Claude (injected from Secrets Manager)
#
# Optional environment variables:
#   FEATURE_NAME        - Human-readable feature name (default: "Feature <FEATURE_ID>")
#   FEATURE_DESCRIPTION - Feature description and acceptance criteria
#   WORKSPACE           - Workspace directory (default: /workspace)
#   BASE_BRANCH         - Branch to base the feature branch on (default: main)
# ---------------------------------------------------------------------------

set -euo pipefail

# ---------------------------------------------------------------------------
# Validate required environment variables
# ---------------------------------------------------------------------------

AGENT_ROLE="${AGENT_ROLE:?AGENT_ROLE is required. Must be one of: architect, coder, reviewer, tester.}"
REPO_URL="${REPO_URL:?REPO_URL is required.}"
FEATURE_ID="${FEATURE_ID:?FEATURE_ID is required.}"

# Validate agent role
case "${AGENT_ROLE}" in
  architect|coder|reviewer|tester) ;;
  *)
    echo "ERROR: Invalid AGENT_ROLE '${AGENT_ROLE}'. Must be one of: architect, coder, reviewer, tester."
    exit 1
    ;;
esac

# ---------------------------------------------------------------------------
# Configure optional variables
# ---------------------------------------------------------------------------

WORKSPACE="${WORKSPACE:-/workspace}"
BASE_BRANCH="${BASE_BRANCH:-main}"
FEATURE_NAME="${FEATURE_NAME:-Feature ${FEATURE_ID}}"
FEATURE_DESCRIPTION="${FEATURE_DESCRIPTION:-No description provided.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROLES_DIR="${SCRIPT_DIR}/agent-roles"

echo "=== AutoForge Agent Entrypoint ==="
echo "  Role        : ${AGENT_ROLE}"
echo "  Feature     : ${FEATURE_ID}"
echo "  Feature Name: ${FEATURE_NAME}"
echo "  Workspace   : ${WORKSPACE}"
echo ""

# ---------------------------------------------------------------------------
# Step 1: Bootstrap workspace
# ---------------------------------------------------------------------------

echo "--- Step 1: Bootstrapping workspace ---"
bash "${SCRIPT_DIR}/agent-setup.sh"

# ---------------------------------------------------------------------------
# Step 2: Copy role-specific CLAUDE.md to workspace root
#
# Claude Code CLI automatically reads CLAUDE.md from the project root.
# We copy the role-specific instructions there so the agent operates
# with the correct persona and constraints.
# ---------------------------------------------------------------------------

echo "--- Step 2: Setting up ${AGENT_ROLE} agent instructions ---"

ROLE_CLAUDE_MD="${ROLES_DIR}/${AGENT_ROLE}/CLAUDE.md"

if [ ! -f "${ROLE_CLAUDE_MD}" ]; then
  echo "ERROR: Role instructions not found at ${ROLE_CLAUDE_MD}"
  exit 1
fi

cp "${ROLE_CLAUDE_MD}" "${WORKSPACE}/CLAUDE.md"
echo "Copied ${AGENT_ROLE} CLAUDE.md to workspace root."

# ---------------------------------------------------------------------------
# Step 3: Configure git identity for agent commits
# ---------------------------------------------------------------------------

echo "--- Step 3: Configuring git identity ---"
cd "${WORKSPACE}"
git config user.name "AutoForge ${AGENT_ROLE^} Agent"
git config user.email "autoforge+${AGENT_ROLE}@noreply.github.com"

# ---------------------------------------------------------------------------
# Step 4: Build the prompt based on agent role
#
# Each role gets a targeted prompt that tells Claude Code what to do.
# The CLAUDE.md provides the detailed instructions; the prompt provides
# the feature-specific context.
# ---------------------------------------------------------------------------

echo "--- Step 4: Building prompt for ${AGENT_ROLE} agent ---"

BRANCH_NAME="agent/${FEATURE_ID}"

case "${AGENT_ROLE}" in
  architect)
    PROMPT="You are working on feature: ${FEATURE_NAME}

Feature Description:
${FEATURE_DESCRIPTION}

Feature ID: ${FEATURE_ID}
Branch: ${BRANCH_NAME}
Base Branch: ${BASE_BRANCH}

Follow your CLAUDE.md instructions exactly. Explore the codebase, analyze the requirements, and produce implementation-plan.md at the workspace root. When done, commit the plan to the branch."
    ;;

  coder)
    PROMPT="You are working on feature: ${FEATURE_NAME}

Feature Description:
${FEATURE_DESCRIPTION}

Feature ID: ${FEATURE_ID}
Branch: ${BRANCH_NAME}

Follow your CLAUDE.md instructions exactly. Read the implementation-plan.md at the workspace root, implement all changes specified in the plan, verify compilation (lint + typecheck), and commit your changes to the branch."
    ;;

  reviewer)
    PROMPT="You are reviewing code for feature: ${FEATURE_NAME}

Feature Description:
${FEATURE_DESCRIPTION}

Feature ID: ${FEATURE_ID}
Branch: ${BRANCH_NAME}
Base Branch: ${BASE_BRANCH}

Follow your CLAUDE.md instructions exactly. Read the implementation plan, review the git diff against origin/${BASE_BRANCH}, produce review-report.md at the workspace root, and commit the report to the branch."
    ;;

  tester)
    PROMPT="You are testing feature: ${FEATURE_NAME}

Feature Description:
${FEATURE_DESCRIPTION}

Feature ID: ${FEATURE_ID}
Branch: ${BRANCH_NAME}

Follow your CLAUDE.md instructions exactly. Read the implementation plan, study the coder's implementation, write comprehensive tests following the project's test patterns, run the full test suite, produce test-report.md at the workspace root, and commit test files to the branch."
    ;;
esac

# ---------------------------------------------------------------------------
# Step 5: Invoke Claude Code CLI
#
# Runs Claude Code in print mode (-p) with --dangerously-skip-permissions
# so the agent can use tools (Read, Edit, Write, Bash, etc.) without
# interactive confirmation prompts. The CLAUDE.md in the workspace root
# is automatically picked up as project instructions.
# ---------------------------------------------------------------------------

echo "--- Step 5: Running Claude Code CLI as ${AGENT_ROLE} agent ---"
echo ""

CLAUDE_EXIT_CODE=0
claude -p "${PROMPT}" --dangerously-skip-permissions || CLAUDE_EXIT_CODE=$?

echo ""
echo "Claude Code exited with code: ${CLAUDE_EXIT_CODE}"

# If Claude Code itself failed (not a reviewer verdict), propagate the error
if [ "${CLAUDE_EXIT_CODE}" -ne 0 ] && [ "${AGENT_ROLE}" != "reviewer" ]; then
  echo "ERROR: Claude Code failed with exit code ${CLAUDE_EXIT_CODE}"
  exit "${CLAUDE_EXIT_CODE}"
fi

# ---------------------------------------------------------------------------
# Step 6: Push commits to remote
#
# The next agent in the pipeline will clone fresh and needs to see our
# commits on the remote branch.
# ---------------------------------------------------------------------------

echo "--- Step 6: Pushing commits to remote ---"

if git diff --quiet HEAD "origin/${BRANCH_NAME}" 2>/dev/null; then
  echo "No new commits to push."
else
  git push origin "${BRANCH_NAME}" || {
    echo "WARNING: git push failed. The next agent may not see our changes."
    # Don't fail the whole agent over a push issue -- the orchestrator
    # can detect this and retry.
  }
  echo "Pushed commits to origin/${BRANCH_NAME}"
fi

# ---------------------------------------------------------------------------
# Step 7: Determine exit code
#
# For the reviewer agent, the exit code signals the verdict to the pipeline:
#   0 = APPROVE (proceed to tester)
#   2 = REQUEST_CHANGES (re-run coder)
#   1 = REJECT (pipeline failure)
#
# We parse review-report.md for the verdict rather than relying on Claude
# Code to exit with a specific code, which is more reliable.
# ---------------------------------------------------------------------------

if [ "${AGENT_ROLE}" = "reviewer" ]; then
  echo "--- Step 7: Parsing reviewer verdict ---"

  REVIEW_REPORT="${WORKSPACE}/review-report.md"

  if [ ! -f "${REVIEW_REPORT}" ]; then
    echo "ERROR: Reviewer did not produce review-report.md"
    exit 1
  fi

  # Extract the verdict from the report. Look for **APPROVE**, **REQUEST_CHANGES**, or **REJECT**
  VERDICT=$(grep -oP '\*\*(APPROVE|REQUEST_CHANGES|REJECT)\*\*' "${REVIEW_REPORT}" | head -1 | tr -d '*' || true)

  case "${VERDICT}" in
    APPROVE)
      echo "Verdict: APPROVE -- proceeding to tester."
      exit 0
      ;;
    REQUEST_CHANGES)
      echo "Verdict: REQUEST_CHANGES -- coder will re-run."
      exit 2
      ;;
    REJECT)
      echo "Verdict: REJECT -- pipeline will fail."
      exit 1
      ;;
    *)
      echo "WARNING: Could not parse verdict from review-report.md (got: '${VERDICT}')"
      echo "Defaulting to REJECT for safety."
      exit 1
      ;;
  esac
fi

echo "--- Agent ${AGENT_ROLE} completed successfully ---"
exit 0
