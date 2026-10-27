# MOD 215 — Marco 12: o Anjo-Guia refeito (referência do autor: anjo de manto branco com veios de ouro, faixa escura
# na frente, auréola eclipse — disco negro com raios de ouro —, uma asa branca e uma asa negra cristalina, manoplas
# escuras, cabelo platinado na altura dos ombros e olhos dourados). A asa negra é a pista de que ele esconde algo.
#
# Mesma técnica da Sandra (m8_sandra.py): malha-base do MakeHuman (MPFB2, CC0) com alvos masculinos, ajustada ao
# esqueleto da Misteriosa, então o Anjo usa as mesmas animações (parado, andar, correr, ataque, magia, queda).
# Dados do MPFB2 em MPFB_DATA (padrão: /tmp/claude-0/ext/mpfb2/src/mpfb/data).
# Uso: python m12_anjo.py <saída.glb>
import bpy, bmesh, gzip, json, os, sys, math, random
VITIMA = os.environ.get('ANJO_VARIANTE') == 'vitima'   # MOD 217: mesma malha masculina, sem a roupa do Anjo (vítimas do vulcão)
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
TARGETS = [('macrodetails/universal-male-young-averagemuscle-averageweight', .7), ('macrodetails/universal-male-young-maxmuscle-averageweight', .3), ('macrodetails/proportions/male-young-averagemuscle-averageweight-idealproportions', 1),
           ('macrodetails/height/male-young-averagemuscle-averageweight-maxheight', .7), ('head/head-oval', .5), ('chin/chin-width-decr', .25), ('nose/nose-scale-horiz-decr', .25),
           ('eyes/r-eye-scale-incr', .15), ('eyes/l-eye-scale-incr', .15), ('eyes/r-eye-corner1-up', .12), ('eyes/l-eye-corner1-up', .12), ('head/head-age-decr', .4), ('cheek/r-cheek-bones-incr', .4), ('cheek/l-cheek-bones-incr', .4)]
