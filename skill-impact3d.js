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
/** A continuous loft sampled by arc length. The silhouette has flowing fins, never stacked spheres. */
export function dragonLoft(T,root,material){
 const N=100,R=12,pos=new Float32Array((N+1)*(R+1)*3),norm=new Float32Array(pos.length),idx=[];
 for(let j=0;j<N;j++)for(let k=0;k<R;k++){const a=j*(R+1)+k,b=a+R+1;idx.push(a,b,a+1,a+1,b,b+1);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('normal',new T.BufferAttribute(norm,3).setUsage(T.DynamicDrawUsage));geo.setIndex(idx);
 const mesh=new T.Mesh(geo,material);mesh.frustumCulled=false;root.add(mesh);
 const centers=Array.from({length:N+1},()=>new T.Vector3()),f=new T.Vector3(),side=new T.Vector3(),up=new T.Vector3(),axis=new T.Vector3(0,1,0);
 return{mesh,centers,update(s,fade=1){mesh.visible=s.phase!=='channel';if(!mesh.visible)return;
  let total=0;for(let k=1;k<s.trailCount;k++){const a=s.sample(k-1),b=s.sample(k);total+=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}
  const length=Math.min(58,total);let k=1,acc=0;
  for(let j=0;j<=N;j++){const distance=length*j/N;while(k<s.trailCount-1){const a=s.sample(k-1),b=s.sample(k),l=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);if(acc+l>=distance)break;acc+=l;k++;}
   const a=s.sample(Math.max(0,k-1)),b=s.sample(k),l=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)||1,u=Math.min(1,(distance-acc)/l);centers[j].set(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,a.z+(b.z-a.z)*u);
  }
  for(let j=0;j<=N;j++){const u=j/N,c=centers[j];f.subVectors(centers[Math.max(0,j-1)],centers[Math.min(N,j+1)]).normalize();if(f.lengthSq()<.01)f.set(0,0,1);side.crossVectors(axis,f).normalize();if(side.lengthSq()<.01)side.set(1,0,0);up.crossVectors(f,side);
   const radius=(1.65*Math.pow(1-u,.65)+.02)*Math.min(1,length/9)*fade;
   for(let n=0;n<=R;n++){const a=n/R*Math.PI*2,wave=Math.sin(u*64-s.time*5+a*3)*.08,fin=Math.pow(Math.max(0,Math.sin(a)),10)*(.4+.3*Math.sin(u*115-s.time*7));const r=radius*(1+wave+fin),cs=Math.cos(a),sn=Math.sin(a),o=(j*(R+1)+n)*3;
    pos[o]=c.x+(side.x*cs+up.x*sn)*r;pos[o+1]=c.y+(side.y*cs+up.y*sn)*r;pos[o+2]=c.z+(side.z*cs+up.z*sn)*r;norm[o]=side.x*cs+up.x*sn;norm[o+1]=side.y*cs+up.y*sn;norm[o+2]=side.z*cs+up.z*sn;
   }
  }geo.attributes.position.needsUpdate=geo.attributes.normal.needsUpdate=true;
 },dispose(){root.remove(mesh);geo.dispose();}};
}
/** Curved, tapered flame tongues with closed diamond cross sections, pooled along the mane/spine. */
export function dragonFlames(T,root,mat){
 const pos=[],idx=[],rows=10;for(let j=0;j<=rows;j++){const u=j/rows,w=Math.sin(Math.PI*u)*.34+.005;for(let k=0;k<4;k++){const a=k*Math.PI/2;pos.push(Math.cos(a)*w,u*2.4,Math.sin(a)*w*.32-u*u*.9);}}
 for(let j=0;j<rows;j++)for(let k=0;k<4;k++){const a=j*4+k,b=j*4+(k+1)%4;idx.push(a,a+4,b,b,a+4,b+4);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const mesh=new T.InstancedMesh(g,mat,150);mesh.frustumCulled=false;root.add(mesh);const d=new T.Object3D();
 return{update(s,fade,low,centers){let n=0;if(s.phase!=='channel')for(let i=0;i<100;i+=low?5:3){const p=centers[i],u=i/100,r=1.6*Math.pow(1-u,.65);for(const sign of [-1,1]){const a=i*.32+s.time*3,w=.7+.16*Math.sin(a);d.position.set(p.x+sign*r*.6,p.y+r*.45,p.z);d.rotation.set(-.55+Math.sin(a)*.2,0,-sign*(.5+Math.sin(a)*.15));d.scale.set(w*(1-u)*fade,(.65+.2*Math.sin(a))*(1-u)*fade,w*fade);d.updateMatrix();mesh.setMatrixAt(n++,d.matrix);}}mesh.count=n;mesh.instanceMatrix.needsUpdate=true;},dispose(){g.dispose();mesh.dispose();root.remove(mesh);}};

}
