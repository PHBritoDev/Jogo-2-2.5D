import {PORTALS} from './skill-twin-portals3d.js?v=mod236-vfx2';
import {energyBody} from './vfx-flow3d.js';
import {volumeTrail} from './vfx-trail3d.js';
import {impactDirector} from './vfx-impact3d.js';
import {smooth} from './celestial-fxkit3d.js';
const PORTAL_VERT = 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const DISC_FRAG = `varying vec2 vUv; uniform float time, alpha, open; uniform vec3 col;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){ vec2 p=vUv*2.-1.; float d=length(p); if(d>1.) discard; float a=atan(p.y,p.x);
 float sw=a*3.+log(d+.05)*4.-time*3.;                                   // braços do redemoinho caindo para dentro
 float arms=smoothstep(.35,1.,.5+.5*sin(sw))*n2(vec2(a*4.,d*6.-time*2.));
 float depth=smoothstep(.0,.9,d);                                       // centro quase negro: dá a sensação de fundo
 vec3 c=mix(vec3(.01,.0,.02),col*.55,depth*.6)+col*arms*(.4+.9*depth);
 c+=col*exp(-pow((d-.95)/.05,2.))*.8;
 float al=alpha*smoothstep(1.,.93,d)*(.82+.18*depth);
 gl_FragColor=vec4(c*al,al); }`;
const RIM_FRAG = `varying vec2 vUv; uniform float time, alpha; uniform vec3 col;
float h(float p){return fract(sin(p*91.7)*47453.3);}
void main(){ float u=vUv.x, v=abs(vUv.y*2.-1.); float flow=.6+.4*sin(u*80.-time*14.)+.3*sin(u*23.+time*5.);
 vec3 c=mix(col,vec3(1.,.95,.95),pow(1.-v,6.)*.8)*(.6+flow*.25); float a=alpha*pow(1.-v,1.5)*(.7+.3*flow);
 gl_FragColor=vec4(c*a,a); }`;
