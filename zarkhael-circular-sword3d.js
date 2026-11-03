/**
 * Mod 278 — ZAR'KHAEL: SENTENÇA OMNIDIRECIONAL.
 * Um relógio determinístico rege aura, carga lateral, giro, expansão radial
 * e três detonações. Geometrias instanciadas + shaders compactos, sem fumaça.
 */
export const ZARK_SWORD_BUILD='278-sentenca-omnidirecional-nucleo-triplos-impactos';
export const ZS=Object.freeze({aura:.78,charge:2.25,spin:.88,range:23,speed:15.5,width:.8,heroRadius:.43,burstGap:.22,bursts:3,afterBurst:.96,damage:22});
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
export function createZarkhaelCircularSword(opts={}){
 const T={...ZS,...opts.T},st={phase:'idle',t:0,boss:{x:0,y:0,z:0},radius:0,spin:0,charge:0,impact:null,bursts:0,hits:0,aborted:false,done:false,release:false};
 const releaseAt=T.aura+T.charge+T.spin,spinAt=T.aura+T.charge;
 function explode(kind,r,events){
   st.phase='detonate';st.impact={kind,r,t:st.t};st.radius=r;
   events.push({type:'impact',kind,r,x:st.boss.x,z:st.boss.z});
 }
 const api={T,st,get done(){return st.done;},get holdBoss(){return st.phase!=='idle'&&!st.done;},
  start(boss){Object.assign(st,{phase:'aura',t:0,boss:{x:boss.x,y:boss.y,z:boss.z},radius:0,spin:0,charge:0,impact:null,bursts:0,hits:0,aborted:false,done:false,release:false});return api;},
  abort(){if(st.done||st.phase==='idle')return;st.phase='abort';st.aborted=true;st.impact={kind:'abort',r:st.radius,t:st.t};},
  /** hero={x,y,z,iframes}, context={ground}, dt em segundos. Não afeta animação nem empurra o herói. */
  step(dt,hero){
   const events=[];if(st.done||st.phase==='idle')return events;dt=Math.max(0,Math.min(.15,Number(dt)||0));const before=st.t;st.t+=dt;
   if(st.aborted){if(st.t-st.impact.t>=.28){st.done=true;st.phase='done';events.push({type:'end',aborted:true});}return events;}
   if(st.impact){
    const age=st.t-st.impact.t;
    while(st.bursts<T.bursts&&age>=st.bursts*T.burstGap){st.bursts++;events.push({type:'burst',n:st.bursts,r:st.impact.r,kind:st.impact.kind});}
    if(age>(T.bursts-1)*T.burstGap+T.afterBurst){st.phase='done';st.done=true;events.push({type:'end',aborted:false});}
    return events;
   }
   if(st.t<T.aura){st.phase='aura';return events;}
   if(before<T.aura)events.push({type:'charge'});
   if(st.t<spinAt){st.phase='charge';st.charge=ease((st.t-T.aura)/T.charge);return events;}
   st.charge=1;
   if(before<spinAt)events.push({type:'spin'});
   if(st.t<releaseAt){st.phase='spin';st.spin=ease((st.t-spinAt)/T.spin)*Math.PI*2;return events;}
   st.spin=Math.PI*2;
   if(!st.release){st.release=true;events.push({type:'release'});}
   st.phase='wave';
   const old=st.radius;st.radius=clamp((st.t-releaseAt)*T.speed,0,T.range);
   const d=Math.hypot((hero?.x??9999)-st.boss.x,(hero?.z??9999)-st.boss.z);
   const onFloor=!hero||!Number.isFinite(hero.y)||Math.abs(hero.y-st.boss.y)<=3.3;
   // Varredura contínua de raio, evita atravessar o jogador entre quadros.
   if(hero&&onFloor&&!hero.iframes&&d<=st.radius+T.width+T.heroRadius&&d>=Math.max(0,old-T.width-T.heroRadius)){
     st.hits=1;explode('hero',Math.min(T.range,Math.max(.35,d)),events);
     events.push({type:'hit',damage:opts.damage??T.damage});
   }else if(st.radius>=T.range){explode('range',T.range,events);}
   if(st.impact){st.bursts=1;events.push({type:'burst',n:1,r:st.impact.r,kind:st.impact.kind});}
   return events;
  }
 };
 return api;
}

