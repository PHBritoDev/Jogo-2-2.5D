import {sweptCapsule} from './skill-x-rupture3d.js';
import {blockedSegment} from './skill-path3d.js';
/** Three actual collision events; fixed-step gameplay, presentation quality independent. */
export const DRAGON=Object.freeze({range:32,channel:1.35,form:2.6,soar:.65,fire:1.35,advance:1.65,maxAdvance:2.1,cruise:21,open:.48,engulf:.9,compress:.6,dissipate:1.95,ball:16,bite:22,blast:28,trail:1200});
const smooth=k=>{k=Math.max(0,Math.min(1,k));return k*k*(3-2*k);};
const copy=p=>({x:p.x,y:p.y,z:p.z});
export class JudgmentDragon{
 constructor({hit=()=>{},ground=()=>0,blocked=()=>false,event=()=>{}}={}){
  Object.assign(this,{hit,ground,blocked,event,active:false,phase:'idle',time:0,age:0,mouth:0,head:{x:0,y:0,z:0},dir:{x:0,y:0,z:1},at:{x:0,y:0,z:0}});
  this.trail=Array.from({length:DRAGON.trail},()=>({x:0,y:0,z:0}));this.trailHead=this.trailCount=0;
  this.ball={active:false,direction:{x:0,y:0,z:1},origin:{x:0,y:0,z:0},p:{x:0,y:0,z:0},at:{x:0,y:0,z:0},impactTime:-1};
 }
 start(source,target,yaw=0,mul=1){
  if(this.active)return false;
  if(target&&Math.hypot(target.x-source.x,target.z-source.z)>DRAGON.range)target=null;
  this.active=true;this.phase='channel';this.time=this.age=this.acc=0;this.mul=mul;this.mouth=0;this.bitten=false;this.bombed=false;
  this.id=target?.alive?target.id:null;this.resist=!!target?.resist;this.source=copy(source);
  this.yaw=target?.alive?Math.atan2(target.x-source.x,target.z-source.z):yaw;Object.assign(this.dir,{x:Math.sin(this.yaw),y:0,z:Math.cos(this.yaw)});
  this.scale=3.8*Math.max(1,Math.min(1.5,(target?.radius||.6)/2));
  Object.assign(this.head,{x:source.x,y:source.y+1.2,z:source.z});this.trailCount=this.trailHead=0;this.push();
  Object.assign(this.ball,{active:false,impactTime:-1});this.event('channel');return true;
 }
 cancel(){if(!this.active)return;this.active=false;this.phase='idle';this.mouth=0;this.ball.active=false;this.event('cancel');}
 phaseTo(p){this.phase=p;this.age=0;this.event(p,this);}
 push(){if(this.trailCount){const l=this.trail[this.trailHead];if(Math.hypot(l.x-this.head.x,l.y-this.head.y,l.z-this.head.z)<.045)return;}
  this.trailHead=(this.trailHead+1)%DRAGON.trail;Object.assign(this.trail[this.trailHead],this.head);this.trailCount=Math.min(DRAGON.trail,this.trailCount+1);
 }
 sample(k){return this.trail[(this.trailHead-Math.min(this.trailCount-1,Math.max(0,k))+DRAGON.trail)%DRAGON.trail];}
 update(dt,target,{valid=true,paused=false}={}){
  if(!this.active||paused)return;
  if(!valid||(this.id!==null&&target&&Math.hypot(target.x-this.source.x,target.z-this.source.z)>DRAGON.range+4)||(this.id!==null&&(target?.id!==this.id||(!target.alive&&!this.bitten)))){this.cancel();return;}
  const t=this.id!==null&&target?.alive&&target.id===this.id?target:null;
  this.acc+=Math.max(0,dt);while(this.acc>=1/120&&this.active){this.acc-=1/120;if(t&&!t.alive&&!this.bitten){this.cancel();break;}this.step(1/120,t?.alive?t:null);}
 }
 center(t){return t?{x:t.x,y:t.y+(t.height||1.8)*.55,z:t.z}:{x:this.source.x+Math.sin(this.yaw)*18,y:this.source.y+1,z:this.source.z+Math.cos(this.yaw)*18};}
 biteAt(t){const c=this.center(t);return {x:c.x-Math.sin(this.yaw)*this.scale*.62,y:c.y+this.scale*.2,z:c.z-Math.cos(this.yaw)*this.scale*.62};}
 step(dt,t){
  this.time+=dt;this.age+=dt;const A=this.age,s=this.source,h=this.head,prev=copy(h),f={x:Math.sin(this.yaw),z:Math.cos(this.yaw)};
  switch(this.phase){
   case 'channel':if(A>=DRAGON.channel)this.phaseTo('form');break;
   case 'form':{
    const u=Math.min(1,A/DRAGON.form),r=8*Math.sin(u*Math.PI*.65),a=this.yaw+u*Math.PI*3.5;
    h.x=s.x+Math.sin(a)*r+f.x*u*6;h.z=s.z+Math.cos(a)*r+f.z*u*6;h.y=s.y+1.2+DRAGON.cruise*smooth(u);
    if(A>=DRAGON.form){this.crest=copy(h);this.phaseTo('soar');}break;
   }
   case 'soar':h.y=this.crest.y+Math.sin(A*2)*.5;this.mouth=smooth(A/.4)*.65;
    if(A>=DRAGON.soar){const b=this.ball,q=this.center(t),d=Math.hypot(this.dir.x,this.dir.y,this.dir.z)||1;
     Object.assign(b.p,{x:h.x+this.dir.x/d*this.scale*.68,y:h.y+this.dir.y/d*this.scale*.68,z:h.z+this.dir.z/d*this.scale*.68});Object.assign(b.origin,b.p);
     const l=Math.hypot(q.x-b.p.x,q.y-b.p.y,q.z-b.p.z)||1;Object.assign(b.direction,{x:(q.x-b.p.x)/l,y:(q.y-b.p.y)/l,z:(q.z-b.p.z)/l});b.speed=l/1.05;b.travel=0;b.range=l+2;b.active=true;this.phaseTo('fire');}break;
   case 'fire':{
    const b=this.ball;if(b.active){const p=copy(b.p),step=Math.min(b.range-b.travel,b.speed*dt);b.travel+=step;
     b.p.x+=b.direction.x*step;b.p.y+=b.direction.y*step;b.p.z+=b.direction.z*step;
     const wall=blockedSegment(p,b.p,v=>v.y-1.05<=this.ground(v.x,v.z)||this.blocked({x:v.x,y:v.y-1.05,z:v.z}),.8);
     const contact=t&&sweptCapsule(p,b.p,t,1.05);
     if(wall||contact||b.travel>=b.range){b.active=false;b.impactTime=this.time;Object.assign(b.at,wall?p:contact||b.p);if(!wall&&contact){this.bombed=true;this.hit(Math.round(DRAGON.ball*this.mul),this.id,'ball');}this.event(wall?'ball-wall':'ball-impact',this);}
    }
    if(A>=DRAGON.fire){this.ball.active=false;this.base=copy(h);this.phaseTo('advance');}break;
   }
   case 'advance':{
    const q=this.biteAt(t),u=smooth(A/DRAGON.advance),arc=Math.sin(u*Math.PI);
    h.x=this.base.x+(q.x-this.base.x)*u+Math.cos(this.yaw)*arc*5;h.z=this.base.z+(q.z-this.base.z)*u-Math.sin(this.yaw)*arc*5;h.y=this.base.y+(q.y-this.base.y)*u+arc*4;
    this.mouth=smooth((u-.4)/.45);
    if(blockedSegment(prev,h,p=>this.blocked({x:p.x,y:p.y-this.scale*.35,z:p.z}),this.scale*.35)){Object.assign(h,prev);Object.assign(this.at,h);this.phaseTo('explode');break;}
    if(A>=DRAGON.advance){Object.assign(this.at,this.center(t));this.phaseTo(t?'engulf':'compress');}break;
   }
   case 'engulf':{
    const q=this.biteAt(t);h.x+=(q.x-h.x)*Math.min(1,dt*7);h.y+=(q.y-h.y)*Math.min(1,dt*7);h.z+=(q.z-h.z)*Math.min(1,dt*7);
    this.mouth=A<DRAGON.open?1:1-smooth((A-DRAGON.open)/(DRAGON.engulf-DRAGON.open));
    if(A>=DRAGON.engulf){const c=this.center(t),mouth={x:h.x+f.x*this.scale*.62,y:c.y,z:h.z+f.z*this.scale*.62};Object.assign(this.at,mouth);
     if(t&&Math.hypot(mouth.x-c.x,mouth.z-c.z)<1+(t.radius||.6)&&!blockedSegment(h,c,this.blocked,.1)){this.bitten=true;this.hit(Math.round(DRAGON.bite*this.mul),this.id,'bite');}
     this.phaseTo('compress');}break;
   }
   case 'compress':this.mouth=0;if(A>=DRAGON.compress){if(t&&this.bitten&&Math.hypot(t.x-this.at.x,t.z-this.at.z)<3+(t.radius||.6))this.hit(Math.round(DRAGON.blast*this.mul),this.id,'blast');this.phaseTo('explode');}break;
   case 'explode':if(A>=DRAGON.dissipate){this.active=false;this.phase='idle';this.event('finish');}break;
  }
  if(this.phase!=='channel'){
   const dx=h.x-prev.x,dy=h.y-prev.y,dz=h.z-prev.z,l=Math.hypot(dx,dy,dz);
   const aimed=['engulf','compress','soar','fire'].includes(this.phase)||(this.phase==='advance'&&this.age>DRAGON.advance*.72);
   if(l>.00001&&!aimed){const k=Math.min(1,dt*10);this.dir.x+=(dx/l-this.dir.x)*k;this.dir.y+=(dy/l-this.dir.y)*k;this.dir.z+=(dz/l-this.dir.z)*k;}
   if(aimed){const c=this.center(t),l=Math.hypot(c.x-h.x,c.y-h.y,c.z-h.z)||1,k=1-Math.exp(-6*dt);this.dir.x+=((c.x-h.x)/l-this.dir.x)*k;this.dir.z+=((c.z-h.z)/l-this.dir.z)*k;this.dir.y+=((c.y-h.y)/l-this.dir.y)*k;}
   this.push();
  }
 }
}
