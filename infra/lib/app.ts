#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AutoforgeStack } from "./autoforge-stack";

const app = new cdk.App();

new AutoforgeStack(app, "AutoforgeStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: "AutoForge ECS infrastructure - orchestrator and agent services",
});
