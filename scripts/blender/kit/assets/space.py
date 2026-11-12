"""Off-world settlements, biosynthetic architecture, the high-technology city set and the
scenario pieces that go with them (S9's crystal gift, the old robot wreck, S10's cloud city).

Everything here is original interpretive artwork: invented miniatures that illustrate the Project
Janus narratives. No dimension, count or layout encodes a measured quantity.

Shells and hulls are the tint part (painted near white); structure is base or metal; glazing is
glass; lamps, ports, engines and the crystal are glow.
"""

from __future__ import annotations

import math
import random

import bmesh
from mathutils import Matrix, Vector

from kit import jk, parts
from kit import palette as P
from kit.jk import asset

TAU = math.tau

# Tones shared across the module so the three families read as one hand.
HULL_LOW, HULL_HIGH = P.SHADE_1, P.WHITE
STRUCT = P.STEEL_DARK
DARK = P.GUNMETAL
BONE = jk.mix(P.OFF_WHITE, P.VIOLET, 0.1)  # pale grown tissue under the tinted membranes
BONE_DEEP = jk.mix(P.STONE, P.VIOLET, 0.22)
MINT = jk.mix(P.GLOW_GREEN, P.GLOW_CYAN, 0.45)
MINT_HOT = jk.mix(MINT, "#ffffff", 0.55)
MINT_DEEP = jk.mix(MINT, P.TEAL, 0.5)


# --------------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------------
def polar(r: float, deg: float, z: float = 0.0):
    """A point at radius r and azimuth deg (0 = +x, -90 = front)."""
    t = math.radians(deg)
    return (math.cos(t) * r, math.sin(t) * r, z)


def face_to(thing, direction, origin=(0, 0, 0)):
    """Place a piece or group built along +z (x across, y up) so that +z points along
    `direction`, keeping its x axis horizontal, then move it to `origin`."""
    n = Vector(direction).normalized()
    h = Vector((0, 0, 1)).cross(n)
    h = h.normalized() if h.length > 1e-6 else Vector((1, 0, 0))
    v = n.cross(h)
    return thing.apply(Matrix.Translation(origin) @ Matrix((h, v, n)).transposed().to_4x4())


def chamfered(w: float, c: float, d: float | None = None):
    """A w by d rectangle footprint with its corners cut by c, counter-clockwise from above."""
    x, y = w / 2, (w if d is None else d) / 2
    return [(-x + c, -y), (x - c, -y), (x, -y + c), (x, y - c), (x - c, y), (-x + c, y), (-x, y - c), (-x, -y + c)]


def profile_at(profile, z: float):
    """Radius and slope (dr/dz) of a (radius, z) profile at height z."""
    for (r0, z0), (r1, z1) in zip(profile, profile[1:]):
        if z0 <= z <= z1:
            span = (z1 - z0) or 1.0
            return r0 + (r1 - r0) * (z - z0) / span, (r1 - r0) / span
    return profile[-1][0], 0.0


def paint_verts(piece, fn):
    """Per-corner paint: `fn(co, face)` returns a colour or None. Gives gradients inside a face."""
    layer = piece.layer
    for f in piece.bm.faces:
        for loop in f.loops:
            c = fn(loop.vert.co, f)
            if c is None:
                continue
            c = jk.col(c)
            loop[layer] = (c[0], c[1], c[2], 1.0)
    return piece


def smoothstep(lo: float, hi: float, x: float) -> float:
    t = min(1.0, max(0.0, (x - lo) / ((hi - lo) or 1.0)))
    return t * t * (3 - 2 * t)


def bezel(a, r=0.15, depth=0.06, sides=10, rim=P.STEEL, rim_part="metal", pane="glow", pane_color=P.WINDOW):
    """A round port built along +z on the wall plane z = 0: a chamfered bezel around a sunk pane."""
    with a.group() as g:
        a.lathe(
            [(r, 0), (r, depth * 0.7), (r * 0.9, depth), (r * 0.7, depth * 0.5)], sides, cap_bottom=False, cap_top=False
        ).part(rim_part).color(rim)
        # A faintly domed lens, so the pane is a real surface with an unambiguous outside.
        a.lathe([(r * 0.72, depth * 0.5), (0, depth * 0.5 + r * 0.12)], sides, cap_bottom=False).part(pane).color(pane_color).no_ao()
    return g


def bell(a, r, h, sides=10, color=P.GUNMETAL, part="base", glow=None):
    """An engine bell: exit plane on z = 0 opening downward, throat at z = h."""
    with a.group() as g:
        shell = a.lathe(
            [(0, h * 0.4), (r * 0.84, 0.0), (r, 0.0), (r * 0.9, h * 0.22), (r * 0.62, h * 0.62), (r * 0.42, h), (0, h)],
            sides,
        )
        shell.part(part).color(jk.shade(color, -0.2), jk.shade(color, 0.12))
        shell.paint(lambda f: jk.shade(color, -0.6) if f.normal.z < -0.25 else None)
        if glow is not None:
            a.cyl(r * 0.56, 0.02, sides, bevel=0).move(0, 0, h * 0.13).part("glow").color(glow)
    return g


def collar(a, r, z0, z1, sides, proud=0.02, chamfer=0.02):
    """A raised band around a round body of radius r: stage joints, stripes, belts."""
    return a.lathe(
        [(r, z0), (r + proud, z0 + chamfer), (r + proud, z1 - chamfer), (r, z1)], sides, cap_bottom=False, cap_top=False
    )


def link_outline(p0, p1, r0, r1, steps=5):
    """A stadium outline in the (y, z) plane around two joint centres: a robot link's side view."""
    (y0, z0), (y1, z1) = p0, p1
    base = math.atan2(z1 - z0, y1 - y0)
    out = []
    for i in range(steps + 1):  # cap around p1
        t = base - math.pi / 2 + math.pi * i / steps
        out.append((y1 + math.cos(t) * r1, z1 + math.sin(t) * r1))
    for i in range(steps + 1):  # cap around p0
        t = base + math.pi / 2 + math.pi * i / steps
        out.append((y0 + math.cos(t) * r0, z0 + math.sin(t) * r0))
    return out


def geodesic(a, r, z, strut=0.034, frame=P.WHITE, frame_part="tint", glass=None):
    """A two-frequency geodesic dome: flat glass panels inside a frame of struts.

    `glass(co)` paints the panes from a dome-local position. Returns the panel-corner positions.
    """
    shell = jk.ico(r, 2)
    bm = shell.bm
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().z < -1e-3], context="FACES")
    bm.normal_update()
    edges = [(e.verts[0].co.copy(), e.verts[1].co.copy()) for e in bm.edges]
    nodes = [v.co.copy() for v in bm.verts]
    # Split each pane into four coplanar triangles so paint can vary inside a pane.
    shell.subdivide(1)
    if glass is not None:
        paint_verts(shell, lambda co, f: glass(co))
    a.add(shell).scale(0.988).move(0, 0, z).part("glass").flat()
    for p, q in edges:
        if p.z < 1e-3 and q.z < 1e-3:
            continue  # the equator ring is buried in the base collar
        a.tube([p, q], strut, 4, caps="none").move(0, 0, z).part(frame_part).color(frame)
    for p in nodes:
        if p.z < 1e-3:
            continue
        a.ico(strut * 1.9, 1).move(p.x, p.y, p.z + z).part(frame_part).color(frame)
    return nodes


# --------------------------------------------------------------------------------------------
# Off-world settlement: Moon, Mars and Venus stations
# --------------------------------------------------------------------------------------------
@asset("hab-dome", tint="#eef0f2", budget=2400)
def hab_dome(a):
    ring_r, ring_h, dome_r = 2.25, 0.5, 1.9
    n = 20
    # Ring base: a plinth, a recessed band of light, then the collar the dome sits in.
    a.lathe([(ring_r, 0), (ring_r, 0.1), (ring_r - 0.05, 0.13), (ring_r - 0.08, 0.13)], n, cap_bottom=False, cap_top=False).part(
        "tint"
    ).color(P.SHADE_2)
    a.lathe([(ring_r - 0.065, 0.13), (ring_r - 0.065, 0.22)], n, cap_bottom=False, cap_top=False).part("glow").color(P.LAMP)
    a.lathe(
        [(ring_r - 0.08, 0.22), (ring_r - 0.05, 0.22), (ring_r, 0.26), (ring_r, 0.41), (ring_r - 0.09, ring_h), (dome_r - 0.22, ring_h)],
        n,
        cap_bottom=False,
        cap_top=False,
    ).part("tint").color(P.SHADE_1, P.WHITE)

    # Glazing: sky above, the green of a garden showing through the lower panes.
    def glass(co):
        ang = math.atan2(co.y, co.x)
        treeline = dome_r * (0.3 + 0.16 * math.sin(ang * 3 + 0.8) + 0.1 * math.sin(ang * 7 + 2.0))
        if co.z < treeline:
            return jk.mix(P.LEAF_DEEP, P.LEAF, smoothstep(0, treeline, co.z) * 0.9)
        t = smoothstep(treeline, dome_r, co.z)
        return jk.mix(jk.mix(P.GLASS_TINTED, P.LEAF, 0.18), P.GLASS, min(1.0, t * 1.5)) if t < 0.66 else jk.mix(P.GLASS, P.ICE, (t - 0.66) * 2.2)

    geodesic(a, dome_r, ring_h - 0.02, glass=glass)
    # Apex vent cap and a marker light.
    a.cyl(0.21, 0.07, 10, bevel=0.02).move(0, 0, ring_h + dome_r - 0.04).part("tint").color(P.SHADE_2)
    a.sphere(0.045, 6, 4).move(0, 0, ring_h + dome_r + 0.06).part("glow").color(P.GLOW_RED)

    # Airlock: a barrel-roofed vestibule driven through the ring, with a hatch and a step.
    arch = [(-0.46, 0), (0.46, 0), (0.46, 0.62), (0.34, 0.88), (0.12, 1.0), (-0.12, 1.0), (-0.34, 0.88), (-0.46, 0.62)]
    front = -2.3
    a.profile_y(arch, 0.9, bevel=0.03).move(0, front + 0.45, 0).part("tint").color(P.SHADE_1, P.WHITE)
    a.profile_y([(x * 0.84, z * 0.86) for x, z in arch], 0.04, bevel=0.01).move(0, front - 0.012, 0.0).color(P.ORANGE)
    a.profile_y([(x * 0.68, z * 0.74) for x, z in arch], 0.05, bevel=0.012).move(0, front - 0.035, 0.0).color(P.SLATE, jk.shade(P.SLATE, 0.14))
    a.box(0.2, 0.02, 0.17, bevel=0.03).move(0, front - 0.062, 0.42).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    a.box(0.06, 0.03, 0.2, bevel=0.012).move(0.2, front - 0.06, 0.26).part("metal").color(P.STEEL)
    a.box(0.16, 0.05, 0.06, bevel=0.015).move(0, front - 0.02, 0.86).part("glow").color(P.GLOW_CYAN)
    a.box(0.98, 0.2, 0.07, bevel=0.02, grounded=True).move(0, front - 0.05, 0).color(P.STEEL_DARK, P.STEEL)

    # Life support on the ring ledge: an air handler with a duct into the dome, and two tanks.
    with a.group() as unit:
        a.box(0.72, 0.4, 0.5, bevel=0.04).move(0, 0, 0).part("tint").color(P.SHADE_2, P.SHADE_1)
        for k in range(4):
            a.box(0.5, 0.02, 0.035, bevel=0).move(0, -0.205, 0.12 + k * 0.085).color(P.GUNMETAL)
        a.cyl(0.13, 0.06, 8, bevel=0.012).move(-0.14, 0, 0.5).color(P.STEEL_DARK)
        a.tube([(0.16, 0.02, 0.5), (0.16, 0.02, 0.8), (0.16, 0.14, 0.94), (0.16, 0.52, 1.0)], 0.075, 7).color(P.ORANGE)
    unit.rot(z=180).move(0, 2.08, ring_h - 0.02).rot(z=-52)
    for k, deg in enumerate((148, 162)):
        x, y, _ = polar(2.07, deg)
        a.capsule(0.15, 0.78, 10, 3).move(x, y, ring_h - 0.02).part("tint").color(P.SHADE_1, P.WHITE)
        a.torus(0.152, 0.018, 10, 4).move(x, y, ring_h + 0.36).color(P.ORANGE if k == 0 else P.STEEL_DARK)
    a.tube([polar(2.07, 148, ring_h + 0.7), polar(2.07, 155, ring_h + 0.84), polar(2.07, 162, ring_h + 0.7)], 0.03, 5).color(P.STEEL_DARK)
    a.tube([polar(2.07, 155, ring_h + 0.84), polar(1.76, 155, ring_h + 0.72)], 0.03, 5).color(P.STEEL_DARK)


