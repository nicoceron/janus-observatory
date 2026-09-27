# Story cleanup verification — 2026-09-14

Implemented [Decision 023](../../DECISION_023_STORY_CLEANUP.md). Main changes: `app/page.tsx`, `voyage/Voyage.tsx`, `voyage/Inspector.tsx`, `voyage/voyage.module.css`, `components/MotionPreference.tsx`, accessibility copy, Next configuration, and the version-pinned Fiber patch. Updated functional tests to reflect removed controls. Art lineage is recorded in `art-source.json` and the asset ledger; existing geometry and canonical data are unchanged.

## Verified

- 124 unit tests across 34 files, including a real Fiber root-store Timer test.
- Type checking and ESLint.
- Next production build (Playwright web-server build), followed by production browser tests using one worker.
- Ten focused cases across desktop Chromium and mobile WebKit: cleaned UI with full motion despite stored/system reduction, clickable Luna and inspector rotate/zoom/Escape, moving observer and telescope entry, organic reveal/backscroll, keyboard chapter navigation, WebGL failure/retry and no-JavaScript narrative/table fallback.
- First pass: 8 passed, 2 mobile assertions failed because Safari rounded the scroll anchor to scene 3.999 instead of 4.000. Changed those continuous-progress assertions to numeric tolerance of 0.005; both passed on rerun. No scene behavior was changed to satisfy the tests.
- Inspected desktop hero/S3 and mobile S3 captures. Reloaded the user's `localhost:3000` in-app preview: scene ready, removed toolbar/captions absent, no warning/error entries after reload.
- Canonical data validation, link/citation validation, asset rights validation and bundle budgets. Known published growth-rate discrepancy remains explicitly separate in canonical data.

Captures: `chromium-hero.png`, `chromium-s3.png`, `chromium-observer.png` and corresponding `mobile-webkit-*.png`. Original scene animation and all source-selected companion bodies remain available. No Blender rerender, new models, texture downloads or additional canvases were introduced.

## Limits

The full historical browser matrix and Linux-pinned visual snapshot suite were not rerun. Old reading-mode screenshot baselines and historical Blender QA capture scripts refer to the superseded reduced/pause controls; this pass uses the new full-motion browser contract and captures instead. Automated checks are not a claim of full WCAG conformance: the user explicitly chose unconditional homepage motion. Research-page preferences and the Atlas remain available. The Timer patch requires review on a Fiber/Three upgrade. No deployment or commit was performed.
