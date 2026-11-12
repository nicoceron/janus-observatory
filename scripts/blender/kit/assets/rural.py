"""Farm, coast and energy structures: glasshouse, barn, silo, water tower, lighthouse, dock,
windmill (whole, and split into body and sails so the sails can turn), wind turbine and solar
field. Fronts face -y. All geometry is original interpretive artwork.
"""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

from kit import jk, parts
from kit import palette as P
from kit.jk import asset


# --------------------------------------------------------------------------------------------
# Module helpers
# --------------------------------------------------------------------------------------------
def bar(a, p0, p1, w, h=None, bevel=0.0, up=(0, 0, 1)):
    """A rectangular beam from p0 to p1: `w` across (horizontal) and `h` toward `up`."""
    h = w if h is None else h
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    x = d.normalized()
    y = Vector(up).cross(x)
    if y.length < 1e-6:
        y = Vector((0, 1, 0)).cross(x)
    y.normalize()
    z = x.cross(y)
    mid = (p0 + p1) / 2
    m = Matrix(
        (
            (x.x, y.x, z.x, mid.x),
            (x.y, y.y, z.y, mid.y),
            (x.z, y.z, z.z, mid.z),
            (0, 0, 0, 1),
        )
    )
    return a.box(d.length, w, h, bevel=bevel).move(0, 0, -h / 2).apply(m)


def ladder(a, h, w=0.26, gap=0.24, color=P.STEEL_DARK, part="base", standoff=0.07, t=0.032):
    """A ladder standing on z = 0 in front of the wall plane y = 0, facing -y."""
    start = len(a.pieces)
    for side in (-1, 1):
        a.box(t, t, h, bevel=0).move(side * w / 2, -standoff, 0).part(part).color(color)
    n = max(2, round(h / gap))
    for i in range(n):
        a.box(w, t * 0.75, t * 0.75, bevel=0).move(0, -standoff, (i + 0.5) * h / n - t * 0.375).part(part).color(color)
    return parts.grouped(a, start)


def offset_line(points, t):
    """Offset an open polyline of (x, z) points by t to its right-hand side, with mitred joins."""

    def normal(p, q):
        dx, dz = q[0] - p[0], q[1] - p[1]
        length = math.hypot(dx, dz)
        return dz / length, -dx / length

    out = []
    last = len(points) - 1
    for i, (x, z) in enumerate(points):
        if i == 0:
            nx, nz = normal(points[0], points[1])
            k = 1.0
        elif i == last:
            nx, nz = normal(points[-2], points[-1])
            k = 1.0
        else:
            n1 = normal(points[i - 1], points[i])
            n2 = normal(points[i], points[i + 1])
            mx, mz = n1[0] + n2[0], n1[1] + n2[1]
            length = math.hypot(mx, mz)
            nx, nz = mx / length, mz / length
            k = 1 / max(0.3, nx * n1[0] + nz * n1[1])
        out.append((x + nx * t * k, z + nz * t * k))
    return out


def ring(count, radius, phase=0.0):
    """`count` points on a circle: (x, y, angle in degrees)."""
    out = []
    for i in range(count):
        ang = phase + 360.0 * i / count
        out.append((math.cos(math.radians(ang)) * radius, math.sin(math.radians(ang)) * radius, ang))
    return out


def glazed_leaf(a, w, h, frame, pane, t=0.045, s=0.06):
    """A framed glass leaf standing on z = 0, hinge edge on x = 0, reaching to +x."""
    start = len(a.pieces)
    for x in (s / 2, w - s / 2):
        frame(a.box(s, t, h, bevel=0).move(x, 0, 0))
    for z in (0, h - s, h * 0.42):
        frame(a.box(w - 2 * s, t, s, bevel=0).move(w / 2, 0, z))
    pane(a.box(w - 2 * s, 0.016, h - 2 * s, bevel=0).move(w / 2, 0, s))
    return parts.grouped(a, start)


