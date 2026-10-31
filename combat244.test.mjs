import test from 'node:test';
import assert from 'node:assert/strict';
import {COMBAT_MOVES,WEAPON_STYLES,combatMove,combatPose} from './combat-choreography3d.js';
import {SwordRites} from './sword-rites3d.js';
import {BOSS_MOVES,bossTravel,bossLift,bossTraceContact} from './boss-choreography3d.js';
import {Enemy1Squad} from './enemy1-squad3d.js';
import './enemy2-squad3d.js';
const target={id:1,alive:true,x:0,y:1,z:1,radius:.4,height:1.8};
function duel(extra={}){const hits=[],events=[];let distance=0;const s=new SwordRites({choreography:true,pose:()=>({base:{x:0,y:.4,z:.5},tip:{x:0,y:1.8,z:1.5}}),hit:(...h)=>hits.push(h),event:(...e)=>events.push(e),advance:(x,z)=>distance+=Math.hypot(x,z),...extra});const ctx={from:{x:0,y:0,z:0},target,grounded:true,yaw:0};return{s,hits,events,ctx,step:(seconds,fps=60)=>{for(let i=0;i<Math.round(seconds*fps);i++)s.update(1/fps,ctx);},distance:()=>distance};}
test('five families: finite trajectories, ordered windows and distinct five-hit sequences',()=>{
 assert.equal(Object.keys(COMBAT_MOVES).length,45);assert.equal(new Set(Object.values(WEAPON_STYLES).map(s=>s.chain.join('/'))).size,5);
 for(const m of Object.values(COMBAT_MOVES)){assert.ok(m.open>0&&m.close>m.open&&m.duration-m.close>.2);for(let t=0;t<m.duration;t+=1/120){const p=combatPose(m,t);assert.ok([...p.hand,...p.blade,...p.off,p.yaw,p.lean,p.dip].every(Number.isFinite));assert.ok(Math.hypot(...p.blade)>.1);}}
});
test('each sword hits once per move at 20/30/60/120 FPS; queue advances five moves without special cooldown',()=>{
 for(const sword of Object.keys(WEAPON_STYLES))for(const fps of [20,30,60,120]){const w=duel();w.s.attack(sword,{target});for(let n=0;n<5;n++){const a=w.s.active;assert.equal(a.step,n);while(w.s.active===a){if(a.t>=a.def.buffer)w.s.attack(sword,{target});w.s.update(1/fps,w.ctx);}}
  assert.equal(w.hits.length,5);assert.deepEqual(w.s.cooldowns,{prota:0,aurora:0});w.s.cancel();w.step(2);assert.equal(w.hits.length,5);
 }
});
test('active frame cannot cancel, preparation/recovery can; queue never carries into a different weapon',()=>{
 const w=duel();w.s.attack('celeste',{target});assert.ok(w.s.canCancel);w.step(.35);assert.equal(w.s.canCancel,false);w.step(.4);assert.ok(w.s.canCancel);w.s.attack('celeste',{target});w.ctx.sword='vigilia';w.step(.02);assert.equal(w.s.busy,false);assert.equal(w.s.queued,false);
});
test('plunge waits for landing and times out safely; airborne attack retains its mode',()=>{
 const w=duel();w.ctx.grounded=false;w.s.attack('quantum',{target,mode:'plunge'});w.step(1.5);assert.equal(w.hits.length,0);assert.equal(w.s.active.phase,'windup');w.ctx.grounded=true;w.step(.4);assert.equal(w.hits.length,1);
 const fall=duel();fall.ctx.grounded=false;fall.s.attack('aurora',{target,mode:'plunge'});fall.step(4.2);assert.equal(fall.s.busy,false);assert.equal(fall.hits.length,0);
 const air=duel();air.ctx.grounded=false;air.s.attack('vigilia',{target,mode:'air'});air.step(.3);assert.equal(air.s.active.clip,'Combat_vigilia_air_0');
});
test('wall, target change and pause suppress contacts; advancing stops when running',()=>{
 const wall=duel({blocked:()=>true});wall.s.attack('prota',{target});wall.step(1);assert.equal(wall.hits.length,0);
 const lost=duel();lost.s.attack('prota',{target});lost.ctx.target={...target,id:2};lost.step(1);assert.equal(lost.hits.length,0);
 const w=duel();w.s.attack('vigilia',{target});w.s.update(.25,{...w.ctx,paused:true});assert.equal(w.s.active.t,0);w.step(1);assert.ok(w.distance()<=combatMove('vigilia').advance+.02);
 const running=duel();running.ctx.moving=true;running.s.attack('prota',{target,mode:'run'});running.step(1);assert.equal(running.distance(),0);
});
test('native trace only contacts its swept segment, including vertical exclusion',()=>{
 const trace={duration:1,frames:[[[[-1,1,1],[-.5,1,1]]],[[[.5,1,1],[1,1,1]]]]},a={x:0,y:0,z:0,yaw:0};
 assert.ok(bossTraceContact(trace,0,1,a,{x:0,y:0,z:1,radius:.2,height:1.8}));assert.equal(bossTraceContact(trace,0,1,a,{x:0,y:4,z:1,radius:.2,height:1.8}),false);assert.equal(bossTraceContact(trace,0,1,a,{x:0,y:0,z:-1,radius:.2,height:1.8}),false);assert.equal(bossTraceContact(null,0,1,a,target),false);assert.equal(bossTraceContact(trace,0,1,a,{x:0,y:0,z:1,radius:.2,height:1.8},p=>p.z>.98&&p.z<1.02),false);
});
function bossWorld(kind,id,{trace=()=>true,los=()=>true,blocked=()=>false}={}){const hits=[],sq=new Enemy1Squad({meleeTrace:trace,blocked,los,damageTarget:(id,n,o)=>{hits.push(o.combo);return'hit';}}),t={...target,id:'hero',y:0,z:2};sq.setTargets([t]);const[a]=sq.spawn([{x:0,z:0,kind}]);a.alert=a.decideT=1e9;a.cds.claws=a.cds.trinity=1e9;sq.startMelee(a,t,id);return{sq,a,t,hits};}
test('ten miniboss moves: one event per contact at 20/60/120 FPS, bounded displacement and recovery',()=>{
 for(const [kind,moves]of Object.entries(BOSS_MOVES))for(const m of moves)for(const fps of [20,60,120]){const w=bossWorld(kind,m.id);for(let i=0;i<Math.ceil((m.duration+.1)*fps);i++)w.sq.update(1/fps);assert.equal(w.hits.length,m.hits.length,m.id);assert.equal(new Set(w.hits).size,w.hits.length);assert.ok(Number.isFinite(w.a.x+w.a.y+w.a.z));assert.ok(w.a.z<m.advance+.05);assert.ok(m.recovery>.3);assert.equal(bossLift(m,m.duration),0);assert.ok(Math.abs(bossTravel(m,m.duration))<2);}
});
test('miniboss wall and missing trace never resolve fake cone damage',()=>{
 for(const extra of [{trace:()=>false},{los:()=>false}]){const w=bossWorld('e2boss','Executor_Chain',extra);for(let i=0;i<400;i++)w.sq.update(1/120);assert.equal(w.hits.length,0);}
 const wall=bossWorld('warden','Predator_Rush',{blocked:(x,z)=>z>.1});for(let i=0;i<160;i++)wall.sq.update(1/120);assert.ok(wall.a.z<=.1);
});
test('miniboss recovery is punishable; normal enemies keep legacy attacks',()=>{
 const w=bossWorld('e2boss','Executor_Sweep');w.a.act.t=1.1;w.a.act.phase='recovery';assert.equal(w.sq.damageActor(w.a,20,{kind:'melee'}),23);
 for(const kind of ['common','e2']){const w=bossWorld(kind);assert.equal(w.a.act.move,undefined);assert.equal(w.a.anim.role,'attack');}
});

test('AI approaches into the measured claw/scythe range instead of repeating out-of-range cones',()=>{
 for(const kind of ['warden','e2boss']){let hits=0;const range=kind==='warden'?1.7:2.7;const sq=new Enemy1Squad({seed:4,meleeTrace:(a,act,t)=>Math.hypot(t.x-a.x,t.z-a.z)<=range,damageTarget:()=>{hits++;return 'hit';}});const t={...target,id:'hero',y:0,z:0};sq.setTargets([t]);const[a]=sq.spawn([{x:0,z:6,kind}]);a.alert=0;a.T={...a.T,kit:[]};for(const key of ['claws','spiral','judgment','counter','vortex','trinity','collapse'])a.cds[key]=999;
 for(let i=0;i<2400;i++)sq.update(1/120);assert.ok(hits>0,kind+' never reached its weapon range');
 }
});
