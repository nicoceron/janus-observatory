"""Landmarks of S4 Living with the Land, S5 Transhumanism and S6 Sword of Damocles.

Each model replaces one code-drawn landmark and is authored at ten times its landmark size, with
the same origin and footprint, so the web app can scale it straight back into place. Landmarks are
one of a kind and are also shown alone in a close-up study. Matte surfaces are `base` (`tint`
where the scenario recolours them), gleaming steel `metal`, membranes and water `glass`, and light
`glow` (`lit` only for window panes). Everything here is original interpretive artwork of the
Project Janus narratives: no form, count or dimension encodes a measured quantity.
"""

import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

from kit import jk, parts
from kit import palette as P
from kit.jk import asset

TAU = math.tau


# --------------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------------
def _frame(p0, p1, side=(1, 0, 0)):
    """A matrix carrying local z onto p0 -> p1 (local x stays near `side`), and the length."""
    p0, p1 = Vector(p0), Vector(p1)
    z = p1 - p0
    length = z.length
    z.normalize()
    s = Vector(side)
    x = s - z * s.dot(z)
    if x.length < 1e-4:
        s = Vector((0, 1, 0)) if abs(z.y) < 0.9 else Vector((0, 0, 1))
        x = s - z * s.dot(z)
    x.normalize()
    m = Matrix((x, z.cross(x), z)).transposed().to_4x4()
    m.translation = p0
    return m, length


def beam(a, p0, p1, w, d=None, bevel=0.0, side=(1, 0, 0), taper=1.0):
    """A box member from p0 to p1, `w` wide along `side` and `d` deep."""
    m, length = _frame(p0, p1, side)
    return a.box(w, w if d is None else d, length, bevel=bevel, taper=taper).apply(m)


def rod(a, p0, p1, r, sides=5, caps="flat"):
    return a.tube([p0, p1], r, sides, caps=caps)


def drum(a, p0, p1, r, sides=10, bevel=None, r2=None):
    """A cylinder whose axis runs from p0 to p1."""
    m, length = _frame(p0, p1)
    return a.cyl(r, length, sides, r2=r2, bevel=bevel).apply(m)


def polar(r, deg, z=0.0):
    t = math.radians(deg)
    return (math.cos(t) * r, math.sin(t) * r, z)


def paint_by(piece, fn):
    """Colour every corner from its position: `fn(co) -> colour`."""
    for f in piece.bm.faces:
        for loop in f.loops:
            c = jk.col(fn(loop.vert.co))
            loop[piece.layer] = (c[0], c[1], c[2], 1.0)
    return piece


def merged(pieces, colour="#ffffff"):
    """One piece from several (a multi-part boolean cutter)."""
    bm = bmesh.new()
    for p in pieces:
        mesh = bpy.data.meshes.new("jk_merge")
        p.bm.to_mesh(mesh)
        bm.from_mesh(mesh)
        bpy.data.meshes.remove(mesh)
        p.bm.free()
    bm.normal_update()
    return jk.Piece(bm).color(colour)


def tuft(a, x, y, z=0.0, s=1.0, colour=P.MOSS, seed=0):
    """Three blades of grass."""
    for k in range(3):
        t = seed * 1.3 + k * TAU / 3
        a.add(jk.cyl(0.055 * s, (0.3 + 0.08 * k) * s, 4, r2=0, bevel=0, grounded=True)).rot(x=22).rot(
            z=math.degrees(t)
        ).move(x + math.cos(t) * 0.05 * s, y + math.sin(t) * 0.05 * s, z).color(jk.shade(colour, -0.18), colour).flat()


def leaves(a, p, r, seed=1, low="#2c6331", high="#4f8f44", squash=0.74, subdiv=1):
    """A faceted clump of foliage."""
    return a.blob(r, subdiv, (1, 1, squash), lumps=0.22, seed=seed).move(p[0], p[1], p[2]).color(low, high)


# --------------------------------------------------------------------------------------------
# S4 · Living with the Land
# --------------------------------------------------------------------------------------------
HIDE_TAN, HIDE_RUSSET, HIDE_CREAM, HIDE_DARK = "#c4955f", "#a7714a", "#d8b98a", "#8f6844"
POLE = "#7a5a3a"
POLE_DARK = "#5a3d28"
CORD = "#4a3626"
WEAVE_RED = "#a8523c"


def cone_tent(a, r, h, hide, poles=8, door=0.5, pins=3, seed=1):
    """A conical pole tent at the origin with its door facing -y.

    The cover is stretched over `poles` poles that cross and are lashed above the smoke hole; one
    door flap is pinned back and the other rolled and tied. `door` is the door height as a share
    of the tent height (0 leaves the cover laced shut).
    """
    step = TAU / poles
    turn = -math.pi / 2 - step / 2
    c = math.cos(step / 2)
    waist_z, waist_r = h * 0.42, r * 0.56
    lo, hi = jk.shade(hide, -0.2), jk.shade(hide, 0.1)
    cover = a.lathe(
        [(r, 0), (r * 0.975, 0.07), (waist_r, waist_z), (r * 0.25, h * 0.8), (r * 0.12, h * 0.94)], poles, turn=turn
    ).bevel(0.035)
    cover.color(lo, hi)
    stained = jk.shade(hide, -0.42)
    cover.paint(lambda f: stained if f.calc_center_median().z > h * 0.8 else None)
    cover.paint(lambda f: "#2a1f18" if f.normal.z > 0.9 and f.calc_center_median().z > h * 0.9 else None)

    def skin(x, z, off=0.0):
        """A point on the door facet at height z, `off` proud of the hide."""
        k = z / waist_z
        y = -c * (r * 0.975 + (waist_r - r * 0.975) * k)
        slope = c * (r * 0.975 - waist_r) / waist_z
        n = Vector((0, -1, slope)).normalized()
        return Vector((x, y, z)) + n * off

    dh = h * door
    dw = r * 0.62
    if door:
        cutter = jk.profile_y([(-dw / 2, -0.2), (dw / 2, -0.2), (0, dh)], r * 0.9, bevel=0).move(0, -r * 0.62, 0)
        cover.cut(cutter.color("#2c2019"))
        # Left flap, folded back flat on the hide and pinned with a toggle.
        front = [skin(-dw / 2, 0.04, 0.05), skin(-dw / 2 - r * 0.3, 0.04, 0.05), skin(-dw * 0.1, dh * 0.94, 0.05)]
        back = [skin(-dw / 2, 0.04, 0.0), skin(-dw / 2 - r * 0.3, 0.04, 0.0), skin(-dw * 0.1, dh * 0.94, 0.0)]
        a.raw(
            [tuple(p) for p in front + back],
            [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)],
        ).color(jk.shade(hide, 0.2), jk.shade(hide, 0.3)).flat()
        peg = skin(-dw / 2 - r * 0.22, 0.2, 0.07)
        rod(a, peg - Vector((0.09, 0, 0)), peg + Vector((0.09, 0, 0)), 0.022, 4).color(POLE_DARK)
        # Right flap, rolled along the opening and tied twice.
        p0, p1 = skin(dw / 2 + 0.07, 0.07, 0.07), skin(dw * 0.09, dh * 0.96, 0.07)
        a.tube([p0, p1], [0.085, 0.06], 6, caps="round").color(jk.shade(hide, -0.08), jk.shade(hide, 0.16))
        for t in (0.3, 0.68):
            q = p0.lerp(p1, t)
            drum(a, q.lerp(p1, -0.04), q.lerp(p1, 0.04), 0.1 - 0.03 * t, 6, bevel=0).color(CORD)
    # Lacing pins close the seam above the door.
    for k in range(pins):
        z = (dh if door else h * 0.16) + 0.16 + k * 0.2
        if z > waist_z:
            break
        q = skin(0, z, 0.035)
        rod(a, q - Vector((0.1, 0, 0)), q + Vector((0.1, 0, 0)), 0.02, 4).color(POLE_DARK)
    # Poles: only the crossing bundle shows above the cover.
    cross = h * 0.985
    rng = random.Random(seed)
    for i in range(poles):
        t = turn + i * step
        ext = 0.13 + rng.random() * 0.1
        lo_t = 0.92
        p_lo = (math.cos(t) * r * (1 - lo_t), math.sin(t) * r * (1 - lo_t), cross * lo_t)
        p_hi = (-math.cos(t) * r * ext, -math.sin(t) * r * ext, cross * (1 + ext))
        a.tube([p_lo, p_hi], [0.045, 0.03], 5).color(POLE_DARK, POLE)
    a.torus(0.085, 0.035, 8, 4).move(0, 0, cross).color(CORD)
    # Stones weigh the hem down, clear of the door.
    for i in range(poles):
        if i in (0, 1, poles - 1) or (i + seed) % 2:
            continue
        t = turn + (i - 0.5) * step
        a.blob(0.13 + 0.03 * (i % 3), 1, (1.1, 0.9, 0.62), lumps=0.2, seed=seed * 5 + i).move(
            math.cos(t) * r * 0.98, math.sin(t) * r * 0.98, 0.05
        ).color(P.STONE_DARK, P.STONE)


def round_tent(a, r, wall, rise, cloth, roof):
    """A round lattice-walled tent (door facing -y): woven wall, girth ropes, felt roof, crown."""
    a.lathe([(r - 0.04, 0), (r, 0.09), (r, wall - 0.04), (r - 0.03, wall)], 14, cap_bottom=False).color(
        jk.shade(cloth, -0.16), jk.shade(cloth, 0.06)
    )
    for z, band in ((wall * 0.3, WEAVE_RED), (wall * 0.72, CORD)):
        a.cyl(r + 0.028, 0.085 if band == WEAVE_RED else 0.05, 14, bevel=0).move(0, 0, z).color(band)
    top = wall + rise
    eave = r + 0.11
    a.lathe(
        [(eave - 0.05, wall - 0.07), (eave, wall - 0.02), (eave, wall + 0.05), (r * 0.3, top - 0.1), (r * 0.2, top - 0.06)],
        14,
    ).color(jk.shade(roof, -0.16), jk.shade(roof, 0.1)).paint(
        lambda f: "#2a1f18" if f.normal.z > 0.9 and f.calc_center_median().z > top - 0.2 else None
    )
    a.torus(r * 0.22, 0.055, 10, 5).move(0, 0, top - 0.05).color(POLE, jk.shade(POLE, 0.15))
    # A felt flap half covers the crown, held by ropes that run down to the girth.
    a.box(r * 0.5, r * 0.3, 0.035, bevel=0.012).rot(x=-13).move(0, r * 0.13, top - 0.02).color(jk.shade(roof, -0.3))
    for deg in (15, 75, 135, 195, 345):
        p0, p1 = polar(r * 0.27, deg, top - 0.09), polar(eave + 0.012, deg, wall + 0.04)
        m, length = _frame(p0, p1)
        a.box(0.035, 0.03, length, bevel=0).apply(m).color(CORD)
        rod(a, polar(eave + 0.01, deg, wall + 0.05), polar(r + 0.03, deg, wall * 0.72 + 0.03), 0.016, 4).color(CORD)
    # Door: a timber frame, a dark way in, and the hide door rolled up and tied to the lintel.
    y = -math.sqrt(r * r - 0.4 * 0.4) + 0.02
    a.add(parts.frame(0.6, 0.86, 0.075, 0.13, 0.1)).move(0, y, 0).color(jk.shade(POLE, -0.1), jk.shade(POLE, 0.2))
    a.box(0.6, 0.012, 0.86, bevel=0).move(0, y - 0.036, 0.075).color("#2c2019").no_ao()
    a.box(0.56, 0.03, 0.2, bevel=0.01).move(0, y - 0.05, 0.74).color(HIDE_RUSSET)
    drum(a, (-0.33, y - 0.09, 0.74), (0.33, y - 0.09, 0.74), 0.075, 8, bevel=0.02).color(
        jk.shade(HIDE_RUSSET, -0.1), jk.shade(HIDE_RUSSET, 0.12)
    )
    for x in (-0.18, 0.18):
        drum(a, (x - 0.025, y - 0.09, 0.74), (x + 0.025, y - 0.09, 0.74), 0.088, 6, bevel=0).color(CORD)
    a.box(0.82, 0.3, 0.05, bevel=0.015).move(0, y - 0.2, 0).color(WEAVE_RED, jk.shade(WEAVE_RED, 0.12))


