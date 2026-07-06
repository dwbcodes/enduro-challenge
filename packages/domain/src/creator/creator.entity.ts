import { Entity } from '../shared/entity';

export interface StravaAppCredentials {
  clientId: string;
  clientSecret: string;
}

export interface CreatorProps {
  stravaAthleteId: number;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  username?: string;
  stravaApp?: StravaAppCredentials;
  createdAt: Date;
  updatedAt: Date;
}

export class Creator extends Entity<string> {
  private readonly props: CreatorProps;

  private constructor(id: string, props: CreatorProps) {
    super(id);
    this.props = props;
  }

  static create(id: string, props: CreatorProps): Creator {
    return new Creator(id, props);
  }

  get stravaAthleteId(): number { return this.props.stravaAthleteId; }
  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}`; }
  get profileImageUrl(): string { return this.props.profileImageUrl; }
  get username(): string | undefined { return this.props.username; }
  get slug(): string { return this.props.username ?? String(this.props.stravaAthleteId); }
  get stravaApp(): StravaAppCredentials | undefined { return this.props.stravaApp; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  hasStravaApp(): boolean {
    return !!this.props.stravaApp?.clientId && !!this.props.stravaApp?.clientSecret;
  }

  updateStravaApp(app: StravaAppCredentials): Creator {
    return new Creator(this._id, { ...this.props, stravaApp: app, updatedAt: new Date() });
  }

  toJSON() {
    return {
      id: this._id,
      stravaAthleteId: this.props.stravaAthleteId,
      firstName: this.props.firstName,
      lastName: this.props.lastName,
      profileImageUrl: this.props.profileImageUrl,
      username: this.props.username,
      slug: this.slug,
      hasStravaApp: this.hasStravaApp(),
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