# --------------------------------------------------------------------------------------------
# Greenhouse
# --------------------------------------------------------------------------------------------
@asset("greenhouse", tint="#ffffff", dark=True, budget=2400, note="Glasshouse; the frame is the tint part.")
def greenhouse(a):
    W, D = 3.0, 4.0
    z0, zw, ze, zr = 0.14, 0.48, 1.5, 2.12
    hx, hy = W / 2, D / 2
    gx, gy = hx - 0.07, hy - 0.07  # glazing planes
    rx = gx + 0.06  # eave line of the roof
    zs = zw + 0.05  # top of the sill plate
    bay = 2 * gy / 4
    glass_lo, glass_hi = jk.mix(P.GLASS_TINTED, P.GLASS, 0.6), P.ICE
    leafy = jk.mix(P.LEAF, P.GLASS, 0.38)
    brick = (jk.shade(P.BRICK, -0.12), jk.shade(P.BRICK, 0.12))

    def frame(piece):
        return piece.part("tint").color(P.SHADE_1, P.WHITE)

    def pane(piece):
        return piece.part("glass").color(glass_lo, glass_hi)

    def wall_pane(piece):
        # Wall glass is painted leaf-green low down: the beds showing through.
        return piece.part("glass").color(leafy, glass_hi)

    def roof_z(x):
        return ze + (zr - ze) * (1 - abs(x) / rx)

    a.box(W + 0.24, D + 0.24, z0, bevel=0.03, grounded=True).color(P.STONE_DARK, P.STONE)

    # Dwarf wall in brick, open at the front for the doorway, with a white sill plate.
    door_w = 0.92
    side_w = (W - 0.28 - door_w) / 2
    for s in (-1, 1):
        a.box(0.14, D, zw - z0, bevel=0.015).move(s * gx, 0, z0).color(*brick)
        frame(a.box(0.18, D + 0.04, 0.05, bevel=0).move(s * gx, 0, zw))
        a.box(side_w, 0.14, zw - z0, bevel=0.015).move(s * (door_w / 2 + side_w / 2), -gy, z0).color(*brick)
        frame(a.box(side_w + 0.02, 0.18, 0.05, bevel=0).move(s * (door_w / 2 + side_w / 2), -gy, zw))
    a.box(W - 0.28, 0.14, zw - z0, bevel=0.015).move(0, gy, z0).color(*brick)
    frame(a.box(W - 0.3, 0.18, 0.05, bevel=0).move(0, gy, zw))

    # Long walls: one sheet of glass behind posts, a transom and the eave plate.
    for s in (-1, 1):
        wall_pane(a.box(0.02, 2 * gy, ze - zs, bevel=0).move(s * gx, 0, zs))
        for k in range(5):
            end = k in (0, 4)
            t = 0.09 if end else 0.05
            frame(a.box(t, t, ze - zs, bevel=0.012 if end else 0).move(s * gx, -gy + k * bay, zs))
        frame(a.box(0.04, 2 * gy, 0.04, bevel=0).move(s * gx, 0, zs + (ze - zs) * 0.62))
        frame(a.box(0.13, D + 0.04, 0.09, bevel=0.02).move(s * (gx + 0.015), 0, ze - 0.05))

    # Back gable: a glazed pentagon with mullions.
    wall_pane(a.profile_y([(-gx, zs), (gx, zs), (gx, ze), (0, zr - 0.02), (-gx, ze)], 0.02, bevel=0).move(0, gy, 0))
    for x in (-0.72, 0, 0.72):
        frame(a.box(0.05, 0.05, roof_z(x) - zs - 0.02, bevel=0).move(x, gy, zs))
    # Front gable: glass either side of the doorway and above it.
    for s in (-1, 1):
        w = gx - 0.5
        wall_pane(a.box(w, 0.02, ze - zs, bevel=0).move(s * (0.5 + w / 2), -gy, zs))
        frame(a.box(0.05, 0.05, roof_z(0.95) - zs - 0.02, bevel=0).move(s * 0.95, -gy, zs))
    zd = 1.4
    pane(a.box(1.0, 0.02, ze - zd, bevel=0).move(0, -gy, zd))
    pane(a.profile_y([(-gx, ze), (gx, ze), (0, zr - 0.02)], 0.02, bevel=0).move(0, -gy, 0))
    frame(a.box(0.05, 0.05, zr - ze - 0.04, bevel=0).move(0, -gy, ze))
    for s in (-1, 1):
        frame(a.box(0.08, 0.1, zd - z0 + 0.04, bevel=0.012).move(s * 0.5, -gy, z0))
    frame(a.box(1.08, 0.1, 0.07, bevel=0.012).move(0, -gy, zd))
    for y in (-gy, gy):
        frame(a.box(2 * gx, 0.06, 0.06, bevel=0).move(0, y, ze - 0.03))

    # Roof: rafters over the bays, a pane per bay, and two top-hung vents propped open.
    slope = math.atan2(zr - ze, rx)
    vents = {(1, 1), (-1, 2)}
    for s in (-1, 1):
        for k in range(5):
            y = -gy + k * bay
            end = k in (0, 4)
            frame(bar(a, (s * (rx + 0.05), y, roof_z(rx + 0.05)), (0, y, zr), 0.09 if end else 0.05, 0.08 if end else 0.06))
        for k in range(4):
            yc = -gy + (k + 0.5) * bay
            if (s, k) not in vents:
                pane(bar(a, (s * rx, yc, ze), (0, yc, zr), bay, 0.02))
                frame(bar(a, (s * rx, yc, ze), (0, yc, zr), 0.025, 0.04))
                continue
            # Fixed lower light, a purlin, then the vent leaf hinged at the ridge.
            split = 0.5
            xs = rx * (1 - split)
            pane(bar(a, (s * rx, yc, ze), (s * xs, yc, roof_z(xs)), bay, 0.02))
            frame(bar(a, (s * xs, yc - bay / 2, roof_z(xs)), (s * xs, yc + bay / 2, roof_z(xs)), 0.05, 0.06))
            length = math.hypot(xs - 0.06, roof_z(0.06) - roof_z(xs))
            open_angle = slope - math.radians(27)
            top = Vector((s * 0.06, yc, roof_z(0.06) + 0.02))
            tip = top + Vector((s * math.cos(open_angle), 0, -math.sin(open_angle))) * length
            pane(bar(a, top, tip, bay - 0.12, 0.02))
            for e in (-1, 1):
                off = Vector((0, e * (bay / 2 - 0.05), 0))
                frame(bar(a, top + off, tip + off, 0.05, 0.05))
            frame(bar(a, tip - Vector((0, bay / 2 - 0.03, 0)), tip + Vector((0, bay / 2 - 0.03, 0)), 0.05, 0.05))
            bar(a, tip + Vector((0, 0.2, -0.02)), (s * xs, yc + 0.2, roof_z(xs)), 0.022, 0.022).part("metal").color(P.STEEL_DARK)
    frame(a.box(0.12, D + 0.08, 0.1, bevel=0.02).move(0, 0, zr - 0.07))

    # Ridge lantern: a raised vent strip whose little panes glow with the grow lights.
    frame(a.box(0.38, 2.9, 0.15, bevel=0.015).move(0, 0, zr - 0.11))
    a.box(0.32, 2.8, 0.15, bevel=0).move(0, 0, zr + 0.04).part("lit").color(P.WINDOW)
    for y in (-1.39, -0.465, 0.465, 1.39):
        frame(a.box(0.35, 0.045, 0.15, bevel=0).move(0, y, zr + 0.04))
    frame(a.profile_y([(-0.23, 0), (0.23, 0), (0.23, 0.03), (0, 0.11), (-0.23, 0.03)], 3.0, bevel=0.012).move(0, 0, zr + 0.19))
    for y in (-gy, gy):
        frame(a.lathe([(0.03, 0), (0.03, 0.07), (0.055, 0.11), (0.03, 0.16), (0, 0.28)], 6).move(0, y, zr))

    # Double doors folded open onto the path.
    leaf_h = zd - z0 - 0.02
    glazed_leaf(a, 0.44, leaf_h, frame, pane).rot(z=-48).move(0.46, -gy - 0.06, z0 + 0.01)
    glazed_leaf(a, 0.44, leaf_h, frame, pane).rot(z=-132).move(-0.46, -gy - 0.06, z0 + 0.01)

    # Inside: two raised beds either side of the path, planted, under a grow-light bar.
    for s in (-1, 1):
        bx = s * 0.92
        a.box(0.8, 3.5, 0.32, bevel=0.02).move(bx, 0, z0).color(jk.shade(P.OAK_WOOD, -0.05), P.PINE_WOOD).no_ao()
        a.box(0.68, 3.38, 0.03, bevel=0).move(bx, 0, z0 + 0.3).color(P.BARK).no_ao()
        lumps = []
        # Four plants a bed; the two in the middle swell under the roof vents, where they show.
        for i, y in enumerate((-1.4, -0.48, 0.5, 1.38)):
            r = (0.3, 0.37, 0.37, 0.3)[i]
            lumps.append((bx - (0.12 if i in (1, 2) else 0.0) * s, y, z0 + 0.34 + r * 0.62, r, 0.9))
        g = parts.canopy(a, lumps, seed=5 if s > 0 else 11, part="base", low=P.LEAF_DEEP, high=P.LIME if s > 0 else P.LEAF)
        for p in g.pieces:
            p.no_ao()
    for x, y, z in ((0.66, -1.5, 0.74), (-0.68, -1.58, 0.72), (-0.94, -1.64, 0.82)):
        a.sphere(0.05, 5, 3).move(x, y, z).color(P.RED).no_ao()
    a.box(0.1, 3.3, 0.05, bevel=0).move(0, 0, ze + 0.18).part("lit").color(P.LAMP)

    # Terracotta pots beside the door.
    for s in (-1, 1):
        px, py = s * 1.08, -hy - 0.2
        a.lathe([(0.1, 0), (0.15, 0.2), (0.165, 0.2), (0.165, 0.25), (0.11, 0.25)], 6).move(px, py, 0).color(jk.shade(P.TERRACOTTA, -0.1), P.TERRACOTTA)
        a.blob(0.19, 1, (1, 1, 0.95), lumps=0.2, seed=3 + s).move(px, py, 0.39).color(P.LEAF_DEEP, P.LEAF)


