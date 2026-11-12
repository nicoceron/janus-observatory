"""Hero set pieces: each future's single most recognisable silhouette.

They stand about a third of a planet radius tall at the limb of the story view and are also shown
alone in close-up studies. Shells and hulls are the tint part; joints and fittings gleam as metal;
visors, cores and beacons glow. Everything here is original interpretive artwork.
"""

import math

from mathutils import Matrix, Vector

from kit import jk, parts
from kit import palette as P
from kit.jk import asset

DARK = P.INK
FRAME = P.CHARCOAL


# --------------------------------------------------------------------------------------------
# Placement helpers
# --------------------------------------------------------------------------------------------
def _basis(p0, p1, side=(1, 0, 0), along="y"):
    """A matrix that carries the local `along` axis onto p0 -> p1, keeping local x near `side`."""
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
    if along == "y":
        m = Matrix((x, d, x.cross(d))).transposed().to_4x4()
    else:
        m = Matrix((x, d.cross(x), d)).transposed().to_4x4()
    m.translation = p0
    return m, length


def limb(a, p0, p1, s0, s1=None, power=4.0, sides=12, side=(1, 0, 0), round_ends=0.16):
    """A tapered rounded-box member from p0 to p1. `s0`/`s1` are (width along `side`, depth)."""
    s1 = s0 if s1 is None else s1
    m, length = _basis(p0, p1, side, "y")
    e0 = min(round_ends * min(s0), length * 0.2)
    e1 = min(round_ends * min(s1), length * 0.2)
    sections = [
        (0, s0[0] / 2 - e0, s0[1] / 2 - e0),
        (e0, s0[0] / 2, s0[1] / 2),
        (length - e1, s1[0] / 2, s1[1] / 2),
        (length, s1[0] / 2 - e1, s1[1] / 2 - e1),
    ]
    return a.loft(sections, sides, power).apply(m)


def bar(a, p0, p1, w, d, bevel=None, taper=1.0, side=(1, 0, 0)):
    """A bevelled box member from p0 to p1, `w` wide along `side` and `d` deep."""
    m, length = _basis(p0, p1, side, "z")
    return a.box(w, d, length, bevel=bevel, taper=taper).apply(m)


def rod(a, p0, p1, r, sides=6, caps="flat"):
    return a.tube([p0, p1], r, sides, caps=caps)


def drum(a, p, r, w, axis="x", sides=12, bevel=None, r2=None):
    """A cylinder of width `w` centred on `p` with its axis along x, y or z."""
    piece = a.cyl(r, w, sides, r2=r2, bevel=bevel).move(0, 0, -w / 2)
    if axis == "x":
        piece.rot(y=90)
    elif axis == "y":
        piece.rot(x=-90)
    return piece.move(p[0], p[1], p[2])


def collar(a, p, r, w, axis="x", sides=10, colour=P.STEEL, part="metal", caps=True):
    """A chamfered ring or cap of width `w` centred on `p`. Drop `caps` when it wraps a body."""
    b = min(w * 0.3, r * 0.16)
    piece = a.lathe([(r - b, 0), (r, b), (r, w - b), (r - b, w)], sides, cap_bottom=caps, cap_top=caps).move(0, 0, -w / 2)
    if axis == "x":
        piece.rot(y=90)
    elif axis == "y":
        piece.rot(x=-90)
    return piece.move(p[0], p[1], p[2]).part(part).color(colour)


def joint(a, p, r, w, axis="x", sides=10, core=DARK, band=P.STEEL, band_w=None, ends=(-1, 1)):
    """A banded pivot: a dark core between bright metal collars (`ends` picks which sides)."""
    band_w = w * 0.24 if band_w is None else band_w
    k = "xyz".index(axis)
    piece = a.lathe([(r * 0.84, 0), (r * 0.84, w - band_w)], sides, cap_bottom=-1 not in ends, cap_top=1 not in ends)
    piece.move(0, 0, -(w - band_w) / 2)
    if axis == "x":
        piece.rot(y=90)
    elif axis == "y":
        piece.rot(x=-90)
    piece.move(p[0], p[1], p[2]).color(core)
    for s in ends:
        q = list(p)
        q[k] += s * (w - band_w) / 2
        collar(a, q, r, band_w, axis, sides, band)


def light(a, p, r=0.06, colour=P.GLOW_ORANGE, sides=8):
    """A small round status lamp."""
    return a.sphere(r, sides, 5).move(p[0], p[1], p[2]).part("glow").color(colour)


def beacon(a, p, r=0.07, colour=P.GLOW_RED, collar=P.STEEL_DARK):
    """A warning lamp on a short collar, standing on point `p`."""
    a.cyl(r * 1.25, r * 0.7, 8, bevel=r * 0.2).move(p[0], p[1], p[2]).part("metal").color(collar)
    return a.capsule(r, r * 2.3, 8, 2).move(p[0], p[1], p[2] + r * 0.6).part("glow").color(colour)


# --------------------------------------------------------------------------------------------
# Titans
# --------------------------------------------------------------------------------------------
def titan_leg(a, side, stance=0.48, hip=0.0, knee=0.0):
    """One worker-titan leg: flared greave, banded knee, thigh and a broad steel-toed boot.

    `hip` and `knee` swing the leg about its pivots (degrees), for the fallen wreck."""
    x = side * stance
    hx = side * (stance - 0.02)
    knee_at, hip_at = (x, 0.0, 1.42), (hx, 0.0, 2.36)
    with a.group() as lower:
        a.profile_x(
            [(-0.56, 0.0), (0.42, 0.0), (0.42, 0.3), (0.28, 0.42), (-0.2, 0.42), (-0.56, 0.24)], 0.6, bevel=0.05
        ).move(x, 0, 0).part("tint").color(P.SHADE_3, P.SHADE_1)
        a.profile_x([(-0.61, 0.0), (-0.33, 0.0), (-0.33, 0.34), (-0.61, 0.22)], 0.65, bevel=0.03).move(x, 0, 0).part(
            "metal"
        ).color(P.STEEL_DARK, P.STEEL)
        # Greave: flares toward the ankle like a bell.
        limb(a, (x, 0.0, 1.32), (x, 0.02, 0.36), (0.44, 0.5), (0.62, 0.7)).part("tint").color(P.SHADE_1, P.WHITE)
        a.box(0.3, 0.1, 0.36, bevel=0.04, taper=(0.8, 1)).move(x, -0.3, 1.24).part("tint").color(P.SHADE_1, P.WHITE)
        a.box(0.66, 0.74, 0.07, bevel=0.025).move(x, 0.02, 0.46).color(FRAME)
    lower.rot(x=knee, pivot=knee_at)
    with a.group() as upper:
        joint(a, knee_at, 0.23, 0.56)
        limb(a, (hx, 0.0, 2.3), (x, 0.0, 1.52), (0.5, 0.54), (0.4, 0.46)).part("tint").color(P.SHADE_1, P.WHITE)
        a.box(0.2, 0.04, 0.4, bevel=0).move(x, -0.262, 1.72).color(FRAME)
    for g in (lower, upper):
        g.rot(x=hip, pivot=hip_at)
    joint(a, (hx + side * 0.1, 0.0, 2.36), 0.25, 0.34, ends=(side,))


def titan_arm(a, side, elbow=None, wrist=None, hand=True):
    """One worker-titan arm: domed pauldron, slim upper arm, heavy forearm and a blunt hand."""
    sx, sz = side * 1.04, 3.6
    elbow = (side * 1.2, 0.04, 2.62) if elbow is None else elbow
    wrist = (side * 1.22, -0.1, 1.62) if wrist is None else wrist
    # Pauldron: a dome on a steel rim.
    a.dome(0.47, 0.44, 12, 3, grounded=False).scale(1, 1.08, 1).move(sx + side * 0.08, 0, sz - 0.02).part("tint").color(
        P.SHADE_1, P.WHITE
    )
    a.lathe([(0.2, -0.1), (0.46, -0.1), (0.5, -0.06), (0.5, 0.0)], 12, cap_bottom=False, cap_top=False).scale(
        1, 1.08, 1
    ).move(sx + side * 0.08, 0, sz - 0.02).part("metal").color(P.STEEL)
    # Upper arm.
    top = Vector((sx + side * 0.1, 0, sz - 0.16))
    e, w = Vector(elbow), Vector(wrist)
    limb(a, top, e, (0.3, 0.34), sides=10).color(FRAME, P.SLATE)
    hinge = (e - top).cross(w - e)
    if hinge.length > 0.05:
        axis = "xyz"[max(range(3), key=lambda k: abs(hinge[k]))]
    else:
        axis = "x" if abs((w - e).normalized().x) < 0.7 else "y"
    joint(a, elbow, 0.21, 0.5, axis)
    # Forearm: the heavy gauntlet widens toward the wrist.
    d = (w - e).normalized()
    limb(a, e + d * 0.06, w, (0.44, 0.48), (0.56, 0.62)).part("tint").color(P.SHADE_1, P.WHITE)
    m, _ = _basis(w - d * 0.2, w, (1, 0, 0), "z")
    a.box(0.61, 0.67, 0.1, bevel=0.03).apply(m).color(FRAME)
    if hand:
        # Palm, a three-finger block and a thumb.
        with a.group() as fist:
            a.box(0.36, 0.44, 0.3, bevel=0.07).color(DARK, FRAME)
            a.box(0.2, 0.42, 0.34, bevel=0.05, taper=(0.7, 0.92)).move(side * 0.07, 0, 0.24).color(FRAME)
            for i in (-1, 1):
                a.box(0.21, 0.02, 0.26, bevel=0).move(side * 0.07, i * 0.07, 0.3).color(DARK)
            a.box(0.13, 0.14, 0.26, bevel=0.04, taper=0.8).rot(y=-side * 22).move(-side * 0.13, 0.14, 0.22).color(FRAME)
        fist.apply(m.copy() @ Matrix.Translation((0, 0, 0.2)))


