/**
 * MOD 274 — direcao de arte do Eclipse de Vorgazhek. So VFX:
 * nao muda a animacao da espada GLB, IA, dano, hitbox, cooldown ou camera.
 */
export const ECLIPSE_SAKUGA_BUILD='274-rasgo-carmesim';
const sat=x=>Math.max(0,Math.min(1,x||0));
const sm=x=>{x=sat(x);return x*x*(3-2*x)};
export function sakugaLevels(st){
 if(!st||st.done||st.aborted||['idle','abort'].includes(st.phase))
   return {wings:0,rift:0,burst:0};
 const p=st.pt||0;
 return {
   wings:st.phase==='charge'?sm((p-.65)/1.4):
     st.phase==='release'?1-sm(Math.max(0,p-.16)/1.35):
     st.phase==='impact'?.28*(1-sm(p/.55)):0,
   rift:st.phase==='release'?sm(p/.19):
     st.phase==='impact'?1-sm(Math.max(0,p-.42)/1.12):0,
   burst:st.phase==='impact'?sm(p/.22)*(1-sm(Math.max(0,p-1.15)/.9)):0
 };
}
const WV=[
 'attribute float aLayer;varying vec2 vUv;varying float vLayer;uniform float time;',
 'void main(){vUv=uv;vLayer=aLayer;vec3 p=position;',
 'float u=uv.x;',
 'p.y+=(sin(u*12.-time*2.5+aLayer*2.)*.23+sin(u*27.+time*3.)*.1)*(.2+.8*u);',
 'p.z+=sin(u*7.+time*1.9+aLayer)*.2;',
 'gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}'
].join('\n');
const WF=[
 'uniform float time,opacity;varying vec2 vUv;varying float vLayer;',
 'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.54);}',
 'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
 'return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}',
 'void main(){vec2 u=vUv;',
 'float a=n(vec2(u.x*9.-time*.5,u.y*5.+vLayer*4.));',
 'float b=n(vec2(u.x*26.+time,u.y*13.-time));',
 'float e=min(u.y,1.-u.y);',
 'float alpha=opacity*smoothstep(.015,.14,e+(.07*a+.05*b-.06))*',
 'smoothstep(0.,.07,u.x)*(1.-smoothstep(.91,1.,u.x));',
 'vec3 c=mix(vec3(.015,.006,.025),vec3(.19,.008,.38),smoothstep(.3,.75,a)*.75);',
 'c=mix(c,vec3(.92,.014,.04),(1.-smoothstep(0.,.22,e))*.9);',
 'c+=vec3(.35,.015,.12)*smoothstep(.65,.87,b)*.6;',
 'if(alpha<.02)discard;gl_FragColor=vec4(c,alpha);}'
].join('\n');
const RV='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const RF=[
 'uniform float time,opacity;varying vec2 vUv;',
 'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.54);}',
 'void main(){vec2 p=vUv*2.-1.;float yy=abs(p.y);',
 'float halfW=(.24+.3*pow(1.-yy,1.4))*(1.-smoothstep(.78,1.,yy)*.85);',
 'float warp=.07*sin(p.y*16.-time*2.)+.027*(h(floor(p*vec2(7.,28.))+floor(time*8.))-.5);',
 'float d=abs(p.x-warp);float mask=1.-smoothstep(halfW-.04,halfW+.05,d);',
 'float hot=1.-smoothstep(halfW*.35,halfW*.92,d);',
 'float core=1.-smoothstep(halfW*.12,halfW*.47,d);',
 'vec3 c=mix(vec3(.027,.005,.035),vec3(.94,.017,.028),hot);',
 'c=mix(c,vec3(1.,.97,.96),core);',
 'float a=opacity*mask*(1.-smoothstep(.92,1.01,yy));',
 'if(a<.015)discard;gl_FragColor=vec4(c,a);}'
].join('\n');
const LV='attribute float sideColor;varying float vC;void main(){vC=sideColor;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const LF='uniform float opacity;varying float vC;void main(){gl_FragColor=vec4(mix(vec3(1.,.06,.18),vec3(1.,1.,1.),vC),opacity);}';
function wingGeo(T,sign,layer){
 const pos=[],uv=[],l=[],ix=[],N=25,M=6;
 for(let i=0;i<=N;i++){
  const u=i/N,dist=.35+u*(layer?12:15);
  const arch=1.7*Math.sin(u*Math.PI*.85)+u*(layer?1.2:2.4);
  for(let j=0;j<=M;j++){
   const v=j/M,base=-.8+arch-.9*u,span=(layer?3.2:4.7)*(1-.2*u);
   pos.push(sign*dist,base+span*v+.3*v*v*Math.sin(u*10+layer),-layer*.28);
   uv.push(u,v);l.push(layer);
   if(i<N&&j<M){const a=i*(M+1)+j,b=a+M+1;ix.push(a,b,a+1,a+1,b,b+1);}
  }
 }
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
 g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 g.setAttribute('aLayer',new T.Float32BufferAttribute(l,1));g.setIndex(ix);return g;
}
function arcGeo(T){
 const pos=new Float32Array(15*2*3),u=[];
 const ix=[];
 for(let i=0;i<15;i++){u.push(0,1);if(i<14){const j=i*2;ix.push(j,j+1,j+2,j+1,j+3,j+2);}}
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));
 g.setAttribute('sideColor',new T.Float32BufferAttribute(u,1));g.setIndex(ix);return g;
}
export function createEclipseSakugaVFX(T,parent){
 const root=new T.Group();root.name='VorgazhekSakuga274';parent.add(root);
 const geos=[],mats=[],time={value:0},wAlpha={value:0},rAlpha={value:0},lAlpha={value:0};
 const shader=(vertexShader,fragmentShader,uniforms,blending=T.NormalBlending)=>{
  const m=new T.ShaderMaterial({vertexShader,fragmentShader,uniforms,transparent:true,
   depthWrite:false,depthTest:true,side:T.DoubleSide,blending,toneMapped:false,fog:false});
  mats.push(m);return m;
 };
 const wings=new T.Group();wings.name='AsasRubroNegras';root.add(wings);
 const wm=shader(WV,WF,{time,opacity:wAlpha});
 for(const side of [-1,1])for(let layer=0;layer<2;layer++){
  const g=wingGeo(T,side,layer);geos.push(g);
  const mesh=new T.Mesh(g,wm);mesh.frustumCulled=false;mesh.renderOrder=5;wings.add(mesh);
 }
 const rg=new T.PlaneGeometry(1,1);geos.push(rg);
 const rift=new T.Mesh(rg,shader(RV,RF,{time,opacity:rAlpha}));
 rift.name='FendaBrancoCarmesim';rift.renderOrder=6;rift.visible=false;rift.frustumCulled=false;root.add(rift);
 const arcs=[],lm=shader(LV,LF,{opacity:lAlpha},T.AdditiveBlending);
 for(let i=0;i<3;i++){
   const g=arcGeo(T);geos.push(g);const m=new T.Mesh(g,lm);
   m.name='RaioRubro'+i;m.visible=false;m.renderOrder=7;m.frustumCulled=false;root.add(m);arcs.push(m);
 }
 const stoneG=new T.BoxGeometry(1,1,1);geos.push(stoneG);
 const stoneM=new T.MeshStandardMaterial({color:0x1a0b13,roughness:.9,
  emissive:0x4a0710,emissiveIntensity:.3});mats.push(stoneM);
 const debris=new T.InstancedMesh(stoneG,stoneM,24);
 debris.name='EntulhoRuptura';debris.frustumCulled=false;debris.count=0;root.add(debris);
 const forward=new T.Vector3(),p=new T.Vector3(),sc=new T.Vector3(),q=new T.Quaternion(),
  mat=new T.Matrix4(),up=new T.Vector3(0,1,0);
 const stats={visible:false,wings:0,rift:0,debris:0};
 function clear(){wings.visible=false;rift.visible=false;debris.count=0;
  for(const a of arcs)a.visible=false;stats.visible=false;stats.wings=stats.rift=stats.debris=0;}
 function update(seq,ctx,dt=0){
  time.value+=Math.max(0,Math.min(.08,dt||0));
  const st=seq?.st,B=ctx?.boss,C=ctx?.camera,low=!!ctx?.low;
  const levels=sakugaLevels(st);
  if(!B||!C||(!levels.wings&&!levels.rift&&!levels.burst)){clear();return;}
  stats.visible=true;stats.wings=levels.wings;stats.rift=levels.rift;
  wings.visible=levels.wings>.015;
  if(wings.visible){
   C.getWorldDirection(forward);
   wings.position.set(B.x+forward.x*2.1,B.y+4.8,B.z+forward.z*2.1);
   wings.quaternion.copy(C.quaternion);
   wings.scale.setScalar(.64+.36*sm((st.t-.65)/1.3));
   wAlpha.value=levels.wings;
  }
  const I=st.impact,s=st.slash;
  const at=s||I||{x:B.x,y:B.y+4,z:B.z};
  rift.visible=levels.rift>.015;
  if(rift.visible){
   rift.position.set(at.x,at.y+(I?4.5:3.8),at.z);
   rift.quaternion.copy(C.quaternion);
   rift.scale.set(I?7+7*sm(st.pt/.34):3.5+3*sm((st.pt-.18)/.4),
                  I?13+16*sm(st.pt/.34):16+8*sm((st.pt-.2)/.4),1);
   rAlpha.value=levels.rift;
  }
  lAlpha.value=levels.burst;
  for(let i=0;i<arcs.length;i++){
   const a=arcs[i];a.visible=!!I&&levels.burst>.05&&(!low||i<2);
   if(!a.visible)continue;
   const attr=a.geometry.attributes.position,side=i===0?-1:i===1?1:-.6;
   for(let j=0;j<15;j++){
    const u=j/14,k=Math.sin(j*6.7+i*2.8+Math.floor(st.pt*18));
    const x=I.x+side*(2.4+u*(3.2+i*1.4))+.45*k,y=I.y+.2+u*(8.5+i),z=I.z+.65*Math.sin(u*9+i);
    const w=.055*(1-.4*u);attr.setXYZ(j*2,x-w,y,z);attr.setXYZ(j*2+1,x+w,y,z);
   }
   attr.needsUpdate=true;
  }
  debris.count=0;
  if(I&&levels.burst>.02)for(let i=0;i<(low?10:24);i++){
   const angle=i*2.39996,r=.8+Math.sqrt((i+1)/24)*7,seed=.5+.5*Math.sin(i*11.43);
   const y=st.pt*(4.5+5*seed)-4.9*st.pt*st.pt;
   if(y<-.5)continue;
   const outward=.4+.6*sm(st.pt/.65);
   p.set(I.x+Math.cos(angle)*r*outward,I.y+.3+y,I.z+Math.sin(angle)*r*outward);
   q.setFromAxisAngle(up,angle+st.pt*(.8+seed));const z=.18+.5*seed;
   sc.set(z,z*(.8+seed),z*.8);mat.compose(p,q,sc);debris.setMatrixAt(debris.count++,mat);
  }
  debris.instanceMatrix.needsUpdate=true;stats.debris=debris.count;
 }
 clear();
 return {root,update,clear,stats:()=>({...stats}),
   dispose(){clear();parent.remove(root);for(const g of geos)g.dispose();for(const m of mats)m.dispose();}
 };
}
