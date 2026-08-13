"""Build the licensed Fab alien-at-telescope scene for the Janus story.

The source character is unrigged. This script separates its authored arm components,
adds an object-level shoulder and wrist rig, animates a reach/focus/settle performance,
renders QA frames, preserves an editable Blender source, and exports a web GLB.

Source contributions:
- "Cute Alien Character" by Ndevisuals, CC BY 4.0.
- "Telescope" by Usman Ahmed Gill, Fab Standard License.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
ALIEN_BLEND = (
    ROOT / "assets/sources/fab/extracted/alien/source/Cute Alien Character.blend"
)
TELESCOPE_FBX = ROOT / "assets/sources/fab/extracted/telescope/source/TELESCOPE.fbx"
SOURCE_BLEND = ROOT / "assets/sources/fab/janus-fab-observer-v3.blend"
PUBLIC_GLB = ROOT / "apps/web/public/assets/models/janus-alien-observer-v3.glb"
QA_DIR = ROOT / "docs/qa/janus-fab-observer-v3"

START_FRAME = 1
END_FRAME = 120
FPS = 30


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    obj.rotation_euler = (
        (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()
    )


def parent_keep_transform(child: bpy.types.Object, parent: bpy.types.Object) -> None:
    world = child.matrix_world.copy()
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()
    child.matrix_world = world
    bpy.context.view_layer.update()


def descendants(root: bpy.types.Object) -> list[bpy.types.Object]:
    found: list[bpy.types.Object] = [root]
    for child in root.children:
        found.extend(descendants(child))
    return found


def object_center_x(obj: bpy.types.Object) -> float:
    return sum((obj.matrix_world @ Vector(corner)).x for corner in obj.bound_box) / 8


def separate_side_components(
    source_name: str,
) -> tuple[bpy.types.Object, bpy.types.Object]:
    """Split one mirrored source mesh and return its negative/positive-X halves."""

    source = bpy.data.objects.get(source_name)
    if source is None or source.type != "MESH":
        raise RuntimeError(f"Expected mirrored arm mesh {source_name!r}.")

    before = set(bpy.context.scene.objects)
    bpy.ops.object.select_all(action="DESELECT")
    source.select_set(True)
    bpy.context.view_layer.objects.active = source
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")

    parts = [source, *[obj for obj in bpy.context.scene.objects if obj not in before]]
    parts = [obj for obj in parts if obj.type == "MESH"]
    if len(parts) != 2:
        raise RuntimeError(
            f"Expected two loose components in {source_name!r}, found {len(parts)}."
        )
    negative_x, positive_x = sorted(parts, key=object_center_x)
    return negative_x, positive_x


def join_objects(objects: tuple[bpy.types.Object, ...], name: str) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    active = objects[0]
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    active.name = name
    return active


def apply_object_transform(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)


def set_origin(obj: bpy.types.Object, location: tuple[float, float, float]) -> None:
    bpy.context.scene.cursor.location = location
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR", center="MEDIAN")


def prepare_arm_rig() -> tuple[bpy.types.Object, bpy.types.Object]:
    """Build a light object rig from the source's mirrored sleeve/cuff/hand meshes."""

    far_sleeve, near_sleeve = separate_side_components("Cylinder")
    far_cuff, near_cuff = separate_side_components("Cylinder.001")
    far_hand, near_hand = separate_side_components("Object_8.006")

    # Keep the quiet arm as one static draw unit, and preserve the active hand as
    # a child so a small focus-wheel turn can follow the larger shoulder arc.
    far_arm = join_objects((far_sleeve, far_cuff, far_hand), "FarArm")
    near_arm = join_objects((near_sleeve, near_cuff), "NearArm")
    near_hand.name = "NearHand"

    for obj in (far_arm, near_arm, near_hand):
        apply_object_transform(obj)

    near_arm.rotation_mode = "XYZ"
    near_hand.rotation_mode = "XYZ"
    set_origin(near_arm, (0.245, 0.0, -0.295))
    set_origin(near_hand, (0.415, 0.0, -0.425))
    parent_keep_transform(near_hand, near_arm)
    near_arm["rig_role"] = "near shoulder reach control"
    near_hand["rig_role"] = "near wrist focus control"
    return near_arm, near_hand


