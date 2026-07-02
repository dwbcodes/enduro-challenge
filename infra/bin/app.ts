#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';

const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'us-west-2',
};

const dbStack = new DatabaseStack(app, 'EnduroDatabase', { env });

const apiStack = new ApiStack(app, 'EnduroApi', {
  env,
  table: dbStack.table,
  usersTable: dbStack.usersTable,
});
apiStack.addDependency(dbStack);

const frontendStack = new FrontendStack(app, 'EnduroFrontend', {
  env,
  apiUrl: apiStack.apiUrl,
});
frontendStack.addDependency(apiStack);

app.synth();
