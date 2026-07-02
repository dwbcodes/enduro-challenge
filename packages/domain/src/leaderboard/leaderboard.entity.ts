export enum LeaderboardCategory {
  OVERALL = 'OVERALL',
  MTB = 'MTB',
  EBIKE = 'EBIKE',
  AGE_U30 = 'AGE_U30',
  AGE_30_39 = 'AGE_30_39',
  AGE_40_49 = 'AGE_40_49',
  AGE_50_59 = 'AGE_50_59',
  AGE_60_PLUS = 'AGE_60_PLUS',
}

export interface LeaderboardEntry {
  rank: number;
  racerId: string;
  racerName: string;
  profileImageUrl: string;
  category: LeaderboardCategory;
  elapsedTimeSeconds: number;
  achievedAt: Date;
}

export interface Leaderboard {
  segmentId: string;
  segmentName: string;
  category: LeaderboardCategory;
  entries: LeaderboardEntry[];
  updatedAt: Date;
}
