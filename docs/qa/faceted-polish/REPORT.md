# Faceted world polish — QA report

2026-11-17, for [Decision 040](../../DECISION_040_FACETED_POLISH.md).

![Before (top) and after (bottom): S1, S3, S5, S8, S9 and S10 Earth, then the S2 and S9 Moons](before-after.jpg)

## Audit method

`scripts/capture-faceted-audit.ts` drives a GPU-backed Chromium (Metal ANGLE) against a production
build. It moves the pointer off the canvas before every capture so hover rings stay out of the
frames. One run covers:

- all 17 story chapters at 1440 × 900, and on a 390 × 844 phone;
- every world in the explorer, each of its Solar System destinations, and every landmark on
  Earth (50 close-ups);
- the atlas index, the ten atlas pages and the observatory.

The before and after sets (about 270 images) stay local in `media/kit-process/16-faceted-polish/`
for process posts. The before and after runs recorded no page errors. The only console message
was the framework's CSS preload notice.

## Verification

Run on this machine, as CI runs it:

- `pnpm check` passed: format, lint, typecheck, 153 unit tests, the Python and resilience suites,
  source, data, asset and link validation, the research evaluation, the build and the bundle
  budgets. Two voyage tests that encoded the old radii now read them from `terrain.ts`.
- `pnpm test:e2e` on all five projects: 416 passed, 8 skipped, 1 failed. The failure was Firefox's
  `organic-reveal.spec.ts`. It also failed once in four isolated repeats, with S3's Moon missing
  from the companion list. Companions mount from React chapter state, which can trail the canvas
  scene by a frame, and the spec sampled once. It now waits for the Moon before sampling, with the
  reveal assertions unchanged. After that change it passed 8 of 8 on Firefox and 5 of 5 across all
  projects.
- `pnpm source:reproduce:strict` passed (15 checksum-locked source PDFs).
- The visual suite in the pinned Playwright image changed only `first-light-earth.png` (4% of
  pixels: the coast step and clouds). It was inspected, regenerated and compared again: 4 passed.
- The 59 Blender exports were rebuilt with Blender 5.3 and admitted by
  `scripts/record-blender-art.ts` as `blender-faceted-polish-v13-2026-11-17`.

## CI follow-up (2026-11-18)

GitHub's required checks found three things the local runs did not:

- **Visual baseline.** Two causes were mixed together. First, a loading race: the worlds swap
  code-drawn stand-ins for Blender exports once those load, and the test captured without waiting,
  so CI's renders varied (1,659, 1,693 and 3,149 pixels from the baseline). The test now advances
  the paused clock until every visible Blender library is ready. Second, once fully loaded, CI's
  x86 SwiftShader and the same pinned image emulated on Apple silicon still anti-alias the faceted
  globe's edges about 3,100 pixels differently; the images are otherwise identical. The baseline is
  now CI's own render and the opening shot allows 4,000 differing pixels, so the local runner
  passes too. A real scene change moves tens of thousands. Reduced motion also now rests every
  globe on its authored turn instead of freezing its spin mid-swing.
- **Every-destination story test.** It loads all ten worlds' Blender exports in software WebGL and
  needs more than three minutes on CI in Chromium as well as WebKit, so both get six.
- **Worker-free model loading.** Main-thread decoding on CI's WebKit exceeded the default
  five-second wait, so it uses the 45 seconds the other model specs allow.

## Remaining limits

- Clouds are still faceted solids. They read as weather at story scale, but they aren't volumes.
- The planets' hover label can still sit beside a companion body when the pointer rests on Earth.
- Short phones (about 667 px tall) still bring the opening globe close to the title, as before.
