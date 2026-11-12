"""Citizens. One unit tall, facing -y; clothes are the tint part.

Everyone is built on `parts.figure`, which returns anchors (hands, head, shoulders) so each trade
can be given the one prop that names it: a wrench, a toolbox, a staff, a frame pack.
"""

import math

from kit import jk, parts
from kit import palette as P
from kit.jk import asset

LILAC = "#d9c4e8"  # S5 skin


# --------------------------------------------------------------------------------------------
# Townsfolk
# --------------------------------------------------------------------------------------------
# Four neighbours: each skin tone gets its own hair, cut of clothes and trouser colour, so a
# crowd reads as individuals even when every shirt shares one instance colour.
CITIZENS: tuple[dict, ...] = (
    dict(skin=P.SKINS[0], hair=P.HAIRS[1], hair_style="short", legs=P.CHARCOAL, shoes=P.INK),
    dict(skin=P.SKINS[1], hair=P.HAIRS[2], hair_style="bun", legs=P.SKINS[1], shoes=P.WALNUT, skirt=True, sleeves="short"),
    dict(skin=P.SKINS[2], hair=P.HAIRS[0], hair_style="curly", legs=P.NAVY, shoes=P.OFF_WHITE, sleeves="short"),
    dict(skin=P.SKINS[3], hair=P.HAIRS[5], hair_style="long", legs=P.SLATE, shoes=P.WALNUT),
)
WALKERS: tuple[dict, ...] = (
    dict(skin=P.SKINS[0], hair=P.HAIRS[3], hair_style="ponytail", legs=P.NAVY, shoes=P.OFF_WHITE),
    dict(skin=P.SKINS[1], hair=P.HAIRS[0], hair_style="short", legs=P.SAND, shoes=P.WALNUT, pack=P.OLIVE),
    dict(skin=P.SKINS[2], hair=P.HAIRS[2], hair_style="bob", legs=P.CHARCOAL, shoes=P.INK, sleeves="short"),
    dict(skin=P.SKINS[3], hair=P.HAIRS[4], hair_style="short", legs=P.WALNUT, shoes=P.INK, hat=P.STRAW),
)

for i in range(4):

    def standing(a, look=CITIZENS[i]):
        parts.figure(a, **look)

    def walking(a, look=WALKERS[i]):
        parts.figure(a, stride=0.42, **look)

    asset(f"person-{i}", tint="#4f7fbf", budget=900)(standing)
    asset(f"walker-{i}", tint="#bf6a4f", budget=900)(walking)


# --------------------------------------------------------------------------------------------
# Workers: one-piece overalls (tint), a yellow hard hat and a hi-vis chest band
# --------------------------------------------------------------------------------------------
def crew(a, skin, hair, **pose):
    return parts.figure(
        a, skin=skin, hair=hair, legs="tint", shoes=P.BARK_DARK, hat=P.YELLOW, hat_style="hard", vest=P.YELLOW, **pose
    )


@asset("worker", tint="#e08a2e", budget=900)
def worker(a):
    # A big spanner held upright in one fist.
    g = crew(a, P.SKINS[1], P.HAIRS[0], reach={-1: ((-0.215, 0.0, 0.43), (-0.215, -0.15, 0.44))})
    hand = g.anchors["hand"][-1]
    outline = [
        (-0.019, -0.08), (0.019, -0.08), (0.019, 0.2), (0.062, 0.24), (0.062, 0.325), (0.027, 0.34), (0.027, 0.276),
        (-0.027, 0.276), (-0.027, 0.34), (-0.062, 0.325), (-0.062, 0.24), (-0.019, 0.2),
    ]  # fmt: skip
    tool = a.prism(outline, 0.026, bevel=0).move(0, 0, -0.013).rot(x=90)
    tool.rot(x=8, y=-9, z=-14).move(hand.x, hand.y - 0.004, hand.z).color(P.STEEL_DARK, P.CHROME)


@asset("worker-walk", tint="#e08a2e", budget=900)
def worker_walk(a):
    # Mid-stride with a red toolbox in hand.
    g = crew(a, P.SKINS[2], P.HAIRS[2], stride=0.4, reach={1: (0.238, 0.0, 0.372)})
    hand = g.anchors["hand"][1]
    top = hand.z - 0.05
    x = hand.x + 0.004
    a.box(0.1, 0.25, 0.125, bevel=0.018).move(x, hand.y, top - 0.125).color(jk.shade(P.RED, -0.2), P.RED)
    a.box(0.104, 0.254, 0.012, bevel=0).move(x, hand.y, top - 0.05).color(jk.shade(P.RED, -0.45))
    a.tube([(x, hand.y - 0.07, top - 0.004), (x, hand.y - 0.045, hand.z), (x, hand.y + 0.045, hand.z), (x, hand.y + 0.07, top - 0.004)], 0.011, 4, caps="none").color(P.STEEL)
    a.box(0.012, 0.04, 0.034, bevel=0).move(x + 0.054, hand.y, top - 0.062).color(P.CHROME)


