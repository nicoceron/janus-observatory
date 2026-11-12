"""The stranger and their telescope: the story's hero character and instrument.

Unlike the rest of the kit these models are not props on a planet. The web app draws them large
in the "become the stranger" chapter and animates the character as a rig of rigid pieces, so
every kind here is authored in the local frame of the three.js node that carries it, at the
scale of that node (see apps/web/app/voyage/ObserverLife.tsx and Telescope.tsx).

Frames: the web frame is x right, y up, z toward the viewer; Blender is x right, y back, z up, so
web (x, y, z) = Blender (x, -z, y). Coordinates in this file are written in the WEB frame and
converted with `W`, `node` and the `along_*` / `vloft` helpers, so they can be read side by side
with the TSX.

Kinds: `obs-telescope`; the character's pieces `obs-base`, `obs-torso`, `obs-scarf-tail`,
`obs-head`, `obs-eye`, `obs-antennae`, `obs-arm-upper`, `obs-arm-lower`, `obs-leg-upper`,
`obs-leg-lower`, `obs-joint`, `obs-hand-focus`, `obs-hand-free`; and two review-only assemblies
registered with `preview=True` (never exported): `obs-preview` and `obs-preview-observe`.

Everything is original interpretive artwork: an invented astronomer and an invented instrument.
Nothing here encodes a measured quantity.
"""

from __future__ import annotations

import math

import bmesh
from mathutils import Matrix, Vector

from kit import jk
from kit import palette as P
from kit.jk import asset

# --------------------------------------------------------------------------------------------
# Colour (the character keeps the colours it has always had on the site)
# --------------------------------------------------------------------------------------------
SKIN = "#83bfaf"
SKIN_LO = "#6fb09f"
SKIN_HI = "#93cdbc"
SUIT = "#315d72"
SUIT_LO = "#28505f"
SUIT_HI = "#3a6a80"
SUIT_DEEP = "#234654"
SHIN = "#3c6a7b"
SCREEN = "#73decd"
BUCKLE = "#78dfcf"

IVORY = "#dfd4b6"
IVORY_LO = "#cdc09e"
IVORY_HI = "#e9dfc4"
BRASS = "#cda862"
BRASS_LO = "#a98545"
BRASS_HI = "#e0bf7c"
CAST = "#344b56"
CAST_LO = "#2a3e48"
CAST_HI = "#3f5a66"
BORE = "#14232a"


# --------------------------------------------------------------------------------------------
# Frame helpers
# --------------------------------------------------------------------------------------------
def W(x: float, y: float, z: float) -> tuple[float, float, float]:
    """A web-frame point in the Blender frame."""
    return (x, -z, y)


_TO_BLENDER = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
_TO_WEB = _TO_BLENDER.inverted()


def node(position=(0.0, 0.0, 0.0), rotation=(0.0, 0.0, 0.0), scale=(1.0, 1.0, 1.0)) -> Matrix:
    """The Blender-frame matrix of a three.js node: web position, Euler XYZ (radians), scale."""
    rx, ry, rz = rotation
    turn = Matrix.Rotation(rx, 4, "X") @ Matrix.Rotation(ry, 4, "Y") @ Matrix.Rotation(rz, 4, "Z")
    local = Matrix.Translation(position) @ turn @ Matrix.Diagonal((scale[0], scale[1], scale[2], 1.0))
    return _TO_BLENDER @ local @ _TO_WEB


def flip(piece):
    bmesh.ops.reverse_faces(piece.bm, faces=piece.bm.faces[:])
    piece.bm.normal_update()
    return piece


def look(piece, direction):
    """Turn an open surface (a lens, a baffle) so that it faces `direction` (Blender frame)."""
    total = Vector()
    for f in piece.bm.faces:
        total += f.normal * f.calc_area()
    return flip(piece) if total.dot(Vector(direction)) < 0 else piece


def inward(piece, axis="z"):
    """Turn a revolved wall so that it faces its own axis (through the origin): a bore lining."""
    k = "xyz".index(axis)
    total = 0.0
    for f in piece.bm.faces:
        c = f.calc_center_median()
        c[k] = 0.0
        total += f.normal.dot(c) * f.calc_area()
    return flip(piece) if total > 0 else piece


def along_y(a, profile, sides=16, caps=(False, False), turn=0.0):
    """Revolve (radius, web y) about the vertical axis."""
    return a.lathe(profile, sides, cap_bottom=caps[0], cap_top=caps[1], turn=turn)


def along_z(a, profile, sides=24, caps=(False, False)):
    """Revolve (radius, web z) about the web z axis: the optical axis."""
    return a.lathe(profile, sides, cap_bottom=caps[0], cap_top=caps[1]).rot(x=90)


def along_x(a, profile, sides=12, caps=(False, False)):
    """Revolve (radius, web x) about the web x axis: knobs and trunnions."""
    return a.lathe(profile, sides, cap_bottom=caps[0], cap_top=caps[1]).rot(y=90)


def vloft(a, sections, sides=16, power=2.3, caps="flat"):
    """Skin horizontal sections given in the web frame: (y, rx, rz[, cz[, cx]])."""
    return a.loft(sections, sides, power, caps).rot(x=90)


def ball(a, rx, ry=None, rz=None, sides=12, rings=6):
    """An ellipsoid with WEB radii (x, y, z), centred on the origin."""
    ry = rx if ry is None else ry
    rz = rx if rz is None else rz
    return a.sphere(1.0, sides, rings, (rx, rz, ry))


def drum(a, centre, r, w, axis="x", sides=12, bevel=None, r2=None):
    """A chamfered cylinder of width `w` centred on a web point, its axis along web x, y or z."""
    piece = a.cyl(r, w, sides, r2=r2, bevel=bevel).move(0, 0, -w / 2)
    if axis == "x":
        piece.rot(y=90)
    elif axis == "z":
        piece.rot(x=90)
    return piece.at(W(*centre))


def between(p0, p1, side=(1, 0, 0)):
    """A matrix carrying local z onto p0 -> p1 (Blender points), keeping local x near `side`."""
    p0, p1 = Vector(p0), Vector(p1)
    z = p1 - p0
    length = z.length
    z.normalize()
    s = Vector(side)
    x = s - z * s.dot(z)
    if x.length < 1e-5:
        s = Vector((0, 1, 0)) if abs(z.y) < 0.9 else Vector((0, 0, 1))
        x = s - z * s.dot(z)
    x.normalize()
    m = Matrix((x, z.cross(x), z)).transposed().to_4x4()
    m.translation = p0
    return m, length


def bar(a, p0, p1, w, d, side=(1, 0, 0), bevel=None, taper=1.0):
    """A bevelled box member between two web points, `w` wide along `side` and `d` deep."""
    m, length = between(W(*p0), W(*p1), side)
    return a.box(w, d, length, bevel=bevel, taper=taper).apply(m)


def brass(piece):
    return piece.part("metal").color(BRASS_LO, BRASS_HI)


def paint_bore(piece, colour=BORE, axis="y"):
    """Darken the faces of a revolved piece that look toward its axis."""
    k = "xyz".index(axis)

    def pick(f):
        c = f.calc_center_median()
        c[k] = 0.0
        return colour if c.length > 1e-6 and f.normal.dot(c.normalized()) < -0.35 else None

    return piece.paint(pick)


# --------------------------------------------------------------------------------------------
# The telescope: a brass-and-ivory refractor on a fork mount and a braced tripod
# --------------------------------------------------------------------------------------------
# Interface with the web app (web frame, telescope units): the optical axis is z, objective at
# z = -0.8, eye lens end at (0, 0, 1.17); the camera flies down the bore, so the eyepiece, the
# drawtube and the main tube are lined and the lenses are single surfaces that face outward. The
# alien turns the focus knob at (0.31, 0, 0.81) and steadies the tube near (-0.32, -0.24, 0.7).
KNOB = (0.31, 0.0, 0.81)
LEG_TOP = (0.0, -0.915, 0.135)
LEG_FOOT = (0.0, -2.745, 0.745)