@asset("hab-module", tint="#e6e8ea", budget=1500)
def hab_module(a):
    R, cz, L, off = 0.62, 0.8, 1.28, 0.15  # shell radius, axis height, half length, y shift
    n = 14
    with a.group() as g:
        a.loft(
            [
                (-L, R * 0.56, R * 0.56, cz),
                (-L + 0.06, R * 0.8, R * 0.8, cz),
                (-L + 0.18, R * 0.95, R * 0.95, cz),
                (-L + 0.34, R, R, cz),
                (L - 0.34, R, R, cz),
                (L - 0.18, R * 0.95, R * 0.95, cz),
                (L - 0.06, R * 0.8, R * 0.8, cz),
                (L, R * 0.56, R * 0.56, cz),
            ],
            n,
            2.0,
        ).part("tint").color(P.SHADE_1, P.WHITE)
        # Belts where the shell segments join, and one painted stripe.
        for y in (-0.5, 0.56):
            a.loft([(y - 0.07, R, R, cz), (y - 0.05, R + 0.028, R + 0.028, cz), (y + 0.05, R + 0.028, R + 0.028, cz), (y + 0.07, R, R, cz)], n, 2.0, caps="none").part(
                "tint"
            ).color(P.SHADE_2)
        a.loft([(-0.86, R + 0.012, R + 0.012, cz), (-0.69, R + 0.012, R + 0.012, cz)], n, 2.0, caps="none").color(P.ORANGE)

        # Airlock on the front end: collar, hatch with a window and handle, lamp, and steps.
        a.cyl(0.43, 0.2, 12, bevel=0.03).rot(x=90).move(0, -L + 0.06, cz).color(P.STEEL_DARK, P.STEEL)
        a.cyl(0.33, 0.05, 10, bevel=0.015).rot(x=90).move(0, -L - 0.13, cz).part("tint").color(P.SHADE_2, P.SHADE_1)
        bezel(a, 0.12, 0.04, 8, pane="glass", pane_color=P.GLASS_TINTED).rot(x=90).move(0, -L - 0.175, cz + 0.1)
        a.box(0.2, 0.035, 0.04, bevel=0).move(0, -L - 0.19, cz - 0.14).part("metal").color(P.STEEL)
        a.box(0.16, 0.06, 0.06, bevel=0.015).move(0, -L - 0.12, cz + 0.47).part("glow").color(P.GLOW_CYAN)
        a.profile_x([(-L - 0.14, 0), (-L - 0.14, 0.44), (-L - 0.3, 0.44), (-L - 0.3, 0.22), (-L - 0.46, 0.22), (-L - 0.46, 0)], 0.5, bevel=0.015).color(
            P.STEEL_DARK, P.STEEL
        )
        # Docking port on the back end, its mating face left dark.
        port = a.cyl(0.36, 0.16, 12, bevel=0.03).rot(x=-90).move(0, L - 0.04, cz).color(P.STEEL_DARK, P.STEEL)
        port.paint(lambda f: P.GUNMETAL if f.normal.y > 0.9 else None)

        # Lit ports along both sides.
        for side in (-1, 1):
            for y in (-0.08, 0.9):
                bezel(a, 0.15, 0.06, 8).rot(y=90 * side).move(side * (R - 0.012), y, cz + 0.06)

        # Cradle legs and pads.
        for side in (-1, 1):
            for y in (-0.78, 0.82):
                a.tube([(side * 0.42, y, 0.36), (side * 0.66, y, 0.06)], 0.05, 5).part("metal").color(P.STEEL_DARK)
                a.cyl(0.13, 0.055, 6, bevel=0.015, grounded=True).move(side * 0.67, y, 0).color(P.STEEL_DARK, P.STEEL)
        # Dorsal radiator: a finned panel on two stanchions.
        top = cz + R
        for y in (-0.28, 0.72):
            a.box(0.07, 0.07, 0.1, bevel=0).move(0, y, top - 0.02).color(P.STEEL_DARK)
        a.box(0.06, 1.5, 0.27, bevel=0.02).move(0, 0.22, top + 0.06).part("metal").color(P.STEEL, P.CHROME)
        for k in range(6):
            a.box(0.09, 0.035, 0.2, bevel=0).move(0, -0.4 + k * 0.248, top + 0.095).color(P.STEEL_DARK)
    g.move(0, off, 0)


