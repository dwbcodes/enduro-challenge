import { DynamoDBDocumentClient, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAME, keys } from './table';

export interface AdminRecord {
  stravaAthleteId: number;
  name: string;
  addedAt: string;
  addedBy: string;
}

export class DynamoDBAdminRepository {
  constructor(private readonly client: DynamoDBDocumentClient) {}

  async findAll(): Promise<AdminRecord[]> {
    const result = await this.client.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk',
      ExpressionAttributeValues: { ':prefix': 'ADMIN#', ':sk': '#META' },
    }));
    return (result.Items ?? []).map((item) => ({
      stravaAthleteId: item.stravaAthleteId as number,
      name: item.name as string,
      addedAt: item.addedAt as string,
      addedBy: item.addedBy as string,
    }));
  }

  async add(record: AdminRecord): Promise<void> {
    const key = keys.admin(record.stravaAthleteId);
    await this.client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...key, ...record },
    }));
  }

  async remove(stravaAthleteId: number): Promise<void> {
    const key = keys.admin(stravaAthleteId);
    await this.client.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: key,
    }));
  }

  async isAdmin(stravaAthleteId: number): Promise<boolean> {
    const { GetCommand } = await import('@aws-sdk/lib-dynamodb');
    const key = keys.admin(stravaAthleteId);
    const result = await this.client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: key,
    }));
    return !!result.Item;
  }
}