def telescope_model(a):
    n = 16  # the main tube is about 55 px across in the story; 16 smooth sides read as round
    # ---- optical tube ----------------------------------------------------------------------
    along_z(a, [(0.27, -0.47), (0.27, 0.61)], n).color(IVORY_LO, IVORY_HI)
    # Dew shield: a wider sleeve whose rolled lip turns in to the lens cell.
    along_z(a, [(0.27, -0.44), (0.298, -0.462), (0.298, -0.776), (0.284, -0.8), (0.258, -0.8), (0.258, -0.662)], n).color(
        IVORY, "#f0e8d2"
    )
    brass(along_z(a, [(0.298, -0.728), (0.306, -0.735), (0.306, -0.776), (0.298, -0.783)], n))
    brass(along_z(a, [(0.27, -0.372), (0.284, -0.38), (0.284, -0.43), (0.27, -0.44)], n))
    # Lens cell and the objective, a shallow dome of coated glass.
    look(brass(along_z(a, [(0.258, -0.668), (0.226, -0.668), (0.226, -0.648)], n)), W(0, 0, -1))
    look(along_z(a, [(0.226, -0.65), (0.15, -0.674), (0.0, -0.69)], 12), W(0, 0, -1)).part("glass").color("#1f4a66", "#86bdd6")
    # Rear cell band, then a cast tailpiece that necks down to the focuser.
    brass(along_z(a, [(0.27, 0.598), (0.286, 0.607), (0.286, 0.69), (0.276, 0.7)], n))
    along_z(a, [(0.276, 0.698), (0.186, 0.772), (0.168, 0.792), (0.168, 0.888)], n).color(CAST_LO, CAST_HI)
    brass(along_z(a, [(0.168, 0.884), (0.179, 0.891), (0.179, 0.914), (0.113, 0.92)], n))
    # Drawtube with its rack, eyepiece holder with a set screw.
    brass(along_z(a, [(0.113, 0.918), (0.113, 1.036)], n))
    brass(along_z(a, [(0.113, 1.03), (0.129, 1.037), (0.129, 1.068), (0.104, 1.075)], n))
    rack = [(-0.921, 0.112)]
    for i in range(5):
        z0 = 0.927 + i * 0.02
        rack += [(-z0, 0.129), (-(z0 + 0.01), 0.129), (-(z0 + 0.01), 0.119), (-(z0 + 0.02), 0.119)]
    rack += [(-1.029, 0.112)]
    a.profile_x(rack[::-1], 0.036, bevel=0).color(CAST_LO)
    brass(a.tube([W(0, 0.124, 1.052), W(0, 0.172, 1.052)], [0.012, 0.022], 6))
    # Eyepiece: a barrel and a rolled eyecup around an open bore with the eye lens inside. The
    # camera ends up a hand's width from this rim, so it alone is turned finely.
    eyecup = along_z(
        a,
        [(0.104, 1.072), (0.104, 1.126), (0.118, 1.158), (0.112, 1.17), (0.086, 1.17), (0.076, 1.16), (0.076, 1.092)],
        24,
    ).color(CAST_LO, CAST_HI)
    paint_bore(eyecup)
    brass(along_z(a, [(0.104, 1.1), (0.108, 1.105), (0.104, 1.11)], n))
    look(along_z(a, [(0.076, 1.094), (0.044, 1.103), (0.0, 1.107)], 12), W(0, 0, 1)).part("glass").color("#17364a", "#5f9dba")
    # The lining the camera sees on its way through, with two field stops.
    inward(a.lathe([(0.076, 1.094), (0.098, 1.04), (0.098, 0.915), (0.15, 0.8), (0.247, 0.71), (0.247, -0.648)], n, False, False)).rot(
        x=90
    ).color(BORE).no_ao()
    for z, r in ((0.36, 0.2), (-0.2, 0.196)):
        look(along_z(a, [(0.247, z), (r, z)], n), W(0, 0, 1)).color("#1c3038").no_ao()

    # ---- focus knob (+x) and its bearing ----------------------------------------------------
    drum(a, (0.192, 0.0, KNOB[2]), 0.052, 0.12, "x", 8, bevel=0.012).color(CAST_LO, CAST_HI)
    brass(
        along_x(
            a,
            [(0.04, 0.238), (0.062, 0.248), (0.062, 0.392), (0.081, 0.4), (0.081, 0.428), (0.05, 0.444), (0.0, 0.449)],
            12,
            caps=(True, False),
        ).at(W(0, 0, KNOB[2]))
    )
    brass(drum(a, (-0.188, 0.0, KNOB[2]), 0.034, 0.046, "x", 6, bevel=0.01))

    # ---- finder scope ------------------------------------------------------------------------
    fy, fs = 0.4, 8
    with a.group() as finder:
        along_z(a, [(0.047, -0.4), (0.047, 0.06)], fs).color(IVORY_LO, IVORY_HI)
        brass(along_z(a, [(0.047, -0.385), (0.06, -0.396), (0.06, -0.47), (0.044, -0.476), (0.044, -0.452)], fs))
        look(along_z(a, [(0.044, -0.454), (0.0, -0.46)], fs), W(0, 0, -1)).part("glass").color("#1f4a66", "#86bdd6")
        brass(along_z(a, [(0.047, 0.05), (0.053, 0.06), (0.036, 0.08), (0.036, 0.126)], fs))
        tip = along_z(a, [(0.036, 0.122), (0.045, 0.13), (0.045, 0.154), (0.03, 0.154), (0.03, 0.14)], fs).color(CAST_LO, CAST_HI)
        paint_bore(tip)
        for z in (-0.29, -0.04):
            brass(along_z(a, [(0.047, z - 0.026), (0.066, z - 0.018), (0.066, z + 0.018), (0.047, z + 0.026)], fs))
    finder.move(0, 0, fy)
    for z in (-0.29, -0.04):
        brass(a.box(0.056, 0.042, 0.09, bevel=0.01, taper=(0.66, 1)).at(W(0, 0.262, z)))

    # ---- fork mount --------------------------------------------------------------------------
    brass(along_z(a, [(0.27, -0.094), (0.29, -0.085), (0.29, 0.085), (0.27, 0.094)], n))
    fork = a.profile_y(
        [
            (-0.3, -0.585), (0.3, -0.585), (0.378, -0.505), (0.378, 0.05), (0.356, 0.098), (0.322, 0.098), (0.302, 0.05),
            (0.302, -0.36), (0.225, -0.44), (-0.225, -0.44), (-0.302, -0.36), (-0.302, 0.05), (-0.322, 0.098),
            (-0.356, 0.098), (-0.378, 0.05), (-0.378, -0.505),
        ],
        0.2,
        bevel=0.014,
    )  # fmt: skip
    # The casting is deep at the yoke and slims toward the bearings.
    fork.warp(lambda co: (co.x, co.y * (1.34 - 0.5 * min(1.0, max(0.0, (co.z + 0.5) / 0.5))), co.z))
    fork.color(CAST_LO, CAST_HI)
    for side in (-1, 1):
        drum(a, (side * 0.34, 0.0, 0.0), 0.108, 0.1, "x", 12, bevel=0.016).color(CAST_LO, CAST_HI)
        # Clutch handwheel: a rimmed wheel with a raised hub.
        knob = brass(along_x(a, [(0.05, 0.388), (0.094, 0.393), (0.1, 0.403), (0.1, 0.424), (0.052, 0.434), (0.03, 0.452), (0.0, 0.455)], 10))
        if side < 0:
            knob.scale(-1, 1, 1)
    # Azimuth turntable, pier and lock.
    brass(along_y(a, [(0.15, -0.644), (0.205, -0.634), (0.205, -0.598), (0.172, -0.585)], 14))
    along_y(a, [(0.112, -0.862), (0.094, -0.84), (0.084, -0.668), (0.1, -0.644)], 10).color(CAST_LO, CAST_HI)
    brass(a.tube([W(-0.07, -0.752, 0.0), W(-0.168, -0.752, 0.0)], [0.013, 0.013], 6))
    brass(drum(a, (-0.166, -0.752, 0.0), 0.036, 0.036, "x", 6, bevel=0.009))

    # ---- tripod ------------------------------------------------------------------------------
    along_y(a, [(0.1, -0.98), (0.165, -0.962), (0.172, -0.88), (0.122, -0.86)], 6, caps=(True, False)).color(CAST_LO, CAST_HI)
    d = Vector(LEG_FOOT) - Vector(LEG_TOP)
    out = Vector((0.0, d.z, -d.y)).normalized()  # outward normal of leg 0, in the web frame

    def at(t, off=0.0, x=0.0):
        return (x, LEG_TOP[1] + d.y * t + out.y * off, LEG_TOP[2] + d.z * t + out.z * off)

    with a.group() as leg:
        # Two fixed rails, a sliding lower rail between them, and the clamp that locks it.
        for x in (-0.039, 0.039):
            bar(a, at(0.0, x=x), at(0.56, x=x), 0.036, 0.07, bevel=0.009).color(IVORY_LO, IVORY_HI)
        bar(a, at(0.45), at(0.972), 0.04, 0.058, bevel=0.009, taper=0.84).color(IVORY_LO, IVORY_HI)
        brass(bar(a, at(-0.022), at(0.036), 0.128, 0.086, bevel=0.014))
        brass(bar(a, at(0.522), at(0.586), 0.132, 0.092, bevel=0.014))
        brass(a.tube([W(*at(0.554, 0.03)), W(*at(0.554, 0.1))], [0.014, 0.026], 6))
        brass(bar(a, at(0.925), at(1.0), 0.064, 0.074, bevel=0.011, taper=0.7))
        a.cyl(0.074, 0.062, 6, r2=0.05, bevel=0.014, grounded=True).at(W(0.0, -2.81, LEG_FOOT[2] + 0.012)).color("#22323a", "#31454f")
        # The tray bracket clasps the upper rails.
        brass(a.box(0.12, 0.11, 0.04, bevel=0).at(W(0.0, -1.815, 0.39)))
    leg.radial(3, "z")
    # Accessory tray: a three-cornered shelf with two spare eyepieces.
    corners = []
    for k in range(3):
        for off in (-11, 11):
            ang = math.radians(270 + k * 120 + off)
            corners.append((math.cos(ang) * 0.362, math.sin(ang) * 0.362))
    a.prism(corners, 0.032, bevel=0.01).move(0, 0, -1.814).color(IVORY_LO, IVORY_HI)
    for x, z, h in ((-0.1, 0.02, 0.066), (0.1, -0.07, 0.048)):
        brass(a.cyl(0.038, h, 6, bevel=0.008).at(W(x, -1.782, z)))
        a.cyl(0.045, 0.042, 6, bevel=0.011).at(W(x, -1.782 + h, z)).color(CAST_LO, CAST_HI)