# --------------------------------------------------------------------------------------------
# Barn
# --------------------------------------------------------------------------------------------
@asset("barn", tint="#b5442f", dark=True, budget=2400, note="Gambrel barn; boarded walls are the tint part.")
def barn(a):
    D = 3.9
    z0 = 0.14
    t = 0.1
    over = 0.16
    line = [(-1.76, 1.47), (-1.56, 1.62), (-1.04, 2.52), (0, 3.08), (1.04, 2.52), (1.56, 1.62), (1.76, 1.47)]
    under = offset_line(line, t)
    wall = offset_line(line, t + 0.006)[1:-1]
    xe = wall[-1][0]
    ze = wall[-1][1]
    yf = -D / 2
    white = P.OFF_WHITE
    roof_c = (jk.shade(P.SLATE, -0.12), jk.shade(P.SLATE, 0.16))

    a.box(2 * xe + 0.16, D + 0.16, z0 + 0.02, bevel=0.03, grounded=True).color(P.STONE_DARK, P.STONE)
    body = [(-xe, z0), (xe, z0)] + wall[::-1]
    a.profile_y(body, D, bevel=0.025).part("tint").color(P.SHADE_1, P.WHITE)
    a.profile_y(under + line[::-1], D + 2 * over, bevel=0.025).color(*roof_c)
    a.box(0.16, D + 2 * over + 0.04, 0.08, bevel=0.025).move(0, 0, 3.03).color(jk.shade(P.SLATE, -0.2))
    # White bargeboards under both gable ends, corner boards and a skirt line.
    board = under + offset_line(line, t + 0.11)[::-1]
    for s in (-1, 1):
        a.profile_y(board[::-1], 0.06, bevel=0).move(0, s * (D / 2 + over - 0.05), 0).color(white)
        for e in (-1, 1):
            a.box(0.11, 0.11, ze - z0 - 0.02, bevel=0).move(e * (xe - 0.03), s * (D / 2 - 0.03), z0).color(white)

    # Big double doors with white frames and cross braces.
    dw, dh = 1.5, 1.6
    for s in (-1, 1):
        a.box(0.11, 0.09, dh + 0.06, bevel=0.012).move(s * (dw / 2 + 0.055), yf - 0.02, z0).color(white)
        cx = s * dw / 4
        lw = dw / 2 - 0.012
        a.box(lw, 0.05, dh, bevel=0).move(cx, yf - 0.012, z0).part("tint").color(P.SHADE_3, P.SHADE_2)
        yb = yf - 0.045
        for z in (z0 + 0.01, z0 + dh - 0.08):
            a.box(lw, 0.026, 0.07, bevel=0).move(cx, yb, z).color(white)
        for e in (-1, 1):
            a.box(0.07, 0.026, dh - 0.02, bevel=0).move(cx + e * (lw / 2 - 0.035), yb, z0 + 0.01).color(white)
            bar(a, (cx - e * (lw / 2 - 0.06), yb, z0 + 0.08), (cx + e * (lw / 2 - 0.06), yb, z0 + dh - 0.09), 0.02, 0.06).color(white)
        a.box(0.03, 0.03, 0.2, bevel=0.008).move(s * 0.07, yb - 0.02, z0 + 0.72).color(P.INK)
    a.box(dw + 0.34, 0.11, 0.12, bevel=0.015).move(0, yf - 0.025, z0 + dh).color(white)
    a.profile_x([(yf - 0.42, 0), (yf - 0.02, 0), (yf - 0.02, z0 + 0.01)], dw + 0.1, bevel=0.012).color(jk.shade(P.OAK_WOOD, -0.1), P.PINE_WOOD)

    # Hayloft hatch: lit loft behind open shutters, hay spilling over the sill, hoist above.
    zl = 2.0
    a.add(parts.frame(0.56, 0.6, 0.07, 0.07)).move(0, yf, zl - 0.07).color(white)
    a.box(0.56, 0.012, 0.6, bevel=0).move(0, yf - 0.03, zl).part("lit").color(P.WINDOW).no_ao()
    a.box(0.36, 0.22, 0.2, bevel=0.03).rot(z=10).move(0.04, yf - 0.03, zl + 0.01).color(jk.shade(P.STRAW, -0.18), P.STRAW)
    for x in (-0.07, 0.15):
        a.box(0.025, 0.235, 0.21, bevel=0).rot(z=10).move(x, yf - 0.03, zl + 0.008).color(P.OAK_WOOD)
    for s in (-1, 1):
        sx = s * (0.28 + 0.07 + 0.145)
        a.box(0.27, 0.035, 0.6, bevel=0.008).move(sx, yf - 0.018, zl).part("tint").color(P.SHADE_3, P.SHADE_2)
        for z in (zl + 0.08, zl + 0.46):
            a.box(0.27, 0.014, 0.05, bevel=0).move(sx, yf - 0.042, z).color(white)
    a.box(0.09, 0.66, 0.1, bevel=0.015).move(0, yf - 0.2, 2.76).color(jk.shade(P.WALNUT, -0.1), P.WALNUT)
    a.cyl(0.05, 0.04, 8, bevel=0.008).rot(y=90).move(-0.02, yf - 0.44, 2.7).part("metal").color(P.STEEL_DARK)
    a.tube([(0, yf - 0.44, 2.66), (0, yf - 0.44, 2.44)], 0.01, 4).color(P.SAND)
    a.box(0.05, 0.05, 0.07, bevel=0.012).move(0, yf - 0.44, 2.38).part("metal").color(P.STEEL_DARK)

    # Small stable windows on the long sides; a plain door and a loft window at the back.
    for s in (-1, 1):
        for y in (-0.95, 0.95):
            parts.window(a, 0.36, 0.42, trim=white).rot(z=90 * s).move(s * xe, y, 0.72)
    parts.window(a, 0.5, 0.46, trim=white).rot(z=180).move(0, D / 2, 2.02)
    parts.door(a, 0.52, 1.0, leaf=white, trim=white, knob=True).rot(z=180).move(-0.62, D / 2, z0)
    parts.window(a, 0.36, 0.42, trim=white).rot(z=180).move(0.62, D / 2, 0.72)

    # Ridge cupola with louvres and a weathervane.
    zc = 2.96
    a.box(0.46, 0.46, 0.4, bevel=0.02).move(0, 0, zc).part("tint").color(P.SHADE_1, P.WHITE)
    for i in range(4):
        with a.group() as g:
            for z in (0.17, 0.27):
                a.box(0.3, 0.02, 0.05, bevel=0).move(0, -0.235, zc + z).color(white)
        g.rot(z=90 * i)
    a.box(0.54, 0.54, 0.045, bevel=0.012).move(0, 0, zc + 0.38).color(white)
    a.cone(0.43, 0.27, 4).rot(z=45).move(0, 0, zc + 0.42).color(*roof_c)
    top = zc + 0.69
    a.tube([(0, 0, top - 0.04), (0, 0, top + 0.26)], 0.012, 4).part("metal").color(P.STEEL_DARK)
    a.sphere(0.032, 6, 4).move(0, 0, top + 0.05).part("metal").color(P.BRASS)
    bar(a, (-0.15, 0, top + 0.2), (0.13, 0, top + 0.2), 0.014, 0.022).part("metal").color(P.STEEL_DARK)
    a.cone(0.035, 0.08, 4).rot(y=90).move(0.12, 0, top + 0.2).part("metal").color(P.STEEL_DARK)
    a.box(0.08, 0.014, 0.08, bevel=0).move(-0.15, 0, top + 0.16).part("metal").color(P.STEEL_DARK)


