'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEvent } from '@/context';

export default function SharedHeader() {
  const pathname = usePathname();
  const { challengeId, challengeName, challenges, selectEvent } = useEvent();

  if (pathname.startsWith('/admin')) return null;

  // Group challenges by status for the dropdown
  const active = challenges.filter((c) => c.status === 'ACTIVE');
  const upcoming = challenges.filter((c) => c.status === 'UPCOMING');
  const past = challenges.filter((c) => c.status === 'COMPLETED' || (c.status !== 'ACTIVE' && c.status !== 'UPCOMING'));

  return (
    <header style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '1rem 0' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em', textDecoration: 'none', color: 'inherit' }}>
            SMM ENDURO CHALLENGE
          </Link>
          {challenges.length > 1 && (
            <select
              value={challengeId ?? ''}
              onChange={(e) => e.target.value && selectEvent(e.target.value)}
              style={{
                padding: '0.35rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: '0.8rem',
                maxWidth: '200px',
              }}
            >
              {!challengeId && <option value="">Select event...</option>}
              {active.length > 0 && (
                <optgroup label="Active">
                  {active.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              )}
              {upcoming.length > 0 && (
                <optgroup label="Upcoming">
                  {upcoming.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              )}
              {past.length > 0 && (
                <optgroup label="Past">
                  {past.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              )}
            </select>
          )}
          {challenges.length <= 1 && challengeName && (
            <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{challengeName}</span>
          )}
        </div>
        <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/riders">Riders</Link>
          <Link href="/register">Register</Link>
        </nav>
      </div>
    </header>
  );
}
