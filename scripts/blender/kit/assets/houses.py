"""Homes. Walls are the tint part; `lit` panes glow and go dark in the -dark variant."""

import math

import bmesh
from mathutils import Matrix, Vector

from kit import jk, parts
from kit import palette as P
from kit.jk import asset


@asset("house", tint="#efe4cf", dark=True, budget=1500)
def house(a):
    w, d, wall = 2.4, 1.9, 1.38
    a.box(w + 0.14, d + 0.14, 0.16, bevel=0.03, grounded=True).color(P.STONE_DARK, P.STONE)
    a.box(w, d, wall, bevel=0.03).move(0, 0, 0.14).part("tint").color(P.SHADE_1, P.WHITE)
    top = 0.14 + wall
    rise, thick = 0.92, 0.1
    # The gable ends just inside the roof slab, so its slopes never share the roof's top plane.
    fit = 1 - (thick - 0.02) / rise
    for side in (-1, 1):
        a.add(parts.gable_wall(d * fit, rise * fit, 0.06)).rot(z=90 * side).move(
            side * (w / 2 - 0.03), 0, top
        ).part("tint").color(P.WHITE)
    parts.gable_roof(a, w, d, rise, overhang=0.2, thick=thick, color=P.TERRACOTTA).move(0, 0, top)
    parts.chimney(a, 0.28, 0.75).move(0.62, 0.38, top + 0.3)
    parts.door(a, 0.46, 0.92, leaf=P.WALNUT, light=True).move(0.5, -d / 2, 0.14)
    parts.window(a, 0.46, 0.5, shutters=P.TEAL).move(-0.52, -d / 2, 0.62)
    parts.window(a, 0.4, 0.46).rot(z=180).move(-0.55, d / 2, 0.66)
    parts.window(a, 0.4, 0.46).rot(z=180).move(0.55, d / 2, 0.66)
    for side in (-1, 1):
        parts.window(a, 0.4, 0.46, sill=True).rot(z=90 * side).move(side * w / 2, 0.0, 0.66)
        parts.window(a, 0.26, 0.26, sill=False, mullion="").rot(z=90 * side).move(side * (w / 2 - 0.03), 0.0, top + 0.2)
    # A planted box under the front window.
    a.box(0.56, 0.12, 0.09, bevel=0.02).move(-0.52, -d / 2 - 0.11, 0.5).color(P.OAK_WOOD)
    parts.canopy(a, [(-0.68, -d / 2 - 0.11, 0.62, 0.1), (-0.5, -d / 2 - 0.12, 0.64, 0.11), (-0.34, -d / 2 - 0.11, 0.62, 0.1)], seed=9, part="base", low=P.LEAF_DEEP, high=P.LEAF)


# --------------------------------------------------------------------------------------------
# Module helpers
# --------------------------------------------------------------------------------------------
def _beam(a, p0, p1, w, h=None, bevel=0.0, up=(0, 0, 1)):
    """A rectangular timber from p0 to p1: `w` across (horizontal) and `h` toward `up`."""
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
    m = Matrix(((x.x, y.x, z.x, mid.x), (x.y, y.y, z.y, mid.y), (x.z, y.z, z.z, mid.z), (0, 0, 0, 1)))
    return a.box(d.length, w, h, bevel=bevel).move(0, 0, -h / 2).apply(m)


def _face(a, pts, facing):
    """One flat face through `pts` whose front looks along `facing`: panes and dark openings."""
    piece = jk.raw(pts, [tuple(range(len(pts)))])
    face = next(iter(piece.bm.faces))
    if face.normal.dot(Vector(facing)) < 0:
        bmesh.ops.reverse_faces(piece.bm, faces=[face])
        piece.bm.normal_update()
    return a.add(piece)


def _slab(a, pts, t):
    """A thin sheet: the flat polygon `pts` (3D) thickened by `t` behind its front."""
    pts = [Vector(p) for p in pts]
    n = (pts[1] - pts[0]).cross(pts[2] - pts[0]).normalized()
    k = len(pts)
    verts = pts + [p - n * t for p in pts]
    faces = [tuple(range(k)), tuple(range(2 * k - 1, k - 1, -1))]
    faces += [(i, i + k, (i + 1) % k + k, (i + 1) % k) for i in range(k)]
    return a.add(jk.raw(verts, faces))


def _lath(a, p0, p1, w, t, out):
    """A batten from p0 to p1 lying on a surface that faces `out`: its front and two edges."""
    p0, p1, out = Vector(p0), Vector(p1), Vector(out).normalized()
    side = (p1 - p0).cross(out).normalized() * (w / 2)
    v = [p0 - side, p0 + side, p1 + side, p1 - side]
    v += [p + out * t for p in v]
    return a.add(jk.raw(v, [(4, 5, 6, 7), (0, 4, 7, 3), (5, 1, 2, 6)]))


def _skin(a, rings, cap_bottom=False, cap_top=False):
    """Skin a stack of rings (equal point counts, counter-clockwise from above)."""
    n = len(rings[0])
    verts = [p for ring in rings for p in ring]
    faces = []
    for k in range(len(rings) - 1):
        for i in range(n):
            j = (i + 1) % n
            faces.append((k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i))
    if cap_bottom:
        faces.append(tuple(range(n - 1, -1, -1)))
    if cap_top:
        faces.append(tuple(range((len(rings) - 1) * n, len(rings) * n)))
    return a.add(jk.raw(verts, faces))


def _win(
    a,
    w=0.4,
    h=0.48,
    trim=P.OFF_WHITE,
    pane="lit",
    pane_color=P.WINDOW,
    border=0.05,
    depth=0.06,
    recess=0.04,
    sill=True,
    mullion="cross",
    shutters=None,
):
    """A framed window in the manner of `parts.window`, at about half the triangles.

    Bottom centre at the origin on the wall plane y = 0, facing -y. `mullion` is "cross", "bar",
    "rows", "" or a number of evenly spaced upright bars (glazed walls).
    """
    start = len(a.pieces)
    a.add(parts.frame(w, h, border, depth, recess)).color(trim)
    y = -(depth - recess) - 0.012
    _face(a, [(-w / 2, y, border), (w / 2, y, border), (w / 2, y, border + h), (-w / 2, y, border + h)], (0, -1, 0)).part(
        pane
    ).color(pane_color).no_ao()
    bar = min(0.03, max(0.018, w * 0.08))
    if isinstance(mullion, int):
        for k in range(1, mullion + 1):
            a.box(bar, 0.02, h, bevel=0).move(-w / 2 + w * k / (mullion + 1), y - 0.004, border).color(trim)
    else:
        if mullion in ("cross", "bar"):
            a.box(bar, 0.02, h, bevel=0).move(0, y - 0.004, border).color(trim)
        if mullion in ("cross", "rows"):
            a.box(w, 0.02, bar, bevel=0).move(0, y - 0.004, border + h * 0.52).color(trim)
    if sill:
        a.profile_x([(0, -0.03), (-0.1, -0.03), (-0.1, 0.0), (-0.085, 0.015), (0, 0.015)], w + border * 2 + 0.08, bevel=0).color(trim)
    if shutters is not None:
        for side in (-1, 1):
            a.box(w * 0.42, 0.03, h + border, bevel=0.01).move(side * (w / 2 + border + w * 0.21 + 0.01), -0.02, border * 0.5).color(
                shutters
            )
    return parts.grouped(a, start)


def _wall_pane(a, p0, p1, z0, z1, margin=0.03, lift=0.008, part="lit", color=P.WINDOW):
    """A pane on the outside of the upright wall that runs from p0 to p1 (counter-clockwise plan)."""
    p0, p1 = Vector((p0[0], p0[1])), Vector((p1[0], p1[1]))
    u = (p1 - p0).normalized()
    n = Vector((u.y, -u.x))
    s, e = p0 + u * margin + n * lift, p1 - u * margin + n * lift
    return _face(a, [(s.x, s.y, z0), (e.x, e.y, z0), (e.x, e.y, z1), (s.x, s.y, z1)], (n.x, n.y, 0)).part(part).color(color).no_ao()


def _gable_y(a, w, y0, y1, rise, eave=0.12, thick=0.08, color=P.TERRACOTTA, cap=True):
    """A pitched roof whose ridge runs along y from y0 to y1, eaves at z = 0, over a body w wide."""
    start = len(a.pieces)
    s = w / 2 + eave
    drop = rise / (w / 2) * eave
    outline = [(-s, -drop), (0, rise), (s, -drop), (s, -drop - thick), (0, rise - thick), (-s, -drop - thick)]
    a.profile_y(outline, y1 - y0, bevel=min(0.025, thick * 0.3)).move(0, (y0 + y1) / 2, 0).color(
        jk.shade(color, -0.12), jk.shade(color, 0.1)
    )
    if cap:
        a.box(thick * 1.5, y1 - y0 + 0.03, thick * 0.8, bevel=thick * 0.25).move(0, (y0 + y1) / 2, rise - thick * 0.2).color(
            jk.shade(color, -0.2)
        )
    return parts.grouped(a, start)


def _gable_fill(w, rise, thick, depth=0.06):
    """The wall under a gable roof of this `rise` and slab `thick`: it stops just beneath the slab
    (a wall as tall as the roof would share the roof's top plane and flicker)."""
    inner = rise - thick - 0.006
    return parts.gable_wall(w * inner / rise, inner, depth)


def _bell_hip(a, w, d, rise, over=0.2, kick=0.26, lift=0.15, ridge=0.5, thick=0.09, color=P.SLATE):
    """A hipped roof with a bell-cast (kicked) eave, eaves at z = 0. `ridge` is its half-length."""
    x, y = w / 2 + over, d / 2 + over
    kx, ky = x - kick, y - kick
    v = [
        (-x, -y, -thick), (x, -y, -thick), (x, y, -thick), (-x, y, -thick),
        (-x, -y, 0), (x, -y, 0), (x, y, 0), (-x, y, 0),
        (-kx, -ky, lift), (kx, -ky, lift), (kx, ky, lift), (-kx, ky, lift),
        (-ridge, 0, rise), (ridge, 0, rise),
    ]
    f = [
        (3, 2, 1, 0),
        (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),
        (4, 5, 9, 8), (5, 6, 10, 9), (6, 7, 11, 10), (7, 4, 8, 11),
        (8, 9, 13, 12), (10, 11, 12, 13), (9, 10, 13), (11, 8, 12),
    ]
    return a.add(jk.raw(v, f)).bevel(0.022).color(jk.shade(color, -0.14), jk.shade(color, 0.1))


