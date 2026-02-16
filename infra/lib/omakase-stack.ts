import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

/**
 * Omakase infrastructure stack.
 *
 * Single EC2 instance hosting the Bun/Elysia orchestrator and Claude Code CLI.
 * Designed for single-user operation with minimal cost (~$10/mo).
 *
 * Resources created:
 * - VPC with one public subnet (no NAT gateway)
 * - EC2 t3.small instance with Elastic IP
 * - IAM instance profile (DynamoDB + Secrets Manager access)
 * - CloudWatch log groups
 * - DynamoDB tables (on-demand billing)
 * - Secrets Manager for API keys
 */
export class OmakaseStack extends cdk.Stack {
  /** The EC2 instance running the orchestrator. */
  public readonly instance: ec2.Instance;

  /** Stable public IP for the orchestrator. */
  public readonly elasticIp: ec2.CfnEIP;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // SSH key pair name — set via CDK context: cdk deploy -c sshKeyName=my-key
    const sshKeyName = this.node.tryGetContext("sshKeyName") as string | undefined;

    // ---------------------------------------------------------------
    // Networking: Simple VPC with one public subnet
    // ---------------------------------------------------------------

    const vpc = new ec2.Vpc(this, "OmakaseVpc", {
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // ---------------------------------------------------------------
    // Security Group: ports 8080 (API) + 22 (SSH)
    // ---------------------------------------------------------------

    const sg = new ec2.SecurityGroup(this, "OrchestratorSG", {
      vpc,
      description: "Omakase orchestrator - API and SSH access",
      allowAllOutbound: true,
    });
    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(8080),
      "Orchestrator API",
    );
    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      "SSH access",
    );

    // ---------------------------------------------------------------
    // CloudWatch Log Groups
    // ---------------------------------------------------------------

