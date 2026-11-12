"""Industry: works and sheds, cranes, lattice towers, process plant and the S8 ruins.

Painted steelwork (cranes, derricks, masts, tanks) is the `metal` part in a near-white tone, so
the instance tint is its paint colour. Walls of the works, the shed, the cooling tower and the
ruins are the `tint` part. Lattices are built from square unbevelled members: chunky enough to
read as a truss at story distance and cheap enough to stay inside the budget.
"""

from __future__ import annotations

import math

import bmesh
from mathutils import Matrix, Vector

from kit import jk, parts
from kit import palette as P
from kit.jk import asset

HAZARD = "#e3b02f"
DECK = "#565c66"
SOOT = "#2a2e35"


# --------------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------------
def bar(a, p0, p1, w, d=None, caps=True, ref=None):
    """A square (or w by d) steel member from p0 to p1. `w` lies along the horizontal normal of
    the member (or along `ref`), `d` across it. 12 triangles; `caps=False` (8) is only for
    members stout enough, with both ends buried in other steel, that nothing sees inside."""
    p0, p1 = Vector(p0), Vector(p1)
    t = (p1 - p0).normalized()
    side = None
    if ref is not None:
        side = Vector(ref) - t * Vector(ref).dot(t)
    if side is None or side.length < 1e-5:
        side = t.cross(Vector((0, 0, 1)))
    if side.length < 1e-5:
        side = Vector((1, 0, 0))
    side.normalize()
    fwd = t.cross(side).normalized()
    d = w if d is None else d
    ring = ((-1, -1), (1, -1), (1, 1), (-1, 1))
    verts = [tuple(p + side * (sx * w / 2) + fwd * (sy * d / 2)) for p in (p0, p1) for sx, sy in ring]
    faces = [(i, (i + 1) % 4, 4 + (i + 1) % 4, 4 + i) for i in range(4)]
    if caps:
        faces += [(3, 2, 1, 0), (4, 5, 6, 7)]
    return a.add(jk.raw(verts, faces))


def zgrad(piece, z0, z1, low, high):
    """Paint a piece by absolute height, so a whole assembly shares one gradient."""
    lo, hi = jk.col(low), jk.col(high)
    span = (z1 - z0) or 1.0
    for f in piece.bm.faces:
        for loop in f.loops:
            t = min(1.0, max(0.0, (loop.vert.co.z - z0) / span))
            loop[piece.layer] = (lo[0] + (hi[0] - lo[0]) * t, lo[1] + (hi[1] - lo[1]) * t, lo[2] + (hi[2] - lo[2]) * t, 1.0)
    return piece


def tone(g, part, low, high=None):
    """Give every piece of a group one part and one bottom-to-top gradient."""
    pieces = g.pieces
    if not pieces:
        return g
    z0 = min(p.bounds()[0].z for p in pieces)
    z1 = max(p.bounds()[1].z for p in pieces)
    for p in pieces:
        zgrad(p.part(part), z0, z1, low, low if high is None else high)
    return g


def lattice(a, z0, z1, w0, w1, bays, leg=0.07, brace=0.04, d0=None, d1=None, pattern="z",
            cx=0.0, cy=0.0, rings=True, top_ring=True, legs=True, skip=()):
    """A four-legged lattice section from z0 to z1, w0 wide at the foot and w1 at the head.

    `pattern` "x" crosses every bay, "z" zig-zags one diagonal per face. Bays shorten as the
    tower narrows so they stay roughly square. `skip` drops the bracing of (bay, face) pairs.
    """
    d0 = w0 if d0 is None else d0
    d1 = w1 if d1 is None else d1

    def node(t, sx, sy):
        return Vector((cx + sx * (w0 + (w1 - w0) * t) / 2, cy + sy * (d0 + (d1 - d0) * t) / 2, z0 + (z1 - z0) * t))

    corners = ((-1, -1), (1, -1), (1, 1), (-1, 1))
    weights = [(w0 + (w1 - w0) * (k + 0.5) / bays) + (d0 + (d1 - d0) * (k + 0.5) / bays) for k in range(bays)]
    total = sum(weights)
    levels = [0.0]
    for w in weights:
        levels.append(levels[-1] + w / total)
    if legs:
        for sx, sy in corners:
            bar(a, node(0, sx, sy), node(1, sx, sy), leg, ref=(1, 0, 0))
    for k in range(bays):
        t0, t1 = levels[k], levels[k + 1]
        for i in range(4):
            p, q = corners[i], corners[(i + 1) % 4]
            if (k, i) not in skip:
                if pattern == "x" or (k + i) % 2 == 0:
                    bar(a, node(t0, *p), node(t1, *q), brace, caps=False)
                if pattern == "x" or (k + i) % 2 == 1:
                    bar(a, node(t0, *q), node(t1, *p), brace, caps=False)
            if (rings and k < bays - 1) or (top_ring and k == bays - 1):
                bar(a, node(t1, *p), node(t1, *q), brace, caps=False)
    return levels


def cross_arm(a, z, reach, hw, hd, rise=0.34, chord=0.05, sides=(-1, 1)):
    """A pylon cross-arm: four chords per side running from the body to a tip at z."""
    for side in sides:
        tip = (side * reach, 0, z)
        for sy in (-1, 1):
            bar(a, (side * hw, sy * hd, z), tip, chord, caps=False)
            bar(a, (side * hw, sy * hd, z + rise), tip, chord, caps=False)
        mid = side * (hw + (reach - hw) * 0.45)
        k = 1 - 0.45
        for dz in (0.0, rise * k):
            bar(a, (mid, -hd * k, z + dz), (mid, hd * k, z + dz), chord * 0.8, caps=False)
        for sy in (-1, 1):
            bar(a, (mid, sy * hd * k, z), (mid, sy * hd * k, z + rise * k), chord * 0.8, caps=False)


def insulator(a, x, y, z, length=0.34, r=0.08):
    """A string of glass discs hanging below (x, y, z)."""
    n = 2
    step = length / n
    pts = [(0.02, 0.0)]
    for i in range(n):
        pts += [(r, -step * (i + 0.35)), (0.028, -step * (i + 0.9))]
    pts.append((0.02, -length - 0.02))
    return a.lathe(pts[::-1], 6).move(x, y, z).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)


def cable(a, pts, r=0.012, colour=P.GUNMETAL):
    """A rope or wire. Closed, like every thin member here: the bake backs open shells."""
    return a.tube(pts, r, 3).color(colour).no_ao()


def footing(a, x, y, s=0.26, h=0.14):
    return a.box(s, s, h, bevel=0.03, grounded=True).move(x, y, 0).color(P.CONCRETE_DARK, P.CONCRETE)


def mound(a, x, y, z, r, squash=(1.2, 1.0, 0.5), seed=1, lumps=0.22, subdiv=1):
    """A faceted heap resting on the ground: a blob with everything below z = 0 removed."""
    piece = jk.blob(r, subdiv, squash, lumps=lumps, seed=seed).move(x, y, z)
    bm = piece.bm
    for v in bm.verts:
        if v.co.z < 0:
            v.co.z = 0.0
    dead = [f for f in bm.faces if all(v.co.z <= 1e-6 for v in f.verts)]
    if dead:
        bmesh.ops.delete(bm, geom=dead, context="FACES")
    bm.normal_update()
    return a.add(piece)


def settle(a):
    """Press anything that dips below the ground flat onto it, so debris reads as half buried."""
    for piece in a.pieces:
        for v in piece.bm.verts:
            if v.co.z < 0:
                v.co.z = 0.0
        piece.bm.normal_update()


def pane(a, centre, w, h, across="x"):
    """A single sheet of glass, w along `across` (x or y), h up. The bake gives it its back."""
    cx, cy, cz = centre
    dx, dy = (w / 2, 0.0) if across == "x" else (0.0, w / 2)
    v = [(cx - dx, cy - dy, cz - h / 2), (cx + dx, cy + dy, cz - h / 2), (cx + dx, cy + dy, cz + h / 2), (cx - dx, cy - dy, cz + h / 2)]
    return a.add(jk.raw(v, [(0, 1, 2, 3)])).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)


def spoked_wheel(a, r, tube_r=0.04, spokes=6, hub=0.09, width=0.1):
    """A sheave in the xz plane (axle along y), centred on the origin. Returns its group."""
    with a.group() as g:
        a.torus(r, tube_r, 16, 4).rot(x=90)
        for i in range(spokes):
            ang = i / spokes * math.tau
            bar(a, (0, 0, 0), (math.cos(ang) * r, 0, math.sin(ang) * r), tube_r * 0.9, caps=False, ref=(0, 1, 0))
        a.cyl(hub, width, 8, bevel=0.012).rot(x=90).move(0, width / 2, 0)
    return g


def beacon(a, x, y, z, colour=P.GLOW_RED, r=0.07):
    """A warning light on a short collar."""
    a.cyl(r * 0.85, r * 0.7, 8, bevel=0.008).move(x, y, z).color(P.GUNMETAL)
    return a.sphere(r, 8, 5).move(x, y, z + r * 1.25).part("glow").color(colour)


# --------------------------------------------------------------------------------------------
# Lattice towers
# --------------------------------------------------------------------------------------------
@asset("pylon", tint="#9aa0a6", budget=2400, note="High-voltage tower; lines run along y.")
def pylon(a):
    for sx in (-1, 1):
        for sy in (-1, 1):
            footing(a, sx * 0.47, sy * 0.47)
    waist, shoulder, peak = 2.35, 5.15, 6.0

    def half(z):
        return 0.25 + (0.16 - 0.25) * (z - waist) / (shoulder - waist)

    with a.group() as g:
        lattice(a, 0.1, waist, 0.94, 0.5, 2, leg=0.085, brace=0.05, pattern="x")
        lattice(a, waist, shoulder, 0.5, 0.32, 4, leg=0.075, brace=0.045, pattern="z")
        for sx in (-1, 1):
            for sy in (-1, 1):
                bar(a, (sx * 0.16, sy * 0.16, shoulder), (0, 0, peak), 0.05, caps=False)
        a.cone(0.045, 0.16, 6).move(0, 0, peak - 0.1)
        cross_arm(a, 3.75, 1.56, half(3.75), half(3.75), rise=0.42, chord=0.055)
        cross_arm(a, 4.8, 1.14, half(4.8), half(4.8), rise=0.36, chord=0.05)
    tone(g, "metal", P.SHADE_2, P.WHITE)
    for side in (-1, 1):
        insulator(a, side * 1.52, 0, 3.75)
        insulator(a, side * 1.1, 0, 4.8, 0.3, 0.07)


@asset("broken-pylon", tint="#8a8580", budget=2400, note="S8: a tower buckled forward (-y) at the waist.")
def broken_pylon(a):
    for sx in (-1, 1):
        for sy in (-1, 1):
            footing(a, sx * 0.4, sy * 0.4, 0.24, 0.12).rot(z=7 * sx * sy)
    waist = 2.2
    # The stump still stands, missing the bracing of its front face.
    with a.group() as stump:
        lattice(a, 0.08, waist, 0.8, 0.5, 2, leg=0.085, brace=0.05, pattern="x", skip={(1, 0), (0, 1)})
        # A brace torn loose at one end hangs down the front.
        bar(a, (-0.3, -0.31, 1.18), (0.1, -0.5, 0.22), 0.05)
        # The back legs tore apart at the waist and splay outward above it.
        for sx in (-1, 1):
            bar(a, (sx * 0.25, 0.25, waist - 0.02), (sx * 0.33, 0.4, waist + 0.5), 0.08, ref=(1, 0, 0))
    tone(stump, "metal", P.SHADE_2, P.SHADE_1)
    # The upper tower folded over its front legs and now hangs out over the street.
    fold = Matrix.Translation((0.0, -0.3, waist + 0.14)) @ Matrix.Rotation(math.radians(5), 4, "Z") @ Matrix.Rotation(math.radians(52), 4, "X")
    with a.group() as top:
        lattice(a, 0, 2.4, 0.5, 0.3, 4, leg=0.075, brace=0.045, pattern="z", skip={(0, 2), (1, 3), (3, 1)})
        for sx in (-1, 1):
            for sy in (-1, 1):
                bar(a, (sx * 0.15, sy * 0.15, 2.4), (0, 0, 2.95), 0.05, caps=False)
        cross_arm(a, 1.45, 0.52, 0.19, 0.19, rise=0.34, chord=0.05, sides=(1,))
        # The other arm snapped: only its stubs remain.
        for sy in (-1, 1):
            bar(a, (-0.19, sy * 0.19, 1.45), (-0.4, sy * 0.1, 1.36), 0.05)
    tone(top, "metal", P.SHADE_2, P.WHITE)
    top.apply(fold)
    # Gusset plates where the front legs buckled.
    for sx in (-1, 1):
        a.box(0.15, 0.2, 0.2, bevel=0.03).rot(x=26).move(sx * 0.25, -0.3, waist - 0.12).part("metal").color(P.SHADE_3, P.SHADE_2)
    # A snapped conductor still hangs from the surviving arm.
    tip = fold @ Vector((0.52, 0, 1.45))
    insulator(a, tip.x, tip.y, tip.z - 0.02, 0.3, 0.07)
    cable(a, [(tip.x, tip.y, tip.z - 0.34), (tip.x + 0.02, tip.y - 0.03, 1.4), (tip.x - 0.04, tip.y - 0.08, 0.3), (tip.x - 0.16, tip.y - 0.22, 0.03), (tip.x - 0.4, tip.y - 0.3, 0.03)], 0.018)
    # Reclaimed: scrub takes the footings.
    mound(a, -0.3, -0.5, 0.05, 0.18, (1.2, 1, 0.6), seed=3).color(P.LEAF_DEEP, P.MOSS)
    mound(a, 0.4, 0.42, 0.04, 0.13, (1, 1.1, 0.6), seed=5).color(P.LEAF_DEEP, P.MOSS)
    settle(a)


