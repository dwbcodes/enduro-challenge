# Agent Guide — Fitness Challenge Platform

This file is the authoritative reference for AI agents working on this codebase.

** ALWAYS USE beads for any changes **

---

## Monorepo Layout

```
packages/domain          → packages/application → packages/infrastructure → packages/functions
apps/web                 Next.js static export (S3 + CloudFront)
infra/                   AWS CDK — 3 stacks: EnduroDatabase, EnduroApi, EnduroFrontend
```

**Dependency direction is strictly one-way.** Domain has no external deps. Application depends only on Domain. Infrastructure depends on Domain. Functions depend on Application + Infrastructure.

---

## API-First Development Policy

This project is API-first. Every feature that changes behavior must start from the HTTP API contract before frontend or implementation details.

**Required for API changes:**
- Define the endpoint, method, auth requirement, request schema, response schema, and error responses first.
- Update the canonical OpenAPI spec in `docs/openapi.json` in the same change set as the code.
- Mirror the spec to `apps/web/public/admin/openapi.json` so the static admin UI can render and download it.
- Keep the admin API docs view in `apps/web/src/app/admin/page.tsx` aligned with the OpenAPI spec. The admin section is where operators inspect and download the API contract.
- Frontend code must call the CloudFront `/api` path through `apps/web/src/lib/api.ts`; do not point browser code at the raw API Gateway URL and do not add server-side Next.js handlers because the site is statically exported.

**DDD and serverless boundaries are mandatory:**
- Domain owns entities, value objects, enums, and repository interfaces only.
- Application owns use cases, commands, and queries only.
- Infrastructure owns DynamoDB, Strava, and other external adapters.
- Functions own Lambda/API Gateway request handling and dependency wiring only.
- AWS serverless services are the default platform: API Gateway for HTTP, Lambda for compute, DynamoDB for persistence, SQS/EventBridge for async work, SSM for config/secrets, and S3/CloudFront for the static frontend.
- CloudFront owns the public web origin and proxies `/api/*` to API Gateway. API Gateway CORS and Lambda response CORS must allow only the configured CloudFront frontend URL.
- CloudFront must cache safe public API reads (`/api/segments*`, `/api/leaderboard/*`, `/api/racers*`) with short TTLs to reduce API abuse. Admin, auth, webhook, and mutation endpoints must remain uncached.

**Definition of done for API work:** code, tests, `docs/openapi.json`, frontend API client changes, and admin docs visibility are all updated together. A route or schema change without an OpenAPI update is incomplete.

## API Domain Design

New API work must follow strict bounded contexts. Each domain owns its own route group, Lambda handler surface, repository interfaces, and datastore. Do not add feature endpoints to a shared catch-all handler when a domain-specific handler is possible.

**Recommended route groups:**
- `events/` - event catalog, ownership, lifecycle, activation, deletion
- `racers/` - racer profile and racer-specific mutations
- `registrations/` - joins, leaves, starred/registered events, selected event
- `segments/` - event-scoped segment definitions and Strava segment metadata
- `leaderboards/` - read-only leaderboard queries
- `discover/` - popular, starred, registered, and search read models
- `me/` - Cognito-backed session and current user preferences
- `admin/` - global admin controls and tenant admin operations

**Build rules for new APIs:**
- Choose the domain first, then define the route prefix, request/response schema, auth rule, and datastore ownership.
- Keep commands/queries in `packages/application`, persistence in `packages/infrastructure`, and HTTP handling in `packages/functions`.
- Prefer one Lambda per domain or route group. Use a shared handler only when a small route family is genuinely cohesive and still bounded by one domain.
- Use separate datastores per bounded context. If a read model is needed, build a purpose-specific projection rather than reusing a write model table for everything.
- Never let one domain mutate another domain's store directly. Cross-domain changes must go through application-level orchestration.
- Update the OpenAPI spec, mirrored admin spec, frontend API client, and admin docs together with every API route change.

---

## Domain Layer (`packages/domain`)

All business entities and repository interfaces live here. No AWS SDK, no HTTP clients.

