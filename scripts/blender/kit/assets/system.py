"""Solar System destinations: worked asteroids, a banded giant with rings and a settled moon, a
Kuiper outpost, and the Sun inside its collector swarm.

Every body is centred on the origin, floats (`grounded=False`) and is authored at ten times the
size the story draws it. The web app stands buildings, crews and ships on the upper (+z)
hemisphere at the stated radius, so relief there is kept low: shallow craters, hairline cracks,
no spikes. The bodies are original interpretive artwork. They illustrate a narrative, picture no
particular moon or planet, and encode no measured quantity.

Rock and ice are faceted on purpose. Each body is a stack of vertex rings about a tilted axis, so
its strata follow real edge loops. It is then cut back to a couple of dozen flat planes, which is
what makes it read as hewn rock and not as a smooth lump; craters are inset as concentric rings,
and cracks are bevelled along mesh edges so an ore vein can sit in the groove as its own luminous
inlay. The elongated rock is a limb of such rings swept along a bent line, and the split rock is
broken along a creased plane, so its two faces still fit each other. The giant, its rings and
the collector are smooth, as cloud, dust and machine should be.

Set JANUS_KIT_MEASURE=1 with `kit.py stats` to print how far each body strays from its stated
radius and where its surface lies under the props the web app stands on it. For the elongated
and the split rock it also prints the gap left to the main asteroid, their reach, and the
triangles authored.
"""

from __future__ import annotations

import heapq
import math
import os
import random

import bmesh
from mathutils import Matrix, Vector, noise
from mathutils.bvhtree import BVHTree

from kit import jk
from kit import palette as P
from kit.jk import asset

ROCK, WALL, BOWL, FLOOR, APRON, CUT, SLAB, BREAK = 0, 1, 2, 3, 4, 5, 6, 7

ORE = ("#c9f8ff", P.GLOW_CYAN, "#58cfe6")
FROST = ("#d4fbff", "#8feeff", "#62d2ec")
#: Where the web app stands a rig on the companion rocks (its (0.2, 1, 0.5), in this frame).
STAND = (0.176, -0.44, 0.88)


# --------------------------------------------------------------------------------------------
# Small maths
# --------------------------------------------------------------------------------------------
def _n(p, seed: float = 0.0, freq: float = 1.0) -> float:
    """Smooth noise in about -0.7..0.7."""
    return noise.noise(Vector(p) * freq + Vector((seed * 3.17 + 0.37, seed * 5.71 - 1.9, seed * 9.13 + 4.2)))


def _smooth(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def _perp(axis):
    """Two unit vectors perpendicular to `axis`, and the unit axis."""
    w = Vector(axis).normalized()
    helper = Vector((0, 0, 1)) if abs(w.z) < 0.9 else Vector((1, 0, 0))
    u = w.cross(helper).normalized()
    return u, w.cross(u).normalized(), w


def _grey(value: float):
    """A neutral paint for tint parts, `value` in sRGB (1 = white)."""
    v = jk.srgb_to_linear(max(0.0, min(1.0, value)))
    return (v, v, v)


def _zip(out, a, at, b, bt):
    """Triangles between two closed loops. `at` and `bt` are increasing parameters in 0..1."""
    m, n = len(a), len(b)
    j0 = min(range(n), key=lambda j: (bt[j] - at[0]) % 1.0)
    pa = [(at[k] - at[0]) % 1.0 for k in range(m)] + [1.0]
    pb = [(bt[(j0 + k) % n] - at[0]) % 1.0 for k in range(n)]
    pb.append(pb[0] + 1.0)
    i = j = 0
    while i < m or j < n:
        if j >= n or (i < m and pa[i + 1] <= pb[j + 1]):
            out.append((a[i % m], a[(i + 1) % m], b[(j0 + j) % n]))
            i += 1
        else:
            out.append((a[i % m], b[(j0 + j + 1) % n], b[(j0 + j) % n]))
            j += 1


# --------------------------------------------------------------------------------------------
# Faceted bodies
# --------------------------------------------------------------------------------------------
def _shell(n_eq: int, rings, seed: int, axis=(0, 0, 1), jitter: float = 0.3, counts=None):
    """A unit sphere as rings of vertices about `axis`, zipped into even triangles.

    `rings` is a count, or the polar angles themselves (radians); `counts` overrides how many
    vertices each ring gets. Returns (directions, faces, polar angles, ring of each vertex):
    faces between two rings form one stratum. Ring 0 is the pole on the axis.
    """
    rnd = random.Random(seed)
    u, v, w = _perp(axis)
    thetas = [math.pi * j / (rings + 1) for j in range(1, rings + 1)] if isinstance(rings, int) else list(rings)
    dirs = [w.copy()]
    ring_of = [0]
    loops = []
    for k, theta in enumerate(thetas):
        count = counts[k] if counts else max(5, round(n_eq * math.sin(theta)))
        phase = rnd.random()
        ts = sorted(((i + phase + (rnd.random() - 0.5) * jitter) / count) % 1.0 for i in range(count))
        index = []
        for t in ts:
            index.append(len(dirs))
            dirs.append((u * math.cos(t * math.tau) + v * math.sin(t * math.tau)) * math.sin(theta) + w * math.cos(theta))
            ring_of.append(k + 1)
        loops.append((index, ts))
    dirs.append(-w)
    ring_of.append(len(thetas) + 1)
    faces = []
    first, last, south = loops[0][0], loops[-1][0], len(dirs) - 1
    for i in range(len(first)):
        faces.append((0, first[i], first[(i + 1) % len(first)]))
    for (a, at), (b, bt) in zip(loops, loops[1:]):
        _zip(faces, a, at, b, bt)
    for i in range(len(last)):
        faces.append((south, last[(i + 1) % len(last)], last[i]))
    return dirs, faces, thetas, ring_of


def _body(radius: float, n_eq: int, rings, seed: int, axis, shape, part: str = "tint", counts=None):
    """A faceted body: `shape(direction)` scales the radius along each unit direction."""
    dirs, faces, thetas, _ = _shell(n_eq, rings, seed, axis, counts=counts)
    piece = jk.raw([d * (radius * shape(d)) for d in dirs], faces).flat().part(part)
    return piece, thetas


def _ellipsoid(d, sx: float, sy: float, sz: float) -> float:
    return 1.0 / math.sqrt((d.x / sx) ** 2 + (d.y / sy) ** 2 + (d.z / sz) ** 2)


def _reach(inside, d, far: float) -> float:
    """How far a solid that is star-shaped about the origin reaches along the unit direction `d`."""
    lo, hi = 0.0, far
    for _ in range(24):
        mid = (lo + hi) / 2
        if inside(d * mid):
            lo = mid
        else:
            hi = mid
    return lo


def _spaced(reach, axis, step: float):
    """Rings about `axis` set about `step` apart over a body of radial reach `reach(direction)`:
    (polar angles, vertex count of each ring). For bodies far from round."""
    u, v, w = _perp(axis)

    def point(theta, phi):
        d = (u * math.cos(phi) + v * math.sin(phi)) * math.sin(theta) + w * math.cos(theta)
        return d * reach(d)

    n, meridians = 180, (0.3, 1.9, 3.5, 5.1)
    arc = [0.0]
    for i in range(1, n + 1):
        a, b = math.pi * (i - 1) / n, math.pi * i / n
        arc.append(arc[-1] + sum((point(b, phi) - point(a, phi)).length for phi in meridians) / len(meridians))
    count = max(3, round(arc[-1] / step) - 1)
    thetas, counts = [], []
    i = 1
    for j in range(1, count + 1):
        target = arc[-1] * j / (count + 1)
        while arc[i] < target:
            i += 1
        theta = math.pi * (i - 1 + (target - arc[i - 1]) / (arc[i] - arc[i - 1])) / n
        loop = [point(theta, math.tau * k / 24) for k in range(24)]
        around = sum((q - p).length for p, q in zip(loop, loop[1:] + loop[:1]))
        thetas.append(theta)
        counts.append(max(5, round(around / step)))
    return thetas, counts


def _level(piece, radius: float, low: float = 0.93, high: float = 1.07, start: float = 0.0, full: float = 0.3, pole=(0, 0, 1)):
    """Keep the cap about `pole` near the stated radius, where the web app stands props.
    `start` and `full` are cosines of the angle from the pole: no pull, and all of it."""
    p = Vector(pole).normalized()
    for v in piece.bm.verts:
        r = v.co.length
        weight = _smooth((v.co.dot(p) / r - start) / (full - start))
        if weight <= 0:
            continue
        target = min(max(r, radius * low), radius * high)
        v.co *= (r + (target - r) * weight) / r
    piece.bm.normal_update()
    return piece


def _chip(piece, normal, cut: float = 0.0, centre=(0, 0, 0), only=None, at: float | None = None, role: int = CUT):
    """Slice a flat facet: everything beyond a plane `cut` below the body's extreme point along
    `normal` (or beyond the plane `at` that far from `centre`) is drawn back onto that plane,
    toward `centre`. Faces left lying in the plane take `role`: a cut shows the rock's beds."""
    n = Vector(normal).normalized()
    c = Vector(centre)
    verts = [v for v in piece.bm.verts if only is None or only(v.co)]
    limit = (max((v.co - c).dot(n) for v in verts) - cut) if at is None else at
    moved = set()
    for v in verts:
        d = (v.co - c).dot(n)
        if d > limit:
            v.co = c + (v.co - c) * (limit / d)
            moved.add(v)
    for f in piece.bm.faces:
        if f.material_index in (ROCK, CUT, SLAB) and all(x in moved for x in f.verts):
            f.material_index = role
    piece.bm.normal_update()
    return piece


def _scatter(count: int, seed: int, jitter: float = 0.9):
    """Directions spread evenly over the sphere (a golden spiral), each nudged a little."""
    rnd = random.Random(seed)
    golden = math.pi * (3 - math.sqrt(5))
    turn = rnd.random() * math.tau
    out = []
    for i in range(count):
        z = 1 - (2 * i + 1) / count
        r = math.sqrt(1 - z * z)
        d = Vector((r * math.cos(i * golden + turn), r * math.sin(i * golden + turn), z))
        nudge = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1)))
        out.append((d + nudge * (jitter / math.sqrt(count))).normalized())
    return out


def _facets(piece, radius: float, count: int, seed: int, cut=(0.05, 0.11), top=None):
    """Cut a body back to about `count` flat facets, so it reads as hewn planes meeting at
    ridges and not as a smooth lump. `cut` is the range of depths, as fractions of `radius`;
    `top` is the gentler range used on the upper hemisphere, where props stand."""
    rnd = random.Random(seed * 7 + 3)
    for n in _scatter(count, seed):
        depth = rnd.uniform(*cut)
        if top is not None and n.z > 0.05:
            depth = rnd.uniform(*top)
        _chip(piece, n, depth * radius)
    return piece


def _hull(points):
    """The convex hull of a set of points, as a flat-shaded piece of cut rock."""
    bm = bmesh.new()
    verts = [bm.verts.new(Vector(p)) for p in points]
    hull = bmesh.ops.convex_hull(bm, input=verts, use_existing_faces=False)
    spare = list(dict.fromkeys(g for g in hull["geom_interior"] + hull["geom_unused"] if isinstance(g, bmesh.types.BMVert)))
    if spare:
        bmesh.ops.delete(bm, geom=spare, context="VERTS")
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    piece = jk.Piece(bm, "tint").flat()
    for f in piece.bm.faces:
        f.material_index = CUT
    return piece


