# MOD 203 — Marco 1: cria os clipes Ajoelhar e OlharMaos no rig do Protagonista e exporta Protagonista-cine.glb
# (só esqueleto + clipes; o jogo aplica os clipes ao modelo original pelos nomes dos ossos).
# Uso (bpy 5.x ou Blender em modo fundo): python m1_animacoes_protagonista.py ../../Protagonista-cine.glb
import bpy, math, os, sys
from mathutils import Vector, Matrix
OUT=sys.argv[-1]
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'Protagonista.glb'))
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
idle=bpy.data.actions['Idle']
M=arm.matrix_world; Mi=M.inverted()
P=lambda n: arm.pose.bones['mixamorig'+n]
def wpos(n): return M@P(n).head
def empty(name,loc):
    e=bpy.data.objects.new(name,None); bpy.context.scene.collection.objects.link(e); e.location=loc; return e
def ik(bone,target,pole=None,chain=3,pole_angle=0):
    c=P(bone).constraints.new('IK'); c.target=target; c.use_tail=False; c.chain_count=chain
    if pole: c.pole_target=pole; c.pole_angle=pole_angle
    return c
def rotate_world(n,axis,ang):
    pb=P(n); bpy.context.view_layer.update()
    mw=M@pb.matrix; piv=mw.translation.copy()
    R=Matrix.Translation(piv)@Matrix.Rotation(ang,4,axis)@Matrix.Translation(-piv)
    pb.matrix=Mi@(R@mw); bpy.context.view_layer.update()

def make(name, frames, pose_fn):
    """frames: lista (frame, peso 0..1). pose_fn(w) aplica a pose para o peso w a partir do Idle quadro 0."""
    arm.animation_data.action=idle
    act=bpy.data.actions.new(name); arm.animation_data.action=act
    for f,w in frames:
        # parte da pose de repouso do Idle
        bpy.context.scene.frame_set(0)
        arm.animation_data.action=idle; bpy.context.scene.frame_set(0); bpy.context.view_layer.update()
        base={pb.name:(pb.location.copy(),pb.rotation_quaternion.copy()) for pb in arm.pose.bones}
        arm.animation_data.action=act
        for pb in arm.pose.bones: pb.location,pb.rotation_quaternion=base[pb.name]
        bpy.context.view_layer.update()
        pose_fn(w)
        # aplica restrições visuais e grava todos os ossos
        bpy.context.view_layer.update()
        mats={pb.name:pb.matrix.copy() for pb in arm.pose.bones}
        for pb in arm.pose.bones:
            for c in list(pb.constraints): pb.constraints.remove(c)
        for pb in sorted(arm.pose.bones,key=lambda b:len(b.parent_recursive)):
            pb.matrix=mats[pb.name]; bpy.context.view_layer.update()
        for pb in arm.pose.bones:
            pb.keyframe_insert('location',frame=f); pb.keyframe_insert('rotation_quaternion',frame=f)
    for o in [o for o in bpy.data.objects if o.type=='EMPTY' and o.name.startswith('T_')]: bpy.data.objects.remove(o)
    act.use_fake_user=True
    return act

UP=Vector((0,0,1)); FWD=Vector((0,-1,0)); RIGHT=Vector((1,0,0))  # personagem olha para -Y
def smooth(w): return w*w*(3-2*w)
def aim(n, child, target):
    """Gira o osso n (em torno da própria cabeça) para que a cabeça do osso filho aponte para target."""
    bpy.context.view_layer.update()
    p0=wpos(n); p1=wpos(child)
    c=(p1-p0).normalized(); d=(target-p0).normalized()
    q=c.rotation_difference(d)
    pb=P(n); mw=M@pb.matrix
    R=Matrix.Translation(p0)@q.to_matrix().to_4x4()@Matrix.Translation(-p0)
    pb.matrix=Mi@(R@mw); bpy.context.view_layer.update()
def lerpv(a,b,w): return a.lerp(b,w)
REST={}
def rest(n): return REST[n]

