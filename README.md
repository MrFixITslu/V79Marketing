# V79 Marketing

V79 Marketing is the growth and campaign module in the V79 Digital business platform.

## Access model

Customer access is managed by **V79 Hub**. V79 Marketing does not provide public business registration or a separate customer subscription.

1. A business signs in to V79 Hub.
2. Hub checks the organisation subscription and the Marketing entitlement.
3. Hub issues a single-use, short-lived launch ticket.
4. V79 Marketing verifies the ticket with Hub, provisions or updates the organisation workspace, and creates its local application session.
5. Marketing remains the system of record for campaigns, posts, customer pipeline data and brand context.

The launch-ticket bridge is intentionally transitional. It is not described as full OIDC SSO. A standards-based V79 identity layer can replace it without merging product databases.

## Product boundaries

V79 Hub owns:
- organisation identity and membership
- subscription state and product entitlements
- cross-product business timeline and action signals

V79 Marketing owns:
- business marketing profile and memory
- campaign plans
- content drafts and schedules
- marketing customer pipeline
- channel connection metadata
- marketing analytics derived from verified provider data

V79 Marketing sends privacy-minimised lifecycle events to Hub. Customer names, phone numbers, email addresses and post content are not placed in Hub events.

## Truthful data policy

Production does not simulate social publishing, followers, reach, reviews, competitor metrics or payment completion.

Scheduled content remains queued until an official provider adapter is configured. Review and competitor features do not manufacture data when a provider is not connected.

## Required environment

Copy `.env.example` to `.env` and set strong, unique secrets.

Key variables:
- `JWT_SECRET` — 32+ characters
- `V79_HUB_INTERNAL_URL`
- `V79_HUB_PUBLIC_URL`
- `V79_MARKETING_LAUNCH_SECRET` — must match Hub
- `V79_PLATFORM_SHARED_SECRET` — read-only Hub summary contract
- `V79_HUB_EVENT_URL`
- `V79_HUB_EVENT_SECRET` — Marketing-specific event secret
- `GEMINI_API_KEY` — optional AI provider key

Keep `V79_ALLOW_LEGACY_LOGIN=0`, `V79_MARKETING_SEED_DEMO=0` and `V79_ENABLE_SIMULATED_PUBLISHER=0` in production.

## Docker deployment

The production Compose service joins the external `proxy_network` and exposes port 3070 only inside Docker.

```bash
cp .env.example .env
# edit .env
docker compose up -d --build
docker compose ps
```

Configure Nginx Proxy Manager:

`marketing.v79sl.com -> v79marketing-app:3070`

Use HTTPS.

## Data and backups

Persistent application data is stored under `./data`, including:
- `v79_marketing.sqlite`
- SQLite WAL/SHM files when active
- pending platform event outbox records

Back up the complete `data` directory consistently.

## Validation

```bash
npm ci
npm run lint
npm test
npm run build
docker build -t v79-marketing:test .
```

CI uses Node.js 22 because the current native SQLite dependency requires Node 22 or newer.

## Current provider boundary

V79 Marketing currently prepares and queues content. Official social-network publishing requires provider OAuth applications and credentials. The application refuses to report an unverified channel as connected or a queued item as published.