def titan_torso(a, pelvis=True, back=True, alive=True):
    """Worker-titan trunk: pelvis, ribbed waist, a broad chest with a reactor port, and a backpack."""
    if pelvis:
        a.box(0.78, 0.56, 0.44, bevel=0.08).move(0, 0, 2.12).color(DARK, FRAME)
        a.box(0.44, 0.14, 0.5, bevel=0.05, taper=(0.62, 1)).rot(x=180, pivot=(0, 0, 0.25)).move(0, -0.3, 2.06).part(
            "tint"
        ).color(P.SHADE_2, P.SHADE_1)
    # Ribbed waist.
    ribs = [(0.3, 2.5)]
    for i in range(3):
        z = 2.55 + i * 0.13
        ribs += [(0.37, z), (0.37, z + 0.07), (0.31, z + 0.1)]
    a.lathe(ribs, 10, cap_bottom=not pelvis, cap_top=False).scale(1.2, 0.92, 1).color(DARK, P.STEEL_DARK)
    # Chest: a wide rounded wedge.
    a.loft(
        [(0, 0.42, 0.36), (0.1, 0.5, 0.42), (0.52, 0.86, 0.56), (0.9, 0.95, 0.57), (1.06, 0.84, 0.48), (1.14, 0.56, 0.34)],
        16,
        3.6,
    ).rot(x=90).move(0, 0, 2.86).part("tint").color(P.SHADE_1, P.WHITE)
    collar(a, (0, 0.02, 4.0), 0.34, 0.14, "z", 12, P.STEEL)
    # Reactor port on the chest.
    collar(a, (0, -0.57, 3.5), 0.27, 0.1, "y", 14, P.STEEL)
    if alive:
        collar(a, (0, -0.61, 3.5), 0.19, 0.05, "y", 14, P.GLOW_CYAN, "glow")
    else:
        collar(a, (0, -0.6, 3.5), 0.19, 0.05, "y", 14, P.GLASS_DARK, "glass")
    for i in (-1, 1):
        for k in range(2):
            a.box(0.26, 0.04, 0.05, bevel=0).move(i * 0.26, -0.475 + k * 0.035, 3.06 - k * 0.11).color(DARK)
    if back:
        # Backpack with two heat stacks.
        a.box(1.0, 0.36, 0.86, bevel=0.07).move(0, 0.66, 2.98).color(FRAME, P.SLATE)
        a.box(0.5, 0.04, 0.5, bevel=0).move(0, 0.84, 3.14).color(DARK)
        for i in (-1, 1):
            a.lathe([(0.13, 3.8), (0.13, 4.34), (0.17, 4.36), (0.17, 4.44), (0.11, 4.46)], 10, cap_bottom=False).move(
                i * 0.32, 0.7, 0
            ).part("metal").color(P.STEEL_DARK, P.STEEL)
            a.cyl(0.1, 0.02, 10, bevel=0).move(i * 0.32, 0.7, 4.445).part("glow").color(P.GLOW_ORANGE)


def titan_head(a, eye=P.GLOW_CYAN, alive=True, mast=5.08):
    """A small cockpit: a rounded cab whose wrap-around windscreen glows."""
    z = 4.38
    a.loft(
        [(-0.31, 0, 0), (-0.28, 0.17, 0.15), (-0.08, 0.27, 0.25), (0.18, 0.28, 0.25), (0.3, 0.2, 0.17), (0.33, 0, 0)],
        14,
        3.2,
    ).move(0, 0, z).part("tint").color(P.SHADE_1, P.WHITE)
    screen = a.loft(
        [(-0.325, 0.12, 0.05), (-0.3, 0.19, 0.085), (-0.16, 0.262, 0.1), (-0.04, 0.29, 0.105)], 14, 3.2, caps="none"
    ).move(0, 0, z + 0.02)
    if alive:
        screen.part("glow").color(eye)
    else:
        screen.part("glass").color(DARK, P.GLASS_DARK)
    a.box(0.46, 0.2, 0.05, bevel=0.02).move(0, -0.2, z + 0.13).part("tint").color(P.SHADE_2)
    for i in (-1, 1):
        collar(a, (i * 0.29, 0.06, z), 0.1, 0.06, "x", 8, P.STEEL)
    a.tube([(0.17, 0.12, z + 0.2), (0.2, 0.14, mast)], 0.018, 5).part("metal").color(P.STEEL)
    if alive:
        light(a, (0.2, 0.14, mast + 0.02), 0.05, eye, 6)


@asset("titan", tint="#d9dde2", budget=4500)
def titan(a):
    for side in (-1, 1):
        titan_leg(a, side)
        titan_arm(a, side)
    titan_torso(a)
    titan_head(a)
    beacon(a, (-1.12, 0.0, 4.0), 0.055, P.GLOW_ORANGE)


# The enforcer: the same chassis class, dressed in angular plate.
def enforcer_leg(a, side, stance=0.56):
    x = side * stance
    hx = side * (stance - 0.05)
    a.profile_x(
        [(-0.66, 0.0), (0.44, 0.0), (0.44, 0.34), (0.24, 0.46), (-0.14, 0.46), (-0.66, 0.13)], 0.62, bevel=0.045
    ).move(x, 0, 0).part("tint").color(P.SHADE_3, P.SHADE_1)
    # Slab greave with a blade that rises into a knee spike.
    bar(a, (x, 0.04, 0.4), (x, 0.0, 1.36), 0.6, 0.66, bevel=0.06, taper=0.76).part("tint").color(P.SHADE_2, P.WHITE)
    a.profile_x([(-0.47, 0.5), (-0.3, 0.5), (-0.2, 1.46), (-0.27, 1.84), (-0.42, 1.5)], 0.3, bevel=0.03).move(x, 0, 0).part(
        "tint"
    ).color(P.SHADE_1, P.WHITE)
    a.box(0.66, 0.72, 0.08, bevel=0.025).move(x, 0.03, 0.52).color(DARK)
    joint(a, (x, 0.0, 1.5), 0.22, 0.6)
    bar(a, (x, 0.0, 1.56), (hx, 0.0, 2.3), 0.38, 0.44, bevel=0.05).color(DARK, FRAME)
    # Short tassets hang from the belt over the thigh.
    a.box(0.5, 0.1, 0.5, bevel=0.035, taper=(0.72, 1)).rot(x=180, pivot=(0, 0, 0.25)).rot(x=7, pivot=(0, 0, 0.5)).move(
        x + side * 0.02, -0.35, 1.86
    ).part("tint").color(P.SHADE_2, P.WHITE)
    a.box(0.1, 0.54, 0.56, bevel=0.035, taper=(1, 0.72)).rot(x=180, pivot=(0, 0, 0.28)).rot(y=-side * 9, pivot=(0, 0, 0.56)).move(
        x + side * 0.34, 0.02, 1.8
    ).part("tint").color(P.SHADE_2, P.WHITE)


def enforcer_arm(a, side, elbow, wrist):
    sx = side * 1.14
    # Slab pauldron, swept up at the outer edge, with a raised rim and a second lame under it.
    with a.group() as plate:
        a.box(0.84, 1.0, 0.34, bevel=0.07, taper=(0.84, 0.78)).part("tint").color(P.SHADE_1, P.WHITE)
        a.box(0.5, 0.62, 0.07, bevel=0.025).move(-side * 0.02, 0, 0.32).part("tint").color(P.SHADE_2, P.SHADE_1)
        a.box(0.1, 0.9, 0.3, bevel=0.03).move(side * 0.42, 0, -0.02).color(DARK)
    plate.rot(y=-side * 20).move(side * 1.22, 0, 3.66)
    a.box(0.14, 0.8, 0.56, bevel=0.04, taper=(1, 0.8)).rot(x=180, pivot=(0, 0, 0.28)).rot(y=side * 10, pivot=(0, 0, 0.56)).move(
        side * 1.55, 0, 3.3
    ).part("tint").color(P.SHADE_2, P.SHADE_1)
    e, w = Vector(elbow), Vector(wrist)
    bar(a, (sx, 0, 3.56), e, 0.4, 0.44, bevel=0.06).color(DARK, FRAME)
    joint(a, elbow, 0.21, 0.56)
    d = (w - e).normalized()
    bar(a, e + d * 0.04, w, 0.46, 0.5, bevel=0.06, taper=1.2).part("tint").color(P.SHADE_1, P.WHITE)
    m, _ = _basis(w - d * 0.34, w, (1, 0, 0), "z")
    a.box(0.3, 0.06, 0.4, bevel=0.02).apply(m @ Matrix.Translation((0, 0.3 if d.y > -0.3 else -0.3, 0))).part("tint").color(
        P.SHADE_2, P.SHADE_1
    )
    m, _ = _basis(w, w + d, (1, 0, 0), "z")
    a.box(0.42, 0.46, 0.4, bevel=0.09).apply(m).color(DARK, FRAME)


