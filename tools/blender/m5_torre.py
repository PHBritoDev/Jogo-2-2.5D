# MOD 207 — Marco 5: a torre de VÉRAXION (Ato IV) e peças do interior.
# Gera TorreKit.glb com objetos nomeados:
#   Torre (sete pisos de pedra negra, cada um mais estreito, com janelas de luz fria, sacadas, contrafortes, a porta
#   em arco e a coroa com o anel branco do Quarto Bispo; ~70 m), Banheira (sala de descanso do 5º piso),
#   Pergaminho (o presente da pessoa misteriosa) e Braseiro (luz fria dos pisos).
# Uso: python m5_torre.py <saída.glb>
import bpy, bmesh, math, random, sys
from mathutils import Vector, noise
OUT = sys.argv[-1]
random.seed(31)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def mat(name, rough=.85, emit=None, strength=0.0, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    a = m.node_tree.nodes.new('ShaderNodeVertexColor'); a.layer_name = 'Col'
    m.node_tree.links.new(a.outputs['Color'], b.inputs['Base Color'])
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = strength
    return m
STONE_M = mat('Pedra'); GLOW = mat('LuzFria', .4, (.75, .82, 1.0), 4.0); GOLD = mat('Ouro', .35, None, 0, .8)

def tint(o, base, dirt=.25, scale=.6, m=None):
    me = o.data
    if 'Col' not in me.color_attributes: me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    col = me.color_attributes['Col']; mw = o.matrix_world
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = mw @ me.vertices[me.loops[li].vertex_index].co
            n = noise.noise(v * scale) * .5 + .5; k = 1 - dirt * n
            col.data[li].color = (base[0] * k, base[1] * k, base[2] * k, 1)
    me.materials.clear(); me.materials.append(m or STONE_M)

parts = []
def add(o, color, dirt=.25, m=None): tint(o, color, dirt, m=m); parts.append(o); return o
def box(sx, sy, sz, loc, color, rot=(0, 0, 0), dirt=.25, m=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); return add(o, color, dirt, m)
def cyl(r, h, loc, color, verts=16, r2=None, rot=(0, 0, 0), dirt=.25, m=None):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=h, location=loc, rotation=rot)
    return add(bpy.context.object, color, dirt, m)
def torus(R, r, loc, color, rot=(0, 0, 0), m=None, seg=40):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=seg, minor_segments=8, location=loc, rotation=rot)
    return add(bpy.context.object, color, .05, m)
def join(name):
    global parts
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join(); o = bpy.context.object; o.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); parts = []; return o

BLACK = (.09, .09, .11); DARK = (.14, .14, .17); TRIM = (.32, .32, .36); WIN = (.8, .86, 1.0); WHITE = (.95, .96, 1.0)

# ---------- Torre ----------
z = 0; R = 9.0
cyl(R + 2.6, 1.2, (0, 0, .6), DARK, verts=8)                               # plataforma
for i in range(5): box(5 - i * .4, 1.2, .3, (0, -(R + 3.2) - i * .6, .15 + i * .0), TRIM)  # degraus da frente
floors = []
for f in range(7):
    H = 8.5 if f < 6 else 9.5
    cyl(R, H, (0, 0, z + H / 2 + 1.2), BLACK if f % 2 == 0 else DARK, verts=8, r2=R * .97)
    cyl(R + .5, .6, (0, 0, z + 1.2 + H), TRIM, verts=8)                    # cornija
    for k in range(8):                                                     # contrafortes e janelas
        a = k / 8 * 2 * math.pi + math.pi / 8
        box(1.0, 1.4, H * .9, (math.cos(a) * (R + .2), math.sin(a) * (R + .2), z + 1.2 + H * .45), TRIM, rot=(0, 0, a))
        b = k / 8 * 2 * math.pi
        if f == 0 and k == 6: continue                                     # lugar da porta
        wx, wy = math.cos(b) * (R * .93), math.sin(b) * (R * .93)
        box(1.1, .3, 2.6, (wx, wy, z + 1.2 + H * .55), WIN, rot=(0, 0, b + math.pi / 2), dirt=.05, m=GLOW)
        cyl(.55, .3, (wx, wy, z + 1.2 + H * .55 + 1.3), WIN, verts=10, rot=(math.pi / 2, 0, b + math.pi / 2), dirt=.05, m=GLOW)
    if f in (1, 3, 5):                                                     # sacada
        cyl(R + 1.6, .4, (0, 0, z + 1.2 + H * .15), TRIM, verts=8)
    floors.append(z + 1.2); z += H + .6; R *= .9
