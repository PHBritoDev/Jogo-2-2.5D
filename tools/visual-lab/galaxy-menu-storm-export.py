"""Rebuild the menu-only static silhouette from the repository's Demonio1.glb.
Run from repository root: blender -b -t 2 --python tools/visual-lab/galaxy-menu-storm-export.py
Blender 4.3.2, native idle frame 2, 45% geometry, baked 512px PBR textures, no animations.
The original gameplay GLB is read-only. The result is scenery, not a new boss.
"""
import bpy, os
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath('Demonio1.glb'))
clip='_01a1b3e4_6f0c_705b_82f5_e9447d85cbef'
rigs=[o for o in bpy.context.scene.objects if o.type=='ARMATURE']
if not rigs: raise RuntimeError('Missing source rig')
for obj in rigs:
 action=next((a for a in bpy.data.actions if a.name==clip or a.name.startswith(clip+'_')),None)
 if action is None: raise RuntimeError('Missing required idle clip: '+clip)
 obj.animation_data_create();obj.animation_data.action=action;obj.animation_data.use_nla=False
 print('MENU_POSE',obj.name,action.name)
bpy.context.scene.frame_set(2)
for obj in list(bpy.context.scene.objects):
 if obj.type!='MESH':continue
 bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 for m in list(obj.modifiers):
  if m.type=='ARMATURE':bpy.ops.object.modifier_apply(modifier=m.name)
 world=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=world
 obj['menu_pose']=clip;obj['menu_pose_frame']=2
 dec=obj.modifiers.new('Menu silhouette LOD','DECIMATE');dec.ratio=.45
 bpy.ops.object.modifier_apply(modifier=dec.name)
 for face in obj.data.polygons: face.use_smooth=True
for obj in list(bpy.context.scene.objects):
 if obj.type!='MESH':bpy.data.objects.remove(obj,do_unlink=True)
for obj in bpy.context.scene.objects:obj.animation_data_clear()
for image in bpy.data.images:
 if image.type=='IMAGE' and image.size[0]>512: image.scale(512,512)
os.makedirs('assets/ui/menu',exist_ok=True)
bpy.ops.export_scene.gltf(filepath=os.path.abspath('assets/ui/menu/storm-effigy.glb'),export_format='GLB',export_animations=False,export_extras=True,export_materials='EXPORT',export_image_format='JPEG',export_jpeg_quality=85,export_texcoords=True,export_normals=True)