_UNUSED = [('macrodetails/universal-female-young-averagemuscle-minweight', .35), ('macrodetails/proportions/female-young-averagemuscle-averageweight-idealproportions', 1),
           ('macrodetails/height/female-young-averagemuscle-averageweight-maxheight', .5), ('breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness', .45),
           ('torso/measure-waist-circ-decr', .6), ('stomach/stomach-pregnant-decr', .3), ('head/head-oval', 1.0), ('chin/chin-triangle', .8), ('chin/chin-width-decr', .8),
           ('nose/nose-scale-horiz-decr', .5), ('nose/nose-scale-vert-decr', .3), ('nose/nose-scale-depth-decr', .4), ('nose/nose-point-width-decr', .5),
           ('mouth/mouth-scale-horiz-decr', .35), ('mouth/mouth-upperlip-volume-incr', .4), ('mouth/mouth-lowerlip-volume-incr', .5), ('neck/neck-scale-horiz-decr', .4),
           ('eyes/r-eye-scale-incr', .8), ('eyes/l-eye-scale-incr', .8), ('head/head-scale-horiz-decr', .55), ('head/head-age-decr', .5), ('nose/nose-flaring-decr', .8), ('nose/nose-nostrils-width-decr', .7), ('nose/nose-volume-decr', .5), ('cheek/l-cheek-volume-decr', .5), ('cheek/r-cheek-volume-decr', .5), ('forehead/forehead-temple-decr', .4), ('eyes/r-eye-height2-incr', .7), ('eyes/l-eye-height2-incr', .7),
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
for co, no in WRIST.values(): bisect(body, co, no)
# olhos mais abertos (estilo anime): as pálpebras se afastam do centro do olho e o canto de fora sobe um pouco
for sx, g in ((1, 'helper-l-eye'), (-1, 'helper-r-eye')):
    e = Vector(B2[sorted(groups[g])].mean(0))
    for v in body.data.vertices:
        d = v.co - e
        if d.y > -.004 or abs(d.x) > .024 or abs(d.z) > .018: continue
        r = math.hypot(d.x / .024, d.z / .018)
        if r < 1: v.co.z = e.z + d.z * (1 + .1 * (1 - r) ** .7) + .002 * max(0, d.x * sx / .02) * (1 - r)
print('corpo:', len(body.data.vertices), 'vértices')

body.name = 'Anjo'
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
    IR = .335; iris = r < IR; k = np.clip(r / IR, 0, 1)
    streak = .5 + .5 * np.sin(a * 23 + np.sin(a * 7) * 2)
    col = np.stack([.62 + .35 * (1 - k) + .05 * streak, .4 + .3 * (1 - k) + .05 * streak, .08 + .1 * (1 - k)], -1) if not VITIMA else np.stack([.22 + .2 * (1 - k), .13 + .1 * (1 - k), .07 + .05 * (1 - k)], -1)
    col[k > .86] = (.25, .14, .02)                                                              # aro escuro
    star = (np.abs(u) < .011) & (np.abs(v) < .12) | (np.abs(v) < .011) & (np.abs(u) < .12)
    star |= (np.abs(np.abs(u) - np.abs(v)) < .008) & (r < .05)
    col[(v > .12) & (r < IR)] *= .55                                                    # sombra da pálpebra
    for c in range(3): base[..., c] = np.where(iris, col[..., c], base[..., c])
    base[(r < .07) & iris & ~star] = (.15, .08, .0, 1); base[star & iris] = (1, .95, .7, 1) if not VITIMA else (.05, .03, .02, 1)
    hl = np.hypot(u + .1, v - .12) < .045; base[hl] = (1, 1, 1, 1)
    em[..., :3] = 0
    for c in range(3): em[..., c] = np.where(iris, col[..., c] * .9, 0)
    em[(r < .07) & iris & ~star] = (0, 0, 0, 1); em[star & iris] = (1, .85, .45, 1) if not VITIMA else (0, 0, 0, 1); em[hl] = (.6, .6, .6, 1)
    imgs = []
    for name, arr in (('Anjo_olho', base), ('Anjo_olho_brilho', em)):
        im = bpy.data.images.new(name, N, N); im.pixels = arr.astype(np.float32).ravel(); im.pack(); imgs.append(im)
    return imgs
EYE_B, EYE_E = eye_images()
MAT = {'robe': mat('Manto', rough=.55, vc=True), 'steel': mat('Manopla', (.08, .08, .1), .75, .3), 'gold': mat('Ouro', (1, .78, .36), .9, .25, (.25, .15, .02), .4),
       'feather': mat('PenaBranca', rough=.5, vc=True), 'crystal': mat('PenaNegra', (.02, .018, .025), .7, .12, (.05, .03, .08), .35, vc=True), 'void': mat('Eclipse', (.01, .01, .012), .2, .35),
       'skin': mat('Pele', rough=.55, vc=True), 'black': mat('Couro', (.03, .025, .03), .15, .32), 'stock': mat('Meia', (.035, .028, .035), .1, .38),
       'boot': mat('Bota', (.04, .035, .04), .55, .3), 'silver': mat('Prata', (.86, .85, .9), .55, .3), 'gem': mat('Gema', (.8, .02, .05), 0, .2, (1, .04, .08), 5),
       'hair': mat('Cabelo', rough=.45, vc=True), 'skirt': mat('Saia', rough=.6, vc=True), 'lash': mat('Cilios', (.02, .01, .015), 0, .6),
       'eye': mat('Olho', rough=.15, tex=EYE_B, etex=EYE_E, es=2.5), 'brow': mat('Sobrancelha', (.62, .56, .44), 0, .6)}
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
for k in ('skin', 'robe', 'steel', 'eye', 'lash'): add_mat(body, k)

# ---------- 6) corpo: roupa pintada por região, rosto ----------
def region(c, ws):
    d = dom(ws)
    if VITIMA: return 'robe' if c.z < .98 and d not in ('LeftHand', 'RightHand', 'LeftLowerArm', 'RightLowerArm') else 'skin'
    if d in ('Head',) or d == 'Neck' and c.z > 1.43: return 'skin'
    if d in ('LeftLowerArm', 'RightLowerArm', 'LeftHand', 'RightHand'):
        co, no = WRIST[1 if c.x > 0 else -1]
        return 'steel' if (c - co).dot(no) > -.05 else 'robe'
    return 'robe'
mi = {k: [m.name for m in body.data.materials].index(MAT[k].name) for k in ('skin', 'robe', 'steel')}
for poly in body.data.polygons:
    ws = {}
    for vi in poly.vertices:
        for n, w in BW[vi].items(): ws[n] = ws.get(n, 0) + w
    poly.material_index = mi[region(poly.center, ws)]; poly.use_smooth = True
def kintsugi(p, scale=16, w=.05):
    """Veios de ouro (rachaduras douradas da referência): faixas finas de ruído."""
    return abs(noise.noise(p * scale)) < w or abs(noise.noise(p * scale * .5 + Vector((7, 3, 1)))) < w * .6
EYEL, EYER = SG('helper-l-eye'), SG('helper-r-eye'); ER = float(np.linalg.norm(B2[sorted(groups['helper-l-eye'])] - np.array(EYEL), axis=1).mean())
LIP = Vector((0, -.15, 1.508))
def skin_col(p, vi):
    if VITIMA:                                                         # pele suja e machucada (sem nada explícito), calça rasgada
        n = noise.noise(p * 9); d = noise.noise(p * 3 + Vector((4, 1, 2)))
        if p.z < .98: return tuple(Vector((.22, .17, .13)) * (.75 + .35 * n))
        c = Vector((.74, .56, .45)).lerp(Vector((.36, .28, .24)), max(0, d) * .7)
        if abs(noise.noise(p * 22 + Vector((9, 9, 9)))) < .025 and p.z < 1.42: c = c.lerp(Vector((.42, .16, .13)), .6)
        return tuple(c)
    if p.z < 1.44: return (1, .82, .4) if kintsugi(p) else (.9, .88, .84)          # manto: branco com veios de ouro
    c = Vector((.93, .82, .76))
    if p.z > 1.42 and p.y < -.06 and False:
        for e in (EYEL, EYER):                                         # sombra e delineado vermelho-escuro
            d = Vector(((p.x - e.x) / 1.15, 0, (p.z - e.z) * 1.25)).length / ER
            if 1.0 < d < 1.9 and p.y < e.y + .01:
                k = (1 - abs(d - 1.25) / .65) ** 1.5 * (1.25 if p.z > e.z else .6)
                c = c.lerp(Vector((.42, .1, .12)), max(0, min(.7, k)))
        dl = Vector(((p.x - LIP.x) / .017, 0, (p.z - LIP.z) / .0105)).length
        if dl < 1 and p.y < -.136: c = c.lerp(Vector((.58, .03, .08)), min(1, (1 - dl) * 5))
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
    EXTRA.append(ribbon(pts, .0034, .0016, .001, 'brow', 'Sobrancelha', nrm))
# cílios: linha grossa na pálpebra de cima (com pontas no canto de fora) e fina embaixo, seguindo a abertura do olho
def lid_pt(e, sx, ang, upper):
    a, b = .0165, (.0062 if upper else .0068); x = e.x + sx * math.cos(ang) * a; z = e.z + math.sin(ang) * b + .0022 * max(0, math.cos(ang)) * (1 if upper else .5)
    return on_face(x, z, .0012)
for e, sx in ((EYEL, 1), (EYER, -1)):
    up = [lid_pt(e, sx, math.pi * (.97 - .94 * i / 12), True) for i in range(13)]       # do canto de dentro para fora
    pts = [p for p, n in up]; nrm = [n for p, n in up]
    EXTRA.append(ribbon(pts, .0015, .0028, .001, 'lash', 'Cilios', nrm))
    tip = pts[-1]; d = (pts[-1] - pts[-3]).normalized()
    for k, (dz, ln) in enumerate(((.2, .005),)):
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
paint(cap, lambda p, vi: (.62, .57, .46) if not VITIMA else (.1, .07, .05))
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
        c = Vector((.5, .45, .36)).lerp(Vector(base), min(1, t / .2))
        if VITIMA: return tuple(Vector(base) * (.8 + .3 * t))
        if .25 < t < .45: c = c.lerp(Vector((1, .98, .92)), (1 - abs(t - .35) / .1) * .55)
        return tuple(c.lerp(Vector((.95, .93, .86)), max(0, t - .7) / .3 * .5))
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
    ln = .36 - .06 * abs(math.sin(ph)) ** 2 + random.uniform(-.02, .02)
    pts, nr = drape(root, dv + Vector((0, .3, -.3)), ln, lambda t: .01 + .02 * t, steps=12, spread=Vector((math.sin(ph) * .03, .01, 0)))
    COLS.append((pts, nr))
me = bpy.data.meshes.new('Cabelo'); bm = bmesh.new(); grid = []
for pts, nr in COLS: grid.append([bm.verts.new(p) for p in pts])
for i in range(NC):
    for k in range(len(grid[0]) - 1): bm.faces.new((grid[i][k], grid[i + 1][k], grid[i + 1][k + 1], grid[i][k + 1]))
bm.to_mesh(me); bm.free(); sheet = bpy.data.objects.new('CabeloMassa', me); bpy.context.scene.collection.objects.link(sheet); me.materials.append(MAT['hair'])
for f in me.polygons: f.use_smooth = True
NR = len(COLS[0][0])
paint(sheet, lambda p, vi: hair_col((.74, .7, .6) if not VITIMA else (.14, .1, .07))((vi % NR) / (NR - 1)))
def wavy(pts, nr, amp, freq, ph0):
    n = len(pts); out = [pts[0]]
    for k in range(1, n):
        d = (pts[min(n - 1, k + 1)] - pts[k - 1]).normalized(); side = d.cross(nr[k]).normalized()
        out.append(pts[k] + side * amp * math.sin(k * freq + ph0) * (k / (n - 1)))
    return out
def strand(kind, root, d0, ln, off, steps, spread, w, th, amp=.012, grav=.12, taper=.08):
    pts, nr = drape(root, d0, ln, off, steps=steps, spread=spread, grav=grav)
    STRANDS.append((kind, wavy(pts, nr, amp, random.uniform(.5, .9), random.uniform(0, 6)), nr, w, th, taper))
for i in range(110):                                                  # massa: muitas mechas finas e onduladas
    ph = -1.75 + 3.5 * random.random(); el = random.uniform(-.1, .85)
    dv = Vector((math.sin(ph) * math.cos(el), math.cos(ph) * math.cos(el), math.sin(el))).normalized(); root = on_cap(dv)
    ln = random.uniform(.3, .44) - .08 * abs(math.sin(ph)) ** 2; o = random.random() * .01
    strand('back', root, dv + Vector((0, .3, -.3)), ln, lambda t, o=o: .012 + o + .02 * t, 12, Vector((math.sin(ph) * .035, .012, 0)), random.uniform(.03, .05), .006, random.uniform(.008, .02))
for sx in (-1, 1):                                                    # mechas na frente dos ombros
    for k in range(3):
        ph = sx * random.uniform(1.55, 1.85); dv = Vector((math.sin(ph), math.cos(ph), random.uniform(.1, .4))).normalized()
        strand('front', on_cap(dv), Vector((sx * .25, -.6, -.3)), random.uniform(.24, .34), lambda t: .014 + .014 * t, 16, Vector((sx * .01, -.02, 0)), random.uniform(.03, .042), .006, .012, grav=.09)
    for k in range(2):                                                # mechas que emolduram o rosto
        dv = Vector((sx * 1, -.3 + k * .16, .45)).normalized()
        strand('side', on_cap(dv), Vector((sx * .45, -.35, -1)), .26 + k * .07, lambda t: .013 + .01 * t, 12, Vector(), .026, .005, .008, grav=.2)
def bang(x0, x1, z1, curl):
    root = on_cap(Vector((x0 * 3, -.5, 1)).normalized()); pts = []
    for i in range(11):
        t = i / 10; x = x0 + (x1 - x0) * t ** 1.3; z = root.z + (z1 - root.z) * t
        hit = HBVH.ray_cast(Vector((x, -.4, z)), Vector((0, 1, 0)))
        y = hit[0].y if hit[0] else root.y
        pts.append(Vector((x, min(root.y, y) - (.007 + .009 * math.sin(t * math.pi) + curl * t * t), z)))
    pts[0] = root
    return pts, [Vector((0, -1, .2)).normalized()] * len(pts)
for k in range(22):                                                   # franja fina, varrida para o lado; três mechas cruzam o rosto
    x0 = -.066 + k * .0063; lng = k in (16, 19); x1 = x0 * 1.15 + .02 + .006 * random.random()
    z1 = (1.575 + .015 * random.random()) if lng else 1.615 + .012 * random.random()
    pts, nr = bang(x0, x1, z1, .007)
    STRANDS.append(('bang', pts, nr, random.uniform(.015, .022) * (.7 if lng else 1), .0035, .05))
for k in range(36):                                                   # textura no alto da cabeça, a partir da risca
    ph = -2.9 + 5.8 * k / 35; dv = Vector((math.sin(ph) * .25, math.cos(ph) * .25 - .1, 1)).normalized(); root = on_cap(dv)
    pts, nr = drape(root, Vector((math.sin(ph), math.cos(ph), .2)), random.uniform(.14, .2), lambda t: .006 + .006 * t, steps=8, grav=.2)
    STRANDS.append(('top', pts, nr, .036, .006, .3))
CHAIN = [(P['Head'].z, 'Head'), (P['Neck'].z, 'Neck'), (P['UpperChest'].z, 'UpperChest'), (P['Chest'].z, 'Chest'), (P['Spine'].z, 'Spine'), (P['Hips'].z, 'Hips')]
def chain_w(p):
    z = p.z
    if z >= CHAIN[0][0]: return {'Head': 1.}
    for (z0, n0), (z1, n1) in zip(CHAIN, CHAIN[1:]):
        if z >= z1: k = (z - z1) / (z0 - z1); return {n0: k, n1: 1 - k}
    return {'Hips': 1.}
HAIR = []
for kind, pts, nr, w, th, taper in STRANDS:
    base = (random.uniform(.78, .9), random.uniform(.72, .82), random.uniform(.58, .66)) if not VITIMA else (random.uniform(.12, .2), random.uniform(.08, .13), random.uniform(.05, .08))
    HAIR.append((ribbon(pts, w, w * taper, th, 'hair', 'Mecha', nr, hair_col(base), sides=4), kind in ('bang', 'side', 'top')))

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
TORSO = {'Hips', 'Spine', 'Chest', 'UpperChest', 'LeftShoulder', 'RightShoulder'}
for k in ('silver', 'gem'): MAT[k] = MAT['gold']
# medalhão do sol no peito (disco de ouro com raios)
c, n = surf(Vector((0, -.2, 1.27)), .008); up = Vector((0, 0, 1)); side = up.cross(n).normalized()
OUTFIT.append((gem(c, .022), None))
for k in range(12):
    a = k / 12 * 2 * math.pi; d = (side * math.cos(a) + up * math.sin(a)).normalized()
    OUTFIT.append((spike(c + d * .02, d, .045 if k % 2 else .07, .006), None))
for o in ring(Vector((0, 0, 1.452)), Vector((0, -.15, 1)).normalized(), {'Neck', 'Head', 'UpperChest'}, Vector((0, -.03, 1.45)), .004, 'gold', w=.016, th=.004, name='Gola'): OUTFIT.append((o, None))
for o in ring(Vector((0, 0, .97)), Vector((0, 0, 1)), TORSO | LEGS, Vector((0, 0, .97)), .006, 'gold', w=.02, th=.006, name='Cinto'): OUTFIT.append((o, None))
# ombreiras de ouro e branco
for sx in (-1, 1):
    sh = Vector(NH[('Left' if sx > 0 else 'Right') + 'UpperArm']) + Vector((sx * .02, 0, .045))
    me = bpy.data.meshes.new('ombro'); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=.085)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -.02], context='VERTS')
    for v in bm.verts: v.co = sh + Vector((v.co.x * 1.15, v.co.y * 1.05, v.co.z * .8)) + Vector((sx * .01, 0, 0))
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new('Ombreira', me); bpy.context.scene.collection.objects.link(o); me.materials.append(MAT['gold'])
    for f in me.polygons: f.use_smooth = True
    OUTFIT.append((o, {('Left' if sx > 0 else 'Right') + 'Shoulder': .5, ('Left' if sx > 0 else 'Right') + 'UpperArm': .5}))
    for k in range(3): OUTFIT.append((spike(sh + Vector((sx * (.03 + k * .03), 0, .05)), Vector((sx * .5, 0, 1)), .05 - k * .01, .008), {('Left' if sx > 0 else 'Right') + 'UpperArm': 1.}))
    co, no = WRIST[sx]
    for o in ring(co, no, {'LeftLowerArm', 'RightLowerArm', 'LeftHand', 'RightHand'}, co, .005, 'gold', w=.02, th=.006, name='Bracelete'): OUTFIT.append((o, None))
