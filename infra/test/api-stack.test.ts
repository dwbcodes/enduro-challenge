import { App, Stack } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { describe, it, expect, beforeAll } from 'vitest';
import { ApiStack } from '../lib/stacks/api-stack';

describe('ApiStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new App();
    const env = { account: '123456789012', region: 'us-west-2' };

    // Create a stub table in a separate stack
    const dbStack = new Stack(app, 'TestDb', { env });
    const table = new dynamodb.Table(dbStack, 'Table', {
      tableName: 'enduro-challenge',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
    });

    const apiStack = new ApiStack(app, 'TestApi', { env, table });
    template = Template.fromStack(apiStack);
  });

  it('creates an HTTP API Gateway', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      Name: 'enduro-challenge-api',
      ProtocolType: 'HTTP',
    });
  });

  it('creates the activity queue with a DLQ', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'enduro-activity-queue',
    });
    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'enduro-activity-dlq',
    });
  });

  it('creates 8 Lambda functions', () => {
    // 6 business lambdas + 1 SsmJsonWriter handler + 1 CDK Provider framework
    template.resourceCountIs('AWS::Lambda::Function', 8);
  });

  it('passes STRAVA_CONFIG and AWS_CONFIG env vars to Lambdas', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          STRAVA_CONFIG: Match.anyValue(),
          AWS_CONFIG: Match.anyValue(),
        }),
      },
    });
  });

  it('creates API routes for all endpoints', () => {
    const routes = template.findResources('AWS::ApiGatewayV2::Route');
    const routeKeys = Object.values(routes).map(
      (r: any) => r.Properties.RouteKey,
    );

    expect(routeKeys).toEqual(
      expect.arrayContaining([
        'GET /webhook',
        'POST /webhook',
        'GET /auth/callback',
        'GET /leaderboard/{segmentId}',
        'GET /segments',
        'ANY /admin/{proxy+}',
      ]),
    );
  });

  it('creates the SsmJsonWriter custom resource', () => {
    template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
      ParameterName: '/enduro-challenge/aws',
      Keys: 'apiUrl',
    });
  });

  it('grants the SsmJsonWriter Lambda SSM permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: ['ssm:GetParameter', 'ssm:PutParameter'],
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });
});
