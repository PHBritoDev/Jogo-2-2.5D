import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { retargetClip } from 'three/addons/utils/SkeletonUtils.js';

const canvas=document.getElementById('scene'),status=document.getElementById('status'),loading=document.getElementById('loading');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x9bc6d1);
scene.fog=new THREE.Fog(0x9bc6d1,35,115);
const camera=new THREE.PerspectiveCamera(56,innerWidth/innerHeight,.1,180);
camera.position.set(0,3.2,10);
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
scene.add(new THREE.HemisphereLight(0xdff5ff,0x536447,2.0));
const sun=new THREE.DirectionalLight(0xffedca,2.5);sun.position.set(-18,28,10);sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-32;sun.shadow.camera.right=32;sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;sun.shadow.bias=-0.0004;scene.add(sun);
const fill=new THREE.DirectionalLight(0x8dbbff,.65);fill.position.set(18,10,-18);scene.add(fill);
const mat=(color,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness});
const groundMat=mat(0x476e43),pathMat=mat(0x9a8d6b),barkMat=mat(0x493c2e),leafMat=mat(0x254d36),leafLight=mat(0x3b7045),rockMat=mat(0x626c68);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.04;ground.receiveShadow=true;scene.add(ground);
const path=new THREE.Mesh(new THREE.PlaneGeometry(6,90),pathMat);path.rotation.x=-Math.PI/2;path.position.set(0,.005,-25);path.receiveShadow=true;scene.add(path);
const hillMat=mat(0x63835b);
for(let i=0;i<10;i++){const hill=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),hillMat);hill.scale.set(8+Math.random()*10,2+Math.random()*4,6+Math.random()*7);hill.position.set((Math.random()-.5)*100,-1.5,-30-Math.random()*60);scene.add(hill);}
const treeGroup=new THREE.Group();scene.add(treeGroup);
const treeObstacles=[];const rockObstacles=[];
function makeTree(x,z,s=1){const g=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.16*s,.32*s,2.6*s,7),barkMat);trunk.position.y=1.3*s;trunk.castShadow=true;g.add(trunk);
for(let j=0;j<3;j++){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry((1.05-j*.12)*s,1),j===1?leafLight:leafMat);crown.position.set((Math.random()-.5)*.25*s,(2.25+j*.62)*s,(Math.random()-.5)*.25*s);crown.scale.set(1,.9,1);crown.castShadow=true;g.add(crown);}
g.position.set(x,0,z);treeGroup.add(g);treeObstacles.push({x,z,radius:.38*s+.28});return g;}
let seed=9137;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
for(let i=0;i<100;i++){let x=(rand()-.5)*90,z=-8-rand()*82;if(Math.abs(x)<5&&z>-48)continue;makeTree(x,z,.7+rand()*1.2);}
for(let i=0;i<32;i++){const radius=.4+rand()*1.15;const r=new THREE.Mesh(new THREE.DodecahedronGeometry(radius,0),rockMat);r.position.set((rand()-.5)*42,.15,-5-rand()*65);r.scale.y=.5+rand()*.6;r.rotation.set(rand(),rand()*3,rand());r.castShadow=true;r.receiveShadow=true;scene.add(r);rockObstacles.push({x:r.position.x,z:r.position.z,radius:radius*.92,height:r.position.y+radius*r.scale.y*.72});}
const grassGroup=new THREE.Group();scene.add(grassGroup);
for(let i=0;i<180;i++){const x=(rand()-.5)*58,z=-3-rand()*55;if(Math.abs(x)<3&&z>-48)continue;const h=.12+rand()*.3;const blade=new THREE.Mesh(new THREE.ConeGeometry(.055,h,3),i%3?leafLight:leafMat);blade.position.set(x,h/2,z);blade.rotation.z=(rand()-.5)*.55;grassGroup.add(blade);}

