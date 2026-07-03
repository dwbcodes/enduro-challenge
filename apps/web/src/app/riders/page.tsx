'use client';

import { useEffect, useState } from 'react';
import { getRacers, RacerInfo } from '@/lib/api';
import { useEvent } from '@/context';

export default function RidersPage() {
  const { challengeId, challengeName, loading: eventLoading } = useEvent();
  const [racers, setRacers] = useState<RacerInfo[]>([]);
  const [loading, setLoading] = useState(true);

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
        <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          {racers.length} registered {racers.length === 1 ? 'rider' : 'riders'}
        </p>

        {loading && <p style={{ color: 'var(--color-muted)' }}>Loading...</p>}

        {!loading && racers.length === 0 && (
          <p style={{ color: 'var(--color-muted)' }}>No riders registered yet. Be the first!</p>
        )}

        {!loading && racers.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}>
            {racers.map((racer) => (
              <div
                key={racer.id}
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                {racer.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={racer.profileImageUrl}
                    alt=""
                    style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-muted)',
                  }}>
                    {racer.firstName[0]}{racer.lastName[0]}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                    {racer.firstName} {racer.lastName}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.3rem', fontSize: '0.8rem' }}>
                    <span style={{
                      background: racer.category === 'MTB' ? '#2d5a27' : racer.category === 'EBIKE' ? '#4a3b8a' : '#215f6b',
                      color: '#fff',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}>
                      {racer.category}
                    </span>
                    <span style={{
                      background: racer.sexCategory === 'MALE' ? '#245c8c' : '#8a3f65',
                      color: '#fff',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}>
                      {racer.sexCategory}
                    </span>
                    <span style={{
                      background: 'var(--color-border)',
                      color: 'var(--color-muted)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                    }}>
                      {racer.ageGroup}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
