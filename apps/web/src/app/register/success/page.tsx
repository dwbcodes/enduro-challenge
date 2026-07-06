'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useChallengePrefs } from '@/hooks/useChallengePrefs';
import { useEvent } from '@/context';

function SuccessContent() {
  const params = useSearchParams();
  const { challenges } = useEvent();
  const { addRegistered } = useChallengePrefs();
  const [registeredChallengeId] = useState(() => params.get('challengeId'));

  useEffect(() => {
    const token = params.get('token');
    if (token) localStorage.setItem('enduro_jwt', token);
    const sex = params.get('sex');
    if (sex) localStorage.setItem('enduro_sex', sex);
  }, [params]);

  // Mark the registered challenge without switching the active challenge
  useEffect(() => {
    if (registeredChallengeId) addRegistered(registeredChallengeId);
  }, [registeredChallengeId, addRegistered]);

  const challengeName = challenges.find((c) => c.id === registeredChallengeId)?.name;

  return (
    <main style={{ maxWidth: '480px', margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        <span role="img" aria-label="checkmark">✓</span>
      </div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.75rem' }}>You&apos;re registered!</h1>
      {challengeName && (
        <p style={{ color: 'var(--color-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
          {challengeName}
        </p>
      )}
      <p style={{ color: 'var(--color-muted)', marginBottom: '2rem' }}>
        Ride any of the tracked segments on Strava and your best time will automatically appear on the leaderboard.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/leaderboard" style={{
          background: 'var(--color-primary)', color: '#fff', padding: '0.85rem 2rem',
          borderRadius: '6px', fontWeight: 700,
        }}>
          View Leaderboard
        </Link>
        <Link href="/" style={{
          background: 'var(--color-surface)', color: 'var(--color-text)', padding: '0.85rem 2rem',
          borderRadius: '6px', fontWeight: 700, border: '1px solid var(--color-border)',
        }}>
          Browse Challenges
        </Link>
      </div>
    </main>
  );
}

export default function RegisterSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
