# MOD 204 — Marco 2: kit da Vila da Clareira (vila florestal de comércio arruinado).
# Gera VilaKit.glb com objetos nomeados: CasaA (térrea), CasaB (sobrado com andar saliente), CasaC (casa arruinada),
# Barraca (banca de feira com toldo rasgado), Poco, CorpoCoberto (corpo sob lençol, sem violência gráfica),
# Caixote, Barril e Cerca. Cores por vértice com manchas de sujeira; ~1–2 mil triângulos por casa.
# Uso: python m2_vila_kit.py <saída.glb>
import bpy, bmesh, math, random, sys
from mathutils import Vector, Matrix, noise
OUT = sys.argv[-1]
random.seed(11)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def mat(name, rough=.85):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = 0
    a = m.node_tree.nodes.new('ShaderNodeVertexColor'); a.layer_name = 'Col'
    m.node_tree.links.new(a.outputs['Color'], b.inputs['Base Color'])
    return m
M = mat('Vila')

def tint(o, base, dirt=.22, scale=1.6, dark=None):
    """Pinta todos os vértices com a cor base + manchas de sujeira (ruído) e escurecimento perto do chão."""
    me = o.data
    if 'Col' not in me.color_attributes: me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    col = me.color_attributes['Col']
    mw = o.matrix_world
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = mw @ me.vertices[me.loops[li].vertex_index].co
            n = noise.noise(v * scale) * .5 + .5
            k = 1 - dirt * n
            if dark is not None: k *= .72 + .28 * min(1, max(0, v.z / dark))
            col.data[li].color = (base[0] * k, base[1] * k, base[2] * k, 1)
    if not me.materials: me.materials.append(M)

parts = []
def box(sx, sy, sz, loc, color, rot=(0, 0, 0), dirt=.22, bev=0, sub=0, dark=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bev: md = o.modifiers.new('b', 'BEVEL'); md.width = bev; md.segments = 1; bpy.ops.object.modifier_apply(modifier='b')
    if sub:
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.subdivide(number_cuts=sub); bpy.ops.object.mode_set(mode='OBJECT')
    tint(o, color, dirt, dark=dark); parts.append(o); return o

def cyl(r, h, loc, color, verts=10, rot=(0, 0, 0), r2=None, dirt=.2):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=h, location=loc, rotation=rot)
    o = bpy.context.object; tint(o, color, dirt); parts.append(o); return o

def join(name):
    global parts
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join(); o = bpy.context.object; o.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    parts = []; return o

PLASTER = (.70, .62, .47); PLASTER2 = (.62, .57, .48); TIMBER = (.25, .17, .11); STONE = (.42, .40, .37); ROOF = (.36, .27, .18)
THATCH = (.46, .38, .24); DOOR = (.30, .21, .13); DARK = (.06, .05, .05); CLOTH = (.55, .48, .38); RED = (.45, .16, .12); IRON = (.18, .17, .16)

def gable_roof(w, d, h, z0, color, over=.45, thick=.22, sag=0.0):
    """Telhado de duas águas: duas placas inclinadas com beiral; cumeeira ao longo de X."""
    half = d / 2 + over; L = math.hypot(half, h); ang = math.atan2(h, half)
    for s in (-1, 1):
        o = box(w + over * 2, L, thick, (0, s * half / 2, z0 + h / 2), color, rot=(-s * ang, 0, 0), dirt=.35, sub=2)
        for v in o.data.vertices: v.co.z -= sag * math.sin(math.pi * (v.co.x / (w + over * 2) + .5))
    box(w + over * 2 + .1, .3, .3, (0, 0, z0 + h + .02), TIMBER, rot=(math.pi / 4, 0, 0), dirt=.1)

def gable_ends(w, d, h, z0, color):
    """Empenas triangulares nas pontas (paredes até a cumeeira)."""
    for s in (-1, 1):
        me = bpy.data.meshes.new('empena'); bm = bmesh.new()
        a = bm.verts.new((s * w / 2, -d / 2, z0)); b = bm.verts.new((s * w / 2, d / 2, z0)); c = bm.verts.new((s * w / 2, 0, z0 + h))
        bm.faces.new((a, b, c) if s > 0 else (c, b, a)); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new('empena', me); sc.collection.objects.link(o); tint(o, color); parts.append(o)

