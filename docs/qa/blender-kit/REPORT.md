# Blender kit QA report

2026-11-12, for [Decision 036](../../DECISION_036_BLENDER_KIT.md). Canonical data is unchanged by
this work.

## What was reviewed

- **Every model.** All 262 kit models were rendered on review sheets from the front (azimuth 35)
  and back (150), and the families that are seen from above (homes, terrain, system bodies) from
  an elevated view. Each family was authored against
  [the art direction](../../KIT_ART_DIRECTION.md) and its acceptance checklist, then reviewed
  again as a whole before export. `python3 scripts/kit.py stats` reports no model over its
  triangle budget.
- **Every scene in the browser** (hardware WebGL, production and development builds): the opening
  Earth and all ten scenario worlds at story quality, the eleven together, companion bodies for
  several scenarios (Moon S1, S2 and S8; Mars S2, S5 and S9; Venus S6 and S10), the four system
  scenes (asteroids, outer giant, Kuiper body, collector swarm), the observer chapter and the
  telescope passage, and the full story from top to bottom.

![All eleven worlds, before and after](before-after-all-worlds.jpg)

![The observer in the story](observer-in-story.jpg)

Sample review sheets: [S1–S3 landmarks](sheet-landmarks-s1-s3-front.jpg),
[S4–S6 landmarks](sheet-landmarks-s4-s6-front.jpg),
[S7–S10 landmarks](sheet-landmarks-s7-s10-front.jpg), [homes](sheet-houses-front.jpg),
[stations and high-technology structures](sheet-space-front.jpg). The full set, the
work-in-progress passes and video are in the uncommitted process archive (`media/kit-process/`).

## Checks