# --------------------------------------------------------------------------------------------
# Silo
# --------------------------------------------------------------------------------------------
@asset("silo", tint="#d9dde2", budget=2400, note="Grain bin; the shell is tinted metal.")
def silo(a):
    r, z0, h = 0.72, 0.16, 3.4
    a.cyl(0.83, z0, 16, bevel=0.03, grounded=True).color(P.CONCRETE_DARK, P.CONCRETE)
    # Shell of rolled rings: each course swells to a hoop where the sheets lap.
    prof = [(r, z0 - 0.03)]
    hoops = 6
    pitch = (h - z0) / hoops
    for i in range(hoops):
        z = z0 + pitch * (i + 0.5)
        prof += [(r, z - 0.1), (r + 0.055, z - 0.04), (r + 0.055, z + 0.04), (r, z + 0.1)]
    prof.append((r, h))
    shell = a.lathe(prof, 16, cap_bottom=False, cap_top=False).part("metal").color(P.SHADE_2, P.SHADE_1)
    shell.paint(lambda f: P.WHITE if (f.calc_center_median().x ** 2 + f.calc_center_median().y ** 2) ** 0.5 > (r + 0.05) * 0.985 else None)
    # Domed cap with a rolled eave, standing seams and a fill hatch.
    dome = [(r + 0.08, h + 0.03), (r * 0.9, h + 0.2), (r * 0.68, h + 0.38), (r * 0.4, h + 0.5), (0.17, h + 0.56)]
    a.lathe([(r + 0.05, h - 0.04), (r + 0.08, h - 0.01)] + dome + [(0, h + 0.57)], 16, cap_bottom=False).part("metal").color(P.SHADE_2, P.SHADE_1)
    for x, y, ang in ring(8, 1.0, 22.5):
        a.tube([(x * q, y * q, z + 0.012) for q, z in dome], 0.016, 4).part("metal").color(P.SHADE_2)
    a.cyl(0.19, 0.13, 10, bevel=0.015).move(0, 0, h + 0.53).part("metal").color(P.SHADE_2)
    a.cone(0.25, 0.11, 10).move(0, 0, h + 0.66).color(jk.shade(P.RED, -0.1), P.RED)

    # Caged ladder on the right.
    lx = r + 0.05
    ladder(a, h - z0 + 0.12, w=0.24, gap=0.27, standoff=0.07).rot(z=90).move(lx, 0, z0)
    cx = lx + 0.07
    for z in (1.25, 1.85, 2.45, 3.05, 3.5):
        a.torus(0.17, 0.013, 7, 4, arc=220).rot(z=-110).move(cx, 0, z).color(P.STEEL_DARK)
    for ang in (-78, 0, 78):
        a.box(0.022, 0.022, 2.25, bevel=0).move(cx + 0.17 * math.cos(math.radians(ang)), 0.17 * math.sin(math.radians(ang)), 1.25).color(P.STEEL_DARK)

    # Discharge chute at the front left, with its slide gate wheel.
    dx, dy = math.cos(math.radians(-118)), math.sin(math.radians(-118))
    a.box(0.3, 0.3, 0.26, bevel=0.03).rot(z=-118 + 90).move(dx * (r + 0.05), dy * (r + 0.05), 0.92).color(P.STEEL_DARK)
    bar(a, (dx * (r + 0.06), dy * (r + 0.06), 0.98), (dx * (r + 0.36), dy * (r + 0.36), 0.62), 0.2, 0.15, bevel=0.02).part("metal").color(P.SHADE_3, P.SHADE_2)
    bar(a, (dx * (r + 0.28), dy * (r + 0.28), 0.66), (dx * (r + 0.02), dy * (r + 0.02), 0.46), 0.03, 0.03).color(P.STEEL_DARK)
    a.torus(0.075, 0.016, 8, 4).rot(x=90).rot(z=-118 + 90).move(dx * (r + 0.22), dy * (r + 0.22), 1.06).color(P.RED)

    # Blower pipe up the back and over the dome into the hatch.
    px, py = math.cos(math.radians(122)), math.sin(math.radians(122))
    pr = r + 0.115
    a.tube(
        [(px * pr, py * pr, z0), (px * pr, py * pr, h + 0.02), (px * pr * 0.84, py * pr * 0.84, h + 0.4), (px * 0.5, py * 0.5, h + 0.66), (px * 0.14, py * 0.14, h + 0.64)],
        0.055,
        7,
    ).part("metal").color(P.SHADE_3, P.SHADE_2)
    for z in (1.0, 2.6):
        a.box(0.2, 0.1, 0.05, bevel=0).rot(z=122 - 90).move(px * (r + 0.07), py * (r + 0.07), z).color(P.STEEL_DARK)


