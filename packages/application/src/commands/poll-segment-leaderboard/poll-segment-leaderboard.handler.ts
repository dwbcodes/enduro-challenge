import {
  RacerRepository,
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
import { PollSegmentLeaderboardCommand } from './poll-segment-leaderboard.command';

export class PollSegmentLeaderboardHandler {
  constructor(
    private readonly racerRepository: RacerRepository,
    private readonly resultRepository: ResultRepository,
    private readonly leaderboardRepository: LeaderboardRepository,
  ) {}

  async execute(command: PollSegmentLeaderboardCommand): Promise<{ processed: number; updated: number }> {
    const racers = await this.racerRepository.findByChallengeId(command.challengeId);
    const racerByAthleteId = new Map<number, Racer>();
    for (const racer of racers) {
      racerByAthleteId.set(racer.stravaAthleteId, racer);
    }

    let processed = 0;
    let updated = 0;

    for (const effort of command.efforts) {
      const racer = racerByAthleteId.get(effort.stravaAthleteId);
      if (!racer) continue; // Not a registered racer

      processed++;

      const existing = await this.resultRepository.findBySegmentAndRacer(command.segmentId, racer.id);
      if (existing && existing.elapsedTimeSeconds <= effort.elapsedTimeSeconds) continue; // Not a PB

      const resultId = Result.makeId(command.segmentId, racer.id);
      const result = Result.create(resultId, {
        segmentId: command.segmentId,
        racerId: racer.id,
        challengeId: command.challengeId,
        elapsedTimeSeconds: effort.elapsedTimeSeconds,
        stravaEffortId: effort.stravaEffortId,
        achievedAt: new Date(effort.achievedAt),
        updatedAt: new Date(),
      });

      await this.resultRepository.save(result);
      await this.updateLeaderboards(racer, result);
      updated++;
    }

    return { processed, updated };
  }

  private async updateLeaderboards(racer: Racer, result: Result): Promise<void> {
    const categories = this.resolveCategories(racer.category, racer.ageGroup, racer.sexCategory);

    for (const category of categories) {
      const entry: LeaderboardEntry = {
        rank: 0,
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
