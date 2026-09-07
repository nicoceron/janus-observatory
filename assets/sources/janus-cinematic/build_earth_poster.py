"""Render the admitted Solar System Scope maps (CC BY 4.0) into a no-WebGL globe."""
from pathlib import Path
import bpy
from mathutils import Vector

root = Path(__file__).resolve().parents[3]
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.render.resolution_x = scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "AgX"
bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=80)
earth = bpy.context.object
earth.rotation_euler = (0.08, -0.12, -0.60)
for face in earth.data.polygons:
    face.use_smooth = True
mat = bpy.data.materials.new("Admitted_Solar_System_Scope_Earth")
mat.use_nodes = True
nodes, links = mat.node_tree.nodes, mat.node_tree.links
shader = nodes.get("Principled BSDF")
shader.inputs["Roughness"].default_value = 0.72
tex = nodes.new("ShaderNodeTexImage")
tex.image = bpy.data.images.load(str(root / "apps/web/public/assets/planets/earth-day-4096.jpg"))
surface = nodes.new("ShaderNodeTexImage")
surface.image = bpy.data.images.load(str(root / "apps/web/public/assets/planets/earth-bump-roughness-clouds-4096.jpg"))
surface.image.colorspace_settings.name = "Non-Color"
channels = nodes.new("ShaderNodeSeparateColor")
links.new(surface.outputs["Color"], channels.inputs[0])
cloud_range = nodes.new("ShaderNodeMapRange")
cloud_range.inputs["From Min"].default_value = 0.2
cloud_range.inputs["From Max"].default_value = 0.95
cloud_range.inputs["To Max"].default_value = 0.88
links.new(channels.outputs["Blue"], cloud_range.inputs["Value"])
clouds = nodes.new("ShaderNodeMixRGB")
clouds.inputs[2].default_value = (0.95, 0.97, 1, 1)
links.new(cloud_range.outputs[0], clouds.inputs[0])
links.new(tex.outputs["Color"], clouds.inputs[1])
links.new(clouds.outputs[0], shader.inputs["Base Color"])
links.new(clouds.outputs[0], shader.inputs["Emission Color"])
shader.inputs["Emission Strength"].default_value = 0.022
earth.data.materials.append(mat)
sun = bpy.data.lights.new("Consistent_solar_direction", "SUN")
sun.energy = 2.2
light = bpy.data.objects.new("Sun", sun)
scene.collection.objects.link(light)
light.rotation_euler = Vector((4, 1.8, -1.4)).to_track_quat("-Z", "Y").to_euler()
camera_data = bpy.data.cameras.new("Poster_camera")
camera = bpy.data.objects.new("Poster_camera", camera_data)
scene.collection.objects.link(camera)
camera.location = (0, -4.6, 0)
camera.rotation_euler = (Vector((0, 0, 0))-camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.lens = 72
scene.camera = camera
scene.render.filepath = str(root / "assets/sources/janus-cinematic/earth-portrait-v1.png")
bpy.ops.render.render(write_still=True)
