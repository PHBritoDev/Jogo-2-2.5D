/**
 * Mod 287 — Queimadura azul de VÉRAXION aderida ao protagonista.
 * Fitilhos de chama procedurais, recortados/curvados em shader, SEM copas/cones/cilindros,
 * ancorados a ossos do rig ou a offsets anatômicos quando o rig ainda não carregou.
 * Sem alocação de malha/material no loop; qualidade low reduz apenas decoração.
 */
export const VERAXION_BURN_BUILD = '287-hero-flame-ribbons';

const VERT = String.raw`precision highp float;
uniform float uTime, uHeat;
uniform vec3 uAnchor[10];
attribute vec4 aForm;
attribute vec3 aStyle;
varying vec2 vUV;
varying float vSeed, vW;
void main(){
  vUV=uv;
  vSeed=aStyle.y;
  int ai=int(aForm.x+.5);
  vec3 base=uAnchor[0];
  for(int k=0;k<10;k++) if(k==ai) base=uAnchor[k];
  float h=uv.y;
  float ph=aStyle.y*17.17, tt=uTime*(1.55+.6*aStyle.z);
  float theta=aForm.y+.32*sin(tt+ph+h*3.)*h;
  vec3 radial=vec3(cos(theta),0.,sin(theta));
  vec3 look=cameraPosition-base;
  vec3 side=normalize(vec3(look.z,0.,-look.x)+vec3(.0001,0.,.0001));
  float bend=(.20*sin(h*5.-tt*2.1+ph)+.10*sin(h*10.+tt*2.8+ph*1.7))*h*h;
  float width=aStyle.x*pow(1.-h,1.16)*(.73+.27*sin(h*7.+ph-tt))*smoothstep(0.,.12,h);
  float length=aForm.w*(.96+.11*sin(tt+ph))*(.78+.22*uHeat);
  vec3 p=base+radial*(aForm.z*(1.+.2*h))+
    vec3(0.,h*length,0.)+side*((uv.x-.5)*2.*width+bend)+radial*(
      .08*sin(h*6.+tt+ph)*h+.10*h*h);
  vW=h;
  gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
}`;
const FRAG = String.raw`precision highp float;
uniform float uTime,uHeat;
varying vec2 vUV;
varying float vSeed,vW;
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise2(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+vec2(1.,1.)),f.x),f.y);
}
float fbm(vec2 p){
 float v=0.,a=.5;
 for(int i=0;i<3;i++){v+=a*noise2(p);p=p*2.07+vec2(4.7,2.3);a*=.5;}
 return v;
}
void main(){
 float x=(vUV.x-.5)*2.,h=vUV.y,seed=vSeed*27.;
 float t=uTime*2.1+seed;
 float twist=fbm(vec2(x*2.9+seed,h*3.9-t))-.5;
 float edge=abs(x+.20*twist*sin(h*4.+t))+.14*twist+.10*sin(x*7.+t)*h;
 float maxH=.82+.18*fbm(vec2(x*2.3+seed,1.2-t*.22));
 float cut=1.-smoothstep(.74,.99,edge);
 cut*=1.-smoothstep(maxH-.14,maxH+.03,h);
 float holes=fbm(vec2(x*5.+seed*.37,h*5.8-t*1.3));
 cut*=1.-.56*smoothstep(.68,.9,holes)*smoothstep(.2,.55,h);
 if(cut<.015) discard;
 float core=pow(1.-clamp(abs(x),0.,1.),2.8);
 float curl=smoothstep(.22,.83,fbm(vec2(x*3.+seed,h*4.-t*.7)));
 vec3 dark=vec3(.018,.025,.12);
 vec3 blue=vec3(.04,.22,.85);
 vec3 cyan=vec3(.08,.78,1.);
 vec3 hot=vec3(.63,.98,1.);
 vec3 c=mix(dark,blue,.42+.45*curl);
 c=mix(c,cyan,.56*core+.18*(1.-h));
 c=mix(c,hot,core*core*.70*(1.-.6*h));
 float alpha=uHeat*cut*(.66+.27*core)*smoothstep(0.,.10,h)*(1.-.4*h);
 if(alpha<.025) discard;
 gl_FragColor=vec4(c,clamp(alpha,0.,.90));
}`;

