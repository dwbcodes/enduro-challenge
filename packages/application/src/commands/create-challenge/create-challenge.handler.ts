import { v4 as uuidv4 } from 'uuid';
import { Challenge, ChallengeRepository } from '@enduro/domain';
import { CreateChallengeCommand } from './create-challenge.command';

export class CreateChallengeHandler {
  constructor(private readonly challengeRepository: ChallengeRepository) {}

  async execute(command: CreateChallengeCommand): Promise<string> {
    const challengeId = uuidv4();
    const now = new Date();

    const challenge = Challenge.create(challengeId, {
      name: command.name,
      description: command.description,
      startDate: new Date(command.startDate),
      endDate: new Date(command.endDate),
      segmentIds: [],
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    });

    await this.challengeRepository.save(challenge);
    return challengeId;
  }
}
