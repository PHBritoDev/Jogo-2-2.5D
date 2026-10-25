# MOD 203 — Marco 1: modela Asas.glb, TronoCeleste.glb e FiguraDeLuz.glb (a figura usa o Npc-lod.glb posado sentado).
# Uso (bpy 5.x ou Blender em modo fundo): python m1_modelos_ceu.py ../..   (a pasta de saída é o último argumento)
import bpy, bmesh, math, os, random, sys
from mathutils import Vector, Matrix
OUT=sys.argv[-1]
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene

def mat(name,base,metal=0,rough=.5,emit=None,strength=0,vcol=False):
    m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value=(*base,1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough
    if emit: b.inputs['Emission Color'].default_value=(*emit,1);b.inputs['Emission Strength'].default_value=strength
    if vcol:
        a=m.node_tree.nodes.new('ShaderNodeVertexColor');a.layer_name='Col'
        m.node_tree.links.new(a.outputs['Color'],b.inputs['Base Color'])
    return m

def join(objs,name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();o=bpy.context.object;o.name=name;return o

def apply_all(o):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    for m in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)

# ---------------- ASAS ----------------
def feather(length,width,bend,col_root,col_tip):
    """Pena: lâmina afunilada com raque central e leve curvatura; cores por vértice (raiz → ponta)."""
    me=bpy.data.meshes.new('pena');bm=bmesh.new();N=8;rows=[]
    for i in range(N+1):
        t=i/N; w=width*(math.sin(min(1,t*1.15)*math.pi)**.6)*(1-.25*t)+.002
        z=-length*t; y=bend*(t*t)
        rows.append((bm.verts.new((-w*.5,y,z)),bm.verts.new((0,y+width*.06,z)),bm.verts.new((w*.5,y,z))))
    col=bm.loops.layers.color.new('Col')
    for i in range(N):
        a,b=rows[i],rows[i+1]
        for f in (bm.faces.new((a[0],b[0],b[1],a[1])),bm.faces.new((a[1],b[1],b[2],a[2]))):
            for l in f.loops:
                t=-l.vert.co.z/length; c=[col_root[k]*(1-t)+col_tip[k]*t for k in range(3)]
                l[col]=(*c,1)
    bm.to_mesh(me);bm.free();o=bpy.data.objects.new('pena',me);sc.collection.objects.link(o);return o

WHITE=(0.96,0.94,0.9);GOLD=(1.0,0.78,0.35);IVORY=(0.92,0.88,0.8)
feather_mat=mat('Pena',WHITE,0,.55,(1,.85,.55),.35,vcol=True)
def wing(side):
    s=1 if side=='L' else -1; parts=[]
    # arco do braço da asa: sobe e abre para o lado, depois desce até a ponta
    def arm(t): return Vector((s*(0.15+2.3*t), 0.12*t, 0.25+1.25*math.sin(t*math.pi*.62)-0.35*t*t))
    # primárias: longas na ponta, abrindo em leque para baixo e para fora
    for i in range(11):
        t=.62+.38*i/10; p=arm(t); f=feather(1.25+.5*(i/10),.2,.12,IVORY,GOLD)
        f.location=p; f.rotation_euler=(0.08,-s*(0.35+1.05*(i/10)),0); parts.append(f)
    # secundárias: ao longo do braço, para baixo
    for i in range(14):
        t=.05+.57*i/13; p=arm(t); f=feather(1.05-.15*(i/13),.18,.1,WHITE,(0.98,0.86,0.55))
        f.location=p+Vector((0,0.02,0)); f.rotation_euler=(0.1,-s*(0.05+0.3*(i/13)),0); parts.append(f)
    # coberteiras: duas fileiras curtas por cima
    for r in range(2):
        for i in range(16):
            t=.03+.85*i/15; p=arm(t)+Vector((0,-0.03-0.02*r,0.02-0.12*r)); f=feather(.55-.18*r,.16,.06,WHITE,WHITE)
            f.location=p; f.rotation_euler=(0.06,-s*(0.1+0.7*t),0); parts.append(f)
    o=join(parts,'Asa'+('Esquerda' if s==1 else 'Direita')); o.data.materials.append(feather_mat)
    apply_all(o); bpy.ops.object.shade_smooth()
    return o
wl=wing('L'); wr=wing('R')

# ---------------- TRONO ----------------
gold=mat('Ouro',GOLD,1,.28,(1,.7,.25),.25); marble=mat('Marmore',(0.95,0.94,0.92),0,.32); glow=mat('Halo',(1,.95,.8),0,.2,(1,.9,.6),6)
tparts=[]
def box(sx,sy,sz,loc,m,bev=.06):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=(sx,sy,sz)
    md=o.modifiers.new('b','BEVEL');md.width=bev;md.segments=2;apply_all(o);o.data.materials.append(m);tparts.append(o);return o
# degraus (estrado)
for i,(w,d) in enumerate([(9,7),(7.4,5.8),(5.8,4.6)]):
    box(w,d,.45,(0,0,.225+i*.45),marble); box(w+.08,d+.08,.08,(0,0,.45+i*.45),gold,.02)
base=1.35
box(3.2,2.6,1.1,(0,.2,base+.55),marble)                    # assento
box(3.3,2.7,.14,(0,.2,base+1.15),gold,.03)                 # almofada/borda
for x in (-1.75,1.75):
    box(.45,2.4,.9,(x,.2,base+1.6),gold,.08)               # braços
    bpy.ops.mesh.primitive_torus_add(major_radius=.32,minor_radius=.12,location=(x,-1.0,base+1.85),rotation=(0,math.pi/2,0));o=bpy.context.object;o.data.materials.append(gold);tparts.append(o)
# encosto em arco gótico
bm=bmesh.new();pts=[]
H=6.2;W=1.75
for i in range(25):
    a=i/24
    if a<.5: t=a/.5;x=-W;z=t*H*.62
    else: t=(a-.5)/.5;ang=math.pi*(1-t);x=W*math.cos(ang);z=H*.62+(H*.38)*math.sin(ang)**.8
    pts.append((x,z))
verts=[bm.verts.new((x,1.25,base+1.15+z)) for x,z in pts]+[bm.verts.new((-x,1.25,base+1.15+z)) for x,z in reversed(pts[:12])]
me=bpy.data.meshes.new('encosto');f=bm.faces.new(verts[:len(pts)]+[bm.verts.new((W,1.25,base+1.15))]) if False else None
bm.free()
# encosto: lâmina alta com ponta em arco (prisma com bevel) + molduras
back=box(3.5,.5,6.2,(0,1.25,base+1.15+3.1),marble,.12)
box(3.7,.6,.25,(0,1.22,base+1.15+6.25),gold,.05)
for x in (-1.85,1.85): box(.3,.65,6.4,(x,1.22,base+1.15+3.2),gold,.05)
for i,x in enumerate((-1.85,-0.95,0,0.95,1.85)):
    h=1.6 if x==0 else (1.1 if abs(x)<1.5 else .9)
    bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=.28 if x==0 else .2,depth=h,location=(x,1.22,base+1.15+6.4+h/2));o=bpy.context.object;o.data.materials.append(gold);tparts.append(o)
