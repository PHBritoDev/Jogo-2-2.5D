/**
 * Eldória — direção artística ambiental original, inspirada em princípios de
 * leitura de silhuetas, espaços de repouso e integração de natureza/arquitetura.
 * Nenhum personagem, habilidade ou cena da campanha é instanciado aqui.
 */
export function buildEldoriaArt(THREE,scene,{height,streamDistance,pondSdf,rand,lowSpec}){
 const counts={fencePosts:0,flowers:0,understory:0,arches:0,roots:0};
 const mat=(c,extra={})=>new THREE.MeshStandardMaterial({color:c,roughness:1,...extra});
 const cream=mat(0xe2e5ce),ivory=mat(0xd2dfc4),wood=mat(0x80715a);
 const moss=mat(0x527a3b),fernMat=[mat(0x3e6739,{side:THREE.DoubleSide}),mat(0x5b8e43,{side:THREE.DoubleSide})];
 const dummy=new THREE.Object3D();
 function batch(geo,material,placements){
  if(!placements.length)return;
  const inst=new THREE.InstancedMesh(geo,material,placements.length);
  inst.castShadow=false;inst.receiveShadow=true;
  for(let i=0;i<placements.length;i++){
   const p=placements[i];dummy.position.set(p.x,p.y,p.z);
   dummy.rotation.set(p.pitch||0,p.rotation||0,p.roll||0);
   dummy.scale.set(p.sx||1,p.sy||1,p.sz||1);dummy.updateMatrix();
   inst.setMatrixAt(i,dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate=true;
  inst.computeBoundingSphere();scene.add(inst);
 }
 // Vila com praça de água como centro emocional da composição.
 const fountain=new THREE.Group();
 const stone=new THREE.Mesh(new THREE.CylinderGeometry(3.45,3.6,.55,40),ivory);
 stone.position.y=.27;stone.receiveShadow=true;fountain.add(stone);
 // O roteiro canônico especifica fonte SECA; decoração do mundo reforça a fome.
 const pool=new THREE.Mesh(new THREE.CircleGeometry(3.05,48),
   new THREE.MeshStandardMaterial({color:0x8a9580,roughness:1,side:THREE.DoubleSide}));
 pool.rotation.x=-Math.PI/2;pool.position.y=.59;fountain.add(pool);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(3.22,.28,7,40),cream);
 rim.rotation.x=Math.PI/2;rim.position.y=.77;rim.receiveShadow=true;fountain.add(rim);
 const center=new THREE.Mesh(new THREE.CylinderGeometry(.4,.58,.75,12),cream);
 center.position.y=.96;fountain.add(center);
 const spout=new THREE.Mesh(new THREE.SphereGeometry(.19,10,8),cream);
 spout.position.y=1.48;fountain.add(spout);
 // Sulcos finos e pedra rachada dentro da bacia, sem água corrente.
 const cracks=new THREE.Group();
 const crackMat=new THREE.LineBasicMaterial({color:0x59664f,transparent:true,opacity:.72});
 for(let i=0;i<6;i++){
  const a=(i/6)*Math.PI*2+.3,pts=[];
  for(let k=0;k<6;k++){
   const t=k/5*2.25;
   pts.push(new THREE.Vector3(Math.cos(a+.11*Math.sin(k*3+i))*t,.603,Math.sin(a+.11*Math.sin(k*3+i))*t));
  }
  const g=new THREE.BufferGeometry().setFromPoints(pts);
  cracks.add(new THREE.Line(g,crackMat));
 }
 fountain.add(cracks);
fountain.position.set(1.5,height(1.5,-41.5)+.05,-41.5);
 scene.add(fountain);
 // Caixotes vazios e sacas abandonadas: pista visual da falta de mercadorias.
 const emptyBoxes=[],emptySacks=[];
 for(const [x,z,rot] of [[11,-40,.2],[14,-39,.8],[16,-40,-.2],[21,-62,.5],[-5,-45,.3],[-7,-44,.6]]){
   emptyBoxes.push({x,y:height(x,z)+.36,z,rotation:rot,sx:.9,sy:.72,sz:.78});
 }
 for(const [x,z] of [[9,-43],[19,-61],[-5,-48]]){
   emptySacks.push({x,y:height(x,z)+.22,z,sx:.6,sy:.40,sz:1.1});
 }
 batch(new THREE.BoxGeometry(1,1,1),mat(0x776046),emptyBoxes);
 batch(new THREE.IcosahedronGeometry(1,1),mat(0x9f9c7c),emptySacks);
 // Cercas claras delimitam quintais sem isolar o mercado ou impedir as ruas.
 const posts=[],rails=[];
 const gardens=[
  {x:-19,z:-51,r:7.7,phase:.5},{x:18,z:-53,r:7.8,phase:-.1},
  {x:-22,z:-32,r:7.5,phase:1.2},{x:28,z:-29,r:7.6,phase:.9}
 ];
 for(const g of gardens){
  const sections=18,angle0=g.phase;
  for(let i=0;i<sections;i++){
   const a=angle0+i/sections*Math.PI*2,centerX=g.x+Math.cos(a)*g.r,centerZ=g.z+Math.sin(a)*g.r;
   if(Math.hypot(centerX-1.5,centerZ+41.5)<8)continue;
   if(streamDistance(centerX,centerZ)<5)continue;
   if(Math.abs(centerZ+43)<3.3)continue;
   const h=height(centerX,centerZ);
   posts.push({x:centerX,z:centerZ,y:h+.57,rotation:a,sx:.16,sy:1.15,sz:.16});
   counts.fencePosts++;
  }
 }
 batch(new THREE.BoxGeometry(1,1,1),cream,posts);
 // Pequenas pedras claras e flores junto à arquitetura, preservando as travessias.
 const petals=[],leaves=[],ferns=[];
 const num=lowSpec?580:1030;
 for(let i=0;i<num;i++){
  const x=(rand(i,234)-.5)*230,z=(rand(i,375)-.5)*225;
  const river=streamDistance(x,z),lake=pondSdf(x,z),town=Math.hypot(x-2,z+42);
  const roadCentral=Math.abs(z+43)<5&&x>-28&&x<36;
  if(river<4.2||lake<1.06||roadCentral||town<7)continue;
  // Forma agrupamentos orgânicos junto às margens e sob a mata.
  const nearWater=river<14 || lake<1.9;
  if(!nearWater&&town>78&&i%3===0)continue;
  const y=height(x,z);
  if(i%5===0){
   const scale=.26+rand(i,30)*.21;
   petals.push({x,y:y+.14,z,sx:scale,sy:scale*.8,sz:scale});
  }else{
   const scale=.34+rand(i,63)*.38;
   ferns.push({x,y:y+.17,z,rotation:rand(i,14)*6.283,
     sx:scale,sy:scale*(1.2+rand(i,29)*.4),sz:scale});
  }
 }
 // Lâmina curva de samambaia em 2 triângulos (sem transparência cara).
 const leafGeo=new THREE.BufferGeometry();
 leafGeo.setAttribute('position',new THREE.Float32BufferAttribute([
  -.45,0,0, .4,.12,0, 0,1.0,.07,
   .4,.12,0, .35,.55,.04, 0,1.0,.07
 ],3));leafGeo.setIndex([0,1,2,3,4,5]);leafGeo.computeVertexNormals();
 batch(leafGeo,fernMat[0],ferns.filter((_,i)=>i%2===0));
 batch(leafGeo,fernMat[1],ferns.filter((_,i)=>i%2!==0));
 batch(new THREE.IcosahedronGeometry(1,0),mat(0xe6d9a8,{emissive:0x261e08,emissiveIntensity:.08}),petals);
 counts.flowers=petals.length;counts.understory=ferns.length;
 // Arcos de pedra pontuam a ponte; recortam visualmente a passagem.
 const curve=new THREE.CatmullRomCurve3([
  new THREE.Vector3(-3.1,0,0),new THREE.Vector3(-2.3,3.2,0),
  new THREE.Vector3(0,4.4,0),new THREE.Vector3(2.3,3.2,0),
  new THREE.Vector3(3.1,0,0)
 ]);
 const archGeo=new THREE.TubeGeometry(curve,24,.24,6,false);
 for(const [x,z,rotation] of [[-21,-6,.4]]){
  const arch=new THREE.Mesh(archGeo,cream);
  arch.position.set(x,height(x,z)+.12,z);arch.rotation.y=rotation;
  arch.receiveShadow=true;scene.add(arch);counts.arches++;
 }

 // Margens do lago: colchões musgosos, folhagens aquáticas e transição fina.
 // A água central continua livre, criando pausa visual entre árvores densas.
 const shoreRocks=[],pads=[];
 for(let i=0;i<58;i++){
   const angle=i*Math.PI*2/58;
   const contour=1+.075*Math.sin(angle*5+.4)+.036*Math.sin(angle*11-1.2);
   const radius=1.035+rand(i,117)*.30;
   const x=-42+Math.cos(angle)*14.8*contour*radius;
   const z=24+Math.sin(angle)*10.8*contour*radius;
   const scale=.4+rand(i,38)*.75;
   shoreRocks.push({x,z,y:height(x,z)+scale*.17,
     sx:scale*1.4,sy:scale*.36,sz:scale});
 }
 for(let i=0;i<15;i++){
   const angle=rand(i,67)*Math.PI*2,r=.22+rand(i,127)*.58;
   const x=-42+Math.cos(angle)*14.8*r,z=24+Math.sin(angle)*10.8*r;
   const scale=.23+rand(i,87)*.33;
   pads.push({x,z,y:-.917,rotation:angle,sx:scale,sy:.025,sz:scale*.75});
 }
 batch(new THREE.IcosahedronGeometry(1,0),mat(0x637950),shoreRocks);
 batch(new THREE.CylinderGeometry(1,1,1,8),mat(0x517f50,{side:THREE.DoubleSide}),pads);
 counts.shoreRocks=shoreRocks.length;counts.lilyPads=pads.length;
 // Linha de espuma discreta que acompanha o contorno real do lago.
 const foamPositions=[],foamTriangles=[];
 for(let i=0;i<=96;i++){
   const a=i/96*Math.PI*2;
   const contour=1+.075*Math.sin(a*5+.4)+.036*Math.sin(a*11-1.2);
   for(const r of [.965,1.012]){
     foamPositions.push(-42+Math.cos(a)*14.8*contour*r,-.915,
       24+Math.sin(a)*10.8*contour*r);
   }
   if(i>0){const j=(i-1)*2;foamTriangles.push(j,j+1,j+2,j+1,j+3,j+2);}
 }
 const foamGeo=new THREE.BufferGeometry();
 foamGeo.setAttribute('position',new THREE.Float32BufferAttribute(foamPositions,3));
 foamGeo.setIndex(foamTriangles);foamGeo.computeVertexNormals();
 const foam=new THREE.Mesh(foamGeo,new THREE.MeshBasicMaterial({
   color:0xb2e3cf,transparent:true,opacity:.24,depthWrite:false,
   side:THREE.DoubleSide
 }));
 foam.renderOrder=2;scene.add(foam);
 // Raízes de apoio ao redor de troncos ancestrais, sem alterar os GLBs.
 const roots=[];
 for(const [cx,cz,radius] of [[55,-36,6.1],[-53,-28,5.7]]){
  for(let i=0;i<7;i++){
   const angle=i*Math.PI*2/7+.2,s=radius*(.82+rand(i,cx)*.45);
   const a=new THREE.Vector3(cx,height(cx,cz)+2.25,cz);
   const b=new THREE.Vector3(cx+Math.cos(angle)*s*.43,height(cx,cz)+1.4,cz+Math.sin(angle)*s*.43);
   const c=new THREE.Vector3(cx+Math.cos(angle)*s,height(cx+Math.cos(angle)*s,cz+Math.sin(angle)*s)+.12,cz+Math.sin(angle)*s);
   const path=new THREE.QuadraticBezierCurve3(a,b,c);
   const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,10,.3,5,false),wood);
   mesh.castShadow=false;scene.add(mesh);counts.roots++;
  }
 }
 return counts;
}
