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
export const VHAZRAEL_REFERENCE_BUILD = '275-sword-reference-ink-rift';
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
const WING_V=[
'uniform float time;varying vec2 vUv;',
'void main(){vUv=uv;vec3 p=position;float u=uv.x;',
'p.y+=(sin(u*10.-time*2.2)*.29+sin(u*23.+time*2.1)*.16)*u;',
'p.z+=sin(u*12.-time*1.4)*.36*u;',
'gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}'
].join('\n');
const WING_F=[
'uniform float time,alpha;varying vec2 vUv;',
'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
'return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}',
'void main(){vec2 p=vUv;float top=n(vec2(p.x*13.-time*.37,p.y*9.));',
'float veins=n(vec2(p.x*29.+time*.45,p.y*17.-time*.26));',
'float low=.035+.21*n(vec2(p.x*10.+time*.22,1.6));',
'float high=.97-.18*n(vec2(p.x*15.-time*.28,4.7));',
'float mask=smoothstep(low,low+.06,p.y)*(1.-smoothstep(high-.08,high,p.y));',
'mask*=smoothstep(0.,.045,p.x)*(1.-smoothstep(.88,1.,p.x));',
'float cut=n(vec2(p.x*36.+time*.14,p.y*19.));',
'mask*=.8+.2*smoothstep(.23,.73,cut);',
'vec3 c=mix(vec3(.009,.002,.018),vec3(.07,.012,.22),smoothstep(.28,.75,top));',
'c=mix(c,vec3(.28,.008,.42),smoothstep(.57,.87,veins)*.7);',
'float hot=pow(max(0.,1.-abs(p.y-.2)*2.2),2.)*smoothstep(.38,.8,top);',
'c=mix(c,vec3(.96,.014,.037),hot*.87);',
'c+=vec3(.68,.018,.08)*smoothstep(.79,.93,veins)*.45;',
'if(mask*alpha<.018)discard;gl_FragColor=vec4(c,alpha*mask);}'
].join('\n');
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
function wingGeo(T,side,lod,layer) {
 const nx=lod?13:27,ny=lod?4:7,xyz=[],uv=[],idx=[];
 for(let i=0;i<=nx;i++){
   const u=i/nx;const px=side*(.5+u*(layer?12:19));
   const lift=1.2+u*(layer?2.0:4.4)+Math.sin(u*Math.PI)*2.3;
   const lower=lift-(1+3*u)*(.8+.12*Math.sin(u*16.));
   const upper=lift+(2.9+1.2*Math.sin(u*Math.PI))*(1-.18*u);
   for(let j=0;j<=ny;j++){
     const v=j/ny;
     xyz.push(px,lower+(upper-lower)*v+.31*v*Math.sin(u*15+layer),-1.4-layer*.48-u*.4);
     uv.push(u,v);
     if(i<nx&&j<ny){
       const a=i*(ny+1)+j,b=a+ny+1;
       idx.push(a,b,a+1,a+1,b,b+1);
     }
   }
 }
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
 g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);return g;
}
export function createThroneReferenceVFX(T,parent) {
 const root=new T.Group();root.name='VhazraelRupturaReferenciaMod275';parent.add(root);
 const geos=[],mats=[],cameraPos=new T.Vector3(),TICK={value:0},wingA={value:0},coreA={value:0},flashA={value:0};
 const shader=(vs,fs,uniforms,additive=false)=>{
  const m=new T.ShaderMaterial({vertexShader:vs,fragmentShader:fs,
   uniforms:{time:TICK,alpha:uniforms},transparent:true,depthWrite:false,
   depthTest:true,side:T.DoubleSide,toneMapped:false,fog:false,
   blending:additive?T.AdditiveBlending:T.NormalBlending});
  mats.push(m);return m;
 };
 const wings=new T.Group();wings.name='AsasDeTintaNegraVioleta';root.add(wings);
 const wingM=shader(WING_V,WING_F,wingA);
 const wingModels={low:[],high:[]};
 for(const key of ['low','high'])for(const side of [-1,1])for(let layer=0;layer<2;layer++){
  if(key==='low'&&layer)continue;
  const g=wingGeo(T,side,key==='low',layer);geos.push(g);
  const mesh=new T.Mesh(g,wingM);mesh.name='MantoAbissal'+side+'_'+layer;mesh.frustumCulled=false;
  mesh.renderOrder=6;mesh.visible=false;wings.add(mesh);wingModels[key].push(mesh);
 }
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
  for(const m of [...wingModels.low,...wingModels.high])m.visible=false;
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
  TICK.value=s.age||0;wingA.value=c.wings;coreA.value=c.whiteCore;
  wings.visible=c.wings>.025;
  if(wings.visible){
    // Abertura diretamente atras do ator (ou ponto de impacto), vista em 3D pela camera.
    const anchor=s.phase==='impact'&&I?I:B;
    shift.set(anchor.x-cameraPos.x,0,anchor.z-cameraPos.z).normalize();
    wings.position.set(anchor.x+shift.x*2.4,anchor.y+.6,anchor.z+shift.z*2.4);
    wings.lookAt(cameraPos);
    wings.scale.setScalar(.63+.37*smooth((s.age-.4)/1.7));
    for(const key of ['low','high'])for(const model of wingModels[key])
      model.visible=key===(low?'low':'high');
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
 return {begin,render,clear:hide,stats:()=>({...current}),
  dispose(){hide();parent.remove(root);for(const g of geos)g.dispose();for(const m of mats)m.dispose();}};
}
