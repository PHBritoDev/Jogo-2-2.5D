// Far meshes keep the original GLB attributes. A reduced index buffer
// collapses nearby vertices within the same coarse texture island.
function distant(T,source){
 const position=source.attributes.position,uv=source.attributes.uv;
 source.computeBoundingBox();
 const lo=source.boundingBox.min,size=source.boundingBox.getSize(new T.Vector3());
 const cell=Math.max(size.x,size.y,size.z)/14;
 const cells=new Map(),remap=new Uint32Array(position.count);
 for(let i=0;i<position.count;i++){
  const x=Math.floor((position.getX(i)-lo.x)/cell),y=Math.floor((position.getY(i)-lo.y)/cell),z=Math.floor((position.getZ(i)-lo.z)/cell);
  const u=uv?Math.floor(uv.getX(i)*5):0,v=uv?Math.floor(uv.getY(i)*5):0;
  const key=[x,y,z,u,v].join('/');
  if(!cells.has(key))cells.set(key,i);
  remap[i]=cells.get(key);
 }
 const index=source.index?.array,indices=[],count=index?.length??position.count;
 for(let i=0;i<count;i+=3){
  const a=remap[index?index[i]:i],b=remap[index?index[i+1]:i+1],c=remap[index?index[i+2]:i+2];
  if(a!==b&&a!==c&&b!==c)indices.push(a,b,c);
 }
 const geometry=new T.BufferGeometry();
 for(const [key,attribute] of Object.entries(source.attributes))geometry.setAttribute(key,attribute);
 geometry.setIndex(indices);return geometry;
}
export function assetLod(T,group,file,source,material,instances){
 const meshes=[source.geometry,distant(T,source.geometry)].map(geometry=>{
  const mesh=new T.InstancedMesh(geometry,material,instances.length);
  mesh.name=file;group.add(mesh);return mesh;
 });
 const dummy=new T.Object3D();
 const entries=instances.map(([x,y,z,s,rz,ry,color])=>{
  dummy.position.set(x,y,z);dummy.rotation.set(0,ry,rz);dummy.scale.setScalar(s);dummy.updateMatrix();
  return {x,y,z,s,color:new T.Color(color),matrix:dummy.matrix.clone().multiply(source.matrixWorld)};
 });
 let lastX=Infinity,lastZ=Infinity,lastQuality='';
 function update(x,y,z,quality){
  if(quality===lastQuality&&Math.abs(x-lastX)+Math.abs(z-lastZ)<3)return;
  lastX=x;lastZ=z;lastQuality=quality;
  const counts=[0,0];
  for(const e of entries){
   const limit=(quality==='low'?10:18)+e.s*1.6;
   const level=(e.x-x)**2+(e.z-z)**2+(e.y-y)**2>limit**2?1:0;
   const m=meshes[level],slot=counts[level]++;
   m.setMatrixAt(slot,e.matrix);m.setColorAt(slot,e.color);
  }
  meshes.forEach((m,i)=>{
   m.count=counts[i];m.visible=m.count>0;if(!m.visible)return;
   m.instanceMatrix.needsUpdate=true;m.instanceColor.needsUpdate=true;m.computeBoundingSphere();
  });
 }
 update(0,21,172,'low');return update;
}
