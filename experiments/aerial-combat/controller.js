import {bladeContact,segmentBlocked} from '../../sword-rites3d.js';
export const MOBILITY=Object.freeze({dashCooldown:.400,dashDuration:.16,dashSpeed:18,gravity:15,jump:6.2,stall:.16,airBudget:.42,airLimit:2.5});
export const CAPABILITIES=Object.freeze({player:{dash:true,jump:true,attack:true,magic:true},fighter:{dash:true,jump:true,attack:true,magic:false},civilian:{dash:true,jump:false,attack:false,magic:false}});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
/** Same axis-separated movement contract as the world, with small swept steps.
 * Environment and actor capsules are supplied by the host; no map/save ownership.
 */
export function moveWithCollision(p,dx,dz,blocked){
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.07));
 for(let i=0;i<n;i++){if(!blocked(p.x+dx/n,p.z,p.y))p.x+=dx/n;if(!blocked(p.x,p.z+dz/n,p.y))p.z+=dz/n;}
}
export class Mobility {
 constructor(p,{blocked=()=>false,ground=()=>0,event=()=>{},capabilities=CAPABILITIES.player}={}){Object.assign(this,{p,blocked,ground,event,capabilities});this.reset();}
 reset(){this.vy=0;this.grounded=true;this.jumpUsed=false;this.dash=null;this.nextDash=-1;this.stall=0;this.budget=0;this.airTime=0;this.lock=false;this.invulnerableUntil=0;}
 cancel(){this.dash=null;this.stall=0;this.budget=MOBILITY.airBudget;this.invulnerableUntil=0;}
 dashAt(now,dir,yaw,prototype=true){if(this.lock||!this.capabilities.dash||now+1e-9<this.nextDash)return false;
  const len=Math.hypot(dir.x,dir.z),x=len>.12?dir.x/len:Math.sin(yaw),z=len>.12?dir.z/len:Math.cos(yaw);
  this.nextDash=now+(prototype?MOBILITY.dashCooldown:.72);this.dash={x,z,left:prototype?MOBILITY.dashDuration:.32,speed:prototype?MOBILITY.dashSpeed:12.5};this.invulnerableUntil=now+.12;this.event('dash',{now,x,z});return true;
 }
 jumpAt(now,prototype=true){if(this.lock||!this.capabilities.jump||!this.grounded||this.jumpUsed)return false;
  this.jumpUsed=true;this.grounded=false;this.vy=prototype?MOBILITY.jump:5.2;this.airTime=0;this.dash=null;this.event('jump',{now});return true;
 }
 hold(seconds){if(this.grounded||this.airTime>MOBILITY.airLimit)return 0;const n=Math.min(seconds,Math.max(0,MOBILITY.airBudget-this.budget));this.stall=Math.max(this.stall,n);this.budget+=n;return n;}
 launch(v=5.9){if(this.airTime>MOBILITY.airLimit)return false;this.grounded=false;this.jumpUsed=true;this.vy=v;this.stall=0;return true;}
 step(dt,axis,speed=4.3){if(this.lock){this.cancel();axis={x:0,z:0};}
  const d=this.dash;if(d){const t=Math.min(dt,d.left);moveWithCollision(this.p,d.x*d.speed*t,d.z*d.speed*t,this.blocked);d.left-=dt;if(d.left<=0)this.dash=null;}
  else moveWithCollision(this.p,axis.x*speed*dt,axis.z*speed*dt,this.blocked);
  const floor=this.ground(this.p.x,this.p.z);
  if(!this.grounded){this.airTime+=dt;if(this.stall>0&&this.airTime<MOBILITY.airLimit)this.stall=Math.max(0,this.stall-dt);else{this.vy-=MOBILITY.gravity*dt;this.p.y+=this.vy*dt;}
   if(this.p.y<=floor){this.p.y=floor;this.vy=0;this.grounded=true;this.jumpUsed=false;this.stall=this.budget=this.airTime=0;this.event('land',{});}
  }else this.p.y=floor;
 }
}
/** One sword. The host supplies inspected clips and actual world-space blade endpoints. */
export class AerialCombo {
 constructor({moves,mobility,targets=()=>[],blocked=()=>false,damage=()=>false,event=()=>{}}){Object.assign(this,{moves,mobility,targets,blocked,damage,event});this.reset();}
 reset(){this.active=null;this.queuedUntil=-1;this.next=0;this.lastEnd=-9;this.serial=0;this.mana=40;this.hitstop=0;this.magic=null;this.magicReady=0;this.targetId=null;this.prev=null;}
 get canCancel(){return !this.magic&&(!this.active||this.active.t<this.active.def.open*.6||this.active.t>this.active.def.close+.035);}
 cancel(reason){this.active=null;this.magic=null;this.queuedUntil=-1;this.next=0;this.prev=null;this.hitstop=0;this.mobility.cancel();this.event('cancel',{reason});}
 pick(yaw){const p=this.mobility.p,old=this.targets().find(t=>t.id===this.targetId&&t.alive);let best=null,score=Infinity;
  for(const t of this.targets()){if(!t.alive)continue;const d=Math.hypot(t.p.x-p.x,t.p.z-p.z),a=Math.abs(wrap(Math.atan2(t.p.x-p.x,t.p.z-p.z)-yaw));
   if(d>4||a>1||Math.abs(t.p.y-p.y)>2.6||segmentBlocked(p,t.p,v=>this.blocked(v.x,v.z,v.y)))continue;
   const s=d+a*1.4-(old===t?.55:0);if(s<score){score=s;best=t;}
  }this.targetId=best?.id||null;return best;
 }
 attack(now,yaw){if(!this.mobility.capabilities.attack||this.mobility.lock||this.magic)return false;
  if(this.active){if(this.active.t>=this.active.def.buffer){this.queuedUntil=now+.18;return true;}return false;}
  if(now-this.lastEnd>.34)this.next=0;const def=this.moves[this.next];if(!def||def.disabled)return false;
  const target=this.pick(yaw);this.active={def,t:0,id:++this.serial,hit:new Set(),yaw,target,air:!this.mobility.grounded};this.prev=null;
  this.event('attack',{...this.active,now});return true;
 }
 cast(now){if(!this.mobility.capabilities.magic||this.mobility.lock||this.magic||!this.canCancel||now<this.magicReady||this.mana<18)return false;
  this.active=null;this.prev=null;this.mana-=18;this.magicReady=now+1.6;this.magic={t:0,released:false};this.event('cast',{});return true;
 }
 tick(dt,now,yaw){if(this.mobility.lock){this.cancel('locked');return yaw;}
  if(this.magic){const m=this.magic;m.t+=dt;if(m.t>=.28&&!m.released){m.released=true;this.mobility.hold(.10);this.event('magicRelease',{});}if(m.t>=.55)this.magic=null;}
  const a=this.active;if(!a)return yaw;
  const step=this.hitstop>0?dt*.08:dt;this.hitstop=Math.max(0,this.hitstop-dt);a.t+=step;
  if(a.target?.alive&&a.t<a.def.close){const p=this.mobility.p,t=a.target.p,dist=Math.hypot(t.x-p.x,t.z-p.z);yaw+=clamp(wrap(Math.atan2(t.x-p.x,t.z-p.z)-yaw),-step*5,step*5);
   if(a.t<a.def.open&&dist>1.35){const travel=Math.min(a.def.lunge*step/Math.max(.1,a.def.open),dist-1.35);moveWithCollision(p,Math.sin(yaw)*travel,Math.cos(yaw)*travel,this.blocked);}
  }a.yaw=yaw;
  if(a.t>=a.def.duration){this.lastEnd=now;this.next=(this.next+1)%this.moves.length;this.active=null;this.prev=null;if(this.queuedUntil>=now)this.attack(now,yaw);this.queuedUntil=-1;}
  return yaw;
 }
 contact(blade){const a=this.active;if(!a){this.prev=null;return;}
  const prev=this.prev||blade;this.prev={base:{...blade.base},tip:{...blade.tip}};
  if(a.t<a.def.open||a.t>a.def.close)return;
  for(const target of this.targets()){
   if(!target.alive||target.invulnerable||a.hit.has(target.id))continue;
   const t={x:target.p.x,y:target.p.y+target.height*.5,z:target.p.z,height:target.height};
   if(segmentBlocked(this.mobility.p,t,v=>this.blocked(v.x,v.z,v.y))||segmentBlocked(blade.base,blade.tip,v=>this.blocked(v.x,v.z,v.y)))continue;
   if(!bladeContact(prev.base,prev.tip,blade.base,blade.tip,t,target.radius))continue;
   if(!this.damage(target,a.def.damage,{kind:'physical',swing:a.id,launcher:a.def.launcher,finisher:a.def.finisher}))continue;
   a.hit.add(target.id);this.mana=Math.min(100,this.mana+7);this.hitstop=a.def.finisher?.055:.035;
   if(!this.mobility.grounded)this.mobility.hold(MOBILITY.stall);
   this.event('hit',{target,move:a.def,point:{...blade.tip},swing:a.id});
  }
 }
}
