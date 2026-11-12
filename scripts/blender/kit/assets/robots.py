"""Robots. Shells are the tint part; joints gleam as metal; eyes and status lights glow.

`metal` takes the instance colour too, so on strongly coloured robots (mech, crawler, gardener)
the neutral steel joints are painted `base`, and `metal` is kept for plates meant to gleam in
the robot's own colour. Every robot faces -y.
"""

import math

from mathutils import Vector

from kit import jk
from kit import palette as P
from kit.jk import asset


def upright(a, sections, sides=10, power=3.0, caps="flat"):
    """A shell lofted upward from z = 0. Sections are (height, half-width, half-depth[, forward
    offset[, x offset]]); a zero radius closes the shell in a point."""
    return a.loft(sections, sides, power, caps).rot(x=90)


def service_robot(a, stride=0.0):
    swing = stride * 0.2
    # Legs: short pistons into rounded boots.
    for side in (-1, 1):
        y = -side * swing
        a.tube([(side * 0.12, y * 0.2, 0.46), (side * 0.12, y, 0.14)], 0.045, 8).part("metal").color(P.STEEL_DARK)
        a.loft([(-0.12, 0, 0), (-0.1, 0.085, 0.05, 0.05), (0.02, 0.095, 0.07, 0.07), (0.09, 0.085, 0.06, 0.06), (0.1, 0, 0)], 10, 3).move(
            side * 0.12, y, 0
        ).part("tint").color(P.SHADE_2, P.SHADE_1)
        a.sphere(0.06, 8, 4).move(side * 0.12, y * 0.2, 0.47).part("metal").color(P.STEEL)
    # Body: a soft capsule with a chest panel.
    a.capsule(0.24, 0.52, 12, 3).scale(1, 0.82, 1).move(0, 0, 0.42).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(0.2, 0.03, 0.14, bevel=0.03).move(0, -0.2, 0.62).color(P.INK)
    a.box(0.05, 0.02, 0.05, bevel=0.012).move(-0.045, -0.218, 0.665).part("glow").color(P.GLOW_CYAN)
    a.box(0.05, 0.02, 0.05, bevel=0.012).move(0.035, -0.218, 0.665).part("glow").color(P.GLOW_ORANGE)
    a.torus(0.2, 0.025, 12, 4).scale(1, 0.82, 1).move(0, 0, 0.5).part("metal").color(P.STEEL)
    # Arms on ball joints.
    for side in (-1, 1):
        y = side * swing
        a.sphere(0.07, 8, 4).move(side * 0.27, 0, 0.8).part("metal").color(P.STEEL)
        a.tube([(side * 0.3, 0, 0.78), (side * 0.34, y * 0.5, 0.62), (side * 0.35, y, 0.48)], [0.05, 0.045, 0.05], 8, caps="round").part(
            "tint"
        ).color(P.SHADE_1)
        a.sphere(0.055, 8, 4).move(side * 0.35, y, 0.44).part("metal").color(P.STEEL_DARK)
    # Head: a rounded helmet with a dark visor and two bright eyes.
    a.cyl(0.07, 0.06, 10, bevel=0.01).move(0, 0, 0.93).part("metal").color(P.STEEL_DARK)
    a.loft([(-0.19, 0, 0), (-0.17, 0.15, 0.12), (0, 0.21, 0.16), (0.15, 0.17, 0.13), (0.18, 0, 0)], 14, 3).move(0, 0, 1.12).part(
        "tint"
    ).color(P.SHADE_1, P.WHITE)
    a.loft([(-0.2, 0, 0), (-0.185, 0.15, 0.065), (-0.12, 0.185, 0.085), (-0.1, 0.19, 0.09)], 14, 3, caps="none").move(0, 0, 1.12).part(
        "glass"
    ).color(P.INK)
    for side in (-1, 1):
        a.sphere(0.03, 8, 5, (1, 0.5, 1)).move(side * 0.07, -0.2, 1.13).part("glow").color(P.GLOW_CYAN)
    a.tube([(0.1, 0.02, 1.26), (0.13, 0.03, 1.4)], 0.012, 5).part("metal").color(P.STEEL)
    a.sphere(0.03, 6, 4).move(0.13, 0.03, 1.41).part("glow").color(P.GLOW_ORANGE)


@asset("robot", tint="#e6e8ea", budget=1500)
def robot(a):
    service_robot(a)


