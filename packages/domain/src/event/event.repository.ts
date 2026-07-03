import { Event } from './event.entity';

export interface EventRepository {
  findById(id: string): Promise<Event | null>;
  findByOwner(ownerId: string): Promise<Event[]>;
  findActive(): Promise<Event[]>;
  findForDiscovery(limit?: number): Promise<Event[]>;
  save(event: Event): Promise<void>;
  delete(id: string): Promise<void>;
}
