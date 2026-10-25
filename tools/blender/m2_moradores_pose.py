# MOD 204 — Marco 2: poses fixas do morador (Npc-lod2.glb) para a vila arruinada.
# MendigoSentado: sentado no chão abraçando os joelhos, cabeça baixa (mendigos; também as crianças presas, em escala menor).
# MoradorCaido: deitado de costas (vítimas do massacre e corpos sem lençol ao longe; sem sangue nem ferimentos).
# Uso: python m2_moradores_pose.py <saída.glb>
import bpy, math, os, sys
from mathutils import Vector, Matrix
OUT = sys.argv[-1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
bpy.ops.wm.read_factory_settings(use_empty=True)

def load():
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'Npc-lod2.glb'))
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        if o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
    new = [o for o in bpy.data.objects if o not in before]
    arm = [o for o in new if o.type == 'ARMATURE'][0]
    body = [o for o in new if o.type == 'MESH'][0]
    root = arm
    while root.parent: root = root.parent
    if arm.animation_data: arm.animation_data.action = None
    for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
    bpy.context.view_layer.update()
    return arm, body, root

class Poser:
    def __init__(s, arm): s.arm = arm
    def P(s, n): return s.arm.pose.bones[n]
    def w(s, n): bpy.context.view_layer.update(); return s.arm.matrix_world @ s.P(n).head
    def aim(s, n, child, target):
        M = s.arm.matrix_world; Mi = M.inverted(); p0 = s.w(n); p1 = s.w(child)
        q = (p1 - p0).normalized().rotation_difference((target - p0).normalized())
        pb = s.P(n); mw = M @ pb.matrix; R = Matrix.Translation(p0) @ q.to_matrix().to_4x4() @ Matrix.Translation(-p0)
        pb.matrix = Mi @ (R @ mw); bpy.context.view_layer.update()
    def rot(s, n, axis, ang):
        M = s.arm.matrix_world; Mi = M.inverted(); pb = s.P(n); p0 = s.w(n); mw = M @ pb.matrix
        R = Matrix.Translation(p0) @ Matrix.Rotation(ang, 4, axis) @ Matrix.Translation(-p0); pb.matrix = Mi @ (R @ mw); bpy.context.view_layer.update()

def normalize(arm, body, root, height=1.7):
    """Escala para 1,7 m e vira o morador para -Y (frente)."""
    ps = Poser(arm)
    vs = [body.matrix_world @ v.co for v in body.data.vertices]
    h = max(v.z for v in vs) - min(v.z for v in vs)
    root.scale = [c * height / h for c in root.scale]; bpy.context.view_layer.update()
    fwd = ps.w('LeftToes') - ps.w('LeftFoot'); fwd.z = 0; fwd.normalize()
    root.matrix_world = Matrix.Rotation(fwd.to_2d().angle_signed(Vector((0, -1))), 4, 'Z') @ root.matrix_world; bpy.context.view_layer.update()
    return ps

def bake(arm, body, name):
    bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active = body
    for md in list(body.modifiers):
        if md.type == 'ARMATURE': bpy.ops.object.modifier_apply(modifier=md.name)
    mw = body.matrix_world.copy(); body.parent = None; body.matrix_world = mw
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in list(bpy.data.objects):
        if o.type in ('ARMATURE', 'EMPTY'): bpy.data.objects.remove(o)
    vs = [v.co for v in body.data.vertices]; mz = min(v.z for v in vs)
    cx = sum(v.x for v in vs) / len(vs); cy = sum(v.y for v in vs) / len(vs)
    for v in body.data.vertices: v.co -= Vector((cx, cy, mz))
    body.name = name; return body

# ---- Sentado abraçando os joelhos ----
arm, body, root = load(); ps = normalize(arm, body, root)
hips = ps.w('Hips'); root.location += Vector((0, 0, .2 - hips.z)); bpy.context.view_layer.update()
X = Vector((1, 0, 0))
ps.rot('Spine', X, .35); ps.rot('Chest', X, .25) if 'Chest' in arm.pose.bones else None
ps.rot('Neck', X, .35); ps.rot('Head', X, .25)
for side, sx in (('Left', 1), ('Right', -1)):
    hl = ps.w(side + 'UpperLeg'); s = 1 if hl.x > 0 else -1
    knee = Vector((hl.x + s * .1, hl.y - .36, hl.z + .34)); foot = Vector((knee.x, knee.y + .02, .07))
    ps.aim(side + 'UpperLeg', side + 'LowerLeg', knee); ps.aim(side + 'LowerLeg', side + 'Foot', foot)
    sh = ps.w(side + 'UpperArm'); s2 = 1 if sh.x > 0 else -1
    elbow = Vector((sh.x + s2 * .12, sh.y - .2, sh.z - .24)); hand = Vector((s2 * .04, knee.y - .06, knee.z - .1))
    ps.aim(side + 'UpperArm', side + 'LowerArm', elbow); ps.aim(side + 'LowerArm', side + 'Hand', hand)
sit = bake(arm, body, 'MendigoSentado')

# ---- Deitado de costas ----
arm, body, root = load(); ps = normalize(arm, body, root)
for side in ('Left', 'Right'):
    sh = ps.w(side + 'UpperArm'); s2 = 1 if sh.x > 0 else -1
    ps.aim(side + 'UpperArm', side + 'LowerArm', sh + Vector((s2 * .12, .02, -.28)))
    el = ps.w(side + 'LowerArm'); ps.aim(side + 'LowerArm', side + 'Hand', el + Vector((s2 * .06, -.08, -.24)))
    hl = ps.w(side + 'UpperLeg'); s = 1 if hl.x > 0 else -1
    ps.aim(side + 'UpperLeg', side + 'LowerLeg', hl + Vector((s * .06, -.08 * (s > 0), -.42)))
ps.rot('Head', Vector((0, 0, 1)), .5)
root.matrix_world = Matrix.Rotation(-math.pi / 2, 4, 'X') @ root.matrix_world; bpy.context.view_layer.update()  # deita de costas (frente para cima)
lie = bake(arm, body, 'MoradorCaido')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True)
print('ok', {o.name: len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH'})
