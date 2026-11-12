"""Shared sub-assemblies: the details that make a model read as designed rather than stacked.

Every helper adds pieces to an Asset and returns a `Group`, so the caller can place the whole
assembly: `parts.window(a).rot(z=90).move(1.2, 0, 0.7)`. Helpers build at the origin, standing on
z = 0 and FACING -y (the front), like every model.
"""

from __future__ import annotations

import math
from typing import Sequence

from . import jk
from . import palette as P
from .jk import Asset, Group, Piece


def grouped(a: Asset, start: int) -> Group:
    g = Group(a)
    g.pieces = a.pieces[start:]
    return g


# --------------------------------------------------------------------------------------------
# Openings
# --------------------------------------------------------------------------------------------
def frame(w: float, h: float, border: float = 0.05, depth: float = 0.06, recess: float = 0.04) -> Piece:
    """A rectangular frame with a recessed opening, bottom centre at the origin, facing -y.

    The opening is w by h; the frame adds `border` around it and stands `depth` proud of the
    wall plane (y = 0). Put a pane at y = -(depth - recess).
    """
    x0, x1 = w / 2, w / 2 + border
    z0, z1 = border, border + h
    zt = h + 2 * border
    front, back, inner = -depth, 0.0, -(depth - recess)
    v = [
        (-x1, front, 0), (x1, front, 0), (x1, front, zt), (-x1, front, zt),  # outer front 0-3
        (-x0, front, z0), (x0, front, z0), (x0, front, z1), (-x0, front, z1),  # inner front 4-7
        (-x0, inner, z0), (x0, inner, z0), (x0, inner, z1), (-x0, inner, z1),  # recess 8-11
        (-x1, back, 0), (x1, back, 0), (x1, back, zt), (-x1, back, zt),  # outer back 12-15
    ]
    f = [
        (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),  # front face ring
        (4, 5, 9, 8), (5, 6, 10, 9), (6, 7, 11, 10), (7, 4, 8, 11),  # reveal
        (1, 0, 12, 13), (2, 1, 13, 14), (3, 2, 14, 15), (0, 3, 15, 12),  # outer sides
    ]
    return jk.raw(v, f)


def window(
    a: Asset,
    w: float = 0.42,
    h: float = 0.52,
    trim=P.OFF_WHITE,
    pane="lit",
    pane_color=P.WINDOW,
    border: float = 0.05,
    depth: float = 0.06,
    sill: bool = True,
    mullion: str = "cross",
    shutters=None,
) -> Group:
    """A framed window, bottom centre at the origin on the wall plane y = 0, facing -y.

    `pane` is the part of the glazing: "lit" (glows, and goes dark in the -dark variant), "glass"
    or "glow". `mullion` is "cross", "bar" (one vertical), "rows" (one horizontal) or "".
    `shutters` is a colour for a pair of side shutters, or None.
    """
    start = len(a.pieces)
    a.add(frame(w, h, border, depth)).color(trim)
    glass_y = -(depth - 0.04)
    a.box(w, 0.012, h, bevel=0).move(0, glass_y - 0.006, border).part(pane).color(pane_color).no_ao()
    bar = min(0.03, w * 0.08)
    if mullion in ("cross", "bar"):
        a.box(bar, 0.02, h, bevel=0).move(0, glass_y - 0.016, border).color(trim)
    if mullion in ("cross", "rows"):
        a.box(w, 0.02, bar, bevel=0).move(0, glass_y - 0.016, border + h * 0.52).color(trim)
    if sill:
        a.box(w + border * 2 + 0.08, 0.1, 0.045, bevel=0.012).move(0, -0.05, -0.03).color(trim)
    if shutters is not None:
        for side in (-1, 1):
            a.box(w * 0.42, 0.03, h + border, bevel=0.01).move(
                side * (w / 2 + border + w * 0.21 + 0.01), -0.02, border * 0.5
            ).color(shutters)
    return grouped(a, start)


