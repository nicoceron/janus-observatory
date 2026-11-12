"""Relief placed on the globe as props: peaks, hills, buttes, a volcano, ice, craters and a dune.

Everything is faceted and hand-cut: a few strong planes, flat-shaded. Rock, sand, grass and ice
are the tint part, painted near white with gentle value steps (steep faces a little deeper,
strata as bands), because the web app multiplies them by the local ground colour. Snow is `base`
and lava is `glow`, so they keep their own colour.

Every model stands on z = 0 and flares into a skirt that runs out and down to z = -0.15, so its
seam with the curved ground stays hidden. The foot is painted pure white: multiplied by the
ground colour it is the ground colour, and the relief grows out of the land instead of sitting
on it.

Original interpretive artwork; no height, width or count here is a measured quantity.
"""

from __future__ import annotations

import math
import random

import bmesh

from mathutils import Vector
from mathutils.bvhtree import BVHTree

from kit import jk
from kit import palette as P
from kit.jk import asset

BASE = -0.15
SNOW, SNOW_SHADE = "#f7fafc", "#c9d7e6"
ICE_SHADE, ICE_DEEP = "#cfe3ee", "#a9cfe2"
LAVA_HOT, LAVA, LAVA_COOL = "#ffd06a", "#ff9a3c", "#ff5a2a"


# --------------------------------------------------------------------------------------------
# Mesh helpers
# --------------------------------------------------------------------------------------------
def _clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def _smooth(x: float, lo: float, hi: float) -> float:
    t = _clamp((x - lo) / (hi - lo))
    return t * t * (3 - 2 * t)


def skin_bands(rings, apex=None, cap: bool = False, bottom: bool = False, field: bool = False):
    """Skin a stack of rings with triangles (split along the shorter diagonal) into a flat-shaded
    piece. Rings are equal-length lists of (x, y, z), counter-clockwise from above, listed from
    the outer foot inward and upward. `apex` closes the last ring to a point, `cap` with a face;
    `bottom` closes the first ring. `field` marks a height field (every face looks up); otherwise
    the mesh must be closed and its normals are made to point outward.

    Returns (piece, bands): bands[i] holds the faces between ring i and ring i + 1, and the last
    entry the closing faces.
    """
    bm = bmesh.new()
    rows = [[bm.verts.new(p) for p in ring] for ring in rings]
    n = len(rows[0])
    bands = []
    for lo, hi in zip(rows, rows[1:]):
        band = []
        for j in range(n):
            k = (j + 1) % n
            a, b, c, d = lo[j], lo[k], hi[k], hi[j]
            if (a.co - c.co).length <= (b.co - d.co).length:
                band += [bm.faces.new((a, b, c)), bm.faces.new((a, c, d))]
            else:
                band += [bm.faces.new((a, b, d)), bm.faces.new((b, c, d))]
        bands.append(band)
    closing = []
    if apex is not None:
        top = bm.verts.new(apex)
        closing = [bm.faces.new((rows[-1][j], rows[-1][(j + 1) % n], top)) for j in range(n)]
    elif cap:
        closing = [bm.faces.new(rows[-1])]
    bands.append(closing)
    if bottom:
        bm.faces.new(rows[0][::-1])
    bm.normal_update()
    if field:
        down = [f for f in bm.faces if f.normal.z < 0]
        if down:
            bmesh.ops.reverse_faces(bm, faces=down)
    else:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    return jk.Piece(bm).flat(), bands


def skin(rings, **kw) -> jk.Piece:
    """`skin_bands` without the band lists."""
    return skin_bands(rings, **kw)[0]


def trim(piece: jk.Piece, z: float = BASE) -> jk.Piece:
    """Cut away everything below z, leaving the piece open underneath."""
    bm = piece.bm
    bmesh.ops.bisect_plane(
        bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-5, plane_co=(0, 0, z), plane_no=(0, 0, 1),
        clear_inner=True,
    )
    bm.normal_update()
    return piece


def fuse(*pieces: jk.Piece) -> jk.Piece:
    """Unite closed pieces into one skin (no hidden triangles) and trim it at the skirt line."""
    mass = pieces[0]
    for other in pieces[1:]:
        mass.join(other)
        other.bm.free()
    return trim(mass).flat()


def hull(points) -> jk.Piece:
    """The convex hull of a handful of points: a gem-cut block with large clean planes."""
    bm = bmesh.new()
    for p in points:
        bm.verts.new(p)
    bmesh.ops.convex_hull(bm, input=bm.verts[:])
    stray = [v for v in bm.verts if not v.link_faces]
    if stray:
        bmesh.ops.delete(bm, geom=stray, context="VERTS")
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(2), verts=bm.verts[:], edges=bm.edges[:])
    bm.normal_update()
    return jk.Piece(bm).flat()