def _stack(a, x, y, z, w, d, h, color=P.STONE, pots=1, pot=P.TERRACOTTA):
    """A chimney stack with a corbelled cap and pots, its foot at (x, y, z)."""
    a.box(w, d, h, bevel=0.022).move(x, y, z).color(jk.shade(color, -0.16), color)
    a.box(w + 0.08, d + 0.08, 0.07, bevel=0.018).move(x, y, z + h).color(jk.shade(color, 0.14))
    for i in range(pots):
        off = (i - (pots - 1) / 2) * 0.17
        px, py = (x + off, y) if w >= d else (x, y + off)
        a.cyl(0.062, 0.12, 6, bevel=0.012).move(px, py, z + h + 0.07).color(jk.shade(pot, -0.12), pot)


def _shingle_outline(half, rise, eave, courses=3, butt=0.035, thick=0.09):
    """Front silhouette (x, z) of a lapped shingle roof: every course ends in a small butt."""
    ex, ez = -(half + eave), -rise / half * eave
    ux, uz = -ex, rise - ez
    length = math.hypot(ux, uz)
    ux, uz = ux / length, uz / length
    nx, nz = -uz, ux
    left = [(ex, ez - thick)]
    for i in range(courses):
        t0, t1 = i / courses * length, (i + 1) / courses * length
        left.append((ex + ux * t0 + nx * butt, ez + uz * t0 + nz * butt))
        left.append((ex + ux * t1, ez + uz * t1))
    right = [(-x, z) for x, z in reversed(left[:-1])]
    return left + right + [(0, rise - thick * 1.3)]


def _sheet(w, d, pitch=0.13, amp=0.028, t=0.022):
    """A corrugated sheet lying on z = 0: w across (x), its ridges running d along y."""
    n = max(2, round(w / pitch))
    m = 2 * n + 1
    top = [(-w / 2 + w * i / (2 * n), t + (amp if i % 2 else 0.0)) for i in range(m)]
    verts = [(x, -d / 2, z) for x, z in top] + [(x, d / 2, z) for x, z in top]
    b = len(verts)
    verts += [(-w / 2, -d / 2, 0), (w / 2, -d / 2, 0), (w / 2, d / 2, 0), (-w / 2, d / 2, 0)]
    faces = [(i, i + 1, m + i + 1, m + i) for i in range(m - 1)]
    faces.append(tuple([b, b + 1] + list(range(m - 1, -1, -1))))
    faces.append(tuple([b + 3] + list(range(m, 2 * m)) + [b + 2]))
    faces += [(b, 0, m, b + 3), (b + 1, b + 2, 2 * m - 1, m - 1), (b, b + 3, b + 2, b + 1)]
    return jk.raw(verts, faces).flat()


def _rim(a, w, d, wide, h, bevel=0.012):
    """A rectangular ring standing on z = 0: a parapet coping."""
    xo, yo, xi, yi = w / 2, d / 2, w / 2 - wide, d / 2 - wide
    v = []
    for z in (0, h):
        v += [(-xo, -yo, z), (xo, -yo, z), (xo, yo, z), (-xo, yo, z), (-xi, -yi, z), (xi, -yi, z), (xi, yi, z), (-xi, yi, z)]
    f = []
    for i in range(4):
        j = (i + 1) % 4
        f += [(i, j, 8 + j, 8 + i), (4 + j, 4 + i, 12 + i, 12 + j), (8 + i, 8 + j, 12 + j, 12 + i), (j, i, 4 + i, 4 + j)]
    return a.add(jk.raw(v, f)).bevel(bevel)


def _thatch_tier(a, r0, z0, r1, z1, sides, seed, low, high, inner=None, ragged=0.07, bulge=0.04, turn=0.0):
    """One coat of thatch: a skirt from its ragged lower edge (r0, z0) up to (r1, z1).

    `inner` is the (radius, z) where its underside meets the wall or the coat below.
    """
    inner = inner or (max(r0 - 0.16, r1 * 0.5), z0 + 0.07)
    profile = [inner, (r0, z0), ((r0 + r1) / 2 + bulge, (z0 + z1) / 2), (r1, z1)]
    tier = a.lathe(profile, sides, cap_bottom=False, cap_top=False, turn=turn)
    step = math.tau / sides

    def droop(co):
        if abs(co.z - z0) < 1e-6 and round((math.atan2(co.y, co.x) - turn) / step) % 2:
            return (co.x * 1.04, co.y * 1.04, co.z - ragged)
        return co

    return tier.warp(droop).jitter(0.018, seed=seed, scale=3.0).color(low, high).flat()


# --------------------------------------------------------------------------------------------
# Town houses
# --------------------------------------------------------------------------------------------
@asset("house-slate", tint="#e3e6e8", dark=True, budget=1500, note="Hipped slate roof, gabled wing with a bay, one dormer.")
def house_slate(a):
    w, d, wall, z0 = 2.3, 1.72, 1.4, 0.14
    cy = 0.17  # the main block sits back; the wing steps forward
    front, back, top = cy - d / 2, cy + d / 2, z0 + wall
    rise = 0.96
    slate, lead, trim = P.SLATE, jk.shade(P.SLATE, -0.24), P.OFF_WHITE
    door_red = jk.mix(P.BRICK, P.RED, 0.4)

    a.box(w + 0.14, d + 0.14, z0 + 0.02, bevel=0.03, grounded=True).move(0, cy, 0).color(P.STONE_DARK, P.STONE)
    a.box(w, d, wall, bevel=0.03).move(0, cy, z0).part("tint").color(P.SHADE_1, P.WHITE)
    _bell_hip(a, w, d, rise, ridge=0.62, color=slate).move(0, cy, top)
    a.box(1.34, 0.1, 0.07, bevel=0.022).move(0, cy, top + rise - 0.025).color(lead)
    _stack(a, 0.74, cy, top + 0.5, 0.3, 0.34, 0.62, color=P.BRICK, pots=2)

    # The gabled wing steps forward on the left and carries a canted bay window.
    wx, ww, wp = -0.56, 0.98, 0.32
    wf = front - wp
    wrise = 0.56
    a.box(ww + 0.14, wp + 0.12, z0 + 0.02, bevel=0.03, grounded=True).move(wx, wf + wp / 2 - 0.01, 0).color(P.STONE_DARK, P.STONE)
    a.box(ww, wp + 0.1, wall, bevel=0.03).move(wx, wf + (wp + 0.1) / 2, z0).part("tint").color(P.SHADE_1, P.WHITE)
    a.add(_gable_fill(ww, wrise, 0.09)).move(wx, wf + 0.03, top).part("tint").color(P.WHITE)
    _gable_y(a, ww, wf - 0.14, front + 0.52, wrise, eave=0.13, thick=0.09, color=slate).move(wx, 0, top)
    _win(a, 0.16, 0.18, trim=trim, border=0.035, depth=0.05, sill=False, mullion="").move(wx, wf, top + 0.04)

    bay = [(-0.36, 0.02), (-0.22, -0.17), (0.22, -0.17), (0.36, 0.02)]
    a.prism(bay, 1.2, bevel=0.02, grounded=True).move(wx, wf, 0).color(P.PLASTER, trim)
    a.prism([(-0.4, 0.02), (-0.25, -0.2), (0.25, -0.2), (0.4, 0.02)], 0.05, bevel=0.012).move(wx, wf, 0.5).color(trim)
    for p0, p1 in zip(bay, bay[1:]):
        _wall_pane(a, (p0[0] + wx, p0[1] + wf), (p1[0] + wx, p1[1] + wf), 0.6, 1.1, margin=0.04)
    a.box(0.026, 0.02, 0.5, bevel=0).move(wx, wf - 0.178, 0.6).color(trim)
    hood = a.prism([(-0.42, 0.02), (-0.26, -0.22), (0.26, -0.22), (0.42, 0.02)], 0.22, bevel=0.015)
    hood.warp(lambda co: (co.x * (1 - 0.3 * co.z / 0.22), co.y * (1 - 0.8 * co.z / 0.22), co.z)).move(wx, wf, 1.18).color(
        lead, jk.shade(slate, 0.05)
    )

    # Front door under a small lead hood, and a dormer in the slope above it.
    dx = 0.54
    parts.door(a, 0.46, 0.94, leaf=door_red, trim=trim, light=True).move(dx, front, z0)
    a.box(0.82, 0.34, 0.06, bevel=0.018).rot(x=8).move(dx, front - 0.16, z0 + 1.04).color(lead, jk.shade(slate, 0.05))
    for s in (-1, 1):
        _beam(a, (dx + s * 0.33, front - 0.01, z0 + 0.8), (dx + s * 0.33, front - 0.28, z0 + 1.03), 0.035, 0.035).color(trim)
    dw, dh, drise = 0.42, 0.42, 0.16
    dy = front + 0.2
    a.box(dw, 0.45, dh, bevel=0.015).move(0.38, dy + 0.225, top + 0.26).part("tint").color(P.SHADE_1, P.WHITE)
    a.add(_gable_fill(dw, drise, 0.05, 0.04)).move(0.38, dy + 0.02, top + 0.26 + dh).part("tint").color(P.WHITE)
    _gable_y(a, dw, dy - 0.07, dy + 0.58, drise, eave=0.07, thick=0.05, color=slate, cap=False).move(0.38, 0, top + 0.26 + dh)
    _win(a, 0.24, 0.26, trim=trim, border=0.035, depth=0.04, sill=False, mullion="bar").move(0.38, dy, top + 0.33)

    for y in (cy - 0.4, cy + 0.4):
        _win(a, 0.34, 0.5, trim=trim).rot(z=90).move(w / 2, y, 0.62)
    _win(a, 0.46, 0.54, trim=trim).rot(z=-90).move(-w / 2, cy + 0.12, 0.6)
    for x in (-0.55, 0.55):
        _win(a, 0.4, 0.5, trim=trim).rot(z=180).move(x, back, 0.62)


