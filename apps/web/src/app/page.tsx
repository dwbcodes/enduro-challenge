'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getChallenges, ChallengeInfo } from '@/lib/api';

function StatusBadge({ status, startDate, endDate }: { status: string; startDate: string; endDate: string }) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  let label: string;
  let bg: string;

  if (status === 'COMPLETED' || (status === 'ACTIVE' && end < now)) {
    label = 'Completed';
    bg = '#6b7280';
  } else if (status === 'ACTIVE' && start <= now && end >= now) {
    label = 'Active';
    bg = '#16a34a';
  } else {
    const days = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    label = days > 0 ? `Starts in ${days}d` : 'Coming Soon';
    bg = '#d97706';
  }

  return (
    <span style={{
      display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '4px',
      fontSize: '0.72rem', fontWeight: 700, color: '#fff', background: bg,
    }}>
      {label}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ChallengeCard({ challenge, isActive }: { challenge: ChallengeInfo; isActive: boolean }) {
  const inner = (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px',
      padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
      cursor: isActive ? 'pointer' : 'default',
      transition: 'border-color 0.15s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{challenge.name}</h3>
        <StatusBadge status={challenge.status} startDate={challenge.startDate} endDate={challenge.endDate} />
      </div>
      {challenge.description && (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', margin: 0, lineHeight: 1.4 }}>
          {challenge.description}
        </p>
      )}
      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
        {formatDate(challenge.startDate)} &ndash; {formatDate(challenge.endDate)}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
        {challenge.segmentIds.length} segment{challenge.segmentIds.length !== 1 ? 's' : ''}
      </div>
    </div>
  );

  if (isActive) {
    return <Link href={`/leaderboard?challengeId=${challenge.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link>;
  }
  return inner;
}

function ChallengeSection({ title, challenges, isActive }: { title: string; challenges: ChallengeInfo[]; isActive: boolean }) {
  if (challenges.length === 0) return null;
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem' }}>{title}</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '1rem',
        maxWidth: 'calc(5 * 240px + 4 * 1rem)',
      }}>
        {challenges.map((c) => <ChallengeCard key={c.id} challenge={c} isActive={isActive} />)}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [data, setData] = useState<{ active: ChallengeInfo[]; upcoming: ChallengeInfo[]; past: ChallengeInfo[] } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getChallenges().then(setData).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load challenges'));
  }, []);

  return (
    <main>
      <header style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>
            SMM ENDURO CHALLENGE
          </span>
          <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/riders">Riders</Link>
            <Link href="/register">Register</Link>
          </nav>
        </div>
      </header>

      <section style={{ textAlign: 'center', padding: '4rem 1.5rem 3rem' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 6vw, 4rem)', fontWeight: 900, lineHeight: 1.1 }}>
          Santa Monica Mountains<br />
          <span style={{ color: 'var(--color-primary)' }}>Enduro Challenge</span>
        </h1>
        <p style={{ marginTop: '1.5rem', fontSize: '1.1rem', color: 'var(--color-muted)', maxWidth: '540px', margin: '1.5rem auto 0' }}>
          Winter challenge. Iconic trails. Your best time on Strava segments — tracked automatically, ranked by category.
        </p>
      </section>

      <section style={{ padding: '2rem 0 4rem' }}>
        <div className="container">
          {error && <p style={{ color: '#dc3545' }}>{error}</p>}
          {!data && !error && <p style={{ color: 'var(--color-muted)' }}>Loading challenges...</p>}
          {data && (
            <>
              <ChallengeSection title="Active Challenges" challenges={data.active} isActive={true} />
              <ChallengeSection title="Upcoming" challenges={data.upcoming} isActive={false} />
              <ChallengeSection title="Past Challenges" challenges={data.past} isActive={false} />
              {data.active.length === 0 && data.upcoming.length === 0 && data.past.length === 0 && (
                <p style={{ color: 'var(--color-muted)', textAlign: 'center' }}>No challenges yet.</p>
              )}
            </>
          )}
        </div>
      </section>

      <section style={{ padding: '3rem 0', borderTop: '1px solid var(--color-border)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          {[
            { label: 'Categories', value: 'MTB + eBike' },
            { label: 'Age Groups', value: '5 divisions' },
            { label: 'Tracking', value: 'Strava auto-sync' },
            { label: 'Season', value: 'Winter' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>{value}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '0.3rem' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
