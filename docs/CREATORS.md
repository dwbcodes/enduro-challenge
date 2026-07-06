# Creator Guide — Fitness Challenge Platform

## What is a Creator?

A **Creator** is someone who sets up and manages Strava-based fitness challenges on the platform. Creators get their own public profile page showing all their challenges, and a dashboard to manage Strava API credentials and challenge administration.

## How to Sign Up

1. Visit `/creator` on the platform
2. Click **Connect with Strava** to authenticate with your Strava account
3. You'll be redirected to your creator profile page at `/c?slug=<your-username>`

Your creator account is automatically created when you first authenticate. Your Strava username becomes your profile URL slug.

## Setting Up Your Strava API Application

To create challenges that track rider segment times, you need your own Strava API application:

1. Go to [strava.com/settings/api](https://www.strava.com/settings/api)
2. Create a new API application
3. Set the **Authorization Callback Domain** to your platform's domain
4. Copy the **Client ID** and **Client Secret**
5. Enter them in the Strava API App card on your creator dashboard

## Creating and Managing Challenges

From your creator dashboard, click **Manage Challenges** to access the admin panel where you can:

- **Create a challenge** — set name, description, location, dates, and activity types
- **Add segments** — add Strava segments by ID or reuse from other challenges
- **Activate** — make the challenge visible and open for registration
- **Delete** — remove a challenge and all associated data

## Profile URL System

Each creator gets a public profile URL:

- **With Strava username:** `/c?slug=daveblackburn`
- **Without username:** `/c?slug=12345` (uses Strava athlete ID)

The profile page shows:
- Creator avatar and name
- All their challenges grouped by status (active, upcoming, past)

When logged in as the creator, the same page also shows the dashboard with Strava app settings and challenge management links.

## How It Works Technically

- Creator profiles are stored in DynamoDB with a `CREATOR#<id>` key pattern
- Username lookups use a `CREATOR_USERNAME#<username>` reference item
- The `GET /creators/{slug}` API endpoint serves public profile data
- Creator authentication uses the same Strava OAuth flow as riders, with `intent: creator_login` in the state parameter
- Creator JWTs include a `creatorSlug` claim for client-side routing