@asset("radio-mast", tint="#c9c3b5", budget=2400, note="Guyed lattice mast with dishes and a beacon.")
def radio_mast(a):
    a.box(0.6, 0.6, 0.14, bevel=0.03, grounded=True).color(P.CONCRETE_DARK, P.CONCRETE)
    w, z0, z1, bands = 0.3, 0.14, 6.74, 5
    each = (z1 - z0) / bands
    for k in range(bands):
        with a.group() as g:
            lattice(a, z0 + k * each, z0 + (k + 1) * each, w, w, 3, leg=0.06, brace=0.038, pattern="z", rings=False)
        if k % 2 == 0:
            tone(g, "base", jk.shade(P.RED, -0.12), P.RED)
        else:
            tone(g, "metal", P.SHADE_1, P.WHITE)
    # Head: a cap plate, the beacon and a lightning spike.
    a.box(0.36, 0.36, 0.06, bevel=0.015).move(0, 0, z1).part("metal").color(P.SHADE_2)
    beacon(a, 0, 0, z1 + 0.06, r=0.085)
    a.tube([(0.12, 0.12, z1 + 0.06), (0.12, 0.12, 7.2)], 0.014, 4).part("metal").color(P.SHADE_2)
    # Guys: three anchors, two levels each.
    for ang in (90, 210, 330):
        c, s = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        a.box(0.2, 0.2, 0.16, bevel=0.035, grounded=True).rot(z=ang).move(c * 0.7, s * 0.7, 0).color(P.CONCRETE_DARK, P.CONCRETE)
        for top in (3.95, 6.3):
            cable(a, [(c * 0.7, s * 0.7, 0.14), (c * 0.16, s * 0.16, top)], 0.011, P.STEEL_DARK)
    # A parabolic dish on a yoke, and two drum relays higher up.
    with a.group() as dish:
        a.lathe([(0.0, -0.035), (0.2, -0.01), (0.4, 0.11), (0.425, 0.14), (0.4, 0.15), (0.2, 0.045), (0.0, 0.02)], 12).part("metal").color(P.SHADE_2, P.WHITE)
        a.tube([(0, 0, 0.02), (0, 0, 0.3)], 0.016, 4).part("metal").color(P.SHADE_3)
        a.sphere(0.04, 6, 4).move(0, 0, 0.31).color(P.GUNMETAL)
        a.cyl(0.07, 0.16, 8, bevel=0.012).move(0, 0, -0.18).color(P.GUNMETAL)
    dish.rot(y=78).move(0.34, 0, 3.55)
    bar(a, (0.15, -0.15, 3.52), (0.15, 0.15, 3.52), 0.06).part("metal").color(P.SHADE_3)
    for z, ang, r in ((4.75, 200, 0.2), (5.45, 320, 0.17)):
        with a.group() as drum:
            a.cyl(r, 0.13, 10, bevel=0.02).rot(x=90).move(0, -0.2, 0).part("metal").color(P.SHADE_1, P.WHITE)
            a.cyl(r * 0.92, 0.02, 10, bevel=0).rot(x=90).move(0, -0.33, 0).color(P.OFF_WHITE)
            a.box(0.06, 0.1, 0.06, bevel=0).move(0, -0.2, -0.03).color(P.GUNMETAL)
        drum.rot(z=ang).move(0, 0, z)
    # Whip aerials near the head.
    bar(a, (-0.36, 0, 6.05), (0.36, 0, 6.05), 0.035).part("metal").color(P.SHADE_3)
    for side in (-1, 1):
        a.tube([(side * 0.36, 0, 5.82), (side * 0.36, 0, 6.5)], 0.016, 4).color(P.OFF_WHITE)
    # Equipment cabinet at the foot.
    a.box(0.24, 0.16, 0.34, bevel=0.025).move(0.16, -0.36, 0).color(P.SLATE, jk.shade(P.SLATE, 0.14))
    a.box(0.16, 0.012, 0.1, bevel=0).move(0.16, -0.445, 0.18).color(SOOT)
    cable(a, [(0.16, -0.3, 0.3), (0.14, -0.18, 0.5), (0.13, -0.14, 1.2)], 0.014, SOOT)


@asset("derrick", tint="#d9c24a", budget=2400, note="Oil derrick with a nodding pump beside it (+x).")
def derrick(a):
    a.box(1.0, 1.0, 0.16, bevel=0.03, grounded=True).color(P.CONCRETE_DARK, P.CONCRETE)
    top = 4.3
    with a.group() as g:
        lattice(a, 0.16, top, 0.86, 0.32, 6, leg=0.075, brace=0.042, pattern="x")
        a.box(0.5, 0.5, 0.09, bevel=0.02).move(0, 0, top)
        for sx in (-1, 1):
            for sy in (-1, 1):
                bar(a, (sx * 0.2, sy * 0.2, top + 0.09), (sx * 0.04, 0, 4.96), 0.045, caps=False)
        bar(a, (-0.07, 0, 4.96), (0.07, 0, 4.96), 0.06, 0.06)
    tone(g, "metal", P.SHADE_1, P.WHITE)
    # Crown sheave, travelling block and the drill string down to the wellhead.
    sheave = spoked_wheel(a, 0.13, 0.03, 4, 0.05, 0.07).rot(z=90).move(0, 0, 4.66)
    bar(a, (-0.15, 0, 4.66), (0.15, 0, 4.66), 0.04)
    for sx in (-1, 1):
        bar(a, (sx * 0.125, -0.115, 4.66), (sx * 0.125, 0.115, 4.66), 0.05)
    for p in sheave.pieces + a.pieces[-3:]:
        p.color(P.GUNMETAL)
    for sy in (-1, 1):
        cable(a, [(0, sy * 0.05, 4.6), (0, sy * 0.05, 3.2)], 0.012, P.GUNMETAL)
    a.box(0.2, 0.16, 0.26, bevel=0.03).move(0, 0, 2.94).color(P.CHARCOAL, P.SLATE)
    a.box(0.21, 0.165, 0.06, bevel=0).move(0, 0, 3.04).color(HAZARD)
    a.tube([(0, 0, 2.95), (0, 0, 0.3)], 0.035, 6, caps="none").part("metal").color(P.SHADE_3)
    a.cyl(0.11, 0.2, 8, bevel=0.02).move(0, 0, 0.16).color(P.GUNMETAL, P.STEEL_DARK)
    a.cyl(0.07, 0.03, 8, bevel=0).rot(y=90).move(0.11, 0, 0.27).color(P.RED)
    # Ladder up the back face.
    for sx in (-1, 1):
        bar(a, (sx * 0.08, 0.455, 0.2), (sx * 0.08, 0.2, top), 0.022, caps=False).color(P.GUNMETAL)
    for i in range(8):
        t = (i + 0.5) / 8
        bar(a, (-0.08, 0.455 - 0.255 * t, 0.2 + (top - 0.2) * t), (0.08, 0.455 - 0.255 * t, 0.2 + (top - 0.2) * t), 0.02, caps=False).color(P.GUNMETAL)
    # The pump: skid, samson post, walking beam with a horse head, cranks and a motor.
    a.box(1.5, 0.44, 0.08, bevel=0.02, grounded=True).move(1.56, 0, 0).color(P.GUNMETAL, P.STEEL_DARK)
    pivot = Vector((1.45, 0, 1.12))
    for sx in (-1, 1):
        for sy in (-1, 1):
            bar(a, (1.45 + sx * 0.24, sy * 0.16, 0.08), (1.45 + sx * 0.03, sy * 0.07, 1.06), 0.055).color(P.CHARCOAL, P.SLATE)
    a.box(0.14, 0.2, 0.08, bevel=0.02).move(1.45, 0, 1.04).color(P.CHARCOAL)
    with a.group() as beam:
        bar(a, (-0.6, 0, 0.07), (0.62, 0, 0.07), 0.09, 0.13, ref=(0, 1, 0))
        a.profile_y([(-0.6, 0.24), (-0.72, 0.19), (-0.8, 0.06), (-0.82, -0.1), (-0.77, -0.24), (-0.66, -0.3), (-0.58, -0.12), (-0.58, 0.12)], 0.11, bevel=0.015)
        a.box(0.1, 0.34, 0.07, bevel=0.015).move(0.58, 0, 0.11)
    for p in beam.pieces:
        p.color(jk.shade(P.RED, -0.12), P.RED)
    beam.rot(y=-13).move(pivot.x, pivot.y, pivot.z)
    head_x = pivot.x - 0.8
    cable(a, [(head_x - 0.035, 0, 1.04), (head_x - 0.035, 0, 0.42)], 0.012, P.GUNMETAL)
    a.cyl(0.06, 0.34, 8, bevel=0.015).move(head_x - 0.035, 0, 0.0).part("metal").color(P.SHADE_3, P.SHADE_1)
    a.cyl(0.09, 0.04, 8, bevel=0.01).move(head_x - 0.035, 0, 0.2).color(P.GUNMETAL)
    crank = Vector((2.0, 0, 0.46))
    a.box(0.3, 0.2, 0.34, bevel=0.03).move(crank.x, 0, 0.08).color(P.CHARCOAL, P.SLATE)
    for sy in (-1, 1):
        a.cyl(0.21, 0.07, 10, bevel=0.015).rot(x=90).move(crank.x + 0.02, sy * 0.19 + 0.035, crank.z - 0.02).color(SOOT, P.GUNMETAL)
        bar(a, (crank.x + 0.1, sy * 0.19, crank.z + 0.08), (pivot.x + 0.56, sy * 0.15, 0.98), 0.035).part("metal").color(P.SHADE_3)
    a.box(0.2, 0.26, 0.2, bevel=0.03).move(2.2, 0, 0.08).color(P.SLATE, jk.shade(P.SLATE, 0.15))


@asset("crane", tint="#e0a830", budget=2400, note="Tower crane; the jib reaches +x.")
def crane(a):
    a.box(1.5, 0.46, 0.2, bevel=0.03, grounded=True).color(P.CONCRETE_DARK, P.CONCRETE)
    a.box(0.46, 1.5, 0.2, bevel=0.03, grounded=True).color(P.CONCRETE_DARK, P.CONCRETE)
    a.box(0.78, 0.78, 0.3, bevel=0.03, grounded=True).color(P.CONCRETE_DARK, P.CONCRETE)
    mast_top, jz = 6.85, 7.26
    with a.group() as mast:
        lattice(a, 0.3, mast_top, 0.6, 0.6, 9, leg=0.085, brace=0.048, pattern="z")
    tone(mast, "metal", P.SHADE_1, P.WHITE)
    # Slewing ring and turntable.
    a.cyl(0.4, 0.14, 12, bevel=0.02).move(0, 0, mast_top).color(P.GUNMETAL, P.STEEL_DARK)
    with a.group() as upper:
        a.box(0.74, 0.62, 0.32, bevel=0.03).move(0, 0, mast_top + 0.14)
        # Cat head and pendants.
        apex = (0.0, 0.0, 8.28)
        for sx in (-1, 1):
            for sy in (-1, 1):
                bar(a, (sx * 0.28, sy * 0.24, jz), apex, 0.06, caps=False)
        a.box(0.12, 0.12, 0.1, bevel=0.02).move(0, 0, 8.2)
        # Jib: a triangular truss, two bottom chords and one top chord.
        x0, x1, n = 0.3, 4.45, 8
        step = (x1 - x0) / n
        top_z = jz + 0.42
        for sy in (-1, 1):
            bar(a, (x0, sy * 0.2, jz), (x1, sy * 0.2, jz), 0.06)
        bar(a, (x0, 0, top_z), (x1 - step * 0.5, 0, top_z), 0.06)
        for i in range(n):
            xa, xm, xb = x0 + i * step, x0 + (i + 0.5) * step, x0 + (i + 1) * step
            for sy in (-1, 1):
                bar(a, (xa, sy * 0.2, jz), (xm, 0, top_z), 0.036, caps=False)
                bar(a, (xm, 0, top_z), (xb, sy * 0.2, jz), 0.036, caps=False)
            bar(a, (xb, -0.2, jz), (xb, 0.2, jz), 0.036, caps=False)
        bar(a, (x0, -0.2, jz), (x0, 0.2, jz), 0.036, caps=False)
        bar(a, apex, (2.9, 0, top_z), 0.035, caps=False)
        bar(a, apex, (4.2, 0, top_z), 0.035, caps=False)
        # Counter-jib with a walkway.
        for sy in (-1, 1):
            bar(a, (-0.3, sy * 0.2, jz), (-1.9, sy * 0.2, jz), 0.06)
            bar(a, (-0.36, sy * 0.2, jz + 0.27), (-1.9, sy * 0.2, jz + 0.27), 0.03)
            for x in (-0.6, -1.03, -1.46, -1.885):
                bar(a, (x, sy * 0.2, jz), (x, sy * 0.2, jz + 0.27), 0.03)
        bar(a, apex, (-1.75, 0, jz + 0.03), 0.035, caps=False)
    tone(upper, "metal", P.SHADE_1, P.WHITE)
    a.box(1.56, 0.36, 0.03, bevel=0).move(-1.12, 0, jz + 0.015).color(DECK)
    # Counterweights hang under the tail; the hoist winch sits on the walkway.
    for i in range(3):
        a.box(0.17, 0.46, 0.5, bevel=0.025).move(-1.76 + i * 0.2, 0, jz - 0.52).color(P.CONCRETE_DARK, P.CONCRETE)
    a.box(0.34, 0.28, 0.2, bevel=0.03).move(-0.78, 0, jz + 0.03).color(P.CHARCOAL, P.SLATE)
    a.cyl(0.1, 0.3, 8, bevel=0.015).rot(x=90).move(-0.52, 0.15, jz + 0.14).color(P.GUNMETAL)
    # Operator's cab hung off the front of the turntable.
    cx, cy, cz = 0.42, -0.5, mast_top - 0.36
    a.box(0.42, 0.44, 0.5, bevel=0.04).move(cx, cy, cz).color(P.SHADE_2, P.OFF_WHITE)
    a.box(0.435, 0.3, 0.24, bevel=0.02).move(cx, cy - 0.08, cz + 0.19).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    a.box(0.46, 0.48, 0.045, bevel=0.015).move(cx, cy, cz + 0.49).color(P.SLATE)
    bar(a, (cx, cy + 0.2, cz + 0.5), (cx - 0.1, -0.3, mast_top + 0.2), 0.05).color(P.GUNMETAL)
    # Trolley, hoist ropes, hook block and hook.
    tx = 3.35
    a.box(0.34, 0.5, 0.07, bevel=0.015).move(tx, 0, jz - 0.1).color(P.CHARCOAL, P.SLATE)
    hook_z = 5.2
    for sx in (-1, 1):
        cable(a, [(tx + sx * 0.06, 0, jz - 0.1), (tx + sx * 0.06, 0, hook_z + 0.2)], 0.012, P.GUNMETAL)
    a.box(0.22, 0.1, 0.24, bevel=0.03).move(tx, 0, hook_z).color(jk.shade(HAZARD, -0.1), HAZARD)
    a.cyl(0.07, 0.11, 8, bevel=0.01).rot(x=90).move(tx, 0.055, hook_z + 0.13).color(P.GUNMETAL)
    a.torus(0.075, 0.024, 8, 4, arc=250).rot(x=90).rot(y=-60).move(tx, 0, hook_z - 0.1).color(P.GUNMETAL)
    beacon(a, 0, 0, 8.3, r=0.055)