export function createVeraxionHeroBurnVFX(T, scene, opts = {}) {
 const low=!!opts.low, count=low?30:48, segments=low?9:13;
 const anchors=Array.from({length:10},()=>new T.Vector3());
 const geometry=new T.BufferGeometry();
 const P=[],U=[],F=[],S=[],I=[];
 const groups=[0,1,1,1,2,3,4,5,6,7,8,9]; // quadris/peito/cabeça/braços/pernas/mãos
 const specs=[
   [0,.27,.67,.22],[1,.32,.65,.23],[1,.24,.82,.19],[1,.31,.54,.18],
   [2,.16,.31,.12],[3,.13,.48,.10],[4,.13,.48,.10],
   [5,.12,.44,.11],[6,.12,.44,.11],[7,.12,.47,.10],
   [8,.10,.36,.09],[9,.10,.36,.09]
 ];
 for(let i=0;i<count;i++){
   const gi=groups[i%groups.length],spec=specs[i%specs.length];
   const angle=i*2.399963229728653+((i%5)-2)*.12;
   const [anchor,radius,height,width]=spec;
   const rnd=((i*37+11)%101)/101;
   const w=width*(.65+.65*rnd),h=height*(.7+.55*(1-rnd));
   const start=P.length/3;
   for(let j=0;j<=segments;j++)for(let k=0;k<2;k++){
     P.push(0,0,0); U.push(k,j/segments);
     F.push(anchor,angle,radius*(.75+.5*rnd),h);
     S.push(w,rnd,((i*11)%17)/17);
   }
   for(let j=0;j<segments;j++){
     const a=start+j*2;
     I.push(a,a+2,a+1,a+1,a+2,a+3);
   }
 }
 geometry.setAttribute('position',new T.Float32BufferAttribute(P,3));
 geometry.setAttribute('uv',new T.Float32BufferAttribute(U,2));
 geometry.setAttribute('aForm',new T.Float32BufferAttribute(F,4));
 geometry.setAttribute('aStyle',new T.Float32BufferAttribute(S,3));
 geometry.setIndex(I);
 const uniforms={uTime:{value:0},uHeat:{value:0},uAnchor:{value:anchors}};
 const material=new T.ShaderMaterial({
   vertexShader:VERT,fragmentShader:FRAG,uniforms,
   transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,
   blending:T.NormalBlending,toneMapped:false,
 });
 const mesh=new T.Mesh(geometry,material);
 mesh.name='VeraxionBurnOnHeroOrganicFlames';
 mesh.frustumCulled=false;
 mesh.renderOrder=12;
 mesh.visible=false;
 scene.add(mesh);
 // Partículas finas de fogo aspiradas para cima, não uma segunda geometria chapada.
 const sparkN=low?18:36, sparkArr=new Float32Array(sparkN*3);
 const sparkGeo=new T.BufferGeometry();sparkGeo.setAttribute('position',new T.BufferAttribute(sparkArr,3).setUsage(T.DynamicDrawUsage));
 const sparkMat=new T.PointsMaterial({
   color:0x57cbff,size:low?.05:.075,transparent:true,opacity:0,
   depthWrite:false,blending:T.AdditiveBlending,sizeAttenuation:true,toneMapped:false
 });
 const sparks=new T.Points(sparkGeo,sparkMat);
 sparks.frustumCulled=false;sparks.visible=false;sparks.renderOrder=13;scene.add(sparks);
 const offsets=[
   [0,.48,0],[0,1.04,0],[0,1.65,0],
   [-.38,1.12,0],[.38,1.12,0],
   [-.22,.30,0],[.22,.30,0],
   [-.49,.79,0],[.49,.79,0],
   [-.48,.64,0],[.48,.64,0]
 ];
 const fallback=new T.Vector3(),q=new T.Quaternion(),origin=new T.Vector3();
 let target=null,rig=null,bones=null,t=0,heat=0;
 const norm=n=>String(n||'').toLowerCase().replace(/[^a-z]/g,'').replace(/^mixamorig/,'');
 function findBones(root){
   const all=[];if(root)root.traverse(o=>{if(o.isBone)all.push(o);});
   function get(...candidates){
     for(const c of candidates){const f=all.find(b=>norm(b.name)===c);if(f)return f;}
     for(const c of candidates){const f=all.find(b=>norm(b.name).includes(c));if(f)return f;}
     return null;
   }
   return [
     get('hips','pelvis'),get('spine2','spine1','chest','spine'),get('head'),
     get('leftforearm','leftlowerarm','leftarm'),get('rightforearm','rightlowerarm','rightarm'),
     get('leftupleg','leftleg'),get('rightupleg','rightleg'),
     get('leftshoulder','leftupperarm'),get('rightshoulder','rightupperarm'),
     get('lefthand','leftwrist'),get('righthand','rightwrist')
   ];
 }
 function setTarget(playerRoot,heroModel){
   target=playerRoot||null;
   if(heroModel!==rig){rig=heroModel||null;bones=findBones(rig);}
 }
 function update(dt,stacks=0){
   t+=Math.min(Math.max(0,dt),.08);
   const desired=target&&stacks>0?Math.min(1.28,.58+stacks*.25):0;
   heat+=(desired-heat)*(1-Math.exp(-Math.min(Math.max(0,dt),.1)*(desired>heat?12:8)));
   uniforms.uTime.value=t;uniforms.uHeat.value=heat;
   mesh.visible=heat>.035;sparks.visible=heat>.035;
   if(!mesh.visible||!target)return;
   target.getWorldPosition(origin);
   target.getWorldQuaternion(q);
   const height=typeof opts.height==='function'?Math.min(2.25,Math.max(1.2,opts.height())):1.8;
   const scale=height/1.85;
   for(let i=0;i<anchors.length;i++){
     if(bones&&bones[i]) bones[i].getWorldPosition(anchors[i]);
     else {
       const v=offsets[i];
       fallback.set(v[0]*scale,v[1]*scale,v[2]*scale).applyQuaternion(q);
       anchors[i].copy(origin).add(fallback);
     }
   }
   for(let i=0;i<sparkN;i++){
     const k=i%sparkN,idx=(i*7)%anchors.length,base=anchors[idx],cycle=(t*(.56+.016*i)+i*.6180339)%1;
     const a=i*2.39996+t*(.7+.03*(i%5)),rad=.10+.2*((i*11)%17)/17;
     const off=i*3;sparkArr[off]=base.x+Math.cos(a)*rad;
     sparkArr[off+1]=base.y+cycle*(.4+.35*(i%3)/2);
     sparkArr[off+2]=base.z+Math.sin(a)*rad;
   }
   sparkGeo.attributes.position.needsUpdate=true;
   sparkMat.opacity=.65*Math.min(1,heat);
 }
 function clear(){heat=0;uniforms.uHeat.value=0;mesh.visible=sparks.visible=false;}
 function dispose(){scene.remove(mesh,sparks);geometry.dispose();material.dispose();sparkGeo.dispose();sparkMat.dispose();}
 return {setTarget,update,clear,dispose,get active(){return mesh.visible;}};
}
