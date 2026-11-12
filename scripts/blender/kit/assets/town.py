"""Town squares, street furniture, camps and the street hardware of the surveillance state.

Everything faces -y. Tint parts follow the kit contract: hall walls, market awnings, the statue's
figure, bench and fence timber, wall masonry, the totem's wood, the billboard and screen casings,
the checkpoint booth and the surveillance pole. All forms are invented illustration.
"""

from __future__ import annotations

import math

import bmesh
from mathutils import Matrix, Vector

from kit import jk, parts
from kit import palette as P
from kit.jk import asset


# --------------------------------------------------------------------------------------------
# Module helpers
# --------------------------------------------------------------------------------------------
def pane(a, w, h):
    """One quad facing -y, bottom centre at the origin: glazing that sits inside a frame."""
    p = jk.raw([(-w / 2, 0, 0), (w / 2, 0, 0), (w / 2, 0, h), (-w / 2, 0, h)], [(0, 1, 2, 3)])
    if next(iter(p.bm.faces)).normal.y > 0:
        bmesh.ops.reverse_faces(p.bm, faces=p.bm.faces[:])
        p.bm.normal_update()
    return a.add(p)


def lathe(a, profile, sides=16, cap_bottom=True, cap_top=True, turn=0.0):
    """`jk.lathe` with the winding pinned to the profile.

    List the profile so the outside lies on its right as you walk it (up the outer wall, in
    across a rim, down an inner wall). The core recalculates normals by a centroid heuristic,
    which can turn an open shell with flared ends inside out; the site culls back faces, so the
    first profile segment is checked here and the whole shell reversed if it came out wrong."""
    piece = jk.lathe(profile, sides, cap_bottom, cap_top, turn)
    for (r0, z0), (r1, z1) in zip(profile, profile[1:]):
        if max(r0, r1) <= 1e-6 or (abs(r1 - r0) < 1e-9 and abs(z1 - z0) < 1e-9):
            continue
        want_r, want_z = z1 - z0, -(r1 - r0)

        def on(v, r, z):
            return abs(v.co.z - z) < 1e-6 and abs(math.hypot(v.co.x, v.co.y) - r) < 1e-6

        for f in piece.bm.faces:
            low = sum(1 for v in f.verts if on(v, r0, z0))
            high = sum(1 for v in f.verts if on(v, r1, z1))
            if low and high and low + high == len(f.verts):
                c = f.calc_center_median()
                reach = math.hypot(c.x, c.y) or 1.0
                facing = f.normal.x * c.x / reach * want_r + f.normal.y * c.y / reach * want_r + f.normal.z * want_z
                if facing < 0:
                    bmesh.ops.reverse_faces(piece.bm, faces=piece.bm.faces[:])
                    piece.bm.normal_update()
                return a.add(piece)
    return a.add(piece)


def disc(a, r, sides=12, r_in=0.0, turn=0.0):
    """A flat disc (or a ring, with r_in) lying on z = 0 and FACING UP: water, lenses, embers.

    One-sided on purpose: the site culls back faces, so the winding is checked, not assumed."""
    ring = [(math.cos(turn + i / sides * math.tau), math.sin(turn + i / sides * math.tau)) for i in range(sides)]
    verts = [(x * r, y * r, 0.0) for x, y in ring]
    if r_in > 0:
        verts += [(x * r_in, y * r_in, 0.0) for x, y in ring]
        faces = [(i, (i + 1) % sides, sides + (i + 1) % sides, sides + i) for i in range(sides)]
    else:
        faces = [tuple(range(sides))]
    p = jk.raw(verts, faces)
    if any(f.normal.z < 0 for f in p.bm.faces):
        bmesh.ops.reverse_faces(p.bm, faces=[f for f in p.bm.faces if f.normal.z < 0])
        p.bm.normal_update()
    return a.add(p)


def beam(a, p0, p1, w, d=None, bevel=0.0):
    """A rectangular member from p0 to p1: struts, braces, rails and arms."""
    p0, p1 = Vector(p0), Vector(p1)
    axis = p1 - p0
    piece = jk.box(w, d or w, axis.length, bevel=bevel)
    turn = Vector((0, 0, 1)).rotation_difference(axis.normalized()).to_matrix().to_4x4()
    piece.apply(Matrix.Translation(p0) @ turn)
    return a.add(piece)


def window(a, w, h, part="lit", trim=P.OFF_WHITE, low=P.WINDOW, high=P.LAMP, bars="cross", sill=True, border=0.05):
    """A framed opening on the wall plane y = 0, bottom centre at the origin, facing -y."""
    start = len(a.pieces)
    depth = 0.06
    a.add(parts.frame(w, h, border, depth)).color(trim)
    pane(a, w, h).move(0, -0.02, border).part(part).color(low, high).no_ao()
    if bars in ("cross", "bar"):
        a.box(0.03, 0.02, h, bevel=0).move(0, -0.035, border).color(trim)
    if bars in ("cross", "rows"):
        a.box(w, 0.02, 0.03, bevel=0).move(0, -0.035, border + h * 0.6).color(trim)
    if sill:
        a.box(w + border * 2 + 0.08, 0.1, 0.045, bevel=0).move(0, -0.05, -0.035).color(trim)
    return parts.grouped(a, start)


def column(a, r, h, sides=8):
    """A plain classical column: a round base, a shaft with entasis, a flared cap and a slab."""
    start = len(a.pieces)
    lathe(a, 
        [(r * 1.32, 0), (r * 1.32, 0.07), (r, 0.12), (r * 0.86, h - 0.18), (r * 1.22, h - 0.1), (r * 1.22, h - 0.06)],
        sides,
        cap_bottom=False,
        cap_top=False,
    )
    a.box(r * 2.75, r * 2.75, 0.06, bevel=0).move(0, 0, h - 0.06)
    return parts.grouped(a, start)


