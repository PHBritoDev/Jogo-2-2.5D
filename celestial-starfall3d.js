/** Fixed-step combat timeline. Visual quality never changes these 18 collision events. */
export const STARFALL = Object.freeze({ count:18, cast:.7, open:1.5, rainEnd:4.3, duration:5, height:8, flight:.65, radius:1.25 });
const point=()=>({x:0,y:0,z:0});
export class CelestialStarfall {
 constructor({hit=()=>{},blocked=()=>false,ground=()=>0,event=()=>{}}={}) {
  Object.assign(this,{hit,blocked,ground,event,active:false,time:0,phase:'idle',center:point(),launch:point(),source:point(),accumulator:0});
  this.stars=Array.from({length:STARFALL.count},(_,i)=>({i,phase:'waiting',from:point(),p:point(),aim:point(),born:1.7+Math.floor(i/6)*.85+(i%6)*.065,impactAt:-1}));
 }
 start(source,target,damage=6) {
  if(this.active)return false;
  this.targetId=target?.alive?target.id:null;this.damage=damage;this.time=0;this.accumulator=0;this.phase='cast';this.active=true;
  Object.assign(this.source,source);Object.assign(this.launch,source);Object.assign(this.center,source);this.center.y=this.ground(source.x,source.z)+STARFALL.height;
  for(const s of this.stars){s.phase='waiting';s.impactAt=-1;}
  this.event('cast');return true;
 }
 cancel(){this.active=false;this.phase='idle';for(const s of this.stars)s.phase='gone';this.event('cancel');}
 update(dt,target,{valid=true,paused=false,hand=null}={}) {
  if(!this.active||paused)return;
  if(!valid||(this.targetId!==null&&(!target?.alive||target.id!==this.targetId))){this.cancel();return;}
  if(this.targetId===null)target=null;
  this.accumulator+=Math.max(0,dt);
  while(this.accumulator>=1/120&&this.active){this.accumulator-=1/120;this.step(1/120,target,hand);}
 }
 step(dt,target,hand){
  const before=this.time;this.time+=dt;const t=this.time;
  this.phase=t<.7?'cast':t<1.5?'ascent':t<4.3?'rain':t<5?'fade':'idle';
  if(t<.7&&hand){Object.assign(this.source,hand);Object.assign(this.launch,hand);}
  if(before<.7&&t>=.7){this.center.x=this.source.x;this.center.z=this.source.z;this.center.y=this.ground(this.source.x,this.source.z)+STARFALL.height;this.event('launch');}
  if(t>=.7&&t<1.5){const u=Math.min(1,(t-.7)/.8);Object.assign(this.launch,this.source);this.launch.y+=(this.center.y-this.source.y)*u*u;}
  if(before<1.5&&t>=1.5)this.event('open');
  if(t>=1.5&&target?.alive){const k=1-Math.exp(-dt*2);this.center.x+=(target.x-this.center.x)*k;this.center.z+=(target.z-this.center.z)*k;this.center.y+=(this.ground(target.x,target.z)+STARFALL.height-this.center.y)*k;}
  for(const s of this.stars){
   if(s.phase==='waiting'&&t>=s.born){
    const a=s.i*2.399963,r=s.i%3===2?2.8+(s.i%4)*.35:.25+(s.i%3)*.35;
    const aim=target?.alive?target:this.center;
    s.aim.x=aim.x+Math.cos(a)*r;s.aim.z=aim.z+Math.sin(a)*r;s.aim.y=this.ground(s.aim.x,s.aim.z)+.08;
    const angle=a-t*.16,open=1-Math.pow(1-Math.min(1,(t-1.5)/.35),3),z=Math.sin(angle)*2.5*open;
    s.from.x=this.center.x+Math.cos(angle)*2.5*open;s.from.z=this.center.z+Math.cos(.38)*z;s.from.y=this.center.y-Math.sin(.38)*z;
    Object.assign(s.p,s.from);s.phase='flight';
   }
   if(s.phase!=='flight')continue;
   const u=Math.min(1,Math.max(0,(t-s.born)/STARFALL.flight)),v=u*u;
   const x=s.from.x+(s.aim.x-s.from.x)*u,y=s.from.y+(s.aim.y-s.from.y)*v,z=s.from.z+(s.aim.z-s.from.z)*u;
   const n=Math.max(1,Math.ceil(Math.hypot(x-s.p.x,y-s.p.y,z-s.p.z)/.08));const dx=(x-s.p.x)/n,dy=(y-s.p.y)/n,dz=(z-s.p.z)/n;
   for(let j=0;j<n;j++){s.p.x+=dx;s.p.y+=dy;s.p.z+=dz;if(this.blocked(s.p)){s.phase='impact';s.impactAt=t;this.event('blocked',s);break;}}
   if(s.phase==='flight'&&u===1){s.phase='impact';s.impactAt=t;
    if(target?.alive&&target.id===this.targetId&&Math.hypot(s.p.x-target.x,s.p.z-target.z)<=STARFALL.radius&&Math.abs(target.y-s.p.y)<2.5)this.hit(this.damage,this.targetId);
    this.event('impact',s);
   }
  }
  if(t>=STARFALL.duration){this.active=false;this.event('finish');}
 }
}