# --------------------------------------------------------------------------------------------
# Guard (S1): dark uniform, peaked cap, feet planted wide
# --------------------------------------------------------------------------------------------
@asset("guard", tint="#4a4f58", budget=900)
def guard(a):
    g = parts.figure(
        a, skin=P.SKINS[0], hair=P.HAIRS[2], legs="tint", shoes=P.INK, hat=P.CHARCOAL, hat_style="peaked",
        stance=1.6, arms=0.13, belt=P.INK,
    )  # fmt: skip
    half, deep, shoulder, hip = (g.anchors[k] for k in ("half", "deep", "shoulder", "hip"))
    for side in (-1, 1):
        # Shoulder boards.
        a.box(0.085, 0.07, 0.02, bevel=0).rot(y=side * 16).move(side * half * 0.86, 0, shoulder + 0.022).color(P.GOLD)
    a.sphere(0.022, 5, 3, (1, 0.5, 1.15)).smooth(90).move(-half * 0.5, -deep * 0.93, shoulder - 0.09).color(P.GOLD)
    # A baton hangs from the belt.
    a.tube([(half * 1.02, 0.03, hip + 0.03), (half * 1.1, 0.07, hip - 0.19)], [0.02, 0.017], 6).color(P.INK).smooth(80)


# --------------------------------------------------------------------------------------------
# Robed folk (S4, S7, S10): a long belted robe, hood up with a staff or hood down on the road
# --------------------------------------------------------------------------------------------
@asset("robed", tint="#b3824f", budget=900)
def robed(a):
    g = parts.figure(
        a, skin=P.SKINS[2], hair=P.HAIRS[0], robe=True, hood="up", shoes=P.WALNUT, belt=P.BARK_DARK,
        reach={-1: (-0.262, -0.1, 0.47)},
    )  # fmt: skip
    hand = g.anchors["hand"][-1]
    x, y = hand.x - 0.006, hand.y - 0.012
    a.tube(
        [(x - 0.012, y - 0.02, 0), (x, y, hand.z), (x + 0.004, y + 0.012, 0.93), (x - 0.006, y + 0.018, 1.06), (x + 0.03, y + 0.01, 1.125)],
        [0.019, 0.02, 0.021, 0.03, 0.034],
        6,
    ).color(P.BARK, P.OAK_WOOD).smooth(80)
    # A cloth binding under the head of the staff.
    a.lathe([(0.03, 0), (0.032, 0.05)], 6, cap_bottom=False, cap_top=False).move(x + 0.002, y + 0.012, 0.96).color(P.TERRACOTTA).smooth(80)


@asset("robed-walk", tint="#8f6a44", budget=900)
def robed_walk(a):
    g = parts.figure(a, skin=P.SKINS[1], hair=P.HAIRS[2], hair_style="short", robe=True, hood="down", shoes=P.WALNUT, belt=P.BARK_DARK, stride=0.32)
    half, deep, shoulder, hip = (g.anchors[k] for k in ("half", "deep", "shoulder", "hip"))
    # A satchel slung across the body.
    a.tube(
        [(-half * 0.62, deep * 0.5, shoulder + 0.03), (-half * 0.3, -deep * 1.04, shoulder - 0.07), (half * 0.86, -deep * 0.82, hip + 0.1), (half * 1.02, 0.02, hip + 0.07)],
        0.014,
        4,
        caps="none",
    ).color(P.WALNUT)
    a.box(0.075, 0.18, 0.15, bevel=0.03).move(half * 1.14, 0.03, hip - 0.08).color(P.RUST, P.CLAY)
    a.box(0.082, 0.186, 0.055, bevel=0).move(half * 1.14, 0.03, hip + 0.02).color(P.WALNUT)


