"""Landmarks of S7 Restoration, S8 Ouroboros, S9 Deus Ex Machina and S10 Out of Eden.

Each model replaces one code-drawn landmark and is authored at ten times its landmark size, with
the same origin and footprint, so the web app can scale it straight back into place. Landmarks are
one of a kind and are also shown alone in a close-up study. Matte surfaces are `base`, gleaming
steel and foil `metal`, glossy plating, crystal and water `glass`, and light `glow` (`lit` only
for window panes). Everything here is original interpretive artwork of the Project Janus
narratives: no form, count or dimension encodes a measured quantity.
"""

import math
import random

import bmesh
from mathutils import Matrix, Vector, noise

from kit import jk, parts
from kit import palette as P
from kit.jk import asset

TAU = math.tau


def _tally(a, label):
    """Debug aid: print the running triangle count when KIT_TALLY is set."""
    import os

    if os.environ.get("KIT_TALLY"):
        print(f"   {a.name:16s} {label:18s} {a.triangles:6d}")


# --------------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------------
def _frame(p0, p1, side=(1, 0, 0)):
    """A matrix carrying local z onto p0 -> p1 (local x stays near `side`), and the length."""
    p0, p1 = Vector(p0), Vector(p1)
    z = p1 - p0
    length = z.length
    z.normalize()
    s = Vector(side)
    x = s - z * s.dot(z)
    if x.length < 1e-4:
        s = Vector((0, 1, 0)) if abs(z.y) < 0.9 else Vector((0, 0, 1))
        x = s - z * s.dot(z)
    x.normalize()
    m = Matrix((x, z.cross(x), z)).transposed().to_4x4()
    m.translation = p0
    return m, length


def beam(a, p0, p1, w, d=None, bevel=0.0, side=(1, 0, 0), taper=1.0):
    """A box member from p0 to p1, `w` wide along `side` and `d` deep."""
    m, length = _frame(p0, p1, side)
    return a.box(w, w if d is None else d, length, bevel=bevel, taper=taper).apply(m)


def rod(a, p0, p1, r, sides=4, caps="flat"):
    return a.tube([p0, p1], r, sides, caps=caps)


def paint_by(piece, fn):
    """Colour every corner from its position: `fn(co) -> colour`."""
    for f in piece.bm.faces:
        for loop in f.loops:
            c = jk.col(fn(loop.vert.co))
            loop[piece.layer] = (c[0], c[1], c[2], 1.0)
    return piece


def ring_points(radius, count, turn=0.0, wobble=0.0, seed=0, sy=1.0, cx=0.0, cy=0.0):
    """A closed outline of `count` points, counter-clockwise, with a smooth organic wobble."""
    out = []
    for i in range(count):
        t = i / count * TAU + turn
        k = 1 + wobble * (math.cos(2 * t + seed * 1.7) * 0.55 + math.cos(3 * t + seed * 2.9) * 0.45)
        out.append((cx + math.cos(t) * radius * k, cy + math.sin(t) * radius * k * sy))
    return out


def band(a, r_out, r_in, w, sides=16):
    """A closed hoop of rectangular section about the z axis, from z = 0 to z = w."""
    verts, faces = [], []
    for i in range(sides):
        c, s = math.cos(i / sides * TAU), math.sin(i / sides * TAU)
        verts += [(c * r_in, s * r_in, 0), (c * r_out, s * r_out, 0), (c * r_out, s * r_out, w), (c * r_in, s * r_in, w)]
    for i in range(sides):
        p, q = i * 4, ((i + 1) % sides) * 4
        for k in range(4):
            k2 = (k + 1) % 4
            faces.append((p + k, q + k, q + k2, p + k2))
    return a.raw(verts, faces)


def sweep(a, pts, section, closed=False):
    """Sweep an upright cross-section of (side, up) offsets along a path: rows, rills, kerbs."""
    pts = [Vector(p) for p in pts]
    n, m = len(pts), len(section)
    verts, faces = [], []
    for i, p in enumerate(pts):
        prev = pts[i - 1] if (closed or i > 0) else p
        nxt = pts[(i + 1) % n] if (closed or i < n - 1) else p
        t = nxt - prev
        t.z = 0
        t = t.normalized() if t.length > 1e-9 else Vector((1, 0, 0))
        side = Vector((t.y, -t.x, 0))
        for s, u in section:
            q = p + side * s
            verts.append((q.x, q.y, q.z + u))
    for i in range(n if closed else n - 1):
        j = (i + 1) % n
        for k in range(m):
            k2 = (k + 1) % m
            faces.append((i * m + k, j * m + k, j * m + k2, i * m + k2))
    if not closed:
        faces.append(tuple(range(m - 1, -1, -1)))
        faces.append(tuple((n - 1) * m + k for k in range(m)))
    return a.raw(verts, faces)


SLAB = lambda w, h: [(-w / 2, 0), (w / 2, 0), (w / 2, h), (-w / 2, h)]  # noqa: E731


def ridge(a, pts, w, h):
    """A planted row: a tent of two slopes swept along a path, closed at both ends, no floor."""
    pts = [Vector(p) for p in pts]
    n = len(pts)
    bm = bmesh.new()
    rings = []
    for i, p in enumerate(pts):
        t = pts[min(n - 1, i + 1)] - pts[max(0, i - 1)]
        t.z = 0
        t.normalize()
        side = Vector((t.y, -t.x, 0)) * (w / 2)
        rings.append((bm.verts.new(p - side), bm.verts.new(p + Vector((0, 0, h))), bm.verts.new(p + side)))
    for (l0, t0, r0), (l1, t1, r1) in zip(rings, rings[1:]):
        bm.faces.new((l0, t0, t1, l1))
        bm.faces.new((t0, r0, r1, t1))
    ends = (bm.faces.new(rings[0]), pts[0] - pts[1]), (bm.faces.new(rings[-1]), pts[-1] - pts[-2])
    bm.normal_update()
    for f in bm.faces:
        if len(f.verts) == 4 and f.normal.z < 0:
            f.normal_flip()
    for f, away in ends:
        if f.normal.dot(away) < 0:
            f.normal_flip()
    bm.normal_update()
    return a.add(jk.Piece(bm)).flat()


def folded_dipole(a, centre, direction, half, rise, r, sides=4):
    """A folded dipole: a flattened loop of rod, `half` long each way along `direction`."""
    d, c, up = Vector(direction).normalized(), Vector(centre), Vector((0, 0, 1))
    pts = []
    for s in (1, -1):
        for k in range(4):
            ang = -math.pi / 2 + k / 3 * math.pi
            pts.append(c + d * s * (half - rise + math.cos(ang) * rise) + up * s * math.sin(ang) * rise)
    pts.append(pts[0])
    return a.tube(pts, r, sides, caps="none")


def along(piece, p0, p1):
    """Carry a piece built up the z axis onto the line p0 -> p1."""
    return piece.apply(_frame(p0, p1)[0])


def lumpy(piece, amount, seed, scale=1.0, floor=0.0, fade=0.5):
    """Heave a surface along its normals with smooth noise, fading to nothing at the ground."""
    piece.bm.normal_update()
    offset = Vector((seed * 12.9898, seed * 78.233, seed * 37.719))
    for v in piece.bm.verts:
        k = min(1.0, max(0.0, (v.co.z - floor) / fade))
        v.co += v.normal * noise.noise(v.co * scale + offset) * amount * k
    piece.bm.normal_update()
    return piece


def octagon(hw, hd, ch, cx=0.0, cy=0.0):
    """A chamfered rectangle outline, counter-clockwise from above."""
    return [
        (cx + hw - ch, cy - hd), (cx + hw, cy - hd + ch), (cx + hw, cy + hd - ch), (cx + hw - ch, cy + hd),
        (cx - hw + ch, cy + hd), (cx - hw, cy + hd - ch), (cx - hw, cy - hd + ch), (cx - hw + ch, cy - hd),
    ]


def faceted_column(sections):
    """A closed faceted shaft through octagonal sections of (z, half-width, half-depth, chamfer[, cx, cy])."""
    verts, faces = [], []
    for sec in sections:
        z = sec[0]
        verts += [(x, y, z) for x, y in octagon(*sec[1:])]
    for k in range(len(sections) - 1):
        for i in range(8):
            j = (i + 1) % 8
            faces.append((k * 8 + i, k * 8 + j, (k + 1) * 8 + j, (k + 1) * 8 + i))
    faces.append(tuple(range(7, -1, -1)))
    top = (len(sections) - 1) * 8
    faces.append(tuple(top + i for i in range(8)))
    return jk.raw(verts, faces)


def mound(a, outline_lo, outline_hi, h, cuts=1):
    """A closed earth mound between two outlines of equal length, fan-capped so it can be cut."""
    n = len(outline_lo)
    verts = [(x, y, 0.0) for x, y in outline_lo] + [(x, y, h) for x, y in outline_hi]
    cx = sum(p[0] for p in outline_hi) / n
    cy = sum(p[1] for p in outline_hi) / n
    bx = sum(p[0] for p in outline_lo) / n
    by = sum(p[1] for p in outline_lo) / n
    verts += [(cx, cy, h), (bx, by, 0.0)]
    faces = []
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
        faces.append((n + i, n + j, 2 * n))
        faces.append((j, i, 2 * n + 1))
    piece = a.raw(verts, faces)
    if cuts:
        piece.subdivide(cuts)
    return piece


