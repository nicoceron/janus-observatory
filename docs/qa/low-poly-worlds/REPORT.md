# Low-poly worlds QA — 2026-09-30

Verification for [Decision 034](../../DECISION_034_STORY_DRAWN_LOW_POLY_WORLDS.md) on branch
`claude/low-poly-planets-redesign-e6a3a2`.

## Evidence

| Image                                                                                                                                                  | Shows                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| [all-worlds.jpg](all-worlds.jpg)                                                                                                                       | Development lab: present-day Earth and S1–S10 at story quality        |
| [story-first-light.jpg](story-first-light.jpg)                                                                                                         | Opening present-day Earth                                             |
| [story-possibilities.jpg](story-possibilities.jpg)                                                                                                     | Ten-world overview at overview quality                                |
| [story-s1.jpg](story-s1.jpg), [story-s5.jpg](story-s5.jpg), [story-s6.jpg](story-s6.jpg), [story-s9.jpg](story-s9.jpg), [story-s10.jpg](story-s10.jpg) | Scenario chapters with their published companions and system features |
| [explorer-s6-suspended-regulator.jpg](explorer-s6-suspended-regulator.jpg)                                                                             | Explorer landmark study                                               |

Captured at 1440 × 900 with hardware WebGL in headless Chromium against the development server.
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
