"""Animals: smooth vinyl-toy creatures. They face -y (head toward -y); the coat is the tint part.

Bodies are lofts, limbs and necks are tapered tubes, and every animal keeps one unmistakable
feature for its silhouette: antlers, a hump, patches, wool, a mane, spread wings, flukes.
Poses are neutral because the web app slides the models along their routes.
"""

import math

import bmesh

from kit import jk, parts
from kit import palette as P
from kit.jk import asset

HOOF = jk.mix(P.INK, P.BARK_DARK, 0.45)
BONE = P.BIRCH
SOOT = jk.mix(P.INK, P.BARK_DARK, 0.3)  # dark faces, manes and patches
MUZZLE = jk.mix(P.PINK, P.CLAY, 0.45)
COAT = (P.SHADE_2, P.WHITE)


# --------------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------------
def aim(target, direction):
    """Turn a piece or group built along +z so that its axis points along `direction`."""
    x, y, z = direction
    length = math.sqrt(x * x + y * y + z * z) or 1.0
    return target.rot(x=math.degrees(math.acos(max(-1.0, min(1.0, z / length)))), z=math.degrees(math.atan2(x, -y)))


def skin(sections, y, angle, power=2.4):
    """A point on a loft's surface at depth y, `angle` degrees round the section
    (0 = the +x flank, 90 = the top, 270 = the belly)."""
    pairs = list(zip(sections, sections[1:]))
    s0, s1 = pairs[-1]
    for u, v in pairs:
        if min(u[0], v[0]) <= y <= max(u[0], v[0]):
            s0, s1 = u, v
            break
    t = (y - s0[0]) / ((s1[0] - s0[0]) or 1.0)

    def at(i):
        u = s0[i] if len(s0) > i else 0.0
        v = s1[i] if len(s1) > i else 0.0
        return u + (v - u) * t

    c, s = math.cos(math.radians(angle)), math.sin(math.radians(angle))
    return (
        at(4) + at(1) * math.copysign(abs(c) ** (2 / power), c),
        y,
        at(3) + at(2) * math.copysign(abs(s) ** (2 / power), s),
    )


def eyes(a, x, y, z, r=0.022, out=(1.0, -0.3, 0.1), colour=P.INK):
    """A pair of bead eyes at (+-x, y, z), each facing `out` (given for the +x side)."""
    for side in (-1, 1):
        bead = a.lathe([(r, 0), (0, r * 0.42)], 7, cap_bottom=False)
        aim(bead, (side * out[0], out[1], out[2])).move(side * x, y, z).color(colour).no_ao().smooth(90)


def ears(a, x, y, z, length=0.12, width=0.05, tilt=50.0, back=0.0, part="tint", colour=(P.SHADE_3, P.SHADE_1)):
    """A pair of leaf ears rooted at (+-x, y, z), leaning out by `tilt` degrees from upright."""
    for side in (-1, 1):
        leaf = a.lathe([(0, 0), (width, length * 0.4), (0, length)], 5).scale(1, 0.42, 1)
        leaf.rot(x=back).rot(y=side * tilt).move(side * x, y, z).part(part).color(*colour).smooth(70)


def leg(a, x, y, top, r, bend=0.0, part="tint", colour=COAT, hoof=HOOF, hoof_h=0.065, sides=7, ankle=0.56):
    """A tapered leg from inside the body (height `top`) down to a hoof standing on the ground.

    `bend` pushes the joint back (+y), as on a hind leg."""
    a.tube(
        [(x, y, top), (x, y + bend, top * 0.46), (x, y + bend * 0.2, hoof_h * 0.7)],
        [r, r * (ankle + 0.08), r * ankle],
        sides,
        caps="none",
    ).part(part).color(*colour).smooth(80)
    if hoof is not None:
        a.lathe([(r * ankle * 1.12, 0), (r * ankle * 1.22, 0.014), (r * ankle * 1.02, hoof_h)], sides, cap_bottom=False).move(
            x, y + bend * 0.2, 0
        ).color(hoof).smooth(60)


