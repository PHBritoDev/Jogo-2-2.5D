/**
 * MOD 280 — VFX especializado da ultimate do Bispo 3, WebGL1 compatível.
 * Círculos procedurais com glifos/hexagramas/linhas, aura advectada do corpo,
 * núcleo da espada GLB original e 3 cúpulas de plasma com formação progressiva.
 * Geometrias reutilizadas, shaders com uniforms e estilhaços instanciados.
 */
export const ZARK_ULT_VFX_BUILD='281-radial-plasma-rifts-no-spheres';
const PI=Math.PI,TAU=2*PI,clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),
 sm=v=>{v=clamp(v);return v*v*(3-2*v);};
const VERT='varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const SEAL_FRAG=[
 'uniform float uTime,uBuild,uCharge,uAlpha,uSeed; varying vec2 vU;',
 'float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/max(.001,dot(ba,ba)),0.,1.));}',
 'float line(float d,float w){return 1.-smoothstep(w,w+.004,d);}',
 'float ring(float r,float R,float w){return 1.-smoothstep(w,w+.006,abs(r-R));}',
 'void main(){vec2 p=vU*2.-1.;float r=length(p);if(r>1.025)discard;',
 'float a=atan(p.y,p.x),an=fract(a/6.2831853+.5);',
 'float draw=1.-smoothstep(uBuild-.03,uBuild+.025,an);',
 'float breathe=.84+.16*sin(uTime*2.4+uSeed*4.+r*15.);',
 'float rim=ring(r,.987,.009)+ring(r,.955,.004)+ring(r,.895,.005)+ring(r,.856,.0028);',
 'float mid=ring(r,.738,.005)+ring(r,.682,.004)+ring(r,.598,.004)+ring(r,.545,.003);',
 'float inner=ring(r,.378,.006)+ring(r,.315,.003)+ring(r,.148,.009);',
 'float tick=(1.-smoothstep(.006,.019,abs(sin(a*36.+uSeed))))*step(.745,r)*step(r,.97);',
 'float glyphs=pow(max(0.,sin(a*58.+uSeed*13.)),12.)*ring(r,.795,.017);',
 'float suns=(1.-smoothstep(.005,.018,abs(sin(a*8.))))*step(.32,r)*step(r,.93);',
 'float star=0.;',
 'for(int i=0;i<8;i++){float t=6.2831853*float(i)/8.;float t2=6.2831853*mod(float(i+3),8.)/8.;',
 'star=max(star,line(seg(p,vec2(cos(t),sin(t))*.57,vec2(cos(t2),sin(t2))*.57),.005));}',
 'float tri=0.;for(int i=0;i<3;i++){float t=6.2831853*float(i)/3.;float t2=6.2831853*float(i+1)/3.;',
 'tri=max(tri,line(seg(p,vec2(cos(t),sin(t))*.30,vec2(cos(t2),sin(t2))*.30),.005));}',
 'float spin=pow(max(0.,sin(a*11.+r*19.-uTime*2.2+uSeed)),15.)*step(.56,r)*step(r,.84);',
 'float flare=pow(max(0.,sin(a*31.+uTime*9.+uSeed*6.)),18.)*ring(r,.98,.025);',
 'float body=clamp(rim+mid+inner+tick*.8+glyphs*.85+suns*.55+star*.72+tri*.7+spin*.30,0.,1.)*draw;',
 'float impending=clamp(uCharge,0.,1.25);',
 'vec3 crimson=vec3(.85,.018,.048),orange=vec3(1.,.36,.025),gold=vec3(1.,.87,.27);',
 'float heat=clamp(rim*.40+tick*.3+glyphs*.9+inner*.6+impending*.35,0.,1.);',
 'vec3 col=mix(crimson,orange,heat);col=mix(col,gold,clamp(inner*.35+flare*.75*impending+rim*.15,0.,.85));',
 'float alpha=clamp((body*(.75+.4*impending)*breathe+flare*.42*impending)*uAlpha,0.,1.);',
 'if(alpha<.016)discard;gl_FragColor=vec4(col,alpha);}',
].join('\n');
const AURA_VERT=[
 'uniform float uTime,uPower,uSeed;varying vec2 vU;',
 'void main(){vU=uv;vec3 p=position;',
 'float rise=vU.y,flutter=sin(rise*9.-uTime*3.5+uSeed*12.)*.095+sin(rise*21.+uTime*5.+uSeed*7.)*.042;',
 'p.x+=(flutter+sin(rise*4.+uTime*.9+uSeed*8.)*.11)*(.12+.65*rise);',
 'p.z+=sin(rise*16.-uTime*2.7+uSeed*9.)*.075*(.3+rise);',
 'p.y+=sin(rise*8.+uTime*.8+uSeed)*.038*uPower;',
 'gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
].join('\n');
const AURA_FRAG=[
 'uniform float uTime,uPower,uSeed;varying vec2 vU;',
 'void main(){float v=vU.y,u=vU.x;',
 'float adv=sin(v*12.-uTime*3.2+uSeed*15.)*.08+sin(v*26.+uTime*5.+uSeed*8.)*.025;',
 'float taper=(1.-v)*(.38+.16*sin(v*6.+uSeed*3.));',
 'float body=1.-smoothstep(taper*.37,taper,abs(u-.5+adv));',
 'float fire=pow(max(0.,sin(v*41.-uTime*7.+uSeed*5.)),17.);',
 'float vein=1.-smoothstep(.025,.18,abs(u-.5+adv*.3));',
 'float height=smoothstep(0.,.1,v)*(1.-smoothstep(.80,1.,v));',
 'vec3 black=vec3(.025,.001,.015),red=vec3(.83,.008,.042),hot=vec3(1.,.19,.056);',
 'vec3 col=mix(black,red,clamp(body*.74+fire*.25,0.,1.));col=mix(col,hot,vein*.45+fire*.19);',
 'float alpha=height*(body*.46+vein*.25+fire*.12)*uPower;',
 'if(alpha<.017)discard;gl_FragColor=vec4(col,clamp(alpha,0.,1.));}',
].join('\n');
const DOME_VERT=[
 'uniform float uTime,uAge,uAlpha,uPulse;varying vec3 vPos;varying float vWarp;',
 'void main(){vec3 p=position;float a=atan(p.z,p.x);float h=max(0.,p.y);',
 'float w=.11*sin(a*9.+h*7.-uTime*3.+uPulse*4.)+.07*sin(a*21.-h*19.+uTime*5.);',
 'float distortion=w*(.46+.54*clamp(uAge,0.,1.));',
 'p.xz*=1.+distortion;p.y*=1.+distortion*.7;',
 'vPos=p;vWarp=w;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
].join('\n');
const DOME_FRAG=[
 'uniform float uTime,uAge,uAlpha,uPulse;varying vec3 vPos;varying float vWarp;',
 'float hsh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
 'float ns(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hsh(i),hsh(i+vec2(1.,0.)),f.x),mix(hsh(i+vec2(0.,1.)),hsh(i+vec2(1.,1.)),f.x),f.y);}',
 'void main(){float a=atan(vPos.z,vPos.x),h=clamp(vPos.y,0.,1.);',
 'float adv=ns(vec2(a*4.8+uTime*.25,h*5.8-uTime*2.0));',
 'float inner=ns(vec2(a*12.-uTime*.7,h*17.+uTime*3.1));',
 'float fissure=pow(max(0.,sin(a*23.+h*27.+uTime*7.+adv*4.)),11.);',
 'float patches=ns(vec2(a*8.+h*4.+uPulse,h*12.-uTime*.8));',
 'float lobe=.12*sin(a*9.+h*3.-uTime*1.3)+.08*sin(a*19.-h*11.+uTime*2.);',
 'float contour=1.-smoothstep(.83+lobe,.99+lobe,h);',
 'float speck=pow(max(0.,sin(a*15.+h*40.-uTime*8.)),17.);',
 'float burn=clamp(adv*.49+inner*.35+fissure*.37,0.,1.);',
 'vec3 black=vec3(.095,.001,.018),darkred=vec3(.49,.004,.022),red=vec3(1.,.022,.034),orange=vec3(1.,.31,.008),yellow=vec3(1.,.78,.08);',
 'vec3 col=mix(black,darkred,smoothstep(.04,.27,patches));',
 'col=mix(col,red,smoothstep(.23,.75,burn));',
 'col=mix(col,orange,clamp(fissure*.72+inner*.34,0.,.86));',
 'col=mix(col,yellow,clamp(fissure*.15+speck*.19,0.,.3));',
 'float alpha=clamp((.47+.35*burn+.22*fissure)*contour*uAlpha,0.,1.);',
 'if(alpha<.04)discard;gl_FragColor=vec4(col,alpha);}',
].join('\n');
const CHARGE_FRAG=[
 'uniform float uTime,uPower;varying vec2 vU;',
 'void main(){vec2 p=vU*2.-1.;float a=atan(p.y,p.x),r=length(p);',
 'float wave=sin(a*18.-uTime*5.)*.09+sin(a*31.+uTime*7.)*.035;',
 'float band=1.-smoothstep(.08,.22,abs(r-(.52+wave)));',
 'float energy=pow(max(0.,1.-r),2.)*.9+band;',
 'float lines=pow(max(0.,sin(a*13.+r*13.-uTime*4.)),13.);',
 'vec3 col=mix(vec3(.5,.002,.03),vec3(1.,.25,.06),clamp(energy*.8,0.,1.));',
 'col=mix(col,vec3(1.,.94,.72),pow(max(0.,1.-r),5.)+lines*.65);',
 'float alpha=clamp((energy+lines*.3)*uPower,0.,1.);',
 'if(alpha<.02)discard;gl_FragColor=vec4(col,alpha);}'
].join('\n');
// Mod 281.1: lâminas volumétricas de plasma. As frentes NÃO usam domos,
// esferas nem nuvens. A malha contém três faces irregulares cruzadas, com
// fissuras e nervuras animadas no próprio shader WebGL1.
const RIFT_VERTEX=[
 'uniform float uTime,uAge,uSeed;',
 'varying vec2 vUV;varying float vFlicker;',
 'void main(){vUV=uv;vec3 v=position;',
 'float wave=sin(uv.x*13.-uTime*4.+uSeed*6.)*.07+sin(uv.x*29.+uTime*6.)*.025;',
 'v.y+=wave*uv.x*(1.-uv.x);v.z+=wave*.48*uv.x;',
 'vFlicker=.82+.18*sin(uTime*7.+uv.x*15.+uSeed);',
 'vec4 pos=vec4(v,1.);',
 '#ifdef USE_INSTANCING',
 'pos=instanceMatrix*pos;',
 '#endif',
 'gl_Position=projectionMatrix*modelViewMatrix*pos;}'
].join('\n');
const RIFT_FRAGMENT=[
 'uniform float uTime,uAge,uPower,uSeed;varying vec2 vUV;varying float vFlicker;',
 'void main(){float t=vUV.x,q=vUV.y;',
 'float jag=sin(t*31.-uTime*6.+uSeed*7.)*.075+sin(t*67.+uTime*8.)*.035;',
 'float edge=abs(q-.5)*2.;',
 'float outside=smoothstep(.45,.96,edge+jag);',
 'float vein=exp(-pow((q-.5+sin(t*17.-uTime*5.)*.065)*11.,2.));',
 'float fissure=pow(max(0.,sin(t*40.+q*19.-uTime*7.+uSeed*4.)),16.);',
 'float wave=sin(t*15.-uTime*3.+uSeed*8.)*.5+.5;',
 'vec3 obsidian=vec3(.06,.001,.017),crimson=vec3(.78,.004,.034),red=vec3(1.,.055,.035);',
 'vec3 amber=vec3(1.,.40,.025),hot=vec3(1.,.78,.20);',
 'vec3 col=mix(obsidian,crimson,clamp(.33+.6*wave,0.,1.));',
 'col=mix(col,red,clamp(.33+vein*.38+fissure*.28,0.,1.));',
 'col=mix(col,amber,clamp(vein*.55+fissure*.15,0.,.83));',
 'col=mix(col,hot,clamp(vein*.18+fissure*.1,0.,.25));',
 'col=mix(col,obsidian,clamp(outside*.81,0.,.82));',
 'float birth=smoothstep(0.,.09,t),tail=1.-smoothstep(.77,1.,t);',
 'float alpha=clamp(birth*tail*(.65+.24*vein+.20*fissure)*uPower*vFlicker,0.,1.);',
 'if(alpha<.055)discard;gl_FragColor=vec4(col,alpha);}'
].join('\n');
const RIFT_GLOW_FRAGMENT=[
 'uniform float uTime,uAge,uPower,uSeed;varying vec2 vUV;varying float vFlicker;',
 'void main(){float t=vUV.x,q=vUV.y;',
 'float v=sin(t*21.-uTime*7.+uSeed*5.)*.06;',
 'float core=exp(-pow((q-.5+v)*10.,2.));',
 'float crack=pow(max(0.,sin(t*42.+uTime*8.+uSeed*4.)),16.);',
 'float alpha=core*(.52+.40*crack)*smoothstep(0.,.11,t)*(1.-smoothstep(.64,1.,t))*uPower;',
 'if(alpha<.03)discard;',
 'vec3 color=mix(vec3(1.,.16,.02),vec3(1.,.69,.16),core*.59+crack*.22);',
 'gl_FragColor=vec4(color,clamp(alpha,0.,.76));}'
].join('\n');
function makePlasmaRiftGeometry(THREE){
 const pos=[],uv=[],idx=[],segments=14;
 // Três intersectantes malhas serrilhadas formam uma língua 3D,
 // não uma folha invisível lateralmente.
 for(let plane=0;plane<3;plane++){
  const off=pos.length/3;
  for(let j=0;j<=segments;j++){
   const t=j/segments;
   const taper=Math.pow(Math.max(0,1-t),.64);
   const irregular=(.92+.11*Math.sin(t*17+plane*2.1)+.07*Math.sin(t*38+plane))*taper;
   const half=(.12+.41*Math.sin(Math.PI*t)**.72)*irregular;
   const x=t*(1+.035*Math.sin(t*15+plane*1.3));
   for(let side=-1;side<=1;side+=2){
    // Placas cruzadas no eixo radial, ondulando ao longo do comprimento.
    const w=side*half,twist=t*.13*Math.sin(t*14+plane*2);
    if(plane===0)pos.push(x,w+twist,.12*Math.sin(t*10+plane));
    if(plane===1)pos.push(x,.14+twist,w);
    if(plane===2)pos.push(x,w*.70+twist,w*.67);
    uv.push(t,(side+1)/2);
   }
   if(j<segments){const k=off+j*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setIndex(idx);g.computeVertexNormals();
 return g;
}
function riftMaterial(THREE,fragment,seed,additive){
 return new THREE.ShaderMaterial({
  vertexShader:RIFT_VERTEX,fragmentShader:fragment,
  uniforms:{uTime:{value:0},uAge:{value:0},uPower:{value:0},uSeed:{value:seed}},
  transparent:true,depthWrite:false,side:THREE.DoubleSide,
  blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,toneMapped:false
 });
}

function mat(THREE,frag,uniforms,vert=VERT){
 return new THREE.ShaderMaterial({vertexShader:vert,fragmentShader:frag,uniforms:Object.fromEntries(Object.entries(uniforms).map(([k,v])=>[k,{value:v}])),
  transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});
}
export function createSixSealsVFX(THREE,scene){
 const holder=new THREE.Group();holder.name='ZarkhaelSixSealsUltimate280';scene.add(holder);holder.visible=false;
 const circles=[];
 for(let i=0;i<6;i++){
  const root=new THREE.Group(),m=mat(THREE,SEAL_FRAG,{uTime:0,uBuild:0,uCharge:0,uAlpha:1,uSeed:i*.419});
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(2,2),m);
  plane.rotation.x=-PI/2;plane.frustumCulled=false;plane.renderOrder=19+i;
  root.add(plane);holder.add(root);circles.push({root,plane,m});
 }
 // A arena real tem chão xadrez: esconder apenas a ÁREA de juízo para preservar leitura.
 // A placa rubro-obsidiana põe as runas ACIMA do fundo, não uma fumaça plana.
 const fieldMat=new THREE.MeshBasicMaterial({color:0x19010a,transparent:true,opacity:0,depthWrite:false,
   side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
 const field=new THREE.Mesh(new THREE.CircleGeometry(1,128),fieldMat);
 field.name='ZarkhaelObsidianCrimsonField';field.rotation.x=-PI/2;field.renderOrder=10;holder.add(field);
 const fieldRimMat=new THREE.MeshBasicMaterial({color:0xff183f,transparent:true,opacity:0,depthWrite:false,
   blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
 const fieldRim=new THREE.Mesh(new THREE.RingGeometry(.97,1.0,128),fieldRimMat);
 fieldRim.rotation.x=-PI/2;fieldRim.renderOrder=11;holder.add(fieldRim);
 const safetyMat=new THREE.MeshBasicMaterial({color:0x74bbff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
 const safety=new THREE.Mesh(new THREE.RingGeometry(.995,1.007,128),safetyMat);safety.rotation.x=-PI/2;holder.add(safety);
 const aura=new THREE.Group();holder.add(aura);const ribbons=[];
 for(let i=0;i<8;i++){
  const a=i/8*TAU,geometry=new THREE.PlaneGeometry(.86,1,2,28);
  geometry.translate(0,.5,0);
  const m=mat(THREE,AURA_FRAG,{uTime:0,uPower:0,uSeed:i/8},AURA_VERT);
  const mesh=new THREE.Mesh(geometry,m);mesh.rotation.y=a;mesh.position.set(Math.cos(a)*.47,0,Math.sin(a)*.47);
  mesh.scale.set(.82,3.7+(i%3)*.32,1);mesh.frustumCulled=false;aura.add(mesh);ribbons.push({mesh,m});
 }
 // Aura negra viva rente ao corpo: pontas dinâmicas pequenas, sem fumaça,
 // sem aquelas paredes de energia exageradas da versão anterior.
 const auraSpineMat=new THREE.MeshBasicMaterial({color:0x25000e,transparent:true,opacity:.7,
  depthWrite:false,blending:THREE.NormalBlending,side:THREE.DoubleSide});
 const auraSpines=new THREE.InstancedMesh(new THREE.ConeGeometry(.14,1,3),auraSpineMat,20);
 auraSpines.frustumCulled=false;aura.add(auraSpines);
 const swordRoot=new THREE.Group();holder.add(swordRoot);
 const charge=mat(THREE,CHARGE_FRAG,{uTime:0,uPower:0});
 for(let i=0;i<3;i++){
  const sheet=new THREE.Mesh(new THREE.PlaneGeometry(4.6,4.6),charge);
  sheet.rotation.y=i*TAU/3;sheet.renderOrder=31;swordRoot.add(sheet);
 }
 const glowMat=new THREE.MeshBasicMaterial({color:0xffd8ac,transparent:true,opacity:.4,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const swordCore=new THREE.Mesh(new THREE.IcosahedronGeometry(.3,2),glowMat);swordRoot.add(swordCore);
 // Anéis de corrente orbitam a EspadaBispo3.glb conforme energia se concentra.
 const orbitMat=new THREE.MeshBasicMaterial({color:0xff4617,transparent:true,opacity:.65,
  depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
 const swordOrbits=[];
 for(let j=0;j<5;j++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.44+j*.1,.026,5,48),orbitMat);
  ring.rotation.set(j*.4,j*.6,0);swordRoot.add(ring);swordOrbits.push(ring);}

 // Frentes 3D autorais: vinte e oito línguas rubras com nervuras amarelas
 // finas, curvadas radialmente, e outra camada de plasma irregular.
 const riftGeometry=makePlasmaRiftGeometry(THREE);
 const bursts=[];
 for(let i=0;i<3;i++){
  const group=new THREE.Group();holder.add(group);
  const darkMat=riftMaterial(THREE,RIFT_FRAGMENT,i*.43,false);
  const hotMat=riftMaterial(THREE,RIFT_GLOW_FRAGMENT,i*.43,true);
  const dark=new THREE.InstancedMesh(riftGeometry,darkMat,44);
  const hot=new THREE.InstancedMesh(riftGeometry,hotMat,30);
  dark.frustumCulled=false;hot.frustumCulled=false;
  dark.renderOrder=43+i;hot.renderOrder=45+i;
  group.add(dark,hot);
  // Núcleo concentrado, não bola gigante. Só aparece durante ignição.
  const kernelMat=new THREE.MeshBasicMaterial({color:0xff641b,transparent:true,opacity:0,
   blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  const kernel=new THREE.Mesh(new THREE.OctahedronGeometry(.55,1),kernelMat);
  kernel.renderOrder=42+i;group.add(kernel);
  // Expansão junto ao chão é apenas uma linha de choque secundária.
  const ringMat=new THREE.MeshBasicMaterial({color:0xff2c12,transparent:true,opacity:0,
   blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.032,4,96),ringMat);
  ring.rotation.x=PI/2;ring.position.y=.25;group.add(ring);
  bursts.push({group,dark,hot,darkMat,hotMat,kernel,kernelMat,ring,ringMat});
 }
 const shardMat=new THREE.MeshBasicMaterial({color:0x3b001a,transparent:true,opacity:.85,side:THREE.DoubleSide});
 const shards=new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1,0),shardMat,72);
 shards.frustumCulled=false;holder.add(shards);
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new THREE.Vector3(),S=new THREE.Vector3(),
 up=new THREE.Vector3(0,1,0),axis=new THREE.Vector3(),tiltQ=new THREE.Quaternion(),tiltAxis=new THREE.Vector3(0,0,1);
 // Pré-ruptura das mandalas: feixes pontiagudos convergem e pulsam antes
 // da detonação, como na referência, sem artefatos de fumaça.
 const warnMat=new THREE.MeshBasicMaterial({color:0xff4b16,transparent:true,opacity:0,
   blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const warnSpikes=new THREE.InstancedMesh(new THREE.ConeGeometry(.075,1,3),warnMat,48);
 warnSpikes.frustumCulled=false;holder.add(warnSpikes);
 const light=new THREE.PointLight(0xff3b21,0,110,1.5);holder.add(light);light.castShadow=false;
 let seconds=0;
 function update(skill,ctx={},dt=0){
  if(!skill||skill.done){clear();return;}
  const st=skill.st,U=skill.U,C=st.center,B=ctx.boss||st.boss,low=!!ctx.low,ground=ctx.ground||(()=>C.y);
  seconds+=Math.max(0,dt);holder.visible=true;
  const glow=st.phase==='aura'?st.aura:1;
  aura.position.set(B.x,B.y,B.z);
  aura.scale.setScalar(.83+.18*glow);
  ribbons.forEach((r,i)=>{r.m.uniforms.uTime.value=seconds;r.m.uniforms.uPower.value=glow*(.64+.23*Math.sin(seconds*2+i));
   r.mesh.rotation.y=i/8*TAU+seconds*(i%2?-.06:.08);
  });
  // Aura rente ao personagem, com rachaduras negras e pontas móveis.
  for(let i=0;i<20;i++){
   const a=i/20*TAU,rr=.45+(i%4)*.1,heat=.5+.5*Math.sin(seconds*2.7+i*.84);
   p.set(Math.cos(a)*rr,.62+(i%7)*.34,Math.sin(a)*rr);
   axis.set(Math.sin(a)*.55,.8+heat*.2,Math.cos(a)*.55).normalize();
   q.setFromUnitVectors(up,axis);
   S.set(.10+.08*heat,.26+.85*heat,.12);matrix.compose(p,q,S);
   auraSpines.setMatrixAt(i,matrix);
  }
  auraSpines.instanceMatrix.needsUpdate=true;auraSpineMat.opacity=.20+.52*glow;
  field.position.set(C.x,ground(C.x,C.z)+.055,C.z);
  field.scale.setScalar(st.dangerR);
  fieldMat.opacity=st.phase==='aura'?0:st.phase==='seals'?
    .69+.13*sm(st.pt/U.seals):.94;
  fieldRim.position.set(C.x,ground(C.x,C.z)+.14,C.z);
  fieldRim.scale.setScalar(st.dangerR);
  fieldRimMat.opacity=st.phase==='aura'?0:.65+.28*Math.sin(seconds*4);
  for(let i=0;i<6;i++){
   const c=st.seals[i],r=circles[i],k=c.build;
   r.root.visible=k>.001;
   if(!r.root.visible)continue;
   const yy=ground(C.x,C.z)+U.heights[i];
   r.root.position.set(C.x,yy,C.z);r.root.rotation.y=c.spin;r.root.scale.setScalar(c.r);
   r.m.uniforms.uTime.value=seconds;r.m.uniforms.uBuild.value=k;
   // ANTECIPAÇÃO: no fim, os seis círculos rangem e relampejam antes da ruptura.
   const danger=st.phase==='seals'?sm((st.pt-5.0)/1.7):
    st.phase==='explosions'?Math.max(.22,1-.33*st.pt):0;
   r.m.uniforms.uCharge.value=danger*(1+.22*Math.sin(seconds*(6+danger*12)+i));
   r.m.uniforms.uAlpha.value=st.phase==='explosions'?
     Math.max(.10,.55-.45*sm(st.pt/2.4)):1;
  }
  safety.position.set(C.x,ground(C.x,C.z)+.16,C.z);safety.scale.setScalar(st.dangerR);
  safetyMat.opacity=st.phase==='aura'?0:st.phase==='seals'?.55+.16*Math.sin(seconds*6):.72;
  const tip=ctx.tip,hasTip=tip&&Number.isFinite(tip.x);
  swordRoot.position.set(hasTip?tip.x:B.x,hasTip?tip.y:B.y+2.6,hasTip?tip.z:B.z);
  swordRoot.visible=st.phase!=='explosions'||st.pt<4.3;
  swordRoot.rotation.y=seconds*.75;swordRoot.rotation.x=Math.sin(seconds*1.1)*.18;
  const power=st.sword,sk=sm(power);
  swordRoot.scale.setScalar(.55+3*sk+Math.sin(seconds*14)*.06*sk);
  charge.uniforms.uTime.value=seconds;charge.uniforms.uPower.value=.35+.65*sk;
  // Correntes de plasma giram ao redor do núcleo da EspadaBispo3.glb,
  // sem substituir a arma por uma esfera branca genérica.
  swordCore.scale.setScalar(.24+.42*sk);glowMat.opacity=.15+.43*sk;
  orbitMat.opacity=.20+.48*sk;
  swordOrbits.forEach((o,i)=>{o.visible=sk>.12;
   o.rotation.set(seconds*(.83+i*.11),seconds*(1.2-i*.07),i*.48);
   o.scale.setScalar(.55+1.05*sk);});
  let peak=0;
  for(let i=0;i<3;i++){
   const vfx=bursts[i],b=st.bursts[i];vfx.group.visible=!!b;if(!b)continue;
   const age=b.age;
   // Lenta compressão (0–.42s), ignição (.42–.78s), expansão (.78–1.48s)
   // e cauda. A forma nasce pequena; nunca surge pronta num quadro.
   const compress=sm(age/.43),ignite=sm((age-.38)/.43);
   const expansion=sm((age-.73)/.82);
   const reach=.025+.08*compress+.18*ignite+.79*expansion;
   const fade=1-sm((age-1.28)/.62);
   const energy=fade*sm((age-.26)/.42);
   const R=st.dangerR;
   vfx.group.position.set(C.x,ground(C.x,C.z)+.05,C.z);
   vfx.kernel.visible=age<.96;
   vfx.kernel.position.y=1.5+2.2*ignite;
   vfx.kernel.scale.setScalar(.4+1.35*compress+.6*ignite);
   vfx.kernel.rotation.set(seconds*.9,seconds*1.7,seconds*.5);
   vfx.kernelMat.opacity=(1-sm((age-.55)/.42))*(.18+.45*compress);
   vfx.ring.scale.setScalar(R*reach);
   vfx.ringMat.opacity=fade*sm((age-.55)/.60)*.20;
   const outerN=low?28:44,innerN=low?16:30;
   vfx.dark.count=outerN;vfx.hot.count=innerN;
   for(let j=0;j<outerN;j++){
    const a=j/outerN*TAU+i*.37;
    const jitter=.79+.32*((j*7)%13)/13;
    const len=R*reach*(.71+.50*((j*17)%19)/19);
    const rise=3+R*(.21+.19*((j*11)%17)/17)*reach;
    // O curso das lâminas oscila em 3D, inclinando cada língua de plasma
    // e evitando o contorno de esfera ou de disco visto de cima.
    p.set(Math.cos(a)*R*reach*.075,.54+(j%4)*.28,Math.sin(a)*R*reach*.075);
    q.setFromAxisAngle(up,-a);
    const tilt=.11+.35*((j*3)%11)/11+.06*Math.sin(age*4+j);
    q.multiply(tiltQ.setFromAxisAngle(tiltAxis,tilt));
    S.set(len*jitter,rise*(.62+.47*((j*5)%11)/11),1.4+reach*3);
    matrix.compose(p,q,S);vfx.dark.setMatrixAt(j,matrix);
   }
   vfx.dark.instanceMatrix.needsUpdate=true;
   for(let j=0;j<innerN;j++){
    const a=(j+.25)/innerN*TAU+i*.44;
    const len=R*reach*(.56+.32*((j*11)%17)/17);
    p.set(Math.cos(a)*reach*.5,.87+(j%4)*.31,Math.sin(a)*reach*.5);
    q.setFromAxisAngle(up,-a);
    q.multiply(tiltQ.setFromAxisAngle(tiltAxis,.2+(j%5)*.055));
    S.set(len,(2.5+R*reach*.22)*(.63+.33*(j%4)/4),.3+reach*1.15);
    matrix.compose(p,q,S);vfx.hot.setMatrixAt(j,matrix);
   }
   vfx.hot.instanceMatrix.needsUpdate=true;
   vfx.darkMat.uniforms.uTime.value=seconds;vfx.darkMat.uniforms.uAge.value=age;
   vfx.darkMat.uniforms.uPower.value=energy*(.63+.27*ignite);
   vfx.hotMat.uniforms.uTime.value=seconds;vfx.hotMat.uniforms.uAge.value=age;
   vfx.hotMat.uniforms.uPower.value=energy*(.25+.35*expansion);
   peak=Math.max(peak,energy*expansion);
  }
  // Pré-ignição: agulhas escarlates nas SEIS alturas, crescendo antes da
  // explosão. Se o jogador se afastar, a borda segura permanece legível.
  const warn=st.phase==='seals'?sm((st.pt-5.25)/1.45):
    st.phase==='explosions'?Math.max(.12,.90-.12*st.pt):0;
  warnSpikes.count=low?24:48;warnMat.opacity=.74*warn;
  for(let i=0;i<warnSpikes.count;i++){
   const a=i/warnSpikes.count*TAU+seconds*.13,level=i%6;
   const radius=st.seals[level].r*(.60+.31*(i%4)/4);
   const yy=ground(C.x,C.z)+U.heights[level];
   p.set(C.x+Math.cos(a)*radius,yy+.36+(i%3)*.17,C.z+Math.sin(a)*radius);
   axis.set(Math.cos(a)*.10,1,Math.sin(a)*.10).normalize();
   q.setFromUnitVectors(up,axis);
   S.set(.15,.30+1.8*warn*(.66+(i%5)*.08),.15);
   matrix.compose(p,q,S);warnSpikes.setMatrixAt(i,matrix);
  }
  warnSpikes.instanceMatrix.needsUpdate=true;
  const n=low?36:72;shards.count=n;
  const explode=st.phase==='explosions',pulse=Math.max(0,...st.bursts.map(b=>1-sm(b.age/1.65)));
  const span=explode?st.dangerR*.82:2.5+glow*3.2;
  for(let i=0;i<n;i++){
   const a=i/n*TAU+seconds*(explode?.14:.46)*(i%2?1:-1);
   const rr=explode?span*(.12+.88*(i%11)/11):span*(.23+.72*(i%13)/13);
   p.set((explode?C.x:B.x)+Math.cos(a)*rr,explode?ground(C.x,C.z)+.6+(i%7)*.28+pulse*(i%5):B.y+1.3+(i%9)*.52+glow*Math.sin(seconds*3+i)*.75,(explode?C.z:B.z)+Math.sin(a)*rr);
   q.setFromAxisAngle(up,a+seconds*(explode?1.4:3.2));
   S.set(.12+(i%3)*.07,(explode?.38:.18)+(.12+.46*glow)*(i%5)/5,.1+(i%4)*.04);
   matrix.compose(p,q,S);shards.setMatrixAt(i,matrix);
  }
  shards.instanceMatrix.needsUpdate=true;
  shardMat.opacity=explode?.3+.55*pulse:.55+.35*glow;
  light.position.set(explode?C.x:B.x,explode?ground(C.x,C.z)+5:B.y+2.6,explode?C.z:B.z);
  light.intensity=1.2*glow+3.4*peak;
 }
 function clear(){holder.visible=false;light.intensity=0;}
 function dispose(){scene.remove(holder);const geos=new Set(),mats=new Set();holder.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)for(const m of [].concat(o.material))mats.add(m);});for(const g of geos)g.dispose();for(const m of mats)m.dispose();}
 clear();return{holder,update,clear,dispose};
}