def _delaunay(dirs):
    """Triangles (index triples) over points on a sphere: their convex hull."""
    bm = bmesh.new()
    verts = [bm.verts.new(d) for d in dirs]
    bmesh.ops.convex_hull(bm, input=verts, use_existing_faces=False)
    bm.verts.index_update()
    tris = []
    for f in bm.faces:
        index = [v.index for v in f.verts]
        tris += [(index[0], index[k], index[k + 1]) for k in range(1, len(index) - 1)]
    bm.free()
    return tris


def _crater(piece, direction, radius: float, depth: float, sides: int = 10, lip: float | None = None, peak: float = 0.0):
    """Inset a shallow crater: a raised rim, a sloping wall ring and a flat floor."""
    bm = piece.bm
    c = Vector(direction).normalized()
    u, v, _ = _perp(c)
    lip = radius * 0.06 if lip is None else lip

    def polar(p):
        h = p.dot(c)
        q = p - c * h
        return q.length, math.atan2(q.dot(v), q.dot(u)) % math.tau, h

    doomed = [x for x in bm.verts if x.co.dot(c) > 0 and polar(x.co)[0] < radius * 0.86]
    if not doomed:
        raise RuntimeError(f"crater at {tuple(c)} catches no vertex")
    bmesh.ops.delete(bm, geom=doomed, context="VERTS")
    rim = sorted({x for e in bm.edges if e.is_boundary for x in e.verts}, key=lambda x: polar(x.co)[1])
    for x, y in zip(rim, rim[1:] + rim[:1]):
        edge = bm.edges.get((x, y))
        if edge is None or not edge.is_boundary:
            raise RuntimeError(f"crater at {tuple(round(k, 2) for k in c)} has a tangled rim")
    heights = []
    for x in rim:
        _, phi, _ = polar(x.co)
        r = x.co.length + lip
        rr = radius * (1 + 0.06 * _n(x.co, 7, 1.3))
        h = math.sqrt(max(r * r - rr * rr, 0.0))
        x.co = c * h + (u * math.cos(phi) + v * math.sin(phi)) * rr
        heights.append(h)
    top = sum(heights) / len(heights)

    def ring(count, rr, h, turn):
        ts = [((i + turn) / count) % 1.0 for i in range(count)]
        ts.sort()
        return [bm.verts.new(c * h + (u * math.cos(t * math.tau) + v * math.sin(t * math.tau)) * rr) for t in ts], ts

    def add(tris, role):
        for tri in tris:
            f = bm.faces.new(tri)
            f.normal_update()
            if f.normal.dot(c) < 0:
                f.normal_flip()
            f.material_index = role

    wall, wall_t = ring(sides, radius * 0.66, top - depth * 0.88, 0.3)
    floor, floor_t = ring(max(5, sides * 2 // 3), radius * 0.3, top - depth, 0.7)
    centre = bm.verts.new(c * (top - depth + peak))
    tris = []
    _zip(tris, rim, [polar(x.co)[1] / math.tau for x in rim], wall, wall_t)
    add(tris, BOWL)
    tris = []
    _zip(tris, wall, wall_t, floor, floor_t)
    tris += [(floor[i], floor[(i + 1) % len(floor)], centre) for i in range(len(floor))]
    add(tris, FLOOR)
    for x in rim:
        for f in x.link_faces:
            if f.material_index in (ROCK, CUT, SLAB):
                f.material_index = APRON
    bm.normal_update()
    return piece


def _closest(line, p):
    """Nearest point of a polyline: (distance, arc length there, point, tangent)."""
    best = (1e9, 0.0, line[0], Vector((1, 0, 0)))
    travelled = 0.0
    for a, b in zip(line, line[1:]):
        ab = b - a
        length = ab.length
        t = max(0.0, min(1.0, (p - a).dot(ab) / (length * length)))
        q = a + ab * t
        d = (p - q).length
        if d < best[0]:
            best = (d, travelled + length * t, q, ab / length)
        travelled += length
    return best


def _along(line, values, s: float):
    """A direction given at each point of a polyline, blended at arc length `s` along it."""
    travelled = 0.0
    for k, (a, b) in enumerate(zip(line, line[1:])):
        step = (b - a).length
        if travelled + step >= s or k == len(line) - 2:
            t = max(0.0, min(1.0, (s - travelled) / step))
            return values[k].lerp(values[k + 1], t).normalized()
        travelled += step
    return values[-1]


def _walk(bm, start, end, rnd, wiggle: float, blocked, max_steps: int):
    """A path of mesh vertices from near `start` toward `end`, zigzagging along edges."""
    e = Vector(end).normalized()
    s = Vector(start).normalized()
    cur = max(bm.verts, key=lambda x: x.co.normalized().dot(s))
    path = [cur]
    heading = None
    for _ in range(max_steps):
        left = cur.co.normalized().angle(e)
        options = []
        reach = 0.0
        for edge in cur.link_edges:
            other = edge.other_vert(cur)
            step = other.co - cur.co
            reach = max(reach, step.length / cur.co.length)
            if other in path or (blocked is not None and blocked(other.co)):
                continue
            if heading is not None and step.normalized().dot(heading) < 0.2:
                continue
            if any(k.other_vert(other) in path[:-1] for k in other.link_edges):
                continue
            options.append((left - other.co.normalized().angle(e), other, step.normalized()))
        options.sort(key=lambda o: -o[0])
        if not options or options[0][0] <= 0:
            break
        pick = options[0]
        if len(options) > 1 and options[1][0] > 0.35 * options[0][0] and rnd.random() < wiggle:
            pick = options[1]
        path.append(pick[1])
        cur, heading = pick[1], pick[2]
        if cur.co.normalized().angle(e) < reach * 0.5:
            break
    return path


def _crack(
    piece,
    start,
    end,
    seed: int,
    width: float,
    depth: float,
    vein: bool = True,
    wiggle: float = 0.3,
    blocked=None,
    ridge: float = 0.45,
    max_steps: int = 60,
    path=None,
    normals: bool = False,
):
    """Carve a crack along mesh edges from `start` toward `end` (directions from the origin).

    The edge path is bevelled into a strip and its inner loops are pushed down, tapering to
    nothing at both ends. With `vein`, the faces at the bottom are returned so the caller can
    lift them out as a glowing inlay. Returns {line, faces, half, total, ups}.

    `path` gives the vertices to follow instead of walking between `start` and `end`. On a body
    that is far from round, `normals` cuts the groove along the surface normal, not toward the
    origin; `ups` then holds the outward direction at each point of the line.
    """
    bm = piece.bm
    if path is None:
        path = _walk(bm, start, end, random.Random(seed), wiggle, blocked, max_steps)
    if len(path) < 3:
        raise RuntimeError("crack is too short; move its ends")
    line = [x.co.copy() for x in path]
    ups = None
    if normals:
        bm.normal_update()
        ups = [x.normal.copy() for x in path]
    edges = [bm.edges.get((p, q)) for p, q in zip(path, path[1:])]
    before = set(bm.faces)
    bmesh.ops.bevel(
        bm, geom=edges, offset=width, offset_type="OFFSET", segments=4 if vein else 2,
        profile=0.5, affect="EDGES", clamp_overlap=True,
    )
    bm.normal_update()
    total = sum((b - a).length for a, b in zip(line, line[1:]))
    made = [f for f in bm.faces if f not in before]
    info = {}
    for f in made:
        for x in f.verts:
            if x not in info:
                info[x] = _closest(line, x.co)
    # The strip is every new face that hugs the path; faces merely rebuilt beside it reach far.
    strip = [f for f in made if all(info[x][0] < width * 1.6 for x in f.verts)]
    inside = set(strip)
    verts = {x for f in strip for x in f.verts}
    outer = {x for x in verts if any(g not in inside for g in x.link_faces)}
    spread = sorted(info[x][0] for x in outer if info[x][0] > width * 0.15)
    half = spread[len(spread) // 2] if spread else width
    reach = min(total * 0.32, max(width * 5, total * 0.2))
    for x in verts:
        if x in outer:
            continue
        d, s, q, _ = info[x]
        k = _smooth(min(s, total - s) / reach)
        centre = d < half * 0.28
        if not centre:
            x.co = q + (x.co - q) * (0.3 + 0.7 * k)
        out = _along(line, ups, s) if ups else x.co.normalized()
        x.co -= out * depth * k * ((1 - ridge) if (vein and centre) else 1.0)
    seam = [f for f in strip if all(x not in outer or info[x][0] < half * 0.28 for x in f.verts)] if vein else []
    for f in strip:
        f.material_index = WALL
    bm.normal_update()
    return dict(line=line, faces=seam, half=half, total=total, strip=len(strip), made=len(made), ups=ups)


def _detach(piece, faces, part: str):
    """Lift faces out of a piece into a new piece of another part. Windings are kept."""
    out = bmesh.new()
    seen = {}
    for f in faces:
        corners = []
        for x in f.verts:
            if x not in seen:
                seen[x] = out.verts.new(x.co)
            corners.append(seen[x])
        out.faces.new(corners)
    bmesh.ops.delete(piece.bm, geom=list(faces), context="FACES")
    piece.bm.normal_update()
    out.normal_update()
    return jk.Piece(out, part).flat()


def _strata(seed: int, count: int):
    """A value per stratum: mostly pale, with a few darker beds."""
    beds = (1.0, 0.95, 1.0, 0.86, 0.97, 1.0, 0.9, 1.0, 0.8, 0.96, 1.0, 0.88, 0.99, 0.93)
    return [beds[(k * 5 + seed) % len(beds)] for k in range(count)]


def _paint_rock(
    piece,
    axis,
    thetas,
    seed: int,
    radius: float = 6.0,
    floor: float = 0.84,
    wall: float = 0.62,
    facet: float = 0.07,
    beds=None,
    dust: float = 0.3,
    slab: float = 0.99,
    bed_of=None,
):
    """Value-paint a tint rock: strata by ring, pale crater rims, deeper bowls and cracks.

    Dust evens out the undisturbed surface, so the beds only hint there; where the rock is cut
    back to a flat facet (`CUT`) or broken open (`BREAK`) they read at full strength.
    `bed_of(face)` names a face's bed itself, for a body whose beds are not rings about `axis`.
    """
    w = Vector(axis).normalized()
    beds = _strata(seed, len(thetas) + 1) if beds is None else beds
    grain = 3.3 / radius

    def pick(f):
        centre = f.calc_center_median()
        role = f.material_index
        if role == WALL:
            return _grey(wall)
        d = centre.normalized()
        bed = beds[sum(1 for t in thetas if d.angle(w) > t)] if bed_of is None else bed_of(f)
        if role in (CUT, BREAK):
            # A cut shows its beds, and each plane keeps a value of its own.
            value = (1.0 - (1.0 - bed) * 1.2) * (0.97 + 0.05 * _n(f.normal * 2.9, seed + 21))
        elif role == SLAB:
            value = slab
        else:
            show = _smooth((_n(d, seed + 5, 1.3) + 0.35) / 0.4)
            value = 1.0 - (1.0 - bed) * (dust + 0.45 * show)
        value *= 1.0 - facet * (0.5 + 0.7 * _n(centre, seed + 11, grain))
        if role == BREAK:
            value *= 0.68
        elif role == FLOOR:
            value = floor * (0.97 + 0.03 * bed)
        elif role == BOWL:
            value = (floor + 1.0) / 2 - 0.05
        elif role == APRON:
            value = max(value, 0.98)
        return _grey(value)

    return piece.paint(pick)


def _paint_ice(piece, seed: int, radius: float, wall="#96a2b2", floor: float = 0.85, facet: float = 0.09, tone=None):
    """Value-paint a tint ice body: bright planes, soft mottling, cool fracture lines.
    `tone(face, centre, value)` may return a colour to override a face."""
    grain = 3.3 / radius

    def pick(f):
        centre = f.calc_center_median()
        role = f.material_index
        if role == WALL:
            return wall
        d = centre.normalized()
        value = 1.0 - facet * (0.5 + 0.7 * _n(centre, seed + 11, grain))
        value *= 1.0 - 0.08 * _smooth((_n(d, seed + 3, 1.15) + 0.1) / 0.45)
        if role == FLOOR:
            value = floor
        elif role == BOWL:
            value = (floor + 1.0) / 2 - 0.03
        elif role == APRON:
            value = max(value, 0.99)
        elif role == CUT:
            value = min(1.0, value + 0.05)
        if tone is not None:
            colour = tone(f, centre, value)
            if colour is not None:
                return colour
        return _grey(value)

    return piece.paint(pick)


def _under(target, tint):
    """The paint that shows as `target` once the web app multiplies it by `tint`."""
    t, k = jk.col(target), jk.col(tint)
    return tuple(min(1.0, t[i] / max(k[i], 1e-4)) for i in range(3))


def _crystal(a, base, axis, r: float, h: float, tones=ORE, sides: int = 5, turn: float = 0.0, part: str = "glow", slim: bool = False):
    """A pointed crystal standing on `base` along `axis`, each facet in its own close tone."""
    profile = [(r * 0.8, 0), (r, h * 0.4), (0, h)] if slim else [(r * 0.7, 0), (r, h * 0.3), (r * 0.78, h * 0.7), (0, h)]
    piece = a.lathe(profile, sides, cap_bottom=False, turn=turn)

    def pick(f):
        n = f.normal
        k = int(round((math.atan2(n.y, n.x) - turn) / (math.tau / sides) - 0.5)) % sides
        if f.calc_center_median().z > h * 0.7:
            return tones[0] if k % 2 else jk.mix(tones[0], tones[1], 0.5)
        return tones[1 + (k % 2)] if k % 3 else tones[0]

    piece.paint(pick).flat().part(part).no_ao()
    q = Vector((0, 0, 1)).rotation_difference(Vector(axis).normalized())
    return piece.apply(Matrix.Translation(Vector(base)) @ q.to_matrix().to_4x4())


def _vein(a, piece, crack, crystals=(), size: float = 1.0, tones=ORE):
    """Turn a crack's bottom faces into a luminous seam, with small crystals growing out of it."""
    line = crack["line"]
    seam = _detach(piece, crack["faces"], "glow")
    total = crack["total"]

    def pick(f):
        d, s, q, tangent = _closest(line, f.calc_center_median())
        side = (f.calc_center_median() - q).dot(tangent.cross(q.normalized()))
        hot = _smooth(min(s, total - s) / (total * 0.3))
        return jk.mix(tones[2], tones[1] if side > 0 else tones[0], 0.35 + 0.65 * hot)

    # The seam lies deep in its groove; baked occlusion there would put its light out.
    a.add(seam.paint(pick).no_ao())
    for k, (where, lean) in enumerate(crystals):
        target = total * where
        travelled = 0.0
        for p, q in zip(line, line[1:]):
            step = (q - p).length
            if travelled + step >= target:
                point = p + (q - p) * ((target - travelled) / step)
                tangent = (q - p).normalized()
                break
            travelled += step
        up = _along(line, crack["ups"], target) if crack.get("ups") else point.normalized()
        side = tangent.cross(up).normalized()
        foot = point - up * 0.16 * size
        _crystal(a, foot, up + tangent * lean + side * 0.12, 0.17 * size, 0.62 * size, tones, 5, k * 0.7)
        _crystal(a, foot + tangent * 0.2 * size - side * 0.1 * size, up - tangent * 0.5 + side * 0.35, 0.115 * size, 0.4 * size, tones, 4, k + 0.4, slim=True)
        _crystal(a, foot - tangent * 0.17 * size + side * 0.13 * size, up + tangent * 0.2 - side * 0.6, 0.095 * size, 0.3 * size, tones, 4, k + 1.9, slim=True)
    return seam


def _carve(rock, radius: float, craters=(), plans=(), width: float = 0.26, depth: float = 0.24, keep=None, gap: float = 1.3, wiggle: float = 0.3):
    """Inset craters, then walk cracks between them. `craters` are (direction, radius, depth,
    sides, peak); `plans` are (start, end, seed, crystals, vein?). `keep(point)` fences a crack
    out of a region. Returns the cracks, each with its `crystals` and `vein` flag."""
    for direction, r, d, sides, peak in craters:
        _crater(rock, direction, r, d, sides, peak=peak)
    cracks = []

    def blocked(p):
        d = p.normalized()
        for direction, r, *_ in craters:
            if d.angle(Vector(direction).normalized()) < r * 1.5 / radius:
                return True
        if keep is not None and keep(p):
            return True
        return any(_closest(c["line"], p)[0] < gap for c in cracks)

    for start, end, seed, crystals, vein in plans:
        # A walk can box itself in; a different zigzag from the same ends usually gets through.
        for attempt in range(6):
            path = _walk(rock.bm, start, end, random.Random(seed + attempt * 101), wiggle, blocked, 60)
            if len(path) >= 4:
                break
        else:
            raise RuntimeError(f"no room for the crack from {start} to {end}; move its ends")
        crack = _crack(rock, start, end, seed + attempt * 101, width, depth, vein=vein, blocked=blocked, wiggle=wiggle)
        if os.environ.get("JANUS_KIT_MEASURE"):
            print(f"  crack {start} -> {end}: {len(crack['line'])} verts, {crack['total']:.2f} long, attempt {attempt}")
        cracks.append(dict(crack, crystals=crystals, vein=vein))
    return cracks


def _surface(piece, direction, far: float = 60.0):
    """Where a ray from outside, aimed at the origin along -`direction`, meets the piece."""
    d = Vector(direction).normalized()
    piece.bm.faces.ensure_lookup_table()
    hit = BVHTree.FromBMesh(piece.bm).ray_cast(d * far, -d, far)
    return hit[0]


def _measure(name: str, pieces, radius: float, stands=()):
    """Print how far the upper hemisphere strays from the stated radius, and where the surface
    lies along each direction the web app stands a prop (set JANUS_KIT_MEASURE)."""
    if not os.environ.get("JANUS_KIT_MEASURE"):
        return
    upper = [v.co.length / radius for p in pieces for v in p.bm.verts if v.co.z > 0]
    cap = [v.co.length / radius for p in pieces for v in p.bm.verts if v.co.z > 0.42 * v.co.length]
    print(
        f"MEASURE {name}: upper {min(upper):.3f}..{max(upper):.3f}  cap(>25deg) {min(cap):.3f}..{max(cap):.3f}"
    )
    for direction in stands:
        hits = [h for h in (_surface(p, direction) for p in pieces) if h is not None]
        reach = max(h.length for h in hits) / radius if hits else 0.0
        print(f"  stand {tuple(round(k, 2) for k in direction)}: surface at {reach:.3f} R (props stand at 0.92 R)")


#: Where the story sets the main asteroid and its companions b and d, in this frame and at this
#: scale (`rocks` in apps/web/app/planets/features.ts).
MAIN_AT, B_AT, D_AT = (0.0, 0.0, -0.5), (-9.0, -0.5, -2.0), (3.5, -3.5, -8.5)
_PROBE = {}


def _clearance(pieces, at):
    """Print the narrowest gap between a companion rock set at `at` and the main asteroid, and
    how far the rock reaches from the middle of the cluster (set JANUS_KIT_MEASURE)."""
    if not os.environ.get("JANUS_KIT_MEASURE"):
        return
    if "tree" not in _PROBE:
        main = jk.Asset("probe")
        asteroid_a(main)
        main.pieces[0].bm.faces.ensure_lookup_table()
        _PROBE["tree"] = BVHTree.FromBMesh(main.pieces[0].bm)
    shift = Vector(at) - Vector(MAIN_AT)
    points = [v.co for p in pieces for v in p.bm.verts]
    gap = min(_PROBE["tree"].find_nearest(p + shift)[3] for p in points)
    reach = max((p + Vector(at)).length for p in points)
    own = max(p.length for p in points)
    print(f"  gap to the main asteroid {gap:.2f}; reach from its own origin {own:.2f}, from the cluster's {reach:.2f}")


def _tally(a):
    """Print the triangles authored so far, which is what the budget counts (set JANUS_KIT_MEASURE)."""
    if os.environ.get("JANUS_KIT_MEASURE"):
        rock = [p for p in a.pieces if p._part == "tint"]
        gaps = sum(1 for p in rock for e in p.bm.edges if len(e.link_faces) != 2)
        print(f"  authored triangles {a.triangles}; open edges in the rock {gaps}")


# --------------------------------------------------------------------------------------------
# Asteroid works
# --------------------------------------------------------------------------------------------
@asset("sys-asteroid-a", tint="#857a6e", grounded=False, budget=1400)
def asteroid_a(a):
    """The main worked asteroid: a hewn potato whose flat facets show its beds, with ore veins
    climbing toward the cap where the works stand."""
    R = 6.0
    # The beds lie across the reader's view, so they read as bands and the poles sit on the limb.
    axis = (0.8, 0.1, 0.59)

    def shape(d):
        low = _smooth((0.15 - d.z) / 0.7)
        lumps = (0.07 + 0.06 * low) * _n(d, 41, 1.15) + 0.03 * _n(d, 42, 2.7)
        # A potato: long in x, a heavy chin low at the front, pinched low on the right.
        chin = 0.12 * _smooth((d.dot(Vector((-0.3, -0.62, -0.72))) - 0.25) / 0.6)
        pinch = 0.1 * _smooth((d.dot(Vector((0.7, 0.3, -0.65))) - 0.3) / 0.6)
        return _ellipsoid(d, 1.08, 0.97, 0.93) * (1 + lumps + chin - pinch)

    rock, thetas = _body(R, 33, 15, 41, axis, shape)
    _level(rock, R, 0.96, 1.07)
    _facets(rock, R, 26, 41, cut=(0.06, 0.16), top=(0.03, 0.06))
    # The left flank is cut back flat: the elongated companion rock hangs just off it.
    _chip(rock, (-0.985, -0.055, -0.164), at=5.45)
    craters = [
        ((-0.8, -0.1, -0.59), 1.7, 0.36, 12, 0.1),
        ((0.6, -0.75, -0.05), 1.15, 0.22, 10, 0.0),
        ((-0.3, 0.55, 0.78), 0.9, 0.15, 8, 0.0),
        ((0.4, 0.85, -0.3), 1.25, 0.26, 10, 0.0),
    ]
    plans = [
        ((-0.55, -0.8, -0.25), (0.3, -0.85, 0.4), 3, ((0.42, 0.2),), True),
        ((0.95, -0.25, 0.2), (0.6, 0.1, -0.8), 5, (), True),
        ((-0.2, 0.9, 0.4), (-0.75, 0.55, -0.35), 7, (), True),
        ((-0.6, -0.5, 0.62), (-0.95, -0.1, 0.25), 9, (), True),
    ]
    cracks = _carve(rock, R, craters, plans)
    beds = (1.0, 1.0, 0.91, 1.0, 0.97, 0.85, 1.0, 1.0, 0.93, 1.0, 0.88, 0.98, 1.0, 0.91, 1.0, 1.0)
    _paint_rock(rock, axis, thetas, 2, beds=beds, dust=0.35)
    a.add(rock)
    for crack in cracks:
        _vein(a, rock, crack, crack["crystals"], 1.15)
    _measure("sys-asteroid-a", [rock], R, [(0.214, -0.471, 0.856)])
    if os.environ.get("JANUS_KIT_MEASURE"):
        for c in cracks:
            print("  crack", len(c["line"]), "verts", round(c["total"], 2), "long, half", round(c["half"], 3), "strip", c["strip"], "made", c["made"], "seam", len(c["faces"]))


def _elbow(start, first, turn: float, second, soft: float):
    """A bent line: from `start` along `first`, turning at arc length `turn` (rounded over
    `soft` either side) and on along `second`. Returns point(u)."""
    start, first, second = Vector(start), Vector(first).normalized(), Vector(second).normalized()
    corner = start + first * turn

    def point(u: float):
        if u <= turn - soft:
            return start + first * u
        if u >= turn + soft:
            return corner + second * (u - turn)
        k = (u - turn + soft) / (2 * soft)
        a, b = corner - first * soft, corner + second * soft
        return a.lerp(corner, k).lerp(corner.lerp(b, k), k)

    return point


def _limb(stations, step: float, seed: int, lumps: float = 0.06, grain: float = 0.4, across=(1, 0, 0)):
    """A faceted limb through `stations`: (centre, radius across, radius the other way) from tip
    to tip, a radius of zero closing it in a point. Each ring of vertices stands square to the
    limb and none twists, so the beds between rings read as bands across it.

    Returns (piece, planes): `planes` holds each ring's (centre, direction along the limb), and
    every face stores its bed, counted from the first tip, in the piece's `bed` layer.
    """
    rnd = random.Random(seed)
    centres = [Vector(station[0]) for station in stations]
    last = len(stations) - 1
    verts, faces, beds, planes, loops = [], [], [], [], []
    side = Vector(across)
    for i, station in enumerate(stations):
        c = centres[i]
        tangent = (centres[min(i + 1, last)] - centres[max(i - 1, 0)]).normalized()
        side = (side - tangent * side.dot(tangent)).normalized()
        other = tangent.cross(side)
        rx, ry = station[1], station[2]
        if rx <= 0:
            loops.append(len(verts))
            verts.append(c)
            continue
        planes.append((c, tangent))
        count = max(5, round(math.pi * (rx + ry) / step))
        phase = rnd.random()
        ts = sorted(((k + phase + (rnd.random() - 0.5) * 0.3) / count) % 1.0 for k in range(count))
        index = []
        for t in ts:
            d = side * (math.cos(t * math.tau) * rx) + other * (math.sin(t * math.tau) * ry)
            swell = 1 + lumps * _n(c + d, seed, grain) + lumps * 0.5 * _n(c + d, seed + 1, grain * 2.3)
            index.append(len(verts))
            verts.append(c + d * swell)
        loops.append((index, ts))
    for bed, (a, b) in enumerate(zip(loops, loops[1:])):
        before = len(faces)
        if isinstance(a, int):
            ring = b[0]
            faces += [(a, ring[k], ring[(k + 1) % len(ring)]) for k in range(len(ring))]
        elif isinstance(b, int):
            ring = a[0]
            faces += [(b, ring[(k + 1) % len(ring)], ring[k]) for k in range(len(ring))]
        else:
            _zip(faces, a[0], a[1], b[0], b[1])
        beds += [bed] * (len(faces) - before)
    piece = jk.raw(verts, faces).flat().part("tint")
    layer = piece.bm.faces.layers.int.new("bed")
    piece.layer = piece.bm.loops.layers.color.get("c")
    for f, bed in zip(piece.bm.faces, beds):
        f[layer] = bed
    return piece, planes


def _saw(piece, normal, at: float, role: int = BREAK):
    """Saw a closed piece off flat: everything beyond the plane `at` along `normal` goes, and
    the cut is closed with a face of `role`."""
    n = Vector(normal).normalized()
    bm = piece.bm
    cut = bmesh.ops.bisect_plane(
        bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-5,
        plane_co=n * at, plane_no=n, clear_outer=True,
    )
    edges = [g for g in cut["geom_cut"] if isinstance(g, bmesh.types.BMEdge)]
    for f in bmesh.ops.holes_fill(bm, edges=edges, sides=0)["faces"]:
        f.material_index = role
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    return piece


def _score(piece, role: int, planes):
    """Divide the faces of `role` along each of `planes` (point, normal), leaving the rest of
    the piece alone: a sawn or broken face gets an edge wherever a bed or a fold crosses it."""
    bm = piece.bm
    for point, normal in planes:
        faces = [f for f in bm.faces if f.material_index == role]
        geom = faces + list({e for f in faces for e in f.edges}) + list({v for f in faces for v in f.verts})
        bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-5, plane_co=Vector(point), plane_no=Vector(normal))
    bm.normal_update()
    return [f for f in bm.faces if f.material_index == role]


def _trace(piece, points, avoid=None):
    """Mesh vertices along the shortest edges through the vertices nearest `points`: the line
    a fracture takes. `avoid(point)` fences vertices off."""
    bm = piece.bm
    free = [v for v in bm.verts if avoid is None or not avoid(v.co)]
    stops = [min(free, key=lambda v: (v.co - Vector(p)).length_squared) for p in points]
    path = [stops[0]]
    for start, goal in zip(stops, stops[1:]):
        if goal is start:
            continue
        used = set(path[:-1])
        best = {start: 0.0}
        came = {}
        frontier = [(0.0, 0, start)]
        tick = 0
        while frontier:
            dist, _, v = heapq.heappop(frontier)
            if v is goal:
                break
            if dist > best.get(v, 1e18):
                continue
            for edge in v.link_edges:
                w = edge.other_vert(v)
                if w in used or (avoid is not None and w is not goal and avoid(w.co)):
                    continue
                reach = dist + edge.calc_length()
                if reach < best.get(w, 1e18):
                    best[w] = reach
                    came[w] = v
                    tick += 1
                    heapq.heappush(frontier, (reach, tick, w))
        if goal not in came:
            raise RuntimeError("no way through for the fracture; move its points")
        leg = [goal]
        while leg[-1] is not start:
            leg.append(came[leg[-1]])
        path += leg[::-1][1:]
    return path


def _boulder(a, centre, size: float, seed: int, squash=(1.0, 1.0, 0.8), value: float = 0.95):
    """A loose block: a small faceted hull, each plane in its own close value."""
    rnd = random.Random(seed)
    points = []
    for d in _scatter(11, seed, 1.2):
        points.append(Vector(centre) + Vector((d.x * squash[0], d.y * squash[1], d.z * squash[2])) * size * rnd.uniform(0.82, 1.1))
    block = _hull(points)
    block.paint(lambda f: _grey(value * (0.9 + 0.12 * _n(f.normal * 2.3, seed))))
    return a.add(block)


def _bench(piece, role: int, up, back, at: float, rise: float, lean: float):
    """Leave a step standing at the back of a sawn floor. The part of the `role` face that lies
    beyond `at` along `back` is raised by `rise` along `up`, and its outer edge leans in by
    `lean`, so the floor reads as cut down into the rock. Returns (riser faces, top face)."""
    up, back = Vector(up).normalized(), Vector(back).normalized()
    bm = piece.bm
    parts = _score(piece, role, [(back * at, back)])
    floor = max(parts, key=lambda f: f.calc_area())
    middle = floor.calc_center_median()
    behind = [f for f in parts if f is not floor and (f.calc_center_median() - middle).dot(back) > 0]
    if len(behind) != 1:
        raise RuntimeError("the bench needs one piece of floor behind its line; move the line")
    top = bmesh.ops.extrude_discrete_faces(bm, faces=behind)["faces"][0]
    line = up.cross(back)
    for v in top.verts:
        v.co += up * rise
        if v.co.dot(back) - at > 1e-4:
            flat = v.co - middle
            flat -= up * flat.dot(up)
            v.co -= flat.normalized() * lean
        else:
            # The ends of the riser lean in along it, or they would stand up as horns.
            t = (v.co - middle).dot(line)
            v.co -= line * math.copysign(min(lean, abs(t) * 0.4), t)
    risers = []
    for edge in top.edges:
        for f in edge.link_faces:
            if f is not top:
                f.material_index = SLAB if all(abs(v.co.dot(back) - at) < 1e-3 for v in f.verts) else ROCK
                risers.append(f)
    top.material_index = ROCK
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    return risers, top


def _dent(piece, centre, radius: float, depth: float, toward):
    """Press a smooth hollow into a piece: `depth` at `centre`, fading out by `radius`."""
    centre, toward = Vector(centre), Vector(toward).normalized()
    for v in piece.bm.verts:
        k = _smooth(1 - (v.co - centre).length / radius)
        if k > 0:
            v.co -= toward * (depth * k)
    piece.bm.normal_update()
    return piece


@asset("sys-asteroid-b", tint="#857a6e", grounded=False, budget=700)
def asteroid_b(a):
    """Elongated: a bent peanut of bedded rock, two knuckles and a waist, four times as long as
    the waist is thick. A terrace is sawn into the upper knuckle for the rig, with a step left
    standing behind it. A fracture carrying the ore runs down the front and round the waist,
    the lower end has sheared off across the beds, and loose blocks lie in an old crater on
    the far side.

    The rig's place fixes the top of the rock, so the rest hangs below it: the origin lies
    inside the upper knuckle, not at the middle of the whole."""
    R = 3.6
    s = Vector(STAND).normalized()
    back = Vector((0, 1, 0)) - s * s.y
    back.normalize()
    right = back.cross(s)
    floor = 0.945 * R
    upper = Vector((-0.47, 0.20, -0.86)).normalized()
    lower = Vector((0.45, -0.25, -0.86)).normalized()
    turn = 3.7
    # The limb hangs from the terrace. It leans away to the left as it goes down, so it starts
    # a little to the right of the rig, which leaves floor all round the rig's feet.
    spine = _elbow(s * floor + back * 0.1 + right * 0.3, upper, turn, lower, 1.3)
    # Arc length from the terrace, and the limb's radius there: knuckle, waist, knuckle.
    profile = (
        (-1.0, 0.0), (-0.55, 1.35), (0.0, 1.9), (0.65, 2.08), (1.45, 2.1), (2.2, 1.94), (2.9, 1.62),
        (3.5, 1.34), (4.1, 1.22), (4.7, 1.24), (5.3, 1.36), (5.9, 1.54), (6.5, 1.7), (7.1, 1.82),
        (7.7, 1.88), (8.3, 1.82), (8.85, 1.62), (9.35, 1.3), (9.75, 0.85), (10.05, 0.0),
    )

    def girth(u):
        for (u0, r0), (u1, r1) in zip(profile, profile[1:]):
            if u <= u1:
                return r0 + (r1 - r0) * max(0.0, (u - u0) / (u1 - u0))
        return 0.0

    def along(u):
        return (spine(u + 0.3) - spine(u - 0.3)).normalized()

    def skin(u, toward):
        """A point on the limb's skin at `u`, on the side that faces `toward`."""
        t = along(u)
        d = Vector(toward)
        return spine(u) + (d - t * d.dot(t)).normalized() * girth(u)

    rock, planes = _limb([(spine(u), r, r * 0.94) for u, r in profile], 0.95, 61, lumps=0.075)
    bed = rock.bm.faces.layers.int["bed"]
    # Hewn planes all the way down, each cut about the limb's own middle.
    rnd = random.Random(61)
    count = 14
    for k in range(count):
        u = 0.3 + 8.7 * ((k * 5) % count + rnd.random()) / count
        c, t = spine(u), along(u)
        e1, e2, _ = _perp(t)
        angle = k * 2.4 + rnd.uniform(-0.4, 0.4)
        n = e1 * math.cos(angle) + e2 * math.sin(angle) + t * rnd.uniform(-0.3, 0.3)
        _chip(rock, n, rnd.uniform(0.16, 0.36), centre=c, only=lambda p, c=c: (p - c).length < 2.5)
    # The upper knuckle is squared off, so the terrace has straight edges.
    head = spine(0.9)
    for bearing, depth in ((15, 0.26), (80, 0.24), (150, 0.34), (215, 0.24), (285, 0.3)):
        n = right * math.cos(math.radians(bearing)) + back * math.sin(math.radians(bearing)) + s * 0.22
        _chip(rock, n, depth, centre=head, only=lambda p: (p - head).length < 2.9)
    # Both knuckles are cut back to planes on the side of the main rock next door, where its
    # flank and its chin come nearest, which keeps the old gap between the two.
    toward_main = (Vector(MAIN_AT) - Vector(B_AT)).normalized()
    _chip(rock, toward_main, centre=head, at=2.3 - toward_main.dot(head))
    toward_chin = Vector((0.80, -0.08, 0.59)).normalized()
    foot = spine(6.6)
    _chip(rock, toward_chin, centre=foot, at=0.2 - toward_chin.dot(foot), only=lambda p: (p - foot).length < 2.8)
    # The crook of the bend is pressed in, which sharpens the waist on that side.
    crook = (lower - upper).normalized()
    seat = spine(turn) + crook * (girth(turn) - 0.34)
    _dent(rock, seat + crook * 0.4, 1.8, 0.44, crook)
    # One old crater on the far side of the upper knuckle, set about the knuckle's own middle.
    knuckle = spine(1.4)
    hollow = Vector((-0.45, 0.85, 0.25)).normalized()
    rock.move(*(-knuckle))
    _crater(rock, hollow, 0.95, 0.2, 9)
    bowl = _surface(rock, hollow) + knuckle
    rock.move(*knuckle)
    # The terrace for the rig, with a step left standing behind it. Then the sheared end, broken
    # along two planes, which shows a stripe for every bed it cuts.
    _saw(rock, s, floor, SLAB)
    _bench(rock, SLAB, s, back, 1.35, 0.34, 0.3)
    shear = Vector((0.375, -0.757, -0.539)).normalized()
    _saw(rock, shear, shear.dot(spine(8.9)), BREAK)
    snap = Vector((-0.3, -0.8, -0.52)).normalized()
    _saw(rock, snap, snap.dot(spine(8.9) + shear * 0.1 - Vector((0.95, 0, 0))), BREAK)
    for f in _score(rock, BREAK, planes[10:]):
        centre = f.calc_center_median()
        f[bed] = sum(1 for c, t in planes if (centre - c).dot(t) > 0)
    # The fracture: from under the terrace's lip down the front, round the waist, and along
    # the flank of the lower knuckle. It keeps off the terrace, the sheared end and the crook.
    edge = lambda p: p.dot(s) > floor - 0.3 or p.dot(shear) > shear.dot(spine(8.9)) - 0.5 or (p - seat).length < 1.2
    path = _trace(
        rock,
        [skin(0.8, (0.15, -1, 0)), skin(2.4, (0, -1, 0)), skin(4.0, (-0.3, -1, 0)), skin(5.5, (-0.6, -0.8, 0)), skin(7.0, (-0.9, -0.4, 0.2))],
        avoid=edge,
    )
    crack = _crack(rock, None, None, 4, 0.15, 0.17, path=path, normals=True)
    beds = _strata(4, len(profile))
    _paint_rock(rock, s, (), 4, R, beds=beds, dust=0.5, bed_of=lambda f: beds[f[bed] % len(beds)])
    stripes = (0.6, 0.84, 0.54, 0.76, 0.62, 0.9, 0.56, 0.8)
    rock.paint(lambda f: _grey(stripes[f[bed] % len(stripes)]) if f.material_index == BREAK else None)
    a.add(rock)
    _vein(a, rock, crack, ((0.3, 0.15),), 0.62)
    # Loose blocks lying in the old crater.
    e1, e2, _ = _perp(hollow)
    _boulder(a, bowl + hollow * 0.1 + e1 * 0.14, 0.27, 5, value=1.0)
    _boulder(a, bowl + hollow * 0.08 - e1 * 0.26 + e2 * 0.16, 0.17, 8, value=0.9)
    _measure("sys-asteroid-b", [rock], R, [STAND])
    if os.environ.get("JANUS_KIT_MEASURE"):
        deck = max((f for f in rock.bm.faces if f.material_index == SLAB), key=lambda f: f.calc_area())
        rim = [v.co - s * floor for v in deck.verts]
        edges = [(a_ + (b_ - a_) * max(0.0, min(1.0, -a_.dot(b_ - a_) / (b_ - a_).length_squared))).length for a_, b_ in zip(rim, rim[1:] + rim[:1])]
        print(f"  terrace: {deck.calc_area():.1f} square, its edge {min(edges):.2f} to {max(p.length for p in rim):.2f} from the rig's middle")
    _clearance([rock], B_AT)
    _tally(a)


@asset("sys-asteroid-c", tint="#857a6e", grounded=False, budget=700)
def asteroid_c(a):
    """Cratered: a round, battered rock that is mostly rims and bowls."""
    R = 3.2
    axis = (-0.6, 0.15, 0.79)

    def shape(d):
        return _ellipsoid(d, 1.03, 0.98, 0.94) * (1 + 0.06 * _n(d, 51, 1.3) + 0.03 * _n(d, 52, 2.9))

    rock, thetas = _body(R, 23, 10, 51, axis, shape)
    _level(rock, R, 0.96, 1.06)
    _facets(rock, R, 16, 51, cut=(0.05, 0.11), top=(0.03, 0.05))
    # Nothing bulges toward the main rock next door.
    _chip(rock, (-0.925, -0.243, -0.292), at=0.9 * R)
    craters = [
        ((-0.62, -0.7, -0.35), 1.4, 0.34, 11, 0.12),
        ((0.88, -0.4, 0.25), 0.9, 0.2, 9, 0.0),
        ((0.3, -0.92, -0.25), 0.95, 0.22, 9, 0.0),
        ((-0.7, 0.2, 0.68), 0.85, 0.17, 8, 0.0),
        ((0.35, 0.9, 0.25), 1.0, 0.22, 9, 0.0),
        ((-0.2, 0.35, -0.92), 0.95, 0.2, 9, 0.0),
    ]
    plans = [((-0.55, -0.68, 0.5), (0.12, -0.97, 0.2), 6, (), True)]
    cracks = _carve(rock, R, craters, plans, 0.2, 0.18)
    _paint_rock(rock, axis, thetas, 7, R)
    a.add(rock)
    for crack in cracks:
        _vein(a, rock, crack)
    _measure("sys-asteroid-c", [rock], R, [STAND])


def _cleave(piece, normal, offset: float, across, folds):
    """Break a closed piece in two along a folded plane: (the part behind it, the part beyond).

    The break lies `offset` along `normal` and is creased along lines square to `across`:
    `folds` are (distance along `across`, height) pairs, straight between them and level
    outside. Both parts get the same creases, so the two faces still fit each other, and each
    is left as flat facets of role `BREAK`. Returns (behind, beyond, point): `point(t, w)` is
    the place on the unbroken break `t` along `across` and `w` along the creases.
    """
    n = Vector(normal).normalized()
    r = Vector(across)
    r = (r - n * r.dot(n)).normalized()
    q = n.cross(r)

    def height(t):
        if t <= folds[0][0]:
            return folds[0][1]
        for (t0, h0), (t1, h1) in zip(folds, folds[1:]):
            if t <= t1:
                return h0 + (h1 - h0) * (t - t0) / (t1 - t0)
        return folds[-1][1]

    halves = []
    for beyond in (False, True):
        bm = piece.bm.copy()
        # Flatten the creases out, cut straight, score the cut along each crease, fold back.
        for v in bm.verts:
            v.co -= n * height(v.co.dot(r))
        cut = bmesh.ops.bisect_plane(
            bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-5,
            plane_co=n * offset, plane_no=n, clear_outer=not beyond, clear_inner=beyond,
        )
        edges = [g for g in cut["geom_cut"] if isinstance(g, bmesh.types.BMEdge)]
        for f in bmesh.ops.holes_fill(bm, edges=edges, sides=0)["faces"]:
            f.material_index = BREAK
        half = jk.Piece(bm, piece._part).flat()
        _score(half, BREAK, [(r * t, r) for t, _ in folds])
        for v in bm.verts:
            v.co += n * height(v.co.dot(r))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        bm.normal_update()
        halves.append(half)
    return halves[0], halves[1], lambda t, w: n * (offset + height(t)) + r * t + q * w


def _fleck(a, base, axis, size: float, turn: float = 0.0):
    """A grain of ore bedded in a broken face: a low three-sided point."""
    return _crystal(a, base, axis, size * 0.62, size, ORE, 3, turn, slim=True)


@asset("sys-asteroid-d", tint="#857a6e", grounded=False, budget=500)
def asteroid_d(a):
    """Split: an egg of rock broken through along a steep, creased face, so its two parts stand
    side by side. The part that carries the rig stays put. The other has come away: opened
    like a book toward the reader, turned a little on the break and slipped down along it, so
    the creases and the outlines no longer meet. Both faces show the darker interior with
    flecks of ore bedded in it, and chips still hang in the gap."""
    R = 2.4
    axis = (0.5, 0.45, 0.74)
    # The break climbs from low on the left to high on the right, well clear of the rig, with
    # two creases across it. The part beyond it, up and to the left, keeps the rig.
    normal = Vector((-0.91, 0.08, 0.40)).normalized()
    rise = Vector((0.40, 0.0, 0.91))
    offset = -0.42 * R
    folds = ((-3.0, 0.09), (-0.6, -0.12), (0.45, 0.16), (3.0, -0.1))

    def shape(d):
        # An egg: round where the rig stands, drawn out on the side that comes away.
        long = 1 + 0.42 * _smooth((-d.dot(normal) - 0.25) / 0.65)
        return _ellipsoid(d, 1.06, 0.96, 0.95) * long * (1 + 0.07 * _n(d, 71, 1.4) + 0.03 * _n(d, 72, 3.0))

    rock, thetas = _body(R, 19, 8, 71, axis, shape)
    _level(rock, R, 0.96, 1.06)
    _facets(rock, R, 14, 71, cut=(0.06, 0.13), top=(0.03, 0.05))
    _crater(rock, (-0.9, -0.42, 0.1), 0.7, 0.15, 8)
    off, keep, point = _cleave(rock, normal, offset, rise, folds)
    rock.bm.free()
    rise = (rise - normal * rise.dot(normal)).normalized()
    front = rise.cross(normal)
    if front.y > 0:
        front = -front
    tones = (0.5, 0.62, 0.44)

    def interior(f):
        if f.material_index != BREAK:
            return None
        t = f.calc_center_median().dot(rise)
        k = sum(1 for fold, _ in folds[1:-1] if t > fold)
        return _grey(tones[k] * (0.97 + 0.06 * _n(f.calc_center_median(), 9, 0.9)))

    for part in (keep, off):
        _paint_rock(part, axis, thetas, 9, R)
        part.paint(interior)
    # The loose part has come away: opened about a hinge low at the back, turned on the break,
    # slid toward the reader and slipped down along the break.
    wide = (front * 0.75 + rise * 0.66).normalized()
    middle = normal * offset
    hinge = middle - wide * (0.95 * R)
    turn = normal.cross(wide)
    opened = math.radians(6.5)
    if (Matrix.Rotation(opened, 4, turn) @ wide).dot(normal) > 0:
        opened = -opened

    def about(pivot, angle, direction):
        return Matrix.Translation(pivot) @ Matrix.Rotation(angle, 4, direction) @ Matrix.Translation(-pivot)

    adrift = (
        Matrix.Translation(-normal * 0.36 + front * 0.35 - rise * 0.55)
        @ about(hinge, opened, turn)
        @ about(middle, math.radians(11), normal)
    )
    spin = adrift.to_3x3()
    off.apply(adrift)
    a.add(keep)
    a.add(off)

    def facing(t):
        """The outward direction of the loose part's broken face at `t` along the rise."""
        for (t0, h0), (t1, h1) in zip(folds, folds[1:]):
            if t <= t1:
                return (normal - rise * ((h1 - h0) / (t1 - t0))).normalized()
        return normal

    # Ore flecks bedded in both faces.
    for k, (t, w, size, loose) in enumerate((
        (1.3, 1.1, 0.2, True), (-0.1, 1.45, 0.16, True), (-1.35, 0.6, 0.18, True), (-1.95, -0.5, 0.2, True),
        (1.5, 0.3, 0.17, False), (-0.2, -0.9, 0.2, False),
    )):
        base, out = point(t, 0) + front * w, facing(t)
        if loose:
            _fleck(a, adrift @ (base - out * 0.03), spin @ out, size, k * 1.3)
        else:
            _fleck(a, base + out * 0.03, -out, size, k * 1.3)
    # Chips still hanging in the gap.
    rnd = random.Random(7)
    for t, w, size in ((1.75, 1.7, 0.24), (-1.2, 2.0, 0.18), (-1.9, -1.3, 0.15)):
        where = point(t, 0) + front * w
        where = (where + adrift @ where) / 2
        points = [where + Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))).normalized() * size * rnd.uniform(0.7, 1.3) for _ in range(7)]
        a.add(_paint_rock(_hull(points), axis, thetas, 9, R))
    _measure("sys-asteroid-d", [keep], R, [STAND])
    if os.environ.get("JANUS_KIT_MEASURE"):
        stand = Vector(STAND).normalized()
        near = min(v.co.normalized().angle(stand) for f in keep.bm.faces if f.material_index == BREAK for v in f.verts)
        print(f"  the break comes within {math.degrees(near):.0f} degrees of the rig")
    _clearance([keep, off], D_AT)
    _tally(a)