@asset("house-brown", tint="#d9c3a0", dark=True, budget=1500, note="Front-gabled shingle cabin with a porch and a stone chimney.")
def house_brown(a):
    w, d, wall, z0 = 1.86, 1.46, 1.2, 0.14
    cy, porch = 0.27, 0.52  # the house sits back behind its porch
    front, back, top = cy - d / 2, cy + d / 2, z0 + wall
    rise = 0.9
    shingle = jk.mix(P.RUST, P.OAK_WOOD, 0.22)
    trim, wood = P.CREAM, jk.shade(P.PINE_WOOD, -0.12)
    green = jk.mix(P.LEAF_DEEP, P.PINE, 0.4)

    a.box(w + 0.14, d + 0.14, z0 + 0.02, bevel=0.03, grounded=True).move(0, cy, 0).color(P.STONE_DARK, P.STONE)
    a.box(w, d, wall, bevel=0.03).move(0, cy, z0).part("tint").color(P.SHADE_1, P.WHITE)
    for y in (front + 0.03, back - 0.03):
        a.add(_gable_fill(w, rise, 0.12)).move(0, y, top).part("tint").color(P.WHITE)
    a.profile_y(_shingle_outline(w / 2, rise, 0.2, butt=0.05), d + 0.28, bevel=0.012).move(0, cy, top).color(
        jk.shade(shingle, -0.2), jk.shade(shingle, 0.03)
    )
    a.box(0.13, d + 0.32, 0.075, bevel=0.022).move(0, cy, top + rise - 0.01).color(jk.shade(shingle, -0.3))
    # Bargeboards and a pendant frame the front gable.
    drop = rise / (w / 2) * 0.2
    for s in (-1, 1):
        yb = front - 0.16 - 0.004 * s
        _beam(a, (s * (w / 2 + 0.1), yb, top - drop * 0.5 - 0.075), (0, yb, top + rise - 0.085), 0.04, 0.1).color(trim)
    a.box(0.08, 0.06, 0.3, bevel=0).move(0, front - 0.168, top + rise - 0.3).color(trim)

    # Porch: a boarded deck, four posts, a rail and a lean-to shingle roof.
    py = front - porch + 0.07
    deck = z0 + 0.02
    a.box(1.72, porch + 0.04, deck, bevel=0.02, grounded=True).move(0, front - porch / 2, 0).color(jk.shade(wood, -0.3), jk.shade(wood, -0.08))
    a.box(0.7, 0.16, 0.085, bevel=0.02, grounded=True).move(0, front - porch - 0.07, 0).color(jk.shade(wood, -0.3), jk.shade(wood, -0.1))
    roof_at_wall = top - 0.04
    a.profile_x(
        [(front + 0.02, roof_at_wall), (front - porch - 0.12, roof_at_wall - 0.12), (front - porch - 0.12, roof_at_wall - 0.19), (front + 0.02, roof_at_wall - 0.07)],
        1.64,
        bevel=0.015,
    ).color(jk.shade(shingle, -0.18), jk.shade(shingle, 0.06))
    beam_top = roof_at_wall - 0.07 - 0.12 * (porch - 0.05) / (porch + 0.14)
    a.box(1.62, 0.09, 0.08, bevel=0).move(0, py, beam_top - 0.08).color(trim)
    for x in (-0.76, -0.3, 0.3, 0.76):
        a.box(0.085, 0.085, beam_top - 0.08 - deck, bevel=0.014, grounded=True).move(x, py, deck).color(trim)
    rail = deck + 0.36
    for s in (-1, 1):
        a.box(0.38, 0.05, 0.045, bevel=0).move(s * 0.53, py, rail).color(trim)
        for k in (-0.5, 0.5):
            a.box(0.03, 0.03, 0.36, bevel=0).move(s * 0.53 + k * 0.14, py, deck).color(trim)
        a.box(0.05, porch - 0.11, 0.045, bevel=0).move(s * 0.76, (py + front) / 2, rail).color(trim)

    parts.door(a, 0.46, 0.92, leaf=green, trim=trim, step=None).move(0, front, z0)
    for x in (-0.6, 0.6):
        _win(a, 0.32, 0.44, trim=trim).move(x, front, 0.58)
    _win(a, 0.26, 0.26, trim=trim, sill=False).move(0, front, top + 0.2)
    for y in (cy - 0.36, cy + 0.36):
        _win(a, 0.34, 0.44, trim=trim).rot(z=-90).move(-w / 2, y, 0.6)
    _win(a, 0.3, 0.44, trim=trim).rot(z=90).move(w / 2, front + 0.3, 0.6)
    _win(a, 0.5, 0.46, trim=trim).rot(z=180).move(0, back, 0.6)

    # A fieldstone chimney built against the side wall.
    cx, ky = w / 2 + 0.13, cy + 0.2
    stone = jk.mix(P.STONE_DARK, P.SAND, 0.4)
    a.box(0.32, 0.62, 0.86, bevel=0.03, grounded=True).move(cx, ky, 0).color(jk.shade(stone, -0.26), jk.shade(stone, -0.06))
    a.box(0.32, 0.62, 0.3, bevel=0.03, taper=(1.0, 0.58)).move(cx, ky, 0.83).color(jk.shade(stone, -0.12), jk.shade(stone, -0.04))
    _stack(a, cx, ky, 1.08, 0.29, 0.34, 1.2, color=jk.shade(stone, -0.04), pots=1)
    for y, z, sx, sz in ((-0.14, 0.2, 0.15, 0.1), (0.11, 0.5, 0.13, 0.09)):
        a.box(0.03, sx, sz, bevel=0).move(cx + 0.152, ky + y, z).color(jk.shade(stone, 0.12))