def keyframe_transform(
    obj: bpy.types.Object,
    frame: int,
    *,
    location: tuple[float, float, float] | None = None,
    rotation: tuple[float, float, float] | None = None,
    scale: tuple[float, float, float] | None = None,
) -> None:
    if location is not None:
        obj.location = location
        obj.keyframe_insert(
            data_path="location", frame=frame, group="Observe telescope"
        )
    if rotation is not None:
        obj.rotation_euler = rotation
        obj.keyframe_insert(
            data_path="rotation_euler", frame=frame, group="Observe telescope"
        )
    if scale is not None:
        obj.scale = scale
        obj.keyframe_insert(data_path="scale", frame=frame, group="Observe telescope")


def name_action(obj: bpy.types.Object, name: str) -> None:
    if obj.animation_data and obj.animation_data.action:
        obj.animation_data.action.name = name


def add_smooth_interpolation(obj: bpy.types.Object) -> None:
    action = obj.animation_data.action if obj.animation_data else None
    if action is None:
        return
    # Blender 5 keeps legacy f-curves available for object actions created by keyframe_insert.
    for curve in getattr(action, "fcurves", []):
        for point in curve.keyframe_points:
            point.interpolation = "BEZIER"
            point.handle_left_type = "AUTO_CLAMPED"
            point.handle_right_type = "AUTO_CLAMPED"