@asset("robot-walk", tint="#e6e8ea", budget=1500)
def robot_walk(a):
    service_robot(a, stride=0.45)


# --------------------------------------------------------------------------------------------
# Sentinel
# --------------------------------------------------------------------------------------------
@asset("sentinel", tint="#3a3f48", budget=1500, note="Security unit: armoured shell is the tint; one red sensor.")
def sentinel(a):
    """S1's watcher: a tall, narrow sentry in an armoured greatcoat, standing to attention. A
    lighthouse head turns one red sensor band under a peaked cap, a lamp rides on each shoulder,
    its shins are steel greaves over polished boots, a riot shield is slung on its back and a
    baton hangs at its hip."""
    plate = (P.SHADE_1, P.WHITE)
    trim = (P.SHADE_3, P.SHADE_2)
    steel = (P.STEEL_DARK, jk.mix(P.STEEL_DARK, P.STEEL, 0.7))
    ember = jk.mix(P.GLOW_RED, "#5a0f0c", 0.3)
    # Legs: polished boots, steel greaves with a knee guard, and the frame running up under the coat.
    for side in (-1, 1):
        x = side * 0.15
        a.loft([(-0.27, 0, 0, 0.04), (-0.245, 0.074, 0.045, 0.045), (-0.08, 0.092, 0.066, 0.066), (0.11, 0.086, 0.06, 0.06), (0.16, 0, 0, 0.05)], 8, 3).move(
            x, 0, 0
        ).part("metal").color(P.SHADE_2, P.WHITE)
        greave = upright(a, [(0, 0.06, 0.074), (0.06, 0.078, 0.094, 0.008), (0.42, 0.088, 0.1, 0.022), (0.5, 0.068, 0.08, 0.026)], 8, 3).move(x, 0.01, 0.09)
        greave.color(*steel).paint(lambda f: P.GUNMETAL if not 0.15 < f.calc_center_median().z < 0.51 else None)
        a.sphere(0.08, 6, 3, (1.0, 0.7, 1.3)).move(x, -0.085, 0.65).part("tint").color(*plate)
        a.tube([(x, 0.01, 0.58), (side * 0.13, 0.01, 0.98)], 0.055, 6, caps="none").color(P.INK, P.GUNMETAL)

    # The greatcoat: an armoured skirt from the belt to the knee, with a vent at the front hem.
    upright(a, [(0, 0.268, 0.2), (0.035, 0.28, 0.21), (0.3, 0.225, 0.172), (0.47, 0.178, 0.14)], 10, 3.2).move(0, 0.01, 0.76).part("tint").color(*plate)
    upright(a, [(0, 0.286, 0.216), (0.05, 0.288, 0.217)], 10, 3.2, caps="none").move(0, 0.01, 0.775).part("tint").color(*trim)
    a.profile_y([(-0.05, 0), (0.05, 0), (0, 0.24)], 0.02, bevel=0).rot(x=-7).move(0, -0.206, 0.762).color(P.INK)
    upright(a, [(0, 0.19, 0.15), (0.065, 0.19, 0.15)], 10, 3.2).move(0, 0.01, 1.2).color(P.INK, P.CHARCOAL)
    a.box(0.08, 0.03, 0.055, bevel=0).move(0, -0.155, 1.205).color(P.STEEL)
    # Chest: tall and narrow, with a dark vent and one badge light.
    upright(
        a,
        [(0, 0.17, 0.13), (0.06, 0.2, 0.15, 0.005), (0.27, 0.275, 0.18, 0.02), (0.38, 0.285, 0.18, 0.02), (0.44, 0.235, 0.15, 0.01), (0.47, 0.12, 0.09, 0)],
        10,
        3.2,
    ).move(0, 0, 1.25).part("tint").color(*plate)
    a.box(0.22, 0.03, 0.055, bevel=0).move(0, -0.204, 1.5).color(P.INK)
    a.box(0.05, 0.02, 0.035, bevel=0).move(0.17, -0.2, 1.6).part("glow").color(P.GLOW_RED)

    # Head: a lighthouse. The sensor band looks all the way round, the lens is where it looks
    # now, and the peak of the cap shades it.
    a.lathe([(0.125, 1.66), (0.168, 1.71), (0.158, 1.785), (0.128, 1.785)], 8).scale(1, 0.92, 1).part("tint").color(*trim)
    a.lathe([(0.1, 1.76), (0.126, 1.785), (0.13, 1.832)], 10, cap_top=False).part("tint").color(*plate)
    a.lathe([(0.126, 1.828), (0.138, 1.84), (0.138, 1.908), (0.126, 1.92)], 10, cap_bottom=False, cap_top=False).part("glow").color(ember)
    a.lathe([(0.13, 1.916), (0.134, 1.958), (0.1, 2.014), (0.04, 2.038), (0, 2.042)], 10, cap_bottom=False).part("tint").color(*plate)
    a.loft([(-0.222, 0.045, 0.006, 1.914), (-0.185, 0.105, 0.009, 1.92), (-0.1, 0.136, 0.011, 1.927)], 6, 2.0).color(P.INK)
    a.sphere(0.044, 6, 4, (1.1, 0.55, 0.95)).move(0, -0.137, 1.872).part("glow").color(jk.mix(P.GLOW_ORANGE, P.GLOW_WHITE, 0.35))
    a.tube([(-0.08, 0.06, 2.0), (-0.095, 0.085, 2.11)], [0.011, 0.007], 4).color(P.STEEL)

    # Shoulders: pauldrons, each carrying a lamp; steel upper arms; gauntlets; closed fists.
    for side in (-1, 1):
        a.sphere(0.145, 8, 4, (1.08, 1.15, 0.7)).rot(y=side * 20).move(side * 0.365, 0, 1.6).part("tint").color(*plate).smooth(70)
        with a.group() as lamp:
            a.lathe([(0.038, 0), (0.05, 0.02), (0.05, 0.15)], 8).rot(x=90).color(P.INK, P.GUNMETAL)
            a.lathe([(0.042, 0), (0, 0.006)], 8, cap_bottom=False).rot(x=90).move(0, -0.15, 0).part("glow").color(P.LAMP)
        lamp.rot(x=-8, z=side * 6).move(side * 0.385, -0.02, 1.728)
        a.tube([(side * 0.4, 0, 1.56), (side * 0.445, 0.02, 1.2)], 0.048, 6, caps="none").color(*steel)
        upright(a, [(0, 0.058, 0.064), (0.06, 0.082, 0.09), (0.28, 0.076, 0.084), (0.35, 0.05, 0.056)], 8, 3).move(side * 0.455, 0.02, 0.86).part(
            "tint"
        ).color(*plate)
        a.box(0.1, 0.12, 0.115, bevel=0.03).move(side * 0.455, 0.01, 0.755).color(P.INK, P.CHARCOAL)

    # Slung on its back: a power pack and a riot shield with a view slit and a hazard band.
    a.box(0.3, 0.11, 0.34, bevel=0.03).move(0, 0.215, 1.3).part("tint").color(*trim)
    with a.group() as shield:
        a.profile_y([(-0.2, 0), (0.2, 0), (0.2, 0.64), (0.13, 0.76), (-0.13, 0.76), (-0.2, 0.64)], 0.06, bevel=0.018).part("tint").color(*plate)
        a.box(0.3, 0.02, 0.07, bevel=0).move(0, 0.03, 0.2).color(P.RED)
        a.box(0.24, 0.02, 0.05, bevel=0).move(0, 0.03, 0.56).part("glass").color(P.INK, P.GLASS_DARK)
    shield.rot(x=-8).move(0, 0.336, 0.84)
    # The baton hangs from the belt behind the right hip.
    a.tube([(0.25, 0.14, 1.22), (0.27, 0.19, 0.82)], [0.03, 0.026], 6).color(P.INK, P.GUNMETAL)
    a.tube([(0.262, 0.166, 1.0), (0.267, 0.178, 0.9)], 0.032, 6, caps="none").part("glow").color(P.GLOW_ORANGE)


