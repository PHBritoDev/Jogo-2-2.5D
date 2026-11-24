// Named scenes with geological silhouettes and small-scale landmarks. Coordinates
// are local to the same basins used by the player's floor and the streamed tiles.
import {ROUTE,DETOURS,DOJO,CASTLE,SPRING_LAKE,GLACIER_BRIDGE,INLET_BRIDGE} from './sakura-route3d.js';
import {lantern,arch} from './sakura-masonry3d.js';
import {seeded} from './sakura-grove3d.js';
export function dressBasins(T,{feature,ground,lib,root,landmarks,register}){
 const r=seeded(8771),mists=[],falls=[];
 function crag(m,x,y,z,rx,rz,h,layer,icy=false){
  const rings=[],n=9;for(let j=0;j<5;j++){const ring=[];for(let i=0;i<n;i++){const a=i/n*6.283+Math.sin(j*1.21)*.10,k=(.84+.18*Math.sin(i*8.7+layer))*(1.16-.12*j);
   ring.push([x+rx*k*Math.cos(a)+j*.25,y+h*(j/4)+h*.055*Math.sin(i*1.62+j*.38),z+rz*k*Math.sin(a)]);}rings.push(ring);}
  const cold=[0x425363,0x607382,0x718493,0x9aafbb],warm=[0x51434c,0x66545b,0x775e62,0x88716e];
  for(let j=0;j<4;j++)for(let i=0;i<n;i++){const k=(i+1)%n,b=rings[j],c=rings[j+1];m.quad(b[i],b[k],c[k],c[i],(icy?cold:warm)[(j+i%2)%4]);
   if(j===3)m.tri([x,y+h,z],c[i],c[k],icy?0xc6d4db:0x8b8076);}
 }
 function cascade(x,z,width,h){
  const y=ground(x,z);feature('Cascata de basalto',{x,z,y},m=>{
   for(const s of [-1,1])for(let j=0;j<4;j++)crag(m,s*(width*.5+2+j*2),-2,-1-j,2.6+j,4,3+h*(.8-j*.13),j);
   crag(m,0,-1,-3,width*.8,3.7,h,5);});
  const g=new T.PlaneGeometry(width,h,7,10),mat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,
   uniforms:{t:{value:0}},vertexShader:`varying vec2 p;void main(){p=uv;vec3 v=position;v.z+=1.8*pow(1.-uv.y,3.);gl_Position=projectionMatrix*modelViewMatrix*vec4(v,1.);}`,
   fragmentShader:`uniform float t;varying vec2 p;void main(){float a=sin(p.x*71.+sin(p.y*15.+t*4.))*0.5+0.5;
    float v=smoothstep(.04,.18,p.x)*(1.-smoothstep(.87,.99,p.x));gl_FragColor=vec4(mix(vec3(.52,.74,.79),vec3(.95,.96,.90),a),v*(.23+a*.51));}`});
  const o=new T.Mesh(g,mat);o.position.set(x,y+h*.5,z+1.1);root.add(o);landmarks.push({o,reach:200});falls.push(mat);
 }
 cascade(-1684,-846,3.5,7);cascade(SPRING_LAKE.x+25,SPRING_LAKE.z-63,6,12);
 // Shallow watercourses and paired banks come down from the springs. A low
 // timber footbridge at the outlet leaves the original lake collision intact.
 for(const [x,z,len,dx] of [[-1574,-551,50,-.36],[-1684,-845,33,.50],[SPRING_LAKE.x+25,SPRING_LAKE.z-62,24,-.25]]){
  const base=ground(x,z);feature('Veio de nascente',{x,z,y:base},m=>{
   const bank=(i,s)=>{const f=i/16,cz=f*len,cx=dx*cz+2.8*Math.sin(f*5.8),off=s*(.62+.28*Math.sin(f*3.14));
    return [cx+off,ground(x+cx+off,z+cz)-base+.08,cz];};
   for(let i=0;i<16;i++){const l=bank(i,-1),r=bank(i,1),nl=bank(i+1,-1),nr=bank(i+1,1);
    m.quad(l,r,nr,nl,i%5?0x59878a:0x789d9c);
    if(i%3===0){const [bx,by,bz]=i%2?l:r;m.tube([bx,by-.24,bz],[bx+.18,by+.17,bz],.72,.41,0x677575,7);}
   }
  },210);
 }
 feature('Passarela da nascente',INLET_BRIDGE,m=>{
  for(let i=0;i<12;i++){const u=i/11-0.5,h=-.07+.34*(1-4*u*u);
   m.box(u*6.6,h,0,.52,.14,1.6,i%4?0x78625b:0x907569);
   if(i===2||i===9)for(const side of [-1,1])m.tube([u*6.6,-.3,side*.72],[u*6.6,h+.78,side*.72],.08,.06,0x66504f,6);}
 },200);
 feature('Falésia estratificada do dojo',DOJO,m=>{
  for(const side of [-1,1])for(let i=0;i<8;i++){
   const x=side*(15+i*3.5);crag(m,x,-53,7+i*1.3,8,13,52+i*1.3+4*Math.sin(i),i);
   for(let k=0;k<3;k++)m.rib([[x+2*k,0,-3],[x+2*k-1,-7,-5],[x+2*k,-13-3*k,-6]],.12,0x765a70,5);
  }
  for(let j=0;j<5;j++)crag(m,-22+j*11,-59,11,11,14,54+j*.9,j+2);
 },750);
 // Old cherries flank the bend itself. Each foot follows its own bank and
 // the paired crowns lean together; the ordinary footpath stays clear.
 const bend=ROUTE[9],trees=[[],[],[]];
 const orientation=new T.Object3D();
 for(const [index,offset] of [-25,-13,0,13,26].entries()){
  const end=offset<0?ROUTE[8]:ROUTE[10];
  const length=Math.hypot(end.x-bend.x,end.z-bend.z),sgn=offset<0?-1:1;
  const dx=sgn*(end.x-bend.x)/length,dz=sgn*(end.z-bend.z)/length;
  for(const side of [-1,1]){
   const distance=side*(6.6+.6*Math.cos(index*1.7+side));
   const x=bend.x+dx*offset+dz*distance,z=bend.z+dz*offset-dx*distance;
   const y=ground(x,z),family=(index+(side<0?1:0))%trees.length;
   orientation.position.set(x,y-.18,z);
   orientation.rotation.set(0,Math.atan2(dx,dz),side*(.24+.065*Math.cos(index+side)),'YXZ');
   orientation.scale.set(1.06+.09*index,1.38+.09*(index%3),1.18);
   orientation.updateMatrix();trees[family].push(orientation.matrix.clone());
   register(x,z,.68);
  }
 }
 for(const [family,poses] of trees.entries())for(const [geometry,material] of lib[family][0]){
  const grove=new T.InstancedMesh(geometry,material,poses.length);
  grove.name='Cerejeiras antigas da galeria';grove.position.set(bend.x,0,bend.z);
  for(const [index,pose] of poses.entries()){
   const local=pose.clone();local.elements[12]-=bend.x;local.elements[14]-=bend.z;
   grove.setMatrixAt(index,local);
  }
  grove.computeBoundingSphere();root.add(grove);landmarks.push({o:grove,reach:170});
 }
 const ancient=DETOURS[0].points[2];
 for(const [g,mat] of lib[1][0]){const o=new T.Mesh(g,mat);o.position.set(ancient.x+14,ground(ancient.x+14,ancient.z),ancient.z);o.rotation.y=.93;o.scale.set(2.1,1.86,2.3);root.add(o);landmarks.push({o,reach:540});}
 register(ancient.x+14,ancient.z,1.4);
 feature('Ponte de pedra da Vigia',GLACIER_BRIDGE,m=>{
  const b=GLACIER_BRIDGE,N=27;
  for(let j=0;j<N;j++){const t=j/N,z=t*b.len,y=t*b.rise;
   m.box(0,y-.23,z+b.len/N*.5,7,.46,b.len/N+.02,j%3?0x94a3b0:0xbccbd4);
   for(const s of [-1,1]){m.box(s*3.5,y+.23,z+b.len/N*.5,.50,1.10,b.len/N+.03,0x74899b);
    if(j%6===0){m.box(s*3.5,y+.38,z,1,2.5,1,0x6d8294);m.tube([s*3.5,y+1.6,z],[s*3.5,y+2.2,z],.73,.09,0xbfd0da,4);}}
  }
  for(let j=0;j<4;j++){const z=(j+.5)*b.len/4,y=(j+.5)/4*b.rise;
   for(const s of [-1,1]){arch(m,s*3,-22+y,z,b.len/8,21,'z',1.15,0x556c80);
    m.box(s*3,-16+y,z-b.len/8,2.3,32,3,0x526476);}}
 },610).rotation.y=Math.atan2(GLACIER_BRIDGE.dx,GLACIER_BRIDGE.dz);
 const grotto=DETOURS[6].points[2];feature('Abóbada da gruta de vidro',{x:grotto.x+10,z:grotto.z+3},m=>{
  for(let i=0;i<13;i++){const a=i*Math.PI/12;crag(m,Math.cos(a)*6.8,-1,Math.sin(a)*6,2.8,3.4,7+(i%4),i,true);}
  for(let i=0;i<16;i++){const a=r()*Math.PI;const x=Math.cos(a)*5.6,z=Math.sin(a)*5.7;
   m.tube([x,-.3,z],[x*.8,1.4+r()*3,z*.82],.46+r()*.45,.015,i%2?0x9cced7:0x7ea7c8,5);}
  m.rib([[-6,3,2],[-5,6.2,2.2],[-2,8.5,2.8],[2,8.3,3],[5,6,2],[6,2.8,2]],1.4,0x748d9f);
 },340);
 // Painted haze occupies small pockets of the valley. No fullscreen bloom pass.
 const mat=new T.SpriteMaterial({transparent:true,opacity:.19,color:0xf1d2d5,depthWrite:false});
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),gr=ctx.createRadialGradient(32,32,1,32,32,32);gr.addColorStop(0,'rgba(255,255,255,.90)');gr.addColorStop(.45,'rgba(255,255,255,.4)');gr.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,64,64);mat.map=new T.CanvasTexture(canvas);
 for(const [p,n,reach] of [[SPRING_LAKE,10,320],[DOJO,9,330],[ROUTE[43],7,270],[CASTLE,9,530]]){
  for(let i=0;i<n;i++){const o=new T.Sprite(mat);o.position.set(p.x+(r()-.5)*134,(p.y??68)+(p===DOJO?-17:1.4)+r()*4,p.z+(r()-.5)*83);
   o.scale.set(31+r()*28,2+r()*4,1);o.renderOrder=2;root.add(o);mists.push({o,x:o.position.x,phase:r()*6.28});landmarks.push({o,reach});}
 }
 return (t)=>{for(const m of falls)m.uniforms.t.value=t;for(const e of mists)if(e.o.visible)e.o.position.x=e.x+Math.sin(t*.13+e.phase)*3;};
}