def enforcer_torso(a):
    a.box(0.72, 0.5, 0.5, bevel=0.08).move(0, 0, 1.98).color(DARK, FRAME)
    # Armoured belt and a centre tabard.
    a.box(1.5, 0.7, 0.24, bevel=0.06).move(0, 0, 2.32).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.box(0.36, 0.1, 0.66, bevel=0.035, taper=(0.66, 1)).rot(x=180, pivot=(0, 0, 0.33)).move(0, -0.36, 1.72).part("tint").color(
        P.SHADE_2, P.WHITE
    )
    a.box(0.2, 0.06, 0.12, bevel=0.02).move(0, -0.37, 2.38).color(DARK)
    a.cyl(0.36, 0.3, 8, bevel=0.03).scale(1.25, 0.95, 1).move(0, 0, 2.54).color(DARK, FRAME)
    # Chest: an angular hull with a prow, narrow at the waist.
    chest = a.profile_x(
        [(-0.4, 2.78), (0.44, 2.78), (0.6, 3.3), (0.56, 3.98), (-0.34, 3.98), (-0.72, 3.56)], 1.9, bevel=0.06
    )
    chest.warp(lambda co: (co.x * (0.54 + 0.46 * min(1.0, max(0.0, (co.z - 2.78) / 0.72))), co.y, co.z))
    chest.part("tint").color(P.SHADE_2, P.WHITE)
    # A keel ridge down the prow and a recessed grille under it.
    a.profile_x([(-0.44, 2.84), (-0.36, 2.84), (-0.68, 3.56), (-0.32, 4.0), (-0.38, 4.03), (-0.78, 3.56)], 0.16, bevel=0.02).part(
        "tint"
    ).color(P.SHADE_1, P.WHITE)
    for i in (-1, 1):
        a.box(0.3, 0.05, 0.36, bevel=0.015).rot(x=21).move(i * 0.3, -0.5, 2.94).color(DARK)
    # High gorget: the head sits down inside it.
    gorget = a.annulus(0.47, 0.36, 0.36, sides=8, bevel=0.03).scale(1.12, 1.05, 1).move(0, 0.03, 3.9)
    gorget.warp(lambda co: (co.x, co.y, co.z + (0.16 * (co.y + 0.5) if co.z > 4.0 else 0.0)))
    gorget.part("tint").color(P.SHADE_2, P.WHITE)
    # Power pack with two sensor blades.
    a.box(1.0, 0.36, 0.9, bevel=0.07, taper=(0.8, 1)).move(0, 0.68, 3.0).color(DARK, FRAME)
    for i in (-1, 1):
        a.profile_x([(0.5, 3.7), (0.74, 3.7), (0.98, 5.08), (0.9, 5.12)], 0.08, bevel=0.02).rot(
            y=i * 7, pivot=(0, 0, 3.7)
        ).move(i * 0.4, 0, 0).part("tint").color(P.SHADE_3, P.SHADE_1)


def enforcer_head(a):
    a.profile_x(
        [(-0.37, 4.08), (0.28, 4.08), (0.3, 4.4), (0.12, 4.56), (-0.12, 4.56), (-0.41, 4.36)], 0.46, bevel=0.04
    ).part("tint").color(P.SHADE_1, P.WHITE)
    # One red visor slit that wraps the brow.
    a.box(0.4, 0.05, 0.075, bevel=0.012).move(0, -0.412, 4.2).part("glow").color(P.GLOW_RED)
    for i in (-1, 1):
        a.box(0.04, 0.16, 0.075, bevel=0.012).move(i * 0.225, -0.33, 4.2).part("glow").color(P.GLOW_RED)


def searchlight(a, p, r=0.2, colour=P.GLOW_WHITE, pitch=-10.0, yaw=0.0):
    """A drum lamp on a yoke, standing on `p` and aimed toward -y."""
    x, y, z = p
    a.cyl(0.07, 0.16, 8, bevel=0.015).move(x, y, z).part("metal").color(P.STEEL_DARK)
    a.box(r * 2.5, 0.1, 0.06, bevel=0.02).move(x, y, z + 0.14).part("metal").color(P.STEEL_DARK)
    c = (x, y, z + 0.2 + r)
    with a.group() as lamp:
        for i in (-1, 1):
            a.box(0.05, 0.1, r + 0.08, bevel=0.015).move(x + i * (r * 1.14 + 0.02), y, z + 0.17).part("metal").color(P.STEEL_DARK)
    with a.group() as head:
        a.lathe([(r * 0.6, 0), (r * 0.92, r * 0.3), (r, r * 1.5), (r * 1.08, r * 1.56), (r * 1.08, r * 1.8), (r * 0.9, r * 1.8)], 12).rot(
            x=90
        ).move(x, y + r * 0.8, z + 0.2 + r).color(DARK, FRAME)
        a.cyl(r * 0.9, 0.03, 12, bevel=0).rot(x=90).move(x, y - r * 0.985, z + 0.2 + r).part("glow").color(colour)
    head.rot(x=-pitch, pivot=c)
    for g in (lamp, head):
        g.rot(z=yaw, pivot=c)


@asset("enforcer", tint="#4a4f58", budget=4500)
def enforcer(a):
    for side in (-1, 1):
        enforcer_leg(a, side)
    enforcer_torso(a)
    enforcer_head(a)
    # Its right arm hangs ready; its left hand rests on the grip of a planted tower shield.
    enforcer_arm(a, -1, (-1.26, 0.04, 2.66), (-1.3, -0.08, 1.74))
    enforcer_arm(a, 1, (1.27, 0.08, 2.72), (1.2, -0.2, 2.2))
    with a.group() as shield:
        a.profile_y(
            [(-0.47, 0.0), (0.47, 0.0), (0.47, 2.44), (0.3, 2.76), (-0.3, 2.76), (-0.47, 2.44)], 0.13, bevel=0.035
        ).part("tint").color(P.SHADE_2, P.WHITE)
        a.box(0.16, 0.06, 2.0, bevel=0.02).move(0, -0.09, 0.12).part("tint").color(P.SHADE_1, P.WHITE)
        a.box(0.78, 0.05, 0.1, bevel=0.02).move(0, -0.085, 0.12).part("tint").color(P.SHADE_1, P.WHITE)
        a.box(0.54, 0.03, 0.11, bevel=0).move(0, -0.075, 2.36).part("glass").color(DARK, P.GLASS_DARK)
        for i in (-1, 1):
            a.box(0.3, 0.025, 0.13, bevel=0).move(i * 0.27, -0.072, 1.56).color(P.RED)
            a.box(0.12, 0.2, 0.1, bevel=0.02).move(i * 0.3, 0.0, 0.0).part("metal").color(P.STEEL_DARK)
        # The grip on the back face.
        a.box(0.08, 0.32, 0.08, bevel=0.02).move(-0.18, 0.2, 1.84).part("metal").color(P.STEEL_DARK)
        a.box(0.08, 0.32, 0.08, bevel=0.02).move(0.18, 0.2, 1.84).part("metal").color(P.STEEL_DARK)
    shield.rot(x=-5).move(1.17, -0.74, 0)
    searchlight(a, (-1.3, 0.1, 4.08), 0.2, yaw=12)
    light(a, (0.3, -0.63, 3.62), 0.035, P.GLOW_RED, 6)


# --------------------------------------------------------------------------------------------
# The fallen titan
# --------------------------------------------------------------------------------------------
def lay_down(group, pivot_z, at, yaw=0.0, pitch=0.0, roll=0.0):
    """Lay a standing assembly on its back, head toward -y, then settle it at `at`.

    Negative `pitch` lifts the head end; `roll` tips it about its own long axis."""
    group.move(0, 0, -pivot_z).rot(x=-90).rot(z=180).rot(y=roll).rot(x=pitch).rot(z=yaw).move(*at)


def moss(a, patches, seed=3):
    for i, (x, y, z, r, flat) in enumerate(patches):
        a.blob(r, 2 if r > 0.5 else 1, (1, 1, flat), lumps=0.26, seed=seed + i * 3).move(x, y, z).color(P.LEAF_DEEP, P.MOSS)


@asset("titan-wreck", tint="#8a6a52", budget=4500)
def titan_wreck(a):
    # The chest and head lie propped on their back, head toward the front.
    with a.group() as upper:
        titan_torso(a, pelvis=False, back=False, alive=False)
        titan_head(a, alive=False, mast=4.84)
        # One arm flung wide, the other thrown past the head.
        titan_arm(a, -1, elbow=(-2.2, 0.16, 3.5), wrist=(-2.74, -0.66, 3.46))
        titan_arm(a, 1, elbow=(1.5, 0.45, 4.4), wrist=(1.2, 0.74, 5.25))
        # The broken spine and its cables.
        a.cyl(0.2, 0.34, 8, bevel=0.03).move(0, 0, 2.22).part("metal").color(P.STEEL_DARK)
        a.tube([(0.14, 0, 2.5), (0.3, -0.2, 2.2), (0.6, -0.5, 2.3)], 0.04, 5).color(DARK)
        a.tube([(-0.14, 0.05, 2.5), (-0.36, -0.3, 2.1), (-0.3, -0.62, 2.3)], 0.035, 5).color(DARK)
    lay_down(upper, 3.3, (0.3, -1.9, 0.25), yaw=8, pitch=-14, roll=3)
    # Hips and legs came to rest a little apart, one knee still raised.
    with a.group() as lower:
        a.box(0.78, 0.56, 0.44, bevel=0.08).move(0, 0, 2.12).color(DARK, FRAME)
        titan_leg(a, -1, hip=-40, knee=82)
        titan_leg(a, 1, hip=5, knee=10)
    lay_down(lower, 2.5, (-0.3, 0.1, -0.08), yaw=-14, pitch=4, roll=-6)
    # Moss drapes the shell where it meets the ground and pools in the hollows.
    moss(
        a,
        [
            (1.05, -1.45, 0.34, 0.62, 0.34),
            (-0.98, -2.15, 0.62, 0.52, 0.4),
            (0.38, -2.2, 1.0, 0.36, 0.3),
            (1.0, -3.3, 0.1, 0.44, 0.34),
            (2.55, -2.35, 0.2, 0.46, 0.38),
            (-0.72, -4.35, 0.14, 0.36, 0.4),
            (-1.0, 1.0, 0.26, 0.56, 0.36),
            (0.42, 1.5, 0.5, 0.34, 0.4),
            (-1.15, 2.75, 0.2, 0.4, 0.4),
            (-0.5, -0.5, 0.06, 0.5, 0.3),
        ],
    )
    # A sapling has taken the gap where the waist broke.
    parts.trunk(a, 1.1, 0.07, lean=0.12).move(0.2, -0.5, -0.05)
    parts.canopy(
        a,
        [(0.32, -0.5, 1.26, 0.38, 0.86), (0.1, -0.42, 1.5, 0.27, 0.86), (0.54, -0.62, 1.1, 0.25, 0.8)],
        seed=5,
        part="base",
        low=P.LEAF_DEEP,
        high=P.LEAF,
    )
    # Centre the sprawl on the footprint the world layouts reserve for it.
    for piece in a.pieces:
        piece.move(0.1, 0.9, 0)


