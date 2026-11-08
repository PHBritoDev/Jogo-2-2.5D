import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
/** Allocated once per loaded rig. Shared geometry; independent bone snapshots, no mixer. */
export function shadowPool(scene,source,count=3){
 const sourceBones=new Map();source.traverse(o=>{if(o.isBone)sourceBones.set(o.name,o);});
 const ghosts=Array.from({length:count},()=>{
  const root=clone(source),bones=[],material=new T.MeshStandardMaterial({color:0x100a1b,emissive:0x301440,emissiveIntensity:.6,roughness:1,transparent:true,opacity:.72,depthWrite:false});
  root.traverse(o=>{if(o.isMesh){o.material=material;o.castShadow=false;o.receiveShadow=false;}if(o.isBone&&sourceBones.has(o.name))bones.push([o,sourceBones.get(o.name)]);});
  root.visible=false;scene.add(root);return{root,bones,material,age:1};
 });let cursor=0,enabled=true,low=false;const p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();
 return{emit(){if(!enabled)return;const g=ghosts[cursor++%(low?1:ghosts.length)];source.updateWorldMatrix(true,true);source.matrixWorld.decompose(p,q,s);g.root.position.copy(p);g.root.quaternion.copy(q);g.root.scale.copy(s);for(const [dst,src]of g.bones){dst.position.copy(src.position);dst.quaternion.copy(src.quaternion);dst.scale.copy(src.scale);}g.age=0;g.root.visible=true;},
  update(dt){for(const g of ghosts){g.age+=dt;g.root.visible=enabled&&g.age<.24;g.material.opacity=.72*Math.max(0,1-g.age/.24);}},
  quality(v){low=v==='low';},enable(v){enabled=v;if(!v)this.clear();},clear(){for(const g of ghosts){g.age=1;g.root.visible=false;}},
  stats(){return{capacity:ghosts.length,active:ghosts.filter(g=>g.root.visible).length};},
  dispose(){for(const g of ghosts){g.root.removeFromParent();g.root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});g.material.dispose();}}
 };
}
