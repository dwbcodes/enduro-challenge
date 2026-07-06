'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getChallenges, ChallengeInfo, CreatorSummary, buildStravaOAuthUrl } from '@/lib/api';
import { useEvent } from '@/context';
import { useChallengePrefs } from '@/hooks/useChallengePrefs';
import { ChallengeCard, ChallengeCardCompact, ChallengeSection } from '@/components/ChallengeCard';
import { STRAVA_ACTIVITY_TYPE_LABELS, StravaActivityType } from '@enduro/domain';

function CreatorCard({ creator }: { creator: CreatorSummary }) {
  const router = useRouter();
  return (
    <div
      onClick={() => router.push(`/c?slug=${encodeURIComponent(creator.slug)}`)}
      style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px',
        padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
        cursor: 'pointer', transition: 'all 0.15s ease',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
      }}
    >
      {creator.profileImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={creator.profileImageUrl}
          alt={creator.name}
          style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--color-border)', flexShrink: 0 }}
        />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {creator.name}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
          {creator.challengeCount} challenge{creator.challengeCount !== 1 ? 's' : ''}
          {creator.totalRacers > 0 && ` · ${creator.totalRacers} rider${creator.totalRacers !== 1 ? 's' : ''}`}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [data, setData] = useState<{ active: ChallengeInfo[]; upcoming: ChallengeInfo[]; past: ChallengeInfo[]; topCreators?: CreatorSummary[] } | null>(null);
  const [error, setError] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const { selectEvent } = useEvent();
  const { isStarred, toggleStar, isRegistered, removeRegistered } = useChallengePrefs();
  const router = useRouter();

  useEffect(() => {
    getChallenges().then(setData).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load challenges'));
  }, []);

  const allActivityTypes = useMemo(() => {
    if (!data) return [];
    const all = [...data.active, ...data.upcoming, ...data.past];
    const counts = new Map<string, number>();
    all.forEach((c) => c.activityTypes.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([type]) => type);
  }, [data]);

  const filterChallenges = (challenges: ChallengeInfo[]): ChallengeInfo[] => {
    return challenges.filter((c) => {
      if (locationSearch) {
        const search = locationSearch.toLowerCase();
        const matchesLocation = c.location?.toLowerCase().includes(search);
        const matchesName = c.name.toLowerCase().includes(search);
        const matchesDescription = c.description?.toLowerCase().includes(search);
        if (!matchesLocation && !matchesName && !matchesDescription) return false;
      }
      if (activityFilter && !c.activityTypes.includes(activityFilter)) return false;
      return true;
    });
  };

  const hasFilters = locationSearch || activityFilter;

  // Featured sections (no filters)
  const topActive = data ? data.active.slice(0, 5) : [];
  const topUpcoming = data ? data.upcoming.slice(0, 10) : [];
  const topCreators = data?.topCreators?.slice(0, 5) ?? [];

  // Filtered "all challenges" section (only shown when searching, or for overflow)
  const filtered = data && hasFilters ? {
    active: filterChallenges(data.active),
    upcoming: filterChallenges(data.upcoming),
    past: filterChallenges(data.past),
  } : null;
  const totalFiltered = filtered ? filtered.active.length + filtered.upcoming.length + filtered.past.length : 0;
  const totalAll = data ? data.active.length + data.upcoming.length + data.past.length : 0;

  function handleSelect(id: string) {
    selectEvent(id);
    router.push('/leaderboard');
  }

  function handleToggleRegistration(id: string, currentlyRegistered: boolean) {
    if (currentlyRegistered) {
      removeRegistered(id);
    } else {
      window.location.href = buildStravaOAuthUrl('ALL', id);
    }
  }

  return (
    <main>
      <section style={{ textAlign: 'center', padding: '4rem 1.5rem 3rem' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 6vw, 4rem)', fontWeight: 900, lineHeight: 1.1 }}>
          Find Your Next<br />
          <span style={{ color: 'var(--color-primary)' }}>Challenge</span>
        </h1>
        <p style={{ marginTop: '1.5rem', fontSize: '1.1rem', color: 'var(--color-muted)', maxWidth: '540px', margin: '1.5rem auto 0' }}>
          Strava-based challenges with automatic segment tracking and leaderboards.
        </p>
      </section>

      {error && (
        <div className="container"><p style={{ color: '#dc3545' }}>{error}</p></div>
      )}
      {!data && !error && (
        <div className="container"><p style={{ color: 'var(--color-muted)' }}>Loading challenges...</p></div>
      )}

      {data && (
        <>
          {/* Top Active Challenges — full-size cards */}
          {topActive.length > 0 && (
            <section style={{ padding: '0 0 2.5rem' }}>
              <div className="container">
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem' }}>Active Challenges</h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '1rem',
                  maxWidth: 'calc(5 * 240px + 4 * 1rem)',
                }}>
                  {topActive.map((c) => (
                    <ChallengeCard
                      key={c.id}
                      challenge={c}
                      onSelect={handleSelect}
                      starred={isStarred(c.id)}
                      onToggleStar={toggleStar}
                      registered={isRegistered(c.id)}
                      onToggleRegistration={handleToggleRegistration}
                    />
                  ))}
                </div>
                {data.active.length > 5 && (
                  <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                    +{data.active.length - 5} more active &mdash; use search below
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Top Creators */}
          {topCreators.length > 0 && (
            <section style={{ padding: '0 0 2.5rem' }}>
              <div className="container">
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem' }}>Top Creators</h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '1rem',
                  maxWidth: 'calc(5 * 220px + 4 * 1rem)',
                }}>
                  {topCreators.map((c) => (
                    <CreatorCard key={c.slug} creator={c} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Top Upcoming — compact half-size cards */}
          {topUpcoming.length > 0 && (
            <section style={{ padding: '0 0 2.5rem' }}>
              <div className="container">
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem' }}>Upcoming</h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '0.75rem',
                  maxWidth: 'calc(5 * 280px + 4 * 0.75rem)',
                }}>
                  {topUpcoming.map((c) => (
                    <ChallengeCardCompact
                      key={c.id}
                      challenge={c}
                      onSelect={handleSelect}
                      starred={isStarred(c.id)}
                      onToggleStar={toggleStar}
                      registered={isRegistered(c.id)}
                      onToggleRegistration={handleToggleRegistration}
                    />
                  ))}
                </div>
                {data.upcoming.length > 10 && (
                  <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                    +{data.upcoming.length - 10} more upcoming &mdash; use search below
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Search & Filter Bar */}
          <section style={{ padding: '0 0 2rem', borderTop: '1px solid var(--color-border)', paddingTop: '2.5rem' }}>
            <div className="container" style={{ maxWidth: '700px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem', textAlign: 'center' }}>All Challenges</h2>
              <div style={{
                display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '8px', padding: '1rem',
              }}>
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder="Search by location or name..."
                  style={{
                    flex: '1 1 250px', padding: '0.5rem 0.75rem', borderRadius: '6px',
                    border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                    color: 'var(--color-text)', fontSize: '0.9rem',
                  }}
                />
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  style={{
                    flex: '0 1 200px', padding: '0.5rem 0.75rem', borderRadius: '6px',
                    border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                    color: 'var(--color-text)', fontSize: '0.9rem',
                  }}
                >
                  <option value="">All activity types</option>
                  {allActivityTypes.map((type) => (
                    <option key={type} value={type}>
                      {STRAVA_ACTIVITY_TYPE_LABELS[type as StravaActivityType] ?? type}
                    </option>
                  ))}
                </select>
                {hasFilters && (
                  <button
                    onClick={() => { setLocationSearch(''); setActivityFilter(''); }}
                    style={{
                      padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)',
                      borderRadius: '6px', background: 'none', color: 'var(--color-muted)',
                      cursor: 'pointer', fontSize: '0.85rem',
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
              {hasFilters && (
                <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'center' }}>
                  Showing {totalFiltered} of {totalAll} challenge{totalAll !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </section>

          {/* Filtered results (shown when searching) */}
          {filtered && (
            <section style={{ padding: '0 0 3rem' }}>
              <div className="container">
                <ChallengeSection title="Active Challenges" challenges={filtered.active} onSelect={handleSelect} isStarred={isStarred} onToggleStar={toggleStar} isRegistered={isRegistered} onToggleRegistration={handleToggleRegistration} />
                <ChallengeSection title="Upcoming" challenges={filtered.upcoming} onSelect={handleSelect} isStarred={isStarred} onToggleStar={toggleStar} isRegistered={isRegistered} onToggleRegistration={handleToggleRegistration} />
                <ChallengeSection title="Past Challenges" challenges={filtered.past} onSelect={handleSelect} isStarred={isStarred} onToggleStar={toggleStar} isRegistered={isRegistered} onToggleRegistration={handleToggleRegistration} />
                {totalFiltered === 0 && (
                  <p style={{ color: 'var(--color-muted)', textAlign: 'center' }}>No challenges match your search.</p>
                )}
              </div>
            </section>
          )}

          {/* Past challenges (shown when not searching, if any exist) */}
          {!hasFilters && data.past.length > 0 && (
            <section style={{ padding: '0 0 3rem' }}>
              <div className="container">
                <ChallengeSection title="Past Challenges" challenges={data.past} onSelect={handleSelect} isStarred={isStarred} onToggleStar={toggleStar} isRegistered={isRegistered} onToggleRegistration={handleToggleRegistration} />
              </div>
            </section>
          )}

          {totalAll === 0 && !hasFilters && (
            <div className="container" style={{ padding: '0 0 3rem' }}>
              <p style={{ color: 'var(--color-muted)', textAlign: 'center' }}>No challenges yet.</p>
            </div>
          )}
        </>
      )}

      <section style={{ padding: '3rem 0', borderTop: '1px solid var(--color-border)' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '540px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Create Your Own Challenge
          </h2>
          <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Set up your own Strava-based challenge. Pick segments, invite riders, and track leaderboards automatically.
          </p>
          <button
            onClick={() => router.push('/creator')}
            style={{
              padding: '0.75rem 2rem', background: 'var(--color-primary)', color: '#fff',
              border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '1rem',
              cursor: 'pointer', transition: 'all 150ms ease',
            }}
          >
            Creator
          </button>
        </div>
      </section>
    </main>
  );
}