# --------------------------------------------------------------------------------------------
# Civic
# --------------------------------------------------------------------------------------------
@asset("hall", tint="#ece4d4", dark=True, budget=2400)
def hall(a):
    z0 = 0.30  # top of the stylobate
    by, bw, bd = 0.5, 4.3, 2.6  # main block: centre y, width, depth
    wall_h, band = 2.3, 0.2
    eave = z0 + wall_h + band
    front, back = by - bd / 2, by + bd / 2

    # Stylobate: two stone tiers and a landing step on the square.
    a.box(5.0, 4.0, 0.16, bevel=0.035, grounded=True).color(P.STONE_DARK, P.STONE)
    a.box(4.7, 3.7, 0.17, bevel=0.035).move(0, 0, 0.13).color(P.STONE, P.CONCRETE)
    a.box(2.5, 0.34, 0.09, bevel=0.025, grounded=True).move(0, -1.97, 0).color(P.STONE_DARK, P.STONE)

    # Main block: base course, walls, entablature band.
    a.box(bw + 0.1, bd + 0.1, 0.24, bevel=0.03).move(0, by, z0 - 0.02).part("tint").color(P.SHADE_2)
    a.box(bw, bd, wall_h, bevel=0.03).move(0, by, z0).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(bw + 0.2, bd + 0.2, band, bevel=0.035).move(0, by, z0 + wall_h).part("tint").color(P.WHITE)
    parts.hip_roof(a, bw + 0.2, bd + 0.2, 0.72, overhang=0.08, color=P.SLATE).move(0, by, eave + 0.07)

    # Portico: four columns carry an architrave and a pedimented roof that runs back into the hip.
    pw, col_y = 2.9, -1.5
    for x in (-1.25, -0.45, 0.45, 1.25):
        g = column(a, 0.15, wall_h)
        g.move(x, col_y, z0)
        for p in g.pieces:
            p.part("tint").color(P.SHADE_1, P.WHITE)
    a.box(pw, 0.82, band, bevel=0.035).move(0, -1.31, z0 + wall_h).part("tint").color(P.WHITE)
    parts.gable_roof(a, pw, 1.85, 0.55, overhang=0.12, thick=0.09, color=P.SLATE, axis="y").move(0, -0.795, eave + 0.09)
    a.add(parts.gable_wall(pw, 0.55, 0.08)).move(0, -1.64, eave).part("tint").color(P.SHADE_1)
    # An illuminated clock in the pediment (no numerals).
    lathe(a, [(0.205, 0), (0.205, 0.03), (0, 0.03)], 12, cap_bottom=False).rot(x=90).move(0, -1.68, eave + 0.22).part("metal").color(P.BRASS)
    lathe(a, [(0.165, 0.02), (0.165, 0.045), (0, 0.045)], 12, cap_bottom=False).rot(x=90).move(0, -1.68, eave + 0.22).part("lit").color(P.GLOW_WHITE)
    a.box(0.024, 0.012, 0.13, bevel=0).move(0, -1.732, eave + 0.22).color(P.INK).no_ao()
    a.box(0.024, 0.012, 0.09, bevel=0).rot(y=115).move(0, -1.732, eave + 0.22).color(P.INK).no_ao()

    # Entrance: tall double doors under a lit transom.
    a.add(parts.frame(0.84, 1.62, 0.08, 0.09, recess=0.06)).move(0, front, z0 - 0.08).color(P.OFF_WHITE)
    for side in (-1, 1):
        a.box(0.41, 0.03, 1.24, bevel=0).move(side * 0.212, front - 0.035, z0).color(jk.shade(P.WALNUT, -0.1), P.WALNUT)
        a.box(0.25, 0.012, 0.9, bevel=0).move(side * 0.212, front - 0.052, z0 + 0.17).color(jk.shade(P.WALNUT, -0.25))
        a.box(0.03, 0.03, 0.16, bevel=0).move(side * 0.05, front - 0.07, z0 + 0.56).part("metal").color(P.BRASS)
    a.box(0.84, 0.05, 0.05, bevel=0).move(0, front - 0.045, z0 + 1.24).color(P.OFF_WHITE)
    pane(a, 0.84, 0.33).move(0, front - 0.03, z0 + 1.29).part("lit").color(P.WINDOW, P.LAMP).no_ao()
    for x in (-0.14, 0.14):
        a.box(0.025, 0.02, 0.33, bevel=0).move(x, front - 0.045, z0 + 1.29).color(P.OFF_WHITE)

    # Tall windows on every side.
    wz = z0 + 0.72
    for x in (-1.82, -0.85, 0.85, 1.82):
        window(a, 0.4, 0.95).move(x, front, wz)
    for x in (-1.3, 0, 1.3):
        window(a, 0.4, 0.95).rot(z=180).move(x, back, wz)
    for side in (-1, 1):
        for y in (by - 0.62, by + 0.62):
            window(a, 0.4, 0.95).rot(z=90 * side).move(side * bw / 2, y, wz)

    # Cupola: a square saddle on the ridge, an octagonal lantern, a gilded dome and finial.
    turn = math.pi / 8
    a.box(1.0, 1.0, 0.44, bevel=0.035).move(0, by, 3.28).part("tint").color(P.SHADE_1, P.WHITE)
    lathe(a, [(0.4, 3.72), (0.4, 4.0), (0.47, 4.03), (0.47, 4.085)], 8, cap_bottom=False, turn=turn).smooth(30).move(0, by, 0).part(
        "tint"
    ).color(P.SHADE_1, P.WHITE)
    apothem = 0.4 * math.cos(turn)
    for k in range(4):
        with a.group() as g:
            a.add(parts.frame(0.15, 0.19, 0.03, 0.03, recess=0.02)).move(0, -apothem, 3.745).color(P.OFF_WHITE)
            pane(a, 0.15, 0.19).move(0, -apothem - 0.01, 3.775).part("lit").color(P.WINDOW, P.LAMP).no_ao()
        g.rot(z=90 * k).move(0, by, 0)
    lathe(a, 
        [(0.45, 4.085), (0.43, 4.17), (0.33, 4.28), (0.17, 4.355), (0.055, 4.38), (0.03, 4.4), (0.06, 4.43), (0.025, 4.465), (0, 4.5)],
        8,
        cap_bottom=False,
        turn=turn,
    ).smooth(30).move(0, by, 0).part("metal").color(P.GOLD, jk.shade(P.GOLD, 0.2))

    # Globe lamps on pedestals flank the portico.
    for side in (-1, 1):
        a.box(0.32, 0.32, 0.36, bevel=0.03).move(side * 1.85, -1.58, z0 - 0.02).color(P.STONE, P.CONCRETE)
        a.cyl(0.03, 0.34, 6, bevel=0).move(side * 1.85, -1.58, z0 + 0.34).color(P.GUNMETAL)
        a.sphere(0.115, 8, 5).move(side * 1.85, -1.58, z0 + 0.76).part("glow").color(P.LAMP)


def _crate(a, colour, seed, w=0.4, d=0.3, h=0.13, fruit=True):
    """A timber crate heaped with produce, centred on the origin."""
    start = len(a.pieces)
    a.box(w, d, h, bevel=0).color(jk.shade(P.PINE_WOOD, -0.12), P.PINE_WOOD)
    a.box(w + 0.02, d + 0.02, 0.03, bevel=0).move(0, 0, h - 0.03).color(jk.shade(P.PINE_WOOD, 0.12))
    heap = a.dome(w * 0.43, h * 0.75, 6, 2).scale(1, d / w, 1).jitter(0.015, seed=seed, scale=9)
    heap.move(0, 0, h - 0.01).color(jk.shade(colour, -0.12), jk.shade(colour, 0.12)).flat()
    if fruit:
        a.ico(0.05, 1).move(w * 0.14, -d * 0.1, h + 0.085).color(jk.shade(colour, 0.15)).flat()
    return parts.grouped(a, start)


def _stall(a, x, gabled, produce, seed):
    """One market stall: a timber counter, four posts and a striped awning (tint and cream)."""
    start = len(a.pieces)
    post = P.WALNUT
    a.box(0.92, 0.54, 0.5, bevel=0.02, grounded=True).move(0, -0.08, 0).color(jk.shade(P.OAK_WOOD, -0.18), P.OAK_WOOD)
    a.box(1.0, 0.64, 0.06, bevel=0.018).move(0, -0.08, 0.5).color(P.PINE_WOOD)
    t, n, w = 0.06, 5, 1.28
    if gabled:
        eave, ridge = 1.36, 1.8
        outline = [(-0.62, eave), (0, ridge), (0.62, eave), (0.62, eave - t), (0, ridge - t), (-0.62, eave - t)]
        heights = (1.46, 1.46)
    else:
        zf, zb = 1.3, 1.62
        outline = [(0.6, zb), (0.6, zb - t), (-0.56, zf - t), (-0.56, zf - 0.18), (-0.62, zf - 0.18), (-0.62, zf)]
        heights = (1.29, 1.52)
    for side in (-1, 1):
        a.box(0.07, 0.07, heights[0], bevel=0, grounded=True).move(side * 0.55, -0.42, 0).color(jk.shade(post, -0.15), post)
        a.box(0.07, 0.07, heights[1], bevel=0, grounded=True).move(side * 0.55, 0.42, 0).color(jk.shade(post, -0.15), post)
    for y, z in ((-0.42, heights[0] - 0.09), (0.42, heights[1] - 0.09)):
        a.box(1.17, 0.05, 0.06, bevel=0).move(0, y, z).color(post)
    seg = w / n
    for i in range(n):
        stripe = a.profile_x(outline, seg + 0.001, bevel=0).move(-w / 2 + seg * (i + 0.5), 0, 0)
        if i % 2 == 0:
            stripe.part("tint").color(P.SHADE_1, P.WHITE)
        else:
            stripe.color(jk.shade(P.OFF_WHITE, -0.08), P.OFF_WHITE)
    if gabled:
        a.box(w + 0.08, 0.06, 0.06, bevel=0.015).move(0, 0, 1.78).color(post)
    for i, colour in enumerate(produce):
        _crate(a, colour, seed + i).rot(x=12).move(-0.24 + 0.48 * i, -0.14, 0.585)
    g = parts.grouped(a, start)
    g.move(x, 0, 0)
    return g


