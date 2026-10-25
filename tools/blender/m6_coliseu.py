# MOD 208 — Marco 6: o coliseu demoníaco do Ato V (torneio que decide o próximo Bispo).
# Gera Coliseu.glb com objetos nomeados:
#   Coliseu (arena de areia escura, muro do pódio com espinhos, arquibancada em degraus, muralha externa com três
#   andares de arcos, quatro portões, mastros com estandartes rasgados e o camarote do juiz; ~72 m de diâmetro),
#   Espectador (silhueta de demônio curvado com chifres, ~70 triângulos, para instanciar milhares na arquibancada),
#   Estandarte e Braseiro.
# Uso: python m6_coliseu.py <saída.glb>
import bpy, bmesh, math, random, sys
from mathutils import Vector, noise
OUT = sys.argv[-1]
random.seed(41)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def mat(name, rough=.85, emit=None, strength=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = 0
    a = m.node_tree.nodes.new('ShaderNodeVertexColor'); a.layer_name = 'Col'
    m.node_tree.links.new(a.outputs['Color'], b.inputs['Base Color'])
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = strength
    return m
STONE = mat('PedraRubra'); FIRE = mat('Brasa', .5, (1.0, .35, .08), 5.0); EYES = mat('Olhos', .5, (1.0, .15, .05), 6.0)

def tint(o, base, dirt=.3, scale=.5, m=None, dark=None):
    me = o.data
    if 'Col' not in me.color_attributes: me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    col = me.color_attributes['Col']; mw = o.matrix_world
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = mw @ me.vertices[me.loops[li].vertex_index].co
            n = noise.noise(v * scale) * .5 + .5; k = 1 - dirt * n
            if dark is not None: k *= .6 + .4 * min(1, max(0, v.z / dark))
            col.data[li].color = (base[0] * k, base[1] * k, base[2] * k, 1)
    me.materials.clear(); me.materials.append(m or STONE)

parts = []
def add(o, color, dirt=.3, m=None, dark=None): tint(o, color, dirt, m=m, dark=dark); parts.append(o); return o
def box(sx, sy, sz, loc, color, rot=(0, 0, 0), dirt=.3, m=None, dark=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); return add(o, color, dirt, m, dark)
def cyl(r, h, loc, color, verts=16, r2=None, rot=(0, 0, 0), dirt=.3, m=None):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=h, location=loc, rotation=rot)
    return add(bpy.context.object, color, dirt, m)
def ring(r_in, r_out, z0, h, color, segs=64, gaps=(), dirt=.3):
    """Anel sólido (muro), com aberturas em ângulos (portões)."""
    me = bpy.data.meshes.new('anel'); bm = bmesh.new()
    for i in range(segs):
        a0 = i / segs * 2 * math.pi; a1 = (i + 1) / segs * 2 * math.pi; am = (a0 + a1) / 2
        if any(abs((am - g + math.pi) % (2 * math.pi) - math.pi) < .09 for g in gaps): continue
        v = []
        for (r, z) in ((r_in, z0), (r_out, z0), (r_out, z0 + h), (r_in, z0 + h)):
            v.append(bm.verts.new((math.cos(a0) * r, math.sin(a0) * r, z))); v.append(bm.verts.new((math.cos(a1) * r, math.sin(a1) * r, z)))
        a, b, c, d, e, f, g, hh = v
        for q in ((a, b, d, c), (c, d, f, e), (e, f, hh, g), (g, hh, b, a), (a, c, e, g), (b, hh, f, d)): bm.faces.new(q)
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new('anel', me); sc.collection.objects.link(o); return add(o, color, dirt)
def join(name):
    global parts
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join(); o = bpy.context.object; o.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); parts = []; return o

RED = (.32, .12, .1); DARKRED = (.18, .07, .06); BONE = (.62, .56, .48); SAND = (.36, .28, .22); IRON = (.12, .11, .11); BLACK = (.06, .05, .05)
GATES = (0, math.pi / 2, math.pi, 3 * math.pi / 2)
ARENA = 16; SEAT_IN = 18; SEAT_OUT = 33; WALL = 36

# Arena (areia escura) e muro do pódio com espinhos.
cyl(ARENA, .3, (0, 0, .15), SAND, verts=64, dirt=.45)
ring(ARENA, SEAT_IN, 0, 2.6, DARKRED, gaps=GATES)
for i in range(48):
    a = i / 48 * 2 * math.pi
    if any(abs((a - g + math.pi) % (2 * math.pi) - math.pi) < .12 for g in GATES): continue
    cyl(.18, 1.2, (math.cos(a) * (ARENA + .3), math.sin(a) * (ARENA + .3), 3.1), BONE, verts=5, r2=.0, dirt=.2)
# Arquibancada: degraus subindo até a muralha.
STEPS = 9
for k in range(STEPS):
    r0 = SEAT_IN + k * (SEAT_OUT - SEAT_IN) / STEPS; r1 = r0 + (SEAT_OUT - SEAT_IN) / STEPS
    ring(r0, r1 + .05, 0, 2.6 + (k + 1) * 1.15, RED if k % 2 else DARKRED, gaps=GATES, dirt=.35)