# --------------------------------------------------------------------------------------------
# Towers
# --------------------------------------------------------------------------------------------
def radius_at(profile, z):
    """Radius of a lathe profile of (radius, z) points at height z."""
    for (r0, z0), (r1, z1) in zip(profile, profile[1:]):
        if z0 <= z <= z1:
            return r0 + (r1 - r0) * (z - z0) / ((z1 - z0) or 1.0)
    return profile[-1][0] if z > profile[-1][1] else profile[0][0]


def polar(r, degrees, z=0.0):
    return (math.cos(math.radians(degrees)) * r, math.sin(math.radians(degrees)) * r, z)


def lamp_drum(a, r=0.3, colour=P.GLOW_WHITE):
    """A searchlight drum at the origin, aimed toward -y, lens at y = -r * 1.1."""
    with a.group() as g:
        a.lathe(
            [(r * 0.5, 0), (r * 0.9, r * 0.3), (r, r * 1.5), (r * 1.1, r * 1.56), (r * 1.1, r * 1.9), (r * 0.92, r * 1.9)], 12
        ).rot(x=90).move(0, r * 0.8, 0).color(DARK, FRAME)
        a.cyl(r * 0.92, 0.03, 12, bevel=0).rot(x=90).move(0, -r * 1.085, 0).part("glow").color(colour)
    return g


@asset("panopticon", tint="#5d6168", budget=4500)
def panopticon(a):
    # Fortified base: a battered octagonal bastion on a skirt, braced by four buttresses.
    a.cyl(1.8, 0.16, 8, bevel=0.03, grounded=True).rot(z=22.5).color(DARK, FRAME)
    a.cyl(1.72, 1.25, 8, r2=1.36, bevel=0.06, grounded=True).rot(z=22.5).part("tint").color(P.SHADE_3, P.SHADE_2)
    a.annulus(1.42, 1.06, 0.16, sides=8, bevel=0.03).rot(z=22.5).move(0, 0, 1.22).color(DARK, FRAME)
    for k in range(4):
        a.profile_y([(0.78, 0.0), (1.76, 0.0), (1.76, 0.42), (1.02, 2.7), (0.78, 2.7)], 0.3, bevel=0.04).rot(z=45 + 90 * k).part(
            "tint"
        ).color(P.SHADE_3, P.SHADE_1)
    # Gatehouse with a blast door and a red lamp.
    a.box(0.92, 0.5, 0.96, bevel=0.05, grounded=True).move(0, -1.52, 0).part("tint").color(P.SHADE_3, P.SHADE_2)
    a.box(0.5, 0.05, 0.66, bevel=0.015).move(0, -1.775, 0.0).color(DARK)
    a.box(0.03, 0.06, 0.66, bevel=0).move(0, -1.78, 0.0).color(FRAME)
    a.box(0.62, 0.08, 0.07, bevel=0.02).move(0, -1.78, 0.68).part("metal").color(P.STEEL_DARK)
    light(a, (0, -1.79, 0.84), 0.045, P.GLOW_RED, 6)
    # The shaft tapers upward between four dark ribs.
    shaft = [(1.04, 1.25), (0.9, 1.55), (0.68, 3.6), (0.56, 5.6), (0.5, 6.95)]
    a.lathe(shaft, 12, cap_bottom=False, cap_top=False, turn=math.radians(15)).part("tint").color(P.SHADE_2, P.WHITE)
    for k in range(4):
        m = 45 + 90 * k
        bar(a, polar(0.86, m, 2.4), polar(0.57, m, 6.95), 0.12, 0.16, bevel=0.02, side=polar(1, m + 90)).part("tint").color(
            P.SHADE_3, P.SHADE_2
        )
    for z in (3.3, 5.2):
        collar(a, (0, 0, z), radius_at(shaft, z) + 0.035, 0.07, "z", 12, P.GLOW_RED, "glow").rot(z=15)
    for z in (2.3, 3.0, 4.1, 4.8, 5.9, 6.5):
        r = radius_at(shaft, z) * math.cos(math.radians(15))
        a.box(0.09, 0.03, 0.26, bevel=0).move(0, -r - 0.006, z).part("glass").color(DARK, P.GLASS_DARK)
    # Observation deck: a corbel, a ring of dark outward-leaning windows and a heavy brim.
    a.lathe(
        [(0.5, 6.8), (0.62, 6.96), (1.3, 7.36), (1.44, 7.38), (1.44, 7.5), (1.2, 7.52)], 16, cap_bottom=False, cap_top=False
    ).part("tint").color(P.SHADE_3, P.SHADE_1)
    a.lathe([(1.2, 7.5), (1.5, 8.12)], 16, cap_bottom=False, cap_top=False).part("glass").color(DARK, P.GLASS_DARK)
    for k in range(16):
        m = 360 / 16 * k
        bar(a, polar(1.21, m, 7.5), polar(1.51, m, 8.12), 0.07, 0.05, bevel=0, side=polar(1, m)).part("tint").color(P.SHADE_1)
    a.lathe(
        [(1.2, 8.1), (1.62, 8.1), (1.7, 8.16), (1.7, 8.3), (1.56, 8.4), (0.6, 8.46)], 16, cap_bottom=False, cap_top=False
    ).part("tint").color(P.SHADE_1, P.WHITE)
    a.lathe([(1.708, 8.2), (1.708, 8.26)], 16, cap_bottom=False, cap_top=False).part("glow").color(P.GLOW_RED)
    for k in range(8):
        m = 22.5 + 45 * k
        x, y, _ = polar(1.58, m)
        a.cone(0.035, 0.34 if k % 2 else 0.56, 5).move(x, y, 8.38).part("metal").color(P.STEEL_DARK, P.STEEL)
    # Camera pods hang under the deck, one over each buttress.
    for k in range(4):
        m = 45 + 90 * k
        with a.group() as pod:
            a.box(0.1, 0.34, 0.08, bevel=0.02).move(0, -0.13, 0.0).part("metal").color(P.STEEL_DARK)
            a.box(0.2, 0.34, 0.18, bevel=0.04).move(0, -0.4, -0.2).rot(x=-24, pivot=(0, -0.3, -0.1)).color(DARK, FRAME)
            a.box(0.1, 0.03, 0.09, bevel=0).move(0, -0.535, -0.3).rot(x=-24, pivot=(0, -0.3, -0.1)).part("glow").color(P.GLOW_RED)
        pod.move(0, -1.36, 7.34).rot(z=m + 90)
    # Crown: a turntable carrying two searchlights under a small dome.
    a.cyl(0.74, 0.28, 12, bevel=0.04).move(0, 0, 8.44).color(DARK, FRAME)
    a.cyl(0.44, 0.5, 12, bevel=0.03).move(0, 0, 8.72).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.dome(0.44, 0.3, 12, 3).move(0, 0, 9.22).part("tint").color(P.SHADE_1, P.WHITE)
    for facing in (0, 180):
        a.box(0.2, 0.36, 0.14, bevel=0.03).move(0, -0.52, 8.9).rot(z=facing).part("metal").color(P.STEEL_DARK)
        lamp_drum(a, 0.3).rot(x=12).move(0, -0.82, 9.0).rot(z=facing)
    # Antenna cluster.
    a.tube([(0, 0, 9.48), (0, 0, 10.4)], [0.04, 0.02], 6).part("metal").color(P.STEEL)
    for z, w in ((9.86, 0.5), (10.1, 0.34)):
        a.box(w, 0.03, 0.03, bevel=0).move(0, 0, z).part("metal").color(P.STEEL)
    light(a, (0, 0, 10.44), 0.065, P.GLOW_RED, 6)
    a.tube([(0.22, 0.14, 9.4), (0.3, 0.2, 10.02)], 0.016, 4).part("metal").color(P.STEEL)
    a.tube([(-0.2, 0.16, 9.4), (-0.27, 0.22, 9.82)], 0.016, 4).part("metal").color(P.STEEL)
    # A relay dish on the brim.
    a.cyl(0.035, 0.26, 6, bevel=0).move(-1.05, 0.6, 8.4).part("metal").color(P.STEEL_DARK)
    a.lathe([(0.0, 0.0), (0.16, 0.03), (0.26, 0.12), (0.27, 0.13), (0.15, 0.06), (0.0, 0.04)], 10).rot(x=-60).rot(z=60).move(
        -1.05, 0.6, 8.68
    ).part("metal").color(P.STEEL, P.CHROME)


def planting(a, r_in, r_out, z, count, phase=0.0, seed=1):
    """Small trees, shrubs and trailing vines on a terrace ring."""
    mid = (r_in + r_out) / 2
    for i in range(count):
        m = phase + 360 / count * i
        x, y, _ = polar(mid + (0.05 if i % 2 else -0.03), m)
        h = 0.26 + 0.1 * ((i * 7 + seed) % 3)
        a.tube([(x, y, z), (x * 1.02, y * 1.02, z + h)], [0.04, 0.028], 5).color(P.BARK)
        a.blob(0.27 + 0.03 * ((i + seed) % 2), 2, (1, 1, 0.9), lumps=0.2, seed=seed * 5 + i).move(x * 1.02, y * 1.02, z + h + 0.17).color(
            P.LEAF_DEEP, P.LEAF if i % 2 else P.LIME
        )
        # A shrub beside it and a vine spilling over the rim.
        bx, by, _ = polar(mid + 0.08, m + 180 / count)
        a.blob(0.16, 1, (1, 1, 0.8), lumps=0.2, seed=seed * 3 + i).move(bx, by, z + 0.09).color(P.LEAF_DEEP, P.LEAF)
        vx, vy, _ = polar(r_out + 0.015, m + 180 / count + 14)
        a.blob(0.13, 1, (0.9, 0.9, 2.3 + 0.5 * (i % 2)), lumps=0.22, seed=seed * 11 + i).move(vx, vy, z - 0.12 - 0.05 * (i % 2)).color(
            P.LEAF_DEEP, P.LEAF
        )