def blade(a, stations, side=1, sides=8, power=2.0):
    """A wing, fin or fluke reaching out along +x (side 1) or -x (side -1).

    `stations` run from root to tip as (span, half-chord, half-thickness, lift, sweep): `lift`
    raises the section and `sweep` moves it back (+y). A zero chord closes the tip to a point.
    """
    sections = [(s, c, t, lift, -side * sweep) for s, c, t, lift, sweep in stations]
    return a.loft(sections, sides, power).rot(z=-90 * side)


def patch(a, at, out, r, stretch=1.0, turn=0.0, colour=SOOT, bulge=0.5):
    """A rounded coat marking: a low dome let into the body at `at`, facing `out`."""
    spot = a.dome(r, r * bulge, 8, 2).scale(stretch, 1, 1).rot(z=turn).move(0, 0, -r * bulge * 0.72)
    return aim(spot, out).move(*at).color(colour).smooth(80)


def split(a, piece, pick):
    """Move the faces chosen by `pick(face)` out of `piece` into a new piece, which is returned."""
    other = piece.copy()
    bmesh.ops.delete(piece.bm, geom=[f for f in piece.bm.faces if pick(f)], context="FACES")
    bmesh.ops.delete(other.bm, geom=[f for f in other.bm.faces if not pick(f)], context="FACES")
    return a.add(other)


# --------------------------------------------------------------------------------------------
# Deer: a slender stag with branching antlers and a pale tail
# --------------------------------------------------------------------------------------------
@asset("deer", tint="#a46c3e", budget=900)
def deer(a):
    body = [
        (0.36, 0, 0, 0.63),
        (0.33, 0.095, 0.12, 0.62),
        (0.2, 0.158, 0.185, 0.6),
        (0.0, 0.145, 0.165, 0.59),
        (-0.2, 0.16, 0.2, 0.6),
        (-0.33, 0.125, 0.17, 0.635),
        (-0.42, 0.07, 0.1, 0.69),
    ]
    a.loft(body, 12, 2.3).part("tint").color(*COAT)
    neck = a.tube([(0, -0.31, 0.66), (0, -0.44, 0.83), (0, -0.5, 0.97)], [0.14, 0.098, 0.08], 8, caps="none")
    neck.scale(0.8, 1, 1).part("tint").color(P.SHADE_1, P.WHITE).smooth(80)
    # A pale tail, flagged up.
    a.tube([(0, 0.32, 0.7), (0, 0.4, 0.71), (0, 0.43, 0.62)], [0.032, 0.05, 0.016], 6, caps="round").color(jk.shade(P.CREAM, -0.1), P.OFF_WHITE).smooth(80)
    head = [
        (0.09, 0, 0, 0),
        (0.06, 0.066, 0.07, 0),
        (-0.03, 0.084, 0.086, 0),
        (-0.13, 0.058, 0.058, -0.015),
        (-0.21, 0.044, 0.042, -0.022),
        (-0.243, 0, 0, -0.022),
    ]
    with a.group() as g:
        a.loft(head, 10, 2.3).part("tint").color(P.SHADE_1, P.WHITE)
        a.sphere(0.028, 6, 4).smooth(90).move(0, -0.23, -0.014).color(P.INK)
        eyes(a, 0.071, -0.07, 0.022, 0.022)
        ears(a, 0.065, 0.045, 0.035, length=0.14, width=0.046, tilt=64, back=-10)
        for side in (-1, 1):
            # Main beam with a brow tine and a fork.
            a.tube(
                [(side * 0.035, 0.02, 0.07), (side * 0.105, 0.07, 0.17), (side * 0.15, 0.04, 0.25), (side * 0.135, -0.015, 0.3)],
                [0.021, 0.018, 0.014, 0.007],
                4,
            ).color(jk.shade(BONE, -0.2), BONE)
            a.tube([(side * 0.105, 0.07, 0.17), (side * 0.14, -0.025, 0.23)], [0.015, 0.006], 4).color(BONE)
            a.tube([(side * 0.05, 0.035, 0.095), (side * 0.068, -0.065, 0.155)], [0.016, 0.006], 4).color(BONE)
    g.scale(1.14).rot(x=12).move(0, -0.52, 1.0)
    for side in (-1, 1):
        leg(a, side * 0.082, -0.21, 0.56, 0.072, colour=(P.SHADE_3, P.WHITE), ankle=0.46)
        leg(a, side * 0.085, 0.18, 0.6, 0.088, bend=0.09, colour=(P.SHADE_3, P.WHITE), ankle=0.38)


