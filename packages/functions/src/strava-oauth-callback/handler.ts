/**
 * Strava OAuth Callback Lambda
 *
 * Strava redirects here after the racer authorises the app.
 * Exchanges the code for tokens, creates/updates the racer, and redirects
 * to the frontend with a signed JWT.
 *
 * The `state` param is base64-encoded JSON: { category, sexCategory, challengeId }
 */
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { AgeGroup, RacerCategory, SexCategory, StravaActivityType } from '@enduro/domain';
import { StravaTokenResponse } from '@enduro/infrastructure';
import { randomUUID } from 'crypto';
import { Creator } from '@enduro/domain';
import { stravaClient, registerRacerHandler, racerRepository, adminRepository, creatorRepository } from '../shared/container';
import { badRequest, redirect, serverError } from '../shared/response';
import { config } from '../shared/config';

const FRONTEND_URL = config.frontendUrl;
const JWT_SECRET = config.jwtSecret;
const ADMIN_ATHLETE_IDS = config.adminAthleteIds;

const VALID_ACTIVITY_TYPES = new Set(Object.values(StravaActivityType) as string[]);

interface OAuthState {
  intent?: 'admin_login' | 'creator_login';
  category?: string; // StravaActivityType value or legacy RacerCategory
  challengeId?: string;
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

    // --- Admin login flow ---
    if (state.intent === 'admin_login') {
      return handleAdminLogin(tokenResponse);
    }

    // --- Creator login flow ---
    if (state.intent === 'creator_login') {
      return handleCreatorLogin(tokenResponse);
    }

    // --- Registration flow ---
    const category = state.category || 'ALL';
    const isValidCategory = category === 'ALL'
      || Object.values(RacerCategory).includes(category as RacerCategory)
      || VALID_ACTIVITY_TYPES.has(category);
    if (!isValidCategory) return badRequest('Invalid category');
    if (!state.challengeId) return badRequest('Missing challenge ID');
    const athlete = await stravaClient.getAuthenticatedAthlete(tokenResponse.access_token);
    const isAdmin = ADMIN_ATHLETE_IDS.includes(athlete.id) || await adminRepository.isAdmin(athlete.id);
    const sexCategory = resolveSexCategory(athlete.sex);

    const registerCommand = {
      stravaAthleteId: athlete.id,
      firstName: athlete.firstname,
      lastName: athlete.lastname,
      profileImageUrl: athlete.profile,
      profileMediumImageUrl: athlete.profile_medium,
      username: athlete.username,
      city: athlete.city,
      state: athlete.state,
      country: athlete.country,
      sex: athlete.sex,
      birthday: athlete.birthday,
      weight: athlete.weight,
      ftp: athlete.ftp,
      measurementPreference: athlete.measurement_preference,
      datePreference: athlete.date_preference,
      premium: athlete.premium,
      summit: athlete.summit,
      followerCount: athlete.follower_count,
      friendCount: athlete.friend_count,
      mutualFriendCount: athlete.mutual_friend_count,
      athleteType: athlete.athlete_type,
      badgeTypeId: athlete.badge_type_id,
      stravaCreatedAt: athlete.created_at ? new Date(athlete.created_at) : undefined,
      stravaUpdatedAt: athlete.updated_at ? new Date(athlete.updated_at) : undefined,
      bikes: athlete.bikes,
      shoes: athlete.shoes,
      rawStravaProfile: athlete as unknown as Record<string, unknown>,
      category,
      ageGroup: resolveAgeGroup(athlete.birthday),
      sexCategory,
      challengeId: state.challengeId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenExpiresAt: tokenResponse.expires_at,
      tokenScope: tokenResponse.scope ?? 'read,profile:read_all',
    };

    const racerId = await registerRacerHandler.execute(registerCommand);

    // The DynamoDB stream cleanup Lambda revokes and deletes stored Strava tokens.
    if (!isAdmin) {
      return redirect(`${FRONTEND_URL}/register/success?challengeId=${state.challengeId}&sex=${sexCategory}`);
    }

    const token = jwt.sign(
      {
        racerId,
        stravaAthleteId: athlete.id,
        name: `${athlete.firstname} ${athlete.lastname}`,
        isAdmin,
        isSuperAdmin: ADMIN_ATHLETE_IDS.includes(athlete.id),
      },
      JWT_SECRET,
      { expiresIn: '90d' },
    );

    return redirect(`${FRONTEND_URL}/register/success?token=${token}&challengeId=${state.challengeId}&sex=${sexCategory}`);
  } catch (err) {
    return serverError(err);
  }
}

