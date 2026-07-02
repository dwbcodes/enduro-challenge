import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';
import { Construct } from 'constructs';
import { SSM_PREFIX } from '../config';

interface ApiStackProps extends cdk.StackProps {
  table: dynamodb.Table;
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { table } = props;

    // --- SSM Parameters (created manually or via CI under SSM_PREFIX) ---
    const stravaClientId = ssm.StringParameter.valueForStringParameter(this, `${SSM_PREFIX}/strava/client-id`);
    const stravaClientSecret = ssm.StringParameter.valueForStringParameter(this, `${SSM_PREFIX}/strava/client-secret`);
    const stravaWebhookVerifyToken = ssm.StringParameter.valueForStringParameter(this, `${SSM_PREFIX}/strava/webhook-verify-token`);
    const jwtSecret = ssm.StringParameter.valueForStringParameter(this, `${SSM_PREFIX}/jwt-secret`);
    const frontendUrl = ssm.StringParameter.valueForStringParameter(this, `${SSM_PREFIX}/frontend-url`);
    const adminAthleteIds = ssm.StringParameter.valueForStringParameter(this, `${SSM_PREFIX}/admin-athlete-ids`);

    // --- SQS: Activity processing queue ---
    const activityDlq = new sqs.Queue(this, 'ActivityDLQ', {
      queueName: 'enduro-activity-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    const activityQueue = new sqs.Queue(this, 'ActivityQueue', {
      queueName: 'enduro-activity-queue',
      visibilityTimeout: cdk.Duration.seconds(300),
      deadLetterQueue: { queue: activityDlq, maxReceiveCount: 3 },
    });

    // --- Shared Lambda environment ---
    const commonEnv: Record<string, string> = {
      TABLE_NAME: table.tableName,
      STRAVA_CLIENT_ID: stravaClientId,
      STRAVA_CLIENT_SECRET: stravaClientSecret,
      JWT_SECRET: jwtSecret,
      FRONTEND_URL: frontendUrl,
      ADMIN_ATHLETE_IDS: adminAthleteIds,
      NODE_OPTIONS: '--enable-source-maps',
    };

    const functionDefaults: Partial<lambdaNodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
        forceDockerBundling: false,
      },
    };

    const functionsRoot = path.join(__dirname, '../../../packages/functions/src');

    // --- Lambda: Strava Webhook ---
    const webhookFn = new lambdaNodejs.NodejsFunction(this, 'StravaWebhookFn', {
      ...functionDefaults,
      entry: path.join(functionsRoot, 'strava-webhook/handler.ts'),
      environment: {
        ...commonEnv,
        ACTIVITY_QUEUE_URL: activityQueue.queueUrl,
        STRAVA_WEBHOOK_VERIFY_TOKEN: stravaWebhookVerifyToken,
      },
    });
    table.grantReadWriteData(webhookFn);
    activityQueue.grantSendMessages(webhookFn);

    // --- Lambda: Strava OAuth Callback ---
    const oauthFn = new lambdaNodejs.NodejsFunction(this, 'StravaOAuthFn', {
      ...functionDefaults,
      entry: path.join(functionsRoot, 'strava-oauth-callback/handler.ts'),
      environment: commonEnv,
    });
    table.grantReadWriteData(oauthFn);

    // --- Lambda: Process Activity (SQS triggered) ---
    const processActivityFn = new lambdaNodejs.NodejsFunction(this, 'ProcessActivityFn', {
      ...functionDefaults,
      timeout: cdk.Duration.seconds(300),
      entry: path.join(functionsRoot, 'process-activity/handler.ts'),
      environment: commonEnv,
    });
    table.grantReadWriteData(processActivityFn);
    processActivityFn.addEventSource(
      new lambdaEventSources.SqsEventSource(activityQueue, { batchSize: 5 }),
    );

    // --- Lambda: Get Leaderboard ---
    const leaderboardFn = new lambdaNodejs.NodejsFunction(this, 'GetLeaderboardFn', {
      ...functionDefaults,
      entry: path.join(functionsRoot, 'get-leaderboard/handler.ts'),
      environment: commonEnv,
    });
    table.grantReadData(leaderboardFn);

    // --- Lambda: Get Segments (public) ---
    const segmentsFn = new lambdaNodejs.NodejsFunction(this, 'GetSegmentsFn', {
      ...functionDefaults,
      entry: path.join(functionsRoot, 'get-segments/handler.ts'),
      environment: commonEnv,
    });
    table.grantReadData(segmentsFn);

    // --- Lambda: Admin ---
    const adminFn = new lambdaNodejs.NodejsFunction(this, 'AdminFn', {
      ...functionDefaults,
      entry: path.join(functionsRoot, 'admin/handler.ts'),
      environment: commonEnv,
    });
    table.grantReadWriteData(adminFn);

    // --- HTTP API Gateway ---
    const api = new apigatewayv2.HttpApi(this, 'EnduroChallengeApi', {
      apiName: 'enduro-challenge-api',
      corsPreflight: {
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ['*'],
      },
    });

    const webhookIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('WebhookIntegration', webhookFn);
    const oauthIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('OAuthIntegration', oauthFn);
    const leaderboardIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('LeaderboardIntegration', leaderboardFn);
    const segmentsIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('SegmentsIntegration', segmentsFn);
    const adminIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('AdminIntegration', adminFn);

    api.addRoutes({ path: '/webhook', methods: [apigatewayv2.HttpMethod.GET, apigatewayv2.HttpMethod.POST], integration: webhookIntegration });
    api.addRoutes({ path: '/auth/callback', methods: [apigatewayv2.HttpMethod.GET], integration: oauthIntegration });
    api.addRoutes({ path: '/leaderboard/{segmentId}', methods: [apigatewayv2.HttpMethod.GET], integration: leaderboardIntegration });
    api.addRoutes({ path: '/segments', methods: [apigatewayv2.HttpMethod.GET], integration: segmentsIntegration });
    api.addRoutes({ path: '/admin/{proxy+}', methods: [apigatewayv2.HttpMethod.ANY], integration: adminIntegration });

    this.apiUrl = api.apiEndpoint;

    // Write API URL to SSM so the frontend build can read it
    new ssm.StringParameter(this, 'ApiUrlParam', {
      parameterName: `${SSM_PREFIX}/api-url`,
      stringValue: api.apiEndpoint,
      description: 'Enduro Challenge API Gateway URL',
    });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
    new cdk.CfnOutput(this, 'ActivityQueueUrl', { value: activityQueue.queueUrl });
  }
}
