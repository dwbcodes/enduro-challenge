export interface CreateChallengeCommand {
  name: string;
  description: string;
  location?: string;
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  activityTypes?: string[]; // StravaActivityType values — defaults to ['Ride'] if omitted
  ownerAthleteId?: number;
}
