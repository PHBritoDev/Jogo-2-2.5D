"""Rebuild the menu-only static silhouette from the repository's Demonio1.glb.
Run from repository root: blender -b -t 2 --python tools/visual-lab/galaxy-menu-storm-export.py
Blender 4.3.2, Alert frame 2, 22% decimation, no animation/material/texture download.
The original gameplay GLB is read-only. The result is scenery, not a new boss.
"""
import bpy, os
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath('Demonio1.glb'))
for obj in bpy.context.scene.objects:
 if obj.type=='ARMATURE' and obj.animation_data:
  action=next((a for a in bpy.data.actions if a.name=='Alert'),None)
  if action: obj.animation_data.action=action
bpy.context.scene.frame_set(2)
for obj in list(bpy.context.scene.objects):
 if obj.type!='MESH':continue
 bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 for m in list(obj.modifiers):
  if m.type=='ARMATURE':bpy.ops.object.modifier_apply(modifier=m.name)
 obj.parent=None
 dec=obj.modifiers.new('Menu silhouette LOD','DECIMATE');dec.ratio=.22
 bpy.ops.object.modifier_apply(modifier=dec.name)
 obj.data.materials.clear()
for obj in list(bpy.context.scene.objects):
 if obj.type!='MESH':bpy.data.objects.remove(obj,do_unlink=True)
for obj in bpy.context.scene.objects:obj.animation_data_clear()
os.makedirs('assets/ui/menu',exist_ok=True)
bpy.ops.export_scene.gltf(filepath=os.path.abspath('assets/ui/menu/storm-effigy.glb'),export_format='GLB',export_animations=False,export_materials='NONE',export_texcoords=False,export_normals=True)
