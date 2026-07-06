'use client';

import { STRAVA_ACTIVITY_TYPE_LABELS, StravaActivityType } from '@enduro/domain';
import { buildStravaOAuthUrl } from '@/lib/api';
import { useEvent } from '@/context';
import { useChallengePrefs } from '@/hooks/useChallengePrefs';

const MAX_REGISTRATIONS = 10;

export default function RegisterPage() {
  const { challengeId, challengeName, challenge, loading: eventLoading } = useEvent();
  const { registered, isRegistered } = useChallengePrefs();
  const activityTypes: string[] = challenge?.activityTypes ?? [];

  const alreadyRegistered = challengeId ? isRegistered(challengeId) : false;
  const registrationCount = registered.size;
  const atLimit = registrationCount >= MAX_REGISTRATIONS;

  function handleRegister() {
    if (!challengeId) return;
    const url = buildStravaOAuthUrl('ALL', challengeId);
    window.location.href = url;
  }

  if (!eventLoading && !challengeId) {
    return (
      <main style={{ maxWidth: '480px', margin: '4rem auto', padding: '0 1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem' }}>Register</h1>
        <p style={{ color: 'var(--color-muted)' }}>Select an event first to register.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '480px', margin: '4rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>Register</h1>
      {challengeName && (
        <p style={{ color: 'var(--color-primary)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
          {challengeName}
        </p>
      )}

      {alreadyRegistered && (
        <div style={{
          background: '#16a34a22', border: '1px solid #16a34a44', borderRadius: '6px',
          padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#16a34a',
          fontWeight: 600,
        }}>
          You&apos;re already registered for this challenge.
        </div>
      )}

      {registrationCount > 0 && (
        <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Registered for {registrationCount} of {MAX_REGISTRATIONS} max challenges
        </p>
      )}

      <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
        Connect with Strava to join this challenge. Your segment times will be tracked automatically.
      </p>

      {activityTypes.length > 0 && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>Activity types in this challenge:</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {activityTypes.map((type) => (
              <span key={type} style={{
                padding: '0.3rem 0.65rem', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600,
                background: 'rgba(232,82,26,0.1)', color: 'var(--color-primary)',
                border: '1px solid rgba(232,82,26,0.2)',
              }}>
                {STRAVA_ACTIVITY_TYPE_LABELS[type as StravaActivityType] ?? type}
              </span>
            ))}
          </div>
        </div>
      )}

      <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '1.25rem' }}>
        Your age group and sex category are automatically determined from your Strava profile.
      </p>

      {atLimit && !alreadyRegistered ? (
        <div style={{
          background: '#dc354522', border: '1px solid #dc354544', borderRadius: '6px',
          padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#dc3545', fontWeight: 600,
        }}>
          You&apos;ve reached the maximum of {MAX_REGISTRATIONS} challenge registrations.
        </div>
      ) : (
        <button
          onClick={handleRegister}
          disabled={!challengeId}
          style={{
            padding: '0.9rem', width: '100%', background: challengeId ? '#FC4C02' : '#ccc', color: '#fff',
            border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '1rem',
            cursor: challengeId ? 'pointer' : 'default',
          }}
        >
          {alreadyRegistered ? 'Re-register with Strava' : 'Connect with Strava'}
        </button>
      )}
    </main>
  );
}