def ridge_tent(a, length, width, h, cloth):
    """A ridge tent, open end facing -y: scissor poles, a ridge pole, rolled flaps and a mat."""
    half = length / 2
    outline = [(-width / 2, 0), (-width / 2 + 0.11, 0), (0, h - 0.1), (width / 2 - 0.11, 0), (width / 2, 0), (0, h)]
    a.profile_x(outline, length, bevel=0.022).rot(z=90).color(jk.shade(cloth, -0.2), jk.shade(cloth, 0.1))
    # Closed back wall and the sleeping mat that pokes out of the open front.
    a.profile_y([(-width / 2 + 0.1, 0), (width / 2 - 0.1, 0), (0, h - 0.1)], 0.05, bevel=0).move(0, half - 0.1, 0).color(
        jk.shade(cloth, -0.3), jk.shade(cloth, -0.06)
    )
    a.box(width * 0.66, length * 0.94, 0.045, bevel=0.015).move(0, -0.1, 0).color(WEAVE_RED, jk.shade(WEAVE_RED, 0.1))
    drum(a, (-width * 0.24, half - 0.36, 0.15), (width * 0.24, half - 0.36, 0.15), 0.12, 8, bevel=0.03).color(HIDE_CREAM)
    for end in (-1, 1):
        y = end * (half + 0.03)
        for side in (-1, 1):
            a.tube([(side * (width / 2 - 0.04), y, 0), (-side * 0.16, y, h + 0.3)], [0.05, 0.036], 5).color(POLE_DARK, POLE)
        a.torus(0.07, 0.03, 8, 4).rot(x=90).move(0, y, h - 0.02).color(CORD)
    rod(a, (0, -half - 0.26, h - 0.02), (0, half + 0.26, h - 0.02), 0.04, 6).color(POLE)
    # Front flaps rolled up the slope and tied.
    for side in (-1, 1):
        p0 = Vector((side * (width / 2 - 0.1), -half - 0.01, 0.12))
        p1 = Vector((side * 0.1, -half - 0.01, h - 0.14))
        a.tube([p0, p1], 0.06, 6, caps="round").color(jk.shade(cloth, 0.18))
        q = p0.lerp(p1, 0.5)
        drum(a, q.lerp(p1, -0.035), q.lerp(p1, 0.035), 0.076, 6, bevel=0).color(CORD)
    # A guy line to a peg behind, and pegs along the hem.
    rod(a, (0, half + 0.24, h - 0.02), (0, half + 0.95, 0.04), 0.014, 4).color(CORD)
    rod(a, (0, half + 1.0, 0.0), (0, half + 0.9, 0.2), 0.03, 4).color(POLE_DARK)
    for side in (-1, 1):
        for y in (-half * 0.62, 0, half * 0.62):
            rod(a, (side * (width / 2 + 0.07), y, 0), (side * (width / 2 - 0.02), y, 0.17), 0.026, 4).color(POLE_DARK)


def bundle(a, r, length, colour):
    """A rolled hide lying along x, tied with two cords."""
    start = len(a.pieces)
    drum(a, (-length / 2, 0, r), (length / 2, 0, r), r, 8, bevel=r * 0.3).color(jk.shade(colour, -0.14), jk.shade(colour, 0.1))
    for side in (-1, 1):
        x = side * length * 0.27
        drum(a, (x - 0.025, 0, r), (x + 0.025, 0, r), r + 0.014, 8, bevel=0).color(CORD)
        drum(a, (side * length / 2 - side * 0.004, 0, r), (side * (length / 2 + 0.006), 0, r), r * 0.5, 6, bevel=0).color(
            jk.shade(colour, -0.32)
        )
    return parts.grouped(a, start)


@asset(
    "lm-camp",
    tint="#ffffff",
    budget=4500,
    note="S4: a seasonal camp of four tents around a hearth, opening toward the front. Origin at the hearth.",
)
def camp(a):
    # Trampled earth around the hearth.
    ground = a.cyl(1.0, 0.03, 16, bevel=0.012, grounded=True)

    def trample(co):
        t = math.atan2(co.y, co.x)
        k = 1.52 + 0.2 * math.cos(2 * t + 0.6) + 0.14 * math.cos(3 * t - 1.0)
        return (co.x * k, co.y * k, co.z)

    ground.warp(trample).color("#8a7a5a", "#93835f")

    # Hearth: a ring of stones, ash, a small log fire and a thin wisp of smoke.
    a.cyl(0.46, 0.05, 8, bevel=0, grounded=True).color("#3d3832", "#4a443c")
    for i in range(8):
        t = i / 8 * TAU + 0.2
        a.blob(0.14 + 0.03 * ((i * 7) % 3), 1, (1.15, 0.95, 0.8), lumps=0.2, seed=30 + i).rot(z=math.degrees(t)).move(
            math.cos(t) * 0.55, math.sin(t) * 0.55, 0.08
        ).color(P.STONE_DARK, P.STONE)
    a.cyl(0.27, 0.035, 8, bevel=0).move(0, 0, 0.045).part("glow").color("#ff7a2a")
    for i in range(4):
        t = i / 4 * TAU + 0.5
        p0 = (math.cos(t) * 0.4, math.sin(t) * 0.4, 0.09)
        p1 = (-math.cos(t) * 0.07, -math.sin(t) * 0.07, 0.3)
        a.tube([p0, p1], 0.065, 6).color(P.BARK_DARK, P.BARK)
    for x, y, r, h, tone in ((0.0, 0.02, 0.17, 0.62, "#ff9a3a"), (0.12, -0.08, 0.11, 0.42, "#ffd27a"), (-0.11, 0.08, 0.1, 0.36, "#ff7a2a")):
        a.lathe([(r * 0.5, 0), (r, h * 0.22), (r * 0.62, h * 0.55), (0, h)], 5).move(x, y, 0.16).part("glow").color(tone).flat()
    vapour(
        a, 0.02, 0.0, 0.86,
        ((0.0, 0.0, 0.0, 0.12), (0.05, 0.03, 0.27, 0.19), (0.15, -0.02, 0.64, 0.26), (0.33, 0.03, 1.06, 0.2), (0.48, 0.0, 1.4, 0.13)),
        60, 150, tones=("#a9a59d", "#e4e1da", "#9a968e"),
    )
    # A clay pot by the fire and a log to sit on.
    a.lathe([(0.1, 0), (0.19, 0.08), (0.2, 0.2), (0.13, 0.31), (0.15, 0.36), (0.11, 0.36), (0.1, 0.3)], 8).move(0.72, 0.42, 0).color(
        jk.shade(P.CLAY, -0.2), P.CLAY
    )
    drum(a, (-0.72, -1.2, 0.15), (0.38, -1.02, 0.15), 0.15, 8, bevel=0.03).color(P.BARK_DARK, P.BARK).paint(
        lambda f: P.PINE_WOOD if abs(f.normal.z) < 0.3 and abs(f.normal.x) > 0.9 else None
    )

    # Four tents of different make, each door turned to the fire.
    with a.group() as t1:
        cone_tent(a, 1.5, 2.56, HIDE_TAN, poles=8, door=0.44, seed=3)
    t1.rot(z=39.6).move(-1.9, 2.3, 0)
    with a.group() as t2:
        round_tent(a, 1.4, 0.98, 0.8, HIDE_CREAM, "#b9a076")
    t2.rot(z=-51.9).move(2.55, 2.0, 0)
    with a.group() as t3:
        ridge_tent(a, 1.9, 1.6, 1.38, HIDE_RUSSET)
    t3.rot(z=240.4).move(2.6, -1.45, 0)
    with a.group() as t4:
        cone_tent(a, 1.02, 1.74, HIDE_DARK, poles=6, door=0.0, pins=3, seed=8)
    t4.rot(z=109.4).move(-2.6, -0.9, 0)

    # Drying rack: two lashed A-frames, a rail, and strips and a small hide hung to dry.
    with a.group() as rack:
        for x in (-1.0, 1.0):
            a.tube([(x, -0.36, 0), (x, 0.07, 1.46)], [0.05, 0.035], 5).color(POLE_DARK, POLE)
            a.tube([(x, 0.36, 0), (x, -0.07, 1.46)], [0.05, 0.035], 5).color(POLE_DARK, POLE)
            a.torus(0.065, 0.028, 8, 4).rot(y=90).move(x, 0, 1.24).color(CORD)
        rod(a, (-1.24, 0, 1.3), (1.24, 0, 1.3), 0.038, 6).color(POLE)
        for i, x in enumerate((-0.74, -0.5, -0.27, -0.04, 0.2)):
            length = 0.34 + 0.09 * ((i * 5) % 3)
            a.box(0.13, 0.045, length, bevel=0.014, taper=(0.55, 0.8)).rot(y=180, pivot=(0, 0, length / 2)).move(
                x, 0, 1.27 - length
            ).color("#8f4a36" if i % 2 else "#c27a5c", "#b56a4e" if i % 2 else "#d99878")
        a.prism([(-0.26, -0.02), (0.26, -0.02), (0.26, 0.02), (-0.26, 0.02)], 0.6, bevel=0.012).move(0.66, 0, 0.66).warp(
            lambda co: (co.x * (1.0 + 0.35 * abs((co.z - 0.96) / 0.3)), co.y, co.z)
        ).color(jk.shade(HIDE_CREAM, -0.12), HIDE_CREAM)
    rack.rot(z=-12).move(-0.55, -2.38, 0)

    # Rolled bundles, a basket and a little stack of firewood: everything packs up and moves on.
    bundle(a, 0.2, 0.95, HIDE_RUSSET).rot(z=8).move(0.2, 2.75, 0)
    bundle(a, 0.18, 0.86, HIDE_CREAM).rot(z=4).move(0.28, 3.14, 0)
    bundle(a, 0.17, 0.8, HIDE_TAN).rot(z=14).move(0.24, 2.95, 0.33)
    a.lathe([(0.17, 0), (0.25, 0.1), (0.27, 0.34), (0.24, 0.4), (0.19, 0.4), (0.19, 0.36)], 9).move(1.05, 2.5, 0).color(
        jk.shade(P.THATCH, -0.22), P.THATCH
    )
    a.torus(0.255, 0.03, 9, 4).move(1.05, 2.5, 0.39).color(jk.shade(P.THATCH, -0.3))
    for i, (y, z) in enumerate(((0.0, 0.07), (0.16, 0.07), (0.08, 0.2))):
        drum(a, (-1.62, 0.5 + y, z), (-1.02, 0.42 + y, z), 0.07, 6, bevel=0.012).color(P.BARK_DARK, P.BARK)
    for i, (x, y) in enumerate(((1.25, -0.45), (-1.4, -0.3), (0.9, 1.25), (-0.9, 1.55), (-1.75, -2.3), (1.2, -2.6))):
        tuft(a, x, y, 0, 1.0, P.OLIVE, seed=i)


def megalith(a, w, d, h, seed, level=False, low="#86827a", high="#b4b0a4"):
    """A hand-hewn standing stone: a chamfered slab, tapered, then roughened and faceted."""
    rng = random.Random(seed)
    piece = a.box(w, d, h, bevel=min(w, d) * 0.17, taper=(rng.uniform(0.7, 0.86), rng.uniform(0.72, 0.9)))
    piece.subdivide(1)
    slant = 0.0 if level else rng.uniform(-0.22, 0.22)
    lean = rng.uniform(-0.05, 0.05)
    piece.warp(lambda co: (co.x + lean * co.z, co.y, co.z + slant * co.x * (co.z / h) ** 2))
    piece.jitter(0.075 if not level else 0.055, seed=seed, scale=1.1)
    if level:
        piece.warp(lambda co: (co.x, co.y, h if co.z > h - 0.09 else co.z))
    piece.color(low, high).paint_up(jk.shade(high, 0.12), 0.75)
    return piece.flat()


