"""Trees, shrubs, ground cover, rock, ice and the engineered flora of scenario S5.

Foliage is the tint part, painted light on top and deeper underneath, so one instance colour reads
as sunlit leaves. Trunks, soil, fruit and cut wood keep authored colours. Kinds the worlds recolour
as a whole (bush, grass, cactus, dead-tree, boulder, rocks, ice-block, coral) are tint
throughout; the shrub's leaves are tint, its wood and berries authored. Organic forms are
faceted; only the designed S5 flora is smooth.

All of it is original interpretive artwork: no species, count or dimension encodes a measurement.
"""

import math
import random

import bmesh
from mathutils import Vector

from kit import jk, parts
from kit import palette as P
from kit.jk import asset

TAU = math.tau


# --------------------------------------------------------------------------------------------
# Module helpers
# --------------------------------------------------------------------------------------------
def _piece(bm, part="base"):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    return jk.Piece(bm, part)


def polar(radius, degrees, z=0.0):
    a = math.radians(degrees)
    return (math.cos(a) * radius, math.sin(a) * radius, z)


def sunlit(piece, low=P.SHADE_2, high=P.WHITE, under=P.SHADE_3, limit=-0.35):
    """Tint paint for foliage: a height gradient, then deeper tone on faces that look down."""
    piece.color(low, high)
    return piece.paint(lambda f: under if f.normal.z < limit else None)


def facet_light(piece, low=P.SHADE_3, high=P.WHITE, lift=0.0):
    """Tint paint for rock and ice: every facet takes one tone from how far it faces the sky."""
    lo, hi = piece.bounds()
    span = (hi.z - lo.z) or 1.0

    def pick(f):
        up = (f.normal.z + 1) / 2
        height = (f.calc_center_median().z - lo.z) / span
        return jk.mix(low, high, min(1.0, max(0.0, 0.72 * up + 0.28 * height + lift)))

    return piece.paint(pick)


def sweep(path, sections, side=(0, 1, 0), open_start=False):
    """Skin custom cross-sections along a path that lies in one plane.

    `side` is the unit vector square to that plane. Each section is a list of (u, v) offsets:
    u across the path inside the plane, v along `side`. A section of None closes to a point.
    """
    side = Vector(side).normalized()
    pts = [Vector(p) for p in path]
    bm = bmesh.new()
    rings = []
    for i, (p, section) in enumerate(zip(pts, sections)):
        t = (pts[min(len(pts) - 1, i + 1)] - pts[max(0, i - 1)]).normalized()
        n = side.cross(t).normalized()
        if section is None:
            rings.append(bm.verts.new(p))
        else:
            rings.append([bm.verts.new(p + n * u + side * v) for u, v in section])
    for a, b in zip(rings, rings[1:]):
        a_point, b_point = not isinstance(a, list), not isinstance(b, list)
        if a_point and b_point:
            continue
        count = len(b) if a_point else len(a)
        for i in range(count):
            j = (i + 1) % count
            if a_point:
                bm.faces.new((a, b[i], b[j]))
            elif b_point:
                bm.faces.new((a[i], a[j], b))
            else:
                bm.faces.new((a[i], a[j], b[j], b[i]))
    if isinstance(rings[0], list) and not open_start:
        bm.faces.new(rings[0][::-1])
    if isinstance(rings[-1], list):
        bm.faces.new(rings[-1])
    return _piece(bm)


def star(radius, ribs, depth, phase=0.0):
    """A ribbed cross-section: `ribs` ridges at `radius` with valleys `depth` deeper."""
    out = []
    for i in range(ribs * 2):
        a = phase + i / (ribs * 2) * TAU
        k = radius if i % 2 == 0 else radius * (1 - depth)
        out.append((math.cos(a) * k, math.sin(a) * k))
    return out


def blade(height, reach, width, thick=None, steps=3, droop=0.0, bow=2.0):
    """A leaf blade rising from the origin and arching toward +x, flat face to the bend."""
    thick = width * 0.32 if thick is None else thick
    path, sections = [], []
    for i in range(steps + 1):
        s = i / steps
        path.append((reach * s**bow, 0, height * (s - droop * s**3)))
        if i == steps:
            sections.append(None)
        else:
            w = width * (0.6 + 1.2 * s) * (1 - s)
            k = thick * (1 - 0.6 * s)
            sections.append([(k, 0), (0, w), (-k, 0), (0, -w)])
    return sweep(path, sections, side=(0, -1, 0)).flat()


def whorl(r, h, points=7, notch=0.74, droop=0.0, turn=0.0, belly=(0.5, 0.4)):
    """One whorl of conifer boughs: a star-rimmed skirt, hollow side down, rim at z = 0.

    `droop` hangs the bough tips below the rim; `belly` is the (radius, height) of the mid ring
    as fractions, so a wide high belly gives an umbrella and a narrow low one a pagoda.
    """
    n = points * 2
    bm = bmesh.new()
    rim, mid = [], []
    for i in range(n):
        a = turn + i / n * TAU
        tip = i % 2 == 0
        rr = r * (1.0 if tip else notch)
        rim.append(bm.verts.new((math.cos(a) * rr, math.sin(a) * rr, -droop if tip else droop * 0.3)))
        mr = r * belly[0] * (1.0 if tip else 0.86)
        mid.append(bm.verts.new((math.cos(a) * mr, math.sin(a) * mr, h * belly[1])))
    apex = bm.verts.new((0, 0, h))
    under = bm.verts.new((0, 0, h * 0.22))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((rim[i], rim[j], mid[j], mid[i]))
        bm.faces.new((mid[i], mid[j], apex))
        bm.faces.new((rim[j], rim[i], under))
    return _piece(bm, "tint").flat()


def scatter(n, seed, rough=0.2):
    """`n` points spread evenly over a unit sphere, each pushed in or out a little."""
    rng = random.Random(seed)
    out = []
    for i in range(n):
        z = 1 - 2 * (i + 0.5) / n
        ring = math.sqrt(max(0.0, 1 - z * z))
        a = i * 2.399963 + rng.uniform(-0.5, 0.5)
        k = 1 + rng.uniform(-rough, rough)
        out.append(Vector((math.cos(a) * ring * k, math.sin(a) * ring * k, z * k)))
    return out