# --------------------------------------------------------------------------------------------
# S7 · Restoration
# --------------------------------------------------------------------------------------------
@asset(
    "lm-radio-mast",
    tint="#ffffff",
    budget=4500,
    note="S7: a hand-built regional radio mast with its equipment hut. Origin at the hut; the mast stands at +x.",
)
def radio_mast(a):
    MX = 2.0  # mast axis; the hut sits on the origin, as the old landmark did
    half, z0, z1, bays = 0.3, 0.24, 7.2, 7
    bay = (z1 - z0) / bays
    wood_lo, wood_hi = jk.shade(P.OAK_WOOD, -0.18), P.PINE_WOOD
    steel = P.STEEL_DARK

    # ---- mast: four timber legs, timber girts, steel diagonals ---------------------------
    a.box(1.2, 1.2, 0.26, bevel=0.05, grounded=True).move(MX, 0, 0).color(P.STONE_DARK, P.STONE)
    corners = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    for sx, sy in corners:
        a.box(0.11, 0.11, z1 - z0, bevel=0.014).move(MX + sx * half, sy * half, z0).color(wood_lo, wood_hi)
        a.box(0.2, 0.2, 0.1, bevel=0).move(MX + sx * half, sy * half, z0).part("metal").color(steel)
    for face in range(4):
        (ax, ay), (bx, by) = corners[face], corners[(face + 1) % 4]
        pa = Vector((MX + ax * half, ay * half, 0))
        pb = Vector((MX + bx * half, by * half, 0))
        out = Vector(((ax + bx) / 2, (ay + by) / 2, 0)).normalized()
        for k in range(bays):
            lo, hi = z0 + k * bay, z0 + (k + 1) * bay
            beam(a, pa + Vector((0, 0, hi)), pb + Vector((0, 0, hi)), 0.07, 0.07, side=(0, 0, 1)).color(
                jk.shade(P.OAK_WOOD, -0.05)
            )
            p, q = (pa, pb) if (k + face) % 2 == 0 else (pb, pa)
            rod(a, p + out * 0.03 + Vector((0, 0, lo + 0.06)), q + out * 0.03 + Vector((0, 0, hi - 0.06)), 0.022).part(
                "metal"
            ).color(steel)
    # A mended leg: a splint of new pale timber between two steel bands.
    a.box(0.15, 0.15, 1.3, bevel=0.016).move(MX + half, -half, 2.05).color(jk.shade(P.BIRCH, -0.08), P.BIRCH)
    for z in (2.15, 3.15):
        a.box(0.2, 0.2, 0.1, bevel=0.015).move(MX + half, -half, z).part("metal").color(P.STEEL)

    # ---- crow's nest where the lower guys meet -------------------------------------------
    nest = z0 + 4 * bay
    a.box(1.2, 1.2, 0.07, bevel=0.015).move(MX, 0, nest).color(wood_lo, wood_hi)
    for sx, sy in corners:
        a.box(0.06, 0.06, 0.5, bevel=0).move(MX + sx * 0.55, sy * 0.55, nest + 0.06).color(wood_hi)
    for face in range(4):
        (ax, ay), (bx, by) = corners[face], corners[(face + 1) % 4]
        beam(a, (MX + ax * 0.55, ay * 0.55, nest + 0.53), (MX + bx * 0.55, by * 0.55, nest + 0.53), 0.05, 0.05, side=(0, 0, 1)).color(
            wood_hi
        )

    # ---- head: cap plate, steel topmast, three bays of crossed dipoles, the warm beacon ---
    a.box(0.84, 0.84, 0.09, bevel=0.02).move(MX, 0, z1).color(wood_lo, wood_hi)
    a.cyl(0.14, 0.2, 8, bevel=0.03).move(MX, 0, z1 + 0.08).part("metal").color(steel)
    tip = z1 + 2.55
    a.cyl(0.06, tip - z1, 6, bevel=0.01).move(MX, 0, z1 + 0.08).part("metal").color(P.STEEL)
    for k, z in enumerate((z1 + 0.72, z1 + 1.36, z1 + 2.0)):
        a.cyl(0.13, 0.16, 6, bevel=0).move(MX, 0, z - 0.08).color(P.CHARCOAL)
        for ang in (45, 135):
            d = (math.cos(math.radians(ang)), math.sin(math.radians(ang)), 0)
            folded_dipole(a, (MX, 0, z), d, 0.82 - k * 0.06, 0.075, 0.03).part("metal").color(P.COPPER)
    a.tube([(MX + 0.08, -0.08, z1 + 2.0), (MX + 0.08, -0.08, z1 + 0.3), (MX + half + 0.07, -half, z1 - 0.2), (MX + half + 0.07, -half, 1.9), (MX + half - 0.1, -half - 0.02, 1.55)], 0.024, 4).color(P.INK)
    a.cyl(0.2, 0.07, 8, bevel=0.015).move(MX, 0, tip + 0.06).part("metal").color(steel)
    a.capsule(0.16, 0.42, 8, 3).move(MX, 0, tip + 0.12).part("glow").color("#ff8a4a")
    a.cyl(0.2, 0.04, 8, bevel=0.01).move(MX, 0, tip + 0.52).part("metal").color(steel)
    a.cone(0.03, 0.2, 5).move(MX, 0, tip + 0.55).part("metal").color(P.STEEL)

    # ---- guys: two levels to three anchors, with turnbuckles -----------------------------
    anchors = [((5.84, 0.0), (MX + half, 0.0)), ((-0.9, -0.86), (MX - half, -half)), ((-0.9, 0.86), (MX - half, half))]
    for (gx, gy), (tx, ty) in anchors:
        a.box(0.34, 0.3, 0.2, bevel=0.04, grounded=True).move(gx, gy, 0).color(P.STONE_DARK, P.STONE)
        eye = Vector((gx, gy, 0.26))
        a.box(0.07, 0.07, 0.1, bevel=0).move(gx, gy, 0.19).part("metal").color(steel)
        for z in (nest + 0.02, z1 + 0.02):
            top = Vector((tx, ty, z))
            rod(a, eye, top, 0.017, 4, caps="none").part("metal").color(P.STEEL)
            d = (top - eye).normalized()
            rod(a, eye + d * 0.34, eye + d * 0.62, 0.04, 4).part("metal").color(steel)

    # ---- equipment hut -------------------------------------------------------------------
    hx, w, d, plinth, wall = -0.05, 2.0, 1.4, 0.14, 1.3
    top, rise = plinth + wall, 0.62
    a.box(w + 0.14, d + 0.14, plinth + 0.02, bevel=0.03, grounded=True).move(hx, 0, 0).color(P.STONE_DARK, P.STONE)
    a.box(w, d, wall, bevel=0.03).move(hx, 0, plinth).color(jk.shade(P.PLASTER, -0.08), P.CREAM)
    for side in (-1, 1):
        a.add(parts.gable_wall(d, rise, 0.06)).rot(z=90 * side).move(hx + side * (w / 2 - 0.03), 0, top).color(P.CREAM)
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box(0.1, 0.1, wall, bevel=0).move(hx + sx * (w / 2 - 0.02), sy * (d / 2 - 0.02), plinth).color(wood_lo, P.OAK_WOOD)
    roof = "#8a6a4a"
    parts.gable_roof(a, w, d, rise, overhang=0.13, thick=0.09, color=roof).move(hx, 0, top)
    # A patch of new shingles on the front slope.
    slope = math.degrees(math.atan2(rise, d / 2))
    a.box(0.5, 0.36, 0.03, bevel=0.008).rot(x=slope).move(hx + 0.52, -0.42, top + 0.25).color(jk.shade(P.PINE_WOOD, 0.1))
    parts.door(a, 0.44, 0.92, leaf=P.TERRACOTTA, trim=P.OFF_WHITE, light=True).move(hx + 0.46, -d / 2, plinth)
    parts.window(a, 0.42, 0.46, shutters=P.OAK_WOOD).move(hx - 0.46, -d / 2, plinth + 0.5)
    parts.window(a, 0.4, 0.44).rot(z=180).move(hx, d / 2, plinth + 0.52)
    # Stovepipe with a rain cap.
    a.cyl(0.06, 0.75, 6, bevel=0.01).move(hx + 0.6, 0.34, top + 0.2).part("metal").color(steel)
    a.cone(0.12, 0.1, 6).move(hx + 0.6, 0.34, top + 0.99).part("metal").color(steel)
    # Feed box on the gable that faces the mast, with two porcelain insulators.
    gx = hx + w / 2
    a.box(0.1, 0.34, 0.4, bevel=0.02).move(gx + 0.05, 0.12, plinth + 0.72).color(jk.shade(P.SAGE, -0.3), jk.shade(P.SAGE, -0.1))
    for y in (0.04, 0.2):
        a.cyl(0.035, 0.1, 5, bevel=0).move(gx + 0.05, y, plinth + 1.12).color(P.OFF_WHITE)
    a.tube([(gx + 0.05, 0.12, plinth + 1.2), (1.3, -0.1, 1.42), (MX - half + 0.02, -half, 1.56)], 0.022, 4).color(P.INK)
    # Rain barrel and a bench: somebody works here.
    a.lathe([(0.17, 0), (0.21, 0.2), (0.21, 0.36), (0.17, 0.56), (0.13, 0.56)], 8).move(hx - 0.8, d / 2 + 0.24, 0).color(
        jk.shade(P.WALNUT, -0.1), P.OAK_WOOD
    )
    a.box(0.62, 0.2, 0.05, bevel=0.012).move(hx - 0.46, -d / 2 - 0.2, 0.3).color(P.OAK_WOOD)
    for sx in (-1, 1):
        a.box(0.05, 0.16, 0.3, bevel=0).move(hx - 0.46 + sx * 0.24, -d / 2 - 0.2, 0).color(wood_lo)

    # ---- wind charger on the ridge -------------------------------------------------------
    wx, ridge = hx - 0.58, top + rise
    hub = ridge + 1.18
    for sx, sy in ((-0.26, 0.0), (0.26, 0.0), (0.0, 0.22), (0.0, -0.22)):
        foot_z = ridge - 0.04 if sy == 0 else ridge - 0.2
        rod(a, (wx + sx, sy, foot_z), (wx, 0, hub - 0.16), 0.022).part("metal").color(steel)
    a.box(0.16, 0.16, 0.05, bevel=0.012).move(wx, 0, hub - 0.2).part("metal").color(steel)
    a.capsule(0.085, 0.4, 8, 2).rot(x=90).move(wx, 0.2, hub).color(jk.shade(P.TERRACOTTA, -0.1), P.TERRACOTTA)
    a.cyl(0.06, 0.07, 6, bevel=0.012).rot(x=90).move(wx, -0.2, hub).part("metal").color(P.STEEL)
    for k in range(3):
        a.box(0.11, 0.03, 0.56, bevel=0.008, taper=(0.45, 1)).rot(z=14).rot(y=k * 120 + 20).move(wx, -0.25, hub).color(
            jk.shade(P.BIRCH, -0.1), P.BIRCH
        )
    rod(a, (wx, 0.2, hub), (wx, 0.62, hub), 0.018).part("metal").color(steel)
    a.profile_x([(0.5, 0.0), (0.84, -0.17), (0.84, 0.17)], 0.03, bevel=0.006).move(wx, 0, hub).color(P.TERRACOTTA)


# ---- terraces --------------------------------------------------------------------------------
# Five contour levels of one hillside: (radius, centre x, centre y). The summit sits toward the
# back, so the terraces open to the front like an amphitheatre.
T_LEVELS = [(4.85, 0.0, 0.0), (3.95, 0.08, 0.38), (3.05, 0.12, 0.76), (2.15, 0.08, 1.12), (1.3, 0.0, 1.42)]
T_STEP = 0.38


def _contour(i, t):
    r, cx, cy = T_LEVELS[i]
    k = 1 + 0.028 * (math.cos(2 * t + i * 1.7) * 0.55 + math.cos(3 * t + i * 2.9) * 0.45)
    return Vector((cx + math.cos(t) * r * k, cy + math.sin(t) * r * k * 0.97, 0.0))


def _turn(t0, t1):
    """The signed angle from t1 to t0, wrapped to (-pi, pi]."""
    return (t0 - t1 + math.pi) % TAU - math.pi


def fruit_tree(a, x, y, z, h=1.25, seed=1, fruit=P.RED):
    """A small orchard tree with a few bright fruit."""
    rnd = random.Random(seed)
    with a.group() as g:
        parts.trunk(a, h * 0.52, h * 0.06, lean=0.05 * h, flare=1.4)
        r = h * 0.36
        lumps = [(0.04 * h, 0, h * 0.7, r, 0.86, 2), (r * 0.62, 0.1 * h, h * 0.58, r * 0.66, 0.85, 1), (-r * 0.5, -0.1 * h, h * 0.6, r * 0.66, 0.85, 1)]
        parts.canopy(a, lumps, seed=seed, part="base", low="#3d7a3a", high="#77b552")
        for k in range(3):
            ang, lift = k * 2.1 + rnd.random(), rnd.uniform(-0.25, 0.35)
            a.blob(h * 0.055, 1, lumps=0).move(0.04 * h + math.cos(ang) * r * 0.93, math.sin(ang) * r * 0.93, h * 0.7 + lift * r).color(fruit)
    g.rot(z=seed * 77).move(x, y, z)
    return g


def tool_shed(a):
    """A timber shed with a mono-pitch roof, built at the origin and facing -y."""
    wood_lo, wood_hi = jk.shade(P.OAK_WOOD, -0.2), P.PINE_WOOD
    with a.group() as g:
        w, d, wall = 1.05, 0.8, 0.98
        a.box(w + 0.14, d + 0.14, 0.07, bevel=0.02, grounded=True).color(P.STONE_DARK, P.STONE)
        a.box(w, d, wall, bevel=0.02).move(0, 0, 0.06).color(wood_lo, wood_hi)
        a.profile_x([(-d / 2, wall), (d / 2, wall), (d / 2, wall + 0.26)], w, bevel=0).move(0, 0, 0.06).color(wood_hi)
        for sx in (-1, 1):
            for sy in (-1, 1):
                a.box(0.08, 0.08, wall, bevel=0).move(sx * (w / 2 - 0.01), sy * (d / 2 - 0.01), 0.06).color(wood_lo)
        e = 0.14
        a.profile_x(
            [(-d / 2 - e, wall - 0.02), (d / 2 + e, wall + 0.34), (d / 2 + e, wall + 0.43), (-d / 2 - e, wall + 0.07)], w + 0.26, bevel=0.02
        ).move(0, 0, 0.06).color(jk.shade(P.TERRACOTTA, -0.12), jk.shade(P.TERRACOTTA, 0.08))
        # A plank door on strap hinges.
        a.add(parts.frame(0.36, 0.76, 0.05, 0.05, 0.035)).move(0.22, -d / 2, 0.02).color(P.BIRCH)
        a.box(0.36, 0.02, 0.76, bevel=0).move(0.22, -d / 2 - 0.022, 0.07).color(jk.shade(P.WALNUT, -0.1), P.WALNUT)
        for z in (0.24, 0.66):
            a.box(0.3, 0.012, 0.035, bevel=0).move(0.2, -d / 2 - 0.04, z).part("metal").color(P.STEEL_DARK)
        a.box(0.03, 0.03, 0.09, bevel=0).move(0.35, -d / 2 - 0.05, 0.42).part("metal").color(P.BRASS)
        parts.window(a, 0.24, 0.24, trim=P.BIRCH, mullion="bar", sill=False).move(-0.26, -d / 2, 0.52)
        # A shuttered hatch at the back.
        a.add(parts.frame(0.3, 0.3, 0.04, 0.04, 0.03)).rot(z=180).move(-0.1, d / 2, 0.5).color(P.BIRCH)
        a.box(0.3, 0.02, 0.3, bevel=0).move(-0.1, d / 2 + 0.015, 0.54).color(jk.shade(P.WALNUT, -0.1), P.WALNUT)
        # A spade and a rake lean on the side wall; a basket of the day's picking by the door.
        x = -w / 2 - 0.07
        a.tube([(x - 0.08, -0.1, 0.06), (x, -0.08, 0.92)], 0.02, 4).color(P.PINE_WOOD)
        a.box(0.04, 0.16, 0.2, bevel=0.01).move(x - 0.09, -0.1, 0.02).part("metal").color(P.STEEL_DARK)
        a.tube([(x - 0.1, 0.16, 0.06), (x, 0.18, 1.0)], 0.02, 4).color(P.PINE_WOOD)
        a.box(0.04, 0.3, 0.05, bevel=0).move(x - 0.11, 0.16, 0.04).part("metal").color(P.STEEL_DARK)
        a.lathe([(0.1, 0), (0.15, 0.16), (0.12, 0.16)], 8).move(-0.2, -d / 2 - 0.2, 0.0).color(P.THATCH, P.STRAW)
        a.blob(0.1, 1, (1, 1, 0.6), lumps=0.1, seed=3).move(-0.2, -d / 2 - 0.2, 0.17).color(P.ORANGE)
    return g


