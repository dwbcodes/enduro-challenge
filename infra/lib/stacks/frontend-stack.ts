import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import { Construct } from 'constructs';
import { PROJECT_ROOT, SSM_PREFIX } from '../config';
import { SsmJsonWriter } from '../constructs/secret-writer';

interface FrontendStackProps extends cdk.StackProps {
  apiUrl: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const apiDomainName = cdk.Fn.select(2, cdk.Fn.split('/', props.apiUrl));

    // S3 bucket — private, accessed only via CloudFront OAC
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `enduro-challenge-site-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Rewrite directory-style URIs to index.html for Next.js static export
    // S3 with OAC doesn't resolve /admin/ → admin/index.html like website hosting does
    const staticSiteRewriteFunction = new cloudfront.Function(this, 'StaticSiteRewriteFunction', {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.indexOf('.') === -1) {
    if (uri.charAt(uri.length - 1) !== '/') uri += '/';
    request.uri = uri + 'index.html';
  }
  return request;
}
`),
    });

    const apiPathRewriteFunction = new cloudfront.Function(this, 'ApiPathRewriteFunction', {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  if (request.uri === '/api') {
    request.uri = '/';
  } else if (request.uri.indexOf('/api/') === 0) {
    request.uri = request.uri.substring(4);
  }
  return request;
}
`),
    });

    const apiOrigin = new cloudfrontOrigins.HttpOrigin(apiDomainName, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    });
    const apiFunctionAssociations = [{
      eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
      function: apiPathRewriteFunction,
    }];
    const uncachedApiBehavior: cloudfront.BehaviorOptions = {
      origin: apiOrigin,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      functionAssociations: apiFunctionAssociations,
    };
    const publicApiCachePolicy = new cloudfront.CachePolicy(this, 'PublicApiCachePolicy', {
      comment: 'Short-lived cache for public Enduro API read endpoints',
      defaultTtl: cdk.Duration.seconds(30),
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.minutes(5),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });
    const cachedPublicApiBehavior: cloudfront.BehaviorOptions = {
      origin: apiOrigin,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      cachePolicy: publicApiCachePolicy,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      functionAssociations: apiFunctionAssociations,
    };

    // CloudFront distribution (OAC is created automatically by S3BucketOrigin.withOriginAccessControl)
    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      defaultBehavior: {
        origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        functionAssociations: [{
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          function: staticSiteRewriteFunction,
        }],
      },
      additionalBehaviors: {
        'api/challenges*': cachedPublicApiBehavior,
        'api/segments*': cachedPublicApiBehavior,
        'api/leaderboard/*': cachedPublicApiBehavior,
        'api/racers*': cachedPublicApiBehavior,
        'api/admin/*': uncachedApiBehavior,
        'api/auth/*': uncachedApiBehavior,
        'api/webhook': uncachedApiBehavior,
        'api/*': uncachedApiBehavior,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        // Fallback: S3 OAC returns 403 for missing objects, serve 404 page
        { httpStatus: 403, responseHttpStatus: 404, responsePagePath: '/404.html' },
        { httpStatus: 404, responseHttpStatus: 404, responsePagePath: '/404.html' },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // Deploy static build — run `pnpm dev build` in apps/web first
    new s3deploy.BucketDeployment(this, 'SiteDeploy', {
      sources: [s3deploy.Source.asset(path.join(PROJECT_ROOT, 'apps/web/out'))],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Write infrastructure outputs to /aws SSM JSON param
    new SsmJsonWriter(this, 'WriteAwsOutputs', {
      parameterName: `${SSM_PREFIX}/aws`,
      values: {
        frontendUrl: `https://${distribution.distributionDomainName}`,
        siteBucketName: siteBucket.bucketName,
        distributionId: distribution.distributionId,
      },
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', { value: `https://${distribution.distributionDomainName}` });
    new cdk.CfnOutput(this, 'SiteBucketName', { value: siteBucket.bucketName });
  }
}
