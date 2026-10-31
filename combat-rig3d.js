import{COMBAT_MOVES,combatPose}from'./combat-choreography3d.js';
/** Bake native AnimationClips once during loading. IK works in the original skeleton's world axes.
 * No donor skeleton, no scale channels, no horizontal root motion; authored movement belongs to the capsule. */
export function bakeCombatClips(T,root,clone,idle,moves=Object.values(COMBAT_MOVES),poseAt=combatPose,traceSpec=[]){
 const started=performance.now();
 const rig=clone(root);rig.position.set(0,root.position.y,0);rig.rotation.set(0,0,0);const mixer=new T.AnimationMixer(rig);if(idle){mixer.clipAction(idle).play();mixer.update(0);}rig.updateMatrixWorld(true);
 const bones={},rest=[];rig.traverse(o=>{if(!o.isBone)return;let n=o.name.replace('mixamorig:','').replace('mixamorig','');n=n.replace('UpperArm','Arm').replace('LowerArm','ForeArm').replace('UpperLeg','UpLeg').replace('LowerLeg','Leg').replace('Toes','ToeBase');if(n==='Chest')n='Spine1';if(n==='UpperChest')n='Spine2';bones[n]=o;rest.push({b:o,q:o.quaternion.clone(),p:o.position.clone()});});
 const v=()=>new T.Vector3(),p=v(),p1=v(),p2=v(),d=v(),side=v(),elbow=v(),origin=v(),axis=v(),want=v(),q=new T.Quaternion(),wq=new T.Quaternion(),pq=new T.Quaternion();
 const world=(b,out)=>{b.updateWorldMatrix(true,false);return b.getWorldPosition(out);};
 const required=['Hips','Spine','Spine1','Spine2','Head','RightArm','RightForeArm','RightHand','LeftArm','LeftForeArm','LeftHand','RightUpLeg','RightLeg','RightFoot','LeftUpLeg','LeftLeg','LeftFoot'];for(const n of required)if(!bones[n])throw Error('Combat rig bone missing: '+n);
 const feet={Left:world(bones.LeftFoot,v()),Right:world(bones.RightFoot,v())},hip0=world(bones.Hips,v()),head=world(bones.Head,v()),floor=Math.min(feet.Left.y,feet.Right.y),scale=(head.y-floor)/1.58;
 const reset=()=>{for(const r of rest){r.b.quaternion.copy(r.q);r.b.position.copy(r.p);}rig.updateMatrixWorld(true);};
 function worldRotation(b,rotation){b.parent.getWorldQuaternion(pq).invert();b.quaternion.copy(pq.multiply(rotation));b.updateWorldMatrix(false,true);}
 function rotate(b,ax,angle){b.getWorldQuaternion(wq);q.setFromAxisAngle(ax,angle);wq.premultiply(q);worldRotation(b,wq);}
 function aim(b,child,target){world(b,p);world(child,p1);axis.subVectors(p1,p).normalize();want.subVectors(target,p).normalize();q.setFromUnitVectors(axis,want);b.getWorldQuaternion(wq);wq.premultiply(q);worldRotation(b,wq);}
 function ik(a,b,c,target,pole){world(a,p);world(b,p1);world(c,p2);const l1=p.distanceTo(p1),l2=p1.distanceTo(p2);origin.copy(p);d.copy(target).sub(origin);const len=Math.min(l1+l2-.002,Math.max(.01,d.length()));d.normalize();side.copy(pole).sub(origin).addScaledVector(d,-side.copy(pole).sub(origin).dot(d)).normalize();const along=(l1*l1-l2*l2+len*len)/(2*len);elbow.copy(origin).addScaledVector(d,along).addScaledVector(side,Math.sqrt(Math.max(0,l1*l1-along*along)));aim(a,b,elbow);aim(b,c,target);}
 const up=new T.Vector3(0,1,0),right=new T.Vector3(1,0,0),tar=v(),pole=v(),localAxis=v(),handQ=new T.Quaternion();bones.RightHand.getWorldQuaternion(handQ);localAxis.set(0,1,0).applyQuaternion(handQ.clone().invert());
 // Protagonist sword is calibrated to hand +Y. Generic rigs use their palm-to-middle-finger direction.
 if(bones.RightHand.name.includes('mixamorig'))localAxis.set(0,1,0);else{const child=bones.RightHand.children.find(b=>/MiddleProximal/.test(b.name));if(child){world(child,p1);world(bones.RightHand,p);localAxis.subVectors(p1,p).normalize().applyQuaternion(handQ.clone().invert());}}
 localAxis.set(0,1,0);
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 const clips={};for(const move of moves){const N=Math.ceil(move.duration*30),times=[],frames=[],rot=rest.map(()=>[]),hips=[];
  for(let i=0;i<=N;i++){const t=move.duration*i/N,a=poseAt(move,t);times.push(t);reset();const hip=hip0.clone();hip.y-=a.dip*scale;bones.Hips.position.copy(bones.Hips.parent.worldToLocal(hip));rig.updateMatrixWorld(true);
   for(const [n,k]of [['Spine',.30],['Spine1',.30],['Spine2',.40]]){rotate(bones[n],up,a.yaw*k);rotate(bones[n],right,-a.lean*k);}rotate(bones.Head,up,-a.yaw*.28);
   for(const sideName of ['Left','Right']){tar.copy(feet[sideName]);if(a.air){tar.y+=.16*scale;tar.z-=.18*scale;}else if(move.advance){const open=move.open||move.hits?.[0]-.11,close=move.close||move.hits?.at(-1)+.11;const root=move.advance*Math.max(0,Math.min(1,(t-open*.5)/(close-open*.5)));const u=sideName==='Right'?Math.min(1,t/close):Math.max(0,(t-close)/(move.duration-close));tar.z+=(move.advance*smooth(u)-root)*scale;tar.y+=Math.sin(Math.PI*u)*.10*scale;}pole.copy(tar);pole.z+=2*scale;ik(bones[sideName+'UpLeg'],bones[sideName+'Leg'],bones[sideName+'Foot'],tar,pole);}
   for(const [s,h]of [['Right',a.hand],['Left',a.off]]){tar.set(h[0]*scale,floor+h[1]*scale,h[2]*scale);pole.set((s==='Right'?-1:1)*.9*scale,floor+1.15*scale,.25*scale);ik(bones[s+'Arm'],bones[s+'ForeArm'],bones[s+'Hand'],tar,pole);}
   bones.RightHand.getWorldQuaternion(wq);axis.copy(localAxis).applyQuaternion(wq).normalize();want.set(...a.blade).normalize();q.setFromUnitVectors(axis,want);wq.premultiply(q);worldRotation(bones.RightHand,wq);
   if(a.offBlade){bones.LeftHand.getWorldQuaternion(wq);axis.set(0,1,0).applyQuaternion(wq).normalize();want.set(...a.offBlade).normalize();q.setFromUnitVectors(axis,want);wq.premultiply(q);worldRotation(bones.LeftHand,wq);}
   if(traceSpec.length){rig.updateMatrixWorld(true);frames.push(traceSpec.map(spec=>{const b=bones[spec.hand];b.getWorldQuaternion(wq);world(b,p);return spec.points.map(pt=>new T.Vector3(...pt).applyQuaternion(wq).add(p).toArray());}));}
   for(let j=0;j<rest.length;j++){const z=rest[j].b.quaternion;z.normalize();const values=rot[j];if(values.length&&z.x*values.at(-4)+z.y*values.at(-3)+z.z*values.at(-2)+z.w*values.at(-1)<0){values.push(-z.x,-z.y,-z.z,-z.w);}else values.push(z.x,z.y,z.z,z.w);}
   hips.push(...bones.Hips.position.toArray());
  }
  const tracks=rest.map((r,i)=>new T.QuaternionKeyframeTrack(r.b.name+'.quaternion',times,rot[i]));tracks.push(new T.VectorKeyframeTrack(bones.Hips.name+'.position',times,hips));clips[move.id]=new T.AnimationClip(move.id,move.duration,tracks);if(frames.length)clips[move.id].combatTrace={duration:move.duration,frames};
 }
 root.userData.combatBake={milliseconds:performance.now()-started,clips:Object.keys(clips).length,bytes:Object.values(clips).reduce((s,c)=>s+c.tracks.reduce((n,t)=>n+t.times.byteLength+t.values.byteLength,0),0)};mixer.stopAllAction();mixer.uncacheRoot(rig);return clips;
}
