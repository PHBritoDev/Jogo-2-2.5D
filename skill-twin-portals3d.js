import {blockedSegment} from './skill-path3d.js';
import {sweptCapsule} from './skill-x-rupture3d.js';
/** Two finite, straight, simultaneous attacks. Pressure pulses belong to the same bodies.
 * Pure 120 Hz simulation; no quality/renderer inputs. Optional target arrays use per-target budgets. */
export const PORTALS=Object.freeze({range:32,open:.45,pressure:1.35,pulseTimes:[.3,.7,1.1],contact:6,pulse:4,finisher:22,compress:.42,burst:1.3,close:.6,side:2.1,height:2.1,radius:.8});
const copy=p=>({x:p.x,y:p.y,z:p.z});
const targetList=input=>[...new Map((Array.isArray(input)?input:input?[input]:[]).filter(t=>t?.alive).map(t=>[t.id,t])).values()];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export class TwinPortals{
 constructor({hit=()=>{},blocked=()=>false,ground=()=>0,event=()=>{}}={}){
  Object.assign(this,{hit,blocked,ground,event,active:false,phase:'idle',time:0,age:0,portals:[{},{}],center:{x:0,y:0,z:0}});
  this.flows=[-1,1].map((side,i)=>({i,side,phase:'waiting',p:{x:0,y:0,z:0},at:{x:0,y:0,z:0},origin:{},direction:{},endAt:-1,contacts:new Map()}));
 }
 start(source,target,yaw=0,mul=1){
  if(this.active)return false;
  const list=targetList(target),t=list.find(t=>t.alive&&Math.hypot(t.x-source.x,t.z-source.z)<=PORTALS.range);
  this.ids=new Set(list.filter(t=>t.alive&&Math.hypot(t.x-source.x,t.z-source.z)<=PORTALS.range).map(t=>t.id));
  this.id=t?.id??null;this.source=copy(source);this.active=true;this.phase='open';this.time=this.age=this.acc=0;this.mul=mul;this.hits=0;this.paid=new Map();this.pulses=0;this.pressureAt=-1;
  const a=t?Math.atan2(t.x-source.x,t.z-source.z):yaw;this.f={x:Math.sin(a),y:0,z:Math.cos(a)};this.r={x:this.f.z,y:0,z:-this.f.x};
  const gy=this.ground(source.x,source.z);
  this.portals=[-1,1].map(s=>({x:source.x+this.r.x*s*PORTALS.side-this.f.x*.5,y:gy+PORTALS.height,z:source.z+this.r.z*s*PORTALS.side-this.f.z*.5}));
  this.fallback={x:source.x+this.f.x*18,y:gy+.35,z:source.z+this.f.z*18};Object.assign(this.center,this.fallback);
  for(const f of this.flows){f.phase='waiting';f.endAt=-1;f.travel=0;f.contacts.clear();Object.assign(f.p,this.portals[f.i]);}
  this.event('open',this);return true;
 }
 cancel(){if(!this.active)return;this.active=false;this.phase='idle';for(const f of this.flows){f.phase='gone';f.contacts.clear();}this.event('cancel',this);}
 phaseTo(phase){this.phase=phase;this.age=0;if(phase==='pressure')this.pressureAt=this.time;this.event(phase,this);}
 update(dt,target,{valid=true,paused=false}={}){
  if(!this.active||paused)return;if(!valid){this.cancel();return;}
  const list=targetList(target).filter(t=>t.alive&&this.ids.has(t.id)&&Math.hypot(t.x-this.source.x,t.z-this.source.z)<=PORTALS.range+4);
  this.acc+=Math.max(0,dt);while(this.acc>=1/120&&this.active){this.acc-=1/120;this.step(1/120,list.filter(t=>t.alive));}
 }
 pay(t,amount,kind){if(!t.alive)return;const prev=this.paid.get(t.id)||0,next=prev+amount;this.paid.set(t.id,next);this.hit(Math.round(next*this.mul)-Math.round(prev*this.mul),t.id,kind);}
 launch(targets){
  const t=targets.find(t=>t.id===this.id),at=t?{x:t.x,y:t.y+(t.height||1.8)*.55,z:t.z}:this.fallback;Object.assign(this.center,at);
  const lengths=this.portals.map(p=>distance(p,at)),duration=Math.min(3,1.5+Math.max(...lengths)/24);
  for(const f of this.flows){Object.assign(f.origin,this.portals[f.i]);const l=lengths[f.i]||1;f.direction={x:(at.x-f.origin.x)/l,y:(at.y-f.origin.y)/l,z:(at.z-f.origin.z)/l};f.speed=l/duration;f.range=Math.min(PORTALS.range,l+2);f.phase='flight';f.born=this.time;this.event('launch',f);}
 }
 step(dt,targets){
  this.time+=dt;this.age+=dt;
  if(this.phase==='open'){if(this.age>=PORTALS.open){this.launch(targets);this.phaseTo('fire');}return;}
  if(this.phase==='fire'){
   for(const f of this.flows){if(f.phase!=='flight')continue;const p=copy(f.p),d=Math.min(f.speed*dt,f.range-f.travel);f.travel+=d;
    f.p.x+=f.direction.x*d;f.p.y+=f.direction.y*d;f.p.z+=f.direction.z*d;
    const wall=blockedSegment(p,f.p,q=>q.y-PORTALS.radius<=this.ground(q.x,q.z)||this.blocked({x:q.x,y:q.y-PORTALS.radius,z:q.z}),PORTALS.radius);
    if(wall){Object.assign(f.p,p);this.endFlow(f,'wall');continue;}
    const touched=targets.filter(t=>t.alive&&sweptCapsule(p,f.p,t,PORTALS.radius));
    if(touched.length){for(const t of touched){f.contacts.set(t.id,copy(f.p));this.pay(t,PORTALS.contact,'contact');this.hits++;}this.endFlow(f,'contact');continue;}
    if(f.travel>=f.range-1e-6)this.endFlow(f,'spent');
   }
   if(this.flows.every(f=>f.phase!=='flight')){const contacts=this.flows.filter(f=>f.phase==='contact');if(contacts.length){Object.assign(this.center,{x:0,y:0,z:0});for(const f of contacts)for(const k of ['x','y','z'])this.center[k]+=f.at[k]/contacts.length;this.phaseTo('pressure');}else this.phaseTo('close');}return;
  }
  if(this.phase==='pressure'){
   while(this.pulses<PORTALS.pulseTimes.length&&this.age>=PORTALS.pulseTimes[this.pulses]){
    for(const f of this.flows)for(const t of targets){const p=f.contacts.get(t.id);if(p&&sweptCapsule(p,p,t,PORTALS.radius+.15)&&!blockedSegment(f.origin,p,q=>this.blocked({x:q.x,y:q.y-PORTALS.radius,z:q.z}),PORTALS.radius))this.pay(t,PORTALS.pulse,'pressure');}
    this.event('pressure-pulse',{n:this.pulses++,p:this.center,time:this.time});
   }
   if(this.age>=PORTALS.pressure)this.phaseTo('compress');return;
  }
  if(this.phase==='compress'){if(this.age>=PORTALS.compress){for(const t of targets)if(this.paid.has(t.id)&&Math.hypot(t.x-this.center.x,t.z-this.center.z)<3+(t.radius||.6)&&!blockedSegment(this.center,{x:t.x,y:t.y+1,z:t.z},this.blocked,.2))this.pay(t,PORTALS.finisher,'burst');this.phaseTo('burst');}return;}
  if(this.phase==='burst'&&this.age>=PORTALS.burst)this.phaseTo('close');
  if(this.phase==='close'&&this.age>=PORTALS.close){this.active=false;this.phase='idle';this.event('finish',this);}
 }
 endFlow(f,phase){f.phase=phase;f.endAt=this.time;Object.assign(f.at,f.p);this.event(phase==='contact'?'impact':phase,f);}
}
