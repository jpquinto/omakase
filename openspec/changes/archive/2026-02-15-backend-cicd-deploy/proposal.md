## Why

Pushing to master automatically redeploys the frontend (Vercel) and infrastructure (CDK), but the backend orchestrator on EC2 requires a manual SSH deploy script (`scripts/deploy.sh`). This creates a gap where frontend changes deploy instantly but backend changes sit undeployed until someone manually runs the script, leading to version drift and deployment friction.

## What Changes

- Add a GitHub Actions workflow that automatically deploys the orchestrator to EC2 on pushes to master (when `apps/orchestrator/**` or `packages/**` change)
- Use AWS SSM Run Command (already available via IAM instance profile) instead of SSH keys to execute deployment commands on the EC2 instance
- Reuse the existing deploy logic: `git pull`, `bun install`, `systemctl restart omakase-orchestrator`, health check
- Remove the existing `deploy-agent-image.yml` workflow that builds an unused Docker image to ECR

## Capabilities

### New Capabilities
- `backend-auto-deploy`: Automated deployment of the orchestrator to EC2 via GitHub Actions using AWS SSM, triggered on merges to master

### Modified Capabilities
_None — this is purely a CI/CD infrastructure change. No spec-level behavior changes to existing capabilities._

## Impact

- **New file:** `.github/workflows/deploy-orchestrator.yml` — new GitHub Actions workflow
- **Removed file:** `.github/workflows/deploy-agent-image.yml` — unused Docker image build
- **AWS IAM:** EC2 instance profile already has SSM permissions (configured in CDK stack)
- **GitHub Secrets:** Reuses existing `AWS_ROLE_ARN` OIDC secret from `deploy-infra.yml`
- **No application code changes** — only CI/CD pipeline configuration
