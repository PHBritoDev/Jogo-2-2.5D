"""Moradores e crianças exclusivos, sem usar o encapuzado da Misteriosa.
Blender -b --python tools/blender/m216_moradores.py -- /caminho/Moradores-216.glb
Geometria leve, peças com pivôs locais para animação procedural no jogo.
"""
import bpy, sys, math
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*color,1)
 m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.85
 return m
def group(name,parent=None,pos=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=pos;return o
def ball(name,pos,scale,mat,parent):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8)
 o=bpy.context.object;o.name=name;o.parent=parent;o.location=pos;o.scale=scale;o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 return o
def tube(name,pos,r1,r2,h,mat,parent):
 bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=r1,radius2=r2,depth=h)
 o=bpy.context.object;o.name=name;o.parent=parent;o.location=pos;o.data.materials.append(mat)
 return o
shoe=material('Couro',(0.11,.065,.04));eye=material('Olhos',(0.035,.025,.02));white=material('Linho',(.64,.57,.42))
presets=[('Iria',(0.38,.19,.07),(.17,.32,.24),(.055,.03,.02),0),('Mara',(.67,.43,.28),(.24,.21,.38),(.36,.32,.28),1),('Teo',(.52,.30,.17),(.48,.24,.08),(.10,.055,.025),2),('Lia',(.76,.55,.4),(.18,.31,.47),(.20,.07,.025),3),('CriancaA',(.58,.36,.20),(.25,.44,.58),(.07,.035,.02),4),('CriancaB',(.78,.54,.38),(.52,.27,.37),(.25,.09,.03),5)]
for name,skincol,shirtcol,haircol,i in presets:
 child=i>=4;h=1.06 if child else [1.65,1.74,1.7,1.58][i];k=h/1.7
 root=group(name);root['height']=h
 skin=material(name+' Pele',skincol);shirt=material(name+' Roupa',shirtcol);hair=material(name+' Cabelo',haircol)
 headz=1.44*k;headr=.22*k*(1.13 if child else 1)
 tube('Tunica',(0,0,.92*k),.27*k,.21*k,.56*k,shirt,root)
 tube('Cinto',(0,0,.72*k),.275*k,.275*k,.055*k,shoe,root)
 head=group(name+'_head',root,(0,0,headz));ball('Rosto',(0,0,0),(headr,headr*.85,headr*1.18),skin,head)
 ball('Cabelo',(0,.035*k,.10*k),(headr*1.04,headr*.94,headr*.82),hair,head)
 for side in [-1,1]:
  ball('Orelha',(side*headr,0,0),(.035*k,.035*k,.06*k),skin,head)
  ball('Olho',(side*.076*k,-headr*.81,.015*k),(.025*k,.018*k,.033*k),eye,head)
  ball('Sobrancelha',(side*.076*k,-headr*.80,.068*k),(.045*k,.018*k,.014*k),hair,head)
 ball('Nariz',(0,-headr*.87,-.025*k),(.032*k,.043*k,.04*k),skin,head)
 ball('Boca',(0,-headr*.78,-.10*k),(.052*k,.012*k,.012*k),shoe,head)
 for side in [-1,1]:
  leg=group(name+('_legL' if side<0 else '_legR'),root,(side*.13*k,0,.67*k))
  tube('Calca',(0,0,-.25*k),.09*k,.11*k,.50*k,shoe if i%2 else shirt,leg)
  ball('Bota',(0,-.055*k,-.60*k),(.10*k,.17*k,.075*k),shoe,leg)
  arm=group(name+('_armL' if side<0 else '_armR'),root,(side*.25*k,0,1.15*k))
  tube('Manga',(side*.035*k,0,-.15*k),.07*k,.10*k,.30*k,shirt,arm)
  ball('Antebraco',(side*.05*k,0,-.36*k),(.065*k,.07*k,.16*k),skin,arm)
  ball('Mao',(side*.05*k,-.015*k,-.49*k),(.07*k,.05*k,.085*k),skin,arm)
 if i in (0,5):
  for side in [-1,1]:ball('Tranca',(side*headr,.04*k,-.10*k),(.06*k,.07*k,.20*k),hair,head)
 if i==1:
  ball('Coque',(0,.16*k,.06*k),(.13*k,.12*k,.13*k),hair,head)
 if i==2:
  tube('AbaChapeu',(0,0,.26*k),.34*k,.34*k,.035*k,white,head)
  tube('Chapeu',(0,0,.34*k),.22*k,.17*k,.16*k,white,head)
 if i in (0,2):ball('Avental',(0,-.20*k,.84*k),(.19*k,.045*k,.28*k),white,root)
bpy.ops.export_scene.gltf(filepath=sys.argv[-1],export_format='GLB',export_animations=False)
