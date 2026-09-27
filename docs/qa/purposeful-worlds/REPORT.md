# Distinct actors and purposeful movement

2026-09-08 · local work on `codex/janus-first-light` · preview `http://127.0.0.1:3200/`.

The previous traffic model used small closed ovals, duplicated each land actor, and omitted the
opening airplane. The [baseline contact sheet](before/loop-review.jpg) shows the problem. Prior
passing tests did not establish meaningful choreography.

The update restores the airplane, replaces the generic activity slots with individual tasks,
and gives each scenario a different active cast. Open trips connect named destinations and include
arrival, task/rest, turnaround and return states. Wheels and walking stop at destinations; the
truck tips its bed, the recovery crane lowers its load, the walker works a probe, and the deer
browses. Aircraft use a smooth climb and descent independent of terrain discontinuities.

| World  | Activity                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------ |
| Origin | Regional airplane between airfields.                                                             |
| S1     | Depot/checkpoint supply trip and a ducted surveillance drone that holds to inspect.              |
| S2     | Ore truck between extraction and conveyor, with unloading and empty return.                      |
| S3     | Passenger catamaran between community quays and regional airplane between airfields.             |
| S4     | Operated canoe between seasonal landings and a single browsing deer.                             |
| S5     | Living pollinator visiting engineered growth structures; generic car and skiff removed.          |
| S6     | Six-legged maintenance walker servicing the pressure shell.                                      |
| S7     | Operated cargo tricycle between workshop and seed store, sailing cutter and working mills.       |
| S8     | Tracked recovery crane between a recovery clearing and the salvage yard.                         |
| S9     | Deliberately quiet Earth with its gift; machinery remains in the separate system views.          |
| S10    | Broad orchard cargo barge with a balanced lug sail; autonomous infrastructure remains off-world. |

The selected species, machinery, tasks, routes and dimensions are original interpretive artwork.
They do not assert that the Janus authors specified those exact vehicles or behaviors. The existing
canonical morphology summaries and source-selected companion bodies are unchanged.

## Implementation and checks

Terrain routes are generated offline, with surface support and cliff checks. The browser loads
prepared positions and indexed/palette-compressed geometry instead of planning roads on scroll.
The native story, single canvas, accessible explorer, focus restoration and source links remain.
No dependency or canonical schema changes were made.

Verified against the final production build served on port 3200:

- [68 desktop and portrait captures](views/capture.json): opening world, every scenario,
  each Earth explorer and all 13 active scenario actors. Every actor freezes under reduced
  motion, with no page overflow or runtime errors. Reviewed the [desktop worlds](views/all-worlds-story.jpg),
  [portrait worlds](views/portrait-all-story.jpg), [model studies](views/desktop-actors-contact.jpg)
  and [portrait studies](views/portrait-actors-contact.jpg). The capture script waits for the
  canvas to finish resizing after the explorer closes; immediate captures had shown its
  temporary smaller projection. A separate before/after check confirmed the story restores
  its full-size composition.
- [45 real-time frames and seven pause checks](motion/capture.json): S2, S3 and S8 trips
  through arrival, work/rest and return; deer, service walker, biosynthetic glider and cargo
  barge articulation. Reviewed the [transport sequence](motion/trip-contact.jpg) and
  [remaining motion studies](motion/motion-review.jpg). The truck stops at the conveyor,
  the ferry crosses between quays, and the deer lowers its head to browse. No circular
  traffic track remains. Video captures are alongside the frames.
- [26 browser tests passed](e2e.log) across desktop Chromium, Firefox, WebKit, mobile Chromium
  and mobile WebKit; four intentional skips run the observer pixel-motion check only once.
  This covers all world/system selections, the single canvas, focus restoration, keyboard
  loop, rotation, reduced motion, telescope entry/exit and axe checks on the explorer.
  [Ten additional fallback tests passed](fallback-e2e.log) across the same profiles.
- [Four clean Linux visual comparisons passed](visual-clean.log), using pinned Playwright
  1.62.1 Chromium/SwiftShader against the local production server. The initial comparison
  showed only the intended opening-airplane/airfield change. After inspecting that diff,
  only the hero baseline was updated for this refinement; article, Atlas and Observatory
  comparisons passed unchanged. A separate comparison run then passed all four.
- [106 unit tests passed](unit-final.log), including supported paths in both geometry tiers,
  continuous arrivals, task pauses, distinct casts and finite model geometry. Lint,
  type checks, production build, formatting and diff checks passed. Prepared route
  generation reproduces exactly with `--check`.
- Source validation passed 15 checksums. Asset validation passed 48 rights records and 36
  derivative records across 35 public files. Canonical validation passed eight datasets,
  ten scenarios, five missions, 1,361 provenance references, 120 cells and 27 generated
  files; its existing growth-discrepancy warning remains unchanged. Link validation passed.
- [Production payload budgets passed](bundle-production.json): 193,536 bytes of initial
  gzip JavaScript against 256,000; 126,804 bytes of critical visuals; a 12,167,116-byte
  conservative guided-path upper bound against 20,971,520. The deferred spatial chunk
  is 717,366 gzip bytes, including prepared route geometry. No physical-device frame-rate
  claim is made from these checks.

Manual review in the existing in-app browser loaded the final build, opened S3, inspected the
regional airplane, and exercised rotation and zoom with no browser errors. The preview is left
on that model with full motion. The new airplane has independently rotating twin propellers,
cambered wings, a shaped fuselage, tailplanes and landing gear.

## Sources and rights

Canonical release remains `sha256:46a0e94a969301c49cfafe00463e5c7e9be5dce423ddcdeb21fe4ad0614d2046`.
Narrative input is the generated morphology summaries with arXiv:2409.00067v3 Section 3.2.1
provenance. No scientific runtime value or probability claim was added. Existing scientific
review caveats remain.

All new models and route geometry are original procedural artwork. No external model, texture,
reference-image pixels or restricted PDF content was bundled. Source checksums, the new fallback
render and conversion history are recorded in the asset ledger and [art-source.json](art-source.json).
An [independent recomputation](art-verification.json) matches the 38-file source receipt and ledger:
`janus.low-poly.worlds.v6`, version `purposeful-activity-v6-2026-09-08`, checksum
`sha256:94ccbd5b8014a274a4bd777550951758610380ad2cf2ae402d9d4909cebc14c3`.
The fallback is `janus.low-poly.origin-poster.v5`, rendered from the same final artwork.
Prior source renders and reports remain in their original evidence directories.

Changed files are in `apps/web/app/voyage/`, the matching unit tests, capture/generation/audit
scripts, asset ledger, fallback image, visual baselines, formatting exclusion for generated art,
and the decision/status documents. The generated route JSON is owned by its generator and is
separate from generated canonical scientific data.

Local browser emulation does not certify physical-phone performance, field Core Web Vitals or
manual screen-reader behavior. This report is local verification, not deployment or hosted CI.
