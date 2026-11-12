"""Landmarks A: the one-of-a-kind set pieces of S1, S2 and S3.

Each model replaces a code-drawn landmark and is authored at TEN TIMES its landmark-spec size (the
web app scales it back down), with the same origin and footprint. They are merged into scene
layers: `base` and `tint` matte, `metal` satin, `glass` glossy, `glow` and `lit` as light.

Everything here is original interpretive artwork of the Project Janus narratives. No dimension,
count or colour encodes a measured or forecast quantity.
"""

import math

import bmesh
from mathutils import Matrix, Vector

from kit import jk, parts
from kit import palette as P
from kit.jk import asset

OCT = 1 / math.cos(math.pi / 8)  # vertex radius of an octagon whose apothem is 1
CORNERS = ((-1, -1), (1, -1), (1, 1), (-1, 1))


# --------------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------------
def polar(r, deg, z=0.0):
    t = math.radians(deg)
    return (math.cos(t) * r, math.sin(t) * r, z)


def _basis(p0, p1, side=(1, 0, 0)):
    """A matrix carrying local z onto p0 -> p1 with local x near `side`, and the length."""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    length = d.length
    d.normalize()
    s = Vector(side)
    x = s - d * s.dot(d)
    if x.length < 1e-4:
        s = Vector((0, 1, 0)) if abs(d.y) < 0.9 else Vector((0, 0, 1))
        x = s - d * s.dot(d)
    x.normalize()
    m = Matrix((x, d.cross(x), d)).transposed().to_4x4()
    m.translation = p0
    return m, length


def bar(a, p0, p1, w, d, bevel=None, side=(1, 0, 0), taper=1.0):
    """A bevelled box member from p0 to p1, `w` wide along `side` and `d` deep."""
    m, length = _basis(p0, p1, side)
    return a.box(w, d, length, bevel=bevel, taper=taper).apply(m)


def strut(a, p0, p1, r, sides=8, bevel=0.0, r2=None):
    """A round member (optionally chamfered or tapered) from p0 to p1."""
    m, length = _basis(p0, p1)
    return a.cyl(r, length, sides, r2=r2, bevel=bevel).apply(m)


def rod(a, p0, p1, r, sides=5):
    return a.tube([p0, p1], r, sides)


