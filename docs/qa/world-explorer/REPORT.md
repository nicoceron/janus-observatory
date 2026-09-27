# Individual worlds and living miniature studies

2026-09-08 · `codex/janus-first-light` · local production preview `http://127.0.0.1:3200/`.

## Delivered experience

The ten story worlds are larger and individually framed. The former ring of competing companion
bodies is removed. **Explore this world** opens a focused model explorer using the existing canvas.
Earth, source-selected Luna/Mars/Venus, orbital habitats and system works are separate selections.
Moving vehicles, wildlife and focal landmarks can be clicked for a close-up; the same objects are
available through labeled DOM buttons. Drag, rotate, zoom, reset, pause and Escape are explicit.
Passive pointer parallax is removed. Closing restores the invoking control and story position.

Background vegetation and architecture remain merged for rendering; selectable focal objects and
moving parts remain separate. Original species, routes, dimensions, equipment and architecture are
interpretive art, not scientific inventories or scaled reconstructions.

## World-by-world review

Every model selection was captured at 1440×900 and 390×844: **252 views**, including the companion
settlement variants. Ten individual contact sheets were reviewed, alongside all twenty world
portraits. The review corrected mast framing, deer limb construction and starting orientation,
floating shell routes, detached ice-outpost tanks, oversized towers, foliage crossing controls,
and the formerly blocky biological arch.

| World | Distinctive authored detail                                                                                                                        | Reviewed gallery               |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| S1    | Surveillance skyline, checkpoints, linked residences, distribution depot, electric traffic, controlled pressure district                           | [S1](s1-objects-contact.jpg)   |
| S2    | Open extraction basin, loaded mine trucks, derricks, conveyor and reservoir, lunar extraction equipment                                            | [S2](s2-objects-contact.jpg)   |
| S3    | Civic gardens, courtyards, terraces, glazed greenhouse, community bus and passenger ferry, civic lunar greenhouse                                  | [S3](s3-objects-contact.jpg)   |
| S4    | Mountain woodland, seasonal camp, drying rack, raised stores, carved wayfinder, shaped canoe, walking deer and flying crane                        | [S4](s4-objects-contact.jpg)   |
| S5    | Braided living architecture, growth chambers, synthesis equipment, petal dwellings, biological transit and glider, garden Mars and Venus aerostats | [S5](s5-objects-contact.jpg)   |
| S6    | Segmented engineered shell, maintenance routes, reactors, radiators, manifolds, service rovers and thermal pressure settlements                    | [S6](s6-objects-contact.jpg)   |
| S7    | Reused structures, working water/wind mills, workshops, seed stores, cargo cycle, rigged sailing cutter and walking ibex                           | [S7](s7-objects-contact.jpg)   |
| S8    | Fractured ground, braced ruins, buried bunker, salvage equipment and rover, protected lunar shelters                                               | [S8](s8-objects-contact.jpg)   |
| S9    | Quiet inhabited Earth with wildlife and technological gifts; separately viewed autonomous machinery, modified worlds and solar construction        | [S9](s9-objects-contact.jpg)   |
| S10   | Restored coast and woodland, light transport, craft and wildlife; autonomous off-world infrastructure and an architectural cutaway habitat         | [S10](s10-objects-contact.jpg) |

Boats use lofted hull sections, inset decks, glazing or rigging, and cambered sails. Animals have
defined bodies, faces, antlers or horns, articulated leg joints and wing surfaces. Vehicles have
separate wheels and use-specific bodies/equipment. Lunar and Mars settlements connect pressure
modules through a hub, with airlocks, steps, solar yards, thermal fins, utilities and a rover.
Asteroid works, icy outposts and ringed-giant settlements have different silhouettes and equipment.

## Verification

| Gate                               | Result                                                                                                                                             |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint / TypeScript                | Pass across the workspace                                                                                                                          |
| Unit tests                         | 105 tests in 28 files pass                                                                                                                         |
| Production build and browser suite | Build passes; 176 tests pass across Chromium, Firefox, WebKit, Pixel 7 and iPhone 15 emulation; 4 intentional duplicate-motion skips               |
| Linux visual regression            | 4 tests pass in a separate clean comparison using pinned Playwright 1.62.1 Linux Chromium; Atlas and Observatory baselines remain unchanged        |
| Dialog behavior                    | Every world/body, one surviving canvas, keyboard loop, view controls, Escape, story restoration and Safari invoker focus pass                      |
| Accessibility and fallback         | Axe A/AA, reduced motion, reading mode, no-WebGL retry and JavaScript-free story pass                                                              |
| Direct pointer review              | In-app browser: clicking a surface car opens its study; clicking Luna opens its settlement; drag changes orientation                               |
| Geometry                           | Every planned terrain route and focal object is placed; finite geometry, closed route seams and surface support pass                               |
| New motion studies                 | 84 frames: truck wheels, deer gait, crane/glider wings, both mill mechanisms and cutter motion; all 14 desktop/portrait pause checks freeze pixels |
| Alien and telescope                | Final 44 captures pass: autonomous gestures, eyepiece entry/exit, reduced-motion pixel stability, context-loss/retry and resize; no runtime errors |
| Canonical data                     | 8 datasets, 10 scenarios, 5 missions, 1,361 field provenance records, 120 reconciled cells, 27 generated files validated                           |
| Sources and links                  | 15 source checksums, 83 route files, 196 citation chunks validated                                                                                 |
| Reproduction                       | Generated release check passes; canonical generated files are unchanged                                                                            |
| Asset admission                    | 48 rights records and 36 derivative records across 35 public files validated                                                                       |

