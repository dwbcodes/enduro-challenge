import { AgeGroup, RacerCategory } from '@enduro/domain';

export interface RegisterRacerCommand {
  stravaAthleteId: number;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  category: RacerCategory;
  ageGroup: AgeGroup;
  challengeId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number;
  tokenScope: string;
}
