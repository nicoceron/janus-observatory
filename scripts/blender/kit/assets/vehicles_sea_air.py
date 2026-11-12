"""Ships, boats, aircraft and drones. Everything travels toward -y (bow or nose at -y).

Hulls are waterline models: they float with the waterline on z = 0. Bodywork is the tint part.
Port is +x and starboard is -x for a craft heading toward -y, so red lights sit on +x.
"""

import math

import bmesh
from mathutils import Vector

from kit import jk
from kit import palette as P
from kit.jk import asset


# --------------------------------------------------------------------------------------------
# Mesh helpers
# --------------------------------------------------------------------------------------------
class _Builder:
    """Collect faces as coordinate loops with an outward hint, then emit one Piece.

    Winding is fixed from the hint, so open shells (hull bands, sails, glazing patches) come out
    facing the right way without relying on a closed-volume normal recalculation.
    """

    def __init__(self):
        self.faces = []

    def face(self, pts, out):
        self.faces.append(([tuple(p) for p in pts], tuple(out)))

    def piece(self) -> jk.Piece:
        bm = bmesh.new()
        cache = {}

        def vert(p):
            key = (round(p[0], 5), round(p[1], 5), round(p[2], 5))
            v = cache.get(key)
            if v is None:
                v = cache[key] = bm.verts.new(p)
            return v

        for pts, out in self.faces:
            vs = []
            for p in pts:
                v = vert(p)
                if v not in vs:
                    vs.append(v)
            if len(vs) < 3:
                continue
            n = Vector((0.0, 0.0, 0.0))
            for i in range(len(vs)):
                p0, p1 = vs[i].co, vs[(i + 1) % len(vs)].co
                n += Vector(((p0.y - p1.y) * (p0.z + p1.z), (p0.z - p1.z) * (p0.x + p1.x), (p0.x - p1.x) * (p0.y + p1.y)))
            if n.length < 1e-10:
                continue
            if n.dot(Vector(out)) < 0:
                vs.reverse()
            try:
                bm.faces.new(vs)
            except ValueError:
                pass
        bm.normal_update()
        return jk.Piece(bm)


def _lerp(a, b, t):
    return a + (b - a) * t


def _interp(table, y):
    """Piecewise-linear lookup in a list of (y, value...) rows sorted by y."""
    if y <= table[0][0]:
        return table[0][1:]
    for r0, r1 in zip(table, table[1:]):
        if y <= r1[0]:
            t = (y - r0[0]) / ((r1[0] - r0[0]) or 1.0)
            return tuple(_lerp(p, q, t) for p, q in zip(r0[1:], r1[1:]))
    return table[-1][1:]


def _refine(rows, cuts):
    """Insert `cuts` points in every changing gap of a station table, on a monotone cubic through
    the rows, so plan and sheer lines curve instead of kinking at each authored station."""
    if cuts <= 0:
        return [tuple(r) for r in rows]
    width = max(len(r) for r in rows)
    rows = [tuple(r) + (0.0,) * (width - len(r)) for r in rows]
    ys = [r[0] for r in rows]
    n = len(rows)

    def tangents(vals):
        d = [(vals[i + 1] - vals[i]) / (ys[i + 1] - ys[i]) for i in range(n - 1)]
        m = [d[0]] + [0.0] * (n - 2) + [d[-1]]
        for i in range(1, n - 1):
            if d[i - 1] * d[i] > 0:
                m[i] = 2 * d[i - 1] * d[i] / (d[i - 1] + d[i])
        return m

    cols = [[r[c] for r in rows] for c in range(1, width)]
    slopes = [tangents(v) for v in cols]
    out = []
    for i in range(n - 1):
        out.append(rows[i])
        if all(abs(v[i + 1] - v[i]) < 1e-6 for v in cols):
            continue
        span = ys[i + 1] - ys[i]
        for c in range(1, cuts + 1):
            t = c / (cuts + 1)
            h00, h10 = 2 * t**3 - 3 * t**2 + 1, t**3 - 2 * t**2 + t
            h01, h11 = -2 * t**3 + 3 * t**2, t**3 - t**2
            out.append(
                (ys[i] + span * t,)
                + tuple(h00 * v[i] + h10 * span * m[i] + h01 * v[i + 1] + h11 * span * m[i + 1] for v, m in zip(cols, slopes))
            )
    out.append(rows[-1])
    return out


def _hull(a, stations, boot=0.1, rail=0.07, thick=0.05, flare=0.6, stripe=0.0, floor=None, inner_steps=1, refine=0):
    """A waterline hull with a bulwark and a deck, bow first.

    `stations` run bow to stern: (y, half_beam, sheer[, waterline_ratio[, rake]]). The topsides
    flare from the waterline beam out to the gunwale, `rake` leans the section along y with height
    (negative throws a stem forward). The first and last stations are closed across, so a narrow
    one makes a stem and a wide one a transom. Returns the pieces by band (boot, sides, stripe,
    trim, deck, bottom) plus `deck_z(y)`, `beam(y)` and `gunwale(y, side)` lookups.
    """
    rings = []
    table = []
    stations = [tuple(st) + (0.85, 0.0)[len(st) - 3 :] for st in stations]
    for st in _refine(stations, refine):
        y, b, sheer, wl, rake = st[:5]
        deck = (sheer - rail) if floor is None else floor
        tb = boot / sheer
        ts = [0.0, tb, tb + (1 - tb) * 0.5] if boot else [0.0, 0.5]
        if stripe:
            ts.append(1 - stripe / sheer)
        ts.append(1.0)

        def width(t, b=b, wl=wl):
            return b * (wl + (1 - wl) * t**flare)

        outer = [(width(t), y + rake * t, sheer * t) for t in ts]
        t_deck = deck / sheer
        tin = [1 - (1 - t_deck) * k / inner_steps for k in range(inner_steps + 1)]
        inner = [(max(width(t) - thick, width(t) * 0.3), y + rake * t, sheer * t) for t in tin]
        rings.append((outer, inner))
        table.append((y, deck, inner[-1][0], max(b - thick / 2, b * 0.5), sheer, rake))
    n_outer = len(rings[0][0])
    names = (["boot"] if boot else ["sides"]) + ["sides"] * (n_outer - 2)
    if stripe:
        names[-1] = "stripe"
    builders = {k: _Builder() for k in ("boot", "sides", "stripe", "trim", "deck", "bottom")}

    def pt(p, s):
        return (p[0] * s, p[1], p[2])

    for (o0, i0), (o1, i1) in zip(rings, rings[1:]):
        for s in (1, -1):
            for k in range(n_outer - 1):
                builders[names[k]].face([pt(o0[k], s), pt(o1[k], s), pt(o1[k + 1], s), pt(o0[k + 1], s)], (s, 0, 0))
            builders["trim"].face([pt(o0[-1], s), pt(o1[-1], s), pt(i1[0], s), pt(i0[0], s)], (0, 0, 1))
            for k in range(len(i0) - 1):
                builders["trim"].face([pt(i0[k], s), pt(i1[k], s), pt(i1[k + 1], s), pt(i0[k + 1], s)], (-s, 0, 0))
        builders["deck"].face([pt(i0[-1], -1), pt(i0[-1], 1), pt(i1[-1], 1), pt(i1[-1], -1)], (0, 0, 1))
        builders["bottom"].face([pt(o0[0], -1), pt(o0[0], 1), pt(o1[0], 1), pt(o1[0], -1)], (0, 0, -1))
    for (o, i), d in ((rings[0], -1), (rings[-1], 1)):
        for k in range(n_outer - 1):
            builders[names[k]].face([pt(o[k], 1), pt(o[k + 1], 1), pt(o[k + 1], -1), pt(o[k], -1)], (0, d, 0))
        builders["trim"].face([pt(o[-1], 1), pt(i[0], 1), pt(i[0], -1), pt(o[-1], -1)], (0, 0, 1))
        for k in range(len(i) - 1):
            builders["trim"].face([pt(i[k], 1), pt(i[k + 1], 1), pt(i[k + 1], -1), pt(i[k], -1)], (0, -d, 0))
    out = {}
    for name, b in builders.items():
        if b.faces:
            out[name] = a.add(b.piece())
    out["bottom"].color(P.INK).no_ao()
    out["deck_z"] = lambda y: _interp(table, y)[0]
    out["beam"] = lambda y: _interp(table, y)[1]

    def gunwale(y, side=1):
        _, _, x, sheer, rake = _interp(table, y)
        return (side * x, y + rake, sheer)

    out["gunwale"] = gunwale
    return out


def _panes(a, n, w, h, pitch, part="glass", color=P.GLASS_DARK):
    """A row of n flat panes facing -y on the plane y = 0, centred in x, bottom edge on z = 0."""
    b = _Builder()
    x0 = -(n - 1) * pitch / 2
    for i in range(n):
        x = x0 + i * pitch
        b.face([(x - w / 2, 0, 0), (x + w / 2, 0, 0), (x + w / 2, 0, h), (x - w / 2, 0, h)], (0, -1, 0))
    return a.add(b.piece()).part(part).color(color).no_ao()


def _cargo_box(a, w, d, h, chamfer=0.02, top=True):
    """A lean stacking box: chamfered top edges, no bottom, optional top (hidden when stacked)."""
    b = _Builder()
    x, y, c = w / 2, d / 2, chamfer
    low = [(-x, -y, 0), (x, -y, 0), (x, y, 0), (-x, y, 0)]
    mid = [(px, py, h - c) for px, py, _ in low]
    cap = [(px - math.copysign(c, px), py - math.copysign(c, py), h) for px, py, _ in low]
    hints = [(0, -1, 0), (1, 0, 0), (0, 1, 0), (-1, 0, 0)]
    for i in range(4):
        j = (i + 1) % 4
        b.face([low[i], low[j], mid[j], mid[i]], hints[i])
        b.face([mid[i], mid[j], cap[j], cap[i]], (hints[i][0], hints[i][1], 1))
    if top:
        b.face(cap, (0, 0, 1))
    return a.add(b.piece())


def _railing(a, pts, h=0.12, r=0.011, color=P.OFF_WHITE, posts=True):
    """A hand rail through `pts` (deck-level points), with a stanchion under each point."""
    a.tube([(x, y, z + h) for x, y, z in pts], r, 4).color(color)
    if posts:
        for x, y, z in pts:
            a.tube([(x, y, z), (x, y, z + h)], r, 4, caps="none").color(color)


def _bow_rail(a, hull, ys, stem, height=0.13, r=0.011, color=P.OFF_WHITE):
    """A rail on the gunwale from the aftmost of `ys` on one side, round the stem, to the other."""
    port = [hull["gunwale"](y, 1) for y in ys]
    nose = hull["gunwale"](stem, 1)
    pts = port + [(0.0, nose[1], nose[2])] + [(-x, y, z) for x, y, z in reversed(port)]
    _railing(a, pts, height, r, color)


# --------------------------------------------------------------------------------------------
# Ships
# --------------------------------------------------------------------------------------------
def _lamp(a, x, y, z, color, size=0.05):
    return a.box(size, size, size, bevel=0).move(x, y, z - size / 2).part("glow").color(color)


def _funnel(a, x, y, z, r, h, rake=0.0, band=None, color=None, sides=10):
    """An oval funnel standing on z: a painted casing (tint unless `color`), a band and a dark cap."""

    def lean(co):
        return (co.x, co.y + rake * co.z, co.z)

    body = a.cyl(r, h, sides, r2=r * 0.9, bevel=0.012, grounded=True).scale(0.8, 1.25, 1).warp(lean).move(x, y, z)
    if color is None:
        body.part("tint").color(P.SHADE_1, P.WHITE)
    else:
        body.color(jk.shade(color, -0.12), color)
    a.cyl(r * 0.94, h * 0.16, sides, bevel=0.01, grounded=True).scale(0.8, 1.25, 1).move(x, y + rake * h, z + h * 0.9).color(P.CHARCOAL)
    if band is not None:
        a.cyl(r * 0.965, h * 0.15, sides, bevel=0, grounded=True).scale(0.8, 1.25, 1).move(x, y + rake * h * 0.62, z + h * 0.55).color(band)


