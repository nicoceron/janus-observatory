# Low-poly worlds QA — 2026-09-30

Verification for [Decision 034](../../DECISION_034_STORY_DRAWN_LOW_POLY_WORLDS.md) on branch
`claude/low-poly-planets-redesign-e6a3a2`.

## Evidence

| Image                                                                                              | Shows                                                         |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [all-worlds.jpg](all-worlds.jpg)                                                                   | Development lab: present-day Earth and S1–S10 at story detail |
| [story-first-light.jpg](story-first-light.jpg), [story-possibilities.jpg](story-possibilities.jpg) | Opening present-day Earth; ten-world overview                 |
| [story-s1.jpg](story-s1.jpg) … [story-s10.jpg](story-s10.jpg) (S1, S3, S5, S6, S7, S9, S10)        | Scenario chapters with their published companions             |
| [explorer-s3-close.jpg](explorer-s3-close.jpg), [explorer-s7-close.jpg](explorer-s7-close.jpg)     | Explorer zoomed to towns, roads, fields, trees and livestock  |
| [explorer-s6-suspended-regulator.jpg](explorer-s6-suspended-regulator.jpg)                         | Explorer landmark study (revision 1)                          |

Captured at 1440 × 900 with hardware WebGL in headless Chromium against the development server;
revision-2 images were refreshed after the final changes. QA images are local evidence and are
gitignored.
Mobile (390 × 844) composition was also reviewed for the opening, overview, S3 and S8.

## Checks

- `pnpm test`: 42 files, 160 tests pass, including the new `world-signals.test.ts` and
  `planets.test.ts`.
- `pnpm lint`, `pnpm typecheck`, Prettier, `pnpm assets:validate`, `pnpm links:validate`: clean.
- `pnpm --filter @janus/web build`: succeeds; `/planets-lab` serves 404 in production.
- `pnpm bundle:check`: home initial JavaScript 202,051 B gzip (budget 256,000 B); guided-path
  upper bound 902,780 B (budget 20 MiB), with no public 3D assets on the journey.
- Playwright, Chromium, production build: 44 of 46 tests in the affected specs passed in a
  two-worker run. `story-system.spec.ts` then passed alone (1.6 min; `main` at `2b051de` takes
  2.3 min alone), and its two-worker timeout was contention. `world-explorer.spec.ts` passes in
  full, including the dialog axe scan.
- `story.spec.ts` "the story is complete before WebGL…" fails identically on unmodified `main`
  (`2b051de`): scenario copy is inert until its chapter is active (Decision 033). It is
  pre-existing and unrelated to the worlds.
- Build cost measured in Node: 11–69 ms per world at story quality; 6k–27k triangles per world
  in the overview; S1 is the largest world, 68,813 triangles at story quality after halving its
  city blocks.

## Revision 2: inhabited worlds

- `pnpm test`: 42 files, 165 tests, including new checks that every Earth has citizens, plants,
  buildings and moving life at story quality, that the overview has none, that the software tier
  keeps every landmark and no props, that routes stay near the surface, and that S2 Moon, S5 Mars
  and S6 Mars have stations with movers.
- Lint, typecheck, Prettier, `assets:validate`, `links:validate`, `data:validate` and the
  production build pass. `pnpm bundle:check`: home initial JavaScript 202,050 B gzip
  (unchanged); guided-path upper bound 930,524 B (+28 kB over revision 1 for the asset library
  and engine), still with no 3D downloads.
- Triangles per world (merged layers + instanced props + movers): story tier 105k–432k (S1 is
  the largest at 20k + 333k + 79k); overview tier 39k–79k with no citizens or traffic; the new
  `minimal` tier 6k–24k (layers only).
- Headless Chromium on Apple GPU held 110–120 rAF/s on the opening, overview, S1, S3, S5, S7 and
  S10 chapters, with the worst frame under 60 ms.

### Software WebGL and anchor travel

The first revision-2 run failed `deep-space.spec.ts` (anchor travel, deep links, held touch) on
Playwright's default headless Chromium, which renders WebGL with SwiftShader. A Chrome trace
showed every long task was `Commit → GLES2::ReadPixels` waiting on the GPU process: each frame
blocked the main thread until SwiftShader had rasterized it, about 700k triangles for the
ten-world grid. Travel tweens then finished before queued input was handled. Fixes:

- `lowPower()` detects software renderers; worlds and bodies get the `minimal` tier and no idle
  animation, in the story and the explorer. The explorer Earth at overview detail still ran at
  6 fps there and pushed the ten-world inspection sweep past its 180 s budget. Landmark studies
  keep full detail (119 fps).
- Progressive loading: only the focused world may build during a frame (at overview detail);
  every other model streams in from the idle queue (several builds per idle period, 400 ms
  timeout, requested tier first), and the focused world upgrades to its full tier from it.
