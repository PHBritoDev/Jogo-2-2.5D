import {PORTALS} from './skill-twin-portals3d.js?v=mod236-vfx2';
import {energyBody,energyMaterial} from './vfx-flow3d.js?v=mod240-vfx-integrated';
import {volumeTrail} from './vfx-trail3d.js?v=mod240-vfx-integrated';
import {impactDirector} from './vfx-impact3d.js?v=mod240-vfx-integrated';
import {smooth} from './celestial-fxkit3d.js?v=mod240-vfx-integrated';
const PORTAL_VERT = 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const DISC_FRAG = `varying vec2 vUv;uniform float time,alpha,open;uniform vec3 col;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){
 vec2 p=vUv*2.-1.;float d=length(p);if(d>1.)discard;
 float a=atan(p.y,p.x),sw=a*4.+log(d+.04)*5.-time*3.8;
 float arms=smoothstep(.28,.95,.5+.5*sin(sw))*n2(vec2(a*4.,d*7.-time*2.4));
 float horizon=smoothstep(.22,.88,d);
 vec3 abyss=vec3(.01,0.,.008);
 vec3 c=mix(abyss,col*.65,horizon*.55)+col*arms*(.35+1.1*horizon);
 c+=mix(col,vec3(1.,.9,.88),.5)*exp(-pow((d-.93)/.045,2.))*1.1;
 float al=alpha*(1.-smoothstep(.92,1.,d))*(.92+.08*horizon);
 gl_FragColor=vec4(c*al,al);
}`;
const RIM_FRAG = `varying vec2 vUv;uniform float time,alpha;uniform vec3 col;
void main(){
 float u=vUv.x,v=abs(vUv.y*2.-1.);
 float flow=.65+.35*sin(u*80.-time*14.)+.25*sin(u*23.+time*5.);
 vec3 c=mix(vec3(.02,0.,.01),col,1.-smoothstep(.2,.95,v));
 c=mix(c,vec3(1.,.92,.9),pow(1.-v,5.)*.85)*(.7+flow*.3);
 float a=alpha*pow(1.-v,1.3)*(.8+.2*flow);
 gl_FragColor=vec4(c*a,a);
}`;
/** Two quiet apertures and two continuous, volumetric lance bodies. No thread swarm.
 * MOD 238: bocas dimensionais com profundidade (túnel de energia girando atrás do disco), aro grosso e vivo, orientação
 * que nunca fica de lado para a câmera, corpos alongados em carmesim e violeta profundos (sem tom pastel) e sem as linhas
 * soltas que liam como rabiscos. */
