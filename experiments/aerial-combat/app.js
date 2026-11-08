import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Mobility,AerialCombo,CAPABILITIES,moveWithCollision} from './controller.js';
import {loadRig,measure} from './rig.js';
import {shadowPool} from './shadows.js';
import {SwordRites,segmentBlocked,segmentDistance} from '../../sword-rites3d.js';
import {createAerialEffects} from './effects.js';
import {buildRiteSword} from '../../sword-design3d.js';
import {regenMana} from '../../skills3d.js';
const $=id=>document.getElementById(id),canvas=$('view'),renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
const scene=new T.Scene();scene.background=new T.Color(0x182332);scene.fog=new T.Fog(0x182332,22,70);
scene.add(new T.HemisphereLight(0xd9edff,0x665140,2.3));const sun=new T.DirectionalLight(0xffe0ba,3);sun.position.set(5,10,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,far:40});scene.add(sun);
const rim=new T.DirectionalLight(0x839eff,2);rim.position.set(-4,4,-6);scene.add(rim);
const floor=new T.Mesh(new T.CylinderGeometry(17,17,.4,64),new T.MeshStandardMaterial({color:0x374253,roughness:.88}));floor.position.y=-.2;floor.receiveShadow=true;scene.add(floor);
for(const radius of [4,8,12,16]){const m=new T.Mesh(new T.RingGeometry(radius-.025,radius+.025,96),new T.MeshBasicMaterial({color:0x948366,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.y=.004;scene.add(m);}
const walls=[{x:4,z:0,w:.5,d:6,h:3},{x:-7,z:-5,w:5,d:.6,h:3}];
for(const w of walls){const m=new T.Mesh(new T.BoxGeometry(w.w,w.h,w.d),new T.MeshStandardMaterial({color:0x576174,roughness:.8}));m.position.set(w.x,w.h/2,w.z);m.castShadow=m.receiveShadow=true;scene.add(m);}
for(let i=0;i<12;i++){const angle=i*Math.PI/6,p=new T.Mesh(new T.CylinderGeometry(.22,.35,2.4,6),new T.MeshStandardMaterial({color:0x665d53,metalness:.3,roughness:.65}));p.position.set(Math.sin(angle)*16.5,1.2,Math.cos(angle)*16.5);p.castShadow=true;scene.add(p);}
const camera=new T.PerspectiveCamera(52,innerWidth/innerHeight,.08,100),cameraTarget=new T.Vector3(),desired=new T.Vector3(),ray=new T.Raycaster();
const p={x:0,y:0,z:3},enemy={id:'fighter',p:{x:0,y:0,z:-2},radius:.43,height:1.8,hp:1000,alive:true,invulnerable:false,juggles:0,stun:0};
const dummy={id:'dummy',p:{x:-3,y:0,z:1},radius:.43,height:1.8,hp:1000,alive:true,invulnerable:false};const targets=[enemy,dummy];
function blocked(x,z,y=0,ignoreActors=false){if(Math.hypot(x,z)>16)return true;for(const w of walls)if(y<w.h&&Math.abs(x-w.x)<w.w/2+.32&&Math.abs(z-w.z)<w.d/2+.32)return true;
 if(!ignoreActors)for(const t of targets)if(t.alive&&Math.abs(t.p.y-y)<1.6&&Math.hypot(x-t.p.x,z-t.p.z)<t.radius+.30)return true;return false;}
const obstruction=(x,z,y=0)=>blocked(x,z,y,true);
let now=0,sim=0,acc=0,prototype=true,quality='high',yaw=Math.PI,camYaw=0,camPitch=.24,distance=5.8,manualLook=-9,impact=0,dashKick=0,inspect=false,inspectTime=0,paused=false,ready=false;
let rig=null,ghost=null,combo=null,legacy=null,enemyRoot=null,enemyMixer=null,enemyActs={},enemyGhost=null;const rigCache=new Map(),ghostCache=new Map(),log=[],keys={},input={x:0,z:0},frameTimes=[];
let lastCommand=null;function record(type,data={}){log.push({type,time:now,...data});if(log.length>2000)log.shift();}
const audio={ctx:null,unlock(){if(!this.ctx)this.ctx=new AudioContext();if(this.ctx.state!=='running')this.ctx.resume();},tone(hit=false,stroke=0){if(!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=hit?'triangle':'sine';o.frequency.setValueAtTime(hit?(stroke===4?100:160+stroke*35):440,t);o.frequency.exponentialRampToValueAtTime(hit?45:100,t+.12);g.gain.setValueAtTime(hit?.08:.025,t);g.gain.exponentialRampToValueAtTime(.001,t+.15);o.connect(g).connect(c.destination);o.start(t);o.stop(t+.16);}};
const mobility=new Mobility(p,{blocked,event(type,data){record(type,data);if(type==='jump'||type==='dash'){ghost?.emit();audio.tone();if(type==='dash'){dashKick=.12;rig?.play('dash',true);}else rig?.play('jump',true);}}});
const foeMobility=new Mobility(enemy.p,{blocked:(x,z,y)=>obstruction(x,z,y)||Math.hypot(x-p.x,z-p.z)<.72&&Math.abs(y-p.y)<1.5,capabilities:CAPABILITIES.fighter,event(type){if(type==='jump'||type==='dash')enemyGhost?.emit();}});
const vfx=createAerialEffects(scene);
let deathPlayed=false,heroHP=100,heroStun=0,enemyAttackAt=0,foeDashAt=0,foeAttack=null,enemyAction=null,magic=null;
const magicMesh=buildRiteSword(T,'prota');magicMesh.scale.setScalar(.55);magicMesh.visible=false;scene.add(magicMesh);
function targetCapsule(t){return{id:t.id,alive:t.alive,x:t.p.x,y:t.p.y+t.height*.5,z:t.p.z,radius:t.radius,height:t.height};}
function damage(t,n,info={}){if(!t.alive||t.invulnerable)return false;t.hp-=n;if(t===enemy){t.stun=info.kind==='physical'?.18:.08;
 if(info.launcher&&enemy.juggles<2&&foeMobility.airTime<2){foeMobility.launch(6.2);enemy.juggles++;t.stun=.26;record('launcher',{target:t.id});}}
 record('damage',{target:t.id,n,kind:info.kind,swing:info.swing});return true;}
function comboEvent(type,e){if(type==='attack'){rig.play(e.def.id,true);vfx.event('start',{kind:'basic'});audio.tone();record('attack',{move:e.def.id,air:e.air,latencyMs:lastCommand===null?0:(performance.now()-lastCommand)});}
 if(type==='hit'){vfx.event('impact',{target:e.point,sword:'prota',final:!!e.move.finisher,actor:e.target.holder});impact=e.move.finisher?.20:.10;audio.tone(true,Number(e.move.id.at(-1)));record('contact',{move:e.move.id,phase:combo.active.t,target:e.target.id});}
 if(type==='cast'){rig.sword.visible=false;rig.play('cast',true);record('cast');}
 if(type==='magicRelease'){const h=rig.hand.getWorldPosition(new T.Vector3());magic={p:{x:h.x,y:h.y,z:h.z},prev:{x:h.x,y:h.y,z:h.z},dx:Math.sin(yaw),dz:Math.cos(yaw),age:0,hit:new Set()};magicMesh.visible=true;record('magicRelease',{y:p.y});}
 if(type==='cancel'){vfx.clear();rig.sword.visible=true;magic=null;magicMesh.visible=false;rig.play('idle');}}
async function selectRig(kind){ready=false;if(combo)combo.cancel('rig-change');ghost?.clear();if(rig)rig.holder.visible=false;
 if(!rigCache.has(kind)){const r=await loadRig(kind);rigCache.set(kind,r);scene.add(r.holder);ghostCache.set(kind,shadowPool(scene,r.root,3));}
 rig=rigCache.get(kind);ghost=ghostCache.get(kind);ghost.quality(quality);rig.holder.visible=true;rig.holder.position.set(p.x,p.y,p.z);rig.holder.rotation.y=yaw;
 combo=new AerialCombo({moves:rig.moves,mobility,targets:()=>targets,blocked:obstruction,damage,event:comboEvent});
 legacy=new SwordRites({choreography:true,blocked:v=>obstruction(v.x,v.z,v.y),move(v){moveWithCollision(p,v.x-p.x,v.z-p.z,blocked);},pose(a){return rig.sample(a.clip,a.t);},hit(n,id){const t=targets.find(t=>t.id===id);if(t)damage(t,n,{kind:'physical'});},event(type,e){vfx.event(type,e);}});
 $('clip').replaceChildren(...rig.originals.map(c=>Object.assign(document.createElement('option'),{value:c.name,textContent:c.name+' · '+c.duration.toFixed(2)+' s'})));
 $('status').textContent='Treino isolado · sem alterar a campanha';ready=true;record('rig',{kind});}
async function loadEnemy(){const g=await new GLTFLoader().loadAsync(new URL('../../Enemy1-lod.glb',import.meta.url).href);enemyRoot=g.scene;const b=measure(enemyRoot),s=1.8/(b.max.y-b.min.y);enemyRoot.scale.setScalar(s);enemyRoot.position.y=-b.min.y*s;const holder=new T.Group();holder.add(enemyRoot);scene.add(holder);enemy.holder=holder;
 enemyRoot.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;}});enemyMixer=new T.AnimationMixer(enemyRoot);const map={idle:'01a14b5a-2ee6-75dc-982f-8965372f192b',walk:'Walking',attack:'01a14b57-0772-77b2-9da3-b6644a5d1cae'};
 for(const[n,k]of Object.entries(map)){const c=g.animations.find(c=>c.name===k);if(c)enemyActs[n]=enemyMixer.clipAction(c);}enemyGhost=shadowPool(scene,enemyRoot,2);foePlay('idle');
 const d=new T.Group(),mat=new T.MeshStandardMaterial({color:0x947451,roughness:.65,metalness:.15});for(const[y,h,r]of [[.85,1.3,.27],[1.62,.26,.19]]){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,8),mat);m.position.y=y;m.castShadow=true;d.add(m);}const arms=new T.Mesh(new T.BoxGeometry(1.05,.16,.18),mat);arms.position.y=1.25;d.add(arms);d.position.set(dummy.p.x,0,dummy.p.z);scene.add(d);dummy.holder=d;
}
function foePlay(name){const a=enemyActs[name]||enemyActs.idle;if(!a||a===enemyAction)return;if(enemyAction)enemyAction.fadeOut(.08);a.reset().fadeIn(.08).play();enemyAction=a;}
function command(kind){lastCommand=performance.now();if(!ready||inspect||heroHP<=0||heroStun>0||mobility.lock)return false;audio.unlock();let accepted=false;
 if(kind==='attack'){accepted=prototype?combo.attack(now,yaw):legacy.attack('prota',{target:targetCapsule(targets.find(t=>t.id===combo.targetId)||enemy),from:p,yaw,mode:mobility.grounded?'ground':'air'});}
 if(kind==='dash'||kind==='jump'){if(prototype?!combo.canCancel:!legacy.canCancel)return false;accepted=kind==='dash'?mobility.dashAt(now,input,yaw,prototype):mobility.jumpAt(now,prototype);if(accepted){if(prototype){combo.active=null;combo.prev=null;combo.queuedUntil=-1;}else legacy.cancel(kind);}}
 if(kind==='magic'){if(!prototype&&!legacy.canCancel)return false;if(!prototype)legacy.cancel('magic');accepted=combo.cast(now);}record('command',{kind,accepted});return accepted;
}
function reset(){combo?.cancel('restart');legacy?.cancel('restart');mobility.reset();foeMobility.reset();Object.assign(p,{x:0,y:0,z:3});Object.assign(enemy.p,{x:0,y:0,z:-1.5});enemy.hp=dummy.hp=1000;enemy.juggles=0;enemy.stun=0;heroHP=100;heroStun=0;deathPlayed=false;foeAttack=null;enemyAttackAt=now+1;combo.mana=40;ghost?.clear();enemyGhost?.clear();yaw=Math.PI;rig.play('idle');record('restart');}
function updateFoe(dt){const d=Math.hypot(p.x-enemy.p.x,p.z-enemy.p.z),ang=Math.atan2(p.x-enemy.p.x,p.z-enemy.p.z),axis={x:0,z:0};enemy.stun=Math.max(0,enemy.stun-dt);
 if($('ai').checked&&!inspect&&heroHP>0&&enemy.stun<=0){if(d>1.55){axis.x=Math.sin(ang);axis.z=Math.cos(ang);}if(d>4&&now>foeDashAt){foeMobility.dashAt(now,axis,ang);foeDashAt=now+2.4;}
 if(!mobility.grounded&&foeMobility.grounded&&enemy.juggles===0)foeMobility.jumpAt(now);
 if(d<2.2&&Math.abs(p.y-enemy.p.y)<1.6&&now>enemyAttackAt&&!foeAttack){foeAttack={t:0,hit:false};enemyAttackAt=now+1.5;foePlay('attack');}}
 if(foeAttack){foeAttack.t+=dt;if(foeAttack.t>.42&&!foeAttack.hit){foeAttack.hit=true;if(d<1.75&&Math.abs(p.y-enemy.p.y)<1.2&&now>mobility.invulnerableUntil&&heroHP>0){heroHP=Math.max(0,heroHP-6);heroStun=.16;combo.cancel('received-hit');legacy.cancel('received-hit');rig.play('hit',true);record('retaliation',{air:!foeMobility.grounded});}}if(foeAttack.t>.85)foeAttack=null;}
 foeMobility.step(dt,enemy.stun>0?{x:0,z:0}:axis,2.6);if(foeMobility.grounded)enemy.juggles=0;
 enemy.holder.position.set(enemy.p.x,enemy.p.y,enemy.p.z);enemy.holder.rotation.y=ang;if(!foeAttack)foePlay(Math.hypot(axis.x,axis.z)>.1?'walk':'idle');enemyMixer.update(dt);enemyGhost.update(dt);
}
function simulate(dt){now+=dt;if(!ready)return;heroStun=Math.max(0,heroStun-dt);
 const ax=(keys.d?1:0)-(keys.a?1:0)+joy.x,az=(keys.s?1:0)-(keys.w?1:0)+joy.z,len=Math.max(1,Math.hypot(ax,az));input.x=(ax*Math.cos(camYaw)+az*Math.sin(camYaw))/len;input.z=(-ax*Math.sin(camYaw)+az*Math.cos(camYaw))/len;
 if(inspect){inspectTime+=dt*Number($('rate').value);const name=$('clip').value;const clip=rig.raw.get(name);if(clip){let a=rig.actions['inspect:'+name];if(!a)rig.actions['inspect:'+name]=rig.mixer.clipAction(clip);rig.step(dt,'inspect:'+name,inspectTime%clip.duration);}return;}
 if(heroHP<=0){mobility.lock=true;if(combo.active||combo.magic)combo.cancel('death');mobility.step(dt,{x:0,z:0});rig.holder.position.set(p.x,p.y,p.z);if(!deathPlayed){rig.play('death',true);deathPlayed=true;}rig.step(dt);ghost.update(dt);enemyGhost.update(dt);vfx.update(dt,quality);return;}
 if(prototype)yaw=combo.tick(dt,now,yaw);else{if(combo.magic)combo.tick(dt,now,yaw);combo.mana=regenMana(combo.mana,dt,true);const t=targets.find(t=>t.id===combo.targetId)||enemy;legacy.update(dt,{from:p,target:targetCapsule(t),grounded:mobility.grounded});}
 mobility.step(dt,heroStun>0?{x:0,z:0}:input,keys.r?6.8:4.3);if(!combo.active&&!legacy.active&&!mobility.dash&&Math.hypot(input.x,input.z)>.1){const want=Math.atan2(input.x,input.z);yaw+=Math.atan2(Math.sin(want-yaw),Math.cos(want-yaw))*(1-Math.exp(-18*dt));}
 rig.holder.position.set(p.x,p.y,p.z);rig.holder.rotation.y=yaw;
 if(prototype&&combo.active){const a=combo.active;const blade=rig.step(dt,a.def.id,a.t);combo.contact(blade);if(a.t>=a.def.open&&a.t<=a.def.close)vfx.event('blade',{a:{kind:'basic',sword:'prota',serial:a.id,t:a.t,def:a.def},blade});}
 else if(combo.magic)rig.step(dt,'cast',Math.min(.55,combo.magic.t));
 else if(!prototype&&legacy.active)rig.step(dt,legacy.active.clip,legacy.active.t);
 else if(heroStun>0)rig.step(dt,'hit',.16-heroStun);
 else if(mobility.dash)rig.step(dt,'dash',(.16-mobility.dash.left)*1.2);
 else if(!mobility.grounded)rig.step(dt,'jump',Math.min(.38,mobility.airTime));
 else{const moving=Math.hypot(input.x,input.z);const action=rig.play(moving>.1?(moving>.55?'run':'walk'):'idle');action.setEffectiveTimeScale(moving>.1?Math.max(.55,Math.min(1.6,(keys.r?6.8:4.3)*moving/(moving>.55?4.3:2.2))):1);rig.step(dt);}
 rig.sword.visible=!combo.magic;ghost.update(dt);if(mobility.dash&&Math.floor(now*22)!==Math.floor((now-dt)*22))ghost.emit();
 if(magic){Object.assign(magic.prev,magic.p);magic.age+=dt;magic.p.x+=magic.dx*12*dt;magic.p.z+=magic.dz*12*dt;magicMesh.position.set(magic.p.x,magic.p.y,magic.p.z);magicMesh.rotation.set(Math.PI/2,yaw,0);
  for(const t of targets)if(!magic.hit.has(t.id)&&segmentDistance({x:t.p.x,y:t.p.y+.9,z:t.p.z},magic.prev,magic.p)<t.radius+.25&&!segmentBlocked(magic.prev,magic.p,v=>obstruction(v.x,v.z,v.y))){magic.hit.add(t.id);damage(t,24,{kind:'magic'});vfx.event('impact',{target:magic.p,sword:'prota',final:false});}
  if(magic.age>.8||segmentBlocked(magic.prev,magic.p,v=>obstruction(v.x,v.z,v.y))){magic=null;magicMesh.visible=false;}}
 updateFoe(dt);vfx.update(dt,quality);impact=Math.max(0,impact-dt);dashKick=Math.max(0,dashKick-dt);
}
function updateCamera(dt){const focal=new T.Vector3(p.x,p.y+1.25,p.z);
 if(inspect){focal.set(p.x,1.1,p.z);}else if($('lock').checked){const t=targets.find(t=>t.id===combo.targetId)||enemy;if(!mobility.grounded||!foeMobility.grounded)focal.y=Math.min(p.y+2.1,Math.max(p.y+1.1,(p.y+t.p.y)*.5+1.2));}
 if($('recenter').checked&&now-manualLook>1.8&&Math.hypot(input.x,input.z)>.1)camYaw+=Math.atan2(Math.sin(yaw+Math.PI-camYaw),Math.cos(yaw+Math.PI-camYaw))*(1-Math.exp(-1.8*dt));
 cameraTarget.lerp(focal,1-Math.exp(-22*dt));const reach=distance*(innerHeight>innerWidth?1.35:1);desired.set(cameraTarget.x+Math.sin(camYaw)*Math.cos(camPitch)*reach,cameraTarget.y+Math.sin(camPitch)*reach,cameraTarget.z+Math.cos(camYaw)*Math.cos(camPitch)*reach);
 const dir=desired.clone().sub(cameraTarget),length=dir.length();dir.normalize();for(let t=.25;t<length;t+=.08){const q=cameraTarget.clone().addScaledVector(dir,t);if(obstruction(q.x,q.z,q.y)){desired.copy(cameraTarget).addScaledVector(dir,Math.max(.4,t-.20));break;}}desired.y=Math.max(.25,desired.y);
 camera.position.lerp(desired,1-Math.exp(-28*dt));camera.lookAt(cameraTarget);if($('shake').checked&&impact>0){camera.position.x+=Math.sin(now*91)*impact*.12;camera.position.y+=Math.sin(now*117)*impact*.08;}camera.fov=52+(dashKick>0?dashKick*18:0);camera.updateProjectionMatrix();
}
const joy={x:0,z:0},look=new Map();let joyPointer=null,joyCenter={x:0,y:0};
const stick=$('joystick'),knob=stick.querySelector('i');stick.onpointerdown=e=>{joyPointer=e.pointerId;stick.setPointerCapture(e.pointerId);const r=stick.getBoundingClientRect();joyCenter={x:r.x+r.width/2,y:r.y+r.height/2};stick.onpointermove(e);};stick.onpointermove=e=>{if(e.pointerId!==joyPointer)return;const dx=e.clientX-joyCenter.x,dz=e.clientY-joyCenter.y,n=Math.max(42,Math.hypot(dx,dz));joy.x=dx/n;joy.z=dz/n;knob.style.transform=`translate(${joy.x*30}px,${joy.z*30}px)`;};stick.onpointerup=stick.onpointercancel=e=>{if(e.pointerId===joyPointer){joyPointer=null;joy.x=joy.z=0;knob.style.transform='';}};
canvas.onpointerdown=e=>{look.set(e.pointerId,{x:e.clientX,y:e.clientY,type:e.pointerType});canvas.setPointerCapture(e.pointerId);audio.unlock();};canvas.onpointermove=e=>{const old=look.get(e.pointerId);if(!old)return;if(look.size===2){const other=[...look.entries()].find(([id])=>id!==e.pointerId)?.[1];if(other)distance=T.MathUtils.clamp(distance+(Math.hypot(old.x-other.x,old.y-other.y)-Math.hypot(e.clientX-other.x,e.clientY-other.y))*.012,2.4,10);}else{const sense=Number($(e.pointerType==='touch'?'touch':'mouse').value),unit=2*Math.PI/Math.max(320,innerWidth);camYaw-=(e.clientX-old.x)*unit*sense;camPitch=T.MathUtils.clamp(camPitch+(e.clientY-old.y)*unit*sense,-.15,1.1);manualLook=now;}Object.assign(old,{x:e.clientX,y:e.clientY});};canvas.onpointerup=canvas.onpointercancel=e=>look.delete(e.pointerId);canvas.onwheel=e=>{e.preventDefault();distance=T.MathUtils.clamp(distance+e.deltaY*.005,2.4,10);};
for(const b of document.querySelectorAll('[data-action]'))b.onpointerdown=e=>{e.preventDefault();command(b.dataset.action);};
addEventListener('keydown',e=>{if(['INPUT','SELECT'].includes(document.activeElement.tagName))return;const k=e.key.toLowerCase();keys[k]=true;if(e.repeat)return;const action={shift:'dash',' ':'jump',j:'attack',k:'magic'}[k];if(action){e.preventDefault();command(action);}if(k==='l')$('lock').checked=!$('lock').checked;});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;joy.x=joy.z=0;look.clear();combo?.cancel('blur');});
$('restart').onclick=reset;$('prototype').onchange=()=>{prototype=$('prototype').checked;reset();};$('rig').onchange=()=>selectRig($('rig').value).then(reset).catch(fail);
$('quality').onchange=()=>{quality=$('quality').value;renderer.setPixelRatio(quality==='low'?1:Math.min(devicePixelRatio,1.5));for(const g of ghostCache.values())g.quality(quality);enemyGhost?.quality(quality);};
$('inspect').onclick=()=>{inspect=!inspect;combo.cancel('inspector');legacy.cancel('inspector');inspectTime=0;};$('clip').onchange=()=>{inspectTime=0;};for(const b of document.querySelectorAll('[data-angle]'))b.onclick=()=>{camYaw=Number(b.dataset.angle);camPitch=.15;};
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function fail(e){$('status').textContent='Falha ao carregar: '+e.message;console.error(e);}
await Promise.all([selectRig('new'),loadEnemy()]);reset();cameraTarget.set(0,1.25,3);camera.position.set(0,3,9);renderer.compile(scene,camera);
let last=performance.now();function frame(t){requestAnimationFrame(frame);const dt=Math.max(0,Math.min(.1,(t-last)/1000));last=t;if(paused)return;frameTimes.push(dt*1000);if(frameTimes.length>600)frameTimes.shift();acc+=dt;while(acc>=1/120){simulate(1/120);acc-=1/120;}updateCamera(dt);renderer.render(scene,camera);$('health').textContent='VIDA '+heroHP;$('mana').textContent='MANA '+Math.floor(combo.mana);$('move').textContent=inspect?'Inspeção':combo.active?.def.name||(!mobility.grounded?'No ar':prototype?'Em guarda':'Combate legado');}requestAnimationFrame(frame);
window.AerialLab={ready:true,command,reset,rig:()=>rig,targets,log,
 snapshot(){return{p:{...p},enemy:{...enemy.p},hp:heroHP,mana:combo.mana,grounded:mobility.grounded,airTime:mobility.airTime,stallBudget:mobility.budget,dash:!!mobility.dash,nextDash:mobility.nextDash,combo:combo.active?{id:combo.active.def.id,t:combo.active.t,hit:[...combo.active.hit]}:null,resources:{...renderer.info.memory},draw:{...renderer.info.render},ghosts:ghost.stats(),enemyGhosts:enemyGhost.stats(),camera:{position:camera.position.toArray(),fov:camera.fov,yaw:camYaw},frameTimes:[...frameTimes]};},
 step(dt=1/60,n=1,render=true){paused=true;for(let i=0;i<n;i++){const count=Math.ceil(dt*120);for(let j=0;j<count;j++)simulate(dt/count);updateCamera(dt);}if(render)renderer.render(scene,camera);return this.snapshot();},resume(){paused=false;last=performance.now();},
 pose(x,y,z,angle=Math.PI){Object.assign(p,{x,y,z});yaw=angle;mobility.reset();if(y>0){mobility.grounded=false;mobility.jumpUsed=true;}rig.holder.position.set(x,y,z);rig.holder.rotation.y=yaw;},
 target(x,y,z){Object.assign(enemy.p,{x,y,z});foeMobility.reset();if(y>0)foeMobility.launch(0);},
 setInput(x,z){joy.x=x;joy.z=z;},ai(v){$('ai').checked=v;},mode(v){$('prototype').checked=v;$('prototype').onchange();},quality(v){$('quality').value=v;$('quality').onchange();},
 comboStep(i){combo.next=i;combo.lastEnd=now;combo.active=null;},lock(v){mobility.lock=v;if(v)combo.cancel('cinematic');},
 setMana(n){combo.mana=n;},setHP(n){heroHP=n;},setInvulnerable(v){enemy.invulnerable=v;},
 async selectRig(kind){await selectRig(kind);reset();},sample(id,t,angle=.4){paused=true;combo.active=null;rig.holder.position.set(0,0,0);rig.holder.rotation.y=0;const blade=rig.sample(id,t);camera.position.set(Math.sin(angle)*4,2.2,Math.cos(angle)*4);camera.lookAt(0,1,0);renderer.render(scene,camera);return{blade:JSON.parse(JSON.stringify(blade)),bounds:measure(rig.root),resources:{...renderer.info.memory}};}
};
