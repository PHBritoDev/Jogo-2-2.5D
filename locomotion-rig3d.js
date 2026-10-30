/** Mod 232. Per-rig bake for the inspected humanoid NPC family only.
 * Replaces locomotion arm rotations, preserving legs, root, wings and combat clips.
 * Frames are built from each rig's own idle axes; no cross-rig quaternion copying. */
export function repairHumanoidLocomotion(T,root,clips){
 const bone={};root.traverse(o=>{if(o.isBone)bone[o.name]=o;});
 const required=['LeftUpperArm','LeftLowerArm','LeftHand','RightUpperArm','RightLowerArm','RightHand'];
 if(required.some(n=>!bone[n]))return clips;
 const idle=clips.find(c=>/^(Idle|Alert)$/.test(c.name))||clips.find(c=>c.name.startsWith('_01a15ab5'));
 if(!idle)return clips;
 const states=[];root.traverse(o=>states.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()}));
 const mixer=new T.AnimationMixer(root),reference=mixer.clipAction(idle);reference.play();mixer.update(0);root.updateWorldMatrix(true,true);
 const rest={};for(const n of required){const b=bone[n];rest[n]=b.getWorldQuaternion(new T.Quaternion());}
 const rootQ=root.getWorldQuaternion(new T.Quaternion()),invRoot=rootQ.clone().invert(),v=new T.Vector3(),v2=new T.Vector3();
 const refs={};for(const side of ['Left','Right'])for(const [a,b]of [['UpperArm','LowerArm'],['LowerArm','Hand']]){bone[side+a].getWorldPosition(v);bone[side+b].getWorldPosition(v2);refs[side+a]=v2.sub(v).normalize().applyQuaternion(invRoot).clone();}
 mixer.stopAllAction();
 const repaired=clips.map(clip=>{
  if(!/^(Running|Walking)$/.test(clip.name))return clip;
  const fps=60,n=Math.ceil(clip.duration*fps),times=[],values=Object.fromEntries(required.map(k=>[k,[]]));const action=mixer.clipAction(clip);action.play();
  for(let i=0;i<=n;i++){
   const t=clip.duration*i/n;times.push(t);mixer.setTime(t);root.updateWorldMatrix(true,true);
   for(const [side,sign]of [['Left',1],['Right',-1]]){
    const phase=t/clip.duration*Math.PI*2+(sign<0?Math.PI:0),run=clip.name==='Running';
    const swing=Math.sin(phase)*(run?.62:.32);
    const upper=new T.Vector3(sign*.16,-1,swing).normalize(),lower=new T.Vector3(sign*.07,run?-.15:-.68,.80+swing*.2).normalize();
    for(const [suffix,desired]of [['UpperArm',upper],['LowerArm',lower],['Hand',lower]]){
     const name=side+suffix,b=bone[name];const source=refs[side+(suffix==='Hand'?'LowerArm':suffix)];
     const align=new T.Quaternion().setFromUnitVectors(source,desired),world=rootQ.clone().multiply(align).multiply(invRoot).multiply(rest[name]);
     const parent=b.parent.getWorldQuaternion(new T.Quaternion()).invert();b.quaternion.copy(parent.multiply(world));b.updateWorldMatrix(false,true);values[name].push(...b.quaternion.toArray());
    }
   }
  }
  action.stop();const affected=new Set(required.map(n=>n+'.quaternion'));
  return new T.AnimationClip(clip.name,clip.duration,[...clip.tracks.filter(t=>!affected.has(t.name)),...required.map(n=>new T.QuaternionKeyframeTrack(n+'.quaternion',times,values[n]))]);
 });
 mixer.stopAllAction();mixer.uncacheRoot(root);for(const {o,p,q,s}of states){o.position.copy(p);o.quaternion.copy(q);o.scale.copy(s);}root.updateWorldMatrix(true,true);return repaired;
}