@asset("garden-spire", tint="#f6f4ee", budget=4500)
def garden_spire(a):
    # Stepped stone plinth.
    a.lathe(
        [(1.52, 0.0), (1.52, 0.13), (1.45, 0.2), (1.22, 0.2), (1.22, 0.33), (1.15, 0.4), (0.85, 0.4)], 20, cap_bottom=False, cap_top=False
    ).color(P.STONE, P.SAND)
    # A soaring white shaft.
    shaft = [(0.94, 0.38), (0.74, 0.95), (0.6, 1.95), (0.5, 3.4), (0.42, 5.6), (0.35, 7.6), (0.3, 8.72)]
    a.lathe(shaft, 16, cap_bottom=False).part("tint").color(P.SHADE_1, P.WHITE)
    # Three fins sweep up from the plinth to carry the first garden.
    for m in (90, 210, 330):
        a.profile_y(
            [(0.5, 0.4), (1.4, 0.4), (1.36, 0.56), (1.02, 1.0), (0.86, 1.72), (0.5, 1.72)], 0.1, bevel=0.03
        ).rot(z=m).part("tint").color(P.SHADE_1, P.WHITE)
    # A warm doorway.
    a.profile_y([(-0.3, 0.38), (0.3, 0.38), (0.3, 0.92), (0.17, 1.12), (-0.17, 1.12), (-0.3, 0.92)], 0.4, bevel=0.04).move(
        0, -0.78, 0
    ).part("tint").color(P.SHADE_1, P.WHITE)
    a.profile_y([(-0.17, 0.4), (0.17, 0.4), (0.17, 0.82), (0.09, 0.96), (-0.09, 0.96), (-0.17, 0.82)], 0.04, bevel=0).move(
        0, -0.985, 0
    ).part("glow").color(P.LAMP)
    a.box(0.8, 0.3, 0.08, bevel=0.02).move(0, -1.08, 0.36).color(P.STONE, P.SAND)
    # Hanging gardens on three saucers.
    for i, (z, r, count) in enumerate(((2.1, 1.5, 5), (4.4, 1.14, 4), (6.5, 0.84, 3))):
        r0, r1 = radius_at(shaft, z - 0.5), radius_at(shaft, z + 0.08)
        under = [(r0 * 0.98, z - 0.5), (r * 0.62, z - 0.3), (r * 0.95, z - 0.07), (r, z)]
        a.lathe(under + [(r, z + 0.12), (r - 0.07, z + 0.14), (r - 0.09, z + 0.07)], 20, cap_bottom=False, cap_top=False).part(
            "tint"
        ).color(P.SHADE_2, P.WHITE)
        a.lathe([(r - 0.09, z + 0.075), (r1 * 0.98, z + 0.075)], 20, cap_bottom=False, cap_top=False).color(P.MOSS)
        # A warm line of light under each rim.
        a.lathe([(r * 0.8, z - 0.19), (r * 0.92, z - 0.105)], 20, cap_bottom=False, cap_top=False).part("glow").color(P.LAMP)
        planting(a, r1, r - 0.09, z + 0.075, count, phase=25 + 47 * i, seed=i + 2)
    # Slim window strips between the gardens.
    for z0, z1 in ((2.5, 3.8), (4.8, 5.95), (6.9, 8.4)):
        for m in (45, 135, 225, 315):
            p0 = polar(radius_at(shaft, z0) * 0.985, m + 12, z0)
            p1 = polar(radius_at(shaft, z1) * 0.985, m + 12, z1)
            bar(a, p0, p1, 0.035, 0.1, bevel=0, side=polar(1, m + 12)).part("glass").color(P.GLASS_TINTED, P.GLASS)
    # Lantern: a glass cupola and a light that carries.
    collar(a, (0, 0, 8.74), 0.42, 0.1, "z", 16, P.WHITE, "tint")
    a.lathe([(0.34, 8.78), (0.38, 8.98), (0.32, 9.24), (0.16, 9.44), (0.1, 9.48)], 12, cap_bottom=False, cap_top=False).part("glass").color(
        P.GLASS_TINTED, P.GLASS
    )
    a.torus(0.26, 0.022, 14, 4).move(0, 0, 9.56).part("metal").color(P.GOLD)
    a.lathe([(0.09, 9.46), (0.13, 9.6), (0.08, 9.84), (0.0, 10.15)], 8, cap_bottom=False).part("glow").color(P.GLOW_WHITE)


def braid(i, t, strands=3, twist=1.1, height=8.75):
    """Centre, radius and bearing of trunk `i` of the bio-spire at t (0 at the root, 1 at the crown)."""
    z = 0.3 + (height - 0.3) * t
    spread = 0.15 + 0.92 * (1 - t) ** 5 + 0.5 * math.sin(math.pi * t) ** 1.25
    m = 30 + 360 * i / strands + 360 * twist * t**0.9
    x, y, _ = polar(spread, m)
    r = 0.34 - 0.2 * t + 0.07 * (1 - t) ** 8
    return Vector((x, y, z)), r, m


@asset("bio-spire", tint="#c46ad0", budget=4500)
def bio_spire(a):
    steps = 16
    for i in range(3):
        # Each trunk starts as a root tip that dives into the ground.
        p0, r0, m0 = braid(i, 0.0)
        pts = [Vector(polar(1.5, m0 - 16, -0.02)), Vector(polar(1.3, m0 - 9, 0.14))]
        radii = [0.1, 0.26]
        for k in range(steps + 1):
            q, r, _ = braid(i, k / steps)
            pts.append(q)
            radii.append(r)
        a.tube(pts, radii, 8, caps="round").part("tint").color(P.SHADE_3, P.WHITE)
        # A buttress root between each pair of trunks.
        m = m0 + 78
        a.tube(
            [polar(0.3, m + 30, 1.5), polar(0.78, m + 12, 0.86), polar(1.16, m, 0.22), polar(1.34, m - 6, -0.04)],
            [0.17, 0.15, 0.11, 0.05],
            6,
            caps="round",
        ).part("tint").color(P.SHADE_3, P.SHADE_1)
    # Membranes webbed between neighbouring trunks, like panes in a grown window.
    for i, (t0, t1) in enumerate(((0.16, 0.36), (0.4, 0.6), (0.62, 0.8), (0.27, 0.46), (0.5, 0.69))):
        i3 = i % 3
        j = (i3 + 1) % 3
        n = 5
        verts, faces = [], []
        for v in range(n + 1):
            for u in range(n + 1):
                fu = u / n
                sag = 0.2 * (t1 - t0) * 4 * fu * (1 - fu)
                t = t0 + sag + (t1 - t0 - 2 * sag) * v / n
                pa, _, _ = braid(i3, t)
                pb, _, _ = braid(j, t)
                q = pa.lerp(pb, 0.1 + 0.8 * fu)
                # Belly the web outward a little, away from the axis.
                bulge = 0.12 * 4 * fu * (1 - fu) * math.sin(math.pi * v / n)
                out = Vector((q.x, q.y, 0))
                if out.length > 1e-4:
                    q = q + out.normalized() * bulge
                verts.append(q)
        for v in range(n):
            for u in range(n):
                q = v * (n + 1) + u
                faces.append((q, q + 1, q + n + 2, q + n + 1))
        a.raw(verts, faces).solidify(0.04, 0.0).part("glass").color(P.MAGENTA, P.PINK)
    # Luminous bulbs hang from curling stalks.
    pods = (
        (0.2, 0, 0.3), (0.31, 1, 0.29), (0.41, 2, 0.27), (0.51, 0, 0.26),
        (0.61, 1, 0.24), (0.7, 2, 0.22), (0.79, 0, 0.2), (0.87, 1, 0.18),
    )
    for k, (t, i, size) in enumerate(pods):
        q, r, m = braid(i, t)
        out = Vector(polar(1, m))
        up = Vector((0, 0, 1))
        reach = size * 1.4
        tip = q + out * (r + reach) + up * size * 1.2
        a.tube(
            [q + out * r * 0.4, q + out * (r + reach * 0.45) + up * size * 1.5, q + out * (r + reach * 0.85) + up * size * 1.7, tip],
            [0.1, 0.075, 0.055, 0.04],
            6,
        ).part("tint").color(P.SHADE_2, P.WHITE)
        colour = P.GLOW_MAGENTA if k % 2 else P.GLOW_CYAN
        a.lathe(
            [(0.0, 0.0), (size * 0.7, size * 0.3), (size, size * 0.95), (size * 0.72, size * 1.7), (size * 0.26, size * 2.25), (0.05, size * 2.5)],
            8,
        ).move(tip.x, tip.y, tip.z - size * 2.46).part("glow").color(colour)
        a.lathe([(0.07, 0.0), (size * 0.42, -size * 0.3), (size * 0.5, -size * 0.62)], 8, cap_bottom=False, cap_top=False).solidify(
            0.025, 0.0
        ).move(tip.x, tip.y, tip.z + 0.03).part("tint").color(P.SHADE_2, P.WHITE)
    # The crown: sepals clasp one great bud of light.
    for i in range(3):
        _, _, m = braid(i, 1.0)
        m += 60
        a.tube(
            [polar(0.16, m, 8.56), polar(0.54, m, 8.82), polar(0.68, m, 9.26), polar(0.58, m, 9.7), polar(0.4, m, 9.96)],
            [0.14, 0.12, 0.09, 0.06, 0.03],
            6,
            caps="round",
        ).part("tint").color(P.SHADE_2, P.WHITE)
    a.lathe([(0.0, 8.58), (0.3, 8.76), (0.5, 9.16), (0.46, 9.58), (0.24, 10.04), (0.0, 10.35)], 10).part("glow").color(P.GLOW_MAGENTA)


