# MOD 206 — Marco 4: o casaco de frio que o herói compra no caminho da cidade de neve (Ato III).
# Modelado sobre o próprio Protagonista: um sobretudo de couro que desce até os joelhos, com mangas, gola alta e
# barra de pele. O corpo do casaco é um tubo cujo raio, em cada altura e direção, acompanha o corpo (com folga);
# as mangas seguem os ossos dos braços. No jogo, cada vértice recebe os pesos do vértice mais próximo do corpo do
# herói (attachCoat), então o casaco dobra junto com qualquer animação.
# Uso: python m4_casaco.py <saída.glb>
import bpy, bmesh, os, sys, math
from mathutils import Vector, noise
OUT = sys.argv[-1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'Protagonista.glb'))
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
body = next(o for o in bpy.data.objects if o.type == 'MESH' and o.vertex_groups)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o is not body: bpy.data.objects.remove(o)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)

def bh(n):
    b = arm.data.bones.get('mixamorig' + n); return arm.matrix_world @ b.head_local
# O modelo vem girado: montamos um referencial próprio (UP = pés → pescoço, SIDE = ombro a ombro, FWD = frente).
feet = (bh('LeftFoot') + bh('RightFoot')) / 2
UP = (bh('Neck') - feet).normalized()
SIDE = bh('LeftShoulder') - bh('RightShoulder'); SIDE = (SIDE - UP * SIDE.dot(UP)).normalized()
FWD = UP.cross(SIDE).normalized()
AX = bh('Hips') - UP * (bh('Hips') - feet).dot(UP)  # pé do eixo vertical que passa pelo quadril
def local(p):
    d = p - AX; return d.dot(SIDE), d.dot(FWD), (p - feet).dot(UP)
def at(x, y, h): return AX + SIDE * x + FWD * y + UP * h

names = {g.index: g.name.replace('mixamorig', '') for g in body.vertex_groups}
mw = body.matrix_world
TORSO = {'Hips', 'Spine', 'Spine1', 'Spine2', 'LeftUpLeg', 'RightUpLeg', 'Neck', 'LeftShoulder', 'RightShoulder'}
pts = []
for v in body.data.vertices:
    best, w = None, 0
    for g in v.groups:
        if g.weight > w: best, w = names.get(g.group), g.weight
    if best in TORSO: pts.append(local(mw @ v.co))
H = (bh('Neck') - feet).dot(UP)
knee = (bh('LeftLeg') - feet).dot(UP); hips = (bh('Hips') - feet).dot(UP); shoulder = (bh('LeftArm') - feet).dot(UP); neck = H
print('alturas', round(knee, 3), round(hips, 3), round(shoulder, 3), round(neck, 3))

# ---------- corpo do casaco: tubo ajustado ----------
NA, NL = 36, 26
h0, h1 = knee + H * .02, neck - H * .015
levels = [h0 + (h1 - h0) * i / NL for i in range(NL + 1)]
band = (h1 - h0) / NL * 1.6
def radius(theta, h):
    ds = []
    for (x, y, z) in pts:
        if abs(z - h) > band: continue
        da = abs((math.atan2(y, x) - theta + math.pi) % (2 * math.pi) - math.pi)
        if da < .3: ds.append(math.hypot(x, y))
    if not ds: return None
    ds.sort(); return min(ds[int(len(ds) * .3)], H * .13)
grid = []
for h in levels:
    row = [radius(j / NA * 2 * math.pi, h) for j in range(NA)]
    good = [r for r in row if r]; avg = sum(good) / len(good) if good else H * .1
    row = [r if r else avg for r in row]
    for _ in range(3): row = [(row[j - 1] + row[j] * 2 + row[(j + 1) % NA]) / 4 for j in range(NA)]
    grid.append(row)
for _ in range(3):
    grid = [[(grid[max(0, i - 1)][j] + grid[i][j] * 2 + grid[min(NL, i + 1)][j]) / 4 for j in range(NA)] for i in range(NL + 1)]
me = bpy.data.meshes.new('Casaco'); bm = bmesh.new(); vs = []
for i, h in enumerate(levels):
    flare = 1 + .1 * max(0, (hips - h) / (hips - h0))  # a aba abre abaixo do quadril
    neckIn = 1 - .25 * max(0, (h - shoulder) / max(1e-6, h1 - shoulder))
    row = []
    for j in range(NA):
        th = j / NA * 2 * math.pi; r = grid[i][j] * flare * neckIn + H * .022
        row.append(bm.verts.new(at(math.cos(th) * r, math.sin(th) * r, h)))
    vs.append(row)
for i in range(NL):
    for j in range(NA):
        th = (j + .5) / NA * 2 * math.pi
        # Abertura na frente, abaixo da cintura (o sobretudo abre ao andar).
        if levels[i] < hips - H * .05 and abs((th - math.pi / 2 + math.pi) % (2 * math.pi) - math.pi) < .16: continue
        jj = (j + 1) % NA; bm.faces.new((vs[i][j], vs[i][jj], vs[i + 1][jj], vs[i + 1][j]))
bm.to_mesh(me); bm.free()
coat = bpy.data.objects.new('Casaco', me); bpy.context.scene.collection.objects.link(coat)

