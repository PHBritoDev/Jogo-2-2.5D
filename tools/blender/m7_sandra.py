# MOD 209 — Marco 7: Sandra revelada (fim do Ato VI). A pessoa misteriosa tira o capuz: o roteiro pede "uma mulher
# com cabelo vermelho longo e olhos vermelhos". Parte do mesmo modelo (Misteriosa-rig.glb, com todos os clipes):
#   - o capuz é removido (vértices da cabeça acima do pescoço);
#   - o corpo fica mais estreito (tronco, braços e pernas apertados em volta do próprio osso);
#   - entra uma cabeça nova: rosto, olhos vermelhos acesos, franja e cabelo vermelho longo em mechas até a cintura;
#   - as mechas dobram com o corpo (pesos da cabeça no alto, do peito no meio e da coluna embaixo).
# Uso: python m7_sandra.py <saída.glb>
import bpy, bmesh, os, sys, math, random
from mathutils import Vector, noise
OUT = sys.argv[-1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'Misteriosa-rig.glb'))
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
body = next(o for o in bpy.data.objects if o.type == 'MESH' and o.vertex_groups)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o is not body: bpy.data.objects.remove(o)
B = lambda n: arm.data.bones[n]
def head_of(n): return arm.matrix_world @ B(n).head_local
def tail_of(n): return arm.matrix_world @ B(n).tail_local
neck = head_of('Neck'); headp = head_of('Head')
names = {g.index: g.name for g in body.vertex_groups}
mw = body.matrix_world; inv = mw.inverted()

# ---------- 1) tira o capuz e afina o corpo ----------
bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table()
deform = bm.verts.layers.deform.active
HEADS = {'Head', 'headfront', 'mixamorig:HeadTop_End'}
SLIM = {'Spine': .86, 'Chest': .84, 'UpperChest': .84, 'Hips': .88, 'LeftShoulder': .85, 'RightShoulder': .85, 'LeftUpperArm': .8, 'RightUpperArm': .8,
        'LeftLowerArm': .82, 'RightLowerArm': .82, 'LeftUpperLeg': .86, 'RightUpperLeg': .86, 'LeftLowerLeg': .88, 'RightLowerLeg': .88, 'Neck': .85}
drop = []
for v in bm.verts:
    dv = v[deform]; best, w = None, 0
    for gi, wt in dv.items():
        if wt > w: best, w = names.get(gi), wt
    p = mw @ v.co
    if best in HEADS or (best == 'Neck' and p.z > neck.z + .045): drop.append(v); continue
    f = SLIM.get(best)
    if f:
        a, b = head_of(best), tail_of(best); d = b - a; t = max(0, min(1, (p - a).dot(d) / max(1e-6, d.length_squared))); c = a + d * t
        off = p - c
        if best in ('Spine', 'Chest', 'UpperChest', 'Hips', 'Neck'): off.z = 0   # o tronco afina só na horizontal
        v.co = inv @ (c + off * f)
bmesh.ops.delete(bm, geom=drop, context='VERTS'); bm.to_mesh(body.data); bm.free()
print('capuz removido:', len(drop), 'vértices')

# ---------- 2) cabeça nova (rosto, olhos, cabelo) ----------
def vc_mat(name, emit=None, strength=0, rough=.6):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = 0
    a = m.node_tree.nodes.new('ShaderNodeVertexColor'); a.layer_name = 'Col'; m.node_tree.links.new(a.outputs['Color'], b.inputs['Base Color'])
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = strength
    return m
SKIN = vc_mat('Pele', rough=.55); HAIR = vc_mat('Cabelo', rough=.45); EYE = vc_mat('Olhos', (1, .08, .05), 8)
parts = []
def paint(o, color, m, var=.12, scale=40):
    me = o.data; me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER'); col = me.color_attributes['Col']
    for poly in me.polygons:
        for li in poly.loop_indices:
            p = o.matrix_world @ me.vertices[me.loops[li].vertex_index].co; n = 1 - var * (noise.noise(p * scale) * .5 + .5)
            col.data[li].color = (color[0] * n, color[1] * n, color[2] * n, 1)
    me.materials.clear(); me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    parts.append(o); return o
def weight(o, fn):
    """fn(z) -> lista de (grupo, peso)."""
    for g in body.vertex_groups:
        if g.name not in o.vertex_groups: o.vertex_groups.new(name=g.name)
    for v in o.data.vertices:
        z = (o.matrix_world @ v.co).z
        for gname, wt in fn(z): o.vertex_groups[gname].add([v.index], wt, 'REPLACE')
