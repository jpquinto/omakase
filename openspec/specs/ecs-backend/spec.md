## ADDED Requirements

### Requirement: ECS Fargate cluster for agent execution
The system SHALL run an ECS Fargate cluster with task definitions for the orchestrator service and individual agent tasks.

#### Scenario: Orchestrator runs as an ECS service
- **WHEN** the ECS cluster is deployed
- **THEN** an orchestrator service runs continuously with desired count of 1, auto-restarting on failure

#### Scenario: Agent tasks launch on demand
- **WHEN** the orchestrator assigns work to an agent
- **THEN** a new Fargate task is launched using the agent task definition with role-specific environment variables

### Requirement: Docker containerized agent runtime
The system SHALL package agent runtimes as Docker images stored in ECR, containing Node.js, Claude Code CLI, and role-specific CLAUDE.md instructions.

#### Scenario: Agent container image builds
- **WHEN** `docker build` is run for the agent Dockerfile
- **THEN** an image is produced containing Node.js 20+, Claude Code CLI, git, and project tooling

#### Scenario: Container runs Claude Code session
- **WHEN** an agent Fargate task starts
- **THEN** it clones the target repository, runs Claude Code with the role-specific prompt, and streams output to CloudWatch

### Requirement: Agent lifecycle management
The system SHALL manage agent lifecycles: starting, monitoring, stopping, and cleaning up Fargate tasks.

#### Scenario: Start an agent for a feature
- **WHEN** the orchestrator calls `startAgent(featureId, role)`
- **THEN** a Fargate task is launched with environment variables for the feature ID, role, project repo, and Convex URL

#### Scenario: Monitor running agents
- **WHEN** the orchestrator polls agent status
- **THEN** it receives the Fargate task status (RUNNING, STOPPED, FAILED) and CloudWatch log tail for each active agent

#### Scenario: Stop a running agent
- **WHEN** `stopAgent(taskArn)` is called
- **THEN** the Fargate task is stopped and the feature is released back to "pending" status

#### Scenario: Agent crash handling
- **WHEN** a Fargate task exits with a non-zero exit code
- **THEN** the orchestrator marks the feature as "failing", logs the error, and notifies via the dashboard

### Requirement: Resource limits and concurrency control
The system SHALL enforce maximum concurrency limits for agent tasks per project.

#### Scenario: Concurrency limit respected
- **WHEN** 5 agent tasks are already running for a project and a 6th is requested
- **THEN** the request is queued until a running task completes

#### Scenario: Resource allocation per agent
- **WHEN** an agent Fargate task is launched
- **THEN** it is allocated 1 vCPU and 2GB memory (configurable per role)

### Requirement: Infrastructure as code
The system SHALL define all ECS infrastructure (cluster, task definitions, IAM roles, VPC, ALB, ECR) using AWS CDK or Terraform.

#### Scenario: Infrastructure deploys from code
- **WHEN** `cdk deploy` or `terraform apply` is run
- **THEN** all ECS resources are created or updated to match the defined state

#### Scenario: Infrastructure includes networking
- **WHEN** infrastructure is deployed
- **THEN** the ECS cluster runs in a VPC with private subnets, an ALB for the orchestrator API, and security groups restricting access
