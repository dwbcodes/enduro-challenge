'use client';

import { Suspense, useEffect, useState } from 'react';
import { AgeGroup, RacerCategory, SexCategory, StravaActivityType, STRAVA_ACTIVITY_TYPE_LABELS, LEADERBOARD_CATEGORY_LABELS } from '@enduro/domain';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  adminGetRacers, adminGetSegments, adminCreateChallenge, adminActivateChallenge, adminAddSegment,
  adminGetConnectedAthletes, adminDeauthorizeRacer, ConnectedAthlete,
  adminGetStravaSegment, adminCleanupConnectedAthletes, adminUpdateRacer,
  adminGetChallenges, adminDeleteChallenge, adminGetAllSegments, adminGetStarredSegments,
  adminGetAdmins, adminAddAdmin, adminRemoveAdmin, AdminUser,
  buildAdminLoginUrl, buildCreatorLoginUrl, ChallengeInfo, SegmentInfo, StravaSegmentMetadata,
} from '@/lib/api';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type OpenApiOperation = {
  summary?: string;
  tags?: string[];
  requestBody?: {
    required?: boolean;
  };
};

type OpenApiMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

const OPENAPI_METHODS: OpenApiMethod[] = ['get', 'post', 'put', 'patch', 'delete'];

type AdminRacer = {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  category: RacerCategory;
  ageGroup: AgeGroup;
  sexCategory: SexCategory;
};

function AdminContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [racers, setRacers] = useState<AdminRacer[]>([]);
  const [segments, setSegments] = useState<unknown[]>([]);
  const [connectedAthletes, setConnectedAthletes] = useState<ConnectedAthlete[]>([]);
  const [deauthorizing, setDeauthorizing] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'create' | 'activate' | 'segment' | 'admins' | 'docs' | null>(null);
  const showCreateForm = activePanel === 'create';
  const showActivateList = activePanel === 'activate';
  const showAddSegment = activePanel === 'segment';
  const showAdmins = activePanel === 'admins';
  const showDocs = activePanel === 'docs';
  const [openApiJson, setOpenApiJson] = useState('');
  const [openApiEndpoints, setOpenApiEndpoints] = useState<Array<{
    method: string;
    path: string;
    summary: string;
    tag: string;
    requestBodyRequired: boolean;
  }>>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<{
    method: string;
    path: string;
    summary: string;
    tag: string;
    requestBodyRequired: boolean;
  } | null>(null);
  const [endpointParams, setEndpointParams] = useState<Record<string, string>>({});
  const [endpointBody, setEndpointBody] = useState('{\n  \n}');
  const [endpointStatus, setEndpointStatus] = useState('');
  const [endpointResponse, setEndpointResponse] = useState('');
  const [endpointRunning, setEndpointRunning] = useState(false);

  // Create Challenge form state
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createLocation, setCreateLocation] = useState('');
  const [createStartDate, setCreateStartDate] = useState('');
  const [createEndDate, setCreateEndDate] = useState('');
  const [createActivityTypes, setCreateActivityTypes] = useState<StravaActivityType[]>([StravaActivityType.RIDE]);
  const [createStatus, setCreateStatus] = useState('');

  // Activate Challenge state
  const [draftChallenges, setDraftChallenges] = useState<ChallengeInfo[]>([]);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  // Challenges list for management
  const [challenges, setChallenges] = useState<ChallengeInfo[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add Segment state
  const [segmentMode, setSegmentMode] = useState<'new' | 'reuse' | 'starred'>('new');
  const [newStravaId, setNewStravaId] = useState('');
  const [segmentChallengeId, setSegmentChallengeId] = useState('');
  const [allSegments, setAllSegments] = useState<(SegmentInfo & { challengeName: string; challengeId: string })[]>([]);
  const [reuseSegmentId, setReuseSegmentId] = useState('');
  const [addSegmentStatus, setAddSegmentStatus] = useState('');
  const [starredSegments, setStarredSegments] = useState<StravaSegmentMetadata[]>([]);
  const [starredLoading, setStarredLoading] = useState(false);
  const [importingStarred, setImportingStarred] = useState<number | null>(null);

  // Admin users state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newAdminAthleteId, setNewAdminAthleteId] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [adminStatus, setAdminStatus] = useState('');
  const [removingAdmin, setRemovingAdmin] = useState<number | null>(null);

  // Challenge scope for admin views
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');

  useEffect(() => {
    const urlToken = searchParams.get('token');
    const error = searchParams.get('error');
    if (urlToken) {
      localStorage.setItem('enduro_jwt', urlToken);
      setToken(urlToken);
      router.replace('/admin');
    } else if (error) {
      setLoginError(error === 'unauthorized' ? 'Your Strava account is not authorized as an admin.' : error);
      router.replace('/admin');
    } else {
      const stored = localStorage.getItem('enduro_jwt') ?? '';
      setToken(stored);
    }
    setReady(true);
  }, [searchParams, router]);

  useEffect(() => {
    if (!showDocs || openApiJson) return;
    fetch('/admin/openapi.json')
      .then((res) => {
        if (!res.ok) throw new Error(`OpenAPI fetch failed: ${res.status}`);
        return res.json();
      })
      .then((spec: { paths: Record<string, Record<string, OpenApiOperation>> }) => {
        const endpoints = Object.entries(spec.paths).flatMap(([path, operations]) => (
          OPENAPI_METHODS.flatMap((method) => {
            const operation = operations[method];
            if (!operation) return [];
            return [{
              method: method.toUpperCase(),
              path,
              summary: operation.summary ?? '',
              tag: operation.tags?.[0] ?? 'API',
              requestBodyRequired: Boolean(operation.requestBody?.required),
            }];
          })
        ));
        setOpenApiJson(JSON.stringify(spec, null, 2));
        setOpenApiEndpoints(endpoints);
        setSelectedEndpoint((current) => current ?? endpoints[0] ?? null);
      })
      .catch((err) => {
        setOpenApiJson(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to load OpenAPI spec' }, null, 2));
      });
  }, [showDocs, openApiJson]);

  async function loadData(challengeIdOverride?: string) {
    const scopeId = challengeIdOverride ?? selectedChallengeId;
    const [r, s, c, ch] = await Promise.all([
      adminGetRacers(token, scopeId || undefined) as Promise<{ racers: AdminRacer[] }>,
      adminGetSegments(token, scopeId || undefined) as Promise<{ segments: unknown[] }>,
      adminGetConnectedAthletes(token),
      adminGetChallenges(token),
    ]);
    setRacers(r.racers);
    setSegments(s.segments);
    setConnectedAthletes(c.athletes);
    setChallenges(ch.challenges);
    // Auto-select first challenge if none selected
    if (!scopeId && ch.challenges.length > 0) {
      const active = ch.challenges.find((c) => c.status === 'ACTIVE');
      const first = active ?? ch.challenges[0];
      setSelectedChallengeId(first.id);
    }
  }

  async function handleDeauthorize(athlete: ConnectedAthlete) {
    if (!confirm(`Deauthorize ${athlete.name} (Strava ID ${athlete.stravaAthleteId})? This will revoke their Strava connection.`)) return;
    setDeauthorizing(athlete.racerId);
    try {
      await adminDeauthorizeRacer(token, athlete.racerId);
      setConnectedAthletes((prev) => prev.filter((a) => a.racerId !== athlete.racerId));
    } catch (err) {
      alert(`Failed to deauthorize: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeauthorizing(null);
    }
  }

  async function cleanupConnectedAthletes() {
    if (!confirm('Remove all stored Strava connections, including admin connections?')) return;
    await adminCleanupConnectedAthletes(token);
    await loadData();
  }

  async function editRacer(racer: AdminRacer) {
    const categoryInput = prompt(`Bike category (${Object.values(RacerCategory).join(', ')})?`, racer.category);
    if (!categoryInput) return;
    const category = categoryInput.trim().toUpperCase() as RacerCategory;
    if (!Object.values(RacerCategory).includes(category)) {
      alert(`Invalid bike category. Use ${Object.values(RacerCategory).join(', ')}`);
      return;
    }

    const sexInput = prompt(`Sex category (${Object.values(SexCategory).join(', ')})?`, racer.sexCategory);
    if (!sexInput) return;
    const sexCategory = sexInput.trim().toUpperCase() as SexCategory;
    if (!Object.values(SexCategory).includes(sexCategory)) {
      alert(`Invalid sex category. Use ${Object.values(SexCategory).join(', ')}`);
      return;
    }

    const ageInput = prompt(`Age group (${Object.values(AgeGroup).join(', ')})?`, racer.ageGroup);
    if (!ageInput) return;
    const ageGroup = ageInput.trim() as AgeGroup;
    if (!Object.values(AgeGroup).includes(ageGroup)) {
      alert(`Invalid age group. Use ${Object.values(AgeGroup).join(', ')}`);
      return;
    }

    await adminUpdateRacer(token, racer.id, { category, sexCategory, ageGroup });
    await loadData();
  }

  async function handleCreateChallenge(e: React.FormEvent) {
    e.preventDefault();
    setCreateStatus('');
    try {
      const res = await adminCreateChallenge(token, {
        name: createName,
        description: createDescription,
        location: createLocation || undefined,
        startDate: createStartDate,
        endDate: createEndDate,
        activityTypes: createActivityTypes,
      }) as { id: string };
      setCreateStatus(`Created challenge ${res.id}`);
      setCreateName('');
      setCreateDescription('');
      setCreateLocation('');
      setCreateStartDate('');
      setCreateEndDate('');
      setCreateActivityTypes([StravaActivityType.RIDE]);
      await loadData();
    } catch (err) {
      setCreateStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function handleShowActivate() {
    setActivePanel('activate');
    const res = await adminGetChallenges(token);
    setDraftChallenges(res.challenges.filter((c) => c.status === 'DRAFT'));
  }

  async function handleActivate(id: string) {
    setActivatingId(id);
    try {
      await adminActivateChallenge(token, id);
      setDraftChallenges((prev) => prev.filter((c) => c.id !== id));
      await loadData();
    } catch (err) {
      alert(`Failed to activate: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActivatingId(null);
    }
  }

  async function handleDeleteChallenge(challenge: ChallengeInfo) {
    if (!confirm(`Delete "${challenge.name}"? This will permanently remove the challenge and all its segments, results, and leaderboard entries.`)) return;
    setDeletingId(challenge.id);
    try {
      await adminDeleteChallenge(token, challenge.id);
      await loadData();
    } catch (err) {
      alert(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleShowAddSegment() {
    setActivePanel('segment');
    setAddSegmentStatus('');
    const [chRes, segRes] = await Promise.all([
      adminGetChallenges(token),
      adminGetAllSegments(token),
    ]);
    setChallenges(chRes.challenges);
    setAllSegments(segRes.segments);
    if (chRes.challenges.length > 0 && !segmentChallengeId) {
      setSegmentChallengeId(chRes.challenges[0].id);
    }
  }

  async function handleAddNewSegment(e: React.FormEvent) {
    e.preventDefault();
    setAddSegmentStatus('');
    const stravaSegmentId = extractStravaSegmentId(newStravaId);
    if (!stravaSegmentId) {
      setAddSegmentStatus('Invalid Strava segment URL or ID');
      return;
    }
    if (!segmentChallengeId) {
      setAddSegmentStatus('Select a challenge first');
      return;
    }

    try {
      setAddSegmentStatus('Fetching segment metadata from Strava...');
      const metadata = await adminGetStravaSegment(token, stravaSegmentId);
      const confirmed = confirm([
        `Add Strava segment ${metadata.stravaSegmentId}?`,
        '',
        `Name: ${metadata.name}`,
        `Distance: ${Math.round(metadata.distance)} m`,
        `Elevation gain: ${Math.round(metadata.elevationGain)} m`,
        `Location: ${[metadata.city, metadata.state, metadata.country].filter(Boolean).join(', ') || 'Unknown'}`,
        `Average grade: ${metadata.averageGrade ?? 'Unknown'}`,
        `Max grade: ${metadata.maximumGrade ?? 'Unknown'}`,
      ].join('\n'));
      if (!confirmed) {
        setAddSegmentStatus('');
        return;
      }

      await adminAddSegment(token, { ...metadata, challengeId: segmentChallengeId });
      setAddSegmentStatus('Segment added successfully!');
      setNewStravaId('');
      await loadData();
    } catch (err) {
      setAddSegmentStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function handleReuseSegment(e: React.FormEvent) {
    e.preventDefault();
    setAddSegmentStatus('');
    if (!reuseSegmentId || !segmentChallengeId) {
      setAddSegmentStatus('Select both a segment and a challenge');
      return;
    }

    const seg = allSegments.find((s) => s.id === reuseSegmentId);
    if (!seg) {
      setAddSegmentStatus('Segment not found');
      return;
    }

    try {
      await adminAddSegment(token, {
        stravaSegmentId: seg.stravaSegmentId,
        name: seg.name,
        distance: seg.distance,
        elevationGain: seg.elevationGain,
        challengeId: segmentChallengeId,
      });
      setAddSegmentStatus('Segment added successfully!');
      setReuseSegmentId('');
      await loadData();
    } catch (err) {
      setAddSegmentStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function loadStarredSegments() {
    setStarredLoading(true);
    try {
      const res = await adminGetStarredSegments(token);
      setStarredSegments(res.segments);
    } catch (err) {
      setAddSegmentStatus(`Error loading starred segments: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setStarredLoading(false);
    }
  }

  async function handleImportStarred(seg: StravaSegmentMetadata) {
    if (!segmentChallengeId) {
      setAddSegmentStatus('Select a challenge first');
      return;
    }
    setImportingStarred(seg.stravaSegmentId);
    setAddSegmentStatus('');
    try {
      const detail = await adminGetStravaSegment(token, seg.stravaSegmentId);
      await adminAddSegment(token, { ...detail, challengeId: segmentChallengeId });
      setAddSegmentStatus(`Added "${seg.name}" successfully!`);
      await loadData();
    } catch (err) {
      setAddSegmentStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setImportingStarred(null);
    }
  }

  async function handleShowAdmins() {
    setActivePanel('admins');
    setAdminStatus('');
    try {
      const res = await adminGetAdmins(token);
      setAdminUsers(res.admins);
    } catch (err) {
      setAdminStatus(`Error loading admins: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    setAdminStatus('');
    const athleteId = Number(newAdminAthleteId.trim());
    if (!athleteId || Number.isNaN(athleteId)) {
      setAdminStatus('Enter a valid Strava athlete ID');
      return;
    }
    try {
      await adminAddAdmin(token, athleteId, newAdminName.trim());
      setAdminStatus('Admin added successfully');
      setNewAdminAthleteId('');
      setNewAdminName('');
      const res = await adminGetAdmins(token);
      setAdminUsers(res.admins);
    } catch (err) {
      setAdminStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function handleRemoveAdmin(stravaAthleteId: number) {
    if (!confirm(`Remove admin with Strava ID ${stravaAthleteId}?`)) return;
    setRemovingAdmin(stravaAthleteId);
    try {
      await adminRemoveAdmin(token, stravaAthleteId);
      setAdminUsers((prev) => prev.filter((a) => a.stravaAthleteId !== stravaAthleteId));
    } catch (err) {
      alert(`Failed to remove: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRemovingAdmin(null);
    }
  }

  function downloadOpenApi() {
    const url = URL.createObjectURL(new Blob([openApiJson], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'openapi.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function runSelectedEndpoint() {
    if (!selectedEndpoint) return;
    setEndpointRunning(true);
    setEndpointStatus('');
    setEndpointResponse('');

    try {
      const path = selectedEndpoint.path.replace(/\{([^}]+)\}/g, (_, name) => {
        const value = endpointParams[name]?.trim();
        if (!value) throw new Error(`Missing value for ${name}`);
        return encodeURIComponent(value);
      });

      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const init: RequestInit = { method: selectedEndpoint.method, headers };
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(selectedEndpoint.method) && endpointBody.trim()) {
        headers['Content-Type'] = 'application/json';
        init.body = endpointBody;
      }

      const res = await fetch(`/api${path}`, init);
      setEndpointStatus(`${res.status} ${res.statusText}`);
      setEndpointResponse(await res.text() || '(empty response body)');
    } catch (err) {
      setEndpointStatus('Request failed');
      setEndpointResponse(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setEndpointRunning(false);
    }
  }

  function selectEndpoint(endpoint: typeof openApiEndpoints[number]) {
    setSelectedEndpoint(endpoint);
    setEndpointParams({});
    setEndpointBody(endpoint.requestBodyRequired ? '{\n  \n}' : '');
    setEndpointStatus('');
    setEndpointResponse('');
  }

  function handleLogout() {
    localStorage.removeItem('enduro_jwt');
    setToken('');
  }

  if (!ready) return null;

  // Login gate
  if (!token) {
    return (
      <main style={{ maxWidth: '420px', margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo.png" alt="Fitness Challenge" style={{ maxWidth: '200px', marginBottom: '2rem' }} />
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem' }}>Admin</h1>
        <p style={{ color: 'var(--color-muted)', marginBottom: '2rem' }}>
          Sign in with your Strava account to access the admin panel.
        </p>
        {loginError && (
          <>
            <p style={{ color: '#dc3545', marginBottom: '1rem', fontWeight: 600 }}>{loginError}</p>
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '8px', padding: '1.25rem', marginBottom: '2rem', textAlign: 'left',
            }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
                Not an admin yet? Become a challenge creator to set up and manage your own events.
              </p>
              <a
                href="/creator"
                style={{
                  display: 'inline-block', padding: '0.5rem 1.25rem',
                  background: 'var(--color-primary)', color: '#fff', borderRadius: '6px',
                  fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem',
                }}
              >
                Become a Creator
              </a>
            </div>
          </>
        )}
        <a
          href={buildAdminLoginUrl()}
          style={{
            display: 'inline-block', padding: '0.85rem 2rem',
            background: '#fc4c02', color: '#fff', borderRadius: '6px',
            fontWeight: 700, textDecoration: 'none',
          }}
        >
          Login with Strava
        </a>
        {!loginError && (
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginTop: '1.5rem' }}>
            Not an admin?{' '}
            <a href="/creator" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
              Become a Creator
            </a>{' '}
            to set up your own challenges.
          </p>
        )}
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Admin</h1>
          <button onClick={handleLogout} style={{ ...btnStyle, background: 'transparent', color: 'var(--color-muted)', border: '1px solid var(--color-border)', padding: '0.45rem 0.9rem' }}>
            Logout
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button onClick={() => setActivePanel(activePanel === 'create' ? null : 'create')} style={btnStyle}>Create Challenge</button>
          <button onClick={handleShowActivate} style={btnStyle}>Activate Challenge</button>
          <button onClick={handleShowAddSegment} style={btnStyle}>Add Segment</button>
          <button onClick={handleShowAdmins} style={btnStyle}>Manage Admins</button>
          <button onClick={() => setActivePanel(activePanel === 'docs' ? null : 'docs')} style={btnStyle}>API Docs</button>
          <button onClick={cleanupConnectedAthletes} style={btnStyle}>Cleanup Strava Slots</button>
          <button onClick={() => loadData()} style={{ ...btnStyle, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            Refresh Data
          </button>
        </div>

        {/* Challenge Scope Selector */}
        {challenges.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', padding: '0.75rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', fontWeight: 600 }}>Viewing:</span>
            <select
              value={selectedChallengeId}
              onChange={(e) => {
                setSelectedChallengeId(e.target.value);
                loadData(e.target.value);
              }}
              style={{ ...textInputStyle, width: 'auto', flex: 1, maxWidth: '400px' }}
            >
              {challenges.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
              ))}
            </select>
          </div>
        )}

        {/* Create Challenge Form */}
        {showCreateForm && (
          <section style={{ ...cardStyle, marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Create Challenge</h2>
            <form onSubmit={handleCreateChallenge} style={{ display: 'grid', gap: '0.75rem', maxWidth: '480px' }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Name</span>
                <input value={createName} onChange={(e) => setCreateName(e.target.value)} required style={textInputStyle} placeholder="Winter Enduro 2026" />
              </label>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Description</span>
                <textarea value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} rows={2} style={{ ...textInputStyle, resize: 'vertical' }} placeholder="Optional description" />
              </label>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Location</span>
                <input value={createLocation} onChange={(e) => setCreateLocation(e.target.value)} style={textInputStyle} placeholder="e.g. Santa Monica Mountains, CA" />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={labelStyle}>
                  <span style={labelTextStyle}>Start Date</span>
                  <input type="date" value={createStartDate} onChange={(e) => setCreateStartDate(e.target.value)} required style={textInputStyle} />
                </label>
                <label style={labelStyle}>
                  <span style={labelTextStyle}>End Date</span>
                  <input type="date" value={createEndDate} onChange={(e) => setCreateEndDate(e.target.value)} required style={textInputStyle} />
                </label>
              </div>
              <fieldset style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.75rem', margin: 0 }}>
                <legend style={{ ...labelTextStyle, padding: '0 0.25rem' }}>Activity Types (up to 5)</legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {Object.values(StravaActivityType).map((type) => {
                    const checked = createActivityTypes.includes(type);
                    return (
                      <label key={type} style={{
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.35rem 0.65rem', borderRadius: '4px', cursor: 'pointer',
                        background: checked ? 'var(--color-accent, #fc4c02)' : 'var(--color-bg)',
                        color: checked ? '#fff' : 'inherit',
                        border: `1px solid ${checked ? 'var(--color-accent, #fc4c02)' : 'var(--color-border)'}`,
                        fontSize: '0.82rem', fontWeight: checked ? 600 : 400,
                        transition: 'all 0.15s',
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setCreateActivityTypes((prev) =>
                              checked
                                ? prev.filter((t) => t !== type)
                                : prev.length >= 5 ? prev : [...prev, type]
                            );
                          }}
                          style={{ display: 'none' }}
                        />
                        {STRAVA_ACTIVITY_TYPE_LABELS[type]}
                      </label>
                    );
                  })}
                </div>
                {createActivityTypes.length === 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#dc3545', margin: '0.5rem 0 0' }}>Select at least one activity type</p>
                )}
              </fieldset>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button type="submit" disabled={createActivityTypes.length === 0} style={{ ...btnStyle, opacity: createActivityTypes.length === 0 ? 0.5 : 1 }}>Create</button>
                <button type="button" onClick={() => setActivePanel(null)} style={{ ...btnStyle, background: 'transparent', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>Cancel</button>
              </div>
              {createStatus && <p style={{ fontSize: '0.85rem', color: createStatus.startsWith('Error') ? '#dc3545' : '#16a34a', margin: 0 }}>{createStatus}</p>}
            </form>
          </section>
        )}

        {/* Activate Challenge */}
        {showActivateList && (
          <section style={{ ...cardStyle, marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Activate a Draft Challenge</h2>
              <button onClick={() => setActivePanel(null)} style={{ ...btnStyle, background: 'transparent', color: 'var(--color-muted)', border: '1px solid var(--color-border)', padding: '0.35rem 0.7rem' }}>Close</button>
            </div>
            {draftChallenges.length === 0 ? (
              <p style={{ color: 'var(--color-muted)' }}>No draft challenges found.</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {draftChallenges.map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem', background: 'var(--color-bg)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{formatDate(c.startDate)} – {formatDate(c.endDate)}</div>
                    </div>
                    <button onClick={() => handleActivate(c.id)} disabled={activatingId === c.id} style={{ ...btnStyle, padding: '0.4rem 0.85rem', opacity: activatingId === c.id ? 0.5 : 1 }}>
                      {activatingId === c.id ? 'Activating...' : 'Activate'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Add Segment */}
        {showAddSegment && (
          <section style={{ ...cardStyle, marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add Segment</h2>
              <button onClick={() => setActivePanel(null)} style={{ ...btnStyle, background: 'transparent', color: 'var(--color-muted)', border: '1px solid var(--color-border)', padding: '0.35rem 0.7rem' }}>Close</button>
            </div>

            <label style={{ ...labelStyle, marginBottom: '1rem', maxWidth: '360px' }}>
              <span style={labelTextStyle}>Target Challenge</span>
              <select value={segmentChallengeId} onChange={(e) => setSegmentChallengeId(e.target.value)} style={textInputStyle}>
                <option value="">Select challenge...</option>
                {challenges.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                ))}
              </select>
            </label>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              {(['new', 'starred', 'reuse'] as const).map((mode) => (
                <button key={mode} onClick={() => { setSegmentMode(mode); if (mode === 'starred' && starredSegments.length === 0) loadStarredSegments(); }} style={{ ...btnStyle, ...(segmentMode === mode ? {} : { background: 'transparent', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }), padding: '0.4rem 0.85rem' }}>
                  {{ new: 'New Segment', starred: 'Strava Starred', reuse: 'Reuse Existing' }[mode]}
                </button>
              ))}
            </div>

            {segmentMode === 'new' && (
              <form onSubmit={handleAddNewSegment} style={{ display: 'grid', gap: '0.75rem', maxWidth: '480px' }}>
                <label style={labelStyle}>
                  <span style={labelTextStyle}>Strava Segment URL or ID</span>
                  <input value={newStravaId} onChange={(e) => setNewStravaId(e.target.value)} required style={textInputStyle} placeholder="https://www.strava.com/segments/12345 or 12345" />
                </label>
                <button type="submit" style={btnStyle}>Fetch & Add</button>
              </form>
            )}

            {segmentMode === 'starred' && (
              <div>
                {starredLoading && <p style={{ color: 'var(--color-muted)' }}>Loading starred segments from Strava...</p>}
                {!starredLoading && starredSegments.length === 0 && (
                  <p style={{ color: 'var(--color-muted)' }}>No starred segments found. Star segments on Strava to see them here.</p>
                )}
                {!starredLoading && starredSegments.length > 0 && (
                  <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                    {starredSegments.map((seg) => (
                      <div key={seg.stravaSegmentId} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                        padding: '0.65rem 0.85rem', background: 'var(--color-bg)', borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{seg.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                            {Math.round(seg.distance)}m &middot; {Math.round(seg.elevationGain)}m gain
                            {seg.city ? ` \u00b7 ${[seg.city, seg.state].filter(Boolean).join(', ')}` : ''}
                            {seg.athleteCount ? ` \u00b7 ${seg.athleteCount} athletes` : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => handleImportStarred(seg)}
                          disabled={importingStarred === seg.stravaSegmentId}
                          style={{ ...btnStyle, padding: '0.35rem 0.7rem', opacity: importingStarred === seg.stravaSegmentId ? 0.5 : 1 }}
                        >
                          {importingStarred === seg.stravaSegmentId ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {segmentMode === 'reuse' && (
              <form onSubmit={handleReuseSegment} style={{ display: 'grid', gap: '0.75rem', maxWidth: '480px' }}>
                <label style={labelStyle}>
                  <span style={labelTextStyle}>Select segment from another challenge</span>
                  <select value={reuseSegmentId} onChange={(e) => setReuseSegmentId(e.target.value)} required style={textInputStyle}>
                    <option value="">Select segment...</option>
                    {allSegments.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} (from {s.challengeName})</option>
                    ))}
                  </select>
                </label>
                <button type="submit" style={btnStyle}>Add to Challenge</button>
              </form>
            )}

            {addSegmentStatus && <p style={{ fontSize: '0.85rem', marginTop: '0.75rem', color: addSegmentStatus.startsWith('Error') ? '#dc3545' : addSegmentStatus.includes('successfully') ? '#16a34a' : 'var(--color-muted)' }}>{addSegmentStatus}</p>}
          </section>
        )}

        {/* Manage Admins */}
        {showAdmins && (
          <section style={{ ...cardStyle, marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Admin Users</h2>
              <button onClick={() => setActivePanel(null)} style={{ ...btnStyle, background: 'transparent', color: 'var(--color-muted)', border: '1px solid var(--color-border)', padding: '0.35rem 0.7rem' }}>Close</button>
            </div>

            <form onSubmit={handleAddAdmin} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <label style={{ ...labelStyle, flex: '0 0 160px' }}>
                <span style={labelTextStyle}>Strava Athlete ID</span>
                <input value={newAdminAthleteId} onChange={(e) => setNewAdminAthleteId(e.target.value)} required style={textInputStyle} placeholder="12345678" />
              </label>
              <label style={{ ...labelStyle, flex: '1 1 200px' }}>
                <span style={labelTextStyle}>Name (optional)</span>
                <input value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} style={textInputStyle} placeholder="John Doe" />
              </label>
              <button type="submit" style={{ ...btnStyle, padding: '0.75rem 1.25rem' }}>Add Admin</button>
            </form>

            {adminStatus && <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: adminStatus.startsWith('Error') ? '#dc3545' : '#16a34a' }}>{adminStatus}</p>}

            {adminUsers.length === 0 ? (
              <p style={{ color: 'var(--color-muted)' }}>No admin users found.</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {adminUsers.map((admin) => (
                  <div key={admin.stravaAthleteId} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                    padding: '0.75rem', background: 'var(--color-bg)', borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>
                        {admin.name || `Strava #${admin.stravaAthleteId}`}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                        Strava ID: {admin.stravaAthleteId}
                        {admin.source === 'config' && ' · Root admin (config)'}
                        {admin.addedAt && ` · Added ${new Date(admin.addedAt).toLocaleDateString()}`}
                      </div>
                    </div>
                    {admin.source === 'database' ? (
                      <button
                        onClick={() => handleRemoveAdmin(admin.stravaAthleteId)}
                        disabled={removingAdmin === admin.stravaAthleteId}
                        style={{
                          padding: '0.4rem 0.85rem', background: '#dc3545', color: '#fff',
                          border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer',
                          opacity: removingAdmin === admin.stravaAthleteId ? 0.5 : 1,
                        }}
                      >
                        {removingAdmin === admin.stravaAthleteId ? 'Removing...' : 'Remove'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontStyle: 'italic' }}>Protected</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Challenges List */}
        {challenges.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              Challenges ({challenges.length})
            </h2>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {challenges.map((c) => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                  background: 'var(--color-surface)', padding: '0.75rem 1rem', borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      {c.status} &middot; {formatDate(c.startDate)} – {formatDate(c.endDate)} &middot; {c.segmentIds.length} segments
                      {c.activityTypes?.length > 0 && ` · ${c.activityTypes.map((t: string) => STRAVA_ACTIVITY_TYPE_LABELS[t as StravaActivityType] ?? t).join(', ')}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteChallenge(c)}
                    disabled={deletingId === c.id}
                    style={{
                      padding: '0.4rem 0.85rem', background: '#dc3545', color: '#fff',
                      border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer',
                      opacity: deletingId === c.id ? 0.5 : 1,
                    }}
                  >
                    {deletingId === c.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {showDocs && (
          <section style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>API Docs</h2>
              <button onClick={downloadOpenApi} style={{ ...btnStyle, padding: '0.45rem 0.9rem' }}>Download OpenAPI</button>
            </div>

            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden', marginBottom: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', width: '90px' }}>Method</th>
                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Path</th>
                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Area</th>
                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Summary</th>
                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', width: '110px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {openApiEndpoints.map((endpoint) => (
                    <tr key={`${endpoint.method} ${endpoint.path}`} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>{endpoint.method}</td>
                      <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace' }}>{endpoint.path}</td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>{endpoint.tag}</td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-muted)' }}>{endpoint.summary}</td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                        <button onClick={() => selectEndpoint(endpoint)} style={{ ...btnStyle, padding: '0.35rem 0.7rem' }}>
                          Run
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedEndpoint && (
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  Run {selectedEndpoint.method} {selectedEndpoint.path}
                </h3>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {selectedEndpoint.path.match(/\{([^}]+)\}/g)?.map((placeholder) => {
                    const name = placeholder.slice(1, -1);
                    return (
                      <label key={name} style={{ display: 'grid', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--color-muted)' }}>{name}</span>
                        <input
                          value={endpointParams[name] ?? ''}
                          onChange={(e) => setEndpointParams((prev) => ({ ...prev, [name]: e.target.value }))}
                          placeholder={name}
                          style={textInputStyle}
                        />
                      </label>
                    );
                  })}

                  {['POST', 'PUT', 'PATCH', 'DELETE'].includes(selectedEndpoint.method) && (
                    <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--color-muted)' }}>JSON body</span>
                      <textarea
                        value={endpointBody}
                        onChange={(e) => setEndpointBody(e.target.value)}
                        rows={8}
                        style={{ ...textInputStyle, fontFamily: 'monospace', resize: 'vertical' }}
                        placeholder={selectedEndpoint.requestBodyRequired ? '{ }' : '{}'}
                      />
                    </label>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button onClick={runSelectedEndpoint} disabled={endpointRunning} style={btnStyle}>
                      {endpointRunning ? 'Running...' : 'Execute'}
                    </button>
                    <button onClick={() => setSelectedEndpoint(null)} style={{ ...btnStyle, background: 'transparent', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                      Close
                    </button>
                  </div>

                  {endpointStatus && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{endpointStatus}</div>
                  )}

                  {endpointResponse && (
                    <pre style={{ background: '#111827', color: '#f9fafb', padding: '1rem', borderRadius: '6px', fontSize: '0.8rem', overflow: 'auto', maxHeight: '280px' }}>
                      {endpointResponse}
                    </pre>
                  )}
                </div>
              </div>
            )}

            <pre style={{ background: 'var(--color-surface)', padding: '1rem', borderRadius: '6px', fontSize: '0.72rem', overflow: 'auto', maxHeight: '420px', border: '1px solid var(--color-border)' }}>
              {openApiJson}
            </pre>
          </section>
        )}

        {/* Stored Strava Connections */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Stored Strava Connections ({connectedAthletes.length})
          </h2>
          {connectedAthletes.length === 0 ? (
            <p style={{ color: 'var(--color-muted)' }}>No stored Strava tokens. Click Refresh Data to load.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {connectedAthletes.map((athlete) => (
                <div key={athlete.racerId} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  background: 'var(--color-surface)', padding: '0.75rem 1rem', borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={athlete.profileImageUrl} alt=""
                    style={{ width: 36, height: 36, borderRadius: '50%' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{athlete.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      Strava #{athlete.stravaAthleteId} &middot; {athlete.category} &middot; {athlete.sexCategory} &middot; {athlete.ageGroup}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeauthorize(athlete)}
                    disabled={deauthorizing === athlete.racerId}
                    style={{
                      padding: '0.4rem 0.85rem', background: '#dc3545', color: '#fff',
                      border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer',
                      opacity: deauthorizing === athlete.racerId ? 0.5 : 1,
                    }}
                  >
                    {deauthorizing === athlete.racerId ? 'Removing...' : 'Deauthorize'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <section>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              Segments ({segments.length})
              {selectedChallengeId && challenges.length > 0 && (
                <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-muted)', marginLeft: '0.5rem' }}>
                  — {challenges.find((c) => c.id === selectedChallengeId)?.name}
                </span>
              )}
            </h2>
            <pre style={{ background: 'var(--color-surface)', padding: '1rem', borderRadius: '6px', fontSize: '0.75rem', overflow: 'auto' }}>
              {JSON.stringify(segments, null, 2)}
            </pre>
          </section>
          <section>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              Racers ({racers.length})
              {selectedChallengeId && challenges.length > 0 && (
                <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-muted)', marginLeft: '0.5rem' }}>
                  — {challenges.find((c) => c.id === selectedChallengeId)?.name}
                </span>
              )}
            </h2>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {racers.map((racer) => (
                <div
                  key={racer.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    padding: '0.75rem',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={racer.profileImageUrl}
                    alt=""
                    style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{racer.firstName} {racer.lastName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      {racer.category} &middot; {racer.sexCategory} &middot; {racer.ageGroup}
                    </div>
                  </div>
                  <button onClick={() => editRacer(racer)} style={{ ...btnStyle, padding: '0.4rem 0.85rem' }}>
                    Edit
                  </button>
                </div>
              ))}
            </div>
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

const textInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '6px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: '0.95rem',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  padding: '1.25rem',
};

const labelStyle: React.CSSProperties = {
  display: 'grid',
  gap: '0.35rem',
};

const labelTextStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'var(--color-muted)',
};

function extractStravaSegmentId(input: string): number | null {
  const match = input.match(/segments\/(\d+)/) ?? input.match(/^(\d+)$/);
  return match ? Number(match[1]) : null;
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminContent />
    </Suspense>
  );
}