@asset("obs-telescope", grounded=True, budget=4500, note="Refractor on a fork mount and tripod, in the frame of Telescope()'s group.")
def telescope(a):
    telescope_model(a)
    _debug_counts(a, "telescope")


# --------------------------------------------------------------------------------------------
# The stranger: a rig of rigid pieces, each authored in the frame of the node that carries it
# --------------------------------------------------------------------------------------------
# Every coordinate below is in the WEB frame of the piece's own three.js node, at the node's
# scale, and matches apps/web/app/voyage/ObserverLife.tsx: the rig moves these pieces, so their
# pivots are a contract. Limb segments are one unit long along web y because the rig scales
# them between joints.
EYE_LO, EYE_HI = "#d9d6b4", "#f4f1dc"
IRIS_LO, IRIS_HI = "#4fb0b0", "#1d4756"
PUPIL = "#0f1e24"
GLINT = "#fff6dc"
LID_LO, LID_HI = "#4f8c80", "#69a99b"
BROW = "#4f8377"
MOUTH = "#3c6157"
PALE_LO, PALE_HI = "#a9d3ae", "#d2eecb"
STALK_LO, STALK_HI = "#5f9486", "#7fb5a5"
SCARF_LO, SCARF_HI = "#cc8544", "#e9ad6c"
SCARF_STRIPE = "#f1dfb8"
CUFF_LO, CUFF_HI = "#c4b592", "#e2d6b8"
LEATHER_LO, LEATHER_HI = "#a8935f", "#c9b587"
PACK_LO, PACK_HI = "#1f3f4d", "#2c5566"
BOOT_LO, BOOT_HI = "#1a323e", "#2c5060"
SOLE = "#13232b"
ROCK_LO, ROCK_HI, ROCK_TOP_C = "#34515f", "#4b7181", "#5f8898"
LICHEN = "#91b5a5"
PADDING_LO, PADDING_HI = "#447589", "#5b90a4"

KNOB_AXIS = (-0.067, 0.085, 0.994)  # the telescope's focus-knob axis seen from the focusGrip node


def node_web(position=(0.0, 0.0, 0.0), rotation=(0.0, 0.0, 0.0), scale=(1.0, 1.0, 1.0)) -> Matrix:
    """The same three.js node as `node`, as a web-frame matrix (for placing web points)."""
    return _TO_WEB @ node(position, rotation, scale) @ _TO_BLENDER


def turn(src, dst) -> Matrix:
    """The shortest turn that carries web direction `src` onto `dst`, as a Blender-frame matrix."""
    q = Vector(src).normalized().rotation_difference(Vector(dst).normalized())
    return _TO_BLENDER @ q.to_matrix().to_4x4() @ _TO_WEB


def cap(a, rx, ry, depth, sides=16, rings=4):
    """A closed dome bulging toward web +z from the plane z = 0, with web radii rx and ry."""
    return a.dome(1.0, 1.0, sides, rings, grounded=False).scale(rx, ry, depth).rot(x=90)


def wtube(a, points, r, sides=8, caps="round", squash=1.0):
    return a.tube([W(*p) for p in points], r, sides, caps=caps, squash=squash)


def slab(a, w, h, depth, bevel=None):
    """A bevelled box centred on the origin: w along web x, h along web y, depth along web z."""
    return a.box(w, depth, h, bevel=bevel).move(0, 0, -h / 2)


def ribbon(a, points, normals, width, thick, sink=0.006, edge=0.35):
    """A strap or band: a chamfered flat section swept through web `points`, lying on a surface
    whose outward `normals` (one per point, or one for all) it follows. `width` may be a list."""
    pts = [Vector(p) for p in points]
    if isinstance(normals[0], (int, float)):
        normals = [normals] * len(pts)
    ns = [Vector(n).normalized() for n in normals]
    widths = [width] * len(pts) if isinstance(width, (int, float)) else list(width)
    verts, faces = [], []
    for i, (p, n, w) in enumerate(zip(pts, ns, widths)):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        s = t.cross(n).normalized()
        n = s.cross(t).normalized()
        e = thick * edge
        for u, v in ((-w / 2, -sink), (-w / 2, thick - e), (-w / 2 + e, thick), (w / 2 - e, thick), (w / 2, thick - e), (w / 2, -sink)):
            verts.append(W(*(p + s * u + n * v)))
    for i in range(len(pts) - 1):
        for k in range(6):
            a0, a1 = i * 6 + k, i * 6 + (k + 1) % 6
            faces.append((a0, a1, a1 + 6, a0 + 6))
    faces.append(tuple(range(5, -1, -1)))
    faces.append(tuple(range((len(pts) - 1) * 6, len(pts) * 6)))
    return a.raw(verts, faces)


