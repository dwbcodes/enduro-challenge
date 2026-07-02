import { Racer } from './racer.entity';
import { StravaToken } from './strava-token';

export interface RacerRepository {
  findById(id: string): Promise<Racer | null>;
  findByStravaAthleteId(stravaAthleteId: number): Promise<Racer | null>;
  findByChallengeId(challengeId: string): Promise<Racer[]>;
  save(racer: Racer): Promise<void>;
  saveToken(token: StravaToken): Promise<void>;
  findToken(racerId: string): Promise<StravaToken | null>;
  delete(id: string): Promise<void>;
}