@asset(
    "lm-terraces",
    tint="#ffffff",
    budget=4500,
    note="S7: a hillside of farmed terraces. Dry-stone walls, rows of four crops, a stepped irrigation channel.",
)
def terraces(a):
    stone_lo, stone_hi = "#7d7163", "#b9ad98"
    soil, grass, water = "#a58462", "#86b35c", "#5fb4d6"
    tops = [(i + 1) * T_STEP for i in range(5)]
    t_stairs, t_chan = math.radians(-106), math.radians(-66)

    # ---- the hill: five dry-stone retaining walls ---------------------------------------
    for i in range(5):
        pts = [_contour(i, k / 22 * TAU) for k in range(22)]
        level = a.prism([(p.x, p.y) for p in pts], tops[i], bevel=0.06, grounded=True)
        lo = tops[i] - T_STEP
        paint_by(level, lambda co, lo=lo: jk.mix(stone_lo, stone_hi, max(0.0, min(1.0, (co.z - lo) / T_STEP))))
        level.paint(lambda f, i=i: (grass if i == 4 else soil) if f.normal.z > 0.9 else None)
    _tally(a, "levels")
    # Face stones standing proud of the walls: the masonry is laid dry.
    rnd = random.Random(7)
    for i in range(4):
        for k in range(5 - i):
            t = math.radians(-90 + (k - (4 - i) / 2) * (34 + i * 6) + rnd.uniform(-8, 8))
            p = _contour(i, t)
            a.box(rnd.uniform(0.26, 0.4), 0.1, rnd.uniform(0.1, 0.15), bevel=0).rot(z=math.degrees(t) + 90).move(
                p.x, p.y, tops[i] - T_STEP + rnd.uniform(0.05, 0.2)
            ).color(jk.mix(stone_lo, stone_hi, rnd.uniform(0.3, 0.75)))

    def band(i, t, d):
        """A point on terrace i, `d` in from its outer edge, and the terrace width there."""
        p, q = _contour(i, t), _contour(i + 1, t)
        w = (q - p).length
        return p.lerp(q, d / w) + Vector((0, 0, tops[i])), w

    def runs(i, where, gaps, step=18.0):
        """Stretches of terrace i, as lists of angles, where `where(width)` holds clear of `gaps`."""
        r = T_LEVELS[i][0]
        fine = [math.radians(-270 + k * 2.0) for k in range(181)]
        ok = [where(band(i, t, 0.1)[1]) and all(abs(_turn(t, g)) * r > clear for g, clear in gaps) for t in fine]
        out, start = [], None
        for k, good in enumerate(ok + [False]):
            if good and start is None:
                start = k
            elif not good and start is not None:
                t0, t1 = fine[start], fine[k - 1]
                if (t1 - t0) * r > 0.5:
                    n = max(1, round(math.degrees(t1 - t0) / step))
                    out.append([t0 + (t1 - t0) * j / n for j in range(n + 1)])
                start = None
        return out

    _tally(a, "stones")
    # ---- planted rows: a different crop on every terrace --------------------------------
    for i in range(4):
        gaps = [(t_stairs, 0.4), (t_chan, 0.74 if i == 0 else 0.32)]
        for k, d in enumerate((0.2, 0.46, 0.72)):
            for run in runs(i, lambda w, d=d, k=k: w - d >= (0.24 if k == 0 else 0.3), gaps):
                path = [band(i, t, d)[0] for t in run]
                if i == 0:  # leafy greens
                    ridge(a, path, 0.24, 0.17).color("#5f9a38", "#a9d65c")
                elif i == 1:  # ripening grain
                    ridge(a, path, 0.24, 0.27).color("#cfa742", "#f4dc7e")
                elif i == 2 and k == 0:  # a pumpkin patch along the sunny edge
                    ridge(a, path, 0.3, 0.07).color("#4d8a3c")
                    count = max(1, round((run[-1] - run[0]) * T_LEVELS[i][0] / 0.62))
                    for n in range(count + 1):
                        p = band(i, run[0] + (run[-1] - run[0]) * n / count, d)[0]
                        a.blob(0.13, 1, (1, 1, 0.78), lumps=0.06, seed=n + 3).move(p.x, p.y, p.z + 0.1).color("#d9762a", P.ORANGE)
                elif i == 2:  # dark bush rows
                    ridge(a, path, 0.27, 0.22).color(P.LEAF_DEEP, "#4f9a48")
                else:  # beans on poles
                    ridge(a, path, 0.2, 0.3).color("#4a8a3e", "#8cc25a")
                    for p in path[::2]:
                        a.tube([(p.x, p.y, p.z), (p.x, p.y, p.z + 0.52)], 0.016, 3).color(P.BIRCH)

    _tally(a, "rows")
    # ---- irrigation: a cistern on the summit, a stepped channel, a rill on every terrace -
    out = Vector((math.cos(t_chan), math.sin(t_chan), 0))
    centre = Vector((T_LEVELS[4][1], T_LEVELS[4][2], 0))
    cistern = _contour(4, t_chan).lerp(centre, 0.45) + Vector((0, 0, tops[4]))
    a.lathe([(0.4, 0), (0.4, 0.27), (0.35, 0.32), (0.27, 0.32), (0.27, 0.2)], 10, cap_bottom=False, cap_top=False).move(*cistern).color(stone_lo, stone_hi)
    a.cyl(0.28, 0.25, 10, bevel=0).move(*cistern).part("glass").color(water)
    pond = band(0, t_chan, band(0, t_chan, 0.1)[1] * 0.42)[0]
    for i in range(4, -1, -1):
        start = cistern + out * 0.3 if i == 4 else _contour(i + 1, t_chan) + Vector((0, 0, tops[i])) - out * 0.04
        end = pond if i == 0 else _contour(i, t_chan) + Vector((0, 0, tops[i])) + out * 0.1
        sweep(a, [start, end], SLAB(0.3, 0.07)).color(stone_hi)
        sweep(a, [start + out * 0.02, end - out * 0.02], SLAB(0.15, 0.085)).part("glass").color(water)
        if i:
            fall = _contour(i, t_chan) + out * 0.085
            a.box(0.15, 0.04, T_STEP - 0.04, bevel=0).rot(z=math.degrees(t_chan) + 90).move(fall.x, fall.y, tops[i - 1] + 0.04).part(
                "glass"
            ).color(water, "#a8dcee")
    a.lathe([(0.46, 0), (0.46, 0.07), (0.42, 0.1), (0.3, 0.1), (0.3, 0.02)], 10, cap_bottom=False, cap_top=False).move(*pond).color(stone_lo, stone_hi)
    a.cyl(0.31, 0.07, 10, bevel=0).move(*pond).part("glass").color(water)
    for i in range(4):
        for run in runs(i, lambda w: w >= 0.76, [(t_stairs, 0.4)], step=28.0):
            path = [band(i, t, band(i, t, 0.1)[1] - 0.15)[0] for t in run]
            sweep(a, path, SLAB(0.11, 0.03)).part("glass").color(water)

    _tally(a, "irrigation")
    # ---- stone steps from terrace to terrace --------------------------------------------
    s = T_STEP / 3
    for i in range(1, 5):
        p = _contour(i, t_stairs)
        a.profile_x(
            [(0.03, 0), (0.03, 3 * s), (-0.15, 3 * s), (-0.15, 2 * s), (-0.3, 2 * s), (-0.3, s), (-0.45, s), (-0.45, 0)], 0.5, bevel=0
        ).rot(z=math.degrees(t_stairs) + 90).move(p.x, p.y, tops[i - 1]).color(stone_hi)

    _tally(a, "steps")
    # ---- the summit: tool shed and orchard ----------------------------------------------
    tool_shed(a).move(-0.34, 1.62, tops[4])
    _tally(a, "shed")
    fruit_tree(a, 0.74, 1.78, tops[4], 1.28, seed=2)
    for i, t, h, seed, fruit in ((3, 150, 1.1, 5, P.ORANGE), (2, 28, 1.2, 4, P.RED), (1, 122, 1.15, 9, P.RED)):
        p, w = band(i, math.radians(t), 0.1)
        p = band(i, math.radians(t), w * 0.5)[0]
        fruit_tree(a, p.x, p.y, p.z, h, seed=seed, fruit=fruit)


# --------------------------------------------------------------------------------------------
# S8 · Ouroboros
# --------------------------------------------------------------------------------------------
@asset(
    "lm-silent-core",
    tint="#ffffff",
    budget=4500,
    grounded=True,
    note="S8: the silenced machine core. A split dark monolith half-sunk in scorched ground, dead cable trunks, one ember.",
)
def silent_core(a):
    iron_lo, iron_hi = "#221f28", "#3b3746"
    dead = "#15131a"

    # ---- scorched ground heaved into a lip around the sunken machine ---------------------
    ground = a.lathe([(5.25, 0.0), (5.05, 0.15), (3.75, 0.2), (3.05, 0.42), (2.4, 0.8), (1.95, 0.72), (1.5, 0.2)], 18, cap_bottom=False)
    lumpy(ground, 0.16, 5, 0.75, fade=0.3).flat()
    paint_by(ground, lambda co: jk.mix("#1a181c", "#4d4039", max(0.0, min(1.0, (math.hypot(co.x, co.y) - 2.2) / 3.0))))
    ground.move(0.15, 0, 0)

    # ---- the monolith: an obelisk of faceted plate, cracked through and sheared ----------
    tilt = Matrix.Rotation(math.radians(6.0), 4, "Y") @ Matrix.Rotation(math.radians(-3.0), 4, "X")
    shaft = [(-0.8, 1.75, 1.45, 0.62), (2.4, 1.68, 1.38, 0.6), (6.3, 1.42, 1.15, 0.5), (8.6, 1.0, 0.82, 0.36, -0.06, 0.0), (9.5, 0.62, 0.5, 0.22, -0.1, 0.0)]

    def section(z):
        """Half-width and half-depth of the shaft at height z."""
        for lo, hi in zip(shaft, shaft[1:]):
            if z <= hi[0]:
                t = (z - lo[0]) / (hi[0] - lo[0])
                return lo[1] + (hi[1] - lo[1]) * t, lo[2] + (hi[2] - lo[2]) * t
        return shaft[-1][1], shaft[-1][2]

    def wound():
        """The cutter: a jagged crack from the crown down to the heart, and the fallen right shoulder."""
        outline = [
            (0.12, 1.5), (0.27, 2.2), (0.46, 3.1), (0.43, 4.0), (0.19, 5.4), (0.59, 6.9), (0.55, 7.4), (1.0, 7.85), (1.45, 7.25),
            (2.1, 7.6), (2.8, 7.3), (2.8, 10.8), (-0.32, 10.8), (-0.27, 8.3), (0.09, 6.9), (-0.15, 5.4), (0.17, 4.0), (-0.28, 3.1), (0.13, 2.2),
        ]
        cutter = jk.profile_y(outline, 6.0, bevel=0)
        return paint_by(cutter, lambda co: jk.mix("#0b090c", "#4a1a0a", max(0.0, 1.0 - abs(co.z - 3.1) / 1.1)))

    with a.group() as body:
        mono = a.add(faceted_column(shaft)).part("metal").color(iron_lo, iron_hi)
        mono.cut(wound()).bevel(0.04).flat()
        # Segment collars and three dead status bars, all broken by the crack.
        for z in (2.5, 6.25):
            hw, hd = section(z + 0.1)
            a.add(faceted_column([(z, hw + 0.05, hd + 0.05, 0.6), (z + 0.2, hw + 0.05, hd + 0.05, 0.6)])).part("metal").color(dead).cut(wound()).flat()
        for z in (4.55, 5.0, 5.45):
            hw, hd = section(z)
            a.box(1.9, 0.12, 0.17, bevel=0).move(-0.05, -hd - 0.01, z).part("glass").color("#0d0c13").cut(wound())
        # Dead cooling louvres on the right flank; cable ports around the foot.
        for k in range(4):
            hw, hd = section(3.3 + k * 0.34)
            a.box(0.1, 1.3, 0.12, bevel=0).rot(y=-18).move(hw - 0.02, 0, 3.3 + k * 0.34).part("metal").color(dead)
        # The single ember, deep in the wound.
        a.blob(0.19, 1, (0.8, 0.8, 1.35), lumps=0.1, seed=4).move(0.09, -section(3.1)[1] + 0.34, 3.1).part("glow").color("#d8501f", "#ff8a3a")
    body.apply(tilt)

    # ---- dead cable trunks radiate from ports at the foot ---------------------------------
    for k in range(6):
        ang = math.radians(50 + k * 60)
        c, sn = math.cos(ang), math.sin(ang)
        hw, hd = section(1.0)
        reach = min(hw / max(abs(c), 1e-6), hd / max(abs(sn), 1e-6)) * 0.94
        port = tilt @ Vector((c * reach, sn * reach, 1.05))
        with a.group() as socket:
            a.box(0.78, 0.5, 0.66, bevel=0.07).move(0, -0.25, -0.33).part("metal").color(dead, iron_lo)
        socket.rot(z=math.degrees(ang) + 90).apply(Matrix.Translation(port))
        side = Vector((-sn, c, 0))
        wig = 0.35 * (1 if k % 2 else -1)
        path = [
            port,
            Vector((c * 2.45, sn * 2.45, 1.02)) + side * wig * 0.3,
            Vector((c * 3.2, sn * 3.2, 0.52)) + side * wig,
            Vector((c * 4.05, sn * 4.05, 0.3)) + side * wig * 0.4,
            Vector((c * 4.85, sn * 4.85, 0.1)) - side * wig * 0.5,
        ]
        if k == 4:  # one trunk is severed: its end lifts, frayed
            path[-1] = Vector((c * 4.5, sn * 4.5, 0.75)) - side * wig * 0.4
        a.tube(path, [0.25, 0.25, 0.23, 0.22, 0.17 if k != 4 else 0.2], 6).color("#141216", "#2a262c")
        for i in (1, 3):
            d = (path[i + 1] - path[i - 1]).normalized()
            along(a.cyl(0.31, 0.24, 7, bevel=0), path[i] - d * 0.12, path[i] + d * 0.12).part("metal").color(iron_hi)
        if k == 4:
            tip, d = path[-1], (path[-1] - path[-2]).normalized()
            for j in range(3):
                bend = Vector((math.cos(j * 2.1), math.sin(j * 2.1), 0.5)) * 0.2
                a.tube([tip, tip + d * 0.22 + bend * 0.4, tip + d * 0.36 + bend], 0.035, 3).part("metal").color(P.COPPER)

    # ---- the broken containment ring: six leaning pylons ----------------------------------
    for k, (height, broken) in enumerate(((3.5, False), (2.3, False), (1.5, True), (3.1, False), (2.6, False), (1.2, True))):
        ang = 20 + k * 60
        with a.group() as pylon:
            shard = a.box(0.66, 0.52, height + 0.5, bevel=0.05, taper=0.42).move(0, 0, -0.5)
            cant = (0.9 if broken else 0.5) * (1 if k % 2 else -1)
            shard.warp(lambda co, h=height, cant=cant: (co.x, co.y, co.z + (co.x * cant if co.z > h * 0.8 else 0.0)))
            shard.part("metal").color(iron_lo, iron_hi).flat()
            a.box(0.8, 0.64, 0.3, bevel=0.05).move(0, 0, 0.12).part("metal").color(dead)
        pylon.rot(y=20).rot(z=ang).move(math.cos(math.radians(ang)) * 3.72 + 0.1, math.sin(math.radians(ang)) * 3.72, 0.1)
    # The fallen shoulder of the monolith lies where it dropped.
    a.add(faceted_column([(0, 0.62, 0.5, 0.2), (0.9, 0.5, 0.42, 0.16), (1.25, 0.2, 0.3, 0.1)])).bevel(0.03).rot(x=74, z=20).move(2.75, -1.35, 0.72).part("metal").color(
        iron_lo, iron_hi
    ).flat()


