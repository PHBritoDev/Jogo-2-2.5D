import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** Mod 232. Original paired weapon designs in EspadaProta's measured grip frame.
 * Grip y=.75, guard y=.40, tip y=-.951; no changes to damage or inventory. */
export function buildRiteSword(T,id){
 const aurora=id==='aurora',root=new T.Group(),g=new T.Group();root.name=aurora?'Aurora_Rubra_232':'Chamado_Celestial_232';
 g.position.y=.75;g.rotation.z=Math.PI;root.add(g);
 const metal=new T.MeshStandardMaterial({color:aurora?0x45404c:0xcbd5de,metalness:.48,roughness:.28,emissive:aurora?0x241526:0x303536,emissiveIntensity:.45});
 const trim=new T.MeshStandardMaterial({color:aurora?0x652037:0xc3994e,metalness:.55,roughness:.27,emissive:aurora?0x30101b:0x30220a,emissiveIntensity:.4});
 const edge=new T.MeshStandardMaterial({color:aurora?0xa7354c:0xf5eee0,metalness:.7,roughness:.21,emissive:aurora?0xa40024:0x8f5d12,emissiveIntensity:.35});
 const core=new T.MeshStandardMaterial({color:aurora?0xf12b4a:0xffdb81,emissive:aurora?0xef123b:0xffbc37,emissiveIntensity:.65,metalness:.35,roughness:.3});
 const violet=new T.MeshStandardMaterial({color:aurora?0x7b48ba:0xeac983,emissive:aurora?0x6f17d3:0x975f14,emissiveIntensity:.65,roughness:.3,metalness:.55});
 const leather=new T.MeshStandardMaterial({color:aurora?0x19101f:0x40352c,roughness:.82,metalness:.08});
 const add=(geo,mat,x=0,y=0,z=0)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m;};
 function plate(points,depth,material,z=0){const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.006,bevelThickness:.005,bevelSegments:2,curveSegments:8});geo.translate(0,0,-depth/2);return add(geo,material,0,0,z);}
 // Raised diamond cross-section, flared ricasso, recessed channels, distinct tip.
 const outline=aurora?[[-.072,.35],[-.103,.51],[-.066,1.36],[0,1.701],[.066,1.36],[.103,.51],[.072,.35]]:[[-.058,.35],[-.080,.46],[-.062,1.42],[0,1.701],[.062,1.42],[.080,.46],[.058,.35]];
 plate(outline,.040,metal);
 for(const side of [-1,1]){
  plate([[side*.068,.48],[side*.059,1.36],[0,1.691],[side*.045,1.36],[side*.053,.48]],.016,edge);
  for(const face of [-1,1]){
   plate([[side*.018,.48],[side*.030,.62],[side*.011,1.36],[0,1.57],[side*.004,1.27]],.007,core,face*.028);
   // Four engraved chevrons, no text or borrowed symbols.
   for(let i=0;i<4;i++)plate([[side*.025,.63+i*.14],[side*.044,.66+i*.14],[side*.023,.68+i*.14]],.004,violet,face*.030);
  }
  const guard=aurora?[[0,.31],[side*.13,.33],[side*.24,.45],[side*.31,.42],[side*.23,.30],[side*.10,.25],[0,.27]]:[[0,.29],[side*.13,.31],[side*.28,.42],[side*.30,.38],[side*.19,.26],[0,.24]];
  plate(guard,.065,trim);plate([[side*.11,.31],[side*.23,.38],[side*.19,.31]],.072,edge);
 }
 add(new T.CylinderGeometry(.031,.036,.27,12),leather,0,.12);
 for(let i=0;i<7;i++){const ring=add(new T.TorusGeometry(.034,.004,4,12),trim,0,.018+i*.032);ring.rotation.x=Math.PI/2;}
 const pom=add(new T.OctahedronGeometry(.058,1),trim,0,-.055);pom.scale.set(.85,1.35,.65);
 for(const z of [-.05,.05]){const jewel=add(new T.OctahedronGeometry(.042,1),violet,0,.29,z);jewel.scale.set(.8,1.3,.45);}
 // Batch each material once (six draws), including the engraved pieces.
 for(const material of [metal,trim,edge,core,violet,leather]){
  const meshes=g.children.filter(m=>m.material===material),geometries=meshes.map(m=>{m.updateMatrix();const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();return geo.applyMatrix4(m.matrix);});
  const merged=mergeGeometries(geometries,false);for(const m of meshes){g.remove(m);m.geometry.dispose();}geometries.forEach(x=>x.dispose());if(merged)g.add(new T.Mesh(merged,material));
 }
 root.userData.blade={base:[0,.40,0],tip:[0,-.951,0]};
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;}});
 return root;
}
