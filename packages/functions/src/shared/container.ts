import {
  createDocumentClient,
  DynamoDBChallengeRepository,
  DynamoDBRacerRepository,
  DynamoDBSegmentRepository,
  DynamoDBResultRepository,
  DynamoDBLeaderboardRepository,
  DynamoDBUserRepository,
  StravaCacheRepository,
  DynamoDBAdminRepository,
  StravaClient,
} from '@enduro/infrastructure';
import {
  RegisterRacerHandler,
  AddSegmentHandler,
  CreateChallengeHandler,
  ProcessActivityHandler,
  PollSegmentLeaderboardHandler,
  GetLeaderboardHandler,
  GetRacerResultsHandler,
} from '@enduro/application';

// DynamoDB client — instantiated once per Lambda cold start
const docClient = createDocumentClient();

// Repositories
export const challengeRepository = new DynamoDBChallengeRepository(docClient);
export const racerRepository = new DynamoDBRacerRepository(docClient);
export const segmentRepository = new DynamoDBSegmentRepository(docClient);
export const resultRepository = new DynamoDBResultRepository(docClient);
export const leaderboardRepository = new DynamoDBLeaderboardRepository(docClient);
export const userRepository = new DynamoDBUserRepository(docClient);
export const stravaCacheRepository = new StravaCacheRepository(docClient);
export const adminRepository = new DynamoDBAdminRepository(docClient);

// Strava client — credentials parsed from STRAVA_CONFIG JSON env var
import { config } from './config';

export const stravaClient = new StravaClient(
  config.strava.clientId,
  config.strava.clientSecret,
);

// Application handlers
export const registerRacerHandler = new RegisterRacerHandler(racerRepository, userRepository);
export const addSegmentHandler = new AddSegmentHandler(segmentRepository, challengeRepository);
export const createChallengeHandler = new CreateChallengeHandler(challengeRepository);
export const processActivityHandler = new ProcessActivityHandler(
  racerRepository,
  segmentRepository,
  resultRepository,
  leaderboardRepository,
);
export const pollSegmentLeaderboardHandler = new PollSegmentLeaderboardHandler(
  racerRepository,
  resultRepository,
  leaderboardRepository,
);
export const getLeaderboardHandler = new GetLeaderboardHandler(leaderboardRepository);
export const getRacerResultsHandler = new GetRacerResultsHandler(resultRepository);
