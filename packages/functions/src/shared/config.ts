// Parsed once per cold start from SSM JSON parameters passed as env vars

const strava = JSON.parse(process.env.STRAVA_CONFIG ?? '{}') as {
  clientId: string;
  clientSecret: string;
  jwtSecret: string;
  webhookVerifyToken: string;
  adminAthleteIds: string;
};

const aws = JSON.parse(process.env.AWS_CONFIG ?? '{}') as {
  frontendUrl: string;
  apiUrl: string;
  siteBucketName?: string;
  distributionId?: string;
};

export const config = {
  strava: {
    clientId: strava.clientId,
    clientSecret: strava.clientSecret,
    webhookVerifyToken: strava.webhookVerifyToken,
  },
  jwtSecret: strava.jwtSecret,
  adminAthleteIds: (strava.adminAthleteIds ?? '').split(',').map(Number),
  frontendUrl: aws.frontendUrl,
} as const;
