# Marketing appearance, shared business identity and profile media — release review

Date: 2026-11-09. **Status: source prepared, NOT deployed.**

## Goal and scope

1. Persistent Marketing light/dark control with legible forms, cards, navigation, modals, status badges, branding and responsive layouts.
2. On owner-authorised Marketing business-name save, update canonical Hub organisation first. Fail closed if Hub rejects it. Subsequent Hub app launches must read the canonical name.
3. Business Brain → Stored Customer FAQs: import CSV using Question,Answer (or Q,A), review duplicates, then explicitly select **Save Brain** to persist.
4. Business Profile Management: upload PNG/JPG/WebP logos (max 1 MB) and banners (max 3 MB), preview, then select **Save Profile**. Files live in tenant-scoped persistent storage.

## Red-team checks before production

- **Do not merge until checking the actual running source tree.** Production has uncommitted changes and a newer image; this repository's main-branch CI/CD publishes and deploys automatically. A blind merge may roll back important features.
- Marketing requires the companion V79hub signed organisation rename endpoint. Deploy Hub first, then Tiquet and Marketing; Tiquet must update Settings.name on each Hub login.
- Verify name propagation for POS, FFPRO, Academy and other Hub apps. Hub canonical update does not guarantee every cached client updates immediately. Do not claim this is fully fixed without application tests.
- Check Hub owner role, signed requests, exact tenant mapping, cross-tenant rejection, replay behaviour, Hub downtime, persistence failures and concurrent saves.
- CSV: test CRLF, quoted fields/newlines, BOM, empty/duplicate rows, size and the 100-stored-FAQ server limit. Imported FAQs remain unsaved until Save Brain.
- Media: test magic-byte mismatches, SVG rejection, path traversal, tenant access, upload limits, public image retrieval and safe rendering. Files are public to serve storefronts; names are unguessable UUIDs.
- Appearance: inspect all authenticated Marketing pages at phone/tablet/desktop widths, including menus, notifications, tables, controls, errors and overlays. Existing dark-theme !important rules need browser regression checks.

## Required release sequence

1. Restore remote server access, back up Marketing/Hub/Tiquet source, images and persistent data; record exact deployed image SHA.
2. Rebase changes onto actual production source. Preserve new Marketing Studio, Google login, publishing controls, current app icons and customer data.
3. Run lint, unit/integration tests, builds, security checks, signed Hub integration tests, and browser visual tests in both themes.
4. Test name propagation with an isolated tenant across apps, FAQ CSV import and media upload/download.
5. Deploy Hub first, then Tiquet, then Marketing with pinned images and automatic rollback.
6. Verify real live customer flows and keep rollback checkpoints.

## Current blocker

Desktop Commander was online earlier but repeatedly timed out and reported only 2% remote call allowance left. No production changes were made for this request. Feature branches are review/testing preparation only.


## Update — exact-source recovery and CI evidence (9 Nov 2026)

**Production-source provenance resolved.** The GitHub branch `review/production-readiness-20261107` at `4f9ba4e` exactly matches the live image built on 7 November: all 44 backend source-map entries match, and its rebuilt frontend JS SHA-256 `2802e559891b0f8bf8c77eccb837a6cb18faa2826285a61c26bffc0ac35e570a` matches `index-CgEccd_q.js` in the running production image. The former missing Studio, media-provider, and publishing modules are present.

**Current feature review:** PR #39 is a 12-file feature-only diff on the exact production source; PR #38 is the broader main-branch reconciliation and full CI gate. Source changes include a single theme toggle across Studio and legacy routes, adjusted muted text and tinted-panel colours, protected full-logo rendering, CSV FAQ import, raster image uploads, and Marketing→Hub signed owner-only organisation rename. A later update also adds an explicit async error boundary to the Marketing profile route, including truthful partial-success messaging when Hub accepted a rename but local storage fails.

**Validated:**
- Exact-source TypeScript, frontend and server bundle builds: PASS in isolated staging.
- Newly added FAQ CSV and media-image tests: 8/8 PASS.
- Dependency audit (production scope): 0 reported vulnerabilities.
- GitHub CI/CD, REDTEAM, Studio browser tests, Studio image/video journey and desktop/mobile acceptance: PASS on the exact-source candidate. Check latest PR head when preparing to deploy.
- Local server host full-suite: 181/184, with three FFmpeg command-not-found failures. An isolated container with FFmpeg reached 182/184 but two media-rendering tests failed due to its containerised FFmpeg working-directory/filter setup; GitHub's native FFmpeg runner provides the authoritative CI result.

**Cross-app naming:** Hub PR #244 adds canonical name persistence, tenant-scoped event broadcast and live Hub label refresh. Tiquet PR #61 refreshes both account and Settings names on the next Hub launch. POS already updates tenant names during its Hub provisioning path. FFPRO/Academy must be audited in a real customer flow before asserting every app is synchronised.

**Outstanding release gates:**
1. Hub PR #244 fails the protected accepted-blob contract for its changed server/App source. Do not update pinned accepted blobs without a separately approved new release candidate. Other Hub isolation/security checks pass.
2. Fully test the multi-repository Marketing→Hub→Tiquet name change in isolated customer accounts and demonstrate no cross-tenant leakage.
3. Restore controlled server execution access (Desktop Commander monthly quota exhausted). Pin exact source and images, verify env and volume preservation, take fresh backups, and prepare rollback.
4. Perform authenticated page-by-page light/dark checks and real FAQ/media submissions after deployment. Never claim these live checks passed solely from CI.

**Release state: NOT DEPLOYED; drafts only.**