@asset("market", tint="#d0493a", budget=1500)
def market(a):
    _stall(a, -1.36, False, (P.ORANGE, P.LIME), 3)
    _stall(a, 0.0, True, (P.RED, P.YELLOW), 11)
    _stall(a, 1.36, False, (P.LEAF, P.ORANGE), 23)
    # Stock on the ground: a spare crate, a sack and a barrel.
    _crate(a, P.RED, 31, 0.34, 0.2, 0.16, fruit=False).rot(z=8).move(-1.62, -0.48, 0)
    lathe(a, [(0.1, 0), (0.135, 0.07), (0.125, 0.2), (0.05, 0.29), (0.075, 0.34)], 7, cap_bottom=False).scale(1, 0.85, 1).move(1.05, -0.47, 0).color(
        jk.shade(P.SAND, -0.18), P.CREAM
    )
    lathe(a, [(0.058, 0.275), (0.058, 0.305)], 7, cap_bottom=False, cap_top=False).scale(1, 0.85, 1).move(1.05, -0.47, 0).color(P.WALNUT)
    lathe(a, [(0.1, 0), (0.13, 0.1), (0.13, 0.22), (0.1, 0.32)], 8).move(1.7, -0.47, 0).color(jk.shade(P.OAK_WOOD, -0.2), P.OAK_WOOD)
    lathe(a, [(0.134, 0.09), (0.134, 0.12)], 8, cap_bottom=False, cap_top=False).move(1.7, -0.47, 0).color(P.GUNMETAL)
    lathe(a, [(0.134, 0.2), (0.134, 0.23)], 8, cap_bottom=False, cap_top=False).move(1.7, -0.47, 0).color(P.GUNMETAL)
    # One lantern under the middle ridge keeps the row alive at night.
    a.cyl(0.008, 0.16, 4, bevel=0).move(0, -0.3, 1.47).color(P.INK)
    lathe(a, [(0, 0), (0.045, 0.02), (0.06, 0.1), (0.045, 0.13), (0, 0.14)], 6).move(0, -0.3, 1.34).part("glow").color(P.GLOW_ORANGE, P.LAMP)


@asset("fountain", tint="#ffffff", budget=560)
def fountain(a):
    stone_low, stone_high = jk.shade(P.STONE, -0.05), P.CONCRETE
    water = jk.mix(P.SEA, P.SKY, 0.45)
    # Lower basin: a flared kerb with a rolled rim, holding a pool.
    lathe(a, 
        [(0.93, 0), (0.97, 0.05), (0.92, 0.1), (0.92, 0.25), (1.0, 0.3), (1.0, 0.37), (0.86, 0.37), (0.84, 0.24)],
        14,
        cap_bottom=False,
        cap_top=False,
    ).color(stone_low, stone_high)
    disc(a, 0.85, 14).move(0, 0, 0.285).part("glass").color(water)
    # A ring of light under the surface, around the pedestal.
    disc(a, 0.36, 8, r_in=0.24).move(0, 0, 0.292).part("glow").color(jk.mix(P.GLOW_CYAN, P.GLOW_WHITE, 0.45))
    # Pedestal and upper bowl.
    lathe(a, [(0.21, 0.2), (0.21, 0.36), (0.12, 0.46), (0.085, 0.74), (0.13, 0.82)], 8, cap_bottom=False, cap_top=False).color(stone_low, stone_high)
    lathe(a, [(0.1, 0.8), (0.34, 0.86), (0.5, 0.97), (0.5, 1.02), (0.44, 1.02), (0.41, 0.96)], 12, cap_bottom=False, cap_top=False).color(
        stone_low, stone_high
    )
    disc(a, 0.428, 12).move(0, 0, 0.985).part("glass").color(water)
    # Spout and plume.
    lathe(a, [(0.075, 0.95), (0.055, 1.13), (0.09, 1.19)], 6, cap_bottom=False).color(stone_low, stone_high)
    lathe(a, [(0.035, 1.18), (0.075, 1.26), (0.045, 1.32), (0, 1.37)], 6, cap_bottom=False).part("glass").color(water, P.ICE).flat()
    # Four streams fall from the bowl into the pool.
    for k in range(4):
        ang = math.radians(45 + 90 * k)
        c, s = math.cos(ang), math.sin(ang)
        a.tube([(c * 0.49, s * 0.49, 1.0), (c * 0.56, s * 0.56, 0.86), (c * 0.6, s * 0.6, 0.29)], [0.03, 0.026, 0.034], 3, caps="none").part(
            "glass"
        ).color(water, P.ICE)


@asset("statue", tint="#b9a77a", budget=500)
def statue(a):
    # Plinth: a base step, a tapered die, a cornice and a blank plate.
    a.box(1.0, 1.0, 0.13, bevel=0.03, grounded=True).color(P.STONE_DARK, P.STONE)
    a.box(0.8, 0.8, 0.42, bevel=0.03, taper=0.93).move(0, 0, 0.11).color(P.STONE, P.CONCRETE)
    a.box(0.9, 0.9, 0.11, bevel=0.03).move(0, 0, 0.52).color(P.CONCRETE)
    a.box(0.36, 0.02, 0.18, bevel=0).move(0, -0.4, 0.24).part("tint").color(P.SHADE_3)
    # An abstract figure: one sweeping robe, a plain head, both arms lifting an orb.
    lathe(a, 
        [(0.23, 0.62), (0.24, 0.68), (0.15, 1.08), (0.125, 1.3), (0.185, 1.52), (0.175, 1.6), (0.07, 1.67), (0.06, 1.72)],
        8,
        cap_bottom=False,
    ).scale(1, 0.76, 1).part("tint").color(P.SHADE_2, P.WHITE)
    a.sphere(0.125, 8, 6).move(0, -0.01, 1.8).part("tint").color(P.WHITE)
    for sx in (-1, 1):
        a.tube([(sx * 0.15, 0, 1.56), (sx * 0.27, -0.02, 1.8), (sx * 0.12, -0.01, 2.08)], [0.058, 0.05, 0.04], 6).part(
            "tint"
        ).color(P.SHADE_1, P.WHITE)
    a.sphere(0.135, 8, 6).move(0, -0.01, 2.16).part("tint").color(P.WHITE)


