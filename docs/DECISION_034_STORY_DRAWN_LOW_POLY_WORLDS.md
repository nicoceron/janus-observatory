# Decision 034 — Story-drawn low-poly worlds

2026-09-30. Supersedes the planet, companion and explorer-study artwork of Decisions 014–020
and 028 on branch `claude/low-poly-planets-redesign-e6a3a2`. Story choreography, camera,
observer, telescope, layout anchors and canonical data are unchanged.

## Request and approach

The user asked for every planet to be rebuilt from scratch as low-poly art, designed only from
the Project Janus scenario stories, and explicitly not derived from the previous implementation.
The previous worlds, Blender sources and object catalogues were therefore not used as
references. The only design inputs are:

- each scenario's narrative summary (JANUS-PAPER-01 v3, Section 3.2.1, via `morphology.json`);
- Table 6 planetary technosignatures for Earth, Moon, Mars and Venus (`planetary.json`);
- Table 8 system technosignatures (`system.json`) and the Table 9 growth state (`growth.json`).

## One Earth, ten futures

All eleven Earths (today plus S1–S10) share one hand-drawn continent field, a caricature of
Earth's coastlines built from overlapping caps. It is illustrative, not a geographic
reconstruction. Because the continents never change, what differs between worlds is what each
future did to the planet. Present-day Earth marks real megacity locations with small lit clusters.

| Scenario                   | Narrative anchor                                               | What the world shows                                                                                                                                                             |
| -------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 Big Brother is Watching | autocratic allocation, monitored urban Earth, elites in space  | a uniform block grid spreading from one capital, a central watchtower with a sweeping searchlight, a geodesic lattice of monitoring satellites, smog, clean elite habitats above |
| S2 Wild West               | entrenched competition, climate stress, Moon and Mars industry | drowned coasts and wider deserts, rival walled corporate enclaves, open-pit mines, offshore rigs, monoculture fields, dust weather, unplanned satellite traffic                  |
| S3 Golden Age              | post-scarcity, decentralized power, Earth as hub               | evenly spaced garden towns of equal size, wind commons, one equatorial orbital tether and transfer hub, orderly orbits                                                           |
| S4 Living with the Land    | subsistence, crafts, rituals, migrating settlements            | wild forests and restored ice, seasonal tent camps that drift with a slow yearly rhythm, an overgrown relic tower, ritual stone circles, one derelict satellite                  |
| S5 Transhumanism           | reengineered biosphere, terraformed Mars                       | a designed patchwork of engineered cells over land and sea, luminous reefs, biosynthetic spires and growth pods                                                                  |
| S6 Sword of Damocles       | nanoscale regulation, fragile calibrated life support          | life-support plating over land and sea, tanks, stacks and pipes, pulsing warning lights, chemical haze, a blade-shaped regulator hanging from one tether                         |
| S7 Restoration             | simple technology, local production, regional networks         | villages with windmills and terraces grouped in separate regions, each joined by footpaths and one radio mast                                                                    |
| S8 Ouroboros               | AI catastrophe, oligarchs, bunkers, oscillating growth         | scorched ground around a silenced machine core, ruins with survivor camps, sealed bunkers, lights that brighten and fade in a slow cycle                                         |
| S9 Deus Ex Machina         | machines leave Earth, net-zero gifts remain                    | an untouched-looking Earth with a few crystalline gifts, a thin halo of machine nodes, fully machined Mars and Venus and a collector swarm around the Sun                        |
| S10 Out of Eden            | restored Earth under growth limits, autonomous expansion       | a flowering Earth beneath a ring of habitat cylinders on one rail, and a departing light sail                                                                                    |

Companion bodies and system features follow the same rule: styles come from the narratives
(for example S5's terraformed Mars, S6's first foothold on Venus, S8's single lunar hatch); only
bodies and features with positive published cells appear, exactly as before.

## Published values drive the drawing

Magnitudes are never typed into components. `apps/web/lib/world-signals.ts` copies the relevant
cells from generated runtime data, and `apps/web/app/planets/encoding.ts` turns them into counts:

- surface modification (fraction of planetary surface) sets the fraction of globe faces that a
  scenario's style repaints and furnishes; any positive cell shows at least one trace;
- artificial illumination sets the share of built sites that glow, on a log scale;
- satellite belt density sets the number of satellites, adding a fixed increment per decade;
- industrial pollution and contaminated aerosol set haze strength, and agricultural pollution
  sets the share of land drawn as fields.

These are presentation encodings (`derived` inputs, `interpretive` art). A Table 6 dash stays
`null`: nothing is drawn for it and the prose says the table reports no value, never that the
activity is absent. All artwork and descriptions are labelled original interpretive models.

## Architecture

- `apps/web/app/planets/` builds every world, body and explorer study procedurally with Three.js
  into flat-shaded, vertex-coloured geometry: one draw call per material per layer. There are no
  textures, GLBs, decoder workers or downloads, so the guided path fetches no 3D assets.
- Quality tiers keep the overview grid light and give the focused chapter, portrait and explorer
  more faces. Built models are shared across mounts and released 20 s after their last use.
- Motion (planet sway, orbits, clouds, searchlight, migrating camps, pulses) only advances while
  a frame is drawn. Wherever the site's reduced-motion setting applies (Atlas and Observatory
  portraits), every world rests at its pose; the homepage story keeps its existing full-motion
  policy.
- The explorer lists each world's landmarks from `stories.ts`, a Three.js-free module that also
  supplies the portraits' screen-reader descriptions. Landmarks on the globe are clickable.
- The canvas publishes `data-planet-models` and `data-planet-state` for tests and diagnostics,
  replacing the retired `data-blender-*` attributes.
- `/planets-lab` is a development-only review page (404 in production) showing every world,
  body and system side by side.

The previous planet modules (`Planet.tsx`, `StoryBody.tsx`, `BlenderAssets.tsx`, world object and
actor modules, and the Blender library under `public/assets/blender`) are no longer reachable
from any route but remain on disk with their unit tests. Removing them is a separate cleanup.

## Verification and changed checks

Unit tests cover exact copying of every Table 6 cell and Table 8/9 value, deterministic builds,
finite geometry, the shared envelope, overview cost, no surface light where illumination is
`null`, and a placed, buildable study for every described landmark and destination. The bundle
budget script now audits the reachable home source graph and fails if it references any public
asset. End-to-end specs were updated for the new explorer vocabulary; the Blender decoding spec
and the decompression-worker check were retired because nothing is decoded any more.

No dependency, canonical schema, generated data or media-rights change. City coordinates are
public geographic facts; continents are hand-authored.