HEADONLY = lambda z: [('Head', 1.0)]
def strand_w(z):
    if z > neck.z: return [('Head', 1.0)]
    uc = head_of('UpperChest').z; ch = head_of('Chest').z
    if z > uc: k = (z - uc) / max(1e-6, neck.z - uc); return [('Head', k), ('UpperChest', 1 - k)]
    if z > ch: k = (z - ch) / max(1e-6, uc - ch); return [('UpperChest', k), ('Chest', 1 - k)]
    return [('Chest', .6), ('Spine', .4)]
FRONT = Vector((0, -1, 0)); c = headp + Vector((0, -.005, .085))
# Rosto (oval) e pescoço.
bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=14, radius=.105, location=c); face = bpy.context.object; face.scale = (.78, .86, 1.08)
bpy.ops.object.transform_apply(scale=True); paint(face, (.93, .74, .63), SKIN, .05); weight(face, HEADONLY)
bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=.045, depth=.12, location=neck + Vector((0, -.005, .05))); nk = bpy.context.object; paint(nk, (.9, .72, .6), SKIN, .05)
weight(nk, lambda z: [('Head', .5), ('Neck', .5)])
# Olhos vermelhos acesos.
for sx in (-1, 1):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=.014, location=c + Vector((sx * .033, -.082, .012))); e = bpy.context.object; e.scale = (1.2, .5, .8)
    bpy.ops.object.transform_apply(scale=True); paint(e, (1, .1, .06), EYE, 0); weight(e, HEADONLY)
RED = (.52, .05, .035)
# Calota de cabelo (cobre o alto e a nuca) e franja.
bpy.ops.mesh.primitive_uv_sphere_add(segments=22, ring_count=14, radius=.114, location=c + Vector((0, .016, .012))); cap = bpy.context.object; cap.scale = (.9, 1.0, .98)
bpy.ops.object.transform_apply(scale=True)
bm = bmesh.new(); bm.from_mesh(cap.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < -.055 and v.co.z < .03], context='VERTS')   # abre o rosto
bm.to_mesh(cap.data); bm.free(); paint(cap, RED, HAIR, .45, 120); weight(cap, HEADONLY)
for i in range(7):
    x = -.06 + i * .02
    bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=.016, radius2=.002, depth=.07, location=c + Vector((x, -.088, .055 - abs(i - 3) * .006)), rotation=(math.pi + .35, 0, x * 2))
    paint(bpy.context.object, RED, HAIR, .2, 60); weight(bpy.context.object, HEADONLY)
# Mechas longas: das costas da cabeça até a cintura, e duas na frente dos ombros.
def strand(root, end, r0, segs=9, wobble=.02):
    me = bpy.data.meshes.new('mecha'); b2 = bmesh.new(); rings = []; d = end - root
    for k in range(segs + 1):
        t = k / segs; p = root + d * t + Vector((math.sin(t * 5 + root.x * 40) * wobble, 0, 0)); r = r0 * (1 - .75 * t)
        rings.append([b2.verts.new(p + Vector((math.cos(a) * r, math.sin(a) * r * .55, 0))) for a in [i / 6 * 2 * math.pi for i in range(6)]])
    for k in range(segs):
        for i in range(6): b2.faces.new((rings[k][i], rings[k][(i + 1) % 6], rings[k + 1][(i + 1) % 6], rings[k + 1][i]))
    b2.to_mesh(me); b2.free(); o = bpy.data.objects.new('mecha', me); bpy.context.scene.collection.objects.link(o)
    paint(o, (RED[0] * random.uniform(.85, 1.1), RED[1], RED[2]), HAIR, .2, 80); weight(o, strand_w)
waist = head_of('Hips').z + .06
for i in range(22):
    a = -1.35 + i / 21 * 2.7; root = c + Vector((math.sin(a) * .09, .05 + math.cos(a) * .045, .02 - abs(a) * .02))
    end = Vector((root.x * 1.35 + random.uniform(-.025, .025), .19 + random.uniform(0, .04), waist + random.uniform(-.08, .06)))
    strand(root, end, .036, segs=12, wobble=.03)
for sx in (-1, 1):
    root = c + Vector((sx * .085, -.02, -.01)); strand(root, Vector((sx * .12, -.11, head_of('UpperChest').z - .04)), .024)
# Junta tudo ao corpo (mesma pele/esqueleto).
bpy.ops.object.select_all(action='DESELECT')
for o in parts: o.select_set(True)
body.select_set(True); bpy.context.view_layer.objects.active = body; bpy.ops.object.join()
print('Sandra: vértices', len(body.data.vertices))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='ACTIONS')