# --------------------------------------------------------------------------------------------
# Street furniture
# --------------------------------------------------------------------------------------------
@asset("lamp", tint="#ffffff", budget=500)
def lamp(a):
    iron_low, iron = P.CHARCOAL, P.GUNMETAL
    # Post: a stepped foot, a collar and a slender tapering shaft with a neck ring.
    lathe(a, 
        [(0.095, 0), (0.095, 0.05), (0.062, 0.1), (0.062, 0.34), (0.08, 0.37), (0.05, 0.45), (0.034, 1.9), (0.052, 1.93), (0.032, 1.97)],
        8,
        cap_bottom=False,
    ).color(iron_low, iron)
    # Swan neck reaching over the street, with a scroll in its crook.
    a.tube(
        [(0, 0, 1.95), (0, 0, 2.08), (0, -0.05, 2.165), (0, -0.15, 2.2), (0, -0.24, 2.17), (0, -0.29, 2.09), (0, -0.29, 2.04)],
        0.018,
        5,
    ).color(iron)
    a.torus(0.05, 0.012, 8, 4, arc=300).rot(y=90).rot(x=200).move(0, -0.085, 2.07).color(iron)
    # Hanging lantern: cap, glowing body, drip finial.
    lathe(a, [(0.1, 1.955), (0.1, 1.975), (0.035, 2.035), (0.02, 2.05)], 6).move(0, -0.29, 0).color(iron_low, iron)
    lathe(a, [(0.05, 1.75), (0.078, 1.955)], 6, cap_bottom=False, cap_top=False).move(0, -0.29, 0).part("glow").color(P.GLOW_ORANGE, P.LAMP)
    lathe(a, [(0, 1.68), (0.02, 1.71), (0.058, 1.735), (0.058, 1.752)], 6).move(0, -0.29, 0).color(iron_low)


@asset("bench", tint="#8a6a4a", budget=500)
def bench(a):
    iron = P.CHARCOAL
    side = [
        (-0.19, 0.0), (-0.14, 0.0), (-0.13, 0.33), (0.1, 0.33), (0.13, 0.0), (0.19, 0.0),
        (0.165, 0.42), (0.21, 0.84), (0.165, 0.84), (0.12, 0.44), (-0.17, 0.4), (-0.185, 0.36),
    ]
    for sx in (-1, 1):
        a.profile_x(side, 0.05, bevel=0).move(sx * 0.575, 0, 0).color(iron, P.GUNMETAL)
        # Armrest: an iron stanchion under a timber rest.
        a.box(0.04, 0.04, 0.22, bevel=0).move(sx * 0.575, -0.15, 0.39).color(iron)
        a.box(0.07, 0.36, 0.04, bevel=0.014).move(sx * 0.575, -0.02, 0.6).part("tint").color(P.WHITE)
    # Seat and back slats.
    for y, z in ((-0.125, 0.395), (-0.01, 0.4), (0.105, 0.405)):
        a.box(1.1, 0.1, 0.035, bevel=0.012).move(0, y, z).part("tint").color(P.SHADE_1, P.WHITE)
    lean = math.degrees(math.atan2(0.045, 0.4))
    for z in (0.54, 0.665, 0.79):
        y = 0.125 + (z - 0.44) * 0.045 / 0.4
        a.box(1.1, 0.03, 0.095, bevel=0.01).rot(x=-lean).move(0, y, z - 0.047).part("tint").color(P.SHADE_1, P.WHITE)


@asset("fence", tint="#9a7a5a", budget=500)
def fence(a):
    # Three hewn posts with weathered points; two rails mortised through, spliced at the middle.
    r = 0.074
    for x, h in ((-0.95, 0.78), (0.0, 0.8), (0.95, 0.76)):
        post = lathe(a, [(r, 0), (r, h - 0.09), (0, h)], 4, cap_bottom=False, turn=math.pi / 4)
        post.bevel(0.012).move(x, 0, 0).part("tint").color(P.SHADE_2, P.WHITE)
    for sx, tilt in ((-1, 1.2), (1, -0.9)):
        for z, height, tone in ((0.56, 0.09, P.WHITE), (0.27, 0.08, P.SHADE_1)):
            a.box(1.07, 0.045, height, bevel=0.012).rot(y=tilt).move(sx * 0.52, 0, z).part("tint").color(tone)


@asset("wall", tint="#8a857d", budget=500)
def wall(a):
    # Base course, the wall itself, a saddleback coping.
    a.box(4.0, 0.44, 0.22, bevel=0.03, grounded=True).part("tint").color(P.SHADE_3, P.SHADE_2)
    a.box(4.0, 0.34, 1.27, bevel=0.02).move(0, 0, 0.18).part("tint").color(P.SHADE_1, P.WHITE)
    a.profile_x([(-0.22, 1.44), (0.22, 1.44), (0.22, 1.5), (0, 1.61), (-0.22, 1.5)], 4.0, bevel=0.015).color(P.SLATE, jk.shade(P.SLATE, 0.15))
    # A buttressed pier with its own cap stone.
    pier = [(-0.275, 0), (0.275, 0), (0.275, 0.62), (0.21, 0.95), (0.21, 1.64), (-0.21, 1.64), (-0.21, 0.95), (-0.275, 0.62)]
    a.profile_x(pier, 0.62, bevel=0.025).part("tint").color(P.SHADE_2, P.WHITE)
    a.box(0.72, 0.52, 0.11, bevel=0.03, taper=0.82).move(0, 0, 1.64).color(P.SLATE, jk.shade(P.SLATE, 0.15))
    # A few proud stones break up the faces.
    stones = [(-1.55, 0.5, 0.42, 0.2), (-0.85, 1.0, 0.36, 0.18), (-1.2, 0.86, 0.3, 0.16), (1.0, 0.46, 0.4, 0.2), (1.6, 0.92, 0.36, 0.18), (0.72, 1.08, 0.3, 0.16)]
    for i, (x, z, w, h) in enumerate(stones):
        for face in (-1, 1):
            a.box(w, 0.03, h, bevel=0).move(face * x, face * 0.172, z).part("tint").color(P.SHADE_2 if i % 2 else P.SHADE_1)


@asset("well", tint="#ffffff", budget=500)
def well(a):
    timber = P.OAK_WOOD
    # Rough stone ring and the dark water inside it.
    ring = lathe(a, [(0.53, 0), (0.5, 0.5), (0.55, 0.54), (0.55, 0.63), (0.41, 0.63), (0.39, 0.36)], 10, cap_bottom=False, cap_top=False)
    ring.jitter(0.014, seed=7, scale=5).color(P.STONE_DARK, P.STONE).paint_up(P.CONCRETE).flat()
    disc(a, 0.44, 10).move(0, 0, 0.42).part("glass").color(P.NAVY)
    # Posts, a plate beam and a small shingled roof.
    for sx in (-1, 1):
        a.box(0.09, 0.09, 1.46, bevel=0.012, grounded=True).move(sx * 0.585, 0, 0).color(jk.shade(timber, -0.2), timber)
        a.add(parts.gable_wall(0.6, 0.36, 0.05)).rot(z=90).move(sx * 0.57, 0, 1.44).color(timber)
    a.box(1.26, 0.08, 0.07, bevel=0).move(0, 0, 1.38).color(jk.shade(timber, -0.1))
    parts.gable_roof(a, 1.1, 0.6, 0.36, overhang=0.1, thick=0.07, color=P.RUST, ridge=False).move(0, 0, 1.51)
    a.box(1.34, 0.09, 0.05, bevel=0).move(0, 0, 1.845).color(jk.shade(P.RUST, -0.25))
    # Winch: axle, rope drum, crank, and a bucket hanging over the mouth.
    a.cyl(0.03, 1.28, 6, bevel=0).rot(y=90).move(-0.6, 0, 1.02).color(P.GUNMETAL)
    a.cyl(0.075, 0.36, 8, bevel=0.012).rot(y=90).move(-0.18, 0, 1.02).color(jk.shade(P.PINE_WOOD, -0.1), P.PINE_WOOD)
    a.tube([(0.675, 0, 1.02), (0.675, 0, 0.88), (0.76, 0, 0.88)], 0.02, 4).color(P.GUNMETAL)
    a.tube([(0, -0.07, 1.02), (0, -0.07, 0.93)], 0.012, 4, caps="none").color(P.CREAM)
    a.tube([(-0.1, -0.07, 0.85), (0, -0.07, 0.94), (0.1, -0.07, 0.85)], 0.011, 3, caps="none").color(P.GUNMETAL)
    lathe(a, [(0.082, 0.68), (0.11, 0.85), (0.095, 0.85), (0.09, 0.81)], 8).move(0, -0.07, 0).color(jk.shade(P.PINE_WOOD, -0.2), P.PINE_WOOD)


