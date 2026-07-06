'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  getCreatorPublicProfile,
  CreatorPublicProfile,
  ChallengeInfo,
  updateCreatorStravaApp,
  getCreatorProfile,
  CreatorProfile,
  buildStravaOAuthUrl,
} from '@/lib/api';
import { useEvent } from '@/context';
import { useChallengePrefs } from '@/hooks/useChallengePrefs';
import { ChallengeCard, ChallengeSection } from '@/components/ChallengeCard';

const TOKEN_KEY = 'enduro_creator_token';

function decodeCreatorSlug(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.creatorSlug ?? null;
  } catch {
    return null;
  }
}

export default function CreatorProfilePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { selectEvent } = useEvent();
  const { isStarred, toggleStar, isRegistered, removeRegistered } = useChallengePrefs();

  const slugParam = searchParams.get('slug') ?? searchParams.get('profile');

  const [slug, setSlug] = useState<string | null>(slugParam);
  const [publicProfile, setPublicProfile] = useState<CreatorPublicProfile | null>(null);
  const [challenges, setChallenges] = useState<ChallengeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dashboard state (only for owner)
  const [isOwner, setIsOwner] = useState(false);
  const [creatorDetails, setCreatorDetails] = useState<CreatorProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Strava app form
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Handle token from OAuth redirect or localStorage
  useEffect(() => {
    const urlToken = searchParams.get('token');
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    const activeToken = urlToken ?? storedToken;

    if (urlToken && typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, urlToken);
    }

    // Determine slug from token if not in URL
    let resolvedSlug = slugParam;
    if (!resolvedSlug && activeToken) {
      resolvedSlug = decodeCreatorSlug(activeToken);
    }

    if (resolvedSlug) {
      setSlug(resolvedSlug);
      // Clean URL to just ?slug=xxx
      if (urlToken && typeof window !== 'undefined') {
        window.history.replaceState({}, '', `/c?slug=${encodeURIComponent(resolvedSlug)}`);
      }
    }

    if (activeToken && resolvedSlug) {
      const tokenSlug = decodeCreatorSlug(activeToken);
      if (tokenSlug === resolvedSlug) {
        setToken(activeToken);
        setIsOwner(true);
      }
    }

    if (!resolvedSlug) {
      setLoading(false);
    }
  }, [searchParams, slugParam]);

  // Fetch public profile
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getCreatorPublicProfile(slug)
      .then((res) => {
        setPublicProfile(res.creator);
        setChallenges(res.challenges);
      })
      .catch(() => setError('Creator not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Fetch creator details if owner
  useEffect(() => {
    if (!token || !isOwner) return;
    getCreatorProfile(token)
      .then((res) => setCreatorDetails(res.creator))
      .catch(() => {
        setIsOwner(false);
        setToken(null);
      });
  }, [token, isOwner]);

  const handleSaveStravaApp = useCallback(async () => {
    if (!token || !clientId.trim() || !clientSecret.trim()) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await updateCreatorStravaApp(token, clientId.trim(), clientSecret.trim());
      setSaveSuccess(true);
      setCreatorDetails((prev) => prev ? { ...prev, hasStravaApp: true } : prev);
      setClientId('');
      setClientSecret('');
    } catch {
      setError('Failed to save Strava app credentials');
    } finally {
      setSaving(false);
    }
  }, [token, clientId, clientSecret]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setIsOwner(false);
    setCreatorDetails(null);
  };

  function handleSelectChallenge(id: string) {
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

  if (!slug && !loading) {
    return (
      <main style={{ padding: '2rem 0' }}>
        <div className="container">
          <p style={{ color: 'var(--color-muted)' }}>No creator profile specified.</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main style={{ padding: '2rem 0' }}>
        <div className="container"><p style={{ color: 'var(--color-muted)' }}>Loading...</p></div>
      </main>
    );
  }

  if (error && !publicProfile) {
    return (
      <main style={{ padding: '2rem 0' }}>
        <div className="container"><p style={{ color: '#dc3545' }}>{error}</p></div>
      </main>
    );
  }

  const now = new Date();
  const active = challenges.filter((c) => c.status === 'ACTIVE' && new Date(c.startDate) <= now && new Date(c.endDate) >= now);
  const upcoming = challenges.filter((c) => c.status !== 'COMPLETED' && new Date(c.startDate) > now);
  const past = challenges.filter((c) => c.status === 'COMPLETED' || (c.status === 'ACTIVE' && new Date(c.endDate) < now));

  return (
    <main style={{ padding: '2rem 0' }}>
      <div className="container">
        {/* Creator Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem',
          padding: '1.5rem', background: 'var(--color-surface)', borderRadius: '10px',
          border: '1px solid var(--color-border)',
        }}>
          {publicProfile?.profileImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={publicProfile.profileImageUrl}
              alt={`${publicProfile.firstName} ${publicProfile.lastName}`}
              style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid var(--color-border)' }}
            />
          )}
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
              {publicProfile?.firstName} {publicProfile?.lastName}
            </h1>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
              {challenges.length} challenge{challenges.length !== 1 ? 's' : ''}
            </p>
          </div>
          {isOwner && (
            <button onClick={handleLogout} style={{
              marginLeft: 'auto', background: 'none', border: '1px solid var(--color-border)',
              borderRadius: '6px', padding: '0.4rem 0.8rem', color: 'var(--color-muted)',
              cursor: 'pointer', fontSize: '0.85rem',
            }}>
              Log out
            </button>
          )}
        </div>

        {/* Dashboard Section (owner only) */}
        {isOwner && (
          <div style={{ marginBottom: '2.5rem' }}>
            {error && <p style={{ color: '#dc3545', marginBottom: '1rem' }}>{error}</p>}

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem', marginBottom: '1.5rem',
            }}>
              {/* Strava App Card */}
              <div style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '8px', padding: '1.5rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Strava API App</h2>
                  {creatorDetails?.hasStravaApp && (
                    <span style={{
                      background: '#16a34a', color: '#fff', padding: '0.15rem 0.5rem',
                      borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600,
                    }}>
                      Connected
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder={creatorDetails?.hasStravaApp ? '(saved)' : 'Client ID'}
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px',
                      border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                      color: 'var(--color-text)', fontSize: '0.9rem',
                    }}
                  />
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder={creatorDetails?.hasStravaApp ? '(saved)' : 'Client Secret'}
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px',
                      border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                      color: 'var(--color-text)', fontSize: '0.9rem',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      onClick={handleSaveStravaApp}
                      disabled={saving || !clientId.trim() || !clientSecret.trim()}
                      style={{
                        padding: '0.5rem 1rem', background: 'var(--color-primary)', color: '#fff',
                        border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer',
                        opacity: saving || !clientId.trim() || !clientSecret.trim() ? 0.5 : 1,
                        transition: 'all 150ms ease',
                      }}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    {saveSuccess && <span style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 600 }}>Saved!</span>}
                  </div>
                </div>
              </div>

              {/* Manage Challenges Card */}
              <div style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Manage Challenges</h2>
                  <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                    Create challenges, add segments, and manage leaderboards.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (token && typeof window !== 'undefined') {
                      localStorage.setItem('enduro_admin_token', token);
                    }
                    router.push('/admin');
                  }}
                  style={{
                    padding: '0.5rem 1.25rem', background: 'var(--color-primary)', color: '#fff',
                    border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 150ms ease', alignSelf: 'flex-start',
                  }}
                >
                  Manage Challenges
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Public challenge list */}
        <ChallengeSection title="Active Challenges" challenges={active} onSelect={handleSelectChallenge} isStarred={isStarred} onToggleStar={toggleStar} isRegistered={isRegistered} onToggleRegistration={handleToggleRegistration} />
        <ChallengeSection title="Upcoming" challenges={upcoming} onSelect={handleSelectChallenge} isStarred={isStarred} onToggleStar={toggleStar} isRegistered={isRegistered} onToggleRegistration={handleToggleRegistration} />
        <ChallengeSection title="Past Challenges" challenges={past} onSelect={handleSelectChallenge} isStarred={isStarred} onToggleStar={toggleStar} isRegistered={isRegistered} onToggleRegistration={handleToggleRegistration} />

        {challenges.length === 0 && (
          <p style={{ color: 'var(--color-muted)', textAlign: 'center' }}>No challenges yet.</p>
        )}
      </div>
    </main>
  );
}
