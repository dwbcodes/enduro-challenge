export interface AddSegmentCommand {
  challengeId: string;
  stravaSegmentId: number;
  name: string;
  distance: number;
  elevationGain: number;
  description?: string;
}
