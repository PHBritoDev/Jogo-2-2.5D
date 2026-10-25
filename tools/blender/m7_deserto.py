# MOD 209 — Marco 7: o deserto ritual do Ato VI.
# Gera DesertoKit.glb com objetos nomeados:
#   Estatua (colosso encapuzado de ~38 m, de pé sobre um pedestal octogonal, com coroa de espinhos dourada e a esfera
#   de ouro com quatro encaixes nas mãos; runas acesas no pedestal), Fragmento (cristal espacial facetado), PortalMisterioso (anel de pedra flutuante com
#   monólitos tortos), PortalAnjos (portal enorme ladeado por duas estátuas de anjo de asas abertas, sombrias),
#   Rocha, Ossada (costelas gigantes meio enterradas) e Cacto.
# Uso: python m7_deserto.py <saída.glb>
import bpy, bmesh, math, random, sys
from mathutils import Vector, noise
OUT = sys.argv[-1]
random.seed(51)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def mat(name, rough=.85, emit=None, strength=0.0, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    a = m.node_tree.nodes.new('ShaderNodeVertexColor'); a.layer_name = 'Col'
    m.node_tree.links.new(a.outputs['Color'], b.inputs['Base Color'])
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = strength
    return m
STONE = mat('Arenito'); GOLD = mat('OuroVelho', .35, None, 0, .8); CRYSTAL = mat('Cristal', .1, (.6, .4, 1.0), 3.0); RUNE = mat('Runa', .5, (1.0, .45, .15), 4.0); DARKM = mat('PedraNegra', .7)

def tint(o, base, dirt=.3, scale=.35, m=None):
    me = o.data
    if 'Col' not in me.color_attributes: me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    col = me.color_attributes['Col']; mw = o.matrix_world
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = mw @ me.vertices[me.loops[li].vertex_index].co
            n = noise.noise(v * scale) * .5 + .5; k = 1 - dirt * n
            col.data[li].color = (base[0] * k, base[1] * k, base[2] * k, 1)
    me.materials.clear(); me.materials.append(m or STONE)
parts = []
def add(o, color, dirt=.3, m=None): tint(o, color, dirt, m=m); parts.append(o); return o
def box(sx, sy, sz, loc, color, rot=(0, 0, 0), dirt=.3, m=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); return add(o, color, dirt, m)
def cyl(r, h, loc, color, verts=16, r2=None, rot=(0, 0, 0), dirt=.3, m=None):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=h, location=loc, rotation=rot)
    return add(bpy.context.object, color, dirt, m)
def sphere(r, loc, color, scale=(1, 1, 1), seg=16, m=None, dirt=.3):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(6, seg // 2), radius=r, location=loc); o = bpy.context.object; o.scale = scale
    bpy.ops.object.transform_apply(scale=True); return add(o, color, dirt, m)
def torus(R, r, loc, color, rot=(0, 0, 0), m=None, seg=40):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=seg, minor_segments=10, location=loc, rotation=rot)
    return add(bpy.context.object, color, .2, m)
def join(name):
    global parts
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join(); o = bpy.context.object; o.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); parts = []; return o
def robe(center, r_bottom, r_top, h, z0, color, segs=24, folds=7, lean=0.0):
    """Manto: tubo que estreita para cima, com dobras verticais (ruído) e barra irregular."""
    me = bpy.data.meshes.new('manto'); bm = bmesh.new(); rings = []; NZ = 10
    for j in range(NZ + 1):
        t = j / NZ; row = []
        for i in range(segs):
            a = i / segs * 2 * math.pi; r = (r_bottom + (r_top - r_bottom) * t) * (1 + .07 * math.sin(a * folds + j * .3))
            z = z0 + h * t - (0 if j else .3 * (noise.noise(Vector((math.cos(a) * 3, math.sin(a) * 3, 0))) + .5))
            row.append(bm.verts.new((center[0] + math.cos(a) * r + lean * t * h, center[1] + math.sin(a) * r, z)))
        rings.append(row)
    for j in range(NZ):
        for i in range(segs): bm.faces.new((rings[j][i], rings[j][(i + 1) % segs], rings[j + 1][(i + 1) % segs], rings[j + 1][i]))
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new('manto', me); sc.collection.objects.link(o)
    for p in o.data.polygons: p.use_smooth = True
    return add(o, color, .35)

SAND = (.72, .58, .40); SANDDARK = (.52, .40, .27); BLACKSTONE = (.12, .1, .1); BONE = (.82, .76, .64); GOLDC = (.85, .62, .22)