**Entities:**
- `Event` - the public event model; owns lifecycle, ownership, and selected-event context
- `Challenge` - legacy/internal event term during migration only; do not use for new public APIs
- `Racer` - a registered competitor; has `stravaAthleteId`, `RacerCategory`, `AgeGroup`, and `SexCategory`
- `Registration` - membership/starred/selected-event relationship between a user and an event
- `Creator` - a challenge organizer; has `stravaAthleteId`, `username?`, Strava app credentials; `slug` is `username ?? stravaAthleteId`
- `Segment` - a tracked Strava segment; has `stravaSegmentId`, `eventId`
- `Result` — a racer's **best time** on a segment; ID is `Result.makeId(segmentId, racerId)` — one record per racer/segment
- `StravaToken` — OAuth tokens for a racer; stored separately from the profile

**Repository interfaces** in `*.repository.ts` files — implemented in `packages/infrastructure`.

**Enums to know:**
```typescript
RacerCategory.MTB | RacerCategory.EBIKE | RacerCategory.BOTH
AgeGroup.UNDER_30 | AGE_30_39 | AGE_40_49 | AGE_50_59 | AGE_60_PLUS
SexCategory.MALE | FEMALE
LeaderboardCategory.OVERALL | MTB | EBIKE | MALE | FEMALE | AGE_U30 | AGE_30_39 | AGE_40_49 | AGE_50_59 | AGE_60_PLUS
```

---

## Application Layer (`packages/application`)

Use cases only. No HTTP, no DynamoDB. Depends on Domain interfaces.

**Commands (write operations):**
| Handler | What it does |
|---------|-------------|
| `RegisterRacerHandler` | Creates/updates racer + saves Strava OAuth token |
| `CreateChallengeHandler` | Legacy/internal challenge helper only; new public flows should use event creation handlers |
| `AddSegmentHandler` | Adds a Strava segment to a challenge |
| `ProcessActivityHandler` | Core logic: given segment efforts, upserts best times and updates all relevant leaderboard categories |

**Queries (read operations):**
| Handler | What it does |
|---------|-------------|
| `GetLeaderboardHandler` | Returns sorted leaderboard for a segment + category |
| `GetRacerResultsHandler` | Returns all best times for a racer |

**`ProcessActivityHandler.resolveCategories()`** maps a racer's `RacerCategory` + `AgeGroup` to the set of `LeaderboardCategory` values they compete in (always includes OVERALL + bike category + age category).

---

## Infrastructure Layer (`packages/infrastructure`)

### DynamoDB by Bounded Context

New APIs should not add more shared-table coupling. Use a datastore per bounded context, and keep write models and read models separate when the domain benefits from it.

**Current legacy table is still present:**

### DynamoDB Single Table (`packages/infrastructure/src/dynamodb/table.ts`)

Table name: `enduro-challenge`

| Entity | PK | SK | GSI1PK | GSI1SK | GSI2PK | GSI2SK |
|--------|----|----|--------|--------|--------|--------|
| Challenge | `CHALLENGE#<id>` | `#META` | — | — | — | — |
| Segment | `CHALLENGE#<challengeId>` | `SEGMENT#<id>` | — | — | — | — |
| Strava seg ref | `STRAVA_SEG#<stravaId>` | `#REF` | — | — | — | — |
| Racer | `RACER#<id>` | `#PROFILE` | `STRAVA_ATHLETE#<stravaId>` | `#PROFILE` | — | — |
| Token | `RACER#<id>` | `#TOKEN` | — | — | — | — |
| Result | `RESULT#<segId>` | `RACER#<racerId>` | `RACER#<racerId>` | `RESULT#<segId>` | — | — |
| Leaderboard | `LEADERBOARD#<segId>#<cat>` | `RACER#<racerId>` | — | — | `LEADERBOARD#<segId>#<cat>` | `elapsedTimeSeconds` (Number) |
| Creator | `CREATOR#<id>` | `#PROFILE` | `STRAVA_ATHLETE#<stravaId>` | `CREATOR` | — | — |
| Creator username ref | `CREATOR_USERNAME#<username>` | `#REF` | — | — | — | — |

**GSI1** — string sort key. Used for: racer lookup by Strava athlete ID, results by racerId.
**GSI2** — numeric sort key (`elapsedTimeSeconds`). Used for leaderboard reads sorted fastest-first (`ScanIndexForward: true`).