# Muralha externa com três andares de arcos (pilastras e vãos escuros).
ring(SEAT_OUT, WALL, 0, 19, RED, gaps=GATES, dirt=.35)
for t in range(3):
    for i in range(40):
        a = (i + .5) / 40 * 2 * math.pi
        if any(abs((a - g + math.pi) % (2 * math.pi) - math.pi) < .14 for g in GATES): continue
        x, y = math.cos(a) * (WALL + .05), math.sin(a) * (WALL + .05)
        box(.25, 1.6, 3.6, (x, y, 2.4 + t * 5.6), BLACK, rot=(0, 0, a), dirt=.05)                 # vão do arco
        cyl(.8, .25, (x, y, 4.2 + t * 5.6), BLACK, verts=10, rot=(0, math.pi / 2, a), dirt=.05)   # topo arredondado
    ring(WALL - .2, WALL + .6, 5.6 * (t + 1) - .55, .5, DARKRED, gaps=GATES)
# Ameias com chifres no topo da muralha.
for i in range(64):
    a = i / 64 * 2 * math.pi
    if i % 2: box(1.4, 1.2, 1.4, (math.cos(a) * (WALL - 1.2), math.sin(a) * (WALL - 1.2), 19.7), DARKRED, rot=(0, 0, a))
    else: cyl(.35, 2.2, (math.cos(a) * (WALL - 1.2), math.sin(a) * (WALL - 1.2), 20.4), BONE, verts=6, r2=0, rot=(0, .25, a))
# Portões: arcos grandes com grade de ferro (o do norte fica aberto).
for g in GATES:
    x, y = math.cos(g), math.sin(g)
    for s in (-1, 1):
        px, py = x * (SEAT_OUT + 1.5) - y * s * 3.4, y * (SEAT_OUT + 1.5) + x * s * 3.4
        box(1.6, 1.6, 12, (px, py, 6), DARKRED, rot=(0, 0, g))
    box(8.4, 2.2, 1.8, (x * (SEAT_OUT + 1.5), y * (SEAT_OUT + 1.5), 12.6), DARKRED, rot=(0, 0, g))
    cyl(1.0, 2.6, (x * (SEAT_OUT + 2.6), y * (SEAT_OUT + 2.6), 13.6), BONE, verts=8, r2=0)              # crânio-chifre
    if abs(g - math.pi / 2) > .1:
        for k in range(6): box(.12, .12, 6.6, (x * (ARENA + 1) - y * (k - 2.5) * .9, y * (ARENA + 1) + x * (k - 2.5) * .9, 3.3), IRON, dirt=.05)
# Camarote do juiz (lado sul) com braseiros.
box(9, 4, 1.2, (0, -(SEAT_OUT - 3), 12.5), DARKRED); box(9.4, .4, 3, (0, -(SEAT_OUT - 5), 14.5), BLACK)
cyl(1.2, 6, (0, -(SEAT_OUT - 1), 17.5), DARKRED, verts=8, r2=.2)
# Mastros.
for i in range(8):
    a = i / 8 * 2 * math.pi + math.pi / 8; x, y = math.cos(a) * (WALL - .4), math.sin(a) * (WALL - .4)
    cyl(.15, 9, (x, y, 23.5), IRON, verts=6)
coliseu = join('Coliseu')

# Espectador (para instanciar): corpo curvado, cabeça, chifres e olhos acesos.
bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=5, radius=.42, location=(0, 0, .55)); o = bpy.context.object; o.scale = (1, .8, 1.25)
bpy.ops.object.transform_apply(scale=True); add(o, BLACK, .2)
bpy.ops.mesh.primitive_uv_sphere_add(segments=7, ring_count=4, radius=.24, location=(0, .12, 1.15)); add(bpy.context.object, BLACK, .2)
for s in (-1, 1): cyl(.06, .34, (s * .15, .1, 1.42), BONE, verts=4, r2=0, rot=(-.3, s * .5, 0), dirt=.1)
for s in (-1, 1): cyl(.04, .03, (s * .08, .33, 1.18), (1, .2, .05), verts=5, rot=(math.pi / 2, 0, 0), m=EYES, dirt=0)
esp = join('Espectador')

# Estandarte rasgado.
me = bpy.data.meshes.new('pano'); bm = bmesh.new(); W, H, NX, NY = 1.6, 4.2, 6, 10; grid = []
for j in range(NY + 1):
    row = []
    for i in range(NX + 1):
        x = -W / 2 + W * i / NX; z = -H * j / NY
        if j == NY and i % 2: z += .5
        row.append(bm.verts.new((x, .05 * math.sin(j * .8 + i), z)))
    grid.append(row)
for j in range(NY):
    for i in range(NX):
        if random.random() < .06 and j > 2: continue
        bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
bm.to_mesh(me); bm.free(); t = bpy.data.objects.new('pano', me); sc.collection.objects.link(t)
sol = t.modifiers.new('s', 'SOLIDIFY'); sol.thickness = .03; bpy.context.view_layer.objects.active = t; bpy.ops.object.modifier_apply(modifier='s')
add(t, (.45, .05, .05), .3)
box(1.9, .12, .12, (0, 0, 0), IRON, dirt=.05)
cyl(.32, .05, (0, .09, -1.2), (.85, .7, .3), verts=12, rot=(math.pi / 2, 0, 0), dirt=.1)     # selo dourado
estandarte = join('Estandarte')

# Braseiro.
cyl(.7, 1.2, (0, 0, .6), IRON, verts=8, r2=.35)
cyl(.85, .25, (0, 0, 1.25), DARKRED, verts=8)
cyl(.55, .9, (0, 0, 1.8), (1, .45, .1), verts=7, r2=.02, m=FIRE)
bras = join('Braseiro')

for o in bpy.data.objects: o.location = (0, 0, 0)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True)
print('kit', [o.name for o in bpy.data.objects])
