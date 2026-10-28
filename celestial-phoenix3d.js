/** Fixed 120 Hz combat; rendering never applies damage. One target identity for the entire cast. */
export const PHOENIX=Object.freeze({cast:.7,form:.8,flight:2.4,orbit:.9,dive:.45,burn:5,speed:8,initial:24,final:28,tick:5});
export class CelestialPhoenix{
 constructor({hit=()=>{},blocked=()=>false,ground=()=>0,event=()=>{}}={}){Object.assign(this,{hit,blocked,ground,event,active:false,phase:'idle',time:0,p:{x:0,y:0,z:0},bird:{x:0,y:0,z:0},aim:{x:0,y:0,z:0}});}
 start(source,target,yaw=0,mul=1){if(this.active)return false;this.active=true;this.phase='cast';this.age=this.time=this.acc=0;this.id=target?.alive?target.id:null;this.yaw=yaw;this.mul=mul;this.ticks=0;this.angle=0;this.source={...source};Object.assign(this.p,source);const spawnYaw=target?.alive&&Math.hypot(target.x-source.x,target.z-source.z)<4?yaw+Math.PI/2:yaw;this.p.x+=Math.sin(spawnYaw)*2;this.p.z+=Math.cos(spawnYaw)*2;this.p.y=this.ground(this.p.x,this.p.z);this.event('cast');return true;}
 cancel(){this.active=false;this.phase='idle';this.event('cancel');}
 phaseTo(p){this.phase=p;this.age=0;this.event(p);}
 update(dt,target,{valid=true,paused=false}={}){if(!this.active||paused)return;if(!valid||(this.id!==null&&(!target?.alive||target.id!==this.id))){this.cancel();return;}this.acc+=Math.max(0,dt);while(this.acc>=1/120&&this.active){this.acc-=1/120;this.step(1/120,this.id===null?null:target);}}
 damage(n,kind){this.hit(Math.round(n*this.mul),this.id,kind);}
 step(dt,t){this.time+=dt;this.age+=dt;const p=this.p;
 if(this.phase==='cast'&&this.age>=PHOENIX.cast)this.phaseTo('form');
 else if(this.phase==='form'){if(this.blocked(p)){this.phaseTo('fade');return;}if(this.age>=PHOENIX.form)this.phaseTo('flight');}
 else if(this.phase==='flight'){
  if(t){const desired=Math.atan2(t.x-p.x,t.z-p.z),diff=Math.atan2(Math.sin(desired-this.yaw),Math.cos(desired-this.yaw));this.yaw+=Math.max(-dt*2,Math.min(dt*2,diff));}
  p.x+=Math.sin(this.yaw)*PHOENIX.speed*dt;p.z+=Math.cos(this.yaw)*PHOENIX.speed*dt;p.y=this.ground(p.x,p.z);
  if(this.blocked(p)){this.phaseTo('fade');return;}
  if(t&&Math.hypot(p.x-t.x,p.z-t.z)<1+(t.radius||.6)&&Math.abs(p.y-t.y)<3){this.damage(PHOENIX.initial,'contact');this.startAngle=Math.atan2(this.bird.z-t.z,this.bird.x-t.x);this.detachRadius=Math.hypot(this.bird.x-t.x,this.bird.z-t.z);this.detachY=this.bird.y-t.y;this.phaseTo('orbit');}
  else if(this.age>=PHOENIX.flight)this.phaseTo('fade');
 }else if(this.phase==='orbit'){
  this.angle=Math.min(1,this.age/PHOENIX.orbit)*Math.PI*2;const a=this.startAngle+this.angle,k=Math.min(1,this.age/.15),desired=Math.max(2.45,(t.radius||.6)+1.6),r=this.detachRadius+(desired-this.detachRadius)*k;this.bird.x=t.x+Math.cos(a)*r;this.bird.z=t.z+Math.sin(a)*r;this.bird.y=t.y+this.detachY+((t.height||2)*.65+Math.sin(a)*.25-this.detachY)*k;
  if(this.age>=PHOENIX.orbit){this.from={...this.bird};Object.assign(this.aim,{x:t.x,y:t.y+(t.height||2)*.55,z:t.z});this.phaseTo('dive');}
 }else if(this.phase==='dive'){
  const u=Math.min(1,this.age/PHOENIX.dive),k=u*u;Object.assign(this.bird,{x:this.from.x+(this.aim.x-this.from.x)*k,y:this.from.y+(this.aim.y-this.from.y)*k,z:this.from.z+(this.aim.z-this.from.z)*k});
  if(this.blocked(this.bird)){this.phaseTo('fade');return;}
  if(Math.hypot(this.bird.x-t.x,this.bird.z-t.z)<(t.radius||.6)+.25&&Math.abs(this.bird.y-(t.y+(t.height||2)*.55))<1){this.damage(PHOENIX.final,'strike');this.phaseTo('burn');}
  else if(u===1)this.phaseTo('fade');
 }else if(this.phase==='burn'){Object.assign(this.aim,{x:t.x,y:t.y+(t.height||2)*.5,z:t.z});while(this.ticks<5&&this.age>=this.ticks+1){this.ticks++;this.damage(PHOENIX.tick,'burn');}if(this.age>=5)this.phaseTo('fade');}
 else if(this.phase==='fade'&&this.age>=.5){this.cancel();return;}
 if(['cast','form','flight'].includes(this.phase)){const a=this.time*5,r=2.05;Object.assign(this.bird,{x:p.x+Math.cos(a)*r,y:p.y+3.4+Math.sin(this.time*2)*.55,z:p.z+Math.sin(a)*r});}
 }
}
