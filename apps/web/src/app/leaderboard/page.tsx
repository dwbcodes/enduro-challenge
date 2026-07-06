'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { LeaderboardCategory, LEADERBOARD_CATEGORY_LABELS } from '@enduro/domain';
import { getLeaderboard, getSegments, SegmentInfo, LeaderboardEntry, LeaderboardData, buildStravaOAuthUrl } from '@/lib/api';
import { useEvent } from '@/context';
import { useChallengePrefs } from '@/hooks/useChallengePrefs';

const SegmentMap = dynamic(() => import('@/components/SegmentMap'), { ssr: false });

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Podium ────────────────────────────────────────────────────────────────────

function PodiumCard({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const isFirst = rank === 1;
  const imgSize = isFirst ? 56 : 40;
  const borderColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
      <div style={{ position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.profileImageUrl}
          alt={entry.racerName}
          style={{
            width: imgSize, height: imgSize, borderRadius: '50%',
            border: `2px solid ${borderColor}`, objectFit: 'cover',
          }}
        />
        <div style={{
          position: 'absolute', bottom: -3, right: -3,
          width: 18, height: 18, borderRadius: '50%',
          background: borderColor, color: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '0.6rem',
        }}>
          {rank}
        </div>
      </div>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.racerName}
      </div>
      <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>
        {formatTime(entry.elapsedTimeSeconds)}
      </div>
    </div>
  );
}