# auréola eclipse: disco negro com anel e raios de ouro, atrás da cabeça
HAL = Vector((0, .25, 1.68)); halo = []                               # MOD 217: atrás da cabeça (antes cortava o crânio e o cabelo)
me = bpy.data.meshes.new('eclipse'); bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=48, radius=.2)
for v in bm.verts: v.co = HAL + Vector((v.co.x, 0, v.co.y))
bm.to_mesh(me); bm.free(); o = bpy.data.objects.new('Eclipse', me); bpy.context.scene.collection.objects.link(o); me.materials.append(MAT['void']); halo.append(o)
pts = [HAL + Vector((math.cos(a) * .205, -.004, math.sin(a) * .205)) for a in np.linspace(0, 2 * math.pi, 49)]
halo.append(ribbon(pts, .012, .012, .006, 'gold', 'AnelAureola', [Vector((math.cos(a), 0, math.sin(a))) for a in np.linspace(0, 2 * math.pi, 49)]))
for k in range(24):
    a = k / 24 * 2 * math.pi; d = Vector((math.cos(a), 0, math.sin(a))); ln = .05 + .07 * (k % 2) + .05 * (k % 6 == 0)
    halo.append(spike(HAL + d * .21 + Vector((0, -.004, 0)), d, ln, .008 if k % 2 else .005))
