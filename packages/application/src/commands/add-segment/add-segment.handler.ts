import { v4 as uuidv4 } from 'uuid';
import { Segment, SegmentRepository, ChallengeRepository } from '@enduro/domain';
import { AddSegmentCommand } from './add-segment.command';

export class AddSegmentHandler {
  constructor(
    private readonly segmentRepository: SegmentRepository,
    private readonly challengeRepository: ChallengeRepository,
  ) {}

  async execute(command: AddSegmentCommand): Promise<string> {
    const challenge = await this.challengeRepository.findById(command.challengeId);
    if (!challenge) throw new Error(`Challenge ${command.challengeId} not found`);

    const segmentId = uuidv4();
    const now = new Date();

    const segment = Segment.create(segmentId, {
      stravaSegmentId: command.stravaSegmentId,
      name: command.name,
      challengeId: command.challengeId,
      distance: command.distance,
      elevationGain: command.elevationGain,
      description: command.description,
      createdAt: now,
      updatedAt: now,
    });

    await this.segmentRepository.save(segment);
    await this.challengeRepository.save(challenge.addSegment(segmentId));

    return segmentId;
  }
}
