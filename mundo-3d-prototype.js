import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
// Inimigo comum: usa a arte real do território 1 do jogo 2D, como billboard no mundo 3D.
const enemy=new THREE.Group();scene.add(enemy);enemy.position.set(0,0,-3.2);
const enemyTexture=new THREE.TextureLoader().load('./Enemy1-sprite.png');
enemyTexture.colorSpace=THREE.SRGBColorSpace;
const enemySpriteMaterial=new THREE.MeshStandardMaterial({map:enemyTexture,transparent:true,alphaTest:.06,side:THREE.DoubleSide,roughness:1,emissive:0x000000});
const enemyMaterials=[enemySpriteMaterial];
const enemySprite=new THREE.Mesh(new THREE.PlaneGeometry(1.55,1.95),enemySpriteMaterial);
enemySprite.position.y=.98;enemySprite.castShadow=true;enemy.add(enemySprite);
const enemyGroundShadow=new THREE.Mesh(new THREE.CircleGeometry(.48,20),new THREE.MeshBasicMaterial({color:0x142019,transparent:true,opacity:.35,depthWrite:false}));
enemyGroundShadow.rotation.x=-Math.PI/2;enemyGroundShadow.position.y=.012;enemy.add(enemyGroundShadow);
let enemyHP=100,enemyAlive=true,enemyHitFlash=0,enemyKnockback=0,attackCooldown=0;
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
 const now=performance.now();if(now<attackCooldown)return;attackCooldown=now+520;
 swordSwingStart=now;swordSwingUntil=now+460;
 if(actions.attack){play('attack',.045);actionUntil=now+460;}else{actionUntil=now+460;}
 if(!enemyAlive){status.textContent='Inimigo derrotado!';return;}
 const dx=enemy.position.x-player.position.x,dz=enemy.position.z-player.position.z;
 const distance=Math.hypot(dx,dz);
 const forwardX=Math.sin(playerYaw),forwardZ=Math.cos(playerYaw);
 const facing=(dx*forwardX+dz*forwardZ)/(distance||1);
 if(distance>2.35||facing<.25){
  status.textContent=distance>2.35?'Chegue mais perto para acertar o golpe':'Vire-se para o inimigo e ataque';
  return;
 }
 enemyHP=Math.max(0,enemyHP-25);enemyHitFlash=.2;enemyKnockback=.42;
 status.textContent=enemyHP===0?'Inimigo derrotado!':'Acertou! Vida do inimigo: '+enemyHP+'%';
 if(enemyHP===0){enemyAlive=false;document.getElementById('enemy-hud').style.display='none';}
}

// Anjo-Guia: personagem 3D dentro do mundo, substituindo o NPC provisório.
const guide=new THREE.Group();scene.add(guide);guide.position.set(3.3,0,-5.4);
const robeMat=new THREE.MeshStandardMaterial({color:0xe8e7dc,roughness:.82});
const cloakMat=new THREE.MeshStandardMaterial({color:0x334e79,roughness:.9});
const goldMat=new THREE.MeshStandardMaterial({color:0xf2cf72,metalness:.42,roughness:.38,emissive:0x4a2d08,emissiveIntensity:.16});
const skinMat=new THREE.MeshStandardMaterial({color:0xd9b59b,roughness:.9});
const darkMat=new THREE.MeshStandardMaterial({color:0x182235,roughness:.9});
function guidePart(geometry,material,x,y,z,sx=1,sy=1,sz=1){
 const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;guide.add(mesh);return mesh;
}
// Túnica longa e manto azul; silhueta low-poly inteiramente 3D.
guidePart(new THREE.CylinderGeometry(.19,.42,.98,9,1),robeMat,0,.64,0);
guidePart(new THREE.CylinderGeometry(.205,.31,.72,9,1),cloakMat,0,.91,-.105);
guidePart(new THREE.SphereGeometry(.205,12,10),skinMat,0,1.31,.035,1,.96,.88);
guidePart(new THREE.SphereGeometry(.255,12,10),cloakMat,0,1.42,-.025,1,.95,.9);
guidePart(new THREE.ConeGeometry(.27,.38,9),cloakMat,0,1.62,-.015);
guidePart(new THREE.TorusGeometry(.25,.035,8,24),goldMat,0,1.42,.025,1,1,.85).rotation.x=Math.PI/2;
guidePart(new THREE.BoxGeometry(.42,.055,.055),goldMat,0,.9,.235);
guidePart(new THREE.SphereGeometry(.035,8,6),goldMat,-.07,1.32,.211);
guidePart(new THREE.SphereGeometry(.035,8,6),goldMat,.07,1.32,.211);
const guideArms=[];
for(const side of [-1,1]){
 const arm=guidePart(new THREE.CapsuleGeometry(.075,.39,4,7),cloakMat,side*.29,.83,.015);
 arm.rotation.z=side*-.27;guideArms.push(arm);
 guidePart(new THREE.SphereGeometry(.085,8,6),robeMat,side*.34,.61,.04);
}
const guideHalo=new THREE.Mesh(new THREE.TorusGeometry(.29,.035,8,32),new THREE.MeshBasicMaterial({color:0xffe5a0}));
guideHalo.position.set(0,1.93,-.015);guideHalo.rotation.x=Math.PI/2;guide.add(guideHalo);
const guideAura=new THREE.PointLight(0xffe6a3,.85,4.5);guideAura.position.set(0,1.45,.15);guide.add(guideAura);
const guideShadow=new THREE.Mesh(new THREE.CircleGeometry(.42,20),new THREE.MeshBasicMaterial({color:0x142019,transparent:true,opacity:.28,depthWrite:false}));
guideShadow.rotation.x=-Math.PI/2;guideShadow.position.y=.014;guide.add(guideShadow);
const questMarker=new THREE.Mesh(new THREE.TorusGeometry(.58,.055,8,28),new THREE.MeshBasicMaterial({color:0xffd65a}));
questMarker.rotation.x=Math.PI/2;questMarker.position.set(guide.position.x,.06,guide.position.z);scene.add(questMarker);
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

