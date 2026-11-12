# Janus kit art direction

2026-11-11. The brief for every model in the Blender kit (`scripts/blender/kit/`). It replaces the
code-drawn box-and-prism props of Decision 035 with designed models; see
[Decision 038](DECISION_038_BLENDER_KIT.md) for the pipeline.

All kit geometry is **original interpretive artwork**. Buildings, creatures, machines, counts and
dimensions are invented illustrations of the Project Janus narratives. They never encode a
measured quantity, and no third-party model, texture or illustration is used or imitated.

## The look: a premium toy diorama

Think of a hand-finished miniature under studio light, not a game prototype.

1. **Soft edges.** Every hard edge is chamfered so it catches a highlight. The kit bevels boxes,
   cylinders and extrusions by default; never pass `bevel=0` on a visible exterior edge of a
   major form. Small trims (mullions, bars) may be unbevelled.
2. **Chunky, friendly proportions.** Slightly oversized heads, wheels, doors and windows; stout
   walls; thick roofs with real overhang. Nothing paper-thin: give slabs, fins and panels
   thickness.
3. **A readable silhouette first.** At story distance a model is about 30 pixels tall. One strong
   primary form, two or three secondary forms, then a handful of small accents. If a detail does
   not read at thumbnail size and does not reward a close look, leave it out.
4. **Construction that makes sense.** Roofs sit on walls, legs reach the ground, pipes enter
   ports, wheels sit under arches, cranes have a cab, a jib and a hook. No floating parts, no
   intersecting slabs used as a shortcut for a join you can see.
5. **Detail hierarchy on buildings.** Plinth, wall, openings with frames and sills, a roof with
   thickness, then one or two accents (chimney, awning, planter, lamp, antenna). Use
   `parts.window` and `parts.door`; do not draw windows as flat stickers.
6. **Painted, not noisy.** Colour comes from the palette (`kit/palette.py`). Large surfaces get a
   gentle bottom-to-top gradient (`.color(low, high)`, a touch lighter on top). The bake adds
   ambient occlusion and a little top light. No random per-face colour jitter.
7. **Organic forms are faceted on purpose.** Foliage, rock, ice, cloud and crystal use `.flat()`
   shading on lumpy `blob`s. Everything manufactured is smooth-shaded with crisp bevels.
8. **Each kind is its own design.** Variants such as `house`, `house-slate` and `house-brown`
   differ in massing and roof, not just paint. Scenario identity lives in architecture.
9. **Restraint.** Two or three colours per model plus one accent. Glow is precious: windows,
   lamps, status lights, engines.

## Frame, scale and parts

- Blender frame: **x right, y back, z up**. A model stands on `z = 0`, is centred on the origin in
  x and y, and its **front faces −y**. Vehicles travel toward −y. (The exporter converts to the
  web frame.)
- One unit is one citizen's height. Keep each kind within about 15% of the width, height and depth
  listed for it in `tmp/premium/spec.json` (web frame there: `size` is `[width x, height y,
depth z]`; web depth z is Blender y). World layouts depend on those envelopes. Models that fly
  or float keep the listed ground clearance (`min[1]`).
- Material parts, set with `.part(name)`:
  - `base` — authored colour, matte. Most things.
  - `tint` — painted near white (`P.WHITE`, `P.SHADE_1..3`); the web app multiplies it by a
    per-instance colour (walls, clothes, bodywork, foliage). The decorator's `tint=` is the
    default instance colour. Keep the existing default tint of each kind.
  - `glass` — glossy glazing, visors, water, solar cells.
  - `metal` — real metal that should gleam (also multiplied by the instance colour, so paint it
    a light metal tone).
  - `glow` — unlit emissive: lamps, screens, engines, status lights.
  - `lit` — window panes. They glow in the model and are dark glass in its `-dark` twin, which
    the exporter generates when the decorator says `dark=True`. Never register a `-dark` kind
    yourself.
