/** Mod 349 — integrador independente da ultimate do Codex sobre a fase III do Claude.
 * Não substitui a IA, animações, armas, VFX nem a state machine da Ganância.
 * Aceita coordenadas mundiais do jogo, converte para o disco local da ultimate,
 * e preserva a zona 80/20. */
import {measureRefuge,createGreedUltimate,createGreedAtomicEncounter} from './greed-ultimate-atomic3d.js';
import {createCorona} from './greed-ultimate-corona3d.js';

export function createGreedCampaignUltimate(T,scene,{center,radius,quality='medium',camera,beat,damage}){
 const arena=measureRefuge(radius,(x,z)=>Math.hypot(x,z)<=radius);
 const corona=createCorona(T,scene,arena,quality,center);
 const anchor=new T.Vector3(),launch=new T.Vector3(),high=new T.Vector3(center.x,center.y+8,center.z),originPoint=new T.Vector3(center.x,center.y,center.z),handPos=new T.Vector3(),handQuat=new T.Quaternion(),originalQuat=new T.Quaternion(),spinQ=new T.Quaternion(),spinAxis=new T.Vector3(0,1,0);
 let actor=null,body=null,blade=null,detached=false,elapsed=0,casting=false,lastPhase='idle';
 function pointAtHand(){
   if(!blade||!body?.hand)return;
   body.holder.updateWorldMatrix(true,true);body.hand.getWorldPosition(handPos);body.hand.getWorldQuaternion(handQuat);
   blade.position.copy(handPos);blade.quaternion.copy(handQuat);blade.visible=true;
 }
 const ultimate=createGreedUltimate({arena,speed:2.8,
   camera:{focus(){casting=true;camera(true,'announce',actor)},release(){camera(false,'escape',actor)}},
   weapon:{release(){if(!blade)return;pointAtHand();launch.copy(blade.position);originalQuat.copy(blade.quaternion);detached=true;},
     restore(){detached=false;casting=false; if(blade)blade.visible=false;}},
   damage:({token,blocked})=>damage({token,blocked,actor}),
   beat:phase=>{
     lastPhase=phase;
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
   driver.end();casting=false;detached=false;lastPhase='idle';if(blade)blade.visible=false;
   blade=null;actor=null;body=null;camera(false,'idle',null);
   corona.update(ultimate.getState(),elapsed,anchor);
 }
 return {
   getState:()=>ultimate.getState(),get active(){return !inactive()},get arena(){return arena},
   clear,dispose(){clear();ultimate.dispose();corona.dispose();},
   tick(dt,a,b,hero,{paused=false}={}){
     if(!a?.alive||a.kind!=='greedB'||a.gk?.phase!==3||!b?.gk||!hero){if(!inactive()||actor)clear();return ultimate.getState();}
     if(actor && actor.id!==a.id)clear();
     actor=a;body=b;
     const root=b.gk.roots.D; // a espada híbrida real D, e não uma mesh genérica
     if(root)blade=root;
     const local={x:hero.x-center.x,z:hero.z-center.z,evading:!!hero.evading,blocking:!!hero.blocking};
     const ac=a.act;const busy=!!paused||!!a.pendingDeath||!!(ac && (ac.type==='gkPhase'||ac.type==='gkFly'||ac.type==='gkThrow'||ac.type==='gkAtomic'||(ac.move && ac.phase!=='recovery')))||a.airY>.25;
     const was=ultimate.getState().phase;
     const encounter={id:a.id,phase:a.gk.phase,grounded:a.airY<=.25,busy,hpRatio:a.hp/Math.max(1,a.maxHp),alive:a.alive};
     if(!paused)driver.tick(dt,encounter,local);
     const st=ultimate.getState();
     if(st.phase!=='idle'){
       elapsed+=paused?0:dt;
       if(blade){
         if(!detached){pointAtHand();}
         else{
           const t=st.phase==='throw'?Math.max(0,Math.min(1,(st.progress*1.12-.42)/.7)):1;
           blade.position.lerpVectors(launch,high,1-(1-t)**2);
           blade.quaternion.copy(originalQuat).multiply(spinQ.setFromAxisAngle(spinAxis,elapsed*2.8));
           if(st.phase==='recover'){pointAtHand();}
           blade.visible=true;
         }
         anchor.copy(blade.position).sub(originPoint);
       } else anchor.set(a.x-center.x,8,a.z-center.z);
       corona.update(st,elapsed,anchor);
       camera(casting,st.phase,a,st);
     } else{
       if(was!=='idle'){if(blade)blade.visible=false;camera(false,'idle',a);}
       corona.update(st,elapsed,anchor);
     }
     return st;
   }
 };
}
