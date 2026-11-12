"""Road, rail and hover vehicles. They travel toward -y (the bonnet or nose points to -y).

Bodywork is the tint part, glazing is glass, lamps and lift rings glow. Everything here is
invented toy-diorama artwork: no real marque, livery or measured dimension is reproduced.
"""

import math

import bmesh

from kit import jk
from kit import palette as P
from kit.jk import asset


# --------------------------------------------------------------------------------------------
# Shared construction
# --------------------------------------------------------------------------------------------
def ring(hw, z0, z1, rt=0.08, rb=0.03, seg=2, lean=0.0, belt=None):
    """A rounded-rectangle body section as (x, z) points: flat sides, a crowned-corner roof.

    `rt` and `rb` are the roof and sill corner radii. With `belt`, the sides stand vertical up
    to that height and lean inward by `lean` (run per unit rise) above it, like a real cabin.
    """
    pts = []

    def arc(cx, cz, r, start):
        for i in range(seg + 1):
            t = math.radians(start + 90 * i / seg)
            pts.append((cx + r * math.cos(t), cz + r * math.sin(t)))

    shoulder = z1 - rt
    top = hw - (lean * max(0.0, shoulder - belt) if belt is not None else 0.0)
    knee = None if belt is None else max(z0 + rb + 0.004, min(belt, shoulder - 0.004))
    arc(hw - rb, z0 + rb, rb, -90)
    if knee is not None:
        pts.append((hw, knee))
    arc(top - rt, shoulder, rt, 0)
    arc(-(top - rt), shoulder, rt, 90)
    if knee is not None:
        pts.append((-hw, knee))
    arc(-(hw - rb), z0 + rb, rb, 180)
    return pts


def hull(a, stations):
    """Skin a closed body through (y, section) stations, every section with the same count."""
    count = len(stations[0][1])
    verts, faces = [], []
    for y, pts in stations:
        verts += [(x, y, z) for x, z in pts]
    for s in range(len(stations) - 1):
        lo, hi = s * count, (s + 1) * count
        for i in range(count):
            j = (i + 1) % count
            faces.append((lo + j, lo + i, hi + i, hi + j))
    last = (len(stations) - 1) * count
    faces.append(tuple(range(count)))
    faces.append(tuple(range(last + count - 1, last - 1, -1)))
    return a.raw(verts, faces)


def wheel(a, x, y, r, width, side=1, sides=12, hub=P.STEEL, hub_r=0.58, tyre=P.INK, nut=True):
    """A road wheel centred on (x, y) and standing on the ground; `side` is the way its face
    looks (+1 toward +x). Leaner than `parts.wheel`: the tyre is a closed drum and the hub cap
    and wheel nut sit on its outer face only."""
    b = min(width * 0.3, r * 0.25)
    edge = x - side * width / 2
    a.lathe([(r, 0), (r, width - b), (r - b, width)], sides).rot(y=90 * side).move(edge, y, r).color(tyre)
    hr = r * hub_r
    a.lathe([(hr, 0), (hr - 0.014, 0.016)], sides, cap_bottom=False).move(0, 0, width - 0.004).rot(y=90 * side).move(
        edge, y, r
    ).part("metal").color(hub)
    if nut:
        a.lathe([(hr * 0.34, 0), (hr * 0.26, 0.012)], 6, cap_bottom=False).move(0, 0, width + 0.01).rot(y=90 * side).move(
            edge, y, r
        ).color(P.CHARCOAL)


def axle(a, track, y, r, width, **kw):
    """A left and a right wheel at depth y, `track` apart centre to centre."""
    for side in (-1, 1):
        wheel(a, side * track / 2, y, r, width, side, **kw)


def arches(body, wheels, gap, depth=0.24, sides=12):
    """Cut a wheel arch into `body` for each (x, y, wheel radius), `gap` clear of the tyre and
    `depth` deep from the wheel centre plane, leaving dark wells behind."""
    reach = depth + 0.3  # the cutter starts inside the body and ends well outside it
    for x, y, wr in wheels:
        start = x - depth if x > 0 else x - 0.3
        body.cut(jk.cyl(wr + gap, reach, sides, bevel=0).rot(y=90).move(start, y, wr).color(P.INK))
    return body


def flare(a, x, y, r, depth=0.08, lip=0.04, gap=0.02, n=5, part="tint", color=P.WHITE, sweep=(0, 180)):
    """A fender lip over a wheel: a half ring standing proud of the body side."""
    outer, inner = [], []
    for i in range(n + 1):
        t = math.radians(sweep[0] + (sweep[1] - sweep[0]) * i / n)
        c, s = math.cos(t), math.sin(t)
        outer.append((y + c * (r + gap + lip), r + s * (r + gap + lip)))
        inner.append((y + c * (r + gap), r + s * (r + gap)))
    return a.profile_x(outer + inner[::-1], depth, bevel=0).move(x, 0, 0).part(part).color(color)


def lamp(a, x, y, z, w, h, color, depth=0.03):
    """A lamp lens: a small unlit-emissive block centred on (x, y) with its base at z."""
    return a.box(w, depth, h, bevel=0).move(x, y, z).part("glow").color(color)


def slab(a, y0, z0, y1, z1, width, thick=0.02, lift=0.008, out=-1, taper=1.0, bevel=None):
    """A panel lying on the slope from (y0, z0) up to (y1, z1), `lift` proud of it.

    `out` is -1 when the slope faces forward (a windscreen) and +1 when it faces back."""
    dy, dz = y1 - y0, z1 - z0
    length = math.hypot(dy, dz)
    p = a.box(width, thick, length, bevel=bevel, taper=(taper, 1))
    p.move(0, out * (lift - thick / 2), 0).rot(x=math.degrees(math.atan2(-dy, dz))).move(0, y0, z0)
    return p


def checker(a, x, y0, y1, z0, z1, cols, rows=2, dark=P.INK, light=P.OFF_WHITE, thick=0.016):
    """A checkered trim band with its outer face at x (x > 0), as one closed strip."""
    verts, faces, tones = [], [], []
    for r in range(rows + 1):
        for c in range(cols + 1):
            verts.append((x, y0 + (y1 - y0) * c / cols, z0 + (z1 - z0) * r / rows))
    at = lambda c, r: r * (cols + 1) + c
    for r in range(rows):
        for c in range(cols):
            faces.append((at(c, r), at(c + 1, r), at(c + 1, r + 1), at(c, r + 1)))
            tones.append(dark if (r + c) % 2 == 0 else light)
    base = len(verts)
    verts += [(x - thick, y0, z0), (x - thick, y1, z0), (x - thick, y1, z1), (x - thick, y0, z1)]
    faces.append(tuple(at(c, 0) for c in range(cols + 1)) + (base + 1, base))
    faces.append(tuple(at(c, rows) for c in range(cols, -1, -1)) + (base + 3, base + 2))
    faces.append(tuple(at(0, r) for r in range(rows, -1, -1)) + (base, base + 3))
    faces.append(tuple(at(cols, r) for r in range(rows + 1)) + (base + 2, base + 1))
    faces.append((base, base + 1, base + 2, base + 3))
    piece = a.raw(verts, faces).color(dark)
    for face, tone in zip(list(piece.bm.faces), tones):  # the squares come first; edges stay dark
        c = jk.col(tone)
        for loop in face.loops:
            loop[piece.layer] = (c[0], c[1], c[2], 1.0)
    return piece


