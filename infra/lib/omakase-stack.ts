import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

/**
 * Omakase ECS infrastructure stack.
 *
 * Creates the full backend environment for running Omakase orchestrator
 * and on-demand agent tasks on AWS Fargate, fronted by an Application
 * Load Balancer.
 *
 * Resources created:
 * - VPC with public and private subnets across 2 AZs
 * - ECS Cluster
 * - Application Load Balancer (public)
 * - ECR repository for agent images
 * - Orchestrator Fargate service (long-running, behind ALB)
 * - Agent task definition (launched on-demand by orchestrator)
 * - IAM roles with least-privilege policies
 * - CloudWatch log groups with 30-day retention
 */
export class OmakaseStack extends cdk.Stack {
  /** The ECS cluster where services and tasks run. */
  public readonly cluster: ecs.Cluster;

  /** The ECR repository holding the omakase-agent Docker image. */
  public readonly repository: ecr.Repository;

  /** The Application Load Balancer fronting the orchestrator. */
  public readonly alb: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ---------------------------------------------------------------
    // Task 7.1: VPC, ECS Cluster, ALB, Security Groups, Log Groups
    // ---------------------------------------------------------------

    // VPC with public subnets for the ALB and private subnets (with NAT)
    // for ECS tasks. Two AZs provide basic high-availability.
    const vpc = new ec2.Vpc(this, "OmakaseVpc", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // ECS Cluster
    this.cluster = new ecs.Cluster(this, "OmakaseCluster", {
      vpc,
      clusterName: "omakase",
      containerInsights: true,
    });

    // CloudWatch log groups with 30-day retention (Task 7.7)
    const orchestratorLogGroup = new logs.LogGroup(
      this,
      "OrchestratorLogGroup",
      {
        logGroupName: "/omakase/orchestrator",
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    const agentsLogGroup = new logs.LogGroup(this, "AgentsLogGroup", {
      logGroupName: "/omakase/agents",
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Security group for the Application Load Balancer.
    // Allows inbound HTTP (80) and HTTPS (443) from anywhere.
    const albSecurityGroup = new ec2.SecurityGroup(this, "AlbSecurityGroup", {
      vpc,
      description: "Omakase ALB - allows HTTP/HTTPS inbound",
      allowAllOutbound: true,
    });
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allow HTTP from anywhere",
    );
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow HTTPS from anywhere",
    );

    // Security group for ECS tasks. Only allows traffic from the ALB.
    const ecsSecurityGroup = new ec2.SecurityGroup(this, "EcsSecurityGroup", {
      vpc,
      description: "Omakase ECS tasks - allows traffic from ALB only",
      allowAllOutbound: true,
    });
    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(8080),
      "Allow traffic from ALB on container port",
    );

    // Application Load Balancer in public subnets
    this.alb = new elbv2.ApplicationLoadBalancer(this, "OmakaseAlb", {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    // ---------------------------------------------------------------
    // Task 7.2: ECR Repository
    // ---------------------------------------------------------------

    this.repository = new ecr.Repository(this, "AgentRepository", {
      repositoryName: "omakase-agent",
      imageScanOnPush: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          description: "Keep only the last 10 images",
          maxImageCount: 10,
          rulePriority: 1,
        },
      ],
    });

    // ---------------------------------------------------------------
    // Task 7.6: IAM Roles
    // ---------------------------------------------------------------

    // Secrets Manager secret placeholder for API keys (referenced by roles below).
    // The actual secret value is managed outside of CDK.
    const apiKeysSecret = new secretsmanager.Secret(this, "ApiKeysSecret", {
      secretName: "omakase/api-keys",
      description:
        "API keys used by Omakase agents (e.g. ANTHROPIC_API_KEY)",
    });

    // Task execution role - shared by both orchestrator and agent tasks.
    // Grants permissions to pull images from ECR and write to CloudWatch Logs.
    const executionRole = new iam.Role(this, "TaskExecutionRole", {
      roleName: "omakase-task-execution",
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy",
        ),
      ],
    });

