import { Leaderboard, LeaderboardCategory, LeaderboardEntry } from './leaderboard.entity';

export interface LeaderboardRepository {
  getLeaderboard(segmentId: string, category: LeaderboardCategory): Promise<Leaderboard | null>;
  upsertEntry(segmentId: string, category: LeaderboardCategory, entry: LeaderboardEntry): Promise<void>;
  removeEntry(segmentId: string, category: LeaderboardCategory, racerId: string): Promise<void>;
  deleteBySegment(segmentId: string): Promise<void>;
}
