/**
 * MOD 275 — VHAZRAEL/BISPO 1: acabamento da Ruptura do Trono Abissal.
 * Referencia enviada pelo criador (imagem e video de 26.78s):
 *  - silhuetas abissais NEGRO/VIOLETA se abrem nas laterais;
 *  - fissura vertical em camadas: contorno negro, carmesim, branco incandescente;
 *  - cortes negros atravessando o branco, descargas laterais irregulares;
 *  - ponto de impacto unico, fragmentos de basalto ascendentes e clarão concentrado.
 * Nao substitui o pilar, espada, animacao, dano, colisao ou cronologia original.
 * Nao ha emissor solto, sprites planos de HUD nem particulas aleatorias.
 */
import {createVhazraelFeatherWings,VHAZRAEL_WINGS_BUILD} from './vhazrael-feather-wings3d.js';
export const VHAZRAEL_REFERENCE_BUILD = '276-throne-feathered-wings-noknock';
const clamp01=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
const smooth=x=>{x=clamp01(x);return x*x*(3-2*x);};
const hash=i=>{const n=Math.sin(i*127.1+51.3)*43758.5453;return n-Math.floor(n);};
export function throneReferenceCue(s) {
 const zero={phase:'off',wings:0,whiteCore:0,impact:0,lightning:0};
 if(!s||s.cancel||['fade','done','idle'].includes(s.phase))return zero;
 const a=Math.max(0,s.age||0),t=Math.max(0,s.t||0);
 const C=s.T||{raise:1.65,charge:4.45,cut:5.15};
 const charging=['raise','charge','slash'].includes(s.phase);
 const wings=charging?smooth((a-.45)/1.75)*
   (1-smooth((a-C.cut+.08)/.48)):
   s.phase==='wave'?.5*(1-smooth((a-C.cut)/.6)):
   s.phase==='impact'?.7*(1-smooth((t-.2)/1.3)):0;
 const whiteCore=charging?smooth((a-C.raise)/.48)*
   (1-smooth((a-C.cut+.05)/.55)):
   s.phase==='wave'?.9:
   s.phase==='impact'?(1-smooth((t-.75)/1.15)):0;
 const impact=s.phase==='impact'?smooth(t/.24)*(1-smooth((t-1.1)/1.55)):0;
 const lightning=s.phase==='impact'?smooth(t/.09)*(1-smooth((t-.8)/1.2)):
   charging?.25*smooth((a-C.raise-.5)/.65):0;
 return {phase:s.phase,wings:clamp01(wings),whiteCore:clamp01(whiteCore),
   impact:clamp01(impact),lightning:clamp01(lightning)};
}
const BASE_V='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const CORE_F=[
'uniform float time,alpha;varying vec2 vUv;',
'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
'void main(){vec2 p=vUv*2.-1.;float y=vUv.y;',
'float taper=(.26+.2*pow(1.-y,1.5))*(1.-smoothstep(.88,1.,y)*.81);',
'float flick=.032*sin(y*31.-time*4.)+.022*(h(floor(vec2(y*40.,time*11.)))-.5);',
'float dx=abs(p.x-flick);',
'float inside=1.-smoothstep(taper-.07,taper+.038,dx);',
'float white=1.-smoothstep(taper*.2,taper*.52,dx);',
'float red=1.-smoothstep(taper*.47,taper*.91,dx);',
'vec3 col=mix(vec3(.015,.001,.031),vec3(.91,.011,.029),red);',
'col=mix(col,vec3(1.,.97,.91),white);',
'float bar1=1.-smoothstep(.016,.028,abs(y-.445));',
'float bar2=1.-smoothstep(.009,.019,abs(y-.716));',
'float bar=(bar1*.92+bar2*.78)*smoothstep(.18,.34,dx);',
'col=mix(col,vec3(.01,.004,.026),min(1.,bar));',
'float opaque=alpha*inside*(1.-smoothstep(.94,1.,y));',
'if(opaque<.012)discard;gl_FragColor=vec4(col,opaque);}'
].join('\n');
const FLASH_F=[
'uniform float alpha;varying vec2 vUv;',
'void main(){vec2 p=vUv*2.-1.;float d=length(p);',
'float a=exp(-d*d*11.)*.82+exp(-abs(p.y)*22.)*exp(-abs(p.x)*3.)*.25;',
'vec3 c=mix(vec3(1.,.065,.13),vec3(1.,.96,.89),exp(-d*d*18.));',
'if(a*alpha<.015)discard;gl_FragColor=vec4(c,a*alpha);}'
].join('\n');
export function createThroneReferenceVFX(T,parent) {
 const root=new T.Group();root.name='VhazraelRupturaReferenciaMod275';parent.add(root);
 const geos=[],mats=[],cameraPos=new T.Vector3(),TICK={value:0},coreA={value:0},flashA={value:0};
 const shader=(vs,fs,uniforms,additive=false)=>{
  const m=new T.ShaderMaterial({vertexShader:vs,fragmentShader:fs,
   uniforms:{time:TICK,alpha:uniforms},transparent:true,depthWrite:false,
   depthTest:true,side:T.DoubleSide,toneMapped:false,fog:false,
   blending:additive?T.AdditiveBlending:T.NormalBlending});
  mats.push(m);return m;
 };
 const featherWings=createVhazraelFeatherWings(T,root);
 const wings=featherWings.root;
 const coreG=new T.PlaneGeometry(1,1);geos.push(coreG);
 const core=new T.Mesh(coreG,shader(BASE_V,CORE_F,coreA));core.name='NucleoBrancoCarmesimVertical';
 core.frustumCulled=false;core.renderOrder=8;core.visible=false;root.add(core);
 const flareG=new T.PlaneGeometry(1,1);geos.push(flareG);
 const flare=new T.Mesh(flareG,shader(BASE_V,FLASH_F,flashA,true));flare.name='ClarãoImpactoConcentrado';
 flare.frustumCulled=false;flare.visible=false;flare.renderOrder=9;root.add(flare);
 const lineGeo=new T.BufferGeometry(),positions=new Float32Array(4*12*2*3);
 lineGeo.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
 lineGeo.setDrawRange(0,0);geos.push(lineGeo);
 const lineMat=new T.LineBasicMaterial({color:0xffecf1,transparent:true,opacity:0,depthWrite:false,
   depthTest:true,blending:T.AdditiveBlending});mats.push(lineMat);
 const arcs=new T.LineSegments(lineGeo,lineMat);arcs.name='RelampagosBrancosLaterais';
 arcs.frustumCulled=false;root.add(arcs);
 const rockGeo=new T.IcosahedronGeometry(.55,0);geos.push(rockGeo);
 const rockMat=new T.MeshStandardMaterial({color:0x100811,emissive:0x580c16,emissiveIntensity:.35,
   flatShading:true,roughness:.87});mats.push(rockMat);
 const rocks=new T.InstancedMesh(rockGeo,rockMat,24);
 rocks.name='PedrasAngularesDoRasgo';rocks.count=0;rocks.frustumCulled=false;
 rocks.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(rocks);
 const p=new T.Vector3(),q=new T.Quaternion(),sc=new T.Vector3(),mat4=new T.Matrix4();
 const AXIS=new T.Vector3(0,1,0),shift=new T.Vector3(), temp=new T.Vector3();
 const current={phase:'off',wings:false,core:false,lightning:0,rocks:0,impact:0};
 function hide(){
  featherWings.clear();
  wings.visible=false;core.visible=false;flare.visible=false;lineGeo.setDrawRange(0,0);
  lineMat.opacity=0;rocks.count=0;Object.assign(current,{phase:'off',wings:false,core:false,lightning:0,rocks:0,impact:0});
 }
 function begin(cam){cameraPos.copy(cam);hide();}
 function render(s,blade,boss,low,ground) {
  const c=throneReferenceCue(s),I=s&&s.ix!==undefined?
    {x:s.ix,y:s.iy??ground(s.ix,s.iz),z:s.iz}:null;
  if(c.phase==='off'||(!boss&&!I)){hide();return;}
  const B=boss||I;
  current.phase=s.phase;current.impact=c.impact;
  TICK.value=s.age||0;coreA.value=c.whiteCore;
  featherWings.update(c.wings,low,s.age||0);
  wings.visible=c.wings>.025;
  if(wings.visible){
    // Abertura diretamente atras do ator (ou ponto de impacto), vista em 3D pela camera.
    const anchor=s.phase==='impact'&&I?I:B;
    shift.set(anchor.x-cameraPos.x,0,anchor.z-cameraPos.z).normalize();
    wings.position.set(anchor.x+shift.x*2.4,anchor.y+.6,anchor.z+shift.z*2.4);
    wings.lookAt(cameraPos);
    wings.scale.setScalar(.63+.37*smooth((s.age-.4)/1.7));

  }
  current.wings=wings.visible;
  core.visible=c.whiteCore>.02;
  if(core.visible){
    const charge=['raise','charge','slash'].includes(s.phase);
    const pos=charge?blade?.b:(s.phase==='wave'?
      {x:s.x+s.dx*Math.max(.7,s.front||0),y:ground(s.x+s.dx*(s.front||0),s.z+s.dz*(s.front||0)),z:s.z+s.dz*Math.max(.7,s.front||0)}:I);
    if(pos){
      const tall=charge?49:s.phase==='wave'?21:27;
      core.position.set(pos.x,pos.y+tall*.5,pos.z); // nasce na ponta REAL da espada (sem lacuna de 20m)
      core.lookAt(cameraPos);
      core.scale.set(charge?8.5:s.phase==='wave'?6.7:13,tall,1);
    }else core.visible=false;
  }
  current.core=core.visible;
  flare.visible=!!I&&c.impact>.025;
  if(flare.visible){
   flare.position.set(I.x,I.y+2.2,I.z);
   flare.lookAt(cameraPos);
   flare.scale.setScalar(10+12*smooth((s.t||0)/.48));
   flashA.value=c.impact*(1-smooth((s.t-.15)/.9))*.75;
  }
  if(I&&c.lightning>.025){
   const count=low?2:4,N=12,beat=Math.floor((s.t||0)*15);
   let ptr=0;
   for(let j=0;j<count;j++){
    const side=j%2?-1:1,ang=hash(j+11)*5.5,rx=side*(5+j*1.3);
    let px=I.x+rx,py=I.y+10+2*j,pz=I.z+Math.sin(ang)*3;
    for(let k=0;k<N;k++){
     const u=(k+1)/N,jerk=(hash(beat*107+j*19+k*7)-.5)*3.2*(1-u);
     const nx=I.x+rx*(1-u)+jerk,ny=I.y+.25+(10+2*j)*(1-u),
       nz=I.z+(pz-I.z)*(1-u)+jerk*.3;
     const off=ptr*6;
     positions[off]=px;positions[off+1]=py;positions[off+2]=pz;
     positions[off+3]=nx;positions[off+4]=ny;positions[off+5]=nz;
     px=nx;py=ny;pz=nz;ptr++;
    }
   }
   lineGeo.setDrawRange(0,ptr*2);lineGeo.attributes.position.needsUpdate=true;
   lineMat.opacity=.85*c.lightning;current.lightning=count;
  }else{lineGeo.setDrawRange(0,0);lineMat.opacity=0;current.lightning=0;}
  rocks.count=0;
  if(I&&c.impact>.025){
   const n=low?10:24,age=s.t||0;
   for(let j=0;j<n;j++){
    const a=j*2.399963+hash(j+17)*.32,seed=hash(j+43),
      t=Math.max(0,age-.05-j*.014);
    const height=(6+seed*11)*t-4.9*t*t;
    if(height<-.35)continue;
    const dist=(1+seed*6)*(1+Math.min(1,t*2)*.75);
    p.set(I.x+Math.cos(a)*dist,I.y+.25+height,I.z+Math.sin(a)*dist);
    q.setFromAxisAngle(AXIS,a+t*(1.5+seed*3));
    const size=(.24+.6*seed)*(1-smooth((t-1.75)/.6));
    sc.set(size,size*(.5+seed),size*.72);mat4.compose(p,q,sc);
    rocks.setMatrixAt(rocks.count++,mat4);
   }
  }
  rocks.instanceMatrix.needsUpdate=true;current.rocks=rocks.count;
 }
 hide();
 return {begin,render,clear:hide,stats:()=>({...current,feathers:featherWings.stats(),wingBuild:VHAZRAEL_WINGS_BUILD}),
  dispose(){hide();featherWings.dispose();parent.remove(root);for(const g of geos)g.dispose();for(const m of mats)m.dispose();}};
}
