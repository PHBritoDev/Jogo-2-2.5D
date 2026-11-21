// The event horizon, orbiting gas and bent light occupy separate depth planes.
import {softParticles,ribbons,groundDecals,groundNormal,smooth,easeOut,hash} from './celestial-fxkit3d.js';
import {WHITE_HOLE} from './celestial-whitehole3d.js';
const TAU=Math.PI*2;
const diskVertex=`varying vec3 local;void main(){local=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const diskFragment=`varying vec3 local;uniform float time;
void main(){
 float r=length(local.xy),a=atan(local.y,local.x);
 float edge=smoothstep(.68,.86,r)*(1.-smoothstep(1.38,3.28,r));
 float shear=time*(1.7/(.38+r));float twist=a-shear+3.3*log(r);
 float veins=.5+.5*sin(58.*r+4.*sin(3.*twist)+2.*sin(8.*twist-5.*r));
 float hot=exp(-2.5*(r-.83)*(r-.83))*(.34+.66*veins);
 float lumin=edge*(.18+hot)*(.76+.24*cos(twist));
 vec3 emission=mix(vec3(.76,.042,.009),vec3(1.,.49,.028),hot);
 emission=mix(emission,vec3(1.,.94,.60),pow(hot,4.));
 gl_FragColor=vec4(emission*1.45,min(1.,lumin*1.65));
}`;
function arcGeometry(T,radius,width,lift,tear=0){
 const v=[],ix=[];
 for(let i=0;i<=96;i++){const a=TAU*i/96;
  for(const side of [-1,1]){
   const edge=tear?1+.11*Math.sin(a*5+tear)+.07*Math.cos(a*8):1;
   const r=radius*edge+width*side*(tear?1.3+Math.sin(a*7+tear):1);
   v.push(Math.cos(a)*r,Math.sin(a)*r*lift,.12*Math.cos(a)+tear*.12*Math.sin(a*3+side*.3));
  }
  if(i&&(!tear||Math.sin(a*3+tear)>-.85)){const j=i*2;ix.push(j-2,j-1,j,j,j-1,j+1);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(ix);return g;
}
export function createWhiteHoleVFX(T,scene,{ground=()=>0}={}){
 const root=new T.Group();root.name='ColapsoLuzEterna';root.visible=false;scene.add(root);
 const portal=new T.Group(),disc=new T.Group(),wings=new T.Group();root.add(portal,wings);portal.add(disc);
 // Distant bands sit behind scene geometry, and open along the sightline to the cast.
 const veil=new T.Mesh(new T.SphereGeometry(1,28,12),new T.ShaderMaterial({
  uniforms:{age:{value:0},cover:{value:0},opening:{value:new T.Vector3()}},
  vertexShader:'varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 ray;uniform vec3 opening;uniform float age,cover;
   void main(){vec3 d=normalize(ray);float r=atan(d.z,d.x);
    float wave=.06*sin(3.*r+age*.13)+.04*cos(8.*r-age*.12);
    float bank=exp(-pow((d.y-.18-wave)*8.,2.));
    float split=smoothstep(.04,.52,length(d-opening));
    gl_FragColor=vec4(mix(vec3(.14,.065,.12),vec3(.033,.028,.08),smoothstep(.03,.38,d.y)),cover*bank*split*.67);}`,
  transparent:true,side:T.BackSide,depthWrite:false,fog:false,toneMapped:false}));
 veil.renderOrder=-8;veil.frustumCulled=false;root.add(veil);
 const horizon=new T.Mesh(new T.SphereGeometry(.78,36,20),new T.MeshBasicMaterial({color:0x010004,fog:false,toneMapped:false}));
 portal.add(horizon);
 const gas=new T.Mesh(new T.RingGeometry(.68,3.28,112,12),new T.ShaderMaterial({vertexShader:diskVertex,fragmentShader:diskFragment,
  uniforms:{time:{value:0}},transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false}));
 disc.add(gas);
 const line=(color,opacity)=>new T.MeshBasicMaterial({color,opacity,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,fog:false,toneMapped:false});
 const photon=new T.Mesh(arcGeometry(T,.80,.021,1),line(0xffcf77,1));
 const lens=new T.Mesh(arcGeometry(T,.96,.025,.91),line(0xff641d,.85));portal.add(photon,lens);
 // Light from the far side bends over the horizon. The near stream passes
 // across its face and tapers continuously into the inclined outer disk.
 const streamPositions=[],streamUvs=[],streamIndices=[];
 for(let i=0;i<=64;i++){
  const u=i/64,x=(u-.5)*6.1,w=Math.sin(Math.PI*u)**.72;
  for(const edge of [-1,1]){
   streamPositions.push(x,.07*Math.sin(x*1.8)+edge*.12*w,.84*w+.075);
   streamUvs.push(u,(edge+1)/2);
  }
  if(i){const j=i*2;streamIndices.push(j-2,j-1,j,j,j-1,j+1);}
 }
 const streamGeo=new T.BufferGeometry();streamGeo.setAttribute('position',new T.Float32BufferAttribute(streamPositions,3));
 streamGeo.setAttribute('uv',new T.Float32BufferAttribute(streamUvs,2));streamGeo.setIndex(streamIndices);
 const stream=new T.Mesh(streamGeo,new T.ShaderMaterial({uniforms:gas.material.uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
  vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 v;uniform float time;void main(){float edge=abs(v.y*2.-1.);
   float flow=.76+.24*sin(v.x*62.-time*5.+sin(v.x*18.));
   gl_FragColor=vec4(mix(vec3(1.,.18,.012),vec3(1.,.95,.62),exp(-edge*3.)),(1.-edge*edge)*flow);}`}));
 portal.add(stream);
 const flareMat=line(0xffc45d,1),jets=new T.InstancedMesh(new T.ConeGeometry(1,1,4,1),flareMat,44);
 jets.frustumCulled=false;root.add(jets);const up=new T.Vector3(0,1,0);

 const feathers=softParticles(T,120),threads=ribbons(T,420,{flow:10}),marks=groundDecals(T,5);
 root.add(feathers.mesh,threads.mesh,marks.mesh);
 const ruptures=Array.from({length:3},(_,i)=>{
  const m=new T.Mesh(arcGeometry(T,1,.032+i*.01,1,i+1),line([0xffc36a,0xff7230,0xc05438][i],1));root.add(m);return m;
 });
 // Polar ejecta twist around the pinch point. The bright spine and cooler
 // filaments share an open 3D surface, so the silhouette changes with the shot.
 const jetSurface=new T.CylinderGeometry(1,1,1,32,18,true);
 const pole=new T.Mesh(jetSurface,new T.ShaderMaterial({
  uniforms:{age:{value:0}},transparent:true,depthWrite:false,side:T.DoubleSide,
  blending:T.AdditiveBlending,toneMapped:false,
  vertexShader:`varying vec2 v;uniform float age;void main(){
   v=uv;float h=uv.y,a=atan(position.z,position.x);
   float width=.20+.62*pow(h,2.)+.76*exp(-15.*h);
   width*=1.+.18*sin(a*5.+h*21.-age*7.);
   vec3 p=vec3(position.x*width,h,position.z*width);
   p.x+=h*h*.28*sin(h*8.-age*4.);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
  fragmentShader:`varying vec2 v;uniform float age;void main(){
   float a=v.x*6.2831853,h=v.y;
   float twist=a*5.-h*24.+age*7.+1.1*sin(a*3.+h*14.-age*4.);
   float core=pow(.5+.5*cos(twist),4.);
   float fine=pow(.5+.5*cos(twist*3.+h*12.),8.);
   vec3 color=mix(vec3(.95,.10,.03),vec3(1.,.82,.52),core);
   color=mix(color,vec3(.80,.86,1.),fine*.85);
   float fade=(1.-smoothstep(.48,1.,h))*(1.-smoothstep(.48,1.48,age));
   gl_FragColor=vec4(color,fade*(.36+core*.6+fine*.3));}`}));
 pole.frustumCulled=false;root.add(pole);
 const shockDisc=new T.Mesh(gas.geometry,gas.material.clone());root.add(shockDisc);
 const debris=new T.InstancedMesh(new T.TetrahedronGeometry(.11),new T.MeshStandardMaterial({color:0x59414a,roughness:.85}),36);debris.frustumCulled=false;root.add(debris);
 const pose=new T.Object3D(),start=new T.Vector3(),aim=new T.Vector3(),p=new T.Vector3(),q=new T.Vector3(),rot=new T.Quaternion(),roll=new T.Quaternion(),axis=new T.Vector3(0,0,1);
 const normal=[0,1,0],ember=[1,.17,.025,.8],gold=[1,.78,.33,.9],dim=[.65,.82,1,.55],clear=[1,.06,.015,0];
 let wingMesh=null,fullWing,lowWing;
 const hinge={value:0},sweep={value:0},backScale=new T.Vector3();
 function setWings(obj){
  obj.traverse(m=>{if(m.isMesh)wingMesh=m;});if(!wingMesh)return;
  fullWing=wingMesh.geometry;
  if(!fullWing.attributes.normal)fullWing.computeVertexNormals();
  wingMesh.material=wingMesh.material.clone();wingMesh.frustumCulled=false;
  wingMesh.material.metalness=.12;wingMesh.material.roughness=.6;
  wingMesh.material.emissive.setHex(0x9facae);wingMesh.material.emissiveIntensity=.30;
  wingMesh.material.emissiveMap=wingMesh.material.map;
  wingMesh.material.onBeforeCompile=shader=>{
   shader.uniforms.hinge=hinge;shader.uniforms.sweep=sweep;
   shader.vertexShader='uniform float hinge,sweep;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    float span=abs(position.x), side=sign(position.x);
    float bend=hinge+sin(sweep-span*3.)*.22*smoothstep(.04,.48,span);
    transformed.x=side*(span*cos(bend)+position.z*sin(bend));
    transformed.z=position.z*cos(bend)-span*sin(bend);`);
  };
  wings.add(obj);wings.name='AsasAnjo_leve';wings.userData.asset='AsasAnjo_leve.glb';
 }
 function update(s,camera,quality=1,hero=null){
  root.visible=s.active;if(!root.visible)return;
  const t=s.time,o=s.source,g=s.contact||s.target,low=quality===0,dx=g.x-o.x,dz=g.z-o.z,len=Math.hypot(dx,dz)||1,fx=dx/len,fz=dz/len;
  const rise=smooth((t-.8)/2.8),land=smooth((t-14.3)/2.7),alt=hero?.alt??10;
  const y=hero?.pos.y??o.y+1.3+alt*rise*(1-land);
  threads.begin(camera,t);feathers.begin();marks.begin();
  const open=smooth(t/.85)*(1-smooth((t-14.6)/2.2)),flap=Math.sin(t*4.65)*(.07+.58*(1-smooth((t-2.3)/.9)));
  wings.visible=!!hero&&open>.015&&!!wingMesh;
  if(hero){
   if(hero.back&&wings.parent!==hero.back){
    wings.removeFromParent();wings.position.copy(hero.pos);wings.rotation.set(0,hero.yaw,0);wings.scale.setScalar(1);wings.updateMatrixWorld(true);hero.back.attach(wings);
   }
   if(wingMesh){wingMesh.geometry=quality<2&&lowWing?lowWing:fullWing;hero.back?.getWorldScale(backScale);
    wings.scale.setScalar(4.3*(.28+.72*open)/Math.max(.001,backScale.x||1));hinge.value=(1-open)*1.15+flap*.75;sweep.value=t*4.65;}
   for(let i=0;i<(low?8:20);i++){const age=t-(.68+(i%2)*1.32+Math.floor(i/2)*.065);if(age<0||age>3)continue;const side=i%2?1:-1;
    feathers.add(hero.pos.x+side*Math.cos(hero.yaw)*(.6+age*.5),y+.4-age*.85+hash(i)*.45,hero.pos.z-side*Math.sin(hero.yaw)*(.6+age*.5)+Math.sin(age+i)*.23,.035,.24,1,.83,.55,(1-age/3)*.8,3,age+i,i);}
   if(t<11)for(let j=0;j<(low?12:24);j++)for(let i=0;i<7;i++){
    const strand=(k,out)=>{const u=k/7,side=j%2?1:-1,phase=j*.31+t*.85;
     const span=side*(.18+u*u*(.52+hash(j)*1.15))+.07*Math.sin(phase+u*3.);
     const depth=-.19-u*.14+.04*Math.cos(phase+u*5.);
     out.set(hero.pos.x+Math.cos(hero.yaw)*span+Math.sin(hero.yaw)*depth,
      y-1.05+u*(1.55+hash(j+5)*.95),hero.pos.z-Math.sin(hero.yaw)*span+Math.cos(hero.yaw)*depth);};
    strand(i,p);strand(i+1,q);threads.seg(p.x,p.y,p.z,q.x,q.y,q.z,.009,.012,dim,gold);}

  }
  const grow=smooth((t-5)/4.9),flight=Math.min(1,Math.max(0,(t-11)/2))**1.65;
  start.copy(s.release||hero?.hand||o);aim.set(g.x,g.y,g.z);
  portal.position.copy(s.shot||start);
  const since=s.contact?t-s.contact.time:-1,collapse=smooth(since/.20);
  const radius=(.024+.085*smooth((t-3)/1.05)+grow*.22+flight*.65)*(1-collapse);
  portal.visible=t>=3&&collapse<1;portal.scale.setScalar(radius);
  rot.copy(camera.quaternion);roll.setFromAxisAngle(axis,-.11+.53*smooth((t-10.4)/1.4));rot.multiply(roll);portal.quaternion.copy(camera.quaternion).slerp(rot,.9);
  disc.rotation.x=1.27-.20*Math.sin(t*.62)-.28*flight;gas.material.uniforms.time.value=t;portal.updateMatrixWorld(true);
  if(portal.visible){for(let i=0;i<(low?16:40);i++){
   const speed=.5+hash(i)*.9,a=i*2.4+t*speed,r=1.05+hash(i*5)*1.9;
   p.set(r*Math.cos(a),r*Math.sin(a),.03);q.set(r*Math.cos(a+.035*speed),r*Math.sin(a+.035*speed),.03);
   disc.localToWorld(p);disc.localToWorld(q);threads.seg(p.x,p.y,p.z,q.x,q.y,q.z,.014*radius,.007*radius,gold,clear);}
   if(flight>0){for(let i=0;i<4;i++){const a=i*1.57+t*4;p.copy(portal.position);p.x+=Math.cos(a)*radius*.5;p.z+=Math.sin(a)*radius*.5;q.copy(p).lerp(start,.3*flight);threads.seg(p.x,p.y,p.z,q.x,q.y,q.z,radius*.22,.01,ember,clear);}}
  }
  const cover=smooth((t-1)/3)*(1-smooth((t-13)/3));
  veil.visible=cover>0;veil.position.copy(camera.position);veil.scale.setScalar(Math.min(380,camera.far*.8));
  veil.material.uniforms.age.value=t;veil.material.uniforms.cover.value=cover;
  veil.material.uniforms.opening.value.copy(portal.position).sub(camera.position).normalize();
  const age=s.contact?t-s.contact.time-.20:-1,gy=ground(g.x,g.z),n=groundNormal(ground,g.x,g.z,normal),R=WHITE_HOLE.radius;
  if(t>=10&&age<0)marks.add(g.x,gy,g.z,R/.86,1,.31,.08,.3+.14*Math.sin(t*6),0,.2,8,n);
  pole.visible=age>=0&&age<1.48;
  shockDisc.visible=pole.visible;
  if(pole.visible){
   const bloom=easeOut(Math.min(1,(age+.025)/.46)),fade=1-smooth((age-.65)/.83);
   pole.position.copy(aim);pole.scale.set(1.75*bloom*fade,12*bloom,1.75*bloom*fade);
   pole.material.uniforms.age.value=age;
   shockDisc.position.copy(aim);shockDisc.position.y+=.22;
   shockDisc.rotation.set(-1.28,.16,age*.74);
   shockDisc.scale.setScalar((.18+1.7*bloom)*Math.max(.015,fade));
   shockDisc.material.uniforms.time.value=18+age*4.;
  }
  for(let j=0;j<ruptures.length;j++){
   const band=ruptures[j],k=(age-j*.09)/1.5;band.visible=k>=0&&k<1;
   if(band.visible){const r=.12+(8+j*2)*easeOut(k);band.position.copy(aim);band.position.y+=k*k*(3+j);
    band.rotation.set(-1.13+j*.5,.32*j,.5*j+k*.65);band.scale.set(r*(1+.45*k),r*(1-.45*k),r);
    band.material.opacity=.53*(1-k)**1.4;}
  }
  jets.count=age>=0&&age<.95?(low?22:44):0;
  if(jets.count){
   const k=age/.95;
   for(let i=0;i<jets.count;i++){
    const a=i*2.39996,el=.06+hash(i+9)*1.38;
    p.set(Math.cos(a)*Math.cos(el),Math.sin(el),Math.sin(a)*Math.cos(el));
    const reach=(3+hash(i+2)*8)*easeOut(Math.min(1,k*2.1)),width=(.035+.09*hash(i+7))*(1-k);
    pose.position.copy(aim).addScaledVector(p,reach*(.5+k*.42));pose.quaternion.setFromUnitVectors(up,p);
    pose.scale.set(width,reach*(1-k),width*.62);pose.updateMatrix();jets.setMatrixAt(i,pose.matrix);
   }
   jets.instanceMatrix.needsUpdate=true;flareMat.opacity=1-k*k;
  }
  // Gas torn out of the equatorial plane curls into two opposite polar streams.
  if(age>=0&&age<1.65){
   const k=age/1.65;
   for(let j=0;j<(low?7:14);j++){
    const a0=j*2.39996,r=(.45+3.8*Math.sin(Math.PI*k))*(.62+.38*hash(j+2));
    const polar=(u,out)=>{const a=a0+u*(3.8-2*k)+k*3,rr=r*(1-u*.65);
     out.set(aim.x+Math.cos(a)*rr,aim.y+u*(2+12*easeOut(k))*(.7+.3*hash(j)),aim.z+Math.sin(a)*rr);};
    for(let i=0;i<8;i++){polar(i/8,p);polar((i+1)/8,q);
     threads.seg(p.x,p.y,p.z,q.x,q.y,q.z,.095*(1-k),.035*(1-k),j%3?ember:gold,ember);}
   }
  }
  debris.count=age>0&&age<1.65?(low?12:36):0;
  if(age>=0&&age<1.65){const k=age/1.65,travel=easeOut(k);
   marks.add(g.x,gy,g.z,R*travel/.86,1,.40,.09,1-k,0,k,5,n);
   feathers.add(g.x,g.y+.4,g.z,4.6*(1-k),4.6*(1-k),1,.85,.41,Math.exp(-age*3),0);
   for(let i=0;i<(low?16:38);i++){const a=i*2.4,h=.08+hash(i)*1.1,x=Math.cos(a),z=Math.sin(a),r=(3+hash(i+7)*7)*travel;
    threads.seg(g.x+x*r*.62,g.y+.4+h*r*.62,g.z+z*r*.62,g.x+x*r,g.y+.4+h*r,g.z+z*r,.047*(1-k),.004, gold,clear);}
   for(let i=0;i<debris.count;i++){const a=i*2.4,r=(2+hash(i+2)*5)*travel;pose.position.set(g.x+Math.cos(a)*r,gy+.1+Math.sin(k*Math.PI)*(1+hash(i)*3),g.z+Math.sin(a)*r);pose.rotation.set(k*7+i,a,k*4);pose.scale.setScalar(1-k);pose.updateMatrix();debris.setMatrixAt(i,pose.matrix);}debris.instanceMatrix.needsUpdate=true;
  }
  threads.end();marks.end(t);feathers.end();
 }
 return {root,update,setWings,get ready(){return !!wingMesh;},setWingLOD(obj){obj.traverse(m=>{if(m.isMesh)lowWing=m.geometry;});},audit(){return {asset:wings.userData.asset,lodReady:!!lowWing,attached:!!wings.parent?.isBone,visible:wings.visible,triangles:wingMesh?.geometry.index.count/3,orb:portal.position.toArray()};},clear(){root.visible=false;wings.visible=false;root.attach(wings);},dispose(){scene.remove(root);threads.dispose();feathers.dispose();marks.dispose();debris.dispose();jets.dispose();for(const m of [jets,pole,stream,gas,lens,photon,horizon,...ruptures,debris,veil]){m.geometry.dispose();m.material.dispose();}shockDisc.material.dispose();lowWing?.dispose();wings.removeFromParent();wings.traverse(o=>{if(o.isMesh)o.material.dispose();});}};
}
