/**
 * Poll Segments Lambda
 *
 * Triggered hourly by EventBridge. Polls each tracked segment's Strava
 * leaderboard using the admin's token and upserts best times for registered racers.
 * Caches raw Strava responses in DynamoDB — falls back to cache if Strava is down.
 */
import { StravaLeaderboardEntry } from '@enduro/infrastructure';
import {
  stravaClient,
  racerRepository,
  challengeRepository,
  segmentRepository,
  pollSegmentLeaderboardHandler,
  stravaCacheRepository,
} from '../shared/container';
import { config } from '../shared/config';

export async function handler(): Promise<{ statusCode: number; body: string }> {
  const adminAthleteId = config.adminAthleteIds[0];
  if (!adminAthleteId) {
    console.error('No admin athlete ID configured');
    return { statusCode: 500, body: 'No admin athlete ID configured' };
  }

  const adminRacer = await racerRepository.findByStravaAthleteId(adminAthleteId);
  if (!adminRacer) {
    console.error(`Admin racer not found for athlete ID ${adminAthleteId}`);
    return { statusCode: 500, body: 'Admin racer not found' };
  }

  const token = await racerRepository.findToken(adminRacer.id);
  if (!token) {
    console.error(`No token found for admin racer ${adminRacer.id}`);
    return { statusCode: 500, body: 'Admin token not found' };
  }

  let accessToken: string | null = null;
  try {
    accessToken = await stravaClient.getValidAccessToken(
      token.accessToken,
      token.refreshToken,
      token.expiresAt,
      async (refreshed) => {
        await racerRepository.saveToken({
          racerId: adminRacer.id,
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          expiresAt: refreshed.expires_at,
          scope: token.scope,
        });
      },
    );
  } catch (err) {
    console.warn(`Failed to get Strava access token, will use cache: ${err instanceof Error ? err.message : err}`);
  }

  const challenge = await challengeRepository.findActive();
  if (!challenge) {
    console.log('No active challenge found — skipping poll');
    return { statusCode: 200, body: 'No active challenge' };
  }

  const segments = await segmentRepository.findByChallengeId(challenge.id);
  console.log(`Polling ${segments.length} segments for challenge ${challenge.id}`);

  const results: Array<{ segmentId: string; status: string }> = [];

  for (const segment of segments) {
    try {
      let entries: StravaLeaderboardEntry[];
      let source: string;

      if (accessToken) {
        try {
          const leaderboard = await stravaClient.getSegmentLeaderboard(accessToken, segment.stravaSegmentId);
          entries = leaderboard.entries;
          source = 'strava';
          await stravaCacheRepository.saveLeaderboard(segment.stravaSegmentId, entries);
        } catch (stravaErr) {
          console.warn(`Strava fetch failed for segment ${segment.stravaSegmentId}, falling back to cache: ${stravaErr instanceof Error ? stravaErr.message : stravaErr}`);
          const cached = await stravaCacheRepository.getLeaderboard(segment.stravaSegmentId);
          if (!cached) throw new Error('Strava unavailable and no cache exists');
          entries = cached.entries;
          source = `cache (${cached.cachedAt})`;
        }
      } else {
        const cached = await stravaCacheRepository.getLeaderboard(segment.stravaSegmentId);
        if (!cached) {
          results.push({ segmentId: segment.id, status: 'SKIP: No token and no cache' });
          continue;
        }
        entries = cached.entries;
        source = `cache (${cached.cachedAt})`;
      }

      const efforts = entries.map((entry) => ({
        stravaAthleteId: entry.athlete_id,
        elapsedTimeSeconds: entry.elapsed_time,
        stravaEffortId: entry.effort_id,
        achievedAt: entry.start_date,
      }));

      const { processed, updated } = await pollSegmentLeaderboardHandler.execute({
        segmentId: segment.id,
        challengeId: challenge.id,
        efforts,
      });

      const status = `OK [${source}]: ${processed} matched, ${updated} updated`;
      console.log(`Segment ${segment.name} (${segment.stravaSegmentId}): ${status}`);
      results.push({ segmentId: segment.id, status });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Segment ${segment.name} (${segment.stravaSegmentId}) failed: ${message}`);
      results.push({ segmentId: segment.id, status: `ERROR: ${message}` });
    }
  }

  return { statusCode: 200, body: JSON.stringify(results) };
}
