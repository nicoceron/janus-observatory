# Decision 012 — Character recognition, loading, and native chapter navigation

Date: 2026-09-05. In-scope implementation following user rejection of the previous character,
loading experience, scroll pacing, and right-edge navigation. Supplements Decision 011.

## Diagnosed failures

The previous rear-facing, small character hid its facial anatomy. The garment dominated its
265k-triangle scene; periodic normal detail looked woven rather than biological. A narrow viewport
required a second spatial opt-in even after an explicit Start. Repeated card entrances interfered
with backscroll. The tiny right-edge chapter buttons did not provide a clear reading position.

`getScenarioProfile` also rebuilt profiles during React renders. Each profile called the public
observatory resolver five times; each call parsed the entire observing dataset again. This is
unnecessary for release-pinned, generated data and particularly harmful while scrubbing.

## Decisions

- Keep all public untrusted-input validation. Add `createPublishedObservationResolver` to validate
  one Zod-cloned snapshot and resolve multiple cells without reparsing. Cache each generated
  scenario profile once. This is an additive shared-domain API change, not a schema change.
  Equivalence tests cover all fifty scenario/method cells. Canonical data and sources are unchanged.
- Use the documented Three.js WebGL2 renderer and ShaderMaterial API for the spatial scene.
  Two shared GLSL programs replace the per-world TSL graphs and WebGPU adapter initialization.
  Scenario changes use uniform values; the maps retain source registration and linear/output
  color handling. No postprocessing dependency or second animation system is introduced.
- Explicit Start/Resume/chapter navigation is sufficient spatial intent, including mobile.
  Passive low-tier scrolling remains poster-first. Read, reduced-motion, failed-WebGL, and
  context-loss recovery remain available. A real Earth poster persists while the code loads.
- Replace the right rail with a native details/summary chapter navigator, previous/next actions,
  readable current chapter and step count, and an unobtrusive progress line. Its zero-height
  sticky wrapper sits above, not inside, the spatial stacking context. Escape closes the menu.
  Controls own their arrow keys; the story must not hijack radios, select controls, or buttons.
  Guided pages put anchor clearance on the story targets instead of the viewport. Regression
  testing reproduced a 353px Chromium focus scroll when a visible toolbar fell inside the old
  viewport scroll-padding. This CSS correction preserves native focus and native scrolling.
- Ordinary steps use shorter native flow (90svh desktop, 100svh narrow), with 200/220svh for
  the authored observer shot. Adjacent navigation is natively smooth; distant chapter jumps
  settle directly instead of animating through thousands of pixels. Prose does not replay
  staggered entrances. Reading-line reconciliation still owns reverse scrolling and restoration.
  Start and same-index Resume also settle directly: a Firefox run reproduced a click race while
  the initial smooth scroll was still moving the toolbar. Only an actual adjacent-step change
  uses native easing. Late-shot method controls clear the optical approach and return on reverse.
  Programmatic targets remain selected until the native document `scrollend` event, rather than
  the first intersection threshold. The existing bounded timeout covers older implementations
  and zero-distance requests; wheel/touch input still cancels the target immediately. Five
  repeated rapid-keyboard/restart runs each on Firefox and mobile WebKit passed after this fix.
  A broader Safari run still reproduced an in-flight reversal at its current scroll position.
  A new navigation request first aborts native scrolling at the current position, then sets its
  destination, following CSSOM View's scroll-abort model. The full mobile WebKit story suite
  subsequently passed three consecutive runs (27 executed tests, 12 scoped skips).
  Keyboard chapter shortcuts resolve immediately, keeping focus and the menu stationary during
  rapid navigation. Pointer-operated adjacent-step buttons retain native smooth scrolling.
- Character v2 exposes a large tapered cranium, slanted dark eyes, elongated neck, and three
  fingers plus an opposed digit. Camera begins in a close three-quarter view and arcs into
  the optical axis. Fine detail is restrained and the garment is simplified before skinning.
  Static metal surfaces have flat caps rather than incorrectly smoothed balloon-like normals.
  The old v1 sources and public assets remain recoverable.
- Eight scenarios gain Moon/Mars/Venus context where canonical positive planetary signatures
  support it. S4 and S7 retain deliberate Earth-focused compositions with explicit explanation.
  S9 retains its separately sourced stellar-structure cutaway. Presence is derived from canonical
  rows with exact source references, not a hard-coded scientific list. The new current-day maps
  do not pretend to predict terraformed surfaces, settlement layouts, relative sizes, or distances.

## Documentation and rights

Read the installed Next.js lazy-loading guide and Three.js `ShaderMaterial`/`WebGLRenderer`
source documentation before implementation. Planet maps are from
[Solar System Scope](https://www.solarsystemscope.com/textures/), CC BY 4.0, based on NASA data;
the provider explicitly notes enhanced colors and fictional infill in unmapped regions.
Original JPEGs, optimized WebPs, dimensions, checksums, and credits are in the asset ledger.
The v2 Blender model and posters are also ledger-admitted. No Firefly generation, reference
upload, generative credits, paid service, git push, or public deployment was used.

## Acceptance boundaries

Record final loading, payload, browser/state, keyboard, motion, fallback, and asset-validator
receipts under `docs/qa/refinement/`. A contact sheet is diagnostic, not an artistic score.
The model remains an authored real-time character; a render is not proof of photorealism.
Real physical-phone performance needs an attached phone; local browser emulation and the
Apple GPU cannot establish phone thermal behavior, Safari field performance, or Core Web Vitals.
