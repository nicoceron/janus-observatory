"""Original cutaway system structure. Editorial geometry, not a scale model.

Presence is gated at runtime by canonical Table 7 dyson_sphere; geometry and
panel count convey no measured quantity. Never placed around the Earth.
"""
from pathlib import Path
import math
import bpy

root = Path(__file__).resolve().parents[3]
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
shell = bpy.data.materials.new("Graphite_collector_face")
shell.diffuse_color = (0.055, 0.072, 0.095, 1)
shell.use_nodes = True
bsdf = shell.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Base Color"].default_value = shell.diffuse_color
bsdf.inputs["Metallic"].default_value = 0.78
bsdf.inputs["Roughness"].default_value = 0.68
edge = bpy.data.materials.new("Titanium_panel_edges")
edge.diffuse_color = (0.12, 0.14, 0.17, 1)
edge.use_nodes = True
bsdf = edge.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Base Color"].default_value = edge.diffuse_color
bsdf.inputs["Metallic"].default_value = 0.86
bsdf.inputs["Roughness"].default_value = 0.64

def point(theta, phi):
    return (math.sin(theta)*math.cos(phi), math.sin(theta)*math.sin(phi), math.cos(theta))

vertices, faces = [], []
# A large missing sector exposes the central star. This is an editorial cutaway,
# not a claim about completeness, engineering, distance, or optical detectability.
for row in range(2, 14):
    for column in range(32):
        phi = column * math.tau / 32
        if 3.3 < phi < 5.9:
            continue
        theta = row * math.pi / 16
        start = len(vertices)
        for j in range(4):
            for i in range(4):
                vertices.append(point(theta + (j/3-.47)*math.pi/16, phi+(i/3-.47)*math.tau/32))
        for j in range(3):
            for i in range(3):
                a = start+j*4+i
                faces.append((a,a+1,a+5,a+4))
mesh = bpy.data.meshes.new("Authored_collector_tiles")
mesh.from_pydata(vertices, [], faces)
mesh.materials.append(shell)
mesh.materials.append(edge)
obj = bpy.data.objects.new("System_cutaway", mesh)
scene.collection.objects.link(obj)
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
solid = obj.modifiers.new("Panel_thickness", "SOLIDIFY")
solid.thickness = 0.012
solid.material_offset_rim = 1
bpy.ops.object.modifier_apply(modifier=solid.name)
bevel = obj.modifiers.new("Panel_machining", "BEVEL")
bevel.width, bevel.segments = 0.002, 2
bevel.material = 1
bpy.ops.object.modifier_apply(modifier=bevel.name)
for face in mesh.polygons:
    face.use_smooth = True
scene["evidence_boundary"] = "Fictional cutaway around a star, not Earth. Listed S9 system signature; not engineering, scale, or an instrument image."
source = root / "assets/sources/janus-cinematic/s9-system-cutaway-v1.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(source))
bpy.ops.export_scene.gltf(filepath=str(root / "assets/sources/janus-cinematic/s9-system-cutaway-uncompressed-v1.glb"), export_format="GLB", export_animations=False)
