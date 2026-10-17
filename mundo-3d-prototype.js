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
 if(gltf.animations&&gltf.animations.length){mixer=new THREE.AnimationMixer(model);const clips=gltf.animations;const idle=chooseClip(clips,/idle|breath|respir|parad/i);const walk=chooseClip(clips,/walk|caminh/i);const attack=chooseClip(clips,/attack|hit|throw|sword|golpe/i);const jump=chooseClip(clips,/jump|air|kip|fall|cair/i);
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
let actionUntil=0,hop=0;
function action(kind){const now=performance.now();if(kind==='jump'){hop=.34;if(actions.jump){play('jump',.08);actionUntil=now+650;}return;}if(kind==='attack'||kind==='magic'||kind==='ultimate'){if(actions.attack){play('attack',.08);actionUntil=now+(kind==='ultimate'?1200:650);}status.textContent=kind==='attack'?'Golpe demonstrativo · combate ainda será integrado':kind==='magic'?'Magia será conectada ao sistema celestial':'Ultimate será conectada ao sistema celestial';setTimeout(()=>{if(status.textContent.startsWith('Golpe demonstrativo')||status.textContent.startsWith('Magia será')||status.textContent.startsWith('Ultimate será'))status.textContent='Protagonista 3D carregado · exploração ativa';},1900);}}
document.getElementById('attack').addEventListener('click',()=>action('attack'));document.getElementById('jump').addEventListener('click',()=>action('jump'));document.getElementById('magic').addEventListener('click',()=>action('magic'));document.getElementById('ultimate').addEventListener('click',()=>action('ultimate'));
addEventListener('keydown',e=>{if(e.repeat)return;if(e.key.toLowerCase()==='j'||e.key.toLowerCase()==='x')action('attack');if(e.key===' ')action('jump');});
let lastMove=0;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04),now=performance.now();if(mixer)mixer.update(dt);
let x=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joyX;let z=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+joyY;const len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}
const moving=len>.12&&now>actionUntil;
if(moving){const speed=4.3;player.position.x+=x*speed*dt;player.position.z+=z*speed*dt;player.position.x=THREE.MathUtils.clamp(player.position.x,-38,38);player.position.z=THREE.MathUtils.clamp(player.position.z,-72,14);player.rotation.y=Math.atan2(x,z);cameraYaw=THREE.MathUtils.lerp(cameraYaw,player.rotation.y+Math.PI,.04);if(actions.walk)play('walk');}
else if(now>actionUntil&&actions.idle)play('idle');
if(hop>0){hop-=dt;player.position.y=Math.max(0,Math.sin((.34-hop)/.34*Math.PI)*.75);}else player.position.y=0;
const target=new THREE.Vector3(player.position.x,player.position.y+1.15,player.position.z);
const camOffset=new THREE.Vector3(Math.sin(cameraYaw)*cameraDistance*Math.cos(cameraPitch),cameraDistance*Math.sin(cameraPitch),Math.cos(cameraYaw)*cameraDistance*Math.cos(cameraPitch));
const desired=target.clone().add(camOffset);
camera.position.lerp(desired,1-Math.exp(-8*dt));camera.lookAt(target);
const t=clock.elapsedTime;treeGroup.children.forEach((tree,i)=>{tree.rotation.z=Math.sin(t*.7+i*.9)*.012;});grassGroup.children.forEach((blade,i)=>{blade.rotation.z=Math.sin(t*1.4+i*.31)*.12;});
renderer.render(scene,camera);}
animate();
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);}
addEventListener('resize',resize);