for o in halo: OUTFIT.append((o, {'Head': 1.}))
# botas brancas e douradas com bico
BOOTB = {'LeftLowerLeg', 'RightLowerLeg', 'LeftFoot', 'RightFoot', 'LeftToes', 'RightToes'}
bf = [poly for poly in body.data.polygons if dom(BW[poly.vertices[0]]) in BOOTB and poly.center.z < .42]
used = sorted({i for poly in bf for i in poly.vertices}); rm = {o: n for n, o in enumerate(used)}
me = bpy.data.meshes.new('Bota'); me.from_pydata([BV[i] + NRM[i] * (.008 + .004 * (BV[i].z < .1)) for i in used], [], [[rm[i] for i in poly.vertices] for poly in bf])
boot = bpy.data.objects.new('Bota', me); bpy.context.scene.collection.objects.link(boot); me.materials.append(MAT['robe'])
for f in me.polygons: f.use_smooth = True
paint(boot, lambda p, vi: (1, .8, .38) if kintsugi(p, 22, .08) else (.86, .84, .8))
OUTFIT.append((boot, None))
for sx in (-1, 1):
    toe = SG(f'joint-{"l" if sx > 0 else "r"}-toe-2-4') if f'joint-{"l" if sx > 0 else "r"}-toe-2-4' in groups else Vector((sx * .19, -.16, .02))
    OUTFIT.append((spike(toe + Vector((0, .01, .012)), Vector((0, -1, -.05)), .06, .02), None))