@asset(
    "lm-stone-circle",
    tint="#ffffff",
    budget=4500,
    note="S4: a ritual ring of nine standing stones, two lintels and a low central stone. The gap faces the front.",
)
def stone_circle(a):
    grass, grass_dark, earth, packed = "#9fae62", "#88994f", "#b39d70", "#998560"
    ground = a.lathe([(4.9, 0), (4.78, 0.07), (4.25, 0.1), (3.5, 0.1), (1.9, 0.1), (1.3, 0.1), (0, 0.12)], 24, cap_bottom=False)

    def wobble(co):
        t = math.atan2(co.y, co.x)
        k = 1 + 0.02 * math.cos(3 * t + 1.0) * (math.hypot(co.x, co.y) / 4.9) ** 3
        return (co.x * k, co.y * k, co.z)

    def turf(co):
        r = math.hypot(co.x, co.y)
        if r > 4.85:
            return grass_dark
        if r > 4.0:
            return grass
        return earth if r > 1.5 else packed

    paint_by(ground.warp(wobble), turf)
    top = 0.085

    heights = {0: 2.12, 1: 2.12, 8: 2.12, 2: 1.72, 3: 2.42, 4: 1.86, 5: 1.98, 6: 1.36, 7: 2.26}
    widths = {0: 0.98, 1: 0.9, 8: 0.92, 2: 0.78, 3: 0.82, 4: 0.9, 5: 0.84, 6: 0.94, 7: 0.76}
    for i in range(9):
        deg = 90 + i * 40
        level = i in (0, 1, 8)
        with a.group() as stone:
            megalith(a, widths[i], 0.56 if level else 0.5 + 0.04 * (i % 3), heights[i], seed=11 + i * 3, level=level)
        stone.rot(z=deg - 90 + (0 if level else (i * 37) % 13 - 6)).move(*polar(3.8, deg, top - 0.05))
        tuft(a, *polar(3.8 - 0.42, deg + 5, top - 0.02)[:2], top - 0.02, 0.9, P.MOSS, seed=i)
        tuft(a, *polar(3.8 + 0.4, deg - 7, top - 0.02)[:2], top - 0.02, 1.0, grass_dark, seed=i + 4)
    # Two lintels meet over the tallest back stone.
    for mid, shift in ((70, -0.07), (110, 0.07)):
        lintel = a.box(2.74, 0.66, 0.44, bevel=0.085).subdivide(1).jitter(0.05, seed=mid, scale=1.0)
        lintel.warp(lambda co: (co.x, co.y, max(co.z, 0.0)))
        lintel.color("#8a867d", "#b9b5a9").paint_up("#c6c2b6", 0.75).flat()
        lintel.move(shift, 0, 0).rot(z=mid + 90).move(*polar(3.8 * math.cos(math.radians(20)), mid, top - 0.05 + 2.12))
    # The low central stone, bedded in packed earth and ringed by small kerb stones.
    slab = a.box(1.5, 1.02, 0.5, bevel=0.14, taper=(0.86, 0.8)).subdivide(1).jitter(0.06, seed=5, scale=1.2)
    slab.color("#7d7a72", "#a9a59a").paint_up("#b7b3a8", 0.75).flat()
    slab.rot(z=18).move(0, 0, top - 0.04)
    for i in range(9):
        t = i / 9 * TAU + 0.3
        a.blob(0.13 + 0.035 * ((i * 5) % 3), 1, (1.1, 0.9, 0.7), lumps=0.2, seed=80 + i).rot(z=i * 50).move(
            math.cos(t) * 1.42, math.sin(t) * 1.3, top + 0.05
        ).color("#7d7a72", "#a9a59a")


CONCRETE_LO, CONCRETE_HI = "#7f817c", "#a6a7a1"
MOSS_TOP = "#718a58"
MOSS_OLD = "#637f4c"
LEAF_LO, LEAF_HI = "#2c6331", "#4f8f44"
DARK_ROOM = "#2b2d2c"


def _rounded_square(t, half, power=7.0):
    """A point on a rounded square of half-width `half` at angle t."""
    c, s = math.cos(t), math.sin(t)
    return (
        half * math.copysign(abs(c) ** (2 / power), c),
        half * math.copysign(abs(s) ** (2 / power), s),
    )


def vine(a, half, z0, z1, t0, turns, r=0.06, steps=14, leaf=0.22, seed=1, every=2):
    """A vine winding around a square shaft, with clumps of leaves along it."""
    pts = []
    for i in range(steps + 1):
        k = i / steps
        x, y = _rounded_square(t0 + k * turns * TAU, half + r * 0.8)
        pts.append((x, y, z0 + (z1 - z0) * k + 0.12 * math.sin(k * 9 + seed)))
    a.tube(pts, [r * (1 - 0.45 * i / steps) for i in range(steps + 1)], 5).color("#3a5a2c", "#4f7d3a").flat()
    for i in range(1, steps + 1, every):
        x, y, z = pts[i]
        n = Vector((x, y, 0)).normalized() * 0.07
        leaves(a, (x + n.x, y + n.y, z), leaf * (0.8 + 0.4 * ((i * 7 + seed) % 3) / 2), seed=seed * 9 + i)


@asset(
    "lm-relic-tower",
    tint="#ffffff",
    budget=4500,
    note="S4: the leaning, overgrown concrete-and-steel shaft of a pre-collapse tower. Leans to the front right.",
)
def relic_tower(a):
    H1 = 4.0  # top of the intact lower shaft
    with a.group() as shaft:
        # ---- lower shaft: intact walls with rows of empty windows -------------------------
        lower = a.box(2.9, 2.9, H1 + 0.45, bevel=0.07).move(0, 0, -0.45).color(CONCRETE_LO, CONCRETE_HI)
        holes = []
        for face in range(4):
            for row, z in enumerate((1.02, 2.5)):
                for x in (-0.9, 0.0, 0.9):
                    if face == 0 and row == 0 and x == 0.0:
                        hole = jk.box(0.72, 0.6, 1.5, bevel=0).move(0, -1.45, 0.0)
                    else:
                        hole = jk.box(0.5, 0.56, 0.82, bevel=0).move(x, -1.45, z)
                    holes.append(hole.rot(z=90 * face))
        lower.cut(merged(holes, DARK_ROOM))
        a.box(3.12, 3.12, 0.24, bevel=0.05).move(0, 0, H1 - 0.02).color(CONCRETE_LO, CONCRETE_HI).paint_up(MOSS_TOP, 0.8)
        a.box(3.0, 3.0, 0.16, bevel=0.04).move(0, 0, 1.92).color("#75777a", "#8b8d88")

        # ---- upper shaft: the facade has fallen away and the floors stand open ------------
        z1, z2, z3 = H1 + 1.2, H1 + 2.4, H1 + 3.6
        slab1 = [(-1.45, -1.45), (0.45, -1.45), (0.8, -0.92), (1.45, -0.5), (1.45, 1.45), (-1.45, 1.45)]
        slab2 = [(-1.45, -1.02), (-0.4, -1.2), (0.12, -0.32), (1.0, 0.0), (1.45, 0.62), (1.45, 1.45), (-1.45, 1.45)]
        slab3 = [(-1.45, 0.1), (-0.3, 0.36), (0.22, 1.45), (-1.45, 1.45)]
        for pts, z, moss in ((slab1, z1, MOSS_OLD), (slab2, z2, MOSS_TOP), (slab3, z3, MOSS_TOP)):
            a.prism(pts, 0.22, bevel=0.045).move(0, 0, z).color(CONCRETE_LO, CONCRETE_HI).paint_up(moss, 0.8)
        f1 = H1 + 0.22
        columns = [
            (-1.25, 1.25, f1, z3), (1.25, 1.25, f1, z2), (-1.25, -1.25, f1, z1), (0.0, -1.25, f1, z1),
            (1.25, 0.0, f1, z1), (1.25, 0.72, z1 + 0.22, z2), (-1.25, 0.1, z1 + 0.22, z3), (0.0, 1.25, z2 + 0.22, z3),
            (-0.2, 0.2, f1, z2),
        ]
        for x, y, lo, hi in columns:
            a.box(0.3, 0.3, hi - lo, bevel=0.035).move(x, y, lo).color(CONCRETE_LO, CONCRETE_HI)
        # Broken column stubs with bent reinforcing bars.
        stubs = [(1.25, -1.25, f1, 0.62, 1), (-1.25, -1.25, z1 + 0.22, 0.5, 2), (1.25, 1.25, z2 + 0.22, 0.44, 3)]
        for x, y, z, h, seed in stubs:
            a.box(0.3, 0.3, h, bevel=0.035, taper=(0.8, 0.6)).move(x, y, z).color(CONCRETE_LO, CONCRETE_HI)
            for k in range(2):
                t = seed * 1.9 + k * 2.6
                dx, dy = math.cos(t) * 0.08, math.sin(t) * 0.08
                a.tube(
                    [(x + dx, y + dy, z + h - 0.05), (x + dx * 1.6, y + dy * 1.6, z + h + 0.3), (x + dx * 5, y + dy * 5, z + h + 0.52 - 0.1 * k)],
                    0.022, 4,
                ).color(P.RUST)
        # Wall remnants at the back and the left, with their window openings still framed.
        back = a.profile_y(
            [(-1.45, f1), (1.45, f1), (1.45, 6.25), (1.02, 6.5), (0.9, 7.15), (0.3, 7.0), (0.1, 7.95), (-0.8, 8.25), (-1.45, 8.0)],
            0.26, bevel=0.04,
        ).move(0, 1.32, 0).color(CONCRETE_LO, CONCRETE_HI)
        back.cut(merged([jk.box(0.5, 0.6, 0.72, bevel=0).move(x, 1.32, z) for x, z in ((-0.78, 4.52), (0.5, 4.52), (-0.78, 5.72), (0.45, 5.72), (-0.78, 6.92))], DARK_ROOM))
        left = a.profile_x(
            [(-1.45, f1), (1.19, f1), (1.19, 8.0), (0.6, 7.72), (0.3, 6.92), (-0.3, 6.82), (-0.6, 5.92), (-1.2, 5.62), (-1.45, 5.0)],
            0.26, bevel=0.04,
        ).move(-1.32, 0, 0).color(CONCRETE_LO, CONCRETE_HI)
        left.cut(merged([jk.box(0.6, 0.5, 0.72, bevel=0).move(-1.32, y, z) for y, z in ((-0.72, 4.52), (0.4, 4.52), (0.4, 5.72), (0.5, 6.92))], DARK_ROOM))
        # The lift core rises above everything, cracked off at the top.
        core = a.box(1.28, 1.4, 2.5, bevel=0.06, taper=(0.94, 0.9)).color(CONCRETE_LO, "#b0b1ab").paint_up(MOSS_OLD, 0.8)
        core.rot(x=-3, y=4).move(-0.56, 0.5, 6.42)
        a.box(0.5, 0.05, 0.9, bevel=0).move(-0.5, -0.215, 6.75).rot(x=-3, y=4, pivot=(-0.56, 0.5, 6.42)).color(DARK_ROOM).no_ao()
        # Steel: a floor beam hangs out of the break; another lies across the top slab.
        beam(a, (0.2, -0.4, z2 + 0.06), (1.55, -1.3, z2 - 0.3), 0.2, 0.16, bevel=0.02, side=(0, 0, 1)).color(jk.shade(P.RUST, -0.2), P.RUST)
        beam(a, (0.7, -1.0, z1 + 0.08), (1.75, -1.55, z1 - 0.1), 0.18, 0.14, bevel=0.02, side=(0, 0, 1)).color(jk.shade(P.RUST, -0.2), P.RUST)
        beam(a, (-1.3, 0.3, z3 + 0.3), (0.5, 0.75, z3 + 0.26), 0.16, 0.2, bevel=0.02, side=(0, 0, 1)).part("metal").color(P.STEEL_DARK)
        for x, y, z, dx, dy in ((0.62, -1.2, z1 + 0.11, 0.3, -0.5), (1.15, -0.7, z1 + 0.11, 0.5, -0.3), (-0.1, -0.7, z2 + 0.11, 0.2, -0.5), (0.6, -0.15, z2 + 0.11, 0.45, -0.35)):
            a.tube([(x - dx * 0.3, y - dy * 0.3, z), (x + dx * 0.5, y + dy * 0.5, z - 0.02), (x + dx, y + dy, z - 0.3)], 0.022, 4).color(P.RUST)

        # ---- overgrowth ------------------------------------------------------------------
        vine(a, 1.45, 0.1, 3.9, 2.3, 1.1, r=0.075, steps=14, leaf=0.28, seed=2, every=3)
        vine(a, 1.45, 0.3, 4.3, 5.4, 0.7, r=0.06, steps=10, leaf=0.25, seed=5, every=3)
        # Curtains of creeper hang from the open floors.
        for x, y, z, drop, seed in ((-0.95, -1.47, z1, 0.95, 1), (1.47, 0.9, z1, 0.8, 3), (-1.2, -1.04, z2, 0.75, 4), (1.47, 1.1, z2, 0.55, 6)):
            a.tube([(x, y, z + 0.2), (x * 1.02, y * 1.02, z - drop * 0.5), (x, y, z - drop)], [0.04, 0.032, 0.02], 4).color("#3a5a2c", "#4f7d3a").flat()
            leaves(a, (x, y, z + 0.2), 0.24, seed=seed + 20)
            leaves(a, (x, y, z - drop), 0.17, seed=seed + 30)
        # Ivy masses cling where the light is good.
        leaves(a, (-1.5, 1.45, 2.3), 0.62, seed=41, squash=0.9, subdiv=2)
        leaves(a, (-1.55, 0.2, 6.0), 0.5, seed=42, squash=1.0, subdiv=1)
        leaves(a, (0.3, 1.5, 6.6), 0.46, seed=43, squash=0.9, subdiv=1)
        leaves(a, (0.7, 0.9, z2 + 0.4), 0.42, seed=44, low="#35713a", high="#62994c")
        leaves(a, (-0.6, -0.6, z1 + 0.42), 0.36, seed=45, low="#35713a", high="#62994c")
        # A tree has taken the top of the lift core, its roots feeling down the concrete.
        tx, ty, tz = -0.4, 0.42, 8.88
        a.tube([(tx, ty, tz - 0.1), (tx + 0.05, ty, tz + 0.5), (tx + 0.16, ty - 0.04, tz + 1.1)], [0.2, 0.14, 0.1], 7).color(
            P.BARK_DARK, P.BARK
        ).flat()
        parts.canopy(
            a,
            [(tx + 0.16, ty, tz + 1.5, 0.86, 0.86), (tx + 0.68, ty + 0.12, tz + 1.26, 0.52, 0.8), (tx - 0.42, ty - 0.2, tz + 1.3, 0.56, 0.8), (tx + 0.2, ty + 0.36, tz + 1.96, 0.46, 0.84)],
            seed=6, part="base", low=LEAF_LO, high=LEAF_HI,
        )
        for dx, dy, drop in ((0.5, -0.5, 1.3), (-0.5, -0.45, 1.0), (0.42, 0.5, 0.8)):
            a.tube([(tx, ty, tz - 0.02), (tx + dx, ty + dy, tz - 0.06), (tx + dx * 1.25, ty + dy * 1.3, tz - drop * 0.5), (tx + dx * 1.15, ty + dy * 1.32, tz - drop)], [0.09, 0.075, 0.055, 0.03], 5).color(
                P.BARK_DARK, P.BARK
            ).flat()
        # A second tree leans out of the broken corner; its roots run down the shaft to the ground.
        bx, by, bz = 1.12, -1.12, f1
        a.tube([(bx, by, bz - 0.06), (bx + 0.22, by - 0.22, bz + 0.6), (bx + 0.36, by - 0.4, bz + 1.25)], [0.19, 0.13, 0.09], 7).color(
            P.BARK_DARK, P.BARK
        ).flat()
        parts.canopy(
            a,
            [(bx + 0.42, by - 0.46, bz + 1.72, 0.72, 0.84), (bx + 0.82, by - 0.2, bz + 1.4, 0.44, 0.8), (bx + 0.14, by - 0.86, bz + 1.46, 0.46, 0.8)],
            seed=9, part="base", low="#2a5c30", high="#5b9449",
        )
        roots = [
            [(bx, by, bz), (1.18, -1.56, bz - 0.12), (0.98, -1.55, 2.8), (1.22, -1.56, 1.4), (0.92, -1.58, 0.3), (1.0, -2.15, -0.2)],
            [(bx, by, bz), (1.56, -0.95, bz - 0.12), (1.55, -0.5, 2.6), (1.56, -0.92, 1.2), (1.6, -0.42, 0.25), (2.25, -0.3, -0.2)],
            [(0.98, -1.55, 2.8), (0.5, -1.55, 1.7), (0.26, -1.57, 0.4), (0.1, -2.1, -0.2)],
            [(1.55, -0.5, 2.6), (1.56, 0.1, 1.5), (1.58, 0.42, 0.3), (2.1, 0.72, -0.2)],
        ]
        for pts in roots:
            n = len(pts)
            a.tube(pts, [0.12 - 0.05 * i / (n - 1) for i in range(n)], 6).color("#4a3526", P.BARK).flat()
    shaft.rot(x=5, y=5).rot(z=17)

    # ---- at the foot: fallen concrete, a dropped beam and brush ---------------------------
    rubble = [
        (-1.5, -2.6, 1.3, 0.3, 0.86, (62, 8, 24), 1), (-2.35, -1.5, 0.7, 0.6, 0.5, (10, 14, 50), 2),
        (2.2, -2.5, 0.6, 0.5, 0.44, (8, -12, 20), 3), (-1.2, 2.75, 0.9, 0.7, 0.5, (-12, 6, 70), 4),
        (1.0, 2.95, 0.62, 0.5, 0.4, (14, 10, 15), 5), (2.5, 1.9, 0.76, 0.56, 0.46, (-8, -14, 40), 6),
        (-0.3, -3.0, 0.5, 0.42, 0.34, (6, 18, 80), 7),
    ]
    for x, y, w, d, h, (rx, ry, rz), seed in rubble:
        a.box(w, d, h, bevel=0.06, taper=(0.82, 0.74)).color("#777974", "#a09f99").paint_up(
            MOSS_TOP if seed % 2 else "#a6a7a1", 0.8
        ).rot(x=rx, y=ry, z=rz).move(x, y, -0.1)
    beam(a, (-2.7, -2.3, 0.06), (-1.9, -3.2, 0.22), 0.18, 0.14, bevel=0.02, side=(0, 0, 1)).color(jk.shade(P.RUST, -0.2), P.RUST)
    leaves(a, (-2.2, 2.2, 0.26), 0.44, seed=51, squash=0.8)
    leaves(a, (2.55, -1.3, 0.22), 0.36, seed=52, squash=0.8, low="#35713a", high="#62994c")
    leaves(a, (0.4, 3.1, 0.2), 0.32, seed=53, squash=0.8)
    for i, (x, y) in enumerate(((-2.8, -0.4), (-0.9, -2.2), (2.7, 0.6), (1.7, 2.6), (-2.0, 1.2), (0.6, -3.1))):
        tuft(a, x, y, -0.02, 1.4, P.MOSS, seed=i)