def weld(piece):
    """Merge coincident vertices (closed lathe loops) and re-orient the faces."""
    bmesh.ops.remove_doubles(piece.bm, verts=piece.bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(piece.bm, faces=piece.bm.faces[:])
    piece.bm.normal_update()
    return piece


def mesh(a, verts, faces, part="base"):
    """A custom mesh whose winding is trusted (counter-clockwise outside): open sheets, panes."""
    bm = bmesh.new()
    vs = [bm.verts.new(v) for v in verts]
    for f in faces:
        bm.faces.new([vs[i] for i in f])
    bm.normal_update()
    return a.add(jk.Piece(bm, part))


def panes(a, polys, part, colour):
    """Flat polygons as one piece: glazing set into a recess, painted markings, paths."""
    verts, faces = [], []
    for q in polys:
        n = len(verts)
        verts += list(q)
        faces.append(tuple(range(n, n + len(q))))
    return mesh(a, verts, faces, part).color(colour)


def wall_quad(x0, x1, z0, z1, y, rot=0.0, origin=(0.0, 0.0)):
    """A pane on a wall facing -y at depth `y`, turned `rot` degrees about z, then moved."""
    t = math.radians(rot)
    c, s = math.cos(t), math.sin(t)
    pts = [(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)]
    return [(p[0] * c - p[1] * s + origin[0], p[0] * s + p[1] * c + origin[1], p[2]) for p in pts]


def flat_ring(a, r0, r1, z, n=16, colour=P.OFF_WHITE, part="base", start=0.0, sweep=360.0, centre=(0.0, 0.0)):
    """An upward-facing painted ring (or arc) between radii r0 < r1."""
    polys = []
    for i in range(n):
        a0 = start + sweep * i / n
        a1 = start + sweep * (i + 1) / n
        quad = [polar(r1, a0, z), polar(r1, a1, z), polar(r0, a1, z), polar(r0, a0, z)]
        polys.append([(p[0] + centre[0], p[1] + centre[1], p[2]) for p in quad])
    return panes(a, polys, part, colour)


def flat_disc(a, r, z, n=12, colour=P.OFF_WHITE, part="base", centre=(0.0, 0.0), turn=0.0):
    pts = [polar(r, turn + 360 * i / n, z) for i in range(n)]
    return panes(a, [[(p[0] + centre[0], p[1] + centre[1], p[2]) for p in pts]], part, colour)


def _bump(deg, centre, half):
    """A smooth 0..1 window around `centre` degrees, `half` degrees wide each way."""
    d = (deg - centre + 180) % 360 - 180
    return 0.5 * (1 + math.cos(math.pi * d / half)) if abs(d) < half else 0.0


# --------------------------------------------------------------------------------------------
# S1 · Big Brother is Watching
# --------------------------------------------------------------------------------------------
@asset(
    "lm-watchtower",
    tint="#ffffff",
    budget=4500,
    note="S1 capital surveillance tower. The lamp housing is centred on z = 8.4 (0.84 landmark units).",
)
def watchtower(a):
    turn = math.pi / 8
    conc_lo = jk.mix(P.GUNMETAL, P.CONCRETE_DARK, 0.45)
    conc = P.CONCRETE_DARK
    conc_hi = jk.shade(P.CONCRETE_DARK, 0.14)
    dark = jk.mix(P.CHARCOAL, P.INK, 0.3)
    steel = P.GUNMETAL
    amber = P.GLOW_ORANGE

    # Fortified base: a battered octagonal bastion with a coping and a blast portal.
    a.lathe(
        [(2.0 * OCT, 0), (1.8 * OCT, 1.0), (1.87 * OCT, 1.05), (1.87 * OCT, 1.22), (1.78 * OCT, 1.3), (1.0 * OCT, 1.42)],
        8, cap_bottom=False, turn=turn,
    ).smooth(30).color(conc_lo, conc)
    a.box(1.3, 0.5, 1.14, bevel=0.05, grounded=True).move(0, -1.82, 0).color(conc_lo, conc)
    a.box(0.86, 0.06, 0.86, bevel=0.015).move(0, -2.08, 0).color(dark)
    a.box(0.03, 0.07, 0.86, bevel=0).move(0, -2.085, 0).color(P.INK)
    a.box(0.62, 0.05, 0.07, bevel=0.012).move(0, -2.085, 0.95).part("glow").color(amber)
    for rot in (90, 180, 270):
        with a.group() as g:
            a.box(0.9, 0.1, 0.26, bevel=0.02).move(0, 0, -0.13).color(dark)
            a.box(0.7, 0.06, 0.1, bevel=0).move(0, -0.04, -0.05).part("lit").color(amber)
        g.rot(x=-11.3).move(0, -1.876, 0.62).rot(z=rot)
    # Buttress fins brace the shaft on the four diagonals.
    for k in range(4):
        a.profile_x([(-1.74, 1.2), (-0.55, 1.2), (-0.55, 3.75), (-1.74, 1.66)], 0.3, bevel=0.04).rot(
            z=45 + 90 * k
        ).color(conc_lo, conc)

    # Shaft: a tapering octagon with steel bands and slit windows.
    def ap(z):
        return 0.86 - 0.34 * (z - 1.4) / 4.15

    a.lathe([(ap(1.4) * OCT, 1.4), (ap(5.55) * OCT, 5.55)], 8, cap_bottom=False, cap_top=False, turn=turn).smooth(
        30
    ).color(conc, conc_hi)
    for z in (3.8, 4.95):
        r = ap(z)
        a.lathe(
            [((r - 0.02) * OCT, z), ((r + 0.07) * OCT, z + 0.05), ((r + 0.07) * OCT, z + 0.2), ((r - 0.03) * OCT, z + 0.25)],
            8, cap_bottom=False, cap_top=False, turn=turn,
        ).smooth(30).color(dark)
    for rot in (0, 90, 180, 270):
        for z in (2.25, 3.1, 4.35):
            with a.group() as g:
                a.box(0.26, 0.08, 0.48, bevel=0.02).move(0, 0, -0.24).color(dark)
                a.box(0.12, 0.05, 0.34, bevel=0).move(0, -0.035, -0.17).part("lit").color(amber)
            g.rot(x=-4.7).move(0, -ap(z), z).rot(z=rot)

    # Observation ring: a corbelled pod, an amber band, a visor of dark glazing and a ribbed roof.
    n = 16
    a.lathe([(0.5, 5.5), (0.6, 5.52), (1.52, 5.98), (1.7, 6.02), (1.7, 6.1)], n, cap_bottom=False, cap_top=False).color(
        dark, steel
    )
    a.lathe([(1.7, 6.1), (1.76, 6.11), (1.76, 6.23), (1.7, 6.24)], n, cap_bottom=False, cap_top=False).part("glow").color(
        amber
    )
    a.lathe([(1.7, 6.24), (1.86, 6.26), (1.86, 6.34), (1.8, 6.37)], n, cap_bottom=False, cap_top=False).color(dark)
    # The glazing leans back toward the roof, so the ring of windows shows from above.
    a.lathe([(1.8, 6.37), (1.58, 6.86)], n, cap_bottom=False, cap_top=False).part("glass").color(
        P.GLASS_DARK, jk.mix(P.GLASS_DARK, P.GLASS_TINTED, 0.45)
    )
    for k in range(8):
        a.box(0.08, 0.07, 0.55, bevel=0).move(0, 0, -0.275).rot(x=-24.2).move(0, -1.7, 6.615).rot(z=45 * k).color(dark)
    a.lathe(
        [(1.58, 6.86), (1.74, 6.88), (1.74, 6.98), (1.66, 7.03), (0.62, 7.27), (0.5, 7.28)], n, cap_bottom=False, cap_top=False
    ).color(dark, steel)
    for k in range(8):
        bar(a, polar(0.66, 22.5 + 45 * k, 7.265), polar(1.69, 22.5 + 45 * k, 7.03), 0.08, 0.06, bevel=0).color(dark)

    # Second deck with four cameras looking down the diagonals.
    a.lathe([(0.5, 7.26), (0.44, 7.5)], 12, cap_bottom=False, cap_top=False).color(steel)
    a.lathe(
        [(0.44, 7.46), (0.84, 7.53), (0.95, 7.57), (0.95, 7.69), (0.88, 7.75), (0.36, 7.78)], n, cap_bottom=False, cap_top=False
    ).color(dark, steel)
    for k in range(4):
        with a.group() as g:
            with a.group() as cam:
                a.box(0.2, 0.42, 0.17, bevel=0.03).move(0, 0, -0.085).color(P.CONCRETE)
                a.box(0.1, 0.03, 0.09, bevel=0).move(0, -0.215, -0.045).part("glow").color(P.GLOW_RED)
            cam.rot(x=24).move(0, -1.0, 7.42)
            a.box(0.07, 0.07, 0.2, bevel=0).move(0, -0.88, 7.4).color(dark)
        g.rot(z=45 + 90 * k)

    # Lamp housing: an open lantern whose lens sits on z = 8.4, where the searchlight turns.
    a.lathe([(0.36, 7.76), (0.34, 7.88)], 12, cap_bottom=False, cap_top=False).color(steel)
    a.cyl(0.56, 0.12, n, bevel=0.03).move(0, 0, 7.86).color(dark)
    a.cyl(0.3, 0.16, 12, bevel=0.02).move(0, 0, 7.98).color(steel)
    a.cyl(0.26, 0.56, 12, bevel=0.02).move(0, 0, 8.12).part("glow").color(P.LAMP)
    for k in range(6):
        x, y, _ = polar(0.49, 30 + 60 * k)
        a.tube([(x, y, 7.98), (x, y, 8.76)], 0.022, 4).color(dark)
    a.cyl(0.6, 0.12, n, bevel=0.03).move(0, 0, 8.74).color(dark)
    a.lathe([(0.6, 8.84), (0.32, 9.02), (0.32, 9.08)], n, cap_bottom=False).color(steel, dark)
    # Red beacon dome and the mast.
    a.dome(0.28, 0.34, 12, 3).move(0, 0, 9.08).part("glow").color(P.GLOW_RED)
    a.tube([(0, 0, 9.36), (0, 0, 11.86)], [0.065, 0.03], 6).part("metal").color(P.STEEL)
    rod(a, (-0.42, 0, 10.25), (0.42, 0, 10.25), 0.02, 4).part("metal").color(P.STEEL)
    rod(a, (0, -0.3, 10.85), (0, 0.3, 10.85), 0.02, 4).part("metal").color(P.STEEL)
    a.sphere(0.055, 6, 4).move(0, 0, 11.86).part("glow").color(P.GLOW_RED)


@asset(
    "lm-elite-settlement",
    tint="#ffffff",
    grounded=False,
    budget=4500,
    note="S1 orbital ring habitat. Ring axis = z, origin at the hub centre.",
)
def elite_settlement(a):
    R0, rx, rz = 4.85, 0.75, 0.7
    white = P.OFF_WHITE
    under = P.CHROME
    lawn = jk.mix(P.LEAF, P.LIME, 0.5)

    def sec(deg, s=1.0, power=2.5):
        t = math.radians(deg)
        c, sn = math.cos(t), math.sin(t)
        return (
            rx * s * math.copysign(abs(c) ** (2 / power), c),
            rz * s * math.copysign(abs(sn) ** (2 / power), sn),
        )

    def on_ring(deg, phi, s=1.0):
        u, v = sec(deg, s)
        return polar(R0 + u, phi, v)

    # Hull: a fat white torus with a garden trough let into its inner, sunward shoulder.
    order = [(-135, 1), (-90, 1), (-45, 1), (0, 1), (45, 1), (82, 1), (105, 1), (109, 0.8), (137, 0.76), (165, 0.8), (169, 1), (200, 1)]
    prof = [(R0 + sec(d, s)[0], sec(d, s)[1]) for d, s in order]
    prof.append(prof[0])
    hull = weld(a.lathe(prof, 32, cap_bottom=False, cap_top=False)).color(under, white)

    def garden(f):
        c = f.calc_center_median()
        ang = math.degrees(math.atan2(c.z, math.hypot(c.x, c.y) - R0))
        return lawn if 112 < ang < 163 else None

    hull.paint(garden)
    nx, nz = math.cos(math.radians(137)), math.sin(math.radians(137))
    for k in range(16):
        phi = 360 * k / 16
        # A white rib spans the trough like the frame of a glasshouse.
        a.tube([on_ring(104, phi, 1.01), on_ring(137, phi, 1.0), on_ring(170, phi, 1.01)], 0.035, 4).color(white)
        u, v = sec(137 + (7 if k % 2 else -8), 0.76)
        tree = a.blob(0.15 + 0.03 * (k % 3), 1, (1, 1, 0.9), lumps=0.18, seed=k + 3)
        tree.move(*polar(R0 + u + nx * 0.1, phi + 11.25, v + nz * 0.1)).color(P.LEAF_DEEP, P.LEAF)
    # Warm windows in pairs around the rim, above and below a bright equatorial rail.
    slots = []
    for d0, d1, shift in ((20, 34, 0.0), (-34, -20, 11.25)):
        for k in range(16):
            for side in (-1, 1):
                p0 = 360 * k / 16 + shift + side * 2.6 - 1.9
                p1 = p0 + 3.8
                slots.append([on_ring(d0, p0, 1.03), on_ring(d0, p1, 1.03), on_ring(d1, p1, 1.03), on_ring(d1, p0, 1.03)])
    panes(a, slots, "lit", P.WINDOW).no_ao()
    edge = R0 + rx
    a.lathe(
        [(edge - 0.02, -0.09), (edge + 0.05, -0.06), (edge + 0.05, 0.06), (edge - 0.02, 0.09)], 32, cap_bottom=False, cap_top=False
    ).part("metal").color(P.STEEL)

    # Hub: a spindle with a docking port below and a glazed gallery above the spoke collar.
    hs = 12
    a.lathe([(0.42, -1.36), (0.62, -1.3), (0.95, -0.95), (0.95, 0.72), (0.82, 0.98), (0.42, 1.12), (0.36, 1.3)], hs).color(
        under, white
    )
    a.cyl(0.5, 0.26, hs, bevel=0.04).move(0, 0, -1.6).part("metal").color(P.STEEL)
    a.cyl(0.34, 0.03, hs, bevel=0).move(0, 0, -1.615).part("glow").color(P.GLOW_WHITE)
    a.lathe([(0.95, -0.2), (1.04, -0.14), (1.04, 0.14), (0.95, 0.2)], hs, cap_bottom=False, cap_top=False).part("metal").color(
        P.STEEL
    )
    a.lathe([(0.95, 0.32), (0.985, 0.34), (0.985, 0.62), (0.95, 0.64)], hs, cap_bottom=False, cap_top=False).part("glass").color(
        P.GLASS_DARK, P.GLASS_TINTED
    )
    for k in range(6):
        a.box(0.26, 0.05, 0.16, bevel=0).move(0, -0.92, -0.6).rot(z=30 + 60 * k + 90).part("lit").color(P.WINDOW)

    # Four spokes, each with a lift car part-way along.
    for k in range(4):
        phi = 45 + 90 * k
        strut(a, polar(0.98, phi), polar(4.2, phi), 0.2, 8).color(under, white)
        strut(a, polar(1.0, phi), polar(1.24, phi), 0.3, 8, bevel=0.04).part("metal").color(P.STEEL)
        strut(a, polar(3.9, phi), polar(4.16, phi), 0.3, 8, bevel=0.04).part("metal").color(P.STEEL)
        strut(a, polar(2.35, phi), polar(2.85, phi), 0.29, 8, bevel=0.06).color(under, white)
        for s in (-1, 1):
            a.box(0.3, 0.14, 0.03, bevel=0).move(0, 0, -0.015).move(*polar(2.6, phi, s * 0.285)).rot(
                z=phi, pivot=polar(2.6, phi, 0)
            ).part("lit").color(P.WINDOW)

    # One broad solar wing rides above the ring on a boom carried by the hub and the rim.
    zb = 1.46
    cell_lo, cell_hi = jk.mix(P.NAVY, P.BLUE, 0.3), jk.mix(P.NAVY, P.BLUE, 0.62)
    rod(a, (-5.45, 0, zb), (5.45, 0, zb), 0.06, 6).part("metal").color(P.STEEL)
    a.box(0.5, 0.5, 0.3, bevel=0.05).move(0, 0, 1.24).part("metal").color(P.STEEL_DARK)
    for side in (-1, 1):
        cx = side * 3.28
        a.box(4.35, 2.1, 0.05, bevel=0.012).move(cx, 0, zb - 0.025).part("metal").color(P.CHROME)
        for i in range(4):
            for j in (-1, 1):
                a.box(0.98, 0.92, 0.09, bevel=0).move(cx + (i - 1.5) * 1.07, j * 0.5, zb - 0.045).part("glass").color(
                    cell_lo, cell_hi, "y"
                )
        rod(a, (side * 4.85, 0, 0.66), (side * 4.85, 0, zb), 0.05, 5).part("metal").color(P.STEEL)


@asset(
    "lm-allocation-block",
    tint="#a2a4a9",
    budget=4500,
    note="S1 state housing block, 10 x 10 x 11 plus the roof light. `tint` is the concrete. Tolerates vertical stretch.",
)
def allocation_block(a):
    W = 10.0
    half = W / 2
    plinth, pitch, win_h, floors = 0.7, 1.6, 0.98, 6
    top = plinth + floors * pitch  # 10.3: underside of the parapet
    recess = half - 0.25  # the window wall sits a quarter unit behind the frame

    # Recessed window wall, plinth, floor bands and the frame of piers.
    a.box(2 * recess, 2 * recess, top + 0.1, bevel=0, grounded=True).part("tint").color(P.SHADE_3, P.SHADE_2)
    a.box(W, W, plinth, bevel=0.05, grounded=True).part("tint").color(jk.shade(P.SHADE_3, -0.2), P.SHADE_3)
    for k in range(floors):
        a.box(W, W, pitch - win_h, bevel=0.04).move(0, 0, plinth + k * pitch + win_h).part("tint").color(P.SHADE_1, P.WHITE)
    for sx, sy in CORNERS:
        a.box(0.9, 0.9, top - plinth, bevel=0.05).move(sx * (half - 0.39), sy * (half - 0.39), plinth).part("tint").color(
            P.SHADE_1, P.WHITE
        )
    for rot in (0, 90, 180, 270):
        for x in (-2.58, -0.86, 0.86, 2.58):
            if rot == 0 and abs(x) < 1:
                continue  # the stair tower covers these two
            a.box(0.4, 0.34, top - plinth, bevel=0.04).move(x, -(half - 0.11), plinth).rot(z=rot).part("tint").color(
                P.SHADE_1, P.WHITE
            )
    # Parapet and roof.
    a.box(W + 0.16, W + 0.16, 0.7, bevel=0.05).cut(jk.box(W - 0.7, W - 0.7, 2, bevel=0).move(0, 0, -0.5)).move(
        0, 0, top
    ).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(W - 0.6, W - 0.6, 0.12, bevel=0).move(0, 0, top + 0.08).color(P.ASPHALT)

    # The strict window grid: two panes to a bay, some lit warm, some cold, some dark.
    warm, cold, dark = [], [], []
    for rot in (0, 90, 180, 270):
        for k in range(floors):
            z0 = plinth + k * pitch + 0.12
            for b in range(5):
                if rot == 0 and b == 2:
                    continue
                xc = -3.44 + 1.72 * b
                roll = a.rand.random()
                target = dark if roll < 0.34 else (cold if roll > 0.86 else warm)
                for side in (-1, 1):
                    q = wall_quad(xc + side * 0.33 - 0.28, xc + side * 0.33 + 0.28, z0, z0 + 0.76, -(recess + 0.015), rot)
                    (dark if (roll > 0.34 and roll < 0.42 and side == 1) else target).append(q)
    panes(a, warm, "lit", P.WINDOW).no_ao()
    panes(a, cold, "lit", P.GLOW_WHITE).no_ao()
    panes(a, dark, "glass", P.GLASS_DARK)

    # Stair tower on the front: blind concrete with one slot of landing lights, over the only door.
    tower = a.box(2.3, 0.5, top + 1.05, bevel=0.06, grounded=True)
    tower.cut(jk.box(0.62, 0.4, 7.9, bevel=0).move(0, -0.25, 2.7).color(P.SHADE_3))
    tower.move(0, -half, 0).part("tint").color(P.SHADE_1, P.WHITE)
    slot_y = -half - 0.05 - 0.012
    landings = [wall_quad(-0.25, 0.25, 2.85 + i * 1.3, 2.85 + i * 1.3 + 1.0, slot_y) for i in range(6)]
    panes(a, [q for i, q in enumerate(landings) if i != 3], "lit", P.WINDOW).no_ao()
    panes(a, [landings[3]], "glass", P.GLASS_DARK)
    # Entrance: fin walls, a heavy canopy, steel doors and one amber lamp.
    front = -(half + 0.25)
    for s in (-1, 1):
        a.box(0.2, 0.36, 2.0, bevel=0.04, grounded=True).move(s * 1.05, front - 0.18, 0).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.box(2.7, 0.52, 0.2, bevel=0.05).move(0, front - 0.2, 2.0).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(1.5, 0.06, 1.72, bevel=0).move(0, front - 0.02, 0.1).color(P.CHARCOAL)
    for s in (-1, 1):
        a.box(0.62, 0.05, 1.55, bevel=0.015).move(s * 0.33, front - 0.05, 0.12).color(P.GUNMETAL, P.STEEL_DARK)
        a.box(0.16, 0.03, 0.5, bevel=0).move(s * 0.33, front - 0.075, 0.95).part("glass").color(P.GLASS_DARK)
    a.box(0.9, 0.08, 0.07, bevel=0.015).move(0, front - 0.06, 1.86).part("glow").color(P.GLOW_ORANGE)
    a.box(2.3, 0.4, 0.12, bevel=0.03, grounded=True).move(0, front - 0.22, 0).part("tint").color(P.SHADE_3, P.SHADE_2)

    # Roof: lift room behind the stair tower, three vents and the amber light strip.
    roof = top + 0.2
    a.box(2.3, 1.9, 0.82, bevel=0.05).move(0, -(half - 1.4), roof).part("tint").color(P.SHADE_2, P.SHADE_1)
    for i in (-1, 0, 1):
        a.box(0.7, 0.7, 0.42, bevel=0.04).move(i * 2.4, 3.3, roof).part("tint").color(P.SHADE_3, P.SHADE_2)
        a.box(0.86, 0.86, 0.1, bevel=0.03).move(i * 2.4, 3.3, roof + 0.46).color(P.CHARCOAL)
    # The strip is a long lamp on a gantry: a dark tray, an amber lens and thin clamps.
    for x in (-3.0, -1.0, 1.0, 3.0):
        a.box(0.26, 0.9, 0.5, bevel=0.04).move(x, 0.35, roof).color(P.CHARCOAL)
    a.box(7.4, 1.24, 0.24, bevel=0.05).move(0, 0.35, roof + 0.46).color(P.CHARCOAL, P.GUNMETAL)
    a.box(7.0, 0.86, 0.4, bevel=0.1).move(0, 0.35, roof + 0.66).part("glow").color(P.GLOW_ORANGE)
    for x in (-3.56, -2.0, 0, 2.0, 3.56):
        a.box(0.12, 1.0, 0.44, bevel=0.02).move(x, 0.35, roof + 0.66).color(P.CHARCOAL)
    # Two cameras watch the street from opposite corners of the parapet.
    for rot in (0, 180):
        with a.group() as g:
            a.box(0.14, 0.14, 0.42, bevel=0.03).move(0, 0, top + 0.68).color(P.CHARCOAL)
            with a.group() as cam:
                a.box(0.26, 0.6, 0.22, bevel=0.04).move(0, -0.1, -0.11).color(P.OFF_WHITE)
                a.box(0.13, 0.03, 0.12, bevel=0).move(0, -0.415, -0.06).part("glow").color(P.GLOW_RED)
            cam.rot(x=24).move(0, 0, top + 1.12)
        g.rot(z=-45).move(-(half - 0.18), -(half - 0.18), 0).rot(z=rot)


# --------------------------------------------------------------------------------------------
# S2 · Wild West
# --------------------------------------------------------------------------------------------
@asset(
    "lm-enclave",
    tint="#d0493a",
    budget=4500,
    note="S2 walled corporate enclave. `tint` is the corporate colour (tower frame, roofs, stripes, flags).",
)
def enclave(a):
    S, C, G = 5.2, 1.5, 0.3  # pad half-size, corner chamfer and pad height
    stone_lo, stone = jk.shade(P.STONE_DARK, -0.25), P.STONE_DARK
    conc_lo, conc = P.CONCRETE_DARK, P.CONCRETE
    a.prism(
        [(-S + C, -S), (S - C, -S), (S, -S + C), (S, S - C), (S - C, S), (-S + C, S), (-S, S - C), (-S, -S + C)],
        G, bevel=0.06, grounded=True,
    ).color(jk.shade(P.STONE_DARK, -0.08), P.STONE)

    # Perimeter wall: concrete, a coping and one corporate stripe on the outer face.
    WY, WT, WH = 4.85, 0.42, 1.25

    def wall(length, cx, cy, rot):
        with a.group() as g:
            a.box(length, WT, WH, bevel=0.04).color(conc_lo, conc)
            a.box(length + 0.02, WT + 0.16, 0.12, bevel=0.03).move(0, 0, WH - 0.02).color(conc)
            a.box(length - 0.3, 0.05, 0.2, bevel=0).move(0, -WT / 2 - 0.01, WH * 0.58).part("tint").color(P.WHITE)
        g.rot(z=rot).move(cx, cy, G - 0.02)

    wall(7.55, 0, WY, 180)
    wall(7.55, WY, 0, 90)
    wall(7.55, -WY, 0, -90)
    for s in (-1, 1):
        wall(2.3, s * 2.62, -WY, 0)

    # Corner guard towers.
    turn = math.pi / 8
    for sx, sy in CORNERS:
        x, y = sx * 4.4, sy * 4.4
        a.lathe(
            [(0.8 * OCT, G - 0.02), (0.68 * OCT, 2.2), (0.84 * OCT, 2.34), (0.84 * OCT, 2.5)],
            8, cap_bottom=False, cap_top=False, turn=turn,
        ).smooth(30).move(x, y, 0).color(stone_lo, stone)
        a.lathe([(0.79 * OCT, 2.5), (0.79 * OCT, 2.8)], 8, cap_bottom=False, cap_top=False, turn=turn).smooth(30).move(
            x, y, 0
        ).part("glass").color(P.GLASS_DARK)
        a.lathe([(0.84 * OCT, 2.8), (0.84 * OCT, 2.9)], 8, cap_bottom=False, cap_top=False, turn=turn).smooth(30).move(
            x, y, 0
        ).color(stone)
        a.lathe(
            [(0.9 * OCT, 2.9), (0.92 * OCT, 2.93), (0.92 * OCT, 3.02), (0.3 * OCT, 3.3), (0, 3.36)], 8, turn=turn
        ).smooth(30).move(x, y, 0).part("tint").color(P.SHADE_1, P.WHITE)
        a.box(0.2, 0.16, 0.14, bevel=0.03).move(x + sx * 0.6, y + sy * 0.6, 2.74).rot(z=45, pivot=(x + sx * 0.6, y + sy * 0.6, 0)).part(
            "glow"
        ).color(P.GLOW_WHITE)

    # Gate: two pylons, a striped boom and a guard booth just inside.
    for s in (-1, 1):
        a.box(0.62, 0.74, 1.95, bevel=0.05).move(s * 1.2, -WY, G - 0.02).color(stone_lo, stone)
        a.box(0.74, 0.86, 0.14, bevel=0.04).move(s * 1.2, -WY, G + 1.9).part("tint").color(P.WHITE)
        a.box(0.2, 0.2, 0.12, bevel=0.03).move(s * 1.2, -WY, G + 2.04).part("glow").color(P.GLOW_WHITE)
    a.box(0.18, 0.18, 0.95, bevel=0.03).move(0.74, -WY - 0.08, G).color(P.CHARCOAL)
    for i in range(4):
        piece = a.box(0.4, 0.09, 0.11, bevel=0).move(0.54 - i * 0.4, -WY - 0.08, G + 0.78)
        if i % 2 == 0:
            piece.part("tint").color(P.WHITE)
        else:
            piece.color(P.OFF_WHITE)
    bx, by = 2.05, -3.85
    a.box(1.0, 1.0, 1.2, bevel=0.05).move(bx, by, G).color(conc_lo, conc)
    a.box(1.04, 1.04, 0.36, bevel=0).move(bx, by, G + 0.62).part("lit").color(P.WINDOW)
    a.box(1.22, 1.22, 0.1, bevel=0.03).move(bx, by, G + 1.2).part("tint").color(P.WHITE)

    # Drive and forecourt.
    a.box(1.7, 3.9, 0.05, bevel=0).move(0, -3.25, G).color(P.ASPHALT)
    a.cyl(1.55, 0.07, 16, bevel=0).move(0.3, -1.35, G).color(conc)

    # Headquarters: a podium, a glass shaft in a corporate frame, a raked crown and a spire.
    hx, hy = 0.3, 1.7
    a.box(4.0, 3.4, 1.5, bevel=0.06).move(hx, hy - 0.1, G).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.box(4.16, 3.56, 0.12, bevel=0.03).move(hx, hy - 0.1, G + 1.5).color(conc)
    fy = hy - 0.1 - 1.7
    a.box(2.7, 0.08, 0.92, bevel=0).move(hx, fy - 0.02, G + 0.1).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    for i in (-2, -1, 1, 2):
        a.box(0.06, 0.1, 0.92, bevel=0).move(hx + i * 0.54, fy - 0.03, G + 0.1).part("tint").color(P.SHADE_1)
    a.box(0.72, 0.1, 0.84, bevel=0).move(hx, fy - 0.04, G + 0.1).part("lit").color(P.WINDOW)
    a.box(1.4, 0.6, 0.09, bevel=0.03).move(hx, fy - 0.3, G + 1.06).part("tint").color(P.WHITE)
    z0, z1 = G + 1.6, 11.5
    a.box(2.5, 2.5, z1 - z0, bevel=0).move(hx, hy, z0).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    for sx, sy in CORNERS:
        a.box(0.6, 0.6, z1 - z0 + 0.1, bevel=0.05).move(hx + sx * 1.08, hy + sy * 1.08, z0 - 0.1).part("tint").color(
            P.SHADE_1, P.WHITE
        )
    for rot in (0, 90, 180, 270):
        a.box(0.16, 0.14, z1 - z0, bevel=0.03).move(0, -1.27, z0).rot(z=rot).move(hx, hy, 0).part("tint").color(
            P.SHADE_1, P.WHITE
        )
    for z in (4.1, 6.55, 9.0):
        a.box(2.76, 2.76, 0.3, bevel=0.04).move(hx, hy, z).part("tint").color(P.SHADE_2)
    # Lit floors, bay by bay: (rotation of the face, bay, floor heights).
    rows = (
        (0, -1, (2.5, 3.05, 4.9, 6.0, 7.3, 10.2)),
        (0, 1, (3.05, 4.9, 5.45, 7.85, 9.6, 10.2)),
        (90, -1, (3.05, 5.45, 6.0, 7.85, 10.75)),
        (90, 1, (2.5, 5.45, 7.3, 9.6, 10.2, 10.75)),
        (180, -1, (2.5, 4.9, 5.45, 8.4, 9.6)),
        (180, 1, (3.6, 4.9, 7.3, 8.4)),
        (270, -1, (3.6, 4.9, 7.3, 8.4, 10.75)),
        (270, 1, (2.5, 3.6, 6.0, 7.85, 10.2)),
    )
    lit = [
        wall_quad(bay * 0.43 - 0.3, bay * 0.43 + 0.3, z, z + 0.26, -1.262, rot, (hx, hy))
        for rot, bay, zs in rows
        for z in zs
    ]
    panes(a, lit, "lit", P.WINDOW).no_ao()
    a.profile_x([(-1.42, 11.4), (1.42, 11.4), (1.42, 13.2), (-1.42, 12.0)], 2.84, bevel=0.06).move(hx, hy, 0).part("tint").color(
        P.SHADE_1, P.WHITE
    )
    a.box(2.0, 2.3, 0.06, bevel=0).move(0, 0, -0.03).rot(x=22.9).move(hx, hy, 12.63).part("glass").color(
        P.GLASS_TINTED, P.GLASS, "y"
    )
    a.box(0.42, 0.42, 2.36, bevel=0.03, taper=0.12).move(hx, hy + 1.0, 12.94).part("tint").color(P.SHADE_1, P.WHITE)
    a.sphere(0.07, 6, 4).move(hx, hy + 1.0, 15.3).part("glow").color(P.GLOW_RED)

    # Annex with the helipad on its roof.
    ax, ay = -3.15, 2.4
    a.box(2.6, 2.8, 2.3, bevel=0.06).move(ax, ay, G).color(conc_lo, conc)
    for row in range(2):
        for i in (-1, 0, 1):
            a.box(0.5, 0.06, 0.34, bevel=0).move(ax + i * 0.78, ay - 1.4, G + 0.5 + row * 0.9).part(
                "lit" if (row + i) % 2 else "glass"
            ).color(P.WINDOW if (row + i) % 2 else P.GLASS_DARK)
            a.box(0.06, 0.5, 0.34, bevel=0).move(ax + 1.3, ay + i * 0.8, G + 0.5 + row * 0.9).part(
                "glass" if (row + i) % 2 else "lit"
            ).color(P.GLASS_DARK if (row + i) % 2 else P.WINDOW)
    pad = G + 2.3
    a.lathe([(1.15, pad), (1.5, pad + 0.12), (1.5, pad + 0.24), (1.44, pad + 0.3)], 16).move(ax, ay, 0).color(
        jk.shade(P.SLATE, -0.3), jk.shade(P.SLATE, -0.1)
    )
    flat_ring(a, 0.82, 1.04, pad + 0.306, 16, P.OFF_WHITE, centre=(ax, ay))
    flat_disc(a, 0.26, pad + 0.306, 3, P.YELLOW, centre=(ax, ay), turn=-90)
    for k in range(4):
        x, y, _ = polar(1.37, 45 + 90 * k)
        a.box(0.1, 0.1, 0.05, bevel=0).move(ax + x, ay + y, pad + 0.3).part("glow").color(P.GLOW_GREEN)

    # Vehicle shed with three roller doors onto the forecourt.
    wx, wy = 3.5, -1.2
    a.box(2.0, 3.6, 1.15, bevel=0.05).move(wx, wy, G).color(conc_lo, conc)
    arc = [(1.08 * math.cos(math.pi * i / 8), 0.02 + 0.5 * math.sin(math.pi * i / 8)) for i in range(9)]
    a.profile_y(arc, 3.7, bevel=0.03).move(wx, wy, G + 1.13).color(P.STEEL_DARK, P.STEEL)
    for i in (-1, 0, 1):
        a.box(0.06, 0.86, 0.84, bevel=0).move(wx - 1.0, wy + i * 1.12, G).color(P.SLATE)
    a.box(0.05, 3.3, 0.14, bevel=0).move(wx - 1.0, wy, G + 0.92).part("tint").color(P.WHITE)

    # Utility block and two storage tanks.
    a.box(1.8, 1.5, 1.05, bevel=0.05).move(-3.3, -2.5, G).color(conc_lo, conc)
    a.box(1.92, 1.62, 0.1, bevel=0.03).move(-3.3, -2.5, G + 1.05).part("tint").color(P.WHITE)
    a.box(0.5, 0.5, 0.22, bevel=0.04).move(-3.6, -2.5, G + 1.15).color(P.STEEL_DARK)
    a.box(0.36, 0.05, 0.6, bevel=0).move(-3.3, -1.74, G).color(P.SLATE)
    for tx in (-3.75, -2.8):
        a.lathe([(0.4, 0), (0.42, 0.05), (0.42, 1.35), (0.3, 1.52), (0, 1.56)], 10, cap_bottom=False).move(tx, -0.7, G).color(
            P.CONCRETE, P.OFF_WHITE
        )
        a.cyl(0.435, 0.14, 10, bevel=0.02).move(tx, -0.7, G + 0.9).part("tint").color(P.WHITE)

    # A blank sign pylon by the gate and three flags along the drive.
    px, py = -2.45, -3.95
    a.box(0.78, 0.3, 1.5, bevel=0.04).move(px, py, G).color(stone_lo, stone)
    a.box(0.94, 0.36, 2.2, bevel=0.05).move(px, py, G + 1.5).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(0.7, 0.39, 1.6, bevel=0).move(px, py, G + 1.8).color(P.OFF_WHITE)
    a.box(0.96, 0.4, 0.1, bevel=0.03).move(px, py, G + 3.7).part("glow").color(P.GLOW_WHITE)
    for y in (-3.5, -2.8, -2.1):
        a.tube([(-1.25, y, G), (-1.25, y, G + 2.6)], 0.03, 5).color(P.STEEL)
        a.box(0.7, 0.03, 0.42, bevel=0).move(-0.87, y, G + 2.12).part("tint").color(P.SHADE_1, P.WHITE)
    for x in (hx - 1.75, hx + 1.75):
        a.cyl(0.06, 0.25, 5, bevel=0).move(x, -0.75, G).color(P.BARK)
        a.cone(0.34, 0.95, 6).move(x, -0.75, G + 0.2).flat().color(P.PINE, P.LEAF)


PIT_RINGS = (  # (base radius, height) from the outer foot down to the pit floor
    (5.25, 0.0), (4.97, 0.55), (4.58, 1.12), (4.4, 1.25), (3.95, 1.25), (3.85, 0.9), (3.28, 0.9),
    (3.18, 0.56), (2.6, 0.56), (2.5, 0.25), (1.9, 0.25), (1.8, 0.05),
)
PIT_SHELF = 46.0  # bearing of the loading shelf
PIT_FACE = 182.0  # bearing of the working face
PIT_SHELF_OUT = (0.75, 0.82, 0.9, 0.95)  # how far the shelf pushes rings 0..3 outward
PIT_FACE_OUT = {4: 0.3, 5: 0.35, 6: 0.7, 7: 0.7}  # how far the working face is cut back


def _pit_point(k, deg):
    """A point on ring `k` of the pit at bearing `deg`: an irregular, hand-cut outline."""
    base, z = PIT_RINGS[k]
    t = math.radians(deg)
    wobble = 0.5 * math.sin(2 * t + 0.6) + 0.33 * math.sin(3 * t + 2.1) + 0.17 * math.sin(5 * t + 4.0)
    r = base * (1 + 0.05 * wobble + 0.012 * math.sin(4 * t + k * 1.7))
    if k <= 3:
        r += _bump(deg, PIT_SHELF, 38) * PIT_SHELF_OUT[k]
    if k in PIT_FACE_OUT:
        r += _bump(deg, PIT_FACE, 44) * PIT_FACE_OUT[k]
    if k == 1:
        # The bank is dumped earth: its waist wanders in and out.
        r += 0.13 * math.sin(7 * t + 1.3) + 0.07 * math.sin(11 * t + 0.4)
        z *= 1 + 0.16 * math.sin(5 * t + 2.0)
    if k == 2:
        z *= 1 + 0.07 * math.sin(3 * t + 1.0)
    return (math.cos(t) * r, math.sin(t) * r, z)


def _haul_truck(a, tip=0.0, load=None):
    """A chunky dump truck at the origin, cab toward -y. `tip` raises the bed; `load` fills it."""
    yellow_lo, yellow = jk.shade(P.AMBER, -0.12), P.YELLOW
    a.box(0.4, 0.92, 0.1, bevel=0.02).move(0, 0, 0.14).color(P.CHARCOAL)
    for sx in (-1, 1):
        for y in (-0.3, 0.28):
            a.cyl(0.15, 0.14, 8, bevel=0.025).move(0, 0, -0.07).rot(y=90).move(sx * 0.25, y, 0.15).color(P.INK)
    a.box(0.46, 0.26, 0.3, bevel=0.05).move(0, -0.36, 0.2).color(yellow_lo, yellow)
    a.box(0.38, 0.03, 0.13, bevel=0).move(0, -0.495, 0.33).part("glass").color(P.GLASS_DARK)
    bed = a.profile_x([(-0.3, 0), (0.36, 0), (0.44, 0.26), (-0.36, 0.26), (-0.36, 0.12)], 0.5, bevel=0.03)
    bed.rot(x=-tip, pivot=(0, 0.36, 0)).move(0, 0.1, 0.26).color(yellow_lo, yellow)
    if load is not None:
        a.blob(0.24, 1, (0.85, 1.25, 0.55), lumps=0.2, seed=4).move(0, 0.14, 0.52).color(*load)


@asset(
    "lm-pit-mine",
    tint="#ffffff",
    budget=4500,
    note="S2 open-pit mine. Nothing below z = 0: a raised rim, benches stepping down to a floor just above ground.",
)
def pit_mine(a):
    n = 36
    step = 360 / n
    road = jk.mix(P.ADOBE, P.SAND, 0.55)
    tan = jk.mix(P.ADOBE, P.CLAY, 0.4)
    earth = jk.mix(P.RUST, P.CLAY, 0.3)
    strata = (  # (low colour, high colour) of the band between ring k and ring k + 1
        (earth, jk.mix(P.CLAY, P.ADOBE, 0.35)),  # foot of the bank
        (jk.mix(P.CLAY, P.ADOBE, 0.35), tan),  # upper bank
        (tan, tan),  # shoulder
        (road, road),  # crest road
        (P.CLAY, jk.mix(P.CLAY, P.ADOBE, 0.3)),  # topsoil face
        (jk.mix(P.CLAY, P.ADOBE, 0.5),) * 2,  # bench 1
        (P.RUST, jk.mix(P.RUST, P.BRICK, 0.4)),  # red clay face
        (jk.mix(P.RUST, P.CLAY, 0.5),) * 2,  # bench 2
        (jk.mix(P.WALNUT, P.BARK_DARK, 0.4), P.WALNUT),  # dark shale face
        (jk.mix(P.WALNUT, P.STONE, 0.4),) * 2,  # bench 3
        (jk.mix(P.SLATE, P.INK, 0.35), P.SLATE),  # ore face
    )
    fresh = jk.mix(P.SAND, P.CLAY, 0.25)
    floor = jk.mix(P.SLATE, P.INK, 0.5)

    # The ground is one closed shell: bank, crest, three benches, the floor and a hidden underside.
    count = len(PIT_RINGS)
    verts = [_pit_point(k, i * step) for k in range(count) for i in range(n)]
    faces, bands = [], []
    for k in range(count - 1):
        for i in range(n):
            j = (i + 1) % n
            faces.append((k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i))
            bands.append(k)
    faces.append(tuple((count - 1) * n + i for i in range(n)))
    bands.append(-1)
    faces.append(tuple(reversed(range(n))))
    bands.append(-1)
    shell = mesh(a, verts, faces).flat().color(floor)
    for f, k in zip(shell.bm.faces, bands):
        if k < 0:
            continue
        lo, hi = strata[k]
        z0, z1 = sorted((PIT_RINGS[k][1], PIT_RINGS[k + 1][1]))
        centre = f.calc_center_median()
        cut = k == 6 and _bump(math.degrees(math.atan2(centre.y, centre.x)), PIT_FACE, 34) > 0
        for loop in f.loops:
            t = min(1.0, max(0.0, (loop.vert.co.z - z0) / (z1 - z0))) if z1 > z0 else 0.0
            # The working face is freshly cut, paler rock.
            c = jk.col(fresh) if cut else jk.mix(lo, hi, t)
            loop[shell.layer] = (c[0], c[1], c[2], 1.0)
    pond = [
        (
            -0.35 + math.cos(math.radians(i * 45)) * (0.7 + 0.12 * math.sin(i * 2.3)),
            0.3 + math.sin(math.radians(i * 45)) * (0.55 + 0.1 * math.cos(i * 1.7)),
            PIT_RINGS[-1][1] + 0.012,
        )
        for i in range(8)
    ]
    panes(a, [pond], "glass", jk.mix(P.TEAL, P.INK, 0.45))

    # One haul ramp winds up the benches from the floor to the loading shelf.
    def ramp(kt, deg0, deg1, width=0.42, cuts=5):
        kb = kt + 1
        pts, quads = [], []
        for i in range(cuts + 1):
            f = i / cuts
            deg = deg0 + (deg1 - deg0) * f
            top, bot = Vector(_pit_point(kt, deg)), Vector(_pit_point(kb, deg))
            rt, rb = math.hypot(top.x, top.y), math.hypot(bot.x, bot.y)
            z = bot.z + (top.z - bot.z) * f + 0.012
            outer = rb + (rt - rb) * f + 0.06
            inner = rb - width
            for r, zz in ((outer, z), (inner, z), (inner - 0.05, bot.z - 0.03), (outer, bot.z - 0.03)):
                pts.append(polar(r, deg, zz))
        for i in range(cuts):
            p, q = 4 * i, 4 * (i + 1)
            for e in range(4):
                quads.append((p + e, p + (e + 1) % 4, q + (e + 1) % 4, q + e))
        quads += [(3, 2, 1, 0), tuple(4 * cuts + e for e in range(4))]
        a.raw(pts, quads).flat().color(road)

    ramp(10, 236, 272)
    ramp(8, 276, 312)
    ramp(6, 316, 352)
    ramp(4, 356, 392)

    # Spoil heaps under the conveyor head, with boulders rolled to the foot.
    heap_lo, heap_hi = jk.mix(P.WALNUT, P.RUST, 0.45), jk.mix(P.CLAY, P.STONE, 0.4)

    def heap(x, y, r, h, sides, seed):
        a.lathe([(r, 0), (r * 0.72, h * 0.36), (r * 0.4, h * 0.73), (r * 0.14, h * 0.95), (0, h)], sides, cap_bottom=False).jitter(
            r * 0.055, seed=seed, scale=1.1
        ).warp(lambda co: (co.x, co.y, max(co.z, 0.0))).flat().move(x, y, 0).color(heap_lo, heap_hi)

    heap(7.05, -1.0, 2.38, 2.02, 10, 5)
    heap(8.0, 1.05, 1.3, 0.98, 8, 9)
    for i, (x, y, s) in enumerate(((5.6, -3.3, 0.3), (6.3, -3.75, 0.2), (8.7, -2.9, 0.22), (6.5, 1.75, 0.24), (9.0, 2.3, 0.16))):
        a.blob(s, 1, (1.1, 1, 0.75), lumps=0.28, seed=i + 12).move(x, y, s * 0.42).warp(
            lambda co: (co.x, co.y, max(co.z, 0.0))
        ).color(heap_lo, heap_hi)

    # Loading shelf: a hopper let into the rim, its mouth level with the shelf, feeding a conveyor.
    edge = Vector(_pit_point(3, PIT_SHELF))
    er, ez = math.hypot(edge.x, edge.y), edge.z
    hx, hy, _ = polar(er + 0.5, PIT_SHELF)
    yellow_lo, yellow = jk.shade(P.AMBER, -0.12), P.YELLOW
    with a.group() as g:
        a.box(0.5, 0.5, 0.62, bevel=0.03, taper=1.9).move(0, 0, -0.56).color(yellow_lo, yellow)
        a.box(0.8, 0.8, 0.03, bevel=0).move(0, 0, 0.045).color(P.INK)
        a.box(1.04, 1.04, 0.09, bevel=0.025).cut(jk.box(0.8, 0.8, 1, bevel=0).move(0, 0, -0.4).color(P.INK)).color(yellow)
        for sx, sy in CORNERS:
            a.box(0.09, 0.09, ez, bevel=0).move(sx * 0.44, sy * 0.44, -ez).color(P.STEEL_DARK)
        a.box(0.97, 0.06, 0.06, bevel=0).move(0, -0.44, -0.62).color(P.STEEL_DARK)
        a.box(0.97, 0.06, 0.06, bevel=0).move(0, 0.44, -0.62).color(P.STEEL_DARK)
        a.box(0.3, 0.3, 0.2, bevel=0.03, taper=0.7).rot(x=180, pivot=(0, 0, 0.1)).move(0, 0, -0.78).color(P.STEEL_DARK)
    g.rot(z=PIT_SHELF).move(hx, hy, ez)
    # Kerb for reversing trucks.
    a.box(1.2, 0.14, 0.14, bevel=0.03).rot(z=PIT_SHELF + 90).move(*polar(er - 0.1, PIT_SHELF, ez - 0.01)).color(P.CONCRETE)
    tail = Vector((hx, hy, ez - 0.86))
    head = Vector((6.86, -0.74, 2.2))
    run = head - tail
    side = Vector((run.y, -run.x, 0)).normalized()
    lift = Vector((0, 0, 0.07))
    bar(a, tail - run.normalized() * 0.3, head, 0.36, 0.1, bevel=0.02, side=side).color(yellow_lo, yellow)
    bar(a, tail - run.normalized() * 0.3 + lift, head + lift, 0.26, 0.04, bevel=0, side=side).color(P.INK)
    for f in (0.36, 0.72):
        p = tail + run * f
        for s in (-1, 1):
            rod(a, p + side * s * 0.14, (p.x + side.x * s * 0.42, p.y + side.y * s * 0.42, 0), 0.04, 4).warp(
                lambda co: (co.x, co.y, max(co.z, 0.0))
            ).color(P.STEEL_DARK)
    for p in (tail - run.normalized() * 0.3, head):
        strut(a, p - side * 0.21 + lift * 0.3, p + side * 0.21 + lift * 0.3, 0.09, 8).color(P.STEEL_DARK)

    # A dump truck tips into the hopper; a loaded one starts up the ramp from the pit floor.
    ore = (jk.mix(P.SLATE, P.INK, 0.2), P.STONE_DARK)
    with a.group() as g:
        _haul_truck(a, tip=30)
    g.scale(1.25).rot(z=PIT_SHELF - 90).move(*polar(er - 0.74, PIT_SHELF, ez))
    with a.group() as g:
        _haul_truck(a, load=ore)
    g.scale(1.25).rot(z=-22).move(*polar(1.12, 262, PIT_RINGS[-1][1]))

    # The working bench: an excavator at the fresh face, with spoil at its foot.
    wz = PIT_RINGS[7][1]
    with a.group() as g:
        for sx in (-1, 1):
            a.box(0.17, 0.72, 0.17, bevel=0.05).move(sx * 0.23, 0.04, 0).color(P.INK, P.CHARCOAL)
        a.cyl(0.2, 0.06, 10, bevel=0).move(0, 0.04, 0.16).color(P.STEEL_DARK)
        a.box(0.52, 0.56, 0.3, bevel=0.06).move(0, 0.12, 0.21).color(yellow_lo, yellow)
        a.box(0.5, 0.16, 0.24, bevel=0.05).move(0, 0.44, 0.22).color(P.CHARCOAL)
        a.box(0.22, 0.26, 0.26, bevel=0.04).move(-0.15, -0.12, 0.5).color(yellow)
        a.box(0.17, 0.03, 0.15, bevel=0).move(-0.15, -0.255, 0.58).part("glass").color(P.GLASS_DARK)
        bar(a, (0.1, -0.1, 0.48), (0.1, -0.62, 0.98), 0.12, 0.13, bevel=0.03).color(yellow_lo, yellow)
        bar(a, (0.1, -0.6, 1.0), (0.1, -0.84, 0.44), 0.09, 0.1, bevel=0.025).color(yellow)
        a.box(0.22, 0.22, 0.17, bevel=0.04, taper=0.7).rot(x=160, pivot=(0, 0, 0.085)).move(0.1, -0.86, 0.3).color(P.INK)
    g.scale(1.1).rot(z=PIT_FACE + 90).move(*polar(3.08, PIT_FACE, wz))
    for i, (deg, r, size) in enumerate(((163, 3.5, 0.2), (170, 3.66, 0.13), (197, 3.6, 0.17), (204, 3.45, 0.11), (192, 3.74, 0.1))):
        a.blob(size, 1, (1.1, 1, 0.7), lumps=0.25, seed=i + 2).move(*polar(r, deg, wz + size * 0.3)).color(
            jk.mix(P.RUST, P.CLAY, 0.4), fresh
        )
    # A flood lamp on the shelf.
    lx, ly, _ = polar(er - 0.3, PIT_SHELF + 24)
    a.tube([(lx, ly, ez), (lx, ly, ez + 1.0)], 0.03, 5).color(P.STEEL_DARK)
    a.box(0.2, 0.1, 0.12, bevel=0.02).move(lx, ly, ez + 0.98).rot(z=PIT_SHELF + 24 - 90, pivot=(lx, ly, 0)).part("glow").color(P.LAMP)


@asset(
    "lm-offshore-rig",
    tint="#ffffff",
    budget=4500,
    note="S2 offshore drilling platform. The sea is z = 0; the flare boom reaches toward -y.",
)
def offshore_rig(a):
    steel_lo = jk.mix(P.RUST, P.STEEL_DARK, 0.5)
    steel = P.STEEL_DARK
    yellow_lo, yellow = jk.shade(P.AMBER, -0.12), P.YELLOW
    oxide = jk.mix(P.RED, P.ORANGE, 0.4)
    oxide_lo = jk.shade(oxide, -0.25)
    zd = 3.5  # underside of the cellar deck

    # Jacket: four splayed legs with horizontal and cross bracing on every face.
    def leg(sx, sy, z):
        k = 2.62 + (2.2 - 2.62) * z / zd
        return (sx * k, sy * k, z)

    for sx, sy in CORNERS:
        a.tube([leg(sx, sy, 0), leg(sx, sy, zd + 0.1)], 0.3, 10).warp(lambda co: (co.x, co.y, max(co.z, 0.0))).color(
            steel_lo, P.STEEL
        )
        strut(a, leg(sx, sy, 0.28), leg(sx, sy, 0.62), 0.36, 10, bevel=0.04).color(yellow_lo, yellow)
    for i in range(4):
        (ax, ay), (bx, by) = CORNERS[i], CORNERS[(i + 1) % 4]
        for z in (0.95, 2.8):
            rod(a, leg(ax, ay, z), leg(bx, by, z), 0.11, 6).color(steel)
        rod(a, leg(ax, ay, 0.95), leg(bx, by, 2.8), 0.085, 5).color(steel)
        rod(a, leg(bx, by, 0.95), leg(ax, ay, 2.8), 0.085, 5).color(steel)

    # Decks: a cellar deck, a dark machinery level behind posts, and the main deck.
    a.box(5.5, 5.5, 0.16, bevel=0.04).move(0, 0, zd).color(oxide_lo, oxide)
    a.box(5.0, 5.0, 0.42, bevel=0).move(0, 0, zd + 0.14).color(P.CHARCOAL)
    for i in range(4):
        for t in (-2.6, -1.3, 0, 1.3):
            a.box(0.16, 0.16, 0.4, bevel=0).move(t, -2.6, zd + 0.15).rot(z=90 * i).color(yellow)
    a.box(6.0, 6.0, 0.18, bevel=0.05).move(0, 0, zd + 0.54).color(oxide_lo, oxide)
    D = zd + 0.75
    a.box(5.72, 5.72, 0.035, bevel=0).move(0, 0, D - 0.035).color(jk.mix(P.SLATE, P.STEEL_DARK, 0.5))
    for i in range(4):
        a.box(5.86, 0.045, 0.045, bevel=0).move(0, -2.93, D + 0.33).rot(z=90 * i).color(yellow)
        for t in (-2.93, -1.465, 0, 1.465):
            a.box(0.045, 0.045, 0.36, bevel=0).move(t, -2.93, D - 0.01).rot(z=90 * i).color(yellow)

    # Accommodation block with the helideck on its roof.
    ax, ay = -1.4, 1.35
    a.box(2.9, 2.6, 1.45, bevel=0.06).move(ax, ay, D).color(P.CONCRETE, P.OFF_WHITE)
    a.box(3.0, 2.7, 0.1, bevel=0.03).move(ax, ay, D + 1.45).color(oxide_lo, oxide)
    for row in range(2):
        z = D + 0.28 + row * 0.58
        for i in range(5):
            a.box(0.34, 0.06, 0.26, bevel=0).move(ax - 1.08 + i * 0.54, ay - 1.3, z).part("lit").color(P.WINDOW)
            a.box(0.34, 0.06, 0.26, bevel=0).move(ax - 1.08 + i * 0.54, ay + 1.3, z).part("lit" if (i + row) % 3 else "glass").color(
                P.WINDOW if (i + row) % 3 else P.GLASS_DARK
            )
        for i in range(4):
            a.box(0.06, 0.34, 0.26, bevel=0).move(ax + 1.45, ay - 0.84 + i * 0.56, z).part("lit").color(P.WINDOW)
            a.box(0.06, 0.34, 0.26, bevel=0).move(ax - 1.45, ay - 0.84 + i * 0.56, z).part("lit" if (i + row) % 2 else "glass").color(
                P.WINDOW if (i + row) % 2 else P.GLASS_DARK
            )
        a.box(2.96, 2.66, 0.05, bevel=0).move(ax, ay, z + 0.28).color(P.CONCRETE)
    px, py = ax - 0.15, ay + 0.1
    pz = D + 1.55
    turn = math.pi / 8
    a.lathe([(0.85, pz), (1.3, pz + 0.38)], 8, cap_bottom=False, cap_top=False, turn=turn).smooth(30).move(px, py, 0).color(steel)
    a.lathe(
        [(1.49, pz + 0.34), (1.74, pz + 0.37), (1.74, pz + 0.41), (1.49, pz + 0.44)], 8, cap_bottom=False, cap_top=False, turn=turn
    ).smooth(30).move(px, py, 0).color(P.CHARCOAL)
    green_lo, green = jk.shade(P.GREEN, -0.5), jk.shade(P.GREEN, -0.32)
    a.lathe([(1.36, pz + 0.38), (1.52, pz + 0.42), (1.52, pz + 0.54), (1.47, pz + 0.58)], 8, turn=turn).smooth(30).move(
        px, py, 0
    ).color(green_lo, green)
    flat_ring(a, 0.8, 1.0, pz + 0.586, 16, P.OFF_WHITE, centre=(px, py))
    flat_disc(a, 0.26, pz + 0.586, 3, P.YELLOW, centre=(px, py), turn=-90)
    for k in range(4):
        x, y, _ = polar(1.36, 45 + 90 * k)
        a.box(0.1, 0.1, 0.05, bevel=0).move(px + x, py + y, pz + 0.58).part("glow").color(P.GLOW_GREEN)

    # Drill floor and derrick.
    dx, dy = 1.45, -1.45
    a.box(1.9, 1.9, 0.55, bevel=0.05).move(dx, dy, D).color(P.CONCRETE_DARK, P.CONCRETE)
    zb, zt = D + 0.55, 9.12

    def dpt(sx, sy, z):
        h = 0.8 + (0.2 - 0.8) * (z - zb) / (zt - zb)
        return (dx + sx * h, dy + sy * h, z)

    levels = (zb, zb + 1.35, zb + 2.5, zb + 3.5, zt)
    for sx, sy in CORNERS:
        rod(a, dpt(sx, sy, zb), dpt(sx, sy, zt), 0.055, 4).color(yellow_lo, yellow)
    for i in range(4):
        (ax0, ay0), (bx0, by0) = CORNERS[i], CORNERS[(i + 1) % 4]
        for b, z in enumerate(levels[1:]):
            rod(a, dpt(ax0, ay0, z), dpt(bx0, by0, z), 0.035, 4).color(yellow)
            lo = levels[b]
            if (b + i) % 2:
                rod(a, dpt(ax0, ay0, lo), dpt(bx0, by0, z), 0.03, 4).color(yellow)
            else:
                rod(a, dpt(bx0, by0, lo), dpt(ax0, ay0, z), 0.03, 4).color(yellow)
    a.box(0.58, 0.58, 0.22, bevel=0.05).move(dx, dy, zt - 0.02).color(yellow_lo, yellow)
    a.tube([(dx, dy, zt + 0.18), (dx, dy, zt + 0.5)], 0.025, 4).color(steel)
    a.sphere(0.07, 6, 4).move(dx, dy, zt + 0.52).part("glow").color(P.GLOW_RED)
    a.tube([(dx, dy, zb), (dx, dy, zt)], 0.04, 5).color(steel)
    a.box(0.26, 0.26, 0.34, bevel=0.05).move(dx, dy, zb + 2.2).color(P.CHARCOAL)
    for ox in (-0.24, 0, 0.24):
        a.tube([(dx + ox, dy, 0), (dx + ox, dy, zd)], 0.07, 6).color(steel_lo, steel)

    # Pedestal crane on the back corner, its boom raised along the edge.
    cx, cy = 2.3, 2.25
    a.cyl(0.3, 1.0, 10, bevel=0.04).move(cx, cy, D).color(yellow_lo, yellow)
    a.cyl(0.4, 0.12, 10, bevel=0.03).move(cx, cy, D + 1.0).color(steel)
    a.box(0.62, 0.86, 0.5, bevel=0.07).move(cx, cy + 0.1, D + 1.12).color(yellow_lo, yellow)
    a.box(0.3, 0.3, 0.32, bevel=0.04).move(cx - 0.44, cy - 0.2, D + 1.2).color(P.OFF_WHITE)
    a.box(0.24, 0.03, 0.18, bevel=0).move(cx - 0.44, cy - 0.355, D + 1.3).part("glass").color(P.GLASS_DARK)
    tip = (cx, cy - 2.45, D + 3.1)
    bar(a, (cx, cy - 0.3, D + 1.42), tip, 0.2, 0.18, bevel=0.03, taper=0.55).color(yellow_lo, yellow)
    rod(a, (cx, cy + 0.34, D + 1.6), (cx, cy + 0.26, D + 2.35), 0.04, 4).color(steel)
    rod(a, (cx, cy + 0.26, D + 2.35), tip, 0.015, 4).color(P.INK)
    rod(a, tip, (tip[0], tip[1], D + 1.75), 0.012, 4).color(P.INK)
    a.box(0.14, 0.14, 0.2, bevel=0.03).move(tip[0], tip[1], D + 1.56).color(yellow)

    # Flare boom: a ladder truss leaning out over the sea, with a flame at its tip.
    b0, b1 = Vector((-2.62, -2.8, D + 0.05)), Vector((-2.62, -4.5, 7.45))
    for s in (-1, 1):
        rod(a, b0 + Vector((s * 0.17, 0, 0)), b1 + Vector((s * 0.1, 0, 0)), 0.045, 5).color(steel)
    cuts = 6
    for i in range(cuts):
        p = b0.lerp(b1, i / cuts)
        q = b0.lerp(b1, (i + 1) / cuts)
        w0, w1 = 0.17 - 0.07 * i / cuts, 0.17 - 0.07 * (i + 1) / cuts
        s = 1 if i % 2 else -1
        rod(a, p + Vector((s * w0, 0, 0)), q + Vector((-s * w1, 0, 0)), 0.025, 4).color(steel)
    rod(a, Vector((-2.62, -2.6, D + 1.5)), b0.lerp(b1, 0.55), 0.02, 4).color(P.INK)
    a.box(0.14, 0.14, 1.5, bevel=0.03).move(-2.62, -2.6, D).color(yellow_lo, yellow)
    a.cyl(0.1, 0.22, 8, bevel=0.02).move(b1.x, b1.y, b1.z - 0.04).color(P.CHARCOAL)
    a.lathe([(0, 0), (0.17, 0.1), (0.24, 0.3), (0.15, 0.62), (0, 1.0)], 6).flat().move(b1.x, b1.y, b1.z + 0.16).part("glow").color(
        P.GLOW_ORANGE, jk.mix(P.GLOW_ORANGE, P.GLOW_RED, 0.7)
    )

    # A rack of drill pipe waits beside the drill floor.
    for y in (0.18, 0.88):
        for x in (0.5, 1.7):
            a.box(0.12, 0.12, 0.16, bevel=0.02).move(x, y, D).color(steel)
    for row, count in ((0, 4), (1, 3)):
        for i in range(count):
            y = 0.53 + (i - (count - 1) / 2) * 0.2
            rod(a, (0.1, y, D + 0.25 + row * 0.17), (2.1, y, D + 0.25 + row * 0.17), 0.09, 6).part("metal").color(P.STEEL)
    # Process tanks, a gas line to the flare and a lifeboat on davits.
    for y in (-0.95, -1.8):
        a.capsule(0.33, 1.7, 10, 3).rot(y=90).move(-2.4, y, D + 0.45).part("metal").color(P.STEEL, P.CHROME)
        for x in (-1.95, -1.15):
            a.box(0.14, 0.6, 0.2, bevel=0.02).move(x, y, D).color(steel)
    a.tube([(-0.9, -1.8, D + 0.2), (-0.9, -2.55, D + 0.2), (-2.4, -2.62, D + 0.2), (-2.62, -2.8, D + 0.3)], 0.05, 5).color(yellow)
    a.capsule(0.21, 0.9, 8, 2).rot(y=90).move(-0.15, -3.26, D - 0.2).color(jk.shade(P.ORANGE, -0.1), P.ORANGE)
    for x in (-0.05, 0.55):
        a.tube([(x, -2.95, D), (x, -2.95, D + 0.42), (x, -3.26, D + 0.5), (x, -3.26, D + 0.02)], 0.03, 4).color(steel)


# --------------------------------------------------------------------------------------------
# S3 · Golden Age
# --------------------------------------------------------------------------------------------
def _garden_home(a):
    """One rounded home at the origin, door facing -y: a pale shell on a gold eave, lit from inside."""
    n = 10
    turn = math.radians(-108)
    gold_lo, gold = jk.shade(P.GOLD, -0.14), P.GOLD
    a.lathe([(0.84, 0), (0.86, 0.05), (0.86, 0.78)], n, cap_bottom=False, cap_top=False, turn=turn).part("tint").color(
        P.SHADE_2, P.SHADE_1
    )
    a.lathe([(0.86, 0.72), (0.99, 0.77), (0.99, 0.87), (0.93, 0.92)], n, cap_bottom=False, cap_top=False, turn=turn).color(
        gold_lo, gold
    )
    a.lathe([(0.93, 0.9), (0.84, 1.1), (0.56, 1.31), (0.24, 1.4)], n, cap_bottom=False, cap_top=False, turn=turn).part(
        "tint"
    ).color(P.SHADE_1, P.WHITE)
    a.dome(0.27, 0.15, 8, 2).move(0, 0, 1.385).part("glass").color(P.GLASS_TINTED, P.GLASS)
    apothem = 0.86 * math.cos(math.radians(18))
    a.box(0.46, 0.1, 0.72, bevel=0).move(0, -apothem - 0.01, 0).color(P.OAK_WOOD)
    panes(a, [wall_quad(-0.16, 0.16, 0.03, 0.63, -apothem - 0.062)], "base", P.TEAL)
    a.box(0.6, 0.26, 0.05, bevel=0).move(0, -apothem - 0.14, 0).color(P.STONE)
    for rot in (-36, 36, 180):
        a.box(0.4, 0.08, 0.4, bevel=0).move(0, -apothem - 0.005, 0.25).rot(z=rot).color(P.OAK_WOOD)
        panes(a, [wall_quad(-0.14, 0.14, 0.31, 0.59, -apothem - 0.047, rot)], "lit", P.WINDOW).no_ao()


def _round_tree(a, x, y, z, s=1.0, seed=1):
    a.cyl(0.07 * s, 0.6 * s, 5, r2=0.05 * s, bevel=0).move(x, y, z).color(P.BARK)
    a.blob(0.42 * s, 1, (1, 1, 0.88), lumps=0.2, seed=seed).move(x, y, z + 0.86 * s).color(P.LEAF_DEEP, P.LEAF)
    a.blob(0.3 * s, 1, (1, 1, 0.88), lumps=0.2, seed=seed + 11).move(x + 0.22 * s, y + 0.1 * s, z + 1.12 * s).color(P.LEAF_DEEP, P.LEAF)


@asset(
    "lm-garden-town",
    tint="#f4efe2",
    budget=4500,
    note="S3 radial garden town. `tint` is the homes (walls and roof shells).",
)
def garden_town(a):
    grass = jk.mix(P.LIME, P.OFF_WHITE, 0.3)
    grass_lo = jk.mix(P.LEAF, P.LIME, 0.5)
    common = jk.mix(P.LEAF, P.LIME, 0.72)
    path = P.CREAM
    G = 0.2
    a.lathe([(5.5, 0), (5.42, 0.14), (5.25, G)], 24, cap_bottom=False, cap_top=False).color(grass_lo, grass)
    flat_ring(a, 2.75, 5.25, G, 24, grass)
    flat_ring(a, 2.3, 2.75, G, 24, path)
    for k in range(4):
        flat_ring(a, 1.0, 2.3, G, 5, common, start=90 * k + 8, sweep=74)
        flat_ring(a, 1.0, 2.3, G, 1, path, start=90 * k - 8, sweep=16)

    # Pavilion on the central common: six columns, a gold ring beam, a glass dome over a fountain.
    a.cyl(1.05, 0.1, 16, bevel=0.03, grounded=True).move(0, 0, G).color(P.STONE, P.CREAM)
    for k in range(6):
        x, y, _ = polar(0.8, 30 + 60 * k)
        a.cyl(0.055, 1.22, 6, bevel=0).move(x, y, G + 0.1).color(P.OFF_WHITE)
    a.lathe([(0.7, G + 1.3), (0.93, G + 1.3), (0.97, G + 1.36), (0.97, G + 1.44), (0.9, G + 1.48)], 16, cap_top=False).color(
        jk.shade(P.GOLD, -0.12), P.GOLD
    )
    a.lathe([(0.9, G + 1.48), (0.74, G + 1.72), (0.42, G + 1.9), (0.14, G + 1.96)], 16, cap_bottom=False, cap_top=False).part(
        "glass"
    ).color(P.GLASS_TINTED, P.ICE)
    a.lathe([(0.15, G + 1.95), (0.16, G + 2.02), (0.06, G + 2.1), (0, G + 2.3)], 8, cap_bottom=False).color(P.GOLD)
    a.lathe([(0.3, G + 0.1), (0.36, G + 0.3), (0.32, G + 0.32)], 10, cap_bottom=False, cap_top=False).color(P.STONE, P.CREAM)
    flat_disc(a, 0.32, G + 0.3, 10, jk.mix(P.SKY, P.TEAL, 0.4), part="glass")

    # A ring of eight equal homes, every door on the common path.
    for k in range(8):
        phi = 22.5 + 45 * k
        with a.group() as g:
            _garden_home(a)
        g.move(0, 3.9, G).rot(z=phi - 90)
    # Kitchen beds between the homes and a tree behind each, with one gap kept for the turbine.
    soil = P.WALNUT
    for k in range(8):
        phi = 45 * k
        with a.group() as g:
            a.box(0.9, 0.56, 0.08, bevel=0).color(soil)
            for i in (-1, 0, 1):
                a.box(0.78, 0.09, 0.1, bevel=0).move(0, i * 0.17, 0.06).color(P.LEAF if i else P.LIME)
        g.move(0, 3.62, G).rot(z=phi - 90)
        if k != 2:
            x, y, _ = polar(4.62, phi)
            _round_tree(a, x, y, G, 0.92 + 0.12 * (k % 3), seed=k + 2)
    _round_tree(a, *polar(1.62, 45)[:2], G, 0.95, seed=21)
    _round_tree(a, *polar(1.66, 225)[:2], G, 1.05, seed=27)
    for k in range(4):
        x, y, _ = polar(2.92, 90 * k)
        a.cyl(0.03, 0.82, 5, bevel=0).move(x, y, G).color(P.BRASS)
        a.sphere(0.085, 6, 3).move(x, y, G + 0.88).part("glow").color(P.LAMP)

    # One small wind turbine stands behind the ring, facing the front.
    tx, ty, hub = 0.0, 4.72, 5.62
    a.lathe([(0.25, G), (0.2, G + 0.12), (0.1, hub)], 8, cap_bottom=False).move(tx, ty, 0).color(P.SHADE_2, P.OFF_WHITE)
    a.loft([(-0.3, 0, 0), (-0.26, 0.12, 0.12), (0.18, 0.15, 0.15), (0.36, 0.1, 0.1), (0.4, 0, 0)], 8, 2.6).move(tx, ty, hub).color(
        P.OFF_WHITE
    )
    a.cone(0.11, 0.2, 8).rot(x=90).move(tx, ty - 0.29, hub).color(P.GOLD)
    for k in range(3):
        a.box(0.2, 0.05, 1.5, bevel=0.015, taper=(0.3, 0.6)).move(0, 0, 0.07).rot(y=120 * k).move(tx, ty - 0.36, hub).color(
            P.SHADE_1, P.OFF_WHITE
        )


@asset(
    "lm-tether-hub",
    tint="#ffffff",
    grounded=False,
    budget=4500,
    note="S3 transfer hub at the top of the tether. The tether passes through the 0.5-radius collar on the z axis.",
)
def tether_hub(a):
    R, r = 3.75, 0.42
    hull_lo, hull = jk.mix(P.OFF_WHITE, P.STEEL, 0.28), P.OFF_WHITE
    gold_lo, gold = jk.shade(P.GOLD, -0.15), P.GOLD
    a.torus(R, r, 36, 8).color(hull_lo, hull)

    # Six node modules on the ring; three carry docking arms, all carry running lights.
    for k in range(6):
        phi = 60 * k
        c = Vector(polar(R, phi))
        t = Vector((-math.sin(math.radians(phi)), math.cos(math.radians(phi)), 0))
        strut(a, c - t * 0.48, c + t * 0.48, 0.58, 10, bevel=0.07).color(hull_lo, hull)
        for s in (-1, 1):
            strut(a, c + t * s * 0.5, c + t * s * 0.6, 0.5, 10).part("metal").color(gold_lo, gold)
        for s in (-1, 1):
            a.dome(0.12, 0.09, 6, 2).rot(x=0 if s > 0 else 180).move(c.x, c.y, s * 0.57).part("glow").color(P.LAMP)
        if k % 2 == 0:
            strut(a, polar(R + 0.5, phi), polar(4.52, phi), 0.27, 10).color(hull_lo, hull)
            strut(a, polar(4.48, phi), polar(4.72, phi), 0.37, 10, bevel=0.04).part("metal").color(gold_lo, gold)
            strut(a, polar(4.72, phi), polar(4.76, phi), 0.24, 10).part("glow").color(P.GLOW_CYAN)
            strut(a, polar(1.02, phi), polar(R - r + 0.06, phi), 0.2, 8).color(hull_lo, hull)
            strut(a, polar(1.9, phi), polar(2.4, phi), 0.28, 8, bevel=0.06).color(hull_lo, hull)
        else:
            strut(a, polar(1.02, phi), polar(R - r + 0.06, phi), 0.085, 6).part("metal").color(P.STEEL)
    # Window slots along the outside of the ring.
    for k in range(12):
        phi = 30 + 60 * (k // 2) + (12 if k % 2 else -12)
        a.box(0.7, 0.08, 0.16, bevel=0).move(0, -(R + r), -0.08).rot(z=phi + 90).part("lit").color(P.WINDOW)

    # Central collar: a white drum around a gold sleeve the tether runs through.
    a.annulus(1.1, 0.62, 0.84, 16, bevel=0.06).move(0, 0, -0.42).color(hull_lo, hull)
    for k in range(8):
        a.box(0.3, 0.06, 0.18, bevel=0).move(0, -1.085, -0.09).rot(z=11.25 + 45 * k + 90).part("lit").color(P.WINDOW)
    sleeve = [(0.5, -1.2), (0.92, -1.2), (0.97, -1.12), (0.7, -0.72), (0.7, 0.72), (0.97, 1.12), (0.92, 1.2), (0.5, 1.2), (0.5, -1.2)]
    weld(a.lathe(sleeve, 16, cap_bottom=False, cap_top=False)).part("metal").color(gold_lo, gold)
    for z in (-0.62, 0.5):
        a.lathe([(0.7, z), (0.8, z + 0.02), (0.8, z + 0.1), (0.7, z + 0.12)], 16, cap_bottom=False, cap_top=False).color(P.GUNMETAL)
    for k in range(3):
        x, y, _ = polar(0.94, 60 + 120 * k)
        a.box(0.1, 0.1, 0.06, bevel=0.02).move(x, y, 1.2).part("glow").color(P.GLOW_ORANGE)

    # Solar petals fan out from the collar between the spokes.
    cell_lo, cell_hi = jk.mix(P.NAVY, P.BLUE, 0.3), jk.mix(P.NAVY, P.BLUE, 0.65)
    for k in range(6):
        phi = 30 + 60 * k
        a.prism([(1.32, -0.26), (2.78, -0.6), (2.78, 0.6), (1.32, 0.26)], 0.05, bevel=0.012).move(0, 0, 0.5).rot(z=phi).part(
            "glass"
        ).color(cell_lo, cell_hi, "x")
        rod(a, polar(1.0, phi, 0.36), polar(2.7, phi, 0.5), 0.035, 4).part("metal").color(P.STEEL)
