import {combatPose,combatMove} from './combat-choreography3d.js';
import {bladeContact,segmentBlocked} from './sword-rites3d.js';
/** Only the two mini-bosses opt into these native clips. Times are seconds, damage per contact. */
export const BOSS_MOVES={
 warden:[
  {id:'Predator_Rake',label:'Garras cruzadas',patterns:['diagonal','reverse'],hits:[.40,.72],duration:1.18,advance:.35},
  {id:'Predator_Rush',label:'Bote rasante',patterns:['thrust'],hits:[.60],duration:1.16,advance:1.5},
  {id:'Predator_Leap',label:'Salto da presa',patterns:['overhead'],hits:[.86],duration:1.52,advance:1.25,jump:.65},
  {id:'Predator_Turn',label:'Giro de garras',patterns:['spin'],hits:[.55],duration:1.19,advance:.15},
  {id:'Predator_Retreat',label:'Rasgo e recuo',patterns:['reverse'],hits:[.38],duration:1.16,advance:.22,retreat:.85}
 ],
 e2boss:[
  {id:'Executor_Sweep',label:'Ceifa ampla',patterns:['reverse'],hits:[.78],duration:1.70,advance:.3},
  {id:'Executor_Spin',label:'Moinho pesado',patterns:['spin','reverse'],hits:[.85,1.38],duration:2.32,advance:.2},
  {id:'Executor_Advance',label:'Marcha da foice',patterns:['thrust','diagonal'],hits:[.78,1.40],duration:2.30,advance:1.35},
  {id:'Executor_Slam',label:'Queda do executor',patterns:['overhead'],hits:[1.12],duration:2.25,advance:.8,jump:.72},
  {id:'Executor_Chain',label:'Sentença tripla',patterns:['diagonal','reverse','overhead'],hits:[.72,1.30,1.93],duration:2.9,advance:.38}
 ]
};
for(const [kind,moves]of Object.entries(BOSS_MOVES))for(const m of moves){m.kind=kind;m.open=m.hits[0]-.11;m.close=m.hits.at(-1)+.11;m.recovery=m.duration-m.close;m.damageScale=kind==='warden'?.85:1.12;}
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function bossTravel(m,t){const go=smooth((t-(m.open-.22))/.34)*m.advance;return go-(m.retreat||0)*smooth((t-m.close)/(m.duration-m.close));}
export function bossLift(m,t){if(!m.jump)return 0;const u=(t-.15)/(m.hits[0]-.15);return u>0&&u<1?Math.sin(Math.PI*u)*m.jump:0;}
export function bossPose(m,t){
 let i=m.hits.findIndex(h=>t<h+.18);if(i<0)i=m.hits.length-1;
 const start=i?m.hits[i-1]+.12:0,end=i===m.hits.length-1?m.duration:m.hits[i]+.18,hit=m.hits[i];
 const template=combatMove(m.kind==='warden'?'vigilia':'celeste');
 const def={...template,pattern:m.patterns[i],duration:end-start,open:hit-start-.07,close:hit-start+.10,guard:m.kind==='warden'?[-.43,1.15,.42]:[-.32,1.27,.30],spread:m.kind==='warden'?1.25:1.05,lean:m.kind==='warden'?.22:.08};
 const a=combatPose(def,Math.max(0,t-start));
 if(m.kind==='warden'){
  a.off=[.43,1.12,.42];a.offBlade=[.2,-.1,1];
  if(i%2){a.off=[-a.hand[0],a.hand[1],a.hand[2]];a.offBlade=[-a.blade[0],a.blade[1],a.blade[2]];a.hand=[-.43,1.15,.42];a.blade=[-.2,-.1,1];}
  a.dip+=.13;a.lean+=.10;
 }else{const length=Math.hypot(...a.blade)||1;a.off=a.hand.map((v,i)=>v-a.blade[i]/length*.4);a.offBlade=a.blade;}
 a.air=bossLift(m,t)>.02;
 return a;
}
/** Sample the very same baked hand/weapon segments that AnimationMixer renders. */
export function sampleTrace(trace,t,actor){
 if(!trace?.frames.length)return [];
 const f=Math.max(0,Math.min(trace.frames.length-1,t/trace.duration*(trace.frames.length-1))),i=Math.floor(f),j=Math.min(i+1,trace.frames.length-1),u=f-i,c=Math.cos(actor.yaw),s=Math.sin(actor.yaw);
 const point=(a,b)=>{const x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u,z=a[2]+(b[2]-a[2])*u;return{x:actor.x+x*c+z*s,y:actor.y+y,z:actor.z+z*c-x*s};};
 return trace.frames[i].map((v,k)=>({base:point(v[0],trace.frames[j][k][0]),tip:point(v[1],trace.frames[j][k][1])}));
}
export function bossTraceContact(trace,t0,t1,actor,target,blocked=()=>false){
 const prev=sampleTrace(trace,t0,actor),next=sampleTrace(trace,t1,actor),capsule={...target,y:(target.y||0)+(target.height||1.7)*.5};
 return next.some((v,i)=>bladeContact(prev[i].base,prev[i].tip,v.base,v.tip,capsule,(target.radius||.35)+.08)&&!segmentBlocked(v.base,v.tip,blocked)&&!segmentBlocked(actor,capsule,blocked));
}
