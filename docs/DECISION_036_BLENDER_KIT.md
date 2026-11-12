# Decision 036 — The Blender model kit

2026-11-12. Supersedes the code-drawn props, landmarks, globes, system bodies, observer and
telescope of [Decision 035](DECISION_035_STORY_DRAWN_LOW_POLY_WORLDS.md). Decision 035's world
recipes (which future shows what, driven by which published value), story choreography, camera,
layout anchors, accessibility behaviour and canonical data are unchanged.

## Request and approach

The user rejected the artwork of Decision 035 as crude and asked for every asset on the site to
be rebuilt in Blender as premium, deliberately designed work, with nothing left as a random
placeholder. They also asked that the process be captured for later publication.

Decision 035 drew everything in TypeScript from boxes, prisms and jittered blobs. That made
worlds cheap to regenerate but capped the craft: no bevels, no real silhouettes, flat shading
only. This decision keeps the procedural _worlds_ (where things go, and why) and replaces every
_thing_ with an authored Blender model:

| Family                                | Models | Where                                                 |
| ------------------------------------- | -----: | ----------------------------------------------------- |
| Citizens and animals                  |     24 | `assets/people.py`, `animals.py`                      |
| Plants and ground decor               |     24 | `assets/plants.py`                                    |
| Homes and housing                     |     22 | `assets/houses.py`, `housing.py`                      |
| Town, rural and industry              |     45 | `assets/town.py`, `rural.py`, `industry.py`           |
| Vehicles, ships and aircraft          |     27 | `assets/vehicles_road.py`, `vehicles_sea_air.py`      |
| Robots and sci-fi structures          |     26 | `assets/robots.py`, `space.py`                        |
| Hero set pieces                       |     11 | `assets/heroes.py`                                    |
| Scenario landmarks                    |     29 | `assets/landmarks_a.py`, `_b.py`, `_c.py`, `stage.py` |
| Satellites, clouds and terrain        |     19 | `assets/sky.py`, `terrain.py`                         |
| Solar System bodies                   |     12 | `assets/system.py`                                    |
| Observer and telescope                |     14 | `assets/observer.py`                                  |
| Study plinth, colony and swarm pieces |      9 | `assets/stage.py`                                     |

That is 262 models and 376,658 triangles, plus 20 unlit twins of buildings that share their lit
model's geometry. All paths are under `scripts/blender/kit/`. The Earth itself is also authored there
(`earth.py`): continents are hand-drawn outlines with mountain ranges and dry and lush regions,
replacing Decision 035's overlapping caps, whose coastlines read as pixels.

## The look

One art direction governs every model: [KIT_ART_DIRECTION.md](KIT_ART_DIRECTION.md). In short, a
finished miniature rather than a low-poly sketch: chamfered edges that catch light, considered
proportions, specific functional detail, restrained colour, and ambient occlusion and a painted
top light baked into vertex colour. There are no textures. One unit is one citizen tall.

Each model is built from named material parts. `base` keeps its authored colour; `tint` and
`metal` are authored near white and multiplied by a colour the world chooses per instance, so
one house serves every palette; `glass`, `glow` and `lit` (window panes) complete the set. A
`-dark` twin of a building shares its geometry and draws its panes as unlit glass.

## Architecture

**Authoring.** `scripts/blender/kit/jk.py` is a small modelling library over `bmesh` (boxes,
lathes, lofts, tubes, bevels, vertex-colour gradients, weighted normals, a BVH ambient-occlusion
bake). Each model is a Python function registered with `@asset(name, tint, budget, ...)`.
`python3 scripts/kit.py <command>` runs Blender in the background, one job at a time behind a
lock file and limited to two CPU threads, so several authors can work at once without stacking
Blender processes. `review` renders contact sheets in a studio that matches the site's lights;
`stats` enforces triangle budgets; `export` writes the site's packs and one editable `.blend` per
module under `assets/blender/kit/`.

**Delivery.** Decision 035 downloaded no art. The kit is downloaded again, as four packs under
`/assets/kit/v1/`, in this order:

| Pack        | Holds                                                        |
| ----------- | ------------------------------------------------------------ |
| `core`      | what the opening Earth uses, and the shared Earth relief     |
| `observer`  | the alien observer and the telescope                         |
| `worlds`    | every other citizen, creature, plant, building and vehicle   |
| `landmarks` | scenario landmarks, Solar System bodies and the study plinth |

The pack format is the kit's own (`export.py`, `props/pack.ts`): a JSON header, then per part
delta-coded 16-bit positions quantised to the model's bounding box, 8-bit normals, delta-coded
8-bit sRGB colours and high-water-mark indices, gzip-compressed on disk. It decodes
synchronously and needs no decoder dependency; the models carry no textures, materials or
animation, so a general scene format would add size and a loader for nothing the site uses.
Browsers without `DecompressionStream` use the small inflate in `props/inflate.ts`. The home page
preloads the `core` pack.

`props/kit.generated.json`, written by the export, lists every model's bounding box, parts,
default colour and pack. Worlds are laid out from it synchronously, before any geometry arrives;
a world is built only once the packs it needs have loaded (`core` for the opening Earth, all for
the rest). `scripts/blender/kit/core-kinds.json` is produced by
`pnpm exec tsx apps/web/app/planets/props/core-kinds.ts`, which builds the opening Earth at every
quality and records the models it asked for.

