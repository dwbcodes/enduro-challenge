import { APIGatewayProxyResultV2 } from 'aws-lambda';

const allowedOrigin = (() => {
  try {
    const awsConfig = JSON.parse(process.env.AWS_CONFIG ?? '{}') as { frontendUrl?: string };
    return awsConfig.frontendUrl ?? '*';
  } catch {
    return '*';
  }
})();

export function ok(body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
    body: JSON.stringify(body),
  };
}

export function created(body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
    body: JSON.stringify(body),
  };
}

export function badRequest(message: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 400,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
    body: JSON.stringify({ error: message }),
  };
}

export function unauthorized(): APIGatewayProxyResultV2 {
  return {
    statusCode: 401,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
    body: JSON.stringify({ error: 'Unauthorized' }),
  };
}

export function notFound(message = 'Not found'): APIGatewayProxyResultV2 {
  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
    body: JSON.stringify({ error: message }),
  };
}

export function redirect(location: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 302,
    headers: { Location: location },
    body: '',
  };
}

export function serverError(err: unknown): APIGatewayProxyResultV2 {
  console.error(err);
  return {
    statusCode: 500,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
    body: JSON.stringify({ error: 'Internal server error' }),
  };
}