# --------------------------------------------------------------------------------------------
# Horse: arched neck, long head, dark mane and tail
# --------------------------------------------------------------------------------------------
@asset("horse", tint="#7a4a2a", budget=900)
def horse(a):
    body = [
        (0.44, 0, 0, 0.84),
        (0.41, 0.1, 0.135, 0.83),
        (0.27, 0.16, 0.205, 0.795),
        (0.0, 0.148, 0.187, 0.77),
        (-0.26, 0.16, 0.21, 0.785),
        (-0.42, 0.13, 0.195, 0.835),
        (-0.52, 0.08, 0.12, 0.9),
    ]
    a.loft(body, 12, 2.4).part("tint").color(*COAT)
    # The neck rises steeply from the withers and curves over at the poll.
    neck = a.tube([(0, -0.38, 0.86), (0, -0.48, 1.08), (0, -0.58, 1.23), (0, -0.68, 1.27)], [0.175, 0.125, 0.098, 0.085], 8, caps="none")
    neck.scale(0.7, 1, 1).part("tint").color(P.SHADE_1, P.WHITE).smooth(80)
    head = [
        (0.1, 0, 0, 0),
        (0.07, 0.07, 0.085, 0),
        (-0.02, 0.085, 0.1, 0),
        (-0.16, 0.064, 0.074, -0.01),
        (-0.3, 0.054, 0.06, -0.016),
        (-0.365, 0.05, 0.054, -0.018),
        (-0.39, 0, 0, -0.018),
    ]
    with a.group() as g:
        a.loft(head, 10, 2.5).part("tint").color(P.SHADE_1, P.WHITE)
        eyes(a, 0.076, -0.06, 0.035, 0.023)
        ears(a, 0.045, 0.05, 0.075, length=0.115, width=0.036, tilt=14)
        for side in (-1, 1):
            a.sphere(0.013, 5, 3, (0.6, 1, 1.4)).smooth(90).move(side * 0.03, -0.375, 0.0).color(SOOT).no_ao()
    g.rot(x=50).move(0, -0.72, 1.26)
    # Mane along the crest of the neck with a forelock, and a full tail.
    mane = a.tube([(0, -0.26, 1.0), (0, -0.37, 1.17), (0, -0.48, 1.32), (0, -0.6, 1.4), (0, -0.74, 1.4)], [0.035, 0.075, 0.08, 0.07, 0.03], 6, caps="round")
    mane.scale(0.46, 1, 1).color(jk.shade(SOOT, -0.1), SOOT).smooth(80)
    a.tube([(0, 0.42, 0.9), (0, 0.5, 0.88), (0, 0.53, 0.62), (0, 0.5, 0.34)], [0.035, 0.06, 0.068, 0.02], 6, caps="round").color(
        jk.shade(SOOT, -0.1), SOOT
    ).smooth(80)
    for side in (-1, 1):
        leg(a, side * 0.082, -0.31, 0.74, 0.08, hoof_h=0.08, ankle=0.52)
        leg(a, side * 0.084, 0.27, 0.8, 0.086, bend=0.1, hoof_h=0.08, ankle=0.47)


