export interface StravaToken {
  racerId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (seconds)
  scope: string;
}
