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
- `V79_MARKETING_LAUNCH_SECRET` — must match Hub launch-ticket signing
- `V79_HUB_PROVISION_SECRET` — dedicated Hub → Marketing provisioning/team-write secret
- `V79_PLATFORM_SHARED_SECRET` — read-only Hub summary/admin-read contract
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

Persistent application data is stored in the Docker volume `v79marketing_v79_data`, including:
- `v79_marketing.sqlite`
- SQLite WAL/SHM files when active
- pending platform event outbox records

This reuses the volume attached to the previous `v79marketing-app` service. A one-shot preparation container assigns the volume to the non-root application user before each startup. If your previous deployment used a host `./data` bind mount instead, back up and copy that data into this volume before switching; do not remove the host directory until a restore has been tested. Back up the volume consistently, including the database and its WAL files. The image only uses the production `DATABASE_PATH=/app/data/v79_marketing.sqlite`; check any override before migrating.

## Validation

```bash
npm ci
npm run lint
npm test
npm run build
docker build -t v79-marketing:test .
```

CI uses Node.js 22 because the current native SQLite dependency requires Node 22 or newer.

## Social provider integration

Public legal documents used by provider OAuth and app-review flows:
- Privacy Policy: https://v79sl.com/privacy
- Terms of Service: https://v79sl.com/terms
- Current provider-consent version: `2026-10-06`

V79 Marketing requires users to acknowledge both documents before a social/provider OAuth flow can begin and records the policy version and consent timestamp with the connection. Disconnecting a Google Business Profile or YouTube connection also revokes the Google OAuth authorization before the local provider record is deleted; if revocation fails, V79 keeps the local record so the user can safely retry.



V79 Marketing uses official OAuth flows and stores provider access/refresh tokens encrypted at rest. Set a unique `SOCIAL_TOKEN_ENCRYPTION_KEY` (32+ characters) before enabling any provider. Back up this key with the application secrets and do not rotate or discard it while provider tokens are stored; losing it makes those tokens unreadable and requires reconnecting the affected accounts.

Supported integrations:
- **Facebook Pages** — Meta OAuth and Page publishing.
- **Instagram Business** — Meta OAuth and image publishing through the Instagram Graph API. Publishing requires a publicly reachable HTTPS image URL.
- **LinkedIn Company Pages** — LinkedIn 3-legged OAuth and the Posts API. The integration defaults to Marketing API version `202609` (the latest version published as of October 2026) and can be advanced through `LINKEDIN_VERSION`. The developer app must be approved for the organisation permissions used by the integration.
- **TikTok** — Login Kit plus the Content Posting API. Direct Post requires approved `video.publish` access, explicit per-post privacy/commercial-content choices and media hosted on a verified URL/domain. Unaudited TikTok clients are subject to TikTok's visibility restrictions.
- **Google Business Profile** — Google OAuth with the `business.manage` scope and Local Posts API access.
- **YouTube Channels** — Google OAuth plus the YouTube Data API v3. V79 uploads a public HTTPS source video using a resumable YouTube upload session and stores the returned video ID. Users explicitly choose title, category, privacy, Made-for-Kids status and realistic altered/synthetic-media disclosure. Google restricts uploads from unverified API projects created after 28 July 2020 to private viewing until the project passes YouTube's API compliance audit. The server rejects private/internal source-video addresses and enforces `YOUTUBE_MAX_UPLOAD_BYTES` (1 GiB by default).

WhatsApp is intentionally not treated as a public social-feed publisher because the WhatsApp Business Platform does not provide a normal public feed/status publishing API. Customer messaging should be implemented as a separate messaging workflow.

Register these production callback URLs in the matching provider developer consoles:
- `https://marketing.v79sl.com/api/social-accounts/oauth/facebook/callback`
- `https://marketing.v79sl.com/api/social-accounts/oauth/instagram/callback`
- `https://marketing.v79sl.com/api/social-accounts/oauth/linkedin/callback`
- `https://marketing.v79sl.com/api/social-accounts/oauth/tiktok/callback`
- `https://marketing.v79sl.com/api/social-accounts/oauth/google_business/callback`
- `https://marketing.v79sl.com/api/social-accounts/oauth/youtube/callback`

Provider credentials are supplied through the variables documented in `.env.example`. A provider remains visibly unavailable until its credentials are configured; the application never simulates a successful connection or publication.

## Automatic server deployment

After a validated merge to `main`, the delivery workflow deploys the `v79-marketing` service through Tailscale and pinned SSH. Publication to GHCR alone never changes the server. In GitHub **Settings → Environments → production**, configure the secrets `TAILSCALE_AUTHKEY`, `DEPLOY_HOST` (the server's Tailscale address), `DEPLOY_USER`, `DEPLOY_SSH_KEY` (private deploy key), and `DEPLOY_KNOWN_HOSTS` (independently verified host key). Restrict who can change the production environment. Configure environment variables `DEPLOY_ROOT` (absolute existing server directory containing this app's Compose file and `.env`), `DEPLOY_PROJECT` (the current Compose project shown by `docker inspect`), and optional `DEPLOY_SSH_PORT` (default 22).

The deploy user needs Docker and `rsync` access and the server must already have `proxy_network`. Before enabling the workflow, back up the application's existing data, encryption keys, uploads, databases and `.env` and verify a restore. The script preserves `.env`, `data`, `uploads`, backups and existing `.git`; it updates the app in place, starts only `v79-marketing` and checks its HTTP readiness inside the container. It does not remove orphan containers or volumes. Source removed from Git may remain in the server directory because deployment intentionally does not delete unknown local files. A first merge will fail closed if a required secret, mount, project, or server directory is absent. Review Actions → deploy and record the `.deployed_sha` in the server directory after each successful release.
