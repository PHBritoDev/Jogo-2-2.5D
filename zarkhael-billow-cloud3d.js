/** MOD 282 refino autoral: nuvem de fogo volumétrica, instanciada e animada.
 * Uma só explosão. A coluna dispara, lóbulos de fogo se enrolam e se espalham
 * em uma copa orgânica; poeira de base e clarão de choque surgem no mesmo evento.
 * Three.js r160 / WebGL1: sem dependências, sem pós-processamento pesado.
 */
export const BILLOW_BUILD='282-billow-reference-crown-v2';
const TAU=Math.PI*2;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const ease=v=>{v=clamp(v);return v*v*(3-2*v)};
const seed=(n)=>{const k=Math.sin(n*127.1+78.233)*43758.5453;return k-Math.floor(k)};
const billowVert=[
 'attribute float aSeed;attribute float aHeat;',
 'uniform float uTime,uWarp;varying vec3 vLocal;varying float vSeed,vHeat;',
 'void main(){vec3 p=position;float t=uTime;',
 'float a=atan(p.z,p.x);float h=p.y;',
 'float w=sin(a*7.+h*9.-t*1.9+aSeed*19.)*.09+sin(a*13.-h*16.+t*2.4+aSeed*37.)*.043;',
 'p*=1.+uWarp*w;',
 'vLocal=p;vSeed=aSeed;vHeat=aHeat;',
 'gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.);}'
].join('\n');
const billowFrag=[
 'uniform float uTime,uOpacity,uSmoky;varying vec3 vLocal;varying float vSeed,vHeat;',
 'float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}',
 'float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
 'float a=mix(hash(i),hash(i+vec3(1,0,0)),f.x),b=mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x);',
 'float c=mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),d=mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x);',
 'return mix(mix(a,b,f.y),mix(c,d,f.y),f.z);}',
 'void main(){float t=uTime;',
 'vec3 p=vLocal*2.25+vec3(vSeed*17.,-t*.44,vSeed*13.);',
 'float n=n3(p),hi=n3(p*2.17+vec3(1.8,t*.32,2.4));',
 'float fold=sin(vLocal.x*9.+vLocal.y*11.-t*3.8+vSeed*23.);',
 'float hotness=clamp(vHeat*.67+n*.45+hi*.17+fold*.085,0.,1.);',
 'vec3 ember=vec3(.28,.008,.006),red=vec3(.90,.045,.006),orange=vec3(1.,.32,.005),gold=vec3(1.,.79,.075),white=vec3(1.,.99,.77);',
 'vec3 col=mix(ember,red,smoothstep(.08,.44,hotness));',
 'col=mix(col,orange,smoothstep(.23,.63,hotness));',
 'col=mix(col,gold,smoothstep(.46,.88,hotness));',
 'col=mix(col,white,smoothstep(.68,1.,hotness)*.94);',
 'vec3 soot=vec3(.06,.007,.009),smoke=vec3(.36,.07,.026);',
 'float dust=clamp(n*.7+hi*.31,0.,1.);',
 'col=mix(col,mix(soot,smoke,dust),uSmoky*(.78+.17*n));',
 'float rim=(1.-smoothstep(.27,.94,length(vLocal)));',
 'float alph=uOpacity*(.73+.20*n+.09*hi)*(.75+.25*rim);',
 'if(alph<.024)discard;gl_FragColor=vec4(col,clamp(alph,0.,.97));}'
].join('\n');
const haloVert='varying vec2 vUV;void main(){vUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const haloFrag=[
 'uniform float uTime,uSize,uAlpha;varying vec2 vUV;',
 'void main(){vec2 p=vUV*2.-1.;float r=length(p);float a=atan(p.y,p.x);',
 'float jag=sin(a*29.-uTime*4.8)*.024+sin(a*63.+uTime*9.)*.011;',
 'float ring=1.-smoothstep(.028,.085,abs(r-uSize-jag));',
 'float inner=exp(-r*r*20.)*.74,glare=exp(-r*r*3.)*.18;',
 'float rays=pow(max(0.,sin(a*23.+uTime*.5)),22.)*smoothstep(.10,.30,r)*(1.-smoothstep(.78,1.,r));',
 'float strength=clamp(ring*.95+inner+glare+rays*.25,0.,1.);',
 'vec3 col=mix(vec3(1.,.23,.015),vec3(1.,.98,.72),clamp(ring*.7+inner+glare,0.,1.));',
 'float alpha=uAlpha*strength*(1.-smoothstep(.92,1.06,r));',
 'if(alpha<.015)discard;gl_FragColor=vec4(col,alpha);}'
].join('\n');
function cloudMaterial(T,smoky=0){return new T.ShaderMaterial({
 vertexShader:billowVert,fragmentShader:billowFrag,
 uniforms:{uTime:{value:0},uOpacity:{value:0},uWarp:{value:0},uSmoky:{value:smoky}},
 transparent:true,depthWrite:false,depthTest:true,side:T.FrontSide,toneMapped:false,blending:T.NormalBlending
});}
export function createBillowingCrown(T,root){
 const cloudGeo=new T.SphereGeometry(1,22,16),N=96,SMOKE=44;
 const billows=new T.InstancedMesh(cloudGeo,cloudMaterial(T,0),N);
 const smoke=new T.InstancedMesh(cloudGeo,cloudMaterial(T,1),SMOKE);
 billows.name='SingleExplosionBillowingFire';smoke.name='SingleExplosionGroundCloud';
 billows.frustumCulled=false;smoke.frustumCulled=false;
 billows.renderOrder=46;smoke.renderOrder=39;root.add(smoke,billows);
 const seeds=new Float32Array(N),hot=new Float32Array(N),smokeSeeds=new Float32Array(SMOKE),smokeHot=new Float32Array(SMOKE);
 const capLobes=[],smokeLobes=[];
 // Não há bolhas idênticas em uma grade: distribuição espiral com três escalas,
 // desfasagens por lóbulo e espessura vertical para evitar copa achatada.
 for(let i=0;i<N;i++){
  const ring=i<18?0:i<51?1:2,n=ring===0?18:ring===1?33:45,j=i-(ring===0?0:ring===1?18:51);
  const a=j/n*TAU+(ring*.43)+seed(i+31)*.24;
  const radius=(ring===0?4.7:ring===1?12.8:21.0)*( .77+.36*seed(i+91));
  const h=(ring===0?32:ring===1?31:27.6)+(seed(i+119)-.5)*(ring===0?6:8);
  const sz=(ring===0?4.3:ring===1?4.75:5.5)*(.78+.44*seed(i+45));
  const delay=ring*.29+seed(i+11)*.38;
  capLobes.push({a,radius,h,sz,delay,seed:seed(i+71),stretch:.78+.42*seed(i+131)});
  seeds[i]=seed(i+51);hot[i]=ring===0?.93:ring===1?.76:.60;
 }
 for(let i=0;i<SMOKE;i++){
  const a=i/SMOKE*TAU+seed(i+222)*.2;
  smokeLobes.push({a,radius:14+12*seed(i+203),h:1.6+4*seed(i+252),sz:2.8+2.5*seed(i+232),delay:.25+.48*seed(i+222)});
  smokeSeeds[i]=seed(i+301);smokeHot[i]=.05;
 }
 // Atributos por instância, economizando draw calls no celular.
 const geoFire=billows.geometry.clone();geoFire.setAttribute('aSeed',new T.InstancedBufferAttribute(seeds,1));geoFire.setAttribute('aHeat',new T.InstancedBufferAttribute(hot,1));billows.geometry=geoFire;
 const geoSmoke=smoke.geometry.clone();geoSmoke.setAttribute('aSeed',new T.InstancedBufferAttribute(smokeSeeds,1));geoSmoke.setAttribute('aHeat',new T.InstancedBufferAttribute(smokeHot,1));smoke.geometry=geoSmoke;
 cloudGeo.dispose();
 const halo=new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({
  vertexShader:haloVert,fragmentShader:haloFrag,uniforms:{uTime:{value:0},uSize:{value:0},uAlpha:{value:0}},
  transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false
 }));
 halo.name='SingleExplosionGroundFlash';halo.rotation.x=-Math.PI/2;halo.renderOrder=41;root.add(halo);
 const rayMat=new T.MeshBasicMaterial({color:0xfff0ac,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
 const rays=new T.InstancedMesh(new T.CylinderGeometry(.015,.045,1,5),rayMat,16);
 rays.frustumCulled=false;root.add(rays);
 const M=new T.Matrix4(),Q=new T.Quaternion(),P=new T.Vector3(),S=new T.Vector3(),Y=new T.Vector3(0,1,0),D=new T.Vector3();
 function update(age,st,opts={}){
  const active=age>=0&&st.phase==='explosions',t=opts.time||0;
  const low=!!opts.low,unit=st.dangerR/26.8328157;
  const head=ease((age-.65)/1.65),fade=1-ease((age-3.55)/1.28);
  billows.visible=active&&head>.002;billows.count=low?56:N;
  for(let i=0;i<billows.count;i++){
   const o=capLobes[i],progress=ease((age-(.64+o.delay))/1.45);
   const grow=.045+.955*progress,s=o.sz*grow*unit;
   const wave=.52*Math.sin(t*.96+o.seed*TAU)*progress;
   P.set(Math.cos(o.a)*o.radius*(.15+.85*head)*unit+wave, (o.h-4*(1-head))*progress +.43*Math.sin(t*.9+o.seed*9.)*progress,
    Math.sin(o.a)*o.radius*(.15+.85*head)*unit-wave*.25);
   Q.setFromAxisAngle(Y,o.a+ t*(i%2?.03:-.025));
   M.compose(P,Q,S.set(s*1.08,s*(o.stretch),s*1.08));billows.setMatrixAt(i,M);
  }
  billows.instanceMatrix.needsUpdate=true;
  billows.material.uniforms.uTime.value=t;
  billows.material.uniforms.uWarp.value=active?(.75+.25*head):0;
  billows.material.uniforms.uOpacity.value=active?head*fade*.92:0;
  const ground=ease((age-.34)/.9),smFade=1-ease((age-3.1)/1.7);
  smoke.visible=active&&ground>.001;smoke.count=low?24:SMOKE;
  for(let i=0;i<smoke.count;i++){
   const o=smokeLobes[i],progress=ease((age-o.delay)/1.2);
   const rad=o.radius*(.1+.9*ground)*unit;
   P.set(Math.cos(o.a)*rad,o.h*progress+Math.sin(t*.42+i)*.26*progress,Math.sin(o.a)*rad);
   Q.setFromAxisAngle(Y,o.a);const s=o.sz*unit*(.15+.85*progress);
   M.compose(P,Q,S.set(s*1.15,s*.65,s*1.25));smoke.setMatrixAt(i,M);
  }
  smoke.instanceMatrix.needsUpdate=true;
  smoke.material.uniforms.uTime.value=t;
  smoke.material.uniforms.uWarp.value=.55;
  smoke.material.uniforms.uOpacity.value=active?ground*smFade*.77:0;
  halo.visible=st.phase==='explosions';halo.scale.setScalar(unit*29);
  halo.position.y=.14;
  halo.material.uniforms.uTime.value=t;
  halo.material.uniforms.uSize.value=Math.min(.94,.06+.84*ease((age-.04)/1.25));
  halo.material.uniforms.uAlpha.value=active?1-ease((age-1.2)/1.45):0;
  const rayFade=active?ease((age-.04)/.21)*(1-ease((age-1.2)/.72)):0;
  rays.count=low?8:16;
  for(let i=0;i<rays.count;i++){
   const a=TAU*i/rays.count+seed(i+533)*.18,angle=(.18+.36*seed(i+398));
   const length=(18+17*seed(i+511))*unit*ease((age-.05)/1.1);
   D.set(Math.cos(a),angle,Math.sin(a)).normalize();
   P.copy(D).multiplyScalar(length*.5);P.y+=.4;
   Q.setFromUnitVectors(Y,D);
   M.compose(P,Q,S.set(.7,length,.7));rays.setMatrixAt(i,M);
  }
  rays.instanceMatrix.needsUpdate=true;rayMat.opacity=rayFade*.72;
 }
 function clear(){billows.visible=false;smoke.visible=false;halo.visible=false;rays.count=0;}
 clear();
 return {update,clear,billows,smoke};
}
