import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { StravaLeaderboardEntry } from '../strava/strava.client';
import { TABLE_NAME, keys } from './table';

export interface CachedLeaderboard {
  entries: StravaLeaderboardEntry[];
  cachedAt: string;
}

export class StravaCacheRepository {
  constructor(private readonly client: DynamoDBDocumentClient) {}

  async saveLeaderboard(stravaSegmentId: number, entries: StravaLeaderboardEntry[]): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...keys.stravaCache(stravaSegmentId),
        entries,
        cachedAt: new Date().toISOString(),
      },
    }));
  }

  async getLeaderboard(stravaSegmentId: number): Promise<CachedLeaderboard | null> {
    const result = await this.client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.stravaCache(stravaSegmentId),
    }));
    if (!result.Item) return null;
    return {
      entries: result.Item['entries'] as StravaLeaderboardEntry[],
      cachedAt: result.Item['cachedAt'] as string,
    };
  }
}
