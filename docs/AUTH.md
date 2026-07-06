# Authentication

## Overview
Authentication is only required in two cases:

1. When a user registers as a participant.
2. When a user sets up a tenant.

Everything else in the platform should remain browseable without authentication. Event discovery, event selection, public leaderboards, and public event pages should stay open.

This document reflects the current codebase and the intended direction for tenant setup. Cognito will be implemented from `infra/` using CDK when that feature starts.

## Current Auth State

The current system uses Strava OAuth and a site JWT for the existing flows:

- Participant registration uses Strava OAuth.
- Admin login uses Strava OAuth.
- The OAuth callback exchanges the Strava code, creates or updates the local identity record, then redirects back to the frontend with a JWT where needed.
- The frontend stores the returned JWT in `localStorage` for authenticated admin actions.

Current implementation details:

- OAuth callback route: `/auth/callback`
- Participant registration redirect goes to the frontend success page.
- Admin login redirect goes to the frontend admin page with a signed JWT.
- Strava access tokens are stored server-side for the identities that need them.

## Participant Registration Auth

Participant registration remains Strava-only for now.

The registration flow should:

- start from the public register page
- redirect the user to Strava OAuth
- read the Strava profile data on callback
- create or update the participant record
- persist any Strava token data needed for activity sync and leaderboard updates

This flow is used only when someone is registering as a participant. It is not the general login mechanism for browsing the platform.

## Tenant Setup Auth

Tenant setup will use Cognito.

The tenant setup flow should:

- require a Cognito user account
- be provisioned from `infra/` using CDK
- support AWS native Cognito sign-in first
- support Google as the first social provider
- leave room for other easy-to-implement identity providers later

Tenant setup is the point where a user becomes a tenant owner/admin. That is separate from participant registration.

## Identity Providers

For tenant setup, the initial documented Cognito providers are:

- Cognito native email/password
- Google

The implementation should favor simple provider setup and avoid over-designing social login until there is a real need.

## Session and Token Handling

The platform currently uses two separate token concepts:

- Strava access tokens for calling Strava APIs and syncing activity data
- site JWTs for authenticated admin actions in the frontend

Current token handling:

- Strava OAuth callback returns a site JWT when needed.
- The admin UI reads the JWT from `localStorage`.
- Server-side Lambdas verify admin JWTs on protected admin routes.

Future Cognito-based tenant auth should keep the platform session model explicit:

- Cognito authenticates the tenant owner.
- Strava remains the source for athlete and activity data.
- The application should not turn Cognito into a generic participant login unless that becomes a deliberate product change.

## Security and Trust Boundaries

The trust boundary should be simple:

- Strava is trusted for athlete profile and activity data.
- Cognito is trusted for tenant owner identity.
- The platform should not require authentication for public browsing.
- Participant and tenant auth should remain separate concerns.

Tenant ownership must control what an admin can view or mutate. Normal admins should only manage events they own. Global admins can manage all events.

## Implementation Notes

- Cognito will be added through `infra/` with CDK.
- The auth document should stay aligned with the current codebase as the tenant setup feature is implemented.
- Existing Strava OAuth flows remain the source of truth for participant registration until the product changes that explicitly.
- When the Cognito work starts, update this document at the same time as the infra and API contract changes.

## Open Questions

- Whether tenant setup needs email verification beyond Cognito defaults.
- Whether Google is sufficient for the first social provider set or if additional providers are required later.
- Whether tenant owners will ever need direct participant login through Cognito, or if Strava should remain the only participant auth method.
