import {atlas,seeded} from './sakura-grove3d.js';
import {CASTLE,DOJO} from './sakura-route3d.js';
import {arch} from './sakura-masonry3d.js';

export function surfaceFinish(T,wood){
 const m=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:wood?.77:.67,metalness:wood?.035:.11});
 m.onBeforeCompile=sh=>{
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 localStone;').replace('#include <begin_vertex>','#include <begin_vertex>\nlocalStone=position;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 localStone;').replace('#include <color_fragment>',`#include <color_fragment>
  vec3 wp=localStone;vec3 normalPlane=abs(normalize(cross(dFdx(wp),dFdy(wp))));
  vec2 q=normalPlane.y>.60?wp.xz:(normalPlane.z>normalPlane.x?wp.xy:wp.zy);
  float a=fract(sin(dot(floor(q*9.),vec2(71.1,43.7)))*3478.53);
  `+(wood?`float grain=sin(q.y*46.+sin(q.x*1.5)*1.34+sin(q.y*13.));diffuseColor.rgb*=.94+.035*grain+.065*a;
  float lamp=step(.60,vColor.r)*step(vColor.b*.86,vColor.r);diffuseColor.rgb+=vec3(.09,.041,.037)*lamp;`:
  `vec2 block=q*vec2(.56,1.15);block.x+=mod(floor(block.y),2.)*.5;vec2 f=abs(fract(block)-.5);
  float seam=smoothstep(.437,.496,max(f.x,f.y))*(1.-smoothstep(.12,.62,max(fwidth(block.x),fwidth(block.y))));
  diffuseColor.rgb*=(1.-seam*.22)*(.92+.10*a);diffuseColor.rgb+=vec3(.012,.026,.044);
  `));};
 return m;
}
export function hallDetails(T,{root,feature,landmarks}){
 const frosted=atlas(T,512,(c,n)=>{
  const r=seeded(99123);c.fillStyle='#577484';c.fillRect(0,0,n,n);
  for(let row=0;row<16;row++)for(let i=-1;i<9;i++){const x=(i+.5*(row%2))*64,y=row*32,t=Math.floor(63+r()*26);
   c.fillStyle='rgb('+t+','+(t+24)+','+(t+39)+')';c.fillRect(x+1,y+1,62,30);}
  for(let i=0;i<3600;i++){c.fillStyle=i%3?'rgba(191,216,230,.15)':'rgba(48,72,91,.25)';c.fillRect(r()*n,r()*n,1+r()*4,.7+r());}
  for(const sx of [-1,1])for(let j=0;j<7;j++){const x=256+sx*(110+r()*30),y=j*81;
   const g=c.createRadialGradient(x,y,1,x,y,62);g.addColorStop(0,'rgba(179,219,240,.38)');g.addColorStop(.6,'rgba(109,173,204,.16)');g.addColorStop(1,'rgba(123,186,205,0)');
   c.fillStyle=g;c.fillRect(x-62,y-62,124,124);}
  for(let i=0;i<45;i++){let x=r()*n,y=r()*n,dx=(r()-.5)*8;
   c.lineWidth=.7;c.strokeStyle='rgba(211,233,241,.40)';c.beginPath();c.moveTo(x,y);for(let j=0;j<7;j++){x+=dx+(r()-.5)*6;y+=r()*7;c.lineTo(x,y);}c.stroke();}
 });
 const gameFloor=new T.Mesh(new T.PlaneGeometry(53.1,105),new T.MeshStandardMaterial({map:frosted,roughness:.25,metalness:.16,color:0xc5dae2,emissive:0x1c3446,emissiveIntensity:.28}));
 gameFloor.rotation.x=-Math.PI/2;gameFloor.position.set(CASTLE.x,CASTLE.y+.07,CASTLE.z+13);root.add(gameFloor);landmarks.push({o:gameFloor,reach:195});
 const glass=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide});
 feature('Rosácea da Geada',CASTLE,m=>{
  const z=66.14,x=0,y=20,r=8.1;
  for(let k=0;k<16;k++){const a=6.283*k/16,b=6.283*(k+1)/16,mid=(a+b)*.5;
   const P=(rad,t)=>[x+rad*Math.cos(t),y+rad*Math.sin(t),z];
   m.tri(P(.64,mid),P(r*.48,a),P(r*.72,mid),k%2?0x73bdd8:0x547eac);
   m.tri(P(.64,mid),P(r*.72,mid),P(r*.48,b),0x95cae2);
   m.quad(P(r*.52,a),P(r*.96,a),P(r,mid),P(r*.74,mid),k%3?0x83a9cd:0xc1e4ea);
   m.rib([P(r,a),P(r,mid),P(r,b)],.18,0xa4bfcd,7);
  }
  for(const s of [-1,1])for(let i=0;i<3;i++){const x=s*(12+i*3.4),h=14.5-1.6*i;
   m.quad([x-1,5,z],[x+1,5,z],[x+1,h,z],[x-1,h,z],i%2?0x5e94aa:0x7dafcb);
   m.tri([x-1,h,z],[x+1,h,z],[x,h+2.5,z],0xc2dce9);
   arch(m,x,5,z,1.1,h-2.5,'x',.14,0xabc1cf);}
 },300,glass);
 feature('Frontão e contrafortes',CASTLE,m=>{
  for(const s of [-1,1]){
   for(let j=0;j<5;j++){const x=s*(6.4+j*3.9),base=17-j*1.25;
    m.tube([x,-.12,-43.4],[x,base+9,-43.4],.67,.47,0x668096,7);
    m.tube([x,base+9,-43.4],[x,base+16,-43.4],1.06,.02,0xafc4d3,7);
    arch(m,x+s*1.7,8,-42.83,1.23,9+j%2,'x',.29,0x94adbf);}
   m.rib([[0,40,-43.5],[s*6.3,28.7,-43.5],[s*13.7,22.4,-43.5],[s*20.7,19.4,-43.5]],.63,0xb8cbd7,8);
   for(let j=0;j<4;j++){const z=-74+j*16;
    m.box(s*37,4,z,3.1,8,3.4,0x5c7188);m.tube([s*37,8,z],[s*37,14.4,z],1.72,.05,0xa7bdcc,6);}
  }
  for(let j=0;j<3;j++)arch(m,0,0,-43.3-j*.38,5.3+j*.95,17+j*1.28,'x',.32,0x91a8b9);
 },780);
 const light=new T.PointLight(0xffc6b3,0,32,2);root.add(light);
 return (P,dojo,hall)=>{
  light.visible=dojo||hall;if(!light.visible)return;
  light.color.set(dojo?0xffd4bd:0xbedfff);light.intensity=dojo?44:67;
  light.position.set(P.x+1.5,P.y+(dojo?3.1:5.1),P.z+1.8);
 };
}