@asset("house-flat", tint="#f2efe8", dark=True, budget=1500, note="Flat-roofed modern house: glazed ground floor, roof terrace and pergola.")
def house_flat(a):
    z0 = 0.07
    gw, gd, gh, gy = 2.6, 1.86, 1.04, 0.2
    gfront, gback = gy - gd / 2, gy + gd / 2
    slab = 0.11
    deck = z0 + gh + slab  # terrace level
    uw, ud, uh, ux, uy = 1.4, 1.52, 0.82, 0.6, 0.33
    ufront, uleft = uy - ud / 2, ux - uw / 2
    frame, concrete, timber = P.CHARCOAL, P.CONCRETE, P.OAK_WOOD
    glow = jk.shade(P.WINDOW, -0.06)

    a.box(gw - 0.1, gd - 0.1, z0 + 0.02, bevel=0, grounded=True).move(0, gy, 0).color(P.ASPHALT)
    a.box(gw, gd, gh, bevel=0.025).move(0, gy, z0).part("tint").color(P.SHADE_1, P.WHITE)
    edge = jk.mix(concrete, P.CONCRETE_DARK, 0.6)
    a.box(2.84, 2.36, slab, bevel=0.03).move(0, -0.02, z0 + gh).color(jk.shade(edge, -0.12), jk.shade(edge, 0.12))
    a.box(uw, ud, uh, bevel=0.025).move(ux, uy, deck).part("tint").color(P.SHADE_1, P.WHITE)
    utop = deck + uh
    _rim(a, uw + 0.05, ud + 0.05, 0.11, 0.07).move(ux, uy, utop - 0.005).color(jk.shade(edge, -0.06), jk.shade(edge, 0.14))
    rx, ry, rz = uw / 2 - 0.1, ud / 2 - 0.1, utop + 0.012
    _face(a, [(ux - rx, uy - ry, rz), (ux + rx, uy - ry, rz), (ux + rx, uy + ry, rz), (ux - rx, uy + ry, rz)], (0, 0, 1)).color(P.CONCRETE_DARK)
    # Solar panels and a flue on the upper roof.
    for sx in (-0.27, 0.27):
        a.box(0.46, 0.74, 0.03, bevel=0.008).rot(x=11).move(ux + sx - 0.1, uy + 0.05, utop + 0.085).part("glass").color(P.NAVY, P.GLASS_TINTED)
        a.box(0.4, 0.03, 0.13, bevel=0).move(ux + sx - 0.1, uy + 0.38, utop).color(P.STEEL_DARK)
    a.cyl(0.045, 0.2, 8, bevel=0.01).move(ux + 0.5, uy + 0.52, utop).part("metal").color(P.STEEL)

    # Ground floor: a glazed wall under the cantilever, timber-lined entrance on the right.
    _win(a, 1.42, 0.82, trim=frame, pane_color=glow, border=0.04, depth=0.05, sill=False, mullion=2).move(-0.46, gfront, z0 + 0.03)
    a.box(0.96, 0.03, gh - 0.07, bevel=0.01).move(0.8, gfront - 0.012, z0 + 0.02).color(jk.shade(timber, -0.12), jk.shade(timber, 0.08))
    a.add(parts.frame(0.42, 0.86, 0.04, 0.06, 0.03)).move(0.9, gfront - 0.02, z0 + 0.0).color(frame)
    a.box(0.42, 0.02, 0.86, bevel=0).move(0.9, gfront - 0.045, z0 + 0.04).color(jk.shade(P.WALNUT, -0.05), P.WALNUT)
    a.box(0.025, 0.03, 0.42, bevel=0).move(1.04, gfront - 0.07, z0 + 0.3).part("metal").color(P.CHROME)
    _win(a, 0.12, 0.8, trim=frame, pane_color=glow, border=0.03, depth=0.05, sill=False, mullion="").move(0.52, gfront - 0.02, z0 + 0.04)
    a.box(0.98, 0.36, 0.07, bevel=0.02, grounded=True).move(0.8, gfront - 0.18, 0).color(jk.shade(concrete, -0.1), concrete)
    a.box(0.05, 0.04, 0.12, bevel=0.012).move(1.22, gfront - 0.05, z0 + 0.72).part("glow").color(P.LAMP)
    # Patio deck and the slim column that carries the slab corner.
    a.box(1.66, 0.46, 0.055, bevel=0.015, grounded=True).move(-0.46, gfront - 0.23, 0).color(jk.shade(timber, -0.22), jk.shade(timber, -0.05))
    a.box(0.05, 0.05, z0 + gh, bevel=0).move(-1.33, -1.12, 0).part("metal").color(P.STEEL)
    a.box(0.5, 0.2, 0.2, bevel=0.02, grounded=True).move(-1.0, gfront - 0.34, 0.05).color(jk.shade(concrete, -0.12), concrete)
    parts.canopy(a, [(-1.12, gfront - 0.34, 0.32, 0.12), (-0.93, gfront - 0.33, 0.35, 0.14)], seed=4, part="base", low=P.LEAF_DEEP, high=P.LEAF)

    # Upper storey: a boxed picture window to the front, a glazed door onto the terrace.
    _win(a, 0.86, 0.46, trim=frame, pane_color=glow, border=0.045, depth=0.1, recess=0.085, sill=False, mullion=1).move(ux - 0.05, ufront, deck + 0.18)
    _win(a, 0.66, 0.64, trim=frame, pane_color=glow, border=0.04, depth=0.05, sill=False, mullion=1).rot(z=-90).move(uleft, uy - 0.2, deck + 0.02)
    _win(a, 0.5, 0.36, trim=frame, pane_color=glow, border=0.04, depth=0.05, sill=False, mullion="").rot(z=90).move(ux + uw / 2, uy + 0.1, deck + 0.26)
    _win(a, 0.7, 0.28, trim=frame, pane_color=glow, border=0.04, depth=0.05, sill=False, mullion=1).rot(z=180).move(ux, uy + ud / 2, deck + 0.36)
    _win(a, 0.9, 0.26, trim=frame, pane_color=glow, border=0.035, depth=0.05, sill=False, mullion=2).rot(z=90).move(gw / 2, gy + 0.1, z0 + 0.6)
    _win(a, 0.26, 0.74, trim=frame, pane_color=glow, border=0.035, depth=0.05, sill=False, mullion="").rot(z=-90).move(-gw / 2, gy - 0.3, z0 + 0.12)
    _win(a, 0.26, 0.74, trim=frame, pane_color=glow, border=0.035, depth=0.05, sill=False, mullion="").rot(z=-90).move(-gw / 2, gy + 0.35, z0 + 0.12)
    _win(a, 1.2, 0.26, trim=frame, pane_color=glow, border=0.035, depth=0.05, sill=False, mullion=2).rot(z=180).move(-0.4, gback, z0 + 0.6)

    # Roof terrace: boards, a glass balustrade and a timber pergola against the upper storey.
    tx0, tx1, ty0, ty1 = -1.36, uleft - 0.02, -1.14, 1.1
    a.box(tx1 - tx0, ty1 - ty0, 0.03, bevel=0.008).move((tx0 + tx1) / 2, (ty0 + ty1) / 2, deck - 0.004).color(jk.shade(timber, -0.2), jk.shade(timber, -0.04))
    gh2 = 0.3
    a.box(tx1 - tx0, 0.022, gh2, bevel=0).move((tx0 + tx1) / 2, ty0, deck + 0.03).part("glass").color(P.GLASS, P.ICE)
    a.box(0.022, ty1 - ty0, gh2, bevel=0).move(tx0, (ty0 + ty1) / 2, deck + 0.03).part("glass").color(P.GLASS, P.ICE)
    # A lounger and a low table in the sun.
    a.profile_x([(-0.98, deck + 0.1), (-0.5, deck + 0.1), (-0.3, deck + 0.3), (-0.3, deck + 0.36), (-0.52, deck + 0.16), (-0.98, deck + 0.16)], 0.26, bevel=0.012).move(-0.62, 0, 0).color(P.CREAM, P.OFF_WHITE)
    for y in (-0.92, -0.42):
        a.box(0.22, 0.03, 0.1, bevel=0).move(-0.62, y, deck + 0.02).color(P.CHARCOAL)
    a.cyl(0.11, 0.14, 8, bevel=0.012).move(-1.02, -0.72, deck + 0.02).color(jk.shade(timber, -0.1), timber)
    a.box(tx1 - tx0 + 0.04, 0.04, 0.03, bevel=0).move((tx0 + tx1) / 2, ty0, deck + 0.03 + gh2).part("metal").color(P.STEEL)
    a.box(0.04, ty1 - ty0 + 0.04, 0.03, bevel=0).move(tx0, (ty0 + ty1) / 2, deck + 0.03 + gh2).part("metal").color(P.STEEL)
    pz = deck + 0.7
    for y in (0.0, 1.02):
        a.box(0.07, 0.07, 0.7, bevel=0.012).move(tx0 + 0.09, y, deck).color(jk.shade(timber, -0.1), timber)
        a.box(tx1 - tx0 - 0.02, 0.06, 0.09, bevel=0).move((tx0 + tx1) / 2 + 0.03, y, pz).color(jk.shade(timber, -0.06), timber)
    for i in range(6):
        a.box(0.045, 1.3, 0.07, bevel=0).move(tx0 + 0.16 + i * 0.2, 0.51, pz + 0.09).color(jk.shade(timber, 0.04), jk.shade(timber, 0.14))


@asset("cottage", tint="#efe6d2", dark=True, budget=1500, note="Low thatched cottage with an eyebrow dormer and a stone end chimney.")
def cottage(a):
    w, d, wall, z0 = 1.84, 1.5, 1.04, 0.1
    cx = 0.05  # the chimney stands outside the left end
    top, front, back = z0 + wall, -d / 2, d / 2
    deep, gold = jk.mix(P.THATCH, P.RUST, 0.55), jk.mix(P.STRAW, P.ORANGE, 0.42)
    timber = jk.shade(P.WALNUT, 0.06)
    blue = jk.mix(P.BLUE, P.NAVY, 0.35)
    stone = jk.mix(P.STONE_DARK, P.SAND, 0.4)

    a.box(w + 0.12, d + 0.12, z0 + 0.02, bevel=0.03, grounded=True).move(cx, 0, 0).color(P.STONE_DARK, P.STONE)
    a.box(w, d, wall, bevel=0.035).move(cx, 0, z0).part("tint").color(P.SHADE_1, P.WHITE)

    # Thatch: two plump lapped coats with thick, hand-cut eaves and a block ridge.
    L, Y, rl, sides = w / 2 + 0.21, d / 2 + 0.21, 0.5, 16

    def ring(z, f, pad=0.0, ragged=0.0):
        pts = jk.superellipse(L - (L - rl) * (1 - f) + pad, Y * f + pad, sides, 4.0)
        return [(cx + x * (1.05 if ragged and i % 2 else 1), y * (1.05 if ragged and i % 2 else 1), top + z - (ragged if i % 2 else 0)) for i, (x, y) in enumerate(pts)]

    def coat(rings, seed, low, high, **caps):
        return _skin(a, rings, **caps).jitter(0.018, seed=seed, scale=2.6).color(low, high).flat()

    coat([ring(-0.15, 1.0, -0.05), ring(0.04, 1.0, 0.0, 0.05), ring(0.3, 0.83), ring(0.58, 0.58)], 3, jk.shade(deep, -0.12), jk.mix(deep, gold, 0.55), cap_bottom=True)
    coat([ring(0.56, 0.6, -0.02), ring(0.45, 0.72, 0.03, 0.06), ring(0.72, 0.45), ring(0.93, 0.2)], 7, jk.mix(deep, gold, 0.35), gold)
    coat([ring(0.92, 0.2, -0.02), ring(0.8, 0.34, 0.03, 0.05), ring(1.03, 0.1), ring(1.09, 0.02)], 11, jk.mix(deep, gold, 0.15), jk.mix(deep, gold, 0.6), cap_top=True)

    # Fieldstone chimney on the end wall, rising clear of the hip.
    kx = cx - w / 2 - 0.1
    a.box(0.44, 0.76, 0.9, bevel=0.035, grounded=True).move(kx, 0.06, 0).color(jk.shade(stone, -0.3), jk.shade(stone, -0.08))
    a.box(0.44, 0.76, 0.36, bevel=0.035, taper=(0.82, 0.53)).move(kx, 0.06, 0.87).color(jk.shade(stone, -0.14), jk.shade(stone, -0.06))
    _stack(a, kx, 0.06, 1.18, 0.34, 0.38, 1.0, color=jk.shade(stone, -0.06), pots=1)
    for y, z, sy, sz in ((-0.19, 0.2, 0.18, 0.1), (0.13, 0.52, 0.15, 0.09), (0.04, 1.62, 0.12, 0.08)):
        a.box(0.03, sy, sz, bevel=0).move(kx - 0.222 if z < 0.9 else kx - 0.172, 0.06 + y, z).color(jk.shade(stone, 0.1))

    # Plank door, a shuttered window with a flower box, and an eyebrow dormer in the thatch.
    parts.door(a, 0.44, 0.86, leaf=blue, trim=timber, light=True).move(cx - 0.3, front, z0)
    wx = cx + 0.42
    _win(a, 0.4, 0.4, trim=timber).move(wx, front, 0.46)
    for sd in (-1, 1):
        a.box(0.17, 0.03, 0.45, bevel=0).move(wx + sd * 0.345, front - 0.02, 0.485).color(jk.shade(blue, -0.1), blue)
    a.box(0.5, 0.11, 0.085, bevel=0.02).move(wx, front - 0.11, 0.36).color(P.OAK_WOOD)
    parts.canopy(a, [(wx - 0.15, front - 0.11, 0.48, 0.09), (wx + 0.02, front - 0.12, 0.5, 0.1), (wx + 0.17, front - 0.11, 0.48, 0.09)], seed=5, part="base", low=P.LEAF_DEEP, high=P.LEAF)
    for bx, bz in ((-0.14, 0.565), (0.1, 0.59)):
        a.ico(0.036, 1).move(wx + bx, front - 0.14, bz).color(P.PINK).flat()
    ex, ey, ez = cx + 0.42, -Y * 0.775, top + 0.38
    a.dome(1.0, 1.0, 8, 2).rot(x=-90).scale(0.35, 0.5, 0.28).move(ex, ey - 0.1, ez).jitter(0.012, seed=5, scale=4).color(
        jk.mix(deep, gold, 0.3), jk.mix(deep, gold, 0.75)
    ).flat()
    brow = [(ex + 0.31 * math.cos(math.radians(t)), ey - 0.07, ez + 0.245 * math.sin(math.radians(t))) for t in range(-20, 201, 20)]
    _face(a, brow, (0, -1, 0)).part("tint").color(P.SHADE_2)
    _win(a, 0.2, 0.15, trim=timber, border=0.03, depth=0.04, sill=False, mullion="bar").move(ex, ey - 0.07, ez - 0.02)

    _win(a, 0.34, 0.4, trim=timber).rot(z=90).move(cx + w / 2, 0.05, 0.46)
    for x in (-0.5, 0.5):
        _win(a, 0.34, 0.4, trim=timber).rot(z=180).move(cx + x, back, 0.46)
    # A rose climbs the front corner.
    parts.canopy(a, [(cx + 0.86, front - 0.05, 0.3, 0.15), (cx + 0.9, front - 0.03, 0.58, 0.12)], seed=11, part="base", low=P.LEAF_DEEP, high=P.LEAF)


