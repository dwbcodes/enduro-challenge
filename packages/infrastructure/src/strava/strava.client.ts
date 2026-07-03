export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope?: string;
  athlete: StravaAthlete;
}

export interface StravaAthlete {
  id: number;
  username?: string;
  firstname: string;
  lastname: string;
  city?: string;
  state?: string;
  country?: string;
  sex?: string;
  birthday?: string;
  premium?: boolean;
  summit?: boolean;
  created_at?: string;
  updated_at?: string;
  badge_type_id?: number;
  profile_medium?: string;
  profile: string; // URL
  follower_count?: number;
  friend_count?: number;
  mutual_friend_count?: number;
  athlete_type?: number;
  date_preference?: string;
  measurement_preference?: string;
  ftp?: number;
  weight?: number;
  bikes?: unknown[];
  shoes?: unknown[];
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

export interface StravaLeaderboardEntry {
  athlete_name: string;
  athlete_id: number;
  elapsed_time: number;
  start_date: string;
  rank: number;
  effort_id: number;
}

export interface StravaLeaderboardResponse {
  effort_count: number;
  entry_count: number;
  entries: StravaLeaderboardEntry[];
}

export interface StravaSegment {
  id: number;
  name: string;
  distance: number;
  total_elevation_gain?: number;
  city?: string;
  state?: string;
  country?: string;
  average_grade?: number;
  maximum_grade?: number;
  elevation_high?: number;
  elevation_low?: number;
  climb_category?: number;
  private?: boolean;
  hazardous?: boolean;
  star_count?: number;
  athlete_count?: number;
  effort_count?: number;
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

  async getAuthenticatedAthlete(accessToken: string): Promise<StravaAthlete> {
    const res = await fetch(
      `${this.baseUrl}/athlete`,
      { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) throw new Error(`Strava get authenticated athlete failed: ${res.status}`);
    return res.json() as Promise<StravaAthlete>;
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

  async deauthorize(accessToken: string): Promise<void> {
    const res = await fetch('https://www.strava.com/oauth/deauthorize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Strava deauthorize failed: ${res.status}`);
  }

  async getSegmentLeaderboard(
    accessToken: string,
    segmentId: number,
    page = 1,
    perPage = 200,
  ): Promise<StravaLeaderboardResponse> {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    const res = await fetch(
      `${this.baseUrl}/segments/${segmentId}/leaderboard?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) throw new Error(`Strava get segment leaderboard failed: ${res.status}`);
    return res.json() as Promise<StravaLeaderboardResponse>;
  }

  async getStarredSegments(accessToken: string, page = 1, perPage = 30): Promise<StravaSegment[]> {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    const res = await fetch(
      `${this.baseUrl}/segments/starred?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) throw new Error(`Strava get starred segments failed: ${res.status}`);
    return res.json() as Promise<StravaSegment[]>;
  }

  async getSegment(accessToken: string, segmentId: number): Promise<StravaSegment> {
    const res = await fetch(
      `${this.baseUrl}/segments/${segmentId}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) throw new Error(`Strava get segment failed: ${res.status}`);
    return res.json() as Promise<StravaSegment>;
  }
}
