# Frontend fixes — November 12, 2026

Implemented on `sanjana/frontend-redesign` following the frontend audit.

## Changes

- `capstone-frontend/` is the canonical application. The local parent workspace's
  npm scripts now forward to it, and both READMEs identify the older parent copy.
  The parent wrapper is outside this Git repository and is a local workspace fix.
- Recording routes resolve the requested visit and preferences before mounting
  capture controls. Failed/unknown visits show an error with retry and return
  actions. Existing IDs cannot fall through to new encounter creation. Changing
  the recording route's session ID resets the studio's encounter state.
- Dialogs use dynamic viewport height limits and internal scrolling. Checked the
  approval dialog at 375 × 667: title and close button start on screen, and the
  confirmation buttons are reachable by scrolling inside the dialog.
- A shared route layout restores scroll positions, resets new destinations to
  the top, and focuses the main content after page changes. Query-only filter
  changes retain focus. A route error page provides recovery from rendering or
  route chunk failures.
- Capture applies the saved report template and chooses a matching built-in or
  USB microphone when available, otherwise the default device. Existing visits
  retain their own report template. Compact density changes workspace/card
  spacing while preserving text and control sizes.
- Settings and Administration distinguish request failures from loading, zero
  counts, or empty audit results, with retry actions.
- Workspace routes load page modules on demand. The previous 909 KB monolithic
  bundle is split across page and shared chunks, with no chunk over 500 KB.
- Recording route resolution, encounter/consent forms, and studio logic are now
  separate components. Session pipeline/lifecycle panels were extracted from the
  review page. Further controller extraction can be done incrementally.
- TypeScript cache files are ignored and the production build uses a no-emit
  typecheck. `docs/frontend-checks.yml.example` contains a GitHub Actions template
  for typecheck, lint, tests, and build. GitHub rejected publishing an active
  workflow because the saved token lacks `workflow` scope. Copy the template to
  `.github/workflows/frontend-checks.yml` through GitHub or a token with that scope
  to enable CI.

## Verification

- 71 Vitest tests, including failed/slow visit lookups, retry, parameter changes,
  saved preferences, device selection, failed settings/admin requests, route
  errors, and navigation focus/scroll.
- Typecheck, lint, and production build pass.
- Browser checks cover mobile dialog scrolling and Escape dismissal, invalid
  recording URLs, footer navigation, and saved settings.

## Remaining integration work

Real authentication, upload/transcription/AI, and privacy verification still need
the backend services. GitHub Pages hosting is a separate deployment change.
