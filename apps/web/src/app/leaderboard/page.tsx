'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { LeaderboardCategory } from '@enduro/domain';
import { getLeaderboard, getSegments, SegmentInfo, LeaderboardEntry, LeaderboardData } from '@/lib/api';

const SegmentMap = dynamic(() => import('@/components/SegmentMap'), { ssr: false });

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Crown SVGs ────────────────────────────────────────────────────────────────

function KingCrown({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
      <path d="M2 18h20L19 8l-4 5-3-7-3 7-4-5-3 10z" fill="#FFD700" stroke="#B8860B" strokeWidth="1" />
      <rect x="2" y="18" width="20" height="3" rx="1" fill="#FFD700" stroke="#B8860B" strokeWidth="0.5" />
      <circle cx="5" cy="8" r="1.5" fill="#FFD700" />
      <circle cx="12" cy="4" r="1.5" fill="#FFD700" />
      <circle cx="19" cy="8" r="1.5" fill="#FFD700" />
    </svg>
  );
}

function QueenCrown({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
      <path d="M2 18h20l-2-10-3.5 4-2.5-4L12 12 9.5 8 7.5 12 4 8 2 18z" fill="#C0C0C0" stroke="#8a8a8a" strokeWidth="1" />
      <rect x="2" y="18" width="20" height="3" rx="1" fill="#C0C0C0" stroke="#8a8a8a" strokeWidth="0.5" />
      <circle cx="4" cy="8" r="1.2" fill="#E8E8E8" />
      <circle cx="7.5" cy="8" r="1.2" fill="#E8E8E8" />
      <circle cx="12" cy="6" r="1.5" fill="#E8E8E8" />
      <circle cx="16.5" cy="8" r="1.2" fill="#E8E8E8" />
      <circle cx="20" cy="8" r="1.2" fill="#E8E8E8" />
      <circle cx="12" cy="6" r="1" fill="#FF69B4" />
    </svg>
  );
}

// ─── Podium ────────────────────────────────────────────────────────────────────

function PodiumCard({
  entry,
  rank,
  CrownComponent,
}: {
  entry: LeaderboardEntry;
  rank: number;
  CrownComponent: typeof KingCrown | typeof QueenCrown;
}) {
  const isFirst = rank === 1;
  const imgSize = isFirst ? 72 : 52;
  const borderColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
      flex: isFirst ? '0 0 auto' : '0 0 auto',
    }}>
      <div style={{ position: 'relative' }}>
        {isFirst && (
          <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
            <CrownComponent size={isFirst ? 32 : 24} />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.profileImageUrl}
          alt={entry.racerName}
          style={{
            width: imgSize, height: imgSize, borderRadius: '50%',
            border: `3px solid ${borderColor}`,
            objectFit: 'cover',
          }}
        />
        <div style={{
          position: 'absolute', bottom: -4, right: -4,
          width: 22, height: 22, borderRadius: '50%',
          background: borderColor, color: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '0.7rem',
        }}>
          {rank}
        </div>
      </div>
      <div style={{ fontSize: isFirst ? '0.85rem' : '0.78rem', fontWeight: 700, textAlign: 'center', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.racerName}
      </div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>
        {formatTime(entry.elapsedTimeSeconds)}
      </div>
    </div>
  );
}

function PodiumSection({
  title,
  entries,
  CrownComponent,
}: {
  title: string;
  entries: LeaderboardEntry[];
  CrownComponent: typeof KingCrown | typeof QueenCrown;
}) {
  if (entries.length === 0) return null;

  // Display order: #2, #1, #3 for visual podium effect
  const ordered = [entries[1], entries[0], entries[2]].filter(Boolean);
  const isKing = CrownComponent === KingCrown;

  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: '8px', padding: '1.25rem',
      border: '1px solid var(--color-border)', flex: 1, minWidth: 200,
    }}>
      <h3 style={{
        fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.05em', color: isKing ? '#FFD700' : '#C0C0C0',
        marginBottom: '1rem', textAlign: 'center',
      }}>
        {title}
      </h3>
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '1.25rem',
      }}>
        {ordered.map((entry, i) => {
          const rank = [2, 1, 3][i];
          return (
            <div key={entry.racerId} style={{ marginBottom: rank === 1 ? 16 : 0 }}>
              <PodiumCard entry={entry} rank={rank} CrownComponent={CrownComponent} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [segments, setSegments] = useState<SegmentInfo[]>([]);
  const [segmentId, setSegmentId] = useState('');
  const [category, setCategory] = useState<LeaderboardCategory>(LeaderboardCategory.OVERALL);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [maleTop3, setMaleTop3] = useState<LeaderboardEntry[]>([]);
  const [femaleTop3, setFemaleTop3] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedSegment = useMemo(
    () => segments.find((s) => s.id === segmentId),
    [segments, segmentId],
  );

  const polyline = selectedSegment?.rawStravaMetadata?.map?.polyline;

  useEffect(() => {
    getSegments()
      .then((res) => {
        setSegments(res.segments);
        if (res.segments.length > 0) setSegmentId(res.segments[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Fetch main leaderboard
  useEffect(() => {
    if (!segmentId) return;
    setLoading(true);
    getLeaderboard(segmentId, category)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [segmentId, category]);

  // Fetch MALE + FEMALE top 3 for podium whenever segment changes
  useEffect(() => {
    if (!segmentId) return;
    Promise.all([
      getLeaderboard(segmentId, LeaderboardCategory.MALE).catch(() => null),
      getLeaderboard(segmentId, LeaderboardCategory.FEMALE).catch(() => null),
    ]).then(([male, female]) => {
      setMaleTop3(male?.entries.slice(0, 3) ?? []);
      setFemaleTop3(female?.entries.slice(0, 3) ?? []);
    });
  }, [segmentId]);

  return (
    <main style={{ padding: '2rem 0' }}>
      <div className="container">
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.5rem' }}>Leaderboard</h1>

        {/* Selectors */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <select
            value={segmentId}
            onChange={(e) => setSegmentId(e.target.value)}
            style={selectStyle}
          >
            {segments.map((seg) => <option key={seg.id} value={seg.id}>{seg.name}</option>)}
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as LeaderboardCategory)}
            style={selectStyle}
          >
            {Object.values(LeaderboardCategory).map((cat) => (
              <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {/* Route Map + Podiums */}
        <div style={{ display: 'grid', gridTemplateColumns: polyline ? '1fr 1fr' : '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          {polyline && <SegmentMap polyline={polyline} height={280} />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <PodiumSection title="King of the Mountain" entries={maleTop3} CrownComponent={KingCrown} />
            <PodiumSection title="Queen of the Mountain" entries={femaleTop3} CrownComponent={QueenCrown} />
          </div>
        </div>

        {/* Leaderboard Table */}
        {loading && <p style={{ color: 'var(--color-muted)' }}>Loading...</p>}

        {!loading && data && data.entries.length > 0 && (
          <div style={{ background: 'var(--color-surface)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
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
                {data.entries.map((entry) => (
                  <tr key={entry.racerId} style={{ borderBottom: '1px solid var(--color-border)' }}>
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
          <p style={{ color: 'var(--color-muted)' }}>No results yet for this category. Be the first to ride!</p>
        )}

        {!loading && !data && <p style={{ color: 'var(--color-muted)' }}>No results yet. Be the first to ride!</p>}
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
