# Cinematic rebuild — implementation and acceptance record

2026-09-04. Local implementation, not a production deployment or scientific release approval.

## Delivered

- Replaced the old 2,600-line spatial renderer with a persistent scene, pure complete-state
  layout evaluator, registered Earth materials, authored observer, and a separate S9 stellar
  cutaway. All ten world groups stay mounted; inactive worlds do not become decorative moons.
- Preserved all 31 states and five observing paths. Ocular changes update canonical DOM
  evidence over the same globe; generated future-world pictures no longer replace it.
- Authored an original Blender character, continuous garment, ten-bone rig, fixed instrument
  contacts, restrained focus/settle performance, telescope, observatory, and landscape/portrait
  camera tracks. One normalized scroll time controls both performance and camera. No idle
  spinning, antenna bounce, independent random character motion, or scroll interception.
- Replaced branch decorations with thin SVG connectors projected from the actual 3D world
  positions. Prose, labels, controls, citations, and evidence remain structured DOM.
- Reworked typography, panel contrast, spacing, mobile evidence, matrix layout, exit links,
  and the collapse chapter. The latter now retains the same spatial globe and only shows
  published inputs/aggregates; no invented oscillation curve or duplicate planet poster.
- Fixed reading-line ownership for the tall observer chapter, reverse scrolling, and reload
  at depth. Added a loading poster until the observer asset itself is ready, not merely until
  the renderer initializes. Kept Start/Read/Skip, keyboard controls, reduced motion, graphics
  recovery, tiered assets, and poster-first mobile opt-in.
- Added an isolated Remotion review workspace and actual-frame review movies. No Remotion
  dependency, smooth-scroll library, ScrollTrigger, or second tweening library enters Next.js.

## Visual review and corrections

The animation-quality-gate contact sheets were used as a diagnostic, not an aesthetic score.
The first renders were rejected for detached-looking shoulders, exaggerated cranial ridges,
white exported pigments, harsh reflective system tiles, and awkward camera framing. Corrections
included continuous remeshed tailoring, a subdivision pass, reduced ridge amplitude, direct
vertex pigments, generated tangents, rougher metal, and a wider/lower portrait composition.

Browser captures exposed additional defects not visible in Blender: an obsolete CSS rule
hid the observer canvas, a ready-state poster covered the actual model, legacy green card
rules won the cascade, late-story cards overlapped data/links, and mobile rules hid metrics
or clamped prose. These were removed or overridden in the scoped cinematic presentation.

The observer is still a stylized original character, not a photoreal cinematic character.
The distant Earth is small and partly intersects the architecture in the establishing view;
the subsequent camera approach separates the optical target. Final artistic approval against
the original realism target remains a human review, not something the automated checks prove.
The ten surface treatments are intentionally restrained because the papers do not provide
future geographic maps. S9 alone receives the Table 7 stellar-structure illustration; this
is not a fully modeled Solar System with every scenario's possible settlement architecture.

## Verification

- Formatter, ESLint, TypeScript, 112 TypeScript unit/integration tests: passed.
- Python ingestion: 18 tests and Ruff passed. Ingestion code/data were not changed.
- Four-project browser/axe run: 100 passed, 16 intentional skips. Chromium, WebKit, Pixel 7
  emulation, and iPhone 15 emulation; no physical-phone performance claim. The initial mobile
  WebKit failure was an unsupported test mouse-wheel command, replaced with native scrollBy.
- Full desktop 1440×900 and portrait 390×844 captures exercise every state, forward/reverse
  observer sampling, chapter ownership, and reload. All three final capture tests passed after
  the last layout changes. The same tests double the root font size, verify paragraph text
  doubles, and check all reading-mode cards, paragraphs, and citations remain within the viewport.
  This is a text-resize check, not a claim of exhaustive browser-zoom/assistive-technology testing.
- Source validator: 15 records/checksums. Generated-data reproducibility check passed.
- Canonical validator: 8 datasets, 10 scenarios, 5 missions, 1,361 exact provenance records,
  120 reconciled cells, and 27 generated files. The published growth-rate discrepancy remains
  explicitly reported; no silent reconciliation was introduced.
- Asset validator: 38 rights records, 29 derivative records, 28 public files; complete coverage,
  hashes, dimensions, and MIME checks. Link/citation checks passed.
- Production Next.js build and bundle guards passed. Final budget and motion receipts are below.
- Remotion lint/types and npm audit passed with zero reported vulnerabilities. Both review
  compositions were rendered and the forward/reverse composition played in Studio.
- glTF validation reports no errors. Six non-root skinned-mesh warnings remain: the parent
  transform is identity and the browser uses the authored bone transforms. Empty optical/contact
  nodes are intentional. The validator cannot inspect EXT_meshopt_compression itself; browser
  decode/render tests cover that path. Unused tangent notices on untextured materials are benign.

## Performance scope

Host: macOS, Mac16,5, Apple M4 Max (confirmed by ANGLE Metal renderer), 36 GiB RAM,
14 logical CPUs. Local network, no CPU/network throttling.
The motion script reports requestAnimationFrame cadence under active native scroll after
asset warm-up. This is a main-thread diagnostic, not GPU presentation timing or certification
of 60 fps on desktop/30 fps on a physical mobile device. Core Web Vitals field data, extended
thermal/battery testing, and manual assistive-technology auditing remain unverified.