# asas: esquerda branca (penas em camadas com veios de ouro), direita negra cristalina
def feather(root, d, ln, w, flat, key, col=None):
    # MOD 217 — pena com volume: haste central elevada, lâmina curvada para trás e espessura (Solidify); antes era um papel plano.
    me = bpy.data.meshes.new('pena'); bm = bmesh.new(); prof = [.3, .8, 1, .9, .6, .25, 0]; side = d.cross(flat).normalized(); vs = []; n = len(prof) - 1
    for k, f in enumerate(prof):
        t = k / n; c = root + d * ln * t + flat * (.07 * ln * t * t)
        vs.append((bm.verts.new(c - side * w * f * .5 + flat * .004), bm.verts.new(c - flat * (.012 * w / .12) * (1 - t * .6)), bm.verts.new(c + side * w * f * .5 + flat * .004)))
    for k in range(n):
        for a in range(2): bm.faces.new((vs[k][a], vs[k][a + 1], vs[k + 1][a + 1], vs[k + 1][a]))
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new('Pena', me); bpy.context.scene.collection.objects.link(o); me.materials.append(MAT[key])
    for f in me.polygons: f.use_smooth = True
    md = o.modifiers.new('esp', 'SOLIDIFY'); md.thickness = .006; md.offset = 0
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='esp')
    paint(o, col or (lambda p, vi: (1, 1, 1)))
    return o