def faceted(points, cuts=(), merge=12.0, chamfer=0.0, open_base=True):
    """A hand-cut solid: the convex hull of `points`, sliced by `cuts` (point, outward normal),
    with nearly coplanar faces merged into clean planes and the edges chamfered."""
    bm = bmesh.new()

    def rehull(coords):
        bm.clear()
        verts = [bm.verts.new(c) for c in coords]
        bmesh.ops.convex_hull(bm, input=verts)
        stray = [v for v in bm.verts if not v.link_faces]
        if stray:
            bmesh.ops.delete(bm, geom=stray, context="VERTS")

    rehull(points)
    for co, no in cuts:
        bmesh.ops.bisect_plane(
            bm,
            geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
            dist=1e-5,
            plane_co=Vector(co),
            plane_no=Vector(no).normalized(),
            clear_outer=True,
        )
        rehull([v.co.copy() for v in bm.verts])
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if merge:
        bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(merge), verts=bm.verts[:], edges=bm.edges[:])
    piece = _piece(bm, "tint").flat()
    if chamfer:
        piece.bevel(chamfer, angle=16)
    if open_base:
        lo, _ = piece.bounds()
        hidden = [f for f in bm.faces if all(v.co.z < lo.z + 1e-4 for v in f.verts)]
        if hidden:
            bmesh.ops.delete(bm, geom=hidden, context="FACES")
        bm.normal_update()
    return piece


def rock(rx, ry, rz, seed, n=14, rough=0.22, sink=0.35, chamfer=0.02, cuts=(), merge=12.0):
    """A faceted rock sitting flat on z = 0: an uneven ellipsoid with its underside cut level."""
    points = []
    for p in scatter(n, seed, rough):
        points.append(Vector((p.x * rx, p.y * ry, max(0.0, p.z * rz + rz * (1 - sink)))))
    return faceted(points, cuts=cuts, merge=merge, chamfer=chamfer)


def tuft(r, squash=(1, 1, 0.85), seed=1, n=16, rough=0.18):
    """A light leaf mass with a few irregular facets, centred on the origin (tint part)."""
    points = [Vector((p.x * r * squash[0], p.y * r * squash[1], p.z * r * squash[2])) for p in scatter(n, seed, rough)]
    return faceted(points, merge=0, open_base=False)


def limb(a, points, radii, sides=6, colour=P.BARK):
    return a.tube(points, radii, sides).color(jk.shade(colour, -0.14), jk.shade(colour, 0.08)).flat()


# --------------------------------------------------------------------------------------------
# Broadleaf trees
# --------------------------------------------------------------------------------------------
@asset("oak", tint="#4f8f3e", budget=900)
def oak(a):
    parts.trunk(a, 1.05, 0.13, lean=0.06)
    # Two boughs reach into the crown so the canopy reads as carried, not floating.
    a.tube([(0.03, 0, 0.7), (0.3, 0.05, 1.05), (0.42, 0.08, 1.3)], [0.07, 0.055, 0.04], 6).color(P.BARK).flat()
    a.tube([(0.03, 0, 0.8), (-0.28, -0.06, 1.1), (-0.4, -0.1, 1.32)], [0.065, 0.05, 0.035], 6).color(P.BARK).flat()
    parts.canopy(
        a,
        [
            (0.05, 0.02, 1.52, 0.56, 0.84),
            (0.42, 0.1, 1.38, 0.4, 0.82),
            (-0.4, -0.1, 1.4, 0.42, 0.8),
            (0.0, 0.3, 1.78, 0.36, 0.85),
            (-0.05, -0.32, 1.25, 0.3, 0.8),
        ],
        seed=4,
    )


@asset("oak-small", tint="#5f9a44", budget=900)
def oak_small(a):
    # A young oak: a short stout trunk, two boughs and a crown of three lumps.
    parts.trunk(a, 0.72, 0.085, lean=-0.04, flare=1.6)
    limb(a, [(-0.02, 0, 0.44), (0.17, 0.05, 0.64), (0.25, 0.07, 0.82)], [0.045, 0.035, 0.024], 5)
    limb(a, [(-0.03, 0, 0.5), (-0.16, -0.12, 0.66), (-0.21, -0.17, 0.78)], [0.04, 0.03, 0.02], 5)
    parts.canopy(
        a,
        [
            (-0.03, 0.03, 1.06, 0.38, 0.88, 2),
            (0.24, 0.08, 0.9, 0.25, 0.84, 2),
            (-0.21, -0.17, 0.86, 0.24, 0.84, 2),
        ],
        seed=9,
    )


@asset("birch", tint="#8cbf5a", budget=900)
def birch(a):
    # Slender pale trunk with a gentle sway and dark lenticel dashes.
    marks = [(0.26, 20), (0.6, 205), (0.92, 100), (1.22, 300), (1.5, 60), (1.78, 190)]
    band = 0.075
    levels = sorted({0.0, 0.1, 2.1, 2.5} | {z for z, _ in marks} | {round(z + band, 3) for z, _ in marks})

    def sway(z):
        return 0.045 * math.sin(z * 1.5)

    def girth(z):
        return 0.07 - 0.021 * z + 0.05 * max(0.0, 0.1 - z) / 0.1

    trunk = a.tube([(sway(z), 0, z) for z in levels], [max(0.014, girth(z)) for z in levels], 6)
    trunk.color(jk.shade(P.CREAM, -0.1), P.OFF_WHITE).flat()

    def pick(f):
        c = f.calc_center_median()
        if c.z < 0.1:
            return P.STONE_DARK
        for z, turn in marks:
            if abs(c.z - (z + band / 2)) < band * 0.4 and f.normal.dot(Vector(polar(1, turn))) > 0.2:
                return P.CHARCOAL
        return None

    trunk.paint(pick)
    pale = jk.shade(P.CREAM, -0.12)
    crown = [
        (0.2, -0.05, 1.34, 0.18, 0.8, 2),
        (-0.21, 0.06, 1.56, 0.2, 0.8, 2),
        (0.19, 0.13, 1.8, 0.22, 0.82, 2),
        (-0.18, -0.15, 1.96, 0.23, 0.84, 2),
        (0.21, -0.09, 2.14, 0.21, 0.84, 2),
        (-0.14, 0.11, 2.27, 0.22, 0.84, 2),
        (0.02, -0.02, 2.47, 0.25, 0.9, 2),
    ]
    # Thin limbs reach out to the lower lumps, so the airy crown is visibly carried.
    for x, y, z, _r, _s, _d in crown[:5]:
        z0 = z - 0.3
        a.tube([(sway(z0), 0, z0), (x * 0.6, y * 0.6, z - 0.12), (x * 0.9, y * 0.9, z - 0.02)], [0.026, 0.019, 0.011], 4).color(pale).flat()
    parts.canopy(a, crown, seed=6)


@asset("cypress", tint="#35603a", budget=700)
def cypress(a):
    parts.trunk(a, 0.5, 0.06, flare=1.6, sides=6)

    def plume(radius, height, sides, seed, twist):
        p = jk.lathe(
            [
                (radius * 0.3, 0),
                (radius * 0.78, height * 0.07),
                (radius, height * 0.24),
                (radius * 0.96, height * 0.44),
                (radius * 0.74, height * 0.66),
                (radius * 0.42, height * 0.86),
                (0, height),
            ],
            sides,
        )

        def spiral(co):
            t = math.radians(twist) * co.z / height
            c, s = math.cos(t), math.sin(t)
            return (co.x * c - co.y * s, co.x * s + co.y * c, co.z)

        p.warp(spiral).jitter(radius * 0.17, seed=seed, scale=2.6)
        return sunlit(p.part("tint").flat(), P.SHADE_2, P.WHITE)

    # One tall flame with two shorter licks hugging its flanks.
    a.add(plume(0.285, 2.62, 8, 3, 70)).move(0, 0, 0.23)
    a.add(plume(0.17, 1.35, 6, 5, -50)).move(0.1, -0.13, 0.2)
    a.add(plume(0.15, 1.05, 6, 8, 60)).move(-0.1, 0.14, 0.18)


