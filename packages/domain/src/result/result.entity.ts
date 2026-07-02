import { Entity } from '../shared/entity';

export interface ResultProps {
  segmentId: string;
  racerId: string;
  challengeId: string;
  elapsedTimeSeconds: number;
  stravaEffortId: number;
  achievedAt: Date;
  updatedAt: Date;
}

export class Result extends Entity<string> {
  private readonly props: ResultProps;

  private constructor(id: string, props: ResultProps) {
    super(id);
    this.props = props;
  }

  static create(id: string, props: ResultProps): Result {
    return new Result(id, props);
  }

  /** Deterministic composite ID — one best-time record per racer per segment. */
  static makeId(segmentId: string, racerId: string): string {
    return `${segmentId}#${racerId}`;
  }

  get segmentId(): string { return this.props.segmentId; }
  get racerId(): string { return this.props.racerId; }
  get challengeId(): string { return this.props.challengeId; }
  get elapsedTimeSeconds(): number { return this.props.elapsedTimeSeconds; }
  get stravaEffortId(): number { return this.props.stravaEffortId; }
  get achievedAt(): Date { return this.props.achievedAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  isBetterThan(other: Result): boolean {
    return this.props.elapsedTimeSeconds < other.props.elapsedTimeSeconds;
  }

  toJSON() {
    return { id: this._id, ...this.props };
  }
}
