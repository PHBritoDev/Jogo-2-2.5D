/** Deterministic cinematic timeline; no renderer, timers, quality or camera-dependent damage. */
export const WHITE_HOLE=Object.freeze({duration:17,damage:160,range:24,impact:13,radius:7});
export const WHITE_PHASES=Object.freeze([['ascent',0],['sword',3],['rift',4.5],['growth',6],['silence',10],['launch',11],['impact',13],['return',14.3]]);
export function whitePhase(t){let result=WHITE_PHASES[0];for(const p of WHITE_PHASES)if(t>=p[1])result=p;return {name:result[0],age:t-result[1]};}
export function whiteFlash(t){return .12*Math.max(0,1-Math.abs(t-13.08)/.14);}
export function impactVictims(center,actors,damage,clear){
 const seen=new Set(),hits=[];
 for(const a of actors){
  if(!a.alive||a.hostile!==true||a.invulnerable||seen.has(a.id))continue;
  const distance=Math.hypot(a.x-center.x,a.y-center.y,a.z-center.z);
  if(distance>WHITE_HOLE.radius||!clear(center,a))continue;
  seen.add(a.id);
  hits.push([Math.round(damage*(1-.55*(distance/WHITE_HOLE.radius)**2)),a.id]);
 }
 return hits;
}
// Flight coordinates are shared by the renderer and the obstruction sweep.
export function throwPosition(out,origin,target,alt,u){
 const dx=target.x-origin.x,dz=target.z-origin.z,len=Math.hypot(dx,dz)||1;
 const x=origin.x+dx/len*3.15,z=origin.z+dz/len*3.15,y=origin.y+1.5+alt+Math.min(alt*.65,5);
 out.x=x+(target.x-x)*u;out.z=z+(target.z-z)*u;
 out.y=y+(target.y+.32-y)*u+Math.sin(u*Math.PI)*Math.min(2,alt*.25);
 return out;
}
export class CelestialWhiteHole{
 constructor({hit=()=>{},event=()=>{},actors=null,clear=()=>true,flightClear=()=>true}={}){Object.assign(this,{hit,event,actors,clear,flightClear,active:false,time:0,phase:'idle',hitDone:false});}
 start(source,target,multiplier=1){
  if(this.active||!target?.alive||Math.hypot(target.x-source.x,target.z-source.z)>WHITE_HOLE.range)return false;
  this.source={...source};this.target={...target};this.id=target.id;this.damage=Math.round(WHITE_HOLE.damage*multiplier);
  this.time=0;this.phase='ascent';this.hitDone=false;this.active=true;this.event('ascent');return true;
 }
 cancel(reason='cancel'){if(!this.active)return;this.active=false;this.phase='idle';this.event(reason);}
 update(dt,target,{paused=false,valid=true}={}){
  if(!this.active||paused)return;
  if(!valid||(!this.hitDone&&this.time<11&&(!target?.alive||target.id!==this.id))){this.cancel();return;}
  const end=Math.min(WHITE_HOLE.duration,this.time+Math.max(0,dt));
  if(this.time<11&&target)Object.assign(this.target,target);
  for(const [phase,at] of WHITE_PHASES){
   if(this.time>=at||end<at)continue;
   if(phase==='launch'&&!this.flightClear(this.source,this.target)){this.cancel('obstructed');return;}
   this.phase=phase;this.event(phase);
   if(phase==='impact'&&!this.hitDone){
    this.hitDone=true;
    const actors=this.actors?this.actors():target?[{...target,hostile:true}]:[];
    for(const [d,id] of impactVictims(this.target,actors,this.damage,this.clear))this.hit(d,id);
   }
  }
  this.time=end;this.phase=whitePhase(end).name;if(end>=WHITE_HOLE.duration)this.cancel('finish');
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
