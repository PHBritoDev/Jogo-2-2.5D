import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {arenaSpec} from '../../dimensions3d.js';
import {createGreedAbyss} from '../../greed-abyss3d.js';
import {buildBloodScythe} from '../../greed-weapons3d.js';
import {createGreedUltimate,measureRefuge,createGreedAtomicEncounter} from '../../greed-ultimate-atomic3d.js';
import {createCorona} from '../../greed-ultimate-corona3d.js';

const quality=new URLSearchParams(location.search).get('quality')||'medium';
const low=quality==='low', canvas=document.querySelector('canvas');
const gl=new T.WebGLRenderer({canvas,antialias:!low,preserveDrawingBuffer:new URLSearchParams(location.search).has('qa')});
gl.setPixelRatio(Math.min(devicePixelRatio,low?1:1.5));
const scene=new T.Scene(),cam=new T.PerspectiveCamera(43,1,.06,210);
function resize(){gl.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}
resize();addEventListener('resize',resize);
const R=arenaSpec('greed').radius,arena=measureRefuge(R,(x,z)=>Math.hypot(x,z)<=R);
const abyss=createGreedAbyss(T,scene,R);
scene.background=new T.Color(0x19101e);scene.fog=new T.FogExp2(0x322331,.014);
scene.add(new T.HemisphereLight(0xffebff,0x84614b,2.2));
const rim=new T.DirectionalLight(0xffb477,3);rim.position.set(4,9,-8);scene.add(rim);
const loader=new GLTFLoader();
async function actor(file,height){
 const g=await loader.loadAsync(new URL('../../'+file,import.meta.url).href),model=g.scene;
 model.updateMatrixWorld(true);
 const b=new T.Box3().setFromObject(model,true);
 const head=model.getObjectByName('Head'),foot=model.getObjectByName('RightFoot');
 const y=o=>o.getWorldPosition(new T.Vector3()).y;
 const bottom=foot?y(foot):b.min.y;
 const s=height/Math.max(.01,head&&foot?y(head)-bottom:b.max.y-bottom);
 model.scale.multiplyScalar(s);model.position.y=-bottom*s+.08;
 const root=new T.Group();root.add(model);scene.add(root);
 return {root,model,mixer:new T.AnimationMixer(model),clips:g.animations};
}
const [boss,hero]=await Promise.all([actor('NewGanancia2.glb',3.6),actor('Prota_otimizado_2K.glb',1.8)]);
hero.root.position.set(-3,0,5);
const hand=boss.model.getObjectByName('RightHand'),blade=buildBloodScythe(T,{quality:low?0:1});
hand.add(blade);hand.updateWorldMatrix(true,false);
blade.scale.setScalar(1/hand.getWorldScale(new T.Vector3()).x);blade.rotation.z=-.7;
const mount={position:blade.position.clone(),rotation:blade.quaternion.clone(),scale:blade.scale.clone()};
const anchor=new T.Vector3(),launch=new T.Vector3(),landing=new T.Vector3(),originQ=new T.Quaternion(),goalQ=new T.Quaternion();
const crown=createCorona(T,scene,arena,quality);
for(const name of ['Bone_043','Bone_045'])boss.model.getObjectByName(name)?.scale.multiplyScalar(1.8);
const keyLight=new T.DirectionalLight(0xffead1,2.2);keyLight.position.set(2,5,6);scene.add(keyLight);
const walk=hero.mixer.clipAction(T.AnimationClip.findByName(hero.clips,'Walking'));
const stance=hero.mixer.clipAction(T.AnimationClip.findByName(hero.clips,'Combat_Stance'));stance.play();
let walking=false;
const action=boss.mixer.clipAction(T.AnimationClip.findByName(boss.clips,'Right_Hand_Sword_Slash'));action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;
let detached=false,focused=false,health=100,clock=0,manual=false,phaseTime=0,ctx;
function note(hz,length){
 if(!ctx)return;
 const osc=ctx.createOscillator(),g=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(hz,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(hz*.36,ctx.currentTime+length);
 g.gain.setValueAtTime(.05,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+length);osc.connect(g).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+length);
}
const labels={announce:'Juízo da Usura',throw:'Ascensão da lâmina',charge:'A dívida se fecha',escape:'Refúgio além da linha verde · toque no piso ou use WASD',detonate:'Cobrança',aftermath:'Cinzas da coroa',recover:'Retorno',idle:'Ganância · Fase III'};
const hud=document.querySelector('#status');
const ult=createGreedUltimate({arena,speed:2.8,camera:{focus(){focused=true},release(){focused=false}},
 weapon:{release(){scene.attach(blade);launch.copy(blade.position);originQ.copy(blade.quaternion);detached=true},restore(){hand.add(blade);blade.position.copy(mount.position);blade.quaternion.copy(mount.rotation);blade.scale.copy(mount.scale);detached=false}},
 damage({blocked}){health-=blocked?12:60},
 beat(phase){phaseTime=0;hud.textContent=labels[phase];if(phase==='throw')action.reset().play();if(phase==='idle')action.stop();if(phase==='detonate')note(130,.9);if(phase==='announce')note(75,1.3);if(phase==='throw')note(530,.35);if(phase==='charge')note(164,2.2);if(phase==='recover')note(245,.45)}});
