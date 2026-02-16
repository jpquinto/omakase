## Context

The orchestrator runs on a single EC2 t3.small instance (Amazon Linux 2023) managed by a systemd service (`omakase-orchestrator`). Deployment is currently manual via `scripts/deploy.sh`, which SSHes into the instance, pulls code, installs dependencies, and restarts the service. The instance already has SSM agent and `AmazonSSMManagedInstanceCore` IAM policy attached, and CDK outputs the `InstanceId`. GitHub Actions already uses AWS OIDC role assumption for infra and ECR deployments.

## Goals / Non-Goals

**Goals:**
- Automatically deploy the orchestrator to EC2 when code changes merge to master
- Use SSM Run Command (no SSH key management in CI)
- Include health check verification after deploy
- Trigger on orchestrator code changes AND shared package changes

**Non-Goals:**
- Blue-green or zero-downtime deployment (single instance, brief restart is acceptable)
- Rollback automation (manual `deploy.sh` or SSM can be used if needed)
- Running orchestrator tests in CI (separate concern, no tests exist yet)
- Changing the systemd service or application architecture

## Decisions

### 1. SSM Run Command over SSH

**Choice:** Use `aws ssm send-command` to execute deploy commands on the EC2 instance.

**Why:** The instance already has SSM agent + `AmazonSSMManagedInstanceCore` policy. SSM eliminates the need to store SSH private keys as GitHub secrets, provides CloudTrail audit logging, and is the standard AWS approach for CI/CD to EC2.

**Alternative considered:** SSH via GitHub Actions — requires storing a PEM key as a secret, managing known_hosts, and bypasses CloudTrail.

### 2. Reuse existing deploy logic

**Choice:** Extract the core deploy steps from `scripts/deploy.sh` into the SSM command document: `git pull`, `bun install`, `systemctl restart`, health check.

**Why:** The deploy script is proven and simple. No need to build an abstraction layer. The CloudWatch agent config and systemd fixup steps are idempotent and can remain.

**Alternative considered:** Ship a deployment artifact (tarball/zip) instead of git pull — adds complexity and the instance already has the repo cloned.

### 3. Instance ID from CDK outputs

**Choice:** Store the EC2 instance ID as a GitHub Actions secret (`EC2_INSTANCE_ID`) rather than querying it dynamically.

**Why:** The instance ID is stable (persists across CDK deploys unless the instance is replaced). Avoids adding CloudFormation describe-stacks permissions to the OIDC role. Simple and reliable.

**Alternative considered:** Query the CDK stack outputs at deploy time — adds a step and requires additional IAM permissions.

### 4. Replace deploy-agent-image.yml

**Choice:** Delete the existing `deploy-agent-image.yml` workflow and replace it with `deploy-orchestrator.yml`.

**Why:** The Docker image build workflow pushes to ECR but the image is never deployed — the EC2 instance runs Bun directly. The new workflow replaces it with an actual deployment. Both trigger on `apps/orchestrator/**` changes.

### 5. Trigger paths include packages/**

**Choice:** Trigger the deploy workflow on changes to `apps/orchestrator/**` OR `packages/**`.

**Why:** The orchestrator imports from `@omakase/dynamodb`, `@omakase/db`, and `@omakase/shared`. Changes to these packages affect the running orchestrator and must trigger a redeploy.

## Risks / Trade-offs

**[Brief downtime during restart]** → Acceptable for a single-instance backend. The systemd service restarts in ~2-3 seconds. Frontend shows stale data during this window but recovers on next poll.

**[Git pull fails due to dirty working tree]** → The deploy script uses `git pull --ff-only` which fails safely on conflicts. The SSM command will report failure and the workflow step will fail. Manual intervention via SSH/SSM is the recovery path.

**[Health check timing]** → A 5-second sleep before health check may not be enough if dependencies are slow to install. Use a retry loop (up to 30 seconds) instead of a single check.

**[SSM command timeout]** → `bun install` on the t3.small instance could take time with many deps. Set SSM command timeout to 300 seconds (5 minutes).