- Triangle budgets (the build enforces the decorator's `budget`): people and animals ≤ 900,
  plants and small decor ≤ 700 (trees ≤ 900), vehicles ≤ 1,400, houses ≤ 1,500, large buildings
  and machines ≤ 2,400, hero set pieces ≤ 4,500. Spend triangles on silhouette and openings, not
  on hidden faces. Use `grounded=True` on bodies that sit on the ground.

## Authoring API (`from kit import jk, parts; from kit import palette as P`)

Register a model:

```python
@asset("house", tint="#efe4cf", dark=True, budget=1500)
def house(a):
    a.box(2.4, 1.9, 1.38, grounded=True).part("tint").color(P.SHADE_1, P.WHITE)
    parts.gable_roof(a, 2.4, 1.9, 0.92).move(0, 0, 1.38)
    parts.window(a, 0.46, 0.5).move(-0.5, -0.95, 0.6)
```

`grounded=False` on the decorator is for models that fly or orbit (no ground shadow is baked).

Primitives (all `a.<name>(...)`, each returns a `Piece`; they stand on z = 0 unless noted):

| Call                                                                       | Makes                                                                                                                                            |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `box(w, d, h, bevel=None, taper=1, grounded=False)`                        | bevelled box; `taper` scales the top, `(tx, ty)` allowed                                                                                         |
| `cyl(r, h, sides=16, r2=None, bevel=None, grounded=False)`                 | cylinder / frustum; `cone(r, h, sides)`                                                                                                          |
| `lathe([(radius, z), ...], sides=16)`                                      | revolved profile: domes, tanks, towers, rockets, vases                                                                                           |
| `sphere(r, sides, rings, squash)`, `dome(r, h)`, `capsule(r, h)`           | smooth rounds (sphere is centred on the origin)                                                                                                  |
| `blob(r, subdiv=2, squash, lumps, seed)`                                   | faceted organic lump, centred on the origin, flat-shaded                                                                                         |
| `ico(r, subdiv)`                                                           | plain icosphere, centred on the origin                                                                                                           |
| `prism([(x, y), ...], h, bevel, grounded)`                                 | footprint polygon extruded up                                                                                                                    |
| `profile_x([(y, z), ...], width)`                                          | side silhouette extruded along x: car bodies, gables, ramps                                                                                      |
| `profile_y([(x, z), ...], depth)`                                          | front silhouette extruded along y: arches, signs, wings                                                                                          |
| `loft([(y, rx, rz[, cz[, cx]]), ...], sides=12, power=2.4)`                | body through rounded cross-sections along y: hulls, fuselages, torsos, shells. `power` 2 = ellipse, 4 = rounded box. Zero radii close to a point |
| `tube([(x, y, z), ...], r or [r...], sides=8, caps="flat"/"round"/"none")` | swept round section: pipes, limbs, masts, cables, branches                                                                                       |
| `torus(R, r, segments, sides, arc=360)`, `annulus(r_out, r_in, h)`         | rings, tyres, collars, pads                                                                                                                      |
| `plate([(x, y), ...], thickness)`, `raw(verts, faces)`                     | thin slabs and custom meshes                                                                                                                     |

Piece methods (chainable): `.part(name)`, `.color(low[, high[, axis]])`, `.paint(fn)`,
`.paint_up(colour)`, `.paint_side(colour, direction)`, `.flat()`, `.smooth(angle)`, `.no_ao()`,
`.move(x, y, z)`, `.rot(x, y, z, pivot)` (degrees), `.scale(x[, y, z])`, `.taper(top)`,
`.bend(angle)`, `.warp(fn)`, `.jitter(amount, seed)`, `.subdivide(cuts)`, `.bevel(width)`,
`.subsurf(levels)`, `.decimate(ratio)`, `.solidify(thickness)`, `.cut(other_piece)`,
`.join(other_piece)`, `.copy()`. Transform after shaping: `rot` and `scale` act about the origin
unless you pass a pivot. Free functions `jk.box(...)` etc. build a piece without adding it (for
cutters, or `a.add(piece)` later). `jk.shade(colour, ±amount)` and `jk.mix(a, b, t)` derive tones.

Groups place an assembly at once:

```python
with a.group() as g:
    a.box(...); a.cyl(...)
g.rot(z=90).move(1, 0, 0.5)   # also g.scale(), g.mirror("x"), g.radial(n), g.copies()
```

Shared sub-assemblies in `kit/parts.py` (each returns a Group built at the origin, facing −y):
`window(a, w, h, trim, pane="lit"|"glass"|"glow", pane_color, sill, mullion, shutters)`,
`door(a, w, h, leaf, trim, step, knob, light, arch)`, `frame(w, h, border, depth, recess)`,
`gable_roof(a, w, d, rise, overhang, thick, color, axis)`, `gable_wall(w, rise)`,
`hip_roof(a, w, d, rise, overhang, color)`, `chimney(a, w, h, color)`, `awning(a, w, d, color)`,
`wheel(a, r, width)`, `axle_pair(a, track, y, r, width)`, `trunk(a, h, r, lean, color)`,
`canopy(a, [(x, y, z, r[, squash[, subdiv]]), ...], seed, part, low, high)`,
`figure(a, skin, hair, hair_style, legs, shoes, stride, arms, hat, robe, pack, vest, scale,
hat_style, hood, skirt, sleeves, slim, stance, lean, reach, belt, eyes)` (a citizen one unit tall;
its docstring describes each option and the anchors it returns for attaching tools and packs).

Rotate a wall-mounted group with `.rot(z=...)`: 0 faces front (−y), 90 faces +x, 180 faces back,
−90 faces −x. `parts.py`, `jk.py` and `palette.py` are shared: do not edit them. Put any helper
you need in your own module.

## Working loop

```sh
python3 scripts/kit.py stats  --module <your module>          # triangles, size, budget
python3 scripts/kit.py review --kinds a,b,c --out <dir>/x.png  # lit contact sheet
python3 scripts/kit.py review --kinds a --out <dir>/a.png --columns 1 --cell 900 --azimuth 150
```

Add `--dark` with `--module`, or name `<kind>-dark`, to see unlit twins. `--true-scale` shows
relative sizes. Read every sheet you render and judge it honestly against this brief and against
the benchmark models (`house`, `car`, `robot`, `oak`, `pine`, `person-0`). Look at each model from
at least two sides (`--azimuth 35` and `--azimuth 150` or `-60`). Iterate until it holds up; a
model that merely builds is not finished.

## Acceptance checklist

- Reads as what it is at 60 pixels and rewards a close look at 600.
- Bevelled, grounded, front facing −y, within its size envelope and triangle budget.
- Correct parts: tint where the scenario recolours it, lit panes on `dark=True` buildings, glow
  used sparingly, metal only for metal.
- No floating, inverted, missing or z-fighting faces from any angle; no paper-thin slabs.
- Distinct from its siblings by form, not only colour.
- Fits the narrative role given in its note. No national, religious or brand symbols; no text.
