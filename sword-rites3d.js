import {combatMove,WEAPON_STYLES} from './combat-choreography3d.js';
import {makeEnergy,energyStep,energyTouches,energyFalloff} from './prota-combat3d.js';
/** Mod 231. Deterministic sword combat, independent of Three, DOM and wall time. */
export const SWORD_RITES=Object.freeze({
 prota:{name:'Passagem do Julgamento',label:'PASSAGEM',mana:28,cooldown:12,duration:1.95,clip:'Rite_Judgment'},
 aurora:{name:'Eclipse das Lâminas',label:'ECLIPSE',mana:38,cooldown:16,duration:2.30,clip:'Rite_Eclipse'}
});
export const SWORD_COMBO=Object.freeze([
 {clip:'Rite_Crescent',duration:.72,open:.235,close:.41,buffer:.28,multiplier:1},
 {clip:'Rite_Reverse',duration:.70,open:.205,close:.41,buffer:.27,multiplier:1.12},
 {clip:'Rite_Ascendant',duration:.86,open:.255,close:.46,buffer:.34,multiplier:1.32}
]);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const copy=p=>({x:p.x,y:p.y,z:p.z});
export function segmentDistance(p,a,b){const x=b.x-a.x,y=b.y-a.y,z=b.z-a.z,l=x*x+y*y+z*z,t=l?clamp(((p.x-a.x)*x+(p.y-a.y)*y+(p.z-a.z)*z)/l,0,1):0;return Math.hypot(p.x-a.x-x*t,p.y-a.y-y*t,p.z-a.z-z*t);}
/** Includes the spawn segment: a blade reaching past a thin wall cannot emit behind it. */
export function segmentBlocked(a,b,blocked){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/.06));for(let i=1;i<=n;i++){const u=i/n;if(blocked({x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,z:a.z+(b.z-a.z)*u}))return true;}return false;}
/** Sweep the true blade, interpolating both endpoints, against a vertical capsule. */
export function bladeContact(a,b,c,d,target,radius=.48){
 const travel=Math.max(Math.hypot(c.x-a.x,c.y-a.y,c.z-a.z),Math.hypot(d.x-b.x,d.y-b.y,d.z-b.z)),n=Math.max(1,Math.ceil(travel/.06));
 for(let i=0;i<=n;i++){const u=i/n,base={x:a.x+(c.x-a.x)*u,y:a.y+(c.y-a.y)*u,z:a.z+(c.z-a.z)*u},tip={x:b.x+(d.x-b.x)*u,y:b.y+(d.y-b.y)*u,z:b.z+(d.z-b.z)*u};
  for(let j=0;j<=4;j++){const p={x:target.x,y:target.y+(j/4-.5)*(target.height||1.7),z:target.z};if(segmentDistance(p,base,tip)<=radius)return true;}
 }return false;
}
/** Horizontal aim only. Assist is bounded by range, cone, floor and line of sight. */
export function swordAim(from,yaw,target,blocked=()=>false,{assist=true,range=18,cone=.55}={}){
 if(!assist||!target?.alive)return yaw;
 const dx=target.x-from.x,dz=target.z-from.z,d=Math.hypot(dx,dz),want=Math.atan2(dx,dz);
 const delta=Math.atan2(Math.sin(want-yaw),Math.cos(want-yaw));
 if(d<.01||d>range||Math.abs(delta)>cone||Math.abs(target.y-(target.height||1.75)*.52-from.y)>1.4||segmentBlocked(from,target,blocked))return yaw;
 return want;
}
export const JUDGMENT_TIMES=Object.freeze([.65,.71,.77,.83,.89,.95,1.01,1.07,1.13,1.19,1.25,1.31,1.37,1.43,1.49,1.60]);
/** Sixteen visible cuts share the original total damage budget (76 at base 25). */
export function judgmentDamage(base,n){const total=Math.round(base*3.04),finish=Math.round(total*.4),small=total-finish;return n===15?finish:Math.floor(small*(n+1)/15)-Math.floor(small*n/15);}
/** Fast corridor past one flank: straight approach, straight crossing, short exit.
 * Every segment is sampled and checked against both scenery and the target capsule. */