# --------------------------------------------------------------------------------------------
# Cars
# --------------------------------------------------------------------------------------------
@asset("car", tint="#c4452f", budget=1300)
def car(a):
    """A friendly two-box hatchback: the benchmark road car."""
    w, length = 0.86, 1.72
    half = length / 2
    r, wx = 0.19, 0.378
    # Chassis shadow line, then the painted shell with real wheel arches.
    a.loft([(-half + 0.04, 0.37, 0.06, 0.2), (half - 0.04, 0.37, 0.06, 0.2)], 10, 4).color(P.INK)
    shell = a.loft(
        [
            (-half, 0.34, 0.1, 0.33),
            (-half + 0.07, 0.42, 0.15, 0.34),
            (-0.25, w / 2, 0.17, 0.36),
            (0.5, w / 2, 0.18, 0.37),
            (half - 0.06, 0.41, 0.16, 0.36),
            (half, 0.34, 0.1, 0.35),
        ],
        12,
        4.5,
    ).part("tint").color(P.SHADE_1, P.WHITE)
    arches(shell, [(s * wx, y, r) for s in (-1, 1) for y in (-0.54, 0.52)], 0.032)
    # Glasshouse under a crowned roof that overhangs the glass.
    a.loft([(-0.27, 0.33, 0.02, 0.5), (-0.1, 0.355, 0.14, 0.615), (0.42, 0.355, 0.14, 0.615), (0.6, 0.32, 0.02, 0.5)], 12, 5).part(
        "glass"
    ).color(P.GLASS_DARK, P.GLASS_TINTED)
    a.loft(
        [(-0.2, 0.3, 0.018, 0.752), (-0.13, 0.365, 0.034, 0.758), (0.45, 0.365, 0.034, 0.758), (0.52, 0.3, 0.018, 0.752)], 12, 4
    ).part("tint").color(P.WHITE)
    for side in (-1, 1):
        a.box(0.03, 0.055, 0.25, bevel=0).move(side * 0.345, 0.13, 0.5).part("tint").color(P.SHADE_1)
        # Door mirror and a dark sill line between the arches.
        a.box(0.07, 0.05, 0.05, bevel=0).move(side * 0.455, -0.2, 0.5).part("tint").color(P.SHADE_1)
        a.box(0.02, 0.6, 0.035, bevel=0).move(side * 0.425, -0.01, 0.215).color(P.INK)
    axle(a, wx * 2, -0.54, r, 0.14)
    axle(a, wx * 2, 0.52, r, 0.14)
    for side in (-1, 1):
        lamp(a, side * 0.27, -half + 0.0, 0.32, 0.17, 0.08, P.GLOW_WHITE, 0.04)
        lamp(a, side * 0.27, half - 0.02, 0.36, 0.17, 0.06, P.GLOW_RED, 0.04)
    a.box(0.3, 0.03, 0.06, bevel=0.01).move(0, -half, 0.31).color(P.INK)
    a.box(w - 0.06, 0.07, 0.07, bevel=0.025).move(0, -half + 0.01, 0.2).part("metal").color(P.STEEL)
    a.box(w - 0.06, 0.07, 0.07, bevel=0.025).move(0, half - 0.05, 0.2).part("metal").color(P.STEEL)


@asset("taxi", tint="#f2c230", budget=1400)
def taxi(a):
    """A three-box saloon cab: long bonnet and boot, an upright cabin, a checker band and a lit
    roof sign."""
    half = 0.875
    r, wx = 0.185, 0.378
    a.box(0.74, 1.62, 0.12, bevel=0).move(0, 0, 0.14).color(P.INK)
    shell = a.loft(
        [
            (-half, 0.35, 0.085, 0.325),
            (-half + 0.06, 0.42, 0.135, 0.335),
            (-0.34, 0.43, 0.152, 0.347),
            (-0.26, 0.43, 0.16, 0.355),
            (0.44, 0.43, 0.16, 0.355),
            (half - 0.06, 0.42, 0.14, 0.345),
            (half, 0.36, 0.09, 0.34),
        ],
        12,
        4.5,
    ).part("tint").color(P.SHADE_1, P.WHITE)
    arches(shell, [(s * wx, y, r) for s in (-1, 1) for y in (-0.56, 0.55)], 0.032)
    # An upright cabin set in the middle of the car.
    a.loft([(-0.36, 0.33, 0.02, 0.5), (-0.2, 0.355, 0.135, 0.61), (0.28, 0.355, 0.135, 0.61), (0.4, 0.33, 0.02, 0.5)], 12, 5).part(
        "glass"
    ).color(P.GLASS_DARK, P.GLASS_TINTED)
    a.loft(
        [(-0.29, 0.3, 0.018, 0.742), (-0.22, 0.365, 0.034, 0.748), (0.29, 0.365, 0.034, 0.748), (0.35, 0.3, 0.018, 0.742)], 12, 4
    ).part("tint").color(P.WHITE)
    for side in (-1, 1):
        for y in (0.02, 0.27):
            a.box(0.03, 0.05, 0.25, bevel=0).move(side * 0.345, y, 0.5).part("tint").color(P.SHADE_1)
        a.box(0.07, 0.05, 0.05, bevel=0).move(side * 0.455, -0.3, 0.5).color(P.INK)
        band = checker(a, 0.434, -0.33, 0.33, 0.305, 0.415, 7)
        if side < 0:
            band.scale(-1, 1, 1)
    # The roof sign: a lit lozenge on a dark foot.
    a.box(0.3, 0.12, 0.03, bevel=0).move(0, 0.02, 0.775).color(P.INK)
    a.box(0.26, 0.09, 0.085, bevel=0.028).move(0, 0.02, 0.8).part("glow").color(P.LAMP)
    axle(a, wx * 2, -0.56, r, 0.14)
    axle(a, wx * 2, 0.55, r, 0.14)
    # A wide slatted grille between square lamps, and dark bumpers.
    a.box(0.36, 0.03, 0.075, bevel=0).move(0, -half - 0.002, 0.3).color(P.INK)
    a.box(0.34, 0.02, 0.014, bevel=0).move(0, -half - 0.014, 0.33).part("metal").color(P.CHROME)
    for side in (-1, 1):
        lamp(a, side * 0.285, -half + 0.002, 0.305, 0.13, 0.07, P.GLOW_WHITE, 0.04)
        lamp(a, side * 0.25, half - 0.016, 0.345, 0.22, 0.05, P.GLOW_RED, 0.04)
    a.box(0.82, 0.08, 0.075, bevel=0.025).move(0, -half + 0.012, 0.19).color(P.CHARCOAL)
    a.box(0.82, 0.08, 0.075, bevel=0.025).move(0, half - 0.05, 0.19).color(P.CHARCOAL)


# --------------------------------------------------------------------------------------------
# Vans and lorries
# --------------------------------------------------------------------------------------------
@asset("van", tint="#e6e8ea", budget=1400)
def van(a):
    """A tall one-box delivery van: stub nose, raked screen, ribbed cargo roof, rear doors."""
    hw, belt, lean = 0.45, 0.56, 0.12
    r, wx = 0.2, 0.385

    def sec(y, half, z0, z1, rt, rb=0.035):
        return (y, ring(half, z0, z1, rt, rb, 2, lean, belt))

    a.loft([(-0.92, 0.4, 0.06, 0.18), (0.92, 0.4, 0.06, 0.18)], 10, 4).color(P.INK)
    body = hull(
        a,
        [
            sec(-0.975, 0.37, 0.27, 0.5, 0.035),
            sec(-0.935, hw, 0.2, 0.555, 0.05),
            sec(-0.76, hw, 0.2, 0.62, 0.06),
            sec(-0.5, hw, 0.2, 0.965, 0.1),
            sec(0.2, hw, 0.2, 0.975, 0.1),
            sec(0.935, hw, 0.2, 0.97, 0.1),
            sec(0.975, hw - 0.04, 0.25, 0.93, 0.08),
        ],
    ).part("tint").color(P.SHADE_1, P.WHITE)
    arches(body, [(s * wx, y, r) for s in (-1, 1) for y in (-0.6, 0.6)], 0.035)
    # Glazing: a big raked screen, cab side windows and two rear-door lights.
    slab(a, -0.745, 0.64, -0.516, 0.94, 0.74, taper=0.82, bevel=0.008).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    tilt = math.degrees(math.atan(lean))
    for side in (-1, 1):
        a.profile_x([(-0.66, 0.6), (-0.28, 0.6), (-0.28, 0.83), (-0.49, 0.83)], 0.02, bevel=0).move(side * 0.446, 0, 0).rot(
            y=-side * tilt, pivot=(side * hw, 0, belt)
        ).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
        a.box(0.24, 0.02, 0.2, bevel=0).move(side * 0.17, 0.972, 0.62).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
        # Sliding-door rail, door pull, rub strip and a tall mirror.
        a.box(0.014, 0.74, 0.024, bevel=0).move(side * 0.45, 0.2, 0.535).color(P.CHARCOAL)
        a.box(0.016, 0.07, 0.024, bevel=0).move(side * 0.452, -0.14, 0.47).part("metal").color(P.CHROME)
        a.box(0.016, 0.68, 0.06, bevel=0).move(side * 0.45, 0.0, 0.215).color(P.CHARCOAL)
        a.box(0.05, 0.035, 0.13, bevel=0).move(side * 0.49, -0.69, 0.62).color(P.INK)
        lamp(a, side * 0.27, -0.972, 0.335, 0.13, 0.085, P.GLOW_WHITE, 0.04)
        lamp(a, side * 0.385, 0.968, 0.34, 0.05, 0.2, P.GLOW_RED, 0.03)
    a.box(0.3, 0.03, 0.06, bevel=0).move(0, -0.975, 0.345).color(P.INK)
    a.box(0.012, 0.014, 0.6, bevel=0).move(0, 0.975, 0.3).color(P.CHARCOAL)
    a.box(0.1, 0.02, 0.03, bevel=0).move(0, 0.982, 0.52).part("metal").color(P.CHROME)
    a.box(0.88, 0.09, 0.12, bevel=0.03).move(0, -0.955, 0.15).color(P.CHARCOAL)
    a.box(0.86, 0.08, 0.08, bevel=0.025).move(0, 0.95, 0.16).color(P.CHARCOAL)
    # Pressed roof ribs: the read from above.
    for x in (-0.2, 0, 0.2):
        a.box(0.08, 1.12, 0.03, bevel=0.01).move(x, 0.3, 0.958).part("tint").color(P.SHADE_1)
    axle(a, wx * 2, -0.6, r, 0.14)
    axle(a, wx * 2, 0.6, r, 0.14)


