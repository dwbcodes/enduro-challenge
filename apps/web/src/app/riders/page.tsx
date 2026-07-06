'use client';

import { useEffect, useState, useMemo } from 'react';
import { getRacers, RacerInfo, ChallengeInfo } from '@/lib/api';
import { useEvent } from '@/context';
import { useChallengePrefs } from '@/hooks/useChallengePrefs';
import { SexCategory } from '@enduro/domain';

function getUserSex(): SexCategory | null {
  if (typeof window === 'undefined') return null;
  const sex = localStorage.getItem('enduro_sex');
  if (sex === 'MALE' || sex === 'FEMALE') return sex as SexCategory;
  return null;
}

function RacerCard({ racer }: { racer: RacerInfo }) {
  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: 'var(--radius)',
      border: '1px solid var(--color-border)', padding: '1rem',
      display: 'flex', alignItems: 'center', gap: '0.85rem',
      boxShadow: 'var(--shadow-card)',
    }}>
      {racer.profileImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={racer.profileImageUrl} alt="" style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          border: '2px solid var(--color-border)',
        }} />
      ) : (
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', fontWeight: 700, color: 'var(--color-muted)',
        }}>
          {racer.firstName[0]}{racer.lastName[0]}
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
          {racer.firstName} {racer.lastName}
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
          <span style={{
            background: racer.category === 'MTB' ? '#2d5a27' : racer.category === 'EBIKE' ? '#4a3b8a' : '#215f6b',
            color: '#fff', padding: '0.1rem 0.45rem', borderRadius: '10px',
            fontSize: '0.7rem', fontWeight: 600,
          }}>
            {racer.category}
          </span>
          <span style={{
            background: 'var(--color-border)', color: 'var(--color-muted)',
            padding: '0.1rem 0.45rem', borderRadius: '10px', fontSize: '0.7rem',
          }}>
            {racer.ageGroup}
          </span>
        </div>
      </div>
    </div>
  );
}

function RacerGrid({ racers, emptyMessage }: { racers: RacerInfo[]; emptyMessage?: string }) {
  if (racers.length === 0) {
    return <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>{emptyMessage ?? 'No riders yet.'}</p>;
  }
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: '0.75rem',
    }}>
      {racers.map((r) => <RacerCard key={r.id} racer={r} />)}
    </div>
  );
}

function SectionHeader({ title, count, color }: { title: string; count: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
      <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{title}</h2>
      <span style={{
        background: color ?? 'var(--color-border)', color: '#fff',
        padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700,
      }}>
        {count}
      </span>
    </div>
  );
}

export default function RidersPage() {
  const { challengeId, challengeName, challenges, loading: eventLoading } = useEvent();
  const { registered, isRegistered } = useChallengePrefs();
  const [racers, setRacers] = useState<RacerInfo[]>([]);
  const [registeredChallengeRacers, setRegisteredChallengeRacers] = useState<Map<string, RacerInfo[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [userSex, setUserSex] = useState<SexCategory | null>(null);

  useEffect(() => {
    setUserSex(getUserSex());
  }, []);

  // Fetch racers for current challenge
  useEffect(() => {
    if (eventLoading) return;
    if (!challengeId) {
      setRacers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getRacers(challengeId)
      .then((res) => setRacers(res.racers))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [challengeId, eventLoading]);

  // Fetch racers for other registered challenges
  useEffect(() => {
    const otherRegistered = [...registered].filter((id) => id !== challengeId);
    if (otherRegistered.length === 0) {
      setRegisteredChallengeRacers(new Map());
      return;
    }
    Promise.all(
      otherRegistered.map(async (id) => {
        const res = await getRacers(id).catch(() => ({ racers: [] as RacerInfo[] }));
        return [id, res.racers] as const;
      }),
    ).then((results) => {
      setRegisteredChallengeRacers(new Map(results));
    });
  }, [registered, challengeId]);

  const men = useMemo(() => racers.filter((r) => r.sexCategory === SexCategory.MALE), [racers]);
  const women = useMemo(() => racers.filter((r) => r.sexCategory === SexCategory.FEMALE), [racers]);

  // Build registered challenge sections filtered by user's sex
  const registeredSections = useMemo(() => {
    if (!userSex) return [];
    const sections: { challenge: ChallengeInfo; racers: RacerInfo[] }[] = [];
    for (const [cId, cRacers] of registeredChallengeRacers) {
      const challenge = challenges.find((c) => c.id === cId);
      if (!challenge) continue;
      const filtered = cRacers.filter((r) => r.sexCategory === userSex);
      if (filtered.length > 0) {
        sections.push({ challenge, racers: filtered });
      }
    }
    return sections;
  }, [registeredChallengeRacers, challenges, userSex]);

  if (!eventLoading && !challengeId) {
    return (
      <main style={{ padding: '2rem 0' }}>
        <div className="container">
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem' }}>Riders</h1>
          <p style={{ color: 'var(--color-muted)' }}>Select an event to view riders.</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem 0' }}>
      <div className="container">
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.3rem' }}>Riders</h1>
        {challengeName && (
          <p style={{ color: 'var(--color-muted)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>{challengeName}</p>
        )}
        <p style={{ color: 'var(--color-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          {racers.length} registered {racers.length === 1 ? 'rider' : 'riders'}
        </p>

        {loading && <p style={{ color: 'var(--color-muted)' }}>Loading...</p>}

        {!loading && racers.length === 0 && (
          <p style={{ color: 'var(--color-muted)' }}>No riders registered yet. Be the first!</p>
        )}

        {!loading && racers.length > 0 && (
          <>
            {/* Top Men */}
            <section style={{ marginBottom: '2.5rem' }}>
              <SectionHeader title="Top Challengers — Men" count={men.length} color="#245c8c" />
              <RacerGrid racers={men} emptyMessage="No male riders registered yet." />
            </section>

            {/* Top Women */}
            <section style={{ marginBottom: '2.5rem' }}>
              <SectionHeader title="Top Challengers — Women" count={women.length} color="#8a3f65" />
              <RacerGrid racers={women} emptyMessage="No female riders registered yet." />
            </section>
          </>
        )}

        {/* Registered Challenges — filtered to user's sex */}
        {registeredSections.length > 0 && (
          <section style={{ borderTop: '1px solid var(--color-border)', paddingTop: '2rem', marginTop: '1rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem' }}>
              My Registered Challenges
              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-muted)', marginLeft: '0.75rem' }}>
                {userSex === SexCategory.MALE ? 'Men' : 'Women'}
              </span>
            </h2>
            {registeredSections.map(({ challenge, racers: cRacers }) => (
              <section key={challenge.id} style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--color-primary)' }}>
                  {challenge.name}
                </h3>
                <RacerGrid racers={cRacers} />
              </section>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