# --------------------------------------------------------------------------------------------
# Shared forms for S5 and S6
# --------------------------------------------------------------------------------------------
def hoop(a, profile, sides=16, turn=0.0):
    """Revolve a CLOSED profile of (radius, z) points about z: rims, collars, ring housings."""
    n = len(profile)
    verts = [
        (math.cos(turn + i / sides * TAU) * r, math.sin(turn + i / sides * TAU) * r, z)
        for r, z in profile
        for i in range(sides)
    ]
    faces = []
    for k in range(n):
        k2 = (k + 1) % n
        for i in range(sides):
            j = (i + 1) % sides
            faces.append((k * sides + i, k * sides + j, k2 * sides + j, k2 * sides + i))
    return a.raw(verts, faces)


def band(a, r, z0, z1, sides=16, proud=0.03, turn=0.0):
    """A belt standing `proud` of a round body of radius r between z0 and z1."""
    e = min(proud, (z1 - z0) * 0.3)
    return a.lathe([(r, z0), (r + proud, z0 + e), (r + proud, z1 - e), (r, z1)], sides, cap_bottom=False, cap_top=False, turn=turn)


def radius_at(profile, z):
    """Radius of a (radius, z) profile at height z."""
    for (r0, z0), (r1, z1) in zip(profile, profile[1:]):
        if z0 <= z <= z1 and z1 > z0:
            return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    return profile[-1][0] if z > profile[-1][1] else profile[0][0]


def spline(points, steps=3):
    """Round a polyline: Catmull-Rom points through every given point, `steps` per span."""
    pts = [Vector(p) for p in points]
    last = len(pts) - 1
    out = []
    for i in range(last):
        p0, p1, p2, p3 = pts[max(0, i - 1)], pts[i], pts[i + 1], pts[min(last, i + 2)]
        for k in range(steps):
            t = k / steps
            out.append(
                0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t**3)
            )
    out.append(pts[-1])
    return out


def sinew(a, points, radii, sides=6, steps=3, caps="flat"):
    """A grown limb: a tube through `points`, rounded into a curve, its radii following along."""
    path = spline(points, steps)
    last = len(points) - 1
    thick = []
    for i in range(len(path)):
        f = min(i / steps, last)
        k = min(int(f), last - 1)
        thick.append(radii[k] + (radii[k + 1] - radii[k]) * (f - k))
    return a.tube(path, thick, sides, caps=caps)


def bez(p, t):
    """A point on a cubic Bezier of four 2D control points."""
    u = 1 - t
    return tuple(u**3 * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t**3 * p[3][k] for k in range(2))


def petal(a, spine, width, cup=0.25, thick=0.12, rows=5, cols=4, base=0.34):
    """A fleshy petal growing from the origin along +x and arching in the xz plane.

    `spine` is four Bezier control points (reach, rise). The blade is widest past its middle,
    cupped toward its upper face, thick along the midrib and sharp at the edge.
    """

    def share(t):
        if t < 0.6:
            return base + (1 - base) * math.sin(t / 0.6 * math.pi / 2)
        return math.cos((t - 0.6) / 0.4 * math.pi / 2) ** 0.75

    verts, top, bottom = [], [], []
    for i in range(rows):
        t = i / rows
        x, z = bez(spine, t)
        xa, za = bez(spine, max(0.0, t - 0.02))
        xb, zb = bez(spine, min(1.0, t + 0.02))
        length = math.hypot(xb - xa, zb - za) or 1.0
        nx, nz = -(zb - za) / length, (xb - xa) / length
        half = width / 2 * share(t)
        trow, brow = [], []
        for j in range(cols + 1):
            v = j / cols * 2 - 1
            lift = cup * half * v * v
            p = (x + nx * lift, v * half, z + nz * lift)
            trow.append(len(verts))
            verts.append(p)
            if 0 < j < cols:
                depth = thick * (1 - v * v) * (1 - 0.6 * t)
                brow.append(len(verts))
                verts.append((p[0] - nx * depth, p[1], p[2] - nz * depth))
            else:
                brow.append(trow[-1])
        top.append(trow)
        bottom.append(brow)
    tip = len(verts)
    x, z = bez(spine, 1.0)
    verts.append((x, 0.0, z))
    faces = []
    for i in range(rows - 1):
        for j in range(cols):
            faces.append((top[i][j], top[i][j + 1], top[i + 1][j + 1], top[i + 1][j]))
            faces.append((bottom[i][j], bottom[i + 1][j], bottom[i + 1][j + 1], bottom[i][j + 1]))
    for j in range(cols):
        faces.append((top[rows - 1][j], top[rows - 1][j + 1], tip))
        faces.append((bottom[rows - 1][j + 1], bottom[rows - 1][j], tip))
    faces.append(tuple(top[0]) + tuple(reversed(bottom[0][1:-1])))
    return a.raw(verts, faces)


# --------------------------------------------------------------------------------------------
# S5 · Transhumanism
# --------------------------------------------------------------------------------------------
BONE, BONE_DEEP, BONE_DARK = "#f1e9f6", "#cdbfd8", "#a997b8"
MEMBRANE_LO, MEMBRANE_HI = "#b548ad", "#ee9bd9"
GLOW_MINT, GLOW_PINK = "#b8fff0", "#ffb8f0"
SOIL, SOIL_HI = "#4b3b49", "#6a5565"
POOL = "#34bfae"


def bulb_in_cup(a, p, s, glow):
    """A luminous bulb seated in a small grown cup at p."""
    x, y, z = p
    a.lathe([(0.1 * s, 0.0), (0.3 * s, 0.08 * s), (0.4 * s, 0.36 * s)], 8, cap_top=False).move(x, y, z).color(BONE_DEEP, BONE)
    a.lathe(
        [(0.0, 0.06 * s), (0.27 * s, 0.2 * s), (0.35 * s, 0.5 * s), (0.27 * s, 0.86 * s), (0.1 * s, 1.1 * s), (0.0, 1.18 * s)], 8
    ).move(x, y, z).part("glow").color(glow)