**Key patterns** are in `keys.*` helpers in `table.ts` — always use these, never construct PK/SK strings inline.

**Segment lookup by `stravaSegmentId`**: resolves via a lightweight `STRAVA_SEG#<id>` ref item, then fetches the full segment. Saves + deletes use `TransactWriteCommand` to keep the ref in sync.

### Strava Client (`packages/infrastructure/src/strava/strava.client.ts`)

- `exchangeCode(code)` — OAuth code → tokens + athlete profile
- `refreshAccessToken(refreshToken)` — token refresh
- `getActivity(accessToken, activityId)` — fetch activity with all segment efforts
- `getValidAccessToken(...)` — checks expiry, refreshes if needed, calls `onRefresh` callback to persist updated token

---

## Functions Layer (`packages/functions`)

All Lambda handlers. Entry point is each `handler.ts` file.

**Dependency injection:** `packages/functions/src/shared/container.ts` wires all repositories and handlers. Import from here — do not instantiate repos or handlers directly in handler files.

**Response helpers:** `packages/functions/src/shared/response.ts` — `ok()`, `created()`, `badRequest()`, `unauthorized()`, `notFound()`, `redirect()`, `serverError()`.

**Handlers:**

| File | Trigger | Purpose |
|------|---------|---------|
| `strava-webhook/handler.ts` | HTTP GET/POST `/webhook` | GET: Strava verification challenge. POST: pushes `{ activityId, stravaAthleteId }` to SQS. |
| `process-activity/handler.ts` | SQS batch | Fetches full activity from Strava, calls `ProcessActivityHandler` |
| `strava-oauth-callback/handler.ts` | HTTP GET `/auth/callback` | Exchanges OAuth code, creates racer, issues JWT, redirects to frontend |
| `get-leaderboard/handler.ts` | HTTP GET `/leaderboard/{segmentId}` | Public. Query param `category` (default: OVERALL) |
| `get-creator-profile/handler.ts` | HTTP GET `/creators/{slug}` | Public. Returns creator profile + their challenges |
| `admin/handler.ts` | HTTP ANY `/admin/{proxy+}` | Admin-only legacy/ops routes while migration is in progress |

**Preferred build shape for new APIs:**
- One route family per bounded context, backed by its own handler entrypoint or a very small domain-specific router.
- Keep route handlers thin: parse request, authorize, call application use case, map response.
- If a domain grows, split it into separate Lambda entrypoints before it becomes another catch-all admin router.
- Route paths should reflect the domain owner, not the storage shape.
- Public event routes should use `event` terminology; use `challenge` only where required for backwards compatibility.