@asset("harbor-crane", tint="#e0a830", budget=2400, note="Ship-to-shore gantry; boom reaches -y over the water.")
def harbor_crane(a):
    X, Y = 0.72, 0.8
    girder, gz = 0.3, 3.42
    # Quay rails with buffer stops, and a wheel bogie under each leg.
    for sy in (-1, 1):
        a.box(1.92, 0.07, 0.05, bevel=0).move(0, sy * Y, 0).color(P.GUNMETAL, P.STEEL_DARK)
        for sx in (-1, 1):
            a.box(0.06, 0.14, 0.12, bevel=0.015).move(sx * 0.93, sy * Y, 0).color(P.RED)
            a.box(0.4, 0.17, 0.14, bevel=0.03).move(sx * X, sy * Y, 0.1).color(P.CHARCOAL, P.SLATE)
            for dx in (-0.11, 0.11):
                a.cyl(0.075, 0.2, 8, bevel=0).rot(x=90).move(sx * X + dx, sy * Y + 0.1, 0.125).color(SOOT)
    with a.group() as frame:
        for sx in (-1, 1):
            for sy in (-1, 1):
                bar(a, (sx * X, sy * Y, 0.2), (sx * X, sy * Y, gz), 0.15, ref=(1, 0, 0))
            bar(a, (sx * X, -Y, 1.5), (sx * X, Y, 1.5), 0.11, 0.13)
            bar(a, (sx * X, -Y, 1.5), (sx * X, Y, gz - 0.1), 0.075, caps=False)
            bar(a, (sx * X, Y, 1.5), (sx * X, -Y, gz - 0.1), 0.075, caps=False)
        for sy in (-1, 1):
            bar(a, (-X, sy * Y, 0.34), (X, sy * Y, 0.34), 0.12, 0.14)
            bar(a, (-X - 0.075, sy * Y, gz - 0.07), (X + 0.075, sy * Y, gz - 0.07), 0.15, 0.15)
        # Twin girders: the back reach over the quay and the boom over the ship.
        for sx in (-1, 1):
            bar(a, (sx * girder, 1.5, gz + 0.11), (sx * girder, -5.5, gz + 0.11), 0.1, 0.24)
        for y in (1.45, -1.3, -1.9, -2.5, -3.1, -3.7, -4.9, -5.45):
            bar(a, (-girder, y, gz + 0.1), (girder, y, gz + 0.1), 0.06, 0.1, caps=False)
        # A-frame and stays.
        apex_y, apex_z = -0.5, 5.0
        for sx in (-1, 1):
            bar(a, (sx * girder, -Y, gz + 0.2), (sx * 0.2, apex_y, apex_z), 0.09)
            bar(a, (sx * girder, 0.55, gz + 0.2), (sx * 0.2, apex_y, apex_z), 0.075)
            bar(a, (sx * 0.2, apex_y, apex_z), (sx * girder, -3.1, gz + 0.22), 0.04, caps=False)
            bar(a, (sx * 0.2, apex_y, apex_z), (sx * girder, -5.3, gz + 0.22), 0.04, caps=False)
            bar(a, (sx * 0.2, apex_y, apex_z), (sx * girder, 1.42, gz + 0.22), 0.04, caps=False)
        bar(a, (-0.26, apex_y, apex_z), (0.26, apex_y, apex_z), 0.11, 0.11)
        bar(a, (-0.3, -0.63, 4.3), (0.3, -0.63, 4.3), 0.05, caps=False)
    tone(frame, "metal", P.SHADE_1, P.WHITE)
    beacon(a, 0, apex_y, apex_z + 0.05, r=0.055)
    # Machinery house on the back reach.
    a.box(0.98, 0.84, 0.56, bevel=0.035).move(0, 0.98, gz + 0.23).color(P.SHADE_2, P.OFF_WHITE)
    a.box(1.04, 0.9, 0.06, bevel=0.02).move(0, 0.98, gz + 0.78).color(P.SLATE, jk.shade(P.SLATE, 0.12))
    a.box(0.3, 0.3, 0.1, bevel=0.02).move(-0.2, 1.05, gz + 0.84).color(P.STEEL_DARK)
    for sx in (-1, 1):
        a.box(0.012, 0.36, 0.2, bevel=0).move(sx * 0.492, 0.98, gz + 0.46).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    # Operator's cab slung under the boom.
    a.box(0.5, 0.42, 0.4, bevel=0.04).move(0, -1.62, gz - 0.37).color(P.SHADE_2, P.OFF_WHITE)
    a.box(0.512, 0.22, 0.2, bevel=0.02).move(0, -1.74, gz - 0.3).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    # Trolley, ropes, spreader and a box on the hook.
    ty, sz = -4.3, 2.5
    a.box(0.78, 0.44, 0.1, bevel=0.02).move(0, ty, gz + 0.23).color(P.CHARCOAL, P.SLATE)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cable(a, [(sx * 0.2, ty + sy * 0.14, gz + 0.23), (sx * 0.5, ty + sy * 0.14, sz + 0.07)], 0.012, P.GUNMETAL)
    with a.group() as spreader:
        a.box(1.2, 0.42, 0.07, bevel=0.015).move(0, ty, sz)
    tone(spreader, "metal", P.SHADE_2, P.SHADE_1)
    shipping_box(a, 0.46, 0.46, 1.2, P.BLUE, sides=(True, True), top=False, ends=(True, True)).rot(z=90).move(0, ty, sz - 0.455)


# --------------------------------------------------------------------------------------------
# Shipping containers
# --------------------------------------------------------------------------------------------
def shipping_box(a, w, h, length, colour, sides=(True, True), top=True, ends=(True, True)):
    """A shipping container lying along y with its doors facing -y, standing on z = 0.

    `sides` = (left, right) and `top` choose which faces get corrugation; `ends` = (doors, back).
    """
    lo, hi = jk.shade(colour, -0.2), jk.shade(colour, 0.06)
    rib = jk.shade(colour, 0.14)
    with a.group() as g:
        a.box(w, length, h, bevel=0.022).color(lo, hi)
        proud = 0.014
        n = max(4, round(length / 0.25))
        pitch = (length - 0.16) / n
        for flag, sx in ((sides[0], -1), (sides[1], 1)):
            if not flag:
                continue
            for i in range(n):
                y = -length / 2 + 0.08 + pitch * (i + 0.5)
                a.add(jk.box(pitch * 0.56, h - 0.14, proud, bevel=0, taper=(0.55, 0.96), grounded=True)).rot(x=90).rot(
                    z=90 * sx
                ).move(sx * w / 2, y, h / 2).color(rib)
        if top:
            for i in range(n):
                y = -length / 2 + 0.08 + pitch * (i + 0.5)
                a.add(jk.box(w - 0.14, pitch * 0.56, proud, bevel=0, taper=(0.96, 0.55), grounded=True)).move(0, y, h).color(rib)
        if ends[1]:
            m = max(2, round(w / 0.24))
            for i in range(m):
                x = -w / 2 + 0.07 + (w - 0.14) / m * (i + 0.5)
                a.add(jk.box((w - 0.14) / m * 0.56, h - 0.14, proud, bevel=0, taper=(0.55, 0.96), grounded=True)).rot(x=-90).move(
                    x, length / 2, h / 2
                ).color(rib)
        if ends[0]:
            y = -length / 2
            a.box(0.014, 0.012, h - 0.1, bevel=0).move(0, y - 0.004, 0.05).color(jk.shade(colour, -0.45))
            for sx in (-1, 1):
                for k in (0.2, 0.36):
                    bar(a, (sx * w * k, y - 0.016, 0.05), (sx * w * k, y - 0.016, h - 0.05), 0.022).color(P.STEEL)
                a.box(w * 0.2, 0.02, 0.03, bevel=0).move(sx * w * 0.28, y - 0.024, h * 0.42).color(P.STEEL)
    return g


@asset("containers", tint="#ffffff", budget=2000, note="A two-high stack, doors to the front.")
def containers(a):
    w, h, length, pitch = 1.0, 0.78, 2.36, 1.08
    red, ochre, blue, green = "#b9483a", "#d99a2b", P.BLUE, "#3f8f63"
    bottom = ((-1, red, (True, False), False), (0, ochre, (False, False), False), (1, blue, (False, True), True))
    for col, colour, sides, top in bottom:
        shipping_box(a, w, h, length, colour, sides=sides, top=top).move(col * pitch, 0, 0)
    upper = ((-1, blue, (True, False)), (0, green, (False, True)))
    for col, colour, sides in upper:
        shipping_box(a, w, h, length, colour, sides=sides, top=True).move(col * pitch, 0.02 if col else -0.02, h + 0.02)


# --------------------------------------------------------------------------------------------
# Drilling and mining
# --------------------------------------------------------------------------------------------
def railing(a, pts, h=0.36, post=0.028):
    """Posts and a top rail along a polyline of (x, y, z) deck points."""
    for p, q in zip(pts, pts[1:]):
        bar(a, (p[0], p[1], p[2] + h), (q[0], q[1], q[2] + h), post, caps=False)
        bar(a, (p[0], p[1], p[2] + h * 0.5), (q[0], q[1], q[2] + h * 0.5), post * 0.8, caps=False)
    for p in pts:
        bar(a, p, (p[0], p[1], p[2] + h), post, caps=False)


@asset("drill", tint="#e0a830", budget=2400, note="Drilling rig on a raised deck; spoil heap at +x front.")
def drill(a):
    deck = 0.58
    a.box(2.4, 2.4, 0.5, bevel=0.05, grounded=True).color(P.CHARCOAL, DECK)
    a.box(2.46, 2.46, 0.08, bevel=0.02).move(0, 0, 0.5).color(P.SLATE, jk.shade(P.SLATE, 0.16))
    a.box(2.47, 2.47, 0.035, bevel=0).move(0, 0, 0.455).color(HAZARD)
    # Access stair on the front.
    for i in range(3):
        a.box(0.24, 0.32, 0.145 * (i + 1), bevel=0.015, grounded=True).move(-1.08 + 0.24 * i, -1.36, 0).color(DECK, P.SLATE)
    cy, top = 0.12, 4.5
    with a.group() as mast:
        lattice(a, deck, top, 0.84, 0.42, 5, leg=0.08, brace=0.045, pattern="x", cy=cy)
        a.box(0.6, 0.6, 0.1, bevel=0.02).move(0, cy, top)
        railing(a, [(-1.19, -0.36, deck), (-1.19, 1.19, deck), (1.19, 1.19, deck), (1.19, 0.2, deck)])
        railing(a, [(-0.3, -1.19, deck), (1.19, -1.19, deck)])
    tone(mast, "metal", P.SHADE_1, P.WHITE)
    beacon(a, 0, cy, top + 0.1, P.GLOW_ORANGE, 0.085)
    # Top drive on its ropes, the drill string and the rotary table.
    for sx in (-1, 1):
        cable(a, [(sx * 0.07, cy, top), (sx * 0.07, cy, 3.3)], 0.012, P.GUNMETAL)
    a.box(0.34, 0.3, 0.42, bevel=0.04).move(0, cy, 2.9).color(P.CHARCOAL, P.SLATE)
    a.box(0.35, 0.31, 0.07, bevel=0).move(0, cy, 3.1).color(HAZARD)
    a.cyl(0.1, 0.16, 8, bevel=0.02).move(0, cy, 2.76).color(P.GUNMETAL)
    a.tube([(0, cy, 2.8), (0, cy, deck)], 0.05, 6, caps="none").part("metal").color(P.SHADE_3, P.SHADE_1)
    for z in (1.35, 2.1):
        a.cyl(0.075, 0.14, 6, bevel=0.015).move(0, cy, z).part("metal").color(P.SHADE_3)
    a.cyl(0.3, 0.07, 12, bevel=0.02).move(0, cy, deck).color(P.GUNMETAL, P.STEEL_DARK)
    a.cyl(0.14, 0.05, 8, bevel=0.012).move(0, cy, deck + 0.07).color(P.RED)
    # Motor house with a louvre, a window and an exhaust stack.
    hx, hy = -0.72, 0.78
    a.box(0.82, 0.7, 0.66, bevel=0.035).move(hx, hy, deck).color(P.SHADE_2, P.OFF_WHITE)
    a.profile_x([(-0.4, 0), (0.4, 0), (0.4, 0.06), (0, 0.16), (-0.4, 0.06)], 0.9, bevel=0.02).move(hx, hy, deck + 0.66).color(P.SLATE, jk.shade(P.SLATE, 0.16))
    for i in range(3):
        a.box(0.4, 0.03, 0.05, bevel=0).rot(x=-28).move(hx - 0.08, hy - 0.36, deck + 0.2 + i * 0.1).color(P.SLATE)
    a.box(0.012, 0.3, 0.22, bevel=0).move(hx - 0.412, hy, deck + 0.34).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    a.tube([(hx + 0.24, hy + 0.14, deck + 0.7), (hx + 0.24, hy + 0.14, deck + 1.36)], 0.05, 6).color(P.GUNMETAL, P.STEEL_DARK)
    a.cyl(0.085, 0.05, 6, bevel=0.012).move(hx + 0.24, hy + 0.14, deck + 1.38).color(SOOT)
    a.tube([(hx + 0.42, hy - 0.2, deck + 0.3), (hx + 0.6, hy - 0.3, deck + 0.16), (-0.1, cy + 0.2, deck + 0.12)], 0.035, 5).color(SOOT)
    # Spare drill pipe racked on the deck.
    for y in (-0.55, 0.45):
        a.box(0.5, 0.07, 0.07, bevel=0).move(0.8, y, deck).color(P.GUNMETAL)
    for i, (x, z) in enumerate(((0.64, 0.115), (0.76, 0.115), (0.88, 0.115), (0.7, 0.215), (0.82, 0.215))):
        a.tube([(x, -0.95, deck + z), (x, 0.8 - 0.06 * (i % 2), deck + z)], 0.052, 6).part("metal").color(P.SHADE_3, P.SHADE_1)
    # Spoil: a cuttings chute off the deck and the heap it feeds.
    a.profile_x([(-0.1, 0), (0.1, 0), (0.14, 0.07), (0.1, 0.07), (0.08, 0.03), (-0.08, 0.03), (-0.1, 0.07), (-0.14, 0.07)], 0.75, bevel=0).rot(y=24).move(
        1.5, -0.8, 0.52
    ).color(P.GUNMETAL, P.STEEL_DARK)
    mound(a, 1.62, -0.82, 0.14, 0.52, (1.05, 1.0, 0.66), seed=3).color("#7d5238", "#a9744f")
    mound(a, 1.12, -1.36, 0.05, 0.22, (1.1, 1.0, 0.6), seed=8).color("#7d5238", "#a9744f")


