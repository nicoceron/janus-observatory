"""Presentation pieces for the explorer's close-up studies."""

from kit import jk
from kit import palette as P
from kit.jk import asset


@asset("plinth", tint="#86be62", budget=1300, note="Round display base; its top (z = 0) takes the study's ground colour.")
def plinth(a):
    # A turned base, modelled ten times life size like the landmarks it carries: a dark foot,
    # a stone drum with a soft shoulder, and a slightly sunk top that carries the ground colour.
    a.lathe(
        [(8.3, -1.5), (8.5, -1.34), (8.5, -1.16), (8.14, -1.04), (8.0, -0.24), (7.86, -0.04), (7.62, 0.0)],
        44,
        cap_top=False,
    ).color(jk.shade(P.CHARCOAL, -0.1), P.STONE_DARK)
    a.lathe([(0.0, -0.045), (7.6, -0.045), (7.74, 0.0), (7.62, 0.02)], 44, cap_bottom=False, cap_top=False).part("tint").color(
        P.SHADE_1, P.WHITE
    )
    # A thin brass inlay ring where the ground meets the stone.
    a.torus(7.92, 0.045, 44, 5).move(0, 0, -0.03).part("metal").color(P.BRASS)


# --------------------------------------------------------------------------------------------
# Colony pieces: tiny structures laid by the hundred over the built ground of a companion body.
# Each is one unit across and a handful of triangles, so a whole settled region stays cheap.
# --------------------------------------------------------------------------------------------
@asset("micro-block", tint="#a2a4a9", budget=40, note="One unit square; repeated across built ground.")
def micro_block(a):
    # Thousands of these cover a settled moon, so every triangle is counted: a body, a roof
    # deck, and one lit band a side that reads as a row of windows from orbit.
    a.box(1.0, 1.0, 0.66, bevel=0, grounded=True).part("tint").color(P.SHADE_2, P.WHITE)
    a.box(0.8, 0.8, 0.08, bevel=0, grounded=True).move(0, 0, 0.66).color(P.SLATE, P.CONCRETE_DARK)
    for turn in (0, 90, 180, 270):
        a.raw(
            [(-0.33, -0.502, 0.3), (0.33, -0.502, 0.3), (0.33, -0.502, 0.44), (-0.33, -0.502, 0.44)],
            [(0, 1, 2, 3)],
        ).rot(z=turn).part("lit").color(P.WINDOW)


@asset("micro-tank", tint="#9aa6b1", budget=60, note="One unit across; a pressure tank for industrial ground.")
def micro_tank(a):
    a.lathe([(0.5, 0.0), (0.5, 0.76), (0.34, 0.96), (0.0, 1.0)], 6, cap_bottom=False).part("metal").color(
        P.SHADE_2, P.WHITE
    )
    a.box(0.14, 0.14, 0.5, bevel=0, grounded=True).move(0.56, 0, 0).color(P.STEEL_DARK, P.STEEL)


@asset("micro-works", tint="#6f7a86", budget=120, note="One unit square; a low plant for machined ground.")
def micro_works(a):
    a.box(1.0, 1.0, 0.2, bevel=0.04, grounded=True).part("tint").color(P.SHADE_2, P.WHITE)
    a.box(0.42, 0.56, 0.16, bevel=0, grounded=True).move(-0.2, 0.08, 0.2).color(P.STEEL_DARK, P.STEEL)
    a.cyl(0.13, 0.3, sides=6, bevel=0, grounded=True).move(0.26, -0.2, 0.2).part("metal").color(P.SHADE_2, P.WHITE)
    a.box(0.5, 0.05, 0.05, bevel=0).move(0.02, -0.46, 0.12).part("lit").color(P.WINDOW)


@asset("micro-shard", tint="#303650", budget=60, note="One unit tall; the machines' crystalline growth.")
def micro_shard(a):
    a.cyl(0.22, 1.0, sides=4, r2=0.015, bevel=0, grounded=True).rot(z=18).part("metal").color(P.SHADE_3, P.WHITE)
    a.cyl(0.15, 0.56, sides=4, r2=0.01, bevel=0, grounded=True).rot(z=50).rot(y=16).move(0.2, 0.06, 0).part(
        "metal"
    ).color(P.SHADE_3, P.SHADE_1)
    a.cyl(0.11, 0.36, sides=3, r2=0.01, bevel=0, grounded=True).rot(x=14).move(-0.14, -0.16, 0).part("metal").color(
        P.SHADE_3, P.SHADE_2
    )


