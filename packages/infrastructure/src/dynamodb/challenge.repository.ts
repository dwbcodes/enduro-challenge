import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Challenge, ChallengeRepository, StravaActivityType } from '@enduro/domain';
import { TABLE_NAME, keys } from './table';

export class DynamoDBChallengeRepository implements ChallengeRepository {
  constructor(private readonly client: DynamoDBDocumentClient) {}

  async findById(id: string): Promise<Challenge | null> {
    const result = await this.client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.challenge(id),
    }));
    if (!result.Item) return null;
    return this.toEntity(result.Item);
  }

  async findActive(): Promise<Challenge | null> {
    const all = await this.findAll();
    return all.find((c) => c.isActive()) ?? null;
  }

  async findAll(): Promise<Challenge[]> {
    // Scan with filter — challenges are infrequent so scan is acceptable
    const result = await this.client.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk',
      ExpressionAttributeValues: { ':prefix': 'CHALLENGE#', ':sk': '#META' },
    }));
    return (result.Items ?? []).map((item) => this.toEntity(item));
  }

  async findByOwner(ownerAthleteId: number): Promise<Challenge[]> {
    const result = await this.client.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk AND ownerAthleteId = :owner',
      ExpressionAttributeValues: { ':prefix': 'CHALLENGE#', ':sk': '#META', ':owner': ownerAthleteId },
    }));
    return (result.Items ?? []).map((item) => this.toEntity(item));
  }

  async save(challenge: Challenge): Promise<void> {
    const json = challenge.toJSON();
    await this.client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...keys.challenge(challenge.id),
        entityType: 'CHALLENGE',
        ...json,
        startDate: json.startDate.toISOString(),
        endDate: json.endDate.toISOString(),
        createdAt: json.createdAt.toISOString(),
        updatedAt: json.updatedAt.toISOString(),
      },
    }));
  }

  async delete(id: string): Promise<void> {
    await this.client.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: keys.challenge(id),
    }));
  }

  private toEntity(item: Record<string, unknown>): Challenge {
    return Challenge.create(item['id'] as string, {
      name: item['name'] as string,
      description: item['description'] as string,
      location: item['location'] as string | undefined,
      startDate: new Date(item['startDate'] as string),
      endDate: new Date(item['endDate'] as string),
      activityTypes: ((item['activityTypes'] as string[]) ?? []) as StravaActivityType[],
      segmentIds: (item['segmentIds'] as string[]) ?? [],
      status: item['status'] as 'DRAFT' | 'ACTIVE' | 'COMPLETED',
      ownerAthleteId: item['ownerAthleteId'] as number | undefined,
      createdAt: new Date(item['createdAt'] as string),
      updatedAt: new Date(item['updatedAt'] as string),
    });
  }
}