@asset("truck", tint="#3d6fb5", budget=1400)
def truck(a):
    """A cab-over lorry: a tall tilt cab with a roof deflector, and a separate box body on a
    ladder chassis."""
    hw, belt, lean = 0.48, 0.74, 0.08
    r = 0.23

    def sec(y, half, z0, z1, rt, rb=0.04):
        return (y, ring(half, z0, z1, rt, rb, 2, lean, belt))

    a.box(0.5, 2.84, 0.12, bevel=0).move(0, 0.16, 0.29).color(P.CHARCOAL)
    cab = hull(
        a,
        [
            sec(-1.425, 0.43, 0.42, 0.74, 0.03, 0.03),
            sec(-1.385, hw, 0.36, 0.76, 0.035),
            sec(-1.25, hw, 0.34, 1.12, 0.1),
            sec(-0.76, hw, 0.34, 1.12, 0.1),
            sec(-0.72, hw - 0.04, 0.38, 1.08, 0.08),
        ],
    ).part("tint").color(P.SHADE_1, P.WHITE)
    arches(cab, [(s * 0.405, -1.02, r) for s in (-1, 1)], 0.04)
    slab(a, -1.377, 0.782, -1.261, 1.091, 0.84, taper=0.81, bevel=0.008).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    tilt = math.degrees(math.atan(lean))
    for side in (-1, 1):
        a.profile_x([(-1.33, 0.78), (-0.9, 0.78), (-0.9, 1.0), (-1.25, 1.0)], 0.02, bevel=0).move(side * 0.476, 0, 0).rot(
            y=-side * tilt, pivot=(side * hw, 0, belt)
        ).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
        a.box(0.04, 0.05, 0.22, bevel=0).move(side * 0.535, -1.33, 0.8).color(P.INK)
        a.box(0.07, 0.02, 0.02, bevel=0).move(side * 0.5, -1.33, 0.96).color(P.INK)
        lamp(a, side * 0.33, -1.43, 0.5, 0.13, 0.1, P.GLOW_WHITE, 0.03)
        lamp(a, side * 0.36, 1.612, 0.285, 0.16, 0.05, P.GLOW_RED, 0.03)
    # Grille, bumper and the wind deflector that fairs the cab into the box.
    a.box(0.46, 0.02, 0.2, bevel=0).move(0, -1.43, 0.47).color(P.INK)
    for z in (0.52, 0.6):
        a.box(0.44, 0.02, 0.025, bevel=0).move(0, -1.438, z).part("metal").color(P.CHROME)
    a.box(0.98, 0.1, 0.13, bevel=0.03).move(0, -1.39, 0.23).color(P.CHARCOAL)
    a.profile_x([(-1.2, 1.1), (-0.76, 1.1), (-0.76, 1.32), (-0.88, 1.3), (-1.06, 1.21)], 0.8, bevel=0.03).part("tint").color(
        P.SHADE_1, P.WHITE
    )
    # The box body on its subframe, with capped corners, a livery band and a roller door.
    cream = jk.shade(P.OFF_WHITE, -0.12)
    a.box(0.9, 2.2, 0.07, bevel=0).move(0, 0.48, 0.385).color(P.CHARCOAL)
    a.box(1.0, 2.24, 0.91, bevel=0.03).move(0, 0.48, 0.44).color(cream, P.OFF_WHITE)
    for sx in (-1, 1):
        for y in (-0.62, 1.58):
            a.box(0.05, 0.05, 0.9, bevel=0).move(sx * 0.482, y, 0.445).color(P.STEEL)
        a.box(0.04, 2.2, 0.04, bevel=0).move(sx * 0.484, 0.48, 1.316).color(P.STEEL)
        a.box(0.012, 2.06, 0.16, bevel=0).move(sx * 0.5, 0.48, 0.8).part("tint").color(P.WHITE)
    a.box(0.86, 0.016, 0.76, bevel=0).move(0, 1.598, 0.5).color(P.CONCRETE)
    for y in (-0.1, 0.48, 1.06):
        a.box(0.94, 0.05, 0.02, bevel=0).move(0, y, 1.338).color(cream)
    for z in (0.75, 1.0):
        a.box(0.86, 0.02, 0.014, bevel=0).move(0, 1.6, z).color(P.CONCRETE_DARK)
    a.box(0.16, 0.03, 0.03, bevel=0).move(0, 1.606, 0.54).part("metal").color(P.CHROME)
    a.box(0.92, 0.05, 0.06, bevel=0).move(0, 1.6, 0.28).color(P.CHARCOAL)
    # Running gear: a fuel tank, a battery box and guards over the twin rear wheels.
    a.cyl(0.1, 0.44, 8, bevel=0.02).rot(x=90).move(0.36, -0.06, 0.31).part("metal").color(P.STEEL)
    a.box(0.16, 0.36, 0.17, bevel=0.025).move(-0.37, -0.3, 0.22).color(P.CHARCOAL)
    for side in (-1, 1):
        flare(a, side * 0.37, 0.95, r, depth=0.27, lip=0.025, gap=0.035, part="base", color=P.CHARCOAL, sweep=(8, 172))
    axle(a, 0.81, -1.02, r, 0.16)
    axle(a, 0.74, 0.95, r, 0.25, nut=False)


# --------------------------------------------------------------------------------------------
# Buses
# --------------------------------------------------------------------------------------------
@asset("bus", tint="#2e9e6e", budget=1800)
def bus(a):
    """A low-floor city bus: a glazed band between the body and a deep roof, two kerb-side
    doors, a route display, bug-ear mirrors and roof-top packs."""
    hw, half = 0.5, 1.625
    belt, cant = 0.62, 1.07
    r, wx = 0.245, 0.42

    def low(y, inset):
        return (y, ring(hw - inset, 0.2 + inset, belt, 0.012, 0.05))

    def pane(y, inset):
        return (y, ring(hw - 0.032 - inset, belt - 0.02, cant + 0.01, 0.02, 0.012))

    def top(y, inset):
        return (y, ring(hw - inset, cant - 0.015, 1.2 - inset * 0.5, 0.1, 0.012))

    a.box(0.86, 3.06, 0.14, bevel=0).move(0, 0, 0.11).color(P.INK)
    lower = hull(a, [low(-half, 0.05), low(-half + 0.05, 0), low(half - 0.05, 0), low(half, 0.05)])
    lower.part("tint").color(P.SHADE_1, P.WHITE)
    arches(lower, [(s * wx, y, r) for s in (-1, 1) for y in (-1.0, 0.95)], 0.04, depth=0.26)
    hull(a, [pane(-half + 0.004, 0.05), pane(-half + 0.054, 0), pane(1.3, 0)]).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    hull(a, [top(-half + 0.006, 0.05), top(-half + 0.056, 0), top(half - 0.05, 0), top(half, 0.05)]).part("tint").color(
        P.SHADE_1, P.WHITE
    )
    # The solid rear quarter over the engine, with its own back light.
    hull(a, [(1.28, ring(hw, belt - 0.01, cant, 0.012, 0.012)), (half - 0.05, ring(hw, belt - 0.01, cant, 0.012, 0.012)),
             (half, ring(hw - 0.05, belt - 0.01, cant, 0.012, 0.012))]).part("tint").color(P.WHITE)
    a.box(0.62, 0.02, 0.26, bevel=0).move(0, half - 0.006, 0.72).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    # Window pillars on the driver's side; the kerb side makes room for two glazed doors.
    post = cant - belt + 0.02

    def pillar(side, y, width=0.05):
        a.box(0.034, width, post, bevel=0).move(side * (hw - 0.018), y, belt - 0.01).part("tint").color(P.SHADE_1)

    for y in (-1.02, -0.5, 0.02, 0.54, 1.02):
        pillar(1, y)
    for y in (-1.54, -1.06, -0.56, -0.14, 0.38, 0.86):
        pillar(-1, y)
    for y in (-1.3, 0.12):
        a.box(0.02, 0.4, cant - 0.27, bevel=0).move(-hw - 0.002, y, 0.26).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
        a.box(0.024, 0.014, cant - 0.27, bevel=0).move(-hw - 0.003, y, 0.26).color(P.INK)
        a.box(0.024, 0.44, 0.03, bevel=0).move(-hw - 0.003, y, 0.235).color(P.INK)
    for side in (-1, 1):
        a.box(0.012, 3.1, 0.045, bevel=0).move(side * hw, 0, 0.545).color(P.OFF_WHITE)
    # Front: a deep screen, the route display, lamps, bumper and bug-ear mirrors.
    a.box(0.8, 0.02, 0.2, bevel=0).move(0, -half - 0.002, 0.42).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    a.box(0.74, 0.04, 0.1, bevel=0).move(0, -half + 0.014, 1.075).color(P.INK)
    a.box(0.54, 0.02, 0.055, bevel=0).move(0, -half - 0.006, 1.097).part("glow").color(P.GLOW_ORANGE)
    a.box(0.98, 0.09, 0.1, bevel=0.03).move(0, -half + 0.01, 0.14).color(P.CHARCOAL)
    a.box(0.98, 0.09, 0.1, bevel=0.03).move(0, half - 0.01, 0.14).color(P.CHARCOAL)
    for side in (-1, 1):
        lamp(a, side * 0.35, -half - 0.004, 0.28, 0.15, 0.07, P.GLOW_WHITE, 0.03)
        lamp(a, side * 0.41, half + 0.002, 0.3, 0.07, 0.24, P.GLOW_RED, 0.03)
        a.tube([(side * 0.44, -half + 0.04, 1.13), (side * 0.56, -half - 0.07, 1.1), (side * 0.57, -half - 0.09, 1.0)], 0.014, 5).color(P.INK)
        a.box(0.045, 0.05, 0.2, bevel=0.012).move(side * 0.57, -half - 0.09, 0.8).color(P.INK)
    # Rear: engine louvres.
    a.box(0.6, 0.02, 0.2, bevel=0).move(0, half - 0.004, 0.3).color(P.INK)
    for z in (0.34, 0.42):
        a.box(0.56, 0.02, 0.025, bevel=0).move(0, half + 0.004, z).part("metal").color(P.CHROME)
    # Roof: a traction pack up front, hatches and the air-conditioning pod.
    a.box(0.66, 0.95, 0.085, bevel=0.035).move(0, -0.95, 1.19).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.box(0.62, 0.52, 0.1, bevel=0.035).move(0, 0.62, 1.19).color(P.CONCRETE, P.OFF_WHITE)
    a.box(0.4, 0.3, 0.014, bevel=0).move(0, 0.62, 1.284).color(P.CHARCOAL)
    for y in (-0.12, 1.25):
        a.box(0.32, 0.3, 0.03, bevel=0.012).move(0, y, 1.19).part("tint").color(P.SHADE_2)
    axle(a, wx * 2, -1.0, r, 0.16)
    axle(a, wx * 2, 0.95, r, 0.16)


