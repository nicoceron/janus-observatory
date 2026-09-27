"""Editable, original Blender portraits for the source-selected Janus Solar System.

This is interpretive art: architecture, counts, terrain and scales are not scientific
measurements. The caller supplies the reviewed footprint and owns scene lifecycle,
resource limits, rendering and export. No scene reset, external asset, texture,
modifier, simulation or background process is used here.

Coordinates are Blender-native: Z up, front -Y. All meshes are closed except the
intentional habitat cutaway (which has an inner wall and finished exposed edges).
Small construction methods are shared; settlement organization is scenario-specific.
"""

from __future__ import annotations

import math
from collections.abc import Iterator
from contextlib import contextmanager

import bmesh
import bpy
from mathutils import Matrix, Vector

TAU = math.tau
WORLD_IDS = {f"S{i}" for i in range(1, 11)}
BODY_NAMES = {"Moon", "Mars", "Venus"}
FEATURE_NAMES = {"asteroids", "outer", "kuiper", "solar"}

# Eleven plain Principled material families per portrait; no transparency stack.
STYLE = {
    "S1": ("d5d2bd", "59676c", "be9a59", "627d80", "78916c"),
    "S2": ("d5c7a9", "655e55", "db984f", "678791", "859461"),
    "S3": ("e8e5cf", "718381", "b7b897", "85b6bc", "92b67a"),
    "S4": ("d1c7a9", "797568", "ba945e", "88a3a0", "85935f"),
    "S5": ("ddd9bd", "70908b", "bea4aa", "95c5bb", "89b77c"),
    "S6": ("d3d9cc", "677d83", "c39862", "78b1b9", "7f9a7d"),
    "S7": ("d8cdb0", "747d73", "c59b6e", "97b9aa", "87a975"),
    "S8": ("c2bfa7", "656968", "b98f5c", "7a9294", "8b936c"),
    "S9": ("c5d0ce", "556876", "b5a27e", "85bbb9", "79998b"),
    "S10": ("e0d9bb", "69837f", "b4a57c", "89b8b6", "90ad74"),
}


