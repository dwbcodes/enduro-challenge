import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { SexCategory } from '@enduro/domain';
import { creatorRepository, challengeRepository, racerRepository } from '../shared/container';
import { ok, notFound, serverError } from '../shared/response';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const slug = event.pathParameters?.['slug'];
    if (!slug) return notFound('Missing slug');

    // Numeric slug = Strava athlete ID, string = username
    const isNumeric = /^\d+$/.test(slug);
    const creator = isNumeric
      ? await creatorRepository.findByStravaAthleteId(Number(slug))
      : await creatorRepository.findByUsername(slug);

    if (!creator) return notFound('Creator not found');

    // Fetch challenges owned by this creator
    const allChallenges = await challengeRepository.findAll();
    const owned = allChallenges.filter((c) => c.ownerAthleteId === creator.stravaAthleteId);

    // Enrich with racer counts
    const challenges = await Promise.all(owned.map(async (c) => {
      const racers = await racerRepository.findByChallengeId(c.id);
      const json = c.toJSON();
      const avatars = racers
        .filter((r) => r.profileImageUrl)
        .map((r) => r.profileImageUrl)
        .slice(0, 20);

      const men = racers.filter((r) => r.sexCategory === SexCategory.MALE);
      const women = racers.filter((r) => r.sexCategory === SexCategory.FEMALE);

      return {
        ...json,
        racerCount: racers.length,
        racerAvatars: avatars,
        topMen: men.slice(0, 5).map((r) => ({ name: r.fullName, profileImageUrl: r.profileImageUrl })),
        topWomen: women.slice(0, 5).map((r) => ({ name: r.fullName, profileImageUrl: r.profileImageUrl })),
      };
    }));

    return ok({
      creator: {
        id: creator.id,
        firstName: creator.firstName,
        lastName: creator.lastName,
        profileImageUrl: creator.profileImageUrl,
        username: creator.username,
        slug: creator.slug,
      },
      challenges,
    });
  } catch (err) {
    return serverError(err);
  }
}