# --------------------------------------------------------------------------------------------
# Porter (S4, S7, S8): bent under a roped sack on a wooden frame, bedroll on top
# --------------------------------------------------------------------------------------------
@asset("porter", tint="#7d6a4a", budget=900)
def porter(a):
    lean = 12.0
    g = parts.figure(
        a, skin=P.SKINS[3], hair=P.HAIRS[1], hair_style="short", legs=P.BARK_DARK, shoes=P.WALNUT, stride=0.3, lean=lean,
        reach={-1: (-0.12, -0.15, 0.52), 1: (0.12, -0.15, 0.52)},
    )  # fmt: skip
    deep, shoulder, hip = (g.anchors[k] for k in ("deep", "shoulder", "hip"))
    with a.group() as pack:
        back = deep + 0.028
        for side in (-1, 1):
            # Frame uprights, and straps over the shoulders into the fists.
            a.box(0.034, 0.034, 0.66, bevel=0).move(side * 0.13, back, 0.27).color(P.OAK_WOOD, P.PINE_WOOD)
            a.tube([(side * 0.118, back, shoulder + 0.02), (side * 0.116, 0.0, shoulder + 0.052), (side * 0.12, -deep * 0.95, shoulder - 0.05)], 0.018, 3, caps="none").color(
                P.WALNUT
            )
        sack = jk.loft(
            [(0.3, 0.13, 0.075, -back - 0.09), (0.4, 0.19, 0.108, -back - 0.108), (0.6, 0.195, 0.112, -back - 0.112), (0.73, 0.15, 0.085, -back - 0.095), (0.78, 0, 0, -back - 0.09)],
            8,
            2.5,
        ).rot(x=90)
        burlap = jk.mix(P.SAND, P.OAK_WOOD, 0.45)
        a.add(sack).color(jk.shade(burlap, -0.22), jk.shade(burlap, 0.08)).smooth(70)
        # One rope hitch around the sack, a bedroll across the top and a pot swinging at the side.
        a.add(jk.loft([(0.475, 0.2, 0.117, -back - 0.11), (0.505, 0.201, 0.118, -back - 0.111)], 8, 2.5, caps="none").rot(x=90)).color(P.BARK_DARK)
        a.cyl(0.08, 0.44, 6, bevel=0.018).rot(y=90).move(-0.22, back + 0.08, 0.86).color(jk.shade(P.BRICK, -0.12), P.TERRACOTTA)
        a.lathe([(0, 0), (0.046, 0.012), (0.052, 0.062), (0.042, 0.072)], 5).move(0.225, back + 0.07, 0.42).color(jk.shade(P.COPPER, -0.2), P.COPPER).smooth(80)
    pack.rot(x=lean, pivot=(0, 0, hip))


# --------------------------------------------------------------------------------------------
# Enhanced citizen (S5): slender, lilac-skinned, a seam of light down the chest and a small crest
# --------------------------------------------------------------------------------------------
@asset("enhanced", tint="#e9e2f5", budget=900)
def enhanced(a):
    g = parts.figure(a, skin=LILAC, hair=None, slim=1.0, legs="tint", shoes=jk.mix(P.VIOLET, LILAC, 0.4), skirt=True, stride=0.26)
    head, r = g.anchors["head"], g.anchors["head_r"]
    deep, shoulder, hip = (g.anchors[k] for k in ("deep", "shoulder", "hip"))
    # Chest seam and a swept crest, both softly luminous.
    a.box(0.02, 0.016, shoulder - hip - 0.07, bevel=0.006).move(0, -deep * 0.9, hip + 0.06).part("glow").color(P.GLOW_CYAN)
    crest = [(-r * 0.62, r * 0.7), (-r * 0.1, r * 0.9), (r * 0.55, r * 0.72), (r * 1.25, r * 0.86), (r * 0.5, r * 1.22), (-r * 0.2, r * 1.14)]
    a.profile_x(crest, 0.022, bevel=0.007).move(0, head.y, head.z).part("glow").color(P.GLOW_MAGENTA)
    # A high collar frames the long neck.
    a.lathe([(0.05, 0), (0.07, 0), (0.094, 0.06), (0.078, 0.064), (0.05, 0)], 8, cap_bottom=False, cap_top=False).scale(1, 0.9, 1).rot(x=-14).move(
        0, 0.012, shoulder + 0.028
    ).part("tint").color(P.SHADE_2, P.WHITE)