@asset("palm", tint="#4f9a3c", budget=900)
def palm(a):
    crown_z, lean = 2.12, -0.32
    husk = jk.mix(P.OAK_WOOD, P.BARK, 0.35)

    def spine(t):
        # Leans out from the root, then straightens: the classic gentle palm curve (toward -y).
        return (0.0, lean * (1 - (1 - t) ** 2.2), crown_z * t)

    # Ringed trunk: stacked cups, each a little wider at its top than the base of the next.
    rings = 9
    pts, radii = [], []
    for k in range(rings):
        t0, t1 = k / rings, (k + 1) / rings
        r = 0.125 - 0.04 * t0 + (0.05 if k == 0 else 0.0)
        pts += [spine(t0 + 0.004), spine(t1)]
        radii += [r * (0.86 if k else 1.0), r * (1.0 if k else 0.78)]
    a.tube(pts, radii, 7).color(jk.shade(husk, -0.22), jk.shade(husk, 0.1)).flat()
    top = Vector(spine(1.0))
    a.blob(0.13, 1, (1, 1, 0.9), lumps=0.1, seed=3).move(top.x, top.y, top.z + 0.03).color(jk.shade(husk, -0.1))
    # Coconuts tucked under the crown.
    for ang, drop in ((250, 0.1), (310, 0.13), (20, 0.09)):
        x, y, _ = polar(0.12, ang)
        a.sphere(0.075, 6, 4).move(top.x + x, top.y + y, top.z - drop).color(jk.shade(P.WALNUT, -0.1), P.WALNUT)

    # Seven thick arched fronds, alternating long and short, plus one young spear.
    def frond(length, width, rise, fall, steps=6):
        path, sections = [], []
        x = z = 0.0
        for i in range(steps + 1):
            s = i / steps
            path.append((x, 0, z))
            ang = math.radians(rise + (fall - rise) * s)
            x += math.cos(ang) * length / steps
            z += math.sin(ang) * length / steps
            if i == steps:
                sections.append(None)
            else:
                w = width * (0.34 + 2.3 * s) * (1 - s) ** 0.9 if s < 0.3 else width * (1.16 - 0.9 * (s - 0.3)) * (1 - s) ** 0.45
                rib = 0.03 * (1 - 0.5 * s)
                sections.append([(-w * 0.55, -w), (rib, 0), (-w * 0.55, w), (rib - 0.04, 0)])
        return sunlit(sweep(path, sections, side=(0, -1, 0)).part("tint").flat(), P.SHADE_2, P.WHITE, limit=-0.2)

    for i in range(7):
        long = i % 2 == 0
        piece = frond(1.04 if long else 0.88, 0.2 if long else 0.18, 36 if long else 54, -72 if long else -50)
        a.add(piece).rot(z=i * 360 / 7 + 12).move(top.x, top.y, top.z + 0.05)
    a.add(frond(0.5, 0.1, 84, 44, 4)).rot(z=200).move(top.x, top.y, top.z + 0.08)


# --------------------------------------------------------------------------------------------
# Conifers: three different trees
# --------------------------------------------------------------------------------------------
@asset("pine", tint="#2f6b3a", budget=700)
def pine(a):
    parts.trunk(a, 0.7, 0.09, color=P.BARK_DARK, flare=1.3)
    tiers = [(0.62, 0.42, 0.95), (0.5, 0.95, 0.85), (0.37, 1.42, 0.75), (0.24, 1.86, 0.82)]
    for k, (r, z, h) in enumerate(tiers):
        skirt = a.lathe([(r * 0.3, 0.02), (r, 0), (r * 0.62, h * 0.34), (r * 0.2, h * 0.8), (0, h)], 8, turn=k * 0.6)
        skirt.jitter(0.035, seed=k + 2, scale=3).move(0, 0, z).part("tint").color(P.SHADE_2, P.WHITE).flat()


@asset("pine-tall", tint="#2a5f36", budget=900)
def pine_tall(a):
    # A tall forest pine: a long bare bole with old branch stubs, and a slim crown held high.
    bark = jk.mix(P.BARK, P.RUST, 0.4)
    a.tube(
        [(0, 0, 0), (0.02, 0, 0.3), (0.05, 0.01, 1.5), (0.03, 0, 2.7), (0, 0, 3.5)],
        [0.22, 0.135, 0.11, 0.07, 0.03],
        7,
    ).color(jk.shade(bark, -0.3), jk.shade(bark, 0.12)).flat()
    for z0, x1, y1, z1 in ((0.9, 0.3, 0.07, 1.04), (1.2, -0.25, -0.1, 1.3)):
        a.tube([(0.04, 0, z0), (x1, y1, z1)], [0.04, 0.02], 5).color(jk.shade(bark, -0.2)).flat()
    tiers = [(0.77, 1.5, 0.74), (0.67, 1.93, 0.7), (0.56, 2.35, 0.66), (0.45, 2.75, 0.6), (0.34, 3.11, 0.55), (0.23, 3.42, 0.48)]
    for k, (r, z, h) in enumerate(tiers):
        tier = a.add(whorl(r, h, points=6, notch=0.64, turn=k * 0.72, belly=(0.46, 0.36)))
        tier.jitter(0.03, seed=k + 11, scale=2.6).move(0.04 * (1 - k / 5), 0, z)
        sunlit(tier)


@asset("spruce", tint="#244f33", budget=900)
def spruce(a):
    # Dense skirts of weeping boughs, the lowest brushing the ground.
    parts.trunk(a, 0.6, 0.1, color=P.BARK_DARK, flare=1.35)
    tiers = [
        (0.73, 0.2, 0.82),
        (0.66, 0.62, 0.8),
        (0.57, 1.05, 0.76),
        (0.48, 1.47, 0.72),
        (0.39, 1.88, 0.68),
        (0.3, 2.27, 0.62),
        (0.2, 2.64, 0.71),
    ]
    for k, (r, z, h) in enumerate(tiers):
        tier = a.add(whorl(r, h, points=8, notch=0.8, droop=0.13 * r + 0.03, turn=k * 0.5, belly=(0.66, 0.36)))
        tier.jitter(0.025, seed=k + 21, scale=2.8).move(0, 0, z)
        sunlit(tier, P.SHADE_3, P.WHITE, jk.shade(P.SHADE_3, -0.2))


