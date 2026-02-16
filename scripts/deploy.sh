#!/bin/bash
# deploy.sh -- Deploy the orchestrator to the EC2 instance.
#
# Usage:
#   ./scripts/deploy.sh              # Uses Elastic IP from CDK outputs
#   ./scripts/deploy.sh 1.2.3.4      # Specify IP directly
#   SSH_KEY=~/.ssh/mykey.pem ./scripts/deploy.sh  # Custom SSH key
#
# Prerequisites:
#   - SSH access to the instance (key pair configured in CDK)
#   - Instance bootstrapped (user-data ran on first boot)
#   - Repo cloned to /opt/omakase/app on the instance (first deploy: see below)
#
# First-time setup (run manually via SSH):
#   ssh -i ~/.ssh/your-key.pem ec2-user@<elastic-ip>
#   sudo git clone https://github.com/your-org/omakase.git /opt/omakase/app
#   cd /opt/omakase/app && sudo bun install
#   sudo systemctl start omakase-orchestrator
#   claude login  # authenticate Claude Code for plan billing

set -euo pipefail

# Resolve the Elastic IP
if [ -n "${1:-}" ]; then
  HOST="$1"
else
  # Try to read from CDK outputs
  CDK_OUTPUTS="infra/cdk-outputs.json"
  if [ -f "$CDK_OUTPUTS" ]; then
    HOST=$(python3 -c "import json; d=json.load(open('$CDK_OUTPUTS')); print(list(d.values())[0].get('ElasticIp',''))" 2>/dev/null || true)
  fi

  if [ -z "${HOST:-}" ]; then
    echo "Error: Could not determine host IP."
    echo "Usage: ./scripts/deploy.sh <elastic-ip>"
    echo "   or: Run 'cd infra && npx cdk deploy -O cdk-outputs.json' first"
    exit 1
  fi
fi

SSH_KEY="${SSH_KEY:-}"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"
if [ -n "$SSH_KEY" ]; then
  SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
fi
SSH_USER="${SSH_USER:-ec2-user}"

echo "Deploying to $SSH_USER@$HOST..."

# shellcheck disable=SC2029
ssh $SSH_OPTS "$SSH_USER@$HOST" bash -s << 'REMOTE'
set -euo pipefail

APP_DIR="/opt/omakase/app"

if [ ! -d "$APP_DIR" ]; then
  echo "Error: $APP_DIR does not exist. Run first-time setup."
  exit 1
fi

cd "$APP_DIR"

echo "Pulling latest code..."
sudo git pull --ff-only

echo "Installing dependencies..."
sudo bun install --frozen-lockfile 2>/dev/null || sudo bun install

# -- Log directory --
sudo mkdir -p /var/log/omakase

# -- CloudWatch agent config (idempotent, file-based) --
echo "Configuring CloudWatch agent..."
sudo mkdir -p /opt/aws/amazon-cloudwatch-agent/etc
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null << 'CWCFG'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/omakase/orchestrator.log",
            "log_group_name": "/omakase/orchestrator",
            "log_stream_name": "{instance_id}/orchestrator",
            "retention_in_days": 30
          },
          {
            "file_path": "/opt/omakase/workspaces/*/agent-*.log",
            "log_group_name": "/omakase/orchestrator",
            "log_stream_name": "{instance_id}/agents",
            "auto_removal": true
          }
        ]
      }
    }
  }
}
CWCFG
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json 2>/dev/null \
  && echo "CloudWatch agent configured." \
  || echo "Warning: CloudWatch agent not installed. Logs available via journalctl only."

# -- Journal-to-file export timer (idempotent) --
if [ ! -f /etc/systemd/system/omakase-log-export.timer ]; then
  echo "Setting up log export timer..."
  sudo tee /etc/systemd/system/omakase-log-export.service > /dev/null << 'LOGEXPORT'
[Unit]
Description=Export omakase orchestrator journal to log file
After=omakase-orchestrator.service

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'journalctl -u omakase-orchestrator --since "5 minutes ago" --no-pager >> /var/log/omakase/orchestrator.log'
LOGEXPORT

  sudo tee /etc/systemd/system/omakase-log-export.timer > /dev/null << 'LOGTIMER'
[Unit]
Description=Export omakase logs every 5 minutes

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
LOGTIMER

  sudo systemctl daemon-reload
  sudo systemctl enable --now omakase-log-export.timer
fi

echo "Restarting orchestrator..."
sudo systemctl restart omakase-orchestrator

echo "Waiting for health check..."
sleep 3
if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
  echo "Orchestrator is healthy!"
else
  echo "Warning: Health check failed. Check logs: sudo journalctl -u omakase-orchestrator -f"
fi
REMOTE

echo "Deploy complete!"