let model=null,mixer=null,actions={},activeAction=null,walkName='';
const clock=new THREE.Clock();
function chooseClip(clips,regex){return clips.find(c=>regex.test(c.name));}
function play(name,fade=.18){const next=actions[name];if(!next||next===activeAction)return;if(activeAction)activeAction.fadeOut(fade);next.reset().fadeIn(fade).play();activeAction=next;}
function fitModel(root){
 // O GLB original do protagonista já foi validado perto de 1,9 m. Não recalcular escala pela caixa de ossos animados: isso já causou modelos gigantes em rigs anteriores.
 root.scale.set(1,1,1);root.position.set(0,0,0);
}
function findSwordHand(root){
 const bones=[];root.traverse(o=>{if(o.isBone)bones.push(o);});
 const rightHand=/(right.*(hand|wrist)|(hand|wrist).*right|(^|[_ .-])r(hand|wrist)([_ .-]|$)|(hand|wrist)[_. -]?r$|mixamorig:rightHand)/i;
 return bones.find(b=>rightHand.test(b.name||''))||null;
}
let swordRoot=null,swordHand=null,swordMount=null,swordPivot=null;
const swordWorldPosition=new THREE.Vector3(),swordWorldQuaternion=new THREE.Quaternion();
function updateSwordMount(){
 if(!swordHand||!swordMount)return;
 swordHand.updateWorldMatrix(true,false);swordHand.getWorldPosition(swordWorldPosition);swordHand.getWorldQuaternion(swordWorldQuaternion);
 swordMount.position.copy(swordWorldPosition);swordMount.quaternion.copy(swordWorldQuaternion);swordMount.scale.set(1,1,1);swordMount.updateMatrixWorld(true);
}
function loadPlayerSword(modelRoot){
 const loader=new GLTFLoader();
 loader.load('./EspadaProta.glb?v=espada-prota-hand-mount-mod33-tex1',gltf=>{
  swordRoot=gltf.scene;swordRoot.name='EspadaProta_Runtime';
  swordRoot.traverse(o=>{if(o.isMesh){o.visible=true;o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;}});
  swordHand=findSwordHand(modelRoot);
  swordRoot.scale.setScalar(.62);swordRoot.rotation.set(0,0,Math.PI);swordRoot.position.set(0,.465,0);
  if(swordHand){
   swordMount=new THREE.Group();swordMount.name='EspadaProta_HandMount';scene.add(swordMount);
   swordMount.add(swordPivot=new THREE.Group());swordPivot.name='EspadaProta_AttackPivot';swordPivot.add(swordRoot);updateSwordMount();
  }else{
   // Segurança: se o rig usar um nome de mão diferente, mantém a espada junto do protagonista.
   swordRoot.position.set(.28,.85,.12);player.add(swordRoot);
  }
 },undefined,err=>{console.warn('EspadaProta.glb não carregou:',err);});
}
new GLTFLoader().load('./Protagonista.glb?mod131-main-world',gltf=>{
 model=gltf.scene;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material.side=THREE.FrontSide;}}});
 fitModel(model);player.add(model);
 loadPlayerSword(model);
 if(gltf.animations&&gltf.animations.length){mixer=new THREE.AnimationMixer(model);const clips=gltf.animations;const idle=chooseClip(clips,/idle|breath|respir|parad/i);const walk=chooseClip(clips,/walk|caminh/i);const attack=chooseClip(clips,/attack|sword|golpe|ataque|slash|strike|light.?combo|heavy.?combo|overhand.?throw/i);const jump=chooseClip(clips,/jump|saltar|salto/i);
 if(idle)actions.idle=mixer.clipAction(idle);if(walk){actions.walk=mixer.clipAction(walk);walkName=walk.name;}if(attack)actions.attack=mixer.clipAction(attack);if(jump)actions.jump=mixer.clipAction(jump);play(actions.idle?'idle':actions.walk?'walk':'attack',0);}
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
let actionUntil=0,verticalVelocity=0,swordSwingUntil=0,swordSwingStart=0;const gravity=15,jumpImpulse=5.2;let grounded=true;
function action(kind){const now=performance.now();if(kind==='jump'){if(!grounded)return;grounded=false;verticalVelocity=jumpImpulse;if(actions.jump){play('jump',.08);actionUntil=now+420;}else{actionUntil=now+180;}return;}if(kind==='attack'){tryPlayerAttack();return;}if(kind==='magic'||kind==='ultimate'){if(actions.attack){play('attack',.08);actionUntil=now+(kind==='ultimate'?1200:650);}status.textContent=kind==='magic'?'Magia celestial será integrada depois':'Ultimate será integrada depois';setTimeout(()=>{if(status.textContent.startsWith('Magia celestial')||status.textContent.startsWith('Ultimate será'))status.textContent='Protagonista 3D carregado · exploração ativa';},1900);}}
document.getElementById('attack').addEventListener('click',()=>action('attack'));
const jumpButton=document.getElementById('jump');
// pointerdown responde imediatamente ao segundo dedo enquanto o primeiro mantém o joystick.
jumpButton.addEventListener('pointerdown',e=>{e.preventDefault();action('jump');});
document.getElementById('magic').addEventListener('click',()=>action('magic'));document.getElementById('ultimate').addEventListener('click',()=>action('ultimate'));
addEventListener('keydown',e=>{if(e.repeat)return;if(e.key.toLowerCase()==='j'||e.key.toLowerCase()==='x')action('attack');if(e.key===' ')action('jump');});
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