# ---------- Estátua: colosso encapuzado de pé, coroa de espinhos e a esfera com quatro encaixes ----------
def lathe(profile, loc, color, segs=32, m=None, dirt=.3):
    """Sólido de revolução a partir de (raio, altura)."""
    me = bpy.data.meshes.new('torno'); bm = bmesh.new(); rings = []
    for (r, z) in profile:
        rings.append([bm.verts.new((loc[0] + math.cos(i / segs * 2 * math.pi) * r, loc[1] + math.sin(i / segs * 2 * math.pi) * r, loc[2] + z)) for i in range(segs)])
    for j in range(len(rings) - 1):
        for i in range(segs): bm.faces.new((rings[j][i], rings[j][(i + 1) % segs], rings[j + 1][(i + 1) % segs], rings[j + 1][i]))
    bm.faces.new(rings[-1][::-1])
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new('torno', me); sc.collection.objects.link(o)
    for p in o.data.polygons: p.use_smooth = True
    return add(o, color, dirt, m)
def limb(a, b, r0, r1, color, verts=12):
    a, b = Vector(a), Vector(b); d = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r0, radius2=r1, depth=d.length, location=(a + b) / 2)
    o = bpy.context.object; o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    bpy.ops.object.transform_apply(rotation=True); 
    for p in o.data.polygons: p.use_smooth = True
    return add(o, color, .3)
ROBE = (.5, .39, .27); ROBE2 = (.42, .32, .22)
# Pedestal octogonal em degraus, com runas acesas.
for k in range(4): cyl(15 - k * 2.2, 1.3, (0, 0, .65 + k * 1.3), SANDDARK if k % 2 else SAND, verts=8)
for i in range(16):
    a = i / 16 * 2 * math.pi + math.pi / 16; box(.7, .12, 1.0, (math.cos(a) * 14.2, math.sin(a) * 14.2, 1.0), (1, .5, .2), rot=(0, 0, a + math.pi / 2), m=RUNE, dirt=0)
Z0 = 5.2
# Manto: abre embaixo, com dobras fundas; faixa dourada na barra.
robe((0, 0), 7.2, 3.4, 16, Z0, ROBE, segs=40, folds=11)
torus(6.95, .25, (0, 0, Z0 + .6), GOLDC, m=GOLD, seg=48)
lathe([(3.4, 0), (4.6, 2.4), (5.0, 4.2), (4.2, 6.4), (2.2, 7.6), (0.01, 7.9)], (0, 0, Z0 + 15.6), ROBE2, segs=36)   # ombros/manto curto
# Capuz alto e liso, com a abertura escura do rosto e os olhos acesos.
lathe([(3.0, 0), (3.2, 1.6), (3.0, 3.6), (2.3, 5.4), (1.2, 6.6), (0.3, 7.4), (0.01, 7.6)], (0, .3, Z0 + 21.2), ROBE, segs=32)
sphere(1.9, (0, -1.9, Z0 + 23.6), (.03, .02, .02), scale=(1, .5, 1.3), dirt=0)
for sx in (-1, 1): sphere(.28, (sx * .75, -2.7, Z0 + 24.2), (1, .5, .2), m=RUNE, dirt=0, seg=10)
# Coroa de espinhos dourada sobre o capuz.
torus(2.7, .3, (0, .3, Z0 + 25.4), GOLDC, m=GOLD, seg=36)
for i in range(9):
    a = i / 9 * 2 * math.pi; cyl(.32, 2.4 + (i % 2) * 1.2, (math.cos(a) * 2.7, .3 + math.sin(a) * 2.7, Z0 + 26.6 + (i % 2) * .6), GOLDC, verts=6, r2=0, m=GOLD)
# Braços: dos ombros ao cotovelo e mãos em concha segurando a esfera à frente do peito.
ORB = Vector((0, -6.8, Z0 + 15.6))
for sx in (-1, 1):
    sh = Vector((sx * 4.3, -.2, Z0 + 20.2)); el = Vector((sx * 5.0, -3.4, Z0 + 15.8)); ha = ORB + Vector((sx * 3.2, .4, -1.4))
    limb(sh, el, 1.5, 1.25, ROBE2); limb(el, ha, 1.25, 1.0, ROBE2)
    sphere(1.2, tuple(ha), (.4, .3, .2), scale=(1, 1.3, .8))
sphere(3.3, tuple(ORB), GOLDC, m=GOLD, dirt=.2, seg=24)
for i in range(4):
    a = i / 4 * 2 * math.pi + math.pi / 4
    torus(.7, .17, (ORB.x + math.cos(a) * 2.4, ORB.y - 2.3, ORB.z + math.sin(a) * 2.4), (.15, .1, .08), rot=(math.pi / 2, 0, 0), seg=16)
torus(3.45, .12, tuple(ORB), (1, .5, .2), rot=(math.pi / 2, 0, 0), m=RUNE)
estatua = join('Estatua')

# ---------- Fragmento espacial ----------
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=.5, location=(0, 0, .6)); o = bpy.context.object; o.scale = (.6, .6, 1.3)
bpy.ops.object.transform_apply(scale=True)
for v in o.data.vertices: v.co += v.co.normalized() * .08 * noise.noise(v.co * 9)
add(o, (.7, .5, 1.0), .1, m=CRYSTAL)
for i in range(3):
    a = i / 3 * 2 * math.pi; bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=0, radius=.16, location=(math.cos(a) * .55, math.sin(a) * .55, .35)); add(bpy.context.object, (.7, .5, 1.0), .1, m=CRYSTAL)