# --------------------------------------------------------------------------------------------
# Shrubs and dryland plants
# --------------------------------------------------------------------------------------------
@asset("bush", tint="#5c9445", budget=700)
def bush(a):
    parts.canopy(
        a,
        [
            (0.03, 0.02, 0.33, 0.39, 0.88, 2),
            (0.33, 0.04, 0.24, 0.28, 0.84, 2),
            (-0.3, -0.03, 0.22, 0.27, 0.84, 2),
            (0.07, -0.2, 0.18, 0.23, 0.84, 2),
            (-0.07, 0.19, 0.21, 0.24, 0.84, 2),
        ],
        seed=12,
    )


def leaf_mass(r, seed, n=18, squash=(1.0, 1.0, 0.85), belly=0.5, rough=0.15):
    """A clump of foliage: a faceted hull, domed on top and flattened underneath, where the
    stem enters it. Centred on the origin (tint part)."""
    points = []
    for p in scatter(n, seed, rough):
        z = p.z if p.z > 0 else p.z * belly
        points.append(Vector((p.x * r * squash[0], p.y * r * squash[1], z * r * squash[2])))
    return faceted(points, merge=0, open_base=False)


@asset("shrub", tint="#8a8a4a", budget=700)
def shrub(a):
    # Dryland scrub. Four woody stems fan straight out of the ground, with no trunk, and fork
    # under their leaves: one big lobed pad on top, a ring of smaller ones stepping down around
    # it with gaps between, a bleached dead twig standing clear, and berries under the pads.
    wood = jk.mix(P.BARK, P.OAK_WOOD, 0.4)
    dead = jk.mix(P.STONE, P.CREAM, 0.5)

    def stem(points, radii, sides=4, colour=wood):
        return a.tube(points, radii, sides).color(jk.shade(colour, -0.3), jk.shade(colour, 0.12)).flat()

    stem([(-0.01, 0.01, -0.04), (-0.045, 0.02, 0.1), (-0.05, 0.03, 0.22), (-0.03, 0.03, 0.35)], [0.036, 0.029, 0.022, 0.015], 5)
    stem([(-0.047, 0.025, 0.15), (-0.12, 0.1, 0.19), (-0.165, 0.145, 0.22)], [0.018, 0.014, 0.009])
    stem([(0.015, -0.005, -0.04), (0.075, -0.025, 0.08), (0.15, -0.055, 0.17), (0.185, -0.07, 0.23)], [0.033, 0.026, 0.02, 0.013], 5)
    stem([(0.11, -0.04, 0.12), (0.21, 0.04, 0.12), (0.26, 0.085, 0.145)], [0.016, 0.012, 0.008])
    stem([(-0.015, -0.01, -0.04), (-0.085, -0.04, 0.07), (-0.16, -0.075, 0.15), (-0.195, -0.09, 0.2)], [0.031, 0.024, 0.018, 0.012])
    stem([(-0.06, -0.03, 0.04), (-0.03, -0.14, 0.08), (0.0, -0.205, 0.13)], [0.016, 0.012, 0.008])
    stem([(0.005, 0.015, -0.04), (0.04, 0.09, 0.1), (0.09, 0.15, 0.2), (0.11, 0.175, 0.26)], [0.031, 0.024, 0.018, 0.012])
    # A dead twig, bleached pale, rises through the gap on the leeward side.
    stem([(0.03, 0.01, -0.04), (0.16, 0.06, 0.2), (0.25, 0.06, 0.36), (0.3, 0.05, 0.48)], [0.02, 0.015, 0.01, 0.005], 4, dead)
    stem([(0.22, 0.06, 0.31), (0.31, 0.0, 0.38)], [0.009, 0.005], 3, dead)
    # (centre, radius, hull points, squash, seed) of each pad, largest first. The second entry
    # is a shoulder on the big pad, so the crown has a lobed outline instead of one dome.
    pads = [
        ((-0.02, 0.035, 0.4), 0.172, 30, (1.05, 1.0, 0.82), 41),
        ((-0.125, -0.04, 0.45), 0.1, 16, (1.0, 1.0, 0.8), 48),
        ((0.19, -0.07, 0.27), 0.13, 22, (1.05, 0.95, 0.8), 42),
        ((-0.2, -0.09, 0.235), 0.112, 18, (1.05, 0.95, 0.8), 44),
        ((0.11, 0.18, 0.3), 0.112, 18, (1.0, 1.0, 0.8), 43),
        ((-0.17, 0.15, 0.25), 0.092, 14, (1.0, 1.0, 0.78), 46),
        ((0.0, -0.215, 0.165), 0.082, 14, (1.05, 0.95, 0.78), 45),
        ((0.265, 0.09, 0.165), 0.062, 10, (1.0, 1.0, 0.78), 47),
    ]
    for (x, y, z), r, n, squash, seed in pads:
        sunlit(a.add(leaf_mass(r, seed, n, squash, belly=0.62)).move(x, y, z), P.SHADE_2, P.WHITE, P.SHADE_3)
    # Low suckers at the foot tie the stems to the ground.
    for i, (turn, reach, r) in enumerate(((205, 0.095, 0.06), (20, 0.1, 0.052), (105, 0.085, 0.045))):
        x, y, _ = polar(reach, turn)
        a.add(leaf_mass(r, 50 + i, 10, (1.3, 1.0, 0.7))).move(x, y, -0.02).color(P.SHADE_3, P.SHADE_1)
    # Berries under the pads: three, two and one toward the front, a pair behind.
    spots = {2: [(-72, -28), (-36, -14), (-104, -8)], 3: [(-128, -24), (-165, -30)], 6: [(-80, -20)], 4: [(72, -24), (112, -8)]}
    for index, where in spots.items():
        (x, y, z), r, _n, squash, _seed = pads[index]
        for turn, pitch in where:
            t, k = math.radians(turn), math.radians(pitch)
            d = (math.cos(k) * math.cos(t), math.cos(k) * math.sin(t), math.sin(k) * 0.62)
            a.ico(0.026, 1).move(x + d[0] * r * squash[0] * 0.97, y + d[1] * r * squash[1] * 0.97, z + d[2] * r * squash[2] * 0.97).color(jk.shade(P.RED, -0.3), P.RED)