def door(
    a: Asset,
    w: float = 0.5,
    h: float = 0.95,
    leaf=P.WALNUT,
    trim=P.OFF_WHITE,
    step=P.STONE,
    knob: bool = True,
    light: bool = False,
    arch: bool = False,
) -> Group:
    """A framed door, bottom centre at the origin on the wall plane y = 0, facing -y."""
    start = len(a.pieces)
    border, depth = 0.06, 0.07
    a.add(frame(w, h - border, border, depth, recess=0.05)).move(0, 0, -border + 0.0).color(trim)
    a.box(w, 0.02, h - border, bevel=0).move(0, -0.03, 0).color(leaf, jk.shade(leaf, 0.12))
    # Two sunk panels make the leaf read as joinery.
    for z in (0.12, 0.5):
        a.box(w * 0.62, 0.012, (h - border) * 0.3, bevel=0).move(0, -0.036, z * (h - border) + 0.02).color(
            jk.shade(leaf, -0.18)
        )
    if knob:
        a.sphere(0.028, 8, 5).move(w * 0.32, -0.06, h * 0.45).part("metal").color(P.BRASS)
    if step is not None:
        a.box(w + 0.3, 0.26, 0.07, bevel=0.02).move(0, -0.13, 0).color(step)
    if light:
        a.box(0.09, 0.06, 0.1, bevel=0.015).move(w / 2 + 0.16, -0.05, h * 0.8).part("glow").color(P.LAMP)
    if arch:
        a.cyl(w / 2 + border, depth, 12, bevel=0.01).rot(x=90).scale(1, 1, 0.6).move(0, 0, h - border).color(trim)
    return grouped(a, start)


def gable_roof(
    a: Asset,
    w: float,
    d: float,
    rise: float,
    overhang: float = 0.16,
    thick: float = 0.09,
    color=P.TERRACOTTA,
    ridge: bool = True,
    axis: str = "x",
) -> Group:
    """A pitched roof whose ridge runs along `axis`, eaves at z = 0, covering a w by d body.

    Two real slabs with thickness and overhang, plus a ridge cap. The caller adds the gable wall
    (see `gable_wall`) and moves the group up to the top of the walls.
    """
    start = len(a.pieces)
    span = (d if axis == "x" else w) / 2 + overhang
    length = (w if axis == "x" else d) + overhang * 2
    slope = math.atan2(rise, span - overhang)
    drop = math.tan(slope) * overhang
    top = jk.shade(color, 0.1)
    outline = [
        (-span, -drop),
        (0, rise),
        (span, -drop),
        (span, -drop - thick),
        (0, rise - thick),
        (-span, -drop - thick),
    ]
    roof = a.profile_x(outline, length, bevel=min(0.03, thick * 0.3)).color(jk.shade(color, -0.12), top)
    if ridge:
        cap = a.box(length + 0.04, thick * 1.5, thick * 0.8, bevel=thick * 0.25).move(0, 0, rise - thick * 0.2)
        cap.color(jk.shade(color, -0.2))
    if axis == "y":
        for p in a.pieces[start:]:
            p.rot(z=90)
    _ = roof
    return grouped(a, start)


def gable_wall(w: float, rise: float, thick: float = 0.06) -> Piece:
    """The triangular wall under a gable, base centred on the origin, facing -y, w wide."""
    return jk.profile_y([(-w / 2, 0), (w / 2, 0), (0, rise)], thick, bevel=0)


def hip_roof(a: Asset, w: float, d: float, rise: float, overhang: float = 0.16, color=P.TERRACOTTA, ridge_ratio: float = 0.45) -> Group:
    """A four-sided hipped roof, eaves at z = 0."""
    start = len(a.pieces)
    x, y = w / 2 + overhang, d / 2 + overhang
    rx = (w / 2) * ridge_ratio if w >= d else 0.0
    ry = (d / 2) * ridge_ratio if d > w else 0.0
    t = 0.07
    verts = [
        (-x, -y, 0), (x, -y, 0), (x, y, 0), (-x, y, 0),
        (-rx, -ry, rise), (rx, -ry, rise), (rx, ry, rise), (-rx, ry, rise),
        (-x, -y, -t), (x, -y, -t), (x, y, -t), (-x, y, -t),
    ]
    faces = [
        (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7),
        (1, 0, 8, 9), (2, 1, 9, 10), (3, 2, 10, 11), (0, 3, 11, 8), (11, 10, 9, 8),
    ]
    piece = a.raw(verts, faces)
    bmesh_dissolve_degenerate(piece)
    piece.bevel(0.025).color(jk.shade(color, -0.12), jk.shade(color, 0.1))
    return grouped(a, start)


def bmesh_dissolve_degenerate(piece: Piece):
    import bmesh

    bmesh.ops.remove_doubles(piece.bm, verts=piece.bm.verts[:], dist=1e-5)
    bmesh.ops.dissolve_degenerate(piece.bm, edges=piece.bm.edges[:], dist=1e-5)
    piece.bm.normal_update()


