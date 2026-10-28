/** Deterministic cinematic timeline; no renderer, timers, quality or camera-dependent damage. */
export const WHITE_HOLE=Object.freeze({duration:17,damage:160,range:24,impact:13});
export const WHITE_PHASES=Object.freeze([['ascent',0],['sword',3],['rift',4.5],['growth',6],['silence',10],['launch',11],['impact',13],['return',14.3]]);
export function whitePhase(t){let result=WHITE_PHASES[0];for(const p of WHITE_PHASES)if(t>=p[1])result=p;return {name:result[0],age:t-result[1]};}
export function whiteFlash(t){if(t<13)return 0;if(t<13.25)return (t-13)/.25;if(t<13.8)return 1;return Math.max(0,1-(t-13.8)/1.3);}
export class CelestialWhiteHole{
 constructor({hit=()=>{},event=()=>{}}={}){Object.assign(this,{hit,event,active:false,time:0,phase:'idle',hitDone:false});}
 start(source,target,multiplier=1){if(this.active||!target?.alive||Math.hypot(target.x-source.x,target.z-source.z)>WHITE_HOLE.range)return false;this.source={...source};this.target={...target};this.id=target.id;this.damage=Math.round(WHITE_HOLE.damage*multiplier);this.time=0;this.phase='ascent';this.hitDone=false;this.active=true;this.event('ascent');return true;}
 cancel(reason='cancel'){if(!this.active)return;this.active=false;this.phase='idle';this.event(reason);}
 update(dt,target,{paused=false,valid=true}={}){if(!this.active||paused)return;if(!valid||!target||target.id!==this.id||(!target.alive&&!this.hitDone)){this.cancel();return;}const end=Math.min(WHITE_HOLE.duration,this.time+Math.max(0,dt));for(const [phase,at] of WHITE_PHASES){if(this.time<at&&end>=at){this.phase=phase;this.event(phase);if(phase==='impact'&&!this.hitDone){this.hitDone=true;this.hit(this.damage,this.id);}}}this.time=end;this.phase=whitePhase(this.time).name;if(this.time>=WHITE_HOLE.duration)this.cancel('finish');}
}
/** A single owner for cinematic state: release is idempotent and always attempted after failures. */
export class CinematicLease{
 constructor({capture,enter,restore}){Object.assign(this,{capture,enter,restore,snapshot:null});}
 get locked(){return this.snapshot!==null;}
 begin(){if(this.locked)return false;this.snapshot=this.capture();try{this.enter(this.snapshot);}catch(e){this.release();throw e;}return true;}
 release(){if(!this.locked)return;const s=this.snapshot;this.snapshot=null;this.restore(s);}
 run(frame){try{return frame();}catch(e){this.release();throw e;}}
}