def _mast(a, x, y, z, h, spread=0.17, radar=True, light=P.GLOW_WHITE):
    """A tripod signal mast with a masthead light, and a radar scanner on its own pedestal ahead."""
    a.tube([(x, y, z), (x, y, z + h)], [0.035, 0.02], 6).color(P.OFF_WHITE)
    for side in (-1, 1):
        a.tube([(x + side * spread, y + spread * 0.9, z), (x, y, z + h * 0.74)], 0.013, 4, caps="none").color(P.OFF_WHITE)
    if radar:
        a.cyl(0.03, 0.13, 6, bevel=0, grounded=True).move(x, y - 0.2, z).color(P.STEEL_DARK)
        a.box(0.32, 0.055, 0.045, bevel=0).rot(z=28).move(x, y - 0.2, z + 0.13).color(P.CHARCOAL)
    _lamp(a, x, y, z + h + 0.05, light)


def _lifeboat(a, x, y, z, length=0.34, r=0.065):
    a.loft([(-length / 2, 0, 0), (-length * 0.32, r, r * 0.9), (length * 0.32, r, r * 0.9), (length / 2, 0, 0)], 6, 2.6).move(
        x, y, z
    ).color(jk.shade(P.ORANGE, -0.1), P.ORANGE)


def _bridge(a, y, z, w, d, h, beam, mast=0.8, rows=3):
    """A stern accommodation block with a glazed wheelhouse, bridge wings, running lights and a mast."""
    white = P.OFF_WHITE
    a.box(w, d, h, bevel=0.03).move(0, y, z).color(jk.shade(white, -0.13), white)
    top = z + h
    pitch = (h - 0.3) / max(1, rows)
    for side in (-1, 1):
        for row in range(rows):
            _panes(a, 2, 0.14, 0.1, 0.24).rot(z=90 * side).move(side * (w / 2 + 0.008), y, z + 0.2 + row * pitch)
    _panes(a, 5, 0.12, 0.1, w / 5.4).move(0, y - d / 2 - 0.008, top - 0.2)
    _panes(a, 4, 0.12, 0.1, w / 4.6).rot(z=180).move(0, y + d / 2 + 0.008, top - 0.2)
    a.box(beam, d * 0.56, 0.05, bevel=0.015).move(0, y - d * 0.1, top).color(white)
    a.box(w * 0.74, d * 0.78, 0.3, bevel=0.03).move(0, y - d * 0.07, top + 0.04).color(jk.shade(white, -0.06), white)
    a.box(w * 0.74 + 0.014, d * 0.78 + 0.014, 0.12, bevel=0).move(0, y - d * 0.07, top + 0.15).part("glass").color(
        P.GLASS_DARK, P.GLASS_TINTED
    )
    a.box(w * 0.83, d * 0.96, 0.05, bevel=0.015).move(0, y - d * 0.1, top + 0.34).color(P.STEEL)
    for side in (-1, 1):
        a.box(0.1, d * 0.34, 0.13, bevel=0.02).move(side * (beam / 2 - 0.06), y - d * 0.13, top + 0.05).color(white)
        _lamp(a, side * (beam / 2 - 0.02), y - d * 0.13, top + 0.25, P.GLOW_RED if side > 0 else P.GLOW_GREEN)
    _mast(a, 0, y + d * 0.08, top + 0.39, mast)
    return top + 0.39


@asset("ship", tint="#c4452f", budget=1800)
def ship(a):
    h = _hull(
        a,
        [
            (-3.3, 0.035, 1.22, 1.0, -0.2),
            (-3.02, 0.3, 1.17, 0.42, -0.12),
            (-2.55, 0.58, 1.08, 0.68, -0.05),
            (-1.95, 0.77, 0.98, 0.9),
            (-1.0, 0.8, 0.95, 0.96),
            (2.0, 0.8, 0.95, 0.96),
            (2.9, 0.78, 0.98, 0.88, 0.02),
            (3.42, 0.66, 1.02, 0.72, 0.08),
        ],
        boot=0.15,
        rail=0.07,
        thick=0.05,
        refine=1,
    )
    h["boot"].color(P.INK, P.CHARCOAL)
    h["sides"].part("tint").color(P.SHADE_1, P.WHITE)
    h["trim"].part("tint").color(P.SHADE_2)
    h["deck"].color(P.STEEL_DARK)
    deck = h["deck_z"]
    # Container stacks: three bays, three across, stepped down toward the bow for the sightline.
    tones = [P.BLUE, P.AMBER, P.TEAL, P.STEEL, P.RUST, P.OFF_WHITE, P.NAVY]
    cw, cl, ch = 0.45, 1.26, 0.36
    stacks = {-1.3: (1, 2, 2), 0.1: (3, 2, 3), 1.5: (3, 3, 2)}
    k = 0
    for y, heights in stacks.items():
        for col, tiers in enumerate(heights):
            for tier in range(tiers):
                tone = tones[(k * 3 + tier * 2 + col) % len(tones)]
                _cargo_box(a, cw, cl, ch, 0.022, top=tier == tiers - 1).move(
                    (col - 1) * (cw + 0.02), y, 0.88 + tier * (ch + 0.008)
                ).color(jk.shade(tone, -0.16), jk.shade(tone, 0.04))
                k += 1
        # A lashing bridge between bays: the dark frame the stacks are braced against.
        a.box(1.44, 0.05, 0.5, bevel=0).move(0, y + cl / 2 + 0.07, 0.88).color(P.CHARCOAL)
    # Accommodation block and navigating bridge at the stern, lifeboats on the boat deck.
    block_y = 2.66
    _bridge(a, block_y, 0.88, 1.3, 0.6, 1.22, 1.62, mast=0.8)
    for side in (-1, 1):
        _lifeboat(a, side * 0.715, block_y + 0.02, 1.5)
        a.box(0.1, 0.05, 0.05, bevel=0).move(side * 0.68, block_y + 0.02, 1.6).color(P.STEEL_DARK)
    # Engine casing and funnel.
    a.box(0.86, 0.44, 0.62, bevel=0.03).move(0, 3.16, deck(3.16)).color(jk.shade(P.OFF_WHITE, -0.14), jk.shade(P.OFF_WHITE, -0.02))
    _funnel(a, 0, 3.12, deck(3.16) + 0.6, 0.2, 0.86, rake=0.08, band=P.OFF_WHITE)
    # Forecastle: breakwater, windlasses and a foremast with its light.
    for side in (-1, 1):
        a.box(0.62, 0.045, 0.2, bevel=0.012).rot(z=-24 * side).move(side * 0.3, -2.12, deck(-2.12) - 0.01).color(P.STEEL)
        a.cyl(0.07, 0.16, 6, bevel=0).rot(y=90).move(side * 0.2 - 0.08, -2.72, deck(-2.72) + 0.09).color(P.CHARCOAL)
    a.tube([(0, -2.95, deck(-2.95)), (0, -2.95, deck(-2.95) + 0.62)], [0.03, 0.018], 6).color(P.OFF_WHITE)
    _lamp(a, 0, -2.95, deck(-2.95) + 0.67, P.GLOW_WHITE)
    _bow_rail(a, h, [-2.3, -2.8, -3.15], -3.3)


@asset("tanker", tint="#2a2d33", budget=1800)
def tanker(a):
    h = _hull(
        a,
        [
            (-3.84, 0.04, 1.04, 1.0, -0.16),
            (-3.56, 0.42, 1.0, 0.5, -0.1),
            (-3.0, 0.76, 0.92, 0.78, -0.04),
            (-2.2, 0.9, 0.85, 0.94),
            (2.3, 0.9, 0.85, 0.94),
            (3.2, 0.87, 0.9, 0.86, 0.02),
            (3.9, 0.7, 0.97, 0.7, 0.1),
        ],
        boot=0.17,
        rail=0.06,
        thick=0.05,
        refine=1,
    )
    oxide = jk.mix(P.BRICK, P.TERRACOTTA, 0.35)
    h["boot"].color(jk.shade(P.RED, -0.25), P.RED)
    h["sides"].part("tint").color(P.SHADE_1, P.WHITE)
    h["trim"].part("tint").color(P.SHADE_2)
    h["deck"].color(jk.shade(oxide, -0.25))
    deck = h["deck_z"]
    z = 0.79
    # Trunk deck over the tanks, with paired tank hatches.
    a.box(1.42, 4.9, 0.09, bevel=0.025).move(0, -0.3, z).color(jk.shade(oxide, -0.1), oxide)
    top = z + 0.09
    for y in (-2.3, -1.3, 0.7, 1.7):
        for side in (-1, 1):
            a.cyl(0.1, 0.06, 8, bevel=0, grounded=True).move(side * 0.5, y, top).color(P.STEEL)
    # Pipe rack down the centreline on saddles, crossing to a manifold amidships.
    for x in (-0.14, 0.0, 0.14):
        a.tube([(x, -2.62, top + 0.15), (x, 1.95, top + 0.15)], 0.042, 6).color(P.STEEL_DARK, P.STEEL, "y")
    for y in (-2.5, -1.6, 0.6, 1.8):
        a.box(0.44, 0.07, 0.11, bevel=0).move(0, y, top).color(P.CHARCOAL)
    for y in (-0.52, -0.3, -0.08):
        a.tube([(-0.8, y, top + 0.22), (0.8, y, top + 0.22)], 0.04, 6).color(P.STEEL)
        for side in (-1, 1):
            a.cyl(0.06, 0.03, 6, bevel=0).rot(y=90).move(side * 0.82 - 0.015, y, top + 0.22).color(P.RED)
    for side in (-1, 1):
        a.box(0.1, 0.62, 0.2, bevel=0).move(side * 0.62, -0.3, top).color(P.CHARCOAL)
    # A walkway beside the pipes, from the bridge to the forecastle.
    a.box(0.16, 4.5, 0.03, bevel=0).move(0.36, -0.3, top + 0.2).color(P.CONCRETE)
    for y in (-2.4, -1.35, 0.75, 1.8):
        a.box(0.04, 0.04, 0.2, bevel=0).move(0.36, y, top).color(P.CHARCOAL)
    # Hose crane at the manifold.
    a.cyl(0.055, 0.56, 6, bevel=0, grounded=True).move(-0.4, 0.28, top).color(P.AMBER)
    a.tube([(-0.4, 0.28, top + 0.52), (-0.72, -0.5, top + 0.86)], [0.04, 0.025], 5).color(P.AMBER)
    a.box(0.13, 0.13, 0.1, bevel=0.02).move(-0.4, 0.28, top + 0.5).color(P.CHARCOAL)
    # Accommodation, bridge and funnel aft.
    block_y = 2.92
    _bridge(a, block_y, deck(block_y), 1.44, 0.74, 0.98, 1.82, mast=0.42, rows=2)
    for side in (-1, 1):
        _lifeboat(a, side * 0.8, block_y + 0.05, 1.42)
        a.box(0.1, 0.05, 0.05, bevel=0).move(side * 0.76, block_y + 0.05, 1.52).color(P.STEEL_DARK)
    a.box(0.9, 0.44, 0.5, bevel=0.03).move(0, 3.55, deck(3.55)).color(jk.shade(P.OFF_WHITE, -0.14), jk.shade(P.OFF_WHITE, -0.02))
    _funnel(a, 0, 3.5, deck(3.55) + 0.48, 0.21, 0.8, rake=0.08, band=P.RED)
    # Forecastle: windlasses and a foremast with its light.
    for side in (-1, 1):
        a.cyl(0.07, 0.16, 6, bevel=0).rot(y=90).move(side * 0.22 - 0.08, -3.2, deck(-3.2) + 0.09).color(P.CHARCOAL)
    a.tube([(0, -3.45, deck(-3.45)), (0, -3.45, deck(-3.45) + 0.6)], [0.03, 0.018], 6).color(P.OFF_WHITE)
    _lamp(a, 0, -3.45, deck(-3.45) + 0.65, P.GLOW_WHITE)
    _bow_rail(a, h, [-3.0, -3.5], -3.84)


