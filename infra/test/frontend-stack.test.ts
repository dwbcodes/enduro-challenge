import { App } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { describe, it, beforeAll } from 'vitest';
import { FrontendStack } from '../lib/stacks/frontend-stack';

describe('FrontendStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new App();
    const stack = new FrontendStack(app, 'TestFrontend', {
      env: { account: '123456789012', region: 'us-west-2' },
      apiUrl: 'https://api.example.com',
    });
    template = Template.fromStack(stack);
  });

  it('creates an S3 bucket with public access blocked', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it('retains the S3 bucket on delete', () => {
    template.hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Retain',
    });
  });

  it('creates a CloudFront distribution with HTTPS redirect', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultRootObject: 'index.html',
        PriceClass: 'PriceClass_100',
      }),
    });
  });

  it('caches public API read paths and keeps protected API paths uncached', () => {
    template.hasResourceProperties('AWS::CloudFront::CachePolicy', {
      CachePolicyConfig: Match.objectLike({
        DefaultTTL: 30,
        MaxTTL: 300,
        ParametersInCacheKeyAndForwardedToOrigin: Match.objectLike({
          QueryStringsConfig: { QueryStringBehavior: 'all' },
        }),
      }),
    });

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        CacheBehaviors: Match.arrayWith([
          Match.objectLike({ PathPattern: 'api/segments*' }),
          Match.objectLike({ PathPattern: 'api/leaderboard/*' }),
          Match.objectLike({ PathPattern: 'api/racers*' }),
          Match.objectLike({ PathPattern: 'api/admin/*' }),
          Match.objectLike({ PathPattern: 'api/auth/*' }),
          Match.objectLike({ PathPattern: 'api/webhook' }),
        ]),
      }),
    });
  });

  it('configures SPA error responses for 403 and 404', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        CustomErrorResponses: Match.arrayWith([
          Match.objectLike({ ErrorCode: 403, ResponseCode: 200, ResponsePagePath: '/index.html' }),
          Match.objectLike({ ErrorCode: 404, ResponseCode: 200, ResponsePagePath: '/index.html' }),
        ]),
      }),
    });
  });

  it('creates the SsmJsonWriter custom resource for /aws param', () => {
    template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
      ParameterName: '/enduro-challenge/aws',
      Keys: 'frontendUrl,siteBucketName,distributionId',
    });
  });
});