@asset("cactus", tint="#5d8f4a", budget=700)
def cactus(a):
    # A ribbed saguaro: a tall column with two upturned arms of different heights.
    column = a.add(
        sweep(
            [(0, 0, 0), (0, 0, 0.22), (0, 0, 0.8), (0, 0, 1.38), (0, 0, 1.52), (0, 0, 1.585), (0, 0, 1.6)],
            [star(0.122, 7, 0.24), star(0.148, 7, 0.24), star(0.156, 7, 0.24), star(0.146, 7, 0.24), star(0.112, 7, 0.22), star(0.055, 7, 0.15), None],
            open_start=True,
        )
    )
    column.part("tint").color(P.SHADE_2, P.WHITE).flat()

    def arm(side, root, elbow, top, r=0.086):
        x0, x1 = side * 0.06, side * 0.385
        path = [
            (x0, 0, root),
            (side * 0.25, 0, root),
            (side * 0.34, 0, root + 0.035),
            (x1, 0, root + 0.13),
            (x1, 0, elbow),
            (x1, 0, top - 0.11),
            (x1, 0, top - 0.035),
            (x1, 0, top),
        ]
        ribs = [star(r * k, 5, 0.22, phase=math.pi / 2) for k in (0.92, 0.95, 1.0, 1.0, 1.0, 0.94, 0.6)] + [None]
        return a.add(sweep(path, ribs, open_start=True)).part("tint").color(P.SHADE_2, P.WHITE).flat()

    arm(1, 0.52, 0.8, 1.12)
    arm(-1, 0.8, 1.1, 1.42, r=0.08)
    # One small blossom crowning the column.
    petals = a.lathe([(0.012, 0), (0.07, 0.022), (0.05, 0.05), (0, 0.035)], 6, cap_bottom=False)
    petals.move(0.02, -0.03, 1.585).color(P.PINK, jk.shade(P.PINK, 0.35)).flat()
    a.sphere(0.022, 5, 3).move(0.02, -0.03, 1.635).color(P.YELLOW)


@asset("dead-tree", tint="#6a5a4a", budget=700)
def dead_tree(a):
    # A bare, weathered snag: nothing but trunk, forked limbs and a broken stub.
    def wood(points, radii, sides=5, low=P.SHADE_2, high=P.WHITE):
        return a.tube(points, radii, sides).part("tint").color(low, high).flat()

    wood([(0, 0, 0), (0.02, 0.0, 0.13), (0.07, 0.01, 0.6), (0.03, 0.03, 1.0), (0.0, 0.02, 1.3)], [0.19, 0.125, 0.105, 0.09, 0.07], 6, P.SHADE_3, P.SHADE_1)
    # Right limb with two twigs.
    wood([(0.05, 0.02, 0.9), (0.25, 0.05, 1.22), (0.31, 0.02, 1.5), (0.44, 0.0, 1.76)], [0.07, 0.054, 0.038, 0.014])
    wood([(0.3, 0.03, 1.46), (0.2, 0.14, 1.68), (0.23, 0.21, 1.86)], [0.032, 0.022, 0.01], 4)
    wood([(0.27, 0.04, 1.3), (0.4, -0.08, 1.4), (0.46, -0.13, 1.52)], [0.03, 0.02, 0.009], 4)
    # Left limb, forked.
    wood([(0.01, 0.02, 1.16), (-0.2, -0.03, 1.36), (-0.33, -0.08, 1.4), (-0.44, -0.12, 1.6)], [0.066, 0.048, 0.035, 0.012])
    wood([(-0.27, -0.05, 1.39), (-0.3, 0.03, 1.62), (-0.24, 0.07, 1.8)], [0.03, 0.02, 0.009], 4)
    # Leader with a side shoot.
    wood([(0.0, 0.02, 1.25), (-0.03, -0.05, 1.55), (0.05, -0.13, 1.78), (0.03, -0.19, 1.98)], [0.07, 0.048, 0.03, 0.01])
    wood([(-0.01, -0.07, 1.62), (-0.1, 0.06, 1.8), (-0.07, 0.13, 1.92)], [0.026, 0.017, 0.008], 4)
    # A snapped branch low on the trunk.
    wood([(0.06, 0.0, 0.58), (0.21, -0.1, 0.72)], [0.05, 0.034], 5, P.SHADE_3, P.SHADE_2)


# --------------------------------------------------------------------------------------------
# Ground decor
# --------------------------------------------------------------------------------------------
@asset("stump", tint="#7a5a3a", budget=400)
def stump(a):
    bark = a.lathe([(0.15, 0), (0.125, 0.035), (0.112, 0.1), (0.108, 0.19), (0.098, 0.222)], 9, cap_bottom=False)
    bark.jitter(0.012, seed=5, scale=9).part("tint").color(P.SHADE_3, P.WHITE).flat()
    # Flared roots gripping the ground.
    for i, turn in enumerate((20, 100, 175, 255, 320)):
        reach = 0.165 + 0.012 * (i % 2)
        a.tube([polar(0.07, turn, 0.1), polar(0.125, turn, 0.035), polar(reach, turn, -0.012)], [0.04, 0.034, 0.016], 5).part(
            "tint"
        ).color(P.SHADE_3, P.SHADE_1).flat()
    # The sawn face: pale sapwood, growth rings and a dark heart, cut a little off level.
    wood = jk.shade(P.PINE_WOOD, 0.25)
    cut = a.lathe([(0.104, -0.026), (0.1, 0.0), (0.093, 0.016), (0.07, 0.018), (0.058, 0.018), (0.036, 0.018), (0.024, 0.018), (0, 0.018)], 9, cap_bottom=False)

    def ring(f):
        r = Vector((f.calc_center_median().x, f.calc_center_median().y)).length
        if r > 0.094:
            return None
        return jk.shade(P.OAK_WOOD, -0.1) if 0.058 < r < 0.07 or r < 0.03 else None

    cut.color(wood).paint(lambda f: jk.shade(P.OAK_WOOD, -0.05) if f.normal.z < 0.5 else None).paint(ring)
    cut.rot(x=5, y=-4).move(0, 0, 0.225)
    # New growth: a single sprout beside a root.
    a.tube([(0.085, -0.08, 0.05), (0.108, -0.1, 0.14), (0.102, -0.1, 0.2)], [0.01, 0.008, 0.006], 4).color(P.MOSS)
    for turn in (-50, 140):
        a.add(blade(0.045, 0.05, 0.026, steps=2)).rot(z=turn).move(0.102, -0.1, 0.195).color(P.LEAF, P.LIME)
    for piece in a.pieces:
        piece.scale(1, 0.87, 1)


def blossom(r, petals=5, cup=0.4):
    """A small open flower: a star of ridged petals around the origin, facing up."""
    n = petals * 2
    verts = [(0, 0, r * 0.1), (0, 0, -r * 0.55)]
    for i in range(n):
        a = i / n * TAU
        tip = i % 2 == 0
        k = r if tip else r * 0.62
        verts.append((math.cos(a) * k, math.sin(a) * k, r * cup if tip else r * 0.08))
    faces = []
    for i in range(n):
        j = (i + 1) % n
        faces += [(0, 2 + i, 2 + j), (1, 2 + j, 2 + i)]
    return jk.raw(verts, faces).flat()


