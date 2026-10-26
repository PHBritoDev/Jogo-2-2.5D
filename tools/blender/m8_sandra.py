# MOD 213 — Sandra: cabelo em camadas, franja lateral e corset ornamental.
# Marco 8: Sandra refeita a partir da referência do autor (gótica: cabelo vermelho longo, olhos vermelhos com
# pupila em cruz, coroa de espinhos, corset preto com ornamentos de prata, saia/capa vermelho-escura com fenda, meias
# pretas, botas e garras de prata, brincos em cruz e a arma "cruz demoníaca").
#
# Corpo: malha-base do MakeHuman (MPFB2, licença CC0) com alvos femininos, pesos do rig "mixamo" do próprio MPFB2.
# A malha é ajustada (pose + comprimento de cada osso) ao esqueleto da Misteriosa (Misteriosa-rig.glb), então a Sandra
# usa as mesmas animações sem retarget.
# Dados do MPFB2: git clone --filter=blob:none --sparse https://github.com/makehumancommunity/mpfb2 e defina MPFB_DATA
# como src/mpfb/data. Versão validada: 6ff1eb358f6c1959ced77e79e6dd2406d9a71f49.
# Uso: MPFB_DATA=/caminho/mpfb2/src/mpfb/data blender -b --python tools/blender/m8_sandra.py -- Sandra-rig.glb
import bpy, bmesh, gzip, json, os, sys, math, random
import numpy as np
from mathutils import Vector, Matrix, noise
OUT = sys.argv[-1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MP = os.environ.get('MPFB_DATA')
if not MP or not os.path.isfile(os.path.join(MP, '3dobjs', 'base.obj')):
    raise RuntimeError('Defina MPFB_DATA para src/mpfb/data de um checkout do MPFB2.')
random.seed(11)

# ---------- 1) malha-base + alvos ----------
V, F, grp = [], [], None
for line in open(MP + '/3dobjs/base.obj'):
    if line.startswith('v '): V.append([float(t) for t in line.split()[1:4]])
    elif line.startswith('g '): grp = line.split()[1]
    elif line.startswith('f '): F.append((grp, [int(t.split('/')[0]) - 1 for t in line.split()[1:]]))
V = np.array(V)
def target(rel, w):
    with gzip.open(MP + '/targets/' + rel + '.target.gz', 'rt') as f:
        for l in f:
            if l[0] == '#' or not l.strip(): continue
            p = l.split(); V[int(p[0])] += w * np.array([float(t) for t in p[1:4]])
TARGETS = [('macrodetails/universal-female-young-averagemuscle-minweight', .35), ('macrodetails/proportions/female-young-averagemuscle-averageweight-idealproportions', 1),
           ('macrodetails/height/female-young-averagemuscle-averageweight-maxheight', .5), ('breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness', .45),
           ('torso/measure-waist-circ-decr', .6), ('stomach/stomach-pregnant-decr', .3), ('head/head-oval', 1.0), ('chin/chin-triangle', .35), ('chin/chin-width-decr', .45),
           ('nose/nose-scale-horiz-decr', .5), ('nose/nose-scale-vert-decr', .3), ('nose/nose-scale-depth-decr', .4), ('nose/nose-point-width-decr', .5),
           ('mouth/mouth-scale-horiz-decr', .35), ('mouth/mouth-upperlip-volume-incr', .4), ('mouth/mouth-lowerlip-volume-incr', .5), ('neck/neck-scale-horiz-decr', .4),
           ('eyes/r-eye-scale-incr', .45), ('eyes/l-eye-scale-incr', .45), ('head/head-scale-horiz-decr', .2), ('head/head-age-decr', .5), ('nose/nose-flaring-decr', .4), ('nose/nose-nostrils-width-decr', .4), ('nose/nose-volume-decr', .5), ('cheek/l-cheek-volume-decr', .2), ('cheek/r-cheek-volume-decr', .2), ('forehead/forehead-temple-decr', .4), ('eyes/r-eye-height2-incr', .25), ('eyes/l-eye-height2-incr', .25),
           ('eyes/r-eye-corner1-up', .4), ('eyes/l-eye-corner1-up', .4), ('cheek/r-cheek-bones-incr', .3), ('cheek/l-cheek-bones-incr', .3)]
for rel, w in TARGETS:
    if os.path.exists(MP + '/targets/' + rel + '.target.gz'): target(rel, w)
    else: print('alvo ausente:', rel)
B = np.stack([V[:, 0], -V[:, 2], V[:, 1]], 1) * .1              # OBJ (y para cima, dm) → Blender (z para cima, m)
groups = {}
for g, f in F: groups.setdefault(g, set()).update(f)
def gmean(g): return B[sorted(groups[g])].mean(0)

# ---------- 2) esqueleto da Misteriosa (alvo) ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'Misteriosa-rig.glb'))
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
for o in list(bpy.data.objects):
    if o.type == 'MESH': bpy.data.objects.remove(o)
AW = arm.matrix_world
TH = {b.name: np.array(AW @ b.head_local) for b in arm.data.bones}
TT = {b.name: np.array(AW @ b.tail_local) for b in arm.data.bones}

# ---------- 3) rig mixamo do MPFB2 sobre a malha ----------
RIG = json.load(open(MP + '/rigs/standard/rig.mixamo.json'))['bones']
WTS = json.load(open(MP + '/rigs/standard/weights.mixamo.json'))['weights']
def jpos(spec):
    if spec.get('strategy') == 'CUBE' and spec.get('cube_name') in groups: return gmean(spec['cube_name'])
    if spec.get('vertex_indices'): return B[spec['vertex_indices']].mean(0)
    return np.array(spec['default_position'])
MH = {n: (jpos(b['head']), jpos(b['tail'])) for n, b in RIG.items()}
# Altura: a malha inteira passa a ter a altura do esqueleto alvo (topo da cabeça).
body_idx = np.array(sorted(groups['body']))
z0, z1 = B[body_idx, 2].min(), B[body_idx, 2].max()
top = TH['mixamorig:HeadTop_End'][2]
k = top / (z1 - z0); B = (B - np.array([0, 0, z0])) * k
MH = {n: ((h - np.array([0, 0, z0])) * k, (t - np.array([0, 0, z0])) * k) for n, (h, t) in MH.items()}
M = 'mixamorig:'
MAP = {'Hips': 'Hips', 'Spine': 'Spine', 'Spine1': 'Chest', 'Spine2': 'UpperChest', 'Neck': 'Neck', 'Head': 'Head'}
for s in ('Left', 'Right'):
    MAP.update({s + 'Shoulder': s + 'Shoulder', s + 'Arm': s + 'UpperArm', s + 'ForeArm': s + 'LowerArm', s + 'Hand': s + 'Hand',
                s + 'UpLeg': s + 'UpperLeg', s + 'Leg': s + 'LowerLeg', s + 'Foot': s + 'Foot', s + 'ToeBase': s + 'Toes'})
    for fm, ft in (('Thumb', 'Thumb'), ('Index', 'Index'), ('Middle', 'Middle'), ('Ring', 'Ring'), ('Pinky', 'Little')):
        for i in (1, 2, 3): MAP[s + 'Hand' + fm + str(i)] = s + 'Hand'          # mãos rígidas (garras), dedos no osso da mão
def tdir(t):
    if t == 'Head': return TH['mixamorig:HeadTop_End'] - TH['Head']
    if t.endswith('Hand'): return TH[t.replace('Hand', 'MiddleProximal')] - TH[t]
    if t.endswith('Foot'): return TH[t.replace('Foot', 'Toes')] - TH[t]
    return TT[t] - TH[t]
def rot_between(a, b):
    a = a / np.linalg.norm(a); b = b / np.linalg.norm(b); v = np.cross(a, b); c = float(np.dot(a, b))
    if np.linalg.norm(v) < 1e-8: return np.eye(3)
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx * (1 / (1 + c))
# O esqueleto ganha as proporções do corpo (juntas nas posições do MakeHuman), mas cada osso mantém a orientação de
# repouso da Misteriosa — assim as rotações das animações continuam valendo. Braços, pernas, mãos e pés giram até a
# direção dos ossos da Misteriosa; tronco, ombros e cabeça ficam como estão.
LIMBS = [('Arm', 'UpperArm'), ('ForeArm', 'LowerArm'), ('Hand', 'Hand'), ('UpLeg', 'UpperLeg'), ('Leg', 'LowerLeg'), ('Foot', 'Foot'), ('ToeBase', 'Toes')]
NH, XF = {}, {}
for mx, t in (('Hips', 'Hips'), ('Spine', 'Spine'), ('Spine1', 'Chest'), ('Spine2', 'UpperChest'), ('Neck', 'Neck'), ('Head', 'Head'), ('LeftShoulder', 'LeftShoulder'), ('RightShoulder', 'RightShoulder')):
    NH[t] = MH[M + mx][0]; XF[mx] = (MH[M + mx][0], np.eye(3), MH[M + mx][0])
for s in ('Left', 'Right'):
    for chain in (LIMBS[:3], LIMBS[3:]):
        h = MH[M + s + chain[0][0]][0]
        for mx, t in chain:
            h0, t0 = MH[M + s + mx]; d1 = tdir(s + t)
            if mx == 'Foot': off = h - h0                                                 # pé plano, como no MakeHuman
            if mx in ('Foot', 'ToeBase'): NH[s + t] = h0 + off; XF[s + mx] = (h0, np.eye(3), h0 + off); continue
            NH[s + t] = h; XF[s + mx] = (h0, rot_between(t0 - h0, d1), h)
            h = h + d1 / np.linalg.norm(d1) * np.linalg.norm(t0 - h0)
LEN = {s + t: float(np.linalg.norm(MH[M + s + mx][1] - MH[M + s + mx][0])) for s in ('Left', 'Right') for mx, t in LIMBS}
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
AWi = AW.inverted(); eb = arm.data.edit_bones
old = {b.name: (AW @ b.head, AW @ b.tail, b.parent.name if b.parent else None) for b in eb}
def moved(n):
    while n and n not in NH: n = old[n][2]
    return Vector(NH[n]) - old[n][0] if n else Vector()
for b in eb: b.use_connect = False
for b in eb:
    h, t, _ = old[b.name]; u = (t - h).normalized()
    if b.name in NH: nh = Vector(NH[b.name]); b.head = AWi @ nh; b.tail = AWi @ (nh + u * LEN.get(b.name, (t - h).length))
    else: d = moved(b.name); b.head = AWi @ (h + d); b.tail = AWi @ (t + d)
bpy.ops.object.mode_set(mode='OBJECT')
# Pesos por vértice (nomes da Misteriosa) e a deformação ponderada (LBS).
W = {}
for bn, lst in WTS.items():
    mx = bn.replace(M, '')
    if mx not in MAP: continue
    for vi, w in lst: W.setdefault(vi, {}); W[vi][mx] = W[vi].get(mx, 0) + w
B2 = B.copy()
for vi, ws in W.items():
    acc = np.zeros(3); tot = 0
    for mx, w in ws.items():
        key = mx if mx in XF else next(k2 for k2 in XF if mx.startswith(k2))   # dedos → mão
        h0, A, h1 = XF[key]; acc += w * (h1 + A @ (B[vi] - h0)); tot += w
    if tot > 0: B2[vi] = acc / tot
TW = {}
for vi, ws in W.items():
    d = {}
    for mx, w in ws.items(): d[MAP[mx]] = d.get(MAP[mx], 0) + w
    total = sum(d.values())
    TW[vi] = {n: w / total for n, w in d.items()} if total else {'Head': 1.}

# ---------- 4) malhas ----------
def build(name, faces_groups):
    used = sorted({i for g, f in F if g in faces_groups for i in f}); remap = {o: n for n, o in enumerate(used)}
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(B2[i]) for i in used], [], [[remap[i] for i in f] for g, f in F if g in faces_groups]); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    for n in set(MAP.values()): o.vertex_groups.new(name=n)
    for o_i, n_i in remap.items():
        for bn, w in TW.get(o_i, {}).items(): o.vertex_groups[bn].add([n_i], w, 'REPLACE')
    return o
