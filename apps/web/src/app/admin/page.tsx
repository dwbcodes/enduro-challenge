'use client';

import { useEffect, useState } from 'react';
import { adminGetRacers, adminGetSegments, adminCreateChallenge, adminActivateChallenge, adminAddSegment } from '@/lib/api';

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [racers, setRacers] = useState<unknown[]>([]);
  const [segments, setSegments] = useState<unknown[]>([]);
  const [challengeId, setChallengeId] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('enduro_jwt') ?? '';
    setToken(t);
  }, []);

  async function loadData() {
    const [r, s] = await Promise.all([
      adminGetRacers(token) as Promise<{ racers: unknown[] }>,
      adminGetSegments(token) as Promise<{ segments: unknown[] }>,
    ]);
    setRacers(r.racers);
    setSegments(s.segments);
  }

  async function createChallenge() {
    const name = prompt('Challenge name?');
    const startDate = prompt('Start date (YYYY-MM-DD)?');
    const endDate = prompt('End date (YYYY-MM-DD)?');
    const description = prompt('Description?') ?? '';
    if (!name || !startDate || !endDate) return;
    const res = await adminCreateChallenge(token, { name, description, startDate, endDate }) as { id: string };
    setChallengeId(res.id);
    alert(`Created challenge ${res.id}`);
  }

  async function activateChallenge() {
    const id = challengeId || prompt('Challenge ID?');
    if (!id) return;
    await adminActivateChallenge(token, id);
    alert('Activated!');
  }

  async function addSegment() {
    const stravaSegmentId = Number(prompt('Strava Segment ID?'));
    const name = prompt('Segment name?');
    const distance = Number(prompt('Distance (metres)?'));
    const elevationGain = Number(prompt('Elevation gain (metres)?'));
    const challengeIdInput = challengeId || prompt('Challenge ID?');
    if (!stravaSegmentId || !name || !challengeIdInput) return;
    await adminAddSegment(token, { stravaSegmentId, name, distance, elevationGain, challengeId: challengeIdInput });
    alert('Segment added!');
    loadData();
  }

  return (
    <main style={{ padding: '2rem 0' }}>
      <div className="container">
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.5rem' }}>Admin</h1>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <button onClick={createChallenge} style={btnStyle}>Create Challenge</button>
          <button onClick={activateChallenge} style={btnStyle}>Activate Challenge</button>
          <button onClick={addSegment} style={btnStyle}>Add Segment</button>
          <button onClick={loadData} style={{ ...btnStyle, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            Refresh Data
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <section>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Segments ({segments.length})</h2>
            <pre style={{ background: 'var(--color-surface)', padding: '1rem', borderRadius: '6px', fontSize: '0.75rem', overflow: 'auto' }}>
              {JSON.stringify(segments, null, 2)}
            </pre>
          </section>
          <section>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Racers ({racers.length})</h2>
            <pre style={{ background: 'var(--color-surface)', padding: '1rem', borderRadius: '6px', fontSize: '0.75rem', overflow: 'auto' }}>
              {JSON.stringify(racers, null, 2)}
            </pre>
          </section>
        </div>
      </div>
    </main>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '0.65rem 1.25rem',
  background: 'var(--color-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 600,
  cursor: 'pointer',
};