def _mini_car(a, x, y, z, tone, turn=0.0):
    with a.group() as g:
        a.loft([(-0.24, 0.1, 0.035, 0.09), (-0.2, 0.125, 0.06, 0.1), (0.2, 0.125, 0.06, 0.1), (0.24, 0.1, 0.04, 0.1)], 6, 4).color(
            jk.shade(tone, -0.15), tone
        )
        a.loft([(-0.09, 0.1, 0.01, 0.16), (-0.03, 0.105, 0.05, 0.2), (0.11, 0.105, 0.05, 0.2), (0.16, 0.1, 0.01, 0.16)], 6, 4).part(
            "glass"
        ).color(P.GLASS_DARK)
        a.box(0.27, 0.34, 0.05, bevel=0).move(0, 0, 0.02).color(P.INK)
    g.rot(z=turn).move(x, y, z)


@asset("ferry", tint="#f2efe6", budget=1400)
def ferry(a):
    h = _hull(
        a,
        [
            (-2.36, 0.04, 0.86, 1.0, -0.14),
            (-2.1, 0.36, 0.82, 0.5, -0.08),
            (-1.6, 0.66, 0.75, 0.76, -0.02),
            (-0.8, 0.8, 0.7, 0.92),
            (1.7, 0.8, 0.7, 0.92),
            (2.25, 0.77, 0.7, 0.86, 0.03),
            (2.44, 0.72, 0.7, 0.8, 0.06),
        ],
        boot=0.12,
        rail=0.08,
        thick=0.05,
        stripe=0.11,
        refine=1,
    )
    white = P.OFF_WHITE
    h["boot"].color(P.NAVY)
    h["sides"].part("tint").color(P.SHADE_1, P.WHITE)
    h["stripe"].color(P.BLUE)
    h["trim"].part("tint").color(P.WHITE)
    h["deck"].color(P.STEEL_DARK, P.STEEL, "y")
    z = 0.62
    # Passenger lounge with a raked front and a lit window band.
    a.profile_x([(-1.56, z), (0.95, z), (0.95, 1.26), (-1.3, 1.26)], 1.34, bevel=0.03).color(jk.shade(white, -0.12), white)
    for side in (-1, 1):
        _panes(a, 7, 0.21, 0.18, 0.31, "glow", P.WINDOW).rot(z=90 * side).move(side * 0.678, -0.22, 0.88)
    _panes(a, 4, 0.22, 0.2, 0.29).rot(x=-21.3).move(0, -1.475, 0.86)
    _panes(a, 1, 0.84, 0.44, 1.0, "glass", P.INK).rot(z=180).move(0, 0.958, z + 0.01)
    # Sun deck, wheelhouse and twin funnels.
    a.box(1.5, 2.72, 0.06, bevel=0.02).move(0, -0.25, 1.26).color(P.STEEL, P.CONCRETE)
    top = 1.32
    a.profile_x([(-1.22, top), (-0.05, top), (-0.05, 1.8), (-1.02, 1.8)], 0.98, bevel=0.03).color(jk.shade(white, -0.08), white)
    _panes(a, 3, 0.24, 0.17, 0.3).rot(x=-22.6).move(0, -1.168, 1.5)
    for side in (-1, 1):
        _panes(a, 3, 0.22, 0.17, 0.3).rot(z=90 * side).move(side * 0.498, -0.56, 1.5)
        a.torus(0.055, 0.02, 6, 3).rot(y=90).move(side * 0.51, -0.16, 1.56).color(P.ORANGE)
        _funnel(a, side * 0.36, 0.34, top, 0.15, 0.78, rake=0.14, band=white, color=P.BLUE, sides=8)
        _lamp(a, side * 0.6, -1.2, top + 0.06, P.GLOW_RED if side > 0 else P.GLOW_GREEN, 0.05)
    a.box(1.1, 1.36, 0.05, bevel=0.015).move(0, -0.62, 1.8).color(P.STEEL)
    _mast(a, 0, -0.42, 1.85, 0.7, spread=0.14)
    _railing(a, [(-0.7, 0.0, top), (-0.7, 1.05, top), (0.7, 1.05, top), (0.7, 0.0, top)], 0.15)
    a.box(1.3, 1.02, 0.014, bevel=0).move(0, 0.52, top).color(P.OAK_WOOD, P.PINE_WOOD, "y")
    for y in (0.72, 0.92):
        a.box(0.8, 0.07, 0.07, bevel=0).move(0, y, top + 0.014).color(P.OFF_WHITE)
    for side in (-1, 1):
        _lifeboat(a, side * 0.34, -0.82, 1.9, 0.3, 0.06)
    # Open car deck aft with a raised stern ramp.
    _mini_car(a, -0.3, 1.5, z, P.RED)
    _mini_car(a, 0.3, 1.72, z, P.AMBER)
    a.box(0.96, 0.05, 0.36, bevel=0.015).rot(x=-52).move(0, 2.3, z + 0.03).color(P.STEEL_DARK, P.STEEL)
    for side in (-1, 1):
        a.box(0.07, 0.07, 0.3, bevel=0).move(side * 0.56, 2.3, z).color(P.AMBER)


# --------------------------------------------------------------------------------------------
# Small boats
# --------------------------------------------------------------------------------------------
def _sail(a, tack, head, clew, belly=0.12, roach=0.06, thick=0.022, nu=4, nv=5):
    """A triangular sail with thickness and a wind-filled belly, between three corners."""
    tack, head, clew = Vector(tack), Vector(head), Vector(clew)
    foot, luff = clew - tack, head - tack
    out = foot.cross(luff).normalized()
    aft = foot.normalized()

    def surface(u, v):
        fill = (1 - v) ** 0.6 * (0.45 + 0.55 * min(1.0, v / 0.22))
        return (
            tack
            + luff * v
            + foot * (u * (1 - v))
            + aft * (roach * u * math.sin(math.pi * v))
            + out * (belly * math.sin(math.pi * u) ** 0.9 * fill)
        )

    grid = [[surface(i / nu, j / nv) for i in range(nu + 1)] for j in range(nv + 1)]
    half = out * (thick / 2)
    b = _Builder()
    for j in range(nv):
        for i in range(nu):
            quad = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]]
            b.face([p + half for p in quad], out)
            b.face([p - half for p in quad], -out)
        for i, hint in ((0, -aft), (nu, aft)):
            b.face([grid[j][i] + half, grid[j + 1][i] + half, grid[j + 1][i] - half, grid[j][i] - half], hint)
    for i in range(nu):
        b.face([grid[0][i] + half, grid[0][i + 1] + half, grid[0][i + 1] - half, grid[0][i] - half], -luff)
    return a.add(b.piece())


@asset("sailboat", tint="#f2efe6", budget=1400)
def sailboat(a):
    h = _hull(
        a,
        [
            (-1.24, 0.02, 0.56, 1.0, -0.06),
            (-0.9, 0.2, 0.49, 0.5, -0.03),
            (-0.4, 0.38, 0.43, 0.7),
            (0.2, 0.45, 0.4, 0.8),
            (0.8, 0.4, 0.42, 0.78),
            (1.22, 0.29, 0.46, 0.68, 0.08),
        ],
        boot=0.08,
        rail=0.035,
        thick=0.035,
        stripe=0.05,
        refine=2,
    )
    h["boot"].color(P.NAVY)
    h["sides"].part("tint").color(P.SHADE_1, P.WHITE)
    h["stripe"].color(P.RED)
    h["trim"].color(P.OAK_WOOD)
    h["deck"].color(P.PINE_WOOD, jk.shade(P.PINE_WOOD, 0.12), "y")
    deck = h["deck_z"]
    # Cabin trunk with portholes, a sliding hatch, and a cockpit with a tiller aft.
    a.box(0.5, 0.86, 0.17, bevel=0.04, taper=(0.86, 0.92), grounded=True).move(0, -0.2, deck(-0.2)).part("tint").color(P.SHADE_1, P.WHITE)
    for side in (-1, 1):
        _panes(a, 3, 0.12, 0.055, 0.2).rot(z=90 * side).move(side * 0.242, -0.22, deck(-0.2) + 0.065)
    a.box(0.24, 0.26, 0.03, bevel=0.01).move(0, 0.08, deck(0) + 0.17).color(P.OAK_WOOD)
    for side in (-1, 1):
        a.box(0.04, 0.6, 0.07, bevel=0.012).move(side * 0.24, 0.62, deck(0.6)).color(P.OAK_WOOD)
    a.box(0.5, 0.04, 0.07, bevel=0.012).move(0, 0.92, deck(0.9)).color(P.OAK_WOOD)
    a.tube([(0, 1.24, 0.5), (0, 0.72, 0.62)], 0.016, 5).color(P.WALNUT)
    a.box(0.035, 0.1, 0.34, bevel=0).move(0, 1.31, 0.14).color(P.NAVY)
    # Rig: mast, boom swung a little to port, mainsail and jib drawing on the same tack.
    mast_y, top = -0.32, 3.03
    a.tube([(0, mast_y, deck(mast_y)), (0, mast_y, top)], [0.032, 0.03, 0.018][::2], 6).color(P.OAK_WOOD, P.PINE_WOOD)
    swing = math.radians(8)
    boom_z, boom_len = 0.86, 1.3
    end = (math.sin(swing) * boom_len, mast_y + math.cos(swing) * boom_len, boom_z)
    a.tube([(0, mast_y, boom_z), end], 0.024, 6).color(P.OAK_WOOD)
    _sail(a, (0.0, mast_y + 0.03, boom_z + 0.05), (0.0, mast_y + 0.02, top - 0.08), (end[0], end[1] - 0.04, end[2] + 0.05), belly=0.15, roach=0.1).color(
        jk.shade(P.CREAM, -0.05), P.OFF_WHITE
    )
    _sail(a, (0.0, -1.2, 0.6), (0.0, mast_y - 0.03, 2.55), (0.2, 0.02, 0.66), belly=0.15, roach=0.03, nu=3).color(
        jk.mix(P.SAND, P.CREAM, 0.45), P.CREAM
    )
    a.tube([(0, 1.26, 0.48), (0, mast_y + 0.01, top - 0.03)], 0.007, 3, caps="none").color(P.CHARCOAL)
    for side in (-1, 1):
        a.tube([(side * 0.4, mast_y + 0.06, deck(mast_y) + 0.03), (0, mast_y, 2.3)], 0.007, 3, caps="none").color(P.CHARCOAL)
    a.raw([(0, mast_y, top + 0.1), (0, mast_y, top - 0.0), (0, mast_y + 0.2, top + 0.05), (0.012, mast_y, top + 0.05)], [(0, 2, 1), (0, 1, 3), (1, 2, 3), (0, 3, 2)]).color(P.RED)
    _bow_rail(a, h, [-0.7, -1.02], -1.24, 0.13, 0.008, P.STEEL)
    aft = [h["gunwale"](0.78, 1), h["gunwale"](1.2, 1)]
    _railing(a, aft + [(-x, y, z) for x, y, z in reversed(aft)], 0.13, 0.008, P.STEEL)


