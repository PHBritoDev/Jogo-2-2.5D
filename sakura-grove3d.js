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
export function groundTexture(T){const t=atlas(T,128,(c,n)=>{const r=seeded(321);
 c.fillStyle='#cecaca';c.fillRect(0,0,n,n);
 for(let i=0;i<5400;i++){const a=122+Math.floor(r()*128);c.fillStyle='rgba('+a+','+a+','+a+','+(.08+r()*.28)+')';const x=r()*n,y=r()*n;c.fillRect(x,y,.4+r()*3,.4+r()*1.6);}
 });t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=2;return t;}
export function treeLibrary(T){
 const barkColors=[0x49343c,0x513b41,0x433444,0x554047],lib=[];
 const flowerMap=blossomTexture(T);
 const solid=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
 const leaves=new T.MeshLambertMaterial({map:flowerMap,alphaTest:.41,side:T.DoubleSide,vertexColors:true,emissive:0x4e273b,emissiveIntensity:.18});
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
  const m=batch(T),r=seeded(209+n*86),ht=11+3*n;m.tube([0,0,0],[.14,ht,0],.45,.03,0x524142,8);
  for(let j=0;j<(far?5:8);j++){const t=j/(far?5:8),y=2+t*(ht-2),rad=(1-t)*3.2+1;
   for(let k=0;k<(far?5:8);k++){const a=k*2.4+j*.71,w=rad*(.63+r()*.34),x=Math.cos(a)*w,z=Math.sin(a)*w;
    const tip=[x,y-.8-r()*.45,z],peak=[x*.55,y+.35,z*.55],base=[0,y+.64,0],s=w*.3,
    l=[x*.76-Math.sin(a)*s,y-.44,z*.76+Math.cos(a)*s],q=[x*.76+Math.sin(a)*s,y-.52,z*.76-Math.cos(a)*s];
    m.tri(base,l,tip,0x29474e);m.tri(base,tip,q,0x324e53);
    m.tri(base,peak,l,0xa2bac7);m.tri(peak,tip,l,0x819dab);m.tri(base,q,peak,0xc0d1d9);m.tri(peak,q,tip,0xa2becc);
   }
  }return [[m.geometry(),solid]];
 }
 for(let n=0;n<4;n++)lib.push([sakura(n,false),sakura(n,true)]);
 for(let n=0;n<3;n++)lib.push([pine(n,false),pine(n,true)]);
 return {lib,solid};
}
