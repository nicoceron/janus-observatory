# Janus Observatory — cinematic sequence rebuild

Date: 2026-09-04  
Status: runtime rebuilt; acceptance evidence and remaining limits in docs/qa/cinematic-rebuild/REPORT.md  
Working direction: cinematic realism, subject to review of the first style frames

## 1. Outcome

Rebuild the spatial story as a deliberately photographed journey: one recognizable Earth,
ten materially different possible worlds, an unmistakably alien astronomer, and the change
from a world to the evidence an instrument can reveal about it.

The visual target is a premium science documentary inside an interactive observatory.
Believable materials, light, scale, composition, and performance must carry the experience.
Motion and interface decoration support those subjects.

This is a replacement of the scene assets, staging, camera choreography, and presentation
layer. It is not a new round of easing adjustments to the current assets. Preserve the
canonical science, all 31 story states, ten scenarios, five observing methods, accessible
article, and Observatory/Atlas handoff.

The [master plan](MASTER_PLAN.md) and [approved semantic contract](SCROLLYTELLING_DESIGN_CONTRACT.md)
remain authoritative. The [approved desktop concept](concepts/approved-scrollytelling-desktop.png)
is the composition reference: large Earth, spatially branching worlds, a substantial alien
at a physical telescope, and a legible ocular view. Its generated planetary details and
charts are not scientific evidence or runtime assets.

## 2. What the audit established

| Current problem                                                         | Evidence inspected                                                                                                                     | Rebuild response                                                                                                                                                                                                    |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branching reads as a hanging mobile; the planets are visually secondary | [Current motion contact sheet](qa/premium-motion-2026-08-31/contact-sheet.png), `EarthStage.tsx`                                       | Stage three spatial families around an origin, with depth, a clear focal hierarchy, and restrained curved connections.                                                                                              |
| Worlds look like tinted Earth copies with toy decorations               | `WorldPlanet`, `CityLights`, and `SurfaceInterventions` in `EarthStage.tsx`; `world-art.ts`                                            | Author a sourced base Earth, ten evidence-linked art briefs, land-aware masks, and selective system-scale assets. Remove generic rings, protruding primitives, wire shells, and uniformly distributed light points. |
| Alien design does not match the approved cinematic concept              | [Existing observer render](qa/janus-fab-observer-v4/frame-062.png)                                                                     | Replace the pastel mascot treatment with a new character model sheet, coherent anatomy, designed materials, and an observatory that establishes scale.                                                              |
| Alien performance lacks anatomical continuity                           | Read-only inspection of `janus-fab-observer-v4.blend`: 32 objects, 24 meshes, zero armatures, seven separate actions over frames 1–120 | Build a skeletal rig with planted contacts, eye aim, and one synchronized authored performance. Bake it for export and test it in the actual browser.                                                               |
| Camera and character are authored independently                         | Blender camera is named `QA_Camera_NOT_EXPORTED`; runtime separately scrubs several clips and adds root/instrument offsets             | Export camera, focus, contact, and timing metadata with the asset; sample one shot timeline.                                                                                                                        |
| Text and evidence cards obscure the subject                             | Runtime contact sheet and approved concept comparison                                                                                  | Compose safe areas with the shot, reduce panel mass, and reveal detail only after the main visual action settles. Preserve all required metrics.                                                                    |
| Existing visual checks can pass an aesthetically poor sequence          | QA helper computes average RGB frame differences; previous report has no aesthetic acceptance measure                                  | Add shot-by-shot visual critique, contact checks, continuous forward/reverse playback, and browser/export parity review. Numeric frame-difference checks are only diagnostics.                                      |

Audit scope: committed source, stored browser captures, approved concepts, local Blender
scene, and available Firefly controls. The previous preview server was not listening on
port 3000 during this planning session; this is not a fresh live-browser acceptance report.

## 3. Art direction

### Image and materials

- Space is near-black, with a restrained star field and readable dark values. Avoid green
  fog as a universal backdrop, indiscriminate bloom, and constantly moving particles.
- Earth has recognizable geography, a coherent day/night terminator, subtle atmospheric
  depth, ocean response, and cloud shadows. Keep one consistent solar direction through
  the Earth and scenario comparison shots.