async function handleAdminLogin(tokenResponse: StravaTokenResponse): Promise<APIGatewayProxyResultV2> {
  const athlete = tokenResponse.athlete;
  const isAdmin = ADMIN_ATHLETE_IDS.includes(athlete.id) || await adminRepository.isAdmin(athlete.id);

  if (!isAdmin) {
    // Not an admin — deauthorize and redirect with error
    await stravaClient.deauthorize(tokenResponse.access_token);
    return redirect(`${FRONTEND_URL}/admin?error=unauthorized`);
  }

  // Save/update admin's Strava token so server-side Strava API calls work
  const existingRacer = await racerRepository.findByStravaAthleteId(athlete.id);
  if (existingRacer) {
    await racerRepository.saveToken({
      racerId: existingRacer.id,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenResponse.expires_at,
      scope: tokenResponse.scope ?? 'read',
    });
  }

  const token = jwt.sign(
    {
      racerId: existingRacer?.id ?? '',
      stravaAthleteId: athlete.id,
      name: `${athlete.firstname} ${athlete.lastname}`,
      isAdmin: true,
      isSuperAdmin: ADMIN_ATHLETE_IDS.includes(athlete.id),
    },
    JWT_SECRET,
    { expiresIn: '90d' },
  );

  return redirect(`${FRONTEND_URL}/admin?token=${token}`);
}

async function handleCreatorLogin(tokenResponse: StravaTokenResponse): Promise<APIGatewayProxyResultV2> {
  const athlete = tokenResponse.athlete;

  // Find or create creator record
  let creator = await creatorRepository.findByStravaAthleteId(athlete.id);
  if (!creator) {
    const creatorId = randomUUID();
    const now = new Date();
    creator = Creator.create(creatorId, {
      stravaAthleteId: athlete.id,
      firstName: athlete.firstname,
      lastName: athlete.lastname,
      profileImageUrl: athlete.profile ?? '',
      username: athlete.username || undefined,
      createdAt: now,
      updatedAt: now,
    });
    await creatorRepository.save(creator);

    // Auto-add as admin so they can use admin routes for challenge management
    const isAlreadyAdmin = ADMIN_ATHLETE_IDS.includes(athlete.id) || await adminRepository.isAdmin(athlete.id);
    if (!isAlreadyAdmin) {
      await adminRepository.add({
        stravaAthleteId: athlete.id,
        name: `${athlete.firstname} ${athlete.lastname}`,
        addedAt: new Date().toISOString(),
        addedBy: 'creator_signup',
      });
    }
  }

  // Update username if it changed
  if (athlete.username && creator.username !== athlete.username) {
    creator = Creator.create(creator.id, {
      stravaAthleteId: creator.stravaAthleteId,
      firstName: creator.firstName,
      lastName: creator.lastName,
      profileImageUrl: creator.profileImageUrl,
      username: athlete.username,
      stravaApp: creator.stravaApp,
      createdAt: creator.createdAt,
      updatedAt: new Date(),
    });
    await creatorRepository.save(creator);
  }

  // Save/update Strava token so server-side Strava API calls work
  const existingRacer = await racerRepository.findByStravaAthleteId(athlete.id);
  if (existingRacer) {
    await racerRepository.saveToken({
      racerId: existingRacer.id,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenResponse.expires_at,
      scope: tokenResponse.scope ?? 'read',
    });
  }

  const creatorSlug = creator.slug;

  const token = jwt.sign(
    {
      racerId: existingRacer?.id ?? '',
      stravaAthleteId: athlete.id,
      name: `${athlete.firstname} ${athlete.lastname}`,
      isAdmin: true,
      isCreator: true,
      isSuperAdmin: ADMIN_ATHLETE_IDS.includes(athlete.id),
      creatorSlug,
    },
    JWT_SECRET,
    { expiresIn: '90d' },
  );

  return redirect(`${FRONTEND_URL}/c?slug=${encodeURIComponent(creatorSlug)}&token=${token}`);
}

function resolveSexCategory(sex?: string): SexCategory {
  if (sex === 'F') return SexCategory.FEMALE;
  return SexCategory.MALE;
}

function resolveAgeGroup(birthday?: string): AgeGroup {
  if (!birthday) return AgeGroup.AGE_30_39;

  const birthDate = new Date(birthday);
  if (Number.isNaN(birthDate.getTime())) return AgeGroup.AGE_30_39;

  const now = new Date();
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const hasHadBirthdayThisYear =
    now.getUTCMonth() > birthDate.getUTCMonth() ||
    (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() >= birthDate.getUTCDate());
  if (!hasHadBirthdayThisYear) age--;

  if (age < 18) return AgeGroup.UNDER_18;
  if (age < 30) return AgeGroup.UNDER_30;
  if (age < 40) return AgeGroup.AGE_30_39;
  if (age < 50) return AgeGroup.AGE_40_49;
  if (age < 60) return AgeGroup.AGE_50_59;
  return AgeGroup.AGE_60_PLUS;
}
