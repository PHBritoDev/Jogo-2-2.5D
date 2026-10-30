/** Helpers shared by the production rig and asset regression tests. */
export function lockSwordRigScales(root){const states=[];root.traverse(o=>states.push([o,o.scale.clone()]));return()=>{for(const [o,s]of states)o.scale.copy(s);};}
export function prepareSwordClips(THREE,clips,root){
 const names=new Set();root.traverse(o=>names.add(o.name));const result={};
 for(const clip of clips){if(!/^Rite_/.test(clip.name))continue;const tracks=clip.tracks.filter(t=>!t.name.endsWith('.scale'));
  for(const track of tracks){const binding=THREE.PropertyBinding.parseTrackName(track.name);if(!names.has(binding.nodeName))throw new Error('Osso de rito ausente: '+binding.nodeName);}
  result[clip.name]=new THREE.AnimationClip(clip.name,clip.duration,tracks);
 }if(Object.keys(result).length!==5)throw new Error('Kit de espada incompleto');return result;
}
/** Copy-on-write test saves: all campaign/heart/map writes stay in this page. */
export function isolatedSwordStorage(storage,isolated=false){if(!isolated)return storage;const values=new Map();return{getItem:key=>values.has(key)?values.get(key):storage.getItem(key),setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.set(key,null)};}

/** Cached, disjoint bone regions: no full-body attack can overwrite locomotion. */
export function swordLayers(THREE,clips,locomotion){
 const lower=t=>/mixamorig(Hips|LeftUpLeg|RightUpLeg|LeftLeg|RightLeg|LeftFoot|RightFoot|LeftToeBase|RightToeBase)\./.test(t.name);
 const split=(clip,low)=>new THREE.AnimationClip(clip.name+(low?'_Lower':'_Upper'),clip.duration,clip.tracks.filter(t=>!t.name.endsWith('.scale')&&lower(t)===low));
 return{upper:Object.fromEntries(Object.entries(clips).map(([k,c])=>[k,split(c,false)])),lower:Object.fromEntries(Object.entries(locomotion).filter(([,c])=>c).map(([k,c])=>[k,split(c,true)]))};
}
