import { DynamoDBStreamEvent } from 'aws-lambda';
import { racerRepository, stravaClient } from '../shared/container';
import { config } from '../shared/config';

export async function handler(event: DynamoDBStreamEvent): Promise<void> {
  console.log(`Processing ${event.Records.length} DynamoDB stream record(s)`);

  for (const record of event.Records) {
    const image = record.dynamodb?.NewImage;
    const entityType = image?.['entityType']?.S;
    if (!image || entityType !== 'STRAVA_TOKEN') {
      console.log(`Skipping stream record ${record.eventID}: entityType=${entityType ?? 'missing'}`);
      continue;
    }

    const racerId = image['racerId']?.S;
    const accessToken = image['accessToken']?.S;
    if (!racerId || !accessToken) {
      console.warn(`Skipping STRAVA_TOKEN record ${record.eventID}: missing racerId or accessToken`);
      continue;
    }

    const racer = await racerRepository.findById(racerId);
    if (!racer) {
      console.warn(`Deleting token for missing racer ${racerId}`);
      await racerRepository.deleteToken(racerId);
      continue;
    }

    const isAdmin = config.adminAthleteIds.includes(racer.stravaAthleteId);
    if (isAdmin) {
      console.log(`Skipping admin athlete ${racer.stravaAthleteId} (racer ${racer.id}) — keeping token`);
      continue;
    }

    console.log(`Deauthorizing Strava token for racer ${racer.id} / athlete ${racer.stravaAthleteId}`);
    await stravaClient.deauthorize(accessToken);
    await racerRepository.deleteToken(racerId);
    console.log(`Deleted local Strava token for racer ${racer.id} / athlete ${racer.stravaAthleteId}`);
  }
}
