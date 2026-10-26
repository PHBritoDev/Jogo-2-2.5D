# MOD 211 — revisão da Sandra (fonte; GLB e validação visual pendentes): Sandra refeita a partir da referência do autor (gótica: cabelo vermelho longo, olhos vermelhos com
# pupila em cruz, coroa de espinhos, corset preto com ornamentos de prata, saia/capa vermelho-escura com fenda, meias
# pretas, botas e garras de prata, brincos em cruz e a arma "cruz demoníaca").
#
# Corpo: malha-base do MakeHuman (MPFB2, licença CC0) com alvos femininos, pesos do rig "mixamo" do próprio MPFB2.
# A malha é ajustada (pose + comprimento de cada osso) ao esqueleto da Misteriosa (Misteriosa-rig.glb), então a Sandra
# usa as mesmas animações sem retarget.
# Dados do MPFB2: git clone --filter=blob:none --sparse https://github.com/makehumancommunity/mpfb2 e defina MPFB_DATA
# como src/mpfb/data (padrão: /tmp/claude-0/ext/mpfb2/src/mpfb/data).
# Uso: python m8_sandra.py <saída.glb>
import bpy, bmesh, gzip, json, os, sys, math, random
import numpy as np
from mathutils import Vector, Matrix, noise
OUT = sys.argv[-1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MP = os.environ.get('MPFB_DATA', '/tmp/claude-0/ext/mpfb2/src/mpfb/data')
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
           ('torso/measure-waist-circ-decr', .6), ('stomach/stomach-pregnant-decr', .3), ('head/head-oval', .6), ('chin/chin-triangle', .5), ('chin/chin-width-decr', .4),
           ('nose/nose-scale-horiz-decr', .5), ('nose/nose-scale-vert-decr', .3), ('nose/nose-scale-depth-decr', .4), ('nose/nose-point-width-decr', .5),
           ('mouth/mouth-scale-horiz-decr', .35), ('mouth/mouth-upperlip-volume-incr', .2), ('mouth/mouth-lowerlip-volume-incr', .25), ('neck/neck-scale-horiz-decr', .4),
           ('eyes/r-eye-scale-incr', .3), ('eyes/l-eye-scale-incr', .3), ('eyes/r-eye-height2-incr', .15), ('eyes/l-eye-height2-incr', .15),
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
    TW[vi] = d

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
# Abertura amendoada: não ampliar verticalmente o olho; levantar só o canto externo.
for sx, g in ((1, 'helper-l-eye'), (-1, 'helper-r-eye')):
    e = Vector(B2[sorted(groups[g])].mean(0))
    for v in body.data.vertices:
        d = v.co - e
        if d.y > -.004 or abs(d.x) > .024 or abs(d.z) > .018: continue
        r = math.hypot(d.x / .024, d.z / .018)
        if r < 1: v.co.z = e.z + d.z * (1 - .12 * (1 - r) ** .7) + .0025 * max(0, d.x * sx / .02) * (1 - r)
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
def SG(g): return Vector(B2[sorted(groups[g])].mean(0))

# ---------- 5) materiais ----------
def mat(name, color=(1, 1, 1), metal=0., rough=.5, emit=None, es=0., vc=False, tex=None, etex=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if vc:
        a = nt.nodes.new('ShaderNodeVertexColor'); a.layer_name = 'Col'; nt.links.new(a.outputs['Color'], b.inputs['Base Color'])
    if tex:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = tex; nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = es
    if etex:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = etex; nt.links.new(t.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = es
    return m
def eye_images():
    N = 256; base = np.zeros((N, N, 4)); em = np.zeros((N, N, 4)); base[..., 3] = 1; em[..., 3] = 1
    yy, xx = np.mgrid[0:N, 0:N]; u = (xx + .5) / N - .5; v = (yy + .5) / N - .5; r = np.hypot(u, v); a = np.arctan2(v, u)
    base[..., :3] = (.96, .9, .9)
    IR = .31; iris = r < IR; k = np.clip(r / IR, 0, 1)
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
    for c in range(3): em[..., c] = np.where(iris, col[..., c] * .06, 0)
    em[(r < .07) & iris & ~star] = (0, 0, 0, 1); em[star & iris] = (1, .35, .4, 1); em[hl] = (.6, .6, .6, 1)
    imgs = []
    for name, arr in (('Sandra_olho', base), ('Sandra_olho_brilho', em)):
        im = bpy.data.images.new(name, N, N); im.pixels = arr.astype(np.float32).ravel(); im.pack(); imgs.append(im)
    return imgs
EYE_B, EYE_E = eye_images()
MAT = {'skin': mat('Pele', rough=.55, vc=True), 'black': mat('Couro', (.018, .012, .02), .02, .46), 'stock': mat('Meia', (.025, .018, .026), 0, .68),
       'boot': mat('Bota', (.025, .018, .028), .12, .38), 'silver': mat('Prata', (.48, .45, .5), .85, .34), 'gem': mat('Gema', (.8, .02, .05), 0, .2, (1, .04, .08), 1.4),
       'hair': mat('Cabelo', rough=.48, vc=True), 'skirt': mat('Saia', rough=.6, vc=True), 'lash': mat('Cilios', (.02, .01, .015), 0, .6),
       'eye': mat('Olho', rough=.15, tex=EYE_B, etex=EYE_E, es=1.1), 'brow': mat('Sobrancelha', (.2, .01, .025), 0, .6)}
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
    c = Vector((.96, .84, .81))
    if p.z > 1.42 and p.y < -.06:
        for e in (EYEL, EYER):                                         # sombra e delineado vermelho-escuro
            d = Vector(((p.x - e.x) / 1.15, 0, (p.z - e.z) * 1.25)).length / ER
            if 1.0 < d < 1.9 and p.y < e.y + .01:
                k = (1 - abs(d - 1.25) / .65) ** 1.5 * (1.25 if p.z > e.z else .6)
                c = c.lerp(Vector((.32, .06, .08)), max(0, min(.85, k)))
        dl = Vector(((p.x - LIP.x) / .02, 0, (p.z - LIP.z) / .012)).length
        if dl < 1 and p.y < -.136: c = c.lerp(Vector((.36, .065, .085)), min(1, (1 - dl) * 5))
        for sx in (-1, 1):                                             # rubor discreto
            db = Vector((p.x - sx * .047, 0, p.z - 1.535)).length
            if db < .022: c = c.lerp(Vector((.95, .62, .64)), (1 - db / .022) * .45)
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
    for f in me.polygons: f.use_smooth = True
    if colors: paint(o, lambda p, vi: colors(vi // sides / max(1, n - 1)))
    return o
def on_face(x, z, off=.0015):
    hit = BVH.ray_cast(Vector((x, -.4, z)), Vector((0, 1, 0)))
    return (hit[0] + hit[1] * off, hit[1]) if hit[0] else (Vector((x, -.14, z)), Vector((0, -1, 0)))
for sx in (-1, 1):
    pts, nrm = [], []
    for i in range(9):
        t = i / 8; x = sx * (.013 + .044 * t); z = EYEL.z + .019 + .005 * math.sin(t * math.pi) + .002 * t
        p, n = on_face(x, z); pts.append(p); nrm.append(n)
    EXTRA.append(ribbon(pts, .0032, .0012, .001, 'brow', 'Sobrancelha', nrm))
# cílios: linha grossa na pálpebra de cima (com pontas no canto de fora) e fina embaixo, seguindo a abertura do olho
def lid_pt(e, sx, ang, upper):
    a, b = .0172, (.0076 if upper else .0068); x = e.x + sx * math.cos(ang) * a; z = e.z + math.sin(ang) * b + .0022 * max(0, math.cos(ang)) * (1 if upper else .5)
    return on_face(x, z, .0012)
for e, sx in ((EYEL, 1), (EYER, -1)):
    up = [lid_pt(e, sx, math.pi * (.97 - .94 * i / 12), True) for i in range(13)]       # do canto de dentro para fora
    pts = [p for p, n in up]; nrm = [n for p, n in up]
    EXTRA.append(ribbon(pts, .0016, .0034, .0012, 'lash', 'Cilios', nrm))
    tip = pts[-1]; d = (pts[-1] - pts[-3]).normalized()
    for k, (dz, ln) in enumerate(((.25, .008), (.6, .0065), (.0, .0085))):
        q = [tip - d * (.0025 * k), tip - d * (.0025 * k) + (d + Vector((0, 0, dz))).normalized() * ln]
        EXTRA.append(ribbon(q, .0016, .0003, .0008, 'lash', 'Cilios', [nrm[-1]] * 2))
    lo = [lid_pt(e, sx, -math.pi * (.15 + .7 * i / 8), False) for i in range(9)]
    EXTRA.append(ribbon([p for p, n in lo], .0007, .0011, .0006, 'lash', 'Cilios', [n for p, n in lo]))

# ---------- 7) cabelo ----------
NRM = [v.normal.copy() for v in body.data.vertices]
HC = Vector((0, -.02, 1.585))
def hair_vert(p):
    if p.z < 1.47: return False
    if p.z > 1.632: return True
    if p.y > -.03 and p.z > 1.50: return True
    if abs(p.x) > .062 and p.y > -.07 and p.z > 1.58: return True
    return False
HEADB = {'Head', 'Neck'}
cap_faces = [poly for poly in body.data.polygons if dom(BW[poly.vertices[0]]) in HEADB and all(hair_vert(BV[i]) for i in poly.vertices)]
used = sorted({i for poly in cap_faces for i in poly.vertices}); rm = {o: n for n, o in enumerate(used)}
def cap_off(p): return .007 + .007 * max(0, min(1, (p.z - 1.6) / .08)) + .004 * (p.y > 0)
me = bpy.data.meshes.new('Cabelo'); me.from_pydata([BV[i] + NRM[i] * cap_off(BV[i]) for i in used], [], [[rm[i] for i in poly.vertices] for poly in cap_faces])
cap = bpy.data.objects.new('CabeloBase', me); bpy.context.scene.collection.objects.link(cap); me.materials.append(MAT['hair'])
for f in me.polygons: f.use_smooth = True
paint(cap, lambda p, vi: (.1, .003, .01))
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
        c = Vector((.07, .002, .008)).lerp(Vector(base), min(1, t / .2))
        if .22 < t < .40: c = c.lerp(Vector((.32, .025, .038)), (1 - abs(t - .31) / .09) * .55)
        return tuple(c.lerp(Vector((.18, .006, .018)), max(0, t - .7) / .3 * .6))
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
    ln = 1.10 - .16 * abs(math.sin(ph)) ** 2 + random.uniform(-.05, .05)
    pts, nr = drape(root, dv + Vector((0, .3, -.3)), ln, lambda t: .01 + .045 * t, steps=28, spread=Vector((math.sin(ph) * .03, .01, 0)))
    COLS.append((pts, nr))
me = bpy.data.meshes.new('Cabelo'); bm = bmesh.new(); grid = []
for pts, nr in COLS: grid.append([bm.verts.new(p) for p in pts])
for i in range(NC):
    for k in range(len(grid[0]) - 1): bm.faces.new((grid[i][k], grid[i + 1][k], grid[i + 1][k + 1], grid[i][k + 1]))
bm.to_mesh(me); bm.free(); sheet = bpy.data.objects.new('CabeloMassa', me); bpy.context.scene.collection.objects.link(sheet); me.materials.append(MAT['hair'])
for f in me.polygons: f.use_smooth = True
NR = len(COLS[0][0])
paint(sheet, lambda p, vi: hair_col((.17, .004, .014))((vi % NR) / (NR - 1)))
for i in range(30):                                                   # mechas largas por cima (textura e pontas)
    ph = -1.55 + 3.1 * (i + random.random() * .7) / 30; el = random.uniform(.05, .6)
    dv = Vector((math.sin(ph) * math.cos(el), math.cos(ph) * math.cos(el), math.sin(el))).normalized(); root = on_cap(dv)
    ln = random.uniform(.98, 1.20) - .16 * abs(math.sin(ph)) ** 2
    pts, nr = drape(root, dv + Vector((0, .3, -.3)), ln, lambda t: .016 + .05 * t + .006 * random.random(), steps=28, spread=Vector((math.sin(ph) * .032, .012, 0)))
    STRANDS.append(('back', pts, nr, random.uniform(.035, .055), .004))
for sx in (-1, 1):                                                    # mechas na frente dos ombros
    for k in range(3):
        ph = sx * (1.95 + k * .17); dv = Vector((math.sin(ph), math.cos(ph), .25)).normalized()
        root = on_cap(dv); pts, nr = drape(root, Vector((sx * .25, -.6, -.3)), random.uniform(.5, .64), lambda t: .014 + .012 * t, steps=18, spread=Vector((sx * .01, -.02, 0)), grav=.09)
        STRANDS.append(('front', pts, nr, random.uniform(.026, .04), .0035))
def bang(x0, x1, z1, curl):
    root = on_cap(Vector((x0 * 3, -.5, 1)).normalized()); pts = []
    for i in range(19):
        t = i / 18; x = x0 + (x1 - x0) * t ** 1.3; z = root.z + (z1 - root.z) * t
        hit = HBVH.ray_cast(Vector((x, -.4, z)), Vector((0, 1, 0)))
        y = hit[0].y if hit[0] else root.y
        pts.append(Vector((x, min(root.y, y) - (.008 + .01 * math.sin(t * math.pi) + curl * t * t), z)))
    pts[0] = root
    nr = [Vector((0, -1, .2)).normalized()] * len(pts)
    return pts, nr
for k in range(13):                                                   # franja diagonal, pontas variadas; preservar leitura dos olhos
    x0 = -.06 + k * .01; lng = k in (1, 6, 11)
    x1 = x0 * 1.12 + .022 + .004 * random.random()
    z1 = 1.595 + .018 * (k / 12) - (.034 if lng else 0)
    pts, nr = bang(x0, x1, z1, .008)
    STRANDS.append(('bang', pts, nr, .014 if k == 6 else .023 - .005 * lng, .002))
for sx in (-1, 1):                                                    # mechas laterais do rosto
    for k in range(3):
        dv = Vector((sx * 1, -.35 + k * .2, .45)).normalized(); root = on_cap(dv)
        pts, nr = drape(root, Vector((sx * .5, -.3, -1)), .24 + k * .07, lambda t: .014 + .01 * t, steps=12, grav=.2)
        STRANDS.append(('side', pts, nr, .021, .003))
for k in range(16):                                                   # volume no alto da cabeça
    ph = -2.7 + 5.4 * k / 15; dv = Vector((math.sin(ph) * .45, math.cos(ph) * .45, 1)).normalized(); root = on_cap(dv)
    pts, nr = drape(root, Vector((math.sin(ph), math.cos(ph), .25)), .17, lambda t: .006 + .008 * t, steps=8, grav=.18)
    STRANDS.append(('top', pts, nr, .035, .004))
CHAIN = [(P['Head'].z, 'Head'), (P['Neck'].z, 'Neck'), (P['UpperChest'].z, 'UpperChest'), (P['Chest'].z, 'Chest'), (P['Spine'].z, 'Spine'), (P['Hips'].z, 'Hips')]
def chain_w(p):
    z = p.z
    if z >= CHAIN[0][0]: return {'Head': 1.}
    for (z0, n0), (z1, n1) in zip(CHAIN, CHAIN[1:]):
        if z >= z1: k = (z - z1) / (z0 - z1); return {n0: k, n1: 1 - k}
    return {'Hips': 1.}
HAIR = []
for kind, pts, nr, w, th in STRANDS:
    base = (random.uniform(.12, .22), .004, .012)
    HAIR.append((ribbon(pts, w, w * (.035 if kind != 'bang' else .02), th, 'hair', 'Mecha', nr, hair_col(base)), kind in ('bang', 'side', 'top')))

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
    loc, n, _, _ = BVH.find_nearest(p); return loc + n * off, n
OUTFIT = []                                                           # (objeto, pesos fixos ou None = do corpo)
LEGS = {'LeftUpperLeg', 'RightUpperLeg'}
for o in ring(CORSET[0] - CORSET[1] * .004, CORSET[1], TORSO, Vector((0, -.05, 1.3)), .003, w=.006, th=.005, spikes=14, sl=.014, name='Debrum'): OUTFIT.append((o, None))
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
for o in cross(c + Vector((0, 0, -.012)), .04, .026, n, gem_r=.005): OUTFIT.append((o, None))
for sx in (-1, 1):                                                    # correntes de espinhos do colar ao corset
    a0 = Vector((sx * .045, -.2, 1.44 if sx else 1.425)); a1 = Vector((sx * .012, -.2, 1.318))
    pts = []
    for t in np.linspace(0, 1, 12):
        q = a0.lerp(a1, t) + Vector((0, 0, -.012 * math.sin(t * math.pi) * (sx != 0))); pts.append(surf(q, .004)[0])
    nr = [surf(q, 0)[1] for q in pts]; OUTFIT.append((ribbon(pts, .0035, .0035, .003, 'silver', 'Corrente', nr, sides=4), None))
    for k in range(2, 11, 3): OUTFIT.append((spike(pts[k], nr[k] + Vector((0, 0, .4)), .009, .0028), None))
c, n = surf(Vector((0, -.2, 1.12)), .006)
for o in cross(c, .1, .06, n, gem_r=.009): OUTFIT.append((o, None))
c, n = surf(Vector((0, -.2, .95)), .012); OUTFIT.append((gem(c, .008), None))
# coroa de espinhos
CR = (HC + Vector((0, .01, .085)), .098, .104)
crown = []
pts = []
for k in range(41):
    a = k / 40 * 2 * math.pi; pts.append(CR[0] + Vector((math.sin(a) * CR[1], -math.cos(a) * CR[2], .012 * math.cos(a) + .004 * math.sin(a * 7))))
for twist in (0, 1):
    q = [p + Vector((0, 0, .004 * math.sin(i * .9 + twist * math.pi))) for i, p in enumerate(pts)]
    crown.append(ribbon(q, .005, .005, .005, 'silver', 'Coroa', [(p - CR[0]).normalized() for p in q]))
for k in range(22):
    a = k / 22 * 2 * math.pi; front = math.cos(a); p = pts[int(k / 22 * 40)]
    ln = .018 + .035 * max(0, front) ** 2 + .012 * random.random(); d = ((p - CR[0]).normalized() * .4 + Vector((0, 0, 1))).normalized()
    crown.append(spike(p, d, ln, .0035))
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
        OUTFIT.append((spike(b - d * .006, d + Vector((0, -.15, -.1)), .028 if f > 1 else .022, .0045), {hand: 1.}))
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
        op = .5 + .55 * t                                             # meia-abertura da fenda (rad)
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
def near_w(p): _, i, _ = KD.find(p); return BW[i]
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
for a in [a for a in bpy.data.actions if a.name.endswith('.001')]: bpy.data.actions.remove(a)   # cópias por objeto do importador
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='ACTIONS')
