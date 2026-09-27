# Galactic depth and chapter settling

The sky now has an original, diagonal galactic dust band, dark gaps and a concentrated subset of the existing 360 stars, with small halos around five bright stars. The black base remains dominant. Absolute story progress changes perspective and fades the band at the telescope reveal; reduced motion holds it still. No downloaded texture, canvas, filter, perpetual animation loop, model geometry or resolution changes.

Native wheel and touch scrolling now ease onto nearby chapter portraits once the gesture stops. The last departed portrait is excluded until the reader leaves its neighborhood, preventing small scroll gestures from being pulled backward. Settling can be interrupted immediately, does not push history or move focus, and excludes article chapters, reading mode, reduced motion and open inspectors. Index links and browser history retain the existing exact anchor targets.

Changed files: SpaceBackdrop.tsx, sky-pose.ts, voyage.module.css, use-journey-scroll.ts; new chapter-settle.ts and its unit tests; expanded deep-space.spec.ts; Decision 032; original-art recording script and ledger. All unrelated checkout changes are preserved. All new visual work is original interpretive art; canonical scientific data and citations are unchanged.

Verification receipts and deployment results are recorded below. The scope is desktop Chromium and emulated mobile WebKit, not a claim of physical-device testing on every device.

## Verification

- 142 unit tests passed. Lint, TypeScript, formatting, canonical-data, asset-rights and link checks passed.
- Fourteen browser checks passed across desktop Chromium and mobile WebKit: native capture/release, touch-held deferral, active-settle cancellation, reduced motion, deep links, reload, index focus/history, server/client SVG equality, telescope passage and closing Earth. The old hydration test assumed SVG attribute order and a single layer; it was corrected to compare all server-rendered star nodes against the hydrated nodes. No runtime hydration errors were found.
- Desktop and mobile screenshots were inspected (`chromium-s3.png`, `mobile-webkit-s3.png`). The galactic band stays behind the worlds, and black remains dominant. Mobile verification uses browser emulation.
- Initial JavaScript: 200,488 gzip bytes against a 256,000-byte budget. Cloudflare Worker: 2,770.43 KiB compressed against the Free 3,072 KiB limit. All 59 model files remain byte-identical: 18,675,760 original bytes, 10,068,703 compressed transfer bytes. No resolution adaptation or geometry reduction was introduced.

## Release

Cloudflare version 70784ad8-f90d-4862-95ed-eb85ccca6701, deployed 2026-09-21T02:51:44.934827Z, serves 100% of traffic. Public verification passed for 20 pages, 59 lossless model checksums, three downloadable artifact hashes, operational health and the missing-route 404. The live browser was reopened on S3 for visual verification.