def chimney(a: Asset, w: float = 0.26, h: float = 0.7, color=P.BRICK, pot: bool = True) -> Group:
    start = len(a.pieces)
    a.box(w, w, h, bevel=0.02).color(jk.shade(color, -0.1), color)
    a.box(w + 0.07, w + 0.07, 0.07, bevel=0.015).move(0, 0, h).color(P.STONE)
    if pot:
        a.cyl(w * 0.24, 0.13, 8, bevel=0.01).move(0, 0, h + 0.07).color(P.TERRACOTTA)
    return grouped(a, start)


def awning(a: Asset, w: float, d: float = 0.4, color=P.RED, stripes: bool = True) -> Group:
    """A sloped fabric awning hung on the wall plane y = 0 with its top edge at z = 0."""
    start = len(a.pieces)
    n = max(2, round(w / 0.22)) if stripes else 1
    seg = w / n
    for i in range(n):
        c = color if i % 2 == 0 else P.OFF_WHITE
        a.profile_x([(0, 0), (0, -0.05), (-d, -d * 0.45 - 0.05), (-d, -d * 0.45)], seg + 0.001, bevel=0).move(
            -w / 2 + seg * (i + 0.5)
        ).color(c)
    return grouped(a, start)


# --------------------------------------------------------------------------------------------
# Rolling stock
# --------------------------------------------------------------------------------------------
def wheel(a: Asset, r: float = 0.17, width: float = 0.12, hub=P.STEEL, tyre=P.INK, sides: int = 12) -> Group:
    """A wheel on the ground, axle along x, centred on x = 0: tyre, rim and hub cap."""
    start = len(a.pieces)
    b = min(width * 0.28, r * 0.25)
    a.lathe([(r - b, 0), (r, b), (r, width - b), (r - b, width)], sides).rot(y=90).move(-width / 2, 0, r).color(tyre)
    a.cyl(r * 0.56, width + 0.024, 8, bevel=0.012).rot(y=90).move(-width / 2 - 0.012, 0, r).part("metal").color(hub)
    return grouped(a, start)


def axle_pair(a: Asset, track: float, y: float, r: float = 0.17, width: float = 0.12, **kw) -> Group:
    """Left and right wheels at depth y, `track` apart (centre to centre)."""
    start = len(a.pieces)
    for side in (-1, 1):
        wheel(a, r, width, **kw).move(side * track / 2, y, 0)
    return grouped(a, start)


# --------------------------------------------------------------------------------------------
# Vegetation
# --------------------------------------------------------------------------------------------
def trunk(a: Asset, h: float, r: float = 0.12, lean: float = 0.0, color=P.BARK, sides: int = 7, flare: float = 1.5) -> Piece:
    """A tapered trunk with a flared foot. `lean` shifts the top sideways (in x)."""
    pts = [(0, 0, 0), (lean * 0.15, 0, h * 0.12), (lean * 0.5, 0, h * 0.55), (lean, 0, h)]
    radii = [r * flare, r * 1.05, r * 0.85, r * 0.62]
    return a.tube(pts, radii, sides).color(jk.shade(color, -0.18), jk.shade(color, 0.08)).flat()


def canopy(
    a: Asset,
    lumps: Sequence[Sequence[float]],
    seed: int = 1,
    part: str = "tint",
    low=P.SHADE_2,
    high=P.WHITE,
) -> Group:
    """Faceted foliage from overlapping lumps: each (x, y, z, radius[, squash_z[, subdiv]]).

    Painted light on top and deeper underneath, so one instance colour reads as sunlit leaves.
    """
    start = len(a.pieces)
    for i, lump in enumerate(lumps):
        x, y, z, r = lump[:4]
        squash = lump[4] if len(lump) > 4 else 0.86
        subdiv = int(lump[5]) if len(lump) > 5 else (2 if r >= 0.42 else 1)
        a.blob(r, subdiv, (1, 1, squash), lumps=0.2, seed=seed * 7 + i).move(x, y, z).part(part).color(low, high)
    return grouped(a, start)


