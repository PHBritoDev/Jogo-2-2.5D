/**
 * MOD 274 — ECLIPSE DA DÍVIDA: RUPTURA ESCARLATE (somente apresentação 3D).
 * Referência do criador: rasgo vertical branco/carmesim, asas de sombra negro-violeta,
 * raios ramificados e fragmentos de basalto. Nenhuma física/dano/animação alterada.
 * Usa o relógio da skill original (charge/release/impact/fade), sem timers adicionais.
 */
export const ECLIPSE_SAKUGA_BUILD = "274-crimson-sakuga-v1";
const pi=Math.PI, clamp01=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
const smooth=x=>{x=clamp01(x);return x*x*(3-2*x);};
const hash=i=>{const x=Math.sin(i*127.1+41.7)*43758.5453123;return x-Math.floor(x);};
/** Peso visual de cada elemento; não modifica a lógica de combate. */
export function eclipseSakugaCue(st){
  const zero={wing:0,rift:0,impact:0,debris:0,lightning:0,stage:"off"};
  if(!st||st.done||st.aborted||st.phase==="abort"||st.phase==="fade"||st.phase==="idle")return zero;
  const t=Number.isFinite(st.pt)?Math.max(0,st.pt):0;
  if(st.phase==="charge")return {wing:smooth((t-.55)/2.15),rift:.08*smooth((t-2.1)/1.1),
    impact:0,debris:0,lightning:0,stage:"charge"};
  if(st.phase==="release"){
    const fired=!!st.released;
    return {wing:1-smooth((t-.1)/1.2),rift:fired?.95:.35+.65*smooth(t/.42),
      impact:0,debris:0,lightning:0,stage:fired?"flight":"windup"};
  }
  if(st.phase==="impact"){
    const fade=1-smooth((t-.24)/1.2);
    return {wing:.62*(1-smooth((t-.16)/.95)),rift:fade,impact:1-smooth((t-1.5)/.85),
      debris:smooth(t/.22)*(1-smooth((t-1.35)/.8)),
      lightning:smooth(t/.07)*(1-smooth((t-.22)/1.0)),stage:"impact"};
  }
  return zero;
}
/** Curva em 3D para asa rasgada; vértices compartilhados e limites fixos. */
export function eclipseWingPoint(side,u,v){
  const x=side*(.68+u*16.5);
  const arch=3.1+u*4.4+Math.sin(u*pi)*2.5;
  const lower=arch-(1.8+u*3.1)*(1+Math.sin(u*14.)*.12);
  const upper=arch+(1.05+Math.sin(u*pi)*1.1);
  const y=lower+(upper-lower)*v;
  const z=-1.7-u*.55+Math.sin(u*11.+v*7.)*.16;
  return [x,y,z];
}
const NOISE=[
 "float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
 "float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1.,0.)),f.x),mix(h1(i+vec2(0.,1.)),h1(i+vec2(1.,1.)),f.x),f.y);}",
 "float fb(vec2 p){float k=.5,v=0.;for(int i=0;i<3;i++){v+=n2(p)*k;p*=2.05;k*=.5;}return v;}"
].join("\n");
const BASIC_V=[
 "varying vec2 uv0;",
 "void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}"
].join("\n");
const WING_F=[
 NOISE,"uniform float time;uniform float weight;varying vec2 uv0;",
 "void main(){vec2 p=uv0;float fib=fb(vec2(p.x*8.-time*.24,p.y*8.+time*.15));",
 " float edge=.12+.12*n2(vec2(p.x*19.+time*.12,p.y*7.));",
 " float tip=1.-smoothstep(.91,1.07,p.x+(.07-.05*p.y)*fib);",
 " float serration=.55+.45*sin(p.x*56.+p.y*17.+time*.28);",
 " float torn=smoothstep(.04,.18,p.y+.11*fib)*smoothstep(.02,.16,1.-p.y)*tip;",
 " torn*=.7+.3*serration;",
 " if(torn<.035)discard;",
 " float vein=pow(max(0.,cos(p.y*17.+p.x*12.-time*.45)),22.);",
 " float hot=smoothstep(.24,.59,fb(vec2(p.x*4.+time*.2,p.y*8.)));",
 " vec3 c=mix(vec3(.07,.007,.17),vec3(.45,.05,.68),clamp(p.y*.8+fib*.6,0.,1.));",
 " c=mix(c,vec3(1.,.016,.075),hot*(1.-p.x*.26)*.84);",
 " c+=vec3(1.,.09,.22)*vein*(.28+.72*hot);",
 " c=mix(c,vec3(.02,.003,.055),smoothstep(.83,1.,p.x)*.24);",
 " gl_FragColor=vec4(c,weight*torn*(.9+.10*hot));}"
].join("\n");
const RIFT_F=[
 NOISE,"uniform float time;uniform float weight;varying vec2 uv0;",
 "void main(){vec2 uv=uv0;float y=uv.y,x=uv.x*2.-1.;",
 " float turbulence=(fb(vec2(y*8.-time*.7,x*4.))- .44)*.20;",
 " float warp=x-.085*sin(y*14.+time*2.2)-turbulence;",
 " float width=(.47-.20*y)+.07*sin(y*24.+time*2.1);",
 " float mask=1.-smoothstep(width-.09,width,abs(warp));",
 " float core=1.-smoothstep(.09,.21,abs(warp));",
 " float split=pow(max(0.,cos(y*18.+warp*4.)),18.)*(1.-smoothstep(.38,.7,abs(warp)));",
 " float tears=smoothstep(.17,.61,fb(vec2(abs(warp)*8.+time*.5,y*14.-time*.55)));",
 " float ragged=(1.-smoothstep(width*.6,width,abs(warp))) + tears*.24;",
 " float top=smoothstep(.01,.07,y)*(1.-smoothstep(.94,1.,y));",
 " vec3 c=mix(vec3(.025,.001,.06),vec3(.98,.01,.055),clamp(ragged,0.,1.));",
 " c=mix(c,vec3(1.,.84,.92),smoothstep(.16,.32,core)*.86);",
 " c=mix(c,vec3(1.,.99,1.),core*.9);",
 " c+=vec3(1.,.08,.28)*split*.38;",
 " float al=weight*mask*top*(.88+.12*tears);",
 " if(al<.025)discard;gl_FragColor=vec4(c,al);}"
].join("\n");
function makeWingGeometry(T,side,low){
  const nx=low?13:26,ny=low?3:6,xyz=[],uv=[],indices=[];
  for(let i=0;i<=nx;i++)for(let j=0;j<=ny;j++){
    const u=i/nx,v=j/ny,p=eclipseWingPoint(side,u,v);
    xyz.push(...p);uv.push(u,v);
  }
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
    const a=i*(ny+1)+j,b=a+ny+1;indices.push(a,b,a+1,b,b+1,a+1);
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute("position",new T.Float32BufferAttribute(xyz,3));
  geo.setAttribute("uv",new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);
  geo.computeVertexNormals();return geo;
}
/**
 * Materiales com gradiente procedural; nenhuma textura remota, pós-processamento
 * ou mesh fullscreen. Tudo dentro da cena com z-test e descarte no final.
 */