@asset("sys-asteroid-e", tint="#857a6e", grounded=False, budget=400)
def asteroid_e(a):
    """Flat: a slab of bedded rock, its edge stepping back layer by layer, one corner gone."""
    R = 2.0
    outline = [(1.3, -0.05), (0.95, 0.62), (0.2, 0.95), (-0.75, 0.78), (-1.22, 0.1), (-0.9, -0.7), (0.3, -0.9)]
    n = len(outline)
    # The edge from the top face down: (inset, inset where the soft bed is worn back, height,
    # value of the bed below this line). The soft bed is worn back on some sides only.
    steps = (
        (0.2, 0.2, 0.34, 1.0), (0.05, 0.05, 0.29, 0.94), (0.0, 0.0, 0.14, 0.84), (0.0, 0.1, 0.11, 0.8),
        (0.0, 0.08, -0.02, 0.9), (-0.01, -0.01, -0.05, 0.96), (0.03, 0.03, -0.2, 0.82), (0.2, 0.2, -0.3, 0.74),
    )
    worn = (1.0, 0.1, 0.8, 0.0, 1.0, 0.4, 0.05)
    verts, faces, values = [], [], []
    for k, (inset, deep, z, _) in enumerate(steps):
        for i, (p, q) in enumerate(zip(_inset(outline, inset), _inset(outline, deep))):
            p = p + (q - p) * worn[i]
            # The slab thins toward one side and no bed runs quite true.
            loose = 0.05 if k in (0, len(steps) - 1) else 0.08
            wobble = Vector((_n((p.x, p.y, k * 0.7), 93, 1.7), _n((p.y, p.x, k * 0.7), 94, 1.7))) * loose
            wedge = 1 + 0.22 * p.x + 0.08 * p.y
            lift = 0.03 * _n((p.x * 2, p.y * 2, k), 96) if k < len(steps) - 1 else 0.0
            verts.append(((p.x + wobble.x) * R, (p.y + wobble.y) * R, (z * wedge + lift) * R))
    # The face is a few broad planes meeting off-centre.
    apex = len(steps) * n
    for i in range(n):
        faces.append((i, (i + 1) % n, apex))
        values.append(0.97 + 0.03 * math.cos(i * 2.4))
    for k in range(len(steps) - 1):
        for i in range(n):
            j = (i + 1) % n
            faces.append((k * n + i, (k + 1) * n + i, (k + 1) * n + j, k * n + j))
            values.append(steps[k][3] * (0.97 + 0.05 * _n((i * 1.3, k * 0.9, 0.0), 95)))
    last = (len(steps) - 1) * n
    for i in range(n):
        faces.append((last + (i + 1) % n, last + i, apex + 1))
        values.append(0.72 + 0.04 * math.cos(i * 1.9))
    verts.append((0.22 * R, -0.12 * R, (0.34 * 1.05 + 0.035) * R))
    verts.append((-0.15 * R, 0.1 * R, -0.4 * R))
    slab = jk.raw(verts, faces).flat().part("tint")
    for f, value in zip(slab.bm.faces, values):
        c = _grey(value)
        for loop in f.loops:
            loop[slab.layer] = (c[0], c[1], c[2], 1.0)
    # One corner has broken away along a slanting plane.
    bm = slab.bm
    normal = Vector((0.72, -0.6, 0.34)).normalized()
    cut = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-5, plane_co=normal * (0.8 * R), plane_no=normal, clear_outer=True)
    caps = bmesh.ops.holes_fill(bm, edges=[g for g in cut["geom_cut"] if isinstance(g, bmesh.types.BMEdge)], sides=0)["faces"]
    for f in caps:
        c = _grey(0.8)
        for loop in f.loops:
            loop[slab.layer] = (c[0], c[1], c[2], 1.0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    # Tipped so the reader sees both the face and the layered edge.
    tip = Vector((0, 0, 1)).rotation_difference(Vector((0.3, -0.55, 0.78)).normalized())
    slab.apply(tip.to_matrix().to_4x4() @ Matrix.Rotation(math.radians(24), 4, "Z"))
    a.add(slab)


@asset("sys-asteroid-f", tint="#857a6e", grounded=False, budget=300)
def asteroid_f(a):
    """Shard: a sharp splinter, all fracture planes."""
    R = 1.5
    points = [
        (0.02, 0.04, 1.5),
        (0.4, 0.1, 0.8), (-0.28, 0.2, 0.66), (-0.1, -0.26, 0.74), (0.28, -0.2, 0.94),
        (0.6, 0.04, 0.0), (0.2, 0.33, 0.1), (-0.5, 0.24, -0.06), (-0.45, -0.2, 0.16), (0.15, -0.32, -0.1),
        (0.42, 0.1, -0.76), (-0.26, 0.2, -0.9), (-0.22, -0.2, -0.7), (0.26, -0.18, -0.86),
        (0.16, 0.07, -1.3), (-0.12, -0.03, -1.44), (0.0, 0.1, -1.22),
    ]
    rock = _hull([Vector(p) * R for p in points])
    rock.bevel(0.06, 1, 22)
    # The splinter leans across the view.
    lean = Vector((0, 0, 1)).rotation_difference(Vector((0.5, -0.28, 0.82)).normalized())
    rock.apply(lean.to_matrix().to_4x4())
    axis = (0.2, 0.75, 0.63)
    thetas = [math.pi * j / 8 for j in range(1, 8)]
    _paint_rock(rock, axis, thetas, 3, R, facet=0.1)
    a.add(rock)


# --------------------------------------------------------------------------------------------
# The outer giant, its rings and its settled moon
# --------------------------------------------------------------------------------------------
_PALE, _CREAM, _WARM = "#f3e7cb", "#ead8b3", "#dfc79c"
_OCHRE, _OCHRE_D = "#d3ae7c", "#c69a68"
_RUST_L, _RUST, _RUST_D = "#c08d5e", "#ad7049", "#9a5c3d"
_DUSK, _DUSK_D = "#b3a48d", "#998c7b"

# Cloud bands from the north pole down: (northern edge in degrees of latitude, rows of faces,
# colour at the north edge, in the middle, at the south edge). The last band ends at the pole.
GIANT_BANDS = (
    (90, 3, _DUSK_D, _DUSK, "#c2b294"),
    (66, 2, _WARM, _CREAM, _WARM),
    (54, 2, _OCHRE_D, _OCHRE, _OCHRE_D),
    (43, 3, _CREAM, _PALE, _CREAM),
    (28, 3, _RUST_D, _RUST, _RUST_L),
    (13, 3, _PALE, "#f7edd6", _CREAM),
    (-8, 4, _RUST_L, _RUST, _RUST_D),
    (-28, 3, _CREAM, _PALE, _WARM),
    (-41, 2, _OCHRE_D, _OCHRE, _OCHRE_D),
    (-52, 2, _WARM, _CREAM, "#c9b898"),
    (-65, 3, "#bfae92", _DUSK, _DUSK_D),
)


def _oval(piece, R: float, lon: float, lat: float, a: float, b: float, tones, ground):
    """Inlay an oval storm on a sphere of radius R: semi-axes `a` (east-west) and `b` in radians.
    `tones` are the collar, the storm's edge, its body and its eye; `ground(point)` is the colour
    of the clouds around it. No relief."""
    bm = piece.bm
    layer = piece.layer
    c = Vector((math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat)))
    east = Vector((0, 0, 1)).cross(c).normalized()
    north = c.cross(east)
    OUT = 1.55

    def polar(p):
        d = p.normalized()
        u = math.atan2(d.dot(east), d.dot(c)) / a
        w = math.asin(max(-1.0, min(1.0, d.dot(north)))) / b
        return math.hypot(u, w), math.atan2(w, u) % math.tau

    def point(k, psi):
        u, w = k * a * math.cos(psi), k * b * math.sin(psi)
        return ((c * math.cos(u) + east * math.sin(u)) * math.cos(w) + north * math.sin(w)) * R

    doomed = [x for x in bm.verts if x.co.dot(c) > 0 and polar(x.co)[0] < OUT * 0.9]
    bmesh.ops.delete(bm, geom=doomed, context="VERTS")
    rim = sorted({x for e in bm.edges if e.is_boundary for x in e.verts}, key=lambda x: polar(x.co)[1])
    for x, y in zip(rim, rim[1:] + rim[:1]):
        edge = bm.edges.get((x, y))
        if edge is None or not edge.is_boundary:
            raise RuntimeError("the storm's rim is tangled; move or resize it")
    for x in rim:
        x.co = point(OUT, polar(x.co)[1])

    def ring(count, k, turn):
        ts = sorted(((i + turn) / count) % 1.0 for i in range(count))
        return [bm.verts.new(point(k, t * math.tau)) for t in ts], ts

    def add(tris, colour_of):
        for tri in tris:
            f = bm.faces.new(tri)
            f.normal_update()
            if f.normal.dot(c) < 0:
                f.normal_flip()
            f.smooth = True
            for loop in f.loops:
                col = jk.col(colour_of(loop.vert))
                loop[layer] = (col[0], col[1], col[2], 1.0)

    # Each rim vertex keeps the colour of the band it sits in, so the halo melts into the bands.
    band = {}
    for x in rim:
        tone = [0.0, 0.0, 0.0]
        for loop in x.link_loops:
            for k in range(3):
                tone[k] += loop[layer][k] / len(x.link_loops)
        band[x] = tuple(tone)
    halo, halo_t = ring(16, 1.24, 0.0)
    edge, edge_t = ring(16, 1.0, 0.25)
    body, body_t = ring(10, 0.56, 0.6)
    eye = bm.verts.new(point(0, 0))
    inner, core = set(body), {eye}
    tris = []
    _zip(tris, rim, [polar(x.co)[1] / math.tau for x in rim], halo, halo_t)
    add(tris, lambda v: band[v] if v in band else ground(v.co))
    tris = []
    _zip(tris, halo, halo_t, edge, edge_t)
    outer = set(halo)
    add(tris, lambda v: ground(v.co) if v in outer else tones[0])
    tris = []
    _zip(tris, edge, edge_t, body, body_t)
    add(tris, lambda v: tones[2] if v in inner else tones[1])
    add([(body[i], body[(i + 1) % len(body)], eye) for i in range(len(body))], lambda v: tones[3] if v in core else tones[2])
    bm.normal_update()
    return piece


