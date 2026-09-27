# Planet polish — September 20, 2026

## Scope and visual changes

Reviewed opening Earth, all ten scenario Earths, and all 37 source-selected companion/system
portraits against the deployed version. This is a geometry and movement polish of the approved
low-poly direction, not a claim that every object has been redesigned. All changes are original
interpretive art; canonical records, footprint selection and scientific meanings are unchanged.

| World         | Finding and action                                                                                                                                                                                                                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Opening Earth | Added research skiff and sailing cutter with distinct roles, hull-safe coastal trips and piers reaching land. Smaller regional plane, cruise segment, staged takeoff/landing and rolling taxi turns. Runway markings distinguish the airport from roads; farm bases/rows are thinner and read as crops. Fused, independently drifting cloud banks replace loose pebble clumps. |
| S1            | Reviewed checkpoint/depot transport and surveillance composition; retained its controlled settlement identity. Route facilities now load from the editable Blender library. Luna and Mars receive actual crater/canyon terrain. Venus, asteroid works and outer settlement retain distinct existing constructions.                                                             |
| S2            | Replaced target-like quarry rings with unequal benches, an open working face and ramp. Preserved the ore chain, truck and industrial compound. Luna/Mars terrain refined; asteroid industrial gantry retained.                                                                                                                                                                 |
| S3            | Regional aircraft gets the same corrected scale and flight sequence. Ferry berths and their land approaches use the hull-safe coastal planner; airports and ports are Blender library parts. Cloud silhouette/drift refined. Luna/Mars terrain refined; small off-world hub, mine and outer habitat retained.                                                                  |
| S4            | Canoe route checks the hull near shore, with a connected landing approach. Refined clouds. Retained the camp, artisanal activity and woodland animal rather than introducing roads or off-world bodies.                                                                                                                                                                        |
| S5            | Reviewed living canopy, growth chambers and biosynthetic activity; preserved the organic identity. Luna craters and terraformed Mars canyon geometry refined into a tapering regional valley. Venus aerostat, processing mine, outer growth halls and Kuiper works retained.                                                                                                   |
| S6            | Reviewed pressure shell and maintenance walker. No arbitrary roads added to the shell. Luna/Mars terrain refined; Venus surface works, sealed extraction and Kuiper life support retained.                                                                                                                                                                                     |
| S7            | Cutter hull clearance and shore-connected landings refined, cloud banks rebuilt. Working mill, repaired settlement and cargo-cycle operation retained. No unsupported off-world selection added.                                                                                                                                                                               |
| S8            | Reviewed salvage, bunker and scarred terrain; retained sparse repair infrastructure. Lunar refuge sits on the newly integrated crater terrain.                                                                                                                                                                                                                                 |
| S9            | Quiet Earth remains quiet; refined clouds rather than adding traffic unrelated to its story. Luna remains orbital-only; Mars machine works use the carved terrain. Venus machinery, asteroid/outer/Kuiper works and solar collectors retained.                                                                                                                                 |
| S10           | Barge clearance, connected shore facilities and clouds refined. Kept cultivated Earth and its existing distinct settlement/automation. Luna/Mars terrain refined; Venus atmosphere, asteroid, outer and Kuiper assemblies retained.                                                                                                                                            |

The [native review](native-review.jpg) contains origin front/quarter/rear views, close airport views,
and S2 Earth/Moon/Mars. `before-system/` records the previous deployment; `final/` records the
production preview. Opening motion frames span 90 seconds of normal browser animation rather
than artificially advancing the clock. Final visual acceptance and deployment receipts are listed below.

## Editable sources and provenance

- Eleven native sources in [assets/blender](../../../assets/blender/README.md), with assembled Earth
  and selected companion scenes, linked editable construction meshes and articulated actor parts.
- 59 compact GLBs: 22 Earth libraries (two existing tiers), 37 companions/system views.
- New `Activity_*_road` and `Activity_*_stops` parts include the real airport/pier/route facilities.
- Cloud modifier remains editable in Blender; only disposable export copies apply voxel remeshing.
- Native sources and derivative hashes: [current manifest](../blender-finish/art-manifest.json).
  Prior source/derivative identities: [previous manifest](previous-model-manifest.json).
- Procedural source: `planet-polish-v18-2026-09-20`; native export: `blender-polish-v9-2026-09-20`.
  [Source receipt](art-source.json). Canonical data remains
  `sha256:46a0e94a969301c49cfafe00463e5c7e9be5dce423ddcdeb21fe4ad0614d2046`.

## Resource and payload checks

One background Blender process at a time, two CPU threads, reduced priority and the existing
4 GiB sampled RSS guard. Latest source builds stayed below 0.4 GiB sampled RSS; native review
renders peaked around 1.16 GiB. No interactive Blender state was modified.