@asset("monolith", tint="#14161c", budget=4500)
def monolith(a):
    stone = jk.shade(P.CHARCOAL, -0.12)
    # A subtle two-step base and a shadow gap, so the slab seems barely to touch the ground.
    a.box(3.3, 2.8, 0.1, bevel=0.03, grounded=True).color(stone, P.CHARCOAL)
    a.box(2.46, 1.5, 0.1, bevel=0.03).move(0, 0, 0.1).color(stone, P.CHARCOAL)
    a.box(1.7, 0.34, 0.06, bevel=0).move(0, 0, 0.195).color(DARK)
    # The slab.
    a.box(1.86, 0.48, 5.6, bevel=0.016, segments=2).move(0, 0, 0.25).part("metal").color(P.SHADE_1, P.WHITE)
    # One thin line of light crosses the base, climbs the face and returns down the back.
    x = 0.355
    w = 0.03
    for s in (-1, 1):
        a.box(w, 0.012, 5.6, bevel=0).move(x, s * 0.243, 0.25).part("glow").color(P.GLOW_CYAN)
        a.box(w, 0.5, 0.012, bevel=0).move(x, s * 0.49, 0.192).part("glow").color(P.GLOW_CYAN)
        a.box(w, 0.6, 0.012, bevel=0).move(x, s * 1.07, 0.092).part("glow").color(P.GLOW_CYAN)
        a.box(w, 0.012, 0.1, bevel=0).move(x, s * 0.753, 0.098).part("glow").color(P.GLOW_CYAN)
    a.box(w, 0.48, 0.012, bevel=0).move(x, 0, 5.842).part("glow").color(P.GLOW_CYAN)


# --------------------------------------------------------------------------------------------
# Machines and launch sites
# --------------------------------------------------------------------------------------------
def lerp3(p, q, t):
    return tuple(p[i] + (q[i] - p[i]) * t for i in range(3))


def brace(a, chord_a, chord_b, r=0.03, battens=True, colour=P.SHADE_1, part="tint"):
    """Zig-zag bracing (and optional battens) between two chords given as matching point lists."""
    for k in range(len(chord_a) - 1):
        p, q = (chord_a[k], chord_b[k + 1]) if k % 2 == 0 else (chord_b[k], chord_a[k + 1])
        rod(a, p, q, r, 4).part(part).color(colour)
    if battens:
        for p, q in zip(chord_a, chord_b):
            rod(a, p, q, r, 4).part(part).color(colour)


@asset("excavator", tint="#e0a830", budget=4500)
def excavator(a):
    # Crawler tracks.
    half = 2.15
    for side in (-1, 1):
        x = side * 1.14
        a.profile_x(
            [(-half + 0.34, 0), (half - 0.34, 0), (half, 0.26), (half, 0.56), (half - 0.34, 0.82), (-half + 0.34, 0.82), (-half, 0.56), (-half, 0.26)],
            0.72,
            bevel=0.05,
        ).move(x, 0, 0).color(DARK, FRAME)
        for k in range(11):
            a.box(0.76, 0.13, 0.05, bevel=0).move(x, -1.7 + k * 0.34, 0.8).color(FRAME)
        ox = x + side * 0.37
        for y in (-1.2, -0.6, 0.0, 0.6, 1.2):
            drum(a, (ox, y, 0.27), 0.2, 0.06, "x", 8, bevel=0).part("metal").color(P.STEEL_DARK)
        for y in (-1.76, 1.76):
            drum(a, (ox, y, 0.41), 0.31, 0.07, "x", 10, bevel=0).part("metal").color(P.STEEL)
            drum(a, (ox + side * 0.03, y, 0.41), 0.12, 0.05, "x", 6, bevel=0).color(DARK)
        a.box(0.07, 3.1, 0.16, bevel=0.025).move(ox, 0, 0.5).part("tint").color(P.SHADE_2, P.SHADE_1)
    # Undercarriage and slewing ring.
    a.box(1.7, 2.5, 0.42, bevel=0.06).move(0, 0, 0.42).color(DARK, FRAME)
    a.cyl(0.95, 0.24, 16, bevel=0.04).move(0, 0, 0.84).part("metal").color(P.STEEL_DARK, P.STEEL)
    # Turning deck, machine house and the operator's cab.
    a.box(2.5, 3.3, 0.2, bevel=0.05).move(0, 0.25, 1.06).part("tint").color(P.SHADE_3, P.SHADE_1)
    a.box(1.5, 1.8, 1.12, bevel=0.07).move(-0.4, 0.85, 1.26).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(1.62, 1.92, 0.1, bevel=0.03).move(-0.4, 0.85, 2.38).part("tint").color(P.SHADE_2, P.SHADE_1)
    for k in range(3):
        a.box(0.04, 0.9, 0.09, bevel=0).move(-1.16, 0.85, 1.62 + k * 0.2).color(DARK)
    a.box(0.04, 0.42, 0.72, bevel=0).move(0.36, 1.2, 1.3).color(FRAME)
    a.cyl(0.09, 0.56, 8, bevel=0.02).move(-0.85, 1.42, 2.46).part("metal").color(P.STEEL_DARK, P.STEEL)
    a.box(0.8, 0.96, 0.22, bevel=0.05).move(0.8, -0.82, 1.26).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.box(0.72, 0.88, 0.6, bevel=0.05).move(0.8, -0.82, 1.48).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    a.box(0.84, 1.02, 0.1, bevel=0.03).move(0.8, -0.8, 2.08).part("tint").color(P.SHADE_1, P.WHITE)
    for sx, sy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        a.box(0.06, 0.06, 0.62, bevel=0).move(0.8 + sx * 0.35, -0.82 + sy * 0.43, 1.47).part("tint").color(P.SHADE_1)
    # A-frame mast.
    top = (0.0, -0.1, 4.42)
    for side in (-1, 1):
        bar(a, (side * 0.7, 0.2, 1.24), (side * 0.1, -0.1, 4.46), 0.2, 0.24, bevel=0.03).part("tint").color(P.SHADE_2, P.WHITE)
    a.box(0.86, 0.14, 0.12, bevel=0.02).move(0, 0.04, 2.9).part("tint").color(P.SHADE_1)
    a.box(0.5, 0.34, 0.24, bevel=0.05).move(0, -0.1, 4.36).color(DARK, FRAME)
    beacon(a, (0, -0.1, 4.6), 0.05, P.GLOW_RED)
    # The wheel boom: a triangular lattice carrying the conveyor out to the wheel.
    hub = (0.0, -5.12, 1.12)
    n = 7
    low = {s: [lerp3((s * 0.36, -1.1, 1.5), (s * 0.3, -4.75, 1.08), k / n) for k in range(n + 1)] for s in (-1, 1)}
    ridge = [lerp3((0, -0.95, 2.4), (0, -4.6, 1.5), (k + 0.5) / n) for k in range(n)]
    for s in (-1, 1):
        bar(a, low[s][0], (s * 0.3, hub[1], hub[2]), 0.09, 0.09, bevel=0.015, side=(1, 0, 0)).part("tint").color(P.SHADE_1, P.WHITE)
        for k in range(n):
            rod(a, low[s][k], ridge[k], 0.032, 4).part("tint").color(P.SHADE_1)
            rod(a, ridge[k], low[s][k + 1], 0.032, 4).part("tint").color(P.SHADE_1)
    for k in range(n + 1):
        rod(a, low[-1][k], low[1][k], 0.03, 4).part("tint").color(P.SHADE_2)
    bar(a, (0, -0.8, 2.42), (0, -4.72, 1.47), 0.09, 0.09, bevel=0.015).part("tint").color(P.SHADE_1, P.WHITE)
    bar(a, (0, -1.0, 1.54), (0, -4.5, 1.14), 0.4, 0.05, bevel=0).color(DARK)
    for k, t in enumerate((0.2, 0.42, 0.6, 0.82)):
        p = lerp3((0, -1.0, 1.62), (0, -4.5, 1.22), t)
        a.blob(0.11, 1, (1.2, 1.1, 0.7), lumps=0.3, seed=k + 3).move(p[0] + 0.05 * (k % 2), p[1], p[2]).color(P.WALNUT, P.CLAY)
    # Stays from the mast head.
    for p in ((0, -2.9, 1.92), (0, -4.6, 1.52)):
        rod(a, top, p, 0.022, 4).part("metal").color(P.STEEL_DARK)
    for side in (-1, 1):
        rod(a, top, (side * 0.6, 2.4, 2.66), 0.022, 4).part("metal").color(P.STEEL_DARK)
    # The bucket wheel.
    with a.group() as wheel:
        a.annulus(0.8, 0.58, 0.3, sides=16, bevel=0.04).move(0, 0, -0.15).rot(y=90).part("tint").color(P.SHADE_2, P.WHITE)
        for k in range(3):
            a.box(0.12, 1.2, 0.09, bevel=0.02).move(0, 0, -0.045).rot(x=60 * k + 30).color(FRAME)
        for k in range(8):
            with a.group() as bucket:
                a.box(0.42, 0.4, 0.26, bevel=0.04, taper=(0.9, 0.62)).color(P.GUNMETAL, P.STEEL_DARK)
                a.box(0.44, 0.07, 0.12, bevel=0.02).move(0, 0.15, 0.2).part("metal").color(P.STEEL, P.CHROME)
            bucket.move(0, 0, 0.76).rot(x=45 * k)
    wheel.move(*hub)
    joint(a, hub, 0.2, 0.8, "x", 10)
    # Counterweight boom.
    bar(a, (0, 1.3, 1.9), (0, 2.5, 2.52), 0.9, 0.26, bevel=0.04).part("tint").color(P.SHADE_2, P.WHITE)
    a.box(1.7, 0.72, 0.74, bevel=0.07).move(0, 2.36, 2.1).color(P.CONCRETE_DARK, P.CONCRETE)
    for side in (-1, 1):
        a.box(0.3, 0.74, 0.76, bevel=0.02).move(side * 0.5, 2.36, 2.09).color(FRAME)
    # Discharge conveyor off the back corner.
    bar(a, (-0.95, 1.2, 1.36), (-1.32, 2.62, 1.86), 0.34, 0.16, bevel=0.03, side=(1, 0.26, 0)).part("tint").color(P.SHADE_2, P.SHADE_1)
    bar(a, (-0.95, 1.2, 1.46), (-1.32, 2.6, 1.96), 0.26, 0.04, bevel=0, side=(1, 0.26, 0)).color(DARK)
    drum(a, (-1.33, 2.63, 1.93), 0.1, 0.36, "x", 8, bevel=0.02).rot(z=14.6, pivot=(-1.33, 2.63, 1.93)).part("metal").color(P.STEEL_DARK)
    # Work lights.
    for p in ((1.2, -1.34, 1.26), (-1.2, -1.34, 1.26)):
        light(a, (p[0], p[1], p[2] + 0.05), 0.06, P.GLOW_ORANGE, 6)
    a.box(0.3, 0.06, 0.08, bevel=0.02).move(0.8, -1.3, 2.1).part("glow").color(P.GLOW_WHITE)