def prepare_alien() -> tuple[
    bpy.types.Object,
    bpy.types.Object,
    bpy.types.Object,
    bpy.types.Object,
]:
    bpy.ops.wm.open_mainfile(filepath=str(ALIEN_BLEND))
    for obj in list(bpy.context.scene.objects):
        if obj.type in {"CAMERA", "LIGHT"}:
            bpy.data.objects.remove(obj, do_unlink=True)

    near_arm, near_hand = prepare_arm_rig()
    alien_objects = list(bpy.context.scene.objects)
    alien_root = bpy.data.objects.new("ALIEN_PerformanceRoot", None)
    bpy.context.collection.objects.link(alien_root)
    alien_root.empty_display_type = "ARROWS"
    alien_root["asset_title"] = "Cute Alien Character"
    alien_root["asset_creator"] = "Ndevisuals"
    alien_root["asset_license"] = "CC BY 4.0"
    alien_root["source_url"] = (
        "https://www.fab.com/listings/e659c1e0-d53c-4146-b877-a5496d0a7598"
    )
    alien_root["modifications"] = (
        "Object-level shoulder/wrist rig, pose, animation, staging, and web optimization."
    )

    for obj in alien_objects:
        if obj.parent is None:
            parent_keep_transform(obj, alien_root)
        obj.name = f"ALIEN_{obj.name}"

    eye_mesh = bpy.data.objects.get("ALIEN_Sphere.001")
    if eye_mesh is None:
        raise RuntimeError("Expected the source character eye mesh to be present.")

    # The source faces -Y. A 72-degree yaw presents a readable three-quarter profile
    # while aligning the near eye with the eyepiece at the left of the telescope.
    alien_root.scale = (1.26, 1.26, 1.26)
    rest = (-1.08, 0.0, 1.17)
    observe = (-0.98, 0.0, 1.165)
    rest_rotation = (0.0, math.radians(1.0), math.radians(67.0))
    observe_rotation = (math.radians(-1.2), math.radians(4.0), math.radians(73.0))

    for frame, location, rotation in (
        (1, rest, rest_rotation),
        (18, (-1.035, 0.0, 1.17), (0.0, math.radians(2.2), math.radians(70.0))),
        (34, observe, observe_rotation),
        (
            58,
            (-0.975, -0.006, 1.18),
            (math.radians(-1.0), math.radians(3.2), math.radians(73.4)),
        ),
        (
            82,
            (-0.985, 0.004, 1.162),
            (math.radians(-1.35), math.radians(4.4), math.radians(72.6)),
        ),
        (102, (-1.025, 0.0, 1.17), (0.0, math.radians(2.0), math.radians(70.0))),
        (120, rest, rest_rotation),
    ):
        keyframe_transform(alien_root, frame, location=location, rotation=rotation)
    name_action(alien_root, "ObserveTelescope_Body")
    add_smooth_interpolation(alien_root)

    # The source antenna is two separate meshes. Animate each around its own origin;
    # this keeps the authored contact point intact and avoids adding a web-only rig node.
    for index, source_name in enumerate(("ALIEN_Vert.003", "ALIEN_Sphere.009")):
        antenna_part = bpy.data.objects.get(source_name)
        if antenna_part is None:
            continue
        base = tuple(antenna_part.rotation_euler)
        for frame, x_offset, y_offset in (
            (1, -1.0, 0.0),
            (18, 1.2, -0.8),
            (34, -0.8, 0.9),
            (58, 1.0, -0.5),
            (82, -1.1, 0.6),
            (102, 0.5, -0.4),
            (120, -1.0, 0.0),
        ):
            keyframe_transform(
                antenna_part,
                frame,
                rotation=(
                    base[0] + math.radians(x_offset),
                    base[1] + math.radians(y_offset),
                    base[2],
                ),
            )
        name_action(antenna_part, f"ObserveTelescope_Antenna_{index + 1}")
        add_smooth_interpolation(antenna_part)

    open_scale = tuple(eye_mesh.scale)
    closed_scale = (open_scale[0], open_scale[1], open_scale[2] * 0.12)
    for frame, scale in (
        (1, open_scale),
        (48, open_scale),
        (51, closed_scale),
        (54, closed_scale),
        (58, open_scale),
        (120, open_scale),
    ):
        keyframe_transform(eye_mesh, frame, scale=scale)
    name_action(eye_mesh, "ObserveTelescope_Blink")
    add_smooth_interpolation(eye_mesh)

    # The active arm now has an authored silhouette change: anticipate, reach
    # toward the near focus control, make one small adjustment, hold, and settle.
    # The first and last poses are identical for a clean browser loop.
    for frame, rotation in (
        (1, (0.0, 0.0, 0.0)),
        (12, (math.radians(5.0), math.radians(3.0), math.radians(4.0))),
        (34, (math.radians(-54.0), math.radians(-46.0), math.radians(-43.0))),
        (48, (math.radians(-70.0), math.radians(-65.0), math.radians(-61.0))),
        (62, (math.radians(-72.0), math.radians(-67.0), math.radians(-62.0))),
        (78, (math.radians(-69.0), math.radians(-64.0), math.radians(-60.0))),
        (94, (math.radians(-70.0), math.radians(-65.0), math.radians(-61.0))),
        (108, (math.radians(-35.0), math.radians(-30.0), math.radians(-28.0))),
        (120, (0.0, 0.0, 0.0)),
    ):
        keyframe_transform(near_arm, frame, rotation=rotation)
    name_action(near_arm, "ObserveTelescope_Reach")
    add_smooth_interpolation(near_arm)

    for frame, rotation in (
        (1, (0.0, 0.0, 0.0)),
        (44, (0.0, 0.0, 0.0)),
        (58, (math.radians(-8.0), math.radians(3.0), math.radians(-12.0))),
        (72, (math.radians(7.0), math.radians(-2.0), math.radians(10.0))),
        (86, (math.radians(-3.0), math.radians(1.0), math.radians(-5.0))),
        (98, (0.0, 0.0, 0.0)),
        (120, (0.0, 0.0, 0.0)),
    ):
        keyframe_transform(near_hand, frame, rotation=rotation)
    name_action(near_hand, "ObserveTelescope_Focus")
    add_smooth_interpolation(near_hand)
    return alien_root, eye_mesh, near_arm, near_hand