# --------------------------------------------------------------------------------------------
# Water tower
# --------------------------------------------------------------------------------------------
@asset("water-tower", tint="#c9cdd2", budget=2400, note="Tank on braced legs; the tank is tinted metal.")
def water_tower(a):
    R = 0.84
    zb, zw, zt = 2.72, 3.1, 4.2
    foot, head = 0.78, 0.56
    z_foot, z_head = 0.1, zw - 0.04
    steel = P.STEEL_DARK

    def leg(sx, sy, z):
        k = (z - z_foot) / (z_head - z_foot)
        q = foot + (head - foot) * k
        return Vector((sx * q, sy * q, z))

    corners = ((1, 1), (-1, 1), (-1, -1), (1, -1))
    for sx, sy in corners:
        a.box(0.32, 0.32, 0.13, bevel=0.03, grounded=True).move(sx * foot, sy * foot, 0).color(P.CONCRETE_DARK, P.CONCRETE)
        a.tube([leg(sx, sy, z_foot), leg(sx, sy, z_head)], 0.052, 6).color(jk.shade(steel, -0.1), steel)
    levels = (z_foot + 0.08, 1.08, 2.06, z_head - 0.1)
    for i, (sx, sy) in enumerate(corners):
        nx, ny = corners[(i + 1) % 4]
        for z in levels[1:3]:
            a.tube([leg(sx, sy, z), leg(nx, ny, z)], 0.03, 4).color(steel)
        for lo, hi in zip(levels, levels[1:]):
            a.tube([leg(sx, sy, lo), leg(nx, ny, hi)], 0.016, 4).color(steel)
            a.tube([leg(nx, ny, lo), leg(sx, sy, hi)], 0.016, 4).color(steel)

    # Tank: dished bottom, banded wall, conical roof.
    prof = []
    for i in range(5):
        ang = i / 4 * math.pi / 2
        prof.append((0.13 + (R - 0.13) * math.sin(ang), zw - (zw - zb) * math.cos(ang)))
    for z in (zw + 0.26, zt - 0.26):
        prof += [(R, z - 0.06), (R + 0.035, z - 0.025), (R + 0.035, z + 0.025), (R, z + 0.06)]
    prof.append((R, zt))
    a.lathe(prof, 16, cap_top=False).part("metal").color(P.SHADE_1, P.WHITE)
    a.lathe([(R + 0.03, zt - 0.03), (R + 0.08, zt), (R + 0.08, zt + 0.045), (0.52, zt + 0.3), (0.1, zt + 0.55), (0.07, zt + 0.6), (0, zt + 0.61)], 16, cap_bottom=False).part("metal").color(P.SHADE_2, P.SHADE_1)
    a.sphere(0.055, 8, 5).move(0, 0, zt + 0.64).part("metal").color(P.SHADE_1)
    a.sphere(0.035, 6, 4).move(0, 0, zt + 0.715).part("glow").color(P.GLOW_RED)
    a.torus(head * 1.414 - 0.02, 0.05, 16, 4).move(0, 0, z_head - 0.01).color(steel)

    # Catwalk with a railing that opens at the ladder.
    a.lathe([(R - 0.03, 0), (R + 0.22, 0), (R + 0.22, 0.045), (R - 0.03, 0.045)], 16, cap_bottom=False, cap_top=False).move(0, 0, zw + 0.02).color(jk.shade(steel, -0.15), steel)
    rail = R + 0.2
    a.torus(rail, 0.014, 20, 4, arc=326).rot(z=17).move(0, 0, zw + 0.36).color(steel)
    for x, y, ang in ring(10, rail, 17):
        if abs(ang - 360) < 1 or ang < 1:
            continue
        a.box(0.024, 0.024, 0.3, bevel=0).move(x, y, zw + 0.06).color(steel)

    # Ladder on the right, tied back to the girts.
    lx = R + 0.22
    ladder(a, zw + 0.42, w=0.26, gap=0.27, color=steel, standoff=0.05).rot(z=90).move(lx, 0, 0)
    for z in levels[1:3]:
        tie = leg(1, 1, z)
        bar(a, (tie.x, 0, z), (lx + 0.05, 0, z), 0.03, 0.03).color(steel)

    # Riser pipe with flanges, a valve wheel and an outlet into the ground.
    a.box(0.5, 0.5, 0.1, bevel=0.03, grounded=True).color(P.CONCRETE_DARK, P.CONCRETE)
    a.tube([(0, 0, 0.08), (0, 0, zb + 0.06)], 0.1, 10).part("metal").color(P.SHADE_3, P.SHADE_2)
    for z in (0.5, 1.6, zb - 0.06):
        a.cyl(0.135, 0.05, 8, bevel=0).move(0, 0, z).part("metal").color(P.SHADE_2)
    a.tube([(0, 0, 0.3), (-0.42, 0, 0.3), (-0.56, 0, 0.24), (-0.6, 0, 0.1), (-0.6, 0, 0)], 0.07, 8).part("metal").color(P.SHADE_3, P.SHADE_2)
    a.tube([(0, -0.08, 0.78), (0, -0.2, 0.78)], 0.018, 5).color(steel)
    a.torus(0.085, 0.017, 10, 4).rot(x=90).move(0, -0.2, 0.78).color(P.RED)


# --------------------------------------------------------------------------------------------
# Lighthouse
# --------------------------------------------------------------------------------------------
@asset("lighthouse", tint="#ffffff", budget=2400, note="Striped tower; the lantern lens is the glow.")
def lighthouse(a):
    z0, z1, bands = 0.28, 4.06, 5
    bh = (z1 - z0) / bands

    def radius(z):
        k = (z - z0) / (z1 - z0)
        return 0.42 + 0.22 * (1 - k) ** 1.35

    a.lathe([(0.8, 0), (0.8, 0.1), (0.77, 0.14), (0.72, 0.14), (0.72, 0.24), (0.69, 0.28), (0.5, 0.28)], 16, cap_bottom=False, cap_top=False).color(P.STONE_DARK, P.STONE)
    prof = [(radius(z0 + (z1 - z0) * i / 10), z0 + (z1 - z0) * i / 10) for i in range(11)]
    tower = a.lathe(prof, 16, cap_bottom=False, cap_top=False)

    def stripe(f):
        z = f.calc_center_median().z
        k = (z - z0) / (z1 - z0)
        tone = P.RED if int((z - z0) / bh) % 2 else P.OFF_WHITE
        return jk.shade(tone, -0.1 + 0.12 * k)

    tower.paint(stripe)

    # Gallery on a corbel, with an iron railing.
    dark = (P.CHARCOAL, P.SLATE)
    zg = 4.27
    a.lathe([(0.42, 3.94), (0.45, 4.02), (0.6, 4.14), (0.67, 4.16), (0.67, zg - 0.03), (0.64, zg), (0.3, zg)], 16, cap_bottom=False, cap_top=False).color(*dark)
    a.torus(0.62, 0.015, 16, 4).move(0, 0, zg + 0.27).color(P.INK)
    a.torus(0.62, 0.01, 16, 4).move(0, 0, zg + 0.14).color(P.INK)
    for x, y, ang in ring(8, 0.62, 22.5):
        a.box(0.026, 0.026, 0.27, bevel=0).move(x, y, zg).color(P.INK)

    # Lantern room: murette, a low tier of storm panes, an open cage and the lens inside it.
    a.cyl(0.38, 0.13, 12, bevel=0.015).move(0, 0, zg).color(jk.shade(P.OFF_WHITE, -0.1), P.OFF_WHITE)
    a.cyl(0.335, 0.15, 8, bevel=0).move(0, 0, zg + 0.13).part("glass").color(P.GLASS_TINTED, P.GLASS)
    a.cyl(0.36, 0.035, 12, bevel=0.008).move(0, 0, zg + 0.28).color(*dark)
    zc = zg + 0.3
    for x, y, ang in ring(8, 0.335, 0):
        a.box(0.036, 0.036, 0.47, bevel=0).rot(z=ang).move(x, y, zc).color(P.CHARCOAL)
    lens = a.lathe([(0.1, zc), (0.2, zc + 0.05), (0.25, zc + 0.14), (0.25, zc + 0.3), (0.2, zc + 0.39), (0.1, zc + 0.44)], 10).part("glow")
    lens.paint(lambda f: P.GLOW_WHITE if int((f.calc_center_median().z - zc) / 0.075) % 2 else P.LAMP)
    a.cyl(0.4, 0.07, 12, bevel=0.015).move(0, 0, zc + 0.45).color(*dark)
    zroof = zc + 0.52
    a.lathe([(0.47, zroof - 0.02), (0.47, zroof + 0.02), (0.34, zroof + 0.13), (0.17, zroof + 0.31), (0.08, zroof + 0.4), (0.06, zroof + 0.47), (0, zroof + 0.47)], 12).color(jk.shade(P.RED, -0.18), P.RED)
    a.sphere(0.065, 8, 5).move(0, 0, zroof + 0.52).part("metal").color(P.BRASS)
    a.tube([(0, 0, zroof + 0.56), (0, 0, zroof + 0.76)], 0.011, 4).part("metal").color(P.BRASS)

    # Entrance porch and slit windows on the red bands.
    arch = [(-0.24, 0), (0.24, 0), (0.24, 0.6)]
    for i in range(1, 6):
        ang = math.pi * i / 6
        arch.append((0.24 * math.cos(ang), 0.6 + 0.24 * math.sin(ang)))
    arch.append((-0.24, 0.6))
    a.profile_y(arch, 0.24, bevel=0.02).move(0, -0.6, z0).color(jk.shade(P.OFF_WHITE, -0.08), P.OFF_WHITE)
    parts.door(a, 0.26, 0.66, leaf=P.WALNUT, trim=P.STONE, step=None).move(0, -0.72, z0)
    a.box(0.5, 0.2, 0.06, bevel=0.015).move(0, -0.72, z0 - 0.04).color(P.STONE)
    for ang, z in ((-90, 1.2), (0, 2.72), (90, 1.2), (180, 2.72)):
        r = radius(z + 0.2) - 0.012
        parts.window(a, 0.15, 0.3, trim=P.OFF_WHITE, pane="glass", pane_color=P.GLASS_DARK, mullion="", border=0.04).rot(z=ang + 90).move(
            math.cos(math.radians(ang)) * r, math.sin(math.radians(ang)) * r, z
        )


