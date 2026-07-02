import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Segment, SegmentRepository } from '@enduro/domain';
import { TABLE_NAME, keys } from './table';

export class DynamoDBSegmentRepository implements SegmentRepository {
  constructor(private readonly client: DynamoDBDocumentClient) {}

  async findById(id: string): Promise<Segment | null> {
    // Segment ID alone doesn't give us the challengeId for the PK,
    // so we use the StravaSegRef item to resolve it.
    // In practice callers should use findByStravaSegmentId or provide context.
    // For direct lookup by id, a GSI or ref item is required.
    throw new Error('Use findByStravaSegmentId or findByChallengeId');
  }

  async findByStravaSegmentId(stravaSegmentId: number): Promise<Segment | null> {
    // Fetch the lightweight reference item first
    const ref = await this.client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.stravaSegRef(stravaSegmentId),
    }));
    if (!ref.Item) return null;

    const { segmentId, challengeId } = ref.Item as { segmentId: string; challengeId: string };

    const result = await this.client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.segment(challengeId, segmentId),
    }));
    if (!result.Item) return null;
    return this.toEntity(result.Item);
  }

  async findByChallengeId(challengeId: string): Promise<Segment[]> {
    const result = await this.client.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `CHALLENGE#${challengeId}`,
        ':prefix': 'SEGMENT#',
      },
    }));
    return (result.Items ?? []).map((item) => this.toEntity(item));
  }

  async save(segment: Segment): Promise<void> {
    const json = segment.toJSON();
    await this.client.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              ...keys.segment(segment.challengeId, segment.id),
              entityType: 'SEGMENT',
              ...json,
              createdAt: json.createdAt.toISOString(),
              updatedAt: json.updatedAt.toISOString(),
            },
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              ...keys.stravaSegRef(segment.stravaSegmentId),
              entityType: 'STRAVA_SEG_REF',
              segmentId: segment.id,
              challengeId: segment.challengeId,
            },
          },
        },
      ],
    }));
  }

  async delete(id: string): Promise<void> {
    // Requires challengeId — callers must look up the segment first
    throw new Error('Call deleteWithContext(segmentId, challengeId, stravaSegmentId) instead');
  }

  async deleteWithContext(segmentId: string, challengeId: string, stravaSegmentId: number): Promise<void> {
    await this.client.send(new TransactWriteCommand({
      TransactItems: [
        { Delete: { TableName: TABLE_NAME, Key: keys.segment(challengeId, segmentId) } },
        { Delete: { TableName: TABLE_NAME, Key: keys.stravaSegRef(stravaSegmentId) } },
      ],
    }));
  }

  private toEntity(item: Record<string, unknown>): Segment {
    return Segment.create(item['id'] as string, {
      stravaSegmentId: item['stravaSegmentId'] as number,
      name: item['name'] as string,
      challengeId: item['challengeId'] as string,
      distance: item['distance'] as number,
      elevationGain: item['elevationGain'] as number,
      description: item['description'] as string | undefined,
      createdAt: new Date(item['createdAt'] as string),
      updatedAt: new Date(item['updatedAt'] as string),
    });
  }
}