# --------------------------------------------------------------------------------------------
# Mech
# --------------------------------------------------------------------------------------------
@asset("mech", tint="#c4452f", budget=2400, note="Piloted walker: hull, thighs and arm pods are the tint.")
def mech(a):
    plate = (P.SHADE_1, P.WHITE)
    trim = (P.SHADE_3, P.SHADE_2)
    iron = (P.INK, P.GUNMETAL)
    # Legs: reverse-jointed, thick thighs over gleaming shins and broad feet.
    for side in (-1, 1):
        x = side * 0.68
        a.box(0.46, 0.88, 0.05, bevel=0.015).move(x, -0.1, 0).color(P.INK)
        a.loft(
            [(-0.52, 0.13, 0.05, 0.08), (-0.44, 0.2, 0.08, 0.11), (-0.1, 0.22, 0.12, 0.15), (0.2, 0.2, 0.11, 0.14), (0.32, 0.13, 0.06, 0.1)], 10, 3.5
        ).move(x, 0, 0).part("tint").color(*trim)
        a.sphere(0.115, 8, 4).move(x, 0.02, 0.3).color(P.STEEL_DARK)
        a.tube([(x, 0.02, 0.3), (x, 0.43, 1.02)], [0.105, 0.125], 8).part("metal").color(P.SHADE_1, P.WHITE)
        a.tube([(x, -0.12, 0.52), (x, 0.17, 1.22)], 0.032, 4).color(P.STEEL)
        a.sphere(0.165, 8, 5).move(x, 0.44, 1.03).color(*iron)
        a.tube([(x, 0.43, 1.04), (x, 0.2, 1.42), (x, 0.06, 1.72)], [0.15, 0.185, 0.175], 10).part("tint").color(*plate)
        a.cyl(0.215, 0.18, 12, bevel=0.03).rot(y=90).move(x - 0.09, 0.06, 1.72).color(*iron)
    a.box(1.26, 0.5, 0.28, bevel=0.05).move(0, 0.06, 1.55).color(*iron)

    # Hull and cockpit canopy.
    a.loft(
        [(0.6, 0.36, 0.3, 2.0), (0.5, 0.5, 0.42, 2.02), (0.1, 0.56, 0.47, 2.05), (-0.35, 0.54, 0.44, 2.02), (-0.62, 0.43, 0.31, 1.94), (-0.7, 0.3, 0.18, 1.9)],
        12,
        3.5,
    ).part("tint").color(*plate)
    a.loft(
        [(-0.73, 0.2, 0.08, 2.2), (-0.6, 0.33, 0.2, 2.3), (-0.3, 0.37, 0.27, 2.4), (0.0, 0.33, 0.24, 2.43), (0.12, 0.25, 0.13, 2.44)], 12, 2.6
    ).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    a.loft([(-0.335, 0.38, 0.28, 2.4), (-0.265, 0.378, 0.278, 2.405)], 12, 2.6, caps="none").part("tint").color(P.SHADE_2)
    a.box(0.46, 0.03, 0.17, bevel=0.03).move(0, -0.708, 1.82).color(P.INK)
    for side in (-1, 1):
        a.box(0.11, 0.02, 0.06, bevel=0.015).move(side * 0.12, -0.727, 1.9).part("glow").color(P.GLOW_CYAN)
    # Engine deck, exhaust stacks, antenna and the rear grille.
    a.box(0.62, 0.42, 0.16, bevel=0.04).move(0, 0.36, 2.44).part("tint").color(*trim)
    for side in (-1, 1):
        a.cyl(0.062, 0.24, 8, bevel=0.012).move(side * 0.2, 0.42, 2.56).color(*iron)
    a.tube([(0.26, 0.5, 2.56), (0.29, 0.55, 3.12)], 0.014, 4).color(P.STEEL_DARK)
    a.sphere(0.035, 6, 4).move(0.29, 0.55, 3.13).part("glow").color(P.GLOW_RED)
    a.box(0.52, 0.04, 0.3, bevel=0.03).move(0, 0.6, 1.84).color(P.INK)
    for z in (1.9, 1.98, 2.06):
        a.box(0.42, 0.02, 0.03, bevel=0).move(0, 0.625, z).color(P.STEEL_DARK)

    # Arm pods on stub shoulders: launcher ports above a slung cannon.
    for side in (-1, 1):
        cx = side * 0.88
        a.cyl(0.13, 0.26, 10, bevel=0.02).rot(y=90).move(side * 0.63 - 0.13, 0.05, 2.14).color(*iron)
        a.loft([(0.42, 0.13, 0.15, 2.12, cx), (0.34, 0.17, 0.2, 2.12, cx), (-0.36, 0.17, 0.2, 2.12, cx), (-0.44, 0.14, 0.16, 2.12, cx)], 10, 4).part(
            "tint"
        ).color(*plate)
        a.box(0.22, 0.03, 0.2, bevel=0.02).move(cx, -0.445, 2.06).color(P.INK)
        for z in (2.19, 2.1):
            a.cyl(0.036, 0.016, 8, bevel=0).rot(x=90).move(cx, -0.466, z).part("glow").color(P.GLOW_ORANGE)
        a.box(0.1, 0.24, 0.08, bevel=0.02).move(cx, -0.26, 1.86).color(*iron)
        a.cyl(0.05, 0.5, 8, bevel=0.012).rot(x=90).move(cx, -0.28, 1.88).color(P.STEEL_DARK, P.STEEL)