@asset("landing-pad", tint="#ffffff", budget=2400)
def landing_pad(a):
    n = 40
    step = TAU / n
    deck_z = 0.15
    deck = a.lathe(
        [(3.0, 0.0), (2.97, 0.05), (2.86, deck_z), (2.62, deck_z), (2.44, deck_z), (1.78, deck_z), (1.62, deck_z), (1.16, deck_z), (1.0, deck_z), (0.97, 0.09), (0, 0.09)],
        n,
        cap_bottom=False,
        turn=-step / 2,
    )
    deck_colour = jk.shade(P.ASPHALT, 0.05)

    def marking(f):
        c = f.calc_center_median()
        r = math.hypot(c.x, c.y)
        seg = int(((math.atan2(c.y, c.x) + step / 2) % TAU) / step)
        if c.z < deck_z - 0.01 and r > 2.8:
            return P.CONCRETE if r > 2.95 else P.CONCRETE_DARK
        if r > 2.62:
            return P.ASPHALT
        if r > 2.44:
            return P.AMBER if seg % 2 == 0 else P.INK
        if r > 1.78:
            if seg % (n // 4) == 0:
                return P.AMBER if seg == 3 * n // 4 else P.OFF_WHITE
            return deck_colour
        if r > 1.62:
            return P.OFF_WHITE
        if r > 1.1:
            return jk.shade(P.ASPHALT, -0.12)
        return jk.shade(P.INK, -0.2)

    deck.paint(marking)
    # Blast ring around the flame pit, and a grate across it.
    a.lathe([(1.17, deck_z), (1.15, 0.2), (1.11, 0.225), (1.03, 0.225), (1.0, 0.2), (1.0, 0.09)], 20, cap_bottom=False, cap_top=False).part("metal").color(
        P.STEEL_DARK, P.STEEL
    )
    for k in (-1, 0, 1):
        w = 1.92 if k == 0 else 1.62
        a.box(w, 0.07, 0.04, bevel=0).move(0, k * 0.5, 0.1).color(P.GUNMETAL)
        a.box(0.07, w, 0.04, bevel=0).move(k * 0.5, 0, 0.097).color(P.GUNMETAL)
    a.cyl(0.24, 0.07, 10, r2=0.1, bevel=0.01).move(0, 0, 0.1).color(P.GUNMETAL)

    # Edge lights; the pair by the ramp is amber.
    for i in range(12):
        deg = -90 + 15 + i * 30
        x, y, _ = polar(2.74, deg)
        amber = i in (0, 11)
        a.cyl(0.1, 0.035, 6, bevel=0, grounded=True).move(x, y, deck_z).color(P.STEEL_DARK)
        a.dome(0.068, 0.05, 6, 2).move(x, y, deck_z + 0.035).part("glow").color(P.GLOW_ORANGE if amber else P.GLOW_CYAN)
    # Access ramp at the front and a service hydrant with its hose.
    a.profile_x([(-3.2, 0.0), (-2.88, 0.0), (-2.88, deck_z), (-2.95, deck_z)], 1.0, bevel=0.012).color(P.CONCRETE_DARK, P.CONCRETE)
    hx, hy, _ = polar(2.55, 40)
    a.box(0.36, 0.26, 0.09, bevel=0.025).rot(z=40).move(hx, hy, deck_z).color(P.ORANGE)
    a.tube([(hx - 0.1, hy - 0.1, deck_z + 0.03), (1.75, 1.2, deck_z + 0.03), (1.45, 0.72, deck_z + 0.03), (1.62, 0.3, deck_z + 0.03)], 0.03, 5, caps="round").color(P.INK)


@asset("rocket", tint="#eef0f2", budget=1400)
def rocket(a):
    R, n = 0.4, 12
    nose0, tip = 4.5, 6.02
    # Engine cluster and thrust skirt.
    for k in range(3):
        x, y, _ = polar(0.175, 90 + k * 120)
        bell(a, 0.155, 0.46, 8, P.STEEL_DARK, part="metal").move(x, y, 0.16)
    a.lathe([(R * 0.72, 0.56), (R * 0.9, 0.62), (R + 0.02, 0.74), (R + 0.02, 0.9), (R, 0.93)], n, cap_top=False).color(P.GUNMETAL, P.STEEL_DARK)
    # Hull: one tinted skin from the skirt to the shoulder of the nose cap.
    hull = [(R, 0.9), (R, nose0)]
    cap = []
    for t in (0.22, 0.42, 0.6, 0.76, 0.88, 0.96):
        z = nose0 + (tip - nose0) * t
        r = R * (1 - t**1.9) ** 0.92
        (hull if t <= 0.6 else cap).append((r, z))
    cap.insert(0, hull[-1])
    cap += [(0.035, tip), (0, tip + 0.02)]
    a.lathe(hull, n, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_1, P.WHITE)
    a.lathe(cap, n, cap_bottom=False).color(jk.shade(P.RED, -0.08), P.RED)
    a.tube([(0, 0, tip), (0, 0, tip + 0.18)], 0.014, 4).part("metal").color(P.STEEL)
    # Stripes and a stage joint.
    collar(a, R, 1.95, 2.32, n, proud=0.014, chamfer=0.012).color(P.RED)
    collar(a, R, 3.5, 3.64, n, proud=0.024).part("metal").color(P.STEEL)
    collar(a, R, 4.36, 4.47, n, proud=0.014, chamfer=0.012).color(P.RED)
    # Crew porthole and hatch on the front; a cable raceway down the back.
    bezel(a, 0.2, 0.08, 10, rim=P.BRASS, pane="glass", pane_color=P.GLASS).rot(x=90).move(0, -R + 0.035, 4.02)
    a.box(0.24, 0.04, 0.38, bevel=0.03).move(0, -R + 0.006, 2.76).part("tint").color(P.SHADE_2)
    a.box(0.05, 0.03, 0.1, bevel=0).move(0.07, -R - 0.012, 2.9).part("metal").color(P.STEEL)
    a.box(0.09, 0.05, 2.5, bevel=0.018).move(0, R - 0.008, 0.98).part("tint").color(P.SHADE_2)
    # Four swept fins the rocket stands on.
    fin = [(0.33, 2.02), (0.5, 1.5), (0.73, 0.52), (0.78, 0.0), (0.62, 0.0), (0.54, 0.4), (0.33, 0.7)]
    for k in range(4):
        deg = 45 + k * 90
        a.profile_y(fin, 0.1, bevel=0.024).rot(z=deg).color(jk.shade(P.RED, -0.12), P.RED)
        x, y, _ = polar(0.7, deg)
        a.cyl(0.09, 0.045, 6, bevel=0.012, grounded=True).move(x, y, 0).color(P.GUNMETAL)


@asset("dish", tint="#e6e8ea", budget=1500)
def dish(a):
    py = 0.14  # pedestal axis
    a.cyl(0.52, 0.1, 12, bevel=0.025, grounded=True).move(0, py, 0).color(P.CONCRETE_DARK, P.CONCRETE)
    a.lathe([(0.3, 0.1), (0.3, 0.2), (0.24, 0.3), (0.19, 1.0), (0.26, 1.06)], 10, cap_bottom=False, cap_top=False).move(0, py, 0).part("tint").color(
        P.SHADE_2, P.SHADE_1
    )
    a.box(0.16, 0.03, 0.3, bevel=0.02).move(0, py - 0.25, 0.34).color(P.SLATE)
    # Azimuth bearing and the yoke that carries the elevation axle.
    a.cyl(0.31, 0.13, 12, bevel=0.025).move(0, py, 1.05).color(P.GUNMETAL, P.STEEL_DARK)
    axle_z = 1.56
    for side in (-1, 1):
        a.profile_x([(py - 0.16, 1.16), (py + 0.16, 1.16), (py + 0.11, axle_z + 0.1), (py - 0.11, axle_z + 0.1)], 0.1, bevel=0.025).move(side * 0.3, 0, 0).part(
            "tint"
        ).color(P.SHADE_2, P.SHADE_1)
        a.cyl(0.085, 0.05, 8, bevel=0.012).rot(y=90 * side).move(side * 0.35, py, axle_z).part("metal").color(P.STEEL)
    a.cyl(0.08, 0.6, 8, bevel=0.012).rot(y=90).move(-0.3, py, axle_z).color(P.STEEL_DARK, P.STEEL)

    # Reflector, feed and counterweights are built along +z, then tilted to look up and forward.
    k = 0.25
    with a.group() as g:
        bowl = a.lathe(
            [(0, 0.03), (0.42, 0.03 + k * 0.42**2), (0.82, 0.03 + k * 0.82**2), (1.16, 0.03 + k * 1.16**2), (1.2, 0.41), (1.2, 0.35), (0.82, 0.13), (0.42, 0.0), (0.2, -0.05), (0, -0.05)],
            18,
        )
        bowl.part("tint")

        def panels(f):
            if f.normal.z < -0.1:
                return P.SHADE_2
            c = f.calc_center_median()
            r = math.hypot(c.x, c.y)
            if r > 1.17:
                return P.SHADE_2
            return P.WHITE if 0.42 < r < 0.82 else P.SHADE_1

        bowl.paint(panels)
        a.cyl(0.23, 0.18, 10, bevel=0.03).move(0, 0, -0.2).color(P.STEEL_DARK, P.STEEL)
        for i in range(3):
            x, y, _ = polar(1.0, 90 + i * 120)
            a.tube([(x, y, 0.03 + k), (x * 0.07, y * 0.07, 0.94)], 0.02, 4).part("metal").color(P.STEEL)
        a.cyl(0.085, 0.16, 8, bevel=0.015).move(0, 0, 0.86).color(P.GUNMETAL)
        a.cyl(0.14, 0.03, 8, bevel=0.01).move(0, 0, 0.84).part("metal").color(P.STEEL)
        a.sphere(0.04, 6, 4).move(0, 0, 1.05).part("glow").color(P.GLOW_RED)
        for side in (-1, 1):
            a.box(0.09, 0.12, 0.42, bevel=0.02).move(side * 0.17, 0, -0.56).color(P.STEEL_DARK)
        a.box(0.5, 0.2, 0.17, bevel=0.03).move(0, 0, -0.66).color(P.GUNMETAL)
    # The elevation axle passes through the hub behind the bowl, never through the bowl itself.
    g.rot(x=45).move(0, py - 0.036, axle_z + 0.136)


@asset("shuttle", tint="#f2f2f2", budget=2400)
def shuttle(a):
    body = [
        (-2.58, 0.0, 0.0, 0.9),
        (-2.47, 0.15, 0.13, 0.91),
        (-2.2, 0.3, 0.27, 0.94),
        (-1.75, 0.43, 0.39, 0.99),
        (-1.1, 0.5, 0.46, 1.02),
        (1.5, 0.5, 0.46, 1.02),
        (2.0, 0.45, 0.42, 1.04),
        (2.1, 0.39, 0.36, 1.04),
    ]
    a.loft(body, 12, 3.2).part("tint").color(P.SHADE_1, P.WHITE)
    # Heat shield: a dark belly pan wrapped under the nose and hull.
    a.loft([(y, rx + 0.012 if rx else 0, rz * 0.55, cz - rz * 0.47) for y, rx, rz, cz in body], 12, 3.2).color(P.INK, P.CHARCOAL)
    # Flight deck glazing.
    a.loft([(-2.1, 0.15, 0.04, 1.17), (-1.97, 0.29, 0.12, 1.21), (-1.62, 0.37, 0.16, 1.3), (-1.42, 0.31, 0.1, 1.37), (-1.36, 0.2, 0.03, 1.41)], 10, 3.0).part(
        "glass"
    ).color(P.GLASS_DARK, P.GLASS_TINTED)
    a.box(0.035, 0.5, 0.04, bevel=0.01).rot(x=-14).move(0, -1.98, 1.32).part("tint").color(P.SHADE_1)

    # Double-delta wing: a white upper skin over a dark, slightly larger lower skin.
    wing = [(0.3, -1.3), (0.62, -0.72), (0.95, 0.45), (2.0, 1.58), (2.0, 2.0), (0.3, 2.12)]
    under = [(0.3, -1.38), (0.66, -0.76), (1.0, 0.42), (2.04, 1.54), (2.04, 2.0), (0.3, 2.12)]
    with a.group() as g:
        a.plate(under, 0.07, bevel=0.022).move(0, 0, 0.62).color(P.INK, P.CHARCOAL)
        a.plate(wing, 0.07, bevel=0.022).move(0, 0, 0.68).part("tint").color(P.SHADE_1, P.WHITE)
        a.plate([(0.62, 1.74), (1.9, 1.74), (1.9, 1.96), (0.62, 2.04)], 0.02, bevel=0).move(0, 0, 0.742).part("tint").color(P.SHADE_2)
        # Main skid under the wing root.
        a.tube([(0.72, 0.5, 0.14), (0.72, 0.62, 0.036), (0.72, 1.42, 0.036)], 0.05, 6, caps="round", squash=0.7).part("metal").color(P.STEEL)
        a.tube([(0.72, 0.84, 0.06), (0.7, 0.76, 0.64)], 0.04, 6).part("metal").color(P.STEEL_DARK)
        a.tube([(0.72, 1.3, 0.06), (0.7, 1.22, 0.64)], 0.04, 6).part("metal").color(P.STEEL_DARK)
        # Orbital manoeuvring pod beside the tail.
        a.loft([(1.18, 0, 0, 1.36), (1.3, 0.12, 0.11, 1.4), (1.7, 0.17, 0.16, 1.42), (2.12, 0.15, 0.14, 1.42), (2.18, 0.1, 0.09, 1.42)], 8, 2.4).move(0.33, 0, 0).part(
            "tint"
        ).color(P.SHADE_1, P.WHITE)
        a.cyl(0.075, 0.07, 7, r2=0.1, bevel=0).rot(x=-90).move(0.33, 2.16, 1.42).color(P.GUNMETAL)
    g.mirror("x")
    a.sphere(0.035, 6, 4).move(2.0, 1.78, 0.75).part("glow").color(P.GLOW_GREEN)
    a.sphere(0.035, 6, 4).move(-2.0, 1.78, 0.75).part("glow").color(P.GLOW_RED)

    # Tail fin with a painted tip, and payload bay door lines along the spine.
    a.profile_x([(0.95, 1.4), (1.86, 2.36), (2.3, 2.36), (2.2, 1.4)], 0.11, bevel=0.03).part("tint").color(P.SHADE_1, P.WHITE)
    a.profile_x([(1.7, 2.2), (1.86, 2.37), (2.3, 2.37), (2.285, 2.2)], 0.125, bevel=0.02).color(P.ORANGE)
    for side in (-1, 1):
        a.box(0.025, 2.1, 0.03, bevel=0).move(side * 0.2, 0.05, 1.462).part("tint").color(P.SHADE_3)
    a.box(0.43, 0.025, 0.03, bevel=0).move(0, -1.0, 1.462).part("tint").color(P.SHADE_3)
    a.loft([(-0.92, 0.5, 0.1, 1.02), (-0.9, 0.512, 0.11, 1.02), (-0.72, 0.512, 0.11, 1.02), (-0.7, 0.5, 0.1, 1.02)], 12, 3.2, caps="none").color(P.ORANGE)

    # Three engines on the aft bulkhead.
    a.loft([(2.08, 0.36, 0.33, 1.04), (2.16, 0.3, 0.27, 1.04)], 12, 3.2).color(P.GUNMETAL)
    for x, z in ((0, 1.2), (-0.19, 0.9), (0.19, 0.9)):
        bell(a, 0.17, 0.3, 9, P.STEEL_DARK, glow=P.GLOW_ORANGE).rot(x=90).move(x, 2.36, z)
    # Nose skid.
    a.tube([(0, -2.16, 0.14), (0, -2.04, 0.033), (0, -1.46, 0.033)], 0.045, 6, caps="round", squash=0.7).part("metal").color(P.STEEL)
    a.tube([(0, -1.9, 0.06), (0, -1.84, 0.62)], 0.036, 6).part("metal").color(P.STEEL_DARK)
    a.tube([(0, -1.56, 0.06), (0, -1.62, 0.6)], 0.036, 6).part("metal").color(P.STEEL_DARK)


@asset("lander", tint="#d9b44a", budget=2400)
def lander(a):
    z0, z1 = 0.78, 1.34
    # Descent stage: an octagonal drum wrapped in foil, each facet a slightly different crinkle.
    stage = a.prism([polar(0.74, 22.5 + i * 45)[:2] for i in range(8)], z1 - z0, bevel=0.04).move(0, 0, z0).part("tint").color(P.SHADE_1, P.WHITE)
    tones = (P.WHITE, P.SHADE_1, "#f6f6f6", P.SHADE_2)

    def foil(f):
        if abs(f.normal.z) > 0.5:
            return P.SHADE_1 if f.normal.z > 0 else P.SHADE_3
        if f.calc_area() < 0.05:
            return None
        k = int(((math.atan2(f.normal.y, f.normal.x) + TAU / 16) % TAU) / (TAU / 8))
        return tones[k % 4]

    stage.paint(foil)
    bell(a, 0.3, 0.44, 12, P.GUNMETAL, glow=P.GLOW_ORANGE).move(0, 0, z0 - 0.42)
    # Four legs: a foil-sleeved main strut, two braces and a dished foot pad.
    for i in range(4):
        deg = 45 + i * 90
        top, foot = polar(0.64, deg, z1 - 0.08), polar(1.1, deg, 0.09)
        mid = tuple(top[j] + (foot[j] - top[j]) * 0.46 for j in range(3))
        knee = tuple(top[j] + (foot[j] - top[j]) * 0.66 for j in range(3))
        a.tube([top, foot], 0.036, 6).color(P.STEEL_DARK, P.STEEL)
        a.tube([top, mid], 0.058, 6).part("tint").color(P.SHADE_1, P.WHITE)
        for off in (-24, 24):
            a.tube([polar(0.7, deg + off, z0 + 0.05), knee], 0.022, 4).color(P.STEEL_DARK)
        a.lathe([(0.1, 0), (0.17, 0.03), (0.17, 0.055), (0.06, 0.1), (0, 0.1)], 8, cap_bottom=False).move(foot[0], foot[1], 0).part("metal").color(P.CHROME)

    # Crew cabin: a pale pressure hull with two canted windows and a forward hatch.
    hull = jk.shade(P.STEEL, 0.42)
    a.loft([(-0.44, 0.25, 0.2, 1.7), (-0.37, 0.4, 0.31, 1.7), (0.08, 0.45, 0.35, 1.7), (0.38, 0.37, 0.29, 1.68), (0.45, 0.24, 0.19, 1.68)], 10, 3.2).color(
        jk.shade(hull, -0.14), hull
    )
    for side in (-1, 1):
        a.box(0.19, 0.04, 0.15, bevel=0.03).rot(x=-16, z=-side * 22).move(side * 0.19, -0.405, 1.78).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
        # Thruster quads on the cabin flanks.
        a.box(0.1, 0.12, 0.12, bevel=0.025).move(side * 0.5, 0.1, 1.72).color(P.STEEL_DARK)
        a.cyl(0.03, 0.05, 6, r2=0.045, bevel=0).rot(y=90 * side).move(side * 0.55, 0.1, 1.78).color(P.GUNMETAL)
    a.box(0.27, 0.035, 0.26, bevel=0.035).move(0, -0.452, 1.4).color(P.SLATE, jk.shade(P.SLATE, 0.12))
    a.box(0.4, 0.3, 0.035, bevel=0.012).move(0, -0.6, z1).color(P.STEEL_DARK)
    # Ladder from the porch down the front of the stage.
    for side in (-1, 1):
        a.tube([(side * 0.1, -0.72, z1 + 0.03), (side * 0.1, -0.82, 0.34)], 0.016, 4).color(P.CHROME)
    for k in range(5):
        t = 0.1 + k * 0.2
        a.tube([(-0.1, -0.72 - 0.1 * t, z1 + 0.03 - 1.03 * t), (0.1, -0.72 - 0.1 * t, z1 + 0.03 - 1.03 * t)], 0.014, 4).color(P.CHROME)
    # Roof: docking ring, a steerable antenna, a whip and a beacon.
    a.cyl(0.17, 0.07, 10, bevel=0.02).move(0, 0.02, 2.02).color(P.STEEL_DARK, P.STEEL)
    a.tube([(0.26, 0.22, 1.98), (0.3, 0.26, 2.2)], 0.02, 5).part("metal").color(P.STEEL)
    with a.group() as g:
        a.lathe([(0, 0.01), (0.12, 0.03), (0.2, 0.09), (0.2, 0.065), (0.12, 0.0), (0, -0.025)], 9).color(P.OFF_WHITE)
        a.tube([(0, 0, 0.01), (0, 0, 0.15)], 0.012, 4).part("metal").color(P.STEEL)
    g.rot(x=-32, y=24).move(0.3, 0.26, 2.22)
    a.tube([(-0.3, 0.2, 1.98), (-0.32, 0.22, 2.38)], 0.01, 4).part("metal").color(P.STEEL)
    a.sphere(0.038, 6, 4).move(-0.27, -0.2, 2.03).part("glow").color(P.GLOW_RED)
    # Stage cargo: an equipment bay, a stowed package and a propellant tank.
    a.box(0.03, 0.42, 0.3, bevel=0.012).move(0.69, 0, z0 + 0.13).color(P.GUNMETAL)
    a.box(0.02, 0.1, 0.1, bevel=0.01).move(0.71, -0.1, z0 + 0.25).part("glow").color(P.GLOW_CYAN)
    a.box(0.12, 0.4, 0.3, bevel=0.03).move(-0.72, 0, z0 + 0.13).color(P.OFF_WHITE)
    a.box(0.13, 0.07, 0.31, bevel=0.01).move(-0.72, 0, z0 + 0.125).color(P.ORANGE)
    a.sphere(0.24, 10, 6).move(0, 0.56, z0 + 0.3).part("tint").color(P.SHADE_2, P.WHITE)


# --------------------------------------------------------------------------------------------
# Grown forms: ribbed bulbs with creases, luminous seams and membrane windows
# --------------------------------------------------------------------------------------------
def lobed(profile, lobes=6, seg=3, depth=0.16, twist=0.0, turn=0.0, seam=0.0, low=P.SHADE_2, high=P.WHITE, crease=0.34):
    """Revolve a (radius, z) profile into a ribbed, grown body: `lobes` swellings with creases
    between them, optionally twisting with height (radians per unit).

    Returns (skin, seams). With `seam` > 0 (a fraction of the lobe width) each crease is opened
    into a narrow strip returned as a separate glow piece; otherwise seams is None.
    """
    period = TAU / lobes
    z0 = profile[0][1]
    span = (profile[-1][1] - z0) or 1.0
    bm = bmesh.new()
    glow = bmesh.new() if seam > 0 else None
    sunk: dict = {}

    def ring(r, z):
        if r <= 1e-6:
            return bm.verts.new((0, 0, z))
        rows = []
        for j in range(lobes):
            row = []
            for i in range(seg + 1):
                t = i / seg
                ang = turn + twist * (z - z0) + (j + seam + (1 - 2 * seam) * t) * period
                swell = max(0.0, math.sin(math.pi * t)) ** 0.6
                v = bm.verts.new((math.cos(ang) * r * (1 - depth * (1 - swell)), math.sin(ang) * r * (1 - depth * (1 - swell)), z))
                sunk[v] = 1 - swell
                row.append(v)
            rows.append(row)
        return rows

    rings = [ring(r, z) for r, z in profile]
    for lower, upper in zip(rings, rings[1:]):
        low_point, up_point = not isinstance(lower, list), not isinstance(upper, list)
        if low_point and up_point:
            continue
        for j in range(lobes):
            for i in range(seg):
                if low_point:
                    bm.faces.new((lower, upper[j][i + 1], upper[j][i]))
                elif up_point:
                    bm.faces.new((lower[j][i], lower[j][i + 1], upper))
                else:
                    bm.faces.new((lower[j][i], lower[j][i + 1], upper[j][i + 1], upper[j][i]))
            if glow is not None:
                k = (j + 1) % lobes
                if low_point:
                    pts = (lower.co, upper[k][0].co, upper[j][seg].co)
                elif up_point:
                    pts = (lower[j][seg].co, lower[k][0].co, upper.co)
                else:
                    pts = (lower[j][seg].co, lower[k][0].co, upper[k][0].co, upper[j][seg].co)
                glow.faces.new([glow.verts.new(q) for q in pts])
    bm.normal_update()
    skin = jk.Piece(bm)
    a, b = jk.col(low), jk.col(high)
    for f in bm.faces:
        for loop in f.loops:
            u = (loop.vert.co.z - z0) / span
            c = jk.shade(jk.mix(a, b, u), -crease * sunk.get(loop.vert, 0.0))
            loop[skin.layer] = (c[0], c[1], c[2], 1.0)
    seams = None
    if glow is not None:
        glow.normal_update()
        seams = jk.Piece(glow, "glow").no_ao()
    return skin, seams


def membrane(a, w, h, sides=10):
    """An oval membrane window built along +z (x across, y up): a puckered lip of skin around a
    bulging, softly lit lens. Place it with `face_to`."""
    with a.group() as g:
        a.lathe([(1.0, -0.06), (1.1, 0.03), (0.86, 0.035)], sides, cap_bottom=False, cap_top=False).scale(w / 2, h / 2, 1).part("tint").color(P.SHADE_3, P.SHADE_2)
        lens = a.lathe([(0.9, 0.02), (0.58, 0.075), (0, 0.1)], sides, cap_bottom=False).scale(w / 2, h / 2, 1).part("glow").no_ao()
        paint_verts(lens, lambda co, f: jk.mix(MINT_HOT, MINT_DEEP, smoothstep(0.1, 1.0, math.hypot(co.x / (w / 2), co.y / (h / 2)))))
    return g


def bulb(a, shape, R, z0, z1, lobes, twist, phase, seam=0.0, seg=3):
    """A grown bulb between z0 and z1 from a normalised (radius, height) shape. The lobes follow
    one helix up the whole plant: angle = phase + twist * z."""
    profile = [(r * R, z0 + t * (z1 - z0)) for r, t in shape]
    skin, seams = lobed(profile, lobes, seg, twist=twist, turn=phase + twist * z0, seam=seam)
    a.add(skin).part("tint")
    if seams is not None:
        a.add(seams).color(MINT_DEEP, MINT_HOT)
    return profile


def bulb_window(a, profile, z, lobe, lobes, twist, phase, w, h):
    """Set a membrane window into the crown of one lobe of a bulb at height z."""
    r, slope = profile_at(profile, z)
    ang = phase + twist * z + (lobe + 0.5) * TAU / lobes
    n = Vector((math.cos(ang), math.sin(ang), -slope))
    return face_to(membrane(a, w, h), n, (math.cos(ang) * r * 0.95, math.sin(ang) * r * 0.95, z))


def root(a, x, y, deg, start, reach, z, thick, sway=0.0):
    """One buttress root running from a plant's foot out along the ground, wandering a little."""
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    px, py = -s, c
    pts, radii = [], []
    for t, zz, rr, off in (
        (0.0, z, thick, 0.0),
        (0.3, thick * 1.0, thick * 0.95, sway * 0.7),
        (0.62, thick * 0.66, thick * 0.7, sway * 1.5),
        (0.86, thick * 0.4, thick * 0.42, sway * 0.6),
        (1.0, 0.05, 0.05, -sway * 0.8),
    ):
        d = start + reach * t
        pts.append((x + c * d + px * off, y + s * d + py * off, zz))
        radii.append(rr)
    return a.tube(pts, radii, 5).color(BONE_DEEP, BONE)


POD = [(0.0, 0.0), (0.36, 0.03), (0.74, 0.16), (0.96, 0.34), (1.0, 0.48), (0.9, 0.63), (0.66, 0.78), (0.4, 0.9), (0.2, 0.975)]
POD_SMALL = [(0.0, 0.0), (0.42, 0.04), (0.86, 0.22), (1.0, 0.44), (0.9, 0.63), (0.62, 0.8), (0.34, 0.92), (0.2, 0.975)]
SEGMENT = [(0.44, 0.0), (0.8, 0.12), (0.99, 0.34), (0.97, 0.54), (0.78, 0.76), (0.52, 0.92), (0.44, 1.0)]
CROWN = [(0.56, 0.0), (0.9, 0.11), (1.0, 0.28), (0.88, 0.5), (0.58, 0.74), (0.3, 0.92), (0.2, 1.0)]


@asset("bio-pod", tint="#d35fc4", budget=2400)
def bio_pod(a):
    # x, y, radius, height, lobes, shape, lean (x, y degrees), windows (height fraction, lobe, w, h)
    pods = (
        (0.04, 0.02, 0.84, 2.2, 6, POD, (2, -3), ((0.47, 4, 0.46, 0.64), (0.4, 5, 0.32, 0.44), (0.45, 1, 0.36, 0.5))),
        (1.06, -0.36, 0.55, 1.46, 5, POD_SMALL, (-3, 9), ((0.47, 3, 0.34, 0.46), (0.5, 0, 0.26, 0.36))),
        (-0.86, -0.5, 0.49, 1.18, 5, POD_SMALL, (4, -10), ((0.47, 3, 0.3, 0.4), (0.5, 1, 0.24, 0.32))),
    )
    twist = 0.22
    for x, y, R, H, lobes, shape, lean, windows in pods:
        # Keep one lobe square to the front at window height.
        front = math.radians(270) - (3.5 if lobes == 5 else 4.5) * TAU / lobes
        phase = front - twist * windows[0][0] * H
        with a.group() as g:
            profile = bulb(a, shape, R, 0.0, H, lobes, twist, phase)
            for t, lobe, w, h in windows:
                bulb_window(a, profile, t * H, lobe, lobes, twist, phase, w, h)
            # The breathing mouth at the crown: a puckered lip around a lit throat.
            a.lathe([(0.2 * R, 0.95 * H), (0.26 * R, H + 0.01), (0.14 * R, H + 0.03)], 8, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_3, P.SHADE_2)
            a.lathe([(0.145 * R, H + 0.028), (0, H + 0.05)], 8, cap_bottom=False).part("glow").color(MINT_HOT).no_ao()
        g.rot(x=lean[0], y=lean[1]).move(x, y, 0.03)
        # Root crown hiding the foot of the pod.
        a.lathe([(0.54 * R, 0), (0.46 * R, 0.07 * H), (0.3 * R, 0.14 * H)], 9, cap_bottom=False, cap_top=False).move(x, y, 0).color(BONE_DEEP, BONE)
    # Buttress roots: fat where they leave the pod, wandering out to the soil.
    for deg, reach, sway in ((35, 0.72, 0.07), (100, 0.6, -0.06), (152, 0.74, 0.07), (255, 0.66, 0.06), (322, 0.5, -0.06)):
        root(a, 0.04, 0.02, deg, 0.34, reach, 0.26, 0.13, sway)
    for deg, reach, sway in ((-58, 0.42, 0.05), (15, 0.44, -0.05)):
        root(a, 1.06, -0.36, deg, 0.22, reach, 0.17, 0.09, sway)
    for deg, reach, sway in ((165, 0.4, 0.05), (238, 0.4, -0.04)):
        root(a, -0.86, -0.5, deg, 0.2, reach, 0.15, 0.085, sway)
    # The pods are one organism: thick runners join the small pods to the parent.
    a.tube([(0.5, -0.22, 0.2), (0.72, -0.32, 0.13), (0.9, -0.38, 0.16)], [0.1, 0.08, 0.09], 6).color(BONE_DEEP, BONE)
    a.tube([(-0.4, -0.28, 0.2), (-0.6, -0.4, 0.12), (-0.74, -0.47, 0.15)], [0.1, 0.075, 0.085], 6).color(BONE_DEEP, BONE)
    # Luminous buds on short stalks.
    for bx, by, bz, lx, ly in ((0.56, -0.9, 0.4, 0.5, -0.72), (-0.24, -0.94, 0.32, -0.18, -0.78), (0.6, 0.76, 0.4, 0.48, 0.6)):
        a.tube([(lx, ly, 0.05), (bx, by, bz - 0.06)], [0.035, 0.022], 4).color(BONE)
        a.sphere(0.075, 6, 4).move(bx, by, bz).part("glow").color(MINT_DEEP, MINT_HOT).no_ao()


@asset("bio-tower", tint="#8a62e0", budget=2400)
def bio_tower(a):
    twist = 0.34
    segments = ((0.4, 2.44, 0.8, 6, SEGMENT), (2.5, 4.1, 0.66, 6, SEGMENT), (4.16, 5.44, 0.53, 5, SEGMENT), (5.5, 7.0, 0.42, 5, CROWN))
    # A lobe of the lowest segment faces the front at window height.
    z_win = 0.4 + 0.44 * 2.04
    phase = math.radians(270) - 4.5 * TAU / 6 - twist * z_win
    profiles = []
    for z0, z1, R, lobes, shape in segments:
        profiles.append(bulb(a, shape, R, z0, z1, lobes, twist, phase, seam=0.075))
    for lobe in (4, 0, 2):
        bulb_window(a, profiles[0], z_win, lobe, 6, twist, phase, 0.38, 0.54)
    for lobe in (5, 2):
        bulb_window(a, profiles[1], 2.5 + 0.44 * 1.6, lobe, 6, twist, phase, 0.3, 0.42)
    bulb_window(a, profiles[2], 4.16 + 0.44 * 1.28, 3, 5, twist, phase, 0.24, 0.34)
    # Pale joints where one season's growth ends and the next begins.
    for z, r in ((2.47, 0.36), (4.13, 0.3), (5.47, 0.245)):
        a.lathe([(r - 0.02, z - 0.1), (r + 0.06, z - 0.04), (r + 0.06, z + 0.04), (r - 0.02, z + 0.1)], 8, cap_bottom=False, cap_top=False).color(BONE_DEEP, BONE)
    # Foot: a root crown and buttress roots.
    a.lathe([(0.66, 0), (0.56, 0.14), (0.42, 0.36), (0.36, 0.52)], 10, cap_bottom=False, cap_top=False).color(BONE_DEEP, BONE)
    for k, (deg, reach, sway) in enumerate(((15, 0.52, 0.05), (78, 0.46, -0.05), (140, 0.54, 0.04), (198, 0.46, -0.04), (258, 0.52, 0.05), (322, 0.48, -0.05))):
        root(a, 0, 0, deg, 0.36, reach, 0.3, 0.14, sway)
    # Crown: a calyx and a luminous spike.
    a.lathe([(0.1, 6.94), (0.2, 7.02), (0.17, 7.1), (0.08, 7.07)], 8, cap_bottom=False, cap_top=False).color(BONE_DEEP, BONE)
    a.lathe([(0.075, 7.04), (0.105, 7.22), (0.05, 7.56), (0, 7.8)], 6, cap_bottom=False).part("glow").color(MINT_DEEP, MINT_HOT).no_ao()
    # Fruiting lights hung from the joints.
    for z, deg, out in ((2.47, 40, 0.84), (4.13, 150, 0.74), (5.47, 290, 0.6)):
        tipx, tipy, _ = polar(out, deg)
        a.tube([polar(0.3, deg, z), polar(out * 0.8, deg, z + 0.12), (tipx, tipy, z - 0.08)], [0.04, 0.03, 0.02], 4).color(BONE)
        a.sphere(0.095, 6, 4, (1, 1, 1.25)).move(tipx, tipy, z - 0.18).part("glow").color(MINT_DEEP, MINT_HOT).no_ao()



# --------------------------------------------------------------------------------------------
# Helpers for the city set and the scenario pieces
# --------------------------------------------------------------------------------------------
def hexagon(r: float, turn: float = 0.0):
    """A hexagonal footprint with a corner on the x axis (plus `turn` degrees), so that a flat
    side faces the front."""
    return [polar(r, turn + i * 60)[:2] for i in range(6)]


def skin(rings, closed=True, cap_top=False):
    """Quads between successive rings of equal length (lists of (x, y, z)). `closed` joins the
    last point of each ring to its first; `cap_top` fills the last ring."""
    n = len(rings[0])
    verts = [p for ring in rings for p in ring]
    faces = []
    for k in range(len(rings) - 1):
        for i in range(n if closed else n - 1):
            j = (i + 1) % n
            faces.append((k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i))
    if cap_top:
        faces.append(tuple((len(rings) - 1) * n + i for i in range(n)))
    return jk.raw(verts, faces)


def tier(w, c, profile, cap_top=False):
    """A shell with a chamfered-square plan swept through (inset, z) points: one band of a
    stepped building. `w` is the width at inset 0 and `c` its corner cut."""
    return skin([[(x, y, z) for x, y in chamfered(w - 2 * d, c - 0.586 * d)] for d, z in profile], cap_top=cap_top)


def fin(w, d, h):
    """The front and sides of an upright bar, front face on y = 0, for trims whose back, top
    and bottom are buried in the wall."""
    x = w / 2
    return jk.raw(
        [(-x, 0, 0), (x, 0, 0), (x, 0, h), (-x, 0, h), (-x, d, 0), (x, d, 0), (x, d, h), (-x, d, h)],
        [(0, 1, 2, 3), (4, 0, 3, 7), (1, 5, 6, 2)],
    )


def upright(a, sections, sides=12, power=3.0, caps="flat"):
    """A shell lofted upward: sections are (z, half-width, half-depth[, forward offset])."""
    return a.loft(sections, sides, power, caps).rot(x=90)


def offset_loop(points, d):
    """Offset a closed counter-clockwise outline outward by d, with mitred corners."""
    n = len(points)
    out = []
    for i in range(n):
        p0, p1, p2 = Vector(points[i - 1]), Vector(points[i]), Vector(points[(i + 1) % n])
        e0, e1 = (p1 - p0).normalized(), (p2 - p1).normalized()
        n0, n1 = Vector((e0.y, -e0.x)), Vector((e1.y, -e1.x))
        m = (n0 + n1).normalized()
        k = d / max(0.3, m.dot(n0))
        out.append((p1.x + m.x * k, p1.y + m.y * k))
    return out


def shrub(a, x, y, z, r, turn=0.0):
    """A faceted little tree crown for terraces and roof gardens."""
    return a.lathe([(0, 0), (r, r * 0.5), (r * 0.8, r * 1.2), (0, r * 1.85)], 5, turn=turn).move(x, y, z).color(P.LEAF_DEEP, P.LIME).flat()


# --------------------------------------------------------------------------------------------
# High-technology city set
# --------------------------------------------------------------------------------------------
@asset("spire", tint="#e6e8ea", budget=2400)
def spire(a):
    z0 = 0.46
    # Podium: two hexagonal steps, and stairs up to the entrance on the front side.
    a.prism(hexagon(1.05), 0.26, bevel=0.05, grounded=True).color(P.CONCRETE_DARK, P.CONCRETE)
    a.prism(hexagon(0.8), z0 - 0.26, bevel=0.04).move(0, 0, 0.26).color(P.STEEL_DARK, P.STEEL)
    a.box(0.7, 0.22, 0.13, bevel=0.025, grounded=True).move(0, -1.0, 0).color(P.CONCRETE_DARK, P.CONCRETE)
    a.box(0.56, 0.2, 0.1, bevel=0.02).move(0, -0.78, 0.26).color(P.STEEL_DARK, P.STEEL)
    # Lobby: a glazed hexagonal atrium around the foot of the shaft.
    a.lathe([(0.6, z0), (0.48, 1.5), (0.41, 2.3)], 6, cap_bottom=False, cap_top=False).part("glass").color(P.GLASS_TINTED, P.GLASS)
    for k in range(6):
        a.tube([polar(0.605, k * 60, z0), polar(0.485, k * 60, 1.5), polar(0.415, k * 60, 2.3)], 0.032, 4, caps="none").part("tint").color(P.SHADE_1, P.WHITE)
    a.lathe([(0.64, z0), (0.64, z0 + 0.07), (0.58, z0 + 0.1)], 6, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.lathe([(0.4, 2.26), (0.46, 2.3), (0.46, 2.4), (0.36, 2.46)], 6, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(0.44, 0.26, 0.5, bevel=0.035).move(0, -0.56, z0).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(0.26, 0.03, 0.36, bevel=0.015).move(0, -0.695, z0).color(P.SLATE, jk.shade(P.SLATE, 0.14))
    a.box(0.26, 0.03, 0.05, bevel=0).move(0, -0.695, z0 + 0.39).part("glow").color(P.LAMP)

    # Shaft, with a strip of glazing up each face between the buttresses.
    shaft = [(0.37, 2.4), (0.3, 3.7), (0.24, 5.3), (0.19, 6.5), (0.17, 6.86)]
    a.lathe(shaft, 6, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_1, P.WHITE)
    cos30 = math.cos(math.radians(30))
    for k in range(3):
        rings = []
        for z in (2.62, 3.7, 5.0):
            ap = profile_at(shaft, z)[0] * cos30
            rings.append([(-0.06, -ap + 0.01, z), (-0.06, -ap - 0.014, z), (0.06, -ap - 0.014, z), (0.06, -ap + 0.01, z)])
        a.add(skin(rings, closed=False)).rot(z=k * 120).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)

    # Three buttress blades sweep from the podium into the shaft and carry two rings of light.
    for k in range(3):
        with a.group() as leg:
            a.tube(
                [(0, 0.78, 0.3), (0, 0.6, 1.5), (0, 0.47, 2.7), (0, 0.345, 4.1), (0, 0.25, 5.3)],
                [0.12, 0.1, 0.085, 0.07, 0.05],
                6,
                squash=0.5,
            ).part("metal").color(P.STEEL, P.CHROME)
            a.box(0.26, 0.34, 0.14, bevel=0.035).move(0, 0.78, 0.24).color(P.GUNMETAL, P.STEEL_DARK)
        leg.rot(z=k * 120)
    for z, r in ((2.7, 0.47), (4.1, 0.345)):
        a.torus(r, 0.042, 18, 4).move(0, 0, z).part("glow").color(P.GLOW_CYAN)
    a.lathe([(0.25, 5.16), (0.31, 5.24), (0.31, 5.38), (0.24, 5.46)], 6, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_1, P.WHITE)

    # Sky deck: a saucer with a lit rim and a band of windows.
    a.lathe([(0.17, 6.8), (0.5, 7.06), (0.585, 7.11)], 12, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_2, P.WHITE)
    a.lathe([(0.585, 7.11), (0.585, 7.19)], 12, cap_bottom=False, cap_top=False).part("glow").color(P.GLOW_CYAN)
    a.lathe([(0.585, 7.19), (0.55, 7.22)], 12, cap_bottom=False, cap_top=False).part("tint").color(P.WHITE)
    a.lathe([(0.55, 7.22), (0.52, 7.42)], 12, cap_bottom=False, cap_top=False).part("glass").color(P.GLASS_TINTED, P.GLASS)
    a.lathe([(0.52, 7.42), (0.58, 7.44), (0.58, 7.5), (0.3, 7.66), (0.13, 7.74)], 12, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_1, P.WHITE)
    # Needle and its tip light.
    a.lathe([(0.13, 7.72), (0.1, 7.8), (0.075, 8.4), (0.115, 8.44), (0.115, 8.5), (0.05, 8.54), (0.03, 9.46)], 8, cap_bottom=False, cap_top=False).part("metal").color(
        P.STEEL, P.CHROME
    )
    a.lathe([(0, 9.42), (0.075, 9.58), (0, 9.9)], 6).part("glow").color(P.GLOW_CYAN, "#eaffff").flat().no_ao()


@asset("arcology", tint="#c9ced6", budget=2400)
def arcology(a):
    # width, height, corner cut, mullions per face
    tiers = ((5.6, 1.4, 0.72, 4), (4.4, 1.5, 0.58, 3), (3.2, 1.6, 0.44, 2), (2.0, 1.6, 0.3, 1))
    band, cap, inset = 0.3, 0.22, 0.06
    floor_edge = jk.mix(P.GLASS_DARK, P.SLATE, 0.4)
    z0 = 0.0
    for i, (w, h, c, bars) in enumerate(tiers):
        z1 = z0 + h
        g0, g1 = z0 + band, z1 - cap
        # Spandrel band the curtain wall stands on.
        a.add(tier(w, c, [(0, z0), (0, g0 - 0.05), (inset, g0)])).part("tint").color(P.SHADE_2, P.SHADE_1)
        # Curtain wall: three storeys of glass with dark floor edges between them.
        rows = [(inset, g0)]
        for f in (1, 2):
            zf = g0 + (g1 - g0) * f / 3
            rows += [(inset, zf - 0.022), (inset, zf + 0.022)]
        rows.append((inset, g1))
        glass = a.add(tier(w, c, rows)).part("glass").color(jk.mix(P.GLASS_TINTED, P.GLASS_DARK, 0.3), P.GLASS)
        glass.paint(lambda f: floor_edge if max(v.co.z for v in f.verts) - min(v.co.z for v in f.verts) < 0.06 else None)
        # Cornice: a soffit, a line of amber light and the terrace parapet.
        a.add(tier(w, c, [(inset, g1), (-0.04, g1 + 0.04), (-0.04, z1 - 0.13)])).part("tint").color(P.SHADE_1, P.WHITE)
        a.add(tier(w, c, [(-0.04, z1 - 0.13), (-0.04, z1 - 0.08)])).part("glow").color(P.GLOW_ORANGE)
        a.add(tier(w, c, [(-0.04, z1 - 0.08), (-0.04, z1 - 0.03), (-0.01, z1)], cap_top=True)).part("tint").color(P.WHITE).paint_up(P.SHADE_2)
        # Mullion fins on the four main faces.
        span = w - 2 * c
        with a.group() as face:
            for j in range(1, bars + 1):
                x = -span / 2 + span * j / (bars + 1)
                a.add(fin(0.07, 0.1, g1 - g0 + 0.08)).move(x, -w / 2, g0 - 0.05).part("tint").color(P.SHADE_1, P.WHITE)
        face.radial(4)
        # Terrace garden on the setback: a clipped hedge and trees.
        if i < len(tiers) - 1:
            a.add(tier(w, c, [(0.1, z1 - 0.02), (0.13, z1 + 0.13), (0.33, z1 + 0.13), (0.36, z1 - 0.02)])).color(P.LEAF_DEEP, P.LEAF).flat()
            corner = w / 2 - c / 2 - 0.166
            r = 0.25 - i * 0.03
            spots = [(corner, corner, r)]
            if i == 0:
                spots += [(span * 0.3, w / 2 - 0.235, r * 0.8), (-span * 0.3, w / 2 - 0.235, r * 0.8)]
            elif i == 1:
                spots += [(0.0, w / 2 - 0.235, r * 0.85)]
            for q in range(4):
                for n, (x, y, rr) in enumerate(spots):
                    t = math.radians(q * 90)
                    a.add(
                        shrub(jk, 0, 0, 0, rr, turn=0.4 * n + q).move(x * math.cos(t) - y * math.sin(t), x * math.sin(t) + y * math.cos(t), z1 + 0.09)
                    )
        z0 = z1

    # Grand entrance: a lit portal with glazed doors.
    front = -tiers[0][0] / 2
    a.box(1.5, 0.3, 1.06, bevel=0.05, grounded=True).move(0, front - 0.02, 0).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(1.02, 0.04, 0.76, bevel=0.02).move(0, front - 0.165, 0.0).part("glow").color(P.WINDOW, P.LAMP).no_ao()
    for x in (-0.26, 0.26):
        a.box(0.04, 0.03, 0.74, bevel=0).move(x, front - 0.19, 0).color(P.SLATE)
    a.box(1.0, 0.03, 0.04, bevel=0).move(0, front - 0.19, 0.5).color(P.SLATE)
    a.box(1.8, 0.32, 0.07, bevel=0.02, grounded=True).move(0, front - 0.28, 0).color(P.CONCRETE_DARK, P.CONCRETE)

    # Crown: a glass lantern under four arched ribs that carry a halo and a mast.
    top = z0
    a.lathe(
        [(0.72, top - 0.02), (0.7, top + 0.3), (0.5, top + 0.64), (0.2, top + 0.82)], 8, cap_bottom=False, cap_top=False, turn=math.radians(22.5)
    ).part("glass").color(P.GLASS_TINTED, P.ICE)
    for k in range(4):
        with a.group() as rib:
            a.tube(
                [(0, 1.0, top - 0.02), (0, 0.97, top + 0.5), (0, 0.72, top + 0.98), (0, 0.4, top + 1.2), (0, 0.12, top + 1.3)],
                [0.1, 0.09, 0.075, 0.06, 0.05],
                6,
                squash=0.5,
            ).part("tint").color(P.SHADE_1, P.WHITE)
        rib.rot(z=45 + k * 90)
    a.torus(0.4, 0.04, 16, 4).move(0, 0, top + 1.2).part("glow").color(P.GLOW_ORANGE)
    a.lathe([(0.1, top + 1.22), (0.19, top + 1.3), (0.19, top + 1.42), (0.09, top + 1.5)], 8, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_1, P.WHITE)
    a.lathe([(0.09, top + 1.5), (0.06, top + 1.56), (0.028, top + 2.4)], 6, cap_bottom=False, cap_top=False).part("metal").color(P.STEEL, P.CHROME)
    a.lathe([(0, top + 2.36), (0.065, top + 2.46), (0, top + 2.6)], 6).part("glow").color(P.GLOW_RED).flat().no_ao()


CORE_HOT = "#f2feff"


@asset("reactor", tint="#9aa3ad", budget=2400)
def reactor(a):
    pad_z, R, zc = 0.24, 1.3, 1.52
    a.prism(chamfered(4.2, 0.72), pad_z, bevel=0.05, grounded=True).color(P.CONCRETE_DARK, P.CONCRETE)
    # Vacuum vessel: a torus housing with a line of light around its equator.
    section = [(0.47, 0.07), (0.4, 0.31), (0.18, 0.45), (-0.2, 0.45), (-0.42, 0.25), (-0.42, -0.25), (-0.2, -0.45), (0.18, -0.45), (0.4, -0.31), (0.47, -0.07)]
    a.lathe([(R + r, zc + z) for r, z in section], 24, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_2, P.WHITE)
    a.lathe([(R + 0.47, zc - 0.07), (R + 0.47, zc + 0.07)], 24, cap_bottom=False, cap_top=False).part("glow").color(P.GLOW_CYAN)
    # Six copper field coils clamp the vessel; each stands on its own foot.
    inner, outer = offset_loop(section, -0.03), offset_loop(section, 0.085)
    half = 0.09
    for k in range(6):
        deg = 30 + k * 60
        c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))

        def at(p, side, c=c, s=s):
            rr = R + p[0]
            return (c * rr - s * side, s * rr + c * side, zc + p[1])

        rings = [[at(inner[i], -half), at(outer[i], -half), at(outer[i], half), at(inner[i], half)] for i in range(len(section))]
        rings.append(rings[0])
        a.add(skin(rings, closed=False)).color(jk.shade(P.COPPER, -0.22), jk.shade(P.COPPER, 0.14))
        a.box(0.3, 0.7, zc - 0.5 - pad_z, bevel=0.03, taper=(0.8, 0.62), grounded=True).rot(z=deg - 90).move(c * R, s * R, pad_z).color(P.GUNMETAL, P.STEEL_DARK)

    # Core: a column of plasma between two electrodes, seen down the middle of the torus.
    a.lathe([(0.56, pad_z), (0.48, 0.44), (0.3, 0.56), (0.3, 0.98), (0.4, 1.06), (0.4, 1.12), (0.25, 1.16)], 10, cap_bottom=False, cap_top=False).color(
        P.GUNMETAL, P.STEEL_DARK
    )
    plasma = a.lathe([(0.2, 1.14), (0.27, 1.3), (0.29, 1.78), (0.27, 2.26), (0.2, 2.42)], 10, cap_bottom=False, cap_top=False).part("glow").no_ao()
    paint_verts(plasma, lambda co, f: jk.mix(CORE_HOT, jk.mix(P.GLOW_CYAN, P.GLOW_BLUE, 0.35), smoothstep(0.0, 0.66, abs(co.z - 1.78))))
    for z in (1.42, 2.14):
        a.lathe([(0.27, z - 0.05), (0.32, z - 0.03), (0.32, z + 0.03), (0.27, z + 0.05)], 10, cap_bottom=False, cap_top=False).color(P.GUNMETAL, P.STEEL_DARK)
    deck_z = 2.62
    a.lathe([(0.2, 2.4), (0.38, 2.46), (0.38, 2.58), (0.24, deck_z + 0.02)], 10, cap_bottom=False).color(P.GUNMETAL, P.STEEL_DARK)

    # Service gantry: an access tower with a ladder, and a railed bridge out over the core.
    with a.group() as gantry:
        a.box(0.36, 0.36, deck_z - pad_z, bevel=0.035, grounded=True).move(0, 2.14, pad_z).color(P.STEEL_DARK, P.STEEL)
        a.box(0.36, 2.2, 0.06, bevel=0.015).move(0, 0.9, deck_z).color(P.STEEL_DARK, P.STEEL)
        a.box(0.64, 0.52, 0.06, bevel=0.015).move(0, 2.07, deck_z).color(P.STEEL_DARK, P.STEEL)
        rail_z = deck_z + 0.36
        for side in (-1, 1):
            a.tube([(side * 0.15, -0.16, rail_z), (side * 0.15, 1.8, rail_z), (side * 0.29, 1.84, rail_z), (side * 0.29, 2.3, rail_z)], 0.018, 4).part("metal").color(P.STEEL)
            for y in (-0.16, 0.5, 1.16, 1.8):
                a.tube([(side * 0.15, y, deck_z + 0.04), (side * 0.15, y, rail_z)], 0.014, 4, caps="none").part("metal").color(P.STEEL)
            a.tube([(side * 0.29, 2.3, deck_z + 0.04), (side * 0.29, 2.3, rail_z)], 0.014, 4, caps="none").part("metal").color(P.STEEL)
            a.tube([(side * 0.1, 2.36, pad_z), (side * 0.1, 2.36, deck_z + 0.03)], 0.016, 4, caps="none").color(P.STEEL)
        a.tube([(-0.15, -0.16, rail_z), (0.15, -0.16, rail_z)], 0.018, 4).part("metal").color(P.STEEL)
        for k in range(7):
            z = pad_z + 0.26 + k * 0.32
            a.tube([(-0.1, 2.36, z), (0.1, 2.36, z)], 0.013, 4, caps="none").color(P.STEEL)
        a.sphere(0.06, 6, 4).move(-0.29, 2.3, rail_z + 0.07).part("glow").color(P.GLOW_ORANGE)
    gantry.rot(z=45)

    # Coolant plant: a pump house on the pad, two insulated pipes into the vessel and a dewar.
    cold = jk.mix(P.STEEL, P.SKY, 0.4)
    with a.group() as plant:
        a.box(0.74, 0.46, 0.44, bevel=0.04, grounded=True).part("tint").color(P.SHADE_2, P.SHADE_1)
        for k in range(3):
            a.box(0.36, 0.02, 0.04, bevel=0).move(-0.12, -0.235, 0.1 + k * 0.1).color(P.GUNMETAL)
        a.box(0.1, 0.02, 0.1, bevel=0.01).move(0.24, -0.235, 0.24).part("glow").color(P.GLOW_CYAN)
    plant.rot(z=45).move(*polar(2.1, -45, pad_z))
    for deg in (-37, -53):
        c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
        path = [(R + 0.4, zc - 0.2), (R + 0.7, zc - 0.29), (R + 0.8, zc - 0.56), (R + 0.8, pad_z + 0.4)]
        a.tube([(c * r, s * r, z) for r, z in path], 0.075, 6).color(jk.shade(cold, -0.15), cold)
        port = (c * (R + 0.46), s * (R + 0.46), zc - 0.218)
        face_to(a.cyl(0.115, 0.07, 8, bevel=0.015).color(P.STEEL_DARK, P.STEEL), (c * 0.957, s * 0.957, -0.29), port)
    tx, ty, _ = polar(1.98, -13)
    a.capsule(0.17, 0.86, 8, 2).move(tx, ty, pad_z).color(jk.shade(P.ICE, -0.12), P.ICE)
    a.torus(0.172, 0.018, 8, 4).move(tx, ty, pad_z + 0.5).color(P.STEEL_DARK)
    a.tube([(tx, ty, pad_z + 0.84), (tx - 0.02, ty - 0.2, pad_z + 0.96), polar(2.02, -30, pad_z + 0.7), polar(2.06, -37, pad_z + 0.42)], 0.028, 5).color(P.STEEL_DARK)


