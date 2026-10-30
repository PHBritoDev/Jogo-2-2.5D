import {hash} from './celestial-fxkit3d.js';
/** Pooled solid shards and branching fissures. No terrain mutation, flat rings or per-hit allocations. */
export function impactFragments(T,root,ground,max=360){
 const rockGeo=new T.IcosahedronGeometry(1,0),rockMat=new T.MeshStandardMaterial({color:0x605352,roughness:.9});
 const lineGeo=new T.BoxGeometry(1,1,1),lineMat=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false});
 const rocks=new T.InstancedMesh(rockGeo,rockMat,max),cracks=new T.InstancedMesh(lineGeo,lineMat,max);
 for(const m of [rocks,cracks]){m.frustumCulled=false;root.add(m);}cracks.instanceColor=new T.InstancedBufferAttribute(new Float32Array(max*3),3);
 const d=new T.Object3D(),a=new T.Vector3(),b=new T.Vector3(),v=new T.Vector3(),up=new T.Vector3(0,1,0),unit=new T.Vector3(),c=new T.Color();let nr=0,nc=0;
 return {begin(){nr=nc=0;},add(P,age,size,col,seed=1,style='radial',low=false){
  if(age<0||age>1.8)return;const fade=Math.max(0,1-age/1.8),n=low?8:16;
  for(let i=0;i<n;i++){
   const angle=style==='x'?(i%4)*Math.PI/2+Math.PI/4+(hash(i+seed)-.5)*.2:i*2.399+seed;
   const r=size*(.3+hash(i*3+seed)*.6),speed=size*(1+hash(i+9)),travel=Math.min(age,1.2)*speed;
   const x=P.x+Math.cos(angle)*(r+travel),z=P.z+Math.sin(angle)*(r+travel),gy=ground(x,z);
   if(nr<max){d.position.set(x,gy+.08+Math.max(0,age*size*2-5*age*age),z);d.rotation.set(i+age*4,angle,age*2);const s=size*(.06+hash(i+seed)*.08)*fade;d.scale.set(s*1.8,s*.7,s);d.updateMatrix();rocks.setMatrixAt(nr++,d.matrix);}
   let x0=P.x,z0=P.z;
   for(let k=1;k<=3&&nc<max;k++){const rr=r*k/3,aa=angle+(hash(i*9+k+seed)-.5)*.28,x1=P.x+Math.cos(aa)*rr,z1=P.z+Math.sin(aa)*rr;
    a.set(x0,ground(x0,z0)+.055,z0);b.set(x1,ground(x1,z1)+.055,z1);v.subVectors(b,a);d.position.copy(a).add(b).multiplyScalar(.5);d.quaternion.setFromUnitVectors(up,unit.copy(v).normalize());d.scale.set(size*.025*fade,v.length(),size*.025*fade);d.updateMatrix();cracks.setMatrixAt(nc,d.matrix);c.setRGB(col[0]*fade,col[1]*fade,col[2]*fade);cracks.setColorAt(nc++,c);x0=x1;z0=z1;
   }
  }
 },end(){rocks.count=nr;cracks.count=nc;rocks.instanceMatrix.needsUpdate=cracks.instanceMatrix.needsUpdate=true;cracks.instanceColor.needsUpdate=true;},dispose(){root.remove(rocks,cracks);rockGeo.dispose();rockMat.dispose();lineGeo.dispose();lineMat.dispose();rocks.dispose();cracks.dispose();}};
}