# --------------------------------------------------------------------------------------------
# Spider-bot
# --------------------------------------------------------------------------------------------
@asset("spider-bot", tint="#e0a830", budget=1500, note="Six-legged maintenance crawler; shell and thighs are the tint.")
def spider_bot(a):
    plate = (P.SHADE_1, P.WHITE)
    # Body: a low shell over a dark chassis, with a wrap-round visor and two eyes.
    a.cyl(0.4, 0.12, 12, bevel=0.025).scale(1, 1.18, 1).move(0, 0, 0.29).color(P.INK, P.GUNMETAL)
    a.loft(
        [(-0.52, 0, 0, 0.48), (-0.44, 0.33, 0.14, 0.5), (-0.12, 0.44, 0.2, 0.54), (0.28, 0.41, 0.19, 0.53), (0.5, 0.26, 0.11, 0.49), (0.55, 0, 0, 0.48)], 12, 2.8
    ).part("tint").color(*plate)
    a.loft([(-0.545, 0, 0, 0.5), (-0.47, 0.325, 0.07, 0.515), (-0.3, 0.405, 0.085, 0.54), (-0.22, 0.428, 0.09, 0.548)], 12, 2.8, caps="none").part(
        "glass"
    ).color(P.INK)
    for side in (-1, 1):
        a.sphere(0.04, 6, 4, (1, 0.5, 1)).move(side * 0.13, -0.522, 0.51).part("glow").color(P.GLOW_CYAN)
    a.box(0.16, 0.03, 0.04, bevel=0).move(0, 0.535, 0.5).part("glow").color(P.GLOW_RED)

    # Six legs: tinted thigh up to a high knee, steel shin down to a rubber foot.
    for hip_y, hip_x, tip_y, tip_x in ((-0.3, 0.33, -1.0, 0.68), (0.02, 0.4, 0.02, 1.02), (0.33, 0.33, 1.02, 0.68)):
        for side in (-1, 1):
            hip = Vector((side * hip_x, hip_y, 0.47))
            tip = Vector((side * tip_x, tip_y, 0.04))
            out = Vector((tip.x - hip.x, tip.y - hip.y, 0)).normalized()
            knee = hip + out * (tip - hip).length * 0.4
            knee.z = 0.79
            shin = knee.lerp(tip, 0.5) + out * 0.05
            a.tube([hip, knee], [0.09, 0.07], 6).part("tint").color(*plate)
            # The knee is a hinge pin lying across the leg.
            a.cyl(0.092, 0.17, 8, bevel=0).move(0, 0, -0.085).rot(x=90).rot(z=math.degrees(math.atan2(out.y, out.x))).move(*knee).color(
                P.INK, P.GUNMETAL
            )
            a.tube([knee, shin, tip], [0.06, 0.05, 0.036], 6).color(P.STEEL_DARK, P.STEEL)
            a.cyl(0.068, 0.045, 6, bevel=0).move(tip.x, tip.y, 0).color(P.INK)

    # Tool turret: a slewing drum with a jointed arm that ends in a welding tip.
    a.cyl(0.2, 0.06, 12, bevel=0.012).move(0, 0.08, 0.7).color(P.INK, P.GUNMETAL)
    a.cyl(0.15, 0.1, 10, bevel=0.02).move(0, 0.08, 0.75).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.box(0.1, 0.12, 0.07, bevel=0.02).move(0, 0.06, 0.84).color(P.GUNMETAL)
    arm = [(0, 0.06, 0.88), (0, -0.2, 0.93), (0, -0.52, 0.82), (0, -0.66, 0.68)]
    a.tube(arm, 0.04, 5).color(P.STEEL_DARK, P.STEEL)
    for p in arm[1:3]:
        a.sphere(0.058, 6, 4).move(*p).color(P.GUNMETAL)
    a.box(0.1, 0.1, 0.11, bevel=0.025).rot(x=-45).move(0, -0.66, 0.63).color(P.GUNMETAL)
    a.sphere(0.04, 6, 4).move(0, -0.69, 0.6).part("glow").color(P.GLOW_ORANGE)