@asset(
    "lm-bunker",
    tint="#ffffff",
    budget=4500,
    note="S8: an elite bunker entrance in a berm. Blast door, wing walls, vent stacks, guard post, camera mast, retaining wall.",
)
def bunker(a):
    conc_lo, conc_hi = P.CONCRETE_DARK, P.CONCRETE
    steel = P.STEEL_DARK
    earth_lo, earth_hi, turf = "#5f5650", "#7a6f64", "#8a8462"

    # ---- the berm, cut open for the entrance and for a service yard ----------------------
    berm = mound(a, octagon(4.4, 3.75, 1.5), octagon(2.9, 1.9, 0.9, 0.0, 0.45), 2.3)
    lumpy(berm, 0.14, 3, 0.6, fade=0.5)
    berm.color(earth_lo, earth_hi)
    trench = jk.prism([(-2.62, -4.4), (2.62, -4.4), (1.6, -0.55), (-1.6, -0.55)], 6, bevel=0).move(0, 0, -1).color(earth_lo)
    yard = jk.box(3.0, 3.2, 6, bevel=0).move(4.8, 0.3, -1).color(earth_lo)
    berm.cut(trench).cut(yard).flat()
    berm.paint(lambda f: turf if f.normal.z > 0.82 and f.calc_center_median().z > 0.3 else None)

    # ---- portal: jambs, a chamfered header, the recessed blast door ----------------------
    for sx in (-1, 1):
        a.box(0.7, 1.0, 2.02, bevel=0.05, grounded=True).move(sx * 1.35, -1.05, 0).color(conc_lo, conc_hi)
    a.profile_x([(-1.62, 2.0), (-0.5, 2.0), (-0.5, 2.72), (-1.22, 2.72), (-1.62, 2.4)], 3.7, bevel=0.05).color(conc_lo, conc_hi)
    a.box(2.1, 0.2, 2.0, bevel=0).move(0, -0.62, 0).color(jk.shade(conc_lo, -0.25))
    a.box(2.02, 0.16, 1.9, bevel=0.03).move(0, -0.8, 0.04).part("metal").color(P.GUNMETAL, steel)
    for z in (0.34, 0.95, 1.56):
        a.box(1.9, 0.06, 0.1, bevel=0.015).move(0, -0.9, z).part("metal").color(steel, P.STEEL)
    a.box(0.05, 0.05, 1.86, bevel=0).move(0, -0.9, 0.06).color(P.INK)
    a.torus(0.25, 0.04, 10, 4).rot(x=90).move(-0.45, -0.99, 1.0).part("metal").color(P.STEEL)
    a.cyl(0.07, 0.12, 6, bevel=0.015).rot(x=90).move(-0.45, -0.9, 1.0).part("metal").color(P.STEEL)
    for k in range(3):
        a.box(0.5, 0.03, 0.04, bevel=0).rot(y=k * 60).move(-0.45, -0.985, 1.0).part("metal").color(P.STEEL)
    for z in (0.3, 0.95, 1.6):
        a.box(0.12, 0.1, 0.22, bevel=0.02).move(0.98, -0.9, z).part("metal").color(P.GUNMETAL)
    a.box(1.5, 0.04, 0.1, bevel=0).move(0, -1.56, 1.86).color(P.AMBER)
    # The one dim light: a caged lamp under the brow.
    a.box(0.66, 0.1, 0.2, bevel=0.03).move(0, -1.62, 2.1).color(P.CHARCOAL)
    a.box(0.52, 0.06, 0.1, bevel=0.02).move(0, -1.67, 2.15).part("glow").color("#ffcf7a")

    # ---- angled wing walls hold the cut; an apron with bollards and a drain ---------------
    for sx in (-1, 1):
        p0, p1 = Vector((sx * 1.86, -1.5, 0)), Vector((sx * 2.55, -4.12, 0))
        length = (p1 - p0).length
        d = (p1 - p0).normalized()
        turn = math.degrees(math.atan2(-d.x, d.y))
        a.profile_x([(0, 0), (length, 0), (length, 0.78), (0, 2.5)], 0.4, bevel=0.04).rot(z=turn).move(p0.x, p0.y, 0).color(conc_lo, conc_hi)
        beam(a, p0 + Vector((0, 0, 2.47)) - d * 0.06, p1 + Vector((0, 0, 0.75)) + d * 0.08, 0.52, 0.1, bevel=0.025).color(conc_hi, "#cfcdc6")
        a.box(0.5, 0.5, 0.9, bevel=0.05, grounded=True).rot(z=turn).move(p1.x, p1.y, 0).color(conc_lo, conc_hi)
    a.prism([(-2.5, -4.25), (2.5, -4.25), (1.62, -0.6), (-1.62, -0.6)], 0.07, bevel=0.02, grounded=True).color("#7b7d82", "#8f9196")
    a.box(1.9, 0.14, 0.02, bevel=0).move(0, -1.9, 0.06).color(P.INK)
    for sx in (-1, 1):
        a.cyl(0.13, 0.55, 8, bevel=0.03, grounded=True).move(sx * 0.95, -3.7, 0.06).color(P.CHARCOAL)
        a.cyl(0.135, 0.1, 8, bevel=0).move(sx * 0.95, -3.7, 0.42).color(P.AMBER)

    # ---- service yard: soldier piles, timber lagging, a waler, and the main vent stack ----
    wx = 3.34
    for k in range(5):
        y = -1.25 + k * 0.78
        a.box(0.2, 0.18, 2.05, bevel=0.02).move(wx, y, 0).color(jk.shade(P.RUST, -0.25), P.RUST)
        if k < 4:
            for j in range(3):
                a.box(0.08, 0.62, 0.5, bevel=0).move(wx - 0.05, y + 0.39, 0.06 + j * 0.54).color(*(("#6f6253", "#8a7b68") if (j + k) % 2 else ("#62574a", "#7d6f5e")))
    a.box(0.12, 3.5, 0.16, bevel=0.02).move(wx + 0.12, 0.31, 1.18).part("metal").color(steel)
    for k in range(4):
        a.cyl(0.07, 0.1, 6, bevel=0).rot(y=90).move(wx + 0.17, -0.86 + k * 0.78, 1.26).part("metal").color(P.STEEL)
    a.box(0.9, 0.9, 0.22, bevel=0.04, grounded=True).move(3.95, 0.7, 0).color(conc_lo, conc_hi)
    a.lathe([(0.3, 0), (0.3, 0.12), (0.24, 0.16), (0.24, 2.95), (0.3, 3.0), (0.3, 3.1), (0.2, 3.1)], 10).move(3.95, 0.7, 0.2).part("metal").color(steel, P.STEEL)
    for z in (1.2, 2.2):
        a.cyl(0.275, 0.07, 10, bevel=0).move(3.95, 0.7, z).part("metal").color(P.GUNMETAL)
    a.cone(0.44, 0.24, 10).move(3.95, 0.7, 3.42).part("metal").color(steel)
    for k in range(3):
        ang = k * 2.094 + 0.5
        rod(a, (3.95 + math.cos(ang) * 0.22, 0.7 + math.sin(ang) * 0.22, 3.28), (3.95 + math.cos(ang) * 0.36, 0.7 + math.sin(ang) * 0.36, 3.46), 0.02, 3).part("metal").color(steel)
    a.tube([(3.95, 0.7, 0.75), (3.6, 0.7, 0.75), (3.3, 0.7, 0.75)], 0.17, 8).part("metal").color(steel)
    a.box(0.55, 0.42, 0.5, bevel=0.04, grounded=True).move(3.9, -0.55, 0).color(P.SLATE)
    a.box(0.4, 0.03, 0.26, bevel=0).move(3.9, -0.77, 0.14).color(P.INK)

    # ---- on the berm: a louvred intake shaft and two gooseneck breathers ------------------
    top = 2.22
    a.box(0.86, 0.86, 0.62, bevel=0.05).move(1.25, 1.05, top - 0.1).color(conc_lo, conc_hi)
    for k in range(3):
        a.box(0.78, 0.78, 0.07, bevel=0).move(1.25, 1.05, top + 0.56 + k * 0.11).part("metal").color(steel if k % 2 else P.GUNMETAL)
    a.box(0.96, 0.96, 0.1, bevel=0.03, taper=0.8).move(1.25, 1.05, top + 0.88).part("metal").color(steel)
    for (px, py, hgt, r) in ((-1.55, 0.75, 1.0, 0.15), (-0.85, 1.45, 0.72, 0.12)):
        a.cyl(r * 1.6, 0.1, 8, bevel=0.02).move(px, py, top - 0.04).color(conc_hi)
        a.tube(
            [(px, py, top), (px, py, top + hgt), (px, py - r * 0.9, top + hgt + r * 1.5), (px, py - r * 2.6, top + hgt + r * 1.5), (px, py - r * 3.5, top + hgt), (px, py - r * 3.5, top + hgt - r * 1.4)],
            r, 8,
        ).part("metal").color(steel, P.STEEL)

    # ---- the back of the berm: an escape hatch, a crest fence, a buried feeder ------------
    with a.group() as hatch:
        a.box(1.3, 1.15, 1.3, bevel=0.05, grounded=True).color(conc_lo, conc_hi)
        a.box(1.5, 1.3, 0.14, bevel=0.035).move(0, 0.03, 1.28).color(conc_hi, "#cfcdc6")
        a.box(0.86, 0.08, 1.0, bevel=0).move(0, 0.57, 0.06).color(jk.shade(conc_lo, -0.3))
        a.box(0.74, 0.08, 0.92, bevel=0.02).move(0, 0.62, 0.08).part("metal").color(P.GUNMETAL, steel)
        for z in (0.3, 0.76):
            a.box(0.16, 0.05, 0.1, bevel=0).move(-0.4, 0.67, z).part("metal").color(P.STEEL)
        a.torus(0.13, 0.028, 8, 4).rot(x=90).move(0.14, 0.7, 0.56).part("metal").color(P.STEEL)
        a.box(0.74, 0.03, 0.08, bevel=0).move(0, 0.675, 0.86).color(P.AMBER)
        a.box(1.0, 0.36, 0.07, bevel=0.02, grounded=True).move(0, 0.74, 0).color("#7b7d82", "#8f9196")
    hatch.move(-1.25, 2.98, 0)
    crest = [(-3.0, 1.25), (-2.1, 2.2), (-0.7, 2.24), (0.7, 2.24), (2.1, 2.2), (3.0, 1.25)]
    for k, (px, py) in enumerate(crest):
        a.box(0.08, 0.08, 0.78, bevel=0).move(px, py, top - 0.14).part("metal").color(P.GUNMETAL, steel)
        if k:
            qx, qy = crest[k - 1]
            for z in (top + 0.28, top + 0.56):
                rod(a, (qx, qy, z), (px, py, z), 0.014, 3, caps="none").part("metal").color(P.STEEL)
    a.tube([(1.25, 1.5, top + 0.12), (1.25, 2.34, top + 0.1), (1.25, 3.72, 0.16), (1.25, 3.72, 0.0)], 0.075, 6).part("metal").color(steel, P.STEEL)
    a.box(0.46, 0.3, 0.42, bevel=0.04, grounded=True).move(1.25, 3.6, 0).color(P.SLATE)
    for k, (px, py, r) in enumerate(((2.6, 3.42, 0.34), (3.08, 3.08, 0.22), (-2.9, 3.2, 0.3), (0.2, 3.66, 0.2))):
        rock = a.blob(r, 1, (1.2, 1, 0.7), lumps=0.28, seed=k + 11).rot(z=k * 70).move(px, py, r * 0.3)
        rock.warp(lambda co: (co.x, co.y, max(co.z, 0.0))).color("#6f6a66", "#99938c")

    # ---- guard post: a slit-windowed pillbox watching the approach ------------------------
    with a.group() as post:
        hexa = [(math.cos(math.radians(30 + 60 * k)) * 0.68, math.sin(math.radians(30 + 60 * k)) * 0.68) for k in range(6)]
        a.prism(hexa, 1.36, bevel=0.05, grounded=True).color(conc_lo, conc_hi)
        roof = [(x * 1.3, y * 1.3) for x, y in hexa]
        a.prism(roof, 0.16, bevel=0.04).move(0, 0, 1.36).color(conc_hi, "#cfcdc6")
        a.prism([(x * 0.6, y * 0.6) for x, y in roof], 0.1, bevel=0.03).move(0, 0, 1.52).color(conc_lo)
        for ang in (-90, -30, -150):
            with a.group() as slit:
                a.box(0.5, 0.05, 0.22, bevel=0).move(0, -0.02, 0.86).color(P.INK)
                a.box(0.42, 0.03, 0.12, bevel=0).move(0, -0.05, 0.91).part("lit").color("#ffcf7a")
                a.box(0.58, 0.09, 0.05, bevel=0).move(0, -0.04, 1.08).color(conc_hi)
            slit.move(0, -0.589, 0).rot(z=ang + 90)
        a.box(0.36, 0.05, 0.86, bevel=0.02).move(0, 0.6, 0.02).part("metal").color(P.GUNMETAL, steel)
        rod(a, (0.2, 0.15, 1.6), (0.2, 0.15, 2.5), 0.015, 3).part("metal").color(steel)
    post.rot(z=24).move(-3.6, -3.12, 0)

    # ---- camera mast ---------------------------------------------------------------------
    mx, my = 3.5, -3.2
    a.box(0.46, 0.46, 0.3, bevel=0.05, grounded=True).move(mx, my, 0).color(conc_lo, conc_hi)
    a.cyl(0.075, 5.0, 6, bevel=0.015).move(mx, my, 0.28).part("metal").color(steel, P.STEEL)
    a.box(0.22, 0.14, 0.32, bevel=0.03).move(mx, my - 0.13, 1.1).color(P.SLATE)
    a.box(1.0, 0.07, 0.07, bevel=0.015).move(mx, my, 4.78).part("metal").color(steel)
    for sx, yaw in ((-1, 38), (1, -28)):
        with a.group() as cam:
            a.box(0.2, 0.42, 0.18, bevel=0.035).move(0, -0.05, -0.2).color(P.OFF_WHITE)
            a.box(0.24, 0.3, 0.03, bevel=0).move(0, -0.2, -0.03).color(P.OFF_WHITE)
            a.cyl(0.065, 0.05, 6, bevel=0).rot(x=90).move(0, -0.25, -0.11).part("glass").color(P.INK)
            a.box(0.04, 0.04, 0.08, bevel=0).move(0, 0.05, -0.04).part("metal").color(steel)
        cam.rot(x=-24).rot(z=yaw).move(mx + sx * 0.44, my, 4.78)
    a.cyl(0.11, 0.06, 6, bevel=0).move(mx, my, 5.27).part("metal").color(steel)
    a.sphere(0.085, 8, 5).move(mx, my, 5.4).part("glow").color(P.GLOW_RED)


