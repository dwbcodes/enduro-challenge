import { v4 as uuidv4 } from 'uuid';
import { Racer, RacerRepository, StravaToken } from '@enduro/domain';
import { RegisterRacerCommand } from './register-racer.command';

export class RegisterRacerHandler {
  constructor(private readonly racerRepository: RacerRepository) {}

  async execute(command: RegisterRacerCommand): Promise<string> {
    const existing = await this.racerRepository.findByStravaAthleteId(command.stravaAthleteId);
    const racerId = existing?.id ?? uuidv4();
    const now = new Date();

    const racer = Racer.create(racerId, {
      stravaAthleteId: command.stravaAthleteId,
      firstName: command.firstName,
      lastName: command.lastName,
      profileImageUrl: command.profileImageUrl,
      category: command.category,
      ageGroup: command.ageGroup,
      challengeId: command.challengeId,
      registeredAt: existing?.registeredAt ?? now,
      updatedAt: now,
    });

    await this.racerRepository.save(racer);

    const token: StravaToken = {
      racerId,
      accessToken: command.accessToken,
      refreshToken: command.refreshToken,
      expiresAt: command.tokenExpiresAt,
      scope: command.tokenScope,
    };
    await this.racerRepository.saveToken(token);

    return racerId;
  }
}