# relevo do encosto: moldura dourada e estrela de oito pontas
for (sx_,sz_,lx,lz) in [(2.7,.1,0,base+1.15+5.7),(2.7,.1,0,base+1.15+1.0),(.1,4.8,-1.3,base+1.15+3.35),(.1,4.8,1.3,base+1.15+3.35)]:
    box(sx_,.08,sz_,(lx,0.98,lz),gold,.02)
for k in range(4):
    o=box(.18,.06,2.1,(0,0.95,base+1.15+4.3),gold,.02); o.rotation_euler=(0,k*math.pi/4,0); o.select_set(True)
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o; bpy.ops.object.transform_apply(rotation=True)
bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.32,depth=.08,location=(0,0.92,base+1.15+4.3),rotation=(math.pi/2,0,0));o=bpy.context.object;o.data.materials.append(glow);tparts.append(o)
# sol de raios atrás do encosto
bpy.ops.mesh.primitive_torus_add(major_radius=2.6,minor_radius=.09,location=(0,1.6,base+1.15+4.6),rotation=(math.pi/2,0,0));o=bpy.context.object;o.data.materials.append(glow);tparts.append(o)
bpy.ops.mesh.primitive_torus_add(major_radius=3.1,minor_radius=.05,location=(0,1.62,base+1.15+4.6),rotation=(math.pi/2,0,0));o=bpy.context.object;o.data.materials.append(gold);tparts.append(o)
for i in range(24):
    a=i/24*math.pi*2;L=.9 if i%2 else 1.5
    bpy.ops.mesh.primitive_cone_add(vertices=4,radius1=.1,depth=L,location=(math.cos(a)*(3.2+L/2),1.64,base+1.15+4.6+math.sin(a)*(3.2+L/2)),rotation=(0,-a+math.pi/2,0))
    o=bpy.context.object;o.rotation_euler=(math.pi/2,0,0);o.rotation_euler.rotate_axis('Y',-a+math.pi/2)
    # orienta o raio para fora (cone aponta em +Z local)
    o.rotation_euler=(0,0,0);o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(Vector((math.cos(a),0,math.sin(a))))
    o.data.materials.append(gold);tparts.append(o)