@asset("lm-hatch", budget=900, note="S8's single sealed hatch on the Moon; ten times life size.")
def lm_hatch(a):
    # A blast collar sunk in regolith, a domed lid with a locking wheel, and one line of light.
    a.lathe([(0.78, 0.0), (0.74, 0.1), (0.56, 0.16), (0.52, 0.16)], 12, cap_bottom=False, cap_top=False).color(
        P.STONE_DARK, P.CONCRETE_DARK
    )
    a.lathe([(0.52, 0.12), (0.5, 0.2), (0.3, 0.27), (0.0, 0.29)], 12, cap_bottom=False).part("metal").color(
        P.STEEL_DARK, P.STEEL
    )
    a.torus(0.16, 0.022, 10, 5).move(0, 0, 0.31).part("metal").color(P.STEEL)
    for turn in (0, 60, 120):
        a.box(0.3, 0.03, 0.02, bevel=0).move(0, 0, 0.3).rot(z=turn).part("metal").color(P.STEEL_DARK)
    a.cyl(0.03, 0.06, sides=6, bevel=0, grounded=True).move(0, 0, 0.27).part("metal").color(P.STEEL_DARK)
    for turn in range(0, 360, 60):
        a.box(0.1, 0.16, 0.07, bevel=0.015).move(0, 0.6, 0.08).rot(z=turn).color(P.CONCRETE_DARK, P.CONCRETE)
    a.box(0.36, 0.035, 0.02, bevel=0).move(0, -0.66, 0.135).rot(x=-22, pivot=(0, -0.66, 0.135)).part("glow").color(
        P.GLOW_ORANGE
    )
    a.box(0.18, 0.3, 0.05, bevel=0.012).move(0, -0.82, 0).color(P.STONE_DARK, P.STONE)


@asset(
    "lm-tether-anchor",
    tint="#e3b84b",
    budget=1500,
    note="Ground station of S3's equatorial tether; the tether rises from its centre. Ten times life size.",
)
def lm_tether_anchor(a):
    # A stepped concrete footing, a gilded collar braced by eight fins, and the sleeve the
    # tether runs through, ringed with light.
    a.lathe([(1.3, 0.0), (1.26, 0.1), (1.12, 0.14), (1.1, 0.26), (0.96, 0.3)], 8, cap_bottom=False, cap_top=False, turn=22.5).color(
        P.CONCRETE_DARK, P.CONCRETE
    )
    a.lathe([(0.98, 0.26), (0.92, 0.5), (0.66, 0.62), (0.4, 0.66)], 16, cap_bottom=False, cap_top=False).part("metal").color(
        P.SHADE_2, P.WHITE
    )
    for i in range(8):
        a.prism([(0.0, 0.0), (0.5, 0.0), (0.06, 0.52), (0.0, 0.52)], 0.07, bevel=0.012).rot(x=90).move(
            0.7, 0.035, 0.26
        ).rot(z=i * 45).color(P.CONCRETE_DARK, P.CONCRETE)
    a.lathe([(0.42, 0.6), (0.4, 0.96), (0.3, 1.04), (0.22, 1.04)], 12, cap_bottom=False, cap_top=False).color(
        P.STEEL_DARK, P.STEEL
    )
    a.torus(0.42, 0.035, 16, 5).move(0, 0, 0.8).part("glow").color(P.GLOW_ORANGE)
    a.torus(0.96, 0.03, 24, 5).move(0, 0, 0.3).part("metal").color(P.WHITE)
    # A service door and two status lamps on the footing.
    a.box(0.22, 0.04, 0.2, bevel=0.01).move(0, -1.105, 0.03).color(P.SLATE, P.STEEL_DARK)
    for x in (-0.24, 0.24):
        a.box(0.05, 0.03, 0.05, bevel=0).move(x, -1.1, 0.16).part("glow").color(P.GLOW_CYAN)


