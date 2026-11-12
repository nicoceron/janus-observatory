"""Scene objects and contact-sheet renders for kit models.

`make_object` turns a baked model into an editable Blender mesh (one material slot per part,
colours in the `c` attribute, custom normals). `render_sheet` lays models on a grid facing an
orthographic camera and renders them with EEVEE under lights that match the website.
"""

from __future__ import annotations

import math

import bpy
from mathutils import Matrix, Vector

from . import jk

MATERIALS = {
    # part: (roughness, metallic, emission strength)
    "base": (0.82, 0.0, 0.0),
    "tint": (0.82, 0.0, 0.0),
    "glass": (0.16, 0.3, 0.0),
    "metal": (0.38, 0.75, 0.0),
    "glow": (0.5, 0.0, 1.0),
    "lit": (0.5, 0.0, 1.0),
    # `lit` panes of a -dark twin: unlit glass.
    "pane": (0.16, 0.3, 0.0),
}


def material(part: str) -> bpy.types.Material:
    name = f"Kit • {part}"
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    roughness, metallic, emission = MATERIALS[part]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    # Like the website, draw front faces only, so a sheet shows exactly what the site will.
    mat.use_backface_culling = True
    tree = mat.node_tree
    bsdf = tree.nodes.get("Principled BSDF")
    attribute = tree.nodes.new("ShaderNodeAttribute")
    attribute.attribute_name = "c"
    attribute.location = (-300, 200)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Base Color"].default_value = (0, 0, 0, 1)
        tree.links.new(attribute.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = emission
    else:
        tree.links.new(attribute.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def make_object(name: str, baked: dict, tint=None, collection=None, dark: bool = False) -> bpy.types.Object:
    """A mesh object from a baked model. `tint` is multiplied into tint and metal parts.

    `dark` shows the `-dark` twin: lit panes become unlit glass."""
    positions: list[tuple] = []
    normals: list[tuple] = []
    colours: list[tuple] = []
    material_index: list[int] = []
    slots: list[str] = []
    tint_rgb = jk.col(tint) if tint else None
    for part in jk.PARTS:
        data = baked.get(part)
        if not data:
            continue
        slots.append("pane" if dark and part == "lit" else part)
        slot = len(slots) - 1
        dark_rgb = jk.col(jk.DARK_GLASS)
        p, n, c = data["position"], data["normal"], data["color"]
        for i in range(0, len(p), 3):
            positions.append((p[i], p[i + 1], p[i + 2]))
            normals.append((n[i], n[i + 1], n[i + 2]))
            if dark and part == "lit":
                colours.append((*dark_rgb, 1.0))
            elif tint_rgb and part in ("tint", "metal"):
                colours.append((c[i] * tint_rgb[0], c[i + 1] * tint_rgb[1], c[i + 2] * tint_rgb[2], 1.0))
            else:
                colours.append((c[i], c[i + 1], c[i + 2], 1.0))
        material_index += [slot] * (len(p) // 9)
    mesh = bpy.data.meshes.new(name)
    count = len(positions) // 3
    mesh.from_pydata(positions, [], [(i * 3, i * 3 + 1, i * 3 + 2) for i in range(count)])
    mesh.polygons.foreach_set("material_index", material_index)
    mesh.polygons.foreach_set("use_smooth", [True] * count)
    attribute = mesh.color_attributes.new("c", "FLOAT_COLOR", "CORNER")
    flat: list[float] = []
    for c in colours:
        flat += c
    attribute.data.foreach_set("color", flat)
    mesh.normals_split_custom_set(normals)
    for part in slots:
        mesh.materials.append(material(part))
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    (collection or bpy.context.scene.collection).objects.link(obj)
    return obj


def studio(scene: bpy.types.Scene, shadows: bool = False, background=(0.012, 0.016, 0.024)):
    """Lights and colour management matching the website's scene."""
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "Filmic"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    try:
        scene.eevee.taa_render_samples = 24
    except AttributeError:
        pass
    world = bpy.data.worlds.new("Kit • sky")
    world.use_nodes = True
    scene.world = world
    nodes, links = world.node_tree.nodes, world.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputWorld")
    # Camera rays see the backdrop; everything else is lit by a sky/ground gradient, like the
    # site's hemisphere light.
    path = nodes.new("ShaderNodeLightPath")
    geometry = nodes.new("ShaderNodeNewGeometry")
    separate = nodes.new("ShaderNodeSeparateXYZ")
    links.new(geometry.outputs["Normal"], separate.inputs[0])
    ramp = nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value = -1
    ramp.inputs["From Max"].default_value = 1
    links.new(separate.outputs["Z"], ramp.inputs["Value"])
    gradient = nodes.new("ShaderNodeMixRGB")
    gradient.inputs[1].default_value = (*jk.col("#314669"), 1)
    gradient.inputs[2].default_value = (*jk.col("#d0f0ff"), 1)
    links.new(ramp.outputs["Result"], gradient.inputs[0])
    light = nodes.new("ShaderNodeBackground")
    light.inputs["Strength"].default_value = 0.62
    links.new(gradient.outputs[0], light.inputs["Color"])
    backdrop = nodes.new("ShaderNodeBackground")
    backdrop.inputs["Color"].default_value = (*background, 1)
    pick = nodes.new("ShaderNodeMixShader")
    links.new(path.outputs["Is Camera Ray"], pick.inputs[0])
    links.new(light.outputs[0], pick.inputs[1])
    links.new(backdrop.outputs[0], pick.inputs[2])
    links.new(pick.outputs[0], output.inputs["Surface"])
    for name, direction, colour, strength in (
        ("Kit • key", (-6, -4, 7), "#fff1d8", 3.1),
        ("Kit • rim", (4, 2, 2), "#87dfef", 2.2),
    ):
        data = bpy.data.lights.new(name, "SUN")
        data.energy = strength
        data.color = jk.col(colour)
        data.angle = math.radians(8)
        data.use_shadow = shadows
        obj = bpy.data.objects.new(name, data)
        scene.collection.objects.link(obj)
        d = Vector(direction).normalized()
        obj.rotation_euler = d.to_track_quat("Z", "Y").to_euler()


def render_sheet(
    items: list[tuple],
    path: str,
    columns: int = 4,
    cell: int = 420,
    azimuth: float = 35,
    elevation: float = 24,
    true_scale: bool = False,
    shadows: bool = False,
    labels: bool = True,
    frames: int = 0,
):
    """Render `(name, baked, tint[, dark])` models on one sheet. Returns the output path.

    With `frames`, `path` is a directory and every model turns once about its own vertical axis
    over that many numbered frames: a turntable for process reels.
    """
    scene = bpy.context.scene
    studio(scene, shadows)
    az, el = math.radians(azimuth), math.radians(elevation)
    # Camera looks from the front-right, above: the front of a model (-y) stays readable.
    view = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    right = Vector((math.cos(az), math.sin(az), 0))
    up = right.cross(-view).normalized()
    columns = max(1, min(columns, len(items)))
    rows = math.ceil(len(items) / columns)
    pitch_x, pitch_y = 1.5, 1.62
    largest = 1.0
    if true_scale:
        largest = max(_size(item[1]) for item in items) or 1.0
    placed = []
    for i, item in enumerate(items):
        name, baked, tint = item[:3]
        obj = make_object(name, baked, tint, dark=len(item) > 3 and item[3])
        lo, hi = _bounds(baked)
        size = max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z) or 1.0
        s = (1.0 / largest) if true_scale else (1.0 / size)
        cx = (i % columns - (columns - 1) / 2) * pitch_x
        cy = ((rows - 1) / 2 - i // columns) * pitch_y
        centre = (lo + hi) / 2
        anchor = right * cx + up * cy
        obj.matrix_world = Matrix.Translation(anchor) @ Matrix.Scale(s, 4) @ Matrix.Translation(-centre)
        placed.append((obj, anchor, s, centre))
        if labels:
            curve = bpy.data.curves.new(name + " label", "FONT")
            tris = sum(len(d["position"]) // 9 for d in baked.values())
            curve.body = f"{name}  {tris}t"
            curve.size = 0.085
            curve.align_x = "CENTER"
            text = bpy.data.objects.new(name + " label", curve)
            scene.collection.objects.link(text)
            mat = bpy.data.materials.get("Kit • label") or bpy.data.materials.new("Kit • label")
            mat.use_nodes = True
            bsdf = mat.node_tree.nodes.get("Principled BSDF")
            bsdf.inputs["Base Color"].default_value = (0, 0, 0, 1)
            bsdf.inputs["Emission Color"].default_value = (0.75, 0.8, 0.85, 1)
            bsdf.inputs["Emission Strength"].default_value = 1.0
            curve.materials.append(mat)
            basis = Matrix((right, up, view)).transposed().to_4x4()
            text.matrix_world = Matrix.Translation(anchor - up * 0.73 + view * 2.0) @ basis
    camera_data = bpy.data.cameras.new("Kit • camera")
    camera_data.type = "ORTHO"
    camera_data.sensor_fit = "HORIZONTAL"
    camera = bpy.data.objects.new("Kit • camera", camera_data)
    scene.collection.objects.link(camera)
    basis = Matrix((right, up, view)).transposed().to_4x4()
    camera.matrix_world = Matrix.Translation(view * 40) @ basis
    camera_data.clip_end = 200
    scene.camera = camera
    scene.render.resolution_x = int(columns * cell)
    scene.render.resolution_y = int(rows * cell * pitch_y / pitch_x)
    camera_data.ortho_scale = columns * pitch_x
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG" if path.lower().endswith(".png") else "JPEG"
    if scene.render.image_settings.file_format == "JPEG":
        scene.render.image_settings.quality = 90
    if frames:
        scene.render.image_settings.file_format = "PNG"
        for frame in range(frames):
            turn = Matrix.Rotation(math.tau * frame / frames, 4, "Z")
            for obj, anchor, s, centre in placed:
                obj.matrix_world = (
                    Matrix.Translation(anchor) @ Matrix.Scale(s, 4) @ turn @ Matrix.Translation(-centre)
                )
            scene.render.filepath = f"{path}/frame-{frame:04d}.png"
            bpy.ops.render.render(write_still=True)
        return path
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


def _bounds(baked: dict) -> tuple[Vector, Vector]:
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for data in baked.values():
        p = data["position"]
        for i in range(0, len(p), 3):
            lo.x, lo.y, lo.z = min(lo.x, p[i]), min(lo.y, p[i + 1]), min(lo.z, p[i + 2])
            hi.x, hi.y, hi.z = max(hi.x, p[i]), max(hi.y, p[i + 1]), max(hi.z, p[i + 2])
    return lo, hi


def _size(baked: dict) -> float:
    lo, hi = _bounds(baked)
    return max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z)