def ground(piece: jk.Piece):
    """A function (x, y) -> z giving the height of `piece` under a point (0 where it misses)."""
    tree = BVHTree.FromBMesh(piece.bm)

    def height(x: float, y: float) -> float:
        hit = tree.ray_cast(Vector((x, y, 50.0)), Vector((0, 0, -1)))
        return hit[0].z if hit[0] is not None else 0.0

    return height


def paint(piece: jk.Piece, pick) -> jk.Piece:
    """Give every face one flat colour from `pick(face, centre)`."""
    layer = piece.layer
    for f in piece.bm.faces:
        c = jk.col(pick(f, f.calc_center_median()))
        for loop in f.loops:
            loop[layer] = (c[0], c[1], c[2], 1.0)
    return piece


def paint_rock(piece: jk.Piece, top: float, deep="#bcbcbc", crown=P.WHITE, foot: float = 0.35) -> jk.Piece:
    """Rock, sand or turf for a tinted body: white at the foot so it melts into the ground,
    steep faces a step deeper, and the planes lightening again toward the summit."""

    def pick(f, c):
        steep = _smooth(1.0 - max(0.0, f.normal.z), 0.28, 0.82)
        rise = _clamp(c.z / foot)
        tone = jk.mix(P.WHITE, deep, steep * rise)
        return jk.mix(tone, crown, 0.3 * _smooth(c.z / top, 0.55, 1.0))

    return paint(piece, pick)


# --------------------------------------------------------------------------------------------
# Peaks
# --------------------------------------------------------------------------------------------
CRAGGY = [(0.0, 1.0), (0.1, 0.82), (0.3, 0.62), (0.5, 0.47), (0.68, 0.3), (0.86, 0.14)]
ALPINE = [(0.0, 1.0), (0.06, 0.86), (0.18, 0.7), (0.36, 0.55), (0.55, 0.41), (0.73, 0.27), (0.89, 0.12)]
SHOULDER = [(0.0, 1.0), (0.28, 0.74), (0.66, 0.42)]
HORN = [(0.0, 1.0), (0.35, 0.62), (0.75, 0.28)]
DOME = [(0.0, 1.0), (0.3, 0.83), (0.62, 0.58), (0.87, 0.3)]


def crag(apex, radius, profile, n=10, seed=1, ridge=0.16, rough=0.07, squash=(1.0, 1.0), centre=None, turn=0.0,
         flare=1.14) -> jk.Piece:
    """A closed faceted peak: ribs and gullies alternate round the summit.

    `apex` is the summit (x, y, z); `radius` the foot radius at z = 0; `profile` lists
    (fraction of height, fraction of radius) from the foot up. The foot is centred on `centre`
    (default: under the summit) and the rings drift toward the summit, so a peak can lean. The
    ribs zigzag in height as well as radius, which keeps the rings from reading as lathe turns.
    """
    rng = random.Random(seed)
    ax, ay, h = apex
    cx, cy = centre if centre is not None else (ax, ay)
    spokes = [((j + rng.uniform(-0.3, 0.3)) / n) * math.tau + turn for j in range(n)]
    sign = [1.0 if j % 2 == 0 else -1.0 for j in range(n)]
    gain = [rng.uniform(0.55, 1.35) for _ in range(n)]
    levels = [(-0.22 / h, flare)] + list(profile)
    rings = []
    for i, (t, rho) in enumerate(levels):
        u = max(0.0, t)
        proud = 0.14 + 0.86 * math.sin(math.pi * min(1.0, u * 1.06 + 0.03))
        ox = cx + (ax - cx) * u ** 1.15
        oy = cy + (ay - cy) * u ** 1.15
        ring = []
        for j in range(n):
            r = radius * rho * (1 + ridge * sign[j] * gain[j] * proud + (rng.uniform(-rough, rough) if i else 0.0))
            z = t * h
            if t > 0:
                z += h * (0.035 * sign[j] * gain[j] * proud + rng.uniform(-0.02, 0.02))
            ring.append((ox + math.cos(spokes[j]) * r * squash[0], oy + math.sin(spokes[j]) * r * squash[1], z))
        rings.append(ring)
    return skin(rings, apex=(ax, ay, h), bottom=True)


