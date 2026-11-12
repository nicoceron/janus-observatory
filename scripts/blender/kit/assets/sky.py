"""Satellites and fair-weather clouds: everything that rides above a toy planet.

Satellites keep their bus on the origin with +z pointing AWAY from the planet, so the top of the
model is what a viewer mostly sees: wings lie along x with their cells turned up, the dish and
the status lamp sit on the top deck. Bodies are the tint part, solar cells are glass, trusses
and fittings are metal, and the single status lamp is the only glow (the web app may hide it,
so every lamp sits in a collar that reads as a finished fitting on its own).

Clouds are one faceted mass each: lumps fused into a single skin, cut flat underneath, painted
white on top and a little deeper below. They are all tint, so one model serves fair weather,
storm, dust and smog.

Original interpretive artwork; nothing here encodes a measured quantity.
"""

from __future__ import annotations

import math

import bmesh

from kit import jk, parts
from kit import palette as P
from kit.jk import asset

# Solar cells: deep blue glass, a touch lighter toward one edge so a wing has a sheen.
CELL_LO, CELL_HI = "#122650", "#2a5ca6"
CELL_DEAD = "#1b222e"
FOIL = "#d9a93f"
FOIL_DARK = "#a87a2a"


# --------------------------------------------------------------------------------------------
# Satellite fittings
# --------------------------------------------------------------------------------------------
def tile(w: float, d: float, h: float, inset: float | None = None) -> jk.Piece:
    """A low chamfered tile lying on z = 0 (open underneath): a top face and four sloped sides."""
    inset = min(w, d) * 0.12 if inset is None else inset
    x, y = w / 2, d / 2
    v = [
        (-x, -y, 0), (x, -y, 0), (x, y, 0), (-x, y, 0),
        (-x + inset, -y + inset, h), (x - inset, -y + inset, h), (x - inset, y - inset, h), (-x + inset, y - inset, h),
    ]
    return jk.raw(v, [(4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])


def wall(piece, face: str, half: float, z: float, along: float = 0.0):
    """Stand a tile or group built flat on z = 0 against a bus wall, centred at height z.

    `face` is "-y" (front), "+y", "-x" or "+x"; `half` is the distance of that wall from the
    axis; `along` slides it sideways along the wall.
    """
    if face == "-y":
        return piece.rot(x=90).move(along, -half, z)
    if face == "+y":
        return piece.rot(x=90).rot(z=180).move(-along, half, z)
    if face == "+x":
        return piece.rot(x=90).rot(z=90).move(half, along, z)
    return piece.rot(x=90).rot(z=-90).move(-half, -along, z)


def wing(a, length: float, chord: float, cols: int, rows: int, thick: float = 0.06, border: float = 0.05,
         gap: float = 0.035, dead=(), bare=()):
    """A solar wing lying flat with its root edge on x = 0 and its cells turned up (+z).

    The plate is the body colour and shows between the cells as frame and grid. `dead` cells
    (column, row) are dark; `bare` cells are gone and leave an empty bay. The plate's top is z = 0.
    """
    start = len(a.pieces)
    a.box(length, chord, thick, bevel=0).move(length / 2, 0, -thick).part("tint").color(P.SHADE_2, P.WHITE)
    cw = (length - 2 * border - (cols - 1) * gap) / cols
    cd = (chord - 2 * border - (rows - 1) * gap) / rows
    for i in range(cols):
        for j in range(rows):
            x = border + cw / 2 + i * (cw + gap)
            y = -chord / 2 + border + cd / 2 + j * (cd + gap)
            if (i, j) in bare:
                a.add(tile(cw, cd, 0.012, 0.03)).move(x, y, 0).color(P.CHARCOAL)
                continue
            cell = a.add(tile(cw, cd, 0.026, 0.022)).move(x, y, 0).part("glass")
            if (i, j) in dead:
                cell.color(CELL_DEAD)
            else:
                cell.color(CELL_HI, CELL_LO, "y")
    return parts.grouped(a, start)


def yoke(a, x0: float, x1: float, half: float, r: float = 0.034):
    """The truss that carries a wing: a boom from the bus at x0 and two struts to a root spar at
    x1 (`half` is the half-length of the spar)."""
    start = len(a.pieces)
    a.tube([(x0, 0, 0), (x1, 0, 0)], r, 5, caps="none").part("metal").color(P.STEEL)
    for s in (-1, 1):
        a.tube([(x0 + 0.01, 0, 0), (x1, s * half, 0)], r * 0.62, 3, caps="none").part("metal").color(P.STEEL)
    a.box(0.05, half * 2 + 0.06, 0.05, bevel=0).move(x1, 0, -0.025).part("metal").color(P.STEEL_DARK)
    return parts.grouped(a, start)


def dish(a, r: float, depth: float, sides: int = 10, thick: float = 0.035, feed: str | None = "stalk"):
    """A shallow reflector opening toward +z with its vertex at the origin.

    `feed` is "stalk" (a centre post with a horn), "tripod" (three struts from the rim to a horn
    over the centre) or None (broken off).
    """
    start = len(a.pieces)
    profile = [
        (0, 0.0),
        (r * 0.58, depth * 0.32),
        (r, depth),
        (r * 0.97, depth - thick * 1.1),
        (r * 0.5, depth * 0.24 - thick * 1.3),
        (0, -thick * 1.7),
    ]
    a.lathe(profile, sides).part("tint").color(P.SHADE_2, P.WHITE)
    top = depth * 1.9
    if feed == "stalk":
        a.tube([(0, 0, 0), (0, 0, top)], r * 0.05, 3, caps="none").part("metal").color(P.STEEL)
    if feed == "tripod":
        for k in range(3):
            ang = math.radians(90 + 120 * k)
            a.tube([(math.cos(ang) * r * 0.9, math.sin(ang) * r * 0.9, depth * 0.84), (0, 0, top)], r * 0.035, 3,
                   caps="none").part("metal").color(P.STEEL)
    if feed:
        a.lathe([(r * 0.07, -r * 0.14), (r * 0.15, 0), (r * 0.07, r * 0.07)], 5).move(0, 0, top).part("metal").color(
            P.STEEL_DARK
        )
    return parts.grouped(a, start)


def lamp(a, p, r: float = 0.06, colour=P.GLOW_ORANGE, lit: bool = True):
    """A status lamp in a metal collar standing on point p. The collar alone reads as a fitting."""
    start = len(a.pieces)
    a.lathe([(r * 1.5, 0), (r * 1.5, r * 0.6), (r * 1.02, r * 0.9)], 6, cap_bottom=False, cap_top=not lit).move(*p).part(
        "metal"
    ).color(P.STEEL_DARK)
    if lit:
        a.lathe([(r, r * 0.6), (r * 0.82, r * 1.4), (0, r * 1.8)], 6, cap_bottom=False).move(*p).part("glow").color(colour)
    return parts.grouped(a, start)


def bell(a, r: float, h: float, sides: int = 6):
    """An engine bell hanging from z = h down to z = 0, mouth toward the planet."""
    return a.lathe([(r, 0), (r * 0.5, h * 0.75), (r * 0.62, h)], sides, cap_top=False).part("metal").color(
        P.GUNMETAL, P.STEEL_DARK
    )


def blanket(a, half: float, z: float, h: float = 0.3, low=FOIL_DARK, high=FOIL):
    """A gold thermal blanket wrapped round a square bus whose walls stand `half` from the axis."""
    r = (half + 0.022) * math.sqrt(2)
    return a.lathe([(r * 0.96, 0), (r, 0.04), (r, h - 0.04), (r * 0.96, h)], 4, turn=math.pi / 4, cap_bottom=False,
                   cap_top=False).move(0, 0, z).color(low, high)


# --------------------------------------------------------------------------------------------
# Satellites
# --------------------------------------------------------------------------------------------
@asset("sat-a", tint="#9aa0a6", grounded=False, budget=500, note="classic twin-wing satellite")
def sat_a(a):
    w, h, z0 = 0.84, 1.0, 0.17
    half, top = w / 2, z0 + h
    bell(a, 0.2, z0 + 0.02)
    a.box(w, w, h, bevel=0.07).move(0, 0, z0).part("tint").color(P.SHADE_1, P.WHITE)
    blanket(a, half, z0 + 0.1)
    # Front: a radiator hatch and a small sensor eye.
    wall(a.add(tile(0.42, 0.32, 0.03, 0.03)), "-y", half, z0 + 0.66, -0.09).part("tint").color(P.SHADE_3, P.SHADE_2)
    wall(a.add(tile(0.13, 0.13, 0.035, 0.03)), "-y", half, z0 + 0.72, 0.26).part("glass").color(P.INK)
    # Wings: three by two cells on a triangular yoke, feathered a little toward the front.
    for side in (1, -1):
        with a.group() as g:
            yoke(a, half - 0.02, 0.66, 0.3)
            wing(a, 0.94, 0.8, 3, 2).move(0.66, 0, 0.012)
        if side < 0:
            g.rot(z=180)
        g.rot(x=16).move(0, 0, 0.6)
    # Top deck: a dish on a gimbal post, tipped forward; the status lamp; a whip aerial.
    a.lathe([(0.075, 0), (0.06, 0.19)], 5, cap_bottom=False, cap_top=False).move(0.13, 0.1, top - 0.01).part("metal").color(
        P.STEEL_DARK
    )
    dish(a, 0.37, 0.13).rot(x=24, z=-18).move(0.13, 0.1, top + 0.2)
    lamp(a, (-0.25, -0.24, top - 0.01), 0.064)
    a.tube([(-0.27, 0.27, top - 0.02), (-0.31, 0.31, top + 0.42)], 0.014, 3).part("metal").color(P.STEEL)


@asset("sat-b", tint="#9aa0a6", grounded=False, budget=600, note="relay: drum, big dish, one panel boom")
def sat_b(a):
    r, z0, z1 = 0.46, 0.14, 0.74
    arm = 0.44
    bell(a, 0.2, z0 + 0.04)
    a.lathe([(r - 0.1, z0), (r, z0 + 0.08), (r, z1 - 0.07), (r - 0.08, z1)], 12).part("tint").color(P.SHADE_1, P.WHITE)
    a.lathe([(r - 0.01, 0.25), (r + 0.016, 0.28), (r + 0.016, 0.5), (r - 0.01, 0.53)], 12, cap_bottom=False,
            cap_top=False).color(FOIL_DARK, FOIL)
    # The relay dish rides a short neck and looks away from the planet, tipped a little forward.
    a.lathe([(0.17, z1 - 0.02), (0.1, z1 + 0.12)], 6, cap_bottom=False, cap_top=False).part("metal").color(P.STEEL_DARK)
    dish(a, 0.64, 0.2, 12, thick=0.04, feed="tripod").rot(x=10).move(0, 0, z1 + 0.12)
    # One long panel on +x: four by two cells on a yoke.
    with a.group() as g:
        yoke(a, r - 0.02, 0.72, 0.2)
        wing(a, 0.95, 0.58, 4, 2).move(0.72, 0, 0.012)
    g.rot(x=16).move(0, 0, arm)
    # A slim instrument boom balances it on -x: a sensor head and a crossed aerial.
    a.tube([(-r + 0.02, 0, arm), (-1.44, 0, arm)], 0.024, 4, caps="none").part("metal").color(P.STEEL)
    a.box(0.17, 0.17, 0.15, bevel=0.025).move(-1.5, 0, arm - 0.075).part("tint").color(P.SHADE_1, P.WHITE)
    a.tube([(-1.2, -0.3, arm), (-1.2, 0.3, arm)], 0.014, 3).part("metal").color(P.STEEL)
    lamp(a, (-0.2, -0.24, z1 - 0.045), 0.06, P.GLOW_CYAN)


@asset("sat-c", tint="#9aa0a6", grounded=False, budget=400, note="cubesat with fold-out panels")
def sat_c(a):
    w, h, z0 = 0.6, 0.86, 0.2
    half, top = w / 2, z0 + h
    a.box(w, w, h, bevel=0.03).move(0, 0, z0).part("tint").color(P.SHADE_1, P.WHITE)
    # Four deployment rails: the corners stand proud of both ends, as on every cubesat.
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box(0.08, 0.08, h + 0.14, bevel=0).move(sx * (half - 0.012), sy * (half - 0.012), z0 - 0.07).part(
                "metal"
            ).color(P.STEEL_DARK, P.STEEL)
    # Body-mounted cells front and back, and a camera eye on the front.
    wall(a.add(tile(0.38, 0.4, 0.026, 0.025)), "-y", half, z0 + 0.25).part("glass").color(CELL_HI, CELL_LO, "x")
    wall(a.add(tile(0.38, 0.66, 0.026, 0.025)), "+y", half, z0 + h / 2).part("glass").color(CELL_HI, CELL_LO, "x")
    with a.group() as eye:
        a.lathe([(0.125, 0), (0.125, 0.05), (0.085, 0.05)], 6, cap_bottom=False, cap_top=False).part("metal").color(P.STEEL)
        a.lathe([(0.086, 0.03), (0, 0.045)], 6, cap_bottom=False).part("glass").color(P.INK)
    wall(eye, "-y", half, z0 + 0.66)
    # Fold-out panels hinged on the top edge: two leaves each side, still a little creased.
    leaf, chord, crease = 0.44, 0.56, 11
    for side in (1, -1):
        with a.group() as g:
            wing(a, leaf, chord, 1, 2, thick=0.05, border=0.045).rot(y=crease)
            reach = math.cos(math.radians(crease)) * leaf + 0.03
            sag = -math.sin(math.radians(crease)) * leaf
            wing(a, leaf, chord, 1, 2, thick=0.05, border=0.045).rot(y=-crease).move(reach, 0, sag)
            a.tube([(reach - 0.015, -chord / 2, sag - 0.03), (reach - 0.015, chord / 2, sag - 0.03)], 0.026, 3).part(
                "metal"
            ).color(P.STEEL_DARK)
        g.move(half + 0.03, 0, top - 0.02)
        if side < 0:
            g.rot(z=180)
    # Tape-measure aerials spring from the bottom corners.
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.tube([(sx * half, sy * half, z0 + 0.03), (sx * (half + 0.34), sy * (half + 0.34), z0 - 0.17)], 0.013, 3).part(
                "metal"
            ).color(P.STEEL)
    a.add(tile(0.26, 0.26, 0.03, 0.03)).move(0.06, 0.06, top).color(FOIL_DARK, FOIL)
    lamp(a, (-0.15, -0.15, top - 0.01), 0.055, P.GLOW_GREEN)


@asset("sat-wreck", tint="#8a8f96", grounded=False, budget=500, note="derelict: tumbling, one wing snapped")
def sat_wreck(a):
    w, h, z0 = 0.84, 1.0, 0.17
    half, top = w / 2, z0 + h
    arm = 0.6
    with a.group() as hulk:
        bell(a, 0.2, z0 + 0.02)
        a.box(w, w, h, bevel=0.07).move(0, 0, z0).part("tint").color(P.SHADE_3, P.SHADE_1)
        blanket(a, half, z0 + 0.1, low=jk.shade(FOIL_DARK, -0.3), high=jk.shade(FOIL, -0.18))
        # A scorched breach in the front wall and a dead sensor eye.
        scar = a.lathe([(0.23, 0), (0.17, 0.016)], 5, cap_bottom=False, turn=0.4).scale(1.0, 0.78, 1).color(P.INK)
        wall(scar, "-y", half, z0 + 0.68, -0.07)
        wall(a.add(tile(0.13, 0.13, 0.035, 0.03)), "-y", half, z0 + 0.72, 0.26).part("glass").color(P.INK)
        # The +x wing still hangs on, folded down past its first bay, most cells dead.
        with a.group() as g:
            yoke(a, half - 0.02, 0.66, 0.3)
            wing(a, 0.31, 0.8, 1, 2, dead=((0, 1),)).move(0.66, 0, 0.012)
            wing(a, 0.62, 0.8, 2, 2, dead=((0, 0), (1, 0), (1, 1)), bare=((0, 1),)).rot(x=-7, y=34).move(0.985, 0, 0.0)
        g.rot(x=16).move(0, 0, arm)
        # The -x wing has snapped off its yoke: it trails on a cable, skewed, every cell dark.
        with a.group() as g:
            a.tube([(half - 0.02, 0, 0), (0.6, 0.03, -0.05)], 0.034, 5).part("metal").color(P.STEEL)
            a.tube([(half - 0.01, 0, 0), (0.6, 0.27, 0.03)], 0.021, 3).part("metal").color(P.STEEL)
            a.tube([(0.6, 0.03, -0.05), (0.72, -0.05, -0.2), (0.8, -0.02, -0.3)], 0.013, 3, caps="none").part("metal").color(
                P.STEEL_DARK
            )
            with a.group() as lost:
                wing(a, 0.94, 0.8, 3, 2, dead=((0, 0), (0, 1), (1, 1), (2, 0), (2, 1)), bare=((1, 0),)).move(0, 0, 0.012)
                a.box(0.05, 0.66, 0.05, bevel=0).move(0, 0, -0.025).part("metal").color(P.STEEL_DARK)
            lost.rot(x=-20).rot(y=30).rot(z=-24).move(0.8, -0.04, -0.3)
        g.rot(z=180).rot(x=16).move(0, 0, arm)
        # The dish has been knocked off its gimbal and dented: it slumps over the edge of the deck.
        a.lathe([(0.075, 0), (0.06, 0.19)], 5, cap_bottom=False).move(0.13, 0.1, top - 0.01).part("metal").color(P.STEEL_DARK)
        bent = dish(a, 0.37, 0.13, feed=None)
        for piece in bent.pieces:
            piece.warp(lambda co: (co.x, co.y, co.z + max(0.0, co.x - 0.14) * 0.95)).color(P.SHADE_3, P.SHADE_1)
        a.tube([(0, 0, 0), (0, 0, 0.13), (0.07, 0.03, 0.2)], 0.018, 3, caps="none").part("metal").color(P.STEEL)
        bent.pieces.append(a.pieces[-1])
        bent.rot(x=52, z=-165).move(0.2, 0.36, top + 0.04)
        lamp(a, (-0.25, -0.24, top - 0.01), 0.064, lit=False)
        a.tube([(-0.27, 0.27, top - 0.02), (-0.2, 0.38, top + 0.3)], 0.014, 3).part("metal").color(P.STEEL)
    hulk.rot(x=12, y=-17, z=8, pivot=(0, 0, 0.6))


# --------------------------------------------------------------------------------------------
# Clouds
# --------------------------------------------------------------------------------------------
CLOUD_TOP = "#ffffff"
CLOUD_SIDE = "#eceff2"
CLOUD_UNDER = "#c3ccd7"


def _flat_base(piece, base: float):
    """Cut a mass flat at z = base and close it with one face."""
    bm = piece.bm
    cut = bmesh.ops.bisect_plane(
        bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-5, plane_co=(0, 0, base), plane_no=(0, 0, 1),
        clear_inner=True,
    )
    rim = [e for e in cut["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
    bmesh.ops.holes_fill(bm, edges=rim)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()


def cloud(a, lumps, seed: int = 1, base: float = -0.15, lumpy: float = 0.15, budget: int = 490):
    """One faceted cloud from (x, y, z, rx, ry, rz[, subdiv[, pointed]]) lumps fused into one skin.

    The lumps are united, so the creases between billows stay crisp and no triangle hides
    inside; `pointed` draws a lump out into a spindle. The mass is cut flat at `base` and painted
    white on top with a deeper underside.
    """
    mass = None
    for i, lump in enumerate(lumps):
        x, y, z, rx, ry, rz = lump[:6]
        subdiv = int(lump[6]) if len(lump) > 6 else 2
        piece = jk.blob(1.0, subdiv, (rx, ry, rz), lumps=lumpy, seed=seed * 11 + i, freq=1.3)
        if len(lump) > 7 and lump[7]:
            def spindle(co, rx=rx):
                k = max(0.12, 1.0 - min(1.0, (co.x / rx) ** 2)) ** 0.42
                return (co.x, co.y * k, co.z * k)
            piece.warp(spindle)
        piece.move(x, y, z)
        if mass is None:
            mass = piece
        else:
            mass.join(piece)
            piece.bm.free()
    # Unions leave slivers along every seam: fold them away only if the cloud misses its budget.
    for ratio in (1.0, 0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42):
        trial = mass.copy()
        if ratio < 1.0:
            trial.decimate(ratio)
        _flat_base(trial, base)
        if trial.triangles <= budget:
            break
        trial.bm.free()
    mass.bm.free()
    bm = trial.bm
    top = max(v.co.z for v in bm.verts)
    span = (top - base) or 1.0
    side, under, white = jk.col(CLOUD_SIDE), jk.col(CLOUD_UNDER), jk.col(CLOUD_TOP)
    layer = trial.layer
    for f in bm.faces:
        down = f.normal.z < -0.3
        for loop in f.loops:
            t = max(0.0, min(1.0, (loop.vert.co.z - base) / span))
            c = under if down else jk.mix(jk.mix(under, side, min(1.0, t * 2.6)), white, t ** 0.8)
            loop[layer] = (c[0], c[1], c[2], 1.0)
    return a.add(trial.part("tint").flat())


@asset("cloud-a", tint="#ffffff", grounded=False, budget=500, note="small fair-weather puff")
def cloud_a(a):
    cloud(a, [
        (0.05, 0.02, 0.26, 0.86, 0.66, 0.64),
        (-0.95, 0.08, 0.06, 0.64, 0.56, 0.46),
        (1.0, -0.06, 0.04, 0.6, 0.54, 0.44),
        (-0.42, -0.4, 0.0, 0.52, 0.42, 0.4, 1),
        (0.45, -0.42, -0.02, 0.5, 0.4, 0.36, 1),
        (0.3, 0.42, 0.04, 0.56, 0.42, 0.42, 1),
        (-0.45, 0.4, 0.0, 0.46, 0.38, 0.36, 1),
    ], seed=1)


@asset("cloud-b", tint="#ffffff", grounded=False, budget=500, note="long low bank")
def cloud_b(a):
    cloud(a, [
        (-1.25, 0.08, -0.02, 0.5, 0.46, 0.32, 1),
        (-0.75, -0.12, 0.04, 0.74, 0.54, 0.42),
        (-0.05, 0.14, 0.06, 0.78, 0.58, 0.45),
        (0.68, -0.1, 0.06, 0.76, 0.56, 0.47),
        (1.24, 0.1, -0.02, 0.5, 0.48, 0.34, 1),
    ], seed=2)


@asset("cloud-c", tint="#ffffff", grounded=False, budget=500, note="tall piled cumulus")
def cloud_c(a):
    cloud(a, [
        (-0.95, 0.0, 0.0, 0.7, 0.6, 0.42),
        (0.95, 0.04, 0.02, 0.72, 0.62, 0.44),
        (0.0, -0.08, 0.2, 0.86, 0.7, 0.56),
        (0.15, 0.05, 0.56, 0.58, 0.54, 0.44),
        (-0.32, 0.0, 0.4, 0.46, 0.44, 0.36, 1),
        (0.2, 0.42, 0.0, 0.52, 0.4, 0.38, 1),
    ], seed=3)


@asset("cloud-d", tint="#ffffff", grounded=False, budget=500, note="wide flat streak")
def cloud_d(a):
    cloud(a, [
        (0.25, 0.0, 0.02, 1.45, 0.36, 0.4, 2, True),
        (-0.7, 0.38, -0.02, 1.0, 0.3, 0.34, 2, True),
        (0.85, -0.38, -0.02, 0.85, 0.29, 0.32, 2, True),
        (-0.1, 0.02, 0.12, 0.5, 0.3, 0.34, 1),
    ], seed=4)