    // Orchestrator task role - allows the orchestrator to launch, stop,
    // and describe agent tasks, and write logs.
    const orchestratorTaskRole = new iam.Role(this, "OrchestratorTaskRole", {
      roleName: "omakase-orchestrator-task",
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    orchestratorTaskRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "EcsAgentManagement",
        effect: iam.Effect.ALLOW,
        actions: [
          "ecs:RunTask",
          "ecs:StopTask",
          "ecs:DescribeTasks",
        ],
        // Scope to this account and cluster to follow least-privilege
        resources: ["*"],
        conditions: {
          ArnEquals: {
            "ecs:cluster": this.cluster.clusterArn,
          },
        },
      }),
    );

    // The orchestrator also needs iam:PassRole to pass the execution role
    // and agent task role when launching agent tasks.
    orchestratorTaskRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "PassRoleForAgentTasks",
        effect: iam.Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [executionRole.roleArn],
      }),
    );

    orchestratorLogGroup.grantWrite(orchestratorTaskRole);

    // Agent task role - allows agents to write logs and read API keys
    // from Secrets Manager.
    const agentTaskRole = new iam.Role(this, "AgentTaskRole", {
      roleName: "omakase-agent-task",
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    agentsLogGroup.grantWrite(agentTaskRole);
    apiKeysSecret.grantRead(agentTaskRole);

    // Allow orchestrator to pass the agent task role when launching tasks
    orchestratorTaskRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "PassAgentTaskRole",
        effect: iam.Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [agentTaskRole.roleArn],
      }),
    );

    // Task 1.3: Grant the orchestrator read/write access to all
    // DynamoDB tables used by Omakase.
    orchestratorTaskRole.addToPolicy(
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

    // ---------------------------------------------------------------
    // Task 7.4: Orchestrator Fargate Service
    // ---------------------------------------------------------------

    const orchestratorTaskDef = new ecs.FargateTaskDefinition(
      this,
      "OrchestratorTaskDef",
      {
        memoryLimitMiB: 2048,
        cpu: 1024,
        executionRole,
        taskRole: orchestratorTaskRole,
      },
    );

    const orchestratorContainer = orchestratorTaskDef.addContainer(
      "OrchestratorContainer",
      {
        image: ecs.ContainerImage.fromEcrRepository(this.repository, "latest"),
        logging: ecs.LogDrivers.awsLogs({
          logGroup: orchestratorLogGroup,
          streamPrefix: "orchestrator",
        }),
        environment: {
          ENV: "production",
          PORT: "8080",
          // The cluster ARN and agent task definition ARN are passed so
          // the orchestrator can launch agent tasks at runtime.
          ECS_CLUSTER_ARN: this.cluster.clusterArn,
        },
        portMappings: [
          {
            containerPort: 8080,
            protocol: ecs.Protocol.TCP,
          },
        ],
        healthCheck: {
          command: [
            "CMD-SHELL",
            "curl -f http://localhost:8080/health || exit 1",
          ],
          interval: cdk.Duration.seconds(30),
          timeout: cdk.Duration.seconds(5),
          retries: 3,
          startPeriod: cdk.Duration.seconds(60),
        },
      },
    );

    // Inject the Anthropic API key from Secrets Manager into the
    // orchestrator container as an environment secret.
    orchestratorContainer.addSecret(
      "ANTHROPIC_API_KEY",
      ecs.Secret.fromSecretsManager(apiKeysSecret, "ANTHROPIC_API_KEY"),
    );

    const orchestratorService = new ecs.FargateService(
      this,
      "OrchestratorService",
      {
        cluster: this.cluster,
        taskDefinition: orchestratorTaskDef,
        desiredCount: 1,
        assignPublicIp: false,
        securityGroups: [ecsSecurityGroup],
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      },
    );

    // ALB target group and listener
    const listener = this.alb.addListener("HttpListener", {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
    });

    listener.addTargets("OrchestratorTarget", {
      port: 8080,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [orchestratorService],
      healthCheck: {
        path: "/health",
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        healthyHttpCodes: "200",
      },
    });

    // ---------------------------------------------------------------
    // Task 7.5: Agent Task Definition (on-demand, not a service)
    // ---------------------------------------------------------------

    const agentTaskDef = new ecs.FargateTaskDefinition(
      this,
      "AgentTaskDef",
      {
        memoryLimitMiB: 2048,
        cpu: 1024,
        executionRole,
        taskRole: agentTaskRole,
        family: "omakase-agent",
      },
    );

    const agentContainer = agentTaskDef.addContainer("AgentContainer", {
      image: ecs.ContainerImage.fromEcrRepository(this.repository, "latest"),
      logging: ecs.LogDrivers.awsLogs({
        logGroup: agentsLogGroup,
        streamPrefix: "agent",
      }),
      environment: {
        ENV: "production",
      },
    });

    // Inject the Anthropic API key from Secrets Manager into agent containers
    agentContainer.addSecret(
      "ANTHROPIC_API_KEY",
      ecs.Secret.fromSecretsManager(apiKeysSecret, "ANTHROPIC_API_KEY"),
    );

    // Pass the agent task definition ARN to the orchestrator so it knows
    // which task definition to use when launching agent tasks.
    orchestratorContainer.addEnvironment(
      "AGENT_TASK_DEF_ARN",
      agentTaskDef.taskDefinitionArn,
    );

    // Also pass the private subnet IDs and security group ID so the
    // orchestrator can configure networking when launching agent tasks.
    orchestratorContainer.addEnvironment(
      "AGENT_SUBNET_IDS",
      vpc
        .selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS })
        .subnetIds.join(","),
    );
    orchestratorContainer.addEnvironment(
      "AGENT_SECURITY_GROUP_ID",
      ecsSecurityGroup.securityGroupId,
    );

    // Task 1.4: Pass the DynamoDB table prefix so the orchestrator can
    // construct table names at runtime.
    orchestratorContainer.addEnvironment(
      "DYNAMODB_TABLE_PREFIX",
      "omakase-",
    );

    // ---------------------------------------------------------------
    // Task 1.1 & 1.2: DynamoDB Tables and Global Secondary Indexes
    // ---------------------------------------------------------------
    // Six tables matching the Convex schema, using on-demand billing
    // and ULID string partition keys. Each table includes GSIs for the
    // query patterns used by the orchestrator and dashboard.

    const usersTable = new dynamodb.Table(this, "UsersTable", {
      tableName: "omakase-users",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    usersTable.addGlobalSecondaryIndex({
      indexName: "by_auth0Id",
      partitionKey: { name: "auth0Id", type: dynamodb.AttributeType.STRING },
    });
    usersTable.addGlobalSecondaryIndex({
      indexName: "by_email",
      partitionKey: { name: "email", type: dynamodb.AttributeType.STRING },
    });

    const projectsTable = new dynamodb.Table(this, "ProjectsTable", {
      tableName: "omakase-projects",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    projectsTable.addGlobalSecondaryIndex({
      indexName: "by_status",
      partitionKey: { name: "status", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING },
    });

    const featuresTable = new dynamodb.Table(this, "FeaturesTable", {
      tableName: "omakase-features",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    featuresTable.addGlobalSecondaryIndex({
      indexName: "by_project",
      partitionKey: { name: "projectId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING },
    });
    featuresTable.addGlobalSecondaryIndex({
      indexName: "by_project_status",
      partitionKey: { name: "projectId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "status", type: dynamodb.AttributeType.STRING },
    });
    featuresTable.addGlobalSecondaryIndex({
      indexName: "by_linearIssueId",
      partitionKey: {
        name: "linearIssueId",
        type: dynamodb.AttributeType.STRING,
      },
    });

    const agentsTable = new dynamodb.Table(this, "AgentsTable", {
      tableName: "omakase-agents",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    agentsTable.addGlobalSecondaryIndex({
      indexName: "by_project",
      partitionKey: { name: "projectId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING },
    });
    agentsTable.addGlobalSecondaryIndex({
      indexName: "by_project_status",
      partitionKey: { name: "projectId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "status", type: dynamodb.AttributeType.STRING },
    });

    const agentRunsTable = new dynamodb.Table(this, "AgentRunsTable", {
      tableName: "omakase-agent-runs",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    agentRunsTable.addGlobalSecondaryIndex({
      indexName: "by_project",
      partitionKey: { name: "projectId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "startedAt", type: dynamodb.AttributeType.STRING },
    });
    agentRunsTable.addGlobalSecondaryIndex({
      indexName: "by_feature",
      partitionKey: { name: "featureId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "startedAt", type: dynamodb.AttributeType.STRING },
    });
    agentRunsTable.addGlobalSecondaryIndex({
      indexName: "by_agent",
      partitionKey: { name: "agentId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "startedAt", type: dynamodb.AttributeType.STRING },
    });

    const ticketsTable = new dynamodb.Table(this, "TicketsTable", {
      tableName: "omakase-tickets",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    ticketsTable.addGlobalSecondaryIndex({
      indexName: "by_project",
      partitionKey: { name: "projectId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "syncedAt", type: dynamodb.AttributeType.STRING },
    });
    ticketsTable.addGlobalSecondaryIndex({
      indexName: "by_linearIssueId",
      partitionKey: {
        name: "linearIssueId",
        type: dynamodb.AttributeType.STRING,
      },
    });

    // ---------------------------------------------------------------
    // Stack Outputs
    // ---------------------------------------------------------------

    new cdk.CfnOutput(this, "AlbDnsName", {
      value: this.alb.loadBalancerDnsName,
      description: "Application Load Balancer DNS name",
    });

    new cdk.CfnOutput(this, "EcrRepositoryUri", {
      value: this.repository.repositoryUri,
      description: "ECR repository URI for docker push",
    });

    new cdk.CfnOutput(this, "ClusterName", {
      value: this.cluster.clusterName,
      description: "ECS cluster name",
    });

    new cdk.CfnOutput(this, "AgentTaskDefArn", {
      value: agentTaskDef.taskDefinitionArn,
      description: "Agent task definition ARN for RunTask calls",
    });

    new cdk.CfnOutput(this, "ApiKeysSecretArn", {
      value: apiKeysSecret.secretArn,
      description: "Secrets Manager ARN for API keys",
    });
  }
}