const player=new THREE.Group();scene.add(player);player.position.set(0,0,4);
// Inimigo comum: usa Enemy1.glb com as animações que realmente existirem no arquivo.
const enemy=new THREE.Group();scene.add(enemy);enemy.position.set(0,0,-3.2);
const enemyTexture=new THREE.TextureLoader().load('./Enemy1-sprite.png');
enemyTexture.colorSpace=THREE.SRGBColorSpace;
const enemySpriteMaterial=new THREE.MeshStandardMaterial({map:enemyTexture,transparent:true,alphaTest:.06,side:THREE.DoubleSide,roughness:1,emissive:0x000000});
const enemyMaterials=[enemySpriteMaterial];
const enemySprite=new THREE.Mesh(new THREE.PlaneGeometry(1.55,1.95),enemySpriteMaterial);
enemySprite.position.y=.98;enemySprite.castShadow=true;enemy.add(enemySprite);
const enemyModelRoot=new THREE.Group();enemy.add(enemyModelRoot);
const enemyGroundShadow=new THREE.Mesh(new THREE.CircleGeometry(.48,20),new THREE.MeshBasicMaterial({color:0x142019,transparent:true,opacity:.35,depthWrite:false}));
enemyGroundShadow.rotation.x=-Math.PI/2;enemyGroundShadow.position.y=.012;enemy.add(enemyGroundShadow);
let enemyModel=null,enemyMixer=null,enemyClips=[],enemyActions={},enemyCurrentAction=null,enemyCurrentRole='idle',enemyHasDeathClip=false;
let enemyDashClip=null,enemyJumpClip=null,enemyTransferDone=false;
let enemyHP=100,enemyAlive=true,enemyHitFlash=0,enemyKnockback=0,attackCooldown=0,pendingEnemyHitAt=0;
function playEnemyAnimation(role,fade=.1,once=false){
 const next=enemyActions[role];if(!next)return false;
 if(enemyCurrentAction&&enemyCurrentAction!==next)enemyCurrentAction.fadeOut(fade);
 next.reset();next.enabled=true;next.setEffectiveWeight(1);
 next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);
 next.clampWhenFinished=once;next.fadeIn(fade).play();
 enemyCurrentAction=next;enemyCurrentRole=role;return true;
}
function setEnemyHitFlash(active){
 for(const material of enemyMaterials){
  if(!material||!material.emissive)continue;
  if(material.userData.enemyBaseEmissive===undefined){material.userData.enemyBaseEmissive=material.emissive.getHex();material.userData.enemyBaseEmissiveIntensity=material.emissiveIntensity||0;}
  if(active){material.emissive.setHex(0x8b2417);material.emissiveIntensity=1.1;}
  else{material.emissive.setHex(material.userData.enemyBaseEmissive);material.emissiveIntensity=material.userData.enemyBaseEmissiveIntensity;}
 }
}
function tryTransferEnemyLocomotion(){
 if(enemyTransferDone||!model||!mixer||!enemyModel)return;
 enemyTransferDone=true;
 const transfer=(clip,role)=>{
  if(!clip)return;
  try{
   const adapted=retargetClip(model,enemyModel,clip);
   if(!adapted||!adapted.tracks||adapted.tracks.length<4)throw new Error('retarget sem trilhas suficientes');
   const action=mixer.clipAction(adapted);
   if(role==='jump')actions.jump=action;else actions.dash=action;
   console.info('Enemy1.glb: '+role+' adaptado para Protagonista.glb ('+clip.name+')');
  }catch(err){console.warn('Não foi possível adaptar '+role+' de Enemy1.glb:',err);}
 };
 transfer(enemyDashClip,'dash');transfer(enemyJumpClip,'jump');
}
new GLTFLoader().load('./Enemy1.glb?v=mod151-enemy1-animations',gltf=>{
 const imported=gltf.scene;
 imported.traverse(o=>{
  if(!o.isMesh)return;
  o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;
  const materials=Array.isArray(o.material)?o.material:[o.material];
  for(const material of materials)if(material&&!enemyMaterials.includes(material))enemyMaterials.push(material);
 });
 const bounds=new THREE.Box3().setFromObject(imported),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 if(size.y>.001){const scale=1.2/size.y;imported.scale.setScalar(scale);imported.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);}
 enemyModelRoot.add(imported);enemyModel=imported;enemySprite.visible=false;
 enemyClips=gltf.animations||[];enemyMixer=new THREE.AnimationMixer(imported);
 const find=regex=>enemyClips.find(c=>regex.test(String(c.name||'')));
 const clipsByRole={
  idle:find(/idle|breath|stand|parad|repos/i),
  walk:find(/walk|walking|locomotion|caminh/i),
  attack:find(/attack|slash|claw|strike|swing|golpe|ataque/i),
  hit:find(/hit|hurt|damage|reaction|impact|dano|atingido/i),
  death:find(/death|die|dead|dying|morte|morrer/i)
 };
 enemyDashClip=find(/dash|quick.?step|evade|dodge|esquiva/i);
 enemyJumpClip=find(/jump|leap|hop|salto|saltar/i);
 for(const role of Object.keys(clipsByRole)){const clip=clipsByRole[role];if(clip)enemyActions[role]=enemyMixer.clipAction(clip);}
 enemyHasDeathClip=!!clipsByRole.death;
 const fallbackIdle=enemyClips.find(c=>!/attack|slash|claw|strike|swing|hit|hurt|damage|death|die|jump|leap|hop|saltar|salto|dash|dodge|walk|run|fall|land|air/i.test(String(c.name||'')));
 if(!enemyActions.idle&&fallbackIdle)enemyActions.idle=enemyMixer.clipAction(fallbackIdle);
 if(enemyActions.idle)playEnemyAnimation('idle',0);
 window.Enemy1AnimationReport=enemyClips.map(c=>c.name);
 console.info('Enemy1.glb animações:',window.Enemy1AnimationReport);
 tryTransferEnemyLocomotion();
},undefined,err=>{console.error('Enemy1.glb não carregou; mantendo sprite de segurança.',err);enemyModelRoot.visible=false;});