const encounterDriver=createGreedAtomicEncounter(ult);
let encounter=null, target=null;
const keys=new Set(),ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0);
onkeydown=e=>keys.add(e.key.toLowerCase());onkeyup=e=>keys.delete(e.key.toLowerCase());onblur=()=>keys.clear();
canvas.onpointerdown=e=>{if(focused)return;ray.setFromCamera(new T.Vector2(2*e.clientX/innerWidth-1,1-2*e.clientY/innerHeight),cam);target=ray.ray.intersectPlane(plane,new T.Vector3());if(target && !arena.walkable(target.x,target.z))target=null};
const look=new T.Vector3(0,2,0),to=new T.Vector3(),eye=new T.Vector3(),stride=new T.Vector3();
cam.position.set(6,4,10);cam.lookAt(look);
function step(dt,draw=true){
 const was=ult.getState();clock+=dt;phaseTime+=dt;
 boss.mixer.update(dt);hero.mixer.update(dt);
 if(!focused){
  stride.set(Number(keys.has('d'))-Number(keys.has('a')),0,Number(keys.has('s'))-Number(keys.has('w')));
  if(stride.lengthSq())target=null;else if(target){stride.subVectors(target,hero.root.position);if(stride.length()<.15){target=null;stride.set(0,0,0)}}
  if(walking!==!!stride.lengthSq()){
   walking=!!stride.lengthSq();const next=walking?walk:stance;next.reset().play().crossFadeFrom(walking?stance:walk,.16,false);
  }
  if(stride.lengthSq()){stride.normalize();hero.root.rotation.y=Math.atan2(stride.x,stride.z);const p=hero.root.position; if(arena.walkable(p.x+stride.x*2.8*dt,p.z+stride.z*2.8*dt))p.addScaledVector(stride,2.8*dt);}
 }
 encounterDriver.tick(dt,encounter,hero.root.position);const s=ult.getState(),p=s.progress;
 if(detached){
  const u=s.phase==='throw'?T.MathUtils.clamp((p*1.12-.42)/.70,0,1):1;
  blade.position.lerpVectors(launch,landing.set(0,8,0),1-(1-u)**2);
  blade.quaternion.copy(originQ);blade.rotateY(u*Math.PI*2+clock*.32);blade.rotateZ(-u*.65);
  if(s.phase==='recover'){hand.getWorldPosition(landing);blade.position.lerp(landing,p);hand.getWorldQuaternion(goalQ).multiply(mount.rotation);blade.quaternion.slerp(goalQ,p);}
 }
 blade.getWorldPosition(anchor);crown.update(s,clock,anchor);blade.userData.updateFx?.(clock,detached?1:.25,low);
 if(s.phase==='announce'){eye.set(2.1,3.5,4.5);to.set(0,3.1,0)}
 else if(s.phase==='throw'||s.phase==='charge'){eye.set(4,2,8+(s.phase==='charge'?p*8:0));to.set(0,Math.max(2,anchor.y*.73),0)}
 else if(s.phase==='idle'){eye.set(5,3.3,8);to.set(0,2,0)}
 else{const wide=s.phase==='escape'?Math.max(0,1-phaseTime/2.3):0;eye.set(15-13*wide,14+18*wide,19-7*wide);to.set(0,2,3+hero.root.position.z*.20)}
 const k=1-Math.exp(-dt*4.2);cam.fov=T.MathUtils.lerp(cam.fov,focused||s.phase==='idle'?43:66,k);cam.updateProjectionMatrix();cam.position.lerp(eye,k);look.lerp(to,k);cam.lookAt(look);
 abyss.update(clock,dt,cam,{player:hero.root.position});if(draw)gl.render(scene,cam);
}
function start(){health=100;target=null;encounterDriver.end();encounter={id:Symbol(),phase:3,grounded:true,busy:false,hpRatio:.4,alive:true};encounterDriver.tick(0,encounter,hero.root.position);return true}
const btn=document.querySelector('#cast');btn.disabled=false;hud.textContent=labels.idle;
btn.onclick=()=>{ctx??=new AudioContext();ctx.resume();if(ult.getState().phase!=='idle')ult.cancel();start()};
window.atomicQA={boss,cam,start,step,state:ult.getState,arena,hero:hero.root,stats:()=>({...gl.info.render,...gl.info.memory,health,heroZ:hero.root.position.z,safe:arena.safe(hero.root.position.x,hero.root.position.z)}),manual(){manual=true}};
let last=performance.now();function frame(now){if(!manual&&!document.hidden)step(Math.min(.05,(now-last)/1000));last=now;requestAnimationFrame(frame)}requestAnimationFrame(frame);
addEventListener('pagehide',()=>{ult.dispose();crown.dispose();abyss.dispose();gl.dispose()},{once:true});