# --------------------------------------------------------------------------------------------
# Rural and camp
# --------------------------------------------------------------------------------------------
def _lock(seed, i):
    """Corner i of a thatch eave: how far it is pushed out, and how far it hangs as a share of
    the layer's `ragged`. Even corners are the long locks, odd ones the furrows between them;
    every fourth corner (2, 6, 10...) is a full lock of fixed length, because it carries a rope."""

    def chance(k):
        return (math.sin(seed * 12.9898 + i * 78.233 + k * 37.719) * 43758.5453) % 1.0

    if i % 4 == 2:
        return 1.05, 0.9
    if i % 2 == 0:
        return 1.02 + 0.05 * chance(1), 0.7 + 0.4 * chance(2)
    return 0.96 + 0.03 * chance(1), 0.22 * chance(2)


def _thatch(a, r, z, h, top_r, sides, seed, low, high, ragged=0.08, lip=0.05, soffit=True):
    """One layer of combed thatch: a skirt with a thick eave at height z, hanging over the layer
    below in ragged locks (see `_lock`). The strokes of the rake are painted down it: the
    furrow that runs up from every short corner is deeper in tone than the locks beside it."""
    profile = ([(r * 0.7, 0.06 + lip)] if soffit else []) + [(r, 0.0), (r, lip), (top_r, h)]
    tier = lathe(a, profile, sides, cap_bottom=False, cap_top=False)
    step = math.tau / sides

    def corner(co):
        return round(math.atan2(co.y, co.x) / step) % sides

    def fringe(co):
        if math.hypot(co.x, co.y) < 1e-6 or co.z > lip + 1e-6:
            return co
        push, drop = _lock(seed, corner(co))
        return (co.x * push, co.y * push, co.z - ragged * drop)

    tier.bm.verts.index_update()
    # Every other corner of the eave and of the top ring; the soffit ring stays plain.
    furrows = {v.index for v in tier.bm.verts if math.hypot(v.co.x, v.co.y) > 1e-6 and corner(v.co) % 2 and abs(v.co.z - 0.06 - lip) > 1e-6}
    tier.warp(fringe).jitter(0.012, seed=seed, scale=3.2).move(0, 0, z).color(low, high).flat()
    for f in tier.bm.faces:
        for loop in f.loops:
            if loop.vert.index in furrows:
                c = loop[tier.layer]
                loop[tier.layer] = (c[0] * 0.6, c[1] * 0.56, c[2] * 0.5, 1.0)
    return tier


@asset("haystack", tint="#ffffff", budget=500)
def haystack(a):
    # A round rick. A drum of packed hay leans out to the eave; a skirt of combed thatch and an
    # overhanging cap shed the rain, both hanging in ragged locks; a tied sheaf closes the crown
    # around the stack pole; four ropes run over the thatch with a stone on each end to hold it
    # down in a wind. A ladder is left on the eave, and a hay fork leans over the loose straw
    # raked up at the foot.
    rope = P.WALNUT
    gold = jk.mix(P.STRAW, P.ORANGE, 0.5)
    deep = jk.mix(P.THATCH, P.RUST, 0.55)
    sides = 16
    body = lathe(a, [(0.58, 0), (0.655, 0.22), (0.64, 0.45)], sides, cap_bottom=False, cap_top=False)
    body.jitter(0.02, seed=5, scale=3.2).warp(lambda co: (co.x, co.y, max(co.z, 0.0))).color(jk.shade(deep, -0.1), jk.mix(deep, gold, 0.45)).flat()
    r1, z1, rag1, lip1 = 0.73, 0.42, 0.12, 0.05
    r2, z2, rag2, lip2 = 0.52, 0.65, 0.09, 0.045
    _thatch(a, r1, z1, 0.25, 0.4, sides, 9, jk.mix(deep, gold, 0.45), gold, rag1, lip1)
    _thatch(a, r2, z2, 0.24, 0.0, sides, 13, jk.mix(deep, gold, 0.75), jk.shade(gold, 0.22), rag2, lip2, soffit=False)
    # The last sheaf, bound where the ropes meet, stands with its ears up around the stack pole.
    crown = lathe(a, [(0.05, 0.875), (0.1, 0.97), (0, 0.935)], 6, cap_bottom=False)
    crown.warp(lambda co: (co.x, co.y, co.z + (0.035 if co.z > 0.96 and round(math.atan2(co.y, co.x) / (math.tau / 6)) % 2 else 0.0)))
    crown.color(jk.mix(deep, gold, 0.5), jk.shade(gold, 0.15)).flat()
    a.tube([(0.0, 0.0, 0.92), (0.012, 0.008, 1.05)], [0.03, 0.022], 4).color(P.BARK, P.OAK_WOOD)
    # Ropes over the thatch on four long locks, each ending in a stone that hangs clear of the wall.
    for k in range(4):
        ang = (2 + 4 * k) * math.tau / sides
        c, s = math.cos(ang), math.sin(ang)

        def at(r, z, c=c, s=s):
            return (c * r, s * r, z)

        end = at(r1 * 1.05 + 0.022, 0.19 - 0.03 * (k % 2))
        a.tube([at(0.052, 0.895), at(r2 * 1.05 + 0.018, z2 - rag2 * 0.9 + lip2 + 0.02), at(r1 * 1.05 + 0.018, z1 - rag1 * 0.9 + lip1 + 0.02), end], 0.015, 3).color(rope).no_ao()
        stone = lathe(a, [(0, -0.135), (0.075, -0.095), (0.062, -0.03), (0, 0.006)], 4, turn=0.5 * k)
        stone.jitter(0.02, seed=k + 3, scale=11).rot(x=8 * (k - 1.5)).move(*end).color(jk.mix(P.STONE_DARK, P.BARK, 0.25), jk.mix(P.STONE, P.SAND, 0.3)).flat()
    # The ladder rests on the eave, in a furrow between two ropes.
    ang = math.radians(-22.5)
    out, across = Vector((math.cos(ang), math.sin(ang), 0)), Vector((-math.sin(ang), math.cos(ang), 0))
    foot, head = out * 0.92 + Vector((0, 0, 0.014)), out * 0.6 + Vector((0, 0, 0.82))
    timber = P.PINE_WOOD
    for side in (-1, 1):
        beam(a, foot + across * 0.1 * side, head + across * 0.1 * side, 0.034, 0.03).color(jk.shade(timber, -0.25), timber)
    for t in (0.14, 0.36, 0.58, 0.8):
        mid = foot.lerp(head, t)
        a.tube([mid - across * 0.1, mid + across * 0.1], 0.013, 3).color(jk.shade(timber, -0.1))
    # A two-tined hay fork leaning on the eave, over the loose straw.
    ang = math.radians(-112.5)
    out, across = Vector((math.cos(ang), math.sin(ang), 0)), Vector((-math.sin(ang), math.cos(ang), 0))
    foot, head = out * 0.86 + Vector((0, 0, 0.012)), out * 0.67 + Vector((0, 0, 0.7))
    along = (head - foot).normalized()
    a.tube([foot, head], 0.017, 4).color(jk.shade(P.PINE_WOOD, -0.2), P.PINE_WOOD)
    a.tube([head - across * 0.06, head + across * 0.06], 0.012, 3).part("metal").color(P.STEEL)
    for k in (-1, 1):
        base = head + across * 0.052 * k
        a.tube([base, base + along * 0.18], [0.012, 0.005], 3).part("metal").color(P.STEEL)
    # Loose straw raked off the stack lies in a ragged apron round the foot, under the fork.
    verts, faces, reaches = [], [], (0.66, 0.85, 0.9, 0.79, 0.66)
    for i, reach in enumerate(reaches):
        k = i / (len(reaches) - 1)
        ang = math.radians(-130 + 64 * k)
        swell = math.sin(k * math.pi) ** 0.6
        for r, z in ((0.57, 0.02 + 0.1 * swell), (0.6 + (reach - 0.6) * 0.6, 0.015 + 0.055 * swell), (reach, 0.0)):
            verts.append((math.cos(ang) * r, math.sin(ang) * r, z))
        if i:
            b = (i - 1) * 3
            faces += [(b, b + 1, b + 4, b + 3), (b + 1, b + 2, b + 5, b + 4)]
    apron = a.raw(verts, faces)
    if sum(f.normal.z for f in apron.bm.faces) < 0:
        bmesh.ops.reverse_faces(apron.bm, faces=apron.bm.faces[:])
        apron.bm.normal_update()
    apron.color(jk.mix(deep, gold, 0.55), jk.shade(gold, 0.1)).flat()
    a.tube([(0.2, -0.8, 0.012), (0.36, -0.73, 0.02)], 0.012, 3).color(gold)


