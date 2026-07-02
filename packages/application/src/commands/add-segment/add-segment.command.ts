export interface AddSegmentCommand {
  challengeId: string;
  stravaSegmentId: number;
  name: string;
  distance: number;
  elevationGain: number;
  description?: string;
  city?: string;
  state?: string;
  country?: string;
  averageGrade?: number;
  maximumGrade?: number;
  elevationHigh?: number;
  elevationLow?: number;
  climbCategory?: number;
  private?: boolean;
  hazardous?: boolean;
  starCount?: number;
  athleteCount?: number;
  effortCount?: number;
  rawStravaMetadata?: Record<string, unknown>;
}