WINGS = []
for sx in (1, -1):
    white = sx > 0; key = 'feather' if white else 'crystal'
    sh, el, wr, tip = Vector((sx * .07, .11, 1.33)), Vector((sx * .42, .3, 1.62)), Vector((sx * .78, .34, 1.5)), Vector((sx * 1.05, .38, 1.28))
    bone = []
    for t in np.linspace(0, 1, 18):
        if t < .45: q = sh.lerp(el, t / .45)
        elif t < .8: q = el.lerp(wr, (t - .45) / .35)
        else: q = wr.lerp(tip, (t - .8) / .2)
        bone.append(q)
    flat = Vector((0, 1, .15)).normalized()
    col = (lambda p, vi: (.97, .96, .93) if (vi % 21) < 15 else (1, .84, .46)) if white else (lambda p, vi: (.32, .2, .55) if (vi % 21) >= 18 else (.035, .03, .045))
    for layer, (ln0, ln1, w, out) in enumerate(((.95, .6, .15, 0), (.55, .38, .14, .012), (.28, .2, .12, .024))):
        n = 18 if layer == 0 else 15
        for k in range(n):
            t = k / (n - 1); q = bone[int(t * (len(bone) - 1))] + Vector((0, out, 0))
            ln = ln0 + (ln1 - ln0) * (1 - t) if layer == 0 else ln1 + (ln0 - ln1) * t * .5
            if layer == 0 and t > .7: ln *= 1.15
            d = Vector((sx * (.25 + .65 * t), .1, -1)).normalized()
            if not white: ln *= random.uniform(.9, 1.12)
            WINGS.append(feather(q, d, ln, w * (1.1 if not white else 1), flat, key, col))
    for k in range(len(bone) - 1):
        WINGS.append(ribbon([bone[k], bone[k + 1]], .05, .045, .03, 'gold' if not white else 'feather', 'OssoAsa', [flat, flat], sides=4))