@asset("flowers", tint="#f0a8c8", budget=400)
def flowers(a):
    # A small patch: a rosette of leaves, five stems, five blossoms at different heights.
    stems = [(-0.1, 0.09, 0.37, -14, 8), (0.07, 0.15, 0.3, 10, 12), (0.1, -0.1, 0.34, 16, -10), (-0.04, -0.19, 0.24, -8, -18), (-0.16, -0.07, 0.18, -22, -6)]
    for i, (x, y, h, tx, ty) in enumerate(stems):
        top = (x + tx * 0.002, y + ty * 0.002, h)
        a.tube([(x * 0.55, y * 0.55, 0), (x * 0.9, y * 0.9, h * 0.55), top], [0.013, 0.011, 0.009], 4).color(P.LEAF_DEEP, P.LEAF)
        r = 0.068 - 0.006 * (i % 3)
        with a.group() as g:
            a.add(blossom(r)).part("tint").color(P.SHADE_1, P.WHITE)
            a.cone(r * 0.3, r * 0.34, 5, grounded=True).move(0, 0, r * 0.08).color(P.AMBER, P.YELLOW)
        g.rot(x=-ty * 1.4, y=tx * 1.4).rot(z=i * 31).move(*top)
    for i, turn in enumerate((15, 80, 150, 215, 275, 330)):
        leaf = a.add(blade(0.1 + 0.03 * (i % 2), 0.13 + 0.02 * (i % 3), 0.045, steps=3, droop=0.25, bow=1.3))
        leaf.rot(z=turn).move(*polar(0.03, turn)).color(P.LEAF_DEEP, P.LEAF)


@asset("grass", tint="#7fb04f", budget=400)
def grass(a):
    rng = random.Random(8)
    for i in range(9):
        turn = i * 137.5
        outer = i / 8
        height = 0.34 - 0.17 * outer + rng.uniform(-0.02, 0.02)
        reach = 0.03 + 0.1 * outer
        b = a.add(blade(height, reach, 0.03, thick=0.012, steps=3, droop=0.12 * outer, bow=1.8))
        b.rot(z=turn).move(*polar(0.012 + 0.03 * outer, turn))
        b.scale(1, 1.18, 1).part("tint").color(P.SHADE_3, P.WHITE)


@asset("reeds", tint="#9aa65a", budget=400)
def reeds(a):
    rng = random.Random(15)
    head = jk.mix(P.WALNUT, P.BARK_DARK, 0.4)
    spots = [(0.0, 0.02, 0.6, True), (0.08, -0.05, 0.5, True), (-0.08, -0.03, 0.43, True), (0.03, 0.1, 0.52, False), (-0.05, 0.08, 0.36, False), (0.1, 0.06, 0.3, False)]
    for i, (x, y, h, cattail) in enumerate(spots):
        lx, ly = x * 0.45 + rng.uniform(-0.01, 0.01), y * 0.45 + rng.uniform(-0.01, 0.01)
        tip = (x + lx, y + ly, h)
        a.tube([(x, y, 0), (x + lx * 0.4, y + ly * 0.4, h * 0.5), tip], [0.015, 0.012, 0.007], 4).part("tint").color(P.SHADE_3, P.WHITE).flat()
        if cattail:
            # A velvety seed head below the stalk tip.
            hx, hy, hz = x + lx * 0.72, y + ly * 0.72, h * 0.72
            a.lathe([(0, 0), (0.026, 0.014), (0.032, 0.06), (0.026, 0.108), (0, 0.122)], 6).move(hx, hy, hz).color(
                jk.shade(head, -0.15), jk.shade(head, 0.12)
            )
    for i, turn in enumerate((40, 160, 265, 330)):
        leaf = a.add(blade(0.3 + 0.07 * (i % 2), 0.11 + 0.02 * i, 0.024, thick=0.009, steps=3, droop=0.2, bow=2.2))
        leaf.rot(z=turn).move(*polar(0.03, turn)).part("tint").color(P.SHADE_3, P.SHADE_1)


@asset("crop", tint="#d8c35a", budget=400)
def crop(a):
    # A strip of field: a low soil bed with three hilled rows running front to back.
    soil = jk.mix(P.WALNUT, P.RUST, 0.35)
    a.box(0.8, 1.6, 0.045, bevel=0.018, grounded=True).color(jk.shade(soil, -0.3), jk.shade(soil, -0.16))
    rng = random.Random(23)
    for row in (-1, 0, 1):
        x = row * 0.26
        a.box(0.2, 1.5, 0.05, bevel=0, taper=(0.45, 0.97)).move(x, 0, 0.035).color(jk.shade(soil, -0.06), jk.shade(soil, 0.06)).flat()
        for k in range(8):
            y = -0.63 + k * 0.18 + rng.uniform(-0.015, 0.015)
            spin = rng.uniform(0, 120)
            height = 0.155 + rng.uniform(-0.015, 0.02)
            a.cone(0.021, height, 3, grounded=True).rot(z=spin).move(x, y, 0.075).part("tint").color(P.SHADE_2, P.WHITE).flat()
            for j in range(3):
                leaf = a.cone(0.019, height * 0.82, 3, grounded=True).rot(y=36 + rng.uniform(-6, 6)).rot(z=spin + 60 + j * 120)
                leaf.move(x, y, 0.078).part("tint").color(P.SHADE_3, P.SHADE_1).flat()


def vine_leaf(h, w, t=0.024):
    """One broad leaf hanging from its stalk at the origin: tip down, face to the front."""
    points = [(0, 0, 0), (-w, 0, -0.36 * h), (w, 0, -0.36 * h), (0, 0, -h), (0, -t, -0.4 * h), (0, t * 0.6, -0.4 * h)]
    return faceted([Vector(q) for q in points], merge=0, open_base=False)


