/** Cerco: deterministic simulation; world targeting/damage and rendering are adapters. */
export const SIEGE = Object.freeze({count:5,radius:3.1,duration:12,anticipation:.12,flight:.58,interval:.22,hitRadius:.85});
const copy=p=>({x:p.x,y:p.y,z:p.z});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function formationPoint(target,i,time=0){const a=i*Math.PI*2/5;return{x:target.x+Math.sin(a)*SIEGE.radius,y:target.y+.45+Math.sin(time*2+i)*.09,z:target.z+Math.cos(a)*SIEGE.radius};}
export class CelestialSiege {
 constructor({hit=()=>{},blocked=()=>false,event=()=>{}}={}){Object.assign(this,{hit,blocked,event,active:false,blades:[],time:0,lastFire:-Infinity});}
 start(target,damage=14){if(this.active||!target?.alive)return false;this.targetId=target.id;this.damage=damage;this.time=0;this.lastFire=-Infinity;this.active=true;this.blades=Array.from({length:5},(_,i)=>({i,phase:'ready',p:formationPoint(target,i),age:0,hit:false}));this.event('summon');return true;}
 get remaining(){return this.blades.filter(b=>b.phase==='ready').length;}
 cancel(){if(!this.active)return;this.active=false;this.blades.forEach(b=>b.phase='gone');this.event('cancel');}
 fire(target){if(!this.active||this.time-this.lastFire<SIEGE.interval)return false;if(!target?.alive||target.id!==this.targetId){this.cancel();return false;}const b=this.blades.find(b=>b.phase==='ready');if(!b)return false;b.phase='flight';b.age=0;b.from=copy(b.p);b.aim=copy(target);const dx=target.x-b.p.x,dz=target.z-b.p.z,d=Math.hypot(dx,dz)||1;b.control={x:(b.p.x+target.x)/2-dz/d*.85,y:(b.p.y+target.y)/2+.3,z:(b.p.z+target.z)/2+dx/d*.85};this.lastFire=this.time;this.event('launch',b);return true;}
 update(dt,target,{paused=false,valid=true}={}){if(!this.active||paused)return;dt=Math.max(0,dt);if(!valid||!target?.alive||target.id!==this.targetId){this.cancel();return;}this.time+=dt;if(this.time>=SIEGE.duration){this.cancel();return;}
  for(const b of this.blades){if(b.phase==='ready'){b.p=formationPoint(target,b.i,this.time);continue;}if(b.phase!=='flight')continue;b.age+=dt;const u=Math.max(0,Math.min(1,(b.age-SIEGE.anticipation)/SIEGE.flight)),t=u*u,one=1-t;const next={x:one*one*b.from.x+2*one*t*b.control.x+t*t*b.aim.x,y:one*one*b.from.y+2*one*t*b.control.y+t*t*b.aim.y,z:one*one*b.from.z+2*one*t*b.control.z+t*t*b.aim.z};
   // Sweep at <= 8 cm: no tunneling through thin walls even at low FPS.
   const steps=Math.max(1,Math.ceil(distance(next,b.p)/.08)),prev=copy(b.p);
   for(let k=0;k<=steps;k++){const f=k/steps,p={x:prev.x+(next.x-prev.x)*f,y:prev.y+(next.y-prev.y)*f,z:prev.z+(next.z-prev.z)*f};b.p=p;if(this.blocked(p)){b.phase='gone';this.event('blocked',b);break;}if(distance(p,target)<=SIEGE.hitRadius){b.phase='gone';if(!b.hit){b.hit=true;this.hit(this.damage,this.targetId);this.event('impact',b);}break;}}
   if(b.phase==='flight'&&u===1){b.phase='gone';this.event('miss',b);}
  }
  if(this.blades.every(b=>b.phase==='gone')){this.active=false;this.event('finish');}
 }
}
