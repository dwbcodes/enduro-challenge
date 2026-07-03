import { AgeGroup, RacerCategory, SexCategory, LeaderboardCategory } from '@enduro/domain';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

function absoluteApiUrl(): string {
  if (API_URL.startsWith('http')) return API_URL;
  if (typeof window === 'undefined') return API_URL;
  return `${window.location.origin}${API_URL}`;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ─── Public ──────────────────────────────────────────────────────────────────

export interface SegmentInfo {
  id: string;
  name: string;
  stravaSegmentId: number;
  distance: number;
  elevationGain: number;
  rawStravaMetadata?: {
    map?: { polyline?: string };
    start_latlng?: [number, number];
    end_latlng?: [number, number];
    [key: string]: unknown;
  };
}

export interface SegmentsResponse {
  challengeId: string;
  challengeName: string;
  segments: SegmentInfo[];
}

export function getSegments(challengeId?: string): Promise<SegmentsResponse> {
  const query = challengeId ? `?challengeId=${challengeId}` : '';
  return apiFetch(`/segments${query}`);
}

export interface LeaderboardEntry {
  racerId: string;
  rank: number;
  racerName: string;
  profileImageUrl: string;
  elapsedTimeSeconds: number;
  achievedAt: string;
}

export interface LeaderboardData {
  segmentName: string;
  category: string;
  entries: LeaderboardEntry[];
}

export function getLeaderboard(segmentId: string, category: LeaderboardCategory = LeaderboardCategory.OVERALL): Promise<LeaderboardData> {
  return apiFetch(`/leaderboard/${segmentId}?category=${category}`);
}

export interface RacerInfo {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  category: RacerCategory;
  ageGroup: AgeGroup;
  sexCategory: SexCategory;
  registeredAt: string;
}

export interface RacersResponse {
  challengeId: string;
  racers: RacerInfo[];
}

export function getRacers(challengeId?: string): Promise<RacersResponse> {
  const query = challengeId ? `?challengeId=${challengeId}` : '';
  return apiFetch(`/racers${query}`);
}

export interface ChallengeInfo {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  segmentIds: string[];
}

export interface ChallengesResponse {
  active: ChallengeInfo[];
  upcoming: ChallengeInfo[];
  past: ChallengeInfo[];
}

export function getChallenges(): Promise<ChallengesResponse> {
  return apiFetch('/challenges');
}

// ─── Registration ─────────────────────────────────────────────────────────────

export function buildStravaOAuthUrl(
  category: RacerCategory,
  challengeId: string,
): string {
  const state = btoa(JSON.stringify({ category, challengeId }));
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID ?? '',
    redirect_uri: `${absoluteApiUrl()}/auth/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,profile:read_all',
    state,
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

// ─── Admin Login ─────────────────────────────────────────────────────────────

export function buildAdminLoginUrl(): string {
  const state = btoa(JSON.stringify({ intent: 'admin_login' }));
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID ?? '',
    redirect_uri: `${absoluteApiUrl()}/auth/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read',
    state,
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export function adminGetSegments(token: string) {
  return apiFetch('/admin/segments', { headers: authHeaders(token) });
}

export function adminGetRacers(token: string) {
  return apiFetch('/admin/racers', { headers: authHeaders(token) });
}

export function adminCreateChallenge(token: string, body: object) {
  return apiFetch('/admin/challenges', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

export function adminActivateChallenge(token: string, challengeId: string) {
  return apiFetch(`/admin/challenges/${challengeId}/activate`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export function adminAddSegment(token: string, body: object) {
  return apiFetch('/admin/segments', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

export interface StravaSegmentMetadata {
  stravaSegmentId: number;
  name: string;
  distance: number;
  elevationGain: number;
  city?: string;
  state?: string;
  country?: string;
  averageGrade?: number;
  maximumGrade?: number;
  elevationHigh?: number;
  elevationLow?: number;
  climbCategory?: number;
  private?: boolean;
  hazardous?: boolean;
  starCount?: number;
  athleteCount?: number;
  effortCount?: number;
  rawStravaMetadata?: Record<string, unknown>;
}

export function adminGetStravaSegment(token: string, stravaSegmentId: number): Promise<StravaSegmentMetadata> {
  return apiFetch(`/admin/strava/segments/${stravaSegmentId}`, { headers: authHeaders(token) });
}

export function adminGetStarredSegments(token: string): Promise<{ segments: StravaSegmentMetadata[] }> {
  return apiFetch('/admin/strava/segments/starred', { headers: authHeaders(token) });
}

export interface ConnectedAthlete {
  racerId: string;
  stravaAthleteId: number;
  name: string;
  profileImageUrl: string;
  category: string;
  ageGroup: string;
  sexCategory: string;
}

export function adminGetConnectedAthletes(token: string): Promise<{ athletes: ConnectedAthlete[] }> {
  return apiFetch('/admin/connected-athletes', { headers: authHeaders(token) });
}

export function adminDeauthorizeRacer(token: string, racerId: string) {
  return apiFetch(`/admin/racers/${racerId}/deauthorize`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export function adminUpdateRacer(token: string, racerId: string, body: object) {
  return apiFetch(`/admin/racers/${racerId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

export function adminGetChallenges(token: string): Promise<{ challenges: ChallengeInfo[] }> {
  return apiFetch('/admin/challenges', { headers: authHeaders(token) });
}

export function adminDeleteChallenge(token: string, challengeId: string) {
  return apiFetch(`/admin/challenges/${challengeId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export function adminGetAllSegments(token: string): Promise<{ segments: (SegmentInfo & { challengeName: string; challengeId: string })[] }> {
  return apiFetch('/admin/segments/all', { headers: authHeaders(token) });
}

export function adminCleanupConnectedAthletes(token: string) {
  return apiFetch('/admin/connected-athletes/cleanup', {
    method: 'POST',
    headers: authHeaders(token),
  });
}

// ─── Admin Users ──────────────────────────────────────────────────────────────

export interface AdminUser {
  stravaAthleteId: number;
  name: string;
  addedAt: string;
  addedBy: string;
  source: 'config' | 'database';
}

export function adminGetAdmins(token: string): Promise<{ admins: AdminUser[] }> {
  return apiFetch('/admin/admins', { headers: authHeaders(token) });
}

export function adminAddAdmin(token: string, stravaAthleteId: number, name: string) {
  return apiFetch('/admin/admins', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ stravaAthleteId, name }),
  });
}

export function adminRemoveAdmin(token: string, stravaAthleteId: number) {
  return apiFetch(`/admin/admins/${stravaAthleteId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}