function updateEnemyHud(){
 const p=enemy.position.clone().add(new THREE.Vector3(0,2.2,0)).project(camera);
 const hud=document.getElementById('enemy-hud');
 if(!hud)return;
 const visible=p.z>-1&&p.z<1&&p.x>-1.2&&p.x<1.2&&p.y>-1.2&&p.y<1.2&&enemyAlive;
 hud.style.display=visible?'block':'none';
 if(visible){hud.style.left=((p.x*.5+.5)*innerWidth)+'px';hud.style.top=((-p.y*.5+.5)*innerHeight)+'px';}
 const fill=document.getElementById('enemy-hp-fill');
 if(fill)fill.style.width=Math.max(0,enemyHP)+'%';
}
function tryPlayerAttack(){
 const now=performance.now();if(now<attackCooldown||!enemyAlive)return;attackCooldown=now+680;
 let duration=1;
 if(attackClips.length){
  const attackClip=attackClips[attackClipIndex++%attackClips.length];duration=attackClip.duration||1;
  const attackAction=mixer.clipAction(attackClip);if(activeAction&&activeAction!==attackAction)activeAction.fadeOut(.07);
  attackAction.reset();attackAction.enabled=true;attackAction.setEffectiveWeight(1);attackAction.setLoop(THREE.LoopOnce,1);attackAction.clampWhenFinished=true;attackAction.fadeIn(.07).play();activeAction=attackAction;actionUntil=now+duration*1000;
 }else{status.textContent='Não foi encontrado um clipe de ataque válido no Protagonista.glb.';actionUntil=now+300;}
 // O dano só é calculado quando o golpe chega à fase de contato da animação.
 pendingEnemyHitAt=now+Math.min(460,Math.max(190,duration*.28*1000));
}
function resolvePlayerAttackHit(){
 if(!enemyAlive)return;
 const dx=enemy.position.x-player.position.x,dz=enemy.position.z-player.position.z;
 const distance=Math.hypot(dx,dz),forwardX=Math.sin(playerYaw),forwardZ=Math.cos(playerYaw);
 const facing=(dx*forwardX+dz*forwardZ)/(distance||1);
 if(distance>2.0||facing<.28){
  status.textContent=distance>2.0?'Chegue mais perto para acertar o golpe':'Vire-se para o inimigo e ataque';
  return;
 }
 enemyHP=Math.max(0,enemyHP-25);enemyHitFlash=.2;enemyKnockback=.42;
 status.textContent=enemyHP===0?'Inimigo derrotado!':'Acertou! Vida do inimigo: '+enemyHP+'%';
 if(enemyHP===0){enemyAlive=false;document.getElementById('enemy-hud').style.display='none';if(!playEnemyAnimation('death',.06,true))enemyHasDeathClip=false;}
 else playEnemyAnimation('hit',.05,true);
}