export function createTwinPortalsVFX(T,scene,{ground=()=>0}={}){
 const root=new T.Group();root.name='PortaisPerseguicao';root.visible=false;scene.add(root);
 const circle=new T.CircleGeometry(1,48),ring=new T.TorusGeometry(1,.085,12,64),tunnelGeo=new T.CylinderGeometry(.92,.26,.78,32,4,true);tunnelGeo.rotateX(-Math.PI/2);tunnelGeo.translate(0,0,-.38);
 const PAL=[{deep:[.012,0,.003],body:[.88,.01,.04],hot:[1,.3,.24]},{deep:[.015,0,.025],body:[.58,.01,.28],hot:[1,.22,.48]}],tint=(m,i)=>{for(const k of ['deep','body','hot'])m.uniforms[k].value.setRGB(...PAL[i][k]);return m;};
 const presets=['crimson','violet'],colors=[[.92,.02,.06],[.68,.03,.38]];
 const mat=(frag,c)=>new T.ShaderMaterial({vertexShader:PORTAL_VERT,fragmentShader:frag,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor,uniforms:{time:{value:0},alpha:{value:1},open:{value:1},col:{value:new T.Color(...c)}}});
 const beamGeo=new T.CylinderGeometry(.16,.28,1,14,10,true);beamGeo.rotateX(Math.PI/2);beamGeo.translate(0,0,.5);
 const coreBeamGeo=new T.CylinderGeometry(.055,.095,1,10,1,false);coreBeamGeo.rotateX(Math.PI/2);coreBeamGeo.translate(0,0,.5);
 const shardGeo=new T.OctahedronGeometry(.11,0),shardMat=new T.MeshBasicMaterial({color:0x070104}),dummy=new T.Object3D();
 const portals=colors.map((c,i)=>{
  const group=new T.Group();root.add(group);
  const disc=new T.Mesh(circle,mat(DISC_FRAG,c)),rim=new T.Mesh(ring,mat(RIM_FRAG,c));
  const tunnel=new T.Mesh(tunnelGeo,tint(energyMaterial(T,presets[i],{alpha:.72,warp:.02,frequency:2.4,seed:i*5}),i));tunnel.material.side=T.DoubleSide;
  const crown=new T.InstancedMesh(shardGeo,shardMat,12);
  for(let k=0;k<12;k++){const a=k/12*Math.PI*2;dummy.position.set(Math.cos(a)*1.08,Math.sin(a)*1.08,.03);dummy.rotation.set(0,0,a+Math.PI/4);dummy.scale.set(.8,1.8,.7);dummy.updateMatrix();crown.setMatrixAt(k,dummy.matrix);}
  crown.instanceMatrix.needsUpdate=true;group.add(tunnel,disc,rim,crown);
  return{group,disc,rim,tunnel,crown};
 });
 const beams=presets.map((p,i)=>{
  const group=new T.Group();group.visible=false;root.add(group);
  const sheathMat=tint(energyMaterial(T,p,{alpha:.92,warp:.035,frequency:3.2,seed:i*9+2,flame:1}),i);
  const coreMat=new T.MeshBasicMaterial({color:i?0xffbad0:0xffd8d0,transparent:true,opacity:.94,toneMapped:false});
  const sheath=new T.Mesh(beamGeo,sheathMat),core=new T.Mesh(coreBeamGeo,coreMat);
  sheath.frustumCulled=core.frustumCulled=false;group.add(sheath,core);
  return{group,sheath,core,sheathMat,coreMat};
 });
 const bodies=presets.map((p,i)=>energyBody(T,root,p,{tail:i?4.2:3.8,rings:48,sides:24,seed:i*4}));bodies.forEach((b,i)=>tint(b.material,i));
 const trails=presets.map((p,i)=>{const tr=volumeTrail(T,root,p,{capacity:36,life:.8,radius:.58});tint(tr.mesh.material,i);return tr;});
 const singularity=energyBody(T,root,'crimson',{tail:.8,rings:28,sides:20,seed:17});tint(singularity.material,0);singularity.mesh.visible=false;
 const impacts=impactDirector(T,root,ground,{capacity:5});let last=-1;
 const arcPos=new Float32Array(160*6),arcCol=new Float32Array(160*6),arcGeo=new T.BufferGeometry();arcGeo.setAttribute('position',new T.BufferAttribute(arcPos,3).setUsage(T.DynamicDrawUsage));arcGeo.setAttribute('color',new T.BufferAttribute(arcCol,3));
 const arcMat=new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.65,toneMapped:false}),arcs=new T.LineSegments(arcGeo,arcMat);arcs.frustumCulled=false;arcs.visible=false;root.add(arcs);
 const dir=new T.Vector3(),side=new T.Vector3(),up=new T.Vector3(),axis=new T.Vector3(0,1,0),v=new T.Vector3(),prev=new T.Vector3();
 function clear(){root.visible=false;last=-1;impacts.clear();trails.forEach(t=>t.clear());bodies.forEach(b=>b.mesh.visible=false);beams.forEach(b=>b.group.visible=false);singularity.mesh.visible=false;}
 function update(s,camera,quality=1){if(!s.active){if(last>=0)clear();return;}root.visible=true;if(s.time<last){impacts.clear();trails.forEach(t=>t.clear());}last=s.time;const t=s.time,ph=s.phase;
  const opening=ph==='open'?smooth(s.age/PORTALS.open):ph==='close'?1-smooth(s.age/PORTALS.close):1;
  let na=0;
  for(let i=0;i<2;i++){
   const f=s.flows[i],P=portals[i],at=s.portals[i];P.group.position.set(at.x,at.y,at.z);{const cx=camera.position.x-at.x,cz=camera.position.z-at.z,cl=Math.hypot(cx,cz)||1,fx=s.f.x*.55+cx/cl*.45,fz=s.f.z*.55+cz/cl*.45;P.group.lookAt(at.x+fx,at.y,at.z+fz);}P.group.scale.setScalar(opening);P.group.rotateZ(t*(i?-.8:.8));
   for(const m of [P.disc.material,P.rim.material]){m.uniforms.time.value=t+i*2;m.uniforms.alpha.value=opening*.95;}P.tunnel.material.uniforms.time.value=t*1.5+i;P.tunnel.material.uniforms.alpha.value=opening*.68;P.tunnel.material.uniforms.detail.value=quality===0?.65:1;
   const pressure=f.phase==='contact'&&['fire','pressure','compress'].includes(ph),flying=f.phase==='flight';
   const swell=ph==='pressure'?1+.32*smooth(s.age/PORTALS.pressure)+.08*Math.max(0,Math.sin(s.age*18)):1;
   const alive=flying||pressure,fade=ph==='compress'?1-smooth(s.age/PORTALS.compress):1;
   bodies[i].mesh.visible=alive;if(alive)bodies[i].update(t,{position:f.p,dir:f.direction,radius:swell*(i?.72:.68)*(1+.05*Math.sin(t*12))*fade,length:Math.max(.03,Math.min(2.4,f.travel/(i?3.4:3))),quality,alpha:.96*fade});
   const bm=beams[i],dist=Math.hypot(f.p.x-at.x,f.p.y-at.y,f.p.z-at.z);
   bm.group.visible=alive&&dist>.15;
   if(bm.group.visible){
    bm.group.position.set(at.x,at.y,at.z);bm.group.lookAt(f.p.x,f.p.y,f.p.z);
    const w=(.75+.25*swell)*fade*(1+.08*Math.sin(t*18+i));
    bm.group.scale.set(w,w,dist);bm.sheath.rotation.z=t*(i?-6:6);
    bm.sheathMat.uniforms.time.value=t*1.8;bm.sheathMat.uniforms.alpha.value=.9*fade;
    bm.sheathMat.uniforms.detail.value=quality===0?.65:1;bm.coreMat.opacity=.92*fade;
   }
   trails[i].update(t,f.p,flying,quality);
   if(f.endAt>=0&&['contact','wall'].includes(f.phase))impacts.emit({id:'flow'+i+'-'+f.endAt,time:f.endAt,point:f.at,size:f.phase==='wall'?1.8:2.2,preset:presets[i],kind:'lance',dir:f.direction});
   if(alive){dir.set(f.direction.x,f.direction.y,f.direction.z);side.crossVectors(axis,dir).normalize();up.crossVectors(dir,side);
    for(let branch=0;branch<(quality===0?2:4);branch++){const angle=branch*Math.PI/2+i*.4,length=Math.min(4.8,f.travel);for(let j=0;j<=12;j++){const u=j/12,twist=angle+u*1.7+.18*Math.sin(t*4+u*9),r=(.35+.55*Math.sin(u*Math.PI))*(1+.17*Math.sin(j*3.7+t*11));v.set(f.p.x,f.p.y,f.p.z).addScaledVector(dir,-u*length).addScaledVector(side,Math.cos(twist)*r).addScaledVector(up,Math.sin(twist)*r);
     if(j&&na<160){prev.toArray(arcPos,na*6);v.toArray(arcPos,na*6+3);arcCol.set(colors[i],na*6);arcCol.set(colors[i],na*6+3);na++;}prev.copy(v);
    }}
   }
  }
  const showSingularity=ph==='pressure'||ph==='compress';singularity.mesh.visible=showSingularity;
  if(showSingularity){
   const k=ph==='pressure'?smooth(s.age/PORTALS.pressure):1-smooth(s.age/PORTALS.compress);
   const r=(.45+.85*k)*(1+.12*Math.sin(t*24));
   singularity.update(t,{position:s.center,dir:{x:Math.sin(t*5),y:.2,z:Math.cos(t*5)},radius:r,length:r,alpha:.95,quality});
  }
  if(s.pressureAt>=0)for(let n=0;n<s.pulses;n++)impacts.emit({id:'pressure'+n+'-'+s.pressureAt,time:s.pressureAt+PORTALS.pulseTimes[n],point:s.center,size:1.3+n*.35,preset:presets[n%2],kind:'pressure'});
  if(ph==='burst'){impacts.emit({id:'burst-red-'+(t-s.age),time:t-s.age,point:s.center,size:5.8,preset:'crimson',kind:'burst'});impacts.emit({id:'burst-violet-'+(t-s.age),time:t-s.age+.12,point:s.center,size:4.7,preset:'violet',kind:'burst',dir:{x:.2,y:1,z:0}});}
  if(ph==='compress'){for(let i=0;i<2;i++){const k=s.age/PORTALS.compress;bodies[i].update(t,{position:s.center,dir:{x:i?1:-1,y:.3,z:0},radius:1.5*(1-k)+.3,length:.7*(1-k),alpha:.65,quality});}}
  arcGeo.setDrawRange(0,na*2);arcGeo.attributes.position.needsUpdate=arcGeo.attributes.color.needsUpdate=true;impacts.update(t,quality);
 }
 return{root,update,clear,stats:()=>({bodies:2,visible:bodies.filter(b=>b.mesh.visible).length,impacts:impacts.stats()}),dispose(){scene.remove(root);impacts.dispose();bodies.forEach(b=>b.dispose());singularity.dispose();trails.forEach(t=>t.dispose());
  for(const b of beams){b.sheathMat.dispose();b.coreMat.dispose();}
  beamGeo.dispose();coreBeamGeo.dispose();shardGeo.dispose();shardMat.dispose();circle.dispose();ring.dispose();for(const p of portals){p.disc.material.dispose();p.rim.material.dispose();p.tunnel.material.dispose();p.crown.dispose();}tunnelGeo.dispose();arcGeo.dispose();arcMat.dispose();}};
}