@asset(
    "lm-ruin",
    tint="#ffffff",
    budget=4500,
    note="S8: the shell of a collapsed high-rise: missing floors, bent rebar, a rubble skirt, a survivors' lean-to and fire.",
)
def ruin(a):
    conc_lo, conc_hi = "#6f6b65", "#a39f96"
    slab_lo, slab_hi = "#7d7972", "#b1ada4"
    rnd = random.Random(88)
    storey, z0 = 1.12, 0.1
    level = lambda k: z0 + k * storey  # noqa: E731

    def bars(p, count=3, reach=0.5, up=1.0):
        """Rebar left sticking out of broken concrete, bent every which way."""
        p = Vector(p)
        for _ in range(count):
            d1 = Vector((rnd.uniform(-0.4, 0.4), rnd.uniform(-0.4, 0.4), up)).normalized()
            d2 = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.6, 0.5))).normalized()
            q = p + Vector((rnd.uniform(-0.06, 0.06), rnd.uniform(-0.06, 0.06), 0))
            r = reach * rnd.uniform(0.6, 1.1)
            a.tube([q, q + d1 * r * 0.55, q + d1 * r * 0.55 + d2 * r * 0.5], 0.03, 3).color(jk.shade(P.RUST, -0.15), P.RUST)

    with a.group() as tower:
        a.box(2.74, 2.74, 0.6, bevel=0.04).move(0, 0, -0.48).color(conc_lo, slab_lo)
        # ---- nine columns, broken off lower and lower toward the collapsed corner ---------
        heights = {(1, -1): 9.5, (1, 0): 9.25, (0, -1): 8.35, (1, 1): 7.25, (0, 0): 5.35, (-1, -1): 5.3, (0, 1): 3.05, (-1, 0): 2.0, (-1, 1): 0.9}
        for (ix, iy), h in heights.items():
            a.box(0.23, 0.23, h - z0, bevel=0.025).move(ix * 1.1, iy * 1.1, z0).color(conc_lo, conc_hi)
            if h < 9.4:
                bars((ix * 1.1, iy * 1.1, h - 0.03), 3, 0.5)
        # ---- floor plates: whole below, bitten away above, two storeys gone entirely ------
        floors = {
            1: [(-1.25, -1.25), (1.25, -1.25), (1.25, 1.25), (-0.3, 1.25), (-0.55, 0.8), (-0.95, 0.7), (-1.25, 0.25)],
            2: [(-1.25, -1.25), (1.25, -1.25), (1.25, 1.25), (-0.15, 1.25), (-0.1, 0.7), (-0.6, 0.45), (-0.8, -0.05), (-1.25, -0.2)],
            3: [(-1.25, -1.25), (1.25, -1.25), (1.25, 1.25), (0.45, 1.25), (0.3, 0.5), (-0.3, 0.2), (-0.5, -0.4), (-1.25, -0.55)],
            4: [(-1.25, -1.25), (1.25, -1.25), (1.25, 1.25), (0.7, 1.25), (0.55, 0.3), (0.1, -0.1), (-0.5, -0.3), (-0.7, -0.75), (-1.25, -0.8)],
            5: [(0.78, -1.25), (1.25, -1.25), (1.25, 1.0), (0.92, 0.9), (0.84, 0.2), (0.62, -0.5)],
            6: [(-0.45, -1.25), (1.25, -1.25), (1.25, 0.75), (0.7, 0.55), (0.4, -0.1), (-0.1, -0.35), (-0.3, -0.9)],
            7: [(0.1, -1.25), (1.25, -1.25), (1.25, 0.3), (0.75, 0.1), (0.5, -0.5), (0.2, -0.7)],
            8: [(0.55, -1.25), (1.25, -1.25), (1.25, -0.2), (0.85, -0.45), (0.7, -0.9)],
        }
        for k, outline in floors.items():
            a.prism(outline, 0.15, bevel=0.025).move(0, 0, level(k) - 0.15).color(slab_lo, slab_hi)
            # Rebar droops from the broken edge of each plate.
            edge = outline[3:-1] if k < 5 else outline[2:-1]
            for (x, y) in edge[:: 2 if k < 5 else 1][:3]:
                bars((x, y, level(k) - 0.07), 2, 0.42, up=-0.15)
        # ---- what is left of the facade: spandrels on the right and back, brick infill ----
        right = {1: (-1.25, 1.25), 2: (-1.25, 1.25), 3: (-1.25, 1.25), 4: (-1.25, 1.25), 5: (-1.25, 1.0), 6: (-1.25, 0.75), 7: (-1.25, 0.3), 8: (-1.25, -0.2)}
        for k, (y_lo, y_hi) in right.items():
            a.box(0.15, y_hi - y_lo, 0.42, bevel=0.02).move(1.18, (y_lo + y_hi) / 2, level(k)).color(conc_lo, conc_hi)
        back = {1: (-0.3, 1.25), 2: (-0.15, 1.25), 3: (0.45, 1.25), 4: (0.7, 1.25)}
        for k, (x_lo, x_hi) in back.items():
            a.box(x_hi - x_lo, 0.15, 0.42, bevel=0.02).move((x_lo + x_hi) / 2, 1.18, level(k)).color(conc_lo, conc_hi)
        a.box(2.5, 0.12, 0.3, bevel=0.02).move(0, -1.19, level(1)).color(conc_lo, conc_hi)
        brick = (jk.shade(P.BRICK, -0.2), P.BRICK)
        for k, y, hgt in ((0, 0.55, 0.97), (0, -0.55, 0.97), (1, 0.55, 0.55), (2, -0.55, 0.38), (3, 0.55, 0.55), (5, -0.55, 0.3)):
            a.box(0.1, 0.86, hgt, bevel=0).move(1.19, y, level(k) + (0.42 if k else 0.0)).color(*brick)
        for k, x, hgt in ((0, 0.55, 0.97), (1, 0.55, 0.55), (2, 0.6, 0.32)):
            a.box(0.86, 0.1, hgt, bevel=0).move(x, 1.19, level(k) + (0.42 if k else 0.0)).color(*brick)
        # ---- a fallen plate hangs by its steel; a dead cable swings from the top ----------
        a.box(1.0, 1.05, 0.14, bevel=0.025).rot(x=-58).rot(z=38).move(-0.3, 0.42, 3.8).color(slab_lo, slab_hi)
        for q in ((0.05, 0.05), (-0.25, -0.15)):
            a.tube([(q[0], q[1], level(4) - 0.08), (q[0] - 0.12, q[1] + 0.14, 4.25), (q[0] - 0.2, q[1] + 0.22, 4.1)], 0.03, 3).color(P.RUST)
        a.tube([(0.6, -1.2, level(8) - 0.1), (0.5, -1.3, 8.2), (0.46, -1.3, 7.3), (0.5, -1.27, 6.9)], 0.025, 3).color(P.INK)
    tower.rot(x=1.6, y=-2.6)

    # ---- the rubble skirt -----------------------------------------------------------------
    heap = a.lathe([(2.3, -0.3), (2.15, 0.02), (1.6, 0.42), (1.0, 0.85), (0.45, 1.1), (0, 1.16)], 12)
    heap.scale(0.84, 1, 1).jitter(0.12, 9, 1.3).move(-0.55, 0.62, 0).color("#5f5b56", "#8a857c").flat()
    for k in range(13):
        ang, dist = rnd.uniform(1.2, 5.2), rnd.uniform(0.9, 2.05)
        x, y = -0.55 + math.cos(ang) * dist * 0.84, 0.62 + math.sin(ang) * dist
        if abs(x) < 1.3 and abs(y) < 1.3 and not (x < -0.2 and y > 0.2):
            continue
        z = max(0.02, 1.1 * (1 - dist / 2.3))
        tone = (jk.shade(P.BRICK, -0.15), P.BRICK) if k % 3 == 0 else ("#77736c", "#a8a39a")
        a.blob(rnd.uniform(0.2, 0.36), 1, (1, 0.8, 0.62), lumps=0.3, seed=k + 40).rot(z=k * 50).move(x, y, z).color(*tone)
    for (x, y, z, rx, rz, w, d) in ((-1.5, 1.75, 0.5, 24, 30, 0.95, 0.7), (-0.2, 2.25, 0.42, -18, 100, 0.8, 0.62), (-1.95, 0.75, 0.3, 30, -40, 0.7, 0.55), (0.75, 1.95, 0.3, 16, 70, 0.75, 0.5)):
        a.box(w, d, 0.13, bevel=0.025).rot(x=rx).rot(z=rz).move(x, y, z).color(slab_lo, slab_hi)
        bars((x, y, z + 0.08), 2, 0.4)

    # ---- the survivors' lean-to against the standing wall, and its fire -------------------
    lz = 0.06
    hi_x, lo_x = -1.3, -2.36
    for y, tone in ((-1.02, ("#7a4530", "#9a5a3c")), (-0.4, ("#5f7178", "#7d9097"))):
        beam(a, (hi_x, y, lz + 1.24), (lo_x, y, lz + 0.78), 0.6, 0.045, side=(0, 1, 0)).color(*tone)
    rod(a, (hi_x - 0.02, -1.36, lz + 1.2), (hi_x - 0.02, -0.06, lz + 1.2), 0.035, 4).color(P.WALNUT)
    rod(a, (lo_x + 0.05, -1.36, lz + 0.76), (lo_x + 0.05, -0.06, lz + 0.76), 0.03, 4).color(P.WALNUT)
    for y in (-1.3, -0.12):
        rod(a, (lo_x + 0.06, y, -0.1), (lo_x + 0.05, y, lz + 0.76), 0.035, 4).color(P.WALNUT)
    a.profile_y([(lo_x + 0.05, lz), (hi_x, lz), (hi_x, lz + 1.18), (lo_x + 0.05, lz + 0.74)], 0.03, bevel=0).move(0, -0.1, 0).color("#55705f", "#6d8a76")
    a.capsule(0.1, 0.72, 8, 2).rot(x=90).move(-1.62, -0.3, lz + 0.1).color(P.OLIVE)
    a.box(0.3, 0.3, 0.26, bevel=0.03).move(-2.05, -0.42, lz).color(jk.shade(P.PINE_WOOD, -0.2), P.PINE_WOOD)
    fx, fy = -1.95, -1.78
    for k in range(5):
        a.blob(0.075, 1, (1, 1, 0.7), lumps=0.2, seed=k + 5).move(fx + math.cos(k * 1.257) * 0.2, fy + math.sin(k * 1.257) * 0.2, 0.04).color(P.STONE_DARK, P.STONE)
    rod(a, (fx - 0.16, fy - 0.06, 0.05), (fx + 0.16, fy + 0.06, 0.09), 0.035, 4).color(P.BARK_DARK)
    rod(a, (fx - 0.06, fy + 0.15, 0.05), (fx + 0.05, fy - 0.15, 0.1), 0.035, 4).color(P.BARK_DARK)
    a.cone(0.1, 0.3, 5).move(fx, fy, 0.08).part("glow").color(P.GLOW_ORANGE, "#ffd27a")
    a.cone(0.055, 0.17, 4).move(fx + 0.05, fy + 0.03, 0.08).part("glow").color("#ffe08a")


# --------------------------------------------------------------------------------------------
# S9 · Deus Ex Machina
# --------------------------------------------------------------------------------------------
UP = Vector((0, 0, 1))


def blade(a, lo, mid, hi, half, thick, out, crown=0.1, table=0.56, rear=0.88):
    """A gem-cut crystal plate with a kite outline: bottom tip, two waist corners, top tip.

    `mid` is the centre of the waist line, `half` its half-width square to the horizontal
    direction `out`. The plate folds along its waist like the facets of a bipyramid, rises by
    `crown` to a smaller table and is `thick` deep behind its outline, where it is a little
    smaller so the rim shows as a bright chamfer. Returns the piece and the table corners
    (bottom, right, top, left).
    """
    lo, mid, hi = Vector(lo), Vector(mid), Vector(hi)
    side = UP.cross(Vector(out)).normalized()
    n = side.cross(hi - lo).normalized()
    k0 = [lo, mid + side * half, hi, mid - side * half]
    centre = (lo + hi + mid * 2) / 4
    k1 = [centre + (p - centre) * table + n * crown for p in k0]
    k2 = [centre + (p - centre) * rear - n * thick for p in k0]
    # Table and back are split along the waist, so the fold is always the horizontal one.
    faces = [(4, 5, 7), (5, 6, 7), (8, 11, 9), (9, 11, 10)]
    for i in range(4):
        j = (i + 1) % 4
        faces += [(i, j, j + 4, i + 4), (j, i, i + 8, j + 8)]
    return a.raw([tuple(p) for p in k0 + k1 + k2], faces).flat(), k1


