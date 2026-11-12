/**
 * MENU VIVO THREE.JS — 7 Pecados. 100% geometria + shaders + texturas
 * procedurais geradas no navegador. Não utiliza arquivos de imagem.
 * O menu HTML continua responsável pelas ações, progressão e acessibilidade.
 * WebGL é opcional; se falhar, SVG existente permanece disponível.
 */
import * as THREE from 'three';

const PI=Math.PI;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rand(n){const x=Math.sin(n*127.1+78.233)*43758.5453;return x-Math.floor(x);}
function mat(c,metal=0.15,rough=.63,emissive=0){return new THREE.MeshStandardMaterial({color:c,metalness:metal,roughness:rough,emissive:c,emissiveIntensity:emissive});}
function mesh(g,m,parent,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;}
function ball(parent,r,color,x=0,y=0,z=0,scale){const o=mesh(new THREE.SphereGeometry(r,24,16),mat(color,.17,.5),parent,x,y,z);if(scale)o.scale.set(...scale);return o;}
function tube(parent,points,r,color,emissive=.0){
 const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 return mesh(new THREE.TubeGeometry(c,Math.max(20,points.length*4),r,5,false),mat(color,.5,.38,emissive),parent);
}
function ring(parent,r,t,color,rx=.26,ry=-.2,z=0,opacity=1){
 const m=new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false,side:THREE.DoubleSide,blending:opacity<1?THREE.AdditiveBlending:THREE.NormalBlending});
 const o=mesh(new THREE.TorusGeometry(r,t,5,96),m,parent,0,0,z);o.rotation.set(rx,ry,0);return o;
}
function proceduralTexture(id){
 // Materiais terrestres feitos por ruído multi-escala CPU (320²), sem importar
 // fotografias, mapas PBR ou sequer um arquivo bitmap. Gerado uma vez/planeta.
 const N=320,c=document.createElement('canvas');c.width=c.height=N;
 const ctx=c.getContext('2d',{alpha:false}),im=ctx.createImageData(N,N),data=im.data;
 const shades=[
  [[236,174,65],[118,68,25],[35,23,22]],
  [[24,221,111],[5,93,65],[3,17,27]],
  [[248,199,95],[138,81,27],[41,25,23]],
  [[239,248,254],[126,164,210],[31,50,79]],
  [[179,57,72],[93,12,33],[23,4,11]],
  [[255,99,29],[96,33,20],[14,13,17]],
  [[250,151,208],[134,52,114],[37,14,54]]
 ][id-1];
 const hash=(x,y)=>{
  let k=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(id,2147483647);
  k=Math.imul(k^(k>>>13),1274126177);return ((k^(k>>>16))>>>0)/4294967295;
 };
 const vnoise=(x,y)=>{
  const X=Math.floor(x),Y=Math.floor(y),u=x-X,v=y-Y,fx=u*u*(3-2*u),fy=v*v*(3-2*v);
  const a=hash(X,Y)+(hash(X+1,Y)-hash(X,Y))*fx;
  const b=hash(X,Y+1)+(hash(X+1,Y+1)-hash(X,Y+1))*fx;
  return a+(b-a)*fy;
 };
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const xx=x/N,yy=y/N,off=(y*N+x)*4;
  const n=vnoise(xx*6.3,yy*4.7)*.46+vnoise(xx*19.7,yy*12.1)*.33+
   vnoise(xx*57.8,yy*39.6)*.21;
  const ridge=Math.abs(n-.52),angle=xx*5+vnoise(xx*4,yy*4)*2;
  const cloud=Math.sin(angle*3+yy*16+n*9)*.18;
  let intensity=Math.max(0,Math.min(1,n*1.45-.18+cloud*.35));
  if(id===2)intensity=Math.max(0,Math.min(1,intensity+.16*Math.sin(yy*23+n*14)));
  if(id===4)intensity=.28+.72*Math.pow(intensity,.66);
  if(id===5)intensity=Math.max(0,Math.min(1,intensity*.75+ridge*.8));
  let lava=0;
  if(id===6||id===3||id===1){
   const p=Math.abs(Math.sin(xx*31+vnoise(xx*10,yy*10)*9)*Math.sin(yy*24+n*16));
   lava=Math.pow(1-p,id===6?22:35)*(id===6?1:.38);
  }
  const t=intensity<.5?intensity*2:(intensity-.5)*2;
  const a=intensity<.5?shades[2]:shades[1],b=intensity<.5?shades[1]:shades[0];
  for(let k=0;k<3;k++){
   const base=a[k]+(b[k]-a[k])*t;
   data[off+k]=Math.min(255,Math.max(0,base*(.77+.32*n)+lava*(k===0?235:k===1?85:15)));
  }
  data[off+3]=255;
 }
 ctx.putImageData(im,0,0);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=2;
 return tex;
}
function spire(parent,x,y,z,height,base,color,glow){
 const body=mesh(new THREE.CylinderGeometry(base*.6,base,height*.7,6),mat(color,.5,.55),parent,x,y+height*.3,z);
 mesh(new THREE.ConeGeometry(base*.95,height*.48,6),mat(glow,.35,.62),parent,x,y+height*.86,z);
 return body;
}
function castle(parent,r,ice=false){
 // Cidadela instanciada: mantém todas as torres, janelas e pináculos,
 // reduzindo chamadas de desenho no celular.
 const stone=mat(ice?'#728cab':'#b47a32',.58,.45,ice?.08:.15);
 const roofs=mat(ice?'#c9e7fa':'#ffce70',.43,.43,ice?.14:.25);
 const windows=new THREE.MeshBasicMaterial({color:ice?'#e4f6ff':'#ffe49b'});
 mesh(new THREE.BoxGeometry(r*1.43,r*.105,r*.14),stone,parent,0,r*.23,r*1.02);
 const n=ice?15:18,d=new THREE.Object3D();
 const towers=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),stone,n);
 const tips=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,5),roofs,n);
 const panes=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),windows,n);
 for(let i=0;i<n;i++){
  const t=i/(n-1),x=(t-.5)*r*1.4,random=rand(i*8+19);
  const h=r*(.29+random*.6)+(i===Math.floor(n/2)?r*.55:0),y=r*.28;
  const z=r*(1.03+Math.cos((t-.5)*PI)*.08);
  d.rotation.set(0,0,0);d.position.set(x,y+h*.33,z);
  d.scale.set(r*(.08+random*.07),h*.68,r*.16);d.updateMatrix();towers.setMatrixAt(i,d.matrix);
  d.position.set(x,y+h*.85,z);
  d.scale.set(r*(.09+random*.055),h*.38,r*(.09+random*.055));d.updateMatrix();tips.setMatrixAt(i,d.matrix);
  d.position.set(x,y+h*.39,z+r*.087);
  d.scale.set(r*.028,r*.07,r*.006);d.updateMatrix();panes.setMatrixAt(i,d.matrix);
  if(i%3===0){
   mesh(new THREE.CylinderGeometry(r*.014,r*.014,h*.3,6),roofs,parent,x,y+h*1.2,z);
   ball(parent,r*.022,ice?'#dcf7ff':'#fff3b6',x,y+h*1.37,z);
  }
 }
 for(const instance of [towers,tips,panes]){
  instance.instanceMatrix.needsUpdate=true;parent.add(instance);
 }
 // Catedral central com nave, torres laterais, vitrais e pináculo agudo.
 // Geometria única por parte, preserva a leitura gótica mesmo em 100px.
 const mid=r*(ice?1.05:1.14);
 const nave=mesh(new THREE.BoxGeometry(r*.38,r*.62,r*.25),stone,parent,0,r*.62,mid);
 const roof=mesh(new THREE.ConeGeometry(r*.245,r*.48,8),roofs,parent,0,r*1.13,mid);
 const needle=mesh(new THREE.CylinderGeometry(r*.012,r*.014,r*.29,6),roofs,parent,0,r*1.48,mid);
 ball(parent,r*.023,ice?'#f2ffff':'#ffdf8d',0,r*1.66,mid);
 const glass=new THREE.MeshBasicMaterial({color:ice?'#c4ecff':'#ffb944',transparent:true,opacity:.85});
 for(const v of [-1,0,1]){
  const h=v===0?r*.25:r*.17;
  const pane=mesh(new THREE.PlaneGeometry(r*.055,h),glass,parent,v*r*.095,r*.62,mid+r*.132);
  const arch=mesh(new THREE.SphereGeometry(r*.032,10,6),glass,parent,v*r*.095,r*.62+h*.49,mid+r*.131);
  arch.scale.set(1,.45,.13);
 }
}
function goldenIsland(parent,r){
 // Fortaleza levitando sobre rocha natural fraturada. Nada de imagem pronta.
 const g=new THREE.IcosahedronGeometry(r*.78,1);
 const p=g.getAttribute('position');
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=1+(rand(i+71)-.5)*.22;
  p.setXYZ(i,x*n,y*n,z*n);
 }g.computeVertexNormals();
 const island=mesh(g,mat('#6d4327',.28,.88),parent,0,-r*.35,r*.93);
 island.scale.set(1.36,.55,.5);
 const upper=mesh(new THREE.CylinderGeometry(r*.85,r*.73,r*.11,12),mat('#d89c40',.51,.57),parent,0,-r*.08,r*.93);
 upper.rotation.x=PI/2;upper.scale.y=.45;
 // Corrente de ferro dourado cruzando a cidade-ilha.
 const count=16,geo=new THREE.TorusGeometry(r*.064,r*.013,5,12);
 const chain=new THREE.InstancedMesh(geo,mat('#a9772d',.77,.38),count),d=new THREE.Object3D();
 for(let i=0;i<count;i++){const t=i/(count-1);
  d.position.set((-r*.9+r*1.8*t),r*(.19-.69*t),r*1.22);
  d.rotation.set(.4,0,-.33+(i%2)*PI/2);
  d.scale.setScalar(1);d.updateMatrix();chain.setMatrixAt(i,d.matrix);
 }
 chain.instanceMatrix.needsUpdate=true;parent.add(chain);
 for(let i=0;i<4;i++)ball(parent,r*.035,'#ffd16b',-r*.59+i*r*.36,-r*.14,r*1.18);
}

