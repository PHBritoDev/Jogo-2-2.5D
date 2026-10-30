/** Camera-space viewmodel cut from the ORIGINAL skinned arms; no second body draw.
 * Two-bone IK drives wrists and elbows together; sword is mounted at the real hand.
 * World damage remains authoritative and uses the same swing phase. */
export function createSwordViewmodel(T,camera,hero,clone,guardClip){
 const root=new T.Group();root.name='SwordArms232';camera.add(root);
 const rig=clone(hero);rig.visible=true;rig.position.set(0,-1.55,-.10);rig.rotation.set(0,Math.PI,0);root.add(rig);
 const mixer=new T.AnimationMixer(rig);const guard=mixer.clipAction(guardClip);guard.play();mixer.update(0);guard.paused=true;
 const bones={};rig.traverse(o=>{if(o.isBone)bones[o.name.replace('mixamorig','').replace(':','')]=o;});
 root.updateWorldMatrix(true,true);rig.updateMatrixWorld(true);
 const capsules=[];for(const b of Object.values(bones)){if(!/Arm|ForeArm|Hand/.test(b.name))continue;for(const child of b.children){if(!child.isBone)continue;capsules.push({a:b.getWorldPosition(new T.Vector3()),b:child.getWorldPosition(new T.Vector3()),r:/ForeArm/.test(b.name)?.085:/Hand/.test(b.name)?.060:.105});}}
 const meshes=[];rig.traverse(o=>{if(!o.isMesh)return;if(!o.isSkinnedMesh){o.visible=false;return;}
  o.skeleton.update();const geo=o.geometry,weights=geo.attributes.skinWeight,joints=geo.attributes.skinIndex;
  const armIds=new Set(o.skeleton.bones.map((b,i)=>/ForeArm|Hand/.test(b.name)?i:-1).filter(i=>i>=0));
  const near=new Map(),probe=new T.Vector3(),segment=new T.Line3(),closest=new T.Vector3();
  const arm=v=>{if(near.has(v))return near.get(v);let weight=0;for(let k=0;k<4;k++)if(armIds.has(joints[['getX','getY','getZ','getW'][k]](v)))weight+=weights[['getX','getY','getZ','getW'][k]](v);probe.fromBufferAttribute(geo.attributes.position,v);o.applyBoneTransform(v,probe);o.localToWorld(probe);const keep=weight>.48&&capsules.some(c=>{segment.set(c.a,c.b).closestPointToPoint(probe,true,closest);return probe.distanceToSquared(closest)<c.r*c.r;});near.set(v,keep);return keep;};
  const ix=geo.index,indices=[];for(let i=0;i<(ix?ix.count:geo.attributes.position.count);i+=3){const a=ix?ix.getX(i):i,b=ix?ix.getX(i+1):i+1,c=ix?ix.getX(i+2):i+2;if(arm(a)&&arm(b)&&arm(c))indices.push(a,b,c);}
  if(!indices.length){o.visible=false;return;}o.geometry=geo.clone();o.geometry.setIndex(indices);o.geometry.clearGroups();o.material=o.material.clone();o.material.depthTest=false;o.material.depthWrite=false;o.castShadow=false;o.receiveShadow=false;o.frustumCulled=false;o.renderOrder=10;meshes.push(o);
 });
 const rest=Object.values(bones).map(b=>({b,q:b.quaternion.clone(),p:b.position.clone(),s:b.scale.clone()}));
 const mount=new T.Group();root.add(mount);const swords=new Map();let activeSword=null,time=0;
 const v=()=>new T.Vector3(),q=()=>new T.Quaternion(),p0=v(),p1=v(),p2=v(),axis=v(),dir=v(),side=v(),elbow=v(),tmp=v(),quat=q(),parentQ=q(),handQ=q();
 const pos=(b,out)=>{b.updateWorldMatrix(true,false);b.getWorldPosition(out);return root.worldToLocal(out);};
 function aim(b,child,target){pos(b,p0);pos(child,p1);axis.subVectors(p1,p0).normalize();dir.subVectors(target,p0).normalize();quat.setFromUnitVectors(axis,dir);
  b.getWorldQuaternion(handQ);root.getWorldQuaternion(parentQ).invert();handQ.premultiply(parentQ).premultiply(quat);root.getWorldQuaternion(parentQ);handQ.premultiply(parentQ);b.parent.getWorldQuaternion(parentQ).invert();b.quaternion.copy(parentQ.multiply(handQ));b.updateWorldMatrix(false,true);
 }
 function ik(prefix,target,pole){const a=bones[prefix+'Arm'],b=bones[prefix+'ForeArm'],c=bones[prefix+'Hand'];pos(a,p0);pos(b,p1);pos(c,p2);
  const l1=p0.distanceTo(p1),l2=p1.distanceTo(p2),origin=ikOrigin.copy(p0),d=ikDirection.copy(target).sub(origin),length=Math.min(l1+l2-.006,Math.max(.01,d.length()));d.normalize();side.copy(pole).sub(origin).addScaledVector(d,-side.copy(pole).sub(origin).dot(d)).normalize();const along=(l1*l1-l2*l2+length*length)/(2*length);
  elbow.copy(origin).addScaledVector(d,along).addScaledVector(side,Math.sqrt(Math.max(0,l1*l1-along*along)));aim(a,b,elbow);aim(b,c,target);
 }
 const ikOrigin=v(),ikDirection=v();
 const handTarget=v(),leftTarget=v(),poleR=new T.Vector3(.48,-.42,-.35),poleL=new T.Vector3(-.48,-.42,-.35),bladeDir=v();
 function update(dt,{active,speed=0,sprint=false,defend=false,dash=false,air=false,hurt=false,sword='prota',blocked=false}={}){
  time+=dt;for(const r of rest){r.b.quaternion.copy(r.q);r.b.position.copy(r.p);r.b.scale.copy(r.s);}rig.updateWorldMatrix(true,true);
  const bob=Math.sin(time*(sprint?12:8))*Math.min(speed/7.2,1),breath=Math.sin(time*1.6)*.006;
  handTarget.set(.20+bob*.012,-.19+breath+Math.abs(bob)*.013,-.56);leftTarget.set(-.30,-.31,-.53);bladeDir.set(-.28,.68,-.68);
  if(sprint){handTarget.add(tmp.set(.035,-.045,.07));bladeDir.set(-.15,.35,-.93);leftTarget.z+=bob*.065;leftTarget.y+=bob*.035;}
  if(hurt){handTarget.x+=.06;handTarget.y-=.08;leftTarget.y-=.06;}
  if(dash||air){handTarget.y-=.045;leftTarget.y-=.04;}
  if(active){
   const a=active;let phase=-1,step=a.step||0;
   if(a.kind==='basic'){phase=a.t/a.duration;}
   else if(a.kind==='aurora'){const times=[.40,.82,1.24,1.70];let n=times.findIndex(t=>a.t<t+.16);if(n<0)n=3;phase=(a.t-(times[n]-.24))/.40;step=n%3;}
   else{phase=a.t<.47?a.t/.47:(a.t-.60)/1.1;step=1;}
   const u=T.MathUtils.clamp(phase,0,1),envelope=Math.sin(Math.PI*u),swing=T.MathUtils.smoothstep(u,.27,.72)*2-1;
   if(step===0){handTarget.x+=(-swing*.38)*envelope;handTarget.y+=.13*envelope;bladeDir.set(-swing*.9,.24,-.8);}
   else if(step===1){handTarget.x+=(swing*.32)*envelope;handTarget.y+=(.18-.30*u)*envelope;bladeDir.set(swing*.7,.7-u,-.8);}
   else{handTarget.x+=.12*envelope;handTarget.y+=(-.17+.39*u)*envelope;bladeDir.set(-.30,-.55+u*1.4,-.9);}
   handTarget.z-=.05*envelope;leftTarget.x-=.03*envelope;leftTarget.y+=.08*envelope;
  }
  if(defend){handTarget.set(.10,-.16,-.56);bladeDir.set(-.92,.12,-.2);leftTarget.set(-.20,-.27,-.43);}
  if(blocked){handTarget.z+=.10;handTarget.y-=.13;bladeDir.set(-.25,.8,-.25);}
  ik('Right',handTarget,poleR);ik('Left',leftTarget,poleL);
  // Neutral off-hand wrist: align palm length with the forearm, never leave a donor twist.
  const lh=bones.LeftHand;pos(bones.LeftForeArm,p0);pos(lh,p1);tmp.subVectors(p1,p0).normalize();lh.getWorldQuaternion(handQ);root.getWorldQuaternion(parentQ).invert();handQ.premultiply(parentQ);axis.set(0,1,0).applyQuaternion(handQ);quat.setFromUnitVectors(axis.normalize(),tmp);handQ.premultiply(quat);root.getWorldQuaternion(parentQ);handQ.premultiply(parentQ);lh.parent.getWorldQuaternion(parentQ).invert();lh.quaternion.copy(parentQ.multiply(handQ));lh.updateWorldMatrix(false,true);
  // Mounted original sword points along hand +Y. Preserve roll while aiming the wrist.
  const hand=bones.RightHand;hand.getWorldQuaternion(handQ);root.getWorldQuaternion(parentQ).invert();handQ.premultiply(parentQ);axis.set(0,1,0).applyQuaternion(handQ).normalize();quat.setFromUnitVectors(axis,bladeDir.normalize());handQ.premultiply(quat);root.getWorldQuaternion(parentQ);handQ.premultiply(parentQ);hand.parent.getWorldQuaternion(parentQ).invert();hand.quaternion.copy(parentQ.multiply(handQ));hand.updateWorldMatrix(false,true);
  pos(hand,mount.position);hand.getWorldQuaternion(mount.quaternion);root.getWorldQuaternion(parentQ).invert();mount.quaternion.premultiply(parentQ);
  if(activeSword!==sword){activeSword=sword;for(const [id,m]of swords)m.visible=id===sword;}mount.updateWorldMatrix(true,true);
 }
 function equip(id,source){if(swords.has(id))return;const weapon=source.clone(true);weapon.visible=true;weapon.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.depthTest=false;o.material.depthWrite=false;o.castShadow=false;o.renderOrder=11;}});mount.add(weapon);swords.set(id,weapon);}
 function blade(base,tip){const s=swords.get(activeSword);if(!s)return false;base.set(0,.4,0);tip.set(0,-.951,0);s.localToWorld(base);s.localToWorld(tip);return true;}
 root.visible=false;
 return{root,update,equip,blade,stats:()=>({visible:root.visible,meshes:meshes.length,triangles:meshes.reduce((n,m)=>n+m.geometry.index.count/3,0),hand:mount.position.toArray(),armBounds:meshes.map(m=>{m.skeleton.update();const box=new T.Box3(),v=new T.Vector3();for(const i of m.geometry.index.array){v.fromBufferAttribute(m.geometry.attributes.position,i);m.applyBoneTransform(i,v);m.localToWorld(v);root.worldToLocal(v);box.expandByPoint(v);}return{min:box.min.toArray(),max:box.max.toArray()};}),swords:swords.size}),dispose(){camera.remove(root);meshes.forEach(m=>{m.geometry.dispose();m.material.dispose();});swords.forEach(s=>s.traverse(o=>{if(o.isMesh)o.material.dispose();}));mixer.uncacheRoot(rig);}};
}