@asset("fishing", tint="#3d6fb5", budget=1400)
def fishing(a):
    h = _hull(
        a,
        [
            (-1.33, 0.025, 0.8, 1.0, -0.1),
            (-1.05, 0.25, 0.69, 0.48, -0.05),
            (-0.55, 0.43, 0.57, 0.72),
            (0.1, 0.5, 0.5, 0.86),
            (0.8, 0.47, 0.5, 0.84),
            (1.3, 0.38, 0.55, 0.72, 0.08),
        ],
        boot=0.09,
        rail=0.1,
        thick=0.04,
        stripe=0.06,
        refine=2,
    )
    white = P.OFF_WHITE
    h["boot"].color(P.BRICK)
    h["sides"].part("tint").color(P.SHADE_1, P.WHITE)
    h["stripe"].color(white)
    h["trim"].color(white)
    h["deck"].color(P.OAK_WOOD, P.PINE_WOOD, "y")
    deck = h["deck_z"]
    # Wheelhouse forward: white sides, wrap-around glazing, a roof in the hull colour.
    wy, wz = -0.42, deck(-0.42)
    a.box(0.56, 0.56, 0.5, bevel=0.03, taper=(0.94, 0.9), grounded=True).move(0, wy, wz).color(jk.shade(white, -0.12), white)
    _panes(a, 3, 0.13, 0.15, 0.165).rot(x=-3.2).move(0, wy - 0.276, wz + 0.27)
    for side in (-1, 1):
        _panes(a, 2, 0.16, 0.15, 0.22).rot(z=90 * side).move(side * 0.272, wy, wz + 0.27)
    _panes(a, 1, 0.2, 0.36, 1.0, "glass", P.WALNUT).rot(z=180).move(0.08, wy + 0.268, wz + 0.02)
    a.box(0.66, 0.68, 0.06, bevel=0.02).move(0, wy - 0.02, wz + 0.5).part("tint").color(P.SHADE_1, P.WHITE)
    a.box(0.26, 0.05, 0.04, bevel=0).rot(z=18).move(-0.05, wy - 0.08, wz + 0.6).color(P.STEEL_DARK)
    a.cyl(0.02, 0.05, 5, bevel=0, grounded=True).move(-0.05, wy - 0.08, wz + 0.56).color(P.STEEL_DARK)
    a.tube([(0.2, wy + 0.2, wz + 0.5), (0.2, wy + 0.2, wz + 0.86)], 0.035, 6).color(P.CHARCOAL)
    _lamp(a, -0.2, wy - 0.24, wz + 0.61, P.GLOW_WHITE, 0.05)
    # Mast and derrick: the boom swings the cod end of the net over the port side.
    my = 0.04
    mz = deck(my)
    top = 1.78
    a.tube([(0, my, mz), (0, my, top)], [0.04, 0.024], 6).color(P.OAK_WOOD, P.PINE_WOOD)
    for side in (-1, 1):
        a.tube([(side * 0.44, my + 0.12, 0.52), (0, my, top - 0.2)], 0.007, 3, caps="none").color(P.CHARCOAL)
    _lamp(a, 0, my, top + 0.04, P.GLOW_WHITE, 0.05)
    tip = (0.5, 0.82, 1.2)
    a.tube([(0, my + 0.03, mz + 0.42), tip], [0.032, 0.02], 6).color(P.OAK_WOOD)
    a.tube([(0, my, top - 0.12), tip], 0.007, 3, caps="none").color(P.CHARCOAL)
    a.tube([tip, (0.5, 0.82, 0.94)], 0.007, 3, caps="none").color(P.CHARCOAL)
    net = a.lathe([(0, 0), (0.1, 0.05), (0.15, 0.2), (0.11, 0.38), (0.035, 0.5)], 7)
    net.jitter(0.012, 3, 6).move(0.5, 0.82, 0.46).color(jk.shade(P.TEAL, -0.3), P.TEAL).flat()
    for k in range(5):
        ang = k / 5 * math.tau
        a.sphere(0.036, 5, 3).move(0.5 + math.cos(ang) * 0.115, 0.82 + math.sin(ang) * 0.115, 0.85).color(P.ORANGE)
    # Working deck: a net drum, stowed floats along the rail and fish boxes.
    a.cyl(0.11, 0.42, 8, bevel=0.02).rot(y=90).move(-0.21, 1.02, deck(1.0) + 0.13).color(jk.shade(P.TEAL, -0.2))
    for side in (-1, 1):
        a.box(0.04, 0.12, 0.28, bevel=0).move(side * 0.24, 1.02, deck(1.0)).color(P.STEEL_DARK)
    for k in range(5):
        a.sphere(0.04, 5, 3).move(-0.44 + 0.012 * k, 0.28 + k * 0.1, 0.52 + (0.012 if k % 2 else 0)).color(
            P.ORANGE if k % 2 == 0 else P.YELLOW
        )
    a.box(0.2, 0.26, 0.1, bevel=0.015).move(-0.2, 0.52, deck(0.5)).color(jk.shade(P.SKY, -0.15))
    a.box(0.2, 0.26, 0.1, bevel=0.015).rot(z=12).move(-0.16, 0.5, deck(0.5) + 0.1).color(P.OFF_WHITE)


def _paddler(a, y, seat, shirt=P.RED, skin=P.SKINS[1], hat=P.STRAW):
    """A seated citizen facing -y with both hands on a paddle dipped over the port side."""
    hip = seat
    shoulder = hip + 0.25
    head = shoulder + 0.18
    for side in (-1, 1):
        a.tube([(side * 0.07, y - 0.02, hip + 0.04), (side * 0.085, y - 0.22, hip + 0.06), (side * 0.085, y - 0.25, hip - 0.1)], [0.066, 0.058, 0.048], 6).color(
            P.CHARCOAL
        )
    a.loft([(0, 0.14, 0.088), (0.09, 0.145, 0.092), (0.22, 0.17, 0.097), (0.275, 0.12, 0.074), (0.292, 0, 0)], 10, 2.8).rot(x=90).rot(
        x=8, pivot=(0, 0, 0)
    ).move(0, y, hip - 0.01).color(jk.shade(shirt, -0.15), shirt)
    a.cyl(0.05, 0.06, 6, bevel=0).move(0, y - 0.035, shoulder + 0.02).color(jk.shade(skin, -0.12))
    a.sphere(0.142, 10, 6, (1.0, 0.96, 0.98)).move(0, y - 0.04, head).color(skin)
    for side in (-1, 1):
        a.sphere(0.019, 5, 3, (1, 0.45, 1.25)).move(side * 0.052, y - 0.04 - 0.132, head + 0.01).color(P.INK).no_ao()
    a.dome(0.15, 0.12, 10, 3, grounded=False).rot(x=-8).move(0, y - 0.036, head + 0.04).color(jk.shade(hat, -0.08), hat)
    a.cyl(0.215, 0.02, 10, bevel=0.006).rot(x=-8).move(0, y - 0.045, head + 0.05).color(jk.shade(hat, -0.14))
    # Paddle and arms.
    grip = Vector((0.1, y - 0.2, shoulder + 0.1))
    tip = Vector((0.4, y - 0.5, -0.1))
    low = grip.lerp(tip, 0.42)
    throat = grip.lerp(tip, 0.62)
    a.tube([grip, throat], 0.017, 5).color(P.PINE_WOOD)
    a.tube([throat, grip.lerp(tip, 0.74), grip.lerp(tip, 0.95), tip], [0.02, 0.062, 0.066, 0.03], 6, squash=0.22).color(P.OAK_WOOD, P.PINE_WOOD)
    a.sphere(0.03, 5, 3).move(*grip).color(P.PINE_WOOD)
    for side, hand in ((-1, grip + Vector((-0.02, 0.02, -0.02))), (1, low)):
        sx = side * 0.17
        elbow = Vector((sx + side * 0.05, y - 0.1, shoulder - 0.12)).lerp(hand, 0.35)
        a.tube([(sx, y - 0.02, shoulder - 0.01), elbow, hand], [0.052, 0.046, 0.042], 6, caps="round").color(jk.shade(shirt, -0.08))
        a.sphere(0.044, 6, 4).move(*hand).color(skin)


@asset("canoe", tint="#9a6a3a", budget=1400)
def canoe(a):
    h = _hull(
        a,
        [
            (-1.16, 0.012, 0.44, 1.0, -0.04),
            (-0.98, 0.09, 0.32, 0.55, -0.02),
            (-0.5, 0.22, 0.25, 0.72),
            (0.0, 0.275, 0.235, 0.78),
            (0.5, 0.22, 0.25, 0.72),
            (0.98, 0.09, 0.32, 0.55, 0.02),
            (1.16, 0.012, 0.44, 1.0, 0.04),
        ],
        boot=0,
        thick=0.028,
        floor=0.05,
        inner_steps=2,
        flare=0.55,
        stripe=0.04,
        refine=1,
    )
    h["sides"].part("tint").color(P.SHADE_1, P.WHITE)
    h["stripe"].color(P.WALNUT)
    h["trim"].part("tint").color(P.SHADE_3, P.SHADE_2)
    h["deck"].part("tint").color(P.SHADE_3)
    # Thwarts, a stern seat for the paddler, and the traveller's kit stowed forward.
    for y in (-0.52, 0.0):
        a.box(h["beam"](y) * 2 + 0.02, 0.055, 0.028, bevel=0.008).move(0, y, 0.2).color(P.PINE_WOOD)
    a.box(0.36, 0.2, 0.03, bevel=0.008).move(0, 0.48, 0.14).color(P.PINE_WOOD)
    a.capsule(0.07, 0.34, 7, 2).rot(y=90).move(-0.17, -0.28, 0.12).color(jk.shade(P.TEAL, -0.1), P.TEAL)
    a.cyl(0.085, 0.13, 8, r2=0.1, bevel=0.012, grounded=True).move(0.03, -0.74, 0.05).color(jk.shade(P.THATCH, -0.2), P.THATCH)
    _paddler(a, 0.46, 0.17)


def _row(sections, y):
    return _interp([(s[0], s[1], s[2], s[3] if len(s) > 3 else 0.0, s[4] if len(s) > 4 else 0.0) for s in sections], y)


def _skin(sections, sides, power, y, k, lift=0.0):
    """A point on a `loft` surface: station y, fractional ring index k (0 = +x, sides / 4 = top)."""
    rx, rz, cz, cx = _row(sections, y)
    ring = jk.superellipse(rx + lift, rz + lift, sides, power)
    i = math.floor(k)
    f = k - i
    x0, z0 = ring[i % sides]
    x1, z1 = ring[(i + 1) % sides]
    return (cx + _lerp(x0, x1, f), y, cz + _lerp(z0, z1, f))


def _skin_patch(a, sections, sides, power, ys, ks, lift=0.008):
    """A panel lying just proud of a `loft` surface, over stations ys and ring indices ks.

    The loft's own stations and ring vertices inside the panel are added, so it never cuts a
    chord under the surface it lies on."""
    ys = sorted(set(ys) | {sec[0] for sec in sections if min(ys) < sec[0] < max(ys)})
    ks = sorted(set(ks) | {float(i) for i in range(math.ceil(min(ks)), math.floor(max(ks)) + 1) if min(ks) < i < max(ks)})
    b = _Builder()
    for y0, y1 in zip(ys, ys[1:]):
        for k0, k1 in zip(ks, ks[1:]):
            quad = [_skin(sections, sides, power, y, k, lift) for y, k in ((y0, k0), (y0, k1), (y1, k1), (y1, k0))]
            _, _, cz, cx = _row(sections, (y0 + y1) / 2)
            mid = [sum(p[i] for p in quad) / 4 for i in range(3)]
            b.face(quad, (mid[0] - cx, 0, mid[2] - cz))
    return a.add(b.piece())


# S5's grown tissue and its light: the tones of the bio-pod and bio-tower.
_BONE = jk.mix(P.OFF_WHITE, P.VIOLET, 0.1)
_BONE_DEEP = jk.mix(P.STONE, P.VIOLET, 0.22)
_MINT = jk.mix(P.GLOW_GREEN, P.GLOW_CYAN, 0.45)
_MINT_HOT = jk.mix(_MINT, "#ffffff", 0.55)
_MINT_DEEP = jk.mix(_MINT, P.TEAL, 0.5)