def _linear(hex_color: str) -> tuple[float, float, float, float]:
    values = [int(hex_color[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(
        v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in values
    ) + (1,)


def _material(name: str, color: str, metallic: float = 0, roughness: float = 0.7):
    material = bpy.data.materials.get(name)
    if material is None:
        material = bpy.data.materials.new(name)
        material.use_nodes = True
        shader = material.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = _linear(color)
        shader.inputs["Roughness"].default_value = roughness
        shader.inputs["Metallic"].default_value = metallic
        material.diffuse_color = _linear(color)
    return material


class _Builder:
    def __init__(self, world: str, selection: str):
        self.world = world
        self.selection = selection
        self.prefix = f"{world}_{selection}"
        self.objects = []
        self.parent = None
        self.ground = None
        hull, metal, accent, glass, green = STYLE[world]
        if selection == "Moon":
            terrain = ("9ba7ad", "718391", "c3c6bd")
        elif selection == "Mars":
            terrain = ("ba7d5c", "8f5345", "dca277")
        elif selection == "Venus":
            terrain = ("d6ad75", "a67e5c", "e6c794")
        elif selection in {"outer", "kuiper"}:
            terrain = ("b0c7cc", "7c9ba8", "dae1d6")
        elif selection == "solar":
            terrain = ("e5b66e", "c69057", "f4d195")
        else:
            terrain = ("8b8580", "676978", "b0a898")
        colors = {
            "terrain": terrain[0],
            "terrain_dark": terrain[1],
            "terrain_light": terrain[2],
            "hull": hull,
            "metal": metal,
            "accent": accent,
            "glass": glass,
            "green": green,
            "panel": "344e65",
            "light": "dce9cd",
            "shadow": "364650",
        }
        self.mats = {
            key: _material(
                f"Janus_{self.prefix}_{key}",
                color,
                0.45 if key == "metal" else 0.25 if key == "panel" else 0.08,
                0.32 if key in {"glass", "panel"} else 0.7,
            )
            for key, color in colors.items()
        }

    def _link(self, obj, name, pos=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
        obj.name = f"{self.prefix}_{name}"
        obj["janus_part"] = name
        obj["content_class"] = "interpretive"
        bpy.context.collection.objects.link(obj)
        obj.parent = self.parent
        obj.location = pos
        obj.rotation_euler = rot
        obj.scale = scale
        self.objects.append(obj)
        return obj

    def mesh(self, name, verts, faces, material="hull", pos=(0, 0, 0), rot=(0, 0, 0)):
        data = bpy.data.meshes.new(f"{self.prefix}_{name}_mesh")
        data.from_pydata(verts, [], faces)
        data.materials.append(self.mats[material])
        data.update()
        return self._link(bpy.data.objects.new(name, data), name, pos, rot)

    @contextmanager
    def group(self, name, pos=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)) -> Iterator:
        old_parent = self.parent
        group = self._link(bpy.data.objects.new(name, None), name, pos, rot, scale)
        self.parent = group
        try:
            yield group
        finally:
            self.parent = old_parent

    def box(
        self, name, size, pos=(0, 0, 0), material="hull", bevel=0.008, rot=(0, 0, 0)
    ):
        # Small modeled chamfers survive glTF; no evaluated Bevel modifiers required.
        x, y, z = [v / 2 for v in size]
        b = min(bevel, x * 0.28, y * 0.28, z * 0.28)
        outline = [
            (-x + b, -y),
            (x - b, -y),
            (x, -y + b),
            (x, y - b),
            (x - b, y),
            (-x + b, y),
            (-x, y - b),
            (-x, -y + b),
        ]
        verts = []
        for height, inset in ((-z, b), (-z + b, 0), (z - b, 0), (z, b)):
            verts.extend(
                (px * (x - inset) / x, py * (y - inset) / y, height)
                for px, py in outline
            )
        faces = [tuple(reversed(range(8))), tuple(range(24, 32))]
        for layer in range(3):
            for i in range(8):
                j = (i + 1) % 8
                faces.append(
                    (
                        layer * 8 + i,
                        layer * 8 + j,
                        (layer + 1) * 8 + j,
                        (layer + 1) * 8 + i,
                    )
                )
        obj = self.mesh(name, verts, faces, material, pos, rot)
        self._ground_contact(obj, [(px, py, -z) for px, py in outline], name)
        return obj

    def cylinder(
        self,
        name,
        radius,
        depth,
        pos=(0, 0, 0),
        material="metal",
        vertices=12,
        top=None,
        rot=(0, 0, 0),
    ):
        top = radius if top is None else top
        verts = [
            (math.cos(i * TAU / vertices) * r, math.sin(i * TAU / vertices) * r, z)
            for z, r in ((-depth / 2, radius), (depth / 2, top))
            for i in range(vertices)
        ]
        faces = [tuple(reversed(range(vertices))), tuple(range(vertices, vertices * 2))]
        faces.extend(
            (i, (i + 1) % vertices, (i + 1) % vertices + vertices, i + vertices)
            for i in range(vertices)
        )
        obj = self.mesh(name, verts, faces, material, pos, rot)
        self._ground_contact(obj, verts[:vertices], name)
        return obj

    @staticmethod
    def _world_matrix(obj):
        if obj is None:
            return Matrix.Identity(4)
        local = obj.matrix_basis.copy()
        return _Builder._world_matrix(obj.parent) @ local if obj.parent else local

    def _ground_contact(self, obj, outline, name):
        # Individual foundations meet the sphere; no single giant ornamental island.
        tokens = (
            "foundation",
            "plinth",
            "apron",
            "saddle",
            "ground_anchor",
            "anchor_foot",
            "anchor_plate",
            "court_base",
            "foot",
            "tripod_pad",
            "shaft_collar",
            "ground_structure",
        )
        if self.ground is None or not any(token in name for token in tokens):
            return
        ground_frame, radius = self.ground
        parent_frame = self._world_matrix(self.parent)
        to_sphere = ground_frame.inverted() @ parent_frame
        from_sphere = to_sphere.inverted()
        top = [obj.matrix_basis @ Vector(p) for p in outline]
        bottom = []
        for point in top:
            projected = to_sphere @ point
            normal = projected.normalized()
            contact_radius = (
                _ice_radius(normal) if self.selection == "kuiper" else radius
            )
            projected = normal * (contact_radius - 0.026)
            bottom.append(from_sphere @ projected)
        if max((t - d).length for t, d in zip(top, bottom)) > 0.40:
            return
        count = len(top)
        faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
        faces.extend(
            (i, (i + 1) % count, (i + 1) % count + count, i + count)
            for i in range(count)
        )
        self.mesh(
            name + "_terrain_contact",
            bottom + top,
            faces,
            "terrain_dark" if "apron" in name else "metal",
        )

    def beam(self, name, a, b, radius=0.008, material="metal", vertices=6):
        direction = Vector(b) - Vector(a)
        obj = self.cylinder(
            name,
            radius,
            direction.length,
            (Vector(a) + Vector(b)) / 2,
            material,
            vertices,
        )
        obj.rotation_mode = "QUATERNION"
        obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
        return obj

    def tube(self, name, points, radius=0.006, material="metal", sides=6):
        points = [Vector(p) for p in points]
        verts = []
        for i, point in enumerate(points):
            tangent = points[min(i + 1, len(points) - 1)] - points[max(0, i - 1)]
            rotation = tangent.to_track_quat("Z", "Y")
            verts.extend(
                point
                + rotation
                @ Vector(
                    (
                        radius * math.cos(TAU * j / sides),
                        radius * math.sin(TAU * j / sides),
                        0,
                    )
                )
                for j in range(sides)
            )
        faces = [
            tuple(reversed(range(sides))),
            tuple(range((len(points) - 1) * sides, len(points) * sides)),
        ]
        for i in range(len(points) - 1):
            for j in range(sides):
                k = (j + 1) % sides
                faces.append(
                    (
                        i * sides + j,
                        i * sides + k,
                        (i + 1) * sides + k,
                        (i + 1) * sides + j,
                    )
                )
        return self.mesh(name, verts, faces, material)

    def ring(
        self,
        name,
        radius,
        thickness,
        pos=(0, 0, 0),
        material="accent",
        rot=(0, 0, 0),
        segments=20,
    ):
        verts = [
            (
                math.cos(TAU * i / segments)
                * (radius + thickness * math.cos(TAU * j / 5)),
                math.sin(TAU * i / segments)
                * (radius + thickness * math.cos(TAU * j / 5)),
                thickness * math.sin(TAU * j / 5),
            )
            for i in range(segments)
            for j in range(5)
        ]
        faces = [
            (
                i * 5 + j,
                ((i + 1) % segments) * 5 + j,
                ((i + 1) % segments) * 5 + (j + 1) % 5,
                i * 5 + (j + 1) % 5,
            )
            for i in range(segments)
            for j in range(5)
        ]
        return self.mesh(name, verts, faces, material, pos, rot)

    def ico(
        self,
        name,
        radius,
        pos=(0, 0, 0),
        material="terrain",
        scale=(1, 1, 1),
        subdivisions=2,
    ):
        data = bpy.data.meshes.new(f"{self.prefix}_{name}_mesh")
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, radius=radius)
        bm.to_mesh(data)
        bm.free()
        data.materials.append(self.mats[material])
        return self._link(bpy.data.objects.new(name, data), name, pos, scale=scale)

    @contextmanager
    def site(self, name, longitude, latitude, radius=0.82, scale=1):
        lon, lat = math.radians(longitude), math.radians(latitude)
        normal = Vector(
            (
                math.sin(lon) * math.cos(lat),
                -math.cos(lon) * math.cos(lat),
                math.sin(lat),
            )
        )
        old_ground = self.ground
        ground_frame = self._world_matrix(self.parent)
        with self.group(name, normal * radius, scale=(scale, scale, scale)) as group:
            group.rotation_mode = "QUATERNION"
            group.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(normal)
            self.ground = (ground_frame, radius)
            try:
                yield group
            finally:
                self.ground = old_ground


def _panel(b, name, pos, width=0.22, length=0.17, yaw=0, thermal=False):
    with b.group(name, pos, (0.25, 0, yaw)):
        b.box("panel_structural_back", (width, length, 0.014), material="metal")
        for ix in range(3):
            b.box(
                f"separated_cell_{ix}",
                (width / 3 - 0.009, length - 0.012, 0.008),
                ((ix - 1) * width / 3, 0, 0.011),
                "hull" if thermal else "panel",
                bevel=0.001,
            )
        b.beam("mast", (0, 0, -0.015), (0, 0, -0.10), 0.009)
        b.box("foot", (0.06, 0.055, 0.022), (0, 0, -0.095), "metal")


def _airlock(b, name="airlock", pos=(0, -0.105, 0.07), width=0.073):
    with b.group(name, pos):
        b.box("pressure_frame", (width + 0.027, 0.04, 0.095), material="metal")
        b.box("recessed_pressure_door", (width, 0.012, 0.075), (0, -0.026, 0), "shadow")
        b.box("inset_door_panel", (width * 0.76, 0.009, 0.062), (0, -0.035, 0), "hull")
        b.box("door_split", (0.004, 0.008, 0.058), (0, -0.041, 0), "metal", bevel=0.001)
        b.box(
            "status_light",
            (0.012, 0.006, 0.009),
            (width * 0.40, -0.043, 0.02),
            "light",
            bevel=0.001,
        )
        b.box("landing", (width + 0.04, 0.066, 0.022), (0, -0.045, -0.055), "metal")


def _pod(
    b, name, pos=(0, 0, 0), length=0.30, width=0.16, height=0.15, yaw=0, windows=True
):
    with b.group(name, pos, (0, 0, yaw)):
        z0 = height / 2 + 0.025
        sides = 12
        verts = []
        for x, taper in (
            (-length / 2, 0.65),
            (-length / 2 + 0.025, 1),
            (length / 2 - 0.025, 1),
            (length / 2, 0.65),
        ):
            verts.extend(
                (
                    x,
                    math.cos(i * TAU / sides) * width * taper / 2,
                    z0 + math.sin(i * TAU / sides) * height * taper / 2,
                )
                for i in range(sides)
            )
        faces = [tuple(reversed(range(sides))), tuple(range(sides * 3, sides * 4))]
        faces.extend(
            (
                layer * sides + i,
                layer * sides + (i + 1) % sides,
                (layer + 1) * sides + (i + 1) % sides,
                (layer + 1) * sides + i,
            )
            for layer in range(3)
            for i in range(sides)
        )
        b.mesh("insulated_pressure_hull", verts, faces)
        for sign in (-1, 1):
            b.box(
                "hull_saddle",
                (0.045, width * 0.9, 0.055),
                (sign * length * 0.30, 0, 0.026),
                "metal",
            )
            # Elliptical insulation bands are modeled around the pressure hull.
            ring = b.ring(
                "insulation_band",
                0.5,
                0.019,
                (sign * length * 0.28, 0, z0),
                "accent",
                (0, math.pi / 2, 0),
                segments=12,
            )
            ring.scale = (height, width, 0.21)
        if windows:
            for x in (-length * 0.19, length * 0.19):
                b.box(
                    "window_bezel",
                    (0.065, 0.018, 0.055),
                    (x, -width * 0.476, z0 + 0.018),
                    "metal",
                )
                b.box(
                    "inset_glazing",
                    (0.052, 0.008, 0.040),
                    (x, -width * 0.54, z0 + 0.018),
                    "glass",
                    bevel=0.002,
                )
        b.box(
            "roof_service_spine",
            (length * 0.67, 0.036, 0.025),
            (0, 0, height + 0.029),
            "metal",
        )
        _airlock(b, pos=(0, -width / 2 - 0.015, 0.075))


def _glasshouse(b, name, pos=(0, 0, 0), length=0.29, width=0.19, height=0.15, yaw=0):
    with b.group(name, pos, (0, 0, yaw)):
        b.box(
            "insulated_growth_plinth",
            (length + 0.035, width + 0.03, 0.045),
            (0, 0, 0.022),
            "hull",
        )
        ribs = [
            (
                math.cos(math.pi * j / 8) * width / 2,
                0.04 + math.sin(math.pi * j / 8) * height,
            )
            for j in range(9)
        ]
        verts = [(x, y, z) for x in (-length / 2, length / 2) for y, z in ribs]
        faces = [tuple(reversed(range(9))), tuple(range(9, 18))]
        faces.extend((i, i + 1, i + 10, i + 9) for i in range(8))
        faces.append((0, 9, 17, 8))
        b.mesh("faceted_growth_glazing", verts, faces, "glass")
        for x in (-length / 2, -length / 6, length / 6, length / 2):
            b.tube(
                "arched_pressure_rib",
                [(x, y, z + 0.003) for y, z in ribs],
                0.0045,
                "hull",
            )
        b.box(
            "longitudinal_ridge",
            (length + 0.01, 0.016, 0.016),
            (0, 0, height + 0.045),
            "accent",
        )
        _airlock(b, pos=(0, -width / 2 - 0.016, 0.078))
        for x in (-length * 0.3, length * 0.3):
            b.box(
                "growth_service_canister",
                (0.042, 0.033, 0.078),
                (x, width / 2 + 0.012, 0.046),
                "green",
            )


def _link(b, name, a, c, radius=0.030):
    b.beam(name, a, c, radius, "hull", 10)
    direction = Vector(c) - Vector(a)
    for i in (0.20, 0.80):
        collar = b.ring(
            "connector_pressure_collar",
            radius * 1.02,
            radius * 0.14,
            Vector(a) + direction * i,
            "metal",
            segments=12,
        )
        collar.rotation_mode = "QUATERNION"
        collar.rotation_quaternion = direction.to_track_quat("Z", "Y")


def _dish(b, name, pos=(0, 0, 0), size=0.12, yaw=0):
    with b.group(name, pos, (0, 0, yaw)):
        for x, y in ((-0.04, -0.03), (0.04, -0.03), (0, 0.04)):
            b.beam("tripod_leg", (x, y, 0), (0, 0, 0.10), 0.006)
            b.box("tripod_pad", (0.031, 0.024, 0.012), (x, y, 0.003), "metal")
        with b.group("dish_gimbal", (0, 0, 0.12), (0.75, 0, 0)):
            verts, faces = [], []
            for z, r in (
                (-0.012, 0.016),
                (0.006, size * 0.31),
                (0.028, size * 0.5),
                (0.034, size * 0.5),
                (0.010, size * 0.30),
                (0, 0.016),
            ):
                verts.extend(
                    (r * math.cos(TAU * i / 16), r * math.sin(TAU * i / 16), z)
                    for i in range(16)
                )
            for layer in range(5):
                faces.extend(
                    (
                        layer * 16 + i,
                        layer * 16 + (i + 1) % 16,
                        (layer + 1) * 16 + (i + 1) % 16,
                        (layer + 1) * 16 + i,
                    )
                    for i in range(16)
                )
            faces.extend(
                (i, (i + 1) % 16, 80 + (i + 1) % 16, 80 + i) for i in range(16)
            )
            b.mesh("thick_parabolic_reflector", verts, faces, "hull")
            for x in (-size * 0.42, size * 0.42):
                b.beam("receiver_strut", (x, 0, 0.027), (0, 0, 0.105), 0.003, "metal")
            b.cylinder("feed_receiver", 0.012, 0.025, (0, 0, 0.106), "accent", 8)


def _radiator(b, name, pos=(0, 0, 0), width=0.19, height=0.20, yaw=0):
    with b.group(name, pos, (0, 0, yaw)):
        b.box(
            "radiator_foundation", (width + 0.035, 0.085, 0.028), (0, 0, 0.014), "metal"
        )
        for x in (-width * 0.38, width * 0.38):
            b.beam("fin_support", (x, 0, 0.02), (x, 0, height), 0.008, "accent")
        for i in range(5):
            b.box(
                "separated_thermal_fin",
                (width, 0.038, 0.015),
                (0, 0, 0.065 + i * (height - 0.06) / 5),
                "hull",
                bevel=0.002,
            )
        b.tube(
            "coolant_feed",
            [
                (-width * 0.48, 0.014, height),
                (-width * 0.48, 0.04, 0.045),
                (0, 0.065, 0.045),
            ],
            0.006,
            "metal",
        )


def _process(b, name, pos=(0, 0, 0), variant=0, scale=1):
    with b.group(name, pos, scale=(scale, scale, scale)):
        b.box("plant_foundation", (0.28, 0.22, 0.035), (0, 0, 0.012), "metal")
        for x, r, h in ((-0.075, 0.062, 0.23), (0.073, 0.044, 0.17)):
            b.cylinder(
                "insulated_pressure_vessel", r, h, (x, 0, h / 2 + 0.034), "hull", 10
            )
            b.cylinder(
                "vessel_stepped_cap",
                r * 1.06,
                0.02,
                (x, 0, h + 0.035),
                "accent",
                10,
                top=r * 0.74,
            )
            for z in (0.083, h * 0.75):
                b.ring(
                    "vessel_reinforcement",
                    r * 1.015,
                    0.006,
                    (x, 0, z),
                    "metal",
                    segments=12,
                )
        b.tube(
            "redundant_transfer_pipe",
            [
                (-0.074, 0, 0.27),
                (-0.074, 0.067, 0.28),
                (0.073, 0.067, 0.28),
                (0.073, 0, 0.19),
            ],
            0.009,
            "accent",
        )
        b.box("service_valve_block", (0.063, 0.045, 0.075), (0, -0.094, 0.067), "metal")
        b.cylinder(
            "valve_stem",
            0.008,
            0.039,
            (0, -0.129, 0.074),
            "accent",
            8,
            rot=(math.pi / 2, 0, 0),
        )
        b.ring(
            "valve_wheel",
            0.024,
            0.004,
            (0, -0.15, 0.074),
            "hull",
            (math.pi / 2, 0, 0),
            segments=10,
        )
        if variant:
            _radiator(b, "plant_heat_exchanger", (0.18, 0.04, 0), 0.13, 0.20, 0.20)
            _link(
                b,
                "heat_exchanger_connection",
                (0.10, 0.045, 0.06),
                (0.18, 0.09, 0.06),
                0.011,
            )


def _thermal_court(b, pos=(0, 0, 0), scale=1):
    with b.group("connected_thermal_service_court", pos, scale=(scale, scale, scale)):
        b.box("service_court_foundation", (0.20, 0.16, 0.028), (0, 0, 0.006), "metal")
        b.cylinder(
            "water_recovery_reservoir", 0.044, 0.14, (-0.05, -0.015, 0.094), "hull", 10
        )
        b.cylinder(
            "reservoir_insulated_lid",
            0.051,
            0.017,
            (-0.05, -0.015, 0.172),
            "accent",
            10,
        )
        b.ring(
            "reservoir_joint",
            0.045,
            0.005,
            (-0.05, -0.015, 0.105),
            "metal",
            segments=12,
        )
        b.box(
            "pressure_control_cabinet",
            (0.067, 0.074, 0.125),
            (0.045, -0.04, 0.083),
            "hull",
        )
        b.box(
            "cabinet_inset_display",
            (0.043, 0.006, 0.031),
            (0.045, -0.080, 0.108),
            "glass",
            bevel=0.001,
        )
        _radiator(b, "court_radiator", (0.015, 0.093, -0.009), 0.18, 0.23)
        b.tube(
            "reservoir_coolant_supply",
            [(-0.05, -0.015, 0.17), (-0.07, 0.08, 0.18), (-0.045, 0.095, 0.13)],
            0.008,
            "accent",
        )
        b.tube(
            "cabinet_return_manifold",
            [(0.07, -0.025, 0.065), (0.10, 0.04, 0.065), (0.07, 0.09, 0.065)],
            0.007,
            "metal",
        )


def _power_station(b, compact=False):
    with b.group("dedicated_energy_yard"):
        b.box("energy_yard_foundation", (0.20, 0.19, 0.026), (0, 0, -0.005), "metal")
        b.box("shielded_energy_bus", (0.10, 0.095, 0.13), (0, -0.025, 0.071), "hull")
        inlet = b.box(
            "power_cable_inlet", (0.064, 0.018, 0.052), (0, -0.082, 0.054), "accent"
        )
        b.box(
            "bus_recessed_access", (0.069, 0.007, 0.061), (0, -0.078, 0.092), "shadow"
        )
        b.box(
            "bus_status_strip",
            (0.029, 0.007, 0.009),
            (0, -0.084, 0.116),
            "light",
            bevel=0.001,
        )
        _panel(
            b,
            "tilted_primary_conversion_array",
            (-0.125, 0.083, 0.12),
            0.22 if compact else 0.29,
            0.17 if compact else 0.22,
            -0.3,
        )
        if not compact:
            _panel(
                b, "secondary_conversion_array", (0.115, 0.067, 0.096), 0.19, 0.16, 0.15
            )
        b.tube(
            "supported_array_feed",
            [(-0.12, 0.084, 0.025), (-0.095, -0.015, 0.027), (0, -0.024, 0.045)],
            0.008,
            "metal",
        )
        return inlet


def _surface_connection(b, start, end, radius=0.835):
    """A paired service connection with physical endpoints, not a decorative orbit."""
    frame = b._world_matrix(b.parent).inverted()
    a = frame @ b._world_matrix(start).translation
    c = frame @ b._world_matrix(end).translation
    points = [a]
    for i in range(1, 15):
        u = i / 15
        direction = a.normalized().lerp(c.normalized(), u).normalized()
        points.append(direction * radius)
    points.append(c)
    b.tube("ground_following_power_conduit", points, 0.0075, "metal")
    # Visible saddles are restrained structural supports, not paths or dotted lights.
    for i in (3, 7, 11):
        position = points[i]
        normal = position.normalized()
        foot = b.box(
            "power_conduit_ground_saddle",
            (0.026, 0.019, 0.018),
            position - normal * 0.006,
            "accent",
            bevel=0.003,
        )
        foot.rotation_mode = "QUATERNION"
        foot.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(normal)


def _crane(b, name, pos=(0, 0, 0), machine=False):
    with b.group(name, pos):
        b.cylinder("anchored_slew_base", 0.07, 0.055, (0, 0, 0.028), "metal", 10)
        b.cylinder("slew_bearing", 0.046, 0.035, (0, 0, 0.073), "accent", 10)
        with b.group("shoulder_pivot", (0, 0, 0.09)):
            a, c, d = (0, 0, 0), (0.09, 0, 0.17), (0.22, -0.015, 0.12)
            b.beam("boom_lower", a, c, 0.027, "hull", 6)
            b.beam("boom_upper", c, d, 0.022, "metal", 6)
            b.beam(
                "hydraulic_cylinder",
                (0.014, -0.03, 0.035),
                (0.09, -0.03, 0.13),
                0.01,
                "accent",
            )
            b.cylinder(
                "elbow_bearing", 0.034, 0.072, c, "accent", 10, rot=(math.pi / 2, 0, 0)
            )
            for side in (-1, 1):
                b.tube(
                    "tool_finger" if machine else "cargo_grapple",
                    [
                        (0.22, -0.015, 0.12),
                        (0.25, side * 0.041, 0.07),
                        (0.27, side * 0.027, 0.045),
                    ],
                    0.009,
                    "hull",
                )


def _mars_valley(normal):
    # A regional, tapering valley with branching erosion, never an equatorial seam.
    extent = math.exp(-(((normal.x + 0.06) / 0.57) ** 6)) * max(0, min(1, (-normal.y - 0.18) / 0.45))
    center = -0.12 - normal.x * 0.20 + 0.048 * math.sin(normal.x * 7) + 0.012 * math.sin(normal.x * 19)
    width = 0.047 + 0.013 * (1 + math.sin(normal.x * 11))
    distance = abs(normal.z - center)
    main = math.exp(-((distance / width) ** 2))
    branch_distance = abs(normal.z - center - 0.14 - normal.x * 0.25)
    branch = math.exp(-((branch_distance / 0.024) ** 2)) * math.exp(-(((normal.x + 0.19) / 0.25) ** 4))
    return extent, distance, width, main, branch


def _terrain(b, body, radius=0.82):
    obj = b.ico("faceted_planetary_body", radius, subdivisions=5 if body in {"Moon", "Mars"} else 4)
    obj.data.materials.append(b.mats["terrain_dark"])
    obj.data.materials.append(b.mats["terrain_light"])
    obj.data.materials.append(b.mats["green"])
    obj.data.materials.append(b.mats["glass"])
    craters = [
        (Vector((-0.52, -0.80, -0.18)).normalized(), 0.25),
        (Vector((0.59, -0.74, 0.09)).normalized(), 0.18),
        (Vector((-0.22, -0.48, -0.81)).normalized(), 0.21),
        (Vector((0.52, 0.15, 0.84)).normalized(), 0.24),
        (Vector((-0.68, 0.47, 0.38)).normalized(), 0.17),
    ]
    for vertex in obj.data.vertices:
        normal = vertex.co.normalized()
        displacement = (
            0.010 * math.sin(normal.x * 16 + normal.y * 9) * math.cos(normal.z * 13)
        )
        if body == "Moon":
            for center, size in craters:
                distance = (normal - center).length
                displacement -= 0.061 * math.exp(-((distance / (size * 0.74)) ** 4))
                displacement += 0.018 * math.exp(-(((distance - size) / 0.037) ** 2))
        elif body == "Mars":
            extent, valley, width, main, branch = _mars_valley(normal)
            displacement -= extent * (0.059 * main + 0.027 * branch)
            displacement += extent * 0.008 * math.exp(-(((valley - width * 1.4) / 0.03) ** 2))
            displacement += max(0, math.sin(normal.x * 6 - normal.z * 8)) * 0.014
        else:
            displacement *= 0.22
        vertex.co = normal * (radius + displacement)
    for polygon in obj.data.polygons:
        center = sum(
            (obj.data.vertices[i].co for i in polygon.vertices), Vector()
        ) / len(polygon.vertices)
        patch = math.sin(center.x * 7 + 0.4) * math.cos(center.z * 6 - center.y * 4)
        polygon.material_index = 2 if patch > 0.38 else 1 if patch < -0.30 else 0
        if body == "Mars" and b.world == "S5":
            polygon.material_index = 3 if patch > 0.02 else 4 if patch < -0.45 else 0
        elif body == "Mars" and b.world == "S6" and patch > 0.48:
            polygon.material_index = 3
        elif body == "Mars" and abs(center.z) > radius * 0.82:
            polygon.material_index = 2
        elif body == "Venus":
            band = math.sin(center.z * 19 + center.x * 4 + math.sin(center.y * 5))
            polygon.material_index = 2 if band > 0.3 else 1 if band < -0.52 else 0
    obj.data.update()
    # Crater bowls and ejecta rims are part of the terrain itself. Separate white rings
    # previously appeared pasted onto the globe and could float above its facets.
    if body == "Moon":
        for face in obj.data.polygons:
            normal = face.center.normalized()
            for center, size in craters:
                distance = (normal - center).length
                if distance < size * 0.64:
                    face.material_index = 1
                elif abs(distance - size) < 0.032:
                    face.material_index = 2 if face.index % 4 == 0 else 0
    if body == "Mars":
        for longitude, latitude, size in (
            (-49, -3, 0.10),
            (53, -28, 0.13),
            (78, 24, 0.11),
        ):
            with b.site("stratified_rock_outcrop", longitude, latitude, radius - 0.007):
                b.ico(
                    "layered_butte_base",
                    size,
                    (0, 0, 0.018),
                    "terrain_dark",
                    (1.3, 0.70, 0.42),
                    1,
                )
                b.ico(
                    "weathered_butte_cap",
                    size * 0.74,
                    (0.014, 0.005, 0.047),
                    "terrain_light",
                    (1.15, 0.72, 0.40),
                    1,
                )
        # The valley walls now belong to the displaced terrain. No repeated loose rock chain.
        for face in obj.data.polygons:
            p = face.center.normalized()
            extent, _, _, main, branch = _mars_valley(p)
            if extent * (main + branch * 0.4) > 0.62:
                face.material_index = 4 if b.world == "S5" else 1
    return obj


def _controlled_settlement(b, body="Moon"):
    if body == "Mars":
        b.box(
            "controlled_terrace_foundation",
            (0.49, 0.23, 0.055),
            (0, 0.09, 0.02),
            "metal",
        )
        for i, (x, height, width) in enumerate(
            ((-0.17, 0.13, 0.17), (0.008, 0.22, 0.15), (0.16, 0.31, 0.13))
        ):
            b.box(
                "stepped_enclosed_residential_tier",
                (width, 0.18, height),
                (x, 0.09 + i * 0.026, 0.06 + height / 2),
                "hull",
            )
            b.box(
                "tier_protective_roof",
                (width + 0.023, 0.20, 0.025),
                (x, 0.09 + i * 0.026, 0.073 + height),
                "metal",
            )
            for level in range(i + 1):
                b.box(
                    "recessed_residential_window_band",
                    (width * 0.76, 0.012, 0.036),
                    (x, -0.006 + i * 0.026, 0.12 + level * 0.072),
                    "glass",
                )
                b.box(
                    "window_security_lintel",
                    (width * 0.86, 0.020, 0.009),
                    (x, -0.01 + i * 0.026, 0.145 + level * 0.072),
                    "accent",
                    bevel=0.001,
                )
        _link(
            b,
            "controlled_pressure_promenade",
            (-0.21, -0.035, 0.082),
            (0.17, -0.035, 0.082),
            0.035,
        )
        _pod(
            b,
            "freight_screening_pressure_module",
            (-0.03, -0.19, -0.014),
            0.29,
            0.16,
            0.12,
            0,
            False,
        )
        _link(
            b,
            "screening_to_terrace_link",
            (-0.03, -0.10, 0.083),
            (-0.03, -0.035, 0.083),
            0.034,
        )
        b.box(
            "controlled_loading_apron",
            (0.25, 0.12, 0.023),
            (-0.03, -0.30, -0.015),
            "metal",
        )
        b.box(
            "loading_screen_canopy",
            (0.20, 0.072, 0.022),
            (-0.03, -0.285, 0.11),
            "accent",
        )
        for x in (-0.12, 0.06):
            b.beam(
                "screen_canopy_column",
                (x, -0.29, -0.003),
                (x, -0.29, 0.11),
                0.006,
                "metal",
            )
        _radiator(
            b, "residential_life_support_bank", (0.31, 0.13, -0.02), 0.17, 0.25, 0.18
        )
        b.beam(
            "freight_surveillance_mast",
            (-0.25, -0.10, 0),
            (-0.25, -0.10, 0.20),
            0.010,
            "metal",
        )
        b.box(
            "gimbaled_loading_monitor",
            (0.046, 0.04, 0.033),
            (-0.25, -0.113, 0.204),
            "accent",
        )
        b.cylinder(
            "monitor_lens",
            0.014,
            0.008,
            (-0.25, -0.14, 0.204),
            "glass",
            10,
            rot=(math.pi / 2, 0, 0),
        )
        return
    # Raised privileged crown and separate service structures, rather than a pod campus.
    b.cylinder("armored_utility_plinth", 0.255, 0.062, (0, 0, 0.025), "metal", 8)
    b.cylinder("protected_residential_terrace", 0.211, 0.039, (0, 0, 0.073), "hull", 8)
    b.box("residential_crown_lower", (0.26, 0.19, 0.12), (0, 0.035, 0.15), "hull")
    b.box("residential_crown_upper", (0.18, 0.14, 0.10), (0.025, 0.042, 0.255), "hull")
    b.box(
        "private_observation_glazing",
        (0.145, 0.012, 0.045),
        (0.025, -0.033, 0.263),
        "glass",
    )
    b.box("roof_protection_cap", (0.20, 0.16, 0.028), (0.025, 0.042, 0.319), "metal")
    for x in (-0.072, 0, 0.072):
        b.box(
            "lower_window_recess", (0.046, 0.015, 0.037), (x, -0.067, 0.159), "shadow"
        )
        b.box(
            "lower_window",
            (0.034, 0.006, 0.025),
            (x, -0.079, 0.159),
            "glass",
            bevel=0.001,
        )
    _airlock(b, "controlled_gateway", (0, -0.194, 0.116), 0.077)
    b.box("entry_bridge", (0.12, 0.115, 0.025), (0, -0.245, 0.054), "metal")
    for sign in (-1, 1):
        b.box(
            "checkpoint_bollard",
            (0.018, 0.02, 0.063),
            (sign * 0.065, -0.277, 0.095),
            "accent",
        )
    b.beam(
        "surveillance_mast", (-0.16, 0.04, 0.10), (-0.16, 0.04, 0.33), 0.012, "metal"
    )
    b.box("surveillance_optic", (0.055, 0.044, 0.035), (-0.16, 0.023, 0.325), "accent")
    b.cylinder(
        "optic_lens",
        0.015,
        0.008,
        (-0.16, -0.003, 0.325),
        "glass",
        10,
        rot=(math.pi / 2, 0, 0),
    )
    if body == "Mars":
        _pod(
            b,
            "controlled_freight_wing",
            (0.30, 0.04, -0.013),
            0.22,
            0.14,
            0.12,
            math.pi / 2,
            False,
        )
        _link(
            b, "secured_freight_link", (0.16, 0.05, 0.115), (0.25, 0.04, 0.085), 0.034
        )
    else:
        _radiator(b, "utility_terrace_radiator", (0.19, 0.20, -0.025), 0.16, 0.18, 0.10)


def _industrial_settlement(b, body="Moon"):
    if body == "Mars":
        b.box(
            "processing_hall_foundation",
            (0.39, 0.23, 0.035),
            (-0.06, 0.04, 0.01),
            "metal",
        )
        with b.group("rotary_mineral_processor", (-0.095, 0.045, 0.125)):
            b.cylinder(
                "rotary_processing_drum",
                0.076,
                0.30,
                material="accent",
                vertices=12,
                rot=(0, math.pi / 2, 0),
            )
            for x in (-0.105, 0.105):
                b.ring(
                    "drum_external_race",
                    0.079,
                    0.009,
                    (x, 0, 0),
                    "metal",
                    (0, math.pi / 2, 0),
                    segments=16,
                )
                b.box(
                    "drum_bearing_saddle", (0.042, 0.12, 0.044), (x, 0, -0.073), "hull"
                )
            b.cylinder(
                "processor_reducer",
                0.053,
                0.077,
                (0.18, 0, 0),
                "metal",
                10,
                top=0.029,
                rot=(0, math.pi / 2, 0),
            )
            b.box("drive_motor", (0.062, 0.060, 0.067), (0.23, 0, -0.015), "hull")
        b.box(
            "processed_material_hopper",
            (0.13, 0.10, 0.096),
            (0.19, 0.005, 0.062),
            "hull",
        )
        b.box(
            "hopper_open_throat", (0.09, 0.063, 0.012), (0.19, 0.005, 0.115), "shadow"
        )
        b.tube(
            "processor_transfer_chute",
            [(0.04, 0.045, 0.15), (0.13, 0.045, 0.15), (0.18, 0.005, 0.13)],
            0.026,
            "metal",
            4,
        )
        _pod(
            b,
            "protected_industrial_crew_hall",
            (-0.095, 0.225, -0.014),
            0.30,
            0.14,
            0.13,
        )
        _link(
            b,
            "crew_to_control_airlock",
            (-0.19, 0.14, 0.071),
            (-0.19, 0.07, 0.088),
            0.026,
        )
        with b.group("maintained_visitor_observation_wing", (-0.015, -0.205, -0.01)):
            b.box(
                "viewing_wing_foundation", (0.32, 0.14, 0.031), (0, 0, 0.010), "metal"
            )
            b.box(
                "enclosed_visitor_gallery", (0.30, 0.125, 0.126), (0, 0, 0.086), "hull"
            )
            b.box(
                "wide_observation_glazing",
                (0.254, 0.008, 0.071),
                (0, -0.068, 0.099),
                "glass",
            )
            b.box(
                "protective_gallery_overhang",
                (0.335, 0.165, 0.020),
                (0, -0.012, 0.159),
                "hull",
            )
            for x in (-0.078, 0.078):
                b.box(
                    "observation_mullion",
                    (0.007, 0.013, 0.072),
                    (x, -0.072, 0.099),
                    "metal",
                    bevel=0.001,
                )
            _airlock(b, "visitor_entry", (0.085, -0.083, 0.063), 0.057)
        with b.group(
            "visitor_transfer_lock", (0.27, -0.17, -0.025), scale=(0.7, 0.7, 0.7)
        ):
            _airlock(b, pos=(0, 0, 0.09))
            b.box(
                "transfer_lock_pressure_body",
                (0.12, 0.10, 0.13),
                (0, 0.06, 0.092),
                "hull",
            )
        _link(
            b,
            "protected_visitor_bridge",
            (0.145, -0.18, 0.08),
            (0.225, -0.17, 0.071),
            0.028,
        )
        _crane(b, "industrial_material_loader", (0.21, 0.17, -0.016), True)
        return
    b.box(
        "mine_head_concrete_apron", (0.33, 0.29, 0.04), (-0.07, 0.025, 0.014), "metal"
    )
    b.cylinder("shaft_collar", 0.073, 0.027, (-0.12, 0.07, 0.045), "shadow", 12)
    b.ring(
        "shaft_reinforcement", 0.075, 0.008, (-0.12, 0.07, 0.063), "accent", segments=12
    )
    for x in (-0.20, -0.04):
        b.beam("mine_head_leg", (x, 0.0, 0.036), (x, 0.085, 0.25), 0.012, "metal")
        b.beam("mine_head_brace", (x, 0.16, 0.036), (x, 0.085, 0.25), 0.010, "metal")
    b.box("hoist_crosshead", (0.23, 0.07, 0.033), (-0.12, 0.085, 0.257), "accent")
    b.cylinder(
        "hoist_drum",
        0.039,
        0.10,
        (-0.12, 0.085, 0.241),
        "metal",
        12,
        rot=(0, math.pi / 2, 0),
    )
    b.beam(
        "shaft_hoist_line", (-0.12, 0.085, 0.241), (-0.12, 0.07, 0.064), 0.004, "accent"
    )
    b.box("ore_receiving_hopper", (0.13, 0.11, 0.072), (0.13, -0.022, 0.075), "accent")
    b.box(
        "hopper_dark_opening",
        (0.092, 0.074, 0.01),
        (0.13, -0.022, 0.114),
        "shadow",
        bevel=0.001,
    )
    for side in (-1, 1):
        b.beam(
            "conveyor_rail",
            (-0.07, -0.057 + side * 0.032, 0.079),
            (0.12, -0.022 + side * 0.032, 0.144),
            0.007,
            "metal",
        )
    b.box(
        "covered_conveyor",
        (0.20, 0.07, 0.025),
        (0.031, -0.040, 0.118),
        "hull",
        rot=(0, -0.33, 0.17),
    )
    _pod(b, "crew_service_module", (0.19, 0.18, -0.015), 0.25, 0.14, 0.13, -0.18)
    _link(b, "mine_crew_pressure_link", (0.02, 0.16, 0.075), (0.16, 0.17, 0.075), 0.028)
    if body == "Mars":
        with b.group("protected_visitor_gallery", (0.12, -0.25, 0.02)):
            b.box("viewing_wing", (0.25, 0.11, 0.13), (0, 0, 0.065), "hull")
            b.box("panoramic_window", (0.21, 0.012, 0.071), (0, -0.06, 0.08), "glass")
            b.box("shade_overhang", (0.28, 0.14, 0.018), (0, -0.012, 0.142), "hull")
            _airlock(b, pos=(0.055, -0.07, 0.046), width=0.053)
    else:
        _crane(b, "ore_transfer_loader", (0.24, -0.20, -0.015))


def _civic_settlement(b, body="Moon"):
    if body == "Mars":
        # Mars follows its long valley: a street-like pressure spine between distinct wings.
        _pod(b, "martian_civic_pressure_gallery", (-0.07, -0.025, 0), 0.46, 0.13, 0.13)
        _glasshouse(
            b, "martian_long_growth_atrium", (-0.115, 0.16, -0.01), 0.39, 0.17, 0.18
        )
        _link(
            b,
            "atrium_to_public_gallery_west",
            (-0.22, 0.080, 0.09),
            (-0.22, 0.04, 0.09),
            0.026,
        )
        _link(
            b,
            "atrium_to_public_gallery_east",
            (0.025, 0.080, 0.09),
            (0.025, 0.04, 0.09),
            0.026,
        )
        with b.group("martian_science_observatory", (0.23, 0.15, -0.014)):
            b.cylinder(
                "observatory_foundation", 0.103, 0.044, (0, 0, 0.022), "metal", 10
            )
            b.cylinder("science_pressure_drum", 0.09, 0.13, (0, 0, 0.105), "hull", 10)
            b.ico("science_dome", 0.103, (0, 0, 0.17), "glass", (1, 1, 0.60), 2)
            b.ring(
                "dome_equatorial_seal", 0.1, 0.007, (0, 0, 0.17), "accent", segments=20
            )
            b.box(
                "instrument_shutter", (0.042, 0.113, 0.033), (0, -0.027, 0.222), "hull"
            )
            b.box(
                "instrument_aperture",
                (0.027, 0.014, 0.028),
                (0, -0.092, 0.216),
                "shadow",
                bevel=0.001,
            )
            _airlock(b, "observatory_entry", (0, -0.104, 0.076), 0.06)
        _link(
            b,
            "gallery_to_observatory",
            (0.15, 0.013, 0.082),
            (0.22, 0.055, 0.083),
            0.03,
        )
        with b.group("public_arrival_terrace", (-0.10, -0.20, -0.024)):
            b.box("arrival_apron", (0.30, 0.145, 0.032), (0, 0, 0.007), "terrain_light")
            b.box(
                "pressure_arrival_vestibule",
                (0.15, 0.075, 0.092),
                (0.0, 0.016, 0.058),
                "hull",
            )
            b.box(
                "vestibule_glazing", (0.112, 0.007, 0.055), (0, -0.028, 0.070), "glass"
            )
            b.box("arrival_overhang", (0.19, 0.102, 0.02), (0, 0.006, 0.115), "hull")
            b.box(
                "arrival_shadow_recess",
                (0.064, 0.012, 0.04),
                (0.074, -0.011, 0.047),
                "shadow",
            )
            for x in (-0.12, 0.12):
                b.beam(
                    "apron_light_mast",
                    (x, -0.02, 0.025),
                    (x, -0.02, 0.13),
                    0.004,
                    "metal",
                )
                b.box(
                    "apron_light_head",
                    (0.027, 0.017, 0.012),
                    (x, -0.02, 0.133),
                    "light",
                )
        _link(
            b,
            "civic_entry_pressure_link",
            (-0.10, -0.13, 0.065),
            (-0.10, -0.065, 0.074),
            0.034,
        )
        with b.group("survey_lander_apron", (0.255, -0.18, -0.024)):
            b.cylinder("lander_apron", 0.112, 0.015, (0, 0, 0.01), "terrain_light", 8)
            b.ring(
                "landing_guidance_inlay",
                0.072,
                0.003,
                (0, 0, 0.021),
                "accent",
                segments=16,
            )
            b.cylinder(
                "survey_lander_body", 0.034, 0.066, (0, 0, 0.062), "hull", 8, top=0.027
            )
            b.cylinder(
                "lander_cabin", 0.026, 0.028, (0, 0, 0.107), "glass", 8, top=0.016
            )
            for angle in (0, TAU / 3, 2 * TAU / 3):
                x, y = 0.062 * math.cos(angle), 0.062 * math.sin(angle)
                b.beam(
                    "lander_leg",
                    (x * 0.34, y * 0.34, 0.067),
                    (x, y, 0.022),
                    0.004,
                    "metal",
                )
                b.box(
                    "lander_contact_pad", (0.025, 0.017, 0.008), (x, y, 0.021), "metal"
                )
        _thermal_court(b, (-0.33, 0.06, -0.02), 0.65)
        return
    b.cylinder(
        "civic_pressure_court_base", 0.14, 0.028, (-0.035, -0.04, 0.014), "metal", 10
    )
    b.cylinder("civic_pressure_hall", 0.119, 0.094, (-0.035, -0.04, 0.075), "hull", 10)
    b.cylinder(
        "faceted_hall_roof", 0.139, 0.039, (-0.035, -0.04, 0.139), "hull", 10, top=0.085
    )
    for x in (-0.086, -0.035, 0.016):
        b.box(
            "court_window",
            (0.039, 0.012, 0.046),
            (x, -0.146, 0.082),
            "glass",
            bevel=0.002,
        )
    _airlock(b, "public_pressure_entrance", (-0.035, -0.169, 0.061), 0.07)
    _glasshouse(
        b, "community_growth_hall", (0.18, 0.10, -0.005), 0.26, 0.16, 0.12, -0.25
    )
    _pod(b, "science_workshop", (-0.20, 0.16, -0.015), 0.20, 0.13, 0.12, 0.2)
    _link(b, "civic_to_growth_hall", (0.055, 0.035, 0.066), (0.15, 0.07, 0.066), 0.027)
    _link(b, "civic_to_workshop", (-0.11, 0.033, 0.068), (-0.19, 0.11, 0.068), 0.026)
    # The lunar hub has a radial skylight, unlike Mars's elongated inhabited spine.
    b.cylinder(
        "civic_central_skylight",
        0.071,
        0.025,
        (-0.035, -0.04, 0.16),
        "glass",
        10,
        top=0.04,
    )
    for angle in (0, TAU / 3, TAU * 2 / 3):
        b.beam(
            "skylight_radial_rib",
            (-0.035, -0.04, 0.19),
            (-0.035 + 0.08 * math.cos(angle), -0.04 + 0.08 * math.sin(angle), 0.15),
            0.005,
            "hull",
        )
    _dish(b, "civic_science_instrument", (-0.23, -0.18, -0.01), 0.14, -0.3)
    _thermal_court(b, (0.28, -0.12, -0.025), 0.64)
    b.tube(
        "visible_civic_thermal_connection",
        [(0.035, -0.018, 0.058), (0.17, -0.018, 0.04), (0.24, -0.12, 0.04)],
        0.009,
        "accent",
    )


def _organic_settlement(b, body="Moon"):
    if body == "Mars":
        with b.group("martian_biosynthetic_garden_neighborhood"):
            _petal_house(b, "branching_living_atrium", (-0.07, 0.07, -0.003), 1.02)
            _petal_house(
                b, "lower_garden_dwelling", (0.205, -0.09, -0.018), 0.68, -0.30
            )
            with b.group("ribbed_growth_terrace", (-0.27, -0.15, -0.03), (0, 0, -0.2)):
                _glasshouse(
                    b, "terraced_food_growth_hall", length=0.21, width=0.14, height=0.12
                )
            b.tube(
                "enclosed_organic_promenade",
                [(-0.08, -0.035, 0.079), (0.04, -0.12, 0.066), (0.17, -0.10, 0.057)],
                0.03,
                "hull",
                8,
            )
            b.tube(
                "growth_hall_connection",
                [(-0.17, 0.0, 0.064), (-0.225, -0.08, 0.057), (-0.25, -0.10, 0.055)],
                0.021,
                "green",
                8,
            )
            for x, y, yaw in ((-0.08, -0.27, -0.20), (0.20, 0.19, 0.45)):
                with b.group("planted_contour_terrace", (x, y, -0.025), (0, 0, yaw)):
                    b.cylinder(
                        "garden_retaining_foundation",
                        0.105,
                        0.036,
                        (0, 0, 0.015),
                        "hull",
                        7,
                        top=0.112,
                    )
                    b.cylinder(
                        "living_terrace_soil", 0.096, 0.012, (0, 0, 0.04), "green", 7
                    )
                    for j in (-1, 1):
                        b.tube(
                            "branching_garden_stem",
                            [
                                (j * 0.04, 0, 0.043),
                                (j * 0.05, 0, 0.10),
                                (j * 0.075, 0.008, 0.15),
                            ],
                            0.006,
                            "metal",
                        )
                        b.ico(
                            "layered_garden_canopy",
                            0.048,
                            (j * 0.068, 0.008, 0.15),
                            "green",
                            (1.15, 0.9, 0.67),
                            1,
                        )
                        b.ico(
                            "young_upper_foliage",
                            0.032,
                            (j * 0.046, 0.018, 0.183),
                            "green",
                            (0.9, 1, 1),
                            1,
                        )
            _thermal_court(b, (0.29, 0.08, -0.035), 0.55)
        return
    _glasshouse(
        b, "enclosed_biosynthetic_growth_hall", (-0.05, 0.045, 0), 0.36, 0.22, 0.21
    )
    _pod(b, "bioprocess_service_hull", (0.19, -0.14, -0.02), 0.22, 0.14, 0.12, -0.50)
    _link(
        b,
        "growth_service_connection",
        (0.075, -0.03, 0.085),
        (0.17, -0.12, 0.077),
        0.033,
    )
    for x, y, h in ((-0.24, -0.14, 0.13), (-0.30, 0.06, 0.18)):
        b.cylinder("sealed_growth_vessel", 0.043, h, (x, y, h / 2 + 0.015), "glass", 10)
        b.cylinder("growth_vessel_cap", 0.050, 0.015, (x, y, h + 0.018), "hull", 10)
        b.ring(
            "growth_vessel_band", 0.044, 0.004, (x, y, h * 0.64), "accent", segments=10
        )
        b.tube(
            "bioprocess_feed",
            [(x, y, 0.04), (x + 0.07, y, 0.036), (-0.10, 0.01, 0.065)],
            0.008,
            "green",
        )
    if body == "Mars":
        # Garden Mars gets exposed planted terraces, unlike an airless lunar greenhouse.
        for i, (x, y, h) in enumerate(
            ((0.05, -0.31, 0.036), (-0.14, -0.28, 0.046), (0.26, 0.17, 0.03))
        ):
            b.box(
                "garden_terrace_retaining_edge",
                (0.15, 0.10, 0.032),
                (x, y, h / 2),
                "hull",
            )
            b.box(
                "garden_terrace_soil",
                (0.134, 0.084, 0.012),
                (x, y, h / 2 + 0.022),
                "green",
            )
            for j in range(2):
                b.beam(
                    "garden_trunk",
                    (x + (j - 0.5) * 0.055, y, 0.035),
                    (x + (j - 0.5) * 0.055, y, 0.10 + i * 0.009),
                    0.005,
                    "metal",
                )
                b.ico(
                    "garden_canopy",
                    0.037,
                    (x + (j - 0.5) * 0.055, y, 0.12 + i * 0.009),
                    "green",
                    (0.90, 0.90, 1.15),
                    1,
                )


def _petal_house(b, name, pos, scale=1, yaw=0):
    with b.group(name, pos, (0, 0, yaw), (scale, scale, scale)):
        b.cylinder("petal_hall_foundation", 0.131, 0.033, (0, 0, 0.016), "hull", 12)
        n = 18
        profile = (
            (0.116, 0.033),
            (0.139, 0.086),
            (0.117, 0.16),
            (0.075, 0.213),
            (0.024, 0.252),
        )
        verts = []
        for radius, height in profile:
            for i in range(n):
                angle = TAU * i / n
                lobe = 1 + 0.115 * math.cos(3 * angle)
                verts.append(
                    (
                        math.cos(angle) * radius * lobe,
                        math.sin(angle) * radius * lobe,
                        height,
                    )
                )
        faces = [tuple(reversed(range(n))), tuple(range(n * 4, n * 5))]
        faces.extend(
            (
                layer * n + i,
                layer * n + (i + 1) % n,
                (layer + 1) * n + (i + 1) % n,
                (layer + 1) * n + i,
            )
            for layer in range(4)
            for i in range(n)
        )
        shell = b.mesh("faceted_living_membrane", verts, faces, "glass")
        shell.data.materials.append(b.mats["green"])
        for face in shell.data.polygons:
            if face.index > 38:
                face.material_index = 1
        for angle in (0, TAU / 3, TAU * 2 / 3):
            b.tube(
                "continuous_branching_pressure_rib",
                [
                    (
                        math.cos(angle) * radius * 1.115,
                        math.sin(angle) * radius * 1.115,
                        height + 0.003,
                    )
                    for radius, height in profile
                ],
                0.007,
                "hull",
            )
        b.cylinder("atrium_skylight_cap", 0.036, 0.015, (0, 0, 0.260), "hull", 10)
        _airlock(b, "living_hall_entry", (0, -0.144, 0.079), 0.071)
        for x in (-0.07, 0.07):
            b.box(
                "lower_membrane_window",
                (0.044, 0.014, 0.055),
                (x, -0.106, 0.091),
                "glass",
                rot=(0, 0, -x * 5),
            )


def _engineered_settlement(b, body="Moon"):
    _process(b, "calibrated_process_core", (-0.09, 0.03, 0), 1)
    _pod(b, "protected_service_habitat", (0.17, -0.20, -0.014), 0.25, 0.14, 0.12, 0.22)
    _link(b, "insulated_access_link", (0.025, -0.07, 0.085), (0.15, -0.18, 0.065), 0.03)
    _radiator(b, "independent_cooling_bank", (-0.27, 0.15, -0.025), 0.20, 0.23, -0.40)
    b.tube(
        "coolant_supply",
        [(-0.16, 0.10, 0.043), (-0.20, 0.12, 0.043), (-0.27, 0.16, 0.043)],
        0.012,
        "accent",
    )
    b.tube(
        "coolant_return",
        [(-0.16, 0.08, 0.028), (-0.22, 0.095, 0.028), (-0.28, 0.145, 0.028)],
        0.009,
        "metal",
    )
    if body == "Mars":
        with b.group("atmospheric_calibration_tower", (0.27, 0.15, -0.025)):
            b.cylinder("tower_anchor", 0.068, 0.04, (0, 0, 0.02), "metal", 8)
            b.cylinder("process_stack", 0.041, 0.29, (0, 0, 0.185), "hull", 10)
            for z in (0.09, 0.19, 0.28):
                b.ring(
                    "stack_expansion_joint",
                    0.043,
                    0.007,
                    (0, 0, z),
                    "accent",
                    segments=12,
                )
            b.cylinder(
                "intake_cowl", 0.069, 0.045, (0, 0, 0.35), "metal", 10, top=0.048
            )
            b.cylinder("intake_recess", 0.039, 0.007, (0, 0, 0.377), "shadow", 10)
    elif body == "Venus":
        with b.group("anchored_venus_process_tower", (0.20, 0.18, -0.04)):
            for x, y in ((-0.07, -0.07), (0.07, -0.07), (0, 0.08)):
                b.beam(
                    "braced_ground_leg",
                    (x, y, -0.025),
                    (x * 0.5, y * 0.5, 0.24),
                    0.012,
                    "metal",
                )
                b.box("ground_anchor", (0.09, 0.075, 0.033), (x, y, -0.01), "hull")
            b.cylinder(
                "insulated_contact_reactor", 0.082, 0.22, (0, 0, 0.21), "hull", 10
            )
            b.cylinder(
                "reflective_reactor_cowl",
                0.105,
                0.04,
                (0, 0, 0.345),
                "accent",
                10,
                top=0.069,
            )
            b.tube(
                "ground_coupled_process_pipe",
                [(0, 0, 0.13), (0.12, 0, 0.13), (0.12, 0, -0.02)],
                0.018,
                "metal",
            )


def _embed_regolith_berm(b, obj):
    if b.ground is None:
        return
    frame, radius = b.ground
    to_surface = frame.inverted() @ b._world_matrix(obj)
    from_surface = to_surface.inverted()
    for vertex in obj.data.vertices:
        if vertex.co.z > 0.001:
            continue
        point = to_surface @ vertex.co
        if point.length > radius - 0.026:
            vertex.co = from_surface @ (point.normalized() * (radius - 0.026))
    obj.data.update()


def _refuge_settlement(b, body="Moon"):
    # Deep regolith berms cover the pressure volumes; only protected access is exposed.
    main_berm = b.ico(
        "buried_refuge_berm", 0.28, (0, 0.065, 0.041), "terrain", (1.26, 0.95, 0.53), 2
    )
    secondary_berm = b.ico(
        "secondary_pressure_berm",
        0.16,
        (0.22, 0.13, 0.025),
        "terrain_dark",
        (1.12, 1, 0.56),
        1,
    )
    _embed_regolith_berm(b, main_berm)
    _embed_regolith_berm(b, secondary_berm)
    b.box(
        "reinforced_tunnel_retaining_head",
        (0.25, 0.20, 0.15),
        (-0.025, -0.15, 0.063),
        "metal",
    )
    b.box(
        "recessed_blast_entry", (0.17, 0.018, 0.095), (-0.025, -0.256, 0.064), "shadow"
    )
    b.box("armored_inner_door", (0.12, 0.009, 0.078), (-0.025, -0.27, 0.059), "hull")
    b.box(
        "door_vertical_brace", (0.014, 0.007, 0.08), (-0.025, -0.278, 0.059), "accent"
    )
    b.box("approach_apron", (0.19, 0.18, 0.028), (-0.025, -0.30, -0.001), "metal")
    for sign in (-1, 1):
        b.box(
            "blast_deflection_cheek",
            (0.05, 0.22, 0.095),
            (-0.025 + sign * 0.116, -0.23, 0.031),
            "terrain_light",
            rot=(0, 0, sign * -0.13),
        )
    for x in (-0.12, 0.05):
        b.cylinder("protected_vent", 0.023, 0.11, (x, 0.11, 0.17), "metal", 8)
        b.cylinder("vent_armored_mushroom", 0.036, 0.022, (x, 0.11, 0.231), "hull", 8)
    b.box(
        "escape_transfer_hatch_base", (0.10, 0.10, 0.045), (0.24, 0.12, 0.103), "metal"
    )
    b.cylinder("escape_transfer_lock", 0.035, 0.06, (0.24, 0.12, 0.15), "hull", 10)
    b.ring(
        "escape_docking_seal", 0.037, 0.007, (0.24, 0.12, 0.182), "accent", segments=12
    )
    _process(b, "compact_refuge_utilities", (-0.29, 0.14, -0.024), 0, 0.48)
    _link(
        b, "buried_utility_conduit", (-0.20, 0.11, 0.020), (-0.26, 0.12, 0.028), 0.018
    )


def _autonomous_settlement(b, body="Mars"):
    if body == "Venus":
        # A braced manufactured aperture has a radically different silhouette to Mars.
        b.cylinder(
            "aperture_ground_structure", 0.245, 0.057, (0, 0, 0.025), "metal", 12
        )
        b.cylinder("recessed_aperture_well", 0.190, 0.04, (0, 0, 0.058), "shadow", 16)
        b.ring(
            "aperture_outer_structural_rim",
            0.209,
            0.021,
            (0, 0, 0.10),
            "hull",
            segments=24,
        )
        b.ring("aperture_inner_bus", 0.164, 0.009, (0, 0, 0.082), "accent", segments=24)
        for i in range(6):
            angle = TAU * i / 6
            b.box(
                "angled_aperture_blade",
                (0.072, 0.125, 0.019),
                (0.094 * math.cos(angle), 0.094 * math.sin(angle), 0.077),
                "glass",
                rot=(0, 0, angle - 0.30),
            )
        for x, y, yaw in ((-0.27, 0.06, -0.5), (0.24, 0.20, 0.6), (0.19, -0.23, -0.8)):
            _radiator(b, "braced_venus_thermal_sail", (x, y, -0.025), 0.16, 0.27, yaw)
            b.beam(
                "thermal_brace",
                (x, y, 0.12),
                (x * 0.69, y * 0.69, 0.026),
                0.01,
                "metal",
            )
    else:
        b.box("robotic_production_deck", (0.43, 0.24, 0.035), (0, 0, 0.015), "metal")
        b.box(
            "linear_assembly_track", (0.36, 0.067, 0.044), (0, -0.053, 0.060), "shadow"
        )
        for x in (-0.12, 0.01, 0.14):
            b.box(
                "assembly_carriage", (0.055, 0.074, 0.025), (x, -0.053, 0.095), "accent"
            )
        _crane(b, "autonomous_assembly_arm", (-0.15, 0.079, 0.036), True)
        b.box(
            "sealed_fabrication_chamber",
            (0.14, 0.15, 0.20),
            (0.13, 0.11, 0.135),
            "hull",
        )
        b.box("robot_tool_access", (0.083, 0.017, 0.11), (0.13, 0.025, 0.129), "shadow")
        for z in (0.095, 0.135, 0.175):
            b.box(
                "tool_docking_interface",
                (0.076, 0.016, 0.012),
                (0.13, 0.013, z),
                "glass",
                bevel=0.001,
            )
        _radiator(
            b, "fabrication_heat_rejection", (0.27, 0.075, -0.024), 0.17, 0.27, -0.3
        )


def _dual_settlement(b, body="Moon"):
    if body == "Mars":
        _pod(b, "inhabited_martian_terrace", (-0.105, 0.04, -0.005), 0.36, 0.16, 0.14)
        _pod(b, "upper_martian_living_gallery", (-0.15, 0.04, 0.145), 0.23, 0.125, 0.12)
        b.box(
            "upper_gallery_structural_deck",
            (0.30, 0.17, 0.021),
            (-0.13, 0.04, 0.166),
            "metal",
        )
        b.box(
            "upper_terrace_glazed_end",
            (0.070, 0.010, 0.10),
            (-0.25, -0.03, 0.21),
            "glass",
        )
        _glasshouse(
            b,
            "perpendicular_pressure_garden",
            (0.165, 0.045, -0.012),
            0.30,
            0.16,
            0.16,
            math.pi / 2,
        )
        _link(
            b,
            "terrace_to_garden_gallery",
            (0.057, 0.0, 0.079),
            (0.12, 0.0, 0.079),
            0.032,
        )
        with b.group("maintained_arrival_port", (-0.09, -0.22, -0.018)):
            b.box("port_apron", (0.24, 0.15, 0.02), (0, 0, 0.010), "terrain_light")
            b.box(
                "arrival_pressure_vestibule",
                (0.14, 0.086, 0.091),
                (0, 0.01, 0.063),
                "hull",
            )
            b.box("arrival_canopy", (0.20, 0.12, 0.016), (0, 0.0, 0.114), "hull")
            _airlock(b, "arrival_airlock", (0, -0.054, 0.057), 0.057)
        _link(
            b,
            "arrival_transfer_connection",
            (-0.09, -0.11, 0.065),
            (-0.09, -0.055, 0.082),
            0.028,
        )
        b.box(
            "autonomous_exchange_foundation",
            (0.17, 0.14, 0.027),
            (0.285, -0.17, -0.005),
            "metal",
        )
        b.box(
            "sealed_cargo_exchange", (0.135, 0.10, 0.086), (0.285, -0.17, 0.048), "hull"
        )
        b.box(
            "cargo_receiver_face", (0.089, 0.012, 0.05), (0.285, -0.224, 0.05), "shadow"
        )
        with b.group(
            "autonomous_cargo_edge",
            (0.255, 0.23, -0.023),
            (0, 0, -0.6),
            (0.65, 0.65, 0.65),
        ):
            _crane(b, "cargo_transfer_robot", machine=True)
        _thermal_court(b, (-0.30, 0.18, -0.027), 0.59)
        return
    # Inhabited crescent and a legible autonomous utility edge remain separate.
    _pod(b, "inhabited_longhouse", (-0.10, 0.04, 0), 0.37, 0.17, 0.14, -0.14)
    _glasshouse(
        b, "inhabited_pressure_garden", (0.14, -0.15, -0.014), 0.24, 0.17, 0.15, -0.44
    )
    _link(
        b,
        "occupied_pressure_promenade",
        (0.035, -0.028, 0.070),
        (0.12, -0.10, 0.065),
        0.032,
    )
    b.box(
        "separate_automation_service_deck",
        (0.16, 0.15, 0.026),
        (0.22, 0.19, -0.005),
        "metal",
    )
    _crane(b, "habitat_maintenance_arm", (0.20, 0.20, 0.017), True)
    b.box("exchange_cargo_cradle", (0.10, 0.08, 0.052), (0.30, -0.015, 0.013), "accent")
    if body == "Mars":
        b.box(
            "protected_arrival_court",
            (0.23, 0.14, 0.018),
            (-0.16, -0.21, -0.005),
            "terrain_light",
        )
        b.box("arrival_shelter_roof", (0.21, 0.10, 0.017), (-0.18, -0.22, 0.09), "hull")
        for x in (-0.26, -0.10):
            b.beam("arrival_shelter_support", (x, -0.22, 0), (x, -0.22, 0.09), 0.005)


SETTLEMENTS = {
    "S1": _controlled_settlement,
    "S2": _industrial_settlement,
    "S3": _civic_settlement,
    "S5": _organic_settlement,
    "S6": _engineered_settlement,
    "S8": _refuge_settlement,
    "S9": _autonomous_settlement,
    "S10": _dual_settlement,
}


def _aerostat(b, organic=False):
    # Gondola, structural suspension and lifting volume have readable separate roles.
    b.ico(
        "lifting_envelope",
        0.25,
        (0, 0.035, 0.31),
        "glass" if organic else "hull",
        (1.8, 0.83, 0.81),
        3,
    )
    for x in (-0.25, -0.10, 0.10, 0.25):
        radius = 0.196 * math.sqrt(max(0.1, 1 - (x / 0.45) ** 2))
        band = b.ring(
            "envelope_load_band",
            radius,
            0.006,
            (x, 0.035, 0.31),
            "hull" if organic else "accent",
            (0, math.pi / 2, 0),
            segments=20,
        )
        band.scale = (1, 1.035, 1)
        for side in (-1, 1):
            b.beam(
                "suspension_cable",
                (x, 0.035 + side * radius * 0.58, 0.31 - radius * 0.8),
                (x * 0.68, side * 0.054, 0.018),
                0.0035,
                "metal",
            )
    if organic:
        b.ico(
            "organic_suspended_gondola",
            0.12,
            (0, -0.015, -0.005),
            "hull",
            (2.45, 0.72, 0.48),
            2,
        )
        for x in (-0.12, 0, 0.12):
            b.ico(
                "gondola_growth_bay",
                0.042,
                (x, -0.053, 0.023),
                "green",
                (1.25, 0.65, 0.65),
                1,
            )
        for side in (-1, 1):
            verts = [
                (side * 0.19, 0.02, 0.26),
                (side * 0.49, 0.035, 0.21),
                (side * 0.37, 0.19, 0.29),
                (side * 0.19, 0.13, 0.30),
                (side * 0.19, 0.02, 0.25),
                (side * 0.49, 0.035, 0.20),
                (side * 0.37, 0.19, 0.28),
                (side * 0.19, 0.13, 0.29),
            ]
            b.mesh(
                "membrane_control_fin",
                verts,
                [
                    (0, 1, 2, 3),
                    (7, 6, 5, 4),
                    (0, 4, 5, 1),
                    (1, 5, 6, 2),
                    (2, 6, 7, 3),
                    (3, 7, 4, 0),
                ],
                "green",
            )
    else:
        _pod(b, "inhabited_suspended_habitat", (0, -0.005, -0.072), 0.39, 0.13, 0.12)
        b.box(
            "gondola_service_walkway", (0.45, 0.047, 0.018), (0, -0.11, -0.041), "metal"
        )
        for x in (-0.21, -0.07, 0.07, 0.21):
            b.beam(
                "walkway_guardrail_post",
                (x, -0.13, -0.03),
                (x, -0.13, 0.027),
                0.003,
                "hull",
            )
        b.beam(
            "walkway_guardrail",
            (-0.21, -0.13, 0.027),
            (0.21, -0.13, 0.027),
            0.003,
            "hull",
        )
        b.box(
            "aft_stabilizer",
            (0.15, 0.018, 0.12),
            (0.37, 0.035, 0.40),
            "accent",
            rot=(0, -0.15, 0),
        )
    for side in (-1, 1):
        with b.group("thrust_vector_pivot", (side * 0.27, 0.0, 0.02)):
            b.ring(
                "ducted_thruster_housing",
                0.041,
                0.008,
                material="metal",
                rot=(math.pi / 2, 0, 0),
                segments=16,
            )
            b.cylinder(
                "thruster_hub",
                0.012,
                0.032,
                material="accent",
                vertices=8,
                rot=(math.pi / 2, 0, 0),
            )
            for angle in (0, TAU / 3, TAU * 2 / 3):
                b.box(
                    "thruster_blade",
                    (0.01, 0.008, 0.058),
                    (0, -0.008, 0),
                    "hull",
                    rot=(0, angle, 0),
                    bevel=0.001,
                )


def _orbital_habitat(b, elite=False):
    # The open front is an intentional finished cutaway with interior, rim and wall thickness.
    length, radius, sides = 0.80, 0.19, 22
    angles = [math.pi * 0.42 + i * (math.pi * 1.38) / sides for i in range(sides + 1)]
    verts = [
        (x, -math.cos(a) * r, math.sin(a) * r)
        for r in (radius, radius - 0.015)
        for x in (-length / 2, length / 2)
        for a in angles
    ]
    n = len(angles)
    faces = []
    for layer in (0, 2):
        for i in range(sides):
            face = (
                layer * n + i,
                layer * n + i + 1,
                (layer + 1) * n + i + 1,
                (layer + 1) * n + i,
            )
            faces.append(tuple(reversed(face)) if layer == 0 else face)
    for i in range(sides):
        faces.append((i, i + 1, 2 * n + i + 1, 2 * n + i))
        faces.append((n + i + 1, n + i, 3 * n + i, 3 * n + i + 1))
    faces.extend([(0, n, 3 * n, 2 * n), (n - 1, 3 * n - 1, 4 * n - 1, 2 * n - 1)])
    b.mesh("finished_cutaway_pressure_shell", verts, faces, "hull")
    for x in (-0.40, 0.40):
        b.ring(
            "habitat_structural_end_hoop",
            0.195,
            0.013,
            (x, 0, 0),
            "accent",
            (0, math.pi / 2, 0),
            segments=24,
        )
        b.cylinder(
            "end_pressure_bulkhead",
            0.178,
            0.021,
            (x, 0, 0),
            "metal",
            20,
            rot=(0, math.pi / 2, 0),
        )
        b.cylinder(
            "docking_neck",
            0.064,
            0.10,
            (x * 1.15, 0, 0),
            "hull",
            12,
            rot=(0, math.pi / 2, 0),
        )
        b.ring(
            "docking_interface",
            0.064,
            0.008,
            (x * 1.29, 0, 0),
            "accent",
            (0, math.pi / 2, 0),
            segments=16,
        )
    b.box("interior_living_deck", (0.76, 0.20, 0.023), (0, -0.018, -0.112), "green")
    b.box("interior_promenade", (0.74, 0.038, 0.009), (0, -0.094, -0.093), "hull")
    for x, height, width in (
        (-0.27, 0.048, 0.10),
        (-0.08, 0.066, 0.11),
        (0.16, 0.044, 0.13),
    ):
        b.box(
            "inhabited_interior_volume",
            (width, 0.065, height),
            (x, 0.03, -0.10 + height / 2),
            "hull",
        )
        b.box(
            "interior_window_strip",
            (width * 0.75, 0.005, 0.019),
            (x, -0.006, -0.080 + height / 2),
            "glass",
            bevel=0.001,
        )
    for x in (-0.22, 0.02, 0.23):
        b.ico(
            "interior_living_tree",
            0.023,
            (x, -0.042, -0.06),
            "green",
            (0.7, 0.8, 1.4),
            1,
        )
    for x in (-0.28, 0.26):
        b.beam("power_wing_truss", (x, 0.12, -0.04), (x, 0.37, -0.07), 0.012, "metal")
        _panel(
            b,
            "habitat_power_wing",
            (x, 0.37, -0.065),
            0.25,
            0.26,
            -0.15 if x < 0 else 0.15,
        )
    b.beam("thermal_wing_truss", (0, 0.10, 0.12), (0, 0.31, 0.27), 0.009, "accent")
    _panel(b, "habitat_thermal_wing", (0, 0.33, 0.26), 0.32, 0.14, 0, True)
    if elite:
        b.box(
            "protected_private_observation_bay",
            (0.20, 0.10, 0.071),
            (0.17, -0.15, 0.09),
            "metal",
        )
        b.box(
            "private_bay_glazing", (0.163, 0.008, 0.043), (0.17, -0.207, 0.09), "glass"
        )
        b.beam(
            "controlled_docking_spur",
            (-0.24, -0.03, 0.14),
            (-0.24, -0.22, 0.27),
            0.012,
            "accent",
        )
        b.cylinder(
            "secured_visitor_dock", 0.044, 0.085, (-0.24, -0.22, 0.28), "hull", 10
        )


def _machine_station(b):
    b.cylinder(
        "autonomous_station_core",
        0.105,
        0.46,
        (0, 0, 0.035),
        "metal",
        10,
        rot=(0, math.pi / 2, 0),
    )
    b.box("robotic_service_spine", (0.69, 0.055, 0.053), (0, 0, 0.16), "hull")
    for x in (-0.30, 0.30):
        b.cylinder(
            "machine_docking_collar",
            0.087,
            0.057,
            (x, 0, 0.035),
            "hull",
            12,
            rot=(0, math.pi / 2, 0),
        )
        b.ring(
            "robotic_attachment_rail",
            0.088,
            0.008,
            (x * 1.1, 0, 0.035),
            "accent",
            (0, math.pi / 2, 0),
            segments=16,
        )
    for x, side in ((-0.18, -1), (0.15, 1)):
        b.beam("thermal_boom", (x, 0, 0.03), (x, side * 0.30, -0.04), 0.013, "metal")
        _panel(
            b,
            "machine_thermal_louver",
            (x, side * 0.33, -0.04),
            0.29,
            0.25,
            side * 0.2,
            True,
        )
    with b.group(
        "orbital_assembly_arm", (0.09, -0.02, 0.19), (0, -0.3, -0.7), (0.75, 0.75, 0.75)
    ):
        _crane(b, "robotic_manipulator", machine=True)
    b.box("exchange_cradle", (0.20, 0.16, 0.035), (-0.19, -0.05, -0.09), "shadow")
    for y in (-0.11, 0.01):
        b.beam(
            "cradle_capture_finger",
            (-0.27, y, -0.075),
            (-0.29, y, 0.01),
            0.008,
            "accent",
        )


def _rock(b, ice=False, radius=0.64):
    rock = b.ico(
        "irregular_ice_body" if ice else "irregular_ore_body",
        radius,
        material="terrain",
        subdivisions=3,
    )
    rock.scale = (1.10, 0.86, 1.0)
    rock.data.materials.append(b.mats["terrain_dark"])
    rock.data.materials.append(b.mats["terrain_light"])
    for vertex in rock.data.vertices:
        n = vertex.co.normalized()
        amount = 1 + 0.08 * math.sin(n.x * 6 + n.z * 4) * math.cos(n.y * 7 - n.z * 5)
        vertex.co *= amount
    for polygon in rock.data.polygons:
        center = sum(
            (rock.data.vertices[i].co for i in polygon.vertices), Vector()
        ) / len(polygon.vertices)
        vein = math.sin(center.x * 12 + center.z * 7) + math.cos(center.y * 11)
        polygon.material_index = 2 if vein > 0.8 else 1 if vein < -0.5 else 0
    # Distinct large cleaved strata support an actual grounded working collar.
    for longitude, latitude in ((-57, -21), (60, -24), (-75, 36)):
        with b.site("cleaved_surface_stratum", longitude, latitude, radius * 0.92):
            b.ico(
                "exposed_fracture_facet",
                0.13,
                (0, 0, 0.017),
                "terrain_light",
                (1.3, 0.62, 0.42),
                1,
            )


def _extraction_site(b, ice=False):
    b.cylinder("working_face_anchor_plate", 0.12, 0.035, (0, 0, 0.007), "metal", 8)
    b.cylinder("excavation_dark_throat", 0.054, 0.012, (0, 0, 0.03), "shadow", 12)
    b.ring("contact_drill_collar", 0.068, 0.013, (0, 0, 0.048), "accent", segments=16)
    for angle in (0, 2.2, 4.35):
        x, y = 0.155 * math.cos(angle), 0.155 * math.sin(angle)
        b.beam("unequal_ground_outrigger", (x, y, -0.035), (0, 0, 0.14), 0.012, "hull")
        b.box(
            "drill_anchor_foot",
            (0.075, 0.061, 0.027),
            (x, y, -0.028),
            "metal",
            rot=(0, 0, angle),
        )
    if b.world == "S1":
        b.box(
            "controlled_transfer_silo", (0.15, 0.13, 0.24), (-0.18, 0.10, 0.13), "hull"
        )
        b.box(
            "transfer_gate_recess", (0.078, 0.018, 0.10), (-0.18, 0.025, 0.10), "shadow"
        )
        b.box("cargo_gate_leaf", (0.067, 0.012, 0.08), (-0.18, 0.01, 0.10), "accent")
        b.beam(
            "controlled_cargo_spine",
            (-0.14, 0.02, 0.11),
            (0.16, -0.05, 0.11),
            0.021,
            "metal",
        )
        b.box(
            "freight_capture_cradle", (0.12, 0.11, 0.04), (0.21, -0.055, 0.115), "hull"
        )
        _dish(b, "traffic_control_receiver", (-0.18, 0.10, 0.26), 0.085)
    elif b.world == "S2":
        _crane(b, "exposed_cutting_gantry", (-0.16, 0.11, 0), True)
        b.box("ore_hopper", (0.14, 0.12, 0.11), (0.18, -0.04, 0.08), "accent")
        b.box("hopper_recess", (0.104, 0.082, 0.013), (0.18, -0.04, 0.139), "shadow")
        for sign in (-1, 1):
            b.beam(
                "exposed_ore_transfer_rail",
                (0.025, -0.04 + sign * 0.03, 0.085),
                (0.16, -0.04 + sign * 0.03, 0.145),
                0.007,
                "metal",
            )
        _pod(
            b,
            "rough_crew_pressure_tug",
            (-0.20, -0.18, 0.02),
            0.19,
            0.11,
            0.11,
            0.5,
            False,
        )
    elif b.world == "S3":
        _pod(
            b,
            "small_science_service_cradle",
            (-0.20, 0.10, 0.015),
            0.23,
            0.14,
            0.13,
            -0.4,
        )
        _link(
            b,
            "maintained_sample_transfer_link",
            (-0.12, 0.05, 0.085),
            (0, 0, 0.12),
            0.022,
        )
        b.box(
            "sample_containment_locker", (0.11, 0.08, 0.10), (0.19, -0.05, 0.06), "hull"
        )
        b.box(
            "sample_locker_window",
            (0.074, 0.008, 0.032),
            (0.19, -0.095, 0.072),
            "glass",
        )
        _dish(b, "compact_science_dish", (-0.22, -0.16, -0.02), 0.09)
    elif b.world == "S5":
        _glasshouse(
            b,
            "ribbed_biological_processing_chamber",
            (-0.19, 0.10, 0),
            0.28,
            0.17,
            0.17,
            -0.30,
        )
        b.tube(
            "sealed_bioprocess_feed",
            [(0, 0, 0.10), (-0.08, 0.015, 0.14), (-0.18, 0.03, 0.10)],
            0.017,
            "green",
        )
        for y, height in ((-0.15, 0.16), (0.17, 0.12)):
            b.cylinder(
                "feedstock_growth_vessel",
                0.045,
                height,
                (0.19, y, height / 2),
                "glass",
                10,
            )
            b.ring(
                "growth_vessel_pressure_band",
                0.046,
                0.006,
                (0.19, y, height * 0.7),
                "hull",
                segments=12,
            )
        _link(b, "feedstock_return", (0.02, -0.01, 0.054), (0.18, -0.13, 0.054), 0.012)
    elif b.world == "S6":
        _process(b, "redundant_feedstock_life_support", (-0.19, 0.11, 0.0), 0, 0.65)
        _link(b, "sealed_resource_line", (-0.08, 0.065, 0.067), (0, 0, 0.10), 0.027)
        b.tube(
            "resource_return_line",
            [(-0.16, 0.025, 0.04), (-0.06, -0.055, 0.04), (0.015, 0, 0.055)],
            0.009,
            "accent",
        )
        _radiator(b, "distant_process_radiator", (0.19, 0.12, -0.014), 0.17, 0.25, -0.3)
    elif b.world == "S9":
        _crane(b, "autonomous_extraction_fingers", (-0.13, 0.14, 0), True)
        with b.group(
            "second_robotic_tool",
            (0.18, -0.12, 0.025),
            (0, 0, math.pi),
            (0.58, 0.58, 0.58),
        ):
            _crane(b, "articulated_core_sampler", machine=True)
        b.box("machine_material_bus", (0.14, 0.09, 0.13), (0.18, 0.12, 0.08), "hull")
        for z in (0.04, 0.085, 0.13):
            b.box(
                "autonomous_bus_interface",
                (0.015, 0.07, 0.014),
                (0.103, 0.12, z),
                "glass",
                bevel=0.001,
            )
        b.beam(
            "sample_bus_rail", (0.18, 0.12, 0.15), (0.045, 0.045, 0.15), 0.014, "metal"
        )
    elif b.world == "S10":
        _pod(
            b,
            "inhabited_transfer_support",
            (-0.19, 0.11, 0.01),
            0.23,
            0.14,
            0.13,
            -0.20,
        )
        _link(b, "habitat_extraction_link", (-0.075, 0.08, 0.07), (0, 0, 0.09), 0.022)
        b.box(
            "autonomous_cargo_exchange",
            (0.14, 0.14, 0.09),
            (0.17, -0.10, 0.065),
            "metal",
        )
        b.box(
            "cargo_pressure_interface",
            (0.09, 0.017, 0.052),
            (0.17, -0.184, 0.065),
            "hull",
        )
        with b.group(
            "cargo_transfer_manipulator", (0.19, 0.13, 0), scale=(0.55, 0.55, 0.55)
        ):
            _crane(b, "autonomous_cargo_arm", machine=True)
    if ice:
        b.cylinder("insulated_subsurface_drill", 0.026, 0.15, (0, 0, 0.11), "hull", 10)
        for z in (0.063, 0.109, 0.155):
            b.ring(
                "drill_expansion_joint", 0.027, 0.006, (0, 0, z), "accent", segments=10
            )


def _ice_radius(normal):
    """A cleaved, elongated two-lobe ice profile, separate from the ore asteroid."""
    x, y, z = normal
    directional = 1 / math.sqrt((x / 0.88) ** 2 + (y / 0.81) ** 2 + (z / 1.20) ** 2)
    cleft = 0.21 * math.exp(-(((z + 0.28 * x - 0.10) / 0.16) ** 2))
    facets = 1 + 0.035 * math.sin(x * 13 + z * 7) * math.cos(y * 9 - z * 5)
    return 0.66 * directional * (1 + 0.075 * z) * (1 - cleft) * facets


def _ice_direction(longitude, latitude):
    lon, lat = math.radians(longitude), math.radians(latitude)
    return Vector(
        (math.sin(lon) * math.cos(lat), -math.cos(lon) * math.cos(lat), math.sin(lat))
    )


def _cleaved_ice(b):
    ice = b.ico("unequal_lobed_kuiper_ice_body", 1, subdivisions=4)
    ice.data.materials.append(b.mats["terrain_light"])
    ice.data.materials.append(b.mats["terrain_dark"])
    for vertex in ice.data.vertices:
        normal = vertex.co.normalized()
        vertex.co = normal * _ice_radius(normal)
    for face in ice.data.polygons:
        normal = sum(
            (ice.data.vertices[i].co for i in face.vertices), Vector()
        ).normalized()
        seam = abs(normal.z + 0.28 * normal.x - 0.10)
        face.material_index = 2 if seam < 0.10 else 1 if seam < 0.22 else 0
        if normal.z > 0.67:
            face.material_index = 1
    ice.data.update()
    # The cleft is one continuous geological feature with exposed offset plates.
    for longitude, latitude, width in (
        (-49, -12, 0.13),
        (48, -24, 0.12),
        (37, 34, 0.10),
    ):
        normal = _ice_direction(longitude, latitude)
        with b.site(
            "exposed_ice_fracture", longitude, latitude, _ice_radius(normal) - 0.008
        ):
            b.ico(
                "fracture_lower_stratum",
                width,
                (0, 0, 0.015),
                "terrain_dark",
                (1.55, 0.45, 0.30),
                1,
            )
            b.ico(
                "cleaved_translucent_ice_lip",
                width * 0.87,
                (0.014, 0.005, 0.037),
                "terrain_light",
                (1.45, 0.31, 0.25),
                1,
            )


def _ice_extraction_portal(b):
    b.box("ice_bore_contact_foundation", (0.19, 0.16, 0.031), (0, 0, 0.008), "metal")
    b.cylinder("deep_ice_bore_throat", 0.048, 0.016, (0, 0, 0.031), "shadow", 12)
    b.ring(
        "insulated_ice_drill_collar", 0.057, 0.010, (0, 0, 0.045), "accent", segments=16
    )
    for x in (-0.083, 0.083):
        b.box("portal_ground_anchor", (0.057, 0.078, 0.032), (x, 0.035, 0.012), "hull")
        b.beam(
            "portal_main_column", (x, 0.035, 0.021), (x, 0.035, 0.31), 0.014, "metal"
        )
        b.beam("portal_rear_brace", (x, 0.13, -0.005), (x, 0.035, 0.24), 0.009, "hull")
    b.box("ice_bore_portal_crosshead", (0.225, 0.068, 0.038), (0, 0.035, 0.322), "hull")
    b.box(
        "controlled_drill_carriage", (0.078, 0.070, 0.097), (0, 0.028, 0.263), "accent"
    )
    b.cylinder("insulated_bore_feed_shaft", 0.022, 0.20, (0, 0.015, 0.145), "hull", 10)
    for z in (0.070, 0.132, 0.194):
        b.ring(
            "bore_feed_pressure_joint",
            0.024,
            0.006,
            (0, 0.015, z),
            "metal",
            segments=12,
        )
    b.tube(
        "ice_melt_transfer_line",
        [(0.026, 0.015, 0.115), (0.10, -0.025, 0.12), (0.21, -0.04, 0.09)],
        0.014,
        "accent",
    )


def _kuiper_works(b):
    _cleaved_ice(b)
    normal = _ice_direction(-15, 37)
    with b.site("kuiper_deep_ice_extraction", -15, 37, _ice_radius(normal), 0.98):
        _ice_extraction_portal(b)
        if b.world == "S5":
            with b.group("cold_bioprocess_vessel_bank", (0.205, -0.005, -0.014)):
                b.box(
                    "bioprocess_bank_foundation",
                    (0.14, 0.15, 0.028),
                    (0, 0, 0.006),
                    "hull",
                )
                for x, y, h in ((-0.034, -0.025, 0.23), (0.036, 0.035, 0.16)):
                    b.cylinder(
                        "sealed_cold_growth_column",
                        0.037,
                        h,
                        (x, y, h / 2 + 0.025),
                        "glass",
                        12,
                    )
                    b.cylinder(
                        "growth_column_pressure_cap",
                        0.042,
                        0.016,
                        (x, y, h + 0.029),
                        "hull",
                        12,
                        top=0.029,
                    )
                    for z in (0.070, h * 0.74):
                        b.ring(
                            "growth_column_rib",
                            0.038,
                            0.004,
                            (x, y, z),
                            "green",
                            segments=12,
                        )
                b.tube(
                    "cold_bioprocess_return",
                    [
                        (-0.034, -0.025, 0.18),
                        (-0.09, -0.025, 0.18),
                        (-0.09, -0.05, 0.07),
                    ],
                    0.009,
                    "green",
                )
        elif b.world == "S6":
            with b.group("redundant_cryogenic_processor", (0.22, 0.015, -0.01)):
                b.box(
                    "cryogenic_foundation", (0.16, 0.17, 0.028), (0, 0, 0.007), "metal"
                )
                b.box(
                    "insulated_cold_process_chest",
                    (0.125, 0.14, 0.15),
                    (0, 0, 0.096),
                    "hull",
                )
                for y in (-0.053, 0.053):
                    b.box(
                        "process_chest_seam",
                        (0.13, 0.012, 0.156),
                        (0, y, 0.096),
                        "accent",
                        bevel=0.002,
                    )
                b.box(
                    "cold_access_pressure_door",
                    (0.078, 0.018, 0.094),
                    (0, -0.081, 0.087),
                    "metal",
                )
                b.cylinder(
                    "process_expansion_drum", 0.032, 0.09, (0, 0, 0.22), "hull", 10
                )
                b.tube(
                    "redundant_cold_feed",
                    [(-0.085, 0, 0.12), (-0.13, -0.05, 0.12), (-0.16, -0.04, 0.075)],
                    0.010,
                    "metal",
                )
            _radiator(
                b,
                "cold_processor_thermal_fence",
                (-0.20, 0.06, -0.02),
                0.13,
                0.30,
                -0.2,
            )
        elif b.world == "S9":
            with b.group(
                "autonomous_ice_core_transfer",
                (0.21, -0.08, -0.01),
                (0, 0, -0.5),
                (0.63, 0.63, 0.63),
            ):
                _crane(b, "ice_core_handling_arm", machine=True)
            b.box(
                "robotic_core_magazine",
                (0.15, 0.13, 0.041),
                (-0.19, -0.055, 0.025),
                "metal",
            )
            for x in (-0.235, -0.188, -0.141):
                b.cylinder(
                    "captured_ice_core_canister",
                    0.017,
                    0.107,
                    (x, -0.055, 0.089),
                    "hull",
                    8,
                )
                b.cylinder(
                    "core_lock_ring", 0.022, 0.015, (x, -0.055, 0.147), "accent", 8
                )
        else:
            b.box(
                "cargo_transfer_foundation",
                (0.19, 0.14, 0.03),
                (0.215, -0.055, 0.007),
                "metal",
            )
            b.box(
                "sealed_ice_cargo_capsule",
                (0.14, 0.10, 0.11),
                (0.215, -0.055, 0.079),
                "hull",
            )
            b.box(
                "cargo_capsule_capture_ring",
                (0.16, 0.019, 0.125),
                (0.215, -0.02, 0.079),
                "accent",
            )
            for x in (0.14, 0.29):
                b.beam(
                    "cargo_transfer_cradle",
                    (x, -0.11, 0.018),
                    (x, -0.11, 0.14),
                    0.007,
                    "metal",
                )
            b.box(
                "autonomous_transfer_head",
                (0.19, 0.04, 0.025),
                (0.215, -0.11, 0.145),
                "hull",
            )
        bore_endpoint = b.box(
            "bore_service_bus", (0.052, 0.05, 0.07), (-0.13, -0.055, 0.054), "hull"
        )
    normal = _ice_direction(38, 59)
    with b.site("upper_ice_lobe_support_station", 38, 59, _ice_radius(normal), 0.65):
        if b.world == "S5":
            _petal_house(b, "sealed_upper_lobe_growth_station", (0, 0, 0), 0.72)
        elif b.world == "S6":
            _pod(
                b,
                "redundant_pressure_refuge",
                length=0.25,
                width=0.14,
                height=0.13,
                yaw=0.15,
                windows=False,
            )
            b.box(
                "refuge_reserve_tank",
                (0.067, 0.066, 0.10),
                (0.16, 0.013, 0.053),
                "accent",
            )
        elif b.world == "S9":
            b.box(
                "autonomous_upper_lobe_thermal_core",
                (0.15, 0.11, 0.16),
                (0, 0, 0.085),
                "metal",
            )
            _radiator(b, "upper_lobe_thermal_vanes", (0, 0.072, 0.02), 0.21, 0.28)
        else:
            _pod(
                b, "inhabited_ice_transfer_refuge", length=0.27, width=0.16, height=0.15
            )
            b.box(
                "refuge_observation_cap",
                (0.115, 0.064, 0.017),
                (0, -0.045, 0.177),
                "glass",
            )
    normal = _ice_direction(-65, -17)
    with b.site("lower_ice_lobe_energy_station", -65, -17, _ice_radius(normal), 0.75):
        power_endpoint = _power_station(b, True)
    # Conduit follows the actual cleaved profile instead of a sphere or an orbit.
    frame = b._world_matrix(b.parent).inverted()
    a = frame @ b._world_matrix(bore_endpoint).translation
    c = frame @ b._world_matrix(power_endpoint).translation
    points = [a]
    for i in range(1, 18):
        n = a.normalized().lerp(c.normalized(), i / 18).normalized()
        points.append(n * (_ice_radius(n) + 0.013))
    points.append(c)
    b.tube("cleft_following_service_conduit", points, 0.007, "metal")


def _feature(b, feature):
    if feature == "kuiper":
        _kuiper_works(b)
    elif feature == "asteroids":
        _rock(b, False)
        with b.site("grounded_extraction_assembly", -6, 46, 0.64, 1.10):
            _extraction_site(b, False)
        with b.site("separated_outpost_power_wing", -59, 24, 0.65, 0.85):
            _panel(b, "power_conversion_wing", (0, 0, 0.10), 0.29, 0.23, -0.35)
        with b.site("independent_thermal_wing", 53, 10, 0.64, 0.8):
            _panel(b, "heat_rejection_wing", (0, 0, 0.10), 0.24, 0.18, 0.45, True)
        # One unequal detached fragment gives depth without becoming orbital decoration.
        b.ico(
            "cleaved_companion_fragment",
            0.105,
            (-0.75, 0.045, -0.40),
            "terrain_dark",
            (1.1, 0.65, 0.8),
            1,
        )
    elif feature == "outer":
        with b.group(
            "generic_rear_ringed_giant", (0.95, 0.56, 0.46), (0.16, -0.20, 0.12)
        ):
            giant = b.ico(
                "generic_outer_giant", 0.43, material="terrain_dark", subdivisions=3
            )
            giant.data.materials.append(b.mats["terrain_light"])
            giant.data.materials.append(b.mats["accent"])
            for face in giant.data.polygons:
                center = sum(
                    (giant.data.vertices[i].co for i in face.vertices), Vector()
                ) / len(face.vertices)
                face.material_index = (
                    1
                    if math.sin(center.z * 27) > 0.3
                    else 2
                    if math.sin(center.z * 27) < -0.55
                    else 0
                )
            # Closed flat annulus with radial divisions: a ring system, not a tube.
            verts = [
                (r * math.cos(TAU * i / 48), r * math.sin(TAU * i / 48), z)
                for z, r in (
                    (-0.006, 0.50),
                    (-0.006, 0.65),
                    (0.006, 0.50),
                    (0.006, 0.65),
                )
                for i in range(48)
            ]
            faces = []
            for i in range(48):
                j = (i + 1) % 48
                faces.extend(
                    [
                        (i, j, 48 + j, 48 + i),
                        (96 + i, 144 + i, 144 + j, 96 + j),
                        (i, 96 + i, 96 + j, j),
                        (48 + i, 48 + j, 144 + j, 144 + i),
                    ]
                )
            b.mesh("broad_separated_giant_rings", verts, faces, "accent")
        with b.group(
            "foreground_ice_settlement", (-0.28, -0.20, -0.12), scale=(0.76, 0.76, 0.76)
        ):
            _rock(b, True, 0.69)
            with b.site("ice_settlement_primary", -5, 45, 0.69, 0.97):
                if b.world == "S9":
                    _autonomous_settlement(b, "Mars")
                elif b.world == "S10":
                    _dual_settlement(b, "Moon")
                else:
                    SETTLEMENTS[b.world](b, "Moon")
            with b.site("ice_settlement_utility_yard", -63, 19, 0.68, 0.7):
                _panel(b, "cold_outpost_power", (0, 0, 0.11), 0.24, 0.18, -0.4)
    elif feature == "solar":
        b.ico("illustrative_star", 0.48, material="terrain", subdivisions=3)
        # Sparse, unequal collector groups have backside buses and actual frames.
        for index, (x, y, z, yaw, tilt, width, height) in enumerate(
            (
                (-0.74, -0.10, 0.39, -0.36, 0.34, 0.37, 0.28),
                (0.56, -0.20, 0.62, 0.45, -0.45, 0.32, 0.23),
                (0.78, 0.04, -0.13, 0.20, -0.80, 0.27, 0.35),
                (-0.26, -0.23, -0.73, -0.22, 0.64, 0.39, 0.25),
            )
        ):
            with b.group(
                f"solar_collector_{index}", (x, y, z), (tilt, yaw, yaw * 0.35)
            ):
                _panel(b, "framed_energy_collector", (0, 0, 0), width, height, 0)
                b.box(
                    "collector_backside_bus",
                    (width * 0.70, 0.046, 0.035),
                    (0, 0, -0.031),
                    "hull",
                )
                b.cylinder(
                    "collector_attitude_unit",
                    0.026,
                    0.055,
                    (width * 0.28, 0, -0.046),
                    "accent",
                    10,
                )
                b.beam(
                    "collector_receiver_mast",
                    (0, 0, -0.035),
                    (0, 0.13, -0.13),
                    0.006,
                    "metal",
                )
        with b.group(
            "solar_transfer_and_service_node",
            (-0.56, 0.12, -0.35),
            (0.5, -0.4, 0.2),
            (0.34, 0.34, 0.34),
        ):
            _machine_station(b)


def build_system_world(world_id: str, selection: str, system: dict) -> list:
    """Build one admitted body or feature; never infer destinations from empty cells.

    `system` is the canonical view's {bodies:[{body,activity}], features:[...]}. Luna
    is accepted as a presentation alias for Moon. The function does not read files,
    export, render, reset the scene or mutate canonical data.
    """
    if world_id not in WORLD_IDS:
        raise ValueError(f"Unknown Janus scenario: {world_id}")
    selection = "Moon" if selection == "Luna" else selection
    companions = {
        entry["body"]: entry["activity"] for entry in system.get("bodies", [])
    }
    features = set(system.get("features", []))
    if selection not in companions and selection not in features:
        raise ValueError(
            f"{world_id}/{selection} is not selected by the supplied published footprint"
        )
    if selection not in BODY_NAMES | FEATURE_NAMES:
        raise ValueError(f"Unsupported Solar System destination: {selection}")
    if selection == "solar" and world_id != "S9":
        raise ValueError(
            "The current solar portrait is scoped to the S9 published footprint"
        )
    b = _Builder(world_id, selection)
    with b.group(f"Portrait_{selection}") as root:
        root["scenario_id"] = world_id
        root["selection"] = selection
        root["not_to_scale"] = True
        if selection in FEATURE_NAMES:
            _feature(b, selection)
        else:
            activity = companions[selection]
            if activity not in {"surface", "atmosphere", "orbital"}:
                raise ValueError(f"Unsupported footprint activity: {activity}")
            root["published_activity"] = activity
            _terrain(b, selection)
            if activity == "orbital":
                with b.group(
                    "separated_orbital_activity",
                    (0.39, -0.22, 1.33),
                    (0.16, -0.16, -0.25),
                    (0.70, 0.70, 0.70),
                ):
                    if world_id == "S9":
                        _machine_station(b)
                    else:
                        _orbital_habitat(b, elite=world_id == "S1")
            elif activity == "atmosphere":
                with b.site("suspended_atmospheric_settlement", -10, 62, 1.42, 0.82):
                    # A suspended pressure cabin has structural saddles, not ground footings.
                    b.ground = None
                    _aerostat(b, organic=world_id == "S5")
                with b.site("high_atmosphere_cloud_bank", 61, 12, 0.97, 1):
                    for x, y, z, r in (
                        (0, 0, 0.04, 0.09),
                        (0.11, 0.01, 0.032, 0.07),
                        (-0.06, -0.02, 0.013, 0.064),
                    ):
                        b.ico(
                            "elevated_cloud_mass",
                            r,
                            (x, y, z),
                            "terrain_light",
                            (1.2, 0.8, 0.62),
                            1,
                        )
            else:
                if world_id not in SETTLEMENTS:
                    raise ValueError(f"No surface art is admitted for {world_id}")
                with b.site("primary_grounded_settlement", -8, 46, 0.825, 1.05):
                    SETTLEMENTS[world_id](b, selection)
                    b.box(
                        "local_power_junction_foundation",
                        (0.08, 0.08, 0.023),
                        (-0.275, -0.10, 0.005),
                        "metal",
                    )
                    inlet = b.box(
                        "settlement_service_inlet",
                        (0.056, 0.055, 0.079),
                        (-0.275, -0.10, 0.055),
                        "hull",
                    )
                    b.box(
                        "service_inlet_cover",
                        (0.04, 0.006, 0.041),
                        (-0.275, -0.131, 0.061),
                        "accent",
                    )
                    b.tube(
                        "settlement_buried_power_entry",
                        [
                            (-0.275, -0.10, 0.036),
                            (-0.20, -0.06, 0.036),
                            (-0.13, -0.025, 0.046),
                        ],
                        0.008,
                        "metal",
                    )
                with b.site("separated_utility_site", -57, 18, 0.825, 0.80):
                    if world_id == "S8":
                        power_inlet = _power_station(b, True)
                    elif world_id == "S9":
                        _radiator(
                            b,
                            "autonomous_thermal_station",
                            (0, 0, -0.006),
                            0.18,
                            0.23,
                            -0.3,
                        )
                        power_inlet = b.box(
                            "autonomous_thermal_bus",
                            (0.11, 0.08, 0.083),
                            (0, -0.085, 0.043),
                            "metal",
                        )
                    else:
                        power_inlet = _power_station(b)
                _surface_connection(b, inlet, power_inlet)
                with b.site("separated_navigation_site", 53, 17, 0.825, 0.64):
                    if world_id == "S9":
                        b.box(
                            "autonomous_navigation_interface",
                            (0.11, 0.09, 0.19),
                            (0, 0, 0.085),
                            "metal",
                        )
                        b.box(
                            "navigation_optical_face",
                            (0.07, 0.01, 0.063),
                            (0, -0.051, 0.11),
                            "glass",
                        )
                    else:
                        b.box(
                            "communications_foundation",
                            (0.16, 0.13, 0.028),
                            (0, 0, 0.012),
                            "metal",
                        )
                        b.box(
                            "protected_receiver_cabinet",
                            (0.075, 0.068, 0.071),
                            (-0.06, 0.044, 0.061),
                            "hull",
                        )
                        _dish(b, "navigation_and_research_dish", size=0.23, yaw=0.2)
                        b.tube(
                            "instrument_power_feed",
                            [
                                (-0.06, 0.04, 0.072),
                                (-0.023, 0.043, 0.074),
                                (0, 0, 0.074),
                            ],
                            0.006,
                            "accent",
                        )
    return b.objects


def build_study(world_id: str, kind: str) -> list:
    """Build an isolated native prefab for the existing accessible detail explorer.

    Studies are artistic closeups, not additional selected planetary activity. The
    caller decides which study is linked from reviewed scene descriptions.
    """
    if world_id not in WORLD_IDS:
        raise ValueError(f"Unknown Janus scenario: {world_id}")
    allowed = {
        "lunar-base",
        "mars-base",
        "aerostat",
        "venus-facility",
        "orbital-habitat",
        "machine-station",
        "machine-facility",
    }
    if kind not in allowed:
        raise ValueError(f"Unsupported Janus model study: {kind}")
    b = _Builder(world_id, kind)
    with b.group(f"Study_{kind}") as root:
        root["scenario_id"] = world_id
        root["study_kind"] = kind
        if kind in {"lunar-base", "mars-base"}:
            if world_id not in SETTLEMENTS:
                raise ValueError(f"No settlement prefab is admitted for {world_id}")
            SETTLEMENTS[world_id](b, "Moon" if kind == "lunar-base" else "Mars")
        elif kind == "venus-facility":
            root["interpretive_study"] = "anchored_venus_process_works"
            if world_id == "S9":
                _autonomous_settlement(b, "Venus")
            else:
                _engineered_settlement(b, "Venus")
        elif kind == "aerostat":
            _aerostat(b, organic=world_id == "S5")
        elif kind == "orbital-habitat":
            _orbital_habitat(b, elite=world_id == "S1")
        elif kind == "machine-station":
            _machine_station(b)
        else:
            _autonomous_settlement(b, "Mars")
    return b.objects