# --------------------------------------------------------------------------------------------
# Mine haulage
# --------------------------------------------------------------------------------------------
def big_wheel(a, x, y, r, width, side, dished=True):
    """An earthmover wheel: a fat square-shouldered tyre on a deep body-colour rim.

    The rim is a closed plug let into the tyre, so its dish reads from the outside only."""
    b = 0.06
    edge = x - side * width / 2
    a.lathe([(r, 0), (r, width - b), (r - b, width), (r * 0.6, width)], 12, cap_top=False).rot(y=90 * side).move(edge, y, r).color(
        P.INK, P.CHARCOAL
    )
    if dished:
        rim = [(0, -0.11), (r * 0.6, -0.11), (r * 0.6, 0), (r * 0.5, -0.07), (r * 0.25, -0.07), (r * 0.2, 0.0), (0, 0.0)]
    else:
        rim = [(r * 0.6, 0), (r * 0.52, 0.03), (0, 0.03)]
    a.lathe(rim, 12, cap_bottom=False).move(0, 0, width).rot(y=90 * side).move(edge, y, r).part("tint").color(P.SHADE_2, P.WHITE)


@asset("haul-truck", tint="#e0a830", budget=1800)
def haul_truck(a):
    """A giant mine dump truck: man-high wheels, a ribbed tipping bed heaped with ore, a cab
    guard reaching over the offset cab, and a ladder up the front."""
    r = 0.42
    # Frame, radiator housing and bumper.
    a.box(0.6, 2.2, 0.26, bevel=0).move(0, 0.1, 0.4).color(P.CHARCOAL)
    a.box(0.78, 0.4, 0.5, bevel=0.04).move(0, -1.1, 0.4).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(1.4, 0.11, 0.17, bevel=0.035).move(0, -1.27, 0.3).color(P.CHARCOAL)
    a.box(0.34, 0.02, 0.3, bevel=0).move(-0.17, -1.302, 0.52).color(P.INK)
    for z in (0.6, 0.72):
        a.box(0.32, 0.02, 0.03, bevel=0).move(-0.17, -1.31, z).part("metal").color(P.CHROME)
    # Deck over the front wheels, with the engine cover and the offset cab on it.
    a.box(1.5, 0.86, 0.07, bevel=0.02).move(0, -0.9, 0.88).part("tint").color(P.SHADE_2, P.SHADE_1)
    for side in (-1, 1):
        a.box(0.3, 0.05, 0.2, bevel=0).move(side * 0.58, -1.3, 0.7).part("tint").color(P.SHADE_2, P.SHADE_1)
        lamp(a, side * 0.58, -1.33, 0.75, 0.16, 0.09, P.GLOW_WHITE, 0.03)
        lamp(a, side * 0.22, 1.2, 0.48, 0.1, 0.07, P.GLOW_RED, 0.03)
    a.box(0.68, 0.62, 0.3, bevel=0.04).move(-0.32, -0.95, 0.95).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(0.52, 0.6, 0.15, bevel=0.03).move(0.42, -0.92, 0.95).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(0.48, 0.56, 0.3, bevel=0.02).move(0.42, -0.92, 1.08).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    a.box(0.56, 0.64, 0.06, bevel=0.02).move(0.42, -0.92, 1.37).part("tint").color(P.WHITE)
    for sx in (0.175, 0.665):
        for sy in (-1.205, -0.635):
            a.box(0.04, 0.04, 0.3, bevel=0).move(sx, sy, 1.08).part("tint").color(P.SHADE_1)
    # The tipping bed: floor, headboard and cab guard in one folded plate, plus two flanks.
    a.profile_x(
        [(-1.3, 1.5), (-0.52, 1.44), (-0.33, 0.8), (1.325, 1.1), (1.325, 1.17), (-0.26, 0.88), (-0.44, 1.5), (-1.3, 1.57)],
        1.44,
        bevel=0.02,
    ).part("tint").color(P.SHADE_1, P.WHITE)
    floor = lambda y: 0.8 + (y + 0.33) * 0.3 / 1.655
    for side in (-1, 1):
        a.profile_x([(-0.33, 0.8), (1.325, 1.1), (1.325, 1.26), (1.04, 1.5), (-0.5, 1.5)], 0.07, bevel=0.015).move(
            side * 0.72, 0, 0
        ).part("tint").color(P.SHADE_1, P.WHITE)
        a.box(0.1, 1.5, 0.06, bevel=0.02).move(side * 0.735, 0.27, 1.47).part("tint").color(P.WHITE)
        for y in (-0.05, 0.62):
            a.box(0.045, 0.09, 1.48 - floor(y), bevel=0).move(side * 0.772, y, floor(y)).part("tint").color(P.SHADE_2, P.SHADE_1)
    for x in (-0.4, 0, 0.4):
        a.box(0.07, 0.72, 0.03, bevel=0).move(x, -0.92, 1.535).rot(x=5.1, pivot=(0, -0.92, 1.55)).part("tint").color(P.SHADE_1)
    a.box(0.06, 0.06, 0.05, bevel=0).move(0.55, -1.2, 1.575).part("glow").color(P.GLOW_ORANGE)
    # Ore.
    ore_low, ore_high = jk.mix(P.STONE_DARK, P.RUST, 0.45), jk.mix(P.STONE, P.CLAY, 0.35)
    a.blob(0.62, 2, (1.0, 1.24, 0.44), lumps=0.2, seed=5).move(0, 0.42, 1.2).color(ore_low, ore_high)
    for x, y, z, size, seed in ((0.16, 0.14, 1.42, 0.2, 11), (-0.2, 0.52, 1.4, 0.17, 7), (0.14, 0.78, 1.36, 0.15, 3)):
        a.blob(size, 1, (1.0, 1.1, 0.8), lumps=0.25, seed=seed).move(x, y, z).color(ore_low, ore_high)
    # The access ladder slanting up the front to the deck, and a deck rail.
    lx0, lz0, lx1, lz1 = 0.04, 0.36, 0.6, 0.92
    nx, nz = -0.05, 0.05
    for k in (-1, 1):
        a.tube([(lx0 + k * nx, -1.35, lz0 + k * nz), (lx1 + k * nx, -1.35, lz1 + k * nz)], 0.015, 4).color(P.CHARCOAL)
    for i in range(4):
        t = (i + 0.5) / 4
        x, z = lx0 + (lx1 - lx0) * t, lz0 + (lz1 - lz0) * t
        a.tube([(x - nx, -1.35, z - nz), (x + nx, -1.35, z + nz)], 0.012, 4, caps="none").color(P.CHARCOAL)
    rail = [(-0.72, -0.5, 0.95), (-0.72, -0.5, 1.16), (-0.72, -1.3, 1.16), (-0.02, -1.3, 1.16), (-0.02, -1.3, 0.95)]
    a.tube(rail, 0.014, 4).color(P.CHARCOAL)
    a.tube([(-0.72, -1.3, 0.95), (-0.72, -1.3, 1.16)], 0.014, 4).color(P.CHARCOAL)
    for side in (-1, 1):
        big_wheel(a, side * 0.56, -0.8, r, 0.3, side)
        big_wheel(a, side * 0.5, 0.62, r, 0.42, side, dished=False)