# --------------------------------------------------------------------------------------------
# Cow: a boxy dairy cow with dark patches, short horns, a pink muzzle and an udder
# --------------------------------------------------------------------------------------------
@asset("cow", tint="#efe8dc", budget=900)
def cow(a):
    body = [
        (0.5, 0, 0, 0.62),
        (0.485, 0.12, 0.14, 0.62),
        (0.43, 0.175, 0.2, 0.61),
        (0.25, 0.21, 0.235, 0.585),
        (0.0, 0.215, 0.245, 0.57),
        (-0.28, 0.205, 0.235, 0.585),
        (-0.44, 0.15, 0.19, 0.62),
        (-0.53, 0.1, 0.13, 0.66),
    ]
    a.loft(body, 10, 3.0).part("tint").color(*COAT)
    neck = a.tube([(0, -0.42, 0.66), (0, -0.56, 0.73), (0, -0.63, 0.76)], [0.165, 0.13, 0.11], 8, caps="none")
    neck.scale(0.85, 1, 1).part("tint").color(P.SHADE_1, P.WHITE).smooth(80)
    for y, angle, r, stretch, turn in ((0.26, 62, 0.15, 1.3, 20), (-0.16, 118, 0.13, 1.2, -30), (0.0, 6, 0.115, 1.0, 0), (0.34, 172, 0.11, 1.2, 0)):
        at = skin(body, y, angle, 3.0)
        patch(a, at, (at[0], 0, at[2] - 0.585), r, stretch=stretch, turn=turn)
    head = [(0.09, 0, 0, 0), (0.06, 0.09, 0.09, 0), (-0.03, 0.115, 0.11, 0), (-0.15, 0.094, 0.086, -0.02), (-0.225, 0.088, 0.076, -0.03)]
    with a.group() as g:
        a.loft(head, 10, 3.0).part("tint").color(P.SHADE_1, P.WHITE)
        a.loft([(-0.215, 0.09, 0.078, -0.03), (-0.265, 0.086, 0.072, -0.032), (-0.292, 0.05, 0.04, -0.032), (-0.296, 0, 0, -0.032)], 10, 3.0).color(
            jk.shade(MUZZLE, -0.1), MUZZLE
        )
        for side in (-1, 1):
            a.sphere(0.014, 5, 3, (1, 0.5, 1.3)).smooth(90).move(side * 0.035, -0.292, -0.02).color(jk.shade(MUZZLE, -0.5)).no_ao()
            a.tube([(side * 0.075, 0.035, 0.08), (side * 0.155, 0.03, 0.11), (side * 0.185, 0.01, 0.185)], [0.03, 0.025, 0.008], 5).color(
                jk.shade(BONE, -0.18), BONE
            ).smooth(80)
        eyes(a, 0.105, -0.06, 0.03, 0.023)
        ears(a, 0.1, 0.055, 0.02, length=0.13, width=0.05, tilt=96, back=-8, colour=(P.SHADE_2, P.SHADE_1))
        patch(a, (0.085, -0.03, 0.07), (0.7, -0.2, 0.7), 0.075)
    g.rot(x=20).move(0, -0.6, 0.77)
    a.sphere(0.092, 6, 4, (1, 1.15, 0.8)).smooth(90).move(0, 0.2, 0.345).color(jk.shade(MUZZLE, -0.08), MUZZLE)
    a.tube([(0, 0.49, 0.74), (0, 0.545, 0.66), (0, 0.55, 0.42)], 0.017, 5, caps="none").part("tint").color(P.SHADE_2).smooth(80)
    a.sphere(0.036, 6, 4, (1, 1, 1.5)).smooth(90).move(0, 0.55, 0.38).color(SOOT)
    for side in (-1, 1):
        leg(a, side * 0.125, -0.3, 0.44, 0.072, colour=(P.SHADE_1, P.WHITE), ankle=0.68)
        leg(a, side * 0.13, 0.34, 0.46, 0.076, bend=0.035, colour=(P.SHADE_1, P.WHITE), ankle=0.64)