def section_at(profile, y):
    """(rx, rz, cz) of a list of horizontal sections (y, rx, rz, cz) at height y."""
    for s0, s1 in zip(profile, profile[1:]):
        if s0[0] <= y <= s1[0]:
            t = (y - s0[0]) / ((s1[0] - s0[0]) or 1.0)
            return tuple(s0[k] + (s1[k] - s0[k]) * t for k in (1, 2, 3))
    s = profile[0] if y < profile[0][0] else profile[-1]
    return s[1], s[2], s[3]


def surface(profile, power, x, y, sign=1.0):
    """Web z of a lofted body's front (sign 1) or back (sign -1) at (x, y)."""
    rx, rz, cz = section_at(profile, y)
    return cz + sign * rz * max(0.0, 1.0 - abs(x / rx) ** power) ** (1.0 / power)


def outward(profile, power, x, y, sign=1.0):
    e = 0.004
    dx = (surface(profile, power, x + e, y, sign) - surface(profile, power, x - e, y, sign)) / (2 * e)
    dy = (surface(profile, power, x, y + e, sign) - surface(profile, power, x, y - e, sign)) / (2 * e)
    return (Vector((-dx, -dy, 1.0)) * sign).normalized()


def seat(profile, power, x, y, lift=0.0, sign=1.0) -> Matrix:
    """The matrix that stands a piece built facing web +z on a lofted body's surface at (x, y)."""
    n = outward(profile, power, x, y, sign)
    p = Vector((x, y, surface(profile, power, x, y, sign))) + n * lift
    q = Vector((0.0, 0.0, 1.0)).rotation_difference(n)
    return _TO_BLENDER @ Matrix.Translation(p) @ q.to_matrix().to_4x4() @ _TO_WEB


def girdle(a, profile, power, y0, y1, thick, sides=22):
    """A band around a lofted body between two heights, its edges turned in to the body."""
    sections = []
    for y, t in ((y0 - 0.004, -0.02), (y0 + 0.008, thick), (y1 - 0.008, thick), (y1 + 0.004, -0.02)):
        rx, rz, cz = section_at(profile, y)
        sections.append((y, rx + t, rz + t, cz))
    return vloft(a, sections, sides, power, caps="none")


# ---- head ----------------------------------------------------------------------------------
SKULL = [  # horizontal sections (y, rx, rz, cz) in the frame of the group inside `head`
    (-0.2, 0.105, 0.11, 0.0),
    (-0.1, 0.125, 0.13, 0.0),
    (-0.05, 0.21, 0.19, 0.006),
    (0.0, 0.305, 0.243, 0.01),
    (0.07, 0.378, 0.272, 0.012),
    (0.16, 0.422, 0.288, 0.012),
    (0.26, 0.438, 0.292, 0.01),
]
# The cranium is an elliptical cap, so the crown closes round rather than in a point.
for _deg in (11, 22, 33, 43, 53, 62, 70, 77, 83, 87.5):
    _s, _c = math.sin(math.radians(_deg)), math.cos(math.radians(_deg))
    SKULL.append((0.29 + 0.44 * _s, 0.438 * _c, 0.292 * _c**0.9, 0.01 - 0.04 * _s))
SKULL.append((0.73, 0.0, 0.0, -0.03))
SKULL_POWER = 2.25
EYE_AT = (0.223, 0.245, 0.261)
EYE_TURN = (0.0, 0.38, -0.13)


def eye_node(side, web=False) -> Matrix:
    make = node_web if web else node
    return make((side * EYE_AT[0], EYE_AT[1], EYE_AT[2]), (0.0, side * EYE_TURN[1], side * EYE_TURN[2]))


def head_model(a):
    vloft(a, SKULL, 32, SKULL_POWER).color(SKIN_LO, SKIN_HI)
    # A pale muzzle with a small, slightly lopsided smile.
    mz = (0.0, 0.02, 0.247)
    mr = (0.172, 0.084, 0.066)
    ball(a, *mr, 16, 8).at(W(*mz)).color(PALE_LO, PALE_HI)
    smile = []
    for i in range(9):
        u = -1.0 + i / 4.0
        x = 0.004 + 0.074 * u
        y = -0.018 + 0.021 * u * u + 0.005 * u
        z = mz[2] + mr[2] * math.sqrt(max(0.0, 1.0 - (x / mr[0]) ** 2 - ((y - mz[1]) / mr[1]) ** 2)) + 0.002
        smile.append((x, y, z))
    wtube(a, smile, [0.0035, 0.0055, 0.007, 0.0078, 0.008, 0.0078, 0.007, 0.0055, 0.0035], 5, caps="flat").color(MOUTH).no_ao()
    for side in (-1, 1):
        m = eye_node(side)
        # The lid: what shows around the eye, and all that shows when it blinks shut.
        cap(a, 0.192, 0.158, 0.07, 20, 4).apply(m).color(LID_LO, LID_HI)
        # Brow ridge; the one over the bare eye rides a little higher.
        lift = 0.014 if side > 0 else 0.0
        brow = [
            (-side * 0.128, 0.126 + lift * 0.4, 0.004),
            (-side * 0.06, 0.168 + lift, 0.022),
            (side * 0.02, 0.182 + lift, 0.024),
            (side * 0.095, 0.166 + lift, 0.012),
            (side * 0.155, 0.122 + lift * 0.6, -0.018),
        ]
        wtube(a, brow, [0.011, 0.02, 0.023, 0.019, 0.01], 8).apply(m).color(BROW)
        # Ears: broad leaves swept up and back, pale inside.
        em = node((side * 0.435, 0.31, -0.045), (0.0, side * 0.2, side * 0.3))
        ear = a.loft(
            [(-0.27, 0.045, 0.09, 0.0), (-0.14, 0.07, 0.148, 0.0), (0.0, 0.066, 0.16, 0.012), (0.1, 0.052, 0.132, 0.034),
             (0.19, 0.036, 0.084, 0.064), (0.25, 0.02, 0.036, 0.088), (0.272, 0.0, 0.0, 0.098)],
            12, 2.0,
        ).rot(z=-90)  # fmt: skip
        inner = a.loft(
            [(-0.13, 0.0, 0.0, 0.0, 0.05), (-0.09, 0.026, 0.07, 0.0, 0.05), (0.0, 0.03, 0.098, 0.012, 0.046),
             (0.1, 0.024, 0.076, 0.034, 0.036), (0.17, 0.014, 0.042, 0.056, 0.027), (0.205, 0.0, 0.0, 0.068, 0.02)],
            8, 2.0,
        ).rot(z=-90)  # fmt: skip
        for piece in (ear, inner):
            if side < 0:
                piece.scale(-1, 1, 1)
            piece.apply(em)
        ear.color(SKIN_LO, SKIN_HI)
        inner.color(PALE_LO, PALE_HI)
    # Pale speckles: a small constellation on the brow and a scatter over the back of the skull.
    for x, y, r, sign in (
        (0.1, 0.545, 0.03, 1), (0.185, 0.5, 0.02, 1), (0.03, 0.6, 0.017, 1),
        (-0.12, 0.47, 0.042, -1), (0.06, 0.52, 0.03, -1), (0.19, 0.4, 0.036, -1), (-0.02, 0.33, 0.026, -1),
        (-0.24, 0.3, 0.03, -1), (0.12, 0.22, 0.022, -1), (0.3, 0.24, 0.02, -1),
    ):  # fmt: skip
        cap(a, r, r, 0.007, 8, 2).apply(seat(SKULL, SKULL_POWER, x, y, -0.0035, sign)).color(PALE_LO, PALE_HI).no_ao()
    # The monocle: a brass barrel seated between brow and cheek over the left eye, on a cord.
    m = eye_node(-1)
    brass(a.annulus(0.173, 0.149, 0.052, 24, bevel=0.008).rot(x=90).move(0, -0.03, 0).apply(m))
    lug_local = (-0.168, -0.062, 0.05)
    brass(ball(a, 0.017, 0.017, 0.017, 6, 4).at(W(*lug_local)).apply(m))
    lug = eye_node(-1, web=True) @ Vector(lug_local)
    # The cord hangs in a soft loop from the rim and tucks under the jaw into the scarf.
    c0, c1, c2 = lug, Vector((lug.x - 0.05, -0.13, lug.z - 0.03)), Vector((-0.17, -0.12, 0.08))
    cord = [tuple(c0 * (1 - t) ** 2 + c1 * 2 * t * (1 - t) + c2 * t * t) for t in (i / 9 for i in range(10))]
    wtube(a, cord, 0.0055, 4, caps="flat").color(BRASS_LO)