# --------------------------------------------------------------------------------------------
# Scenario shelters
# --------------------------------------------------------------------------------------------
@asset("shanty", tint="#a89a84", dark=True, budget=1500, note="S2 patched shack: the main room is on the origin, its lean-to to +x.")
def shanty(a):
    w, d, hf, hb = 1.56, 1.36, 1.0, 0.82  # the roof drains to the back
    rust = jk.mix(P.RUST, P.TERRACOTTA, 0.3)
    zinc = jk.mix(P.STEEL, P.STONE, 0.45)
    blue = jk.mix(P.BLUE, P.STONE, 0.38)
    plank = jk.mix(P.OAK_WOOD, P.STONE, 0.35)
    fy = -d / 2

    def roof_z(y):
        return hf + (hb - hf) * (y + d / 2) / d

    pitch = math.degrees(math.atan2(hf - hb, d))

    def sheet(sw, sd, x, y, lift, turn, low, high, pitch_=0.14):
        return a.add(_sheet(sw, sd, pitch_)).rot(x=-pitch).rot(z=turn).move(x, y, roof_z(y) + lift).color(low, high, "y")

    def cladding(sw, sh, x, y, face, low=P.SHADE_3, high=P.SHADE_1, part="tint", z=0.03, pitch_=0.1):
        """A corrugated wall sheet standing on z, hung on the wall plane through (x, y)."""
        return a.add(_sheet(sw, sh, pitch_, 0.02, 0.012)).rot(x=90).move(0, 0, sh / 2).rot(z=face).move(x, y, z).part(part).color(low, high)

    with a.group() as room:
        a.profile_x([(fy, 0), (d / 2, 0), (d / 2, hb), (fy, hf)], w, bevel=0.02).part("tint").color(P.SHADE_2, P.WHITE)
        # Roof: three salvaged sheets, weighted down against the wind.
        sheet(1.02, 1.76, -0.44, -0.02, 0.004, 1.5, jk.shade(rust, -0.2), jk.shade(rust, 0.12))
        sheet(0.9, 0.74, 0.5, 0.5, 0.004, -3.0, jk.shade(blue, -0.15), jk.shade(blue, 0.12))
        sheet(0.98, 1.22, 0.46, -0.3, 0.036, -2.0, jk.shade(zinc, -0.2), jk.shade(zinc, 0.14))
        a.torus(0.155, 0.058, 9, 5).rot(x=-pitch).move(-0.5, 0.36, roof_z(0.36) + 0.11).color(P.INK, P.CHARCOAL)
        a.blob(0.1, 1, (1.2, 1, 0.7), seed=3).move(0.62, -0.62, roof_z(-0.62) + 0.13).color(P.STONE_DARK, P.STONE)
        a.blob(0.085, 1, (1, 1.2, 0.7), seed=8).move(0.2, 0.66, roof_z(0.66) + 0.1).color(P.STONE_DARK, P.STONE)
        a.box(0.2, 0.1, 0.07, bevel=0.012).rot(z=24).move(-0.62, -0.6, roof_z(-0.6) + 0.055).color(jk.shade(P.BRICK, -0.1), P.BRICK)
        # Stovepipe with a rain cap.
        px, py_ = -0.16, 0.3
        a.cyl(0.085, 0.05, 8, bevel=0.01).move(px, py_, roof_z(py_) + 0.02).part("metal").color(P.STEEL_DARK)
        a.tube([(px, py_, 0.7), (px, py_, 1.3)], 0.05, 8).part("metal").color(P.STEEL_DARK, P.STEEL)
        a.tube([(px, py_, 1.28), (px, py_, 1.36)], 0.02, 5).part("metal").color(P.STEEL_DARK)
        a.cone(0.105, 0.07, 8).move(px, py_, 1.34).part("metal").color(P.STEEL_DARK, P.STEEL)

        # Front: a plank door hung crooked, a window under a propped sheet flap.
        dx = -0.32
        with a.group() as door:
            for i, tone in enumerate((0.0, -0.14, 0.08)):
                a.box(0.135, 0.03, 0.78 - 0.02 * (i % 2), bevel=0).move(dx - 0.14 + i * 0.14, fy - 0.03, 0.03).color(jk.shade(plank, tone - 0.12), jk.shade(plank, tone))
            for z in (0.18, 0.62):
                a.box(0.4, 0.02, 0.055, bevel=0).move(dx, fy - 0.055, z).color(jk.shade(plank, -0.3))
            _beam(a, (dx - 0.17, fy - 0.052, 0.22), (dx + 0.17, fy - 0.052, 0.62), 0.016, 0.05).color(jk.shade(plank, -0.3))
        door.rot(z=-7, pivot=(dx - 0.21, fy, 0))
        for sx in (-1, 1):
            a.box(0.055, 0.05, 0.86, bevel=0).move(dx + sx * 0.245, fy - 0.02, 0).color(jk.shade(plank, -0.36), jk.shade(plank, -0.2))
        a.box(0.6, 0.06, 0.055, bevel=0).move(dx, fy - 0.02, 0.84).color(jk.shade(plank, -0.3))
        wx = 0.4
        _win(a, 0.3, 0.26, trim=jk.shade(plank, -0.2), border=0.04, depth=0.05, sill=False, mullion="bar").move(wx, fy, 0.44)
        a.add(_sheet(0.46, 0.34, 0.115, 0.022, 0.014)).move(0, -0.17, 0).rot(x=32).move(wx, fy - 0.02, 0.82).color(jk.shade(zinc, -0.25), jk.shade(zinc, 0.05), "y")
        a.tube([(wx + 0.17, fy - 0.03, 0.46), (wx + 0.19, fy - 0.3, 0.655)], 0.012, 4).color(jk.shade(plank, -0.2))
        a.box(0.3, 0.02, 0.36, bevel=0).move(0.62, fy - 0.01, 0.03).color(jk.shade(plank, -0.1), jk.shade(plank, 0.1))
        a.box(0.24, 0.02, 0.4, bevel=0).rot(y=4).move(0.04, fy - 0.008, 0.52).part("tint").color(P.SHADE_3, P.SHADE_2)
        a.box(0.2, 0.02, 0.3, bevel=0).rot(y=-3).move(0.68, fy - 0.006, 0.46).color(jk.shade(rust, -0.3), jk.shade(rust, -0.05))
        # Cladding and patches on the other walls.
        cladding(1.02, 0.84, -w / 2 - 0.004, 0.1, -90)
        a.box(0.02, 0.34, 0.4, bevel=0).move(-w / 2 - 0.01, -0.48, 0.03).color(jk.shade(plank, -0.1), jk.shade(plank, 0.1))
        _win(a, 0.22, 0.18, trim=jk.shade(plank, -0.2), border=0.035, depth=0.05, sill=False, mullion="bar").rot(z=-90).move(-w / 2, -0.47, 0.52)
        cladding(0.72, 0.76, -0.36, d / 2 + 0.004, 180, P.SHADE_3, P.SHADE_2)
        cladding(0.62, 0.7, 0.4, d / 2 + 0.004, 180, jk.shade(rust, -0.25), jk.shade(rust, 0.05), part="base")
        a.box(0.02, 0.42, 0.5, bevel=0).move(w / 2 + 0.01, -0.42, 0.36).color(jk.shade(blue, -0.12), jk.shade(blue, 0.1))
        # A salvaged aerial lashed to the back corner.
        a.tube([(-0.72, 0.62, 0.5), (-0.74, 0.64, 1.38)], 0.014, 4).part("metal").color(P.STEEL_DARK)
        for z, half in ((1.33, 0.13), (1.24, 0.09)):
            a.tube([(-0.74 - half, 0.64, z), (-0.74 + half, 0.64, z)], 0.009, 4).part("metal").color(P.STEEL)
    for piece in room.pieces:
        piece.warp(lambda co: (co.x + 0.035 * co.z, co.y, co.z))

    # Lean-to: board-clad, under one low sheet.
    with a.group() as lean:
        a.profile_y([(-0.46, 0), (0.46, 0), (0.46, 0.6), (-0.46, 0.8)], 0.9, bevel=0.02).part("tint").color(P.SHADE_3, P.SHADE_1)
        tilt = math.degrees(math.atan2(0.2, 0.92))
        a.add(_sheet(1.04, 1.08, 0.13)).rot(z=90).rot(y=tilt).move(0.02, 0, 0.705).color(jk.shade(zinc, -0.32), jk.shade(zinc, -0.02), "x")
        for i, (tone, drop) in enumerate(((P.SHADE_1, 0.0), (P.SHADE_3, 0.04), (P.WHITE, 0.01), (P.SHADE_2, 0.05), (P.SHADE_1, 0.02))):
            x = -0.37 + i * 0.185
            a.box(0.165, 0.025, 0.74 - (x + 0.46) * 0.2 - drop, bevel=0).move(x, -0.46, 0.02).part("tint").color(P.SHADE_3, tone)
        a.blob(0.08, 1, (1, 1, 0.7), seed=5).move(0.16, 0.2, 0.74).color(P.STONE_DARK, P.STONE)
    lean.rot(z=17).move(1.14, 0.2, 0)
    # A water drum and a crate in the yard between them.
    drum = [(0.135, 0), (0.135, 0.13), (0.147, 0.145), (0.135, 0.16), (0.135, 0.27), (0.147, 0.285), (0.135, 0.3), (0.135, 0.4), (0.11, 0.415), (0.105, 0.395), (0, 0.395)]
    a.lathe(drum, 8, cap_bottom=False).move(0.98, -0.72, 0).color(jk.shade(blue, -0.3), jk.shade(blue, 0.08))
    a.box(0.26, 0.22, 0.17, bevel=0.015, grounded=True).rot(z=-14).move(1.36, -0.62, 0).color(jk.shade(plank, -0.22), plank)
    a.box(0.27, 0.23, 0.022, bevel=0).rot(z=-14).move(1.36, -0.62, 0.085).color(jk.shade(plank, -0.4))