frag = join('Fragmento')

# ---------- Portal misterioso: anel flutuante de pedra negra com monólitos tortos ----------
torus(4.2, .55, (0, 0, 6.2), BLACKSTONE, rot=(math.pi / 2, 0, 0), m=DARKM, seg=48)
for i in range(12):
    a = i / 12 * 2 * math.pi; box(.4, .25, 1.0, (math.cos(a) * 4.2, -.55, 6.2 + math.sin(a) * 4.2), (.6, .4, 1.0), rot=(0, a, 0), m=CRYSTAL, dirt=0)
for i in range(5):
    a = (i / 5) * 2 * math.pi + .3; d = 7 + random.random() * 2.5; h = 5 + random.random() * 6
    box(1.2, 1.0, h, (math.cos(a) * d, math.sin(a) * d, h / 2 - .4), BLACKSTONE, rot=(random.uniform(-.25, .25), random.uniform(-.25, .25), a), m=DARKM)
cyl(5.5, .4, (0, 0, .2), SANDDARK, verts=24)
portalm = join('PortalMisterioso')

# ---------- Portal dos anjos: arco enorme ladeado por duas estátuas de anjo ----------
for sx in (-1, 1):
    box(3.2, 3.2, 26, (sx * 9, 0, 13), (.22, .2, .24), m=DARKM)
    cyl(2.2, 4, (sx * 9, 0, 28), (.22, .2, .24), verts=4, r2=0, m=DARKM)
torus(9, 1.5, (0, 0, 26), (.25, .22, .28), rot=(math.pi / 2, 0, 0), m=DARKM, seg=48)
box(21, 4.2, 1.6, (0, 0, .8), (.2, .18, .2), m=DARKM)
for sx in (-1, 1):                                                                                                        # anjos
    x0 = sx * 17
    box(5, 5, 3, (x0, 1, 1.5), (.3, .28, .3), m=DARKM)                                                                      # pedestal
    robe((x0, 1), 2.0, .9, 11, 3, (.34, .32, .36), folds=9)
    sphere(1.1, (x0, 1, 15.2), (.34, .32, .36))
    cyl(1.4, 1.2, (x0, 1, 16.0), (.3, .28, .32), verts=16, r2=.9)                                                          # capuz
    torus(1.3, .12, (x0, 1.4, 17.4), (.9, .85, .6), rot=(math.pi / 2.2, 0, 0), m=GOLD, seg=24)                              # auréola
    for side in (-1, 1):                                                                                                  # asas (penas em leque)
        for f in range(9):
            ang = .25 + f * .16; ln = 7 - abs(f - 4) * .55
            box(.35, .25, ln, (x0 + side * (1.2 + math.sin(ang) * ln * .5), 2.0, 11 + math.cos(ang) * ln * .5), (.4, .38, .42), rot=(0, side * -ang, 0), m=DARKM)
    box(.5, .5, 9, (x0 + sx * -1.6, -.4, 9.5), (.35, .33, .37), rot=(0, sx * .1, 0), m=DARKM)                               # espada apoiada
portala = join('PortalAnjos')

# ---------- Rocha, ossada e cacto ----------
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.6, location=(0, 0, .9)); o = bpy.context.object; o.scale = (1.4, 1, .8)
bpy.ops.object.transform_apply(scale=True)
for v in o.data.vertices: v.co += v.co.normalized() * .35 * noise.noise(v.co * 1.4)
add(o, (.6, .45, .32), .35); rocha = join('Rocha')
for i in range(7):
    bpy.ops.mesh.primitive_torus_add(major_radius=3.2 - abs(i - 3) * .3, minor_radius=.16, major_segments=20, minor_segments=6, location=(i * 1.1 - 3.3, 0, .2), rotation=(0, math.pi / 2, 0))
    o = bpy.context.object
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < -.1 and abs(v.co.x) < 99 and (o.matrix_world @ v.co).z < 0.0], context='VERTS'); bm.to_mesh(o.data); bm.free()
    add(o, BONE, .2)
cyl(.35, 9, (0, 0, .6), BONE, verts=8, rot=(0, math.pi / 2, 0), dirt=.2)
sphere(1.2, (5.5, 0, 1.0), BONE, scale=(1.4, 1, 1)); ossada = join('Ossada')
cyl(.35, 3.2, (0, 0, 1.6), (.28, .45, .25), verts=10, dirt=.2)
for sx in (-1, 1): cyl(.25, 1.4, (sx * .6, 0, 2.0), (.28, .45, .25), verts=8, dirt=.2); cyl(.25, .7, (sx * .35, 0, 1.4), (.28, .45, .25), verts=8, rot=(0, math.pi / 2, 0), dirt=.2)
cacto = join('Cacto')

for o in bpy.data.objects: o.location = (0, 0, 0)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True)
print('kit', [o.name for o in bpy.data.objects])