- Use warm off-white typography. Reserve the existing lime accent for navigation,
  selection, and a few editorial marks. Do not tint whole worlds to brand colors.
- Observatory materials: dark mineral structure, brushed metal, restrained ceramic and
  optical glass. Small warm practical lights establish working surfaces; a cool exterior
  light separates head, shoulders, hands, and instrument from the room.
- Alien: mature, curious, physically plausible within its fictional anatomy. Explore an
  elongated cranial silhouette, distinctive neck/shoulder structure, tactile skin, and
  articulated hands. Avoid the current antenna-ball mascot proportions. Species anatomy
  is a character-design decision, not an assertion about extraterrestrial life.
- Use roughness, normal detail, silhouette, and directional light to create richness.
  Expensive real-time effects are optional; material quality cannot depend on them.

### Camera language

- One primary action per shot. Establish a subject, move with a purpose, then hold for reading.
- Earth portrait: begin with a close limb and ease back to a full globe. Use a long-lens
  feeling and a very small orbit; no repeated dollies that turn the globe into a small icon.
- Branch reveal: a controlled pullback exposes depth-separated families. No spinning camera,
  synchronized bouncing planets, or long necklace orbit.
- Scenario portraits: keep geography, lighting direction, and framing comparable. Travel
  toward the selected world while the other worlds recede in prominence. Do not shrink one
  globe to zero and pop a different asset into its place.
- Observer: a three-quarter rear composition establishes the eye-to-eyepiece relationship,
  both hands, telescope, and distant Earth. A modest lateral move gives the room depth.
- Ocular transition: follow the telescope's optical axis, keep the target registered,
  and use the physical eyepiece rim to motivate the transition into an editorial ocular view.
  Avoid a disconnected black iris or a zoom through an unrecognizable dark shape.
- Previsualize approximately 50–70 mm full-frame-equivalent Earth portraits and a 35–50 mm
  observer shot. These are starting lens choices, not scientific parameters or fixed
  acceptance criteria. Export sensor/focal or equivalent FOV data explicitly.
- No handheld shake, elastic easing, gratuitous lens flares, or continuous idle swaying
  near prose. Depth of field must never hide the observer's contact points or evidence.

### Branch lines

Three gently curved family paths originate at Earth; ten distinct worlds separate from
them. Use thin, antialiased spatial curves with subtle depth falloff. The drawing reveal
follows the worlds' separation and stops when the composition is established. No luminous
traffic running endlessly along the lines. All scenarios remain equally selectable, and
line thickness, distance, size, and layout encode neither probability nor a physical orbit.
DOM labels state the editorial grouping and its limits.

## 4. Complete shot and content sequence

Shot numbers below are production groupings, not replacements for the existing story IDs.
The final experience remains paced by the reader. A review animatic may have fixed timing;
the shipped page must not require the reader to wait through a film.

