import {atlas,seeded} from './sakura-grove3d.js';
import {CASTLE,DOJO} from './sakura-route3d.js';
import {arch} from './sakura-masonry3d.js';

export function surfaceFinish(T,wood){
 const m=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:wood?.77:.67,metalness:wood?.035:.11});
 m.customProgramCacheKey=()=>wood?'sakura-wood':'sakura-ice-stone';
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
  `));
  sh.fragmentShader=sh.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n'+(wood?
   'float fiber=clamp(vColor.g-vColor.b,0.,.50);roughnessFactor=clamp(.52+.31*fiber+.10*a,.45,.90);':
   'float frost=smoothstep(.20,.55,vColor.b);roughnessFactor=clamp(.86-.38*frost+.09*(a-.5),.32,.92);'));
 };
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
  // Oblique bands cross the nave from clerestory to opposite aisle.
  c.save();c.globalCompositeOperation='screen';
  for(let j=-1;j<8;j++){const y=j*82;const g=c.createLinearGradient(0,y,0,y+28);
   g.addColorStop(0,'rgba(86,144,189,0)');g.addColorStop(.3,'rgba(123,182,217,.27)');g.addColorStop(1,'rgba(125,180,215,0)');
   c.save();c.transform(1,-.22,0,1,0,42);c.fillStyle=g;c.fillRect(0,y,n,28);c.restore();}
  c.restore();
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
 // Six quadripartite vaults are built bay by bay. Snow light catches the
 // keystones and the fluting above the dark piers, even without screen-space effects.
 feature('Abóbadas e relicários da nave',CASTLE,m=>{
  for(let j=0;j<6;j++){
   const z=-30+j*16;
   for(const side of [-1,1]){
    const roof=(u,v)=>[side*(15.05*u),31.06-12.7*u*u-1.95*Math.abs(v)*Math.sin(u*Math.PI),z+v*7.96];
    for(let a=0;a<5;a++)for(let b=0;b<4;b++){const u=a/5,v=-1+b*.5;m.quad(roof(u,v),roof((a+1)/5,v),roof((a+1)/5,v+.5),roof(u,v+.5),(a+b+j)%4?0x40576d:0x536a7c);}
    for(const dz of [-.64,.64]){
     const x=side*14.65;m.tube([x,1.05,z+dz],[x,14.4,z+dz],.40,.32,0x688397,7);
     m.tube([x,14.35,z+dz],[x,15.2,z+dz],.32,.65,0x93abba,7);}
    const xx=side*14.85;
    m.tube([xx,.05,z],[xx,1.15,z],1.94,1.37,0x63798b,8);
    m.tube([xx,15.1,z],[xx,16.9,z],1.05,1.94,0x809aa9,8);
    if(j%2===0){const x=side*22.5;
     m.tube([x,7.05,z+5],[x,8.2,z+5],.66,.23,0x637786,7);
     m.tube([x,8.2,z+5],[x,8.48,z+5],.26,.58,0xa1b5bd,7);
     m.tube([x,8.5,z+5],[x+.12,9.16,z+5],.26,.02,0xb3ecfb,6);}
   }
   m.tube([0,30.45,z],[0,31.42,z],.88,.53,0xa5bcc7,8);
  }
 },177);
 return interiorLights(T,root);
}

export function interiorLights(T,root){
 // Each emitter belongs to its architectural source. Distance only fades the
 // room at its threshold; walking across the floor cannot drag the light pool.
 const sources = [
  [DOJO, -5.6, 2.1, -9.6, 0xffc58b, 36, 16],
  [DOJO, 9, 2.1, 7, 0xffb0b7, 26, 14],
  [CASTLE, -24, 13, -14, 0x9eddf2, 135, 36],
  [CASTLE, 24, 13, 18, 0xa1c9ff, 145, 38],
  [CASTLE, 0, 8, 61, 0xc6f4ff, 82, 25]
 ].map(([room,x,y,z,color,power,range]) => {
  const lamp = new T.PointLight(color, 0, range, 2);
  lamp.position.set(room.x+x,room.y+y,room.z+z);
  lamp.visible=false;
  root.add(lamp);
  return {lamp,room,power};
 });
 return (P,night=0) => {
  for(const {lamp,room,power} of sources){
   const dojo=room===DOJO;
   const dx=Math.max(0,Math.abs(P.x-room.x)-(dojo?11:27));
   const dz=Math.max(0,room.z-(dojo?11:42)-P.z,P.z-room.z-(dojo?11:67));
   const u=Math.min(1,Math.hypot(dx,dz)/12);
   lamp.intensity=power*(dojo?1+.4*night:1)*(1-u*u*(3-2*u));
   lamp.visible=lamp.intensity>.01;
  }
 };
}
