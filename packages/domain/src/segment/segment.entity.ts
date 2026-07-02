import { Entity } from '../shared/entity';

export interface SegmentProps {
  stravaSegmentId: number;
  name: string;
  challengeId: string;
  distance: number;      // metres
  elevationGain: number; // metres
  description?: string;
  city?: string;
  state?: string;
  country?: string;
  averageGrade?: number;
  maximumGrade?: number;
  elevationHigh?: number;
  elevationLow?: number;
  climbCategory?: number;
  private?: boolean;
  hazardous?: boolean;
  starCount?: number;
  athleteCount?: number;
  effortCount?: number;
  rawStravaMetadata?: Record<string, unknown>;
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
  get city(): string | undefined { return this.props.city; }
  get state(): string | undefined { return this.props.state; }
  get country(): string | undefined { return this.props.country; }
  get averageGrade(): number | undefined { return this.props.averageGrade; }
  get maximumGrade(): number | undefined { return this.props.maximumGrade; }
  get elevationHigh(): number | undefined { return this.props.elevationHigh; }
  get elevationLow(): number | undefined { return this.props.elevationLow; }
  get climbCategory(): number | undefined { return this.props.climbCategory; }
  get private(): boolean | undefined { return this.props.private; }
  get hazardous(): boolean | undefined { return this.props.hazardous; }
  get starCount(): number | undefined { return this.props.starCount; }
  get athleteCount(): number | undefined { return this.props.athleteCount; }
  get effortCount(): number | undefined { return this.props.effortCount; }
  get rawStravaMetadata(): Record<string, unknown> | undefined { return this.props.rawStravaMetadata; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  toJSON() {
    return { id: this._id, ...this.props };
  }
}