@asset("obs-head", grounded=False, budget=4500, note="Skull, face, ears, lids, brows and monocle, in the frame of the group inside `head`.")
def head(a):
    head_model(a)
    _debug_counts(a, "head")


# ---- eye (the contents of one blink group; squashed in y to blink) --------------------------
EYEBALL = (0.16, 0.127, 0.05, 0.036)  # web radii x, y, bulge, and the z of its base plane


def on_eye(piece, lift):
    """Lay a cap built on z = 0 onto the eyeball's surface, `lift` proud of it."""
    rx, ry, bulge, z0 = EYEBALL

    def fn(co):
        q = 1.0 - (co.x / rx) ** 2 - (co.z / ry) ** 2
        return (co.x, co.y - (z0 + bulge * math.sqrt(max(0.0, q)) + lift), co.z)

    return piece.warp(fn)


def eye_model(a):
    rx, ry, bulge, z0 = EYEBALL
    cap(a, rx, ry, bulge, 28, 6).move(*W(0, 0, z0)).color(EYE_LO, EYE_HI)
    # Both eyes look toward the telescope (+x). Iris, pupil and glints are thin lenses laid on
    # the eyeball, each one clear of the layer under it so their outlines stay clean.
    cx, cy = 0.024, -0.002
    on_eye(cap(a, 0.1, 0.11, 0.006, 28, 3).move(*W(cx, cy, 0)), 0.0015).part("glass").color(IRIS_LO, IRIS_HI)
    on_eye(cap(a, 0.06, 0.068, 0.004, 20, 2).move(*W(cx + 0.002, cy, 0)), 0.008).part("glass").color(PUPIL)
    on_eye(cap(a, 0.031, 0.031, 0.003, 12, 2).move(*W(cx - 0.036, cy + 0.048, 0)), 0.0125).part("glow").color(GLINT)
    on_eye(cap(a, 0.013, 0.013, 0.002, 8, 1).move(*W(cx + 0.04, cy - 0.044, 0)), 0.0125).part("glow").color(GLINT)


@asset("obs-eye", grounded=False, budget=2500, note="Eyeball, iris, pupil and glints of one blink group; used for both eyes.")
def eye(a):
    eye_model(a)


# ---- antennae --------------------------------------------------------------------------------
def antennae_model(a):
    for side in (-1, 1):
        stalk = [
            (side * 0.165, 0.5, -0.05),
            (side * 0.185, 0.61, -0.061),
            (side * 0.212, 0.705, -0.076),
            (side * 0.25, 0.79, -0.094),
            (side * 0.283, 0.86, -0.11),
        ]
        wtube(a, stalk, [0.036, 0.031, 0.026, 0.021, 0.018], 8, caps="flat").color(STALK_LO, STALK_HI)
        # A collar where the stalk leaves the skull.
        m, _ = between(W(*stalk[1]), W(*stalk[2]))
        a.cyl(0.054, 0.062, 10, r2=0.034, bevel=0.008).apply(m).color(BROW, STALK_LO)
        ball(a, 0.064, 0.09, 0.056, 12, 8).rot(y=side * 20).at(W(side * 0.292, 0.888, -0.114)).color(PALE_LO, PALE_HI)
        m, _ = between(W(*stalk[3]), W(*stalk[4]))
        a.torus(0.026, 0.011, 10, 5).apply(m).move(*W(side * 0.022, 0.048, -0.011)).color(BROW)


@asset("obs-antennae", grounded=False, budget=2500, note="Both antennae, in the frame of the `antennae` group.")
def antennae(a):
    antennae_model(a)


# ---- torso -----------------------------------------------------------------------------------
TORSO = [  # horizontal sections (y, rx, rz, cz) in the frame of the `chest` group
    (-1.105, 0.25, 0.23, 0.0),
    (-1.075, 0.365, 0.33, 0.0),
    (-1.0, 0.425, 0.385, 0.0),
    (-0.9, 0.44, 0.4, 0.0),
    (-0.8, 0.435, 0.392, 0.0),
    (-0.66, 0.415, 0.362, 0.0),
    (-0.5, 0.395, 0.325, 0.0),
    (-0.36, 0.385, 0.29, 0.0),
    (-0.25, 0.37, 0.268, 0.0),
    (-0.16, 0.31, 0.236, 0.0),
    (-0.1, 0.22, 0.19, 0.0),
]
TORSO_POWER = 2.3
SCARF_KNOT = (-0.15, -0.15, 0.3)  # the pivot of the `scarfTail` group