@asset("bunker", tint="#6f6560", dark=True, budget=1500, note="S8 sealed shelter: battered concrete, a blast door to the front, vents and a hatch on top.")
def bunker(a):
    X, Y, c, cy, h = 1.48, 1.18, 0.52, 0.06, 0.58
    lean = 0.1

    def octagon(x, y, k):
        return [(-x + k, -y), (x - k, -y), (x, -y + k), (x, y - k), (x - k, y), (-x + k, y), (-x, y - k), (-x, -y + k)]

    a.prism(octagon(X, Y, c), h, bevel=0.04, grounded=True).taper(1 - lean).move(0, cy, 0).part("tint").color(P.SHADE_3, P.SHADE_1)
    a.prism(octagon(X * 0.9 + 0.07, Y * 0.9 + 0.07, c * 0.9), 0.17, bevel=0.05).taper(0.94).move(0, cy, h - 0.02).part("tint").color(P.SHADE_1, P.WHITE)
    top = h + 0.15

    # Entrance: a heavy portal standing forward of the front wall, the blast door sunk into it.
    for s in (-1, 1):
        a.box(0.26, 0.62, 0.56, bevel=0.035, taper=(0.9, 1.0), grounded=True).move(s * 0.45, -1.22, 0).part("tint").color(P.SHADE_3, P.SHADE_1)
    a.profile_x([(-1.55, 0.5), (-0.88, 0.5), (-0.88, 0.76), (-1.4, 0.76), (-1.55, 0.66)], 1.2, bevel=0.035).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(0.66, 0.07, 0.5, bevel=0.02).move(0, -1.31, 0.0).part("metal").color(P.STEEL, P.CHROME)
    for z in (0.07, 0.4):
        a.box(0.6, 0.025, 0.045, bevel=0).move(0, -1.355, z).part("metal").color(P.STEEL_DARK)
    wz = 0.25
    a.torus(0.1, 0.02, 8, 3).rot(x=90).move(0, -1.385, wz).color(P.GUNMETAL)
    for i in range(3):
        a.box(0.2, 0.02, 0.022, bevel=0).move(0, 0, -0.011).rot(y=60 * i).move(0, -1.385, wz).color(P.GUNMETAL)
    a.cyl(0.035, 0.06, 6, bevel=0.008).rot(x=90).move(0, -1.35, wz).color(P.INK)
    for z in (0.08, 0.36):
        a.box(0.08, 0.06, 0.09, bevel=0.012).move(-0.31, -1.35, z).color(P.GUNMETAL)
    slit = _win(a, 0.56, 0.05, trim=P.SHADE_3, border=0.028, depth=0.035, recess=0.03, sill=False, mullion="").move(0, -1.55, 0.515)
    slit.pieces[0].part("tint")
    # A camera keeps watch from the lintel.
    a.box(0.07, 0.13, 0.065, bevel=0.012).rot(x=-18, z=28).move(0.44, -1.5, 0.79).color(P.CHARCOAL)
    a.tube([(0.47, -1.44, 0.74), (0.47, -1.44, 0.8)], 0.014, 4).color(P.INK)

    # Lit observation slits in the front corners, hooded in concrete.
    slope = math.degrees(math.atan2(lean * (X + Y - c) / math.sqrt(2), h))
    k = 1 - lean * 0.3 / h
    for s in (-1, 1):
        g = _win(a, 0.44, 0.06, trim=P.SHADE_3, border=0.04, depth=0.07, recess=0.05, sill=False, mullion="")
        g.pieces[0].part("tint")
        g.move(0, 0.015, -0.07).rot(x=-slope).rot(z=45 * s).move(s * (X - c / 2) * k, cy + (-Y + c / 2) * k, 0.3)

    # Buttresses rib the long walls and the back.
    def rib(x, y, face, shrink):
        back = shrink * 0.56 / h
        a.profile_x([(0.04, 0), (-0.2, 0), (back - 0.07, 0.56), (back + 0.04, 0.56)], 0.15, bevel=0.018).rot(z=face).move(x, y, 0).part("tint").color(P.SHADE_3, P.SHADE_1)

    for s in (-1, 1):
        for y in (-0.36, 0.36):
            rib(s * X, cy + y, 90 * s, lean * X)
    for x in (-0.55, 0.55):
        rib(x, cy + Y, 180, lean * Y)

    # Roof: an escape hatch, two filtered vents and a periscope.
    a.prism(octagon(X * 0.58, Y * 0.6, c * 0.5), 0.07, bevel=0.022, grounded=True).move(0.06, cy + 0.2, top - 0.012).part("tint").color(P.SHADE_2, P.SHADE_1)
    top += 0.055
    hx, hy = 0.5, cy + 0.2
    a.cyl(0.21, 0.05, 10, bevel=0.015).move(hx, hy, top - 0.005).part("metal").color(P.STEEL, P.CHROME)
    a.torus(0.085, 0.016, 8, 3).move(hx, hy, top + 0.08).color(P.GUNMETAL)
    a.box(0.17, 0.02, 0.02, bevel=0).move(hx, hy, top + 0.07).color(P.GUNMETAL)
    a.cyl(0.02, 0.04, 5, bevel=0).move(hx, hy, top + 0.04).color(P.GUNMETAL)
    a.box(0.1, 0.07, 0.05, bevel=0.01).move(hx, hy + 0.22, top - 0.005).color(P.GUNMETAL)
    vent = [(0.085, 0), (0.085, 0.03), (0.06, 0.045), (0.06, 0.19), (0.135, 0.21), (0.135, 0.245), (0.07, 0.3), (0, 0.31)]
    for vx, vy, sc in ((-0.42, cy + 0.02, 0.74), (-0.3, cy + 0.5, 0.58)):
        a.lathe(vent, 6, cap_bottom=False).scale(sc).move(vx, vy, top - 0.005).part("metal").color(P.STEEL_DARK, P.CHROME)
    top -= 0.055
    a.tube([(-1.02, cy - 0.3, top - 0.02), (-1.02, cy - 0.3, top + 0.2)], 0.022, 6).part("metal").color(P.STEEL_DARK, P.STEEL)
    a.box(0.07, 0.1, 0.07, bevel=0.012).move(-1.02, cy - 0.32, top + 0.18).color(P.CHARCOAL)