def hexagon(r, turn=0.0):
    return [(math.cos(turn + k * TAU / 6) * r, math.sin(turn + k * TAU / 6) * r) for k in range(6)]


def crystal_segment(a, phi, half, bottom, girdle, top, thick=None):
    """One segment of a faceted crystal about the z axis, centred on azimuth `phi` (degrees).

    It has a ridge down its middle and a flank reaching `half` degrees to either side.
    `bottom` and `top` are its (radius, z) tips on the ridge line and `girdle` is
    (radius, z0, z1), the band where it is widest. With `thick` it is a shell that deep;
    without, its tips lie on the axis and it is solid: one wedge of a whole crystal.
    """

    def ring(shrink):
        def at(r, deg, z):
            t, r = math.radians(deg), max(r - shrink, 0.02 if shrink else 0.0)
            return (math.cos(t) * r, math.sin(t) * r, z)

        R, z0, z1 = girdle
        return (
            [at(bottom[0], phi, bottom[1])]
            + [at(R, phi + d, z0) for d in (-half, 0, half)]
            + [at(R, phi + d, z1) for d in (-half, 0, half)]
            + [at(top[0], phi, top[1])]
        )

    verts = ring(0.0)
    faces = [(0, 2, 1), (0, 3, 2), (1, 2, 5, 4), (2, 3, 6, 5), (7, 4, 5), (7, 5, 6)]
    if thick is None:
        faces += [(0, 1, 4, 7), (0, 7, 6, 3)]
    else:
        verts += ring(thick)
        faces += [tuple(8 + i for i in reversed(f)) for f in faces]
        rim = (0, 3, 6, 7, 4, 1)
        for i in range(6):
            p, q = rim[i], rim[(i + 1) % 6]
            faces.append((q, p, p + 8, q + 8))
    return a.raw(verts, faces)


@asset(
    "lm-gift",
    tint="#ffffff",
    budget=4500,
    note="S9: one of the machines' gifts. Three nested crystal shells round a core of light on a thin plinth; the service lectern faces -y.",
)
def gift(a):
    stone_lo, stone_hi = "#bfc5c1", "#eef1ec"
    silver = ("#b9c4ce", "#eef2f5")
    light = "#c6efff"

    # ---- the plinth: two thin tiers parted by a seam of light ------------------------------
    a.prism(hexagon(2.95), 0.24, bevel=0.06, grounded=True).color(stone_lo, stone_hi)
    a.prism(hexagon(2.57), 0.06, bevel=0).move(0, 0, 0.22).part("glow").color(light)
    a.prism(hexagon(2.46), 0.16, bevel=0.045).move(0, 0, 0.27).color(stone_hi, "#f8f9f5")
    top = 0.43

    # ---- the cup the crystal grows from, holding a pool of light ---------------------------
    a.lathe([(1.4, top - 0.02), (1.4, top + 0.08), (1.32, top + 0.15), (1.2, top + 0.15), (1.1, top + 0.04), (0, top + 0.04)], 24, cap_bottom=False).part(
        "metal"
    ).color(*silver)
    a.cyl(1.09, 0.03, 18, bevel=0).move(0, 0, top + 0.03).part("glow").color("#e4f8ff").no_ao()

    # ---- nested surfaces: a core of light inside three shells, each parted by the same seams -
    a.lathe([(0, 1.25), (0.68, 2.75), (0.68, 3.5), (0, 7.9)], 6, turn=math.radians(30)).part("glow").color("#bfeaff", "#ffffff").flat().no_ao()
    foot = top + 0.07
    shells = (
        # flank, bottom tip, girdle, top tip, shell depth, chamfer, colour at the foot, girdle and tip
        (51, (0, foot), (1.05, 2.75, 3.5), (0, 9.3), 0.22, 0.035, ("#a9dcf7", "#4aa0dc", "#f0fbff")),
        (37, (0.5, foot), (1.52, 2.05, 2.7), (1.12, 5.9), 0.17, 0.03, ("#c2b8f2", "#8272dc", "#f1ebff")),
        (27, (0.82, foot), (1.98, 1.3, 1.75), (1.88, 3.35), 0.15, 0.028, ("#cdd4f2", "#94a2de", "#f6f7ff")),
    )
    for flank, bottom, girdle, tip, depth, chamfer, (c_foot, c_mid, c_tip) in shells:
        z0, z1, z2, z3 = bottom[1], girdle[1], girdle[2], tip[1]

        def tone(co, z0=z0, z1=z1, z2=z2, z3=z3, c_foot=c_foot, c_mid=c_mid, c_tip=c_tip):
            if co.z < z1:
                return jk.mix(c_foot, c_mid, max(0.0, (co.z - z0) / (z1 - z0)))
            return jk.mix(c_mid, c_tip, min(1.0, max(0.0, (co.z - z2) / (z3 - z2)) ** 0.8))

        for k in range(3):
            piece = crystal_segment(a, 90 + 120 * k, flank, bottom, girdle, tip, depth).bevel(chamfer).flat()
            paint_by(piece, tone).part("glass")

    # ---- the service interface: a slim lectern facing the open seam, fed by a line of light -
    with a.group() as lectern:
        a.box(0.46, 0.34, 0.05, bevel=0.015).color(stone_lo, stone_hi)
        a.profile_x([(-0.09, 0.04), (0.09, 0.04), (0.045, 1.0), (-0.045, 1.0)], 0.16, bevel=0.025).color(stone_lo, stone_hi)
        with a.group() as tablet:
            a.box(0.7, 0.46, 0.06, bevel=0.02).move(0, 0, -0.03).color(stone_hi, "#f8f9f5")
            a.box(0.6, 0.36, 0.02, bevel=0.006).move(0, 0, 0.022).part("glass").color("#1c2a3a", "#2f4458")
            a.torus(0.08, 0.017, 12, 4).move(-0.16, 0, 0.046).part("glow").color(light)
            a.box(0.24, 0.028, 0.012, bevel=0).move(0.13, 0.06, 0.04).part("glow").color(light)
            a.box(0.15, 0.028, 0.012, bevel=0).move(0.085, -0.05, 0.04).part("glow").color("#d9ccff")
        tablet.rot(x=32).move(0, -0.02, 1.02)
    lectern.move(0, -2.36, 0.23)
    a.box(0.07, 0.76, 0.014, bevel=0).move(0, -1.76, top - 0.004).part("glow").color(light)


@asset(
    "lm-machine-node",
    tint="#ffffff",
    grounded=False,
    budget=4500,
    note="S9: a node of the machines' halo. Origin on the halo line (the x axis), +z away from Earth; the ring of light lies in the xz plane.",
)
def machine_node(a):
    plate_lo, plate_hi = "#181b29", "#383f5a"
    steel_lo, steel_hi = "#474d63", "#7d859e"
    cyan, violet = "#6ff6ff", "#a78bff"
    ZC, R = 4.5, 5.05  # the ring of light: its centre height and outer radius

    # ---- the crystal: three dark plates pinned between two collars, a cold light inside ----
    for k in range(3):
        ang = math.radians(120 * k)
        out = Vector((math.cos(ang), math.sin(ang), 0))
        plate, (_, right, tip, left) = blade(a, out * 0.44 + UP * 0.52, out * 2.0 + UP * ZC, out * 0.38 + UP * 9.0, 2.25, 0.36, out, crown=0.22, table=0.6)
        plate.part("glass").color(plate_lo, plate_hi)
        # One slit of cold light on every plate.
        waist = (right + left) / 2
        normal = (right - left).cross(tip - waist).normalized()
        beam(a, waist.lerp(tip, 0.14) + normal * 0.012, waist.lerp(tip, 0.6) + normal * 0.012, 0.1, 0.03, side=right - left).part("glow").color(cyan)
    a.lathe([(0, 1.3), (1.15, ZC), (0, 7.9)], 6, turn=math.radians(30)).part("glow").color(violet, "#dcd2ff").flat().no_ao()
    a.lathe([(0.14, -0.24), (0.5, -0.14), (0.58, 0.1), (0.72, 0.34), (0.72, 0.6), (0.52, 0.78), (0.14, 0.78)], 6, turn=math.radians(30)).part("metal").color(
        steel_lo, steel_hi
    ).flat()
    a.lathe([(0.14, 8.74), (0.5, 8.74), (0.66, 8.9), (0.66, 9.08), (0.42, 9.22), (0.14, 9.22)], 6, turn=math.radians(30)).part("metal").color(steel_lo, steel_hi).flat()

    # ---- the ring of light, gimballed on the spine ----------------------------------------
    a.annulus(R, R - 0.17, 0.2, 40, bevel=0.03).rot(x=90).move(0, 0.1, ZC).part("glass").color(plate_lo, plate_hi)
    band(a, R - 0.16, R - 0.27, 0.1, 40).rot(x=90).move(0, 0.05, ZC).part("glow").color(cyan)
    rod(a, (0, 0, 9.1), (0, 0, ZC + R - 0.2), 0.09, 6).part("metal").color(steel_hi)
    rod(a, (0, 0, -1.0), (0, 0, -0.2), 0.09, 6).part("metal").color(steel_hi)
    for z in (ZC + R - 0.1, ZC - R + 0.1):
        a.box(0.44, 0.36, 0.4, bevel=0.07).move(0, 0, z - 0.2).part("metal").color(steel_lo, steel_hi)
    for sx in (-1, 1):
        a.box(0.34, 0.34, 0.62, bevel=0.07).move(sx * (R - 0.1), 0, ZC - 0.31).part("glass").color(plate_lo, plate_hi)
        a.box(0.1, 0.36, 0.2, bevel=0).move(sx * (R - 0.1), 0, ZC - 0.1).part("glow").color(cyan)

    # ---- the lower tier: three shards carried on articulated arms round a stinger ----------
    shard_lo, shard_hi = "#242940", "#454d6e"  # a little lighter than the crystal, so the tier reads against space
    a.lathe([(0, -0.85), (0.4, -1.9), (0.1, -4.2), (0, -4.36)], 6).part("glass").color(shard_lo, shard_hi).flat()
    a.lathe([(0, -4.6), (0.15, -4.36), (0, -4.08)], 6).part("glow").color(cyan).flat().no_ao()
    for k in range(3):
        ang = math.radians(90 + 120 * k)
        out = Vector((math.cos(ang), math.sin(ang), 0))
        lo, mid, hi = out * 1.5 + UP * -4.3, out * 2.68 + UP * -1.8, out * 2.1 + UP * -0.25
        shard, (_, right, tip, left) = blade(a, lo, mid, hi, 0.98, 0.22, out, crown=0.13)
        shard.part("glass").color(shard_lo, shard_hi)
        waist = (right + left) / 2
        normal = (right - left).cross(tip - waist).normalized()
        beam(a, waist.lerp(tip, 0.2) + normal * 0.01, waist.lerp(tip, 0.62) + normal * 0.01, 0.07, 0.026, side=right - left).part("glow").color(cyan)
        side = (right - left).normalized()
        back = side.cross(hi - lo).normalized()
        shoulder, elbow = out * 0.52 + UP * 0.0, out * 1.3 + UP * 0.46
        wrist = mid.lerp(hi, 0.12) - back * 0.29
        a.tube([shoulder, elbow], 0.07, 5).part("metal").color(steel_hi)
        a.tube([elbow, wrist], [0.065, 0.05], 5).part("metal").color(steel_hi)
        for p, r in ((shoulder, 0.14), (elbow, 0.13)):
            a.sphere(r, 8, 4).move(*p).part("metal").color(steel_lo, steel_hi)
        along(a.cyl(0.17, 0.1, 8, bevel=0.02), wrist - back * 0.02, wrist + back * 0.08).part("metal").color(steel_lo, steel_hi)


# --------------------------------------------------------------------------------------------
# S10 · Out of Eden (ground)
# --------------------------------------------------------------------------------------------
PINK = ("#dc5a88", "#f9a8c0")
BLUSH = ("#ee9db4", "#ffe6e2")
LEAF = ("#3a7a36", "#7dba58")


def blossom_tree(a, x, y, z, h, seed, limbs=3):
    """An orchard tree in full blossom: flat pink and white clouds over a branching dark trunk."""
    rnd = random.Random(seed)
    with a.group() as g:
        th = h * 0.42
        parts.trunk(a, th, h * 0.05, lean=h * 0.02, flare=1.5)
        # Two broad clouds carry the crown; smaller sprays and fresh leaf break its outline.
        crown = [(h * 0.02, 0.0, h * 0.78, h * 0.235, 2, PINK), (-h * 0.1, h * 0.09, h * 0.63, h * 0.2, 2, BLUSH)]
        for k in range(limbs):
            ang = (k + 0.4) / limbs * TAU + rnd.uniform(-0.25, 0.25)
            d = h * rnd.uniform(0.19, 0.23)
            tone = (BLUSH, LEAF, PINK)[k % 3]
            crown.append((math.cos(ang) * d, math.sin(ang) * d, h * rnd.uniform(0.54, 0.62), h * rnd.uniform(0.12, 0.15), 1, tone))
        for k, (cx, cy, cz, r, subdiv, (low, high)) in enumerate(crown):
            if k:
                a.tube([(h * 0.02, 0, th * 0.8), (cx * 0.5, cy * 0.5, (th + cz) * 0.5), (cx * 0.92, cy * 0.92, cz - r * 0.1)], [h * 0.03, h * 0.022, h * 0.013], 4).color(
                    P.BARK
                ).flat()
            a.blob(r, subdiv, (1.08, 1.08, 0.7), lumps=0.26, seed=seed * 7 + k, freq=1.7).move(cx, cy, cz).color(low, high)
    g.rot(z=seed * 53).move(x, y, z)
    return g