def shoulder(apex, radius, n=7, seed=1, toward=(0.0, 0.0), lean=0.3, **kw) -> jk.Piece:
    """A buttress peak whose foot stands a little farther out than its summit, so it leans on
    the main peak at `toward`."""
    dx, dy = apex[0] - toward[0], apex[1] - toward[1]
    d = math.hypot(dx, dy) or 1.0
    kw.setdefault("flare", 1.07)
    return crag(apex, radius, SHOULDER, n, seed=seed, centre=(apex[0] + dx / d * lean, apex[1] + dy / d * lean), **kw)


def snow_cap(rock: jk.Piece, pick, thick: float = 0.08) -> jk.Piece:
    """Lift the faces `pick(face, centre)` selects off `rock` as a snow shell standing `thick`
    proud of the rock, with a lip round its edge. The rock keeps a matching hole underneath."""
    bm = rock.bm
    chosen = [f for f in bm.faces if pick(f, f.calc_center_median())]
    cap = bmesh.new()
    twin = {}
    for f in chosen:
        loop = []
        for v in f.verts:
            if v not in twin:
                twin[v] = cap.verts.new(v.co)
            loop.append(twin[v])
        cap.faces.new(loop)
    bmesh.ops.delete(bm, geom=chosen, context="FACES")
    bm.normal_update()
    cap.normal_update()
    shell = cap.verts[:]
    push = {v: v.normal.copy() for v in shell}
    edge = [e for e in cap.edges if len(e.link_faces) == 1]
    bmesh.ops.extrude_edge_only(cap, edges=edge)
    for v in shell:
        v.co += push[v] * thick
    bmesh.ops.recalc_face_normals(cap, faces=cap.faces[:])
    cap.normal_update()
    if sum(f.normal.z * f.calc_area() for f in cap.faces) < 0:
        bmesh.ops.reverse_faces(cap, faces=cap.faces[:])
        cap.normal_update()
    piece = jk.Piece(cap).flat()
    low = min(v.co.z for v in cap.verts)
    high = max(v.co.z for v in cap.verts)

    def tone(f, c):
        if f.normal.z < 0.12:
            return SNOW_SHADE
        return jk.mix(SNOW_SHADE, SNOW, 0.8 + 0.2 * _clamp((c.z - low) / ((high - low) or 1.0)))

    return paint(piece, tone)


@asset("mountain-a", tint="#8d8a84", budget=500, note="single craggy peak with three shoulders")
def mountain_a(a):
    peak = (0.25, 0.1)
    rock = fuse(
        crag((0.25, 0.1, 4.0), 2.15, CRAGGY, 10, seed=3, ridge=0.2, squash=(1.0, 0.88), centre=(0.0, 0.0)),
        crag((-0.3, 0.32, 3.3), 1.0, HORN, 6, seed=4, ridge=0.12, flare=1.0),
        shoulder((-1.0, 0.2, 2.6), 1.3, 7, seed=5, toward=peak),
        shoulder((1.15, -0.4, 2.05), 1.15, 7, seed=8, toward=peak),
        shoulder((0.35, 1.0, 1.75), 1.0, 6, seed=13, toward=peak, ridge=0.14),
    )
    a.add(paint_rock(rock, 4.0)).part("tint")


@asset("mountain-b", tint="#8d8a84", budget=600, note="twin-peak ridge")
def mountain_b(a):
    rock = fuse(
        crag((-1.3, 0.1, 4.5), 1.9, CRAGGY, 10, seed=21, ridge=0.2, squash=(1.05, 0.9)),
        crag((1.55, -0.05, 3.75), 1.7, CRAGGY, 10, seed=24, ridge=0.2, squash=(1.05, 0.92)),
        crag((0.15, 0.1, 3.0), 1.55, SHOULDER, 7, seed=27, ridge=0.14, squash=(1.25, 0.82), flare=1.07),
        shoulder((-2.25, -0.35, 2.3), 1.05, 6, seed=31, toward=(-1.3, 0.1), lean=0.2),
        shoulder((2.45, 0.4, 1.85), 0.9, 6, seed=35, toward=(1.55, -0.05), lean=0.15),
    )
    a.add(paint_rock(rock, 4.5)).part("tint")


@asset("mountain-snow", tint="#8d8a84", budget=650, note="tall alpine peak with a snow cap")
def mountain_snow(a):
    peak = (0.15, 0.05)
    rock = fuse(
        crag((0.15, 0.05, 6.5), 2.5, ALPINE, 12, seed=41, ridge=0.2, squash=(1.0, 0.9), centre=(0.0, 0.0)),
        shoulder((-1.1, 0.3, 4.4), 1.5, 7, seed=44, toward=peak),
        shoulder((1.25, -0.4, 3.2), 1.25, 7, seed=47, toward=peak),
        shoulder((0.45, 1.15, 2.5), 1.0, 6, seed=49, toward=peak),
    )
    paint_rock(rock, 6.5)
    # Snow lies lower on the gentler planes, so its hem zigzags with the facets.
    snow = snow_cap(
        rock,
        lambda f, c: c.z > 2.8 + 1.3 * (1.0 - max(0.0, f.normal.z)) + 0.45 * math.sin(3.0 * math.atan2(c.y, c.x) + 0.6),
        0.1,
    )
    a.add(rock).part("tint")
    a.add(snow).part("base")


