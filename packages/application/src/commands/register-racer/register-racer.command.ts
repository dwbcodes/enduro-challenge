import { AgeGroup, RacerCategory, SexCategory } from '@enduro/domain';

export interface RegisterRacerCommand {
  stravaAthleteId: number;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  profileMediumImageUrl?: string;
  username?: string;
  city?: string;
  state?: string;
  country?: string;
  sex?: string;
  birthday?: string;
  weight?: number;
  ftp?: number;
  measurementPreference?: string;
  datePreference?: string;
  premium?: boolean;
  summit?: boolean;
  followerCount?: number;
  friendCount?: number;
  mutualFriendCount?: number;
  athleteType?: number;
  badgeTypeId?: number;
  stravaCreatedAt?: Date;
  stravaUpdatedAt?: Date;
  bikes?: unknown[];
  shoes?: unknown[];
  rawStravaProfile?: Record<string, unknown>;
  category: RacerCategory;
  ageGroup: AgeGroup;
  sexCategory: SexCategory;
  challengeId: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  tokenScope?: string;
}
