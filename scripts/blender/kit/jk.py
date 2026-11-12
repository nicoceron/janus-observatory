"""Janus kit modeling core, Blender 5.x.

Every model in the kit is assembled from `Piece`s: small bmesh solids with a material part, a
colour (optionally a bottom-to-top gradient) and a shading mode. An `Asset` collects pieces and
turns them into the final triangle soup with weighted normals and baked ambient occlusion.

Authoring frame (Blender): x right, y back, z up. A model stands on z = 0 and its FRONT FACES -y.
Units: one citizen is 1.0 tall. The exporter converts to the web frame (x, z, -y).

Art rules live in docs/KIT_ART_DIRECTION.md. Geometry is original interpretive artwork and never
encodes a scientific quantity.
"""

from __future__ import annotations

import math
import random as _random
from typing import Callable, Iterable, Sequence

import bmesh
import bpy
from mathutils import Matrix, Vector, noise as _noise
from mathutils.bvhtree import BVHTree

# `lit` holds window panes: they glow in the normal model and are dark glass in `<kind>-dark`,
# which shares every other triangle with its lit twin.
PARTS = ("base", "tint", "glass", "metal", "glow", "lit")
AUTHOR_PARTS = PARTS
DARK_GLASS = "#1b2733"

Vec3 = Sequence[float]


# --------------------------------------------------------------------------------------------
# Colour
# --------------------------------------------------------------------------------------------
def srgb_to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def linear_to_srgb(c: float) -> float:
    c = min(1.0, max(0.0, c))
    return c * 12.92 if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def col(value) -> tuple[float, float, float]:
    """Hex string (sRGB) or a linear RGB triple -> linear RGB triple."""
    if isinstance(value, str):
        h = value.lstrip("#")
        if len(h) == 3:
            h = "".join(ch * 2 for ch in h)
        return tuple(srgb_to_linear(int(h[i : i + 2], 16) / 255) for i in (0, 2, 4))
    return (float(value[0]), float(value[1]), float(value[2]))


def mix(a, b, t: float):
    a, b = col(a), col(b)
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def shade(c, amount: float):
    """Lighten (amount > 0) or darken (amount < 0) a colour, staying in gamut."""
    c = col(c)
    return mix(c, "#ffffff", amount) if amount >= 0 else mix(c, "#000000", -amount)


