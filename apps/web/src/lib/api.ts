import { AgeGroup, RacerCategory, LeaderboardCategory } from '@enduro/domain';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
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
}

export interface SegmentsResponse {
  challengeId: string;
  challengeName: string;
  segments: SegmentInfo[];
}

export function getSegments(): Promise<SegmentsResponse> {
  return apiFetch('/segments');
}

export function getLeaderboard(segmentId: string, category: LeaderboardCategory = LeaderboardCategory.OVERALL) {
  return apiFetch(`/leaderboard/${segmentId}?category=${category}`);
}

// ─── Registration ─────────────────────────────────────────────────────────────

export function buildStravaOAuthUrl(
  category: RacerCategory,
  ageGroup: AgeGroup,
  challengeId: string,
): string {
  const state = btoa(JSON.stringify({ category, ageGroup, challengeId }));
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID ?? '',
    redirect_uri: `${API_URL}/auth/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
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
