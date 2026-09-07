# Story refinement acceptance — 2026-09-05

Local implementation of the rejected character, loading path, scrolling, and right-hand navigation.
This report supplements Decision 012. It does not mark the entire master plan, photoreal character
art, or physical-phone acceptance complete. The existing development server remains on port 3000;
production verification uses a separate local port 3100. Nothing was pushed or publicly deployed.

## Delivered

- Original Blender character v2: exposed three-quarter face, tapered enlarged cranium, dark slanted
  eyes, long neck, three fingers plus an opposed digit, leaner garment, and a camera arc into the
  telescope. The six-second skeletal action is scrubbed deterministically in both directions.
- WebGL2 rendering and shared GLSL planet programs replace WebGPU startup and per-world TSL graphs.
  One scene persists across all 31 states. A real poster remains visible during deferred loading.
- Explicit Start/Resume/jumps open the interactive scene without a second mobile confirmation.
  Passive low-tier scrolling remains poster-first; read mode and WebGL recovery are retained.
- Release-pinned scenario profiles are cached. The additive domain resolver validates its snapshot
  once rather than reparsing the full observing dataset five times per profile during renders.
  All fifty scenario/method outputs retain equivalence tests and canonical source references.
- The right rail is replaced by a legible chapter menu, step count, previous/next buttons, and a
  restrained progress line. Adjacent steps use native smooth scrolling; long jumps settle directly.
  No wheel interception, smooth-scroll library, or repeated prose entrance animation is added.
- Moon/Mars/Venus context is derived from positive canonical planetary rows for eight scenarios.
  S4 and S7 explicitly remain Earth-focused. S9 retains its stellar cutaway. These reference maps
  are not predicted surfaces, settlement illustrations, instrument images, or a scale model.

## Measured payload

| Observer asset    | Previous v1 | Current v2 |
| ----------------- | ----------: | ---------: |
| Served GLB, bytes |   2,515,688 |    670,428 |
| Triangles         |     265,348 |     48,806 |
| Vertices          |     143,371 |     31,462 |
| Skeletal actions  |           1 |          1 |

The GLB is 73.35% smaller; triangle count is 81.61% lower. This is an asset-size comparison,
not a claim of equivalent improvement in load time or frame rate.

The initial JavaScript budget remains 256,000 gzip bytes; it was not relaxed. The final budget
receipt is `bundle-production.json`: 255,938 gzip bytes. Critical visual bytes are approximately 452 KB and the
conservative all-assets/all-chunks path bound is 11.70 MB, both below their caps. The initial route
has very little budget headroom, so future client features should be split or remove existing cost.

Cold browser contexts against the warm development server transferred about 3.48 MB desktop and
2.82 MB portrait through the observer, versus 5.36 MB and 4.70 MB before. Individual local timings
varied; they are not a controlled field benchmark. See `loading-before-dev.json` and
`loading-final-dev.json`. Production loading is recorded separately in `loading-production.json`.

The cold-browser, warm-production-server sample on an unthrottled Apple M4 Max measured:

| Viewport | Article / Start button available | Start to spatial-ready state | Jump to observer-ready state | Resource transfer through observer |
| -------- | -------------------------------: | ---------------------------: | ---------------------------: | ---------------------------------: |
| 1440×900 |                           179 ms |                     1,192 ms |                       126 ms |                    2,328,456 bytes |
| 390×844  |                            90 ms |                       836 ms |                       118 ms |                    1,668,750 bytes |

These are application-state timings, not first-pixel presentation, cold-server response, or phone
benchmarks. The script intentionally reports browser errors separately; neither sample had any.

## Verification and review

- TypeScript, ESLint, Prettier, 117 TypeScript tests, Ruff, and 18 Python tests passed.
- Final combined story/cinematic/accessibility run: **128 passed, 22 intentional skips, zero
  failures**, across Chromium, Firefox, WebKit, Pixel 7 emulation, and iPhone 15 emulation.
  This includes 65 passing axe checks. The two explicit capture sizes traversed all 31 states,
  reverse observer scrubbing, reload, and 200% reading-mode text. Skips avoid duplicate frame
  captures and browser APIs that cannot be overridden outside Chromium.
- Navigation tests cover opening without moving (two-pixel bound), Escape focus, previous/next,
  keyboard/restart, observer ownership, late-shot control removal, and reverse restoration.
  Independent 694×600 Chromium and WebKit checks also preserved the exact scroll position.
- Testing caught and corrected a viewport-scroll-padding focus jump, an initial-scroll click
  race, and Safari interruption races. Start and keyboard shortcuts now settle immediately;
  adjacent-step buttons retain native smooth scrolling. New navigation cancels an in-flight
  scroll first, and programmatic selection releases on native `scrollend`, with the existing
  bounded timeout and immediate wheel/touch cancellation. Decision 012 records the progression;
  the final combined run above supersedes the earlier failed attempts.
