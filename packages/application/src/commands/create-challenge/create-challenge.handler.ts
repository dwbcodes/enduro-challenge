import { v4 as uuidv4 } from 'uuid';
import { Challenge, ChallengeRepository, StravaActivityType } from '@enduro/domain';
import { CreateChallengeCommand } from './create-challenge.command';

const VALID_ACTIVITY_TYPES = new Set(Object.values(StravaActivityType) as string[]);

export class CreateChallengeHandler {
  constructor(private readonly challengeRepository: ChallengeRepository) {}

  async execute(command: CreateChallengeCommand): Promise<string> {
    const challengeId = uuidv4();
    const now = new Date();

    const rawTypes = command.activityTypes ?? [StravaActivityType.RIDE];
    const activityTypes = rawTypes.filter((t) => VALID_ACTIVITY_TYPES.has(t)) as StravaActivityType[];
    if (activityTypes.length === 0) {
      activityTypes.push(StravaActivityType.RIDE);
    }
    if (activityTypes.length > 5) {
      throw new Error('A challenge can have at most 5 activity types');
    }

    const challenge = Challenge.create(challengeId, {
      name: command.name,
      description: command.description,
      location: command.location,
      startDate: new Date(command.startDate),
      endDate: new Date(command.endDate),
      activityTypes,
      segmentIds: [],
      status: 'DRAFT',
      ownerAthleteId: command.ownerAthleteId,
      createdAt: now,
      updatedAt: now,
    });

    await this.challengeRepository.save(challenge);
    return challengeId;
  }
}
