## ADDED Requirements

### Requirement: Orchestrator deploys automatically on merge to master
The system SHALL automatically deploy the orchestrator to the EC2 instance when changes are merged to the master branch that affect the orchestrator or shared packages.

#### Scenario: Orchestrator code changes trigger deploy
- **WHEN** a push to master includes changes in `apps/orchestrator/**`
- **THEN** the deploy-orchestrator GitHub Actions workflow SHALL execute and deploy the updated code to the EC2 instance

#### Scenario: Shared package changes trigger deploy
- **WHEN** a push to master includes changes in `packages/**`
- **THEN** the deploy-orchestrator GitHub Actions workflow SHALL execute and deploy the updated code to the EC2 instance

#### Scenario: Unrelated changes do not trigger deploy
- **WHEN** a push to master includes changes only in `apps/web/**` or `infra/**`
- **THEN** the deploy-orchestrator workflow SHALL NOT execute

### Requirement: Deployment uses AWS SSM Run Command
The system SHALL execute deployment commands on the EC2 instance via AWS SSM Run Command, not SSH.

#### Scenario: SSM command executes deploy steps
- **WHEN** the deployment workflow runs
- **THEN** it SHALL use `aws ssm send-command` with the `AWS-RunShellScript` document to execute commands on the target EC2 instance

#### Scenario: AWS credentials via OIDC
- **WHEN** the workflow authenticates to AWS
- **THEN** it SHALL use the existing OIDC role assumption (same `AWS_ROLE_ARN` secret used by other deploy workflows)

### Requirement: Deployment executes standard deploy sequence
The system SHALL pull the latest code, install dependencies, and restart the orchestrator systemd service.

#### Scenario: Successful deployment
- **WHEN** the SSM command executes on the EC2 instance
- **THEN** it SHALL run in order: `git pull --ff-only`, `bun install`, `systemctl restart omakase-orchestrator`

#### Scenario: Git pull failure aborts deploy
- **WHEN** `git pull --ff-only` fails (e.g., dirty working tree or non-fast-forward)
- **THEN** the SSM command SHALL exit with a non-zero code and the workflow step SHALL fail

### Requirement: Deployment verifies health after restart
The system SHALL verify the orchestrator is healthy after restart before marking the deployment as successful.

#### Scenario: Health check passes
- **WHEN** the orchestrator restarts successfully
- **THEN** the workflow SHALL verify that `http://localhost:8080/health` returns a successful response within 30 seconds

#### Scenario: Health check fails
- **WHEN** the health endpoint does not respond within 30 seconds after restart
- **THEN** the workflow SHALL fail and report the health check failure

### Requirement: Unused Docker image workflow is removed
The `deploy-agent-image.yml` workflow SHALL be removed since the Docker image it builds is not deployed to the EC2 instance.

#### Scenario: Docker image workflow no longer exists
- **WHEN** this change is applied
- **THEN** `.github/workflows/deploy-agent-image.yml` SHALL NOT exist in the repository