def framed_wall(w, d, H, z0, plaster, rails=True, braces=True):
    """Paredes de taipa com enxaimel: postes nos cantos e no meio, travessas e mãos-francesas."""
    box(w, d, H, (0, 0, z0 + H / 2), plaster, dirt=.3, sub=3, dark=z0 + 1.2)
    t = .16
    for x in (-w / 2, 0, w / 2):
        for y in (-d / 2, d / 2): box(t, t, H, (x, y, z0 + H / 2), TIMBER, dirt=.15)
    for y in (-d / 2 + .01, d / 2 - .01):
        for z in (z0 + .05, z0 + H - .05) + ((z0 + H * .55,) if rails else ()): box(w + t, t * .9, t, (0, y * 1.01, z), TIMBER, dirt=.12)
    for x in (-w / 2 + .01, w / 2 - .01):
        for z in (z0 + .05, z0 + H - .05): box(t * .9, d + t, t, (x * 1.01, 0, z), TIMBER, dirt=.12)
    if braces:
        for sx in (-1, 1):
            ang = math.atan2(H * .5, w * .25)
            box(math.hypot(w * .25, H * .5), t * .8, t * .8, (sx * w * .375, -d / 2 - .02, z0 + H * .3), TIMBER, rot=(0, sx * ang, 0), dirt=.1)

def door(x, y, z0, w=.9, h=1.85, broken=False):
    box(w + .22, .12, h + .14, (x, y - .04, z0 + h / 2 + .03), TIMBER, dirt=.1)
    d = box(w, .1, h, (x, y - .08, z0 + h / 2), DOOR, dirt=.4, sub=1)
    if broken: d.rotation_euler = (0, 0, -.5); d.location.x += .25; d.location.y -= .3
    for z in (.35, h - .35): box(w * .9, .05, .08, (x, y - .14, z0 + z), IRON, dirt=.05)

def window(x, y, z, w=.7, h=.6, boarded=False, shutter=True):
    box(w, .06, h, (x, y - .03, z), DARK, dirt=.05)
    box(w + .16, .1, .12, (x, y - .06, z - h / 2 - .06), TIMBER, dirt=.1)
    if boarded:
        for i in range(3): box(w + .25, .05, .13, (x, y - .1, z - h / 3 + i * h / 3), (.4, .32, .22), rot=(0, (i - 1) * .18, 0), dirt=.35)
    elif shutter:
        box(w / 2, .05, h, (x - w * .55, y - .12, z), DOOR, rot=(0, 0, .35), dirt=.4)
        box(w / 2, .05, h * .9, (x + w * .6, y - .2, z - .08), DOOR, rot=(0, .2, -.9), dirt=.45)  # pendurada e torta

def chimney(x, y, z0, h):
    box(.6, .6, h, (x, y, z0 + h / 2), STONE, dirt=.35, sub=2)
    box(.75, .75, .14, (x, y, z0 + h), STONE, dirt=.2)

# ---------- CasaA: térrea ----------
w, d, H = 5.0, 4.0, 2.6
box(w + .3, d + .3, .5, (0, 0, .25), STONE, dirt=.35, sub=2)
framed_wall(w, d, H, .5, PLASTER)
gable_ends(w, d, 1.7, .5 + H, PLASTER)
gable_roof(w, d, 1.7, .5 + H, THATCH, sag=.12)
door(-.9, -d / 2, .5); window(1.2, -d / 2, 1.85, boarded=True); window(-w / 2 - .01, 0, 1.85)
chimney(1.6, .9, .5 + H, 2.2)
box(1.2, .9, .35, (-.9, -d / 2 - .6, .17), STONE, dirt=.4)  # degrau
casaA = join('CasaA')