body = build('Sandra', {'body'})
# Retenha a superfície ponderada original: cortes BMesh podem interpolar grupos
# incompletos e produzir descontinuidades nos ombros e nas bordas da roupa.
from mathutils.bvhtree import BVHTree
body.data.calc_loop_triangles()
source_vertices = [v.co.copy() for v in body.data.vertices]
source_triangles = [tuple(t.vertices) for t in body.data.loop_triangles]
source_weights = [{body.vertex_groups[g.group].name:g.weight for g in v.groups} for v in body.data.vertices]
source_surface = BVHTree.FromPolygons(source_vertices, source_triangles, all_triangles=True)
def surface_weights(point):
    q, _, face, _ = source_surface.find_nearest(point)
    ids = source_triangles[face]; a,b,c = [source_vertices[i] for i in ids]
    ab,ac,aq = b-a,c-a,q-a
    d00,d01,d11,d20,d21 = ab.dot(ab),ab.dot(ac),ac.dot(ac),aq.dot(ab),aq.dot(ac)
    det = d00*d11-d01*d01
    if abs(det)<1e-15: return source_weights[ids[0]]
    v=(d11*d20-d01*d21)/det; w=(d00*d21-d01*d20)/det
    result={}
    for i,t in zip(ids,(1-v-w,v,w)):
        for n,weight in source_weights[i].items(): result[n]=result.get(n,0)+max(0,t)*weight
    total=sum(result.values())
    return {n:w/total for n,w in result.items() if w>1e-8}

# Cortes retos nas bordas da roupa (topo do corset, cava do collant, luvas e meias): os vértices novos herdam os pesos.
def bisect(o, co, no):
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no)
    bm.to_mesh(o.data); bm.free()
CORSET = (Vector((0, 0, 1.306)), Vector((0, .03, 1)).normalized())
LEGCUT = {}
for sx in (-1, 1):
    A, Bp, C = Vector((0, -.11, .785)), Vector((sx * .175, 0, .95)), Vector((0, .10, .80))
    n = (Bp - A).cross(C - A).normalized()
    if (Vector((0, 0, 1.0)) - A).dot(n) < 0: n = -n
    LEGCUT[sx] = (A, n)
GLOVE = {sx: (P0 + (P1 - P0) * .45, (P1 - P0).normalized()) for sx, P0, P1 in ((1, Vector(NH['LeftUpperArm']), Vector(NH['LeftLowerArm'])), (-1, Vector(NH['RightUpperArm']), Vector(NH['RightLowerArm'])))}
WRIST = {sx: (P1 + (P0 - P1) * .12, (P1 - P0).normalized()) for sx, P0, P1 in ((1, Vector(NH['LeftLowerArm']), Vector(NH['LeftHand'])), (-1, Vector(NH['RightLowerArm']), Vector(NH['RightHand'])))}
for co, no in [CORSET, (Vector((0, 0, .62)), Vector((0, 0, 1))), *LEGCUT.values(), *GLOVE.values()]: bisect(body, co, no)
for v in body.data.vertices:
    for group in list(v.groups): body.vertex_groups[group.group].remove([v.index])
    for name,weight in surface_weights(v.co).items(): body.vertex_groups[name].add([v.index],weight,'REPLACE')
body.data.update()
# A mudança de pose da base aproxima superfícies com pesos distintos nas axilas.
# Reamostre um campo espacial contínuo nas juntas, antes de fazer os ornamentos.
from mathutils.kdtree import KDTree
weight_tree=KDTree(len(source_vertices))
for i,co in enumerate(source_vertices): weight_tree.insert(co,i)
weight_tree.balance()
for v in body.data.vertices:
    if not (1.10 < v.co.z < 1.52 and .04 < abs(v.co.x) < .34): continue
    samples=weight_tree.find_range(v.co,.07)
    weights={}; mass=0.
    for _,index,distance in samples:
        k=math.exp(-.5*(distance/.03)**2); mass+=k
        for n,w in source_weights[index].items():
            if n=='Chest': n='UpperChest'
            weights[n]=weights.get(n,0)+w*k
    if mass:
        def smooth(a,b,x):
            t=max(0,min(1,(x-a)/(b-a))); return t*t*(3-2*t)
        blend=smooth(.04,.1,abs(v.co.x))*smooth(.34,.25,abs(v.co.x))*smooth(1.10,1.20,v.co.z)*smooth(1.52,1.43,v.co.z)
        original=surface_weights(v.co)
        weights={n:weights.get(n,0)/mass*blend+original.get(n,0)*(1-blend) for n in set(weights)|set(original)}
        mass=1.
        for group in list(v.groups): body.vertex_groups[group.group].remove([v.index])
        for n,w in weights.items(): body.vertex_groups[n].add([v.index],w/mass,'REPLACE')

