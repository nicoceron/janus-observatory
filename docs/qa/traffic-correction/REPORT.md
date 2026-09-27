# Boat collision correction

The previous release's opening skiff and cutter shared part of a waterway. Their animated
centers coincide about 28.75 seconds after startup on desktop. Testing shore clearance did
not test boat-to-boat clearance. Fixed-side piers could also intersect an approach or turning
hull. The [failing regression receipt](before-regression.log) records these defects rather than treating the previous
release's test count as proof of collision safety.

The corrected opening trips use different coastal sectors. Offline generation reserves entire
hull turning envelopes and previous landing geometry. Narrow supported piers face their actual
shore and stay outside the swept route, including the stationary heading change. Background
props avoid both pier geometry and the whole water corridor. All five inhabited water worlds
are covered: opening Earth, S3 ferry, S4 canoe, S7 cutter and S10 sailing barge, in both tiers.

## Verification

- The four initial regression cases fail against the old data; all six new regression cases
  pass against the correction. Checks cover complete route separation, meaningful opening trip
  lengths, landing triangles/edges, full turning-circle shoreline clearance, and all moving
  actor pairs across every world and both tiers.
- The complete opening two-boat phase cycle is 5,040 seconds. Quarter-second sampling records
  at least 1.427 world units of center separation after correction, versus zero previously.
  Pairwise swept-route checks cover any relative timing, not just those temporal samples.
- The final [exported-scene audit](native-scene-clearance.json) checks 1,704 boat poses against
  the actual decoded Blender scenery and landmark geometry, including 24 headings per berth.
  It also verifies the native hulls fit the reserved envelopes. Zero detected intersections.
  These bounded geometry checks supplement the route-envelope tests; they are not a general-purpose physics engine.
- Blender exports preserve named route facilities and editable sources. No runtime collision
  simulation, dependency changes, reduced canvas resolution or removed moving actors.

## Additional defects caught during review

Close native renders exposed an opening shoreline rock inside the skiff's berth. The scene
regression also caught S3's pool in the ferry lane and S4's authored vegetation and river strips
crossing navigable water. Hand-placed coastal details now relocate to supported clear land;
rivers stop before open water. The native GLB audit caught the canoe's turning envelope at the
camp edge; its landing moves along the shore. The final native audit passes after these corrections.

## Reproduce

```sh
pnpm exec vitest run apps/web/app/voyage/traffic-clearance.test.ts
pnpm exec tsx scripts/audit-water-traffic.ts
```

The first command covers source geometry and the prepared paths. The second decodes delivered
GLBs and uses their matching seed placements. Keep both gates when editing miniature models.
Blender sources remain under `assets/blender/`; landmarks and landing facilities remain editable.

## Delivery checks

- TypeScript, ESLint and 137 unit tests in 37 files pass.
- All 59 GLBs pass the complete model, source-hash, geometry and decoded-memory audit.
- [Twelve native landing close-ups](landings.jpg) reviewed after the corrections. Single Blender
  process, two CPU threads, sampled 4 GiB guard; measured render peak 1,080,705,024 bytes (1.01 GiB).
- Chromium and mobile WebKit production-preview regressions: 19 passed, one intentional skip
  for desktop-only keyboard rotation on touch. Covers no-WebGL/no-JavaScript fallback,
  reduced motion, keyboard control, shared navigation, model decoder fallback, worker cleanup
  and unchanged fixed drawing-buffer resolution.
- Full model bytes: 18,302,896; lossless gzip transfer: 9,959,221. Initial JavaScript: 197,192 gzip
  bytes. Conservative full mobile journey: 20,083,137 / 20,971,520 bytes. Worker bundle:
  2,771.12 KiB / 3,072 KiB Free limit. All payload checks pass; resolution policy is unchanged.
- Source, canonical data, rights/assets, local links, formatter and diff-whitespace checks pass.
  Existing published growth-rate discrepancy remains explicitly reported by canonical validation.
- Original-art version: `traffic-clearance-v19-2026-09-20`; Blender version:
  `blender-traffic-v10-2026-09-20`. [Source receipt](art-source.json). No canonical data changes.

Final production-preview captures: [desktop](final-desktop/receipt.json) and
[mobile](final-mobile/receipt.json), covering opening Earth and all four scenario worlds with
watercraft. Zero page errors and zero missing Blender parts. Desktop drawing buffer remains
1440 × 1000; mobile remains 585 × 1266 at 390 × 844 CSS pixels (existing 1.5 DPR ceiling).
Native close-ups and route tests complement these normal-time browser captures.

## Published result

Deployed to [Janus Observatory](https://janus-observatory.nicocerond.workers.dev/) at
2026-09-20 07:12:52 UTC, version `e53ffb39-3d1e-4e97-ac37-e1303d6ef280` (100% traffic).
Previous version `0cea7ce0-0861-4513-8419-01d57c12840f` is retained in the deployment receipt.
No paid service, binding or plan change.

[Public verification](public-verification.json) passes: 20 routes, all 59 compressed/decoded
model hashes, three published downloads, health and 404. The user's existing live browser tab
was refreshed and showed the opening model ready with all 45 semantic parts and no missing
parts. The cache revision changes to `20260920-traffic` for returning visitors.

This release fixes the reproduced boat, pier and nearby scenery collisions. Checks cover the
authored routes and sampled exported geometry; this is not a claim that every visual detail
on every world has been exhaustively approved or that phones match the development Mac's speed.