def prepare_telescope() -> bpy.types.Object:
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.fbx(filepath=str(TELESCOPE_FBX))
    imported = [obj for obj in bpy.context.scene.objects if obj not in before]

    telescope_root = bpy.data.objects.new("TELESCOPE_Root", None)
    bpy.context.collection.objects.link(telescope_root)
    telescope_root["asset_title"] = "Telescope"
    telescope_root["asset_creator"] = "Usman Ahmed Gill"
    telescope_root["asset_license"] = "Fab Standard License"
    telescope_root["source_url"] = (
        "https://www.fab.com/listings/ad439e6a-e804-468b-93ac-f1b6d649a883"
    )
    telescope_root["modifications"] = (
        "Repositioned, staged for character contact, and web optimized."
    )

    for obj in imported:
        obj.name = f"TELESCOPE_{obj.name}"
        parent_keep_transform(obj, telescope_root)

    # Scale from the source origin so the tripod remains planted while the
    # eyepiece reaches the character's near eye. Shift right to preserve contact.
    telescope_root.scale = (1.34, 1.34, 1.34)
    telescope_root.location = (0.25, 0.0, -0.02)
    telescope_root.rotation_euler = (0.0, 0.0, 0.0)

    return telescope_root


def add_preview_stage() -> None:
    dark = bpy.data.materials.new("QA_floor_dark")
    dark.diffuse_color = (0.012, 0.02, 0.025, 1.0)
    bpy.ops.mesh.primitive_plane_add(size=12, location=(-0.15, 0.25, -0.055))
    floor = bpy.context.object
    floor.name = "QA_Floor_NOT_EXPORTED"
    floor.data.materials.append(dark)

    bpy.ops.object.camera_add(location=(2.35, -5.25, 2.05))
    camera = bpy.context.object
    camera.name = "QA_Camera_NOT_EXPORTED"
    camera.data.lens = 66
    look_at(camera, (-0.2, 0.0, 0.86))
    bpy.context.scene.camera = camera

    for name, location, energy, size, color in (
        ("QA_Key", (-2.6, -4.0, 4.3), 1050, 4.0, (0.6, 0.88, 1.0)),
        ("QA_Fill", (3.4, -1.0, 2.8), 720, 3.2, (0.84, 0.62, 1.0)),
        ("QA_Rim", (0.0, 2.8, 3.2), 980, 3.0, (0.45, 1.0, 0.72)),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = f"{name}_NOT_EXPORTED"
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        light.data.color = color
        look_at(light, (-0.25, 0.0, 0.8))


def configure_scene() -> None:
    scene = bpy.context.scene
    scene.frame_start = START_FRAME
    scene.frame_end = END_FRAME
    scene.render.fps = FPS
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Janus observer world")
    scene.world.color = (0.003, 0.006, 0.012)


def render_qa_frames() -> None:
    QA_DIR.mkdir(parents=True, exist_ok=True)
    for frame in (1, 12, 34, 48, 62, 78, 94, 120):
        bpy.context.scene.frame_set(frame)
        bpy.context.scene.render.filepath = str(QA_DIR / f"frame-{frame:03d}.png")
        bpy.ops.render.render(write_still=True)


def export_glb(roots: tuple[bpy.types.Object, ...]) -> None:
    PUBLIC_GLB.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for root in roots:
        for obj in descendants(root):
            obj.select_set(True)
    bpy.context.view_layer.objects.active = roots[0]
    bpy.ops.export_scene.gltf(
        filepath=str(PUBLIC_GLB),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_frame_range=True,
        export_frame_step=1,
        export_optimize_animation_size=True,
        export_apply=False,
        export_extras=True,
        export_cameras=False,
        export_lights=False,
        export_draco_mesh_compression_enable=False,
        export_yup=True,
    )


def build() -> None:
    alien_root, _, _, _ = prepare_alien()
    telescope_root = prepare_telescope()
    configure_scene()
    add_preview_stage()
    bpy.context.scene.frame_set(1)
    SOURCE_BLEND.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_BLEND))
    render_qa_frames()
    export_glb((alien_root, telescope_root))
    print(f"Saved editable source: {SOURCE_BLEND}")
    print(f"Exported web asset: {PUBLIC_GLB}")
    print(f"Rendered QA frames: {QA_DIR}")


if __name__ == "__main__":
    build()
