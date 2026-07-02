import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { LeaderboardCategory } from '@enduro/domain';
import { getLeaderboardHandler } from '../shared/container';
import { ok, badRequest, notFound, serverError } from '../shared/response';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const segmentId = event.pathParameters?.['segmentId'];
    const categoryParam = (event.queryStringParameters?.['category'] ?? 'OVERALL').toUpperCase();

    if (!segmentId) return badRequest('Missing segmentId');

    if (!Object.values(LeaderboardCategory).includes(categoryParam as LeaderboardCategory)) {
      return badRequest(`Invalid category. Valid values: ${Object.values(LeaderboardCategory).join(', ')}`);
    }

    const leaderboard = await getLeaderboardHandler.execute({
      segmentId,
      category: categoryParam as LeaderboardCategory,
    });

    if (!leaderboard) return notFound('No leaderboard data yet for this segment');

    return ok(leaderboard);
  } catch (err) {
    return serverError(err);
  }
}
