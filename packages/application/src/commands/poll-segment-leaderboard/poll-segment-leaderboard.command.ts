export interface LeaderboardEffort {
  stravaAthleteId: number;
  elapsedTimeSeconds: number;
  stravaEffortId: number;
  achievedAt: string; // ISO string
}

export interface PollSegmentLeaderboardCommand {
  segmentId: string;
  challengeId: string;
  efforts: LeaderboardEffort[];
}
