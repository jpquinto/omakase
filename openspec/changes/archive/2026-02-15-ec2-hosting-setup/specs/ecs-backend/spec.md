## REMOVED Requirements

### Requirement: ECS Fargate cluster for agent execution
**Reason**: Replaced by EC2 instance hosting. The orchestrator runs directly on EC2 with Claude Code CLI, not as a Fargate service.
**Migration**: Deploy orchestrator to EC2 instance via CDK. Remove ECS cluster, services, and task definitions from CDK stack.

### Requirement: Docker containerized agent runtime
**Reason**: Agents run as Claude Code CLI subprocesses on the EC2 instance, not in Docker containers. This enables `claude login` for plan-based billing.
**Migration**: No Docker build needed. Claude Code CLI is installed directly on the EC2 instance via user-data script.

### Requirement: Agent lifecycle management
**Reason**: Agent lifecycle is managed by the WorkSessionManager in-process, not via ECS RunTask/StopTask API calls.
**Migration**: No changes needed — WorkSessionManager already handles this for local execution mode.

### Requirement: Resource limits and concurrency control
**Reason**: Single-user system with direct process spawning; ECS-level resource limits are not applicable.
**Migration**: Concurrency is managed in-process by WorkSessionManager's busy flag. OS-level limits apply naturally.

### Requirement: Infrastructure as code
**Reason**: Replaced by new `ec2-orchestrator` capability. Infrastructure is still CDK but provisions EC2 instead of ECS.
**Migration**: Rewrite `omakase-stack.ts` to use EC2 constructs instead of ECS constructs.
