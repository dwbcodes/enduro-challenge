import { User } from './user.entity';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByStravaAthleteId(stravaAthleteId: number): Promise<User | null>;
  save(user: User): Promise<void>;
}
