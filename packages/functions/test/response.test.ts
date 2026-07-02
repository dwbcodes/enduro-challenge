import { describe, it, expect } from 'vitest';
import { ok, created, badRequest, unauthorized, notFound, redirect, serverError } from '../src/shared/response';

describe('response helpers', () => {
  it('ok returns 200 with JSON body', () => {
    const result = ok({ hello: 'world' });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toEqual({ hello: 'world' });
    expect(result.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('created returns 201', () => {
    expect(created({ id: '1' }).statusCode).toBe(201);
  });

  it('badRequest returns 400 with error message', () => {
    const result = badRequest('oops');
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string)).toEqual({ error: 'oops' });
  });

  it('unauthorized returns 401', () => {
    expect(unauthorized().statusCode).toBe(401);
  });

  it('notFound returns 404', () => {
    expect(notFound().statusCode).toBe(404);
    expect(notFound('gone').statusCode).toBe(404);
  });

  it('redirect returns 302 with Location header', () => {
    const result = redirect('https://example.com');
    expect(result.statusCode).toBe(302);
    expect(result.headers).toMatchObject({ Location: 'https://example.com' });
  });

  it('serverError returns 500', () => {
    const result = serverError(new Error('boom'));
    expect(result.statusCode).toBe(500);
  });
});
