'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEvent } from '@/context';
import { useChallengePrefs } from '@/hooks/useChallengePrefs';

const TOKEN_KEY = 'enduro_creator_token';

function getCreatorLink(): string {
  if (typeof window === 'undefined') return '/creator';
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return '/creator';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.creatorSlug) return `/c?slug=${encodeURIComponent(payload.creatorSlug)}`;
  } catch { /* ignore */ }
  return '/creator';
}

export default function SharedHeader() {
  const pathname = usePathname();
  const { challengeId, challengeName, challenges, selectEvent } = useEvent();
  const { isStarred, isRegistered } = useChallengePrefs();

  const creatorLink = useMemo(() => getCreatorLink(), []);

  if (pathname.startsWith('/admin') || pathname.startsWith('/su')) return null;

  // Group challenges: starred & registered first, then by status
  const starredChallenges = challenges.filter((c) => isStarred(c.id));
  const registeredChallenges = challenges.filter((c) => isRegistered(c.id) && !isStarred(c.id));
  const personalIds = new Set([
    ...starredChallenges.map((c) => c.id),
    ...registeredChallenges.map((c) => c.id),
  ]);
  const remaining = challenges.filter((c) => !personalIds.has(c.id));
  const active = remaining.filter((c) => c.status === 'ACTIVE');
  const upcoming = remaining.filter((c) => c.status === 'UPCOMING');
  const past = remaining.filter((c) => c.status === 'COMPLETED' || (c.status !== 'ACTIVE' && c.status !== 'UPCOMING'));

  return (
    <header style={{
      background: 'rgba(21, 21, 21, 0.8)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-border)',
      padding: '1rem 0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em', textDecoration: 'none', color: 'inherit' }}>
            FITNESS CHALLENGE
          </Link>
          {challengeName && (
            <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', borderLeft: '1px solid var(--color-border)', paddingLeft: '1rem' }}>
              {challengeName}
            </span>
          )}
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
              {starredChallenges.length > 0 && (
                <optgroup label="Starred">
                  {starredChallenges.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              )}
              {registeredChallenges.length > 0 && (
                <optgroup label="Registered">
                  {registeredChallenges.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              )}
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
        </div>
        <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
          <Link href="/" style={{ transition: 'color 150ms ease' }}>Challenges</Link>
          <Link href="/riders" style={{ transition: 'color 150ms ease' }}>Riders</Link>
          <Link href={creatorLink} style={{ transition: 'color 150ms ease' }}>Creator</Link>
          <Link href="/admin" style={{ transition: 'color 150ms ease' }}>Admin</Link>
        </nav>
      </div>
    </header>
  );
}