# --------------------------------------------------------------------------------------------
# Bison: smooth hindquarters under a huge shaggy cape, low bearded head, short horns
# --------------------------------------------------------------------------------------------
@asset("bison", tint="#5a3f2c", budget=900)
def bison(a):
    shag = (P.SHADE_3, P.SHADE_2)
    rear = [(0.55, 0, 0, 0.62), (0.52, 0.1, 0.12, 0.62), (0.37, 0.19, 0.21, 0.6), (0.14, 0.22, 0.25, 0.61), (-0.06, 0.23, 0.27, 0.63), (-0.2, 0.2, 0.26, 0.65)]
    a.loft(rear, 10, 2.4).part("tint").color(P.SHADE_1, P.WHITE)
    cape = [
        (0.1, 0, 0, 0.74),
        (0.02, 0.2, 0.25, 0.7),
        (-0.12, 0.26, 0.36, 0.7),
        (-0.28, 0.275, 0.4, 0.69),
        (-0.46, 0.265, 0.35, 0.65),
        (-0.62, 0.2, 0.26, 0.6),
        (-0.72, 0, 0, 0.56),
    ]
    a.loft(cape, 12, 2.2).jitter(0.035, 7, 7).part("tint").color(*shag).flat()
    head = [(0.12, 0, 0, 0), (0.06, 0.13, 0.14, 0), (-0.04, 0.15, 0.16, 0), (-0.16, 0.12, 0.12, -0.01), (-0.25, 0.092, 0.086, -0.02), (-0.29, 0, 0, -0.02)]
    with a.group() as g:
        a.loft(head, 10, 2.6).part("tint").color(P.SHADE_3, P.SHADE_2)
        a.sphere(0.05, 6, 4, (1.3, 0.7, 0.8)).smooth(90).move(0, -0.262, -0.01).color(P.INK)
        eyes(a, 0.128, -0.1, 0.02, 0.022)
        # A woolly crown between the horns and a beard under the chin.
        a.blob(0.135, 1, (1.1, 0.9, 0.8), lumps=0.2, seed=3).move(0, 0.03, 0.12).part("tint").color(*shag)
        a.cone(0.07, 0.19, 5).rot(x=180).scale(0.9, 1.2, 1).move(0, -0.1, -0.08).part("tint").color(*shag).flat()
        for side in (-1, 1):
            a.tube([(side * 0.12, 0.03, 0.05), (side * 0.215, 0.03, 0.085), (side * 0.24, 0.01, 0.2)], [0.038, 0.032, 0.008], 5).color(
                jk.shade(BONE, -0.3), BONE
            ).smooth(80)
    g.rot(x=52).move(0, -0.74, 0.6)
    a.tube([(0, 0.54, 0.7), (0, 0.6, 0.62), (0, 0.6, 0.44)], 0.016, 5, caps="none").part("tint").color(P.SHADE_2).smooth(80)
    a.sphere(0.035, 6, 4, (1, 1, 1.5)).smooth(90).move(0, 0.6, 0.4).part("tint").color(P.SHADE_3)
    for side in (-1, 1):
        leg(a, side * 0.14, -0.42, 0.42, 0.082, colour=shag, ankle=0.62, hoof_h=0.07)
        leg(a, side * 0.135, 0.38, 0.52, 0.076, bend=0.045, colour=(P.SHADE_2, P.WHITE), ankle=0.58, hoof_h=0.07)