# --------------------------------------------------------------------------------------------
# Dock
# --------------------------------------------------------------------------------------------
@asset("dock", tint="#ffffff", budget=2000, note="Timber pier; the seaward end is the front, piles run below 0.")
def dock(a):
    L = 5.96
    top = 0.37
    planks = 13
    step = L / planks
    half = 0.63
    wood = jk.mix(P.OAK_WOOD, P.STONE, 0.22)
    wood_b = jk.mix(P.PINE_WOOD, P.STONE, 0.3)

    # Deck: one extrusion with a chamfered groove between planks.
    c = 0.022
    pts = [(-L / 2, top - 0.08), (L / 2, top - 0.08), (L / 2, top - c)]
    for i in range(planks, 0, -1):
        y1 = -L / 2 + i * step
        y0 = y1 - step
        pts += [(y1 - c, top), (y0 + c, top)]
        pts.append((y0, top - 0.03) if i > 1 else (y0, top - c))
    deck = a.profile_x(pts, 2 * half, bevel=0)
    deck.color(jk.shade(wood, -0.12))
    deck.paint(lambda f: (wood if int((f.calc_center_median().y + L / 2) / step) % 2 else wood_b) if f.normal.z > 0.5 else None)

    # Structure: stringers on cap beams on paired piles.
    timber = (jk.shade(P.WALNUT, -0.1), P.WALNUT)
    for s in (-1, 1):
        a.box(0.12, L - 0.1, 0.1, bevel=0.012).move(s * 0.4, 0, top - 0.18).color(*timber)
    rows = (-2.66, -0.9, 0.9, 2.66)
    for i, y in enumerate(rows):
        a.box(1.62, 0.15, 0.13, bevel=0.015).move(0, y, top - 0.31).color(*timber)
        for s in (-1, 1):
            a.cyl(0.085, 1.07, 8, r2=0.072, bevel=0.022, grounded=True).move(s * 0.72, y, -0.6).color(jk.mix(P.BARK_DARK, P.MOSS, 0.3), jk.mix(P.OAK_WOOD, P.STONE, 0.2))
            a.cyl(0.092, 0.04, 8, bevel=0).move(s * 0.72, y, 0.4).color(P.OFF_WHITE)
    # Mooring bollards.
    for y in (-2.2, 0.0):
        for s in (-1, 1):
            a.lathe([(0.085, 0), (0.055, 0.04), (0.055, 0.09), (0.1, 0.12), (0.1, 0.15), (0, 0.165)], 7).move(s * 0.46, y, top).color(P.INK, P.CHARCOAL)

    # Ladder down to the water at the seaward end, with hoops onto the deck.
    lx = 0.2
    ladder(a, 0.86, w=0.3, gap=0.2, standoff=0.05).move(lx, -L / 2, -0.44)
    for s in (-1, 1):
        x = lx + s * 0.15
        a.tube([(x, -L / 2 - 0.05, 0.4), (x, -L / 2 - 0.05, 0.49), (x, -L / 2 + 0.04, 0.535), (x, -L / 2 + 0.16, 0.49), (x, -L / 2 + 0.16, top)], 0.018, 5).color(P.STEEL_DARK)
    # Tyre fenders hung on the right, a rope coil and a crate on deck.
    for y in (-1.8, 1.6):
        a.torus(0.14, 0.055, 9, 4).rot(y=90).move(half + 0.07, y, 0.14).color(P.INK, P.CHARCOAL)
        a.tube([(half + 0.07, y, 0.26), (half - 0.02, y, top + 0.01)], 0.012, 4).color(P.SAND)
    for k in range(2):
        a.torus(0.14 - k * 0.012, 0.032, 9, 4).move(-0.3, 1.3, top + 0.03 + k * 0.055).color(jk.shade(P.SAND, -0.12), P.SAND)
    a.box(0.36, 0.3, 0.17, bevel=0.02).rot(z=14).move(0.28, 2.2, top).color(jk.shade(P.PINE_WOOD, -0.12), P.PINE_WOOD)
    a.box(0.38, 0.05, 0.04, bevel=0).rot(z=14).move(0.28, 2.2, top + 0.11).color(P.OAK_WOOD)


# --------------------------------------------------------------------------------------------
# Windmill (whole, body and sails)
# --------------------------------------------------------------------------------------------
#: Where the sails' hub sits on the body: the web app places `windmill-sails` here.
MILL_HUB = (0.0, -0.704, 2.496)


