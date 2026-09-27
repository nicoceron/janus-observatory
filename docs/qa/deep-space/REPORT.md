# Deep space and scroll polish — 20 September 2026

## Changes

The story sky now uses a black base with faint chapter-specific blue, amber and violet light. Two SVG star layers move at different depths; their gradients and stars are prepainted and animate through transform/opacity. The existing spatial star field follows the journey with a restrained change in perspective. No new canvas, blurred filter, image download, or resolution reduction.

Planet handoffs use quintic easing and a shallow spatial arc. Complete portrait anchor poses, behind-Earth companion reveals, telescope travel and the section-owned closing Earth are preserved. Rendering settles to exact targets rather than leaving a floating-point residue.

One measured anchor map drives native scrolling, index buttons, chapter links, shared URLs, reload and browser history. GSAP ScrollToPlugin is from the existing installed dependency. Deliberate anchor travel is eased and immediately interruptible by wheel, touch, pointer or navigation keys. Native wheel/touch behavior remains intact. Reduced-motion anchor travel is immediate and the background remains still. URL/focus commit only after an anchor arrival.

Safari's CSS-pixel rounding is handled within one pixel of an anchor. History restoration handles the hash event after native persisted-scroll restoration, including return to the opening URL without a fragment. Browser scroll-restoration settings are preserved.

## Verification and limits

- Lint, typecheck and 140 unit tests passed. Source, canonical data, rights/assets, local links and bundle checks passed. The existing documented published growth-rate discrepancy is unchanged.
- Browser regression covered desktop Chromium and mobile WebKit: fixed resolution, navigation parity, no-JavaScript records, WebGL fallback, worker cleanup and download checksums. New motion checks cover interruption, focus, deep-link reload, reduced-motion anchor travel, history, companion reversal, telescope passage and closing Earth anchoring. Early checks caught fractional Safari landings and restoration of the unfragmented home position; both received fixes and targeted reruns.
- The representative warmed six-second scroll comparison retained the same 1440 × 1000 drawing buffer. Before/after median callback intervals were 8.3 ms and p95 9.3 ms; intervals above 50 ms were two and one respectively. This short host-browser sample is not a claim of identical GPU performance on every physical device. Raw measurement: `scroll-profile.json`.
- Model bytes are unchanged: all 59 models, 18,675,760 original bytes and 10,068,703 lossless compressed transfer bytes. Existing editable Blender scenes, crop assets and airborne circuits are preserved.
- Initial JavaScript is approximately 199.5 KB gzip (256 KB budget); conservative complete journey remains below 20 MiB. Worker compression remains about 2,769 KiB against the 3,072 KiB Free limit. Exact release values are in `bundle.json` and build logs.

## Ownership and sources

Changed: `Voyage.tsx`, `Space.tsx`, `SpaceBackdrop.tsx`, `scroll.ts`, `voyage.module.css`, shared `SiteHeader.module.css`; new `use-journey-scroll.ts` and `sky-pose.ts`; scroll/sky unit checks and `deep-space.spec.ts`; Decision 031; original-art recording script, ledger and this QA directory. Unrelated working-tree edits were preserved.

Code-source provenance: `deep-space-v21-2026-09-20`, recorded in `art-source.json`. Background targets and miniature travel are original interpretive art; no canonical scientific values, scenario claims, model rights or factual citations changed. Implementation references: [GSAP ScrollToPlugin](https://gsap.com/docs/v3/Plugins/ScrollToPlugin/) and [history event order](https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event).

## Public release

Published at 2026-09-20 23:29:14 UTC to [Janus Observatory](https://janus-observatory.nicocerond.workers.dev/). Cloudflare version `b871fecc-404e-4372-bcdd-9aa614537cf6` serves 100% of traffic; the receipt is `deployment.json`.

Public verification passed for all 20 pages, 59 compressed and decoded model checksums, three downloadable artifact checksums, operational health and the missing-route 404. The in-app browser visibly confirmed the black opening sky, loaded Earth, Begin the journey arrival with matching URL/focus and chapter-index travel. Desktop Chromium and mobile WebKit motion checks were performed against the identical release build before upload.

Publishing required renewal of the existing Wrangler OAuth scopes. The host's OS hostname lookup then returned ENOTFOUND despite successful DNS responses from its configured resolver. An ignored, release-process-only Node DNS fallback resolved the Cloudflare hosts through that same resolver; TLS hostname verification stayed enabled, and no network settings or application code changed. Reference: [Node DNS implementation considerations](https://nodejs.org/api/dns.html#implementation-considerations).
