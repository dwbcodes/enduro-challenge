import { Entity } from '../shared/entity';

export type ChallengeStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED';

export interface ChallengeProps {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  segmentIds: string[];
  status: ChallengeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Challenge extends Entity<string> {
  private readonly props: ChallengeProps;

  private constructor(id: string, props: ChallengeProps) {
    super(id);
    this.props = props;
  }

  static create(id: string, props: ChallengeProps): Challenge {
    return new Challenge(id, props);
  }

  get name(): string { return this.props.name; }
  get description(): string { return this.props.description; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date { return this.props.endDate; }
  get segmentIds(): string[] { return [...this.props.segmentIds]; }
  get status(): ChallengeStatus { return this.props.status; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  isActive(): boolean {
    const now = new Date();
    return this.props.status === 'ACTIVE' && now >= this.props.startDate && now <= this.props.endDate;
  }

  activate(): Challenge {
    return new Challenge(this._id, { ...this.props, status: 'ACTIVE', updatedAt: new Date() });
  }

  complete(): Challenge {
    return new Challenge(this._id, { ...this.props, status: 'COMPLETED', updatedAt: new Date() });
  }

  addSegment(segmentId: string): Challenge {
    if (this.props.segmentIds.includes(segmentId)) return this;
    return new Challenge(this._id, {
      ...this.props,
      segmentIds: [...this.props.segmentIds, segmentId],
      updatedAt: new Date(),
    });
  }

  removeSegment(segmentId: string): Challenge {
    return new Challenge(this._id, {
      ...this.props,
      segmentIds: this.props.segmentIds.filter((id) => id !== segmentId),
      updatedAt: new Date(),
    });
  }

  toJSON() {
    return { id: this._id, ...this.props };
  }
}
