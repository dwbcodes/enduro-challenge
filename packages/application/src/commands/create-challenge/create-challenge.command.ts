export interface CreateChallengeCommand {
  name: string;
  description: string;
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
}
