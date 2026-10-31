import {dragonHead,dragonBody} from './vfx-dragon-model3d.js?v=mod241-gemini-vfx-fixed';
import {energyBody,energyMaterial,flameGeometry} from './vfx-flow3d.js?v=mod241-gemini-vfx-fixed';
import {volumeTrail} from './vfx-trail3d.js?v=mod241-gemini-vfx-fixed';
import {impactDirector} from './vfx-impact3d.js?v=mod241-gemini-vfx-fixed';
import {softParticles,ribbons,smooth,hash} from './celestial-fxkit3d.js?v=mod241-gemini-vfx-fixed';
import {DRAGON} from './skill-judgment-dragon3d.js?v=mod236-vfx2';
/** Celestial fire creature, authored as a flowing silhouette, with a physical cinder projectile.
 * MOD 238: bola de fogo DOURADA e turbulenta (massa de línguas de chama que muda de forma, núcleo branco-quente,
 * compressão pulsante antes do disparo), explosão enorme na mordida (camadas de impacto, corona, onda de calor) e rastro
 * de FOGO VIVO no chão seguindo o caminho real da cabeça — línguas de chama instanciadas que nascem, crescem e se apagam. */
export function createDragonVFX(T,scene,{ground=()=>0}={}){
 const root=new T.Group();root.name='DragaoJulgamento';root.visible=false;scene.add(root);
 const head=dragonHead(T,root),body=dragonBody(T,root),fire=energyBody(T,root,'celestial',{tail:1.5,rings:34,sides:20,warp:.32}),corona=energyBody(T,root,'cinder',{tail:2.2,rings:26,sides:14,warp:.24,seed:5});
 const flameGeo=flameGeometry(T),flameMat=energyMaterial(T,'celestial',{alpha:.94,warp:.04,frequency:.35,flame:1}),ballFlames=new T.InstancedMesh(flameGeo,flameMat,48),
  groundFire=new T.InstancedMesh(flameGeo,energyMaterial(T,'cinder',{alpha:.92,warp:.04,frequency:.32,flame:1}),160),fireMarks=Array.from({length:160},()=>({x:0,y:0,z:0,t:-99,s:1})),fireCrown=new T.Group(),dummy=new T.Object3D();fireCrown.add(ballFlames);root.add(fireCrown);ballFlames.frustumCulled=false;
 groundFire.frustumCulled=false;root.add(groundFire);let markHead=0,lastMark=null,ballMarkT=-1,biteMarkT=-1;
 // Placas de rocha 3D erguidas pelo rastro de fogo do dragão.
 const rockGeo=new T.CylinderGeometry(.38,.56,.22,6,1);rockGeo.translate(0,.06,0);
 const rockMat=new T.MeshBasicMaterial({color:0x160705});
 const groundRocks=new T.InstancedMesh(rockGeo,rockMat,120);
 groundRocks.frustumCulled=false;groundRocks.count=0;root.add(groundRocks);
 const trail=volumeTrail(T,root,'cinder',{capacity:44,life:.9,radius:1.1}),impacts=impactDirector(T,root,ground,{capacity:4});
 const sparks=softParticles(T,160),smoke=softParticles(T,48,{additive:false}),filaments=ribbons(T,180,{flow:13});root.add(sparks.mesh,smoke.mesh,filaments.mesh);
 const forward=new T.Vector3(),side=new T.Vector3(),up=new T.Vector3(),worldUp=new T.Vector3(0,1,0),m=new T.Matrix4(),point=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),mouth=new T.Vector3();let last=-1;
 function clear(){root.visible=false;last=-1;trail.clear();impacts.clear();for(const m of fireMarks)m.t=-99;lastMark=null;groundFire.count=0;groundRocks.count=0;}
 function update(s,camera,quality=1){if(!s.active){if(last>=0)clear();return;}root.visible=true;if(s.time<last){impacts.clear();trail.clear();for(const mk of fireMarks)mk.t=-99;lastMark=null;}last=s.time;
  const t=s.time,A=s.age,ph=s.phase,low=quality===0,fade=ph==='explode'?1-smooth(A/1.25):1;
  sparks.begin();smoke.begin();filaments.begin(camera,t);
  head.root.visible=ph!=='channel'&&fade>.03;head.root.position.set(s.head.x,s.head.y,s.head.z);
  forward.set(s.dir.x,s.dir.y,s.dir.z).normalize();if(forward.lengthSq()<.01)forward.set(0,0,1);side.crossVectors(worldUp,forward).normalize();if(side.lengthSq()<.01)side.set(1,0,0);up.crossVectors(forward,side);m.makeBasis(side,up,forward);head.root.quaternion.setFromRotationMatrix(m);
  const form=ph==='form'?smooth(A/.55):1;head.root.scale.setScalar(s.scale*(.18+.82*form));head.material.uniforms.dissolve.value=1-fade;head.update(t,s.mouth,quality);head.root.updateWorldMatrix(true,true);
  body.update(s,fade,quality);body.mesh.visible=ph!=='channel'&&body.mesh.visible;
  if(ph==='channel'||ph==='form'){
   const charge=ph==='channel'?smooth(A/DRAGON.channel):1-smooth(A/.8),src=s.source;
   for(let i=0;i<(low?12:22);i++){const u=(i/22+t*.4)%1,ang=i*2.4+t*.8,r=(1-u)*1.1;const C=i%2?[.95,.04,.06]:[1,.65,.12];sparks.add(src.x+Math.cos(ang)*r,src.y+.2+u*3.5,src.z+Math.sin(ang)*r,.045,.24,...C,charge*(1-u)*.6,3,ang,i);}
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
   const squash=charging?1+.18*Math.sin(A*26)*(1-k*.4):1+.08*Math.sin(t*19);// compressão pulsante antes do disparo
   fire.update(t,{position:pos,dir,radius:1.55*k*squash,length:1.25*k/squash,quality,alpha:.98});corona.update(t,{position:pos,dir,radius:2.05*k,length:1.55*k,quality,alpha:.62,dissolve:.22});
   sparks.add(pos.x,pos.y,pos.z,2.4*k,2.4*k,1,.95,.75,.9,0);sparks.add(pos.x,pos.y,pos.z,4.6*k,4.6*k, .95,.22,.04,.45,0);
   fireCrown.position.set(pos.x,pos.y,pos.z);fireCrown.quaternion.copy(fire.mesh.quaternion);fireCrown.scale.setScalar(k);flameMat.uniforms.time.value=t;ballFlames.count=low?20:44;
   // massa turbulenta: línguas em todas as direções (esfera de Fibonacci) que pulsam, giram e são varridas para trás pelo voo
   for(let i=0;i<ballFlames.count;i++){const n=ballFlames.count,yy=1-2*(i+.5)/n,rr=Math.sqrt(1-yy*yy),ph=i*2.39996+t*1.7,w=Math.sin(t*8+i*1.3),back=Math.max(0,-yy);dummy.position.set(Math.cos(ph)*rr*.8,Math.sin(ph)*rr*.8,yy*.8-back*.5);dummy.lookAt(Math.cos(ph)*rr*3,Math.sin(ph)*rr*3,yy*3-2.5*(flying?1:.3));dummy.rotateX(Math.PI/2);dummy.scale.set(1.5+.5*w,1.3+.9*Math.abs(w)+back*1.4,1.3);dummy.updateMatrix();ballFlames.setMatrixAt(i,dummy.matrix);}ballFlames.instanceMatrix.needsUpdate=true;
   forward.set(dir.x,dir.y,dir.z).normalize();side.crossVectors(worldUp,forward).normalize();up.crossVectors(forward,side);
   for(let i=0;i<(low?9:18);i++){const age=(t*2+hash(i))%1,angle=i*2.4,r=.8+age*.9;point.set(pos.x,pos.y,pos.z).addScaledVector(side,Math.cos(angle)*r).addScaledVector(up,Math.sin(angle)*r).addScaledVector(forward,-age*3);sparks.add(point.x,point.y,point.z,.06,.35,1,.25,.015,(1-age)*.6,3,angle,i);}
  }
  if(flying)for(let i=0;i<(low?4:8);i++){const age=(t*.8+hash(i+40))%1,p=s.ball.p,d=s.ball.direction;smoke.add(p.x-d.x*age*4,p.y-d.y*age*4+.2,p.z-d.z*age*4,.4+age,.6+age,.25,.04,.02,(1-age)*.35,1,i,i);}
  trail.update(t,s.ball.p,flying,quality);
  if(s.ball.impactTime>=0){impacts.emit({id:'fireball-'+s.ball.impactTime,time:s.ball.impactTime,point:s.ball.at,size:4.8,preset:'celestial',kind:'ball'});impacts.emit({id:'fireball-cinder-'+s.ball.impactTime,time:s.ball.impactTime+.06,point:s.ball.at,size:3.6,preset:'cinder',kind:'ball',dir:{x:0,y:1,z:0}});}
  // rastro de fogo no chão: marca o caminho real da cabeça quando ela passa baixa (avanço, mordida) e onde a bola cai
  if(['advance','engulf','compress'].includes(ph)&&head.root.visible){const gy=ground(s.head.x,s.head.z);if(s.head.y-gy<s.scale*2.6&&(!lastMark||Math.hypot(s.head.x-lastMark.x,s.head.z-lastMark.z)>.7)){const m=fireMarks[markHead++%fireMarks.length];Object.assign(m,{x:s.head.x+(hash(markHead)-.5)*1.4,y:gy,z:s.head.z+(hash(markHead*3)-.5)*1.4,t,s:1.2+hash(markHead*7)*1.2});lastMark={x:s.head.x,z:s.head.z};}}
  if(s.ball.impactTime>=0&&ballMarkT!==s.ball.impactTime){ballMarkT=s.ball.impactTime;for(let i=0;i<10;i++){const m=fireMarks[markHead++%fireMarks.length],a=i*.63;Object.assign(m,{x:s.ball.at.x+Math.cos(a)*(1+hash(i)*1.6),y:ground(s.ball.at.x,s.ball.at.z),z:s.ball.at.z+Math.sin(a)*(1+hash(i)*1.6),t:s.ball.impactTime,s:1+hash(i*5)*.8});}}
  if(ph==='explode'&&biteMarkT!==t-A){biteMarkT=t-A;for(let i=0;i<22;i++){const m=fireMarks[markHead++%fireMarks.length],a=i*.29,r=1.2+hash(i+3)*3.6;Object.assign(m,{x:s.at.x+Math.cos(a)*r,y:ground(s.at.x+Math.cos(a)*r,s.at.z+Math.sin(a)*r),z:s.at.z+Math.sin(a)*r,t:t-A,s:1.5+hash(i*9)*1.6});}}
  {
   let gc=0,rc=0;groundFire.material.uniforms.time.value=t;
   for(const mk of fireMarks){
    const age=t-mk.t;if(age<0||age>3.6)continue;
    const grow=smooth(age/.25)*(1-smooth((age-2.4)/1.2));
    for(let j=0;j<(low?1:2)&&gc<160;j++){
     dummy.position.set(mk.x+(j?.35:0),mk.y,mk.z+(j?-.25:0));
     dummy.rotation.set(Math.sin(t*3+mk.x)*.15,mk.x*3+j,Math.cos(t*4+mk.z)*.15);
     const h=mk.s*grow*(1+.25*Math.sin(t*9+mk.z+j));
     dummy.scale.set(h*1.4,h*1.6,h*1.4);dummy.updateMatrix();
     if(gc<160)groundFire.setMatrixAt(gc++,dummy.matrix);
    }
    if(rc<120){
     dummy.position.set(mk.x,mk.y-.04+grow*.12,mk.z);
     dummy.rotation.set(.35*grow,mk.x*2.1,-.28*grow);
     const rs=mk.s*(.65+.35*grow);dummy.scale.set(rs*1.2,rs*.9,rs);
     dummy.updateMatrix();groundRocks.setMatrixAt(rc++,dummy.matrix);
    }
    if(gc>=160)break;
   }
   groundFire.count=gc;groundFire.instanceMatrix.needsUpdate=true;
   groundRocks.count=rc;groundRocks.instanceMatrix.needsUpdate=true;
  }
  if(ph==='compress'){
   for(let i=0;i<(low?8:18);i++){const u=(i/18+t*1.2)%1,angle=i*2.4,r=(1-u)*2.5;sparks.add(s.at.x+Math.cos(angle)*r,s.at.y+Math.sin(angle*1.4)*r,s.at.z+Math.sin(angle)*r,.05,.2,1,.6,.08,u*.55,3,angle,i);}
  }
  if(ph==='explode'){impacts.emit({id:'dragon-end-'+(t-A),time:t-A,point:s.at,size:9.5,preset:'celestial',kind:'dragon'});impacts.emit({id:'dragon-cinder-'+(t-A),time:t-A+.1,point:s.at,size:6,preset:'cinder',kind:'ball',dir:{x:.2,y:1,z:0}});impacts.emit({id:'dragon-corona-'+(t-A),time:t-A+.28,point:{x:s.at.x,y:s.at.y+1.5,z:s.at.z},size:7.5,preset:'celestial',kind:'ball',dir:{x:0,y:1,z:0}});
   // explosão enorme da mordida: clarão contido, corona e onda de calor com brasas saindo em todas as direções
   const e=smooth(A/.5),k=1-smooth(A/1.2);sparks.add(s.at.x,s.at.y+1,s.at.z,10*e+2,10*e+2,1,.85,.45,.85*k,0);sparks.add(s.at.x,s.at.y+1,s.at.z,4*(1-e)+.5,4*(1-e)+.5,1,1,.95,k,0);
   for(let i=0;i<(low?24:60);i++){const a=i*2.39996,el=(hash(i)-.3)*1.3,d=(3+hash(i*3)*9)*smooth(A/.9);sparks.add(s.at.x+Math.cos(a)*Math.cos(el)*d,s.at.y+1+Math.sin(el)*d-2*A*A,s.at.z+Math.sin(a)*Math.cos(el)*d,.08,.6,1,.65+hash(i)*.3,.15,k,3,a+1.57,i);}}
  impacts.update(t,quality);sparks.end();smoke.end();filaments.end();
 }
 return{root,update,clear,stats:()=>({bodyTriangles:4096,fireball:root.visible&&fire.mesh.visible,impacts:impacts.stats()}),dispose(){scene.remove(root);head.dispose();body.dispose();flameGeo.dispose();flameMat.dispose();ballFlames.dispose();groundFire.dispose();groundFire.material.dispose();rockGeo.dispose();rockMat.dispose();groundRocks.dispose();fire.dispose();corona.dispose();trail.dispose();impacts.dispose();sparks.dispose();smoke.dispose();filaments.dispose();}};
}
