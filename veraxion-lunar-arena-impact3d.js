/**
 * MOD 289 · A onda do impacto planetário chega fisicamente à arena de VÉRAXION.
 * Um único evento de 2.6 s: núcleo de fogo → anel de pressão → estilhaços → fumaça.
 * Pools de instâncias sem criar partículas por quadro; respeita qualidade low.
 */
export const LUNAR_ARENA_BUILD='289-shockwave-dimension';
const clamp = x => Math.max(0,Math.min(1,x));
const ease = x => {x=clamp(x);return x*x*(3-2*x);};
const hash = x => {const n=Math.sin(x*127.1+41.5)*43758.5453;return n-Math.floor(n);};

export function createLunarArenaImpact(T,scene,{low=false}={}){
  const root=new T.Group();root.name='LunarDevoradorImpactoDimension';scene.add(root);
  const geos=[],mats=[],v3=new T.Vector3(),q=new T.Quaternion(),m4=new T.Matrix4(),up=new T.Vector3(0,1,0);
  const G=x=>(geos.push(x),x), M=x=>(mats.push(x),x);
  const groundVS=[
    'varying vec2 vUv;',
    'void main(){vUv=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'
  ].join('\n');
  const groundFS=[
    'uniform float uT,uA; varying vec2 vUv;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}',
    'void main(){float r=length(vUv),a=atan(vUv.y,vUv.x);',
    'float veins=n(vec2(a*17.,r*28.)), jag=(n(vec2(a*41.,uT*.2))-.5)*.035;',
    'float shock=.17+.7*smoothstep(0.,1.7,uT);',
    'float ring=exp(-pow((r-shock-jag)*47.,2.));',
    'float second=exp(-pow((r-shock*.66-(veins-.5)*.026)*65.,2.))*.5;',
    'float fissure=pow(max(0.,cos(a*19.+n(vec2(a*3.,4.))*2.)),32.)*smoothstep(.07,.21,r)*(1.-smoothstep(.5,1.,r));',
    'float embers=pow(n(vec2(a*49.,r*60.-uT*5.)),7.)*smoothstep(.05,.25,r)*(1.-smoothstep(shock*.86,shock,r));',
    'float core=exp(-r*r*150.)*(1.-smoothstep(.35,.8,uT));',
    'vec3 c=vec3(.55,.025,.01)*(fissure*.85)+vec3(1.,.34,.035)*ring+vec3(1.,.8,.42)*second+vec3(1.,.2,.055)*embers;',
    'c+=vec3(1.,.95,.8)*core;float alpha=uA*clamp(ring*.95+second*.85+fissure*.4+embers*.26+core,0.,1.);',
    'if(alpha<.008)discard;gl_FragColor=vec4(c,alpha);}'
  ].join('\n');
  const waveU={uT:{value:0},uA:{value:0}};
  const ground=new T.Mesh(G(new T.PlaneGeometry(2,2).rotateX(-Math.PI/2)),M(new T.ShaderMaterial({
    vertexShader:groundVS,fragmentShader:groundFS,transparent:true,depthWrite:false,depthTest:true,
    blending:T.AdditiveBlending,toneMapped:false,uniforms:waveU,side:T.DoubleSide
  })));
  ground.scale.setScalar(41);ground.position.y=.13;ground.renderOrder=11;root.add(ground);
  const shellVS=[
    'varying vec3 vP,vN;',
    'void main(){vP=position;vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'
  ].join('\n');
  const shellFS=[
    'uniform float uT,uA;varying vec3 vP,vN;',
    'float h(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}',
    'float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1.,0.,0.)),f.x),mix(h(i+vec3(0.,1.,0.)),h(i+vec3(1.,1.,0.)),f.x),f.y),mix(mix(h(i+vec3(0.,0.,1.)),h(i+vec3(1.,0.,1.)),f.x),mix(h(i+vec3(0.,1.,1.)),h(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}',
    'void main(){float noise=n(vP*7.+vec3(0.,-uT*3.,0.))*.55+n(vP*17.-uT*1.9)*.45;',
    'float heat=pow(max(.0,1.-vP.y),.6);float burning=clamp(noise*.75+heat*.72,0.,1.);',
    'vec3 c=mix(vec3(.26,.016,.014),vec3(1.,.18,.025),smoothstep(.3,.67,burning));',
    'c=mix(c,vec3(1.,.88,.39),smoothstep(.63,.98,burning));',
    'float edge=pow(1.-abs(normalize(vN).y),1.5);float alpha=uA*(.25+.65*noise)*(.55+.45*edge);',
    'if(alpha<.01)discard;gl_FragColor=vec4(c,alpha);}'
  ].join('\n');
  const plumeU={uT:{value:0},uA:{value:0}};
  const plumeG=G(new T.SphereGeometry(1,low?16:24,low?10:16,0,Math.PI*2,0,Math.PI/2));
  const dome=new T.Mesh(plumeG,M(new T.ShaderMaterial({
    vertexShader:shellVS,fragmentShader:shellFS,uniforms:plumeU,transparent:true,depthWrite:false,
    blending:T.AdditiveBlending,toneMapped:false,side:T.DoubleSide
  })));
  dome.renderOrder=10;root.add(dome);
  const core=new T.Mesh(plumeG,M(new T.MeshBasicMaterial({
    color:0xffa329,transparent:true,opacity:0,blending:T.AdditiveBlending,
    depthWrite:false,toneMapped:false,side:T.DoubleSide
  })));
  core.renderOrder=9;root.add(core);
  const shockRings=[];
  for(let i=0;i<3;i++){
    const mm=M(new T.MeshBasicMaterial({color:[0xffefc9,0xff6a23,0x862141][i],transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
    const obj=new T.Mesh(G(new T.TorusGeometry(1,.035+i*.038,6,low?64:110)),mm);
    obj.rotation.x=Math.PI/2;obj.position.y=.24+i*.1;obj.renderOrder=12+i;root.add(obj);shockRings.push(obj);
  }
  const smokeG=G(new T.IcosahedronGeometry(1,1)),smokeMat=M(new T.MeshBasicMaterial({color:0x1c101d,transparent:true,opacity:0,depthWrite:false}));
  const SN=low?18:42,smoke=new T.InstancedMesh(smokeG,smokeMat,SN);smoke.instanceMatrix.setUsage(T.DynamicDrawUsage);smoke.frustumCulled=false;smoke.renderOrder=15;root.add(smoke);
  const debrisG=G(new T.TetrahedronGeometry(1,0)),debrisMat=M(new T.MeshBasicMaterial({color:0x4d2734,transparent:true,opacity:0,depthWrite:false}));
  const DN=low?16:38,debris=new T.InstancedMesh(debrisG,debrisMat,DN);debris.instanceMatrix.setUsage(T.DynamicDrawUsage);debris.frustumCulled=false;root.add(debris);
  const flashVS=['varying vec2 vUv;','void main(){vUv=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'].join('\n');
  const flashFS=[
    'uniform float uA,uT;varying vec2 vUv;void main(){float r=length(vUv),a=atan(vUv.y,vUv.x);',
    'float star=pow(max(0.,cos(a*8.)),32.)*exp(-r*2.5);float core=exp(-r*r*24.);',
    'float thin=exp(-abs(vUv.y)*30.)*exp(-abs(vUv.x)*1.7);',
    'float alpha=uA*clamp(core+star*.8+thin*.4,0.,1.)*(1.-smoothstep(.65,1.,r));',
    'if(alpha<.004)discard;gl_FragColor=vec4(mix(vec3(1.,.35,.045),vec3(1.,.97,.78),core),alpha);}'
  ].join('\n');
  const flashU={uA:{value:0},uT:{value:0}};
  const flash=new T.Mesh(G(new T.PlaneGeometry(1,1)),M(new T.ShaderMaterial({
    vertexShader:flashVS,fragmentShader:flashFS,transparent:true,depthWrite:false,depthTest:false,
    blending:T.AdditiveBlending,toneMapped:false,uniforms:flashU
  })));
  flash.renderOrder=18;root.add(flash);
  let pos=new T.Vector3(),active=false;
  function reset(x,y,z){pos.set(x,y,z);root.position.copy(pos);active=true;root.visible=true;}
  function update(age,camera,reduced=false) {
    if(!active)return;
    if(age>3.2){clear();return;}const a=Math.max(0,age),burst=ease(a/.35);
    waveU.uT.value=a;waveU.uA.value=(1-ease((a-1.8)/1.25))*.92;
    dome.scale.set(1+19*ease(a/.66),.2+14*ease(a/.85),1+19*ease(a/.66));
    plumeU.uT.value=a;plumeU.uA.value=(1-ease((a-1.25)/1.75))*.88;
    core.scale.set(1+9*ease(a/.23),.2+7*ease(a/.25),1+9*ease(a/.23));
    core.material.opacity=(1-ease((a-.09)/.42))*.72;
    for(let i=0;i<shockRings.length;i++){
      const s=shockRings[i],delay=i*.115,age2=Math.max(0,a-delay);
      const radius=1+(i===0?34:i===1?24:16)*ease(age2/(.8+i*.24));
      s.scale.setScalar(radius);
      s.material.opacity=a<delay?0:(1-ease((age2-.25)/(1.35+i*.2)))*(.86-i*.16);
      s.rotation.z=a*(i%2?-.35:.26);
    }
    smokeMat.opacity=.57*(1-ease((a-1.5)/1.55))*ease(a/.38);
    for(let i=0;i<SN;i++){
      const ang=hash(i+3)*Math.PI*2, radius=(4+hash(i+9)*21)*ease(a/.9);
      const rise=(.65+hash(i+19)*1.3)*Math.min(a,2.5)*4;
      v3.set(Math.cos(ang)*radius,rise+hash(i+6)*3,Math.sin(ang)*radius);
      q.setFromAxisAngle(up,a*.2*hash(i+2));
      const size=(1.8+hash(i+13)*3.4)*(.5+.6*ease(a/.5));
      m4.compose(v3,q,new T.Vector3(size,size*.64,size));smoke.setMatrixAt(i,m4);
    }smoke.instanceMatrix.needsUpdate=true;
    debrisMat.opacity=(1-ease((a-1)/1.6))*.9;
    for(let i=0;i<DN;i++){
      const ang=hash(i*7+1)*Math.PI*2,vel=5+hash(i+24)*18;
      const r=vel*a*(1-.18*ease(a/2));
      v3.set(Math.cos(ang)*r,Math.max(0,(5+hash(i+17)*6)*a-8*a*a),Math.sin(ang)*r);
      q.setFromAxisAngle(up, a*(1+hash(i+4)*5));
      const size=.28+hash(i+7)*.9;
      m4.compose(v3,q,new T.Vector3(size,size*2.5,size));debris.setMatrixAt(i,m4);
    }debris.instanceMatrix.needsUpdate=true;
    flashU.uA.value=1.1*(1-ease(a/(reduced?.18:.32)));
    flashU.uT.value=a;flash.position.set(0,4,0);flash.quaternion.copy(camera.quaternion);
    flash.scale.setScalar(7+25*ease(a/.3));
    if(a>2.8)root.visible=false;
  }
  function clear(){active=false;root.visible=false;}
  function dispose(){clear();scene.remove(root);for(const gg of geos)gg.dispose();for(const mm of mats)mm.dispose();}
  root.visible=false;
  return {root,reset,update,clear,dispose};
}