**Runtime.** Props are still instanced per kind and part (`Instances.tsx`); landmarks, relief,
satellites, clouds and system bodies are merged into scene layers (`LayerBuilder.kit`). Models
carry authored normals, so flat shading is gone; glass, water and metal reflect a small studio
environment generated in a shader (no download). The globe is rebuilt: coastlines are snapped to
the authored outline, land is raised by a shore bank, and water is a smooth glossy sphere.
Mountains, hills, dunes, mesas, volcanoes, icebergs and craters are kit models placed on the
terrain (`scene/relief.ts`). The observer and telescope are assembled from kit pieces by the
existing rig (`voyage/ObserverLife.tsx`, `Telescope.tsx`, via `planets/KitModel.tsx`).

**Without the kit.** The core experience still works without WebGL and without the packs: the
story, atlas, labels, counters and citations are DOM. A failed pack download leaves the
illustrations unbuilt and is retried on the next visit to a scene.

## Composition

Detailed models made the layout faults of Decision 035 visible, so the staging was tightened
without changing what any world shows:

- **Proportion.** Citizens and animals are drawn 1.5× life size (were 2×), vehicles 1.3× (1.6×),
  robots 1.9× (2.6×). The kit's figures carry their own detail and no longer need the larger
  exaggeration. A set piece is never enlarged past twice its neighbours.
- **Towns.** Buildings this large rarely fit along a street, so most towns came out as two or
  three buildings and a road. A town is now completed as a cluster: buildings in rings round its
  centre, facing it, clear of the roadway and each other. Story quality keeps up to 60
  structures (was 45).
- **Roads.** Streets and roads are reserved lanes: no building, tree, herd or decoration is kept
  where traffic runs, harbour works and rail pylons excepted. Paving is even in tone, with kerb
  lines and a dashed centre line on roads between towns. Walls and fences run along their ring
  instead of across it.
- **Sea and air.** Ships keep a berth of open water from every coast and whales stay in open
  ocean. Aircraft fly whole great circles above the clouds and every skyline instead of shuttling
  between two towns at rooftop height.
- **Grounding.** Every standing or travelling prop lies in a soft pool of shade the size of its
  footprint, drawn with the same instance matrices as the model.

## Rights and provenance

The kit is original project artwork. No third-party model, texture, photograph or map dataset is
used. The packs are admitted to the asset ledger as `janus.kit.v1.<pack>` by
`scripts/record-kit-art.ts`, which records the checksum of the authoring source and of each
published pack; `pnpm assets:validate` verifies them. The models are interpretive illustration of
the Project Janus narratives: architecture, creatures, machines, proportions and counts are not
measurements, the continents are a caricature rather than a geographic reconstruction, and no
scenario is presented as more or less probable than another.

## Cost and quality tiers

An authored model costs far more than the box it replaced, and worlds repeat some models by the
dozen or the hundred. Three rules keep a world's cost near Decision 035's:

- **Swarms use light models.** A belt draws its first two satellites in full and the rest as
  `sat-mini`; S9's halo keeps six full machine nodes among `machine-node-mini`; S10's ring is one
  full habitat and eleven `habitat-far`; a settled moon is covered in 28-triangle `micro-block`s.
  Each light model is authored to the frame and silhouette of its full version.
- **The light tiers stay light.** At overview and minimal quality (the ten-world constellation and
  software rendering) satellites are 32-triangle `sat-speck`s, roads are drawn without markings
  and the shared ground carries no repeats of a landmark, only each world's hero pieces. Minimal
  worlds are 23k–43k triangles, in the range Decision 035 drew.
- **Story quality spends where it shows.** A story-quality world merges 43k–169k triangles of
  terrain, landmarks and orbits and instances 45k–182k of props.

## What changed for the reader

- Nothing in the story, the atlas, the data or the wording changed. Every illustration did.
- The site downloads four model packs again: 0.57 MB for the opening Earth, 0.14 MB for the
  observer, 1.67 MB for the scenario worlds and 1.16 MB for landmarks and system bodies (3.55 MB
  in all, stored gzip-compressed). The home page's opening visuals come to 0.68 MB against the
  1.5 MB mobile budget, and a whole guided journey to 4.5 MB against 20 MB.
- **No light the table does not report.** Kit models carry their own lamps and lit windows, so
  the rule Decision 035 applied by hand is now enforced centrally: where Table 6 reports no
  artificial illumination for a body (`WorldModel.unlit`), no kit model on its surface glows,
  every prop is drawn as its unlit twin, and the ground lights and lit seams that companion
  bodies drew are left out. This changes S9's and S10's Earth props and the companions with no
  illumination cell (for example S9's machined Mars and Venus, which Decision 035 drew with
  glowing seams). Not detected is not absent: the drawing only adds no light the source lacks.
- The published illumination share no longer varies how many windows of the S2 enclave and the
  S3 garden town are lit: a kit landmark's windows are all lit or, on an unlit world, all dark.
  The share still decides lit allocation blocks, lamps and lit ground on every world.

## Verification

See [the QA report](qa/blender-kit/REPORT.md) for the checks run, their results and what was not
validated.

## Process record

Before, in-progress and after captures are kept under `media/kit-process/` (not committed; see
its `README.md`) for later publication, as the user asked.
