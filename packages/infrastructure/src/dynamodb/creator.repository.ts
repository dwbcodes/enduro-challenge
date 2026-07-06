import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Creator, CreatorRepository, StravaAppCredentials } from '@enduro/domain';
import { TABLE_NAME, GSI1, keys } from './table';

export class DynamoDBCreatorRepository implements CreatorRepository {
  constructor(private readonly client: DynamoDBDocumentClient) {}

  async findById(id: string): Promise<Creator | null> {
    const result = await this.client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.creator(id),
    }));
    if (!result.Item) return null;
    return this.toEntity(result.Item);
  }

  async findByStravaAthleteId(stravaAthleteId: number): Promise<Creator | null> {
    const result = await this.client.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1,
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `STRAVA_ATHLETE#${stravaAthleteId}`,
        ':sk': 'CREATOR',
      },
    }));
    const item = result.Items?.[0];
    if (!item) return null;
    return this.toEntity(item);
  }

  async findByUsername(username: string): Promise<Creator | null> {
    const refResult = await this.client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.creatorUsername(username),
    }));
    if (!refResult.Item) return null;
    const creatorId = refResult.Item['creatorId'] as string;
    return this.findById(creatorId);
  }

  async save(creator: Creator): Promise<void> {
    const item = {
      ...keys.creator(creator.id),
      entityType: 'CREATOR',
      GSI1PK: `STRAVA_ATHLETE#${creator.stravaAthleteId}`,
      GSI1SK: 'CREATOR',
      id: creator.id,
      stravaAthleteId: creator.stravaAthleteId,
      firstName: creator.firstName,
      lastName: creator.lastName,
      profileImageUrl: creator.profileImageUrl,
      username: creator.username,
      stravaAppClientId: creator.stravaApp?.clientId,
      stravaAppClientSecret: creator.stravaApp?.clientSecret,
      createdAt: creator.createdAt.toISOString(),
      updatedAt: creator.updatedAt.toISOString(),
    };

    if (creator.username) {
      // Check if there's an existing creator with a different username to clean up
      const existing = await this.findById(creator.id);
      const oldUsername = existing?.username;

      const transactItems: { Put?: { TableName: string; Item: Record<string, unknown> }; Delete?: { TableName: string; Key: Record<string, unknown> } }[] = [
        { Put: { TableName: TABLE_NAME, Item: item } },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              ...keys.creatorUsername(creator.username),
              entityType: 'CREATOR_USERNAME_REF',
              creatorId: creator.id,
            },
          },
        },
      ];

      // Delete old username ref if it changed
      if (oldUsername && oldUsername.toLowerCase() !== creator.username.toLowerCase()) {
        transactItems.push({
          Delete: { TableName: TABLE_NAME, Key: keys.creatorUsername(oldUsername) },
        });
      }

      await this.client.send(new TransactWriteCommand({ TransactItems: transactItems }));
    } else {
      await this.client.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    }
  }

  private toEntity(item: Record<string, unknown>): Creator {
    const stravaApp: StravaAppCredentials | undefined =
      item['stravaAppClientId'] && item['stravaAppClientSecret']
        ? { clientId: item['stravaAppClientId'] as string, clientSecret: item['stravaAppClientSecret'] as string }
        : undefined;

    return Creator.create(item['id'] as string, {
      stravaAthleteId: item['stravaAthleteId'] as number,
      firstName: item['firstName'] as string,
      lastName: item['lastName'] as string,
      profileImageUrl: (item['profileImageUrl'] as string) ?? '',
      username: item['username'] as string | undefined,
      stravaApp,
      createdAt: new Date(item['createdAt'] as string),
      updatedAt: new Date(item['updatedAt'] as string),
    });
  }
}