// Anjo-Guia: usa o modelo GLB original adicionado ao repositório.
const guide=new THREE.Group();scene.add(guide);guide.position.set(3.3,0,-5.4);
const guideModelRoot=new THREE.Group();guide.add(guideModelRoot);
const guideAura=new THREE.PointLight(0xffe6a3,.45,2.8);guideAura.position.set(0,.78,.1);guide.add(guideAura);
const guideShadow=new THREE.Mesh(new THREE.CircleGeometry(.28,20),new THREE.MeshBasicMaterial({color:0x142019,transparent:true,opacity:.28,depthWrite:false}));
guideShadow.rotation.x=-Math.PI/2;guideShadow.position.y=.014;guide.add(guideShadow);
const questMarker=new THREE.Mesh(new THREE.TorusGeometry(.38,.04,8,28),new THREE.MeshBasicMaterial({color:0xffd65a}));
questMarker.rotation.x=Math.PI/2;questMarker.position.set(guide.position.x,.06,guide.position.z);scene.add(questMarker);
new GLTFLoader().load('./AnjoGuia.glb?v=mod148-anjo-guia-glb',gltf=>{
 const imported=gltf.scene;
 imported.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material&&'side'in o.material)o.material.side=THREE.DoubleSide;}});
 // Normaliza a escala e apoia os pés no chão sem modificar a malha original.
 const bounds=new THREE.Box3().setFromObject(imported);
 const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 if(size.y>0.001){
  const scale=.82/size.y;
  imported.scale.setScalar(scale);
  imported.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
 }
 guideModelRoot.add(imported);
 guide.userData.modelLoaded=true;
},undefined,err=>{console.error('AnjoGuia.glb não carregou:',err);status.textContent='Não foi possível carregar AnjoGuia.glb';});
let questStep=0,coins=0,dialogueOpen=false,dialoguePages=[],dialogueIndex=0,dialogueFinish=null;
function updateQuestHud(){
 const title=document.getElementById('quest-title'),objective=document.getElementById('quest-objective'),coinCount=document.getElementById('coin-count');
 if(title)title.textContent='MISSÃO 1 · O CHAMADO';
 if(objective)objective.textContent=questStep===0?'Encontre o Anjo-Guia':questStep===1?'Siga a trilha até a clareira':questStep===2?'Missão concluída! Explore o vale.':'Explore o vale e procure pistas';
 if(coinCount)coinCount.textContent=String(coins);
}
function showDialogue(pages,onFinish){
 dialoguePages=pages;dialogueIndex=0;dialogueFinish=onFinish||null;dialogueOpen=true;
 document.getElementById('dialog-panel').classList.remove('hidden');
 document.getElementById('dialog-who').textContent=pages[0].who;
 document.getElementById('dialog-text').textContent=pages[0].text;
 document.getElementById('dialog-continue').textContent=pages.length>1?'CONTINUAR':'FECHAR';
}
function advanceDialogue(){
 if(!dialogueOpen)return;
 dialogueIndex++;
 if(dialogueIndex<dialoguePages.length){
  const page=dialoguePages[dialogueIndex];
  document.getElementById('dialog-who').textContent=page.who;
  document.getElementById('dialog-text').textContent=page.text;
  document.getElementById('dialog-continue').textContent=dialogueIndex===dialoguePages.length-1?'FECHAR':'CONTINUAR';
  return;
 }
 dialogueOpen=false;document.getElementById('dialog-panel').classList.add('hidden');
 const finish=dialogueFinish;dialogueFinish=null;if(finish)finish();
}
function talkToGuide(){
 if(questStep!==0||dialogueOpen)return;
 guide.lookAt(player.position.x,guide.position.y,player.position.z);
 showDialogue([
  {who:'Anjo-Guia',text:'Finalmente chegou. Você foi enviado por Deus para enfrentar a escuridão que corrompe estas terras.'},
  {who:'Anjo-Guia',text:'Não tema. Sua jornada começa aqui, mas cada pecado ficará mais forte. Aprenda a lutar e não abandone sua fé.'},
  {who:'Anjo-Guia',text:'Siga a trilha até a clareira à frente. Lá você encontrará seu primeiro desafio. Que Deus guie seus passos.'}
 ],()=>{
  questStep=1;questMarker.position.set(-2.2,.06,-13);updateQuestHud();
  document.getElementById('talk-button').classList.add('hidden');
  status.textContent='Nova etapa: siga a trilha até a clareira';
 });
}
document.getElementById('talk-button').addEventListener('click',talkToGuide);
document.getElementById('dialog-continue').addEventListener('click',advanceDialogue);
updateQuestHud();