function celestialFalls(parent,r,ice=false){
 // Cachoeiras de luz e bancos de nuvens, todos formados por malhas Three.js.
 const puff=new THREE.InstancedMesh(
  new THREE.SphereGeometry(1,9,6),
  new THREE.MeshStandardMaterial({color:ice?'#dbf1ff':'#e9d6b3',transparent:true,opacity:.48,depthWrite:false,roughness:1}),27);
 const d=new THREE.Object3D();
 for(let i=0;i<27;i++){
  const x=(rand(i*13+9)-.5)*r*1.85,y=-r*(.33+rand(i*5+1)*.43);
  const z=r*(.64+rand(i*11+4)*.5);
  d.position.set(x,y,z);d.scale.set(r*(.09+rand(i+31)*.14),r*(.04+rand(i+21)*.065),r*.085);
  d.rotation.set(0,0,rand(i*8)*.45);d.updateMatrix();puff.setMatrixAt(i,d.matrix);
 }
 puff.instanceMatrix.needsUpdate=true;parent.add(puff);
 const ribbonMat=new THREE.MeshBasicMaterial({
   color:ice?'#b8edff':'#ffe2a1',transparent:true,opacity:ice?.38:.58,
   side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending
 });
 for(let j=0;j<5;j++){
  const x=(j-2)*r*.29,z=r*1.16;
  const pts=[];for(let k=0;k<=12;k++){
   const t=k/12;pts.push(new THREE.Vector3(x+Math.sin(t*9+j*7)*r*.017,-r*.08-t*r*.83,z-r*.02*t));
  }
  const g=new THREE.BufferGeometry(),p=[],uv=[],ind=[];
  for(let k=0;k<pts.length;k++){
   const q=pts[k],w=r*(.012+.011*Math.sin(k*.27+j));
   p.push(q.x-w,q.y,q.z,q.x+w,q.y,q.z);
   uv.push(0,k/12,1,k/12);
   if(k<pts.length-1){const a=k*2;ind.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ind);
  parent.add(new THREE.Mesh(g,ribbonMat));
 }
}
function glacialMountains(parent,r){
 // Montanhas de gelo e banco de nuvens sob a cidadela de Soberba.
 const geo=new THREE.ConeGeometry(1,1,5);
 const rock=new THREE.InstancedMesh(geo,mat('#7294b0',.21,.64),14);
 const caps=new THREE.InstancedMesh(geo,mat('#e9f6ff',.22,.45),14);
 const d=new THREE.Object3D();
 for(let i=0;i<14;i++){
  const t=i/13,x=(t-.5)*r*1.7,depth=r*(.72+rand(i+71)*.34);
  const h=r*(.42+rand(i+92)*.46);
  d.position.set(x,-r*.12+h*.37,depth);d.rotation.set(0,rand(i+42)*2*PI,0);
  d.scale.set(r*(.12+rand(i+2)*.07),h,r*(.12+rand(i+2)*.07));
  d.updateMatrix();rock.setMatrixAt(i,d.matrix);
  d.position.set(x,-r*.12+h*.77,depth+r*.06);
  d.scale.set(r*.095,h*.31,r*.095);d.updateMatrix();caps.setMatrixAt(i,d.matrix);
 }
 rock.instanceMatrix.needsUpdate=true;caps.instanceMatrix.needsUpdate=true;parent.add(rock,caps);
 const fog=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,6),
 new THREE.MeshBasicMaterial({color:'#d3ebf7',transparent:true,opacity:.38,depthWrite:false}),23);
 for(let i=0;i<23;i++){
  const x=(rand(i+12)-.5)*r*2,y=-r*(.53+rand(i+3)*.21),z=r*(.72+rand(i+33)*.23);
  d.position.set(x,y,z);d.rotation.set(0,0,0);d.scale.set(r*(.13+rand(i+51)*.14),r*(.043+rand(i+81)*.04),r*.13);
  d.updateMatrix();fog.setMatrixAt(i,d.matrix);
 }
 fog.instanceMatrix.needsUpdate=true;parent.add(fog);
}
function coin(parent,r,x,y,z){const m=new THREE.MeshStandardMaterial({color:'#ffcf43',metalness:.85,roughness:.21,emissive:'#a24a02',emissiveIntensity:.1});
 const o=mesh(new THREE.CylinderGeometry(r,r,r*.16,12),m,parent,x,y,z);o.rotation.x=PI/2;return o;}