| Check                                                                            | Result                                                                                                                                                                                 |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                                                              | Passes for this work. It still reports files under `.claude/worktrees/`, which are other checkouts and not part of this change.                                                        |
| `pnpm lint`                                                                      | Pass                                                                                                                                                                                   |
| `pnpm typecheck`                                                                 | Pass                                                                                                                                                                                   |
| `pnpm test` (unit)                                                               | Pass: 46 files, 195 tests                                                                                                                                                              |
| `pnpm lint:python`, `pnpm test:python`                                           | Pass (pipeline untouched)                                                                                                                                                              |
| `pnpm source:validate`, `data:generate:check`, `data:validate`, `links:validate` | Pass                                                                                                                                                                                   |
| `pnpm assets:validate`                                                           | Pass: the four kit packs are admitted as `janus.kit.v1.*` with source and pack checksums                                                                                               |
| `pnpm build`                                                                     | Pass                                                                                                                                                                                   |
| `pnpm bundle:check`                                                              | Pass: home JavaScript 202 KB of 256 KB; opening visuals 0.69 MB of 1.5 MB (mobile); guided journey 4.6 MB of 20 MB; no file over 4 MB                                                  |
| Playwright, Chromium (software WebGL, production build)                          | 67 of 68 pass. The one failure, `story.spec.ts` "the story is complete before WebGL…", fails identically on unmodified `main` ([Decision 035's report](../low-poly-worlds/REPORT.md)). |
| Playwright, mobile Chromium (Pixel 7 profile)                                    | 64 of 66 pass. The two failures, `chapter-sync.spec.ts:3` and `spatial-system.spec.ts:5`, fail identically on a clean checkout of `main` (`20b797e`), run for comparison.              |
| Playwright, Firefox, WebKit, mobile WebKit                                       | Not run: those browser builds are not installed on this machine. See "Not validated".                                                                                                  |
| `lint:resilience`, `test:resilience`, `resilience:validate`, `eval:research`     | Not run: the resilience lab and research evaluation are untouched by this work.                                                                                                        |

New tests written with the work: kit pack decoding and bounds, unlit twins, the Earth relief
blob, the inflate fallback, the loader's listener re-entrancy, lanes that keep props off roads,
open-water berths, toy proportions, town clusters, aircraft altitude, the unlit-world rule for
props, and the ledger entries for the four packs.

## Defects found and fixed during QA

1. **Endless loop in the pack loader.** A page whose first world needed a pack that had not
   arrived (any atlas world opened directly, and sometimes the story) hung and then crashed the
   tab: the build queue re-subscribed from inside its own listener and the loader kept calling
   the listener it had just added. The loader now notifies only the listeners present when a pack
   lands. Found by the end-to-end suite (26 failures); covered by a unit test.
2. **Lights on unlit worlds.** New landmark models carried lamps onto S9 and S10, where Table 6
   reports no artificial illumination. An existing test caught it. The rule is now enforced
   centrally for merged models, instanced props and the companions' ground lights.
3. **Weight on the light tiers.** Repeated models (67 machine nodes, hundreds of satellites, 2,400
   colony blocks) made software-rendered worlds three to five times heavier than Decision 035's
   and slowed hydration enough to fail four more end-to-end tests. Light swarm models and lean
   rules for the overview and minimal tiers brought minimal worlds back to 23k–43k triangles.
4. **Open shells drawn inside out.** `lathe` and other open shells could face inward, which the
   site (it culls back faces) would have shown as holes. The bake now orients every shell and
   adds back faces where an open surface is visible from outside.
5. **Benchmark house.** Its gable walls shared a plane with the roof and would have flickered.
6. **Composition faults exposed by detailed models**: towns of two buildings and a road, props
   standing in roads, walls built across their ring, ships aground in straits, aircraft flying
   through towers, and sawtooth colour borders on the Moon, terraformed Mars and S5. Each is
   described in Decision 036.

## Second pass

Fifteen models listed here as weaker after the first pass were rebuilt, the observer's pose was
corrected and S2 was restaged; Decision 036 describes each. Every reworked model was reviewed on
sheets from the front, back and above and then in the browser, on its world or scene.

![The observing pose, before and after](observer-pose-before-after.jpg)

![S2, before and after](s2-before-after.jpg)

## Known limits

- **Model limits their authors still see**: the ruin's wall panels are unbevelled; `titan-wreck`
  reads from above and far (how a planet shows it) better than from a low angle; `sys-asteroid-d`'s
  split is less clear from one side; `sentinel` sits at the edge of its size envelope. None is a
  placeholder.
- **Observer's left arm.** The support hand is on the far side of the tube, so the left upper arm
  crosses the body and sinks slightly into the chest at the shoulder. It does not read as broken
  in close-ups.
- **S2 on the light tiers.** Rival compounds are repeats of the landmark, which the overview and
  minimal tiers do not draw, so there the haul road ends in fields.
- **The declutter treats each prop as a disc** of its longest half-extent, so long props (a harbour
  crane by a dock) cannot stand close together and props cannot stack. S2 was staged around this.
- **The export is not byte-reproducible.** Two exports of the same sources differ by a few bytes
  per pack (the ambient-occlusion bake is not bit-stable), so checksums are recorded after each
  export rather than expected to recur.
- **Illumination share on two landmarks.** A kit landmark's windows are all lit or all dark, so
  the published share no longer varies the S2 enclave or the S3 garden town.

## Not validated

- **Firefox, WebKit and mobile WebKit.** Playwright could not launch them here (their builds are
  not installed), so the suite ran on desktop and mobile Chromium only. The pack loader's
  fallback for browsers without `DecompressionStream` is covered by a unit test and by one
  Chromium end-to-end test that removes the API, not by a real engine that lacks it.
- **Real phones and low-power GPUs.** Frame rate was checked on one desktop GPU and in software
  rendering only.
- **Keyboard, reduced-motion and WebGL-fallback behaviour** were exercised by the Chromium
  end-to-end suite (accessibility scans, reduced motion, the fallback article), not by hand.
- **The deployed Cloudflare build.** `pnpm build:cloudflare` was not run.
