"""Bake floor contact into Sandra's exported hip translations (Blender 4.3+).
Run after m8_sandra.py: blender -b --python tools/blender/ground_sandra.py -- Sandra-rig.glb
Hair/skirt are excluded: their floor constraint is applied by sandra-materials.js.
"""
import bpy, json, struct, sys
import numpy as np
path=sys.argv[-1]
raw=open(path,'rb').read();length,kind=struct.unpack_from('<II',raw,12)
doc=json.loads(raw[20:20+length]);tail=bytearray(raw[20+length:])
def accessor(index):
    a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']]
    n={'SCALAR':1,'VEC3':3}[a['type']]
    assert a['componentType']==5126 and not v.get('byteStride')
    off=8+v.get('byteOffset',0)+a.get('byteOffset',0)
    return a,np.ndarray((a['count'],n),dtype='<f4',buffer=tail,offset=off)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
arm=next(o for o in bpy.data.objects if o.type=='ARMATURE')
mesh=max((o for o in bpy.data.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices))
for o in bpy.data.objects:
    if o.animation_data:
        o.animation_data.use_nla=False;o.animation_data.action=None
indices=sorted({i for p in mesh.data.polygons if mesh.data.materials[p.material_index].name.split('.')[0] not in {'Cabelo','Saia'} for i in p.vertices})
scene=bpy.context.scene;fps=scene.render.fps/scene.render.fps_base
deps=bpy.context.evaluated_depsgraph_get()
for anim in doc['animations']:
    action=next(a for a in bpy.data.actions if a.name.startswith(anim['name']+'_') or a.name==anim['name'])
    arm.animation_data.action=action
    ch=next(c for c in anim['channels'] if c['target']['path']=='translation' and doc['nodes'][c['target']['node']].get('name')=='Hips')
    sampler=anim['samplers'][ch['sampler']];_,times=accessor(sampler['input']);acc,values=accessor(sampler['output'])
    corrections=[]
    for time in times[:,0]:
        frame=float(time)*fps;scene.frame_set(int(frame),subframe=frame-int(frame))
        obj=mesh.evaluated_get(deps);evaluated=obj.to_mesh()
        coords=np.empty(len(evaluated.vertices)*3,dtype=np.float32);evaluated.vertices.foreach_get('co',coords)
        coords=coords.reshape(-1,3)[indices];matrix=np.array(obj.matrix_world)
        lowest=float((coords@matrix[2,:3]+matrix[2,3]).min())
        corrections.append(max(0.,.012-lowest));obj.to_mesh_clear()
    values[:,1]+=np.array(corrections)
    if 'min' in acc:acc['min']=values.min(axis=0).tolist()
    if 'max' in acc:acc['max']=values.max(axis=0).tolist()
    print('FLOOR',anim['name'],'samples',len(corrections),'max correction',max(corrections))
chunk=json.dumps(doc,separators=(',',':')).encode();chunk+=b' '*(-len(chunk)%4)
with open(path,'wb') as f:
    f.write(struct.pack('<III',0x46546c67,2,20+len(chunk)+len(tail)))
    f.write(struct.pack('<II',len(chunk),kind));f.write(chunk);f.write(tail)
