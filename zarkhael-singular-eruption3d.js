
import {createBillowingCrown} from './zarkhael-billow-cloud3d.js';
/** MOD 282: uma única explosão autoral em forma de coluna/copa de chama.
 * A copa nasce DEPOIS da coluna. Três anéis são regiões de pressão da MESMA
 * explosão, não três explosões. GLSL WebGL1 com turbulência, veios, brilho quente.
 */
export const ERUPTION_BUILD='282-cloud-billows-organic-v2';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const V=[
 'uniform float uT,uWarp;varying vec3 vP;',
 'void main(){vec3 p=position;float a=atan(p.z,p.x),h=p.y*.055;float cap=smoothstep(17.,27.,p.y);',
 'float j=sin(a*8.+h*17.-uT*1.7)*.15+sin(a*16.-h*31.+uT*2.2)*.085+sin(a*29.+h*39.-uT*3.)*.036;',
 'p.xz*=1.+uWarp*j*(.33+.77*cap);p.y+=uWarp*(.77*cap*sin(a*11.+h*18.-uT*2.4)+.23*sin(a*24.-h*15.+uT*2.));',
 'vP=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}'
].join('\n');
const F=[
 'uniform float uT,uAlpha,uHot,uSeed;varying vec3 vP;',
 'float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}',
 'float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
 'return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),',
 'mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}',
 'void main(){float a=atan(vP.z,vP.x),h=vP.y*.05;',
 'vec3 p=vec3(a*2.3,h*2.8-uT*.72,uSeed);',
 'float n=noise3(p),n2=noise3(p*2.1+vec3(uT*.25,-uT*.36,2.4));',
 'float vein=pow(max(0.,sin(a*20.+h*23.-uT*4.8+n*5.)),10.);',
 'float fire=clamp(n*.62+n2*.45+.08,0.,1.);float rolled=.5+.5*sin(a*12.+h*12.-uT*2.+n2*4.);',
 'float ash=noise3(p*1.7+vec3(2.,5.,1.));',
 'vec3 black=vec3(.095,.001,.014),red=vec3(.92,.011,.023),orange=vec3(1.,.36,.006);',
 'vec3 gold=vec3(1.,.79,.075),hot=vec3(1.,.98,.74);',
 'float burn=clamp(fire*.88+rolled*.22+vein*.18-.06,0.,1.);vec3 c=mix(black,red,smoothstep(.12,.56,burn));',
 'c=mix(c,orange,smoothstep(.30,.76,burn)*.93);',
 'c=mix(c,gold,smoothstep(.55,.95,burn)*(.65+.24*uHot));',
 'c=mix(c,hot,smoothstep(.79,1.10,burn)*uHot*.61);c=mix(c,black,ash*.16);',
 'float alpha=(.62+.30*fire+.08*vein)*uAlpha;',
 'if(alpha<.035)discard;gl_FragColor=vec4(c,clamp(alpha,0.,.95));}'
].join('\n');

