import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { Challenge } from '@enduro/domain';
import { challengeRepository } from '../shared/container';
import { ok, serverError } from '../shared/response';

export async function handler(_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const challenges = await challengeRepository.findAll();
    const now = new Date();

    const active: ReturnType<Challenge['toJSON']>[] = [];
    const upcoming: ReturnType<Challenge['toJSON']>[] = [];
    const past: ReturnType<Challenge['toJSON']>[] = [];

    for (const c of challenges) {
      const json = c.toJSON();
      if (c.status === 'COMPLETED' || (c.status === 'ACTIVE' && c.endDate < now)) {
        past.push(json);
      } else if (c.status === 'ACTIVE' && c.startDate <= now && c.endDate >= now) {
        active.push(json);
      } else {
        // DRAFT or ACTIVE with startDate in the future
        upcoming.push(json);
      }
    }

    active.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    upcoming.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    past.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

    return ok({ active, upcoming, past });
  } catch (err) {
    return serverError(err);
  }
}
