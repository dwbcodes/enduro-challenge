import { Segment } from './segment.entity';

export interface SegmentRepository {
  findById(id: string): Promise<Segment | null>;
  findByStravaSegmentId(stravaSegmentId: number): Promise<Segment | null>;
  findByChallengeId(challengeId: string): Promise<Segment[]>;
  save(segment: Segment): Promise<void>;
  delete(id: string): Promise<void>;
}
