import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('config', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.STRAVA_CONFIG = JSON.stringify({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      jwtSecret: 'test-jwt-secret',
      webhookVerifyToken: 'test-webhook-token',
      adminAthleteIds: '111,222',
    });
    process.env.AWS_CONFIG = JSON.stringify({
      frontendUrl: 'https://example.cloudfront.net',
      apiUrl: 'https://api.example.com',
    });
  });

  it('parses strava credentials', async () => {
    const { config } = await import('../src/shared/config');
    expect(config.strava.clientId).toBe('test-client-id');
    expect(config.strava.clientSecret).toBe('test-client-secret');
    expect(config.strava.webhookVerifyToken).toBe('test-webhook-token');
  });

  it('parses jwt secret', async () => {
    const { config } = await import('../src/shared/config');
    expect(config.jwtSecret).toBe('test-jwt-secret');
  });

  it('parses admin athlete IDs as numbers', async () => {
    const { config } = await import('../src/shared/config');
    expect(config.adminAthleteIds).toEqual([111, 222]);
  });

  it('parses frontend URL from aws config', async () => {
    const { config } = await import('../src/shared/config');
    expect(config.frontendUrl).toBe('https://example.cloudfront.net');
  });
});