@asset("totem", tint="#9a6a3a", budget=500)
def totem(a):
    # A carved and painted timber stack: drum, ball, block, spool, disc and a faceted tip.
    lathe(a, 
        [(0.36, 0), (0.35, 0.17), (0.31, 0.19), (0.31, 0.23), (0.34, 0.25), (0.31, 0.42), (0.22, 0.42)], 8, cap_bottom=False, cap_top=False
    ).part("tint").color(P.SHADE_3, P.SHADE_1)
    lathe(a, [(0.24, 0.4), (0.24, 0.5), (0.1, 0.5)], 8, cap_bottom=False, cap_top=False).color(P.CREAM)
    a.sphere(0.31, 8, 6, (1, 1, 0.8)).move(0, 0, 0.73).part("tint").color(P.SHADE_1, P.WHITE)
    lathe(a, [(0.21, 0.92), (0.21, 1.03)], 8, cap_bottom=False, cap_top=False).color(P.TEAL)
    a.box(0.5, 0.5, 0.42, bevel=0.04).rot(z=45).move(0, 0, 1.02).part("tint").color(P.SHADE_2, P.WHITE)
    lathe(a, [(0.21, 1.43), (0.13, 1.5), (0.13, 1.57), (0.21, 1.63)], 8, cap_bottom=False, cap_top=False).color(jk.shade(P.CREAM, -0.1), P.CREAM)
    lathe(a, [(0.16, 1.62), (0.38, 1.64), (0.38, 1.7), (0.16, 1.72), (0.05, 1.72)], 8, cap_bottom=False, cap_top=False).part("tint").color(
        P.SHADE_1, P.WHITE
    )
    lathe(a, [(0.11, 1.7), (0.24, 1.89), (0.24, 1.97), (0, 2.22)], 4, cap_bottom=False, turn=math.pi / 4).bevel(0.016).part("tint").color(
        P.SHADE_1, P.WHITE
    )
    lathe(a, [(0.232, 1.905), (0.232, 1.955)], 4, cap_bottom=False, cap_top=False, turn=math.pi / 4).color(P.TEAL)


def _flame(a, x, y, r, h, low, high, lean=(0.0, 0.0), turn=0.0):
    f = lathe(a, [(r * 0.45, 0), (r, h * 0.22), (r * 0.8, h * 0.48), (r * 0.34, h * 0.78), (0, h)], 5, cap_bottom=False, turn=turn)
    f.warp(lambda co: (co.x + lean[0] * (co.z / h) ** 2, co.y + lean[1] * (co.z / h) ** 2, co.z))
    return f.move(x, y, 0.03).part("glow").color(low, high)


@asset("campfire", tint="#ffffff", budget=500)
def campfire(a):
    # Ring of field stones around an ash bed.
    for i in range(7):
        ang = i / 7 * math.tau + 0.2
        tone = (P.STONE, P.STONE_DARK, P.CONCRETE_DARK)[i % 3]
        s = 0.085 + 0.012 * ((i * 5) % 3)
        a.ico(s, 1).scale(1.25, 0.95, 0.75).jitter(0.012, seed=i + 2, scale=11).rot(z=math.degrees(ang) + 90).move(
            math.cos(ang) * 0.285, math.sin(ang) * 0.285, 0.045
        ).color(jk.shade(tone, -0.15), tone).flat()
    lathe(a, [(0.25, 0), (0.2, 0.03), (0, 0.035)], 8, cap_bottom=False).color(P.CHARCOAL).flat()
    disc(a, 0.13, 6).move(0, 0, 0.042).part("glow").color(P.GLOW_ORANGE)
    # Crossed logs leaning together.
    for i in range(4):
        ang = math.radians(20 + 90 * i)
        c, s = math.cos(ang), math.sin(ang)
        foot = Vector((c * 0.2, s * 0.2, 0.05))
        tip = Vector((-c * 0.06, -s * 0.06, 0.27))
        axis = (tip - foot).normalized()
        log = a.tube([foot, tip], 0.042, 6)
        log.color(P.BARK_DARK, P.BARK).paint(lambda f, axis=axis: P.PINE_WOOD if abs(f.normal.dot(axis)) > 0.9 else None)
    # Faceted flames: a tall heart with brighter tongues around it.
    _flame(a, 0.0, 0.0, 0.11, 0.47, P.GLOW_ORANGE, P.GLOW_RED, lean=(0.03, 0.02))
    _flame(a, 0.045, -0.05, 0.075, 0.33, P.LAMP, P.AMBER, lean=(0.02, -0.03), turn=0.6)
    _flame(a, -0.06, 0.03, 0.065, 0.28, P.YELLOW, P.GLOW_ORANGE, lean=(-0.03, 0.02), turn=1.3)
    _flame(a, 0.02, 0.07, 0.055, 0.22, P.LAMP, P.AMBER, lean=(0.01, 0.03), turn=2.1)