# Porta em arco.
box(3.4, .6, 5.0, (0, -9.15, 3.7), (.05, .05, .07), dirt=.05)
torus(1.7, .35, (0, -9.3, 6.2), TRIM, rot=(math.pi / 2, 0, 0), seg=24)
box(.5, .7, 5.4, (-1.95, -9.3, 3.9), TRIM); box(.5, .7, 5.4, (1.95, -9.3, 3.9), TRIM)
# Coroa: agulha, anel branco e o "olho" negro do Quarto Bispo.
top = z + 1.2
cyl(R + .6, 2.0, (0, 0, top + 1.0), TRIM, verts=8, r2=R * .7)
cyl(R * .6, 14, (0, 0, top + 9), BLACK, verts=8, r2=.2)
for k in range(8):
    a = k / 8 * 2 * math.pi
    cyl(.35, 5, (math.cos(a) * R * .75, math.sin(a) * R * .75, top + 4), DARK, verts=6, r2=.05)
torus(6.5, .25, (0, 0, top + 12), WHITE, rot=(math.pi / 2, 0, 0), m=GLOW, seg=60)
cyl(2.2, .3, (0, -.3, top + 12), (.01, .01, .02), verts=24, rot=(math.pi / 2, 0, 0), dirt=0)
torre = join('Torre')
print('altura da torre', round(top + 18.5, 1))

# ---------- Banheira (sala de descanso) ----------
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=1, depth=.8, location=(0, 0, .4)); o = bpy.context.object
o.scale = (1.4, .75, 1); bpy.ops.object.transform_apply(scale=True)
sol = o.modifiers.new('s', 'SOLIDIFY'); sol.thickness = .12; bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='s')
add(o, (.86, .84, .8), .1)
cyl(1.25, .05, (0, 0, .6), (.35, .55, .7), verts=24, dirt=.05, m=GLOW).scale = (1.05, .6, 1)
for x in (-1.1, 1.1):
    for y in (-.5, .5): cyl(.1, .2, (x, y, .05), GOLD and (.7, .55, .2), verts=8, m=GOLD)
banheira = join('Banheira')

# ---------- Pergaminho ----------
cyl(.06, .5, (0, 0, .06), (.85, .76, .55), verts=12, rot=(0, math.pi / 2, 0), dirt=.15)
for x in (-.27, .27): cyl(.08, .05, (x, 0, .06), (.55, .4, .15), verts=12, rot=(0, math.pi / 2, 0), m=GOLD)
box(.42, .01, .2, (0, .1, .01), (.9, .82, .6), rot=(.2, 0, 0), dirt=.1)
torus(.065, .012, (0, 0, .06), (.6, .1, .1), rot=(0, math.pi / 2, 0), seg=12)
perg = join('Pergaminho')

# ---------- Braseiro de luz fria ----------
cyl(.45, .9, (0, 0, .45), DARK, verts=8, r2=.25)
cyl(.55, .2, (0, 0, .95), TRIM, verts=8)
cyl(.3, .5, (0, 0, 1.25), WIN, verts=8, r2=.02, m=GLOW)
bras = join('Braseiro')

for o in bpy.data.objects: o.location = (0, 0, 0)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True)
print('kit', [o.name for o in bpy.data.objects])