@asset(
    "lm-bloom-spire",
    tint="#d35fc4",
    budget=4500,
    note="S5: a living tower. A fluted trunk, a lantern cage of three boughs and a two-ring petal crown; petals are the tint. Portal faces the front.",
)
def bloom_spire(a):
    twist = math.radians(8)
    phase = math.radians(-120)
    step = TAU / 12
    # ---- the trunk: six ribs that flare into buttresses and run out as roots ---------------
    trunk = a.lathe(
        [(1.0, 0.0), (0.99, 0.16), (0.97, 0.42), (0.94, 0.78), (0.9, 1.22), (0.85, 1.75), (0.8, 2.35), (0.79, 2.8), (0.84, 3.05), (0.96, 3.25)],
        12, turn=phase, cap_bottom=False, cap_top=False,
    )

    def grow(co):
        r = math.hypot(co.x, co.y)
        t = math.atan2(co.y, co.x)
        flare = max(0.0, 1 - co.z / 1.75) ** 2.2
        rib = round((t - phase) / step) % 2 == 0
        s = 1.0 + 1.0 * flare if rib else 0.74 + 0.16 * flare
        t += twist * co.z
        return (math.cos(t) * r * s, math.sin(t) * r * s, co.z)

    trunk.warp(grow).color(BONE_DEEP, BONE)
    for k in range(6):
        az = -120 + 60 * k
        long = k % 2 == 0
        reach = 2.52 if long else 2.45
        pts = [polar(1.5, az, 0.2), polar(1.95, az - 2, 0.15), polar(2.25, az - 8, 0.13)]
        radii = [0.2, 0.2, 0.16]
        if long:
            # The long roots surface again as a bud of the same bloom.
            tip = polar(reach, az - 15, 0.2)
            sinew(a, pts + [tip], radii + [0.13], 5, 2).color(BONE_DARK, BONE)
            a.lathe([(0.14, 0.0), (0.34, 0.1), (0.42, 0.34)], 8, cap_top=False).move(*tip).color(BONE_DEEP, BONE)
            a.lathe([(0.0, 0.05), (0.3, 0.18), (0.38, 0.44), (0.3, 0.74), (0.13, 0.94)], 8).move(*tip).part("tint").color(P.SHADE_2, P.WHITE)
            a.lathe([(0.13, 0.93), (0.11, 1.04), (0.0, 1.18)], 6, cap_bottom=False).move(*tip).part("glow").color(GLOW_PINK)
        else:
            sinew(a, pts + [polar(reach, az + 6, 0.02), polar(reach + 0.3, az + 14, -0.06)], radii + [0.11, 0.04], 5, 2).color(BONE_DARK, BONE)
    # A lit porch between two buttresses gives the tower its scale.
    with a.group() as portal:
        a.profile_y([(-0.36, 0), (0.36, 0), (0.36, 0.64), (0.23, 0.92), (0, 1.03), (-0.23, 0.92), (-0.36, 0.64)], 0.62, bevel=0.06).color(BONE_DEEP, BONE)
        a.profile_y([(-0.22, 0.05), (0.22, 0.05), (0.22, 0.6), (0.13, 0.78), (0, 0.85), (-0.13, 0.78), (-0.22, 0.6)], 0.04, bevel=0).move(
            0, -0.31, 0
        ).part("glow").color(GLOW_PINK, "#fff0fa")
    portal.rot(x=-7).move(0, -1.04, 0.0)

    # ---- lower rib junction: a collar, a ruff of leaves and three bulb stalks -------------
    hoop(a, [(0.9, 3.1), (1.1, 3.2), (1.1, 3.42), (0.9, 3.52)], 12).color(BONE_DEEP, BONE)
    a.lathe([(0.95, 3.4), (0.86, 3.66), (0.5, 3.9), (0.0, 3.98)], 12, cap_bottom=False).color(BONE_DEEP, BONE)
    for k in range(6):
        petal(a, [(0, 0), (0.45, 0.46), (1.1, 0.46), (1.58, -0.3)], 1.02, cup=0.34, thick=0.13, rows=4, cols=4).part("tint").color(
            P.SHADE_2, P.WHITE, "x"
        ).move(0.92, 0, 3.24).rot(z=60 * k)
    for k in range(3):
        s = -30 + 120 * k
        tip = polar(2.34, s - 8, 4.62)
        sinew(a, [polar(0.85, s, 3.5), polar(1.62, s, 3.6), polar(2.2, s - 6, 3.98), tip], [0.17, 0.14, 0.12, 0.11], 6, 2).color(BONE_DEEP, BONE)
        bulb_in_cup(a, (tip[0], tip[1], tip[2] - 0.04), 0.95, GLOW_PINK)

    # ---- the lantern: three boughs bow apart around a hanging light and meet again --------
    for k in range(3):
        pts, radii = [], []
        for i in range(9):
            t = i / 8
            pts.append(polar(0.5 + 0.88 * math.sin(math.pi * t) ** 0.85, 30 + 120 * k + 60 * t, 3.6 + 3.32 * t))
            radii.append(0.3 - 0.08 * math.sin(math.pi * t))
        a.tube(pts, radii, 7).color(BONE_DEEP, BONE)
    a.tube([(0, 0, 6.95), (0, 0, 6.5)], 0.1, 6).color(BONE_DEEP)
    a.lathe([(0.0, 4.2), (0.36, 4.38), (0.66, 4.85), (0.74, 5.4), (0.62, 5.95), (0.3, 6.4), (0.1, 6.6)], 10).part("glow").color(
        "#8ff2df", GLOW_MINT
    )
    a.lathe([(0.66, 5.84), (0.64, 6.05), (0.38, 6.42), (0.1, 6.64)], 10, cap_bottom=False).color(BONE_DEEP, BONE)

    # ---- upper rib junction and the crown -------------------------------------------------
    a.lathe([(0.3, 6.66), (0.6, 6.9), (0.72, 7.15), (0.62, 7.42), (0.5, 7.56), (0.62, 7.7), (0.66, 7.86), (0.3, 8.0)], 12).color(BONE_DEEP, BONE)
    hoop(a, [(0.66, 7.02), (0.84, 7.1), (0.84, 7.26), (0.66, 7.34)], 12).color(BONE_DEEP, BONE)
    for k in range(7):
        petal(a, [(0, 0), (0.4, -0.04), (0.8, 0.1), (1.05, 0.42)], 0.64, cup=0.2, thick=0.1, rows=3, cols=2).color(BONE_DARK, BONE, "x").move(
            0.52, 0, 7.6
        ).rot(z=360 / 7 * k)
    for k in range(7):
        petal(a, [(0, 0), (0.9, 0.1), (1.9, 0.55), (2.42, 1.55)], 1.55, cup=0.3, thick=0.15, rows=5, cols=4).part("tint").color(
            P.SHADE_2, P.WHITE, "x"
        ).move(0.5, 0, 7.72).rot(z=360 / 7 * (k + 0.5))
    for k in range(5):
        petal(a, [(0, 0), (0.55, 0.35), (1.1, 1.2), (1.2, 2.3)], 1.16, cup=0.3, thick=0.13, rows=5, cols=4).part("tint").color(
            P.SHADE_1, P.WHITE, "x"
        ).move(0.3, 0, 7.9).rot(z=72 * k + 18)
    a.lathe([(0.0, 7.95), (0.28, 8.1), (0.42, 8.6), (0.4, 9.3), (0.26, 10.1), (0.1, 10.75), (0.0, 11.0)], 10).part("glow").color(
        "#8ff2df", GLOW_MINT
    )


def wedge(phi, u, s, z=0.0):
    """A point in a hexagon's wedge: u out along its mid-line (bearing phi degrees), s across it."""
    c, sn = math.cos(math.radians(phi)), math.sin(math.radians(phi))
    return (c * u - sn * s, sn * u + c * s, z)


@asset(
    "lm-garden-cell",
    tint="#96d64a",
    budget=3200,
    note="S5: one hexagonal cell of the designed patchwork (corners on +-x). Crops and lily pads are the tint.",
)
def garden_cell(a):
    floor = 0.3
    # ---- the grown kerb, the bed and six ribs running to a central node --------------------
    a.lathe(
        [(5.0, 0.0), (5.0, 0.2), (4.88, 0.46), (4.7, 0.58), (4.46, 0.58), (4.3, 0.46), (4.26, 0.24)], 6, cap_bottom=False, cap_top=False
    ).color(BONE_DEEP, BONE)
    a.cyl(4.3, floor, 6, bevel=0, grounded=True).color(SOIL)
    for k in range(6):
        deg = 60 * k
        a.tube([polar(0.8, deg, 0.5), polar(2.6, deg, 0.36), polar(4.5, deg, 0.47)], [0.2, 0.15, 0.2], 6).color(BONE_DEEP, BONE)
        a.lathe([(0.3, 0.0), (0.42, 0.14), (0.42, 0.5), (0.3, 0.68), (0.12, 0.76), (0.0, 0.77)], 8).move(*polar(4.6, deg, 0.1)).color(
            BONE_DEEP, BONE
        )

    # ---- three crop wedges: ridged rows parallel to the kerb, each wedge its own crop ------
    for n, phi in enumerate((270, 30, 150)):
        for row, u in enumerate((1.5, 2.3, 3.1)):
            half = u * math.tan(math.radians(30)) - 0.32
            a.box(2 * half, 0.5, 0.24, bevel=0.08).rot(z=phi + 90).move(*wedge(phi, u, 0, floor - 0.04)).color(SOIL, SOIL_HI)
            count = (2, 3, 5)[row]
            for i in range(count):
                s = (i - (count - 1) / 2) * (2 * half - 0.5) / max(1, count - 1)
                x, y, z = wedge(phi, u, s, floor + 0.2)
                seed = n * 31 + row * 7 + i
                if n == 0:
                    # Round heads.
                    a.blob(0.29, 1, (1, 1, 0.82), lumps=0.2, seed=seed).move(x, y, z + 0.14).part("tint").color(P.SHADE_2, P.WHITE)
                elif n == 1:
                    # Spears.
                    a.cyl(0.17, 0.78 + 0.1 * ((i + row) % 2), 5, r2=0, bevel=0).rot(z=seed * 23).move(x, y, z - 0.04).part("tint").color(
                        P.SHADE_3, P.WHITE
                    ).flat()
                else:
                    # Bushy stalks: two heads on a stem.
                    a.blob(0.24, 1, (1, 1, 1.0), lumps=0.2, seed=seed).move(x, y, z + 0.16).part("tint").color(P.SHADE_3, P.SHADE_1)
                    a.blob(0.18, 1, (1, 1, 1.1), lumps=0.2, seed=seed + 3).move(x + 0.03, y - 0.02, z + 0.46).part("tint").color(
                        P.SHADE_1, P.WHITE
                    )

    # ---- three pools with lily pads --------------------------------------------------------
    for n, phi in enumerate((90, 210, 330)):
        u0, u1 = 1.25, 3.68
        h0, h1 = (u * math.tan(math.radians(30)) - 0.14 for u in (u0, u1))
        a.prism([wedge(phi, u0, -h0)[:2], wedge(phi, u1, -h1)[:2], wedge(phi, u1, h1)[:2], wedge(phi, u0, h0)[:2]], 0.17, bevel=0.02).move(
            0, 0, floor - 0.01
        ).part("glass").color(POOL)
        pads = ((2.15, 0.3, 0.34), (2.95, -0.75, 0.3), (3.15, 0.85, 0.26), (2.75, 0.1, 0.2))
        for i, (u, s, r) in enumerate(pads[n % 2 : n % 2 + 3]):
            x, y, z = wedge(phi, u, s if n != 1 else -s, floor + 0.16)
            a.cyl(r, 0.055, 7, bevel=0.018).rot(z=i * 40 + n * 17).move(x, y, z).part("tint").color(P.SHADE_1, P.WHITE)
            if i == 0:
                a.lathe([(0.0, 0.0), (0.1, 0.06), (0.12, 0.17), (0.06, 0.3), (0.0, 0.36)], 6).move(x, y, z + 0.05).part("glow").color(GLOW_PINK)

    # ---- the node: a hub where the ribs meet, a stem and a light held by three prongs ------
    a.lathe([(1.14, 0.26), (1.04, 0.5), (0.8, 0.7), (0.48, 0.84), (0.32, 1.0)], 12, cap_bottom=False, cap_top=False).color(BONE_DEEP, BONE)
    a.tube([(0, 0, 0.95), (0, 0, 1.78)], [0.27, 0.19], 8).color(BONE_DEEP, BONE)
    band(a, 0.24, 1.26, 1.4, 8, proud=0.06).color(BONE)
    for k in range(3):
        deg = 30 + 120 * k
        a.tube([polar(0.16, deg, 1.62), polar(0.5, deg, 1.94), polar(0.5, deg, 2.34), polar(0.3, deg, 2.64)], [0.11, 0.09, 0.07, 0.04], 5).color(
            BONE_DEEP, BONE
        )
    a.lathe([(0.0, 1.7), (0.3, 1.82), (0.42, 2.1), (0.36, 2.4), (0.16, 2.66), (0.0, 2.78)], 9).part("glow").color("#8ff2df", GLOW_MINT)


POD_SHAPE = [(0.0, 0.0), (0.36, 0.035), (0.74, 0.17), (0.96, 0.38), (1.0, 0.54), (0.9, 0.71), (0.68, 0.85), (0.4, 0.95), (0.18, 1.0)]