@asset("hill", tint="#7fae58", budget=250, note="low rounded faceted hill")
def hill(a):
    land = fuse(
        crag((-0.3, 0.1, 1.4), 1.75, DOME, 10, seed=61, ridge=0.05, rough=0.05, squash=(1.0, 0.88)),
        crag((0.95, -0.2, 0.9), 1.18, DOME, 8, seed=64, ridge=0.04, rough=0.05),
    )
    a.add(paint_rock(land, 1.4, deep="#cfcfcf", foot=0.5)).part("tint")


# --------------------------------------------------------------------------------------------
# Butte and volcano
# --------------------------------------------------------------------------------------------
def outline(n: int, seed: int, rough: float = 0.1, squash=(1.0, 1.0), turn: float = 0.0):
    """An irregular unit footprint: n corners, counter-clockwise from above."""
    rng = random.Random(seed)
    out = []
    for j in range(n):
        ang = ((j + rng.uniform(-0.28, 0.28)) / n) * math.tau + turn
        r = 1.0 + rng.uniform(-rough, rough)
        out.append((math.cos(ang) * r * squash[0], math.sin(ang) * r * squash[1]))
    return out


def tower(shape, levels, centre=(0.0, 0.0), **kw) -> jk.Piece:
    """Rings of one footprint scaled per level: `levels` lists (z, scale) from the foot up."""
    cx, cy = centre
    return skin([[(cx + x * s, cy + y * s, z) for x, y in shape] for z, s in levels], **kw)


STRATA = (
    # (top of band, tone): a talus apron, then cliff bands parted by dark ledges, then the cap.
    (0.94, None),
    (1.02, "#9f9f9f"),
    (1.5, "#f4f4f4"),
    (1.58, "#a6a6a6"),
    (1.98, "#cdcdcd"),
    (2.08, "#959595"),
    (9.0, "#e6e6e6"),
)


@asset("mesa", tint="#c98e5c", budget=400, note="desert butte with strata and a flat top")
def mesa(a):
    shape = outline(10, seed=71, rough=0.15, squash=(1.0, 0.84))
    shape[7] = (shape[7][0] * 0.8, shape[7][1] * 0.8)  # one bay eaten into the cliff
    butte = tower(
        shape,
        [(-0.37, 2.2), (0.0, 1.92), (0.45, 1.46), (0.94, 1.15), (1.02, 1.04), (1.5, 1.01), (1.58, 0.94), (1.98, 0.91),
         (2.08, 1.0), (2.5, 0.98), (2.6, 0.9)],
        centre=(-0.12, 0.05), cap=True, bottom=True,
    )
    spire = tower(
        outline(6, seed=77, rough=0.12, turn=0.4),
        [(0.2, 0.42), (0.94, 0.3), (1.02, 0.26), (1.5, 0.245), (1.58, 0.215), (1.98, 0.2), (2.08, 0.25), (2.24, 0.23),
         (2.3, 0.17)],
        centre=(1.3, -0.52), cap=True, bottom=True,
    )
    rock = fuse(butte, spire)

    def tone(f, c):
        if f.normal.z > 0.75 and c.z > 2.1:
            return P.WHITE
        for top, colour in STRATA:
            if c.z < top:
                if colour is None:
                    return jk.mix(P.WHITE, "#d4d4d4", _smooth(c.z, 0.1, 0.9))
                return colour
        return P.WHITE

    a.add(paint(rock, tone)).part("tint")
    # Blocks that have come off the cap lie on the apron.
    apron = ground(rock)
    for x, y, r, turn in ((-1.22, -0.62, 0.2, 20), (0.2, -1.2, 0.14, 65), (0.5, 1.25, 0.17, -30)):
        a.add(block(r, turn).move(x, y, apron(x, y) + r * 0.25)).part("tint")