# --------------------------------------------------------------------------------------------
# Low-technology dwellings
# --------------------------------------------------------------------------------------------
@asset("hut", tint="#b38a5a", budget=1500, note="Round earth wall (tint) under a three-coat conical thatch.")
def hut(a):
    R, wall_h, n = 1.0, 0.92, 16
    deep, gold = jk.mix(P.THATCH, P.RUST, 0.55), jk.mix(P.STRAW, P.ORANGE, 0.42)
    timber = jk.shade(P.WALNUT, 0.04)
    dark = jk.mix(P.BARK_DARK, P.INK, 0.55)
    clay = jk.mix(P.TERRACOTTA, P.CLAY, 0.4)

    a.lathe([(R + 0.05, 0), (R + 0.05, 0.2), (R + 0.012, 0.25)], n, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_3, P.SHADE_2)
    a.lathe([(R + 0.014, 0.22), (R - 0.03, wall_h)], n, cap_bottom=False, cap_top=False).part("tint").color(P.SHADE_1, P.WHITE)

    _thatch_tier(a, 1.23, 0.75, 0.8, 1.26, n, 3, jk.shade(deep, -0.1), jk.mix(deep, gold, 0.55), inner=(R - 0.05, wall_h - 0.03))
    _thatch_tier(a, 0.9, 1.2, 0.42, 1.7, n, 7, jk.mix(deep, gold, 0.3), gold, ragged=0.06, turn=0.2)
    _thatch_tier(a, 0.5, 1.66, 0.0, 2.02, 12, 11, jk.mix(deep, gold, 0.5), jk.shade(gold, 0.12), ragged=0.05, bulge=0.03)
    # The crown is bound with rope and finished with a tuft.
    a.cyl(0.075, 0.08, 8, bevel=0.012).move(0, 0, 1.9).color(jk.shade(P.WALNUT, -0.1), P.WALNUT)
    a.cone(0.1, 0.15, 7).rot(x=180).move(0, 0, 2.1).jitter(0.012, seed=2, scale=6).color(gold, jk.shade(gold, 0.15)).flat()

    # Doorway: timber posts and lintel round a dark opening, a woven mat hung to one side.
    fy = -R - 0.06
    _face(a, [(-0.25, fy, 0.02), (0.25, fy, 0.02), (0.25, fy, 0.77), (-0.25, fy, 0.77)], (0, -1, 0)).color(dark)
    for s in (-1, 1):
        a.box(0.1, 0.2, 0.77, bevel=0.016, grounded=True).move(s * 0.3, -R - 0.025, 0).color(jk.shade(timber, -0.14), timber)
    a.box(0.7, 0.17, 0.075, bevel=0.016).move(0, -R - 0.01, 0.74).color(timber, jk.shade(timber, 0.1))
    _slab(a, [(-0.25, fy - 0.03, 0.76), (-0.25, fy - 0.035, 0.1), (-0.03, fy - 0.055, 0.07), (-0.0, fy - 0.03, 0.76)], 0.024).color(jk.shade(clay, -0.22), clay)
    a.box(0.27, 0.03, 0.05, bevel=0).move(-0.13, fy - 0.045, 0.5).color(P.CREAM)
    a.box(0.27, 0.03, 0.05, bevel=0).move(-0.13, fy - 0.045, 0.3).color(P.CREAM)
    a.box(0.66, 0.3, 0.05, bevel=0.015, grounded=True).move(0, -R - 0.1, 0).color(P.STONE_DARK, P.STONE)
    # Small shuttered openings to the sides and back.
    for ang in (0, 90, 180):
        c, s = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        with a.group() as g:
            a.add(parts.frame(0.24, 0.24, 0.045, 0.07, 0.05)).color(timber)
            _face(a, [(-0.12, -0.03, 0.045), (0.12, -0.03, 0.045), (0.12, -0.03, 0.285), (-0.12, -0.03, 0.285)], (0, -1, 0)).color(dark)
            a.box(0.02, 0.02, 0.24, bevel=0).move(0, -0.04, 0.045).color(timber)
        g.rot(z=ang + 90).move(c * (R - 0.018), s * (R - 0.018), 0.44)
    # Pots by the door and a grain mortar with its pestle.
    pot = [(0.05, 0), (0.1, 0.03), (0.14, 0.12), (0.12, 0.21), (0.075, 0.25), (0.09, 0.285), (0.06, 0.285), (0.055, 0.24), (0, 0.24)]
    a.lathe(pot, 8, cap_bottom=False).move(0.6, -1.0, 0).color(jk.shade(clay, -0.2), clay)
    a.lathe(pot, 8, cap_bottom=False).scale(0.68).move(0.82, -0.86, 0).color(jk.shade(clay, -0.28), jk.shade(clay, -0.05))
    a.lathe([(0.1, 0), (0.085, 0.05), (0.075, 0.18), (0.12, 0.33), (0.09, 0.33), (0.06, 0.2), (0, 0.2)], 8, cap_bottom=False).move(-0.7, -0.93, 0).color(jk.shade(timber, -0.1), jk.shade(timber, 0.16))
    a.tube([(-0.7, -0.93, 0.22), (-0.6, -0.99, 0.74)], [0.03, 0.022], 6, caps="round").color(P.PINE_WOOD)


@asset("tent", tint="#c4955f", budget=1500, note="Hide tent on lodge poles: the cover is the tint part, the door flap is tied open.")
def tent(a):
    n, R, top_r, H = 12, 0.86, 0.085, 1.58
    turn = math.radians(-105)  # a flat panel faces the front
    ca = math.cos(math.radians(15))
    pole = jk.shade(P.WALNUT, 0.05)
    dark = jk.mix(P.BARK_DARK, P.INK, 0.6)
    smoke = jk.mix(P.SHADE_3, P.CHARCOAL, 0.5)

    def r_at(z):
        return R + (top_r - R) * z / H

    def fy(z, lift=0.0):
        return -ca * r_at(z) - lift

    cover = a.lathe([(r_at(z), z) for z in (0.0, 0.1, 0.5, 0.58, 1.18, H)], n, cap_bottom=False, cap_top=False, turn=turn)

    def band(f):
        z = f.calc_center_median().z
        if z < 0.1 or 0.5 < z < 0.58:
            return P.SHADE_3
        return smoke if z > 1.18 else None

    cover.part("tint").color(P.SHADE_1, P.WHITE).paint(band).flat()

    # Door: a dark opening with its flap pinned back, lacing pins up the seam above it.
    door = [(-0.19, 0.0), (0.19, 0.0), (0.15, 0.45), (0.0, 0.84), (-0.15, 0.45)]
    _face(a, [(x, fy(z, 0.008), z) for x, z in door], (0, -1, 0.3)).color(dark)
    _slab(a, [(0.2, fy(0.02, 0.012), 0.02), (0.47, -0.92, 0.02), (0.37, -0.76, 0.54), (0.04, fy(0.82, 0.012), 0.82)], 0.026).part("tint").color(P.SHADE_3, P.SHADE_1)
    a.tube([(0.47, -0.93, 0.012), (0.44, -0.9, 0.16)], 0.016, 4).color(pole)
    _beam(a, (0, fy(0.86, 0.004), 0.86), (0, fy(1.2, 0.004), 1.2), 0.022, 0.01).part("tint").color(P.SHADE_3)
    for z in (0.95, 1.03, 1.11):
        a.box(0.12, 0.018, 0.018, bevel=0).move(0, fy(z, 0.016), z).color(P.PINE_WOOD)
    # The door cover is rolled up and tied above the opening.
    a.tube([(-0.12, fy(0.87, 0.03), 0.87), (0.12, fy(0.87, 0.03), 0.87)], 0.036, 6, caps="round").part("tint").color(P.SHADE_3, P.SHADE_2)

    # Smoke flaps held open by two outer poles; the lodge poles cross above the smoke hole.
    a.cyl(top_r + 0.012, 0.02, n, bevel=0).move(0, 0, H - 0.03).color(dark)
    for s in (-1, 1):
        tip = Vector((s * 0.37, -0.06, 1.5))
        _slab(a, [(s * 0.03, fy(1.57, 0.012), 1.57), (s * 0.045, fy(1.1, 0.012), 1.1), (s * 0.2, -0.17, 1.2), tuple(tip)], 0.022).part("tint").color(P.SHADE_3, P.SHADE_1)
        foot = Vector((s * 0.5, 0.74, 0.03))
        a.tube([foot, tip + (tip - foot).normalized() * 0.07], [0.02, 0.012], 5).color(jk.shade(pole, -0.1), pole)
    for i in range(n):
        ang = turn + i * math.tau / n
        base = Vector((R * math.cos(ang), R * math.sin(ang), 0))
        cross = Vector((0.035 * math.cos(ang + 2.2), 0.035 * math.sin(ang + 2.2), 1.62))
        along = (cross - base).normalized()
        a.tube([cross - along * 0.12, cross + along * (0.27 + 0.16 * a.rand.random())], [0.023, 0.011], 5).color(jk.shade(pole, -0.12), jk.shade(pole, 0.1))
        # A peg at the foot of every pole holds the cover down.
        a.tube([base * 1.1 + Vector((0, 0, 0.012)), base * 1.015 + Vector((0, 0, 0.13))], 0.016, 4).color(P.PINE_WOOD)
    a.cyl(0.072, 0.075, 8, bevel=0.012).move(0, 0, 1.585).color(jk.shade(P.SAND, -0.3), jk.shade(P.SAND, -0.1))
    for x, y, r, seed in ((-0.52, -0.74, 0.07, 2), (0.82, 0.3, 0.06, 5), (-0.78, 0.36, 0.075, 9)):
        a.blob(r, 1, (1.1, 1, 0.7), seed=seed).move(x, y, r * 0.45).warp(lambda co: (co.x, co.y, max(co.z, 0.0))).color(P.STONE_DARK, P.STONE)


@asset("yurt", tint="#e8dcc4", budget=1500, note="Felt yurt (tint) on a timber deck: lattice wall band, crown ring and a painted door.")
def yurt(a):
    n, R = 18, 1.14
    wood = P.OAK_WOOD
    accent = jk.mix(P.TERRACOTTA, P.ORANGE, 0.4)
    rope = jk.shade(P.WALNUT, 0.12)
    dark = jk.mix(P.BARK_DARK, P.INK, 0.5)

    def ring(profile, sides=n):
        return a.lathe(profile, sides, cap_bottom=False, cap_top=False)

    ring([(R + 0.07, 0), (R + 0.09, 0.02), (R + 0.09, 0.06), (R - 0.1, 0.075)]).color(jk.shade(wood, -0.34), jk.shade(wood, -0.12))
    # The felt is rolled up above a band of open lattice.
    ring([(R - 0.05, 0.07), (R - 0.05, 0.42)]).color(dark, jk.shade(dark, 0.08))
    m, z_lo, z_hi, rl = 18, 0.085, 0.385, R - 0.014
    for k in range(m):
        t0 = math.tau * k / m
        for sgn in (-1, 1):
            t1 = t0 + sgn * math.tau / m
            mid = (t0 + t1) / 2
            _lath(a, (rl * math.cos(t0), rl * math.sin(t0), z_lo), (rl * math.cos(t1), rl * math.sin(t1), z_hi), 0.036, 0.012 + 0.006 * sgn, (math.cos(mid), math.sin(mid), 0)).color(
                jk.shade(wood, -0.05), jk.shade(wood, 0.16)
            )
    ring([(R - 0.02, 0.37), (R + 0.05, 0.39), (R + 0.055, 0.45), (R - 0.005, 0.485)]).part("tint").color(P.SHADE_3, P.SHADE_1)
    ring([(R, 0.46), (R + 0.014, 0.62), (R, 0.78)]).part("tint").color(P.SHADE_1, P.WHITE)
    ring([(R + 0.008, 0.585), (R + 0.032, 0.61), (R + 0.008, 0.635)]).color(jk.shade(rope, -0.1), rope)
    roof = [(R + 0.075, 0.82), (0.86, 0.99), (0.55, 1.13), (0.3, 1.2)]
    ring([(R - 0.02, 0.76), (R + 0.065, 0.765)] + roof).part("tint").color(P.SHADE_1, P.WHITE)
    ring([(R + 0.07, 0.762), (R + 0.09, 0.772), (R + 0.09, 0.812), (R + 0.07, 0.827)]).color(jk.shade(accent, -0.15), accent)
    for k in range(6):
        t = math.tau * (k + 0.5) / 6
        a.tube([(r * math.cos(t), r * math.sin(t), z + 0.012) for r, z in reversed(roof)] + [((R + 0.094) * math.cos(t), (R + 0.094) * math.sin(t), 0.79)], 0.013, 3, caps="none").color(rope)

    # Crown: the roof ring with its spokes, a felt cover drawn half back, and the stove flue.
    ring([(0.31, 1.19), (0.335, 1.215), (0.32, 1.26), (0.26, 1.265), (0.245, 1.21)], 10).color(jk.shade(wood, -0.1), jk.shade(wood, 0.12))
    _face(a, [(0.25 * math.cos(math.tau * i / 10), 0.25 * math.sin(math.tau * i / 10), 1.215) for i in range(10)], (0, 0, 1)).color(dark)
    for ang in (45, 135):
        a.box(0.5, 0.03, 0.03, bevel=0).rot(z=ang).move(0, 0, 1.228).color(wood)
    _slab(a, [(-0.31, 0.0, 1.285), (0.31, 0.0, 1.285), (0.36, 0.4, 1.19), (-0.36, 0.4, 1.19)], 0.024).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.tube([(0, -0.12, 1.2), (0, -0.12, 1.46)], 0.035, 6).part("metal").color(P.STEEL_DARK, P.STEEL)
    a.cone(0.075, 0.055, 6).move(0, -0.12, 1.45).part("metal").color(P.STEEL_DARK, P.STEEL)

    # Door: a low timber portal with a pair of painted leaves.
    fy = -R - 0.075
    for s in (-1, 1):
        a.box(0.08, 0.2, 0.71, bevel=0.014, grounded=True).move(s * 0.31, -R - 0.03, 0.07).color(jk.shade(wood, -0.2), wood)
        a.box(0.265, 0.03, 0.64, bevel=0).move(s * 0.135, fy, 0.075).color(jk.shade(accent, -0.18), accent)
        a.box(0.17, 0.012, 0.46, bevel=0).move(s * 0.135, fy - 0.018, 0.165).color(jk.shade(accent, -0.3))
        a.box(0.03, 0.03, 0.07, bevel=0).move(s * 0.03, fy - 0.03, 0.37).part("metal").color(P.BRASS)
    a.box(0.78, 0.22, 0.085, bevel=0.016).move(0, -R - 0.03, 0.75).color(wood, jk.shade(wood, 0.12))
    a.box(0.62, 0.26, 0.035, bevel=0.01).move(0, -R - 0.1, 0.062).color(jk.shade(wood, -0.25), jk.shade(wood, -0.1))