def growth_pod(a, R, H, ribs=5, split=0.05, twist=0.5):
    """A growth pod standing on the origin: membranes between bone ribs, a glowing seam down
    each membrane where it will open, a scalloped calyx below and a puckered crown above.
    `split` is the widest half-angle of the seams (radians); `twist` turns the pod as it rises.
    """
    start = len(a.pieces)
    sides = ribs * 2
    step = TAU / sides

    def spin(co):
        t = twist * co.z / H
        c, s = math.cos(t), math.sin(t)
        return (co.x * c - co.y * s, co.x * s + co.y * c, co.z)

    a.lathe([(r * R, z * H) for r, z in POD_SHAPE], sides).warp(spin).part("glass").color(MEMBRANE_LO, MEMBRANE_HI)
    for k in range(ribs):
        az = 2 * k * step
        c, s = math.cos(az), math.sin(az)
        shape = POD_SHAPE[1:]
        pts = [(c * r * R, s * r * R, z * H) for r, z in shape]
        radii = [R * (0.085 - 0.04 * i / (len(shape) - 1)) for i in range(len(shape))]
        a.tube(pts, radii, 4).warp(spin).color(BONE_DEEP, BONE)
        # The seam rides the crease of the membrane, widest at the pod's waist.
        mid = az + step
        rows = POD_SHAPE[1:-1]
        verts, faces = [], []
        for i, (r, z) in enumerate(rows):
            w = split * math.sin(math.pi * (i + 0.6) / (len(rows) + 0.2)) + 0.012
            edge = r * R * math.cos(step) / math.cos(step - w) + 0.018 * R + 0.006
            for ang, rad in ((mid - w, edge), (mid, r * R * 1.02 + 0.006), (mid + w, edge)):
                verts.append((math.cos(ang) * rad, math.sin(ang) * rad, z * H))
        for i in range(len(rows) - 1):
            q = i * 3
            faces += [(q, q + 1, q + 4, q + 3), (q + 1, q + 2, q + 5, q + 4)]
        a.raw(verts, faces).warp(spin).part("glow").color("#7fecd8", GLOW_MINT).no_ao()
    # Calyx: its points run up into the ribs.
    cup = a.lathe([(0.1 * R, -0.03 * H), (0.52 * R, 0.02 * H), (0.84 * R, 0.165 * H), (0.99 * R, 0.3 * H)], sides, cap_top=False)

    def scallop(co):
        if co.z < 0.1 * H:
            return co
        k = round(math.atan2(co.y, co.x) / step)
        drop = 0.0 if k % 2 == 0 else (0.11 if co.z > 0.25 * H else 0.03) * H
        return (co.x * 1.03, co.y * 1.03, co.z - drop)

    cup.warp(scallop).warp(spin).color(BONE_DARK, BONE)
    a.lathe([(0.2 * R, 0.965 * H), (0.25 * R, 1.0 * H), (0.13 * R, 1.045 * H), (0.0, 1.06 * H)], sides, cap_bottom=False).color(BONE_DEEP, BONE)
    return parts.grouped(a, start)


def tendril(a, pts, r0, r1, sides=5, steps=2):
    """A supply tendril: a tapering, winding tube through `pts`; 2D points hug the ground."""
    n = len(pts)
    radii = [r0 + (r1 - r0) * i / (n - 1) for i in range(n)]
    path = [(p[0], p[1], p[2] if len(p) > 2 else radii[i] * 0.55) for i, p in enumerate(pts)]
    return sinew(a, path, radii, sides, steps).color(BONE_DARK, BONE_DEEP)


@asset(
    "lm-seed-pods",
    tint="#ffffff",
    budget=4500,
    note="S5: three growth pods of different ages on stalks, fed by tendrils. The ripening pod leans to the front.",
)
def seed_pods(a):
    # base on the ground, where the pod sits on its stalk, pod radius and height, seam width
    pods = (
        ((-0.3, 0.5), (-0.15, 0.35, 1.25), (-0.1, 0.3, 2.25), 1.12, 2.86, 0.045),
        ((0.7, -1.5), (1.0, -2.25, 0.98), (1.3, -2.85, 1.98), 0.85, 2.12, 0.13),
        ((0.5, 2.2), (0.75, 2.72, 0.72), (0.98, 3.3, 1.7), 0.62, 1.58, 0.03),
    )
    for n, (foot, seat, aim, R, H, split) in enumerate(pods):
        fx, fy = foot
        seat_v, aim_v = Vector(seat), Vector(aim)
        axis = (aim_v - seat_v).normalized()
        # Root crown and stalk, with one swollen joint.
        a.lathe([(0.78 * R, 0.0), (0.56 * R, 0.1 * R), (0.36 * R, 0.34 * R)], 9, cap_bottom=False, cap_top=False).move(fx, fy, 0).color(
            BONE_DARK, BONE_DEEP
        )
        knee = Vector((fx, fy, 0)).lerp(seat_v, 0.5) + Vector((0, 0, 0.12 * R)) - axis * 0.1 * R
        a.tube([(fx, fy, 0.0), knee, seat_v - axis * 0.12 * R, seat_v + axis * 0.05 * R], [0.34 * R, 0.25 * R, 0.24 * R, 0.3 * R], 8).color(
            BONE_DEEP, BONE
        )
        a.sphere(0.31 * R, 8, 4, (1, 1, 0.7)).move(*knee).color(BONE_DEEP, BONE)
        m, _ = _frame(seat_v, seat_v + axis)
        growth_pod(a, R, H, split=split, twist=0.5 if n != 1 else -0.4).apply(m)
        # Feed vines wind up the stalk and into the calyx.
        e1 = Vector((m[0][0], m[1][0], m[2][0]))
        e2 = Vector((m[0][1], m[1][1], m[2][1]))
        spine = [Vector((fx, fy, 0.0)), knee, seat_v]
        for v in range(2 if n < 2 else 1):
            pts = []
            for i in range(6):
                t = i / 5
                c = spine[0].lerp(spine[1], t * 2) if t < 0.5 else spine[1].lerp(spine[2], t * 2 - 1)
                ang = v * math.pi + n * 1.3 + t * 4.4
                rho = (0.42 - 0.12 * t) * R
                pts.append(c + (e1 * math.cos(ang) + e2 * math.sin(ang)) * rho)
            for up, out in ((0.09, 0.74), (0.2, 0.95)):
                ang = v * math.pi + n * 1.3 + 4.4 + up * 2.2
                pts.append(seat_v + axis * up * H + (e1 * math.cos(ang) + e2 * math.sin(ang)) * out * R)
            pts[0].z = 0.02
            sinew(a, pts, [0.085 * R] * 3 + [0.07 * R] * 3 + [0.06 * R, 0.045 * R], 4, 2).color(BONE_DARK, BONE)

    # ---- supply tendrils --------------------------------------------------------------------
    # Thick runners join the three stalks, each with a pumping node.
    for pts, node in (
        ([(-0.1, 0.05), (0.5, -0.45), (0.28, -1.0), (0.62, -1.38)], (0.44, -0.6)),
        ([(-0.2, 0.9), (0.38, 1.3), (0.12, 1.78), (0.45, 2.08)], (0.32, 1.42)),
    ):
        tendril(a, pts, 0.2, 0.18, 6)
        a.sphere(0.29, 8, 4, (1, 1, 0.8)).move(node[0], node[1], 0.17).color(BONE_DEEP, BONE)
        a.sphere(0.1, 6, 3).move(node[0], node[1], 0.4).part("glow").color(GLOW_MINT)
    # Roots wind out to the edge of the plot.
    for pts in (
        [(-0.75, 0.45), (-1.3, 0.8), (-1.75, 0.4), (-2.2, 0.25)],
        [(-0.55, 0.95), (-0.85, 1.55), (-1.45, 1.55), (-1.65, 2.15)],
        [(-0.6, 0.05), (-1.2, -0.25), (-1.2, -0.95), (-1.62, -1.32)],
        [(1.2, -1.4), (1.75, -1.05), (2.25, -1.5), (2.72, -1.6)],
        [(0.35, -1.85), (-0.15, -2.2), (-0.15, -2.95), (-0.7, -3.35)],
        [(1.0, -1.95), (1.6, -2.4), (1.4, -3.25), (1.85, -4.0)],
        [(0.95, 2.3), (1.5, 2.8), (2.0, 2.4), (2.65, 2.72)],
        [(0.3, 2.7), (-0.15, 3.05), (-0.15, 3.65), (-0.65, 4.05)],
    ):
        tendril(a, pts, 0.17, 0.04)
    # A few roots end in a sprout that will be the next pod.
    for x, y in ((-2.2, 0.25), (2.72, -1.6), (-0.65, 4.05)):
        a.lathe([(0.0, 0.0), (0.13, 0.08), (0.16, 0.24), (0.09, 0.4), (0.0, 0.48)], 6).move(x, y, 0.0).part("glow").color("#7fecd8", GLOW_MINT)


# --------------------------------------------------------------------------------------------
# S6 · Sword of Damocles
# --------------------------------------------------------------------------------------------
PLATE_DARK, PLATE_LO, PLATE_HI = "#3f454d", "#59616c", "#788390"
HOUSING_LO, HOUSING_HI = "#97a3ae", "#c8d2db"
PIPE_LO, PIPE_HI = "#94703c", "#c49c58"
SHAFT_LO, SHAFT_HI = "#969da2", "#bcc2c5"
AMBER, AMBER_HOT, WARN = "#ffb03a", "#ffd88a", "#ff5a3a"
VOID = "#23272c"


def flange(a, p0, p1, r, sides=8, colour=PLATE_DARK):
    """A bolted pipe flange or port collar between p0 and p1."""
    return drum(a, p0, p1, r, sides, bevel=0).color(colour, jk.shade(colour, 0.16))


def hand_wheel(a, p, r=0.27, axis=(0, 0, 1), colour=P.RED):
    """A valve hand wheel centred on p and turning about `axis`: rim, crossed spokes and hub."""
    start = len(a.pieces)
    a.torus(r, r * 0.18, 8, 3).color(jk.shade(colour, -0.15), colour)
    for deg in (0, 90):
        a.box(r * 1.9, r * 0.18, r * 0.16, bevel=0).move(0, 0, -r * 0.08).rot(z=deg + 22.5).color(jk.shade(colour, -0.08))
    a.cyl(r * 0.28, r * 0.36, 5, bevel=0).move(0, 0, -r * 0.18).color(P.STEEL_DARK)
    m, _ = _frame(p, Vector(p) + Vector(axis))
    return parts.grouped(a, start).apply(m)


def gate_valve(a, p, along, r_pipe, wheel=0.27):
    """A gate valve in a horizontal pipe at p: flanged body, bonnet, stem and a red wheel on top."""
    p, d = Vector(p), Vector(along).normalized()
    half = r_pipe * 1.5
    drum(a, p - d * half, p + d * half, r_pipe * 1.45, 6, bevel=r_pipe * 0.4).color(PLATE_LO, PLATE_HI)
    for side in (-1, 1):
        flange(a, p + d * side * half, p + d * side * (half + 0.08), r_pipe * 1.8, 6)
    up = Vector((0, 0, 1))
    a.cyl(r_pipe * 0.82, r_pipe * 1.5, 6, bevel=0).move(p.x, p.y, p.z + r_pipe * 1.1).color(PLATE_LO, PLATE_HI)
    top = p + up * (r_pipe * 2.6)
    rod(a, top, top + up * 0.24, 0.035, 3).part("metal").color(P.STEEL)
    hand_wheel(a, top + up * 0.26, wheel)


def beacon(a, p, r=0.19, colour=WARN):
    """A warning light: a dark socket under a glowing dome."""
    x, y, z = p
    a.cyl(r * 1.35, r * 0.9, 6, bevel=0).move(x, y, z).color(PLATE_DARK, PLATE_LO)
    a.dome(r, r * 1.5, 6, 2).move(x, y, z + r * 0.9).part("glow").color(colour, jk.shade(colour, 0.35))


