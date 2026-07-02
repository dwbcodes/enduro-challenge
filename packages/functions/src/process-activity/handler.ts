/**
 * Process Activity Lambda
 *
 * Triggered by SQS messages from the webhook handler.
 * Fetches activity details from Strava and processes segment efforts.
 */
import { SQSEvent } from 'aws-lambda';
import {
  stravaClient,
  racerRepository,
  processActivityHandler,
} from '../shared/container';
import { StravaToken } from '@enduro/domain';

export async function handler(event: SQSEvent): Promise<void> {
  for (const record of event.Records) {
    const { activityId, stravaAthleteId } = JSON.parse(record.body) as {
      activityId: number;
      stravaAthleteId: number;
    };

    try {
      const racer = await racerRepository.findByStravaAthleteId(stravaAthleteId);
      if (!racer) {
        console.info(`Ignoring activity for unregistered athlete ${stravaAthleteId}`);
        continue;
      }

      const token = await racerRepository.findToken(racer.id);
      if (!token) {
        console.warn(`No token found for racer ${racer.id}`);
        continue;
      }

      const validAccessToken = await stravaClient.getValidAccessToken(
        token.accessToken,
        token.refreshToken,
        token.expiresAt,
        async (refreshed) => {
          const updated: StravaToken = {
            racerId: racer.id,
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token,
            expiresAt: refreshed.expires_at,
            scope: token.scope,
          };
          await racerRepository.saveToken(updated);
        },
      );

      const activity = await stravaClient.getActivity(validAccessToken, activityId);

      await processActivityHandler.execute({
        stravaAthleteId,
        stravaActivityId: activityId,
        segmentEfforts: activity.segment_efforts.map((effort) => ({
          stravaSegmentId: effort.segment.id,
          stravaEffortId: effort.id,
          elapsedTimeSeconds: effort.elapsed_time,
          achievedAt: effort.start_date,
        })),
      });

      console.info(`Processed activity ${activityId} for athlete ${stravaAthleteId}`);
    } catch (err) {
      console.error(`Failed to process activity ${activityId}:`, err);
      throw err; // SQS will retry
    }
  }
}
