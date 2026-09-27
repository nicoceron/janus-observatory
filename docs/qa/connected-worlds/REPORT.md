# Roads that connect, and Solar System locations back in the story

2026-09-08 · local branch `codex/janus-first-light` · preview `http://127.0.0.1:3200/`.

The user clarified that “rows” meant the roads and paths on the planets. Review found leftover
decorative road strips, routes narrower than their vehicles, doors facing away from their
approaches, and background buildings intersecting carriageways. Luna, Mars and Venus had not been
deleted: their models had been moved into the explorer, with shortcuts hidden on mobile.

Decorative strips are removed. The remaining roads connect specific modeled loading areas and
entrances, with aligned buildings, matching forecourts, vehicle-derived width and obstacle
clearance. S1 connects supply depot and checkpoint; S2 links extraction and conveyor; S7 joins
workshop and seed store; S8 connects a recovery clearing and salvage yard. The S6 walker follows
the pressure shell without a painted road. The existing distinct aircraft, vessels, animals and
task animations remain. This is interpretive settlement artwork, not a physical transport model.

Every source-selected location is now a visible control in the main story on desktop and mobile.
It occupies the full-size story portrait in the existing canvas. “Explore in detail” opens that
location, and closing preserves the portrait and keyboard focus. Non-Earth inspector views no
longer list unrelated Earth objects. The static published footprint and citations remain readable
without WebGL. A DOM description also identifies each selected portrait.

## Lore selection

The existing selector and canonical inputs are unchanged. Positive Table 6 fields select bodies
and distinguish surface from orbital activity; Table 8 selects extended-system features. Empty
fields do not establish absence. Exact provenance is retained in [source-footprints.json](source-footprints.json).

| Scenario | Selected bodies beyond Earth        | Extended-system views                                               |
| -------- | ----------------------------------- | ------------------------------------------------------------------- |
| S1       | Luna, Mars, Venus                   | Asteroid works, outer settlements                                   |
| S2       | Luna, Mars                          | Asteroid works                                                      |
| S3       | Luna, Mars                          | Asteroid works, outer settlements                                   |
| S4       | No added portrait from these fields | No added portrait from these fields                                 |
| S5       | Luna, Mars, Venus                   | Asteroid works, outer settlements, Kuiper outpost                   |
| S6       | Luna, Mars, Venus                   | Asteroid works, Kuiper outpost                                      |
| S7       | No added portrait from these fields | No added portrait from these fields                                 |
| S8       | Luna                                | No added portrait from these fields                                 |
| S9       | Luna, Mars, Venus                   | Asteroid works, outer settlements, Kuiper outpost, solar collectors |
| S10      | Luna, Mars, Venus                   | Asteroid works, outer settlements, Kuiper outpost                   |

For example, S8 retains its lunar refuge, S5's Mars uses the existing engineered-garden design,
and S9's Moon has orbital activity rather than an invented surface settlement. Venus and the
outer-system models retain their existing scenario interpretation. This change makes those models
visible in the story; it does not claim they were all newly modeled in this refinement.

## Verification and visual review

- [94 final production captures](views/capture.json) cover all 47 story portraits at desktop
  and phone dimensions, with no page errors or horizontal overflow. Reduced-motion pixel
  comparisons remain still. Reviewed all [Earth views](views/desktop-earth-review.jpg), the
  [mobile compositions](views/portrait-earth-review.jpg) and all eight destination contact sheets
  alongside their full-size frames. A mobile overlap on S4/S7 was corrected and recaptured.
- [28 real-time road frames and four pause checks](motion/capture.json) cover S1, S2, S7 and S8.
  Reviewed the [S1](motion/s1-route-review.jpg), [S2](motion/s2-route-review.jpg),
  [S7](motion/s7-route-review.jpg) and [S8](motion/s8-route-review.jpg) sequences. Vehicles follow
  their carriageways and stop at the modeled access areas. The first capture attempt was
  interrupted by rebuilding its running preview server; the completed capture is a fresh run
  against the stable final server. Video files accompany the frames.
