"""Author sword choreography on the ORIGINAL hero. Blender 5.x, no retarget donor.
Analytic two-bone IK keeps both feet planted; wrists follow authored blade paths.
Bake to original glTF joint frames (Blender's imported bone axes differ).
Output contains only the original skeleton + five clips, never replaces the hero.
Run: blender -b -t 2 --python tools/blender/mod231_sword_rites.py
"""
import bpy, json, struct, math, os, copy
from mathutils import Vector, Quaternion, Matrix
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ROOT+'/Protagonista.glb')
arm=next(o for o in bpy.data.objects if o.type=='ARMATURE')
idle=next(a for a in bpy.data.actions if a.name.startswith('Idle'))
arm.animation_data.action=idle
if hasattr(arm.animation_data,'action_slot') and idle.slots: arm.animation_data.action_slot=idle.slots[0]
# Imported NLA strips must not double-evaluate the reference action.
for tr in arm.animation_data.nla_tracks: tr.mute=True
bpy.context.scene.frame_set(0);bpy.context.view_layer.update()
B={b.name.replace('mixamorig','').replace(':',''):b for b in arm.pose.bones}
ref={n:b.matrix_basis.copy() for n,b in B.items()}
W=lambda b: arm.matrix_world @ b.matrix
P=lambda n: W(B[n]).translation.copy()
Q=lambda n: W(B[n]).to_quaternion()
p0={n:P(n) for n in B};q0={n:Q(n) for n in B}
arm.animation_data_clear()
up=Vector((0,0,1));fwd=Vector((0,1,0));C=Quaternion((1,0,0),-math.pi/2)
def worldq(n,q):
 b=B[n];m=W(b);loc,_,scale=m.decompose();b.matrix=arm.matrix_world.inverted() @ Matrix.LocRotScale(loc,q,scale);bpy.context.view_layer.update()
def turn(n,axis,a): worldq(n,Quaternion(axis,a)@Q(n))
def aim(n,child,target):
 v=P(child)-P(n);d=Vector(target)-P(n)
 if v.length>1e-6 and d.length>1e-6:worldq(n,v.rotation_difference(d)@Q(n))
def ik(a,b,c,target,pole):
 target=Vector(target);p=P(a);l1=(P(b)-p).length;l2=(P(c)-P(b)).length
 d=target-p;length=min(l1+l2-.001,max(.01,d.length));d.normalize()
 side=Vector(pole)-p;side-=d*side.dot(d)
 if side.length<.001:side=Vector((1,0,0))
 side.normalize();along=(l1*l1-l2*l2+length*length)/(2*length)
 elbow=p+d*along+side*math.sqrt(max(0,l1*l1-along*along))
 aim(a,b,elbow);aim(b,c,target)
def pose(v):
 # x = hero's left, y = backwards, z = height, in metres.
 yaw,lean,dip,hx,hy,hz,dx,dy,dz=v
 for n,b in B.items():b.matrix_basis=ref[n].copy()
 bpy.context.view_layer.update()
 m=W(B['Hips']);m.translation+=Vector((0,0,-dip));B['Hips'].matrix=arm.matrix_world.inverted()@m;bpy.context.view_layer.update()
 turn('Hips',up,yaw*.38);turn('Spine',up,yaw*.22);turn('Spine1',up,yaw*.2);turn('Spine2',up,yaw*.2)
 turn('Spine',Vector((1,0,0)),lean*.4);turn('Spine2',Vector((1,0,0)),lean*.6)
 turn('Head',up,-yaw*.5)
 for side in ['Left','Right']:
  foot=p0[side+'Foot'];ik(side+'UpLeg',side+'Leg',side+'Foot',foot,foot+Vector((0,-2,.5)))
  worldq(side+'Foot',q0[side+'Foot']);worldq(side+'ToeBase',q0[side+'ToeBase'])
 hand=Vector((hx,hy,hz));ik('RightArm','RightForeArm','RightHand',hand,(-1.15,.15,1.2))
 # Original mounted blade direction in the Blender world is hand local +Y
 # in the glTF frame. Calibrate against original GLB quaternion below.
 current=Q('RightHand');axis=current @ hand_axis
 want=Vector((dx,dy,dz)).normalized();worldq('RightHand',axis.rotation_difference(want)@current)
 # Off hand counterbalances rotation; fingers retain original grip and anatomy.
 left=Vector((.30+.13*math.sin(yaw),-.24,1.20+dip*.3))
 ik('LeftArm','LeftForeArm','LeftHand',left,(.9,.1,1.25))
 # Close the sword grip modestly (not a clenched, intersecting fist).
 for n in B:
  if n.startswith('RightHand') and any(k in n for k in ['Index','Middle','Ring','Pinky']) and n[-1:] in ['1','2','3']:
   turn(n,Q(n)@Vector((1,0,0)),.32 if n.endswith('1') else .5)
