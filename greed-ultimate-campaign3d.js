/** Mod 349 — integrador independente da ultimate do Codex sobre a fase III do Claude.
 * Não substitui a IA, animações, armas, VFX nem a state machine da Ganância.
 * Aceita coordenadas mundiais do jogo, converte para o disco local da ultimate,
 * e preserva a zona 80/20. */
import {measureRefuge,createGreedUltimate,createGreedAtomicEncounter} from './greed-ultimate-atomic3d.js';
import {createCorona} from './greed-ultimate-corona3d.js';

import {createUsuraShots} from './greed-ultimate-shots3d.js';

export function createGreedCampaignUltimate(T,scene,{arenaCenterWorld:center,radius,walkable=(x,z)=>Math.hypot(x,z)<=radius,quality='medium',camera,beat,damage}){
 const arena=measureRefuge(radius,walkable);
 const corona=createCorona(T,scene,arena,quality,center);
 const anchor=new T.Vector3(),launch=new T.Vector3(),high=new T.Vector3(),handPos=new T.Vector3(),handQuat=new T.Quaternion(),originalQuat=new T.Quaternion(),spinQ=new T.Quaternion(),spinAxis=new T.Vector3(0,1,0);
 const aim=createUsuraShots(T,center,radius), head=new T.Vector3(),groundOrigin=new T.Vector3(),grip=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0,1,0),new T.Vector3(0,0,1),new T.Vector3(1,0,0)));
 const portrait=new T.PointLight(0xffd9ac,0,8,1.7);
 portrait.name='Usura · luz da lâmina';scene.add(portrait);
 const orbitPosition=new T.Vector3(),orbitRotation=new T.Quaternion();
 let leased=false,faceBearing=0;
 const face=new T.Vector3();
 function giveBack(){
  if(leased && body?.gk){
   blade.position.copy(orbitPosition);blade.quaternion.copy(orbitRotation);delete body.gk.ritualBlade;
  }
  leased=false;portrait.visible=false;
 }
 let actor=null,body=null,blade=null,detached=false,elapsed=0,forceQueued=false;
 function pointAtHand(){
   if(!blade||!body?.hand)return;
   body.holder.updateWorldMatrix(true,true);body.hand.getWorldPosition(handPos);body.hand.getWorldQuaternion(handQuat);
   blade.position.copy(handPos);blade.quaternion.copy(handQuat).multiply(grip);blade.visible=true;
 }
 const ultimate=createGreedUltimate({arena,speed:2.8,
   camera:{focus(){orbitPosition.copy(blade.position);orbitRotation.copy(blade.quaternion);
    body.gk.ritualBlade='D';leased=true;elapsed=0;},release(){}},
   weapon:{release(){if(!blade)return;pointAtHand();launch.copy(blade.position);originalQuat.copy(blade.quaternion);high.copy(launch);high.y+=8;
       groundOrigin.set(launch.x,actor.y,launch.z);
       Object.assign(arena,measureRefuge(radius,walkable,192,{x:launch.x-center.x,z:launch.z-center.z}));
       detached=true;},
     restore(){detached=false;giveBack();}},
   damage:({token,blocked})=>damage({token,blocked,actor}),
   beat:phase=>{
     if(phase==='announce' && body.gk.bones.headfront){
       body.gk.bones.Head.getWorldPosition(head);body.gk.bones.headfront.getWorldPosition(face);
       faceBearing=Math.atan2(face.x-head.x,face.z-head.z);
     }
     if(phase==='bladeCombo' && actor){actor.act=null;actor.anim={role:'gk_wc2',once:true,speed:1.35,rev:(actor.anim?.rev||0)+1};}
     if(phase==='throw' && actor && body?.acts?.gk_rslash){
       actor.act=null;
       actor.anim={role:'gk_rslash',once:true,speed:1,rev:(actor.anim?.rev||0)+1};
     }
     if((phase==='recover'||phase==='idle') && actor && actor.alive){
       actor.anim={role:'idle',once:false,speed:1,rev:(actor.anim?.rev||0)+1};
     }
     beat(phase,actor);
   }});
 const driver=createGreedAtomicEncounter(ultimate);
 function inactive(){return ultimate.getState().phase==='idle';}
 function clear(){
   driver.end();detached=false;forceQueued=false;giveBack();
   blade=null;actor=null;body=null;camera(null);
   corona.update(ultimate.getState(),elapsed,anchor);
 }
 return {
   getState:()=>({...ultimate.getState(),origin:groundOrigin.toArray(),blade:blade?.position.toArray(),boss:actor?[actor.x,actor.y,actor.z]:null,area:arena.fraction,normal:arena.normal,edge:arena.edge,center:[center.x,center.y,center.z]}),get active(){return !inactive()},get arena(){return arena},
   force(){if(!actor?.alive||actor.gk?.phase!==3||!inactive())return false;driver.end();forceQueued=true;return true;},
   clear,dispose(){clear();ultimate.dispose();corona.dispose();portrait.removeFromParent();portrait.dispose();},
   tick(dt,a,b,hero,{paused=false}={}){
     if(!a?.alive||a.kind!=='greedB'||a.gk?.phase!==3||!b?.gk||!hero){if(!inactive()||actor)clear();return ultimate.getState();}
     if(actor && actor.id!==a.id)clear();
     actor=a;body=b;
     const root=b.gk.roots.D; // a espada híbrida real D, e não uma mesh genérica
     if(root)blade=root;
     const local={x:hero.x-center.x,z:hero.z-center.z,evading:!!hero.evading,blocking:!!hero.blocking};
     const ac=a.act;const busy=!!paused||!!a.pendingDeath||!!(ac && (ac.type==='gkPhase'||ac.type==='gkFly'||ac.type==='gkThrow'||ac.type==='gkAtomic'||(ac.move && ac.phase!=='recovery')))||a.airY>.25;
     const was=ultimate.getState().phase;
     const encounter={id:a.id,phase:a.gk.phase,grounded:a.airY<=.25,busy,hpRatio:forceQueued?.4:a.hp/Math.max(1,a.maxHp),alive:a.alive};
     if(!paused)driver.tick(dt,encounter,local);
     if(forceQueued&&ultimate.getState().phase!=='idle')forceQueued=false;
     const st=ultimate.getState();
     if(st.phase!=='idle'){
       elapsed+=paused?0:dt;
       if(blade){
         if(!detached){pointAtHand();
           if(st.phase==='announce'&&st.progress<.28){
             const u=T.MathUtils.smoothstep(st.progress,0,.28);
             blade.position.lerp(orbitPosition,1-u);blade.quaternion.slerp(orbitRotation,1-u);
           }
           groundOrigin.set(a.x,a.y,a.z);arena.origin.x=groundOrigin.x-center.x;arena.origin.z=groundOrigin.z-center.z;}
         else{
           const t=st.phase==='throw'?Math.max(0,Math.min(1,(st.progress*1.12-.42)/.7)):1;
           blade.position.lerpVectors(launch,high,1-(1-t)**2);
           blade.quaternion.copy(originalQuat).multiply(spinQ.setFromAxisAngle(spinAxis,elapsed*2.8));
           if(st.phase==='recover'){body.hand.getWorldPosition(handPos);body.hand.getWorldQuaternion(handQuat).multiply(grip);blade.position.lerp(handPos,st.progress);blade.quaternion.slerp(handQuat,st.progress);}
           blade.visible=true;
         }
         anchor.copy(blade.position).sub(groundOrigin);anchor.y+=groundOrigin.y-center.y;
       } else anchor.set(a.x-center.x,8,a.z-center.z);
       corona.update(st,elapsed,anchor);
       body.gk.bones.Head.getWorldPosition(head);
       portrait.visible=['announce','bladeCombo','throw'].includes(st.phase);
       if(portrait.visible){
         portrait.position.copy(head);portrait.position.x+=Math.sin(faceBearing)*1.7;
         portrait.position.z+=Math.cos(faceBearing)*1.7;portrait.position.y+=.5;
         portrait.intensity=8+(st.phase==='throw'?8*st.progress:0);
       }
       const shot=aim(st.phase,st.progress,a,head,blade.position,hero,arena.normal,faceBearing);
       camera(shot);
     } else{
       if(was!=='idle'){giveBack();camera(null);}
       corona.update(st,elapsed,anchor);
     }
     return st;
   }
 };
}
