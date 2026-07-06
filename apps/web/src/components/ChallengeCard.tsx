'use client';

import { ChallengeInfo } from '@/lib/api';
import { STRAVA_ACTIVITY_TYPE_LABELS, StravaActivityType } from '@enduro/domain';

export function StatusBadge({ status, startDate, endDate }: { status: string; startDate: string; endDate: string }) {
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
      display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '12px',
      fontSize: '0.72rem', fontWeight: 700, color: '#fff', background: bg,
    }}>
      {label}
    </span>
  );
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function AvatarRow({ challenge }: { challenge: ChallengeInfo }) {
  const isActive = challenge.status === 'ACTIVE' && new Date(challenge.startDate) <= new Date() && new Date(challenge.endDate) >= new Date();
  const avatars = challenge.racerAvatars ?? [];
  const count = challenge.racerCount ?? 0;

  if (count === 0) return null;

  if (isActive && ((challenge.topMen?.length ?? 0) > 0 || (challenge.topWomen?.length ?? 0) > 0)) {
    const men = challenge.topMen ?? [];
    const women = challenge.topWomen ?? [];
    const avatarSize = Math.max(20, Math.min(28, 28 - Math.floor(count / 10)));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {men.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)', width: '12px' }}>M</span>
            <div style={{ display: 'flex' }}>
              {men.map((r, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={r.profileImageUrl} alt="" title={r.name} style={{
                  width: avatarSize, height: avatarSize, borderRadius: '50%',
                  border: '1.5px solid var(--color-surface)', marginLeft: i > 0 ? -6 : 0,
                }} />
              ))}
            </div>
          </div>
        )}
        {women.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)', width: '12px' }}>W</span>
            <div style={{ display: 'flex' }}>
              {women.map((r, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={r.profileImageUrl} alt="" title={r.name} style={{
                  width: avatarSize, height: avatarSize, borderRadius: '50%',
                  border: '1.5px solid var(--color-surface)', marginLeft: i > 0 ? -6 : 0,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (avatars.length === 0) return null;
  const avatarSize = Math.max(20, Math.min(28, 28 - Math.floor(count / 10)));
  const shown = avatars.slice(0, 8);
  const overflow = count - shown.length;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={url} alt="" style={{
          width: avatarSize, height: avatarSize, borderRadius: '50%',
          border: '1.5px solid var(--color-surface)', marginLeft: i > 0 ? -6 : 0,
        }} />
      ))}
      {overflow > 0 && (
        <span style={{
          fontSize: '0.7rem', color: 'var(--color-muted)', marginLeft: '0.35rem',
        }}>
          +{overflow}
        </span>
      )}
    </div>
  );
}

export function ChallengeCard({ challenge, onSelect, starred, onToggleStar, registered, onToggleRegistration }: {
  challenge: ChallengeInfo;
  onSelect: (id: string) => void;
  starred?: boolean;
  onToggleStar?: (id: string) => void;
  registered?: boolean;
  onToggleRegistration?: (id: string, currentlyRegistered: boolean) => void;
}) {
  function handleRegistrationClick(e: React.MouseEvent) {
    e.stopPropagation();
    onToggleRegistration?.(challenge.id, !!registered);
  }

  return (
    <div
      onClick={() => onSelect(challenge.id)}
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${starred ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius)',
        padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
        cursor: 'pointer', transition: 'all 0.2s ease',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
        e.currentTarget.style.borderColor = starred ? 'var(--color-primary)' : '#333';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        e.currentTarget.style.borderColor = starred ? 'var(--color-primary)' : 'var(--color-border)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
          {onToggleStar && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleStar(challenge.id); }}
              title={starred ? 'Unstar' : 'Star this challenge'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: '1.1rem', lineHeight: 1, flexShrink: 0,
                color: starred ? '#eab308' : 'var(--color-border)',
                transition: 'transform 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {starred ? '\u2605' : '\u2606'}
            </button>
          )}
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{challenge.name}</h3>
        </div>
        <StatusBadge status={challenge.status} startDate={challenge.startDate} endDate={challenge.endDate} />
      </div>

      {onToggleRegistration && (
        <button
          onClick={handleRegistrationClick}
          title={registered ? 'Registered' : 'Click to register'}
          style={{
            alignSelf: 'flex-start',
            padding: '0.25rem 0.7rem',
            borderRadius: '12px',
            border: `1.5px solid ${registered ? '#16a34a' : '#dc3545'}`,
            background: registered ? '#16a34a15' : '#dc354515',
            cursor: registered ? 'default' : 'pointer',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: registered ? '#16a34a' : '#dc3545' }}>
            {registered ? 'Registered' : 'Not Registered'}
          </span>
        </button>
      )}
      {challenge.location && (
        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{challenge.location}</div>
      )}
      {challenge.hostedBy && (
        <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Hosted by <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{challenge.hostedBy}</span></div>
      )}
      {challenge.description && (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', margin: 0, lineHeight: 1.4 }}>
          {challenge.description}
        </p>
      )}
      {challenge.activityTypes.length > 0 && (
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {challenge.activityTypes.map((type) => (
            <span key={type} style={{
              background: 'rgba(26, 107, 106, 0.25)', color: '#5ce0de',
              border: '1px solid rgba(26, 107, 106, 0.4)',
              padding: '0.15rem 0.5rem',
              borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600,
            }}>
              {STRAVA_ACTIVITY_TYPE_LABELS[type as StravaActivityType] ?? type}
            </span>
          ))}
        </div>
      )}
      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
        {formatDate(challenge.startDate)} &ndash; {formatDate(challenge.endDate)}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
        {challenge.segmentIds.length} segment{challenge.segmentIds.length !== 1 ? 's' : ''}
        {(challenge.racerCount ?? 0) > 0 && ` · ${challenge.racerCount} rider${challenge.racerCount !== 1 ? 's' : ''}`}
      </div>
      <AvatarRow challenge={challenge} />
    </div>
  );
}

