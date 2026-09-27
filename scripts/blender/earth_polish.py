"""Editable, bounded original finishing for Janus miniature landmarks and actors.

Coordinates below intentionally follow their reviewed Three.js source models (Y up).
Mesh creation converts to Blender (x, -z, y), preserving the caller's local pivot.
No terrain, route, actor transform, animation or canonical scientific value is changed.
"""

from __future__ import annotations

import math

import bmesh
import bpy
from mathutils import Vector

PALETTE = {
    "alloy": "c2bdad",
    "dark": "344b58",
    "copper": "ad865b",
    "timber": "8f6845",
    "chalk": "dfd7bb",
    "moss": "88a47b",
    "leaf": "b3c8a5",
    "ceramic": "b2b9bf",
    "ochre": "c19860",
    "cloth": "d6bd92",
    "lens": "679b9d",
    "rust": "95766f",
    "cloud": "f4f8ff",
}


def _material(key):
    name = "JanusFinish_" + key
    material = bpy.data.materials.get(name)
    if material is None:
        material = bpy.data.materials.new(name)
        material.use_nodes = True
        rgb = [int(PALETTE[key][i : i + 2], 16) / 255 for i in (0, 2, 4)]
        rgb = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
        material.diffuse_color = (*rgb, 1)
        shader = material.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = (*rgb, 1)
        shader.inputs["Roughness"].default_value = (
            0.42 if key in {"lens", "alloy"} else 0.76
        )
        shader.inputs["Metallic"].default_value = (
            0.28 if key in {"alloy", "copper"} else 0.02
        )
        material.use_backface_culling = False
    return material


def _triangles(mesh):
    return sum(max(0, len(face.vertices) - 2) for face in mesh.polygons)


class Finish:
    """Bound complexity without making sparse focal objects impossible to finish."""

    def __init__(self, world, part, seed, mobile):
        self.world, self.part, self.seed = world, part, seed
        self.mobile = mobile
        self.original = _triangles(seed.data)
        if part.startswith("Landmark_"):
            hero = any(
                part.endswith(kind)
                for kind in ("watermill", "checkpoint", "pavilion", "camp", "workshop")
            )
            self.limit = max(1000 if hero else 400, math.floor(self.original * 0.32))
        elif part.endswith("_body"):
            self.limit = max(
                650 if "canoe" in part else 200, math.floor(self.original * 0.28)
            )
        else:
            self.limit = max(40, math.floor(self.original * 0.2))
        self.used = 0
        self.objects = []

    def mesh(self, label, vertices, faces, material):
        cost = sum(max(0, len(face) - 2) for face in faces)
        if self.used + cost > self.limit:
            return None
        mesh = bpy.data.meshes.new("FinishMesh_" + label)
        mesh.from_pydata([(x, -z, y) for x, y, z in vertices], [], faces)
        mesh.update()
        obj = bpy.data.objects.new(f"Finish_{self.world}_{self.part}_{label}", mesh)
        bpy.context.collection.objects.link(obj)
        mesh.materials.append(_material(material))
        obj["content_origin"] = "interpretive"
        obj["janus_detail"] = label
        obj["janus_parent_part"] = self.part
        self.objects.append(obj)
        self.used += cost
        return obj

    def box(self, label, p, size, material="alloy"):
        x, y, z = p
        a, b, c = (v / 2 for v in size)
        vertices = [
            (x + sx * a, y + sy * b, z + sz * c)
            for sx, sy, sz in [
                (-1, -1, -1),
                (1, -1, -1),
                (1, 1, -1),
                (-1, 1, -1),
                (-1, -1, 1),
                (1, -1, 1),
                (1, 1, 1),
                (-1, 1, 1),
            ]
        ]
        return self.mesh(
            label,
            vertices,
            [
                (0, 3, 2, 1),
                (4, 5, 6, 7),
                (0, 1, 5, 4),
                (1, 2, 6, 5),
                (2, 3, 7, 6),
                (3, 0, 4, 7),
            ],
            material,
        )

    def bar(self, label, a, b, radius=0.002, material="alloy", sides=4):
        start, end = Vector(a), Vector(b)
        direction = end - start
        if direction.length < 1e-8:
            return None
        axis = direction.normalized()
        cross = axis.cross(
            Vector((0, 1, 0)) if abs(axis.y) < 0.9 else Vector((1, 0, 0))
        ).normalized()
        other = axis.cross(cross).normalized()
        vertices = []
        for center in (start, end):
            for i in range(sides):
                angle = i * math.tau / sides
                vertices.append(
                    tuple(
                        center
                        + radius * (cross * math.cos(angle) + other * math.sin(angle))
                    )
                )
        faces = [tuple(reversed(range(sides))), tuple(range(sides, sides * 2))]
        faces += [
            (i, (i + 1) % sides, (i + 1) % sides + sides, i + sides)
            for i in range(sides)
        ]
        return self.mesh(label, vertices, faces, material)

    def plate(self, label, points, material="dark"):
        # Readable inset/overlay surfaces; no tiny text, disconnected decals or expensive textures.
        return self.mesh(label, points, [tuple(range(len(points)))], material)

    def line(self, label, points, radius=0.002, material="alloy"):
        for i in range(len(points) - 1):
            self.bar(f"{label}_{i}", points[i], points[i + 1], radius, material)

    def vent(self, label, x, y, z, width=0.032, count=3):
        for i in range(count):
            yy = y + i * 0.009
            self.plate(
                f"{label}_{i}",
                [
                    (x - width / 2, yy, z),
                    (x + width / 2, yy, z),
                    (x + width / 2, yy + 0.004, z + 0.003),
                    (x - width / 2, yy + 0.004, z + 0.003),
                ],
            )

    def rivet_plate(self, label, x, y, z, w=0.018, h=0.025, material="alloy"):
        return self.plate(
            label,
            [
                (x - w / 2, y - h / 2, z),
                (x + w / 2, y - h / 2, z),
                (x + w / 2, y + h / 2, z),
                (x - w / 2, y + h / 2, z),
            ],
            material,
        )

    def ellipsoid(self, label, center, radii, material="cloth", segments=8, rings=3):
        x, y, z = center
        rx, ry, rz = radii
        vertices = [(x, y + ry, z), (x, y - ry, z)]
        for j in range(1, rings):
            polar = math.pi * j / rings
            for i in range(segments):
                a = math.tau * i / segments
                vertices.append(
                    (
                        x + rx * math.sin(polar) * math.cos(a),
                        y + ry * math.cos(polar),
                        z + rz * math.sin(polar) * math.sin(a),
                    )
                )
        faces = []
        for i in range(segments):
            ii = (i + 1) % segments
            faces.extend(
                [
                    (0, 2 + ii, 2 + i),
                    (
                        1,
                        2 + (rings - 2) * segments + i,
                        2 + (rings - 2) * segments + ii,
                    ),
                ]
            )
            for j in range(rings - 2):
                a = 2 + j * segments + i
                b = 2 + j * segments + ii
                faces.append((a, b, b + segments, a + segments))
        return self.mesh(label, vertices, faces, material)