class _Pod:
    """A seed pod as a boat hull, grown rather than built, split open along its seam.

    `stations` run bow to stern as (y, half_beam, keel_z, top_z, roll). Each section swells into
    a keel lobe, a side lobe and a rim lobe per side with creases between them. `roll` is how far
    (degrees) the rim curls past upright: about 25 leaves the pod wide open, 87 closes it to a
    slit along the crown. `bow` and `stern` are the (y, z) points it closes to. Surface points
    are addressed by `u`, 0 on the centre line and 1 at the lip.
    """

    CREASES = (0.22, 0.66)
    OUTER = (0.0, 0.11, 0.22, 0.367, 0.513, 0.66, 0.779, 0.898, 1.0)
    INNER = (1.0, 0.66, 0.33, 0.0)

    def __init__(self, stations, bow, stern, depth=0.18, wall=0.07):
        self.stations = stations
        self.bow, self.stern = bow, stern
        self.depth, self.wall = depth, wall

    def _point(self, station, side, u, k):
        y, beam, keel, top, roll = station
        h = (top - keel) / (1 + math.sin(math.radians(roll)))
        t = math.radians(-90 + u * (90 + roll))
        return (side * beam * math.cos(t) ** 0.8 * k, y, keel + h + h * math.sin(t) * k)

    def _sunk(self, u):
        """0 on the crown of a lobe, 1 in a crease."""
        c1, c2 = self.CREASES
        if u <= c1:
            t = 0.5 + 0.5 * u / c1
        elif u <= c2:
            t = (u - c1) / (c2 - c1)
        else:
            t = 0.85 * (u - c2) / (1 - c2)
        return 1 - max(0.0, math.sin(math.pi * t)) ** 0.6

    def _on(self, station, side, u, us, k):
        """A point on the faceted surface: straight between the section's own vertices."""
        us = sorted(us)
        for u0, u1 in zip(us, us[1:]):
            if u <= u1:
                f = (u - u0) / (u1 - u0)
                p, q = self._point(station, side, u0, k(u0)), self._point(station, side, u1, k(u1))
                return tuple(_lerp(a, b, f) for a, b in zip(p, q))
        return self._point(station, side, us[-1], k(us[-1]))

    def outer(self, i, side, u):
        return self._on(self.stations[i], side, u, self.OUTER, lambda v: 1 - self.depth * self._sunk(v))

    def inner(self, i, side, u):
        return self._on(self.stations[i], side, u, self.INNER, lambda _: 1 - self.depth - self.wall)

    def build(self, a, skin, hollow, lip, crease=0.3):
        """Add the pod as one closed shell. Each colour is a (low, high) pair blended by height;
        the creases of the skin are painted `crease` deeper."""
        section = [("skin", self._sunk(u)) for u in reversed(self.OUTER)] + [("skin", self._sunk(u)) for u in self.OUTER[1:]]
        section += [("hollow", 0.0)] * (2 * len(self.INNER) - 1)
        count = len(section)
        verts, index, sunk = [], [], []

        def tip(point, into):
            y, z = point
            verts.extend([(0.0, y, z), (0.0, y + into, z - 0.012)])
            sunk.extend([0.0, 0.0])
            return [len(verts) - (2 if section[j][0] == "skin" else 1) for j in range(count)]

        index.append(tip(self.bow, 0.035))
        for i in range(len(self.stations)):
            ring = [self.outer(i, -1, u) for u in reversed(self.OUTER)] + [self.outer(i, 1, u) for u in self.OUTER[1:]]
            ring += [self.inner(i, 1, u) for u in self.INNER] + [self.inner(i, -1, u) for u in reversed(self.INNER[:-1])]
            index.append(list(range(len(verts), len(verts) + count)))
            verts.extend(ring)
            sunk.extend(s for _, s in section)
        index.append(tip(self.stern, -0.035))
        faces, tags = [], []
        for lo, hi in zip(index, index[1:]):
            for j in range(count):
                k = (j + 1) % count
                quad = []
                for v in (lo[j], lo[k], hi[k], hi[j]):
                    if v not in quad:
                        quad.append(v)
                if len(quad) < 3:
                    continue
                faces.append(quad)
                tags.append(section[j][0] if section[j][0] == section[k][0] else "lip")
        piece = a.raw(verts, faces)
        zs = [v[2] for v in verts]
        z0, span = min(zs), (max(zs) - min(zs)) or 1.0
        tones = {"skin": skin, "hollow": hollow, "lip": lip}
        deep = {tuple(round(c, 5) for c in v): s for v, s in zip(verts, sunk)}
        for face, tag in zip(list(piece.bm.faces), tags):
            low, high = (jk.col(c) for c in tones[tag])
            for loop in face.loops:
                co = loop.vert.co
                c = jk.mix(low, high, (co.z - z0) / span)
                if tag == "skin":
                    c = jk.shade(c, -crease * deep.get((round(co.x, 5), round(co.y, 5), round(co.z, 5)), 0.0))
                loop[piece.layer] = (c[0], c[1], c[2], 1.0)
        return piece

    def suture(self, a, side, width=0.7, lift=0.006):
        """A luminous strip along the inner half of one lip: the seam the pod split along."""
        ends = [(0.0, self.bow[0], self.bow[1] + lift), (0.0, self.stern[0], self.stern[1] + lift)]
        rows = [(ends[0], ends[0])]
        for i in range(len(self.stations)):
            rim, edge = self.outer(i, side, 1.0), self.inner(i, side, 1.0)
            rows.append(
                (
                    tuple(_lerp(p, q, 1 - width) + (lift if k == 2 else 0.0) for k, (p, q) in enumerate(zip(rim, edge))),
                    (edge[0], edge[1], edge[2] + lift),
                )
            )
        rows.append((ends[1], ends[1]))
        b = _Builder()
        for (p0, q0), (p1, q1) in zip(rows, rows[1:]):
            b.face([p0, p1, q1, q0], (0, 0, 1))
        return a.add(b.piece()).part("glow").no_ao()


def _fan(a, root, rays, thick=0.022, scallop=0.87, billow=0.035, shape=None):
    """A membrane stretched over rays that fan out from `root` in the plane x = 0: (degrees up
    from astern, length) each. The free edge sags between the ray tips and the panels billow.
    `shape` warps every point (for a sail swung off the wind). Returns the piece and the tips."""
    shape = shape or (lambda p: p)
    steps = (0.36, 0.7, 1.0)

    def at(deg, length, k, puff):
        t = math.radians(deg)
        return Vector(shape(Vector((puff, root[1] + math.cos(t) * length * k, root[2] + math.sin(t) * length * k))))

    spokes = []
    for i, (deg, length) in enumerate(rays):
        spokes.append([at(deg, length, k, 0.0) for k in steps])
        if i + 1 < len(rays):
            d1, l1 = rays[i + 1]
            spokes.append([at((deg + d1) / 2, (length + l1) / 2 * _lerp(1.0, scallop, k), k, billow * k) for k in steps])
    hub = Vector(shape(Vector(root)))
    half = Vector((thick / 2, 0, 0))
    b = _Builder()
    for s0, s1 in zip(spokes, spokes[1:]):
        for sign in (1, -1):
            off = half * sign
            b.face([hub + off, s0[0] + off, s1[0] + off], off)
            for k in range(len(steps) - 1):
                b.face([s0[k] + off, s0[k + 1] + off, s1[k + 1] + off, s1[k] + off], off)
        b.face([s0[-1] + half, s1[-1] + half, s1[-1] - half, s0[-1] - half], (0, s0[-1].y - hub.y, s0[-1].z - hub.z))
    for spoke, way in ((spokes[0], (0, -1, 0)), (spokes[-1], (0, 0, -1))):
        chain = [hub] + spoke
        for p, q in zip(chain, chain[1:]):
            b.face([p + half, q + half, q - half, p - half], way)
    return a.add(b.piece()), [spokes[i * 2][-1] for i in range(len(rays))]


@asset("bio-skiff", tint="#3cc9a8", budget=1400)
def bio_skiff(a):
    """S5's living boat: a seed pod split open along its glowing seam, pale ribs across the
    hollow, a fan of membrane on bony rays for a sail, a fiddlehead prow carrying a lantern bud,
    a mushroom seat for one and a tendril tiller on a tail-fin rudder."""
    pod = _Pod(
        [
            (-0.92, 0.08, 0.12, 0.36, 87),
            (-0.83, 0.145, 0.05, 0.352, 87),
            (-0.72, 0.2, 0.0, 0.345, 87),
            (-0.5, 0.29, -0.07, 0.33, 86),
            (-0.26, 0.345, -0.1, 0.27, 52),
            (0.02, 0.375, -0.105, 0.225, 28),
            (0.3, 0.38, -0.105, 0.215, 24),
            (0.56, 0.34, -0.095, 0.225, 26),
            (0.8, 0.23, -0.04, 0.27, 46),
            (0.95, 0.1, 0.08, 0.32, 85),
        ],
        bow=(-1.02, 0.38),
        stern=(1.02, 0.335),
    )
    pod.build(a, (P.SHADE_2, P.WHITE), (P.SHADE_3, P.SHADE_2), (P.WHITE, P.WHITE)).part("tint")
    for side in (-1, 1):
        pod.suture(a, side).color(_MINT_DEEP, _MINT_HOT)
    bone = (_BONE_DEEP, _BONE)
    # Ribs across the hollow and a midrib along its floor, like the veins of the leaf it grew from.
    for i in (5, 6):
        us = (0.93, 0.66, 0.33)
        pts = [pod.inner(i, -1, u) for u in us] + [pod.inner(i, 1, 0.0)] + [pod.inner(i, 1, u) for u in reversed(us)]
        a.tube(pts, 0.02, 4, caps="none").color(*bone)
    a.tube([pod.inner(i, 1, 0.0) for i in range(3, 9)], 0.022, 4, caps="none").color(*bone)
    # A keel fin under the belly.
    a.profile_x([(-0.34, -0.07), (0.44, -0.08), (0.34, -0.2), (-0.04, -0.2)], 0.034, bevel=0.01).part("tint").color(P.SHADE_3, P.SHADE_2)

    # The sail: a fan of petal membrane on bony rays, rooted in the foredeck seam and swung a
    # little off the wind.
    petal = (jk.mix(P.MAGENTA, P.VIOLET, 0.25), P.PINK)
    root = (0.0, -0.6, 0.32)

    def swing(p):
        dy, dz = p.y - root[1], p.z - root[2]
        belly = math.sin(min(1.0, math.hypot(dy, dz) / 0.85) * math.pi)
        return (p.x + 0.09 * dy + 0.045 * belly, p.y, p.z)

    rays = [(103, 0.55), (79, 0.6), (55, 0.72), (33, 0.86), (13, 0.9)]
    sail, tips = _fan(a, root, rays, shape=swing)
    sail.part("glass").color(*petal)
    hub = Vector(swing(Vector(root)))
    for tip in tips:
        a.tube([hub.lerp(tip, 0.02), hub.lerp(tip, 0.5), tip], [0.034, 0.024, 0.012], 5).part("tint").color(P.SHADE_2, P.WHITE)
    a.sphere(0.06, 6, 4, (1, 1.2, 0.8)).move(*root).part("tint").color(P.SHADE_2, P.SHADE_1)

    # The prow uncurls like a fern and carries a lantern bud.
    curl = [(-0.98, 0.34), (-1.07, 0.43), (-1.15, 0.54), (-1.165, 0.65), (-1.11, 0.725), (-1.02, 0.725), (-0.975, 0.665), (-1.0, 0.61), (-1.05, 0.61)]
    a.tube([(0, y, z) for y, z in curl], [0.055, 0.05, 0.044, 0.038, 0.032, 0.027, 0.023, 0.02, 0.018], 6).part("tint").color(P.SHADE_2, P.WHITE)
    a.sphere(0.042, 6, 4).move(0, -1.06, 0.622).part("glow").color(_MINT_HOT)

    # A mushroom seat for one.
    floor = pod.inner(7, 1, 0.0)[2]
    a.lathe([(0.075, 0), (0.045, 0.1), (0.065, 0.2)], 6, cap_bottom=False, cap_top=False).move(0, 0.56, floor).color(*bone)
    a.sphere(0.15, 10, 5, (1, 1, 0.42)).move(0, 0.56, floor + 0.24).color(_BONE_DEEP, _BONE)

    # Rudder: a tail fin on a bony stock, steered by a tendril that ends in a bud by the seat.
    a.profile_x([(0.99, 0.27), (1.1, 0.33), (1.19, 0.3), (1.125, 0.13), (1.18, -0.02), (1.09, -0.07), (0.99, -0.05)], 0.026, bevel=0).part("glass").color(*petal)
    a.tube([(0, 0.985, -0.05), (0, 1.0, 0.12), (0, 1.03, 0.41)], [0.02, 0.026, 0.024], 5).color(*bone)
    a.tube([(0, 1.03, 0.4), (0.06, 0.93, 0.455), (0.16, 0.8, 0.44), (0.21, 0.68, 0.39), (0.215, 0.6, 0.37)], [0.026, 0.024, 0.021, 0.018, 0.016], 5).color(*bone)
    a.sphere(0.034, 6, 4).move(0.215, 0.58, 0.372).part("glow").color(_MINT_HOT)


