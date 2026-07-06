import { v4 as uuidv4 } from 'uuid';
import { Racer, RacerRepository, StravaToken, User, UserRepository } from '@enduro/domain';
import { RegisterRacerCommand } from './register-racer.command';

const MAX_CHALLENGE_REGISTRATIONS = 10;

export class RegisterRacerHandler {
  constructor(
    private readonly racerRepository: RacerRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: RegisterRacerCommand): Promise<string> {
    const now = new Date();

    // Upsert durable user identity
    const existingUser = await this.userRepository.findByStravaAthleteId(command.stravaAthleteId);
    const userId = existingUser?.id ?? uuidv4();
    const user = User.create(userId, {
      stravaAthleteId: command.stravaAthleteId,
      firstName: command.firstName,
      lastName: command.lastName,
      profileImageUrl: command.profileImageUrl,
      profileMediumImageUrl: command.profileMediumImageUrl,
      username: command.username,
      city: command.city,
      state: command.state,
      country: command.country,
      sex: command.sex,
      birthday: command.birthday,
      weight: command.weight,
      ftp: command.ftp,
      measurementPreference: command.measurementPreference,
      datePreference: command.datePreference,
      premium: command.premium,
      summit: command.summit,
      followerCount: command.followerCount,
      friendCount: command.friendCount,
      mutualFriendCount: command.mutualFriendCount,
      athleteType: command.athleteType,
      badgeTypeId: command.badgeTypeId,
      stravaCreatedAt: command.stravaCreatedAt,
      stravaUpdatedAt: command.stravaUpdatedAt,
      bikes: command.bikes,
      shoes: command.shoes,
      rawStravaProfile: command.rawStravaProfile,
      createdAt: existingUser?.createdAt ?? now,
      updatedAt: now,
    });
    await this.userRepository.save(user);

    // Find all existing registrations for this athlete
    const allRacers = await this.racerRepository.findAllByStravaAthleteId(command.stravaAthleteId);
    const existingForChallenge = allRacers.find((r) => r.challengeId === command.challengeId);

    if (!existingForChallenge && allRacers.length >= MAX_CHALLENGE_REGISTRATIONS) {
      throw new Error(`Maximum of ${MAX_CHALLENGE_REGISTRATIONS} challenge registrations reached`);
    }

    // Reuse existing racer ID for this challenge, or create new
    const racerId = existingForChallenge?.id ?? uuidv4();

    const racer = Racer.create(racerId, {
      stravaAthleteId: command.stravaAthleteId,
      firstName: command.firstName,
      lastName: command.lastName,
      profileImageUrl: command.profileImageUrl,
      category: command.category,
      ageGroup: command.ageGroup,
      sexCategory: command.sexCategory,
      challengeId: command.challengeId,
      registeredAt: existingForChallenge?.registeredAt ?? now,
      updatedAt: now,
    });

    await this.racerRepository.save(racer);

    if (command.accessToken && command.refreshToken && command.tokenExpiresAt) {
      // Store token under this racer ID (any racer ID works for token lookup)
      const token: StravaToken = {
        racerId,
        accessToken: command.accessToken,
        refreshToken: command.refreshToken,
        expiresAt: command.tokenExpiresAt,
        scope: command.tokenScope ?? 'read',
      };
      await this.racerRepository.saveToken(token);
    }

    return racerId;
  }
}
