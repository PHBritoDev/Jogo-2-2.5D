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
 const barkColors=[0x73565d,0x6e554d,0x675367,0x795e55],lib=[];
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
   for(let k=0;k<(far?2:3);k++){
    const a=r()*Math.PI,rx=Math.cos(a)*s,rz=Math.sin(a)*s;
    // Four sloping petals around a raised centre keep nearby clusters
    // rounded from underneath, without a second transparent material.
    const pts=[[-rx,-s*.48,-rz],[rx,-s*.48,rz],[rx*.87,s*.67,rz*.87],[-rx*.87,s*.67,-rz*.87],
     [-Math.sin(a)*s*.42,s*.24,Math.cos(a)*s*.42]];
    const uvRing=[[0,0],[1,0],[1,1],[0,1],[.5,.56]];
    c.set([0xeec5d8,0xffe0e7,0xffc2d6,0xe7b6db][n]).multiplyScalar(.88+r()*.24);
    for(const i of (far?[0,1,2,0,2,3]:[0,1,4,1,2,4,2,3,4,3,0,4])){
     pos.push(p[0]+pts[i][0],p[1]+pts[i][1],p[2]+pts[i][2]);
     uv.push(...uvRing[i]);const shade=i<2?.79:i===4?1.04:1;
     col.push(c.r*shade,c.g*shade,c.b*shade);
    }
   }
  }
  const color=barkColors[n],lean=[-.8,1.35,-1.5,.48][n],top=[lean,4.7*h,.49];
  const spine=[[0,-.1,0],[-lean*.42,1.65,-.2],[lean*.34,3,.28],top];
  for(let j=1;j<spine.length;j++)m.tube(spine[j-1],spine[j],(.83-j*.10)*w,(.73-j*.1)*w,color,far?7:10);
  if(!far)for(let j=0;j<5;j++){const a=j*Math.PI*.4;
   const fluting=spine.map(([x,y,z],i)=>[x+(.63-i*.09)*w*Math.cos(a+i*.54),y,z+(.63-i*.09)*w*Math.sin(a+i*.54)]);
   m.rib(fluting,.083,0x634a4c,5);}

  for(let j=0;j<6;j++){const a=j*1.047+r()*.4;m.tube([0,1,0],[Math.cos(a)*1.7,.02,Math.sin(a)*1.7],.34,.06,color,7);}
  for(let j=0;j<(far?6:9);j++){const a=(j+n*.21)*2.4,rise=(j%3)*.9;
   const A=[lean*(.10+rise*.32),2.4+rise*.8,.12],B=[w*1.8*Math.cos(a),4.1*h+rise,w*1.8*Math.sin(a)],C=[w*3.7*Math.cos(a+.25),5.2*h+rise,w*3.7*Math.sin(a+.25)];
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

// Eight small, original billboard studies of the same families. A single atlas
// serves all far trees in a sector; the close and middle bands keep 3D branches.
export function distantGrove(T,focus,limit){
 const n=128,canvas=document.createElement('canvas');canvas.width=n*4;canvas.height=n*2;
 const c=canvas.getContext('2d');
 for(let k=0;k<8;k++){const r=seeded(620+k*73);c.save();c.translate(k%4*n,Math.floor(k/4)*n);c.lineCap='round';c.lineJoin='round';
  if(k<4){
   c.strokeStyle='#61454e';c.lineWidth=5;c.beginPath();c.moveTo(64,125);c.bezierCurveTo(70,102,52,83,65,66);c.stroke();
   const tips=[];for(let i=0;i<15;i++){const a=-2.78+i/14*2.44,R=37+r()*17,x=64+Math.cos(a)*R,y=79+Math.sin(a)*R;
    c.strokeStyle='#61424b';c.lineWidth=2+r()*2;c.beginPath();c.moveTo(62,94-i%5*3);c.quadraticCurveTo((x+64)*.5,89,x,y);c.stroke();tips.push([x,y]);}
   for(const [x,y] of tips)for(let i=0;i<53;i++){const a=r()*6.283,d=Math.sqrt(r())*15;
    c.fillStyle=['#a46c88','#c786a0','#edb3c5','#e7aec6','#f5ced1'][Math.floor(r()*5)];
    c.beginPath();c.ellipse(x+Math.cos(a)*d,y+Math.sin(a)*d*.68,2+r()*3.7,1.6+r()*3,0,0,6.29);c.fill();}
  }else{
   const h=106+r()*12,green=k===7;c.fillStyle='#665b55';c.fillRect(61,124-h,5,h);
   for(let j=0;j<17;j++){const u=j/17,w=(1-u)**.78*(35+(k%3)*2.1),y=115-u*h;
    for(const s of [-1,1])for(let i=0;i<8;i++){const b=(.48+r()*.55)*w,xx=64+s*b;
     c.strokeStyle=green?(i%2?'#738d75':'#466252'):['#9eb4bf','#7c96a3','#cad8dc','#b2c7d1'][i%4];
     c.lineWidth=1+r()*2.5;c.beginPath();c.moveTo(64,y-9);c.quadraticCurveTo(64+s*b*.55,y-3,xx,y+3+r()*3);c.stroke();
     for(let f=1;f<6;f++){const x=64+(xx-64)*f/6;c.beginPath();c.moveTo(x,y-9+f*1.5);c.lineTo(x+s*(1+r()*2.6),y+f*1.45+r()*4);c.stroke();}
    }}
  }c.restore();
 }
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=2;
 const mat=new T.MeshLambertMaterial({map:texture,alphaTest:.43,side:T.DoubleSide,emissive:0x462b3a,emissiveIntensity:.12});
 mat.onBeforeCompile=sh=>{sh.uniforms.groveFocus=focus;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 treeBase;uniform vec2 groveFocus;varying float vFar;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFar=step('+limit.toFixed(1)+',length(treeBase-groveFocus));');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vFar;').replace('#include <alphatest_fragment>','#include <alphatest_fragment>\nif(vFar<.5)discard;');};
 return function make(entries){
  const p=[],uv=[],anchors=[],norm=[];for(const [type,locations] of entries)for(const [x,y,z,s,rot] of locations){
   const w=(type<4?7.9:type===7?3.9:4.8)*s,h=(type<4?11.5:type===7?10.3:13.4+(type-4)*2.4)*s,col=type%4,row=Math.floor(type/4);
   for(let j=0;j<2;j++){let dx=w*Math.cos(rot+j*1.5708),dz=w*Math.sin(rot+j*1.5708);
    for(const [u,v] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]]){
     p.push(x+(u*2-1)*dx,y+v*h,z+(u*2-1)*dz);norm.push(0,1,0);uv.push((col+.008+u*.984)/4,(1-row+.008+v*.984)/2);anchors.push(x,z);}
   }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('treeBase',new T.Float32BufferAttribute(anchors,2));g.computeBoundingSphere();return new T.Mesh(g,mat);
 };
}
