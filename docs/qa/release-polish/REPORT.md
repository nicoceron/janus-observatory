# Shared world pages: release verification

Date: 2026-09-14. Branch: `codex/janus-first-light`. Local preview: <http://localhost:3000/>.

## Delivered

- Atlas, Observatory and all ten scenario records now share the story's space background and current 3D models. Static legacy scenario images are no longer requested by these views.
- Chakra Petch headings, Space Grotesk body text and IBM Plex Mono data replace the old typography throughout the site. Smaller analytical labels were increased to 12px minimum. The admitted typography and bundled license notices are recorded in `typography-ledger.json` and `font-build.json`.
- Shared inner navigation, research, methods, sources, privacy and accessibility pages use the dark visual system. The Story link returns to `/`; redundant motion controls appear only on Accessibility.
- Each new portrait uses a single canvas. Pointer dragging and Shift+arrow keyboard rotation work on desktop. Touch previews preserve page scrolling. Canonical scenario descriptions, comparisons, instrument state, downloads, citations and fallback controls are retained.
- Removed the root loading boundary that concealed static scenario records until JavaScript ran. All ten records are readable with JavaScript disabled. The 3D view remains a progressive enhancement.

## Performance evidence

Same 2.5-second idle S3 sample, same viewport and one browser at a time:

| Measurement                |    Before |     After |
| -------------------------- | --------: | --------: |
| Canvas attribute mutations |     2,088 |        22 |
| Sampled animation frames   |        87 |        86 |
| p95 frame interval         |   34.0 ms |   34.2 ms |
| Active canvas count        |         1 |         1 |
| Blender cache bytes        | 3,715,680 | 3,715,680 |

The improvement is 98.95% fewer diagnostic DOM mutations. It is **not** evidence of improved GPU frame rate. Actual motion, geometry, scroll choreography and per-frame pointer projection are preserved. Diagnostic JSON samples at 10 Hz; unchanged metadata writes are skipped.

Direct WebGL instrumentation of the new atlas portrait measured 1,664 draw calls in one visible second, zero offscreen, 2,208 after returning, and zero with reduced motion. Draw calls are not frames. This verifies parking and resumption, not a hardware-independent FPS claim. See `portrait-rendering.json` and its reproduction script.

Production bundle: 188,656 bytes of initial homepage JavaScript gzip (184.2 KiB), within the 250 KiB budget. Critical visual payload: 104,826 bytes. Conservative complete guided-path upper bound: 17,457,200 bytes, within 20 MiB. Deferred Three/R3F is accounted separately from initial JavaScript; all emitted chunks, fonts and guided assets are included in the journey upper bound. See `bundle.json` for the full accounting.

## Verification

- Production build, TypeScript and ESLint passed.
- 126 Vitest tests passed.
- 18 ingestion/Python tests and 48 resilience-lab tests passed; both Python linters passed. The committed independent resilience report also replayed exactly: 20,000 seeded runs for each of ten scenarios, verdict pass.
- Production Playwright: 50/50 passed across Chromium and mobile WebKit. Coverage includes 11 route/accessibility states, homepage/fallback, URL-driven instrument selection, four comparison dimensions, limits, downloads, sources, behind-Earth reveals, telescope passage and closing-Earth anchoring.
- Final portrait checks: 11 passed across Chromium, Firefox and mobile WebKit; one intentional skip for desktop-only keyboard rotation on touch. These checks exercise all ten previews, all ten no-JavaScript records, WebGL failure, cross-page navigation and keyboard rotation with an explicit reduced-motion preference.
- Twelve visual captures across desktop Chromium and mobile WebKit: no overflow, runtime page errors or automated WCAG A/AA violations. Representative routes: story, atlas, S6 record, S9 Observatory, methods and sources. Screenshots and `review.json` are stored alongside this report.
- Source manifest: 15 checksums validated. Generated data reproduction check and canonical validator passed. Asset validation: 107 rights records, 95 derivative records across 94 public files. Link/citation validation and deterministic research evaluation passed.
- Production `/api/health`: core operational; all ten scenarios available; Research live calls disabled. Receipt: `production-health.json`.

## Source and release boundaries

Canonical data remains `sha256:46a0e94a969301c49cfafe00463e5c7e9be5dce423ddcdeb21fe4ad0614d2046`. No generated scientific values, source versions or model implementation changed. The art receipt is `shared-worlds-v15-2026-09-14`; `art-source.json` contains its exact file list and checksum.

This is a verified local production build, not a deployment or signed public scientific release. The health endpoint still reports eight pending independent dataset reviews. Public promotion must satisfy the existing operations-runbook review gate. Live AI provider canaries and real-device Core Web Vitals were not claimed or run as part of this frontend change. Automated Axe does not replace manual assistive-technology review. Existing worktree changes were preserved; no commit, push or external deployment was performed.

## Changed-file ownership

Shared shell and typography: `apps/web/app/layout.tsx`, `globals.css`, `components/InnerPage.tsx`, `InnerPage.module.css`, `InformationPages.module.css`, `MotionPreference.tsx`, `accessibility/page.tsx`, `status.module.css`; root `loading.tsx` removed.

Current-world pages: `components/WorldPortrait.tsx`, `WorldPortrait.module.css`, `PortraitCanvas.tsx`, `atlas/WorldGallery.tsx`, `AtlasExplorer.tsx`, `atlas.module.css`, `atlas/page.tsx`, `atlas/[scenario]/page.tsx`, `observatory/ObservatoryExplorer.tsx`, `observatory.module.css`, `observatory/page.tsx`.

Supporting-page polish: `research/Research.module.css`, `sources/page.tsx`, `sources/SourceLedger.module.css`. Story font and metadata optimization: `voyage/voyage.module.css`, `Space.tsx`, `BlenderAssets.tsx`, `canvas-metadata.ts`.

Verification and rights: `apps/web/e2e/explorers.spec.ts`, `release-polish.spec.ts`, `apps/web/public/licenses/*`, `scripts/validate-links-citations.ts`, `scripts/record-world-art.ts`, `data/assets/ledger.json`, Decision 025 and this evidence folder. No new runtime dependencies or shared scientific schema changes.