// Silhueta vertical do selo: anéis entrelaçados, oito lanças e olho-núcleo.
function makeSigil(THREE){
 const group=new THREE.Group(),red=new THREE.MeshBasicMaterial({color:0xff153c,transparent:true,opacity:.92,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}),
 dark=new THREE.MeshBasicMaterial({color:0x230014,transparent:true,opacity:.87,depthWrite:false,side:THREE.DoubleSide}),
 white=new THREE.MeshBasicMaterial({color:0xffc7e0,transparent:true,opacity:.93,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
 for(const [r,w,mat] of [[1.65,.055,red],[1.88,.065,dark],[2.04,.045,red],[.93,.035,red],[.73,.04,dark]])group.add(new THREE.Mesh(new THREE.RingGeometry(r-w,r+w,80),mat));
 const spikeShape=new THREE.Shape();spikeShape.moveTo(-.17,1.81);spikeShape.lineTo(0,2.68);spikeShape.lineTo(.17,1.81);spikeShape.lineTo(0,1.97);spikeShape.closePath();
 const spikeGeo=new THREE.ShapeGeometry(spikeShape);
 for(let i=0;i<8;i++){const s=new THREE.Mesh(spikeGeo,i%2?red:dark);s.rotation.z=i*Math.PI/4;group.add(s);}
 const eye=new THREE.Mesh(new THREE.RingGeometry(.2,.32,4),white);eye.rotation.z=Math.PI/4;group.add(eye);
 for(let i=0;i<12;i++){const a=i*Math.PI/6,t=new THREE.Mesh(new THREE.PlaneGeometry(.16,.045),red);t.position.set(Math.cos(a)*1.46,Math.sin(a)*1.46,0);t.rotation.z=a;group.add(t);}
 group.userData.materials=[red,dark,white];return group;
}
const VIS_VERT='varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const VIS_FRAG=[
 'uniform float uTime; uniform float uOpacity; varying vec2 vUv;',
 'void main(){float a=vUv.x*6.2831853;float q=sin(a*19.-uTime*5.)*.17+sin(a*43.+uTime*8.)*.09;',
 'float v=vUv.y;float center=exp(-pow((v-.46-q)*3.8,2.));',
 'float streak=pow(max(0.,sin(a*13.+v*5.-uTime*2.)),5.);',
 'float rim=exp(-pow((v-.48-q)*9.,2.));',
 'vec3 crimson=vec3(.92,.004,.065),purple=vec3(.20,.012,.58);',
 'vec3 col=mix(purple,crimson,clamp(center*.92+streak*.28,0.,1.));',
 'col=mix(col,vec3(1.,.91,.96),pow(rim,3.)*.92);',
 'float alpha=clamp((center*.62+rim*.23+streak*.16)*uOpacity,0.,1.);',
 'if(alpha<.016)discard;gl_FragColor=vec4(col,alpha);}'
].join('\n');
export function createZarkhaelCircularSwordVFX(THREE,scene){
 const root=new THREE.Group();root.name='ZarkhaelSentenca278';scene.add(root);
 const sigil=makeSigil(THREE);root.add(sigil);
 const color=(hex,opacity=1)=>new THREE.MeshBasicMaterial({color:hex,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false});
 const crimson=color(0xff143f),violet=color(0x8c36ff),coreMat=color(0xfff7ff),shadow=color(0x2d0028);
 const focus=new THREE.Mesh(new THREE.SphereGeometry(.36,16,10),coreMat);root.add(focus);
 const corona=new THREE.Mesh(new THREE.IcosahedronGeometry(.76,1),crimson);root.add(corona);
 const waveRoot=new THREE.Group();root.add(waveRoot);
 const wallMat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uOpacity:{value:0}},vertexShader:VIS_VERT,fragmentShader:VIS_FRAG,side:THREE.DoubleSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const wall=new THREE.Mesh(new THREE.CylinderGeometry(1,1,3.3,96,1,true),wallMat);waveRoot.add(wall);
 const edge=new THREE.Mesh(new THREE.TorusGeometry(1,.065,5,96),coreMat);edge.rotation.x=Math.PI/2;waveRoot.add(edge);
 const groundRing=new THREE.Mesh(new THREE.RingGeometry(.91,1.09,96),violet);groundRing.rotation.x=-Math.PI/2;waveRoot.add(groundRing);
 const secondary=new THREE.Mesh(new THREE.TorusGeometry(1,.1,5,96),crimson);secondary.rotation.x=Math.PI/2;waveRoot.add(secondary);
 const burstRoot=new THREE.Group();root.add(burstRoot);
 const burstA=new THREE.Mesh(new THREE.TorusGeometry(1,.22,7,128),coreMat);burstA.rotation.x=Math.PI/2;burstRoot.add(burstA);
 const burstB=new THREE.Mesh(new THREE.TorusGeometry(1,.35,7,128),crimson);burstB.rotation.x=Math.PI/2;burstRoot.add(burstB);
 const shards=new THREE.InstancedMesh(new THREE.ConeGeometry(.22,2.9,3),shadow,32);
 shards.frustumCulled=false;burstRoot.add(shards);
 const vm=new THREE.Matrix4(),qp=new THREE.Quaternion(),pos=new THREE.Vector3(),sc=new THREE.Vector3();
 let weapon=null,energy=null,tip=null,seconds=0;
 function setWeapon(w){weapon=w||null;energy=weapon&&weapon.userData.energy;tip=weapon&&weapon.userData.tip;}
 function update(sword,ctx={},dt=0){
   seconds+=dt;const s=sword?.st;
   if(!s||s.phase==='idle'||s.done){sigil.visible=false;focus.visible=false;corona.visible=false;waveRoot.visible=false;burstRoot.visible=false;if(energy)for(const m of energy)m.opacity=.18;return;}
   const b=ctx.boss||s.boss,low=ctx.low,ground=ctx.ground||(()=>b.y),yaw=b.yaw||0;
   root.position.set(b.x,0,b.z);
   const f=Math.sin(yaw),z=Math.cos(yaw);
   sigil.visible=s.phase!=='wave'&&s.phase!=='detonate'&&s.phase!=='abort';
   const rise=s.phase==='aura'?ease(s.t/.6):s.phase==='charge'?1:s.phase==='spin'?1:0;
   sigil.position.set(-f*.8,b.y+2.35,-z*.8);if(ctx.camera)sigil.quaternion.copy(ctx.camera.quaternion);
   sigil.rotation.z=Math.sin(seconds*.7)*.045;
   sigil.scale.setScalar((.5+.5*rise)*(1+.03*Math.sin(seconds*7)));
   sigil.userData.materials[0].opacity=.12+.8*rise;
   focus.visible=s.phase!=='abort';corona.visible=focus.visible;
   const charge=s.phase==='aura'?ease(s.t/ZsSafe(sword.T.aura))* .25:s.phase==='charge'?s.charge:s.phase==='spin'?1:s.phase==='wave'?Math.max(.1,1-s.radius/sword.T.range):s.phase==='detonate'?.7:0;
   focus.position.set(f*.85,b.y+1.5,-0+z*.85);
   focus.scale.setScalar(.33+1.7*charge);
   corona.position.copy(focus.position);corona.rotation.set(seconds*.9,seconds*1.7,seconds*.5);corona.scale.setScalar(.38+1.9*charge);
   corona.material.opacity=.12+.45*charge;
   if(energy)for(const [i,m] of energy.entries())m.opacity=Math.min(1,.12+(i===0?.6:.34)*charge*(.78+.22*Math.sin(seconds*17)));
   waveRoot.visible=s.phase==='wave';
   if(waveRoot.visible){const r=Math.max(.25,s.radius),y=ground(b.x,b.z);
     waveRoot.position.y=y;wall.position.y=1.65;wall.scale.set(r,1,r);
     edge.position.y=1.85;edge.scale.setScalar(r);groundRing.position.y=.09;groundRing.scale.setScalar(r);
     secondary.position.y=2.8;secondary.scale.setScalar(r*.985);
     wallMat.uniforms.uTime.value=seconds;wallMat.uniforms.uOpacity.value=low?.70:1;
     edge.material.opacity=.85;groundRing.material.opacity=.62;secondary.material.opacity=.6;}
   burstRoot.visible=s.phase==='detonate';
   if(burstRoot.visible){const age=s.t-s.impact.t,r=s.impact.r,y=ground(b.x,b.z);
     burstRoot.position.y=y+1.1;
     // Três impactos separados são ondas concêntricas com núcleo claro e colapso rubro-violeta.
     const k=Math.floor(age/sword.T.burstGap),since=age-k*sword.T.burstGap;
     const pulse=Math.max(0,1-since/.35),current=clamp(k,0,2);
     const R=r+(.25+.95*ease(clamp(since/.30)))+current*.48;
     burstA.scale.setScalar(R);burstB.scale.setScalar(R+1.4);
     burstA.material.opacity=.15+.85*pulse;burstB.material.opacity=.18+.65*pulse;
     coreMat.opacity=clamp(.25+.75*pulse);crimson.opacity=.25+.6*pulse;
     const n=low?16:32;shards.count=n;
     for(let i=0;i<n;i++){const a=i/n*Math.PI*2+current*.2,rr=r+.35+ease(clamp(since/.4))*1.25;
       pos.set(Math.cos(a)*rr,.8+.4*Math.sin(i*4+seconds*6),Math.sin(a)*rr);
       qp.setFromAxisAngle(new THREE.Vector3(0,0,1),-Math.PI/2);
       vm.compose(pos,qp,sc.set(.45+(.15*(i%3)),(.25+.9*pulse),.45));shards.setMatrixAt(i,vm);
     }shards.instanceMatrix.needsUpdate=true;
   }else{coreMat.opacity=1;crimson.opacity=.9;}
 }
 function clear(){sigil.visible=false;focus.visible=false;corona.visible=false;waveRoot.visible=false;burstRoot.visible=false;if(energy)for(const m of energy)m.opacity=.18;}
 function dispose(){scene.remove(root);const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of [].concat(o.material))materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
 function ZsSafe(v){return Math.max(.001,v);}
 clear();return{root,update,clear,dispose,setWeapon,get weaponReady(){return !!weapon;},get bladeTip(){if(!tip)return null;return tip.getWorldPosition(new THREE.Vector3());}};
}
/** Preserva a malha GLB original e aplica somente um brilho discreto, não troca o modelo por geometria genérica. */
export async function mountZarkhaelSword(THREE,GLTFLoader,bossModel,asset='./EspadaBispo3.glb'){
 const hand=bossModel.getObjectByName('mixamorigRightHand')||bossModel.getObjectByName('RightHand');
 if(!hand)throw new Error('Bispo 3 não tem osso da mão direita');
 const gltf=await new GLTFLoader().loadAsync(asset);
 const weapon=gltf.scene,bb=new THREE.Box3().setFromObject(weapon),size=bb.getSize(new THREE.Vector3());
 if(size.x>size.y&&size.x>size.z)weapon.rotation.z=Math.PI/2;
 else if(size.z>size.y)weapon.rotation.x=-Math.PI/2;
 const box=new THREE.Box3().setFromObject(weapon),length=box.max.y-box.min.y;
 if(!(length>.001))throw new Error('EspadaBispo3.glb sem lâmina mensurável');
 bossModel.updateWorldMatrix(true,true);const hs=hand.getWorldScale(new THREE.Vector3()),scale=Math.max(.0001,Math.abs(hs.y));
 const anchor=new THREE.Group();anchor.name='ZarkhaelEspadaOriginal278';anchor.scale.setScalar(1/scale);anchor.rotation.set(0,0,0);anchor.position.set(0,.045/scale,0);
 const factor=2.15/length;weapon.scale.setScalar(factor);
 weapon.position.set(-((box.min.x+box.max.x)*.5)*factor,-box.min.y*factor,-((box.min.z+box.max.z)*.5)*factor);
 weapon.traverse(o=>{if(o.isMesh){o.castShadow=true;const mats=[].concat(o.material);o.material=Array.isArray(o.material)?mats.map(m=>m.clone()):o.material.clone();for(const m of [].concat(o.material)){if(m.emissive){m.emissive.setHex(0x240439);m.emissiveIntensity=.22;}}}});
 anchor.add(weapon);
 const base= new THREE.Mesh(new THREE.CylinderGeometry(.035,.018,1.78,7,1),new THREE.MeshBasicMaterial({color:0x9a3aff,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false}));
 base.position.y=1.2;const rim=new THREE.Mesh(new THREE.CylinderGeometry(.072,.045,1.82,7,1),new THREE.MeshBasicMaterial({color:0xbfa3ff,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false}));
 rim.position.y=1.2;anchor.add(base,rim);
 const tip=new THREE.Object3D();tip.position.y=2.15;anchor.add(tip);
 anchor.userData={energy:[base.material,rim.material],tip};hand.add(anchor);
 return anchor;
}
