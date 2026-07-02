import { Entity } from '../shared/entity';

export enum RacerCategory {
  MTB = 'MTB',
  EBIKE = 'EBIKE',
  BOTH = 'BOTH',
}

export enum AgeGroup {
  UNDER_30 = 'U30',
  AGE_30_39 = '30-39',
  AGE_40_49 = '40-49',
  AGE_50_59 = '50-59',
  AGE_60_PLUS = '60+',
}

export enum SexCategory {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export interface RacerProps {
  stravaAthleteId: number;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  category: RacerCategory;
  ageGroup: AgeGroup;
  sexCategory: SexCategory;
  challengeId: string;
  registeredAt: Date;
  updatedAt: Date;
}

export class Racer extends Entity<string> {
  private readonly props: RacerProps;

  private constructor(id: string, props: RacerProps) {
    super(id);
    this.props = props;
  }

  static create(id: string, props: RacerProps): Racer {
    return new Racer(id, props);
  }

  get stravaAthleteId(): number { return this.props.stravaAthleteId; }
  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}`; }
  get profileImageUrl(): string { return this.props.profileImageUrl; }
  get category(): RacerCategory { return this.props.category; }
  get ageGroup(): AgeGroup { return this.props.ageGroup; }
  get sexCategory(): SexCategory { return this.props.sexCategory; }
  get challengeId(): string { return this.props.challengeId; }
  get registeredAt(): Date { return this.props.registeredAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  toJSON() {
    return { id: this._id, ...this.props };
  }
}
