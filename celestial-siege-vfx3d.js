/** Five persistent sword clones + five reusable ribbon buffers and contact pools. No lights/post pass. */
export function createSiegeVFX(T,scene,source){
 const group=new T.Group();group.name='CercoCincoLaminas';scene.add(group);
 const up=new T.Vector3(0,0,1),dir=new T.Vector3(),side=new T.Vector3(),tmp=new T.Vector3();
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,uniforms:{time:{value:0}},vertexShader:'attribute float fade; varying vec2 vUv; varying float vFade; void main(){vUv=uv;vFade=fade;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv; varying float vFade; uniform float time; void main(){float edge=pow(max(0.,1.-abs(vUv.y*2.-1.)),1.6); float core=pow(edge,9.); vec3 c=mix(vec3(.08,.38,1.),vec3(1.,1.,1.),core);if(vUv.x>1.5&&vUv.x<3.5)c=mix(vec3(.6,.32,.07),vec3(1.,.88,.52),edge);if(vUv.x>3.5)c=vec3(.7,.92,1.); float pulse=.85+.15*sin(vUv.x*30.-time*18.);gl_FragColor=vec4(c,edge*vFade*pulse);}' });
 const flashMat=new T.MeshBasicMaterial({color:0xbceeff,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
 const sparkGeo=new T.ConeGeometry(.025,.26,3);sparkGeo.rotateX(Math.PI/2);
 const sparkMat=new T.MeshBasicMaterial({color:0xd9f5ff,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
 const sparks=new T.InstancedMesh(sparkGeo,sparkMat,80);sparks.frustumCulled=false;group.add(sparks);const dummy=new T.Object3D();
 // Narrow animated edge ribbons follow the actual blade silhouette, leaving steel and guard legible.
 const edgeGeo=new T.BufferGeometry(),ep=[],eu=[],ef=[],ei=[];
 for(let edge=0;edge<2;edge++)for(let j=0;j<12;j++){const t=j/11,z=-.25+t*.99,x=(edge?1:-1)*(.045*(1-t)+.008),w=.022*Math.sin(Math.PI*t)+.008;for(let k=0;k<2;k++){ep.push(x+(k?1:-1)*w,.025,z);eu.push(t,k);ef.push(.8);}if(j<11){const k=edge*24+j*2;ei.push(k,k+1,k+2,k+1,k+3,k+2);}}
 edgeGeo.setAttribute('position',new T.Float32BufferAttribute(ep,3));edgeGeo.setAttribute('uv',new T.Float32BufferAttribute(eu,2));edgeGeo.setAttribute('fade',new T.Float32BufferAttribute(ef,1));edgeGeo.setIndex(ei);
 const swordMaterials=new Map();source.traverse(o=>{if(o.isMesh)for(const m of (Array.isArray(o.material)?o.material:[o.material])){if(!swordMaterials.has(m)){const n=m.clone();if(n.emissive){n.emissive.setHex(0x4086bb);n.emissiveIntensity=.48;}n.transparent=true;n.forceSinglePass=true;swordMaterials.set(m,n);}}});
 const slots=Array.from({length:5},(_,i)=>{
  const pivot=new T.Group(),sword=source.clone(true);sword.position.set(0,0,0);sword.rotation.set(-Math.PI/2,0,0);sword.scale.setScalar(.78);sword.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.material=Array.isArray(o.material)?o.material.map(m=>swordMaterials.get(m)):swordMaterials.get(o.material);}});pivot.add(sword);pivot.add(new T.Mesh(edgeGeo,material));group.add(pivot);
  // EspadaProta.glb: blade tip y=-.951, guard y=.3.. .5, grip y=.7; -Y -> +Z.
  const geo=new T.BufferGeometry(),pos=new Float32Array(24*2*3*3),uv=new Float32Array(24*2*2*3),fade=new Float32Array(48*3),indices=[];
  for(let band=0;band<3;band++)for(let j=0;j<24;j++){const v=band*24+j;uv[v*4]=uv[v*4+2]=j/23+band*2;uv[v*4+1]=0;uv[v*4+3]=1;if(j<23){const k=v*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
  geo.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.setAttribute('fade',new T.BufferAttribute(fade,1).setUsage(T.DynamicDrawUsage));geo.setIndex(indices);const ribbon=new T.Mesh(geo,material);ribbon.frustumCulled=false;group.add(ribbon);
  const flash=new T.Mesh(new T.SphereGeometry(.13,8,6),flashMat.clone());group.add(flash);
  const halo=new T.Mesh(new T.RingGeometry(.1,.112,24),flashMat.clone());halo.material.side=T.DoubleSide;group.add(halo);
  return {pivot,ribbon,geo,pos,fade,history:Array.from({length:24},()=>new T.Vector3()),count:0,flash,halo,burst:-1,impact:new T.Vector3(),direction:new T.Vector3(0,0,1)};
 });
 let low=false,time=0;
 function event(type,b){if(type==='summon'){for(const s of slots){s.count=0;s.burst=-1;}}if(type==='impact'||type==='blocked'){const s=slots[b.i];s.burst=0;s.fresh=true;s.impact.set(b.p.x,b.p.y,b.p.z);s.flash.position.copy(s.impact);s.halo.position.copy(s.impact);}}
 function update(dt,state,target,camera,isLow=false){low=isLow;time+=dt;material.uniforms.time.value=time;for(const m of swordMaterials.values())m.opacity=Math.min(1,state.time/.24);let particleCount=0;
  slots.forEach((s,i)=>{const b=state.blades[i],visible=state.active&&b&&b.phase!=='gone';s.pivot.visible=!!visible;
   if(visible){const p=b.p;s.pivot.position.set(p.x,p.y,p.z);const aim=b.phase==='flight'?b.aim:target;dir.set(aim.x-p.x,aim.y-p.y,aim.z-p.z).normalize();s.pivot.quaternion.setFromUnitVectors(up,dir);s.direction.copy(dir);
    if(b.phase==='flight'&&dt>0){for(let j=23;j>0;j--)s.history[j].copy(s.history[j-1]);s.history[0].copy(s.pivot.position);s.count=Math.min(24,s.count+1);}else if(b.phase==='ready'){s.count=0;}
   }
   s.ribbon.visible=s.count>1&&(visible||s.burst>=0);if(s.ribbon.visible){const n=low?Math.min(12,s.count):s.count;for(let j=0;j<24;j++){const idx=Math.min(j,n-1),p=s.history[idx],prev=s.history[Math.max(0,idx-1)];dir.copy(prev).sub(p);if(dir.lengthSq()<.00001)dir.copy(s.direction);tmp.copy(camera.position).sub(p);side.crossVectors(dir,tmp).normalize();const taper=Math.max(0,1-j/(n-1)),wave=Math.sin(j/(n-1)*Math.PI);for(let band=0;band<3;band++){const width=taper*(band===0?.14+.18*wave:.018),offset=band===0?0:(band===1?1:-1)*.24*wave;for(let k=0;k<2;k++){const vertex=(band*24+j)*2+k,o=vertex*3,sign=k?1:-1;s.pos[o]=p.x+side.x*(width*sign+offset);s.pos[o+1]=p.y+side.y*(width*sign+offset);s.pos[o+2]=p.z+side.z*(width*sign+offset);s.fade[vertex]=taper*(visible?1:Math.max(0,1-s.burst/.25));}}}s.geo.attributes.position.needsUpdate=true;s.geo.attributes.fade.needsUpdate=true;}
   if(s.burst>=0){if(s.fresh){s.burst=.025;s.fresh=false;}else s.burst+=dt;const t=s.burst;s.flash.visible=t<.12;s.flash.scale.setScalar(1+t*13);s.flash.material.opacity=Math.max(0,1-t/.12);s.halo.visible=t<.3;s.halo.quaternion.copy(camera.quaternion);s.halo.scale.setScalar(1+t*16);s.halo.material.opacity=Math.max(0,.65-t*2.2);const n=low?7:16;if(t<.42)for(let j=0;j<n;j++){const a=j*2.39996,spread=.3+(j%4)*.18;dir.set(Math.cos(a)*spread,Math.sin(a)*spread,.5).normalize();dir.applyQuaternion(s.pivot.quaternion);dummy.position.copy(s.impact).addScaledVector(dir,t*(2+j%4));dummy.scale.set(.6,1,Math.max(0,1-t/.42));dummy.quaternion.setFromUnitVectors(up,dir);dummy.updateMatrix();sparks.setMatrixAt(particleCount++,dummy.matrix);}if(t>.42){s.burst=-1;s.count=0;}}
   else{s.flash.visible=false;s.halo.visible=!!visible&&state.time<.32;if(s.halo.visible){s.halo.position.copy(s.pivot.position);s.halo.quaternion.copy(camera.quaternion);s.halo.scale.setScalar(1+state.time*7);s.halo.material.opacity=Math.max(0,.6-state.time*1.9);}}
  });sparks.count=particleCount;sparks.instanceMatrix.needsUpdate=true;
 }
 function clear(){for(const s of slots){s.count=0;s.burst=-1;s.pivot.visible=s.ribbon.visible=s.flash.visible=s.halo.visible=false;}sparks.count=0;}
 clear();return{event,update,clear,group,dispose(){scene.remove(group);slots.forEach(s=>{s.geo.dispose();s.flash.geometry.dispose();s.flash.material.dispose();s.halo.geometry.dispose();s.halo.material.dispose();});swordMaterials.forEach(m=>m.dispose());sparkGeo.dispose();sparkMat.dispose();edgeGeo.dispose();flashMat.dispose();material.dispose();}};
}
