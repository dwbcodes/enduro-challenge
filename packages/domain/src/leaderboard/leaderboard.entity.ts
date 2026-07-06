export enum LeaderboardCategory {
  OVERALL = 'OVERALL',
  AGE_U18 = 'AGE_U18',
  AGE_U30 = 'AGE_U30',
  AGE_30_39 = 'AGE_30_39',
  AGE_40_49 = 'AGE_40_49',
  AGE_50_59 = 'AGE_50_59',
  AGE_60_PLUS = 'AGE_60_PLUS',
}

export const LEADERBOARD_CATEGORY_LABELS: Record<LeaderboardCategory, string> = {
  [LeaderboardCategory.OVERALL]: 'Overall',
  [LeaderboardCategory.AGE_U18]: 'Under 18',
  [LeaderboardCategory.AGE_U30]: 'Under 30',
  [LeaderboardCategory.AGE_30_39]: '30–39',
  [LeaderboardCategory.AGE_40_49]: '40–49',
  [LeaderboardCategory.AGE_50_59]: '50–59',
  [LeaderboardCategory.AGE_60_PLUS]: '60+',
};

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