@asset("launch-site", tint="#f2f2f2", budget=4500)
def launch_site(a):
    # The pad: an octagonal slab with a painted ring and a flame trench to the front.
    a.cyl(3.18, 0.3, 8, bevel=0.05, grounded=True).rot(z=22.5).color(P.CONCRETE_DARK, P.CONCRETE)
    a.lathe([(2.62, 0.306), (2.5, 0.306)], 24, cap_bottom=False, cap_top=False).color(P.AMBER)
    a.box(1.0, 2.1, 0.02, bevel=0).move(0, -1.86, 0.292).color(DARK)
    for side in (-1, 1):
        a.box(0.14, 2.06, 0.16, bevel=0.03).move(side * 0.58, -1.84, 0.28).color(P.CONCRETE_DARK, P.CONCRETE)
    for k in range(8):
        x, y, _ = polar(2.9, 22.5 + 45 * k)
        a.box(0.13, 0.13, 0.07, bevel=0).rot(z=22.5 + 45 * k).move(x, y, 0.29).part("glow").color(P.GLOW_ORANGE)
    # Launch mount with four hold-down posts.
    a.box(1.9, 1.9, 0.52, bevel=0.08, taper=0.86).move(0, 0, 0.28).color(P.GUNMETAL, P.STEEL_DARK)
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box(0.2, 0.2, 0.5, bevel=0.04, taper=0.8).move(sx * 0.46, sy * 0.46, 0.78).color(FRAME)
    # The rocket: a white core with a wide fairing and two strap-on boosters.
    z0 = 0.98
    core = [
        (0.36, z0), (0.5, z0 + 0.14), (0.55, z0 + 0.36), (0.55, 4.34), (0.55, 5.76), (0.66, 5.98), (0.66, 6.56),
        (0.54, 7.02), (0.32, 7.4), (0.12, 7.6), (0.0, 7.66),
    ]
    a.lathe(core, 14).part("tint").color(P.SHADE_1, P.WHITE)
    a.lathe([(0.3, z0 - 0.16), (0.37, z0 + 0.01), (0.51, z0 + 0.15), (0.56, z0 + 0.34), (0.56, z0 + 0.5)], 14, cap_top=False).color(DARK, FRAME)
    collar(a, (0, 0, 4.45), 0.565, 0.2, "z", 14, FRAME, "base", caps=False)
    collar(a, (0, 0, 5.84), 0.6, 0.06, "z", 14, P.RED, "base", caps=False)
    for side in (-1, 1):
        bx = side * 0.87
        a.lathe([(0.2, z0), (0.3, z0 + 0.16), (0.3, 3.5), (0.22, 3.86), (0.08, 4.14), (0.0, 4.2)], 10).move(bx, 0, 0).part("tint").color(
            P.SHADE_1, P.WHITE
        )
        a.lathe([(0.16, z0 - 0.14), (0.21, z0 + 0.01), (0.31, z0 + 0.17), (0.31, z0 + 0.3)], 10, cap_top=False).move(bx, 0, 0).color(DARK, FRAME)
        collar(a, (bx, 0, 3.5), 0.31, 0.06, "z", 10, P.RED, "base", caps=False)
        for z in (1.7, 3.1):
            a.box(0.14, 0.1, 0.08, bevel=0.02).move(side * 0.57, 0, z).color(FRAME)
        a.profile_y([(1.14, z0 + 0.04), (1.5, z0 + 0.04), (1.5, z0 + 0.2), (1.16, z0 + 0.86)], 0.06, bevel=0.015).scale(side, 1, 1).color(FRAME)
    # Service tower behind the rocket, with swing arms and a lightning mast.
    red = jk.shade(P.RED, -0.1)
    ty, hw, base, head = 2.06, 0.42, 0.3, 7.08
    corners = [(-hw, ty - hw), (hw, ty - hw), (hw, ty + hw), (-hw, ty + hw)]
    levels = [base + (head - base) * k / 6 for k in range(7)]
    for x, y in corners:
        bar(a, (x, y, base), (x, y, head), 0.1, 0.1, bevel=0.02).color(jk.shade(red, -0.15), red)
    for face in range(4):
        (x0, y0), (x1, y1) = corners[face], corners[(face + 1) % 4]
        brace(a, [(x0, y0, z) for z in levels], [(x1, y1, z) for z in levels], 0.03, battens=True, colour=red, part="base")
    a.box(1.16, 1.16, 0.1, bevel=0.03).move(0, ty, head).color(FRAME)
    bar(a, (0, ty + 0.5, head + 0.24), (0, ty - 1.5, head + 0.24), 0.18, 0.18, bevel=0.03, side=(1, 0, 0)).color(jk.shade(red, -0.15), red)
    a.box(0.3, 0.4, 0.2, bevel=0.04).move(0, ty, head + 0.1).color(FRAME)
    a.tube([(0, ty + 0.2, head + 0.3), (0, ty + 0.2, 7.94)], [0.035, 0.018], 5).part("metal").color(P.STEEL)
    light(a, (0, ty + 0.2, 7.98), 0.06, P.GLOW_RED, 6)
    for z, reach, swing in ((2.5, 0.57, 0), (4.9, 0.57, 0), (6.3, 0.68, 0)):
        with a.group() as arm:
            a.box(0.24, ty - hw - reach - 0.06, 0.16, bevel=0.03).move(0, -(ty - hw - reach - 0.06) / 2, 0).part("metal").color(P.STEEL_DARK, P.STEEL)
            a.box(0.36, 0.1, 0.3, bevel=0.03).move(0, -(ty - hw - reach - 0.01), -0.07).color(FRAME)
        arm.rot(z=swing).move(0, ty - hw, z)
        a.box(1.0, 1.0, 0.06, bevel=0.02).move(0, ty, z - 0.08).color(FRAME)
    # Propellant farm: a sphere and a tall tank, piped to the mount.
    a.cyl(0.4, 0.5, 10, bevel=0.03).move(-2.12, 0.8, 0.28).color(P.CONCRETE_DARK, P.CONCRETE)
    a.sphere(0.62, 14, 9).move(-2.12, 0.8, 1.2).part("tint").color(P.SHADE_2, P.WHITE)
    collar(a, (-2.12, 0.8, 1.2), 0.635, 0.08, "z", 14, P.STEEL, caps=False)
    a.cyl(0.46, 0.14, 12, bevel=0.03).move(-2.18, -0.62, 0.28).color(P.CONCRETE_DARK, P.CONCRETE)
    a.capsule(0.4, 1.8, 12, 3).move(-2.18, -0.62, 0.38).part("tint").color(P.SHADE_2, P.WHITE)
    collar(a, (-2.18, -0.62, 1.28), 0.41, 0.07, "z", 12, P.STEEL, caps=False)
    a.tube([(-1.56, 0.8, 0.92), (-1.3, 0.8, 0.5), (-1.1, 0.5, 0.4), (-0.9, 0.3, 0.4)], 0.06, 6).part("metal").color(P.STEEL)
    a.tube([(-1.8, -0.62, 0.7), (-1.5, -0.6, 0.42), (-1.1, -0.36, 0.4), (-0.9, -0.3, 0.4)], 0.06, 6).part("metal").color(P.STEEL)
    # Floodlight masts at the front corners.
    for side in (-1, 1):
        x, y = side * 2.2, -1.7
        a.tube([(x, y, 0.3), (x, y, 2.5)], [0.06, 0.04], 6).part("metal").color(P.STEEL_DARK, P.STEEL)
        with a.group() as lamps:
            a.box(0.5, 0.12, 0.2, bevel=0.03).move(0, 0, -0.1).color(FRAME)
            a.box(0.42, 0.03, 0.13, bevel=0).move(0, 0.066, -0.065).part("glow").color(P.GLOW_WHITE)
        lamps.rot(x=-20).rot(z=side * 50).move(x, y, 2.56)