- Shader warm-up: three unlit vertex-coloured program variants first compiled mid-travel, when
  the ten-world grid first appeared, stalling a frame for 250–900 ms on SwiftShader. Every world
  material now compiles once when the scene mounts, against the scene's lights, and the warm set
  is kept alive so programs are not deleted and recompiled when worlds unmount.
- Idle animation of the focused world backs off from 33 ms to 600 ms when frames run long.

After the fixes:

- `deep-space.spec.ts` passes 5/5 alone in 23 s of test time (revision 1: 36 s), and
  `deep-space.spec.ts` with `world-explorer.spec.ts` passes 24/24 with `--repeat-each=3` on two
  workers.
- Full Chromium suite on two workers: 63 of 68 passed. `story.spec.ts` "complete before WebGL"
  is the pre-existing failure above. The other four (`chapter-sync`, `cinematic` "observer
  continues moving", `observatory-layout` "all ten planets", `story-system`) were timeouts or a
  settle drift while another session's Blender job held about four CPU cores and an unrelated
  Playwright suite ran; all four passed when rerun on one worker under the same load (10/10).
  The earlier two-worker run without that load passed them (66 of 68). Timing-sensitive specs on
  SwiftShader remain load-sensitive.

## Revision 3: toy scale

- Person unit 0.026 planet radii; per-group prop budgets with an even-spacing declutter; landmarks
  about 2.5× larger. See Decision 034.
- `pnpm test`: 42 files, 166 tests. The inhabited-worlds test now bounds each world to 61–236
  static props and at most 46 movers, and a new test checks that no two props overlap on present,
  S1, S3 and S6. Lint, typecheck and Prettier pass.
- Per world at story quality: 100–215 static props, 30–42 movers, 20k–54k triangles.
- Sci-fi set: 19 models in `props/scifi.ts`, reviewed in the lab gallery and in S2, S3 and S6
  explorer close-ups and on the S2 Moon. Robots have their own budget (14 standing, 10 moving),
  so the inhabited-worlds bounds are now 61–250 props and at most 56 movers per world.
- `cinematic.spec.ts` "observer continues moving": the shared `indexJump` helper read `scrollY`
  as soon as the chapter turned active, before the anchor travel eased to rest; under load the
  last ~19 px landed afterwards. It now also waits for `data-anchor-travel="idle"`.
- `deep-space.spec.ts` "anchor travel is interruptible" still failed about one run in five under
  external load: software-rendered frames of 200–450 ms (below GSAP's 500 ms lag-smoothing
  threshold) let the ~1.4 s travel finish in a few frames, before the queued wheel event ran. On
  software rasterizers the story scene now holds while `data-anchor-travel="moving"` and redraws
  when travel ends, keeping the main thread free for input.
- Final checks: `pnpm test` 42 files and 166 tests; lint, typecheck, Prettier, `assets:validate`,
  `links:validate`, `data:validate` and the production build pass. `pnpm bundle:check`: home
  initial JavaScript 202,048 B gzip; deferred 3D chunk 287,382 B gzip; guided-path upper bound
  935,296 B, with no 3D downloads.
- Full Chromium suite on one worker: 67 of 68 passed; the one failure is the pre-existing
  `story.spec.ts` "complete before WebGL". `deep-space.spec.ts` anchor travel then passed 6 of 6
  repeats with no external load; it had failed about one run in four while another session's
  Blender job held three to five CPU cores.
- Reviewed with hardware WebGL: the opening Earth, the ten-world overview, S1, S2, S3, S5, S6,
  S7, S8 and S10 chapters, and explorer close-ups of S1, S3 and S7.

## Revision 3b: bigger toys and set pieces

- The user still could not read the worlds at story distance and asked for bigger robots and
  assets, cool and sci-fi according to each story. Person unit 0.045 planet radii; figures 2×,
  robots 2.6×; smaller budgets; 13 set pieces in `props/heroes.ts`, sized to about a third of the
  planet radius and placed near the limb of the story view (Decision 034).
- Per world at story quality: 64–121 static props, 11–36 movers, 13k–52k triangles.
- Reviewed with hardware WebGL in the lab (present, S1, S5, S8, S9, S10) and in the S1, S2, S3,
  S6 story chapters.

## Data and rights

- Magnitudes come from `data/generated/runtime/{planetary,system,growth,morphology}.json`
  (release-pinned canonical data). No generated or canonical file was edited.
- No new media, fonts or dependencies. Continents are hand-authored; city coordinates are public
  geographic facts.

## Known limits

- End-to-end checks ran on desktop Chromium only; Firefox, WebKit and mobile projects were not run.
- Visual-regression snapshots (`playwright.visual.config.ts`) were not re-baselined.
- Frame rate was not profiled on a low-end phone.
- The retired planet modules and Blender exports remain on disk, unreachable from any route.
