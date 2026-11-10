# V79 Campaign Studio — immutable private review (draft PR #34)

This is a **development-only** capability. It does not merge or deploy anything.

## Product decisions and /REDTEAM

Options reviewed:
1. Embed binary media directly in mutable campaign JSON — rejected: changing a campaign could silently change media under an old approval.
2. Separate immutable creator-owned media blobs and signed exact review manifests — **selected**. It supports independent versions, strict ownership, byte-level integrity and bounded retrieval.
3. Reuse the founder-only production scheduler for arbitrary customer approvals — deferred: the current signed production path only authorises the founder and must not be widened without multi-user entitlement, account selection and lease design.

## New private Studio security model

- Each asset is a server-generated UUID and immutable SQLite BLOB, scoped to the authenticated business ID, user ID and campaign whose creator-owned skill pin must validate. Only PNG/JPEG and MP4 are accepted, with bounded size and container sanity checks; SVG layouts are rasterised in the browser to PNG.
- Each review package is an immutable new revision. It includes the creator's already-pinned skill digest, SHA-256 of every media asset, exact caption, channel, optional **creator-owned** OAuth destination fingerprint and proposed UTC schedule. The server signs the whole package with the **separate** `V79_MARKETING_STUDIO_REVIEW_KEY`.
- Each exact creative review receipt HMAC-binds that package digest, reviewer user ID and review instant. This receipt is **CREATIVE_REVIEW_ONLY**. It never authorises external publishing, spends credits, requests a cloud model, queues a post, or converts a campaign to `SCHEDULED`.
- Every asset read and review is authenticated. Never trust caller-supplied business/user IDs. Cross-member access, account substitution, bad signatures and stale digests fail closed.
- Social OAuth callback now stores `connected_by_user_id` based on the initiating Hub user. Older business-wide accounts retain NULL owner until explicitly reauthorised. Do not assign them automatically.
- The legacy general publishing worker remains **real-publishing disabled** during this PR; isolated non-production simulated publishing tests still execute. The distinct founder-only production workflow retains its explicit flags.

## Operational constraints

- Configure a unique 32+ character `V79_MARKETING_STUDIO_REVIEW_KEY` before enabling signed private review. Protect it in encrypted backups; loss breaks verification of existing signatures.
- Media limits: up to 8 assets per campaign, 24 MiB aggregate; 2 MiB per still image, 7 MiB per video; up to 32 immutable package revisions. Review/asset storage is in the Marketing SQLite volume; do backup/restore and capacity tests before rollout.
- Review packaging is a two-step transaction boundary: campaign creation, then media upload and package. A failed upload leaves a private plan only; retries must use the returned same campaign ID, not create a duplicate plan.
- Local rendering produces static branded layouts and captioned motion compositions. It must not be described as AI-generated photography or new AI video footage.
- A stored BYOK key does not imply a verified connection or spending permission. All cloud generation remains explicitly opt-in and disabled by default.

## Release blockers that still matter

1. **Real browser acceptance**: desktop and mobile auth flows, PNG rasterising, MP4 playback, Stage 3 review, error/retry and accessibility using isolated tenant accounts. Do not substitute mocked browser or file screenshots.
2. **Publication bridge**: production-grade separate approver identity/role and exact approval; signed package digest must be carried into the publish queue together with verified service claims, destination ID, provider account fingerprint and chosen schedule.
3. **Revalidation at worker dispatch**: original creator's current Hub entitlement, selected account ownership, OAuth generation, provider permissions, verified facts, budget allowance, and approved bundle hash. Review is not authority to publish.
4. **Concurrency and reconciliation**: lease atomicity across multiple worker processes, provider idempotency when supported, durable uncertain-outcome receipts, explicit operator reconciliation before retry; never requeue an unknown provider result automatically.
5. **Media integrity**: decoder/FFprobe validation of uploaded customer media, malware/metadata handling, content moderation and platform duration/size requirements; current bounded container checks are necessary but not sufficient for release.
6. **Operations**: secret/DB/volume backups and restore, failover, quota safeguards, rollback to prior image without data loss, cost reporting and owner approval.

## Automated tests

`tests/studioCampaignAssets.test.ts` covers ownership isolation, immutable binary reads, signed package tampering, unchanged review receipts, new revisions after edits, cross-member OAuth account blocking, and no publication authority.

Other existing suites cover skill ancestry, concurrent drafts, creator pinning, BYOK isolation, local FFmpeg test encoding, and founder-only signed production workflow.

**Browser and external provider acceptance must be reported separately from CI.**