# --------------------------------------------------------------------------------------------
# Scenario S1: the surveillance state
# --------------------------------------------------------------------------------------------
@asset("billboard", tint="#d0493a", budget=700)
def billboard(a):
    steel = P.GUNMETAL
    # Two columns on footings, tied and cross-braced, run up the back of the panel.
    for sx in (-1, 1):
        a.box(0.42, 0.32, 0.14, bevel=0.03, grounded=True).move(sx * 1.0, 0.07, 0).color(P.CONCRETE_DARK, P.CONCRETE)
        a.box(0.13, 0.11, 3.7, bevel=0.015).move(sx * 1.0, 0.095, 0.1).color(P.CHARCOAL, steel)
    for z in (0.42, 2.22):
        a.box(1.9, 0.05, 0.07, bevel=0).move(0, 0.095, z).color(steel)
    beam(a, (-0.94, 0.095, 0.49), (0.94, 0.095, 2.22), 0.055, 0.04).color(steel)
    beam(a, (0.94, 0.095, 0.49), (-0.94, 0.095, 2.22), 0.055, 0.04).color(steel)
    # The panel: a tinted casing, three blank lit sheets, stringers across the back.
    a.box(3.0, 0.14, 1.5, bevel=0.03).move(0, -0.03, 2.4).part("tint").color(P.SHADE_1, P.WHITE)
    for i, tone in enumerate((P.GLOW_WHITE, jk.shade(P.GLOW_WHITE, 0.25), P.GLOW_WHITE)):
        a.box(0.89, 0.02, 1.24, bevel=0).move((i - 1) * 0.915, -0.105, 2.53).part("glow").color(jk.shade(tone, -0.06), tone)
    for z in (2.72, 3.5):
        a.box(2.9, 0.05, 0.09, bevel=0).move(0, 0.065, z).color(steel)
    # Three gooseneck lamps wash the face from above.
    for x in (-1.0, 0.0, 1.0):
        a.tube([(x, -0.02, 3.86), (x, -0.04, 3.97), (x, -0.13, 4.01), (x, -0.2, 3.97)], 0.02, 4).color(steel)
        a.box(0.17, 0.12, 0.055, bevel=0.015).rot(x=-28).move(x, -0.215, 3.915).color(P.CHARCOAL)
        a.box(0.13, 0.085, 0.012, bevel=0).rot(x=-28).move(x, -0.217, 3.908).part("glow").color(P.LAMP)


@asset("checkpoint", tint="#5d6168", budget=1200)
def checkpoint(a):
    bx, z0 = -1.42, 0.12
    trim = P.OFF_WHITE
    glass = dict(part="glass", low=P.GLASS_DARK, high=P.GLASS_TINTED, trim=trim)
    # Traffic island with a painted kerb on the lane side.
    a.box(1.86, 1.2, 0.13, bevel=0.03, grounded=True).move(-1.07, 0, 0).color(P.CONCRETE_DARK, P.CONCRETE)
    a.box(0.07, 1.21, 0.135, bevel=0.02, grounded=True).move(-0.17, 0, 0).color(P.AMBER)
    # Guard booth.
    a.box(1.08, 0.98, 0.16, bevel=0.02).move(bx, 0, z0 - 0.01).part("tint").color(P.SHADE_3)
    a.box(1.04, 0.94, 1.5, bevel=0.04).move(bx, 0, z0).part("tint").color(P.SHADE_1, P.WHITE)
    window(a, 0.66, 0.5, bars="bar", **glass).move(bx, -0.47, z0 + 0.7)
    window(a, 0.6, 0.5, bars="", **glass).rot(z=90).move(bx + 0.52, 0, z0 + 0.7)
    window(a, 0.36, 0.4, bars="", sill=False, **glass).rot(z=-90).move(bx - 0.52, 0.1, z0 + 0.8)
    # Steel door at the back.
    a.add(parts.frame(0.42, 1.1, 0.05, 0.05, recess=0.03)).rot(z=180).move(bx + 0.1, 0.47, z0 - 0.05).color(trim)
    a.box(0.42, 0.02, 1.1, bevel=0).move(bx + 0.1, 0.485, z0).color(P.STEEL_DARK, P.STEEL)
    a.box(0.03, 0.03, 0.12, bevel=0).move(bx - 0.04, 0.51, z0 + 0.5).color(P.INK)
    # Flat roof that reaches over the lane window as a canopy, on two struts.
    a.box(1.72, 1.2, 0.1, bevel=0.03).move(-1.14, 0, z0 + 1.5).color(P.CHARCOAL, P.GUNMETAL)
    a.box(1.6, 1.08, 0.03, bevel=0).move(-1.14, 0, z0 + 1.6).color(P.SLATE)
    for sy in (-1, 1):
        beam(a, (bx + 0.52, sy * 0.38, z0 + 1.2), (-0.34, sy * 0.38, z0 + 1.5), 0.04).color(P.CHARCOAL)
    # Roof plant: a vent unit and a floodlight aimed at the lane.
    a.box(0.42, 0.34, 0.16, bevel=0.03).move(bx - 0.14, 0.3, z0 + 1.62).color(P.CONCRETE_DARK, P.CONCRETE)
    a.box(0.3, 0.02, 0.07, bevel=0).move(bx - 0.14, 0.125, z0 + 1.665).color(P.CHARCOAL)
    a.box(0.2, 0.09, 0.12, bevel=0.02).rot(x=-22).move(-0.52, -0.5, z0 + 1.63).color(P.CHARCOAL)
    a.box(0.16, 0.012, 0.085, bevel=0).rot(x=-22).move(-0.52, -0.548, z0 + 1.645).part("glow").color(P.GLOW_WHITE)
    # Red beacon and a whip aerial.
    a.cyl(0.075, 0.05, 8, bevel=0.012).move(bx, 0, z0 + 1.63).color(P.INK)
    lathe(a, [(0.055, 0), (0.055, 0.07), (0.032, 0.12), (0, 0.135)], 6, cap_bottom=False).move(bx, 0, z0 + 1.68).part("glow").color(P.GLOW_RED)
    a.tube([(bx - 0.36, 0.36, z0 + 1.6), (bx - 0.36, 0.36, 2.0)], 0.008, 3).color(P.INK)
    # Lane light under the canopy edge: red showing, the lower lens dark.
    a.box(0.14, 0.11, 0.3, bevel=0.02).move(-0.4, -0.5, z0 + 1.2).color(P.INK)
    for sy in (-1, 1):
        a.cyl(0.042, 0.02, 6, bevel=0).rot(x=90 * sy).move(-0.4, -0.5 - sy * 0.055, z0 + 1.415).part("glow").color(P.GLOW_RED)
        a.cyl(0.042, 0.02, 6, bevel=0).rot(x=90 * sy).move(-0.4, -0.5 - sy * 0.055, z0 + 1.285).part("glass").color(P.GLASS_DARK)
    # Barrier: drive housing, hub, counterweighted striped arm and a rest post across the lane.
    ay, az = -0.19, 0.95
    a.box(0.26, 0.3, 0.92, bevel=0.03).move(-0.6, 0, z0).color(P.CONCRETE_DARK, P.CONCRETE)
    a.box(0.3, 0.34, 0.07, bevel=0.02).move(-0.6, 0, z0 + 0.9).color(P.AMBER)
    a.cyl(0.085, 0.07, 8, bevel=0.012).rot(x=90).move(-0.6, -0.15, az).color(P.STEEL_DARK)
    a.box(2.62, 0.06, 0.1, bevel=0.02).move(0.39, ay - 0.06, az - 0.05).color(P.OFF_WHITE)
    for x in (-0.22, 0.3, 0.82, 1.34):
        a.box(0.26, 0.068, 0.108, bevel=0).move(x, ay - 0.06, az - 0.054).color(P.RED)
    a.box(0.3, 0.1, 0.2, bevel=0.025).move(-0.8, ay - 0.06, az - 0.14).color(P.CHARCOAL)
    a.box(0.09, 0.09, 0.84, bevel=0.015, grounded=True).move(1.62, ay - 0.06, 0).color(P.CONCRETE_DARK, P.CONCRETE)
    for sy in (-1, 1):
        a.box(0.09, 0.022, 0.16, bevel=0).move(1.62, ay - 0.06 + sy * 0.046, 0.82).color(P.AMBER)
    # Bollards guard the island corners.
    for sy in (-1, 1):
        lathe(a, [(0.06, 0), (0.06, 0.4), (0.045, 0.45), (0, 0.47)], 6, cap_bottom=False).move(-0.38, sy * 0.47, z0).color(P.AMBER, P.YELLOW)