# --------------------------------------------------------------------------------------------
# Aircraft
# --------------------------------------------------------------------------------------------
def _span(a, sections, sides=8, power=2.0):
    """A wing or tailplane: (x, half_chord, half_thickness, z, y_centre) sections lofted along x."""
    return a.loft([(-x, c, t, z, y) for x, c, t, z, y in sections], sides, power).rot(z=90)


def _propeller(a, x, y, z, r, blades=4, pitch=24, spin=0.0, color=P.CHARCOAL, facing=-1):
    """A spinner and blades turning about the y axis; `facing` -1 pulls toward -y, +1 pushes."""
    a.lathe([(r * 0.26, 0), (r * 0.22, r * 0.2), (r * 0.1, r * 0.4), (0, r * 0.46)], 8).rot(x=90 * -facing).move(x, y, z).color(color)
    for i in range(blades):
        a.box(r * 0.2, r * 0.045, r * 0.92, bevel=0, taper=(0.55, 1)).rot(z=pitch).move(0, 0, r * 0.08).rot(
            y=spin + 360 * i / blades
        ).move(x, y - facing * r * 0.12, z).color(color)


@asset("plane", tint="#f2f3f5", grounded=False, budget=1800)
def plane(a):
    sides, power = 12, 2.2
    body = [
        (-2.4, 0.0, 0.0, -0.13),
        (-2.3, 0.11, 0.09, -0.12),
        (-2.07, 0.235, 0.19, -0.085),
        (-1.86, 0.31, 0.3, -0.03),
        (-1.6, 0.35, 0.35, 0.0),
        (-1.2, 0.36, 0.36, 0.0),
        (0.5, 0.36, 0.36, 0.0),
        (1.2, 0.29, 0.3, 0.05),
        (1.8, 0.16, 0.19, 0.14),
        (2.15, 0.07, 0.1, 0.2),
        (2.25, 0.0, 0.0, 0.22),
    ]
    a.loft(body, sides, power).part("tint").color(P.SHADE_2, P.WHITE)
    # Wrap-around cockpit glazing, a row of cabin windows and a cheat line on each side.
    _skin_patch(a, body, sides, power, [-2.1, -2.07, -1.86, -1.82], [0.7, 1, 2, 3, 4, 5, 5.3], 0.007).part("glass").color(
        P.GLASS_DARK, P.GLASS_TINTED
    )
    for k0, k1 in ((0.3, 0.74), (5.26, 5.7)):
        for i in range(9):
            y = -1.42 + i * 0.235
            _skin_patch(a, body, sides, power, [y, y + 0.13], [k0, k1], 0.006).part("glass").color(P.GLASS_DARK).no_ao()
    for k0, k1 in ((-0.14, 0.12), (5.88, 6.14)):
        _skin_patch(a, body, sides, power, [-1.82, -1.2, 0.5, 1.2, 1.8, 2.12], [k0, k1], 0.006).color(P.RED).no_ao()
    # High wing with a root fairing over the cabin; slight dihedral, tapered to rounded tips.
    le = -0.56
    wing = [(x, c, t, 0.335 + 0.035 * abs(x), le + c) for x, c, t in (
        (-2.47, 0.1, 0.012), (-2.38, 0.2, 0.026), (-1.02, 0.33, 0.046), (-0.3, 0.4, 0.06),
        (0.3, 0.4, 0.06), (1.02, 0.33, 0.046), (2.38, 0.2, 0.026), (2.47, 0.1, 0.012),
    )]
    _span(a, wing).part("tint").color(P.SHADE_1, P.WHITE)
    a.loft([(-0.78, 0, 0, 0.3), (-0.6, 0.22, 0.07, 0.33), (-0.15, 0.31, 0.1, 0.35), (0.36, 0.27, 0.085, 0.35), (0.72, 0, 0, 0.32)], 8, 2.4).part(
        "tint"
    ).color(P.SHADE_1, P.WHITE)
    a.loft([(-0.72, 0, 0, -0.29), (-0.5, 0.24, 0.085, -0.32), (0.25, 0.27, 0.1, -0.33), (0.62, 0, 0, -0.28)], 8, 3).part("tint").color(
        P.SHADE_3, P.SHADE_2
    )
    # Engines slung under the wing, each driving a four-blade propeller.
    for side in (-1, 1):
        x = side * 1.02
        a.loft(
            [(-0.86, 0.09, 0.09, 0.2, x), (-0.74, 0.14, 0.15, 0.19, x), (-0.3, 0.155, 0.17, 0.2, x), (0.28, 0.1, 0.11, 0.26, x), (0.62, 0, 0, 0.31, x)],
            8,
            2.6,
        ).part("tint").color(P.SHADE_2, P.WHITE)
        a.loft([(-0.875, 0.1, 0.1, 0.2, x), (-0.84, 0.105, 0.105, 0.2, x)], 8, 2.6).color(P.STEEL_DARK)
        _propeller(a, x, -0.875, 0.2, 0.36, spin=18 if side > 0 else 40)
        a.box(0.09, 0.05, 0.05, bevel=0).move(x, 0.3, 0.1).color(P.CHARCOAL)
        a.sphere(0.035, 6, 4).move(side * 2.45, le + 0.1, 0.42).part("glow").color(P.GLOW_RED if side > 0 else P.GLOW_GREEN)
    # T-tail: a swept fin carrying the tailplane on a bullet fairing.
    a.profile_x([(1.22, 0.22), (2.2, 0.2), (2.32, 0.88), (1.98, 0.88)], 0.075, bevel=0.022).color(jk.shade(P.RED, -0.15), P.RED)
    tail = [(x, c, t, 0.87, 1.93 + c) for x, c, t in ((-0.92, 0.08, 0.01), (-0.84, 0.13, 0.018), (0, 0.21, 0.034), (0.84, 0.13, 0.018), (0.92, 0.08, 0.01))]
    _span(a, tail).part("tint").color(P.SHADE_1, P.WHITE)
    a.loft([(1.86, 0, 0, 0.875), (2.0, 0.055, 0.05, 0.875), (2.3, 0.045, 0.04, 0.875), (2.44, 0, 0, 0.875)], 6, 2).color(P.RED)
    a.sphere(0.03, 6, 4).move(0, -0.9, 0.385).part("glow").color(P.GLOW_RED)
    a.sphere(0.03, 6, 4).move(0, 2.26, 0.22).part("glow").color(P.GLOW_WHITE)


@asset("airship", tint="#e8dcc4", grounded=False, budget=1400)
def airship(a):
    length, radius, cz, sides, n = 4.8, 0.95, 1.43, 14, 13

    def girth(t):
        peak = 0.38
        if t < peak:
            return radius * math.sqrt(max(0.0, 1 - ((peak - t) / peak) ** 2))
        return radius * max(0.0, 1 - ((t - peak) / (1 - peak)) ** 2.2) ** 0.9

    stations = [0.5 - 0.5 * math.cos(math.pi * i / n) for i in range(n + 1)]
    hull = [(-length / 2 + length * t, girth(t), girth(t), cz) for t in stations]
    # A rigid envelope: the gores stay crisp over the frame while the form runs smooth lengthwise.
    a.loft(hull, sides, 2).smooth(19).part("tint").color(P.SHADE_2, P.WHITE)
    a.lathe([(0.2, 0), (0.15, 0.07), (0.05, 0.13), (0, 0.14)], 10).rot(x=90).move(0, -length / 2 + 0.035, cz).color(P.RED)
    # Cruciform tail fins.
    fin = [(1.12, 0.42), (2.3, 0.0), (2.43, 0.3), (2.43, 0.94), (2.0, 0.98)]
    for turn in (0, 90, 180, 270):
        a.profile_x(fin, 0.08, bevel=0.026).color(jk.shade(P.RED, -0.18), P.RED).rot(y=turn).move(0, 0, cz)
    # Control car faired into the keel, with a glazed nose and a row of lit windows.
    car_sides, car_power = 10, 3.0
    car = [(-1.2, 0, 0, 0.52), (-1.1, 0.13, 0.1, 0.47), (-0.86, 0.25, 0.19, 0.43), (0.05, 0.27, 0.21, 0.43), (0.38, 0.2, 0.17, 0.47), (0.56, 0, 0, 0.53)]
    a.loft(car, car_sides, car_power).color(P.WALNUT, P.OAK_WOOD)
    _skin_patch(a, car, car_sides, car_power, [-1.08, -0.9], [0.15, 1, 2, 3, 4, 4.85], 0.007).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    for k0, k1 in ((0.2, 0.8), (4.2, 4.8)):
        for i in range(5):
            y = -0.78 + i * 0.2
            _skin_patch(a, car, car_sides, car_power, [y, y + 0.13], [k0, k1], 0.006).part("glow").color(P.WINDOW)
    a.loft([(-0.9, 0.2, 0.012, 0.225), (0.1, 0.2, 0.012, 0.225)], 6, 4).color(P.WALNUT)
    # Engine cars on outriggers, pusher propellers behind.
    for side in (-1, 1):
        x, y, z = side * 0.8, 0.62, 0.72
        a.loft([(-0.24, 0, 0, z, x), (-0.16, 0.075, 0.075, z, x), (0.08, 0.085, 0.085, z, x), (0.2, 0.05, 0.05, z, x)], 8, 2.2).move(0, y, 0).color(
            P.STEEL_DARK, P.STEEL
        )
        _propeller(a, x, y + 0.2, z, 0.2, blades=2, spin=35 * side, facing=1)
        for dy in (-0.1, 0.08):
            a.tube([(x, y + dy, z + 0.04), (side * 0.52, y + dy, 1.0)], 0.016, 4, caps="none").color(P.STEEL_DARK)
        a.tube([(x, y, z - 0.02), (side * 0.2, 0.2, 0.5)], 0.014, 4, caps="none").color(P.STEEL_DARK)
    a.sphere(0.035, 6, 4).move(0, -0.3, 0.2).part("glow").color(P.GLOW_RED)


