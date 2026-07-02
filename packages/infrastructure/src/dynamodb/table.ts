import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const TABLE_NAME = process.env.TABLE_NAME ?? 'enduro-challenge';

export const GSI1 = 'GSI1';  // General lookups (racer by stravaId, results by racerId)
export const GSI2 = 'GSI2';  // Sorted leaderboard (numeric sort on elapsedTimeSeconds)

export function createDocumentClient(): DynamoDBDocumentClient {
  const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

/**
 * Single table key patterns
 *
 * Entity           PK                              SK
 * ──────────────── ─────────────────────────────── ───────────────────────────
 * Challenge        CHALLENGE#<id>                  #META
 * Segment          CHALLENGE#<challengeId>          SEGMENT#<id>
 * StravaSegRef     STRAVA_SEG#<stravaSegmentId>     #REF          (lookup index)
 * Racer profile    RACER#<id>                       #PROFILE
 * Racer token      RACER#<id>                       #TOKEN
 * Result           RESULT#<segmentId>               RACER#<racerId>
 * LeaderboardEntry LEADERBOARD#<segId>#<category>   RACER#<racerId>
 *
 * GSI1 — overloaded for reverse lookups
 *   Racer by Strava:  GSI1PK=STRAVA_ATHLETE#<stravaId>  GSI1SK=#PROFILE
 *   Results by racer: GSI1PK=RACER#<racerId>             GSI1SK=RESULT#<segmentId>
 *
 * GSI2 — sorted leaderboard (Number sort key)
 *   Leaderboard:      GSI2PK=LEADERBOARD#<segId>#<cat>  GSI2SK=<elapsedTimeSeconds>
 *
 * Strava leaderboard cache (raw response stored per segment per poll)
 *   StravaCache:       PK=STRAVA_CACHE#<stravaSegmentId>  SK=#LEADERBOARD
 */
export const keys = {
  challenge: (id: string) => ({ PK: `CHALLENGE#${id}`, SK: '#META' }),
  segment: (challengeId: string, segmentId: string) => ({
    PK: `CHALLENGE#${challengeId}`,
    SK: `SEGMENT#${segmentId}`,
  }),
  stravaSegRef: (stravaSegmentId: number) => ({
    PK: `STRAVA_SEG#${stravaSegmentId}`,
    SK: '#REF',
  }),
  racerProfile: (racerId: string) => ({ PK: `RACER#${racerId}`, SK: '#PROFILE' }),
  racerToken: (racerId: string) => ({ PK: `RACER#${racerId}`, SK: '#TOKEN' }),
  result: (segmentId: string, racerId: string) => ({
    PK: `RESULT#${segmentId}`,
    SK: `RACER#${racerId}`,
  }),
  leaderboardEntry: (segmentId: string, category: string, racerId: string) => ({
    PK: `LEADERBOARD#${segmentId}#${category}`,
    SK: `RACER#${racerId}`,
  }),
  stravaCache: (stravaSegmentId: number) => ({
    PK: `STRAVA_CACHE#${stravaSegmentId}`,
    SK: '#LEADERBOARD',
  }),
};
