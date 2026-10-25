# MOD 206 — Marco 4: kit da cidade de neve (Ato III).
# Gera NeveKit.glb com objetos nomeados:
#   CasaNeve (cabana de toras), CasaNeveB (sobrado com sacada), Estalagem (dois andares, placa e lampião),
#   Guilhotina (estrado, colunas, travessa e prancha com furo) + Lamina (a lâmina, animada à parte), Cama,
#   Balcao (balcão com canecas), Correntes (argolas e correntes de parede), Escada, Cristal (gelo), Estalactite,
#   BuracoGelo (buraco de pesca), Banquinho, VaraPesca, Lanterna (poste com lampião aceso) e Pinheiro.
# Telhados com camada grossa de neve e pingentes de gelo; janelas com luz quente (material emissivo "Brilho").
# Uso: python m4_kit_neve.py <saída.glb>
import bpy, bmesh, math, random, sys
from mathutils import Vector, noise
OUT = sys.argv[-1]
random.seed(23)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def mat(name, rough=.85, emit=None, strength=0.0, alpha=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = 0
    a = m.node_tree.nodes.new('ShaderNodeVertexColor'); a.layer_name = 'Col'
    m.node_tree.links.new(a.outputs['Color'], b.inputs['Base Color'])
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = strength
    return m
M = mat('Neve'); GLOW = mat('Brilho', .5, (1.0, .62, .25), 3.0); ICE = mat('Gelo', .12, (.35, .6, .9), .35)

def tint(o, base, dirt=.22, scale=1.6, dark=None, m=None):
    me = o.data
    if 'Col' not in me.color_attributes: me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    col = me.color_attributes['Col']; mw = o.matrix_world
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = mw @ me.vertices[me.loops[li].vertex_index].co
            n = noise.noise(v * scale) * .5 + .5; k = 1 - dirt * n
            if dark is not None: k *= .72 + .28 * min(1, max(0, v.z / dark))
            col.data[li].color = (base[0] * k, base[1] * k, base[2] * k, 1)
    me.materials.clear(); me.materials.append(m or M)

parts = []
def box(sx, sy, sz, loc, color, rot=(0, 0, 0), dirt=.22, bev=0, sub=0, dark=None, m=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bev: md = o.modifiers.new('b', 'BEVEL'); md.width = bev; md.segments = 1; bpy.ops.object.modifier_apply(modifier='b')
    if sub:
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.subdivide(number_cuts=sub); bpy.ops.object.mode_set(mode='OBJECT')
    tint(o, color, dirt, dark=dark, m=m); parts.append(o); return o

def cyl(r, h, loc, color, verts=10, rot=(0, 0, 0), r2=None, dirt=.2, m=None):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=h, location=loc, rotation=rot)
    o = bpy.context.object; tint(o, color, dirt, m=m); parts.append(o); return o

def join(name):
    global parts
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join(); o = bpy.context.object; o.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    parts = []; return o

LOG = (.27, .18, .12); LOG2 = (.33, .23, .15); STONE = (.46, .46, .48); SNOW = (.93, .95, .98); DOOR = (.30, .2, .12)
DARK = (.05, .05, .06); IRON = (.17, .17, .18); RED = (.42, .12, .1); ICEC = (.62, .82, .95); CLOTH = (.55, .5, .44)

def log_walls(w, d, H, z0, color=LOG):
    """Paredes de toras horizontais, com as pontas cruzadas nos cantos."""
    n = int(H / .28)
    for i in range(n):
        z = z0 + .14 + i * .28; c = color if i % 2 else LOG2
        for s in (-1, 1):
            cyl(.15, w + .5, (0, s * d / 2, z), c, verts=8, rot=(0, math.pi / 2, 0), dirt=.3)
            cyl(.15, d + .5, (s * w / 2, 0, z + .14), c, verts=8, rot=(math.pi / 2, 0, 0), dirt=.3)

def snowy_roof(w, d, h, z0, over=.6, icicles=True):
    """Telhado de duas águas de tábuas com camada grossa de neve e pingentes de gelo no beiral."""
    half = d / 2 + over; L = math.hypot(half, h); ang = math.atan2(h, half)
    for s in (-1, 1):
        box(w + over * 2, L, .18, (0, s * half / 2, z0 + h / 2), (.24, .16, .1), rot=(-s * ang, 0, 0), dirt=.3)
        sn = box(w + over * 2 + .1, L + .05, .32, (0, s * half / 2, z0 + h / 2 + .24), SNOW, rot=(-s * ang, 0, 0), dirt=.06, sub=3)
        for v in sn.data.vertices: v.co.z += noise.noise(Vector((v.co.x * .8, v.co.y * .8, 0))) * .06
        if icicles:
            for i in range(int((w + over * 2) / .35)):
                x = -(w + over * 2) / 2 + .2 + i * .35 + random.uniform(-.08, .08); ln = random.uniform(.15, .55)
                cyl(.05, ln, (x, s * (half - .05), z0 - .05 - ln / 2), ICEC, verts=5, r2=.005, rot=(0, 0, 0), dirt=.05, m=ICE)
    # Empenas de tábuas.
    for s in (-1, 1):
        me = bpy.data.meshes.new('empena'); bm = bmesh.new()
        a = bm.verts.new((s * w / 2, -d / 2, z0)); b = bm.verts.new((s * w / 2, d / 2, z0)); c = bm.verts.new((s * w / 2, 0, z0 + h))
        bm.faces.new((a, b, c) if s > 0 else (c, b, a)); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new('empena', me); sc.collection.objects.link(o); tint(o, LOG2, .3); parts.append(o)

def door(x, y, z0, w=.95, h=1.95):
    box(w + .24, .14, h + .16, (x, y - .04, z0 + h / 2 + .04), (.2, .13, .08), dirt=.1)
    box(w, .1, h, (x, y - .1, z0 + h / 2), DOOR, dirt=.35, sub=1)
    for z in (.4, h - .4): box(w * .9, .05, .08, (x, y - .17, z0 + z), IRON, dirt=.05)

def window(x, y, z, w=.7, h=.7, face='y'):
    if face == 'y':
        box(w, .06, h, (x, y - .05, z), (1, .78, .45), dirt=.05, m=GLOW)
        box(w + .18, .12, .12, (x, y - .08, z - h / 2 - .06), (.2, .13, .08), dirt=.1)
        box(w + .18, .12, .12, (x, y - .08, z + h / 2 + .06), (.2, .13, .08), dirt=.1)
        box(w + .3, .2, .1, (x, y - .14, z - h / 2 - .02), SNOW, dirt=.04)
        box(.06, .08, h, (x, y - .09, z), (.2, .13, .08), dirt=.1)
    else:
        box(.06, w, h, (x + .05, y, z), (1, .78, .45), dirt=.05, m=GLOW)
        box(.2, w + .3, .1, (x + .14, y, z - h / 2 - .02), SNOW, dirt=.04)

def chimney(x, y, z0, h, smoke=False):
    box(.65, .65, h, (x, y, z0 + h / 2), STONE, dirt=.35, sub=2)
    box(.8, .8, .14, (x, y, z0 + h), STONE, dirt=.2)
    box(.82, .82, .12, (x, y, z0 + h + .1), SNOW, dirt=.04)

def snow_drift(w, d, z=0):
    sn = box(w, d, .3, (0, 0, z + .1), SNOW, dirt=.05, sub=4)
    for v in sn.data.vertices:
        e = max(abs(v.co.x) / (w / 2), abs(v.co.y) / (d / 2)); v.co.z = (v.co.z if v.co.z > 0 else -.05) * (1 - e ** 4) + noise.noise(v.co * 2) * .04

# ---------- CasaNeve: cabana de toras ----------
w, d, H = 5.0, 4.2, 2.5
box(w + .4, d + .4, .45, (0, 0, .22), STONE, dirt=.35, sub=2)
log_walls(w, d, H, .45)
snowy_roof(w, d, 2.0, .45 + H)
door(-.9, -d / 2 - .1, .45); window(1.25, -d / 2 - .12, 1.7); window(-w / 2 - .1, .2, 1.7, face='x')
chimney(1.6, .9, .45 + H, 2.6)
box(1.3, 1.0, .3, (-.9, -d / 2 - .75, .15), STONE, dirt=.4)
for i in range(3): box(.5, .5, .5, (w / 2 + .5, -1 + i * .55, .25 + (i % 2) * .5), (.36, .26, .16), dirt=.3)  # lenha
box(1.0, 1.6, .25, (w / 2 + .5, -.45, 1.1), SNOW, dirt=.04)
casa = join('CasaNeve')

# ---------- CasaNeveB: sobrado com sacada ----------
w, d, H = 4.6, 4.4, 2.4
box(w + .4, d + .4, .45, (0, 0, .22), STONE, dirt=.35, sub=2)
box(w, d, H, (0, 0, .45 + H / 2), STONE, dirt=.35, sub=3, dark=1.4)
log_walls(w + .2, d + .2, 2.3, .45 + H)
snowy_roof(w + .2, d + .2, 2.2, .45 + H + 2.3)
door(.8, -d / 2 - .02, .45); window(-1.1, -d / 2 - .03, 1.5)
window(-1.0, -(d + .2) / 2 - .12, .45 + H + 1.2); window(1.0, -(d + .2) / 2 - .12, .45 + H + 1.2)
box(w * .8, .9, .12, (0, -d / 2 - .5, .45 + H + .05), (.24, .16, .1), dirt=.25)  # sacada
box(w * .8, .1, .6, (0, -d / 2 - .95, .45 + H + .38), (.24, .16, .1), dirt=.25)
box(w * .8 + .1, 1.0, .14, (0, -d / 2 - .5, .45 + H + .72), SNOW, dirt=.04)
chimney(-1.4, 1.1, .45 + H + 2.3, 2.2)
casaB = join('CasaNeveB')

# ---------- Estalagem: grande, dois andares, placa e lampião ----------
w, d, H = 8.0, 6.0, 2.6
box(w + .5, d + .5, .5, (0, 0, .25), STONE, dirt=.35, sub=2)
log_walls(w, d, H, .5)
box(w + .5, d + .5, .25, (0, 0, .5 + H + .12), (.24, .16, .1), dirt=.25)
log_walls(w, d, 2.4, .5 + H + .25)
snowy_roof(w, d, 2.6, .5 + H + .25 + 2.4)
door(0, -d / 2 - .1, .5, w=1.4, h=2.2)
for x in (-2.6, 2.6): window(x, -d / 2 - .12, 1.8, w=1.0)
for x in (-2.6, 0, 2.6): window(x, -d / 2 - .12, .5 + H + 1.4, w=.9)
for y in (-1.4, 1.4): window(-w / 2 - .1, y, 1.8, face='x')
chimney(2.8, 1.6, .5 + H + 2.65, 3.0); chimney(-2.8, -1.4, .5 + H + 2.65, 2.4)
box(2.4, .9, .3, (0, -d / 2 - .8, .15), STONE, dirt=.4)
box(.12, 1.4, .12, (1.3, -d / 2 - .7, .5 + H + .05), IRON, dirt=.05)  # braço da placa
box(1.5, .1, .8, (1.6, -d / 2 - 1.3, .5 + H - .55), (.42, .3, .18), dirt=.3)
cyl(.22, .3, (1.6, -d / 2 - 1.36, .5 + H - .55), (.95, .9, .8), verts=12, rot=(math.pi / 2, 0, 0), m=GLOW)  # caneca pintada na placa
cyl(.12, .35, (-1.0, -d / 2 - .3, 2.4), (1, .8, .45), verts=8, m=GLOW)  # lampião
box(.3, .3, .06, (-1.0, -d / 2 - .3, 2.62), IRON)
estalagem = join('Estalagem')

# ---------- Guilhotina e lâmina ----------
box(3.6, 2.6, .9, (0, 0, .45), (.3, .21, .13), dirt=.3, sub=1)
for i in range(4): box(.9, .35, .22, (0, -1.5 - i * .3, .9 - (i + 1) * .2), (.3, .21, .13), dirt=.3)  # escada
for x in (-.55, .55): box(.22, .22, 4.4, (x, .5, .9 + 2.2), (.32, .22, .14), dirt=.25)
box(1.5, .3, .3, (0, .5, .9 + 4.4), (.32, .22, .14), dirt=.25)
for x in (-.55, .55): box(.08, .08, 4.0, (x * .8, .38, .9 + 2.2), IRON, dirt=.05)  # trilhos
pr = box(1.3, .22, .55, (0, .5, 1.45), (.26, .18, .11), dirt=.3)  # prancha (lunette)
cyl(.2, .25, (0, .5, 1.45), DARK, verts=14, rot=(math.pi / 2, 0, 0), dirt=.02)
box(1.6, .5, .25, (0, .2, 1.05), (.26, .18, .11), dirt=.3)  # prancha onde o condenado deita
cyl(.4, .45, (0, 1.15, 1.12), (.32, .26, .16), verts=10, r2=.48, dirt=.35)  # cesto
cyl(.02, 3.4, (.75, .5, 3.2), (.6, .55, .4), verts=4)  # corda
box(.3, .3, .9, (.75, .55, 1.35), (.32, .22, .14), dirt=.25)
for x in (-.55, .55): box(.3, .3, .1, (x, .5, .9 + 4.4 + .2), SNOW, dirt=.04)
guil = join('Guilhotina')
me = bpy.data.meshes.new('lamina'); bm = bmesh.new()
pts = [(-.5, 0), (.5, 0), (.5, .55), (-.5, .2)]
vb = [bm.verts.new((x, -.03, z)) for x, z in pts]; vf = [bm.verts.new((x, .03, z)) for x, z in pts]
bm.faces.new(vb[::-1]); bm.faces.new(vf)
for i in range(4): bm.faces.new((vb[i], vb[(i + 1) % 4], vf[(i + 1) % 4], vf[i]))
bm.to_mesh(me); bm.free(); lam = bpy.data.objects.new('lamina', me); sc.collection.objects.link(lam); tint(lam, (.62, .64, .68), .1); parts.append(lam)
box(1.1, .12, .25, (0, 0, .67), (.32, .22, .14), dirt=.2)
lamina = join('Lamina')

# ---------- Interior: cama, balcão, correntes, escada ----------
box(1.1, 2.1, .3, (0, 0, .45), (.3, .2, .12), dirt=.3)
for x in (-.5, .5):
    for y in (-1, 1): box(.1, .1, .5, (x, y, .25), (.3, .2, .12), dirt=.2)
box(1.4 * .72, 2.0, .18, (0, .02, .69), (.75, .72, .66), dirt=.15, sub=1)
box(.6, .35, .12, (0, .78, .82), (.88, .86, .8), dirt=.1)
box(1.0, 1.2, .1, (0, -.35, .8), (.45, .16, .14), dirt=.2, sub=1)  # cobertor
box(1.2, .12, 1.1, (0, 1.06, .75), (.3, .2, .12), dirt=.3)  # cabeceira
cama = join('Cama')
box(3.2, .8, 1.05, (0, 0, .52), (.32, .22, .14), dirt=.3, sub=1)
box(3.4, .95, .1, (0, 0, 1.08), (.38, .26, .16), dirt=.2)
for i in range(4): cyl(.07, .16, (-1.1 + i * .7, -.1, 1.21), (.6, .58, .5), verts=8)
cyl(.32, .6, (1.9, .2, .3), (.35, .24, .14), verts=10)
balcao = join('Balcao')
box(.5, .1, .2, (0, 0, 2.3), IRON, dirt=.05)
for sx in (-.45, .45):
    for j in range(8): cyl(.05, .015, (sx, -.08, 2.2 - j * .13), IRON, verts=8, rot=(math.pi / 2 if j % 2 else 0, 0, 0))
    cyl(.1, .06, (sx, -.08, 1.15), IRON, verts=10, rot=(math.pi / 2, 0, 0))
correntes = join('Correntes')
for i in range(8): box(1.2, .32, .2, (0, i * .32, .1 + i * .25), (.32, .22, .14), dirt=.3)
for x in (-.62, .62): box(.08, 2.8, .08, (x, 1.1, 2.1), (.26, .18, .11), rot=(-.66, 0, 0), dirt=.2)
escada = join('Escada')

# ---------- Gelo: cristal e estalactite ----------
for i in range(7):
    a = i / 7 * 6.28 + random.uniform(-.3, .3); tilt = random.uniform(.15, .55); h = random.uniform(.7, 2.0)
    o = cyl(random.uniform(.12, .25), h, (math.cos(a) * .25, math.sin(a) * .25, h / 2 * math.cos(tilt)), ICEC, verts=6, r2=.01, rot=(math.sin(a) * tilt, -math.cos(a) * tilt, 0), dirt=.15, m=ICE)
cyl(.35, 1.6, (0, 0, .8), ICEC, verts=6, r2=.02, dirt=.12, m=ICE)
cristal = join('Cristal')
for i in range(4): cyl(random.uniform(.08, .2), random.uniform(.6, 1.6), (random.uniform(-.3, .3), random.uniform(-.3, .3), -.5), ICEC, verts=6, r2=.005, rot=(math.pi, 0, 0), m=ICE)
estalactite = join('Estalactite')

# ---------- Pesca no gelo ----------
cyl(.75, .08, (0, 0, .04), (.86, .9, .96), verts=20, r2=.65, dirt=.05)
cyl(.55, .02, (0, 0, .06), (.03, .08, .12), verts=20, dirt=.02)
for i in range(9):
    a = i / 9 * 6.28; box(.25, .18, .1, (math.cos(a) * .72, math.sin(a) * .72, .07), (.82, .9, .97), rot=(0, 0, a), dirt=.06, m=ICE)
buraco = join('BuracoGelo')
cyl(.22, .06, (0, 0, .45), (.35, .24, .14), verts=10)
for a in (0, 2.1, 4.2): box(.05, .05, .45, (math.cos(a) * .15, math.sin(a) * .15, .22), (.3, .2, .12), rot=(math.sin(a) * .2, -math.cos(a) * .2, 0))
banco = join('Banquinho')
cyl(.015, 1.8, (0, .7, .9), (.35, .26, .16), verts=5, rot=(.9, 0, 0))
cyl(.004, .9, (0, 1.45, .7), (.85, .85, .8), verts=3)
cyl(.05, .07, (0, .15, .5), (.2, .2, .2), verts=8, rot=(0, math.pi / 2, 0))
vara = join('VaraPesca')

# ---------- Lanterna (poste) e pinheiro nevado ----------
box(.16, .16, 2.6, (0, 0, 1.3), (.2, .14, .09), dirt=.2)
box(.6, .08, .08, (.25, 0, 2.55), IRON)
cyl(.14, .32, (.5, 0, 2.3), (1, .8, .45), verts=8, m=GLOW)
cyl(.2, .12, (.5, 0, 2.5), IRON, verts=8, r2=.05)
box(.25, .25, .06, (0, 0, 2.63), SNOW, dirt=.03)
lanterna = join('Lanterna')
cyl(.22, 1.4, (0, 0, .7), (.28, .19, .12), verts=8)
for i, (r, z) in enumerate(((1.9, 1.5), (1.55, 2.6), (1.15, 3.6), (.75, 4.5))):
    cyl(r, 1.6, (0, 0, z + .5), (.1, .2, .14), verts=10, r2=.05, dirt=.25)
    cyl(r * .92, .7, (0, 0, z + .85), SNOW, verts=10, r2=r * .35, dirt=.05)
pinheiro = join('Pinheiro')

for o in bpy.data.objects: o.location = (0, 0, 0)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True)
print('kit', [o.name for o in bpy.data.objects])