# Read the original glTF nodes and first Idle samples, including every parent.
raw=open(ROOT+'/Protagonista.glb','rb').read();jl=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+jl]);binary=raw[28+jl:]
def values(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];count={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']]
 return struct.unpack_from('<'+'f'*count,binary,v.get('byteOffset',0)+a.get('byteOffset',0))
nodes=copy.deepcopy(g['nodes']);parents={c:i for i,n in enumerate(nodes) for c in n.get('children',[])}
for ch in next(a for a in g['animations'] if a['name']=='Idle')['channels']:
 s=next(a for a in g['animations'] if a['name']=='Idle')['samplers'][ch['sampler']]
 nodes[ch['target']['node']][ch['target']['path']]=list(values(s['output']))
world={}
for i,n in enumerate(nodes):
 q=n.get('rotation',[0,0,0,1]);m=Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])),Quaternion((q[3],*q[:3])),Vector(n.get('scale',[1,1,1])))
 world[i]=(world[parents[i]]@m) if i in parents else m
idx={n['name'].replace('mixamorig',''):i for i,n in enumerate(nodes) if n.get('name','').startswith('mixamorig')}
# SwordRoot rotates PI around Z; the measured blade tip is -Y, hence +Y in hand frame.
orig_axis=world[idx['RightHand']].to_quaternion()@Vector((0,1,0))
hand_axis=q0['RightHand'].inverted()@(C.inverted()@orig_axis)
# Poses: guard, anticipation, contact, follow-through, recovery. Blade directions
# cross the forward half-space, with distinct horizontal/reverse/rising planes.
G=(0,.02,.025,-.27,-.39,1.26,-.40,-.8,.48)
A=(-.65,-.10,.08,-.52,-.10,1.36,-.90,.22,.30)
H=(.24,.10,.10,-.16,-.55,1.20,.20,-1,.08)
HF=(.78,.14,.07,.26,-.36,1.12,.98,-.12,-.05)
R=(.65,-.08,.07,.18,-.27,1.58,.70,-.22,.70)
D=(-.18,.10,.1,-.18,-.53,1.27,-.25,-1,-.18)
DF=(-.72,.17,.08,-.52,-.20,.91,-.80,-.20,-.42)
L=(-.62,.14,.13,-.43,-.18,.89,-.65,-.50,-.50)
U=(.1,-.1,.07,-.13,-.56,1.40,.15,-1,.75)
UF=(.58,-.14,.02,.15,-.26,1.72,.62,-.18,.90)
CROUCH=(-.4,.27,.16,-.30,-.22,1.0,-.90,.2,.05)
PASS=(.2,.28,.13,-.35,-.31,1.0,-.30,-1,.02)
FIN=(.55,.06,.04,.12,-.42,1.38,.7,-.4,.65)
clips={
 'Rite_Crescent':[(0,G),(.14,A),(.23,A),(.31,H),(.39,HF),(.55,HF),(.72,G)],
 'Rite_Reverse':[(0,G),(.13,R),(.20,R),(.29,D),(.39,DF),(.53,DF),(.70,G)],
 'Rite_Ascendant':[(0,G),(.17,L),(.25,L),(.35,U),(.44,UF),(.65,UF),(.86,G)],
 'Rite_Judgment':[(0,G),(.22,CROUCH),(.3,CROUCH),(.46,PASS),(.65,PASS),(.96,FIN),(1.15,FIN),(1.42,G)],
 'Rite_Eclipse':[(0,G),(.22,A),(.32,A),(.40,H),(.49,HF),(.64,R),(.74,R),(.82,D),(.91,DF),(1.06,L),(1.16,L),(1.24,U),(1.33,UF),(1.49,R),(1.60,R),(1.70,D),(1.80,DF),(2.03,DF),(2.30,G)]}
