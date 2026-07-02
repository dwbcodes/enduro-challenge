'use client';

import { useEffect, useState } from 'react';
import { LeaderboardCategory } from '@enduro/domain';
import { getLeaderboard, getSegments, SegmentInfo } from '@/lib/api';

interface LeaderboardEntry {
  racerId: string;
  rank: number;
  racerName: string;
  profileImageUrl: string;
  elapsedTimeSeconds: number;
  achievedAt: string;
}

interface LeaderboardData {
  segmentName: string;
  category: string;
  entries: LeaderboardEntry[];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function LeaderboardPage() {
  const [segments, setSegments] = useState<SegmentInfo[]>([]);
  const [segmentId, setSegmentId] = useState('');
  const [category, setCategory] = useState<LeaderboardCategory>(LeaderboardCategory.OVERALL);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSegments()
      .then((res) => {
        setSegments(res.segments);
        if (res.segments.length > 0) setSegmentId(res.segments[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!segmentId) return;
    setLoading(true);
    getLeaderboard(segmentId, category)
      .then((d) => setData(d as LeaderboardData))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [segmentId, category]);

  return (
    <main style={{ padding: '2rem 0' }}>
      <div className="container">
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.5rem' }}>Leaderboard</h1>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <select
            value={segmentId}
            onChange={(e) => setSegmentId(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          >
            {segments.map((seg) => <option key={seg.id} value={seg.id}>{seg.name}</option>)}
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as LeaderboardCategory)}
            style={{ padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          >
            {Object.values(LeaderboardCategory).map((cat) => (
              <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {loading && <p style={{ color: 'var(--color-muted)' }}>Loading...</p>}

        {!loading && data && (
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

        {!loading && !data && <p style={{ color: 'var(--color-muted)' }}>No results yet. Be the first to ride!</p>}
      </div>
    </main>
  );
}
