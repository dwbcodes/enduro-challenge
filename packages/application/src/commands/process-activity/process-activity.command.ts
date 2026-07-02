export interface SegmentEffort {
  stravaSegmentId: number;
  stravaEffortId: number;
  elapsedTimeSeconds: number;
  achievedAt: string; // ISO string
}

export interface ProcessActivityCommand {
  stravaAthleteId: number;
  stravaActivityId: number;
  segmentEfforts: SegmentEffort[];
}
