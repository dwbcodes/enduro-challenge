import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { challengeRepository, segmentRepository } from '../shared/container';
import { ok, notFound, serverError } from '../shared/response';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const requestedId = event.queryStringParameters?.challengeId;
    const challenge = requestedId
      ? await challengeRepository.findById(requestedId)
      : await challengeRepository.findActive();
    if (!challenge) return notFound(requestedId ? 'Challenge not found' : 'No active challenge');

    const segments = await segmentRepository.findByChallengeId(challenge.id);
    return ok({
      challengeId: challenge.id,
      challengeName: challenge.name,
      segments: segments.map((s) => s.toJSON()),
    });
  } catch (err) {
    return serverError(err);
  }
}