- Source validation: 15 records and checksums. Canonical validation: eight datasets, ten scenarios,
  five missions, 1,361 exact provenance records, 120 reconciled cells, 27 generated files. Generator
  reproducibility passed. The pre-existing published growth-rate discrepancy remains explicit.
- Asset validation: 44 rights records, 35 derivative records, 34 public files; hashes, decoded
  dimensions, MIME types, staging, and complete public asset coverage passed.
- Local links: 64 route files and 196 citation chunks passed.
- glTF-Transform 4.5.0 validation of the tangent-complete export found no errors. Five non-root
  skinned-mesh warnings remain; the Three.js clone and forward/reverse animation were exercised.
  Empty authored camera/rig nodes also produce informational messages.

The animation-quality gate influenced the redesign: face visibility, subject dominance, smoother
silhouette, and separation from the telescope were reviewed using the six-frame Blender contact
sheet and actual browser captures. One coarse-sampling numeric warning remains between frames
120 and 150 during the optical approach; it is not hidden or presented as an artistic score.

`sequence-review.mp4` is a 31-state Remotion contact review made from actual updated desktop
screenshots: H.264, 1440×1080, 30 fps, approximately 77.5 seconds. It is not a recording of smooth
runtime animation. The older v1 Blender forward/reverse video was not relabeled as v2. The current
runtime scroll check and frame-cadence scope are recorded in `motion/capture-report.json`.

The live-motion run captured 18 frames with zero runtime issues. Both six-second forward/reverse
samples remained inside the observer state throughout. On Apple M4 Max / ANGLE Metal, p95
requestAnimationFrame intervals were 9.7 ms for 1440×900 and 9.3 ms for 390×844 touch emulation; the
longest intervals were 10.4 ms and 10.3 ms respectively. This is warm, unthrottled browser callback
cadence, not measured GPU presentation FPS and not physical-phone certification.

## Assumptions, sources, and remaining boundaries

- The character is a fictional real-time stylized alien. It is more recognizable, but is not a
  photoreal creature sculpt, physically simulated garment, or film-quality facial animation.
- Off-world coverage means source-supported planetary context, not bespoke future-city artwork
  for every world. Current-day maps deliberately do not invent future surface evidence.
- Canonical release remains `2026-08-12`. Scientific datasets and generated outputs were not edited.
- Original Blender 5.2.1 LTS scene and exported derivatives retain source/derivative SHA-256 hashes
  and transformation history. v1 files remain recoverable rather than being deleted.
- Moon, Mars, and Venus maps are Solar System Scope CC BY 4.0 reference textures, based on NASA
  data with the provider's enhanced colors and fictional infill caveat. Credits and links are
  visible on Sources and preserved in the ledger. No restricted S7 music or pipeline PDFs were bundled.
- No Firefly generation/upload, paid license, or generative-credit spend occurred.
- `xcrun devicectl list devices` found no attached devices. Browser emulation and local Apple GPU
  measurements cannot verify physical-phone thermals, real touch ergonomics, or field Core Web Vitals.
- Automatic axe checks are not a complete manual WCAG audit. No claim of whole-site visual parity
  or completion of every master-plan milestone is made.

## Changed files in this refinement

- Application: `apps/web/app/story/{StoryExperience,EarthStage,ChapterNavigator}.tsx`,
  `chapter-navigator.module.css`, `cinematic.module.css`, `offworld-context.ts`, and
  `scene/{CinematicScene,Planet,Observer,SystemContext,OffworldContext}.tsx`, `scene/scene-layout.ts`.
- Data adapter/API: `apps/web/lib/canonical-core.ts`,
  `packages/domain/src/observatory-engine.ts`; corresponding cache, resolver, off-world, and asset tests.
- Acceptance: `apps/web/e2e/{story,cinematic}.spec.ts`,
  `scripts/{measure-story-loading,capture-premium-motion-qa}.ts`.
- Assets: `assets/sources/janus-cinematic/build_observatory.py`, v2 Blender/GLB/normal/shot sources,
  `assets/sources/solarsystemscope-context/`, new v2 model/posters and three context WebPs under
  `apps/web/public/assets/`, `data/assets/ledger.json`, `apps/web/app/sources/page.tsx`.
- Documentation/review: Decision 012, this report and receipts, `.prettierignore`,
  `media/cinematic-review/stage-review.mjs` and its README. Earlier dirty v1 work was preserved.

Implementation references: [Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading),
[Three.js ShaderMaterial](https://threejs.org/docs/#ShaderMaterial),
[native sticky positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position),
[native focus behavior](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus),
[scroll completion](https://developer.mozilla.org/en-US/docs/Web/API/Document/scrollend_event), and
[Solar System Scope texture rights](https://www.solarsystemscope.com/textures/).
