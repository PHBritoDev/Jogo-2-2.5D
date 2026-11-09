import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {CLIP_CUTS,inPlace,measure} from './rig.js';
import {COMBAT_MOVES} from '../../combat-choreography3d.js';
import {shadowPool} from './shadows.js';
export {moveWithCollision as moveWorldHero} from './controller.js';

export const newHero=new URLSearchParams(location.search).get('prota')!=='antigo';
export const heroURL=newHero?'./Prota_otimizado_2K.glb':'./Protagonista.glb?mod172-grounding';
const fallback=new URL(location.href);fallback.searchParams.set('prota','antigo');
export const heroFallbackURL=fallback.href;
let sourceClips=null,reference=null,heroRaw=null;
export function prepareWorldHero(gltf){
 if(!newHero)return gltf;
 sourceClips=new Map(gltf.animations.map(c=>[c.name,c]));reference=gltf.scene.getObjectByName('Hips').position.toArray();
 const normalized=(c,vertical=false)=>inPlace(c,{vertical,reference});
 const cut=(name,source,start,end)=>{const c=T.AnimationUtils.subclip(sourceClips.get(source),name,start*30,end*30,30);c.duration=end-start;return normalized(c,true);};
 const aliases=[['Idle','Combat_Stance'],['Walk','Walking'],['Run','Running'],['Death','Dead']].map(([name,source])=>{const c=normalized(sourceClips.get(source),name==='Death');c.name=name;return c;});
 aliases.push(cut('Jump','Jump_Over_Obstacle_2',0,.4),cut('Dash','Quick_Step_and_Spin_Dodge',0,.2),cut('HitReaction','_01a1b3e6_e46e_7367_9007_2e104dc2e6b7',.12,.55));
 const guard=aliases[0].clone();guard.name='Block';aliases.push(guard);
 for(const m of CLIP_CUTS)aliases.push(cut(m.id,m.clip,m.start,m.end));
 const raw=gltf.scene,bounds=measure(raw),scale=1.9/(bounds.max.y-bounds.min.y);raw.scale.multiplyScalar(scale);raw.position.y-=bounds.min.y*scale;
 const wrapper=new T.Group();wrapper.name='ProtaNovoWorld';wrapper.add(raw);heroRaw=raw;wrapper.userData.newHero=true;
 gltf.scene=wrapper;gltf.animations=aliases;
 window.WorldProtagonistReport={file:'Prota_otimizado_2K.glb',clips:[...sourceClips.keys()],height:1.9,scale,hand:!!raw.getObjectByName('RightHand'),fallback:'?prota=antigo'};
 return gltf;
}
/**
 * Mod 302: recorta os trechos do repertório do protagonista (prota-combat3d.js) e devolve, para cada um, o
 * deslocamento real do quadril no chão (root motion em metros, no espaço do modelo, a 30 Hz). O clipe fica no lugar
 * e o jogo aplica esse avanço na cápsula COM colisão — o golpe anda o que a animação anda, sem patinar nem atravessar.
 */
