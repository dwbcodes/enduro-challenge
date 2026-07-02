import {
  RacerRepository,
  SegmentRepository,
  ResultRepository,
  LeaderboardRepository,
  Result,
  LeaderboardCategory,
  LeaderboardEntry,
  Racer,
  RacerCategory,
  AgeGroup,
  SexCategory,
} from '@enduro/domain';
import { ProcessActivityCommand } from './process-activity.command';

export class ProcessActivityHandler {
  constructor(
    private readonly racerRepository: RacerRepository,
    private readonly segmentRepository: SegmentRepository,
    private readonly resultRepository: ResultRepository,
    private readonly leaderboardRepository: LeaderboardRepository,
  ) {}

  async execute(command: ProcessActivityCommand): Promise<void> {
    const racer = await this.racerRepository.findByStravaAthleteId(command.stravaAthleteId);
    if (!racer) return; // Not a registered racer — ignore

    for (const effort of command.segmentEfforts) {
      const segment = await this.segmentRepository.findByStravaSegmentId(effort.stravaSegmentId);
      if (!segment || segment.challengeId !== racer.challengeId) continue; // Not a tracked segment or wrong challenge

      const existing = await this.resultRepository.findBySegmentAndRacer(segment.id, racer.id);

      if (existing && existing.elapsedTimeSeconds <= effort.elapsedTimeSeconds) continue; // Not a PB

      const resultId = Result.makeId(segment.id, racer.id);
      const result = Result.create(resultId, {
        segmentId: segment.id,
        racerId: racer.id,
        challengeId: segment.challengeId,
        elapsedTimeSeconds: effort.elapsedTimeSeconds,
        stravaEffortId: effort.stravaEffortId,
        achievedAt: new Date(effort.achievedAt),
        updatedAt: new Date(),
      });

      await this.resultRepository.save(result);
      await this.updateLeaderboards(racer, result);
    }
  }

  private async updateLeaderboards(racer: Racer, result: Result): Promise<void> {
    const categories = this.resolveCategories(racer.category, racer.ageGroup, racer.sexCategory);

    for (const category of categories) {
      const entry: LeaderboardEntry = {
        rank: 0, // Assigned on read
        racerId: racer.id,
        racerName: racer.fullName,
        profileImageUrl: racer.profileImageUrl,
        category,
        elapsedTimeSeconds: result.elapsedTimeSeconds,
        achievedAt: result.achievedAt,
      };
      await this.leaderboardRepository.upsertEntry(result.segmentId, category, entry);
    }
  }

  private resolveCategories(racerCategory: RacerCategory, ageGroup: AgeGroup, sexCategory: SexCategory): LeaderboardCategory[] {
    const ageMap: Record<AgeGroup, LeaderboardCategory> = {
      [AgeGroup.UNDER_30]: LeaderboardCategory.AGE_U30,
      [AgeGroup.AGE_30_39]: LeaderboardCategory.AGE_30_39,
      [AgeGroup.AGE_40_49]: LeaderboardCategory.AGE_40_49,
      [AgeGroup.AGE_50_59]: LeaderboardCategory.AGE_50_59,
      [AgeGroup.AGE_60_PLUS]: LeaderboardCategory.AGE_60_PLUS,
    };

    const bikeCategoryMap: Record<RacerCategory, LeaderboardCategory[]> = {
      [RacerCategory.MTB]: [LeaderboardCategory.MTB],
      [RacerCategory.EBIKE]: [LeaderboardCategory.EBIKE],
      [RacerCategory.BOTH]: [LeaderboardCategory.MTB, LeaderboardCategory.EBIKE],
    };

    const sexCategoryMap: Record<SexCategory, LeaderboardCategory> = {
      [SexCategory.MALE]: LeaderboardCategory.MALE,
      [SexCategory.FEMALE]: LeaderboardCategory.FEMALE,
    };

    return [
      LeaderboardCategory.OVERALL,
      ...bikeCategoryMap[racerCategory],
      sexCategoryMap[sexCategory],
      ageMap[ageGroup],
    ];
  }
}
