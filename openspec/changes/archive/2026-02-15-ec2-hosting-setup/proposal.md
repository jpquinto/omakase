## Why

The current CDK stack provisions a full ECS Fargate setup (ALB, NAT gateway, private subnets, ECR, task definitions) designed for multi-user production scale. In reality, Omakase is single-user. Work sessions run Claude Code CLI locally and need persistent filesystem state (git workspaces, Claude auth session). A single EC2 instance is cheaper (~$8/mo vs ~$50+/mo for Fargate+ALB+NAT), simpler, and naturally supports `claude login` for plan-based billing.

## What Changes

- **Replace ECS Fargate orchestrator with a single EC2 instance** running the Bun/Elysia orchestrator directly
- **Remove ALB, NAT gateway, ECS cluster/service/task definitions** — unnecessary for single-instance setup
- **Simplify VPC to a single public subnet** — the EC2 instance gets a public IP and Elastic IP
- **Add EC2 user-data script** to install Bun, Claude Code CLI, and start the orchestrator on boot
- **Keep DynamoDB tables and Secrets Manager** — they're serverless and cost-effective
- **Keep ECR repository** — still useful for future container needs
- **Frontend deploys to Vercel** — no infrastructure changes needed, just `NEXT_PUBLIC_ORCHESTRATOR_URL` pointing to the EC2 instance
- **Add 5GB EBS volume** for git workspaces (gp3, can expand later)
- **Add security group** allowing inbound 8080 (orchestrator API) and 22 (SSH)

## Capabilities

### New Capabilities
- `ec2-orchestrator`: EC2-based hosting for the orchestrator service with Claude Code CLI, replacing ECS Fargate

### Modified Capabilities
- `ecs-backend`: **BREAKING** — ECS Fargate resources are removed in favor of EC2. The orchestrator no longer runs as a Fargate service.

## Impact

- **infra/lib/omakase-stack.ts**: Major rewrite — remove ECS/ALB resources, add EC2 instance, simplify VPC
- **apps/orchestrator**: No code changes needed — it's still a Bun/Elysia server, just running on EC2 instead of Fargate
- **apps/web**: Update `NEXT_PUBLIC_ORCHESTRATOR_URL` to point to EC2 Elastic IP
- **Deployment**: SSH to instance + git pull + restart, or use a simple deploy script
- **Cost**: ~$8/mo (t3.micro) + ~$0.40/mo (5GB gp3) + DynamoDB on-demand + Secrets Manager ≈ **~$10/mo total** (down from $50+)
