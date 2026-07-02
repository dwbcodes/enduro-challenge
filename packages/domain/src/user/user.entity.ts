import { Entity } from '../shared/entity';

export interface UserProps {
  stravaAthleteId: number;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  profileMediumImageUrl?: string;
  username?: string;
  city?: string;
  state?: string;
  country?: string;
  sex?: string;
  birthday?: string;
  weight?: number;
  ftp?: number;
  measurementPreference?: string;
  datePreference?: string;
  premium?: boolean;
  summit?: boolean;
  followerCount?: number;
  friendCount?: number;
  mutualFriendCount?: number;
  athleteType?: number;
  badgeTypeId?: number;
  stravaCreatedAt?: Date;
  stravaUpdatedAt?: Date;
  bikes?: unknown[];
  shoes?: unknown[];
  rawStravaProfile?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class User extends Entity<string> {
  private readonly props: UserProps;

  private constructor(id: string, props: UserProps) {
    super(id);
    this.props = props;
  }

  static create(id: string, props: UserProps): User {
    return new User(id, props);
  }

  get stravaAthleteId(): number { return this.props.stravaAthleteId; }
  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}`; }
  get profileImageUrl(): string { return this.props.profileImageUrl; }
  get profileMediumImageUrl(): string | undefined { return this.props.profileMediumImageUrl; }
  get username(): string | undefined { return this.props.username; }
  get city(): string | undefined { return this.props.city; }
  get state(): string | undefined { return this.props.state; }
  get country(): string | undefined { return this.props.country; }
  get sex(): string | undefined { return this.props.sex; }
  get birthday(): string | undefined { return this.props.birthday; }
  get weight(): number | undefined { return this.props.weight; }
  get ftp(): number | undefined { return this.props.ftp; }
  get measurementPreference(): string | undefined { return this.props.measurementPreference; }
  get datePreference(): string | undefined { return this.props.datePreference; }
  get premium(): boolean | undefined { return this.props.premium; }
  get summit(): boolean | undefined { return this.props.summit; }
  get followerCount(): number | undefined { return this.props.followerCount; }
  get friendCount(): number | undefined { return this.props.friendCount; }
  get mutualFriendCount(): number | undefined { return this.props.mutualFriendCount; }
  get athleteType(): number | undefined { return this.props.athleteType; }
  get badgeTypeId(): number | undefined { return this.props.badgeTypeId; }
  get stravaCreatedAt(): Date | undefined { return this.props.stravaCreatedAt; }
  get stravaUpdatedAt(): Date | undefined { return this.props.stravaUpdatedAt; }
  get bikes(): unknown[] | undefined { return this.props.bikes; }
  get shoes(): unknown[] | undefined { return this.props.shoes; }
  get rawStravaProfile(): Record<string, unknown> | undefined { return this.props.rawStravaProfile; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  toJSON() {
    return { id: this._id, ...this.props };
  }
}
