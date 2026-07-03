import { Entity } from '../shared/entity';
import { ActivityType } from './activity-type';
import { EventStatus } from './event-status';

export interface EventProps {
  name: string;
  description: string;
  ownerId: string; // Cognito sub
  activityType: ActivityType;
  stravaClientId: string;
  stravaClientSecret: string;
  status: EventStatus;
  startDate: Date;
  endDate: Date;
  registrationCount: number;
  starCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Event extends Entity<string> {
  private readonly props: EventProps;

  private constructor(id: string, props: EventProps) {
    super(id);
    this.props = props;
  }

  static create(id: string, props: EventProps): Event {
    return new Event(id, props);
  }

  get name(): string { return this.props.name; }
  get description(): string { return this.props.description; }
  get ownerId(): string { return this.props.ownerId; }
  get activityType(): ActivityType { return this.props.activityType; }
  get stravaClientId(): string { return this.props.stravaClientId; }
  get stravaClientSecret(): string { return this.props.stravaClientSecret; }
  get status(): EventStatus { return this.props.status; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date { return this.props.endDate; }
  get registrationCount(): number { return this.props.registrationCount; }
  get starCount(): number { return this.props.starCount; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  isActive(): boolean {
    const now = new Date();
    return this.props.status === 'ACTIVE' && now >= this.props.startDate && now <= this.props.endDate;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.ownerId === userId;
  }

  activate(): Event {
    return new Event(this._id, { ...this.props, status: 'ACTIVE', updatedAt: new Date() });
  }

  complete(): Event {
    return new Event(this._id, { ...this.props, status: 'COMPLETED', updatedAt: new Date() });
  }

  archive(): Event {
    return new Event(this._id, { ...this.props, status: 'ARCHIVED', updatedAt: new Date() });
  }

  update(changes: Partial<Pick<EventProps, 'name' | 'description' | 'activityType' | 'startDate' | 'endDate'>>): Event {
    return new Event(this._id, { ...this.props, ...changes, updatedAt: new Date() });
  }

  incrementRegistrations(): Event {
    return new Event(this._id, { ...this.props, registrationCount: this.props.registrationCount + 1, updatedAt: new Date() });
  }

  decrementRegistrations(): Event {
    return new Event(this._id, { ...this.props, registrationCount: Math.max(0, this.props.registrationCount - 1), updatedAt: new Date() });
  }

  incrementStars(): Event {
    return new Event(this._id, { ...this.props, starCount: this.props.starCount + 1, updatedAt: new Date() });
  }

  decrementStars(): Event {
    return new Event(this._id, { ...this.props, starCount: Math.max(0, this.props.starCount - 1), updatedAt: new Date() });
  }

  toJSON() {
    return { id: this._id, ...this.props };
  }
}
