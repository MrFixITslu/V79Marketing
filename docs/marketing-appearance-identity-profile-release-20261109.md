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
