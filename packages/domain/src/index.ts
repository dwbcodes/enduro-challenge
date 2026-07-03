// Shared
export * from './shared/entity';
export * from './shared/value-object';
export * from './shared/domain-event';
export * from './shared/auth-context';

// Challenge (legacy — will be replaced by Event)
export * from './challenge/challenge.entity';
export * from './challenge/challenge.repository';

// Racer (legacy — will be replaced by Participant)
export * from './racer/racer.entity';
export * from './racer/racer.repository';
export * from './racer/strava-token';

// Segment
export * from './segment/segment.entity';
export * from './segment/segment.repository';

// Result
export * from './result/result.entity';
export * from './result/result.repository';

// User
export * from './user/user.entity';
export * from './user/user.repository';

// Leaderboard
export * from './leaderboard/leaderboard.entity';
export * from './leaderboard/leaderboard.repository';

// Event (new bounded context)
export * from './event/activity-type';
export * from './event/event-status';
export * from './event/event.entity';
export * from './event/event.repository';

// Participant (new bounded context)
export * from './participant/participant.entity';
export * from './participant/participant.repository';

// Registration (new bounded context)
export * from './registration/registration.entity';
export * from './registration/registration.repository';
