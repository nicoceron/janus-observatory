# Crops and continuous flight — 20 September 2026

Published to https://janus-observatory.nicocerond.workers.dev/ at 2026-09-20T19:27:56.431892Z.
Cloudflare version `e8ca2fba-91bb-4064-a324-bb7722f70796`, 100% traffic.

## Result

Opening Earth crop plots now contain individual leafy vegetables, green stalks and golden seed heads on open soil. Wooden-looking parallel bars and posts are removed. Mobile retains planted plots.

Opening Earth and S3 airplanes, S1 surveillance drone and S5 imagined pollinator continuously circle their worlds. They maintain tangent headings, constant angular speed and clearance above settlement roofs. Position and orientation join at the loop seam; there is no stop, taxi turn or reversal. The far side is naturally hidden by the planet. Clouds retain their slower globe-circling weather drift. Airfields remain supported surface scenery; scenery clearance now uses their actual meshes independently of airborne paths.

The same authored motion is stored in editable Blender previews. All eleven sources rebuilt serially with two threads, under the 4 GiB guard; highest sampled build memory was 391.9 MiB. No new dependencies, runtime physics, adaptive resolution, scientific values or external artwork.

## Verification

- 137 unit tests pass; updated route tests cover all eight airborne world/tier combinations, constant speed, both hemispheres, tangent headings and loop continuity.
- Native GLB audit: all 59 models complete. Flight body-envelope audit: 1,544 sampled poses clear of terrain, structures and principal landmarks. Boat audit: 1,704 poses across twelve world/tier boat instances retain previous scene and turning clearance.
- Actual Blender contact sheet reviewed: `native-contact.jpg`. Browser opening flight captured for over a full circuit: `browser-contact.jpg`. S1, S3, S5 inspected individually: `affected-worlds.jpg`. Desktop/mobile screenshots and receipts are in their respective folders.
- Browser regression: 19 passed; one desktop keyboard test intentionally skipped in the touch-only project. Includes WebGL fallback, no-JavaScript records, keyboard/reduced-motion behavior, navigation, fixed rendering resolution and model worker cleanup.
- Desktop and mobile-emulated Chromium captures report no page errors and no missing parts. Six-second requestAnimationFrame samples had median 8.3 ms, p95 9.3/9.2 ms respectively, and no intervals above 50 ms. These measure host-browser callback cadence, not universal physical-device GPU throughput.
- Lint, typecheck, build, source/data/asset/link validators and payload checks pass. Existing published growth-rate discrepancy remains documented by the canonical validator.
- Initial JavaScript: 197,139 gzip bytes. Conservative complete guided-path payload: 20,451,157 / 20,971,520 bytes. Worker: 2,771.38 / 3,072 KiB gzip. Fixed 1–1.5 DPR policy unchanged.
- Public verification checks twenty routes, all 59 compressed and decoded model hashes, three downloads, health and 404. User's existing tab refreshed and observed `ready` with no missing model parts.

These are illustrative miniature flights, not orbital physics. Native collision checks sample body envelopes against static geometry; they do not prove every possible moving wing/cloud interaction on every device.

## Files and provenance

Source changes: `WorldBiomes.ts`, `activity-motion.ts`, `WorldActivity.tsx`, `plan-life-route.ts`, `activity-corridor.ts`, `life-plan.ts`, `BlenderAssets.tsx`; generator-produced `activity-paths.generated.json`; Blender preview `scripts/blender/finish_world.py`; updated route/airfield tests; new `scripts/audit-airborne-traffic.ts`; Decision 030.

Updated art recording scripts, source ledger, seeds, eleven `.blend` sources, generated GLB exports/manifest and QA receipts preserve transformation history. Source version `orbit-crops-v20-2026-09-20`; Blender version `blender-orbit-crops-v11-2026-09-20`. Source checksum is recorded in `art-source.json`. Canonical datasets and source versions are unchanged. Existing unrelated working-tree edits were preserved.
