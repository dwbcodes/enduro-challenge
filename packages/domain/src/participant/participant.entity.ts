import { Entity } from '../shared/entity';
import { AgeGroup, SexCategory } from '../racer/racer.entity';

export interface ParticipantProps {
  eventId: string;
  userId: string; // Cognito sub
  stravaAthleteId: number;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  category: string; // event-scoped (not limited to bike types)
  ageGroup: AgeGroup;
  sexCategory: SexCategory;
  registeredAt: Date;
  updatedAt: Date;
}

export class Participant extends Entity<string> {
  private readonly props: ParticipantProps;

  private constructor(id: string, props: ParticipantProps) {
    super(id);
    this.props = props;
  }

  static create(id: string, props: ParticipantProps): Participant {
    return new Participant(id, props);
  }

  get eventId(): string { return this.props.eventId; }
  get userId(): string { return this.props.userId; }
  get stravaAthleteId(): number { return this.props.stravaAthleteId; }
  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}`; }
  get profileImageUrl(): string { return this.props.profileImageUrl; }
  get category(): string { return this.props.category; }
  get ageGroup(): AgeGroup { return this.props.ageGroup; }
  get sexCategory(): SexCategory { return this.props.sexCategory; }
  get registeredAt(): Date { return this.props.registeredAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  update(changes: Partial<Pick<ParticipantProps, 'category' | 'ageGroup' | 'sexCategory'>>): Participant {
    return new Participant(this._id, { ...this.props, ...changes, updatedAt: new Date() });
  }

  toJSON() {
    return { id: this._id, ...this.props };
  }
}
