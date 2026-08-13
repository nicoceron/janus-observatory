"""Build the original Janus Observatory alien astronomer asset.

Run with Blender in background mode. The script creates the editable .blend source,
an uncompressed GLB derivative, and a preview render used for visual review.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
SOURCE_BLEND = ROOT / "assets/sources/original/janus-alien-observer-v1.blend"
PUBLIC_GLB = ROOT / "apps/web/public/assets/models/janus-alien-observer-v1.glb"
PREVIEW = ROOT / "docs/qa/janus-alien-observer-v1.png"


def material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    metallic: float = 0.0,
    roughness: float = 0.55,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
    alpha: float = 1.0,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    if emission is not None:
        principled.inputs["Emission Color"].default_value = emission
        principled.inputs["Emission Strength"].default_value = emission_strength
    if alpha < 1.0:
        principled.inputs["Alpha"].default_value = alpha
        mat.surface_render_method = "DITHERED"
    return mat


def finish(obj: bpy.types.Object, mat: bpy.types.Material, bevel: float = 0.0) -> bpy.types.Object:
    obj.data.materials.append(mat)
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    if bevel > 0:
        modifier = obj.modifiers.new("Micro bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    return obj


def uv_sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    segments: int = 32,
    rings: int = 20,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, mat)


def cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    vertices: int = 32,
    bevel: float = 0.025,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, mat, bevel)


def cone(
    name: str,
    location: tuple[float, float, float],
    radius1: float,
    radius2: float,
    depth: float,
    mat: bpy.types.Material,
    vertices: int = 40,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, mat, 0.035)


def torus(
    name: str,
    location: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    mat: bpy.types.Material,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=48,
        minor_segments=10,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, mat)


def limb(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius: float,
    mat: bpy.types.Material,
) -> bpy.types.Object:
    start_v = Vector(start)
    end_v = Vector(end)
    direction = end_v - start_v
    midpoint = (start_v + end_v) * 0.5
    obj = cylinder(name, tuple(midpoint), radius, direction.length, mat, bevel=radius * 0.2)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    return obj


def cable(
    name: str,
    points: list[tuple[float, float, float]],
    radius: float,
    mat: bpy.types.Material,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 10
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points, strict=True):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return obj


def parent_all(root: bpy.types.Object) -> None:
    for obj in list(bpy.context.scene.objects):
        if obj != root and obj.type not in {"CAMERA", "LIGHT"} and obj.parent is None:
            obj.parent = root


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def build() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)

    skin = material("ALIEN_skin_deep_jade", (0.055, 0.19, 0.145, 1), roughness=0.68)
    skin_ridge = material("ALIEN_skin_ridges", (0.11, 0.37, 0.28, 1), roughness=0.58)
    robe = material("ALIEN_robe_ink", (0.018, 0.035, 0.032, 1), roughness=0.9)
    eye = material(
        "ALIEN_eye_obsidian",
        (0.005, 0.009, 0.012, 1),
        metallic=0.35,
        roughness=0.08,
    )
    iris = material(
        "ALIEN_iris_lime",
        (0.28, 0.8, 0.48, 1),
        roughness=0.18,
        emission=(0.2, 1.0, 0.52, 1),
        emission_strength=4.0,
    )
    bronze = material("TELESCOPE_aged_bronze", (0.28, 0.13, 0.045, 1), metallic=0.88, roughness=0.26)
    brass = material("TELESCOPE_brass_trim", (0.72, 0.42, 0.1, 1), metallic=0.92, roughness=0.19)
    black_metal = material("TELESCOPE_black_metal", (0.012, 0.018, 0.017, 1), metallic=0.82, roughness=0.2)
    lens = material(
        "TELESCOPE_objective_glass",
        (0.04, 0.19, 0.2, 1),
        metallic=0.18,
        roughness=0.05,
        emission=(0.02, 0.65, 0.72, 1),
        emission_strength=1.6,
        alpha=0.82,
    )
    warm = material(
        "TELESCOPE_status_amber",
        (0.9, 0.29, 0.035, 1),
        roughness=0.24,
        emission=(1.0, 0.18, 0.02, 1),
        emission_strength=3.0,
    )

    root = bpy.data.objects.new("JanusObserverRoot", None)
    bpy.context.collection.objects.link(root)
    root["asset_status"] = "interpretive"
    root["credit"] = "Original Janus Observatory asset; created with Blender and OpenAI Codex."

    # An asymmetrical cephalopod scholar rather than a generic grey alien.
    head = uv_sphere("ALIEN_mantle_head", (-2.25, 0.0, 1.72), (0.68, 0.48, 0.88), skin, 48, 28)
    for vertex in head.data.vertices:
        normalized = max(-1.0, min(1.0, vertex.co.z / 0.88))
        width = 0.72 + 0.27 * (normalized + 1.0) / 2.0
        if normalized < -0.25:
            width *= 0.7 + (normalized + 1.0) * 0.22
        vertex.co.x *= width
        vertex.co.y *= 0.88 + 0.14 * math.cos(normalized * math.pi)
    head.rotation_euler[1] = math.radians(-7)

    for index, z in enumerate([1.25, 1.48, 1.72, 1.96, 2.18]):
        uv_sphere(
            f"ALIEN_mantle_ridge_{index:02d}",
            (-2.72 + index * 0.05, 0.15, z),
            (0.11, 0.3, 0.17),
            skin_ridge,
            24,
            14,
        )

    # Three eyes establish a strong, unmistakably non-human silhouette.
    for index, (x, y, z, scale) in enumerate(
        [
            (-1.89, -0.41, 1.88, (0.25, 0.08, 0.15)),
            (-2.18, -0.47, 2.15, (0.18, 0.06, 0.11)),
            (-2.41, -0.45, 1.92, (0.14, 0.055, 0.09)),
        ]
    ):
        uv_sphere(f"ALIEN_eye_{index:02d}", (x, y, z), scale, eye, 28, 18)
        uv_sphere(
            f"ALIEN_iris_{index:02d}",
            (x + 0.015, y - 0.065, z),
            tuple(value * 0.42 for value in scale),
            iris,
            20,
            12,
        )

    cone("ALIEN_robe_torso", (-2.35, 0.02, 0.25), 0.9, 0.45, 1.85, robe)
    torus("ALIEN_robe_collar", (-2.35, 0.02, 1.12), 0.48, 0.08, skin_ridge)
    cable(
        "ALIEN_collar_tendrils",
        [(-2.05, -0.28, 1.2), (-1.72, -0.44, 1.06), (-1.52, -0.42, 0.82)],
        0.045,
        skin_ridge,
    )

    arm_paths = [
        [(-2.0, -0.12, 0.92), (-1.38, -0.36, 0.56), (-0.9, -0.42, 0.92)],
        [(-2.36, 0.2, 0.78), (-1.72, 0.34, 0.37), (-1.18, 0.28, 0.18)],
    ]
    for arm_index, path in enumerate(arm_paths):
        for segment in range(2):
            limb(
                f"ALIEN_arm_{arm_index:02d}_{segment:02d}",
                path[segment],
                path[segment + 1],
                0.13 - segment * 0.02,
                skin,
            )
            uv_sphere(
                f"ALIEN_joint_{arm_index:02d}_{segment:02d}",
                path[segment + 1],
                (0.17, 0.15, 0.15),
                skin_ridge,
                22,
                14,
            )
        hand = path[-1]
        uv_sphere(
            f"ALIEN_hand_{arm_index:02d}",
            hand,
            (0.2, 0.12, 0.14),
            skin,
            24,
            14,
        )
        for finger_index in range(4):
            start = (hand[0] + 0.09, hand[1] - 0.04 + finger_index * 0.03, hand[2])
            end = (hand[0] + 0.34, hand[1] - 0.08 + finger_index * 0.055, hand[2] - 0.05)
            limb(
                f"ALIEN_finger_{arm_index:02d}_{finger_index:02d}",
                start,
                end,
                0.026,
                skin_ridge,
            )

    # Multi-part optical instrument with a distinct silhouette at web scale.
    cylinder(
        "TELESCOPE_main_barrel",
        (0.1, 0.0, 1.3),
        0.43,
        3.1,
        bronze,
        rotation=(0, math.pi / 2, 0),
        vertices=48,
        bevel=0.05,
    )
    cylinder(
        "TELESCOPE_objective_hood",
        (1.75, 0.0, 1.3),
        0.58,
        0.55,
        black_metal,
        rotation=(0, math.pi / 2, 0),
        vertices=48,
        bevel=0.05,
    )
    cylinder(
        "TELESCOPE_objective_lens",
        (2.045, 0.0, 1.3),
        0.48,
        0.055,
        lens,
        rotation=(0, math.pi / 2, 0),
        vertices=48,
        bevel=0.01,
    )
    cylinder(
        "TELESCOPE_eyepiece",
        (-1.62, 0.0, 1.3),
        0.18,
        0.42,
        black_metal,
        rotation=(0, math.pi / 2, 0),
        vertices=32,
    )
    for index, x in enumerate([-1.22, -0.62, 0.28, 1.03, 1.5]):
        torus(
            f"TELESCOPE_trim_{index:02d}",
            (x, 0.0, 1.3),
            0.45 + (0.08 if index == 4 else 0),
            0.045 if index != 2 else 0.07,
            brass if index % 2 == 0 else black_metal,
            rotation=(0, math.pi / 2, 0),
        )

    for index in range(8):
        angle = (math.pi * 2 * index) / 8
        uv_sphere(
            f"TELESCOPE_status_node_{index:02d}",
            (0.34, math.cos(angle) * 0.39, 1.3 + math.sin(angle) * 0.39),
            (0.045, 0.045, 0.045),
            warm if index in {1, 4, 6} else iris,
            16,
            10,
        )

    cylinder("TELESCOPE_pivot", (0.0, 0.0, 0.7), 0.18, 1.05, brass, vertices=28)
    uv_sphere("TELESCOPE_gimbal", (0.0, 0.0, 0.72), (0.34, 0.34, 0.34), black_metal, 28, 18)
    for index, end in enumerate([(-0.75, -0.48, -0.65), (0.78, -0.48, -0.65), (0.0, 0.76, -0.65)]):
        limb(f"TELESCOPE_tripod_{index:02d}", (0.0, 0.0, 0.58), end, 0.085, brass)

    # Control wheel and cables connect the creature to the machine.
    torus("TELESCOPE_focus_wheel", (-0.85, -0.58, 0.92), 0.3, 0.045, brass, rotation=(math.pi / 2, 0, 0))
    for index in range(6):
        angle = (math.pi * 2 * index) / 6
        limb(
            f"TELESCOPE_focus_spoke_{index:02d}",
            (-0.85, -0.6, 0.92),
            (-0.85 + math.cos(angle) * 0.27, -0.6, 0.92 + math.sin(angle) * 0.27),
            0.015,
            brass,
        )
    cable(
        "TELESCOPE_bio_interface",
        [(-0.82, -0.43, 0.9), (-1.08, -0.58, 0.72), (-1.28, -0.47, 0.34), (-1.18, 0.28, 0.18)],
        0.035,
        iris,
    )

    parent_all(root)

    # Preview-only stage objects are excluded from the GLB selection.
    floor_mat = material("PREVIEW_floor", (0.006, 0.013, 0.012, 1), roughness=0.95)
    bpy.ops.mesh.primitive_plane_add(size=18, location=(0, 0, -0.7))
    floor = finish(bpy.context.object, floor_mat)
    floor.name = "PREVIEW_floor"

    bpy.ops.object.light_add(type="AREA", location=(-4, -5, 6))
    key = bpy.context.object
    key.data.energy = 900
    key.data.shape = "DISK"
    key.data.size = 5
    key.data.color = (0.43, 0.9, 0.7)
    look_at(key, (-0.5, 0, 0.9))
    bpy.ops.object.light_add(type="AREA", location=(4, -3, 4))
    rim = bpy.context.object
    rim.data.energy = 1100
    rim.data.size = 4
    rim.data.color = (1.0, 0.32, 0.08)
    look_at(rim, (0.5, 0, 1.0))
    bpy.ops.object.light_add(type="AREA", location=(0, 3, 5))
    fill = bpy.context.object
    fill.data.energy = 650
    fill.data.size = 5
    fill.data.color = (0.25, 0.45, 0.95)
    look_at(fill, (-1, 0, 1))

    bpy.ops.object.camera_add(location=(0.4, -10.5, 3.15))
    camera = bpy.context.object
    camera.data.lens = 56
    look_at(camera, (-0.05, 0.0, 0.95))
    bpy.context.scene.camera = camera

    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.color = (0.002, 0.005, 0.004)
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.001, 0.004, 0.003, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.08

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW)
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.image_settings.color_mode = "RGBA"
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_GLB.parent.mkdir(parents=True, exist_ok=True)
    SOURCE_BLEND.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_BLEND))
    bpy.ops.render.render(write_still=True)

    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for child in root.children_recursive:
        child.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(PUBLIC_GLB),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_draco_mesh_compression_enable=False,
    )
    print(f"source:{SOURCE_BLEND}")
    print(f"derivative:{PUBLIC_GLB}")
    print(f"preview:{PREVIEW}")


if __name__ == "__main__":
    build()
