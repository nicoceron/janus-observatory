"""Original Janus character/observatory, deterministic Blender 5.2 authoring pipeline.

Run: blender --background --factory-startup --python assets/sources/janus-cinematic/build_observatory.py
All anatomy, architecture and action are fictional project-original visual interpretation.
No third-party model or texture is copied into this asset.
"""

from pathlib import Path
import hashlib
import json
import math
import sys

import bpy
from mathutils import Vector, noise

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "assets/sources/janus-cinematic"
OUTPUT = ROOT / "apps/web/public/assets/models"
QA = ROOT / "docs/qa/refinement/observer"
for directory in (SOURCE, OUTPUT, QA):
    directory.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.render.resolution_x = 1200
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.fps = 30
scene.frame_start = 1
scene.frame_end = 180
scene.world.use_nodes = True
scene.world.node_tree.nodes.get("Background").inputs[0].default_value = (0.006, 0.009, 0.016, 1)
scene.world.node_tree.nodes.get("Background").inputs[1].default_value = 0.12
scene.view_settings.view_transform = "AgX"


def material(name, color, roughness=0.5, metal=0.0, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*color, 1)
    node.inputs["Roughness"].default_value = roughness
    node.inputs["Metallic"].default_value = metal
    if emission:
        node.inputs["Emission Color"].default_value = (*color, 1)
        node.inputs["Emission Strength"].default_value = emission
    return mat


skin = material("Skin_lichen_slate", (0.31, 0.37, 0.34), 0.57)
skin_dark = material("Skin_folds", (0.19, 0.235, 0.21), 0.64)
eye = material("Eye_obsidian", (0.008, 0.014, 0.017), 0.085)
iris = material("Iris_old_gold", (0.23, 0.19, 0.1), 0.27)
cloth = material("Woven_graphite", (0.055, 0.073, 0.083), 0.86)
cloth_edge = material("Garment_seams", (0.13, 0.15, 0.16), 0.8)
metal = material("Brushed_titanium", (0.23, 0.25, 0.26), 0.48, 0.76)
dark_metal = material("Optical_graphite", (0.045, 0.057, 0.068), 0.38, 0.68)
brass = material("Aged_bronze", (0.25, 0.20, 0.13), 0.52, 0.75)
glass = material("Optical_coating", (0.032, 0.08, 0.105), 0.1, 0.68)
glass.node_tree.nodes.get("Principled BSDF").inputs["Alpha"].default_value = 0.06
glass.surface_render_method = "DITHERED"
stone = material("Basalt", (0.038, 0.048, 0.062), 0.88)
warm = material("Warm_practical", (1, 0.69, 0.32), 0.4, emission=2.5)


def normal_detail(name, strength):
    """Project-original periodic micro-normal bitmap; supported directly by glTF."""
    size = 256
    image = bpy.data.images.new(name, width=size, height=size, alpha=False)
    image.colorspace_settings.name = "Non-Color"
    pixels = []
    for y in range(size):
        for x in range(size):
            u, v = x / size * math.tau, y / size * math.tau
            dx = math.cos(u * 19 + math.sin(v * 7)) * 0.27 + math.sin(u * 43 + v * 31) * 0.13
            dy = math.cos(v * 23 + math.sin(u * 11)) * 0.27 + math.sin(v * 47 - u * 29) * 0.13
            n = Vector((-dx * strength, -dy * strength, 1)).normalized()
            pixels.extend((n.x * 0.5 + 0.5, n.y * 0.5 + 0.5, n.z * 0.5 + 0.5, 1))
    image.pixels.foreach_set(pixels)
    image.filepath_raw = str(SOURCE / f"{name}.png")
    image.file_format = "PNG"
    image.save()
    image.pack()
    return image


skin_normal = normal_detail("epidermal-micro-normal-v2", 0.10)
cloth_normal = normal_detail("woven-micro-normal-v2", 0.16)
for mat, detail, strength in ((skin, skin_normal, 0.22), (skin_dark, skin_normal, 0.18), (cloth, cloth_normal, 0.3), (stone, skin_normal, 0.25)):
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = detail
    texture.extension = "REPEAT"
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = strength
    links.new(texture.outputs["Color"], normal.inputs["Color"])
    links.new(normal.outputs["Normal"], nodes.get("Principled BSDF").inputs["Normal"])