@asset("sys-gas-giant", tint="#ffffff", grounded=False, budget=2400)
def gas_giant(a):
    """A smooth banded giant: belts and zones with wavy edges, and one oval storm."""
    R = 8.0
    rnd = random.Random(17)
    storm = dict(lon=math.radians(-72), lat=math.radians(-19.5), a=math.radians(12.0), b=math.radians(6.2))

    # One wave per band edge; rows inside a band ease between its two edges.
    def wave():
        return (rnd.choice((3, 4, 5)), rnd.random() * math.tau, rnd.choice((7, 8, 9, 11)), rnd.random() * math.tau)

    edges = [None] + [(rnd.uniform(1.0, 1.9), *wave()) for _ in GIANT_BANDS[1:]] + [None]

    def sway(edge, lon):
        if edge is None:
            return 0.0
        amp, k1, p1, k2, p2 = edge
        return amp * (0.62 * math.sin(k1 * lon + p1) + 0.38 * math.sin(k2 * lon + p2))

    rings = []   # (latitude, band, fraction through the band)
    rows = []    # (colour at the row's north edge, colour at its south edge)
    for i, (top, count, north, middle, south) in enumerate(GIANT_BANDS):
        bottom = GIANT_BANDS[i + 1][0] if i + 1 < len(GIANT_BANDS) else -90

        def tone(u, north=north, middle=middle, south=south):
            return jk.mix(north, middle, u * 2) if u < 0.5 else jk.mix(middle, south, u * 2 - 1)

        for k in range(count):
            rows.append((tone(k / count), tone((k + 1) / count)))
            if k + 1 < count or bottom > -90:
                rings.append((top + (bottom - top) * (k + 1) / count, i, (k + 1) / count))
    thetas = [math.radians(90 - lat) for lat, _, _ in rings]
    dirs, faces, _, ring_of = _shell(56, thetas, 17, (0, 0, 1), jitter=0.0)

    def place(d, ring):
        if ring == 0 or ring > len(rings):
            return d * R
        lat, band, f = rings[ring - 1]
        lon = math.atan2(d.y, d.x)
        # Edges wander most near the equator; toward the poles the rings are too short to show it.
        lat += ((1 - f) * sway(edges[band], lon) + f * sway(edges[band + 1], lon)) * math.cos(math.radians(lat)) ** 1.5
        lat = math.radians(lat)
        # The bands part around the storm.
        du = (lon - storm["lon"] + math.pi) % math.tau - math.pi
        u, w = du * math.cos(storm["lat"]) / storm["a"], (lat - storm["lat"]) / storm["b"]
        lat += storm["b"] * 0.55 * math.copysign(1.0, w) * math.exp(-(u * u + w * w) / 2.4) * min(1.0, abs(w) * 2)
        return Vector((math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat))) * R

    globe = jk.raw([place(d, ring_of[i]) for i, d in enumerate(dirs)], faces)
    bm = globe.bm
    bm.verts.index_update()
    for f in bm.faces:
        row = min(ring_of[v.index] for v in f.verts)
        north, south = rows[row]
        for loop in f.loops:
            c = north if ring_of[loop.vert.index] == row else south
            # Faint streaks along each band.
            p = loop.vert.co
            c = jk.shade(c, 0.05 * _n((p.x * 0.5, p.y * 0.5, p.z * 2.2), 23, 1.0))
            loop[globe.layer] = (c[0], c[1], c[2], 1.0)
    def ground(p):
        """The band colour at a point, from its latitude alone."""
        lat = math.degrees(math.asin(max(-1.0, min(1.0, p.z / p.length))))
        for i, (top, _, north, middle, south) in enumerate(GIANT_BANDS):
            bottom = GIANT_BANDS[i + 1][0] if i + 1 < len(GIANT_BANDS) else -90
            if lat >= bottom:
                u = (top - lat) / (top - bottom)
                return jk.mix(north, middle, u * 2) if u < 0.5 else jk.mix(middle, south, u * 2 - 1)
        return jk.col(GIANT_BANDS[-1][4])

    _oval(globe, R, storm["lon"], storm["lat"], storm["a"], storm["b"], ("#ecdcbc", "#b9623f", "#a8502f", "#d08a58"), ground)
    a.add(globe.smooth(60))


