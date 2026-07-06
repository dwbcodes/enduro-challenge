# Events Platform PRD

## Summary
Rework the site from a single-challenge app into a multi-tenant events platform. Each event is owned by a normal admin, uses that owner's own Strava app credentials, and is isolated from other events. Cognito becomes the user login layer, while Strava remains the event setup and activity source.

The platform should follow strict bounded contexts: every domain owns its own API surface, business logic, and datastore. The primary public concept is `event`; `challenge` becomes legacy/internal only.
The public participant model should be broad enough for Trail Running, Gravel Biking, and future Strava activity types.

## Recommended API Layout
- `events/`
  - Event catalog, ownership, lifecycle, activation, and admin controls
  - Example: `GET /events`, `POST /events`, `GET /events/{eventId}`, `PATCH /events/{eventId}`, `POST /events/{eventId}/activate`, `DELETE /events/{eventId}`
- `participants/`
  - Participant profile and participant-specific changes only
  - Example: `GET /participants/{participantId}`, `PATCH /participants/{participantId}`, `DELETE /participants/{participantId}`
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

## Product Direction
- Anonymous visitors land on a discovery surface that highlights popular rides/events.
- Logged-in users see starred events and their registered events first.
- Every page is centered on one selected event, with a consistent event switcher for starred, registered, and searched events.
- Event pages only expose the selected event's data.
- Normal admins can only create, update, activate, and delete events they own.
- A global admin can access and manage every event.
- Event setup uses the owner's own Strava client credentials, not a shared platform app.
- The current challenge model is replaced by the new event model rather than dual-running both.
- Events can support multiple activity types, starting with Trail Running and Gravel Biking, with a path to supporting all Strava activity types.

## Implementation Changes
- Replace the active-challenge assumption with an event catalog plus per-user selected-event state.
- Add Cognito-backed application auth and separate it from Strava-based event setup/identity flows.
- Introduce tenant ownership on events so all reads and writes can be authorized against the event owner or global admin role.
- Update admin flows to support Create / Update / Activate / Delete for owned events only.
- Add discovery endpoints and UI surfaces for popular, starred, registered, and searched events.
- Update routing so each page always resolves the current selected event before showing event-scoped content.
- Split datastores by bounded context so racer, event, registration, segment, leaderboard, and user concerns do not share a single write model.
- Treat legacy challenge data as deprecated and do not preserve it as a compatibility mode in the PRD.
- Replace `racer` terminology with `participant` in product language and public-facing UX.
- Model activity type as a first-class event attribute so events can be filtered, discovered, and configured by activity type.

## Test Plan
- Anonymous users see popular events on entry.
- Logged-in users see starred and registered events before other events.
- Event switching persists across pages.
- A normal admin cannot read or modify another admin's event.
- A global admin can manage any event.
- Event creation works using the owner's own Strava credentials.
- Legacy challenge pages are removed from the primary flow.
- Participant mutations only occur through the participant API surface.
- Event mutations only occur through the event API surface.
- Trail Running and Gravel Biking are supported in the initial release.

## Assumptions
- Strava credentials are stored per event owner and used only for that owner's events.
- Cognito is the only application login system.
- "Popular" events are ranked by platform usage signals such as stars and registrations.
- Existing challenge data is not migrated into the new model; the new event platform starts clean.
- Separate DynamoDB tables per bounded context are preferred even if they increase infrastructure count and migration work.
- `challenge` is retained only as an internal legacy term until the migration is complete.
- `participant` is the public-facing term; `racer` remains an internal legacy term only until migration is complete.
