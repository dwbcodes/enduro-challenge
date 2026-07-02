import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { User, UserRepository } from '@enduro/domain';

export const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME ?? 'enduro-users';
export const USERS_GSI_STRAVA = 'GSI_STRAVA';

export class DynamoDBUserRepository implements UserRepository {
  constructor(private readonly client: DynamoDBDocumentClient) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.client.send(new GetCommand({
      TableName: USERS_TABLE_NAME,
      Key: { PK: id, SK: `STRAVA#${0}` }, // Can't query without stravaId
    }));
    // Fallback: query by PK prefix if SK unknown — use a query instead
    if (!result.Item) {
      const queryResult = await this.client.send(new QueryCommand({
        TableName: USERS_TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': id },
        Limit: 1,
      }));
      const item = queryResult.Items?.[0];
      return item ? this.toEntity(item) : null;
    }
    return this.toEntity(result.Item);
  }

  async findByStravaAthleteId(stravaAthleteId: number): Promise<User | null> {
    const result = await this.client.send(new QueryCommand({
      TableName: USERS_TABLE_NAME,
      IndexName: USERS_GSI_STRAVA,
      KeyConditionExpression: 'GSI_STRAVA_PK = :pk',
      ExpressionAttributeValues: { ':pk': `STRAVA#${stravaAthleteId}` },
      Limit: 1,
    }));
    const item = result.Items?.[0];
    return item ? this.toEntity(item) : null;
  }

  async save(user: User): Promise<void> {
    const json = user.toJSON();
    await this.client.send(new PutCommand({
      TableName: USERS_TABLE_NAME,
      Item: withoutUndefined({
        PK: user.id,
        SK: `STRAVA#${user.stravaAthleteId}`,
        GSI_STRAVA_PK: `STRAVA#${user.stravaAthleteId}`,
        ...json,
        stravaCreatedAt: json.stravaCreatedAt?.toISOString(),
        stravaUpdatedAt: json.stravaUpdatedAt?.toISOString(),
        createdAt: json.createdAt.toISOString(),
        updatedAt: json.updatedAt.toISOString(),
      }),
    }));
  }

  private toEntity(item: Record<string, unknown>): User {
    return User.create(item['id'] as string, {
      stravaAthleteId: item['stravaAthleteId'] as number,
      firstName: item['firstName'] as string,
      lastName: item['lastName'] as string,
      profileImageUrl: item['profileImageUrl'] as string,
      profileMediumImageUrl: item['profileMediumImageUrl'] as string | undefined,
      username: item['username'] as string | undefined,
      city: item['city'] as string | undefined,
      state: item['state'] as string | undefined,
      country: item['country'] as string | undefined,
      sex: item['sex'] as string | undefined,
      birthday: item['birthday'] as string | undefined,
      weight: item['weight'] as number | undefined,
      ftp: item['ftp'] as number | undefined,
      measurementPreference: item['measurementPreference'] as string | undefined,
      datePreference: item['datePreference'] as string | undefined,
      premium: item['premium'] as boolean | undefined,
      summit: item['summit'] as boolean | undefined,
      followerCount: item['followerCount'] as number | undefined,
      friendCount: item['friendCount'] as number | undefined,
      mutualFriendCount: item['mutualFriendCount'] as number | undefined,
      athleteType: item['athleteType'] as number | undefined,
      badgeTypeId: item['badgeTypeId'] as number | undefined,
      stravaCreatedAt: item['stravaCreatedAt'] ? new Date(item['stravaCreatedAt'] as string) : undefined,
      stravaUpdatedAt: item['stravaUpdatedAt'] ? new Date(item['stravaUpdatedAt'] as string) : undefined,
      bikes: item['bikes'] as unknown[] | undefined,
      shoes: item['shoes'] as unknown[] | undefined,
      rawStravaProfile: item['rawStravaProfile'] as Record<string, unknown> | undefined,
      createdAt: new Date(item['createdAt'] as string),
      updatedAt: new Date(item['updatedAt'] as string),
    });
  }
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}
