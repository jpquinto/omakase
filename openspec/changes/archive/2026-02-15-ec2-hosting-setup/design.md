## Context

The current CDK stack (`infra/lib/omakase-stack.ts`) provisions a full ECS Fargate architecture: VPC with 2 AZs, NAT gateway, ALB, ECS cluster, orchestrator Fargate service, agent task definitions, ECR, and security groups. This was designed for a scalable multi-user production system.

In practice, Omakase is single-user. The orchestrator needs persistent filesystem access for git workspaces and Claude Code CLI sessions (`claude login` OAuth). ECS Fargate is stateless by design and doesn't support this well. The current setup costs ~$50+/mo (NAT gateway alone is ~$32/mo) for capacity that's unused.

## Goals / Non-Goals

**Goals:**
- Replace ECS Fargate with a single t3.micro EC2 instance (~$8/mo)
- Simplify networking to a single public subnet (no NAT gateway)
- Support Claude Code CLI with plan-based auth (`claude login` on the instance)
- Provide a simple deployment path (SSH + restart)
- Keep DynamoDB tables, Secrets Manager, and ECR unchanged
- Document Vercel frontend deployment considerations

**Non-Goals:**
- Auto-scaling, load balancing, or multi-instance support
- HTTPS/TLS termination on the EC2 instance (use Vercel proxy or Cloudflare later)
- Container-based deployment on EC2 (run Bun directly)
- CI/CD pipeline automation (manual deploy for now)

## Decisions

### 1. EC2 in public subnet with Elastic IP

**Decision**: Place the EC2 instance in a public subnet with an Elastic IP, no NAT gateway.

**Rationale**: NAT gateways cost ~$32/mo and are only needed for private-subnet instances to reach the internet. A public subnet with a security group is sufficient for a single-user setup. The Elastic IP provides a stable address for the frontend's `NEXT_PUBLIC_ORCHESTRATOR_URL`.

**Alternatives considered**:
- Private subnet + NAT: More "correct" networking but $32/mo overhead for no practical benefit
- Public subnet + dynamic IP: Free but IP changes on reboot, breaking frontend config

### 2. t3.micro instance type

**Decision**: Use `t3.micro` (2 vCPU, 1 GiB RAM, burstable).

**Rationale**: The orchestrator is a lightweight Bun/Elysia HTTP server. Claude Code CLI processes make API calls (compute happens on Anthropic's side). 1 GiB is sufficient for Bun + a couple concurrent CLI processes. Burstable CPU handles intermittent load well. Single-user means low concurrency.

**Alternatives considered**:
- t3.small (2 GiB): More headroom, ~$15/mo. Upgrade if t3.micro proves tight.
- t3.nano (0.5 GiB): Too tight for Bun + Claude Code CLI.

### 3. Direct Bun execution (no Docker)

**Decision**: Run the orchestrator directly with Bun on the EC2 instance, not in a container.

**Rationale**: Docker adds memory overhead (~100-200MB) that matters on a 1 GiB instance. Bun installs trivially. Direct execution simplifies debugging (SSH in, check logs, restart). No need for ECR image builds for deployment.

**Alternatives considered**:
- Docker on EC2: Familiar deployment model but wasteful on 1 GiB RAM
- Docker Compose: Overkill for a single process

### 4. User-data bootstrap script

**Decision**: Use an EC2 user-data script to install Bun, Node.js, Claude Code CLI, clone the repo, and configure systemd.

**Rationale**: Makes instance reproducible — terminate and re-create from CDK if needed. The user-data runs once on first boot. A systemd service ensures the orchestrator auto-starts on reboot.

### 5. 5GB gp3 EBS root volume

**Decision**: Use a single 5GB gp3 root volume (no separate data volume).

**Rationale**: Git workspaces are small (most repos < 100MB). 5GB covers the OS, Bun, Node.js, Claude Code CLI, and several cloned repos. gp3 is the cheapest EBS option (~$0.08/GB/mo). Can expand later via CDK update without downtime.

### 6. Security group: ports 8080 + 22

**Decision**: Allow inbound TCP 8080 (orchestrator API) and 22 (SSH) from anywhere. All outbound allowed.

**Rationale**: The orchestrator API needs to be reachable by the Vercel frontend. SSH is needed for `claude login`, deployment, and debugging. For a single-user personal tool, open access is acceptable. Can restrict source IPs later if desired.

### 7. Frontend on Vercel, no infrastructure changes

**Decision**: Keep the Next.js frontend deployed on Vercel. Set `NEXT_PUBLIC_ORCHESTRATOR_URL` to `http://<elastic-ip>:8080`.

**Rationale**: Vercel handles frontend hosting, SSL, CDN, and builds automatically. No need to self-host the frontend. The only coupling is the orchestrator URL environment variable.

**Note**: Browser-to-orchestrator calls will be HTTP (not HTTPS). This is fine for a personal tool. To add HTTPS later, put Cloudflare in front or add an nginx reverse proxy with Let's Encrypt.

### 8. Deployment: SSH + git pull + restart

**Decision**: Deploy by SSH-ing into the instance, pulling latest code, running `bun install`, and restarting the systemd service.

**Rationale**: Simplest possible deployment for a single-user tool. No CI/CD pipeline to maintain. Can be wrapped in a one-line shell script.

## Risks / Trade-offs

- **No HTTPS**: Browser↔orchestrator traffic is unencrypted HTTP. → Acceptable for personal use; add Cloudflare or nginx+certbot later if needed.
- **Single point of failure**: Instance goes down = orchestrator is down. → Acceptable for single-user; EC2 auto-recovery can be enabled.
- **1 GiB RAM may be tight**: Multiple concurrent Claude Code CLI processes could exhaust memory. → Monitor with `free -m`; upgrade to t3.small if needed.
- **Claude Code auth expiry**: OAuth session from `claude login` may expire. → Re-run `claude login` via SSH when needed; monitor for auth errors.
- **No automated deployment**: Manual SSH deploy is fine for one person but doesn't scale. → Acceptable; can add GitHub Actions later.
- **EBS data loss**: If instance is terminated (not stopped), EBS root volume is lost. → Set `deleteOnTermination: false` in CDK, and keep git workspaces as disposable (they can be re-cloned).
