#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';

const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
};

const dbStack = new DatabaseStack(app, 'EnduroDatabase', { env });

const apiStack = new ApiStack(app, 'EnduroApi', {
  env,
  table: dbStack.table,
});
apiStack.addDependency(dbStack);

const frontendStack = new FrontendStack(app, 'EnduroFrontend', { env });

app.synth();