# --------------------------------------------------------------------------------------------
# Sheep: a ball of faceted wool on four dark legs, with a dark face
# --------------------------------------------------------------------------------------------
@asset("sheep", tint="#f2efe6", budget=900)
def sheep(a):
    parts.canopy(
        a,
        [
            (0, -0.06, 0.4, 0.27, 0.86, 3),
            (0, 0.13, 0.41, 0.19, 0.9, 2),
            (0, -0.23, 0.46, 0.18, 0.9, 2),
            (0, -0.3, 0.585, 0.095, 0.8, 2),
        ],
        seed=6,
    )
    head = [(0.08, 0, 0, 0), (0.04, 0.074, 0.078, 0), (-0.04, 0.084, 0.088, 0), (-0.13, 0.06, 0.062, -0.012), (-0.172, 0.05, 0.048, -0.016), (-0.19, 0, 0, -0.016)]
    with a.group() as g:
        a.loft(head, 8, 2.5).color(jk.shade(SOOT, -0.15), SOOT)
        ears(a, 0.07, 0.03, 0.02, length=0.11, width=0.04, tilt=104, back=-6, part="base", colour=(SOOT, SOOT))
        # Bright eyes set forward on the dark face, so it reads from the front as well.
        at = skin(head, -0.095, 28, 2.5)
        eyes(a, at[0] - 0.004, at[1], at[2], 0.025, out=(0.7, -0.62, 0.35), colour=P.OFF_WHITE)
        eyes(a, at[0] - 0.001, at[1] - 0.004, at[2] + 0.001, 0.011, out=(0.7, -0.62, 0.35))
    g.rot(x=24).move(0, -0.31, 0.47)
    for side in (-1, 1):
        for y in (-0.2, 0.1):
            a.tube([(side * 0.1, y, 0.26), (side * 0.1, y, 0.08), (side * 0.1, y - 0.006, 0)], [0.04, 0.027, 0.034], 6, caps="none").color(
                jk.shade(SOOT, -0.25), SOOT
            ).smooth(80)


# --------------------------------------------------------------------------------------------
# Bird: a gull in flight, wings spread; the origin is the centre of its body
# --------------------------------------------------------------------------------------------
@asset("bird", tint="#f4f4f4", grounded=False, budget=900)
def bird(a):
    body = [
        (-0.19, 0, 0, 0.012),
        (-0.165, 0.035, 0.035, 0.012),
        (-0.12, 0.048, 0.046, 0.012),
        (-0.06, 0.052, 0.05, 0.004),
        (0.02, 0.07, 0.062, -0.005),
        (0.12, 0.05, 0.04, 0.0),
        (0.2, 0.02, 0.015, 0.008),
    ]
    a.loft(body, 8, 2.2).part("tint").color(P.SHADE_1, P.WHITE)
    a.loft([(0.16, 0.03, 0.012, 0.006), (0.27, 0.078, 0.007, 0.012)], 6, 2.0).part("tint").color(P.SHADE_2)
    a.loft([(-0.18, 0.017, 0.015, 0.008), (-0.25, 0, 0, 0.0)], 5, 2.0).color(P.AMBER)
    eyes(a, 0.04, -0.14, 0.022, 0.011, out=(1, -0.2, 0.2))
    for side in (-1, 1):
        # A gull's wing: raised at the wrist, swept and drooping to a dark tip.
        blade(
            a,
            [(0.03, 0.08, 0.016, 0.0, 0.01), (0.2, 0.085, 0.013, 0.07, 0.0), (0.36, 0.06, 0.009, 0.085, 0.03), (0.44, 0.04, 0.007, 0.07, 0.065)],
            side,
        ).part("tint").color(P.SHADE_2, axis="z")
        blade(a, [(0.44, 0.04, 0.007, 0.07, 0.065), (0.515, 0, 0, 0.045, 0.12)], side).color(P.CHARCOAL)