const HEAT_VERT=[
 'uniform float uT;varying vec2 vUV;',
 'void main(){vUV=uv;vec3 p=position;',
 'float f=sin(uv.y*21.-uT*4.2+uv.x*16.)*.09+sin(uv.y*43.+uT*6.)*.035;',
 'p.xz*=1.+f;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}'
].join('\n');
const HEAT_FRAG=[
 'uniform float uT,uAlpha;varying vec2 vUV;',
 'void main(){float u=vUV.x,v=vUV.y;',
 'float flow=.5+.5*sin(v*28.-uT*5.+u*18.);',
 'float licks=pow(max(0.,sin(v*41.+u*22.-uT*9.)),9.);',
 'float vein=pow(max(0.,sin(v*16.-uT*3.+u*9.)),4.);',
 'float alpha=uAlpha*(.20+.38*flow+.18*licks)*smoothstep(0.,.09,v)*(1.-smoothstep(.92,1.,v));',
 'vec3 orange=vec3(1.,.27,.014),gold=vec3(1.,.77,.11),hot=vec3(1.,.96,.63);',
 'vec3 col=mix(orange,gold,clamp(flow*.64+licks*.36,0.,1.));',
 'col=mix(col,hot,clamp(vein*.4+licks*.26,0.,.60));',
 'if(alpha<.03)discard;gl_FragColor=vec4(col,clamp(alpha,0.,.78));}'
].join('\n');
const CROWN_GLOW_FRAG=[
 'uniform float uT,uAlpha,uHot,uSeed;varying vec3 vP;',
 'void main(){float a=atan(vP.z,vP.x),h=vP.y*.049;',
 'float b=sin(a*21.+h*40.-uT*6.+uSeed)*sin(a*11.-h*25.+uT*4.);',
 'float hot=pow(max(0.,b),4.);',
 'float fold=pow(max(0.,sin(a*43.+h*27.-uT*8.)),13.);',
 'float alpha=uAlpha*(.14+.40*hot+.16*fold);',
 'vec3 red=vec3(1.,.18,.02),gold=vec3(1.,.77,.16),white=vec3(1.,.97,.63);',
 'vec3 c=mix(red,gold,clamp(hot*.85+fold*.5,0.,1.));',
 'c=mix(c,white,clamp(hot*.19+fold*.11,0.,.29));',
 'if(alpha<.025)discard;gl_FragColor=vec4(c,clamp(alpha,0.,.62));}'
].join('\n');
function heatMaterial(T){return new T.ShaderMaterial({
 vertexShader:HEAT_VERT,fragmentShader:HEAT_FRAG,
 uniforms:{uT:{value:0},uAlpha:{value:0}},
 transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false
});}
function crownGlowMaterial(T){return new T.ShaderMaterial({
 vertexShader:V,fragmentShader:CROWN_GLOW_FRAG,
 uniforms:{uT:{value:0},uWarp:{value:0},uAlpha:{value:0},uHot:{value:0},uSeed:{value:3.4}},
 transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false
});}
function flameMaterial(T,seed){return new T.ShaderMaterial({
 vertexShader:V,fragmentShader:F,
 uniforms:{uT:{value:0},uWarp:{value:0},uAlpha:{value:0},uHot:{value:0},uSeed:{value:seed}},
 side:T.DoubleSide,transparent:true,depthWrite:false,blending:T.NormalBlending,toneMapped:false
});}
// Smooth fire silhouette instead of faceted radial bands.
function lathe(T,profile){
 const pts=[],steps=5;
 for(let i=0;i<profile.length-1;i++){
  const a=profile[Math.max(0,i-1)],b=profile[i],c=profile[i+1],d=profile[Math.min(profile.length-1,i+2)];
  for(let j=0;j<steps;j++){
   const t=j/steps,t2=t*t,t3=t2*t;
   const p=k=>.5*(2*b[k]+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3);
   pts.push(new T.Vector2(Math.max(0,p(0)),p(1)));
  }
 }
 const last=profile[profile.length-1];pts.push(new T.Vector2(last[0],last[1]));
 return new T.LatheGeometry(pts,72);
}
export function createSingularMushroomExplosion(T,parent){
 const root=new T.Group();root.name='ZarkhaelSingleEruption282';parent.add(root);
 const trunk=new T.Mesh(lathe(T,[[0,0],[2,0],[4,2],[3.2,8],[2.8,14],[4.2,21],[5.2,28],[4,29]]),flameMaterial(T,.4));
 root.add(trunk);
 const billow=createBillowingCrown(T,root); // copa orgânica tridimensional, sem prato rígido
  const columnLight=new T.Mesh(new T.CylinderGeometry(2.2,1.45,29,24,8,true),heatMaterial(T));
 columnLight.renderOrder=31;root.add(columnLight);
 const shock=[];
 for(let i=0;i<3;i++){
  const m=new T.MeshBasicMaterial({color:i===0?0xffedb2:i===1?0xff9b40:0xffe6bd,
   opacity:0,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
  const o=new T.Mesh(new T.TorusGeometry(1,.084,6,112),m);o.rotation.x=Math.PI/2;
  root.add(o);shock.push(o);
 }
 const shards=new T.InstancedMesh(new T.TetrahedronGeometry(1,0),
  new T.MeshBasicMaterial({color:0x270111,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}),48);
 shards.frustumCulled=false;root.add(shards);
 // Raios violeta ramificados: caminhos quebrados, nunca cilindros retos genéricos.
 // Todos compartilham um único LineSegments com buffer dinâmico (mobile).
 const ARC_BOLTS=8,ARC_STEPS=9,arcPositions=new Float32Array(ARC_BOLTS*ARC_STEPS*6);
 const arcGeo=new T.BufferGeometry();
 arcGeo.setAttribute('position',new T.BufferAttribute(arcPositions,3));
 const arcs=new T.LineSegments(arcGeo,new T.LineBasicMaterial({color:0xe6b2ff,opacity:0,
  transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
 arcs.frustumCulled=false;arcs.renderOrder=47;root.add(arcs);
 const core=new T.Mesh(new T.OctahedronGeometry(.7,1),
  new T.MeshBasicMaterial({color:0xffde83,opacity:0,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));
 root.add(core);
 const M=new T.Matrix4(),Q=new T.Quaternion(),P=new T.Vector3(),S=new T.Vector3(),U=new T.Vector3(0,1,0),A=new T.Vector3();
 const light=new T.PointLight(0xff9a32,0,110);light.castShadow=false;root.add(light);
 let time=0;
 function update(st,ctx={}){
  time+=ctx.dt||0;
  const C=st.center,age=st.bursts[0]?.age??-1,pre=ease(st.pt/.8)*(1-ease((st.pt-1.05)/.28));
  const born=age>=0,rise=ease((age-.12)/1.22),head=ease((age-.65)/1.62);
  const fade=1-ease((age-3.50)/.90),unit=st.dangerR/26.83,up=Math.max(.005,ease((age-.02)/.48));
  root.visible=st.phase==='explosions';root.position.set(C.x,ctx.ground??C.y,C.z);
  trunk.visible=born;
  trunk.scale.set(unit*(.03+.97*rise),up,unit*(.03+.97*rise));
  columnLight.visible=born;columnLight.position.y=14.5*up;
  columnLight.scale.set(unit*(.48+.52*rise),up,unit*(.48+.52*rise));
  columnLight.material.uniforms.uT.value=time;
  columnLight.material.uniforms.uAlpha.value=born*rise*fade*.82;
  billow.update(age,st,{time,low:ctx.low});
  {const u=trunk.material.uniforms;
   u.uT.value=time;u.uWarp.value=rise*fade*1.1;u.uAlpha.value=born*up*fade*.95;
   u.uHot.value=.92+.08*Math.sin(time*2.2);
  }
  core.visible=st.phase==='explosions'&&(!born||age<1.2);
  core.position.y=born?1.4+12*up:1.2;
  core.scale.setScalar(born?(.7+1.7*up)*(1-ease((age-.78)/.42)):.45+2*pre);
  core.material.opacity=born?(1-ease((age-.55)/.61))*.66:pre*.68;
  const heights=[27.0,15.5,1.8],delay=[.75,1.20,.46],sizes=[22,15.4,24];
  shock.forEach((o,i)=>{const k=ease((age-delay[i])/1.25);
   o.visible=born&&k>.001;o.position.y=heights[i]*up;
   o.scale.setScalar(unit*(.08+.92*k)*sizes[i]);
   o.material.opacity=fade*ease((age-delay[i])/.46)*(.78-i*.12);
  });
  const N=ctx.low?24:48;shards.count=N;
  for(let i=0;i<N;i++){
   const a=i/N*Math.PI*2,rr=st.dangerR*(.11+.88*rise)*(.73+.2*(i%7)/7);
   P.set(Math.cos(a)*rr,.3+rise*(1+(i%8)*.45),Math.sin(a)*rr);
   Q.setFromAxisAngle(U,a+time*.27);
   const r=.18+.26*((i*7)%9)/9;M.compose(P,Q,S.set(r,r*(.7+rise),r));shards.setMatrixAt(i,M);
  }
  shards.instanceMatrix.needsUpdate=true;shards.material.opacity=born*.64*fade;
  const boltCount=ctx.low?4:ARC_BOLTS,flare=born*fade*ease((age-.32)/.45);
  arcs.visible=flare>.015;arcGeo.setDrawRange(0,boltCount*ARC_STEPS*2);
  const flicker=Math.floor(time*12);
  for(let i=0;i<boltCount;i++){
   const a=(i+.12)*Math.PI*2/ARC_BOLTS+.08*Math.sin(time*.5+i);
   for(let j=0;j<ARC_STEPS;j++){
    for(let e=0;e<2;e++){
     const f=(j+e)/ARC_STEPS,idx=(i*ARC_STEPS+j)*6+e*3;
     const snap=Math.sin(i*17.1+Math.floor(f*15)*7.7+flicker*3.7);
     const rad=unit*(3.1+7.0*f+snap*.85),jag=unit*(.75+1.3*f)*Math.sin(i*9.3+f*49.1+flicker*5.1);
     arcPositions[idx]=Math.cos(a)*rad+Math.sin(a)*jag;
     arcPositions[idx+1]=(23.9-16.5*f)*up+unit*.65*Math.sin(f*28.+i*8.2+flicker*3.3);
     arcPositions[idx+2]=Math.sin(a)*rad-Math.cos(a)*jag;
    }
   }
  }
  arcGeo.attributes.position.needsUpdate=true;
  arcs.material.opacity=flare*(.55+.32*Math.pow(Math.sin(time*17),2));
  light.position.y=11*rise;light.intensity=1.1*pre+5.2*rise*fade;
 }
 function clear(){root.visible=false;billow.clear();light.intensity=0;}
 function dispose(){parent.remove(root);const g=new Set(),m=new Set();root.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)for(const x of [].concat(o.material))m.add(x)});for(const x of g)x.dispose();for(const x of m)x.dispose();}
 clear();return{root,update,clear,dispose};
}
