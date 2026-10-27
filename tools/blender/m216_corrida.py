# MOD 216 — Referência de repouso explícita: corrida do herói. O Protagonista.glb não tem clipe de corrida; este script transfere o "Running"
# da Misteriosa (esqueleto humanoide em pose A) para o esqueleto mixamo do Protagonista (pose T).
# Retarget em espaço de mundo: para cada osso, a rotação do osso de origem desde o repouso é aplicada ao osso de destino,
# depois de alinhar as direções de repouso dos dois (assim a diferença entre pose A e pose T não levanta os braços).
# Saída: só o esqueleto + a ação "Running" (o jogo adiciona o clipe ao mixer do herói).
# Uso: python m11_corrida.py <saída.glb>
import bpy, os, sys
from mathutils import Matrix, Vector, Quaternion
OUT = sys.argv[-1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'Misteriosa-rig.glb'))
SRC = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); SRC.name = 'Fonte'
for o in list(bpy.data.objects):
    if o.type == 'MESH': bpy.data.objects.remove(o)
src_act = next(a for a in bpy.data.actions if a.name=='Running' or a.name.startswith('Running_')); src_act.name = 'FonteCorrida'
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'Protagonista.glb'))
TGT = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and o not in before)
for o in list(bpy.data.objects):
    if o.type == 'MESH': bpy.data.objects.remove(o)
SRC_IDLE = next(a for a in bpy.data.actions if a.name.startswith('_01a15ab5_eeba_71ae_a438_b85a938940fc'))
TGT_IDLE = next(a for a in bpy.data.actions if a.name=='Idle' or a.name.startswith('Idle_'))
for a in list(bpy.data.actions):
    if a not in (src_act, SRC_IDLE, TGT_IDLE): bpy.data.actions.remove(a)
pre = 'mixamorig' if 'mixamorigHips' in TGT.data.bones else 'mixamorig:'
MAP = {'Hips': 'Hips', 'Spine': 'Spine', 'Chest': 'Spine1', 'UpperChest': 'Spine2', 'Neck': 'Neck', 'Head': 'Head'}
for s in ('Left', 'Right'):
    MAP.update({s + 'Shoulder': s + 'Shoulder', s + 'UpperArm': s + 'Arm', s + 'LowerArm': s + 'ForeArm', s + 'Hand': s + 'Hand',
                s + 'UpperLeg': s + 'UpLeg', s + 'LowerLeg': s + 'Leg', s + 'Foot': s + 'Foot', s + 'Toes': s + 'ToeBase'})
MAP = {k: pre + v for k, v in MAP.items() if k in SRC.data.bones and pre + v in TGT.data.bones}
ORDER = sorted([b.name for b in TGT.data.bones if b.name in MAP.values()], key=lambda n: len(TGT.data.bones[n].parent_recursive))   # pais antes dos filhos
INV = {v: k for k, v in MAP.items()}
# Referência = o primeiro quadro do "parado" de cada um (o repouso do Protagonista.glb é deitado; o parado fica em pé).
def use(arm, action):
    arm.animation_data_create(); arm.animation_data.action = action
    if action is not None and hasattr(arm.animation_data, 'action_slot') and action.slots: arm.animation_data.action_slot = action.slots[0]
use(SRC, SRC_IDLE); use(TGT, TGT_IDLE); bpy.context.scene.frame_set(0); bpy.context.view_layer.update()
REFQ = {}; REFD = {}
for arm in (SRC, TGT):
    for pb in arm.pose.bones:
        REFQ[(arm.name, pb.name)] = (arm.matrix_world @ pb.matrix).to_quaternion()
        REFD[(arm.name, pb.name)] = (arm.matrix_world.to_3x3() @ (pb.tail - pb.head)).normalized()
        REFQ[('pos', arm.name, pb.name)] = (arm.matrix_world @ pb.matrix).translation.copy()
def rest_world(arm, name): return REFQ[(arm.name, name)]
def rest_dir(arm, name): return REFD[(arm.name, name)]
# Só braços e pernas são alinhados (pose A x pose T). Tronco, cabeça e pés ficam sem alinhamento: na Misteriosa a
# coluna em zigue-zague e o pé apontado para baixo são detalhes do esqueleto, não da pose.
LIMB = ('UpperArm', 'LowerArm', 'Hand', 'UpperLeg', 'LowerLeg')
ALIGN = {t: (rest_dir(TGT, t).rotation_difference(rest_dir(SRC, s)) if s.endswith(LIMB) else Quaternion()) for s, t in MAP.items()}
RS0 = {s: rest_world(SRC, s) for s in MAP}; RT0 = {t: rest_world(TGT, t) for t in MAP.values()}
use(SRC, src_act); act = bpy.data.actions.new('Running'); use(TGT, act)
for pb in TGT.pose.bones: pb.rotation_mode = 'QUATERNION'
f0, f1 = int(src_act.frame_range[0]), int(src_act.frame_range[1])
k = REFQ[('pos', TGT.name, MAP['Hips'])].z / max(1e-6, REFQ[('pos', SRC.name, 'Hips')].z)
sc = bpy.context.scene
for f in range(f0, f1 + 1):
    sc.frame_set(f)
    for pb in TGT.pose.bones: pb.rotation_quaternion = Quaternion(); pb.location = Vector()
    bpy.context.view_layer.update()
    for t in ORDER:
        s = INV[t]; ps = SRC.pose.bones[s]
        rs = (SRC.matrix_world @ ps.matrix).to_quaternion()
        want = rs @ RS0[s].inverted() @ ALIGN[t] @ RT0[t]                      # rotação desejada no mundo
        amp = .75 if ('Leg' in s or 'Foot' in s or 'Toes' in s) else .8 if s in ('Hips', 'Spine', 'Chest', 'UpperChest') else .5 if ('Arm' in s or 'Hand' in s) else 1.0
        if amp < 1: want = RT0[t].slerp(want, amp)                               # passada e inclinação mais contidas (o casaco longo do herói)
        pt = TGT.pose.bones[t]
        cur = TGT.matrix_world.inverted() @ (TGT.matrix_world @ pt.matrix)
        m = (TGT.matrix_world.inverted().to_quaternion() @ want).to_matrix().to_4x4(); m.translation = cur.translation
        pt.matrix = m; bpy.context.view_layer.update()
        pt.keyframe_insert('rotation_quaternion', frame=f)
    # quadril: só o sobe-e-desce (sem avançar), na escala do herói, a partir da posição do "parado"
    ps = SRC.pose.bones['Hips']; dz = ((SRC.matrix_world @ ps.matrix).translation.z - REFQ[('pos', SRC.name, 'Hips')].z) * k * .5
    ph = TGT.pose.bones[MAP['Hips']]; mh = TGT.matrix_world @ ph.matrix; mh.translation = REFQ[('pos', TGT.name, MAP['Hips'])] + Vector((0, 0, dz)); ph.matrix = TGT.matrix_world.inverted() @ mh
    bpy.context.view_layer.update(); ph.keyframe_insert('location', frame=f)
print('Running retargetado:', f0, f1, len(ORDER), 'ossos')
bpy.data.objects.remove(SRC); bpy.data.actions.remove(src_act); bpy.data.actions.remove(SRC_IDLE)
TGT_IDLE.name = 'Idle'
TGT_IDLE.use_fake_user = True
# O runtime precisa comparar poses equivalentes, não o bind pose deitado do herói.
bpy.ops.object.select_all(action='DESELECT'); TGT.select_set(True); bpy.context.view_layer.objects.active = TGT
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='ACTIONS')