# --------------------------------------------------------------------------------------------
# Rail
# --------------------------------------------------------------------------------------------
@asset("tram", tint="#f2efe8", budget=1800)
def tram(a):
    """A two-section articulated street tram: raked cabs at both ends, a bellows joint, doors on
    both sides, roof packs and a single-arm pantograph. It rides 0.15 up, on the rail head."""
    end, joint = 1.825, 0.14

    def half_car():
        skirt = lambda y, hw, lift: (y, ring(hw, 0.24 + lift, 0.46, 0.012, 0.03))
        lower = lambda y, hw: (y, ring(hw, 0.44, 0.68, 0.012, 0.012))
        pane = lambda y, hw, top: (y, ring(hw, 0.66, top, 0.02, 0.012))
        roof = lambda y, hw, top: (y, ring(hw, 1.04, top, 0.09, 0.012))
        hull(a, [skirt(-end, 0.36, 0.05), skirt(-end + 0.085, 0.5, 0), skirt(-joint, 0.5, 0)]).color(jk.shade(P.BLUE, -0.12), P.BLUE)
        hull(a, [lower(-end + 0.01, 0.36), lower(-end + 0.095, 0.496), lower(-joint, 0.496)]).part("tint").color(P.SHADE_1, P.WHITE)
        hull(a, [pane(-end + 0.035, 0.34, 0.84), pane(-end + 0.165, 0.466, 1.06), pane(-joint, 0.466, 1.06)]).part("glass").color(
            P.GLASS_DARK, P.GLASS_TINTED
        )
        hull(a, [roof(-end + 0.135, 0.38, 1.1), roof(-end + 0.245, 0.5, 1.15), roof(-joint, 0.5, 1.15)]).part("tint").color(
            P.SHADE_1, P.WHITE
        )
        for side in (-1, 1):
            for y, width in ((-1.45, 0.05), (-1.18, 0.05), (-0.72, 0.05), (-0.2, 0.12)):
                a.box(0.034, width, 0.4, bevel=0).move(side * 0.482, y, 0.67).part("tint").color(P.SHADE_1)
            a.box(0.02, 0.41, 0.74, bevel=0).move(side * 0.502, -0.95, 0.3).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
            a.box(0.024, 0.014, 0.74, bevel=0).move(side * 0.503, -0.95, 0.3).color(P.INK)
        a.box(0.62, 0.06, 0.1, bevel=0.02).move(0, -end - 0.0, 0.27).color(P.CHARCOAL)
        a.box(0.5, 0.03, 0.07, bevel=0).move(0, -end + 0.142, 1.045).color(P.INK)

    with a.group() as front:
        half_car()
    front.mirror("y")
    # The bellows between the two sections.
    fold = lambda y, hw: (y, ring(hw, 0.27 + (0.47 - hw), 1.12 - (0.47 - hw), 0.07, 0.03, 1))
    hull(a, [fold(-joint, 0.47), fold(-0.07, 0.435), fold(0, 0.47), fold(0.07, 0.435), fold(joint, 0.47)]).color(P.INK, P.CHARCOAL)
    # Lamps and the lit route display at the leading end.
    for side in (-1, 1):
        lamp(a, side * 0.27, -end + 0.012, 0.52, 0.1, 0.055, P.GLOW_WHITE, 0.04)
        lamp(a, side * 0.27, end - 0.012, 0.52, 0.1, 0.055, P.GLOW_RED, 0.04)
    a.box(0.36, 0.02, 0.04, bevel=0).move(0, -end + 0.126, 1.06).part("glow").color(P.GLOW_ORANGE)
    # Three bogies, their wheels peeping below the skirts.
    for y in (-1.12, 0.0, 1.12):
        a.box(0.84, 0.56, 0.1, bevel=0).move(0, y, 0.2).color(P.INK)
        for side in (-1, 1):
            for dy in (-0.17, 0.17):
                a.lathe([(0.1, 0), (0.088, 0.06)], 8).rot(y=90 * side).move(side * 0.4, y + dy, 0.25).part(
                    "metal"
                ).color(P.STEEL_DARK)
    # Roof: climate packs, a resistor grid and the pantograph.
    a.box(0.6, 0.5, 0.09, bevel=0.03).move(0, -1.12, 1.15).color(P.CONCRETE, P.OFF_WHITE)
    a.box(0.6, 0.62, 0.09, bevel=0.03).move(0, 0.72, 1.15).color(P.CONCRETE, P.OFF_WHITE)
    a.box(0.46, 0.34, 0.07, bevel=0.02).move(0, 1.32, 1.15).color(P.CONCRETE_DARK)
    a.box(0.34, 0.46, 0.035, bevel=0.01).move(0, -0.55, 1.15).color(P.STEEL_DARK)
    a.tube([(0, -0.4, 1.19), (0, -0.74, 1.28)], 0.017, 5).color(P.STEEL_DARK)
    a.tube([(0, -0.74, 1.28), (0, -0.5, 1.375)], 0.013, 5).color(P.STEEL_DARK)
    for dy in (-0.045, 0.045):
        a.box(0.46, 0.028, 0.016, bevel=0).move(0, -0.5 + dy, 1.375).color(P.CHARCOAL)
    a.box(0.03, 0.12, 0.012, bevel=0).move(0, -0.5, 1.37).color(P.STEEL_DARK)


def _row(rows, y):
    """Interpolate (y, hw, z0, z1, rt, rb) section rows at y."""
    if y <= rows[0][0]:
        return rows[0]
    for p, q in zip(rows, rows[1:]):
        if y <= q[0]:
            t = (y - p[0]) / (q[0] - p[0])
            return tuple(p[i] + (q[i] - p[i]) * t for i in range(len(p)))
    return rows[-1]


def _crown(row, x):
    """Height of a `ring` section's roof at x."""
    hw, z1, rt = row[1], row[3], row[4]
    over = min(rt, abs(x) - (hw - rt))
    return z1 if over <= 0 else z1 - rt + math.sqrt(rt * rt - over * over)


def decal(a, rows, outline, columns=6, lift=0.01):
    """A sheet lying on the roof of a `ring`-sectioned hull; `outline` is (y, half-width)."""
    verts, faces, index = [], [], []
    for y, half in outline:
        row = _row(rows, y)
        xs = [0.0] if half <= 1e-6 else [half * (2 * c / columns - 1) for c in range(columns + 1)]
        index.append(list(range(len(verts), len(verts) + len(xs))))
        verts += [(x, y, _crown(row, x) + lift) for x in xs]
    for p, q in zip(index, index[1:]):
        if len(p) == 1 and len(q) > 1:
            faces += [(p[0], q[c + 1], q[c]) for c in range(columns)]
        elif len(q) == 1 and len(p) > 1:
            faces += [(p[c], p[c + 1], q[0]) for c in range(columns)]
        elif len(p) > 1:
            faces += [(p[c], p[c + 1], q[c + 1], q[c]) for c in range(columns)]
    piece = a.raw(verts, faces)
    if sum(f.normal.z for f in piece.bm.faces) < 0:
        bmesh.ops.reverse_faces(piece.bm, faces=piece.bm.faces[:])
        piece.bm.normal_update()
    return piece


