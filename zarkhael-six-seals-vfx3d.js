/**
 * MOD 280 — VFX especializado da ultimate do Bispo 3, WebGL1 compatível.
 * Círculos procedurais com glifos/hexagramas/linhas, aura advectada do corpo,
 * núcleo da espada GLB original e 3 cúpulas de plasma com formação progressiva.
 * Geometrias reutilizadas, shaders com uniforms e estilhaços instanciados.
 */
export const ZARK_ULT_VFX_BUILD='280-six-seals-sakuga-cinematic-refino';
const PI=Math.PI,TAU=2*PI,clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),
 sm=v=>{v=clamp(v);return v*v*(3-2*v);};
const VERT='varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const SEAL_FRAG=[
 'uniform float uTime,uBuild,uCharge,uAlpha,uSeed;varying vec2 vU;',
 'float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/max(.001,dot(ba,ba)),0.,1.));}',
 'float line(float d,float w){return 1.-smoothstep(w,w+.005,d);}',
 'float ring(float r,float R,float w){return 1.-smoothstep(w,w+.006,abs(r-R));}',
 'void main(){vec2 p=vU*2.-1.;float r=length(p);if(r>1.02)discard;',
 'float a=atan(p.y,p.x),an=fract(a/6.2831853+.5);',
 'float draw=1.-smoothstep(uBuild-.025,uBuild+.022,an);',
 'float gear=abs(sin(a*24.+uSeed*4.))*.009;',
 'float outer=ring(r,.973+gear,.008);',
 'float rails=ring(r,.902,.0035)+ring(r,.840,.005)+ring(r,.735,.0035);',
 'float eye=ring(r,.590,.006)+ring(r,.54,.003);',
 'float grid=max(line(abs(p.x),.005),line(abs(p.y),.005))*step(r,.77);',
 'float spokes=(1.-smoothstep(.009,.023,abs(sin(a*12.))))*step(.59,r)*step(r,.91);',
 'float runes=(1.-smoothstep(.12,.20,abs(sin(a*56.+uSeed*11.))))*(1.-smoothstep(.014,.025,abs(r-.792)))*.8;',
 'float star=0.;',
 'for(int i=0;i<6;i++){float t=float(i)*1.04719755,tt=float(i+2)*1.04719755;',
 'star=max(star,line(seg(p,vec2(cos(t),sin(t))*.68,vec2(cos(tt),sin(tt))*.68),.004));}',
 'float spokesGlow=outer*.95+rails*.7+eye*.65+grid*.23+spokes*.75+runes+.50*star;',
 'float core=ring(r,.09,.01)+ring(r,.16,.004);',
 'float mid=clamp(spokesGlow+core,0.,1.)*draw;',
 'float gold=clamp(outer*.95+runes*.8+core*.7+uCharge*.2,0.,1.);',
 'vec3 crimson=vec3(.86,.012,.055),ember=vec3(1.,.33,.025),hot=vec3(1.,.92,.62);',
 'float flare=.83+.17*sin(uTime*3.8+r*26.+uSeed);',
 'vec3 col=mix(crimson,ember,gold*.8);col=mix(col,hot,clamp(core*.65+outer*.34+uCharge*.35,0.,1.));',
 'float alpha=clamp(mid*(.7+.65*uCharge)*flare*uAlpha,0.,1.);',
 'if(alpha<.018)discard;gl_FragColor=vec4(col,alpha);}'
].join('\n');
const AURA_VERT=[
 'uniform float uTime,uPower,uSeed;varying vec2 vU;',
 'void main(){vU=uv;vec3 p=position;',
 'float f=sin(vU.y*12.+uTime*2.3+uSeed*4.)*.30+sin(vU.y*27.-uTime*4.2+uSeed*9.)*.13;',
 'p.x+=(f+sin(uTime*.7+uSeed*6.)*.19)*(.5+vU.y*.95);',
 'p.z+=sin(vU.y*18.-uTime*3.5+uSeed)*(.15+.43*vU.y);',
 'p.y+=sin(vU.y*7.+uTime*1.4+uSeed)*.14*uPower;',
 'gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}'
].join('\n');
const AURA_FRAG=[
 'uniform float uTime,uPower,uSeed;varying vec2 vU;',
 'void main(){float v=vU.y,u=vU.x;',
 'float flow=sin(v*18.-uTime*4.+uSeed*5.)*.11+sin(v*37.+uTime*7.)*.045;',
 'float width=.21+.19*v+.15*sin(v*5.+uSeed);',
 'float body=1.-smoothstep(width*.58,width,abs(u-.5+flow));',
 'float core=1.-smoothstep(.04,.15,abs(u-.5+flow*.45));',
 'float height=smoothstep(0.,.12,v)*(1.-smoothstep(.84,1.,v));',
 'float crack=pow(max(0.,sin(v*56.+uSeed*11.+uTime*6.)),17.);',
 'vec3 col=mix(vec3(.25,.001,.028),vec3(.95,.012,.05),body*.8+crack*.3);',
 'col=mix(col,vec3(1.,.38,.17),core*.85);',
 'float alpha=height*(body*.65+core*.48+crack*.10)*uPower;',
 'if(alpha<.015)discard;gl_FragColor=vec4(col,clamp(alpha,0.,1.));}'
].join('\n');
const DOME_VERT='varying vec2 vUv;varying vec3 vPos;void main(){vUv=uv;vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const DOME_FRAG=[
 'uniform float uTime,uAge,uAlpha,uPulse;varying vec2 vUv;varying vec3 vPos;',
 'float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
 'float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);}',
 'void main(){float x=atan(vPos.z,vPos.x),h=clamp(vPos.y,0.,1.);',
 'float corr=noise2(vec2(x*5.1+uTime*.6,h*9.-uTime*2.8));',
 'float veins=pow(max(0.,sin(x*19.+h*42.+uTime*8.+corr*6.)),10.);',
 'float tear=sin(x*11.+h*10.-uTime*4.)*.085+sin(x*28.-h*26.+uTime*6.)*.038;',
 'float silhouette=1.-smoothstep(.86+tear,.98+tear,h);',
 'float core=pow(max(0.,1.-h),6.)*(.7+.3*sin(uAge*13.));',
 'float ringGlow=pow(max(0.,sin(h*24.-uAge*9.)),12.)*.55;',
 'float fire=.27+pow(corr,1.4)*.65+veins*.8+ringGlow;',
 'vec3 cold=vec3(.31,.001,.028),crimson=vec3(1.,.018,.071),hot=vec3(1.,.36,.025),white=vec3(1.,.92,.64);',
 'vec3 c=mix(cold,crimson,clamp(fire*.9+core*.45,0.,1.));',
 'c=mix(c,hot,clamp(fire*.52+veins*.26,0.,1.));',
 'c=mix(c,white,clamp(veins*.45+core*.68,0.,1.));',
 'float alpha=clamp((.49+fire*.5+core*.24)*silhouette*uAlpha,0.,1.);',
 'if(alpha<.025)discard;gl_FragColor=vec4(c,alpha);}'
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
 for(let i=0;i<10;i++){
  const a=i/10*TAU,geometry=new THREE.PlaneGeometry(1.2,1,1,26);
  geometry.translate(0,.5,0);
  const m=mat(THREE,AURA_FRAG,{uTime:0,uPower:0,uSeed:i/10},AURA_VERT);
  const mesh=new THREE.Mesh(geometry,m);mesh.rotation.y=a;mesh.position.set(Math.cos(a)*.82,0,Math.sin(a)*.82);
  mesh.scale.set(1,7.8,1);mesh.frustumCulled=false;aura.add(mesh);ribbons.push({mesh,m});
 }
 const swordRoot=new THREE.Group();holder.add(swordRoot);
 const charge=mat(THREE,CHARGE_FRAG,{uTime:0,uPower:0});
 for(let i=0;i<3;i++){
  const sheet=new THREE.Mesh(new THREE.PlaneGeometry(4.6,4.6),charge);
  sheet.rotation.y=i*TAU/3;sheet.renderOrder=31;swordRoot.add(sheet);
 }
 const glowMat=new THREE.MeshBasicMaterial({color:0xffd8ac,transparent:true,opacity:.4,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const swordCore=new THREE.Mesh(new THREE.IcosahedronGeometry(.3,2),glowMat);swordRoot.add(swordCore);
 const bursts=[];
 for(let i=0;i<3;i++){
  const group=new THREE.Group();holder.add(group);
  const domeMaterial=mat(THREE,DOME_FRAG,{uTime:0,uAge:0,uAlpha:0,uPulse:i},DOME_VERT);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,48,24,0,TAU,0,PI/2),domeMaterial);
  dome.frustumCulled=false;dome.renderOrder=42+i;group.add(dome);
  const ringMat=new THREE.MeshBasicMaterial({color:i===1?0xff6c22:0xff314b,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  const wave=new THREE.Mesh(new THREE.TorusGeometry(1,.085,7,96),ringMat);wave.rotation.x=PI/2;wave.position.y=.5;group.add(wave);
  // Véu translúcido do plasma: casca larga entre o centro branco e as fissuras escuras.
  // A geometria aparece só durante o crescimento real, sem sprites de fumaça.
  const veilMat=new THREE.MeshBasicMaterial({color:i===1?0xff3212:0xb30528,transparent:true,opacity:0,
   depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  const veil=new THREE.Mesh(new THREE.SphereGeometry(1,32,20,0,TAU,0,PI/2),veilMat);
  veil.renderOrder=40+i;group.add(veil);
  const kernelMat=new THREE.MeshBasicMaterial({color:0xffefd6,transparent:true,opacity:0,
   depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  const kernel=new THREE.Mesh(new THREE.IcosahedronGeometry(1,2),kernelMat);
  kernel.renderOrder=45+i;group.add(kernel);
  const railMat=new THREE.MeshBasicMaterial({color:0xf50843,transparent:true,opacity:0,
   depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  const rail=new THREE.Mesh(new THREE.TorusGeometry(1,.1,8,96),railMat);
  rail.rotation.x=PI/2;rail.position.y=1.1;group.add(rail);
  bursts.push({group,dome,domeMaterial,wave,ringMat,veil,veilMat,kernel,kernelMat,rail,railMat});
 }
 const shardMat=new THREE.MeshBasicMaterial({color:0x3b001a,transparent:true,opacity:.85,side:THREE.DoubleSide});
 const shards=new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1,0),shardMat,72);
 shards.frustumCulled=false;holder.add(shards);
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new THREE.Vector3(),S=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
 const light=new THREE.PointLight(0xff3b21,0,110,1.5);holder.add(light);light.castShadow=false;
 let seconds=0;
 function update(skill,ctx={},dt=0){
  if(!skill||skill.done){clear();return;}
  const st=skill.st,U=skill.U,C=st.center,B=ctx.boss||st.boss,low=!!ctx.low,ground=ctx.ground||(()=>C.y);
  seconds+=Math.max(0,dt);holder.visible=true;
  const glow=st.phase==='aura'?st.aura:1;
  aura.position.set(B.x,B.y,B.z);
  aura.scale.setScalar(.45+.55*glow);
  ribbons.forEach((r,i)=>{r.m.uniforms.uTime.value=seconds;r.m.uniforms.uPower.value=glow*(.7+.25*Math.sin(seconds*2+i));
   r.mesh.rotation.y=i/10*TAU+seconds*(i%2?-.09:.11);
  });
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
   r.m.uniforms.uCharge.value=st.phase==='explosions'?1+Math.sin(seconds*9+i)*.18:Math.max(0,(st.pt-4.1)/U.seals);
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
  swordCore.scale.setScalar(.6+.65*sk);glowMat.opacity=.35+.55*sk;
  let peak=0;
  for(let i=0;i<3;i++){
   const vfx=bursts[i],b=st.bursts[i];vfx.group.visible=!!b;if(!b)continue;
   const age=b.age,pre=sm(age/.45),form=sm((age-.38)/.52),open=sm((age-.64)/.9);
   const fade=1-sm((age-1.1)/.85),growth=.02+.07*pre+.23*form+.70*open;
   vfx.group.position.set(C.x,ground(C.x,C.z)+.045,C.z);
   vfx.dome.scale.set(st.dangerR*growth,1.2+11.8*growth,st.dangerR*growth);
   vfx.veil.scale.set(st.dangerR*growth*.96,1.45+13.2*growth,st.dangerR*growth*.96);
   vfx.veilMat.opacity=fade*(.25+.38*form);
   vfx.kernel.scale.setScalar(.42+2.5*(.12*pre+.88*form)); // núcleo pequeno; plasma vermelho domina o quadro
   vfx.kernel.position.y=1.25+4.5*form;
   vfx.kernelMat.opacity=fade*(.38+.40*pre);
   vfx.rail.scale.setScalar(st.dangerR*(.07+.93*open));
   vfx.rail.position.y=1.0+4*open;
   vfx.railMat.opacity=fade*(.12+.68*open);
   vfx.domeMaterial.uniforms.uTime.value=seconds;vfx.domeMaterial.uniforms.uAge.value=age;
   vfx.domeMaterial.uniforms.uAlpha.value=fade*(.65+.35*form);
   vfx.wave.scale.setScalar(st.dangerR*growth);
   vfx.ringMat.opacity=fade*sm((age-.44)/.65)*.88;peak=Math.max(peak,fade*open);
  }
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
  light.intensity=2.2*glow+6.6*peak;
 }
 function clear(){holder.visible=false;light.intensity=0;}
 function dispose(){scene.remove(holder);const geos=new Set(),mats=new Set();holder.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)for(const m of [].concat(o.material))mats.add(m);});for(const g of geos)g.dispose();for(const m of mats)m.dispose();}
 clear();return{holder,update,clear,dispose};
}