# olhos mais abertos (estilo anime): as pálpebras se afastam do centro do olho e o canto de fora sobe um pouco
for sx, g in ((1, 'helper-l-eye'), (-1, 'helper-r-eye')):
    e = Vector(B2[sorted(groups[g])].mean(0))
    for v in body.data.vertices:
        d = v.co - e
        if d.y > -.004 or abs(d.x) > .024 or abs(d.z) > .018: continue
        r = math.hypot(d.x / .024, d.z / .018)
        if r < 1: v.co.z = e.z + d.z * (1 - .27 * (1-r)**.6) + .0015 * (d.x*sx/.024) * (1-r)
print('corpo:', len(body.data.vertices), 'vértices')

body.name = 'Sandra'
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
BV = [v.co.copy() for v in body.data.vertices]
BW = [{body.vertex_groups[g.group].name: g.weight for g in v.groups} for v in body.data.vertices]
def dom(ws): return max(ws.items(), key=lambda kv: kv[1])[0] if ws else ''
KD = KDTree(len(BV))
for i, c in enumerate(BV): KD.insert(c, i)
KD.balance()
BVH = BVHTree.FromPolygons(BV, [p.vertices[:] for p in body.data.polygons])
P = {k: Vector(v) for k, v in NH.items()}
def SG(g):
    p=Vector(B[sorted(groups[g])].mean(0))
    if g.startswith(('joint-l-finger','joint-r-finger')):
        h,A,h1=XF[('Left' if g.startswith('joint-l-') else 'Right')+'Hand']
        return Vector(h1+A@(np.array(p)-h))
    return Vector(B2[sorted(groups[g])].mean(0))

