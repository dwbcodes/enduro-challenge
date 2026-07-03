import { Registration } from './registration.entity';

export interface RegistrationRepository {
  findByUserAndEvent(userId: string, eventId: string): Promise<Registration | null>;
  findByUser(userId: string): Promise<Registration[]>;
  findByEvent(eventId: string): Promise<Registration[]>;
  save(registration: Registration): Promise<void>;
  delete(id: string): Promise<void>;
}