def torso_model(a):
    T, P_ = TORSO, TORSO_POWER
    body = vloft(a, T, 22, P_).color(SUIT_LO, SUIT_HI)
    # A darker hem, the belt and its buckle light.
    body.paint(lambda f: SUIT_DEEP if f.calc_center_median().z < -1.03 else None)
    girdle(a, T, P_, -0.845, -0.762, 0.015).color(LEATHER_LO, LEATHER_HI)
    brass(slab(a, 0.128, 0.104, 0.034, bevel=0.014).apply(seat(T, P_, 0.0, -0.803, 0.014)))
    slab(a, 0.086, 0.064, 0.012, bevel=0).apply(seat(T, P_, 0.0, -0.803, 0.033)).part("glow").color(BUCKLE)
    for x in (-0.24, 0.24):
        slab(a, 0.03, 0.1, 0.012, bevel=0).apply(seat(T, P_, x, -0.803, 0.016)).color(LEATHER_LO)
    # Front placket with a brass pull.
    ys = [-0.775 + i * (0.565 / 5) for i in range(6)]
    ribbon(a, [(0.0, y, surface(T, P_, 0.0, y)) for y in ys], [outward(T, P_, 0.0, y) for y in ys], 0.03, 0.009).color(CUFF_LO, CUFF_HI)
    brass(slab(a, 0.026, 0.05, 0.012, bevel=0.005).apply(seat(T, P_, 0.0, -0.245, 0.012)))
    # Patch pocket with a flap and a snap; a brass badge on the other side.
    pm = seat(T, P_, -0.245, -0.63, 0.004)
    slab(a, 0.2, 0.19, 0.022, bevel=0.01).apply(pm).color(SUIT_HI, jk.shade(SUIT_HI, 0.08))
    slab(a, 0.218, 0.07, 0.018, bevel=0.008).move(0, -0.013, 0.078).apply(pm).color(CUFF_LO, CUFF_HI)
    brass(cap(a, 0.016, 0.016, 0.009, 8, 2).move(0, -0.022, 0.064).apply(pm))
    # A stitched yoke seam across the chest.
    seam = []
    for y, t in ((-0.492, -0.012), (-0.474, 0.006), (-0.456, -0.012)):
        rx, rz, cz = section_at(T, y)
        seam.append((y, rx + t, rz + t, cz))
    vloft(a, seam, 22, P_, caps="none").color(SUIT_HI)
    bm_ = seat(T, P_, 0.15, -0.4, 0.0)
    brass(a.cyl(0.05, 0.016, 10, bevel=0.006).rot(x=90).apply(bm_))
    cap(a, 0.026, 0.026, 0.008, 10, 2).move(0, -0.014, 0).apply(bm_).color(SUIT_DEEP)
    # Tan pads over the shoulders (the arms carry their own shoulder caps).
    for side in (-1, 1):
        pad = node((side * 0.352, -0.262, 0.0), (0.0, 0.0, -side * 0.42))
        a.dome(1.0, 1.0, 12, 3, grounded=False).scale(0.172, 0.215, 0.082).apply(pad).color(LEATHER_LO, "#d9c79a")
        brass(a.dome(1.0, 1.0, 6, 2, grounded=False).scale(0.024, 0.024, 0.014).move(0, 0, 0.078).apply(pad))
    # The scarf: two soft rolls wound round the neck.
    a.torus(0.2, 0.088, 18, 7).scale(1.0, 0.93, 0.9).rot(x=4, y=-5).move(*W(0.035, -0.128, 0.0)).color(SCARF_LO, SCARF_HI)
    a.torus(0.165, 0.074, 14, 7).scale(1.0, 0.95, 0.86).rot(x=-6, y=7).move(*W(0.055, -0.052, -0.005)).color(SCARF_LO, SCARF_HI)
    # Backpack: a soft case with a strapped flap, a bedroll on top and a canister at its side.
    pack = [(-0.85, 0.2, 0.085, -0.385), (-0.8, 0.255, 0.125, -0.385), (-0.52, 0.268, 0.138, -0.39), (-0.26, 0.255, 0.128, -0.38), (-0.2, 0.2, 0.09, -0.37)]
    vloft(a, pack, 12, 3.4).color(PACK_LO, PACK_HI)
    flap = [(-0.47, 0.262, 0.142, -0.392), (-0.44, 0.276, 0.15, -0.392), (-0.25, 0.264, 0.138, -0.382), (-0.19, 0.208, 0.098, -0.372)]
    vloft(a, flap, 12, 3.4).color(jk.shade(PACK_HI, 0.04), jk.shade(PACK_HI, 0.14))
    for x in (-0.13, 0.13):
        ys = [-0.56, -0.5, -0.44, -0.36, -0.28]
        ribbon(a, [(x, y, surface(flap if y > -0.47 else pack, 3.4, x, max(y, -0.469) if y > -0.47 else y, -1.0)) for y in ys], (0, 0, -1), 0.044, 0.01).color(LEATHER_LO, LEATHER_HI)
        brass(slab(a, 0.06, 0.05, 0.016, bevel=0.006).at(W(x, -0.47, -0.552)))
    drum(a, (0.0, -0.118, -0.405), 0.064, 0.5, "x", 10, bevel=0.016).color(LEATHER_LO, "#d2bf93")
    for x in (-0.17, 0.17):
        drum(a, (x, -0.118, -0.405), 0.069, 0.03, "x", 10, bevel=0).color(PACK_LO)
    for side in (-1, 1):
        drum(a, (side * 0.252, -0.118, -0.405), 0.036, 0.012, "x", 8, bevel=0).color(LEATHER_LO)
    brass(a.cyl(0.05, 0.2, 8, bevel=0.012).at(W(-0.3, -0.66, -0.4)))
    a.cyl(0.054, 0.05, 8, bevel=0.014).at(W(-0.3, -0.47, -0.4)).color(CAST_LO, CAST_HI)


@asset("obs-torso", grounded=False, budget=2500, note="Suit body, scarf, pack, belt, pads and pocket: everything static in the `chest` group.")
def torso(a):
    torso_model(a)
    _debug_counts(a, "torso")


# ---- scarf tail (pivot at the knot) ------------------------------------------------------------
def scarf_tail_model(a):
    ball(a, 0.074, 0.062, 0.058, 12, 8).color(SCARF_LO, SCARF_HI)
    # Two ends hang from the knot and drape forward over the chest.
    for dx, length, lean, wide, phase in ((-0.012, 0.35, 0.115, 0.118, 0.0), (0.062, 0.25, 0.07, 0.1, 1.3)):
        n = 8
        pts, ws = [], []
        for i in range(n):
            t = i / (n - 1)
            y = -0.02 - length * t
            z = 0.02 + lean * (t**0.8) + 0.012 * math.sin(t * 5.2 + phase)
            pts.append((dx * (0.3 + 0.7 * t), y, z))
            ws.append(wide * (0.72 + 0.4 * t))
        ribbon(a, pts, (0, 0.18, 1), ws, 0.03, sink=0.0, edge=0.42).color(SCARF_LO, SCARF_HI)
        # A cream stripe near the end.
        k = n - 2
        ribbon(a, [tuple(Vector(pts[k]) + Vector((0, 0.03, 0.0))), tuple(Vector(pts[k]) + Vector((0, -0.012, 0.0)))], (0, 0.18, 1), ws[k] + 0.006, 0.034, sink=0.002, edge=0.3).color(SCARF_STRIPE)


@asset("obs-scarf-tail", grounded=False, budget=2500, note="The scarf's knot and hanging ends, pivot at the origin (the `scarfTail` group).")
def scarf_tail(a):
    scarf_tail_model(a)


# ---- limbs: one unit long along web y (Blender z), centred, proximal end at -0.5 ---------------
def piping(a, r, y, rise=0.007, half=0.016, sides=14):
    """A raised stitched ring round a limb of radius r. Limbs are squashed along y by the rig
    (to about half), so rings are drawn tall here."""
    return a.lathe([(r - 0.004, y - half), (r + rise, y), (r - 0.004, y + half)], sides, cap_bottom=False, cap_top=False)


def arm_upper_model(a):
    a.lathe([(0.098, -0.5), (0.112, -0.3), (0.108, 0.0), (0.094, 0.5)], 14).color(SUIT)
    # The shoulder cap, drawn long so that the rig's squash (about 0.55) leaves it round.
    a.sphere(1.0, 14, 8, (0.15, 0.15, 0.27)).move(0, 0, -0.5).color(SUIT_LO, SUIT_HI)
    # A stitched band below the shoulder.
    a.lathe([(0.1, -0.21), (0.118, -0.2), (0.118, -0.07), (0.1, -0.06)], 14, cap_bottom=False, cap_top=False).color(SUIT_HI)
    for y in (-0.19, -0.08):
        a.lathe([(0.112, y - 0.012), (0.1215, y), (0.112, y + 0.012)], 14, cap_bottom=False, cap_top=False).color(CUFF_LO)


def arm_lower_model(a):
    a.lathe([(0.086, -0.5), (0.094, -0.34), (0.09, -0.1), (0.078, 0.19)], 14).color(SUIT)
    # Turned-back cuff, then a bare wrist that the hand hides.
    a.lathe([(0.066, 0.145), (0.088, 0.155), (0.094, 0.19), (0.094, 0.262), (0.087, 0.294), (0.058, 0.3)], 14).color(CUFF_LO, CUFF_HI)
    a.lathe([(0.052, 0.29), (0.05, 0.46)], 10).color(SKIN)
    piping(a, 0.093, -0.2).color(SUIT_HI)


def leg_upper_model(a):
    a.lathe([(0.122, -0.5), (0.13, -0.2), (0.124, 0.15), (0.11, 0.5)], 14).color(SUIT)
    piping(a, 0.1225, 0.11, half=0.022).color(SUIT_HI)


def leg_lower_model(a):
    # A gaiter: a full calf bound with two stitched rings.
    a.lathe([(0.104, -0.5), (0.113, -0.24), (0.108, -0.02), (0.092, 0.24), (0.08, 0.5)], 14).color(SHIN)
    piping(a, 0.111, -0.13, half=0.022).color(PADDING_HI)
    piping(a, 0.1, 0.1, half=0.022).color(PADDING_HI)


def joint_model(a):
    a.sphere(1.0, 16, 10).color(PADDING_LO, PADDING_HI)


@asset("obs-arm-upper", grounded=False, budget=2500, note="Unit upper arm along web y; the rig scales its length.")
def arm_upper(a):
    arm_upper_model(a)