# ---------- 5) materiais ----------
def mat(name, color=(1, 1, 1), metal=0., rough=.5, emit=None, es=0., vc=False, tex=None, etex=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if vc:
        a = nt.nodes.new('ShaderNodeVertexColor'); a.layer_name = 'Col'; nt.links.new(a.outputs['Color'], b.inputs['Base Color'])
    if tex:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = tex
        uvn=nt.nodes.new('ShaderNodeUVMap');uvn.uv_map='UVMap';nt.links.new(uvn.outputs['UV'],t.inputs['Vector'])
        nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = es
    if etex:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = etex
        uvn=nt.nodes.new('ShaderNodeUVMap');uvn.uv_map='UVMap';nt.links.new(uvn.outputs['UV'],t.inputs['Vector'])
        nt.links.new(t.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = es
    return m
def eye_images():
    N = 256; base = np.zeros((N, N, 4)); em = np.zeros((N, N, 4)); base[..., 3] = 1; em[..., 3] = 1
    yy, xx = np.mgrid[0:N, 0:N]; u = (xx + .5) / N - .5; v = (yy + .5) / N - .5; r = np.hypot(u, v); a = np.arctan2(v, u)
    base[..., :3] = (.96, .9, .9)
    IR = .335; iris = r < IR; k = np.clip(r / IR, 0, 1)
    streak = .5 + .5 * np.sin(a * 23 + np.sin(a * 7) * 2)
    col = np.stack([.45 + .5 * (1 - k) + .1 * streak, .02 + .06 * (1 - k), .04 + .05 * (1 - k)], -1)
    col[k > .86] = (.18, .0, .02)                                                              # aro escuro
    star = (np.abs(u) < .011) & (np.abs(v) < .12) | (np.abs(v) < .011) & (np.abs(u) < .12)
    star |= (np.abs(np.abs(u) - np.abs(v)) < .008) & (r < .05)
    col[(v > .12) & (r < IR)] *= .55                                                    # sombra da pálpebra
    for c in range(3): base[..., c] = np.where(iris, col[..., c], base[..., c])
    base[(r < .07) & iris & ~star] = (.12, 0, .02, 1); base[star & iris] = (1, .55, .6, 1)
    hl = np.hypot(u + .1, v - .12) < .045; base[hl] = (1, 1, 1, 1)
    em[..., :3] = 0
    for c in range(3): em[..., c] = np.where(iris, col[..., c] * .9, 0)
    em[(r < .07) & iris & ~star] = (0, 0, 0, 1); em[star & iris] = (1, .35, .4, 1); em[hl] = (.6, .6, .6, 1)
    imgs = []
    for name, arr in (('Sandra_olho', base), ('Sandra_olho_brilho', em)):
        im = bpy.data.images.new(name, N, N); im.pixels = arr.astype(np.float32).ravel(); im.pack(); imgs.append(im)
    return imgs
EYE_B, EYE_E = eye_images()
MAT = {'skin': mat('Pele', rough=.48, vc=True), 'black': mat('Couro', (.03, .025, .03), .15, .32), 'stock': mat('Meia', (.035, .028, .035), .1, .38),
       'boot': mat('Bota', (.04, .035, .04), .55, .3), 'silver': mat('Prata', (.38, .32, .34), .8, .26), 'gem': mat('Gema', (.8, .02, .05), 0, .2, (1, .04, .08), .7),
       'hair': mat('Cabelo', rough=.58, vc=True), 'skirt': mat('Saia', rough=.6, vc=True), 'lash': mat('Cilios', (.02, .01, .015), 0, .6),
       'eye': mat('Olho', rough=.15, tex=EYE_B, etex=EYE_E, es=.65), 'brow': mat('Sobrancelha', (.2, .01, .025), 0, .6)}
MAT['hair'].node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.2
MAT['skin'].node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.3

# Fibres longitudinais na própria malha: sem transparência nem ordenação de cards.
rng=np.random.default_rng(213)
HN=256
hy,hx=np.mgrid[0:HN,0:HN]
fibre=.58+.22*np.sin(hx*.63+np.sin(hy*.016)*.7)+.1*np.sin(hx*2.1+hy*.009)
fibre=np.clip(fibre+rng.normal(0,.025,(HN,HN)),.18,1)
pixels=np.ones((HN,HN,4));pixels[:,:,:3]=fibre[:,:,None]
hair_image=bpy.data.images.new('Sandra_fibras',HN,HN);hair_image.pixels=pixels.astype(np.float32).ravel();hair_image.pack()
nt=MAT['hair'].node_tree;bs=nt.nodes['Principled BSDF']
tex=nt.nodes.new('ShaderNodeTexImage');tex.image=hair_image
uvn=nt.nodes.new('ShaderNodeUVMap');uvn.uv_map='HairUV';nt.links.new(uvn.outputs['UV'],tex.inputs['Vector'])
vc=next(n for n in nt.nodes if n.type=='VERTEX_COLOR')
mul=nt.nodes.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1
nt.links.new(vc.outputs['Color'],mul.inputs[1]);nt.links.new(tex.outputs['Color'],mul.inputs[2]);nt.links.new(mul.outputs[0],bs.inputs['Base Color'])

# Recortes e renda do corset ficam na superfície ponderada do corpo, sem
# peças flutuantes que atravessem a pele durante ataques.
TN=1024
ty,tx=np.mgrid[0:TN,0:TN];xx=(tx/(TN-1)-.5)*.7;zz=.7+ty/(TN-1)*.8
cloth=np.ones((TN,TN,4));cloth[:,:,:3]=(.018,.012,.017)
neckline=1.277+.029*np.sin(np.clip(np.abs(xx)/.115,0,1)*math.pi)
cut=(zz>neckline)&(zz>1.275)&(np.abs(xx)<.19)
side=(np.abs(xx)>.075)&(np.abs(xx)<.165)&(zz>1.00)&(zz<1.24)
lattice=(np.abs(np.sin((zz-1)*90+xx*65))<.20)|(np.abs(np.sin((zz-1)*90-xx*65))<.20)
cut|=side&~lattice
cloth[cut,:3]=tuple(1.055*c**(1/2.4)-.055 for c in (.78,.57,.52))
trim=(np.abs(zz-neckline)<.0015)&(np.abs(xx)<.16)
cloth[trim,:3]=(.20,.13,.15)
cloth_tex=bpy.data.images.new('Sandra_corset',TN,TN);cloth_tex.pixels=cloth.astype(np.float32).ravel();cloth_tex.pack()
nt=MAT['black'].node_tree;tex=nt.nodes.new('ShaderNodeTexImage');tex.image=cloth_tex
uvnode=nt.nodes.new('ShaderNodeUVMap');uvnode.uv_map='OutfitUV';nt.links.new(uvnode.outputs['UV'],tex.inputs['Vector']);nt.links.new(tex.outputs['Color'],nt.nodes['Principled BSDF'].inputs['Base Color'])
uv=body.data.uv_layers.new(name='OutfitUV')
for poly in body.data.polygons:
    for li in poly.loop_indices:
        p=body.data.vertices[body.data.loops[li].vertex_index].co
        uv.data[li].uv=(p.x/.7+.5,(p.z-.7)/.8)

def add_mat(o, key):
    me = o.data
    if MAT[key].name not in [m.name for m in me.materials]: me.materials.append(MAT[key])
    return [m.name for m in me.materials].index(MAT[key].name)
def paint(o, fn):
    me = o.data
    if 'Col' not in me.color_attributes: me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    col = me.color_attributes['Col']
    for poly in me.polygons:
        for li in poly.loop_indices:
            col.data[li].color = (*fn(o.matrix_world @ me.vertices[me.loops[li].vertex_index].co, me.loops[li].vertex_index), 1)
for k in ('skin', 'black', 'stock', 'eye', 'lash'): add_mat(body, k)

# ---------- 6) corpo: roupa pintada por região, rosto ----------
def torso_side(c):
    A, n = LEGCUT[1 if c.x >= 0 else -1]; return (c - A).dot(n) > 0
TORSO = {'Hips', 'Spine', 'Chest', 'UpperChest', 'LeftShoulder', 'RightShoulder'}
def region(c, ws):
    d = dom(ws)
    if d in ('Head', 'Neck'): return 'skin'
    if d in TORSO or d in ('LeftUpperLeg', 'RightUpperLeg') and torso_side(c):
        if (c - CORSET[0]).dot(CORSET[1]) > 0: return 'skin'
        return 'black' if torso_side(c) else ('stock' if c.z < .62 else 'skin')
    if d in ('LeftUpperArm', 'RightUpperArm', 'LeftLowerArm', 'RightLowerArm', 'LeftHand', 'RightHand'):
        co, no = GLOVE[1 if c.x > 0 else -1]
        return 'black' if (c - co).dot(no) > 0 or not d.endswith('UpperArm') else 'skin'
    if d in ('LeftUpperLeg', 'RightUpperLeg', 'LeftLowerLeg', 'RightLowerLeg', 'LeftFoot', 'RightFoot', 'LeftToes', 'RightToes'):
        return 'stock' if c.z < .62 else 'skin'
    return 'skin'
mi = {k: [m.name for m in body.data.materials].index(MAT[k].name) for k in ('skin', 'black', 'stock')}
for poly in body.data.polygons:
    ws = {}
    for vi in poly.vertices:
        for n, w in BW[vi].items(): ws[n] = ws.get(n, 0) + w
    poly.material_index = mi[region(poly.center, ws)]; poly.use_smooth = True
EYEL, EYER = SG('helper-l-eye'), SG('helper-r-eye'); ER = float(np.linalg.norm(B2[sorted(groups['helper-l-eye'])] - np.array(EYEL), axis=1).mean())
LIP = Vector((0, -.15, 1.508))
def skin_col(p, vi):
    c = Vector((.78, .57, .52))
    if p.z > 1.42 and p.y < -.06:
        for e in (EYEL, EYER):                                         # sombra e delineado vermelho-escuro
            d = Vector(((p.x - e.x) / 1.15, 0, (p.z - e.z) * 1.25)).length / ER
            if 1.0 < d < 1.9 and p.y < e.y + .01:
                k = (1 - abs(d - 1.25) / .65) ** 1.5 * (1.25 if p.z > e.z else .6)
                c = c.lerp(Vector((.42, .1, .12)), max(0, min(.7, k)))
        dl = Vector(((p.x - LIP.x) / .017, 0, (p.z - LIP.z) / .0105)).length
        if dl < 1 and p.y < -.136: c = c.lerp(Vector((.40, .10, .12)), min(1, (1 - dl) * 5))
        for sx in (-1, 1):                                             # rubor discreto
            db = Vector((p.x - sx * .047, 0, p.z - 1.535)).length
            if db < .026: c = c.lerp(Vector((.96, .6, .6)), (1 - db / .026) * .55)
    return tuple(c)
paint(body, skin_col)
# olhos (globo novo com íris vermelha e pupila em cruz), cílios e sobrancelhas
def eyeball(cen):
    me = bpy.data.meshes.new('olho'); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=16, radius=ER)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X')); bm.to_mesh(me); bm.free()
    uv = me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        for li in poly.loop_indices:
            p = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (.5 + p.x / (2 * ER), .5 + p.z / (2 * ER)) if p.y < 0 else (.02, .02)
    for v in me.vertices: v.co += cen
    o = bpy.data.objects.new('Olho', me); bpy.context.scene.collection.objects.link(o); me.materials.append(MAT['eye'])
    for p in me.polygons: p.use_smooth = True
    return o
EXTRA = [eyeball(EYEL), eyeball(EYER)]
def ribbon(pts, w0, w1, th, mat_key, name, normals=None, colors=None, sides=6):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); rings = []; n = len(pts)
    for i, p in enumerate(pts):
        d = (pts[min(n - 1, i + 1)] - pts[max(0, i - 1)]).normalized()
        out = normals[i] if normals else Vector((0, 0, 1))
        side = d.cross(out).normalized(); out = side.cross(d).normalized(); t = i / (n - 1); w = w0 + (w1 - w0) * t
        rings.append([bm.verts.new(p + side * math.cos(a) * w * .5 + out * math.sin(a) * th * .5) for a in [k / sides * 2 * math.pi for k in range(sides)]])
    for i in range(n - 1):
        for k in range(sides): bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
    bm.faces.new(rings[-1][::-1]); bm.faces.new(rings[0])
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    me.materials.append(MAT[mat_key])
    if mat_key=='hair':
        uv=me.uv_layers.new(name='HairUV')
        for poly in me.polygons:
            for li in poly.loop_indices:
                vi=me.loops[li].vertex_index
                uv.data[li].uv=((vi%sides)/sides,(vi//sides)/max(1,n-1))
    for f in me.polygons: f.use_smooth = True
    if colors: paint(o, lambda p, vi: colors(vi // sides / max(1, n - 1)))
    return o
def on_face(x, z, off=.0015):
    hit = BVH.ray_cast(Vector((x, -.4, z)), Vector((0, 1, 0)))
    return (hit[0] + hit[1] * off, hit[1]) if hit[0] else (Vector((x, -.14, z)), Vector((0, -1, 0)))
for sx in (-1, 1):
    pts, nrm = [], []
    for i in range(9):
        t = i / 8; x = sx * (.013 + .044 * t); z = EYEL.z + .016 + .004 * math.sin(t * math.pi) + .002 * t
        p, n = on_face(x, z); pts.append(p); nrm.append(n)
    EXTRA.append(ribbon(pts, .0032, .0012, .001, 'brow', 'Sobrancelha', nrm))
# cílios: linha grossa na pálpebra de cima (com pontas no canto de fora) e fina embaixo, seguindo a abertura do olho
def lid_pt(e, sx, ang, upper):
    a, b = .0165, (.0048 if upper else .0056); x = e.x + sx * math.cos(ang) * a; z = e.z + math.sin(ang) * b + .0022 * max(0, math.cos(ang)) * (1 if upper else .5)
    return on_face(x, z, .0012)
for e, sx in ((EYEL, 1), (EYER, -1)):
    up = [lid_pt(e, sx, math.pi * (.97 - .94 * i / 12), True) for i in range(13)]       # do canto de dentro para fora
    pts = [p for p, n in up]; nrm = [n for p, n in up]
    EXTRA.append(ribbon(pts, .0014, .0026, .0009, 'lash', 'Cilios', nrm))
    tip = pts[-1]; d = (pts[-1] - pts[-3]).normalized()
    for k, (dz, ln) in enumerate(((.25, .01), (.6, .008), (.0, .012), (.45, .009))):
        q = [tip - d * (.0025 * k), tip - d * (.0025 * k) + (d + Vector((0, 0, dz))).normalized() * ln]
        EXTRA.append(ribbon(q, .0016, .0003, .0008, 'lash', 'Cilios', [nrm[-1]] * 2))
    lo = [lid_pt(e, sx, -math.pi * (.15 + .7 * i / 8), False) for i in range(9)]
    EXTRA.append(ribbon([p for p, n in lo], .0003, .0005, .0004, 'lash', 'Cilios', [n for p, n in lo]))

# ---------- 7) cabelo ----------
NRM = [v.normal.copy() for v in body.data.vertices]
HC = Vector((0, -.02, 1.585))
def hair_vert(p):
    if p.z < 1.47: return False
    if p.z > 1.611: return True
    if p.y > -.03 and p.z > 1.50: return True
    if abs(p.x) > .055 and p.y > -.10 and p.z > 1.55: return True
    return False
HEADB = {'Head', 'Neck'}
cap_faces = [poly for poly in body.data.polygons if dom(BW[poly.vertices[0]]) in HEADB and all(hair_vert(BV[i]) for i in poly.vertices)]
used = sorted({i for poly in cap_faces for i in poly.vertices}); rm = {o: n for n, o in enumerate(used)}
def cap_off(p): return .007 + .007 * max(0, min(1, (p.z - 1.6) / .08)) + .004 * (p.y > 0)
me = bpy.data.meshes.new('Cabelo'); me.from_pydata([BV[i] + NRM[i] * cap_off(BV[i]) for i in used], [], [[rm[i] for i in poly.vertices] for poly in cap_faces])
cap = bpy.data.objects.new('CabeloBase', me); bpy.context.scene.collection.objects.link(cap); me.materials.append(MAT['hair'])
for f in me.polygons: f.use_smooth = True
paint(cap, lambda p, vi: (.16, .005, .014))
EXTRA.append(cap)
HV = BV + [cap.data.vertices[i].co.copy() for i in range(len(cap.data.vertices))]
HP = [p.vertices[:] for p in body.data.polygons] + [[i + len(BV) for i in p.vertices] for p in cap.data.polygons]
HBVH = BVHTree.FromPolygons(HV, HP)
def drape(root, d0, length, off, steps=16, spread=Vector(), grav=.12, zmin=-1):
    pts = [root.copy()]; p = root.copy(); d = d0.normalized(); seg = length / steps
    for i in range(steps):
        if p.z < zmin and len(pts) > 3: break
        g = min(1, .3 + i * grav); d = (d * (1 - g) + Vector((0, 0, -1)) * g + spread).normalized(); p = p + d * seg
        loc, n, _, _ = HBVH.find_nearest(p); o = off(i / steps)
        if loc is not None and (p - loc).dot(n) < o: p = loc + n * o
        pts.append(p.copy())
    for _ in range(2): pts = [pts[0]] + [(pts[k - 1] + pts[k] * 2 + pts[k + 1]) / 4 for k in range(1, len(pts) - 1)] + [pts[-1]]
    nr = []
    for q in pts:
        loc, n, _, _ = HBVH.find_nearest(q); nr.append((q - loc).normalized() if loc is not None and (q - loc).length > 1e-5 else Vector((0, 1, 0)))
    return pts, nr
def hair_col(base):
    def f(t):
        c = Vector((.1, .003, .01)).lerp(Vector(base), min(1, t / .16))
        if .2 < t < .7: c = c.lerp(Vector((.5, .025, .04)), math.sin((t-.2)/.5*math.pi)*.18)
        return tuple(c.lerp(Vector((.3, .008, .02)), max(0, t - .65) / .35 * .7))
    return f
def on_cap(dirv):
    hit = HBVH.ray_cast(HC + dirv * .3, -dirv)
    return hit[0] if hit[0] else HC + dirv * .1
STRANDS = []
COLS = []                                                              # massa principal: lâmina contínua nas costas
NC = 34
for i in range(NC + 1):
    ph = -1.6 + 3.2 * i / NC; el = .42 - .3 * abs(ph) / 1.6
    dv = Vector((math.sin(ph) * math.cos(el), math.cos(ph) * math.cos(el), math.sin(el))).normalized(); root = on_cap(dv)
    ln = 1.32 - .2 * abs(math.sin(ph)) ** 2 + random.uniform(-.05, .05)
    pts, nr = drape(root, Vector((dv.x*.2, dv.y*.2, -1)), ln, lambda t: .01 + .025 * t, steps=22, spread=Vector((math.sin(ph) * .03, .01, 0)))
    COLS.append((pts, nr))
me = bpy.data.meshes.new('Cabelo'); bm = bmesh.new(); grid = []
for pts, nr in COLS: grid.append([bm.verts.new(p) for p in pts])
for i in range(NC):
    for k in range(len(grid[0]) - 1): bm.faces.new((grid[i][k], grid[i + 1][k], grid[i + 1][k + 1], grid[i][k + 1]))
bm.to_mesh(me); bm.free(); sheet = bpy.data.objects.new('CabeloMassa', me); bpy.context.scene.collection.objects.link(sheet); me.materials.append(MAT['hair'])
for f in me.polygons: f.use_smooth = True
NR = len(COLS[0][0])
paint(sheet, lambda p, vi: hair_col((.22, .006, .016))((vi % NR) / (NR - 1)))
def wavy(pts, nr, amp, freq, ph0):
    n = len(pts); out = [pts[0]]
    for k in range(1, n):
        d = (pts[min(n - 1, k + 1)] - pts[k - 1]).normalized(); side = d.cross(nr[k]).normalized()
        out.append(pts[k] + side * amp * math.sin(k * freq + ph0) * (k / (n - 1)))
    return out
def strand(kind, root, d0, ln, off, steps, spread, w, th, amp=.012, grav=.12, taper=.08):
    pts, nr = drape(root, d0, ln, off, steps=steps, spread=spread, grav=grav)
    STRANDS.append((kind, wavy(pts, nr, amp, random.uniform(.28, .48), random.uniform(0, 6)), nr, w, th, taper))
for i in range(190):                                                  # massa: muitas mechas finas e onduladas
    ph = -1.75 + 3.5 * random.random(); el = random.uniform(-.1, .85)
    dv = Vector((math.sin(ph) * math.cos(el), math.cos(ph) * math.cos(el), math.sin(el))).normalized(); root = on_cap(dv)
    ln = random.uniform(1.15, 1.5) - .22 * abs(math.sin(ph)) ** 2; o = random.random() * .014
    strand('back', root, Vector((dv.x*.2, dv.y*.2, -1)), ln, lambda t, o=o: .010 + o + .025 * t, 18, Vector((math.sin(ph) * .035, .012, 0)), random.uniform(.018, .035), .003, random.uniform(.025, .045))
for sx in (-1, 1):                                                    # mechas na frente dos ombros
    for k in range(6):
        ph = sx * random.uniform(1.85, 2.45); dv = Vector((math.sin(ph), math.cos(ph), random.uniform(.1, .4))).normalized()
        strand('front', on_cap(dv), Vector((sx * .25, -.6, -.3)), random.uniform(.5, .75), lambda t: .014 + .014 * t, 16, Vector((sx * .01, -.02, 0)), random.uniform(.012, .024), .003, .02, grav=.09)
    for k in range(4):                                                # mechas que emolduram o rosto
        dv = Vector((sx * 1, -.4 + k * .16, .45)).normalized()
        strand('side', on_cap(dv), Vector((sx * .45, -.35, -1)), .26 + k * .07, lambda t: .013 + .01 * t, 12, Vector(), .026, .005, .008, grav=.2)
def bang(x0, x1, z1, curl):
    root = on_cap(Vector((x0 * 9, -.6, 1)).normalized()); pts = []
    for i in range(11):
        t = i / 10; x = root.x + (x1 - root.x) * t ** 1.3; z = root.z + (z1 - root.z) * t
        hit = HBVH.ray_cast(Vector((x, -.4, z)), Vector((0, 1, 0)))
        y = hit[0].y if hit[0] else root.y
        pts.append(Vector((x, min(root.y, y) - (.007 + .009 * math.sin(t * math.pi) + curl * t * t), z)))
    pts[0] = root
    return pts, [Vector((0, -1, .2)).normalized()] * len(pts)
for k in range(22):                                                   # franja fina, varrida para o lado; três mechas cruzam o rosto
    x0 = -.068 + k * .006; lng = k < 14; x1 = x0 + .060 + .007 * math.sin(k)
    z1 = (1.570 + .024 * k / 14) if lng else 1.59 + .018 * random.random()
    pts, nr = bang(x0, x1, z1, .007)
    STRANDS.append(('bang', pts, nr, random.uniform(.008, .014), .002, .05))
for k in range(64):                                                   # textura no alto da cabeça, a partir da risca
    ph = -2.9 + 5.8 * k / 63; dv = Vector((math.sin(ph) * .25, math.cos(ph) * .25 - .1, 1)).normalized(); root = on_cap(dv)
    pts, nr = drape(root, Vector((math.sin(ph), math.cos(ph), .2)), random.uniform(.14, .2), lambda t: .006 + .006 * t, steps=8, grav=.2)
    STRANDS.append(('top', pts, nr, .015, .003, .12))
CHAIN = [(P['Head'].z, 'Head'), (P['Neck'].z, 'Neck'), (P['UpperChest'].z, 'UpperChest'), (P['Chest'].z, 'Chest'), (P['Spine'].z, 'Spine'), (P['Hips'].z, 'Hips')]
def chain_w(p):
    z = p.z
    if z >= CHAIN[0][0]: return {'Head': 1.}
    for (z0, n0), (z1, n1) in zip(CHAIN, CHAIN[1:]):
        if z >= z1: k = (z - z1) / (z0 - z1); return {n0: k, n1: 1 - k}
    return {'Hips': 1.}
HAIR = []
for kind, pts, nr, w, th, taper in STRANDS:
    base = (random.uniform(.18, .34), .004, .012)
    HAIR.append((ribbon(pts, w, w * taper, th, 'hair', 'Mecha', nr, hair_col(base), sides=6), kind in ('bang', 'side', 'top')))

# ---------- 8) roupa, joias e armadura ----------
def loop_at(co, no, bones, near):
    bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if dom(BW[f.verts[0].index]) not in bones], context='FACES_ONLY')
    res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no)
    cut = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
    adj = {}
    for e in cut:
        a, b = e.verts; adj.setdefault(a, []).append(b); adj.setdefault(b, []).append(a)
    seen, chains = set(), []
    for v0 in adj:
        if v0 in seen: continue
        ch = [v0]; seen.add(v0); cur = v0
        while True:
            nx = [u for u in adj[cur] if u not in seen]
            if not nx: break
            cur = nx[0]; seen.add(cur); ch.append(cur)
        chains.append([v.co.copy() for v in ch])
    bm.free()
    chains = [c for c in chains if len(c) > 5]
    return min(chains, key=lambda c: (sum(c, Vector()) / len(c) - near).length)
def ring(co, no, bones, near, off, mat_key='silver', w=.006, th=.006, spikes=0, sl=.012, name='Aro'):
    pts = loop_at(co, no, bones, near); cen = sum(pts, Vector()) / len(pts)
    pts = [cen + (p - cen) * 1 + ((p - cen) - no * (p - cen).dot(no)).normalized() * off for p in pts]
    pts.append(pts[0]); nr = [((p - cen) - no * (p - cen).dot(no)).normalized() for p in pts]
    parts = [ribbon(pts, w, w, th, mat_key, name, nr)]
    for k in range(spikes):
        i = int(k * (len(pts) - 1) / spikes); parts.append(spike(pts[i], nr[i], sl, .004 + sl * .18))
    return parts
def spike(base, d, ln, r):
    me = bpy.data.meshes.new('espinho'); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=5, radius1=r, radius2=0, depth=ln)
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation(base + d.normalized() * ln * .45) @ rot, verts=bm.verts); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('Espinho', me); bpy.context.scene.collection.objects.link(o); me.materials.append(MAT['silver']); return o
def gem(c, r):
    me = bpy.data.meshes.new('gema'); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
    for v in bm.verts: v.co = c + Vector((v.co.x, v.co.y * .6, v.co.z * 1.3))
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new('Gema', me); bpy.context.scene.collection.objects.link(o); me.materials.append(MAT['gem']); return o
def bar(a, b, w, th, mat_key='silver', out=Vector((0, -1, 0))):
    return ribbon([a, (a + b) / 2, b], w, w, th, mat_key, 'Barra', [out] * 3, sides=4)