def beehive(a, x, y, z, turn, boxes, paint):
    """A painted box hive on a stand: stacked supers, a landing board and a pitched lid."""
    with a.group() as g:
        for sx in (-1, 1):
            a.box(0.06, 0.4, 0.16, bevel=0).move(sx * 0.16, 0, 0).color(P.WALNUT)
        zc = 0.16
        for k in range(boxes):
            a.box(0.44, 0.44, 0.23, bevel=0.02).move(0, 0, zc).color(jk.shade(paint, -0.12), paint)
            zc += 0.24
        a.box(0.3, 0.1, 0.025, bevel=0).move(0, -0.26, 0.17).color(P.PINE_WOOD)
        a.box(0.16, 0.02, 0.035, bevel=0).move(0, -0.222, 0.2).color(P.INK)
        a.profile_x([(-0.28, 0), (0, 0.13), (0.28, 0), (0.28, -0.05), (-0.28, -0.05)], 0.54, bevel=0).move(0, 0, zc + 0.04).color(
            jk.shade(P.SLATE, 0.1)
        )
    g.rot(z=turn).move(x, y, z)
    return g


@asset(
    "lm-grove",
    tint="#ffffff",
    budget=4500,
    note="S10: a flowering orchard grove. Blossoming trees ring a clearing with a communal table and beehives.",
)
def grove(a):
    top = 0.2
    # ---- the meadow ----------------------------------------------------------------------
    ground = a.prism(ring_points(4.72, 22, wobble=0.035, seed=3, sy=1.02, cx=0.12), 0.3, bevel=0.07, grounded=True).move(0, 0, -0.1)
    ground.color("#5e9a48", "#79bb58").paint(lambda f: "#86c75f" if f.normal.z > 0.9 else None)
    a.prism(ring_points(1.95, 14, wobble=0.05, seed=5, cy=-0.1), 0.03, bevel=0, grounded=True).move(0, 0, top - 0.012).color("#d9c79a")
    for k, (px, py, r) in enumerate(((0.1, -2.45, 0.24), (-0.14, -3.0, 0.27), (0.12, -3.55, 0.25), (-0.08, -4.1, 0.28))):
        a.cyl(r, 0.06, 6, bevel=0.02, grounded=True).rot(z=k * 31).scale(1.15, 1, 1).move(px, py, top - 0.015).color(P.STONE, "#c9c5ba")

    # ---- the ring of blossoming trees, small ones at the front so the clearing shows ------
    ring = ((92, 3.35, 4.9, 11), (38, 3.4, 4.1, 4), (146, 3.4, 4.4, 6), (200, 3.45, 3.5, 8), (-16, 3.5, 3.7, 5), (-128, 3.55, 2.75, 3), (-52, 3.6, 3.0, 9))
    for ang, dist, h, seed in ring:
        t = math.radians(ang)
        blossom_tree(a, math.cos(t) * dist, math.sin(t) * dist, top, h, seed, limbs=4 if h > 3.9 else 3)
        # Fallen petals lie under each tree.
        a.cyl(h * 0.2, 0.02, 7, bevel=0, grounded=True).scale(1.2, 0.9, 1).rot(z=seed * 40).move(math.cos(t) * (dist - 0.5), math.sin(t) * (dist - 0.5), top - 0.005).color(
            "#f6d6e4"
        )

    # ---- the communal table --------------------------------------------------------------
    tz = top + 0.02
    a.box(2.4, 0.82, 0.07, bevel=0.02).move(0, 0, tz + 0.5).color(jk.shade(P.OAK_WOOD, -0.08), P.PINE_WOOD)
    a.box(0.86, 0.86, 0.02, bevel=0).move(-0.1, 0, tz + 0.565).color(P.CREAM)
    for sx in (-0.9, 0.9):
        for sy in (-1, 1):
            beam(a, (sx, sy * 0.36, tz), (sx, sy * 0.12, tz + 0.5), 0.09, 0.07).color(P.WALNUT)
        a.box(0.07, 0.5, 0.06, bevel=0).move(sx, 0, tz + 0.2).color(P.WALNUT)
    rod(a, (-0.9, 0, tz + 0.23), (0.9, 0, tz + 0.23), 0.03, 4).color(P.WALNUT)
    for sy in (-1, 1):
        a.box(2.2, 0.26, 0.06, bevel=0.018).move(0, sy * 0.72, tz + 0.26).color(jk.shade(P.OAK_WOOD, -0.08), P.PINE_WOOD)
        for sx in (-0.85, 0.85):
            a.box(0.08, 0.2, 0.27, bevel=0).move(sx, sy * 0.72, tz).color(P.WALNUT)
    # Shared food: a bowl of fruit, a jug and a honey pot.
    a.lathe([(0.1, 0), (0.2, 0.1), (0.17, 0.1)], 8).move(-0.2, 0.02, tz + 0.585).color(P.CLAY, P.ADOBE)
    for k, (fx, fy) in enumerate(((-0.25, 0.04), (-0.13, -0.02), (-0.2, 0.1))):
        a.blob(0.07, 1, lumps=0).move(fx, fy, tz + 0.7).color(P.RED if k != 1 else P.AMBER)
    a.lathe([(0.08, 0), (0.11, 0.1), (0.07, 0.22), (0.085, 0.27), (0.06, 0.27)], 8).move(0.55, 0.1, tz + 0.57).color(P.TERRACOTTA, P.CLAY)
    a.lathe([(0.07, 0), (0.09, 0.07), (0.07, 0.14), (0.04, 0.14)], 8).move(0.82, -0.14, tz + 0.57).color(P.AMBER, P.GOLD)
    a.box(0.5, 0.2, 0.05, bevel=0).move(-0.82, -0.08, tz + 0.57).color(P.THATCH, P.STRAW)

    # ---- beehives at the edge of the clearing --------------------------------------------
    beehive(a, -1.82, 1.02, top, -62, 2, P.CREAM)
    beehive(a, -1.32, 1.6, top, -40, 3, "#f1d88a")
    beehive(a, -0.62, 1.92, top, -18, 2, "#b9d7e4")

    # ---- a picking ladder, baskets and flower beds ---------------------------------------
    t = math.radians(-16)
    foot, head = Vector((math.cos(t) * 2.55, math.sin(t) * 2.55, top)), Vector((math.cos(t) * 3.3, math.sin(t) * 3.3, top + 1.7))
    side = Vector((-math.sin(t), math.cos(t), 0)) * 0.17
    for sgn in (-1, 1):
        rod(a, foot + side * sgn, head + side * sgn, 0.028, 4).color(P.PINE_WOOD)
    for k in range(1, 6):
        p = foot.lerp(head, k / 6.2)
        rod(a, p - side, p + side, 0.02, 4).color(P.PINE_WOOD)
    for k, (bx, by) in enumerate(((1.75, -0.95), (1.42, -1.32))):
        a.lathe([(0.13, 0), (0.2, 0.2), (0.17, 0.2)], 8).move(bx, by, top).color(P.THATCH, P.STRAW)
        a.blob(0.15, 1, (1, 1, 0.55), lumps=0.12, seed=k + 2).move(bx, by, top + 0.2).color(P.RED if k == 0 else "#f6c8d8")
    rnd = random.Random(21)
    for k in range(10):
        ang = math.radians(k * 36 + rnd.uniform(-9, 9))
        dist = rnd.uniform(4.0, 4.4) if k % 2 else rnd.uniform(1.9, 2.2)
        a.blob(rnd.uniform(0.17, 0.25), 1, (1.2, 1, 0.6), lumps=0.2, seed=k + 21).move(math.cos(ang) * dist + 0.1, math.sin(ang) * dist, top + 0.07).color(
            *(("#e88fb6", "#f7b9d2") if k % 3 else ("#e9bf4a", "#f8dc7a"))
        )


# --------------------------------------------------------------------------------------------
# S10 · Out of Eden (orbit)
# --------------------------------------------------------------------------------------------
def shell_sector(a, x0, x1, t0, t1, r_in, r_out, n_ang, n_len):
    """A closed sector of cylindrical shell about the x axis, between angles t0 and t1 (radians,
    measured from +y toward +z)."""
    verts, faces = [], []
    row = n_ang + 1
    for r in (r_out, r_in):
        for i in range(n_len + 1):
            x = x0 + (x1 - x0) * i / n_len
            for j in range(row):
                t = t0 + (t1 - t0) * j / n_ang
                verts.append((x, math.cos(t) * r, math.sin(t) * r))
    inner = (n_len + 1) * row
    at = lambda layer, i, j: layer * inner + i * row + j  # noqa: E731
    for i in range(n_len):
        for j in range(n_ang):
            faces.append((at(0, i, j), at(0, i + 1, j), at(0, i + 1, j + 1), at(0, i, j + 1)))
            faces.append((at(1, i, j), at(1, i, j + 1), at(1, i + 1, j + 1), at(1, i + 1, j)))
        faces.append((at(0, i, 0), at(1, i, 0), at(1, i + 1, 0), at(0, i + 1, 0)))
        faces.append((at(0, i, n_ang), at(0, i + 1, n_ang), at(1, i + 1, n_ang), at(1, i, n_ang)))
    for j in range(n_ang):
        faces.append((at(0, 0, j), at(0, 0, j + 1), at(1, 0, j + 1), at(1, 0, j)))
        faces.append((at(0, n_len, j), at(1, n_len, j), at(1, n_len, j + 1), at(0, n_len, j + 1)))
    return a.raw(verts, faces)


def inside(piece, x, theta, r):
    """Stand a piece built on z = 0 on the inner wall of a drum about the x axis, at angle
    `theta` (degrees from +y toward +z), its top toward the axis."""
    t = math.radians(theta)
    return piece.rot(x=theta + 90).move(x, math.cos(t) * r, math.sin(t) * r)