# ---------- CasaB: sobrado com andar saliente ----------
w, d, H = 4.4, 4.2, 2.4
box(w + .3, d + .3, .45, (0, 0, .22), STONE, dirt=.35, sub=2)
framed_wall(w, d, H, .45, PLASTER2, braces=False)
for x in (-w / 2 + .3, 0, w / 2 - .3): box(.18, .7, .18, (x, -d / 2 - .3, .45 + H), TIMBER, dirt=.1)  # vigas do balanço
framed_wall(w + .2, d + .7, 2.2, .45 + H + .1, PLASTER)
gable_ends(w + .2, d + .7, 1.9, .45 + H + 2.3, PLASTER)
gable_roof(w + .2, d + .7, 1.9, .45 + H + 2.3, ROOF, sag=.08)
door(.7, -d / 2, .45); window(-1.1, -d / 2, 1.6, shutter=True)
window(-1.0, -(d + .7) / 2, .45 + H + 1.25, boarded=False); window(1.0, -(d + .7) / 2, .45 + H + 1.25, boarded=True)
chimney(-1.4, 1.0, .45 + H + 2.3, 2.0)
box(1.6, .6, .1, (-1.1, -d / 2 - .45, 2.6), TIMBER, dirt=.2)  # placa sem letreiro, de comércio fechado
casaB = join('CasaB')

# ---------- CasaC: arruinada (telhado caído, parede quebrada) ----------
w, d, H = 4.6, 3.6, 2.2
box(w + .3, d + .3, .45, (0, 0, .22), STONE, dirt=.4, sub=2)
box(w, .3, H, (0, d / 2, .45 + H / 2), PLASTER2, dirt=.45, sub=3)
box(.3, d, H * .75, (-w / 2, 0, .45 + H * .375), PLASTER2, dirt=.45, sub=2)
box(.3, d * .6, H * .45, (w / 2, d * .2, .45 + H * .22), PLASTER2, dirt=.5, sub=2)
box(w * .45, .3, H * .6, (-w * .27, -d / 2, .45 + H * .3), PLASTER2, dirt=.5, sub=2)
for x in (-w / 2, w / 2):
    for y in (-d / 2, d / 2): box(.16, .16, H * (.6 + .4 * random.random()), (x, y, .45 + H * .4), TIMBER, dirt=.2)
o = box(w + .6, 2.4, .2, (.3, .3, 1.3), ROOF, rot=(.55, .25, .1), dirt=.45, sub=2)  # telhado desabado
for i in range(6): box(.18, .18, 1.2 + random.random(), (random.uniform(-1.5, 1.5), random.uniform(-1.2, 1), .55), TIMBER, rot=(random.uniform(-.4, .4), 1.4, random.uniform(0, 3)), dirt=.2)
for i in range(9): box(.4, .3, .25, (random.uniform(-2, 2), random.uniform(-1.6, 1.6), .58), STONE, rot=(0, 0, random.uniform(0, 3)), dirt=.3)
casaC = join('CasaC')

# ---------- Barraca: feira arruinada ----------
box(2.4, .9, .1, (0, 0, .85), (.42, .31, .2), dirt=.35)
for x in (-1.1, 1.1):
    for y in (-.38, .38): box(.1, .1, .85, (x, y, .42), TIMBER, dirt=.1)
for x in (-1.15, 1.15): box(.12, .12, 2.2, (x, .45, 1.1), TIMBER, dirt=.1); box(.12, .12, 1.8, (x, -.5, .9), TIMBER, dirt=.1)
# toldo rasgado: grade com buracos e bordas caídas
me = bpy.data.meshes.new('toldo'); bm = bmesh.new(); NX, NY = 12, 6; grid = []
for j in range(NY + 1):
    row = []
    for i in range(NX + 1):
        x = -1.3 + 2.6 * i / NX; y = -.75 + 1.5 * j / NY; z = 2.05 - .45 * (1 - j / NY) + random.uniform(-.04, .04)
        if j == 0: z -= random.uniform(.0, .35)
        row.append(bm.verts.new((x, y, z)))
    grid.append(row)
for j in range(NY):
    for i in range(NX):
        if random.random() < .12 and 0 < j < NY - 1: continue  # rasgos
        bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
bm.to_mesh(me); bm.free(); t = bpy.data.objects.new('toldo', me); sc.collection.objects.link(t)
sol = t.modifiers.new('s', 'SOLIDIFY'); sol.thickness = .03
bpy.context.view_layer.objects.active = t; bpy.ops.object.modifier_apply(modifier='s'); tint(t, (.52, .3, .2), .4); parts.append(t)
for i in range(3): cyl(.28, .26, (-.75 + i * .75, 0, 1.03), (.38, .27, .16), verts=9, r2=.34)
for i in range(2): box(.55, .45, .4, (-.7 + i * 1.5, .9, .2), (.4, .3, .19), rot=(0, 0, random.uniform(-.3, .3)), dirt=.35)
barraca = join('Barraca')

