import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { challengeRepository, racerRepository } from '../shared/container';
import { ok, notFound, serverError } from '../shared/response';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const challenge = await challengeRepository.findActive();
    if (!challenge) return notFound('No active challenge');

    const racers = await racerRepository.findByChallengeId(challenge.id);
    return ok({
      challengeId: challenge.id,
      racers: racers.map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        profileImageUrl: r.profileImageUrl,
        category: r.category,
        ageGroup: r.ageGroup,
        sexCategory: r.sexCategory,
        registeredAt: r.registeredAt,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}