@asset("sys-rings", tint="#ffffff", grounded=False, budget=900)
def rings(a):
    """The giant's rings, lying in the xy plane: four bands, each a shallow lens of dust."""
    N = 56
    # (inner radius, outer radius, crown height, colours: inner edge, inside the crown, outside it, outer edge)
    bands = (
        (10.5, 11.38, 0.07, "#8f7d68", "#a8947a", "#9d8a71", "#8a7964"),
        (11.6, 12.95, 0.13, "#c4ae8e", "#dccaa9", "#d0bb98", "#bfa98a"),
        (13.35, 14.08, 0.1, "#ad987c", "#c3ae90", "#b7a184", "#a5917a"),
        (14.24, 14.5, 0.06, "#c9b698", "#d8c7a8", "#d8c7a8", "#c2ae90"),
    )
    verts, faces, colours = [], [], []
    for inner, outer, crown, c0, c1, c2, c3 in bands:
        base = len(verts)
        ridge = inner + (outer - inner) * 0.56
        for i in range(N):
            t = math.tau * i / N
            x, y = math.cos(t), math.sin(t)
            verts += [(x * inner, y * inner, 0.0), (x * ridge, y * ridge, crown), (x * outer, y * outer, 0.0)]
        for i in range(N):
            p, q = base + i * 3, base + ((i + 1) % N) * 3
            faces.append((p, q, q + 1, p + 1))
            colours.append((c0, c0, c1, c1))
            faces.append((p + 1, q + 1, q + 2, p + 2))
            colours.append((c2, c2, c3, c3))
    disc = jk.raw(verts, faces)
    for f, tones in zip(disc.bm.faces, colours):
        for loop, tone in zip(f.loops, tones):
            c = jk.col(tone)
            loop[disc.layer] = (c[0], c[1], c[2], 1.0)
    a.add(disc.smooth(50))


