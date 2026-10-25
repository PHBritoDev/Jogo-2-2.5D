# MOD 204 — Marco 2: dá esqueleto e animações ao Enemy2.glb (que veio sem rig).
# Usa o esqueleto humanoide e os clipes do Enemy3.glb (mesmo gerador, pose A), ajusta-o ao corpo do Enemy2
# e copia os pesos de pele da malha do Enemy3 por proximidade de superfície (Data Transfer).
# Uso (o Enemy2-rig.glb do jogo saiu assim):
#   E2_RIGID=1500 E2_SMOOTH=10 python m2_rig_enemy2.py <raiz do repositório> <saída.glb> 0.13
import bpy, sys, os
from mathutils import Vector
args=[a for a in sys.argv if not a.startswith('-')]
ROOT=os.path.abspath(args[-3]); OUT=args[-2]; RATIO=float(args[-1])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'Enemy3.glb'))
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
src=[o for o in bpy.data.objects if o.type=='MESH']
src_body=max(src,key=lambda o:len(o.vertex_groups)*100000+len(o.data.vertices))
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'Enemy2.glb'))
e2=[o for o in bpy.data.objects if o not in before and o.type=='MESH'][0]
for o in list(bpy.data.objects):
    if o not in before and o!=e2: bpy.data.objects.remove(o,do_unlink=True)
# aplica transformações e reduz a malha
bpy.ops.object.select_all(action='DESELECT');e2.select_set(True);bpy.context.view_layer.objects.active=e2
e2.parent=None
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=float(os.environ.get('E2_MERGE','0.0008')));bpy.ops.object.mode_set(mode='OBJECT')
dec=e2.modifiers.new('dec','DECIMATE');dec.ratio=RATIO;bpy.ops.object.modifier_apply(modifier='dec')
# alinha: pés no chão, centro no quadril do esqueleto
M=arm.matrix_world
hips=M@arm.data.bones['Hips'].head_local
vs=[e2.matrix_world@v.co for v in e2.data.vertices]
mn=Vector((min(v.x for v in vs),min(v.y for v in vs),min(v.z for v in vs)));mx=Vector((max(v.x for v in vs),max(v.y for v in vs),max(v.z for v in vs)))
# centro do tronco: média dos vértices entre 40% e 70% da altura
band=[v for v in vs if mn.z+(mx.z-mn.z)*.4<v.z<mn.z+(mx.z-mn.z)*.7]
cx=sum(v.x for v in band)/len(band);cy=sum(v.y for v in band)/len(band)
S=float(os.environ.get('E2_SCALE','1.0'))
for v in e2.data.vertices:
    w=e2.matrix_world@v.co
    v.co=Vector(((w.x-cx)*S+hips.x,(w.y-cy)*S+hips.y+float(os.environ.get('E2_DY','0')),(w.z-mn.z)*S))
e2.matrix_world.identity()
print('E2 height',(mx.z-mn.z)*S,'hips',hips)
# pesos: copia os grupos de vértices da malha do Enemy3 pela superfície mais próxima
bpy.context.view_layer.objects.active=e2
for g in src_body.vertex_groups: e2.vertex_groups.new(name=g.name)
dt=e2.modifiers.new('dt','DATA_TRANSFER');dt.object=src_body;dt.use_vert_data=True;dt.data_types_verts={'VGROUP_WEIGHTS'}
dt.vert_mapping='POLYINTERP_NEAREST';dt.layers_vgroup_select_src='ALL';dt.layers_vgroup_select_dst='NAME'
bpy.ops.object.modifier_apply(modifier='dt')
# Partes soltas (lâminas, tiras de pano, espinhos) ficam rígidas no osso dominante: assim não esticam entre ossos distantes.
import bmesh
bm=bmesh.new();bm.from_mesh(e2.data);bm.verts.ensure_lookup_table()
seen=set();islands=[]
for v in bm.verts:
    if v.index in seen: continue
    stack=[v];comp=[];seen.add(v.index)
    while stack:
        x=stack.pop();comp.append(x.index)
        for ed in x.link_edges:
            o=ed.other_vert(x)
            if o.index not in seen: seen.add(o.index);stack.append(o)
    islands.append(comp)
bm.free()
islands.sort(key=len,reverse=True)
names=[g.name for g in e2.vertex_groups]
RIGID=int(os.environ.get('E2_RIGID','0'))
rigid=0
for comp in islands:
    if len(comp)>=RIGID: continue
    tot={}
    for i in comp:
        for g in e2.data.vertices[i].groups: tot[g.group]=tot.get(g.group,0)+g.weight
    if not tot: continue
    best=max(tot,key=tot.get)
    for i in comp:
        for g in list(e2.data.vertices[i].groups): e2.vertex_groups[g.group].remove([i])
        e2.vertex_groups[best].add([i],1.0,'REPLACE')
    rigid+=1
print('islands',len(islands),'sizes',[len(c) for c in islands[:12]],'rigid',rigid)
# normaliza (no máximo 4 influências)
bpy.ops.object.mode_set(mode='WEIGHT_PAINT');bpy.ops.object.vertex_group_smooth(group_select_mode='ALL',factor=.5,repeat=int(os.environ.get('E2_SMOOTH','2')));bpy.ops.object.vertex_group_limit_total(limit=4);bpy.ops.object.vertex_group_normalize_all(lock_active=False);bpy.ops.object.mode_set(mode='OBJECT')
for o in src: bpy.data.objects.remove(o,do_unlink=True)
e2.parent=arm;mod=e2.modifiers.new('arm','ARMATURE');mod.object=arm
e2.matrix_parent_inverse=arm.matrix_world.inverted()
e2.name='Enemy2'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_apply=False,export_image_format='WEBP' if os.environ.get('E2_WEBP') else 'AUTO')
print('ok',len(e2.data.polygons))
