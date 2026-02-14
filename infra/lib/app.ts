#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { OmakaseStack } from "./omakase-stack";

const app = new cdk.App();

new OmakaseStack(app, "OmakaseStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: "Omakase ECS infrastructure - orchestrator and agent services",
});
