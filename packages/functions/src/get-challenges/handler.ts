import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { Challenge, SexCategory, Creator } from '@enduro/domain';
import { challengeRepository, racerRepository, creatorRepository } from '../shared/container';
import { ok, serverError } from '../shared/response';

interface ChallengeWithRacers {
  id: string;
  name: string;
  description: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  activityTypes: string[];
  segmentIds: string[];
  status: string;
  ownerAthleteId?: number;
  hostedBy?: string;
  ownerProfileImageUrl?: string;
  ownerSlug?: string;
  createdAt: Date;
  updatedAt: Date;
  racerCount: number;
  racerAvatars: string[];
  topMen: { name: string; profileImageUrl: string }[];
  topWomen: { name: string; profileImageUrl: string }[];
}

interface CreatorSummary {
  slug: string;
  name: string;
  profileImageUrl: string;
  challengeCount: number;
  totalRacers: number;
}

export async function handler(_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const challenges = await challengeRepository.findAll();
    const now = new Date();

    // Build a map of ownerAthleteId → creator
    const ownerIds = [...new Set(challenges.map((c) => c.ownerAthleteId).filter(Boolean))] as number[];
    const creatorMap = new Map<number, Creator>();
    await Promise.all(ownerIds.map(async (id) => {
      const creator = await creatorRepository.findByStravaAthleteId(id);
      if (creator) creatorMap.set(id, creator);
    }));

    const enriched: ChallengeWithRacers[] = [];

    for (const c of challenges) {
      const racers = await racerRepository.findByChallengeId(c.id);
      const json = c.toJSON();
      const creator = json.ownerAthleteId ? creatorMap.get(json.ownerAthleteId) : undefined;

      const avatars = racers
        .filter((r) => r.profileImageUrl)
        .map((r) => r.profileImageUrl)
        .slice(0, 20);

      // Top 5 men and women by registration date (most recent first)
      const men = racers.filter((r) => r.sexCategory === SexCategory.MALE);
      const women = racers.filter((r) => r.sexCategory === SexCategory.FEMALE);

      enriched.push({
        ...json,
        hostedBy: creator ? creator.fullName : undefined,
        ownerProfileImageUrl: creator?.profileImageUrl,
        ownerSlug: creator?.slug,
        racerCount: racers.length,
        racerAvatars: avatars,
        topMen: men.slice(0, 5).map((r) => ({ name: r.fullName, profileImageUrl: r.profileImageUrl })),
        topWomen: women.slice(0, 5).map((r) => ({ name: r.fullName, profileImageUrl: r.profileImageUrl })),
      });
    }

    const active: ChallengeWithRacers[] = [];
    const upcoming: ChallengeWithRacers[] = [];
    const past: ChallengeWithRacers[] = [];

    for (const c of enriched) {
      if (c.status === 'COMPLETED' || (c.status === 'ACTIVE' && c.endDate < now)) {
        past.push(c);
      } else if (c.status === 'ACTIVE' && c.startDate <= now && c.endDate >= now) {
        active.push(c);
      } else {
        upcoming.push(c);
      }
    }

    // Sort by racer count (most popular first) within each group
    active.sort((a, b) => b.racerCount - a.racerCount);
    upcoming.sort((a, b) => b.racerCount - a.racerCount);
    past.sort((a, b) => b.racerCount - a.racerCount);

    // Build top creators: aggregate challenge count + total racers per creator
    const creatorStats = new Map<string, { creator: Creator; challengeCount: number; totalRacers: number }>();
    for (const c of enriched) {
      if (!c.ownerAthleteId) continue;
      const creator = creatorMap.get(c.ownerAthleteId);
      if (!creator) continue;
      const key = creator.id;
      const existing = creatorStats.get(key);
      if (existing) {
        existing.challengeCount++;
        existing.totalRacers += c.racerCount;
      } else {
        creatorStats.set(key, { creator, challengeCount: 1, totalRacers: c.racerCount });
      }
    }

    const topCreators: CreatorSummary[] = [...creatorStats.values()]
      .sort((a, b) => b.totalRacers - a.totalRacers || b.challengeCount - a.challengeCount)
      .map((s) => ({
        slug: s.creator.slug,
        name: s.creator.fullName,
        profileImageUrl: s.creator.profileImageUrl,
        challengeCount: s.challengeCount,
        totalRacers: s.totalRacers,
      }));

    return ok({ active, upcoming, past, topCreators });
  } catch (err) {
    return serverError(err);
  }
}
