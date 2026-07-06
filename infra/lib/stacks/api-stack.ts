import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';
import { Construct } from 'constructs';
import { SSM_PREFIX, PROJECT_ROOT } from '../config';
import { SsmJsonWriter } from '../constructs/secret-writer';

interface ApiStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  usersTable: dynamodb.Table;
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { table, usersTable } = props;

    // --- SSM JSON parameters ---
    const stravaConfig = ssm.StringParameter.valueForStringParameter(this, `${SSM_PREFIX}/strava`);
    const awsConfig = ssm.StringParameter.valueForStringParameter(this, `${SSM_PREFIX}/aws`);
    const awsConfigLookup = ssm.StringParameter.valueFromLookup(this, `${SSM_PREFIX}/aws`);
    const frontendUrl = readFrontendUrl(awsConfigLookup);

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
    // Lambdas parse the JSON env vars at runtime
    const commonEnv: Record<string, string> = {
      TABLE_NAME: table.tableName,
      USERS_TABLE_NAME: usersTable.tableName,
      STRAVA_CONFIG: stravaConfig,
      AWS_CONFIG: awsConfig,
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

    const functionsRoot = path.join(PROJECT_ROOT, 'packages/functions/src');

    // --- Lambda: Strava Webhook ---
    const webhookFn = new lambdaNodejs.NodejsFunction(this, 'StravaWebhookFn', {
      ...functionDefaults,
      entry: path.join(functionsRoot, 'strava-webhook/handler.ts'),
      environment: {
        ...commonEnv,
        ACTIVITY_QUEUE_URL: activityQueue.queueUrl,
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
    usersTable.grantReadWriteData(oauthFn);

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

    // --- Lambda: Get Racers (public) ---
    const racersFn = new lambdaNodejs.NodejsFunction(this, 'GetRacersFn', {
      ...functionDefaults,
      entry: path.join(functionsRoot, 'get-racers/handler.ts'),
      environment: commonEnv,
    });
    table.grantReadData(racersFn);
    usersTable.grantReadData(racersFn);

    // --- Lambda: Get Challenges (public) ---
    const challengesFn = new lambdaNodejs.NodejsFunction(this, 'GetChallengesFn', {
      ...functionDefaults,
      entry: path.join(functionsRoot, 'get-challenges/handler.ts'),
      environment: commonEnv,
    });
    table.grantReadData(challengesFn);

    // --- Lambda: Get Creator Profile (public) ---
    const creatorProfileFn = new lambdaNodejs.NodejsFunction(this, 'GetCreatorProfileFn', {
      ...functionDefaults,
      entry: path.join(functionsRoot, 'get-creator-profile/handler.ts'),
      environment: commonEnv,
    });
    table.grantReadData(creatorProfileFn);

    // --- Lambda: Admin ---
    const adminFn = new lambdaNodejs.NodejsFunction(this, 'AdminFn', {
      ...functionDefaults,
      entry: path.join(functionsRoot, 'admin/handler.ts'),
      environment: commonEnv,
    });
    table.grantReadWriteData(adminFn);

    // --- Lambda: Cleanup Strava Connections (DynamoDB stream) ---
    const cleanupStravaConnectionsFn = new lambdaNodejs.NodejsFunction(this, 'CleanupStravaConnectionsFn', {
      ...functionDefaults,
      entry: path.join(functionsRoot, 'cleanup-strava-connections/handler.ts'),
      environment: commonEnv,
    });
    table.grantReadWriteData(cleanupStravaConnectionsFn);
    cleanupStravaConnectionsFn.addEventSource(
      new lambdaEventSources.DynamoEventSource(table, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 10,
        retryAttempts: 2,
      }),
    );

    // --- Lambda: Poll Segments (EventBridge hourly) ---
    const pollSegmentsFn = new lambdaNodejs.NodejsFunction(this, 'PollSegmentsFn', {
      ...functionDefaults,
      timeout: cdk.Duration.minutes(5),
      entry: path.join(functionsRoot, 'poll-segments/handler.ts'),
      environment: commonEnv,
    });
    table.grantReadWriteData(pollSegmentsFn);
    usersTable.grantReadData(pollSegmentsFn);

    new events.Rule(this, 'PollSegmentsSchedule', {
      schedule: events.Schedule.rate(cdk.Duration.hours(1)),
      targets: [new targets.LambdaFunction(pollSegmentsFn)],
    });

    // --- HTTP API Gateway ---
    const api = new apigatewayv2.HttpApi(this, 'EnduroChallengeApi', {
      apiName: 'enduro-challenge-api',
      corsPreflight: {
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.PATCH,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: [frontendUrl],
      },
    });

    const webhookIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('WebhookIntegration', webhookFn);
    const oauthIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('OAuthIntegration', oauthFn);
    const leaderboardIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('LeaderboardIntegration', leaderboardFn);
    const segmentsIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('SegmentsIntegration', segmentsFn);
    const racersIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('RacersIntegration', racersFn);
    const challengesIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('ChallengesIntegration', challengesFn);
    const creatorProfileIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('CreatorProfileIntegration', creatorProfileFn);
    const adminIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('AdminIntegration', adminFn);

    api.addRoutes({ path: '/webhook', methods: [apigatewayv2.HttpMethod.GET, apigatewayv2.HttpMethod.POST], integration: webhookIntegration });
    api.addRoutes({ path: '/auth/callback', methods: [apigatewayv2.HttpMethod.GET], integration: oauthIntegration });
    api.addRoutes({ path: '/leaderboard/{segmentId}', methods: [apigatewayv2.HttpMethod.GET], integration: leaderboardIntegration });
    api.addRoutes({ path: '/segments', methods: [apigatewayv2.HttpMethod.GET], integration: segmentsIntegration });
    api.addRoutes({ path: '/racers', methods: [apigatewayv2.HttpMethod.GET], integration: racersIntegration });
    api.addRoutes({ path: '/challenges', methods: [apigatewayv2.HttpMethod.GET], integration: challengesIntegration });
    api.addRoutes({ path: '/creators/{slug}', methods: [apigatewayv2.HttpMethod.GET], integration: creatorProfileIntegration });
    api.addRoutes({ path: '/admin/{proxy+}', methods: [apigatewayv2.HttpMethod.ANY], integration: adminIntegration });

    this.apiUrl = api.apiEndpoint;

    // Write API URL to the /aws SSM JSON param
    new SsmJsonWriter(this, 'WriteAwsOutputs', {
      parameterName: `${SSM_PREFIX}/aws`,
      values: { apiUrl: api.apiEndpoint },
    });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
    new cdk.CfnOutput(this, 'ActivityQueueUrl', { value: activityQueue.queueUrl });
  }
}

function readFrontendUrl(awsConfig: string): string {
  try {
    const parsed = JSON.parse(awsConfig) as { frontendUrl?: string };
    return parsed.frontendUrl ?? 'https://d152gxg9dh92dl.cloudfront.net';
  } catch {
    return 'https://d152gxg9dh92dl.cloudfront.net';
  }
}
