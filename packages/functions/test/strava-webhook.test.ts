import { describe, it, expect, vi, beforeAll } from 'vitest';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

// Set env vars before any imports
beforeAll(() => {
  process.env.STRAVA_CONFIG = JSON.stringify({
    clientId: 'id',
    clientSecret: 'secret',
    jwtSecret: 'jwt',
    webhookVerifyToken: 'my-verify-token',
    adminAthleteIds: '1',
  });
  process.env.AWS_CONFIG = JSON.stringify({
    frontendUrl: 'https://example.com',
    apiUrl: 'https://api.example.com',
  });
  process.env.ACTIVITY_QUEUE_URL = 'https://sqs.example.com/queue';
});

const mockSend = vi.fn().mockResolvedValue({});

// Mock SQS client as a class
vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: class {
    send = mockSend;
  },
  SendMessageCommand: class {
    constructor(public input: unknown) {}
  },
}));

// Mock container (prevents real DynamoDB client init)
vi.mock('../src/shared/container', () => ({}));

describe('strava-webhook handler', () => {
  it('responds to Strava verification challenge', async () => {
    const { handler } = await import('../src/strava-webhook/handler');

    const event = {
      requestContext: { http: { method: 'GET' } },
      queryStringParameters: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'my-verify-token',
        'hub.challenge': 'challenge-123',
      },
    } as unknown as APIGatewayProxyEventV2;

    const result = await handler(event);
    expect(result).toMatchObject({
      statusCode: 200,
      body: JSON.stringify({ 'hub.challenge': 'challenge-123' }),
    });
  });

  it('rejects invalid verification token', async () => {
    const { handler } = await import('../src/strava-webhook/handler');

    const event = {
      requestContext: { http: { method: 'GET' } },
      queryStringParameters: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
      },
    } as unknown as APIGatewayProxyEventV2;

    const result = await handler(event);
    expect(result).toMatchObject({ statusCode: 400 });
  });

  it('enqueues activity create events to SQS', async () => {
    const { handler } = await import('../src/strava-webhook/handler');
    mockSend.mockClear();

    const event = {
      requestContext: { http: { method: 'POST' } },
      body: JSON.stringify({
        object_type: 'activity',
        aspect_type: 'create',
        object_id: 12345,
        owner_id: 67890,
      }),
    } as unknown as APIGatewayProxyEventV2;

    const result = await handler(event);
    expect(result).toMatchObject({ statusCode: 200 });
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('ignores non-activity events', async () => {
    const { handler } = await import('../src/strava-webhook/handler');
    mockSend.mockClear();

    const event = {
      requestContext: { http: { method: 'POST' } },
      body: JSON.stringify({
        object_type: 'athlete',
        aspect_type: 'update',
        object_id: 1,
        owner_id: 1,
      }),
    } as unknown as APIGatewayProxyEventV2;

    const result = await handler(event);
    expect(result).toMatchObject({ statusCode: 200 });
    expect(mockSend).not.toHaveBeenCalled();
  });
});
