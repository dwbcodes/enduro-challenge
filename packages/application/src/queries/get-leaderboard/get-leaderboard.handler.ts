import { Leaderboard, LeaderboardRepository } from '@enduro/domain';
import { GetLeaderboardQuery } from './get-leaderboard.query';

export class GetLeaderboardHandler {
  constructor(private readonly leaderboardRepository: LeaderboardRepository) {}

  async execute(query: GetLeaderboardQuery): Promise<Leaderboard | null> {
    return this.leaderboardRepository.getLeaderboard(query.segmentId, query.category);
  }
}
