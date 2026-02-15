## 1. Rewrite CDK Stack

- [x] 1.1 Remove all ECS resources (cluster, Fargate service, task definitions, ALB, ECR lifecycle rules) from `omakase-stack.ts`
- [x] 1.2 Simplify VPC to single public subnet in one AZ, remove NAT gateway and private subnets
- [x] 1.3 Add EC2 instance: t3.micro, Amazon Linux 2023 AMI, 5GB gp3 root volume with `deleteOnTermination: false`
- [x] 1.4 Add Elastic IP and associate it with the EC2 instance
- [x] 1.5 Add security group: inbound TCP 8080 + 22 from 0.0.0.0/0, all outbound
- [x] 1.6 Create IAM instance profile with DynamoDB read/write (`omakase-*` tables) and Secrets Manager read (`omakase/api-keys`)
- [x] 1.7 Add SSH key pair resource (or reference an existing key pair name via CDK context/parameter)
- [x] 1.8 Update stack outputs: remove ALB DNS, add EC2 public IP, Elastic IP, instance ID

## 2. User-Data Bootstrap Script

- [x] 2.1 Write user-data shell script that installs: Bun, Node.js 20+, Claude Code CLI, git, CloudWatch agent
- [x] 2.2 Script clones the omakase repo (or sets up a deploy directory at `/opt/omakase`)
- [x] 2.3 Script runs `bun install` in the orchestrator package
- [x] 2.4 Script creates a systemd service (`omakase-orchestrator.service`) that runs `bun run start` with proper env vars
- [x] 2.5 Script enables and starts the systemd service

## 3. Deployment Script

- [x] 3.1 Create `scripts/deploy.sh` that SSHs into the instance, pulls latest code, runs `bun install`, and restarts the systemd service
- [x] 3.2 Script reads the Elastic IP from CDK outputs or a config file

## 4. Vercel Frontend Configuration

- [x] 4.1 Document that `NEXT_PUBLIC_ORCHESTRATOR_URL` must be set to `http://<elastic-ip>:8080` in Vercel project settings
- [x] 4.2 Verify CORS config in orchestrator allows requests from the Vercel domain

## 5. Cleanup

- [x] 5.1 Update orchestrator env var docs — remove ECS-specific vars (`ECS_CLUSTER`, `ECS_TASK_DEFINITION`, `ECS_SUBNETS`, `ECS_SECURITY_GROUP`), document new EC2 setup
- [x] 5.2 Update `CLAUDE.md` infrastructure section to reflect EC2-based architecture
