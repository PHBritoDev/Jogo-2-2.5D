import {dragonHead,dragonBody} from './vfx-dragon-model3d.js';
import {energyBody,energyMaterial,flameGeometry} from './vfx-flow3d.js';
import {volumeTrail} from './vfx-trail3d.js';
import {impactDirector} from './vfx-impact3d.js';
import {softParticles,ribbons,smooth,hash} from './celestial-fxkit3d.js';
import {DRAGON} from './skill-judgment-dragon3d.js';
/** Celestial fire creature, authored as a flowing silhouette, with a physical cinder projectile. */
export function createDragonVFX(T,scene,{ground=()=>0}={}){
 const root=new T.Group();root.name='DragaoJulgamento';root.visible=false;scene.add(root);
 const head=dragonHead(T,root),body=dragonBody(T,root),fire=energyBody(T,root,'cinder',{tail:1.5,rings:34,sides:20,warp:.18}),corona=energyBody(T,root,'celestial',{tail:2.2,rings:26,sides:14,warp:.24,seed:5});
 const flameGeo=flameGeometry(T),flameMat=energyMaterial(T,'cinder',{alpha:.92,warp:.025,frequency:.35,flame:1}),ballFlames=new T.InstancedMesh(flameGeo,flameMat,28),fireCrown=new T.Group(),dummy=new T.Object3D();fireCrown.add(ballFlames);root.add(fireCrown);ballFlames.frustumCulled=false;
 const trail=volumeTrail(T,root,'cinder',{capacity:44,life:.85,radius:.95}),impacts=impactDirector(T,root,ground,{capacity:4});
 const sparks=softParticles(T,160),smoke=softParticles(T,48,{additive:false}),filaments=ribbons(T,180,{flow:13});root.add(sparks.mesh,smoke.mesh,filaments.mesh);
 const forward=new T.Vector3(),side=new T.Vector3(),up=new T.Vector3(),worldUp=new T.Vector3(0,1,0),m=new T.Matrix4(),point=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),mouth=new T.Vector3();let last=-1;
 function clear(){root.visible=false;last=-1;trail.clear();impacts.clear();}
 function update(s,camera,quality=1){if(!s.active){if(last>=0)clear();return;}root.visible=true;if(s.time<last){impacts.clear();trail.clear();}last=s.time;
  const t=s.time,A=s.age,ph=s.phase,low=quality===0,fade=ph==='explode'?1-smooth(A/1.25):1;
  sparks.begin();smoke.begin();filaments.begin(camera,t);
  head.root.visible=ph!=='channel'&&fade>.03;head.root.position.set(s.head.x,s.head.y,s.head.z);
  forward.set(s.dir.x,s.dir.y,s.dir.z).normalize();if(forward.lengthSq()<.01)forward.set(0,0,1);side.crossVectors(worldUp,forward).normalize();if(side.lengthSq()<.01)side.set(1,0,0);up.crossVectors(forward,side);m.makeBasis(side,up,forward);head.root.quaternion.setFromRotationMatrix(m);
  const form=ph==='form'?smooth(A/.55):1;head.root.scale.setScalar(s.scale*(.18+.82*form));head.material.uniforms.dissolve.value=1-fade;head.update(t,s.mouth,quality);head.root.updateWorldMatrix(true,true);
  body.update(s,fade,quality);body.mesh.visible=ph!=='channel'&&body.mesh.visible;
  if(ph==='channel'||ph==='form'){
   const charge=ph==='channel'?smooth(A/DRAGON.channel):1-smooth(A/.8),src=s.source;
   for(let i=0;i<(low?12:22);i++){const u=(i/22+t*.4)%1,ang=i*2.4+t*.8,r=(1-u)*1.1;const C=i%2?[.7,.02,.09]:[.3,.02,.45];sparks.add(src.x+Math.cos(ang)*r,src.y+.2+u*3.5,src.z+Math.sin(ang)*r,.045,.24,...C,charge*(1-u)*.6,3,ang,i);}
  }
  if(head.root.visible){
   // Thin paired whiskers and fiery eyebrows follow the articulated head, not world axes.
   for(const sign of [-1,1]){a.set(sign*.32,.08,.7);head.root.localToWorld(a);for(let j=1;j<=14;j++){const u=j/14;b.set(sign*(.32+u*1.25),.08+.3*Math.sin(u*3.1)+Math.sin(t*4+u*9)*.06,.7-u*1.8);head.root.localToWorld(b);filaments.seg(a.x,a.y,a.z,b.x,b.y,b.z,.035*(1-u)*fade,.025*(1-u)*fade,[1,.55,.09,.75*fade],[1,.78,.28,.55*fade],u-.07,u);a.copy(b);}}
   for(let i=0;i<(low?20:40);i++){const j=5+Math.floor(hash(i)*115),p=body.centers[j],age=(t*.6+hash(i+10))%1,ang=i*2.4;const r=(1-j/128)*(1.2+age*1.2);sparks.add(p.x+Math.cos(ang)*r,p.y+age*1.8,p.z+Math.sin(ang)*r,.055,.25,1,.49,.05,(1-age)*fade*.6,3,ang,i);}
  }
  const charging=ph==='soar',flying=s.ball.active;
  fire.mesh.visible=corona.mesh.visible=fireCrown.visible=charging||flying;
  mouth.copy(head.root.position).addScaledVector(forward,s.scale*.68);
  if(charging||flying){const pos=charging?mouth:s.ball.p,dir=charging?forward:s.ball.direction,k=charging?smooth(A/DRAGON.soar):1;
   fire.update(t,{position:pos,dir,radius:1.4*k,length:1.1*k,quality,alpha:.98});corona.update(t,{position:pos,dir,radius:1.67*k,length:1.22*k,quality,alpha:.33,dissolve:.34});
   fireCrown.position.set(pos.x,pos.y,pos.z);fireCrown.quaternion.copy(fire.mesh.quaternion);fireCrown.scale.setScalar(k);flameMat.uniforms.time.value=t;ballFlames.count=low?12:24;
   for(let i=0;i<ballFlames.count;i++){const angle=i*2.39996,r=.72+(i%3)*.14;dummy.position.set(Math.cos(angle)*r,Math.sin(angle)*r,-.1-(i%3)*.3);dummy.rotation.set(-Math.PI/2+.25*Math.sin(t*6+i),0,-angle);dummy.scale.set(1.7,1.4+.4*Math.sin(t*7+i),1.3);dummy.updateMatrix();ballFlames.setMatrixAt(i,dummy.matrix);}ballFlames.instanceMatrix.needsUpdate=true;
   forward.set(dir.x,dir.y,dir.z).normalize();side.crossVectors(worldUp,forward).normalize();up.crossVectors(forward,side);
   for(let i=0;i<(low?9:18);i++){const age=(t*2+hash(i))%1,angle=i*2.4,r=.8+age*.9;point.set(pos.x,pos.y,pos.z).addScaledVector(side,Math.cos(angle)*r).addScaledVector(up,Math.sin(angle)*r).addScaledVector(forward,-age*3);sparks.add(point.x,point.y,point.z,.06,.35,1,.25,.015,(1-age)*.6,3,angle,i);}
  }
  if(flying)for(let i=0;i<(low?4:8);i++){const age=(t*.8+hash(i+40))%1,p=s.ball.p,d=s.ball.direction;smoke.add(p.x-d.x*age*4,p.y-d.y*age*4+.2,p.z-d.z*age*4,.4+age,.6+age,.075,.035,.025,(1-age)*.25,1,i,i);}
  trail.update(t,s.ball.p,flying,quality);
  if(s.ball.impactTime>=0)impacts.emit({id:'fireball',time:s.ball.impactTime,point:s.ball.at,size:3.8,preset:'cinder',kind:'ball'});
  if(ph==='compress'){
   for(let i=0;i<(low?8:18);i++){const u=(i/18+t*1.2)%1,angle=i*2.4,r=(1-u)*2.5;sparks.add(s.at.x+Math.cos(angle)*r,s.at.y+Math.sin(angle*1.4)*r,s.at.z+Math.sin(angle)*r,.05,.2,1,.6,.08,u*.55,3,angle,i);}
  }
  if(ph==='explode'){impacts.emit({id:'dragon-end',time:t-A,point:s.at,size:7,preset:'celestial',kind:'dragon'});impacts.emit({id:'dragon-cinder',time:t-A+.12,point:s.at,size:4.2,preset:'cinder',kind:'ball',dir:{x:.2,y:1,z:0}});}
  impacts.update(t,quality);sparks.end();smoke.end();filaments.end();
 }
 return{root,update,clear,stats:()=>({bodyTriangles:4096,fireball:root.visible&&fire.mesh.visible,impacts:impacts.stats()}),dispose(){scene.remove(root);head.dispose();body.dispose();flameGeo.dispose();flameMat.dispose();ballFlames.dispose();fire.dispose();corona.dispose();trail.dispose();impacts.dispose();sparks.dispose();smoke.dispose();filaments.dispose();}};
}
