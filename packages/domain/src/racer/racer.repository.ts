import { Racer } from './racer.entity';
import { StravaToken } from './strava-token';

export interface RacerRepository {
  findById(id: string): Promise<Racer | null>;
  findByStravaAthleteId(stravaAthleteId: number): Promise<Racer | null>;
  findAllByStravaAthleteId(stravaAthleteId: number): Promise<Racer[]>;
  findByChallengeId(challengeId: string): Promise<Racer[]>;
  save(racer: Racer): Promise<void>;
  saveToken(token: StravaToken): Promise<void>;
  findToken(racerId: string): Promise<StravaToken | null>;
  findAllTokens(): Promise<StravaToken[]>;
  deleteToken(racerId: string): Promise<void>;
  delete(id: string): Promise<void>;
}
