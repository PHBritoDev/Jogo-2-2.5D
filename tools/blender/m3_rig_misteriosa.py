# MOD 205 — Marco 3: a "pessoa misteriosa" do Ato II (que o roteiro revela depois como Sandra) duela com o herói.
# O morador encapuzado (Npc-lod2.glb) não tem clipes de luta; aqui os clipes do Enemy3 (mesmo esqueleto humanoide)
# são transferidos para ele pela rotação de cada osso em relação à pose de repouso (retarget no espaço da armadura).
# Uso: python m3_rig_misteriosa.py <saída.glb>
import bpy, os, sys
from mathutils import Matrix, Vector
OUT = sys.argv[-1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
bpy.ops.wm.read_factory_settings(use_empty=True)

def load(name):
    before = set(bpy.data.objects); acts = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, name))
    new = [o for o in bpy.data.objects if o not in before]
    for o in list(new):
        if o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
    new = [o for o in bpy.data.objects if o not in before]
    return [o for o in new if o.type == 'ARMATURE'][0], [o for o in new if o.type == 'MESH'], [a for a in bpy.data.actions if a not in acts]

src, src_meshes, src_actions = load('Enemy3.glb')
tgt, tgt_meshes, tgt_actions = load('Npc-lod2.glb')
for a in tgt_actions: bpy.data.actions.remove(a)
for o in src_meshes: bpy.data.objects.remove(o)
if tgt.animation_data: tgt.animation_data.action = None

def height(arm):
    hs = [arm.data.bones[n].head_local.z for n in ('Head',) if n in arm.data.bones]
    return (hs[0] if hs else 1.5) - min(b.head_local.z for b in arm.data.bones)
ratio = height(tgt) / height(src)
print('ratio', ratio)
names = [b.name for b in tgt.data.bones if b.name in src.data.bones]
order = []
def walk(b):
    if b.name in names: order.append(b.name)
    for c in b.children: walk(c)
for b in tgt.data.bones:
    if b.parent is None: walk(b)

for pb in tgt.pose.bones: pb.rotation_mode = 'QUATERNION'
src.animation_data_create(); tgt.animation_data_create()
for act in src_actions:
    src.animation_data.action = act
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    new = bpy.data.actions.new(act.name); tgt.animation_data.action = new
    for f in range(f0, f1 + 1):
        bpy.context.scene.frame_set(f)
        posed = {}
        for n in order:
            sb, tb = src.data.bones[n], tgt.data.bones[n]
            Rs = src.pose.bones[n].matrix.to_3x3(); Rs0 = sb.matrix_local.to_3x3()
            Rt = (Rs @ Rs0.inverted()) @ tb.matrix_local.to_3x3()
            parent = tb.parent
            while parent is not None and parent.name not in posed: parent = parent.parent
            if parent is None:
                d = (src.pose.bones[n].head - sb.head_local) * ratio
                head = tb.head_local + d
                base = tb.matrix_local
            else:
                rest_rel = parent.matrix_local.inverted() @ tb.matrix_local
                base = posed[parent.name] @ rest_rel
                head = base.translation
            M = Matrix.Translation(head) @ Rt.to_4x4(); posed[n] = M
            basis = base.inverted() @ M if parent is not None else tb.matrix_local.inverted() @ M
            pb = tgt.pose.bones[n]
            pb.matrix_basis = basis
            pb.keyframe_insert('rotation_quaternion', frame=f, group=n)
            if parent is None: pb.keyframe_insert('location', frame=f, group=n)
    print('clip', act.name, f1 - f0)
src.animation_data.action = None
bpy.data.objects.remove(src)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='ACTIONS')
print('ok')