# --------------------------------------------------------------------------------------------
# Piece
# --------------------------------------------------------------------------------------------
class Piece:
    """One solid of one material part. Transform and colour methods return self for chaining."""

    def __init__(self, bm: bmesh.types.BMesh, part: str = "base"):
        self.bm = bm
        self._part = part
        self.shading = "smooth"  # or "flat"
        self.smooth_angle = math.radians(50)
        self.ao = True
        self.layer = bm.loops.layers.color.get("c") or bm.loops.layers.color.new("c")
        self.color("#ffffff")

    # ---- material and shading ------------------------------------------------------------
    def part(self, name: str) -> "Piece":
        if name not in AUTHOR_PARTS:
            raise ValueError(f"Unknown part {name!r}; use one of {AUTHOR_PARTS}.")
        self._part = name
        return self

    def flat(self) -> "Piece":
        """Faceted shading: the right look for foliage, rock, ice and crystal."""
        self.shading = "flat"
        return self

    def smooth(self, angle: float = 50) -> "Piece":
        """Smooth across edges softer than `angle` degrees; sharper edges stay crisp."""
        self.shading = "smooth"
        self.smooth_angle = math.radians(angle)
        return self

    def no_ao(self) -> "Piece":
        self.ao = False
        return self

    # ---- colour --------------------------------------------------------------------------
    def color(self, bottom, top=None, axis: str = "z") -> "Piece":
        """Paint the piece. With `top`, blend from `bottom` to `top` along an axis (default up)."""
        a = col(bottom)
        b = col(top) if top is not None else a
        k = "xyz".index(axis)
        self.bm.verts.ensure_lookup_table()
        if not self.bm.verts:
            return self
        lo = min(v.co[k] for v in self.bm.verts)
        hi = max(v.co[k] for v in self.bm.verts)
        span = (hi - lo) or 1.0
        for f in self.bm.faces:
            for loop in f.loops:
                t = (loop.vert.co[k] - lo) / span
                loop[self.layer] = (
                    a[0] + (b[0] - a[0]) * t,
                    a[1] + (b[1] - a[1]) * t,
                    a[2] + (b[2] - a[2]) * t,
                    1.0,
                )
        return self

    def paint(self, pick: Callable[[bmesh.types.BMFace], object]) -> "Piece":
        """Paint faces selectively: `pick(face)` returns a colour, or None to leave the face."""
        for f in self.bm.faces:
            c = pick(f)
            if c is None:
                continue
            c = col(c)
            for loop in f.loops:
                loop[self.layer] = (c[0], c[1], c[2], 1.0)
        return self

    def paint_up(self, colour, limit: float = 0.6) -> "Piece":
        """Paint faces that look upward (normal.z > limit): snow caps, roofs, lit tops."""
        return self.paint(lambda f: colour if f.normal.z > limit else None)

    def paint_side(self, colour, direction: Vec3, limit: float = 0.6) -> "Piece":
        d = Vector(direction).normalized()
        return self.paint(lambda f: colour if f.normal.dot(d) > limit else None)

    # ---- transforms ----------------------------------------------------------------------
    def apply(self, m: Matrix) -> "Piece":
        self.bm.transform(m)
        if m.determinant() < 0:
            bmesh.ops.reverse_faces(self.bm, faces=self.bm.faces[:])
        self.bm.normal_update()
        return self

    def move(self, x: float = 0, y: float = 0, z: float = 0) -> "Piece":
        return self.apply(Matrix.Translation((x, y, z)))

    def at(self, p: Vec3) -> "Piece":
        return self.move(p[0], p[1], p[2])

    def rot(self, x: float = 0, y: float = 0, z: float = 0, pivot: Vec3 = (0, 0, 0)) -> "Piece":
        """Rotate by degrees about the x, then y, then z axis, around `pivot`."""
        m = (
            Matrix.Rotation(math.radians(z), 4, "Z")
            @ Matrix.Rotation(math.radians(y), 4, "Y")
            @ Matrix.Rotation(math.radians(x), 4, "X")
        )
        p = Matrix.Translation(pivot)
        return self.apply(p @ m @ p.inverted())

    def scale(self, x: float, y: float | None = None, z: float | None = None) -> "Piece":
        y = x if y is None else y
        z = x if z is None else z
        return self.apply(Matrix.Diagonal((x, y, z, 1)))

    def warp(self, fn: Callable[[Vector], Vec3]) -> "Piece":
        """Move every vertex through `fn(co) -> co`: bends, tapers, bulges and twists."""
        for v in self.bm.verts:
            v.co = Vector(fn(v.co.copy()))
        self.bm.normal_update()
        return self

    def taper(self, top: float, axis: str = "z", bottom: float = 1.0) -> "Piece":
        """Scale the cross-section linearly along an axis, from `bottom` to `top`, about the
        piece's own centre line."""
        k = "xyz".index(axis)
        others = [i for i in range(3) if i != k]
        lo, hi = self.bounds()
        span = (hi[k] - lo[k]) or 1.0
        mid = (lo + hi) / 2

        def fn(co):
            s = bottom + (top - bottom) * ((co[k] - lo[k]) / span)
            for i in others:
                co[i] = mid[i] + (co[i] - mid[i]) * s
            return co

        return self.warp(fn)

    def bend(self, angle: float, axis: str = "x") -> "Piece":
        """Bend the piece's z extent through `angle` degrees around a horizontal axis."""
        lo = min(v.co.z for v in self.bm.verts)
        hi = max(v.co.z for v in self.bm.verts)
        span = (hi - lo) or 1.0
        total = math.radians(angle)
        if abs(total) < 1e-6:
            return self
        radius = span / total

        def fn(co):
            a = (co.z - lo) / span * total
            if axis == "x":
                r = radius - co.y
                return (co.x, radius - r * math.cos(a), lo + r * math.sin(a))
            r = radius - co.x
            return (radius - r * math.cos(a), co.y, lo + r * math.sin(a))

        return self.warp(fn)

    def jitter(self, amount: float, seed: int = 1, scale: float = 1.0) -> "Piece":
        """Displace vertices along their normals with smooth noise: hand-cut irregularity."""
        self.bm.normal_update()
        offset = Vector((seed * 12.9898, seed * 78.233, seed * 37.719))
        for v in self.bm.verts:
            n = _noise.noise(v.co * scale + offset)
            v.co += v.normal * n * amount
        self.bm.normal_update()
        return self

    def subdivide(self, cuts: int = 1) -> "Piece":
        bmesh.ops.subdivide_edges(self.bm, edges=self.bm.edges[:], cuts=cuts, use_grid_fill=True)
        self.bm.normal_update()
        return self

    def bevel(self, width: float, segments: int = 1, angle: float = 30) -> "Piece":
        """Chamfer every edge sharper than `angle` degrees. Bevels are what catch the light."""
        if width <= 0:
            return self
        limit = math.radians(angle)
        edges = [
            e
            for e in self.bm.edges
            if len(e.link_faces) == 2 and e.calc_face_angle(0.0) > limit and e.calc_length() > 1e-5
        ]
        if edges:
            bmesh.ops.bevel(
                self.bm,
                geom=edges,
                offset=width,
                offset_type="OFFSET",
                segments=segments,
                profile=0.5,
                affect="EDGES",
                clamp_overlap=True,
            )
            self.bm.normal_update()
        return self

    def modifier(self, kind: str, **props) -> "Piece":
        """Run a Blender modifier (SUBSURF, DECIMATE, SOLIDIFY, DISPLACE...) on this piece."""
        mesh = bpy.data.meshes.new("jk_tmp")
        self.bm.to_mesh(mesh)
        obj = bpy.data.objects.new("jk_tmp", mesh)
        bpy.context.scene.collection.objects.link(obj)
        mod = obj.modifiers.new("m", kind)
        for key, value in props.items():
            setattr(mod, key, value)
        deps = bpy.context.evaluated_depsgraph_get()
        deps.update()
        evaluated = obj.evaluated_get(deps)
        result = bpy.data.meshes.new_from_object(evaluated)
        self.bm.clear()
        self.bm.from_mesh(result)
        self.layer = self.bm.loops.layers.color.get("c") or self.bm.loops.layers.color.new("c")
        bpy.data.objects.remove(obj)
        bpy.data.meshes.remove(mesh)
        bpy.data.meshes.remove(result)
        self.bm.normal_update()
        return self

    def subsurf(self, levels: int = 1) -> "Piece":
        return self.modifier("SUBSURF", levels=levels, render_levels=levels)

    def decimate(self, ratio: float) -> "Piece":
        return self.modifier("DECIMATE", ratio=ratio)

    def solidify(self, thickness: float, offset: float = -1.0) -> "Piece":
        return self.modifier("SOLIDIFY", thickness=thickness, offset=offset)

    def cut(self, cutter: "Piece", solver: str = "EXACT") -> "Piece":
        """Boolean-subtract another piece. New faces take the cutter's colour."""
        return self._boolean(cutter, "DIFFERENCE", solver)

    def join(self, other: "Piece", solver: str = "EXACT") -> "Piece":
        return self._boolean(other, "UNION", solver)

    def _boolean(self, other: "Piece", operation: str, solver: str) -> "Piece":
        mesh = bpy.data.meshes.new("jk_cut")
        other.bm.to_mesh(mesh)
        obj = bpy.data.objects.new("jk_cut", mesh)
        bpy.context.scene.collection.objects.link(obj)
        try:
            self.modifier("BOOLEAN", operation=operation, object=obj, solver=solver)
        finally:
            bpy.data.objects.remove(obj)
            bpy.data.meshes.remove(mesh)
        return self

    # ---- queries and copies --------------------------------------------------------------
    def bounds(self) -> tuple[Vector, Vector]:
        xs = [v.co for v in self.bm.verts]
        lo = Vector((min(c.x for c in xs), min(c.y for c in xs), min(c.z for c in xs)))
        hi = Vector((max(c.x for c in xs), max(c.y for c in xs), max(c.z for c in xs)))
        return lo, hi

    @property
    def triangles(self) -> int:
        return sum(len(f.verts) - 2 for f in self.bm.faces)

    def copy(self) -> "Piece":
        p = Piece.__new__(Piece)
        p.bm = self.bm.copy()
        p._part = self._part
        p.shading = self.shading
        p.smooth_angle = self.smooth_angle
        p.ao = self.ao
        p.layer = p.bm.loops.layers.color.get("c")
        return p