- [31 browser tests passed](e2e.log) across Chromium, Firefox, WebKit, mobile Chromium and mobile
  WebKit, with four intentional duplicate observer-motion skips. Coverage includes all main-story
  destinations, every explorer location, single-canvas persistence, keyboard navigation, focus
  restoration, reduced motion, telescope navigation and explorer axe checks.
  [Ten reading/WebGL fallback tests](fallback-e2e.log) passed. The final mobile spacing change also
  passed [both phone composition checks](mobile-final-e2e.log).
- [Four pinned Linux visual comparisons passed unchanged](visual-clean.log): origin, readable
  article, Observatory and Atlas. No visual baseline was updated for this correction.
- [106 unit tests passed](unit.log), including road width against actual vehicle geometry,
  endpoint alignment with modeled access points, terrain support in both mesh tiers, continuous
  arrivals and task pauses. [Lint](lint.log), [type checks](typecheck.log) and the final
  [production build](build.log) passed. [Offline route reproduction](routes.log) matches all
  28 prepared art routes. Formatting, links and final diff checks are recorded in their logs.
- [Source validation](sources.log) verified 15 checksums. [Canonical validation](canonical.log)
  passed eight datasets, ten scenarios, five missions, 1,361 field provenance records, 120 cells
  and 27 generated files. Its existing published-growth discrepancy remains explicit.
  [Asset validation](assets.log) passed 48 rights and 36 derivative records across 35 public files.
- [Final payload budgets](bundle-production.json) pass, including initial home JavaScript,
  deferred spatial loading, critical visuals and the conservative complete guided path.

Manual review also refreshed the existing in-app preview, selected S5 Venus in the main story,
opened the selected S5 Mars in the explorer, returned to the story, and visited S8 Luna. The
preview remains on the full-size Luna story portrait with motion enabled.
An additional [full-motion check at the in-app viewport size](tall-full-motion.json) confirms that
selecting Luna preserves both scroll position and the complete chapter state.

## Files, sources and limits

Story and UI: `WorldExplore.tsx`, new `StoryBody.tsx`, `Space.tsx`, `Voyage.tsx`, `Inspector.tsx`
and `voyage.module.css`. Road layout: `PlanetDetails.ts`, `ScenarioBiomes.ts`, `WorldStructures.tsx`,
`WorldLandmarks.tsx`, new `landmark-plan.ts` and `activity-corridor.ts`, `life-plan.ts`,
`plan-life-route.ts`, `life-routes.ts` and regenerated `activity-paths.generated.json`.
Checks and receipts: `living-models.test.ts`, `story-system.spec.ts`, `cinematic.spec.ts`,
`generate-activity-paths.ts`, `capture-connected-worlds.ts`, `capture-activity-motion.ts`,
`record-world-art.ts`, the asset ledger, Decision 019, master/status pointers and this QA directory.
These edits preserve the preceding user-authorized dirty refinement work.

No dependency or canonical schema changes. No canonical scientific runtime values were edited.
Canonical release remains `sha256:46a0e94a969301c49cfafe00463e5c7e9be5dce423ddcdeb21fe4ad0614d2046`;
the applicable source is arXiv:2409.00067v3, Tables 6/8 and Section 3.2.1. Source admission and
independent scientific-review boundaries remain unchanged.

All geometry is original procedural art; no external image, model, texture or restricted PDF was
bundled. [The source receipt](art-source.json) and [independent recomputation](art-verification.json)
match the asset ledger for 41 ordered files: `janus.low-poly.worlds.v7`, version
`connected-worlds-v7-2026-09-08`, checksum
`sha256:64e97a0c8f061239afdd7bf220471ff33dacfc000af41913d70ebfb514a4de31`.
The unchanged origin poster retains its v5 derivative and v6 source history.

These are local browser and build results. They do not certify physical-phone performance,
production Core Web Vitals or manual screen-reader behavior. No public deployment or hosted CI
was performed.