let model=null,mixer=null,actions={},activeAction=null,walkName='',attackClips=[],attackClipIndex=0;
const clock=new THREE.Clock();
function chooseClip(clips,regex){return clips.find(c=>regex.test(c.name));}
function clipKey(clip){return String(clip&&clip.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function validAttackClip(clip){
 const n=clipKey(clip);
 if(!n)return false;
 const bad=/hurt|damage|hitreaction|takehit|tomardano|dano|death|dying|dead|^die$|morrer|morte|fall|falling|knockdown|collapse|stumble|caer|queda|idle|breath|rest|standstill|parado|walk|walking|run|running|sprint|locomotion|andar|caminh|getup|standup|rise|recoverfloor|levant|levantar/;
 const good=/attack|slash|swing|strike|sword|melee|atacar|ataque|onehand|twohand/;
 return good.test(n)&&!bad.test(n);
}
function selectDimensionAttack(clips){
 let saved={};try{saved=JSON.parse(localStorage.getItem('protagonistaAnimationRolesV3')||'{}')||{};}catch(e){}
 const validMapped=[];
 ['attack1','attack2'].forEach(role=>{
  const raw=saved[role]===undefined&&role==='attack1'?saved.attack:saved[role];
  const index=Number(raw);
  if(Number.isInteger(index)&&index>=0&&index<clips.length&&validAttackClip(clips[index])&&!validMapped.includes(clips[index]))validMapped.push(clips[index]);
 });
 if(validMapped.length)return validMapped;
 // Mesmo mapeamento determinístico usado na dimensão do Valério.
 const dimensionAttack=clips.find(c=>clipKey(c)==='overhandthrow');
 if(dimensionAttack)return [dimensionAttack];
 // Nunca tratar Hit Knockback, queda ou morte como ataque.
 return clips.filter(validAttackClip);
}
function play(name,fade=.18){const next=actions[name];if(!next||next===activeAction)return;if(activeAction)activeAction.fadeOut(fade);next.reset();next.setLoop(THREE.LoopRepeat,Infinity);next.clampWhenFinished=false;next.fadeIn(fade).play();activeAction=next;}
function playOnce(name,fade=.08){const next=actions[name];if(!next)return false;if(activeAction&&activeAction!==next)activeAction.fadeOut(fade);next.reset();next.enabled=true;next.setEffectiveWeight(1);next.setLoop(THREE.LoopOnce,1);next.clampWhenFinished=true;next.fadeIn(fade).play();activeAction=next;return true;}
function fitModel(root){
 // O GLB original do protagonista já foi validado perto de 1,9 m. Não recalcular escala pela caixa de ossos animados: isso já causou modelos gigantes em rigs anteriores.
 root.scale.set(1,1,1);root.position.set(0,0,0);
}
function findSwordHand(root){
 const bones=[];root.traverse(o=>{if(o.isBone)bones.push(o);});
 const rightHand=/(right.*(hand|wrist)|(hand|wrist).*right|(^|[_ .-])r(hand|wrist)([_ .-]|$)|(hand|wrist)[_. -]?r$|mixamorig:rightHand)/i;
 return bones.find(b=>rightHand.test(b.name||''))||null;
}
let swordRoot=null,swordHand=null,swordPivot=null,swordMount=null,swordWorldPosition=new THREE.Vector3(),swordWorldQuaternion=new THREE.Quaternion();
function updatePlayerSwordMount(){if(!swordHand||!swordMount)return;swordHand.updateWorldMatrix(true,false);swordHand.getWorldPosition(swordWorldPosition);swordHand.getWorldQuaternion(swordWorldQuaternion);swordMount.position.copy(swordWorldPosition);swordMount.quaternion.copy(swordWorldQuaternion);swordMount.scale.set(1,1,1);swordMount.updateMatrixWorld(true);}
function loadPlayerSword(modelRoot){
 const loader=new GLTFLoader();
 loader.load('./EspadaProta.glb?v=mod148-sword-grip',gltf=>{
  swordRoot=gltf.scene;swordRoot.name='EspadaProta_Runtime';
  swordRoot.traverse(o=>{if(o.isMesh){o.visible=true;o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;}});
  swordHand=findSwordHand(modelRoot);
  swordRoot.scale.setScalar(.62);
  // Mesmo encaixe validado na dimensão do Valério: cabo centrado na mão e mount fora da hierarquia escalada do rig.
  swordRoot.rotation.set(0,0,Math.PI);
  swordRoot.position.set(0,.75*.62,0);
  swordPivot=new THREE.Group();swordPivot.name='EspadaProta_AttackPivot';
  if(swordHand){
   swordMount=new THREE.Group();swordMount.name='EspadaProta_HandMount';scene.add(swordMount);
   swordMount.add(swordPivot);swordPivot.add(swordRoot);updatePlayerSwordMount();
  }else{
   // Fallback apenas se o rig não expuser a mão direita.
   swordPivot.position.set(.28,.85,.12);player.add(swordPivot);swordPivot.add(swordRoot);
  }
 },undefined,err=>{console.warn('EspadaProta.glb não carregou:',err);});
}
new GLTFLoader().load('./Protagonista.glb?mod131-main-world',gltf=>{
 model=gltf.scene;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material.side=THREE.FrontSide;}}});
 fitModel(model);player.add(model);
 loadPlayerSword(model);
 if(gltf.animations&&gltf.animations.length){mixer=new THREE.AnimationMixer(model);const clips=gltf.animations;const idle=chooseClip(clips,/idle|breath|respir|parad/i);const walk=chooseClip(clips,/walk|caminh/i);attackClips=selectDimensionAttack(clips);attackClipIndex=0;const jump=chooseClip(clips,/jump|saltar|salto/i);
 if(idle)actions.idle=mixer.clipAction(idle);if(walk){actions.walk=mixer.clipAction(walk);walkName=walk.name;}if(attackClips.length)actions.attack=mixer.clipAction(attackClips[0]);if(jump)actions.jump=mixer.clipAction(jump);play(actions.idle?'idle':actions.walk?'walk':'idle',0);}
 tryTransferEnemyLocomotion();
 player.userData.ready=true;loading.classList.add('hidden');status.textContent='Missão 1 · encontre o Anjo-Guia e fale com ele';
},undefined,err=>{console.error(err);loading.innerHTML='Não foi possível carregar Protagonista.glb.<br>Verifique a conexão e tente novamente.';status.textContent='Falha ao carregar modelo';});
const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault();});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
addEventListener('keydown',e=>{if(!e.repeat&&(e.key==='e'||e.key==='Enter')&&!dialogueOpen&&questStep===0&&Math.hypot(guide.position.x-player.position.x,guide.position.z-player.position.z)<=2.7)talkToGuide();else if(!e.repeat&&(e.key==='e'||e.key==='Enter')&&dialogueOpen)advanceDialogue();});
let joyX=0,joyY=0,joyActive=false;const stick=document.getElementById('stick'),knob=document.getElementById('knob');
function setJoy(e){const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.32;const d=Math.hypot(dx,dy);if(d>max){dx=dx/d*max;dy=dy/d*max;}joyX=dx/max;joyY=dy/max;knob.style.transform='translate('+dx+'px,'+dy+'px)';}
stick.addEventListener('pointerdown',e=>{joyActive=true;stick.setPointerCapture(e.pointerId);setJoy(e);});
stick.addEventListener('pointermove',e=>{if(joyActive)setJoy(e);});
function endJoy(){joyActive=false;joyX=joyY=0;knob.style.transform='translate(0,0)';}
stick.addEventListener('pointerup',endJoy);stick.addEventListener('pointercancel',endJoy);
let actionUntil=0,verticalVelocity=0;const gravity=15,jumpImpulse=5.2;let grounded=true;
let dashRemaining=0,dashCooldownUntil=0,dashDirX=0,dashDirZ=0;
function action(kind){const now=performance.now();if(kind==='dash'){if(now<dashCooldownUntil)return;dashCooldownUntil=now+720;const moveLen=Math.hypot(moveVX,moveVZ);if(moveLen>.35){dashDirX=moveVX/moveLen;dashDirZ=moveVZ/moveLen;}else{dashDirX=Math.sin(playerYaw);dashDirZ=Math.cos(playerYaw);}dashRemaining=.32;if(actions.dash)playOnce('dash',.045);actionUntil=now+360;return;}if(kind==='jump'){if(!grounded)return;grounded=false;verticalVelocity=jumpImpulse;if(actions.jump){playOnce('jump',.08);actionUntil=now+Math.max(320,Math.min(700,actions.jump.getClip().duration*1000));}else{actionUntil=now+180;}return;}if(kind==='attack'){tryPlayerAttack();return;}if(kind==='magic'||kind==='ultimate'){if(actions.attack){play('attack',.08);actionUntil=now+(kind==='ultimate'?1200:650);}status.textContent=kind==='magic'?'Magia celestial será integrada depois':'Ultimate será integrada depois';setTimeout(()=>{if(status.textContent.startsWith('Magia celestial')||status.textContent.startsWith('Ultimate será'))status.textContent='Protagonista 3D carregado · exploração ativa';},1900);}}
document.getElementById('attack').addEventListener('click',()=>action('attack'));
document.getElementById('dash').addEventListener('click',()=>action('dash'));
const jumpButton=document.getElementById('jump');
// pointerdown responde imediatamente ao segundo dedo enquanto o primeiro mantém o joystick.
jumpButton.addEventListener('pointerdown',e=>{e.preventDefault();action('jump');});
document.getElementById('magic').addEventListener('click',()=>action('magic'));document.getElementById('ultimate').addEventListener('click',()=>action('ultimate'));
addEventListener('keydown',e=>{if(e.repeat)return;if(e.key.toLowerCase()==='j'||e.key.toLowerCase()==='x')action('attack');if(e.key===' ')action('jump');if(e.key==='Shift')action('dash');});
let lastMove=0,moveVX=0,moveVZ=0,playerYaw=Math.PI;
let cameraYaw=0,cameraPitch=.16,cameraDistance=8.5;
const lookArea=document.getElementById('look-area');
const lookPointers=new Map();let lastPinchDistance=0;
function pinchDistance(){const pts=Array.from(lookPointers.values());return pts.length<2?0:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);}
lookArea.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();lookPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});try{lookArea.setPointerCapture(e.pointerId);}catch(_){}if(lookPointers.size===2){lastPinchDistance=pinchDistance();return;} });
lookArea.addEventListener('pointermove',e=>{if(!lookPointers.has(e.pointerId))return;const prev=lookPointers.get(e.pointerId);lookPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(lookPointers.size>=2){const d=pinchDistance();if(lastPinchDistance>0&&d>0){cameraDistance=THREE.MathUtils.clamp(cameraDistance+(lastPinchDistance-d)*.025,.08,15); }lastPinchDistance=d;return;}const dx=e.clientX-prev.x,dy=e.clientY-prev.y;const firstPersonLook=cameraDistance<1.05;
const lookSensitivity=firstPersonLook?.0022:.004;
cameraYaw-=dx*lookSensitivity;
cameraPitch=THREE.MathUtils.clamp(cameraPitch+dy*(firstPersonLook?.003:.004),-1.32,1.32);});
function endLook(e){lookPointers.delete(e.pointerId);lastPinchDistance=pinchDistance();}
lookArea.addEventListener('pointerup',endLook);lookArea.addEventListener('pointercancel',endLook);lookArea.addEventListener('lostpointercapture',endLook);
lookArea.addEventListener('wheel',e=>{cameraDistance=THREE.MathUtils.clamp(cameraDistance+e.deltaY*.008,.08,15);},{passive:true});
addEventListener('blur',()=>{lookPointers.clear();lastPinchDistance=0;joyActive=false;joyX=joyY=0;knob.style.transform='translate(0,0)';});