# --------------------------------------------------------------------------------------------
# Figures
# --------------------------------------------------------------------------------------------
def figure(
    a: Asset,
    skin=P.SKINS[0],
    hair=P.HAIRS[0],
    hair_style: str = "short",
    legs=P.CHARCOAL,
    shoes=P.INK,
    stride: float = 0.0,
    arms: float = 0.0,
    hat=None,
    robe: bool = False,
    pack=None,
    vest=None,
    scale: float = 1.0,
    hat_style: str = "brim",
    hood: str | None = None,
    skirt: bool = False,
    sleeves: str = "long",
    slim: float = 0.0,
    stance: float = 1.0,
    lean: float = 0.0,
    reach: dict | None = None,
    belt=None,
    eyes=P.INK,
) -> Group:
    """A citizen one unit tall, facing -y: a rounded toy figure with a large head and a face.

    The clothed torso and sleeves are the `tint` part. `stride` poses a walk (0 standing, about
    0.4 mid-stride: front heel down, rear toe pushing off, arms counter-swinging). `arms` raises
    both arms outward (0..1). `hair_style` is "short", "bun", "long", "bob", "curly", "ponytail"
    or "bald". `hat` is a hat colour and `hat_style` its shape: "brim", "hard" or "peaked".
    `pack` is a colour for a backpack; `vest` a colour for a chest band; `belt` a belt colour.
    `robe` swaps trousers for a long belted robe, with `hood` "up" or "down". `skirt` flares the
    top into a dress; `sleeves` may be "short"; `legs` may be "tint" for one-piece overalls.
    `slim` (0..1) gives a taller, slender build; `stance` spreads the feet; `lean` tips the
    upper body forward (degrees). `reach` poses an arm: `{side: wrist}` or `{side: (elbow,
    wrist)}` with side -1 (x < 0) or 1.

    The returned group carries `anchors` (head, head_r, crown, hand, shoulder, hip, half, deep)
    in the group's own space so callers can attach tools, packs and badges.
    """
    import bmesh
    from mathutils import Matrix, Vector

    start = len(a.pieces)
    k = max(0.0, min(1.0, slim))

    def mx(u, v):
        return u + (v - u) * k

    head_r = mx(0.168, 0.136)
    crown = mx(0.992, 1.085)
    squash = (mx(1.03, 0.97), 0.97, mx(0.95, 1.06))
    head_z = crown - head_r * squash[2]
    shoulder = mx(0.612, 0.725)
    hip = mx(0.345, 0.455)
    half, deep = mx(0.158, 0.12), mx(0.106, 0.082)
    arm_r, leg_r, hand_r = mx(0.052, 0.039), mx(0.076, 0.056), mx(0.054, 0.042)
    swing = stride * 0.36
    cloth_lo, cloth_hi = P.SHADE_1, P.WHITE

    def up(sections, sides=10, power=2.6, caps="flat"):
        """Loft along z: sections are (z, half-width, half-depth[, centre y])."""
        piece = jk.loft([(s[0], s[1], s[2], -(s[3] if len(s) > 3 else 0.0)) for s in sections], sides, power, caps)
        return a.add(piece.rot(x=90))

    # ---- legs and shoes ------------------------------------------------------------------
    leg_part, leg_col = ("tint", P.SHADE_2) if legs == "tint" else ("base", legs)
    hx = 0.072 * stance * mx(1.0, 0.82)
    gait = min(1.0, swing / 0.15) if swing > 1e-4 else 0.0
    for sd in (-1, 1):
        fy = -sd * swing
        fx = sd * (hx + 0.008 * stance)
        pitch, pivot = 0.0, fy
        if gait:
            # Front foot lands on its heel; rear foot pushes off its toe.
            pitch, pivot = (-15.0 * gait, fy + 0.07) if fy < 0 else (36.0 * gait, fy - 0.1)
        shoe = a.loft(
            [(-0.128, 0, 0, 0.03), (-0.092, 0.055, 0.035, 0.035), (0.0, 0.066, 0.047, 0.047), (0.072, 0.052, 0.04, 0.042), (0.09, 0, 0, 0.042)],
            6,
            2.6,
        )
        shoe.scale(mx(1.0, 0.86), 1, 1).move(fx, fy, 0).rot(x=pitch, pivot=(fx, pivot, 0)).color(jk.shade(shoes, -0.1), shoes).smooth(72)
        if robe:
            continue
        c, s = math.cos(math.radians(pitch)), math.sin(math.radians(pitch))
        dy, dz = fy + 0.028 - pivot, 0.062
        ay, az = pivot + dy * c - dz * s, dy * s + dz * c
        top = hip + 0.03
        knee_y = ay * 0.5 - (0.05 * gait if fy > 0 else 0.0)
        a.tube(
            [(sd * hx, 0, top), (sd * hx * 1.02 + (fx - sd * hx) * 0.5, knee_y, (top + az) * 0.5), (fx, ay, az)],
            [leg_r, leg_r * 0.95, leg_r * 0.84],
            8,
            caps="none",
        ).part(leg_part).color(leg_col).smooth(80)
    upper_from = len(a.pieces)

    # ---- body ----------------------------------------------------------------------------
    hem = hip - 0.04
    neck = [(shoulder + 0.04, half * 0.56, deep * 0.62)]
    if robe:
        drift = swing * 0.3
        body = [
            (0.0, half * 1.32, deep * 1.62, drift),
            (0.035, half * 1.36, deep * 1.68, drift),
            (hip + 0.05, half * 1.02, deep * 1.08, 0),
            (shoulder - 0.01, half * 0.95, deep * 0.9, 0),
        ] + neck
        up(body).part("tint").color(cloth_lo, cloth_hi)
        a.torus(half * 1.03, 0.02, 10, 5).scale(1, deep * 1.1 / (half * 1.03), 1).move(0, 0, hip + 0.06).color(belt or P.WALNUT)
    else:
        waist = 1.0 - 0.14 * k
        body = [
            (hem, half * 0.99, deep * 0.97),
            (hip + 0.06, half * waist, deep * waist),
            (shoulder - 0.085, half * 0.99, deep * 0.98),
            (shoulder - 0.008, half * 0.93, deep * 0.87),
        ] + neck
        if skirt:
            body = [(hip - 0.17, half * 1.34, deep * 1.5), (hip - 0.14, half * 1.36, deep * 1.52)] + body[1:]
        up(body).part("tint").color(cloth_lo, cloth_hi)
        if belt is not None:
            up([(hip + 0.0, half * 0.985, deep * 0.99), (hip + 0.045, half * 1.0 * waist + 0.004, deep * waist + 0.004)], caps="none").color(belt)
            a.box(0.05, 0.02, 0.04, bevel=0).move(0, -deep - 0.012, hip + 0.002).color(P.BRASS)
    if vest is not None:
        up(
            [(shoulder - 0.2, half * 0.99 + 0.007, deep * 0.98 + 0.007), (shoulder - 0.11, half * 0.985 + 0.007, deep * 0.97 + 0.007)],
            caps="none",
        ).color(vest)

    # ---- arms and hands ------------------------------------------------------------------
    hands = {}
    sleeve_r = [arm_r * 0.5, arm_r * 1.06, arm_r * 0.98, arm_r * (1.3 if robe else 0.88)]
    for sd in (-1, 1):
        s_out = Vector((sd * (half * 0.93 + arm_r * 0.36), 0, shoulder - 0.036))
        hand_y = sd * swing * 0.85
        wrist = Vector(
            (
                sd * (half + 0.074 + arms * 0.2),
                hand_y,
                shoulder - 0.238 * mx(1.0, 1.14) + arms * 0.2 + abs(hand_y) * (0.42 if hand_y < 0 else 0.18),
            )
        )
        # A back-swinging arm stays nearly straight; a forward one bends at the elbow.
        elbow = (s_out + wrist) / 2 + Vector((sd * 0.014, 0.014 + (0.03 * gait if hand_y < 0 else 0.0), -0.016 * gait if hand_y < 0 else 0.0))
        pose = (reach or {}).get(sd)
        if pose is not None:
            if isinstance(pose[0], (int, float)):
                wrist = Vector(pose)
                span = (wrist - s_out).length
                reach_len = 0.27 * mx(1.0, 1.12)
                elbow = (s_out + wrist) / 2
                if span < reach_len:
                    axis = (wrist - s_out).normalized()
                    pole = Vector((sd * 0.45, 0.75, -0.45))
                    pole = (pole - axis * pole.dot(axis)).normalized()
                    elbow += pole * math.sqrt((reach_len / 2) ** 2 - (span / 2) ** 2)
            else:
                elbow, wrist = Vector(pose[0]), Vector(pose[1])
        # The sleeve starts as a small rounded cap tucked into the shoulder slope.
        s_in = s_out - (elbow - s_out).normalized() * arm_r * 0.62 - Vector((sd * arm_r * 0.3, 0, 0))
        if sleeves == "short" and not robe:
            a.tube([s_in, s_out, elbow], sleeve_r[:3], 8).part("tint").color(P.SHADE_1).smooth(80)
            a.tube([elbow, wrist], [arm_r * 0.9, arm_r * 0.82], 8, caps="none").color(skin).smooth(80)
        else:
            sleeve = a.tube([s_in, s_out, elbow, wrist], sleeve_r, 8).part("tint").color(P.SHADE_2 if robe else P.SHADE_1).smooth(80)
            # The cuff end is hidden inside the hand.
            bmesh.ops.delete(
                sleeve.bm,
                geom=[f for f in sleeve.bm.faces if len(f.verts) > 4 and (f.calc_center_median() - wrist).length < 1e-4],
                context="FACES_ONLY",
            )
        hand = wrist + (wrist - elbow).normalized() * hand_r * 0.55
        a.sphere(hand_r, 7, 4).move(*hand).color(skin).smooth(90)
        hands[sd] = hand

    # ---- head ----------------------------------------------------------------------------
    def on_head(piece):
        return piece.scale(*squash).move(0, 0, head_z)

    a.tube([(0, 0, shoulder + 0.03), (0, 0, head_z - head_r * 0.7)], head_r * 0.36, 8, caps="none").color(jk.shade(skin, -0.1)).smooth(90)
    hooded = robe and hood == "up"
    covered = hat is not None or hooded
    if covered:
        # Under a hat or hood the crown is never seen, so the skull stops above the brow.
        skull = [(math.cos(math.radians(t)) * head_r, math.sin(math.radians(t)) * head_r) for t in (-58.5, -27.0, 4.5, 36.0)]
        a.lathe([(0, -head_r)] + skull, 12, cap_top=False).scale(*squash).move(0, 0, head_z).color(jk.shade(skin, -0.05), skin)
    else:
        a.sphere(head_r, 12, 6, squash).move(0, 0, head_z).color(jk.shade(skin, -0.05), skin)
    if eyes is not None:
        for sd in (-1, 1):
            az, el = math.radians(23.0), math.radians(-7.0)
            eye = a.lathe([(0.024, 0), (0, 0.008)], 8, cap_bottom=False).rot(x=90).scale(1, 1, 1.3)
            eye.rot(z=sd * 23.0).move(
                sd * math.sin(az) * math.cos(el) * (head_r * squash[0] - 0.003),
                -math.cos(az) * math.cos(el) * (head_r * squash[1] - 0.003),
                head_z + math.sin(el) * head_r * squash[2],
            ).color(eyes).no_ao().smooth(90)

    style = "bald" if hair is None else hair_style
    hair_lo, hair_hi = (jk.shade(hair, -0.14), jk.shade(hair, 0.1)) if hair is not None else (None, None)

    def cap(radius, low, tilt, rings=3, sides=12, line=None, lip=0.03, top=90.0):
        """A skull cap from the crown down to latitude `low` (degrees), tipped back by `tilt`.

        `top` below 90 leaves the crown open (a band, for hair under a hat). `lip` turns the
        rim in toward the head so the cap shows thickness. `line(u, front)` returns degrees to
        raise the hairline at a rim point, where u is its sideways position (-1..1) and front
        is 1 at the forehead, 0 at the sides and back.
        """
        lo, hi = math.radians(low), math.radians(top)
        pts = [(math.cos(lo) * (radius - lip), math.sin(lo) * (radius - lip))] if lip else []
        pts += [(math.cos(lo + (hi - lo) * i / rings) * radius, math.sin(lo + (hi - lo) * i / rings) * radius) for i in range(rings + 1)]
        if top >= 90:
            pts[-1] = (0, radius)
        piece = a.lathe(pts, sides, cap_bottom=False, cap_top=False)
        if line is not None:
            rim_z = math.sin(lo) * radius + 1e-5

            def shape(co):
                if co.z > rim_z:
                    return co
                flat = math.hypot(co.x, co.y) or 1e-9
                lat = math.atan2(co.z, flat) + math.radians(line(co.x / flat, max(0.0, -co.y / flat)))
                return (co.x / flat * math.cos(lat) * co.length, co.y / flat * math.cos(lat) * co.length, math.sin(lat) * co.length)

            piece.warp(shape)
        return piece.rot(x=-tilt)

    def side_part(u, front):
        return front * (5.0 - 17.0 * u)

    def centre_part(u, front):
        return front * (13.0 - 24.0 * abs(u))

    if style in ("short", "bun", "ponytail", "bald") and not hooded:
        for sd in (-1, 1):
            a.sphere(head_r * 0.2, 5, 3, (0.55, 1, 1.15)).smooth(90).move(sd * head_r * squash[0] * 0.985, head_r * 0.08, head_z - head_r * 0.2).color(
                jk.shade(skin, -0.06)
            )
    if style != "bald" and not hooded:
        thick = 0.012 if covered else 0.024
        if covered:
            # Under a hat only a fringe, the sides and the nape show.
            on_head(cap(head_r + thick, -16 if style in ("long", "bob") else -8, 20, rings=2, lip=0, top=40)).color(hair_lo, hair_hi)
        elif style == "curly":
            # Tight curls: a full round crown set up and back, so the face shows beneath it.
            a.sphere(head_r + 0.034, 10, 6, (1.05, 1.0, 0.94)).move(0, 0.036, head_z + head_r * 0.3).color(hair_lo, hair_hi)
        elif style == "bob":
            on_head(cap(head_r + thick + 0.004, -36, 40, line=lambda u, front: front * 4.0)).color(hair_lo, hair_hi)
        elif style == "long":
            on_head(cap(head_r + thick, -18, 34, line=centre_part)).color(hair_lo, hair_hi)
            up(
                [
                    (shoulder - 0.07, half * 0.86, 0.035, deep + 0.012),
                    (shoulder + 0.03, half * 1.08, 0.055, deep * 0.9),
                    (head_z - head_r * 0.25, head_r * 1.04, head_r * 0.5, head_r * 0.52),
                    (head_z + head_r * 0.35, head_r * 0.8, head_r * 0.4, head_r * 0.5),
                ],
                8,
                2.4,
            ).color(hair_lo, hair_hi).smooth(70)
        elif style == "bun":
            on_head(cap(head_r + thick, -10, 33, line=centre_part)).color(hair_lo, hair_hi)
        else:
            on_head(cap(head_r + thick, -8, 31, line=side_part)).color(hair_lo, hair_hi)
        if not covered:
            if style == "bun":
                a.sphere(head_r * 0.42, 8, 5).move(0, head_r * 0.42, head_z + head_r * 0.98).color(hair, hair_hi)
            if style == "ponytail":
                a.tube(
                    [(0, head_r * 0.8, head_z + head_r * 0.42), (0, head_r * 1.42, head_z + head_r * 0.3), (0, head_r * 1.5, head_z - head_r * 0.62)],
                    [head_r * 0.24, head_r * 0.3, head_r * 0.1],
                    6,
                    caps="round",
                ).color(hair_lo, hair_hi).smooth(80)

    if hat is not None:
        hr = head_r + 0.03
        hat_from = len(a.pieces)
        if hat_style == "hard":
            shell = a.lathe(
                [(hr + 0.02, 0), (hr + 0.022, 0.014), (hr + 0.002, 0.024), (hr * 0.94, 0.092), (hr * 0.6, 0.15), (0, 0.174)],
                12,
            )
            # A narrow rim all round that grows into a peak over the face.
            shell.warp(lambda co: (co.x, co.y * (1.0 + 0.24 * max(0.0, -co.y / (hr + 0.02)) * max(0.0, 1 - co.z / 0.03)), co.z))
            shell.color(jk.shade(hat, -0.12), jk.shade(hat, 0.08))
            a.tube([(0, -hr * 0.86, 0.1), (0, -hr * 0.4, 0.166), (0, hr * 0.4, 0.166), (0, hr * 0.86, 0.1)], 0.018, 4, caps="none").color(
                jk.shade(hat, 0.14)
            )
            tilt, rise = -7.0, head_r * 0.2
        elif hat_style == "peaked":
            crown_piece = a.lathe([(hr - 0.012, 0), (hr - 0.012, 0.05), (hr + 0.034, 0.1), (hr - 0.004, 0.126), (0, 0.132)], 12)
            crown_piece.color(jk.shade(hat, -0.1), jk.shade(hat, 0.1))
            band = jk.shade(hat, -0.5)
            crown_piece.paint(lambda f: band if f.calc_center_median().z < 0.03 and abs(f.normal.z) < 0.5 else None)
            a.loft([(-hr - 0.075, 0.075, 0.007, 0.0), (-hr - 0.03, 0.135, 0.01, 0.006), (-hr + 0.07, 0.16, 0.012, 0.014)], 6, 2.0).color(P.INK).smooth(70)
            a.sphere(0.022, 5, 3, (1, 0.6, 1.1)).smooth(90).move(0, -hr + 0.004, 0.06).color(P.GOLD)
            tilt, rise = -5.0, head_r * 0.3
        else:
            a.dome(hr, head_r * 0.82, 12, 3, grounded=False).color(jk.shade(hat, -0.06), jk.shade(hat, 0.08))
            a.lathe([(hr * 0.9, 0), (head_r + 0.105, 0.005), (head_r + 0.105, 0.019), (hr * 0.9, 0.026)], 12, cap_bottom=False, cap_top=False).move(0, -0.012, 0).color(
                jk.shade(hat, -0.14), jk.shade(hat, -0.04)
            )
            a.lathe([(hr + 0.004, 0.024), (hr * 0.975, 0.058)], 12, cap_bottom=False, cap_top=False).color(jk.shade(hat, -0.4))
            tilt, rise = -10.0, head_r * 0.3
        for piece in a.pieces[hat_from:]:
            piece.rot(x=tilt).move(0, 0.004, head_z + rise)

    if robe and hood is not None:
        # A rolled cowl sits on the shoulders; the hood is worn up over the head or hangs behind.
        a.lathe([(half * 0.72, 0), (half * 0.9, 0.034), (half * 0.6, 0.078)], 10, cap_bottom=False, cap_top=False).scale(1, 0.84, 1).rot(x=-8).move(
            0, 0.01, shoulder + 0.012
        ).part("tint").color(P.SHADE_2, P.SHADE_1)
        if hooded:
            shell = cap(head_r + 0.042, -30, 42, rings=4, lip=0.05)
            # A soft peak at the back of the hood.
            shell.warp(lambda co: (co.x * 1.03, co.y + max(0.0, co.y) * 0.14, co.z + max(0.0, co.y) * 0.1))
            on_head(shell).part("tint").color(P.SHADE_2, P.SHADE_1)
        else:
            a.sphere(0.085, 6, 4, (1.05, 0.62, 1.2)).smooth(90).move(0, deep + 0.045, shoulder - 0.02).part("tint").color(P.SHADE_2, P.SHADE_1)

    if pack is not None:
        a.box(0.25, 0.13, 0.28, bevel=0.045).move(0, deep + 0.045, hip + 0.03).color(jk.shade(pack, -0.12), pack)
        a.box(0.19, 0.04, 0.1, bevel=0.02).move(0, deep + 0.115, hip + 0.06).color(jk.shade(pack, -0.22))
        for sd in (-1, 1):
            a.tube(
                [(sd * half * 0.55, deep + 0.03, shoulder - 0.02), (sd * half * 0.6, 0, shoulder + 0.036), (sd * half * 0.6, -deep * 0.86, shoulder - 0.06), (sd * half * 0.62, -deep * 0.95, hip + 0.1)],
                0.016,
                4,
                caps="none",
            ).color(jk.shade(pack, -0.3))

    # ---- pose and anchors ----------------------------------------------------------------
    pose = Matrix.Identity(4)
    if lean:
        pivot = Matrix.Translation((0, 0, hip))
        pose = pivot @ Matrix.Rotation(math.radians(lean), 4, "X") @ pivot.inverted()
        for piece in a.pieces[upper_from:]:
            if robe and piece is a.pieces[upper_from]:
                # A robe hangs straight below the hips and leans above them.
                bend = math.radians(lean)
                piece.warp(
                    lambda co: co
                    if co.z <= hip
                    else (co.x, co.y * math.cos(bend) - (co.z - hip) * math.sin(bend), hip + co.y * math.sin(bend) + (co.z - hip) * math.cos(bend))
                )
            else:
                piece.apply(pose)
    g = grouped(a, start)
    if scale != 1.0:
        g.scale(scale)
    place = Matrix.Scale(scale, 4) @ pose
    g.anchors = dict(
        head=place @ Vector((0, 0, head_z)),
        hand={sd: place @ hands[sd] for sd in (-1, 1)},
        head_r=head_r * scale,
        crown=crown * scale,
        shoulder=shoulder * scale,
        hip=hip * scale,
        half=half * scale,
        deep=deep * scale,
    )
    return g