@asset("maglev", tint="#f6f4ee", grounded=False, budget=1800)
def maglev(a):
    """A whole levitating trainset, nose to tail: a long duck-bill nose with a teardrop screen,
    a dark window ribbon over a gold pinstripe, gangway joints and a light bed glowing under
    the skirts."""
    rows = [
        (-2.8, 0.1, 0.36, 0.5, 0.05, 0.04),
        (-2.72, 0.2, 0.33, 0.56, 0.09, 0.07),
        (-2.5, 0.34, 0.3, 0.68, 0.15, 0.1),
        (-2.2, 0.43, 0.3, 0.84, 0.2, 0.12),
        (-1.9, 0.48, 0.3, 0.99, 0.24, 0.135),
        (-1.6, 0.5, 0.3, 1.08, 0.26, 0.14),
        (-1.35, 0.5, 0.3, 1.1, 0.26, 0.14),
        (1.35, 0.5, 0.3, 1.1, 0.26, 0.14),
        (1.7, 0.48, 0.3, 1.04, 0.25, 0.135),
        (1.95, 0.42, 0.31, 0.92, 0.2, 0.11),
        (2.08, 0.32, 0.34, 0.76, 0.14, 0.09),
        (2.11, 0.24, 0.37, 0.66, 0.1, 0.07),
    ]
    hull(a, [(r[0], ring(r[1], r[2], r[3], r[4], r[5], 3)) for r in rows]).part("tint").color(P.SHADE_1, P.WHITE)

    def strip(centre, full, lift=0.004):
        """A band on the flanks, `full` tall along the cars and tapering into nose and tail."""
        out = []
        for y in (-2.0, -1.9, -1.6, -1.35, 1.35, 1.7, 1.85):
            k = min(1.0, max(0.0, (y + 2.0) / 0.4), max(0.0, (1.85 - y) / 0.5))
            h = full * (0.14 + 0.86 * k) / 2
            out.append((y, ring(_row(rows, y)[1] + lift, centre - h, centre + h, 0.008, 0.008, 1)))
        return hull(a, out)

    strip(0.735, 0.17).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    strip(0.515, 0.045).color(P.GOLD)
    decal(
        a, rows, [(-2.6, 0.0), (-2.5, 0.1), (-2.35, 0.19), (-2.15, 0.26), (-1.95, 0.29), (-1.8, 0.27), (-1.7, 0.2), (-1.64, 0.0)]
    ).part("glass").color(P.GLASS_TINTED, P.GLASS_DARK, "y")
    # Gangway joints between the cars.
    for y in (-0.62, 0.5):
        hull(a, [(y + dy, ring(0.503, 0.297, 1.103, 0.26, 0.14, 3)) for dy in (-0.025, 0.025)]).color(P.CHARCOAL)
    # Undercarriage skirts and the glowing light bed between them.
    under = [(-2.5, 0.24), (-2.2, 0.34), (-1.9, 0.4), (-1.6, 0.42), (1.35, 0.42), (1.7, 0.4), (1.95, 0.33)]
    hull(a, [(y, ring(hw, 0.2, 0.36, 0.01, 0.05, 1)) for y, hw in under]).color(P.INK, P.CHARCOAL)
    left = [(-(hw + 0.036), y) for y, hw in under]
    a.plate(left + [(-x, y) for x, y in reversed(left)], 0.03).move(0, 0, 0.188).part("glow").color(P.GLOW_CYAN)
    # Nose and tail lamps, and two low roof fairings.
    a.box(0.13, 0.03, 0.03, bevel=0).move(0, -2.806, 0.42).part("glow").color(P.GLOW_WHITE)
    a.box(0.3, 0.03, 0.04, bevel=0).move(0, 2.102, 0.5).part("glow").color(P.GLOW_RED)
    for y in (-1.0, -0.06, 0.93):
        a.loft([(-0.36, 0.0, 0.0), (-0.3, 0.1, 0.022), (-0.18, 0.15, 0.036), (0.2, 0.15, 0.036), (0.33, 0.08, 0.02), (0.37, 0.0, 0.0)], 10, 2.6).move(
            0, y, 1.094
        ).part("tint").color(P.SHADE_2, P.SHADE_1)


# --------------------------------------------------------------------------------------------
# Off-world, animal-drawn and pedal traffic
# --------------------------------------------------------------------------------------------
@asset("rover", tint="#eef0f2", budget=1400)
def rover(a):
    """A pressurised six-wheel planetary rover: a drum cockpit under a glass bubble, a habitat
    hull on rocker-bogie suspension, a tilted solar panel and a whip antenna."""
    r, wx, ww = 0.21, 0.5, 0.17
    ys = (-0.6, 0.0, 0.6)
    a.box(0.76, 1.4, 0.1, bevel=0).move(0, 0, 0.3).color(P.CHARCOAL)
    for side in (-1, 1):
        x = side * 0.39
        # A bogie links the front pair; a trailing rocker carries the rear wheel.
        a.tube([(x, ys[0], r), (x, -0.3, 0.42), (x, ys[1], r)], 0.03, 4).color(P.STEEL_DARK)
        a.tube([(x, -0.3, 0.42), (x, 0.24, 0.45), (x, ys[2], r)], 0.03, 4).color(P.STEEL_DARK)
        for y in ys:
            wheel(a, side * wx, y, r, ww, side, sides=10, hub_r=0.62, tyre=P.GUNMETAL, nut=False)
        # Consumables tanks ride above the rear wheels.
        a.cyl(0.07, 0.56, 6, bevel=0.02).rot(x=90).move(side * 0.45, 0.6, 0.55).color(jk.shade(P.GOLD, -0.12), P.GOLD)
    # The habitat hull and the cockpit drum let into its nose.
    a.loft(
        [(-0.6, 0.3, 0.15, 0.6), (-0.54, 0.37, 0.2, 0.6), (-0.42, 0.4, 0.22, 0.6), (0.56, 0.4, 0.22, 0.6), (0.7, 0.37, 0.2, 0.6), (0.76, 0.3, 0.15, 0.6)],
        12,
        3.6,
    ).part("tint").color(P.SHADE_1, P.WHITE)
    a.lathe([(0.27, 0.4), (0.36, 0.5), (0.36, 0.78), (0.335, 0.81)], 12, cap_bottom=False).move(0, -0.4, 0).part("tint").color(
        P.SHADE_1, P.WHITE
    )
    a.lathe([(0.33, 0.785), (0.368, 0.81), (0.31, 0.842)], 12, cap_bottom=False, cap_top=False).move(0, -0.4, 0).part("metal").color(P.STEEL)
    a.dome(0.32, 0.3, 12, 4).move(0, -0.4, 0.81).part("glass").color(P.GLASS_TINTED, P.GLASS)
    for side in (-1, 1):
        a.lathe([(0.052, 0), (0.052, 0.08)], 8, cap_bottom=False).rot(x=90).move(side * 0.17, -0.655, 0.62).part("glow").color(P.GLOW_WHITE)
        lamp(a, side * 0.24, 0.752, 0.5, 0.1, 0.05, P.GLOW_RED)
    a.box(0.5, 0.05, 0.05, bevel=0).move(0, -0.74, 0.43).color(P.CHARCOAL)
    # Rear airlock hatch.
    a.lathe([(0.19, 0), (0.19, 0.08), (0.165, 0.098)], 10, cap_bottom=False).rot(x=-90).move(0, 0.7, 0.62).part("tint").color(P.SHADE_2)
    a.lathe([(0.07, 0), (0.07, 0.014)], 8, cap_bottom=False).rot(x=-90).move(0, 0.795, 0.66).part("glass").color(P.GLASS_DARK)
    # Solar panel on a mast, tipped toward the front.
    a.box(0.34, 0.3, 0.07, bevel=0.02).move(0, 0.44, 0.8).color(jk.shade(P.GOLD, -0.12), P.GOLD)
    a.cyl(0.035, 0.2, 6, bevel=0).move(0, 0.44, 0.85).color(P.STEEL_DARK)
    with a.group() as panel:
        a.box(1.04, 0.56, 0.035, bevel=0.012).color(P.STEEL)
        a.box(0.98, 0.5, 0.012, bevel=0).move(0, 0, 0.029).part("glass").color(P.NAVY, P.BLUE, "y")
        for x in (-0.245, 0, 0.245):
            a.box(0.014, 0.5, 0.008, bevel=0).move(x, 0, 0.037).color(P.STEEL)
        a.box(0.98, 0.014, 0.008, bevel=0).move(0, 0, 0.037).color(P.STEEL)
    panel.rot(x=12).move(0, 0.44, 1.04)
    # A whip antenna with a beacon, between the bubble and the panel.
    a.tube([(-0.25, 0.02, 0.8), (-0.26, 0.03, 1.27)], 0.011, 4).color(P.STEEL_DARK)
    a.box(0.04, 0.04, 0.04, bevel=0).move(-0.26, 0.03, 1.26).part("glow").color(P.GLOW_ORANGE)


def spoked_wheel(a, x, y, r, width=0.07, spokes=4, sides=12, wood=P.OAK_WOOD):
    """A wooden cart wheel with an iron tyre, spokes and a turned hub, axle along x."""
    rin = r - 0.07
    section = [(r, -width / 2), (r, width / 2), (rin, width / 2), (rin, -width / 2)]
    verts, faces = [], []
    for i in range(sides):
        t = i / sides * math.tau
        verts += [(dx, rr * math.cos(t), rr * math.sin(t)) for rr, dx in section]
    for i in range(sides):
        j = (i + 1) % sides
        faces += [(i * 4 + k, j * 4 + k, j * 4 + (k + 1) % 4, i * 4 + (k + 1) % 4) for k in range(4)]
    rim = a.raw(verts, faces).color(wood)
    rim.paint(lambda f: P.GUNMETAL if abs(f.normal.x) < 0.3 and f.normal.dot(f.calc_center_median()) > 0 else None)
    rim.move(x, y, r)
    for i in range(spokes):
        a.box(width * 0.5, 0.045, rin * 2, bevel=0).move(0, 0, -rin).rot(x=180 * i / spokes + 22).move(x, y, r).color(
            jk.shade(wood, 0.12)
        )
    a.cyl(0.075, width + 0.09, 6, bevel=0.02).rot(y=90).move(x - (width + 0.09) / 2, y, r).color(P.WALNUT)


