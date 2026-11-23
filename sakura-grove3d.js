// Small original atlases and reusable trees. Twigs, boles and snow boughs have
// volume even edge on; cutout clusters carry the much finer blossom detail.
import {batch} from './sakura-masonry3d.js';
export function seeded(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function atlas(T,size,draw){
 const el=document.createElement('canvas');el.width=el.height=size;draw(el.getContext('2d'),size);
 const tex=new T.CanvasTexture(el);tex.colorSpace=T.SRGBColorSpace;return tex;
}
export function blossomTexture(T){return atlas(T,128,(ctx,n)=>{
 const r=seeded(412),buds=[];
 for(let i=0;i<290;i++){const a=r()*6.283,rad=Math.sqrt(r()),x=64+Math.cos(a)*rad*(45+7*Math.cos(a*5)),y=63+Math.sin(a)*rad*(43+8*Math.sin(3*a));
  buds.push([x,y,2+r()*4]);}
 buds.sort((a,b)=>a[1]-b[1]);
 for(const [x,y,rad] of buds){const t=(1-y/n)*.56+r()*.44;
  ctx.fillStyle=t<.32?'#924e76':t<.51?'#c4779c':t<.70?'#edabbe':t<.87?'#ffd6dd':'#fff3e7';
  for(let k=0;k<5;k++){const a=1.2566*k;ctx.beginPath();ctx.ellipse(x+rad*.52*Math.cos(a),y+rad*.52*Math.sin(a),rad*.61,rad*.43,a,0,6.29);ctx.fill();}
  ctx.fillStyle='#e9a68c';ctx.fillRect(x-1,y-1,1.9,1.9);}
 });}
export function treeLibrary(T){
 const barkColors=[0x49343c,0x513b41,0x433444,0x554047],lib=[];
 const flowerMap=blossomTexture(T),wind={value:0};
 const needleMap=atlas(T,96,(ctx,n)=>{const r=seeded(9913);ctx.lineCap='round';
  for(let i=0;i<290;i++){const u=r(),x=u*n,h=(1-u*.73)*(.48+.50*r())*n;
   ctx.strokeStyle=i%3?'#e2e6e5':'#aebcb5';ctx.lineWidth=.8+r()*2.6;
   ctx.beginPath();ctx.moveTo(x,2+r()*9);ctx.quadraticCurveTo(x+5,h*.52,x+8+r()*9,h);ctx.stroke();}
  ctx.lineWidth=3;ctx.strokeStyle='#bfd0c4';ctx.beginPath();ctx.moveTo(0,3);ctx.lineTo(n,3);ctx.stroke();
 });
 const needles=new T.MeshLambertMaterial({map:needleMap,alphaTest:.37,side:T.DoubleSide,vertexColors:true,emissive:0x28373f,emissiveIntensity:.12});
 const solid=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
 const leaves=new T.MeshLambertMaterial({map:flowerMap,alphaTest:.41,side:T.DoubleSide,vertexColors:true,emissive:0x875666,emissiveIntensity:.32});
 for(const mat of [leaves,needles])mat.onBeforeCompile=sh=>{
  sh.uniforms.groveTime=wind;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float groveTime;').replace('#include <begin_vertex>',`#include <begin_vertex>
   #ifdef USE_INSTANCING
   float phase=instanceMatrix[3].x*.038+instanceMatrix[3].z*.042;
   transformed.x+=sin(groveTime*1.13+phase+position.y*.24)*smoothstep(2.,11.,position.y)*.16;
   transformed.z+=cos(groveTime*.78+phase)*smoothstep(2.,11.,position.y)*.08;
   #endif`);};
 function sakura(n,far){
  const m=batch(T),pos=[],uv=[],col=[],r=seeded(841+n*59),w=[1.10,1.22,.9,1.28][n],h=[1,1.18,1.05,.82][n];
  const c=new T.Color();function cluster(p,s){
   for(let k=0;k<(far?2:3);k++){const a=r()*Math.PI,bend=.3+r()*.45,rx=Math.cos(a)*s,rz=Math.sin(a)*s;
    const pts=[[-rx,-s*.53,-rz],[rx,-s*.5,rz],[rx*.88,s*.77,rz*.88+bend],[-rx*.89,s*.71,-rz*.89+bend]];
    c.set([0xeec5d8,0xffe0e7,0xffc2d6,0xe7b6db][n]).multiplyScalar(.88+r()*.24);
    for(const i of [0,1,2,0,2,3]){pos.push(p[0]+pts[i][0],p[1]+pts[i][1],p[2]+pts[i][2]);uv.push(i===0||i===3?0:1,i<2?0:1);col.push(c.r,c.g,c.b);}
   }
  }
  const color=barkColors[n],top=[(n-1)*.42,4.7*h,.49];m.rib([[0,0,0],[.32,1.65,-.2],[-.37,3,.28],top],.49*w,color);
  for(let j=0;j<6;j++){const a=j*1.047+r()*.4;m.tube([0,1,0],[Math.cos(a)*1.7,.02,Math.sin(a)*1.7],.34,.06,color,7);}
  for(let j=0;j<(far?6:9);j++){const a=(j+n*.21)*2.4,rise=(j%3)*.9;
   const A=[top[0]*.5,2.2+rise*.8,0],B=[w*1.8*Math.cos(a),4.1*h+rise,w*1.8*Math.sin(a)],C=[w*3.7*Math.cos(a+.25),5.2*h+rise,w*3.7*Math.sin(a+.25)];
   m.tube(A,B,.36*w,.21,color,7);m.tube(B,C,.22,.12,color,6);
   for(let k=0;k<(far?2:4);k++){const ang=a+(k-1.5)*.60,reach=(1.05+r()*1.9)*w,D=[C[0]+reach*Math.cos(ang),C[1]+.75+r()*1.5,C[2]+reach*Math.sin(ang)];
    m.tube(C,D,.14,.045,color,5);cluster(D,(far?2.9:2.13)*(.86+r()*.3));
    if(!far){const E=[D[0]+.63*Math.cos(ang+1),D[1]+.57,D[2]+.74*Math.sin(ang+1)];m.tube(D,E,.055,.012,color,4);cluster(E,1.18);}
   }
  }
  const g=new T.BufferGeometry();for(const [k,a,l] of [['position',pos,3],['color',col,3],['uv',uv,2]])g.setAttribute(k,new T.Float32BufferAttribute(a,l));g.computeVertexNormals();g.computeBoundingSphere();
  return [[m.geometry(),solid],[g,leaves]];
 }
 function pine(n,far){
  const m=batch(T),r=seeded(209+n*86),green=n===3,ht=green?9.4:12.3+2.4*n;
  const pos=[],col=[],uv=[];const c=new T.Color();
  function spray(base,tip,width,phase,light){
   const dx=tip[0]-base[0],dz=tip[2]-base[2],len=Math.hypot(dx,dz)||1;
   // Pendulous wing on each side of the bough. The shaped alpha-tested needle
   // clusters leave holes and an uneven outline even on the distant trees.
   for(const sign of [-1,1]){
    const ex=-dz/len*width*sign,ez=dx/len*width*sign;
    const p=[base,[base[0]+dx*.42+ex,base[1]-.32-width*.19,base[2]+dz*.42+ez],
     [tip[0]+ex*.26,tip[1]-.22,tip[2]+ez*.26],tip];
    c.set(green?(phase%2?0x60806e:0x7c9774):phase%3?0xb3c8d1:0xdce4e4).multiplyScalar(light);
    for(const k of [0,1,2,0,2,3]){pos.push(...p[k]);uv.push(k<2?0:1,k===0||k===3?.04:.94);col.push(c.r,c.g,c.b);}
   }
  }
  m.tube([0,0,0],[.14,ht,0],.33,.028,0x65504a,7);
  const levels=far?6:9;
  for(let j=0;j<levels;j++){const t=j/levels,y=1.5+t*ht*.86,rad=(1-t)**.72*(green?2.9:3.8)+.47,branches=far?5:8;
   for(let k=0;k<branches;k++){const a=k*6.283/branches+j*1.32+r()*.45,w=rad*(.68+r()*.40),dx=Math.cos(a),dz=Math.sin(a);
    const B=[dx*w*.48,y-.45,dz*w*.48],tip=[dx*w,y-1.2+r()*.5,dz*w];
    if(!far)m.tube([0,y,0],tip,.095*(1-t)+.025,.018,green?0x504d3d:0x4b575b,5);
    spray([0,y+.2,0],tip,w*.30,j+k,.9+t*.12);
    if(!far)for(const sign of [-1,1]){const a2=a+.54*sign;const D=[B[0]+w*.57*Math.cos(a2),B[1]-.58,B[2]+w*.57*Math.sin(a2)];spray(B,D,w*.19,j+k+1,.95);}
   }
  }
  const g=new T.BufferGeometry();for(const [name,a,d] of [['position',pos,3],['color',col,3],['uv',uv,2]])g.setAttribute(name,new T.Float32BufferAttribute(a,d));g.computeVertexNormals();g.computeBoundingSphere();
  return [[m.geometry(),solid],[g,needles]];
 }
 for(let n=0;n<4;n++)lib.push([sakura(n,false),sakura(n,true)]);
 for(let n=0;n<4;n++)lib.push([pine(n,false),pine(n,true)]);
 return {lib,solid,wind};
}