def cross(c, h, w, out, up=Vector((0, 0, 1)), th=.004, gem_r=None, thorns=True):
    side = up.cross(out).normalized(); parts = [bar(c + up * h * .62, c - up * h * .38, th * 1.6, th, out=out), bar(c + side * w / 2 + up * h * .2, c - side * w / 2 + up * h * .2, th * 1.6, th, out=out)]
    if thorns:
        for d, base in ((up, c + up * h * .62), (-up, c - up * h * .38), (side, c + side * w / 2 + up * h * .2), (-side, c - side * w / 2 + up * h * .2)): parts.append(spike(base, d, h * .16, th * .9))
    if gem_r: parts.append(gem(c + up * h * .2 + out * th, gem_r))
    return parts
def surf(p, off):
    hit = BVH.ray_cast(Vector((p.x, -.6, p.z)), Vector((0, 1, 0))) if p.y < -.19 else (None,)
    loc, n, _, _ = hit if hit[0] is not None else BVH.find_nearest(p)
    return loc + n * off, n
OUTFIT = []                                                           # (objeto, pesos fixos ou None = do corpo)
LEGS = {'LeftUpperLeg', 'RightUpperLeg'}
# O debrum acompanha a curva do decote na textura, sem uma barra reta.
for o in ring(Vector((0, 0, 1.17)), Vector((0, .25, 1)).normalized(), TORSO, Vector((0, -.05, 1.17)), .003, w=.007, th=.004, name='Faixa'): OUTFIT.append((o, None))
for o in ring(Vector((0, 0, .95)), Vector((0, 0, 1)), TORSO | LEGS, Vector((0, 0, .95)), .007, w=.012, th=.006, spikes=16, sl=.018, name='Cinto'): OUTFIT.append((o, None))
for sx in (-1, 1):
    A, n = LEGCUT[sx]
    for o in ring(A + n * .004, n, TORSO | LEGS, Vector((sx * .1, 0, .87)), .002, w=.005, th=.004, name='Cava'): OUTFIT.append((o, None))
    for o in ring(Vector((0, 0, .628)), Vector((0, 0, 1)), LEGS, Vector((sx * .11, 0, .628)), .003, w=.016, th=.004, spikes=9, sl=.012, name='Liga'): OUTFIT.append((o, None))
    co, no = GLOVE[sx]
    for o in ring(co + no * .006, no, {'LeftUpperArm', 'RightUpperArm'}, co, .003, w=.012, th=.005, spikes=7, sl=.012, name='Bracelete'): OUTFIT.append((o, None))
    co, no = WRIST[sx]
    for o in ring(co, no, {'LeftLowerArm', 'RightLowerArm', 'LeftHand', 'RightHand'}, co, .004, w=.014, th=.005, spikes=6, sl=.014, name='Pulseira'): OUTFIT.append((o, None))
    a, _ = surf(Vector((sx * .085, -.2, .935)), .004); b, _ = surf(Vector((sx * .1, -.2, .632)), .003)
    pts = [surf(a.lerp(b, t) + Vector((0, -.05, 0)), .004)[0] for t in np.linspace(0, 1, 9)]
    OUTFIT.append((ribbon(pts, .007, .007, .003, 'silver', 'Cinta', [surf(q, 0)[1] for q in pts], sides=4), None))
