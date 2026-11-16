import bpy,os
bpy.ops.wm.read_factory_settings(use_empty=True)
p=os.path.abspath('assets/ui/menu/polyhaven/rock_face_02/rock_face_02.gltf')
bpy.ops.import_scene.gltf(filepath=p)
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 m=o.modifiers.new('Menu LOD','DECIMATE');m.ratio=.28;bpy.ops.object.modifier_apply(modifier=m.name)
bpy.ops.export_scene.gltf(filepath=os.path.abspath('assets/ui/menu/polyhaven/rock_face_02/rock-menu.glb'),export_format='GLB',export_animations=False,export_image_format='JPEG',export_jpeg_quality=88)
