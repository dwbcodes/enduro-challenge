import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <header style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>
            SMM ENDURO CHALLENGE
          </span>
          <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/register">Register</Link>
          </nav>
        </div>
      </header>

      <section style={{ textAlign: 'center', padding: '6rem 1.5rem 4rem' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 6vw, 4rem)', fontWeight: 900, lineHeight: 1.1 }}>
          Santa Monica Mountains<br />
          <span style={{ color: 'var(--color-primary)' }}>Enduro Challenge</span>
        </h1>
        <p style={{ marginTop: '1.5rem', fontSize: '1.1rem', color: 'var(--color-muted)', maxWidth: '540px', margin: '1.5rem auto 0' }}>
          Winter challenge. Iconic trails. Your best time on Strava segments — tracked automatically, ranked by category.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2.5rem', flexWrap: 'wrap' }}>
          <Link href="/register" style={{
            background: 'var(--color-primary)', color: '#fff', padding: '0.85rem 2rem',
            borderRadius: '6px', fontWeight: 700, fontSize: '1rem',
          }}>
            Register Now
          </Link>
          <Link href="/leaderboard" style={{
            border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '0.85rem 2rem',
            borderRadius: '6px', fontWeight: 600, fontSize: '1rem',
          }}>
            View Leaderboard
          </Link>
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
