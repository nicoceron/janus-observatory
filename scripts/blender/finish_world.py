"""Editable Janus miniatures and selected glTF asset libraries, Blender 5.2.

Run through scripts/run-blender-worlds.py. Source art is interpretive, never
canonical scientific data. Coordinates convert Three Y-up to Blender Z-up.
Only this factory-startup process is modified; no external scene is opened.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
from earth_polish import polish_part
from system_worlds import build_study, build_system_world

C = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
QA = ROOT / "docs/qa/blender-finish"


def xyz(p):
    return Vector((p[0], -p[2], p[1]))


def collection(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    bpy.context.view_layer.active_layer_collection = (
        bpy.context.view_layer.layer_collection.children[c.name]
    )
    return c


def empty(name, coll):
    o = bpy.data.objects.new(name, None)
    coll.objects.link(o)
    o.empty_display_size = 0.06
    return o


def material(name, roughness=0.75, metalness=0.03):
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (0.55, 0.65, 0.62, 1)
    bs = mat.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Roughness"].default_value = roughness
    bs.inputs["Metallic"].default_value = metalness
    vertex = mat.node_tree.nodes.new("ShaderNodeVertexColor")
    vertex.layer_name = "Color"
    mat.node_tree.links.new(vertex.outputs["Color"], bs.inputs["Base Color"])
    mat.use_backface_culling = False
    return mat


def _linear_hex(value):
    channels = [int(value.lstrip("#")[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]


def _is_water(color, ocean):
    # Ocean facets are the world's ocean colour times a small brightness variation, so their
    # channel ratios match exactly. Green land and blue-grey beaches no longer pass as water.
    if not (ocean[2] > ocean[0] * 1.15 and ocean[1] > ocean[0] * 1.12) or color[1] <= 0:
        return False
    return (
        abs(color[0] / color[1] - ocean[0] / ocean[1]) < 0.02
        and abs(color[2] / color[1] - ocean[2] / ocean[1]) < 0.02
    )


def import_mesh(name, data, coll, ocean=None):
    positions, colors = data["positions"], data["colors"]
    mesh = bpy.data.meshes.new(name)
    points = [xyz(positions[i : i + 3]) for i in range(0, len(positions), 3)]
    mesh.from_pydata(points, [], [(i, i + 1, i + 2) for i in range(0, len(points), 3)])
    mesh.update()
    attribute = mesh.color_attributes.new(
        name="Color", type="FLOAT_COLOR", domain="CORNER"
    )
    rgba = []
    for loop in mesh.loops:
        i = loop.vertex_index * 3
        rgba.extend([*colors[i : i + 3], 1] if colors else [0.65, 0.7, 0.68, 1])
    attribute.data.foreach_set("color", rgba)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-7)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material("Janus • mineral and painted surfaces"))
    if name == "Terrain":
        mesh.materials.append(material("Janus • faceted water", 0.36, 0.08))
        col = mesh.color_attributes.get("Color")
        if col and ocean:
            for poly in mesh.polygons:
                if _is_water(col.data[poly.loop_start].color, ocean):
                    poly.material_index = 1
    obj = bpy.data.objects.new(name + " • foundation", mesh)
    coll.objects.link(obj)
    return obj


def descendants(root):
    return [root, *root.children_recursive]


def duplicate_tree(source, coll, parent=None, prefix="Instance • "):
    obj = source.copy()
    coll.objects.link(obj)
    obj.name = prefix + source.name
    obj.parent = parent
    obj.matrix_parent_inverse.identity()
    for child in source.children:
        duplicate_tree(child, coll, obj, prefix)
    return obj


def export_glb(path, roots):
    # Join a disposable export copy inside each semantic part. Editable source
    # objects retain their construction names; runtime needs only one draw per
    # material per moving part, not a draw for every rail, hinge or pressure rib.
    previous = bpy.context.view_layer.active_layer_collection
    export_coll = collection("Temporary • compact export")
    original_names = {root: root.name for root in roots}
    for root, name in original_names.items():
        root.name = "Source • " + name
    export_roots = []
    bpy.context.view_layer.update()
    for source, name in original_names.items():
        parent = empty(name, export_coll)
        export_roots.append(parent)
        copies = []
        for obj in descendants(source):
            if obj.type != "MESH" or not len(obj.data.polygons):
                continue
            copy = obj.copy()
            copy.data = obj.data.copy()
            export_coll.objects.link(copy)
            copy.parent = None
            copy.matrix_world = obj.matrix_world.copy()
            # Apply only the bounded authored bevel on this disposable copy.
            # Source modifiers remain editable; joining must not drop their edges.
            if copy.modifiers:
                bpy.ops.object.select_all(action="DESELECT")
                copy.select_set(True)
                bpy.context.view_layer.objects.active = copy
                for modifier in list(copy.modifiers):
                    if modifier.type != "BEVEL" and not (name.startswith("Cloud_") and modifier.type == "REMESH"):
                        raise RuntimeError(
                            f"Unreviewed modifier in export: {modifier.type}"
                        )
                    bpy.ops.object.modifier_apply(modifier=modifier.name)
            copies.append(copy)
        if copies:
            bpy.ops.object.select_all(action="DESELECT")
            for obj in copies:
                obj.select_set(True)
            bpy.context.view_layer.objects.active = copies[0]
            bpy.ops.object.join()
            joined = bpy.context.view_layer.objects.active
            joined.name = name + " • modeled surfaces"
            joined.parent = parent
            joined.data.calc_loop_triangles()
    bpy.ops.object.select_all(action="DESELECT")
    objects = [obj for root in export_roots for obj in descendants(root)]
    for obj in objects:
        obj.hide_set(False)
        obj.select_set(True)
    path.parent.mkdir(parents=True, exist_ok=True)
    result = bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_yup=True,
        export_vertex_color="MATERIAL",
        export_materials="EXPORT",
        export_texcoords=False,
        export_normals=True,
        export_meshopt_compression_enable=True,
        export_meshopt_extension="EXT_meshopt_compression",
        export_extras=True,
        export_copyright="Original interpretive artwork, Janus Observatory, 2026",
    )
    if "FINISHED" not in result:
        raise RuntimeError(f"glTF export failed: {path}")
    tris = sum(len(o.data.loop_triangles) for o in objects if o.type == "MESH")
    receipt = {
        "path": str(path.relative_to(ROOT)),
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "triangles": tris,
        "parts": list(original_names.values()),
    }
    for obj in list(export_coll.objects):
        data = obj.data if obj.type == "MESH" else None
        bpy.data.objects.remove(obj, do_unlink=True)
        if data and not data.users:
            bpy.data.meshes.remove(data)
    bpy.data.collections.remove(export_coll)
    for obj, name in original_names.items():
        obj.name = name
    bpy.context.view_layer.active_layer_collection = previous
    return receipt


def actor_assembly(job, library, coll, parent):
    subject = job["subject"]
    kind, typ = subject["kind"], subject["type"]
    prefix = f"Life_{typ}_{kind}"
    actor = empty("Activity • " + kind, coll)
    actor.parent = parent
    actor.scale = (job["radius"] * job["size"],) * 3
    duplicate_tree(library[prefix + "_body"], coll, actor)
    joints = []
    canoe_arms = []
    paddle = None

    def part(index, position=(0, 0, 0), pivot_parent=actor, name=None, motion=None):
        pivot = empty(name or f"{kind} • articulated {index}", coll)
        pivot.parent = pivot_parent
        pivot.location = xyz(position)
        duplicate_tree(library[prefix + "_extra" + str(index)], coll, pivot)
        if motion:
            joints.append((pivot, motion))
        return pivot

    if typ == "vehicle":
        if kind == "cargo-cycle":
            sites = [(0, 0.036, -0.072), (-0.054, 0.036, 0.072), (0.054, 0.036, 0.072)]
        else:
            sites = [
                (side * 0.064, 0.045 if kind == "haul-truck" else 0.031, z)
                for side in (-1, 1)
                for z in (
                    (-0.08, 0.029, 0.09)
                    if kind in ("haul-truck", "service-rover")
                    else (-0.077, 0.081)
                )
            ]
        for p in sites:
            part(0, p, motion="wheel")
        if kind == "haul-truck":
            bed = part(1, (0, 0.096, 0.112), motion="tip")
            part(2, pivot_parent=bed)
    elif typ == "aircraft":
        for side in (-1, 1):
            part(
                0,
                (side * 0.155, 0.035, -0.144)
                if kind == "regional-plane"
                else (side * 0.105, 0.015, 0),
                motion="prop" if kind == "regional-plane" else "rotor",
            )
    elif typ == "machine":
        if kind == "maintenance-walker":
            for j, side in enumerate((-1, 1)):
                for k, z in enumerate((-0.067, 0, 0.067)):
                    part(j, (side * 0.049, 0.104, z), motion="leg" + str(j * 3 + k))
            part(2, (0, 0.094, -0.081), motion="tool")
        else:
            boom = part(0, (0.025, 0.137, 0.038), motion="tip")
            part(1, pivot_parent=boom)
    elif typ == "vessel" and kind == "canoe":
        paddle = part(0, (0.062, 0.084, 0), motion="paddle")
        for side, grip in [(-1, (0, 0.016, -0.0255)), (1, (0, -0.008, -0.0064))]:
            upper = part(1, name=f"Crew • {side} upper arm")
            forearm = part(2, name=f"Crew • {side} forearm")
            part(3, grip, pivot_parent=paddle, name=f"Crew • {side} gripping hand")
            canoe_arms.append((side, xyz(grip), upper, forearm))
    elif typ == "animal":
        if kind in ("crane", "bio-ray"):
            for i in (0, 1):
                part(i, motion="wing" + str(i))
        else:
            part(2, (0, 0.164, -0.062), motion="head")
            for j, x in enumerate((-1, 1)):
                for k, z in enumerate((-0.068, 0.066)):
                    leg = part(0, (x * 0.031, 0.151, z), motion="leg" + str(j * 2 + k))
                    part(1, (0, -0.069, 0.006), pivot_parent=leg)
    # Editable route preview, same authored route and dwell phases as the browser.
    points, rotations = job["points"], job["rotations"]
    for state in job["previewMotion"]:
        frame = state["frame"]
        u = state["u"]
        yaw = state["yaw"]
        moving = min(
            1, state["speed"] * job["length"] / (job["radius"] * job["size"]) * 35
        )
        distance = state["distance"] * job["length"] / (job["radius"] * job["size"])
        sample = u * 192
        a = min(191, int(sample))
        f = sample - a
        actor.location = xyz(points[a]).lerp(xyz(points[a + 1]), f)
        q1 = Quaternion((rotations[a][3], *rotations[a][:3]))
        q2 = Quaternion((rotations[a + 1][3], *rotations[a + 1][:3]))
        rot = q1.slerp(q2, f).to_matrix().to_4x4() @ Matrix.Rotation(yaw, 4, "Y")
        actor.rotation_mode = "QUATERNION"
        actor.rotation_quaternion = (C @ rot @ C.inverted()).to_quaternion()
        actor.keyframe_insert("location", frame=frame)
        actor.keyframe_insert("rotation_quaternion", frame=frame)
        for i, (pivot, motion) in enumerate(joints):
            v = (frame - 1) / 24
            angle = 0
            axis = "X"
            if motion == "wheel":
                angle = -distance / (
                    0.045
                    if kind == "haul-truck"
                    else 0.036
                    if kind == "cargo-cycle"
                    else 0.031
                )
            elif motion == "prop":
                angle = v * 42
                axis = "Y"
            elif motion == "rotor":
                angle = v * 38
                axis = "Z"
            elif motion.startswith("wing"):
                angle = (-1 if motion[-1] == "0" else 1) * (
                    0.07 + math.sin(v * 2.1) * 0.32
                )
                axis = "Y"
            elif motion.startswith("leg"):
                angle = (
                    math.sin(distance * 48 + int(motion[-1]) * math.pi) * 0.27 * moving
                )
            elif motion == "paddle":
                angle = math.sin(v * 2.8) * 0.65 * moving
            elif motion in ("tip", "tool", "head"):
                angle = state["work"] * (0.25 if motion == "tip" else -0.6)
            pivot.rotation_mode = "XYZ"
            pivot.rotation_euler = Matrix.Rotation(angle, 4, axis).to_euler()
            if motion == "paddle":
                # Same local paddle orientation as LifeActor, converted from Three.
                rx = Matrix.Rotation(angle, 4, "X")
                rz = Matrix.Rotation(-0.2 + math.cos(v * 2.8) * 0.14 * moving, 4, "Z")
                pivot.rotation_euler = (C @ (rx @ rz) @ C.inverted()).to_euler()
            pivot.keyframe_insert("rotation_euler", frame=frame)
        for side, grip, upper, forearm in canoe_arms:
            shoulder = xyz((side * 0.019, 0.108, 0.014))
            wrist = paddle.matrix_basis @ grip
            elbow = shoulder.lerp(wrist, 0.48) + xyz((side * 0.012, -0.019, 0.010))
            for limb, start, end, radius in [
                (upper, shoulder, elbow, 0.0065),
                (forearm, elbow, wrist, 0.0045),
            ]:
                direction = end - start
                limb.location = start
                limb.rotation_mode = "QUATERNION"
                limb.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(
                    direction.normalized()
                )
                limb.scale = (radius, radius, direction.length)
                for property_name in ("location", "rotation_quaternion", "scale"):
                    limb.keyframe_insert(property_name, frame=frame)
    return actor


def studies(system, world_id):
    result = set()
    for body in system.get("bodies", []):
        if body["activity"] == "orbital":
            result.add("machine-station" if world_id == "s9" else "orbital-habitat")
        elif world_id == "s9":
            result.add(
                "venus-facility" if body["body"] == "Venus" else "machine-facility"
            )
        elif body["body"] == "Moon":
            result.add("lunar-base")
        elif body["body"] == "Mars":
            result.add("mars-base")
        else:
            result.add(
                "venus-facility" if body["activity"] == "surface" else "aerostat"
            )
    if world_id == "s10":
        result.add("orbital-habitat")
    return sorted(result)


def setup_camera(root, coll, name="Camera • portrait", angle=0):
    mesh_objects = [o for o in descendants(root) if o.type == "MESH"]
    bpy.context.view_layer.update()
    coords = [o.matrix_world @ Vector(p) for o in mesh_objects for p in o.bound_box]
    low = Vector(tuple(min(p[i] for p in coords) for i in range(3)))
    high = Vector(tuple(max(p[i] for p in coords) for i in range(3)))
    target = (high + low) / 2
    span = max(high - low)
    camera_data = bpy.data.cameras.new(name)
    camera = bpy.data.objects.new(name, camera_data)
    coll.objects.link(camera)
    camera.location = target + Vector((math.sin(angle) * 5, -math.cos(angle) * 5, 1.65))
    camera.rotation_euler = (
        (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    )
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = span * 1.25
    bpy.context.scene.camera = camera
    return camera


def studio(coll):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 2
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.025, 0.04, 0.055)
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (
        0.06,
        0.09,
        0.13,
        1,
    )
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.5
    scene.view_settings.view_transform = "AgX"
    for name, loc, power, color, size in [
        ("Key", (-3, -4, 5), 650, (1, 0.9, 0.76), 5),
        ("Cool rim", (3, 2, 3), 900, (0.35, 0.75, 1), 4),
        ("Fill", (3, -3, 1), 220, (0.62, 0.88, 1), 4),
    ]:
        light = bpy.data.lights.new(name, "AREA")
        light.energy = power
        light.color = color
        light.shape = "DISK"
        light.size = size
        obj = bpy.data.objects.new(name, light)
        coll.objects.link(obj)
        obj.location = loc
        obj.rotation_euler = (-obj.location).to_track_quat("-Z", "Y").to_euler()


def build(world_id):
    seed = json.loads((ROOT / f"assets/blender/seeds/{world_id}.json").read_text())
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 960
    scene["World"] = world_id
    scene["Artwork"] = "Original interpretive art; not a quantitative reconstruction."
    scene["Edit guide"] = (
        "Earth assembly uses linked editable components. Hidden Library collections contain local-space parts. Other destinations each have a separate scene. Timeline previews authored trips; the website retains its verified motion controller."
    )
    system = seed["system"]["art"] if seed["system"] else {"bodies": [], "features": []}
    output = ROOT / f"apps/web/public/assets/blender/v1/{world_id}"
    exports = []
    desktop = None
    for tier in seed["tiers"]:
        suffix = "mobile" if tier["mobile"] else "desktop"
        coll = collection("Library • " + suffix)
        library = {}
        for name, data in {**tier["parts"], **seed["shared"]}.items():
            parent = empty(name, coll)
            parent["semantic_part"] = name
            obj = import_mesh(name, data, coll, _linear_hex(seed["art"]["ocean"]))
            obj.parent = parent
            for detail in polish_part(world_id, name, obj, tier["mobile"]):
                detail.parent = parent
            library[name] = parent
        for kind in studies(system, world_id):
            name = "Study_" + kind
            parent = empty(name, coll)
            for obj in build_study(world_id.upper(), kind):
                if obj.parent is None:
                    obj.parent = parent
            library[name] = parent
        exports.append(
            export_glb(
                output / ("earth-mobile.glb" if tier["mobile"] else "earth.glb"),
                list(library.values()),
            )
        )
        # Free the exact semantic names for the next quality tier; Web names are already exported.
        for name, obj in library.items():
            obj.name = f"{suffix} • {name}"
        if not tier["mobile"]:
            desktop = (coll, library, tier)
        else:
            for obj in list(coll.objects):
                bpy.data.objects.remove(obj, do_unlink=True)
            bpy.data.collections.remove(coll)
    source, library, tier = desktop
    view = collection("Earth • editable assembly")
    earth = empty("Earth • " + world_id, view)
    earth["portrait"] = "Earth"
    # Convert the two nested authored Three rotations in their original order.
    earth.matrix_world = (
        C
        @ (
            Matrix.Rotation(seed["art"]["tilt"], 4, "Z")
            @ Matrix.Rotation(seed["art"]["turn"], 4, "Y")
        )
        @ C.inverted()
    )
    for name in ("Terrain", "Structures"):
        duplicate_tree(library[name], view, earth)
    for site in tier["sites"]:
        obj = duplicate_tree(library["Landmark_" + site["kind"]], view, earth)
        values = site["matrix"]
        matrix = Matrix([[values[c * 4 + r] for c in range(4)] for r in range(4)])
        obj.matrix_basis = C @ matrix @ C.inverted()
        if site["mechanismPosition"]:
            part = duplicate_tree(library["Mechanism_" + site["kind"]], view, obj)
            part.location = xyz(site["mechanismPosition"])
            axis = "X" if site["kind"] == "watermill" else "Y"
            for frame in (1, 960):
                part.rotation_euler = Matrix.Rotation(
                    (frame - 1) / 24 * (0.7 if axis == "X" else -0.85), 4, axis
                ).to_euler()
                part.keyframe_insert("rotation_euler", frame=frame)
    for job in tier["jobs"]:
        for label in ("road", "stops"):
            if job[label]:
                duplicate_tree(library["Activity_" + job["subject"]["kind"] + "_" + label], view, earth)
        actor_assembly(job, library, view, earth)
    radius = tier["jobs"][0]["radius"] if tier["jobs"] else 1
    for i in range(min(seed["art"]["cloud"], 5)):
        cloud = duplicate_tree(library["Cloud_" + str(i)], view, earth)
        for pose in seed["clouds"][i]:
            frame = pose["frame"]
            cloud.scale = (pose["scale"],) * 3
            cloud.location = xyz(pose["position"])
            normal = cloud.location.normalized()
            cloud.rotation_mode = "QUATERNION"
            cloud.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(normal) @ Quaternion((0, 0, 1), pose["yaw"])
            cloud.keyframe_insert("location", frame=frame)
            cloud.keyframe_insert("rotation_quaternion", frame=frame)
    source.hide_render = True
    bpy.context.view_layer.layer_collection.children[source.name].exclude = True
    studio_coll = collection("Studio • lighting and cameras")
    studio(studio_coll)
    scene.frame_set(1)
    setup_camera(earth, studio_coll)
    scene.name = world_id.upper() + " • Earth"
    earth_scene = scene
    for selection in [*[b["body"] for b in system["bodies"]], *system["features"]]:
        # Separate scenes make every companion editable without a crowded master viewport.
        scene = bpy.data.scenes.new(world_id.upper() + " • " + selection)
        scene.world = earth_scene.world
        bpy.context.window.scene = scene
        coll = collection(selection + " • native editable construction")
        root = empty(world_id.upper() + "_" + selection, coll)
        root["portrait"] = selection
        for obj in build_system_world(world_id.upper(), selection, system):
            if obj.parent is None:
                obj.parent = root
        exports.append(export_glb(output / (selection + ".glb"), [root]))
        light_coll = collection("Studio • " + selection)
        studio(light_coll)
        setup_camera(root, light_coll)
    bpy.context.window.scene = earth_scene
    # Start sources in a usable camera-composed material-preview viewport, not at the factory cube.
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.region_3d.view_perspective = "CAMERA"
                area.spaces.active.shading.type = "MATERIAL"
    path = ROOT / f"assets/blender/{world_id}.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(path), compress=True)
    receipt = {
        "world": world_id,
        "blender": bpy.app.version_string,
        "source": str(path.relative_to(ROOT)),
        "sourceSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "exports": exports,
        "scenes": [s.name for s in bpy.data.scenes],
        "interpretive": True,
        "animations": "Editable 40-second route and articulation previews; web motion stays in R3F.",
    }
    (QA / f"model-{world_id}.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(
        "JANUS_BUILD_FINISHED "
        + json.dumps(
            {
                "world": world_id,
                "exports": len(exports),
                "bytes": sum(e["bytes"] for e in exports),
            }
        ),
        flush=True,
    )


def review(world_id):
    bpy.ops.wm.open_mainfile(filepath=str(ROOT / f"assets/blender/{world_id}.blend"))
    folder = QA / "renders"
    folder.mkdir(exist_ok=True)
    images = []
    selected = os.environ.get("JANUS_REVIEW_ONLY")
    selected = json.loads(selected).get(world_id, []) if selected else None
    for scene in list(bpy.data.scenes):
        bpy.context.window.scene = scene
        roots = [obj for obj in scene.objects if obj.get("portrait")]
        if not roots:
            continue
        root = roots[0]
        selection = root["portrait"]
        if selected is not None and selection not in selected:
            continue
        scene.render.threads_mode = "FIXED"
        scene.render.threads = 2
        scene.cycles.device = "CPU"
        scene.cycles.samples = 16
        for angle, label in [(0, "front"), (0.95, "quarter"), (math.pi, "rear")]:
            scene.frame_set(1)
            coll = next(
                c for c in scene.collection.children if c.name.startswith("Studio")
            )
            setup_camera(root, coll, angle=angle)
            scene.render.filepath = str(folder / f"{world_id}-{selection}-{label}.png")
            bpy.ops.render.render(write_still=True)
            images.append(scene.render.filepath)
        if selection == "Earth" and os.environ.get("JANUS_REVIEW_AIRFIELDS") == "1":
            seed = json.loads((ROOT / f"assets/blender/seeds/{world_id}.json").read_text())
            tier = next(t for t in seed["tiers"] if not t["mobile"])
            for job in tier["jobs"]:
                if job["route"] != "flight":
                    continue
                for index, label in [(0, "departure"), (-1, "arrival")]:
                    point = xyz(job["points"][index])
                    target = root.matrix_world @ point
                    up = (root.matrix_world.to_3x3() @ point.normalized()).normalized()
                    right = up.cross(Vector((0, 0, 1))).normalized()
                    tangent = right.cross(up).normalized()
                    camera = setup_camera(root, coll, name="Camera • airfield inspection")
                    camera.location = target + up * 1.2 + tangent * 0.42
                    camera.rotation_euler = ((target - camera.location).to_track_quat("-Z", "Y").to_euler())
                    camera.data.ortho_scale = job["radius"] * 0.79
                    scene.render.filepath = str(folder / f"{world_id}-airfield-{label}.png")
                    bpy.ops.render.render(write_still=True)
                    images.append(scene.render.filepath)
    if not images:
        raise RuntimeError(f"No requested review scenes rendered for {world_id}")
    receipt = QA / f"review-{world_id}.json"
    prior = (
        json.loads(receipt.read_text()).get("images", []) if receipt.exists() else []
    )
    receipt.write_text(
        json.dumps({"world": world_id, "images": sorted(set(prior + images))}, indent=2)
        + "\n"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--world", required=True)
    parser.add_argument("--phase", choices=("build", "review"), required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])
    (build if args.phase == "build" else review)(args.world)
