import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Result, ResultRepository } from '@enduro/domain';
import { TABLE_NAME, GSI1, keys } from './table';

export class DynamoDBResultRepository implements ResultRepository {
  constructor(private readonly client: DynamoDBDocumentClient) {}

  async findBySegmentAndRacer(segmentId: string, racerId: string): Promise<Result | null> {
    const result = await this.client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.result(segmentId, racerId),
    }));
    if (!result.Item) return null;
    return this.toEntity(result.Item);
  }

  async findBySegment(segmentId: string): Promise<Result[]> {
    const result = await this.client.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `RESULT#${segmentId}`,
        ':prefix': 'RACER#',
      },
    }));
    return (result.Items ?? []).map((item) => this.toEntity(item));
  }

  async findByRacer(racerId: string): Promise<Result[]> {
    const result = await this.client.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1,
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `RACER#${racerId}`,
        ':prefix': 'RESULT#',
      },
    }));
    return (result.Items ?? []).map((item) => this.toEntity(item));
  }

  async save(result: Result): Promise<void> {
    const json = result.toJSON();
    await this.client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...keys.result(result.segmentId, result.racerId),
        GSI1PK: `RACER#${result.racerId}`,
        GSI1SK: `RESULT#${result.segmentId}`,
        entityType: 'RESULT',
        ...json,
        achievedAt: json.achievedAt.toISOString(),
        updatedAt: json.updatedAt.toISOString(),
      },
    }));
  }

  async delete(segmentId: string, racerId: string): Promise<void> {
    await this.client.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: keys.result(segmentId, racerId),
    }));
  }

  private toEntity(item: Record<string, unknown>): Result {
    return Result.create(item['id'] as string, {
      segmentId: item['segmentId'] as string,
      racerId: item['racerId'] as string,
      challengeId: item['challengeId'] as string,
      elapsedTimeSeconds: item['elapsedTimeSeconds'] as number,
      stravaEffortId: item['stravaEffortId'] as number,
      achievedAt: new Date(item['achievedAt'] as string),
      updatedAt: new Date(item['updatedAt'] as string),
    });
  }
}
