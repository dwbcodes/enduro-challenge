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
import {
  challengeRepository,
  racerRepository,
  segmentRepository,
  createChallengeHandler,
  addSegmentHandler,
} from '../shared/container';
import { ok, created, badRequest, unauthorized, notFound, serverError } from '../shared/response';
import { CreateChallengeCommand } from '@enduro/application';

const JWT_SECRET = process.env.JWT_SECRET!;

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
  try {
    const admin = verifyAdmin(event);
    if (!admin) return unauthorized();

    const method = event.requestContext.http.method;
    const path = event.requestContext.http.path;

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

    return notFound('Unknown admin route');
  } catch (err) {
    return serverError(err);
  }
}