@asset("cart", tint="#9a7a5a", budget=1400)
def cart(a):
    """A two-wheeled farm cart behind a draught pony: plank sides on stakes, spoked wheels with
    iron tyres, a driver's bench, hay and sacks, and shafts running to the harness."""
    axle_y, r = 0.3, 0.4
    a.box(0.98, 0.09, 0.09, bevel=0).move(0, axle_y, 0.355).color(P.WALNUT)
    for side in (-1, 1):
        spoked_wheel(a, side * 0.5, axle_y, r)
        # Bearers under the bed run forward as the shafts.
        a.tube(
            [(side * 0.3, 0.95, 0.47), (side * 0.3, -0.36, 0.47), (side * 0.27, -0.9, 0.6), (side * 0.245, -1.5, 0.7)], 0.03, 5
        ).color(P.WALNUT)
        a.box(0.036, 1.3, 0.12, bevel=0).move(side * 0.4, axle_y, 0.55).part("tint").color(P.SHADE_1)
        a.box(0.044, 1.34, 0.12, bevel=0.012).move(side * 0.4, axle_y, 0.7).part("tint").color(P.SHADE_1, P.WHITE)
        for y in (-0.22, 0.82):
            a.box(0.045, 0.06, 0.38, bevel=0).move(side * 0.443, y, 0.48).part("tint").color(P.SHADE_3, P.SHADE_2)
    a.box(0.84, 1.3, 0.05, bevel=0).move(0, axle_y, 0.5).part("tint").color(P.SHADE_2)
    a.box(0.8, 0.036, 0.27, bevel=0).move(0, -0.33, 0.55).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(0.8, 0.036, 0.16, bevel=0).move(0, 0.93, 0.55).part("tint").color(P.SHADE_1)
    a.box(0.9, 0.17, 0.035, bevel=0).move(0, -0.2, 0.82).part("tint").color(P.WHITE)
    # The load: a heap of hay and two burlap sacks against the tailboard.
    a.blob(0.37, 2, (1.0, 1.08, 0.6), lumps=0.14, seed=3).move(0, 0.28, 0.74).color(jk.mix(P.THATCH, P.OAK_WOOD, 0.35), P.STRAW)
    for x, turn in ((-0.17, 78), (0.17, 100)):
        a.loft([(-0.15, 0, 0), (-0.12, 0.1, 0.08), (0.0, 0.125, 0.1), (0.11, 0.1, 0.08), (0.15, 0, 0)], 6, 2.4).rot(x=-28).rot(z=turn).move(
            x, 0.76, 0.68
        ).color(jk.shade(P.ADOBE, -0.3), P.ADOBE)
    # The pony.
    yc = -1.32
    coat, dark = jk.mix(P.WALNUT, P.RUST, 0.55), P.BARK_DARK
    a.loft(
        [
            (-0.5, 0, 0, 0.74),
            (-0.45, 0.12, 0.14, 0.74),
            (-0.33, 0.19, 0.215, 0.72),
            (-0.05, 0.21, 0.225, 0.7),
            (0.25, 0.22, 0.23, 0.71),
            (0.42, 0.2, 0.215, 0.73),
            (0.52, 0.11, 0.13, 0.75),
            (0.55, 0, 0, 0.75),
        ],
        10,
        2.3,
    ).move(0, yc, 0).color(jk.shade(coat, -0.18), coat)
    for sx in (-1, 1):
        for ly, knee in ((-0.32, -0.015), (0.38, 0.04)):
            y = yc + ly
            leg = a.tube([(sx * 0.12, y, 0.62), (sx * 0.12, y + knee, 0.32), (sx * 0.12, y, 0.08), (sx * 0.12, y, 0.0)], [0.088, 0.058, 0.052, 0.066], 5)
            leg.color(jk.shade(coat, -0.2), coat).paint(lambda f: dark if f.calc_center_median().z < 0.06 else None)
    a.tube([(0, yc - 0.34, 0.76), (0, yc - 0.52, 0.98), (0, yc - 0.6, 1.09)], [0.17, 0.125, 0.1], 8).scale(0.78, 1, 1).color(coat)
    a.loft([(-0.3, 0, 0), (-0.28, 0.05, 0.05), (-0.14, 0.065, 0.075), (0.0, 0.085, 0.105), (0.08, 0.07, 0.09), (0.11, 0, 0)], 8, 2.3).scale(
        1.14
    ).rot(x=38).move(0, yc - 0.6, 1.1).color(jk.shade(coat, -0.1), coat)
    a.profile_x([(yc - 0.268, 0.86), (yc - 0.538, 1.14), (yc - 0.5, 1.215), (yc - 0.21, 0.91)], 0.05, bevel=0).color(dark)
    a.tube([(0, yc + 0.53, 0.8), (0, yc + 0.64, 0.62), (0, yc + 0.6, 0.36)], [0.035, 0.055, 0.02], 5).color(dark)
    for sx in (-1, 1):
        a.cone(0.034, 0.1, 4).move(sx * 0.06, yc - 0.565, 1.19).color(coat)
        a.sphere(0.02, 5, 3).move(sx * 0.087, yc - 0.65, 1.122).color(P.INK).no_ao()
    # Harness: a collar and a back band that takes the shaft tips.
    a.torus(0.17, 0.042, 8, 4).scale(0.8, 1, 1).rot(x=38.7).move(0, yc - 0.38, 0.81).color(P.CHARCOAL)
    a.loft([(-0.2, 0.218, 0.236, 0.708), (-0.11, 0.223, 0.238, 0.706)], 10, 2.3, caps="none").move(0, yc, 0).color(P.CHARCOAL)


@asset("bicycle", tint="#3d6fb5", budget=1100)
def bicycle(a):
    """A town bicycle parked on its kickstand: a slim diamond frame, mudguards, a wicker basket
    on the bars and a rear rack."""
    ring_r, tyre = 0.2, 0.017
    yf, yr, hub = -0.33, 0.33, 0.217
    bb, seat = (0.03, 0.2), (0.115, 0.44)
    head_lo, head_hi = (-0.235, 0.385), (-0.2, 0.5)

    def bar(p, q, rad=0.015, x0=0.0, x1=0.0, part="tint", color=P.WHITE, sides=5):
        return a.tube([(x0, p[0], p[1]), (x1, q[0], q[1])], rad, sides).part(part).color(color)

    for y in (yf, yr):
        a.torus(ring_r, tyre, 14, 5).rot(y=90).move(0, y, hub).color(P.INK)
        for k in range(3):
            a.box(0.006, 0.009, (ring_r - tyre) * 2, bevel=0).move(0, 0, -(ring_r - tyre)).rot(x=60 * k + 15).move(0, y, hub).color(P.CHROME)
        a.cyl(0.02, 0.07, 6, bevel=0).rot(y=90).move(-0.035, y, hub).color(P.STEEL)
    # Frame.
    bar(seat, (-0.205, 0.485))
    bar(bb, head_lo, 0.017)
    bar(bb, (0.125, 0.47), 0.016)
    bar((-0.24, 0.37), (-0.196, 0.515), 0.02)
    bar(seat, (0.135, 0.5), 0.011, part="base", color=P.CHROME)
    for side in (-1, 1):
        bar(head_lo, (yf, hub), 0.012, side * 0.012, side * 0.03, sides=4)
        bar(bb, (yr, hub), 0.011, side * 0.012, side * 0.03, sides=4)
        bar(seat, (yr, hub), 0.01, side * 0.012, side * 0.03, sides=4)
        bar((0.47, 0.45), (yr, hub), 0.007, side * 0.035, side * 0.035, "base", P.STEEL_DARK, 4)
        a.tube([(side * 0.15, -0.115, 0.578), (side * 0.158, -0.06, 0.582)], 0.016, 5).color(P.INK)
    # Bars, saddle, drivetrain.
    bar(head_hi, (-0.195, 0.565), 0.011, part="base", color=P.CHROME)
    a.tube([(-0.15, -0.115, 0.578), (-0.1, -0.2, 0.566), (0, -0.215, 0.562), (0.1, -0.2, 0.566), (0.15, -0.115, 0.578)], 0.011, 5).color(P.CHROME)
    a.loft([(-0.1, 0, 0), (-0.08, 0.022, 0.014), (0.02, 0.05, 0.02), (0.07, 0.055, 0.02), (0.088, 0, 0)], 6, 2.4).move(0, 0.15, 0.515).color(
        P.WALNUT
    )
    a.cyl(0.052, 0.012, 8, bevel=0).rot(y=90).move(0.018, bb[0], bb[1]).color(P.STEEL_DARK)
    a.box(0.008, 0.3, 0.032, bevel=0).move(0.03, 0.18, 0.192).color(P.CHARCOAL)
    for side, dy, dz in ((1, -0.06, -0.075), (-1, 0.06, 0.075)):
        a.tube([(side * 0.03, bb[0], bb[1]), (side * 0.042, bb[0] + dy, bb[1] + dz)], 0.008, 4).color(P.STEEL)
        a.box(0.06, 0.036, 0.014, bevel=0).move(side * 0.072, bb[0] + dy, bb[1] + dz - 0.007).color(P.INK)
    # Mudguards, rack, basket, lamp, reflector and the kickstand it leans on.
    guard = ring_r + tyre + 0.013
    a.torus(guard, 0.011, 7, 4, arc=140).rot(z=-10).rot(x=90).rot(z=90).scale(2.2, 1, 1).move(0, yr, hub).part("tint").color(P.SHADE_1)
    a.torus(guard, 0.011, 6, 4, arc=110).rot(z=62).rot(x=90).rot(z=90).scale(2.2, 1, 1).move(0, yf, hub).part("tint").color(P.SHADE_1)
    a.box(0.09, 0.27, 0.012, bevel=0).move(0, 0.36, 0.452).color(P.STEEL_DARK)
    a.box(0.17, 0.12, 0.12, bevel=0.012, taper=1.2).move(0, -0.325, 0.455).color(jk.shade(P.THATCH, -0.2), P.THATCH)
    a.box(0.17, 0.115, 0.004, bevel=0).move(0, -0.325, 0.573).color(P.BARK_DARK)
    a.box(0.04, 0.02, 0.035, bevel=0).move(0, -0.405, 0.49).part("glow").color(P.LAMP)
    a.box(0.03, 0.012, 0.03, bevel=0).move(0, yr + guard + 0.004, hub - 0.055).part("glow").color(P.GLOW_RED)
    a.tube([(-0.02, 0.12, 0.2), (-0.1, 0.17, 0.0)], 0.008, 4).color(P.STEEL)