@asset("volcano", tint="#6a5a52", budget=600, note="broad cone, crater, lava pool and two lava seams")
def volcano(a):
    n = 16
    rng = random.Random(83)
    spokes = [((j + rng.uniform(-0.22, 0.22)) / n) * math.tau for j in range(n)]
    sign = [1.0 if j % 2 == 0 else -1.0 for j in range(n)]
    gain = [rng.uniform(0.6, 1.3) for _ in range(n)]
    seams = {3: 2, 11: 3}  # gully spoke -> the level its lava reaches down to
    # (z, radius, how proud the ribs stand): a concave cone, a rim, then the crater wall.
    levels = [(-0.37, 3.3, 0.4), (0.0, 2.92, 0.6), (0.45, 2.34, 1.0), (1.15, 1.78, 1.0), (2.0, 1.36, 0.8), (2.9, 1.1, 0.5),
              (3.55, 0.97, 0.25), (3.94, 0.86, 0.0), (3.7, 0.68, 0.0), (3.22, 0.5, 0.0)]
    crest = 7
    rings = []
    for i, (z, r, proud) in enumerate(levels):
        ring = []
        for j in range(n):
            rr = r * (1 + 0.075 * sign[j] * gain[j] * proud + (rng.uniform(-0.03, 0.03) if 0 < i < crest else 0.0))
            zz = z
            if i == crest:
                zz = z + rng.uniform(-0.2, 0.08)
            if j in seams and i >= seams[j] and i <= crest:
                rr *= 0.93
                if i == crest:
                    zz = z - 0.3
            ring.append((math.cos(spokes[j]) * rr, math.sin(spokes[j]) * rr, zz))
        rings.append(ring)
    cone = trim(skin(rings, field=True))

    def tone(f, c):
        if math.hypot(c.x, c.y) < 0.82 and c.z > 3.0 and (f.normal.x * c.x + f.normal.y * c.y) < 0:
            return "#8c8c8c"  # the scorched crater wall
        steep = _smooth(1.0 - max(0.0, f.normal.z), 0.3, 0.8)
        ash = jk.mix(P.WHITE, "#c6c6c6", _smooth(c.z, 0.3, 3.6))
        return jk.mix(ash, "#b4b4b4", 0.5 * steep * _clamp(c.z / 0.4))

    a.add(paint(cone, tone)).part("tint")
    # The lava pool, then two tongues that spill through notches in the rim and run down gullies.
    pool = [(math.cos(spokes[j]) * 0.58, math.sin(spokes[j]) * 0.58, 3.4) for j in range(n)]
    a.add(skin([pool], cap=True, field=True)).part("glow").color(P.GLOW_ORANGE)
    for j, reach in seams.items():
        path, radii = [], []
        steps = list(range(crest, reach - 1, -1))
        for k, i in enumerate(steps):
            x, y, z = rings[i][j]
            sway = 0.09 * math.sin(k * 2.4 + j) if 0 < k < len(steps) - 1 else 0.0  # the flow wanders in its gully
            path.append((x - math.sin(spokes[j]) * sway, y + math.cos(spokes[j]) * sway, z + 0.03))
            radii.append(0.2 + 0.05 * math.sin(k * 1.9))
        radii[-1] = 0.3
        a.tube(path, radii, 6, caps="round", squash=0.34).part("glow").color(LAVA_COOL, P.GLOW_ORANGE)


# --------------------------------------------------------------------------------------------
# Ice
# --------------------------------------------------------------------------------------------
def paint_ice(piece: jk.Piece, waterline: float = 0.14) -> jk.Piece:
    """Sunlit planes white, walls a cool step deeper, and a wet band at the waterline."""

    def tone(f, c):
        if c.z < waterline and f.normal.z < 0.6:
            return ICE_DEEP
        return jk.mix(ICE_SHADE, P.WHITE, _smooth(f.normal.z, 0.15, 0.7))

    return paint(piece, tone)


def berg(waterline, girdle, crown, keel: float = 0.72, belt: float = 0.42) -> jk.Piece:
    """One block of an iceberg, cut like a gem: a keel under water, a waterline ring, a wider
    girdle above the wave-cut notch, and its own crown points. `waterline` and `girdle` are
    (x, y) outlines; `crown` is a list of (x, y, z)."""
    cx = sum(p[0] for p in waterline) / len(waterline)
    cy = sum(p[1] for p in waterline) / len(waterline)
    points = [(cx + (x - cx) * keel, cy + (y - cy) * keel, -0.3) for x, y in waterline]
    points += [(x, y, 0.04) for x, y in waterline]
    points += [(x, y, belt) for x, y in girdle]
    points += list(crown)
    return hull(points)