for o in ring(Vector((0, 0, 1.452)), Vector((0, -.15, 1)).normalized(), {'Neck', 'Head', 'UpperChest'}, Vector((0, -.03, 1.45)), .004, 'black', w=.02, th=.004, name='Gargantilha'): OUTFIT.append((o, None))
c, n = surf(Vector((0, -.2, 1.44)), .006)
for o in cross(c + Vector((0, 0, -.02)), .028, .018, n, th=.003, gem_r=.004): OUTFIT.append((o, None))
for sx in (-1, 1):                                                    # correntes do colo
    a0 = Vector((sx * .045, -.2, 1.44 if sx else 1.425)); a1 = Vector((sx * .012, -.2, 1.318))
    pts = []
    for t in np.linspace(0, 1, 12):
        q = a0.lerp(a1, t) + Vector((0, 0, -.012 * math.sin(t * math.pi) * (sx != 0))); pts.append(surf(q, .004)[0])
    nr = [surf(q, 0)[1] for q in pts]; OUTFIT.append((ribbon(pts, .0022, .0022, .002, 'silver', 'Corrente', nr, sides=4), None))
    for k in range(2, 11, 3): OUTFIT.append((spike(pts[k], nr[k] + Vector((0, 0, .4)), .009, .0028), None))
c, n = surf(Vector((0, -.2, 1.12)), .006)
for o in cross(c, .1, .06, n, gem_r=.009): OUTFIT.append((o, None))
c, n = surf(Vector((0, -.2, .95)), .012); OUTFIT.append((gem(c, .008), None))
# MOD 212 — costuras curvas do corset, arabescos e amarração frontal.
for sx in (-1, 1):
    for lane in range(3):
        pts = []
        for t in np.linspace(0, 1, 24):
            z = .96 + .34 * t
            x = sx * (.025 + lane * .028 + .025 * math.sin(math.pi*t))
            pts.append(surf(Vector((x, -.4, z)), .004)[0])
        OUTFIT.append((ribbon(pts, .0025, .0025, .002, 'silver', 'BordadoCorset', [surf(p,0)[1] for p in pts], sides=4), None))
    for k in range(5):
        z = 1.0 + k * .053
        pts = [surf(Vector((sx*(.035+.035*math.sin(t*math.pi)), -.4, z+.045*t)), .006)[0] for t in np.linspace(0,1,16)]
        OUTFIT.append((ribbon(pts,.003,.001,.002,'silver','Arabesco',[surf(p,0)[1] for p in pts],sides=4),None))
    for k in range(8):
        z=.985+k*.033
        a,n=surf(Vector((sx*.017,-.4,z)),.007)
        b,_=surf(Vector((-sx*.017,-.4,z+.033)),.007)
        OUTFIT.append((bar(a,b,.002,.002,'silver',n),None))
    # alças e pequenos rubis no colo
    pts=[surf(Vector((sx*(.06+.025*math.sin(t*math.pi)), -.4, 1.30+.13*t)),.006)[0] for t in np.linspace(0,1,18)]
    OUTFIT.append((ribbon(pts,.006,.004,.003,'black','Alca', [surf(p,0)[1] for p in pts]),None))
    for p in pts[2::5]: OUTFIT.append((gem(p,.0035),None))