@asset(
    "lm-regulator",
    tint="#ffffff",
    budget=4500,
    note="S6: a wide, low life-support regulator on octagonal plating (corners on the axes). Console faces the front.",
)
def regulator(a):
    # ---- plating ---------------------------------------------------------------------------
    a.cyl(5.5, 0.3, 8, bevel=0.07, grounded=True).color(PLATE_DARK, PLATE_LO)
    a.cyl(5.15, 0.22, 8, bevel=0.05).move(0, 0, 0.28).color(PLATE_LO, PLATE_HI)
    top = 0.5
    for k in range(8):
        deg = 22.5 + 45 * k
        beam(a, polar(2.9, deg, top), polar(4.66, deg, top), 0.03, 0.07, side=(0, 0, 1)).color(PLATE_DARK)

    # ---- the core: a lit chamber behind a cage, under a ringed housing ----------------------
    n = 18
    a.lathe([(2.3, top), (2.3, 0.74), (2.16, 0.86), (1.6, 0.86)], n, cap_bottom=False, cap_top=False).color(PLATE_DARK, PLATE_LO)
    a.lathe([(2.36, top), (2.36, top + 0.045), (2.62, top + 0.045), (2.62, top)], n, cap_bottom=False, cap_top=False).part("glow").color(AMBER)
    a.lathe([(1.58, 0.84), (1.58, 1.62)], n, cap_bottom=False, cap_top=False).part("glow").color("#ff9a2a", AMBER_HOT)
    for k in range(9):
        a.box(0.36, 0.13, 0.78, bevel=0, taper=(0.82, 1)).move(1.72, 0, 0.85).rot(z=20 + 40 * k).part("metal").color(P.STEEL_DARK, P.STEEL)
    housing = [(1.5, 1.6), (1.9, 1.6), (1.98, 1.68), (1.98, 2.06), (1.82, 2.36), (1.38, 2.68), (0.88, 2.84), (0.64, 2.86)]
    a.lathe(housing, n, cap_bottom=False, cap_top=False).part("metal").color(HOUSING_LO, HOUSING_HI)
    band(a, 1.98, 1.76, 1.96, n, proud=0.05).color(PLATE_LO, PLATE_HI)
    a.lathe([(0.64, 2.83), (0.74, 2.89), (0.74, 3.04), (0.6, 3.12)], 12, cap_bottom=False, cap_top=False).color(PLATE_DARK, PLATE_LO)
    a.dome(0.6, 0.32, 12, 3).move(0, 0, 3.1).part("glow").color(AMBER, AMBER_HOT)

    # ---- four exchanger tanks on the diagonals, each on its own coolant line ----------------
    zp = 1.86
    for k in range(4):
        deg = 45 + 90 * k
        x, y, _ = polar(4.15, deg)
        a.lathe([(0.84, top - 0.02), (0.84, 0.6), (0.76, 0.66), (0.6, 0.66)], 10, cap_bottom=False, cap_top=False).move(x, y, 0).color(
            PLATE_DARK, PLATE_LO
        )
        a.lathe([(0.68, 0.64), (0.72, 0.72), (0.72, 2.6), (0.64, 2.88), (0.42, 3.08), (0.24, 3.14)], 10, cap_bottom=False).move(x, y, 0).part(
            "metal"
        ).color(HOUSING_LO, HOUSING_HI)
        band(a, 0.72, 2.32, 2.46, 10, proud=0.035).move(x, y, 0).color(PLATE_LO, PLATE_HI)
        beacon(a, (x, y, 3.12), 0.19)
        # Coolant line: port on the housing, a gate valve, port on the tank.
        out = Vector(polar(1, deg))
        flange(a, polar(1.9, deg, zp), polar(2.12, deg, zp), 0.3)
        drum(a, polar(2.05, deg, zp), polar(3.5, deg, zp), 0.17, 8, bevel=0).color(PIPE_LO, PIPE_HI)
        flange(a, polar(3.3, deg, zp), polar(3.48, deg, zp), 0.3)
        gate_valve(a, polar(2.72, deg, zp), out, 0.17)

    # ---- the ring main links the tanks; saddles carry it over the plating -------------------
    a.torus(4.15, 0.13, 24, 5).move(0, 0, 1.02).part("metal").color(P.STEEL_DARK, P.STEEL)
    for k in range(4):
        deg = 90 * k
        x, y, _ = polar(4.15, deg)
        a.box(0.34, 0.5, 0.44, bevel=0.04, taper=(0.7, 0.8)).rot(z=deg).move(x, y, top - 0.02).color(PLATE_DARK, PLATE_LO)
        tangent = Vector(polar(1, deg + 90))
        centre = Vector((x, y, 1.02))
        flange(a, centre - tangent * 0.1, centre + tangent * 0.1, 0.2)
        beacon(a, polar(4.82, deg, top - 0.01), 0.11)

    # ---- access hatches on three sides, the control console at the front --------------------
    for deg in (0, 90, 180):
        with a.group() as hatch:
            a.box(1.0, 0.82, 0.06, bevel=0).color(PLATE_DARK, PLATE_LO)
            a.box(0.84, 0.66, 0.06, bevel=0.022).move(0, 0, 0.035).color(PLATE_HI, jk.shade(PLATE_HI, 0.15))
            for sx in (-0.25, 0.25):
                a.box(0.2, 0.09, 0.07, bevel=0).move(sx, 0.33, 0.05).part("metal").color(P.STEEL)
            a.tube([(-0.15, -0.2, 0.08), (-0.15, -0.2, 0.17), (0.15, -0.2, 0.17), (0.15, -0.2, 0.08)], 0.024, 4).part("metal").color(P.STEEL)
            a.box(0.84, 0.07, 0.03, bevel=0).move(0, 0.2, 0.085).color(P.AMBER)
        hatch.rot(z=deg + 90).move(*polar(3.22, deg, top - 0.01))
    with a.group() as console:
        a.profile_x([(-0.28, 0), (0.28, 0), (0.28, 1.0), (0.02, 1.0), (-0.28, 0.66)], 1.1, bevel=0.04).color(PLATE_LO, PLATE_HI)
        a.box(0.84, 0.3, 0.025, bevel=0).move(0, -0.15, -0.012).rot(x=48.6).move(0, -0.145, 0.81).part("glow").color(AMBER, AMBER_HOT)
        a.box(1.24, 0.72, 0.07, bevel=0).move(0, 0, -0.01).color(PLATE_DARK, PLATE_LO)
    console.move(0, -3.3, top)
    for sx in (-0.3, 0.3):
        rod(a, (sx, -3.0, top + 0.07), (sx, -2.25, top + 0.07), 0.06, 5).color(PIPE_LO, PIPE_HI)


def cooling_stack(a, x, y, R, H, skip=(), lights=0):
    """One cooling stack on the deck at (x, y): a finned exchanger base under a waisted flue
    with a banded lip. `skip` lists bearings (degrees) where a pipe or duct enters, so no fin
    is put there. Returns the flue profile in the stack's own frame."""
    hf = 0.3 * H
    n = 14
    flue = [
        (R * 0.92, hf + 0.14), (R * 0.84, 0.5 * H), (R * 0.75, 0.82 * H - 0.02), (R * 0.75, 0.82 * H), (R * 0.75, H - 0.34),
        (R * 0.82, H - 0.18), (R * 0.82, H), (R * 0.68, H), (R * 0.66, H - 0.32),
    ]
    with a.group() as g:
        a.lathe([(R * 1.16, 0.0), (R * 1.16, 0.2), (R * 1.06, 0.3), (R, 0.3)], n, cap_bottom=False, cap_top=False).color(PLATE_DARK, PLATE_LO)
        a.lathe([(R, 0.28), (R, hf), (R * 1.05, hf + 0.04), (R * 1.05, hf + 0.14), (R * 0.9, hf + 0.2)], n, cap_bottom=False, cap_top=False).color(
            PLATE_LO, PLATE_HI
        )
        for k in range(12):
            deg = 30 * k + 15
            if any(abs((deg - s + 180) % 360 - 180) < 24 for s in skip):
                continue
            a.box(0.32, 0.1, hf - 0.34, bevel=0, taper=(0.5, 1)).move(R + 0.12, 0, 0.3).rot(z=deg).part("metal").color(P.STEEL_DARK, P.STEEL)
        shaft = a.lathe(flue, n, cap_bottom=False, cap_top=False).color(SHAFT_LO, SHAFT_HI)
        # A warning band below the lip, and the dark throat.
        red = jk.shade(P.RED, -0.05)
        shaft.paint(lambda f: red if 0.82 * H < f.calc_center_median().z < H - 0.3 and f.normal.z < 0.5 else None)
        a.lathe([(R * 0.67, H - 0.31), (0.0, H - 0.31)], n, cap_bottom=False).color(VOID).no_ao()
        band(a, radius_at(flue, 0.5 * H), 0.5 * H - 0.07, 0.5 * H + 0.07, n, proud=0.04).color(PLATE_LO, PLATE_HI)
        for k in range(lights):
            px, py, _ = polar(R * 0.82 + 0.03, 60 + 360 / lights * k)
            a.box(0.13, 0.13, 0.13, bevel=0).move(px, py, H - 0.12).part("glow").color(WARN)
    g.move(x, y, 0.3)
    return flue


def vapour(a, x, y, z, lumps, seed, budget=260, tones=("#d9dccd", "#fbfbf5", "#c3c7b8")):
    """A plume of soft faceted vapour or smoke rising from (x, y, z) and drifting to +x.

    The (dx, dy, dz, radius) lumps are fused into one billowing skin, painted from the first
    tone at its foot to the second at its head, with the third underneath.
    """
    mass = None
    for i, (dx, dy, dz, r) in enumerate(lumps):
        lump = jk.blob(r, 2, (1.06, 1.0, 0.84), lumps=0.3, seed=seed + i * 5, freq=1.25).move(x + dx, y + dy, z + dz)
        if mass is None:
            mass = lump
        else:
            mass.join(lump)
            lump.bm.free()
    if mass.triangles > budget:
        mass.decimate(budget / mass.triangles)
    mass.color(tones[0], tones[1]).paint(lambda f: tones[2] if f.normal.z < -0.35 else None)
    return a.add(mass.flat().no_ao())


