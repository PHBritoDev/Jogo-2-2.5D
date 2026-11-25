// Static masonry batches share vertices' world-space texture scale. No shadow
// maps: rock faces retain the warm/cold bounce of the surrounding emitters.
import {addStructure,addCliff} from "./volcano-cave-layout.js";

export const LAVA_BOUNCE_CONFIG = Object.freeze({
 distanceFalloff: .003, facingFloor: .20, facingGain: .80,
 pulseBase: .88, pulseSlow: .08, pulseFast: .04,
 pulseSlowRate: 2.15, pulseFastRate: 3.7, pulsePhaseRate: .73,
 color: Object.freeze([.12, .032, .007])
});
export function lavaBounceFalloff(distance, facing = 1) {
 const d=Math.max(0,Number(distance)||0), f=Math.max(0,Math.min(1,Number(facing)||0));
 return (1/(1+d*d*LAVA_BOUNCE_CONFIG.distanceFalloff))*
  (LAVA_BOUNCE_CONFIG.facingFloor+LAVA_BOUNCE_CONFIG.facingGain*f);
}
export function lavaBouncePulse(time, phase = 0) {
 const t=Number(time)||0, p=Number(phase)||0, c=LAVA_BOUNCE_CONFIG;
 return c.pulseBase+c.pulseSlow*Math.sin(t*c.pulseSlowRate+p)+
  c.pulseFast*Math.sin(t*c.pulseFastRate-p*c.pulsePhaseRate);
}
const glslNumber = value => Number(value).toFixed(3);
export function masonry(T, group, seed, palette){
 const pos=[],col=[],uv=[];let state=seed;
 const random=()=>((state=Math.imul(state,1664525)+1013904223|0)>>>0)/4294967296;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'),im=ctx.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){const t=(x+y*128)*4;
  const noise=random();
  const furrow=Math.cos(x*.33+Math.sin(y*.098)*1.7+Math.sin(x*.17+y*.15)*.6);
  const grain=palette.bark?138+noise*22+48*furrow+14*Math.cos(x*1.18+.08*y):
   187+noise*39+6*Math.sin(y*.29+2*Math.sin(x*.17))+4*Math.sin(y*.7+x*.11);
  im.data[t]=im.data[t+1]=im.data[t+2]=grain;im.data[t+3]=255;
 }ctx.putImageData(im,0,0);
 for(let i=0;i<90;i++){let x=random()*128,y=random()*128;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<4;j++){x+=(random()-.4)*7;y+=random()*4;ctx.lineTo(x,y);}ctx.strokeStyle='rgba(20,15,23,.28)';ctx.stroke();}
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;
 const color=new T.Color(),normal=new T.Vector3(),v=new T.Vector3(),w=new T.Vector3();
 // Bake local irradiance into stone vertices. Height-independent emitters
 // represent the entire falling sheet; point emitters light crystal niches.
 const sources=group.name.includes('Santuário')||group.name.includes('pisos')?[
  [37,20,225,24,.92,.28,.07,true],[-38,14,248,19,1,.21,.03,true],[-48,22,201,26,1,.26,.05,true],
  [-31,5,149,22,1,.28,.05,true],[29,4,122,19,1,.27,.04,true],
  [51,12,104,28,1,.32,.05,true],[-50,7,91,20,1,.24,.05,true],
  [-11,17,160,10,.50,.11,1],[12,10,124,10,.10,.34,1],
  [-28,24,128,15,.46,.10,.86],[30,13,111,14,.27,.13,1]
 ]:group.name.includes('Bosque')?[[-8,1,64,9,1,.18,.025],[4,1,31,8,.98,.14,.015]]:[];
 function face(a,b,c,tint,variation=1){normal.crossVectors(v.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]),w.set(c[0]-a[0],c[1]-a[1],c[2]-a[2])).normalize();
  const horizontal=Math.abs(normal.y)>.6,alongX=Math.abs(normal.z)>Math.abs(normal.x);
  color.set(tint).multiplyScalar(variation*(.72+.26*Math.abs(normal.x)+.36*Math.max(0,normal.y)+.14*Math.max(0,normal.z)));
  for(const p of [a,b,c]){pos.push(...p);let red=color.r,green=color.g,blue=color.b;
   for(const [x,y,z,r,cr,cg,cb,fall] of sources){
    const dx=p[0]-x,dz=p[2]-z,dy=fall?Math.max(0,p[1]-y-15,-18-p[1]):p[1]-y;
    const light=1/(1+(dx*dx+dy*dy+dz*dz)/(r*r));
    const power=light*light;
    red+=power*cr*(.04+color.r*.95);green+=power*cg*(.025+color.g*.8);blue+=power*cb*(.04+color.b);
   }
   // Cool skylight reaches upper ledges; rock beneath the crossings
   // receives less sky and a restrained red reflection from the river.
   if(palette.stoneMap){
    const recess=Math.max(0,Math.min(1,(-p[1]-2)/24));
    const direct=.83+.17*Math.abs(normal.x*.74+normal.y*.53+normal.z*.41);
    red=red*direct*(1-.39*recess)+recess*(p[2]>78?.043:.006);
    green*=direct*(1-.55*recess);blue*=1.05-.46*recess;
    if(p[2]>5&&p[2]<79){const local=Math.exp(-Math.abs(p[0]-8*Math.sin(p[2]*.095))*.25);
     red+=.042*local;green+=.008*local;blue+=.007*(1-local);}
   }
   col.push(red,green,blue);uv.push((horizontal||alongX?p[0]:p[2])*.29,(horizontal?p[2]:p[1])*.29);}
 }
 function quad(a,b,c,d,tint,k=1){face(a,b,c,tint,k);face(a,c,d,tint,k);}
 function block(x,y,z,dx,dy,dz,tint,yaw=0){
  addStructure(x,y,z,dx,dy,dz,yaw);
  const cs=Math.cos(yaw),sn=Math.sin(yaw),p=[];
  for(let j=0;j<2;j++)for(const [u,v] of [[-1,-1],[-1,1],[1,1],[1,-1]])p.push([x+u*dx*.5*cs+v*dz*.5*sn,y+j*dy,z-u*dx*.5*sn+v*dz*.5*cs]);
  quad(p[4],p[5],p[6],p[7],tint);for(let i=0;i<4;i++){const k=(i+1)%4;quad(p[i],p[k],p[k+4],p[i+4],tint,.94);}
 }
 function stalk(path,sides,tint,ragged=.1){
  let last;const phase=random()*6,profile=Array.from({length:sides},()=>1+ragged*(random()-.5));
  for(const [x,y,z,r] of path){const ring=profile.map((k,i)=>{const a=i*Math.PI*2/sides+phase;return [x+Math.cos(a)*r*k,y,z+Math.sin(a)*r*k];});
   if(last)for(let i=0;i<sides;i++){const j=(i+1)%sides;quad(last[i],ring[i],ring[j],last[j],tint,.78+.24*profile[i]);}last=ring;
  }
  for(let i=1;i<sides-1;i++)face(last[0],last[i+1],last[i],tint);
 }
 function cliff(x,y,z,rx,rz,h,tint){const n=13,rim=[];for(let i=0;i<n;i++){const a=i*2*Math.PI/n,r=.84+.25*random();rim.push([x+Math.cos(a)*rx*r,y+(random()-.5)*1.5,z+Math.sin(a)*rz*r]);}let ring=rim;
  for(let j=1;j<=4;j++){const next=rim.map(p=>[x+(p[0]-x)*(1-.037*j)+(random()-.5)*2,y-j*h/4+(random()-.5)*2,z+(p[2]-z)*(1-.04*j)]);for(let i=0;i<n;i++){const k=(i+1)%n;quad(ring[i],next[i],next[k],ring[k],tint,.68+random()*.5);}ring=next;}
  addCliff(rim,ring);
  for(let i=0;i<n;i++)face([x,y+.5,z],rim[(i+1)%n],rim[i],tint);
 }
 // An arch is a ring of separate tapered voussoirs over two laden piers.
 function arch(x,y,z,r,h,depth,tint,yaw=0){const cs=Math.cos(yaw),sn=Math.sin(yaw),map=(u,v,w)=>[x+u*cs+w*sn,y+v,z-u*sn+w*cs],th=Math.max(.55,r*.19);
  for(const side of [-1,1]){const off=side*(r+th*.5);block(x+off*cs,y,z-off*sn,th*1.25,h,depth,tint,yaw);block(x+off*cs,y+h-.4,z-off*sn,th*1.6,.65,depth*1.18,tint,yaw);}
  for(let i=0;i<13;i++){const a=i*Math.PI/13+.004,b=(i+1)*Math.PI/13-.004;
   const ring=(w)=>[[r,a],[r,b],[r+th,b],[r+th,a]].map(([t,f])=>map(Math.cos(f)*t,h+Math.sin(f)*t,w));
   const A=ring(-depth/2),B=ring(depth/2),k=.85+random()*.25;quad(...A,tint,k);quad(...B,tint,k);for(let j=0;j<4;j++)quad(A[j],A[(j+1)%4],B[(j+1)%4],B[j],tint,k);}
 }
 function finish(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();g.computeBoundingSphere();const material=new T.MeshBasicMaterial({map:palette.stoneMap||tex,vertexColors:true,side:T.DoubleSide});
 if(palette.stoneMap){
  tex.dispose();
  // O reflexo estático da calha permanece; no Santuário, a mesma fonte também
  // produz um bounce quente e lento, sem PointLight, sombra ou draw call extra.
  const cfg=LAVA_BOUNCE_CONFIG, lavaClock=palette.clock||{value:0};
  const lavaGain={value:!!palette.clock&&(group.name.includes('Santuário')||group.name.includes('pisos'))?1:0};
  const color=cfg.color.map(glslNumber).join(',');
  const pulse='float lavaPulse='+glslNumber(cfg.pulseBase)+'+'+
   glslNumber(cfg.pulseSlow)+'*sin(uLavaTime*'+glslNumber(cfg.pulseSlowRate)+'+vLavaPhase)+'+
   glslNumber(cfg.pulseFast)+'*sin(uLavaTime*'+glslNumber(cfg.pulseFastRate)+'-vLavaPhase*'+glslNumber(cfg.pulsePhaseRate)+');\\n';
  material.onBeforeCompile=shader=>{
   shader.uniforms.uLavaTime=lavaClock;
   shader.uniforms.uLavaGain=lavaGain;
   const vertexChunk='\\n#include <project_vertex>\\n'+
    'vec3 spill=position.z>135.?vec3(-31.,12.,149.):vec3(29.,8.,122.);\\n'+
    'vec3 delta=spill-position;\\n'+
    'vec3 halfway=normalize(normalize(mat3(modelViewMatrix)*delta)-normalize(mvPosition.xyz));\\n'+
    'float wet=1./(1.+dot(delta,delta)*'+glslNumber(cfg.distanceFalloff)+');\\n'+
    'wetGlint=wet*pow(abs(dot(normalize(normalMatrix*normal),halfway)),12.);\\n'+
    'if(uLavaGain>.001){\\n'+
    ' float facing=max(dot(normalize(normal),normalize(delta)),0.);\\n'+
    ' vLavaBounce=wet*('+glslNumber(cfg.facingFloor)+'+'+glslNumber(cfg.facingGain)+'*facing);\\n'+
    ' vLavaPhase=dot(position.xz,vec2(.071,.047))+position.y*.12;\\n'+
    '}else{vLavaBounce=0.;vLavaPhase=0.;}\\n';
   const fragmentChunk='\\nfloat relief=dot(texture2D(map,vMapUv).rgb,vec3(.27,.56,.17));\\n'+
    'diffuseColor.rgb*=clamp(.15+3.2*relief,.19,1.8);\\n'+
    'if(uLavaGain>.001){\\n'+pulse+
    ' diffuseColor.rgb+=vec3('+color+')*vLavaBounce*lavaPulse;\\n'+
    ' diffuseColor.rgb+=vec3(.46,.16,.042)*wetGlint*lavaPulse*smoothstep(.045,.32,relief);\\n'+
    '}else{\\n'+
    ' diffuseColor.rgb+=vec3(.46,.16,.042)*wetGlint*smoothstep(.045,.32,relief);\\n'+
    '}\\n';
   shader.vertexShader='varying float wetGlint;\nvarying float vLavaBounce;\nvarying float vLavaPhase;\nuniform float uLavaGain;\n'+
    shader.vertexShader.replace('#include <project_vertex>',vertexChunk);
   shader.fragmentShader='varying float wetGlint;\nvarying float vLavaBounce;\nvarying float vLavaPhase;\nuniform float uLavaTime;\nuniform float uLavaGain;\n'+
    shader.fragmentShader.replace('#include <map_fragment>',fragmentChunk);
  };
 }
 const m=new T.Mesh(g,material);m.name=group.name+'-basalto';group.add(m);return m;}
 return {random,face,quad,block,stalk,cliff,arch,finish,palette};
}
