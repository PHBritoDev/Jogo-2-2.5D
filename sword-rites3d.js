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
 constructor(api={}){this.api={event(){},pose(){},hit(){},move(){},blocked:()=>false,...api};this.cooldowns={prota:0,aurora:0};this.active=null;this.waves=[];this.time=0;this.next=0;this.lastEnd=-100;this.serial=0;this.prevBlade=null;this.queued=false;}
 get busy(){return !!this.active;}
 get locksMovement(){return !!this.active&&this.active.kind!=='basic';}
 get invulnerable(){return this.active?.kind==='prota'&&this.active.t>=.3&&this.active.t<.49;}
 get holdTarget(){return this.active?.kind==='prota'&&this.active.t>=.46&&this.active.t<.65?this.active.targetId:null;}
 status(sword,mana){const s=SWORD_RITES[sword];if(!s)return{ok:false,reason:'Esta espada não possui rito exclusivo.'};if(this.busy)return{ok:false,reason:'Conclua o movimento atual.'};if(this.cooldowns[sword]>0)return{ok:false,reason:`${s.name}: ${Math.ceil(this.cooldowns[sword])} s.`};if(mana<s.mana)return{ok:false,reason:`Mana insuficiente (${s.mana}).`};return{ok:true};}
 attack(sword,{damage=25,yaw=0,target=null}={}){
  if(!SWORD_RITES[sword])return false;
  if(this.busy){if(this.active.kind==='basic'&&this.active.t>=this.active.def.buffer)this.queued=true;return false;}
  const step=this.time-this.lastEnd<.32?this.next:0,def=SWORD_COMBO[step];this.active={kind:'basic',sword,step,def,clip:def.clip,duration:def.duration,t:0,damage,yaw,targetId:target?.id,hit:false,serial:++this.serial};this.prevBlade=null;this.queued=false;this.api.event('start',this.active);return true;
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
  if(this.active||this.waves.length)this.api.event('cancel',{reason});this.active=null;this.waves.length=0;this.prevBlade=null;this.queued=false;this.next=0;this.lastEnd=-100;
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
   if(a.kind==='basic'&&Number.isFinite(ctx.yaw))a.yaw=ctx.yaw;
   if(a.kind==='prota'&&a.t>=.30&&a.t<=.47){
    const until=Math.min(a.path.length-1,Math.floor(clamp((a.t-.30)/.16,0,1)*(a.path.length-1)));
    while(a.pathIndex<until){const p=a.path[++a.pathIndex];if(this.api.blocked(p)||dist(p,target)<(target.radius||.5)+.45){this.cancel('obstacle');return;}this.api.move(p,a);}
   }
   // Pose callback returns actual base/tip transformed from the authored rig.
   const blade=this.api.pose(a,dt);
   const live=a.kind==='basic'?a.t>=a.def.open&&a.t<=a.def.close:a.kind==='prota'?a.t>=.3&&a.t<.48:[.4,.82,1.24,1.70].some(t=>a.t>=t-.08&&a.t<=t+.09);
   if(blade){if(live)this.api.event('blade',{a,blade});
    if(a.kind==='basic'&&live&&!a.hit&&target?.alive&&target.id===a.targetId){const prev=this.prevBlade||blade;
     if(bladeContact(prev.base,prev.tip,blade.base,blade.tip,target,(target.radius||.48)+.12)&&!segmentBlocked(ctx.from,target,this.api.blocked)){
      a.hit=true;this.api.hit(Math.round(a.damage*a.def.multiplier),target.id,'basic');this.api.event('impact',{target,sword:a.sword,final:a.step===2});
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
   if(a.t>=a.duration){this.lastEnd=this.time;this.next=a.kind==='basic'?(a.step+1)%3:0;const queued=this.queued;this.active=null;this.prevBlade=null;this.queued=false;this.api.event('finish',a);if(queued&&a.kind==='basic')this.attack(a.sword,{damage:a.damage,yaw:a.yaw,target});}
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