@asset("obs-arm-lower", grounded=False, budget=2500, note="Unit forearm along web y with the cuff at the +y (wrist) end.")
def arm_lower(a):
    arm_lower_model(a)


@asset("obs-leg-upper", grounded=False, budget=2500, note="Unit thigh along web y.")
def leg_upper(a):
    leg_upper_model(a)


@asset("obs-leg-lower", grounded=False, budget=2500, note="Unit shin along web y, knee at -y.")
def leg_lower(a):
    leg_lower_model(a)


@asset("obs-joint", grounded=False, budget=2500, note="Elbow/knee ball of radius 1; the rig scales it.")
def joint(a):
    joint_model(a)


# ---- hands -----------------------------------------------------------------------------------
def digit(a, points, r0, r1, sides=8):
    """A finger: it slims from the knuckle, then swells into a soft pad at the tip."""
    n = len(points)
    radii = []
    for i in range(n):
        t = i / (n - 1)
        radii.append(r0 + (r1 - r0) * min(1.0, t / 0.6) + (r0 * 1.02 - r1) * max(0.0, (t - 0.6) / 0.4) ** 1.5)
    return wtube(a, points, radii, sides)


def hand_focus_model(a):
    """The right hand on the focus knob. Built with the knob along +z through the origin, then
    turned onto the knob's real axis. The forearm arrives from below."""
    rho = 0.08

    def arc(sign, z, a0, a1, n=7):
        out = []
        for i in range(n):
            ang = math.radians(a0 + (a1 - a0) * i / (n - 1))
            out.append((sign * rho * math.sin(ang), -rho * math.cos(ang), z))
        return out

    with a.group() as g:
        ball(a, 0.088, 0.058, 0.082, 14, 8).at(W(0.0, -0.108, -0.012)).color(SKIN_LO, SKIN_HI)
        for z in (-0.041, 0.021):
            digit(a, arc(1, z, 18, 158), 0.027, 0.021).color(SKIN, PALE_HI)
        digit(a, arc(-1, -0.01, 18, 136), 0.03, 0.023).color(SKIN, PALE_HI)
    g.apply(turn((0, 0, 1), KNOB_AXIS))


def hand_free_model(a):
    """The left hand holding a small scanner, screen toward the viewer."""
    ball(a, 0.105, 0.098, 0.088, 14, 8).color(SKIN_LO, SKIN_HI)
    with a.group() as dev:
        a.box(0.16, 0.042, 0.118, bevel=0.016).move(0, 0, -0.059).color(IVORY_LO, IVORY_HI)
        a.box(0.114, 0.012, 0.064, bevel=0.005).move(0, -0.023, -0.016).color(CAST_LO)
        a.box(0.098, 0.006, 0.048, bevel=0).move(0, -0.03, -0.008).part("glow").color(SCREEN)
        for w, z in ((0.058, 0.026), (0.034, 0.014), (0.068, 0.002)):
            a.box(w, 0.004, 0.005, bevel=0).move(-0.04 + w / 2, -0.034, z).part("glow").color("#d6fff4")
        for x in (-0.036, 0.0, 0.036):
            brass(a.cyl(0.0095, 0.007, 6, bevel=0.002).rot(x=90).move(x, -0.021, -0.04))
        brass(a.tube([(0.052, 0.0, 0.055), (0.052, 0.0, 0.092)], 0.0055, 5))
        brass(a.sphere(0.012, 6, 4).move(0.052, 0.0, 0.098))
    dev.rot(x=-8).move(*W(0.0, -0.008, 0.099))
    # Thumb round the inner edge onto the bezel; two fingers round the outer edge.
    digit(a, [(0.07, -0.034, 0.02), (0.108, -0.028, 0.07), (0.106, -0.022, 0.118), (0.078, -0.018, 0.137)], 0.029, 0.022).color(PALE_HI, SKIN, "y")
    for y in (0.028, -0.03):
        digit(a, [(-0.07, y, 0.015), (-0.11, y, 0.066), (-0.108, y + 0.002, 0.116), (-0.084, y + 0.004, 0.137)], 0.027, 0.02).color(PALE_HI, SKIN, "y")


@asset("obs-hand-focus", grounded=False, budget=2500, note="Right hand gripping the focus knob, in the `focusGrip` frame (knob axis through the origin).")
def hand_focus(a):
    hand_focus_model(a)


@asset("obs-hand-free", grounded=False, budget=2500, note="Left hand holding a glowing scanner, in the `freeHand` frame.")
def hand_free(a):
    hand_free_model(a)


# ---- base: the rock and both boots, in the root frame ------------------------------------------
GROUND = -1.705  # the top of the rock, where the soles stand
ANKLE = (0.25, -1.65, 0.07)
SHIN_DIR = (-0.026, 0.949, 0.312)  # ankle -> knee at rest, for the lean of the boot shaft


def base_model(a):
    def rock(r, squash, seed, at, subdiv=2, lumps=0.13, top=None, bottom=None):
        piece = a.blob(1.0, subdiv, (r * squash[0], r * squash[1], r * squash[2]), lumps=lumps, seed=seed)
        if top is not None:
            piece.warp(lambda co: (co.x, co.y, co.z if co.z < top else top + (co.z - top) * 0.12))
        if bottom is not None:
            piece.warp(lambda co: (co.x, co.y, co.z if co.z > bottom else bottom + (co.z - bottom) * 0.1))
        return piece.move(*W(*at)).color(ROCK_LO, ROCK_HI).paint_up(ROCK_TOP_C, 0.7)

    rock(1.0, (0.8, 0.64, 0.22), 5, (0.0, GROUND - 0.15, 0.08), top=0.145, bottom=-0.12)
    rock(1.0, (0.2, 0.17, 0.13), 9, (0.6, GROUND - 0.2, 0.47), 1, 0.18, bottom=-0.07)
    rock(1.0, (0.15, 0.13, 0.1), 3, (-0.7, GROUND - 0.22, 0.36), 1, 0.18, bottom=-0.05)
    rock(1.0, (0.17, 0.15, 0.12), 12, (-0.4, GROUND - 0.2, -0.47), 1, 0.18, bottom=-0.07)
    for x, z, r, seed in ((-0.34, 0.32, 0.1, 2), (0.47, -0.12, 0.075, 6), (0.08, 0.5, 0.06, 8)):
        a.blob(r, 1, (1.0, 0.8, 0.2), lumps=0.2, seed=seed).move(*W(x, GROUND + 0.004, z)).color(LICHEN, "#a9c9b6")
    # A small sprout that echoes the antennae.
    wtube(a, [(-0.52, GROUND - 0.01, 0.06), (-0.535, GROUND + 0.09, 0.07), (-0.5, GROUND + 0.17, 0.08)], [0.014, 0.011, 0.009], 6, caps="flat").color(STALK_LO, STALK_HI)
    ball(a, 0.03, 0.04, 0.03, 8, 5).at(W(-0.494, GROUND + 0.2, 0.082)).color(PALE_LO, PALE_HI)

    S = GROUND
    for side in (-1, 1):
        cx = side * 0.25
        a.loft([(-0.44, 0.0, 0.0, S + 0.02, cx), (-0.425, 0.1, 0.02, S + 0.02, cx), (-0.37, 0.148, 0.021, S + 0.021, cx), (-0.2, 0.16, 0.022, S + 0.022, cx),
                (0.03, 0.15, 0.022, S + 0.022, cx), (0.085, 0.11, 0.021, S + 0.021, cx), (0.1, 0.0, 0.0, S + 0.02, cx)], 12, 3.2).color(SOLE)  # fmt: skip
        upper = [(-0.425, 0.0, 0.0, S + 0.064), (-0.41, 0.08, 0.03, S + 0.062), (-0.37, 0.125, 0.045, S + 0.073), (-0.29, 0.146, 0.052, S + 0.08),
                 (-0.19, 0.148, 0.054, S + 0.082), (-0.1, 0.14, 0.062, S + 0.09), (-0.02, 0.13, 0.068, S + 0.096), (0.05, 0.108, 0.06, S + 0.09),
                 (0.086, 0.0, 0.0, S + 0.085)]  # fmt: skip
        a.loft([(s[0], s[1], s[2], s[3], cx) for s in upper], 12, 2.5).color(BOOT_LO, BOOT_HI)
        # Instep strap and buckle.
        a.loft([(-0.3, 0.136, 0.04, S + 0.078, cx), (-0.292, 0.154, 0.06, S + 0.08, cx), (-0.226, 0.155, 0.062, S + 0.082, cx), (-0.218, 0.136, 0.044, S + 0.082, cx)],
               12, 2.5, caps="none").color(LEATHER_LO, LEATHER_HI)  # fmt: skip
        brass(a.box(0.022, 0.056, 0.046, bevel=0.007).move(cx + side * 0.15, -0.259, S + 0.07))
        # Shaft and turned-down cuff, leaning with the shin.
        ankle = Vector((side * ANKLE[0], ANKLE[1], ANKLE[2]))
        d = Vector((side * SHIN_DIR[0], SHIN_DIR[1], SHIN_DIR[2])).normalized()
        m, length = between(W(*(ankle - d * 0.03)), W(*(ankle + d * 0.118)))
        a.lathe([(0.1, 0.0), (0.108, 0.05), (0.106, length)], 12).apply(m).color(BOOT_LO, BOOT_HI)
        m, _ = between(W(*(ankle + d * 0.118)), W(*(ankle + d * 0.2)))
        a.torus(0.1, 0.03, 14, 7).apply(m).color(CUFF_LO, CUFF_HI)


