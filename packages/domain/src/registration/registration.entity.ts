import { Entity } from '../shared/entity';

export type RegistrationStatus = 'REGISTERED' | 'STARRED';

export interface RegistrationProps {
  userId: string; // Cognito sub
  eventId: string;
  status: RegistrationStatus;
  participantId: string | null; // null until Strava link completes
  registeredAt: Date;
  updatedAt: Date;
}

export class Registration extends Entity<string> {
  private readonly props: RegistrationProps;

  private constructor(id: string, props: RegistrationProps) {
    super(id);
    this.props = props;
  }

  static create(id: string, props: RegistrationProps): Registration {
    return new Registration(id, props);
  }

  static makeId(userId: string, eventId: string): string {
    return `${userId}#${eventId}`;
  }

  get userId(): string { return this.props.userId; }
  get eventId(): string { return this.props.eventId; }
  get status(): RegistrationStatus { return this.props.status; }
  get participantId(): string | null { return this.props.participantId; }
  get registeredAt(): Date { return this.props.registeredAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  linkParticipant(participantId: string): Registration {
    return new Registration(this._id, { ...this.props, participantId, updatedAt: new Date() });
  }

  star(): Registration {
    return new Registration(this._id, { ...this.props, status: 'STARRED', updatedAt: new Date() });
  }

  register(): Registration {
    return new Registration(this._id, { ...this.props, status: 'REGISTERED', updatedAt: new Date() });
  }

  toJSON() {
    return { id: this._id, ...this.props };
  }
}