@asset("vine", tint="#6aa04a", budget=400)
def vine(a):
    # A length of vineyard trellis: three pointed stakes, a fruiting wire and a catch wire, and
    # two old vines trained as a T along the fruiting wire. The leaves stand in separate
    # clusters, big then small, so the stakes, the wires and the heads of the vines show between
    # them, and the bunches hang clear underneath on both sides of the row.
    timber = P.OAK_WOOD
    bark = jk.mix(P.BARK, P.OAK_WOOD, 0.3)
    for x, h in ((-0.63, 0.62), (0.0, 0.58), (0.63, 0.62)):
        a.lathe([(0.045, 0), (0.045, h - 0.07), (0, h)], 4, cap_bottom=False, turn=math.pi / 4).move(x, 0, 0).color(jk.shade(timber, -0.28), timber)
    for z in (0.3, 0.5):
        a.tube([(-0.63, 0, z), (0.63, 0, z)], 0.008, 3).color(P.STEEL_DARK).no_ao()
    for x, bow, left, right in ((-0.27, 0.03, -0.56, -0.07), (0.3, -0.028, 0.07, 0.55)):
        a.tube([(x - bow * 0.3, 0, 0.0), (x + bow, -0.012, 0.16), (x, 0, 0.3)], [0.05, 0.037, 0.034], 4).color(jk.shade(bark, -0.3), jk.shade(bark, 0.1)).flat()
        a.tube([(left, 0, 0.32), (x, 0, 0.304), (right, 0, 0.316)], [0.012, 0.03, 0.012], 4).color(jk.shade(bark, -0.1), jk.shade(bark, 0.12)).flat()
    # Each leaf cluster: (x, z, half-width, half-height, hull points) and the leaves that hang
    # out of it over the fruit, as (side of the row, across, roll, height) in cluster radii.
    low_front, low_back, high_front, high_back = (-1, -0.45, 14, -0.42), (1, 0.38, -12, -0.42), (-1, 0.3, -20, 0.22), (1, -0.32, 18, 0.2)
    clusters = [
        ((-0.44, 0.465, 0.13, 0.145, 16), (low_front, high_front, low_back)),
        ((-0.135, 0.41, 0.085, 0.1, 12), (low_front, low_back)),
        ((0.155, 0.43, 0.1, 0.115, 12), (low_front, low_back)),
        ((0.45, 0.455, 0.118, 0.135, 16), (low_front, high_front, low_back, high_back)),
    ]
    for i, ((x, z, rx, rz, n), leaves) in enumerate(clusters):
        sunlit(a.add(tuft(rz, (rx / rz, 0.07 / rz, 1.0), seed=60 + i, n=n, rough=0.2)).move(x, 0.01 * (-1) ** i, z))
        for face, dx, roll, dz in leaves:
            high = dz > 0
            leaf = a.add(vine_leaf(0.14 * (0.85 + 0.15 * (rx / 0.13)), 0.075)).rot(x=-34 if high else -24).rot(y=roll).rot(z=0 if face < 0 else 180)
            sunlit(leaf.move(x + dx * rx, (0.022 if high else 0.046) * face, z + rz * dz), P.SHADE_2, P.WHITE)
    grape = jk.mix(P.VIOLET, P.NAVY, 0.45)
    for i, (x, y, k) in enumerate(((-0.49, -0.045, 1.0), (-0.14, 0.045, 0.85), (0.17, -0.045, 0.92), (0.47, 0.045, 1.05))):
        # A lumpy drop, broad at the shoulder and blunt at the tip: the solid is turned so that
        # it ends in a facet, not a point.
        bunch = a.ico(0.066 * k, 1).rot(x=37.4).scale(1, 0.88, 1.22).taper(1.0, bottom=0.62).jitter(0.008, seed=i + 3, scale=14)
        bunch.rot(z=40 * i).move(x, y, 0.3 - 0.066 * k).color(jk.shade(grape, -0.3), jk.shade(grape, 0.1)).flat()


@asset("boulder", tint="#8d8a84", budget=400)
def boulder(a):
    # One big rock with a flat base and a broad top plane to sit on.
    body = a.add(rock(0.46, 0.3, 0.34, seed=7, n=15, rough=0.2, sink=0.4, chamfer=0.022, cuts=[((0, 0, 0.48), (0.12, -0.1, 1))]))
    facet_light(body.rot(z=12).move(0, 0, -0.02))
    chip = a.add(rock(0.14, 0.11, 0.1, seed=11, n=10, rough=0.2, sink=0.4, chamfer=0.012))
    facet_light(chip.rot(z=40).move(0.36, -0.22, -0.015), P.SHADE_3, P.SHADE_1)


@asset("rocks", tint="#7d7a74", budget=400)
def rocks(a):
    # A scatter of four: one tall, one squat, two small.
    spec = [
        (0.31, 0.28, 0.36, 3, 14, -0.14, 0.1, 25, 0.02),
        (0.25, 0.21, 0.18, 9, 12, 0.27, -0.16, -30, 0.016),
        (0.15, 0.13, 0.12, 14, 10, -0.06, -0.33, 60, 0.012),
        (0.12, 0.1, 0.09, 19, 9, 0.33, 0.22, 10, 0.01),
    ]
    for rx, ry, rz, seed, n, x, y, turn, chamfer in spec:
        piece = a.add(rock(rx, ry, rz, seed=seed, n=n, rough=0.24, sink=0.38, chamfer=chamfer))
        facet_light(piece.rot(z=turn).move(x, y, -0.02))


@asset("ice-block", tint="#dcecf4", budget=400)
def ice_block(a):
    # A calved chunk: a flat-topped slab with sheer walls, a tall pinnacle and a loose shard.
    deep = jk.mix(P.SHADE_2, P.SKY, 0.4)

    def shard(base, top, cuts=(), chamfer=0.012):
        points = [(x, y, 0) for x, y in base] + list(top)
        piece = a.add(faceted(points, cuts=cuts, merge=4, chamfer=chamfer))
        return facet_light(piece, deep, P.WHITE, lift=0.06)

    def lid(x, y):
        # The slab's top is one plane, tipped down toward the front right.
        return (x * 0.92, y * 0.92, 0.4 - 0.1 * x + 0.06 * y)

    footprint = [(-0.46, -0.26), (0.06, -0.4), (0.46, -0.14), (0.4, 0.3), (-0.1, 0.4), (-0.48, 0.2)]
    shard(footprint, [lid(x, y) for x, y in footprint], cuts=[((-0.3, -0.26, 0.3), (-0.5, -0.75, 0.62))]).move(-0.06, -0.02, -0.02)
    shard(
        [(-0.17, -0.14), (0.15, -0.12), (0.14, 0.14), (-0.13, 0.15)],
        [(-0.02, -0.04, 0.63), (0.07, 0.01, 0.5), (-0.03, 0.06, 0.56)],
        chamfer=0.01,
    ).rot(z=25).move(0.27, 0.2, -0.02)
    shard([(-0.12, -0.08), (0.1, -0.1), (0.12, 0.07), (-0.08, 0.1)], [(-0.06, -0.03, 0.19), (0.07, -0.04, 0.11), (0.04, 0.04, 0.15)], chamfer=0.008).rot(
        z=-15
    ).move(0.38, -0.34, -0.02)


# --------------------------------------------------------------------------------------------
# Scenario S5: engineered biosphere
# --------------------------------------------------------------------------------------------
IVORY = jk.mix(P.OFF_WHITE, P.VIOLET, 0.1)
POD_GLOW = jk.mix(P.GLOW_CYAN, P.GLOW_GREEN, 0.5)
GILL_GLOW = jk.shade(P.GLOW_MAGENTA, 0.16)


def pod(a, r, petals=5):
    """A luminous pod held in a petalled cup, base at the origin: cup tint, bulb glow."""
    start = len(a.pieces)
    sides = petals * 2
    cup = a.lathe(
        [(r * 0.2, 0), (r * 0.76, r * 0.22), (r, r * 0.8), (r * 0.9, r * 1.36), (r * 0.7, r * 1.3), (r * 0.5, r * 0.98)],
        sides,
        cap_bottom=False,
        cap_top=False,
    )

    def scallop(co):
        if co.z < r * 1.1:
            return co
        index = round(math.atan2(co.y, co.x) / (TAU / sides)) % sides
        if index % 2 == 0:
            return (co.x * 0.8, co.y * 0.8, co.z + r * 0.44)
        return (co.x, co.y, co.z - r * 0.3)

    cup.warp(scallop).part("tint").color(P.SHADE_2, P.WHITE).smooth(60)
    a.dome(r * 0.66, r * 0.88, sides, 3, grounded=True).move(0, 0, r * 0.9).part("glow").color(POD_GLOW).no_ao()
    return parts.grouped(a, start)


