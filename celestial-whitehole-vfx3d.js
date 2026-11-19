// The event horizon, orbiting gas and bent light occupy separate depth planes.
import {softParticles,ribbons,groundDecals,groundNormal,smooth,easeOut,hash} from './celestial-fxkit3d.js';
import {WHITE_HOLE,throwPosition} from './celestial-whitehole3d.js';
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
 gl_FragColor=vec4(emission,lumin);
}`;
function arcGeometry(T,radius,width,lift){
 const v=[],ix=[];
 for(let i=0;i<=96;i++){const a=TAU*i/96;
  for(const side of [-1,1]){const r=radius+width*side;v.push(Math.cos(a)*r,Math.sin(a)*r*lift,.12*Math.cos(a));}
  if(i){const j=i*2;ix.push(j-2,j-1,j,j,j-1,j+1);}
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
 const sockets=[new T.Group(),new T.Group()];wings.add(...sockets);
 const feathers=softParticles(T,120),threads=ribbons(T,420,{flow:10}),marks=groundDecals(T,5);
 root.add(feathers.mesh,threads.mesh,marks.mesh);
 const shell=new T.Mesh(new T.IcosahedronGeometry(1,2),new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  uniforms:{age:{value:0}},vertexShader:'varying vec3 n,v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);v=-p.xyz;n=normalMatrix*normal;gl_Position=projectionMatrix*p;}',
  fragmentShader:'varying vec3 n,v;uniform float age;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(1.,.11+.48*(1.-age),.026,rim*(1.-age));}'}));root.add(shell);
 const debris=new T.InstancedMesh(new T.TetrahedronGeometry(.11),new T.MeshStandardMaterial({color:0x59414a,roughness:.85}),36);debris.frustumCulled=false;root.add(debris);
 const pose=new T.Object3D(),start=new T.Vector3(),aim=new T.Vector3(),p=new T.Vector3(),q=new T.Vector3(),rot=new T.Quaternion(),roll=new T.Quaternion(),axis=new T.Vector3(0,0,1);
 const normal=[0,1,0],ember=[1,.17,.025,.8],gold=[1,.78,.33,.9],dim=[.18,.13,.48,.08],clear=[1,.06,.015,0];
 let modelLoaded=false;
 function setWings(obj){
  if(modelLoaded)return;
  const halves=['AsaDireita','AsaEsquerda'].map(n=>obj.getObjectByName(n));if(halves.some(h=>!h))return;
  halves.forEach((half,i)=>{const mesh=half.clone();mesh.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.roughness=.63;o.material.metalness=.09;
   o.material.onBeforeCompile=shader=>{shader.uniforms.wingBeat=beat;shader.vertexShader='uniform float wingBeat;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=sin(wingBeat-abs(position.x)*.8)*.11*abs(position.x);');};}});sockets[i].add(mesh);});modelLoaded=true;
 }
 const beat={value:0};
 function update(s,camera,quality=1,hero=null){
  root.visible=s.active;if(!root.visible)return;
  const t=s.time,o=s.source,g=s.target,low=quality===0,dx=g.x-o.x,dz=g.z-o.z,len=Math.hypot(dx,dz)||1,fx=dx/len,fz=dz/len;
  const rise=smooth((t-.8)/2.8),land=smooth((t-14.3)/2.7),alt=hero?.alt??10;
  const y=hero?.pos.y??o.y+1.3+alt*rise*(1-land);
  threads.begin(camera,t);feathers.begin();marks.begin();
  const open=smooth(t/.85)*(1-smooth((t-14.6)/2.2)),flap=Math.sin(t*4.65)*(.07+.58*(1-smooth((t-2.3)/.9)));
  wings.visible=!!hero&&open>.015&&modelLoaded;
  if(hero){
   wings.position.copy(hero.pos);wings.rotation.y=hero.yaw;wings.scale.setScalar((hero.scale||1)*(.2+.8*open));beat.value=t*4.65;
   sockets.forEach((socket,i)=>{const side=i?1:-1;socket.rotation.set(.07,side*((1-open)*1.35+flap*.72),side*(.12+flap*.43));});
   for(let i=0;i<(low?8:20);i++){const age=t-(.68+(i%2)*1.32+Math.floor(i/2)*.065);if(age<0||age>3)continue;const side=i%2?1:-1;
    feathers.add(wings.position.x+side*Math.cos(hero.yaw)*(.6+age*.5),y+.4-age*.85+hash(i)*.45,wings.position.z-side*Math.sin(hero.yaw)*(.6+age*.5)+Math.sin(age+i)*.23,.035,.24,1,.83,.55,(1-age/3)*.8,3,age+i,i);}
   if(t<5)for(let j=0;j<(low?5:9);j++)for(let i=0;i<8;i++){
    const strand=(k,out)=>{const u=k/8,a=t*3+j*2.4+u*2.6,r=(1-u)*1.4+.06;out.set(wings.position.x+r*Math.cos(a),y-1.3+1.5*u,wings.position.z+r*Math.sin(a));};
    strand(i,p);strand(i+1,q);threads.seg(p.x,p.y,p.z,q.x,q.y,q.z,.032,.015,dim,gold);}
  }
  const grow=smooth((t-5)/4.9),flight=Math.min(1,Math.max(0,(t-11)/2))**1.65;
  const reach=.55+grow*2.6,lift=.25+grow*Math.min(alt*.65,5);
  start.set(o.x+fx*reach,o.y+1.5+alt+lift,o.z+fz*reach);
  if(hero?.hand&&t<11){start.lerp(hero.hand,1-grow);start.x+=fx*.18*(1-grow);start.z+=fz*.18*(1-grow);}
  aim.set(g.x,g.y+.32,g.z);
  if(t<11)portal.position.copy(start);else throwPosition(portal.position,o,g,alt,flight);
  const radius=(.018+.32*smooth((t-3)/1.05)+grow*Math.min(3.3,alt*.30))*(1-.86*smooth((t-12.65)/.35));
  portal.visible=t>=3&&t<13;portal.scale.setScalar(radius);
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
  const age=t-13,gy=ground(g.x,g.z),n=groundNormal(ground,g.x,g.z,normal),R=WHITE_HOLE.radius;
  if(t>=10&&age<0)marks.add(g.x,gy,g.z,R/.86,1,.31,.08,.3+.14*Math.sin(t*6),0,.2,8,n);
  shell.visible=age>=0&&age<1.2;
  if(shell.visible){const k=age/1.2;shell.position.copy(aim);shell.scale.setScalar(.14+R*easeOut(k));shell.material.uniforms.age.value=k;}
  debris.count=age>0&&age<1.65?(low?12:36):0;
  if(age>=0&&age<1.65){const k=age/1.65,travel=easeOut(k);
   marks.add(g.x,gy,g.z,R*travel/.86,1,.40,.09,1-k,0,k,5,n);
   feathers.add(g.x,g.y+.4,g.z,2*(1-k),2*(1-k),1,.87,.48,Math.exp(-age*6),0);
   for(let i=0;i<(low?16:38);i++){const a=i*2.4,h=.08+hash(i)*1.1,x=Math.cos(a),z=Math.sin(a),r=(3+hash(i+7)*7)*travel;
    threads.seg(g.x+x*r*.62,g.y+.4+h*r*.62,g.z+z*r*.62,g.x+x*r,g.y+.4+h*r,g.z+z*r,.047*(1-k),.004, gold,clear);}
   for(let i=0;i<debris.count;i++){const a=i*2.4,r=(2+hash(i+2)*5)*travel;pose.position.set(g.x+Math.cos(a)*r,gy+.1+Math.sin(k*Math.PI)*(1+hash(i)*3),g.z+Math.sin(a)*r);pose.rotation.set(k*7+i,a,k*4);pose.scale.setScalar(1-k);pose.updateMatrix();debris.setMatrixAt(i,pose.matrix);}debris.instanceMatrix.needsUpdate=true;
  }
  threads.end();marks.end(t);feathers.end();
 }
 return {root,update,setWings,clear(){root.visible=false;},dispose(){scene.remove(root);threads.dispose();feathers.dispose();marks.dispose();debris.dispose();for(const m of [gas,lens,photon,horizon,shell,debris,veil]){m.geometry.dispose();m.material.dispose();}wings.traverse(o=>{if(o.isMesh)o.material.dispose();});}};
}
