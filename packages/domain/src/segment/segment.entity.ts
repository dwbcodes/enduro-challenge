import { Entity } from '../shared/entity';

export interface SegmentProps {
  stravaSegmentId: number;
  name: string;
  challengeId: string;
  distance: number;      // metres
  elevationGain: number; // metres
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Segment extends Entity<string> {
  private readonly props: SegmentProps;

  private constructor(id: string, props: SegmentProps) {
    super(id);
    this.props = props;
  }

  static create(id: string, props: SegmentProps): Segment {
    return new Segment(id, props);
  }

  get stravaSegmentId(): number { return this.props.stravaSegmentId; }
  get name(): string { return this.props.name; }
  get challengeId(): string { return this.props.challengeId; }
  get distance(): number { return this.props.distance; }
  get elevationGain(): number { return this.props.elevationGain; }
  get description(): string | undefined { return this.props.description; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  toJSON() {
    return { id: this._id, ...this.props };
  }
}