@asset("mining-rig", tint="#e0a830", budget=2400, note="Mine head: headframe, winding wheel, hopper (+x front) and conveyor.")
def mining_rig(a):
    pad = 0.24
    ring = [(math.cos((i + 0.5) / 8 * math.tau) * 1.5, math.sin((i + 0.5) / 8 * math.tau) * 1.5) for i in range(8)]
    a.prism(ring, pad, bevel=0.04, grounded=True).color(jk.shade(P.SLATE, -0.12), P.SLATE)
    # Shaft collar with a lamp strip round the opening.
    a.box(0.86, 0.86, 0.16, bevel=0.03).move(0, 0, pad).color(P.CONCRETE_DARK, P.CONCRETE)
    a.box(0.6, 0.6, 0.02, bevel=0).move(0, 0, pad + 0.15).color(SOOT).no_ao()
    for sx, sy, w, d in ((0, -1, 0.66, 0.035), (0, 1, 0.66, 0.035), (-1, 0, 0.035, 0.66), (1, 0, 0.035, 0.66)):
        a.box(w, d, 0.03, bevel=0).move(sx * 0.315, sy * 0.315, pad + 0.16).part("glow").color(P.GLOW_ORANGE)
    # Headframe with raking backstays toward the winder.
    head = 3.05
    wx, wz, wr = -0.16, 3.66, 0.46
    with a.group() as frame:
        lattice(a, pad, head, 1.06, 0.66, 4, leg=0.09, brace=0.05, pattern="x")
        a.box(0.92, 0.8, 0.09, bevel=0.02).move(0, 0, head)
        for sy in (-1, 1):
            bar(a, (-0.3, sy * 0.3, head + 0.05), (-1.3, sy * 0.44, pad), 0.09, ref=(0, 1, 0))
            for sx in (-1, 1):
                bar(a, (wx + sx * 0.3, sy * 0.17, head + 0.09), (wx, sy * 0.17, wz), 0.06)
        for t in (0.3, 0.62):
            x, z = -0.3 + (-1.0) * t, head + 0.05 + (pad - head - 0.05) * t
            bar(a, (x, -0.3 - 0.14 * t, z), (x, 0.3 + 0.14 * t, z), 0.055, caps=False)
        railing(a, [(0.44, -0.38, head + 0.09), (0.44, 0.38, head + 0.09)], 0.3, 0.026)
    tone(frame, "tint", P.SHADE_1, P.WHITE)
    # The winding wheel and its rope: down the shaft on one side, back to the drum on the other.
    wheel = spoked_wheel(a, wr, 0.045, 6, 0.09, 0.3).move(wx, 0, wz)
    for p in wheel.pieces:
        p.part("metal").color(P.SHADE_2, P.WHITE)
    cable(a, [(wx + wr, 0, wz), (wx + wr, 0, 1.76)], 0.014, SOOT)
    cable(a, [(wx - wr * 0.66, 0, wz + wr * 0.75), (-0.98, 0, pad + 0.5)], 0.014, SOOT)
    a.box(0.32, 0.32, 0.42, bevel=0.03).move(wx + wr, 0, 1.34).color(P.CHARCOAL, P.SLATE)
    a.box(0.33, 0.33, 0.06, bevel=0).move(wx + wr, 0, 1.62).color(HAZARD)
    a.box(0.5, 0.56, 0.12, bevel=0.02).move(-0.98, 0, pad).color(P.GUNMETAL, P.STEEL_DARK)
    a.cyl(0.19, 0.4, 10, bevel=0.02).rot(x=90).move(-0.98, 0.2, pad + 0.34).color(P.CHARCOAL, P.SLATE)
    for sy in (-1, 1):
        a.cyl(0.24, 0.03, 10, bevel=0).rot(x=90).move(-0.98, sy * 0.2 + 0.015, pad + 0.34).part("metal").color(P.SHADE_2)
    a.box(0.26, 0.3, 0.26, bevel=0.03).move(-0.6, 0.0, pad + 0.02).color(P.SLATE, jk.shade(P.SLATE, 0.14))
    beacon(a, 0.36, 0.3, head + 0.09, r=0.065)
    # Ore hopper on legs, heaped with ore.
    hx, hy, rim = 1.5, -0.4, 1.36
    with a.group() as hopper:
        a.box(0.92, 0.92, 0.6, bevel=0.03, taper=0.4).rot(x=180).move(hx, hy, rim)
        a.box(1.0, 1.0, 0.09, bevel=0.02).move(hx, hy, rim - 0.04)
        for sx in (-1, 1):
            for sy in (-1, 1):
                bar(a, (hx + sx * 0.42, hy + sy * 0.42, 0), (hx + sx * 0.42, hy + sy * 0.42, rim - 0.04), 0.07, ref=(1, 0, 0))
            bar(a, (hx + sx * 0.42, hy - 0.42, 0.1), (hx + sx * 0.42, hy + 0.42, 0.68), 0.04, caps=False)
            bar(a, (hx - 0.42, hy + sx * 0.42, 0.68), (hx + 0.42, hy + sx * 0.42, 0.1), 0.04, caps=False)
    tone(hopper, "tint", P.SHADE_2, P.WHITE)
    a.box(0.26, 0.26, 0.2, bevel=0.03).move(hx, hy, rim - 0.78).color(P.CHARCOAL)
    a.blob(0.4, 1, (1.0, 1.0, 0.5), seed=6).move(hx, hy, rim + 0.04).color("#3f434b", "#666b74")
    for dx, dy, h, tilt in ((-0.12, 0.08, 0.34, 12), (0.14, -0.1, 0.28, -18), (0.02, 0.2, 0.22, 24)):
        a.lathe([(0, 0), (0.07, h * 0.36), (0.045, h * 0.8), (0, h)], 5).rot(x=tilt, y=tilt * 0.6).move(hx + dx, hy + dy, rim + 0.12).part("glow").color(P.GLOW_CYAN)
    # Conveyor from the shaft up to the hopper.
    c0, c1 = Vector((0.5, -0.12, pad + 0.34)), Vector((hx - 0.34, hy + 0.06, rim + 0.2))
    bar(a, c0, c1, 0.3, 0.08).color(P.CHARCOAL, P.SLATE)
    lift = Vector((0, 0, 0.05))
    bar(a, c0 + lift, c1 + lift, 0.22, 0.03, caps=False).color(SOOT)
    side = (c1 - c0).cross(Vector((0, 0, 1))).normalized()
    for p in (c0, c1):
        a.cyl(0.075, 0.32, 8, bevel=0.012).rot(x=90).rot(z=math.degrees(math.atan2(side.y, side.x)) - 90).move(p.x + side.x * 0.16, p.y + side.y * 0.16, p.z).color(P.GUNMETAL)
    mid = c0.lerp(c1, 0.5)
    with a.group() as legs:
        for s in (-1, 1):
            bar(a, mid + side * (s * 0.14), (mid.x + side.x * s * 0.26, mid.y + side.y * s * 0.26, pad), 0.05)
        bar(a, c0 + side * 0.0 + Vector((0, 0, -0.04)), (c0.x, c0.y, pad), 0.07)
    tone(legs, "tint", P.SHADE_2, P.SHADE_1)
    for t, r in ((0.3, 0.07), (0.62, 0.09)):
        q = c0.lerp(c1, t)
        a.blob(r, 1, (1.2, 1, 0.8), seed=int(t * 10)).move(q.x, q.y, q.z + 0.1).color("#3f434b", "#666b74")
    q = c0.lerp(c1, 0.8)
    a.lathe([(0, 0), (0.05, 0.07), (0, 0.2)], 5).rot(x=20).move(q.x, q.y, q.z + 0.07).part("glow").color(P.GLOW_CYAN)


# --------------------------------------------------------------------------------------------
# Process plant
# --------------------------------------------------------------------------------------------
def handwheel(a, r=0.1, colour=P.RED):
    """A valve handwheel lying flat, centred on the origin."""
    with a.group() as g:
        a.torus(r, r * 0.2, 8, 4).color(colour)
        bar(a, (-r, 0, 0), (r, 0, 0), r * 0.26, caps=False).color(colour)
        bar(a, (0, -r, 0), (0, r, 0), r * 0.26, caps=False).color(colour)
    return g


def valve(a, x, y, z, r, axis="y"):
    """A gate valve on a pipe of radius r running along `axis`, with a red handwheel on a stem."""
    with a.group() as g:
        a.cyl(r * 1.7, r * 2.2, 8, bevel=0.012).rot(x=90).move(0, r * 1.1, 0).color(P.GUNMETAL, P.STEEL_DARK)
        a.cyl(r * 0.8, r * 2.4, 6, bevel=0.01).move(0, 0, r * 0.8).color(P.GUNMETAL)
        handwheel(a, r * 2.1).move(0, 0, r * 3.3)
    if axis == "x":
        g.rot(z=90)
    return g.move(x, y, z)


def flange(a, x, y, z, r, axis="y", colour=P.STEEL_DARK):
    c = a.cyl(r, 0.05, 8, bevel=0.01)
    if axis == "y":
        c.rot(x=90).move(0, 0.025, 0)
    elif axis == "x":
        c.rot(y=90).move(-0.025, 0, 0)
    else:
        c.move(0, 0, -0.025)
    return c.move(x, y, z).color(colour)


@asset("oil-tank", tint="#d9dde2", budget=2400, note="Storage tank; stair climbs from +x toward the front.")
def oil_tank(a):
    R, H, sides = 1.48, 1.36, 20
    a.cyl(R + 0.1, 0.07, sides, bevel=0.02, grounded=True).color(P.CONCRETE_DARK, P.CONCRETE)
    shell = a.lathe(
        [(R, 0.05), (R, 0.84), (R, 1.04), (R, H), (R + 0.035, H + 0.012), (R + 0.035, H + 0.06), (R - 0.03, H + 0.08), (0.3, H + 0.25), (0, H + 0.27)],
        sides, cap_bottom=False,
    ).part("metal").color(P.SHADE_1, P.WHITE)
    shell.paint(lambda f: P.SHADE_3 if 0.85 < f.calc_center_median().z < 1.03 else None)
    # Roof: centre vent, gauge hatch and a walkway from the stair head.
    a.cyl(0.11, 0.12, 8, bevel=0.015).move(0, 0, H + 0.25).part("metal").color(P.SHADE_2)
    a.cyl(0.17, 0.035, 8, bevel=0.01).move(0, 0, H + 0.39).part("metal").color(P.SHADE_3)
    a.cyl(0.14, 0.06, 8, bevel=0.015).move(-0.55, 0.5, H + 0.17).part("metal").color(P.SHADE_2)
    top_ang = math.radians(-62)
    edge = Vector((math.cos(top_ang) * (R - 0.02), math.sin(top_ang) * (R - 0.02), H + 0.1))
    bar(a, edge, (edge.x * 0.14, edge.y * 0.14, H + 0.265), 0.26, 0.025).color(DECK)
    # Rim rail.
    with a.group() as rail:
        n = 14
        for i in range(n):
            ang = (i + 0.5) / n * math.tau
            bar(a, (math.cos(ang) * R, math.sin(ang) * R, H + 0.06), (math.cos(ang) * R, math.sin(ang) * R, H + 0.36), 0.026, caps=False)
        a.torus(R, 0.016, sides, 3).move(0, 0, H + 0.36)
    for p in rail.pieces:
        p.color(HAZARD)
    # Spiral stair wrapping the shell.
    steps, a0, sweep = 10, math.radians(4), math.radians(-66)
    rs = R + 0.15
    for i in range(steps):
        t = (i + 0.5) / steps
        ang = a0 + sweep * t
        a.box(0.26, 0.15, 0.03, bevel=0).rot(z=math.degrees(ang)).move(math.cos(ang) * rs, math.sin(ang) * rs, 0.07 + (H + 0.02 - 0.07) * t).color(DECK)
    helix = lambda r, dz, k=8: [(math.cos(a0 + sweep * i / k) * r, math.sin(a0 + sweep * i / k) * r, 0.05 + (H + 0.03 - 0.05) * i / k + dz) for i in range(k + 1)]
    a.tube(helix(R + 0.28, -0.03), 0.022, 4).color(P.GUNMETAL)
    a.tube(helix(R + 0.28, 0.32), 0.018, 4).color(HAZARD)
    for i in (0, 2, 4, 6, 8):
        lo, hi = helix(R + 0.28, -0.03)[i], helix(R + 0.28, 0.32)[i]
        bar(a, lo, hi, 0.024, caps=False).color(HAZARD)
    ang = a0 + sweep
    a.box(0.3, 0.34, 0.03, bevel=0).rot(z=math.degrees(ang)).move(math.cos(ang) * (R + 0.13), math.sin(ang) * (R + 0.13), H + 0.03).color(DECK)
    # Pipe manifold at the front-left: a header on sleepers, two valved branches into the shell.
    hy, hz, pr = -(R + 0.36), 0.22, 0.07
    a.tube([(-1.25, hy, hz), (0.15, hy, hz)], pr, 8).color(P.STEEL_DARK, P.STEEL)
    a.tube([(0.15, hy, hz), (0.27, hy, hz), (0.33, hy, hz - 0.06), (0.33, hy, 0.0)], pr, 8, caps="none").color(P.STEEL_DARK, P.STEEL)
    flange(a, -1.25, hy, hz, pr + 0.04, "x", P.GUNMETAL)
    for x in (-0.9, -0.25):
        wall = -math.sqrt(R * R - x * x) + 0.02
        a.tube([(x, hy, hz), (x, wall, hz)], pr * 0.9, 8, caps="none").color(P.STEEL_DARK, P.STEEL)
        flange(a, x, wall - 0.03, hz, pr + 0.04, "y", P.GUNMETAL)
        valve(a, x, (hy + wall) / 2 - 0.1, hz, pr * 0.9)
        a.box(0.2, 0.12, hz - pr, bevel=0.015, grounded=True).move(x + 0.3, hy, 0).color(P.CONCRETE_DARK, P.CONCRETE)


