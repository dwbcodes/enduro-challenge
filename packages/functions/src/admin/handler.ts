/**
 * Admin API Lambda
 *
 * Routes (all require admin JWT):
 *   GET    /admin/challenges          — list all challenges
 *   POST   /admin/challenges          — create challenge
 *   POST   /admin/challenges/:id/activate
 *   GET    /admin/segments            — list all segments for active challenge
 *   POST   /admin/segments            — add segment to challenge
 *   DELETE /admin/segments/:id        — remove segment
 *   GET    /admin/racers              — list all racers
 */
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { AgeGroup, Racer, RacerCategory, SexCategory } from '@enduro/domain';
import {
  challengeRepository,
  racerRepository,
  segmentRepository,
  resultRepository,
  leaderboardRepository,
  stravaClient,
  createChallengeHandler,
  addSegmentHandler,
} from '../shared/container';
import { ok, created, badRequest, unauthorized, notFound, serverError } from '../shared/response';
import { CreateChallengeCommand } from '@enduro/application';
import { config } from '../shared/config';

const JWT_SECRET = config.jwtSecret;

interface AdminToken {
  racerId: string;
  stravaAthleteId: number;
  isAdmin: boolean;
}

function verifyAdmin(event: APIGatewayProxyEventV2): AdminToken | null {
  const auth = event.headers['authorization'] ?? '';
  const token = auth.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AdminToken;
    return payload.isAdmin ? payload : null;
  } catch {
    return null;
  }
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;
  const requestId = event.requestContext.requestId;

  console.log(JSON.stringify({ event: 'admin_request', method, path, requestId }));

  try {
    if (method === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': config.frontendUrl,
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        body: '',
      };
    }

    const admin = verifyAdmin(event);
    if (!admin) {
      console.log(JSON.stringify({ event: 'admin_auth_failed', method, path, hasAuthHeader: !!event.headers['authorization'] }));
      return unauthorized();
    }

    console.log(JSON.stringify({ event: 'admin_auth_ok', racerId: admin.racerId, stravaAthleteId: admin.stravaAthleteId }));

    // POST /admin/challenges
    if (method === 'POST' && path === '/admin/challenges') {
      const body = JSON.parse(event.body ?? '{}') as CreateChallengeCommand;
      const id = await createChallengeHandler.execute(body);
      return created({ id });
    }

    // GET /admin/challenges
    if (method === 'GET' && path === '/admin/challenges') {
      const challenges = await challengeRepository.findAll();
      return ok({ challenges: challenges.map((c) => c.toJSON()) });
    }

    // POST /admin/challenges/:id/activate
    if (method === 'POST' && path.match(/^\/admin\/challenges\/[^/]+\/activate$/)) {
      const challengeId = path.match(/^\/admin\/challenges\/([^/]+)\/activate$/)?.[1] ?? '';
      const challenge = await challengeRepository.findById(challengeId);
      if (!challenge) return notFound('Challenge not found');
      await challengeRepository.save(challenge.activate());
      return ok({ activated: true });
    }

    // POST /admin/segments
    if (method === 'POST' && path === '/admin/segments') {
      const body = JSON.parse(event.body ?? '{}');
      const id = await addSegmentHandler.execute(body);
      return created({ id });
    }

    // GET /admin/racers
    if (method === 'GET' && path === '/admin/racers') {
      const challenge = await challengeRepository.findActive();
      if (!challenge) return ok({ racers: [] });
      const racers = await racerRepository.findByChallengeId(challenge.id);
      return ok({ racers: racers.map((r) => r.toJSON()) });
    }

    // GET /admin/segments/all
    if (method === 'GET' && path === '/admin/segments/all') {
      const challenges = await challengeRepository.findAll();
      const allSegments = [];
      for (const c of challenges) {
        const segs = await segmentRepository.findByChallengeId(c.id);
        allSegments.push(...segs.map((s) => ({ ...s.toJSON(), challengeName: c.name })));
      }
      return ok({ segments: allSegments });
    }

    // GET /admin/segments
    if (method === 'GET' && path === '/admin/segments') {
      const challenge = await challengeRepository.findActive();
      if (!challenge) return ok({ segments: [] });
      const segments = await segmentRepository.findByChallengeId(challenge.id);
      return ok({ segments: segments.map((s) => s.toJSON()) });
    }

    // DELETE /admin/segments/:id
    const deleteMatch = path.match(/^\/admin\/segments\/([^/]+)$/);
    if (method === 'DELETE' && deleteMatch) {
      const segmentId = deleteMatch[1];
      const challenge = await challengeRepository.findActive();
      if (!challenge) return notFound('No active challenge');
      const segments = await segmentRepository.findByChallengeId(challenge.id);
      const target = segments.find((s) => s.id === segmentId);
      if (!target) return notFound('Segment not found');
      await segmentRepository.deleteWithContext(target.id, target.challengeId, target.stravaSegmentId);
      return ok({ deleted: true });
    }

    // GET /admin/connected-athletes
    if (method === 'GET' && path === '/admin/connected-athletes') {
      const tokens = await racerRepository.findAllTokens();
      const racerIds = tokens.map((t) => t.racerId);
      const racers = await Promise.all(racerIds.map((id) => racerRepository.findById(id)));
      const athletes = racers
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .map((r) => ({
          racerId: r.id,
          stravaAthleteId: r.stravaAthleteId,
          name: r.fullName,
          profileImageUrl: r.profileImageUrl,
          category: r.category,
          ageGroup: r.ageGroup,
          sexCategory: r.sexCategory,
        }));
      return ok({ athletes });
    }

    // PATCH /admin/racers/:id
    const updateRacerMatch = path.match(/^\/admin\/racers\/([^/]+)$/);
    if (method === 'PATCH' && updateRacerMatch) {
      const racerId = updateRacerMatch[1];
      const racer = await racerRepository.findById(racerId);
      if (!racer) return notFound('Racer not found');

      const body = JSON.parse(event.body ?? '{}') as {
        category?: RacerCategory;
        ageGroup?: AgeGroup;
        sexCategory?: SexCategory;
      };

      const category = body.category ?? racer.category;
      const ageGroup = body.ageGroup ?? racer.ageGroup;
      const sexCategory = body.sexCategory ?? racer.sexCategory;

      if (!Object.values(RacerCategory).includes(category)) return badRequest('Invalid bike category');
      if (!Object.values(AgeGroup).includes(ageGroup)) return badRequest('Invalid age group');
      if (!Object.values(SexCategory).includes(sexCategory)) return badRequest('Invalid sex category');

      const updated = Racer.create(racer.id, {
        stravaAthleteId: racer.stravaAthleteId,
        firstName: racer.firstName,
        lastName: racer.lastName,
        profileImageUrl: racer.profileImageUrl,
        category,
        ageGroup,
        sexCategory,
        challengeId: racer.challengeId,
        registeredAt: racer.registeredAt,
        updatedAt: new Date(),
      });
      await racerRepository.save(updated);
      return ok({ racer: updated.toJSON() });
    }

    // POST /admin/connected-athletes/cleanup
    if (method === 'POST' && path === '/admin/connected-athletes/cleanup') {
      const tokens = await racerRepository.findAllTokens();
      const results: Array<{ racerId: string; stravaAthleteId?: number; status: string }> = [];

      for (const token of tokens) {
        const racer = await racerRepository.findById(token.racerId);
        if (!racer) {
          await racerRepository.deleteToken(token.racerId);
          results.push({ racerId: token.racerId, status: 'deleted local token for missing racer' });
          continue;
        }

        if (config.adminAthleteIds.includes(racer.stravaAthleteId)) {
          results.push({ racerId: racer.id, stravaAthleteId: racer.stravaAthleteId, status: 'skipped (admin)' });
          continue;
        }

        await stravaClient.deauthorize(token.accessToken);
        await racerRepository.deleteToken(racer.id);
        results.push({ racerId: racer.id, stravaAthleteId: racer.stravaAthleteId, status: 'deauthorized' });
      }

      return ok({ results });
    }

    // GET /admin/strava/segments/starred
    if (method === 'GET' && path === '/admin/strava/segments/starred') {
      const accessToken = await getAdminAccessToken();
      const starred = await stravaClient.getStarredSegments(accessToken, 1, 200);
      return ok({
        segments: starred.map((s) => ({
          stravaSegmentId: s.id,
          name: s.name,
          distance: s.distance,
          elevationGain: s.total_elevation_gain ?? 0,
          city: s.city,
          state: s.state,
          country: s.country,
          averageGrade: s.average_grade,
          maximumGrade: s.maximum_grade,
          climbCategory: s.climb_category,
          athleteCount: s.athlete_count,
          effortCount: s.effort_count,
        })),
      });
    }

    // GET /admin/strava/segments/:id
    const stravaSegmentMatch = path.match(/^\/admin\/strava\/segments\/(\d+)$/);
    if (method === 'GET' && stravaSegmentMatch) {
      const accessToken = await getAdminAccessToken();
      const segment = await stravaClient.getSegment(accessToken, Number(stravaSegmentMatch[1]));
      return ok({
        stravaSegmentId: segment.id,
        name: segment.name,
        distance: segment.distance,
        elevationGain: segment.total_elevation_gain ?? 0,
        city: segment.city,
        state: segment.state,
        country: segment.country,
        averageGrade: segment.average_grade,
        maximumGrade: segment.maximum_grade,
        elevationHigh: segment.elevation_high,
        elevationLow: segment.elevation_low,
        climbCategory: segment.climb_category,
        private: segment.private,
        hazardous: segment.hazardous,
        starCount: segment.star_count,
        athleteCount: segment.athlete_count,
        effortCount: segment.effort_count,
        rawStravaMetadata: segment as unknown as Record<string, unknown>,
      });
    }

    // POST /admin/racers/:id/deauthorize
    const deauthMatch = path.match(/^\/admin\/racers\/([^/]+)\/deauthorize$/);
    if (method === 'POST' && deauthMatch) {
      const racerId = deauthMatch[1];
      const token = await racerRepository.findToken(racerId);
      if (!token) return notFound('No token found for this racer');
      await stravaClient.deauthorize(token.accessToken);
      await racerRepository.deleteToken(racerId);
      return ok({ deauthorized: true, racerId });
    }

    // DELETE /admin/challenges/:id
    const deleteChallengeMatch = path.match(/^\/admin\/challenges\/([^/]+)$/);
    if (method === 'DELETE' && deleteChallengeMatch) {
      const challengeId = deleteChallengeMatch[1];
      const challenge = await challengeRepository.findById(challengeId);
      if (!challenge) return notFound('Challenge not found');

      const segments = await segmentRepository.findByChallengeId(challengeId);
      for (const seg of segments) {
        await resultRepository.deleteBySegment(seg.id);
        await leaderboardRepository.deleteBySegment(seg.id);
        await segmentRepository.deleteWithContext(seg.id, seg.challengeId, seg.stravaSegmentId);
      }
      await challengeRepository.delete(challengeId);
      return ok({ deleted: true, segmentsDeleted: segments.length });
    }

    return notFound('Unknown admin route');
  } catch (err) {
    console.error(JSON.stringify({ event: 'admin_error', method, path, error: err instanceof Error ? err.message : String(err) }));
    return serverError(err);
  }
}

async function getAdminAccessToken(): Promise<string> {
  const adminAthleteId = config.adminAthleteIds[0];
  if (!adminAthleteId) throw new Error('No admin athlete ID configured');

  const adminRacer = await racerRepository.findByStravaAthleteId(adminAthleteId);
  if (!adminRacer) throw new Error(`Admin racer not found for athlete ID ${adminAthleteId}`);

  const token = await racerRepository.findToken(adminRacer.id);
  if (!token) throw new Error(`Admin token not found for racer ${adminRacer.id}`);

  return stravaClient.getValidAccessToken(
    token.accessToken,
    token.refreshToken,
    token.expiresAt,
    async (refreshed) => {
      await racerRepository.saveToken({
        racerId: adminRacer.id,
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        expiresAt: refreshed.expires_at,
        scope: token.scope,
      });
    },
  );
}