for mat in (skin, skin_dark, cloth):
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    vertex_color = nodes.new("ShaderNodeVertexColor")
    vertex_color.layer_name = "Pigment"
    mat["pigment_base"] = list(nodes.get("Principled BSDF").inputs["Base Color"].default_value[:3])
    links.new(vertex_color.outputs["Color"], nodes.get("Principled BSDF").inputs["Base Color"])


def mesh_object(name, verts, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    data.materials.append(mat)
    uv = data.uv_layers.new(name="DetailUV")
    for loop in data.loops:
        co = data.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (co.x * 0.8 + co.y * 0.34, co.z * 0.8 + co.y * 0.34)
    if mat in (skin, skin_dark, cloth):
        colors = data.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
        for vertex in data.vertices:
            n = noise.noise_vector(vertex.co * 21)
            modulation = 0.92 + 0.06 * n.x
            base = mat["pigment_base"]
            colors.data[vertex.index].color = (*[component * modulation for component in base], 1)
    for polygon in data.polygons:
        polygon.use_smooth = len(polygon.vertices) <= 4
    return obj


def uv_ellipsoid(name, center, scales, mat, segments=48, rings=32, sculpt=False):
    verts, faces = [], []
    for j in range(rings + 1):
        theta = math.pi * j / rings
        for i in range(segments):
            phi = math.tau * i / segments
            x = math.sin(theta) * math.cos(phi)
            y = math.sin(theta) * math.sin(phi)
            z = math.cos(theta)
            # Broad cranium, narrow jaw, subtle asymmetric anatomical surface detail.
            shape = 1
            if sculpt:
                # Broad superior cranium tapers into an integrated, non-human jaw.
                shape = 0.43 + 0.62 * max(0, min(1, (z + 0.7) / 1.1))
                shape += 0.003 * math.sin(phi * 8) * math.sin(theta) ** 2
                x *= shape
                y *= 0.92 + 0.12 * (z + 1) / 2
            verts.append((center[0] + x * scales[0], center[1] + y * scales[1], center[2] + z * scales[2]))
    for j in range(rings):
        for i in range(segments):
            n = (i + 1) % segments
            a, b = j * segments + i, j * segments + n
            faces.append((a, b, b + segments, a + segments))
    return mesh_object(name, verts, faces, mat)


def tube(name, points, radii, mat, sides=16, ellipticity=1, folds=0, caps=True):
    """Continuous section mesh; can be weighted across joints without separate primitives."""
    verts, faces = [], []
    previous_u = None
    for j, raw in enumerate(points):
        p = Vector(raw)
        before = Vector(points[max(0, j - 1)])
        after = Vector(points[min(len(points) - 1, j + 1)])
        tangent = (after - before).normalized()
        if previous_u is None:
            axis = Vector((0, 0, 1)) if abs(tangent.z) < 0.9 else Vector((1, 0, 0))
            u = tangent.cross(axis).normalized()
        else:
            u = (previous_u - tangent * previous_u.dot(tangent)).normalized()
        previous_u = u.copy()
        v = tangent.cross(u).normalized()
        for i in range(sides):
            phi = math.tau * i / sides
            r = radii[j] * (1 + folds * math.cos(phi * 9 + j * 0.2))
            verts.append(tuple(p + r * (math.cos(phi) * u + math.sin(phi) * v * ellipticity)))
    for j in range(len(points) - 1):
        for i in range(sides):
            n = (i + 1) % sides
            a, b = j * sides + i, j * sides + n
            faces.append((a, b, b + sides, a + sides))
    if caps:
        faces += [tuple(reversed(range(sides))), tuple((len(points) - 1) * sides + i for i in range(sides))]
    return mesh_object(name, verts, faces, mat)


def rod(name, a, b, radius, mat, radius2=None, vertices=32):
    return tube(name, [a, b], [radius, radius if radius2 is None else radius2], mat, vertices)


def ring(name, center, axis, radius, thickness, mat, steps=72):
    axis = Vector(axis).normalized()
    u = axis.cross(Vector((1, 0, 0)) if abs(axis.x) < 0.9 else Vector((0, 0, 1))).normalized()
    v = axis.cross(u).normalized()
    points = [tuple(Vector(center) + radius * (u * math.cos(math.tau * i / steps) + v * math.sin(math.tau * i / steps))) for i in range(steps + 1)]
    return tube(name, points, [thickness] * len(points), mat, sides=8)


def box(name, location, scale, mat, bevel=0.04):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("Machined_edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = polygon.area < 0.03
    return obj


def empty(name, location):
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj.location = location
    return obj


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


# Character bones are in world coordinates. Both forearm IK chains terminate at fixed
# instrument contacts; animation never applies independent runtime wrist offsets.
armature_data = bpy.data.armatures.new("ObserverSkeleton")
rig = bpy.data.objects.new("ObserverRig", armature_data)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
bone_specs = {
    "root": ((-1.05, -0.95, 0.25), (-1.05, -0.95, 1.0), None),
    "chest": ((-1.05, -0.95, 1.0), (-1.05, -0.78, 2.0), "root"),
    "neck": ((-1.05, -0.78, 2.0), (-1.1, -0.60, 2.38), "chest"),
    "head": ((-1.1, -0.60, 2.38), (-1.1, -0.55, 3.1), "neck"),
    "upper_arm_L": ((-1.48, -0.76, 1.91), (-1.85, -0.31, 1.53), "chest"),
    "forearm_L": ((-1.85, -0.31, 1.53), (-1.60, 0.59, 1.95), "upper_arm_L"),
    "hand_L": ((-1.60, 0.59, 1.95), (-1.41, 0.80, 2.05), "forearm_L"),
    "upper_arm_R": ((-0.61, -0.76, 1.91), (-0.24, -0.38, 1.51), "chest"),
    "forearm_R": ((-0.24, -0.38, 1.51), (-0.55, -0.11, 2.27), "upper_arm_R"),
    "hand_R": ((-0.55, -0.11, 2.27), (-0.84, 0.04, 2.40), "forearm_R"),
}
for name, (head, tail, parent) in bone_specs.items():
    bone = armature_data.edit_bones.new(name)
    bone.head, bone.tail = head, tail
    if parent:
        bone.parent = armature_data.edit_bones[parent]
bpy.ops.object.mode_set(mode="OBJECT")
rig.select_set(False)


def skin_to(obj, weights):
    """Weights is a function from vertex coordinates/index to {bone: weight}."""
    groups = {}
    for vertex in obj.data.vertices:
        values = weights(vertex.co, vertex.index)
        for bone, weight in values.items():
            if weight <= 0:
                continue
            if bone not in groups:
                groups[bone] = obj.vertex_groups.new(name=bone)
            groups[bone].add([vertex.index], weight, "REPLACE")
    modifier = obj.modifiers.new("Skeleton", "ARMATURE")
    modifier.object = rig
    obj.parent = rig


def rigid_skin(obj, bone):
    skin_to(obj, lambda _p, _i: {bone: 1})
    return obj


head_center = (-1.10, -0.54, 2.78)
rigid_skin(uv_ellipsoid("Cranium", head_center, (0.46, 0.40, 0.61), skin, 64, 48, True), "head")
neck_mesh = tube("Neck", [(-1.05, -0.8, 1.88), (-1.09, -0.70, 2.10), (-1.10, -0.59, 2.40)], [0.19, 0.115, 0.13], skin, 32)
skin_to(neck_mesh, lambda p, _i: {"neck": 1 - max(0, min(1, (p.z - 2.15) / 0.24)), "head": max(0, min(1, (p.z - 2.15) / 0.24))})
for sign in (-1, 1):
    x = -1.1 + sign * 0.205
    for name, scales, mat, y in (("Orbital_ridge", (0.235, 0.035, 0.125), skin_dark, -0.241), ("Eye", (0.215, 0.043, 0.105), eye, -0.213)):
        obj = uv_ellipsoid(f"{name}_{sign}", (0, 0, 0), scales, mat, 40, 24)
        # Slanted almond sockets wrap around the broad cranium, visible in profile.
        for vertex in obj.data.vertices:
            p = vertex.co.copy()
            angle = -sign * 0.28
            vertex.co = (x + p.x * math.cos(angle) + p.z * math.sin(angle), y + p.y - abs(p.x) * 0.15, 2.67 - p.x * math.sin(angle) + p.z * math.cos(angle))
        rigid_skin(obj, "head")
rigid_skin(uv_ellipsoid("Nasal_bridge", (-1.1, -0.235, 2.48), (0.042, 0.045, 0.065), skin, 24, 16), "head")
for sign in (-1, 1):
    rigid_skin(uv_ellipsoid(f"Nares_{sign}", (-1.1 + sign * 0.023, -0.193, 2.455), (0.007, 0.005, 0.015), eye, 16, 12), "head")
rigid_skin(tube("Mouth", [(-1.19, -0.259, 2.37), (-1.1, -0.25, 2.357), (-1.01, -0.259, 2.37)], [0.004, 0.005, 0.004], skin_dark, 8), "head")

# Continuous, subtly pleated garment with broad shoulders and a weighted hem.
robe = tube("Observer_garment", [(-1.05, -0.95, z) for z in (0.12, 0.3, 0.65, 1.0, 1.35, 1.63, 1.84, 1.98)], [0.40, 0.40, 0.34, 0.28, 0.27, 0.34, 0.38, 0.18], cloth, 64, 1.35, 0.025)
skin_to(robe, lambda p, _i: {"root": 1 - max(0, min(1, (p.z - 0.95) / 0.75)), "chest": max(0, min(1, (p.z - 0.95) / 0.75))})
for z in (1.94,):
    rigid_skin(ring(f"Collar_{z}", (-1.05, -0.83, z), (0, 0, 1), 0.225, 0.024, cloth_edge), "chest")
for sign in (-1, 1):
    rigid_skin(tube(f"Tailored_front_seam_{sign}", [(-1.05 + sign * w, -1.23, z) for z, w in ((0.2, 0.34), (0.8, 0.23), (1.3, 0.18), (1.8, 0.3))], [0.009] * 4, cloth_edge, 8), "chest")
    uv_ellipsoid(f"Foot_{sign}", (-1.05 + sign * 0.23, -0.85, 0.12), (0.16, 0.32, 0.11), dark_metal, 32, 16)

for side in ("L", "R"):
    shoulder, elbow, _ = bone_specs[f"upper_arm_{side}"]
    wrist = bone_specs[f"forearm_{side}"][1]
    palm = bone_specs[f"hand_{side}"][1]
    s, e, w = Vector(shoulder), Vector(elbow), Vector(wrist)
    pts = [tuple(s.lerp(e, t)) for t in (0, 0.15, 0.3, 0.45, 0.6)]
    before, after = s.lerp(e, 0.7), e.lerp(w, 0.2)
    pts += [tuple(before * (1-t)**2 + e * 2*t*(1-t) + after * t*t) for t in (0, 0.2, 0.4, 0.6, 0.8, 1)]
    pts += [tuple(e.lerp(w, t)) for t in (0.35, 0.5, 0.65, 0.8, 0.9, 1)]
    radii = [0.17 - 0.10 * i / (len(pts)-1) for i in range(len(pts))]
    sleeve = tube(f"Sleeve_{side}", pts, radii, cloth, 40, 1, 0.085)
    skin_to(sleeve, lambda _p, i, side=side: {f"upper_arm_{side}": 1 - max(0, min(1, (i // 40 - 4) / 7)), f"forearm_{side}": max(0, min(1, (i // 40 - 4) / 7))})
    rigid_skin(ring(f"Cuff_{side}", wrist, w - e, 0.094, 0.019, cloth_edge), f"forearm_{side}")
    hand = tube(f"Palm_{side}", [w, Vector(palm)], [0.075, 0.087], skin, 24, 0.62)
    rigid_skin(hand, f"hand_{side}")
    for digit in range(3):
        offset = (digit - 1) * 0.065
        p = Vector(palm) + Vector((offset, 0, 0))
        finger = tube(f"Finger_{side}_{digit}", [p, p + Vector((0.012, 0.10, -0.01)), p + Vector((0.023, 0.155, -0.065)), p + Vector((0.026, 0.14, -0.12))], [0.023, 0.020, 0.016, 0.009], skin, 12)
        rigid_skin(finger, f"hand_{side}")
    rigid_skin(tube(f"Opposed_digit_{side}", [Vector(palm) + Vector((-0.065, -0.06, 0)), Vector(palm) + Vector((-0.13, 0.03, -0.02)), Vector(palm) + Vector((-0.07, 0.09, -0.055))], [0.025, 0.020, 0.010], skin, 12), f"hand_{side}")
    target = empty(f"Contact_{side}", wrist)
    ik = rig.pose.bones[f"forearm_{side}"].constraints.new("IK")
    ik.target, ik.chain_count = target, 2
    ik.use_stretch = False
    pole = empty(f"Elbow_pole_{side}", tuple(e + Vector(((-1 if side == "L" else 1) * 1.2, -0.4, -0.5))))
    # Rest-pose bend defines the preferred elbow plane. A generic pole angle would
    # rotate these differently oriented chains and visibly twist the sleeves.

# Fuse garment shoulders and sleeves into one continuous tailored shell. This removes
# the detached joint caps that read as a mannequin in the first contact sheet.
garments = [o for o in scene.objects if o.type == "MESH" and o.data.materials[0] == cloth]
bpy.ops.object.select_all(action="DESELECT")
for obj in garments:
    obj.modifiers.clear()
    obj.select_set(True)
bpy.context.view_layer.objects.active = garments[0]
bpy.ops.object.join()
garment = bpy.context.object
garment.name = "Continuous_garment"
garment.parent = None
remesh = garment.modifiers.new("Unified_tailoring", "REMESH")
remesh.mode = "VOXEL"
remesh.voxel_size = 0.045
remesh.use_smooth_shade = True
bpy.ops.object.modifier_apply(modifier=remesh.name)
smooth = garment.modifiers.new("Soft_folds", "SMOOTH")
smooth.factor, smooth.iterations = 0.8, 12
bpy.ops.object.modifier_apply(modifier=smooth.name)
decimate = garment.modifiers.new("Web_tailoring_topology", "DECIMATE")
decimate.ratio = 0.60
bpy.ops.object.modifier_apply(modifier=decimate.name)
garment.vertex_groups.clear()
uv = garment.data.uv_layers.new(name="DetailUV")
for loop in garment.data.loops:
    co = garment.data.vertices[loop.vertex_index].co
    uv.data[loop.index].uv = (co.x * 0.8 + co.y * 0.34, co.z * 0.8)
pigment = garment.data.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
for vertex in garment.data.vertices:
    m = 0.8 + noise.noise_vector(vertex.co * 14).x * 0.1
    pigment.data[vertex.index].color = (*[component*m for component in cloth["pigment_base"]], 1)

def segment_distance(p, a, b):
    a, b = Vector(a), Vector(b)
    t = max(0, min(1, (p-a).dot(b-a) / (b-a).length_squared))
    return (p-a.lerp(b, t)).length

def garment_weights(p, _i):
    if p.z < 1.35:
        chest = max(0, min(1, (p.z-0.95)/0.75))
        return {"root": 1-chest, "chest": chest}
    candidates = ["chest", "upper_arm_L", "forearm_L", "upper_arm_R", "forearm_R"]
    weights = {name: 1 / max(0.04, segment_distance(p, *bone_specs[name][:2]))**6 for name in candidates}
    strongest = sorted(weights, key=weights.get, reverse=True)[:3]
    total = sum(weights[name] for name in strongest)
    return {name: weights[name]/total for name in strongest}

skin_to(garment, garment_weights)

# Physical telescope; optical axis continues from the near eye toward a remote target.
ocular = Vector((-1.27, -0.11, 2.59))
axis = Vector((0, 1, 0.18)).normalized()
objective = ocular + axis * 2.45
empty("Eyepiece", ocular)
empty("Objective", objective)
empty("WorldTarget", ocular + axis * 13)
tube("Eyecup", [ocular, ocular + axis * 0.19], [0.083, 0.083], dark_metal, 48, caps=False)
tube("Focus_tube", [ocular + axis * 0.14, ocular + axis * 0.49], [0.072, 0.09], metal, 48, caps=False)
tube("Main_optical_tube", [ocular + axis * 0.44, objective], [0.24, 0.34], dark_metal, 64, caps=False)
for i, distance in enumerate((0.45, 0.61, 1.2, 1.9, 2.32, 2.45)):
    radius = 0.24 + (distance - 0.44) / 2.01 * 0.1
    ring(f"Optical_band_{i}", ocular + axis * distance, axis, radius, 0.028 if i < 4 else 0.045, metal if i % 2 else brass)
rod("Objective_glass", objective - axis * 0.012, objective, 0.30, glass, vertices=64)
for i in range(4):
    angle = i * math.tau / 4
    offset = Vector((math.cos(angle) * 0.26, -math.sin(angle) * 0.04, math.sin(angle) * 0.26))
    rod(f"Optical_strut_{i}", ocular + axis * 0.68 + offset, objective - axis * 0.15 + offset, 0.014, metal, vertices=12)
knob = rod("Focus_knob", (-0.99, 0.14, 2.34), (-0.73, 0.14, 2.34), 0.08, brass, vertices=48)
for i in range(24):
    a = i * math.tau / 24
    rod(f"Knurl_{i}", (-0.94, 0.14 + math.cos(a) * 0.078, 2.34 + math.sin(a) * 0.078), (-0.76, 0.14 + math.cos(a) * 0.078, 2.34 + math.sin(a) * 0.078), 0.004, metal, vertices=6)
rod("Mount_pier", (-1.27, 0.95, 0.07), (-1.27, 0.95, 2.35), 0.18, dark_metal, 0.13)
rod("Azimuth_base", (-1.27, 0.95, 0.03), (-1.27, 0.95, 0.19), 0.55, metal, vertices=64)
ring("Azimuth_reference", (-1.27, 0.95, 0.20), (0, 0, 1), 0.43, 0.012, brass)
for x in (-1.70, -0.84):
    box(f"Yoke_{x}", (x, 0.95, 2.30), (0.13, 0.34, 0.7), metal)
    rod(f"Altitude_bearing_{x}", (x - 0.07, 0.95, 2.52), (x + 0.07, 0.95, 2.52), 0.22, brass, vertices=48)

# A built observatory, not floating props. Open arches frame the sight line.
rod("Observatory_floor", (0, 0.3, -0.13), (0, 0.3, 0), 4.2, stone, vertices=128)
for radius in (2.7, 3.3, 4.0):
    ring(f"Floor_inlay_{radius}", (0, 0.3, 0.004), (0, 0, 1), radius, 0.008, metal, 100)
for y in (4.6,):
    points = [(3.6 * math.cos(math.pi * i / 72), y, 0.1 + 4.7 * math.sin(math.pi * i / 72)) for i in range(73)]
    tube(f"Observatory_arch_{y}", points, [0.16] * len(points), stone, 12)
    rim = [(3.38 * math.cos(math.pi * i / 72), y - 0.08, 0.1 + 4.48 * math.sin(math.pi * i / 72)) for i in range(73)]
    tube(f"Arch_metal_reveal_{y}", rim, [0.02] * len(rim), brass, 8)
for sign in (-1, 1):
    box(f"Low_parapet_{sign}", (sign * 2.5, 2.55, 0.38), (1.4, 0.3, 0.76), stone)
    box(f"Practical_housing_{sign}", (sign * 2.15, 2.25, 0.48), (0.22, 0.22, 0.9), dark_metal)
    box(f"Practical_diffuser_{sign}", (sign * 2.15, 2.11, 0.69), (0.13, 0.04, 0.22), warm, 0.015)

# One action with constrained arms. Export samples all object/bone animation together.
for frame, lean, head_turn, settle in ((1, -0.035, -0.06, 0.04), (36, -0.025, -0.025, 0.02), (82, 0, 0, 0), (120, 0.002, 0, 0), (180, 0.002, 0, 0)):
    scene.frame_set(frame)
    rig.pose.bones["chest"].rotation_mode = "XYZ"
    rig.pose.bones["chest"].rotation_euler = (lean, 0, 0)
    rig.pose.bones["chest"].keyframe_insert("rotation_euler", frame=frame)
    rig.pose.bones["head"].rotation_mode = "XYZ"
    rig.pose.bones["head"].rotation_euler = (0, head_turn * 0.3, head_turn)
    rig.pose.bones["head"].location = (0, 0, settle)
    rig.pose.bones["head"].keyframe_insert("rotation_euler", frame=frame)
    rig.pose.bones["head"].keyframe_insert("location", frame=frame)
rig.animation_data.action.name = "Observe"

# A restrained focus adjustment pivots about the planted wrist, followed by a hold.
for frame, twist in ((1, 0), (36, 0), (60, 0.11), (82, 0.025), (120, 0.025), (180, 0.025)):
    hand = rig.pose.bones["hand_R"]
    hand.rotation_mode = "XYZ"
    hand.rotation_euler = (0, twist, 0)
    hand.keyframe_insert("rotation_euler", frame=frame)


def camera(name, position, target, lens=48):
    data = bpy.data.cameras.new(name)
    data.lens = lens
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = position
    aim(obj, target)
    return obj


desktop = camera("CameraDesktop", (3.0, 2.5, 3.15), (-2.2, 0.3, 2.50), 44)
portrait = camera("CameraPortrait", (2.7, 2.8, 3.5), (-1.0, -0.15, 2.12), 38)
for cam in (desktop, portrait):
    start = cam.location.copy()
    for frame, blend in ((1, 0), (60, 0.015), (95, 0.16), (130, 0.50), (155, 0.78), (180, 1)):
        target_pos = ocular + axis * 0.10 + Vector((0.0, 0, 0.0))
        # Bend around the near shoulder/head before entering the optical axis.
        arc = Vector((1.8 * math.sin(blend * math.pi), -2.6 * math.sin(blend * math.pi), 0.35 * math.sin(blend * math.pi)))
        cam.location = start.lerp(target_pos, blend) + arc
        target = Vector((-2.2, 0.3, 2.50) if cam == desktop else (-1.0, -0.15, 2.12)).lerp(ocular + axis * 2.2, blend)
        aim(cam, target)
        cam.keyframe_insert("location", frame=frame)
        cam.keyframe_insert("rotation_euler", frame=frame)
    cam.animation_data.action.name = f"Observe_{cam.name}"


def area(name, position, target, energy, color, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.color, data.shape, data.size = energy, color, "DISK", size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = position
    aim(obj, target)


area("Cool_key", (-3.5, 1.8, 6.0), (-1, 0, 2), 300, (0.69, 0.82, 1), 4)
area("Soft_camera_fill", (-4, -4, 3.5), (-1, 0, 1.8), 24, (0.77, 0.86, 1), 3)
area("Warm_instrument_edge", (2.5, 0.3, 3), (-1, 0, 2), 280, (1, 0.68, 0.39), 2)
area("Floor_bounce", (0, -1, 5), (0, 0, 0), 25, (0.77, 0.81, 0.87), 4)

# Join static surfaces by material; skin keeps the armature and vertex groups intact.
# This sharply reduces web draw calls without destructive geometric simplification.
for mat in (metal, dark_metal, brass, glass, stone, warm):
    objects = [o for o in scene.objects if o.type == "MESH" and not any(m.type == "ARMATURE" for m in o.modifiers) and o.data.materials and o.data.materials[0] == mat]
    if not objects:
        continue
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    objects[0].name = f"Architecture_{mat.name}"

for mat in (skin, skin_dark, eye, iris, cloth, cloth_edge):
    objects = [o for o in scene.objects if o.type == "MESH" and any(m.type == "ARMATURE" for m in o.modifiers) and o.data.materials and o.data.materials[0] == mat]
    if not objects:
        continue
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    objects[0].name = f"Character_{mat.name}"

scene.frame_set(1)
scene.camera = desktop
blend_path = SOURCE / "janus-observatory-v2.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
glb_path = SOURCE / "janus-observatory-uncompressed-v2.glb"
bpy.ops.export_scene.gltf(filepath=str(glb_path), export_format="GLB", export_apply=False,
    export_animations=True, export_animation_mode="SCENE", export_frame_range=True,
    export_force_sampling=True, export_bake_animation=True, export_anim_scene_split_object=False,
    export_cameras=True, export_lights=False, export_skins=True, export_tangents=True,
    export_draco_mesh_compression_enable=False, export_extras=True)

def to_three(v):
    return [round(v.x, 6), round(v.z, 6), round(-v.y, 6)]

camera_frames = {}
for cam in (desktop, portrait):
    frames = []
    for frame in range(1, 181):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        p = cam.matrix_world.translation
        direction = cam.matrix_world.to_quaternion() @ Vector((0, 0, -1))
        frames.append({"position": to_three(p), "target": to_three(p + direction * 5), "fov": round(math.degrees(cam.data.angle_y), 6)})
    camera_frames[cam.name] = frames
metadata = {"version": 2, "origin": "fictional", "fps": 30, "frameCount": 180,
    "eye": to_three(ocular), "objective": to_three(objective), "target": to_three(ocular + axis * 13),
    "cameras": camera_frames, "blender": bpy.app.version_string,
    "glbSha256": hashlib.sha256(glb_path.read_bytes()).hexdigest()}
(SOURCE / "shot-metadata-v2.json").write_text(json.dumps(metadata, indent=2) + "\n")
print("JANUS_EXPORT", glb_path, glb_path.stat().st_size)

if "--no-render" not in sys.argv:
    # Render-only target uses the same admitted Solar System Scope base image (CC BY 4.0) as the persistent
    # browser globe. It is deliberately excluded from the exported observer GLB.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=40, radius=0.67, location=ocular + axis*13)
    earth = bpy.context.object
    earth.name = "Reference_Earth_render_only"
    earth_mat = material("Reference_Earth", (0.5, 0.5, 0.5), 0.85)
    image = earth_mat.node_tree.nodes.new("ShaderNodeTexImage")
    image.image = bpy.data.images.load(str(ROOT / "apps/web/public/assets/planets/earth-day-4096.jpg"))
    principled = earth_mat.node_tree.nodes.get("Principled BSDF")
    earth_mat.node_tree.links.new(image.outputs["Color"], principled.inputs["Base Color"])
    earth_mat.node_tree.links.new(image.outputs["Color"], principled.inputs["Emission Color"])
    principled.inputs["Emission Strength"].default_value = 0.4
    earth.data.materials.append(earth_mat)
    for polygon in earth.data.polygons:
        polygon.use_smooth = True
    for frame in (() if "--portrait-only" in sys.argv else (1, 45, 82, 120, 150, 180)):
        scene.frame_set(frame)
        scene.camera = desktop
        scene.render.filepath = str(QA / f"observer-{frame:03}.png")
        bpy.ops.render.render(write_still=True)
    scene.frame_set(82)
    scene.camera = portrait
    scene.render.resolution_x, scene.render.resolution_y = 600, 900
    scene.render.filepath = str(QA / "observer-portrait.png")
    bpy.ops.render.render(write_still=True)
    if "--animatic" in sys.argv:
        scene.camera = desktop
        scene.render.resolution_x, scene.render.resolution_y = 960, 640
        scene.cycles.samples = 12
        scene.render.filepath = str(QA / "motion" / "frame-")
        (QA / "motion").mkdir(exist_ok=True)
        bpy.ops.render.render(animation=True)
