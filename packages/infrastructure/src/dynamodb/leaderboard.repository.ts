import { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Leaderboard, LeaderboardCategory, LeaderboardEntry, LeaderboardRepository } from '@enduro/domain';
import { TABLE_NAME, GSI2, keys } from './table';

export class DynamoDBLeaderboardRepository implements LeaderboardRepository {
  constructor(private readonly client: DynamoDBDocumentClient) {}

  async getLeaderboard(segmentId: string, category: LeaderboardCategory): Promise<Leaderboard | null> {
    // Query GSI2 sorted by elapsedTimeSeconds ascending (fastest first)
    const result = await this.client.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI2,
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: { ':pk': `LEADERBOARD#${segmentId}#${category}` },
      ScanIndexForward: true, // ascending = fastest first
    }));

    const items = result.Items ?? [];
    if (items.length === 0) return null;

    const entries: LeaderboardEntry[] = items.map((item, index) => ({
      rank: index + 1,
      racerId: item['racerId'] as string,
      racerName: item['racerName'] as string,
      profileImageUrl: item['profileImageUrl'] as string,
      category,
      elapsedTimeSeconds: item['elapsedTimeSeconds'] as number,
      achievedAt: new Date(item['achievedAt'] as string),
    }));

    return {
      segmentId,
      segmentName: items[0]['segmentName'] as string ?? '',
      category,
      entries,
      updatedAt: new Date(),
    };
  }

  async upsertEntry(segmentId: string, category: LeaderboardCategory, entry: LeaderboardEntry): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...keys.leaderboardEntry(segmentId, category, entry.racerId),
        GSI2PK: `LEADERBOARD#${segmentId}#${category}`,
        GSI2SK: entry.elapsedTimeSeconds, // Number — DynamoDB sorts numerically
        entityType: 'LEADERBOARD_ENTRY',
        segmentId,
        racerId: entry.racerId,
        racerName: entry.racerName,
        profileImageUrl: entry.profileImageUrl,
        category,
        elapsedTimeSeconds: entry.elapsedTimeSeconds,
        achievedAt: entry.achievedAt.toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  async removeEntry(segmentId: string, category: LeaderboardCategory, racerId: string): Promise<void> {
    await this.client.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: keys.leaderboardEntry(segmentId, category, racerId),
    }));
  }

  async deleteBySegment(segmentId: string): Promise<void> {
    for (const category of Object.values(LeaderboardCategory)) {
      const pk = `LEADERBOARD#${segmentId}#${category}`;
      const result = await this.client.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': pk },
        ProjectionExpression: 'PK, SK',
      }));
      const items = result.Items ?? [];
      if (items.length === 0) continue;

      for (let i = 0; i < items.length; i += 25) {
        const batch = items.slice(i, i + 25);
        await this.client.send(new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: batch.map((item) => ({
              DeleteRequest: { Key: { PK: item['PK'] as string, SK: item['SK'] as string } },
            })),
          },
        }));
      }
    }
  }
}