# --------------------------------------------------------------------------------------------
# Whale: head and flukes lifted clear of the water, pale jaw and belly, fins
# --------------------------------------------------------------------------------------------
@asset("whale", tint="#4a5b6e", budget=900)
def whale(a):
    body = [
        (-1.8, 0, 0, 0.2),
        (-1.77, 0.16, 0.13, 0.2),
        (-1.6, 0.36, 0.3, 0.195),
        (-1.2, 0.5, 0.44, 0.17),
        (-0.6, 0.56, 0.5, 0.125),
        (0.0, 0.5, 0.46, 0.11),
        (0.6, 0.34, 0.33, 0.15),
        (1.1, 0.15, 0.17, 0.27),
        (1.35, 0.08, 0.1, 0.36),
        (1.5, 0.05, 0.06, 0.42),
    ]

    def centre(y):
        return skin(body, y, 0)[2]

    back = a.loft(body, 14, 2.2).part("tint").color(P.SHADE_2, P.WHITE)
    belly = split(a, back, lambda f: f.calc_center_median().y < 0.6 and f.calc_center_median().z < centre(f.calc_center_median().y))
    belly.part("base").color(P.STONE, P.ICE)
    eyes(a, *[abs(v) if i == 0 else v for i, v in enumerate(skin(body, -1.2, 14))], r=0.04, out=(1, -0.25, 0.25))
    a.sphere(0.06, 6, 4, (1, 1.5, 0.4)).smooth(90).move(*skin(body, -0.95, 90)).color(jk.shade(P.NAVY, -0.5)).no_ao()
    for side in (-1, 1):
        # The line of the mouth, running back from the snout under the eye.
        a.tube([(side * v[0] * 1.005, v[1], v[2]) for v in (skin(body, y, 0) for y in (-1.74, -1.6, -1.42, -1.25))], 0.014, 3, caps="none").color(
            jk.shade(P.NAVY, -0.45)
        ).no_ao()
        blade(a, [(0.0, 0.17, 0.05, 0.0, 0.0), (0.15, 0.15, 0.038, -0.02, 0.17), (0.24, 0, 0, -0.04, 0.42)], side).move(side * 0.44, -0.82, 0.1).part(
            "tint"
        ).color(P.SHADE_3, P.SHADE_1)
        blade(a, [(0.0, 0.17, 0.045, 0, 0), (0.25, 0.16, 0.034, 0.012, 0.07), (0.48, 0.085, 0.022, 0.024, 0.2), (0.6, 0, 0, 0.03, 0.3)], side).rot(
            x=-14
        ).move(0, 1.5, 0.43).part("tint").color(P.SHADE_2, P.WHITE)
    a.loft([(-0.14, 0, 0, -0.02), (-0.04, 0.028, 0.055, 0.035), (0.05, 0.02, 0.05, 0.07), (0.1, 0, 0, 0.115)], 6, 2.0).move(0, 0.55, skin(body, 0.55, 90)[2] - 0.01).part(
        "tint"
    ).color(P.SHADE_2, P.WHITE)


# --------------------------------------------------------------------------------------------
# Fish: a small fish caught mid-leap, body arched, tail fanned
# --------------------------------------------------------------------------------------------
@asset("fish", tint="#f2a03a", grounded=False, budget=900)
def fish(a):
    body = [(-0.2, 0, 0, -0.012), (-0.17, 0.022, 0.03, -0.006), (-0.08, 0.04, 0.054, 0.008), (0.02, 0.036, 0.048, 0.012), (0.1, 0.018, 0.027, 0.004), (0.145, 0.008, 0.013, -0.005)]
    a.loft(body, 8, 2.2).part("tint").color(P.SHADE_2, P.WHITE)
    a.loft([(0.13, 0.007, 0.013, -0.004), (0.2, 0.005, 0.06, -0.012)], 6, 2.0).part("tint").color(P.SHADE_3, P.SHADE_1)
    a.loft([(-0.07, 0, 0, 0.05), (-0.01, 0.006, 0.02, 0.06), (0.05, 0.004, 0.012, 0.056)], 5, 2.0).part("tint").color(P.SHADE_3, P.SHADE_1)
    eyes(a, 0.027, -0.14, 0.004, 0.012, out=(1, -0.2, 0.1))
    for side in (-1, 1):
        blade(a, [(0.0, 0.02, 0.005, 0, 0), (0.045, 0, 0, -0.015, 0.03)], side, sides=5).move(side * 0.03, -0.07, -0.02).part("tint").color(P.SHADE_3)
