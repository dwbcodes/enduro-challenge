import {
  createDocumentClient,
  DynamoDBChallengeRepository,
  DynamoDBRacerRepository,
  DynamoDBSegmentRepository,
  DynamoDBResultRepository,
  DynamoDBLeaderboardRepository,
  StravaClient,
} from '@enduro/infrastructure';
import {
  RegisterRacerHandler,
  AddSegmentHandler,
  CreateChallengeHandler,
  ProcessActivityHandler,
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

// Strava client — credentials from environment (set via SSM → Lambda env)
export const stravaClient = new StravaClient(
  process.env.STRAVA_CLIENT_ID!,
  process.env.STRAVA_CLIENT_SECRET!,
);

// Application handlers
export const registerRacerHandler = new RegisterRacerHandler(racerRepository);
export const addSegmentHandler = new AddSegmentHandler(segmentRepository, challengeRepository);
export const createChallengeHandler = new CreateChallengeHandler(challengeRepository);
export const processActivityHandler = new ProcessActivityHandler(
  racerRepository,
  segmentRepository,
  resultRepository,
  leaderboardRepository,
);
export const getLeaderboardHandler = new GetLeaderboardHandler(leaderboardRepository);
export const getRacerResultsHandler = new GetRacerResultsHandler(resultRepository);