# --------------------------------------------------------------------------------------------
# Primitive builders (free functions returning a Piece; Asset wraps them and collects)
# --------------------------------------------------------------------------------------------
def _auto_bevel(*dims: float) -> float:
    return max(0.008, min(0.06, 0.07 * min(d for d in dims if d > 0)))


def _new() -> bmesh.types.BMesh:
    return bmesh.new()


def _finish(bm, part="base") -> Piece:
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    return Piece(bm, part)


def box(
    w: float,
    d: float,
    h: float,
    bevel: float | None = None,
    taper: float | Sequence[float] = 1.0,
    grounded: bool = False,
    segments: int = 1,
) -> Piece:
    """A box w (x) by d (y) by h (z), standing on z = 0 and centred on the origin.

    `taper` scales the top face (a number, or (x, y)). `grounded` drops the hidden bottom face
    and leaves the bottom edges unbevelled, for bodies that sit on the ground.
    """
    tx, ty = (taper, taper) if isinstance(taper, (int, float)) else taper
    bm = _new()
    x, y = w / 2, d / 2
    low = [bm.verts.new(p) for p in ((-x, -y, 0), (x, -y, 0), (x, y, 0), (-x, y, 0))]
    top = [
        bm.verts.new(p)
        for p in ((-x * tx, -y * ty, h), (x * tx, -y * ty, h), (x * tx, y * ty, h), (-x * tx, y * ty, h))
    ]
    bottom_face = bm.faces.new(low[::-1])
    bm.faces.new(top)
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((low[i], low[j], top[j], top[i]))
    piece = _finish(bm)
    width = _auto_bevel(w, d, h) if bevel is None else bevel
    if grounded:
        bottom_edges = set(bottom_face.edges)
        bmesh.ops.delete(bm, geom=[bottom_face], context="FACES_ONLY")
        if width > 0:
            limit = math.radians(30)
            edges = [
                e
                for e in bm.edges
                if e not in bottom_edges
                and len(e.link_faces) == 2
                and e.calc_face_angle(0.0) > limit
            ]
            bmesh.ops.bevel(
                bm, geom=edges, offset=width, offset_type="OFFSET", segments=segments,
                profile=0.5, affect="EDGES", clamp_overlap=True,
            )
        bm.normal_update()
    else:
        piece.bevel(width, segments)
    return piece.color("#ffffff")


def lathe(
    profile: Sequence[Sequence[float]],
    sides: int = 16,
    cap_bottom: bool = True,
    cap_top: bool = True,
    turn: float = 0.0,
) -> Piece:
    """Revolve a profile of (radius, z) points about the z axis.

    Radius 0 at either end closes the form in a point. Otherwise the ends are capped with a
    flat face. Corners sharper than 50 degrees stay crisp; put two close points for a bevel.
    """
    bm = _new()
    rings: list[list[bmesh.types.BMVert] | bmesh.types.BMVert] = []
    for r, z in profile:
        if r <= 1e-6:
            rings.append(bm.verts.new((0, 0, z)))
        else:
            rings.append(
                [
                    bm.verts.new(
                        (
                            math.cos(turn + i / sides * math.tau) * r,
                            math.sin(turn + i / sides * math.tau) * r,
                            z,
                        )
                    )
                    for i in range(sides)
                ]
            )
    for a, b in zip(rings, rings[1:]):
        a_point, b_point = not isinstance(a, list), not isinstance(b, list)
        if a_point and b_point:
            continue
        for i in range(sides):
            j = (i + 1) % sides
            if a_point:
                bm.faces.new((a, b[j], b[i]))
            elif b_point:
                bm.faces.new((a[i], a[j], b))
            else:
                bm.faces.new((a[i], a[j], b[j], b[i]))
    if cap_bottom and isinstance(rings[0], list):
        bm.faces.new(rings[0][::-1])
    if cap_top and isinstance(rings[-1], list):
        bm.faces.new(rings[-1])
    return _finish(bm)


