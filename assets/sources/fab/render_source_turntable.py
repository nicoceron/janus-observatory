"""Render contact views of the admitted Fab source models for rig planning."""

from __future__ import annotations

import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
ALIEN_BLEND = (
    ROOT / "assets/sources/fab/extracted/alien/source/Cute Alien Character.blend"
)
TELESCOPE_FBX = ROOT / "assets/sources/fab/extracted/telescope/source/TELESCOPE.fbx"
OUTPUT_DIR = ROOT / "docs/qa/fab-source-inspection"


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    obj.rotation_euler = (
        (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()
    )


def add_camera(location: tuple[float, float, float]) -> bpy.types.Object:
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.object
    camera.data.lens = 62
    look_at(camera, (0, 0, -0.2))
    bpy.context.scene.camera = camera
    return camera


def add_lights() -> None:
    bpy.ops.object.light_add(type="AREA", location=(-2.5, -3.5, 3.5))
    bpy.context.object.data.energy = 800
    bpy.context.object.data.shape = "DISK"
    bpy.context.object.data.size = 4
    look_at(bpy.context.object, (0, 0, -0.15))
    bpy.ops.object.light_add(type="AREA", location=(2.8, 0.6, 2.0))
    bpy.context.object.data.energy = 550
    bpy.context.object.data.size = 3
    look_at(bpy.context.object, (0, 0, -0.25))


def configure_render() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Fab source preview world")
    scene.world.color = (0.008, 0.012, 0.018)


def render_views(label: str) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    camera = add_camera((0, -4.2, -0.1))
    add_lights()
    for suffix, location in (
        ("front", (0, -4.2, -0.1)),
        ("three-quarter", (3.15, -3.15, 0.15)),
        ("side", (4.2, 0, -0.05)),
    ):
        camera.location = location
        look_at(camera, (0, 0, -0.2))
        bpy.context.scene.render.filepath = str(OUTPUT_DIR / f"{label}-{suffix}.png")
        bpy.ops.render.render(write_still=True)


def main() -> None:
    mode = sys.argv[-1]
    if mode == "alien":
        bpy.ops.wm.open_mainfile(filepath=str(ALIEN_BLEND))
    elif mode == "telescope":
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.fbx(filepath=str(TELESCOPE_FBX))
    else:
        raise SystemExit("Expected final argument: alien or telescope")
    for obj in list(bpy.context.scene.objects):
        if obj.type in {"CAMERA", "LIGHT"}:
            bpy.data.objects.remove(obj, do_unlink=True)
    configure_render()
    render_views(mode)


if __name__ == "__main__":
    main()