@asset("cooling-tower", tint="#b9bfc5", budget=2400, note="Hyperboloid shell on a ring of raking columns.")
def cooling_tower(a):
    sides = 24
    lip, throat, top = 0.7, 4.45, 6.15
    rt, c = 1.2, 2.72

    def radius(z):
        return rt * math.sqrt(1 + ((z - throat) / c) ** 2)

    # Basin, and the dark fill behind the columns.
    a.lathe([(2.2, 0), (2.2, 0.1), (2.13, 0.17), (1.8, 0.17), (1.76, lip + 0.03)], sides, cap_bottom=False, cap_top=False).color(
        P.CONCRETE_DARK, P.CONCRETE
    ).paint(lambda f: SOOT if f.calc_center_median().z > 0.2 else None)
    # The shell is one closed solid: thin lip, outer wall, a stiffening ring at the rim, then
    # the inside of the throat falling away into the dark.
    zs = [lip, 1.2, 1.9, 2.7, 3.5, throat, 5.2, 5.8, top]
    rim = radius(top)
    profile = [(radius(lip) - 0.14, lip + 0.02)] + [(radius(z), z) for z in zs]
    profile += [(rim + 0.07, top + 0.02), (rim + 0.07, top + 0.14), (rim - 0.09, top + 0.16)]
    profile += [(radius(5.6) - 0.1, 5.6), (radius(4.9) - 0.12, 4.9), (0, 4.5)]
    shell = a.lathe(profile, sides).part("tint").color(P.SHADE_2, P.WHITE)

    def inside(f):
        c = f.calc_center_median()
        if c.z > lip + 0.05 and f.normal.x * c.x + f.normal.y * c.y < -1e-4 and f.normal.z > 0.05:
            return jk.mix("#55585c", "#17191c", min(1.0, (top + 0.16 - c.z) / 1.1))
        return "#3c4046" if c.z < lip + 0.05 and f.normal.z < -0.5 else None

    shell.paint(inside)
    # Raking columns in a zig-zag ring.
    n = 16
    r_low, r_high = 2.06, radius(lip) - 0.07
    with a.group() as cols:
        for i in range(n):
            a0, a1, a2 = (i / n * math.tau, (i + 0.5) / n * math.tau, (i + 1) / n * math.tau)
            apex = (math.cos(a1) * r_high, math.sin(a1) * r_high, lip + 0.04)
            for ang in (a0, a2):
                bar(a, (math.cos(ang) * r_low, math.sin(ang) * r_low, 0.15), apex, 0.085, caps=False)
    tone(cols, "tint", P.SHADE_3, P.SHADE_1)
    # Inspection ladder up the shell to a rim light, plus two more rim lights.
    ladder_z = [lip + 0.1, 1.5, 2.4, 3.3, throat, 5.3, top + 0.1]
    for off in (-0.07, 0.07):
        a.tube([(off, -(radius(z) + 0.04), z) for z in ladder_z], 0.016, 4).color(P.GUNMETAL)
    for i in range(12):
        z = lip + 0.3 + i * 0.45
        bar(a, (-0.07, -(radius(z) + 0.04), z), (0.07, -(radius(z) + 0.04), z), 0.02).color(P.GUNMETAL)
    for ang in (-90, 30, 150):
        cr, sr = math.cos(math.radians(ang)) * (rim + 0.0), math.sin(math.radians(ang)) * (rim + 0.0)
        a.sphere(0.06, 6, 4).move(cr, sr, top + 0.2).part("glow").color(P.GLOW_RED)
    # Basin outlet: a fat pipe with a valve leaving the foot.
    a.tube([(1.2, -1.75, 0.3), (1.34, -1.95, 0.3), (1.42, -2.06, 0.24), (1.42, -2.06, 0.0)], 0.11, 8, caps="none").color(P.STEEL_DARK, P.STEEL)
    flange(a, 1.31, -1.9, 0.3, 0.15, "y", P.GUNMETAL).rot(z=-35, pivot=(1.31, -1.9, 0.3))


@asset("pressure-tank", tint="#9aa6b1", budget=2400, note="Vertical pressure vessel on a skirt; gauges face the front.")
def pressure_tank(a):
    R, sides = 0.88, 16
    a.cyl(1.0, 0.1, sides, bevel=0.025, grounded=True).color(P.CONCRETE_DARK, P.CONCRETE)
    # Skirt with a base ring, then the vessel with dished heads and two girth flanges.
    a.lathe([(0.84, 0.1), (0.84, 0.16), (0.76, 0.17), (0.76, 0.56)], sides, cap_bottom=False, cap_top=False).part("metal").color(P.SHADE_3, P.SHADE_2)
    body = [
        (0.74, 0.5), (0.84, 0.58), (R, 0.74), (R, 0.86), (R + 0.04, 0.875), (R + 0.04, 0.935), (R, 0.95),
        (R, 2.02), (R + 0.04, 2.035), (R + 0.04, 2.095), (R, 2.11), (R, 2.2),
        (0.83, 2.47), (0.62, 2.67), (0.34, 2.79), (0, 2.83),
    ]
    a.lathe(body, sides, cap_bottom=False).part("metal").color(P.SHADE_1, P.WHITE)
    # Head fittings: nozzle with a relief valve, a lifting lug and the warning light.
    a.cyl(0.13, 0.16, 8, bevel=0.02).move(0, 0, 2.8).part("metal").color(P.SHADE_2)
    a.cyl(0.19, 0.045, 8, bevel=0.012).move(0, 0, 2.93).part("metal").color(P.SHADE_3)
    a.cyl(0.06, 0.16, 6, bevel=0.012).move(0, 0, 2.97).color(P.RED)
    bar(a, (0.5, -0.5, 2.5), (0.5, -0.5, 2.86), 0.045).color(P.GUNMETAL)
    beacon(a, 0.5, -0.5, 2.86, P.GLOW_ORANGE, 0.085)
    # Manway.
    a.cyl(0.24, 0.1, 10, bevel=0.02).rot(x=90).move(0.12, -R + 0.03, 1.62).part("metal").color(P.SHADE_2, P.SHADE_1)
    a.cyl(0.17, 0.03, 10, bevel=0.01).rot(x=90).move(0.12, -R - 0.07, 1.62).part("metal").color(P.SHADE_3)
    bar(a, (0.02, -R - 0.11, 1.62), (0.22, -R - 0.11, 1.62), 0.03).color(P.GUNMETAL)
    # Gauge board on a standpipe.
    gx = -0.5
    gy = -math.sqrt(R * R - gx * gx)
    a.tube([(gx, gy + 0.04, 0.7), (gx, gy - 0.12, 0.7), (gx, gy - 0.16, 0.76), (gx, gy - 0.16, 1.3)], 0.028, 5, caps="none").color(P.BRASS)
    a.box(0.4, 0.05, 0.24, bevel=0.015).move(gx, gy - 0.17, 1.24).color(P.CHARCOAL, P.SLATE)
    for dx in (-0.1, 0.1):
        a.cyl(0.085, 0.03, 10, bevel=0.008).rot(x=90).move(gx + dx, gy - 0.195, 1.36).color(P.BRASS)
        a.cyl(0.066, 0.012, 10, bevel=0).rot(x=90).move(gx + dx, gy - 0.226, 1.36).color(P.OFF_WHITE).no_ao()
        bar(a, (gx + dx, gy - 0.24, 1.36), (gx + dx + 0.03, gy - 0.24, 1.405), 0.012).color(P.RED).no_ao()
    # Ladder up the right side.
    lx = R + 0.08
    for sy in (-1, 1):
        a.tube([(lx, sy * 0.1, 0.1), (lx, sy * 0.1, 2.2), (lx - 0.14, sy * 0.1, 2.52)], 0.018, 4).color(P.GUNMETAL)
    for i in range(8):
        z = 0.34 + i * 0.26
        bar(a, (lx, -0.1, z), (lx, 0.1, z), 0.02, caps=False).color(P.GUNMETAL)
    for z in (0.95, 2.1):
        bar(a, (R - 0.02, 0, z - 0.04), (lx, 0, z - 0.04), 0.03, 0.22).color(P.GUNMETAL)
    # Feed line: out of the left side, through a valve and down into the ground.
    px = -(R + 0.2)
    a.tube([(-R + 0.04, 0.1, 1.05), (px - 0.02, 0.1, 1.05), (px + 0.0, 0.1, 0.97), (px, 0.1, 0.0)], 0.07, 8).color(P.STEEL_DARK, P.STEEL)
    flange(a, -R - 0.02, 0.1, 1.05, 0.11, "x", P.GUNMETAL)
    with a.group() as v:
        a.cyl(0.115, 0.16, 8, bevel=0.012).color(P.GUNMETAL, P.STEEL_DARK)
        a.cyl(0.04, 0.16, 6, bevel=0.01).rot(x=90).move(0, 0, 0.08).color(P.GUNMETAL)
        handwheel(a, 0.12).rot(x=90).move(0, -0.18, 0.08)
    v.move(px, 0.1, 0.44)


def fillet(points, r=0.12, steps=2):
    """Round the corners of a polyline so a swept pipe turns through elbows."""
    pts = [Vector(p) for p in points]
    out = [pts[0]]
    for prev, here, nxt in zip(pts, pts[1:], pts[2:]):
        a_dir, b_dir = (prev - here).normalized(), (nxt - here).normalized()
        start, end = here + a_dir * r, here + b_dir * r
        for i in range(steps + 1):
            t = i / steps
            out.append((1 - t) ** 2 * start + 2 * t * (1 - t) * here + t * t * end)
    out.append(pts[-1])
    return [tuple(p) for p in out]


@asset("pipe-rack", tint="#ffffff", budget=2400, note="Pipe run along y on four trestles, one expansion loop.")
def pipe_rack(a):
    half, top, low = 2.6, 1.2, 0.68
    steel = "#5f6874"
    with a.group() as rack:
        for y in (-2.1, -0.7, 0.7, 2.1):
            for sx in (-1, 1):
                bar(a, (sx * 0.56, y, 0.06), (sx * 0.56, y, top), 0.1, ref=(1, 0, 0))
                bar(a, (sx * 0.56, y, top - 0.36), (sx * 0.26, y, top - 0.05), 0.05, caps=False)
            bar(a, (-0.69, y, top), (0.69, y, top), 0.1, 0.12)
            bar(a, (-0.56, y, low), (0.56, y, low), 0.08, 0.1, caps=False)
        for sx in (-1, 1):
            bar(a, (sx * 0.56, -2.1, top - 0.2), (sx * 0.56, 2.1, top - 0.2), 0.06, 0.08)
            bar(a, (sx * 0.56, -0.7, 0.14), (sx * 0.56, 0.7, top - 0.24), 0.045, caps=False)
            bar(a, (sx * 0.56, 0.7, 0.14), (sx * 0.56, -0.7, top - 0.24), 0.045, caps=False)
    tone(rack, "base", jk.shade(steel, -0.18), jk.shade(steel, 0.12))
    for y in (-2.1, -0.7, 0.7, 2.1):
        for sx in (-1, 1):
            a.box(0.24, 0.24, 0.08, bevel=0.02, grounded=True).move(sx * 0.56, y, 0).color(P.CONCRETE_DARK, P.CONCRETE)
    z1 = top + 0.06
    # Insulated main in bright cladding with strap bands.
    r = 0.15
    a.tube([(-0.36, -half, z1 + r), (-0.36, half, z1 + r)], r, 10).color(P.STEEL, P.CHROME)
    for y in (-2.45, -1.4, 0, 1.4, 2.45):
        a.cyl(r + 0.016, 0.07, 10, bevel=0.01).rot(x=90).move(-0.36, y + 0.035, z1 + r).color(P.STEEL_DARK)
    # Ochre line with the expansion loop rising over the middle bay.
    r = 0.105
    z = z1 + r
    ochre = "#c99432"
    loop = fillet([(0.03, -half, z), (0.03, -0.45, z), (0.03, -0.45, z + 0.42), (0.03, 0.45, z + 0.42), (0.03, 0.45, z), (0.03, half, z)], 0.14, 3)
    a.tube(loop, r, 8).color(jk.shade(ochre, -0.16), jk.shade(ochre, 0.1))
    for y in (-half + 0.02, half - 0.02, -1.45, 1.45):
        flange(a, 0.03, y, z, r + 0.04, "y", jk.shade(ochre, -0.3))
    # Teal line with a valve.
    r = 0.085
    z = z1 + r
    a.tube([(0.36, -half, z), (0.36, half, z)], r, 8).color(jk.shade(P.TEAL, -0.2), P.TEAL)
    for y in (-half + 0.02, half - 0.02):
        flange(a, 0.36, y, z, r + 0.04, "y", jk.shade(P.TEAL, -0.4))
    valve(a, 0.36, 1.25, z, r)
    # Lower tier: a red fire main and a plain steel line that drops to the ground at one end.
    z2 = low + 0.05
    a.tube([(-0.22, -half, z2 + 0.065), (-0.22, half, z2 + 0.065)], 0.065, 6).color(jk.shade(P.RED, -0.18), P.RED)
    drop = fillet([(0.2, half, z2 + 0.075), (0.2, -2.42, z2 + 0.075), (0.2, -2.42, 0.0)], 0.12, 2)
    a.tube(drop, 0.075, 6).color(P.STEEL_DARK, P.STEEL)
    for y in (-1.4, 1.4):
        flange(a, -0.22, y, z2 + 0.065, 0.1, "y", jk.shade(P.RED, -0.35))
        flange(a, 0.2, y - 0.3, z2 + 0.075, 0.11, "y", P.GUNMETAL)


# --------------------------------------------------------------------------------------------
# Works and sheds
# --------------------------------------------------------------------------------------------
def roller_door(a, w, h, slats=7, opened=0.0, colour=P.STEEL, trim=P.OFF_WHITE):
    """A framed roller shutter, bottom centre at the origin on the wall plane y = 0, facing -y.

    `opened` (0..1) raises the curtain and shows the dark bay behind it."""
    border, depth = 0.07, 0.07
    with a.group() as g:
        a.add(parts.frame(w, h, border, depth, recess=0.045)).move(0, 0, -border).color(trim)
        z0 = h * opened
        pitch = (h - z0) / slats
        pts = [(0.0, z0)]
        for i in range(slats):
            z = z0 + i * pitch
            pts += [(-0.058, z + pitch * 0.2), (-0.058, z + pitch * 0.8), (-0.02, z + pitch)]
        pts += [(0.0, h)]
        a.profile_x(pts, w, bevel=0).color(jk.shade(colour, -0.22), colour)
        a.box(w + 0.1, 0.11, 0.1, bevel=0.02).move(0, -0.05, h - 0.02).color(jk.shade(colour, -0.3))
        if opened > 0:
            a.box(w, 0.012, z0, bevel=0).move(0, 0.002, 0).color(SOOT).no_ao()
            a.box(w, 0.07, 0.05, bevel=0).move(0, -0.04, z0 - 0.02).color(HAZARD)
    return g


def wall_lamp(a, x, y, z, facing=0):
    """A bulkhead lamp. It is a `lit` pane so the dark twin switches it off."""
    with a.group() as g:
        a.box(0.26, 0.13, 0.05, bevel=0).move(0, -0.065, 0.03).color(P.GUNMETAL)
        a.box(0.18, 0.08, 0.09, bevel=0).move(0, -0.04, -0.06).part("lit").color(P.LAMP).no_ao()
    return g.rot(z=facing).move(x, y, z)


def stack(a, x, y, h, brick=P.BRICK):
    """A round brick chimney on a square plinth, with a pale band and a sooty crown."""
    lo, hi = jk.shade(brick, -0.16), jk.mix(brick, P.CLAY, 0.45)
    a.box(0.84, 0.84, 1.1, bevel=0.035, grounded=True).move(x, y, 0).color(lo, jk.shade(brick, 0.04))
    a.box(0.94, 0.94, 0.1, bevel=0.025).move(x, y, 1.08).color(P.STONE_DARK, P.STONE)

    def r(z):
        return 0.37 + (0.25 - 0.37) * (z - 1.18) / (h - 0.2 - 1.18)

    profile = [(r(1.18), 1.18), (r(h - 1.1), h - 1.1), (r(h - 0.78), h - 0.78), (0.25, h - 0.2), (0.31, h - 0.15), (0.31, h), (0.2, h), (0.2, h - 0.3)]
    shaft = a.lathe(profile, 10, cap_bottom=False).move(x, y, 0).color(lo, hi)

    def pick(f):
        c = f.calc_center_median()
        if c.z > h - 0.2:
            return SOOT if (c.x - x) ** 2 + (c.y - y) ** 2 < 0.25 ** 2 or c.z > h - 0.16 else None
        if h - 1.1 < c.z < h - 0.78:
            return P.CREAM
        return None

    shaft.paint(pick)
    return shaft


