import { masonry } from './volcano-cave-masonry.js';
import {solids,supported,nodes,basin,fixedRocks,creek} from './volcano-cave-layout.js';

// A rotating cross-section follows each branch's tangent. A split on the same
// bark strip exposes the orange core, tapering out before the tips.
function limb(T,b,points,radii,hot,smooth=false){
 if(smooth){
  const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)));
  const count=(points.length-1)*2;
  points=Array.from({length:count+1},(_,k)=>curve.getPoint(k/count).toArray());
  const rs=radii;radii=Array.from({length:count+1},(_,k)=>(rs[Math.floor(k/2)]+rs[Math.ceil(k/2)])*.5);
 }
 const rings=[],n=8,axis=new T.Vector3(),u=new T.Vector3(),v=new T.Vector3(),p=new T.Vector3();
 for(let k=0;k<points.length;k++){
  const a=points[Math.max(0,k-1)],c=points[Math.min(points.length-1,k+1)];
  axis.set(c[0]-a[0],c[1]-a[1],c[2]-a[2]).normalize();
  u.set(0,0,1).cross(axis);if(u.lengthSq()<.01)u.set(1,0,0).cross(axis);u.normalize();v.crossVectors(axis,u);
  const ring=[];for(let j=0;j<n;j++){const angle=j*Math.PI*2/n+.19*k,r=radii[k]*(1+.12*Math.sin(j*4+k));
   p.fromArray(points[k]).addScaledVector(u,Math.cos(angle)*r).addScaledVector(v,Math.sin(angle)*r);ring.push(p.toArray());}
  rings.push(ring);
 }
 for(let k=1;k<rings.length;k++)for(let j=0;j<n;j++){
  const m=(j+1)%n,a=rings[k-1][j],c=rings[k-1][m],d=rings[k][m],e=rings[k][j];
  b.quad(a,c,d,e,[0x392e35,0x44383b,0x30272c,0x514047][(j+k)%4]);
  if(hot&&(j===2||j===6)&&radii[k]>.09){const mix=(a,z,f)=>a.map((x,i)=>x+(z[i]-x)*f);
   const s=.3+.15*Math.sin(k*2.7+j),w=.055+.13*Math.abs(Math.sin(k*3.7));
   const q0=mix(a,c,s-.10),q1=mix(a,c,s+w+.12),q2=mix(e,d,.43+w+.14),q3=mix(e,d,.43-.08);
   b.quad(q0,q1,q2,q3,0x983422);b.quad(mix(a,c,s),mix(a,c,s+w),mix(e,d,.43+w),mix(e,d,.43),k%3===1?0xffbd64:0xff642d);
   if(k%2===1)b.face(mix(a,c,s),mix(a,c,s+.09),mix(q0,e,.6),0xff6925);
  }
 }
}
function tree(T,type,low=false){
 const group=new T.Group(),b=masonry(T,group,1401+type,{}),rand=b.random;
 const spines=[[[0,0,0],[-.4,2,0],[.7,4,.6],[.1,6,.3],[-1.4,8,.8],[-2.1,10,.4]],
 [[0,0,0],[.3,2,0],[2,3,.5],[3.6,3.15,.8],[4.7,5,1],[4.2,6,.6]],
 [[0,0,0],[-1,2,.1],[-1.5,4,-.3],[-.4,6,-.8],[1,7.7,.2],[.3,9,1.1]],
 [[0,0,0],[.6,2,.4],[.5,4.1,.9],[-.4,5,.3],[-.6,5.6,-.6],[.2,6.2,-1.3]]];
 const pts=spines[type];limb(T,b,pts,[1.5,.99,.79,.54,.34,.10],true,!low);
 for(let j=0;j<7;j++){
  const a=j*.90+rand()*.3,L=2+rand()*2;
  if(low&&j%2)continue;
  limb(T,b,[[0,1,0],[Math.cos(a),.45,Math.sin(a)],[Math.cos(a+.22)*L,.13,Math.sin(a+.22)*L],[Math.cos(a+.44)*(L+1),-.18,Math.sin(a+.44)*(L+1)]],[.65,.46,.18,.02],j%3===0);
 }
 for(let j=0;j<9;j++){const at=pts[2+j%4],a=j*2.4+type*.9,L=1.7+rand()*2.2,H=type===3?1:2.3+rand()*2;
  const bend=(s,h,tw)=>[at[0]+Math.cos(a+tw)*L*s,at[1]+H*h,at[2]+Math.sin(a+tw)*L*s];
  const joint=bend(.72,.37,.14),tip=bend(1,1,.6);
  limb(T,b,[at,bend(.43,.13,-.15),joint,tip,bend(1.13,1.32,.84)],[.38,.29,.21,.11,.012],true,!low);
  if(low)continue;
  limb(T,b,[joint,bend(1.04,.47,-.18),bend(1.34,.82,-.34)],[.16,.115,.008],false);
  limb(T,b,[tip,bend(.87,1.16,.71),bend(.81,1.45,.83)],[.095,.05,.006],false);
 }
 return b.finish();
}
export function grove(T,b,l,group,crystals){
 const random=b.random,stands=[[],[],[],[]];
 const trees=[[-9,70,0,1.9],[6,62,2,1.55],[-11,45,1,1.5],[10,38,3,1.5],[-14,18,0,1.3],[7,9,1,1.35],[-30,54,2,1.3],[13,64,3,1.2]];
 for(let i=0;i<160;i++){const x=(random()-.5)*103,z=-7+random()*92;if(supported(x,z)||Object.values(nodes).some(([a,c])=>Math.hypot(x-a,z-c)<8))continue;
  if(trees.some(t=>Math.hypot(t[0]-x,t[1]-z)<4.8))continue;trees.push([x,z,i%4,.61+random()*1.15]);}
 for(const [x,z,type,s] of trees){stands[type].push([x,z,s,random()*6]);b.cliff(x,-.65,z,3.8*s,4.4*s,6+random()*5,0x514349);
  solids.push({x,z,r:1.14*s,h:5.4*s,base:-.25});}
 const dummy=new T.Object3D(),clusters=[];
 stands.forEach((arr,type)=>{
  const near=tree(T,type),far=tree(T,type,true);
  far.material.map.dispose();far.material.dispose();
  const parts=[near,far].map(src=>{
   const m=new T.InstancedMesh(src.geometry,near.material,arr.length);
   m.name='Carvão vivo '+type;m.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(m);return m;
  });
  const entries=arr.map(([x,z,s,yaw])=>{
   dummy.position.set(x,-.15,z);dummy.rotation.set(0,yaw,0);dummy.scale.setScalar(s);dummy.updateMatrix();
   return {x,z,matrix:dummy.matrix.clone()};
  });
  clusters.push({parts,entries});
 });
 let previousX=Infinity,previousZ=Infinity;
 function updateDistance(x,z){
  if(Math.hypot(x-previousX,z-previousZ)<4)return;
  previousX=x;previousZ=z;
  for(const {parts,entries} of clusters){
   const counts=[0,0];
   for(const entry of entries){
    const level=(entry.x-x)**2+(entry.z-z)**2>28**2?1:0;
    parts[level].setMatrixAt(counts[level]++,entry.matrix);
   }
   parts.forEach((mesh,i)=>{
    mesh.count=counts[i];mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;
    if(mesh.visible)mesh.computeBoundingSphere();
   });
  }
 }
 updateDistance(0,85);
 // The jail narrative survives the fork. Abandoned manacles and drag
 // marks lie at the eastern cell and where the western paths rejoin.
 for(const [x,z] of [[2.2,49],[-6.8,13],[2.8,6]]){
  const iron=0x76645c;
  for(let k=0;k<6;k++){
   const cx=x+.22*k,cz=z-.2*k;
   for(let j=0;j<7;j++){
    const a=j*Math.PI*2/7,c=(j+1)*Math.PI*2/7;
    const ring=(t,r)=>[cx+Math.cos(t)*r,.10+Math.sin(t)*(k%2?.105:.028),cz+Math.sin(t)*r*.66];
    b.quad(ring(a,.18),ring(c,.18),ring(c,.12),ring(a,.12),iron);
   }
  }
  b.quad([x-.3,.05,z+.6],[x+.6,.08,z+.3],[x+1,.05,z+1.2],[x+.1,.07,z+1.1],0x705c4f);
  for(const side of [-1,1])b.quad([x+side*.27,.044,z],[x+side*.27+.08,.044,z],[x+side*.35+.16,.044,z-2.9],[x+side*.35,.044,z-2.55],0x31252b);
 }
 // Draw the low ash bed beneath the distinct traversable shelves.
 for(let i=0;i<basin.length;i++){const [x,z]=basin[i],[u,v]=basin[(i+1)%basin.length];b.face([0,-.19,39],[x,-.19,z],[u,-.19,v],0x48414a);}
 for(const o of fixedRocks)b.stalk([[o.x,-.22,o.z,o.r],[o.x,o.h*.7,o.z,o.r*.85],[o.x+.2,o.h,o.z+.3,o.r*.5]],8,0x453e48);
 for(let j=0;j<17;j++){const a=j*2.399,z=41+Math.sin(a)*48;let x=Math.cos(a)*60;
  if(z<20&&Math.abs(x)<48)x=(x<0?-1:1)*48;
  b.cliff(x,22+random()*12,z,14,19,31,0x403441);}
 for(let j=0;j<14;j++){const a=j*2.399,x=Math.cos(a)*36,z=43+Math.sin(a)*42;b.cliff(x,23+random()*7,z,20,20,4,0x372f39);}
 l.strip(creek.map(([x,z,r],i)=>[x,-.135,z,r,0,i*4]));
 b.arch(17,-1,65,3.3,2.1,2,0x71606a,.45);
 crystals.push([-28,.7,53,2.2,-.2,1.5,0xce99ff]);
 return updateDistance;
}