@asset("obs-base", grounded=True, budget=2500, note="The rock platform and both boots, in the root frame of ObserverLife.")
def base(a):
    base_model(a)


# ---- review-only assemblies ---------------------------------------------------------------------
# The stage of apps/web/app/voyage/Telescope.tsx `telescopeLayout`, relative to the observer and
# in observer units; identical on phone and desktop because both models scale with the station.
_STAGE = Matrix.Rotation(-0.62, 4, "Y") @ Matrix.Translation((1.35, 0.3, -0.3)) @ node_web((0, 0, 0), (-0.1, -1.02, 0.0), (0.78, 0.78, 0.78))
FOCUS_HAND = tuple(_STAGE @ Vector(KNOB))
SUPPORT_HAND = tuple(_STAGE @ Vector((-0.32, -0.24, 0.7)))
POSES = {
    # Keys of observerClip() at t = 0 (at ease, looking out) and t = 4 (at the eyepiece).
    "rest": dict(chest=((0, 0, 0), (0, 0, 0)), head=((0, 0, 0), (-0.07, -0.45, 0.03)), free=((-0.48, -1.25, 0.25), -0.4), grip=0.0,
                 antennae=(0.0, 0.03), tail=(0.1, -0.16)),  # fmt: skip
    "observe": dict(chest=((0.085, -0.035, 0.065), (0, 0.055, -0.105)), head=((0.06, -0.015, 0.075), (0.04, 0.25, -0.055)), free=(SUPPORT_HAND, 0.0),
                    grip=0.3, antennae=(-0.1, -0.04), tail=(-0.06, 0.06)),  # fmt: skip
    # The raised-hand key (t = 7.8); no kind is registered for it: `observer_model(a, "hail")`.
    "hail": dict(chest=((-0.02, 0.02, -0.02), (0, -0.15, 0.04)), head=((-0.02, 0.035, 0), (-0.32, -0.55, 0.09)), free=((-0.86, 0.48, 0.05), -0.45),
                 grip=0.0, antennae=(0.2, -0.16), tail=(0.32, -0.34)),  # fmt: skip
}


def _elbow(start, end, pole, upper, lower):
    d = end - start
    dist = d.length
    d.normalize()
    reach = min(max(dist, abs(upper - lower) + 1e-4), upper + lower - 1e-4)
    along = (upper * upper - lower * lower + reach * reach) / (2 * reach)
    bend = pole - start
    bend = (bend - d * bend.dot(d)).normalized()
    return start + d * along + bend * math.sqrt(max(0.0, upper * upper - along * along))


def _segment(p, q) -> Matrix:
    """placeLimb(): a unit limb carried between two web points."""
    d = q - p
    turn_ = Vector((0, 1, 0)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    return _TO_BLENDER @ Matrix.Translation((p + q) / 2) @ turn_ @ Matrix.Diagonal((1, d.length, 1, 1)) @ _TO_WEB


def carry(a, matrix, build):
    with a.group() as g:
        build(a)
    g.apply(matrix)


def observer_model(a, pose="rest", scope=False):
    """Every piece where ObserverLife.tsx puts it, with the limbs solved as its rig solves them."""
    k = POSES[pose]
    chest = node(*k["chest"])
    chest_web = node_web(*k["chest"])
    inner = chest @ node(*k["head"]) @ node((0.105, 0, 0.015), (0, 0.04, 0))
    carry(a, Matrix.Identity(4), base_model)
    carry(a, chest, torso_model)
    carry(a, chest @ node(SCARF_KNOT, (k["tail"][0], 0, k["tail"][1])), scarf_tail_model)
    carry(a, inner, head_model)
    for side in (-1, 1):
        carry(a, inner @ eye_node(side), eye_model)
    carry(a, inner @ node((0, 0, 0), (k["antennae"][0], 0, k["antennae"][1])), antennae_model)
    focus = Vector(FOCUS_HAND)
    free = Vector(k["free"][0])
    limbs = [
        ((0.32, -0.32, 0.01), focus, (0.75, -0.34, 0.65), 0.53, 0.64, 0.12, arm_upper_model, arm_lower_model),
        ((-0.32, -0.32, 0.0), free, (-0.84, -0.67, 0.5), 0.57, 0.72, 0.115, arm_upper_model, arm_lower_model),
    ]
    for side in (1, -1):
        limbs.append(((side * 0.2, -0.9, 0.0), Vector((side * 0.25, -1.65, 0.07)), (side * 0.28, -1.28, 0.6), 0.4, 0.43, 0.135, leg_upper_model, leg_lower_model))
    for start, end, pole, upper, lower, radius, upper_model, lower_model in limbs:
        start = chest_web @ Vector(start)
        elbow = _elbow(start, end, Vector(pole), upper, lower)
        girth = Matrix.Diagonal((radius / 0.12, 1, radius / 0.12, 1)) if upper_model is arm_upper_model else Matrix.Identity(4)
        girth = _TO_BLENDER @ girth @ _TO_WEB
        carry(a, _segment(start, elbow) @ girth, upper_model)
        carry(a, _segment(elbow, end) @ girth, lower_model)
        carry(a, node(tuple(elbow), (0, 0, 0), (radius, radius, radius)), joint_model)
    carry(a, node(FOCUS_HAND, (k["grip"], 0, 0)), hand_focus_model)
    carry(a, node(tuple(free), (0, 0, k["free"][1])), hand_free_model)
    if scope:
        carry(a, _TO_BLENDER @ _STAGE @ _TO_WEB, telescope_model)


@asset("obs-preview", grounded=True, budget=40000, preview=True, note="Review only: the whole character at rest (clip time 0).")
def preview(a):
    observer_model(a, "rest")


@asset("obs-preview-observe", grounded=True, budget=40000, preview=True, note="Review only: at the eyepiece (clip time 4) with the telescope staged as on the site.")
def preview_observe(a):
    observer_model(a, "observe", scope=True)


def _debug_counts(a, label):
    import os

    if not os.environ.get("OBS_DEBUG"):
        return
    rows = sorted(((p.triangles, i, p._part) for i, p in enumerate(a.pieces)), reverse=True)
    print(f"[obs] {label}: {a.triangles} tris in {len(a.pieces)} pieces; top:", rows[:40])