# --------------------------------------------------------------------------------------------
# Gardener-bot
# --------------------------------------------------------------------------------------------
@asset("gardener-bot", tint="#7fbf5a", budget=1500, note="Friendly gardener: sun hat, watering arm, seedling tray on its back.")
def gardener_bot(a):
    plate = (P.SHADE_1, P.WHITE)
    for side in (-1, 1):
        a.tube([(side * 0.11, 0, 0.36), (side * 0.11, 0, 0.12)], 0.042, 6).color(P.STEEL_DARK)
        a.loft([(-0.13, 0, 0), (-0.11, 0.085, 0.05, 0.05), (0.01, 0.1, 0.072, 0.072), (0.085, 0.09, 0.06, 0.06), (0.1, 0, 0)], 8, 3).move(
            side * 0.11, 0, 0
        ).part("tint").color(P.SHADE_2, P.SHADE_1)
    # Pot-bellied body with a status panel and a leather tool belt.
    a.lathe([(0.12, 0.27), (0.2, 0.29), (0.265, 0.4), (0.275, 0.52), (0.23, 0.66), (0.13, 0.74), (0.07, 0.76)], 12).scale(1, 0.86, 1).part(
        "tint"
    ).color(*plate)
    a.box(0.2, 0.03, 0.13, bevel=0.03).move(0, -0.226, 0.5).color(P.INK)
    a.box(0.05, 0.02, 0.05, bevel=0).move(-0.045, -0.244, 0.54).part("glow").color(P.GLOW_GREEN)
    a.box(0.05, 0.02, 0.05, bevel=0).move(0.035, -0.244, 0.54).part("glow").color(P.GLOW_CYAN)
    a.torus(0.262, 0.024, 12, 4).scale(1, 0.86, 1).move(0, 0, 0.4).color(P.WALNUT)

    # Head: a round helmet, dark visor and two big eyes under a straw sun hat.
    a.cyl(0.06, 0.07, 8, bevel=0).move(0, 0, 0.74).color(P.STEEL_DARK)
    a.loft([(-0.18, 0, 0), (-0.16, 0.14, 0.115), (0, 0.195, 0.15), (0.14, 0.16, 0.125), (0.17, 0, 0)], 12, 3).move(0, 0, 0.93).part(
        "tint"
    ).color(*plate)
    a.loft([(-0.19, 0, 0), (-0.175, 0.14, 0.06), (-0.115, 0.172, 0.08), (-0.095, 0.178, 0.084)], 12, 3, caps="none").move(0, 0, 0.93).part(
        "glass"
    ).color(P.INK)
    for side in (-1, 1):
        a.sphere(0.036, 8, 5, (1, 0.5, 1.15)).move(side * 0.07, -0.189, 0.94).part("glow").color(P.GLOW_CYAN)
    hat = a.lathe([(0.3, 0), (0.31, 0.012), (0.3, 0.028), (0.165, 0.05), (0.16, 0.085), (0.15, 0.125), (0.1, 0.165), (0, 0.175)], 16)
    hat.color(jk.shade(P.STRAW, -0.14), P.STRAW)
    hat.paint(lambda f: P.WALNUT if 0.05 < f.calc_center_median().z < 0.085 and f.normal.z < 0.5 else None)
    hat.rot(x=-10).move(0, 0.02, 1.03)

    # Right arm: a hose ending in a brass watering rose.
    a.sphere(0.06, 6, 4).move(0.25, 0, 0.66).color(P.STEEL)
    a.tube([(0.26, 0, 0.66), (0.3, -0.15, 0.62), (0.305, -0.3, 0.66), (0.305, -0.37, 0.61)], 0.04, 6).part("tint").color(P.SHADE_1)
    rose = a.lathe([(0.03, 0), (0.03, 0.04), (0.09, 0.11), (0.09, 0.135), (0, 0.137)], 8).color(jk.shade(P.BRASS, -0.15), P.BRASS)
    rose.paint(lambda f: P.CHARCOAL if f.normal.z > 0.9 else None)
    rose.rot(x=130).move(0.305, -0.35, 0.63)
    # Left arm: hanging, with a trowel in hand.
    a.sphere(0.06, 6, 4).move(-0.25, 0, 0.66).color(P.STEEL)
    a.tube([(-0.265, 0, 0.65), (-0.3, -0.04, 0.5), (-0.305, -0.1, 0.38)], [0.045, 0.04, 0.042], 6, caps="round").part("tint").color(P.SHADE_1)
    a.sphere(0.05, 8, 4).move(-0.305, -0.11, 0.35).color(P.STEEL_DARK)
    a.tube([(-0.305, -0.1, 0.36), (-0.305, -0.2, 0.3)], 0.017, 4).color(P.WALNUT)
    a.plate([(-0.038, 0), (-0.03, -0.1), (0, -0.15), (0.03, -0.1), (0.038, 0)], 0.014).rot(x=-32).move(-0.305, -0.2, 0.3).color(P.STEEL)

    # Seedling tray carried on the back.
    a.box(0.42, 0.2, 0.2, bevel=0.025).move(0, 0.3, 0.5).color(jk.shade(P.OAK_WOOD, -0.1), P.PINE_WOOD)
    a.box(0.44, 0.215, 0.035, bevel=0).move(0, 0.3, 0.56).color(P.WALNUT)
    a.box(0.36, 0.15, 0.02, bevel=0).move(0, 0.3, 0.69).color(P.BARK)
    for i, (x, h) in enumerate(((-0.13, 0.15), (0.0, 0.21), (0.13, 0.13))):
        a.tube([(x, 0.3, 0.7), (x + 0.01, 0.3, 0.7 + h)], 0.012, 4).color(P.LEAF_DEEP)
        a.blob(0.07, 1, (1.1, 1.1, 0.7), lumps=0.2, seed=i + 2).move(x + 0.01, 0.3, 0.72 + h).color(P.LEAF, P.LIME)


