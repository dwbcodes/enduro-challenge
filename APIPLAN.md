# API Plan

## Summary
Move the platform to strict bounded contexts with one API surface per domain and separate datastores per domain. The public concept is `event`; `challenge` becomes legacy/internal only. Each domain owns its own API routes, handlers, and persistence model.

## Recommended API Layout
- `events/`
  - Event catalog, ownership, lifecycle, activation, and admin controls
  - Example: `GET /events`, `POST /events`, `GET /events/{eventId}`, `PATCH /events/{eventId}`, `POST /events/{eventId}/activate`, `DELETE /events/{eventId}`
- `racers/`
  - Racer profile and racer-specific changes only
  - Example: `GET /racers/{racerId}`, `PATCH /racers/{racerId}`, `DELETE /racers/{racerId}`
- `registrations/`
  - Join/leave event, selected event membership, starred/registered event lists
  - Example: `POST /registrations`, `DELETE /registrations/{registrationId}`, `GET /registrations/me`
- `segments/`
  - Event-scoped segment management and Strava segment metadata
  - Example: `GET /events/{eventId}/segments`, `POST /events/{eventId}/segments`, `DELETE /events/{eventId}/segments/{segmentId}`
- `leaderboards/`
  - Read-only leaderboard queries, owned by result/leaderboard domain
  - Example: `GET /events/{eventId}/segments/{segmentId}/leaderboards/{category}`
- `discover/`
  - Popular events, search, trending, surfaced read models
  - Example: `GET /discover/events/popular`, `GET /discover/events/search`
- `me/`
  - Cognito-backed user session, selected event, starred event shortcuts, profile/preferences
  - Example: `GET /me`, `PATCH /me/selected-event`, `GET /me/events/starred`, `GET /me/events/registered`
- `admin/`
  - Global admin only, tenant-scoped ownership rules still apply for normal admins
  - Example: `GET /admin/events`, `PATCH /admin/events/{eventId}`, `DELETE /admin/events/{eventId}`

## Key Decisions
- Use `event` as the public-facing resource name everywhere.
- Use Cognito for application login.
- Use each Strava admin's own credentials for event setup.
- Enforce strict tenant isolation.
- Separate DynamoDB tables per bounded context, even if it increases infrastructure count and migration work.

## Test Plan
- Anonymous users see popular events on entry.
- Logged-in users see starred and registered events before other events.
- Event switching persists across pages.
- A normal admin cannot read or modify another admin's event.
- A global admin can manage any event.
- Event creation works using the owner's own Strava credentials.
- Racer mutations only occur through the racer API surface.
- Event mutations only occur through the event API surface.

## Assumptions
- `challenge` is retained only as an internal legacy term until migration is complete.
- Existing challenge data is not migrated into the new model.
- Popular events are ranked by platform usage signals such as stars and registrations.
- Separate write models and read models are acceptable where needed for query performance or isolation.
