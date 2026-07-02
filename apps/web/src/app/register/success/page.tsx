'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SuccessContent() {
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    if (token) localStorage.setItem('enduro_jwt', token);
  }, [params]);

  return (
    <main style={{ maxWidth: '480px', margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        <span role="img" aria-label="checkmark">✓</span>
      </div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.75rem' }}>You&apos;re registered!</h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '2rem' }}>
        Ride any of the tracked segments on Strava and your best time will automatically appear on the leaderboard.
      </p>
      <Link href="/leaderboard" style={{
        background: 'var(--color-primary)', color: '#fff', padding: '0.85rem 2rem',
        borderRadius: '6px', fontWeight: 700,
      }}>
        View Leaderboard
      </Link>
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