@asset("surveillance", tint="#5d6168", budget=500)
def surveillance(a):
    body_low, body = P.CONCRETE, P.OFF_WHITE
    # Footing, service sleeve and a tall tapering pole.
    a.cyl(0.125, 0.07, 8, bevel=0.015, grounded=True).color(P.CONCRETE_DARK, P.CONCRETE)
    lathe(a, [(0.095, 0.06), (0.095, 0.56), (0.066, 0.63), (0.042, 4.06)], 8, cap_bottom=False).part("tint").color(P.SHADE_2, P.WHITE)
    a.box(0.1, 0.02, 0.2, bevel=0).move(0, -0.092, 0.24).part("tint").color(P.SHADE_3)
    # Outreach arm over the street on a stay, with a light strip underneath.
    a.box(0.08, 0.6, 0.08, bevel=0.015).move(0, -0.26, 3.97).part("tint").color(P.SHADE_1, P.WHITE)
    beam(a, (0, -0.03, 3.56), (0, -0.4, 3.98), 0.035).part("tint").color(P.SHADE_2)
    a.box(0.06, 0.26, 0.016, bevel=0).move(0, -0.22, 3.955).part("glow").color(P.GLOW_WHITE)
    # Main camera at the tip, tilted down the street: housing, sunshield, lens, status diode.
    with a.group() as g:
        a.box(0.22, 0.42, 0.18, bevel=0.03).move(0, 0, -0.09).color(body_low, body)
        a.box(0.26, 0.5, 0.028, bevel=0).move(0, -0.03, 0.092).color(body)
        a.cyl(0.07, 0.04, 8, bevel=0).rot(x=90).move(0, -0.2, -0.008).part("glass").color(P.INK)
        a.box(0.036, 0.012, 0.036, bevel=0).move(0.07, -0.214, 0.05).part("glow").color(P.GLOW_RED)
    g.rot(x=24).move(0, -0.4, 3.8)
    a.box(0.045, 0.045, 0.14, bevel=0).move(0, -0.4, 3.85).color(P.CHARCOAL)
    # A second camera on a bracket watches the foot of the pole.
    with a.group() as g:
        a.box(0.17, 0.32, 0.14, bevel=0.025).move(0, 0, -0.07).color(body_low, body)
        a.cyl(0.054, 0.035, 8, bevel=0).rot(x=90).move(0, -0.155, -0.005).part("glass").color(P.INK)
    g.rot(x=50).move(0, -0.2, 3.16)
    a.box(0.04, 0.2, 0.04, bevel=0).move(0, -0.1, 3.2).color(P.CHARCOAL)
    # Red status beacon on the mast head.
    a.cyl(0.055, 0.04, 8, bevel=0.01).move(0, 0, 4.05).color(P.INK)
    lathe(a, [(0.042, 0), (0.042, 0.09), (0.02, 0.15), (0, 0.16)], 6, cap_bottom=False).move(0, 0, 4.09).part("glow").color(P.GLOW_RED)


@asset("screen", tint="#3a3e45", budget=800)
def screen(a):
    # Footing, plinth and a tapering pylon.
    a.box(1.3, 0.8, 0.16, bevel=0.035, grounded=True).move(0, -0.1, 0).color(P.CONCRETE_DARK, P.CONCRETE)
    a.box(0.86, 0.64, 0.3, bevel=0.04, taper=0.86).move(0, -0.02, 0.13).color(P.CONCRETE)
    a.box(0.58, 0.5, 3.95, bevel=0.045, taper=0.8).move(0, 0.04, 0.4).part("tint").color(P.SHADE_3, P.WHITE)
    # Display casing, a spine and struts behind it.
    a.box(4.2, 0.36, 2.6, bevel=0.06).move(0, -0.1, 4.0).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(0.62, 0.22, 2.3, bevel=0.03).move(0, 0.18, 4.15).part("tint").color(P.SHADE_2, P.SHADE_1)
    for sx in (-1, 1):
        beam(a, (sx * 0.3, 0.24, 4.3), (sx * 1.75, 0.11, 5.9), 0.09, 0.07).part("tint").color(P.SHADE_2)
        a.box(1.5, 0.03, 0.06, bevel=0).move(sx * 1.2, 0.09, 4.6).part("tint").color(P.SHADE_3)
    # The picture: an orange field and one unblinking lens.
    low, high = jk.mix(P.GLOW_RED, P.GLOW_ORANGE, 0.45), P.GLOW_ORANGE
    a.box(3.84, 0.03, 2.24, bevel=0).move(0, -0.285, 4.18).part("glow").color(low, high)
    cy = -0.302
    disc(a, 0.62, 20).rot(x=90).move(0, cy, 5.3).part("glow").color(P.GLOW_WHITE)
    disc(a, 0.34, 16).rot(x=90).move(0, cy - 0.004, 5.3).part("glow").color(jk.mix(P.GLOW_RED, P.INK, 0.25))
    disc(a, 0.1, 8).rot(x=90).move(0.1, cy - 0.008, 5.4).part("glow").color(P.GLOW_WHITE)
    for sx in (-1, 1):
        a.box(0.7, 0.01, 0.09, bevel=0).move(sx * 1.25, cy, 5.255).part("glow").color(P.GLOW_WHITE)
    # Horn loudspeakers on the pylon, and a red beacon on top.
    for sx in (-1, 1):
        with a.group() as g:
            horn = lathe(a, [(0.06, 0), (0.06, 0.1), (0.09, 0.16), (0.25, 0.4), (0.26, 0.42), (0.24, 0.405), (0.08, 0.17), (0, 0.17)], 8)
            horn.color(P.CONCRETE_DARK, P.OFF_WHITE)
            # The bore is dark: faces that look back toward the axis, and the throat.
            horn.paint(lambda f: P.INK if f.normal.z > 0.2 and f.calc_center_median().z > 0.16 else None)
        g.rot(x=90).rot(x=-14).rot(z=sx * 24).move(sx * 0.4, -0.2, 3.5)
        beam(a, (sx * 0.2, 0.0, 3.58), (sx * 0.41, -0.24, 3.51), 0.06).color(P.CHARCOAL)
    a.cyl(0.07, 0.05, 8, bevel=0.012).move(1.7, -0.1, 6.6).color(P.INK)
    lathe(a, [(0.05, 0), (0.05, 0.07), (0.028, 0.12), (0, 0.135)], 6, cap_bottom=False).move(1.7, -0.1, 6.64).part("glow").color(P.GLOW_RED)