# --------------------------------------------------------------------------------------------
# Hover traffic
# --------------------------------------------------------------------------------------------
@asset("hover-car", tint="#3d6fb5", grounded=False, budget=1400)
def hover_car(a):
    """A wheel-less pod: a pebble body under a teardrop canopy, riding on a glowing lift ring."""
    a.lathe([(0.3, 0.2), (0.53, 0.24), (0.53, 0.3)], 16).scale(1, 1.55, 1).move(0, 0.02, 0).color(P.INK, P.CHARCOAL)
    a.torus(0.55, 0.045, 20, 6).scale(1, 1.55, 1).move(0, 0.02, 0.215).part("glow").color(P.GLOW_CYAN)
    a.loft(
        [
            (-1.05, 0.2, 0.055, 0.385),
            (-0.97, 0.34, 0.095, 0.395),
            (-0.7, 0.45, 0.13, 0.41),
            (-0.25, 0.5, 0.155, 0.425),
            (0.35, 0.5, 0.165, 0.435),
            (0.8, 0.45, 0.15, 0.45),
            (1.02, 0.36, 0.1, 0.46),
            (1.08, 0.24, 0.05, 0.46),
        ],
        14,
        2.6,
    ).part("tint").color(P.SHADE_1, P.WHITE)
    a.loft(
        [(-0.62, 0, 0, 0.5), (-0.52, 0.2, 0.06, 0.53), (-0.22, 0.34, 0.16, 0.6), (0.2, 0.36, 0.18, 0.62), (0.55, 0.3, 0.13, 0.6), (0.78, 0.16, 0.05, 0.57), (0.84, 0, 0, 0.56)],
        12,
        2.3,
    ).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    a.loft([(0.13, 0.366, 0.186, 0.62), (0.24, 0.366, 0.186, 0.62)], 12, 2.3).part("tint").color(P.SHADE_1, P.WHITE)
    for side in (-1, 1):
        a.box(0.02, 0.3, 0.035, bevel=0).move(side * 0.493, 0.42, 0.44).color(P.INK)
        a.profile_x([(0.66, 0.5), (1.08, 0.5), (1.12, 0.74), (0.98, 0.74)], 0.04, bevel=0.01).move(side * 0.3, 0, 0).part("tint").color(
            P.SHADE_1, P.WHITE
        )
    # Light blades wrap the nose and the tail along the body's waist.
    a.loft([(-1.058, 0.2, 0.016, 0.385), (-0.97, 0.346, 0.016, 0.395), (-0.86, 0.398, 0.016, 0.402)], 14, 2.6).part("glow").color(P.GLOW_WHITE)
    a.loft([(0.93, 0.405, 0.016, 0.456), (1.02, 0.366, 0.016, 0.46), (1.088, 0.246, 0.016, 0.46)], 14, 2.6).part("glow").color(P.GLOW_RED)


@asset("hover-bus", tint="#e6e8ea", grounded=False, budget=1400)
def hover_bus(a):
    """A long hover coach: a glass canopy ribbed with body-colour hoops over a low hull, kerb-side
    doors, a lit skirt line and two lift rings glowing underneath."""
    low = lambda y, hw, z0, z1: (y, ring(hw, z0, z1, 0.012, 0.08))
    top = lambda y, hw, z1, rt: (y, ring(hw, 0.64, z1, rt, 0.012))
    hull(
        a,
        [low(-2.4, 0.3, 0.44, 0.62), low(-2.3, 0.44, 0.37, 0.65), low(-2.05, 0.54, 0.32, 0.66), low(-1.7, 0.56, 0.3, 0.66),
         low(1.7, 0.56, 0.3, 0.66), low(2.0, 0.52, 0.33, 0.66), low(2.1, 0.42, 0.4, 0.64)],
    ).part("tint").color(P.SHADE_1, P.WHITE)
    hull(a, [top(-2.34, 0.3, 0.7, 0.04), top(-2.18, 0.42, 0.84, 0.1), top(-1.9, 0.5, 1.04, 0.17), top(-1.55, 0.53, 1.17, 0.2), top(1.62, 0.53, 1.17, 0.2)]).part(
        "glass"
    ).color(P.GLASS_DARK, P.GLASS_TINTED)
    hull(a, [top(1.6, 0.538, 1.178, 0.205), top(1.9, 0.52, 1.14, 0.2), top(2.06, 0.44, 0.98, 0.16), top(2.1, 0.36, 0.86, 0.1)]).part("tint").color(
        P.SHADE_1, P.WHITE
    )
    for y in (-1.5, -0.88, -0.26, 0.36, 0.98):
        hull(a, [(y + dy, ring(0.538, 0.64, 1.178, 0.205, 0.012)) for dy in (-0.04, 0.04)]).part("tint").color(P.SHADE_1, P.WHITE)
    # Kerb-side doors and the lit skirt line.
    for y in (-1.19, 0.67):
        a.box(0.02, 0.46, 0.53, bevel=0).move(-0.543, y, 0.43).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
        a.box(0.03, 0.5, 0.24, bevel=0).move(-0.552, y, 0.42).part("glass").color(P.GLASS_DARK)
        a.box(0.034, 0.012, 0.24, bevel=0).move(-0.553, y, 0.42).color(P.INK)
    for side in (-1, 1):
        a.box(0.012, 3.5, 0.026, bevel=0).move(side * 0.561, 0, 0.385).part("glow").color(P.GLOW_CYAN)
    # Plenum, lift pads and rings.
    hull(a, [(y, ring(hw, 0.2, 0.34, 0.01, 0.05, 1)) for y, hw in ((-2.1, 0.3), (-1.7, 0.46), (1.7, 0.46), (1.95, 0.36))]).color(P.INK, P.CHARCOAL)
    for y in (-1.25, 1.05):
        a.lathe([(0.3, 0.15), (0.53, 0.19), (0.53, 0.33)], 14).scale(1, 1.3, 1).move(0, y, 0).color(P.INK, P.CHARCOAL)
        a.torus(0.55, 0.045, 16, 5).scale(1, 1.3, 1).move(0, y, 0.175).part("glow").color(P.GLOW_CYAN)
    # Lamps and thrusters.
    a.box(0.36, 0.03, 0.04, bevel=0).move(0, -2.392, 0.5).part("glow").color(P.GLOW_WHITE)
    a.box(0.5, 0.03, 0.045, bevel=0).move(0, 2.082, 0.72).part("glow").color(P.GLOW_RED)
    for side in (-1, 1):
        a.box(0.16, 0.04, 0.09, bevel=0.015).move(side * 0.2, 2.09, 0.45).color(P.INK)
        a.box(0.1, 0.02, 0.04, bevel=0).move(side * 0.2, 2.118, 0.475).part("glow").color(P.GLOW_CYAN)
