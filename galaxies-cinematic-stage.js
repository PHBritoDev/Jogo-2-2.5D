/** Original menu sculpture: suspended masonry, iron links, wind-driven cloth.
 * Coordinates use the initial orthographic viewport; the scene scales on resize.
 * No reference bitmap, additional renderer, downloaded model or gameplay actor. */
import * as T from 'three';
const noise=i=>{const n=Math.sin(i*127.1+73)*43758.545;return n-Math.floor(n);};
let stoneMap;
function surfaceMap(){if(stoneMap)return stoneMap;const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),im=ctx.createImageData(256,256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const k=(y*256+x)*4,v=95+noise(x+y*256)*90+18*Math.sin(x*.13+Math.sin(y*.06)*3);im.data[k]=im.data[k+1]=im.data[k+2]=v;im.data[k+3]=255;}ctx.putImageData(im,0,0);stoneMap=new T.CanvasTexture(c);stoneMap.wrapS=stoneMap.wrapT=T.RepeatWrapping;stoneMap.colorSpace=T.SRGBColorSpace;return stoneMap;}
const material=(color,metalness=.15,roughness=.8)=>new T.MeshStandardMaterial({color,metalness,roughness,map:surfaceMap(),bumpMap:surfaceMap(),bumpScale:1.2});
function mesh(parent,geometry,mat,x=0,y=0,z=0){const o=new T.Mesh(geometry,mat);o.position.set(x,y,z);parent.add(o);return o;}
function curve(parent,points,r,mat){return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),32,r,8,false),mat);}
function batch(parent,geometry,mat,count,place){const inst=new T.InstancedMesh(geometry,mat,count),o=new T.Object3D();for(let i=0;i<count;i++){o.position.set(0,0,0);o.rotation.set(0,0,0);o.scale.set(1,1,1);place(o,i);o.updateMatrix();inst.setMatrixAt(i,o.matrix);}inst.frustumCulled=false;inst.instanceMatrix.needsUpdate=true;parent.add(inst);return inst;}
function cloth(parent,points,width,height,color){
 const geo=new T.PlaneGeometry(width,height,18,24),attr=geo.attributes.position;
 // A trailing, torn cape anchored across the shoulders; only fabric deforms.
 for(let i=0;i<attr.count;i++){const v=(height/2-attr.getY(i))/height,u=attr.getX(i)/width+.5;
  attr.setXYZ(i,attr.getX(i)*(.22+v*.85)-width*.8*v*v,attr.getY(i)+Math.sin(u*21)*height*.035*v*v,Math.sin(u*19)*width*.04*v);
 }
 geo.computeVertexNormals();const mat=material(color,.18,.84);mat.side=T.DoubleSide;
 const time={value:0};mat.onBeforeCompile=s=>{s.uniforms.windTime=time;s.vertexShader='uniform float windTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 float freeEdge = clamp((${(height/2).toFixed(6)}-position.y)/${(height).toFixed(6)},0.,1.);
 transformed.z += sin(position.x*.09 + windTime*.65 + freeEdge*3.) * ${(width*.075).toFixed(6)} * freeEdge;
 transformed.x -= sin(windTime*.43 + freeEdge*2.) * ${(width*.035).toFixed(6)} * freeEdge;`);};
 const o=mesh(parent,geo,mat,...points);return {object:o,update:t=>{time.value=t;}};
}
export function addCinematicStage(parent,W,H){
 stoneMap=null;
 const group=new T.Group();parent.add(group);
 const stone=material('#716971',.22,.92),iron=material('#332b26',.76,.58),edge=material('#8e8272',.4,.75);
 stone.flatShading=true;
 const archY=x=>H*(.30-.28*Math.pow(x/(W*.49),2));
 // Beveled, chipped voussoirs catch rim light instead of reading as a flat ribbon.
 const blockShape=new T.Shape();blockShape.moveTo(-1,-.85);blockShape.lineTo(-.82,-1);blockShape.lineTo(.80,-1);blockShape.lineTo(1,-.63);blockShape.lineTo(1,.80);blockShape.lineTo(.72,1);blockShape.lineTo(-.80,1);blockShape.lineTo(-1,.64);blockShape.closePath();
 const archBlock=new T.ExtrudeGeometry(blockShape,{depth:1.4,bevelEnabled:true,bevelThickness:.13,bevelSize:.12,bevelSegments:1,steps:1});archBlock.translate(0,0,-.7);
 // Individually fractured blocks follow a shallow, broken vault (no luminous cable).
 batch(group,archBlock,stone,68,(o,i)=>{const x=(i/67-.5)*W*.95;o.position.set(x,archY(x),-55);o.scale.set(W*.011,H*.018,17);o.rotation.set(.1,noise(i)*.2,-x/W*.8);if(Math.abs(x)<W*.055)o.scale.setScalar(0);});
 batch(group,new T.BoxGeometry(1,1,1),edge,54,(o,i)=>{const x=(i/53-.5)*W*.94;o.position.set(x,archY(x)+H*.018,-51);o.scale.set(W*.014,H*.005,14);o.rotation.z=-x/W*.8;if(Math.abs(x)<W*.06)o.scale.setScalar(0);});
 // Recessed metal bands and worn quatrefoil relief break up the masonry silhouette.
 const bronze=material('#62503c',.68,.62);
 const relief=new T.TorusGeometry(1,.19,5,12);
 batch(group,new T.BoxGeometry(1,1,1),iron,22,(o,i)=>{const x=(i/21-.5)*W*.93;o.position.set(x,archY(x),-34);o.scale.set(W*.0028,H*.041,4);o.rotation.z=-x/W*.8;if(Math.abs(x)<W*.066)o.scale.setScalar(0);});
 batch(group,relief,bronze,80,(o,i)=>{const j=Math.floor(i/4),petal=i%4,x=(j/19-.5)*W*.91,a=petal*Math.PI/2;o.position.set(x+Math.cos(a)*H*.0045,archY(x)+Math.sin(a)*H*.0045,-33);o.scale.setScalar(H*.0055);o.rotation.z=-x/W*.8;if(Math.abs(x)<W*.075)o.scale.setScalar(0);});
 // Chains are updated from actual button/planet coordinates, including resize.
 const links=new T.InstancedMesh(new T.TorusGeometry(1,.25,5,10),iron,7*2*28);links.instanceMatrix.setUsage(T.DynamicDrawUsage);parent.add(links);
 const dummy=new T.Object3D();
 function alignChains(planets,width,height){let k=0;
  for(const p of planets){for(const sign of [-1,1]){
   const scaleRatio=p.userData.screenScale&&p.scale?p.scale.x/p.userData.screenScale:1,r=p.userData.screenRadius*scaleRatio,x=p.position.x+sign*r*.4,y=p.position.y+(p.userData.artRelief?.position.y||0)*(p.scale?.y||1)+r*.80;
   const rawAnchor=x+sign*r*.18,ax=Math.abs(rawAnchor)<width*.065?Math.sign(rawAnchor||sign)*width*.065:rawAnchor,ay=height*(.30-.28*Math.pow(ax/(width*.49),2));
   for(let i=0;i<28;i++){const t=i/27;dummy.position.set(ax+(x-ax)*t,ay+(y-ay)*t,-32+(47+r*.45)*t);dummy.rotation.set(0,i%2?1.05:.12,Math.atan2(x-ax,ay-y));dummy.scale.setScalar(Math.max(1.2,height*.0034));dummy.updateMatrix();links.setMatrixAt(k++,dummy.matrix);}
  }}links.instanceMatrix.needsUpdate=true;
 }
 // Layered cliffs and distant gothic ruins, with pale falls instead of lava floor.
 const rocks=batch(group,new T.IcosahedronGeometry(1,1),stone,84,(o,i)=>{const side=i%2?-1:1,x=side*W*(.19+noise(i)*.35);o.position.set(x,-H*(.22+noise(i+100)*.28),-160+noise(i+90)*35);o.scale.set(W*(.025+noise(i+20)*.035),H*(.04+noise(i+30)*.10),30);o.rotation.set(noise(i),noise(i+9),noise(i+2));});
 const tower=material('#25232c',.1,.9);
 batch(group,new T.CylinderGeometry(.65,1,1,6),tower,38,(o,i)=>{const side=i%2?-1:1;o.position.set(side*W*(.22+noise(i+1)*.30),-H*(.12+noise(i+70)*.13),-190);o.scale.set(W*.004,H*(.035+noise(i+33)*.09),W*.004);});
 batch(group,new T.ConeGeometry(1,1,6),tower,38,(o,i)=>{const side=i%2?-1:1,h=H*(.035+noise(i+33)*.09);o.position.set(side*W*(.22+noise(i+1)*.30),-H*(.12+noise(i+70)*.13)+h*.65,-190);o.scale.set(W*.006,h*.4,W*.006);});
 const archShape=new T.Shape();archShape.moveTo(-1,0);archShape.lineTo(-1,2.1);archShape.lineTo(1,2.1);archShape.lineTo(1,0);archShape.lineTo(.68,0);archShape.lineTo(.68,1);archShape.quadraticCurveTo(.68,1.65,0,1.86);archShape.quadraticCurveTo(-.68,1.65,-.68,1);archShape.lineTo(-.68,0);archShape.closePath();
 const archGeo=new T.ExtrudeGeometry(archShape,{depth:.28,bevelEnabled:false,curveSegments:12});
 batch(group,archGeo,stone,14,(o,i)=>{const side=i<7?-1:1,j=i%7;o.position.set(side*W*(.20+j*.045),-H*(.30+j*.006),-108);o.scale.set(W*.022,H*.055,20);});
 const fallMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'varying vec2 uvv;void main(){uvv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 uvv;uniform float time;void main(){float strands=.5+.5*sin(uvv.x*145.+sin(uvv.x*31.)*2.+uvv.y*2.-time*.3);float edge=smoothstep(0.,.12,uvv.x)*smoothstep(0.,.12,1.-uvv.x);float a=edge*(.12+strands*.27)*smoothstep(0.,.28,uvv.y);gl_FragColor=vec4(.65,.71,.77,a);}`});
 for(let i=0;i<10;i++){const side=i%2?-1:1;mesh(group,new T.PlaneGeometry(W*(.012+noise(i)*.015),H*.26),fallMat,side*W*(.21+noise(i+10)*.25),-H*.38,-98);}
 // Broad, worn steps and a rooted figure from behind, at a human scale.
 batch(group,new T.BoxGeometry(1,1,1),stone,9,(o,i)=>{o.position.set(-W*.008,-H*.49+i*H*.014,90+i*2);o.scale.set(W*(.49-i*.032),H*.014,30);o.rotation.z=.004*Math.sin(i);});
 batch(group,new T.DodecahedronGeometry(1,0),edge,32,(o,i)=>{const j=i%9;o.position.set((noise(i)-.5)*W*(.49-j*.032),-H*.48+j*H*.014,112+j*2);o.scale.set(W*.01,H*.004,3);o.rotation.z=noise(i)*.3;});
 const hero=new T.Group();hero.position.set(-W*.007,-H*.247,148);hero.name='menu-hero';group.add(hero);
 const dark=material('#151019',.15,.9),steel=material('#9b8b72',.72,.35),leather=material('#24191e');
 // Sculpted hood, shoulder mantle, tapering tunic, boots and sword.
 const hood=mesh(hero,new T.SphereGeometry(H*.025,24,18),dark,0,H*.046,0);hood.scale.set(.77,1.18,.75);
 mesh(hero,new T.ConeGeometry(H*.027,H*.045,24),dark,0,H*.058,-4).rotation.z=-.10;
 const torso=mesh(hero,new T.CylinderGeometry(H*.023,H*.036,H*.103,24),dark,0,-H*.025,0);torso.rotation.z=-.04;torso.name='body-fallback';
 for(const side of [-1,1]){
  const arm=mesh(hero,new T.CapsuleGeometry(H*.009,H*.065,6,12),leather,side*H*.032,-H*.03,1);arm.rotation.z=side*.12;arm.name='body-fallback';
  mesh(hero,new T.CapsuleGeometry(H*.010,H*.08,5,12),dark,side*H*.015,-H*.115,1).name='body-fallback';
 }
 const sword=mesh(hero,new T.CylinderGeometry(0,H*.003,H*.13,4),steel,H*.062,-H*.11,4);sword.rotation.z=.35;
 mesh(hero,new T.BoxGeometry(H*.028,H*.004,H*.005),steel,H*.039,-H*.048,5).rotation.z=.35;
 const cape=cloth(hero,[-H*.013,-H*.037,13],H*.18,H*.17,'#29131c');
 const flags=[];for(const side of [-1,1]){const x=side*W*.39;mesh(group,new T.CylinderGeometry(1,1,H*.14,6),iron,x,-H*.15,-80);flags.push(cloth(group,[x-H*.018,-H*.16,-76],H*.042,H*.09,'#42131b'));}
 // Original horned storm effigy: organic intersecting volumes, not a named boss.
 const demon=new T.Group();demon.position.set(W*.325,H*.29,-180);demon.name='menu-demon-fallback';group.add(demon);
 const skin=material('#21151d',.2,.92),horn=material('#30252a',.15,.88);
 const skull=mesh(demon,new T.SphereGeometry(H*.055,32,24),skin,0,H*.026,0);skull.scale.set(.73,1.3,.7);
 const jaw=mesh(demon,new T.SphereGeometry(H*.035,20,16),skin,0,-H*.027,4);jaw.scale.set(.75,1.4,.6);
 const chest=mesh(demon,new T.SphereGeometry(H*.12,32,20),skin,0,-H*.12,-21);chest.scale.set(1.2,.9,.45);
 for(const side of [-1,1]){
  curve(demon,[[side*H*.03,H*.065,0],[side*H*.064,H*.095,0],[side*H*.069,H*.15,-4],[side*H*.094,H*.18,-12]],H*.012,horn);
  mesh(demon,new T.ConeGeometry(H*.012,H*.07,12),horn,side*H*.087,H*.166,-10).rotation.z=-side*.38;
  const brow=mesh(demon,new T.SphereGeometry(H*.025,16,12),horn,side*H*.022,H*.031,H*.032);brow.scale.set(1,.30,.35);brow.rotation.z=-side*.32;
  const eyeMat=new T.MeshBasicMaterial({color:'#b83a28'});const eye=mesh(demon,new T.SphereGeometry(H*.003,12,8),eyeMat,side*H*.022,H*.025,H*.036);eye.scale.set(1.8,.5,1);
  const cheek=mesh(demon,new T.SphereGeometry(H*.024,16,12),horn,side*H*.027,-H*.005,H*.028);cheek.scale.set(.4,1,.5);cheek.rotation.z=-side*.4;
  for(let j=0;j<5;j++){const spike=mesh(demon,new T.ConeGeometry(H*(.014-j*.0015),H*(.085-j*.007),12),horn,side*H*(.073+j*.015),-H*(.06+j*.009),-18);spike.rotation.z=-side*(.45+j*.18);}

 }
 // White feather silhouettes supplement the existing angel rig, sharing one draw call.
 const feather=new T.SphereGeometry(1,8,6),pearl=material('#abb4bd',.18,.7);
 const wings=new T.Group();wings.position.set(-W*.30,H*.29,-80);wings.name='menu-wings-fallback';group.add(wings);
 batch(wings,feather,pearl,94,(o,i)=>{const side=i%2?-1:1,j=Math.floor(i/2),t=j/46;const a=side*(.30+t*1.0);o.position.set(side*H*(.035+t*.17),H*(.02+Math.sin(t*2.9)*.085),-t*12);o.rotation.z=-a;o.scale.set(H*(.008-t*.003),H*(.10-t*.04),H*.004);});
 return {hero,group,links,rocks,stone,alignChains,resize:(w,h)=>{group.scale.set(w/W,h/H,1);},update:t=>{cape.update(t);flags.forEach((f,i)=>f.update(t-i*.3));fallMat.uniforms.time.value=t;wings.rotation.z=Math.sin(t*.36)*.003;}};
}