def cyl(
    r: float,
    h: float,
    sides: int = 16,
    r2: float | None = None,
    bevel: float | None = None,
    grounded: bool = False,
) -> Piece:
    """A cylinder, frustum (r2) or cone (r2 = 0) standing on z = 0, with chamfered rims."""
    r2 = r if r2 is None else r2
    b = _auto_bevel(r * 2, h, max(r2 * 2, 0.02)) if bevel is None else bevel
    b = min(b, h * 0.45, r * 0.6 if r > 0 else b)
    pts: list[tuple[float, float]] = []
    if grounded or b <= 0:
        pts.append((r, 0))
    else:
        pts += [(r - b, 0), (r, b)]
    if r2 <= 1e-6:
        pts.append((0, h))
    elif b <= 0:
        pts.append((r2, h))
    else:
        slope = (r2 - r) / h
        pts += [(r2 - slope * b, h - b), (max(r2 - b, r2 * 0.4), h)]
    return lathe(pts, sides, cap_bottom=not grounded)


def cone(r: float, h: float, sides: int = 16, grounded: bool = False) -> Piece:
    return cyl(r, h, sides, r2=0, grounded=grounded)


def sphere(r: float = 0.5, sides: int = 16, rings: int = 8, squash: Vec3 = (1, 1, 1)) -> Piece:
    """A smooth UV sphere centred on the origin."""
    pts = [(math.sin(i / rings * math.pi) * r, -math.cos(i / rings * math.pi) * r) for i in range(rings + 1)]
    pts[0], pts[-1] = (0, -r), (0, r)
    return lathe(pts, sides).scale(*squash)


def dome(r: float, h: float | None = None, sides: int = 16, rings: int = 4, grounded: bool = True) -> Piece:
    """A hemisphere (or flattened/raised with `h`) resting on z = 0."""
    h = r if h is None else h
    pts = [
        (math.cos(i / rings * math.pi / 2) * r, math.sin(i / rings * math.pi / 2) * h)
        for i in range(rings + 1)
    ]
    pts[-1] = (0, h)
    return lathe(pts, sides, cap_bottom=not grounded)


def capsule(r: float, h: float, sides: int = 12, rings: int = 3) -> Piece:
    """A pill standing on z = 0 with total height h."""
    body = max(0.0, h - 2 * r)
    pts = [(0, 0)]
    for i in range(1, rings + 1):
        a = i / rings * math.pi / 2
        pts.append((math.sin(a) * r, r - math.cos(a) * r))
    for i in range(rings - 1, -1, -1):
        a = i / rings * math.pi / 2
        pts.append((math.sin(a) * r, r + body + math.cos(a) * r))
    pts[-1] = (0, h)
    return lathe(pts, sides)


def ico(r: float = 0.5, subdiv: int = 2) -> Piece:
    bm = _new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=r)
    return _finish(bm)


def blob(
    r: float = 0.5,
    subdiv: int = 2,
    squash: Vec3 = (1, 1, 1),
    lumps: float = 0.16,
    seed: int = 1,
    freq: float = 1.4,
) -> Piece:
    """A faceted organic lump centred on the origin: canopies, bushes, rocks, clouds."""
    bm = _new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    offset = Vector((seed * 3.17, seed * 5.71, seed * 9.13))
    for v in bm.verts:
        n = _noise.noise(v.co * freq + offset)
        v.co *= r * (1 + n * lumps)
    piece = _finish(bm).scale(*squash)
    return piece.flat()


def prism(points: Sequence[Sequence[float]], h: float, bevel: float | None = None, grounded: bool = False) -> Piece:
    """Extrude a footprint polygon of (x, y) points, counter-clockwise from above, up to z = h."""
    bm = _new()
    low = [bm.verts.new((p[0], p[1], 0)) for p in points]
    top = [bm.verts.new((p[0], p[1], h)) for p in points]
    n = len(points)
    bottom_face = bm.faces.new(low[::-1])
    bm.faces.new(top)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((low[i], low[j], top[j], top[i]))
    piece = _finish(bm)
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    width = _auto_bevel(max(xs) - min(xs), max(ys) - min(ys), h) if bevel is None else bevel
    if grounded:
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z < -0.9 and abs(f.calc_center_median().z) < 1e-6], context="FACES_ONLY")
        bm.normal_update()
        if width > 0:
            limit = math.radians(30)
            edges = [
                e for e in bm.edges
                if len(e.link_faces) == 2 and e.calc_face_angle(0.0) > limit
                and not all(abs(v.co.z) < 1e-6 for v in e.verts)
            ]
            bmesh.ops.bevel(bm, geom=edges, offset=width, offset_type="OFFSET", segments=1,
                            profile=0.5, affect="EDGES", clamp_overlap=True)
            bm.normal_update()
    else:
        piece.bevel(width)
    return piece.color("#ffffff")


def profile_x(points: Sequence[Sequence[float]], width: float, bevel: float | None = None) -> Piece:
    """Extrude a SIDE silhouette of (y, z) points along x, centred. Good for car bodies, gables,
    wedges and ramps. List the points counter-clockwise as seen from the +x side."""
    piece = prism([(p[0], p[1]) for p in points], width, bevel=0)
    # prism built (y, z, 0..w) in xy; remap to (x = extrude, y = p0, z = p1) and centre.
    piece.warp(lambda co: (co.z - width / 2, co.x, co.y))
    bmesh.ops.recalc_face_normals(piece.bm, faces=piece.bm.faces[:])
    ys = [p[0] for p in points]
    zs = [p[1] for p in points]
    return piece.bevel(_auto_bevel(width, max(ys) - min(ys), max(zs) - min(zs)) if bevel is None else bevel)