**Creator login flow:**
1. User visits `/creator` → clicks "Connect with Strava" (state includes `intent: creator_login`)
2. OAuth callback creates/updates Creator entity (with `username` from Strava profile)
3. JWT includes `creatorSlug` claim → redirect to `/c?slug=<slug>&token=<jwt>`
4. Creator profile page shows dashboard (Strava app config, manage challenges) when the JWT `creatorSlug` matches the page slug
5. Challenges have `ownerAthleteId` linking them to the creator who created them
6. Each challenge stores `hostedBy` (creator's display name) for public display

**Admin JWT verification:** `verifyAdmin()` in `admin/handler.ts` checks `isAdmin: true` in the JWT payload. Admin athlete IDs are set via SSM `/enduro/admin-athlete-ids` and embedded in the JWT at OAuth time.

---

## CDK Stacks (`infra/`)

| Stack | Key resources |
|-------|--------------|
| `EnduroDatabase` | DynamoDB table + GSI1 + GSI2. `RemovalPolicy.RETAIN`. |
| `EnduroApi` | All Lambdas (ARM64, Node 20, esbuild bundled), HTTP API Gateway, SQS queue + DLQ, IAM grants, SSM param reads |
| `EnduroFrontend` | S3 bucket (private), CloudFront distribution with OAC, `BucketDeployment` from `apps/web/out/` |

**SSM parameters read by `EnduroApi`:**
- `/enduro/strava/client-id`
- `/enduro/strava/client-secret`
- `/enduro/strava/webhook-verify-token`
- `/enduro/jwt-secret`
- `/enduro/frontend-url`
- `/enduro/admin-athlete-ids`

Lambda entry points are resolved relative to `packages/functions/src/` using `NodejsFunction` with esbuild — no pre-build step required before CDK deploy.

---

## Frontend (`apps/web`)

Next.js 14 App Router, `output: 'export'` (static, no server). All API calls are client-side to the API Gateway URL.

**Key files:**
| File | Purpose |
|------|---------|
| `src/lib/api.ts` | All fetch calls + `buildStravaOAuthUrl()` |
| `src/app/page.tsx` | Home / hero |
| `src/app/register/page.tsx` | Event/racer setup flow → Strava OAuth redirect |
| `src/app/register/success/page.tsx` | Stores JWT in `localStorage` |
| `src/app/leaderboard/page.tsx` | Filterable leaderboard (segment + category) |
| `src/app/creator/page.tsx` | Creator login CTA / redirect to profile |
| `src/app/c/page.tsx` | Creator profile page (public + dashboard if owner) |
| `src/app/admin/page.tsx` | Admin CRUD (uses JWT from localStorage) |

**Environment variables:**
```
NEXT_PUBLIC_API_URL                  API Gateway endpoint
NEXT_PUBLIC_STRAVA_CLIENT_ID         Strava app client ID (60532)
NEXT_PUBLIC_ACTIVE_CHALLENGE_ID      UUID of the current active challenge
NEXT_PUBLIC_SEGMENT_IDS              Comma-separated segment UUIDs (internal, not Strava IDs)
```

---

## Conventions

- **Never construct DynamoDB key strings inline** — use `keys.*` helpers from `table.ts`
- **Never instantiate repos/handlers in Lambda handlers** — always import from `container.ts`
- **Domain entities are immutable** — mutation methods return new instances (e.g. `challenge.activate()`)
- **One Result per racer/segment** — the `Result` entity stores only the personal best; `ProcessActivityHandler` checks before overwriting
- **Leaderboard entries use GSI2 numeric sort** — `upsertEntry()` overwrites in place (PK+SK stable, GSI2SK changes with new time)
- **Token refresh side effect** — `StravaClient.getValidAccessToken()` accepts an `onRefresh` callback; the caller (process-activity Lambda) is responsible for persisting the updated token
- **Admin is route-based inside a single Lambda** — `admin/handler.ts` pattern-matches on `method` + `path`; add new routes there
- **Prefer new event APIs over legacy challenge APIs** — challenge routes exist only until the migration is complete.
- **Keep domain routes and datastores aligned** — one domain should not be backed by a catch-all persistence layer unless there is a documented temporary migration reason.

---

## Adding a New Feature — Checklist

1. Pick the owning domain and route prefix first.
2. Define or extend domain entities/interfaces in `packages/domain`.
3. Add a command or query handler in `packages/application`.
4. Add/update the datastore adapter in `packages/infrastructure/src/dynamodb/` or the domain-specific persistence module.
5. Wire the new handler in `packages/functions/src/shared/container.ts`.
6. Add a domain-specific Lambda handler or router.
7. Add the route in `infra/lib/stacks/api-stack.ts` if it is a new public endpoint.
8. Update `docs/openapi.json`, `apps/web/public/admin/openapi.json`, `src/lib/api.ts`, and the relevant page(s) together.

---

## Common Pitfalls

- `DynamoDBSegmentRepository.findById()` throws — always use `findByStravaSegmentId()` or `findByChallengeId()` instead
- `DynamoDBSegmentRepository.delete()` throws — use `deleteWithContext(segmentId, challengeId, stravaSegmentId)` to keep the ref item in sync
- The `leaderboard` table entry uses `RACER#<racerId>` as SK (stable), not the time — do not use time in the SK for leaderboard entries
- `LeaderboardEntry.rank` is always `0` when stored; ranks are assigned on read by iterating the GSI2 query results in order
- Static export means no server-side logic in Next.js — all dynamic behaviour must go through API Gateway
- A single shared handler or datastore is a smell unless it is explicitly a temporary migration bridge.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
