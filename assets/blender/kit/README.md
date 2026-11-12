# The Janus model kit: editable sources

These are the Blender sources of every model the site draws: citizens, creatures, plants,
buildings, vehicles, robots, scenario landmarks, terrain, satellites, clouds, Solar System bodies,
the alien observer and the telescope. See [Decision 038](../../../docs/DECISION_038_BLENDER_KIT.md)
for the design and [the art direction](../../../docs/KIT_ART_DIRECTION.md) for the look.

Open any file in **Blender 5.3**. Each holds one authoring module: every model is a named object
on a grid, with one material per part (`base`, `tint`, `glass`, `metal`, `glow`, `lit`). Colour,
ambient occlusion and the painted top light are in the `Col` vertex colour attribute; there are
no image textures to relink.

| Source                                          | Models                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| `people.blend`, `animals.blend`                 | citizens, workers, guards, astronauts; deer, cattle, whales, birds     |
| `plants.blend`                                  | trees, shrubs, flowers, crops, rocks, S5 bio-flora                     |
| `houses.blend`, `housing.blend`                 | homes, huts and tents; apartments, blocks, towers, future homes        |
| `town.blend`, `rural.blend`, `industry.blend`   | civic furniture, farms and utilities, works and ruins                  |
| `vehicles_road.blend`, `vehicles_sea_air.blend` | cars to maglevs; ships, aircraft and drones                            |
| `robots.blend`, `space.blend`                   | robots; stations, rockets and high-technology structures               |
| `heroes.blend`                                  | each future's signature set piece                                      |
| `landmarks_a.blend`, `_b`, `_c`                 | the scenario landmarks of S1–S3, S4–S6 and S7–S10                      |
| `sky.blend`, `terrain.blend`, `system.blend`    | satellites and clouds; relief; asteroids, giant, moons and the Sun     |
| `observer.blend`                                | the alien observer's pieces and the telescope                          |
| `stage.blend`                                   | the study plinth, colony pieces, the lunar hatch and the tether anchor |

## These files are generated

The models are authored as Python under [`scripts/blender/kit/`](../../../scripts/blender/kit/),
and `python3 scripts/kit.py export` rewrites every file here together with the site's packs.
**A manual edit made in Blender is overwritten by the next export.** To change a model, edit its
function in `scripts/blender/kit/assets/<module>.py`, then:

```sh
python3 scripts/kit.py stats --module houses          # triangle budgets
python3 scripts/kit.py review --kinds cottage --out /tmp/cottage.png --columns 1 --cell 900
python3 scripts/kit.py export                         # packs, manifest and these sources
pnpm exec tsx apps/web/app/planets/props/core-kinds.ts # only if the opening Earth's models changed
pnpm exec tsx scripts/record-kit-art.ts               # new checksums in the asset ledger
pnpm assets:validate
```

`kit.py` runs Blender in the background, one job at a time behind a lock and on two CPU threads.
`review --frames 96` renders a turntable instead of a sheet.

The artwork is original. Architecture, creatures, machines, proportions and counts are
interpretive illustration of the Project Janus narratives, not measurements.