@asset("glider", tint="#d35fc4", grounded=False, budget=1400)
def glider(a):
    half = 2.0
    cusps = [(0.0, 0.4), (0.3, 0.56), (0.58, 0.62), (0.82, 0.6), (1.0, 0.47)]

    def lead(u):
        return -0.8 + 1.22 * u**1.35

    def trail(u):
        for (u0, y0), (u1, y1) in zip(cusps, cusps[1:]):
            if u <= u1 + 1e-9:
                f = (u - u0) / (u1 - u0)
                return _lerp(y0, y1, f) - 0.13 * (u1 - u0) / 0.3 * math.sin(math.pi * f)
        return cusps[-1][1]

    def rise(u):
        return 0.025 + 0.265 * u**1.8

    def surface(u, v, side):
        y = _lerp(lead(u), trail(u), v)
        return Vector((side * u * half, y, rise(u) + 0.035 * math.sin(math.pi * v) * (1 - u * 0.7)))

    us = [0.035]
    for (u0, _), (u1, _) in zip(cusps, cusps[1:]):
        us += [_lerp(u0, u1, f) for f in ((0.33, 0.67, 1.0) if u0 else (0.4, 0.7, 1.0))]
    vs = [0.0, 0.45, 1.0]
    up = Vector((0, 0, 0.011))
    for side in (-1, 1):
        b = _Builder()
        for u0, u1 in zip(us, us[1:]):
            for v0, v1 in zip(vs, vs[1:]):
                quad = [surface(u0, v0, side), surface(u1, v0, side), surface(u1, v1, side), surface(u0, v1, side)]
                b.face([p + up for p in quad], (0, 0, 1))
                b.face([p - up for p in quad], (0, 0, -1))
            p0, p1 = surface(u0, 1, side), surface(u1, 1, side)
            b.face([p0 + up, p1 + up, p1 - up, p0 - up], (0, 1, 0))
        a.add(b.piece()).part("tint").color(P.SHADE_1, P.WHITE, "y")
        # The arm along the leading edge, and finger rays fanning from the wrist to each cusp.
        arm = [0.0, 0.12, 0.3, 0.5, 0.72, 0.9, 1.0]
        a.tube([surface(u, 0, side) + Vector((0, 0.01, 0)) for u in arm], [0.062, 0.055, 0.046, 0.036, 0.026, 0.018, 0.01], 6, caps="round").part(
            "tint"
        ).color(P.SHADE_3, P.SHADE_2, "y")
        wrist = 0.3
        for cu in (0.58, 0.82):
            pts = [surface(_lerp(wrist, cu, t), t, side) + Vector((0, 0, 0.012)) for t in (0.0, 0.35, 0.7, 1.0)]
            a.tube(pts, [0.028, 0.022, 0.016, 0.009], 5, caps="none").part("tint").color(P.SHADE_3, P.SHADE_2, "y")
        pts = [surface(_lerp(0.05, 0.3, t), t, side) + Vector((0, 0, 0.012)) for t in (0.0, 0.5, 1.0)]
        a.tube(pts, [0.03, 0.022, 0.01], 5, caps="none").part("tint").color(P.SHADE_3, P.SHADE_2, "y")
        a.sphere(0.03, 6, 4).move(*surface(1.0, 0.3, side)).part("glow").color(P.GLOW_CYAN)
    # A slim body with a canopy blister and a glowing dorsal line, trailing a whip tail.
    body = [(-1.2, 0, 0, 0.0), (-1.08, 0.06, 0.045, 0.01), (-0.7, 0.125, 0.088, 0.03), (-0.2, 0.12, 0.085, 0.035), (0.3, 0.06, 0.05, 0.045), (0.5, 0.025, 0.025, 0.05)]
    a.loft(body, 8, 2.2).part("tint").color(P.SHADE_3, P.SHADE_1)
    membrane = jk.mix(P.ICE, P.VIOLET, 0.3)
    a.loft([(-1.0, 0, 0, 0.05), (-0.92, 0.07, 0.04, 0.075), (-0.72, 0.09, 0.05, 0.095), (-0.56, 0, 0, 0.1)], 6, 2.2).part("glass").color(
        jk.shade(membrane, -0.3), membrane
    )
    a.tube([(0, y, _row(body, y)[2] + _row(body, y)[1] + 0.004) for y in (-0.56, -0.2, 0.3, 0.5)], 0.013, 4, caps="none").part("glow").color(
        P.GLOW_CYAN
    )
    a.tube([(0, 0.48, 0.05), (0, 0.62, 0.07), (0, 0.76, 0.12)], [0.024, 0.016, 0.006], 5, caps="none").part("tint").color(P.SHADE_3)


# --------------------------------------------------------------------------------------------
# Drones
# --------------------------------------------------------------------------------------------
def _duct(a, r_out, r_in, h, sides=12):
    """A rotor guard standing on z = 0: a thin-walled hoop with a rectangular section."""
    profile = [(r_in, 0.0), (r_out, 0.0), (r_out, h), (r_in, h)]
    b = _Builder()
    for i in range(sides):
        a0, a1 = i / sides * math.tau, (i + 1) / sides * math.tau
        cm, sm = math.cos((a0 + a1) / 2), math.sin((a0 + a1) / 2)
        for (r0, z0), (r1, z1) in zip(profile, profile[1:] + profile[:1]):
            nr, nz = z1 - z0, r0 - r1
            b.face(
                [
                    (math.cos(a0) * r0, math.sin(a0) * r0, z0),
                    (math.cos(a1) * r0, math.sin(a1) * r0, z0),
                    (math.cos(a1) * r1, math.sin(a1) * r1, z1),
                    (math.cos(a0) * r1, math.sin(a0) * r1, z1),
                ],
                (nr * cm, nr * sm, nz),
            )
    return a.add(b.piece())


def _rotor(a, x, y, z, r, blades=2, spin=0.0, pitch=10, color=P.INK, hub=P.CHARCOAL, chord=0.2, motor=(0.16, 0.24)):
    """A lifting rotor turning about z, blades at height z, on a motor hub (radius, height) x r."""
    t = max(0.008, r * 0.04)
    a.cyl(r * motor[0], r * motor[1], 6, bevel=0).move(x, y, z + r * 0.08 - r * motor[1]).color(hub)
    for i in range(blades):
        a.prism(
            [(r * 0.1, -r * chord / 2), (r * 0.98, -r * chord * 0.3), (r * 0.98, r * chord * 0.3), (r * 0.1, r * chord / 2)], t, bevel=0
        ).move(0, 0, -t / 2).rot(x=pitch).rot(z=spin + 360 * i / blades).move(x, y, z).color(color)


@asset("drone", tint="#3a3e45", grounded=False, budget=1400)
def drone(a):
    body = [
        (-0.3, 0, 0, 0.06),
        (-0.27, 0.085, 0.04, 0.062),
        (-0.12, 0.15, 0.068, 0.07),
        (0.1, 0.145, 0.07, 0.074),
        (0.25, 0.085, 0.045, 0.08),
        (0.29, 0, 0, 0.082),
    ]
    a.loft(body, 10, 2.6).part("tint").color(P.SHADE_2, P.WHITE)
    a.loft([(-0.13, 0, 0, 0.128), (-0.09, 0.075, 0.024, 0.14), (0.12, 0.075, 0.024, 0.144), (0.17, 0, 0, 0.134)], 8, 3).color(P.INK)
    motor_z = 0.085
    for sx in (-1, 1):
        for sy in (-1, 1):
            mx, my = sx * 0.4, sy * 0.38
            a.tube(
                [(sx * 0.07, sy * 0.07, 0.08), (mx, my, motor_z), (mx + sx * 0.142, my + sy * 0.142, motor_z + 0.022)],
                [0.03, 0.022, 0.014],
                5,
            ).part("tint").color(P.SHADE_3, P.SHADE_1)
            a.cyl(0.042, 0.08, 6, bevel=0).move(mx, my, motor_z - 0.04).part("metal").color(P.STEEL)
            _rotor(a, mx, my, 0.15, 0.185, 2, spin=35 + 50 * (sx * sy > 0))
            _duct(a, 0.214, 0.192, 0.04, 12).move(mx, my, 0.11).color(P.STEEL_DARK, P.STEEL)
            a.tube([(mx, my, motor_z - 0.03), (mx, my, -0.07)], 0.011, 4).color(P.INK)
    # The gimbal eye under the nose, and a red recording light on the brow.
    eye = Vector((0.0, -0.2, -0.008))
    look = Vector((0.0, -math.cos(math.radians(24)), -math.sin(math.radians(24))))
    a.box(0.09, 0.07, 0.03, bevel=0.008).move(0, -0.185, 0.012).color(P.CHARCOAL)
    a.sphere(0.056, 10, 6).move(*eye).color(P.INK)
    a.cyl(0.04, 0.014, 8, bevel=0).rot(x=114).move(*(eye + look * 0.04)).part("metal").color(P.CHROME)
    a.cyl(0.03, 0.012, 8, bevel=0).rot(x=114).move(*(eye + look * 0.05)).part("glass").color(P.GLASS_DARK, P.GLASS)
    a.box(0.07, 0.022, 0.022, bevel=0).move(0, -0.292, 0.066).part("glow").color(P.GLOW_RED)
    for side in (-1, 1):
        a.tube([(side * 0.06, 0.22, 0.11), (side * 0.085, 0.27, 0.2)], 0.006, 3, caps="none").color(P.INK)


@asset("cargo-drone", tint="#e0a830", grounded=False, budget=1400)
def cargo_drone(a):
    body = [
        (-0.42, 0.15, 0.045, 0.872),
        (-0.36, 0.26, 0.09, 0.885),
        (-0.12, 0.3, 0.115, 0.9),
        (0.3, 0.3, 0.115, 0.9),
        (0.4, 0.22, 0.08, 0.9),
        (0.43, 0.16, 0.05, 0.9),
    ]
    a.loft(body, 10, 3.6).part("tint").color(P.SHADE_2, P.WHITE)
    # A dark sensor visor with a red running light, and an avionics pack with a beacon on top.
    a.box(0.34, 0.04, 0.06, bevel=0.012).move(0, -0.4, 0.86).color(P.INK)
    a.box(0.14, 0.02, 0.028, bevel=0).move(0, -0.424, 0.876).part("glow").color(P.GLOW_RED)
    a.box(0.3, 0.38, 0.05, bevel=0.02).move(0, 0.03, 1.005).color(P.CHARCOAL)
    a.tube([(0.09, 0.16, 1.05), (0.09, 0.16, 1.1)], 0.008, 4, caps="none").color(P.CHARCOAL)
    _lamp(a, 0.09, 0.16, 1.125, P.GLOW_WHITE, 0.03)
    # Four ducted rotors on arms that carry through to each motor.
    for sx in (-1, 1):
        for sy in (-1, 1):
            cx, cy = sx * 0.455, sy * 0.44
            away = Vector((sx * 0.72, sy * 0.69, 0)).normalized()
            a.tube(
                [(sx * 0.22, sy * 0.2, 0.93), (cx, cy, 0.972), (cx + away.x * 0.235, cy + away.y * 0.235, 0.972)], [0.042, 0.03, 0.02], 6
            ).color(P.CHARCOAL)
            _duct(a, 0.255, 0.224, 0.1, 12).move(cx, cy, 0.958).part("metal").color(P.STEEL, P.CHROME)
            _rotor(a, cx, cy, 1.04, 0.205, 3, spin=20 + 40 * (sx * sy > 0), hub=P.CHARCOAL, motor=(0.26, 0.5))
    # The load: a slatted crate held by a winch hook and two side clamps.
    a.box(0.5, 0.5, 0.44, bevel=0.02).move(0, 0, 0.18).color(P.OAK_WOOD, P.PINE_WOOD)
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box(0.06, 0.06, 0.45, bevel=0).move(sx * 0.235, sy * 0.235, 0.178).color(jk.shade(P.OAK_WOOD, -0.22))
    for z in (0.2, 0.555):
        a.box(0.515, 0.515, 0.045, bevel=0).move(0, 0, z).color(jk.shade(P.OAK_WOOD, -0.22))
    a.box(0.56, 0.24, 0.07, bevel=0.02).move(0, 0, 0.735).color(P.CHARCOAL)
    a.cyl(0.035, 0.12, 6, bevel=0).move(0, 0, 0.62).part("metal").color(P.STEEL)
    for sx in (-1, 1):
        a.box(0.035, 0.2, 0.36, bevel=0.01).move(sx * 0.277, 0, 0.4).color(P.CHARCOAL)
        a.box(0.03, 0.26, 0.07, bevel=0.01).move(sx * 0.268, 0, 0.4).color(P.STEEL_DARK)