# MOD 218 — cada asa ganha um osso próprio (AsaEsq/AsaDir, filhos do UpperChest): o jogo balança as asas ao respirar,
# andar e com o vento. As penas perto do ombro ficam no peito e as pontas seguem o osso da asa.
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT'); inv = arm.matrix_world.inverted()
for nm, sx in (('AsaEsq', 1), ('AsaDir', -1)):
    eb = arm.data.edit_bones.new(nm); eb.head = inv @ Vector((sx * .07, .11, 1.33)); eb.tail = inv @ Vector((sx * .42, .3, 1.62)); eb.parent = arm.data.edit_bones['UpperChest']; eb.use_deform = True
bpy.ops.object.mode_set(mode='OBJECT')
def wing_w(p):
    t = max(0., min(1., (abs(p.x) - .1) / .3)); return {'UpperChest': 1 - t, ('AsaEsq' if p.x > 0 else 'AsaDir'): t} if t > 0 else {'UpperChest': 1.}
for o in WINGS: OUTFIT.append((o, wing_w))
MAT['feather'].use_backface_culling = False; MAT['crystal'].use_backface_culling = False
# manto longo: branco por fora, faixa escura na frente (aberta), barra rasgada
ARMB = {'LeftUpperArm', 'RightUpperArm', 'LeftLowerArm', 'RightLowerArm', 'LeftHand', 'RightHand'}
SK = [c for c, w in zip(BV, BW) if dom(w) not in ARMB and c.z < 1.05]
def body_r(th, z):
    best = .06
    for c in SK:
        if abs(c.z - z) > .025: continue
        a = math.atan2(c.x, -c.y)
        if abs((a - th + math.pi) % (2 * math.pi) - math.pi) < .2: best = max(best, math.hypot(c.x, c.y))
    return best
