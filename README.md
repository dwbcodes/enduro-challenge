# Fitness Challenge Platform

A multi-tenant Strava-based fitness challenge platform. Creators set up challenges with tracked Strava segments — rider times are synced automatically and ranked across activity type, sex, and age group categories. Each creator gets a public profile page showcasing their challenges.

## Architecture

```
pnpm monorepo
├── packages/domain          Pure TypeScript domain layer (entities, repository interfaces)
├── packages/application     Use cases — commands and queries
├── packages/infrastructure  DynamoDB adapters + Strava API client
├── packages/functions       AWS Lambda handlers
├── apps/web                 Next.js static site → S3 + CloudFront
└── infra/                   AWS CDK (IaC)
```

**AWS Services:** Lambda · HTTP API Gateway · DynamoDB · SQS · S3 · CloudFront · SSM Parameter Store

---

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- AWS CLI configured (`aws configure`)
- AWS CDK CLI (`npm install -g aws-cdk`)
- A Strava API application ([create one here](https://www.strava.com/settings/api))

---

## 1. Install Dependencies

```bash
pnpm install
```

---

## 2. Create SSM Parameters

All secrets are stored in AWS SSM Parameter Store. Create these before deploying:

```bash
# Strava API credentials (from your Strava app settings)
aws ssm put-parameter --name /enduro/strava/client-id \
  --value "YOUR_STRAVA_CLIENT_ID" --type String

aws ssm put-parameter --name /enduro/strava/client-secret \
  --value "YOUR_STRAVA_CLIENT_SECRET" --type SecureString

# A random string you choose — used to verify Strava webhook subscription
aws ssm put-parameter --name /enduro/strava/webhook-verify-token \
  --value "$(openssl rand -hex 16)" --type SecureString

# A random secret for signing JWTs
aws ssm put-parameter --name /enduro/jwt-secret \
  --value "$(openssl rand -hex 32)" --type SecureString

# Your CloudFront URL (update after first deploy)
aws ssm put-parameter --name /enduro/frontend-url \
  --value "https://your-cloudfront-url.cloudfront.net" --type String

# Comma-separated Strava athlete IDs that get admin access
aws ssm put-parameter --name /enduro/admin-athlete-ids \
  --value "60532" --type String
```

---

## 3. Bootstrap CDK

Only required once per AWS account/region:

```bash
cd infra
npx cdk bootstrap
```

---

## 4. Deploy Backend

```bash
# From repo root
pnpm deploy

# Or from infra/ directly
cd infra && npx cdk deploy --all
```

After deploy, note the outputs:
- `EnduroApi.ApiUrl` — your API Gateway URL
- `EnduroFrontend.CloudFrontUrl` — your public site URL

Update the SSM `/enduro/frontend-url` parameter with the CloudFront URL, then redeploy the API stack:

```bash
aws ssm put-parameter --name /enduro/frontend-url \
  --value "https://YOUR_CLOUDFRONT_ID.cloudfront.net" \
  --type String --overwrite

cd infra && npx cdk deploy EnduroApi
```

---

## 5. Register the Strava Webhook

This is a one-time setup. Replace the placeholders with your values:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_STRAVA_CLIENT_ID \
  -F client_secret=YOUR_STRAVA_CLIENT_SECRET \
  -F callback_url=YOUR_API_GATEWAY_URL/webhook \
  -F verify_token=YOUR_WEBHOOK_VERIFY_TOKEN
```

Strava will call your `/webhook` endpoint to verify it. If successful you'll get back a subscription ID — save it somewhere.

---

## 6. Configure the Frontend

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://your-api-gateway-url      # from CDK output EnduroApi.ApiUrl
NEXT_PUBLIC_STRAVA_CLIENT_ID=60532
NEXT_PUBLIC_ACTIVE_CHALLENGE_ID=                       # fill in after creating first challenge (step 8)
NEXT_PUBLIC_SEGMENT_IDS=                               # fill in after adding segments (step 8)
```

---

## 7. Build and Deploy the Frontend

```bash
cd apps/web
pnpm build          # generates apps/web/out/

cd ../../infra
npx cdk deploy EnduroFrontend
```

---

## 8. Create Your First Challenge

Log in to the admin panel at `https://YOUR_CLOUDFRONT_URL/admin` using Strava OAuth with an admin athlete account. Then:

1. **Create Challenge** — set name, description, start/end dates
2. **Activate Challenge** — make it live
3. **Add Segments** — provide the Strava segment ID, name, distance, and elevation gain for each tracked segment

Once segments are created, copy their IDs (shown in the admin panel) into `NEXT_PUBLIC_SEGMENT_IDS` in your `.env.local` and redeploy the frontend.

---

## 9. Add Your Strava App's Redirect URI

In your [Strava app settings](https://www.strava.com/settings/api), set the **Authorization Callback Domain** to your API Gateway domain (without `https://`), e.g.:

```
abc123.execute-api.us-east-1.amazonaws.com
```

---

## Creator Onboarding

Creators sign up by authenticating with Strava on the `/creator` page. This creates a Creator entity and redirects to their profile at `/c?slug=<username>`. From the dashboard, creators:

1. Set up their own Strava API application credentials
2. Create challenges with segments, dates, and activity types
3. Share their profile URL for riders to discover and join challenges

Each creator's challenges appear on their public profile page and in the main challenge directory on the homepage.

---

## Development

```bash
# Run Next.js locally
pnpm dev

# Type-check all packages
pnpm build

# Deploy only the API stack
cd infra && npx cdk deploy EnduroApi

# Deploy only the frontend
cd infra && npx cdk deploy EnduroFrontend
```

---

## Project Structure Detail

| Path | Purpose |
|------|---------|
| `packages/domain/src/` | Entities, value objects, repository interfaces — no external deps |
| `packages/application/src/commands/` | Write operations (register racer, add segment, process activity) |
| `packages/application/src/queries/` | Read operations (get leaderboard, get racer results) |
| `packages/infrastructure/src/dynamodb/` | DynamoDB single-table adapters |
| `packages/infrastructure/src/strava/` | Strava API client (OAuth, token refresh, activity fetch) |
| `packages/functions/src/strava-webhook/` | Webhook verification + SQS dispatch |
| `packages/functions/src/process-activity/` | SQS consumer — updates best times + leaderboards |
| `packages/functions/src/strava-oauth-callback/` | OAuth callback → create racer → issue JWT |
| `packages/functions/src/get-leaderboard/` | Public leaderboard endpoint |
| `packages/functions/src/get-creator-profile/` | Public creator profile + their challenges |
| `packages/functions/src/admin/` | Protected admin CRUD endpoints |
| `packages/functions/src/shared/container.ts` | Dependency wiring (repos → handlers) |
| `infra/lib/stacks/database-stack.ts` | DynamoDB table + GSI1 + GSI2 |
| `infra/lib/stacks/api-stack.ts` | All Lambdas, API Gateway, SQS, IAM |
| `infra/lib/stacks/frontend-stack.ts` | S3 bucket + CloudFront + static deploy |

---

## DynamoDB Single Table Design

| Entity | PK | SK |
|--------|----|----|
| Challenge | `CHALLENGE#<id>` | `#META` |
| Segment | `CHALLENGE#<challengeId>` | `SEGMENT#<id>` |
| Strava segment ref | `STRAVA_SEG#<stravaId>` | `#REF` |
| Racer profile | `RACER#<id>` | `#PROFILE` |
| Strava token | `RACER#<id>` | `#TOKEN` |
| Best result | `RESULT#<segmentId>` | `RACER#<racerId>` |
| Leaderboard entry | `LEADERBOARD#<segId>#<category>` | `RACER#<racerId>` |
| Creator | `CREATOR#<id>` | `#PROFILE` |
| Creator username ref | `CREATOR_USERNAME#<username>` | `#REF` |

**GSI1** — string sort, used for racer lookup by Strava athlete ID and result lookup by racer.
**GSI2** — numeric sort on `elapsedTimeSeconds`, used for sorted leaderboard reads.

---

## Leaderboard Categories

| Category | Who |
|----------|-----|
| `OVERALL` | All registered racers |
| `MTB` | Mountain bike racers only |
| `EBIKE` | eBike racers only |
| `AGE_U30` | Under 30 |
| `AGE_30_39` | 30–39 |
| `AGE_40_49` | 40–49 |
| `AGE_50_59` | 50–59 |
| `AGE_60_PLUS` | 60 and over |
