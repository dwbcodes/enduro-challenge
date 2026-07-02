import { LeaderboardCategory } from '@enduro/domain';

export interface GetLeaderboardQuery {
  segmentId: string;
  category: LeaderboardCategory;
}