@asset("hunter-drone", tint="#2d2a2f", grounded=False, budget=1400)
def hunter_drone(a):
    sides, power = 6, 2.0
    hull = [
        (-1.06, 0, 0, 0.9),
        (-0.82, 0.13, 0.07, 0.93),
        (-0.3, 0.4, 0.17, 0.98),
        (0.12, 0.46, 0.2, 1.0),
        (0.56, 0.3, 0.16, 1.02),
        (0.82, 0.12, 0.08, 1.04),
        (0.92, 0, 0, 1.05),
    ]
    a.loft(hull, sides, power).smooth(25).bevel(0.018).part("tint").color(P.SHADE_2, P.WHITE)
    # A dorsal armour plate, and two slanted red sensor slits on the nose.
    a.prism([(0, -0.5), (0.2, -0.08), (0.17, 0.46), (-0.17, 0.46), (-0.2, -0.08)], 0.055, bevel=0.018).move(0, 0, 1.15).part("tint").color(
        P.SHADE_3, P.SHADE_1
    )
    for k0, k1 in ((0.22, 0.72), (2.28, 2.78)):
        _skin_patch(a, hull, sides, power, [-0.76, -0.52], [k0, k1], 0.006).part("glow").color(P.GLOW_RED)
    a.sphere(0.1, 8, 5).move(0, -0.5, 0.83).part("metal").color(P.STEEL)
    a.cyl(0.05, 0.03, 8, bevel=0).rot(x=120).move(0, -0.58, 0.785).part("glow").color(P.GLOW_RED)
    # Four armoured rotors on blade arms.
    for sx in (-1, 1):
        for sy in (-1, 1):
            cx, cy = sx * 0.73, sy * 0.71
            a.tube([(sx * 0.3, sy * 0.24, 1.0), (cx, cy, 1.07)], [0.07, 0.05], 4, squash=0.45).part("tint").color(P.SHADE_3, P.SHADE_2)
            _duct(a, 0.385, 0.335, 0.12, 8).smooth(30).move(cx, cy, 1.03).part("metal").color(P.STEEL, P.CHROME)
            a.tube([(cx - 0.34, cy, 1.06), (cx + 0.34, cy, 1.06)], 0.022, 4, caps="none").color(P.INK)
            _rotor(a, cx, cy, 1.115, 0.31, 3, spin=15 + 45 * (sx * sy > 0), hub=P.GUNMETAL)
    # Weapon pods on pylons under the hull, a cannon barrel ahead of each.
    for side in (-1, 1):
        x, z = side * 0.36, 0.52
        a.loft([(-0.34, 0.05, 0.05, z, x), (-0.28, 0.11, 0.11, z, x), (0.2, 0.11, 0.11, z, x), (0.32, 0.06, 0.06, z, x)], 6, 2).smooth(25).color(
            P.INK, P.GUNMETAL
        )
        a.tube([(x, -0.3, z), (x, -0.66, z)], 0.032, 6).part("metal").color(P.STEEL)
        a.box(0.085, 0.07, 0.085, bevel=0.012).move(x, -0.66, z - 0.0425).color(P.INK)
        a.box(0.05, 0.26, 0.28, bevel=0.012).move(x, -0.02, z + 0.08).part("tint").color(P.SHADE_3, P.SHADE_2)
    # Canted tail blades and a stinger antenna.
    for side in (-1, 1):
        a.profile_x([(0.42, 1.08), (0.92, 1.1), (1.08, 1.5), (0.9, 1.5)], 0.05, bevel=0.015).rot(y=side * 24, pivot=(0, 0, 1.08)).move(
            side * 0.13, 0, 0
        ).part("tint").color(P.SHADE_2, P.WHITE)
    a.tube([(0, 0.86, 1.04), (0, 1.1, 1.0)], [0.02, 0.006], 4).color(P.INK)


# --------------------------------------------------------------------------------------------
# Ore hauler
# --------------------------------------------------------------------------------------------
def _hopper(a, w, d, h, z, ore, seed, glint=None):
    """An open-topped ore pod: a tapered tub with a rim, heaped with rock."""
    top = z + h
    a.box(w, d, h, bevel=0.035, taper=(0.72, 0.9)).rot(y=180).move(0, 0, top).part("tint").color(P.SHADE_2, P.WHITE)
    b = _Builder()
    xo, yo, xi, yi = w / 2 + 0.025, d / 2 + 0.025, w / 2 - 0.05, d / 2 - 0.05
    xl, yl = w / 2 * 0.94, d / 2 * 0.97
    outer_low = [(-xl, -yl, top - 0.1), (xl, -yl, top - 0.1), (xl, yl, top - 0.1), (-xl, yl, top - 0.1)]
    outer = [(-xo, -yo, top + 0.02), (xo, -yo, top + 0.02), (xo, yo, top + 0.02), (-xo, yo, top + 0.02)]
    inner = [(-xi, -yi, top + 0.02), (xi, -yi, top + 0.02), (xi, yi, top + 0.02), (-xi, yi, top + 0.02)]
    floor = [(x, y, top - 0.05) for x, y, _ in inner]
    hints = [(0, -1, 0), (1, 0, 0), (0, 1, 0), (-1, 0, 0)]
    for i in range(4):
        j = (i + 1) % 4
        n = hints[i]
        b.face([outer_low[i], outer_low[j], outer[j], outer[i]], n)
        b.face([outer[i], outer[j], inner[j], inner[i]], (0, 0, 1))
        b.face([inner[i], inner[j], floor[j], floor[i]], (-n[0], -n[1], 0))
    a.add(b.piece()).part("tint").color(P.SHADE_3, P.SHADE_1)
    a.raw(floor, [(0, 1, 2, 3)]).color(P.INK).no_ao()
    rand = a.rand
    lumps = [(-0.22, -0.1, 0.27), (0.2, 0.12, 0.28), (0.02, 0.02, 0.2)]
    for i, (x, y, r) in enumerate(lumps):
        tone = jk.shade(ore, (rand.random() - 0.5) * 0.3)
        a.blob(r, 1, (1.12, 1.0, 0.78), lumps=0.22, seed=seed * 5 + i).move(x * w / 1.12, y * d / 0.9, top + r * 0.1).color(
            jk.shade(tone, -0.2), tone
        )
    if glint is not None:
        a.blob(0.085, 1, (1, 1, 1.2), lumps=0.2, seed=seed + 40).move(0.22, -0.2, top + 0.07).part("glow").color(glint)


@asset("ore-hauler", tint="#e0a830", grounded=False, budget=1400)
def ore_hauler(a):
    # Open cargo spine: a keel, two longerons and clamp frames between the pods.
    a.box(0.26, 3.78, 0.2, bevel=0.03).move(0, 0.42, 0.12).color(P.GUNMETAL, P.STEEL_DARK)
    for side in (-1, 1):
        a.tube([(side * 0.5, -1.42, 0.3), (side * 0.5, 2.05, 0.3)], 0.04, 4, caps="none").color(P.STEEL_DARK)
    for y in (-1.38, -0.32, 0.76, 1.84):
        a.box(1.26, 0.1, 0.11, bevel=0).move(0, y, 0.25).color(P.GUNMETAL)
        for side in (-1, 1):
            a.box(0.07, 0.1, 0.4, bevel=0).move(side * 0.6, y, 0.3).color(P.GUNMETAL)
    ores = [jk.mix(P.RUST, P.STONE_DARK, 0.45), jk.mix(P.STONE_DARK, P.SLATE, 0.5), jk.mix(P.CLAY, P.STONE_DARK, 0.55)]
    for k, y in enumerate((-0.85, 0.22, 1.3)):
        with a.group() as g:
            _hopper(a, 1.12, 0.9, 0.62, 0.38, ores[k], k + 3, glint=P.GLOW_CYAN if k == 1 else None)
        g.move(0, y, 0)
    # Cab: a blunt pressure hull with a wrap-around windscreen, lamps, a beacon and a dish.
    sides, power = 10, 3.2
    cab = [(-2.4, 0.24, 0.11, 0.48), (-2.33, 0.36, 0.2, 0.52), (-2.0, 0.5, 0.39, 0.63), (-1.62, 0.5, 0.4, 0.64), (-1.52, 0.4, 0.3, 0.6)]
    a.loft(cab, sides, power).part("tint").color(P.SHADE_2, P.WHITE)
    _skin_patch(a, cab, sides, power, [-2.29, -2.05], [0.42, 4.58], 0.007).part("glass").color(P.GLASS_DARK, P.GLASS_TINTED)
    for side in (-1, 1):
        a.box(0.1, 0.02, 0.05, bevel=0).move(side * 0.13, -2.405, 0.43).part("glow").color(P.GLOW_WHITE)
        a.box(0.05, 0.14, 0.11, bevel=0.015).move(side * 0.515, -1.8, 0.58).color(P.GUNMETAL)
    a.box(0.76, 0.14, 0.62, bevel=0.03).move(0, -1.46, 0.3).color(P.GUNMETAL, P.STEEL_DARK)
    a.cyl(0.05, 0.05, 6, bevel=0, grounded=True).move(0, -1.9, 1.035).color(P.CHARCOAL)
    _lamp(a, 0, -1.9, 1.15, P.GLOW_RED, 0.065)
    a.box(0.3, 0.24, 0.035, bevel=0.012).move(0, -1.7, 1.03).part("tint").color(P.SHADE_3)
    a.tube([(0.3, -1.64, 1.0), (0.3, -1.64, 1.17)], 0.01, 3, caps="none").color(P.STEEL_DARK)
    # Engine block: four bells, a painted top plate and glossy radiator wings on struts.
    a.box(1.3, 0.82, 0.92, bevel=0.06).move(0, 2.41, 0.1).color(P.GUNMETAL, P.STEEL_DARK)
    a.box(0.92, 0.52, 0.05, bevel=0.02).move(0, 2.38, 1.02).part("tint").color(P.SHADE_1, P.WHITE)
    for y in (2.24, 2.38, 2.52):
        a.box(0.62, 0.07, 0.03, bevel=0).move(0, y, 1.06).color(P.INK)
    for x in (-0.33, 0.33):
        for z in (0.33, 0.79):
            a.lathe([(0.1, 0), (0.125, 0.06), (0.17, 0.2)], 10, cap_bottom=False, cap_top=False).rot(x=-90).move(x, 2.8, z).color(
                P.INK, P.STEEL_DARK, "y"
            )
            ring = [(math.cos(i / 10 * math.tau) * 0.16, math.sin(i / 10 * math.tau) * 0.16, 0) for i in range(10)]
            a.raw(ring, [list(range(10))]).rot(x=-90).move(x, 2.975, z).part("glow").color(P.GLOW_ORANGE)
    for side in (-1, 1):
        with a.group() as g:
            a.box(0.52, 0.72, 0.04, bevel=0.012).move(side * 0.98, 2.3, 0.6).part("glass").color(P.NAVY, P.GLASS_TINTED, "y")
            a.box(0.6, 0.05, 0.06, bevel=0).move(side * 0.94, 2.3, 0.59).color(P.STEEL_DARK)
        g.rot(y=-side * 10, pivot=(side * 0.66, 0, 0.6))
