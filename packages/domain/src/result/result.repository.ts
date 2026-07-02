import { Result } from './result.entity';

export interface ResultRepository {
  findBySegmentAndRacer(segmentId: string, racerId: string): Promise<Result | null>;
  findBySegment(segmentId: string): Promise<Result[]>;
  findByRacer(racerId: string): Promise<Result[]>;
  save(result: Result): Promise<void>;
  delete(segmentId: string, racerId: string): Promise<void>;
}