function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04),now=performance.now();if(mixer)mixer.update(dt);if(enemyMixer)enemyMixer.update(dt);
 if(pendingEnemyHitAt&&now>=pendingEnemyHitAt){pendingEnemyHitAt=0;resolvePlayerAttackHit();}
    updatePlayerSwordMount();
 if(enemyHitFlash>0){enemyHitFlash=Math.max(0,enemyHitFlash-dt);setEnemyHitFlash(true);}else setEnemyHitFlash(false);
 if(enemyCurrentRole==='hit'&&enemyCurrentAction&&!enemyCurrentAction.isRunning()&&enemyAlive)playEnemyAnimation('idle',.08);
 if(enemyKnockback>0&&enemyAlive){const step=Math.min(enemyKnockback,dt*2.5);enemy.position.x+=Math.sin(playerYaw)*step;enemy.position.z+=Math.cos(playerYaw)*step;enemyKnockback-=step;}
 if(!enemyAlive&&!enemyHasDeathClip){enemy.rotation.z=THREE.MathUtils.lerp(enemy.rotation.z,-1.35,1-Math.exp(-5*dt));enemy.position.y=Math.max(-.55,enemy.position.y-dt*1.3);enemy.scale.multiplyScalar(Math.max(.001,1-dt*.65));}
 updateEnemyHud();
 if(enemyAlive)enemy.rotation.y=Math.atan2(camera.position.x-enemy.position.x,camera.position.z-enemy.position.z);
 guide.position.y=.008+Math.sin(now*.0022)*.006;guideAura.intensity=.4+Math.sin(now*.003)*.06;
 const npcDistance=Math.hypot(guide.position.x-player.position.x,guide.position.z-player.position.z);
 const talkButton=document.getElementById('talk-button');
 if(talkButton)talkButton.classList.toggle('hidden',questStep!==0||npcDistance>2.7||dialogueOpen);
 questMarker.visible=questStep<2;
 if(questStep===0){questMarker.position.x=guide.position.x;questMarker.position.z=guide.position.z;}
 if(questStep===1&&Math.hypot(player.position.x+2.2,player.position.z+13)<2.15){
  questStep=2;coins+=5;updateQuestHud();questMarker.visible=false;status.textContent='Missão concluída! +5 moedas';document.getElementById('quest-toast').classList.remove('hidden');
  setTimeout(()=>document.getElementById('quest-toast').classList.add('hidden'),2600);
 }
 if(dialogueOpen&&actions.idle&&now>actionUntil)play('idle',.08);
