'use client';

import { useEffect, useState } from 'react';
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
  const imgSize = isFirst ? 56 : 40;
  const borderColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
    }}>
      <div style={{ position: 'relative' }}>
        {isFirst && (
          <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
            <CrownComponent size={isFirst ? 26 : 20} />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.profileImageUrl}
          alt={entry.racerName}
          style={{
            width: imgSize, height: imgSize, borderRadius: '50%',
            border: `2px solid ${borderColor}`,
            objectFit: 'cover',
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

function PodiumRow({
  title,
  entries,
  CrownComponent,
}: {
  title: string;
  entries: LeaderboardEntry[];
  CrownComponent: typeof KingCrown | typeof QueenCrown;
}) {
  if (entries.length === 0) return null;

  const ordered = [entries[1], entries[0], entries[2]].filter(Boolean);
  const isKing = CrownComponent === KingCrown;

  return (
    <div>
      <div style={{
        fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.05em', color: isKing ? '#FFD700' : '#C0C0C0',
        marginBottom: '0.5rem', textAlign: 'center',
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '0.75rem' }}>
        {ordered.map((entry, i) => {
          const rank = [2, 1, 3][i];
          return (
            <div key={entry.racerId} style={{ marginBottom: rank === 1 ? 10 : 0 }}>
              <PodiumCard entry={entry} rank={rank} CrownComponent={CrownComponent} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Segment Card (overview) ──────────────────────────────────────────────────

interface SegmentLeaderboards {
  male: LeaderboardEntry[];
  female: LeaderboardEntry[];
}

function SegmentCard({
  segment,
  leaderboards,
  onClick,
}: {
  segment: SegmentInfo;
  leaderboards: SegmentLeaderboards;
  onClick: () => void;
}) {
  const polyline = segment.rawStravaMetadata?.map?.polyline;
  const hasPodiums = leaderboards.male.length > 0 || leaderboards.female.length > 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '10px', overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
    >
      {/* Map */}
      {polyline && <SegmentMap polyline={polyline} height={200} />}

      <div style={{ padding: '1rem' }}>
        {/* Segment name + stats */}
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.3rem' }}>{segment.name}</h2>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>
          {(segment.distance / 1000).toFixed(1)} km &middot; {Math.round(segment.elevationGain)} m gain
        </div>

        {/* Podiums side by side */}
        {hasPodiums ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <PodiumRow title="KOM" entries={leaderboards.male} CrownComponent={KingCrown} />
            <PodiumRow title="QOM" entries={leaderboards.female} CrownComponent={QueenCrown} />
          </div>
        ) : (
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', textAlign: 'center' }}>No results yet</p>
        )}

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600 }}>
            View full leaderboard &rarr;
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
            <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

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
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [segments, setSegments] = useState<SegmentInfo[]>([]);
  const [leaderboards, setLeaderboards] = useState<Record<string, SegmentLeaderboards>>({});
  const [selectedSegment, setSelectedSegment] = useState<SegmentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSegments()
      .then(async (res) => {
        setSegments(res.segments);

        // Fetch male + female top 3 for each segment
        const results: Record<string, SegmentLeaderboards> = {};
        await Promise.all(
          res.segments.map(async (seg) => {
            const [male, female] = await Promise.all([
              getLeaderboard(seg.id, LeaderboardCategory.MALE).catch(() => null),
              getLeaderboard(seg.id, LeaderboardCategory.FEMALE).catch(() => null),
            ]);
            results[seg.id] = {
              male: male?.entries.slice(0, 3) ?? [],
              female: female?.entries.slice(0, 3) ?? [],
            };
          }),
        );
        setLeaderboards(results);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ padding: '2rem 0' }}>
      <div className="container">
        {selectedSegment ? (
          <SegmentDetail segment={selectedSegment} onBack={() => setSelectedSegment(null)} />
        ) : (
          <>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.5rem' }}>Leaderboard</h1>

            {loading && <p style={{ color: 'var(--color-muted)' }}>Loading segments...</p>}

            {!loading && segments.length === 0 && (
              <p style={{ color: 'var(--color-muted)' }}>No segments yet. Be the first to ride!</p>
            )}

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {segments.map((seg) => (
                <SegmentCard
                  key={seg.id}
                  segment={seg}
                  leaderboards={leaderboards[seg.id] ?? { male: [], female: [] }}
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
