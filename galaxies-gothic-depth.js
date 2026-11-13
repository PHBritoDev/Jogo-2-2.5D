/** Arquitetura infernal multicamada: somente malhas Three.js.
 * Sem fotografias, PNG, SVG ou carregamento de modelos.
 * Materiais/instâncias compartilhados para manter baixa pressão na GPU.
 */
import * as THREE from 'three';
const frac=x=>x-Math.floor(x);
const random=i=>frac(Math.sin(i*73.781+9.19)*37117.31);
function standard(hex,em=0){return new THREE.MeshStandardMaterial({color:hex,roughness:.82,metalness:.13,emissive:hex,emissiveIntensity:em});}
function inst(parent,geometry,material,items) {
 const group=new THREE.InstancedMesh(geometry,material,items.length);
 const ob=new THREE.Object3D();
 for(let i=0;i<items.length;i++){
  const [x,y,z,sx,sy,sz,rz=0]=items[i];
  ob.position.set(x,y,z);ob.scale.set(sx,sy,sz);ob.rotation.set(0,0,rz);ob.updateMatrix();
  group.setMatrixAt(i,ob.matrix);
 }
 group.instanceMatrix.needsUpdate=true;group.computeBoundingSphere();parent.add(group);return group;
}
export function addInfernalArchitecture(parent,W,H) {
 const basalt=standard('#100d15'),masonry=standard('#24202b'),roof=standard('#180d16');
 const ember=new THREE.MeshBasicMaterial({color:'#c84b22',toneMapped:false});
 // Penhascos em cinco planos sobrepostos, com silhueta diferente por camada.
 const planes=[[-238,.23,.85],[-223,.38,.83],[-207,.58,.82],[-191,.80,.78]];
 const cliff=new THREE.BufferGeometry(),positions=[],normals=[];
 for(let l=0;l<planes.length;l++){
  const [z,scale,y]=planes[l],count=48;
  const top=[],bottom=[];
  for(let i=0;i<=count;i++){
   const x=(i/count-.5)*W*1.16;
   let h=(random(i*41+l*37)*.44+random(i*11+l*7)*.25)*H*.13*scale;
   if(i%7===0)h+=H*.065*scale;
   top.push([x,-H*(y-.5)+h,z]);
   bottom.push([x,-H*.55,z]);
  }
  for(let i=0;i<count;i++){
   for(const ids of [[bottom[i],top[i],top[i+1]],[bottom[i],top[i+1],bottom[i+1]]]){
    ids.forEach(v=>positions.push(...v));
   }
  }
 }
 cliff.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));cliff.computeVertexNormals();
 const mesh=new THREE.Mesh(cliff,basalt);parent.add(mesh);
 // Espigões góticos distantes e janelas iluminadas por alvenaria.
 const shafts=[],tips=[],windows=[],archways=[];
 for(let i=0;i<64;i++){
  const t=i/63,cluster=random(i*5+2);
  let x=(t-.5)*W*1.12;
  const z=-245+(i%4)*4,baseY=H*(.10+random(i*9)*.13);
  const height=H*(.10+cluster*.23);
  const width=H*(.009+random(i*29)*.012);
  shafts.push([x,baseY+height*.4,z,width/7,height/110,1]);
  tips.push([x,baseY+height*.96,z,width/10,height/120,1]);
  windows.push([x,baseY+height*.48,z+11,width/13,height/510,1]);
  if(i%3===0){
   archways.push([x+width*1.6,baseY+height*.25,z+6,width/17,height/230,1]);
  }
 }
 // Cilindro com dimensões locais 7×110; sua escala explicita unidades.
 inst(parent,new THREE.CylinderGeometry(3,4,110,6),masonry,
  shafts.map(([x,y,z,sx,sy,sz])=>[x,y,z,sx,sy,sz]));
 inst(parent,new THREE.ConeGeometry(5,120,6),roof,
  tips.map(([x,y,z,sx,sy,sz])=>[x,y,z,sx,sy,sz]));
 inst(parent,new THREE.BoxGeometry(3,20,1),ember,windows);
 inst(parent,new THREE.BoxGeometry(2,16,1),ember,archways);
 // Cristais fosforescentes e rochedos de primeiro plano.
 const stones=[],crystals=[];
 for(let i=0;i<92;i++){
  const x=(random(i*41)-.5)*W*1.18,y=-H*.46+random(i*6)*H*.07;
  const a=H*(.012+random(i*7)*.041);
  stones.push([x,y,-130+random(i*12)*20,a,a*(.9+random(i*25)*1.7),a*.4,random(i*8)*.6]);
  if(i%8===0)crystals.push([x,y+a*.4,-109,a*.1,a*.78,a*.11,random(i*8)*.7]);
 }
 inst(parent,new THREE.IcosahedronGeometry(1,0),basalt,stones);
 inst(parent,new THREE.OctahedronGeometry(1,0),
  new THREE.MeshBasicMaterial({color:'#9b2b23',toneMapped:false}),crystals);
}