function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04),now=performance.now();if(mixer)mixer.update(dt);
 if(enemyHitFlash>0){enemyHitFlash=Math.max(0,enemyHitFlash-dt);enemyMaterials[0].emissive.setHex(0x8b2417);enemyMaterials[0].emissiveIntensity=1.1;}else{enemyMaterials[0].emissive.setHex(0x000000);enemyMaterials[0].emissiveIntensity=0;}
 if(enemyKnockback>0&&enemyAlive){const step=Math.min(enemyKnockback,dt*2.5);enemy.position.x+=Math.sin(playerYaw)*step;enemy.position.z+=Math.cos(playerYaw)*step;enemyKnockback-=step;}
 if(!enemyAlive){enemy.rotation.z=THREE.MathUtils.lerp(enemy.rotation.z,-1.35,1-Math.exp(-5*dt));enemy.position.y=Math.max(-.55,enemy.position.y-dt*1.3);enemy.scale.multiplyScalar(Math.max(.001,1-dt*.65));}
 updateEnemyHud();
 if(enemyAlive)enemy.rotation.y=Math.atan2(camera.position.x-enemy.position.x,camera.position.z-enemy.position.z);
 guide.position.y=.018+Math.sin(now*.0022)*.025;guideHalo.rotation.z=Math.sin(now*.0015)*.08;guideAura.intensity=.72+Math.sin(now*.003)*.13;
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
if(moving){
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
if(swordHand&&swordMount){player.updateMatrixWorld(true);updateSwordMount();}
if(swordPivot){if(now<swordSwingUntil){const p=THREE.MathUtils.clamp((now-swordSwingStart)/460,0,1);const arc=Math.sin(p*Math.PI);swordPivot.rotation.set(-.35-arc*.65,Math.sin(p*Math.PI*2)*.45,-.25-arc*1.7);swordPivot.position.set(0,0,0);}else{swordPivot.rotation.x=THREE.MathUtils.damp(swordPivot.rotation.x,0,18,dt);swordPivot.rotation.y=THREE.MathUtils.damp(swordPivot.rotation.y,0,18,dt);swordPivot.rotation.z=THREE.MathUtils.damp(swordPivot.rotation.z,0,18,dt);}}
renderer.render(scene,camera);}
animate();
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);}
addEventListener('resize',resize);