    const orchestratorLogGroup = new logs.LogGroup(
      this,
      "OrchestratorLogGroup",
      {
        logGroupName: "/omakase/orchestrator",
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    // ---------------------------------------------------------------
    // Secrets Manager
    // ---------------------------------------------------------------

    const apiKeysSecret = new secretsmanager.Secret(this, "ApiKeysSecret", {
      secretName: "omakase/api-keys",
      description:
        "API keys used by Omakase (e.g. ANTHROPIC_API_KEY, GITHUB_TOKEN)",
    });

    // ---------------------------------------------------------------
    // IAM Role for EC2 instance
    // ---------------------------------------------------------------

    const instanceRole = new iam.Role(this, "OrchestratorRole", {
      roleName: "omakase-orchestrator",
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        // SSM for optional Session Manager access (alternative to SSH)
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore",
        ),
        // CloudWatch agent for log shipping
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "CloudWatchAgentServerPolicy",
        ),
      ],
    });

    // DynamoDB read/write for all omakase tables
    instanceRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "DynamoDbReadWrite",
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:BatchWriteItem",
          "dynamodb:Scan",
        ],
        resources: [
          `arn:aws:dynamodb:${this.region}:${this.account}:table/omakase-*`,
          `arn:aws:dynamodb:${this.region}:${this.account}:table/omakase-*/index/*`,
        ],
      }),
    );

    // Secrets Manager read access
    apiKeysSecret.grantRead(instanceRole);

    // CloudWatch Logs write
    orchestratorLogGroup.grantWrite(instanceRole);

    // ---------------------------------------------------------------
    // EC2 Instance
    // ---------------------------------------------------------------

    // User-data bootstrap script
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      "#!/bin/bash",
      "set -euo pipefail",
      "exec > >(tee /var/log/user-data.log) 2>&1",
      "",
      "echo '=== Omakase Bootstrap ==='",
      "",
      "# System updates (--allowerasing resolves curl-minimal vs curl conflict)",
      "dnf update -y --allowerasing",
      "dnf install -y --allowerasing git curl unzip tar",
      "",
      "# Install Node.js 20 (needed for Claude Code CLI)",
      "curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -",
      "dnf install -y nodejs",
      "",
      "# Install Bun",
      'curl -fsSL https://bun.sh/install | bash',
      'export BUN_INSTALL="/root/.bun"',
      'export PATH="$BUN_INSTALL/bin:$PATH"',
      'ln -sf /root/.bun/bin/bun /usr/local/bin/bun',
      'ln -sf /root/.bun/bin/bunx /usr/local/bin/bunx',
      "",
      "# Install Claude Code CLI",
      "npm install -g @anthropic-ai/claude-code",
      "",
      "# Install and configure CloudWatch agent",
      "dnf install -y amazon-cloudwatch-agent",
      "",
      "# Create log directory",
      "mkdir -p /var/log/omakase",
      "",
      "# CloudWatch agent config — ship orchestrator + agent logs (file-based, no journald)",
      "mkdir -p /opt/aws/amazon-cloudwatch-agent/etc",
      "cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CWCONFIG'",
      '{',
      '  "logs": {',
      '    "logs_collected": {',
      '      "files": {',
      '        "collect_list": [',
      '          {',
      '            "file_path": "/var/log/omakase/orchestrator.log",',
      `            "log_group_name": "${orchestratorLogGroup.logGroupName}",`,
      '            "log_stream_name": "{instance_id}/orchestrator",',
      '            "retention_in_days": 30',
      '          },',
      '          {',
      '            "file_path": "/opt/omakase/workspaces/*/agent-*.log",',
      `            "log_group_name": "${orchestratorLogGroup.logGroupName}",`,
      '            "log_stream_name": "{instance_id}/agents",',
      '            "auto_removal": true',
      '          },',
      '          {',
      '            "file_path": "/var/log/user-data.log",',
      `            "log_group_name": "${orchestratorLogGroup.logGroupName}",`,
      '            "log_stream_name": "{instance_id}/bootstrap"',
      '          }',
      '        ]',
      '      }',
      '    }',
      '  }',
      '}',
      "CWCONFIG",
      "",
      "# Start CloudWatch agent",
      "/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json",
      "",
      "# Journal-to-file export timer (CloudWatch agent reads the file)",
      "cat > /etc/systemd/system/omakase-log-export.service << 'LOGEXPORT'",
      "[Unit]",
      "Description=Export omakase orchestrator journal to log file",
      "After=omakase-orchestrator.service",
      "",
      "[Service]",
      "Type=oneshot",
      'ExecStart=/bin/bash -c \'journalctl -u omakase-orchestrator --since "5 minutes ago" --no-pager >> /var/log/omakase/orchestrator.log\'',
      "LOGEXPORT",
      "",
      "cat > /etc/systemd/system/omakase-log-export.timer << 'LOGTIMER'",
      "[Unit]",
      "Description=Export omakase logs every 5 minutes",
      "",
      "[Timer]",
      "OnCalendar=*:0/5",
      "Persistent=true",
      "",
      "[Install]",
      "WantedBy=timers.target",
      "LOGTIMER",
      "",
      "systemctl enable --now omakase-log-export.timer",
      "",
      "# Create app directory",
      "mkdir -p /opt/omakase",
      "mkdir -p /opt/omakase/workspaces",
      "",
      "# Create systemd service",
      "cat > /etc/systemd/system/omakase-orchestrator.service << 'UNIT'",
      "[Unit]",
      "Description=Omakase Orchestrator",
      "After=network.target",
      "",
      "[Service]",
      "Type=simple",
      "User=root",
      "WorkingDirectory=/opt/omakase/app/apps/orchestrator",
      "ExecStart=/usr/local/bin/bun run start",
      "Restart=always",
      "RestartSec=5",
      "StandardOutput=journal",
      "StandardError=journal",
      "SyslogIdentifier=omakase-orchestrator",
      "Environment=PORT=8080",
      "Environment=EXECUTION_MODE=local",
      "Environment=LOCAL_WORKSPACE_ROOT=/opt/omakase/workspaces",
      "Environment=DYNAMODB_TABLE_PREFIX=omakase-",
      `Environment=AWS_REGION=${this.region}`,
      'Environment=PATH=/usr/local/bin:/root/.bun/bin:/usr/bin:/bin',
      "Environment=AUTO_DISPATCH=false",
      "",
      "[Install]",
      "WantedBy=multi-user.target",
      "UNIT",
      "",
      "systemctl daemon-reload",
      "systemctl enable omakase-orchestrator",
      "",
      "echo '=== Bootstrap complete ==='",
      "echo 'To deploy: clone repo to /opt/omakase/app, run bun install, then systemctl start omakase-orchestrator'",
    );

    this.instance = new ec2.Instance(this, "Orchestrator", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MEDIUM,
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: sg,
      role: instanceRole,
      userData,
      keyPair: sshKeyName
        ? ec2.KeyPair.fromKeyPairName(this, "KeyPair", sshKeyName)
        : undefined,
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(8, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            deleteOnTermination: false,
          }),
        },
      ],
    });

    // ---------------------------------------------------------------
    // Elastic IP
    // ---------------------------------------------------------------

    this.elasticIp = new ec2.CfnEIP(this, "OrchestratorEIP", {
      domain: "vpc",
    });

    new ec2.CfnEIPAssociation(this, "EIPAssociation", {
      eip: this.elasticIp.ref,
      instanceId: this.instance.instanceId,
    });

    // ---------------------------------------------------------------
    // DynamoDB Tables
    // ---------------------------------------------------------------
    // Tables are managed outside of this stack (already exist in AWS).
    // The orchestrator references them by name via DYNAMODB_TABLE_PREFIX.
    // See packages/dynamodb/ for table schemas and GSI definitions.
    //
    // Required tables:
    //   omakase-workspaces  (PK: id, GSI by_linear_org: linearOrganizationId)
    //   omakase-projects    (PK: id, GSI by_status: status, GSI by_linear_project: linearProjectId)
    //   omakase-features    (PK: id, GSI by_project: projectId, GSI by_linearIssueId: linearIssueId)
    //   omakase-agent-runs  (PK: id)
    //   omakase-users       (PK: id, GSI by_auth0Id: auth0Id, GSI by_email: email)
    //   omakase-agent-messages, omakase-agent-threads, omakase-agent-memories, omakase-agent-personalities
    //   omakase-agent-queues  (PK: agentName, SK: sk — position-padded sort key for ordered queue)

    // ---------------------------------------------------------------
    // Stack Outputs
    // ---------------------------------------------------------------

    new cdk.CfnOutput(this, "InstanceId", {
      value: this.instance.instanceId,
      description: "EC2 instance ID",
    });

    new cdk.CfnOutput(this, "ElasticIp", {
      value: this.elasticIp.ref,
      description: "Orchestrator Elastic IP (use for NEXT_PUBLIC_ORCHESTRATOR_URL)",
    });

    new cdk.CfnOutput(this, "OrchestratorUrl", {
      value: `http://${this.elasticIp.ref}:8080`,
      description: "Orchestrator API URL",
    });

    new cdk.CfnOutput(this, "SshCommand", {
      value: sshKeyName
        ? `ssh -i ~/.ssh/${sshKeyName}.pem ec2-user@${this.elasticIp.ref}`
        : `ssh ec2-user@${this.elasticIp.ref}`,
      description: "SSH command to connect to the instance",
    });

    new cdk.CfnOutput(this, "ApiKeysSecretArn", {
      value: apiKeysSecret.secretArn,
      description: "Secrets Manager ARN for API keys",
    });
  }
}
