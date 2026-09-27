# Open systems, space and connected roads

2026-09-12. Local production preview on `127.0.0.1:3200`, branch `codex/janus-first-light`.
This report supersedes the single-portrait presentation in the earlier connected-worlds and
Blender-finishing reports. Those reports remain historical evidence of their own passes.

## Visible changes

- Continuous space across the story: deterministic SVG stars survive reduced motion, failed WebGL
  and JavaScript-free reading. The one spatial canvas adds depth through a sparse animated sky.
- Every scenario's selected system is visible together. Earth, Luna, Mars, Venus and the applicable
  asteroid, outer-planet, Kuiper and solar-construction studies have separate positions and labels.
  Shared layout calculations keep the models and clickable DOM targets aligned on desktop and phone.
  Selecting a body opens its existing close-up inspector; Escape restores the system and focus.
- Transport centerlines now remove navigation-grid zigzags and refine corners only when the full
  corridor remains traversable. Vehicles follow the same route as the visible road. S1's former
  steps at vehicle entrances are replaced with a level screening lane and flush depot apron.

| World              | Transport treatment                                                              |
| ------------------ | -------------------------------------------------------------------------------- |
| Contemporary Earth | Airfield thresholds, edge paint and terminal taxiway; no ornamental road loop    |
| S1                 | Dark local checkpoint-to-depot pavement, restrained markings and level entrances |
| S2                 | Quarry service route with gravel shoulders and wheel wear                        |
| S3                 | Connected runway and taxiway; water transport remains separate                   |
| S4                 | Wildlife surface routes; no road added                                           |
| S5                 | Wildlife and flight routes; no road added                                        |
| S6                 | Existing engineered surface route; no decorative road added                      |
| S7                 | Unpainted restoration track with paired wheel ruts                               |
| S8                 | Worn salvage tracks with rough edges                                             |
| S9                 | No Earth road added; off-world machine civilization stays visible                |
| S10                | Water transport and wildlife remain distinct from off-world infrastructure       |

## Verification

The browser regression suite checks all ten systems against canonical-selected destinations,
actual decoded model readiness, on-screen clickable bounds, canvas reuse, focus restoration,
inspector controls, reduced motion, telescope travel and missing-asset fallback. Layout unit checks
cover one through eight bodies across five viewport sizes. Route checks include land support,
obstacle clearance, vehicle width and modeled access points.

Native Blender review covers the revised Earth transport in contemporary Earth, S1, S2, S3, S7 and S8
from front, quarter and rear angles. S1 was rendered again after the entrance correction. Native
renders are under `../blender-finish/renders/`; current build/export/geometry receipts are in that
folder. Browser system captures and road close-ups are in this folder. Visual review found and
corrected caption overlap on phones and underlying story text showing through the inspector.

Production build, lint, typecheck, formatting, source, canonical, rights, citations and bundle checks pass. Initial JavaScript is 189,353 bytes gzip (256,000-byte budget); the conservative whole-journey payload is 17,291,632 bytes (20 MiB budget). Browser checks completed 49 cases with six intentional platform skips; the final inspector/background and fallback pass completed another 15 checks across all five browser/device profiles.

Final check results are recorded in the adjacent logs and acceptance manifest. The unit suite has
119 passing tests across 31 files. All 59 exported GLBs decode and pass the geometry audit. Source,
canonical-data, asset-rights and citation validators pass; the existing canonical growth-rate
warning remains unchanged. No canonical scientific files or dependency versions changed.

## Sources and limits

Canonical data fingerprint: `sha256:46a0e94a969301c49cfafe00463e5c7e9be5dce423ddcdeb21fe4ad0614d2046`.
System inclusion uses the existing canonical transcription of arXiv:2409.00067v3, Tables 6
and 8. Architecture, roads, star placement and body spacing are original interpretive artwork.
Sizes and distances are illustrative; these are not astronomical scale diagrams or forecasts.
The art ledger retains checksums and transformation receipts. No external media were added.

Native work ran serially with two Blender threads, low process priority, a 4 GiB process-group RSS
cap and headroom checks. The existing idle Blender GUI was inspected and left untouched. Runtime
uses one WebGL canvas and serial asset loading, retaining active-system libraries while pruning
unused entries. The existing 48 MiB decoded-library guard remains in force. Browser tests use one
worker; phone results are browser emulation, not physical-device measurements. These checks do
not establish field Core Web Vitals or a sustained frame-rate guarantee on every device.

## Implementation handoff

- Sky and system layout: `SpaceBackdrop.tsx`, `system-layout.ts`, `WorldExplore.tsx`, `Space.tsx`,
  `StoryBody.tsx`, `Voyage.tsx` and `voyage.module.css` under `apps/web/app/voyage/`.
- Visible asset leases and Earth detail staging: `BlenderAssets.tsx` and `Planet.tsx`.
- Roads and entrances: `route-finishing.ts`, `plan-life-route.ts`, `ObjectFinish.ts`, regenerated
  `activity-paths.generated.json`, Blender seeds/source files, GLBs and their build/admission receipts.
- Verification: `system-layout.test.ts`, `story-system.spec.ts`, updated cinematic, explorer,
  Blender-asset and fallback browser tests; generated captures and logs in this folder.
- Provenance and decisions: `scripts/record-world-art.ts`, `data/assets/ledger.json`, Decision 021,
  master plan and implementation-status links. Temporary browser traces are excluded from source
  control and formatting through `.gitignore` and `.prettierignore`.

Existing unrelated working-tree changes are preserved. No commit, push or public deployment was made.