def mill_body(a):
    turn = math.radians(22.5)
    plaster = (jk.shade(P.PLASTER, -0.1), P.CREAM)
    cap_c = (jk.shade(P.RUST, -0.12), jk.mix(P.RUST, P.OAK_WOOD, 0.6))
    z0, zt = 0.2, 2.42

    def radius(z):
        # A straight batter: each of the eight faces is one flat, leaning plane.
        return 0.72 - 0.22 * (z - z0) / (zt - z0)

    a.lathe([(0.82, 0), (0.82, 0.1), (0.78, 0.14), (0.76, 0.14), (0.76, z0 + 0.02)], 8, cap_bottom=False, turn=turn).smooth(30).color(P.STONE_DARK, P.STONE)
    a.lathe([(radius(z0), z0), (radius(zt), zt)], 8, cap_bottom=False, cap_top=False, turn=turn).smooth(30).bevel(0.022).color(*plaster)
    zs = 0.9
    a.lathe([(radius(zs - 0.06) + 0.004, zs - 0.06), (radius(zs) + 0.035, zs - 0.02), (radius(zs) + 0.035, zs + 0.03), (radius(zs + 0.07) + 0.004, zs + 0.07)], 8, cap_bottom=False, cap_top=False, turn=turn).smooth(30).color(P.STONE)

    def face(z):
        return radius(z) * math.cos(turn)

    lean = -math.degrees(math.atan2(face(z0) - face(zt), zt - z0))

    def on_wall(group, z, ang=0.0, sink=0.012):
        # Stand an opening on the leaning wall face at height z, then turn it to face `ang`.
        return group.rot(x=lean).move(0, -face(z) + sink, z).rot(z=ang)

    # Door at the front, small windows spiralling up the faces.
    on_wall(parts.door(a, 0.34, 0.6, leaf=P.TEAL, trim=P.OFF_WHITE, step=None), z0 + 0.02)
    a.box(0.56, 0.12, 0.08, bevel=0.02).move(0, -0.775, 0.14).color(P.STONE)
    for ang, z in ((90, 1.2), (180, 1.6), (-90, 1.85), (0, 1.52), (135, 1.25), (-135, 0.38)):
        on_wall(
            parts.window(a, 0.2, 0.26, trim=P.OFF_WHITE, pane="glass", pane_color=P.GLASS_DARK, mullion="bar", border=0.04, sill=ang != 0),
            z,
            ang,
        )

    # Timber cap: curb, faceted dome, the windshaft housing in front and a fantail behind.
    a.lathe([(0.53, zt - 0.03), (0.57, zt), (0.57, zt + 0.08), (0.54, zt + 0.1)], 8, cap_bottom=False, cap_top=False, turn=turn).smooth(30).color(P.OFF_WHITE)
    a.lathe([(0.6, zt + 0.07), (0.61, zt + 0.12), (0.57, zt + 0.3), (0.46, zt + 0.56), (0.29, zt + 0.8), (0.11, zt + 0.95), (0, zt + 0.99)], 8, turn=turn, cap_bottom=False).smooth(30).bevel(0.015).color(*cap_c)
    a.sphere(0.05, 8, 5).move(0, 0, zt + 1.02).part("metal").color(P.BRASS)
    hy, hz = MILL_HUB[1], MILL_HUB[2]
    a.box(0.34, 0.26, 0.3, bevel=0.03).move(0, -0.47, hz - 0.14).color(*cap_c)
    a.profile_y([(-0.2, 0), (0.2, 0), (0, 0.11)], 0.3, bevel=0.012).move(0, -0.47, hz + 0.15).color(jk.shade(P.RUST, -0.2))
    a.cyl(0.07, 0.1, 10, bevel=0.01).rot(x=90).move(0, -0.56, hz).part("metal").color(P.STEEL_DARK)
    # Fantail: a small wind wheel on a frame at the back of the cap.
    fy, fz = 0.655, zt + 0.66
    for s in (-1, 1):
        bar(a, (s * 0.13, 0.42, fz - 0.34), (s * 0.05, fy, fz), 0.035, 0.035).color(P.WALNUT)
        bar(a, (s * 0.12, 0.2, fz + 0.12), (s * 0.05, fy, fz), 0.03, 0.03).color(P.WALNUT)
    a.cyl(0.035, 0.14, 6, bevel=0.008).rot(y=90).move(-0.07, fy, fz).part("metal").color(P.STEEL_DARK)
    for i in range(6):
        with a.group() as g:
            a.box(0.014, 0.07, 0.14, bevel=0).rot(z=24).move(0, 0, 0.025).color(P.OFF_WHITE)
        g.rot(x=60 * i).move(0, fy, fz)


def mill_sails(a):
    """Four common sails on a hub at the origin, turning in the x-z plane and facing -y."""
    wood = (jk.shade(P.WALNUT, -0.05), jk.shade(P.WALNUT, 0.14))
    cloth = (jk.shade(P.BIRCH, -0.08), P.BIRCH)
    a.cyl(0.115, 0.13, 10, bevel=0.02).rot(x=90).move(0, 0.045, 0).color(P.CHARCOAL)
    a.dome(0.07, 0.04, 8, 2, grounded=False).rot(x=90).move(0, -0.083, 0).part("metal").color(P.BRASS)
    reach, inner, width = 1.93, 0.42, 0.33
    sy = -0.05  # the sails stand proud of the hub so they clear the tower as they turn
    for i in range(4):
        with a.group() as g:
            # The stock, a narrow leading board, and the lattice frame carrying the cloth.
            a.box(0.075, 0.06, reach, bevel=0.012, taper=(0.7, 0.8)).move(0, sy, 0).color(*wood)
            a.box(0.1, 0.022, reach - inner - 0.06, bevel=0).move(-0.085, sy, inner + 0.03).color(*cloth)
            a.box(0.03, 0.036, reach - inner, bevel=0).move(width, sy, inner).color(*wood)
            bars = 7
            for k in range(bars):
                z = inner + (reach - inner - 0.04) * k / (bars - 1)
                a.box(width, 0.03, 0.03, bevel=0).move(width / 2, sy, z).color(*wood)
            a.box(width - 0.05, 0.016, (reach - inner) * 0.86, bevel=0).move(width / 2 + 0.005, sy + 0.016, inner + 0.04).color(*cloth)
        g.rot(y=45 + 90 * i)


@asset("windmill-body", tint="#ffffff", budget=1700, note="Tower and cap only; sails are a separate kind.")
def windmill_body(a):
    mill_body(a)


@asset("windmill-sails", tint="#ffffff", grounded=False, budget=900, note="Hub at the origin; spins in the x-z plane, facing -y.")
def windmill_sails(a):
    mill_sails(a)


@asset("windmill", tint="#ffffff", budget=2400, note="windmill-body plus windmill-sails at rest.")
def windmill(a):
    mill_body(a)
    with a.group() as g:
        mill_sails(a)
    g.move(*MILL_HUB)