@asset("sys-ice-moon", tint="#c9c6bf", grounded=False, budget=800)
def ice_moon(a):
    """The giant's settled moon: faceted ice, long fractures, and one smooth plain for a town."""
    R = 3.6
    # The plain takes in the pole and the forward slope where the town is stood.
    plain = Vector((0.1, -0.25, 0.96)).normalized()
    shore = math.radians(50)
    thetas = [math.radians(t) for t in (12, 24, 37, 50, 63, 76, 89, 102, 115, 128, 141, 154, 167)]

    def shape(d):
        t = d.angle(plain)
        rough = 1 + 0.035 * _n(d, 71, 1.5) + 0.018 * _n(d, 72, 3.1)
        k = _smooth((t - math.radians(40)) / math.radians(14))
        lip = 0.01 * math.exp(-(((t - shore) / math.radians(5)) ** 2))
        return 0.978 * (1 - k) + rough * k + lip

    moon, thetas = _body(R, 24, thetas, 71, plain, shape)
    _chip(moon, (0.7, 0.2, -0.69), 0.2)
    _chip(moon, (-0.8, 0.45, -0.4), 0.18)
    _chip(moon, (-0.35, -0.8, -0.49), 0.16)
    _chip(moon, (0.3, 0.9, -0.3), 0.18)
    craters = [
        ((0.86, -0.46, 0.2), 0.8, 0.12, 8, 0.0),
        ((-0.72, -0.6, -0.35), 1.0, 0.15, 9, 0.05),
        ((-0.3, 0.9, 0.3), 0.78, 0.12, 8, 0.0),
        ((0.3, 0.2, -0.93), 0.9, 0.13, 8, 0.0),
    ]
    plans = [
        ((-0.97, -0.2, 0.15), (0.25, -0.75, -0.62), 2, (), False),
        ((0.3, -0.95, -0.02), (0.95, 0.05, -0.3), 4, (), False),
        ((-0.75, 0.3, 0.58), (-0.7, 0.6, -0.4), 6, (), False),
        ((0.75, 0.6, 0.28), (0.15, 0.65, -0.75), 8, (), False),
        ((-0.3, -0.55, -0.78), (-0.75, 0.1, -0.65), 10, (), False),
    ]

    def keep(p):
        return p.angle(plain) < shore + math.radians(5)

    _carve(moon, R, craters, plans, 0.11, 0.09, keep=keep, gap=0.7, wiggle=0.45)

    def tone(f, centre, value):
        t = centre.angle(plain)
        if f.material_index not in (ROCK, CUT):
            return None
        if t < math.radians(37):
            return _grey(1.0)
        if t < shore:
            return _grey(0.93)
        return None

    a.add(_paint_ice(moon, 5, R, tone=tone))
    _measure("sys-ice-moon", [moon], R, [(0.214, -0.471, 0.856), (0, 0, 1)])