function treasure(parent,r){
 // Baú de Avareza com tampa levantada, conteúdo luminoso e moedas 3D.
 const wood=mat('#3e2111',.22,.72),gold=mat('#e9b548',.78,.27),gem=mat('#edc879',.34,.31);
 const base=mesh(new THREE.BoxGeometry(r*.94,r*.44,r*.52),wood,parent,0,-r*.30,r*.91);
 const inner=mesh(new THREE.BoxGeometry(r*.80,r*.10,r*.40),gold,parent,0,-r*.12,r*1.10);
 const lid=mesh(new THREE.BoxGeometry(r*.94,r*.14,r*.47),wood,parent,0,r*.21,r*.72);
 lid.rotation.x=-.77;lid.rotation.z=.06;
 mesh(new THREE.BoxGeometry(r*.96,r*.057,r*.09),gold,parent,0,r*.31,r*.68).rotation.x=-.77;
 for(const x of [-r*.41,r*.41]){
  mesh(new THREE.BoxGeometry(r*.070,r*.48,r*.57),gold,parent,x,-r*.28,r*.91);
  ball(parent,r*.043,'#fff0b9',x,-r*.27,r*1.23,[.8,.85,.35]);
 }
 // Moedas espalhadas e curvas dentro e fora do tesouro, um draw call.
 const coins=new THREE.InstancedMesh(new THREE.CylinderGeometry(r*.078,r*.078,r*.018,12),gold,36);
 const d=new THREE.Object3D();
 for(let i=0;i<36;i++){
  const x=(rand(i+42)-.5)*r*(i<25?.72:1.43);
  const y=-r*(.05+rand(i+12)*.53),z=r*(1.16+rand(i+9)*.19);
  d.position.set(x,y,z);d.rotation.set(PI/2,rand(i+17)*PI*2,(rand(i+24)-.5)*.75);
  d.scale.setScalar(.72+rand(i+7)*.52);d.updateMatrix();coins.setMatrixAt(i,d.matrix);
 }
 coins.instanceMatrix.needsUpdate=true;parent.add(coins);
 for(let i=0;i<7;i++)ball(parent,r*.025,'#fff4bf',(rand(i+62)-.5)*r*.68,-r*(.04+rand(i)*.35),r*1.4);
 const lamp=new THREE.PointLight('#fbb752',2.5,r*3,1.8);lamp.position.set(0,0,r*1.6);parent.add(lamp);
}
function envy(parent,r){
 // Dragão-serpente esculpido sobre o planeta, corpo em S, escamas e chifres.
 const p=[[-.63,-.57,1.03],[-.27,-.52,1.11],[.20,-.62,1.12],[.51,-.4,1.13],
  [.34,-.06,1.16],[-.2,.11,1.15],[-.49,.39,1.06],[-.10,.57,1.12],[.43,.56,1.04]]
  .map(v=>new THREE.Vector3(v[0]*r,v[1]*r,v[2]*r));
 const curve=new THREE.CatmullRomCurve3(p);
 mesh(new THREE.TubeGeometry(curve,80,r*.083,9,false),mat('#087c49',.22,.43),parent);
 const belly=p.map(v=>[v.x,v.y-r*.027,v.z+r*.07]);
 tube(parent,belly,r*.028,'#71f9a1',.2);
 const sc=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),
  mat('#16aa61',.36,.35),68),d=new THREE.Object3D();
 const spine=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,4),mat('#67f69e',.27,.41),24);
 for(let i=0;i<68;i++){
  const t=(i+.25)/68,pt=curve.getPoint(t),tangent=curve.getTangent(t);
  const side=i%2?1:-1;
  d.position.copy(pt).add(new THREE.Vector3(side*r*.048,0,r*.063));
  d.rotation.set(0,0,Math.atan2(tangent.y,tangent.x));
  d.scale.set(r*.022,r*.032,r*.014);d.updateMatrix();sc.setMatrixAt(i,d.matrix);
 }
 for(let i=0;i<24;i++){
  const t=(i+.5)/24,pt=curve.getPoint(t),tangent=curve.getTangent(t);
  d.position.copy(pt).add(new THREE.Vector3(0,r*.078,-r*.011));
  d.rotation.set(0,0,-Math.atan2(tangent.x,tangent.y));
  d.scale.set(r*.026,r*.066,r*.022);d.updateMatrix();spine.setMatrixAt(i,d.matrix);
 }
 sc.instanceMatrix.needsUpdate=true;spine.instanceMatrix.needsUpdate=true;parent.add(sc,spine);
 const h=p.at(-1);
 const head=ball(parent,r*.155,'#22b76b',h.x,h.y,h.z,[1.42,.82,.68]);
 const muzzle=ball(parent,r*.086,'#34c781',h.x+r*.16,h.y-r*.036,h.z+r*.01,[1.2,.54,.6]);
 for(const v of [-1,1]){
  ball(parent,r*.025,'#e9efa0',h.x+v*r*.054,h.y+r*.051,h.z+r*.12,[1,.63,.43]);
  ball(parent,r*.010,'#102416',h.x+v*r*.054,h.y+r*.052,h.z+r*.142);
  const horn=mesh(new THREE.ConeGeometry(r*.035,r*.125,5),mat('#b7eac2',.1,.38),parent,
   h.x+v*r*.102,h.y+r*.145,h.z);
  horn.rotation.z=v*.4;
 }
 tube(parent,[[h.x+r*.18,h.y-r*.042,h.z+r*.062],[h.x+r*.26,h.y-r*.08,h.z+r*.13]],
  r*.009,'#ffd17b');
}
function maw(parent,r){
 // Boca monstruosa em grande abertura tridimensional: tecido escuro,
 // maxilares curvos e presas inclinadas para dentro.
 ball(parent,r*.56,'#621724',0,-r*.02,r*.67,[1.19,1.02,.52]);
 ball(parent,r*.47,'#070307',0,-r*.06,r*.99,[1.11,.76,.31]);
 const lip=new THREE.CatmullRomCurve3(Array.from({length:32},(_,i)=>{
   const a=i*2*PI/31;return new THREE.Vector3(Math.cos(a)*r*.55,Math.sin(a)*r*.40-r*.045,r*.985);
 }));
 mesh(new THREE.TubeGeometry(lip,88,r*.066,6,false),mat('#b83442',.15,.44),parent);
 const toothMat=mat('#e9d8bf',.14,.35);
 const teeth=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,7),toothMat,16),d=new THREE.Object3D();
 let ti=0;
 for(let row=0;row<2;row++){
  for(let i=0;i<8;i++){
   const t=(i+.3)/8,ang=(row?PI:0)+t*PI;
   const x=Math.cos(ang)*r*.49,y=Math.sin(ang)*r*.37-r*.045;
   const big=i===1||i===6,len=r*(big?.37:.22);
   d.position.set(x,y,r*1.05);d.rotation.set(.13,0,ang+PI/2);
   d.scale.set(r*(big?.062:.045),len,r*(big?.062:.045));d.updateMatrix();
   teeth.setMatrixAt(ti++,d.matrix);
  }
 }
 teeth.instanceMatrix.needsUpdate=true;parent.add(teeth);
 // Língua e saliva brilhantes na profundidade da mandíbula.
 const tongue=ball(parent,r*.18,'#b6283e',.07*r,-r*.26,r*1.11,[1.2,.37,.45]);
 for(let i=0;i<4;i++)tube(parent,[[(-.3+i*.18)*r,-r*.02,r*1.11],[(-.22+i*.17)*r,-r*.14,r*1.17]],r*.01,'#e36473',.1);
}
function roseField(parent,r,count=9){
 // Rosas volumétricas em UM draw call usando a cor por instância.
 const petals=9,n=count*(petals+1);
 const geo=new THREE.SphereGeometry(1,9,6);
 const material=mat('#ffffff',.24,.53);
 const flowers=new THREE.InstancedMesh(geo,material,n),d=new THREE.Object3D();
 const pink=new THREE.Color('#f873aa'),ruby=new THREE.Color('#a9155c');
 let idx=0;
 for(let i=0;i<count;i++){
  const ang=i*2*PI/count,x=Math.cos(ang)*r*.80,y=Math.sin(ang)*r*.71,z=r*.69;
  const radius=r*(.125+rand(i)*.07),shade=i%2?pink:ruby;
  d.position.set(x,y,z);d.rotation.set(0,0,0);
  d.scale.setScalar(radius*.23);d.updateMatrix();flowers.setMatrixAt(idx,d.matrix);
  flowers.setColorAt(idx++,shade);
  for(let j=0;j<petals;j++){
   const t=j*2*PI/petals;
   d.position.set(x+Math.cos(t)*radius*.37,y+Math.sin(t)*radius*.37,z+.04*radius);
   d.rotation.set(0,0,t);
   d.scale.set(radius*.27,radius*.35,radius*.09);
   d.updateMatrix();flowers.setMatrixAt(idx,d.matrix);
   flowers.setColorAt(idx++,shade);
  }
 }
 flowers.instanceMatrix.needsUpdate=true;
 if(flowers.instanceColor)flowers.instanceColor.needsUpdate=true;
 parent.add(flowers);
}
function lust(parent,r){
 const stage=new THREE.Group();stage.scale.setScalar(1.17);parent.add(stage);
 // Luxúria: escultura procedural de mulher adulta, rosto com anatomia,
 // cabelos ondulados, joias, braço elevado e pétalas 3D — nenhuma foto.
 const skin=mat('#d9a0a6',.08,.52),hair=mat('#612646',.26,.52);
 const red=mat('#b83769',.44,.31),gold=mat('#e8b16f',.79,.23);
 ball(stage,r*.29,'#d69ba5',0,-r*.43,r*.74,[1.62,.66,.8]);
 ball(stage,r*.22,'#a42a5b',0,-r*.53,r*1.02,[1.66,.5,.34]);
 mesh(new THREE.CylinderGeometry(r*.112,r*.155,r*.29,14),skin,stage,0,-r*.155,r*.84);
 const head=new THREE.Group();head.position.set(0,r*.225,r*.83);head.rotation.z=-.19;head.rotation.y=-.12;stage.add(head);
 const face=ball(head,r*.36,'#dfadaf',0,0,.018*r,[.70,1.1,.63]);
 ball(head,r*.22,'#ce929e',0,-r*.14,r*.115,[.63,.56,.6]);
 // Sobrancelhas, pálpebras curvas, íris verde e cílios.
 for(const d of [-1,1]){
  const x=d*r*.127,y=r*.077,z=r*.222;
  ball(head,r*.041,'#f3d8d0',x,y,z,[1.11,.36,.41]);
  ball(head,r*.024,'#347f60',x+d*r*.005,y,z+r*.031,[.69,.88,.24]);
  ball(head,r*.013,'#141820',x+d*r*.006,y,z+r*.042,[.75,.85,.25]);
  tube(head,[[x-d*r*.057,y+r*.039,z],[x,y+r*.056,z+r*.025],[x+d*r*.055,y+r*.034,z]],r*.013,'#492435');
  tube(head,[[x-d*r*.065,y+r*.109,z-r*.01],[x,y+r*.124,z],[x+d*r*.07,y+r*.105,z-r*.01]],r*.017,'#412338');
  for(let j=0;j<3;j++)tube(head,[[x+d*r*(.03+j*.018),y+r*.041,z+r*.013],[x+d*r*(.045+j*.021),y+r*.069,z+r*.018]],r*.007,'#241020');
 }
 // Nariz com ponte e ponta; lábios curvados.
 const nose=ball(head,r*.049,'#d59b9d',.015*r,-r*.017,r*.249,[.72,1.9,.8]);
 ball(head,r*.040,'#c9798b',.018*r,-r*.117,r*.249,[1.58,.36,.5]);
 ball(head,r*.034,'#ab415f',.018*r,-r*.149,r*.243,[1.45,.26,.48]);
 // cabelo volumoso sobre a testa
 ball(head,r*.29,'#452039',-.035*r,r*.26,-r*.08,[1.05,.55,.57]);
 for(let i=0;i<23;i++){
  const d=i%2?-1:1,t=i/22,side=d*r*(.19+.14*rand(i+31)),top=r*(.32+.17*rand(i+45));
  const tail=-r*(.37+.3*rand(i+9));
  tube(stage,[[side*.3,r*.52,r*.76],[side,top+r*.06,r*.93],
   [side*1.45,r*.13,r*.99],[side*.84,tail,r*.94]],
  r*(.021+.015*rand(i+17)),i%3?'#502343':'#873d61',.07);
 }
 // Braço direito apoiado acima da cabeça, mão e dedos.
 tube(stage,[[r*.38,-r*.40,r*.96],[r*.61,-r*.10,r*.91],[r*.55,r*.43,r*.86],
  [r*.29,r*.64,r*.85]],r*.076,'#d7a3aa');
 const palm=ball(stage,r*.091,'#e3b6b3',r*.27,r*.65,r*.85,[.6,1.1,.35]);
 for(let i=0;i<4;i++)tube(stage,[[r*(.26+i*.022),r*.67,r*.85],
  [r*(.18+i*.026),r*.77,r*.85]],r*.013,'#ddb0af');
 // Gargantilha e broche metálico no peito.
 ring(parent,r*.16,r*.015,'#ffc580',0,0,r*.96,.83).position.y=-r*.23;
 ball(stage,r*.047,'#ffca67',0,-r*.37,r*1.11);
 roseField(parent,r,9);
 // Pétalas suspensas no espaço, uma única malha instanciada colorida.
 const petals=new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1,0),
  mat('#ed729b',.28,.47),24),pd=new THREE.Object3D();
 for(let i=0;i<24;i++){
  const ang=i*2*PI/24,rad=r*(.85+.3*rand(i+70));
  pd.position.set(Math.cos(ang)*rad,Math.sin(ang)*rad*.78,r*(.62+.2*rand(i+77)));
  pd.rotation.set(rand(i*3)*PI,rand(i*7)*PI,ang);
  const size=r*(.016+.023*rand(i+54));
  pd.scale.set(size,size*.56,size*.2);pd.updateMatrix();petals.setMatrixAt(i,pd.matrix);
 }
 petals.instanceMatrix.needsUpdate=true;parent.add(petals);
 ring(parent,r*1.14,r*.016,'#ff42a6',-.25,.18,r*.23,.81);
}
function makePlanet(id,r){
 const group=new THREE.Group();
 const colors=['#f4ab36','#1cd463','#f3bb50','#c8e9fa','#c64357','#ff5329','#ff76b7'];
 // Mapa PBR e relevo físico feitos no navegador a partir da mesma
 // textura procedural — nenhuma fotografia usada na superfície.
 const surface=proceduralTexture(id);
 const globe=new THREE.Mesh(new THREE.SphereGeometry(r,48,32),
  new THREE.MeshStandardMaterial({
   map:surface,bumpMap:surface,bumpScale:r*(id===6?.014:id===1||id===4?.010:.006),
   metalness:id===3?.35:id===1?.24:.09,roughness:id===4?.37:.64
  }));
 group.add(globe);
 // Fresnel de atmosfera: contorno luminoso real na silhueta, sem textura externa.
 const atmosphereMaterial=new THREE.ShaderMaterial({
  uniforms:{uColor:{value:new THREE.Color(colors[id-1])}},
  vertexShader:'varying vec3 vN;varying vec3 vP;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vP=-p.xyz;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*p;}',
  fragmentShader:'uniform vec3 uColor;varying vec3 vN;varying vec3 vP;void main(){float f=pow(1.-max(0.,dot(normalize(vN),normalize(vP))),3.0);gl_FragColor=vec4(uColor,f*.53);}',
  transparent:true,depthWrite:false,side:THREE.FrontSide,blending:THREE.AdditiveBlending
 });
 const atm=new THREE.Mesh(new THREE.SphereGeometry(r*1.048,32,20),atmosphereMaterial);
 group.add(atm);
 if(id===1){goldenIsland(group,r);castle(group,r);celestialFalls(group,r);ring(group,r*1.13,r*.035,'#e8a34b',.55,.27,r*.18);ring(group,r*.86,r*.055,'#704016',-.48,0,r*.87);}
 if(id===2){envy(group,r);ring(group,r*1.14,r*.02,'#36ec82',.32,-.2,r*.12,.75);}
 if(id===3){treasure(group,r);ring(group,r*1.18,r*.025,'#f6c467',-.24,.16,r*.12);}
 if(id===4){glacialMountains(group,r);castle(group,r,true);celestialFalls(group,r,true);ring(group,r*1.11,r*.018,'#9de5ff',.48,.09,r*.17);}
 if(id===5){maw(group,r);ring(group,r*1.17,r*.02,'#fc444d',-.21,.17,.2*r);}
 if(id===6){for(let i=0;i<9;i++){let a=i*2*PI/9;const crack=[];for(let j=0;j<6;j++)crack.push([Math.cos(a+j*.1)*r*(.95-j*.09),Math.sin(a+j*.16)*r*(.95-j*.08),r*.27+j*r*.045]);tube(group,crack,r*.014,'#ff5a0c',.62);}ring(group,r*1.07,r*.028,'#ff430e',.3,-.18,0);}
 if(id===7){lust(group,r);}
 const halo=ring(group,r*1.16,r*.010,colors[id-1],.31,.1,-r*.06,.51);halo.name='orbital';
 group.userData={globe,halo,id};
 return group;
}
function starfield(parent,W,H){
 const n=160,points=new Float32Array(n*3),cols=new Float32Array(n*3);
 for(let i=0;i<n;i++){points[i*3]=(rand(i*4)-.5)*W;points[i*3+1]=(rand(i*5+2)-.5)*H;points[i*3+2]=-310+rand(i*7)*35;
  const c=new THREE.Color(i%5===0?'#ff6b52':'#e7bbad');cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(points,3));g.setAttribute('color',new THREE.BufferAttribute(cols,3));
 const pts=new THREE.Points(g,new THREE.PointsMaterial({size:1.45,vertexColors:true,transparent:true,opacity:.8,sizeAttenuation:false}));parent.add(pts);return pts;
}
function emberField(parent,W,H){
 // Partículas incandescentes geradas em buffer: uma única draw call.
 const count=110,coords=new Float32Array(count*3);
 for(let i=0;i<count;i++){
  coords[i*3]=(rand(i+810)-.5)*W;
  coords[i*3+1]=-H*.49+rand(i+428)*H*.58;
  coords[i*3+2]=-145+rand(i+583)*36;
 }
 const geo=new THREE.BufferGeometry();const attr=new THREE.BufferAttribute(coords,3);
 attr.setUsage(THREE.DynamicDrawUsage);geo.setAttribute('position',attr);
 const points=new THREE.Points(geo,new THREE.PointsMaterial({
  color:'#f06c39',size:1.45,transparent:true,opacity:.6,
  sizeAttenuation:false,depthWrite:false,blending:THREE.AdditiveBlending
 }));parent.add(points);
 return {coords,attr,count,W,H};
}
function sky(parent,W,H){
 // Nebulosa infernal procedural com nuvens fractais e contra-luz cromática;
 // desenhada e animada integralmente no fragment shader.
 const material=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0}},depthWrite:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:"uniform float uTime;varying vec2 vUv;\nfloat h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);\nreturn mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}\nfloat fbm(vec2 p){float f=0.,a=.54;for(int i=0;i<4;i++){f+=a*n(p);p*=2.03;a*=.49;}return f;}\nvoid main(){\n vec2 uv=vUv,wind=vec2(uTime*.0032,uTime*.0007);\n vec2 p=uv*vec2(5.9,3.9);\n float warp=fbm(p*.68+wind);\n float c1=fbm(p+vec2(warp,-warp)*1.17+wind);\n float c2=fbm(p*1.82-vec2(warp*.58)+wind*.5);\n float formation=smoothstep(.39,.67,c1*.76+c2*.37);\n float den=smoothstep(.34,.64,c1*.91+c2*.22);\n float fiery=exp(-length((uv-vec2(.82,.72))*vec2(1.33,1.6))*2.75);\n float blue=exp(-length((uv-vec2(.17,.79))*vec2(1.9,1.65))*3.6);\n float redRight=smoothstep(.35,.93,uv.x)*(.24+fiery*.83);\n float horizon=pow(1.-uv.y,2.6);\n vec3 sky=vec3(.006,.010,.021);\n sky+=vec3(.31,.025,.045)*formation*redRight*1.75;\n sky+=vec3(.24,.022,.032)*den*fiery*1.18;\n sky+=vec3(.063,.098,.165)*blue*(.38+formation*.9);\n sky+=vec3(.13,.011,.012)*horizon*(.26+den*.9);\n float ironCloud=smoothstep(.21,.62,fbm(p*.8+vec2(2.4,1.2)+wind));\n sky=mix(sky,sky*.37,ironCloud*.42);\n float rim=exp(-length((uv-vec2(.745,.76))*vec2(2.4,2.2))*4.4);\n sky+=vec3(.23,.026,.011)*rim*(.12+formation);\n sky*=1.12;\n gl_FragColor=vec4(sky,1.);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n}"
 });
 mesh(new THREE.PlaneGeometry(W,H),material,parent,0,0,-360);
 return material;
}
function smokeLayer(parent,W,H,tint,x,y,z){
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
  uniforms:{uTime:{value:0},uTint:{value:new THREE.Color(tint)}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:"\nuniform float uTime;uniform vec3 uTint;varying vec2 vUv;\nfloat h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);\nreturn mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}\nfloat fbm(vec2 p){float v=0.;float a=.57;for(int i=0;i<3;i++){v+=a*n(p);p*=2.11;a*=.5;}return v;}\nvoid main(){\n vec2 uv=vUv,flow=vec2(uTime*.016,uTime*.002);\n float large=fbm(uv*vec2(4.,3.)+flow),fine=fbm(uv*vec2(13.,8.)-flow*.65);\n float m=smoothstep(.32,.65,large*.75+fine*.34);\n float feather=pow(max(0.,sin(3.1415926*uv.x)*sin(3.1415926*uv.y)),.85);\n float a=pow(m,1.35)*feather*.39;\n vec3 color=uTint*(.55+large*.85);\n gl_FragColor=vec4(color,a);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n}"});
 mesh(new THREE.PlaneGeometry(W*.66,H*.47),material,parent,x,y,z);
 return material;
}
function gothicRuins(parent,W,H){
 const rock=mat('#08070b',.08,.95),light=mat('#782116',.4,.7,.04);
 // Cidadela e torres distantes: geometria compartilhada, poucas draw calls.
 const towerGeom=new THREE.CylinderGeometry(4,8,95,5),spireGeom=new THREE.ConeGeometry(10,40,5);
 const mt=new THREE.InstancedMesh(towerGeom,rock,42);
 const ms=new THREE.InstancedMesh(spireGeom,rock,42);
 const dummy=new THREE.Object3D();
 for(let i=0;i<42;i++){
  let x=(rand(i+19)-.5)*W*1.04;
  if(i>20)x=W*.20+rand(i+62)*W*.29;
  const y=H*.09+rand(i+28)*H*.15;
  const z=-255+rand(i+32)*14,sc=.22+rand(i+43)*.86;
  dummy.position.set(x,y,z);dummy.scale.set(sc,sc*(.6+rand(i+5)),sc);dummy.updateMatrix();mt.setMatrixAt(i,dummy.matrix);
  dummy.position.y=y+sc*52;dummy.scale.setScalar(sc);dummy.updateMatrix();ms.setMatrixAt(i,dummy.matrix);
 }
 parent.add(mt,ms);
 // Rochedos vulcânicos facetados, sem cones geométricos artificiais.
 // Instancing dá dezenas de pedras com uma única draw call.
 const rockGeo=new THREE.IcosahedronGeometry(1,0);
 const shards=new THREE.InstancedMesh(rockGeo,mat('#151117',.13,.94),84);
 const d=new THREE.Object3D();
 for(let i=0;i<84;i++){
  const t=i/83,x=(t-.5)*W*1.13;
  const side=1-Math.abs(t-.5)*1.55;
  const h=15+rand(i+72)*55+(i%11===0?45:0);
  d.position.set(x,-H*.505+rand(i+29)*H*.085,-170+rand(i+15)*17);
  d.rotation.set(rand(i+3)*PI,rand(i+4)*PI,rand(i+18)*.7-.35);
  const spread=Math.max(.24,Math.abs(t-.5)*2);d.scale.set((13+rand(i+6)*27)*spread,h*(.44+spread*.6),17+rand(i+24)*17);
  d.updateMatrix();shards.setMatrixAt(i,d.matrix);
  const c=new THREE.Color().setRGB(.033+rand(i+7)*.04,.023+rand(i+19)*.025,.029+rand(i+10)*.026);
  shards.setColorAt(i,c);
 }
 shards.instanceMatrix.needsUpdate=true;shards.instanceColor.needsUpdate=true;parent.add(shards);
 // Reflexos de lava presos aos intervalos entre rochas.
 const embers=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),
   new THREE.MeshBasicMaterial({color:'#ca2e12',transparent:true,opacity:.66}),17);
 for(let i=0;i<17;i++){
  const x=(rand(i+87)-.5)*W;
  d.position.set(x,-H*.437+rand(i+14)*22,-158);
  d.rotation.set(0,0,0);d.scale.set(5+rand(i)*16,1.3,2.7);d.updateMatrix();embers.setMatrixAt(i,d.matrix);
 }
 embers.instanceMatrix.needsUpdate=true;parent.add(embers);
}
function eclipseCitadel(parent,W,H){
 // Silhueta gótica contra o sol vermelho, sem modelos/bitmaps.
 const x=W*.245,y=H*.239,z=-247;
 const dark=mat('#180a10',.18,.9),edge=mat('#41121b',.22,.8);
 mesh(new THREE.BoxGeometry(W*.25,H*.038,14),dark,parent,x,y,z);
 for(let i=0;i<21;i++){
  const t=(i-10)/10,px=x+t*W*.125;
  const h=H*(.052+(1-Math.abs(t))*.09+rand(i+200)*.05);
  mesh(new THREE.CylinderGeometry(4.5,7.5,h,5),dark,parent,px,y+h*.48,z);
  mesh(new THREE.ConeGeometry(10,h*.48,5),edge,parent,px,y+h*.94,z);
 }
}
function borderChains(parent,W,H){
 const geo=new THREE.TorusGeometry(10,3.2,5,12);
 const inst=new THREE.InstancedMesh(geo,mat('#32303a',.48,.73),84),d=new THREE.Object3D();
 const strands=[[[-W*.57,H*.56],[-W*.34,H*.26],28],[[-W*.57,-H*.27],[-W*.25,-H*.61],32],[[W*.57,H*.54],[W*.36,H*.32],24]];
 let idx=0;for(const [a,b,n] of strands){
  const angle=Math.atan2(b[1]-a[1],b[0]-a[0]);
  for(let i=0;i<n;i++){const t=i/(n-1);
   d.position.set(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,16);
   d.rotation.set(.28,0,angle+(i%2?PI/2:0));
   d.scale.setScalar(Math.max(.42,H/800));d.updateMatrix();inst.setMatrixAt(idx++,d.matrix);
  }
 }
 inst.instanceMatrix.needsUpdate=true;parent.add(inst);
}
function eclipse(parent,W,H){
 const x=W*.245,y=H*.405,r=H*.094;
 const corona=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:"varying vec2 vUv;\nvoid main(){float d=length((vUv-.5)*2.);\nfloat glow=exp(-d*3.3)*.58+exp(-abs(d-.53)*15.)*.32;\nvec3 c=mix(vec3(.92,.055,.01),vec3(.99,.27,.07),d);\ngl_FragColor=vec4(c,glow*max(0.,1.-smoothstep(.8,1.1,d)));\n #include <tonemapping_fragment>\n #include <colorspace_fragment>}"});
 mesh(new THREE.PlaneGeometry(r*4.6,r*4.6),corona,parent,x,y,-295);
 const moon=new THREE.ShaderMaterial({fragmentShader:"varying vec2 vUv;\nfloat hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);\nreturn mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}\nvoid main(){\n vec2 v=(vUv-.5)*2.;float d=length(v);\n float clouds=n(v*8.)*.48+n(v*21.)*.25+n(v*3.)*.27;\n float limb=smoothstep(.69,.99,d);\n vec3 surface=mix(vec3(.028,.004,.013),vec3(.14,.013,.022),clouds);\n surface+=vec3(.11,.006,.009)*pow(max(0.,clouds-.35),1.9);\n vec3 fire=mix(vec3(.73,.035,.016),vec3(1.,.36,.05),pow(limb,3.));\n surface=mix(surface,fire,limb*.92);\n surface*=.72;\n gl_FragColor=vec4(surface,1.);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n}",
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'});
 mesh(new THREE.CircleGeometry(r,64),moon,parent,x,y,-283);
 mesh(new THREE.CircleGeometry(r*.79,64),new THREE.MeshBasicMaterial({color:'#180609'}),parent,x-r*.10,y+r*.08,-273);
 ring(parent,r*.98,r*.019,'#fc5428',0,0,-267).position.set(x,y,-267);
 ring(parent,r*1.035,r*.008,'#f1974c',0,0,-272,.72).position.set(x,y,-272);
 const glow=new THREE.PointLight('#ff311b',5,H*.9,1.5);glow.position.set(x,y,110);parent.add(glow);
}
function angel(parent,W,H){
 // Escultura gótica autoral em ShapeGeometry: anatomia em perfil, capuz,
 // capa, asa de penas individuais e halo. Não usa imagem ou GLB.
 const g=new THREE.Group();g.position.set(-W*.32,H*.315,-136);g.scale.setScalar(.78);parent.add(g);
 const S=H;
 const piece=(outline,color,z,metalness=0)=>{
  const sh=new THREE.Shape();for(const [k,...p] of outline){
   if(k==='M')sh.moveTo(p[0]*S,p[1]*S);
   if(k==='L')sh.lineTo(p[0]*S,p[1]*S);
   if(k==='Q')sh.quadraticCurveTo(...p.map(x=>x*S));
   if(k==='C')sh.bezierCurveTo(...p.map(x=>x*S));
  }
  const geo=z>0?new THREE.ExtrudeGeometry(sh,{depth:2.5,steps:1,bevelEnabled:true,bevelThickness:.7,bevelSize:.9,bevelSegments:2,curveSegments:12}):new THREE.ShapeGeometry(sh,10);
  const o=mesh(geo,new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.78,metalness}),g,0,0,z);
  return o;
 };
 // Reunir as 42 penas em 3 lotes de mesma cor sem perder suas curvas.
 const featherBins=new Map();
 const featherPiece=(outline,color,z)=>{
  const o=piece(outline,color,z),g0=o.geometry;
  const geo=g0.index?g0.toNonIndexed():g0,att=geo.getAttribute('position');
  let verts=featherBins.get(color);
  if(!verts){verts=[];featherBins.set(color,verts);}
  for(let i=0;i<att.count;i++)verts.push(att.getX(i),att.getY(i),att.getZ(i)+z);
  g.remove(o);if(geo!==g0)geo.dispose();g0.dispose();o.material.dispose();
 };
 // Plumas longas sobrepostas em camadas, com nervuras claras.
 for(const side of [-1,1]){
  for(let i=20;i>=0;i--){
   const t=i/20,rootX=side*(.016+t*.022),rootY=-.035+t*.026;
   const tipX=side*(.06+t*.25),tipY=.01+Math.sin(t*2.1)*.22-t*.03;
   featherPiece([['M',rootX,rootY],['Q',side*.13,.11,tipX,tipY],['Q',tipX-side*.012,tipY-.045,rootX,rootY]],
     i%3===0?'#465061':i%3===1?'#273144':'#202a3b',-38-i*.18);
  }
 }
 for(const [color,vertices] of featherBins){
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.computeVertexNormals();
  const m=new THREE.MeshStandardMaterial({color,roughness:.86,metalness:.08,side:THREE.DoubleSide});
  g.add(new THREE.Mesh(geo,m));
 }
 // Capa caída, ombreira reforçada, mangas, dobra de tecido.
 piece([['M',-.09,-.29],['C',-.13,-.15,-.18,-.01,-.085,.07],['C',-.04,.10,.035,.045,.07,-.025],
        ['C',.10,-.11,.14,-.27,.08,-.30],['L',-.09,-.29]],'#202330',-1);
 piece([['M',-.075,-.28],['Q',-.045,-.15,-.064,-.035],['Q',-.029,-.12,-.013,-.28]],'#434450',.8);
 piece([['M',.056,-.28],['Q',.016,-.14,.064,-.026],['Q',.092,-.11,.087,-.28]],'#12131c',1);
 piece([['M',-.1,.00],['Q',-.14,.055,-.054,.078],['Q',-.04,.04,-.006,.02],['Q',-.08,-.04,-.1,0]],'#50505c',7,.25);
 // Pescoço e perfil facial: nariz, testa, lábios, queixo e capuz escuro.
 piece([['M',-.03,.066],['L',-.024,.121],['Q',-.065,.151,-.043,.195],['Q',.002,.23,.062,.176],
       ['L',.070,.147],['L',.085,.135],['L',.069,.126],['L',.074,.106],
       ['Q',.052,.073,.024,.068],['L',-.03,.066]],'#33323d',8);
 piece([['M',-.067,.151],['Q',-.074,.242,-.002,.252],['Q',.082,.225,.093,.165],
       ['Q',.046,.204,-.006,.17],['Q',-.037,.133,-.043,.084],['L',-.067,.151]],'#20202d',11);
 piece([['M',-.054,.109],['Q',-.028,.054,.006,.062],['Q',.009,.122,-.019,.155],['L',-.054,.109]],'#313440',13);
 piece([['M',.02,.149],['L',.061,.152],['L',.054,.147],['L',.02,.149]],'#a9958c',13);
 // Retrato esculpido em profundidade: olhar, nariz, boca e madeixas.
 ball(g,S*.012,'#523c43',S*.051,S*.148,19,[.72,.39,.26]);
 ball(g,S*.005,'#d8b58c',S*.056,S*.15,21,[.48,.56,.3]);
 tube(g,[[S*.019,S*.17,19],[S*.046,S*.181,21],[S*.070,S*.17,20]],S*.0034,'#272331');
 tube(g,[[S*.071,S*.143,19],[S*.087,S*.138,19],[S*.079,S*.133,21]],S*.0031,'#b1817e');
 tube(g,[[S*.062,S*.106,19],[S*.074,S*.104,19],[S*.067,S*.095,19]],S*.0024,'#774e4f');
 ball(g,S*.021,'#443742',S*.006,S*.113,12,[1.5,.96,.33]);
 // Capuz drapeado e fios sutis: sem espinhos cartunescos na cabeça.
 piece([['M',-.074,.158],['C',-.094,.235,-.065,.278,-.008,.267],
  ['C',.043,.262,.095,.221,.102,.159],['C',.049,.204,-.012,.199,-.042,.126],
  ['L',-.074,.158]],'#171923',24);
 piece([['M',-.072,.163],['C',-.095,.09,-.103,.021,-.064,-.043],
  ['C',-.035,.015,-.024,.083,-.039,.137],['L',-.072,.163]],'#30303e',23);
 for(let i=0;i<9;i++){
  const t=i/8,x=S*(-.048+t*.085);
  tube(g,[[x,S*.2,25],[x-S*.008,S*(.238+.014*Math.sin(i)),25],
   [x-S*(.019+.008*rand(i+10)),S*(.244+.013*rand(i+19)),24]],
   S*.0017,i%2?'#444657':'#565566');
 }
 // Sobreposição de placas de couro com brilho de metal antigo.
 for(let i=0;i<10;i++){
  const x=-S*.082+S*.025*(i%5),y=-S*.018-S*.023*Math.floor(i/5);
  ball(g,S*.011,i%2?'#343644':'#646572',x,y,13,[1.6,.55,.2]);
 }
 // Mão diante do peito, em prece.
 piece([['M',.09,.0],['Q',.17,.027,.142,.072],['Q',.102,.09,.065,.012],['L',.09,.0]],'#75595b',14);
 // Iluminação recortada azul: material escuro ganha contorno e textura,
 // sem clarear o rosto inteiro como uma ilustração cartunesca.
 const moonlight=new THREE.PointLight('#427fa9',3.2,S*.48,2);
 moonlight.position.set(-S*.12,S*.16,56);g.add(moonlight);
 const halo=ring(g,S*.072,S*.003,'#c29d78',.22,-.15,-40,.58);halo.position.set(-S*.012,S*.198,-40);
 return g;
}
function infernalGround(parent,W,H){
 // Rachaduras Voronoi entre placas rochosas (não linhas senoides artificiais).
 const material=new THREE.ShaderMaterial({depthWrite:false,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:"varying vec2 vUv;\nfloat h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);\nreturn mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}\nfloat crack(vec2 p){\n vec2 ip=floor(p),fp=fract(p);float d1=10.,d2=10.;\n for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){\n  vec2 o=vec2(float(i),float(j)),cell=ip+o;\n  vec2 seed=o+vec2(h(cell),h(cell+13.1))*.74+.13;\n  float d=length(seed-fp);\n  if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;\n }\n return max(0.,d2-d1);\n}\nvoid main(){\n vec2 uv=vUv;\n float f=n(uv*vec2(11.,4.)),detail=n(uv*vec2(41.,13.));\n vec2 warp=uv*vec2(20.,6.)+vec2(f,detail)*.58;\n float e=crack(warp);\n float gap=1.-smoothstep(.006,.026,e);\n float ridge=detail*.58+f*.42;\n vec3 stone=mix(vec3(.016,.010,.014),vec3(.075,.027,.029),ridge);\n stone+=vec3(.028,.008,.011)*n(uv*vec2(89.,17.));\n float glow=gap*(.34+.66*n(uv*vec2(7.,3.)))*(.52+pow(1.-uv.y,1.6)*.48);\n vec3 lava=vec3(.82,.11,.025)*glow+vec3(.4,.09,.025)*pow(glow,3.);\n vec3 col=stone+lava;\n col*=.8+.2*n(uv*vec2(5.,2.));\n col*=.58;gl_FragColor=vec4(col,1.);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n}"});
 mesh(new THREE.PlaneGeometry(W,H*.32),material,parent,0,-H*.42,-188);
}
function updateCoordinates(root,scene,camera,groups,details,viewport){
 const W=root.clientWidth,H=root.clientHeight;if(!W||!H)return;
 camera.left=-W/2;camera.right=W/2;camera.top=H/2;camera.bottom=-H/2;camera.updateProjectionMatrix();
 const rect=root.getBoundingClientRect();
 const rpos=el=>{const b=el.getBoundingClientRect();return {x:b.left+b.width/2-rect.left-W/2,y:H/2-(b.top+b.height/2-rect.top),radius:Math.min(b.width,b.height)*.47};};
 for(let i=0;i<7;i++){
  const el=root.querySelector('.gx-orb[data-id="'+(i+1)+'"]');
  if(!el)continue;const p=rpos(el),g=groups[i];
  const original=g.userData.originalRadius;g.position.set(p.x,p.y,15);
  g.userData.screenScale=p.radius/original;
  g.userData.screenRadius=p.radius;
  g.scale.setScalar(g.userData.screenScale);
 }
 // Corrente vermelha animável entre os sete mundos, feita de curvas 3D.
 if(details.chains){
  const pts=groups.map(g=>new THREE.Vector3(g.position.x,g.position.y,-20));
  const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
  const old=details.chains.geometry;
  details.chains.geometry=new THREE.TubeGeometry(curve,112,2.2,5,false);
  old.dispose();
 }
 const pane=root.querySelector('.gx-art');if(pane&&details.planet){
  const p=rpos(pane);details.planet.position.set(p.x,p.y,18);
  details.planet.scale.setScalar(clamp(p.radius,28,Math.min(H*.16,130))/details.planet.userData.originalRadius);
 }
 const canvas=root.querySelector('.gx-three-canvas');if(canvas)viewport.renderer.setSize(W,H,false);
}
export function mountThreeGalaxyScene(root,{onSelect}={}){
 if(!root||!THREE.WebGLRenderer)return null;
 let renderer;
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:false});
 }catch(e){console.warn('[Galáxias] WebGL indisponível, usando fallback SVG',e);return null;}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
 const canvas=renderer.domElement;canvas.className='gx-three-canvas';canvas.setAttribute('aria-hidden','true');root.prepend(canvas);
 const scene=new THREE.Scene(),W=root.clientWidth,H=root.clientHeight;
 const camera=new THREE.OrthographicCamera(-W/2,W/2,H/2,-H/2,.1,2000);camera.position.set(0,0,400);
 scene.add(new THREE.AmbientLight('#8995b2',.88));
 const key=new THREE.DirectionalLight('#ffdbba',2.15);key.position.set(-130,220,220);scene.add(key);
 const red=new THREE.PointLight('#ff3a17',3.4,H*1.25,1.5);red.position.set(W*.3,H*.25,150);scene.add(red);
 const environment=new THREE.Group();scene.add(environment);
 const shader=sky(environment,W,H);
 const smokes=[smokeLayer(environment,W,H,'#263955',-W*.19,H*.26,-310),smokeLayer(environment,W,H,'#781327',W*.28,H*.27,-309)];
 gothicRuins(environment,W,H);infernalGround(environment,W,H);eclipse(environment,W,H);eclipseCitadel(environment,W,H);borderChains(environment,W,H);angel(environment,W,H);starfield(environment,W,H);
 const embers=emberField(environment,W,H);
 const groups=[],details={planet:null,chains:null};
 // Halo da seleção: gradiente HDR calculado em shader, sem JPG/PNG.
 const selectionHalo=new THREE.Mesh(new THREE.PlaneGeometry(1,1),
  new THREE.ShaderMaterial({
   uniforms:{uColor:{value:new THREE.Color('#f8b15a')},uTime:{value:0}},
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'uniform vec3 uColor;uniform float uTime;varying vec2 vUv;void main(){float d=length((vUv-.5)*2.);float v=exp(-d*d*6.)*(.38+.06*sin(uTime*1.3));gl_FragColor=vec4(uColor,v*(1.-smoothstep(.65,1.,d)));\n#include <colorspace_fragment>\n}',
   transparent:true,depthWrite:false,blending:THREE.AdditiveBlending
  }));
 selectionHalo.renderOrder=-1;scene.add(selectionHalo);
 details.chains=new THREE.Mesh(
  new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:'#ff3b20',toneMapped:false,depthWrite:false})
 );
 details.chains.renderOrder=-2;scene.add(details.chains);
 for(let id=1;id<=7;id++){const g=makePlanet(id,64);g.userData.originalRadius=64;scene.add(g);groups.push(g);}
 // O retrato de destaque compartilha texturas/malhas com o planeta do topo.
 details.planet=groups[0].clone(true);details.planet.userData.originalRadius=64;scene.add(details.planet);
 const size=()=>updateCoordinates(root,scene,camera,groups,details,{renderer});
 const observer=new ResizeObserver(size);observer.observe(root);
 const selected=()=>Number(root.querySelector('.gx-orb.sel')?.dataset.id||1);
 function setSelected(id){
  const current=details.planet;scene.remove(current);
  // Reutilizar modelo já criado evita gerar texturas e geometrias a cada clique.
  const copy=groups[id-1].clone(true);copy.userData.originalRadius=64;
  details.planet=copy;scene.add(copy);size();
 }
 let lastSelection=1,frame=0,elapsed=0,prev=0,running=true,id=0,lastTelemetry=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const coarsePointer=matchMedia('(pointer:coarse)').matches;
 const parallax={x:0,y:0};
 const pointer=e=>{const b=root.getBoundingClientRect();
  parallax.x=clamp(((e.clientX-b.left)/Math.max(1,b.width)-.5)*-W*.014,-12,12);
  parallax.y=clamp(((e.clientY-b.top)/Math.max(1,b.height)-.5)*H*.012,-8,8);
 };
 root.addEventListener('pointermove',pointer,{passive:true});
 const tick=ms=>{
  if(!running||!root.isConnected)return;
  id=requestAnimationFrame(tick);
  if(document.hidden||root.classList.contains('leaving'))return;
  // Calcular delta apenas quando renderizar: evita animação em meia velocidade
  // em telas de 60 Hz com limitador de 30 FPS.
  const mobile=coarsePointer||root.clientWidth<950;
  if(ms-frame<(reduced?1000:(mobile?32:16)))return;
  const dt=Math.min(.06,(ms-prev||16)/1000);prev=ms;elapsed+=dt;frame=ms;
  shader.uniforms.uTime.value=elapsed;for(const m of smokes)m.uniforms.uTime.value=elapsed;
  if(!reduced){
   environment.position.x+=(parallax.x-environment.position.x)*Math.min(1,dt*2.6);
   environment.position.y+=(parallax.y-environment.position.y)*Math.min(1,dt*2.6);
   for(let i=0;i<embers.count;i++){
    const at=i*3+1;embers.coords[at]+=(6+rand(i+42)*22)*dt;
    if(embers.coords[at]>H*.14)embers.coords[at]=-H*.49;
   }
   embers.attr.needsUpdate=true;
  }
  if(!reduced){
   groups.forEach((g,i)=>{g.rotation.y=Math.sin(elapsed*.13+i)*.11;g.rotation.z=Math.sin(elapsed*.43+i)*.012;});
   details.planet.rotation.y=Math.sin(elapsed*.2)*.075;
  }
  const now=selected();if(now!==lastSelection){lastSelection=now;setSelected(now);}
  groups.forEach((g,i)=>{
   const target=g.userData.screenScale*(i+1===now?1.055:1);
   g.scale.setScalar(g.scale.x+(target-g.scale.x)*Math.min(1,dt*9));
  });
  const active=groups[now-1];
  if(active){
   selectionHalo.position.set(active.position.x,active.position.y,active.position.z-23);
   selectionHalo.scale.setScalar(active.userData.screenRadius*2.85);
   selectionHalo.material.uniforms.uColor.value.set([0xfbc77f,0x34ca75,0xeab95e,0xaadfff,0xfb537c,0xf85433,0xf782ca][now-1]);
   selectionHalo.material.uniforms.uTime.value=elapsed;
  }
  renderer.render(scene,camera);
  // Telemetria sem alocação por frame para auditoria do custo real na GPU.
  if(ms-lastTelemetry>1200){
   lastTelemetry=ms;
   root.dataset.gxDrawCalls=String(renderer.info.render.calls);
   root.dataset.gxTriangles=String(renderer.info.render.triangles);
   root.dataset.gxTextures=String(renderer.info.memory.textures);
  }
 };
 function lost(e){e.preventDefault();root.classList.remove('gx-three-on');}
 function restored(){if(running&&root.isConnected)root.classList.add('gx-three-on');}
 canvas.addEventListener('webglcontextlost',lost,{passive:false});canvas.addEventListener('webglcontextrestored',restored);
 root.classList.add('gx-three-on');size();id=requestAnimationFrame(tick);
 const stop=()=>{
  running=false;cancelAnimationFrame(id);observer.disconnect();root.removeEventListener('pointermove',pointer);canvas.removeEventListener('webglcontextrestored',restored);canvas.removeEventListener('webglcontextlost',lost);
  for(const object of scene.children){object.traverse?.(v=>{v.geometry?.dispose?.();if(v.material){const ms=Array.isArray(v.material)?v.material:[v.material];for(const m of ms){m.map?.dispose?.();m.dispose?.();}}});}
  renderer.dispose();canvas.remove();root.classList.remove('gx-three-on');
 };
 const rmo=new MutationObserver(()=>{if(!root.isConnected){rmo.disconnect();stop();}});rmo.observe(document.body,{childList:true,subtree:true});
 return {stop,renderer,canvas,select:setSelected};
}