ZT, NT, NZ = .985, 48, 24
def robe_layer(inner):
    me = bpy.data.meshes.new('Manto'); bm = bmesh.new(); grid = []; uvt = []
    for j in range(NZ + 1):
        t = j / NZ; row = []; op = .3 + .25 * t
        for i in range(NT + 1):
            u = i / NT; th = op + (2 * math.pi - 2 * op) * u
            rag = .5 + .5 * math.sin(th * 23) * math.sin(th * 7 + 1)
            zb = .015 + .07 * rag * (abs(math.cos(th)) > .3)
            z = ZT + (zb - ZT) * t
            rw = body_r(th, ZT) + .014; rh = .46 if math.cos(th) < -.3 else .38
            rl = rw + (rh - rw) * (t ** 1.3) + .018 * math.sin(th * 11 + t * 3) * t
            r = max(rl, body_r(th, z) + .03 + .02 * t) - (.006 if inner else 0)
            row.append(bm.verts.new((math.sin(th) * r, -math.cos(th) * r, z))); uvt.append((th, t))
        grid.append(row)
    for j in range(NZ):
        for i in range(NT):
            q = (grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i])
            bm.faces.new(q if inner else q[::-1])
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new('Manto', me); bpy.context.scene.collection.objects.link(o); me.materials.append(MAT['skirt'])
    for f in me.polygons: f.use_smooth = True
    def col(p, vi):
        th, t = uvt[vi]
        if inner: return (.05, .045, .055) if not kintsugi(p, 14, .03) else (.7, .52, .2)
        return (1, .8, .38) if kintsugi(p) else tuple(Vector((.92, .9, .86)) * (.92 + .08 * math.sin(th * 15)))
    paint(o, col)
    return o, uvt
MAT['skirt'].use_backface_culling = True
SKIRT = [robe_layer(False), robe_layer(True)]
# faixa escura na frente, com sóis de ouro
fr = []
for t in np.linspace(0, 1, 14):
    z = .95 - t * .9; q, n = surf(Vector((0, -.3, max(.5, z))), .02); q = Vector((0, min(q.y, -.12) - .05 * t, z)); fr.append(q)
OUTFIT.append((ribbon(fr, .19, .24, .01, 'skirt', 'Faixa', [Vector((0, -1, 0))] * len(fr), lambda t: (.05, .045, .055), sides=4), None))
for z in (.8, .55, .3):
    q = Vector((0, -.2, z)); q = fr[min(len(fr) - 1, int((.95 - z) / .9 * 13))] + Vector((0, -.012, 0)); OUTFIT.append((gem(q, .016), None))
    for k in range(8):
        a = k / 8 * 2 * math.pi; d = Vector((math.cos(a), 0, math.sin(a))); OUTFIT.append((spike(q + d * .015, d, .035 if k % 2 else .05, .005), None))
if VITIMA:                                                            # sem manto, asas, auréola, botas e enfeites
    for o, _ in OUTFIT + SKIRT: bpy.data.objects.remove(o)
    OUTFIT, SKIRT = [], []
    MAT['brow'].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.08, .05, .04, 1)
# ---------- 9) pesos, junta tudo e exporta ----------
GROUPS = sorted(set(MAP.values()) | {'AsaEsq', 'AsaDir'})
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
for o, fixed in OUTFIT: set_w(o, fixed if callable(fixed) else (lambda p, f=fixed: f) if fixed else near_w)
for o, uvt in SKIRT:
    def sw(p, o=o):
        t = max(0, min(1, (ZT - p.z) / ZT)); k = .3 * min(1, abs(p.x) / .2) * t
        return {'Hips': 1 - k, ('LeftUpperLeg' if p.x > 0 else 'RightUpperLeg'): k} if k > 0 else {'Hips': 1.}
    set_w(o, sw)
for o in [x for x in bpy.data.objects if x.type == 'MESH']:
    if 'Col' not in o.data.color_attributes: paint(o, lambda p, vi: (1, 1, 1))
    if 'inner' in o.data: del o.data['inner']
    if 'uvt' in o: del o['uvt']
bpy.ops.object.select_all(action='DESELECT')
for o in [x for x in bpy.data.objects if x.type == 'MESH']: o.select_set(True)
bpy.context.view_layer.objects.active = body; bpy.ops.object.join()
for a in bpy.data.actions:
    if a.name == '_01a15ab5_eeba_71ae_a438_b85a938940fc': a.name = 'Idle'     # o jogo procura "idle" no Anjo-Guia
print('Anjo: vértices', len(body.data.vertices), 'faces', len(body.data.polygons))
body.parent = arm; md = body.modifiers.new('Armature', 'ARMATURE'); md.object = arm
for a in [a for a in bpy.data.actions if a.name.endswith('.001')]: bpy.data.actions.remove(a)   # cópias por objeto do importador
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='ACTIONS')