# --------------------------------------------------------------------------------------------
# The Kuiper outpost
# --------------------------------------------------------------------------------------------
@asset("sys-kuiper-body", tint="#cfe0ea", grounded=False, budget=1200)
def kuiper_body(a):
    """A contact binary: two lobes of old ice touching at a bright neck."""
    R, r2 = 7.0, 3.5
    lobe = Vector((5.7, 2.6, -3.7))
    TINT = "#cfe0ea"

    def round_1(d):
        return _ellipsoid(d, 1.0, 0.92, 0.85)

    def shape_1(d):
        calm = 1 - 0.55 * _smooth(d.z / 0.4)
        return round_1(d) * (1 + (0.055 * _n(d, 81, 1.1) + 0.025 * _n(d, 82, 2.6)) * calm)

    def shape_2(d):
        return _ellipsoid(d, 1.0, 0.96, 0.86) * (1 + 0.07 * _n(d, 85, 1.5))

    main, _ = _body(R, 27, 12, 81, (0.3, 0.5, 0.81), shape_1)
    _facets(main, R, 24, 81, cut=(0.04, 0.1), top=(0.02, 0.04))
    small, _ = _body(r2, 15, 6, 85, lobe, shape_2)
    _facets(small, r2, 11, 85, cut=(0.06, 0.15))
    small.move(*lobe)
    main.join(small)
    small.bm.free()
    for f in main.bm.faces:
        f.material_index = ROCK
    craters = [
        ((-0.7, -0.66, -0.27), 1.6, 0.3, 11, 0.1),
        ((-0.15, 0.7, 0.7), 1.15, 0.16, 9, 0.0),
        ((-0.35, 0.3, -0.89), 1.4, 0.26, 10, 0.0),
    ]
    plans = [
        ((-0.95, -0.2, 0.25), (-0.5, 0.75, -0.43), 3, (), False),
        ((0.25, -0.95, 0.2), (0.8, -0.5, -0.33), 5, (), False),
    ]

    def keep(p):
        return (p - lobe).length < r2 * 1.5

    _carve(main, R, craters, plans, 0.18, 0.14, keep=keep)
    rust = _under("#b79487", TINT)
    stains = (
        (Vector((0.35, -0.85, -0.4)), None, 0.52),
        (Vector((-0.55, 0.45, 0.7)), None, 0.4),
        (Vector((0.55, 0.3, -0.78)), lobe, 0.9),
    )

    def tone(f, centre, value):
        if f.material_index not in (ROCK, CUT):
            return None
        on_small = (centre - lobe).length < r2 * 1.12
        # The neck, where the lobes touch, is fresh bright frost.
        m1 = centre.length / (R * round_1(centre.normalized()))
        m2 = (centre - lobe).length / r2
        if abs(m1 - 1) < 0.1 and abs(m2 - 1) < 0.2:
            return _grey(1.0)
        for direction, about, spread in stains:
            if (about is not None) != on_small:
                continue
            d = (centre - about).normalized() if about is not None else centre.normalized()
            edge = spread * (1 + 0.35 * _n(d, 88, 2.2))
            if d.angle(direction.normalized()) < edge:
                return tuple(c * (0.9 + 0.1 * value) for c in rust)
        return None

    _paint_ice(main, 8, R, wall="#8fa0b4", facet=0.11, tone=tone)
    a.add(main)
    # Four clusters of ice spires around its waist, faintly alight.
    for k, d in enumerate(((1, 0.05, 0.22), (-0.13, -0.99, 0.2), (-0.97, 0.26, 0.2), (0.3, 0.95, 0.24))):
        up = Vector(d).normalized()
        foot = _surface(main, up)
        u, v, _ = _perp(up)
        turn = k * 1.3
        side = u * math.cos(turn) + v * math.sin(turn)
        other = up.cross(side)
        _crystal(a, foot - up * 0.3, up + side * 0.1, 0.46, 2.6, FROST, 6, k * 0.5)
        _crystal(a, foot - up * 0.25 + side * 0.56, up + side * 0.42 + other * 0.1, 0.31, 1.6, FROST, 5, k + 0.3, slim=True)
        _crystal(a, foot - up * 0.25 - side * 0.34 + other * 0.46, up - side * 0.3 + other * 0.4, 0.25, 1.15, FROST, 5, k + 1.1, slim=True)
    _measure("sys-kuiper-body", [main], R, [(0.214, -0.471, 0.856), (0, 0, 1)])