# ---------- mangas: tubos do ombro até o meio do antebraço ----------
def sleeve(side):
    a0 = bh(side + 'Arm'); a1 = bh(side + 'ForeArm'); a2 = bh(side + 'Hand'); end = a1 + (a2 - a1) * .7
    path = [a0 + (a1 - a0) * t for t in (0, .33, .66, 1)] + [a1 + (end - a1) * t for t in (.33, .66, 1)]
    sm = bpy.data.meshes.new('manga'); b = bmesh.new(); rings = []
    for k, c in enumerate(path):
        d = (path[min(len(path) - 1, k + 1)] - path[max(0, k - 1)]).normalized()
        u = d.cross(UP); u = u.normalized() if u.length > 1e-4 else SIDE; w2 = d.cross(u).normalized()
        r = H * (.075 - .018 * k / (len(path) - 1)) * (1.2 if k == len(path) - 1 else 1)
        rings.append([b.verts.new(c + (u * math.cos(q) + w2 * math.sin(q)) * r) for q in [i / 12 * 2 * math.pi for i in range(12)]])
    for k in range(len(rings) - 1):
        for i in range(12): b.faces.new((rings[k][i], rings[k][(i + 1) % 12], rings[k + 1][(i + 1) % 12], rings[k + 1][i]))
    b.to_mesh(sm); b.free(); o = bpy.data.objects.new('manga', sm); bpy.context.scene.collection.objects.link(o); return o
sleeves = [sleeve('Left'), sleeve('Right')]

# ---------- gola alta de pele ----------
bpy.ops.mesh.primitive_torus_add(major_radius=H * .08, minor_radius=H * .038, major_segments=30, minor_segments=10, location=at(0, 0, neck - H * .02))
ring = bpy.context.object; ring.rotation_mode = 'QUATERNION'; ring.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(UP)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=False)
c0 = at(0, 0, neck - H * .02)
for v in ring.data.vertices: v.co += (v.co - c0).normalized() * H * .008 * noise.noise(v.co * 60)

# Manto curto de pele sobre os ombros (por cima da capa do herói, para o casaco aparecer de longe).
bpy.ops.mesh.primitive_torus_add(major_radius=H * .12, minor_radius=H * .045, major_segments=36, minor_segments=10, location=at(0, -H * .005, shoulder + H * .005))
mantle = bpy.context.object; mantle.rotation_mode = 'QUATERNION'; mantle.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(UP)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=False)
c1 = at(0, -H * .005, shoulder + H * .005)
for v in mantle.data.vertices:
    d = v.co - c1; side = d.dot(SIDE); fwd = d.dot(FWD); up = d.dot(UP)
    v.co = c1 + SIDE * side * 1.25 + FWD * fwd * .9 + UP * (up - abs(side) * .25 - .0 ) + d.normalized() * H * .01 * noise.noise(v.co * 50)
bpy.ops.object.select_all(action='DESELECT')
for o in [coat, ring, mantle] + sleeves: o.select_set(True)
bpy.context.view_layer.objects.active = coat; bpy.ops.object.join(); coat = bpy.context.object
sol = coat.modifiers.new('s', 'SOLIDIFY'); sol.thickness = H * .008; sol.offset = 1; bpy.ops.object.modifier_apply(modifier='s')
for p in coat.data.polygons: p.use_smooth = True

# ---------- cores: couro escuro; pele clara na gola, na barra e nos punhos ----------
mat = bpy.data.materials.new('Casaco'); mat.use_nodes = True; bsdf = mat.node_tree.nodes['Principled BSDF']
bsdf.inputs['Roughness'].default_value = .85; bsdf.inputs['Metallic'].default_value = 0
vc = mat.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'; mat.node_tree.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
coat.data.materials.append(mat)
cm = coat.data; cm.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER'); col = cm.color_attributes['Col']
LEATHER = (.13, .08, .05); FUR = (.82, .76, .66)
ends = [bh(s + 'ForeArm') + (bh(s + 'Hand') - bh(s + 'ForeArm')) * .7 for s in ('Left', 'Right')]
for poly in cm.polygons:
    for li in poly.loop_indices:
        p = cm.vertices[cm.loops[li].vertex_index].co; h = (p - feet).dot(UP); n = noise.noise(p * 14) * .5 + .5
        fur = h > shoulder - H * .07 or h < h0 + H * .035 or any((p - e).length < H * .06 for e in ends)
        base = FUR if fur else LEATHER; k = (.85 + .2 * n) if fur else (.75 + .4 * n)
        col.data[li].color = (base[0] * k, base[1] * k, base[2] * k, 1)

# ---------- marcadores ----------
# O casaco sai sem esqueleto, em coordenadas do mundo, junto com quatro marcadores nas juntas (quadril, pescoço e
# ombros). O jogo leva os marcadores até as mesmas juntas do herói (pose de ligação), aplica essa transformação ao
# casaco, copia para cada vértice os pesos do vértice mais próximo do corpo e o liga ao mesmo esqueleto (attachCoat).
coat.parent = None; coat.matrix_world.identity()
marks = []
for n in ('Hips', 'Neck', 'LeftArm', 'RightArm', 'LeftUpLeg'):
    e = bpy.data.objects.new('M_' + n, None); e.location = bh(n); bpy.context.scene.collection.objects.link(e); marks.append(e)
bpy.data.objects.remove(body)
print('casaco: vértices', len(cm.vertices))
bpy.ops.object.select_all(action='DESELECT'); coat.select_set(True)
for e in marks: e.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_animations=False, export_skins=False, export_apply=True)
