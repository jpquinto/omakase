FROM oven/bun:1

# Install system dependencies required by the orchestrator:
# - git: for repository operations
# - curl: for health checks and API calls
RUN apt-get update && \
    apt-get install -y --no-install-recommends git curl && \
    rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI globally
RUN bun install -g @anthropic-ai/claude-code

WORKDIR /app

# Copy dependency manifests first for better Docker layer caching.
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy application source (Bun runs TypeScript directly, no build step)
COPY . .

# Ensure agent scripts are executable (Windows hosts may strip execute bits)
RUN chmod +x src/agent-entrypoint.sh src/agent-setup.sh

EXPOSE 8080

CMD ["bun", "src/index.ts"]