export function createEclipseSakuga(T,parent){
  const group=new T.Group();group.name="VorgazhekSakugaCrimsonRupture";parent.add(group);
  const geos=[],mats=[],time={value:0},wingAlpha={value:0},riftAlpha={value:0};
  const mkMat=(vertexShader,fragmentShader,uniforms={})=>{
    const m=new T.ShaderMaterial({vertexShader,fragmentShader,
      uniforms:{time,weight:uniforms.weight||{value:1}},
      transparent:true,depthTest:true,depthWrite:false,side:T.DoubleSide,
      toneMapped:false,fog:false});mats.push(m);return m;
  };
  const wings=new T.Group();wings.name="SakugaAsasAbissais";group.add(wings);
  const wingMeshes={low:[],high:[]};
  // Dois LODs pré-criados; só um par fica visível por execução.
  for(const mode of ["low","high"]){
    for(const side of [-1,1]){
      const geo=makeWingGeometry(T,side,mode==="low");geos.push(geo);
      const mesh=new T.Mesh(geo,mkMat(BASIC_V,WING_F,{weight:wingAlpha}));
      mesh.renderOrder=7;mesh.frustumCulled=false;mesh.visible=false;
      wings.add(mesh);wingMeshes[mode].push(mesh);
    }
  }
  const beamG=new T.PlaneGeometry(1,1,1,1);geos.push(beamG);
  const beam=new T.Mesh(beamG,mkMat(BASIC_V,RIFT_F,{weight:riftAlpha}));
  beam.name="RasgoVerticalBrancoCarmesim";beam.renderOrder=8;
  beam.frustumCulled=false;beam.visible=false;group.add(beam);
  // Basalto fissurado: fragmentos reais em 3D, sem cubos aleatorios na camera.
  const rockGeo=new T.DodecahedronGeometry(.4,0);geos.push(rockGeo);
  const rockMaterial=new T.MeshStandardMaterial({color:0x140b18,emissive:0xa01125,
    emissiveIntensity:.38,roughness:.95,metalness:.08,flatShading:true});
  mats.push(rockMaterial);
  const debris=new T.InstancedMesh(rockGeo,rockMaterial,52);
  debris.name="FragmentosDeBasaltoDoImpacto";debris.count=0;debris.frustumCulled=false;
  debris.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(debris);
  const lineGeo=new T.BufferGeometry();const coords=new Float32Array(4*10*2*3);
  lineGeo.setAttribute("position",new T.BufferAttribute(coords,3).setUsage(T.DynamicDrawUsage));
  lineGeo.setDrawRange(0,0);geos.push(lineGeo);
  const lightningMat=new T.LineBasicMaterial({color:0xffd5ea,transparent:true,opacity:0,
    depthWrite:false,depthTest:true,blending:T.AdditiveBlending});
  mats.push(lightningMat);
  const lightning=new T.LineSegments(lineGeo,lightningMat);
  lightning.name="RelampagosRamificados";lightning.frustumCulled=false;group.add(lightning);
  const tmpMat=new T.Matrix4(),tmpPos=new T.Vector3(),tmpQuat=new T.Quaternion(),
    tmpScale=new T.Vector3(),tmpAxis=new T.Vector3(0,1,0);
  const reset=()=>{
    group.visible=false;beam.visible=false;
    for(const mode of ["low","high"])for(const w of wingMeshes[mode])w.visible=false;
    debris.count=0;lineGeo.setDrawRange(0,0);lightningMat.opacity=0;
  };
  function animateDebris(origin,t,opacity,low){
    if(opacity<.015){debris.count=0;return;}
    const n=low?18:52;
    let count=0;
    for(let i=0;i<n;i++){
      const seed=hash(i+11),a=i*2.39996+seed*2.8,spd=3.5+seed*8.2;
      const r=(.16+spd*t)*(.8+.3*Math.sin(i*8.2));
      const yy=(5+hash(i+67)*8)*t-8.7*t*t;
      if(yy<-.3)continue;
      tmpPos.set(origin.x+Math.cos(a)*r,origin.y+.11+Math.max(0,yy),
        origin.z+Math.sin(a)*r);
      tmpQuat.setFromAxisAngle(tmpAxis,t*(1.1+seed*8)+seed*pi);
      const sc=(.15+.47*hash(i+9))*(.45+.55*opacity);
      tmpScale.set(sc*(1+seed*.8),sc*(.7+hash(i+41)),sc);
      tmpMat.compose(tmpPos,tmpQuat,tmpScale);debris.setMatrixAt(count++,tmpMat);
    }
    debris.count=count;debris.instanceMatrix.needsUpdate=true;
  }
  function animateLightning(origin,t,opacity,low){
    if(opacity<.03){lineGeo.setDrawRange(0,0);lightningMat.opacity=0;return;}
    const count=low?2:4,steps=10,beat=Math.floor(t*17);
    let k=0;
    for(let i=0;i<count;i++){
      const a=i*pi*2/count+.4,rad=2+hash(i+100)*3;
      let px=origin.x+Math.cos(a)*rad,py=origin.y+10+hash(i+81)*4,
        pz=origin.z+Math.sin(a)*rad;
      for(let j=0;j<steps;j++){
        const u=(j+1)/steps,chaos=(hash(beat*37+i*19+j*11)-.5)*(1-u)*3.3;
        const nx=origin.x+Math.cos(a)*rad*(1-u)+chaos,
          ny=origin.y+(1-u)*(10+hash(i+81)*4),
          nz=origin.z+Math.sin(a)*rad*(1-u)+chaos*.48;
        const o=k*6;coords[o]=px;coords[o+1]=py;coords[o+2]=pz;
        coords[o+3]=nx;coords[o+4]=ny;coords[o+5]=nz;k++;
        px=nx;py=ny;pz=nz;
      }
    }
    lineGeo.setDrawRange(0,k*2);lineGeo.attributes.position.needsUpdate=true;
    lightningMat.opacity=Math.min(.8,opacity)*(.72+.28*Math.sin(t*63));
  }
  function update(seq,ctx,dt){
    const st=seq&&seq.st,cue=eclipseSakugaCue(st);
    if(cue.stage==="off"||!ctx?.camera||!ctx?.boss){reset();return;}
    group.visible=true;time.value=st.t;
    const B=ctx.boss,C=ctx.camera.position,low=!!ctx.low;
    const outward=Math.atan2(C.x-B.x,C.z-B.z);
    wings.position.set(st.phase==="impact"&&st.impact?st.impact.x:B.x,
      st.phase==="impact"&&st.impact?st.impact.y:B.y,
      st.phase==="impact"&&st.impact?st.impact.z:B.z);
    wings.rotation.set(0,outward,0);
    wingAlpha.value=cue.wing*.94;
    for(const mode of ["low","high"])for(const w of wingMeshes[mode])
      w.visible=mode===(low?"low":"high")&&cue.wing>.025;
    let target=null;
    if(st.phase==="release"&&st.slash)target=st.slash;
    else if(st.phase==="impact"&&st.impact)target=st.impact;
    const x=target?.x??B.x,y=target?.y??B.y,z=target?.z??B.z;
    beam.position.set(x,y+(target?10:14),z);
    // Billboarding de um objeto no mundo, nao uma camada que cobre a tela.
    beam.quaternion.copy(ctx.camera.quaternion);
    beam.scale.set(st.phase==="impact"?8:st.slash?5:5.5,
      st.phase==="impact"?21:st.slash?20:29,1);
    riftAlpha.value=cue.rift*(st.phase==="charge"?.55:.96);
    beam.visible=riftAlpha.value>.03;
    if(st.phase==="impact"&&st.impact){
      animateDebris(st.impact,st.pt,cue.debris,low);
      animateLightning(st.impact,st.pt,cue.lightning,low);
    }else{
      debris.count=0;lineGeo.setDrawRange(0,0);lightningMat.opacity=0;
    }
  }
  reset();
  return {group,update,clear:reset,
    dispose(){reset();group.parent?.remove(group);
      for(const geo of geos)geo.dispose();for(const mat of mats)mat.dispose();}};
}