@asset("iceberg", tint="#dcecf4", budget=350, note="faceted iceberg, waterline at z = 0")
def iceberg(a):
    # The pinnacle: a leaning blade with a split summit.
    pinnacle = berg(
        [(-0.1, -0.62), (0.95, -0.7), (1.38, 0.1), (0.9, 0.78), (-0.05, 0.6)],
        [(-0.16, -0.7), (1.02, -0.78), (1.5, 0.12), (0.96, 0.88), (-0.12, 0.68)],
        [(0.1, -0.42, 1.25), (1.05, -0.3, 1.0), (1.02, 0.42, 1.2), (0.2, 0.45, 1.4), (0.42, -0.1, 2.2), (0.78, 0.2, 1.84)],
    )
    # A tabular block that has tipped: its old flat top now slopes toward the water.
    table = berg(
        [(-1.38, -0.5), (-0.3, -0.8), (0.1, 0.0), (-0.25, 0.8), (-1.3, 0.62)],
        [(-1.5, -0.56), (-0.3, -0.9), (0.14, 0.0), (-0.24, 0.9), (-1.42, 0.7)],
        [(-1.36, -0.4, 0.62), (-0.42, -0.68, 1.0), (-0.3, 0.62, 1.12), (-1.24, 0.56, 0.7)],
    )
    # A shard wedged between them, and a low foot of ice awash at the front.
    shard = berg(
        [(-0.55, -0.98), (0.12, -1.06), (0.22, -0.3), (-0.42, -0.2)],
        [(-0.58, -1.04), (0.15, -1.12), (0.24, -0.3), (-0.44, -0.2)],
        [(-0.22, -0.74, 1.62), (-0.08, -0.45, 1.3)],
        belt=0.5,
    )
    foot = berg(
        [(0.45, -1.08), (1.25, -1.0), (1.36, -0.5), (0.45, -0.5)],
        [(0.47, -1.06), (1.22, -0.98), (1.32, -0.5), (0.47, -0.5)],
        [(0.6, -0.94, 0.3), (1.08, -0.9, 0.26), (1.12, -0.56, 0.36), (0.58, -0.56, 0.38)],
        belt=0.16,
    )
    ice = pinnacle
    for other in (table, shard, foot):
        ice.join(other)
        other.bm.free()
    bm = ice.bm
    under = [f for f in bm.faces if f.normal.z < -0.9 and f.calc_center_median().z < -0.25]
    bmesh.ops.delete(bm, geom=under, context="FACES")
    bm.normal_update()
    a.add(paint_ice(ice.flat(), waterline=0.3)).part("tint")


def floe_plate(shape, top: float, shrink: float = 0.045, lean=(0.0, 0.0)) -> jk.Piece:
    """One plate of a floe: a footprint pulled in from its cracks, with a chamfered top edge."""
    cx = sum(p[0] for p in shape) / len(shape)
    cy = sum(p[1] for p in shape) / len(shape)

    def pull(p, d):
        dx, dy = p[0] - cx, p[1] - cy
        length = math.hypot(dx, dy) or 1.0
        k = max(0.0, 1.0 - d / length)
        return (cx + dx * k, cy + dy * k)

    def lift(p, z):
        return (p[0], p[1], z + (p[0] - cx) * lean[0] + (p[1] - cy) * lean[1])

    edge = [pull(p, shrink) for p in shape]
    crown = [pull(p, shrink + 0.07) for p in shape]
    under = [pull(p, shrink + 0.1) for p in shape]
    rings = [[(p[0], p[1], BASE) for p in under], [lift(p, top - 0.05) for p in edge], [lift(p, top) for p in crown]]
    return skin(rings, cap=True, field=False, bottom=True)


@asset("ice-floe", tint="#e8f2f6", budget=200, note="flat cracked floe")
def ice_floe(a):
    rim = [(-1.5, -0.2), (-1.1, -0.9), (-0.3, -1.15), (0.6, -1.0), (1.35, -0.55), (1.5, 0.25), (1.0, 0.95), (0.1, 1.15),
           (-0.8, 0.9), (-1.4, 0.45)]
    j1, j2, j3 = (-0.4, 0.0), (0.45, 0.18), (0.95, -0.2)
    plates = [
        ([rim[0], rim[1], rim[2], j1, rim[9]], 0.17, (0.012, 0.0)),
        ([rim[2], rim[3], j3, j2, j1], 0.21, (0.0, -0.015)),
        ([rim[3], rim[4], rim[5], j3], 0.14, (-0.02, 0.0)),
        ([j3, rim[5], rim[6], rim[7], j2], 0.19, (0.0, 0.012)),
        ([j1, j2, rim[7], rim[8], rim[9]], 0.16, (-0.01, 0.01)),
    ]
    for shape, top, lean in plates:
        plate = floe_plate(shape, top, lean=lean)
        bm = plate.bm
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z < -0.9], context="FACES")
        bm.normal_update()
        a.add(paint_ice(plate, waterline=0.06)).part("tint")
    # Two fragments have already drifted clear of the edge.
    for shape, top in (([(1.12, -0.86), (1.42, -0.92), (1.5, -0.66), (1.3, -0.6)], 0.11),
                       ([(-1.5, 0.6), (-1.2, 0.7), (-1.1, 0.96), (-1.38, 0.9)], 0.13)):
        chip = floe_plate(shape, top, shrink=0.0)
        bm = chip.bm
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z < -0.9], context="FACES")
        bm.normal_update()
        a.add(paint_ice(chip, waterline=0.06)).part("tint")


