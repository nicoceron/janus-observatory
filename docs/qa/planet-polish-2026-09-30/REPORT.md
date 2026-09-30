# Planet and experience polish — September 30, 2026

Implements [Decision 034](../../DECISION_034_CONTOUR_COASTS_AND_EXPERIENCE_POLISH.md). Every opening
and scenario Earth, all 37 companion/system portraits, the story journey and the inner routes were
reviewed at 1440 × 900 and on a 390 × 844 phone viewport before and after the change. All new work
is original interpretive art; canonical records, companion selection and scientific meaning are
unchanged.

## World-by-world review

| World         | Finding                                                         | Action                                                                                                |
| ------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| All Earths    | Triangle sawtooth coasts and stepped cliffs.                    | Contour-split facets, beach band and one cliff quad per segment. Routes re-planned offline.           |
| All clouds    | Banks hovered 26% of a radius above land; detached at the limb. | Altitude 1.19 radius (+0.03 alternate banks). Drift, shapes and Blender remesh unchanged.             |
| Opening Earth | Coast teeth dominated the hero.                                 | Continuous coast; airfield, boats, piers and crops re-validated against the new shore.                |
| S1            | Teal land matched the water heuristic; loose grey boulders.     | Grey city plate, low-rise blocks between towers, water only where the ocean colour matches.           |
| S2            | Raised crater rim, floating hexagonal fence, flat-card peaks.   | Benches wrapped onto the globe over an outline-matched carve; grounded fence with ramp gate; massifs. |
| S3, S10       | Stepped lake and bay edges.                                     | Contour coasts only; settlements and ferry/barge routes unchanged in design.                          |
| S4            | Land rendered with the glossy water material.                   | Correct mineral material on land; smooth river-bay coast.                                             |
| S5, S9        | Beaches and cliffs rendered as water.                           | Correct beach material; S9 remains deliberately quiet.                                                |
| S6            | Engineered shell unaffected by coast issues.                    | Reviewed; rebuilt with the new terrain only.                                                          |
| S7            | Half-globe arch with floating feet read as a crown of blocks.   | Smaller ruined gateway on grounded piers, fallen stones and ivy.                                      |
| S8            | Broken arch feet floated; stepped coast along the purple sea.   | Grounded piers; contour coast beside the rift.                                                        |
| Venus (5)     | Tan and brown belts read as Jupiter.                            | Pale cloud deck with soft sideways chevrons (Blender and procedural fallback).                        |
| Asteroids (7) | Faceted spheres.                                                | Lobed bodies with impact dents; displacement fades to zero around every working site.                 |
| Outer ice (5) | Same sphere as the ore body.                                    | Shares the lobed shape; its settlement sites keep their ground radius.                                |

Captures: [Earths before](earths-before.jpg), [Earths after](earths-after.jpg),
[companions before/after](companions-before-after.jpg). Luna, Mars, Kuiper and solar portraits
were reviewed and left unchanged apart from rebuilding.

## Journey and site

- Ten-world overview is a staggered 3-4-3 constellation; on phones it now clears the heading.
- World statistics: the exponent no longer inherits headline tracking (`8 × 10²¹ J`); labels and
  links are 10–11px.
- Hover and keyboard focus draw an orbit ring around the named body, so a large Earth's label that
  falls beside a companion is unambiguous. Focus uses a 2px ring.
- Growth chart: S1, S8 and S10 share identical published values and one grouped label; other
  labels alternate either side of the diagonal.
- Header fade extends 24px as a paint-only gradient; scrolled copy dissolves instead of
  reappearing beside the wordmark.
- Methods data-path steps number 01–04; Observatory assumption value, caveat and citation are
  separate lines; the 404 uses the display and mono families.
- A full-page capture shows a hard sky edge on inner pages; a real scrolled viewport does not
  (fixed backdrop). No change was made.

Captures: [story after](story-after.jpg), [selected story before](story-before-selected.jpg),
[mobile after](mobile-after.jpg), [site fixes](site-fixes-after.jpg).

## Sources, derivatives and payload

- Seeds exported, 32 routes regenerated (`--check` reproducible), all 11 `.blend` sources rebuilt
  serially under the existing two-thread, 4 GiB guard; every build succeeded. 39 of 59 GLBs change.
- Asset ledger: `blender-planet-polish-v12-2026-09-30` (59 GLBs, 11 sources) and world art
  `planet-polish-v25-2026-09-30`, [art source](art-source.json). Previous identities:
  [previous manifest](previous-model-manifest.json).
- Models: 10,068,703 → 10,324,493 gzip bytes (+255,790). [Bundle receipt](bundle.json): initial
  JavaScript 202,129 / 256,000 gzip bytes; conservative mobile journey 20,738,152 / 20,971,520
  bytes. Headroom is now about 233 KB.

## Verification

- Prettier, ESLint and TypeScript pass. Vitest: 41 files, 153 tests pass, including new
  [coastline tests](../../../apps/web/app/voyage/coastline.test.ts) (land stays on the land side
  of the shoreline on every world and tier, cliffs stand upright, the S2 carve stays beneath every
  bench and leaves the rim, and wrapping preserves local height). The contour split adds facets, so
  the existing flat-facet check now collects mismatches and asserts once (same condition; 0.7 s
  instead of up to 5.8 s under parallel load). Three consecutive full runs pass. Existing hull-clearance,
  airborne, terrain-seam and Blender-part tests pass on the re-planned routes.
- Source (15), canonical data (8 datasets, 1,361 fields), asset (107 rights / 95 derivatives) and
  link (123 routes, 196 chunks) validators pass; the known growth-rate source discrepancy is still
  reported, not reconciled.
- Production build and bundle budgets pass.
- Playwright on the production build. Chromium: 69 pass, 3 fail. Mobile WebKit: 68 pass, 3 skip,
  1 fails. Firefox (Blender, explorer and accessibility specs): 20 pass after one cold-start
  navigation timeout passed on rerun. On an untouched checkout of `2b051de`, the same Chromium
  story-link and deep-space history tests and the mobile S9 solar-collector click fail identically;
  they are pre-existing. The Chromium telescope test failed only under parallel load and passed
  3/3 in isolation.
- Browser captures of all 17 chapters, 47 portraits and 8 phone chapters report zero page or
  console errors.

## Remaining risks

- The four pre-existing end-to-end failures remain and deserve separate fixes.
- Payload headroom is limited; larger future models need offsetting savings.
- Browser emulation is not evidence for every physical phone or GPU; independent scientific,
  assistive-technology and physical-device review remain separate from this art pass.
- Nothing was committed, pushed or deployed.
