import { Creator } from './creator.entity';

export interface CreatorRepository {
  findById(id: string): Promise<Creator | null>;
  findByStravaAthleteId(stravaAthleteId: number): Promise<Creator | null>;
  findByUsername(username: string): Promise<Creator | null>;
  save(creator: Creator): Promise<void>;
}