@asset(
    "lm-thermal-stack",
    tint="#ffffff",
    budget=4500,
    note="S6: a thermal plant on a hexagonal deck (corners on +-x): three cooling stacks, a manifold, a duct and a control hut at the front.",
)
def thermal_stack(a):
    # ---- deck ------------------------------------------------------------------------------
    a.cyl(5.0, 0.2, 6, bevel=0.06, grounded=True).color(PLATE_DARK, PLATE_LO)
    a.cyl(4.75, 0.14, 6, bevel=0.04).move(0, 0, 0.17).color(PLATE_LO, PLATE_HI)
    deck = 0.3
    A, B, C = (-2.0, 0.0), (2.2, -1.2), (0.5, 2.55)
    RA, RB, RC = 1.3, 1.3, 1.15
    # Where the manifold meets each stack, and where the duct enters B.
    toB = math.degrees(math.atan2(B[1] - A[1], B[0] - A[0]))
    tee = (0.12, -0.6)
    toC = math.degrees(math.atan2(tee[1] - C[1], tee[0] - C[0]))

    cooling_stack(a, *A, RA, 8.0, skip=(toB, 215), lights=3)
    cooling_stack(a, *B, RB, 6.5, skip=(toB + 180, 270))
    cooling_stack(a, *C, RC, 5.3, skip=(toC,))

    # ---- manifold: a header between the two front stacks, a branch back to the third --------
    zm = deck + 1.3
    d = Vector((B[0] - A[0], B[1] - A[1], 0)).normalized()
    a0 = Vector((A[0], A[1], zm)) + d * (RA - 0.05)
    b0 = Vector((B[0], B[1], zm)) - d * (RB - 0.05)
    drum(a, a0, b0, 0.4, 10, bevel=0).color(PIPE_LO, PIPE_HI)
    for q, sign in ((a0, 1), (b0, -1)):
        flange(a, q + d * sign * 0.06, q + d * sign * 0.24, 0.54, 10)
    mid = Vector((tee[0], tee[1], zm))
    flange(a, mid - d * 0.34, mid + d * 0.34, 0.5, 10)
    dc = (Vector((tee[0], tee[1], 0)) - Vector((C[0], C[1], 0))).normalized()
    c0 = Vector((C[0], C[1], zm)) + dc * (RC - 0.05)
    drum(a, mid, c0, 0.27, 8, bevel=0).color(PIPE_LO, PIPE_HI)
    flange(a, c0 + dc * 0.06, c0 + dc * 0.22, 0.4)
    flange(a, mid - dc * 0.42, mid - dc * 0.56, 0.4)
    a.cyl(0.24, 0.5, 6, bevel=0).move(mid.x, mid.y, zm + 0.3).part("metal").color(P.STEEL_DARK, P.STEEL)
    rod(a, mid + Vector((0, 0, 0.8)), mid + Vector((0, 0, 1.06)), 0.04, 3).part("metal").color(P.STEEL)
    hand_wheel(a, mid + Vector((0, 0, 1.08)), 0.34)
    for q in (a0.lerp(b0, 0.22), a0.lerp(b0, 0.8)):
        a.box(0.5, 0.36, zm - deck - 0.3, bevel=0.04, taper=(0.7, 0.8)).rot(z=toB).move(q.x, q.y, deck - 0.02).color(PLATE_DARK, PLATE_LO)

    # ---- control hut and blower at the front; a duct runs on brackets to stack B ------------
    with a.group() as hut:
        a.box(1.8, 1.25, 1.16, bevel=0.05).color(PLATE_LO, PLATE_HI)
        a.box(1.96, 1.42, 0.08, bevel=0).move(0, 0, -0.01).color(PLATE_DARK, PLATE_LO)
        a.profile_x([(-0.74, 1.14), (0.74, 1.14), (0.74, 1.24), (-0.74, 1.42)], 1.96, bevel=0.035).color(PLATE_DARK, PLATE_LO)
        parts.door(a, 0.44, 0.86, leaf=PLATE_DARK, trim=HOUSING_LO, step=None, knob=False).move(-0.48, -0.625, 0.06)
        parts.window(a, 0.56, 0.4, trim=HOUSING_LO, pane="lit", pane_color=P.WINDOW, mullion="bar", sill=False).move(0.36, -0.625, 0.5)
        beacon(a, (-0.48, -0.5, 1.36), 0.1)
    hut.move(-1.75, -2.85, deck)
    # Blower: a housed fan with a grille, feeding the duct.
    bx, by = -0.25, -2.95
    a.box(0.95, 0.95, 0.9, bevel=0.06).move(bx, by, deck).color(PLATE_LO, PLATE_HI)
    drum(a, (bx, by - 0.42, deck + 0.46), (bx, by - 0.5, deck + 0.46), 0.32, 10, bevel=0).color(PLATE_DARK)
    a.lathe([(0.26, 0.0), (0.0, 0.0)], 10, cap_bottom=False).rot(x=90).move(bx, by - 0.505, deck + 0.46).color(VOID).no_ao()
    zd = deck + 2.5
    w = 0.46
    duct = [(bx, by, deck + 0.86), (bx, by, zd), (B[0], by, zd), (B[0], B[1] - RB * 0.86, zd)]
    for p0, p1 in zip(duct, duct[1:]):
        v = Vector(p1) - Vector(p0)
        e = v.normalized() * (w / 2)
        side = (1, 0, 0) if abs(v.x) < 0.1 else (0, 1, 0)
        beam(a, Vector(p0) - e, Vector(p1) + e, w, w, bevel=0.04, side=side).color(SHAFT_LO, SHAFT_HI)
    for x in (bx + 0.62, B[0] - 0.5):
        a.box(0.1, w + 0.09, w + 0.09, bevel=0).move(x, by, zd - w / 2 - 0.045).color(PLATE_LO, PLATE_HI)
    for x in (0.62, 1.42):
        a.box(0.14, 0.14, zd - w / 2 - deck, bevel=0.02).move(x, by, deck).color(PLATE_DARK, PLATE_LO)
        a.box(0.2, 0.84, 0.1, bevel=0).move(x, by, zd - w / 2 - 0.1).color(PLATE_DARK, PLATE_LO)
        for sy in (-1, 1):
            beam(a, (x, by, zd - w / 2 - 0.62), (x, by + sy * 0.36, zd - w / 2 - 0.08), 0.07, 0.07, side=(1, 0, 0)).color(PLATE_DARK)
        a.box(0.36, 0.36, 0.06, bevel=0).move(x, by, deck - 0.01).color(PLATE_DARK)

    # ---- a railed gallery near the top of the tall stack, reached by a ladder ---------------
    zg = deck + 5.6
    a.lathe([(0.9, zg - 0.14), (1.5, zg - 0.06), (1.56, zg), (1.56, zg + 0.07), (0.9, zg + 0.07)], 12, cap_bottom=False, cap_top=False).move(
        A[0], A[1], 0
    ).color(PLATE_DARK, PLATE_LO)
    a.torus(1.5, 0.035, 12, 4).move(A[0], A[1], zg + 0.52).part("metal").color(P.STEEL)
    for k in range(6):
        px, py, _ = polar(1.5, 60 * k + 15)
        rod(a, (A[0] + px, A[1] + py, zg + 0.05), (A[0] + px, A[1] + py, zg + 0.52), 0.028, 3).part("metal").color(P.STEEL)
    foot = Vector((A[0], A[1], 0)) + Vector(polar(RA + 0.22, 215, deck))
    head = Vector((A[0], A[1], 0)) + Vector(polar(1.06, 215, zg + 0.05))
    across = Vector(polar(0.17, 305))
    for side in (-1, 1):
        rod(a, foot + across * side, head + across * side, 0.03, 4).part("metal").color(P.STEEL)
    for i in range(1, 13):
        q = foot.lerp(head, i / 13)
        rod(a, q - across, q + across, 0.022, 3).part("metal").color(P.STEEL)

    # ---- vapour ----------------------------------------------------------------------------
    vapour(
        a, A[0], A[1], deck + 8.0,
        ((0.0, 0.0, 0.25, 0.84), (0.3, 0.05, 1.05, 1.02), (-0.42, -0.3, 1.0, 0.62), (0.15, 0.5, 1.25, 0.6), (0.95, 0.0, 1.95, 0.8), (1.5, 0.1, 2.62, 0.52)),
        3, 340,
    )
    vapour(a, B[0], B[1], deck + 6.5, ((0.0, 0.0, 0.25, 0.84), (0.32, -0.05, 1.0, 0.95), (-0.35, 0.3, 0.95, 0.58), (0.95, 0.05, 1.75, 0.62)), 21, 250)
    vapour(a, C[0], C[1], deck + 5.3, ((0.0, 0.0, 0.22, 0.74), (0.28, 0.05, 0.9, 0.84), (-0.3, -0.28, 0.85, 0.5), (0.82, 0.0, 1.52, 0.52)), 40, 240)


BLADE = [(0.0, 0.0, 0.0, 0.0), (0.46, 0.15, 0.05, 0.07), (1.4, 0.35, 0.12, 0.14), (3.1, 0.49, 0.17, 0.2), (4.9, 0.6, 0.21, 0.25), (6.3, 0.68, 0.23, 0.28)]


def blade_at(z):
    """Half-width, flat half-width and half-thickness of the blade at height z above its point."""
    for (z0, *lo), (z1, *hi) in zip(BLADE, BLADE[1:]):
        if z0 <= z <= z1:
            t = (z - z0) / (z1 - z0)
            return tuple(lo[k] + (hi[k] - lo[k]) * t for k in range(3))
    return tuple(BLADE[-1][1:])


def blade_ring(z, grow=0.0):
    """The six corners of the blade's section at z, pushed out by `grow`."""
    w, f, t = blade_at(z)
    w, f, t = w + grow, f + grow * 0.5, t + grow
    return [(-w, 0, z), (-f, -t, z), (f, -t, z), (w, 0, z), (f, t, z), (-f, t, z)]


@asset(
    "lm-hanging-regulator",
    tint="#ffffff",
    grounded=False,
    budget=4500,
    note="S6: the sword. Hangs point-down from a tether; origin at the point, the broad faces look front and back.",
)
def hanging_regulator(a):
    # ---- the blade -------------------------------------------------------------------------
    tip = 0.3
    levels = [tip] + [z for z, *_ in BLADE[1:]]
    verts, faces = [], []
    for z in levels:
        verts += blade_ring(z)
    for i in range(6):
        j = (i + 1) % 6
        for k in range(len(levels) - 1):
            q = k * 6
            faces.append((q + i, q + j, q + 6 + j, q + 6 + i))
    faces.append(tuple(range(5, -1, -1)))
    faces.append(tuple(range((len(levels) - 1) * 6, len(levels) * 6)))
    blade = a.raw(verts, faces).part("metal").color("#b9c5d0", "#e6edf2").smooth(20)
    blade.paint(lambda f: "#7b8794" if abs(f.normal.y) > 0.9 else None)
    # The point itself is the emitter: a hot tip.
    a.raw([(0, 0, 0)] + blade_ring(tip), [(0, 1 + (i + 1) % 6, 1 + i) for i in range(6)]).part("glow").color(WARN, "#ffb84a").smooth(20).no_ao()
    # Section collars.
    for z in (1.95, 3.55, 5.15):
        lo, hi = blade_ring(z - 0.08, 0.035), blade_ring(z + 0.08, 0.035)
        a.raw(lo + hi, [(i, (i + 1) % 6, 6 + (i + 1) % 6, 6 + i) for i in range(6)] + [tuple(range(5, -1, -1)), tuple(range(6, 12))]).color(
            PLATE_DARK, PLATE_LO
        ).smooth(20)
    # The line of warning light down each face.
    for face in (-1, 1):
        zs = [0.8] + [z for z in levels if 0.8 < z < 6.0] + [6.0]
        strip, quads = [], []
        for z in zs:
            t = blade_at(z)[2]
            hw = 0.03 + 0.035 * z / 6.0
            strip += [(-hw, face * t, z), (-hw, face * (t + 0.03), z), (hw, face * (t + 0.03), z), (hw, face * t, z)]
        for k in range(len(zs) - 1):
            q = k * 4
            quads += [(q, q + 1, q + 5, q + 4), (q + 1, q + 2, q + 6, q + 5), (q + 2, q + 3, q + 7, q + 6)]
        quads += [(0, 3, 2, 1), tuple(len(strip) - 4 + i for i in range(4))]
        a.raw(strip, quads).part("glow").color("#ffb84a", "#ffe29a").no_ao()
    # Radiator vanes flank the root of the blade.
    for side in (-1, 1):
        for i, z in enumerate((5.48, 5.76, 6.04)):
            w = blade_at(z)[0]
            a.box(0.34 - 0.05 * (2 - i), 0.16, 0.13, bevel=0.03, taper=(0.6, 1)).rot(y=side * 90).rot(x=0).move(side * (w - 0.04), 0, z).part(
                "metal"
            ).color(P.STEEL_DARK, P.STEEL)

    # ---- the guard: a hub, two arms and an elliptical service ring --------------------------
    zg = 6.52
    a.lathe([(0.52, zg - 0.4), (0.86, zg - 0.24), (0.92, zg - 0.06), (0.92, zg + 0.18), (0.76, zg + 0.34), (0.42, zg + 0.4)], 12).scale(
        1, 0.62, 1
    ).color(PLATE_LO, PLATE_HI)
    ring = hoop(
        a,
        [(1.2, zg - 0.1), (1.27, zg - 0.18), (1.43, zg - 0.18), (1.5, zg - 0.1), (1.5, zg + 0.1), (1.43, zg + 0.18), (1.27, zg + 0.18), (1.2, zg + 0.1)],
        24,
    )
    ring.scale(1.08, 0.7, 1).part("metal").color(HOUSING_LO, HOUSING_HI)
    for side in (-1, 1):
        a.box(0.72, 0.3, 0.2, bevel=0.05, taper=(1, 0.8)).move(side * 1.06, 0, zg - 0.1).color(PLATE_LO, PLATE_HI)
        a.box(0.12, 0.5, 0.12, bevel=0.03).move(0, side * 0.72, zg - 0.06).color(PLATE_LO, PLATE_HI)
        # Docking pods at the ends of the guard, each with a warning light.
        drum(a, (side * 1.38, 0, zg), (side * 1.67, 0, zg), 0.22, 8, bevel=0.05).part("metal").color(HOUSING_LO, HOUSING_HI)
        a.dome(0.14, 0.13, 8, 2).rot(y=side * 90).move(side * 1.66, 0, zg).part("glow").color(WARN)

    # ---- grip, pommel collar and the tether -------------------------------------------------
    z0, z1 = zg + 0.36, zg + 1.36
    a.lathe([(0.34, z0), (0.3, z0 + 0.1), (0.3, z1 - 0.08), (0.34, z1)], 10, cap_bottom=False, cap_top=False).color(PLATE_DARK, PLATE_LO)
    for i in range(4):
        a.torus(0.33, 0.08, 10, 5).move(0, 0, z0 + 0.2 + 0.2 * i).color(PIPE_LO, PIPE_HI)
    zq = z1 - 0.04
    a.lathe(
        [(0.32, zq), (0.52, zq + 0.12), (0.6, zq + 0.3), (0.52, zq + 0.5), (0.3, zq + 0.64), (0.16, zq + 0.72), (0.07, zq + 0.98)], 12, cap_bottom=False
    ).part("metal").color(HOUSING_LO, HOUSING_HI)
    a.lathe([(0.606, zq + 0.26), (0.606, zq + 0.34)], 12, cap_bottom=False, cap_top=False).part("glow").color(AMBER)
    zr = 10.78
    rod(a, (0, 0, zq + 0.94), (0, 0, zr - 0.2), 0.035, 5).part("glow").color("#fff2c8")
    # The tether's carriage: a ring on three spokes.
    a.torus(1.16, 0.16, 20, 6).move(0, 0, zr).part("metal").color(HOUSING_LO, HOUSING_HI)
    a.lathe([(0.0, zr - 0.3), (0.16, zr - 0.2), (0.24, zr - 0.02), (0.2, zr + 0.12), (0.0, zr + 0.18)], 8).color(PLATE_LO, PLATE_HI)
    for k in range(3):
        deg = 90 + 120 * k
        rod(a, polar(0.18, deg, zr), polar(1.08, deg, zr), 0.055, 5).part("metal").color(P.STEEL)
        a.box(0.1, 0.1, 0.07, bevel=0.02).move(*polar(1.16, deg + 60, zr + 0.13)).part("glow").color(AMBER)