# --------------------------------------------------------------------------------------------
# Craters
# --------------------------------------------------------------------------------------------
def crater(R: float, h: float, n: int, seed: int, levels, floor: float = 0.05):
    """An impact crater as one height field. `levels` lists (fraction of R, kind, fraction of h)
    from the skirt inward; kind is "skirt", "foot", "flank", "crest", "wall" or "floor".
    The rim is painted bright, the inner wall shaded and the floor darker."""
    rng = random.Random(seed)
    spokes = [((j + rng.uniform(-0.24, 0.24)) / n) * math.tau for j in range(n)]
    wobble = [rng.uniform(-1, 1) for _ in range(n)]
    lip = [rng.uniform(0.74, 1.14) for _ in range(n)]
    lobe = [1.0 + rng.uniform(-0.045, 0.06) for j in range(n)]
    rings = []
    crest = bed = 0
    for i, (rho, kind, zf) in enumerate(levels):
        ring = []
        for j in range(n):
            r = R * rho * (1 + 0.045 * wobble[j])
            if kind == "skirt":
                r, z = r * lobe[j], BASE
            elif kind == "foot":
                r, z = r * lobe[j], 0.03
            elif kind == "flank":
                z = h * zf * (0.6 + 0.4 * lip[j])
            elif kind == "crest":
                z, crest = h * zf * lip[j], i
            elif kind == "wall":
                z = floor + (h * zf - floor) * (0.75 + 0.25 * lip[j])
            else:
                z = floor + h * zf
                bed = bed or i
            ring.append((math.cos(spokes[j]) * r, math.sin(spokes[j]) * r, z))
        rings.append(ring)
    piece, bands = skin_bands(rings, apex=(0.0, 0.0, floor), field=True)
    return paint_crater(piece, bands, crest, bed)


def paint_crater(piece: jk.Piece, bands, crest: int, bed: int) -> jk.Piece:
    """Regolith: a bright rim, a shaded inner wall and a darker floor."""
    layer = piece.layer
    for i, band in enumerate(bands):
        for f in band:
            if i >= bed:
                c = "#a9a9a9"
            elif i >= crest:
                c = jk.mix("#c4c4c4", "#e0e0e0", _clamp((f.calc_center_median().z) / 0.6))
            else:
                c = jk.mix(P.WHITE, "#e4e4e4", _smooth(1.0 - max(0.0, f.normal.z), 0.2, 0.7) * _clamp(f.calc_center_median().z / 0.2))
            c = jk.col(c)
            for loop in f.loops:
                loop[layer] = (c[0], c[1], c[2], 1.0)
    return piece


def block(r: float, turn: float = 0.0) -> jk.Piece:
    """An angular fallen block about 2r across, centred on the origin."""
    piece = hull([(-1, -0.8, -0.7), (1, -0.7, -0.7), (0.9, 0.8, -0.7), (-0.9, 0.9, -0.7), (-0.75, -0.6, 0.55),
                  (0.8, -0.5, 0.7), (0.65, 0.6, 0.6), (-0.7, 0.65, 0.45)])
    return paint(piece.scale(r).rot(z=turn), lambda f, c: "#f2f2f2" if f.normal.z > 0.6 else "#cdcdcd")


def boulders(a, land: jk.Piece, rocks):
    """Ejecta blocks (x, y, radius, turn) resting on `land`, partly sunk."""
    height = ground(land)
    for x, y, r, turn in rocks:
        a.add(block(r, turn).move(x, y, height(x, y) + r * 0.2)).part("tint")