def profile_y(points: Sequence[Sequence[float]], depth: float, bevel: float | None = None) -> Piece:
    """Extrude a FRONT silhouette of (x, z) points along y, centred. Good for arches, signs,
    wing sections and shaped walls. List the points counter-clockwise as seen from the front."""
    piece = prism([(p[0], p[1]) for p in points], depth, bevel=0)
    piece.warp(lambda co: (co.x, depth / 2 - co.z, co.y))
    bmesh.ops.recalc_face_normals(piece.bm, faces=piece.bm.faces[:])
    xs = [p[0] for p in points]
    zs = [p[1] for p in points]
    return piece.bevel(_auto_bevel(depth, max(xs) - min(xs), max(zs) - min(zs)) if bevel is None else bevel)


def _frames(points: list[Vector]):
    """Parallel-transport frames along a polyline: (tangent, normal, binormal) per point."""
    tangents = []
    for i, p in enumerate(points):
        a = points[max(0, i - 1)]
        b = points[min(len(points) - 1, i + 1)]
        tangents.append((b - a).normalized())
    t0 = tangents[0]
    helper = Vector((0, 0, 1)) if abs(t0.z) < 0.9 else Vector((1, 0, 0))
    normal = t0.cross(helper).normalized()
    frames = []
    for i, t in enumerate(tangents):
        if i:
            axis = tangents[i - 1].cross(t)
            if axis.length > 1e-8:
                angle = tangents[i - 1].angle(t)
                normal = (Matrix.Rotation(angle, 3, axis.normalized()) @ normal).normalized()
        normal = (normal - t * normal.dot(t)).normalized()
        frames.append((t, normal, t.cross(normal).normalized()))
    return frames


def tube(
    points: Sequence[Vec3],
    r: float | Sequence[float] = 0.05,
    sides: int = 8,
    caps: str = "flat",
    squash: float = 1.0,
) -> Piece:
    """Sweep a round section along a polyline: pipes, limbs, masts, cables, branches, railings.

    `r` may be one radius or one per point (tapered limbs). `caps` is "flat", "round" or "none".
    `squash` flattens the section along its binormal (1 = round).
    """
    pts = [Vector(p) for p in points]
    radii = [r] * len(pts) if isinstance(r, (int, float)) else list(r)
    if caps == "round":
        # Extend each end with a small hemisphere of points.
        steps = 2 if sides > 6 else 1
        head, tail = [], []
        d0 = (pts[0] - pts[1]).normalized()
        d1 = (pts[-1] - pts[-2]).normalized()
        for i in range(steps, 0, -1):
            a = i / (steps + 0.35) * math.pi / 2
            head.append((pts[0] + d0 * math.sin(a) * radii[0], radii[0] * math.cos(a)))
            tail.insert(0, (pts[-1] + d1 * math.sin(a) * radii[-1], radii[-1] * math.cos(a)))
        pts = [p for p, _ in head] + pts + [p for p, _ in tail]
        radii = [q for _, q in head] + radii + [q for _, q in tail]
    frames = _frames(pts)
    bm = _new()
    rings = []
    for p, rad, (_, n, b) in zip(pts, radii, frames):
        rings.append(
            [
                bm.verts.new(
                    p
                    + n * math.cos(i / sides * math.tau) * rad
                    + b * math.sin(i / sides * math.tau) * rad * squash
                )
                for i in range(sides)
            ]
        )
    for a, b in zip(rings, rings[1:]):
        for i in range(sides):
            j = (i + 1) % sides
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if caps != "none":
        bm.faces.new(rings[0][::-1])
        bm.faces.new(rings[-1])
    return _finish(bm)


def torus(R: float, r: float, segments: int = 24, sides: int = 8, arc: float = 360.0) -> Piece:
    """A ring lying in the xy plane, centred on the origin. `arc` < 360 gives an open arc."""
    full = arc >= 359.999
    count = segments if full else segments + 1
    pts = [
        (math.cos(math.radians(arc) * i / segments) * R, math.sin(math.radians(arc) * i / segments) * R, 0)
        for i in range(count)
    ]
    if not full:
        return tube(pts, r, sides)
    bm = _new()
    rings = []
    for i in range(segments):
        a = i / segments * math.tau
        centre = Vector((math.cos(a) * R, math.sin(a) * R, 0))
        out = Vector((math.cos(a), math.sin(a), 0))
        rings.append(
            [
                bm.verts.new(centre + out * math.cos(k / sides * math.tau) * r + Vector((0, 0, 1)) * math.sin(k / sides * math.tau) * r)
                for k in range(sides)
            ]
        )
    for i in range(segments):
        a, b = rings[i], rings[(i + 1) % segments]
        for k in range(sides):
            j = (k + 1) % sides
            bm.faces.new((a[k], b[k], b[j], a[j]))
    return _finish(bm)


def annulus(r_out: float, r_in: float, h: float, sides: int = 24, bevel: float | None = None) -> Piece:
    """A flat ring (washer) standing on z = 0: rims, pads, collars, wheels' tyres."""
    b = _auto_bevel(r_out - r_in, h) if bevel is None else bevel
    b = min(b, h * 0.45, (r_out - r_in) * 0.45)
    pts = [(r_in + b, 0), (r_out - b, 0), (r_out, b), (r_out, h - b), (r_out - b, h), (r_in + b, h), (r_in, h - b), (r_in, b)]
    bm = _new()
    rings = [
        [bm.verts.new((math.cos(i / sides * math.tau) * rr, math.sin(i / sides * math.tau) * rr, z)) for i in range(sides)]
        for rr, z in pts
    ]
    for k in range(len(rings)):
        a, c = rings[k], rings[(k + 1) % len(rings)]
        for i in range(sides):
            j = (i + 1) % sides
            bm.faces.new((a[i], a[j], c[j], c[i]))
    return _finish(bm)