# --------------------------------------------------------------------------------------------
# The Sun and its collector swarm
# --------------------------------------------------------------------------------------------
def _trail(start, heading, length: float, curl: float, steps: int = 16):
    """Points along a curling path over the unit sphere: (direction, fraction along the path).
    The path swings one way and then back, like a flame."""
    p = Vector(start).normalized()
    h = Vector(heading)
    h = (h - p * h.dot(p)).normalized()
    step = length / steps
    out = []
    for i in range(steps + 1):
        t = i / steps
        out.append((p.copy(), t))
        q = p * math.cos(step) + h * math.sin(step)
        h = h * math.cos(step) - p * math.sin(step)
        p = q.normalized()
        h = (Matrix.Rotation(curl * (1 - 2.1 * t) / steps, 3, p) @ h).normalized()
    return out


@asset("sys-sun", tint="#ffffff", grounded=False, budget=900)
def sun(a):
    """The Sun as a warm lantern: a ball of low faceted stars in close golds. A few flares run
    over it as tapering rows of taller, paler stars."""
    R = 5.5
    tones = ("#fff4c8", "#ffe9a0", "#ffdb78", "#ffcc58", "#ffbe44")
    dirs = _scatter(72, 9, 0.95)
    tris = _delaunay(dirs)
    corner = [(dirs[i] + dirs[j] + dirs[k]).normalized() for i, j, k in tris]
    around = {}
    for t, tri in enumerate(tris):
        for i in tri:
            around.setdefault(i, []).append(t)
    flares = [
        _trail(start, heading, length, curl)
        for start, heading, length, curl in (
            ((0.45, -0.85, -0.2), (0.4, 0.2, 1), 1.25, 1.5),
            ((-0.75, -0.6, -0.3), (-0.3, 0.5, 1), 1.05, -1.6),
            ((-0.4, 0.1, 0.9), (1, 0.6, 0), 1.1, 1.4),
            ((0.8, 0.55, -0.25), (0.2, -0.3, -1), 1.05, -1.5),
            ((-0.6, 0.8, 0.1), (0.3, 0.4, 1), 1.0, 1.6),
            ((0.1, -0.45, -0.9), (1, 0.3, 0.1), 1.05, -1.4),
        )
    ]

    def heat(d):
        """How much of a flare passes over `d`: broad at its root, fading to a point."""
        best = 0.0
        for trail in flares:
            for q, t in trail:
                reach = 0.34 * math.sin(math.pi * t ** 0.6) ** 0.7
                if reach > 0:
                    best = max(best, _smooth(1.25 - d.angle(q) / reach) * (1 - 0.35 * t))
        return best

    hot = [heat(d) for d in dirs]
    # Every point is the low peak of a star whose facets alternate between two close tones.
    # Peaks stand on the stated radius; a flare lifts them at most 6% above it.
    verts = [
        c * (R * (0.955 + 0.04 * sum(hot[i] for i in tri) / 3)) for c, tri in zip(corner, tris)
    ] + [d * (R * (1.0 + 0.06 * w)) for d, w in zip(dirs, hot)]
    faces, paints = [], []
    for i, d in enumerate(dirs):
        u, v, _ = _perp(d)
        loop = sorted(around[i], key=lambda t: math.atan2(corner[t].dot(v), corner[t].dot(u)))
        base = 1 + max(0, min(2, int((_n(d, 31, 0.9) + 0.55) * 3)))
        if hot[i] > 0.3:
            base = 0 if hot[i] > 0.65 else 1
        k = len(loop)
        for j in range(k):
            faces.append((loop[j], loop[(j + 1) % k], len(corner) + i))
            step = j % 2 if (k % 2 == 0 or j < k - 1) else 2
            paints.append(tones[min(4, base + step)] if step < 2 else tones[max(0, base - 1)])
    # The Sun is the light itself: no baked occlusion or top light may dull its valleys.
    ball = jk.raw(verts, faces).flat().part("glow").no_ao()
    for f, tone in zip(ball.bm.faces, paints):
        c = jk.col(tone)
        for loop in f.loops:
            loop[ball.layer] = (c[0], c[1], c[2], 1.0)
    a.add(ball)


def _inset(points, distance: float):
    """A convex outline (counter-clockwise) with every edge moved inward by `distance`."""
    n = len(points)
    lines = []
    for i in range(n):
        p, q = Vector(points[i]), Vector(points[(i + 1) % n])
        t = (q - p).normalized()
        lines.append((p + Vector((-t.y, t.x)) * distance, t))
    out = []
    for i in range(n):
        (p1, t1), (p2, t2) = lines[i - 1], lines[i]
        s = ((p2.x - p1.x) * t2.y - (p2.y - p1.y) * t2.x) / (t1.x * t2.y - t1.y * t2.x)
        out.append(p1 + t1 * s)
    return out


@asset("sys-collector", tint="#ffffff", grounded=False, budget=300)
def collector(a):
    """One panel of the collector swarm: a dark faceted leaf, folded a little toward the Sun
    along a single seam of light, with fine veins sweeping across its metal back. The glass
    looks at the Sun (-z); the back is what the reader mostly sees."""
    outline = [(0, -0.7), (0.3, -0.34), (0.5, 0.26), (0, 0.7), (-0.5, 0.26), (-0.3, -0.34)]
    n = len(outline)
    heart = (0.0, 0.14)
    with a.group() as leaf:
        # The shell, from the recessed back plate round the rim to the bezel that seats the glass.
        levels = ((0.085, 0.024), (0.066, 0.046), (0.02, 0.046), (0.0, 0.026), (0.0, -0.012), (0.034, -0.03))
        paints = ("#4d555f", "#8d96a0", P.CHROME, "#c2cad2", P.STEEL, "#cfd6dc", "#2c3038")
        verts, faces, colours = [], [], []
        for inset, z in levels:
            verts += [(q.x, q.y, z) for q in _inset(outline, inset)]
        faces.append(tuple(range(n)))
        colours.append(paints[0])
        for k in range(len(levels) - 1):
            for i in range(n):
                j = (i + 1) % n
                faces.append((k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i))
                colours.append(paints[k + 1])
        last = (len(levels) - 1) * n
        faces.append(tuple(last + i for i in reversed(range(n))))
        colours.append(paints[-1])
        shell = jk.raw(verts, faces)
        for f, tone in zip(shell.bm.faces, colours):
            c = jk.col(tone)
            for loop in f.loops:
                loop[shell.layer] = (c[0], c[1], c[2], 1.0)
        # Split the faces the fold line crosses, so the shell can bend along it.
        bmesh.ops.bisect_plane(shell.bm, geom=shell.bm.verts[:] + shell.bm.edges[:] + shell.bm.faces[:], dist=1e-6, plane_co=(0, 0, 0), plane_no=(1, 0, 0))
        a.add(shell.part("metal").smooth(28))
        # The collecting face: six dark facets falling away from a keel.
        seat = _inset(outline, 0.034)
        glass = jk.raw([(q.x, q.y, -0.03) for q in seat] + [(heart[0], heart[1], -0.07)], [(i, n, (i + 1) % n) for i in range(n)])
        shades = ("#0f141d", "#18202e", "#121823", "#1c2535", "#10151f", "#161d2a")
        for f, tone in zip(glass.bm.faces, shades):
            c = jk.col(tone)
            for loop in f.loops:
                loop[glass.layer] = (c[0], c[1], c[2], 1.0)
        a.add(glass.part("glass").flat())
        # A low keel down the back, and veins sweeping from it toward the tip, as on a leaf.
        a.tube([(0, -0.57, 0.03), (0, 0.6, 0.03)], [0.05, 0.036], 4, squash=0.5).part("metal").color("#b4bcc5")
        for y, (x1, y1) in ((-0.42, (0.3, -0.15)), (-0.12, (0.42, 0.25)), (0.2, (0.23, 0.42))):
            for side in (1, -1):
                a.tube([(0, y, 0.03), (side * x1, y1, 0.028)], [0.016, 0.009], 4).part("metal").color(P.CHROME)
    # The whole leaf folds toward the Sun along its keel.
    for piece in leaf.pieces:
        piece.warp(lambda co: (co.x, co.y, co.z - abs(co.x) * 0.2))
    # One seam of light, running through the fold from tip to tip, seen from both sides.
    light = "#9ff5ff"
    a.tube([(0, -0.6, -0.04), (heart[0], heart[1], -0.074), (0, 0.62, -0.04)], 0.016, 4).part("glow").color(light).no_ao()
    a.tube([(0, -0.52, 0.05), (0, 0.56, 0.044)], 0.011, 4).part("glow").color(light).no_ao()
