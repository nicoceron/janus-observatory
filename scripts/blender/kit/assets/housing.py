"""Housing blocks, towers and the hopeful-future homes.

Walls are the `tint` part, painted near white; window panes are `lit`, so the generated `-dark`
twin goes dark. Everything faces -y and stands on z = 0. Big facades use punched shells (one
welded wall mesh with real reveals) or lean framed windows, never full `parts.window` sets.
All forms are invented illustration.
"""

from __future__ import annotations

import math

import bmesh
from mathutils import Matrix, Vector

from kit import jk, parts
from kit import palette as P
from kit.jk import asset

SIDES = ("front", "right", "back", "left")
TURN = {"front": 0.0, "right": 90.0, "back": 180.0, "left": -90.0}
#: Warm interior tones; a facade cycles through them so its windows are not one flat colour.
WARM = (P.WINDOW, "#ffe2a0", "#ffcb7a", P.LAMP, "#ffd48a")


# --------------------------------------------------------------------------------------------
# Module helpers
# --------------------------------------------------------------------------------------------
def mesh(verts, faces):
    """A piece with the winding exactly as listed (counter-clockwise seen from outside)."""
    bm = bmesh.new()
    vs = [bm.verts.new(v) for v in verts]
    for f in faces:
        bm.faces.new([vs[i] for i in f])
    bm.verts.index_update()
    bm.faces.index_update()
    bm.normal_update()
    return jk.Piece(bm)


def quad(a, w, h):
    """One quad facing -y on the plane y = 0, bottom centre at the origin: glazing in a frame."""
    return a.add(mesh([(-w / 2, 0, 0), (w / 2, 0, 0), (w / 2, 0, h), (-w / 2, 0, h)], [(0, 1, 2, 3)]))


def disc(a, r, sides=12, turn=0.0):
    """A flat disc on z = 0 facing up."""
    ring = [(math.cos(turn + i / sides * math.tau) * r, math.sin(turn + i / sides * math.tau) * r, 0.0) for i in range(sides)]
    return a.add(mesh(ring, [tuple(range(sides))]))


def beam(a, p0, p1, w, d=None, bevel=0.0):
    """A rectangular member from p0 to p1: struts, posts, stringers and rails."""
    p0, p1 = Vector(p0), Vector(p1)
    axis = p1 - p0
    piece = jk.box(w, d or w, axis.length, bevel=bevel)
    spin = Vector((0, 0, 1)).rotation_difference(axis.normalized()).to_matrix().to_4x4()
    piece.apply(Matrix.Translation(p0) @ spin)
    return a.add(piece)


def turn(side, u, y, z):
    """A point given in the front wall's frame (u along the wall, y depth) on another side."""
    if side == "front":
        return (u, y, z)
    if side == "right":
        return (-y, u, z)
    if side == "back":
        return (-u, -y, z)
    return (y, -u, z)


def put(g, side, u, z, dist, cx=0.0, cy=0.0):
    """Hang a piece or group built at the origin (facing -y) on a wall `dist` from the centre."""
    return g.move(u, -dist, z).rot(z=TURN[side]).move(cx, cy, 0)


def warm(i):
    """(low, high) for the i-th lit pane of a facade."""
    c = WARM[i % len(WARM)]
    return jk.shade(c, -0.05), jk.mix(c, P.GLOW_WHITE, 0.4)


class Panes:
    """Glazing quads collected per part and emitted as one piece each."""

    def __init__(self):
        self.parts: dict[str, tuple[list, list, list]] = {}

    def add(self, part, corners, low, high=None):
        """`corners`: bottom left, bottom right, top right, top left, seen from outside."""
        verts, faces, colours = self.parts.setdefault(part, ([], [], []))
        base = len(verts)
        verts.extend(corners)
        faces.append((base, base + 1, base + 2, base + 3))
        lo, hi = jk.col(low), jk.col(high if high is not None else low)
        colours.extend((lo, lo, hi, hi))

    def emit(self, a):
        for part, (verts, faces, colours) in self.parts.items():
            piece = mesh(verts, faces).part(part).no_ao()
            for f in piece.bm.faces:
                for loop in f.loops:
                    c = colours[loop.vert.index]
                    loop[piece.layer] = (c[0], c[1], c[2], 1.0)
            a.add(piece)