def roof_vent(a, x, y, z, r=0.14):
    """A cowl ventilator: stem and cap turned as one piece."""
    profile = [(r * 0.5, 0), (r * 0.5, 0.1), (r, 0.14), (r, 0.23), (r * 0.55, 0.3), (0, 0.32)]
    return a.lathe(profile, 6, cap_bottom=False).move(x, y, z).part("metal").color(P.SHADE_3, P.WHITE)


@asset("factory", tint="#b7aea0", dark=True, budget=2400, note="Sawtooth works; boiler house and two stacks behind.")
def factory(a):
    W, y0, y1 = 5.9, -1.97, 1.08
    D, yc = y1 - y0, (y0 + y1) / 2
    base, wall = 0.12, 2.38
    top = base + wall
    roof_lo, roof_hi = jk.shade(P.SLATE, -0.1), jk.shade(P.SLATE, 0.14)
    a.box(6.02, 4.02, base + 0.02, bevel=0.03, grounded=True).color(P.CONCRETE_DARK, P.CONCRETE)
    a.box(W, D, wall, bevel=0.03).move(0, yc, base).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(W + 0.05, D + 0.05, 0.34, bevel=0).move(0, yc, base).part("tint").color(P.SHADE_3, P.SHADE_2)
    a.box(W + 0.09, D + 0.09, 0.11, bevel=0.025).move(0, yc, top - 0.11).part("tint").color(P.SHADE_2, P.SHADE_1)
    # Sawtooth roof: four north lights, glazed on the steep face.
    tw = W / 4
    glass_len = D - 0.5
    for i in range(4):
        x0 = -W / 2 + i * tw
        x1 = x0 + tw
        a.profile_y([(x0, 0), (x1, 0), (x1, 0.95), (x1 - 0.16, 0.95)], D, bevel=0).move(0, yc, top).part("tint").color(P.SHADE_1, P.WHITE)
        sx = x0 + 0.07 if i else x0 - 0.07
        s0 = 0.045 if i else -0.045
        a.profile_y([(sx, s0), (x1 - 0.15, 0.965), (x1 + 0.07, 0.965), (x1 + 0.07, 1.05), (x1 - 0.18, 1.05), (sx, s0 + 0.09)], D + 0.18, bevel=0).move(0, yc, top).color(roof_lo, roof_hi)
        a.box(0.014, glass_len, 0.6, bevel=0).move(x1 + 0.02, yc, top + 0.2).part("lit").color(P.WINDOW).no_ao()
        for z in (0.175, 0.825):
            bar(a, (x1 + 0.024, yc - glass_len / 2 - 0.05, top + z), (x1 + 0.024, yc + glass_len / 2 + 0.05, top + z), 0.04, 0.05).color(P.CHARCOAL)
        for k in range(5):
            y = yc + (k / 4 - 0.5) * (glass_len + 0.055)
            bar(a, (x1 + 0.024, y, top + 0.2), (x1 + 0.024, y, top + 0.8), 0.04, 0.045, caps=False).color(P.CHARCOAL)
        roof_vent(a, x1 - 0.05, yc + (0.72 if i % 2 else -0.72), top + 1.05)
    # Boiler house lean-to and the two stacks behind the hall.
    a.profile_x([(y1 - 0.02, base), (1.95, base), (1.95, 1.56), (y1 - 0.02, 1.9)], 3.3, bevel=0.025).move(0.05, 0, 0).part("tint").color(P.SHADE_1, P.WHITE)
    a.profile_x([(y1 - 0.02, 1.92), (2.03, 1.56), (2.03, 1.64), (y1 - 0.02, 2.0)], 3.42, bevel=0.015).move(0.05, 0, 0).color(roof_lo, roof_hi)
    stack(a, 2.3, 1.52, 6.6)
    stack(a, -2.2, 1.52, 5.5)
    # Flues from the boiler house into each stack.
    for x0, x1 in ((1.6, 1.95), (-1.5, -1.85)):
        bar(a, (x0, 1.52, 0.78), (x1, 1.52, 0.78), 0.36, 0.4).part("metal").color(P.SHADE_3, P.SHADE_2)
    for x in (-0.75, 0.85):
        parts.window(a, 0.5, 0.42, mullion="bar", sill=False).rot(z=180).move(x, 1.95, 0.85)
    # Front: personnel door, three tall windows, the loading door on its apron.
    teal = jk.shade(P.TEAL, -0.38)
    parts.door(a, 0.5, 0.98, leaf=teal, step=P.CONCRETE, knob=False).move(-2.42, y0, base)
    wall_lamp(a, -2.42, y0, base + 1.3)
    for x in (-1.5, -0.66, 0.18):
        parts.window(a, 0.52, 1.12, mullion="cross", sill=True).move(x, y0, 0.78)
    roller_door(a, 1.5, 1.72, slats=8, colour=P.STEEL).move(1.78, y0, base)
    a.profile_x([(0, 0), (-0.34, 0), (0, base)], 1.7, bevel=0).move(1.78, y0 - 0.02, 0).color(P.CONCRETE_DARK, P.CONCRETE)
    wall_lamp(a, 1.78, y0, base + 2.02)
    for sx in (-1, 1):
        a.box(0.1, 0.1, 0.42, bevel=0, grounded=True).move(1.78 + sx * 0.98, y0 - 0.12, 0).color(HAZARD)
    # Side windows.
    for side in (-1, 1):
        for y in (yc - 0.82, yc + 0.82):
            parts.window(a, 0.52, 1.12, mullion="bar", sill=False).rot(z=90 * side).move(side * W / 2, y, 0.78)


@asset("warehouse", tint="#a7b0b8", dark=True, budget=2400, note="Long shed with a loading dock along the front.")
def warehouse(a):
    W, y0, y1 = 4.9, -1.2, 1.7
    D, yc = y1 - y0, (y0 + y1) / 2
    base, wall = 0.1, 2.0
    top = base + wall
    rise = 0.46
    roof = jk.mix(P.SLATE, P.CHARCOAL, 0.45)
    a.box(W + 0.1, D + 0.1, base + 0.02, bevel=0.03, grounded=True).move(0, yc, 0).color(P.CONCRETE_DARK, P.CONCRETE)
    a.box(W, D, wall, bevel=0.03).move(0, yc, base).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(W + 0.05, D + 0.05, 0.3, bevel=0.015).move(0, yc, base).color(P.CONCRETE_DARK, P.CONCRETE)
    # Cladding ribs on the long walls.
    for i in range(13):
        x = -W / 2 + 0.25 + i * (W - 0.5) / 12
        a.box(0.08, D + 0.07, wall - 0.36, bevel=0).move(x, yc, base + 0.32).part("tint").color(P.SHADE_2, P.SHADE_1)
    for side in (-1, 1):
        a.add(parts.gable_wall(D, rise, 0.06)).rot(z=90 * side).move(side * (W / 2 - 0.03), yc, top).part("tint").color(P.WHITE)
        a.cyl(0.19, 0.05, 10, bevel=0.012).rot(y=90 * side).move(side * (W / 2), yc, top + 0.02).color(P.CHARCOAL)
    parts.gable_roof(a, W, D, rise, overhang=0.13, thick=0.09, color=roof, ridge=False).move(0, yc, top)
    # Ridge ventilator running most of the roof.
    a.box(3.5, 0.3, 0.16, bevel=0.02).move(0, yc, top + rise - 0.06).color(P.CHARCOAL, P.SLATE)
    a.profile_x([(-0.26, 0), (0, 0.09), (0.26, 0), (0.26, -0.05), (0, 0.04), (-0.26, -0.05)], 3.66, bevel=0.012).move(0, yc, top + rise + 0.13).color(
        jk.shade(roof, -0.12), jk.shade(roof, 0.12)
    )
    # Skylights on the front slope glow at night.
    slope = math.degrees(math.atan2(rise, D / 2))
    sky_z = top + rise * (1 - 0.72 / (D / 2))
    for x in (-1.5, 0.0, 1.5):
        a.box(0.62, 0.46, 0.05, bevel=0.012).rot(x=slope).move(x, yc - 0.72, sky_z + 0.045).color(P.OFF_WHITE)
        a.box(0.5, 0.34, 0.03, bevel=0).rot(x=slope).move(x, yc - 0.724, sky_z + 0.085).part("lit").color(P.WINDOW).no_ao()
    # Loading dock with bumpers and a hazard edge, steps at one end.
    dock, dx0, dx1 = 0.44, -2.3, 0.95
    dxc, dw = (dx0 + dx1) / 2, dx1 - dx0
    a.box(dw, 0.58, dock, bevel=0.025, grounded=True).move(dxc, y0 - 0.27, 0).color(P.CONCRETE_DARK, P.CONCRETE)
    a.box(dw + 0.01, 0.04, 0.07, bevel=0).move(dxc, y0 - 0.55, dock - 0.075).color(HAZARD)
    for i in range(2):
        a.box(0.34, 0.5, dock * (2 - i) / 3, bevel=0.015, grounded=True).move(dx1 + 0.17 + i * 0.34, y0 - 0.27, 0).color(P.CONCRETE_DARK, P.CONCRETE)
    doors = (-1.6, -0.2)
    for k, x in enumerate(doors):
        roller_door(a, 1.12, 1.16, slats=6, opened=0.55 if k else 0.0).move(x, y0, dock)
        for sx in (-1, 1):
            a.box(0.1, 0.06, 0.24, bevel=0.015).move(x + sx * 0.42, y0 - 0.585, dock - 0.3).color(SOOT)
    # A pallet of crates waiting outside the open door.
    px, py = doors[1] + 0.12, y0 - 0.3
    a.box(0.5, 0.4, 0.05, bevel=0).move(px, py, dock).color(P.OAK_WOOD)
    a.box(0.3, 0.3, 0.26, bevel=0.02).move(px - 0.08, py, dock + 0.05).color(jk.shade(P.PINE_WOOD, -0.1), P.PINE_WOOD)
    a.box(0.18, 0.24, 0.16, bevel=0.015).rot(z=12).move(px + 0.16, py + 0.03, dock + 0.05).color(jk.shade(P.SAND, -0.1), P.SAND)
    # Canopy over the dock, hung from the wall on tie rods, with lamps under its edge.
    cz, reach = dock + 1.4, 0.66
    a.box(dw + 0.1, reach, 0.06, bevel=0.015).rot(x=-5).move(dxc, y0 - reach / 2, cz).color(jk.shade(roof, -0.1), jk.shade(roof, 0.12))
    a.box(dw + 0.12, 0.04, 0.09, bevel=0).move(dxc, y0 - reach - 0.005, cz - 0.07).color(P.OFF_WHITE)
    for x in (dx0 + 0.1, dxc, dx1 - 0.1):
        bar(a, (x, y0 - 0.02, cz + 0.3), (x, y0 - reach + 0.08, cz + 0.02), 0.035).color(P.GUNMETAL)
    for x in doors:
        a.box(0.2, 0.1, 0.06, bevel=0).move(x, y0 - reach + 0.16, cz - 0.1).part("lit").color(P.LAMP).no_ao()
    # Office end: door, lamp and a downpipe.
    navy = jk.shade(P.NAVY, 0.05)
    parts.door(a, 0.46, 0.94, leaf=navy, step=P.CONCRETE, knob=False).move(2.0, y0, base)
    wall_lamp(a, 2.0, y0, base + 1.28)
    a.tube([(W / 2 - 0.1, y0 - 0.05, top - 0.02), (W / 2 - 0.1, y0 - 0.05, 0.05)], 0.035, 5).color(P.GUNMETAL, P.STEEL_DARK)
    # High windows on the ends and the back.
    for side in (-1, 1):
        for y in (yc - 0.7, yc + 0.7):
            parts.window(a, 0.6, 0.4, mullion="bar", sill=False).rot(z=90 * side).move(side * W / 2, y, base + 1.2)
    for x in (-1.8, -0.6, 0.6, 1.8):
        parts.window(a, 0.6, 0.4, mullion="bar", sill=False).rot(z=180).move(x, y1 + 0.03, base + 1.2)


# --------------------------------------------------------------------------------------------
# S8 ruins: broken on purpose, and partly taken back by moss and scrub
# --------------------------------------------------------------------------------------------
def boxes(specs):
    """One cutter made of several boxes: (cx, cy, cz, w, d, h), centre and size."""
    verts, faces = [], []
    for cx, cy, cz, w, d, h in specs:
        b = len(verts)
        for dz in (-h / 2, h / 2):
            for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                verts.append((cx + sx * w / 2, cy + sy * d / 2, cz + dz))
        faces += [(b + 3, b + 2, b + 1, b), (b + 4, b + 5, b + 6, b + 7)]
        faces += [(b + i, b + (i + 1) % 4, b + 4 + (i + 1) % 4, b + 4 + i) for i in range(4)]
    return jk.raw(verts, faces)


def moss(a, x, y, z, r=0.16, squash=(1.5, 1.0, 0.42), seed=1):
    return a.blob(r, 1, squash, lumps=0.24, seed=seed).move(x, y, z).color(P.LEAF_DEEP, P.MOSS)


def rubble_block(a, x, y, z, size, turn, colour, tilt=0, bevel=None):
    w, d, h = size
    bevel = min(0.02, h * 0.2) if bevel is None else bevel
    return a.box(w, d, h, bevel=bevel).rot(x=tilt, z=turn).move(x, y, z).color(jk.shade(colour, -0.16), colour)


BRICK_LO = jk.mix(P.BRICK, P.STONE_DARK, 0.55)
BRICK_HI = jk.mix(jk.mix(P.BRICK, P.CLAY, 0.4), P.STONE_DARK, 0.22)


