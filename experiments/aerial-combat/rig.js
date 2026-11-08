import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {buildRiteSword} from '../../sword-design3d.js';
import {bakeCombatClips} from '../../combat-rig3d.js';
import {COMBAT_MOVES} from '../../combat-choreography3d.js';
export const CLIP_CUTS=[
 {name:'Fenda oblíqua',clip:'Weapon_Combo_1',start:.40,end:1.05,open:.21,close:.39,damage:18,lunge:.65},
 {name:'Retorno cruzado',clip:'Weapon_Combo',start:.98,end:1.66,open:.23,close:.41,damage:19,lunge:.65},
 {name:'Volta da sentinela',clip:'Weapon_Combo_1',start:1.10,end:1.90,open:.16,close:.39,damage:20,lunge:.5},
 {name:'Ascensão',clip:'Triple_Combo_Attack',start:1.92,end:2.60,open:.19,close:.40,damage:19,lunge:.65,launcher:true},
 {name:'Sentença descendente',clip:'Weapon_Combo_2',start:2.70,end:3.38,open:.25,close:.44,damage:28,lunge:.75,finisher:true}
].map((m,i)=>({...m,id:'AirSword_'+i,duration:m.end-m.start,buffer:m.end-m.start-.17}));

export function measure(root){root.updateWorldMatrix(true,true);root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});const b=new T.Box3(),v=new T.Vector3();root.traverse(o=>{if(o.isMesh){const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){o.getVertexPosition(i,v);b.expandByPoint(v.applyMatrix4(o.matrixWorld));}}});return b;}
export function inPlace(clip,{vertical=false,reference=[0,1,0]}={}){const c=clip.clone();for(const t of c.tracks)if(/Hips\.position$/i.test(t.name)){for(let i=0;i<t.values.length;i+=3){t.values[i]=reference[0];t.values[i+2]=reference[2];if(vertical)t.values[i+1]=reference[1];}}return c;}

export async function loadRig(kind='new'){
 const url=kind==='new'?'../../Prota_otimizado_2K.glb':'../../Protagonista.glb';
 const gltf=await new GLTFLoader().loadAsync(new URL(url,import.meta.url).href),root=gltf.scene;
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
 const bounds=measure(root),h=bounds.max.y-bounds.min.y,scale=1.8/h;root.scale.setScalar(scale);root.position.y=-bounds.min.y*scale;
 const raw=new Map(gltf.animations.map(c=>[c.name,c])),hips=root.getObjectByName('Hips')||root.getObjectByName('mixamorigHips'),reference=hips.position.toArray();const normalized=(c,vertical=false)=>inPlace(c,{vertical,reference});
 const pick=(names)=>names.map(n=>raw.get(n)).find(Boolean);
 const idle=pick(['Combat_Stance','Idle','idle','_01a1b3e4_6f0c_705b_82f5_e9447d85cbef'])||gltf.animations.find(c=>/idle/i.test(c.name));
 if(!idle)throw Error(kind+': idle não identificado');
 const base={idle:normalized(idle),run:normalized(pick(['Running','Run'])||idle),walk:normalized(pick(['Walking','Walk'])||idle)};
 const originals=gltf.animations.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length}));
 // Existing authored five-move sword set remains available as an exact baseline.
 const legacy=bakeCombatClips(T,root,clone,idle,Object.values(COMBAT_MOVES).filter(m=>m.weapon==='prota'));
 const clips={...base,...legacy},moves=CLIP_CUTS.map(m=>({...m}));
 for(const m of moves){const source=raw.get(m.clip);if(kind==='new'&&source){const c=T.AnimationUtils.subclip(source,m.id,m.start*30,m.end*30,30);c.duration=m.duration;clips[m.id]=normalized(c,true);}
  else if(kind==='new')m.disabled=true;
  else{const old=COMBAT_MOVES['Combat_prota_ground_'+moves.indexOf(m)];Object.assign(m,{duration:old.duration,open:old.open,close:old.close,buffer:old.close});clips[m.id]=legacy[old.id];}
 }
 const sub=(name,source,a,b,vertical=true)=>{const c=raw.get(source);if(c){clips[name]=normalized(T.AnimationUtils.subclip(c,name,a*30,b*30,30),vertical);clips[name].duration=b-a;}};
 sub('dash','Quick_Step_and_Spin_Dodge',0,.20);sub('jump','Jump_Over_Obstacle_2',0,.40);sub('cast','Skill_03',0,.55);sub('hit','_01a1b3e6_e46e_7367_9007_2e104dc2e6b7',.12,.55);
 if(raw.has('Dead'))clips.death=normalized(raw.get('Dead'));else clips.death=clips.idle;
 if(!clips.dash)clips.dash=clips.run;if(!clips.jump)clips.jump=clips.idle;if(!clips.cast)clips.cast=clips.idle;if(!clips.hit)clips.hit=clips.idle;
 const holder=new T.Group();holder.add(root);const mixer=new T.AnimationMixer(root),actions=Object.fromEntries(Object.entries(clips).map(([n,c])=>[n,mixer.clipAction(c)]));
 const hand=root.getObjectByName('RightHand')||root.getObjectByName('mixamorigRightHand');if(!hand)throw Error('RightHand ausente');
 const sword=buildRiteSword(T,'prota'),grip=new T.Group();hand.add(grip);grip.scale.setScalar(.78/scale);sword.rotation.z=Math.PI;sword.position.y=.75;grip.add(sword);
 const v=new T.Vector3(),w=new T.Vector3(),blade={base:{x:0,y:0,z:0},tip:{x:0,y:0,z:0}};let current=null;
 const api={kind,root,holder,mixer,actions,raw,moves,originals,hand,sword,
  play(name,once=false,fade=.055){const a=actions[name]||actions.idle;if(a===current&&!once)return a;if(current&&current!==a){if(fade>0)current.fadeOut(fade);else current.stop();}a.reset().setLoop(once?T.LoopOnce:T.LoopRepeat,once?1:Infinity);a.clampWhenFinished=once;a.enabled=true;a.stopFading().setEffectiveTimeScale(1).setEffectiveWeight(1);if(fade>0)a.fadeIn(fade);a.play();current=a;return a;},
  sample(name,time){const a=api.play(name,true,0);a.paused=true;a.time=Math.min(time,a.getClip().duration);mixer.update(0);holder.updateMatrixWorld(true);return api.blade();},
  blade(){holder.updateWorldMatrix(true,true);v.fromArray(sword.userData.blade.base).applyMatrix4(sword.matrixWorld);w.fromArray(sword.userData.blade.tip).applyMatrix4(sword.matrixWorld);Object.assign(blade.base,v);Object.assign(blade.tip,w);return blade;},
  step(dt,name,time){if(name){if(current!==actions[name])api.play(name,true);current.paused=true;current.time=Math.min(time,current.getClip().duration);mixer.update(dt);}else{if(current)current.paused=false;mixer.update(dt);}return api.blade();},
  dispose(){mixer.stopAllAction();mixer.uncacheRoot(root);holder.removeFromParent();}
 };api.play('idle');mixer.update(0);return api;
}
