'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { buildCreatorLoginUrl } from '@/lib/api';

const TOKEN_KEY = 'enduro_creator_token';

function decodeCreatorSlug(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.creatorSlug ?? null;
  } catch {
    return null;
  }
}

export default function CreatorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    const activeToken = urlToken ?? storedToken;

    if (urlToken && typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, urlToken);
    }

    if (activeToken) {
      const slug = decodeCreatorSlug(activeToken);
      if (slug) {
        router.replace(`/c?slug=${encodeURIComponent(slug)}`);
        return;
      }
    }

    setLoading(false);
  }, [searchParams, router]);

  if (loading) {
    return (
      <main style={{ padding: '2rem 0' }}>
        <div className="container"><p style={{ color: 'var(--color-muted)' }}>Loading...</p></div>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem 0' }}>
      <div className="container" style={{ maxWidth: '600px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>Challenge Creator</h1>
        <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Create and manage your own Strava-based challenges. Set up segments, track leaderboards,
          and invite riders to compete.
        </p>

        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Getting Started</h2>
          <ol style={{ paddingLeft: '1.2rem', color: 'var(--color-muted)', lineHeight: 1.8 }}>
            <li>Connect your Strava account below</li>
            <li>Create a Strava API application at{' '}
              <a href="https://www.strava.com/settings/api" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--color-primary)' }}>
                strava.com/settings/api
              </a>
            </li>
            <li>Enter your Client ID and Client Secret</li>
            <li>Create challenges and add segments</li>
          </ol>
        </div>

        <a
          href={buildCreatorLoginUrl()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.5rem', background: '#fc4c02', color: '#fff',
            borderRadius: '6px', fontWeight: 700, textDecoration: 'none',
            fontSize: '1rem', transition: 'all 150ms ease',
          }}
        >
          Connect with Strava
        </a>
      </div>
    </main>
  );
}