@asset("ruin-wall", tint="#7a7570", budget=1500, note="S8: a broken corner of masonry; the return wall runs to the front.")
def ruin_wall(a):
    t = 0.26
    main = [
        (-1.5, 0), (1.4, 0), (1.4, 1.35), (1.06, 1.35), (1.06, 1.05), (0.9, 1.05), (0.9, 0.75), (0.74, 0.75), (0.74, 0.45),
        (0.38, 0.45), (0.38, 0.6), (0.22, 0.6), (0.22, 0.9), (0.06, 0.9), (0.06, 1.2), (-0.1, 1.2), (-0.1, 1.5), (-0.28, 1.5),
        (-0.28, 1.8), (-0.62, 1.8), (-0.62, 1.65), (-0.84, 1.65), (-0.84, 1.8), (-1.36, 1.8), (-1.36, 1.5), (-1.5, 1.5),
        (-1.5, 1.2), (-1.4, 1.2), (-1.4, 0.9), (-1.5, 0.9), (-1.5, 0.6), (-1.4, 0.6), (-1.4, 0.3), (-1.5, 0.3),
    ]
    window = (-0.92, 0, 1.08, 0.5, 0.8, 0.64)
    a.profile_y(main, t, bevel=0.018).cut(boxes([window])).color(BRICK_LO, BRICK_HI)
    # Render clings to both faces and stops short of every break, so the courses show.
    inside = [
        (-1.33, 0), (0.3, 0), (0.33, 0.3), (0.16, 0.42), (0.13, 0.72), (-0.03, 0.84), (-0.02, 1.08), (-0.2, 1.2), (-0.23, 1.4),
        (-0.4, 1.54), (-0.52, 1.58), (-0.9, 1.56), (-0.97, 1.8), (-1.28, 1.8), (-1.31, 1.44),
    ]
    outside = [
        (-1.33, 0), (1.4, 0), (1.4, 1.3), (1.12, 1.3), (1.1, 1.0), (0.95, 0.96), (0.93, 0.7), (0.78, 0.63), (0.75, 0.39), (0.42, 0.37),
        (0.31, 0.52), (0.18, 0.55), (0.15, 0.83), (0.0, 0.87), (-0.03, 1.13), (-0.16, 1.17), (-0.19, 1.43), (-0.34, 1.48),
        (-0.36, 1.74), (-0.6, 1.76), (-0.65, 1.6), (-0.86, 1.6), (-0.9, 1.76), (-1.28, 1.8), (-1.31, 1.44), (-1.33, 0.9),
    ]
    skin = 0.04
    a.profile_y(inside, skin, bevel=0).move(0, -(t / 2 + skin / 2), 0).cut(boxes([window])).part("tint").color(P.SHADE_2, P.WHITE)
    a.profile_y(outside, skin, bevel=0).move(0, t / 2 + skin / 2, 0).cut(boxes([window])).part("tint").color(P.SHADE_2, P.WHITE)
    # The window keeps its stone sill and lintel and one splintered mullion.
    a.box(0.66, 0.4, 0.07, bevel=0.015).move(-0.92, 0, 0.7).color(P.STONE_DARK, P.STONE)
    a.box(0.72, 0.38, 0.11, bevel=0.02).move(-0.92, 0, 1.39).color(P.STONE_DARK, P.STONE)
    bar(a, (-0.92, 0, 0.77), (-0.9, -0.02, 1.12), 0.035).color(P.BARK_DARK, P.WALNUT)
    # Return wall toward the front, stepping down to a stub.
    rx = 1.27
    ret = [
        (0.13, 0), (0.13, 1.35), (-0.2, 1.35), (-0.2, 1.2), (-0.46, 1.2), (-0.46, 1.05), (-0.72, 1.05), (-0.72, 0.75), (-0.98, 0.75),
        (-0.98, 0.6), (-1.24, 0.6), (-1.24, 0.3), (-1.5, 0.3), (-1.5, 0),
    ]
    a.profile_x(ret, t, bevel=0.018).move(rx, 0, 0).color(BRICK_LO, BRICK_HI)
    ret_out = [
        (0.17, 0), (0.17, 1.3), (-0.04, 1.3), (-0.08, 1.18), (-0.3, 1.14), (-0.34, 1.02), (-0.56, 0.98), (-0.6, 0.76), (-0.8, 0.7),
        (-0.86, 0.6), (-1.06, 0.52), (-1.1, 0.3), (-1.36, 0.24), (-1.4, 0),
    ]
    ret_in = [(-0.13, 0), (-0.13, 1.0), (-0.3, 0.95), (-0.5, 0.8), (-0.62, 0.5), (-0.9, 0.4), (-1.0, 0)]
    a.profile_x(ret_out, skin, bevel=0).move(rx + t / 2 + skin / 2, 0, 0).part("tint").color(P.SHADE_2, P.WHITE)
    a.profile_x(ret_in, skin, bevel=0).move(rx - t / 2 - skin / 2, 0, 0).part("tint").color(P.SHADE_2, P.WHITE)
    # Loose bricks left on the steps.
    for x, y, z, turn in ((0.14, 0.02, 0.9, 12), (-0.02, -0.03, 1.2, -20), (0.82, 0.0, 0.75, 8), (1.27, -0.58, 1.05, 80), (1.27, -1.1, 0.6, 100)):
        rubble_block(a, x, y, z, (0.2, 0.11, 0.07), turn, BRICK_HI, bevel=0)
    # Fallen masonry banked in the breach and the inner corner; a charred joist leans on the return.
    mound(a, 0.56, -0.3, 0.07, 0.4, (1.3, 1.1, 0.55), seed=4).color(P.STONE_DARK, P.STONE)
    mound(a, 0.5, 0.26, 0.04, 0.2, (1.3, 0.8, 0.55), seed=9).color(P.STONE_DARK, P.STONE)
    for x, y, z, size, turn, colour, tilt in (
        (0.16, -0.5, 0.03, (0.3, 0.2, 0.14), 25, P.STONE, 8),
        (0.84, -0.62, 0.06, (0.26, 0.18, 0.13), -35, BRICK_HI, -14),
        (0.5, -0.82, 0.02, (0.22, 0.16, 0.1), 60, P.STONE_DARK, 0),
        (-0.2, -0.36, 0.0, (0.2, 0.12, 0.09), -10, BRICK_HI, 0),
        (0.62, -0.34, 0.2, (0.24, 0.16, 0.12), 40, BRICK_LO, 20),
        (0.95, 0.27, 0.0, (0.22, 0.14, 0.1), 15, P.STONE, 0),
    ):
        rubble_block(a, x, y, z, size, turn, colour, tilt)
    bar(a, (0.2, -1.1, 0.04), (1.1, -0.62, 0.92), 0.1, 0.13).color(P.BARK_DARK, P.WALNUT)
    # A little moss on the ledges and at the foot.
    moss(a, -1.02, 0.0, 1.81, 0.17, seed=2)
    moss(a, 0.3, 0.0, 0.62, 0.11, (1.3, 1.6, 0.45), seed=5)
    mound(a, -1.1, 0.26, 0.03, 0.18, (1.6, 0.8, 0.45), seed=7).color(P.LEAF_DEEP, P.MOSS)
    moss(a, 1.27, -0.02, 1.36, 0.13, (1.2, 1.5, 0.45), seed=11)
    settle(a)


@asset("ruin-tower", tint="#6d6a66", budget=2400, note="S8: the shell of a frame building, open at the front-right corner.")
def ruin_tower(a):
    half, t = 1.4, 0.16
    conc_lo, conc_hi = jk.shade(P.STONE_DARK, -0.12), P.STONE
    heights = {
        (-1.24, 1.24): 6.32, (0.0, 1.24): 6.0, (1.24, 1.24): 4.35,
        (-1.24, 0.0): 6.0, (0.0, 0.0): 4.7, (1.24, 0.0): 3.1,
        (-1.24, -1.24): 4.25, (0.0, -1.24): 2.7, (1.24, -1.24): 1.45,
    }
    with a.group() as shell:
        # Frame: columns to wherever they broke, with reinforcement left standing proud.
        for (x, y), h in heights.items():
            bar(a, (x, y, 0), (x, y, h), 0.2, ref=(1, 0, 0)).color(conc_lo, conc_hi)
            if h < 6.2:
                for dx, dy, lean in ((0.05, 0.04, 0.07), (-0.05, -0.03, -0.05))[: 2 if h < 5 else 1]:
                    bar(a, (x + dx, y + dy, h - 0.05), (x + dx + lean, y + dy - lean * 0.6, h + 0.34), 0.03).color(P.RUST)
        # Floors: each survives a little less than the one below; the third is gone but for a scrap.
        floors = {
            1: [(-1.4, -1.4), (0.95, -1.4), (1.4, -0.8), (1.4, 1.4), (-1.4, 1.4)],
            2: [(-1.4, -1.4), (0.35, -1.4), (0.55, -0.85), (1.1, -0.6), (1.4, -0.2), (1.4, 1.4), (-1.4, 1.4)],
            3: [(-1.4, 0.15), (-0.5, 0.3), (-0.2, 0.9), (0.1, 1.4), (-1.4, 1.4)],
            4: [(-1.4, -1.4), (-0.75, -1.4), (-0.45, -0.55), (0.25, -0.3), (0.45, 0.45), (1.1, 0.75), (1.4, 1.05), (1.4, 1.4), (-1.4, 1.4)],
            5: [(-1.4, -0.35), (-0.4, -0.15), (0.15, 0.6), (0.4, 1.4), (-1.4, 1.4)],
            6: [(-1.4, 0.35), (-0.7, 0.45), (-0.25, 1.0), (-0.2, 1.4), (-1.4, 1.4)],
        }
        for level, outline in floors.items():
            a.prism(outline, 0.13, bevel=0).move(0, 0, level - 0.13).color(conc_lo, conc_hi).paint_up(jk.shade(P.STONE, 0.08))
        # Beams hold the frame together where the third floor fell away, and at the top.
        def beam(p, q, z, w=0.16):
            bar(a, (p[0], p[1], z - 0.11), (q[0], q[1], z - 0.11), w, 0.2).color(conc_lo, conc_hi)

        for p, q in (((-1.24, 0), (0, 0)), ((0, 0), (1.24, 0)), ((0, 1.24), (0, 0)), ((1.24, 1.24), (1.24, 0)), ((0, 1.24), (1.24, 1.24)), ((-1.24, 0), (-1.24, -1.24))):
            beam(p, q, 2.9)
        beam((-1.24, 0), (0, 0), 3.9)
        beam((-1.24, -1.24), (-1.24, 0), 3.9)
        beam((0, 0), (0, 1.24), 3.9)
        beam((1.24, 1.24), (1.24, 0.55), 3.9)
        beam((0, 1.24), (0, 0.5), 4.9)
        # Walls: the back and left stand nearly whole; the front and right are stumps.
        def openings(axis, wall, cols, rows, w=0.62, h=0.5, sill=0.3):
            out = []
            for c in cols:
                for k in rows:
                    z = k + sill + h / 2
                    out.append((c, wall, z, w, 0.6, h) if axis == "x" else (wall, c, z, 0.6, w, h))
            return out

        back = [(-1.4, 0), (1.4, 0), (1.4, 3.9), (1.22, 3.9), (1.22, 4.35), (0.85, 4.35), (0.85, 4.8), (0.6, 4.8), (0.6, 5.4), (0.3, 5.4), (0.3, 6.0), (-0.2, 6.0), (-0.2, 6.4), (-1.4, 6.4)]
        yb = half - t / 2
        a.profile_y(back, t, bevel=0.025).move(0, yb, 0).cut(boxes(openings("x", yb, (-0.68, 0.64), range(6)))).part("tint").color(P.SHADE_2, P.WHITE)
        left = [(1.4, 0), (1.4, 6.4), (0.9, 6.4), (0.9, 6.0), (0.2, 6.0), (0.2, 5.5), (-0.25, 5.5), (-0.25, 5.0), (-0.5, 5.0), (-0.5, 4.25), (-1.4, 4.25), (-1.4, 0)]
        xl = -half + t / 2
        a.profile_x(left, t, bevel=0.025).move(xl, 0, 0).cut(boxes(openings("y", xl, (0.66, -0.66), range(6)))).part("tint").color(P.SHADE_2, P.WHITE)
        front = [(-1.4, 0), (0.5, 0), (0.5, 0.55), (0.3, 0.55), (0.3, 1.2), (0.05, 1.2), (0.05, 2.0), (-0.3, 2.0), (-0.3, 2.6), (-0.55, 2.6), (-0.55, 3.4), (-0.9, 3.4), (-0.9, 4.25), (-1.4, 4.25)]
        yf = -half + t / 2
        cuts = openings("x", yf, (-0.72,), (1, 2, 3)) + [(-0.72, yf, 0.42, 0.62, 0.6, 0.86)]
        a.profile_y(front, t, bevel=0.025).move(0, yf, 0).cut(boxes(cuts)).part("tint").color(P.SHADE_2, P.WHITE)
        right = [(1.4, 0), (1.4, 3.9), (1.0, 3.9), (1.0, 3.3), (0.7, 3.3), (0.7, 2.4), (0.3, 2.4), (0.3, 2.0), (-0.1, 2.0), (-0.1, 1.1), (-0.5, 1.1), (-0.5, 0.5), (-0.8, 0.5), (-0.8, 0)]
        xr = half - t / 2
        a.profile_x(right, t, bevel=0.025).move(xr, 0, 0).cut(boxes(openings("y", xr, (0.66,), range(4)) + openings("y", xr, (-0.02,), (0, 1)))).part("tint").color(P.SHADE_2, P.WHITE)
        # A plinth and two string courses give the surviving facades their storeys.
        proud = 0.035
        for x0, x1, z0, dz in ((-1.4, 1.4, 0.0, 0.36), (-1.4, 1.4, 1.93, 0.1), (-1.4, 1.22, 3.93, 0.1)):
            a.box(x1 - x0 + proud, t, dz, bevel=0).move((x0 + x1) / 2, yb + proud, z0).part("tint").color(P.SHADE_3, P.SHADE_2)
        for y0, y1, z0, dz in ((-1.4, 1.4, 0.0, 0.36), (-1.4, 1.4, 1.93, 0.1), (-1.4, 1.4, 3.93, 0.1)):
            a.box(t, y1 - y0 + proud, dz, bevel=0).move(xl - proud, (y0 + y1) / 2, z0).part("tint").color(P.SHADE_3, P.SHADE_2)
        a.box(1.9 + proud, t, 0.36, bevel=0).move(-0.45, yf - proud, 0.0).part("tint").color(P.SHADE_3, P.SHADE_2)
        a.box(t, 2.2 + proud, 0.36, bevel=0).move(xr + proud, 0.3, 0.0).part("tint").color(P.SHADE_3, P.SHADE_2)
        # A few panes survive.
        for x, k in ((-0.68, 4), (-0.68, 5), (0.64, 1), (-0.68, 2)):
            pane(a, (x, yb, k + 0.55), 0.62, 0.5, "x")
        for y, k in ((0.66, 3), (0.66, 5), (-0.66, 1), (-0.66, 2)):
            pane(a, (xl, y, k + 0.55), 0.62, 0.5, "y")
    shell.rot(x=2.2, y=2.8).move(0, 0, -0.13)
    for piece in shell.pieces:
        piece.warp(lambda co: (co.x, co.y, max(co.z, 0.0)))
    # Fallen floor and frame banked against the open corner.
    stone = (P.STONE_DARK, P.STONE)
    mound(a, 1.2, -1.35, 0.1, 0.66, (1.25, 1.1, 0.5), seed=3).color(*stone)
    mound(a, 0.35, -1.75, 0.06, 0.42, (1.3, 1.0, 0.5), seed=5).color(*stone)
    mound(a, 1.68, -0.35, 0.06, 0.38, (1.0, 1.3, 0.5), seed=8).color(*stone)
    mound(a, -1.5, -1.3, 0.04, 0.28, (1.2, 1.0, 0.5), seed=12).color(*stone)
    a.prism([(-0.55, -0.4), (0.5, -0.45), (0.58, 0.3), (-0.3, 0.46)], 0.13, bevel=0.02).rot(x=-34, z=24).move(1.15, -1.7, 0.42).color(conc_lo, conc_hi)
    a.prism([(-0.4, -0.3), (0.42, -0.26), (0.3, 0.34), (-0.36, 0.3)], 0.13, bevel=0.02).rot(x=18, y=-22, z=-30).move(1.78, -1.0, 0.2).color(conc_lo, conc_hi)
    bar(a, (0.7, -1.95, 0.16), (1.75, -1.6, 0.34), 0.2).color(conc_lo, conc_hi)
    for x, y, z, size, turn, colour, tilt in (
        (0.1, -1.72, 0.04, (0.34, 0.24, 0.18), 20, P.STONE, 10),
        (1.95, -0.1, 0.0, (0.3, 0.2, 0.16), -30, P.STONE_DARK, 0),
        (1.5, -2.0, 0.0, (0.26, 0.18, 0.14), 55, P.RUST, 0),
    ):
        rubble_block(a, x, y, z, size, turn, colour, tilt)
    for p, q in (((1.0, -1.5, 0.5), (1.12, -1.42, 1.05)), ((1.45, -1.2, 0.4), (1.7, -1.3, 0.95)), ((1.2, -1.75, 0.5), (1.0, -2.0, 0.9))):
        bar(a, p, q, 0.03).color(P.RUST)
    # Taken back: a sapling roots on the fourth floor, scrub on the second, ivy over an edge.
    a.tube([(-0.3, 0.3, 3.95), (-0.26, 0.28, 4.3), (-0.2, 0.3, 4.62)], [0.05, 0.04, 0.03], 5).color(P.BARK_DARK, P.BARK).flat()
    parts.canopy(a, [(-0.2, 0.3, 4.82, 0.36, 0.85, 1), (0.05, 0.2, 4.62, 0.24, 0.85, 1)], seed=6, part="base", low=P.LEAF_DEEP, high=P.LEAF)
    moss(a, 0.25, -0.95, 2.12, 0.26, (1.3, 1.0, 0.6), seed=4)
    moss(a, 1.3, 0.2, 2.05, 0.2, (0.9, 1.4, 0.5), seed=13)
    mound(a, -1.66, 0.4, 0.05, 0.28, (1.0, 1.5, 0.5), seed=15).color(P.LEAF_DEEP, P.MOSS)
    settle(a)


