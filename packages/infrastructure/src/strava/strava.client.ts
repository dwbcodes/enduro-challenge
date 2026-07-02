export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: StravaAthlete;
}

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string; // URL
}

export interface StravaSegmentEffort {
  id: number;
  segment: { id: number };
  elapsed_time: number;
  start_date: string;
}

export interface StravaActivity {
  id: number;
  segment_efforts: StravaSegmentEffort[];
}

export class StravaClient {
  private readonly baseUrl = 'https://www.strava.com/api/v3';
  private readonly authUrl = 'https://www.strava.com/oauth/token';

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  async exchangeCode(code: string): Promise<StravaTokenResponse> {
    const res = await fetch(this.authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`);
    return res.json() as Promise<StravaTokenResponse>;
  }

  async refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
    const res = await fetch(this.authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`);
    return res.json() as Promise<StravaTokenResponse>;
  }

  async getActivity(accessToken: string, activityId: number): Promise<StravaActivity> {
    const res = await fetch(
      `${this.baseUrl}/activities/${activityId}?include_all_efforts=true`,
      { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) throw new Error(`Strava get activity failed: ${res.status}`);
    return res.json() as Promise<StravaActivity>;
  }

  /** Returns a valid access token, refreshing if within 5 minutes of expiry. */
  async getValidAccessToken(
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
    onRefresh: (response: StravaTokenResponse) => Promise<void>,
  ): Promise<string> {
    const nowPlusFive = Math.floor(Date.now() / 1000) + 300;
    if (expiresAt > nowPlusFive) return accessToken;

    const refreshed = await this.refreshAccessToken(refreshToken);
    await onRefresh(refreshed);
    return refreshed.access_token;
  }
}
