## 1. Create Deploy Orchestrator Workflow

- [x] 1.1 Create `.github/workflows/deploy-orchestrator.yml` with trigger on push to master for paths `apps/orchestrator/**` and `packages/**`
- [x] 1.2 Add AWS OIDC credential step using `aws-actions/configure-aws-credentials@v4` with `secrets.AWS_ROLE_ARN` and `secrets.AWS_REGION`
- [x] 1.3 Add SSM send-command step that runs the deploy script: `git pull --ff-only`, `bun install`, `systemctl restart omakase-orchestrator`, and health check with retry loop (up to 30s)
- [x] 1.4 Use `secrets.EC2_INSTANCE_ID` for the target instance (or add it as a new GitHub secret)

## 2. Configure IAM Permissions

- [ ] 2.1 Verify the OIDC role used by GitHub Actions has `ssm:SendCommand` and `ssm:GetCommandInvocation` permissions for the EC2 instance — MANUAL: add inline policy to the OIDC role in AWS IAM console

## 3. Cleanup

- [x] 3.1 Delete `.github/workflows/deploy-agent-image.yml` (unused Docker image build)

## 4. Verify

- [ ] 4.1 Add `EC2_INSTANCE_ID` GitHub secret with value from CDK outputs (`i-0d800e07e5988ebe2`)
- [ ] 4.2 Test the workflow by pushing a change to `apps/orchestrator/` on master
