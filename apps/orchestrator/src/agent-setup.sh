#!/bin/bash
# ---------------------------------------------------------------------------
# Agent Workspace Setup Script
#
# Called by the orchestrator before starting any agent (architect, coder,
# reviewer, or tester). Clones the repository, creates or checks out the
# feature branch, and installs project dependencies.
#
# Required environment variables:
#   REPO_URL    - Git clone URL (HTTPS or SSH) for the target repository
#   FEATURE_ID  - Unique identifier for the feature being worked on
#
# Optional environment variables:
#   WORKSPACE   - Workspace directory (default: /workspace)
#   BASE_BRANCH - Branch to base the feature branch on (default: main)
#   GIT_DEPTH   - Shallow clone depth; 0 for full clone (default: 0)
# ---------------------------------------------------------------------------

set -euo pipefail

# ---------------------------------------------------------------------------
# Validate required environment variables
# ---------------------------------------------------------------------------

REPO_URL="${REPO_URL:?REPO_URL is required. Set it to the repository clone URL.}"
FEATURE_ID="${FEATURE_ID:?FEATURE_ID is required. Set it to the feature ticket identifier.}"

# ---------------------------------------------------------------------------
# Configure optional variables with sensible defaults
# ---------------------------------------------------------------------------

WORKSPACE="${WORKSPACE:-/workspace}"
BASE_BRANCH="${BASE_BRANCH:-main}"
GIT_DEPTH="${GIT_DEPTH:-0}"
BRANCH_NAME="agent/${FEATURE_ID}"

echo "=== AutoForge Agent Workspace Setup ==="
echo "  Repository : ${REPO_URL}"
echo "  Feature    : ${FEATURE_ID}"
echo "  Branch     : ${BRANCH_NAME}"
echo "  Base       : ${BASE_BRANCH}"
echo "  Workspace  : ${WORKSPACE}"
echo ""

# ---------------------------------------------------------------------------
# Clone the repository
# ---------------------------------------------------------------------------

if [ -d "${WORKSPACE}/.git" ]; then
  echo "Workspace already contains a git repository. Fetching latest changes..."
  cd "${WORKSPACE}"
  git fetch origin
else
  echo "Cloning repository..."
  if [ "${GIT_DEPTH}" -gt 0 ] 2>/dev/null; then
    git clone --depth "${GIT_DEPTH}" "${REPO_URL}" "${WORKSPACE}"
  else
    git clone "${REPO_URL}" "${WORKSPACE}"
  fi
  cd "${WORKSPACE}"
fi

# ---------------------------------------------------------------------------
# Create or checkout the feature branch
#
# If the branch already exists on the remote, check it out and pull latest.
# Otherwise, create it from the base branch.
# ---------------------------------------------------------------------------

echo "Setting up branch ${BRANCH_NAME}..."

if git ls-remote --exit-code --heads origin "${BRANCH_NAME}" >/dev/null 2>&1; then
  # Branch exists on remote -- check it out and pull
  echo "Branch ${BRANCH_NAME} exists on remote. Checking out..."
  git checkout "${BRANCH_NAME}" 2>/dev/null || git checkout -b "${BRANCH_NAME}" "origin/${BRANCH_NAME}"
  git pull origin "${BRANCH_NAME}" --ff-only || true
else
  # Branch does not exist on remote -- create from base
  echo "Creating new branch ${BRANCH_NAME} from origin/${BASE_BRANCH}..."
  git checkout -b "${BRANCH_NAME}" "origin/${BASE_BRANCH}"
fi

# ---------------------------------------------------------------------------
# Install dependencies
#
# Detect the package manager from lock files and run the appropriate
# deterministic install command. Supports pnpm, npm, yarn, pip, and
# combinations thereof.
# ---------------------------------------------------------------------------

echo ""
echo "Installing dependencies..."

# Node.js dependencies
if [ -f "pnpm-lock.yaml" ]; then
  echo "Detected pnpm lock file. Running pnpm install..."
  pnpm install --frozen-lockfile
elif [ -f "package-lock.json" ]; then
  echo "Detected npm lock file. Running npm ci..."
  npm ci
elif [ -f "yarn.lock" ]; then
  echo "Detected yarn lock file. Running yarn install..."
  yarn install --frozen-lockfile
elif [ -f "bun.lockb" ] || [ -f "bun.lock" ]; then
  echo "Detected bun lock file. Running bun install..."
  bun install --frozen-lockfile
elif [ -f "package.json" ]; then
  echo "Warning: package.json found but no lock file. Running npm install..."
  npm install
fi

# Python dependencies
if [ -f "requirements.txt" ]; then
  echo "Detected requirements.txt. Installing Python dependencies..."
  if [ -n "${VIRTUAL_ENV:-}" ]; then
    pip install -r requirements.txt --quiet
  elif command -v python3 >/dev/null 2>&1; then
    python3 -m pip install -r requirements.txt --quiet
  else
    pip install -r requirements.txt --quiet
  fi
elif [ -f "pyproject.toml" ]; then
  echo "Detected pyproject.toml. Installing Python project..."
  if command -v python3 >/dev/null 2>&1; then
    python3 -m pip install -e ".[dev]" --quiet 2>/dev/null || python3 -m pip install -e . --quiet
  else
    pip install -e ".[dev]" --quiet 2>/dev/null || pip install -e . --quiet
  fi
fi

# ---------------------------------------------------------------------------
# Final status
# ---------------------------------------------------------------------------

echo ""
echo "=== Workspace Ready ==="
echo "  Path   : ${WORKSPACE}"
echo "  Branch : $(git branch --show-current)"
echo "  Commit : $(git log --oneline -1)"
echo ""