throne=join(tparts,'Trono');bpy.ops.object.shade_flat()

# ---------------- FIGURA DE LUZ (sentada): morador existente posado e congelado ----------------
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'Npc-lod.glb'))
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
for o in list(bpy.data.objects):
    if o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
body=[o for o in bpy.data.objects if o.type=='MESH' and o.parent==arm][0]
root=arm
while root.parent: root=root.parent
S=2.9; root.scale=(root.scale[0]*S,root.scale[1]*S,root.scale[2]*S)
if arm.animation_data: arm.animation_data.action=None
for pb in arm.pose.bones: pb.rotation_mode='QUATERNION'; pb.rotation_quaternion=(1,0,0,0); pb.location=(0,0,0)
bpy.context.view_layer.update()
M=arm.matrix_world; Mi=M.inverted(); P=lambda n: arm.pose.bones[n]
def wpos(n): bpy.context.view_layer.update(); return M@P(n).head
def aim(n,child,target):
    p0=wpos(n);p1=wpos(child);q=(p1-p0).normalized().rotation_difference((target-p0).normalized())
    pb=P(n);mw=M@pb.matrix;R=Matrix.Translation(p0)@q.to_matrix().to_4x4()@Matrix.Translation(-p0);pb.matrix=Mi@(R@mw);bpy.context.view_layer.update()
def rotw(n,axis,ang):
    pb=P(n);p0=wpos(n);mw=M@pb.matrix;R=Matrix.Translation(p0)@Matrix.Rotation(ang,4,axis)@Matrix.Translation(-p0);pb.matrix=Mi@(R@mw);bpy.context.view_layer.update()
# frente do morador: descobre pelo pé
fwd=(wpos('LeftToes')-wpos('LeftFoot'));fwd.z=0;fwd.normalize()
print('frente do morador',fwd)
# vira para -Y (frente do trono)
ang=fwd.to_2d().angle_signed(Vector((0,-1)))
root.rotation_euler.z+=ang;bpy.context.view_layer.update()
seatZ=base+1.25; seatFront=-1.1
hips=wpos('Hips')
root.location+= Vector((0,-0.15,0))-Vector((hips.x,hips.y,0))+Vector((0,0,seatZ+0.35-hips.z));bpy.context.view_layer.update()
for side,sx in (('Left',1),('Right',-1)):
    hl=wpos(side+'UpperLeg'); knee=Vector((hl.x+sx*.12,seatFront-0.1,seatZ+0.25)); foot=Vector((knee.x,knee.y-0.15,base+0.25))
    aim(side+'UpperLeg',side+'LowerLeg',knee); aim(side+'LowerLeg',side+'Foot',foot)
    sh=wpos(side+'UpperArm'); elbow=Vector((sx*1.45,0.2,seatZ+0.95)); hand=Vector((sx*1.6,-0.8,seatZ+0.62))
    # o lado do morador pode estar espelhado: usa o x real do ombro
    if (sh.x>0)!=(sx>0): elbow.x*=-1; hand.x*=-1
    aim(side+'UpperArm',side+'LowerArm',elbow); aim(side+'LowerArm',side+'Hand',hand)
rotw('Neck',Vector((1,0,0)),0.12)
# congela a pose na malha e remove o esqueleto
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
for md in list(body.modifiers):
    if md.type=='ARMATURE': bpy.ops.object.modifier_apply(modifier=md.name)
mw=body.matrix_world.copy();body.parent=None;body.matrix_world=mw
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
for o in list(bpy.data.objects):
    if o.type in ('ARMATURE','EMPTY'): bpy.data.objects.remove(o)
luz=body;luz.name='FiguraDeLuz'
d=luz.modifiers.new('d','DECIMATE');d.ratio=.45;apply_all(luz);bpy.ops.object.shade_smooth()
luz.data.materials.clear();luz.data.materials.append(mat('Luz',(1,.97,.9),0,.4,(1,.93,.75),8))
for o in (wl,wr,throne,luz): print('TRIS',o.name,sum(len(p.vertices)-2 for p in o.data.polygons))
# exporta cada conjunto separado
def export(objs,path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_animations=False,export_apply=True)
import os
export([wl,wr],os.path.join(OUT,'Asas.glb'));export([throne],os.path.join(OUT,'TronoCeleste.glb'));export([luz],os.path.join(OUT,'FiguraDeLuz.glb'))
print('OK')