| Shot                                | Existing coverage                                                                      | Picture and action                                                                                                                                                                                                                                            | Reading / interaction                                                                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01 — The only known example         | `one-earth`                                                                            | Large Earth emerges from a close atmospheric limb into a calm full-world portrait. The opening poster and first WebGL frame share the same composition and grade.                                                                                             | Short premise, Start, reading mode, Skip to Atlas. Silent by default.                                                                                                              |
| 02 — Possibility opens              | `possibility-families`                                                                 | Earth separates into three families in depth. Camera pullback and world separation are coordinated; curves appear behind the worlds.                                                                                                                          | Stable, collapse/recovery, and growth labels; explicit “possibilities, not probabilities.”                                                                                         |
| 03 — Ten worlds                     | `all-scenarios`                                                                        | All ten independently rendered planets settle into an asymmetric, balanced constellation connected to the origin. No planetary overlap or decoration obscures the layout.                                                                                     | All ten IDs readable and accessible. A textual list conveys the same grouping.                                                                                                     |
| 04 — Travel among possibilities     | All ten `scenario-*` states, in existing order S1, S4, S9, S2, S3, S5, S6, S7, S8, S10 | Each world receives a consistent hero portrait, one distinctive evidence-linked art treatment, and a deliberate arrival/hold/departure. Nearby worlds retain continuity without competing with the selected one.                                              | Compact required metrics: population, annual energy, governance, technology cluster, and method-specific evidence. Exact values and sources remain DOM-rendered.                   |
| 05 — Someone is watching            | `observer-turn`                                                                        | Leave the world arrangement and establish the alien observatory. The alien is already physically supported; it attends to the target, settles to the eyepiece, and makes one precise focus adjustment. The camera advances after the action becomes readable. | Method choice in a safe side region, with keyboard behavior preserved. The physical telescope is a fictional viewpoint device, not a literal model of all five scientific methods. |
| 06 — First light                    | First `observe-s1*` state                                                              | Move along the optical axis into the same framed target. Resolve the reticle and evidence only after the target is visually stable.                                                                                                                           | Display the chosen method's canonical S1 result. Separate an interpretive world portrait from the instrument's published categorical result.                                       |
| 07 — Quiet does not mean empty      | S9/HWO and S10/HWO blanks; S9/SGL and S10/probe states                                 | Hold world identity and orientation fixed while the observing method changes. Quiet HWO results remain visually quiet. Alternate methods change the evidence, not the civilization or its geography.                                                          | Preserve both explicit HWO blanks and their instrument-complementarity explanation. No invented spectrum or dramatic “technology detected” animation.                              |
| 08 — Complete the observing journey | Remaining seven scenario observations, covering S4, S2, S3, S5, S6, S7, S8             | Reuse the coherent ocular composition with individually authored target portraits and restrained evidence transitions. Do not replay the full telescope fly-through twelve times.                                                                             | Retain all twelve observation beats and the selected-method route behavior.                                                                                                        |
| 09 — Complementary views            | `observing-ladder`                                                                     | The ocular composition yields visual priority to a beautifully typeset, restrained evidence matrix. Earth remains a quiet contextual anchor.                                                                                                                  | All ten scenarios × five methods from Figure 6. DOM/SVG handles the matrix, labels, and accessible table. Blank cells retain their precise meaning.                                |
| 10 — Civilizations through time     | `civilizations-breathe`, `ten-rhythms`                                                 | Two calm editorial compositions: S4's reported parameters/aggregates, then comparable small multiples of available reported outcomes.                                                                                                                         | No fabricated per-run collapse curve, animated heartbeat, or probability. Explicit unavailable values and independent-reimplementation caveat where applicable.                    |
| 11 — Continue investigating         | `explore-handoff`, `absence-of-evidence`                                               | Return to a composed world/system view, then the quiet Earth portrait. A clear ending gives the reader somewhere useful to go.                                                                                                                                | Preserve selected-method context and the canonical scenario/comparison targets in Observatory and Atlas links. Methods, credits, and reading mode remain available.                |

Coverage check: 3 opening/branch states + 10 scenario states + 1 observer state + 12
observations + 1 matrix + 2 collapse states + 1 handoff + 1 epilogue = **31 states**.
All five choices generated by `buildObserverStory()` must retain that coverage.

## 5. Ten-world art briefs

These are proposed **interpretive treatments**, not measured maps. Canonical grounding is
`data/generated/runtime/morphology.json`, `canonicalSummary`, JANUS-PAPER-01,
`arXiv:2409.00067v3`, page 11, section 3.2.1, each corresponding scenario row.
Before production, each brief gets a field-by-field evidence/art boundary and asset ledger entry.