export function ChallengeCardCompact({ challenge, onSelect, starred, onToggleStar, registered, onToggleRegistration }: {
  challenge: ChallengeInfo;
  onSelect: (id: string) => void;
  starred?: boolean;
  onToggleStar?: (id: string) => void;
  registered?: boolean;
  onToggleRegistration?: (id: string, currentlyRegistered: boolean) => void;
}) {
  return (
    <div
      onClick={() => onSelect(challenge.id)}
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${starred ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius)',
        padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem',
        cursor: 'pointer', transition: 'all 0.2s ease',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
        e.currentTarget.style.borderColor = starred ? 'var(--color-primary)' : '#333';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        e.currentTarget.style.borderColor = starred ? 'var(--color-primary)' : 'var(--color-border)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, flex: 1 }}>
          {onToggleStar && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleStar(challenge.id); }}
              title={starred ? 'Unstar' : 'Star this challenge'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: '0.9rem', lineHeight: 1, flexShrink: 0,
                color: starred ? '#eab308' : 'var(--color-border)',
              }}
            >
              {starred ? '\u2605' : '\u2606'}
            </button>
          )}
          <span style={{ fontSize: '0.88rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {challenge.name}
          </span>
        </div>
        <StatusBadge status={challenge.status} startDate={challenge.startDate} endDate={challenge.endDate} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-muted)', flexWrap: 'wrap' }}>
        <span>{formatDate(challenge.startDate)} &ndash; {formatDate(challenge.endDate)}</span>
        {challenge.location && <span>&middot; {challenge.location}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-muted)', flexWrap: 'wrap' }}>
        <span>{challenge.segmentIds.length} segment{challenge.segmentIds.length !== 1 ? 's' : ''}</span>
        {(challenge.racerCount ?? 0) > 0 && <span>&middot; {challenge.racerCount} rider{challenge.racerCount !== 1 ? 's' : ''}</span>}
        {challenge.hostedBy && <span>&middot; by {challenge.hostedBy}</span>}
      </div>
    </div>
  );
}

export function ChallengeSection({ title, challenges, onSelect, isStarred, onToggleStar, isRegistered, onToggleRegistration }: {
  title: string;
  challenges: ChallengeInfo[];
  onSelect: (id: string) => void;
  isStarred?: (id: string) => boolean;
  onToggleStar?: (id: string) => void;
  isRegistered?: (id: string) => boolean;
  onToggleRegistration?: (id: string, currentlyRegistered: boolean) => void;
}) {
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
        {challenges.map((c) => (
          <ChallengeCard
            key={c.id}
            challenge={c}
            onSelect={onSelect}
            starred={isStarred?.(c.id)}
            onToggleStar={onToggleStar}
            registered={isRegistered?.(c.id)}
            onToggleRegistration={onToggleRegistration}
          />
        ))}
      </div>
    </section>
  );
}