# --------------------------------------------------------------------------------------------
# Machine walker
# --------------------------------------------------------------------------------------------
@asset("machine-walker", tint="#1f2230", budget=1400, note="S9's machine: a spindle pod on four arched legs. No face.")
def machine_walker(a):
    # A spindle pod: glossy dark keel, a cold light seam, and the tinted crown.
    a.lathe([(0, 1.02), (0.07, 1.12), (0.17, 1.3), (0.27, 1.5), (0.31, 1.6)], 16, cap_top=False).part("glass").color(P.INK, P.GLASS_DARK)
    a.lathe([(0.31, 1.6), (0.326, 1.613), (0.326, 1.657), (0.31, 1.67)], 16, cap_bottom=False, cap_top=False).part("glow").color(P.GLOW_CYAN)
    a.lathe([(0.31, 1.67), (0.33, 1.8), (0.3, 1.98), (0.22, 2.14), (0.11, 2.26), (0.04, 2.31), (0, 2.32)], 16, cap_bottom=False).part(
        "tint"
    ).color(P.SHADE_2, P.WHITE)
    a.box(0.028, 0.03, 0.2, bevel=0).rot(x=-6).move(0, -0.318, 1.76).part("glow").color(P.GLOW_CYAN)
    a.sphere(0.036, 6, 4).move(0, 0, 1.03).part("glow").color(P.GLOW_CYAN)
    a.tube([(0, 0, 2.3), (0, 0, 2.5)], [0.02, 0.006], 5).part("metal").color(P.WHITE)

    # Four legs arch up from the seam to high knees, then fall away to needle feet.
    for i in range(4):
        with a.group() as g:
            a.sphere(0.075, 6, 4).move(0.31, 0, 1.74).part("metal").color(P.SHADE_1)
            a.tube([(0.31, 0, 1.74), (0.56, 0, 1.95), (0.8, 0, 2.02)], [0.056, 0.05, 0.046], 6).part("metal").color(P.SHADE_1, P.WHITE)
            a.sphere(0.066, 6, 4).move(0.8, 0, 2.02).part("metal").color(P.SHADE_1)
            a.tube([(0.8, 0, 2.02), (0.98, 0, 1.6), (1.11, 0, 0.8), (1.17, 0, 0.05)], [0.046, 0.044, 0.034, 0.022], 6).part("metal").color(
                P.SHADE_2, P.WHITE
            )
            a.lathe([(0.075, 0), (0.085, 0.018), (0.026, 0.08)], 6).move(1.17, 0, 0).part("metal").color(P.SHADE_2)
        g.rot(z=45 + 90 * i)
