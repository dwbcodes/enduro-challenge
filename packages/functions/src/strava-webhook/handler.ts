/**
 * Strava Webhook Handler
 *
 * GET  /webhook  — Strava subscription verification challenge
 * POST /webhook  — Inbound activity events → SQS for async processing
 */
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { ok, badRequest, serverError } from '../shared/response';
import { config } from '../shared/config';

const sqs = new SQSClient({ region: process.env.AWS_REGION });
const QUEUE_URL = process.env.ACTIVITY_QUEUE_URL!;
const VERIFY_TOKEN = config.strava.webhookVerifyToken;

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    if (event.requestContext.http.method === 'GET') {
      return handleVerification(event);
    }
    return handleEvent(event);
  } catch (err) {
    return serverError(err);
  }
}

function handleVerification(event: APIGatewayProxyEventV2): APIGatewayProxyResultV2 {
  const params = event.queryStringParameters ?? {};
  if (
    params['hub.mode'] === 'subscribe' &&
    params['hub.verify_token'] === VERIFY_TOKEN
  ) {
    return ok({ 'hub.challenge': params['hub.challenge'] });
  }
  return badRequest('Invalid verification token');
}

async function handleEvent(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const body = JSON.parse(event.body ?? '{}') as {
    object_type: string;
    aspect_type: string;
    object_id: number;
    owner_id: number;
  };

  // Only process newly created activities
  if (body.object_type !== 'activity' || body.aspect_type !== 'create') {
    return ok({ received: true });
  }

  await sqs.send(new SendMessageCommand({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify({
      activityId: body.object_id,
      stravaAthleteId: body.owner_id,
    }),
  }));

  return ok({ received: true });
}