@asset("nanoforge", tint="#4b525b", budget=4500)
def nanoforge(a):
    sides = 24
    # Foundation and the ring housing.
    a.lathe([(3.48, 0.0), (3.48, 0.15), (3.38, 0.25), (2.9, 0.25)], sides, cap_bottom=False, cap_top=False).color(DARK, FRAME)
    a.lathe(
        [(3.0, 0.24), (3.06, 0.4), (3.0, 1.25), (2.72, 1.7), (2.1, 1.7), (1.92, 1.52), (1.84, 0.6)], sides, cap_bottom=False, cap_top=False
    ).part("tint").color(P.SHADE_2, P.WHITE)
    a.cyl(1.86, 0.02, sides, bevel=0).move(0, 0, 0.6).color(DARK)
    a.lathe([(3.05, 0.84), (3.04, 0.93)], sides, cap_bottom=False, cap_top=False).part("glow").color(P.GLOW_CYAN)
    for k in range(12):
        m = 15 + 30 * k
        bar(a, polar(3.07, m, 0.3), polar(3.01, m, 1.27), 0.07, 0.16, bevel=0.02, side=polar(1, m)).part("tint").color(P.SHADE_3, P.SHADE_2)
        bar(a, polar(2.72, m, 1.7), polar(2.1, m, 1.7), 0.14, 0.04, bevel=0, side=polar(1, m + 90)).color(DARK)
    # The core: a column of light on a cup, inside three shrinking coils.
    a.lathe([(1.0, 0.6), (1.0, 0.78), (0.66, 1.0), (0.5, 1.0)], 16, cap_bottom=False).part("metal").color(P.STEEL_DARK, P.STEEL)
    a.lathe([(0.5, 0.98), (0.4, 1.5), (0.34, 3.0), (0.3, 4.36)], 12, cap_bottom=False, cap_top=False).part("glow").color(P.GLOW_CYAN)
    a.lathe([(1.5, 0.612), (1.25, 0.612)], sides, cap_bottom=False, cap_top=False).part("glow").color(P.GLOW_CYAN)
    for z, ring_r, tube_r in ((2.36, 1.84, 0.16), (3.12, 1.5, 0.14), (3.82, 1.06, 0.12)):
        a.torus(ring_r, tube_r, 16, 5).move(0, 0, z).part("metal").color(P.STEEL, P.CHROME)
    # Four claws rise from the housing to carry the coils and the cap.
    for k in range(4):
        a.profile_y(
            [
                (2.66, 1.62), (2.56, 2.34), (2.08, 3.22), (1.5, 4.02), (0.86, 4.64), (0.4, 4.84),
                (0.4, 4.52), (0.78, 4.3), (1.26, 3.74), (1.7, 3.04), (2.02, 2.3), (2.08, 1.62),
            ],
            0.3,
            bevel=0.045,
        ).rot(z=45 + 90 * k).part("tint").color(P.SHADE_1, P.WHITE)
        x, y, _ = polar(2.52, 45 + 90 * k)
        beacon(a, (x, y, 2.36), 0.06, P.GLOW_ORANGE)
    a.lathe(
        [(0.32, 4.3), (0.62, 4.42), (0.68, 4.84), (0.5, 5.04), (0.2, 5.14), (0.12, 5.5), (0.05, 5.92)], 12, cap_bottom=False
    ).part("tint").color(P.SHADE_2, P.WHITE)
    light(a, (0, 0, 5.98), 0.08, P.GLOW_RED, 8)
    # Reagent tanks plug into the housing, each piped over the rim.
    for m in (0, 90, 180):
        x, y, _ = polar(3.0, m)
        a.lathe([(0.5, 0.25), (0.5, 0.42), (0.44, 0.46), (0.44, 1.9), (0.36, 2.14), (0.16, 2.28), (0.0, 2.3)], 12, cap_bottom=False).move(
            x, y, 0
        ).part("metal").color(P.STEEL, P.CHROME)
        for z in (0.9, 1.6):
            collar(a, (x, y, z), 0.455, 0.07, "z", 12, FRAME, "base", caps=False)
        a.tube([polar(3.0, m, 2.2), polar(3.0, m, 2.62), polar(2.76, m, 2.86), polar(2.46, m, 2.66), polar(2.42, m, 1.7)], 0.11, 7).color(
            jk.shade(P.COPPER, -0.1), P.COPPER
        )
        collar(a, polar(2.42, m, 1.76), 0.16, 0.08, "z", 8, P.STEEL, caps=False)
    # The way in: a lit doorway up two steps.
    a.box(0.9, 0.36, 0.98, bevel=0.06).move(0, -3.02, 0.25).part("tint").color(P.SHADE_2, P.WHITE)
    a.box(0.46, 0.03, 0.66, bevel=0).move(0, -3.2, 0.3).color(DARK)
    a.box(0.1, 0.03, 0.56, bevel=0).move(0, -3.215, 0.35).part("glow").color(P.GLOW_CYAN)
    a.box(0.8, 0.3, 0.1, bevel=0.02).move(0, -3.32, 0.2).color(FRAME)
    beacon(a, (0, -3.02, 1.23), 0.05, P.GLOW_ORANGE)


@asset("seed-ark", tint="#eef1f4", budget=4500)
def seed_ark(a):
    # Pad.
    a.cyl(1.78, 0.14, 20, bevel=0.04, grounded=True).color(P.CONCRETE_DARK, P.CONCRETE)
    a.lathe([(1.36, 0.146), (1.26, 0.146)], 20, cap_bottom=False, cap_top=False).color(P.OFF_WHITE)
    # Four landing legs.
    for k in range(4):
        m = 45 + 90 * k
        foot = polar(1.4, m, 0.22)
        a.cyl(0.21, 0.08, 10, bevel=0.02).move(foot[0], foot[1], 0.14).part("metal").color(P.STEEL_DARK, P.STEEL)
        a.tube([polar(0.5, m, 2.02), lerp3(polar(0.5, m, 2.02), foot, 0.55)], 0.09, 6).part("metal").color(P.STEEL)
        a.tube([lerp3(polar(0.5, m, 2.02), foot, 0.5), foot], 0.055, 6).part("metal").color(P.STEEL_DARK)
        a.tube([polar(0.46, m, 1.3), foot], 0.04, 5).part("metal").color(P.STEEL_DARK)
    # Engine bell and thrust structure.
    a.lathe([(0.2, 1.24), (0.27, 1.0), (0.42, 0.66), (0.47, 0.58), (0.43, 0.58), (0.24, 0.98)], 12, cap_bottom=False, cap_top=False).part(
        "metal"
    ).color(P.STEEL_DARK, P.STEEL)
    a.cyl(0.26, 0.02, 12, bevel=0).move(0, 0, 0.9).part("glow").color(P.GLOW_ORANGE)
    a.lathe([(0.24, 1.14), (0.56, 1.28), (0.62, 1.46), (0.62, 1.6), (0.3, 1.64)], 14, cap_bottom=False, cap_top=False).part("tint").color(
        P.SHADE_2, P.WHITE
    )
    # Tank cluster around the spine.
    a.cyl(0.3, 1.1, 10, bevel=0).move(0, 0, 1.6).color(FRAME)
    for k in range(4):
        x, y, _ = polar(0.44, 90 * k)
        a.sphere(0.4, 12, 8).move(x, y, 2.1).part("metal").color(P.STEEL, P.CHROME)
    # Hull.
    hull = [(0.3, 2.56), (0.62, 2.6), (0.62, 2.72), (0.47, 2.92), (0.42, 5.5), (0.5, 5.72), (0.5, 5.82), (0.3, 5.86)]
    a.lathe(hull, 14, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_1, P.WHITE)
    # Habitat rings on spokes, each with a line of lit windows.
    for z, ring_r, tube_r, turn in ((3.62, 1.08, 0.2, 0), (4.78, 0.9, 0.17, 45)):
        a.torus(ring_r, tube_r, 20, 8).move(0, 0, z).part("tint").color(P.SHADE_1, P.WHITE)
        a.lathe([(ring_r + tube_r + 0.004, z - 0.035), (ring_r + tube_r + 0.004, z + 0.035)], 20, cap_bottom=False, cap_top=False).part(
            "glow"
        ).color(P.GLOW_BLUE)
        for k in range(4):
            m = turn + 90 * k
            a.tube([polar(0.4, m, z), polar(ring_r - tube_r * 0.7, m, z)], 0.05, 6).part("metal").color(P.STEEL)
    # The seed vault: a green glass orb in a white cradle.
    a.sphere(0.56, 14, 9).move(0, 0, 6.3).part("glass").color(jk.mix(P.GLASS_TINTED, P.GREEN, 0.6), jk.mix(P.GLASS, P.GREEN, 0.35))
    collar(a, (0, 0, 6.3), 0.575, 0.08, "z", 14, P.WHITE, "tint", caps=False)
    a.lathe([(0.3, 6.74), (0.4, 6.8), (0.4, 6.92), (0.26, 6.98)], 12, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_1, P.WHITE)
    # The light sail, furled like a bud around its mast.
    sail = a.lathe([(0.2, 6.94), (0.37, 7.12), (0.31, 7.7), (0.15, 8.26), (0.05, 8.42)], 12, cap_bottom=False)
    sail.warp(lambda co: (co.x * 0.62, co.y * 0.62, co.z) if round(math.degrees(math.atan2(co.y, co.x)) / 30) % 2 else co)
    sail.color(jk.shade(P.GOLD, -0.1), jk.shade(P.GOLD, 0.3)).flat()
    for z in (7.3, 7.9):
        collar(a, (0, 0, z), radius_at([(0.37, 7.12), (0.31, 7.7), (0.15, 8.26)], z) * 0.86, 0.04, "z", 8, FRAME, "base")
    a.tube([(0, 0, 8.3), (0, 0, 8.62)], 0.02, 5).part("metal").color(P.STEEL)
    light(a, (0, 0, 8.65), 0.05, P.GLOW_BLUE, 6)
