import { Challenge } from './challenge.entity';

export interface ChallengeRepository {
  findById(id: string): Promise<Challenge | null>;
  findActive(): Promise<Challenge | null>;
  findAll(): Promise<Challenge[]>;
  findByOwner(ownerAthleteId: number): Promise<Challenge[]>;
  save(challenge: Challenge): Promise<void>;
  delete(id: string): Promise<void>;
}
