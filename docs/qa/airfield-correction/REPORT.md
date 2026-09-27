# Starting Earth airfield and hydration correction

2026-09-12. User screenshot identified the starting Earth's airfield, not S1's checkpoint road.
The previous pass improved strip markings but did not resolve the isolated-road appearance or
nearby vegetation. The previous completion statement was too broad.

The old asphalt strip and box on contemporary Earth are replaced with a mown grass airfield,
edge cones, connected parking apron, gabled hangar, control cabin, windsock and parked regional
plane. The existing moving airplane is retained. S3's regional airport keeps its paved surface
and a different roof treatment. Original-earth trees, homes and farm plots now respect the
prepared flight-endpoint clearings; the stream runs outside the inland airfield; S3's biome placements use the same clearance mechanism.

The supplied hydration trace showed tiny server/browser differences in `Math.sin` star positions.
`SpaceBackdrop` now uses 32-bit integer arithmetic with fixed-decimal SVG attributes. It does not
suppress hydration warnings or remove server rendering. The new browser test listens for console
hydration errors (the earlier page-error-only checks did not catch them) and compares the initial
server SVG attributes with the hydrated DOM.

Validation targets the user's actual development URL, `http://192.168.80.205:3000/`. The five
Chromium, Firefox, WebKit and emulated-phone hydration checks pass. Unit tests pass: 120 across
32 files. Native world exports decode successfully (59 models); origin and S3 front, quarter and
rear renders were inspected, along with dedicated close-ups of both airports. Those close-ups caught and corrected an oversized parked plane, a stream crossing and S3 building clearance. The adjacent logs record lint, types, production build, asset and
payload checks. Browser evidence is not a physical-device performance guarantee.

Changed source: `Airfield.ts`, `plan-life-route.ts`, `activity-corridor.ts`, `WorldBiomes.ts`,
`SpaceBackdrop.tsx`, `origin-world.ts`, `PlanetDetails.ts`, generated activity paths, `hydration.spec.ts`, `airfield.test.ts`, art admission, Blender seeds,
source scenes and exports. `scripts/record-world-art.ts` records the added source file and keeps
prior source checksums in the ledger. Native builds/rendering ran serially with two CPU threads
under the existing memory guard. The native review pipeline also gains opt-in airfield close-up cameras. No dependency or canonical scientific-data change; all new
geometry is original interpretive artwork. No new external assets or rights assumptions.