# --------------------------------------------------------------------------------------------
# Swarm pieces: light stand-ins for models that fill an orbit by the dozen or the hundred.
# --------------------------------------------------------------------------------------------
@asset("sat-mini", tint="#9aa0a6", grounded=False, budget=110, note="A satellite for dense belts; same frame and span as sat-a.")
def sat_mini(a):
    a.box(0.8, 0.8, 1.0, bevel=0).part("tint").color(P.SHADE_2, P.WHITE)
    a.box(0.82, 0.82, 0.2, bevel=0).move(0, 0, 0.2).color(P.GOLD)
    for side in (-1, 1):
        a.box(1.0, 0.05, 0.62, bevel=0).move(side * 1.08, 0, 0.3).part("glass").color("#1f3f86", "#2f5fb0")
        a.box(0.2, 0.06, 0.06, bevel=0).move(side * 0.48, 0, 0.58).part("metal").color(P.STEEL)
    a.cyl(0.26, 0.14, sides=6, r2=0.34, bevel=0).move(0, 0, 1.0).part("metal").color(P.STEEL, P.CHROME)
    a.box(0.12, 0.12, 0.1, bevel=0).move(0.26, 0.26, 1.0).part("glow").color(P.GLOW_ORANGE)


@asset("machine-node-mini", grounded=False, budget=130, note="A node of the machines' halo seen from afar; frame of lm-machine-node.")
def machine_node_mini(a):
    # Two dark plates either side of a seam of light, a ring, and one trailing shard.
    for side in (-1, 1):
        a.cyl(1.5, 5.4, sides=3, r2=0.02, bevel=0).rot(z=30 + side * 4).scale(1, 0.4, 1).move(0, side * 0.28, -0.6).part(
            "metal"
        ).color("#151a26", "#2a3146").scale(1.85, 1.85, 1.85)
    a.box(0.16, 0.1, 4.2, bevel=0).move(0, 0, -0.2).part("glow").color("#a78bff").scale(1.85, 1.85, 1.85)
    a.torus(2.5, 0.07, 14, 3).rot(x=90).move(0, 0, 1.9).part("glow").color(P.GLOW_CYAN).scale(1.85, 1.85, 1.85)
    a.cyl(0.5, 2.0, sides=3, r2=0.02, bevel=0).rot(x=180).move(0, 0, -0.9).part("metal").color("#151a26", "#2a3146").scale(1.85, 1.85, 1.85)


@asset("habitat-far", grounded=False, budget=440, note="lm-habitat for a ring of twelve; same frame, axis along x.")
def habitat_far(a):
    # The drum, its three window bands showing the lit land inside, hoops, end caps and wings.
    a.cyl(1.62, 8.4, sides=12, bevel=0).rot(y=90).move(-4.2, 0, 0).color("#c9ced4", "#eef1f4")
    for turn in (0, 120, 240):
        a.box(7.0, 0.9, 0.06, bevel=0).move(0, 0, 1.62).rot(x=turn + 60).part("lit").color("#bfe6a8")
    for x in (-3.6, -1.2, 1.2, 3.6):
        a.cyl(1.72, 0.22, sides=12, bevel=0).rot(y=90).move(x - 0.11, 0, 0).part("metal").color(P.STEEL, P.CHROME)
    for side in (-1, 1):
        a.cyl(1.62, 0.8, sides=12, r2=0.8, bevel=0).rot(y=90 * side).move(side * 4.2, 0, 0).color("#aeb6bf", "#dfe5ea")
        a.cyl(0.8, 0.3, sides=8, bevel=0).rot(y=90 * side).move(side * 5.0, 0, 0).part("metal").color(P.GOLD)
        a.box(6.4, 2.6, 0.05, bevel=0).move(0, side * 3.3, -1.1).rot(x=-side * 14, pivot=(0, side * 2.0, -1.1)).part(
            "metal"
        ).color(P.GOLD, "#f2d27a")


@asset("sat-speck", tint="#9aa0a6", grounded=False, budget=36, note="A satellite at the light quality tiers; frame and span of sat-a.")
def sat_speck(a):
    a.box(0.8, 0.8, 1.0, bevel=0).part("tint").color(P.SHADE_2, P.WHITE)
    for side in (-1, 1):
        a.box(1.0, 0.05, 0.62, bevel=0, grounded=True).move(side * 1.08, 0, 0.3).part("glass").color("#1f3f86", "#2f5fb0")