| World                        | Canonical narrative anchor                                                                         | Proposed treatment and limit                                                                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 — Big Brother is Watching | Resource scarcity, expanding technosphere, monitored urban Earth, space settlements                | Dense land-constrained urban texture and purposeful off-world structures. Avoid a literal surveillance grid covering oceans or implying that governance has an observable geometric pattern. |
| S2 — Wild West               | Scarcity, competition, climate stress, fragile biosphere/technosphere dependence, Moon/Mars cities | Uneven built landscapes and restrained contextual off-world activity. No arbitrary debris belt, inferred destruction, or invented climate quantities.                                        |
| S3 — Golden Age              | Post-scarcity, decentralized power, Earth as hub with smaller settlements elsewhere                | A settled, coherent inhabited Earth and modest system context. Distinction comes from surface composition and scale, not decorative civic rings.                                             |
| S4 — Living with the Land    | Subsistence, simple tools, crafts, migration with natural cycles                                   | Geography, clouds, and biosphere dominate; settlements remain appropriately subtle at planetary scale. Low visible infrastructure is never labeled absence of technology.                    |
| S5 — Transhumanism           | Reengineered biosphere, terraformed Mars, biosynthetic enhancement                                 | Carefully art-directed surface mosaics and a separately grounded Mars context. Do not turn the atmosphere neon or draw a literal planetary neural network.                                   |
| S6 — Sword of Damocles       | Nanoscale engineering and fragile life support; transformed Mars and work on Venus                 | A controlled, infrastructural visual character with contextual off-world engineering. No cracked Earth or exploding fragments: existential risk is not a reported present catastrophe.       |
| S7 — Restoration             | Collapse, local production, simple technology, regional knowledge networks                         | Subtle settlement/land-cover relationships; any imagined traces of older infrastructure are marked interpretive. No giant reforestation symbols protruding from the globe.                   |
| S8 — Ouroboros               | Post-AI-catastrophe oligarchy, degrading systems knowledge, underground/Moon refuges               | Restrained uneven infrastructure and contextual lunar presence. Do not invent visible shelters, planetary scars, or a geographic map of social conditions.                                   |
| S9 — Deus Ex Machina         | Posthuman AI expands across the Solar System; net-zero gifts remain on Earth                       | A quiet, recognizable Earth contrasted with system-scale technological structures. Remove the current Earth-enclosing wire shell. The scale contrast is central to the observing lesson.     |
| S10 — Out of Eden            | Restored Earth under growth limits; autonomous systems expand in space                             | A restrained Earth with a distinct outward system composition. No busy fleet or swarm in the HWO evidence frame; the probe result stays a separate canonical evidence layer.                 |

All worlds share a consistent base geography, solar direction, and rendering treatment.
Scenario-specific masks and details must be justified or explicitly illustrative. Night
emission is land-aware and gated by the relevant canonical fields; a brightness parameter
does not make an invented settlement map measured data. Where the source does not distinguish
two worlds visually, use captions and context rather than fabricate a dramatic difference.

## 6. Production tools and their boundaries

### Blender: master scene and performance

