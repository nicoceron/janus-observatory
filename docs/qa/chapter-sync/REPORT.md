# Synchronized narrative and worlds — 20 September 2026

## Result

The scenario heading, description, statistics and exploration link now share the planets' absolute chapter presentation. Their complete semantic DOM node stays centered in the left composition when it fits, holds with its world, and fades through the same handoff curve. Three.js and the sky no longer independently smooth the same scroll position. GSAP retains ownership of explicit anchor travel and magnetic settling.

Mobile, short viewports, reduced motion and the reading fallback retain normal document flow. The spatial scene holds its world while the measured paragraph is brought into view. Text exists once, remains server-rendered, and inactive staged links are inert. Layout and font changes remeasure outside the scroll frame. No dependency, model, canonical data, scientific claim or rendering-resolution changes.

Assumption: preserve the approved planets, layout, background art and native scroll behavior; correct their relationship to the narrative instead of redesigning them. See Decision 033 for the implementation and documentation references.

## Verification

- 144 unit tests across 39 files passed. Typecheck, lint, scoped formatting, source, canonical data, asset/rights, local-link and bundle validation passed. The existing published growth-rate discrepancy remains explicitly recorded.
- Desktop Chromium and mobile WebKit: shared text/planet/sky progress, forward and reverse handoffs, precise portrait landings, deep links, history, interruptible settling, held touch, reduced motion, short viewports, companion reveal, telescope passage and closing Earth ownership passed.
- Keyboard navigation, JavaScript-disabled narrative, WebGL failure/retry, and guided/fallback automated WCAG A/AA scans passed on both projects. These scans do not replace a complete manual accessibility audit.
- Initial testing found stale departure state when touch input preceded the next animation frame. Departure state now reconciles at input time as well as on the frame; the failing mobile settling regression passed after the fix.
- Two old browser assertions were updated: companion sampling starts after the mobile reading hold, and the fallback assertion identifies the semantic background container instead of assuming one SVG. Both passed on rerun. Combined final coverage comprises 28 distinct browser cases.
- Reviewed desktop anchor and transition captures and mobile reading capture in this directory. No claim of testing every physical device or of a new GPU performance benchmark.
- Release build passed: 201,382 bytes initial JavaScript gzip against 256,000 bytes; 2,783.1 KiB compressed Worker against the 3,072 KiB Free limit. All 59 GLBs are unchanged: 18,675,760 decoded bytes / 10,068,703 lossless transfer bytes.

## Ownership and provenance

Changed this turn: `apps/web/app/page.tsx`; voyage `use-journey-scroll.ts`, `scroll.ts`, `scroll.test.ts`, `Space.tsx`, `SpaceBackdrop.tsx`, `voyage.module.css`; browser checks `chapter-sync.spec.ts`, `organic-reveal.spec.ts`, `story.spec.ts`; Decision 033; original-art recorder, asset ledger and this QA directory. Unrelated working-tree changes were preserved.

Original code-art provenance: `chapter-sync-v23-2026-09-20`, source SHA-256 `b0dea3ce163a0a42652cc1dbe306bf5182861e7a651082bd7f2a79c74f0f0b29`, recorded in `art-source.json`. Existing generated data and source versions are unchanged; 15 source checksums and 1,361 exact factual provenance fields validated. No new media or rights assumptions.

## Public release

Published at 2026-09-21 04:15:41 UTC to [Janus Observatory](https://janus-observatory.nicocerond.workers.dev/#s3). Version `1015d237-78ed-47d5-a4dd-316675259c56` serves 100% of traffic; see `deployment.json`.

Public verification passed for 20 pages, all 59 compressed and decoded model hashes, three downloadable artifact checksums, health and 404 handling. The in-app browser confirmed the deployed S3 composition and matching forward/reverse S3–S4 text/world transitions. Local browser checks ran against the identical release artifact. The existing ignored process-only DNS resolver fallback was used for Cloudflare CLI and verification requests; no TLS, network configuration or access permissions changed.