All 59 GLBs pass semantic-part, source-hash, geometry, finite-bound, size and decoded-memory checks.
Full-model bytes: 18,546,044; lossless gzip transfer: 10,095,560. Existing fixed DPR policy is unchanged;
no adaptive resolution, texture downscaling or lower-resolution canvas was introduced.
Initial JavaScript: 197,195 gzip bytes / 256,000. Conservative full mobile journey (including both
Earth tiers, all companions and emitted client resources): 20,420,248 / 20,971,520 bytes.
The bundle budget passes, with limited remaining room for future asset growth.
Cloudflare Worker: 2,770.64 KiB compressed / 3,072 KiB Free limit. No paid binding added.

Model requests use a new revision query to avoid reusing stale browser-cached GLBs. The existing
staged loader, lossless gzip, Meshopt worker, worker release and bounded unused-model cache remain.
New route planning and cloud remeshing execute offline. Browser work only interpolates the authored
paths and transforms the exported meshes.

## Verification

- TypeScript, ESLint: pass.
- Vitest: 131 tests in 36 files pass. New checks cover full hull clearance, outbound/return aircraft
  heading, cruise speed, landing height, opening sea traffic and native transport facility parts.
  A further geometry regression checks every aircraft vertex against settlement bounds across
  the complete route, both directions and both detail tiers. It caught and drove the S3 approach
  clearance correction.
- Canonical validation: 8 datasets, 10 scenarios, 5 missions, 1,361 source-backed fields pass;
  existing growth-rate source conflict remains explicitly reported.
- Source validation: 15 source checksums pass. Asset admission: 107 rights records / 95 derivative
  records / 94 public files pass. Local links: 112 route files / 196 citation chunks pass.
- Production OpenNext build, credential scan, Free Worker bundle and frontend payload gates: pass.
- Production-preview Chromium and mobile WebKit: 19 regression cases pass; one intentional skip
  for desktop-only keyboard rotation on a touch device. Includes no-WebGL, no-JavaScript,
  reduced motion, keyboard inspection, shared navigation, fixed resolution, no speculative
  prefetch, no-worker/decompression fallback, worker cleanup and download hash checks.

- Final production-preview capture: all 47 scenario/companion portraits plus opening Earth reviewed;
  zero browser errors, zero missing Blender parts. [Earth sheet](final-earths.jpg),
  [90-second opening sequence](final-motion.jpg), and companion sheets
  [1](final-companions-0.jpg), [2](final-companions-1.jpg), [3](final-companions-2.jpg),
  [4](final-companions-3.jpg). Mars's first full-width valley was rejected in review and replaced
  with the shorter tapered geometry in these final captures.
- Firefox: four additional Blender decoding, missing-asset fallback/retry, system inspection and
  rotation/reset cases pass. Formatter and diff whitespace checks pass.
- Six-second browser scheduling sample after full model load: desktop median 8.3 ms, p95 9.1 ms,
  zero intervals over 50 ms; 1440 × 1000 fixed drawing buffer. Mobile emulation: median 8.3 ms,
  p95 9.2 ms, zero intervals over 50 ms; 585 × 1266 buffer for 390 × 844 CSS viewport, retaining
  the existing 1.5 DPR ceiling. These are requestAnimationFrame scheduling measurements on the
  development Mac, not a GPU benchmark or a claim of 120 rendered frames per second on phones.

Public deployment: [Janus Observatory](https://janus-observatory.nicocerond.workers.dev/),
version `0cea7ce0-0861-4513-8419-01d57c12840f`, September 20 at 06:10:49 UTC. Existing Free
configuration retained; no paid service added. Previous version
`eefb2bef-619a-4635-9f78-af7d8d5bc9e9` is recorded for rollback.

- [Public verification](public-verification.json): 20 routes, all 59 compressed and decoded model
  hashes, three download hashes, operational health with public AI disabled, and correct 404 pass.
- [Public mobile WebKit tests](public-browser.log): four pass, including fallback without workers,
  decompression worker cleanup, download integrity and no idle prefetch loop.
- The user's existing in-app public tab was refreshed and visually inspected: new Earth piers,
  two boats, revised clouds and airfield visible; native Blender state `ready`, 45 parts.
- [Deployment receipt](deployment.json); latest sources, exports and their history remain local
  and editable. No commit or push was performed in the pre-existing dirty checkout.

Browser mobile emulation is not evidence for every physical phone/GPU. Independent scientific
review and physical-device/assistive-technology acceptance remain separate from this art pass.

## Changed implementation areas

`life-plan`, `activity-motion`, `plan-life-route`, `activity-corridor`, `WorldActivity`, `Airfield`,
`WorldBiomes`, `WorldClouds`, `cloud-motion`, `WorldStructures`, `BlenderAssets`, generated offline
activity paths; Blender seed exchange, `finish_world.py`, `earth_polish.py`, `system_worlds.py`;
source and Blender admission scripts, tests and dated capture tooling; rebuilt `.blend`/GLB assets,
ledger and verification receipts. No new dependency or scientific data edit.
