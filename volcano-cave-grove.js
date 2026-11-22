import { masonry } from './volcano-cave-masonry.js';
import {solids,supported,nodes,basin,fixedRocks,creek} from './volcano-cave-layout.js';

// A rotating cross-section follows each branch's tangent. A split on the same
// bark strip exposes the orange core, tapering out before the tips.
function limb(T,b,points,radii,hot,smooth=false,n=8){
 if(smooth){
  const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)));
  const count=(points.length-1)*2;
  points=Array.from({length:count+1},(_,k)=>curve.getPoint(k/count).toArray());
  const rs=radii;radii=Array.from({length:count+1},(_,k)=>(rs[Math.floor(k/2)]+rs[Math.ceil(k/2)])*.5);
 }
 const rings=[],axis=new T.Vector3(),u=new T.Vector3(),v=new T.Vector3(),p=new T.Vector3();
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
   const s=.3+.15*Math.sin(k*2.7+j),w=.045+.37*Math.pow(Math.abs(Math.sin(k*2.17+j)),2);
   // Lift the exposed seam away from the bark. Coplanar strips flicker
   // at walking distance, particularly with a mobile depth buffer.
   const lifted=(left,right,f,center,scale)=>mix(center,mix(left,right,f),scale);
   const edge=(f,scale)=>lifted(a,c,f,points[k-1],scale);
   const end=(f,scale)=>lifted(e,d,f,points[k],scale);
   b.quad(edge(s-.10,1.026),edge(s+w+.12,1.026),end(.57+w,1.026),end(.35,1.026),0xa23120);
   b.quad(edge(s,1.045),edge(s+w,1.045),end(.43+w*(k%3?.64:.22),1.045),end(.43,1.045),k%3===1?0xffc17a:0xff6328);
  }
 }
}
function tree(T,type,clock,low=false){
 const group=new T.Group(),b=masonry(T,group,1401+type,{bark:true}),rand=b.random;
 const spines=[[[0,0,0],[-.4,2,0],[.7,4,.6],[.1,6,.3],[-1.4,8,.8],[-2.1,10,.4]],
 [[0,0,0],[.3,2,0],[2,3,.5],[3.6,3.15,.8],[4.7,5,1],[4.2,6,.6]],
 [[0,0,0],[-1,2,.1],[-1.5,4,-.3],[-.4,6,-.8],[1,7.7,.2],[.3,9,1.1]],
 [[0,0,0],[.6,2,.4],[.5,4.1,.9],[-.4,5,.3],[-.6,5.6,-.6],[.2,6.2,-1.3]],
 [[0,0,0],[-.9,2,.1],[-2.4,3.3,-.7],[-2.1,5,-1.6],[-.6,7.8,-2.6],[1.1,9,-2.2]],
 [[0,0,0],[.8,1.9,.6],[2.2,3,1.2],[2,4.7,2.3],[.7,6.1,2.8],[-1,7.2,1.8]]];
 const pts=spines[type];limb(T,b,pts,[1.5,.99,.79,.54,.34,.10],true,!low,low?5:8);
 for(let j=0;j<7;j++){
  const a=j*.90+rand()*.3,L=2+rand()*2;
  if(low)continue;
  limb(T,b,[[0,1,0],[Math.cos(a),.45,Math.sin(a)],[Math.cos(a+.22)*L,.13,Math.sin(a+.22)*L],[Math.cos(a+.44)*(L+1),-.18,Math.sin(a+.44)*(L+1)]],[.65,.46,.18,.02],j%3===0);
 }
 for(let j=0;j<9;j+=low?2:1){const at=pts[2+j%4],a=j*2.4+type*.9,L=1.7+rand()*2.2,H=type===3?1:2.3+rand()*2;
  const bend=(s,h,tw)=>[at[0]+Math.cos(a+tw)*L*s,at[1]+H*h,at[2]+Math.sin(a+tw)*L*s];
  const joint=bend(.72,.37,.14),tip=bend(1,1,.6);
  limb(T,b,[at,bend(.43,.13,-.15),joint,tip,bend(1.13,1.32,.84)],[.38,.29,.21,.11,.012],true,!low,low?5:8);
  if(low)continue;
  limb(T,b,[joint,bend(1.04,.47,-.18),bend(1.34,.82,-.34)],[.16,.115,.008],false);
  limb(T,b,[tip,bend(.87,1.16,.71),bend(.81,1.45,.83)],[.095,.05,.006],false);
 }
 const mesh=b.finish();
 // Bake the ember mask from the authored vein colours. Bark stays cool
 // while molten fissures breathe out of phase on neighbouring trunks.
 mesh.material.onBeforeCompile=shader=>{
  shader.uniforms.emberTime=clock;
  shader.vertexShader='uniform float emberTime;\n'+shader.vertexShader.replace('#include <color_vertex>',`
   #include <color_vertex>
   float heat=smoothstep(.22,.62,color.r-color.b);
   vColor+=heat*vec3(.19,.036,.002)*(1.+.28*sin(emberTime*.83+position.y*.6+instanceMatrix[3].x));
  `);
 };
 return mesh;
}
export function grove(T,b,l,group,crystals,clock){
 const random=b.random,stands=Array.from({length:6},()=>[]);
 const trees=[[-9,70,0,1.9],[6,62,2,1.55],[-11,45,1,1.5],[10,38,3,1.5],[-14,18,0,1.3],[7,9,1,1.35],[-30,54,2,1.3],[13,64,3,1.2]];
 for(let i=0;i<160;i++){const x=(random()-.5)*103,z=-7+random()*92;if(supported(x,z)||Object.values(nodes).some(([a,c])=>Math.hypot(x-a,z-c)<8))continue;
  if(trees.some(t=>Math.hypot(t[0]-x,t[1]-z)<4.8))continue;trees.push([x,z,i%6,.61+random()*1.15]);}
 for(const [x,z,type,s] of trees){stands[type].push([x,z,s,random()*6]);b.cliff(x,-.65,z,3.8*s,4.4*s,6+random()*5,0x514349);
  solids.push({x,z,r:1.14*s,h:5.4*s,base:-.25});}
 // Across the ash basin, tree silhouettes step up the ravine in three
 // staggered rows. Reuse the existing far meshes and instance batches.
 for(let band=0;band<3;band++)for(const side of [-1,1])for(let j=0;j<9;j++){
  const x=side*(43+band*17+5*Math.sin(j*2.1)),z=1+j*10+band*4;
  stands[(band+j)%6].push([x,z,1.5+.32*band+.5*Math.cos(j),j*2.1,band*5-2]);
 }
 // The trail vanishes into a cold stand behind the ritual chamber.
 // Only its far LOD is visible; hide it when crossing into the abyss.
 for(let i=0;i<42;i++){
  const row=i%3,x=(Math.floor(i/3)-6.5)*9.7+3*Math.sin(i),z=-32-row*21-4*Math.sin(i*1.6);
  stands[i%6].push([x,z,.95+.25*row+.5*Math.cos(i*1.7),i*.71,row*1.4-1,true]);
 }
 const dummy=new T.Object3D(),clusters=[];
 stands.forEach((arr,type)=>{
  const near=tree(T,type,clock),far=tree(T,type,clock,true);
  far.material.map.dispose();far.material.dispose();
  const parts=[near,far].map(src=>{
   const m=new T.InstancedMesh(src.geometry,near.material,arr.length);
   m.name='Carvão vivo '+type;m.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(m);return m;
  });
  const entries=arr.map(([x,z,s,yaw,elevation=-.15,backdrop=false])=>{
   dummy.position.set(x,elevation,z);dummy.rotation.set(0,yaw,0);dummy.scale.setScalar(s);dummy.updateMatrix();
   return {x,z,backdrop,matrix:dummy.matrix.clone()};
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
    if(entry.backdrop && z<2)continue;
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
  if((z<20||z>66)&&Math.abs(x)<48)x=(x<0?-1:1)*48;
  b.cliff(x,9+random()*7,z,13,14,22,0x403441);}
 for(let j=0;j<14;j++){const a=j*2.399,x=Math.cos(a)*36,z=43+Math.sin(a)*42;b.cliff(x,36+random()*9,z,16,15,4,0x372f39);}
 l.strip(creek.map(([x,z,r],i)=>[x,-.135,z,r,0,i*4]));
 b.arch(17,-1,65,3.3,2.1,2,0x71606a,.45);
 crystals.push([-28,.7,53,2.2,-.2,1.5,0xce99ff]);
 // Wind-scoured basalt laminae and fallen branches outline the stream.
 // Keep the crossing and the damaging water at their actual heights.
 for(let j=1;j<creek.length;j++){
  const [ax,az,ar]=creek[j-1],[cx,cz,cr]=creek[j];
  for(let k=0;k<17;k++)for(const side of [-1,1]){
   const t=k/17,z=az+(cz-az)*t,r=ar+(cr-ar)*t,x=ax+(cx-ax)*t+side*(r+.3+.65*random());
   if(supported(x,z))continue;
   const h=.12+random()*.55,len=.46+random()*.93;
   b.stalk([[x,-.26,z,len],[x+side*.13,h*.56,z+.11,len*.84],[x+side*.15,h,z+.27,len*.48]],5,k%4===0?0x75504c:0x4c4149,.7);
  }
 }
 // Large, individually curved crowns interlock above the trail. The
 // tapered frame keeps the fork circular even where limbs turn horizontal.
 for(const [x,z,side,height] of [[-12,69,1,17],[13,54,-1,21],[-12,36,1,16],[9,20,-1,19]]){
  const pt=(a,y,d)=>[x+side*a,y,z+d];
  const trunk=[pt(0,-.3,0),pt(-1.2,3,.8),pt(.6,6,1.2),pt(1,9,-.6),pt(4,height*.68,-2),pt(8,height*.82,-4),pt(11,height,-2)];
  limb(T,b,trunk,[1.75,1.24,.92,.76,.57,.32,.035],true,true);
  const fork=[trunk[3],pt(-2,10,2),pt(-4,13,3.3),pt(-3,16,4),pt(-5,18,5)];
  limb(T,b,fork,[.75,.57,.34,.22,.018],true,true);
  for(let k=0;k<4;k++){
   const q=trunk[3+k%3],dx=k%2?-3:3;
   limb(T,b,[q,[q[0]+dx,q[1]+1,q[2]+3],[q[0]+dx*1.4,q[1]+3+k,q[2]+4],[q[0]+dx,q[1]+5+k,q[2]+5]],[.34,.25,.14,.012],k===2,true);
  }
  solids.push({x,z,base:-.3,r:1.65,h:7});
 }
 return updateDistance;
}