@asset("bio-tree", tint="#c46ad0", budget=900)
def bio_tree(a):
    # A grown sculpture: a bottle-footed trunk whose arms spiral up, each holding one lit pod.
    foot = jk.mix(IVORY, P.VIOLET, 0.22)
    a.tube(
        [(0, 0, 0), (0, 0, 0.1), (0.01, 0, 0.3), (0.03, 0.01, 0.62), (0.02, 0, 0.95), (0, 0, 1.38)],
        [0.19, 0.215, 0.15, 0.08, 0.07, 0.06],
        9,
    ).color(foot, IVORY).smooth(70)
    # Two growth bands on the neck carry the instance colour down the trunk.
    for z, r in ((0.46, 0.108), (0.72, 0.078)):
        a.lathe([(r - 0.03, -0.03), (r + 0.026, -0.014), (r + 0.026, 0.014), (r - 0.03, 0.03)], 9, cap_bottom=False, cap_top=False).move(
            0.02, 0.005, z
        ).part("tint").color(P.SHADE_2, P.WHITE)
    arms = [(35, 0.47, 0.82, 1.1, 0.185), (155, 0.45, 0.93, 1.22, 0.17), (275, 0.46, 1.03, 1.33, 0.175)]
    for turn, reach, root, z, r in arms:
        rise = z - root
        a.tube(
            [
                polar(0.02, turn, root),
                polar(reach * 0.4, turn, root + rise * 0.04),
                polar(reach * 0.76, turn, root + rise * 0.26),
                polar(reach * 0.96, turn, root + rise * 0.66),
                polar(reach, turn, z + 0.02),
            ],
            [0.058, 0.05, 0.044, 0.042, 0.05],
            6,
        ).color(jk.shade(IVORY, -0.08), IVORY).smooth(70)
        pod(a, r, 4).rot(z=turn).move(*polar(reach, turn, z))
    pod(a, 0.245, 5).rot(z=18).move(0, 0, 1.34)


def shroom(a, x, y, height, cap_r, lean, turn, dome_h, spots, sides=10):
    """One giant mushroom leaning toward `turn`: ivory stem, tinted cap, glowing gills and spots."""
    start = len(a.pieces)
    stem_top = height - dome_h
    a.tube(
        [(0, 0, 0), (lean * 0.1, 0, stem_top * 0.25), (lean * 0.55, 0, stem_top * 0.7), (lean, 0, stem_top + 0.01)],
        [cap_r * 0.3, cap_r * 0.19, cap_r * 0.16, cap_r * 0.2],
        7,
    ).color(jk.mix(IVORY, P.VIOLET, 0.2), IVORY).smooth(70)
    tilt = math.degrees(math.atan2(lean * 0.45, stem_top * 0.3)) * 0.7
    profile = [(cap_r * 0.9, -0.012), (cap_r, 0.014), (cap_r * 0.9, dome_h * 0.42), (cap_r * 0.62, dome_h * 0.78)]
    profile += [(cap_r * 0.26, dome_h * 0.97)] if sides >= 10 else []
    with a.group() as cap:
        a.lathe(profile + [(0, dome_h)], sides, cap_bottom=False).part("tint").color(P.SHADE_2, P.WHITE).smooth(60)
        a.lathe([(cap_r * 0.17, -0.24 * cap_r), (cap_r * 0.9, -0.012)], sides, cap_bottom=False, cap_top=False).part("glow").color(GILL_GLOW).no_ao()
        for ang, rad in spots:
            px, py, _ = polar(cap_r * rad, ang)
            # Sit each spot on the dome surface.
            pz = dome_h * (1 - rad**2) ** 0.62
            a.dome(cap_r * 0.12, cap_r * 0.05, 5, 1, grounded=True).move(px, py, pz - 0.006).part("glow").color(GILL_GLOW).no_ao()
    cap.rot(y=tilt).move(lean, 0, stem_top)
    return parts.grouped(a, start).rot(z=turn).move(x, y, 0)


@asset("bio-shroom", tint="#6fe0c8", budget=700)
def bio_shroom(a):
    shroom(a, -0.06, 0.06, 0.92, 0.3, 0.05, 160, 0.21, [(40, 0.5), (170, 0.42), (285, 0.56)], sides=12)
    shroom(a, 0.24, -0.03, 0.56, 0.21, 0.08, 10, 0.14, [(100, 0.5), (250, 0.45)], sides=10)
    shroom(a, -0.27, -0.13, 0.37, 0.15, 0.05, 215, 0.1, [(20, 0.4)], sides=8)
    shroom(a, 0.06, -0.22, 0.2, 0.09, 0.02, 280, 0.075, [], sides=8)


@asset("coral", tint="#f07a9a", budget=700)
def coral(a):
    # Branching reef coral: stout stems fork twice from one holdfast, tips blunt and lightest.
    rng = random.Random(52)

    def grow(start, heading, length, radius, depth):
        end = start + heading * length
        tip = end + heading * radius * 0.5
        tone = {2: (P.SHADE_3, P.SHADE_2), 1: (P.SHADE_2, P.SHADE_1), 0: (P.SHADE_1, P.WHITE)}[depth]
        a.tube([start, end, tip], [radius, radius * 0.82, radius * 0.5], 5).part("tint").color(*tone).flat()
        if depth == 0:
            return
        side = heading.cross(Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0.3))).normalized()
        for sign, spread in ((1, rng.uniform(0.5, 0.75)), (-1, rng.uniform(0.35, 0.6))):
            if depth == 1 and sign < 0 and rng.random() < 0.3:
                continue
            new = (heading + side * sign * spread + Vector((0, 0, 0.3))).normalized()
            grow(end - heading * radius * 0.35, new, length * rng.uniform(0.66, 0.82), radius * 0.76, depth - 1)

    a.cyl(0.085, 0.09, 6, r2=0.06, bevel=0.012).move(0, 0, -0.03).part("tint").color(P.SHADE_3, P.SHADE_2).flat()
    for turn, tilt, length in ((80, 0.3, 0.21), (200, 0.5, 0.17), (320, 0.45, 0.19)):
        base = Vector(polar(0.03, turn, 0.02))
        heading = Vector(polar(tilt, turn, 1.0)).normalized()
        grow(base, heading, length, 0.05, 2)
    for piece in a.pieces:
        piece.scale(1, 1.25, 1)