def superellipse(rx: float, rz: float, sides: int, power: float = 2.0) -> list[tuple[float, float]]:
    out = []
    for i in range(sides):
        a = i / sides * math.tau
        c, s = math.cos(a), math.sin(a)
        out.append(
            (
                rx * math.copysign(abs(c) ** (2 / power), c),
                rz * math.copysign(abs(s) ** (2 / power), s),
            )
        )
    return out


def loft(
    sections: Sequence[Sequence[float]],
    sides: int = 12,
    power: float = 2.4,
    caps: str = "flat",
) -> Piece:
    """Skin a body through cross-sections along the y axis (front at -y).

    Each section is (y, rx, rz) or (y, rx, rz, cz) or (y, rx, rz, cz, cx): half-width, half-height
    and the section centre. `power` 2 is an ellipse, 4 a rounded box. Radii of 0 close to a point.
    Use it for hulls, fuselages, car shells, animal torsos, heads and helmets.
    """
    bm = _new()
    rings = []
    for s in sections:
        y, rx, rz = s[0], s[1], s[2]
        cz = s[3] if len(s) > 3 else 0.0
        cx = s[4] if len(s) > 4 else 0.0
        if rx <= 1e-6 or rz <= 1e-6:
            rings.append(bm.verts.new((cx, y, cz)))
        else:
            rings.append([bm.verts.new((cx + x, y, cz + z)) for x, z in superellipse(rx, rz, sides, power)])
    for a, b in zip(rings, rings[1:]):
        a_point, b_point = not isinstance(a, list), not isinstance(b, list)
        if a_point and b_point:
            continue
        for i in range(sides):
            j = (i + 1) % sides
            if a_point:
                bm.faces.new((a, b[i], b[j]))
            elif b_point:
                bm.faces.new((a[j], a[i], b))
            else:
                bm.faces.new((a[j], a[i], b[i], b[j]))
    if caps == "flat":
        if isinstance(rings[0], list):
            bm.faces.new(rings[0])
        if isinstance(rings[-1], list):
            bm.faces.new(rings[-1][::-1])
    return _finish(bm)


def plate(points: Sequence[Sequence[float]], thickness: float, bevel: float = 0.0) -> Piece:
    """A thin slab from a flat outline of (x, y) points lying on z = 0 (thickness goes up)."""
    return prism(points, thickness, bevel=bevel)


def raw(verts: Sequence[Vec3], faces: Sequence[Sequence[int]]) -> Piece:
    """A custom mesh from vertex positions and face index lists (counter-clockwise outside)."""
    bm = _new()
    vs = [bm.verts.new(v) for v in verts]
    for f in faces:
        bm.faces.new([vs[i] for i in f])
    return _finish(bm)


# --------------------------------------------------------------------------------------------
# Asset
# --------------------------------------------------------------------------------------------
class Asset:
    """Collects pieces. Builder methods mirror the free functions and register the piece."""

    def __init__(self, name: str):
        self.name = name
        self.pieces: list[Piece] = []
        #: Stands on the ground: bake a contact shadow against z = 0. Aircraft set this False.
        self.grounded = True
        self.backs = 0
        self.rand = _random.Random(hash_seed(name))

    def add(self, *pieces: Piece) -> Piece:
        self.pieces.extend(pieces)
        return pieces[-1]

    def group(self) -> "Group":
        """Collect the pieces added inside a `with` block so they can be transformed together."""
        return Group(self)

    # Primitive wrappers --------------------------------------------------------------------
    def box(self, *a, **k) -> Piece:
        return self.add(box(*a, **k))

    def cyl(self, *a, **k) -> Piece:
        return self.add(cyl(*a, **k))

    def cone(self, *a, **k) -> Piece:
        return self.add(cone(*a, **k))

    def lathe(self, *a, **k) -> Piece:
        return self.add(lathe(*a, **k))

    def sphere(self, *a, **k) -> Piece:
        return self.add(sphere(*a, **k))

    def dome(self, *a, **k) -> Piece:
        return self.add(dome(*a, **k))

    def capsule(self, *a, **k) -> Piece:
        return self.add(capsule(*a, **k))

    def ico(self, *a, **k) -> Piece:
        return self.add(ico(*a, **k))

    def blob(self, *a, **k) -> Piece:
        return self.add(blob(*a, **k))

    def prism(self, *a, **k) -> Piece:
        return self.add(prism(*a, **k))

    def profile_x(self, *a, **k) -> Piece:
        return self.add(profile_x(*a, **k))

    def profile_y(self, *a, **k) -> Piece:
        return self.add(profile_y(*a, **k))

    def tube(self, *a, **k) -> Piece:
        return self.add(tube(*a, **k))

    def torus(self, *a, **k) -> Piece:
        return self.add(torus(*a, **k))

    def annulus(self, *a, **k) -> Piece:
        return self.add(annulus(*a, **k))

    def loft(self, *a, **k) -> Piece:
        return self.add(loft(*a, **k))

    def plate(self, *a, **k) -> Piece:
        return self.add(plate(*a, **k))

    def raw(self, *a, **k) -> Piece:
        return self.add(raw(*a, **k))

    # Queries -------------------------------------------------------------------------------
    def bounds(self) -> tuple[Vector, Vector]:
        lo = Vector((1e9, 1e9, 1e9))
        hi = Vector((-1e9, -1e9, -1e9))
        for p in self.pieces:
            a, b = p.bounds()
            lo = Vector((min(lo.x, a.x), min(lo.y, a.y), min(lo.z, a.z)))
            hi = Vector((max(hi.x, b.x), max(hi.y, b.y), max(hi.z, b.z)))
        return lo, hi

    @property
    def triangles(self) -> int:
        return sum(p.triangles for p in self.pieces)