# ---------- Poço ----------
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=.95, depth=.85, location=(0, 0, .42)); o = bpy.context.object
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.subdivide(number_cuts=2); bpy.ops.object.mode_set(mode='OBJECT')
sol = o.modifiers.new('s', 'SOLIDIFY'); sol.thickness = .22; bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='s'); tint(o, STONE, .45); parts.append(o)
cyl(.8, .05, (0, 0, .5), DARK, verts=16)
for x in (-.9, .9): box(.14, .14, 2.0, (x, 0, 1.0), TIMBER, dirt=.1)
box(2.0, .1, .1, (0, 0, 1.65), TIMBER, dirt=.1)
gable_roof(1.6, 1.4, .55, 2.0, ROOF, over=.25, thick=.12)
cyl(.16, .24, (.2, 0, 1.25), (.33, .23, .14), verts=8, r2=.19)
poco = join('Poco')

# ---------- Corpo coberto (lençol sobre um corpo deitado) ----------
me = bpy.data.meshes.new('lencol'); bm = bmesh.new(); NX, NY = 26, 12; grid = []
def body(x, y):
    h = 0
    for cx, cy, rx, ry, hh in ((-.78, 0, .13, .12, .2), (-.35, 0, .3, .22, .22), (.15, 0, .28, .2, .17), (.55, -.1, .3, .08, .1), (.55, .1, .3, .08, .1), (.86, -.1, .06, .07, .16), (.86, .1, .06, .07, .16)):
        d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
        h = max(h, hh * max(0, 1 - d) ** .5)
    return h
for j in range(NY + 1):
    row = []
    for i in range(NX + 1):
        x = -1.05 + 2.1 * i / NX; y = -.5 + 1.0 * j / NY
        edge = min(i, NX - i, j, NY - j) / 3
        z = max(body(x, y), .01) * min(1, edge + .35) + .012 + random.uniform(0, .01)
        row.append(bm.verts.new((x, y, z)))
    grid.append(row)
for j in range(NY):
    for i in range(NX): bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
bm.to_mesh(me); bm.free(); t = bpy.data.objects.new('lencol', me); sc.collection.objects.link(t)
bpy.context.view_layer.objects.active = t; t.select_set(True); bpy.ops.object.shade_smooth()
tint(t, (.6, .56, .48), .35, scale=3); parts.append(t)
for i in range(4): box(.08, .08, .05, (random.uniform(-.9, .9), random.uniform(.55, .7), .025), (.35, .3, .22), dirt=.2)
corpo = join('CorpoCoberto')

# ---------- Caixote, barril, cerca ----------
box(.6, .6, .55, (0, 0, .275), (.42, .31, .2), dirt=.35, bev=.02)
for z in (.1, .45): box(.62, .62, .06, (0, 0, z), TIMBER, dirt=.1)
caixote = join('Caixote')
bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=.34, depth=.9, location=(0, 0, .45)); o = bpy.context.object
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.subdivide(number_cuts=3); bpy.ops.object.mode_set(mode='OBJECT')
for v in o.data.vertices: f = 1 + .12 * math.cos((v.co.z) / .45 * math.pi / 2); v.co.x *= f; v.co.y *= f
tint(o, (.38, .26, .15), .3); parts.append(o)
for z in (.15, .75): cyl(.37, .05, (0, 0, z), IRON, verts=12)
barril = join('Barril')
for x in (-1.1, 0, 1.1): box(.12, .12, 1.1, (x, 0, .55), TIMBER, rot=(random.uniform(-.08, .08), 0, 0), dirt=.2)
for z in (.4, .85): box(2.4, .06, .14, (0, 0, z), (.36, .26, .16), rot=(0, random.uniform(-.05, .05), 0), dirt=.35)
cerca = join('Cerca')

for o in bpy.data.objects: o.location = (0, 0, 0)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True)
print('ok', {o.name: len(o.data.polygons) for o in bpy.data.objects})
