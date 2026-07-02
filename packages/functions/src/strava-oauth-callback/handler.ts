/**
 * Strava OAuth Callback Lambda
 *
 * Strava redirects here after the racer authorises the app.
 * Exchanges the code for tokens, creates/updates the racer, and redirects
 * to the frontend with a signed JWT.
 *
 * The `state` param is base64-encoded JSON: { category, ageGroup, challengeId }
 */
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { AgeGroup, RacerCategory } from '@enduro/domain';
import { stravaClient, registerRacerHandler } from '../shared/container';
import { badRequest, redirect, serverError } from '../shared/response';

const FRONTEND_URL = process.env.FRONTEND_URL!;
const JWT_SECRET = process.env.JWT_SECRET!;
const ADMIN_ATHLETE_IDS = (process.env.ADMIN_ATHLETE_IDS ?? '').split(',').map(Number);

interface OAuthState {
  category: RacerCategory;
  ageGroup: AgeGroup;
  challengeId: string;
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const params = event.queryStringParameters ?? {};
    const code = params['code'];
    const stateParam = params['state'];

    if (!code || !stateParam) return badRequest('Missing code or state');

    let state: OAuthState;
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64').toString('utf-8')) as OAuthState;
    } catch {
      return badRequest('Invalid state parameter');
    }

    const tokenResponse = await stravaClient.exchangeCode(code);
    const { athlete } = tokenResponse;

    const racerId = await registerRacerHandler.execute({
      stravaAthleteId: athlete.id,
      firstName: athlete.firstname,
      lastName: athlete.lastname,
      profileImageUrl: athlete.profile,
      category: state.category,
      ageGroup: state.ageGroup,
      challengeId: state.challengeId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenExpiresAt: tokenResponse.expires_at,
      tokenScope: 'activity:read_all',
    });

    const isAdmin = ADMIN_ATHLETE_IDS.includes(athlete.id);

    const token = jwt.sign(
      {
        racerId,
        stravaAthleteId: athlete.id,
        name: `${athlete.firstname} ${athlete.lastname}`,
        isAdmin,
      },
      JWT_SECRET,
      { expiresIn: '90d' },
    );

    return redirect(`${FRONTEND_URL}/register/success?token=${token}`);
  } catch (err) {
    return serverError(err);
  }
}