# New GLB reuses *original* glTF nodes/rest transforms and exact binding names.
outnodes=copy.deepcopy(g['nodes'])
for n in outnodes:n.pop('mesh',None);n.pop('skin',None)
out={'asset':{'version':'2.0','generator':'Mod231 original sword choreography / Blender '+bpy.app.version_string},'scene':0,'scenes':g['scenes'],'nodes':outnodes,'buffers':[{'byteLength':0}],'bufferViews':[],'accessors':[],'animations':[]}
data=bytearray()
def accessor(v,typ):
 while len(data)%4:data.append(0)
 off=len(data);data.extend(struct.pack('<'+'f'*len(v),*v));view=len(out['bufferViews']);out['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(v)*4})
 a={'bufferView':view,'componentType':5126,'count':len(v)//{'SCALAR':1,'VEC3':3,'VEC4':4}[typ],'type':typ}
 if typ=='SCALAR':a.update(min=[min(v)],max=[max(v)])
 out['accessors'].append(a);return len(out['accessors'])-1
for name,keys in clips.items():
 dur=keys[-1][0];N=round(dur*120);times=[i*dur/N for i in range(N+1)];rot={n:[] for n in B};hip=[]
 for t in times:
  k=next((i for i in range(len(keys)-1) if t<=keys[i+1][0]),len(keys)-2);t0,a=keys[k];t1,b=keys[k+1];u=max(0,min(1,(t-t0)/(t1-t0)));u=u*u*(3-2*u)
  pose([a[i]+(b[i]-a[i])*u for i in range(len(a))]);desired={}
  for n in B:
   i=idx[n];desired[i]=(C@Q(n))@(C@q0[n]).inverted()@world[i].to_quaternion()
  for n in B:
   i=idx[n];parent=parents[i];parq=desired.get(parent,world[parent].to_quaternion());q=parq.inverted()@desired[i];q.normalize()
   last=rot[n][-4:]
   if last and sum(x*y for x,y in zip(last,[q.x,q.y,q.z,q.w]))<0:q.negate()
   rot[n].extend([q.x,q.y,q.z,q.w])
  wh=world[idx['Hips']].translation+(C@(P('Hips')-p0['Hips']));hp=world[parents[idx['Hips']]].inverted()@wh;hip.extend(hp)
 ti=accessor(times,'SCALAR');anim={'name':name,'samplers':[],'channels':[]}
 for n,vs in rot.items():
  ai=accessor(vs,'VEC4');anim['channels'].append({'sampler':len(anim['samplers']),'target':{'node':idx[n],'path':'rotation'}});anim['samplers'].append({'input':ti,'output':ai,'interpolation':'LINEAR'})
 ai=accessor(hip,'VEC3');anim['channels'].append({'sampler':len(anim['samplers']),'target':{'node':idx['Hips'],'path':'translation'}});anim['samplers'].append({'input':ti,'output':ai,'interpolation':'LINEAR'});out['animations'].append(anim)
 print('BAKED',name,dur,N+1,'samples',len(anim['channels']),'channels',flush=True)
out['buffers'][0]['byteLength']=len(data);jb=json.dumps(out,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4);data+=b'\0'*((-len(data))%4)
with open(ROOT+'/Protagonista-ritos-231.glb','wb') as f:f.write(struct.pack('<III',0x46546c67,2,28+len(jb)+len(data))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(data),0x004e4942)+data)
print('OUTPUT',len(data),'bytes',flush=True)
