import * as T from 'three';
import {createSwordRitesVFX} from '../../sword-rites-vfx3d.js';

// Adapt the existing authored sword ribbons; no change to the campaign VFX module.
const accents=[0xffc24f,0xffedd2,0xeaaa39,0xffffe9,0xffa53a];
const widths=[.80,.66,.58,.72,1];
export function createAerialEffects(scene){
 const base=createSwordRitesVFX(T,scene),root=scene.getObjectByName('SwordRites231');
 const ribbons=root.children.filter(o=>o.geometry?.attributes.birth&&o.geometry.attributes.position.count===128);
 const geometry=new T.TetrahedronGeometry(1),material=new T.MeshBasicMaterial({color:0xffe6ae,toneMapped:false});
 const chips=new T.InstancedMesh(geometry,material,32);chips.frustumCulled=false;chips.instanceMatrix.setUsage(T.DynamicDrawUsage);chips.visible=false;scene.add(chips);
 const particles=Array.from({length:32},()=>({age:1,life:0,p:new T.Vector3(),v:new T.Vector3()}));
 const dummy=new T.Object3D(),direction=new T.Vector3(),prior=new T.Vector3(),point=new T.Vector3(),spread=new T.Vector3(),normal=new T.Vector3(),blade={base:{},tip:{}};
 const flashes=new Map();let cursor=0,serial=-1,quality='high';
 function event(type,e){
  if(type==='blade'&&e.a.def?.id?.startsWith('AirSword_')){
   const index=Number(e.a.def.id.at(-1));point.set(e.blade.tip.x,e.blade.tip.y,e.blade.tip.z);
   if(serial===e.a.serial)direction.copy(point).sub(prior).normalize();else direction.set(0,0,1);
   prior.copy(point);serial=e.a.serial;
   Object.assign(blade.tip,e.blade.tip);
   for(const axis of ['x','y','z'])blade.base[axis]=e.blade.tip[axis]+(e.blade.base[axis]-e.blade.tip[axis])*widths[index];
   base.event(type,{a:e.a,blade});
   for(const ribbon of ribbons)if(ribbon.visible)ribbon.material.uniforms.ink.value.setHex(accents[index]);
   return;
  }
  base.event(type,e);
  if(type==='impact'&&e.actor){
   const amount=quality==='low'?(e.final?8:4):(e.final?20:9);
   for(let i=0;i<amount;i++){
    const p=particles[cursor++%32],a=i*2.399;
    p.age=0;p.life=.18+(i%3)*.035;p.p.set(e.target.x,e.target.y,e.target.z);
    p.v.copy(direction).multiplyScalar(2.5+(i%4)).add(spread.set(Math.cos(a)*.6,Math.sin(a)*.6,.15));
   }
   e.actor.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.emissive){if(!flashes.has(m))flashes.set(m,{color:m.emissive.clone(),intensity:m.emissiveIntensity,left:.10});else flashes.get(m).left=.10;m.emissive.setHex(0x785426);m.emissiveIntensity=.65;}});
  }
 }
 function update(dt,level='high'){
  quality=level;base.update(dt,level);let active=0;
  for(let i=0;i<particles.length;i++){const p=particles[i];p.age+=dt;if(p.age<p.life){p.p.addScaledVector(p.v,dt);p.v.y-=6*dt;dummy.position.copy(p.p);dummy.scale.set(.018,.055,.018).multiplyScalar(1-p.age/p.life);dummy.quaternion.setFromUnitVectors(T.Object3D.DEFAULT_UP,normal.copy(p.v).normalize());active++;}else dummy.scale.setScalar(0);dummy.updateMatrix();chips.setMatrixAt(i,dummy.matrix);}
  chips.visible=active>0;chips.instanceMatrix.needsUpdate=true;
  for(const[m,f]of flashes){f.left-=dt;if(f.left<=0){m.emissive.copy(f.color);m.emissiveIntensity=f.intensity;flashes.delete(m);}}
 }
 function clear(){base.clear();for(const p of particles)p.life=0;chips.visible=false;for(const[m,f]of flashes){m.emissive.copy(f.color);m.emissiveIntensity=f.intensity;}flashes.clear();}
 return{event,update,clear,stats:()=>({...base.stats(),directionalCapacity:32}),dispose(){clear();base.dispose();chips.removeFromParent();geometry.dispose();material.dispose();}};
}