# --------------------------------------------------------------------------------------------
# Wind turbine
# --------------------------------------------------------------------------------------------
@asset("turbine", tint="#ffffff", budget=2400, note="Three-blade turbine; rotor faces -y, hub 6 up.")
def turbine(a):
    hub_z, rotor_y = 6.0, -0.4
    white = (jk.shade(P.OFF_WHITE, -0.12), P.OFF_WHITE)
    grey = (P.CONCRETE_DARK, P.CONCRETE)
    a.cyl(0.52, 0.1, 16, bevel=0.03, grounded=True).color(*grey)
    a.lathe([(0.36, 0.08), (0.36, 0.15), (0.3, 0.2), (0.265, 2.1), (0.215, 4.2), (0.165, 5.78)], 16, cap_bottom=False, cap_top=False).color(*white)
    a.lathe([(0.272, 1.86), (0.283, 1.9), (0.281, 2.0), (0.268, 2.04)], 16, cap_bottom=False, cap_top=False).color(P.STEEL)
    # Service door, steps and a transformer cabinet.
    a.box(0.18, 0.08, 0.4, bevel=0.03).move(0, -0.275, 0.24).color(P.SLATE)
    a.box(0.3, 0.2, 0.07, bevel=0.015).move(0, -0.38, 0.1).color(*grey)
    a.box(0.34, 0.26, 0.4, bevel=0.03).move(0.5, 0.22, 0).color(jk.shade(P.STEEL, -0.1), P.STEEL)
    a.box(0.36, 0.28, 0.035, bevel=0.01).move(0.5, 0.22, 0.4).color(P.STEEL_DARK)

    # Nacelle on its yaw bearing.
    a.cyl(0.19, 0.09, 14, bevel=0.015).move(0, 0, 5.74).color(P.STEEL_DARK)
    a.loft([(-0.22, 0.16, 0.17), (-0.12, 0.215, 0.215), (0.38, 0.215, 0.215), (0.6, 0.16, 0.14, 0.035)], 10, 4.5).move(0, 0, hub_z).color(*white)
    a.cyl(0.13, 0.12, 12, bevel=0.012).rot(x=90).move(0, -0.2, hub_z).color(P.STEEL_DARK)
    a.box(0.2, 0.22, 0.05, bevel=0.015).move(0, 0.3, hub_z + 0.19).color(P.STEEL)
    a.tube([(0.06, 0.42, hub_z + 0.18), (0.06, 0.42, hub_z + 0.42)], 0.012, 4).color(P.STEEL_DARK)
    a.box(0.14, 0.012, 0.012, bevel=0).move(0.06, 0.42, hub_z + 0.41).color(P.STEEL_DARK)
    a.sphere(0.035, 6, 4).move(-0.08, 0.44, hub_z + 0.215).part("glow").color(P.GLOW_RED)

    # Spinner and three twisted blades (one up, at rest).
    a.lathe([(0.165, 0), (0.175, 0.07), (0.15, 0.17), (0.09, 0.26), (0, 0.3)], 14).rot(x=90).move(0, -0.3, hub_z).color(*white)
    span = 3.3
    sections = [
        (0.08, 0.075, 0.075),
        (0.3, 0.08, 0.072),
        (0.62, 0.2, 0.05, 0, 0.1),
        (1.15, 0.19, 0.038, 0, 0.09),
        (2.2, 0.13, 0.025, 0, 0.048),
        (2.86, 0.09, 0.017, 0, 0.024),
        (3.2, 0.055, 0.011, 0, 0.008),
        (span, 0, 0),
    ]

    def twist(co):
        ang = math.radians(4 + 20 * (1 - min(1.0, co.y / span)) ** 1.6)
        c, s = math.cos(ang), math.sin(ang)
        return (co.x * c - co.z * s, co.y, co.x * s + co.z * c)

    for i in range(3):
        blade = a.loft(sections, 8, 2.0).warp(twist)
        blade.color(jk.shade(P.OFF_WHITE, -0.06), P.OFF_WHITE, "y")
        blade.paint(lambda f: P.RED if f.calc_center_median().y > 2.86 else None)
        blade.rot(x=90).rot(y=120 * i).move(0, rotor_y, hub_z)


# --------------------------------------------------------------------------------------------
# Solar array
# --------------------------------------------------------------------------------------------
@asset("solar-array", tint="#ffffff", budget=1500, note="Three tilted tables of framed panels; cells are glass.")
def solar_array(a):
    tilt = math.degrees(0.5)
    table_w, table_d = 2.96, 1.08
    cols = 4
    pw = table_w / cols
    alu = (jk.shade(P.CHROME, -0.2), P.CHROME)
    cell_lo, cell_hi = jk.shade(P.NAVY, -0.1), jk.mix(P.NAVY, P.BLUE, 0.75)
    sin_t, cos_t = math.sin(math.radians(tilt)), math.cos(math.radians(tilt))
    for row in (-1, 0, 1):
        y0 = row * 1.34
        with a.group() as g:
            for i in range(cols):
                x = -table_w / 2 + pw * (i + 0.5)
                a.box(pw - 0.03, table_d, 0.045, bevel=0.012).move(x, 0, -0.03).part("metal").color(*alu)
                a.box(pw - 0.1, table_d - 0.07, 0.014, bevel=0).move(x, 0, 0.008).part("glass").color(cell_lo, cell_hi, "y")
            a.box(table_w - 0.04, 0.035, 0.02, bevel=0).move(0, 0, 0.006).part("metal").color(P.CHROME)
            for y in (-0.3, 0.3):
                a.box(table_w - 0.2, 0.06, 0.06, bevel=0).move(0, y, -0.09).color(P.STEEL_DARK)
        g.rot(x=tilt).move(0, y0, 0.7)
        # Posts: a short front leg, a tall rear leg and a brace, on small footings.
        for s in (-1, 1):
            x = s * 1.05
            for y, zt in ((-0.3 * cos_t, 0.6 - 0.3 * sin_t), (0.3 * cos_t, 0.6 + 0.3 * sin_t)):
                a.box(0.07, 0.07, zt, bevel=0.012, grounded=True).move(x, y0 + y, 0).part("metal").color(P.STEEL_DARK, P.STEEL)
            bar(a, (x, y0 - 0.3 * cos_t, 0.14), (x, y0 + 0.3 * cos_t, 0.52), 0.035, 0.035).color(P.STEEL_DARK)
    # Inverter cabinet with a status light, cabled along the rows.
    a.box(0.3, 0.22, 0.46, bevel=0.03, grounded=True).move(1.3, 0.67, 0).color(jk.shade(P.STEEL, -0.08), P.OFF_WHITE)
    a.box(0.32, 0.24, 0.03, bevel=0.01).move(1.3, 0.67, 0.46).color(P.STEEL_DARK)
    a.box(0.05, 0.015, 0.05, bevel=0).move(1.24, 0.555, 0.33).part("glow").color(P.GLOW_GREEN)
    a.tube([(1.05, -1.34 + 0.2, 0.03), (1.05, 1.34 + 0.2, 0.03)], 0.02, 4).color(P.INK)
