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