# coroa de espinhos
CR = (HC + Vector((0, .01, .085)), .098, .104)
crown = []
pts = []
for k in range(41):
    a = k / 40 * 2 * math.pi; pts.append(CR[0] + Vector((math.sin(a) * CR[1], -math.cos(a) * CR[2], .012 * math.cos(a) + .004 * math.sin(a * 7))))
for twist in (0, 1):
    q = [p + Vector((0, 0, .004 * math.sin(i * .9 + twist * math.pi))) for i, p in enumerate(pts)]
    crown.append(ribbon(q, .0035, .0035, .0035, 'silver', 'Coroa', [(p - CR[0]).normalized() for p in q]))
for k in range(32):
    a = k / 32 * 2 * math.pi; front = math.cos(a); p = pts[int(k / 32 * 40)]
    ln = .014 + .025 * max(0, front) ** 2 + .008 * random.random(); d = ((p - CR[0]).normalized() * .45 + Vector((0, 0, 1))).normalized()
    crown.append(spike(p, d, ln, .0045))
    if k % 2: crown.append(spike(p, ((p - CR[0]).normalized() + Vector((0, 0, -.2))).normalized(), .018, .003))
crown.append(gem(pts[0] + Vector((0, -.004, .012)), .008))
for o in crown: OUTFIT.append((o, {'Head': 1.}))
# brincos em cruz
for sx in (-1, 1):
    ear = Vector((sx * .074, -.02, 1.535)); ch = [ear + Vector((0, 0, -k * .008)) for k in range(5)]
    OUTFIT.append((ribbon(ch, .0018, .0018, .0018, 'silver', 'Corrente', [Vector((sx, 0, 0))] * 5, sides=4), {'Head': 1.}))
    for o in cross(ch[-1] + Vector((0, 0, -.016)), .03, .016, Vector((sx, -.3, 0)).normalized(), th=.0025, gem_r=.003): OUTFIT.append((o, {'Head': 1.}))
# garras e manoplas
for sx, side in ((1, 'l'), (-1, 'r')):
    hand = ('Left' if sx > 0 else 'Right') + 'Hand'
    for f in range(1, 6):
        a, b = SG(f'joint-{side}-finger-{f}-3'), SG(f'joint-{side}-finger-{f}-4'); d = (b - a).normalized()
        OUTFIT.append((spike(b - d * .006, d + Vector((0, -.15, -.1)), .014 if f > 1 else .010, .0045), {hand: 1.}))
    wr, kn = Vector(NH[hand]), SG(f'joint-{side}-finger-3-1'); c = wr.lerp(kn, .55); n = (c - Vector((0, 0, c.z))).normalized()
    n = Vector((sx, -.2, 0)).normalized()
    for k in range(3): OUTFIT.append((spike(wr.lerp(kn, .3 + k * .25) + n * .012, n + Vector((0, 0, .3)), .016, .004), {hand: 1.}))
# botas: casca sobre a perna abaixo do joelho, debrum de prata, joelheiras com espinhos e bico
BOOTB = {'LeftLowerLeg', 'RightLowerLeg', 'LeftFoot', 'RightFoot', 'LeftToes', 'RightToes'}
bf = [poly for poly in body.data.polygons if dom(BW[poly.vertices[0]]) in BOOTB and poly.center.z < .5]
used = sorted({i for poly in bf for i in poly.vertices}); rm = {o: n for n, o in enumerate(used)}
me = bpy.data.meshes.new('Bota'); me.from_pydata([BV[i] + NRM[i] * (.007 + .004 * (BV[i].z < .1)) for i in used], [], [[rm[i] for i in poly.vertices] for poly in bf])
boot = bpy.data.objects.new('Bota', me); bpy.context.scene.collection.objects.link(boot); me.materials.append(MAT['boot'])
for f in me.polygons: f.use_smooth = True
OUTFIT.append((boot, None))
for sx in (-1, 1):
    for o in ring(Vector((0, 0, .492)), Vector((0, 0, 1)), BOOTB | LEGS, Vector((sx * .14, 0, .49)), .009, w=.014, th=.006, spikes=8, sl=.014, name='BordaBota'): OUTFIT.append((o, None))
    knee = Vector(NH[('Left' if sx > 0 else 'Right') + 'LowerLeg']); c, n = surf(knee + Vector((0, -.15, -.02)), .012)
    OUTFIT.append((spike(c + Vector((0, 0, .005)), Vector((0, -.35, 1)), .07, .028), None))
    for k in (-1, 1): OUTFIT.append((spike(c + Vector((k * .02, -.004, 0)), Vector((k * .4, -.6, .8)), .03, .007), None))
    for z in (.36, .27, .18):
        c, n = surf(Vector((sx * .15, -.2, z)), .009); OUTFIT.append((spike(c, n + Vector((0, 0, .5)), .02, .006), None))
    toe = SG(f'joint-{"l" if sx > 0 else "r"}-toe-2-4') if f'joint-{"l" if sx > 0 else "r"}-toe-2-4' in groups else Vector((sx * .19, -.16, .02))
    OUTFIT.append((spike(toe + Vector((0, .01, .012)), Vector((0, -1, -.05)), .07, .022), None))
# Biqueira contínua: a bota não deve reproduzir cada dedo como um pé descalço.
for sx,side in ((1,'Left'),(-1,'Right')):
    verts=[p for p,w in zip(BV,BW) if dom(w) in {side+'Foot',side+'Toes'} and p.z<.13]
    if not verts: continue
    low=Vector(tuple(min(p[i] for p in verts) for i in range(3)))
    high=Vector(tuple(max(p[i] for p in verts) for i in range(3)))
    center=(low+high)*.5;radius=(high-low)*.5+Vector((.008,.013,.006))
    bm=bmesh.new();bmesh.ops.create_uvsphere(bm,u_segments=20,v_segments=12,radius=1)
    for v in bm.verts:
        v.co=Vector((center.x+v.co.x*radius.x,center.y+v.co.y*radius.y,max(.005,center.z+v.co.z*radius.z)))
    me=bpy.data.meshes.new('Biqueira');bm.to_mesh(me);bm.free()
    o=bpy.data.objects.new('Biqueira',me);bpy.context.scene.collection.objects.link(o);me.materials.append(MAT['boot'])
    for poly in me.polygons:poly.use_smooth=True
    OUTFIT.append((o,{side+'Foot':1.}))

