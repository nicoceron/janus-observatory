# Blender kit QA report

2026-11-12, for [Decision 038](../../DECISION_038_BLENDER_KIT.md). Canonical data is unchanged by
this work. The results below are for the branch after `main` (Decisions 036 and 037) was merged
into it.

## What was reviewed

The captures this report shows are generated files and stay local, as for every QA report in this
repository (`docs/qa/**/*.jpg` is ignored). Regenerate them with the commands in
`assets/blender/kit/README.md`, or see the process archive under `media/kit-process/`.

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

| Check                                                                            | Result                                                                                                                                |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                                                              | Passes for this work. It still reports files under `.claude/worktrees/`, which are other checkouts and not part of this change.       |
| `pnpm lint`                                                                      | Pass                                                                                                                                  |
| `pnpm typecheck`                                                                 | Pass                                                                                                                                  |
| `pnpm test` (unit)                                                               | Pass: 47 files, 200 tests                                                                                                             |
| `pnpm lint:python`, `pnpm test:python`                                           | Pass (pipeline untouched)                                                                                                             |
| `pnpm source:validate`, `data:generate:check`, `data:validate`, `links:validate` | Pass                                                                                                                                  |
| `pnpm assets:validate`                                                           | Pass: the four kit packs are admitted as `janus.kit.v1.*` with source and pack checksums                                              |
| `pnpm build`                                                                     | Pass                                                                                                                                  |
| `pnpm bundle:check`                                                              | Pass: home JavaScript 202 KB of 256 KB; opening visuals 0.67 MB of 1.5 MB (mobile); guided journey 4.5 MB of 20 MB; no file over 4 MB |
| `lint:resilience`, `test:resilience`, `resilience:validate`, `eval:research`     | Pass                                                                                                                                  |
| `pnpm source:reproduce:strict`                                                   | Pass: strict reproducibility from 15 checksum-locked source PDFs                                                                      |
| `pnpm build:cloudflare`                                                          | Pass: worker 2,763 KiB of the 3,072 KiB Free limit; the staged kit packs match the manifest; credential scan clean                    |
| Playwright, all five profiles (`pnpm test:e2e`, production build)                | 399 pass, 0 fail, 6 skipped (skips written into the tests: desktop-only and Chromium-only cases); see below.                          |
| Visual regression (pinned Linux container)                                       | 4 of 4 pass. Three baselines are `main`'s, unchanged; the opening Earth was regenerated for the kit; see below.                       |

All of this was run on the authoring machine, not in hosted CI.

**Browser suite.** Chromium, Firefox, WebKit, mobile Chromium (Pixel 7) and mobile WebKit
(iPhone 15) each pass every test they run: 81, 80, 80, 79 and 79.

- The first run after the merge had two failures, both `organic-reveal.spec.ts` on desktop and
  mobile Chromium, which draw with software WebGL. They exposed defect 7 below, which was fixed
  in the build queue. The test also now waits for the world it inspects to be mounted before it
  samples, as the system sweep already did.
- An earlier version of this report listed six failures and called them present on `main`. They
  were present on a copy of `main` that was three merges behind. The current `main` had already
  repaired them, and its versions of those tests are the ones kept.
- Headless Firefox once failed to create a WebGL context when the one test was repeated three
  times in two parallel workers; the page then showed its fallback article, as designed. It did
  not happen in the full runs.

**Visual regression.** `main` had repaired this suite and re-rendered its baselines for
Decisions 036 and 037. Its spec and three of its baselines (the article without WebGL, the
Observatory fingerprint, the Atlas matrix) pass unchanged against the kit. The fourth,
`first-light-earth.png`, is the opening Earth, which the kit redraws: 107,749 pixels differed, all
on the globe and its satellites, with the title and copy identical. It was regenerated, looked at
beside `main`'s image, and accepted; it shows the kit's Earth as the container's software WebGL
draws it (minimal quality, without instanced props). Thresholds are unchanged.

To reproduce, with Docker Desktop running and the workspace installed:

```sh
scripts/visual-regression.sh
```

It builds the site, serves it on port 3200, and compares in the pinned container
(`mcr.microsoft.com/playwright:v1.62.1-noble@sha256:c091b21d9fae78c76e85cd4356431e9b018402f172a214fc7d7a5e9a7e29d8ac`,
linux/amd64) with that container's Chromium; [the environment record](visual-environment.json)
has the details. After an intended visual change, `scripts/visual-regression.sh
--update-snapshots` rewrites the baselines, which must then be looked at one by one.

New tests written with the work: kit pack decoding and bounds, unlit twins, the Earth relief
blob, the inflate fallback, the loader's listener re-entrancy, lanes that keep props off roads,
open-water berths, toy proportions, town clusters, aircraft altitude, the unlit-world rule for
props, the build queue's order, and the ledger entries for the four packs.

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
   described in Decision 038.
7. **A world built after its own moons.** The idle build queue put the most recent request first,
   and a system mounts its Earth before its companions, so the companions were built first. With
   software rendering, where about one model is built every half second, a quick jump left the
   next world's moons and planets on screen for about 2.4 s without their Earth. `main`'s queue
   has the same order; its code-drawn models were cheap enough to hide it. A shown world is now
   built before any shown companion (`planets/queue.ts`), and the Earth arrives in about 0.5 s.

## Second pass

Fifteen models listed here as weaker after the first pass were rebuilt, the observer's pose was
corrected and S2 was restaged; Decision 038 describes each. Every reworked model was reviewed on
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

- **Real phones and low-power GPUs.** Frame rate was checked on one desktop GPU and in software
  rendering only.
- **Keyboard, reduced-motion and WebGL-fallback behaviour** were exercised by the Chromium
  end-to-end suite (accessibility scans, reduced motion, the fallback article), not by hand.
- **The live site beyond a smoke check.** On `janus-observatory.nicocerond.workers.dev` the home
  page, one atlas world and the observer chapter are opened in a real browser after a deploy; the
  end-to-end suite is not run against the deployment.
- **The first half second after a jump on software rendering.** A reader who jumps to a chapter
  the instant the page is ready can still see the next world's companions before its Earth for
  one idle period (about 0.5 s). How long that takes on a phone was not measured.