class Group:
    """Pieces added inside `with a.group() as g:`; transform them together afterwards."""

    def __init__(self, asset: Asset):
        self.asset = asset
        self.start = 0
        self.pieces: list[Piece] = []

    def __enter__(self) -> "Group":
        self.start = len(self.asset.pieces)
        return self

    def __exit__(self, *exc):
        self.pieces = self.asset.pieces[self.start :]
        return False

    def _each(self, fn) -> "Group":
        for p in self.pieces:
            fn(p)
        return self

    def move(self, x=0, y=0, z=0) -> "Group":
        return self._each(lambda p: p.move(x, y, z))

    def rot(self, x=0, y=0, z=0, pivot=(0, 0, 0)) -> "Group":
        return self._each(lambda p: p.rot(x, y, z, pivot))

    def scale(self, x, y=None, z=None) -> "Group":
        return self._each(lambda p: p.scale(x, y, z))

    def apply(self, m: Matrix) -> "Group":
        return self._each(lambda p: p.apply(m))

    def copies(self) -> list[Piece]:
        """Duplicate every piece of the group into the asset and return the duplicates."""
        made = [p.copy() for p in self.pieces]
        self.asset.pieces.extend(made)
        return made

    def mirror(self, axis: str = "x") -> "Group":
        """Add a mirrored copy of the group across the plane through the origin."""
        s = [1, 1, 1]
        s["xyz".index(axis)] = -1
        made = self.copies()
        for p in made:
            p.scale(*s)
        g = Group(self.asset)
        g.pieces = made
        return g

    def radial(self, count: int, axis: str = "z") -> list["Group"]:
        """Add count - 1 rotated copies around an axis through the origin."""
        out = []
        for i in range(1, count):
            made = self.copies()
            for p in made:
                p.rot(**{axis: 360 * i / count})
            g = Group(self.asset)
            g.pieces = made
            out.append(g)
        return out


def hash_seed(text: str) -> int:
    h = 2166136261
    for ch in text:
        h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
    return h


# --------------------------------------------------------------------------------------------
# Registry
# --------------------------------------------------------------------------------------------
REGISTRY: dict[str, dict] = {}


def asset(
    name: str,
    tint: str = "#ffffff",
    dark: bool = False,
    grounded: bool = True,
    budget: int = 1500,
    note: str = "",
    preview: bool = False,
):
    """Register a model builder.

    `tint` is the default per-instance colour multiplied into `tint` and `metal` parts.
    `dark=True` also emits `<name>-dark`, where `lit` panes are unlit glass instead of glow.
    `budget` is the triangle ceiling the build enforces. `preview=True` marks an assembly that
    exists only for review sheets and is never exported.
    """

    def wrap(fn):
        REGISTRY[name] = dict(
            name=name, build=fn, tint=tint, dark=dark, grounded=grounded, budget=budget, note=note,
            preview=preview, module=fn.__module__,
        )
        return fn

    return wrap


# --------------------------------------------------------------------------------------------
# Baking: normals, ambient occlusion, painted light
# --------------------------------------------------------------------------------------------
def _hemisphere(count: int) -> list[Vector]:
    out = []
    golden = math.pi * (3 - math.sqrt(5))
    for i in range(count):
        u = (i + 0.5) / count
        r = math.sqrt(u)
        a = i * golden
        out.append(Vector((r * math.cos(a), r * math.sin(a), math.sqrt(max(0.0, 1 - u)))))
    return out


_RAYS = _hemisphere(28)


def _islands(bm: bmesh.types.BMesh) -> list[list[bmesh.types.BMFace]]:
    """Faces grouped by connection through shared edges."""
    bm.faces.index_update()
    seen: set[int] = set()
    out = []
    for face in bm.faces:
        if face.index in seen:
            continue
        seen.add(face.index)
        island, stack = [], [face]
        while stack:
            f = stack.pop()
            island.append(f)
            for edge in f.edges:
                for other in edge.link_faces:
                    if other.index not in seen:
                        seen.add(other.index)
                        stack.append(other)
        out.append(island)
    return out


def _orient(bm: bmesh.types.BMesh) -> set[int]:
    """Turn inside-out shells the right way round and report which faces belong to open shells.

    The website draws front faces only. A closed shell whose normals point inward has negative
    volume, which is exact; an open shell is taken to face away from its own middle.
    """
    open_faces: set[int] = set()
    for island in _islands(bm):
        areas = [f.calc_area() for f in island]
        total = sum(areas) or 1.0
        centres = [f.calc_center_median() for f in island]
        middle = Vector()
        for area, centre in zip(areas, centres):
            middle += centre * (area / total)
        outward = 0.0
        scale = 0.0
        for f, area, centre in zip(island, areas, centres):
            arm = centre - middle
            outward += area * f.normal.dot(arm)
            scale += area * arm.length
        if scale > 0 and outward < -0.02 * scale:
            bmesh.ops.reverse_faces(bm, faces=island)
        if any(len(e.link_faces) != 2 for f in island for e in f.edges):
            open_faces.update(f.index for f in island)
    bm.normal_update()
    return open_faces