export function passagePath(from,target,blocked){
 const distance=dist(from,target),r=Math.max(1.15,(target.radius||.5)+.65);if(distance>7||distance<r-.2||segmentBlocked(from,target,blocked))return null;
 const dx=(target.x-from.x)/distance,dz=(target.z-from.z)/distance;
 for(const side of [1,-1]){
  const points=[copy(from)];let ok=true;
  const append=p=>{const a=points[points.length-1],steps=Math.max(1,Math.ceil(dist(a,p)/.06));for(let i=1;i<=steps;i++){const t=i/steps,q={x:a.x+(p.x-a.x)*t,y:from.y,z:a.z+(p.z-a.z)*t};if(blocked(q)||dist(q,target)<r-.08){ok=false;return;}points.push(q);}};
  const at=(ahead,lateral)=>({x:target.x+dx*ahead+dz*lateral*side,y:from.y,z:target.z+dz*ahead-dx*lateral*side});
  append(at(-r,r));if(ok)append(at(r,r));if(ok)append(at(r,0));if(ok)return points;
 }return null;
}
export class SwordRites {
 constructor(api={}){this.api={event(){},pose(){},hit(){},move(){},blocked:()=>false,...api};this.cooldowns={prota:0,aurora:0};this.active=null;this.waves=[];this.time=0;this.next=0;this.lastEnd=-100;this.serial=0;this.prevBlade=null;this.queued=false;this.energies=[];}
 get canCancel(){return !this.active||(this.active.kind==='basic'&&(this.active.t<this.active.def.open*.65||this.active.t>this.active.def.close+.04));}
 get busy(){return !!this.active;}
 get locksMovement(){return !!this.active&&this.active.kind!=='basic';}
 get invulnerable(){return this.active?.kind==='prota'&&this.active.t>=.3&&this.active.t<.49;}
 get holdTarget(){return this.active?.kind==='prota'&&this.active.t>=.46&&this.active.t<.65?this.active.targetId:null;}
 status(sword,mana){const s=SWORD_RITES[sword];if(!s)return{ok:false,reason:'Esta espada não possui rito exclusivo.'};if(this.busy)return{ok:false,reason:'Conclua o movimento atual.'};if(this.cooldowns[sword]>0)return{ok:false,reason:`${s.name}: ${Math.ceil(this.cooldowns[sword])} s.`};if(mana<s.mana)return{ok:false,reason:`Mana insuficiente (${s.mana}).`};return{ok:true};}
 attack(sword,{damage=25,yaw=0,target=null,mode='ground'}={}){
  if(!SWORD_RITES[sword]&&!(this.api.choreography&&WEAPON_STYLES[sword]))return false;
  if(this.busy){if(this.active.kind==='basic'&&this.active.t>=this.active.def.buffer)this.queued=true;return false;}
  // Mod 302: o protagonista pode trazer o próprio repertório (api.moveset); sem ele, nada muda para as outras espadas.
  const chain=this.lastDef?.chain||.32,stepFor=this.time-this.lastEnd<chain?this.next:0,own=this.api.moveset?.(sword,mode,stepFor),step=own?stepFor%(own.count||5):stepFor,profile=own||(this.api.choreography?combatMove(sword,mode,step):null),def=profile?{...profile,clip:profile.id}:SWORD_COMBO[step];this.active={kind:'basic',sword,step,def,mode:profile?mode:'ground',phase:'windup',clip:def.clip,duration:def.duration,t:0,damage,yaw,targetId:target?.id,hit:false,serial:++this.serial};this.prevBlade=null;this.queued=false;this.api.event('start',this.active);return true;
 }
 cast(sword,{mana,owned=true,damage=25,yaw=0,from,target}={}){
  const ready=this.status(sword,mana);if(!ready.ok)return ready;if(!owned)return{ok:false,reason:'Adquira esta espada na loja.'};
  let path=null;if(sword==='prota'){
   if(!target?.alive||Math.abs(target.y-(target.height||1.75)*.52-from.y)>1.4)return{ok:false,reason:'Aproxime-se de um alvo no mesmo piso.'};
   path=passagePath(from,target,this.api.blocked);if(!path)return{ok:false,reason:'Sem passagem segura atrás do alvo.'};
  }
  const def=SWORD_RITES[sword];this.cooldowns[sword]=def.cooldown;this.active={kind:sword,sword,clip:def.clip,duration:def.duration,t:0,damage,yaw,targetId:target?.id,markedTarget:target?copy(target):null,path,pathIndex:0,events:0,serial:++this.serial};this.prevBlade=null;this.queued=false;this.api.event('start',this.active);return{ok:true,cost:def.mana};
 }
 cancel(reason='cancel'){
  if(this.active||this.waves.length||this.energies.length)this.api.event('cancel',{reason});this.active=null;this.waves.length=0;this.prevBlade=null;this.queued=false;this.next=0;this.lastEnd=-100;
  for(const e of this.energies)e.done=true;this.energies.length=0;
 }
 /** Solta a energia de um golpe a partir da lâmina real (altura do meio da lâmina, centrada no corpo para o setor). */
 release(a,blade,ctx){
  a.energyOut=true;const from=ctx.from||{x:0,y:0,z:0},spec=a.def.energy,mid=blade?{x:(blade.base.x+blade.tip.x)/2,y:(blade.base.y+blade.tip.y)/2,z:(blade.base.z+blade.tip.z)/2}:{x:from.x,y:from.y+1.05,z:from.z};
  const ground=ctx.ground??from.y,y=Math.max(ground+.35,Math.min(ground+1.9,mid.y));
  const ay=a.aimYaw??a.yaw,origin=spec.kind==='wave'?{x:from.x+Math.sin(ay)*.6,y,z:from.z+Math.cos(ay)*.6}:{x:from.x,y,z:from.z};
  if(spec.kind==='wave'&&segmentBlocked({x:from.x,y,z:from.z},origin,this.api.blocked)){this.api.event('obstructed',{p:origin,sword:a.sword});return;}
  const e=makeEnergy(spec,{x:origin.x,y:origin.y,z:origin.z},a.aimYaw??a.yaw,0);e.owner=a;e.sword=a.sword;e.serial=++this.serial;this.energies.push(e);this.api.event('energy',e);
 }
 update(dt,ctx={}){
  if(ctx.paused)return;if(!Number.isFinite(dt)||dt<=0)return;
  if(ctx.valid===false){this.cancel('context');return;}
  // Substeps retain all events at 30/60/120 FPS; large stalls are bounded.
  let left=Math.min(dt,.25);while(left>1e-8){const h=Math.min(left,1/120);left-=h;this.tick(h,ctx);}
 }
 tick(dt,ctx){
  this.time+=dt;for(const id of ['prota','aurora'])this.cooldowns[id]=Math.max(0,this.cooldowns[id]-dt);
  const a=this.active,target=ctx.target;
  if(a){
   if(ctx.sword!==undefined&&ctx.sword!==a.sword){this.cancel('weapon');return;}
   if(a.kind==='prota'&&(!target?.alive||target.id!==a.targetId||dist(ctx.from,target)>9)){this.cancel('target');return;}
   a.t=Math.min(a.duration,a.t+dt);
   if(a.kind==='basic'){a.phase=a.t<a.def.open?'windup':a.t<=a.def.close?'active':'recovery';if(a.mode==='plunge'&&!ctx.grounded){a.fallTime=(a.fallTime||0)+dt;a.t=Math.min(a.t,a.def.open-.015);a.phase='windup';if(a.fallTime>4){this.cancel('fall-timeout');return;}}
    if(a.def.drive)this.api.drive?.(a,dt,target);
    else if(this.api.choreography&&a.mode==='ground'&&a.def.advance&&a.t<a.def.close&&a.t>a.def.open*.5&&!ctx.moving){const speed=a.def.advance/(a.def.close-a.def.open*.5);this.api.advance?.(Math.sin(a.yaw)*speed*dt,Math.cos(a.yaw)*speed*dt);}
   }
   if(a.kind==='basic'&&a.t>=a.def.open&&!a.released){a.released=true;this.api.event('active',a);}
   if(a.kind==='basic'&&!a.def.drive&&Number.isFinite(ctx.yaw)&&(!this.api.choreography||a.t<a.def.open*.65)&&a.mode!=='dash')a.yaw=ctx.yaw;
   if(a.kind==='prota'&&a.t>=.30&&a.t<=.47){
    const until=Math.min(a.path.length-1,Math.floor(clamp((a.t-.30)/.16,0,1)*(a.path.length-1)));
    while(a.pathIndex<until){const p=a.path[++a.pathIndex];if(this.api.blocked(p)||dist(p,target)<(target.radius||.5)+.45){this.cancel('obstacle');return;}this.api.move(p,a);}
   }
   // Pose callback returns actual base/tip transformed from the authored rig.
   const blade=this.api.pose(a,dt);
   const live=a.kind==='basic'?a.t>=a.def.open&&a.t<=a.def.close:a.kind==='prota'?a.t>=.3&&a.t<.48:[.4,.82,1.24,1.70].some(t=>a.t>=t-.08&&a.t<=t+.09);
   if(blade){if(live)this.api.event('blade',{a,blade});
    if(a.kind==='basic'&&a.def.energy&&!a.energyOut&&a.t>=a.def.energy.at)this.release(a,blade,ctx);
    if(a.def?.drive&&live&&target?.alive){let m=Infinity;for(let j=0;j<=4;j++)m=Math.min(m,segmentDistance({x:target.x,y:target.y+(j/4-.5)*(target.height||1.7),z:target.z},blade.base,blade.tip));a.closest=Math.min(a.closest??Infinity,m-(target.radius||.48)-.2);}
    if(a.kind==='basic'&&a.def.hit!=='energy'&&live&&!a.hit&&target?.alive&&(target.id===a.targetId||a.def.drive)){const prev=this.prevBlade||blade;
     if(bladeContact(prev.base,prev.tip,blade.base,blade.tip,target,(target.radius||.48)+(a.def.drive?.2:.12))&&!segmentBlocked(ctx.from,target,this.api.blocked)&&!segmentBlocked(blade.base,blade.tip,this.api.blocked)){
      a.hit=true;a.hitBy='blade';this.api.hit(Math.round(a.damage*a.def.multiplier),target.id,'basic');this.api.event('impact',{target,sword:a.sword,final:a.def.drive?!!a.def.finisher:a.step===(this.api.choreography?4:2),pattern:a.def.pattern,mode:a.mode,by:'blade',p:{x:(blade.base.x+blade.tip.x)/2,y:(blade.base.y+blade.tip.y)/2,z:(blade.base.z+blade.tip.z)/2},hitstop:a.def.hitstop,shake:a.def.shake});
     }
    }this.prevBlade={base:copy(blade.base),tip:copy(blade.tip)};
   }
   if(a.kind==='prota'){
    const moments=JUDGMENT_TIMES;while(a.events<moments.length&&a.t>=moments[a.events]){
     const n=a.events++;if(target?.alive&&target.id===a.targetId&&dist(ctx.from,target)<4.5&&!segmentBlocked(ctx.from,target,this.api.blocked)){this.api.hit(judgmentDamage(a.damage,n),target.id,'judgment');this.api.event('judgment',{target,n,sword:a.sword,final:n===15});}
    }
   }else if(a.kind==='aurora'){
    const moments=[.40,.82,1.24,1.70];while(a.events<moments.length&&a.t>=moments[a.events]){
     const n=a.events++,p=blade?copy(blade.tip):copy(ctx.from);if(!blade)p.y+=1.10;
     // Keep the release height within the blade's real segment; never derive velocity from its rising tip.
     if(blade){const desired=ctx.from.y+1.1,dy=blade.tip.y-blade.base.y,u=Math.abs(dy)>.001?clamp((desired-blade.base.y)/dy,0,1):.65;
      p.x=blade.base.x+(blade.tip.x-blade.base.x)*u;p.y=blade.base.y+dy*u;p.z=blade.base.z+(blade.tip.z-blade.base.z)*u;}

     if(segmentBlocked(ctx.from,p,this.api.blocked)){this.api.event('obstructed',{p,sword:a.sword});continue;}
     const w={p,origin:copy(p),direction:{x:Math.sin(a.yaw),y:0,z:Math.cos(a.yaw)},previous:copy(p),yaw:a.yaw,roll:[.12,-.78,1.24,.75][n],maxRadius:n===3?2.1:1.55,radius:(n===3?2.1:1.55)*.28,travel:0,speed:10+n*.7,range:18,damage:Math.round(a.damage*(n===3?1.5:.8)),hits:new Set(),n,age:0,serial:++this.serial};this.waves.push(w);this.api.event('wave',w);
    }
   }
   // Mod 302: com golpe enfileirado, o follow-through vira o startup do próximo (cancelAt), sem esperar a recuperação inteira.
   if(a.t>=a.duration||(a.kind==='basic'&&this.queued&&a.def.cancelAt&&a.t>=a.def.cancelAt)){this.lastDef=a.kind==='basic'?a.def:null;this.lastEnd=this.time;this.next=a.kind==='basic'?(a.step+1)%(a.def.count||(this.api.choreography?5:3)):0;const queued=this.queued;this.active=null;this.prevBlade=null;this.queued=false;this.api.event('finish',a);if(queued&&a.kind==='basic')this.attack(a.sword,{damage:a.damage,yaw:a.yaw,target,mode:ctx.grounded===false?(this.api.airMode?.()||'air'):'ground'});}
  }
  // Mod 302: volumes de energia (setor que se expande / onda que viaja). O dano sai quando a FRENTE visível toca o corpo;
  // compartilha o "acertou" do golpe (híbrido nunca dá dano dobrado) e respeita parede/linha de visão.
  for(let i=this.energies.length-1;i>=0;i--){const e=this.energies[i],owner=e.owner;
   if(e.kind==='wave'){const fx=Math.sin(e.yaw),fz=Math.cos(e.yaw),end=Math.min(e.range,e.travel+e.speed*dt);for(let d=e.travel;d<=end+1e-6&&!e.done;d+=Math.max(.05,Math.min(.06,end-d||.06)))for(const k of [-1,0,1]){const off=k*e.radius*.7*Math.cos(e.roll);if(this.api.blocked({x:e.x+fx*d+fz*off,y:e.y,z:e.z+fz*d-fx*off})){e.done=true;e.blockedAt=d;break;}}}
   const touched=!e.done&&energyStep(e,dt,target,{blocked:(a,b)=>segmentBlocked(a,b,this.api.blocked)});
   // Mod 315: a onda também alcança os OUTROS inimigos da cena (uma vez por golpe cada; o alvo do golpe divide o "acertou" com a lâmina)
   if(!e.done&&ctx.others&&ctx.others.length){e.hits=e.hits||new Set();for(const o of ctx.others){if(!o.alive||o.id===target?.id||e.hits.has(o.id)||owner.sideHits?.has(o.id))continue;if(energyTouches(e,o,(a,b)=>segmentBlocked(a,b,this.api.blocked))){e.hits.add(o.id);(owner.sideHits=owner.sideHits||new Set()).add(o.id);const d=Math.hypot(o.x-ctx.from.x,o.z-ctx.from.z);this.api.hit(Math.round(owner.damage*owner.def.multiplier*energyFalloff(e,d)*.8),o.id,'energy-side',{target:o,energy:e});}}}
   if(touched&&!owner.hit&&target?.alive&&(target.id===owner.targetId||owner.def.drive)){owner.hit=true;owner.hitBy='energy';this.api.hit(Math.round(owner.damage*owner.def.multiplier*energyFalloff(e,Math.hypot(target.x-ctx.from.x,target.z-ctx.from.z))),target.id,'basic');
    const fx=Math.sin(e.yaw),fz=Math.cos(e.yaw),d=Math.hypot(target.x-e.x,target.z-e.z)||1,r=target.radius||.5;
    this.api.event('impact',{target,sword:owner.sword,final:!!owner.def.finisher,pattern:owner.def.pattern,mode:owner.mode,by:'energy',energy:e,p:e.kind==='sector'?{x:target.x-(target.x-e.x)/d*r,y:target.y,z:target.z-(target.z-e.z)/d*r}:{x:target.x-fx*r,y:target.y,z:target.z-fz*r},hitstop:owner.def.hitstop,shake:owner.def.shake});}
   if(e.done){this.api.event('energyEnd',e);this.energies.splice(i,1);}
  }
  for(let i=this.waves.length-1;i>=0;i--){const w=this.waves[i];w.age+=dt;const distance=Math.min(w.speed*dt,w.range-w.travel),steps=Math.max(1,Math.ceil(distance/.06));let gone=false;Object.assign(w.previous,w.p);
   for(let j=0;j<steps;j++){
    const delta=distance/steps;w.p.x+=w.direction.x*delta;w.p.z+=w.direction.z*delta;w.travel+=delta;w.radius=w.maxRadius*(.28+.72*Math.min(1,w.travel/2.2));
    // Sweep the width as well as the centre, so a wave cannot hit through a wall.
    for(let k=-2;k<=2;k++){const off=k*.5*w.radius*Math.cos(w.roll);if(this.api.blocked({x:w.p.x+Math.cos(w.yaw)*off,y:w.p.y,z:w.p.z-Math.sin(w.yaw)*off})){gone=true;break;}}
    if(gone)break;
    if(target?.alive&&!w.hits.has(target.id)){
     const dx=target.x-w.p.x,dz=target.z-w.p.z,along=dx*Math.sin(w.yaw)+dz*Math.cos(w.yaw),side=dx*Math.cos(w.yaw)-dz*Math.sin(w.yaw),dy=target.y-w.p.y;
     const cross=side*Math.cos(w.roll)+dy*Math.sin(w.roll),thick=-side*Math.sin(w.roll)+dy*Math.cos(w.roll);
     if(Math.abs(along)<.55+(target.radius||.5)&&Math.abs(cross)<w.radius+(target.radius||.5)&&Math.abs(thick)<.55+(target.height||1.7)*.4){w.hits.add(target.id);this.api.hit(w.damage,target.id,'eclipse');this.api.event('impact',{target,sword:'aurora',final:w.n===3});}
    }
   }
   if(gone||w.travel>=w.range){this.api.event('waveEnd',w);this.waves.splice(i,1);}
  }
 }
}
