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
function makeTree(x,z,s=1){const g=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.16*s,.32*s,2.6*s,7),barkMat);trunk.position.y=1.3*s;trunk.castShadow=true;g.add(trunk);
for(let j=0;j<3;j++){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry((1.05-j*.12)*s,1),j===1?leafLight:leafMat);crown.position.set((Math.random()-.5)*.25*s,(2.25+j*.62)*s,(Math.random()-.5)*.25*s);crown.scale.set(1,.9,1);crown.castShadow=true;g.add(crown);}
g.position.set(x,0,z);treeGroup.add(g);return g;}
let seed=9137;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
for(let i=0;i<100;i++){let x=(rand()-.5)*90,z=-8-rand()*82;if(Math.abs(x)<5&&z>-48)continue;makeTree(x,z,.7+rand()*1.2);}
for(let i=0;i<32;i++){const r=new THREE.Mesh(new THREE.DodecahedronGeometry(.4+rand()*1.15,0),rockMat);r.position.set((rand()-.5)*42,.15,-5-rand()*65);r.scale.y=.5+rand()*.6;r.rotation.set(rand(),rand()*3,rand());r.castShadow=true;r.receiveShadow=true;scene.add(r);}
const grassGroup=new THREE.Group();scene.add(grassGroup);
for(let i=0;i<180;i++){const x=(rand()-.5)*58,z=-3-rand()*55;if(Math.abs(x)<3&&z>-48)continue;const h=.12+rand()*.3;const blade=new THREE.Mesh(new THREE.ConeGeometry(.055,h,3),i%3?leafLight:leafMat);blade.position.set(x,h/2,z);blade.rotation.z=(rand()-.5)*.55;grassGroup.add(blade);}
const player=new THREE.Group();scene.add(player);player.position.set(0,0,4);
let model=null,mixer=null,actions={},activeAction=null,walkName='';
const clock=new THREE.Clock();
function chooseClip(clips,regex){return clips.find(c=>regex.test(c.name));}
function play(name,fade=.18){const next=actions[name];if(!next||next===activeAction)return;if(activeAction)activeAction.fadeOut(fade);next.reset().fadeIn(fade).play();activeAction=next;}
function fitModel(root){
 // O GLB original do protagonista já foi validado perto de 1,9 m. Não recalcular escala pela caixa de ossos animados: isso já causou modelos gigantes em rigs anteriores.
 root.scale.set(1,1,1);root.position.set(0,0,0);
}
new GLTFLoader().load('./Protagonista.glb?mod131-main-world',gltf=>{
 model=gltf.scene;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material.side=THREE.FrontSide;}}});
 fitModel(model);player.add(model);
 if(gltf.animations&&gltf.animations.length){mixer=new THREE.AnimationMixer(model);const clips=gltf.animations;const idle=chooseClip(clips,/idle|breath|respir|parad/i);const walk=chooseClip(clips,/walk|caminh/i);const attack=chooseClip(clips,/attack|sword|golpe|ataque/i);const jump=chooseClip(clips,/jump|saltar|salto/i);
 if(idle)actions.idle=mixer.clipAction(idle);if(walk){actions.walk=mixer.clipAction(walk);walkName=walk.name;}if(attack)actions.attack=mixer.clipAction(attack);if(jump)actions.jump=mixer.clipAction(jump);play(actions.idle?'idle':actions.walk?'walk':'attack',0);}
 player.userData.ready=true;loading.classList.add('hidden');status.textContent='Protagonista 3D carregado · exploração ativa';
},undefined,err=>{console.error(err);loading.innerHTML='Não foi possível carregar Protagonista.glb.<br>Verifique a conexão e tente novamente.';status.textContent='Falha ao carregar modelo';});
const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault();});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
let joyX=0,joyY=0,joyActive=false;const stick=document.getElementById('stick'),knob=document.getElementById('knob');
function setJoy(e){const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.32;const d=Math.hypot(dx,dy);if(d>max){dx=dx/d*max;dy=dy/d*max;}joyX=dx/max;joyY=dy/max;knob.style.transform='translate('+dx+'px,'+dy+'px)';}
stick.addEventListener('pointerdown',e=>{joyActive=true;stick.setPointerCapture(e.pointerId);setJoy(e);});
stick.addEventListener('pointermove',e=>{if(joyActive)setJoy(e);});
function endJoy(){joyActive=false;joyX=joyY=0;knob.style.transform='translate(0,0)';}
stick.addEventListener('pointerup',endJoy);stick.addEventListener('pointercancel',endJoy);
let actionUntil=0,verticalVelocity=0;const gravity=15,jumpImpulse=5.2;let grounded=true;
function action(kind){const now=performance.now();if(kind==='jump'){if(!grounded)return;grounded=false;verticalVelocity=jumpImpulse;if(actions.jump){play('jump',.08);actionUntil=now+420;}else{actionUntil=now+180;}return;}if(kind==='attack'||kind==='magic'||kind==='ultimate'){if(actions.attack){play('attack',.08);actionUntil=now+(kind==='ultimate'?1200:650);}status.textContent=kind==='attack'?'Golpe demonstrativo · combate ainda será integrado':kind==='magic'?'Magia será conectada ao sistema celestial':'Ultimate será conectada ao sistema celestial';setTimeout(()=>{if(status.textContent.startsWith('Golpe demonstrativo')||status.textContent.startsWith('Magia será')||status.textContent.startsWith('Ultimate será'))status.textContent='Protagonista 3D carregado · exploração ativa';},1900);}}
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
let axisX=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joyX;
let axisZ=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+joyY;
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
// Movimento horizontal permanece disponível durante o pulo.
if(moving){
 player.position.x+=moveVX*dt;player.position.z+=moveVZ*dt;
 player.position.x=THREE.MathUtils.clamp(player.position.x,-38,38);player.position.z=THREE.MathUtils.clamp(player.position.z,-72,14);
 const wantedYaw=Math.atan2(moveVX,moveVZ);
 const yawDelta=Math.atan2(Math.sin(wantedYaw-playerYaw),Math.cos(wantedYaw-playerYaw));
 playerYaw+=yawDelta*(1-Math.exp(-12*dt));player.rotation.y=playerYaw;
 if(grounded&&now>actionUntil&&actions.walk){play('walk');const walkAction=actions.walk;if(walkAction)walkAction.setEffectiveTimeScale(THREE.MathUtils.clamp(Math.hypot(moveVX,moveVZ)/3.4,.55,1.45));}
}else if(grounded&&now>actionUntil&&actions.idle)play('idle');
// Física vertical: impulso, gravidade e aterrissagem no plano do chão.
if(!grounded){
 verticalVelocity-=gravity*dt;
 player.position.y+=verticalVelocity*dt;
 if(player.position.y<=0){player.position.y=0;verticalVelocity=0;grounded=true;}
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
renderer.render(scene,camera);}
animate();
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);}
addEventListener('resize',resize);
