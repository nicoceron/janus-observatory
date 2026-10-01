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

## Inhabited worlds (revision 2)

The first pass read as painted globes with a few landmarks. The user asked for citizens, assets,
plants, buildings and detail everywhere. Every world is now a populated diorama:

- **Asset library** (`apps/web/app/planets/props/`): over 160 original low-poly models (over 180 with
  revision 3's sci-fi set) built in one person-unit scale: citizens (four skin tones, standing and walking, workers, guards, robed
  walkers, porters, enhanced S5 citizens, astronauts), animals (deer, bison, cows, sheep, horses,
  birds, whales, fish), plants (broadleaf, conifer, birch, cypress, palm, bushes, grass, flowers,
  reeds, cactus, dead trees, crops, vines, S5 bio-flora, coral), buildings (houses, cottages,
  apartments, towers, skyscrapers, factories, barns, silos, halls, markets, greenhouses, domes,
  shanties, bunkers, ruins, yurts, tents, huts, totems, wells, lighthouses, docks, cranes,
  pylons, masts, turbines, windmills, rigs, derricks, billboards, checkpoints, surveillance poles,
  screens, worker blocks, life-support plant, space habitats, pads, rockets, dishes, drills,
  crystals, eco-domes) and vehicles (cars, taxis, vans, trucks, haul trucks, buses, trams,
  maglev, bicycles, carts, ships, tankers, ferries, sailboats, fishing boats, canoes, bio-skiffs,
  planes, airships, gliders, drones, rovers, machine walkers). Parts take per-instance colours.
- **Settlements** (`scene/towns.ts`): radial, grid or camp layouts with streets, plazas, lots that
  face the street and never overlap a street or a neighbour, lamps, parks, standing and walking
  citizens and street traffic. Each scenario has its own building vocabulary, crowds and vehicles.
- **Networks and nature** (`scene/network.ts`, `scene/wilds.ts`, `scene/sites.ts`): roads with
  pylons and bridges, elevated rail, sea lanes, harbours, flights, furrowed fields, biome forests,
  roaming herds, flocks and whales. Companion bodies get stations, suited walkers and rovers.
- **Rendering**: props are GPU instances (one draw per prop part); movers are advanced along routes
  each frame while their world is visible. The focused story world keeps animating; the ten-world
  overview omits citizens and traffic. The explorer can zoom to street level.
- **Loading and power**: models build in idle time, several per idle period, around the reader's
  chapter. Only the world the reader is looking at may build during a frame, and then at overview
  detail, upgrading to its full tier when the idle queue finishes it; background and neighbouring
  worlds appear as soon as the queue has built them. Every world material is compiled once when the
  scene mounts and kept alive, so the first frame that shows a new kind of surface does not stall.
  Anchor travel and fast scrolling therefore never wait on a build or a shader. Idle animation of the focused world backs off when frames run long. When WebGL runs on a
  software rasterizer (SwiftShader, llvmpipe), worlds and bodies, in the story and the explorer,
  use a `minimal` tier (terrain, landmarks and light, no instanced props) and do not animate while
  idle: there every triangle is CPU work that blocks input. Landmark studies keep full detail,
  and while an anchor travel scrolls the page the scene holds still and draws once on arrival, so
  the travel stays interruptible. Hardware GPUs always get the full tiers and every frame.

## Toy scale (revision 3)

At story distance revision 2 was unreadable: thousands of person-sized props blurred into
texture. The user asked for drastically fewer, bigger assets, in the spirit of the original's
few large models. Every world is now a toy diorama:

- One person unit is 0.045 planet radii (was 0.0075): a house stands about an eighth of the
  planet radius tall. Citizens and animals are drawn 2× life size, robots 2.6× (as tall as the
  houses they walk between), vehicles 1.6×; aircraft and ships stay near life size.
