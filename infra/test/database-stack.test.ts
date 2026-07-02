import { App } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { describe, it } from 'vitest';
import { DatabaseStack } from '../lib/stacks/database-stack';

describe('DatabaseStack', () => {
  const app = new App();
  const stack = new DatabaseStack(app, 'TestDatabase', {
    env: { account: '123456789012', region: 'us-west-2' },
  });
  const template = Template.fromStack(stack);

  it('creates a DynamoDB table with correct key schema', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'enduro-challenge',
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    });
  });

  it('creates GSI1 with string sort key', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: 'GSI1',
          KeySchema: [
            { AttributeName: 'GSI1PK', KeyType: 'HASH' },
            { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
          ],
        }),
      ]),
    });
  });

  it('creates GSI2 with numeric sort key', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      AttributeDefinitions: Match.arrayWith([
        { AttributeName: 'GSI2SK', AttributeType: 'N' },
      ]),
    });
  });

  it('enables point-in-time recovery', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
    });
  });

  it('retains table on delete', () => {
    template.hasResource('AWS::DynamoDB::Table', {
      DeletionPolicy: 'Retain',
    });
  });
});
