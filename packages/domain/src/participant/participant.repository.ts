import { Participant } from './participant.entity';

export interface ParticipantToken {
  participantId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (seconds)
  scope: string;
}

export interface ParticipantRepository {
  findById(id: string): Promise<Participant | null>;
  findByEventId(eventId: string): Promise<Participant[]>;
  findByUserId(userId: string): Promise<Participant[]>;
  findByStravaAthleteIdAndEventId(stravaAthleteId: number, eventId: string): Promise<Participant | null>;
  findAllByStravaAthleteId(stravaAthleteId: number): Promise<Participant[]>;
  save(participant: Participant): Promise<void>;
  delete(id: string): Promise<void>;
  saveToken(token: ParticipantToken): Promise<void>;
  findToken(participantId: string): Promise<ParticipantToken | null>;
  deleteToken(participantId: string): Promise<void>;
}