def sheet(w, h, nx=4, ny=2, t=0.024):
    """A thin panel in the xy plane, centred on the origin and gridded so it can be bent."""
    verts = []
    for z in (0.0, t):
        for j in range(ny + 1):
            for i in range(nx + 1):
                verts.append((-w / 2 + w * i / nx, -h / 2 + h * j / ny, z))
    per = (nx + 1) * (ny + 1)

    def at(layer, i, j):
        return layer * per + j * (nx + 1) + i

    faces = []
    for j in range(ny):
        for i in range(nx):
            faces.append((at(0, i, j), at(0, i, j + 1), at(0, i + 1, j + 1), at(0, i + 1, j)))
            faces.append((at(1, i, j), at(1, i + 1, j), at(1, i + 1, j + 1), at(1, i, j + 1)))
    for i in range(nx):
        faces.append((at(0, i, 0), at(0, i + 1, 0), at(1, i + 1, 0), at(1, i, 0)))
        faces.append((at(0, i + 1, ny), at(0, i, ny), at(1, i, ny), at(1, i + 1, ny)))
    for j in range(ny):
        faces.append((at(0, 0, j + 1), at(0, 0, j), at(1, 0, j), at(1, 0, j + 1)))
        faces.append((at(0, nx, j), at(0, nx, j + 1), at(1, nx, j + 1), at(1, nx, j)))
    return jk.raw(verts, faces)


def corrugated(w, h, waves=4, rows=2, amp=0.03, twist=0.0, curl=0.0, droop=0.0):
    """A sheet of corrugated iron in the xy plane, ridges along y.

    `twist` (degrees per unit) wrings it about its ridges, `curl` bows it along them and `droop`
    bends the +x +y corner down (negative peels it up), the way a torn roof sheet hangs."""
    piece = sheet(w, h, waves * 2, rows)
    step = w / (waves * 2)

    def fn(co):
        x, y, z = co
        z += amp if round((x + w / 2) / step) % 2 else -amp
        z += curl * y * y - droop * max(0.0, x) * max(0.0, y) * 4
        ang = math.radians(twist) * y
        return (x * math.cos(ang) + z * math.sin(ang), y, -x * math.sin(ang) + z * math.cos(ang))

    return piece.warp(fn)


def girder(points, width=0.2, depth=0.18, t=0.036, up=(0, 0, 1)):
    """An I-beam swept along a polyline and mitred at each bend. `up` is roughly the way the
    web stands at the first leg."""
    pts = [Vector(q) for q in points]
    w, d = width / 2, depth / 2
    section = [(-w, -d), (w, -d), (w, -d + t), (t / 2, -d + t), (t / 2, d - t), (w, d - t), (w, d), (-w, d), (-w, d - t), (-t / 2, d - t), (-t / 2, -d + t), (-w, -d + t)]
    legs = [(b - a).normalized() for a, b in zip(pts, pts[1:])]
    side = legs[0].cross(Vector(up)).normalized()
    rise = side.cross(legs[0]).normalized()
    verts = [pts[0] + side * u + rise * v for u, v in section]
    for k, leg in enumerate(legs):
        if k + 1 < len(legs):
            # Mitre: carry this leg's section on to the plane that halves the bend.
            normal = (leg + legs[k + 1]).normalized()
            for u, v in section:
                offset = side * u + rise * v
                verts.append(pts[k + 1] + offset - leg * (offset.dot(normal) / leg.dot(normal)))
            turn = leg.rotation_difference(legs[k + 1])
            side, rise = turn @ side, turn @ rise
        else:
            verts += [pts[k + 1] + side * u + rise * v for u, v in section]
    n = len(section)
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(len(verts) - n, len(verts)))]
    for k in range(len(legs)):
        faces += [(k * n + i, k * n + (i + 1) % n, (k + 1) * n + (i + 1) % n, (k + 1) * n + i) for i in range(n)]
    return jk.raw(verts, faces)


def cog(r, teeth=8, depth=0.07, width=0.1):
    """A spur gear lying in the xy plane with its back on z = 0: flat-topped teeth, V roots."""
    outline = []
    for i in range(teeth):
        for frac, rad in ((-0.5, r - depth), (-0.2, r), (0.2, r)):
            ang = (i + frac) / teeth * math.tau
            outline.append((math.cos(ang) * rad, math.sin(ang) * rad))
    return jk.prism(outline, width, bevel=0)


@asset("scrap", tint="#ffffff", budget=700, note="S8: a scrap heap: car door, cable drum, bent girder, gear, roof sheet and a tyre.")
def scrap(a):
    # Composed as a low pyramid on a heap of compacted debris. Front: a car door leaning back on
    # the heap, and a cable drum on its rims. Over the top: a girder, buckled where it crosses
    # the crest. Behind and to the sides: a gear, a sheet of roofing iron and a tyre. Rust
    # throughout; the door's old paint and the drum's timber are the only other colours.
    rust_lo, rust_hi = jk.shade(P.RUST, -0.3), jk.mix(P.RUST, P.ORANGE, 0.22)
    zinc_lo, zinc_hi = jk.mix(P.STEEL_DARK, P.RUST, 0.3), jk.mix(P.STEEL, P.SAND, 0.2)
    cx, cy = 0.05, 0.05

    def polar(angle, dist):
        return cx + math.cos(math.radians(angle)) * dist, cy + math.sin(math.radians(angle)) * dist

    # The heap itself: a dark core of compacted debris under a shingle of rusted plate.
    mound(a, cx, cy, 0.08, 0.5, (1.25, 1.05, 0.95), seed=2).color(jk.mix(P.BARK_DARK, P.INK, 0.45), jk.mix(P.BARK, P.CHARCOAL, 0.35))
    dark_lo, dark_hi = jk.mix(P.RUST, P.CHARCOAL, 0.6), jk.mix(P.RUST, P.CHARCOAL, 0.3)
    worn_lo, worn_hi = jk.mix(P.RUST, P.BARK_DARK, 0.5), jk.mix(P.RUST, P.CLAY, 0.35)
    for (x, y, z), (w, d), (rx, ry, rz), (low, high) in (
        ((0.14, -0.36, 0.33), (0.66, 0.56), (58, 0, -8), (worn_lo, worn_hi)),
        ((0.5, 0.06, 0.4), (0.5, 0.52), (10, 44, 20), (dark_lo, dark_hi)),
        ((-0.3, 0.42, 0.34), (0.62, 0.5), (-48, -10, 28), (zinc_lo, zinc_hi)),
        ((-0.42, -0.04, 0.38), (0.46, 0.44), (14, -46, -12), (dark_lo, dark_hi)),
    ):
        a.box(w, d, 0.035, bevel=0).move(0, 0, -0.0175).rot(x=rx, y=ry).rot(z=rz).move(x, y, z).color(low, high)
    # A girder lies over the crest, buckled where it crosses it; its low end rests on the ground.
    a.add(girder([(-0.98, 0.5, 0.11), (0.05, 0.12, 0.88), (0.64, 0.36, 0.56)])).color(rust_lo, rust_hi)
    # A car door leans back on the heap: slanted front pillar, empty window, mirror and handle.
    paint = jk.mix(P.TEAL, P.STONE, 0.3)
    with a.group() as door:
        panel = a.profile_y([(-0.42, 0.0), (0.4, 0.0), (0.42, 0.46), (0.4, 0.8), (-0.02, 0.8), (-0.42, 0.48)], 0.06, bevel=0)
        panel.cut(jk.profile_y([(-0.27, 0.5), (0.33, 0.5), (0.325, 0.73), (-0.03, 0.73)], 0.3, bevel=0))
        lo, hi = jk.col(jk.mix(P.RUST, paint, 0.15)), jk.col(paint)
        for f in panel.bm.faces:
            for loop in f.loops:
                k = min(1.0, max(0.0, loop.vert.co.z / 0.3))
                loop[panel.layer] = (lo[0] + (hi[0] - lo[0]) * k, lo[1] + (hi[1] - lo[1]) * k, lo[2] + (hi[2] - lo[2]) * k, 1.0)
        a.box(0.8, 0.03, 0.035, bevel=0).move(0.0, -0.04, 0.4).color(jk.shade(paint, 0.25))
        a.box(0.11, 0.035, 0.035, bevel=0).move(0.27, -0.045, 0.31).color(P.CHARCOAL)
        a.box(0.12, 0.09, 0.08, bevel=0).move(-0.4, -0.08, 0.5).color(P.CHARCOAL, P.GUNMETAL)
    door.rot(x=-28).rot(z=14)
    x, y = polar(-128, 0.86)
    door.move(x, y, 0)
    # A cable drum on its rims: two timber flanges, a core still wound with cable, a steel hub.
    timber = jk.mix(P.PINE_WOOD, P.STONE, 0.18)
    R, W, t = 0.33, 0.36, 0.055
    with a.group() as drum:
        for z in (0.0, W - t):
            a.cyl(R, t, 10, bevel=0).move(0, 0, z).color(jk.shade(timber, -0.25), timber)
        a.lathe([(0.17, t), (0.17, W - t)], 8, cap_bottom=False, cap_top=False).color(P.INK, P.GUNMETAL)
        a.cyl(0.085, 0.03, 6, bevel=0).move(0, 0, W).color(P.STEEL_DARK).paint(lambda f: P.INK if f.normal.z > 0.6 else None)
        a.cyl(0.085, 0.03, 6, bevel=0).move(0, 0, -0.03).color(P.STEEL_DARK).paint(lambda f: P.INK if f.normal.z < -0.6 else None)
    x, y = polar(-38, 0.93)
    drum.rot(x=90).move(0, W / 2, 0).rot(y=7).rot(z=-20).move(x, y, R - 0.03)
    # A gear leans on the heap's other shoulder.
    with a.group() as wheel:
        a.add(cog(0.33, 8, 0.075, 0.11)).color(jk.mix(P.GUNMETAL, P.RUST, 0.45), jk.mix(P.STEEL_DARK, P.RUST, 0.62))
        a.cyl(0.11, 0.035, 6, bevel=0).move(0, 0, 0.11).color(P.STEEL_DARK).paint(lambda f: P.INK if f.normal.z > 0.6 else None)
    x, y = polar(30, 0.9)
    wheel.rot(z=11).rot(x=62).rot(z=120).move(x, y, 0.27)
    # A sheet of roofing iron leans on the back, one corner peeled up.
    x, y = polar(96, 0.74)
    a.add(corrugated(0.95, 0.75, 4, 1, amp=0.032, droop=-0.12)).rot(x=46).rot(z=186).move(x, y, 0.3).color(zinc_lo, rust_hi)
    # A tyre half under the heap, a bent pipe, a hooked reinforcing bar and loose blocks.
    x, y = polar(186, 0.86)
    a.torus(0.2, 0.085, 8, 4).rot(x=14, y=-12).move(x, y, 0.07).color(P.INK, P.CHARCOAL)
    a.tube([(0.12, -0.3, 0.42), (0.2, -0.72, 0.36), (0.26, -0.92, 0.2), (0.28, -0.98, 0.02)], 0.05, 4).color(P.GUNMETAL, P.STEEL_DARK)
    cable(a, [(-0.14, -0.06, 0.56), (-0.22, -0.14, 0.9), (-0.34, -0.18, 0.92), (-0.39, -0.2, 0.79)], 0.02, P.RUST)
    for x, y, z, size, turn, tilt in ((-0.2, 0.86, 0.0, (0.3, 0.2, 0.05), 25, 6), (1.02, -0.02, 0.0, (0.24, 0.16, 0.12), -30, 0), (-0.55, 0.78, 0.0, (0.16, 0.12, 0.1), 60, 0)):
        rubble_block(a, x, y, z, size, turn, dark_hi, tilt, bevel=0)
    # Reclaimed: weeds root in the lee of the heap.
    mound(a, 0.42, -0.9, 0.04, 0.13, (1.2, 1.0, 0.7), seed=4).color(P.LEAF_DEEP, P.MOSS)
    mound(a, -0.86, 0.36, 0.03, 0.12, (1.0, 1.2, 0.7), seed=7).color(P.LEAF_DEEP, P.MOSS)
    settle(a)