| Final local measurement                            |              Observed | Guardrail or scope                           |
| -------------------------------------------------- | --------------------: | -------------------------------------------- |
| Initial modern-browser JavaScript                  |    255,569 bytes gzip | 256,000 bytes; only 431 bytes headroom       |
| Critical visual payload                            |         450,970 bytes | 1,572,864 mobile / 3,145,728 desktop         |
| Guided-path conservative upper bound               |      10,945,786 bytes | 20,971,520 bytes                             |
| Hardware desktop RAF interval, median / p95 / max  | 16.6 / 17.4 / 25.1 ms | 1440×900, DPR 1, 420 samples                 |
| Hardware portrait RAF interval, median / p95 / max | 16.6 / 16.9 / 25.7 ms | 390×844, DPR 1, touch emulation, 449 samples |

The initial default-headless run used ANGLE SwiftShader software rendering and was poor:
desktop mean cadence 6.0 Hz (p95 316.8 ms), portrait 4.1 Hz (p95 358.4 ms, longest 2,833.3 ms).
It is retained in `motion/capture-report.json`; it is not hidden behind a successful hardware
run. `motion-hardware/capture-report.json` records the explicit hardware opt-in, verified
Apple Metal driver, 18 transition frames, observer-only ownership throughout both cadence
samples, and zero console/page/request errors. The hardware
check uses Chromium's documented `--enable-gpu` option and the macOS Metal backend. These
RAF measurements do not directly measure GPU frame presentation. Poster/Read modes remain
important for software-only and low-powered environments.

Initial JS is very close to the existing 250 KiB guardrail. Do not casually add production
dependencies. The compressed observer is approximately 2.52 MB; the system cutaway is
approximately 251 KB. Both remain deferred, and mobile stays poster-first until opt-in.

## Sources, rights, and assumptions

Scientific release identity remains
`sha256:46a0e94a969301c49cfafe00463e5c7e9be5dce423ddcdeb21fe4ad0614d2046`,
`candidate_pending_independent_review`. All runtime scientific fields still come from generated
canonical data; none were authored in component literals.

Scenario narrative: JANUS-PAPER-01, arXiv:2409.00067v3. Observing evidence: JANUS-PAPER-03,
arXiv:2511.20329v2. Collapse: JANUS-PAPER-05, arXiv:2604.13774v1. Exact field locators remain
in canonical records. Earth textures are Solar System Scope CC BY 4.0, as resized/merged by
the pinned Three.js example; they are not newly generated NASA observations. Required credits
and transformations are in `data/assets/ledger.json` and the source page.

Character, rig, props, and stellar cutaway are original fictional geometry. S9's cutaway is
gated by the published `dyson_sphere` field, is separate from Earth, and is never shown as an
instrument result. Relative size, panel count, and engineering geometry are editorial.

Remotion is assumed to be used by an individual or an organization of at most three people;
a larger organization must confirm its company license before adopting the tooling. No
Firefly generation, reference upload, generative-video credits, paid license purchase,
external publication, git commit/push, or unrelated product mutation occurred.

## Files and reproducibility

Runtime: `apps/web/app/story/{EarthStage,StoryExperience,reading-line,world-art}`, scoped
`cinematic.module.css`, and `scene/{CinematicScene,Planet,Observer,SystemContext,scene-layout}`.
Regression coverage: adjacent unit tests, `apps/web/e2e/{story,cinematic}.spec.ts`, the asset
ledger count test, and extended `scripts/capture-premium-motion-qa.ts`.

Authoring: `assets/sources/janus-cinematic/` contains editable Blend sources, scripts,
uncompressed exports, original normal/poster PNGs, and generated camera metadata. Public
derivatives are under `apps/web/public/assets/{models,observer,planets}`. Old admitted models
and media remain recoverable; none were deleted.

Review: `media/cinematic-review/README.md` documents staging/Studio/render commands. This
directory contains `observer-contact-sheet.png`, `observer-forward-reverse.mp4`, and
`sequence-review.mp4`; browser captures and raw motion frames are reproducible ignored outputs.
Decisions and scientific/art boundaries: `docs/DECISION_011_CINEMATIC_SCENE_AUTHORING.md`,
`docs/CINEMATIC_ASSET_DIRECTION.md`, and `docs/THREEJS_SEQUENCE_REBUILD_PLAN.md`.
The reading-line change is also recorded in `docs/SCROLLYTELLING_DESIGN_CONTRACT.md`.

Run `pnpm exec playwright test apps/web/e2e/cinematic.spec.ts --project=chromium --workers=2`
for the complete frame capture, then the review README commands. Run `pnpm qa:motion
docs/qa/cinematic-rebuild/motion` against the chosen local preview for transition samples and
cadence diagnostics. For a separate hardware receipt on macOS, use:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 JANUS_QA_HARDWARE_GPU=1 pnpm qa:motion docs/qa/cinematic-rebuild/motion-hardware
```

The selected preview must already be running. Runtime camera metadata is generator-owned;
do not hand-edit it. Next.js regenerates `next-env.d.ts` for each mode; after production QA,
its imports were returned to the running development server's `.next/dev/types` directory.

Diagnostic API references: [Playwright page.evaluate](https://playwright.dev/docs/api/class-page#page-evaluate)
and [Chromium headless GPU support](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/gpu/using-gpu-hardware-in-headless-chrome.md).