@asset(
    "lm-habitat",
    tint="#ffffff",
    grounded=False,
    budget=4500,
    note="S10: an inhabited habitat drum riding the rail, which threads its 0.46-radius bore along x. +z is away from Earth; thermal wings at +-y.",
)
def habitat(a):
    hull_lo, hull = jk.mix(P.OFF_WHITE, P.STEEL, 0.3), P.OFF_WHITE
    gold_lo, gold = "#b8923c", "#e2bf5c"
    steel = (P.STEEL_DARK, P.STEEL)
    HALF, R_OUT, R_IN = 3.8, 1.6, 1.43
    LAND = ("#63b356", "#86cc62", "#4c9a50", "#a9d870", "#d8c860")
    n_len = 8

    # ---- the drum: three hull strips, each carrying a strip of land inside ------------------
    strips = (90, 210, 330)
    for s, centre in enumerate(strips):
        t0, t1 = math.radians(centre - 30), math.radians(centre + 30)
        strip = shell_sector(a, -HALF, HALF, t0, t1, R_IN, R_OUT, 3, n_len).color(hull_lo, hull)

        def tone(f, s=s, t0=t0, t1=t1):
            c = f.calc_center_median()
            radial = Vector((0, c.y, c.z)).normalized()
            facing = f.normal.dot(radial)
            if facing > 0.5:
                return None
            if facing > -0.5:
                return P.STEEL
            i = min(n_len - 1, int((c.x + HALF) / (2 * HALF) * n_len))
            j = min(2, int(((math.atan2(c.z, c.y) - t0) % TAU) / (t1 - t0) * 3))
            if j == 1 and 2 <= i <= 5:
                return "#58bfd6"  # a river runs down the middle of the valley
            return LAND[(i * 3 + j * 2 + s) % 5]

        strip.paint(tone)
        t = math.radians(centre)
        beam(a, (-3.5, math.cos(t) * 1.585, math.sin(t) * 1.585), (3.5, math.cos(t) * 1.585, math.sin(t) * 1.585), 0.36, 0.05, side=(0, -math.sin(t), math.cos(t))).part(
            "glass"
        ).color(P.NAVY, jk.mix(P.NAVY, P.BLUE, 0.6))
        # A town, a hamlet and a few woods on every strip.
        town = ((-2.5, -17, 0.2, 0.16, P.TERRACOTTA), (-2.25, -19, 0.16, 0.24, P.OFF_WHITE), (-2.6, 15, 0.18, 0.13, P.SLATE),
                (0.55, 18, 0.2, 0.2, P.OFF_WHITE), (0.85, 16, 0.16, 0.12, P.TERRACOTTA), (2.6, -16, 0.2, 0.15, P.TERRACOTTA), (2.3, 17, 0.17, 0.2, P.OFF_WHITE))
        for x, dt, w, h, roof in town:
            inside(a.box(w, w * 0.8, h, bevel=0).color(P.CREAM).paint_up(roof), x * (1 if s != 1 else -1), centre + dt, R_IN - 0.005)
        for x, dt in ((-2.35, -14), (0.7, 13), (2.45, 13)):
            inside(a.box(0.07, 0.07, 0.05, bevel=0), x * (1 if s != 1 else -1), centre + dt, R_IN - 0.3).part("glow").color(P.LAMP).no_ao()
        for k, (x, dt) in enumerate(((-1.2, 18), (-0.9, -19), (1.6, -18), (3.2, 4), (-3.3, -3))):
            inside(a.lathe([(0, 0.0), (0.12, 0.07), (0, 0.2)], 5).flat(), x, centre + dt, R_IN).color(P.LEAF_DEEP, P.LEAF)
    _tally(a, "drum")

    # ---- window bands: open bays between the strips, glazing bars only ----------------------
    for centre in (30, 150, 270):
        for dt in (-10, 10):
            t = math.radians(centre + dt)
            rod(a, (-HALF, math.cos(t) * 1.55, math.sin(t) * 1.55), (HALF, math.cos(t) * 1.55, math.sin(t) * 1.55), 0.035, 4).part("metal").color(*steel)
        for x in (-2.85, -0.95, 0.95, 2.85):
            arc = [(x, math.cos(math.radians(centre + dt)) * 1.55, math.sin(math.radians(centre + dt)) * 1.55) for dt in (-30, -10, 10, 30)]
            a.tube(arc, 0.032, 3).part("metal").color(*steel)
    _tally(a, "glazing")

    # ---- structural hoops ------------------------------------------------------------------
    for x, w in ((-HALF + 0.08, 0.3), (-1.9, 0.18), (0.0, 0.18), (1.9, 0.18), (HALF - 0.08, 0.3)):
        hoop = band(a, R_OUT + 0.07, R_IN - 0.02, w, 18).rot(y=90).move(x - w / 2, 0, 0)
        hoop.part("metal").color(*((gold_lo, gold) if w > 0.2 else steel))
    _tally(a, "hoops")

    # ---- the spine sleeve the rail runs through, with the strip lights of the long day -----
    rod(a, (-HALF, 0, 0), (HALF, 0, 0), 0.46, 8, caps="none").color(hull_lo, hull)
    for centre in strips:
        t = math.radians(centre)
        beam(a, (-3.4, math.cos(t) * 0.47, math.sin(t) * 0.47), (3.4, math.cos(t) * 0.47, math.sin(t) * 0.47), 0.2, 0.05, side=(0, -math.sin(t), math.cos(t))).part(
            "glow"
        ).color(P.GLOW_WHITE).no_ao()

    # ---- end caps: a windowed gallery, a bearing, the still hub and its docking collar -----
    with a.group() as cap:
        shell = a.lathe([(R_OUT, 0), (R_OUT, 0.1), (1.3, 0.34), (1.3, 0.54), (1.0, 0.76), (0.86, 0.76)], 18).color(hull_lo, hull)
        shell.paint(lambda f: "#bfe3f2" if f.normal.z < -0.9 else None)
        for k in range(9):
            a.box(0.3, 0.04, 0.1, bevel=0).move(0, -1.305, 0.39).rot(z=k * 40 + 20).part("lit").color(P.WINDOW)
        still = a.lathe([(0.9, 0.75), (0.9, 0.84), (0.8, 0.87), (0.8, 1.11), (0.76, 1.15), (0.6, 1.15)], 12, cap_bottom=False, cap_top=False).color(hull_lo, hull)
        still.paint(lambda f: P.GUNMETAL if f.calc_center_median().z < 0.86 else None)
        collar = a.lathe([(0.72, 1.14), (0.72, 1.27), (0.69, 1.3), (0.49, 1.3), (0.46, 1.27), (0.46, 1.17)], 12, cap_bottom=False).part("metal").color(gold_lo, gold)
        collar.paint(lambda f: P.INK if f.normal.z > 0.9 and f.calc_center_median().z < 1.2 else None)
        band(a, 0.64, 0.54, 0.02, 12).move(0, 0, 1.295).part("glow").color("#fff1c4").no_ao()
    cap.rot(y=90).move(HALF, 0, 0)
    cap.mirror("x")
    _tally(a, "caps")

    # ---- thermal wings: gold radiators on a spar slung between the two hubs -----------------
    hub_x = HALF + 0.99
    for s in (-1, 1):
        for sx in (-1, 1):
            rod(a, (sx * hub_x, s * 0.76, 0), (sx * hub_x, s * 2.1, 0), 0.08, 6).part("metal").color(*steel)
            a.box(0.2, 0.2, 0.2, bevel=0).move(sx * hub_x, s * 2.1, -0.1).part("metal").color(*steel)
        rod(a, (-hub_x, s * 2.1, 0), (hub_x, s * 2.1, 0), 0.07, 6).part("metal").color(*steel)
        with a.group() as wing:
            for k in range(4):
                cx = -3.0 + 2.0 * k
                slab = a.box(1.86, 2.7, 0.07, bevel=0.02).move(cx, s * 3.6, -0.035).part("metal").color(gold_lo, gold, "y" if s > 0 else "z")
                slab.paint(lambda f: hull if f.normal.z < -0.9 else None)
                a.box(0.5, 0.24, 0.1, bevel=0).move(cx, s * 2.2, -0.05).part("metal").color(P.STEEL_DARK)
            for y in (2.95, 3.6, 4.25):
                rod(a, (-3.93, s * y, 0.05), (3.93, s * y, 0.05), 0.036, 4).color(hull)
        wing.rot(x=-s * 11.5, pivot=(0, s * 2.1, 0))
    _tally(a, "wings")

    # ---- a shuttle on the docking port of one hub, a dish on the other ----------------------
    a.cyl(0.15, 0.14, 8, bevel=0.02).move(hub_x, 0, 0.76).part("metal").color(gold_lo, gold)
    with a.group() as ship:
        a.loft([(-0.62, 0, 0, 0.0), (-0.5, 0.1, 0.08, 0.0), (-0.1, 0.19, 0.15, 0.0), (0.36, 0.19, 0.15, 0.0), (0.5, 0.14, 0.11, 0.0)], 8, 2.6).color(hull_lo, hull).smooth(60)
        a.box(0.2, 0.14, 0.05, bevel=0.015).move(0, -0.38, 0.07).part("glass").color(P.GLASS_DARK)
        for sx in (-1, 1):
            a.box(0.26, 0.34, 0.035, bevel=0.01, taper=(0.5, 0.7)).rot(y=90 - 90).move(sx * 0.27, 0.22, -0.03).color(hull_lo, hull)
        a.cyl(0.09, 0.04, 8, bevel=0).rot(x=-90).move(0, 0.5, 0).part("glow").color(P.GLOW_CYAN)
    ship.rot(z=90).move(hub_x - 0.1, 0, 1.04)
    with a.group() as dish:
        a.lathe([(0, 0.2), (0.22, 0.24), (0.4, 0.35), (0.4, 0.385), (0.21, 0.275), (0, 0.235)], 10).color(hull_lo, hull)
        a.cyl(0.05, 0.22, 6, bevel=0).color(P.STEEL_DARK)
        rod(a, (0, 0, 0.23), (0, 0, 0.5), 0.022, 3).part("metal").color(gold)
    dish.rot(y=-18).move(-hub_x, 0, 0.78)
    _tally(a, "ends")


def sail_membrane(a, L, n, billow, scallop, thick, tones):
    """A square sail in four quadrants between booms along x and y, corners L from the centre.

    Every quadrant is held along its two booms, bellies up to `billow` at its free edge and
    draws that edge in by `scallop`. Rows of facets alternate between the two `tones`.
    """
    verts, faces, rows, index = [], [], [], {}

    def vert(sx, sy, i, j):
        key = (sx * i, sy * j)
        if key not in index:
            p, q = L * i / n, L * j / n
            w = 4 * p * q / (L * L)
            shrink = 1 - scallop * w * ((p + q) / L) ** 2
            index[key] = len(verts)
            verts.append((sx * p * shrink, sy * q * shrink, billow * w**0.75))
        return index[key]

    for sx, sy in ((1, 1), (-1, 1), (-1, -1), (1, -1)):
        flip = sx * sy < 0
        for i in range(n):
            for j in range(n - i):
                tris = [((i, j), (i + 1, j), (i, j + 1))]
                if i + j < n - 1:
                    tris.append(((i + 1, j), (i + 1, j + 1), (i, j + 1)))
                for band_no, tri in enumerate(tris, i + j):
                    face = [vert(sx, sy, *corner) for corner in tri]
                    faces.append(tuple(reversed(face)) if flip else tuple(face))
                    rows.append(band_no)
    piece = a.raw(verts, faces)
    for f, row in zip(piece.bm.faces, rows):
        c = jk.col(tones[row % 2])
        for loop in f.loops:
            loop[piece.layer] = (c[0], c[1], c[2], 1.0)
    if sum(f.normal.z for f in piece.bm.faces) < 0:
        bmesh.ops.reverse_faces(piece.bm, faces=piece.bm.faces[:])
    piece.solidify(thick)
    bmesh.ops.recalc_face_normals(piece.bm, faces=piece.bm.faces[:])
    piece.bm.normal_update()
    return piece


@asset(
    "lm-light-sail",
    tint="#ffffff",
    grounded=False,
    budget=4500,
    note="S10: the departing light sail. The probe sits at the origin, its mast up +z; the sail is trimmed 20 degrees, low corner toward -y.",
)
def light_sail(a):
    hull_lo, hull = jk.mix(P.OFF_WHITE, P.STEEL, 0.3), P.OFF_WHITE
    gold_lo, gold = "#b8923c", "#e8c86a"
    L, BALL, DROP, TRIM = 5.56, 5.1, 0.42, 20.0

    # ---- the sail: four foil quadrants on a cross of booms, trimmed on a gimbal -------------
    place = Matrix.Translation((0, 0, BALL)) @ Matrix.Rotation(math.radians(TRIM), 4, "X") @ Matrix.Translation((0, 0, DROP))
    with a.group() as sail:
        foil = sail_membrane(a, L, 6, 0.46, 0.11, 0.05, ("#e8c86a", "#dbb755")).part("metal").smooth(18)
        foil.paint(lambda f: "#b08a3a" if f.normal.z < -0.3 else None)
        for k in range(4):
            c, s = math.cos(k * TAU / 4), math.sin(k * TAU / 4)
            a.tube([(c * 0.4, s * 0.4, -0.025), (c * L * 0.5, s * L * 0.5, -0.025), (c * (L + 0.1), s * (L + 0.1), -0.025)], [0.1, 0.085, 0.055], 6).part("metal").color(hull)
            a.sphere(0.1, 8, 5).move(c * (L + 0.1), s * (L + 0.1), -0.025).part("metal").color(gold)
        a.cyl(0.56, 0.2, 12, bevel=0.04).move(0, 0, -0.1).color(hull_lo, hull)
        a.cyl(0.3, 0.08, 12, bevel=0.02).move(0, 0, 0.09).part("metal").color(gold_lo, gold)
        a.cyl(0.34, 0.18, 10, bevel=0.03).move(0, 0, -0.27).part("metal").color(P.STEEL_DARK, P.STEEL)
    sail.apply(place)
    a.sphere(0.2, 10, 6).move(0, 0, BALL).part("metal").color(gold_lo, gold)

    # ---- mast and rigging ------------------------------------------------------------------
    a.tube([(0, 0, 1.2), (0, 0, BALL - 0.12)], [0.1, 0.07], 8).part("metal").color(hull_lo, hull)
    for z in (1.9, 3.1):
        a.cyl(0.15, 0.14, 8, bevel=0.03).move(0, 0, z - 0.07).part("metal").color(gold_lo, gold)
    for k in range(4):
        c, s = math.cos(k * TAU / 4), math.sin(k * TAU / 4)
        tip = place @ Vector((c * (L + 0.1), s * (L + 0.1), -0.025))
        mid = place @ Vector((c * L * 0.5, s * L * 0.5, -0.1))
        rod(a, (c * 0.36, s * 0.36, 1.0), tip, 0.03, 4).part("metal").color(P.CHROME)
        rod(a, (c * 0.1, s * 0.1, 3.1), mid, 0.024, 4).part("metal").color(P.CHROME)

    # ---- the probe: a small hexagonal bus with one point of light ---------------------------
    a.lathe([(0.2, 0.12), (0.4, 0.2), (0.44, 0.3), (0.44, 0.82), (0.36, 0.95), (0.14, 1.22), (0.1, 1.3)], 6, turn=math.radians(30)).color(hull_lo, hull).smooth(40)
    a.lathe([(0.445, 0.34), (0.47, 0.37), (0.47, 0.56), (0.445, 0.59)], 6, cap_bottom=False, cap_top=False, turn=math.radians(30)).part("metal").color(gold_lo, gold).smooth(40)
    a.torus(0.37, 0.03, 12, 4).move(0, 0, 1.0).part("metal").color(P.STEEL)
    a.lathe([(0.15, 0.16), (0.2, 0.02), (0.34, -0.28), (0.31, -0.28), (0.16, 0.02)], 10).part("metal").color(P.GUNMETAL, P.STEEL_DARK)
    a.sphere(0.26, 12, 6).move(0, 0, -0.5).part("glow").color("#9fe0ff")
    # A dish for the long call home, two small cell panels and a sensor boom.
    rod(a, (0, -0.4, 0.62), (0, -0.74, 0.5), 0.03, 4).part("metal").color(P.STEEL)
    with a.group() as dish:
        a.lathe([(0, 0.0), (0.2, 0.04), (0.36, 0.14), (0.36, 0.17), (0.19, 0.07), (0, 0.035)], 10).color(hull_lo, hull)
        rod(a, (0, 0, 0.03), (0, 0, 0.26), 0.016, 3).part("metal").color(P.STEEL)
        a.sphere(0.04, 6, 4).move(0, 0, 0.26).part("metal").color(gold)
    dish.rot(x=140).move(0, -0.76, 0.5)
    for sx in (-1, 1):
        rod(a, (sx * 0.42, 0, 0.6), (sx * 0.62, 0, 0.6), 0.025, 4).part("metal").color(P.STEEL)
        a.box(0.56, 0.36, 0.03, bevel=0.008).move(sx * 0.9, 0, 0.585).part("glass").color(P.NAVY, jk.mix(P.NAVY, P.BLUE, 0.6), "y")
    rod(a, (0, 0.4, 0.7), (0, 1.25, 0.86), 0.02, 4).part("metal").color(P.STEEL)
    a.box(0.1, 0.14, 0.1, bevel=0.02).move(0, 1.27, 0.81).color(P.CHARCOAL)