export function protaClips(segments){
 if(!newHero||!sourceClips||!heroRaw)return{clips:{},roots:{}};
 const hips=heroRaw.getObjectByName('Hips');heroRaw.updateMatrixWorld(true);const m3=new T.Matrix3().setFromMatrix4(hips.parent.matrixWorld),v=new T.Vector3();
 const clips={},roots={};
 for(const s of segments){const src=sourceClips.get(s.clip);if(!src)continue;
  const c=T.AnimationUtils.subclip(src,s.id,Math.round(s.start*30),Math.round(s.end*30),30);c.duration=s.end-s.start;
  const track=src.tracks.find(t=>/Hips\.position$/i.test(t.name)),root=[];
  if(track){const at=time=>{const vals=track.values,ts=track.times;let i=0;while(i<ts.length-2&&ts[i+1]<time)i++;const u=Math.max(0,Math.min(1,(time-ts[i])/((ts[i+1]-ts[i])||1)));return[0,1,2].map(k=>vals[i*3+k]+(vals[i*3+3+k]-vals[i*3+k])*u);};
   const p0=at(s.start);for(let f=0;f<=Math.ceil((s.end-s.start)*30);f++){const p=at(Math.min(s.end,s.start+f/30));v.set(p[0]-p0[0],p[1]-p0[1],p[2]-p0[2]).applyMatrix3(m3);root.push(+v.x.toFixed(4),+v.z.toFixed(4));}}
  clips[s.id]=inPlace(c,{vertical:!!s.vertical,reference});roots[s.id]=root;
 }
 return{clips,roots};
}
export function nativeWorldCombos(){
 if(!newHero||!sourceClips)return{};const result={};
 for(const mode of ['ground','run','dash','air','plunge'])for(let i=0;i<(mode==='ground'?5:1);i++){
  const m=CLIP_CUTS[mode==='plunge'?4:mode==='ground'?i:0],id=`Combat_prota_${mode}_${i}`;
  const c=T.AnimationUtils.subclip(sourceClips.get(m.clip),id,m.start*30,m.end*30,30);c.duration=m.duration;
  result[id]=inPlace(c,{vertical:true,reference});
  Object.assign(COMBAT_MOVES[id],{duration:m.duration,open:m.open,close:m.close,buffer:m.buffer,pattern:m.launcher?'rise':m.finisher?'finish':COMBAT_MOVES[id].pattern});
 }
 return result;
}
// Preserve each existing special's choreography with rest-relative world rotations.
// Position/scale tracks from the old skeleton must never enter the new skeleton.
export function retargetWorldRites(asset,root){
 const target=clone(root),source=asset.scene,sourceBones=new Map(),targetBones=[];
 source.updateMatrixWorld(true);source.traverse(o=>{if(o.name.startsWith('mixamorig'))sourceBones.set(o.name,{node:o,rest:o.getWorldQuaternion(new T.Quaternion()).invert()});});
 target.updateMatrixWorld(true);
 const normalize=n=>n.replace(/^mixamorig:?/,'').replace('UpperArm','Arm').replace('LowerArm','ForeArm').replace('UpperLeg','UpLeg').replace('LowerLeg','Leg').replace('Toes','ToeBase').replace(/^UpperChest$/,'Spine2').replace(/^Chest$/,'Spine1');
 target.traverse(o=>{if(o.isBone){const donor=sourceBones.get('mixamorig'+normalize(o.name));if(donor)targetBones.push({node:o,donor,rest:o.getWorldQuaternion(new T.Quaternion()),local:o.quaternion.clone()});}});
 const mixer=new T.AnimationMixer(source),q=new T.Quaternion(),parent=new T.Quaternion(),clips={};
 for(const clip of asset.animations.filter(c=>/^Rite_/.test(c.name))){
  mixer.stopAllAction();mixer.clipAction(clip).reset().play();const count=Math.ceil(clip.duration*30),times=[],values=targetBones.map(()=>[]);
  for(let frame=0;frame<=count;frame++){
   const time=frame/count*clip.duration;times.push(time);mixer.setTime(time);source.updateMatrixWorld(true);
   targetBones.forEach((b,i)=>{b.donor.node.getWorldQuaternion(q).multiply(b.donor.rest).multiply(b.rest);b.node.parent.getWorldQuaternion(parent).invert();b.node.quaternion.copy(parent.multiply(q)).normalize();b.node.updateWorldMatrix(false,true);const a=values[i],r=b.node.quaternion;if(a.length&&r.x*a.at(-4)+r.y*a.at(-3)+r.z*a.at(-2)+r.w*a.at(-1)<0)a.push(-r.x,-r.y,-r.z,-r.w);else a.push(r.x,r.y,r.z,r.w);});
  }
  clips[clip.name]=new T.AnimationClip(clip.name,clip.duration,targetBones.map((b,i)=>new T.QuaternionKeyframeTrack(b.node.name+'.quaternion',times,values[i])));
 }
 mixer.stopAllAction();mixer.uncacheRoot(source);target.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});
 if(Object.keys(clips).length!==5)throw Error('Retarget de ritos incompleto');return clips;
}
export function worldSwordLayers(clips,locomotion){
 const lower=t=>/^(Hips|LeftUpperLeg|RightUpperLeg|LeftLowerLeg|RightLowerLeg|LeftFoot|RightFoot|LeftToes|RightToes)\./.test(t.name);
 const split=(c,low)=>new T.AnimationClip(c.name+(low?'_Lower':'_Upper'),c.duration,c.tracks.filter(t=>!t.name.endsWith('.scale')&&lower(t)===low));
 return{upper:Object.fromEntries(Object.entries(clips).map(([k,c])=>[k,split(c,false)])),lower:Object.fromEntries(Object.entries(locomotion).filter(([,c])=>c).map(([k,c])=>[k,split(c,true)]))};
}
export function worldHeroShadows(scene,root){return shadowPool(scene,root,3);}
export function installHeroSelector(){
 const panel=document.getElementById('graphics-panel-3d');if(!panel)return;
 const label=document.createElement('label');label.textContent='Protagonista · comparação';const select=document.createElement('select');select.setAttribute('aria-label','Modelo do protagonista');
 for(const[value,text]of [['novo','Novo'],['antigo','Antigo']])select.add(new Option(text,value));select.value=newHero?'novo':'antigo';select.onchange=()=>{const u=new URL(location.href);u.searchParams.set('prota',select.value);location.assign(u.href);};label.append(select);panel.append(label);
}