- At story quality a world keeps at most 45 buildings and structures, 36 plants, 12 citizens,
  10 robots, 8 small details, 8 animals and 6 parked vehicles, plus 40 movers; other tiers scale
  these budgets by their density. When a recipe offers more, a declutter pass widens the spacing
  between same-group props evenly, so every settlement keeps a few buildings rather than some
  vanishing. Props never overlap each other or a landmark's ground footprint.
- Settlements, regions, mines, rigs, camps and ruins are fewer and wider; landmarks are about
  2.5× larger; clouds float higher; aircraft and drones fly above the rooftops.
- Per world: about 60–120 static props and 10–36 movers (revision 2 had 1,200–6,000 and
  260–2,200), and 13k–52k triangles at story quality (were 105k–432k).
- Set pieces (`props/heroes.ts`) give each future one recognisable silhouette, drawn about a
  third of the planet radius tall and placed near the limb of the story view, where they stand
  in profile: panopticon towers and enforcer titans (S1), company titans, a giant excavator and
  a launch site (S2), garden spires and a launch site (S3), fallen titans grown over by forest
  (S4, S7), bio-spires (S5), nanoforges and maintenance titans (S6), rogue enforcers and wrecks
  of the machine war (S8), the machines' monoliths (S9) and a seed ark (S10). Present-day Earth
  has none.
- A sci-fi set (`props/scifi.ts`, 19 models) gives the high-technology futures their machines:
  service robots, security sentinels, mechs, six-legged maintenance crawlers, hover cars and
  buses, cargo drones, shuttles, landers, light-ringed spires, arcologies, fusion reactors,
  hologram pillars, industrial arms, turrets, beacons, pod homes and overgrown robot wrecks.
  They follow each narrative: sentinels and holograms police S1; mechs guard S2's enclaves while
  crawlers work its mines beside a shuttle port; robots serve S3's garden towns, which travel by
  hover transit and launch from a spaceport by the tether; androids and pod homes join S5; S6's
  plating is tended by crawlers, arms and reactors; S8's silent core is ringed by wrecked and
  dormant machines. S4 and S7 keep only relic wrecks from before the collapse; present-day Earth,
  S9's Earth (the machines have left) and S10's restored Earth get none. Companion stations gain
  landers, shuttles and robots, and S9's machined Mars and Venus gain crawlers, mechs and spires.
  Robots share a budget of 14 standing and 10 moving per world.

The published values still decide extent and intensity (built fraction, light, traffic in orbit,
haze, fields). Crowds, vehicles and wildlife are interpretive illustration of each narrative,
labelled as original interpretive artwork, and never presented as measured quantities.

## The rest of the system (revision 3c)

Companions and system features get the same toy treatment, at twice the Earth's toy scale because
they are drawn smaller in the system view:

- Moon, Mars and Venus stations carry set pieces about 0.6 of the body's radius, by station
  style: S1's panopticon and enforcer on the Moon, S2's resort arcology and launch site on the
  Moon and its excavator, mining rig and company titan on Mars, S3's launch sites and landers,
  S5's bio-spires and garden spires on the bloom Moon and terraformed Mars, S6's nanoforges,
  maintenance titans and reactors, S8's guarded hatch, S9's machine monoliths, titans and spires
  on Mars and Venus, and S10's seed arks and launch sites. Bodies worked only from orbit (S1's
  and S5's Venus, S9's Moon) carry a station ring: S1's elite settlements, S5's habitats, S9's
  machine nodes. S10's Venus floats cloud cities in its upper atmosphere.
- `features.ts` rebuilds the asteroid, outer-planet and Kuiper features per scenario as small
  dioramas: a set piece on the main rock or moon (an enforcer, a giant excavator, a lander, a
  bio-spire, a nanoforge, a monolith or a seed ark), mining rigs or homes and a crew around it,
  lit ore veins, orbital settlements around the giant, and ore haulers, cargo drones or gliders
  circling. S9's Dyson swarm has five rings of seamed panels with collector stations.
- Table 8 still decides only whether a feature appears; what is drawn on it is interpretive.

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
  more faces. Built models are shared across mounts and released 20 s after their last use
  (90 s for models built ahead and not yet shown).
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