# saia/capa: painéis do cinto ao chão, abertos na frente (a fenda alarga para baixo), preto por fora e carmesim por dentro
ARMB = {'LeftUpperArm', 'RightUpperArm', 'LeftLowerArm', 'RightLowerArm', 'LeftHand', 'RightHand'}
SK = [c for c, w in zip(BV, BW) if dom(w) not in ARMB and c.z < 1.0]
def body_r(th, z):
    best = .06
    for c in SK:
        if abs(c.z - z) > .025: continue
        a = math.atan2(c.x, -c.y)
        if abs((a - th + math.pi) % (2 * math.pi) - math.pi) < .2: best = max(best, math.hypot(c.x, c.y))
    return best
ZT, NT, NZ = .955, 44, 24
def skirt_layer(inner):
    me = bpy.data.meshes.new('Saia'); bm = bmesh.new(); grid = []; uvt = []
    for j in range(NZ + 1):
        t = j / NZ; row = []
        op = .85 + .55 * t                                             # meia-abertura da fenda (rad)
        for i in range(NT + 1):
            u = i / NT; th = op + (2 * math.pi - 2 * op) * u
            panel = (u * 6) % 1; tip = 1 - abs(panel - .5) * 2           # pontas rasgadas: 6 painéis
            zb = .03 + (.08 + .1 * abs(math.cos(th))) * (1 - tip) + .02 * (abs(math.cos(th)) < .6)
            z = ZT + (zb - ZT) * t
            rw = body_r(th, ZT) + .012; rh = .44 if math.cos(th) < -.3 else .36
            rl = rw + (rh - rw) * (t ** 1.4) + .02 * math.sin(th * 13 + t * 3) * t
            r = max(rl, body_r(th, z) + .03 + .02 * t) - (.006 if inner else 0)
            row.append(bm.verts.new((math.sin(th) * r, -math.cos(th) * r, z))); uvt.append((th, t))
        grid.append(row)
    for j in range(NZ):
        for i in range(NT):
            q = (grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i])
            bm.faces.new(q if inner else q[::-1])
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new('Saia', me); bpy.context.scene.collection.objects.link(o); me.materials.append(MAT['skirt'])
    for f in me.polygons: f.use_smooth = True
    def col(p, vi):
        th, t = uvt[vi]; st = .85 + .15 * math.sin(th * 17)
        if inner: return tuple(Vector((.04, .0, .01)).lerp(Vector((.42, .01, .045)) * st, min(1, t * 1.6)))
        return tuple(Vector((.02, .014, .018)).lerp(Vector((.16, .0, .02)) * st, max(0, t - .3) / .7))
    paint(o, col); o['uvt'] = 0; o.data['inner'] = inner
    return o, uvt
MAT['skirt'].use_backface_culling = True
SKIRT = [skirt_layer(False), skirt_layer(True)]

# ---------- 9) pesos, junta tudo e exporta ----------
GROUPS = sorted(set(MAP.values()))
def set_w(o, fn):
    for n in GROUPS:
        if n not in o.vertex_groups: o.vertex_groups.new(name=n)
    for v in o.data.vertices:
        for n, w in fn(o.matrix_world @ v.co).items(): o.vertex_groups[n].add([v.index], w, 'REPLACE')
body.data.calc_loop_triangles()
cloth_triangles=[tuple(t.vertices) for t in body.data.loop_triangles]
cloth_surface=BVHTree.FromPolygons(BV,cloth_triangles,all_triangles=True)
def near_w(p):
    q,_,face,_=cloth_surface.find_nearest(p)
    ids=cloth_triangles[face];a,b,c=[BV[i] for i in ids];ab,ac,aq=b-a,c-a,q-a
    d00,d01,d11,d20,d21=ab.dot(ab),ab.dot(ac),ac.dot(ac),aq.dot(ab),aq.dot(ac)
    det=d00*d11-d01*d01
    if abs(det)<1e-15:return BW[ids[0]]
    v=(d11*d20-d01*d21)/det;w=(d00*d21-d01*d20)/det;out={}
    for index,t in zip(ids,(1-v-w,v,w)):
        for name,weight in BW[index].items():out[name]=out.get(name,0)+max(0,t)*weight
    total=sum(out.values());return {n:w/total for n,w in out.items() if w>1e-8}
HEAD = lambda p: {'Head': 1.}
for o in EXTRA: set_w(o, near_w if o is cap else HEAD)
set_w(sheet, chain_w)
for o, head in HAIR: set_w(o, HEAD if head else chain_w)
for o, fixed in OUTFIT: set_w(o, (lambda p, f=fixed: f) if fixed else near_w)
for o, uvt in SKIRT:
    def sw(p, o=o):
        t = max(0, min(1, (ZT - p.z) / ZT)); k = .32 * min(1, abs(p.x) / .2) * t
        return {'Hips': 1 - k, ('LeftUpperLeg' if p.x > 0 else 'RightUpperLeg'): k} if k > 0 else {'Hips': 1.}
    set_w(o, sw)
for o in [x for x in bpy.data.objects if x.type == 'MESH']:
    if 'Col' not in o.data.color_attributes: paint(o, lambda p, vi: (1, 1, 1))
    if 'inner' in o.data: del o.data['inner']
    if 'uvt' in o: del o['uvt']
bpy.ops.object.select_all(action='DESELECT')
for o in [x for x in bpy.data.objects if x.type == 'MESH']: o.select_set(True)
bpy.context.view_layer.objects.active = body; bpy.ops.object.join()
print('Sandra: vértices', len(body.data.vertices), 'faces', len(body.data.polygons))
body.parent = arm; md = body.modifiers.new('Armature', 'ARMATURE'); md.object = arm
# Preserve todas as ações importadas: Blender 4.3 usa .001 também nas ações do rig.
print('Ações preservadas:', [a.name for a in bpy.data.actions])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='NLA_TRACKS')
# O arquivo-fonte contém trilhas duplicadas (.001). Preserve apenas os nomes canônicos
# usados em RIG_DEFS; os buffers e os canais das oito animações ficam intactos.
import struct
with open(OUT, 'rb') as f: data = f.read()
json_len, json_type = struct.unpack_from('<II', data, 12)
doc = json.loads(data[20:20 + json_len])
names = {a['name'] for a in doc.get('animations', [])}
doc['animations'] = [a for a in doc.get('animations', []) if not (a['name'].endswith('.001') and a['name'][:-4] in names)]
assert len(doc['animations']) == 8, 'Esperadas as oito animações da Misteriosa'
tail = bytearray(data[20 + json_len:])
# A esquiva-fonte cai 8 metros no eixo vertical. O jogo já fixa X/Z;
# fixe Y neste clipe para uma esquiva no chão, mantendo rotações e membros.
for anim in doc['animations']:
    if anim['name'] != '_01a15ab0_deed_76a9_818c_47f5fc81ba40': continue
    for ch in anim['channels']:
        if ch['target']['path'] != 'translation' or doc['nodes'][ch['target']['node']].get('name') != 'Hips': continue
        acc = doc['accessors'][anim['samplers'][ch['sampler']]['output']]
        assert acc['componentType'] == 5126 and acc['type'] == 'VEC3'
        view = doc['bufferViews'][acc['bufferView']]
        offset = 8 + view.get('byteOffset', 0) + acc.get('byteOffset', 0)
        stride = view.get('byteStride', 12)
        y = struct.unpack_from('<f', tail, offset + 4)[0]
        for i in range(acc['count']): struct.pack_into('<f', tail, offset + i * stride + 4, y)
        if 'min' in acc: acc['min'][1] = y
        if 'max' in acc: acc['max'][1] = y
chunk = json.dumps(doc, separators=(',', ':')).encode(); chunk += b' ' * (-len(chunk) % 4)
with open(OUT, 'wb') as f:
    f.write(struct.pack('<III', 0x46546c67, 2, 20 + len(chunk) + len(tail)))
    f.write(struct.pack('<II', len(chunk), json_type)); f.write(chunk); f.write(tail)