Use Blender for character design, retopology, skeletal rigging, telescope mechanics,
observatory modeling, UVs, material baking, camera blocking, and shot reference renders.
Build a single coherent observatory scale with named eye, eyepiece, hand-contact, target,
camera, and focus markers. Bake constraints to exportable animation, then verify the
export in Three.js; the Blender render is a lighting/composition target, not proof of
browser parity. glTF's object/bone/morph animation support is documented in the
[Blender glTF manual](https://docs.blender.org/manual/en/5.1/addons/import_export/scene_gltf2.html).

The installed Blender 5.2.1 LTS executable and existing scene were verified headlessly.
The live Blender MCP connection was unavailable during the audit. This does not prevent
offline authoring/export, but live viewport automation needs the add-on connected when used.
Exporter settings must be checked against the installed version, especially its slotted
Actions API; do not paste legacy F-curve scripts without testing them.

First export uncompressed for material, bone, camera, and silhouette comparison. Then
produce measured Meshopt/KTX2 derivatives and mobile variants within the master-plan
budgets. Never simplify the hands, face, or telescope silhouette blindly. Keep source
Blender files, originals, exports, checksums, transformation commands, and license records.

### Three.js / R3F: the final interactive scene

Keep spatial rendering in the website. This supports reversible scroll, all scenario
choices, method changes, responsive camera framing, and the existing semantic contract.
Use baked materials/light information where appropriate, a small controlled real-time
lighting setup, capped DPR, staged asset loading, and explicit scene/resource cleanup.
Complex volumetrics, real-time cinematic depth of field, and heavy postprocessing are not
baseline dependencies.

Do not replace the whole experience with a scroll-scrubbed video: that requires proving
seek/decode behavior, multiplies responsive variants, and loses the existing spatial
interaction. A rendered background plate is an optional later optimization only if it
preserves composition and interaction and passes measured browser tests.

### Remotion: storyboard, animatic, and review exports

Create an isolated offline motion workspace after the visual brief is accepted. Assemble
Blender preview shots and code-rendered typography into a paced animatic. Where practical,
reuse pure shot-state evaluation in a Remotion Three composition for browser/render
comparison. Remotion's [ThreeCanvas](https://www.remotion.dev/docs/three-canvas) uses
frame-driven animation to support deterministic seeking and pausing.

Deliver an overview film plus slower forward/reverse review clips and contact sheets.
Keep Remotion and its render dependencies out of the Next.js client payload. Check its
license against the intended production use before adding the workspace; no dependency
change is made by this plan.

### Firefly in Chrome: bounded look-development

Authenticated Firefly image/video controls were inspected. No reference was uploaded and
no generation or credit spend occurred during planning. The video surface currently has
Veo 3.1 selected; being inside Firefly does not mean the underlying model is Adobe's model.

Use it for alternate alien/observatory style frames, material mood studies, or a short
camera-language reference. Record the selected model, prompt, references, settings,
generation provenance, and applicable usage terms. Do not assume every partner model has
identical rights or controls. Admit any chosen derivative to the project ledger before
shipping it.

Adobe documents [camera-motion reference for Firefly Video](https://helpx.adobe.com/firefly/web/work-with-audio-and-video/work-with-video/match-camera-motion-to-reference-video.html).
That is useful for look-development, but it does not establish precise geometry, contact,
geographic continuity, or reversible scientific state. Verify the chosen model's current
UI before relying on a particular combination of frame and motion references.

Generative video is not the authoritative alien performance, planet transition, or data
display. No generation queue is needed until the first concrete style-frame brief exists.

## 7. Alien performance specification

Author one short, non-looping observation action with deliberately held poses:

1. **Established:** feet/support planted, one hand on the instrument mount, attention on the
   target. The silhouette already communicates an astronomer using an instrument.
2. **Orient:** eyes lead a small head movement; torso follows only as much as necessary.
   Shoulders and elbows articulate instead of moving as independent floating parts.
3. **Engage:** the head approaches the eyepiece while the bracing hand maintains contact.
4. **Focus:** the free hand reaches a physical knob, makes a small adjustment, and holds.
   Telescope mechanics respond on the same authored timeline.
5. **Observe:** settle into a readable final pose. A restrained eyelid or breathing accent
   is optional in full motion, never required to understand the action.

Use IK/contact constraints during authoring and bake the evaluated skeleton/mechanism
animation for glTF. One normalized shot time drives all synchronized tracks. Do not
independently ease the head, wrists, and telescope to unrelated clip percentages in React.
The camera's approach begins only after the eye/eyepiece connection is legible.

Seeking backward is a deliberate cinematic rewind of the authored action, not a second
procedural performance. Direct jumps reconstruct the target pose without playing missed
actions. Reduced motion chooses a stable observation pose with no approach animation.

## 8. Scroll, presentation, and responsive behavior

Keep native scrolling, sticky layout, and IntersectionObserver ownership of complete
story states. Derive bounded local progress for the current shot using passive sampling.
Smooth the rendered camera/object progression with the existing GSAP system; do not move
or delay the document under the reader, capture the wheel, or add a smooth-scroll library.

Separate logical target state from transient presentation. A shot evaluator takes the
complete state, local progress, viewport class, and reduced-motion mode. It resolves camera,
objects, visibility, character time, and overlay anchors without relying on previously
visited states. Cancel superseded presentation tweens on jumps, restore, method changes,
and motion-mode changes. Refresh and HMR at deep scroll must immediately reconcile the
visible article step, stage state, selected method, and `aria-current`.

- **Desktop:** subject-first composition; Earth portraits initially target roughly half
  the usable viewport height or more. Keep prose in a genuinely empty region. Required
  metrics can occupy a compact rail; secondary explanation goes below or expands on demand.
- **Portrait:** author a separate camera/layout, not a desktop crop. Keep the visual above
  compact lower-third narration. The all-world overview still shows all ten 3D worlds and
  their connections; later focus states enlarge the selected world. A separate accessible
  selector avoids requiring taps on tiny projected planets.
- **Landscape mobile:** frame the alien, telescope, Earth, and narration simultaneously;
  reserve space for browser chrome and safe-area insets.
- **Reading/reduced motion:** the same story, values, methods, and named scenes; stable
  poses with immediate state changes and no autonomous motion. No dark intermediate frame.
- **No WebGL / failed asset:** authored 2D compositions/posters for the same key states,
  complete DOM content, controls, source links, and a recoverable loading/error state.
- **Typography:** one stable scale and spacing system, short titles, quieter metadata,
  visible focus, and readable contrast. Remove accumulated visual overrides in scoped
  story styles without changing unrelated pages.
- **Sound:** optional and user-initiated only. The story must work completely in silence;
  do not add or bundle the restricted Water Zither asset.

## 9. Delivery sequence and gates

| Package                       | Concrete deliverable                                                                                                                                                      | Exit condition                                                                                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Visual bible              | Six style-frame compositions: Earth, ten worlds, S1/S4/S9 contrast, observer, ocular, mobile observer; alien front/side/three-quarter model sheet; material/light palette | Review the actual images at page size. Character, scale, composition, text safe areas, and dark-value readability meet the intended direction. Generated concepts remain references, not implementation proof. |
| B — Short animatic            | Approximately 30–45 seconds covering Earth → branches → representative worlds → observer action → ocular → quiet/alternate-method contrast                                | Review rhythm and continuous motion forward and backward. Camera and character do not compete. No repeated full-journey fly-through per observing method.                                                      |
| C — Browser quality slice     | Production-quality Earth, branching, S1/S4/S9, complete alien/telescope transition, and S9 HWO/SGL contrast                                                               | Compare the real browser with the approved frames, including portrait and reduced motion. Prove asset loading, frame budget, rig contacts, and canonical evidence before producing all world variants.         |
| D — Complete world production | All ten art briefs, maps/masks, relevant system assets, LODs, previews, and provenance entries                                                                            | Ten scenario portraits complete; every artistic invention labeled and no unsupported geographic/scientific implication.                                                                                        |
| E — Full runtime replacement  | All 31 states and all five observing paths, scoped scene modules, overlays, reading mode, fallback, handoffs                                                              | Coverage tests and complete forward/reverse/jump/method-change sweeps pass. No old mascot or toy decoration remains in an active path.                                                                         |
| F — Release acceptance        | Fresh screenshots, continuous browser playback, performance receipts, accessibility results, validation output, and remaining-risk report                                 | Technical and visual gates both pass. Keep the existing implementation recoverable until this point.                                                                                                           |

Do not batch-produce ten worlds before the representative browser slice passes. The first
production output should be the six-frame visual bible, followed by the animatic—not a
partially replaced live story. These are review points for real artifacts, not claims of
completion based on planned quality.

## 10. Repository implementation boundaries

Proposed ownership for the later implementation:

- `assets/sources/janus-cinematic/`: original Blender scenes, texture sources, authoring/export
  scripts, shot metadata, and rights/provenance notes. This directory does not exist yet.
- `apps/web/public/assets/`: admitted, optimized runtime derivatives only; retain current
  assets until the replacement and no-WebGL path pass acceptance.
- `apps/web/app/story/scene/`: proposed focused modules for Earth/materials, world layout,
  observer rig, cameras, scene evaluation, loading/disposal, and responsive composition.
- `apps/web/app/story/EarthStage.tsx`: reduce to a scene host/compatibility boundary; preserve
  its reuse by the home-page Observatory slice.
- `StoryExperience.tsx`, `world-art.ts`, and scoped story styles: connect the new presentation
  to existing canonical profiles and semantic states. Separate interpretive art settings
  from scientific data. Avoid expanding the already large components with more overrides.
- `story-content.ts`, `story-state.ts`, and their tests: preserve complete coverage and
  restore behavior; change contracts only with explicit regression tests and a decision note.
- `tools/motion/`: proposed isolated Remotion review workspace, not a runtime import.
- `data/assets/ledger.json`: add original/derivative provenance, checksums, rights, credits,
  and transformation history for each admitted new asset.
- `docs/qa/cinematic-rebuild/`: proposed versioned evidence, viewports, asset hashes,
  per-shot critique, browser recordings, and acceptance receipts.

Before implementation, record Decision 011 for the replacement art direction, authored
camera/rig pipeline, and offline review workspace. Supersede the existing-GLB performance
portion of Decision 010 explicitly; retain its native-scroll, GSAP, complete-state, and
fallback rules. Any dependency/schema change accompanies that decision and the handoff.
Do not silently rewrite the approved semantic sequence or hand-edit generated data.

## 11. Acceptance: what “finished” means

### Visual and motion gates

- Inspect Earth, branch, every scenario portrait, observer, ocular, matrix, collapse, and
  ending at the actual intended viewport. All ten worlds must be visible in the overview.
- Review entry, 25%, 50%, 75%, and settled frames of the principal transitions, plus
  continuous real-browser forward/reverse playback. Inspect the entire observer action.
- Earth remains recognizable: no texture seams, inverted light, ocean-spanning artificial
  lights, oversized surface geometry, or material/shadow popping.
- The observer's head, shoulders, arms/hands, physical telescope, and distant Earth are
  readable together. No missing body parts, hand sliding, wrist intersections, eye drift,
  detached props, or camera clipping. Compare Blender and browser contact markers.
- No prose or metrics cover the eyepiece contact, hands, focal world, or necessary evidence.
  Check long content and zoomed text; fix layout rather than hiding required facts.
- Confirm first poster/WebGL continuity and graceful fallback under failed asset loading.
- Record concrete defects and corrected frames. A low mean frame difference, high frame
  rate, or passing screenshot test cannot by itself approve the art direction.

### Interaction, scientific, and accessibility gates

- All 31 states and five observer choices: normal scroll, rapid scroll, reverse, keyboard,
  chapter jump, reload at depth, observer change, mode switch, and resize/orientation change.
- Identical logical state and settled presentation for the same input, regardless of history.
  Include fresh-load/direct-seek comparisons, not just sequential navigation.
- Start/Skip, visible focus, keyboard method selection, reading order, screen-reader data,
  reduced motion, no-WebGL, failed loads, and 200% text zoom. Target WCAG 2.2 AA.
- Canonical Figure 6 results, HWO blanks, missing states, units, citations, comparison links,
  and required metrics remain correct. No probability/ranking or “no technology” inference.
- Collapse stays reported parameters/aggregates unless an independently validated trajectory
  is deliberately added under a separate scientific decision. No decorative quantitative curve.
- New media are ledger-admitted and credited. Generated references and unlicensed source
  publications are not silently bundled as production assets.

### Performance and technical gates

Use the master-plan limits: initial JS at the existing 250 KiB gzip script guardrail,
critical visual payload ≤1.5 MB mobile / ≤3 MB desktop, typical deferred guided path ≤20 MB,
individual runtime textures ≤4K and ≤4 MB compressed, normally ≤2K on mobile, and 60 fps
desktop / 30+ fps supported mobile during active motion. Record the tested hardware,
viewport, browser, network conditions, frame-time distribution, loading stalls, and peak
resource usage; do not present these targets as measured results. Pause offscreen and
verify resource cleanup across repeated scene/mode transitions.

For implementation acceptance, run relevant formatting, lint, types, unit/integration,
Python/data, asset/source/link, build, bundle, and browser checks. The repository's
`pnpm check` is the full local aggregate; `pnpm test:e2e`, fresh visual captures, and
continuous motion/performance review are additional gates. Extend `qa:motion` rather
than accepting its current pixel-difference summary as an aesthetic verdict.

## 12. Implementation handoff

The runtime/assets rebuild is implemented under Decision 011. See
[the verification report](qa/cinematic-rebuild/REPORT.md) for exact checks, visual critiques,
payloads, source versions, and unresolved acceptance limits. This document preserves the
original production target; it does not imply photoreal character-art approval, physical
mobile performance certification, or completion of unrelated master-plan release work.

The core scientific release remains candidate_pending_independent_review. No canonical
scientific field or dataset was changed by the cinematic implementation.