def shell(a, w, d, h, openings=None, chamfer=0.05, reveal=0.07, low=P.SHADE_1, high=P.WHITE,
          inner=P.SHADE_2, tone=None, glass=(P.GLASS_DARK, P.GLASS_TINTED)):
    """Four walls with punched openings, as one welded mesh with chamfered corners.

    w by d by h, standing on z = 0, centred, open above and below (a plinth and a roof close it).
    `openings` maps a side to rectangles `(u0, u1, z0, z1[, part])` in that wall's own frame: u
    runs left to right as seen from outside, centred on the wall. Each opening gets real reveals
    and a pane `reveal` deep: `lit` by default, `glass`, or None to leave it open for a door.
    `tone(side_index, n)` returns the (low, high) colour of the n-th lit pane of a side.
    """
    start = len(a.pieces)
    openings = openings or {}

    def r4(x):
        return round(x, 4)

    zs = sorted({0.0, r4(h)} | {r4(v) for rects in openings.values() for r in rects for v in (r[2], r[3])})
    verts: list = []
    index: dict = {}
    faces: list = []
    inner_faces: set = set()
    panes = Panes()

    def vid(p):
        key = (r4(p[0]), r4(p[1]), r4(p[2]))
        if key not in index:
            index[key] = len(verts)
            verts.append(p)
        return index[key]

    for s, side in enumerate(SIDES):
        wide, deep = (w, d) if side in ("front", "back") else (d, w)
        yf, yb = -deep / 2, -deep / 2 + reveal
        rects = openings.get(side, ())
        us = sorted({r4(-wide / 2 + chamfer), r4(wide / 2 - chamfer)} | {r4(v) for r in rects for v in (r[0], r[1])})

        def hole(i, j):
            if not (0 <= i < len(us) - 1 and 0 <= j < len(zs) - 1):
                return False
            cu, cz = (us[i] + us[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2
            return any(r[0] < cu < r[1] and r[2] < cz < r[3] for r in rects)

        def pt(u, y, z):
            return vid(turn(side, u, y, z))

        for i in range(len(us) - 1):
            for j in range(len(zs) - 1):
                u0, u1, z0, z1 = us[i], us[i + 1], zs[j], zs[j + 1]
                if not hole(i, j):
                    faces.append((pt(u0, yf, z0), pt(u1, yf, z0), pt(u1, yf, z1), pt(u0, yf, z1)))
                    continue
                edges = []
                if not hole(i, j - 1):  # sill
                    edges.append(((u0, yf, z0), (u1, yf, z0), (u1, yb, z0), (u0, yb, z0)))
                if not hole(i, j + 1):  # lintel
                    edges.append(((u0, yf, z1), (u0, yb, z1), (u1, yb, z1), (u1, yf, z1)))
                if not hole(i - 1, j):  # left jamb
                    edges.append(((u0, yf, z0), (u0, yb, z0), (u0, yb, z1), (u0, yf, z1)))
                if not hole(i + 1, j):  # right jamb
                    edges.append(((u1, yf, z0), (u1, yf, z1), (u1, yb, z1), (u1, yb, z0)))
                for e in edges:
                    inner_faces.add(len(faces))
                    faces.append(tuple(pt(*c) for c in e))
        lit = 0
        for r in rects:
            part = r[4] if len(r) > 4 else "lit"
            if part is None:
                continue
            if part == "lit":
                lo, hi = (tone or (lambda s_, n_: warm(s_ * 3 + n_ * 2 + n_ // 3)))(s, lit)
                lit += 1
            else:
                lo, hi = glass
            e = 0.012
            panes.add(
                part,
                [turn(side, r[0] - e, yb, r[2] - e), turn(side, r[1] + e, yb, r[2] - e),
                 turn(side, r[1] + e, yb, r[3] + e), turn(side, r[0] - e, yb, r[3] + e)],
                lo, hi,
            )
    if chamfer > 1e-6:
        for s, side in enumerate(SIDES):
            nxt = SIDES[(s + 1) % 4]
            wide, deep = (w, d) if side in ("front", "back") else (d, w)
            wide2, deep2 = (w, d) if nxt in ("front", "back") else (d, w)
            for j in range(len(zs) - 1):
                a0 = vid(turn(side, wide / 2 - chamfer, -deep / 2, zs[j]))
                b0 = vid(turn(nxt, -wide2 / 2 + chamfer, -deep2 / 2, zs[j]))
                a1 = vid(turn(side, wide / 2 - chamfer, -deep / 2, zs[j + 1]))
                b1 = vid(turn(nxt, -wide2 / 2 + chamfer, -deep2 / 2, zs[j + 1]))
                faces.append((a0, b0, b1, a1))
    wall = a.add(mesh(verts, faces)).part("tint").color(low, high)
    wall.paint(lambda f: inner if f.index in inner_faces else None)
    panes.emit(a)
    return parts.grouped(a, start)


def win(a, w, h, trim=P.OFF_WHITE, sill=False, part="lit", low=P.WINDOW, high=P.LAMP, border=0.045,
        depth=0.05, bars=0, posts=0):
    """A lean framed window on the wall plane y = 0, bottom centre at the origin, facing -y.

    A proud frame with a set-back pane (26 triangles). `bars` adds horizontal glazing bars and
    `posts` vertical ones; `sill` a plain sill.
    """
    start = len(a.pieces)
    glass_y = -(depth - 0.03)
    a.add(parts.frame(w, h, border, depth, recess=0.03)).color(trim)
    quad(a, w + 0.01, h + 0.01).move(0, glass_y, border - 0.005).part(part).color(low, high).no_ao()
    for k in range(bars):
        a.box(w, 0.018, 0.026, bevel=0).move(0, glass_y - 0.012, border + h * (k + 1) / (bars + 1) - 0.013).color(trim)
    for k in range(posts):
        a.box(0.026, 0.018, h, bevel=0).move(-w / 2 + w * (k + 1) / (posts + 1), glass_y - 0.012, border).color(trim)
    if sill:
        a.box(w + border * 2 + 0.07, 0.09, 0.04, bevel=0).move(0, -0.045, -0.03).color(trim)
    return parts.grouped(a, start)


def entrance(a, w, h, trim=P.OFF_WHITE, leaf=P.WALNUT):
    """Glazed double doors with a transom light, on the wall plane y = 0, facing -y."""
    start = len(a.pieces)
    border, depth = 0.055, 0.06
    a.add(parts.frame(w, h, border, depth, recess=0.04)).color(trim)
    quad(a, w + 0.01, h + 0.01).move(0, -0.02, border - 0.005).part("lit").color(P.WINDOW, P.LAMP).no_ao()
    kick = h * 0.4
    for side in (-1, 1):
        a.box(w / 2 - 0.03, 0.02, kick, bevel=0).move(side * (w / 4 + 0.005), -0.032, border).color(jk.shade(leaf, -0.1), leaf)
    a.box(0.035, 0.022, h * 0.78, bevel=0).move(0, -0.033, border).color(leaf)
    a.box(w, 0.022, 0.035, bevel=0).move(0, -0.033, border + h * 0.78).color(leaf)
    return parts.grouped(a, start)


def service_door(a, w, h, leaf, trim=P.OFF_WHITE):
    """A plain framed door with a small hood, on the wall plane y = 0, facing -y."""
    start = len(a.pieces)
    a.add(parts.frame(w, h, 0.04, 0.045, recess=0.03)).color(trim)
    quad(a, w + 0.01, h + 0.01).move(0, -0.015, 0.035).color(jk.shade(leaf, -0.12), leaf)
    a.box(w + 0.22, 0.16, 0.04, bevel=0).move(0, -0.08, h + 0.1).color(trim)
    return parts.grouped(a, start)


def rim(a, w, d, h, t, bevel=0.02):
    """A rectangular upstand (parapet or coping), w by d outside and t thick, on z = 0."""
    X, Y, x, y = w / 2, d / 2, w / 2 - t, d / 2 - t
    v = [
        (-X, -Y, 0), (X, -Y, 0), (X, Y, 0), (-X, Y, 0),
        (-X, -Y, h), (X, -Y, h), (X, Y, h), (-X, Y, h),
        (-x, -y, h), (x, -y, h), (x, y, h), (-x, y, h),
        (-x, -y, 0), (x, -y, 0), (x, y, 0), (-x, y, 0),
    ]
    f = []
    for i in range(4):
        j = (i + 1) % 4
        f += [(i, j, 4 + j, 4 + i), (4 + i, 4 + j, 8 + j, 8 + i), (8 + i, 8 + j, 12 + j, 12 + i), (12 + i, 12 + j, j, i)]
    return a.add(mesh(v, f)).bevel(bevel)


def deck(a, w, d, inset=0.2):
    """A flat roof surface facing up, with an inner ring of vertices so the parapet's contact
    shadow stays at the edge instead of dimming the whole roof."""
    xs = [-w / 2, -w / 2 + inset, w / 2 - inset, w / 2]
    ys = [-d / 2, -d / 2 + inset, d / 2 - inset, d / 2]
    verts = [(x, y, 0.0) for y in ys for x in xs]
    faces = [(j * 4 + i, j * 4 + i + 1, (j + 1) * 4 + i + 1, (j + 1) * 4 + i) for j in range(3) for i in range(3)]
    return a.add(mesh(verts, faces))


def flat_roof(a, w, d, z, kerb=0.2, t=0.12, colour=P.CONCRETE, top=None):
    """Parapet kerb and roof deck over a w by d body whose walls end at z."""
    start = len(a.pieces)
    rim(a, w, d, kerb, t, bevel=0.03).move(0, 0, z - 0.02).color(jk.shade(colour, -0.12), colour)
    deck(a, w - t * 2 + 0.02, d - t * 2 + 0.02).move(0, 0, z + kerb - 0.1).color(top or jk.mix(P.ASPHALT, P.SLATE, 0.6))
    return parts.grouped(a, start)


def tub(a, w, d, h, t=0.035, floor=0.05):
    """A balcony tray: open-topped, back edge on the wall plane y = 0, projecting to y = -d."""
    X, x = w / 2, w / 2 - t
    e = d - t
    v = [
        (-X, 0, 0), (X, 0, 0), (X, -d, 0), (-X, -d, 0),
        (-X, 0, h), (X, 0, h), (X, -d, h), (-X, -d, h),
        (-x, 0, h), (x, 0, h), (x, -e, h), (-x, -e, h),
        (-x, 0, floor), (x, 0, floor), (x, -e, floor), (-x, -e, floor),
    ]
    f = [
        (3, 2, 6, 7), (2, 1, 5, 6), (0, 3, 7, 4), (0, 1, 2, 3),
        (7, 6, 10, 11), (6, 5, 9, 10), (4, 7, 11, 8),
        (11, 10, 14, 15), (10, 9, 13, 14), (8, 11, 15, 12), (12, 15, 14, 13),
    ]
    return a.add(mesh(v, f))


def vent(a, x, y, z, r=0.075, h=0.2, colour=P.STEEL_DARK):
    """A roof ventilator: a short stack under a flat cowl."""
    a.cyl(r, h, 6, bevel=0).move(x, y, z).color(jk.shade(colour, -0.15), colour)
    a.cyl(r * 1.5, 0.035, 6, bevel=0).move(x, y, z + h).color(colour)


def aerial(a, x, y, z, h=0.6, colour=P.GUNMETAL):
    """A rooftop TV aerial: a mast with two crossbars."""
    a.tube([(x, y, z), (x, y, z + h)], 0.014, 4).color(colour)
    for k, span in ((0.78, 0.3), (0.94, 0.2)):
        a.box(span, 0.016, 0.016, bevel=0).move(x, y, z + h * k).color(colour)


def water_tank(a, r=0.3, h=0.46, legs=0.26):
    """A rooftop water tank: a staved barrel under a conical lid, on a steel stand."""
    start = len(a.pieces)
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box(0.045, 0.045, legs, bevel=0).move(sx * r * 0.7, sy * r * 0.7, 0).color(P.GUNMETAL)
    a.box(r * 1.9, r * 1.9, 0.04, bevel=0).move(0, 0, legs - 0.01).color(P.STEEL_DARK)
    z = legs + 0.03
    a.lathe([(r * 0.93, 0), (r, 0.035), (r, h - 0.02), (r * 0.95, h)], 10).move(0, 0, z).color(jk.shade(P.OAK_WOOD, -0.2), P.PINE_WOOD)
    for k in (0.24, 0.7):
        a.lathe([(r + 0.014, 0), (r + 0.014, 0.04)], 10, cap_bottom=False, cap_top=False).move(0, 0, z + h * k).color(P.GUNMETAL)
    a.cone(r + 0.055, 0.2, 10).move(0, 0, z + h - 0.01).color(jk.shade(P.SLATE, -0.1), jk.shade(P.SLATE, 0.15))
    a.tube([(r * 0.5, 0, legs), (r * 0.5, 0, 0)], 0.022, 4, caps="none").color(P.STEEL_DARK)
    return parts.grouped(a, start)


def arch_pts(half, spring, rise, n=8):
    """A round-headed opening as (x, z) points, counter-clockwise seen from the front."""
    pts = [(-half, 0.0), (half, 0.0)]
    for i in range(n + 1):
        t = math.pi * i / n
        pts.append((half * math.cos(t), spring + rise * math.sin(t)))
    return pts


def porthole(a, r, part="lit", trim=P.OFF_WHITE, proud=0.075, back=0.1, sides=12, low=P.WINDOW, high=P.LAMP, cross=False):
    """A round window facing -y, centred on the origin. The ring runs `back` into the wall and
    the pane sits proud of the wall plane, so it also seats on a curved surface."""
    start = len(a.pieces)
    glass_z = proud - 0.035
    ring = a.lathe([(r + 0.065, -back), (r + 0.065, proud), (r, proud), (r, glass_z)], sides, cap_bottom=False, cap_top=False)
    pane = disc(a, r + 0.006, sides).move(0, 0, glass_z)
    ring.rot(x=90).color(jk.shade(trim, -0.08), trim)
    pane.rot(x=90).part(part).color(low, high).no_ao()
    if cross:
        a.box(r * 2, 0.02, 0.03, bevel=0).move(0, -glass_z - 0.012, -0.015).color(trim)
        a.box(0.03, 0.02, r * 2, bevel=0).move(0, -glass_z - 0.012, -r).color(trim)
    return parts.grouped(a, start)


def flower_box(a, x, y, z, w=0.3, colour=P.LEAF):
    """A planter sat on a balcony rail: a trough and one faceted tuft of green."""
    a.box(w, 0.1, 0.07, bevel=0).move(x, y, z).color(jk.shade(P.TERRACOTTA, -0.1), P.TERRACOTTA)
    a.ico(0.075, 1).flat().scale(w / 0.17, 1.0, 0.85).move(x, y, z + 0.1).color(jk.shade(colour, -0.3), colour)


def shrub(a, x, y, r=0.2, seed=3, low=P.LEAF_DEEP, high=P.LEAF, subdiv=1):
    """One clipped garden shrub with a flat foot."""
    foot = -r * 0.5
    bush = a.blob(r, subdiv, (1, 1, 0.82), lumps=0.2, seed=seed).warp(lambda co: (co.x, co.y, max(co.z, foot)))
    return bush.move(x, y, -foot).color(low, high)


# --------------------------------------------------------------------------------------------
# Apartments
# --------------------------------------------------------------------------------------------
@asset("apartment", tint="#d9d4c8", dark=True, budget=2400,
       note="Four-storey walk-up: stair bay and entrance at the front, balconies either side, a water tank on the roof.")
def apartment(a):
    W, D, cy = 2.7, 2.6, 0.1
    hw, hd = W / 2, D / 2
    front = cy - hd
    plinth, storey, floors = 0.18, 1.0, 4
    wall = storey * floors
    top = plinth + wall
    accent = jk.mix(P.TEAL, P.SLATE, 0.35)
    n = 0

    def lit():
        nonlocal n
        n += 1
        return dict(zip(("low", "high"), warm(n * 2 + n // 3)))

    a.box(W + 0.16, D + 0.16, plinth + 0.02, bevel=0.035, grounded=True).move(0, cy, 0).color(P.STONE_DARK, P.STONE)
    # A darker ground storey under a string course, three lighter storeys above.
    a.box(W, D, storey + 0.02, bevel=0.04).move(0, cy, plinth).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.box(W, D, wall - storey, bevel=0.04).move(0, cy, plinth + storey).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(W + 0.08, D + 0.08, 0.07, bevel=0).move(0, cy, plinth + storey - 0.05).color(P.STONE, P.CREAM)

    # Stair bay: a shallow tower up the middle of the front that carries on above the roof.
    bay_w, bay_y = 0.78, front - 0.14
    a.box(bay_w, 0.3, top + 0.2, bevel=0.035, grounded=True).move(0, bay_y + 0.15, 0).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.box(bay_w - 0.06, 0.9, 0.62, bevel=0.035).move(0, bay_y + 0.03 + 0.45, top + 0.12).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.box(bay_w + 0.08, 1.04, 0.06, bevel=0.015).move(0, bay_y + 0.03 + 0.45, top + 0.72).color(P.STONE)
    for k in range(1, floors):
        put(win(a, 0.3, 0.46, **lit()), "front", 0, plinth + k * storey + 0.4, -bay_y)
    put(entrance(a, 0.5, 0.86, leaf=accent), "front", 0, 0.04, -bay_y)
    a.box(0.84, 0.26, 0.07, bevel=0.02, grounded=True).move(0, bay_y - 0.11, 0).color(P.STONE_DARK, P.STONE)
    a.box(1.0, 0.34, 0.07, bevel=0.02).move(0, bay_y - 0.15, 1.12).color(jk.shade(accent, -0.1), accent)
    for side in (-1, 1):
        a.tube([(side * 0.43, bay_y - 0.27, 0.06), (side * 0.43, bay_y - 0.27, 1.13)], 0.022, 6, caps="none").color(P.STEEL_DARK)

    # Balconies with French windows either side of the stair; plain windows at ground level.
    for side in (-1, 1):
        x = side * 0.9
        put(win(a, 0.46, 0.5, sill=True, **lit()), "front", x, plinth + 0.32, hd, cy=cy)
        for k in range(1, floors):
            z = plinth + k * storey
            put(win(a, 0.44, 0.66, **lit()), "front", x, z + 0.06, hd, cy=cy)
            tray = tub(a, 0.84, 0.3, 0.36).move(x, front, z - 0.03).color(P.OFF_WHITE)
            tray.paint(lambda f: accent if f.index == 0 else None)
            if (k + (side > 0)) % 2:
                flower_box(a, x + side * 0.2, front - 0.28, z + 0.32, 0.3, P.LEAF if k != 2 else P.LIME)

    # Side and back walls.
    for side in ("left", "right"):
        for k in range(floors):
            for u in (-0.62, 0.62):
                put(win(a, 0.42, 0.5, sill=True, **lit()), side, u, plinth + k * storey + 0.32, hw, cy=cy)
    for k in range(floors):
        for u in (-0.86, 0.0, 0.86):
            if k == 0 and u == 0.0:
                put(service_door(a, 0.34, 0.74, accent), "back", u, plinth, hd, cy=cy)
                continue
            put(win(a, 0.42, 0.5, **lit()), "back", u, plinth + k * storey + 0.32, hd, cy=cy)
    for side in (-1, 1):
        a.tube([(side * (hw - 0.14), cy + hd + 0.035, top), (side * (hw - 0.14), cy + hd + 0.035, 0.06)], 0.026, 4, caps="none").color(P.STEEL_DARK)

    # Cornice, parapet and the roof's furniture.
    a.box(W + 0.2, D + 0.2, 0.1, bevel=0.025).move(0, cy, top - 0.01).color(P.STONE, P.CREAM)
    flat_roof(a, W + 0.04, D + 0.04, top + 0.09, kerb=0.2, t=0.11, colour=P.CREAM).move(0, cy, 0)
    roof = top + 0.19
    water_tank(a).move(-0.74, cy + 0.62, roof)
    vent(a, 0.72, cy + 0.6, roof)
    aerial(a, 0.2, bay_y + 0.7, top + 0.78, 0.5)
    a.box(0.3, 0.02, 0.5, bevel=0).move(0, bay_y + 0.93 + 0.005, top + 0.19).color(accent)


@asset("apartment-wide", tint="#c9cdd2", dark=True, budget=2400,
       note="Three-storey deck-access slab: stair core at the front left, galleries to the right.")
def apartment_wide(a):
    W, D, cy = 4.56, 2.1, 0.4
    hw, hd = W / 2, D / 2
    front, back = cy - hd, cy + hd
    plinth, storey, floors = 0.16, 1.02, 3
    wall = storey * floors
    top = plinth + wall
    accent = jk.mix(P.TERRACOTTA, P.CLAY, 0.25)
    n = 0

    def lit():
        nonlocal n
        n += 1
        return dict(zip(("low", "high"), warm(n * 2 + n // 4)))

    a.box(W + 0.14, D + 0.14, plinth + 0.02, bevel=0.03, grounded=True).move(0, cy, 0).color(P.CONCRETE_DARK, P.CONCRETE)
    a.box(W, D, wall, bevel=0.04).move(0, cy, plinth).part("tint").color(P.SHADE_1, P.WHITE)

    # Stair core: taller than the slab, a full-height glazed slot over the entrance.
    core_w, core_d = 1.06, 0.74
    cx, core_y = -hw + 0.06 + core_w / 2, front - 0.64
    core_top = top + 0.56
    a.box(core_w, core_d, core_top, bevel=0.04, grounded=True).move(cx, core_y + core_d / 2, 0).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.box(core_w + 0.14, core_d + 0.14, 0.08, bevel=0.02).move(cx, core_y + core_d / 2, core_top - 0.01).color(P.CONCRETE)
    put(win(a, 0.3, 1.86, bars=4, **lit()), "front", cx, 1.3, -core_y)
    put(entrance(a, 0.52, 0.84, leaf=accent), "front", cx, 0.04, -core_y)
    a.box(0.9, 0.24, 0.07, bevel=0.02, grounded=True).move(cx, core_y - 0.1, 0).color(P.CONCRETE_DARK, P.CONCRETE)
    a.box(1.14, 0.3, 0.07, bevel=0.02).move(cx, core_y - 0.13, 1.08).color(P.CONCRETE)

    # Access galleries on the upper floors, from the core to the far end of the slab.
    g0, g1 = cx + core_w / 2, hw
    gx, gw, gd = (g0 + g1) / 2, g1 - g0, 0.36
    for k in range(1, floors):
        z = plinth + k * storey
        a.box(gw, gd, 0.07, bevel=0).move(gx, front - gd / 2, z - 0.07).color(P.CONCRETE_DARK, P.CONCRETE)
        a.box(gw + 0.02, 0.05, 0.36, bevel=0.012).move(gx + 0.01, front - gd + 0.01, z - 0.09).color(jk.shade(P.OFF_WHITE, -0.06), P.OFF_WHITE)
        a.box(0.05, gd, 0.36, bevel=0).move(g1 - 0.015, front - gd / 2, z - 0.09).color(P.OFF_WHITE)
    for x in (g0 + gw * 0.34, g0 + gw * 0.67, g1 - 0.05):
        a.box(0.07, 0.07, top - 0.02, bevel=0, grounded=True).move(x, front - gd + 0.07, 0).color(P.CONCRETE_DARK, P.CONCRETE)
    a.box(gw + 0.06, gd + 0.1, 0.08, bevel=0.02, grounded=True).move(gx + 0.03, front - gd / 2 - 0.02, 0).color(P.CONCRETE_DARK, P.CONCRETE)
    flower_box(a, g0 + 0.5, front - gd + 0.03, plinth + storey + 0.26, 0.34)
    flower_box(a, g1 - 0.6, front - gd + 0.03, plinth + 2 * storey + 0.26, 0.34, P.LIME)
    flower_box(a, gx + 0.2, front - gd + 0.03, plinth + storey + 0.26, 0.3, P.LIME)

    # Three flats a floor: a front door and a window each.
    for k in range(floors):
        z = plinth + k * storey
        for i in range(3):
            x = g0 + gw * (i + 0.5) / 3
            door = parts.frame(0.3, 0.72, 0.04, 0.045, recess=0.03)
            put(a.add(door).color(P.OFF_WHITE), "front", x - 0.27, z + 0.0, hd, cy=cy)
            put(quad(a, 0.31, 0.73).color(jk.shade(accent, -0.12), accent), "front", x - 0.27, z + 0.035, hd + 0.015, cy=cy)
            put(win(a, 0.4, 0.42, **lit()), "front", x + 0.25, z + 0.36, hd, cy=cy)

    # Back and end walls.
    for k in range(floors):
        z = plinth + k * storey + 0.32
        for u in (-1.82, -0.91, 0.0, 0.91, 1.82):
            if k == 0 and u == 0.0:
                put(service_door(a, 0.36, 0.76, accent), "back", u, plinth, hd, cy=cy)
                continue
            put(win(a, 0.48, 0.5, **lit()), "back", u, z, hd, cy=cy)
        put(win(a, 0.46, 0.5, sill=True, **lit()), "right", 0.0, z, hw, cy=cy)
        put(win(a, 0.42, 0.5, sill=True, **lit()), "left", -0.3, z, hw, cy=cy)

    for x in (-1.36, 1.36):
        a.tube([(x, back + 0.035, top), (x, back + 0.035, 0.06)], 0.028, 4, caps="none").color(P.STEEL_DARK)

    # Roof: one slab that also shelters the top gallery.
    rw, r0, r1 = W + 0.2, front - gd - 0.06, back + 0.08
    a.box(rw, r1 - r0, 0.1, bevel=0.03).move(0, (r0 + r1) / 2, top - 0.01).color(P.CONCRETE_DARK, P.CONCRETE)
    flat_roof(a, rw - 0.12, r1 - r0 - 0.12, top + 0.09, kerb=0.14, t=0.1).move(0, (r0 + r1) / 2, 0)
    roof = top + 0.13
    for x in (0.1, 1.0, 1.9):
        vent(a, x, cy + 0.62, roof)
    # A long rooflight over the corridor side.
    a.box(2.5, 0.5, 0.08, bevel=0).move(0.95, cy - 0.3, roof - 0.01).color(P.CONCRETE)
    a.profile_x([(-0.21, 0.0), (0.21, 0.0), (0.0, 0.15)], 2.4, bevel=0).move(0.95, cy - 0.3, roof + 0.06).part("glass").color(P.GLASS_TINTED, P.GLASS)


# --------------------------------------------------------------------------------------------
# S1 state allocation blocks
# --------------------------------------------------------------------------------------------
def state_block(a, storeys, tall):
    """One prefabricated system, any height: a strict grid of identical cells."""
    W = 2.72
    half = W / 2
    plinth, storey = 0.2, 0.96
    wall = storeys * storey
    top = plinth + wall
    front = -half
    a.box(W + 0.16, W + 0.16, plinth + 0.02, bevel=0.035, grounded=True).color(P.CONCRETE_DARK, jk.shade(P.CONCRETE_DARK, 0.18))

    bays = (-0.86, 0.0, 0.86)
    ww, wh, sill = 0.5, 0.46, 0.3

    def grid(door=False):
        rects = []
        for k in range(storeys):
            for i, x in enumerate(bays):
                if door and k == 0 and i == 1:
                    rects.append((x - 0.29, x + 0.29, 0.0, 0.84, None))
                else:
                    z = k * storey + sill
                    rects.append((x - ww / 2, x + ww / 2, z, z + wh))
        return rects

    shell(
        a, W, W, wall, {"front": grid(True), "right": grid(), "back": grid(), "left": grid()},
        chamfer=0.05, reveal=0.09, low=P.SHADE_2, high=P.SHADE_1, inner=P.SHADE_3,
    ).move(0, 0, plinth)

    # The precast frame: floor edges and cross-wall ends stand proud of the infill panels.
    for k in range(1, storeys):
        a.box(W + 0.07, W + 0.07, 0.08, bevel=0).move(0, 0, plinth + k * storey - 0.04).part("tint").color(P.WHITE)
    for side in SIDES:
        for u in (-0.43, 0.43):
            put(a.box(0.1, 0.1, wall, bevel=0).part("tint").color(P.SHADE_1, P.WHITE), side, u, plinth, half)

    # Roof: kerb, deck, stair head and a rank of identical ventilators.
    flat_roof(a, W + 0.18, W + 0.18, top, kerb=0.2, t=0.12)
    roof = top + 0.1
    head = 0.5 if tall else 0.38
    a.box(0.86, 0.7, head, bevel=0.03).move(-0.5, 0.46, roof - 0.02).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.box(0.98, 0.82, 0.05, bevel=0.012).move(-0.5, 0.46, roof + head - 0.03).color(P.CONCRETE_DARK, P.CONCRETE)
    a.box(0.26, 0.02, 0.3, bevel=0).move(-0.5, 0.46 - 0.35 - 0.01, roof).color(P.GUNMETAL)
    for y in (-0.2, 0.3, 0.8):
        vent(a, 0.7, y, roof)
    # The state's voice: a pair of loudspeaker horns over the entrance corner.
    mx, my = 0.86, -0.86
    a.tube([(mx, my, roof - 0.02), (mx, my, roof + 0.4)], 0.022, 5).color(P.GUNMETAL)
    a.box(0.07, 0.07, 0.05, bevel=0).move(mx, my, roof + 0.3).color(P.GUNMETAL)
    for az in (-35, 55):
        horn = a.cone(0.085, 0.17, 6).rot(x=-90).move(0, -0.2, 0)
        horn.color(P.STEEL_DARK, P.STEEL).paint_side(P.INK, (0, -1, 0))
        horn.rot(z=az).move(mx, my, roof + 0.33)

    # Entrance: a steel door under a thin cantilevered slab, one status light.
    a.box(0.62, 0.03, 0.86, bevel=0).move(0, front + 0.105, plinth).color(jk.shade(P.GUNMETAL, -0.15), P.GUNMETAL)
    quad(a, 0.07, 0.3).move(0.13, front + 0.075, plinth + 0.42).part("lit").color(P.WINDOW, P.LAMP).no_ao()
    a.box(0.96, 0.3, 0.07, bevel=0.02).move(0, front - 0.13, plinth + 0.9).color(P.CONCRETE_DARK, P.CONCRETE)
    for side in (-1, 1):
        a.box(0.06, 0.2, 0.14, bevel=0).move(side * 0.36, front - 0.1, plinth + 0.77).color(P.CONCRETE_DARK)
    a.box(0.8, 0.22, 0.1, bevel=0.02, grounded=True).move(0, front - 0.18, 0).color(P.CONCRETE_DARK, jk.shade(P.CONCRETE_DARK, 0.18))
    a.box(0.09, 0.03, 0.05, bevel=0).move(0, front - 0.29, plinth + 0.91).part("lit").color(P.GLOW_RED)


@asset("block", tint="#9a9ca1", dark=True, budget=2400,
       note="S1 state allocation block, three storeys of the standard prefabricated cell.")
def block(a):
    state_block(a, 3, False)


@asset("block-tall", tint="#8d9096", dark=True, budget=2400,
       note="S1 state allocation block, six storeys of the same cell.")
def block_tall(a):
    state_block(a, 6, True)


# --------------------------------------------------------------------------------------------
# S6 worker housing
# --------------------------------------------------------------------------------------------
@asset("worker-block", tint="#7d8894", budget=2400,
       note="S6 modular worker housing: stacked units, a steel gallery and stair, service pipes on the roof.")
def worker_block(a):
    mw, mh, md, gap = 0.94, 1.04, 1.5, 0.035
    skid = 0.14
    shift = -0.17  # the stair at the right end keeps the whole model centred
    x0 = shift - (4 * mw + 3 * gap) / 2
    y_front, y_back = -0.56, -0.56 + md
    cy = (y_front + y_back) / 2
    hazard = jk.mix(P.ORANGE, P.RUST, 0.35)
    frame = jk.shade(P.GUNMETAL, 0.05)
    right = x0 + 4 * mw + 3 * gap

    a.box(right - x0 - 0.06, md - 0.1, skid + 0.02, bevel=0.02, grounded=True).move((x0 + right) / 2, cy, 0).color(P.INK, P.GUNMETAL)
    lit_units = {(0, 1), (1, 3), (1, 0)}
    for r in range(2):
        for c in range(4):
            x = x0 + mw / 2 + c * (mw + gap)
            z = skid + r * (mh + gap)
            low, high = (P.SHADE_1, P.WHITE) if (r + c) % 2 == 0 else (P.SHADE_2, P.SHADE_1)
            a.box(mw, md, mh, bevel=0.035).move(x, cy, z).part("tint").color(low, high)
            # Front: a hazard-painted door and one window per unit.
            a.box(0.3, 0.03, 0.74, bevel=0).move(x - 0.24, y_front - 0.012, z + 0.07).color(jk.shade(hazard, -0.15), hazard)
            quad(a, 0.13, 0.16).move(x - 0.24, y_front - 0.03, z + 0.52).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED).no_ao()
            glazing = dict(part="lit", low=P.WINDOW, high=P.LAMP) if (r, c) in lit_units else dict(part="glass", low=P.GLASS_DARK, high=P.GLASS_TINTED)
            win(a, 0.34, 0.34, trim=frame, **glazing).move(x + 0.2, y_front, z + 0.44)
            # Back: a window and a louvred service hatch.
            back = dict(part="lit", low=P.WINDOW, high=P.LAMP) if (r, c) in {(0, 2), (1, 1)} else dict(part="glass", low=P.GLASS_DARK, high=P.GLASS_TINTED)
            put(win(a, 0.34, 0.3, trim=frame, **back), "back", -(x - 0.16), z + 0.5, y_back)
            a.box(0.24, 0.05, 0.2, bevel=0).move(x + 0.24, y_back + 0.02, z + 0.14).color(P.GUNMETAL, P.STEEL_DARK)

    for r in range(2):
        z = skid + r * (mh + gap) + 0.5
        glazing = dict(part="lit", low=P.WINDOW, high=P.LAMP) if r == 0 else dict(part="glass", low=P.GLASS_DARK, high=P.GLASS_TINTED)
        put(win(a, 0.44, 0.3, trim=frame, **glazing), "left", -cy, z, -x0)
    put(win(a, 0.44, 0.3, trim=frame, part="glass", low=P.GLASS_DARK, high=P.GLASS_TINTED), "right", cy + 0.2, skid + mh + gap + 0.5, right)

    # Gallery and stair to the upper units.
    gz = skid + mh + gap / 2
    gy = y_front - 0.36
    stair_w = 0.32
    g1 = right + stair_w + 0.02
    a.box(g1 - x0, 0.36, 0.045, bevel=0).move((x0 + g1) / 2, y_front - 0.18, gz - 0.045).color(P.GUNMETAL, P.STEEL_DARK)
    posts = [x0 + 0.03 + i * (right - x0 - 0.06) / 4 for i in range(5)]
    for x in posts:
        a.box(0.04, 0.04, gz + 0.4, bevel=0, grounded=True).move(x, gy + 0.03, 0).color(P.GUNMETAL, P.STEEL_DARK)
    for dz in (0.2, 0.4):
        a.tube([(x0 + 0.03, gy + 0.03, gz + dz), (g1 - 0.02, gy + 0.03, gz + dz)], 0.016, 4).color(P.STEEL_DARK)
    a.box(0.04, 0.04, gz + 0.4, bevel=0, grounded=True).move(g1 - 0.02, gy + 0.03, 0).color(P.GUNMETAL, P.STEEL_DARK)
    # Ship's-ladder stair up the right end, rising toward the front.
    steps, run = 6, 0.19
    rise = gz / steps
    sy0 = y_front + (steps - 1) * run
    outline = [(sy0 + run, 0.0)]
    for i in range(steps):
        outline += [(sy0 - (i - 1) * run, (i + 1) * rise), (sy0 - i * run, (i + 1) * rise)]
    outline += [(y_front, gz - 0.13), (sy0 + run - 0.16, 0.0)]
    a.profile_x(outline, stair_w, bevel=0).move(right + 0.02 + stair_w / 2, 0, 0).color(P.GUNMETAL, P.STEEL_DARK)
    a.tube([(g1 - 0.02, sy0 + run, 0.42), (g1 - 0.02, y_front + 0.02, gz + 0.4), (g1 - 0.02, gy + 0.03, gz + 0.4)], 0.016, 4).color(P.STEEL_DARK)

    # Services: an insulated header along the roof with a drop to every stack, a gas line,
    # an air handler, a receiver tank and a warning beacon.
    top = skid + 2 * mh + gap
    hy, hz = y_back - 0.26, top + 0.13
    a.tube([(right - 0.1, hy, hz), (x0 - 0.1, hy, hz), (x0 - 0.1, hy, 0.02)], 0.07, 8).part("metal").color(P.STEEL, P.CHROME)
    for c in range(4):
        x = x0 + mw / 2 + c * (mw + gap)
        a.box(0.2, 0.1, 0.07, bevel=0).move(x - 0.3, hy, top - 0.01).color(P.GUNMETAL)
        a.tube([(x + 0.3, hy, hz), (x + 0.3, y_back + 0.06, hz), (x + 0.3, y_back + 0.06, skid + 0.5)], 0.035, 6).part("metal").color(P.STEEL, P.CHROME)
    a.tube([(right - 0.1, hy - 0.16, top + 0.06), (x0 + 0.2, hy - 0.16, top + 0.06)], 0.028, 5).color(jk.shade(hazard, -0.1), hazard)
    ax = x0 + 0.62
    a.box(0.7, 0.56, 0.3, bevel=0.03).move(ax, cy - 0.28, top - 0.01).color(P.STEEL_DARK, P.STEEL)
    a.cyl(0.2, 0.05, 10, bevel=0.012).move(ax, cy - 0.28, top + 0.28).color(P.GUNMETAL)
    tx = x0 + 2.3
    a.lathe([(0, 0), (0.15, 0.05), (0.2, 0.16), (0.2, 0.74), (0.15, 0.85), (0, 0.9)], 10).rot(y=90).move(tx - 0.45, cy - 0.3, top + 0.26).part("metal").color(P.STEEL, P.CHROME)
    for dx in (-0.25, 0.25):
        a.box(0.07, 0.34, 0.1, bevel=0).move(tx + dx, cy - 0.3, top - 0.01).color(P.GUNMETAL)
    bx = right - 0.3
    a.tube([(bx, cy - 0.3, top), (bx, cy - 0.3, top + 0.34)], 0.022, 5).color(P.GUNMETAL)
    a.cyl(0.055, 0.09, 8, bevel=0.015).move(bx, cy - 0.3, top + 0.34).part("glow").color(P.GLOW_ORANGE)


# --------------------------------------------------------------------------------------------
# Towers
# --------------------------------------------------------------------------------------------
@asset("tower", tint="#c9ccd2", dark=True, budget=2400,
       note="Stepped office tower: podium, two setbacks, a lantern crown under a patinated roof and a mast.")
def tower(a):
    patina = jk.mix(P.SAGE, P.TEAL, 0.45)
    a.box(3.2, 3.2, 0.14, bevel=0.035, grounded=True).color(P.STONE_DARK, P.STONE)

    # Podium: shopfront windows and a tall glazed portal.
    pw, ph, z = 3.0, 1.26, 0.12
    shops = [(-0.95 - 0.3, -0.95 + 0.3, 0.3, 0.92), (-0.3, 0.3, 0.3, 0.92), (0.95 - 0.3, 0.95 + 0.3, 0.3, 0.92)]
    portal = [(-1.05 - 0.26, -1.05 + 0.26, 0.3, 0.92), (-0.44, 0.44, 0.0, 1.0), (1.05 - 0.26, 1.05 + 0.26, 0.3, 0.92)]
    shell(a, pw, pw, ph, {"front": portal, "right": shops, "back": shops, "left": shops}, chamfer=0.06, reveal=0.09,
          low=P.SHADE_2, high=P.SHADE_1, inner=P.SHADE_3).move(0, 0, z)
    front = -pw / 2
    for x in (-0.15, 0.15):
        a.box(0.03, 0.03, 1.0, bevel=0).move(x, front + 0.07, z).color(P.BRASS)
    a.box(0.88, 0.03, 0.04, bevel=0).move(0, front + 0.07, z + 0.74).color(P.BRASS)
    a.box(1.24, 0.34, 0.07, bevel=0.02).move(0, front - 0.13, z + 1.02).color(jk.shade(P.BRASS, -0.15), P.BRASS)
    a.box(1.0, 0.2, 0.06, bevel=0.015, grounded=True).move(0, front - 0.18, 0.1).color(P.STONE)
    z += ph
    a.box(pw + 0.14, pw + 0.14, 0.13, bevel=0.03).move(0, 0, z - 0.01).part("tint").color(P.SHADE_1, P.WHITE)
    z += 0.12

    def tier(w, h, slots, slot_w, floors, zb, crown=False):
        pitch = w / (slots + 0.55)
        rects = [((i - (slots - 1) / 2) * pitch - slot_w / 2, (i - (slots - 1) / 2) * pitch + slot_w / 2, 0.16, h - 0.14) for i in range(slots)]
        tone = (lambda s_, n_: (P.LAMP, P.GLOW_WHITE)) if crown else None
        shell(a, w, w, h, {s: rects for s in SIDES}, chamfer=0.06, reveal=0.1, low=P.SHADE_1, high=P.WHITE, inner=P.SHADE_3, tone=tone).move(0, 0, zb)
        span = h - 0.3
        for k in range(1, floors):
            a.box(w - 0.07, w - 0.07, 0.2, bevel=0).move(0, 0, zb + 0.16 + span * k / floors - 0.1).part("tint").color(P.SHADE_3, P.SHADE_2)

    # Two shafts of vertical piers and window strips, each set back from the one below.
    tier(2.52, 3.9, 4, 0.3, 4, z)
    z += 3.9
    a.box(2.66, 2.66, 0.12, bevel=0.03).move(0, 0, z - 0.01).part("tint").color(P.SHADE_1, P.WHITE)
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box(0.26, 0.26, 0.5, bevel=0.025, taper=0.6).move(sx * 1.14, sy * 1.14, z + 0.08).part("tint").color(P.SHADE_1, P.WHITE)
    z += 0.1
    tier(1.92, 1.84, 3, 0.3, 2, z)
    z += 1.84
    a.box(2.06, 2.06, 0.12, bevel=0.03).move(0, 0, z - 0.01).part("tint").color(P.SHADE_1, P.WHITE)
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box(0.2, 0.2, 0.36, bevel=0.02, taper=0.6).move(sx * 0.86, sy * 0.86, z + 0.08).part("tint").color(P.SHADE_1, P.WHITE)
    z += 0.1

    # Crown: a lit lantern, a patinated roof, a mast and its beacon.
    tier(1.3, 0.64, 2, 0.3, 1, z, crown=True)
    z += 0.64
    a.box(1.44, 1.44, 0.1, bevel=0.025).move(0, 0, z - 0.01).part("tint").color(P.WHITE)
    a.box(1.3, 1.3, 0.5, bevel=0.02, taper=0.3).move(0, 0, z + 0.07).color(jk.shade(patina, -0.2), patina)
    z += 0.55
    a.cyl(0.11, 0.1, 8, bevel=0.02).move(0, 0, z - 0.02).part("metal").color(P.CHROME)
    a.tube([(0, 0, z), (0, 0, z + 0.5), (0, 0, 8.93)], [0.045, 0.028, 0.014], 6).part("metal").color(P.CHROME)
    a.sphere(0.05, 8, 4).move(0, 0, 8.95).part("lit").color(P.GLOW_RED)


@asset("skyscraper", tint="#8fb4d0", dark=True, budget=2400,
       note="Slim curtain-wall tower: lit lobby, banded glass shaft with metal mullions, a halo crown and spire.")
def skyscraper(a):
    a.box(3.6, 3.6, 0.14, bevel=0.035, grounded=True).color(P.STONE_DARK, P.STONE)

    # Lobby: a glazed double-height base between frame piers.
    lw, lh, z = 2.96, 1.24, 0.12
    bays = [(x - 0.37, x + 0.37, 0.06, 1.02) for x in (-0.92, 0.0, 0.92)]
    shell(a, lw, lw, lh, {s: bays for s in SIDES}, chamfer=0.07, reveal=0.1, low=P.SHADE_2, high=P.SHADE_1, inner=P.SHADE_3,
          tone=lambda s_, n_: (P.WINDOW, P.GLOW_WHITE)).move(0, 0, z)
    front = -lw / 2
    for x in (-0.18, 0.18):
        a.box(0.03, 0.03, 0.96, bevel=0).move(x, front + 0.08, z + 0.06).part("metal").color(P.CHROME)
    a.box(1.2, 0.36, 0.06, bevel=0.018).move(0, front - 0.14, z + 1.06).part("metal").color(P.STEEL, P.CHROME)
    z += lh

    # Shaft: tinted spandrel bands, glass between them, metal mullions on every bay line.
    sw, floors, pitch, band = 3.2, 8, 0.98, 0.24
    a.box(sw + 0.1, sw + 0.1, 0.14, bevel=0.03).move(0, 0, z - 0.01).part("tint").color(P.SHADE_1, P.WHITE)
    z += 0.12
    sh = floors * pitch + 0.2
    edge = sw / 2 - 0.13
    rows = [(-edge, edge, k * pitch + band, (k + 1) * pitch, None) for k in range(floors)]
    reveal = 0.08
    shell(a, sw, sw, sh, {s: rows for s in SIDES}, chamfer=0.07, reveal=reveal, low=P.SHADE_1, high=P.WHITE, inner=P.SHADE_2).move(0, 0, z)
    panes = Panes()
    bay = edge * 2 / 4
    yb = -sw / 2 + reveal
    for s, side in enumerate(SIDES):
        for k in range(floors):
            for i in range(4):
                u0, u1 = -edge + i * bay, -edge + (i + 1) * bay
                z0, z1 = z + k * pitch + band, z + (k + 1) * pitch
                corners = [turn(side, u0 - 0.01, yb, z0 - 0.01), turn(side, u1 + 0.01, yb, z0 - 0.01),
                           turn(side, u1 + 0.01, yb, z1 + 0.01), turn(side, u0 - 0.01, yb, z1 + 0.01)]
                if a.rand.random() < 0.46:
                    panes.add("lit", corners, *warm(s + k * 3 + i))
                else:
                    panes.add("glass", corners, P.GLASS_DARK, P.GLASS_TINTED)
    panes.emit(a)
    for side in SIDES:
        for u in (-bay, 0.0, bay):
            put(a.box(0.05, 0.09, sh - 0.04, bevel=0).part("metal").color(P.STEEL, P.CHROME), side, u, z + 0.02, sw / 2)
    z += sh

    # Crown: a lit halo under a floating cap, a stepped block and the spire.
    a.box(sw + 0.1, sw + 0.1, 0.14, bevel=0.03).move(0, 0, z - 0.01).part("tint").color(P.SHADE_1, P.WHITE)
    z += 0.12
    a.box(2.5, 2.5, 0.3, bevel=0).move(0, 0, z - 0.01).part("lit").color(P.LAMP, P.GLOW_WHITE).no_ao()
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box(0.16, 0.16, 0.3, bevel=0).move(sx * 1.2, sy * 1.2, z - 0.01).part("metal").color(P.CHROME)
    z += 0.28
    a.box(2.9, 2.9, 0.16, bevel=0.035).move(0, 0, z).part("tint").color(P.SHADE_1, P.WHITE)
    z += 0.15
    slots = [(-0.66, -0.1, 0.09, 0.5), (0.1, 0.66, 0.09, 0.5)]
    shell(a, 1.84, 1.84, 0.6, {s: slots for s in SIDES}, chamfer=0.05, reveal=0.07, low=P.SHADE_2, high=P.SHADE_1, inner=P.SHADE_3,
          tone=lambda s_, n_: (P.LAMP, P.GLOW_WHITE)).move(0, 0, z)
    z += 0.6
    a.box(1.98, 1.98, 0.09, bevel=0.02).move(0, 0, z - 0.01).part("metal").color(P.STEEL, P.CHROME)
    z += 0.07
    a.box(1.5, 1.5, 0.4, bevel=0.03, taper=0.36).move(0, 0, z).part("metal").color(P.STEEL, P.CHROME)
    z += 0.38
    a.tube([(0, 0, z), (0, 0, z + 0.5), (0, 0, 11.96)], [0.07, 0.04, 0.012], 6).part("metal").color(P.CHROME)


# --------------------------------------------------------------------------------------------
# The hopeful futures
# --------------------------------------------------------------------------------------------
@asset("dome-house", tint="#f2efe6", dark=True, budget=1500,
       note="S3 garden-town dwelling: a smooth shell dome, arched porch, round windows and a skylight.")
def dome_house(a):
    R, H, z0 = 1.3, 1.34, 0.1

    def on_dome(g, az, z, sink=0.0):
        phi = math.asin((z - z0) / H)
        r = R * math.cos(phi)
        tilt = math.degrees(math.atan2(math.sin(phi) / H, math.cos(phi) / R))
        return g.rot(x=-tilt).move(0, -(r - sink), z).rot(z=az)

    a.cyl(1.42, z0 + 0.02, 20, bevel=0.03, grounded=True).color(P.STONE_DARK, P.STONE)
    a.dome(R, H, 20, 6).move(0, 0, z0).part("tint").color(P.SHADE_1, P.WHITE)
    a.lathe([(R + 0.05, 0), (R + 0.05, 0.15), (R - 0.02, 0.22)], 20, cap_bottom=False, cap_top=False).move(0, 0, z0).part("tint").color(P.SHADE_2, P.SHADE_1)

    # Arched porch with a round-headed door.
    py = -1.09
    a.profile_y(arch_pts(0.42, 0.55, 0.36), 0.62, bevel=0.03).move(0, py, z0).part("tint").color(P.SHADE_1, P.WHITE)
    a.profile_y(arch_pts(0.47, 0.57, 0.39), 0.07, bevel=0.015).move(0, py - 0.33, z0).color(P.STONE, P.OFF_WHITE)
    a.profile_y(arch_pts(0.29, 0.5, 0.25), 0.04, bevel=0.01).move(0, py - 0.37, z0 + 0.02).color(jk.shade(P.WALNUT, -0.1), P.OAK_WOOD)
    disc(a, 0.085, 10).rot(x=90).move(0, py - 0.395, z0 + 0.56).part("lit").color(P.WINDOW).no_ao()
    a.sphere(0.026, 6, 4).move(0.2, py - 0.4, z0 + 0.36).part("metal").color(P.BRASS)
    a.box(0.86, 0.22, 0.07, bevel=0.02, grounded=True).move(0, py - 0.41, 0).color(P.STONE_DARK, P.STONE)

    # A big picture window toward the garden, portholes round the back.
    on_dome(porthole(a, 0.3, sides=14, cross=True), 50, 0.64)
    on_dome(porthole(a, 0.17), -48, 0.62)
    on_dome(porthole(a, 0.17), 128, 0.62)
    on_dome(porthole(a, 0.17), -128, 0.62)

    # Skylight at the crown, a flue on the back slope.
    top = z0 + H
    a.lathe([(0.37, -0.1), (0.37, 0.035), (0.3, 0.045), (0.28, 0.0)], 14, cap_bottom=False, cap_top=False).move(0, 0, top).part("metal").color(P.STEEL, P.CHROME)
    a.dome(0.29, 0.15, 14, 3).move(0, 0, top + 0.02).part("glass").color(P.GLASS_TINTED, P.GLASS)
    fx, fy = -0.42, 0.62
    a.cyl(0.055, 0.5, 8, bevel=0.01).move(fx, fy, 1.06).part("metal").color(P.STEEL, P.CHROME)
    a.cone(0.1, 0.07, 8).move(fx, fy, 1.57).color(P.STEEL_DARK)

    shrub(a, -0.82, -1.0, 0.2, seed=4, subdiv=2).move(0, 0, z0)
    shrub(a, -1.04, -0.72, 0.15, seed=8).move(0, 0, z0)


@asset("eco-dome", tint="#e8dcc4", budget=1500,
       note="S5/S10 earth-sheltered home: a rammed-earth wall under a turf dome that runs to the ground behind.")
def eco_dome(a):
    wall_r, wall_h = 1.4, 0.78
    a.lathe([(wall_r + 0.05, 0), (wall_r, wall_h)], 16, cap_bottom=False, cap_top=False, turn=math.radians(11.25)).part("tint").color(P.SHADE_1, P.WHITE)

    # Turf: a dome with an eave at the front that becomes a grassed bank round the back.
    profile = [(1.6, 0.0), (1.62, 0.34), (1.57, 0.72), (1.46, 0.95), (1.28, 1.22), (0.95, 1.48), (0.5, 1.66), (0.0, 1.72)]
    turf = a.lathe(profile, 18, cap_bottom=False, turn=math.radians(10))

    def front_weight(co):
        """1 where the wall shows (the front), 0 where the bank reaches the ground."""
        ang = abs(math.degrees(math.atan2(co.x, -co.y)))
        t = min(1.0, max(0.0, (100 - ang) / 42))
        return t * t * (3 - 2 * t)

    def shape(co):
        r = math.hypot(co.x, co.y)
        if r < 1e-6:
            return co
        f = front_weight(co)
        ang = abs(math.degrees(math.atan2(co.x, -co.y)))
        tr, tz = r, co.z
        if co.z < 0.01:
            tr, tz = 1.34, 0.68
        elif co.z < 0.35:
            tr, tz = 1.6, 0.61
        nr, nz = r + (tr - r) * f, co.z + (tz - co.z) * f
        if ang < 5 and co.z < 0.73:
            nr = 1.22  # the eave gives way to the door hood
        return (co.x / r * nr, co.y / r * nr, nz)

    turf.warp(shape)

    def rough(co):
        if co.z < 0.02:
            return co
        n = jk._noise.noise(Vector((co.x * 1.7 + 3.1, co.y * 1.7 - 1.3, co.z * 1.7 + 0.4)))
        r = math.hypot(co.x, co.y)
        return (co.x * (1 + n * 0.03), co.y * (1 + n * 0.03), co.z + n * 0.035 * min(1.0, r))

    turf.warp(rough).flat().color(jk.shade(P.LEAF_DEEP, 0.05), jk.mix(P.LEAF, P.LIME, 0.35))

    def roof_z(r):
        for (r0, za), (r1, zb) in zip(profile[2:], profile[3:]):
            if r1 <= r <= r0:
                return za + (zb - za) * (r0 - r) / (r0 - r1)
        return 1.72

    # Timber door hood through the eave, plank door, stone step.
    fy = -1.3
    for side in (-1, 1):
        a.box(0.13, 0.34, 0.9, bevel=0.02, grounded=True).move(side * 0.37, fy - 0.17, 0).color(jk.shade(P.OAK_WOOD, -0.15), P.OAK_WOOD)
    a.box(1.02, 0.4, 0.13, bevel=0.025).move(0, fy - 0.18, 0.86).color(P.OAK_WOOD, P.PINE_WOOD)
    a.box(0.64, 0.04, 0.88, bevel=0).move(0, fy - 0.2, 0).color(jk.shade(P.WALNUT, -0.1), P.WALNUT)
    for x in (-0.16, 0.0, 0.16):
        a.box(0.012, 0.012, 0.84, bevel=0).move(x + 0.08, fy - 0.222, 0.02).color(P.BARK_DARK)
    disc(a, 0.085, 10).rot(x=90).move(-0.08, fy - 0.225, 0.6).part("glass").color(P.GLASS_TINTED, P.GLASS).no_ao()
    a.sphere(0.028, 6, 4).move(0.2, fy - 0.235, 0.42).part("metal").color(P.BRASS)
    a.box(0.8, 0.16, 0.06, bevel=0.02, grounded=True).move(0, fy - 0.4, 0).color(P.STONE_DARK, P.STONE)

    # Timber-framed windows in the wall, a pair to the right and one to the left.
    for az in (45.0, 67.5, -45.0):
        g = win(a, 0.38, 0.34, trim=P.OAK_WOOD, sill=True, part="glass", low=P.GLASS_TINTED, high=P.GLASS, posts=1)
        g.move(0, -(wall_r + 0.025) * math.cos(math.radians(11.25)) + 0.01, 0.16).rot(z=az)
    # A bench under the eave beside the door.
    with a.group() as bench:
        a.box(0.5, 0.16, 0.035, bevel=0).move(0, 0, 0.19).color(P.PINE_WOOD)
        for side in (-1, 1):
            a.box(0.04, 0.14, 0.19, bevel=0).move(side * 0.2, 0, 0).color(P.OAK_WOOD)
    bench.move(0, -(wall_r + 0.13), 0).rot(z=-22.5)

    # Roof light, clay flue, flowers in the turf and a shrub on the bank.
    def on_roof(g, az, r, lift=0.0):
        r2 = r - 0.1
        slope = math.degrees(math.atan2(roof_z(r2) - roof_z(r), 0.1))
        return g.rot(x=slope).move(0, -r, roof_z(r) + lift).rot(z=az)

    def roof_light(r, sides):
        with a.group() as light:
            a.lathe([(r + 0.07, -0.08), (r + 0.07, 0.05), (r + 0.01, 0.06), (r - 0.01, 0.0)], sides, cap_bottom=False, cap_top=False).color(
                jk.shade(P.OAK_WOOD, -0.1), P.PINE_WOOD
            )
            a.dome(r, r * 0.52, sides, 3).move(0, 0, 0.03).part("glass").color(P.GLASS_TINTED, P.GLASS)
        return light

    on_roof(roof_light(0.23, 12), 28, 0.78, 0.02)
    on_roof(roof_light(0.15, 10), 196, 0.98, 0.02)
    cxy = (-0.5, 0.7)
    cz = roof_z(math.hypot(*cxy)) - 0.08
    a.cyl(0.085, 0.36, 8, r2=0.07, bevel=0.012).move(cxy[0], cxy[1], cz).color(jk.shade(P.TERRACOTTA, -0.15), P.TERRACOTTA)
    a.cone(0.13, 0.08, 8).move(cxy[0], cxy[1], cz + 0.38).color(P.CLAY)
    blooms = (
        (-58, 1.1, P.YELLOW), (-50, 1.2, P.OFF_WHITE), (-22, 0.52, P.OFF_WHITE), (-14, 0.62, P.PINK),
        (72, 1.16, P.PINK), (80, 1.26, P.YELLOW), (116, 0.7, P.YELLOW), (126, 0.8, P.OFF_WHITE),
        (168, 1.28, P.OFF_WHITE), (160, 1.38, P.PINK), (-122, 1.04, P.PINK), (-132, 1.14, P.YELLOW),
        (-162, 0.42, P.YELLOW),
    )
    for az, r, colour in blooms:
        on_roof(a.ico(0.055, 1).flat().color(colour), az, r, 0.035)
    shrub(a, -0.98, -1.32, 0.2, seed=5, low=P.LEAF_DEEP, high=P.MOSS, subdiv=2)
    shrub(a, 1.5, -0.6, 0.17, seed=9, low=P.LEAF_DEEP, high=P.MOSS)
    shrub(a, 1.05, 1.32, 0.21, seed=12, low=P.LEAF_DEEP, high=P.MOSS)
    shrub(a, -1.4, 0.84, 0.16, seed=14, low=P.LEAF_DEEP, high=P.MOSS)


@asset("solar-house", tint="#f6f4ee", dark=True, budget=1500,
       note="S3/S10 mono-pitch house: the whole roof is a solar array facing the front; timber deck and rain barrel.")
def solar_house(a):
    W = 2.7
    y0, y1 = -0.72, 1.14
    base = 0.14
    lo_z, hi_z = 1.62, 2.72
    a.box(W + 0.14, y1 - y0 + 0.14, base + 0.02, bevel=0.03, grounded=True).move(0, (y0 + y1) / 2, 0).color(P.CONCRETE_DARK, P.CONCRETE)
    a.profile_x([(y0, base), (y1, base), (y1, hi_z), (y0, lo_z)], W, bevel=0.035).part("tint").color(P.SHADE_1, P.WHITE)

    # Roof slab on the slope, with the array on top.
    slope = math.atan2(hi_z - lo_z, y1 - y0)
    dy, dz = math.cos(slope), math.sin(slope)
    f = (y0 - 0.3 * dy, lo_z - 0.3 * dz)
    b = (y1 + 0.1 * dy, hi_z + 0.1 * dz)
    t = 0.13
    a.profile_x([f, b, (b[0] - dz * t, b[1] + dy * t), (f[0] - dz * t, f[1] + dy * t)], W + 0.32, bevel=0.03).color(jk.shade(P.SLATE, -0.1), jk.shade(P.SLATE, 0.2))
    mid = ((f[0] + b[0]) / 2 - dz * t, (f[1] + b[1]) / 2 + dy * t)
    length = math.hypot(b[0] - f[0], b[1] - f[1])
    with a.group() as array:
        a.box(W + 0.04, length - 0.3, 0.03, bevel=0).part("metal").color(P.STEEL, P.CHROME)
        cols, rows = 4, 2
        pw, pl = (W - 0.06) / cols, (length - 0.42) / rows
        for i in range(cols):
            for j in range(rows):
                a.box(pw - 0.05, pl - 0.05, 0.03, bevel=0).move((i - (cols - 1) / 2) * pw, (j - (rows - 1) / 2) * pl, 0.02).part("glass").color(
                    jk.shade(P.NAVY, -0.25), jk.mix(P.NAVY, P.BLUE, 0.6), "y"
                )
    array.rot(x=math.degrees(slope)).move(0, mid[0], mid[1] - 0.005)

    # Front: sliding glass doors onto a timber deck, the entrance beside them.
    timber = P.PINE_WOOD
    win(a, 1.36, 1.0, trim=timber, posts=2, border=0.05).move(-0.5, y0, base + 0.02)
    parts.door(a, 0.46, 0.94, leaf=P.OAK_WOOD, trim=timber, step=None, knob=False).move(0.82, y0, base + 0.03)
    a.sphere(0.026, 6, 4).move(0.97, y0 - 0.06, base + 0.46).part("metal").color(P.BRASS)
    a.box(W + 0.1, 0.5, 0.12, bevel=0.02, grounded=True).move(0, y0 - 0.29, 0.02).color(jk.shade(timber, -0.2), timber)
    a.box(0.9, 0.16, 0.07, bevel=0.015, grounded=True).move(0.82, y0 - 0.56, 0).color(jk.shade(timber, -0.25), jk.shade(timber, -0.05))
    for x in (-1.3, 1.3):
        zt = lo_z - (0.3 - 0.06) * math.tan(slope) - 0.02
        a.box(0.07, 0.07, zt - 0.12, bevel=0).move(x, y0 - 0.46, 0.12).color(jk.shade(timber, -0.15), timber)
    a.box(0.5, 0.2, 0.2, bevel=0.02).move(-1.02, y0 - 0.4, 0.13).color(jk.shade(P.OAK_WOOD, -0.1), P.OAK_WOOD)
    parts.canopy(a, [(-1.14, y0 - 0.4, 0.4, 0.11), (-0.92, y0 - 0.4, 0.42, 0.12)], seed=6, part="base", low=P.LEAF_DEEP, high=P.LEAF)

    # Back: a clerestory strip under the high eave and two bedroom windows.
    put(win(a, 1.9, 0.3, trim=timber, posts=3), "back", 0, 2.1, y1)
    for u in (-0.72, 0.72):
        put(win(a, 0.42, 0.5, trim=timber, sill=True), "back", u, base + 0.52, y1)

    # Sides: windows, a heat pump, the rain barrel and its downpipe, a flue.
    put(win(a, 0.5, 0.5, trim=timber, sill=True), "right", 0.0, base + 0.5, W / 2, cy=(y0 + y1) / 2)
    put(win(a, 0.42, 0.5, trim=timber, sill=True), "left", -0.3, base + 0.5, W / 2, cy=(y0 + y1) / 2)
    put(win(a, 0.4, 0.3, trim=timber), "left", 0.5, 1.72, W / 2, cy=(y0 + y1) / 2)
    bx, by = W / 2 + 0.2, y1 - 0.26
    a.lathe([(0.15, 0), (0.19, 0.05), (0.2, 0.3), (0.19, 0.55), (0.15, 0.6)], 10).move(bx, by, 0).color(jk.shade(P.TEAL, -0.35), jk.mix(P.TEAL, P.SLATE, 0.3))
    a.tube([(W / 2 + 0.035, by, hi_z - 0.3), (W / 2 + 0.035, by, 0.86), (bx, by, 0.7), (bx, by, 0.58)], 0.028, 5, caps="none").color(P.STEEL_DARK)
    a.box(0.2, 0.5, 0.4, bevel=0.025).move(-W / 2 - 0.1, 0.72, base).color(P.STEEL_DARK, P.STEEL)
    a.cyl(0.14, 0.02, 10, bevel=0).rot(y=-90).move(-W / 2 - 0.2, 0.72, base + 0.2).color(P.GUNMETAL)
    fx, fy = 0.8, 0.86
    fz = lo_z + (fy - y0) * math.tan(slope)
    a.cyl(0.06, 0.52, 8, bevel=0.01).move(fx, fy, fz).part("metal").color(P.STEEL, P.CHROME)
    a.cone(0.11, 0.07, 8).move(fx, fy, fz + 0.53).color(P.STEEL_DARK)


@asset("pod-house", tint="#f2efe6", budget=1500,
       note="S5 pod home: a seed-shaped cabin on one stem, a ring of windows, a skylight and a boarding stair to the front.")
def pod_house(a):
    a.cyl(0.82, 0.07, 16, bevel=0.02, grounded=True).color(P.STONE_DARK, P.STONE)
    a.lathe([(0.52, 0.05), (0.4, 0.1), (0.22, 0.4), (0.17, 0.78), (0.2, 1.02), (0.4, 1.2)], 12, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_2, P.SHADE_1)

    # Three sepals carry the cabin on the stem.
    with a.group() as sepal:
        a.tube([(0, -0.2, 0.82), (0, -0.5, 1.02), (0, -0.84, 1.3)], [0.06, 0.05, 0.035], 6).part("tint").color(P.SHADE_2, P.SHADE_1)
    sepal.rot(z=60)
    sepal.radial(3)

    # Cabin: bowl, a continuous band of windows, cap and skylight.
    eq0, eq1 = 1.68, 2.0
    a.lathe([(0.36, 1.18), (0.74, 1.25), (0.99, 1.42), (1.1, 1.6), (1.1, eq0), (1.02, eq0)], 16, cap_top=False).part("tint").color(P.SHADE_1, P.WHITE)
    a.lathe([(1.03, eq0 - 0.01), (1.03, eq1 + 0.01)], 16, cap_bottom=False, cap_top=False).part("lit").color(P.WINDOW, P.LAMP).no_ao()
    a.lathe([(1.02, eq1), (1.1, eq1), (1.1, eq1 + 0.06), (0.98, eq1 + 0.26), (0.7, eq1 + 0.44), (0.36, eq1 + 0.53), (0.3, eq1 + 0.53)], 16, cap_bottom=False, cap_top=False).part(
        "tint"
    ).color(P.SHADE_1, P.WHITE)
    for i in range(8):
        az = math.radians(22.5 + i * 45)
        a.box(0.06, 0.08, eq1 - eq0, bevel=0).move(0, -1.045, eq0).rot(z=math.degrees(az)).part("tint").color(P.SHADE_2)
    a.lathe([(1.105, 1.55), (1.115, 1.56), (1.115, 1.63), (1.105, 1.64)], 16, cap_bottom=False, cap_top=False).color(jk.mix(P.TEAL, P.SLATE, 0.2))
    a.lathe([(1.002, eq1 + 0.245), (0.925, eq1 + 0.315)], 16, cap_bottom=False, cap_top=False).color(jk.mix(P.TEAL, P.SLATE, 0.2))
    a.lathe([(0.36, eq1 + 0.5), (0.36, eq1 + 0.57), (0.3, eq1 + 0.58), (0.28, eq1 + 0.53)], 14, cap_bottom=False, cap_top=False).part("metal").color(P.STEEL, P.CHROME)
    a.dome(0.29, 0.13, 14, 3).move(0, 0, eq1 + 0.55).part("glass").color(P.GLASS_TINTED, P.GLASS)

    # Hatch and boarding stair at the front.
    a.box(0.46, 0.4, 0.36, bevel=0.05).move(0, -0.68, 1.07).part("tint").color(P.SHADE_2, P.SHADE_1)
    win(a, 0.24, 0.17, trim=P.STEEL, border=0.035).move(0, -0.88, 1.13)
    foot, head = (-1.08, 0.06), (-0.9, 1.09)
    for side in (-1, 1):
        beam(a, (side * 0.17, foot[0], foot[1]), (side * 0.17, head[0], head[1]), 0.035, 0.07).color(P.STEEL_DARK, P.STEEL)
    for i in range(6):
        t = (i + 0.5) / 6
        a.box(0.32, 0.1, 0.025, bevel=0).move(0, foot[0] + (head[0] - foot[0]) * t, foot[1] + (head[1] - foot[1]) * t).color(P.STEEL)
    a.tube([(0.3, 0.42, eq1 + 0.4), (0.33, 0.46, eq1 + 0.86)], [0.014, 0.008], 4).color(P.STEEL_DARK)
    a.sphere(0.03, 6, 4).move(0.33, 0.46, eq1 + 0.88).part("glow").color(P.GLOW_CYAN)
