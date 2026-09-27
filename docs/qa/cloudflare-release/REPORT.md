# Fixed-resolution optimization and live Cloudflare release

Live: https://janus-observatory.nicocerond.workers.dev

Deployed version: `eefb2bef-619a-4635-9f78-af7d8d5bc9e9`, verified at 100% in Wrangler's deployment listing. Existing account remains on Workers Free ($0). No paid plan, storage service, AI provider or domain purchase was added. Direct upload publishes the current working checkout; the unrelated old Git build configuration remains documented in DEPLOY.md.

## Changes

- Removed AdaptiveResolution and retained the existing fixed 1–1.5 DPR on both canvases. Tests verify the drawing buffer does not shrink during animation. Desktop portrait: 1,033 × 840; mobile portrait: 513 × 480, at their respective CSS sizes.
- All 59 models keep identical decoded bytes. Gzip variants total **8,233,438 bytes**, versus **15,790,272 bytes** for the originals: **47.9% less model transfer** in supported browsers. Original GLBs remain available for older browsers. Checksums of both variants are recorded in model-transfer.json and verified after public download.
- Meshopt decodes on one worker, then releases it after five idle seconds. Browsers without workers use the same decoder. Existing serial loading and bounded model caches remain. Static local model matrices are reused, animated parent/world matrices still update, and unused procedural terrain is no longer allocated behind loaded Blender terrain.
- Official Next Link `prefetch={false}` is centralized in AppLink. The OpenNext/Next 16.3 speculative-prefetch loop reproduced 11,704 requests in a failed local Firefox trace; regression checks now require **zero speculative requests**, while actual navigation still works.
- Next 16.3.3 + OpenNext 1.20.6 + Wrangler 4.131.2 preserve the existing application and APIs. Read-only Static Assets caching avoids paid persistence. Downloads use the asset binding and retain their canonical manifest checks. Local environment credentials are removed from the adapter's generated environment module and excluded by a post-bundle scan.

## Verification

- Production build, TypeScript, ESLint, Prettier, **127 unit tests**: passed.
- Asset admission: **107 rights records, 95 derivative records, 94 public files**; source validation: **15 records/checksums**; canonical data validation and **110 route files / 196 citation chunks**: passed. Existing published-growth-rate discrepancy remains separately represented; scientific data was not changed.
- Initial homepage JavaScript **197,059 gzip bytes / 256,000 budget**. Worker **2,769.68 KiB / 3,072 KiB Free limit**, recorded startup **43 ms**. Local credential scan passed.
- Local Workers runtime: Chromium, Firefox, WebKit, mobile Chromium and mobile WebKit exercised model loading, fixed resolution, worker cleanup, older-browser fallbacks, URL state, comparisons and exports. Initial full sweep: 72 passed, 2 intentional mobile skips, one Firefox navigation timeout. After resolving the real prefetch loop, the navigation test was also changed to exercise actual 404-to-Atlas header navigation instead of a second automation-forced load of an already visited URL; its focused Firefox rerun passed both cases. The final public suite verifies that same recovery flow.
- **Public HTTP audit passed:** 20 pages, health, 404, all 59 compressed-model hashes with decoded-byte verification, and all three export hashes. See public-verification.json.
- **Public browser suite: 29 passed, one intentional mobile-only skip.** Chromium, Firefox and mobile WebKit verified shared navigation, all ten current world selections, matching records, fixed resolution, no prefetch loop, decoder shutdown, original-model fallback without DecompressionStream/Worker, no-WebGL controls, all ten records without JavaScript, desktop keyboard rotation and reduced motion.
- Desktop and mobile rendered Atlas captures inspected; approved geometry, activity and typography retained. PNGs accompany this report.

## Boundaries

The Free account's worker request and CPU limits still apply; asset requests bypass the application worker. No claim is made that every physical device reaches the same frame rate. The earlier 18-to-32 FPS claim depended on reduced supersampling and does **not** apply to this release. This release's measurable gains are model transfer size, elimination of speculative request loops and removal of avoidable decode/transform/allocation work, with unchanged drawing resolution.

Canonical independent review remains pending, accurately disclosed by the health response. Live AI remains disabled. Python/scientific ensemble computation was not changed or rerun for this frontend/deployment change. Original model files and generated scientific data are unchanged.

See Decision 027 for architecture/dependency rationale, DEPLOY.md for repeatable commands, deployment.json for the deployment/rollback identifiers, bundle.json for the free-tier guard, and art-source.json for the current original-art receipt.