function PodiumRow({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return null;

  const ordered = [entries[1], entries[0], entries[2]].filter(Boolean);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '0.75rem' }}>
      {ordered.map((entry, i) => {
        const rank = [2, 1, 3][i];
        return (
          <div key={entry.racerId} style={{ marginBottom: rank === 1 ? 10 : 0 }}>
            <PodiumCard entry={entry} rank={rank} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Segment Card (overview) ──────────────────────────────────────────────────

function SegmentCard({
  segment,
  topEntries,
  onClick,
}: {
  segment: SegmentInfo;
  topEntries: LeaderboardEntry[];
  onClick: () => void;
}) {
  const polyline = segment.rawStravaMetadata?.map?.polyline;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
        e.currentTarget.style.borderColor = '#333';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        e.currentTarget.style.borderColor = 'var(--color-border)';
      }}
    >
      {polyline && <SegmentMap polyline={polyline} height={200} />}

      <div style={{ padding: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.3rem' }}>{segment.name}</h2>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>
          {(segment.distance / 1000).toFixed(1)} km &middot; {Math.round(segment.elevationGain)} m gain
        </div>

        {topEntries.length > 0 ? (
          <PodiumRow entries={topEntries} />
        ) : (
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', textAlign: 'center' }}>No results yet</p>
        )}

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', transition: 'gap 150ms ease' }}>
            View full leaderboard <span style={{ display: 'inline-block', transition: 'transform 150ms ease' }}>&rarr;</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function SegmentDetail({
  segment,
  onBack,
}: {
  segment: SegmentInfo;
  onBack: () => void;
}) {
  const [category, setCategory] = useState<LeaderboardCategory>(LeaderboardCategory.OVERALL);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const polyline = segment.rawStravaMetadata?.map?.polyline;

  useEffect(() => {
    setLoading(true);
    getLeaderboard(segment.id, category)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [segment.id, category]);

  return (
    <>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: 'var(--color-primary)',
        cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', padding: 0, marginBottom: '1rem',
      }}>
        &larr; All Segments
      </button>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.3rem' }}>{segment.name}</h2>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '1.25rem' }}>
        {(segment.distance / 1000).toFixed(1)} km &middot; {Math.round(segment.elevationGain)} m gain
      </div>

      {polyline && (
        <div style={{ marginBottom: '1.25rem' }}>
          <SegmentMap polyline={polyline} height={260} />
        </div>
      )}

      <div style={{ marginBottom: '1.25rem' }}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as LeaderboardCategory)}
          style={selectStyle}
        >
          {Object.values(LeaderboardCategory).map((cat) => (
            <option key={cat} value={cat}>{LEADERBOARD_CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
      </div>

      {loading && <p style={{ color: 'var(--color-muted)' }}>Loading...</p>}

      {!loading && data && data.entries.length > 0 && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', fontSize: '0.8rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', width: '50px' }}>#</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Rider</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Time</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry, idx) => (
                <tr key={entry.racerId} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: entry.rank <= 3 ? 700 : 400, color: entry.rank <= 3 ? 'var(--color-primary)' : 'var(--color-text)' }}>
                    {entry.rank}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {entry.profileImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.profileImageUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                    )}
                    {entry.racerName}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {formatTime(entry.elapsedTimeSeconds)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                    {new Date(entry.achievedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && data && data.entries.length === 0 && (
        <p style={{ color: 'var(--color-muted)' }}>No results yet for this category.</p>
      )}

      {!loading && !data && <p style={{ color: 'var(--color-muted)' }}>No results yet.</p>}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const { challengeId, challengeName, loading: eventLoading } = useEvent();
  const { isRegistered, removeRegistered } = useChallengePrefs();
  const registered = challengeId ? isRegistered(challengeId) : false;
  const [segments, setSegments] = useState<SegmentInfo[]>([]);
  const [overallLeaderboards, setOverallLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({});
  const [selectedSegment, setSelectedSegment] = useState<SegmentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventLoading) return;
    if (!challengeId) {
      setSegments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSelectedSegment(null);
    getSegments(challengeId)
      .then(async (res) => {
        setSegments(res.segments);

        const results: Record<string, LeaderboardEntry[]> = {};
        await Promise.all(
          res.segments.map(async (seg) => {
            const overall = await getLeaderboard(seg.id, LeaderboardCategory.OVERALL).catch(() => null);
            results[seg.id] = overall?.entries.slice(0, 3) ?? [];
          }),
        );
        setOverallLeaderboards(results);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [challengeId, eventLoading]);

  if (!eventLoading && !challengeId) {
    return (
      <main style={{ padding: '2rem 0' }}>
        <div className="container">
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem' }}>Leaderboard</h1>
          <p style={{ color: 'var(--color-muted)' }}>Select an event to view the leaderboard.</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem 0' }}>
      <div className="container">
        {selectedSegment ? (
          <SegmentDetail segment={selectedSegment} onBack={() => setSelectedSegment(null)} />
        ) : (
          <>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.3rem' }}>Leaderboard</h1>
            {challengeName && (
              <p style={{ color: 'var(--color-muted)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>{challengeName}</p>
            )}

            {challengeId && (
              <div style={{
                background: registered ? '#16a34a11' : '#dc354511',
                border: `1.5px solid ${registered ? '#16a34a44' : '#dc354544'}`,
                borderRadius: '6px',
                padding: '0.75rem 1rem', marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
              }}>
                <span style={{ fontSize: '0.9rem', color: registered ? '#16a34a' : '#dc3545', fontWeight: 600 }}>
                  {registered ? 'You\u2019re registered for this challenge' : 'You\u2019re not registered for this challenge'}
                </span>
                {registered ? (
                  <button
                    onClick={() => removeRegistered(challengeId)}
                    style={{
                      padding: '0.5rem 1.25rem', background: 'none', color: '#dc3545',
                      border: '1.5px solid #dc3545', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Unregister
                  </button>
                ) : (
                  <button
                    onClick={() => { window.location.href = buildStravaOAuthUrl('ALL', challengeId); }}
                    style={{
                      padding: '0.5rem 1.25rem', background: '#FC4C02', color: '#fff',
                      border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Register with Strava
                  </button>
                )}
              </div>
            )}

            {loading && <p style={{ color: 'var(--color-muted)' }}>Loading segments...</p>}

            {!loading && segments.length === 0 && (
              <p style={{ color: 'var(--color-muted)' }}>No segments yet.</p>
            )}

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {segments.map((seg) => (
                <SegmentCard
                  key={seg.id}
                  segment={seg}
                  topEntries={overallLeaderboards[seg.id] ?? []}
                  onClick={() => setSelectedSegment(seg)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '0.6rem 1rem',
  borderRadius: '6px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
};