def bake(a: Asset, ao_strength: float = 0.62) -> dict:
    """Turn an asset into per-part triangle soups with normals and baked colour.

    Returns {part: {"position": [...], "normal": [...], "color": [...]}} with three vertices per
    triangle (unindexed), in the Blender frame, colours in linear RGB.
    """
    tris: list[tuple] = []  # (part, [(co, normal, colour, key)] * 3, piece_ao, open shell?)
    for index, piece in enumerate(a.pieces):
        bm = piece.bm
        if not bm.faces:
            continue
        bm.normal_update()
        open_faces = _orient(bm)
        bm.verts.index_update()
        bm.faces.index_update()
        layer = bm.loops.layers.color.get("c")
        part = piece._part
        flat = piece.shading == "flat"
        limit = piece.smooth_angle
        areas = {f.index: f.calc_area() for f in bm.faces}
        normals: dict[tuple[int, int], Vector] = {}
        for f in bm.faces:
            for loop in f.loops:
                if flat:
                    n = f.normal.copy()
                else:
                    n = Vector()
                    for g in loop.vert.link_faces:
                        if g is f or g.normal.angle(f.normal, 0.0) <= limit:
                            n += g.normal * (areas[g.index] ** 1.3)
                    n = n.normalized() if n.length > 1e-12 else f.normal.copy()
                normals[(f.index, loop.vert.index)] = n
        for loops in bm.calc_loop_triangles():
            corners = []
            for loop in loops:
                c = loop[layer]
                n = normals[(loop.face.index, loop.vert.index)]
                key = (index, loop.vert.index, round(n.x, 2), round(n.y, 2), round(n.z, 2))
                corners.append((loop.vert.co.copy(), n, (c[0], c[1], c[2]), key))
            tris.append(
                (part, corners, piece.ao and part not in ("glow", "lit"), loops[0].face.index in open_faces)
            )

    # Occlusion against the whole model plus the ground it stands on.
    verts: list[Vector] = []
    polys: list[tuple[int, int, int]] = []
    for _, corners, _, _ in tris:
        base = len(verts)
        verts.extend(c[0] for c in corners)
        polys.append((base, base + 1, base + 2))
    lo, hi = a.bounds()
    size = max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z)
    if a.grounded:
        g = size * 4
        base = len(verts)
        verts += [Vector((-g, -g, lo.z)), Vector((g, -g, lo.z)), Vector((g, g, lo.z)), Vector((-g, g, lo.z))]
        polys += [(base, base + 1, base + 2), (base, base + 2, base + 3)]
    tree = BVHTree.FromPolygons(verts, polys, epsilon=0.0)
    reach = max(0.25, size * 0.42)
    eps = max(0.004, size * 0.004)
    cache: dict[tuple, float] = {}

    def occlusion(co: Vector, n: Vector, key) -> float:
        value = cache.get(key)
        if value is not None:
            return value
        helper = Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((1, 0, 0))
        t = n.cross(helper).normalized()
        b = n.cross(t)
        origin = co + n * eps
        blocked = 0.0
        for ray in _RAYS:
            d = t * ray.x + b * ray.y + n * ray.z
            hit = tree.ray_cast(origin, d, reach)
            if hit[0] is not None:
                blocked += 1 - (hit[3] / reach) ** 1.5
        value = 1 - blocked / len(_RAYS)
        cache[key] = value
        return value

    # The site draws front faces only, so an open shell whose back can be seen from outside
    # (a sail, a membrane, the inside of a funnel) gets a back: a reversed copy of each such
    # triangle, shaded for its own side. Backs that look into a closed interior are left out.
    far = max(size * 6, 1.0)
    backs = []
    for part, corners, shaded, is_open in tris:
        if not is_open:
            continue
        p0, p1, p2 = (c[0] for c in corners)
        n = (p1 - p0).cross(p2 - p0)
        if n.length < 1e-12:
            continue
        n = -n.normalized()
        helper = Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((1, 0, 0))
        t = n.cross(helper).normalized()
        b = n.cross(t)
        origin = (p0 + p1 + p2) / 3 + n * eps
        seen_from_outside = False
        for ray in _RAYS:
            if tree.ray_cast(origin, t * ray.x + b * ray.y + n * ray.z, far)[0] is None:
                seen_from_outside = True
                break
        if seen_from_outside:
            backs.append(
                (part, [(co, -vn, c, key + ("back",)) for co, vn, c, key in reversed(corners)], shaded, False)
            )
    tris += backs
    #: Triangles added as backs; budgets count authored triangles only.
    a.backs = len(backs)

    out = {part: {"position": [], "normal": [], "color": []} for part in PARTS}
    for part, corners, shaded, _ in tris:
        target = out[part]
        for co, n, c, key in corners:
            if shaded:
                ao = occlusion(co, n, key)
                # Painted light: tops a touch brighter, undersides a touch deeper, then occlusion.
                k = (1 - ao_strength * (1 - ao)) * (0.94 + 0.08 * n.z)
                c = (c[0] * k, c[1] * k, c[2] * k)
            target["position"] += (co.x, co.y, co.z)
            target["normal"] += (n.x, n.y, n.z)
            target["color"] += c
    return {part: data for part, data in out.items() if data["position"]}


def build(name: str) -> tuple[Asset, dict]:
    """Build a registered asset and bake it."""
    entry = REGISTRY[name]
    a = Asset(name)
    a.grounded = entry["grounded"]
    entry["build"](a)
    baked = bake(a)
    for piece in a.pieces:
        piece.bm.free()
    return a, baked


def kinds() -> list[str]:
    """Every registered kind. `<kind>-dark` twins are aliases written by the exporter."""
    return list(REGISTRY)
