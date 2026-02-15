## ADDED Requirements

### Requirement: EC2 instance for orchestrator hosting
The system SHALL provision a single t3.micro EC2 instance in a public subnet to run the Bun/Elysia orchestrator and Claude Code CLI.

#### Scenario: Instance is provisioned via CDK
- **WHEN** `cdk deploy` is run
- **THEN** a t3.micro EC2 instance is created in a public subnet with an Elastic IP, 5GB gp3 root volume, and a security group allowing inbound TCP 8080 and 22

#### Scenario: Instance has a stable public IP
- **WHEN** the EC2 instance is running
- **THEN** it is reachable at a stable Elastic IP address that persists across instance stop/start cycles

### Requirement: Bootstrap script installs runtime dependencies
The system SHALL use an EC2 user-data script to install Bun, Node.js, Claude Code CLI, and configure the orchestrator as a systemd service.

#### Scenario: First boot installs dependencies
- **WHEN** the EC2 instance boots for the first time
- **THEN** the user-data script installs Bun, Node.js 20+, Claude Code CLI, and git

#### Scenario: Orchestrator runs as a systemd service
- **WHEN** the instance boots (first or subsequent)
- **THEN** a systemd service starts the orchestrator with `bun run start` in the project directory, auto-restarting on failure

### Requirement: Simplified VPC networking
The system SHALL use a VPC with a single public subnet, no NAT gateway, and no private subnets.

#### Scenario: VPC is minimal
- **WHEN** the CDK stack is deployed
- **THEN** the VPC contains one public subnet in one AZ with an internet gateway, and no NAT gateway

### Requirement: Security group restricts access
The system SHALL configure a security group that allows only necessary inbound traffic.

#### Scenario: Inbound rules are configured
- **WHEN** the security group is applied to the EC2 instance
- **THEN** inbound TCP 8080 (orchestrator API) and TCP 22 (SSH) are allowed from 0.0.0.0/0, and all outbound traffic is allowed

### Requirement: IAM role for EC2 instance
The system SHALL assign an IAM instance profile with permissions for DynamoDB read/write and Secrets Manager read.

#### Scenario: Instance can access DynamoDB
- **WHEN** the orchestrator on the EC2 instance makes DynamoDB API calls
- **THEN** the instance role provides read/write access to all `omakase-*` DynamoDB tables and their indexes

#### Scenario: Instance can read secrets
- **WHEN** the orchestrator needs API keys from Secrets Manager
- **THEN** the instance role provides read access to the `omakase/api-keys` secret

### Requirement: EBS volume persists across stop/start
The system SHALL configure the root EBS volume to not be deleted when the instance is terminated.

#### Scenario: Volume survives termination
- **WHEN** the EC2 instance is terminated
- **THEN** the 5GB gp3 root EBS volume is retained (not deleted)

### Requirement: CloudWatch logging
The system SHALL configure the CloudWatch agent to ship orchestrator logs.

#### Scenario: Logs are shipped to CloudWatch
- **WHEN** the orchestrator writes to stdout/stderr
- **THEN** logs appear in the `/omakase/orchestrator` CloudWatch log group