def _hard_edge_finish(f):
    """Bevel a few welded manifold edges, keeping the seed mesh and loop colors intact."""
    if f.mobile or f.limit - f.used < 24 or len(f.seed.data.polygons) > 12000:
        return
    hard = f.part.startswith("Landmark_") and not any(
        x in f.part
        for x in ("growth-pod", "bio-arch", "petal-house", "camp", "gift", "canopy")
    )
    hard = hard or f.part.startswith(
        ("Life_vehicle_", "Life_machine_", "Life_aircraft_")
    )
    if not hard:
        return
    bm = bmesh.new()
    try:
        bm.from_mesh(f.seed.data)
        bm.edges.ensure_lookup_table()
        bm.normal_update()
        candidates = [
            edge
            for edge in bm.edges
            if len(edge.link_faces) == 2
            and 0.85 < edge.calc_face_angle(0) < 2.25
            and edge.calc_length() > 0.025
        ]
        candidates.sort(key=lambda edge: edge.calc_length(), reverse=True)
        indices = [
            edge.index for edge in candidates[: min(4, (f.limit - f.used) // 18)]
        ]
    finally:
        bm.free()
    if not indices:
        return
    mesh = f.seed.data
    weights = mesh.attributes.get("bevel_weight_edge")
    if weights is None:
        weights = mesh.attributes.new("bevel_weight_edge", "FLOAT", "EDGE")
    previous = [weights.data[index].value for index in indices]
    for index in indices:
        weights.data[index].value = 1.0
    bevel = f.seed.modifiers.new("Janus selective edge finishing", "BEVEL")
    bevel.width = 0.0009
    bevel.segments = 1
    bevel.limit_method = "WEIGHT"
    bevel.use_clamp_overlap = True
    bpy.context.view_layer.update()
    evaluated = f.seed.evaluated_get(bpy.context.evaluated_depsgraph_get())
    result = evaluated.to_mesh()
    try:
        added = max(0, _triangles(result) - f.original)
    finally:
        evaluated.to_mesh_clear()
    if added > f.limit - f.used:
        f.seed.modifiers.remove(bevel)
        for index, value in zip(indices, previous, strict=True):
            weights.data[index].value = value
    else:
        f.used += added


def _landmark(f, kind):
    # First details are the most visible/functional; optional detail stops at the triangle allowance.
    if kind == "checkpoint":
        for x in (-0.11, 0.11):
            f.box(
                "screening_window_reveal",
                (x, 0.154, 0.059),
                (0.05, 0.052, 0.008),
                "dark",
            )
            f.rivet_plate("inner_window", x, 0.158, 0.064, 0.034, 0.031, "lens")
        f.box(
            "screening_lane_canopy_edge",
            (0, 0.198, 0.052),
            (0.174, 0.009, 0.008),
            "copper",
        )
        f.vent("booth_air_intake", -0.11, 0.042, 0.052, count=3)
    elif kind == "tenement":
        for y in (0.063, 0.138):
            f.bar(
                "balcony_brace_left",
                (-0.079, y - 0.027, 0.066),
                (-0.079, y, 0.098),
                0.003,
                "alloy",
            )
            f.bar(
                "balcony_brace_right",
                (0.079, y - 0.027, 0.066),
                (0.079, y, 0.098),
                0.003,
                "alloy",
            )
        f.vent("residential_utility_grille", 0.042, 0.181, 0.037, 0.045, 3)
    elif kind == "watchtower":
        for side in (-1, 1):
            f.box(
                "lens_gimbal_cheek",
                (side * 0.042, 0.3, 0.06),
                (0.009, 0.041, 0.037),
                "dark",
            )
        f.bar(
            "gimbal_crossbar",
            (-0.043, 0.321, 0.064),
            (0.043, 0.321, 0.064),
            0.004,
            "alloy",
        )
    elif kind == "depot":
        for x in (-0.08, 0, 0.08):
            f.box(
                "loading_bay_header", (x, 0.086, 0.096), (0.058, 0.01, 0.012), "alloy"
            )
            f.vent("roller_shutter", x, 0.021, 0.095, 0.04, 4)
        f.box(
            "freight_corner_protector",
            (0.142, 0.035, 0.088),
            (0.006, 0.068, 0.016),
            "ochre",
        )
    elif kind == "derrick":
        f.box("winch_motor", (-0.038, 0.074, -0.046), (0.035, 0.025, 0.033), "dark")
        f.bar(
            "hoist_drum",
            (-0.032, 0.078, -0.048),
            (0.032, 0.078, -0.048),
            0.016,
            "alloy",
            6,
        )
        f.line(
            "loaded_hoist_cable",
            [(0, 0.082, -0.048), (0, 0.305, 0), (0.15, 0.232, 0)],
            0.0018,
            "dark",
        )
    elif kind == "conveyor":
        f.plate(
            "receiving_chute_left",
            [
                (0.112, 0.117, -0.042),
                (0.16, 0.128, -0.042),
                (0.16, 0.146, -0.05),
                (0.112, 0.135, -0.05),
            ],
            "ochre",
        )
        f.plate(
            "receiving_chute_right",
            [
                (0.112, 0.117, 0.042),
                (0.112, 0.135, 0.05),
                (0.16, 0.146, 0.05),
                (0.16, 0.128, 0.042),
            ],
            "ochre",
        )
        f.box(
            "belt_motor_guard", (-0.122, 0.059, -0.052), (0.035, 0.028, 0.025), "dark"
        )
        for x in (-0.112, 0.11):
            f.bar(
                "cross_frame",
                (x, 0.009, -0.026),
                (x + 0.014, 0.063, 0.026),
                0.003,
                "alloy",
            )
    elif kind == "reservoir":
        f.box(
            "service_valve_housing",
            (0.133, 0.041, 0.051),
            (0.027, 0.025, 0.027),
            "dark",
        )
        f.rivet_plate("level_sight_glass", 0.018, 0.102, 0.075, 0.012, 0.09, "lens")
        for y in (0.063, 0.095, 0.127):
            f.rivet_plate("level_sight_tick", 0.034, y, 0.075, 0.012, 0.003, "chalk")
    elif kind == "courtyard":
        f.box(
            "community_bench", (-0.028, 0.026, -0.046), (0.057, 0.008, 0.026), "timber"
        )
        for x in (-0.049, -0.007):
            f.box("bench_foot", (x, 0.013, -0.046), (0.007, 0.019, 0.02), "chalk")
        f.plate(
            "civic_threshold",
            [
                (-0.042, 0.01, 0.091),
                (0.042, 0.01, 0.091),
                (0.042, 0.01, 0.11),
                (-0.042, 0.01, 0.11),
            ],
            "alloy",
        )
    elif kind == "pavilion":
        for side in (-1, 1):
            f.bar(
                "roof_knee_brace",
                (side * 0.095, 0.09, 0.08),
                (side * 0.06, 0.142, 0.08),
                0.004,
                "timber",
            )
        f.box("shared_bench", (0, 0.04, -0.074), (0.135, 0.013, 0.023), "timber")
        f.box("bench_base", (0, 0.024, -0.074), (0.081, 0.024, 0.018), "chalk")
    elif kind == "terrace":
        for i in range(3):
            f.box(
                "terrace_planter_rim",
                (-0.01 + i * 0.02, 0.065 + i * 0.052, 0.066),
                (0.14 - i * 0.033, 0.009, 0.006),
                "chalk",
            )
        f.vent("passive_house_vent", 0.071, 0.021, 0.084, 0.027, 3)
    elif kind == "glasshouse":
        f.bar("roof_ridge_cap", (0, 0.153, -0.089), (0, 0.153, 0.089), 0.003, "alloy")
        f.plate(
            "ventilating_roof_panel",
            [
                (0.018, 0.141, -0.023),
                (0.063, 0.105, -0.023),
                (0.063, 0.115, 0.023),
                (0.018, 0.151, 0.023),
            ],
            "lens",
        )
        f.box("grow_bed_end", (0, 0.03, -0.049), (0.122, 0.023, 0.005), "timber")
    elif kind == "camp":
        for side in (-1, 1):
            f.line(
                "tied_entrance_seam",
                [
                    (0, 0.153, 0.023),
                    (side * 0.022, 0.074, 0.084),
                    (side * 0.027, 0.012, 0.09),
                ],
                0.0017,
                "cloth",
            )
        f.box("portable_frame_lashing", (0, 0.197, 0), (0.018, 0.013, 0.016), "cloth")
    elif kind == "rack":
        for side in (-1, 1):
            f.bar(
                "diagonal_rack_brace",
                (side * 0.1, 0.015, -0.035),
                (side * 0.1, 0.135, 0.035),
                0.003,
                "timber",
            )
            f.box(
                "crossbar_lashing",
                (side * 0.098, 0.139, 0.035),
                (0.015, 0.013, 0.016),
                "cloth",
            )
    elif kind == "store":
        for side in (-1, 1):
            f.box(
                "rodent_barrier",
                (side * 0.06, 0.043, 0.058),
                (0.024, 0.005, 0.027),
                "alloy",
            )
        f.rivet_plate("store_door_latch", 0.011, 0.063, 0.087, 0.009, 0.019, "timber")
        f.vent("store_drying_vent", 0, 0.118, 0.069, 0.035, 3)
    elif kind == "totem":
        f.bar(
            "joinery_cross_pin",
            (-0.039, 0.155, 0.029),
            (0.039, 0.155, 0.029),
            0.003,
            "timber",
        )
        f.plate(
            "carved_direction_inset",
            [(-0.026, 0.144, 0.032), (0.022, 0.153, 0.032), (-0.026, 0.163, 0.032)],
            "chalk",
        )
    elif kind == "growth-pod":
        f.box("growth_service_cradle", (0, 0.032, 0.104), (0.064, 0.031, 0.024), "moss")
        f.line(
            "growth_return_tendril",
            [(0.026, 0.14, 0.085), (0.042, 0.084, 0.085), (0.033, 0.046, 0.104)],
            0.003,
            "leaf",
        )
        f.rivet_plate("growth_interface", 0, 0.039, 0.118, 0.038, 0.012, "lens")
    elif kind == "bio-arch":
        for side in (-1, 1):
            f.line(
                "braided_root_join",
                [
                    (side * 0.092, 0.024, 0.009),
                    (side * 0.074, 0.089, 0.022),
                    (side * 0.041, 0.173, 0.018),
                ],
                0.0035,
                "leaf",
            )
        f.plate(
            "living_canopy_vein",
            [
                (0, 0.262, 0.024),
                (0.045, 0.26, 0.063),
                (0.095, 0.23, 0.037),
                (0.045, 0.25, 0.053),
            ],
            "moss",
        )
    elif kind == "synthesis":
        f.box(
            "culture_retrieval_tray", (0, 0.047, 0.064), (0.09, 0.013, 0.032), "ceramic"
        )
        for side in (-1, 1):
            f.bar(
                "vessel_feed_port",
                (side * 0.054, 0.067, 0.033),
                (side * 0.032, 0.05, 0.063),
                0.005,
                "leaf",
            )
        f.rivet_plate("service_cradle_readout", 0, 0.045, 0.081, 0.026, 0.014, "lens")
    elif kind == "petal-house":
        for side in (-1, 1):
            f.line(
                "entry_living_rib",
                [
                    (side * 0.027, 0.018, 0.093),
                    (side * 0.035, 0.059, 0.097),
                    (side * 0.016, 0.096, 0.095),
                ],
                0.0027,
                "leaf",
            )
        f.plate(
            "petal_threshold",
            [
                (-0.025, 0.025, 0.102),
                (0.025, 0.025, 0.102),
                (0.025, 0.025, 0.118),
                (-0.025, 0.025, 0.118),
            ],
            "moss",
        )
    elif kind == "reactor":
        for side in (-1, 1):
            f.box(
                "reinforced_service_foot",
                (side * 0.118, 0.023, 0),
                (0.025, 0.018, 0.029),
                "alloy",
            )
        f.rivet_plate("pressure_access_panel", 0, 0.124, 0.074, 0.033, 0.049, "dark")
        f.rivet_plate("pressure_panel_indicator", 0, 0.134, 0.075, 0.021, 0.008, "lens")
    elif kind == "radiator":
        for x in (-0.086, 0, 0.086):
            f.box(
                "fin_manifold_collar", (x, 0.047, 0.07), (0.026, 0.021, 0.035), "alloy"
            )
        f.line(
            "thermal_return",
            [(-0.09, 0.043, -0.063), (0.09, 0.043, -0.063), (0.09, 0.026, -0.038)],
            0.0035,
            "copper",
        )
    elif kind == "manifold":
        # The three valve branches join the common pressure bus and share a supported skid.
        f.box(
            "manifold_structural_skid", (0, -0.019, 0.06), (0.235, 0.01, 0.20), "alloy"
        )
        for i, x in enumerate((-0.075, 0, 0.075)):
            bottom = 0.02 - i * 0.013
            f.box(
                "vessel_saddle",
                (x, (bottom - 0.014) / 2, 0),
                (0.069, bottom + 0.014, 0.065),
                "alloy",
            )
            f.bar(
                "valve_to_common_bus",
                (x, 0.072, 0.115),
                (x, 0.032, 0.13),
                0.008,
                "copper",
                sides=6,
            )
        for x in (-0.09, 0.09):
            f.box("bus_pipe_support", (x, 0.002, 0.13), (0.018, 0.032, 0.032), "alloy")
        for x in (-0.075, 0, 0.075):
            f.box(
                "valve_stem_bracket", (x, 0.073, 0.096), (0.025, 0.017, 0.013), "alloy"
            )
            f.rivet_plate("pressure_gauge_face", x, 0.103, 0.13, 0.013, 0.018, "chalk")
            f.rivet_plate("gauge_needle", x + 0.001, 0.104, 0.131, 0.002, 0.011, "dark")
    elif kind == "control":
        f.box("hooded_control_display", (0, 0.139, 0.051), (0.11, 0.01, 0.012), "alloy")
        f.box(
            "service_door_hinge",
            (-0.053, 0.052, 0.051),
            (0.007, 0.056, 0.008),
            "copper",
        )
        f.rivet_plate(
            "control_access_panel", 0.015, 0.032, 0.052, 0.044, 0.035, "ceramic"
        )
        f.vent("controller_heat_exhaust", -0.039, 0.027, 0.053, 0.018, 4)
    elif kind == "watermill":
        _mill_architecture(f)
        # Wheel is at x=.14; channel walls remain below its swept envelope.
        for x in (0.113, 0.167):
            f.box(
                "millrace_retaining_wall", (x, 0.014, 0), (0.006, 0.022, 0.21), "chalk"
            )
        f.bar(
            "reused_timber_brace",
            (-0.073, 0.018, 0.073),
            (0.064, 0.124, 0.073),
            0.004,
            "timber",
        )
        f.rivet_plate("masonry_repair", 0.043, 0.026, 0.075, 0.045, 0.021, "rust")
    elif kind == "workshop":
        for side in (-1, 1):
            f.bar(
                "awning_knee_brace",
                (side * 0.099, 0.035, 0.12),
                (side * 0.074, 0.086, 0.12),
                0.003,
                "timber",
            )
        f.box("bench_vice_jaw", (-0.032, 0.055, 0.154), (0.022, 0.018, 0.013), "alloy")
        f.rivet_plate(
            "workshop_repair_plate", 0.075, 0.048, 0.079, 0.033, 0.041, "rust"
        )
    elif kind == "seed-bank":
        for x in (-0.065, 0.065):
            f.rivet_plate("seed_drawer_face", x, 0.096, 0.043, 0.026, 0.038, "timber")
            f.box(
                "seed_drawer_handle", (x, 0.098, 0.048), (0.018, 0.005, 0.007), "alloy"
            )
            f.vent("protected_seed_vent", x, 0.123, 0.037, 0.022, 2)
    elif kind == "windmill":
        f.rivet_plate("mill_access_hinge", -0.013, 0.035, 0.073, 0.006, 0.041, "alloy")
        f.vent("drying_mill_vent", 0, 0.112, 0.052, 0.029, 3)
        f.bar("repair_tie", (-0.024, 0.2, 0.024), (0.024, 0.2, 0.024), 0.003, "timber")
    elif kind == "bunker":
        for x in (-0.052, 0.052):
            f.box("blast_door_hinge", (x, 0.037, 0.155), (0.012, 0.066, 0.016), "alloy")
        f.box("protected_view_slit", (0, 0.062, 0.159), (0.04, 0.009, 0.004), "dark")
        f.rivet_plate("refuge_patch_panel", 0.055, 0.019, 0.145, 0.031, 0.019, "rust")
    elif kind == "salvage":
        f.box(
            "beam_recovery_support",
            (-0.05, 0.017, 0.049),
            (0.027, 0.026, 0.022),
            "timber",
        )
        f.box("reused_gusset", (0.035, 0.028, 0.048), (0.034, 0.036, 0.006), "rust")
        f.line(
            "bound_recovered_stock",
            [(-0.066, 0.04, 0.043), (-0.016, 0.129, 0.039), (0.064, 0.068, 0.031)],
            0.002,
            "alloy",
        )
    elif kind == "broken-dish":
        f.box(
            "antenna_patch_box", (-0.027, 0.043, 0.051), (0.025, 0.029, 0.012), "rust"
        )
        f.line(
            "exposed_feed_cable",
            [
                (-0.028, 0.033, 0.047),
                (-0.035, 0.016, 0.042),
                (0.009, 0.012, 0.051),
                (0.037, 0.091, 0.015),
            ],
            0.0018,
            "dark",
        )
    elif kind == "pylon":
        for side in (-1, 1):
            f.rivet_plate(
                "spliced_pylon_joint", side * 0.04, 0.087, 0.017, 0.021, 0.032, "rust"
            )
        f.line(
            "frayed_insulator_lead",
            [(0.066, 0.169, 0.028), (0.087, 0.113, 0.036), (0.061, 0.085, 0.034)],
            0.002,
            "copper",
        )
    elif kind == "gift":
        f.plate(
            "quiet_gift_interface",
            [
                (-0.035, 0.018, 0.066),
                (0.033, 0.018, 0.066),
                (0.026, 0.024, 0.04),
                (-0.027, 0.024, 0.04),
            ],
            "lens",
        )
        for side in (-1, 1):
            f.bar(
                "gift_precision_bracket",
                (side * 0.038, 0.02, 0),
                (side * 0.014, 0.083, 0),
                0.0025,
                "alloy",
            )
    elif kind == "canopy":
        for side in (-1, 1):
            f.bar(
                "canopy_branch_joint",
                (0, 0.096, 0),
                (side * 0.087, 0.16, 0),
                0.004,
                "timber",
            )
        f.box("shared_table_edge", (0, 0.069, 0.07), (0.081, 0.004, 0.008), "timber")
    elif kind == "hauler":
        _vehicle(f, "haul-truck", "body")


def _mill_architecture(f):
    """Deep joinery and repaired masonry remain readable in the full-size object study."""
    # Recessed glazing stays behind the projected lintels and jambs.
    for x in (-0.0275, 0.0275):
        f.box("window_lintel", (x, 0.104, 0.08), (0.044, 0.006, 0.014), "timber")
        f.box("window_sill", (x, 0.066, 0.083), (0.046, 0.007, 0.021), "chalk")
        for side in (-1, 1):
            f.box(
                "window_jamb",
                (x + side * 0.019, 0.085, 0.08),
                (0.006, 0.032, 0.014),
                "timber",
            )
        f.rivet_plate("recessed_glazing", x, 0.086, 0.0795, 0.024, 0.025, "lens")
        f.bar("window_mullion", (x, 0.073, 0.081), (x, 0.099, 0.081), 0.0018, "timber")
    for x in (-0.063, -0.015):
        f.box("door_stone_jamb", (x, 0.036, 0.08), (0.011, 0.071, 0.019), "chalk")
    f.box("door_stone_lintel", (-0.039, 0.072, 0.08), (0.059, 0.012, 0.021), "chalk")
    f.box(
        "recessed_timber_door", (-0.039, 0.034, 0.081), (0.033, 0.06, 0.004), "timber"
    )
    for x in (-0.049, -0.039, -0.029):
        f.rivet_plate("door_plank_seam", x, 0.034, 0.0832, 0.0013, 0.056, "dark")
    for y in (0.019, 0.05):
        f.box("forged_door_hinge", (-0.043, y, 0.084), (0.028, 0.004, 0.003), "dark")
    f.box("door_latch", (-0.028, 0.035, 0.085), (0.005, 0.01, 0.005), "alloy")
    # Low raised stones and unequal repair lengths avoid a wallpaper grid.
    for row in range(3):
        y = 0.013 + row * 0.018
        for i in range(4):
            z = -0.054 + i * 0.035 + (0.006 if row == 1 else 0)
            f.box(
                "retained_side_masonry",
                (-0.083, y, z),
                (0.008, 0.016, 0.027 + (i % 2) * 0.004),
                "chalk" if (row + i) % 3 else "rust",
            )
        for i in range(2):
            x = 0.019 + i * 0.035 + (0.004 if row == 1 else 0)
            f.box(
                "repaired_front_masonry",
                (x, y, 0.075),
                (0.029, 0.016, 0.008),
                "chalk" if row % 2 else "ceramic",
            )
    # Timber corners and gable fascia provide depth even from the rear of the model.
    for side in (-1, 1):
        z = side * 0.094
        f.bar("gable_fascia", (-0.103, 0.13, z), (0, 0.207, z), 0.004, "timber")
        f.bar("gable_fascia", (0, 0.207, z), (0.103, 0.13, z), 0.004, "timber")
        f.bar("gable_tie", (-0.095, 0.133, z), (0.095, 0.133, z), 0.003, "timber")
    for side in (-1, 1):
        f.bar(
            "roof_eave",
            (side * 0.101, 0.131, -0.095),
            (side * 0.101, 0.131, 0.095),
            0.004,
            "timber",
        )
    f.bar("roof_ridge_cap", (0, 0.207, -0.098), (0, 0.207, 0.098), 0.004, "alloy")
    f.vent("gable_air_grille", 0, 0.152, 0.096, 0.042, 3)


def _vehicle(f, kind, piece):
    if piece == "extra0":
        radius = (
            0.045 if kind == "haul-truck" else 0.036 if kind == "cargo-cycle" else 0.031
        )
        for a in (0, math.pi / 2, math.pi, math.pi * 1.5):
            y, z = math.cos(a) * radius * 0.7, math.sin(a) * radius * 0.7
            f.plate(
                "wheel_hub_recess",
                [
                    (0.013, y - 0.004, z - 0.003),
                    (0.013, y + 0.004, z - 0.003),
                    (0.013, y + 0.004, z + 0.003),
                    (0.013, y - 0.004, z + 0.003),
                ],
                "dark",
            )
        return
    if piece == "extra1" and kind == "haul-truck":
        # Bed coordinates already include the original tipping-pivot offset.
        for side in (-1, 1):
            for z in (-0.11, -0.062, -0.012):
                f.box(
                    "dump_bed_rib",
                    (side * 0.064, 0.041, z),
                    (0.014, 0.054, 0.005),
                    "ochre",
                )
        return
    if piece != "body":
        return
    if kind == "cargo-cycle":
        # Fork blades terminate at the wheelSites front hub, not above the tire.
        for side in (-1, 1):
            f.bar(
                "front_fork_blade",
                (side * 0.009, 0.104, -0.07),
                (side * 0.009, 0.036, -0.072),
                0.004,
                "alloy",
            )
            f.bar(
                "cargo_axle_support",
                (side * 0.042, 0.068, 0.072),
                (side * 0.054, 0.036, 0.072),
                0.004,
                "alloy",
            )
        f.bar(
            "front_hub_axle",
            (-0.014, 0.036, -0.072),
            (0.014, 0.036, -0.072),
            0.004,
            "alloy",
        )
        f.bar(
            "rear_load_axle",
            (-0.059, 0.036, 0.072),
            (0.059, 0.036, 0.072),
            0.005,
            "alloy",
        )
        f.bar(
            "cargo_box_rear_strap",
            (-0.042, 0.124, 0.086),
            (0.042, 0.124, 0.086),
            0.002,
            "cloth",
        )
        f.plate(
            "cargo_box_side_join",
            [
                (0.047, 0.068, 0.035),
                (0.047, 0.13, 0.085),
                (0.047, 0.136, 0.085),
                (0.047, 0.074, 0.035),
            ],
            "timber",
        )
        f.box(
            "cycle_chain_guard", (-0.013, 0.074, -0.03), (0.005, 0.026, 0.052), "alloy"
        )
    elif kind == "haul-truck":
        f.vent("diesel_cooling_grille", 0, 0.088, -0.133, 0.075, 3)
        for side in (-1, 1):
            f.bar(
                "cab_access_grab",
                (side * 0.059, 0.08, -0.122),
                (side * 0.059, 0.137, -0.122),
                0.0025,
                "alloy",
            )
            f.box(
                "cab_step", (side * 0.06, 0.071, -0.106), (0.023, 0.007, 0.041), "alloy"
            )
    else:
        for side in (-1, 1):
            f.plate(
                "passenger_door_seam",
                [
                    (side * 0.061, 0.081, -0.05),
                    (side * 0.061, 0.114, -0.05),
                    (side * 0.061, 0.114, -0.047),
                    (side * 0.061, 0.081, -0.047),
                ],
                "dark",
            )
            f.box(
                "door_pull",
                (side * 0.061, 0.098, 0.021),
                (0.004, 0.004, 0.019),
                "alloy",
            )
        f.vent("front_radiator", 0, 0.075, -0.132, 0.041, 2)


def _vessel(f, kind, piece):
    if piece != "body":
        if kind == "canoe" and piece == "extra0":
            f.bar(
                "paddle_grip_wrap",
                (0, 0.019, -0.029),
                (0, -0.008, -0.007),
                0.0035,
                "cloth",
            )
        return
    if kind == "canoe":
        _canoe_crew(f)
        for z in (-0.105, -0.039, 0.061):
            f.line(
                "canoe_inner_rib",
                [
                    (-0.028, 0.045, z),
                    (-0.022, 0.036, z),
                    (0.022, 0.036, z),
                    (0.028, 0.045, z),
                ],
                0.0018,
                "timber",
            )
        f.plate(
            "bow_lashing",
            [
                (-0.009, 0.056, -0.16),
                (0.009, 0.056, -0.16),
                (0.013, 0.054, -0.148),
                (-0.013, 0.054, -0.148),
            ],
            "cloth",
        )
    elif kind in {"ferry", "research-skiff"}:
        if kind == "research-skiff":
            # A working survey launch: an aft sampling gantry, winch and specimen crates.
            # These are editable Blender pieces, not details painted onto the boat.
            f.limit += 240
            for side in (-1, 1):
                f.bar("sampling_gantry_leg", (side * .049, .058, .125), (side * .047, .19, .135), .004, "ochre")
            f.bar("sampling_gantry_crosshead", (-.047, .19, .135), (.047, .19, .135), .006, "ochre")
            f.bar("sample_hoist_line", (.025, .187, .135), (.025, .098, .135), .0018, "dark")
            f.box("sample_winch", (-.028, .072, .122), (.028, .023, .029), "alloy")
            for z in (.092, .128):
                f.box("ocean_sample_case", (.02, .066, z), (.025, .025, .028), "copper")
        for side in (-1, 1):
            x = side * (0.063 if kind == "ferry" else 0.04)
            f.line(
                "boarding_handrail",
                [
                    (x, 0.071, -0.087),
                    (x, 0.094, -0.087),
                    (x, 0.094, -0.119),
                    (x, 0.071, -0.119),
                ],
                0.002,
                "alloy",
            )
            f.plate(
                "passenger_deck_threshold",
                [
                    (x - 0.008, 0.072, -0.11),
                    (x + 0.008, 0.072, -0.11),
                    (x + 0.008, 0.072, -0.078),
                    (x - 0.008, 0.072, -0.078),
                ],
                "timber",
            )
        f.box("cabin_roof_vent", (0, 0.147, 0.071), (0.025, 0.009, 0.022), "ceramic")
    elif kind == "cutter":
        for side in (-1, 1):
            f.box(
                "shroud_chainplate",
                (side * 0.054, 0.052, 0.027),
                (0.008, 0.024, 0.019),
                "alloy",
            )
        f.line(
            "mast_boom_brace",
            [(0, 0.058, -0.028), (0, 0.087, -0.059), (0, 0.093, -0.105)],
            0.002,
            "timber",
        )
        f.box("cabin_hatch_frame", (0, 0.082, 0.041), (0.006, 0.005, 0.046), "timber")
    elif kind == "sail-barge":
        for side in (-1, 1):
            f.box(
                "mast_partner",
                (-0.025 + side * 0.012, 0.063, -0.125),
                (0.011, 0.025, 0.034),
                "timber",
            )
        f.line(
            "balanced_lug_downhaul",
            [(-0.025, 0.144, -0.172), (-0.021, 0.077, -0.134), (-0.011, 0.065, -0.12)],
            0.0018,
            "cloth",
        )
        for z in (-0.037, 0.033, 0.103):
            f.bar(
                "orchard_crate_hold_down",
                (-0.071, 0.108, z),
                (0.071, 0.108, z),
                0.0015,
                "cloth",
            )


def _remove_canoe_crew(seed):
    """Remove the four disconnected human seed components, preserving hull/seats/baggage."""
    if seed.get("janus_canoe_crew_replaced"):
        return 0
    before = _triangles(seed.data)
    bm = bmesh.new()
    try:
        bm.from_mesh(seed.data)
        remaining = set(bm.verts)
        crew_vertices = []
        components = 0
        while remaining:
            start = remaining.pop()
            connected, frontier = {start}, [start]
            while frontier:
                vertex = frontier.pop()
                for edge in vertex.link_edges:
                    other = edge.other_vert(vertex)
                    if other in remaining:
                        remaining.remove(other)
                        connected.add(other)
                        frontier.append(other)
            positions = [(v.co.x, v.co.z, -v.co.y) for v in connected]
            low = [min(p[i] for p in positions) for i in range(3)]
            high = [max(p[i] for p in positions) for i in range(3)]
            if (
                high[1] > 0.087
                and low[1] >= 0.058
                and low[0] > -0.035
                and high[0] < 0.075
                and low[2] > -0.046
                and high[2] < 0.065
            ):
                crew_vertices.extend(connected)
                components += 1
        if components != 4:
            raise RuntimeError(
                f"Canoe crew topology changed: expected four isolated human parts, got {components}. Hull was not modified."
            )
        bmesh.ops.delete(bm, geom=crew_vertices, context="VERTS")
        bm.to_mesh(seed.data)
        seed.data.update()
    finally:
        bm.free()
    seed["janus_canoe_crew_replaced"] = True
    return before - _triangles(seed.data)


def _canoe_crew(f):
    """A seated, connected figure with hips on the middle thwart and feet inside the hull."""
    f.box("seated_pelvis", (0, 0.066, 0.02), (0.03, 0.022, 0.033), "dark")
    # A tapered shirt, with actual shoulders and an open shoulder-to-neck transition.
    rings = [
        (-0.016, 0.075, 0.005),
        (0.016, 0.075, 0.005),
        (0.016, 0.075, 0.035),
        (-0.016, 0.075, 0.035),
        (-0.021, 0.109, 0.001),
        (0.021, 0.109, 0.001),
        (0.018, 0.111, 0.027),
        (-0.018, 0.111, 0.027),
        (-0.008, 0.118, 0.006),
        (0.008, 0.118, 0.006),
        (0.008, 0.118, 0.019),
        (-0.008, 0.118, 0.019),
    ]
    faces = [(3, 2, 1, 0), (8, 9, 10, 11)]
    for start in (0, 4):
        for i in range(4):
            j = (i + 1) % 4
            faces.append((start + i, start + j, start + j + 4, start + i + 4))
    f.mesh("tailored_shirt", rings, faces, "moss")
    f.bar("connected_neck", (0, 0.112, 0.012), (0, 0.128, 0.011), 0.006, "ochre", 6)
    f.ellipsoid("shaped_head", (0, 0.136, 0.008), (0.013, 0.017, 0.013), "ochre", 8, 4)
    f.mesh(
        "nose_bridge",
        [
            (-0.003, 0.142, -0.003),
            (0.003, 0.142, -0.003),
            (0, 0.134, -0.011),
            (0, 0.132, -0.003),
        ],
        [(0, 1, 2), (0, 2, 3), (1, 3, 2), (0, 3, 1)],
        "ochre",
    )
    for side in (-1, 1):
        f.rivet_plate("quiet_eye", side * 0.0057, 0.141, -0.0047, 0.002, 0.0025, "dark")
        hip = (side * 0.012, 0.066, 0.017)
        knee = (side * 0.021, 0.059, -0.029)
        foot = (side * 0.017, 0.039, -0.071)
        f.bar("seated_thigh", hip, knee, 0.008, "dark", 6)
        f.bar("bent_lower_leg", knee, foot, 0.0055, "dark", 6)
        f.box(
            "resting_boot",
            (side * 0.017, 0.039, -0.078),
            (0.013, 0.009, 0.025),
            "timber",
        )
    # Arm and hand geometry lives in extra1/2/3; the web and Blender previews
    # position those joint parts from the moving paddle so both grips stay joined.


def _aircraft(f, kind, piece):
    if piece != "body":
        return  # Rotor pivots and blade envelopes are already independent and intentionally untouched.
    if kind == "regional-plane":
        for side in (-1, 1):
            f.line(
                "engine_nacelle_service_seam",
                [
                    (side * 0.175, 0.035, -0.125),
                    (side * 0.18, 0.039, -0.076),
                    (side * 0.172, 0.035, -0.02),
                ],
                0.0013,
                "alloy",
            )
            f.plate(
                "wing_flap_hinge",
                [
                    (side * 0.13, 0.053, 0.056),
                    (side * 0.27, 0.071, 0.05),
                    (side * 0.27, 0.07, 0.053),
                    (side * 0.13, 0.052, 0.06),
                ],
                "dark",
            )
            f.plate(
                "cockpit_pillar",
                [
                    (side * 0.023, 0.037, -0.214),
                    (side * 0.028, 0.05, -0.182),
                    (side * 0.029, 0.049, -0.178),
                    (side * 0.025, 0.036, -0.21),
                ],
                "chalk",
            )
        f.box("nose_gear_door", (0, -0.02, -0.176), (0.018, 0.004, 0.038), "alloy")
    else:
        for side in (-1, 1):
            f.bar(
                "sensor_gimbal_support",
                (side * 0.024, -0.011, -0.056),
                (side * 0.024, -0.034, -0.056),
                0.003,
                "alloy",
            )
        f.rivet_plate("drone_service_hatch", 0, 0.014, -0.123, 0.018, 0.012, "ceramic")


def _animal(f, kind, piece):
    if kind in {"deer", "ibex"}:
        if piece == "body":
            for side in (-1, 1):
                f.plate(
                    "shoulder_coat_plane",
                    [
                        (side * 0.029, 0.181, -0.086),
                        (side * 0.044, 0.167, -0.064),
                        (side * 0.046, 0.139, -0.044),
                        (side * 0.038, 0.17, -0.035),
                    ],
                    "cloth",
                )
        elif piece == "extra1":
            f.plate(
                "split_hoof",
                [
                    (-0.001, -0.081, -0.012),
                    (0.001, -0.081, -0.012),
                    (0.001, -0.071, -0.012),
                    (-0.001, -0.071, -0.012),
                ],
                "dark",
            )
        elif piece == "extra2":
            # The head seed is translated by (0,-.164,+.062) to its eating pivot.
            for side in (-1, 1):
                f.plate(
                    "inner_ear_fold",
                    [
                        (side * 0.019, 0.096, -0.027),
                        (side * 0.035, 0.112, -0.014),
                        (side * 0.044, 0.094, -0.004),
                        (side * 0.027, 0.094, -0.012),
                    ],
                    "rust",
                )
                f.rivet_plate(
                    "eye_lid", side * 0.022, 0.084, -0.071, 0.002, 0.007, "dark"
                )
    elif kind == "bio-ray":
        if piece == "body":
            f.line(
                "pollinator_feeding_tube",
                [(0, 0.014, -0.093), (0, -0.003, -0.106), (0, -0.012, -0.103)],
                0.002,
                "copper",
            )
        elif piece in {"extra0", "extra1"}:
            side = -1 if piece == "extra0" else 1
            f.line(
                "membrane_load_rib",
                [
                    (0, 0.02, 0),
                    (side * 0.055, 0.044, 0.01125),
                    (side * 0.11, 0.03, 0.0225),
                    (side * 0.175, 0.016, 0.03375),
                ],
                0.0015,
                "leaf",
            )


def _machine(f, kind, piece):
    if kind == "maintenance-walker":
        if piece == "body":
            f.vent("walker_cooling_grille", 0, 0.089, -0.114, 0.026, 3)
            for side in (-1, 1):
                f.box(
                    "service_cartridge_latch",
                    (side * 0.042, 0.133, 0.023),
                    (0.009, 0.013, 0.025),
                    "alloy",
                )
        elif piece in {"extra0", "extra1"}:
            side = -1 if piece == "extra0" else 1
            f.bar(
                "leg_hydraulic_return",
                (side * 0.009, -0.001, 0),
                (side * 0.06, -0.014, -0.017),
                0.002,
                "copper",
            )
        elif piece == "extra2":
            f.bar(
                "inspection_tool_cable",
                (0.005, -0.006, -0.009),
                (0.005, -0.062, -0.049),
                0.0018,
                "dark",
            )
    elif piece == "body":
        f.box(
            "crane_cab_rain_hood", (-0.039, 0.174, -0.09), (0.06, 0.006, 0.013), "alloy"
        )
        f.plate(
            "cab_repair_plate",
            [
                (-0.072, 0.118, -0.065),
                (-0.072, 0.145, -0.065),
                (-0.072, 0.147, -0.035),
                (-0.072, 0.119, -0.035),
            ],
            "rust",
        )
        f.vent("reused_powerpack_grille", 0.04, 0.105, 0.114, 0.045, 3)
    elif piece == "extra0":
        f.bar(
            "winch_rope_guide",
            (-0.01, 0.146, -0.161),
            (0.01, 0.146, -0.161),
            0.004,
            "alloy",
            6,
        )
        f.line(
            "boom_hydraulic_hose",
            [(0.009, -0.015, -0.02), (0.012, 0.039, -0.046), (0.01, 0.082, -0.09)],
            0.0018,
            "dark",
        )
    elif piece == "extra1":
        f.box("recovered_beam_web", (0, -0.041, -0.167), (0.124, 0.008, 0.004), "dark")


def polish_part(
    world_id: str, part_name: str, seed_object: bpy.types.Object, mobile: bool
) -> list[bpy.types.Object]:
    """Append bounded native detail; preserve terrain, semantic objects and local motion pivots."""
    if part_name.startswith("Cloud_"):
        # Union the lobes into one broad weather mass. Keep the modifier editable in .blend;
        # only the disposable web export evaluates it. No simulation or volume shader at runtime.
        seed_object.data.materials.clear()
        mat = _material("cloud")
        shader = mat.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Emission Color"].default_value = (0.65, 0.75, 0.9, 1)
        shader.inputs["Emission Strength"].default_value = 0.12
        seed_object.data.materials.append(mat)
        for attribute in list(seed_object.data.color_attributes):
            seed_object.data.color_attributes.remove(attribute)
        modifier = seed_object.modifiers.new("Fused cumulus silhouette", "REMESH")
        modifier.mode = "VOXEL"
        modifier.voxel_size = 0.018
        modifier.adaptivity = 0.55
        modifier.use_smooth_shade = False
        seed_object["janus_weather"] = "Editable cumulus lobes; fused on export; no runtime simulation."
        return []
    if seed_object.type != "MESH" or not part_name.startswith(("Landmark_", "Life_")):
        return []
    finish = Finish(world_id.lower(), part_name, seed_object, mobile)
    removed = 0
    if part_name == "Life_vessel_canoe_body":
        removed = _remove_canoe_crew(seed_object)
    if part_name.startswith("Landmark_"):
        _landmark(finish, part_name.removeprefix("Landmark_"))
    else:
        _, subject, tail = part_name.split("_", 2)
        kind, piece = tail.rsplit("_", 1)
        handler = {
            "vehicle": _vehicle,
            "vessel": _vessel,
            "aircraft": _aircraft,
            "animal": _animal,
            "machine": _machine,
        }.get(subject)
        if handler:
            handler(finish, kind, piece)
    _hard_edge_finish(finish)
    seed_object["janus_finish_source_triangles"] = finish.original
    seed_object["janus_finish_added_triangles"] = finish.used
    seed_object["janus_finish_removed_triangles"] = removed
    seed_object["janus_finish_net_added_triangles"] = finish.used - removed
    seed_object["janus_finish_triangle_limit"] = finish.limit
    seed_object["janus_finish_content_origin"] = "interpretive"
    return finish.objects
