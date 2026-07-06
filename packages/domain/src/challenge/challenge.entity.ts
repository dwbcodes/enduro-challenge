import { Entity } from '../shared/entity';

export type ChallengeStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED';

export enum StravaActivityType {
  RIDE = 'Ride',
  MOUNTAIN_BIKE_RIDE = 'MountainBikeRide',
  GRAVEL_RIDE = 'GravelRide',
  E_BIKE_RIDE = 'EBikeRide',
  E_MOUNTAIN_BIKE_RIDE = 'EMountainBikeRide',
  RUN = 'Run',
  TRAIL_RUN = 'TrailRun',
  HIKE = 'Hike',
  WALK = 'Walk',
  VIRTUAL_RIDE = 'VirtualRide',
  VIRTUAL_RUN = 'VirtualRun',
}

export const STRAVA_ACTIVITY_TYPE_LABELS: Record<StravaActivityType, string> = {
  [StravaActivityType.RIDE]: 'Road Ride',
  [StravaActivityType.MOUNTAIN_BIKE_RIDE]: 'Mountain Bike Ride',
  [StravaActivityType.GRAVEL_RIDE]: 'Gravel Ride',
  [StravaActivityType.E_BIKE_RIDE]: 'E-Bike Ride',
  [StravaActivityType.E_MOUNTAIN_BIKE_RIDE]: 'E-Mountain Bike Ride',
  [StravaActivityType.RUN]: 'Run',
  [StravaActivityType.TRAIL_RUN]: 'Trail Run',
  [StravaActivityType.HIKE]: 'Hike',
  [StravaActivityType.WALK]: 'Walk',
  [StravaActivityType.VIRTUAL_RIDE]: 'Virtual Ride',
  [StravaActivityType.VIRTUAL_RUN]: 'Virtual Run',
};

export interface ChallengeProps {
  name: string;
  description: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  activityTypes: StravaActivityType[];
  segmentIds: string[];
  status: ChallengeStatus;
  ownerAthleteId?: number;
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
  get location(): string | undefined { return this.props.location; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date { return this.props.endDate; }
  get activityTypes(): StravaActivityType[] { return [...this.props.activityTypes]; }
  get segmentIds(): string[] { return [...this.props.segmentIds]; }
  get status(): ChallengeStatus { return this.props.status; }
  get ownerAthleteId(): number | undefined { return this.props.ownerAthleteId; }
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
