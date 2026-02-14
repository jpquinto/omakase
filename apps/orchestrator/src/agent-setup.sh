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
#
# Optional environment variables:
#   FEATURE_ID  - Unique identifier for the feature being worked on.
#                 If set, creates/checks out branch agent/<FEATURE_ID>.
#                 If unset, stays on BASE_BRANCH (used by work sessions).
#   WORKSPACE   - Workspace directory (default: /workspace)
#   BASE_BRANCH - Branch to base the feature branch on (default: main)
#   GIT_DEPTH   - Shallow clone depth; 0 for full clone (default: 0)
# ---------------------------------------------------------------------------

set -euo pipefail

# ---------------------------------------------------------------------------
# Validate required environment variables
# ---------------------------------------------------------------------------

REPO_URL="${REPO_URL:?REPO_URL is required. Set it to the repository clone URL.}"
FEATURE_ID="${FEATURE_ID:-}"

# ---------------------------------------------------------------------------
# Configure optional variables with sensible defaults
# ---------------------------------------------------------------------------

WORKSPACE="${WORKSPACE:-/workspace}"
BASE_BRANCH="${BASE_BRANCH:-main}"
GIT_DEPTH="${GIT_DEPTH:-0}"

if [ -n "${FEATURE_ID}" ]; then
  BRANCH_NAME="agent/${FEATURE_ID}"
else
  BRANCH_NAME=""
fi

echo "=== Omakase Agent Workspace Setup ==="
echo "  Repository : ${REPO_URL}"
echo "  Feature    : ${FEATURE_ID:-<none>}"
echo "  Branch     : ${BRANCH_NAME:-${BASE_BRANCH} (default)}"
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
# Clean up dirty state from a previous agent crash/timeout
# ---------------------------------------------------------------------------

if [ -d "${WORKSPACE}/.git" ]; then
  cd "${WORKSPACE}"
  if ! git diff --quiet HEAD 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    echo "WARNING: Workspace has uncommitted changes. Resetting to clean state..."
    git checkout -- .
    git clean -fd
  fi
fi

# ---------------------------------------------------------------------------
# Create or checkout the feature branch
#
# If FEATURE_ID is set, create/checkout branch agent/<FEATURE_ID>.
# If FEATURE_ID is empty (work sessions), stay on BASE_BRANCH.
# ---------------------------------------------------------------------------

if [ -z "${BRANCH_NAME}" ]; then
  echo "No feature branch requested. Staying on ${BASE_BRANCH}..."
  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || true)
  if [ "${CURRENT_BRANCH}" != "${BASE_BRANCH}" ]; then
    git checkout "${BASE_BRANCH}" 2>/dev/null || git checkout -b "${BASE_BRANCH}" "origin/${BASE_BRANCH}"
  fi
  git pull origin "${BASE_BRANCH}" --ff-only 2>/dev/null || true
else
  echo "Setting up branch ${BRANCH_NAME}..."

  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || true)

  if [ "${CURRENT_BRANCH}" = "${BRANCH_NAME}" ]; then
    echo "Already on branch ${BRANCH_NAME}. Pulling latest..."
    git pull origin "${BRANCH_NAME}" --ff-only 2>/dev/null || true
  elif git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
    echo "Branch ${BRANCH_NAME} exists locally. Checking out..."
    git checkout "${BRANCH_NAME}"
    git pull origin "${BRANCH_NAME}" --ff-only 2>/dev/null || true
  elif git ls-remote --exit-code --heads origin "${BRANCH_NAME}" >/dev/null 2>&1; then
    echo "Branch ${BRANCH_NAME} exists on remote. Checking out..."
    git checkout -b "${BRANCH_NAME}" "origin/${BRANCH_NAME}"
  else
    echo "Creating new branch ${BRANCH_NAME} from origin/${BASE_BRANCH}..."
    git checkout -b "${BRANCH_NAME}" "origin/${BASE_BRANCH}"
  fi
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

DEPS_MARKER="${WORKSPACE}/.omakase-deps-installed"
LOCKFILE_CHECKSUM=""

for lockfile in pnpm-lock.yaml package-lock.json yarn.lock bun.lockb bun.lock requirements.txt pyproject.toml; do
  if [ -f "${lockfile}" ]; then
    LOCKFILE_CHECKSUM="${LOCKFILE_CHECKSUM}$(shasum "${lockfile}" 2>/dev/null || true)"
  fi
done

CURRENT_HASH=$(echo "${LOCKFILE_CHECKSUM}" | shasum | cut -d' ' -f1)
PREVIOUS_HASH=$(cat "${DEPS_MARKER}" 2>/dev/null || true)

if [ "${CURRENT_HASH}" = "${PREVIOUS_HASH}" ] && [ -n "${PREVIOUS_HASH}" ]; then
  echo "Dependencies unchanged (lockfile checksum matches). Skipping install."
else
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

  # Record checksum after successful install
  echo "${CURRENT_HASH}" > "${DEPS_MARKER}"
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
