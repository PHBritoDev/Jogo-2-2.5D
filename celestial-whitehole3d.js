/** Deterministic cinematic timeline; no renderer, timers, quality or camera-dependent damage. */
export const WHITE_HOLE=Object.freeze({duration:17,damage:160,range:24,compression:.2,radius:7});
export const WHITE_PHASES=Object.freeze([['ascent',0],['sword',3],['rift',4.5],['growth',6],['silence',10],['launch',11],['return',14.3]]);
export function whiteFlash(t){return .12*Math.max(0,1-Math.abs(t-13.08)/.14);}
export function impactVictims(center,actors,damage,clear){
 const seen=new Set(),hits=[];
 for(const a of actors){
  if(!a.alive||a.hostile!==true||a.invulnerable||seen.has(a.id))continue;
  const r=a.radius||.52,top=Math.max(a.y+r,a.y+(a.height||1.9)-r);
  const nearestY=Math.max(a.y+r,Math.min(top,center.y));
  const distance=Math.max(0,Math.hypot(a.x-center.x,nearestY-center.y,a.z-center.z)-r-.16);
  if(distance>WHITE_HOLE.radius||!clear(center,a))continue;
  seen.add(a.id);
  hits.push([Math.round(damage*(1-.55*(distance/WHITE_HOLE.radius)**2)),a.id]);
 }
 return hits;
}
// Earliest entrance of a swept orb into a vertical capsule (upright combat rig).
function entry(p,q,a){
 const dx=q.x-p.x,dy=q.y-p.y,dz=q.z-p.z,ox=p.x-a.x,oz=p.z-a.z;
 const body=a.radius||.52,r=body+.16,lo=a.y+body,hi=Math.max(lo,a.y+(a.height||1.9)-body);
 let first=Infinity;
 function root(A,B,C){if(C<=0)return 0;const disc=B*B-A*C;return A>0&&disc>=0?(-B-Math.sqrt(disc))/A:Infinity;}
 const A=dx*dx+dz*dz,B=ox*dx+oz*dz,C=ox*ox+oz*oz-r*r;
 const k=root(A,B,C),h=p.y+dy*k;if(k>=0&&k<=1&&h>=lo&&h<=hi)first=k;
 for(const y of [lo,hi]){const oy=p.y-y,t=root(A+dy*dy,B+oy*dy,C+oy*oy);if(t>=0&&t<=1)first=Math.min(first,t);}
 return first;
}
export class CelestialWhiteHole{
 constructor({hit=()=>{},event=()=>{},actors=null,clear=()=>true,palm=null,solid=p=>p.y<=.16}={}){
  Object.assign(this,{hit,event,actors,clear,palm,solid,active:false,time:0,phase:'idle'});
 }
 start(source,target,multiplier=1){
  if(this.active||!target?.alive||Math.hypot(target.x-source.x,target.z-source.z)>WHITE_HOLE.range)return false;
  Object.assign(this,{source:{...source},target:{...target},id:target.id,damage:Math.round(WHITE_HOLE.damage*multiplier),time:0,phase:'ascent',active:true,hitDone:false,release:null,shot:null,contact:null});
  this.event('ascent');return true;
 }
 cancel(reason='cancel'){if(this.active){this.active=false;this.phase='idle';this.event(reason);}}
 update(dt,target,{paused=false,valid=true}={}){
  if(!this.active||paused)return;
  if(!valid||(this.time<11&&(!target?.alive||target.id!==this.id))){this.cancel();return;}
  const next=this.time+Math.max(0,dt),end=next>=17-1e-9?17:next;
  if(this.time<11)Object.assign(this.target,target);
  for(const [phase,at] of WHITE_PHASES){if(this.time<at&&end>=at&&phase!=='return'){this.phase=phase;this.event(phase);}}
  if(end>11){
   if(!this.shot){
    const hand=this.palm?.()||{...this.source,y:this.source.y+1.4},g=this.target;
    const duration=1.35;
    this.shot={x:hand.x,y:hand.y,z:hand.z,vx:(g.x-hand.x)/duration,vy:(g.y+1-hand.y)/duration+2.5*duration,vz:(g.z-hand.z)/duration,t:11};
    this.release={x:hand.x,y:hand.y,z:hand.z};
   }
   const actors=this.actors?this.actors():target?[{...target,hostile:true}]:[],p=this.shot;
   while(!this.contact&&p.t<end-1e-9){
    const h=Math.min(1/180,end-p.t),q={x:p.x+p.vx*h,y:p.y+p.vy*h-2.5*h*h,z:p.z+p.vz*h};
    let first=Infinity,victim=null;
    if(this.solid(q)){let lo=0,hi=1;for(let i=0;i<6;i++){const k=(lo+hi)/2;
     if(this.solid({x:p.x+(q.x-p.x)*k,y:p.y+(q.y-p.y)*k,z:p.z+(q.z-p.z)*k}))hi=k;else lo=k;}first=hi;}
    for(const a of actors){if(!a.alive||!a.hostile)continue;const k=entry(p,q,a);if(k<first){first=k;victim=a;}}
    const k=Math.min(1,first);p.x+=(q.x-p.x)*k;p.y+=(q.y-p.y)*k;p.z+=(q.z-p.z)*k;p.t+=h*k;p.vy-=5*h*k;
    if(first!==Infinity){this.contact={x:p.x,y:p.y,z:p.z,time:p.t,actor:victim?.id};this.phase='impact';this.event('impact');
     if(victim&&!victim.invulnerable)this.hit(Math.round(this.damage*.4),victim.id,'contact');}
   }
   if(this.contact&&!this.hitDone&&end>=this.contact.time+WHITE_HOLE.compression){this.hitDone=true;
    for(const [d,id] of impactVictims(this.contact,this.actors?this.actors():actors,Math.round(this.damage*.6),this.clear))this.hit(d,id,'wave');}
  }
  if(this.time<14.3&&end>=14.3){this.phase='return';this.event('return');}
  this.time=end;if(end>=17)this.cancel('finish');
 }
}
/** A single owner for cinematic state: release is idempotent and always attempted after failures. */
export class CinematicLease{
 constructor({capture,enter,restore}){Object.assign(this,{capture,enter,restore,snapshot:null});}
 get locked(){return this.snapshot!==null;}
 begin(){if(this.locked)return false;this.snapshot=this.capture();try{this.enter(this.snapshot);}catch(e){this.release();throw e;}return true;}
 release(){if(!this.locked)return;const s=this.snapshot;this.snapshot=null;this.restore(s);}
 run(frame){try{return frame();}catch(e){this.release();throw e;}}
}
