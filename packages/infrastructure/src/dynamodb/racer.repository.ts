import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Racer, RacerRepository, StravaToken, RacerCategory, AgeGroup } from '@enduro/domain';
import { TABLE_NAME, GSI1, keys } from './table';

export class DynamoDBRacerRepository implements RacerRepository {
  constructor(private readonly client: DynamoDBDocumentClient) {}

  async findById(id: string): Promise<Racer | null> {
    const result = await this.client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.racerProfile(id),
    }));
    if (!result.Item) return null;
    return this.toEntity(result.Item);
  }

  async findByStravaAthleteId(stravaAthleteId: number): Promise<Racer | null> {
    const result = await this.client.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1,
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `STRAVA_ATHLETE#${stravaAthleteId}`,
        ':sk': '#PROFILE',
      },
      Limit: 1,
    }));
    const item = result.Items?.[0];
    return item ? this.toEntity(item) : null;
  }

  async findByChallengeId(challengeId: string): Promise<Racer[]> {
    const result = await this.client.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :et AND challengeId = :cid',
      ExpressionAttributeValues: { ':et': 'RACER', ':cid': challengeId },
    }));
    return (result.Items ?? []).map((item) => this.toEntity(item));
  }

  async save(racer: Racer): Promise<void> {
    const json = racer.toJSON();
    await this.client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...keys.racerProfile(racer.id),
        GSI1PK: `STRAVA_ATHLETE#${racer.stravaAthleteId}`,
        GSI1SK: '#PROFILE',
        entityType: 'RACER',
        ...json,
        registeredAt: json.registeredAt.toISOString(),
        updatedAt: json.updatedAt.toISOString(),
      },
    }));
  }

  async saveToken(token: StravaToken): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...keys.racerToken(token.racerId),
        entityType: 'STRAVA_TOKEN',
        ...token,
      },
    }));
  }

  async findToken(racerId: string): Promise<StravaToken | null> {
    const result = await this.client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.racerToken(racerId),
    }));
    if (!result.Item) return null;
    const item = result.Item;
    return {
      racerId: item['racerId'] as string,
      accessToken: item['accessToken'] as string,
      refreshToken: item['refreshToken'] as string,
      expiresAt: item['expiresAt'] as number,
      scope: item['scope'] as string,
    };
  }

  async delete(id: string): Promise<void> {
    await this.client.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: keys.racerProfile(id),
    }));
  }

  private toEntity(item: Record<string, unknown>): Racer {
    return Racer.create(item['id'] as string, {
      stravaAthleteId: item['stravaAthleteId'] as number,
      firstName: item['firstName'] as string,
      lastName: item['lastName'] as string,
      profileImageUrl: item['profileImageUrl'] as string,
      category: item['category'] as RacerCategory,
      ageGroup: item['ageGroup'] as AgeGroup,
      challengeId: item['challengeId'] as string,
      registeredAt: new Date(item['registeredAt'] as string),
      updatedAt: new Date(item['updatedAt'] as string),
    });
  }
}