@asset("longhouse", tint="#9a7a5a", budget=1500, note="Bowed timber hall (tint) under a long turf roof with a humped ridge.")
def longhouse(a):
    Lw, Lr = 2.36, 2.56  # half-lengths of the walls and the roof
    z0, wall_top, eave = 0.1, 1.06, 1.0
    wood = jk.shade(P.WALNUT, 0.02)
    turf_lo, turf_hi = jk.shade(P.MOSS, -0.42), jk.mix(P.MOSS, P.OLIVE, 0.2)

    def hw(x):  # wall half-depth: the plan is bowed like a boat
        return 0.62 + 0.2 * (1 - (x / Lw) ** 2)

    def span(x):  # eave half-depth
        return 0.82 + 0.2 * (1 - (x / Lr) ** 2)

    def ridge(x):
        return 1.76 + 0.34 * (1 - (x / Lr) ** 2)

    stations = [-Lw + 2 * Lw * i / 8 for i in range(9)]

    def plan(pad, k=1.0):
        return [(x * k, -(hw(x) + pad)) for x in stations] + [(x * k, hw(x) + pad) for x in reversed(stations)]

    a.prism(plan(0.06, (Lw + 0.06) / Lw), z0 + 0.03, bevel=0.03, grounded=True).color(P.STONE_DARK, P.STONE)
    a.prism(plan(0.0), wall_top - z0, bevel=0.03).move(0, 0, z0).part("tint").color(P.SHADE_1, P.WHITE)

    # Roof: a thick turf shell, eaves cut square, the ridge rounded.
    def section(x):
        e, zr = span(x), ridge(x)
        zc = eave + 0.6 * (zr - eave)
        left = [(-e + 0.03, eave - 0.13), (-e, eave - 0.02), (-e + 0.035, eave + 0.03), (-0.5 * e, zc), (-0.5 * e - 0.032, zc + 0.042), (-0.045, zr + 0.03), (0, zr + 0.042)]
        inner = [(-e + 0.2, eave - 0.13), (-0.5 * e + 0.09, zc - 0.11), (0, zr - 0.15)]
        outer = left + [(-y, z) for y, z in reversed(left[:-1])]
        under = [(-y, z) for y, z in inner[:-1]] + list(reversed(inner))
        return [(x, y, z) for y, z in outer + under]

    xs = [-Lr + 2 * Lr * i / 8 for i in range(9)]
    rings = [section(x) for x in xs]
    k = len(rings[0])
    verts = [p for r in rings for p in r]
    faces = [(j * k + i, j * k + (i + 1) % k, (j + 1) * k + (i + 1) % k, (j + 1) * k + i) for j in range(len(rings) - 1) for i in range(k)]
    faces += [tuple(range(k)), tuple(range(len(verts) - 1, len(verts) - k - 1, -1))]
    roof = a.raw(verts, faces).color(turf_lo, turf_hi)
    roof.paint(lambda f: jk.shade(wood, -0.1) if f.normal.z < 0.2 else None)

    # Gable ends: boarded, with crossed bargeboards rising past the ridge.
    for s in (-1, 1):
        a.profile_x([(-0.66, 0.95), (0.66, 0.95), (0.35, 1.4), (0, 1.69), (-0.35, 1.4)], 0.06, bevel=0).move(s * (Lw - 0.03), 0, 0).part("tint").color(P.SHADE_3, P.SHADE_1)
        _face(a, [(s * (Lw + 0.016), -0.1 * s, 1.16), (s * (Lw + 0.016), 0.1 * s, 1.16), (s * (Lw + 0.016), 0.1 * s, 1.4), (s * (Lw + 0.016), -0.1 * s, 1.4)], (s, 0, 0)).color(P.INK)
        e, zr = span(Lr), ridge(Lr)
        zc = eave + 0.6 * (zr - eave)
        for t in (-1, 1):
            x = s * (Lr + 0.02 + 0.02 * t)
            _beam(a, (x, t * (e + 0.02), eave - 0.06), (x, t * 0.5 * e, zc + 0.01), 0.04, 0.11).color(jk.shade(wood, -0.12), wood)
            _beam(a, (x, t * 0.5 * e, zc + 0.01), (x, -t * 0.26, zr + 0.34), 0.04, 0.11).color(wood, jk.shade(wood, 0.14))

    # Wall posts and the raking shores that prop them.
    for x in stations[1:-1]:
        for s in (-1, 1):
            if x == 0 and s == -1:
                continue
            y = s * hw(x)
            _lath(a, (x, y, z0 + 0.02), (x, y, wall_top - 0.05), 0.11, 0.04, (0, s, 0)).part("tint").color(P.SHADE_3, P.SHADE_2)
            a.tube([(x, s * (hw(x) + 0.3), 0.03), (x, s * (hw(x) + 0.05), wall_top - 0.16)], 0.04, 4, caps="none").color(jk.shade(wood, -0.16), wood).smooth(20)
    for x in (-Lw, Lw):
        for s in (-1, 1):
            a.box(0.13, 0.13, wall_top - z0 - 0.04, bevel=0).move(x * 0.995, s * (hw(x) - 0.01), z0).part("tint").color(P.SHADE_3, P.SHADE_2)

    # Porch and double doors midway along the front.
    fy = -hw(0)
    _gable_y(a, 0.84, fy - 0.42, fy + 0.25, 0.36, eave=0.1, thick=0.08, color=jk.shade(P.MOSS, -0.18), cap=False).move(0, 0, 1.04)
    a.add(_gable_fill(0.84, 0.36, 0.08, 0.05)).move(0, fy - 0.3, 1.04).part("tint").color(P.SHADE_2, P.SHADE_1)
    a.box(0.94, 0.1, 0.1, bevel=0).move(0, fy - 0.3, 0.95).color(wood, jk.shade(wood, 0.12))
    for s in (-1, 1):
        a.box(0.1, 0.1, 0.95, bevel=0.016, grounded=True).move(s * 0.4, fy - 0.3, 0).color(jk.shade(wood, -0.16), wood)
        a.box(0.29, 0.035, 0.84, bevel=0).move(s * 0.148, fy - 0.022, z0 + 0.02).color(jk.shade(P.OAK_WOOD, -0.22), jk.shade(P.OAK_WOOD, -0.02))
        for z in (0.3, 0.72):
            a.box(0.24, 0.014, 0.04, bevel=0).move(s * 0.16, fy - 0.045, z).color(P.INK)
        a.box(0.07, 0.07, 0.9, bevel=0).move(s * 0.335, fy - 0.03, z0).color(jk.shade(wood, -0.2), wood)
    a.box(0.76, 0.08, 0.08, bevel=0).move(0, fy - 0.03, z0 + 0.86).color(wood)
    a.box(0.86, 0.34, 0.05, bevel=0.015, grounded=True).move(0, fy - 0.19, z0 - 0.02).color(P.STONE_DARK, P.STONE)
    # A smoke louvre rides the ridge.
    rz = ridge(0) + 0.04
    a.box(0.5, 0.2, 0.17, bevel=0.015).move(0, 0, rz - 0.05).color(jk.shade(wood, -0.2), wood)
    parts.gable_roof(a, 0.5, 0.2, 0.1, overhang=0.07, thick=0.05, color=P.WALNUT, ridge=False).move(0, 0, rz + 0.12)
    # Firewood stacked under the eave.
    for x, z in ((0.76, 0.075), (0.9, 0.075), (1.04, 0.075), (0.83, 0.195), (0.97, 0.195)):
        a.cyl(0.07, 0.34, 6, bevel=0).rot(x=90).move(x, -hw(0.9) - 0.01, z).color(jk.shade(P.BARK, -0.1), P.BARK).paint_side(P.PINE_WOOD, (0, -1, 0))