HOLO = "#58d8ff"
HOLO_DIM = jk.mix(HOLO, P.NAVY, 0.5)
HOLO_HOT = "#e9fcff"


@asset("hologram", tint="#3a3f48", budget=1200)
def hologram(a):
    # Plinth with a status ring, the post and a small control lectern.
    a.lathe([(0.39, 0), (0.39, 0.07), (0.33, 0.13), (0.322, 0.2)], 10, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.lathe([(0.322, 0.2), (0.316, 0.25)], 10, cap_bottom=False, cap_top=False).part("glow").color(HOLO)
    a.lathe([(0.316, 0.25), (0.3, 0.36), (0.19, 0.44)], 10, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_1, P.WHITE)
    a.lathe([(0.19, 0.44), (0.12, 0.5), (0.085, 0.58), (0.07, 1.6), (0.1, 1.68)], 8, cap_bottom=False, cap_top=False).part("metal").color(P.STEEL, P.CHROME)
    a.box(0.24, 0.12, 0.18, bevel=0.03).rot(x=-28).move(0, -0.13, 0.92).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(0.16, 0.02, 0.1, bevel=0.01).move(0, -0.07, 0.04).rot(x=-28).move(0, -0.13, 0.92).part("glow").color(HOLO)
    # Emitter: a bowl with a bright lens, and a ring of light held above it on three prongs.
    a.lathe([(0.1, 1.68), (0.28, 1.76), (0.33, 1.86), (0.33, 1.92), (0.27, 1.92), (0.22, 1.85)], 10, cap_bottom=False, cap_top=False).part("tint").color(
        P.SHADE_1, P.WHITE
    )
    lens = a.lathe([(0.22, 1.85), (0.1, 1.88), (0, 1.89)], 10, cap_bottom=False).part("glow").no_ao()
    paint_verts(lens, lambda co, f: jk.mix(HOLO_HOT, HOLO, smoothstep(0.0, 0.2, math.hypot(co.x, co.y))))
    for k in range(3):
        a.tube([polar(0.3, 90 + k * 120, 1.9), polar(0.27, 90 + k * 120, 2.05)], 0.018, 4).part("metal").color(P.STEEL)
    a.torus(0.27, 0.022, 14, 4).move(0, 0, 2.05).part("glow").color(HOLO)

    # The display: a curved screen drawn in scan lines, so it reads as light and not as a slab.
    radius, back = 1.55, 0.1

    def depth(x, lift=0.0):
        return back - (radius - math.sqrt(radius * radius - x * x)) - lift

    def band(x0, x1, z0, z1, colour, lift=0.0):
        n = max(1, round(abs(x1 - x0) / 0.22))
        verts = []
        for i in range(n + 1):
            x = x0 + (x1 - x0) * i / n
            verts += [(x, depth(x, lift), z0), (x, depth(x, lift), z1)]
        return a.add(jk.raw(verts, [(2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1) for i in range(n)])).part("glow").color(colour).no_ao()

    for k in range(9):
        z = 2.2 + k * 0.12
        band(-0.82, 0.82, z, z + 0.075, jk.mix(HOLO_DIM, HOLO, 0.1 + 0.5 * k / 8))
    band(-0.85, 0.85, 2.145, 2.17, HOLO)
    band(-0.85, 0.85, 3.31, 3.35, HOLO_HOT)
    # Content floats a little in front of the scan lines: a heading, a world and its moon,
    # a few lines of data and a small chart.
    lift = 0.04
    band(-0.72, -0.06, 3.1, 3.2, HOLO_HOT, lift)
    band(-0.72, -0.38, 2.98, 3.03, HOLO, lift)
    px, pz = -0.4, 2.58
    a.lathe([(0.15, 0), (0, 0.02)], 10, cap_bottom=False).rot(x=90).move(px, depth(px, lift), pz).part("glow").color(HOLO_HOT).no_ao()
    a.torus(0.29, 0.016, 16, 3).scale(1, 0.4, 1).rot(x=90).rot(y=-22).move(px, depth(px, lift + 0.01), pz).part("glow").color(HOLO_HOT).no_ao()
    a.sphere(0.035, 6, 4).move(px + 0.25, depth(px + 0.25, lift + 0.01), pz + 0.2).part("glow").color(HOLO_HOT).no_ao()
    for k, x1 in enumerate((0.74, 0.5, 0.66, 0.4)):
        band(0.1, x1, 3.12 - k * 0.14, 3.18 - k * 0.14, HOLO_HOT if k == 0 else HOLO, lift)
    for k, h in enumerate((0.12, 0.2, 0.16, 0.3, 0.24)):
        x = 0.14 + k * 0.13
        band(x, x + 0.08, 2.24, 2.24 + h, HOLO_HOT, lift)
    for side in (-1, 1):
        a.tube([(side * 0.14, 0, 1.9), (side * 0.85, depth(0.85), 2.145)], 0.008, 3, caps="none").part("glow").color(HOLO_DIM).no_ao()


@asset("robot-arm", tint="#e08a2e", budget=1500)
def robot_arm(a):
    steel, dark = P.STEEL, P.GUNMETAL
    # Plinth, and a flange painted in hazard stripes around the turntable.
    a.prism(chamfered(1.1, 0.16), 0.16, bevel=0.035, grounded=True).color(P.CONCRETE_DARK, P.CONCRETE)
    flange = a.lathe([(0.54, 0.16), (0.45, 0.22), (0.45, 0.28), (0.38, 0.28)], 16, cap_bottom=False, cap_top=False).color(dark)
    step = TAU / 16

    def stripes(f):
        c = f.calc_center_median()
        if c.z > 0.215 or abs(f.normal.z) < 0.2:
            return None
        return P.AMBER if int((math.atan2(c.y, c.x) % TAU) / step) % 2 == 0 else P.INK

    flange.paint(stripes)
    # Turntable and the yoke that carries the shoulder.
    a.lathe([(0.4, 0.28), (0.4, 0.4), (0.34, 0.48), (0.3, 0.6)], 12, cap_bottom=False).part("tint").color(P.SHADE_2, P.WHITE)
    a.box(0.14, 0.03, 0.06, bevel=0).move(0, -0.4, 0.31).part("glow").color(P.GLOW_GREEN)
    sy, sz = 0.04, 0.9  # shoulder axis
    ey, ez = -0.42, 2.03  # elbow axis
    wy, wz = -1.3, 1.62  # wrist axis
    for side in (-1, 1):
        a.profile_x(link_outline((0.02, 0.5), (sy, sz), 0.26, 0.2, 6), 0.1, bevel=0.02).move(side * 0.2, 0, 0).part("tint").color(P.SHADE_2, P.WHITE)
        a.cyl(0.13, 0.06, 8, bevel=0.015).rot(y=90 * side).move(side * 0.25, sy, sz).color(dark, P.STEEL_DARK)
    can = a.cyl(0.13, 0.24, 8, bevel=0.025).rot(y=90).move(0.3, sy, sz).part("tint").color(P.SHADE_2, P.SHADE_1)
    can.paint(lambda f: P.SHADE_3 if f.normal.x > 0.9 else None)
    # Upper arm, elbow housing and forearm.
    a.profile_x(link_outline((sy, sz), (ey, ez), 0.19, 0.15, 6), 0.22, bevel=0.035).part("tint").color(P.SHADE_1, P.WHITE)
    hub = a.cyl(0.17, 0.32, 10, bevel=0.03).rot(y=90).move(-0.16, ey, ez).part("tint").color(P.SHADE_2, P.SHADE_1)
    hub.paint(lambda f: P.SHADE_3 if abs(f.normal.x) > 0.9 else None)
    a.profile_x(link_outline((ey, ez), (wy, wz), 0.13, 0.095, 6), 0.17, bevel=0.03).part("tint").color(P.SHADE_1, P.WHITE)
    fy, fz = wy - ey, wz - ez
    fl = math.hypot(fy, fz)
    fy, fz = fy / fl, fz / fl
    motor = a.cyl(0.1, 0.32, 8, bevel=0.025).part("tint").color(P.SHADE_2, P.SHADE_1)
    motor.paint(lambda f: P.SHADE_3 if f.normal.z > 0.9 else None)
    face_to(motor, (0, -fy, -fz), (0, ey - fy * 0.1, ez - fz * 0.1))
    # Balancer strut behind the upper arm.
    foot, lug = Vector((0, 0.27, 0.6)), Vector((0, -0.05, 1.58))
    mid = foot + (lug - foot) * 0.55
    a.tube([foot, mid], 0.05, 8).color(P.STEEL_DARK, steel)
    a.tube([mid, lug], 0.026, 6).color(P.CHROME)
    a.box(0.12, 0.12, 0.1, bevel=0).move(0, 0.27, 0.52).color(dark)
    # Wrist and a two-finger gripper, angled down at the work.
    a.cyl(0.1, 0.2, 8, bevel=0.02).rot(y=90).move(-0.1, wy, wz).color(dark, P.STEEL_DARK)
    with a.group() as hand:
        a.cyl(0.07, 0.14, 8, bevel=0.015).move(0, 0, -0.14).color(dark, P.STEEL_DARK)
        a.box(0.36, 0.14, 0.1, bevel=0.025).move(0, 0, -0.24).color(dark, P.STEEL_DARK)
        a.box(0.05, 0.02, 0.05, bevel=0).move(0, -0.075, -0.215).part("glow").color(P.GLOW_CYAN)
        for side in (-1, 1):
            jaw = a.box(0.06, 0.1, 0.26, bevel=0.015).move(side * 0.12, 0, -0.5).color(P.STEEL_DARK, steel)
            jaw.paint(lambda f, side=side: P.INK if f.normal.x * side < -0.9 and f.calc_center_median().z < -0.36 else None)
    hand.rot(x=-30).move(0, wy, wz)
    # Cable loom, slack over the elbow.
    a.tube(
        [(-0.31, 0.12, 0.46), (-0.33, 0.16, 0.95), (-0.17, -0.06, 1.42), (-0.16, -0.28, 1.86), (-0.17, -0.36, 2.3), (-0.115, -0.72, 2.0), (-0.115, -1.06, 1.8), (-0.11, -1.24, 1.7)],
        0.026,
        5,
    ).color(P.INK)


@asset("turret", tint="#5d6168", budget=1400)
def turret(a):
    # Emplacement: an octagonal armoured skirt and the slew ring the gun house turns on.
    a.lathe([(0.97, 0), (0.97, 0.09), (0.84, 0.2), (0.6, 0.2)], 8, cap_bottom=False, cap_top=False, turn=math.radians(22.5)).color(P.GUNMETAL, P.STEEL_DARK)
    a.lathe([(0.68, 0.2), (0.68, 0.26), (0.63, 0.3), (0.5, 0.3)], 16, cap_bottom=False, cap_top=False).part("metal").color(P.STEEL, P.CHROME)
    a.lathe([(0.52, 0.3), (0.52, 0.37)], 12, cap_bottom=False, cap_top=False).color(P.GUNMETAL)
    # Gun house: one rounded armour shell, a roof plate, cheek armour over the trunnions.
    a.loft([(-0.62, 0.3, 0.15, 0.6), (-0.52, 0.47, 0.25, 0.61), (-0.1, 0.6, 0.31, 0.63), (0.36, 0.58, 0.3, 0.63), (0.62, 0.44, 0.23, 0.61), (0.7, 0.3, 0.15, 0.59)], 12, 3.4).part(
        "tint"
    ).color(P.SHADE_2, P.WHITE)
    a.box(0.66, 0.74, 0.05, bevel=0.02).move(0, 0.1, 0.915).part("tint").color(P.SHADE_2)
    a.cyl(0.17, 0.04, 10, bevel=0.012).move(-0.14, 0.2, 0.955).part("tint").color(P.SHADE_1)
    a.box(0.03, 0.12, 0.03, bevel=0).move(-0.14, 0.2, 0.99).color(P.GUNMETAL)
    for side in (-1, 1):
        a.box(0.12, 0.46, 0.3, bevel=0.04).move(side * 0.6, -0.2, 0.48).part("tint").color(P.SHADE_2, P.SHADE_1)
        a.cyl(0.07, 0.035, 6, bevel=0.01).rot(y=90 * side).move(side * 0.66, -0.2, 0.63).part("metal").color(P.STEEL)
    # Engine grille at the back.
    a.box(0.56, 0.06, 0.2, bevel=0.02).move(0, 0.675, 0.5).color(P.GUNMETAL)
    for k in range(3):
        a.box(0.5, 0.03, 0.025, bevel=0).move(0, 0.705, 0.535 + k * 0.055).color(P.STEEL_DARK)
    # Twin guns in one mantlet, elevated a little.
    with a.group() as guns:
        a.box(0.68, 0.2, 0.3, bevel=0.05).move(0, -0.66, 0.48).color(P.GUNMETAL, P.STEEL_DARK)
        for side in (-1, 1):
            a.cyl(0.105, 0.4, 10, bevel=0.02).rot(x=90).move(side * 0.19, -0.72, 0.63).part("tint").color(P.SHADE_2, P.SHADE_1)
            a.cyl(0.058, 0.5, 8, bevel=0.008).rot(x=90).move(side * 0.19, -1.08, 0.63).part("metal").color(P.STEEL, P.CHROME)
            brake = a.cyl(0.085, 0.15, 8, bevel=0.015).rot(x=90).move(side * 0.19, -1.44, 0.63).color(P.GUNMETAL, P.STEEL_DARK)
            brake.paint(lambda f: P.INK if f.normal.y < -0.9 else None)
    guns.rot(x=-6, pivot=(0, -0.45, 0.63))
    # Targeting optic with its red eye, and a whip aerial.
    a.box(0.2, 0.3, 0.13, bevel=0.03).move(0.26, -0.18, 0.955).color(P.GUNMETAL, P.STEEL_DARK)
    bezel(a, 0.055, 0.03, 8, rim=P.STEEL_DARK, rim_part="base", pane="glow", pane_color=P.GLOW_RED).rot(x=90).move(0.26, -0.33, 1.02)
    a.tube([(-0.4, 0.5, 0.9), (-0.42, 0.56, 1.14)], 0.012, 4).part("metal").color(P.STEEL)


@asset("beacon", tint="#3a3f48", budget=700)
def beacon(a):
    # Weighted foot and battery box.
    a.prism(hexagon(0.4), 0.12, bevel=0.03, grounded=True).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.lathe([(0.27, 0.12), (0.22, 0.3), (0.12, 0.36)], 6, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(0.17, 0.1, 0.24, bevel=0.025).move(0, -0.1, 0.5).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.box(0.04, 0.02, 0.04, bevel=0).move(0.035, -0.156, 0.66).part("glow").color(P.GLOW_GREEN)
    # Mast, with a small solar panel on a bracket.
    a.lathe([(0.12, 0.36), (0.075, 0.44), (0.055, 2.4), (0.09, 2.46)], 8, cap_bottom=False, cap_top=False).part("metal").color(P.STEEL, P.CHROME)
    a.tube([(0, 0.04, 1.42), (0, 0.19, 1.5)], 0.02, 4).part("metal").color(P.STEEL)
    with a.group() as panel:
        a.box(0.4, 0.035, 0.27, bevel=0.012).move(0, 0, -0.135).part("tint").color(P.SHADE_2)
        a.box(0.35, 0.02, 0.22, bevel=0).move(0, -0.022, -0.11).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    panel.rot(x=-52).rot(z=180).move(0, 0.2, 1.5)
    # Two rings of signal light on spokes.
    for z, r in ((1.95, 0.25), (2.26, 0.19)):
        a.torus(r, 0.024, 12, 4).move(0, 0, z).part("glow").color(P.GLOW_CYAN)
        for k in range(3):
            a.tube([polar(0.05, 30 + k * 120, z), polar(r, 30 + k * 120, z)], 0.012, 4, caps="none").part("metal").color(P.STEEL)
    # Lamp: a red lens in a caged lantern.
    a.lathe([(0.09, 2.46), (0.17, 2.52), (0.17, 2.6), (0.13, 2.6)], 8, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_1, P.WHITE)
    lamp = a.lathe([(0.13, 2.6), (0.15, 2.76), (0.13, 2.94), (0.08, 3.01)], 8, cap_bottom=False, cap_top=False).part("glow").no_ao()
    paint_verts(lamp, lambda co, f: jk.mix(P.GLOW_RED, P.GLOW_ORANGE, 0.6 * (1 - smoothstep(0.0, 0.2, abs(co.z - 2.78)))))
    for k in range(3):
        a.tube([polar(0.165, 90 + k * 120, 2.6), polar(0.19, 90 + k * 120, 2.78), polar(0.15, 90 + k * 120, 3.01)], 0.012, 4, caps="none").part("metal").color(P.STEEL)
    a.lathe([(0.08, 3.0), (0.17, 3.02), (0.15, 3.07), (0.03, 3.12), (0.012, 3.2)], 8, cap_bottom=False).part("tint").color(P.SHADE_1, P.WHITE)


# --------------------------------------------------------------------------------------------
# Scenario pieces: S9's crystal gift, the old robot wreck, S10's cloud city
# --------------------------------------------------------------------------------------------
CRY_DEEP = "#4450c4"
CRY_MID = "#5fd6f5"
CRY_PALE = "#c4f0ff"
CRY_HOT = "#f2feff"
CRY_ROSE = "#b99cff"
CRY_SUN = Vector((-0.48, -0.62, 0.62)).normalized()


def gem(a, r, h, x=0.0, y=0.0, lean=(0.0, 0.0), turn=0.0, sides=6, tip=0.24):
    """One terminated crystal growing out of the ground at (x, y): a prism with a two-stage
    point. `lean` tips it (degrees about x, then y). Being unlit glow, its facets are painted:
    each takes a tone from the way it faces, deeper at the root and hotter at the point."""
    sink = r * 0.85
    z1, z2 = h * (1 - tip), h * (1 - tip * 0.4)
    piece = a.lathe([(r * 0.88, -sink), (r, z1), (r * 0.52, z2), (0, h)], sides, cap_bottom=False, turn=math.radians(turn))
    piece.rot(x=lean[0], y=lean[1]).move(x, y, 0)
    piece.warp(lambda co: (co.x, co.y, max(co.z, 0.0)))
    top = max(v.co.z for v in piece.bm.verts)
    piece.bm.faces.index_update()

    def tone(co, f):
        lit = 0.5 + 0.5 * f.normal.dot(CRY_SUN)
        c = jk.mix(CRY_DEEP, CRY_MID, lit / 0.55) if lit < 0.55 else jk.mix(CRY_MID, CRY_PALE, ((lit - 0.55) / 0.45) ** 1.2)
        if f.index % 2:
            c = jk.mix(c, CRY_ROSE, 0.34)
        u = max(0.0, co.z / top)
        c = jk.mix(c, CRY_DEEP, 0.5 * (1 - u) ** 1.6)
        return jk.mix(c, CRY_HOT, 0.3 * u**4)

    paint_verts(piece, tone)
    return piece.part("glow").flat().no_ao()


@asset("crystal", tint="#ffffff", budget=700)
def crystal(a):
    gem(a, 0.44, 3.4, 0.06, 0.0, lean=(0, 2))
    gem(a, 0.29, 2.2, 0.5, 0.06, lean=(-4, 16), turn=20)
    gem(a, 0.25, 1.65, -0.38, -0.06, lean=(6, -17), turn=-12)
    gem(a, 0.18, 0.95, 0.24, -0.18, lean=(14, 8), turn=30)
    gem(a, 0.16, 0.8, -0.16, 0.2, lean=(-16, -6), turn=8)
    gem(a, 0.13, 0.6, 0.8, -0.1, lean=(8, 33), turn=14)
    gem(a, 0.12, 0.5, -0.66, 0.1, lean=(-6, -30), turn=-20)
    gem(a, 0.1, 0.42, -0.22, -0.3, lean=(24, -14), turn=10)
    gem(a, 0.11, 0.5, 0.44, 0.3, lean=(-24, 12), turn=-8)


def tuft(a, x, y, blades=5, h=0.3, seed=1):
    """A tuft of grass blades at (x, y) on the ground."""
    rnd = random.Random(seed)
    verts, faces = [], []
    for i in range(blades):
        ang = TAU * (i + rnd.random() * 0.6) / blades
        c, s = math.cos(ang), math.sin(ang)
        bx, by = x + c * 0.04, y + s * 0.04
        hh = h * (0.7 + 0.5 * rnd.random())
        lean = 0.1 + 0.12 * rnd.random()
        k = len(verts)
        verts += [(bx - s * 0.035, by + c * 0.035, 0), (bx + s * 0.035, by - c * 0.035, 0), (bx + c * lean, by + s * lean, hh)]
        faces.append((k, k + 1, k + 2))
    return a.add(jk.raw(verts, faces)).color(P.LEAF_DEEP, P.LIME).flat()


@asset("robot-wreck", tint="#8a6a52", budget=2400)
def robot_wreck(a):
    rust = jk.mix(P.STEEL_DARK, P.RUST, 0.45)
    rust_dark = jk.mix(P.GUNMETAL, P.RUST, 0.3)
    moss_lo, moss_hi = jk.shade(P.MOSS, -0.28), jk.mix(P.MOSS, P.LIME, 0.4)

    # The head of a fallen titan, tipped back and sunk to the jaw.
    pose = (
        Matrix.Translation((-0.1, 0.1, 0.36))
        @ Matrix.Rotation(math.radians(20), 4, "Z")
        @ Matrix.Rotation(math.radians(9), 4, "Y")
        @ Matrix.Rotation(math.radians(-20), 4, "X")
        @ Matrix.Scale(1.1, 4)
    )
    with a.group() as head:
        upright(a, [(-0.76, 0.6, 0.5), (-0.6, 0.8, 0.68), (-0.1, 0.86, 0.75), (0.42, 0.82, 0.72), (0.66, 0.64, 0.56), (0.77, 0.34, 0.3)], 14, 3.4).part("tint").color(
            P.SHADE_3, P.WHITE
        )
        upright(a, [(-0.26, 0.852, 0.741), (-0.2, 0.858, 0.747)], 14, 3.4, caps="none").color(rust_dark)
        # Visor band with two round eyes: one lens dead, one socket empty.
        a.loft(
            [(-0.78, 0, 0, 0.1), (-0.775, 0.42, 0.2, 0.1), (-0.735, 0.535, 0.24, 0.1), (-0.655, 0.705, 0.26, 0.1), (-0.57, 0.785, 0.27, 0.1), (-0.44, 0.84, 0.28, 0.1)],
            14,
            3.2,
            caps="none",
        ).color(P.INK, P.CHARCOAL)
        bezel(a, 0.16, 0.06, 10, rim=rust, rim_part="base", pane="glass", pane_color=P.GLASS_DARK).rot(x=90).move(-0.25, -0.775, 0.1)
        a.lathe([(0.16, 0), (0.16, 0.042), (0.144, 0.06), (0.112, 0.03)], 10, cap_bottom=False, cap_top=False).rot(x=90).move(0.25, -0.775, 0.1).color(rust)
        a.lathe([(0.115, 0.03), (0, 0.012)], 10, cap_bottom=False).rot(x=90).move(0.25, -0.775, 0.1).color("#0c0f12").no_ao()
        # Mouth grille.
        a.box(0.58, 0.05, 0.22, bevel=0.02).move(0, -0.722, -0.52).color(rust_dark)
        for x in (-0.18, -0.06, 0.06, 0.18):
            a.box(0.045, 0.03, 0.2, bevel=0).move(x, -0.752, -0.51).part("tint").color(P.SHADE_2)
        # Ear discs, and the stump of an aerial.
        for side in (-1, 1):
            a.cyl(0.25, 0.1, 10, bevel=0.025).rot(y=90 * side).move(side * 0.83, 0.02, 0.05).color(jk.shade(rust, -0.15), rust)
            a.cyl(0.1, 0.05, 8, bevel=0.012).rot(y=90 * side).move(side * 0.92, 0.02, 0.05).color(rust_dark)
        a.tube([(-0.9, 0.02, 0.26), (-1.0, 0.02, 0.8), (-0.84, 0.14, 1.02)], [0.035, 0.03, 0.022], 5).color(rust)
        # Skull seam, and a service hatch with vents on the back of the head.
        upright(a, [(0.46, 0.8, 0.703), (0.51, 0.764, 0.67)], 14, 3.4, caps="none").color(rust_dark)
        a.box(0.56, 0.05, 0.46, bevel=0.035).move(0.08, 0.735, -0.2).part("tint").color(P.SHADE_3, P.SHADE_2)
        for k in range(3):
            a.box(0.34, 0.02, 0.04, bevel=0).move(0.08, 0.775, -0.1 + k * 0.09).color(rust_dark)
        for x in (-0.14, 0.3):
            a.box(0.07, 0.03, 0.05, bevel=0).move(x, 0.775, 0.2).color(rust)
    head.apply(pose)
    turn = pose.to_3x3()

    # A sprout has taken root in the empty eye.
    socket = pose @ Vector((0.25, -0.8, 0.1))
    fwd = turn @ Vector((0, -1, 0))
    s1 = socket + fwd * 0.07 + Vector((0, 0, 0.1))
    s2 = s1 + fwd * 0.03 + Vector((0.02, 0, 0.15))
    a.tube([socket, s1, s2], [0.02, 0.016, 0.012], 4).color(P.LEAF_DEEP)
    for side in (-1, 1):
        a.sphere(0.075, 6, 4, (1.5, 0.75, 0.3)).rot(y=-28 * side).move(s2.x + side * 0.085, s2.y, s2.z + 0.03).color(P.LEAF, P.LIME).flat()

    # One arm lies where it fell: a shoulder cap, the bare upper limb, an armoured forearm
    # and an open hand.
    a.sphere(0.44, 10, 6, (1.1, 1.0, 0.86)).move(1.2, 0.5, -0.02).part("tint").color(P.SHADE_3, P.WHITE)
    elbow, wrist = Vector((1.62, 0.04, 0.2)), Vector((2.24, -0.6, 0.19))
    a.tube([(1.22, 0.46, 0.14), elbow], 0.17, 8).color(jk.shade(rust, -0.2), rust)
    a.sphere(0.23, 8, 5).move(*elbow).color(rust_dark, rust)
    along = wrist - elbow
    a.tube([elbow + along * 0.08, elbow + along * 0.32, elbow + along * 0.82, wrist], [0.17, 0.26, 0.25, 0.2], 8).part("tint").color(P.SHADE_2, P.WHITE)
    a.tube([elbow + along * 0.52, elbow + along * 0.6], 0.268, 8, caps="none").color(rust_dark)
    a.sphere(0.19, 8, 5).move(*wrist).color(rust_dark, rust)
    h = Vector((along.x, along.y, 0)).normalized()
    side_dir = Vector((-h.y, h.x, 0))
    yaw = math.degrees(math.atan2(h.x, -h.y))
    palm = wrist + h * 0.3
    a.box(0.36, 0.3, 0.14, bevel=0.04).rot(z=yaw).move(palm.x, palm.y, 0.04).part("tint").color(P.SHADE_2, P.SHADE_1)
    for off in (-0.12, 0.0, 0.12):
        root_ = palm + h * 0.13 + side_dir * off + Vector((0, 0, 0.12))
        a.tube([root_, root_ + h * 0.17 + Vector((0, 0, 0.09)), root_ + h * 0.32 + Vector((0, 0, -0.08))], [0.062, 0.058, 0.048], 5).color(jk.shade(rust, -0.15), rust)
    thumb = palm - side_dir * 0.2 + Vector((0, 0, 0.1))
    a.tube([thumb, thumb + h * 0.1 - side_dir * 0.12 + Vector((0, 0, 0.06)), thumb + h * 0.24 - side_dir * 0.1 + Vector((0, 0, -0.06))], [0.062, 0.056, 0.048], 5).color(
        jk.shade(rust, -0.15), rust
    )

    # Debris thrown clear: an armour plate and a gear wheel, both settling into the soil.
    a.box(0.7, 0.42, 0.08, bevel=0.025).rot(x=16, y=-20).rot(z=35).move(-1.42, -0.5, 0.1).part("tint").color(P.SHADE_3, P.SHADE_1)
    a.annulus(0.21, 0.09, 0.07, 10).rot(x=14, y=8).move(-1.28, 0.42, 0.02).color(jk.shade(rust, -0.2), rust)

    # Moss on every surface that faces the sky, and grass against the metal.
    for local, r, squash, seed in (
        ((-0.12, -0.02, 0.72), 0.55, (1.15, 1.0, 0.42), 3),
        ((0.42, 0.3, 0.6), 0.3, (1.1, 1.0, 0.4), 5),
        ((-0.52, -0.3, 0.52), 0.24, (1.0, 1.0, 0.45), 8),
    ):
        p = pose @ Vector(local)
        a.blob(r, 1, squash, lumps=0.22, seed=seed).move(p.x, p.y, p.z).color(moss_lo, moss_hi)
    mid = elbow + along * 0.55
    a.blob(0.26, 1, (1.25, 0.9, 0.42), lumps=0.22, seed=11).rot(z=yaw).move(mid.x, mid.y, mid.z + 0.22).color(moss_lo, moss_hi)
    a.blob(0.27, 1, (1.1, 1.0, 0.4), lumps=0.22, seed=13).move(1.24, 0.52, 0.33).color(moss_lo, moss_hi)
    for k, (x, y, hgt) in enumerate(((0.72, -0.62, 0.3), (-0.95, -0.42, 0.26), (1.9, 0.3, 0.3), (2.6, -0.5, 0.22), (-0.72, 0.86, 0.3), (1.5, -0.4, 0.24), (-1.62, 0.1, 0.22))):
        tuft(a, x, y, 5, hgt, seed=k + 2)


@asset("cloud-city", tint="#f1efe7", grounded=False, budget=2400)
def cloud_city(a):
    n, deck = 24, 0.5
    # Hull: a lens-shaped disc with a lit promenade round its rim. The origin is the centre of
    # its underside.
    a.lathe([(0.56, 0.0), (1.3, 0.07), (1.9, 0.2), (2.1, 0.3)], n, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_3, P.SHADE_1)
    a.lathe([(2.1, 0.3), (2.1, 0.38)], n, cap_bottom=False, cap_top=False).part("glow").color(P.GLOW_WHITE)
    a.lathe([(2.1, 0.38), (2.05, 0.46), (1.94, deck), (1.1, deck)], n, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_1, P.WHITE)
    # A ring of parkland on the deck.
    a.lathe([(1.76, deck - 0.01), (1.74, deck + 0.04), (1.19, deck + 0.04)], n, cap_bottom=False, cap_top=False).color(P.LEAF_DEEP, P.LEAF).flat()

    # The great dome: a garden under glass, ribbed, with a mast at its crown.
    a.lathe([(1.2, deck), (1.2, deck + 0.1), (1.12, deck + 0.16)], 16, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_1, P.WHITE)
    base = deck + 0.16
    arc = [(1.12, base), (1.1, base + 0.2), (1.0, base + 0.44), (0.76, base + 0.71), (0.42, base + 0.89), (0.15, base + 0.94)]

    def garden(co, f):
        ang = math.atan2(co.y, co.x)
        up = co.z - base
        treeline = 0.25 + 0.1 * math.sin(ang * 3 + 0.6) + 0.07 * math.sin(ang * 5 + 1.9)
        if up < treeline:
            return jk.mix(P.LEAF_DEEP, P.LEAF, smoothstep(0, treeline, up) * 0.9)
        return jk.mix(P.GLASS_TINTED, P.ICE, smoothstep(treeline, 0.94, up))

    paint_verts(a.lathe(arc, 16, cap_bottom=False, cap_top=False).part("glass").flat(), garden)
    for k in range(8):
        a.tube([polar(r + 0.004, k * 45, z) for r, z in arc[:1] + arc[2:]], 0.03, 4, caps="none").part("tint").color(P.SHADE_1, P.WHITE)
    crown = base + 0.94
    a.lathe([(0.15, crown - 0.02), (0.21, crown + 0.03), (0.21, crown + 0.1), (0.1, crown + 0.16)], 8, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_1, P.WHITE)
    a.lathe([(0.1, crown + 0.16), (0.055, crown + 0.2), (0.022, crown + 0.42)], 6, cap_bottom=False, cap_top=False).part("metal").color(P.STEEL, P.CHROME)
    a.lathe([(0, crown + 0.39), (0.05, crown + 0.44), (0, crown + 0.5)], 6).part("glow").color(P.GLOW_RED).flat().no_ao()

    # Three smaller domes in the park, and three towers between them.
    for k in range(3):
        x, y, _ = polar(1.52, 90 + k * 120)
        a.lathe([(0.34, deck), (0.34, deck + 0.1), (0.3, deck + 0.14)], 8, cap_bottom=False, cap_top=False).move(x, y, 0).part("tint").color(P.SHADE_1, P.WHITE)
        a.lathe([(0.3, deck + 0.14), (0.26, deck + 0.31), (0.15, deck + 0.43), (0, deck + 0.47)], 8, cap_bottom=False).move(x, y, 0).part("glass").color(
            jk.mix(P.LEAF, P.GLASS_TINTED, 0.55), P.ICE
        ).flat()
    for k, height in enumerate((0.9, 1.05, 0.78)):
        x, y, _ = polar(1.52, 270 + k * 120)
        mid, top = deck + height * 0.56, deck + height
        a.lathe([(0.24, deck), (0.21, mid)], 8, cap_bottom=False, cap_top=False).move(x, y, 0).part("tint").color(P.SHADE_1, P.WHITE)
        a.lathe([(0.21, mid), (0.205, mid + 0.08)], 8, cap_bottom=False, cap_top=False).move(x, y, 0).part("glow").color(P.GLOW_WHITE)
        a.lathe([(0.205, mid + 0.08), (0.19, top - 0.12), (0.26, top - 0.07), (0.26, top - 0.02), (0, top + 0.07)], 8, cap_bottom=False).move(x, y, 0).part(
            "tint"
        ).color(P.SHADE_1, P.WHITE)
        a.tube([(x, y, top + 0.04), (x, y, top + 0.24)], 0.012, 4).part("metal").color(P.STEEL)

    # Below: the ballast keel with an observation band and a running light, four stabilising
    # fins, and four engine pods under the rim to hold station in the wind.
    a.lathe([(0.58, 0.02), (0.5, -0.14), (0.34, -0.3), (0.32, -0.4)], 10, cap_bottom=False, cap_top=False).color(P.STEEL_DARK, P.STEEL)
    a.lathe([(0.32, -0.4), (0.315, -0.47)], 10, cap_bottom=False, cap_top=False).part("glow").color(P.GLOW_WHITE)
    a.lathe([(0.315, -0.47), (0.3, -0.56), (0.2, -0.76), (0.07, -0.85)], 10, cap_bottom=False, cap_top=False).color(jk.shade(P.STEEL_DARK, -0.15), P.STEEL_DARK)
    a.lathe([(0, -0.92), (0.06, -0.89), (0.07, -0.85)], 8, cap_top=False).part("glow").color(P.GLOW_CYAN).no_ao()
    for k in range(4):
        a.profile_y([(0.27, -0.64), (1.12, 0.0), (1.12, 0.1), (0.27, 0.06)], 0.07, bevel=0.015).rot(z=45 + k * 90).part("tint").color(P.SHADE_3, P.SHADE_1)
        with a.group() as pod:
            a.loft([(-0.27, 0, 0), (-0.22, 0.075, 0.075), (0.0, 0.1, 0.1), (0.2, 0.085, 0.085), (0.26, 0.06, 0.06)], 6, 2.0, caps="none").move(2.13, 0, 0.13).part(
                "tint"
            ).color(P.SHADE_2, P.WHITE)
            a.box(0.26, 0.14, 0.07, bevel=0).move(2.02, 0, 0.17).part("tint").color(P.SHADE_2)
            a.lathe([(0.06, 0), (0, 0.012)], 6, cap_bottom=False).rot(x=-90).move(2.13, 0.26, 0.13).part("glow").color(P.GLOW_ORANGE).no_ao()
            a.box(0.36, 0.014, 0.03, bevel=0).rot(y=35).move(2.13, -0.25, 0.13).color(P.GUNMETAL)
        pod.rot(z=k * 90)