let axisX=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joyX;
let axisZ=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+joyY;
if(dialogueOpen){axisX=0;axisZ=0;}
let len=Math.hypot(axisX,axisZ);if(len>1){axisX/=len;axisZ/=len;len=1;}
// Mesmo princípio da dimensão do Valério: o joystick é relativo à orientação da câmera,
// com zona morta analógica e aceleração/desaceleração suaves, em vez de deslocar o modelo instantaneamente.
const dead=.12;if(len<dead){axisX=0;axisZ=0;}else{const power=(len-dead)/(1-dead);axisX=axisX/len*power;axisZ=axisZ/len*power;}
const worldX=axisX*Math.cos(cameraYaw)+axisZ*Math.sin(cameraYaw);
const worldZ=-axisX*Math.sin(cameraYaw)+axisZ*Math.cos(cameraYaw);
const speed=4.3,targetVX=worldX*speed,targetVZ=worldZ*speed;
const currentSpeed=Math.hypot(moveVX,moveVZ),targetSpeed=Math.hypot(targetVX,targetVZ);
let response;
if(targetSpeed<.001){
 // Replica a desaceleração de chão do jogo principal: solta o analógico sem patinar.
 response=16;
}else if(currentSpeed>.08&&
 (moveVX*targetVX+moveVZ*targetVZ)/(currentSpeed*targetSpeed)<.82){
 // Ao inverter a direção, conserva um pouco da inércia como na dimensão do Valério.
 response=7.5;
}else{
 response=10;
}
const blend=1-Math.exp(-response*dt);
moveVX+=(targetVX-moveVX)*blend;moveVZ+=(targetVZ-moveVZ)*blend;
if(Math.abs(moveVX)<.015)moveVX=0;if(Math.abs(moveVZ)<.015)moveVZ=0;
const moving=Math.hypot(moveVX,moveVZ)>.12;
function blockedAt(x,z){
 for(const o of treeObstacles){const dx=x-o.x,dz=z-o.z;if(dx*dx+dz*dz<o.radius*o.radius)return true;}
 return false;
}
function terrainHeightAt(x,z){
 let height=0;
 for(const rock of rockObstacles){const d=Math.hypot(x-rock.x,z-rock.z);if(d<rock.radius){const t=1-d/rock.radius;const smooth=t*t*(3-2*t);height=Math.max(height,rock.height*smooth);}}
 return height;
}
// As pedras deixam de ser paredes invisíveis: o jogador atravessa sua projeção e o chão sobe suavemente sobre elas.\n// Movimento horizontal permanece disponível durante o pulo.
if(dashRemaining>0){
 const dashDt=Math.min(dt,dashRemaining);const nextX=THREE.MathUtils.clamp(player.position.x+dashDirX*12.5*dashDt,-38,38);const nextZ=THREE.MathUtils.clamp(player.position.z+dashDirZ*12.5*dashDt,-72,14);
 if(!blockedAt(nextX,player.position.z))player.position.x=nextX;
 if(!blockedAt(player.position.x,nextZ))player.position.z=nextZ;
 playerYaw=Math.atan2(dashDirX,dashDirZ);player.rotation.y=playerYaw;dashRemaining=Math.max(0,dashRemaining-dt);
}else if(moving){
 const nextX=THREE.MathUtils.clamp(player.position.x+moveVX*dt,-38,38);
 const nextZ=THREE.MathUtils.clamp(player.position.z+moveVZ*dt,-72,14);
 // Testa cada eixo separadamente para o jogador conseguir deslizar junto à árvore/pedra.
 if(!blockedAt(nextX,player.position.z))player.position.x=nextX;else moveVX=0;
 if(!blockedAt(player.position.x,nextZ))player.position.z=nextZ;else moveVZ=0;
 const wantedYaw=Math.atan2(moveVX,moveVZ);
 const yawDelta=Math.atan2(Math.sin(wantedYaw-playerYaw),Math.cos(wantedYaw-playerYaw));
 playerYaw+=yawDelta*(1-Math.exp(-12*dt));player.rotation.y=playerYaw;
 if(grounded&&now>actionUntil&&actions.walk){play('walk');const walkAction=actions.walk;if(walkAction)walkAction.setEffectiveTimeScale(THREE.MathUtils.clamp(Math.hypot(moveVX,moveVZ)/3.4,.55,1.45));}
}else if(grounded&&now>actionUntil&&actions.idle)play('idle');
// Física vertical com altura do terreno: o personagem pode subir e descer pelas pedras.
const floorY=terrainHeightAt(player.position.x,player.position.z);
if(!grounded){
 verticalVelocity-=gravity*dt;
 player.position.y+=verticalVelocity*dt;
 if(player.position.y<=floorY){player.position.y=floorY;verticalVelocity=0;grounded=true;}
}else{
 player.position.y=floorY;
}
const firstPerson=cameraDistance<1.05;if(model)model.visible=!firstPerson;const target=new THREE.Vector3(player.position.x,player.position.y+(firstPerson?1.52:1.15),player.position.z);
if(firstPerson){
 // Câmera na altura dos olhos, com direção própria em primeira pessoa.
 camera.position.lerp(target,1-Math.exp(-14*dt));
 const cp=Math.cos(cameraPitch),lookDir=new THREE.Vector3(-Math.sin(cameraYaw)*cp,-Math.sin(cameraPitch),-Math.cos(cameraYaw)*cp);
 camera.lookAt(camera.position.clone().add(lookDir.multiplyScalar(12)));
}else{
 const camOffset=new THREE.Vector3(Math.sin(cameraYaw)*cameraDistance*Math.cos(cameraPitch),cameraDistance*Math.sin(cameraPitch),Math.cos(cameraYaw)*cameraDistance*Math.cos(cameraPitch));
 const desired=target.clone().add(camOffset);
 camera.position.lerp(desired,1-Math.exp(-8*dt));camera.lookAt(target);
}
const t=clock.elapsedTime;treeGroup.children.forEach((tree,i)=>{tree.rotation.z=Math.sin(t*.7+i*.9)*.012;});grassGroup.children.forEach((blade,i)=>{blade.rotation.z=Math.sin(t*1.4+i*.31)*.12;});
// A espada acompanha diretamente o osso da mão; o golpe vem do clipe de animação do personagem, sem balanço artificial por código.
renderer.render(scene,camera);}
animate();
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);}
addEventListener('resize',resize);