# --------------------------------------------------------------------------------------------
# Astronaut: a chunky pressure suit (tint), life-support pack, gold visor and suit lights
# --------------------------------------------------------------------------------------------
@asset("astronaut", tint="#eef0f2", budget=900)
def astronaut(a):
    grey, dark = P.STEEL, P.GUNMETAL

    def ring(r, h, sides=8):
        return a.lathe([(r, 0), (r, h)], sides, cap_bottom=False, cap_top=False).color(dark).smooth(80)

    for side in (-1, 1):
        x = side * 0.112
        # Moon boots under thick legs.
        a.loft([(-0.15, 0, 0, 0.04), (-0.1, 0.075, 0.048, 0.048), (0.01, 0.086, 0.06, 0.06), (0.09, 0.07, 0.05, 0.055), (0.105, 0, 0, 0.055)], 6, 3.0).move(x, 0, 0).part(
            "tint"
        ).color(P.SHADE_3, P.SHADE_1).smooth(75)
        a.tube([(x * 0.86, 0, 0.42), (x, 0.005, 0.24), (x, 0.012, 0.08)], [0.1, 0.092, 0.086], 8, caps="none").part("tint").color(P.SHADE_2, P.WHITE).smooth(80)
        ring(0.094, 0.03).move(x, 0.01, 0.105)
    # Torso: a soft rounded block with a hard waist ring.
    a.add(jk.loft([(0.33, 0.185, 0.125), (0.42, 0.202, 0.137), (0.6, 0.2, 0.134), (0.685, 0.12, 0.09)], 10, 3.0).rot(x=90)).part("tint").color(P.SHADE_1, P.WHITE)
    ring(0.202, 0.03, 10).scale(1, 0.68, 1).move(0, 0, 0.375)
    # Chest pack with two status lights.
    a.box(0.19, 0.05, 0.12, bevel=0.022).move(0, -0.148, 0.47).color(grey, P.CHROME)
    a.box(0.045, 0.014, 0.04, bevel=0).move(-0.045, -0.176, 0.515).part("glow").color(P.GLOW_GREEN)
    a.box(0.045, 0.014, 0.04, bevel=0).move(0.035, -0.176, 0.515).part("glow").color(P.GLOW_ORANGE)
    # Arms held a little out by the suit, with cuff rings and grey gloves.
    for side in (-1, 1):
        pts = [(side * 0.16, 0, 0.655), (side * 0.218, 0, 0.61), (side * 0.25, -0.01, 0.48), (side * 0.262, -0.03, 0.37)]
        a.tube(pts[:2], [0.04, 0.078], 8, caps="none").part("tint").color(P.WHITE).smooth(80)
        a.tube(pts[1:], [0.078, 0.072, 0.068], 8, caps="none").part("tint").color(P.SHADE_2, P.WHITE).smooth(80)
        ring(0.074, 0.03).rot(x=12, y=-side * 6).move(side * 0.26, -0.027, 0.36)
        a.sphere(0.064, 6, 4).smooth(90).move(side * 0.266, -0.04, 0.31).color(jk.shade(grey, -0.25), grey)
    # Life-support pack: hoses to the helmet, an antenna and a beacon.
    a.box(0.33, 0.15, 0.44, bevel=0.05).move(0, 0.185, 0.29).part("tint").color(P.SHADE_3, P.SHADE_1)
    a.box(0.2, 0.02, 0.15, bevel=0).move(0, 0.255, 0.47).color(dark)
    a.box(0.05, 0.012, 0.03, bevel=0).move(0, 0.268, 0.56).part("glow").color(P.GLOW_RED)
    a.tube([(0.125, 0.19, 0.7), (0.14, 0.19, 0.91)], 0.01, 4).part("metal").color(P.STEEL)
    a.sphere(0.022, 5, 3).smooth(90).move(0.14, 0.19, 0.925).part("glow").color(P.GLOW_ORANGE)
    for side in (-1, 1):
        a.tube([(side * 0.11, 0.19, 0.7), (side * 0.125, 0.135, 0.775), (side * 0.12, 0.05, 0.74)], 0.021, 4, caps="none").color(grey).smooth(80)
    # Helmet: collar ring, a white bowl, a gold visor and two lamps.
    a.lathe([(0.118, 0), (0.136, 0.022), (0.118, 0.046)], 8, cap_bottom=False, cap_top=False).move(0, 0, 0.672).part("metal").color(P.STEEL)
    a.sphere(0.2, 12, 6, (1.0, 0.98, 0.94)).move(0, 0, 0.8).part("tint").color(P.SHADE_1, P.WHITE)
    visor = [(math.cos(math.radians(t)) * 0.208, math.sin(math.radians(t)) * 0.208) for t in (38, 64)] + [(0, 0.208)]
    a.lathe(visor, 12, cap_bottom=False).rot(x=99).scale(1.0, 0.98, 0.9).move(0, 0, 0.802).part("glass").color(jk.shade(P.GOLD, -0.35), P.GOLD)
    for side in (-1, 1):
        a.box(0.03, 0.065, 0.05, bevel=0).move(side * 0.194, -0.045, 0.83).color(grey)
        a.box(0.024, 0.012, 0.034, bevel=0).move(side * 0.194, -0.082, 0.838).part("glow").color(P.GLOW_WHITE)
