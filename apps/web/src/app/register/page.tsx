'use client';

import { useEffect, useState } from 'react';
import { RacerCategory, SexCategory } from '@enduro/domain';
import { buildStravaOAuthUrl, getSegments } from '@/lib/api';

export default function RegisterPage() {
  const [category, setCategory] = useState<RacerCategory>(RacerCategory.MTB);
  const [sexCategory, setSexCategory] = useState<SexCategory>(SexCategory.MALE);
  const [challengeId, setChallengeId] = useState('');

  useEffect(() => {
    getSegments()
      .then((res) => setChallengeId(res.challengeId))
      .catch(console.error);
  }, []);

  function handleRegister() {
    if (!challengeId) return;
    const url = buildStravaOAuthUrl(category, sexCategory, challengeId);
    window.location.href = url;
  }

  return (
    <main style={{ maxWidth: '480px', margin: '4rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>Register</h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '2rem' }}>
        Select your categories, then connect with Strava. Your segment times will be tracked automatically.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
            Bike Category
          </label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {Object.values(RacerCategory).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer',
                  border: category === cat ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: category === cat ? 'rgba(232,82,26,0.1)' : 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
            Sex Category
          </label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {Object.values(SexCategory).map((sex) => (
              <button
                key={sex}
                onClick={() => setSexCategory(sex)}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer',
                  border: sexCategory === sex ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: sexCategory === sex ? 'rgba(232,82,26,0.1)' : 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              >
                {sex}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleRegister}
          disabled={!challengeId}
          style={{
            padding: '0.9rem', background: challengeId ? '#FC4C02' : '#ccc', color: '#fff',
            border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '1rem',
            cursor: challengeId ? 'pointer' : 'default', marginTop: '0.5rem',
          }}
        >
          Connect with Strava
        </button>
      </div>
    </main>
  );
}
