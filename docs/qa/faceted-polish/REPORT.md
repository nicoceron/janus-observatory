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

## Remaining limits

- Clouds are still faceted solids. They read as weather at story scale, but they aren't volumes.
- The planets' hover label can still sit beside a companion body when the pointer rests on Earth.
- Short phones (about 667 px tall) still bring the opening globe close to the title, as before.