The browser review found and fixed Safari pointer-invoker focus restoration. A mobile telescope
exit link could be brought underneath the fixed toolbar; native scroll padding now reserves that
area. The subsequent full browser suite passes. Older failed attempts remain in the work logs;
they are not reported as successful verification.

The final ornamental hero-caption removal follows that full browser run. The final production
build and Linux visual comparison include it. The two story baselines were inspected and updated
for the enlarged models and native scroll padding; a separate four-test comparison then passed.
The pinned Linux browser uses the local host production build, not a Linux application build or
hosted CI.

The final observer contact sheets show stable silhouettes, joined limbs, a readable telescope and
distinct looking, waving and eyepiece poses on desktop and portrait layouts. Local hardware-backed
Chromium measured 9.3 ms p95 requestAnimationFrame intervals across four six-second samples. One
desktop world-transition interval reached 65.2 ms; the other sample maxima were below 10 ms.
These are local browser callback timings, not GPU presentation or physical-phone frame rates.

Evidence: [browser suite](e2e-final.log), [unit tests](unit.log), [types](typecheck.log),
[lint](lint.log), [geometry inventory](geometry-audit.json), [world frames](forms/capture.json),
[all model selections](inspection/capture.json), [animated detail checks](life-motion/capture.json),
[observer, telescope and cadence checks](motion/capture-report.json),
[direct interactions](manual-interaction.json), [asset validation](assets.log),
[reproduction](reproduce.log), [Linux visual comparison](visual-final.log),
[pinned visual environment](visual-environment.json) and [payload report](bundle-production.json).

## Rendering and payload boundaries

The production home uses **191,885 / 256,000 gzip bytes** of initial JavaScript. Critical visuals
use **138,388 audited bytes**, below the 1.5 MiB phone and 3 MiB desktop limits. The conservative
complete-path upper bound is **11,731,953 / 20,971,520 bytes**. Models remain deferred; no new
dependency or second WebGL context was introduced.

The merged ambient world remains below 20,000 triangles. A separately selected companion remains
below 12,000; the largest is S5 Mars at 10,726. Terrain routes are sampled once, not raycast every
frame. Hidden/reduced scenes stop advancing animation, and generated resources are disposed.

## Sources, rights and handoff

Runtime release remains
`sha256:46a0e94a969301c49cfafe00463e5c7e9be5dce423ddcdeb21fe4ad0614d2046`.
Companion inclusion follows the existing canonical view of arXiv:2409.00067v3 Tables 6 and 8;
narrative provenance remains Section 3.2.1 and the locked scenario pipeline references. S9's
orbital-only lunar activity stays orbital-only. No probability ranking or new scientific value
was added. The pre-existing published growth-rate discrepancy and pending independent review
remain disclosed.

All new geometry is original procedural Three.js art with AI-assisted code. No source PDF,
reference-image pixels, external model or unadmitted texture was bundled. The world ledger is
`janus.low-poly.worlds.v5`, version `world-explorer-v5-2026-09-08`; the ordered 32-file checksum is
recorded in [art-source.json](art-source.json). The original-art fallback is
`janus.low-poly.origin-poster.v4`, with its source PNG, derivative WebP, checksums and transformation
history retained. Earlier artwork evidence remains in its original QA folders.

Changed implementation: `apps/web/app/page.tsx` and `apps/web/app/voyage/`, including the explorer,
procedural models, surface projection, activity, cloud layers and model controls. The obsolete
`WorldSystem.tsx` companion ring and old v3 fallback are removed. Tests, capture/audit scripts,
asset ledger, Decision 017, master-plan pointer, implementation ledger and this evidence folder
accompany the change. Shared schemas, canonical data, dependencies and provider settings are
unchanged.

This is local work, not a deployment or hosted-CI receipt. Desktop browser emulation does not
certify physical-phone performance, field Core Web Vitals or manual screen-reader behavior.
Those existing public-release gates and independent scientific review remain outside this visual
refinement.

![All ten individually framed worlds](desktop-worlds-contact.jpg)

![Reviewed articulated motion studies](desktop-living-motion-contact.jpg)

![Reviewed observer gestures and telescope poses](desktop-observer-motion-contact.jpg)