def kneel(w):
    w=smooth(w)
    hips=P('Hips'); bpy.context.view_layer.update()
    hw=M@hips.matrix; drop=0.45*w
    hw.translation=hw.translation+Vector((0,0.04*w,-drop)); hips.matrix=Mi@hw; bpy.context.view_layer.update()
    rotate_world('Spine',RIGHT,0.10*w); rotate_world('Spine2',RIGHT,0.08*w)
    rotate_world('Neck',RIGHT,0.25*w); rotate_world('Head',RIGHT,0.35*w)
    # perna esquerda à frente: coxa horizontal, canela vertical
    hl=wpos('LeftUpLeg'); kl=hl+Vector((0.02,-0.44,0.0)); fl=Vector((kl.x,kl.y-0.02,0.09))
    aim('LeftUpLeg','LeftLeg',lerpv(rest('LeftLeg'),kl,w) if w<1 else kl); aim('LeftLeg','LeftFoot',lerpv(rest('LeftFoot'),fl,w) if w<1 else fl)
    # perna direita: joelho no chão, canela para trás
    hr=wpos('RightUpLeg'); kr=Vector((hr.x,hr.y+0.06,0.1)); fr=Vector((hr.x,hr.y+0.5,0.12))
    aim('RightUpLeg','RightLeg',lerpv(rest('RightLeg'),kr,w)); aim('RightLeg','RightFoot',lerpv(rest('RightFoot'),fr,w))
    aim('RightFoot','RightToeBase',wpos('RightFoot')+Vector((0,0.06,-0.12*w)))
    # mão direita sobre o joelho da frente; esquerda no peito
    kneeL=wpos('LeftLeg'); sh=wpos('RightArm')
    aim('RightArm','RightForeArm',lerpv(rest('RightForeArm'),sh+Vector((-0.02,-0.12,-0.24)),w))
    aim('RightForeArm','RightHand',lerpv(rest('RightHand'),kneeL+Vector((-0.08,0.02,0.07)),w))
    shl=wpos('LeftArm'); ch=wpos('Spine2')
    aim('LeftArm','LeftForeArm',lerpv(rest('LeftForeArm'),shl+Vector((0.04,-0.1,-0.22)),w))
    aim('LeftForeArm','LeftHand',lerpv(rest('LeftHand'),ch+Vector((0.03,-0.17,0.05)),w))

def look_hands(w):
    w=smooth(w)
    rotate_world('Spine1',RIGHT,0.08*w)
    rotate_world('Neck',RIGHT,0.30*w); rotate_world('Head',RIGHT,0.38*w)
    for side,sx in (('Left',1),('Right',-1)):
        sh=wpos(side+'Arm'); ch=wpos('Spine2')
        aim(side+'Arm',side+'ForeArm',lerpv(rest(side+'ForeArm'),sh+Vector((sx*0.03,-0.10,-0.25)),w))
        aim(side+'ForeArm',side+'Hand',lerpv(rest(side+'Hand'),ch+Vector((sx*0.11,-0.34,-0.05)),w))
        # palmas para cima: gira a mão em torno do antebraço
        bpy.context.view_layer.update()
        axis=(wpos(side+'Hand')-wpos(side+'ForeArm')).normalized()
        pb=P(side+'Hand'); mw=M@pb.matrix; p0=wpos(side+'Hand')
        R=Matrix.Translation(p0)@Matrix.Rotation(sx*1.2*w,4,axis)@Matrix.Translation(-p0)
        pb.matrix=Mi@(R@mw); bpy.context.view_layer.update()

# posições de repouso (Idle quadro 0) para interpolar
arm.animation_data.action=idle; bpy.context.scene.frame_set(0); bpy.context.view_layer.update()
for pb in arm.pose.bones: REST[pb.name.replace('mixamorig','')]=(M@pb.head).copy()
make('Ajoelhar',[(0,0),(10,.35),(20,.8),(30,1),(60,1)],kneel)
make('OlharMaos',[(0,0),(15,.5),(30,1),(75,1),(90,1)],look_hands)
# exporta só esqueleto + ações novas (o jogo aplica os clipes no modelo original)
for a in list(bpy.data.actions):
    if a.name not in ('Ajoelhar','OlharMaos'): bpy.data.actions.remove(a)
for o in list(bpy.data.objects):
    if o.type=='MESH': bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',export_animations=True,export_animation_mode='ACTIONS')
print('EXPORT OK',OUT)
