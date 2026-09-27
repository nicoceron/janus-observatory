# Blender world art direction

2026-09-11. Modeling brief for the user-requested Blender finishing pass; this document is not a
completion receipt. Preserve the accepted faceted miniature style, meaningful activity, large
story portraits and directly selectable Solar System locations.

## Evidence and scope

The current selection contains **47 story portraits**: ten Earths, twenty Moon/Mars/Venus views
and seventeen system-feature views. The opening Earth is an additional illustration. Distinct
portraits can share physical construction methods, but scenario identity must change architecture
and organization, not just paint. Do not fill quiet landscapes to equalize object counts.

All designs below are **interpretive original artwork**. Exact buildings, creatures, equipment,
counts, dimensions, terrain and placement are invented. They do not encode measured values or
reconstruct the authors' illustrations. Astronomical sizes and separations remain not to scale.
Scenarios are self-consistent possibilities, not predictions or probabilities.

Source shorthand used throughout:

- **N(S#)**: `JANUS-PAPER-01`, `arXiv:2409.00067v3`, rendered page 11, Section 3.2.1
  “Narrative summaries”, scenario row S#, column “Narrative summary”. Read through each
  `canonicalSummary` in `data/generated/runtime/morphology.json`.
- **M(S#)**: same source/version, Table 5, rendered page 8, scenario row S#; expanded
  morphology fields retain their Table 2/4 source locators in that runtime file. The `biosphere`
  field is not transcribed; its null value is not evidence of an absent biosphere.
- **P(S#, body, row)**: same source/version, Table 6, rendered page 14, named signature/body
  row, scenario column S#. Positive cells select a published footprint; blanks never prove
  a body's absence. Exact current field refs are preserved in
  `docs/qa/connected-worlds/source-footprints.json` and canonical `planetary.json`.
- **T(S#, row)**: same source/version, Table 8, rendered page 17, named row, scenario column
  S#. These select system activity, not a named planet, moon or particular habitat design.

Reviewed current geometry in `worlds.ts`, `ScenarioBiomes.ts`, `WorldLandmarks.tsx`,
`SystemGeometry.ts`, `HabitatModels.ts`, `life-plan.ts`, `inspection.ts` and the connected-worlds
production contact sheets. Decision 016 supplies the previously audited narrative-to-art mapping.
No restricted pipeline PDF, existing third-party illustration or external model is reproduced.

## What makes an asset finished

At story scale, each world needs a recognizable outline, a primary focal assembly and two
subordinate forms. At inspection scale, structure must explain construction: hulls have thickness,
beams meet joints, airlocks have accessible doors, rigging reaches attachment points and loading
devices reach their cargo. Give major hard edges a small bevel; keep intentional planar facets.
Do not add tiny bolts that disappear at the largest supported inspection view.

Use coherent groups with breathing room. Ground every foot, pier and foundation against the actual
terrain or body surface. Keep vehicle corridors and loading envelopes clear. Leave cloud clusters
visibly above terrain and architecture. Preserve pivot names and separate moving parts for wheels,
propellers, mill rotors, limbs, cranes and inspection tools. Do not bake an actor and its route
into one static scene. All supplied poses must remain complete and attractive in reduced motion.

## Opening Earth

The origin is a familiar illustrative world, not a geographic reconstruction.

1. Finish the regional airplane as a specific twin-prop aircraft: tapered fuselage, coherent wing
   root, tailplane, inset glazing and separate propellers. Keep the flight between airfields.
2. Model a readable coastal settlement with a quay meeting shore, a few unequal roof volumes and
   layered tree canopies; reserve ocean space around its traffic. Avoid repeated tiny red roofs.
3. Refine clouds into softly varied faceted masses at distinct heights. Preserve their independent
   drift and the opening composition; regenerate the poster if its visible geometry changes.

## Earth S1–S10

### S1 — Big Brother is Watching

N(S1): centralized allocation, surveillance, declining biosphere, elites in space.

1. Make the **ration checkpoint** unmistakable: elevated control booth, entry canopy, offset
   pedestrian and delivery gates, barrier pivot and a recessed screening lane. The delivery road
   must meet its entrance rather than a perimeter wall.
2. Finish a **linked tenement and distribution depot** as different buildings: occupied balcony
   recesses and external stairs for residences; loading shutters, covered pallets and freight
   clearance for the depot. Keep the higher surveillance tower as the skyline accent.
3. Give the drone a gimbaled lens, duct thickness and service hatch; give the supply car a cargo
   compartment and credible wheel suspension. Remove generic decorative hoops or disconnected
   tubes that resemble transport routes without destinations.

### S2 — Wild West

N(S2): resource competition, industrial dependence and inequality; Moon/Mars industry and tourism.

1. Finish the **quarry** with an irregular stepped excavation, one accessible haul ramp and visibly
   different cut strata. The current neat concentric hexagons read as a target; interrupt the
   perimeter with a working face and loading shelf.
2. Build the **ore chain** as one legible operation: derrick/loading point, heavy hauler and
   braced conveyor ending above a receiving hopper. Add rollers, chute walls, treaded tires and
   a tipping bed; preserve the verified loading and unloading pauses.
3. Contrast a maintained, protected **resource reservoir/control compound** with a rough service
   yard. Avoid copying the S1 civic tower or turning every surrounding object into a derrick.

### S3 — Golden Age

N(S3): distributed abundance, Earth as hub, small settlements beyond Earth.

1. Make an **open civic pavilion** with a clear roof span, unequal shaded seating bays and a
   visible interior; distinguish it from terraced housing and a ribbed community glasshouse.
2. Finish the **solar catamaran and paired quays**: two buoyant hulls, an inset passenger deck,
   boarding openings aligned with dock edges and railings attached to deck posts. No seats or
   structures floating in the ocean without a hull or platform.
3. Give the airplane its existing regional transport role and recognizable twin-prop silhouette.
   Replace repeated polygon garden slabs with a few shaped courtyards, planted terraces and
   shoreline transitions. Keep generous public space between buildings.

### S4 — Living with the Land

N(S4): subsistence, portable tools, artisanal crafts and seasonal settlement movement.

1. Finish a **seasonal camp** with tensioned textile or woven panels, actual frame joints,
   tied supports, rolled portable material and one sheltered hearth. Avoid permanent civic
   buildings or invented culturally specific sacred motifs.
2. Rebuild the **canoe** around a thin timber hull, recessed interior, gunwales, cross seats and
   an oar/paddle that meets the water. Keep the drying rack and raised store structurally distinct.
3. Refine the **deer** with a readable chest/haunch transition, tapered muzzle, joint placement,
   hooves and clean ear silhouettes. Its gait and feeding pause need grounded feet. Use a few
   intentional woodland compositions, not identical animals scattered around the globe.

### S5 — Transhumanism

N(S5): biosynthetic enhancement, reengineered biosphere and terraformed Mars.

1. Model a **living canopy** with branching load paths, rib junctions and membrane thickness;
   distinguish it from an enclosed growth chamber and low petal-shaped dwelling. Reduce giant
   repeated flower heads that overpower the settlement and imply ornamental gardening alone.
2. Finish the **biosynthesis works** with enclosed growth vessels, supply tendrils and a visible
   service cradle. Use translucent-looking faceted color selectively; avoid making every surface
   equally glassy or adding expensive overlapping transparency.
3. Give the invented **biosynthetic pollinator** a cambered membrane, jointed wing roots, distinct
   head and a purposeful feeding apparatus. Its biology is fictional; retain that explicit
   description and the chamber-to-canopy visit rather than generic orbiting motion.

### S6 — Sword of Damocles

N(S6): precisely calibrated life support, engineered Mars, work on Venus and laboring maintenance.

1. Preserve the recognizable **pressure shell**, but introduce a few clearly different access
   panels, expansion joints, pressure doors and recessed service wells. Uniform triangles covered
   with identical slits currently look like decorative packaging.
2. Make a **thermal/manifold service complex** where ducts enter real ports, fins have separation,
   valves have stems and redundant pipe runs cross supported brackets. The pressure core,
   radiator and control station must remain distinct at thumbnail size.
3. Finish the **maintenance walker** with articulated braced legs, contact pads and a tool arm
   that reaches a service point. It traverses the shell itself; do not introduce painted roads
   merely because the other scenarios have vehicles.

### S7 — Restoration

N(S7): recovery after collapse, local production, ecological repair and regional knowledge exchange.

1. Create one convincing **restored watermill**: old masonry base, newer timber wheelhouse,
   offset repairs, axle supports and a water channel feeding the wheel. The wheel must clear
   both wall and channel and rotate as an independent assembly.
2. Distinguish the **workshop and seed store** with a repaired sawtooth or pitched roof, a
   sheltered workbench/loading apron, seed drawers or bins and protected ventilation. The cargo
   tricycle delivers between actual accessible entrances.
3. Finish the **sailing cutter** with a shaped hull, credible mast step, curved sail panels,
   rigging anchors and a cargo opening. Replace freestanding decorative ruin arches with retained
   walls whose adaptive use is visible. Restoration must read as functioning life, not ruins alone.

### S8 — Ouroboros

N(S8): repeated collapse, specialized tools without robust systems knowledge, elite refuges below
ground and on the Moon.

1. Build a **protected bunker entrance** into a berm with a recessed blast door, angled access,
   service ventilation and exposed retaining structure. Elite shelter should differ from both
   an ordinary house and a freestanding rectangular tower.
2. Finish the **salvage crane and yard**: continuous track links, idlers, winch, moving hook,
   articulated boom and a recognizable recovered beam. Make the mismatch of repaired components
   intentional. Its cargo must land within the yard rather than clipping its façade.
3. Use a few **damaged infrastructure remnants** with specific failures: sheared dish segment,
   disconnected pylon cable, patched generator enclosure. The current enormous through-globe
   fissure is an interpretive metaphor, not a canonical planetary fracture; reduce it to a
   landscape scar if it obscures the settlements or implies a literal destroyed Earth.

### S9 — Deus Ex Machina

N(S9): a nonbiological civilization moves beyond Earth; net-zero gifts support humans on Earth.

1. Preserve the **quiet Earth** and finish one small technological gift with precise nested
   surfaces and an elegant service interface. A busy Earth covered in robots would contradict
   the narrative emphasis.
2. Enrich **natural shore and woodland** with a coherent age/shape mix and a few layered rock
   outcrops. The improvement should read as ecological richness, not a higher prop count.
3. Spend the main mechanical detail budget on **orbital and off-world machine works**: unsupported
   human stairs/windows are inappropriate there; use robotic attachment rails, thermal surfaces,
   articulated assembly arms and docking geometry instead.

### S10 — Out of Eden

N(S10): restored Earth under growth limits, a cultural schism and autonomous systems beyond it.

1. Distinguish a **communal orchard and coastal store** from S7's repaired industrial buildings:
   carefully maintained timber, open canopy, storage racks and a sheltered landing, without ruins.
2. Finish the **orchard cargo barge** as a broad shallow craft with open hold, stacked crates,
   gunwale thickness, balanced lug sail and accessible deck. Its broad silhouette must differ
   from S7's narrow cutter and S3's twin-hull ferry.
3. Make the off-world **inhabited orbital habitat** a deliberate contrast: visible internal
   living strips, structural hoops, docking ends and thermal/service wings. Do not import
   S9's entirely nonbiological layout unchanged.

## Source-selected off-world distinctions

For surface entries below the supporting P locator is “Artificial illumination — body”, except
S9 Mars/Venus, which use “Surface modification — body”. Orbital entries use “Satellite belt —
body”; atmospheric entries use “Industrial pollution — body”. These are selection evidence,
not evidence for a specific building design.

| Scenario | Current selected body/activity                 | Bespoke Blender treatment                                                                                                                                                                                                                      |
| -------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | Luna surface; Mars surface; Venus orbital      | Luna: protected residential crown above utility base. Mars: stepped enclosed settlement and controlled freight gateway. Venus: privileged orbital pressure habitat separated from the cloud globe; no implied surface city.                    |
| S2       | Luna surface; Mars surface                     | Luna: mine head, covered conveyor and transfer yard. Mars: industrial settlement with a distinctly maintained viewing/visitor wing. Different structures should express industry and tourism without duplicating Earth's quarry.               |
| S3       | Luna surface; Mars surface                     | Compact civic pressure courtyard, connected glasshouse and light service yard. Mars gets a terrain-adapted settlement with landing access; retain a visibly smaller civic scale than S1/S2 in the illustration.                                |
| S4       | No body selected by current positive-cell view | Keep the current selected footprint; do not label other bodies nonexistent or invent off-world activity to fill a gallery.                                                                                                                     |
| S5       | Luna surface; Mars surface; Venus atmosphere   | Luna: ribbed growth facility enclosed within pressure architecture. Mars: terraformed garden terrain and different living districts, not Luna's base recolored. Venus: buoyant envelope with cables, suspended gondola and cloud clearance.    |
| S6       | Luna surface; Mars surface; Venus surface      | Luna: thermal plant and protected service habitat. Mars: engineered atmospheric/life-support works. Venus: anchored process complex and insulated pressure links; surface activity must not be depicted only as the S5/S10 aerostat.           |
| S7       | No body selected by current positive-cell view | Keep the regional Earth story. Absence from this selector is not a claim of universal absence.                                                                                                                                                 |
| S8       | Luna surface                                   | Partly regolith-covered refuge with reinforced access, buried pressure volumes, a separated compact utility yard and an escape/transfer docking feature. Remove the ordinary exposed three-module campus silhouette.                           |
| S9       | Luna orbital; Mars surface; Venus surface      | Luna: autonomous orbital machine works with visible separation from the surface. Mars: robotic production arrays. Venus: one large manufactured aperture and braced thermal assemblies, distinct from Mars's distributed works.                |
| S10      | Luna surface; Mars surface; Venus atmosphere   | Autonomous habitat upkeep alongside readable inhabited modules. Mars gets a deliberately maintained settlement composition. Venus: inhabited suspended structures carried by a lifting envelope, distinct from S5's organic membrane language. |

System features are separate illustrative destinations. Preserve their current positive Table 8
selection and label the outer giant/moon as a generic composition rather than asserting a named
planet or moon not specified by the selected field.

| Feature / T row                                | Scenarios                   | Bespoke construction rules                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Asteroid works / “Asteroid mining”             | S1, S2, S3, S5, S6, S9, S10 | Use an anchored working face, braces and extraction/transfer connection. S1 has a controlled transfer dock; S2 an exposed cutting gantry and ore hopper; S3 a compact maintained service cradle; S5 ribbed biological-processing enclosures; S6 sealed pressure/thermal links; S9 robotic assembly fingers; S10 autonomous cargo and habitat interfaces. Sharing the rock is acceptable; sharing the whole mine is not. |
| Outer settlements / “Outer planet settlements” | S1, S3, S5, S9, S10         | Keep foreground ice body and rear giant/rings separated. Use S1 protected housing, S3 communal hub, S5 enclosed growth halls, S9 uninhabited machine infrastructure, and S10 inhabited service cylinder. Do not place an exposed garden on a generic airless ice surface.                                                                                                                                               |
| Kuiper outpost / “Kuiper belt mining”          | S5, S6, S9, S10             | Ice fractures, a drill collar actually contacting the body, unequal outriggers and clear thermal/power wings establish the distant worksite. Distinguish S5 organic-processing modules, S6 redundant mechanical life support, S9 autonomous articulated extractor and S10 cargo transfer with habitat support.                                                                                                          |
| Solar collectors / “Dyson sphere”              | S9 only                     | Give collectors backs, structural frames, bus connections and varied roles. Break the regular decorative necklace into a readable arrangement with space between panels. Displayed coverage and panel number are not the reported covering fraction; keep the DOM canonical values separate.                                                                                                                            |

## Specific inconsistencies and regression traps

- `SystemGeometry.ts` currently takes every non-machine Venus surface/atmosphere branch through
  the same aerostat construction. `inspection.ts` likewise describes non-S9 Venus as buoyant.
  S6's surface interpretation and detail label need a dedicated assembly and description.
- `HabitatModels.ts` reuses the same three pressure-module layout for most surface settlements.
  Finishing that mesh alone leaves Luna and Mars as reskins. Change assembly organization as
  described above while sharing smaller airlock/pipe components.
- The existing asteroid and Kuiper feature constructors barely use scenario identity. Reviewed
  S5/S9 contact sheets show the same works. Replace their focal assemblies, not only their colors.
- S9 Luna's orbital-only foreground is intentional. Adding a lunar surface base during a generic
  “finish every moon” pass would misrepresent the selected evidence.
- Do not add Venus to S2/S3 or off-world destinations to S4/S7 to equalize the selector. The view
  is a source-selected footprint with explicit limits, not a complete census of every location.
- Preserve the recent connected route endpoints, vehicle widths, road clearances, loading pauses,
  cloud elevation, object inspection and full-size story body controls. Imported meshes need
  compatible pivots/scales and clearance envelopes; a nicer render must not break these behaviors.

## Resource-aware finishing and acceptance

Use shared small construction parts and per-scenario collections; export only the selected
collection, not all forty-eight illustrations in one runtime asset. Run one Blender process at a
time with bounded CPU threads and preview resolution. Avoid physics simulations, dense sculpt
subdivision, displacement textures and full-resolution multi-scene renders for this faceted style.
Keep editable masters separate from optimized runtime GLBs. A source-file export is not a visual
acceptance result.

Review every Earth at story scale and inspection scale, plus each source-selected body/feature.
Inspect three-quarter, rear and low views for floating supports, backface holes, intersecting
assemblies and unreadable detail. Inspect consecutive motion frames for foot contact, wheel
clearance, boat waterlines, propeller pivots, sail/rigging alignment and crane cargo placement.
Check grayscale thumbnails: S1/S2, S3/S7/S10 and all off-world works must remain distinguishable.

The master plan's loading targets remain unchanged: initial critical visuals at most 1.5 MB mobile
or 3 MB desktop; typical guided deferred experience at most 20 MB. Preserve staged loading,
reduced motion, offscreen pause/disposal, DOM descriptions and no-WebGL fallback. Verify final
in-browser geometry, materials, animations and payloads after export; report physical-device
performance limits candidly. Admit only original generated art to the ledger with source and
derivative checksums, transformation history and a versioned QA receipt.