@asset("crater-s", tint="#9a9a9a", budget=300, note="small impact crater")
def crater_s(a):
    land = a.add(crater(1.5, 0.44, 14, 91, [
        (1.0, "skirt", 0), (0.9, "foot", 0), (0.74, "flank", 0.6), (0.6, "crest", 1.0), (0.5, "wall", 0.62),
        (0.37, "floor", 0.04), (0.2, "floor", 0.0),
    ])).part("tint")
    boulders(a, land, [(1.0, -0.66, 0.15, 25), (-0.9, 0.86, 0.11, 70)])


@asset("crater-l", tint="#9a9a9a", budget=450, note="large impact crater with a central peak and ejecta")
def crater_l(a):
    land = a.add(crater(2.82, 0.78, 16, 97, [
        (1.0, "skirt", 0), (0.92, "foot", 0), (0.8, "flank", 0.34), (0.69, "flank", 0.8), (0.63, "crest", 1.0),
        (0.58, "wall", 0.88), (0.5, "wall", 0.44), (0.45, "wall", 0.38), (0.37, "floor", 0.03), (0.2, "floor", 0.0),
    ], floor=0.06)).part("tint")
    peak = trim(crag((0.1, -0.05, 0.66), 0.5, [(0.0, 1.0), (0.45, 0.55)], 6, seed=99, ridge=0.14, flare=1.1), 0.0)
    a.add(paint(peak, lambda f, c: jk.mix("#b4b4b4", "#e8e8e8", _clamp(c.z / 0.6)))).part("tint")
    boulders(a, land, [(2.25, -1.0, 0.27, 20), (1.95, -1.55, 0.16, 65), (-2.2, 0.85, 0.23, -30), (-0.55, 2.35, 0.2, 110),
                       (-1.75, -1.6, 0.14, 40)])


# --------------------------------------------------------------------------------------------
# Dune
# --------------------------------------------------------------------------------------------
@asset("dune", tint="#d9b98a", budget=200, note="crescent dune with a sharp crest; the slip face looks to the front")
def dune(a):
    height, arc, sweep, stations = 0.9, 1.02, 104.0, 13
    rows = []
    for i in range(stations):
        t = -0.93 + 1.86 * i / (stations - 1)
        phi = math.radians(sweep) * t
        h = height * (1 - abs(t) ** 2.2) ** 0.8
        ox, oy = math.sin(phi), math.cos(phi)  # away from the arc's centre: upwind
        px, py = ox * arc, oy * arc
        wind = 0.24 + 1.22 * (h / height) ** 0.75
        slip = h * 0.8

        def at(d, z):
            return (px + ox * d, py + oy * d, z)

        rows.append([at(wind + 0.3, BASE), at(wind, 0.0), at(wind * 0.42, h * 0.66), at(0.0, h), at(-slip - 0.02, 0.0),
                     at(-slip - 0.17, BASE)])
    ys = [p[1] for row in rows for p in row]
    shift = -(min(ys) + max(ys)) / 2
    bm = bmesh.new()
    grid = [[bm.verts.new((p[0], p[1] + shift, p[2])) for p in row] for row in rows]
    lee = []
    for r0, r1 in zip(grid, grid[1:]):
        for k in range(len(r0) - 1):
            a0, b0, c0, d0 = r0[k], r1[k], r1[k + 1], r0[k + 1]
            if (a0.co - c0.co).length <= (b0.co - d0.co).length:
                made = [bm.faces.new((a0, b0, c0)), bm.faces.new((a0, c0, d0))]
            else:
                made = [bm.faces.new((a0, b0, d0)), bm.faces.new((b0, c0, d0))]
            if k >= 3:
                lee += made
    # Close each horn to a point on the skirt line.
    for row, t in ((grid[0], -1.0), (grid[-1], 1.0)):
        phi = math.radians(sweep) * t * 1.06
        tip = bm.verts.new((math.sin(phi) * (arc + 0.12), math.cos(phi) * (arc + 0.12) + shift, BASE))
        for k in range(len(row) - 1):
            made = bm.faces.new((row[k], row[k + 1], tip))
            if k >= 3:
                lee.append(made)
    bm.normal_update()
    down = [f for f in bm.faces if f.normal.z < 0]
    if down:
        bmesh.ops.reverse_faces(bm, faces=down)
    bm.normal_update()
    sand = jk.Piece(bm).flat()
    shaded = set(lee)
    layer = sand.layer
    for f in bm.faces:
        c = f.calc_center_median()
        tone = jk.mix(P.WHITE, "#c9c9c9", _clamp(c.z / 0.12)) if f in shaded else jk.mix(P.WHITE, "#f0f0f0", _clamp(c.z / 0.5))
        tone = jk.col(tone)
        for loop in f.loops:
            loop[layer] = (tone[0], tone[1], tone[2], 1.0)
    a.add(sand).part("tint")