/** Two quiet apertures and two continuous, volumetric lance bodies. No thread swarm. */
export function createTwinPortalsVFX(T,scene,{ground=()=>0}={}){
 const root=new T.Group();root.name='PortaisPerseguicao';root.visible=false;scene.add(root);
 const circle=new T.CircleGeometry(1,40),ring=new T.TorusGeometry(1,.045,6,48),presets=['crimson','violet'],colors=[[.9,.035,.09],[.4,.08,.8]];
 const mat=(frag,c)=>new T.ShaderMaterial({vertexShader:PORTAL_VERT,fragmentShader:frag,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor,uniforms:{time:{value:0},alpha:{value:1},open:{value:1},col:{value:new T.Color(...c)}}});
 const portals=colors.map(c=>{const group=new T.Group();root.add(group);const disc=new T.Mesh(circle,mat(DISC_FRAG,c)),rim=new T.Mesh(ring,mat(RIM_FRAG,c));group.add(disc,rim);return{group,disc,rim};});
 const bodies=presets.map((p,i)=>energyBody(T,root,p,{tail:i?3.5:3,rings:48,sides:24,seed:i*4}));
 const trails=presets.map(p=>volumeTrail(T,root,p,{capacity:32,life:.7,radius:.5}));
 const impacts=impactDirector(T,root,ground,{capacity:5});let last=-1;
 const arcPos=new Float32Array(160*6),arcCol=new Float32Array(160*6),arcGeo=new T.BufferGeometry();arcGeo.setAttribute('position',new T.BufferAttribute(arcPos,3).setUsage(T.DynamicDrawUsage));arcGeo.setAttribute('color',new T.BufferAttribute(arcCol,3));
 const arcMat=new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.65,toneMapped:false}),arcs=new T.LineSegments(arcGeo,arcMat);arcs.frustumCulled=false;root.add(arcs);
 const dir=new T.Vector3(),side=new T.Vector3(),up=new T.Vector3(),axis=new T.Vector3(0,1,0),v=new T.Vector3(),prev=new T.Vector3();
 function clear(){root.visible=false;last=-1;impacts.clear();trails.forEach(t=>t.clear());bodies.forEach(b=>b.mesh.visible=false);}
 function update(s,camera,quality=1){if(!s.active){if(last>=0)clear();return;}root.visible=true;if(s.time<last){impacts.clear();trails.forEach(t=>t.clear());}last=s.time;const t=s.time,ph=s.phase;
  const opening=ph==='open'?smooth(s.age/PORTALS.open):ph==='close'?1-smooth(s.age/PORTALS.close):1;
  let na=0;
  for(let i=0;i<2;i++){
   const f=s.flows[i],P=portals[i],at=s.portals[i];P.group.position.set(at.x,at.y,at.z);P.group.lookAt(at.x+s.f.x,at.y,at.z+s.f.z);P.group.scale.setScalar(opening);for(const m of [P.disc,P.rim]){m.material.uniforms.time.value=t+i*2;m.material.uniforms.alpha.value=opening*.85;}
   const pressure=f.phase==='contact'&&['fire','pressure','compress'].includes(ph),flying=f.phase==='flight';
   const swell=ph==='pressure'?1+.32*smooth(s.age/PORTALS.pressure)+.08*Math.max(0,Math.sin(s.age*18)):1;
   const alive=flying||pressure,fade=ph==='compress'?1-smooth(s.age/PORTALS.compress):1;
   bodies[i].mesh.visible=alive;if(alive)bodies[i].update(t,{position:f.p,dir:f.direction,radius:swell*(i?.91:.87)*(1+.035*Math.sin(t*12))*fade,length:Math.max(.03,Math.min(1.6,f.travel/(i?3.9:3.4))),quality,alpha:.93*fade});
   trails[i].update(t,f.p,flying,quality);
   if(f.endAt>=0&&['contact','wall'].includes(f.phase))impacts.emit({id:'flow'+i,time:f.endAt,point:f.at,size:f.phase==='wall'?1.8:2.2,preset:presets[i],kind:'lance',dir:f.direction});
   if(alive){dir.set(f.direction.x,f.direction.y,f.direction.z);side.crossVectors(axis,dir).normalize();up.crossVectors(dir,side);
    for(let branch=0;branch<(quality===0?2:4);branch++){const angle=branch*Math.PI/2+i*.4,length=Math.min(4.8,f.travel);for(let j=0;j<=12;j++){const u=j/12,twist=angle+u*1.7+.18*Math.sin(t*4+u*9),r=(.35+.55*Math.sin(u*Math.PI))*(1+.17*Math.sin(j*3.7+t*11));v.set(f.p.x,f.p.y,f.p.z).addScaledVector(dir,-u*length).addScaledVector(side,Math.cos(twist)*r).addScaledVector(up,Math.sin(twist)*r);
     if(j&&na<160){prev.toArray(arcPos,na*6);v.toArray(arcPos,na*6+3);arcCol.set(colors[i],na*6);arcCol.set(colors[i],na*6+3);na++;}prev.copy(v);
    }}
   }
  }
  if(s.pressureAt>=0)for(let n=0;n<s.pulses;n++)impacts.emit({id:'pressure'+n,time:s.pressureAt+PORTALS.pulseTimes[n],point:s.center,size:1.3+n*.35,preset:presets[n%2],kind:'pressure'});
  if(ph==='burst'){impacts.emit({id:'burst-red',time:t-s.age,point:s.center,size:5.8,preset:'crimson',kind:'burst'});impacts.emit({id:'burst-violet',time:t-s.age+.12,point:s.center,size:4.7,preset:'violet',kind:'burst',dir:{x:.2,y:1,z:0}});}
  if(ph==='compress'){for(let i=0;i<2;i++){const k=s.age/PORTALS.compress;bodies[i].update(t,{position:s.center,dir:{x:i?1:-1,y:.3,z:0},radius:1.5*(1-k)+.3,length:.7*(1-k),alpha:.65,quality});}}
  arcGeo.setDrawRange(0,na*2);arcGeo.attributes.position.needsUpdate=arcGeo.attributes.color.needsUpdate=true;impacts.update(t,quality);
 }
 return{root,update,clear,stats:()=>({bodies:2,visible:bodies.filter(b=>b.mesh.visible).length,impacts:impacts.stats()}),dispose(){scene.remove(root);impacts.dispose();bodies.forEach(b=>b.dispose());trails.forEach(t=>t.dispose());circle.dispose();ring.dispose();for(const p of portals){p.disc.material.dispose();p.rim.material.dispose();}arcGeo.dispose();arcMat.dispose();}};
}
