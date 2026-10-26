import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned, retargetClip } from 'three/addons/utils/SkeletonUtils.js';
import { SKILLS, SKILL_ORDER, MANA, unlockedSkills, newlyUnlocked, canCast, regenMana, manaFromHit, cooldownFraction } from './skills3d.js';
import { createWorldAudio } from './audio3d.js';
import { showGalaxyScreen } from './galaxies3d.js';
import { iconSvg } from './shop-icons3d.js';
import { DIMENSIONS, dimensionForProfile, arenaSpec, vsCard, arenaSpots } from './dimensions3d.js';
import { buildDimensionArena, buildDimensionPortal } from './dimension-arenas3d.js';
import { createDirector, heavenScene, awakeningScene, MISSION_ACT1 } from './prologue-flow.js';
import { SIDE_QUESTS, createSideState, refreshSide, acceptSide, collectSide, turnInSide, questForGiver, activeSideLines } from './sidequests3d.js';
import { HEARTS, normalizeHearts, tickHearts, loseHeart, msToNextHeart, canChallengeBishop, formatTimer } from './hearts3d.js';
import { levelFromXp, levelProgress, statsForLevel, XP_REWARDS, SHOP_SECTORS, SHOP_ITEMS, SWORDS, shopStatus, buyItem, ACHIEVEMENTS, achievementState, BESTIARY, bestiaryEntry } from './progression3d.js';
import { MAP_STORE_KEY, MAP_BOUNDS, FOG_CELLS, MAP_POIS, WAYSTONES, createMapState, serializeMapState, revealAround, isRevealed, discoverPois, canFastTravel } from './map3d.js';
import { ACT2, DISTRICT, DISTRICT_PASS, PASS_RADIUS, DISTRICT_SPOTS, DISTRICT_CANAL, act2Presentation, act2Started, afterVorgazhek, bossPhase, vorgazhekRageLine, SPEAKERS2, cityArrivalScene, banditScene, rivalScene, rivalDefeatScene, gateScene, gateDefeatScene, labScene, keyScene, goldScene, hallScene, hallDefeatScene, throneScene, minibossDefeatScene, vorgazhekIntroScene, vorgazhekDefeatScene, afterVorgazhekScene } from './act2-flow.js';
import { VOLCANO, volcanoWalkable, volcanoCheckpoint } from './volcano3d.js';
import { ACT6N, REMATCH, GREED_FORMS, SPEAKERS6, act6Presentation, isAct6Step, nextRematch, greedReward, desertArrivalScene, statueScene, closedPortalScene, mysteryPortalScene, rematchIntroScene, rematchOutroScene, returnStatueScene, greedIntroScene, greedPhase2Scene, greedPhase3Scene, greedFallScene, epilogueScene } from './act6-flow.js';
import { ULTIMATES, ultimateDue, ultimateFor } from './ultimates3d.js';
import { kitFor, powerStats, pickMove, tierOf } from './powers3d.js';
import { DESERT_REGION, DESERT_PASS, DESERT, inDesert, fragmentsHeld } from './desert3d.js';
import { ACT5N, ROUNDS, SPEAKERS5, roundForSub, subForRound, act5Presentation, bestSword, journeyScene, arrivalScene, roundIntroScene, roundOutroScene, finalScene } from './act5-flow.js';
import { COLOSSEUM_REGION, COLOSSEUM_PASS, COLOSSEUM, colosseumColliders, inArena } from './coliseum3d.js';
import { ACT4N, FLOORS, SPEAKERS4, act4Presentation, isAct4Step, floorFoes, nextFloor, scrollMultiplier, afterVeraxion, banditScene4, rivalReturnScene, towerViewScene, floorIntroScene, floorClearScene, restScene, leaderDefeatScene, veraxionIntroScene, veraxionDefeatScene, towerFallScene, rivalRevealScene } from './act4-flow.js';
import { TOWER, TOWER_HALL, towerWalkable, floorTint } from './tower3d.js';
import { ACT3N, SPEAKERS3, act3Presentation, isAct3Step, buyCoat, afterZarkhael, coatOfferScene, coatAcceptScene, coatRefuseScene, coatNoMoneyScene, COLD_LINE, snowArrivalScene, fisherScene, villagerScene, innScene, bedScene, cellarScene, cellarDefeatScene, raidScene, guillotineScene, caveArrivalScene, caveEndScene, distortedScene, distortedDefeatScene, zarkhaelIntroScene, zarkhaelDefeatScene, angelQuestionScene, angelTruthScene } from './act3-flow.js';
import { SNOW_CITY, inSnowCity, INN, innWalkable, ICE_CAVE, iceCaveWalkable, DISTORTED, distortedWalkable, COAT, climate } from './snow3d.js';
import { ACT3, ACT4, LATE_ACTS, EXTRA_REGIONS, EXTRA_PASSES, ALTAR_VALLEY, SERRA, stepDef, latePresentation, lateActFor, collectItem, bossRewardOnce, COLISEUM, coliseumPayout } from './acts34-flow.js';
import { FINALE, FINAL_PORTAL, VOID, GAUNTLET, SIN_FORMS, finaleTalkLines, gauntletIntroLines, sinIntroLines, epilogueLines, finaleAfterDeath, nextGauntlet, nextSinForm, finaleReward } from './finale-flow.js';
import { createTerrain, buildTerrainArrays, colorTerrain, scatterForest, fbm } from './world3d-terrain.js';
import { ACT1, SPEAKERS, sanitizePlayerName, migrateProgress, questPresentation, afterEnemyDefeated, afterWardenDefeat, valerioHandoffPlan, afterValerioVictory, personalizeLine, villageArrivalScene, vendorRefusalScene, vendorScene, forestFirstScene, forestSecondScene, keyFoundScene, cageScene, faintScene, massacreScene, clueScene, feedingScene, holeScene, wardenIntroScene, wardenDefeatScene, valerioIntroScene, valerioDefeatScene, afterValerioScene } from './act1-flow.js';
import { SEWER, sewerWalkable, sewerCheckpoint, sewerZone } from './sewer3d.js';

const worldAudio=createWorldAudio();
for(const type of ['pointerdown','keydown','touchstart'])addEventListener(type,()=>worldAudio.unlock(),{passive:true,capture:true});
const canvas=document.getElementById('scene'),status=document.getElementById('status'),loading=document.getElementById('loading');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xb8d4d7);
scene.fog=new THREE.Fog(0xa6bfc4,46,340);
const camera=new THREE.PerspectiveCamera(56,innerWidth/innerHeight,.1,760);
camera.position.set(0,3.2,10);
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.02;
const hemiLight=new THREE.HemisphereLight(0xeaf7ff,0x59684b,1.55);scene.add(hemiLight);
const forestWindUniforms=[];
function addInstancedWind(material,amplitude,heightExpression,speed,cacheKey){
 const uniform={value:0};forestWindUniforms.push(uniform);material.userData.forestWindUniform=uniform;
 material.onBeforeCompile=shader=>{
  shader.uniforms.uForestWindTime=uniform;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uForestWindTime;');
  const windCode='\n#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat windStrength='+heightExpression+';\nfloat windPhase=uForestWindTime*'+speed+'+instanceMatrix[3].x*0.19+instanceMatrix[3].z*0.13;\ntransformed.x+=sin(windPhase)*'+amplitude+'*windStrength;\ntransformed.z+=cos(windPhase*0.83)*'+(amplitude*.24)+'*windStrength;\n#endif';
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',windCode);
 };
 material.customProgramCacheKey=()=>cacheKey;material.needsUpdate=true;return uniform;
}
/* MOD 186 — árvores perto da câmera ficam "tracejadas" (dither) em vez de taparem o herói ou deixarem a tela preta. */
function addNearCameraFade(material,near=3.2){
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey;
 material.onBeforeCompile=(shader,renderer)=>{
  if(previous)previous(shader,renderer);
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n{float camFade=clamp((length(vViewPosition)-0.6)/'+near.toFixed(2)+',0.0,1.0);float dither=fract(dot(floor(gl_FragCoord.xy),vec2(0.5,0.25))+fract(floor(gl_FragCoord.y)*0.5)*0.5);if(camFade<0.999&&dither>camFade)discard;}');
 };
 const key=previousKey?previousKey.call(material):'';material.customProgramCacheKey=()=>key+'|near-fade';material.needsUpdate=true;
}
const sunPosition=new THREE.Vector3(-18,58,-170);
const SUN_DIRECTION=new THREE.Vector3(-.12,.5,-.86).normalize(),MOON_DIRECTION=new THREE.Vector3(42,72,95).normalize(),LIGHT_DIRECTION=SUN_DIRECTION.clone(),SKY_SCALE=3.15,SKY_FOLLOW=new THREE.Vector3();
const sunLight=new THREE.DirectionalLight(0xffe6b5,2.1);sunLight.position.copy(sunPosition);sunLight.castShadow=true;scene.add(sunLight.target);
sunLight.shadow.mapSize.set(512,512);sunLight.shadow.camera.left=-68;sunLight.shadow.camera.right=68;sunLight.shadow.camera.top=68;sunLight.shadow.camera.bottom=-68;sunLight.shadow.bias=-0.0004;sunLight.shadow.normalBias=.035;scene.add(sunLight);
const fill=new THREE.DirectionalLight(0xa9d2e8,.48);fill.position.set(30,18,-22);scene.add(fill);

// Luz ambiente e sombra mais suaves, preservando o custo baixo no celular.
sunLight.shadow.camera.left=-46;sunLight.shadow.camera.right=46;sunLight.shadow.camera.top=46;sunLight.shadow.camera.bottom=-46;sunLight.shadow.camera.near=20;sunLight.shadow.camera.far=200;sunLight.shadow.camera.updateProjectionMatrix();
sunLight.shadow.radius=3;

const mat=(color,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness});
// Cúpula diurna em gradiente: céu azul aberto, horizonte atmosférico e sol visível sobre a trilha.
const skyGeometry=new THREE.SphereGeometry(220,28,18),skyPositions=skyGeometry.attributes.position,skyColors=new Float32Array(skyPositions.count*3);
const skyHorizon=new THREE.Color(0xc4dbd4),skyZenith=new THREE.Color(0x559dcc);
for(let i=0;i<skyPositions.count;i++){const y=skyPositions.getY(i)/220;let t=THREE.MathUtils.clamp((y+.12)/.94,0,1);t=t*t*(3-2*t);const c=skyHorizon.clone().lerp(skyZenith,t);skyColors[i*3]=c.r;skyColors[i*3+1]=c.g;skyColors[i*3+2]=c.b;}
skyGeometry.setAttribute('color',new THREE.Float32BufferAttribute(skyColors,3));
const skyDome=new THREE.Mesh(skyGeometry,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:false}));skyDome.renderOrder=-10;skyDome.frustumCulled=false;scene.add(skyDome);
const sunDisk=new THREE.Mesh(new THREE.SphereGeometry(3.1,16,12),new THREE.MeshBasicMaterial({color:0xffe4a2,toneMapped:false}));sunDisk.position.copy(sunPosition);sunDisk.renderOrder=-9;scene.add(sunDisk);
const haloCanvas=document.createElement('canvas');haloCanvas.width=128;haloCanvas.height=128;const haloCtx=haloCanvas.getContext('2d');
const haloGradient=haloCtx.createRadialGradient(64,64,2,64,64,64);haloGradient.addColorStop(0,'rgba(255,238,190,0.72)');haloGradient.addColorStop(.22,'rgba(255,221,151,0.34)');haloGradient.addColorStop(1,'rgba(255,218,145,0)');haloCtx.fillStyle=haloGradient;haloCtx.fillRect(0,0,128,128);
const sunHaloTexture=new THREE.CanvasTexture(haloCanvas);sunHaloTexture.colorSpace=THREE.SRGBColorSpace;
const sunHalo=new THREE.Sprite(new THREE.SpriteMaterial({map:sunHaloTexture,transparent:true,depthWrite:false,fog:false,toneMapped:false}));sunHalo.position.copy(sunPosition);sunHalo.scale.set(26,26,1);sunHalo.renderOrder=-8;scene.add(sunHalo);
const cloudGeometry=new THREE.SphereGeometry(1,10,7),cloudMaterial=new THREE.MeshBasicMaterial({color:0xf5f8f3,transparent:true,opacity:.32,depthWrite:false,fog:false,toneMapped:false});
const movingClouds=[];
const cloudLayouts=[{x:-92,y:49,z:-66,s:1.05,v:.38,p:0.3},{x:-46,y:63,z:-124,s:.78,v:.29,p:1.6},{x:62,y:53,z:-98,s:1.1,v:-.32,p:2.4},{x:105,y:68,z:-18,s:.88,v:-.26,p:3.1},{x:22,y:76,z:35,s:.72,v:.24,p:4.2}];
for(const cloud of cloudLayouts){const group=new THREE.Group();group.position.set(cloud.x,cloud.y,cloud.z);for(const p of [{x:-3.1,y:0,z:0,sx:4.2,sy:1.5,sz:2.2},{x:.1,y:1.25,z:.2,sx:5.3,sy:2.2,sz:2.9},{x:3.7,y:.2,z:.1,sx:3.7,sy:1.35,sz:2},{x:1.5,y:-.25,z:-1.6,sx:3.4,sy:1.25,sz:1.8}]){const puff=new THREE.Mesh(cloudGeometry,cloudMaterial);puff.position.set(p.x,p.y,p.z);puff.scale.set(p.sx*cloud.s, p.sy*cloud.s, p.sz*cloud.s);group.add(puff);}group.frustumCulled=false;scene.add(group);movingClouds.push({group,speed:cloud.v,phase:cloud.p,baseY:cloud.y});}
function makeSoilTexture(base,palette,seed){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,256,256);let s=seed>>>0;const next=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};for(let i=0;i<1500;i++){ctx.globalAlpha=.08+next()*.16;ctx.fillStyle=palette[Math.floor(next()*palette.length)];const w=1+next()*3.5,h=1+next()*2.5;ctx.fillRect(next()*256,next()*256,w,h);}ctx.globalAlpha=1;const texture=new THREE.CanvasTexture(canvas);texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return texture;}
const groundMat=mat(0xffffff),pathMat=mat(0xffffff),barkMat=mat(0x493c2e),leafMat=mat(0x183b29),leafLight=mat(0x35633a),rockMat=mat(0x626c68);
groundMat.map=makeSoilTexture('#435d3e',['#536b43','#354f35','#647248'],163);groundMat.map.repeat.set(34,34);groundMat.needsUpdate=true;
pathMat.map=makeSoilTexture('#756747',['#8a7955','#5e553d','#9a855d'],1631);pathMat.needsUpdate=true;
// Colina escalável: a trilha sobe suavemente até o santuário do portal.
const CLEARING={x:0,z:-29},PORTAL={x:44,z:-119},JOURNEY_ENEMIES=[{x:-12,z:-90.5},{x:-17,z:-93.5},{x:-7,z:-93.5}];
// MOD 204 — o despertar e o "início do mapa" ficam longe da vila (pedido do autor), no sudeste da mata.
const AWAKE_SPOT={x:52,z:10},startTrail=[[52,10],[40,14],[24,16],[10,15],[0,14]],MASSACRE_SPOT={x:9,z:-94},SEWER_DOOR={x:22,z:-106,yaw:1.95};
const MOUNTAIN_SENTRIES=[{x:20,z:-103},{x:33,z:-113}],WARDEN_SPOT={x:41,z:-117};
function hillHeightAt(x,z){
 const progress=THREE.MathUtils.clamp((-z-70)/49,0,1),rise=progress*progress*(3-2*progress);
 const hillCenterX=44*progress,ax=Math.abs(x-hillCenterX);
 const edge=THREE.MathUtils.clamp((30-ax)/18,0,1),width=edge*edge*(3-2*edge);
 return 5.5*rise*width;
}
/* MOD 186 — terreno contínuo: vale jogável cercado por contrafortes e serras reais.
   Uma única malha (grade fina no vale, células maiores até o horizonte) substitui o plano 280×280,
   a colina isolada e os cones instanciados. Altura, cor e limite físico vêm de world3d-terrain.js. */
const VILLAGE_CENTER={x:-12.2,z:-44.5},VILLAGE_CLEAR_RADIUS=22,SECRET_RUIN_SPOT={x:-18.5,z:-52};
// Lago da mata: ponto de interesse visível da trilha, com margem rasa caminhável e fundo bloqueado.
const FOREST_POND={x:-27,z:-88,r:11.5,depth:2.4,level:-.42};
const mainTrail=[[0,14],[0,4],[.5,-6],[-1.8,-17],[0,-29],[2.2,-43],[-1.2,-59],[-2,-76],[5,-91],[15,-99],[27,-108],[44,-119],[46,-132],[45,-140]];
const villageTrail=[[2.2,-43],[0,-41],[-4.6,-41.4],[-8.7,-43.3],[-12.2,-44.5]];
// Mod 188 — caminho da vila até a Loja Central (oeste da praça).
const SHOP_SPOT={x:-33,z:-45},shopTrail=[[-12.2,-44.5],[-18,-45.6],[-24,-45.2],[-27.4,-45]];
// Mod 195 — trilha da vila até o Distrito da Ferrugem (Ato II), pela Garganta da Dívida.
// Mod 196 — trilhas do Vale do Altar (leste) e da Serra sem Ecos (sul).
const altarTrail=[[2.2,-43],[20,-38],[44,-33],[60,-32]].concat(EXTRA_PASSES[0],[[132,-38],[150,-40]]),serraTrail=[[-2,-76],[-6,-110],[-4,-132]].concat(EXTRA_PASSES[1],[[-34,-226]]);
// MOD 208 — trilha da torre (serra) até o Coliseu da Ascensão (leste), pela passagem longa.
// MOD 209 — trilha do coliseu até o deserto da estátua (ao norte).
const desertTrail=[[COLOSSEUM.gate.x,COLOSSEUM.gate.z]].concat(DESERT_PASS,[[DESERT.offer.x,DESERT.offer.z]]);
const colosseumTrail=[[-36,-238]].concat(COLOSSEUM_PASS,[[COLOSSEUM.gate.x,COLOSSEUM.gate.z]]);
const districtTrail=[[-27.4,-45],[-40,-49],[-56,-56]].concat(DISTRICT_PASS,[[-130,-62],[DISTRICT_SPOTS.plaza.x,DISTRICT_SPOTS.plaza.z]]);
const terrain3D=createTerrain({
 hill:hillHeightAt,
 keepouts:[{x:DESERT.statue.x,z:DESERT.statue.z,r:24,fade:8},{x:COLOSSEUM.center.x,z:COLOSSEUM.center.z,r:40,fade:8},{x:-36,z:-256,r:14,fade:6},{x:0,z:4,r:11,fade:8},{x:3.3,z:-5.4,r:5},{x:CLEARING.x,z:CLEARING.z,r:10,fade:7},{x:VILLAGE_CENTER.x,z:VILLAGE_CENTER.z,r:VILLAGE_CLEAR_RADIUS+3,fade:8},{x:SECRET_RUIN_SPOT.x,z:SECRET_RUIN_SPOT.z,r:5},{x:PORTAL.x,z:PORTAL.z,r:12,fade:8},{x:-12,z:-97,r:7,fade:5},{x:AWAKE_SPOT.x,z:AWAKE_SPOT.z,r:9,fade:6},{x:MASSACRE_SPOT.x,z:MASSACRE_SPOT.z,r:6,fade:5},{x:SEWER_DOOR.x,z:SEWER_DOOR.z,r:5,fade:4},{x:SHOP_SPOT.x,z:SHOP_SPOT.z,r:9,fade:6},{x:DISTRICT_SPOTS.plaza.x,z:DISTRICT_SPOTS.plaza.z,r:22,fade:8},{x:ALTAR_VALLEY.cx,z:ALTAR_VALLEY.cz,r:16,fade:8},{x:SERRA.cx,z:SERRA.cz-8,r:16,fade:8},{x:FOREST_POND.x,z:FOREST_POND.z,r:FOREST_POND.r*1.3,fade:6}],
 ponds:[FOREST_POND],
 extraAreas:[DISTRICT,...EXTRA_REGIONS,COLOSSEUM_REGION,DESERT_REGION],passes:[{points:DISTRICT_PASS,r:PASS_RADIUS},...EXTRA_PASSES.map(points=>({points,r:PASS_RADIUS})),{points:COLOSSEUM_PASS,r:PASS_RADIUS},{points:DESERT_PASS,r:PASS_RADIUS}],channels:[{points:DISTRICT_CANAL,width:3.2,depth:1.8,level:-.6}],
 paths:[{points:startTrail,r:4,fade:5},{points:mainTrail,r:5.5,fade:6},{points:villageTrail,r:4.5,fade:5},{points:shopTrail,r:4,fade:5},{points:districtTrail,r:4,fade:5},{points:altarTrail,r:4,fade:5},{points:serraTrail,r:4,fade:5},{points:colosseumTrail,r:4,fade:5},{points:desertTrail,r:4,fade:5}]
});
var voidSpec={x:VOID.x,z:VOID.z,y:VOID.y,radius:VOID.radius},dimBattle=null,vsOpen=false,dimKey=null;
function groundHeightAt(x,z){if(voidMode)return voidSpec.y;return terrain3D.height(x,z);}
function dryGround(x,z){return terrain3D.walkable(x,z)&&terrain3D.waterDepth(x,z)<-.12;}
const terrainLowSpec=(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches)||innerWidth<700;
const terrainMesh=(()=>{
 const built=buildTerrainArrays(terrain3D,{cx:-2,cz:-126,fineHalf:206,fineHalfZ:166,fineCell:terrainLowSpec?2.5:2,outerSteps:terrainLowSpec?32:40,growth:terrainLowSpec?1.095:1.075});
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.BufferAttribute(built.positions,3));geo.setIndex(new THREE.BufferAttribute(built.indices,1));geo.computeVertexNormals();
 geo.setAttribute('color',new THREE.BufferAttribute(colorTerrain(terrain3D,built.positions,geo.attributes.normal.array),3));
 const uv=new Float32Array(built.positions.length/3*2);for(let i=0,k=0;i<uv.length;i+=2,k+=3){uv[i]=built.positions[k]*.12;uv[i+1]=built.positions[k+2]*.12;}
 geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.computeBoundingSphere();
 // Textura neutra de detalhe: a cor vem do relevo (grama, musgo, rocha, neve).
 const detail=makeSoilTexture('#ececec',['#ffffff','#c4c4c4','#f4f4f4','#b4b4b4'],1863);
 const material=new THREE.MeshStandardMaterial({color:0xffffff,map:detail,vertexColors:true,roughness:1,metalness:0});
 const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;mesh.castShadow=false;mesh.name='terrain-mod186';scene.add(mesh);
 window.SevenSinsTerrainReport={vertices:built.positions.length/3,triangles:built.indices.length/3,extent:[built.ax[0],built.ax[built.ax.length-1]]};
 return mesh;
})();
const pondWater=(()=>{const geo=new THREE.CircleGeometry(FOREST_POND.r*1.34,56);geo.rotateX(-Math.PI/2);
 const material=new THREE.MeshStandardMaterial({color:0x1b3a43,roughness:.06,metalness:.25,transparent:true,opacity:.86,depthWrite:false});
 const uniform={value:0};forestWindUniforms.push(uniform);
 // Ondulação barata só na normal (nenhum vértice extra): brilho do sol/lua tremula na superfície.
 material.onBeforeCompile=shader=>{shader.uniforms.uForestWindTime=uniform;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWaterWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWaterWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uForestWindTime;varying vec3 vWaterWorld;').replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n{vec2 q=vWaterWorld.xz;float t=uForestWindTime;vec3 ripple=vec3(sin(q.x*1.7+t*1.3)+sin(q.y*2.3-t*1.1+q.x*.6),0.0,cos(q.y*1.9+t*1.2)+sin(q.x*2.9-q.y*.8+t*.7));normal=normalize(normal+(viewMatrix*vec4(ripple*0.045,0.0)).xyz);}');};
 material.customProgramCacheKey=()=>'mod186-pond';
 const mesh=new THREE.Mesh(geo,material);mesh.position.set(FOREST_POND.x,FOREST_POND.level,FOREST_POND.z);mesh.renderOrder=2;mesh.name='forest-pond';scene.add(mesh);return mesh;})();

/* MOD 181 — Lua 3D + ciclo dia/noite + expansão controlada do horizonte. */
const moonPosition=new THREE.Vector3(42,72,95);
let moonRoot=null,moonVisible=false;
new GLTFLoader().load('./Lua.glb?v=mod181-moon',gltf=>{
 const moon=gltf.scene;
 moon.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.frustumCulled=false;if(o.material){o.material.toneMapped=false;o.material.emissive=new THREE.Color(0xfff1d6);if(o.material.map){o.material.emissiveMap=o.material.map;o.material.emissiveIntensity=.85;}else o.material.emissiveIntensity=.2;}}});
 const bounds=new THREE.Box3().setFromObject(moon),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const target=7.5,scale=size.y>.001?target/size.y:1;
 moon.scale.setScalar(scale);moon.position.set(-center.x*scale,-center.y*scale,-center.z*scale);
 moonRoot=new THREE.Group();moonRoot.position.copy(moonPosition);moon.traverse(o=>{if(o.isMesh&&o.material)for(const m of [].concat(o.material))m.fog=false;});const moonFace=new THREE.Group();moonFace.rotation.y=-Math.PI/4;moonFace.add(moon);moonRoot.add(moonFace);const moonGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:sunHaloTexture,color:0x9fb8ff,transparent:true,opacity:.55,depthWrite:false,fog:false,toneMapped:false}));moonGlow.scale.set(17,17,1);moonGlow.position.z=-2;moonRoot.add(moonGlow);moonRoot.visible=false;scene.add(moonRoot);moonVisible=true;
},undefined,err=>console.warn('Lua.glb não carregou; mantendo céu sem modelo 3D.',err));

/* MOD 186 — céu estrelado leve (1 draw call), visível só à noite. */
const starField=(()=>{const count=terrainLowSpec?650:1100,pos=new Float32Array(count*3),col=new Float32Array(count*3);let s=7731;const r=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
 for(let i=0;i<count;i++){const u=r(),v=.08+r()*.92,th=u*Math.PI*2,y=v,rad=Math.sqrt(1-y*y);pos[i*3]=Math.cos(th)*rad*640;pos[i*3+1]=y*640;pos[i*3+2]=Math.sin(th)*rad*640;const w=.65+r()*.35,tint=r();col[i*3]=w*(tint>.8?1:.86);col[i*3+1]=w*.9;col[i*3+2]=w*(tint<.25?.78:1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
 const pts=new THREE.Points(g,new THREE.PointsMaterial({size:1.6,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:0,depthWrite:false,fog:false,toneMapped:false}));pts.frustumCulled=false;pts.renderOrder=-9;pts.visible=false;scene.add(pts);return pts;})();
const dayNightState={mode:'day',t:0,target:0};
const villageTorchLights=[];
const dayPreset={bg:0xb8d4d7,fog:0xa6bfc4,fogNear:46,fogFar:340,hemiSky:0xeaf7ff,hemiGround:0x59684b,hemiInt:1.55,sunInt:2.1,fillInt:.48,exposure:1.02,sunDiskVis:true,moonVis:false,torchInt:.35};
const nightPreset={bg:0x17253d,fog:0x233650,fogNear:34,fogFar:300,hemiSky:0x6a8cc0,hemiGround:0x2a3626,hemiInt:1.22,sunInt:.98,fillInt:.3,exposure:1.1,sunDiskVis:false,moonVis:true,torchInt:1.55};
const footTmpVec=new THREE.Vector3();
const hexColorCache=new Map(),lerpTmp=new THREE.Color();
function hexColor(h){let c=hexColorCache.get(h);if(!c){c=new THREE.Color(h);hexColorCache.set(h,c);}return c;}
function lerpColorHex(a,b,t){return lerpTmp.copy(hexColor(a)).lerp(hexColor(b),t);}
let skyLastT=-1;const skyDayH=new THREE.Color(0xc4dbd4),skyDayZ=new THREE.Color(0x559dcc),skyNightH=new THREE.Color(0x24344e),skyNightZ=new THREE.Color(0x050a17),skyTmpD=new THREE.Color(),skyTmpN=new THREE.Color();
function applyDayNightVisual(t){
 if(typeof voidMode!=='undefined'&&voidMode)return;
 const p=t;
 scene.background.copy(lerpColorHex(dayPreset.bg,nightPreset.bg,p));
 scene.fog.color.copy(lerpColorHex(dayPreset.fog,nightPreset.fog,p));
 scene.fog.near=THREE.MathUtils.lerp(dayPreset.fogNear,nightPreset.fogNear,p);
 scene.fog.far=THREE.MathUtils.lerp(dayPreset.fogFar,nightPreset.fogFar,p);
 hemiLight.color.copy(lerpColorHex(dayPreset.hemiSky,nightPreset.hemiSky,p));
 hemiLight.groundColor.copy(lerpColorHex(dayPreset.hemiGround,nightPreset.hemiGround,p));
 hemiLight.intensity=THREE.MathUtils.lerp(dayPreset.hemiInt,nightPreset.hemiInt,p);
 sunLight.intensity=THREE.MathUtils.lerp(dayPreset.sunInt,nightPreset.sunInt,p);
 fill.intensity=THREE.MathUtils.lerp(dayPreset.fillInt,nightPreset.fillInt,p);
 // MOD 186 — à noite a luz principal vira luar azulado vindo da lua (com sombras), sem apagar a leitura do cenário.
 sunLight.color.copy(lerpColorHex(0xffe6b5,0xa9c3ff,p));LIGHT_DIRECTION.copy(SUN_DIRECTION).lerp(MOON_DIRECTION,p).normalize();
 if(starField){starField.visible=p>.3;starField.material.opacity=THREE.MathUtils.smoothstep(p,.3,1)*.95;}
 renderer.toneMappingExposure=THREE.MathUtils.lerp(dayPreset.exposure,nightPreset.exposure,p);
 if(sunDisk)sunDisk.visible=p<.55;
 if(sunHalo)sunHalo.visible=p<.55;
 if(moonRoot)moonRoot.visible=p>.35;
 for(const light of villageTorchLights)light.intensity=THREE.MathUtils.lerp(dayPreset.torchInt,nightPreset.torchInt,p);
 // Gradiente do céu diurno → noturno (recalculado só quando a luz mudou de verdade: são centenas de vértices).
 if(skyDome&&skyDome.geometry&&skyDome.geometry.attributes.color&&(skyLastT<0||Math.abs(p-skyLastT)>.012)){
  skyLastT=p;
  const cols=skyDome.geometry.attributes.color,pos=skyDome.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){
   const y=pos.getY(i)/220;let u=THREE.MathUtils.clamp((y+.12)/.94,0,1);u=u*u*(3-2*u);
   skyTmpD.copy(skyDayH).lerp(skyDayZ,u);skyTmpN.copy(skyNightH).lerp(skyNightZ,u);skyTmpD.lerp(skyTmpN,p);
   cols.setXYZ(i,skyTmpD.r,skyTmpD.g,skyTmpD.b);
  }
  cols.needsUpdate=true;
 }
}
/* MOD 202 — relógio contínuo do jogo: 24 h de jogo = 16 min reais (12 h de dia + 12 h de noite).
   Nada na campanha força mais a noite; o botão só pula para o próximo amanhecer/anoitecer. */
const GAME_DAY_SECONDS=960;
const gameClock={hour:9};
function nightFactorForHour(h){
 const sm=(a,b,x)=>{const u=Math.min(1,Math.max(0,(x-a)/(b-a)));return u*u*(3-2*u);};
 if(h<4.5)return 1;if(h<6.5)return 1-sm(4.5,6.5,h);if(h<17.5)return 0;if(h<19.5)return sm(17.5,19.5,h);return 1;
}
function isNightHour(h){return nightFactorForHour(h)>.5;}
function setGameHour(h){gameClock.hour=((h%24)+24)%24;dayNightState.target=nightFactorForHour(gameClock.hour);dayNightState.t=dayNightState.target;dayNightState.mode=dayNightState.target>.5?'night':'day';syncDayNightButton();applyDayNightVisual(dayNightState.t);}
function syncDayNightButton(){
 const btn=document.getElementById('daynight-toggle-3d');
 if(btn){const hh=Math.floor(gameClock.hour),mm=Math.floor((gameClock.hour%1)*60);btn.textContent=(dayNightState.target>.5?'NOITE · ':'DIA · ')+String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');btn.setAttribute('aria-pressed',String(dayNightState.target>.5));}
}
function setDayNightMode(mode){setGameHour(mode==='night'?20:8);}
let clockSaveT=0,clockBtnT=0;
function updateDayNight(dt){
 gameClock.hour=(gameClock.hour+dt*24/GAME_DAY_SECONDS)%24;
 dayNightState.target=nightFactorForHour(gameClock.hour);dayNightState.t=dayNightState.target;
 dayNightState.mode=dayNightState.target>.5?'night':'day';
 applyDayNightVisual(dayNightState.t);
 if(typeof updateBraziers==='function'&&typeof brazierLight!=='undefined')updateBraziers(dt);
 clockBtnT+=dt;if(clockBtnT>1){clockBtnT=0;syncDayNightButton();}
 clockSaveT+=dt;if(clockSaveT>5){clockSaveT=0;try{localStorage.setItem('seven-sins-3d-clock',gameClock.hour.toFixed(3));}catch(e){}}
}
(function initDayNightUI(){
 let h=9;try{const v=parseFloat(localStorage.getItem('seven-sins-3d-clock'));if(isFinite(v))h=v;}catch(e){}
 const btn=document.getElementById('daynight-toggle-3d');
 if(btn)bindInstantTap(btn,()=>{const h=gameClock.hour;setGameHour(h>=6&&h<18?18.2:6.2);});
 setGameHour(h);
})();



const treeGroup=new THREE.Group();scene.add(treeGroup);
const treeObstacles=[],rockObstacles=[],marketObstacles=[],walkableObstacles=[],treeSpecs=[];
const leafMid=mat(0x245035),mossMatA=mat(0x34522e),mossMatB=mat(0x465e32),grassMatA=mat(0x58763d),grassMatB=mat(0x304d31);
const canopyWindUniforms=[leafMat,leafMid,leafLight].map((material,i)=>addInstancedWind(material,.075,'clamp((position.y+1.175)/2.35,0.0,1.0)',.72,'forest-canopy-wind-v163-'+i));
for(const material of [leafMat,leafMid,leafLight,barkMat])addNearCameraFade(material);
const trailRoutes=[{points:startTrail,width:3.4},{points:mainTrail,width:5.2},{points:villageTrail,width:4.0},{points:shopTrail,width:3.4},{points:districtTrail,width:3.6},{points:altarTrail,width:3.4},{points:serraTrail,width:3.4},{points:colosseumTrail,width:3.4},{points:desertTrail,width:3.4}];
function addTrail(points,width){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],groundHeightAt(p[0],p[1]),p[1])),false,'centripetal');
 const steps=Math.max(48,points.length*14),vertices=[],uvs=[],indices=[];
 for(let i=0;i<=steps;i++){
  const t=i/steps,center=curve.getPoint(t),tangent=curve.getTangent(t),side=new THREE.Vector3(tangent.z,0,-tangent.x).normalize(),k=vertices.length/3;
  const x1=center.x+side.x*width*.5,z1=center.z+side.z*width*.5,x2=center.x-side.x*width*.5,z2=center.z-side.z*width*.5;
  vertices.push(x1,groundHeightAt(x1,z1)+.045,z1,x2,groundHeightAt(x2,z2)+.045,z2);
   uvs.push(x1*.14,z1*.14,x2*.14,z2*.14);
  if(i<steps)indices.push(k,k+1,k+2,k+1,k+3,k+2);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,pathMat);mesh.receiveShadow=true;scene.add(mesh);
}
function closeToPolyline(x,z,points,radius){
 const limit=radius*radius;
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;
  const t=length>0?THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/length,0,1):0;
  const ox=x-(a[0]+dx*t),oz=z-(a[1]+dz*t);if(ox*ox+oz*oz<limit)return true;
 }
 return false;
}
for(const route of trailRoutes)addTrail(route.points,route.width);
let seed=9137;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
/* MOD 186 — floresta em manchas naturais com três silhuetas: carvalho (Arvore.glb, tronco corrigido),
   árvore de copa redonda e conífera. Coníferas sobem as encostas até a linha das árvores (sem colisão,
   pois ficam fora da área caminhável). Tudo instanciado: poucos draw calls para o celular. */
function forestSpotFree(x,z){
 if(Math.hypot(x,z-4)<6.5||Math.hypot(x-CLEARING.x,z-CLEARING.z)<8.6||Math.hypot(x-VILLAGE_CENTER.x,z-VILLAGE_CENTER.z)<VILLAGE_CLEAR_RADIUS+1)return false;
 if(WAYSTONES.some(w=>Math.hypot(x-w.x,z-w.z)<4.2)||Math.hypot(x-SHOP_SPOT.x,z-SHOP_SPOT.z)<10)return false;
 if(Math.abs(x-DISTRICT.cx)<DISTRICT.hx+4&&Math.abs(z-DISTRICT.cz)<DISTRICT.hz+4)return false; // distrito em ruínas: sem mata densa
 if(Math.hypot(x-ALTAR_VALLEY.cx,z-ALTAR_VALLEY.cz)<24||Math.hypot(x-SERRA.cx,z-SERRA.cz+8)<18)return false;
 if(inDesert(x,z))return false;
 if(Math.hypot(x-COLOSSEUM.center.x,z-COLOSSEUM.center.z)<41||Math.hypot(x+36,z+256)<15)return false; // MOD 207/208 — torre e coliseu

 if(Math.hypot(x-SECRET_RUIN_SPOT.x,z-SECRET_RUIN_SPOT.z)<4.4||Math.hypot(x-PORTAL.x,z-PORTAL.z)<9.5||Math.hypot(x+12,z+97)<6.5||Math.hypot(x-AWAKE_SPOT.x,z-AWAKE_SPOT.z)<8||Math.hypot(x-MASSACRE_SPOT.x,z-MASSACRE_SPOT.z)<6||Math.hypot(x-SEWER_DOOR.x,z-SEWER_DOOR.z)<6)return false;
 return !trailRoutes.some(route=>closeToPolyline(x,z,route.points,route.width*.5+1.25));
}
{
 const raw=scatterForest(terrain3D,{seed:9137,attempts:terrainLowSpec?3000:3800,isFree:forestSpotFree,lowSpec:terrainLowSpec}),grid=new Map();
 const key=(x,z)=>Math.floor(x/4)+','+Math.floor(z/4);
 for(const t of raw){
  const gx=Math.floor(t.x/4),gz=Math.floor(t.z/4);let crowded=false;
  for(let ix=-1;ix<=1&&!crowded;ix++)for(let iz=-1;iz<=1&&!crowded;iz++){const list=grid.get((gx+ix)+','+(gz+iz));if(list)for(const o of list){const min=(t.collide?1.55:1.15)*(t.s+o.s);if((t.x-o.x)**2+(t.z-o.z)**2<min*min){crowded=true;break;}}}
  if(crowded)continue;
  const k=key(t.x,t.z);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(t);treeSpecs.push(t);
 }
 const oakCap=terrainLowSpec?110:260;let oaks=0;
 for(const t of treeSpecs){if(t.kind==='oak'&&++oaks>oakCap)t.kind='round';}
 for(const t of treeSpecs){
  t.y=groundHeightAt(t.x,t.z)-(t.collide?.08:.45*t.s);
  if(t.kind==='round')t.height=(7.2+t.tint*3.2)*t.s;
  else if(t.kind==='conifer')t.height=(t.collide?8.2:9.5)*t.s*(.85+t.tint*.35);
  else t.height=(1.05+t.tint*.45)*t.s;
  if(t.collide)treeObstacles.push({x:t.x,z:t.z,radius:t.kind==='oak'?.25*t.height+.08:t.kind==='conifer'?.24*t.s+.2:.34*t.s+.18});
 }
}
const roundTrees=treeSpecs.filter(t=>t.kind==='round'),oakTrees=treeSpecs.filter(t=>t.kind==='oak'),coniferTrees=treeSpecs.filter(t=>t.kind==='conifer');
// Árvores redondas (e reserva dos carvalhos até o GLB carregar).
const roundAndFallback=roundTrees.concat(oakTrees.map(t=>Object.assign({},t,{height:(7.4+t.tint*2.6)*t.s})));
const treeDummy=new THREE.Object3D(),trunkGeo=new THREE.CylinderGeometry(.18,.34,1,7,1),rootGeo=new THREE.CylinderGeometry(.29,.48,.46,7,1),crownGeo=new THREE.IcosahedronGeometry(1,1);
const trunkInstances=new THREE.InstancedMesh(trunkGeo,barkMat,roundAndFallback.length),rootInstances=new THREE.InstancedMesh(rootGeo,barkMat,roundAndFallback.length);
trunkInstances.castShadow=true;trunkInstances.receiveShadow=true;rootInstances.castShadow=false;rootInstances.receiveShadow=true;
const crownInstances=[leafMat,leafMid,leafLight].map(material=>new THREE.InstancedMesh(crownGeo,material,roundAndFallback.length));
for(const crown of crownInstances){crown.castShadow=!terrainLowSpec;crown.receiveShadow=true;}
for(let i=0;i<roundAndFallback.length;i++){
 const t=roundAndFallback[i],height=t.height;
 treeDummy.position.set(t.x,t.y+height*.5,t.z);treeDummy.scale.set(t.s,height,t.s);treeDummy.rotation.set(0,t.rot,0);treeDummy.updateMatrix();trunkInstances.setMatrixAt(i,treeDummy.matrix);
 treeDummy.position.set(t.x,t.y+.23*t.s,t.z);treeDummy.scale.set(t.s,t.s,t.s);treeDummy.rotation.set(0,t.rot*1.7,0);treeDummy.updateMatrix();rootInstances.setMatrixAt(i,treeDummy.matrix);
 for(let j=0;j<3;j++){
  const offset=(rand()-.5)*.18*t.s,level=.57+j*.14;
  treeDummy.position.set(t.x+offset,t.y+height*level,t.z+(rand()-.5)*.16*t.s);
  const crownScale=1.68-j*.2;treeDummy.scale.set(t.s*crownScale,t.s*(1.43-j*.06),t.s*crownScale);treeDummy.rotation.set(0,rand()*Math.PI*2,0);treeDummy.updateMatrix();crownInstances[j].setMatrixAt(i,treeDummy.matrix);
 }
}
trunkInstances.instanceMatrix.needsUpdate=true;rootInstances.instanceMatrix.needsUpdate=true;treeGroup.add(trunkInstances,rootInstances);for(const crown of crownInstances){crown.instanceMatrix.needsUpdate=true;crown.computeBoundingSphere();treeGroup.add(crown);}
trunkInstances.computeBoundingSphere();rootInstances.computeBoundingSphere();
function setRoundTreeCount(count){for(const m of [trunkInstances,rootInstances,...crownInstances])m.count=count;}
// Funde partes simples numa só geometria com cor por vértice (1 draw call por espécie).
function mergeColoredParts(parts){
 const pos=[],col=[];
 for(const part of parts){const g=part.geometry.index?part.geometry.toNonIndexed():part.geometry;g.applyMatrix4(part.matrix);const p=g.attributes.position,c=new THREE.Color(part.color);
  for(let i=0;i<p.count;i++){pos.push(p.getX(i),p.getY(i),p.getZ(i));const shade=part.shade?part.shade(p.getY(i)):1;col.push(c.r*shade,c.g*shade,c.b*shade);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();g.computeBoundingSphere();return g;
}
const coniferGeometry=(()=>{
 const M=(x,y,z,sx=1,sy=1,sz=1,ry=0)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ry,0)),new THREE.Vector3(sx,sy,sz));
 const parts=[{geometry:new THREE.CylinderGeometry(.028,.05,.34,6),matrix:M(0,.17,0),color:0x4a3626}];
 const tiers=[[.16,.4,.34],[.32,.34,.28],[.47,.27,.24],[.6,.2,.2],[.72,.12,.16]];
 tiers.forEach(([y,r,h],i)=>parts.push({geometry:new THREE.ConeGeometry(r,h,7,1),matrix:M(0,y+h*.5,0,1,1,1,i*.7),color:i%2?0x23452f:0x1d3c2a,shade:yy=>.78+Math.min(.42,(yy-y)/h*.42)}));
 return mergeColoredParts(parts);
})();
/* MOD 202 — corte de instâncias: florestas inteiras eram desenhadas todo quadro (inclusive árvores atrás da
   câmera e a 300 m). Mantemos o conjunto completo na memória e enviamos à GPU só as instâncias perto e à frente. */
const instanceCullers=[],_cullDir=new THREE.Vector3();let cullFrame=0,cullLastX=1e9,cullLastZ=1e9,cullLastYaw=1e9;
function registerInstanceCull(mesh,radius,keepNear=30,minRadius=0){
 const n=mesh.count,src=mesh.instanceMatrix.array.slice(0,n*16),col=mesh.instanceColor?mesh.instanceColor.array.slice(0,n*3):null,pos=new Float32Array(n*3);
 for(let i=0;i<n;i++){pos[i*3]=src[i*16+12];pos[i*3+1]=src[i*16+13];pos[i*3+2]=src[i*16+14];}
 mesh.frustumCulled=false;instanceCullers.push({mesh,n,src,col,pos,r2:radius*radius,min2:minRadius*minRadius,near2:keepNear*keepNear});cullLastX=1e9;
}
function updateInstanceCulling(){
 if(!instanceCullers.length||(++cullFrame%4))return;
 camera.getWorldDirection(_cullDir);const yaw=Math.atan2(_cullDir.x,_cullDir.z),px=player.position.x,pz=player.position.z;
 if(Math.abs(px-cullLastX)<3&&Math.abs(pz-cullLastZ)<3&&Math.abs(yaw-cullLastYaw)<.12)return;
 cullLastX=px;cullLastZ=pz;cullLastYaw=yaw;
 const cx=camera.position.x,cz=camera.position.z,fl=Math.hypot(_cullDir.x,_cullDir.z)||1,fx=_cullDir.x/fl,fz=_cullDir.z/fl;
 for(const c of instanceCullers){
  const arr=c.mesh.instanceMatrix.array,carr=c.col&&c.mesh.instanceColor?c.mesh.instanceColor.array:null;let k=0;
  for(let i=0;i<c.n;i++){
   const dx=c.pos[i*3]-cx,dz=c.pos[i*3+2]-cz,d2=dx*dx+dz*dz;
   if(d2>c.r2||d2<c.min2)continue;
   if(d2>c.near2&&(dx*fx+dz*fz)<-.1*Math.sqrt(d2))continue;
   arr.set(c.src.subarray(i*16,i*16+16),k*16);if(carr)carr.set(c.col.subarray(i*3,i*3+3),k*3);k++;
  }
  c.mesh.count=k;c.mesh.instanceMatrix.needsUpdate=true;if(carr)c.mesh.instanceColor.needsUpdate=true;
 }
}
const coniferMaterial=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.95,flatShading:true});
addInstancedWind(coniferMaterial,.035,'clamp((position.y-0.2)*1.3,0.0,1.0)',.64,'mod186-conifer-wind');addNearCameraFade(coniferMaterial,4.4);
const coniferInstances=new THREE.InstancedMesh(coniferGeometry,coniferMaterial,Math.max(1,coniferTrees.length));
{
 const tintA=new THREE.Color(0xffffff),tintB=new THREE.Color(0xb9c9a2),tintC=new THREE.Color(0xd6c8a6),tint=new THREE.Color();
 for(let i=0;i<coniferTrees.length;i++){const t=coniferTrees[i],w=t.height*(.92+t.tint*.22);
  treeDummy.position.set(t.x,t.y,t.z);treeDummy.scale.set(w,t.height,w);treeDummy.rotation.set(0,t.rot,0);treeDummy.updateMatrix();coniferInstances.setMatrixAt(i,treeDummy.matrix);
  tint.copy(tintA).lerp(t.tint<.5?tintB:tintC,Math.abs(t.tint-.5)*1.4);coniferInstances.setColorAt(i,tint);}
 coniferInstances.count=coniferTrees.length;coniferInstances.instanceMatrix.needsUpdate=true;if(coniferInstances.instanceColor)coniferInstances.instanceColor.needsUpdate=true;
 coniferInstances.castShadow=!terrainLowSpec;coniferInstances.receiveShadow=true;coniferInstances.computeBoundingSphere();registerInstanceCull(coniferInstances,120);treeGroup.add(coniferInstances);
}
/** Carvalho distante: copa elipsoidal + tronco (~100 triângulos em vez de ~380), com as cores médias do modelo completo. */
function buildOakFarGeometry(src){
 src.computeBoundingBox();const b=src.boundingBox,h=Math.max(.1,b.max.y-b.min.y),w=Math.max(.1,Math.max(b.max.x-b.min.x,b.max.z-b.min.z));
 const cx=(b.max.x+b.min.x)/2,cz=(b.max.z+b.min.z)/2,crown=new THREE.IcosahedronGeometry(1,1),trunk=new THREE.CylinderGeometry(.16*h*.1+.12,.22*h*.1+.18,h*.5,6,1);
 const parts=[[crown,[.1,.26,.12],(g)=>{g.scale(w*.46,h*.28,w*.46);g.translate(cx,b.min.y+h*.7,cz);}],[trunk,[.22,.16,.1],(g)=>{g.translate(cx,b.min.y+h*.25,cz);}]];
 const pos=[],col=[];
 for(const [g0,c,fix] of parts){const g=g0.index?g0.toNonIndexed():g0;fix(g);const p=g.attributes.position;for(let i=0;i<p.count;i++){pos.push(p.getX(i),p.getY(i),p.getZ(i));const lift=.85+.3*Math.max(0,(p.getY(i)-b.min.y)/h-.4);col.push(c[0]*lift,c[1]*lift,c[2]*lift);}}
 const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));out.setAttribute('color',new THREE.Float32BufferAttribute(col,3));out.computeVertexNormals();return out;
}
// Carvalho autoral: Arvore.glb tem o tronco começando 1,76 m acima das raízes; estica a base até o chão.
function mergeOakTree(sourceRoot){
 const pos=[],col=[];sourceRoot.updateMatrixWorld(true);const v=new THREE.Vector3();
 sourceRoot.traverse(obj=>{if(!obj.isMesh||!obj.geometry||!obj.geometry.attributes.position)return;const name=obj.name||'';if(/^Folha_individual/.test(name))return;
  if(/^(Musgo|Vegetacao)/.test(name))return;
  if(/^Copa_volume/.test(name)){
   // 162 vértices por volume viram 42: mesma silhueta, ~4× menos triângulos por carvalho.
   const src=obj.geometry.attributes.position,box=new THREE.Box3(),avg=[0,0,0],cc=obj.geometry.attributes.color;
   for(let i=0;i<src.count;i++){box.expandByPoint(v.fromBufferAttribute(src,i).applyMatrix4(obj.matrixWorld));if(cc){avg[0]+=cc.getX(i);avg[1]+=cc.getY(i);avg[2]+=cc.getZ(i);}}
   const n=Math.max(1,src.count),center=box.getCenter(new THREE.Vector3()),half=box.getSize(new THREE.Vector3()).multiplyScalar(.5);
   const blob=new THREE.IcosahedronGeometry(1,1),bp=blob.attributes.position;
   for(let i=0;i<bp.count;i++){v.fromBufferAttribute(bp,i);const lift=.82+.3*Math.max(0,v.y);v.multiply(half).add(center);pos.push(v.x,v.y,v.z);col.push(cc?avg[0]/n*lift*.62:.08,cc?avg[1]/n*lift*.7:.18,cc?avg[2]/n*lift*.6:.08);}
   blob.dispose();return;
  }
  const g=obj.geometry.index?obj.geometry.toNonIndexed():obj.geometry,p=g.attributes.position,c=g.attributes.color,trunk=/^(Tronco|Ruga_casca)/.test(name);
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);if(trunk&&v.y<2.2)v.y=-.05;v.applyMatrix4(obj.matrixWorld);pos.push(v.x,v.y,v.z);col.push(c?c.getX(i):.3,c?c.getY(i):.4,c?c.getZ(i):.25);}});
 if(!pos.length)throw new Error('Arvore.glb sem malhas');
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();g.computeBoundingBox();return g;
}
if(oakTrees.length)new GLTFLoader().load('./Arvore.glb?v=mod186-oak',gltf=>{try{
 const geometry=mergeOakTree(gltf.scene),material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.92,flatShading:true});
 addInstancedWind(material,.05,'clamp((position.y-2.6)/2.8,0.0,1.0)',.7,'mod186-oak-wind');addNearCameraFade(material);
 const mesh=new THREE.InstancedMesh(geometry,material,oakTrees.length),tint=new THREE.Color();
 for(let i=0;i<oakTrees.length;i++){const t=oakTrees[i];treeDummy.position.set(t.x,t.y,t.z);treeDummy.scale.set(t.height*(.7+t.tint*.18),t.height*1.12,t.height*(.7+(1-t.tint)*.18));treeDummy.rotation.set(0,t.rot,0);treeDummy.updateMatrix();mesh.setMatrixAt(i,treeDummy.matrix);tint.setRGB(.92+t.tint*.16,.95+t.tint*.1,.88+(1-t.tint)*.14);mesh.setColorAt(i,tint);}
 mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.castShadow=!terrainLowSpec;mesh.receiveShadow=true;mesh.computeBoundingSphere();{const farGeo=buildOakFarGeometry(geometry),farMesh=new THREE.InstancedMesh(farGeo,material,oakTrees.length);
  farMesh.instanceMatrix.array.set(mesh.instanceMatrix.array);farMesh.instanceMatrix.needsUpdate=true;for(let i=0;i<oakTrees.length;i++){mesh.getColorAt(i,tint);farMesh.setColorAt(i,tint);}if(farMesh.instanceColor)farMesh.instanceColor.needsUpdate=true;
  farMesh.castShadow=false;farMesh.receiveShadow=false;farMesh.count=oakTrees.length;treeGroup.add(farMesh);registerInstanceCull(farMesh,112,0,48);registerInstanceCull(mesh,48,26);}
 treeGroup.add(mesh);
 setRoundTreeCount(roundTrees.length);
 gltf.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of [].concat(o.material))m&&m.dispose();}});
 window.SevenSinsForestReport={oaks:oakTrees.length,round:roundTrees.length,conifers:coniferTrees.length,oakVertices:geometry.attributes.position.count};
}catch(err){console.warn('Arvore.glb não foi instanciada; mantendo árvores redondas de reserva.',err);}},undefined,err=>console.warn('Arvore.glb não carregou; mantendo árvores redondas de reserva.',err));
const mossGeo=new THREE.SphereGeometry(1,8,5),mossInstancesA=new THREE.InstancedMesh(mossGeo,mossMatA,330),mossInstancesB=new THREE.InstancedMesh(mossGeo,mossMatB,260);let mossIndexA=0,mossIndexB=0;
for(let i=0;i<640;i++){
 const x=(rand()-.5)*160,z=26-rand()*182;if(!dryGround(x,z))continue;
 if(Math.hypot(x,z-4)<5.6||Math.hypot(x-CLEARING.x,z-CLEARING.z)<6.5||Math.hypot(x-VILLAGE_CENTER.x,z-VILLAGE_CENTER.z)<VILLAGE_CLEAR_RADIUS-1.3)continue;
 if(trailRoutes.some(route=>closeToPolyline(x,z,route.points,route.width*.5+.35)))continue;
 treeDummy.position.set(x,groundHeightAt(x,z)+.026,z);treeDummy.scale.set(.65+rand()*1.15,.028+rand()*.025,.42+rand()*.8);treeDummy.rotation.set(0,rand()*Math.PI*2,0);treeDummy.updateMatrix();
 if(i%3){if(mossIndexA<mossInstancesA.count)mossInstancesA.setMatrixAt(mossIndexA++,treeDummy.matrix);}else if(mossIndexB<mossInstancesB.count)mossInstancesB.setMatrixAt(mossIndexB++,treeDummy.matrix);
}
mossInstancesA.count=mossIndexA;mossInstancesB.count=mossIndexB;mossInstancesA.instanceMatrix.needsUpdate=true;mossInstancesB.instanceMatrix.needsUpdate=true;mossInstancesA.castShadow=false;mossInstancesB.castShadow=false;scene.add(mossInstancesA,mossInstancesB);
const grassGeo=new THREE.ConeGeometry(.055,1,3),grassInstancesA=new THREE.InstancedMesh(grassGeo,grassMatA,380),grassInstancesB=new THREE.InstancedMesh(grassGeo,grassMatB,190);let grassAIndex=0,grassBIndex=0;
for(let i=0;i<580;i++){
 const x=(rand()-.5)*160,z=26-rand()*182;if(!dryGround(x,z))continue;
 if(Math.hypot(x,z-4)<5.6||Math.hypot(x-CLEARING.x,z-CLEARING.z)<6.4||Math.hypot(x-VILLAGE_CENTER.x,z-VILLAGE_CENTER.z)<VILLAGE_CLEAR_RADIUS+1.2)continue;
 if(trailRoutes.some(route=>closeToPolyline(x,z,route.points,route.width*.5+.3)))continue;
 const h=.12+rand()*.3;treeDummy.position.set(x,groundHeightAt(x,z)+h*.5,z);treeDummy.scale.set(.85,h,.85);treeDummy.rotation.set(0,rand()*Math.PI*2,(rand()-.5)*.42);treeDummy.updateMatrix();
 if(i%3){if(grassAIndex<grassInstancesA.count)grassInstancesA.setMatrixAt(grassAIndex++,treeDummy.matrix);}else if(grassBIndex<grassInstancesB.count)grassInstancesB.setMatrixAt(grassBIndex++,treeDummy.matrix);
}
grassInstancesA.count=grassAIndex;grassInstancesB.count=grassBIndex;grassInstancesA.instanceMatrix.needsUpdate=true;grassInstancesB.instanceMatrix.needsUpdate=true;grassInstancesA.castShadow=false;grassInstancesB.castShadow=false;const grassGroup=new THREE.Group();grassGroup.add(grassInstancesA,grassInstancesB);scene.add(grassGroup);
const rockSpecs=[];
for(let i=0;i<150;i++){
 const boulder=i>=70,x=(rand()-.5)*168,z=28-rand()*186,radius=boulder?1.1+rand()*1.9:.28+rand()*.62,scaleY=boulder?.55+rand()*.5:.48+rand()*.42;
 const edge=terrain3D.boundaryDistance(x,z);if(boulder?(edge<-15||edge>-4):edge>-6)continue;
 if(Math.hypot(x,z-4)<7||Math.hypot(x-CLEARING.x,z-CLEARING.z)<7.5||Math.hypot(x-VILLAGE_CENTER.x,z-VILLAGE_CENTER.z)<VILLAGE_CLEAR_RADIUS+1.1)continue;
 if(trailRoutes.some(route=>closeToPolyline(x,z,route.points,route.width*.5+1.2)))continue;
 if(treeObstacles.some(o=>{const dx=x-o.x,dz=z-o.z;return dx*dx+dz*dz<(o.radius+radius+.35)*(o.radius+radius+.35);}))continue;
 const height=radius*scaleY,base=groundHeightAt(x,z)-radius*.12;rockSpecs.push({x,z,radius,scaleY,height,base});rockObstacles.push({x,z,radius:radius*.92,height,base});
}
const rockInstances=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),rockMat,rockSpecs.length);
for(let i=0;i<rockSpecs.length;i++){const r=rockSpecs[i];treeDummy.position.set(r.x,r.base+r.height*.48,r.z);treeDummy.scale.set(r.radius,r.height,r.radius);treeDummy.rotation.set(rand(),rand()*Math.PI*2,rand());treeDummy.updateMatrix();rockInstances.setMatrixAt(i,treeDummy.matrix);}
rockInstances.instanceMatrix.needsUpdate=true;rockInstances.computeBoundingSphere();rockInstances.castShadow=!terrainLowSpec;rockInstances.receiveShadow=true;scene.add(rockInstances);
const villageGroup=new THREE.Group();scene.add(villageGroup);
const villageGround=new THREE.Mesh(new THREE.CircleGeometry(13.2,40),mat(0x71694d));villageGround.rotation.x=-Math.PI/2;villageGround.position.set(VILLAGE_CENTER.x,.003,VILLAGE_CENTER.z);villageGround.receiveShadow=true;villageGroup.add(villageGround);
const woodMat=mat(0x59442f),woodLightMat=mat(0x806343),roofMat=mat(0x49362b),fabricGoldMat=mat(0xb76e3b),fabricCreamMat=mat(0xd5b77b),fabricGreenMat=mat(0x587a4b),basketMat=mat(0x765536),doorMat=mat(0x28251c),windowMat=mat(0x93b5ad,.55);
function addVillageBox(parent,geometry,material,x,y,z,sx,sy,sz){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=false;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
// MOD 204 — a cabana e as casas de caixa deram lugar às casas do VilaKit.glb (feitas no Blender), carregadas em buildAct1Props().
function makeVillageHouse(x,z,scale,roofMaterial){const house=new THREE.Group();house.position.set(x,0,z);villageGroup.add(house);const width=3.5*scale,depth=2.8*scale,height=2.15*scale;const body=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),woodMat);body.position.y=height*.5;body.receiveShadow=true;house.add(body);const roof=new THREE.Mesh(new THREE.ConeGeometry(width*.82,1.45*scale,4),roofMaterial);roof.position.y=height+.68*scale;roof.rotation.y=Math.PI/4;roof.castShadow=true;house.add(roof);const door=new THREE.Mesh(new THREE.BoxGeometry(.7*scale,1.25*scale,.08),doorMat);door.position.set(0,.625*scale,depth*.5+.035);house.add(door);for(const side of [-1,1]){const window=new THREE.Mesh(new THREE.BoxGeometry(.48*scale,.43*scale,.07),windowMat);window.position.set(side*width*.27,1.25*scale,depth*.5+.04);house.add(window);}marketObstacles.push({x,z,shape:'box',halfX:width*.57,halfZ:depth*.57,height:height+1.6*scale});return house;}
function makeMarketSign(label,color){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;const ctx=canvas.getContext('2d');ctx.fillStyle='#3b2d1e';ctx.fillRect(0,0,512,160);ctx.strokeStyle='#d4b778';ctx.lineWidth=9;ctx.strokeRect(8,8,496,144);ctx.fillStyle=color;ctx.font='bold '+Math.min(72,Math.floor(430/label.length*1.35))+'px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,256,82);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(1.55,.48),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));}
const fruitGeo=new THREE.SphereGeometry(.16,8,6),fruitMats=[0x4a3a22,0x5a4a1e,0x3a4a24,0x2e2418,0x51402a].map(color=>mat(color)); // MOD 204 — comida apodrecida (roteiro: tudo podre)
function makeFruitStall(x,z,label,green){const stall=new THREE.Group();stall.position.set(x,0,z);if(green)stall.rotation.y=Math.PI;villageGroup.add(stall);
 addVillageBox(stall,new THREE.BoxGeometry(1,1,1),woodLightMat,0,.82,0,2.45,.58,.88);
 for(const sx of [-1,1])for(const sz of [-1,1])addVillageBox(stall,new THREE.BoxGeometry(.12,1.48,.12),woodMat,sx*1.08,.9,sz*.32,1,1,1);
 for(let i=0;i<5;i++)addVillageBox(stall,new THREE.BoxGeometry(.49,.1,1.52),i%2?fabricCreamMat:(green?fabricGreenMat:fabricGoldMat),(i-2)*.49,1.75,0,1,1,1);
 const sign=makeMarketSign(label,green?'#d7ebae':'#ffe3a0');sign.position.set(0,2.14,.47);stall.add(sign);
 for(let basket=0;basket<3;basket++){const bx=(basket-1)*.72;const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.25,.34,.3,8),basketMat);bowl.position.set(bx,1.27,0);stall.add(bowl);for(let j=0;j<4;j++){const fruit=new THREE.Mesh(fruitGeo,fruitMats[(basket*3+j)%fruitMats.length]);fruit.position.set(bx+((j%2)-.5)*.2,1.5+Math.floor(j/2)*.03,(Math.floor(j/2)-.5)*.19);fruit.castShadow=false;stall.add(fruit);}}
 marketObstacles.push({x,z,shape:'box',halfX:1.225,halfZ:.76,height:2.4});return stall;}
const marketStalls=[{x:VILLAGE_CENTER.x+2.85,z:VILLAGE_CENTER.z-2.5,label:'FRUTAS',green:false},{x:VILLAGE_CENTER.x-2.05,z:VILLAGE_CENTER.z+3.75,label:'ERVAS',green:true},{x:VILLAGE_CENTER.x+4.5,z:VILLAGE_CENTER.z+3.0,label:'PROVISÕES',green:false},{x:VILLAGE_CENTER.x+1.8,z:VILLAGE_CENTER.z-7.6,label:'ARTESANATO',green:true}];
for(const stall of marketStalls)makeFruitStall(stall.x,stall.z,stall.label,stall.green);
const bench=new THREE.Group();bench.position.set(VILLAGE_CENTER.x+1.4,0,VILLAGE_CENTER.z+5.4);villageGroup.add(bench);addVillageBox(bench,new THREE.BoxGeometry(1,1,1),woodLightMat,0,.55,0,1.6,.16,.42);for(const x of [-.58,.58])addVillageBox(bench,new THREE.BoxGeometry(.14,.5,.32),woodMat,x,.25,0,1,1,1);
const lanternMat=new THREE.MeshStandardMaterial({color:0xf0bb57,emissive:0x72451a,emissiveIntensity:.65,roughness:.75});
for(const p of [{x:VILLAGE_CENTER.x-8.4,z:VILLAGE_CENTER.z-1},{x:VILLAGE_CENTER.x+7.4,z:VILLAGE_CENTER.z+1},{x:VILLAGE_CENTER.x-1,z:VILLAGE_CENTER.z+11}]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.07,2.05,5),woodMat);pole.position.set(p.x,1.02,p.z);villageGroup.add(pole);const glow=new THREE.Mesh(new THREE.SphereGeometry(.16,7,6),lanternMat);glow.position.set(p.x,1.92,p.z);villageGroup.add(glow);}
for(const p of [{x:VILLAGE_CENTER.x-8.4,z:VILLAGE_CENTER.z-1},{x:VILLAGE_CENTER.x+7.4,z:VILLAGE_CENTER.z+1},{x:VILLAGE_CENTER.x-1,z:VILLAGE_CENTER.z+11}]){const torch=new THREE.PointLight(0xffb060,.35,11,.9);torch.position.set(p.x,1.95,p.z);torch.castShadow=false;villageGroup.add(torch);villageTorchLights.push(torch);}
const villageVendors=[
 {name:'Lia · Frutas',shortName:'FRUTAS',x:marketStalls[0].x,z:marketStalls[0].z+1.65,yaw:Math.PI,greeting:'Frutas… o que sobrou delas. Nem os bichos querem mais.',hints:['Você é novo por aqui? Não pergunte muito em voz alta.','O Téo, das provisões, escuta tudo. Mas não fala de graça.','De noite tem choro na mata. Eu fecho a porta e rezo.','Dizem que o Primeiro Bispo anda por baixo da terra, nos esgotos velhos.','Se você voltou de lá… ainda há esperança.']},
 {name:'Mara · Ervas',shortName:'ERVAS',x:marketStalls[1].x,z:marketStalls[1].z+1.55,yaw:Math.PI*.72,greeting:'Ervas para febre e para fome. A fome está ganhando.',hints:['Cuidado com quem oferece ajuda de graça. Aqui tudo tem preço.','Quer notícia? Compre do Téo. É assim que funciona agora.','A floresta à noite não é lugar de gente viva.','A encosta da montanha tem uma boca de pedra. Ninguém que entrou voltou.','A vila ainda está de pé. Por enquanto.']},
 {name:'Téo · Provisões',shortName:'PROVISÕES',x:marketStalls[2].x,z:marketStalls[2].z+1.65,yaw:Math.PI,greeting:'Provisões… se é que dá pra chamar isso de comida.',hints:['Não vendo para quem não tem nome.','Vai comprar ou vai só olhar?','Eu já te disse o que sabia. Agora some, antes que alguém nos veja.','Você ainda está vivo? Então ande depressa.','Valério caiu? Fale baixo… ainda há outros.']},
 {name:'Nara · Artesanato',shortName:'ARTESANATO',x:marketStalls[3].x,z:marketStalls[3].z+1.55,yaw:Math.PI,greeting:'Faço fechaduras. Hoje só me pedem cadeado para guardar o pouco que resta.',hints:['A trilha da vila vem lá do sudeste da mata.','Os ricos sumiram com tudo. Ficou a gente e as moscas.','Gaiolas na floresta… não é trabalho meu, eu juro.','Os esgotos velhos passam por baixo da montanha.','Obrigada. A vila vai lembrar de você.']}
];
function mergeGrassTuft(sourceRoot){const positions=[],colors=[],indices=[],zUpToYUp=new THREE.Matrix4().makeRotationX(-Math.PI/2);sourceRoot.updateMatrixWorld(true);sourceRoot.traverse(obj=>{if(!obj.isMesh||!obj.geometry||!obj.geometry.attributes.position)return;const geometry=obj.geometry,position=geometry.attributes.position,color=geometry.attributes.color,base=positions.length/3;const vertex=new THREE.Vector3();for(let i=0;i<position.count;i++){vertex.fromBufferAttribute(position,i).applyMatrix4(obj.matrixWorld).applyMatrix4(zUpToYUp);positions.push(vertex.x,vertex.y,vertex.z);colors.push(color?color.getX(i):.38,color?color.getY(i):.56,color?color.getZ(i):.3);}if(geometry.index){for(let i=0;i<geometry.index.count;i++)indices.push(base+geometry.index.getX(i));}else for(let i=0;i<position.count;i++)indices.push(base+i);});if(!positions.length)throw new Error('Grama.glb não contém malhas com vértices');const merged=new THREE.BufferGeometry();merged.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));merged.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));merged.setIndex(indices);merged.computeVertexNormals();merged.computeBoundingBox();merged.computeBoundingSphere();return merged;}
/** Tufo de grama leve: ~9 lâminas (≈30 triângulos) com a altura e as cores do tufo original, que tinha ~380 triângulos. */
function buildLightGrassTuft(src){
 src.computeBoundingBox();const b=src.boundingBox,H=Math.max(.2,b.max.y-b.min.y),W=Math.max(.2,Math.max(b.max.x-b.min.x,b.max.z-b.min.z)),pos=[],col=[],idx=[];
 let seed=12345;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const base=[.2,.3,.13],tip=[.62,.74,.4];let vi=0;
 for(let i=0;i<9;i++){
  const a=rnd()*Math.PI*2,r=rnd()*W*.28,x=Math.cos(a)*r,z=Math.sin(a)*r,h=H*(.55+rnd()*.5),w=Math.max(.035,W*.05),lean=(rnd()-.5)*W*.5,ra=rnd()*Math.PI,cx=Math.cos(ra),cz=Math.sin(ra),ld=rnd()<.5?-1:1;
  const pts=[[0,0,w],[h*.5,lean*.35*ld,w*.8],[h,lean*ld,0]];
  const rows=[[x-cx*w,b.min.y,z-cz*w,x+cx*w,b.min.y,z+cz*w],[x+cz*lean*.35*ld-cx*w*.8,b.min.y+h*.5,z-cx*lean*.35*ld-cz*w*.8,x+cz*lean*.35*ld+cx*w*.8,b.min.y+h*.5,z-cx*lean*.35*ld+cz*w*.8]];
  const t=[x+cz*lean*ld,b.min.y+h,z-cx*lean*ld];
  const k=vi;for(const rw of rows){pos.push(rw[0],rw[1],rw[2],rw[3],rw[4],rw[5]);const f=rw===rows[0]?0:.5;col.push(base[0]+(tip[0]-base[0])*f,base[1]+(tip[1]-base[1])*f,base[2]+(tip[2]-base[2])*f,base[0]+(tip[0]-base[0])*f,base[1]+(tip[1]-base[1])*f,base[2]+(tip[2]-base[2])*f);}
  pos.push(t[0],t[1],t[2]);col.push(tip[0],tip[1],tip[2]);vi+=5;
  idx.push(k,k+1,k+2,k+1,k+3,k+2,k+2,k+3,k+4);
  void pts;
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
/* MOD 186 — grama em blocos de 10 m ao redor do jogador: densa onde se olha, custo constante.
   Cada bloco é gerado uma vez (determinístico) e reaproveitado quando o jogador volta. */
let grassRefresh=null;
function scatterGrassTufts(geometry){
 const lowSpec=terrainLowSpec,CHUNK=10,R=lowSpec?2:3,PER=lowSpec?22:26,cap=(2*R+1)*(2*R+1)*PER;
 const mesh=new THREE.InstancedMesh(geometry,grassMaterial,cap),dummy=new THREE.Object3D(),cache=new Map();
 const blocked=(x,z)=>{if(!dryGround(x,z))return true;if(Math.abs(x-ALTAR_VALLEY.cx)<ALTAR_VALLEY.hx+8&&Math.abs(z-ALTAR_VALLEY.cz)<ALTAR_VALLEY.hz+8)return true;if(Math.hypot(x-COLOSSEUM.center.x,z-COLOSSEUM.center.z)<38||inDesert(x,z))return true; // MOD 206 — sem capim na neve
if(Math.abs(x-DISTRICT.cx)<DISTRICT.hx-2&&Math.abs(z-DISTRICT.cz)<DISTRICT.hz-2&&((x*7.3+z*3.1)%5+5)%5>1.2)return true;if(Math.hypot(x,z-4)<5.8||Math.hypot(x-CLEARING.x,z-CLEARING.z)<6.8||Math.hypot(x-VILLAGE_CENTER.x,z-VILLAGE_CENTER.z)<VILLAGE_CLEAR_RADIUS+1.6)return true;if(trailRoutes.some(route=>closeToPolyline(x,z,route.points,route.width*.5+.6)))return true;if(treeObstacles.some(o=>Math.abs(x-o.x)<o.radius+.5&&Math.hypot(x-o.x,z-o.z)<o.radius+.5))return true;if(rockObstacles.some(o=>Math.abs(x-o.x)<o.radius+.32&&Math.hypot(x-o.x,z-o.z)<o.radius+.32))return true;return marketObstacles.some(o=>o.shape==='box'?Math.abs(x-o.x)<o.halfX+.35&&Math.abs(z-o.z)<o.halfZ+.35:Math.hypot(x-o.x,z-o.z)<o.radius+.35);};
 function chunk(cx,cz){const key=cx+','+cz;let list=cache.get(key);if(list)return list;list=[];let seed=((cx*73856093)^(cz*19349663))>>>0||1;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<PER*2&&list.length<PER;i++){const x=(cx+next())*CHUNK,z=(cz+next())*CHUNK;
   // Campinas mais densas e sub-bosque mais ralo, sem bordas retas entre blocos.
   if(next()>.25+.75*fbm(x*.045+5,z*.045-9,2,71))continue;if(blocked(x,z))continue;
   dummy.position.set(x,groundHeightAt(x,z)+.012,z);dummy.rotation.set(0,next()*Math.PI*2,0);const sc=1.55+next()*1.05;dummy.scale.set(sc,sc*(.75+next()*.45),sc);dummy.updateMatrix();list.push(dummy.matrix.clone());}
  cache.set(key,list);return list;}
 let lastKey='';
 grassRefresh=(px,pz)=>{const cx=Math.floor(px/CHUNK),cz=Math.floor(pz/CHUNK),key=cx+','+cz;if(key===lastKey)return;lastKey=key;let n=0;
  for(let dz=-R;dz<=R;dz++)for(let dx=-R;dx<=R;dx++)for(const m of chunk(cx+dx,cz+dz))mesh.setMatrixAt(n++,m);
  mesh.count=n;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();window.SevenSinsGrassReport={asset:'Grama.glb',instances:n,chunks:cache.size,deviceTier:lowSpec?'mobile':'desktop'};};
 mesh.castShadow=false;mesh.receiveShadow=false;grassGroup.remove(grassInstancesA,grassInstancesB);grassGroup.add(mesh);grassGroup.userData.grassInstances=mesh;grassGeo.dispose();grassMatA.dispose();grassMatB.dispose();
 grassRefresh(player.position.x,player.position.z);
}
const grassMaterial=new THREE.MeshStandardMaterial({color:0x93a67c,vertexColors:true,roughness:1,side:THREE.DoubleSide});
addInstancedWind(grassMaterial,.045,'clamp(position.y*3.25,0.0,1.0)',1.05,'mod163-grass-wind');
new GLTFLoader().load('./Grama.glb?v=mod163-forest-grass-instances',gltf=>{try{const tuftGeometry=buildLightGrassTuft(mergeGrassTuft(gltf.scene));scatterGrassTufts(tuftGeometry);const disposedGeometries=new Set(),disposedMaterials=new Set();gltf.scene.traverse(obj=>{if(!obj.isMesh)return;if(obj.geometry&&!disposedGeometries.has(obj.geometry)){obj.geometry.dispose();disposedGeometries.add(obj.geometry);}for(const material of (Array.isArray(obj.material)?obj.material:[obj.material]))if(material&&!disposedMaterials.has(material)){material.dispose();disposedMaterials.add(material);}});}catch(err){console.warn('Grama.glb não foi instanciada; mantendo a vegetação leve de reserva.',err);}},undefined,err=>console.warn('Grama.glb não carregou; mantendo a vegetação leve de reserva.',err));
const player=new THREE.Group();scene.add(player);player.position.set(0,0,4);
// Inimigo comum: usa Enemy1.glb com as animações que realmente existirem no arquivo.
const enemy=new THREE.Group();scene.add(enemy);enemy.position.set(0,0,-3.2);enemy.visible=false;
const enemyTexture=new THREE.TextureLoader().load('./Enemy1-sprite.png');
enemyTexture.colorSpace=THREE.SRGBColorSpace;
const enemySpriteMaterial=new THREE.MeshStandardMaterial({map:enemyTexture,transparent:true,alphaTest:.06,side:THREE.DoubleSide,roughness:1,emissive:0x000000});
const enemyMaterials=[enemySpriteMaterial];
const enemySprite=new THREE.Mesh(new THREE.PlaneGeometry(1.55,1.95),enemySpriteMaterial);
enemySprite.position.y=.98;enemySprite.castShadow=true;enemy.add(enemySprite);
const enemyModelRoot=new THREE.Group();enemy.add(enemyModelRoot);
const enemyGroundShadow=new THREE.Mesh(new THREE.CircleGeometry(.48,20),new THREE.MeshBasicMaterial({color:0x142019,transparent:true,opacity:.35,depthWrite:false}));
enemyGroundShadow.rotation.x=-Math.PI/2;enemyGroundShadow.position.y=.012;enemy.add(enemyGroundShadow);
const wardenRing=new THREE.Mesh(new THREE.TorusGeometry(.78,.05,6,28),new THREE.MeshBasicMaterial({color:0x9a2036,transparent:true,opacity:.92}));
wardenRing.name='warden-ring';wardenRing.rotation.x=Math.PI/2;wardenRing.position.y=.06;wardenRing.visible=false;enemy.add(wardenRing);
let rigTimeScales=null;
var lateSystemsReady=false,finaleReady=false;
const BOSS_PROFILES=['vorgazhek','zarkhael','veraxion','valerio'];
let enemyModel=null,enemyMixer=null,enemyClips=[],enemyActions={},enemyCurrentAction=null,enemyCurrentRole='idle',enemyHasDeathClip=false;
let enemyLoadState='idle';
let enemyHP=100,enemyMaxHP=100,enemyAlive=true,enemyHitFlash=0,enemyKnockback=0,enemyKnockbackX=0,enemyKnockbackZ=0;
let encounterProfile='captor',wardenPhaseUsed=false,wardenFanPending=false;
let checkpointX=0,checkpointZ=4;
let enemyAttackCooldown=0,enemyAttackElapsed=0,enemyAttackDuration=0,enemyAttackHitAt=0,enemyAttackResolved=true,enemyAttackFacingX=0,enemyAttackFacingZ=1,enemyAttackRole='attack';
let enemyDashRemaining=0,enemyDashCooldown=0,enemySpecialCooldown=0,enemyCastCooldown=0,enemyBlockCooldown=0,enemyCastElapsed=0,enemyCastDuration=0,enemyCastResolved=true,enemyDashDirectionX=0,enemyDashDirectionZ=1,enemyNextRangedRole='cast';
const enemyProjectiles=[];
let attackCooldown=0,pendingEnemyHitAt=0,playerAttackFacingX=0,playerAttackFacingZ=1;
let playerHP=100,playerMaxHP=100,playerInvulnerableUntil=0,playerRespawnAt=0;
const ENEMY_ATTACK_RANGE=2.25,ENEMY_ATTACK_DAMAGE=18,PLAYER_SPAWN={x:0,z:4};
function playEnemyAnimation(role,fade=.1,once=false){
 const next=enemyActions[role];if(!next)return false;
 const timeScale=rigTimeScales&&rigTimeScales[role]!==undefined?rigTimeScales[role]:role==='idle'?.38:role==='run'?1.08:1;
 if(enemyCurrentAction===next){enemyCurrentRole=role;next.setEffectiveTimeScale(timeScale);return true;}
 if(enemyCurrentAction)enemyCurrentAction.fadeOut(fade);
 next.reset();next.enabled=true;next.setEffectiveWeight(1);next.setEffectiveTimeScale(timeScale);
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
function retargetEnemyMovementClipToPlayer(role,sourceRoot,sourceClip){
 if(!model||!mixer||!sourceRoot||!sourceClip)return false;
 let sourceMesh=null,targetMesh=null;
 sourceRoot.traverse(o=>{if(!sourceMesh&&o.isSkinnedMesh&&o.skeleton)sourceMesh=o;});
 model.traverse(o=>{if(!targetMesh&&o.isSkinnedMesh&&o.skeleton)targetMesh=o;});
 if(!sourceMesh||!targetMesh)return false;
 // Não aplicar uma animação retargetada se os rigs compartilham poucos ossos nomeados.
 // Isso evita deformar o protagonista com um clipe do Enemy1 incompatível.
 const normalizeBone=name=>String(name||'').toLowerCase().replace(/^mixamorig[:_]?/,'').replace(/[^a-z0-9]/g,'');
 const sourceBones=new Set(sourceMesh.skeleton.bones.map(b=>normalizeBone(b.name)));
 const targetBones=new Set(targetMesh.skeleton.bones.map(b=>normalizeBone(b.name)));
 const sharedBones=[...sourceBones].filter(name=>name&&targetBones.has(name));
 const hasPelvis=sharedBones.some(name=>/^(hips|pelvis)$/.test(name)),hasLeftLeg=sharedBones.some(name=>/left.*(upleg|thigh|leg)$/.test(name)),hasRightLeg=sharedBones.some(name=>/right.*(upleg|thigh|leg)$/.test(name)),hasCoreLegs=hasPelvis&&hasLeftLeg&&hasRightLeg;
 console.info('Compatibilidade de rig Enemy1 → protagonista:',role,sharedBones.length,'ossos compartilhados');
 if(sharedBones.length<12||!hasCoreLegs){console.warn('Retarget cancelado por compatibilidade insuficiente:',role);return false;}
 try{
  const clip=retargetClip(targetMesh,sourceMesh,sourceClip,{useFirstFramePosition:false,preservePosition:false});
  if(!clip||!clip.tracks||!clip.tracks.length){console.warn('Retarget sem canais compatíveis para '+role,sourceClip.name);return false;}
  clip.name='Enemy1_'+sourceClip.name+'_retarget_'+role;
  actions[role]=mixer.clipAction(clip);console.info('Animação Enemy1 aplicada ao protagonista:',role,sourceClip.name,clip.tracks.length,'canais');return true;
 }catch(err){console.warn('Não foi possível retargetar '+role+' do Enemy1:',err);return false;}
}
function loadEnemyModel(){if(enemyLoadState!=='idle')return;enemyLoadState='loading';
new GLTFLoader().load('./Enemy1-lod.glb?v=mod194-lod',gltf=>{
 const imported=gltf.scene;
 imported.traverse(o=>{
  if(!o.isMesh)return;
  o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;
  const materials=Array.isArray(o.material)?o.material:[o.material];
  for(const material of materials)if(material&&!enemyMaterials.includes(material))enemyMaterials.push(material);
 });
 const bounds=new THREE.Box3().setFromObject(imported),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 if(size.y>.001){const scale=.88/size.y;imported.scale.setScalar(scale);imported.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);}
 enemyModelRoot.add(imported);enemyModel=imported;enemySprite.visible=false;
 enemyClips=gltf.animations||[];enemyMixer=new THREE.AnimationMixer(imported);
 const key=c=>String(c&&c.name||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 const exact=name=>enemyClips.find(c=>key(c)===name);
 const has=part=>enemyClips.find(c=>key(c).includes(part));
 // MOD 186 — o Enemy1.glb exporta 6 clipes com nomes UUID. Papéis conferidos por prévia visual e pelo
 // movimento dos ossos (quadril/mão); sem isso o "cast" podia cair no salto e o inimigo não tinha repouso.
 const ENEMY1_CLIP_TABLE={'01a14b5a-2ee6-75dc-982f-8965372f192b':'idle','01a14b5c-5fd2-74f9-b256-af9f522f53cb':'cast','01a14b57-0772-77b2-9da3-b6644a5d1cae':'attack','01a14b51-9352-70b9-8540-e7713d7152b1':'block','01a14b4e-e964-72e9-9e35-9c0c586edbec':'dash','01a14b4d-06e7-7100-a90e-f7462489c8b9':'jump'};
 const byTable=role=>enemyClips.find(c=>ENEMY1_CLIP_TABLE[c.name]===role);
 // Clipes com deslocamento do quadril (investida/esquiva/salto) viram "no lugar": quem move o inimigo é o código.
 const inPlace=clip=>{if(!clip)return clip;const copy=clip.clone();for(const track of copy.tracks){if(!/(hips|pelvis)[^.]*\.position$/i.test(track.name))continue;const v=track.values;for(let i=3;i<v.length;i+=3){v[i]=v[0];v[i+2]=v[2];}}return copy;};
 const retargetSources={dash:exact('dash'),jump:exact('jump')||exact('jumping')||exact('pulo')||exact('pular')||exact('saltar')||exact('salto')};
 const clipsByRole={
  idle:byTable('idle')||exact('idle')||exact('breath')||exact('breathing')||exact('respiracao'),
  walk:exact('andar')||exact('walk')||exact('walking'),
  run:exact('correr')||exact('run')||exact('running'),
  attack:byTable('attack')||exact('atq1')||exact('attack1')||exact('attack01'),
  attack2:enemyClips.find(c=>/(habilidade3|skill3|skill03|atq2|attack2|skill2)/.test(key(c))),
  cast:byTable('cast')||enemyClips.find(c=>/(handforward|handfront|maofrente|point|apont|cast|spell|magic|power|shoot|projectile|habilidade2|skill2|atq2|attack2)/.test(key(c))),
  dash:inPlace(byTable('dash'))||exact('dash'),
  block:inPlace(byTable('block'))||exact('block'),
  jump:inPlace(byTable('jump'))||exact('jump')||exact('jumping')||exact('pulo')||exact('pular')||exact('saltar')||exact('salto'),
  hit:exact('hit')||exact('hurt')||exact('damage'),
  death:exact('death')||exact('die')||exact('morte')
 };
 // Não depender de um único nome: distribui clipes reais ainda não usados em papéis especiais distintos.
 const usedClips=new Set([...Object.values(clipsByRole).filter(Boolean),...Object.keys(ENEMY1_CLIP_TABLE).map(n=>enemyClips.find(c=>c.name===n)).filter(Boolean)]);
 const fallbackPool=enemyClips.filter(c=>!usedClips.has(c)&&!/(idle|breath|respir|andar|walk|correr|running|^run$|dash|block|jump|pulo|saltar|atq1|attack0?1|hit|hurt|damage|death|die|morte|falar|talk)/.test(key(c)));
 if(!clipsByRole.attack2){
  clipsByRole.attack2=fallbackPool.find(c=>/(habilidade|skill|atq|attack|power|slash|strike|sword)/.test(key(c)))||fallbackPool[0]||null;
  if(clipsByRole.attack2)usedClips.add(clipsByRole.attack2);
 }
 if(!clipsByRole.cast||clipsByRole.cast===clipsByRole.attack2){
  clipsByRole.cast=enemyClips.find(c=>c!==clipsByRole.attack2&&!usedClips.has(c)&&/(hand|point|apont|cast|spell|magic|power|habilidade|skill|atq|attack)/.test(key(c)))||
   fallbackPool.find(c=>c!==clipsByRole.attack2&&!usedClips.has(c))||null;
 }
 if(clipsByRole.cast===clipsByRole.attack2)clipsByRole.cast=null;
 window.Enemy1AnimationRoleReport=Object.fromEntries(Object.entries(clipsByRole).map(([role,clip])=>[role,clip?clip.name:null]));
 for(const role of Object.keys(clipsByRole)){const clip=clipsByRole[role];if(clip)enemyActions[role]=enemyMixer.clipAction(clip);}
 enemyHasDeathClip=!!clipsByRole.death;
 // Usa Dash e Jump reais do Enemy1 no protagonista, convertidos para o esqueleto dele.
 // Só clipes nomeados seguem para o protagonista (comportamento anterior preservado; rigs diferentes).
 if(retargetSources.dash)retargetEnemyMovementClipToPlayer('dash',imported,retargetSources.dash);
 if(retargetSources.jump)retargetEnemyMovementClipToPlayer('jump',imported,retargetSources.jump);
 // Sem clipe de repouso identificado, não forçar caminhada ou pulo como idle.
 if(!enemyActions.idle)console.warn('Enemy1 sem clipe de repouso identificado.');
 if(enemyActions.idle)playEnemyAnimation('idle',0);
 window.Enemy1AnimationReport=enemyClips.map(c=>c.name);
 console.info('Enemy1.glb animações:',window.Enemy1AnimationReport);
},undefined,err=>{console.error('Enemy1.glb não carregou; mantendo sprite de segurança.',err);enemyLoadState='failed';enemyModelRoot.visible=false;});

}

function spawnEnemyProjectile(kind,spreadAngle=0){
 const group=new THREE.Group(),slash=kind==='slash';
 const dark=new THREE.MeshStandardMaterial({color:0x09080d,emissive:slash?0x210d2d:0x170d28,emissiveIntensity:slash?1.15:.85,metalness:.25,roughness:.35,transparent:true,opacity:.96,depthWrite:false});
 const edge=new THREE.MeshStandardMaterial({color:0x6f1728,emissive:0x8b1631,emissiveIntensity:1.35,transparent:true,opacity:.9,depthWrite:false});
 if(slash){
  // Corte reto, escuro e estreito; sem anel giratório para não parecer um ímã.
  const blade=new THREE.Mesh(new THREE.CylinderGeometry(.035,.16,1.45,7,1,true),dark);blade.rotation.x=Math.PI/2;group.add(blade);
  const core=new THREE.Mesh(new THREE.CylinderGeometry(.012,.055,1.32,5,1,true),new THREE.MeshBasicMaterial({color:0x050407,transparent:true,opacity:.98,depthWrite:false}));core.rotation.x=Math.PI/2;group.add(core);
  const sparkMat=new THREE.LineBasicMaterial({color:0x7e1830,transparent:true,opacity:.98});
  for(let side of [-1,1]){const points=[new THREE.Vector3(side*.08,-.07,-.62),new THREE.Vector3(side*.17,.09,-.39),new THREE.Vector3(side*.08,-.12,-.17),new THREE.Vector3(side*.19,.07,.04),new THREE.Vector3(side*.07,-.05,.27),new THREE.Vector3(side*.13,.1,.48),new THREE.Vector3(0,0,.66)];const bolt=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),sparkMat);bolt.position.x=side*.09;group.add(bolt);}
  group.scale.set(1.0,.72,1.0);
 }else{for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.38+i*.13,.045,5,16),i===1?edge:dark);ring.position.y=(i-1)*.25;ring.rotation.x=(i-1)*.28;group.add(ring);}const core=new THREE.Mesh(new THREE.SphereGeometry(.19,8,6),dark);group.add(core);group.scale.set(.9,1.25,.9);}
 const dx=player.position.x-enemy.position.x,dz=player.position.z-enemy.position.z,len=Math.hypot(dx,dz)||1,baseX=dx/len,baseZ=dz/len,angle=Math.atan2(baseX,baseZ)+spreadAngle,dirX=Math.sin(angle),dirZ=Math.cos(angle);
 group.position.set(enemy.position.x+dirX*.82,enemy.position.y+(slash?1.12:1.0),enemy.position.z+dirZ*.82);group.rotation.y=angle;scene.add(group);
 enemyProjectiles.push({group,kind,dirX,dirZ,speed:slash?8.2:5.2,life:slash?1.25:2.15,damage:slash?13:16,spin:slash?0:9.2});
}
function updateEnemyProjectiles(dt){
 for(let i=enemyProjectiles.length-1;i>=0;i--){const p=enemyProjectiles[i];p.life-=dt;p.group.position.x+=p.dirX*p.speed*dt;p.group.position.z+=p.dirZ*p.speed*dt;if(p.kind!=='slash'){p.group.rotation.z+=p.spin*dt;p.group.rotation.x+=p.spin*.23*dt;}const dist=Math.hypot(p.group.position.x-player.position.x,p.group.position.z-player.position.z);
  if(dist<(p.kind==='slash'?.78:1.05)&&Math.abs(p.group.position.y-(player.position.y+1))<1.25){if(damagePlayerFromEnemyAttack(p.damage))p.life=0;}
  if(p.life<=0){scene.remove(p.group);p.group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});enemyProjectiles.splice(i,1);}
 }
}
function updateEnemyHud(){
 const p=enemy.position.clone().add(new THREE.Vector3(0,2.2,0)).project(camera);
 const hud=document.getElementById('enemy-hud');
 if(!hud)return;
 const visible=(BOSS_PROFILES.includes(encounterProfile)||(p.z>-1&&p.z<1&&p.x>-1.2&&p.x<1.2&&p.y>-1.2&&p.y<1.2))&&enemyAlive&&enemy.visible;
 hud.style.display=visible?'block':'none';
 if(visible){hud.style.left=((p.x*.5+.5)*innerWidth)+'px';hud.style.top=((-p.y*.5+.5)*innerHeight)+'px';}
 const fill=document.getElementById('enemy-hp-fill');
 if(fill)fill.style.width=enemyHpPercent()+'%';
}
function tryPlayerAttack(){
 const now=performance.now();if(now<attackCooldown||dialogueOpen||namePromptOpen||awakeningActive||portalPull||cineActive)return;
 // MOD 187 — o golpe sai sempre (treino, exploração); o dano só é resolvido quando há um inimigo ativo.
 if(defending)setDefending(false);
 const engaged=combatStepNow()&&enemy.visible&&enemyAlive;if(engaged)assistAimAtEnemy();else if(cameraDistance<1.05){playerYaw=cameraYaw+Math.PI;player.rotation.y=playerYaw;}
 if(!model||!mixer||!attackClips.length){status.textContent='Não foi encontrado um clipe de ataque válido no Protagonista.glb.';return;}
 const attackClip=attackClips[attackClipIndex++%attackClips.length],duration=Number(attackClip&&attackClip.duration);
 if(!validAttackClip(attackClip)||!Number.isFinite(duration)||duration<=0){status.textContent='O ataque não tem uma animação válida; nenhum dano foi aplicado.';return;}
 attackCooldown=now+560;worldAudio.swing();{const step=nextComboStep(now);if(step===3){showCombatCallout(isNightHour(gameClock.hour)?'CORTE NEGRO':'CORTE DE LUZ');spawnHolyProjectile('arc',0,.16);worldAudio.whoosh();}}const attackAction=mixer.clipAction(attackClip);
 if(activeAction&&activeAction!==attackAction)activeAction.fadeOut(.07);
 attackAction.reset();attackAction.enabled=true;attackAction.setEffectiveWeight(1);attackAction.setLoop(THREE.LoopOnce,1);attackAction.clampWhenFinished=true;attackAction.fadeIn(.07).play();activeAction=attackAction;actionUntil=now+duration*1000;
 playerAttackFacingX=Math.sin(playerYaw);playerAttackFacingZ=Math.cos(playerYaw);
 if(engaged)pendingEnemyHitAt=now+Math.min(460,Math.max(190,duration*.28*1000));
 spawnSlashTrail(duration);startFpSwing();
}
function resolvePlayerAttackHit(){
 if(!enemyAlive||!combatStepNow()||!enemy.visible)return;
 const dx=enemy.position.x-player.position.x,dz=enemy.position.z-player.position.z;
 const distance=Math.hypot(dx,dz),facing=(dx*playerAttackFacingX+dz*playerAttackFacingZ)/(distance||1);
 if(distance>SWORDS[equippedSword].reach||facing<.28||Math.abs(player.position.y-enemy.position.y)>1.05){status.textContent=distance>2.0?'Chegue mais perto para acertar o golpe':facing<.28?'O golpe não alcançou o inimigo':'O inimigo está fora da altura do golpe';return;}
 {const crit=Math.random()<.12,dmg=Math.round(SWORDS[equippedSword].damage*(1+statsForLevel(playerLevel()).damageBonus)*(crit?1.6:1)*comboMultiplier()*scrollMul());enemyHP=Math.max(0,enemyHP-dmg);onEnemyDamaged(dmg,crit);}({mana:playerMana,lastGainAt:manaHitAt}=manaFromHit(playerMana,manaHitAt,performance.now()));worldAudio.hit();enemyHitFlash=.2;enemyKnockback=comboCount===3?.9:.42;enemyKnockbackX=dx/(distance||1);enemyKnockbackZ=dz/(distance||1);
 if(enemyCurrentRole==='attack'){enemyAttackResolved=true;enemyAttackElapsed=enemyAttackDuration;playEnemyAnimation('idle',.05);}
 status.textContent=enemyHP===0?'Inimigo derrotado!':'Acertou! Vida do inimigo: '+enemyHP+'%';
 if(enemyHP===0){enemyAlive=false;document.getElementById('enemy-hud').style.display='none';if(!playEnemyAnimation('death',.06,true))enemyHasDeathClip=false;status.textContent='Caminho liberado.';setTimeout(()=>advanceAfterEnemyDefeat(),850);}
 else if(!BOSS_PROFILES.includes(encounterProfile)||(++bossHitCounter%3===0&&enemyCurrentRole!=='attack'))playEnemyAnimation('hit',.05,true);
}
function updatePlayerHud(){
 const hud=document.getElementById('player-hud'),fill=document.getElementById('player-hp-fill'),text=document.getElementById('player-hp-text');
 if(hud)hud.hidden=false;
 if(fill)fill.style.width=Math.max(0,Math.min(100,playerHP/playerMaxHP*100))+'%';
 if(text)text.textContent=Math.max(0,Math.ceil(playerHP))+' / '+playerMaxHP;
}
function damagePlayerFromEnemyAttack(damage=ENEMY_ATTACK_DAMAGE){
 const now=performance.now();if(playerHP<=0||now<playerInvulnerableUntil||cineActive)return false;
 const raw=encounterProfile==='warden'?Math.max(1,Math.round((Number(damage)||ENEMY_ATTACK_DAMAGE)*1.15)):Math.max(1,Number(damage)||ENEMY_ATTACK_DAMAGE);
 const scaled=applyDefenseToHit(raw);if(scaled<=0){playerInvulnerableUntil=now+450;return false;}
 fightHitTaken=true;onPlayerDamaged(scaled,defending);
 playerHP=Math.max(0,playerHP-scaled);playerInvulnerableUntil=now+850;updatePlayerHud();worldAudio.hurt();
 if(playerHP===0){
  if(encounterProfile==='warden')spendHeart('warden');
  if(dimBattle&&dimBattle.active)dimensionPlayerDown();
  else if(encounterProfile==='vorgazhek')bossDefeatedPlayer();
  else if(finaleReady&&finaleFighting)finalePlayerDown();
  else if(lateSystemsReady&&BOSS_PROFILES.includes(encounterProfile))lateBossPlayerDown();
  playerRespawnAt=now+1450;moveVX=moveVZ=0;dashRemaining=0;pendingEnemyHitAt=0;
  const death=actions.death||actions.hit;if(death){playOnce(death===actions.death?'death':'hit',.06);actionUntil=now+Math.max(250,Math.min(1300,death.getClip().duration*1000));}
  status.textContent='Protagonista derrotado. Retornando à trilha…';
 }else{
  if(actions.hit){playOnce('hit',.05);actionUntil=now+Math.max(220,Math.min(700,actions.hit.getClip().duration*1000));}
  status.textContent=(defending?'Golpe bloqueado. ':'O golpe do inimigo atingiu você. ')+'Vida: '+playerHP+' / '+playerMaxHP;
 }
 return true;
}
function startEnemyAttack(role='attack'){
 const action=enemyActions[role],clip=action&&action.getClip(),duration=Number(clip&&clip.duration);
 if(!action||!Number.isFinite(duration)||duration<=0||!playEnemyAnimation(role,.08,true))return false;
 enemyAttackRole=role;enemyAttackElapsed=0;enemyAttackDuration=duration;enemyAttackHitAt=Math.min(duration*.55,Math.max(.08,duration*.42));
 enemyAttackFacingX=Math.sin(enemy.rotation.y);enemyAttackFacingZ=Math.cos(enemy.rotation.y);enemyAttackResolved=false;enemyAttackCooldown=duration+.65;telegraphEnemyAttack(enemyAttackHitAt);if(BOSS_PROFILES.includes(encounterProfile)){bossComboHits=0;enemyAttackHitAt=duration*.3;enemyAttackCooldown=duration+(bossRageAnnounced?.35:.9);}return true;
}
function enemyAttackContactIsValid(distance,heightDelta,facing){return Number.isFinite(distance)&&distance<=(BOSS_PROFILES.includes(encounterProfile)?3.1:2.4)&&heightDelta<=1.2;}
function updateEnemyAI(dt){
 if(enemyAttackCooldown>0)enemyAttackCooldown=Math.max(0,enemyAttackCooldown-dt);
 if(!enemy.visible||!enemyAlive||!combatStepNow()||dialogueOpen||cineActive||playerHP<=0){if(enemyCurrentRole!=='idle'&&enemyActions.idle){enemyAttackResolved=true;enemyAttackElapsed=enemyAttackDuration;enemyDashRemaining=0;enemyCastResolved=true;wardenFanPending=false;playEnemyAnimation('idle',.1);}return;}
 if(enemyKnockback>0){const step=Math.min(enemyKnockback,dt*2.5),nextX=THREE.MathUtils.clamp(enemy.position.x+enemyKnockbackX*step,-1900,1900),nextZ=THREE.MathUtils.clamp(enemy.position.z+enemyKnockbackZ*step,-1900,1900);if(!enemyBlockedAt(nextX,enemy.position.z))enemy.position.x=nextX;if(!enemyBlockedAt(enemy.position.x,nextZ))enemy.position.z=nextZ;enemyKnockback=Math.max(0,enemyKnockback-step);return;}
 // Deixe a animação de reação terminar antes de voltar a perseguir; evita cortá-la no primeiro quadro.
 if(enemyCurrentRole==='hit'){
  const clip=enemyCurrentAction&&enemyCurrentAction.getClip();
  if(clip&&enemyCurrentAction.time<clip.duration-.025)return;
  playEnemyAnimation('idle',.08);
 }
 if(enemyCurrentRole==='block'){
  const clip=enemyCurrentAction&&enemyCurrentAction.getClip();
  if(clip&&enemyCurrentAction.time<clip.duration-.025)return;
  playEnemyAnimation('idle',.08);
 }
 if(enemyCurrentRole==='dash'&&enemyDashRemaining<=0)playEnemyAnimation('idle',.08);
 const dx=player.position.x-enemy.position.x,dz=player.position.z-enemy.position.z,distance=Math.hypot(dx,dz);
 if(enemyCurrentRole==='cast'){
  enemyCastElapsed+=dt;
  const castReleaseAt=wardenFanPending?enemyCastDuration*.62:enemyCastDuration*.42;
  if(!enemyCastResolved&&enemyCastElapsed>=castReleaseAt){enemyCastResolved=true;if(wardenFanPending){wardenFanPending=false;wardenPhaseUsed=true;[-.62,-.31,0,.31,.62].forEach(a=>spawnEnemyProjectile('slash',a));}else{spawnEnemyProjectile('tornado',-.34);spawnEnemyProjectile('tornado',0);spawnEnemyProjectile('tornado',.34);}}
  if(enemyCastElapsed<enemyCastDuration)return;
  playEnemyAnimation('idle',.08);
 }
 if(enemyCurrentRole!=='attack'&&enemyCurrentRole!=='attack2'){const targetYaw=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(targetYaw-enemy.rotation.y),Math.cos(targetYaw-enemy.rotation.y));enemy.rotation.y+=delta*(1-Math.exp(-14*dt));}
 if(enemyCurrentRole==='attack'||enemyCurrentRole==='attack2'){
  enemyAttackElapsed+=dt;const role=enemyAttackRole,action=enemyActions[role];
  if(!enemyAttackResolved&&enemyAttackElapsed>=enemyAttackHitAt){enemyAttackResolved=true;if(role==='attack'&&BOSS_PROFILES.includes(encounterProfile)&&bossComboHits<2){bossComboHits++;enemyAttackResolved=false;enemyAttackHitAt+=enemyAttackDuration*.2;}if(role==='attack'){const contactDistance=Math.hypot(dx,dz),facing=(dx*enemyAttackFacingX+dz*enemyAttackFacingZ)/(contactDistance||1),heightDelta=Math.abs(player.position.y-enemy.position.y);const attackStillRunning=enemyCurrentAction===action&&action&&enemyAttackElapsed<=enemyAttackDuration+.02;if(attackStillRunning&&enemyAttackContactIsValid(contactDistance,heightDelta,facing))damagePlayerFromEnemyAttack();}else if(role==='attack2'){spawnEnemyProjectile('slash',-.22);spawnEnemyProjectile('slash',0);spawnEnemyProjectile('slash',.22);}}
  if(enemyAttackElapsed<enemyAttackDuration)return;playEnemyAnimation('idle',.08);
 }
 if(enemyCurrentRole==='dash'&&enemyDashRemaining>0){
  const step=Math.min(8.0*dt,enemyDashRemaining*8.0);enemyDashRemaining=Math.max(0,enemyDashRemaining-dt);
  const nx=THREE.MathUtils.clamp(enemy.position.x+enemyDashDirectionX*step,-1900,1900),nz=THREE.MathUtils.clamp(enemy.position.z+enemyDashDirectionZ*step,-1900,1900);
  if(!enemyBlockedAt(nx,enemy.position.z))enemy.position.x=nx;if(!enemyBlockedAt(enemy.position.x,nz))enemy.position.z=nz;
  if(enemyDashRemaining>0)return;
 }
 // Avança com dash antes de escolher especiais; a antiga ordem tornava o dash praticamente inalcançável.
 if(enemyActions.dash&&enemyDashCooldown<=0&&((distance>4.8&&distance<=11)||(distance<1.75&&enemyAttackCooldown>0))){
  if(playEnemyAnimation('dash',.06,true)){
   const retreat=distance<1.75;
   enemyDashDirectionX=retreat?-dx/(distance||1):dx/(distance||1);
   enemyDashDirectionZ=retreat?-dz/(distance||1):dz/(distance||1);
   enemyDashRemaining=.34;enemyDashCooldown=nextDashCooldown();return;
  }
 }
 if(encounterProfile==='warden'&&!wardenPhaseUsed&&enemyHP<=enemyMaxHP*.55&&distance>1.8&&distance<=9.5&&enemyActions.cast&&enemyCastCooldown<=0){
  const fanClip=enemyActions.cast.getClip();
  if(fanClip&&playEnemyAnimation('cast',.08,true)){wardenFanPending=true;enemyCastCooldown=6.4;enemyCastElapsed=0;enemyCastDuration=fanClip.duration;enemyCastResolved=false;status.textContent='O guarda abre os braços. O corte vem largo — saia da frente.';return;}
 }
 // Prioriza alternância real dos especiais antes do golpe básico quando há distância para lançar.
 if(distance>1.65&&distance<=8.5){
  const preferred=enemyNextRangedRole||'cast',roles=preferred==='cast'?['cast','attack2']:['attack2','cast'];
  for(const rangedRole of roles){
   const clipAction=enemyActions[rangedRole];
   const available=!!clipAction&&(rangedRole==='cast'?enemyCastCooldown<=0:enemySpecialCooldown<=0);
   if(!available)continue;
   const duration=clipAction.getClip().duration;
   if(!playEnemyAnimation(rangedRole,.08,true))continue;
   enemyNextRangedRole=rangedRole==='cast'?'attack2':'cast';
   if(rangedRole==='cast'){enemyCastCooldown=4.6;if(BOSS_PROFILES.includes(encounterProfile)&&bossRageAnnounced){wardenFanPending=true;enemyCastCooldown=3.2;}enemyCastElapsed=0;enemyCastDuration=duration;enemyCastResolved=false;}
   else{enemySpecialCooldown=3.1;enemyAttackRole='attack2';enemyAttackElapsed=0;enemyAttackDuration=duration;enemyAttackHitAt=Math.min(duration*.52,Math.max(.12,duration*.4));enemyAttackResolved=false;enemyAttackCooldown=.25;}
   return;
  }
 }
 if(distance<=ENEMY_ATTACK_RANGE&&enemyActions.attack&&enemyAttackCooldown<=0){if(!startEnemyAttack('attack'))playEnemyAnimation('idle',.08);return;}
 if(distance<1.55&&enemyAttackCooldown>0){playEnemyAnimation('idle',.08);return;}
 if(distance>1.9&&distance<=3.5&&enemyActions.block&&enemyBlockCooldown<=0&&Math.random()<.008){
  if(playEnemyAnimation('block',.06,true)){enemyBlockCooldown=3.0;const side=enemy.rotation.y+Math.PI/2,sx=enemy.position.x+Math.sin(side)*.65,sz=enemy.position.z+Math.cos(side)*.65;if(!blockedAt(sx,enemy.position.z))enemy.position.x=sx;if(!blockedAt(enemy.position.x,sz))enemy.position.z=sz;return;}
 }
 const running=distance>7.5&&!!enemyActions.run,role=running?'run':'walk',speed=running?3.0:1.35,stopDistance=ENEMY_ATTACK_RANGE-.18,step=Math.min(speed*dt,Math.max(0,distance-stopDistance));if(step<=0){playEnemyAnimation('idle',.1);return;}
 const nextX=THREE.MathUtils.clamp(enemy.position.x+dx/(distance||1)*step,-1900,1900),nextZ=THREE.MathUtils.clamp(enemy.position.z+dz/(distance||1)*step,-1900,1900);let moved=false;
 if(!enemyBlockedAt(nextX,enemy.position.z)){enemy.position.x=nextX;moved=true;}if(!enemyBlockedAt(enemy.position.x,nextZ)){enemy.position.z=nextZ;moved=true;}
 playEnemyAnimation(moved?(role==='run'&&enemyActions.run?'run':'walk'):'idle',.12);
}
function updatePlayerRespawn(now){
 if(playerHP>0||!playerRespawnAt||now<playerRespawnAt)return;
 player.position.set(checkpointX,terrainHeightAt(checkpointX,checkpointZ),checkpointZ);playerHP=playerMaxHP;playerInvulnerableUntil=now+1000;playerRespawnAt=0;
 moveVX=moveVZ=0;verticalVelocity=0;grounded=true;dashRemaining=0;actionUntil=0;pendingEnemyHitAt=0;if(mixer){mixer.stopAllAction();activeAction=null;}if(actions.idle)play('idle',.08);updatePlayerHud();status.textContent='Você voltou à trilha; o inimigo continua à espreita.';
}

// Anjo-Guia: usa o modelo GLB original adicionado ao repositório.
const guide=new THREE.Group();scene.add(guide);guide.position.set(3.3,0,-5.4);
const guideBreathingPivot=new THREE.Group();guide.add(guideBreathingPivot);
const guideModelRoot=new THREE.Group();guideBreathingPivot.add(guideModelRoot);
let guideProceduralBreath=true;
let guideModel=null,guideFitRoot=null,guideIdleMixer=null,playerIdleClip=null,playerReferenceHeight=1.7,vendorsSpawned=false,guideReferenceBounds=null;
const villageNpcMixers=[];
var npcCullFrame=0,_npcV=null;
function updateNpcCulling(){
 if((++npcCullFrame%10))return;if(!_npcV)_npcV=new THREE.Vector3();
 for(const m of villageNpcMixers){const root=m.getRoot&&m.getRoot();if(!root||!root.getWorldPosition)continue;root.getWorldPosition(_npcV);
  const d=Math.hypot(_npcV.x-player.position.x,_npcV.z-player.position.z),far=d>62;
  if(far!==!!m.__far){m.__far=far;root.visible=!far;}}
}

function playNativeGuideIdle(clips){
 const list=clips||[];
 const key=c=>String(c&&c.name||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 window.GuideAnimationReport=list.map(c=>({name:c.name,duration:c.duration,tracks:(c.tracks||[]).length}));
 // Nunca usar o primeiro clipe como fallback: ele pode ser corrida ou ataque.
 const idle=list.find(c=>/(breath|respir)/.test(key(c))&&!/(walk|run|attack|jump|fall|hit|death|cast)/.test(key(c)))||list.find(c=>/idle/.test(key(c))&&!/(walk|run|attack|jump|fall|hit|death|cast)/.test(key(c)));
 if(!idle||!guideModel){guideProceduralBreath=true;if(guideModel){const bones=[];guideModel.traverse(o=>{if(o.isBone&&/(spine|chest|torso|upper.?body)/i.test(o.name||''))bones.push({bone:o,baseX:o.rotation.x,baseScaleY:o.scale.y});});guideModel.userData.breathBones=bones.slice(-3);}console.warn('Anjo-Guia sem clipe de respiração/idle identificado; usando respiração procedural reforçada. Clipes reais:',window.GuideAnimationReport);return;}
 const tracks=(idle.tracks||[]).filter(track=>!String(track.name||'').toLowerCase().endsWith('.scale'));
 const clip=tracks.length?new THREE.AnimationClip(idle.name,idle.duration,tracks,idle.blendMode):idle;
 guideIdleMixer=new THREE.AnimationMixer(guideModel);const action=guideIdleMixer.clipAction(clip);action.reset();action.setLoop(THREE.LoopRepeat,Infinity);action.setEffectiveWeight(1);action.play();guideIdleMixer.update(0);guideProceduralBreath=true;const bones=[];guideModel.traverse(o=>{if(o.isBone&&/(spine|chest|torso|upper.?body)/i.test(o.name||''))bones.push({bone:o,baseX:o.rotation.x,baseScaleY:o.scale.y});});guideModel.userData.breathBones=bones.slice(-3);console.info('Anjo-Guia: animações disponíveis',window.GuideAnimationReport,'respiração selecionada:',idle.name);
}
function fitGuideModel(){
 if(!guideModel||!guideFitRoot)return;
 guideFitRoot.scale.setScalar(1);guideFitRoot.position.set(0,0,0);guideFitRoot.updateMatrixWorld(true);
 if(!guideReferenceBounds){const bounds=measureModelBounds(guideFitRoot),size=bounds.getSize(new THREE.Vector3());if(size.y<=.001)return;const center=bounds.getCenter(new THREE.Vector3());guideReferenceBounds={height:size.y,centerX:center.x,centerZ:center.z,minY:bounds.min.y};}
 const reference=guideReferenceBounds,targetHeight=playerReferenceHeight*.92,fitScale=targetHeight/reference.height;
 guideFitRoot.scale.setScalar(fitScale);guideFitRoot.position.set(-reference.centerX*fitScale,-reference.minY*fitScale,-reference.centerZ*fitScale);
 if(guideFitRoot.parent!==guideModelRoot)guideModelRoot.add(guideFitRoot);
 // Escala explícita adicional no grupo externo: o ajuste automático não pode anular o aumento pedido.
 guideModelRoot.scale.setScalar(1.64);
 guideFitRoot.updateMatrixWorld(true);guide.userData.modelLoaded=true;
}
const villageNpcBreathing=[];
const vendorRoots=[];
function addVillageVendors(){if(!model||vendorsSpawned)return;vendorsSpawned=true;loadVillagers();for(let i=0;i<villageVendors.length;i++){const p=villageVendors[i],cloned=cloneSkinned(model),root=new THREE.Group();root.position.set(p.x,0,p.z);root.rotation.y=p.yaw;root.scale.setScalar(.76);root.userData.breathPhase=i*1.73;root.add(cloned);vendorRoots.push(root);cloned.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});villageGroup.add(root);if(playerIdleClip){const npcMixer=new THREE.AnimationMixer(cloned),idle=npcMixer.clipAction(playerIdleClip);idle.setLoop(THREE.LoopRepeat,Infinity);idle.play();villageNpcMixers.push(npcMixer);}else villageNpcBreathing.push({root,baseY:0,phase:i*1.73});}}

const guideAura=new THREE.PointLight(0xffe6a3,.45,2.8);guideAura.position.set(0,.78,.1);guide.add(guideAura);
const guideShadow=new THREE.Mesh(new THREE.CircleGeometry(.28,20),new THREE.MeshBasicMaterial({color:0x142019,transparent:true,opacity:.28,depthWrite:false}));
guideShadow.rotation.x=-Math.PI/2;guideShadow.position.y=.014;guide.add(guideShadow);
const questMarker=new THREE.Mesh(new THREE.TorusGeometry(.38,.04,8,28),new THREE.MeshBasicMaterial({color:0xffd65a}));
questMarker.rotation.x=Math.PI/2;questMarker.position.set(guide.position.x,terrainHeightAt(guide.position.x,guide.position.z)+.06,guide.position.z);scene.add(questMarker);
const clearingPatch=new THREE.Mesh(new THREE.CircleGeometry(5.4,24),new THREE.MeshStandardMaterial({color:0x786f55,roughness:1}));clearingPatch.rotation.x=-Math.PI/2;clearingPatch.position.set(CLEARING.x,.012,CLEARING.z);clearingPatch.receiveShadow=true;scene.add(clearingPatch);
/* MOD 181 — ruína secreta acessível ao lado da trilha, recompensa visual de exploração. */
const secretRuin=new THREE.Group();secretRuin.position.set(SECRET_RUIN_SPOT.x,groundHeightAt(SECRET_RUIN_SPOT.x,SECRET_RUIN_SPOT.z),SECRET_RUIN_SPOT.z);scene.add(secretRuin);
const ruinStone=mat(0x6a7168);
for(const [rx,rz,rw,rh,rd] of [[0,0,2.4,1.1,1.6],[1.8,.4,1.2,1.8,.9],[-1.6,-.3,1.4,.9,1.2],[.4,-1.3,1.8,.55,1.0]]){
 const block=new THREE.Mesh(new THREE.BoxGeometry(rw,rh,rd),ruinStone);block.position.set(rx,rh*.5,rz);block.rotation.y=(rx+rz)*.11;block.castShadow=false;block.receiveShadow=true;secretRuin.add(block);
 marketObstacles.push({x:secretRuin.position.x+rx,z:secretRuin.position.z+rz,shape:'box',halfX:rw*.55,halfZ:rd*.55,height:rh});
}
const ruinMarker=new THREE.Mesh(new THREE.TorusGeometry(.22,.03,6,16),new THREE.MeshBasicMaterial({color:0xc9a55a}));
ruinMarker.rotation.x=Math.PI/2;ruinMarker.position.set(0,.05,1.8);secretRuin.add(ruinMarker);
let secretRuinFound=false;try{secretRuinFound=localStorage.getItem('seven-sins-3d-secret-ruin')==='1';}catch(e){}
function checkSecretRuin(){
 if(secretRuinFound)return;
 if(Math.hypot(player.position.x-secretRuin.position.x,player.position.z-secretRuin.position.z)<3.2){
  // Marca primeiro para impedir que contatos repetidos concedam várias recompensas.
  secretRuinFound=true;bumpStat('ruins');gainXp(XP_REWARDS.ruin);
  try{localStorage.setItem('seven-sins-3d-secret-ruin','1');}catch(e){}
  // Usa o saldo e a persistência oficiais do mundo; não cria uma carteira paralela.
  coins+=3;
  save3DProgress();
  updateQuestHud();
  const toast=document.getElementById('quest-toast');if(toast){toast.textContent='RUÍNA DESCOBERTA · +3 MOEDAS';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2800);}
  status.textContent='Você encontrou uma ruína antiga escondida entre as árvores.';
 }
}

// Clareira natural com tronco caído e pedras pequenas: sem runas e sem personagem freira.
const fallenLog=new THREE.Mesh(new THREE.CylinderGeometry(.17,.22,3.1,7),barkMat);fallenLog.position.set(-2.5,.22,CLEARING.z-.7);fallenLog.rotation.z=Math.PI/2;fallenLog.rotation.y=.25;fallenLog.castShadow=true;scene.add(fallenLog);
walkableObstacles.push({type:'capsule',x:-2.5,z:CLEARING.z-.7,axisX:Math.cos(.25),axisZ:-Math.sin(.25),halfLength:1.55,radius:.22,height:.44});
for(const p of [{x:2.4,z:CLEARING.z-1.4,s:.55},{x:1.7,z:CLEARING.z+1.8,s:.42},{x:-2.9,z:CLEARING.z+1.6,s:.38}]){
 const stone=new THREE.Mesh(new THREE.DodecahedronGeometry(p.s,0),rockMat);stone.position.set(p.x,p.s*.45,p.z);stone.scale.y=.65;stone.castShadow=true;scene.add(stone);
 walkableObstacles.push({type:'circle',x:p.x,z:p.z,radius:p.s*.95,height:p.s*1.1});
}
const portalGroup=new THREE.Group();scene.add(portalGroup);portalGroup.position.set(PORTAL.x,groundHeightAt(PORTAL.x,PORTAL.z),PORTAL.z);portalGroup.visible=false;
// Santuário no canto distante: pedra obsidiana, arco gótico, cristais suspensos e energia violeta.
const portalStone=mat(0x211d2d),portalEdge=mat(0x51415f),portalGlow=new THREE.MeshStandardMaterial({color:0xc39aff,emissive:0x8c36ff,emissiveIntensity:2.5,metalness:.28,roughness:.26});
function portalBlock(x,y,z,sx,sy,sz,material=portalStone){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;portalGroup.add(m);return m;}
portalBlock(-2.28,3.15,0,.72,6.3,.95);portalBlock(2.28,3.15,0,.72,6.3,.95);
portalBlock(0,6.35,0,5.25,.78,1.05);portalBlock(0,.22,0,5.6,.44,1.3,portalEdge);
const gothicArch=new THREE.Mesh(new THREE.TorusGeometry(2.12,.16,8,48,Math.PI),portalEdge);gothicArch.position.set(0,3.35,-.28);gothicArch.castShadow=true;portalGroup.add(gothicArch);
const innerArch=new THREE.Mesh(new THREE.TorusGeometry(1.88,.045,6,48,Math.PI),portalGlow);innerArch.position.set(0,3.35,-.12);portalGroup.add(innerArch);
for(const side of [-1,1]){
 const rune=new THREE.Mesh(new THREE.OctahedronGeometry(.22,0),portalGlow);rune.position.set(side*2.28,4.7,.54);rune.rotation.z=Math.PI/4;portalGroup.add(rune);
 const crystal=new THREE.Mesh(new THREE.ConeGeometry(.28,.9,5),portalEdge);crystal.position.set(side*2.75,6.45,0);crystal.rotation.z=side*.32;portalGroup.add(crystal);
 for(let i=0;i<3;i++){const sigil=new THREE.Mesh(new THREE.BoxGeometry(.12,.38,.08),portalGlow);sigil.position.set(side*2.28,2.2+i*.8,.51);sigil.rotation.z=side*.25;portalGroup.add(sigil);}
}
const portalRing=new THREE.Mesh(new THREE.TorusGeometry(1.82,.13,8,48),new THREE.MeshStandardMaterial({color:0xc9a5ff,metalness:.25,roughness:.28,emissive:0x7825ff,emissiveIntensity:2.2}));portalRing.position.set(0,3.28,.08);portalRing.castShadow=true;portalGroup.add(portalRing);
const portalInnerRing=new THREE.Mesh(new THREE.TorusGeometry(1.57,.045,6,48),new THREE.MeshBasicMaterial({color:0x8f4bff,transparent:true,opacity:.92}));portalInnerRing.position.set(0,3.28,.12);portalGroup.add(portalInnerRing);
const portalCore=new THREE.Mesh(new THREE.CircleGeometry(1.7,40),new THREE.MeshBasicMaterial({color:0x230a50,transparent:true,opacity:.96,side:THREE.DoubleSide,depthWrite:false}));portalCore.position.set(0,3.28,.02);portalGroup.add(portalCore);
const vortex=new THREE.Group();vortex.position.set(0,3.28,.18);portalGroup.add(vortex);
const vortexPoints=[];for(let i=0;i<=90;i++){const t=i/90,a=t*Math.PI*7.5,r=.04+1.42*t;vortexPoints.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,Math.sin(t*Math.PI*5)*.035));}
const vortexCurve=new THREE.CatmullRomCurve3(vortexPoints);const vortexLine=new THREE.Mesh(new THREE.TubeGeometry(vortexCurve,180,.035,5,false),new THREE.MeshBasicMaterial({color:0xd9b2ff,transparent:true,opacity:.92}));vortex.add(vortexLine);
const portalCenter=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),new THREE.MeshBasicMaterial({color:0xf1dcff}));portalCenter.position.set(0,0,.03);vortex.add(portalCenter);
const portalLight=new THREE.PointLight(0x9c48ff,3.1,18);portalLight.position.set(0,3.25,.7);portalGroup.add(portalLight);
const portalFloorGlow=new THREE.Mesh(new THREE.CircleGeometry(4.2,40),new THREE.MeshBasicMaterial({color:0x7627ee,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));portalFloorGlow.rotation.x=-Math.PI/2;portalFloorGlow.position.set(0,.045,.2);portalGroup.add(portalFloorGlow);
const portalSigil=new THREE.Mesh(new THREE.TorusGeometry(3.1,.035,5,64),new THREE.MeshBasicMaterial({color:0xb88aff,transparent:true,opacity:.8}));portalSigil.rotation.x=-Math.PI/2;portalSigil.position.set(0,.065,.2);portalGroup.add(portalSigil);
const floatingRelics=[];
for(let i=0;i<7;i++){
 const angle=i*Math.PI*2/7,rad=2.9+(i%2)*.45;
 const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.18+(i%3)*.045,0),i%2?portalGlow:portalEdge);
 crystal.position.set(Math.cos(angle)*rad,1.1+(i%3)*.72,Math.sin(angle)*.24+.1);
 crystal.rotation.set(angle,.4*i,angle*.6);portalGroup.add(crystal);
 floatingRelics.push({mesh:crystal,baseY:crystal.position.y,phase:i*1.7,angle});
}
// Mede bounds reais de SkinnedMesh usando vértices deformados pelo rig.
// Compatível com Three.js atual (applyBoneTransform) e versões antigas (boneTransform).
function measureModelBounds(model){
 model.updateMatrixWorld(true);
 model.traverse(obj=>{if(obj.isSkinnedMesh&&obj.skeleton)obj.skeleton.update();});
 model.updateMatrixWorld(true);
 const box=new THREE.Box3();box.makeEmpty();
 model.traverse(obj=>{
  if(!obj.isMesh||!obj.geometry||obj.visible===false)return;
  let parent=obj.parent;
  while(parent&&parent!==model){if(parent.visible===false)return;parent=parent.parent;}
  const pos=obj.geometry.attributes&&obj.geometry.attributes.position;
  const skinTransform=typeof obj.applyBoneTransform==='function'?obj.applyBoneTransform:obj.boneTransform;
  if(obj.isSkinnedMesh&&obj.skeleton&&pos&&typeof skinTransform==='function'){
   const vertex=new THREE.Vector3(),skinnedBox=new THREE.Box3();skinnedBox.makeEmpty();
   for(let i=0;i<pos.count;i++){
    vertex.fromBufferAttribute(pos,i);
    skinTransform.call(obj,i,vertex);
    vertex.applyMatrix4(obj.matrixWorld);skinnedBox.expandByPoint(vertex);
   }
   if(!skinnedBox.isEmpty()){box.union(skinnedBox);return;}
  }
  if(!obj.geometry.boundingBox)obj.geometry.computeBoundingBox();
  if(obj.geometry.boundingBox)box.union(obj.geometry.boundingBox.clone().applyMatrix4(obj.matrixWorld));
 });
 return box;
}
new GLTFLoader().load('./AnjoGuia-lod.glb?v=mod194-lod',gltf=>{
 const imported=gltf.scene;imported.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material&&'side'in o.material)o.material.side=THREE.DoubleSide;}});
 guideFitRoot=new THREE.Group();guideFitRoot.name='AnjoGuia_FitRoot';guideFitRoot.add(imported);guideModel=imported;playNativeGuideIdle(gltf.animations||[]);fitGuideModel();
},undefined,err=>{console.error('AnjoGuia.glb não carregou:',err);status.textContent='Não foi possível carregar AnjoGuia.glb';});
const PROGRESS_KEY='sevenSins3DCampaignV6';
function read3DProgress(){try{const keys=[PROGRESS_KEY,'sevenSins3DCampaignV5','sevenSins3DCampaignV4','sevenSins3DCampaignV3','sevenSins3DCampaignV2','sevenSins3DCampaignV1'];for(const key of keys){const raw=JSON.parse(localStorage.getItem(key)||'null');if(raw)return migrateProgress(raw);}return migrateProgress({coins:0});}catch(_){return migrateProgress(null);}}
let saved3DProgress=read3DProgress();
let sideReady=false;
let questStep=saved3DProgress.questStep,coins=saved3DProgress.coins,journeyEnemyIndex=saved3DProgress.journeyEnemyIndex,dialogueOpen=false,dialoguePages=[],dialogueIndex=0,dialogueFinish=null;
let playerName=saved3DProgress.playerName,captorsTaunted=saved3DProgress.captorsTaunted,childrenFreed=saved3DProgress.childrenFreed,awakeningSeen=saved3DProgress.awakeningSeen,actCardSeen=saved3DProgress.actCardSeen;
let mountainIndex=saved3DProgress.mountainIndex||0,wardenTaunted=!!saved3DProgress.wardenTaunted,wardenDefeated=!!saved3DProgress.wardenDefeated,portalOpened=!!saved3DProgress.portalOpened,portalRewardClaimed=!!saved3DProgress.portalRewardClaimed;
let wardenIntroLock=false,portalPull=null,handoffSent=false,bishopsDefeated=saved3DProgress.bishopsDefeated||0,valerioRewardClaimed=!!saved3DProgress.valerioRewardClaimed;
/* MOD 188 — progressão: XP e nível, moedas por vitória, estatísticas para conquistas e catálogo de inimigos. */
let playerXp=saved3DProgress.xp||0,ownedItems=new Set(saved3DProgress.owned||[]),equippedSword=saved3DProgress.sword||'prota';
const progressStats=Object.assign({kills:0,rescues:0,perfectBlocks:0,flawless:0,places:0,ruins:0,bishops:0},saved3DProgress.stats||{});
const achievementsClaimed=new Set(saved3DProgress.achievementsClaimed||[]),bestiaryKnown=new Set(saved3DProgress.bestiary||[]),bestiaryRewarded=new Set(saved3DProgress.bestiaryRewarded||[]);
let shopVisited=!!saved3DProgress.shopVisited,fightHitTaken=false;
let playSeconds=Number(saved3DProgress.playSeconds)||0,playSaveAt=0;
function playerLevel(){return levelFromXp(playerXp);}
function applyLevelStats(heal){const st=statsForLevel(playerLevel());const was=playerMaxHP;playerMaxHP=st.maxHP+coatHpBonus();if(heal)playerHP=playerMaxHP;else playerHP=Math.min(playerMaxHP,playerHP+(playerMaxHP-was));updatePlayerHud();updateLevelHud();}
function updateLevelHud(){const p=levelProgress(playerXp);const lv=document.getElementById('level-badge');if(lv)lv.textContent='NV '+p.level;const fill=document.getElementById('xp-fill');if(fill)fill.style.width=(p.max?100:Math.round(p.into/p.need*100))+'%';}
function gainXp(amount,why){
 if(!(amount>0))return;const before=playerLevel();playerXp+=amount;const after=playerLevel();
 if(after>before){applyLevelStats(true);showCombatCallout('NÍVEL '+after);worldAudio.reveal();status.textContent='Você alcançou o nível '+after+'. Vida máxima: '+playerMaxHP+'.';announceShopNews();}
 updateLevelHud();
}
function bumpStat(key,n=1){progressStats[key]=(progressStats[key]||0)+n;announceAchievements();}
let achievementsAnnounced=new Set(ACHIEVEMENTS.filter(a=>achievementState(a,progressStats,achievementsClaimed).done).map(a=>a.id));
function announceAchievements(){for(const a of ACHIEVEMENTS){const st=achievementState(a,progressStats,achievementsClaimed);if(st.done&&!achievementsAnnounced.has(a.id)){achievementsAnnounced.add(a.id);const toast=document.getElementById('quest-toast');if(toast){toast.textContent='CONQUISTA · '+a.name.toUpperCase()+' (resgate na loja)';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2800);}}}}
const BESTIARY_BY_PROFILE={captor:'captor',demon2:'demon2',sentry:'sentry',warden:'warden',zealot:'zealot',hollow:'hollow'};
function registerEnemyDefeat(profile){
 if(BOSS_PROFILES.includes(profile)){bumpStat('kills');return;}
 const id=BESTIARY_BY_PROFILE[profile]||'captor';
 const xp=XP_REWARDS[id]||20,gold=id==='sentry'?6:id==='captor'?4:0;
 if(gold)coins+=gold;bestiaryKnown.add(id);bumpStat('kills');if(!fightHitTaken)bumpStat('flawless');fightHitTaken=false;
 gainXp(xp);showRewardPop((gold?'+'+gold+' MOEDAS · ':'')+'+'+xp+' XP');
}
function showRewardPop(text){const el=document.getElementById('reward-pop');if(!el)return;el.textContent=text;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');}
let announcedShop=new Set();
function announceShopNews(){
 const ctx={questStep,level:playerLevel(),coins:Infinity,owned:ownedItems};
 for(const item of SHOP_ITEMS){const st=shopStatus(item,ctx);if(st.state==='buyable'&&!announcedShop.has(item.id)){announcedShop.add(item.id);if(questStep>0){const toast=document.getElementById('quest-toast');if(toast){toast.textContent='NA LOJA CENTRAL · '+item.name.toUpperCase();toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2800);}}}}
}
let namePromptOpen=false,awakeningActive=!awakeningSeen&&questStep===0,awakeningT=0,tauntLock=false,reunionStarted=false,purseGiven=questStep>0;
if(questStep<2)enemy.visible=false;
if(questStep===2){{const jx=JOURNEY_ENEMIES[journeyEnemyIndex]?.x||0,jz=JOURNEY_ENEMIES[journeyEnemyIndex]?.z||-59;enemy.position.set(jx,terrainHeightAt(jx,jz),jz);}enemy.visible=false;}
portalGroup.visible=questStep>=8; // MOD 204: no Ato I o portal de Valério fica dentro do esgoto
/* MOD 202 — os shaders do mundo compilam enquanto a tela das galáxias está aberta (compilação paralela), não no primeiro
   quadro depois do ENTRAR: era isso que travava o jogo por alguns segundos ao entrar. */
var worldCompiled=false,worldCompileStarted=false;
function precompileWorld(){
 if(worldCompileStarted)return;worldCompileStarted=true;
 const done=()=>{worldCompiled=true;};setTimeout(done,9000);
 try{if(renderer.compileAsync)renderer.compileAsync(scene,camera).then(done,done);else{renderer.compile(scene,camera);done();}}catch(e){done();}
}
function save3DProgress(){const progress={version:ACT1.version,act1Rev:ACT1.rev,act1Sub:typeof act1Sub==='number'?act1Sub:0,questStep,coins,journeyEnemyIndex,mountainIndex,playerName,captorsTaunted,childrenFreed,awakeningSeen,actCardSeen,wardenTaunted,wardenDefeated,portalOpened,portalRewardClaimed,bishopsDefeated,valerioRewardClaimed,xp:playerXp,owned:[...ownedItems],sword:equippedSword,stats:progressStats,achievementsClaimed:[...achievementsClaimed],bestiary:[...bestiaryKnown],bestiaryRewarded:[...bestiaryRewarded],shopVisited,playSeconds:Math.floor(playSeconds),ledgersFound,vorgazhekRewardClaimed,lateFound:typeof lateFound!=='undefined'?lateFound:[],lateFoundStep:typeof lateFoundStep!=='undefined'?lateFoundStep:0,lateFightIndex:typeof lateFightIndex!=='undefined'?lateFightIndex:0,lateBossClaimed:typeof lateBossClaimed!=='undefined'?lateBossClaimed:{},gauntletIndex:typeof gauntletIndex!=='undefined'?gauntletIndex:0,finaleClaimed:typeof finaleClaimed!=='undefined'?!!finaleClaimed:false,coatOwned:typeof coatOwned!=='undefined'?!!coatOwned:false,coatOn:typeof coatOn!=='undefined'?!!coatOn:false,zarkhaelClaimed:typeof zarkhaelClaimed!=='undefined'?!!zarkhaelClaimed:false,scrollOwned:typeof scrollOwned!=='undefined'?!!scrollOwned:false,veraxionClaimed:typeof veraxionClaimed!=='undefined'?!!veraxionClaimed:false,updatedAt:Date.now()};try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));}catch(_){}window.SevenSins3DProgress=progress;try{if(window.parent!==window)window.parent.postMessage({type:'SEVEN_SINS_3D_PROGRESS',progress},window.location.origin);}catch(_){}}
/* MOD 186 — HUD das habilidades: botões só aparecem quando liberados (com revelação), recarga em anel
   no próprio botão, custo de mana visível e atalho de teclado mostrado apenas em PC. */
const testAllSkills=new URLSearchParams(location.search).has('todasHabilidades');
let playerMana=MANA.max,manaHitAt=-1e9,skillSet=null;
const SKILL_LABELS={magic:'MAGIA',magic2:'MAG.II',magic3:'SOL',ultimate:'ULT.'};
const skillButtons={};
for(const id of SKILL_ORDER){const b=document.getElementById(id);if(!b)continue;b.innerHTML='<span class="btn-icon skill-art">'+iconSvg(id,{size:48})+'</span><span class="btn-label" data-key="'+SKILLS[id].key+'">'+SKILL_LABELS[id]+'</span><span class="skill-cost">'+SKILLS[id].mana+'</span>';b.dataset.key=SKILLS[id].key;b.setAttribute('aria-label',SKILLS[id].name+' — '+SKILLS[id].mana+' de mana');skillButtons[id]={el:b,cost:b.querySelector('.skill-cost'),cd:-1,state:''};}
for(const [id,key] of [['attack','J'],['jump','␣'],['dash','⇧'],['defend','K'],['aim','Q']]){const b=document.getElementById(id);if(b){b.dataset.key=key;const l=b.querySelector('.btn-label');if(l)l.dataset.key=key;}}
function refreshSkillUnlocks(){
 const next=unlockedSkills({owned:ownedItems,testAll:testAllSkills});
 const fresh=skillSet?newlyUnlocked(skillSet,next):[];
 skillSet=next;
 for(const id of SKILL_ORDER){const ui=skillButtons[id];if(ui)ui.el.classList.toggle('skill-locked',!skillSet.has(id));}
 if(fresh.length)worldAudio.reveal();
 for(const id of fresh){const ui=skillButtons[id];if(!ui)continue;ui.el.classList.remove('skill-reveal');void ui.el.offsetWidth;ui.el.classList.add('skill-reveal');
  const toast=document.getElementById('quest-toast');if(toast){toast.textContent='NOVA PALAVRA · '+SKILLS[id].name.toUpperCase()+' ('+SKILLS[id].key+')';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),3200);}}
}
function updateSkillHud(now){
 for(const id of SKILL_ORDER){const ui=skillButtons[id];if(!ui||!skillSet||!skillSet.has(id))continue;
  const frac=cooldownFraction(id,holyCooldowns,now),cd=Math.round(frac*100)/100;
  if(cd!==ui.cd){ui.cd=cd;ui.el.style.setProperty('--cd',String(cd));}
  const left=Math.max(0,(holyCooldowns[id]||0)-now),state=left>0?'cd'+Math.ceil(left/1000):playerMana<SKILLS[id].mana?'nomana':'ready';
  if(state!==ui.state){ui.state=state;ui.cost.textContent=left>0?String(Math.ceil(left/1000)):String(SKILLS[id].mana);ui.el.classList.toggle('skill-nomana',state==='nomana');ui.el.classList.toggle('skill-cooling',left>0);}
 }
 const fill=document.getElementById('player-mana-fill');if(fill){const w=Math.round(playerMana/MANA.max*100);if(fill.dataset.w!==String(w)){fill.dataset.w=String(w);fill.style.width=w+'%';}}
}
function updateQuestHud(){refreshSkillUnlocks();if(typeof refreshSideQuests==='function'&&sideReady)refreshSideQuests();const view=(questStep===ACT5N.step?act5Presentation(act1Sub):null)||(isAct6Step(questStep)?act6Presentation(questStep,act1Sub):null)||finalePresentationFor(questStep)||(isAct3Step(questStep)?act3Presentation(questStep,act1Sub,SNOW_CITY.name):null)||(isAct4Step(questStep)?act4Presentation(questStep,act1Sub):null)||latePresentation(questStep)||act2Presentation(questStep,act1Sub)||questPresentation(questStep,act1Sub);const title=document.getElementById('quest-title'),objective=document.getElementById('quest-objective'),coinCount=document.getElementById('coin-count'),hint=document.getElementById('hint'),hero=document.getElementById('hero-name');if(title)title.textContent=view.title;if(objective)objective.textContent=view.objective;if(hint)hint.textContent=view.title;if(coinCount)coinCount.textContent=String(coins);{const tag=document.getElementById('hero-name-tag');if(tag)tag.textContent=playerName?playerName.toUpperCase():'';}if(hero)hero.textContent=playerName?playerName.toUpperCase():'SEM NOME';const nameLabel=document.querySelector('#player-name span');if(nameLabel)nameLabel.textContent=(playerName||'PROTAGONISTA').toUpperCase();}
function showActCard(){if(actCardSeen)return;actCardSeen=true;save3DProgress();const card=document.getElementById('act-card');if(!card)return;card.classList.remove('hidden');const hide=()=>{card.classList.add('hidden');card.removeEventListener('pointerdown',hide);};card.addEventListener('pointerdown',hide);setTimeout(hide,3400);}
function finishAwakening(){if(!awakeningActive&&awakeningSeen)return;awakeningActive=false;awakeningSeen=true;const skip=document.getElementById('skip-awakening');if(skip)skip.classList.add('hidden');save3DProgress();}
let namePromptBound=null;
function openNamePrompt(onReady){namePromptOpen=true;const panel=document.getElementById('name-panel'),input=document.getElementById('name-input'),error=document.getElementById('name-error'),button=document.getElementById('name-confirm');if(!panel||!input||!button){namePromptOpen=false;if(onReady)onReady();return;}error.textContent='';input.value=playerName||'';panel.classList.remove('hidden');input.focus();if(namePromptBound){button.removeEventListener('click',namePromptBound.click);input.removeEventListener('keydown',namePromptBound.key);}const confirm=()=>{const result=sanitizePlayerName(input.value);if(!result.ok){error.textContent=result.error;return;}playerName=result.name;namePromptOpen=false;panel.classList.add('hidden');save3DProgress();updateQuestHud();button.removeEventListener('click',confirm);input.removeEventListener('keydown',onKey);namePromptBound=null;if(onReady)onReady();};const onKey=(e)=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();confirm();}};namePromptBound={click:confirm,key:onKey};button.addEventListener('click',confirm);input.addEventListener('keydown',onKey);}
function renderDialoguePage(){
 const page=dialoguePages[dialogueIndex],panel=document.getElementById('dialog-panel');
 const who=document.getElementById('dialog-who'),textEl=document.getElementById('dialog-text');
 const portrait=document.getElementById('dialog-portrait'),monogram=document.getElementById('dialog-monogram');
 panel.dataset.speaker=page.who||'';who.textContent=page.who||'';textEl.textContent=page.text||'';
 document.getElementById('dialog-page').textContent=String(dialogueIndex+1).padStart(2,'0')+' / '+String(dialoguePages.length).padStart(2,'0');
 monogram.textContent=(page.who||'✦').trim().charAt(0).toUpperCase()||'✦';
 const src=/anjo-guia/i.test(page.who||'')?'AnjoGuia-ui.webp':(page.portrait||'');
 if(src){portrait.src=src;portrait.classList.remove('hidden');monogram.classList.add('hidden');}
 else{portrait.removeAttribute('src');portrait.classList.add('hidden');monogram.classList.remove('hidden');}
 panel.classList.remove('dialog-beat');void panel.offsetWidth;panel.classList.add('dialog-beat');
 document.getElementById('dialog-continue').innerHTML=dialogueIndex===dialoguePages.length-1?'FECHAR <span aria-hidden="true">×</span>':'CONTINUAR <span aria-hidden="true">↗</span>';
}
function showDialogue(pages,onFinish){
 dialoguePages=pages;dialogueIndex=0;dialogueFinish=onFinish||null;dialogueOpen=true;
 document.getElementById('dialog-panel').classList.remove('hidden');renderDialoguePage();
}
function advanceDialogue(){
 if(!dialogueOpen)return;
 dialogueIndex++;
 if(dialogueIndex<dialoguePages.length){renderDialoguePage();return;}
 dialogueOpen=false;document.getElementById('dialog-panel').classList.add('hidden');
 const finish=dialogueFinish;dialogueFinish=null;if(finish)finish();
}
function talkToGuide(){if(questStep!==0||dialogueOpen||namePromptOpen||cineActive)return;startAwakeningCine();}

function finalePresentationFor(step){const pages={26:['ARCO FINAL · QUATRO FENDAS','Fale com o Anjo-Guia na vila'],27:['ARCO FINAL · OS GUARDIÕES','Vá ao portal da montanha e enfrente os quatro guardiões'],28:['ARCO FINAL · O PECADO DA GANÂNCIA','Derrote as três formas da Ganância'],29:['EPÍLOGO','O mundo respira'],30:['GALÁXIA 1 · LIBERTADA','Escolha a próxima jornada na tela das galáxias']};const p=pages[step];return p?{title:p[0],objective:p[1]}:null;}
function combatStepNow(){return (dimBattle&&dimBattle.active)||(typeof pack!=="undefined"&&!!pack&&pack.active)||questStep===2||questStep===3||questStep===4||questStep===5||questStep===13||(lateSystemsReady&&(lateEngaged()||coliseum.active))||(finaleReady&&finaleCombatActive());}
function enemyHpPercent(){return Math.max(0,Math.min(100,enemyHP/Math.max(1,enemyMaxHP)*100));}
function nextDashCooldown(){if(encounterProfile==='warden')return 2.15;if(encounterProfile==='sentry'&&mountainIndex>0)return 1.65;return 2.7;}
function syncEnemyLabel(){const el=document.getElementById('enemy-name');if(!el)return;const dimInfo=dimensionForProfile(encounterProfile);el.textContent=dimBattle&&dimBattle.active&&dimInfo?dimInfo.name+' · '+(dimInfo.order<5?dimInfo.order+'º BISPO':'PECADO'):(finaleReady&&finaleNameFor(encounterProfile))?finaleNameFor(encounterProfile):encounterProfile==='vorgazhek'?'VORGAZHEK · SEGUNDO BISPO':encounterProfile==='arena'?'ARENA DO VALE':(lateSystemsReady&&lateDef()&&lateDef().profile===encounterProfile)?lateDef().name:encounterProfile==='warden'?'GUARDIÃO DO PORTAL':(encounterProfile==='demon2'||encounterProfile==='demon3')?'DEMÔNIO DA GANÂNCIA':encounterProfile==='miniboss3'?'GUARDIÃO DA DISTORÇÃO':ROUND_NAMES[encounterProfile]?ROUND_NAMES[encounterProfile]:encounterProfile==='angel'?'ANJO-GUIA':encounterProfile==='demon4'?'GUARDIÃO DA TORRE':encounterProfile==='miniboss4'?'GUARDIÃO DO 6º PISO':encounterProfile==='leader4'?'LÍDER DOS GUARDIÕES':encounterProfile==='bandit4'?'BANDIDO':encounterProfile==='rival'?'DESCONHECIDO':encounterProfile==='miniboss2'?'GUARDIÃO DO TRONO':encounterProfile==='sentry'?'SENTINELA DA SUBIDA':'SEGUIDOR DA GANÂNCIA';if(wardenRing)wardenRing.visible=encounterProfile==='warden'&&enemy.visible;}
function revealEncounter(profile,spot,hp,intro){if(enemy.visible)return;encounterProfile=profile;enemyMaxHP=hp;enemyHP=hp;enemyAlive=true;enemy.position.set(spot.x,terrainHeightAt(spot.x,spot.z),spot.z);enemy.rotation.set(0,0,0);enemy.scale.setScalar(1);enemyAttackElapsed=0;enemyAttackResolved=true;enemyAttackCooldown=.35;enemyKnockback=0;enemyDashRemaining=0;enemyCastResolved=true;wardenFanPending=false;if(profile!=='warden')wardenPhaseUsed=false;enemy.visible=true;checkpointX=spot.x;checkpointZ=Math.min(12,spot.z+7.5);syncEnemyLabel();if(enemyActions.idle)playEnemyAnimation('idle',.05);status.textContent=intro;}
function advanceAfterEnemyDefeat(){if(dimBattle&&dimBattle.active){if(act6GreedDefeat())return;if(questStep===ACT6N.rematch&&!dimBattle.outro){const r=nextRematch(act1Sub);if(r&&r.key===dimBattle.key){dimBattle.outro=true;enemy.visible=true;playStory('revanche-cai',rematchOutroScene(r.key),{focus:'enemy',done:()=>dimensionVictory()});return;}}if(dimBattle.key==='bishop1'&&questStep<8&&!dimBattle.outro){dimBattle.outro=true;valerioOutro(()=>dimensionVictory());return;}if(dimBattle.key==='bishop2'&&questStep===ACT2.boss&&!dimBattle.outro){dimBattle.outro=true;playStory('vorgazhek-cai',vorgazhekDefeatScene(),{focus:'enemy',done:()=>dimensionVictory()});return;}if(dimBattle.key==='bishop4'&&questStep===ACT4N.boss&&!dimBattle.outro){dimBattle.outro=true;enemy.visible=true;enemyAlive=true;playStory('veraxion-cai',veraxionDefeatScene(),{focus:'enemy',done:()=>dimensionVictory()});return;}if(dimBattle.key==='bishop3'&&questStep===ACT3N.boss&&!dimBattle.outro){dimBattle.outro=true;enemy.visible=true;enemyAlive=true;playStory('zarkhael-cai',zarkhaelDefeatScene(),{focus:'enemy',done:()=>dimensionVictory()});return;}dimensionVictory();return;}if(packHandleDefeat())return;if(finaleReady&&finaleHandleDefeat())return;if(lateSystemsReady&&lateHandleDefeat())return;if(encounterProfile==='vorgazhek'){registerEnemyDefeat('vorgazhek');act2Victory();return;}registerEnemyDefeat(encounterProfile);enemy.visible=false;enemy.rotation.set(0,0,0);enemy.scale.setScalar(1);enemyAttackCooldown=0;enemyAttackResolved=true;enemyDashRemaining=0;wardenFanPending=false;if(wardenRing)wardenRing.visible=false;}
function nearestVillageVendor(){let nearest=null,best=2.85;for(const vendor of villageVendors){const distance=Math.hypot(vendor.x-player.position.x,vendor.z-player.position.z);if(distance<best){best=distance;nearest=vendor;}}return nearest;}
function talkToVillageVendor(vendor){if(!vendor||dialogueOpen||namePromptOpen)return;if(trySideQuestTalk(vendor))return;const hint=vendor.hints[Math.min(4,questStep)]||vendor.hints[4];showDialogue([{who:vendor.name,text:vendor.greeting},{who:vendor.name,text:hint}]);}
function startPortalPull(){if(!portalPull)portalPull={t:0};}
function updatePortalPull(dt){if(!portalPull||handoffSent)return;portalPull.t+=dt;const T=inSewer?sewerLocal(SEWER.portal):PORTAL,tz=T.z+(inSewer?1.2:2.4);player.position.x+=(T.x-player.position.x)*Math.min(1,dt*2.1);player.position.z+=(tz-player.position.z)*Math.min(1,dt*2.1);player.position.y=terrainHeightAt(player.position.x,player.position.z);const yaw=Math.atan2(T.x-player.position.x,T.z-player.position.z);player.rotation.y=yaw;playerYaw=yaw;if(portalPull.t>1.2)requestValerioHandoff();}
function openValerioPortal(){if(dialogueOpen||namePromptOpen||awakeningActive||portalPull||cineActive)return;if(questStep>=8){status.textContent='O portal se fechou. O selo de Valério foi quebrado.';return;}updateHeartsHud(true);if(!canChallengeBishop(heartState)){status.textContent='Sem corações. O próximo volta em '+formatTimer(msToNextHeart(heartState))+'.';showDialogue([{who:'Anjo-Guia',text:'Não atravesse de peito vazio. Espere um coração voltar.'}]);return;}if(questStep===6){if(!portalRewardClaimed){coins+=ACT1.portalReward;portalRewardClaimed=true;}questStep=7;portalOpened=true;save3DProgress();updateQuestHud();act1Toast('A DIMENSÃO DE VALÉRIO SE ABRE');}if(questStep===7){status.textContent='O portal puxa você.';worldAudio.portalEnter();startPortalPull();}}
function tryInteract(){if(cineActive){if(!namePromptOpen)cineDirector.tap();return;}if(namePromptOpen||awakeningActive||portalPull||shopOpen)return;if(dialogueOpen){advanceDialogue();return;}if(act1Interact())return;if(act2StoryInteract())return;if(act3Ready&&act3Interact())return;if(act3Ready&&act4Interact())return;if(act3Ready&&act6Interact())return;if(act2Interact())return;if(finaleReady&&finaleInteract())return;if(lateSystemsReady&&lateInteract())return;const guideDistance=Math.hypot(guide.position.x-player.position.x,guide.position.z-player.position.z);if(questStep===0&&guideDistance<=2.7){talkToGuide();return;}if(nearShopDoor()){openShop();return;}const stone=nearestWaystone();if(stone){useWaystone(stone);return;}const vendor=nearestVillageVendor();if(vendor)talkToVillageVendor(vendor);}
bindInstantTap(document.getElementById('talk-button'),tryInteract);
const skipAwakening=document.getElementById('skip-awakening');if(skipAwakening){if(awakeningActive)skipAwakening.classList.remove('hidden');bindInstantTap(skipAwakening,()=>skipIntroScene());}

updateHeroNameQuiet();
function updateHeroNameQuiet(){updateQuestHud();}
bindInstantTap(document.getElementById('dialog-continue'),advanceDialogue);
updateQuestHud();

let model=null,mixer=null,actions={},activeAction=null,walkName='',attackClips=[],attackClipIndex=0;
const clock=new THREE.Clock();
function chooseClip(clips,regex){return clips.find(c=>regex.test(c.name));}
function clipKey(clip){return String(clip&&clip.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function validAttackClip(clip){
 const n=clipKey(clip);if(!n)return false;
 const bad=/hurt|damage|hitreaction|hitknockback|takehit|tomardano|dano|death|dying|dead|^die$|morrer|morte|fall|falling|knockdown|collapse|stumble|caer|queda|idle|breath|respir|falar|talk|rest|standstill|parado|walk|walking|run|running|sprint|locomotion|andar|caminh|getup|standup|rise|recoverfloor|levant|levantar|block|dodge|dash|jump|salto/;
 const good=/attack|slash|swing|strike|sword|melee|atacar|ataque|atq\d|skill|habilidade|claw|combo|punch|kick|overhandthrow|onehand|twohand/;
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
 // Só aceitar clipes cujo nome identifique explicitamente um ataque.
 // Overhand Throw é uma animação de receber dano neste protagonista, não de atacar.
 // Se não houver clipe confiável, o botão não aplica dano nem toca uma animação errada.
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
new GLTFLoader().load('./Protagonista.glb?mod172-grounding',gltf=>{
  model=gltf.scene;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material.side=THREE.FrontSide;}}});
  fitModel(model);const playerBounds=measureModelBounds(model),playerSize=playerBounds.getSize(new THREE.Vector3());if(playerSize.y>.001)playerReferenceHeight=playerSize.y;
  player.add(model);
 loadPlayerSword(model);
 if(gltf.animations&&gltf.animations.length){mixer=new THREE.AnimationMixer(model);const clips=gltf.animations;playerIdleClip=clips.find(c=>/^idle$/i.test(c.name||''))||chooseClip(clips,/idle|breath|respir|parad/i)||null;const idle=playerIdleClip||chooseClip(clips,/idle|breath|respir|parad/i);const walk=chooseClip(clips,/walk|caminh/i);attackClips=selectDimensionAttack(clips);attackClipIndex=0;const jump=chooseClip(clips,/jump|saltar|salto/i);
 const hit=chooseClip(clips,/hit.?knockback|hit.?reaction|hurt|damage|take.?damage|taking.?damage/i)||chooseClip(clips,/overhandthrow/i);
 const death=chooseClip(clips,/death|dead|dying|(^|[^a-z])die([^a-z]|$)|knockdown|collapse/i);
 const dash=chooseClip(clips,/dash|quickstep|evade/i),block=chooseClip(clips,/block|dodge/i);
 if(idle)actions.idle=mixer.clipAction(idle);if(walk){actions.walk=mixer.clipAction(walk);walkName=walk.name;}if(attackClips.length)actions.attack=mixer.clipAction(attackClips[0]);if(jump)actions.jump=mixer.clipAction(jump);
 if(hit)actions.hit=mixer.clipAction(hit);{const kip=chooseClip(clips,/kip/i);if(kip)actions.kipUp=mixer.clipAction(kip);}if(death)actions.death=mixer.clipAction(death);if(dash)actions.dash=mixer.clipAction(dash);if(block)actions.block=mixer.clipAction(block);
 play(actions.idle?'idle':actions.walk?'walk':'idle',0);
 window.ProtagonistAnimationReport=clips.map(c=>c.name);console.info('Protagonista.glb animações:',window.ProtagonistAnimationReport);
 new GLTFLoader().load('./Protagonista-corrida.glb?v=mod213',g=>{const c=g.animations.find(a=>a.name==='Running');if(c&&model&&mixer){try{actions.run=mixer.clipAction(bakeRunClip(g.scene,c,model));}catch(err){console.warn('Corrida do herói indisponível:',err);}}},undefined,()=>{});}
 fitGuideModel();addVillageVendors();
 player.userData.ready=true;loading.classList.add('hidden');precompileWorld();spawnAct1Children();status.textContent=questStep===0?'Ato I · o Anjo-Guia espera no começo da trilha':(finalePresentationFor(questStep)||latePresentation(questStep)||act2Presentation(questStep)||questPresentation(questStep,act1Sub)).objective;
},undefined,err=>{console.error(err);loading.innerHTML='Não foi possível carregar Protagonista.glb.<br>Verifique a conexão e tente novamente.';status.textContent='Falha ao carregar modelo';});
const keys={};addEventListener('keydown',e=>{const typing=document.activeElement&&(document.activeElement.tagName==='INPUT'||document.activeElement.tagName==='TEXTAREA');if(typing)return;keys[e.key.toLowerCase()]=true;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault();});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
addEventListener('keydown',e=>{if(e.repeat)return;const typing=document.activeElement&&(document.activeElement.tagName==='INPUT'||document.activeElement.tagName==='TEXTAREA'||document.activeElement.tagName==='SELECT');if(typing)return;if(e.code==='KeyJ'||e.code==='KeyX'){action('attack');return;}if(e.code==='KeyF'||e.key==='Shift'){action('dash');return;}if(e.code==='Digit1'||e.code==='Numpad1'){action('magic');return;}if(e.code==='Digit2'||e.code==='Numpad2'){action('magic2');return;}if(e.code==='Digit3'||e.code==='Numpad3'){action('magic3');return;}if(e.code==='Digit4'||e.code==='Numpad4'){action('ultimate');return;}if(e.code==='Space'){e.preventDefault();action('jump');return;}if(e.key==='e'||e.key==='Enter')tryInteract();});
let joyX=0,joyY=0,joyActive=false;const stick=document.getElementById('stick'),knob=document.getElementById('knob');
function setJoy(e){const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.32;const d=Math.hypot(dx,dy);if(d>max){dx=dx/d*max;dy=dy/d*max;}joyX=dx/max;joyY=dy/max;knob.style.transform='translate('+dx+'px,'+dy+'px)';}
stick.addEventListener('pointerdown',e=>{joyActive=true;stick.setPointerCapture(e.pointerId);setJoy(e);});
stick.addEventListener('pointermove',e=>{if(joyActive)setJoy(e);});
function endJoy(){joyActive=false;joyX=joyY=0;knob.style.transform='translate(0,0)';}
stick.addEventListener('pointerup',endJoy);stick.addEventListener('pointercancel',endJoy);
let actionUntil=0,verticalVelocity=0;const gravity=15,jumpImpulse=5.2;let grounded=true;
let dashRemaining=0,dashCooldownUntil=0,dashDirX=0,dashDirZ=0;
const holyProjectiles=[];let holyCooldowns={magic:0,magic2:0,magic3:0,ultimate:0};

function spawnHolyProjectile(kind,angleOffset=0,delay=0){
 const group=new THREE.Group(),gold=new THREE.MeshStandardMaterial({color:0xffe7a0,emissive:0xffbd3f,emissiveIntensity:2.2,metalness:.55,roughness:.2}),white=new THREE.MeshBasicMaterial({color:0xfff7d2});
 let arcMat=null;
 if(kind==='arc'){const dark=isNightHour(gameClock.hour);arcMat=new THREE.MeshBasicMaterial({color:dark?0x9a4dff:0xffd36a,transparent:true,opacity:.9,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});for(const [r0,r1,o] of [[.95,1.3,1],[1.32,1.42,.6]]){const m=new THREE.Mesh(new THREE.RingGeometry(r0,r1,40,1,-Math.PI/2-1.25,2.5),o<1?arcMat.clone():arcMat);if(o<1)m.material.opacity=.55;m.rotation.x=-Math.PI/2;m.position.z=-1.1;group.add(m);}}
 else if(kind==='sun'){const orb=new THREE.Mesh(new THREE.SphereGeometry(.62,18,14),gold);const cor=glowSprite(0xffb020,.95,4.6);group.add(cor);const cor2=glowSprite(0xfff2b0,.8,2.2);group.add(cor2);group.add(orb);const halo=new THREE.Mesh(new THREE.TorusGeometry(.58,.035,6,24),white);halo.rotation.x=Math.PI/2;group.add(halo);}
 else{const blade=new THREE.Mesh(new THREE.ConeGeometry(.13,.95,5),gold);blade.rotation.x=Math.PI/2;group.add(blade);const core=new THREE.Mesh(new THREE.CylinderGeometry(.025,.045,.8,5),white);core.rotation.x=Math.PI/2;group.add(core);group.rotation.z=Math.PI/2;}
 const target=combatStepNow()&&enemy.visible&&enemyAlive&&Math.hypot(enemy.position.x-player.position.x,enemy.position.z-player.position.z)<22;
 const aimYaw=cameraDistance<1.05?cameraYaw+Math.PI:playerYaw,base=target?Math.atan2(enemy.position.x-player.position.x,enemy.position.z-player.position.z):aimYaw,angle=base+angleOffset,dirX=Math.sin(angle),dirZ=Math.cos(angle);
 group.position.set(player.position.x+dirX*.8,player.position.y+(kind==='sun'?1.65:kind==='arc'?1.05:1.35),player.position.z+dirZ*.8);group.rotation.y=angle;scene.add(group);
 if(kind==='orbit'){group.position.set(player.position.x,player.position.y+1.5,player.position.z);}
 holyProjectiles.push({group,dirX,dirZ,kind,delay,orbit:kind==='orbit'?.65:0,oa:angleOffset,arcMat,life:kind==='sun'?2.7:kind==='arc'?.6:1.7,speed:kind==='sun'?4.2:kind==='arc'?13:kind==='orbit'?11:8.5,damage:kind==='sun'?28:kind==='arc'?Math.round(18*(1+statsForLevel(playerLevel()).damageBonus)):kind==='ultimate'?45:kind==='sword5'?10:kind==='swordHoming'?16:kind==='orbit'?(ownedItems.has('magic_plus')?16:14):14,hit:false,homing:kind==='swordHoming'||kind==='orbit'});
}
/** MOD 211 — Espada do Círculo (aprimoramento do Sol da Justiça; documento mestre, poder 5): um círculo mágico se abre
 *  sob o alvo e uma espada gigante irrompe do chão, ferindo e atordoando por um instante. */
function circleSword(x,z){
 const y=groundHeightAt(x,z),g=new THREE.Group();g.position.set(x,y,z);scene.add(g);
 const gold=addMat(0xffd36a,0),rings=[];for(const [r0,r1,seg] of [[2.3,2.45,64],[1.5,1.6,6],[1.55,1.62,3]]){const m=new THREE.Mesh(new THREE.RingGeometry(r0,r1,seg),seg===64?gold:gold.clone());m.rotation.x=-Math.PI/2;m.position.y=.06;g.add(m);rings.push(m);}
 const steel=new THREE.MeshStandardMaterial({color:0xfff4d8,emissive:0xffc24a,emissiveIntensity:1.8,metalness:.6,roughness:.25}),sword=new THREE.Group();
 const blade=new THREE.Mesh(new THREE.ConeGeometry(.75,7.5,4),steel);blade.position.y=3.75;sword.add(blade);
 const guard=new THREE.Mesh(new THREE.BoxGeometry(3.2,.4,.5),steel);guard.position.y=-.2;sword.add(guard);
 const hilt=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,1.6,8),steel);hilt.position.y=-1.2;sword.add(hilt);
 sword.rotation.z=Math.PI;sword.position.y=-8;g.add(sword);worldAudio.magic&&worldAudio.magic('magic3');
 ultFx.push({t:0,hit:false,tick(t){const tel=Math.min(1,t/.7);rings.forEach((r,i)=>{r.material.opacity=.85*tel*(t<1.9?1:Math.max(0,1-(t-1.9)*2));r.rotation.z+=(i?-.04:.02);});
  if(t>.7&&t<.95){const k=(t-.7)/.25;sword.position.y=-8+9.6*k*k*(3-2*k);}
  if(t>=.95&&!this.hit){this.hit=true;sword.position.y=1.6;cameraShake(.3);hitStop(90);burstSparks(new THREE.Vector3(x,y+1,z),0xfff0b8);
   if(combatStepNow()&&enemy.visible&&enemyAlive&&Math.hypot(enemy.position.x-x,enemy.position.z-z)<2.8){const dmg=Math.round(40*(1+statsForLevel(playerLevel()).damageBonus));enemyHP=Math.max(0,enemyHP-dmg);onEnemyDamaged(dmg,true);enemyAttackCooldown=Math.max(enemyAttackCooldown,1.6);
    if(enemyHP===0){enemyAlive=false;const hud=document.getElementById('enemy-hud');if(hud)hud.style.display='none';if(!playEnemyAnimation('death',.06,true))enemyHasDeathClip=false;setTimeout(()=>advanceAfterEnemyDefeat(),850);}else playEnemyAnimation('hit',.05,true);}}
  if(t>1.9)steel.emissiveIntensity=Math.max(0,1.8-(t-1.9)*3),sword.position.y-=.12;
  if(t>2.5){scene.remove(g);g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});return false;}}});
}
/** MOD 212 — queimadura do Sol da Justiça (inspirado no sol do Escanor): três pulsos de fogo depois do impacto. */
function burnEnemy(){let n=0;const fl=glowSprite(0xff8a20,.0,2.6);scene.add(fl);fxPush(function(t){fl.position.set(enemy.position.x,enemy.position.y+1.2,enemy.position.z);fl.material.opacity=.5+.3*Math.sin(t*14);if(t>(n+1)*.9&&n<3){n++;hurtEnemy(Math.round(5*(1+statsForLevel(playerLevel()).damageBonus)),false);}if(n>=3||!enemyAlive){fxDispose(fl);return false;}});}
/** MOD 212 — a ultimate do herói ganha preparação: a Bíblia se abre, um círculo mágico gira no céu, nuvens e raios
 *  se juntam; só então a espada celestial desce (castDivineJudgment). */
function chargeDivine(){
 const tgt=combatStepNow()&&enemy.visible&&enemyAlive&&Math.hypot(enemy.position.x-player.position.x,enemy.position.z-player.position.z)<16?enemy.position.clone():player.position.clone().add(new THREE.Vector3(Math.sin(playerYaw)*6,0,Math.cos(playerYaw)*6));
 const y=fxGy(tgt.x,tgt.z),g=new THREE.Group();g.position.set(tgt.x,y+22,tgt.z);scene.add(g);const rings=[];
 for(const [r0,r1,seg] of [[7,7.4,64],[5.2,5.5,6],[3.4,3.6,64],[5.3,5.45,3]]){const m=new THREE.Mesh(new THREE.RingGeometry(r0,r1,seg),addMat(0xffe39a,0));m.rotation.x=Math.PI/2;g.add(m);rings.push(m);}
 const clouds=[];for(let i=0;i<10;i++){const c=glowSprite(i%2?0xd8d0ff:0xfff2d0,0,7);const a=i/10*6.28;c.position.set(Math.cos(a)*9,1.5,Math.sin(a)*9);g.add(c);clouds.push(c);}
 showCombatCallout('A PALAVRA SE CUMPRE');slowMo(700,.4);Object.assign(ultCam,{want:.8,height:6,dist:13});ultCam.look.set(tgt.x,y+8,tgt.z);worldAudio.celestial&&worldAudio.celestial();
 fxPush(function(t,dt){const a=Math.min(1,t/.6);rings.forEach((m,i)=>{m.material.opacity=.85*a*(t>1.6?Math.max(0,1-(t-1.6)*2):1);m.rotation.z+=dt*(i%2?-1.2:.8);});clouds.forEach((c,i)=>{const ang=i/10*6.28+t*.6,r=9-t*2.5;c.position.set(Math.cos(ang)*r,1.5,Math.sin(ang)*r);c.material.opacity=.6*a*(t>1.6?Math.max(0,1-(t-1.6)*2):1);});
  if(t>.4&&Math.random()<.08)cameraShake(.06);if(t>.5&&t<1.4&&Math.random()<.06)lightning(tgt.x+(Math.random()-.5)*9,tgt.z+(Math.random()-.5)*9,0xfff0b8);if(t>=1.4&&!g.userData.go){g.userData.go=true;castDivineJudgment();}if(t>2.2){fxDispose(g);return false;}});
}
function castHolyMagic(kind){
 const now=performance.now();if(playerHP<=0)return;
 const check=canCast(kind,{unlocked:skillSet||new Set(),mana:playerMana,cooldownUntil:holyCooldowns,now});if(!check.ok){status.textContent=check.reason;return;}
 playerMana-=SKILLS[kind].mana;holyCooldowns[kind]=now+SKILLS[kind].cooldown;worldAudio.magic(kind);showGrimoire(0xffd56a,kind==='ultimate'?1.8:.9,true);playPose(model,kind==='ultimate'?'channel':'cast',kind==='ultimate'?1.7:.9,()=>playerYaw,kind==='ultimate'?.5:0);
 if(kind==='magic'){const n=ownedItems.has('magic_plus')?5:3;for(let i=0;i<n;i++)spawnHolyProjectile('orbit',i/n*Math.PI*2,0);status.textContent=n===5?'Espadas da Palavra II — cinco espadas orbitam e caçam o alvo!':'Espadas da Palavra — três espadas orbitam você e caçam o alvo!';}
 else if(kind==='magic2'){// MOD 212 — chuva de espadas celestiais numa área marcada (poder 3 do documento mestre)
  const plus=ownedItems.has('magic2_plus'),tgt=combatStepNow()&&enemy.visible&&enemyAlive&&Math.hypot(enemy.position.x-player.position.x,enemy.position.z-player.position.z)<18?enemy.position:{x:player.position.x+Math.sin(playerYaw)*6,z:player.position.z+Math.cos(playerYaw)*6};
  fxRain(tgt.x,tgt.z,plus?4.2:3.2,plus?54:34,1.3,Math.round((plus?17:13)*(1+statsForLevel(playerLevel()).damageBonus)),0xfff0b8,false,true);status.textContent=plus?'Julgamento Celestial II — um céu inteiro de espadas desaba sobre a área!':'Julgamento Celestial — espadas celestiais chovem sobre a área marcada!';}
 else if(kind==='magic3'&&ownedItems.has('magic3_plus')&&combatStepNow()&&enemy.visible&&enemyAlive){spawnHolyProjectile('sun');circleSword(enemy.position.x,enemy.position.z);status.textContent='Espada do Círculo — o círculo se abre e a lâmina colossal irrompe do chão!';}
 else if(kind==='magic3'){spawnHolyProjectile('sun');status.textContent='Sol da Justiça — luz ardente lançada contra o inimigo!';}
 else{chargeDivine();}
}
function updateHolyProjectiles(dt){
 for(let i=holyProjectiles.length-1;i>=0;i--){const p=holyProjectiles[i];if(p.orbit>0){p.orbit-=dt;p.oa+=dt*7;p.group.position.set(player.position.x+Math.sin(p.oa)*1.3,player.position.y+1.5+Math.sin(p.oa*2)*.15,player.position.z+Math.cos(p.oa)*1.3);p.group.rotation.y=p.oa+Math.PI/2;if(p.orbit<=0){const tx=(enemy.visible&&enemyAlive?enemy.position.x:p.group.position.x+Math.sin(playerYaw))-p.group.position.x,tz=(enemy.visible&&enemyAlive?enemy.position.z:p.group.position.z+Math.cos(playerYaw))-p.group.position.z,d=Math.hypot(tx,tz)||1;p.dirX=tx/d;p.dirZ=tz/d;p.group.rotation.y=Math.atan2(p.dirX,p.dirZ);}continue;}p.delay-=dt;if(p.delay>0)continue;p.life-=dt;if(p.kind==='arc'){const k=1-p.life/.6;p.group.scale.setScalar(1+k*1.3);p.group.traverse(o=>{if(o.material&&o.material.transparent)o.material.opacity=Math.max(0,(o.material===p.arcMat?.9:.55)*(1-k));});}if(p.homing&&enemy.visible&&enemyAlive){const hx=enemy.position.x-p.group.position.x,hz=enemy.position.z-p.group.position.z,hd=Math.hypot(hx,hz)||1;p.dirX+=(hx/hd-p.dirX)*Math.min(1,dt*5);p.dirZ+=(hz/hd-p.dirZ)*Math.min(1,dt*5);const n=Math.hypot(p.dirX,p.dirZ)||1;p.dirX/=n;p.dirZ/=n;p.group.rotation.y=Math.atan2(p.dirX,p.dirZ);}p.group.position.x+=p.dirX*p.speed*dt;p.group.position.z+=p.dirZ*p.speed*dt;if(p.kind==='sun'){p.group.position.y+=Math.sin(performance.now()*.006)*dt*.22;p.group.rotation.y+=dt*2;}else p.group.rotation.z+=dt*2;
  const d=Math.hypot(p.group.position.x-enemy.position.x,p.group.position.z-enemy.position.z);
  if(!p.hit&&enemyAlive&&combatStepNow()&&enemy.visible&&d<(p.kind==='arc'?1.9:1.15)&&Math.abs(p.group.position.y-(enemy.position.y+1))<1.8){p.hit=true;enemyHP=Math.max(0,enemyHP-p.damage);onEnemyDamaged(p.damage,p.kind==='ultimate');if(p.kind==='sun')burnEnemy();enemyHitFlash=.2;setEnemyHitFlash(true);setTimeout(()=>setEnemyHitFlash(false),130);const fill=document.getElementById('enemy-hp-fill');if(fill)fill.style.width=enemyHpPercent()+'%';p.life=0;if(enemyHP===0){enemyAlive=false;playEnemyAnimation('death',.06,true);status.textContent='A luz venceu este inimigo. Caminho liberado.';setTimeout(()=>advanceAfterEnemyDefeat(),650);}}
  if(p.life<=0){scene.remove(p.group);p.group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});holyProjectiles.splice(i,1);}
 }
}
function action(kind){if(playerHP<=0||cineActive)return;const now=performance.now();if(kind==='dash'){if(now<dashCooldownUntil)return;dashCooldownUntil=now+720;let intentX=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joyX;let intentZ=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+joyY;let intentLen=Math.hypot(intentX,intentZ);if(intentLen>.12){intentX/=intentLen;intentZ/=intentLen;dashDirX=intentX*Math.cos(cameraYaw)+intentZ*Math.sin(cameraYaw);dashDirZ=-intentX*Math.sin(cameraYaw)+intentZ*Math.cos(cameraYaw);}else{const moveLen=Math.hypot(moveVX,moveVZ);if(moveLen>.2){dashDirX=moveVX/moveLen;dashDirZ=moveVZ/moveLen;}else{dashDirX=Math.sin(playerYaw);dashDirZ=Math.cos(playerYaw);}}dashRemaining=.32;playerInvulnerableUntil=Math.max(playerInvulnerableUntil,now+330);worldAudio.whoosh();if(actions.dash)playOnce('dash',.045);else if(actions.walk)play('walk',.045);actionUntil=now+360;return;}if(kind==='jump'){if(!grounded)return;grounded=false;verticalVelocity=jumpImpulse;worldAudio.whoosh();if(actions.jump){playOnce('jump',.08);actionUntil=now+Math.max(320,Math.min(700,actions.jump.getClip().duration*1000));}else{actionUntil=now+180;}return;}if(kind==='attack'){tryPlayerAttack();return;}if(kind==='magic'||kind==='magic2'||kind==='magic3'||kind==='ultimate'){castHolyMagic(kind);return;}}
// MOD 187 — o celular não gera 'click' para um segundo dedo enquanto o primeiro segura o joystick; pointerdown responde sempre.
function bindInstantTap(button,fn){if(!button)return;let lastTap=0;button.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();lastTap=performance.now();fn();});button.addEventListener('click',e=>{if(performance.now()-lastTap>500)fn();});}
function bindInstantAction(id,kind){bindInstantTap(document.getElementById(id),()=>action(kind));}
bindInstantAction('attack','attack');bindInstantAction('dash','dash');
// MOD 213 — botão de correr (liga/desliga; no teclado, segure Shift).
bindInstantTap(document.getElementById('run'),()=>{sprintToggle=!sprintToggle;const b=document.getElementById('run');if(b)b.classList.toggle('on',sprintToggle);});
const jumpButton=document.getElementById('jump');
// pointerdown responde imediatamente ao segundo dedo enquanto o primeiro mantém o joystick.
jumpButton.addEventListener('pointerdown',e=>{e.preventDefault();action('jump');});
for(const id of ['magic','magic2','magic3','ultimate'])bindInstantAction(id,id);
// MOD 186 — atalhos unificados no listener de teclado acima (antes havia dois listeners para J/X/Espaço).
let lastMove=0,moveVX=0,moveVZ=0,playerYaw=Math.PI;
let cameraYaw=0,cameraPitch=.16,cameraDistance=8.5;
const lookArea=document.getElementById('look-area');
const cameraToggle3D=document.getElementById('camera-toggle-3d');
function syncCameraToggle3D(){
 const firstPerson=cameraDistance<1.05;
 if(cameraToggle3D){
  cameraToggle3D.textContent=firstPerson?'3ª PESSOA':'1ª PESSOA';
  cameraToggle3D.setAttribute('aria-pressed',String(firstPerson));
  cameraToggle3D.setAttribute('aria-label',firstPerson?'Mudar para terceira pessoa':'Mudar para primeira pessoa');
  cameraToggle3D.title=firstPerson?'Mudar para terceira pessoa':'Mudar para primeira pessoa';
 }
}
if(cameraToggle3D)bindInstantTap(cameraToggle3D,()=>{
 cameraDistance=cameraDistance<1.05?8.5:.72;
 cameraPitch=THREE.MathUtils.clamp(cameraPitch,-1.05,1.05);
 syncCameraToggle3D();
 const status=document.getElementById('status');
 if(status)status.textContent=cameraDistance<1.05?'Câmera em primeira pessoa. Arraste para olhar ao redor.':'Câmera em terceira pessoa. Arraste para olhar e use dois dedos para ajustar a distância.';
});
const lookPointers=new Map();let lastPinchDistance=0;
function pinchDistance(){const pts=Array.from(lookPointers.values());return pts.length<2?0:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);}
let mouseLookStart=null;lookArea.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();lookPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(e.pointerType==='mouse')mouseLookStart={x:e.clientX,y:e.clientY,t:performance.now()};try{lookArea.setPointerCapture(e.pointerId);}catch(_){}if(lookPointers.size===2){lastPinchDistance=pinchDistance();return;} });
lookArea.addEventListener('pointermove',e=>{if(!lookPointers.has(e.pointerId))return;const prev=lookPointers.get(e.pointerId);lookPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(lookPointers.size>=2){const d=pinchDistance();if(lastPinchDistance>0&&d>0){cameraDistance=THREE.MathUtils.clamp(cameraDistance+(lastPinchDistance-d)*.025,.72,15);syncCameraToggle3D(); }lastPinchDistance=d;return;}const dx=e.clientX-prev.x,dy=e.clientY-prev.y;const firstPersonLook=cameraDistance<1.05;lastLookInputAt=performance.now();
const lookSensitivity=(firstPersonLook?.0022:.004)*userSettings.sensitivity;
cameraYaw-=dx*lookSensitivity;
cameraPitch=THREE.MathUtils.clamp(cameraPitch+dy*(firstPersonLook?.003:.004)*userSettings.sensitivity,-1.32,1.32);});
function endLook(e){const start=mouseLookStart;mouseLookStart=null;lookPointers.delete(e.pointerId);lastPinchDistance=pinchDistance();if(start&&e.pointerType==='mouse'&&!dialogueOpen&&!namePromptOpen&&!awakeningActive&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<8&&performance.now()-start.t<420)action('attack');}
lookArea.addEventListener('pointerup',endLook);lookArea.addEventListener('pointercancel',endLook);lookArea.addEventListener('lostpointercapture',endLook);
lookArea.addEventListener('wheel',e=>{cameraDistance=THREE.MathUtils.clamp(cameraDistance+e.deltaY*.008,.72,15);syncCameraToggle3D();},{passive:true});
addEventListener('blur',()=>{lookPointers.clear();lastPinchDistance=0;joyActive=false;joyX=joyY=0;knob.style.transform='translate(0,0)';});

function blockedAt(x,z){
 if(voidMode)return voidSpec.walk?!voidSpec.walk(x-voidSpec.x,z-voidSpec.z):Math.hypot(x-voidSpec.x,z-voidSpec.z)>voidSpec.radius;
 if(!terrain3D.walkable(x,z))return true;
 for(const o of treeObstacles){const dx=x-o.x,dz=z-o.z;if(dx*dx+dz*dz<o.radius*o.radius)return true;}
 for(const o of marketObstacles){if(o.height!==undefined&&o.height<=.68)continue;const dx=x-o.x,dz=z-o.z;if(o.shape==='box'?Math.abs(dx)<o.halfX&&Math.abs(dz)<o.halfZ:dx*dx+dz*dz<o.radius*o.radius)return true;}
 for(const rock of rockObstacles){if(rock.height<=.68)continue;const dx=x-rock.x,dz=z-rock.z,collisionRadius=rock.radius*.74;if(dx*dx+dz*dz<collisionRadius*collisionRadius)return true;}
 return false;
}
function playerBlockedAt(x,z){
 if(blockedAt(x,z))return true;
 if(questStep>=2&&!childrenFreed&&CAGE_SPOTS.some(s=>Math.abs(x-s.x)<.72&&Math.abs(z-s.z)<.72))return true;
 return !!(enemy&&enemy.visible&&enemyAlive&&Math.hypot(x-enemy.position.x,z-enemy.position.z)<.86);
}
function enemyBlockedAt(x,z){
 if(blockedAt(x,z))return true;
 return Math.hypot(x-player.position.x,z-player.position.z)<.9;
}
function terrainHeightAt(x,z){
 if(voidMode)return voidSpec.y;
 let height=groundHeightAt(x,z);
 for(const rock of rockObstacles){const d=Math.hypot(x-rock.x,z-rock.z);if(d<rock.radius){const t=1-d/rock.radius;const smooth=t*t*(3-2*t);height=Math.max(height,rock.base+rock.height*smooth);}}
 for(const obstacle of walkableObstacles){let distance;
  if(obstacle.type==='capsule'){const along=THREE.MathUtils.clamp((x-obstacle.x)*obstacle.axisX+(z-obstacle.z)*obstacle.axisZ,-obstacle.halfLength,obstacle.halfLength);distance=Math.hypot(x-(obstacle.x+obstacle.axisX*along),z-(obstacle.z+obstacle.axisZ*along));}
  else distance=Math.hypot(x-obstacle.x,z-obstacle.z);
  if(distance<obstacle.radius){const t=1-distance/obstacle.radius,smooth=t*t*(3-2*t);height=Math.max(height,obstacle.height*smooth);}
 }
 return height;
}

const CAGE_SPOTS=[{x:-14.4,z:-96.6},{x:-9.6,z:-97.4}];
const CAGE_CENTER={x:-12,z:-97};
const cageDoors=[];
const childFollowers=[];
function buildAct1Cages(){
 const barMat=woodMat,iron=mat(0x3a342c);
 for(const spot of CAGE_SPOTS){
  const g=new THREE.Group();g.position.set(spot.x,0,spot.z);scene.add(g);
  const floor=new THREE.Mesh(new THREE.BoxGeometry(1.35,.08,1.35),woodLightMat);floor.position.y=.04;floor.receiveShadow=true;g.add(floor);
  for(const x of [-.62,.62])for(const z of [-.62,.62]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.045,.05,1.35,5),woodMat);post.position.set(x,.72,z);post.castShadow=true;g.add(post);}
  for(let i=0;i<4;i++){const bar=new THREE.Mesh(new THREE.BoxGeometry(.04,1.15,.04),iron);bar.position.set(-.62+i*.41,.78,.62);g.add(bar);}
  const door=new THREE.Group();door.position.set(0,0,-.62);g.add(door);
  for(const x of [-.28,.28]){const bar=new THREE.Mesh(new THREE.BoxGeometry(.045,1.2,.045),iron);bar.position.set(x,.75,0);door.add(bar);}
  const latch=new THREE.Mesh(new THREE.BoxGeometry(.7,.05,.05),iron);latch.position.set(0,1.15,0);door.add(latch);
  cageDoors.push(door);
 }
 cageRootVisible();
}
function cageRootVisible(){for(const door of cageDoors){const root=door.parent;if(root)root.visible=questStep>=2;}}
function openCageDoors(){for(const door of cageDoors)door.rotation.y=-1.15;}
function updateCages(){cageRootVisible();if(childrenFreed)openCageDoors();}
// MOD 204 — as crianças agora são moradores sentados (MoradoresPose.glb) dentro das gaiolas; ver buildAct1Props().
function spawnAct1Children(){buildAct1Props();}
buildAct1Cages();

var debugDtScale=1;// só o modo de teste (?debug3d=1) muda isto, para acelerar as cenas no navegador sem GPU
function animate(){requestAnimationFrame(animate);if(vsOpen||gamePaused||menuGate){clock.getDelta();return;}const rawDt=Math.min(clock.getDelta(),.04)*debugDtScale,now=performance.now(),dt=now<hitStopUntil?rawDt*.06:now<slowMoUntil?rawDt*slowMoK:rawDt;updatePlayerRespawn(now);updateHolyProjectiles(dt);for(const uniform of forestWindUniforms)uniform.value=now*.001;portalRing.rotation.z=Math.sin(now*.00045)*.045;portalInnerRing.rotation.z=-now*.00032;vortex.rotation.z=-now*.00165;portalLight.intensity=2.7+Math.sin(now*.003)*.45;portalSigil.rotation.z=now*.00022;for(const relic of floatingRelics){relic.mesh.position.y=relic.baseY+Math.sin(now*.0015+relic.phase)*.16;relic.mesh.rotation.y+=dt*.42;}for(const cloud of movingClouds){cloud.group.position.x+=cloud.speed*dt;cloud.group.position.y=cloud.baseY+Math.sin(now*.00018+cloud.phase)*.34;if(cloud.group.position.x>145)cloud.group.position.x=-145;else if(cloud.group.position.x<-145)cloud.group.position.x=145;}for(const npc of villageNpcBreathing){npc.root.position.y=npc.baseY+Math.sin(now*.00145+npc.phase)*.022;npc.root.rotation.z=Math.sin(now*.0011+npc.phase)*.008;}if(mixer)mixer.update(dt);if(enemyMixer)enemyMixer.update(dt);if(model&&grounded&&Math.abs(verticalVelocity)<.015&&playerHP>0){model.updateMatrixWorld(true);const floorY=terrainHeightAt(player.position.x,player.position.z);if(!model.userData.footBones){const fb=[];model.traverse(o=>{if(o.isBone&&/(left|right).*(foot|toe|ankle)|(foot|toe|ankle).*(left|right)/i.test(o.name||''))fb.push(o);});model.userData.footBones=fb;}let lowFoot=Infinity;for(const o of model.userData.footBones){footTmpVec.setFromMatrixPosition(o.matrixWorld);if(Number.isFinite(footTmpVec.y)&&footTmpVec.y<lowFoot)lowFoot=footTmpVec.y;}if(lowFoot<Infinity){model.position.y+=floorY-lowFoot;}}if(guideProceduralBreath){const breath=Math.sin(now*.00175);guideBreathingPivot.scale.set(1-breath*.008,1+breath*.022,1-breath*.008);guideBreathingPivot.position.y=.012+breath*.018;if(guideModel&&guideModel.userData.breathBones){for(const b of guideModel.userData.breathBones){b.bone.rotation.x=b.baseX+breath*.018;b.bone.scale.y=b.baseScaleY*(1+breath*.012);}}}if(enemyModel){
 // Reancora pelo ponto mais baixo dos ossos dos pés após cada atualização do rig.
 // MOD 186 — a raiz do inimigo acompanha o relevo; antes ficava em y=0 e, na subida, os golpes "passavam por cima".
 if(enemyAlive||enemyHasDeathClip)enemy.position.y=terrainHeightAt(enemy.position.x,enemy.position.z);
 enemy.updateMatrixWorld(true);
 const floorY=terrainHeightAt(enemy.position.x,enemy.position.z),footPoints=[];
 enemyModel.traverse(o=>{if(o.isBone&&/(left|right).*(foot|toe|ankle)|(foot|toe|ankle).*(left|right)/i.test(o.name||'')){o.updateWorldMatrix(true,false);const p=o.getWorldPosition(new THREE.Vector3());if(Number.isFinite(p.y))footPoints.push(p.y);}});
 if(footPoints.length){enemyModelRoot.position.y+=floorY-Math.min(...footPoints);}
 else{const animatedBounds=new THREE.Box3().setFromObject(enemyModel);if(!animatedBounds.isEmpty()&&Number.isFinite(animatedBounds.min.y))enemyModelRoot.position.y+=floorY-animatedBounds.min.y;}
 }if(guideIdleMixer)guideIdleMixer.update(dt);if(enemyDashCooldown>0)enemyDashCooldown=Math.max(0,enemyDashCooldown-dt);if(enemySpecialCooldown>0)enemySpecialCooldown=Math.max(0,enemySpecialCooldown-dt);if(enemyCastCooldown>0)enemyCastCooldown=Math.max(0,enemyCastCooldown-dt);if(enemyBlockCooldown>0)enemyBlockCooldown=Math.max(0,enemyBlockCooldown-dt);updateEnemyProjectiles(dt);for(const npcMixer of villageNpcMixers){if(!npcMixer.__far)npcMixer.update(dt);}updateNpcCulling();updateVillagers(dt);if(combatStepNow()&&questStep<13&&enemyLoadState==='idle')loadEnemyModel();updatePortalPull(dt);
 if(pendingEnemyHitAt&&now>=pendingEnemyHitAt){pendingEnemyHitAt=0;resolvePlayerAttackHit();}
    updatePlayerSwordMount();
 if(enemyHitFlash>0){enemyHitFlash=Math.max(0,enemyHitFlash-dt);setEnemyHitFlash(true);}else setEnemyHitFlash(false);
 if(enemyCurrentRole==='hit'&&enemyCurrentAction&&!enemyCurrentAction.isRunning()&&enemyAlive)playEnemyAnimation('idle',.08);
  if(!enemyAlive&&!enemyHasDeathClip&&enemy.visible){enemy.rotation.z=THREE.MathUtils.lerp(enemy.rotation.z,-1.35,1-Math.exp(-5*dt));enemy.position.y=Math.max(terrainHeightAt(enemy.position.x,enemy.position.z)-.55,enemy.position.y-dt*1.3);enemy.scale.multiplyScalar(Math.max(.001,1-dt*.65));}
 guide.position.y=groundHeightAt(guide.position.x,guide.position.z);guideAura.intensity=.4+Math.sin(now*.003)*.06;
 const guideDistance=Math.hypot(guide.position.x-player.position.x,guide.position.z-player.position.z);
 const clearingDistance=Math.hypot(CLEARING.x-player.position.x,CLEARING.z-player.position.z);
 const portalDistance=Math.hypot(PORTAL.x-player.position.x,PORTAL.z-player.position.z);
 const talkButton=document.getElementById('talk-button');
 const nearbyVendor=nearestVillageVendor();
 const fightingNow=enemy.visible&&enemyAlive;const nearStone=nearestWaystone(),atShop=nearShopDoor(),act1Label=act1TalkLabel()||act2StoryLabel()||(act3Ready?act3Label()||act4Label()||act6Label():''),act2Label=act2TalkLabel()||(finaleReady?finaleTalkLabel():'')||(lateSystemsReady?lateTalkLabel():'');const canTalk=!!act1Label||!!act2Label||atShop||!!nearStone||(questStep===0&&guideDistance<=2.7)||!!nearbyVendor;
 if(talkButton){const label=act1Label?act1Label:act2Label?act2Label:atShop?'LOJA CENTRAL':nearStone?(mapState.waystones.has(nearStone.id)?'ABRIGO · MAPA':'REGISTRAR ABRIGO'):nearbyVendor?'FALAR · '+nearbyVendor.shortName:'FALAR';talkButton.textContent=label;talkButton.classList.toggle('hidden',!canTalk||dialogueOpen||namePromptOpen||awakeningActive||!!portalPull||cineActive);}
 questMarker.visible=(questStep<15||isAct3Step(questStep)||isAct4Step(questStep)||questStep===ACT5N.step||isAct6Step(questStep))&&!portalPull&&(!voidMode||inSewer||inVolcano||!!act3Void||inTower)&&!cineActive;
 if(questStep===0)questMarker.position.set(guide.position.x,terrainHeightAt(guide.position.x,guide.position.z)+.06,guide.position.z);
 if(combatStepNow()&&enemy.visible&&enemyAlive&&Math.hypot(enemy.position.x-player.position.x,enemy.position.z-player.position.z)<6.5)enemy.rotation.y=Math.atan2(player.position.x-enemy.position.x,player.position.z-enemy.position.z);
 if(dialogueOpen&&actions.idle&&now>actionUntil)play('idle',.08);
let axisX=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joyX;
let axisZ=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+joyY;
if(dialogueOpen||namePromptOpen||awakeningActive||playerHP<=0||portalPull||cineActive){axisX=0;axisZ=0;}
// MOD 206 — dimensão distorcida do Ato III: frente vira trás e esquerda vira direita.
if(distorted||performance.now()<foeInvertUntil){axisX=-axisX;axisZ=-axisZ;}
let len=Math.hypot(axisX,axisZ);if(len>1){axisX/=len;axisZ/=len;len=1;}
// Mesmo princípio da dimensão do Valério: o joystick é relativo à orientação da câmera,
// com zona morta analógica e aceleração/desaceleração suaves, em vez de deslocar o modelo instantaneamente.
const dead=.12;if(len<dead){axisX=0;axisZ=0;}else{const power=(len-dead)/(1-dead);axisX=axisX/len*power;axisZ=axisZ/len*power;}
const worldX=axisX*Math.cos(cameraYaw)+axisZ*Math.sin(cameraYaw);
const worldZ=-axisX*Math.sin(cameraYaw)+axisZ*Math.cos(cameraYaw);
const speed=(defending?1.9:isSprinting()?7.2:4.3)*act3SpeedMul()*foeSlowMul(),targetVX=worldX*speed,targetVZ=worldZ*speed;
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
// Pedras pequenas e o tronco baixo são degraus transponíveis; árvores e rochas altas continuam bloqueando.
if(dashRemaining>0){
 const dashDt=Math.min(dt,dashRemaining);const nextX=THREE.MathUtils.clamp(player.position.x+dashDirX*12.5*dashDt,-1900,1900);const nextZ=THREE.MathUtils.clamp(player.position.z+dashDirZ*12.5*dashDt,-1900,1900);
 if(!playerBlockedAt(nextX,player.position.z))player.position.x=nextX;
 if(!playerBlockedAt(player.position.x,nextZ))player.position.z=nextZ;
 playerYaw=Math.atan2(dashDirX,dashDirZ);player.rotation.y=playerYaw;dashRemaining=Math.max(0,dashRemaining-dt);
}else if(moving){
 const nextX=THREE.MathUtils.clamp(player.position.x+moveVX*dt,-1900,1900);
 const nextZ=THREE.MathUtils.clamp(player.position.z+moveVZ*dt,-1900,1900);
 // Testa cada eixo separadamente para o jogador conseguir deslizar junto à árvore/pedra.
 if(!playerBlockedAt(nextX,player.position.z))player.position.x=nextX;else moveVX=0;
 if(!playerBlockedAt(player.position.x,nextZ))player.position.z=nextZ;else moveVZ=0;
 const wantedYaw=Math.atan2(moveVX,moveVZ);
 const yawDelta=Math.atan2(Math.sin(wantedYaw-playerYaw),Math.cos(wantedYaw-playerYaw));
 playerYaw+=yawDelta*(1-Math.exp(-12*dt));player.rotation.y=playerYaw;
 if(grounded&&now>actionUntil&&actions.walk){const sp=Math.hypot(moveVX,moveVZ);if(actions.run&&sp>5.2){play('run');actions.run.setEffectiveTimeScale(THREE.MathUtils.clamp(sp/7.2,.85,1.25));}else{play('walk');const walkAction=actions.walk;if(walkAction)walkAction.setEffectiveTimeScale(THREE.MathUtils.clamp(sp/3.4,.55,1.45));}}
}else if(playerHP>0&&grounded&&now>actionUntil&&actions.idle)play('idle');
// Física vertical com altura do terreno: o personagem pode subir e descer pelas pedras.
const floorY=terrainHeightAt(player.position.x,player.position.z);
if(!grounded){
 verticalVelocity-=gravity*dt;
 player.position.y+=verticalVelocity*dt;
 if(player.position.y<=floorY){player.position.y=floorY;verticalVelocity=0;grounded=true;worldAudio.land();}
}else{
 player.position.y=floorY;
}
updateEnemyAI(dt);updateEnemyHud();updatePlayerHud();playerMana=regenMana(playerMana,dt*act3ManaMul(),combatStepNow()&&enemy.visible&&enemyAlive);updateSkillHud(now);updateDayNight(dt);updateInstanceCulling();checkSecretRuin();
 const firstPerson=cameraDistance<1.05;if(model)model.visible=!firstPerson;const target=new THREE.Vector3(player.position.x,player.position.y+(firstPerson?1.52:1.15),player.position.z);
if(firstPerson){
 // Câmera na altura dos olhos, com direção própria em primeira pessoa.
 camera.position.lerp(target,1-Math.exp(-14*dt));
 const cp=Math.cos(cameraPitch),lookDir=new THREE.Vector3(-Math.sin(cameraYaw)*cp,-Math.sin(cameraPitch),-Math.cos(cameraYaw)*cp);
 camera.lookAt(camera.position.clone().add(lookDir.multiplyScalar(12)));
}else{
 const camFrame=computeCameraTarget(target,dt);target.copy(camFrame.focus);const camDistUse=effectiveCameraDistance(camFrame.engaged,dt);
 const camOffset=new THREE.Vector3(Math.sin(cameraYaw)*camDistUse*Math.cos(cameraPitch),camDistUse*Math.sin(cameraPitch),Math.cos(cameraYaw)*camDistUse*Math.cos(cameraPitch));
 const desired=target.clone().add(camOffset);
 // MOD 186 — se um tronco fica entre o herói e a câmera, aproxima a câmera em vez de enquadrar a casca.
 {const ox=camOffset.x,oz=camOffset.z,len2=ox*ox+oz*oz;let limit=1;
  if(len2>.01)for(const o of treeObstacles){const rx=o.x-target.x,rz=o.z-target.z;if(Math.abs(rx)>cameraDistance+2||Math.abs(rz)>cameraDistance+2)continue;const t=(rx*ox+rz*oz)/len2;if(t<=.05||t>=1.05)continue;const px=rx-ox*t,pz=rz-oz*t,r=o.radius+.32;if(px*px+pz*pz<r*r)limit=Math.min(limit,Math.max(.18,t-r/Math.sqrt(len2)));}
  // Encosta entre o herói e a câmera (subida do portal, contrafortes): encurta antes de entrar no morro.
  for(let i=1;i<=6;i++){const f=i/6*limit,sx=target.x+camOffset.x*f,sy=target.y+camOffset.y*f,sz=target.z+camOffset.z*f;if(groundHeightAt(sx,sz)+.45>sy){limit=Math.max(.16,(i-1)/6*limit);break;}}
  if(limit<1)desired.copy(target).addScaledVector(camOffset,limit);}
 camera.position.lerp(desired,1-Math.exp(-8*dt));camera.lookAt(target);applyUltCam(dt,target);
}
// Vegetação instanciada permanece imóvel; evita rotações por quadro de centenas de instâncias.
// A espada acompanha diretamente o osso da mão; o golpe vem do clipe de animação do personagem, sem balanço artificial por código.
updateAutoGraphics3D(dt,now);
 if(awakeningActive){awakeningT=Math.min(1,awakeningT+dt/5.4);const yaw=Math.sin(awakeningT*Math.PI*1.6)*.85,pitch=.22+Math.sin(awakeningT*Math.PI)*.16,dist=8.2;const target=new THREE.Vector3(player.position.x,player.position.y+1.35,player.position.z);camera.position.set(target.x+Math.sin(yaw)*dist*Math.cos(pitch),target.y+dist*Math.sin(pitch)+.35,target.z+Math.cos(yaw)*dist*Math.cos(pitch));camera.lookAt(target);if(awakeningT>=1)finishAwakening();}
 updateCages();updateAct1(dt,now);
 updateFpsBadge(now);updateFriendlyStrikes(dt);autoRecenterCamera(dt,now);updateFovKick(rawDt);updateFpExtras(dt);updateWarnRing(dt);updateHazards(dt);updateBlackHole(dt,now);updateBossUltimates(dt,now);updateFoeKit(dt);updatePoses(dt);updateAct2(dt,now);if(act3Ready){updateAct3(dt,now);updateAct4(dt,now);updateAct5(dt,now);updateAct6(dt,now);}if(lateSystemsReady)updateLate(dt,now);if(finaleReady)updateFinale(dt,now);updateObjectiveArrow();updateCombatJuice(rawDt);updateSideItems(dt,now);tickPlayTime(dt,now);updateHeartsHud();if(!heroPortraitDone&&model)renderHeroPortrait();updateSlashTrail(dt);updateUltimateFx(rawDt);updateDefense(dt);updateLockOn(dt);updatePrologue(dt);updateFirstPerson(dt,now);updateAmbientLife(dt,now);updateWorldAudio(dt);keepCameraAboveTerrain();if(debugCameraOverride){camera.position.copy(debugCameraOverride.from);camera.lookAt(debugCameraOverride.to);}updateSkyAndShadows();applyCameraShake(rawDt);updateCine(dt,now);
 renderer.render(scene,camera);}
/* MOD 186 — céu, sol e lua acompanham a câmera (o mundo agora vai até o horizonte); sombra acompanha o jogador. */
function updateSkyAndShadows(){
 skyDome.position.copy(camera.position);skyDome.scale.setScalar(SKY_SCALE);
 SKY_FOLLOW.copy(SUN_DIRECTION).multiplyScalar(560).add(camera.position);sunDisk.position.copy(SKY_FOLLOW);sunHalo.position.copy(SKY_FOLLOW);sunDisk.scale.setScalar(2.6);sunHalo.scale.set(68,68,1);
 if(moonRoot){moonRoot.position.set(camera.position.x+moonPosition.x*2.2,camera.position.y+moonPosition.y*2.2,camera.position.z+moonPosition.z*2.2);moonRoot.scale.setScalar(4);moonRoot.lookAt(camera.position);}
 // Caixa de sombra menor e centrada no jogador: sombras mais nítidas sem custo extra; ajusta à grade de texels para não tremer.
 const texel=(sunLight.shadow.camera.right-sunLight.shadow.camera.left)/Math.max(1,sunLight.shadow.mapSize.x);
 const tx=Math.round(player.position.x/texel)*texel,tz=Math.round(player.position.z/texel)*texel;
 sunLight.target.position.set(tx,player.position.y,tz);sunLight.position.set(tx+LIGHT_DIRECTION.x*90,player.position.y+LIGHT_DIRECTION.y*90,tz+LIGHT_DIRECTION.z*90);
 if(starField)starField.position.copy(camera.position);
}
/* MOD 186 — a câmera em terceira pessoa não atravessa encostas nem a subida do portal. */
function keepCameraAboveTerrain(){
 const floor=groundHeightAt(camera.position.x,camera.position.z)+.55;
 if(camera.position.y<floor)camera.position.y=floor;
}

/* MOD 176 — perfis gráficos reais para o mundo 3D; Auto ajusta a qualidade conforme FPS. */
const graphics3DProfiles={
 low:{scale:.62,shadows:false,shadowSize:256,foliage:false,clouds:false},
 high:{scale:.9,shadows:true,shadowSize:512,foliage:true,clouds:true},
 max:{scale:1.2,shadows:true,shadowSize:1024,foliage:true,clouds:true}
};
let graphics3DMode='auto',graphics3DScale=.78,graphics3DFps=0,graphics3DSampleTime=0,graphics3DSampleFrames=0,graphics3DLowTime=0,graphics3DHighTime=0,graphics3DLastChange=0;
var autoShadowDecision=null;
function autoShadowsDecision(){if(autoShadowDecision===null)autoShadowDecision=!terrainLowSpec;return autoShadowDecision;}
function applyGraphics3D(mode,autoScale){
 const previousMode=graphics3DMode;
 if(mode!==previousMode){graphics3DFps=0;graphics3DSampleTime=0;graphics3DSampleFrames=0;graphics3DLowTime=0;graphics3DHighTime=0;}
 graphics3DMode=mode;
 const baseline=graphics3DProfiles[mode]||graphics3DProfiles.high;
 graphics3DScale=mode==='auto'?autoScale:baseline.scale;
 /* MOD 202 — ligar/desligar sombras muda os shaders (recompilação = travada de alguns segundos). No modo Auto a
    decisão é tomada uma única vez; só a resolução sobe e desce com o FPS. */
 const shadowEnabled=mode==='auto'?autoShadowsDecision():baseline.shadows;
 const shadowSize=mode==='auto'?512:baseline.shadowSize;
 const nextRatio=Math.min((devicePixelRatio||1)*graphics3DScale,1.5);
 if(Math.abs(renderer.getPixelRatio()-nextRatio)>.001||renderer.domElement.width!==Math.floor(innerWidth*nextRatio)){renderer.setPixelRatio(nextRatio);renderer.setSize(innerWidth,innerHeight);}
 renderer.shadowMap.enabled=shadowEnabled;
 sunLight.castShadow=shadowEnabled;
 if(sunLight.shadow.mapSize.x!==shadowSize){sunLight.shadow.mapSize.set(shadowSize,shadowSize);if(sunLight.shadow.map){sunLight.shadow.map.dispose();sunLight.shadow.map=null;}}
 sunLight.shadow.needsUpdate=true;
 renderer.shadowMap.needsUpdate=true;
 grassGroup.visible=mode==='auto'?graphics3DScale>=.6:baseline.foliage;
 mossInstancesA.visible=grassGroup.visible;mossInstancesB.visible=grassGroup.visible;
 for(const cloud of movingClouds)cloud.group.visible=mode==='auto'?graphics3DScale>=.7:baseline.clouds;
 const label=mode==='auto'?'Automático':mode==='low'?'Baixo':mode==='high'?'Alto':'Máximo';
 const status=document.getElementById('graphics-status-3d');
 if(status)status.textContent=label+' · '+Math.round(graphics3DScale*100)+'% de resolução'+(mode==='auto'?(graphics3DFps?' · '+Math.round(graphics3DFps)+' FPS':' · medindo FPS'):'');
}
function updateAutoGraphics3D(dt,now){
 if(graphics3DMode!=='auto'||!Number.isFinite(dt)||dt<=0||dt>.25)return;
 graphics3DSampleTime+=dt;graphics3DSampleFrames++;
 if(graphics3DSampleTime<2)return;
 graphics3DFps=graphics3DSampleFrames/graphics3DSampleTime;
 const elapsed=graphics3DSampleTime;graphics3DSampleTime=0;graphics3DSampleFrames=0;
 if(graphics3DFps<34){graphics3DLowTime+=elapsed;graphics3DHighTime=0;}
 else if(graphics3DFps>52){graphics3DHighTime+=elapsed;graphics3DLowTime=0;}
 else{graphics3DLowTime=0;graphics3DHighTime=0;}
 if(graphics3DLowTime>=3.5&&now-graphics3DLastChange>4000){
  graphics3DLowTime=0;graphics3DLastChange=now;
  applyGraphics3D('auto',Math.max(.55,graphics3DScale-.12));
 }else if(graphics3DHighTime>=8&&now-graphics3DLastChange>8000){
  graphics3DHighTime=0;graphics3DLastChange=now;
  applyGraphics3D('auto',Math.min(.95,graphics3DScale+.08));
 }else{
  const status=document.getElementById('graphics-status-3d');
  if(status)status.textContent='Automático · '+Math.round(graphics3DScale*100)+'% de resolução · '+Math.round(graphics3DFps)+' FPS';
 }
}
(function initAudioSettings(){
 const panel=document.getElementById('graphics-panel-3d');if(!panel)return;
 const box=document.createElement('div');box.className='audio-settings';box.innerHTML='<h2>Som</h2><label>Ambiente <input id="vol-ambient" type="range" min="0" max="100"></label><label>Efeitos <input id="vol-sfx" type="range" min="0" max="100"></label><label>Música <input id="vol-music" type="range" min="0" max="100"></label><label class="audio-mute"><input id="vol-muted" type="checkbox"> Silenciar tudo</label>';panel.appendChild(box);
 const st=worldAudio.settings;const amb=box.querySelector('#vol-ambient'),sfx=box.querySelector('#vol-sfx'),mute=box.querySelector('#vol-muted');
 amb.value=Math.round(st.ambient*100);sfx.value=Math.round(st.sfx*100);mute.checked=!!st.muted;
 amb.addEventListener('input',()=>worldAudio.setVolume('ambient',amb.value/100));sfx.addEventListener('input',()=>worldAudio.setVolume('sfx',sfx.value/100));{const mu=box.querySelector('#vol-music');mu.value=Math.round((st.music??.55)*100);mu.addEventListener('input',()=>worldAudio.setVolume('music',mu.value/100));}mute.addEventListener('change',()=>worldAudio.setVolume('muted',mute.checked));
})();
(function initGraphics3D(){
 const toggle=document.getElementById('graphics-toggle-3d'),panel=document.getElementById('graphics-panel-3d'),select=document.getElementById('graphics-profile-3d');
 if(toggle&&panel){bindInstantTap(toggle,()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));});}
 let saved='auto';try{const value=localStorage.getItem('seven-sins-3d-graphics');if(['auto','low','high','max'].includes(value))saved=value;}catch(e){}
 if(select){select.value=saved;select.addEventListener('change',()=>{const mode=select.value;try{localStorage.setItem('seven-sins-3d-graphics',mode);}catch(e){};const initial=mode==='auto'?((navigator.deviceMemory&&navigator.deviceMemory<=4)? .68:.82):(graphics3DProfiles[mode]||graphics3DProfiles.high).scale;applyGraphics3D(mode,initial);});}
 const initial=saved==='auto'?((navigator.deviceMemory&&navigator.deviceMemory<=4)||((navigator.hardwareConcurrency||8)<=4)? .68:.82):graphics3DProfiles[saved].scale;
 applyGraphics3D(saved,initial);
 syncCameraToggle3D();
})();

/* MOD 186 — vida ambiente leve: farol violeta do portal (marco visível de longe), vagalumes à noite e
   folhas carregadas pelo vento. Cada efeito é um único draw call e reaproveita os mesmos buffers. */
const portalBeacon=(()=>{const c=document.createElement('canvas');c.width=4;c.height=128;const g=c.getContext('2d'),grad=g.createLinearGradient(0,128,0,0);
 grad.addColorStop(0,'rgba(214,170,255,0.95)');grad.addColorStop(.18,'rgba(160,92,255,0.55)');grad.addColorStop(.7,'rgba(120,60,255,0.14)');grad.addColorStop(1,'rgba(120,60,255,0)');g.fillStyle=grad;g.fillRect(0,0,4,128);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(.75,1.6,64,14,1,true),new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:.32,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false,toneMapped:false}));
 beam.position.set(PORTAL.x,groundHeightAt(PORTAL.x,PORTAL.z)+39,PORTAL.z-.6);beam.renderOrder=3;beam.frustumCulled=false;scene.add(beam);return beam;})();
function makeSoftDotTexture(){const c=document.createElement('canvas');c.width=32;c.height=32;const g=c.getContext('2d'),r=g.createRadialGradient(16,16,0,16,16,16);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.35,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,32,32);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const softDot=makeSoftDotTexture();
const FIREFLY_COUNT=terrainLowSpec?36:64,LEAF_COUNT=terrainLowSpec?22:40;
const fireflies=(()=>{const pos=new Float32Array(FIREFLY_COUNT*3),seed=new Float32Array(FIREFLY_COUNT*4);for(let i=0;i<FIREFLY_COUNT;i++){seed[i*4]=(Math.random()-.5)*36;seed[i*4+1]=(Math.random()-.5)*36;seed[i*4+2]=.5+Math.random()*2.2;seed[i*4+3]=Math.random()*100;}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const pts=new THREE.Points(g,new THREE.PointsMaterial({map:softDot,color:0xd8ff8a,size:.34,sizeAttenuation:true,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));pts.frustumCulled=false;pts.visible=false;scene.add(pts);return{pts,pos,seed};})();
const fallingLeaves=(()=>{const pos=new Float32Array(LEAF_COUNT*3),col=new Float32Array(LEAF_COUNT*3),vel=new Float32Array(LEAF_COUNT*2);const palette=[0x7d8f3a,0x9a6b2e,0x5f7a34,0xb08a3e].map(h=>new THREE.Color(h));
 for(let i=0;i<LEAF_COUNT;i++){pos[i*3+1]=-999;const c=palette[i%palette.length];col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
 const pts=new THREE.Points(g,new THREE.PointsMaterial({size:.13,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.9,depthWrite:false}));pts.frustumCulled=false;scene.add(pts);return{pts,pos,vel};})();
function updateAmbientLife(dt,now){
 shopBuilding.star.rotation.y+=dt*.8;shopBuilding.lamp.intensity=dayNightState.t*2.2;
 if(grassRefresh)grassRefresh(player.position.x,player.position.z);
 const night=dayNightState.t,t=now*.001,px=player.position.x,pz=player.position.z;
 const ready=questStep>=6;portalBeacon.material.opacity=(ready?.42:.17)+night*.14+Math.sin(t*1.7)*.035;
 fireflies.pts.visible=night>.35&&grassGroup.visible;
 if(fireflies.pts.visible){fireflies.pts.material.opacity=THREE.MathUtils.smoothstep(night,.35,1)*(.75+Math.sin(t*3.1)*.2);
  const p=fireflies.pos,s=fireflies.seed;for(let i=0;i<FIREFLY_COUNT;i++){let ax=s[i*4],az=s[i*4+1];const ph=s[i*4+3];
   // Mantém o enxame em volta do jogador sem teleportes visíveis: reposiciona só o que ficou longe.
   const wx=Math.floor((px-ax)/36+.5)*36+ax,wz=Math.floor((pz-az)/36+.5)*36+az;const x=wx+Math.sin(t*.37+ph)*1.6,z=wz+Math.cos(t*.29+ph*1.3)*1.6;
   p[i*3]=x;p[i*3+2]=z;p[i*3+1]=groundHeightAt(x,z)+s[i*4+2]+Math.sin(t*.9+ph)*.35;}
  fireflies.pts.geometry.attributes.position.needsUpdate=true;}
 const L=fallingLeaves.pos,V=fallingLeaves.vel;
 for(let i=0;i<LEAF_COUNT;i++){const k=i*3;if(L[k+1]<-900||L[k+1]<groundHeightAt(L[k],L[k+2])){const a=Math.random()*Math.PI*2,r=4+Math.random()*16;L[k]=px+Math.cos(a)*r;L[k+2]=pz+Math.sin(a)*r;L[k+1]=groundHeightAt(L[k],L[k+2])+5+Math.random()*5;V[i*2]=.35+Math.random()*.5;V[i*2+1]=Math.random()*10;continue;}
  L[k]+=(Math.sin(t*1.3+V[i*2+1])*.5+.55)*dt;L[k+2]+=Math.cos(t*.9+V[i*2+1])*.3*dt;L[k+1]-=V[i*2]*dt;}
 fallingLeaves.pts.geometry.attributes.position.needsUpdate=true;fallingLeaves.pts.visible=grassGroup.visible;
}
/* MOD 186 — estado do mundo para o áudio: superfície sob os pés, distância do lago/portal, altitude. */
function updateWorldAudio(dt){
 updateMapDiscovery(performance.now());
 const x=player.position.x,z=player.position.z;
 const onPath=Math.hypot(x-VILLAGE_CENTER.x,z-VILLAGE_CENTER.z)<13||trailRoutes.some(route=>closeToPolyline(x,z,route.points,route.width*.5));
 const surface=terrain3D.waterDepth(x,z)>-.05?'water':onPath?'path':'grass';
 worldAudio.update(dt,{night:dayNightState.t,grounded,speed:dashRemaining>0?6:Math.hypot(moveVX,moveVZ),surface,altitude:player.position.y,pondDistance:Math.hypot(x-FOREST_POND.x,z-FOREST_POND.z)-FOREST_POND.r,portalDistance:Math.hypot(x-PORTAL.x,z-PORTAL.z),portalReady:questStep>=6,music:combatStepNow()&&enemy.visible&&enemyAlive&&Math.hypot(enemy.position.x-x,enemy.position.z-z)<16?'combat':(dialogueOpen&&prologueActive)?'silent':'explore'});
}
/* MOD 186 — mapa com névoa de guerra e abrigos de viagem rápida. O mapa só mostra o que já foi visto;
   cada abrigo precisa ser encontrado e registrado antes de aparecer na lista de viagem. */
const MAP_STORE=MAP_STORE_KEY;
const mapState=(()=>{let saved=null;try{saved=JSON.parse(localStorage.getItem(MAP_STORE)||'null');if(!saved){const old=JSON.parse(localStorage.getItem('seven-sins-3d-map-v2')||localStorage.getItem('seven-sins-3d-map')||'null');if(old)saved={pois:old.pois,waystones:old.waystones};}}catch(_){}return createMapState(saved);})();
let mapDirty=false,mapSaveAt=0,mapScanAt=0,mapBase=null,mapOpen=false;
function saveMapState(force){if(!mapDirty&&!force)return;mapDirty=false;try{localStorage.setItem(MAP_STORE,JSON.stringify(serializeMapState(mapState)));}catch(_){}}
const waystoneVisuals=WAYSTONES.map(w=>{const g=new THREE.Group();g.position.set(w.x,groundHeightAt(w.x,w.z),w.z);scene.add(g);
 const stone=new THREE.Mesh(new THREE.CylinderGeometry(.34,.5,1.75,6),rockMat);stone.position.y=.86;stone.castShadow=true;stone.receiveShadow=true;g.add(stone);
 const cap=new THREE.Mesh(new THREE.OctahedronGeometry(.3,0),new THREE.MeshStandardMaterial({color:0x6b6450,emissive:0x8a6a20,emissiveIntensity:.25,roughness:.6}));cap.position.y=2.02;g.add(cap);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.62,.035,6,28),new THREE.MeshBasicMaterial({color:0x9a8650,transparent:true,opacity:.55}));ring.rotation.x=Math.PI/2;ring.position.y=.06;g.add(ring);
 marketObstacles.push({x:w.x,z:w.z,shape:'circle',radius:.62,height:1.8});return{data:w,group:g,cap,ring};});
function syncWaystoneVisuals(){for(const v of waystoneVisuals){const on=mapState.waystones.has(v.data.id);v.cap.material.emissive.setHex(on?0x66d6ff:0x8a6a20);v.cap.material.emissiveIntensity=on?1.6:.25;v.ring.material.color.setHex(on?0x8fe3ff:0x9a8650);v.ring.material.opacity=on?.9:.55;}}
syncWaystoneVisuals();
function nearestWaystone(){let best=null,bd=2.5;for(const v of waystoneVisuals){const d=Math.hypot(v.data.x-player.position.x,v.data.z-player.position.z);if(d<bd){bd=d;best=v.data;}}return best;}
function useWaystone(w){
 if(!mapState.waystones.has(w.id)){mapState.waystones.add(w.id);mapDirty=true;saveMapState();syncWaystoneVisuals();refreshSideQuests();worldAudio.reveal();
  const toast=document.getElementById('quest-toast');if(toast){toast.textContent='ABRIGO REGISTRADO · '+w.name.toUpperCase();toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2600);}
  status.textContent='Abrigo registrado. Abra o MAPA para voltar aqui quando estiver em segurança.';return;}
 openWorldMap();
}
function updateMapDiscovery(now){
 if(now<mapScanAt)return;mapScanAt=now+400;
 const x=player.position.x,z=player.position.z;
 if(revealAround(mapState,x,z))mapDirty=true;
 const found=discoverPois(mapState,x,z,{secretsFound:{ruina:secretRuinFound}});
 if(found.length){mapDirty=true;progressStats.places=mapState.pois.size;announceAchievements();const toast=document.getElementById('quest-toast');if(toast&&!dialogueOpen){toast.textContent='LOCAL DESCOBERTO · '+found[0].name.toUpperCase();toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2400);}}
 if(now>mapSaveAt){mapSaveAt=now+4000;saveMapState();}
 if(mapOpen)drawWorldMap();
}
function buildMapBase(){
 const N=220,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d'),img=g.createImageData(N,N);
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x=MAP_BOUNDS.x0+(i+.5)/N*MAP_BOUNDS.size,z=MAP_BOUNDS.z0+(j+.5)/N*MAP_BOUNDS.size,h=groundHeightAt(x,z),hx=groundHeightAt(x+1,z),wet=terrain3D.waterDepth(x,z);
  let r,gg,b;if(wet>0){r=40;gg=70;b=86;}else if(terrain3D.walkable(x,z)){const n=(hx-h)*40;r=74+n;gg=94+n;b=60+n*.6;}else{const t=Math.min(1,h/60),n=(hx-h)*14;r=86+t*90+n;gg=88+t*86+n;b=82+t*90+n;}
  const k=(j*N+i)*4;img.data[k]=r;img.data[k+1]=gg;img.data[k+2]=b;img.data[k+3]=255;}
 g.putImageData(img,0,0);
 const px=(x)=>(x-MAP_BOUNDS.x0)/MAP_BOUNDS.size*N,pz=(z)=>(z-MAP_BOUNDS.z0)/MAP_BOUNDS.size*N;
 g.fillStyle='rgba(28,52,30,.75)';for(const t of treeSpecs){if(!t.collide)continue;g.beginPath();g.arc(px(t.x),pz(t.z),.9+t.s*.5,0,Math.PI*2);g.fill();}
 g.strokeStyle='#b39a68';g.lineCap='round';g.lineJoin='round';for(const route of trailRoutes){g.lineWidth=route.width/MAP_BOUNDS.size*N*.8;g.beginPath();route.points.forEach((p,k)=>k?g.lineTo(px(p[0]),pz(p[1])):g.moveTo(px(p[0]),pz(p[1])));g.stroke();}
 g.fillStyle='#8c7a55';g.beginPath();g.arc(px(VILLAGE_CENTER.x),pz(VILLAGE_CENTER.z),12/MAP_BOUNDS.size*N,0,Math.PI*2);g.fill();
 return c;
}
const MAP_GLYPH={shop:'⛬',camp:'▲',village:'⌂',clearing:'◌',danger:'◆',water:'≈',secret:'✧',portal:'✦'};
function drawWorldMap(){
 const canvas=document.getElementById('world-map-canvas');if(!canvas)return;const S=canvas.width,g=canvas.getContext('2d');if(!mapBase)mapBase=buildMapBase();
 const px=(x)=>(x-MAP_BOUNDS.x0)/MAP_BOUNDS.size*S,pz=(z)=>(z-MAP_BOUNDS.z0)/MAP_BOUNDS.size*S;
 g.clearRect(0,0,S,S);g.imageSmoothingEnabled=true;g.drawImage(mapBase,0,0,S,S);
 // Névoa: células não visitadas cobertas por pergaminho escuro com borda suave.
 const fog=document.createElement('canvas');fog.width=fog.height=FOG_CELLS;const fg=fog.getContext('2d');fg.fillStyle='#120f0b';
 for(let j=0;j<FOG_CELLS;j++)for(let i=0;i<FOG_CELLS;i++)if(!mapState.cells[j*FOG_CELLS+i])fg.fillRect(i,j,1,1);
 g.save();g.globalAlpha=1;try{g.filter='blur('+Math.round(S/90)+'px)';}catch(_){}g.drawImage(fog,0,0,S,S);g.restore();
 g.font='bold '+Math.round(S/28)+'px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';
 for(const p of MAP_POIS){if(!mapState.pois.has(p.id))continue;g.fillStyle=p.kind==='portal'?'#d6a8ff':p.kind==='danger'?'#ff9b84':'#ffe6a3';g.fillText(MAP_GLYPH[p.kind]||'•',px(p.x),pz(p.z));g.font=Math.round(S/44)+'px system-ui,sans-serif';g.fillStyle='#f4ead0';g.fillText(p.name,px(p.x),pz(p.z)+S/30);g.font='bold '+Math.round(S/28)+'px system-ui,sans-serif';}
 for(const w of WAYSTONES){if(!isRevealed(mapState,w.x,w.z))continue;const on=mapState.waystones.has(w.id);g.fillStyle=on?'#8fe3ff':'#a99a72';g.fillText('◈',px(w.x),pz(w.z));}
 if(questMarker.visible!==false&&isRevealed(mapState,questMarker.position.x,questMarker.position.z)){g.strokeStyle='#ffd65a';g.lineWidth=2;g.beginPath();g.arc(px(questMarker.position.x),pz(questMarker.position.z),S/55,0,Math.PI*2);g.stroke();}
 const ax=px(player.position.x),az=pz(player.position.z),dx=Math.sin(playerYaw),dz=Math.cos(playerYaw),L=S/36;
 g.fillStyle='#ffffff';g.strokeStyle='#1a1408';g.lineWidth=2;g.beginPath();g.moveTo(ax+dx*L,az+dz*L);g.lineTo(ax-dz*L*.55-dx*L*.5,az+dx*L*.55-dz*L*.5);g.lineTo(ax+dz*L*.55-dx*L*.5,az-dx*L*.55-dz*L*.5);g.closePath();g.stroke();g.fill();
}
function travelState(){return canFastTravel({inCombat:combatStepNow()&&enemy.visible&&enemyAlive,inDialogue:dialogueOpen||namePromptOpen,inCinematic:awakeningActive||!!portalPull||(typeof voidMode!=='undefined'&&!!voidMode),escorting:questStep===3&&childrenFreed,falling:!grounded,dead:playerHP<=0});}
function renderTravelList(){
 const list=document.getElementById('world-map-travel');if(!list)return;list.innerHTML='';
 const registered=WAYSTONES.filter(w=>mapState.waystones.has(w.id));const check=travelState();
 if(!registered.length){list.innerHTML='<p class="map-note">Nenhum abrigo registrado. Procure pedras com runa (◈) e toque em REGISTRAR.</p>';return;}
 if(!check.ok){const p=document.createElement('p');p.className='map-note';p.textContent=check.reason;list.appendChild(p);}
 for(const w of registered){const b=document.createElement('button');b.type='button';b.textContent='VIAJAR · '+w.name.toUpperCase();b.disabled=!check.ok;b.addEventListener('click',()=>fastTravelTo(w));list.appendChild(b);}
}
function fastTravelTo(w){
 const check=travelState();if(!check.ok){status.textContent=check.reason;renderTravelList();return;}
 closeWorldMap();const veil=document.getElementById('travel-veil');if(veil){veil.classList.add('on');setTimeout(()=>veil.classList.remove('on'),520);}
 setTimeout(()=>{const x=w.x+1.4,z=w.z+1.4;player.position.set(x,terrainHeightAt(x,z),z);moveVX=moveVZ=0;dashRemaining=0;camera.position.set(x+Math.sin(cameraYaw)*cameraDistance,player.position.y+3,z+Math.cos(cameraYaw)*cameraDistance);status.textContent='Você chegou ao '+w.name+'.';},260);
}
function openWorldMap(){if(awakeningActive||namePromptOpen)return;const panel=document.getElementById('world-map');if(!panel)return;mapOpen=true;panel.hidden=false;const c=document.getElementById('world-map-canvas');const size=Math.max(220,Math.min(520,Math.floor(Math.min(innerWidth*.9,innerHeight*.66))));if(c.width!==size){c.width=c.height=size;}drawWorldMap();renderTravelList();}
function closeWorldMap(){const panel=document.getElementById('world-map');if(panel)panel.hidden=true;mapOpen=false;}
(function initWorldMapUi(){
 const btn=document.getElementById('map-toggle-3d'),close=document.getElementById('world-map-close');
 if(btn)bindInstantTap(btn,()=>mapOpen?closeWorldMap():openWorldMap());if(close)close.addEventListener('click',closeWorldMap);
 addEventListener('keydown',e=>{const typing=document.activeElement&&['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);if(typing||e.repeat)return;if(e.code==='KeyM'){mapOpen?closeWorldMap():openWorldMap();}else if(e.code==='Escape'&&mapOpen)closeWorldMap();});
 addEventListener('pagehide',()=>saveMapState(true));
})();
/* MOD 187 — o portal leva à dimensão original de Valério SEM trocar de link: dentro de index.html?mundo3d=1
   a própria página abre a dimensão por cima do mundo (pausado e intacto); aberto direto, o mundo cria uma
   sobreposição com a dimensão. Na vitória, o jogador volta para a frente do portal, já fechado. */
/* MOD 202 — dimensões dos Bispos 100% dentro do mundo 3D. O portal não troca de página nem abre iframe:
   mostra a apresentação "jogador VS Bispo", leva o jogador a uma arena abaixo do mundo e a luta usa o MESMO
   motor (HUDs, câmera, habilidades, vida, corações). Na vitória (ou sem corações) o jogador volta ao portal. */
const dimArenas={},dimPortals={};
const dimLight=new THREE.PointLight(0xffffff,0,90,1.1);dimLight.castShadow=false;scene.add(dimLight);
function showPortalVeil(on){const veil=document.getElementById('portal-veil');if(veil)veil.classList.toggle('on',!!on);}
function getDimArena(key){if(!dimArenas[key]){const d=DIMENSIONS[key],a=buildDimensionArena(THREE,d.theme,arenaSpec(key));scene.add(a.group);dimArenas[key]=a;}return dimArenas[key];}
function enterDimensionArena(key){
 const sp=arenaSpec(key),spots=arenaSpots(key),arena=getDimArena(key);
 voidSpec={x:sp.x,z:sp.z,y:sp.y,radius:sp.radius};dimKey=key;voidMode=true;arena.group.visible=true;
 skyDome.visible=false;portalBeacon.visible=false;sunDisk.visible=false;sunHalo.visible=false;if(moonRoot)moonRoot.visible=false;if(starField)starField.visible=false;
 player.position.set(spots.player.x,sp.y,spots.player.z);playerYaw=Math.PI;player.rotation.y=Math.PI;cameraYaw=0;cameraPitch=.12;moveVX=moveVZ=0;dashRemaining=0;verticalVelocity=0;
 camera.position.set(spots.player.x,sp.y+3.5,spots.player.z+8.5);
}
function warmTextures(root){const seen=new Set();root.traverse(o=>{const ms=o.material?[].concat(o.material):[];for(const m of ms)for(const k of ['map','emissiveMap','normalMap','roughnessMap']){const t=m&&m[k];if(t&&!seen.has(t)){seen.add(t);try{renderer.initTexture(t);}catch(e){}}}});}
function startDimensionBattle(key,opts){
 if(dimBattle||vsOpen)return;const d=DIMENSIONS[key];
 dimBattle={key,profile:d.profile,hp:opts.hp||d.hp,returnTo:opts.returnTo,onVictory:opts.onVictory,onAbort:opts.onAbort,active:false};
 handoffSent=true;setDefending(false);showPortalVeil(true);worldAudio.portalEnter();
 status.textContent='O portal puxa você para a dimensão de '+d.name+'…';
 setTimeout(()=>openVsCard(key),700);
}
let vsFailed=false,vsGoCallback=null,vsKey=null;
function openVsCard(key,onGo){
 vsGoCallback=onGo||null;vsKey=key;
 const card=vsCard(key,playerName),panel=document.getElementById('vs-panel'),go=document.getElementById('vs-go');
 if(!card||!panel||!go){if(vsGoCallback){const cb=vsGoCallback;vsGoCallback=null;cb();}else beginDimensionFight();return;}
 const heroImg=document.getElementById('vs-hero-img'),src=(document.getElementById('hero-portrait-img')||{}).src;
 if(src)heroImg.src=src;else heroImg.removeAttribute('src');
 document.getElementById('vs-boss-img').src=card.bishopImage;
 document.getElementById('vs-hero-name').textContent=card.playerName;
 document.getElementById('vs-boss-name').textContent=card.bishopName;document.getElementById('vs-boss-title').textContent=card.bishopTitle.toUpperCase();
 document.getElementById('vs-kicker').textContent=card.kicker;document.getElementById('vs-line').textContent=card.line;
 panel.style.setProperty('--vs-accent',card.accent);
 panel.hidden=true;void panel.offsetWidth;panel.hidden=false;vsOpen=true;showPortalVeil(false);vsFailed=false;
 go.disabled=true;go.textContent='INVOCANDO A DIMENSÃO…';
 // Arena e modelo são preparados DURANTE o cartão (o mundo está parado atrás dele), nunca durante a luta.
 setTimeout(()=>{
  try{getDimArena(key);}catch(e){console.error(e);}
  loadRig(DIMENSIONS[key].rig).then(()=>{
   try{const a=getDimArena(key);a.group.visible=true;renderer.compile(scene,camera);a.group.visible=false;warmTextures(a.group);const rg=rigs[DIMENSIONS[key].rig];if(rg)warmTextures(rg.model);}catch(e){console.warn('Pré-compilação da dimensão falhou.',e);}
   go.disabled=false;go.textContent='ENTRAR NA LUTA';
  },()=>{vsFailed=true;go.disabled=false;go.textContent='TENTAR DE NOVO';});
 },160);
}
(function initVsPanel(){
 const go=document.getElementById('vs-go');if(!go)return;
 bindInstantTap(go,()=>{if(go.disabled||(!dimBattle&&!vsGoCallback))return;if(vsFailed){openVsCard(vsKey,vsGoCallback);return;}
  if(vsGoCallback){const cb=vsGoCallback;vsGoCallback=null;const panel=document.getElementById('vs-panel');if(panel)panel.hidden=true;vsOpen=false;cb();return;}
  beginDimensionFight();});
})();
function beginDimensionFight(){
 const b=dimBattle;if(!b)return;const d=DIMENSIONS[b.key],panel=document.getElementById('vs-panel');
 if(panel)panel.hidden=true;vsOpen=false;portalPull=null;
 enterDimensionArena(b.key);
 enemy.visible=false;useRig(d.rig);bossRageAnnounced=false;bossComboHits=0;bossHitCounter=0;
 const sp=arenaSpots(b.key);revealEncounter(d.profile,sp.boss,b.hp,d.line);
 checkpointX=sp.player.x;checkpointZ=sp.player.z;
 const hud=document.getElementById('enemy-hud');if(hud){hud.style.display='';hud.classList.add('boss');}
 b.active=true;syncEnemyLabel();showCombatCallout(d.name);cameraShake(.15);
 if(b.key==='bishop1')setTimeout(valerioIntro,600);
 if(b.key==='bishop2'&&questStep===ACT2.boss)setTimeout(()=>{if(dimBattle&&dimBattle.key==='bishop2')playStory('vorgazhek',vorgazhekIntroScene(),{focus:'enemy',face:'enemy'});},600);
 if(b.key==='bishop3')setTimeout(zarkhaelIntro,600);
 if(b.key==='bishop4')setTimeout(veraxionIntro,600);
 if(questStep===ACT6N.rematch)setTimeout(rematchIntro,600);
 if(b.key==='greed')setTimeout(greedIntro,600);
}
function resetEnemyAfterDimension(){
 enemy.visible=false;enemy.rotation.set(0,0,0);enemy.scale.setScalar(1);enemyAttackCooldown=0;enemyAttackResolved=true;enemyDashRemaining=0;wardenFanPending=false;
 clearHazards();useRig('enemy1');encounterProfile='captor';enemyHP=100;enemyMaxHP=100;enemyAlive=true;
 const hud=document.getElementById('enemy-hud');if(hud)hud.classList.remove('boss');
}
function leaveDimension(rt,flash,then){
 const veil=document.getElementById('travel-veil');if(veil){veil.style.background=flash?'#fff':'';veil.classList.add('on');}
 setTimeout(()=>{
  leaveVoid();const x=rt.x,z=rt.z;
  player.position.set(x,terrainHeightAt(x,z),z);playerYaw=0;player.rotation.y=0;cameraYaw=0;moveVX=moveVZ=0;dashRemaining=0;verticalVelocity=0;
  playerHP=playerMaxHP;playerMana=MANA.max;pendingEnemyHitAt=0;playerRespawnAt=0;checkpointX=x;checkpointZ=z;
  camera.position.set(x,player.position.y+3.5,z+8.5);updatePlayerHud();
  if(veil)setTimeout(()=>{veil.classList.remove('on');veil.style.background='';},120);
  if(then)then();
 },flash?900:600);
}
function dimensionVictory(){
 const b=dimBattle;if(!b)return;b.active=false;registerEnemyDefeat(b.profile);resetEnemyAfterDimension();showCombatCallout('DIMENSÃO LIBERTA');
 leaveDimension(b.returnTo,true,()=>{dimBattle=null;handoffSent=false;portalPull=null;worldAudio.pause(false);if(b.onVictory)b.onVictory();});
}
function abortDimensionBattle(){
 const b=dimBattle;if(!b)return;b.active=false;resetEnemyAfterDimension();
 leaveDimension(b.returnTo,false,()=>{dimBattle=null;handoffSent=false;portalPull=null;if(b.onAbort)b.onAbort();});
}
/** Queda dentro da dimensão: custa um coração; sem corações o portal expulsa o jogador. */
function dimensionPlayerDown(){
 const b=dimBattle;if(!b||!b.active)return;
 if(b.key==='bishop1'){spendHeart('valerio');enemyHP=enemyMaxHP;bossRageAnnounced=false;if(heartState.hearts<=0)enemy.visible=false;}
 else if(b.key==='bishop2')bossDefeatedPlayer();
 else if(b.key==='bishop3'&&questStep===ACT3N.boss){spendHeart('zarkhael');enemyHP=enemyMaxHP;bossRageAnnounced=false;if(heartState.hearts<=0)enemy.visible=false;}
 else if(b.key==='bishop4'&&questStep===ACT4N.boss){spendHeart('veraxion');enemyHP=enemyMaxHP;bossRageAnnounced=false;if(heartState.hearts<=0)enemy.visible=false;}
 else lateBossPlayerDown();
 if(!enemy.visible)abortDimensionBattle();
}
// ---- Valério (Ato I) ----
function requestValerioHandoff(){
 if(handoffSent||dimBattle)return;
 // MOD 204 — o portal fica no fundo do esgoto. Vitória: volta ao início do mapa (roteiro). Sem corações: fora do esgoto.
 inSewer=false;voidSpec.walk=null;for(const c of hordeClones.splice(0))disposeClone(c);guideFighting=false;
 startDimensionBattle('bishop1',{hp:DIMENSIONS.bishop1.hp,returnTo:{x:AWAKE_SPOT.x,z:AWAKE_SPOT.z},onVictory:valerioVictory,onAbort:()=>{
  const d=sewerDoorFront();player.position.set(d.x,terrainHeightAt(d.x,d.z),d.z);checkpointX=d.x;checkpointZ=d.z;
  status.textContent='O portal te expulsou: seus corações se apagaram. Recupere ao menos um para voltar.';
  setTimeout(()=>showDialogue([{who:'Anjo-Guia',text:'Valério ainda está de pé, e você também. Espere um coração voltar a bater e desça de novo.'}]),700);}});
}
function valerioVictory(){
 const result=afterValerioVictory({valerioRewardClaimed,bishopsDefeated});
 if(result.coinsGained){bumpStat('bishops');gainXp(XP_REWARDS.valerio);bestiaryKnown.add('valerio');}
 questStep=result.questStep;act1Sub=0;bishopsDefeated=result.bishopsDefeated;valerioRewardClaimed=true;coins+=result.coinsGained;
 closePortalVisuals();save3DProgress();updateQuestHud();syncAct1World();
 act1Toast('VALÉRIO FOI PURIFICADO'+(result.coinsGained?' · +'+result.coinsGained+' MOEDAS':''));
 setGameHour(9);setTimeout(afterValerioStory,900);
}
// ---- Portais dos Bispos 2–4 (aparecem quando o confronto do ato está liberado) ----
const DIM_PORTAL_DEFS={
 bishop2:{at:()=>DISTRICT_SPOTS.plaza,from:()=>DISTRICT_SPOTS.gate,active:()=>false}, // MOD 205: o portal de VORGAZHEK fica no fundo do vulcão
 bishop3:{at:()=>stepDef(19).def.at,from:()=>({x:132,z:-22}),active:()=>false}, // MOD 206 — o portal de ZAR'KHAEL fica na dimensão distorcida
 bishop4:{at:()=>stepDef(25).def.at,from:()=>({x:-50,z:-224}),active:()=>false}, // MOD 207 — o portal de VÉRAXION fica no 7º piso da torre
 greed:{at:()=>({x:FINAL_PORTAL.x,z:FINAL_PORTAL.z-10}),from:()=>({x:FINAL_PORTAL.x,z:FINAL_PORTAL.z+30}),active:()=>false} // MOD 209 — o caminho para a Ganância é a estátua do deserto
};
function dimPortalReturn(key){const def=DIM_PORTAL_DEFS[key],at=def.at(),from=def.from(),dx=from.x-at.x,dz=from.z-at.z,l=Math.hypot(dx,dz)||1;return{x:at.x+dx/l*12,z:at.z+dz/l*12};}
function dimPortalNear(key,r){const def=DIM_PORTAL_DEFS[key];if(!def||!def.active())return false;const at=def.at();return Math.hypot(at.x-player.position.x,at.z-player.position.z)<r;}
function updateDimensionPortals(now){
 for(const key in DIM_PORTAL_DEFS){
  const def=DIM_PORTAL_DEFS[key];let p=dimPortals[key];const on=def.active()&&!voidMode;
  if(!p){if(!on)continue;const at=def.at();if(Math.hypot(at.x-player.position.x,at.z-player.position.z)>150)continue;
   p=dimPortals[key]=buildDimensionPortal(THREE,key);const from=def.from();p.group.position.set(at.x,terrainHeightAt(at.x,at.z),at.z);p.group.rotation.y=Math.atan2(from.x-at.x,from.z-at.z);scene.add(p.group);}
  p.setActive(on);if(on)p.update(now,camera,innerHeight*renderer.getPixelRatio());
 }
}
function startLateBossDimension(d){
 const key=d.profile==='zarkhael'?'bishop3':'bishop4';
 lateBossActive=true;
 startDimensionBattle(key,{hp:d.hp,returnTo:dimPortalReturn(key),onVictory:()=>{lateHandleDefeat();},onAbort:()=>{status.textContent='Sem corações. O Bispo recuou — recupere um coração e volte ao portal.';}});
}
function closePortalVisuals(){if(questStep<8)return;for(const m of [portalRing,portalInnerRing,portalCore,vortex,portalFloorGlow,portalSigil])m.visible=false;portalLight.intensity=0;portalBeacon.visible=false;}
closePortalVisuals();
applyLevelStats(true);announceShopNews();
/* MOD 187 — primeira pessoa de verdade: espada na mão da câmera (com balanço ao andar e golpe visível),
   mira central, campo de visão mais aberto, herói sempre virado para onde a câmera olha. */
scene.add(camera);
const fpRig=new THREE.Group();fpRig.name='fp-viewmodel';fpRig.visible=false;camera.add(fpRig);
const fpHolder=new THREE.Group();fpRig.add(fpHolder);
let fpSword=null,fpSwingT=1,fpBob=0,fpWasActive=false;
const FP_REST={x:.3,y:-.34,z:-.62,rx:-.25,ry:.1,rz:-.38};
function ensureFpSword(){
 if(fpSword||!swordRoot)return;
 if(equippedSword!=='prota'&&!swordFpTemplates[equippedSword])equipSword(equippedSword);
 if(equippedSword!=='prota'&&swordFpTemplates[equippedSword]){fpSword=new THREE.Group();fpSword.add(swordFpTemplates[equippedSword].clone(true));}else fpSword=swordRoot.clone(true);fpSword.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.frustumCulled=false;o.renderOrder=6;}});
 fpSword.position.set(0,0,0);fpSword.rotation.set(0,0,0);fpSword.scale.setScalar(.36);fpHolder.add(fpSword);
}
function startFpSwing(){fpSwingT=0;}
function updateFirstPerson(dt,now){
 if(swordRoot&&equippedSword!=='prota'&&!swordHands[equippedSword])equipSword(equippedSword);
 const fp=cameraDistance<1.05&&!awakeningActive;
 if(fp!==fpWasActive){fpWasActive=fp;camera.fov=fp?72:56;camera.updateProjectionMatrix();const cross=document.getElementById('crosshair');if(cross)cross.hidden=!fp;}
 fpRig.visible=fp&&!!fpSword;if(swordMount)swordMount.visible=!fp;
 if(!fp)return;
 ensureFpSword();
 // O herói encara a direção da câmera: golpes, magias e mira saem para onde se olha.
 if(!dialogueOpen&&!portalPull){playerYaw=cameraYaw+Math.PI;player.rotation.y=playerYaw;}
 const speed=Math.hypot(moveVX,moveVZ);fpBob+=dt*(grounded&&speed>.3?8.5*Math.min(1.4,speed/3.4):1.2);
 const bobAmt=grounded&&speed>.3?1:.18;
 camera.position.y+=Math.sin(fpBob*2)*.028*bobAmt;
 fpSwingT=Math.min(1,fpSwingT+dt/.3);const k=fpSwingT<1?Math.sin(fpSwingT*Math.PI):0,arc=fpSwingT<1?fpSwingT:1;
 if(defending){fpHolder.position.set(.04,-.22,-.52);fpHolder.rotation.set(-.1,.15,1.42);}else if(fpSwingT<1)fpSwingPose(k,arc);else{fpHolder.position.set(FP_REST.x+Math.cos(fpBob)*.012*bobAmt,FP_REST.y+Math.abs(Math.sin(fpBob))*.016*bobAmt,FP_REST.z);fpHolder.rotation.set(FP_REST.rx,FP_REST.ry,FP_REST.rz);}
}
/* MOD 187 — assistência de mira: perto do inimigo o golpe vira para ele e dá um passo curto de investida,
   evitando "golpes no ar" no celular. Longe dele, o golpe sai normalmente na direção do herói. */
function assistAimAtEnemy(){
 const dx=enemy.position.x-player.position.x,dz=enemy.position.z-player.position.z,d=Math.hypot(dx,dz);
 if(d>3.6||d<.01)return;
 const yaw=Math.atan2(dx,dz),diff=Math.atan2(Math.sin(yaw-playerYaw),Math.cos(yaw-playerYaw));
 if(Math.abs(diff)>1.4&&lockOnActive===false&&cameraDistance<1.05)return;
 playerYaw=yaw;player.rotation.y=yaw;
 const step=Math.min(Math.max(0,d-1.45),1.4);if(step>0){const nx=player.position.x+dx/d*step,nz=player.position.z+dz/d*step;if(!blockedAt(nx,nz)){player.position.x=nx;player.position.z=nz;}}
}
// Rastro dourado do golpe (uma malha reaproveitada).
const slashTrail=new THREE.Mesh(new THREE.RingGeometry(.9,1.25,26,1,-Math.PI*.15,Math.PI*1.05),new THREE.MeshBasicMaterial({color:0xffe2a0,transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
slashTrail.visible=false;scene.add(slashTrail);let slashTrailT=1,slashTrailDur=.3;
function spawnSlashTrail(duration){slashTrailT=0;slashTrailDur=Math.min(.42,Math.max(.22,(duration||.5)*.45));slashTrail.visible=true;}
function updateSlashTrail(dt){
 if(!slashTrail.visible)return;if(cameraDistance<1.05){slashTrail.visible=false;return;}slashTrailT+=dt/slashTrailDur;if(slashTrailT>=1){slashTrail.visible=false;return;}
 const fx=Math.sin(playerYaw),fz=Math.cos(playerYaw);slashTrail.position.set(player.position.x+fx*.7,player.position.y+1.05,player.position.z+fz*.7);
 slashTrail.rotation.set(-Math.PI/2+.35,0,-playerYaw+Math.PI/2-slashTrailT*1.4);slashTrail.material.opacity=Math.sin(slashTrailT*Math.PI)*.75;slashTrail.scale.setScalar(.9+slashTrailT*.3);
}
let lockOnActive=false;
/* MOD 187 — DEFESA (segurar) com Defesa Perfeita no instante do golpe, e MIRAR (trava no inimigo). */
let defending=false,defendStartedAt=0;
const PERFECT_WINDOW=230;
const holyShield=new THREE.Mesh(new THREE.CircleGeometry(.78,6),new THREE.MeshBasicMaterial({color:0xffe6a0,transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
const holyShieldRim=new THREE.Mesh(new THREE.RingGeometry(.74,.84,6),new THREE.MeshBasicMaterial({color:0xfff4cf,transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
holyShield.add(holyShieldRim);holyShield.visible=false;scene.add(holyShield);let shieldFlash=0;
function setDefending(on){
 on=!!on&&playerHP>0&&!dialogueOpen&&!portalPull;if(on===defending)return;defending=on;
 if(on){defendStartedAt=performance.now();worldAudio.shieldUp();}
 const b=document.getElementById('defend');if(b)b.classList.toggle('held',on);
}
/** Chamado quando um golpe inimigo conecta. Retorna o dano final (0 = defesa perfeita). */
function applyDefenseToHit(damage){
 if(!defending)return damage;
 const dx=enemy.position.x-player.position.x,dz=enemy.position.z-player.position.z,d=Math.hypot(dx,dz)||1;
 const facing=(dx*Math.sin(playerYaw)+dz*Math.cos(playerYaw))/d;if(facing<-.2)return damage; // pelas costas não defende
 const perfect=performance.now()-defendStartedAt<=PERFECT_WINDOW;
 if(perfect){
  shieldFlash=1;worldAudio.parry();enemyKnockback=.9;enemyKnockbackX=dx/d;enemyKnockbackZ=dz/d;enemyAttackCooldown=Math.max(enemyAttackCooldown,1.4);
  playerMana=Math.min(MANA.max,playerMana+8);showCombatCallout('DEFESA PERFEITA');bumpStat('perfectBlocks');status.textContent='Defesa Perfeita! O inimigo ficou aberto.';return 0;
 }
 shieldFlash=.5;worldAudio.block();return Math.max(1,Math.round(damage*.25));
}
function updateDefense(dt){
 shieldFlash=Math.max(0,shieldFlash-dt*2.6);
 const show=defending||shieldFlash>0;holyShield.visible=show;if(!show)return;
 const fx=Math.sin(playerYaw),fz=Math.cos(playerYaw),fpView=cameraDistance<1.05,fwd=fpView?1.5:.62;holyShield.position.set(player.position.x+fx*fwd,player.position.y+(fpView?1.35:1.12),player.position.z+fz*fwd);
 holyShield.rotation.set(0,playerYaw,performance.now()*.0012);
 holyShield.material.opacity=(defending?.22:0)+shieldFlash*.55;holyShieldRim.material.opacity=(defending?.65:0)+shieldFlash*.4;
 const s=(1+shieldFlash*.35)*(fpView?.55:1);holyShield.scale.set(s,s,s);
}
function showCombatCallout(text){const el=document.getElementById('combat-callout');if(!el)return;el.textContent=text;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');}
// MIRAR: trava a câmera no inimigo ativo; desliga sozinho quando ele cai ou fica longe.
const lockRing=new THREE.Mesh(new THREE.RingGeometry(.62,.72,4),new THREE.MeshBasicMaterial({color:0xffcf6a,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
lockRing.rotation.x=-Math.PI/2;lockRing.visible=false;scene.add(lockRing);
function lockTargetValid(){return enemy.visible&&enemyAlive&&combatStepNow()&&Math.hypot(enemy.position.x-player.position.x,enemy.position.z-player.position.z)<24;}
function toggleLockOn(){
 if(lockOnActive){lockOnActive=false;}else if(lockTargetValid()){lockOnActive=true;worldAudio.lockOn();}else{status.textContent='Nenhum inimigo por perto para travar a mira.';}
 const b=document.getElementById('aim');if(b)b.classList.toggle('on',lockOnActive);
}
function updateLockOn(dt){
 if(lockOnActive&&!lockTargetValid()){lockOnActive=false;const b=document.getElementById('aim');if(b)b.classList.remove('on');}
 lockRing.visible=lockOnActive;if(!lockOnActive)return;
 const dx=enemy.position.x-player.position.x,dz=enemy.position.z-player.position.z;
 const want=cameraDistance<1.05?Math.atan2(-dx,-dz):Math.atan2(-dx,-dz);
 const diff=Math.atan2(Math.sin(want-cameraYaw),Math.cos(want-cameraYaw));cameraYaw+=diff*Math.min(1,dt*6);
 if(cameraDistance<1.05)cameraPitch+=(.05-cameraPitch)*Math.min(1,dt*4);
 lockRing.position.set(enemy.position.x,enemy.position.y+.05,enemy.position.z);lockRing.rotation.z+=dt*1.8;
}
(function initDefendAim(){
 const def=document.getElementById('defend');
 if(def){def.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();try{def.setPointerCapture(e.pointerId);}catch(_){}setDefending(true);});for(const t of ['pointerup','pointercancel','lostpointercapture'])def.addEventListener(t,()=>setDefending(false));}
 bindInstantTap(document.getElementById('aim'),toggleLockOn);
 addEventListener('keydown',e=>{const typing=document.activeElement&&['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);if(typing)return;if(e.code==='KeyK'&&!e.repeat)setDefending(true);if((e.code==='KeyQ'||e.code==='Tab')&&!e.repeat){e.preventDefault();toggleLockOn();}});
 addEventListener('keyup',e=>{if(e.code==='KeyK')setDefending(false);});
 lookArea.addEventListener('contextmenu',e=>e.preventDefault());
 lookArea.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===2)setDefending(true);});
 addEventListener('pointerup',e=>{if(e.pointerType==='mouse'&&e.button===2)setDefending(false);});
 addEventListener('blur',()=>setDefending(false));
})();
/* MOD 187 — pausa, contador de FPS e retrato do herói no HUD dourado. */
let gamePaused=false;
function setPaused(on){
 on=!!on;if(on===gamePaused)return;gamePaused=on;
 const panel=document.getElementById('pause-panel');if(panel)panel.hidden=!on;
 if(!on){const g=document.getElementById('graphics-panel-3d');if(g)g.hidden=true;}
 worldAudio.pause(on);if(on){setDefending(false);joyActive=false;joyX=joyY=0;for(const k in keys)keys[k]=false;}
}
let fpsFrames=0,fpsSince=performance.now(),fpsVisible=true;
try{fpsVisible=localStorage.getItem('seven-sins-3d-fps')!=='0';}catch(_){}
function updateFpsBadge(now){fpsFrames++;if(now-fpsSince<1000)return;const fps=Math.round(fpsFrames*1000/(now-fpsSince));fpsFrames=0;fpsSince=now;const b=document.getElementById('fps-badge');if(b){b.hidden=!fpsVisible;b.textContent=fps+' FPS';}}
(function initPauseAndSettings(){
 bindInstantTap(document.getElementById('pause-button'),()=>setPaused(!gamePaused));
 bindInstantTap(document.getElementById('pause-resume'),()=>setPaused(false));
 bindInstantTap(document.getElementById('pause-map'),()=>{setPaused(false);openWorldMap();});
 bindInstantTap(document.getElementById('pause-galaxies'),()=>{setPaused(false);openGalaxyScreen();});
 addEventListener('keydown',e=>{if(e.code!=='Escape'&&e.code!=='KeyP')return;const typing=document.activeElement&&['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);if(typing||(mapOpen&&e.code==='Escape'))return;setPaused(!gamePaused);},{capture:true});
 addEventListener('visibilitychange',()=>{if(document.hidden)setPaused(true);});
 const panel=document.getElementById('graphics-panel-3d');
 if(panel){
  const row=document.createElement('label');row.className='toggle-row';row.innerHTML='<input id="fps-toggle" type="checkbox"> Mostrar FPS';panel.appendChild(row);
  const box=row.querySelector('input');box.checked=fpsVisible;box.addEventListener('change',()=>{fpsVisible=box.checked;try{localStorage.setItem('seven-sins-3d-fps',fpsVisible?'1':'0');}catch(_){}const b=document.getElementById('fps-badge');if(b)b.hidden=!fpsVisible;});
  const close=document.createElement('button');close.type='button';close.className='panel-close';close.textContent='FECHAR';panel.appendChild(close);bindInstantTap(close,()=>{panel.hidden=true;});
 }
})();
// Retrato: renderiza uma vez o próprio Protagonista.glb (rosto/capuz) num alvo pequeno, sem afetar a cena.
let heroPortraitDone=false;
function renderHeroPortrait(){
 if(heroPortraitDone||!model)return;heroPortraitDone=true;
 try{
  const S=160,rt=new THREE.WebGLRenderTarget(S,S,{colorSpace:THREE.SRGBColorSpace}),ps=new THREE.Scene();ps.background=new THREE.Color(0x15122a);
  const clone=cloneSkinned(model);clone.position.set(0,0,0);clone.rotation.set(0,0,0);clone.visible=true;ps.add(clone);
  ps.add(new THREE.HemisphereLight(0xfff2dc,0x2a2240,2.2));const key=new THREE.DirectionalLight(0xffe2b0,2.4);key.position.set(1.5,3,4);ps.add(key);
  clone.updateMatrixWorld(true);const box=measureModelBounds(clone),size=box.getSize(new THREE.Vector3()),top=box.max.y;
  const cam=new THREE.PerspectiveCamera(28,1,.01,50),headY=top-size.y*.12;cam.position.set(0,headY,size.y*.62);cam.lookAt(0,headY-size.y*.02,0);
  const prevTarget=renderer.getRenderTarget();renderer.setRenderTarget(rt);renderer.render(ps,cam);
  const px=new Uint8Array(S*S*4);renderer.readRenderTargetPixels(rt,0,0,S,S,px);renderer.setRenderTarget(prevTarget);rt.dispose();
  const c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d'),img=g.createImageData(S,S);
  for(let y=0;y<S;y++)img.data.set(px.subarray((S-1-y)*S*4,(S-y)*S*4),y*S*4);g.putImageData(img,0,0);
  const el=document.getElementById('hero-portrait-img');if(el)el.src=c.toDataURL('image/png');
 }catch(err){console.warn('Retrato do herói indisponível.',err);}
}
/* MOD 188 — Loja Central: prédio de pedra clara com pórtico, telhado de ardósia e uma estrela dourada
   no alto (visível da trilha); por dentro, uma única tela com cinco setores. */
const shopBuilding=(()=>{
 const g=new THREE.Group(),y0=groundHeightAt(SHOP_SPOT.x,SHOP_SPOT.z);g.position.set(SHOP_SPOT.x,y0,SHOP_SPOT.z);g.rotation.y=Math.PI/2;scene.add(g);
 const stone=mat(0xcbbd9c),stoneDark=mat(0x8d8371),slate=mat(0x2c3550),goldTrim=new THREE.MeshStandardMaterial({color:0xd9a948,metalness:.6,roughness:.35,emissive:0x3a2606,emissiveIntensity:.4}),marble=mat(0xe8e2d2),cloth=mat(0x6a1f2a),door=mat(0x1a1410);
 const add=(geo,m,x,y,z,ry=0,cast=true)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.rotation.y=ry;o.castShadow=cast;o.receiveShadow=true;g.add(o);return o;};
 add(new THREE.BoxGeometry(10.5,.36,8.6),stoneDark,0,.1,0,0,false);
 add(new THREE.BoxGeometry(8,4.6,5.6),stone,0,2.6,-.9);
 add(new THREE.BoxGeometry(8.3,.32,5.9),goldTrim,0,4.95,-.9);
 const roof=add(new THREE.ConeGeometry(5.9,2.6,4,1),slate,0,6.4,-.9,Math.PI/4);roof.scale.set(1,1,.72);
 const tower=add(new THREE.CylinderGeometry(.9,1.1,3.4,8),stone,0,7.6,-.9);
 add(new THREE.ConeGeometry(1.25,2.3,8),slate,0,10.4,-.9);
 const star=new THREE.Mesh(new THREE.OctahedronGeometry(.55,0),new THREE.MeshStandardMaterial({color:0xffe7a0,emissive:0xffbf3f,emissiveIntensity:2.4,metalness:.4,roughness:.2,toneMapped:false}));star.position.set(0,12.15,-.9);g.add(star);
 // Pórtico: quatro colunas, frontão e estandartes.
 for(const x of [-3.2,-1.1,1.1,3.2]){add(new THREE.CylinderGeometry(.26,.3,4.1,10),marble,x,2.33,2.5);add(new THREE.BoxGeometry(.7,.24,.7),goldTrim,x,.4,2.5);}
 add(new THREE.BoxGeometry(8,.45,1.9),stone,0,4.6,2.2);
 const pediment=add(new THREE.CylinderGeometry(4.1,4.1,1.9,3,1),stone,0,5.25,2.2);pediment.rotation.set(Math.PI/2,0,Math.PI/2);pediment.scale.set(.42,1,1);
 for(const x of [-2.15,2.15]){const banner=add(new THREE.PlaneGeometry(.9,2.4),cloth,x,3.1,1.94,0,false);banner.material.side=THREE.DoubleSide;add(new THREE.BoxGeometry(1.1,.08,.08),goldTrim,x,4.32,1.95,0,false);}
 add(new THREE.BoxGeometry(1.7,2.7,.12),door,0,1.55,1.95,0,false);
 const arch=add(new THREE.TorusGeometry(.85,.1,6,16,Math.PI),goldTrim,0,2.9,1.98,0,false);
 const sign=makeMarketSign('LOJA CENTRAL','#ffe3a0');sign.scale.multiplyScalar(1.5);sign.position.set(0,4.18,3.18);g.add(sign);
 const lamp=new THREE.PointLight(0xffc06a,0,13,1.4);lamp.position.set(0,3,3.6);g.add(lamp);
 // Colisão: salão e pórtico; a porta fica livre para interagir.
 marketObstacles.push({x:SHOP_SPOT.x-.9,z:SHOP_SPOT.z,shape:'box',halfX:2.95,halfZ:4.15,height:4.6});
 for(const zc of [-3.2,-1.1,1.1,3.2])marketObstacles.push({x:SHOP_SPOT.x+2.5,z:SHOP_SPOT.z-zc,shape:'circle',radius:.36,height:4});
 return {group:g,star,lamp,door:{x:SHOP_SPOT.x+4.6,z:SHOP_SPOT.z}};
})();
function nearShopDoor(){return Math.hypot(shopBuilding.door.x-player.position.x,shopBuilding.door.z-player.position.z)<3.1;}
let shopOpen=false,shopSector='escrituras',shopConfirm=null;
function shopCtx(){return{questStep,level:playerLevel(),coins,owned:ownedItems};}
function openShop(){
 if(shopOpen||dialogueOpen||namePromptOpen||awakeningActive)return;
 if(!shopVisited){shopVisited=true;save3DProgress();showDialogue([
  {who:'Anjo-Guia',text:'Esta é a Loja Central. Aqui ninguém vende almas — só o que se conquista caminhando. O ouro abre a porta, mas cada Palavra exige que você tenha vivido o bastante para carregá-la.'},
  {who:'Anjo-Guia',text:'Na Câmara das Escrituras estão os poderes; no Arsenal, as lâminas. O Salão registra seus feitos e o Arquivo guarda o rosto de quem você enfrentou. A última câmara… ainda não é para nós.'}],()=>openShop());return;}
 shopOpen=true;shopConfirm=null;setDefending(false);const panel=document.getElementById('shop-panel');if(panel)panel.hidden=false;renderShop();
}
function closeShop(){shopOpen=false;shopConfirm=null;const panel=document.getElementById('shop-panel');if(panel)panel.hidden=true;}
const SHOP_ART={magic:'magic',magic2:'magic2',magic3:'magic3',ultimate:'ultimate',magic_plus:'magic_plus',magic2_plus:'magic2_plus',magic3_plus:'magic3_plus',aurora:'sword_aurora',vigilia:'sword_vigilia',celeste:'sword_aurora'};
const SHOP_TAGS={magic:'HABILIDADE 1',magic2:'HABILIDADE 2',magic3:'HABILIDADE 3',ultimate:'ULTIMATE',magic_plus:'APRIMORAMENTO 1',magic2_plus:'APRIMORAMENTO 2',magic3_plus:'APRIMORAMENTO 3',aurora:'ESPADA',vigilia:'ESPADA',celeste:'RELÍQUIA'};
const SHOP_NAV={escrituras:['Habilidades','cat_escrituras'],arsenal:['Equipamentos','cat_arsenal'],conquistas:['Conquistas','cat_conquistas'],arquivo:['Arquivo','cat_arquivo'],fragmentos:['Especiais','cat_fragmentos']};
function shopArt(name,locked){return '<div class="shop-art'+(locked?' is-locked':'')+'">'+iconSvg(name,{size:96})+(locked?'<span class="shop-lock">'+iconSvg('lock',{size:34}).replace('class="art-svg"','class="art-svg lock"')+'</span>':'')+'</div>';}
function renderShop(){
 const tabs=document.getElementById('shop-tabs'),body=document.getElementById('shop-body'),gold=document.getElementById('shop-coins'),lvl=document.getElementById('shop-level');if(!tabs||!body)return;
 if(gold)gold.textContent=String(coins);if(lvl)lvl.textContent='NÍVEL '+playerLevel();
 tabs.innerHTML='';for(const sec of SHOP_SECTORS){const nav=SHOP_NAV[sec.id]||[sec.name,'cat_arquivo'];const b=document.createElement('button');b.type='button';b.innerHTML='<span class="tab-ic">'+iconSvg(nav[1],{size:30})+'</span><span class="tab-tx">'+nav[0]+'</span>';b.className=sec.id===shopSector?'on':'';if(sec.lockedUntilGalaxy)b.classList.add('locked');bindInstantTap(b,()=>{shopSector=sec.id;shopConfirm=null;renderShop();body.scrollTop=0;});tabs.appendChild(b);}
 const sec=SHOP_SECTORS.find(x=>x.id===shopSector);body.innerHTML='<p class="shop-blurb">'+sec.blurb+'</p>';
 if(sec.lockedUntilGalaxy){body.insertAdjacentHTML('beforeend','<div class="shop-sealed">'+shopArt('cat_fragmentos',true)+'<strong>Selada</strong><span>Disponível a partir da Galáxia '+sec.lockedUntilGalaxy+'. Nada aqui pode ser comprado antes disso.</span></div>');return;}
 if(sec.id==='escrituras'||sec.id==='arsenal'){
  const addCard=(art,tag,name,desc,priceTxt,lvTxt,st,reason,actions)=>{
   const card=document.createElement('div');card.className='shop-card state-'+st;
   card.innerHTML=shopArt(art,st==='locked')+'<div class="shop-info"><h3>'+name+'</h3><span class="shop-tag">✦ '+tag+'</span><p class="shop-desc">'+desc+'</p><div class="shop-foot">'+(lvTxt?'<span class="shop-lv">'+lvTxt+'</span>':'')+'<span class="shop-price">'+priceTxt+'</span></div>'+(reason?'<p class="shop-req">'+reason+'</p>':'')+'<div class="shop-actions"></div></div>';
   const box=card.querySelector('.shop-actions');for(const el of actions)box.appendChild(el);body.appendChild(card);};
  if(sec.id==='arsenal'){const eq=document.createElement('button');eq.type='button';eq.textContent=equippedSword==='prota'?'EQUIPADA':'EQUIPAR';eq.disabled=equippedSword==='prota';bindInstantTap(eq,()=>{equipSword('prota');renderShop();});
   addCard('sword_prota','ESPADA INICIAL',SWORDS.prota.name,'A lâmina com que você despertou. Equilibrada, sem habilidade ativa.','INICIAL','','owned','',[eq]);}
  if(sec.id==='arsenal'&&coatOwned){const cb=document.createElement('button');cb.type='button';cb.textContent=coatOn?'DESEQUIPAR':'EQUIPAR';bindInstantTap(cb,()=>{setCoat(!coatOn);coatJustUnlocked=false;renderShop();status.textContent=coatOn?'Casaco equipado: o frio não te afeta.':'Casaco guardado.';});
   if(scrollOwned)addCard('sword_prota','ENCANTAMENTO','Pergaminho de Encantamento','Presente da pessoa misteriosa, na estrada da torre. A espada equipada causa +20% de dano.','ATIVO','','owned','',[]);
   addCard('cat_arsenal','ROUPA','Casaco de Pele','Couro forrado de pele, comprado na estrada da cidade de neve. +15 de vida, +10% de recuperação de mana e proteção contra o frio.',coatOn?'EQUIPADO':'ADQUIRIDO','','owned','',[cb]);if(coatJustUnlocked){const last=body.lastElementChild;if(last)last.classList.add('is-new');}}
  for(const item of SHOP_ITEMS.filter(i=>i.sector===sec.id)){
   const st=shopStatus(item,shopCtx()),acts=[];
   if(st.state==='buyable'){const buy=document.createElement('button');buy.type='button';buy.className='buy';buy.textContent=shopConfirm===item.id?'CONFIRMAR · '+item.cost+' ◉':'COMPRAR';bindInstantTap(buy,()=>{if(shopConfirm!==item.id){shopConfirm=item.id;renderShop();return;}purchase(item);});acts.push(buy);}
   if(item.kind==='sword'&&st.state==='owned'){const eq=document.createElement('button');eq.type='button';eq.textContent=equippedSword===item.id?'EQUIPADA':'EQUIPAR';eq.disabled=equippedSword===item.id;bindInstantTap(eq,()=>{equipSword(item.id);renderShop();});acts.push(eq);}
   addCard(SHOP_ART[item.id]||'magic',SHOP_TAGS[item.id]||'ITEM',item.name,item.desc,st.state==='owned'?'ADQUIRIDO':item.cost+' ◉','Nv. '+item.level,st.state,st.state==='owned'?'':st.reason,acts);
  }
 }else if(sec.id==='conquistas'){
  for(const a of ACHIEVEMENTS){const st=achievementState(a,progressStats,achievementsClaimed),card=document.createElement('div');card.className='shop-card ach'+(st.claimed?' state-owned':st.done?' state-buyable':' state-progress');
   card.innerHTML=shopArt('cat_conquistas',!st.done&&!st.claimed)+'<div class="shop-info"><h3>'+a.name+'</h3><span class="shop-tag">✦ CONQUISTA</span><p class="shop-desc">'+a.desc+'</p><div class="ach-bar"><i style="width:'+Math.round(st.value/a.goal*100)+'%"></i></div><div class="shop-foot"><span class="shop-lv">'+st.value+' / '+a.goal+'</span><span class="shop-price">+'+a.reward+' ◉</span></div><div class="shop-actions"></div></div>';
   if(st.done&&!st.claimed){const b=document.createElement('button');b.type='button';b.className='buy';b.textContent='RESGATAR';bindInstantTap(b,()=>{achievementsClaimed.add(a.id);coins+=a.reward;worldAudio.reveal();save3DProgress();updateQuestHud();renderShop();});card.querySelector('.shop-actions').appendChild(b);}
   body.appendChild(card);}
 }else if(sec.id==='arquivo'){
  const grid=document.createElement('div');grid.className='bestiary';
  for(const e of BESTIARY){const v=bestiaryEntry(e,bestiaryKnown),card=document.createElement('div');card.className='beast'+(v.known?' known':'');
   card.innerHTML='<div class="beast-img" style="background-image:url(./'+e.img+')"></div><strong>'+v.name+'</strong><span>'+v.cls+'</span><p>'+v.lore+'</p>';
   if(v.known&&!bestiaryRewarded.has(e.id)){const b=document.createElement('button');b.type='button';b.className='buy';b.textContent='REGISTRAR +'+e.discoveryReward+' ◉';bindInstantTap(b,()=>{bestiaryRewarded.add(e.id);coins+=e.discoveryReward;save3DProgress();updateQuestHud();renderShop();});card.appendChild(b);}
   grid.appendChild(card);}
  body.appendChild(grid);
 }
}
function purchase(item){
 const r=buyItem(item,shopCtx());shopConfirm=null;if(!r.ok){status.textContent=r.reason;renderShop();return;}
 coins=r.coins;ownedItems.add(item.id);worldAudio.reveal();if(item.kind==='sword')equipSword(item.id);
 save3DProgress();updateQuestHud();renderShop();
 const toast=document.getElementById('quest-toast');if(toast){toast.textContent=(item.kind==='sword'?'NOVA LÂMINA · ':'NOVA PALAVRA · ')+item.name.toUpperCase();toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2600);}
}
(function initShopUi(){bindInstantTap(document.getElementById('shop-close'),closeShop);addEventListener('keydown',e=>{if(e.code==='Escape'&&shopOpen){closeShop();e.stopImmediatePropagation();}},{capture:true});})();
/* MOD 188 — Lâmina da Aurora: segunda espada, modelada aqui (não havia espada celestial extra nos assets;
   os outros GLB são armas dos Bispos). Lâmina clara com fio dourado, guarda em asas e pomo luminoso. */
function buildAuroraSword(pal=SWORD_PALETTES.aurora){
 const g=new THREE.Group();g.name='LaminaCelestial';
 const bladeShape=new THREE.Shape();bladeShape.moveTo(-.055,0);bladeShape.lineTo(-.06,.78);bladeShape.lineTo(-.035,.98);bladeShape.lineTo(0,1.12);bladeShape.lineTo(.035,.98);bladeShape.lineTo(.06,.78);bladeShape.lineTo(.055,0);bladeShape.lineTo(-.055,0);
 const blade=new THREE.Mesh(new THREE.ExtrudeGeometry(bladeShape,{depth:.016,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:1}),new THREE.MeshStandardMaterial({color:pal.blade,metalness:.85,roughness:.18,emissive:pal.edge,emissiveIntensity:.35}));
 blade.geometry.translate(0,0,-.008);blade.position.y=.26;g.add(blade);
 const fuller=new THREE.Mesh(new THREE.BoxGeometry(.014,.74,.036),new THREE.MeshBasicMaterial({color:pal.fuller,toneMapped:false}));fuller.position.y=.66;g.add(fuller);
 const gold=new THREE.MeshStandardMaterial({color:pal.gold,metalness:.75,roughness:.3,emissive:0x4a2e06,emissiveIntensity:.5});
 const guard=new THREE.Mesh(new THREE.BoxGeometry(.34,.045,.06),gold);guard.position.y=.25;g.add(guard);
 for(const sx of [-1,1]){const wing=new THREE.Mesh(new THREE.ConeGeometry(.035,.16,5),gold);wing.position.set(sx*.19,.29,0);wing.rotation.z=-sx*.9;g.add(wing);}
 const grip=new THREE.Mesh(new THREE.CylinderGeometry(.028,.032,.22,8),new THREE.MeshStandardMaterial({color:0x3a2a1a,roughness:.8}));grip.position.y=.12;g.add(grip);
 const pommel=new THREE.Mesh(new THREE.SphereGeometry(.045,10,8),new THREE.MeshStandardMaterial({color:0xfff2c4,emissive:pal.pommel,emissiveIntensity:1.6,toneMapped:false}));pommel.position.y=0;g.add(pommel);
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;}});
 return g; // origem no pomo, lâmina ao longo de +Y, comprimento ~1,38
}
// Encaixa a nova lâmina no mesmo eixo e posição de empunhadura da EspadaProta (medidos no próprio modelo).
function alignAuroraToSwordRoot(aurora){
 swordRoot.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(swordRoot.matrixWorld).invert(),box=new THREE.Box3();
 swordRoot.traverse(o=>{if(o.isMesh&&o.geometry){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld)));}});
 const size=box.getSize(new THREE.Vector3()),axis=size.x>size.y?(size.x>size.z?'x':'z'):(size.y>size.z?'y':'z');
 const minV=box.min[axis],maxV=box.max[axis],tipPositive=Math.abs(maxV)>=Math.abs(minV),dir=new THREE.Vector3();dir[axis]=tipPositive?1:-1;
 const center=box.getCenter(new THREE.Vector3()),start=center.clone();start[axis]=tipPositive?minV:maxV;
 const holder=new THREE.Group();holder.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);holder.position.copy(start);
 aurora.scale.setScalar(size[axis]*1.06/1.38);holder.add(aurora);return holder;
}
let auroraHand=null,auroraFpTemplate=null;
const SWORD_PALETTES={aurora:{blade:0xf3f0e6,edge:0xffe6b0,fuller:0xffd56a,gold:0xe2b04a,pommel:0xffc24a},vigilia:{blade:0xdfe8f5,edge:0x9fc4ff,fuller:0x8fd0ff,gold:0x9aa8c0,pommel:0x7ab8ff},celeste:{blade:0xffffff,edge:0xfff6d8,fuller:0xfff2b0,gold:0xffd86a,pommel:0xffffff}};
const swordHands={},swordFpTemplates={};
function equipSword(id){
 if(id!=='prota'&&!ownedItems.has(id))return;equippedSword=id;save3DProgress();
 if(id!=='prota'&&swordRoot&&swordRoot.parent&&!swordHands[id]){const wrap=new THREE.Group();wrap.position.copy(swordRoot.position);wrap.quaternion.copy(swordRoot.quaternion);wrap.scale.copy(swordRoot.scale);wrap.add(alignAuroraToSwordRoot(buildAuroraSword(SWORD_PALETTES[id])));swordRoot.parent.add(wrap);swordHands[id]=wrap;swordFpTemplates[id]=alignAuroraToSwordRoot(buildAuroraSword(SWORD_PALETTES[id]));}
 if(swordRoot)swordRoot.visible=id==='prota';for(const [k,h] of Object.entries(swordHands))h.visible=k===id;
 auroraHand=swordHands.aurora||auroraHand;auroraFpTemplate=swordFpTemplates.aurora||auroraFpTemplate;
 slashTrail.material.color.setHex(SWORDS[id].trail);
 if(fpSword){fpHolder.remove(fpSword);fpSword=null;}
}
/* MOD 189 — abertura: tela das sete galáxias (o mundo carrega por trás) e prólogo curto feito com a
   própria cena — câmera desce das serras até a clareira, com três frases. Pula com um toque. */
let menuGate=!new URLSearchParams(location.search).has('debug3d')||new URLSearchParams(location.search).has('galaxias');
let prologueActive=false,prologueT=0,pendingAwakening=false;
const PROLOGUE_LINES=[[0,'Houve um tempo em que um nome valia mais que ouro.'],[4.6,'Então a Ganância aprendeu a cobrar — vidas, juramentos, crianças.'],[9.4,'E o Céu enviou alguém que não estava à venda.']];
const PROLOGUE_DURATION=14;
const prologueCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(48,64,-175),new THREE.Vector3(10,40,-95),new THREE.Vector3(-14,20,-32),new THREE.Vector3(4,6.5,16)]);
const prologueLook=new THREE.CatmullRomCurve3([new THREE.Vector3(0,8,-40),new THREE.Vector3(-6,2,-30),new THREE.Vector3(0,1.5,-5),new THREE.Vector3(0,1.4,4)]);
function startPrologue(){prologueActive=true;prologueT=0;document.body.classList.add('cinematic');const skip=document.getElementById('skip-awakening');if(skip){skip.textContent='PULAR';skip.classList.remove('hidden');}}
function endPrologue(){if(!prologueActive)return;prologueActive=false;document.body.classList.remove('cinematic');const t=document.getElementById('prologue-text');if(t)t.classList.remove('show');const skip=document.getElementById('skip-awakening');if(skip)skip.textContent='PULAR ABERTURA';awakeningActive=true;awakeningT=0;}
function updatePrologue(dt){
 if(!prologueActive)return;prologueT+=dt;const u=Math.min(1,prologueT/PROLOGUE_DURATION),e=u*u*(3-2*u);
 camera.position.copy(prologueCurve.getPoint(e));camera.lookAt(prologueLook.getPoint(e));
 const text=document.getElementById('prologue-text');if(text){let line='';for(const [t,l] of PROLOGUE_LINES)if(prologueT>=t)line=l;const local=PROLOGUE_LINES.findIndex(([t])=>t>prologueT);const nextT=local<0?PROLOGUE_DURATION:PROLOGUE_LINES[local][0];const show=line&&prologueT<nextT-.7;if(text.textContent!==line)text.textContent=line;text.classList.toggle('show',!!show);}
 if(prologueT>=PROLOGUE_DURATION)endPrologue();
}
function skipIntroScene(){if(prologueActive){prologueActive=false;document.body.classList.remove('cinematic');const t=document.getElementById('prologue-text');if(t)t.classList.remove('show');}finishAwakening();}
const GALAXY_STORE='seven-sins-galaxies';
function openGalaxyScreen(){
 let save={};try{save=JSON.parse(localStorage.getItem(GALAXY_STORE)||'{}');}catch(_){}
 menuGate=true;closeWorldMap();closeShop();setPaused(false);
 showGalaxyScreen({progress:{questStep,bishopsDefeated},save,coins,onSettings:()=>{const gb=document.getElementById('graphics-toggle-3d');if(gb)gb.click();},onCelebrated:()=>{try{delete save.celebrate;localStorage.setItem(GALAXY_STORE,JSON.stringify(save));}catch(_){}},isReady:()=>(!loading||loading.classList.contains('hidden')||loading.style.display==='none')&&worldCompiled,onEnter:()=>{menuGate=false;worldAudio.unlock();if(pendingAwakening){pendingAwakening=false;startAwakeningCine();}}});
}
/* MOD 203 — Marco 1 (roteiro em docs/roteiro/M1-PROLOGO.md): Reino Celestial → tela das galáxias → despertar no
   Mundo da Ganância. As cenas são dados (prologue-flow.js); aqui ficam câmera, animações, efeitos e telas.
   Modelos feitos no Blender: TronoCeleste, FiguraDeLuz, Asas e os clipes Ajoelhar/OlharMaos (Protagonista-cine). */
const HEAVEN_STORE='seven-sins-3d-prologo-ceu';
var heavenSeen=(()=>{try{return localStorage.getItem(HEAVEN_STORE)==='1';}catch(_){return false;}})();
var cineActive=false,cineShot='',cineU=0,cineCut=false,cineSayWho='',cineAssets=null,cineHeaven=null,cineAwake=null,cineWalk=null,cineDissolveT=-1,cineBlurT=-1,cineBlurLast=-1,cineAngelT=-1,cineSkipArmedUntil=0,cineSavedFov=56,cineGlowTexture=null;
const cineEl=id=>document.getElementById(id);
const cineV=new THREE.Vector3(),cineV2=new THREE.Vector3(),cineLook=new THREE.Vector3(),cinePos=new THREE.Vector3(),cineHead=new THREE.Vector3(),cineHandL=new THREE.Vector3(),cineHandR=new THREE.Vector3();
const cineSmooth=u=>{u=Math.min(1,Math.max(0,u));return u*u*(3-2*u);};
const cineDirector=createDirector({
 shot:(id,u)=>{if(cineShot!==id)cineCut=true;cineShot=id;cineU=u;},
 say:(who,text)=>{const line=personalizeLine({type:'say',who,text},playerName);cineSayWho=who;cineEl('cine-who').textContent=line.who;cineEl('cine-text').textContent=line.text;cineEl('cine-say').hidden=false;},
 hideSay:()=>{cineSayWho='';cineEl('cine-say').hidden=true;},
 do:(id,args)=>cineDo(id,args),
 ask:id=>cineAsk(id),
 end:(scene,skipped)=>{if(scene==='ceu')endHeavenCine(skipped);else if(scene==='despertar')endAwakeningCine(skipped);else endStory(skipped);}
});
function glowTexture(){if(cineGlowTexture)return cineGlowTexture;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,244,214,.55)');g.addColorStop(1,'rgba(255,230,170,0)');x.fillStyle=g;x.fillRect(0,0,128,128);cineGlowTexture=new THREE.CanvasTexture(c);cineGlowTexture.colorSpace=THREE.SRGBColorSpace;return cineGlowTexture;}
function glowSprite(color,opacity,size){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}));s.scale.setScalar(size);return s;}
function cineBone(re){let found=null;if(model)model.traverse(o=>{if(!found&&o.isBone&&re.test(o.name||''))found=o;});return found;}
function loadCineAssets(){
 if(cineAssets)return cineAssets;
 const load=file=>new Promise((res,rej)=>new GLTFLoader().load(file,res,undefined,rej));
 const playerReady=new Promise(res=>{const t=()=>player.userData.ready&&model?res():setTimeout(t,120);t();});
 const guideReady=new Promise(res=>{const t0=performance.now(),t=()=>guideFitRoot||performance.now()-t0>9000?res():setTimeout(t,120);t();});
 cineAssets=Promise.all([load('./Protagonista-cine.glb?v=mod203'),load('./Asas.glb?v=mod203'),load('./TronoCeleste.glb?v=mod203'),load('./FiguraDeLuz.glb?v=mod203'),playerReady,guideReady]).then(([clips,wings,throne,figure])=>{
  if(mixer)for(const c of clips.animations||[]){const key=/ajoelh/i.test(c.name)?'ajoelhar':/olhar/i.test(c.name)?'olharMaos':null;if(key&&!actions[key])actions[key]=mixer.clipAction(c);}
  return {wings:wings.scene,throne:throne.scene,figure:figure.scene};
 });
 return cineAssets;
}
function buildHeaven(a){
 const sp=arenaSpec('ceu'),g=new THREE.Group();g.name='CeuProps';g.position.set(sp.x,sp.y,sp.z);scene.add(g);
 for(const m of [a.throne,a.figure]){m.scale.setScalar(1.6);m.position.set(0,0,-50);m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});g.add(m);}
 a.figure.traverse(o=>{if(o.isMesh)o.castShadow=false;});
 g.updateMatrixWorld(true);
 const throneBox=new THREE.Box3().setFromObject(a.throne),figBox=new THREE.Box3().setFromObject(a.figure);
 const head=new THREE.Vector3((figBox.min.x+figBox.max.x)/2,figBox.max.y-.5,(figBox.min.z+figBox.max.z)/2);
 const glow=glowSprite(0xfff0c8,.7,14);glow.position.copy(head).sub(g.position).add(new THREE.Vector3(0,-1.6,-1.2));g.add(glow);
 const halo=glowSprite(0xffffff,.85,4.2);halo.position.copy(head).sub(g.position);g.add(halo);
 const kneelZ=throneBox.max.z+3.2,startZ=kneelZ+17;
 // Anjos de guarda ao longo do caminho (o mesmo modelo do Anjo-Guia), pairando de frente para o caminho.
 const angels=[];
 if(guideFitRoot)for(let k=0;k<3;k++)for(const sx of [-1,1]){const c=cloneSkinned(guideFitRoot);c.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;}});const h=new THREE.Group();h.add(c);h.scale.setScalar(1.7);h.position.set(sx*5.4,.35,kneelZ-sp.z+3+k*6.2);h.rotation.y=-sx*Math.PI/2;h.userData.phase=k*1.7+(sx>0?.8:0);g.add(h);angels.push(h);}
 // Asas e aura do herói (retiradas na cena C05).
 const wings=a.wings;wings.scale.setScalar(.55);const wingMats=[];wings.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;wingMats.push(o.material);o.castShadow=true;}});
 const wingL=wings.getObjectByName('AsaEsquerda'),wingR=wings.getObjectByName('AsaDireita');
 const wingHolder=new THREE.Group();wingHolder.add(wings);scene.add(wingHolder);
 const fx=new THREE.Group();scene.add(fx);
 const aura=glowSprite(0xffe2a0,.5,3);aura.position.y=1.1;fx.add(aura);
 const N=70,pos=new Float32Array(N*3),seed=[];for(let i=0;i<N;i++){const ang=Math.random()*6.283,r=.45+Math.random()*.55;seed.push({ang,r,v:.35+Math.random()*.5});pos[i*3]=Math.cos(ang)*r;pos[i*3+1]=Math.random()*2.3;pos[i*3+2]=Math.sin(ang)*r;}
 const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const sparks=new THREE.Points(pg,new THREE.PointsMaterial({map:glowTexture(),color:0xffd98a,size:.13,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));sparks.frustumCulled=false;fx.add(sparks);
 cineHeaven={group:g,origin:new THREE.Vector3(sp.x,sp.y,sp.z),head,glow,halo,angels,kneelZ,startZ,throneZ:sp.z-50,wings,wingL,wingR,wingMats,wingHolder,fx,aura,sparks,seed,spine:cineBone(/spine2$/i)||cineBone(/spine/i)};
 return cineHeaven;
}
function disposeHeaven(){
 if(!cineHeaven)return;const h=cineHeaven;cineHeaven=null;
 for(const a of h.angels)a.removeFromParent();// os anjos dividem malhas e materiais com o Anjo-Guia do mundo
 for(const o of [h.group,h.wingHolder,h.fx]){scene.remove(o);o.traverse(x=>{if(x.isMesh||x.isPoints||x.isSprite){if(x.geometry&&!x.isSprite)x.geometry.dispose();for(const m of [].concat(x.material||[]))if(m)m.dispose();}});}
 if(dimArenas.ceu){scene.remove(dimArenas.ceu.group);dimArenas.ceu.dispose();delete dimArenas.ceu;}
}
function setCineFade(to,dur,white){const el=cineEl('cine-fade');if(!el)return;el.classList.toggle('white',!!white);el.style.transition='opacity '+dur+'s ease';el.style.opacity=String(to);}
function cineBegin(){
 cineActive=true;cineShot='';cineCut=true;document.body.classList.add('cinematic');
 const skip=cineEl('cine-skip');if(skip){skip.hidden=false;skip.textContent='PULAR';}
 cineSavedFov=camera.fov;camera.fov=50;camera.updateProjectionMatrix();
 moveVX=moveVZ=0;dashRemaining=0;actionUntil=Infinity;setDefending(false);
}
function cineEnd(){
 cineActive=false;cineShot='';document.body.classList.remove('cinematic');
 const skip=cineEl('cine-skip');if(skip)skip.hidden=true;
 cineEl('cine-say').hidden=true;cineEl('cine-title').classList.remove('show');cineEl('cine-lids').className='';canvas.style.filter='';cineBlurT=-1;cineBlurLast=-1;
 camera.fov=cineSavedFov;camera.near=.1;camera.updateProjectionMatrix();actionUntil=0;guide.visible=true;guide.scale.setScalar(1);
 if(actions.idle)play('idle',.35);
}
function prepareHeaven(){
 return loadCineAssets().then(a=>{
  if(!cineHeaven)buildHeaven(a);
  const arena=getDimArena('ceu');arena.group.visible=true;cineHeaven.group.visible=true;
  const done=()=>{arena.group.visible=!!(voidMode&&dimKey==='ceu');};
  try{if(renderer.compileAsync)return renderer.compileAsync(scene,camera).then(done,done);renderer.compile(scene,camera);}catch(e){}done();
 });
}
function startHeavenCine(){
 if(!cineHeaven){openGalaxyAfterHeaven(true);return;}
 const h=cineHeaven;h.beaconWas=portalBeacon.visible;enterDimensionArena('ceu');
 player.position.set(h.origin.x,h.origin.y,h.startZ);playerYaw=Math.PI;player.rotation.y=Math.PI;
 h.group.visible=true;h.wingHolder.visible=true;h.fx.visible=true;h.wings.visible=true;for(const m of h.wingMats)m.opacity=1;h.aura.material.opacity=.5;h.sparks.material.opacity=.9;cineDissolveT=-1;cineWalk=null;
 cineBegin();setCineFade(0,1.6,true);worldAudio.celestial();
 cineDirector.play('ceu',heavenScene());
}
function endHeavenCine(skipped){
 heavenSeen=true;try{localStorage.setItem(HEAVEN_STORE,'1');}catch(_){}
 setCineFade(1,skipped?.35:.01,true);
 setTimeout(()=>openGalaxyAfterHeaven(false),skipped?380:60);
}
function openGalaxyAfterHeaven(failed){
 if(failed)console.warn('Prólogo do céu indisponível (modelos não carregaram); seguindo para as galáxias.');
 if(cineActive)cineEnd();
 if(cineHeaven&&cineHeaven.beaconWas!==undefined)portalBeacon.visible=cineHeaven.beaconWas;
 if(voidMode)leaveVoid();disposeHeaven();
 setGameHour(7.5);player.position.set(AWAKE_SPOT.x,terrainHeightAt(AWAKE_SPOT.x,AWAKE_SPOT.z),AWAKE_SPOT.z);playerYaw=0;player.rotation.y=0;
 pendingAwakening=true;openGalaxyScreen();setCineFade(0,1.4,true);
}
function startAwakeningCine(){
 guide.position.set(AWAKE_SPOT.x-1.9,0,AWAKE_SPOT.z-2.4);guide.position.y=terrainHeightAt(guide.position.x,guide.position.z);
 const G=guide.position,ax=AWAKE_SPOT.x,az=AWAKE_SPOT.z;
 player.position.set(ax,terrainHeightAt(ax,az),az);playerYaw=Math.atan2(G.x-ax,G.z-az);player.rotation.y=playerYaw;
 guide.lookAt(ax,guide.position.y,az);guide.visible=false;
 cineAwake={x:ax,z:az,yaw:playerYaw};awakeningActive=false;
 cineBegin();loadCineAssets().catch(()=>{}).then(()=>{if(cineActive&&cineShot==='olhos-abrem'&&actions.olharMaos)playOnce('olharMaos',.2);});
 cineDirector.play('despertar',awakeningScene());
}
function cineAcceptMission(){
 if(questStep!==0)return;
 if(!purseGiven){coins+=ACT1.purse;purseGiven=true;showRewardPop('+'+ACT1.purse+' OURO');}
 questStep=1;save3DProgress();updateQuestHud();status.textContent='Procure a pequena vila e fale com um vendedor.';
}
function endAwakeningCine(skipped){
 cineEl('mission-card').hidden=true;cineEl('act-card').classList.add('hidden');
 actCardSeen=true;cineEnd();finishAwakening();
 if(!playerName)openNamePrompt(()=>cineAcceptMission());else cineAcceptMission();
 cameraYaw=cineAwake?cineAwake.yaw+Math.PI:cameraYaw;cameraPitch=.16;
 setCineFade(0,skipped?.6:1.4,false);
}
function cineDo(id,args){
 if(cineDirector.scene!=='ceu'&&cineDirector.scene!=='despertar'){storyDo(id,args);return;}
 const h=cineHeaven;
 if(id==='titulo'){const el=cineEl('cine-title');el.querySelector('span').textContent=args.kicker||'';el.querySelector('strong').textContent=args.title||'';el.classList.add('show');setTimeout(()=>el.classList.remove('show'),4200);}
 else if(id==='heroi-caminha'&&h){cineWalk={from:h.startZ,to:h.kneelZ};if(actions.walk){play('walk',.35);actions.walk.setEffectiveTimeScale(.56);}}
 else if(id==='heroi-ajoelha'&&h){cineWalk=null;player.position.z=h.kneelZ;if(actions.walk)actions.walk.setEffectiveTimeScale(1);if(!(actions.ajoelhar&&playOnce('ajoelhar',.35)))play('idle',.3);}
 else if(id==='retirar-asas'){cineDissolveT=0;worldAudio.dissolve();}
 else if(id==='clarão'){setCineFade(1,2.2,true);}
 else if(id==='palpebras'){const lids=cineEl('cine-lids');lids.className='on';void lids.offsetWidth;lids.className='on open';cineBlurT=0;setCineFade(0,.8,false);}
 else if(id==='heroi-olha-maos'){if(actions.olharMaos)playOnce('olharMaos',.2);}
 else if(id==='heroi-repouso'){if(actions.idle)play('idle',.9);}
 else if(id==='anjo-aparece'){cineAngelT=0;guide.visible=true;guide.scale.setScalar(.01);worldAudio.celestial();}
 else if(id==='ato-1'){const card=cineEl('act-card');card.querySelector('#act-kicker').textContent='GALÁXIA 1 · GANÂNCIA';card.querySelector('h2').textContent='ATO I';card.querySelector('#act-bishop').textContent='O preço de uma vida';card.classList.remove('hidden');actCardSeen=true;worldAudio.chapter();}
 else if(id==='escuro'){cineEl('act-card').classList.add('hidden');setCineFade(1,1.1,false);}
}
function cineAsk(id){
 if(id==='nome'){openNamePrompt(()=>cineDirector.resume());return;}
 if(id==='pergaminho'){const c=cineEl('choice-card');if(c){choiceMode='pergaminho';c.querySelector('.mc-kicker').textContent='PESSOA MISTERIOSA';c.querySelector('h2').textContent='Pergaminho de Encantamento';cineEl('choice-text').textContent='Encanta a sua espada: +20% de dano.';cineEl('choice-yes').textContent='RECEBER';cineEl('choice-no').hidden=true;c.hidden=false;}else{scrollOwned=true;cineDirector.resume();}return;}
 if(id==='casaco'){const c=cineEl('choice-card');if(c){choiceMode='casaco';c.querySelector('.mc-kicker').textContent='VENDEDOR DE CASACOS';c.querySelector('h2').textContent='Comprar o casaco?';cineEl('choice-yes').textContent='COMPRAR';cineEl('choice-no').hidden=false;cineEl('choice-text').textContent='Casaco de Pele · '+COAT.price+' moedas (você tem '+coins+').';c.hidden=false;}else cineDirector.resume();return;}
 if(id==='aceitar-missao'){cineEl('mission-kicker').textContent=MISSION_ACT1.kicker;cineEl('mission-title').textContent=MISSION_ACT1.title;cineEl('mission-objective').textContent=MISSION_ACT1.objective;cineEl('mission-card').hidden=false;return;}
 cineDirector.resume();
}
bindInstantTap(cineEl('choice-yes'),()=>{if(cineEl('choice-card').hidden)return;if(choiceMode==='pergaminho')receiveScroll();else coatChoice(true);});
bindInstantTap(cineEl('choice-no'),()=>{if(cineEl('choice-card').hidden)return;coatChoice(false);});
bindInstantTap(cineEl('mission-accept'),()=>{if(cineEl('mission-card').hidden)return;cineEl('mission-card').hidden=true;cineAcceptMission();worldAudio.unlock();cineDirector.resume();});
bindInstantTap(cineEl('cine-skip'),()=>{if(!cineDirector.running)return;const now=performance.now(),b=cineEl('cine-skip');if(now<cineSkipArmedUntil){cineSkipArmedUntil=0;cineDirector.skip();return;}cineSkipArmedUntil=now+2600;b.textContent='TOQUE DE NOVO PARA PULAR';setTimeout(()=>{if(performance.now()>=cineSkipArmedUntil)b.textContent='PULAR';},2700);});
addEventListener('pointerdown',e=>{if(!cineActive||namePromptOpen)return;const t=e.target;if(t&&t.closest&&t.closest('button,input,#mission-card,#choice-card,#name-panel'))return;cineDirector.tap();},true);
function cineCam(px,py,pz,lx,ly,lz,follow,dt){
 cineV.set(px,py,pz);cineV2.set(lx,ly,lz);
 // A câmera do jogo mexe em camera.position a cada quadro; a câmera da cena guarda a própria posição (cinePos).
 if(cineCut||!follow){cinePos.copy(cineV);cineLook.copy(cineV2);cineCut=false;}else{const k=1-Math.exp(-follow*dt);cinePos.lerp(cineV,k);cineLook.lerp(cineV2,k);}
 camera.position.copy(cinePos);camera.lookAt(cineLook);
}
function updateHeavenCine(dt,now){
 const h=cineHeaven;if(!h)return;const P=player.position,y=h.origin.y,u=cineU,e=cineSmooth(u),t=now*.001;
 if(cineWalk&&cineShot==='ceu-caminhada')P.z=THREE.MathUtils.lerp(cineWalk.from,cineWalk.to,u);
 for(const a of h.angels)a.position.y=.35+Math.sin(t*1.3+a.userData.phase)*.18;
 h.glow.material.opacity=.62+Math.sin(t*1.7)*.08;h.halo.material.opacity=.8+Math.sin(t*2.3)*.1;
 // Asas presas às costas (osso Spine2) com bater lento; aura e faíscas sobem em volta do herói.
 if(h.spine){h.spine.getWorldPosition(cineV);h.wingHolder.position.copy(cineV);h.wingHolder.position.x-=Math.sin(playerYaw)*.1;h.wingHolder.position.z-=Math.cos(playerYaw)*.1;}
 h.wingHolder.rotation.y=playerYaw;const flap=Math.sin(t*1.9)*.12;if(h.wingL)h.wingL.rotation.y=flap;if(h.wingR)h.wingR.rotation.y=-flap;
 h.fx.position.copy(P);const pa=h.sparks.geometry.attributes.position,d=cineDissolveT>=0?Math.min(1,cineDissolveT/3.2):0;
 for(let i=0;i<h.seed.length;i++){const s=h.seed[i];let yy=pa.array[i*3+1]+dt*s.v*(1+d*5);if(yy>2.4+d*3)yy=0;const r=s.r*(1+d*2.5);s.ang+=dt*.4;pa.array[i*3]=Math.cos(s.ang)*r;pa.array[i*3+1]=yy;pa.array[i*3+2]=Math.sin(s.ang)*r;}
 pa.needsUpdate=true;
 if(cineDissolveT>=0){cineDissolveT+=dt;for(const m of h.wingMats)m.opacity=1-d;h.wings.scale.setScalar(.55*(1+d*.3));h.wings.position.y=d*.5;h.aura.material.opacity=.5*(1-d);h.sparks.material.opacity=.9*(1-d*d);if(d>=1){h.wings.visible=false;h.fx.visible=false;}}
 const O=h.origin,K=h.kneelZ,T=h.throneZ;
 if(cineShot==='ceu-trono'&&cineSayWho){
  if(cineSayWho==='heroi')cineCam(P.x+.6,y+1.5,P.z-2.6,P.x,y+1.15,P.z,3,dt);
  else cineCam(O.x+3.4+Math.sin(t*.2)*.2,y+1.5,K+.6,h.head.x,h.head.y-.4,h.head.z,2,dt);
  return;
 }
 switch(cineShot){
  case 'ceu-panorama':cineCam(O.x+THREE.MathUtils.lerp(0,1.6,e),y+THREE.MathUtils.lerp(26,3.2,e),h.startZ+THREE.MathUtils.lerp(34,7,e),THREE.MathUtils.lerp(O.x,P.x,e),y+THREE.MathUtils.lerp(8,1.6,e),THREE.MathUtils.lerp(T,P.z-4,e),0,dt);break;
  case 'ceu-caminhada':{const a=cineSmooth((u-.35)/.4);cineCam(P.x+THREE.MathUtils.lerp(2.2,-1.4,a),y+THREE.MathUtils.lerp(1.5,2.3,a),P.z+THREE.MathUtils.lerp(-4.6,5.2,a),THREE.MathUtils.lerp(P.x,O.x,a),y+THREE.MathUtils.lerp(1.3,6,a),THREE.MathUtils.lerp(P.z,T,a),10,dt);break;}
  case 'ceu-chegada':cineCam(P.x+THREE.MathUtils.lerp(4.6,3.6,e),y+1.2,P.z-.6,P.x,y+.9,P.z-.4,0,dt);break;
  case 'ceu-trono':cineCam(P.x+THREE.MathUtils.lerp(.9,.7,e),y+THREE.MathUtils.lerp(.6,.8,e),P.z+THREE.MathUtils.lerp(3.2,2.4,e),O.x,y+6.5,T,0,dt);break;
  case 'ceu-asas':cineCam(P.x+1.9-e*.4,y+2.3,P.z+3.4-e*.3,P.x,y+1.5,P.z,0,dt);break;
  case 'ceu-retirada':{const a=THREE.MathUtils.lerp(.45,2.6,e);cineCam(P.x+Math.sin(a)*4.2,y+1.7,P.z+Math.cos(a)*4.2,P.x,y+1.2,P.z,0,dt);break;}
  case 'ceu-luz':{const a=2.6;cineCam(P.x+Math.sin(a)*4.2,y+1.7+e*3,P.z+Math.cos(a)*4.2,THREE.MathUtils.lerp(P.x,O.x,e),y+THREE.MathUtils.lerp(1.2,30,e),THREE.MathUtils.lerp(P.z,T,e),0,dt);break;}
 }
}
function updateAwakeningCine(dt,now){
 const A=cineAwake;if(!A)return;const P=player.position,yaw=A.yaw,fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw),u=cineU,G=guide.position,t=now*.001;
 if(cineAngelT>=0){cineAngelT+=dt;const k=cineSmooth(cineAngelT/1.3);guide.scale.setScalar(Math.max(.01,k));if(cineAngelT>1.6)cineAngelT=-1;}
 if(cineShot==='olhos-abrem'||cineShot==='maos'||cineShot==='olhar-em-volta'){
  // Primeira pessoa: a câmera fica nos olhos (osso da cabeça) e procura as mãos.
  const head=cineBone(/head$/i),hl=cineBone(/lefthand$/i),hr=cineBone(/righthand$/i);
  if(head)head.getWorldPosition(cineHead);else cineHead.set(P.x,P.y+1.7,P.z);
  const ex=cineHead.x+fx*.11,ey=cineHead.y+.07,ez=cineHead.z+fz*.11;
  let lx=ex+fx*3,ly=ey-.5,lz=ez+fz*3;
  if(hl&&hr&&cineShot!=='olhar-em-volta'){hl.getWorldPosition(cineHandL);hr.getWorldPosition(cineHandR);const w=cineShot==='maos'?1:cineSmooth((u-.15)/.5);lx=THREE.MathUtils.lerp(lx,(cineHandL.x+cineHandR.x)/2,w);ly=THREE.MathUtils.lerp(ly,(cineHandL.y+cineHandR.y)/2,w);lz=THREE.MathUtils.lerp(lz,(cineHandL.z+cineHandR.z)/2,w);}
  if(cineShot==='olhar-em-volta'){const off=Math.sin(u*Math.PI*2)*1.05*(1-u*.35),pitch=THREE.MathUtils.lerp(-.55,.05,cineSmooth(u/.25));lx=ex+Math.sin(yaw+off)*3;ly=ey+pitch*3;lz=ez+Math.cos(yaw+off)*3;}
  // Plano próximo maior: o capuz e o rosto do próprio herói ficam antes dele e não entram na imagem.
  if(camera.near!==.24){camera.near=.24;camera.updateProjectionMatrix();}
  cineCam(ex,ey+Math.sin(t*1.3)*.012,ez,lx,ly,lz,cineShot==='olhos-abrem'?0:6,dt);
  if(cineShot==='maos')cineEl('cine-lids').className='';
  return;
 }
 if(camera.near!==.1){camera.near=.1;camera.updateProjectionMatrix();}
 const mx=(P.x+G.x)/2,mz=(P.z+G.z)/2;
 if(cineShot==='anjo-chega'&&!cineSayWho){cineCam(P.x-fx*3.4+rx*2.6,P.y+1.7,P.z-fz*3.4+rz*2.6,G.x,G.y+1.3,G.z,0,dt);return;}
 if(cineSayWho==='heroi')cineCam(G.x+fx*1.9+rx*.7,G.y+1.8,G.z+fz*1.9+rz*.7,P.x,P.y+1.5,P.z,3,dt);
 else if(cineSayWho)cineCam(P.x-fx*1.9+rx*.75,P.y+1.75,P.z-fz*1.9+rz*.75,G.x,G.y+1.45,G.z,3,dt);
 else cineCam(mx+rx*5,P.y+1.8,mz+rz*5,mx,P.y+1.2,mz,2,dt);
}
function updateCine(dt,now){
 if(!cineActive)return;
 cineDirector.update(dt);if(!cineActive)return;
 if(swordMount)swordMount.visible=false;fpRig.visible=false;
 if(cineBlurT>=0){cineBlurT+=dt;const b=Math.max(0,7*(1-cineBlurT/5.5)),r=Math.round(b*4)/4;if(r!==cineBlurLast){cineBlurLast=r;canvas.style.filter=r>0?'blur('+r+'px)':'';}if(b<=0)cineBlurT=-1;}
 if(cineDirector.scene==='ceu')updateHeavenCine(dt,now);else if(cineDirector.scene==='despertar')updateAwakeningCine(dt,now);else updateStoryCine(dt,now);
}
/* Primeiro acesso (jogo novo): portão "toque para começar" — o toque libera o som e abre o prólogo no céu.
   Os modelos do céu carregam e os shaders compilam enquanto o portão está na tela. */
function openStartGate(){
 const gate=cineEl('start-gate'),go=cineEl('start-gate-go');if(!gate||!go){pendingAwakening=true;openGalaxyScreen();return;}
 menuGate=true;gate.hidden=false;go.disabled=true;go.textContent='CARREGANDO…';
 let ready=false;const enable=()=>{if(ready)return;ready=true;go.disabled=false;go.textContent='TOQUE PARA COMEÇAR';};
 prepareHeaven().then(enable,err=>{console.error(err);enable();});
 bindInstantTap(go,()=>{if(!ready||gate.hidden)return;gate.hidden=true;worldAudio.unlock();menuGate=false;clock.getDelta();startHeavenCine();});
}
if(menuGate){pendingAwakening=awakeningActive;awakeningActive=false;const skip=document.getElementById('skip-awakening');if(skip)skip.classList.add('hidden');if(questStep===0&&!awakeningSeen&&!heavenSeen){pendingAwakening=false;openStartGate();}else openGalaxyScreen();}
/* MOD 190 — corações e perfil. Corações vivem num registro próprio (regeneram com o jogo fechado). */
const HEART_STORE='seven-sins-hearts';
let heartState=(()=>{let raw=null;try{raw=JSON.parse(localStorage.getItem(HEART_STORE)||'null');}catch(_){}return normalizeHearts(raw);})();
function saveHearts(){try{localStorage.setItem(HEART_STORE,JSON.stringify(heartState));}catch(_){}}
let heartHudAt=0;
function updateHeartsHud(force){
 const now=Date.now();if(!force&&now<heartHudAt)return;heartHudAt=now+500;
 const before=heartState.hearts;heartState=tickHearts(heartState,now);if(heartState.hearts!==before)saveHearts();
 const n=document.getElementById('heart-count'),t=document.getElementById('heart-timer');if(n)n.textContent=String(heartState.hearts);
 if(t){const ms=msToNextHeart(heartState,now);t.textContent=ms?'+1 em '+formatTimer(ms):'';t.hidden=!ms;}
}
function spendHeart(reason){
 heartState=loseHeart(heartState);saveHearts();updateHeartsHud(true);
 showRewardPop('−1 ♥ · '+heartState.hearts+' restantes');
 if(!heartState.explained){heartState.explained=true;saveHearts();setTimeout(()=>{if(!dialogueOpen)showDialogue([{who:'Anjo-Guia',text:'Cada vez que você cai diante de um Bispo — ou num confronto de alto risco — um coração se apaga. Eles voltam sozinhos, um a cada três minutos.'},{who:'Anjo-Guia',text:'Sem corações, a mata continua aberta para você treinar e explorar. Só não desafie um Bispo de peito vazio: recupere ao menos um antes.'}]);},1200);}
}
// Perfil: retrato, nome (troca livre), nível, atributos, tempo de jogo e onde o progresso está salvo.
function tickPlayTime(dt,now){playSeconds+=dt;if(now>playSaveAt){playSaveAt=now+15000;save3DProgress();}}
function formatPlayTime(sec){const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60);return (h?h+' h ':'')+m+' min';}
function openProfile(){
 if(dialogueOpen||namePromptOpen||awakeningActive||prologueActive)return;
 const panel=document.getElementById('profile-panel');if(!panel)return;const p=levelProgress(playerXp);
 const img=document.getElementById('hero-portrait-img');document.getElementById('profile-portrait').style.backgroundImage=img&&img.src?'url('+img.src+')':'none';
 document.getElementById('profile-name').value=playerName||'';document.getElementById('profile-error').textContent='';
 document.getElementById('profile-stats').innerHTML=[['Nível',p.level+(p.max?' (máx.)':' · '+p.into+'/'+p.need+' XP')],['Vida',Math.ceil(playerHP)+' / '+playerMaxHP],['Mana',Math.round(playerMana)+' / '+MANA.max],['Corações',heartState.hearts+' / '+HEARTS.max],['Espada',SWORDS[equippedSword].name],['Inimigos vencidos',progressStats.kills],['Tempo de jogo',formatPlayTime(playSeconds)]].map(([k,v])=>'<div><span>'+k+'</span><strong>'+v+'</strong></div>').join('');
 panel.hidden=false;setPaused(false);
}
function closeProfile(){const panel=document.getElementById('profile-panel');if(panel)panel.hidden=true;}
(function initProfile(){
 const portrait=document.getElementById('hero-portrait');if(portrait){portrait.style.pointerEvents='auto';portrait.style.cursor='pointer';bindInstantTap(portrait,openProfile);}
 bindInstantTap(document.getElementById('profile-close'),closeProfile);
 bindInstantTap(document.getElementById('profile-save'),()=>{const input=document.getElementById('profile-name'),r=sanitizePlayerName(input.value);if(!r.ok){document.getElementById('profile-error').textContent=r.error;return;}playerName=r.name;save3DProgress();updateQuestHud();document.getElementById('profile-error').textContent='Nome guardado.';});
 updateHeartsHud(true);
})();
/* MOD 191 — moradores de verdade: Npc.glb (versão leve Npc-lod.glb, 33 mil vértices, mesma aparência e
   animações) substitui os clones do protagonista nas bancas; três moradores caminham pela vila. */
const VILLAGER_TINTS=[0xffffff,0xd9c6a8,0xb8c8d9,0xd6b0b0,0xc2d1b0,0xe0d0f0];
const villagerWalkers=[];
function loadVillagers(){
 new GLTFLoader().load('./Npc-lod2.glb?v=mod202',gltf=>{
  const clips=gltf.animations||[],byName=n=>clips.find(c=>c.name===n);
  const idleClips=[byName('_01a156a3_6952_769b_94bf_2cf0e9d19b46'),byName('Agree_Gesture'),byName('Alert')].filter(Boolean),walkClip=byName('Walking');
  const base=gltf.scene;base.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  const box=measureModelBounds(base),size=box.getSize(new THREE.Vector3()),scale=size.y>.01?(playerReferenceHeight*.98)/size.y:1;
  const make=(tintIndex)=>{const c=cloneSkinned(base),holder=new THREE.Group();c.scale.setScalar(scale);c.position.y=-box.min.y*scale;c.rotation.y=Math.PI;/* o Npc.glb olha para -Z */holder.add(c);
   const tint=new THREE.Color(VILLAGER_TINTS[tintIndex%VILLAGER_TINTS.length]);c.traverse(o=>{if(o.isMesh&&o.material){o.material=o.material.clone();o.material.color.multiply(tint);/* sem mapa de ambiente, metal vira preto: tecido e couro ficam foscos */o.material.metalness=0;o.material.metalnessMap=null;o.material.roughness=Math.max(.7,o.material.roughness||0);if(o.material.map){o.material.emissiveMap=o.material.map;o.material.emissive=new THREE.Color(0x6a5a50);o.material.emissiveIntensity=.8;}o.material.needsUpdate=true;}});
   return{holder,model:c,mixer:new THREE.AnimationMixer(c)};};
  // Bancas: troca os clones antigos por moradores, cada um com um gesto de repouso diferente.
  for(const mixer of villageNpcMixers.splice(0))mixer.stopAllAction();villageNpcBreathing.length=0;
  for(const root of vendorRoots)villageGroup.remove(root);vendorRoots.length=0;
  villageVendors.forEach((p,i)=>{const v=make(i+1);v.holder.position.set(p.x,groundHeightAt(p.x,p.z),p.z);v.holder.rotation.y=p.yaw;villageGroup.add(v.holder);vendorRoots.push(v.holder);
   const clip=idleClips[i%Math.max(1,idleClips.length)];if(clip){const a=v.mixer.clipAction(clip);a.play();a.time=i*.7;}villageNpcMixers.push(v.mixer);});
  // Moradores que circulam pela praça (rotas fechadas, longe das bancas e da trilha principal).
  const routes=[[[-20,-38],[-16,-33],[-8,-35],[-6,-41],[-12,-39]],[[-22,-50],[-15,-55],[-8,-52],[-13,-48]],[[-4,-52],[2,-49],[4,-44],[-2,-47]]];
  if(walkClip)routes.forEach((route,i)=>{const v=make(i+3);const a=v.mixer.clipAction(walkClip);a.play();a.time=i*.4;villageGroup.add(v.holder);villageNpcMixers.push(v.mixer);villagerWalkers.push({holder:v.holder,route,leg:0,t:Math.random(),speed:.95+i*.1,pause:0,idle:idleClips[0]?v.mixer.clipAction(idleClips[0]):null,walk:a});});
  window.SevenSinsVillagerReport={vendors:villageVendors.length,walkers:villagerWalkers.length,clips:clips.map(c=>c.name)};
 },undefined,err=>console.warn('Npc-lod.glb não carregou; mantendo os moradores antigos.',err));
}
function updateVillagers(dt){
 for(const w of villagerWalkers){
  if(w.pause>0){w.pause-=dt;if(w.pause<=0&&w.idle){w.idle.fadeOut(.3);w.walk.reset().fadeIn(.3).play();}continue;}
  const a=w.route[w.leg],b=w.route[(w.leg+1)%w.route.length],len=Math.hypot(b[0]-a[0],b[1]-a[1])||1;
  w.t+=dt*w.speed/len;
  if(w.t>=1){w.t=0;w.leg=(w.leg+1)%w.route.length;if(Math.random()<.35&&w.idle){w.pause=2+Math.random()*3;w.walk.fadeOut(.3);w.idle.reset().fadeIn(.3).play();}continue;}
  // Desvia do herói: espera em vez de atravessá-lo.
  const x=a[0]+(b[0]-a[0])*w.t,z=a[1]+(b[1]-a[1])*w.t;if(Math.hypot(x-player.position.x,z-player.position.z)<1.1){w.t-=dt*w.speed/len;continue;}
  w.holder.position.set(x,groundHeightAt(x,z),z);
  const yaw=Math.atan2(b[0]-a[0],b[1]-a[1]),d=Math.atan2(Math.sin(yaw-w.holder.rotation.y),Math.cos(yaw-w.holder.rotation.y));w.holder.rotation.y+=d*Math.min(1,dt*6);
 }
}
/* MOD 192 — missões opcionais da vila: ofertas nas bancas, itens no mundo, diário no quadro de missão. */
const SIDE_STORE='seven-sins-3d-side';
const sideState=(()=>{let raw=null;try{raw=JSON.parse(localStorage.getItem(SIDE_STORE)||'null');}catch(_){}return createSideState(raw);})();
function saveSide(){try{localStorage.setItem(SIDE_STORE,JSON.stringify(sideState));}catch(_){}}
const SIDE_ITEMS=[];
{
 const petal=new THREE.MeshStandardMaterial({color:0xcfe8ff,emissive:0x7fb8ff,emissiveIntensity:1.6,roughness:.5}),stem=mat(0x3d5a2e);
 const flowerSpots=[[-38,-20],[22,-30],[-44,-72],[30,-58],[-20,-108],[18,-128]];
 for(const [x0,z0] of flowerSpots){let x=x0,z=z0;for(let k=0;k<20&&!(dryGround(x,z)&&!treeObstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.radius+1.2));k++){x=x0+(Math.random()-.5)*8;z=z0+(Math.random()-.5)*8;}
  const g=new THREE.Group();g.position.set(x,groundHeightAt(x,z),z);
  const st=new THREE.Mesh(new THREE.CylinderGeometry(.015,.02,.42,4),stem);st.position.y=.21;g.add(st);
  for(let i=0;i<5;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.07,6,4),petal);const a=i/5*Math.PI*2;p.position.set(Math.cos(a)*.08,.45,Math.sin(a)*.08);p.scale.set(1,.45,1.6);p.rotation.y=-a;g.add(p);}
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:softDot,color:0x9fd0ff,transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));glow.position.y=.45;glow.scale.set(1.1,1.1,1);g.add(glow);
  g.visible=false;scene.add(g);SIDE_ITEMS.push({item:'flor',group:g,glow,taken:false});}
 const pend=new THREE.Group(),px=-14.2,pz=-84.5;pend.position.set(px,groundHeightAt(px,pz)+.05,pz);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.12,.025,6,16),new THREE.MeshStandardMaterial({color:0xe2b04a,metalness:.8,roughness:.25,emissive:0x5a3a08,emissiveIntensity:.8}));ring.rotation.x=Math.PI/2;pend.add(ring);
 const pglow=new THREE.Sprite(new THREE.SpriteMaterial({map:softDot,color:0xffd36a,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));pglow.position.y=.15;pglow.scale.set(.9,.9,1);pend.add(pglow);
 pend.visible=false;scene.add(pend);SIDE_ITEMS.push({item:'pingente',group:pend,glow:pglow,taken:false});
}
// Itens já entregues/coletados não reaparecem.
{const taken={flor:sideState.ervas.progress+(sideState.ervas.state==='done'?99:0),pingente:sideState.pingente.progress+(sideState.pingente.state==='done'?99:0)};for(const it of SIDE_ITEMS){if(taken[it.item]>0){it.taken=true;taken[it.item]--;}}}
function syncSideItems(){for(const it of SIDE_ITEMS){const q=SIDE_QUESTS.find(x=>x.goal.item===it.item);it.group.visible=!it.taken&&sideState[q.id].state==='active';}}
function refreshSideQuests(){refreshSide(sideState,{questStep,waystones:mapState.waystones.size});syncSideItems();const box=document.getElementById('side-lines');if(box){const lines=activeSideLines(sideState);box.innerHTML=lines.map(l=>'<div>◇ '+l+'</div>').join('');box.hidden=!lines.length;}}
function updateSideItems(dt,now){
 for(const it of SIDE_ITEMS){if(!it.group.visible)continue;it.glow.material.opacity=.5+Math.sin(now*.004+it.group.position.x)*.25;
  if(Math.hypot(it.group.position.x-player.position.x,it.group.position.z-player.position.z)<1.5){const q=collectSide(sideState,it.item);if(!q)continue;it.taken=true;it.group.visible=false;saveSide();worldAudio.reveal();showRewardPop(q.title+' · '+sideState[q.id].progress+'/'+q.goal.count);refreshSideQuests();}}
}
/** Conversa nas bancas: oferta, lembrete ou entrega da missão opcional daquele vendedor. */
function trySideQuestTalk(vendor){
 refreshSideQuests();const q=questForGiver(sideState,vendor.shortName);if(!q)return false;const s=sideState[q.id];
 if(s.state==='available'){showDialogue(q.offer,()=>{acceptSide(sideState,q.id);saveSide();refreshSideQuests();const toast=document.getElementById('quest-toast');if(toast){toast.textContent='MISSÃO OPCIONAL · '+q.title.toUpperCase();toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2600);}});return true;}
 if(s.state==='ready'){showDialogue(q.turnIn,()=>{const r=turnInSide(sideState,q.id);if(r){coins+=r.coins;gainXp(r.xp);showRewardPop('+'+r.coins+' MOEDAS · +'+r.xp+' XP');save3DProgress();updateQuestHud();}saveSide();refreshSideQuests();});return true;}
 showDialogue([{who:vendor.name,text:q.progressLine+'. ('+s.progress+'/'+q.goal.count+')'}]);return true;
}
sideReady=true;refreshSideQuests();
/* MOD 193 — peso no combate: números de dano, pausa de impacto (hit-stop), tremor de câmera e faíscas. */
let hitStopUntil=0,shakeAmt=0;const shakeOffset=new THREE.Vector3();
function hitStop(ms){hitStopUntil=Math.max(hitStopUntil,performance.now()+ms);}
function cameraShake(amount){shakeAmt=Math.min(.35,shakeAmt+amount);}
const dmgPool=[];
function damageNumber(worldPos,text,kind){
 let el=dmgPool.find(e=>!e.busy);if(!el){if(dmgPool.length>=10)return;const d=document.createElement('div');d.className='dmg-num';document.body.appendChild(d);el={el:d,busy:false};dmgPool.push(el);}
 el.busy=true;el.pos=worldPos.clone();el.t=0;el.el.textContent=text;el.el.className='dmg-num '+(kind||'');el.el.style.display='block';
}
const sparkGeo=new THREE.BufferGeometry(),SPARKS=24,sparkPos=new Float32Array(SPARKS*3),sparkVel=new Float32Array(SPARKS*3);let sparkLife=0;
sparkGeo.setAttribute('position',new THREE.BufferAttribute(sparkPos,3));
const sparks=new THREE.Points(sparkGeo,new THREE.PointsMaterial({map:softDot,color:0xffd88a,size:.2,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));sparks.frustumCulled=false;scene.add(sparks);
function burstSparks(pos,color){sparks.material.color.setHex(color||0xffd88a);sparkLife=1;for(let i=0;i<SPARKS;i++){sparkPos[i*3]=pos.x;sparkPos[i*3+1]=pos.y;sparkPos[i*3+2]=pos.z;const a=Math.random()*Math.PI*2,u=Math.random()*2-1,r=Math.sqrt(1-u*u),sp=2+Math.random()*3.5;sparkVel[i*3]=Math.cos(a)*r*sp;sparkVel[i*3+1]=Math.abs(u)*sp+1;sparkVel[i*3+2]=Math.sin(a)*r*sp;}sparkGeo.attributes.position.needsUpdate=true;}
function onEnemyDamaged(amount,crit){hitMarkT=.22;vibrate(crit?25:12);const p=enemy.position.clone();p.y+=1.4;damageNumber(p,String(amount),crit?'crit':'');burstSparks(p,crit?0xfff0b8:0xffc860);hitStop(crit?95:60);cameraShake(crit?.16:.08);}
function onPlayerDamaged(amount,blocked){vibrate(blocked?20:45);const p=player.position.clone();p.y+=1.6;damageNumber(p,'-'+amount,blocked?'blocked':'hurt');cameraShake(blocked?.06:.18);if(!blocked)flashVignette();}
function flashVignette(){const v=document.getElementById('hurt-vignette');if(!v)return;v.classList.remove('on');void v.offsetWidth;v.classList.add('on');}
function updateCombatJuice(dt){
 if(sparkLife>0){sparkLife=Math.max(0,sparkLife-dt*2.2);for(let i=0;i<SPARKS;i++){sparkVel[i*3+1]-=9*dt;sparkPos[i*3]+=sparkVel[i*3]*dt;sparkPos[i*3+1]+=sparkVel[i*3+1]*dt;sparkPos[i*3+2]+=sparkVel[i*3+2]*dt;}sparkGeo.attributes.position.needsUpdate=true;sparks.material.opacity=sparkLife;}
 const v=new THREE.Vector3();
 for(const d of dmgPool){if(!d.busy)continue;d.t+=dt;if(d.t>.9){d.busy=false;d.el.style.display='none';continue;}v.copy(d.pos);v.y+=d.t*1.1;v.project(camera);if(v.z>1){d.el.style.display='none';continue;}d.el.style.display='block';d.el.style.transform='translate('+((v.x*.5+.5)*innerWidth)+'px,'+((-v.y*.5+.5)*innerHeight)+'px) translate(-50%,-50%) scale('+(1+Math.max(0,.25-d.t)*1.6)+')';d.el.style.opacity=String(Math.min(1,(.9-d.t)*3));}
}
function applyCameraShake(dt){if(shakeAmt<=.001){shakeAmt=0;return;}shakeOffset.set((Math.random()-.5)*shakeAmt,(Math.random()-.5)*shakeAmt,(Math.random()-.5)*shakeAmt);camera.position.add(shakeOffset);shakeAmt*=Math.exp(-dt*14);}
/* MOD 194 — ajustes do jogador: sensibilidade da câmera, tamanho/opacidade dos controles, vibração,
   seta de objetivo e dicas. Salvos no aparelho; aplicados na hora. */
const SETTINGS_STORE='seven-sins-3d-settings';
const userSettings=Object.assign({autoCamera:true,sensitivity:1,controlScale:1,controlOpacity:1,vibration:true,arrow:true,hints:true},(()=>{try{return JSON.parse(localStorage.getItem(SETTINGS_STORE)||'{}');}catch(_){return{};}})());
function saveSettings(){try{localStorage.setItem(SETTINGS_STORE,JSON.stringify(userSettings));}catch(_){}}
function applySettings(){
 const r=document.documentElement.style;r.setProperty('--ctrl-scale',String(userSettings.controlScale));r.setProperty('--ctrl-opacity',String(userSettings.controlOpacity));
 document.body.classList.toggle('no-hints',!userSettings.hints);const arrow=document.getElementById('objective-arrow');if(arrow&&!userSettings.arrow)arrow.hidden=true;
}
function vibrate(ms){if(userSettings.vibration&&navigator.vibrate){try{navigator.vibrate(ms);}catch(_){}}}
(function initSettingsUi(){
 const panel=document.getElementById('graphics-panel-3d');if(!panel)return;
 const box=document.createElement('div');box.className='audio-settings';
 box.innerHTML='<h2>Controles</h2>'+
  '<label>Sensibilidade <input id="set-sens" type="range" min="40" max="200"></label>'+
  '<label>Tamanho dos botões <input id="set-size" type="range" min="75" max="130"></label>'+
  '<label>Opacidade dos botões <input id="set-opacity" type="range" min="35" max="100"></label>'+
  '<label class="audio-mute"><input id="set-vib" type="checkbox"> Vibração</label>'+
  '<label class="audio-mute"><input id="set-arrow" type="checkbox"> Seta de objetivo</label>'+'<label class="audio-mute"><input id="set-autocam" type="checkbox"> Câmera volta atrás do herói</label>'+
  '<label class="audio-mute"><input id="set-hints" type="checkbox"> Mostrar dicas na tela</label>'+
  '<label>Idioma <select id="set-lang"><option value="pt-BR">Português (Brasil)</option><option value="en" disabled>English (em breve)</option></select></label>';
 const close=panel.querySelector('.panel-close');panel.insertBefore(box,close||null);
 const q=id=>box.querySelector(id);
 q('#set-sens').value=Math.round(userSettings.sensitivity*100);q('#set-size').value=Math.round(userSettings.controlScale*100);q('#set-opacity').value=Math.round(userSettings.controlOpacity*100);
 q('#set-vib').checked=userSettings.vibration;q('#set-arrow').checked=userSettings.arrow;q('#set-hints').checked=userSettings.hints;q('#set-autocam').checked=userSettings.autoCamera;
 const bind=(id,key,fn)=>q(id).addEventListener(q(id).type==='checkbox'?'change':'input',()=>{userSettings[key]=fn(q(id));saveSettings();applySettings();});
 bind('#set-sens','sensitivity',e=>e.value/100);bind('#set-size','controlScale',e=>e.value/100);bind('#set-opacity','controlOpacity',e=>e.value/100);
 bind('#set-vib','vibration',e=>e.checked);bind('#set-arrow','arrow',e=>e.checked);bind('#set-hints','hints',e=>e.checked);bind('#set-autocam','autoCamera',e=>e.checked);
 applySettings();
})();
// Seta de objetivo: aponta para o marcador da missão quando ele está fora da tela, com a distância.
const _arrowV=new THREE.Vector3();
function updateObjectiveArrow(){
 const el=document.getElementById('objective-arrow');if(!el)return;
 const show=userSettings.arrow&&questMarker.visible!==false&&!dialogueOpen&&!prologueActive&&!awakeningActive&&!cineActive&&(questStep<15||isAct3Step(questStep)||isAct4Step(questStep)||questStep===ACT5N.step||isAct6Step(questStep))&&(!voidMode||inSewer||inVolcano||!!act3Void||inTower);
 if(!show){if(!el.hidden)el.hidden=true;return;}
 const mx=questMarker.position.x,mz=questMarker.position.z,dist=Math.hypot(mx-player.position.x,mz-player.position.z);
 _arrowV.set(mx,questMarker.position.y+1,mz).project(camera);
 const onScreen=_arrowV.z<1&&Math.abs(_arrowV.x)<.85&&Math.abs(_arrowV.y)<.8;
 if(onScreen||dist<4){el.hidden=true;return;}
 el.hidden=false;
 const ang=Math.atan2(mx-camera.position.x,mz-camera.position.z),rel=ang-(cameraYaw+Math.PI);
 el.style.setProperty('--rot',(-rel*180/Math.PI)+'deg');el.querySelector('span').textContent=Math.round(dist)+' m';
}
/* ===================== MOD 195 — ATO II · A DÍVIDA DOS VIVOS ===================== */
var ledgersFound=Array.isArray(saved3DProgress.ledgersFound)?saved3DProgress.ledgersFound.slice():[];
var vorgazhekRewardClaimed=!!saved3DProgress.vorgazhekRewardClaimed,bossRageAnnounced=false,bossComboHits=0,bossHitCounter=0;
const GUIDE_ACT2_SPOT={x:-21,z:-41.5};
// ---------- Garganta: barreira de escombros e correntes até o Ato II começar ----------
const gorgeGate=(()=>{
 const g=new THREE.Group(),gx=-70,gz=-59.5,y=groundHeightAt(gx,gz);g.position.set(gx,y,gz);g.rotation.y=Math.PI/2+.12;scene.add(g);
 const rock=mat(0x5d5a55),iron=new THREE.MeshStandardMaterial({color:0x3a3632,metalness:.6,roughness:.45});
 const boulders=[[-5,1.1,0,2.2],[-1.8,.9,.4,1.8],[1.6,1.2,-.3,2.4],[4.6,1,.2,2],[0,2.6,0,1.4],[-3.6,2.3,.2,1.2],[3.2,2.5,-.1,1.3]];
 for(const [x,yy,z,r] of boulders){const m=new THREE.Mesh(new THREE.DodecahedronGeometry(r,0),rock);m.position.set(x,yy,z);m.rotation.set(x,z,yy);m.scale.y=.8;m.castShadow=true;m.receiveShadow=true;g.add(m);}
 for(const side of [-1,1]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,4.4,6),iron);post.position.set(side*6.6,2.2,1.4);g.add(post);}
 const links=[];for(let i=0;i<22;i++){const l=new THREE.Mesh(new THREE.TorusGeometry(.2,.05,5,10),iron);const t=i/21;l.position.set(-6.6+t*13.2,3.4-Math.sin(t*Math.PI)*1.1,1.4);l.rotation.y=i%2?Math.PI/2:0;g.add(l);links.push(l);}
 const sign=makeMarketSign('GARGANTA DA DÍVIDA','#ffb0a0');sign.position.set(0,4.4,1.5);sign.scale.multiplyScalar(1.1);g.add(sign);
 const blockers=[];for(let i=-5;i<=5;i++)blockers.push({x:gx,z:gz+i*1.9,shape:'circle',radius:1.4,height:3});
 function sync(){const open=act2Started(questStep);g.visible=!open;for(const b of blockers){const idx=marketObstacles.indexOf(b);if(open&&idx>=0)marketObstacles.splice(idx,1);else if(!open&&idx<0)marketObstacles.push(b);}}
 return{group:g,sync,spot:{x:gx+2,z:gz}};
})();
// ---------- Distrito da Ferrugem: ruínas de comércio, mina, canal, altar do selo ----------
const district=(()=>{
 const root=new THREE.Group();scene.add(root);
 const brick=mat(0x6d5246),brickDark=mat(0x4a3a33),plaster=mat(0x8f8270),beam=mat(0x3d2c20),slate=mat(0x2f3138),rust=new THREE.MeshStandardMaterial({color:0x7a4a2a,metalness:.4,roughness:.7});
 const boxGeo=new THREE.BoxGeometry(1,1,1);
 const add=(m,x,y,z,sx,sy,sz,ry=0,rx=0,rz=0)=>{const o=new THREE.Mesh(boxGeo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(rx,ry,rz);o.castShadow=!terrainLowSpec;o.receiveShadow=true;root.add(o);return o;};
 // Casas e lojas em ruínas ao redor da praça: paredes incompletas, telhados desabados, vigas expostas.
 const lots=[[-138,-36,0],[-162,-36,.1],[-182,-56,Math.PI/2],[-128,-58,-Math.PI/2],[-178,-76,Math.PI/2+.1],[-145,-84,Math.PI],[-122,-74,-Math.PI/2+.15],[-188,-36,.2]];
 lots.forEach(([x,z,ry],i)=>{
  const g=new THREE.Group(),y=groundHeightAt(x,z);g.position.set(x,y,z);g.rotation.y=ry;root.add(g);
  const w=6+(i%3)*1.2,d=5+(i%2)*1.2,h=3.2+(i%3)*.6,mtl=i%2?brick:plaster;
  const wall=(lx,lz,sx,sz,hh)=>{const o=new THREE.Mesh(boxGeo,mtl);o.position.set(lx,hh/2,lz);o.scale.set(sx,hh,sz);o.castShadow=!terrainLowSpec;o.receiveShadow=true;g.add(o);};
  wall(0,-d/2,w,.4,h);wall(-w/2,0,.4,d,h*.85);wall(w/2,-d*.15,.4,d*.7,h*(.5+(i%2)*.3));wall(-w*.3,d/2,w*.4,.4,h*.6);
  const roof=new THREE.Mesh(boxGeo,slate);roof.position.set(w*.1,h*.55,0);roof.scale.set(w*.9,.18,d*.8);roof.rotation.set(.35+(i%3)*.1,0,-.4);g.add(roof);
  for(let k=0;k<3;k++){const b=new THREE.Mesh(boxGeo,beam);b.position.set(-w/2+1+k*1.8,h*.9,0);b.scale.set(.18,.18,d*1.05);b.rotation.z=(k-1)*.12;g.add(b);}
  marketObstacles.push({x,z,shape:'box',halfX:Math.max(w,d)*.5,halfZ:Math.max(w,d)*.5,height:h});
 });
 // Barracas de cobrança abandonadas e caixotes.
 for(const [x,z] of [[-142,-70],[-156,-52],[-166,-62],[-136,-62]]){const y=groundHeightAt(x,z);add(beam,x,y+.5,z,2.2,1,1);add(rust,x,y+1.05,z,2.4,.08,1.2,0,.08);}
 // Mina: arco escuro na encosta noroeste, trilhos e lanterna.
 const mx=-184,mz=-38,my=groundHeightAt(mx,mz);
 const mine=new THREE.Group();mine.position.set(mx,my,mz);mine.rotation.y=Math.PI*.78;root.add(mine);
 const mouth=new THREE.Mesh(new THREE.CircleGeometry(2.1,20,0,Math.PI),new THREE.MeshBasicMaterial({color:0x050404}));mouth.position.set(0,0,-.3);mine.add(mouth);
 for(const sx of [-1,1]){const p=new THREE.Mesh(boxGeo,beam);p.position.set(sx*2,1.6,0);p.scale.set(.35,3.2,.35);mine.add(p);}
 const lintel=new THREE.Mesh(boxGeo,beam);lintel.position.set(0,3.25,0);lintel.scale.set(4.8,.4,.45);mine.add(lintel);
 const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(5,1),mat(0x4e4a45));rock.position.set(0,2.4,-3.5);rock.scale.set(1.3,.9,.8);mine.add(rock);
 for(const sx of [-.5,.5]){const rail=new THREE.Mesh(boxGeo,rust);rail.position.set(sx,.06,4);rail.scale.set(.08,.08,9);mine.add(rail);}
 marketObstacles.push({x:mx-Math.sin(Math.PI*.78)*3.5,z:mz-Math.cos(Math.PI*.78)*3.5,shape:'circle',radius:4.6,height:5});
 // Canal de drenagem: água corrente numa fita que acompanha o leito escavado.
 const pts=DISTRICT_CANAL.map(p=>new THREE.Vector3(p[0],-.6,p[1])),curve=new THREE.CatmullRomCurve3(pts),N=60,pos=[],idx=[];
 for(let i=0;i<=N;i++){const c=curve.getPoint(i/N),t=curve.getTangent(i/N),sx=-t.z,sz=t.x,w=3.4;pos.push(c.x+sx*w,-.62,c.z+sz*w,c.x-sx*w,-.62,c.z-sz*w);if(i<N)idx.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);}
 const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));cg.setIndex(idx);cg.computeVertexNormals();
 const canal=new THREE.Mesh(cg,pondWater.material);canal.renderOrder=2;root.add(canal);
 // Altar do selo: pedestal e um selo de dívida flutuando, vermelho-ferrugem.
 const sp=DISTRICT_SPOTS.seal,sy=groundHeightAt(sp.x,sp.z);
 const altar=new THREE.Group();altar.position.set(sp.x,sy,sp.z);root.add(altar);
 const ped=new THREE.Mesh(new THREE.CylinderGeometry(1,1.3,1.1,8),brickDark);ped.position.y=.55;ped.castShadow=true;altar.add(ped);
 const sealMat=new THREE.MeshStandardMaterial({color:0x8a2a1a,emissive:0xb0301a,emissiveIntensity:1.6,metalness:.5,roughness:.35,side:THREE.DoubleSide});
 const seal=new THREE.Mesh(new THREE.TorusGeometry(.7,.09,8,32),sealMat);seal.position.y=2;altar.add(seal);
 const sealCore=new THREE.Mesh(new THREE.CircleGeometry(.6,24),new THREE.MeshBasicMaterial({color:0x2a0805,side:THREE.DoubleSide}));sealCore.position.y=2;altar.add(sealCore);
 const sealLight=new THREE.PointLight(0xff4a2a,1.6,12);sealLight.position.y=2.2;altar.add(sealLight);
 marketObstacles.push({x:sp.x,z:sp.z,shape:'circle',radius:1.25,height:1.1});
 // Livros-caixa: tomos com brilho dourado nos três locais da investigação.
 const ledgers=DISTRICT_SPOTS.ledgers.map((p,i)=>{const g=new THREE.Group();g.position.set(p.x,groundHeightAt(p.x,p.z)+.05,p.z);root.add(g);
  const book=new THREE.Mesh(new THREE.BoxGeometry(.55,.14,.42),new THREE.MeshStandardMaterial({color:0x4a1e14,emissive:0x3a0a04,emissiveIntensity:.6}));book.position.y=.6;g.add(book);
  const stand=new THREE.Mesh(new THREE.CylinderGeometry(.08,.14,.55,6),beam);stand.position.y=.28;g.add(stand);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:softDot,color:0xffc860,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));glow.position.y=.75;glow.scale.set(1.3,1.3,1);g.add(glow);
  return{group:g,book,glow,index:i};});
 // Lampiões da praça (luz quente sob a chuva).
 const lampLights=[];for(const [x,z] of [[-146,-56],[-156,-68],[-140,-68]]){const y=groundHeightAt(x,z);const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,2.6,5),beam);pole.position.set(x,y+1.3,z);root.add(pole);const l=new THREE.PointLight(0xffa860,1.1,12,1.6);l.position.set(x,y+2.6,z);root.add(l);lampLights.push(l);const glass=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),lanternMat);glass.position.copy(l.position);root.add(glass);}
 return{root,seal,sealLight,sealMat,altar,ledgers};
})();
// ---------- Chuva (shader: sem atualizar vértices na CPU) e relâmpagos ----------
const rain=(()=>{
 const N=terrainLowSpec?900:1800,pos=new Float32Array(N*2*3),seed=new Float32Array(N*2);
 for(let i=0;i<N;i++){const x=Math.random(),y=Math.random(),z=Math.random();for(let k=0;k<2;k++){pos[(i*2+k)*3]=x;pos[(i*2+k)*3+1]=y;pos[(i*2+k)*3+2]=z;seed[i*2+k]=k;}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('aEnd',new THREE.BufferAttribute(seed,1));
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,fog:false,uniforms:{uTime:{value:0},uCenter:{value:new THREE.Vector3()},uAlpha:{value:0}},
  vertexShader:'attribute float aEnd;uniform float uTime;uniform vec3 uCenter;varying float vA;void main(){vec3 p=position;float S=36.0;vec3 w;w.x=uCenter.x+(fract(p.x+uCenter.x/S*-1.0)-.5)*S;w.z=uCenter.z+(fract(p.z+uCenter.z/S*-1.0)-.5)*S;w.y=uCenter.y-6.0+fract(p.y-uTime*.9)*22.0;w.x+=aEnd*.12;w.y+=aEnd*.75;vA=aEnd;gl_Position=projectionMatrix*viewMatrix*vec4(w,1.0);}',
  fragmentShader:'uniform float uAlpha;varying float vA;void main(){gl_FragColor=vec4(.72,.78,.86,uAlpha*(.25+.55*vA));}'});
 const lines=new THREE.LineSegments(g,material);lines.frustumCulled=false;lines.visible=false;lines.renderOrder=4;scene.add(lines);
 let level=0,flash=0,nextBolt=6;
 return{update(dt,now,want){level+=((want?1:0)-level)*Math.min(1,dt*.6);lines.visible=level>.02;material.uniforms.uAlpha.value=level*.6;material.uniforms.uTime.value=now*.001;material.uniforms.uCenter.value.copy(camera.position);
   if(level>.5){nextBolt-=dt;if(nextBolt<=0){nextBolt=9+Math.random()*16;flash=1;worldAudio.thunder&&worldAudio.thunder();}}
   flash=Math.max(0,flash-dt*3.2);return{level,flash};},get level(){return level;}};
})();
// Ato II: dia e noite voltam a alternar (ciclo de 6 min), com a chuva escurecendo o céu.
let cycleT=0;
function updateAct2Weather(dt,now){
 const raining=false; // MOD 205: a cidade do vulcão tem cinzas, não chuva
 
 const r=rain.update(dt,now,raining);
 if(r.level>.01){scene.fog.color.lerp(new THREE.Color(0x4a5560),r.level*.4);scene.fog.far=Math.min(scene.fog.far,THREE.MathUtils.lerp(scene.fog.far,170,r.level));hemiLight.intensity*=1-r.level*.25;sunLight.intensity*=1-r.level*.45;
  if(r.flash>0){hemiLight.intensity+=r.flash*2.4;}}
 worldAudio.setRain&&worldAudio.setRain(r.level);
}
// ---------- Rigs extras (Bispos 2–4, Enemy3, Enemy4) usando o mesmo sistema de combate ----------
// Papéis conferidos por prévia visual e pelo movimento do quadril (ver ARQUITETURA.md).
const RIG_DEFS={
 bishop2:{file:'./Bispo2-lod.glb?v=mod196',height:1.45,roles:{idle:'Swim Idle',walk:'Walk',attack:'Sword Heavy Combo',cast:'Culturalibre Wizard With Sceptre 2',hit:'Hit Shoulder Right',death:'Hit Knockback'},inPlace:['attack','death']},
 bishop3:{file:'./Bispo3-lod.glb?v=mod196',height:1.5,roles:{idle:'Swim Idle',walk:'Walk Backward',attack:'Sword Light Combo',cast:'Sword Regular Combo',hit:'Lift Air Hit Left',death:'Lift Air Fall Root Motion'},inPlace:['attack','cast','death','walk'],timeScales:{walk:-1}},
 bishop4:{file:'./Bispo4-lod.glb?v=mod196',height:1.5,roles:{idle:'Idle Torch',walk:'Walk',attack:'Sword Aerial Combo',cast:'Sword Light Combo',hit:'Hit Chest',death:'Lift Air Fall Root Motion'},inPlace:['attack','cast','death']},
 enemy3:{file:'./Enemy3.glb?v=mod196',height:1.08,roles:{idle:'_01a15ab5_eeba_71ae_a438_b85a938940fc',walk:'Walking',run:'Running',attack:'Attack',cast:'Skill_03',dash:'_01a15ab0_deed_76a9_818c_47f5fc81ba40',death:'Dead'},inPlace:['attack','dash','death']},
 enemy4:{file:'./Enemy4.glb?v=mod196',height:1.12,roles:{idle:'_01a15ace_9e83_7761_a901_661f649d465a',walk:'Walking',run:'Running',attack:'Triple_Combo_Attack',cast:'Skill_03',dash:'_01a15ad2_c637_77d6_b5f4_1b96b9e71d4b',death:'Dead'},inPlace:['attack','dash','death']}
};
const rigs={},rigLoads={};let enemy1Rig=null,activeRig='enemy1';
/** MOD 210 — pista discreta de quem é a pessoa misteriosa (documento mestre): mechas vermelhas escapam do capuz.
 *  Presas ao osso da cabeça, seguem as animações e entram nos clones. */
function addSandraClue(model){
 model.updateMatrixWorld(true);const head=model.getObjectByName('Head'),front=model.getObjectByName('headfront');if(!head||!front)return;
 const h=head.getWorldPosition(new THREE.Vector3()),f=front.getWorldPosition(new THREE.Vector3()),S=h.distanceTo(f)/.115,fw=f.clone().sub(h).setY(0).normalize(),right=new THREE.Vector3().crossVectors(fw,new THREE.Vector3(0,1,0)).normalize();
 const mat=new THREE.MeshStandardMaterial({color:0x5a0410,emissive:0x1a0003,roughness:.5});
 for(const [side,len,dx,w] of [[-1,.15,.042,.01],[-1,.11,.03,.007],[1,.13,.04,.009]]){// mechas dentro do capuz, emoldurando o rosto escuro
  const r0=h.clone().addScaledVector(fw,.112*S).addScaledVector(right,side*dx*S).add(new THREE.Vector3(0,.035*S,0));
  const curve=new THREE.CatmullRomCurve3([0,.25,.5,.75,1].map(t=>r0.clone().addScaledVector(fw,(.012*t+.004*Math.sin(t*9))*S).addScaledVector(right,side*(.012*t+.006*Math.sin(t*7))*S).add(new THREE.Vector3(0,-len*S*t,0))));
  const TS=14,RS=5,geo=new THREE.TubeGeometry(curve,TS,w*S,RS,false),pos=geo.attributes.position,v=new THREE.Vector3();
  for(let a=0;a<=TS;a++){const c=curve.getPointAt(a/TS),k=1-.85*a/TS;for(let b=0;b<=RS;b++){const n=a*(RS+1)+b;v.fromBufferAttribute(pos,n).sub(c);const along=v.dot(right),depth=v.dot(fw);v.copy(c).addScaledVector(right,along*k*1.5).addScaledVector(fw,depth*k*.45).add(new THREE.Vector3(0,v.y-c.y,0).multiplyScalar(0));pos.setXYZ(n,v.x,c.y+(pos.getY(n)-c.y)*k,v.z);}}
  geo.computeVertexNormals();const m=new THREE.Mesh(geo,mat);head.attach(m);m.castShadow=false;
 }
}
function loadRig(name){
 if(rigLoads[name])return rigLoads[name];const def=RIG_DEFS[name];
 rigLoads[name]=new Promise((resolve,reject)=>rigExtraClips(def).then(extra=>new GLTFLoader().load(def.file,gltf=>{
  const model=gltf.scene,clips=(gltf.animations||[]).concat(extra),by=n=>clips.find(c=>c.name===n);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;for(const m of [].concat(o.material))if(m&&!enemyMaterials.includes(m)){m.metalness=Math.min(m.metalness||0,.35);enemyMaterials.push(m);}}});
  const box=measureModelBounds(model),size=box.getSize(new THREE.Vector3()),scale=size.y>.01?(playerReferenceHeight*def.height)/size.y:1;
  model.scale.setScalar(scale);model.position.set(0,-box.min.y*scale,0);model.visible=false;enemyModelRoot.add(model);
  if(name==='rival')addSandraClue(model);
  const mixer=new THREE.AnimationMixer(model),actions={};
  const inPlace=clip=>{const c=clip.clone();for(const t of c.tracks){if(!/hips[^.]*\.position$/i.test(t.name))continue;const v=t.values;for(let i=3;i<v.length;i+=3){v[i]=v[0];v[i+2]=v[2];}}return c;};
  for(const [role,clipName] of Object.entries(def.roles)){const c=by(clipName);if(c)actions[role]=mixer.clipAction((def.inPlace||[]).includes(role)?inPlace(c):c);}
  rigs[name]={model,mixer,actions,hasDeath:!!actions.death,timeScales:def.timeScales||null};resolve(rigs[name]);
 },undefined,err=>{console.error(def.file+' não carregou.',err);delete rigLoads[name];reject(err);})));
 return rigLoads[name];
}
/** MOD 206 — clipes emprestados de outro arquivo com o mesmo esqueleto Mixamo (o Anjo usa os do herói). Sem o
    deslocamento do quadril, para o corpo não flutuar nem afundar com as proporções diferentes. */
function rigExtraClips(def){if(!def.extra)return Promise.resolve([]);return new Promise(res=>new GLTFLoader().load(def.extra,g=>res((g.animations||[]).map(c=>{const k=c.clone();k.tracks=k.tracks.filter(t=>!/hips[^.]*\.position$/i.test(t.name));return k;})),undefined,()=>res([])));}
function useRig(name){
 if(activeRig==='enemy1'&&enemyModel&&!Object.values(rigs).some(r=>r.model===enemyModel))enemy1Rig={model:enemyModel,mixer:enemyMixer,actions:enemyActions,hasDeath:enemyHasDeathClip};
 const rig=name==='enemy1'?enemy1Rig:rigs[name];if(!rig)return false;if(activeRig===name&&enemyModel===rig.model)return true;
 if(enemyModel)enemyModel.visible=false;if(enemyCurrentAction)enemyCurrentAction.stop();
 enemyModel=rig.model;enemyModel.visible=true;enemyMixer=rig.mixer;enemyActions=rig.actions;enemyHasDeathClip=rig.hasDeath;rigTimeScales=rig.timeScales||null;enemyCurrentAction=null;enemyCurrentRole='';enemySprite.visible=false;enemyModelRoot.visible=true;activeRig=name;return true;
}
/* MOD 204 — Marco 2: Ato I como no roteiro original (docs/roteiro/M2-ATO1.md). As cenas (act1-flow.js) rodam no
   mesmo diretor do prólogo, com câmera guiada pelos atores. Lutas em grupo usam o inimigo normal um por vez, com os
   outros visíveis esperando a vez (o motor de combate é de um adversário). O esgoto é uma área abaixo do mundo
   (tema "sewer", layout em sewer3d.js), como as dimensões. */
var packFinishing=false,act1Sub=saved3DProgress.act1Sub||0,storyScene=null,pack=null,inSewer=false,sewerArena=null,storyMove=null,storyFx=[],act1Props=null,act1Night=false,act1Lock=false,hordeClones=[],guideFighting=false;
const STORY_EYE={hero:1.5,guide:2.1,enemy:1.35,vendor:1.5,cage:.7,victim:.9,feeding:.9,cell:1.2,hole:0,massacre:1,village:2};
const SPEAKER_ACTOR={[SPEAKERS.hero]:'hero',[SPEAKERS.guide]:'guide',[SPEAKERS.vendor]:'vendor',[SPEAKERS.follower]:'enemy',[SPEAKERS.demon]:'enemy',[SPEAKERS.child]:'cage',[SPEAKERS.warden]:'enemy',[SPEAKERS.valerio]:'enemy',[SPEAKERS.victim]:'victim'};
const storyAnchors={};
const _sa=new THREE.Vector3(),_sb=new THREE.Vector3(),_sc=new THREE.Vector3();
function sewerLocal(p){return{x:p.x+DIMENSIONS.esgoto.center.x,z:p.z+DIMENSIONS.esgoto.center.z};}
function actorObj(key){if(key==='hero')return player;if(key==='guide')return guide;if(key==='enemy')return enemy.visible?enemy:(pack&&pack.clones.find(c=>c&&c.holder.visible)||{}).holder||enemy;if(key==='vendor')return vendorRoots[2]||null;return null;}
function actorPos(key,out){
 const a=storyAnchors[key];if(a){out.set(a.x,a.y!==undefined?a.y:terrainHeightAt(a.x,a.z),a.z);return out;}
 const o=actorObj(key);if(o){o.getWorldPosition(out);return out;}return out.copy(player.position);
}
function actorYaw(key){if(key==='hero')return playerYaw;const a=storyAnchors[key];if(a)return a.yaw||0;const o=actorObj(key);return o?o.rotation.y:0;}
/** Ponto no referencial do ator: x = direita, y = cima, z = frente. */
function actorLocal(key,off,out){actorPos(key,out);const yaw=actorYaw(key),s=Math.sin(yaw),c=Math.cos(yaw);out.x+=off[0]*c+off[2]*s;out.y+=off[1];out.z+=-off[0]*s+off[2]*c;return out;}
function faceTo(obj,target){if(!obj)return;const dx=target.x-obj.position.x,dz=target.z-obj.position.z;if(Math.hypot(dx,dz)<.01)return;const yaw=Math.atan2(dx,dz);if(obj===player){playerYaw=yaw;player.rotation.y=yaw;}else obj.rotation.y=yaw;}
function playStory(id,steps,opts){
 opts=opts||{};storyScene={id,focus:opts.focus||'guide',done:opts.done||null,two:!!opts.two,side:opts.side||1};
 if(opts.face){const f=actorPos(opts.face,_sa);faceTo(player,f);const o=actorObj(opts.face);if(o&&o!==player&&o!==enemy)faceTo(o,player.position);}
 cineBegin();cineDirector.play(id,steps);
}
function endStory(skipped){
 const s=storyScene;storyScene=null;storyMove=null;
 if(skipped)for(const fx of storyFx.splice(0))if(fx.finish)fx.finish();
 cineEnd();if(s&&s.done)s.done(skipped);
}
function storyTitle(kicker,title){const el=cineEl('cine-title');el.querySelector('span').textContent=kicker||'';el.querySelector('strong').textContent=title||'';el.classList.add('show');setTimeout(()=>el.classList.remove('show'),4200);}
function storyFlash(color,ms){const el=cineEl('cine-fade');el.classList.toggle('white',color==='white');el.style.background=color&&color!=='white'?color:'';el.style.transition='opacity .08s';el.style.opacity='.85';setTimeout(()=>{el.style.transition='opacity '+(ms/1000)+'s ease';el.style.opacity='0';setTimeout(()=>{el.style.background='';},ms+50);},90);}
/** Puxa a câmera para perto do alvo se houver parede/casa/banca no caminho (colisão 2D do mundo ou do esgoto). */
function storyCam(px,py,pz,lx,ly,lz,follow,dt,high){
 if(!high){const dx=px-lx,dz=pz-lz,len=Math.hypot(dx,dz);if(len>.6)for(let i=2;i<=14;i++){const f=i/14;if(blockedAt(lx+dx*f,lz+dz*f)){const k=Math.max(.3/len,(i-1.6)/14);px=lx+dx*k;pz=lz+dz*k;break;}}}
 cineCam(px,py,pz,lx,ly,lz,follow,dt);
}
/** Câmera das cenas da história: falas em "por cima do ombro" de quem escuta; planos pelos argumentos do passo. */
function updateStoryCine(dt,now){
 const st=cineDirector.step,t=now*.001;
 if(storyMove){storyMove.t+=dt;const k=Math.min(1,storyMove.t/storyMove.dur),e=k*k*(3-2*k);player.position.x=THREE.MathUtils.lerp(storyMove.from.x,storyMove.to.x,e);player.position.z=THREE.MathUtils.lerp(storyMove.from.z,storyMove.to.z,e);faceTo(player,storyMove.to);if(k>=1){const cb=storyMove.done;storyMove=null;if(cb)cb();}}
 for(let i=storyFx.length-1;i>=0;i--){const fx=storyFx[i];fx.t+=dt;if(fx.tick(fx.t,dt)===false){storyFx.splice(i,1);}}
 if(st&&st.type==='say'){
  const S=st.actor||SPEAKER_ACTOR[st.who]||'hero',L=S==='hero'?storyScene&&storyScene.focus:'hero';
  const sp=actorPos(S,_sa),lp=actorPos(L||'hero',_sb);let dx=sp.x-lp.x,dz=sp.z-lp.z;const d=Math.hypot(dx,dz);
  if(!L||L===S||d<.4){const yaw=actorYaw(S);dx=Math.sin(yaw);dz=Math.cos(yaw);storyCam(sp.x+dx*2.4,sp.y+STORY_EYE[S]+.1,sp.z+dz*2.4,sp.x,sp.y+STORY_EYE[S]-.1,sp.z,3,dt);return;}
  dx/=d;dz/=d;const rx=dz,rz=-dx,back=Math.min(2.2,1.2+d*.18);
  // O Anjo é alto e tem asas: com ele na cena, plano lateral dos dois (sem câmera atrás das asas).
  if(L==='guide'||S==='guide'||(storyScene&&storyScene.two)){const mx=(sp.x+lp.x)/2,mz=(sp.z+lp.z)/2,my=(sp.y+lp.y)/2,side=storyScene&&storyScene.side||1,dist=Math.max(3.4,d*1.25);storyCam(mx+rx*side*dist+dx*.6,my+1.75,mz+rz*side*dist+dz*.6,mx+dx*.5,my+1.35,mz+dz*.5,3,dt);return;}
  storyCam(lp.x-dx*back+rx*.75,lp.y+(STORY_EYE[L]||1.5)+.25,lp.z-dz*back+rz*.75,sp.x,sp.y+(STORY_EYE[S]||1.4)-.05,sp.z,3,dt);return;
 }
 if(!st||st.type!=='shot'){cineCam(cinePos.x,cinePos.y,cinePos.z,cineLook.x,cineLook.y,cineLook.z,0,dt);return;}
 const a=st.args||{},u=cineU,e=cineSmooth(u),L3=THREE.MathUtils.lerp;
 if(a.cam==='crane'){const o=actorPos(a.anchor,_sc),f=a.from,to=a.to,lf=a.lookFrom,lt=a.lookTo;cineCam(o.x+L3(f[0],to[0],e),o.y+L3(f[1],to[1],e),o.z+L3(f[2],to[2],e),o.x+L3(lf[0],lt[0],e),o.y+L3(lf[1],lt[1],e),o.z+L3(lf[2],lt[2],e),0,dt);return;}
 if(a.cam==='two'){const p=actorPos(a.a,_sa),q=actorPos(a.b,_sb);let dx=q.x-p.x,dz=q.z-p.z;const d=Math.hypot(dx,dz)||1;dx/=d;dz/=d;const side=a.side||1,dist=(a.dist||4)+e*.4;const mx=(p.x+q.x)/2,mz=(p.z+q.z)/2,my=(p.y+q.y)/2;storyCam(mx+dz*side*dist,my+1.6,mz-dx*side*dist,mx,my+1.15,mz,0,dt);return;}
 if(a.cam==='look'||a.cam==='follow'){const p=actorLocal(a.on,a.off,_sa),q=actorLocal(a.on,a.at||[0,1,0],_sb);storyCam(p.x,p.y,p.z,q.x,q.y,q.z,a.cam==='follow'?5:0,dt,a.off[1]>4);return;}
 if(a.cam==='orbit'){const c=actorPos(a.on,_sa),yaw=actorYaw(a.on)+L3(a.from||0,a.to||1,e);storyCam(c.x+Math.sin(yaw)*a.r,c.y+a.h,c.z+Math.cos(yaw)*a.r,c.x,c.y+.6,c.z,0,dt);return;}
 cineCam(cinePos.x,cinePos.y,cinePos.z,cineLook.x,cineLook.y,cineLook.z,0,dt);
}
/* ---------- Inimigos em grupo: um luta, os outros esperam visíveis ---------- */
RIG_DEFS.enemy2={file:'./Enemy2-rig.glb?v=mod204',height:1.12,roles:{idle:'_01a15ab5_eeba_71ae_a438_b85a938940fc',walk:'Walking',run:'Running',attack:'Skill_03',cast:'Triple_Combo_Attack',dash:'_01a15ab0_deed_76a9_818c_47f5fc81ba40',death:'Dead'},inPlace:['attack','cast','dash','death']};
function rigSource(name){if(name==='enemy1'){if(enemy1Rig)return enemy1Rig;if(activeRig==='enemy1'&&enemyModel)return{model:enemyModel,actions:enemyActions};return null;}return rigs[name]||null;}
function makeFoeClone(rigName,spot,opts){
 const src=rigSource(rigName);if(!src||!src.model)return null;
 const c=cloneSkinned(src.model);c.visible=true;c.traverse(o=>{if(o.isMesh){o.castShadow=false;o.frustumCulled=false;}});
 const holder=new THREE.Group(),inner=new THREE.Group();inner.scale.copy(enemyModelRoot.scale);inner.add(c);holder.add(inner);
 holder.position.set(spot.x,terrainHeightAt(spot.x,spot.z),spot.z);if(opts&&opts.scale)holder.scale.setScalar(opts.scale);scene.add(holder);
 const mixer=new THREE.AnimationMixer(c),role=(opts&&opts.role)||'idle',act=src.actions[role]||src.actions.idle;
 if(act){const a=mixer.clipAction(act.getClip());a.play();a.time=Math.random()*2;if(opts&&opts.timeScale)a.timeScale=opts.timeScale;}
 return{holder,mixer,spot,approach:opts&&opts.approach};
}
function disposeClone(c){if(!c)return;c.mixer.stopAllAction();scene.remove(c.holder);}
/** Começa uma luta em grupo. spots: onde cada um espera; o primeiro (ou o mais perto) luta. */
function startPack(o){
 clearPack();pendingRelease=false;const rigName=o.rig||'enemy1';
 const go=()=>{
  pack={...o,rig:rigName,index:0,clones:o.spots.map(s=>makeFoeClone(rigName,s,o.cloneOpts)),active:false};
  if(!o.hold||pendingRelease){pendingRelease=false;packNext();}
 };
 if(rigName!=='enemy1'&&!rigs[rigName])loadRig(rigName).then(go,()=>{console.warn('Rig '+rigName+' não carregou; usando Enemy1.');o.rig='enemy1';startPack(o);});else go();
}
var pendingRelease=false;
function releasePack(){if(pack&&!pack.active)packNext();else pendingRelease=true;}
function packNext(){
 if(!pack||pack.index>=pack.spots.length)return;const i=pack.index,c=pack.clones[i],spot=c?{x:c.holder.position.x,z:c.holder.position.z}:pack.spots[i];
 if(c){disposeClone(c);pack.clones[i]=null;}
 enemy.visible=false;useRig(pack.rig);revealEncounter(pack.profile,spot,pack.hp,pack.intro||'');
 if(pack.scale)enemy.scale.setScalar(pack.scale);
 if(inSewer){const cp=sewerLocal(sewerCheckpoint(questStep,act1Sub));checkpointX=cp.x;checkpointZ=cp.z;}
 pack.active=true;syncEnemyLabel();
}
function clearPack(){if(!pack)return;for(const c of pack.clones)disposeClone(c);pack=null;}
/** Chamado quando o inimigo ativo do grupo cai. Retorna true se o grupo tratou a queda. */
function packHandleDefeat(){
 if(!pack||!pack.active)return false;
 registerEnemyDefeat(pack.profile);enemy.visible=false;enemy.scale.setScalar(1);enemyAttackCooldown=0;enemyAttackResolved=true;enemyDashRemaining=0;wardenFanPending=false;if(wardenRing)wardenRing.visible=false;
 pack.index++;pack.active=false;if(pack.onEach)pack.onEach(pack.index);
 if(pack.index>=pack.spots.length){const done=pack.onDone;pack=null;packFinishing=true;useRig('enemy1');encounterProfile='captor';enemyHP=100;enemyMaxHP=100;enemyAlive=true;setTimeout(()=>{packFinishing=false;if(done)done();},700);return true;}
 if(pack.between){const b=pack.between;pack.between=null;setTimeout(()=>b(()=>packNext()),900);}else setTimeout(packNext,650);
 return true;
}
function updatePack(dt){
 const lists=[pack?pack.clones:[],hordeClones];
 for(const list of lists)for(const c of list){if(!c)continue;c.mixer.update(dt);const h=c.holder;if(!h.visible)continue;
  const tx=c.lookAt||player.position;h.rotation.y=Math.atan2(tx.x-h.position.x,tx.z-h.position.z);
  if(c.approach){const d=Math.hypot(tx.x-h.position.x,tx.z-h.position.z);if(d>c.approach){const s=Math.min(dt*1.1,d-c.approach);h.position.x+=(tx.x-h.position.x)/d*s;h.position.z+=(tx.z-h.position.z)/d*s;}}
  h.position.y=terrainHeightAt(h.position.x,h.position.z);}
}
/* ---------- Cenários do Ato I no mundo: vila arruinada, gaiolas, massacre e entrada do esgoto ---------- */
const VILLAGE_KIT=[
 {k:'CasaA',x:-6,z:-16},{k:'CasaB',x:2,z:-17.5},{k:'CasaC',x:10,z:-14},{k:'CasaA',x:-8,z:15},{k:'CasaC',x:1,z:17.5},{k:'CasaB',x:9.5,z:14.5},
 {k:'CasaB',x:15.5,z:-8.5},{k:'CasaA',x:15,z:9},{k:'CasaC',x:-16,z:-9.5},{k:'CasaB',x:-15.5,z:9.5},
 {k:'CasaA',x:-7.6,z:-4.4},{k:'CasaC',x:.8,z:9.3},{k:'CasaB',x:-10.8,z:3.8},{k:'CasaA',x:9,z:-6.9},{k:'CasaB',x:2.2,z:-11.6}
].map(h=>({...h,x:VILLAGE_CENTER.x+h.x,z:VILLAGE_CENTER.z+h.z}));
const VILLAGE_PROPS=[
 {k:'Poco',x:-1.4,z:-.6},{k:'Barraca',x:-4.4,z:-8.5,yaw:.3},{k:'Barraca',x:6.2,z:6.4,yaw:-2.4},{k:'CorpoCoberto',x:-12.3,z:-1.2,yaw:1.2},{k:'CorpoCoberto',x:12.5,z:2.6,yaw:-.4},{k:'CorpoCoberto',x:-3.6,z:12.6,yaw:.2},
 {k:'Barril',x:-5.6,z:-12.4},{k:'Barril',x:5.2,z:-11.8},{k:'Caixote',x:-9.6,z:7.6},{k:'Caixote',x:11.8,z:-3.4},{k:'Cerca',x:-14,z:-1.5,yaw:1.57},{k:'Cerca',x:13.6,z:-1.8,yaw:1.57},{k:'Barril',x:6.6,z:11.4}
].map(p=>({...p,x:VILLAGE_CENTER.x+p.x,z:VILLAGE_CENTER.z+p.z}));
const BEGGARS=[{x:-5.2,z:-13.6,yaw:0},{x:4.4,z:14.8,yaw:Math.PI},{x:13.2,z:-6.4,yaw:-1.5},{x:-13.4,z:7.4,yaw:1.5}].map(p=>({...p,x:VILLAGE_CENTER.x+p.x,z:VILLAGE_CENTER.z+p.z}));
for(const h of VILLAGE_KIT){h.yaw=Math.atan2(VILLAGE_CENTER.x-h.x,VILLAGE_CENTER.z-h.z);marketObstacles.push({x:h.x,z:h.z,radius:h.k==='CasaC'?2.3:2.55,height:3});}
for(const p of VILLAGE_PROPS)if(p.k==='Poco'||p.k==='Barraca')marketObstacles.push({x:p.x,z:p.z,radius:p.k==='Poco'?1.2:1.3,height:2});
function buildAct1Props(){
 if(act1Props)return act1Props;act1Props={kit:null,poses:null,flies:null,door:null,victims:[],kids:[]};
 const L=new GLTFLoader();
 L.load('./VilaKit.glb?v=mod204',gltf=>{
  const kit={};for(const c of gltf.scene.children)kit[c.name]=c;act1Props.kit=kit;
  const place=(p,shadow)=>{const src=kit[p.k];if(!src)return;const o=src.clone();o.position.set(p.x,groundHeightAt(p.x,p.z),p.z);o.rotation.y=p.yaw||0;o.traverse(m=>{if(m.isMesh){m.castShadow=!!shadow;m.receiveShadow=true;}});villageGroup.add(o);};
  for(const h of VILLAGE_KIT)place(h,true);for(const p of VILLAGE_PROPS)place(p,false);
  buildSewerDoor();
 },undefined,e=>console.warn('VilaKit.glb não carregou.',e));
 L.load('./MoradoresPose.glb?v=mod204',gltf=>{
  const poses={};for(const c of gltf.scene.children)poses[c.name]=c;act1Props.poses=poses;
  const tint=m=>{m.traverse(o=>{if(o.isMesh&&o.material){o.material=o.material.clone();o.material.metalness=0;o.material.roughness=Math.max(.75,o.material.roughness||0);if(o.material.map){o.material.emissiveMap=o.material.map;o.material.emissive=new THREE.Color(0x4a3e36);o.material.emissiveIntensity=.7;}o.castShadow=false;}});return m;};
  for(const b of BEGGARS){const m=tint(poses.MendigoSentado.clone());m.position.set(b.x,groundHeightAt(b.x,b.z),b.z);m.rotation.y=b.yaw;villageGroup.add(m);}
  // As crianças presas (sentadas, abraçando os joelhos) — são elas que se transformam.
  for(const s of CAGE_SPOTS){const m=tint(poses.MendigoSentado.clone());m.scale.setScalar(.56);m.position.set(s.x,groundHeightAt(s.x,s.z)+.08,s.z);m.rotation.y=Math.PI;scene.add(m);act1Props.kids.push(m);}
  syncAct1World();
 },undefined,e=>console.warn('MoradoresPose.glb não carregou.',e));
 // Moscas sobre a comida podre e os corpos (uma chamada de desenho).
 const spots=VILLAGE_PROPS.filter(p=>p.k==='CorpoCoberto'||p.k==='Barraca').concat(marketStalls.map(s=>({x:s.x,z:s.z})));
 const N=spots.length*7,pos=new Float32Array(N*3),seed=[];for(let i=0;i<N;i++){const s=spots[i%spots.length];seed.push({s,a:Math.random()*6.28,r:.25+Math.random()*.5,h:.5+Math.random()*.9,v:2+Math.random()*3});}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const flies=new THREE.Points(geo,new THREE.PointsMaterial({color:0x111111,size:.045}));flies.frustumCulled=false;villageGroup.add(flies);
 act1Props.flies={geo,seed};
 return act1Props;
}
function buildSewerDoor(){
 // Entrada do esgoto na encosta: arco de pedra com grade arrombada e escuridão dentro.
 const g=new THREE.Group();g.position.set(SEWER_DOOR.x,groundHeightAt(SEWER_DOOR.x,SEWER_DOOR.z),SEWER_DOOR.z);g.rotation.y=SEWER_DOOR.yaw;scene.add(g);
 const stone=mat(0x55524a),dark=new THREE.MeshBasicMaterial({color:0x020202});
 const rocks=[];for(let i=0;i<9;i++){const a=(i/8)*Math.PI;rocks.push([Math.cos(a)*2.2,.3+Math.sin(a)*2.3,-.3]);}
 for(const [x,y,z] of rocks){const r=new THREE.Mesh(new THREE.DodecahedronGeometry(.62,0),stone);r.position.set(x,y,z);r.rotation.set(x,y,z);r.castShadow=true;g.add(r);}
 for(let i=0;i<7;i++){const r=new THREE.Mesh(new THREE.DodecahedronGeometry(1.4+Math.random(),0),stone);r.position.set((Math.random()-.5)*7,1+Math.random()*2.4,-1.6-Math.random()*1.5);r.castShadow=true;g.add(r);}
 const hole=new THREE.Mesh(new THREE.CircleGeometry(1.8,20,0,Math.PI),dark);hole.position.set(0,.3,-.2);g.add(hole);
 const holeLow=new THREE.Mesh(new THREE.PlaneGeometry(3.6,.32),dark);holeLow.position.set(0,.16,-.2);g.add(holeLow);
 const iron=mat(0x2a2622);for(let i=0;i<5;i++){const bar=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,2.2,5),iron);bar.position.set(-1.6+i*.35,.35,.6+i*.08);bar.rotation.set(1.35,0,.25*i);g.add(bar);}
 act1Props.door=g;marketObstacles.push({x:SEWER_DOOR.x-Math.sin(SEWER_DOOR.yaw)*1.8,z:SEWER_DOOR.z-Math.cos(SEWER_DOOR.yaw)*1.8,radius:2.2,height:3});
 syncAct1World();
}
function sewerDoorFront(){return{x:SEWER_DOOR.x+Math.sin(SEWER_DOOR.yaw)*1.4,z:SEWER_DOOR.z+Math.cos(SEWER_DOOR.yaw)*1.4};}
/** Mostra/esconde o que depende da etapa (crianças, entrada do esgoto, portal antigo da montanha). */
function syncAct1World(){
 if(!act1Props)return;
 for(const k of act1Props.kids)k.visible=(questStep===2||(questStep===3&&act1Sub===0))&&!childrenFreed;
 if(act1Props.door)act1Props.door.visible=questStep>=4&&questStep<8;
 portalGroup.visible=questStep>=8;
}
function updateFlies(now){const f=act1Props&&act1Props.flies;if(!f||Math.hypot(player.position.x-VILLAGE_CENTER.x,player.position.z-VILLAGE_CENTER.z)>40)return;const t=now*.001,a=f.geo.attributes.position;
 for(let i=0;i<f.seed.length;i++){const s=f.seed[i],ang=s.a+t*s.v;a.array[i*3]=s.s.x+Math.cos(ang)*s.r;a.array[i*3+1]=groundHeightAt(s.s.x,s.s.z)+s.h+Math.sin(t*7+i)*.08;a.array[i*3+2]=s.s.z+Math.sin(ang*1.3)*s.r;}a.needsUpdate=true;}
/* ---------- Esgoto ---------- */
function enterSewer(at){
 inSewer=true;sewerArena=getDimArena('esgoto');enterDimensionArena('esgoto');
 voidSpec.walk=(lx,lz)=>sewerWalkable(lx,lz,{portalOpen:questStep>=6});
 const c=sewerLocal(at||sewerCheckpoint(questStep,act1Sub));player.position.set(c.x,voidSpec.y,c.z);playerYaw=(at&&at.yaw!==undefined)?at.yaw:Math.PI;player.rotation.y=playerYaw;cameraYaw=playerYaw+Math.PI;
 checkpointX=c.x;checkpointZ=c.z;camera.position.set(c.x-Math.sin(playerYaw)*6,voidSpec.y+3,c.z-Math.cos(playerYaw)*6);
 const r=sewerArena.refs;if(r.cage){r.cage.bars.position.y=questStep>=5||(questStep===4&&act1Sub>=3)?0:-3.2;r.cage.top.position.y=r.cage.bars.position.y+2.6;}
 if(r.portal)r.portal.visible=true;
 worldAudio.portalEnter();
}
function leaveSewer(to){
 inSewer=false;voidSpec.walk=null;leaveVoid();for(const c of hordeClones.splice(0))disposeClone(c);guideFighting=false;
 const p=to||sewerDoorFront();player.position.set(p.x,terrainHeightAt(p.x,p.z),p.z);checkpointX=p.x;checkpointZ=p.z;
 setGameHour(act1Night?21.5:9);
}
function travelVeil(cb){const veil=document.getElementById('travel-veil');if(veil)veil.classList.add('on');setTimeout(()=>{cb();setTimeout(()=>{if(veil)veil.classList.remove('on');},180);},520);}
/* ---------- Etapas ---------- */
function act1Advance(step,sub){questStep=step;act1Sub=sub||0;save3DProgress();updateQuestHud();syncAct1World();}
function act1Toast(text){const toast=document.getElementById('quest-toast');if(!toast)return;toast.textContent=text;toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2600);}
function act1Busy(){return cineActive||dialogueOpen||namePromptOpen||act1Lock||packFinishing||!!portalPull;}
/** Marcador da missão e gatilhos por proximidade. */
function updateAct1(dt,now){
 updatePack(dt);updateFlies(now);
 if(questStep<1||questStep>8)return;
 if(questStep>=3&&questStep<=4&&!rigLoads.enemy2)loadRig('enemy2').catch(()=>{});
 const px=player.position.x,pz=player.position.z,near=(p,r)=>Math.hypot(p.x-px,p.z-pz)<r,mark=p=>questMarker.position.set(p.x,terrainHeightAt(p.x,p.z)+.06,p.z);
 if(!cineActive)guide.visible=questStep===0||questStep>=8||guideFighting;
 if(questStep===1){
  if(act1Sub===0){mark(VILLAGE_CENTER);if(!act1Busy()&&near(VILLAGE_CENTER,VILLAGE_CLEAR_RADIUS+2)){act1Lock=true;storyAnchors.village={x:VILLAGE_CENTER.x,z:VILLAGE_CENTER.z,yaw:0};playStory('vila-chegada',villageArrivalScene(),{done:()=>{act1Lock=false;act1Advance(1,1);status.textContent='Pergunte ao vendedor sobre o Pecado da Ganância.';}});}}
  else{const t=villageVendors[2];mark(t);}
  return;
 }
 if(questStep===2){
  mark(CAGE_CENTER);storyAnchors.cage={x:CAGE_CENTER.x,z:CAGE_CENTER.z,yaw:Math.PI};
  if(!act1Busy()&&!pack&&!enemy.visible&&near(CAGE_CENTER,13)){
   act1Lock=true;
   if(journeyEnemyIndex===0){
    const first=JOURNEY_ENEMIES[0];storyAnchors.enemySpot={x:first.x,z:first.z};
    startPack({rig:'enemy1',profile:'captor',hp:100,spots:[first],hold:true,intro:'Um Seguidor da Ganância!',onEach:()=>{journeyEnemyIndex=1;save3DProgress();},onDone:forestSecond});
    playStory('floresta-1',forestFirstScene(),{focus:'enemy',face:'cage',done:()=>{act1Lock=false;packNext();}});
   }else{
    // Retomada (morreu ou recarregou): os que faltam aparecem de uma vez.
    const rest=JOURNEY_ENEMIES.slice(journeyEnemyIndex);if(!rest.length){act1Lock=false;forestCleared();return;}startPack({rig:'enemy1',profile:'captor',hp:100,spots:rest,onEach:()=>{journeyEnemyIndex++;save3DProgress();},onDone:forestCleared});act1Lock=false;
   }
  }
  return;
 }
 if(questStep===3){
  storyAnchors.cage={x:CAGE_CENTER.x,z:CAGE_CENTER.z,yaw:Math.PI};
  if(act1Sub===0)mark(CAGE_CENTER);
  else if(act1Sub===1&&!pack&&!act1Busy()){act1Lock=true;startPack({rig:'enemy1',profile:'captor',hp:110,spots:CAGE_SPOTS.map(s=>({x:s.x,z:s.z+1.2})),onDone:childrenCleared});act1Lock=false;}
  else if(act1Sub===2&&!act1Busy()){act1Lock=true;playFaint();}
  return;
 }
 if(questStep===4){
  if(inSewer){
   const S=SEWER;
   if(act1Sub<=2){mark(sewerLocal(S.feeding));storyAnchors.feeding={...sewerLocal(S.carcass),yaw:0};
    if(!act1Busy()&&!pack&&near(sewerLocal(S.feeding),S.feeding.r+6)){act1Lock=true;
     const prey=sewerLocal(S.carcass);
     startPack({rig:'enemy1',profile:'captor',hp:110,spots:S.feedingSpots.map(sewerLocal),hold:true,intro:'Os Seguidores largam a presa.',cloneOpts:{role:'attack',timeScale:.45},onDone:feedingCleared});
     if(pack)for(const c of pack.clones)if(c)c.lookAt={x:prey.x,z:prey.z};
     playStory('banquete',feedingScene(),{focus:'feeding',done:()=>{act1Lock=false;if(pack){for(const c of pack.clones)if(c)c.lookAt=null;packNext();}}});}}
   else if(act1Sub===3){const h=sewerLocal(S.hole);mark(h);storyAnchors.hole={x:h.x,z:h.z,y:voidSpec.y,yaw:0};if(!act1Busy()&&near(h,6)){act1Lock=true;playHole();}}
  }else{
   if(act1Sub===0){mark(MASSACRE_SPOT);storyAnchors.massacre={x:MASSACRE_SPOT.x,z:MASSACRE_SPOT.z,yaw:0};if(!act1Busy()&&!pack&&near(MASSACRE_SPOT,17)){act1Lock=true;playMassacre();}}
   else{mark(SEWER_DOOR);}
  }
  return;
 }
 if(questStep===5&&inSewer){
  const S=SEWER,w=sewerLocal(S.warden);mark(w);
  if(guideFighting&&sewerZone(px-DIMENSIONS.esgoto.center.x,pz-DIMENSIONS.esgoto.center.z)!=='cell'&&Math.hypot(px-sewerLocal(S.cell).x,pz-sewerLocal(S.cell).z)>16){guideFighting=false;guide.visible=false;for(const c of hordeClones.splice(0))disposeClone(c);}
  if(!act1Busy()&&!pack&&!enemy.visible&&near(w,14)){act1Lock=true;
   const first=!wardenTaunted;startPack({rig:'enemy1',profile:'warden',hp:ACT1.wardenHp,spots:[w],hold:true,scale:1.35,intro:'O Guardião do Portal!',onDone:wardenDown});
   if(first)playStory('guardiao',wardenIntroScene(),{focus:'enemy',done:()=>{act1Lock=false;wardenTaunted=true;save3DProgress();packNext();}});else{act1Lock=false;packNext();}
  }
  return;
 }
 if((questStep===6||questStep===7)&&inSewer){mark(sewerLocal(SEWER.portal));return;}
 if(questStep>=5&&questStep<=7&&!inSewer)mark(SEWER_DOOR);
}
function act1TalkLabel(){
 if(cineActive)return '';const px=player.position.x,pz=player.position.z;
 if(questStep===1&&act1Sub>=1){const t=villageVendors[2];if(Math.hypot(t.x-px,t.z-pz)<=2.9)return 'PERGUNTAR · TÉO';}
 if(questStep===3&&act1Sub===0&&Math.hypot(CAGE_CENTER.x-px,CAGE_CENTER.z-pz)<=4.2)return 'ABRIR GAIOLA';
 if(questStep===4&&act1Sub===1&&!inSewer){const d=sewerDoorFront();if(Math.hypot(d.x-px,d.z-pz)<=3.4)return 'ENTRAR NO ESGOTO';}
 if(questStep>=4&&questStep<8&&!inSewer&&act1Sub>=2||(questStep>=5&&questStep<8&&!inSewer)){const d=sewerDoorFront();if(Math.hypot(d.x-px,d.z-pz)<=3.4)return 'ENTRAR NO ESGOTO';}
 if(inSewer&&(questStep===6||questStep===7)){const p=sewerLocal(SEWER.portal);if(Math.hypot(p.x-px,p.z-pz)<=4.5)return 'ATRAVESSAR';}
 if(inSewer&&!enemy.visible&&!pack){const e=sewerLocal(SEWER.checkpoints.entrance);if(Math.hypot(e.x-px,e.z-pz)<=3)return 'SAIR DO ESGOTO';}
 return '';
}
function act1Interact(){
 const label=act1TalkLabel();if(!label)return false;
 if(label==='PERGUNTAR · TÉO'){faceTo(player,villageVendors[2]);if(coins<ACT1.bribe){playStory('vendedor-recusa',vendorRefusalScene(),{focus:'vendor',face:'vendor'});return true;}
  playStory('vendedor',vendorScene(),{focus:'vendor',face:'vendor',done:skipped=>{if(skipped&&!act1Night)nightFalls(true);act1Advance(2,0);journeyEnemyIndex=0;save3DProgress();status.textContent='Vá à floresta e investigue o choro das crianças.';}});return true;}
 if(label==='ABRIR GAIOLA'){faceTo(player,CAGE_CENTER);openCage();return true;}
 if(label==='ENTRAR NO ESGOTO'){travelVeil(()=>{if(questStep===4&&act1Sub===1)act1Advance(4,2);enterSewer();});return true;}
 if(label==='SAIR DO ESGOTO'){travelVeil(()=>leaveSewer());return true;}
 if(label==='ATRAVESSAR'){openValerioPortal();return true;}
 return false;
}
function nightFalls(instant){act1Night=true;if(instant){setGameHour(21.5);return;}setCineFade(1,1.1,false);setTimeout(()=>{setGameHour(21.5);storyTitle('MAIS TARDE','A floresta à noite');setCineFade(0,1.6,false);},1250);}
function forestSecond(){act1Lock=true;playStory('floresta-2',forestSecondScene(),{focus:'enemy',done:()=>{act1Lock=false;if(pack)packNext();}});}
function forestCleared(){
 journeyEnemyIndex=ACT1.enemyTotal;act1Advance(3,0);act1Toast('A CHAVE DA GAIOLA');
 playStory('chave',keyFoundScene(),{focus:'cage',face:'cage'});
}
function openCage(){
 act1Lock=true;childrenFreed=true;bumpStat('rescues');save3DProgress();
 playStory('gaiola',cageScene(),{focus:'cage',face:'cage',done:()=>{act1Lock=false;for(const k of act1Props?act1Props.kids:[])k.visible=false;act1Advance(3,1);if(pack)packNext();}});
}
function childrenCleared(){act1Advance(3,2);}
function playFaint(){
 playStory('desmaio',faintScene(),{focus:'guide',done:()=>{act1Lock=false;act1Night=false;if(actions.idle)play('idle',.3);act1Advance(4,0);status.textContent='Siga a trilha da montanha. O Bispo anda pelos esgotos.';}});
}
function playMassacre(){
 playStory('massacre',massacreScene(),{focus:'enemy',face:'massacre',done:()=>{
  act1Lock=false;if(!pack)startPack({rig:'enemy2',profile:'demon2',hp:ACT1.enemy2Hp,spots:massacreSpots(),onDone:massacreCleared});else{pack.onDone=massacreCleared;packNext();}
 }});
}
function massacreSpots(){const m=MASSACRE_SPOT;return[{x:m.x+2.6,z:m.z-1.2},{x:m.x-2.4,z:m.z-1.8},{x:m.x+.2,z:m.z-3.6}];}
function massacreCleared(){act1Advance(4,1);playStory('pista',clueScene(),{focus:'hero',done:()=>{status.textContent='A pista marca uma caverna na encosta.';}});}
function feedingCleared(){act1Advance(4,3);status.textContent='Há um buraco no fundo da sala.';}
function playHole(){
 playStory('buraco',holeScene(),{focus:'guide',done:skipped=>{
  act1Lock=false;
  if(skipped){const c=sewerLocal(SEWER.checkpoints.path);player.position.set(c.x,voidSpec.y,c.z);setCineFade(0,.6,false);}
  guideFighting=true;act1Advance(5,0);status.textContent='Siga pelo caminho vazio. O Anjo segura a horda.';
  const cp=sewerLocal(SEWER.checkpoints.path);checkpointX=cp.x;checkpointZ=cp.z;
 }});
}
function wardenDown(){
 act1Lock=true;wardenDefeated=true;coins+=ACT1.wardenReward;save3DProgress();
 // O Guardião implora antes de ser desfeito: volta à cena ajoelhado (clone, sem barra de vida).
 const w=sewerLocal(SEWER.warden),ex=enemy.position.x||w.x,ez=enemy.position.z||w.z,c=makeFoeClone('enemy1',{x:ex,z:ez},{scale:1.35,role:'hit',timeScale:.25});
 act1WardenClone=c;if(c){hordeClones.push(c);storyAnchors.enemy={x:ex,z:ez,y:c.holder.position.y,yaw:Math.atan2(player.position.x-ex,player.position.z-ez)};}
 playStory('guardiao-cai',wardenDefeatScene(),{focus:'enemy',done:()=>{act1Lock=false;delete storyAnchors.enemy;if(c){disposeClone(c);const i=hordeClones.indexOf(c);if(i>=0)hordeClones.splice(i,1);}act1WardenClone=null;act1Advance(6,0);status.textContent='O portal de Valério está aberto.';}});
}
var act1WardenClone=null;
/* ---------- Ações das cenas (passos "do" das cenas do Ato I) ---------- */
function storyDo(id,args){
 if(storyDo2(id,args))return;
 if(storyDo3(id,args))return;
 if(storyDo4(id,args))return;
 if(storyDo5(id,args))return;
 if(storyDo6(id,args))return;
 const P=player.position;
 switch(id){
  case 'titulo':storyTitle(args.kicker,args.title);break;
  case 'som-descoberta':worldAudio.discovery();break;
  case 'entregar-ouro':{
   coins=Math.max(0,coins-ACT1.bribe);updateQuestHud();showRewardPop('−'+ACT1.bribe+' MOEDAS');worldAudio.coins();
   const bag=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),mat(0x7a5a2a));bag.scale.set(1,1.2,1);scene.add(bag);
   const v=vendorRoots[2],to=v?v.position.clone():P.clone();
   storyFx.push({t:0,tick(t){const k=Math.min(1,t/1.3);bag.position.set(THREE.MathUtils.lerp(P.x,to.x,k),P.y+1.05+Math.sin(k*Math.PI)*.35,THREE.MathUtils.lerp(P.z,to.z,k));if(k>=1){scene.remove(bag);return false;}},finish(){scene.remove(bag);}});
   break;}
  case 'anoitecer':nightFalls(false);break;
  case 'choro':worldAudio.sob();setTimeout(()=>worldAudio.sob(),1500);break;
  case 'surgir-seguidor':{const s=JOURNEY_ENEMIES[0];storyAnchors.enemy={x:s.x,z:s.z,yaw:Math.atan2(P.x-s.x,P.z-s.z)};if(pack&&pack.clones[0])pack.clones[0].holder.visible=true;storyFlash('#200000',500);worldAudio.corrupt();break;}
  case 'surgir-dois':
   delete storyAnchors.enemy;storyFlash('#200000',400);worldAudio.corrupt();
   startPack({rig:'enemy1',profile:'captor',hp:100,spots:JOURNEY_ENEMIES.slice(1),hold:true,onEach:()=>{journeyEnemyIndex++;save3DProgress();},onDone:forestCleared});
   break;
  case 'abrir-gaiola':openCageDoors();worldAudio.reveal();break;
  case 'transformar-criancas':{
   storyFlash('#5a0008',900);worldAudio.corrupt();
   setTimeout(()=>{for(const k of act1Props?act1Props.kids:[])k.visible=false;startPack({rig:'enemy1',profile:'captor',hp:110,spots:CAGE_SPOTS.map(s=>({x:s.x,z:s.z+1.2})),hold:true,onDone:childrenCleared});},450);
   break;}
  case 'desmaiar':if(actions.ajoelhar)playOnce('ajoelhar',.4);setTimeout(()=>setCineFade(1,1.2,false),1100);break;
  case 'amanhecer':setTimeout(()=>{setGameHour(6.8);act1Night=false;if(actions.kipUp){playOnce('kipUp',0);actions.kipUp.paused=true;actions.kipUp.time=0;}setCineFade(0,1.8,false);},300);break;
  case 'anjo-aparece':{const s=Math.sin(playerYaw),c=Math.cos(playerYaw);guide.position.set(P.x+c*1.8+s*2.2,0,P.z-s*1.8+c*2.2);guide.position.y=terrainHeightAt(guide.position.x,guide.position.z);faceTo(guide,P);guide.visible=true;guide.scale.setScalar(.01);cineAngelT=0;worldAudio.celestial();
   storyFx.push({t:0,tick(t){guide.scale.setScalar(Math.max(.01,cineSmooth(t/1.2)));if(t>1.3)return false;},finish(){guide.scale.setScalar(1);}});break;}
  case 'levantar':if(actions.kipUp){actions.kipUp.paused=false;}else if(actions.idle)play('idle',.4);setTimeout(()=>{if(cineActive&&actions.idle)play('idle',.5);},2400);break;
  case 'anjo-parte':storyFx.push({t:0,tick(t){guide.scale.setScalar(Math.max(.01,1-t/1));if(t>1){guide.visible=false;guide.scale.setScalar(1);return false;}},finish(){guide.visible=false;guide.scale.setScalar(1);}});break;
  case 'massacre-inicio':{
   const m=MASSACRE_SPOT,poses=act1Props&&act1Props.poses;
   if(poses){for(const [dx,dz,yaw] of [[.6,.2,0],[-.8,-.4,.6]]){const v=poses.MendigoSentado.clone();v.position.set(m.x+dx,groundHeightAt(m.x+dx,m.z+dz),m.z+dz);v.rotation.y=yaw;scene.add(v);act1Props.victims.push(v);}}
   storyAnchors.victim={x:m.x,z:m.z,yaw:0};
   startPack({rig:'enemy2',profile:'demon2',hp:ACT1.enemy2Hp,spots:massacreSpots(),hold:true});
   if(pack)for(const c of pack.clones)if(c)c.lookAt={x:m.x,z:m.z};
   break;}
  case 'correr-ate-massacre':{const m=MASSACRE_SPOT,dx=m.x-P.x,dz=m.z-P.z,d=Math.hypot(dx,dz)||1,to={x:m.x-dx/d*5.5,z:m.z-dz/d*5.5};storyMove={t:0,dur:2.2,from:{x:P.x,z:P.z},to};if(actions.walk){play('walk',.2);actions.walk.setEffectiveTimeScale(1.4);}storyMove.done=()=>{if(actions.walk)actions.walk.setEffectiveTimeScale(1);if(actions.idle)play('idle',.3);};break;}
  case 'massacre-fim':{
   storyFlash('#3a0000',700);worldAudio.hit();
   const poses=act1Props&&act1Props.poses;for(const v of act1Props?act1Props.victims:[]){if(poses){const d=poses.MoradorCaido.clone();d.position.copy(v.position);d.rotation.y=v.rotation.y+1.2;scene.add(d);}scene.remove(v);}
   if(act1Props)act1Props.victims.length=0;if(pack)for(const c of pack.clones)if(c)c.lookAt=null;
   storyAnchors.enemy=(()=>{const c=pack&&pack.clones[0];return c?{x:c.holder.position.x,z:c.holder.position.z,yaw:c.holder.rotation.y}:null;})()||undefined;if(!storyAnchors.enemy)delete storyAnchors.enemy;
   break;}
  case 'correr-ao-buraco':{const h=sewerLocal(SEWER.hole),dx=h.x-P.x,dz=h.z-P.z,d=Math.hypot(dx,dz)||1,to={x:h.x-dx/d*2.1,z:h.z-dz/d*2.1};storyMove={t:0,dur:1.2,from:{x:P.x,z:P.z},to};if(actions.walk){play('walk',.15);actions.walk.setEffectiveTimeScale(1.5);}storyMove.done=()=>{if(actions.walk)actions.walk.setEffectiveTimeScale(1);};break;}
  case 'pular':{const h=sewerLocal(SEWER.hole);storyMove={t:0,dur:.9,from:{x:P.x,z:P.z},to:{x:h.x,z:h.z}};if(actions.jump)playOnce('jump',.05);worldAudio.whoosh();setTimeout(()=>setCineFade(1,.35,false),700);break;}
  case 'piscar':{
   let n=0;const blink=()=>{setCineFade(n%2?0:1,.18,false);n++;if(n<6)setTimeout(blink,330);};blink();
   setTimeout(()=>{const c=sewerLocal(SEWER.cell);player.position.set(c.x+1.4,voidSpec.y,c.z+2.2);faceTo(player,{x:c.x+6,z:c.z-3});if(actions.kipUp){playOnce('kipUp',0);actions.kipUp.paused=true;actions.kipUp.time=0;}
    for(let i=0;i<ACT1.cellEnemies;i++){const a=i/ACT1.cellEnemies*6.28+.3,cl=makeFoeClone('enemy1',{x:c.x+Math.cos(a)*5.5,z:c.z+Math.sin(a)*5.5});if(cl)hordeClones.push(cl);}},1100);
   break;}
  case 'acordar-cercado':setCineFade(0,.9,false);setTimeout(()=>{if(actions.kipUp){actions.kipUp.paused=false;}},1200);break;
  case 'desmaiar-de-novo':setCineFade(1,.9,false);setTimeout(()=>{for(const cl of hordeClones.splice(0))disposeClone(cl);const c=sewerLocal(SEWER.cage);player.position.set(c.x,voidSpec.y,c.z);if(actions.idle)play('idle',.1);const r=sewerArena&&sewerArena.refs;if(r&&r.cage){r.cage.bars.position.y=0;r.cage.top.position.y=2.6;}storyAnchors.cell={x:c.x,z:c.z,y:voidSpec.y,yaw:0};},1000);break;
  case 'acordar-na-jaula':setCineFade(0,1.2,false);faceTo(player,sewerLocal(SEWER.emptyPath.from));break;
  case 'anjo-abre-jaula':{const c=sewerLocal(SEWER.cage);guide.position.set(c.x+2.6,voidSpec.y,c.z-1.2);faceTo(guide,P);guide.visible=true;guide.scale.setScalar(1);worldAudio.celestial();
   const r=sewerArena&&sewerArena.refs;if(r&&r.cage)storyFx.push({t:0,tick(t){const y=Math.min(3.4,t*2.4);r.cage.bars.position.y=y;r.cage.top.position.y=y+2.6;if(t>1.5)return false;},finish(){r.cage.bars.position.y=3.4;r.cage.top.position.y=6;}});
   break;}
  case 'horda-chega':{const a=sewerLocal(SEWER.hordePath.from),b=sewerLocal(SEWER.hordePath.to);for(let i=0;i<ACT1.pathEnemies;i++){const k=i/ACT1.pathEnemies,cl=makeFoeClone('enemy1',{x:THREE.MathUtils.lerp(a.x,b.x,k)+1,z:a.z+((i%3)-1)*1.3},{role:'walk',approach:6});if(cl)hordeClones.push(cl);}worldAudio.corrupt();break;}
  case 'anjo-luta':{guideFighting=true;const a=sewerLocal(SEWER.hordePath.from);guide.position.set(a.x-2.5,voidSpec.y,a.z);faceTo(guide,a);for(const cl of hordeClones)cl.lookAt=guide.position;break;}
  case 'surgir-guardiao':storyFlash('#300010',600);worldAudio.corrupt();if(pack&&pack.clones[0]){const h=pack.clones[0].holder;storyAnchors.enemy={x:h.position.x,z:h.position.z,y:h.position.y,yaw:h.rotation.y};}break;
  case 'desfazer-guardiao':{const c=act1WardenClone;storyFlash('#100008',800);worldAudio.corrupt();if(c)storyFx.push({t:0,tick(t){c.holder.scale.setScalar(1.35*Math.max(.01,1-t/1.2));c.holder.position.y+=.01;if(t>1.2){c.holder.visible=false;return false;}},finish(){c.holder.visible=false;}});break;}
  case 'escuro':setCineFade(1,1.1,false);break;
 }
}
/* ---------- Valério: falas dentro da dimensão e a volta ao início do mapa ---------- */
function valerioIntro(){if(!dimBattle||dimBattle.key!=='bishop1'||questStep>=8)return;playStory('valerio',valerioIntroScene(),{focus:'enemy',face:'enemy'});}
function valerioOutro(then){playStory('valerio-cai',valerioDefeatScene(),{focus:'enemy',done:()=>then()});}
function afterValerioStory(){
 guide.visible=true;
 playStory('volta',afterValerioScene(),{focus:'guide',done:()=>{
  // Fim do Ato I: tela escura e o Ato II começa (a viagem até a cidade seguinte).
  startAct2Travel();setCineFade(0,1.6,false);
 }});
}
/* MOD 205 — Marco 3: Ato II como no roteiro original (docs/roteiro/M3-ATO2.md). A cidade do vulcão ocupa o antigo
   distrito; o interior do vulcão é uma área abaixo do mundo (tema "volcano", layout em volcano3d.js), como o esgoto.
   Usa o mesmo diretor de cenas, lutas em grupo e câmera do Ato I. */
var inVolcano=false,volcanoArena=null,act2World=null,act2Bandits=[],rivalClone=null,guidePinned=false,visionSave=null,bishop4Sky=null,act2Abyss=questStep>=15;
RIG_DEFS.rival={file:'./Misteriosa-rig.glb?v=mod205',height:1.0,roles:{idle:'_01a15ab5_eeba_71ae_a438_b85a938940fc',walk:'Walking',run:'Running',attack:'Attack',cast:'Triple_Combo_Attack',dash:'_01a15ab0_deed_76a9_818c_47f5fc81ba40',death:'Dead'},inPlace:['attack','cast','dash','death']};
Object.assign(SPEAKER_ACTOR,{[SPEAKERS2.bandit]:'bandit',[SPEAKERS2.rival]:'rival',[SPEAKERS2.demon]:'enemy',[SPEAKERS2.miniboss]:'enemy',[SPEAKERS2.boss]:'enemy',[SPEAKERS2.bishop4]:'sky',[SPEAKERS2.note]:'hero'});
Object.assign(STORY_EYE,{bandit:1.5,rival:1.5,sky:0,lab:1,door:2,gold:1,portal:3,city:2});
function volcanoLocal(p){return{x:p.x+DIMENSIONS.vulcao.center.x,z:p.z+DIMENSIONS.vulcao.center.z};}
const CITY=DISTRICT_SPOTS.plaza;
/* ---------- O vulcão, as cinzas, a erupção e a cidade destruída ---------- */
function buildAct2World(){
 if(act2World)return act2World;const W=act2World={};
 const V=DISTRICT_SPOTS.volcano,vy=groundHeightAt(DISTRICT_SPOTS.volcanoGate.x,DISTRICT_SPOTS.volcanoGate.z)-2;
 const g=new THREE.Group();g.position.set(V.x,vy,V.z);scene.add(g);W.volcano=g;
 // Cone com cratera (perfil girado) e veios incandescentes.
 const prof=[];for(let i=0;i<=16;i++){const t=i/16;prof.push(new THREE.Vector2(Math.max(6,30*(1-t)+(1-t)*(1-t)*5),t*50));}prof.push(new THREE.Vector2(5,47));
 const rockC=document.createElement('canvas');rockC.width=rockC.height=256;{const c=rockC.getContext('2d');c.fillStyle='#2a221e';c.fillRect(0,0,256,256);for(let i=0;i<400;i++){const v=30+Math.random()*30|0;c.fillStyle='rgb('+v+','+(v-6)+','+(v-9)+')';c.fillRect(Math.random()*256,Math.random()*256,4+Math.random()*10,2+Math.random()*5);}c.strokeStyle='rgba(255,90,20,.55)';c.lineWidth=2;for(let i=0;i<10;i++){let x=Math.random()*256,y=0;c.beginPath();c.moveTo(x,y);while(y<256){x+=(Math.random()-.5)*24;y+=10+Math.random()*16;c.lineTo(x,y);}c.stroke();}}
 const rockT=new THREE.CanvasTexture(rockC);rockT.wrapS=rockT.wrapT=THREE.RepeatWrapping;rockT.repeat.set(6,3);rockT.colorSpace=THREE.SRGBColorSpace;
 const cone=new THREE.Mesh(new THREE.LatheGeometry(prof,40),new THREE.MeshStandardMaterial({map:rockT,emissiveMap:rockT,emissive:0x501806,emissiveIntensity:.7,roughness:.95}));g.add(cone);
 const crater=glowSprite(0xff6a20,.75,22);crater.position.y=51;g.add(crater);W.crater=crater;
 // Fumaça subindo da cratera (uma chamada de desenho).
 const N=90,sp=new Float32Array(N*3),sv=[];for(let i=0;i<N;i++){sp[i*3]=(Math.random()-.5)*8;sp[i*3+1]=50+Math.random()*60;sp[i*3+2]=(Math.random()-.5)*8;sv.push(2+Math.random()*3);}
 const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
 const smoke=new THREE.Points(sg,new THREE.PointsMaterial({map:softDot,color:0x5a524c,size:16,transparent:true,opacity:.5,depthWrite:false}));smoke.frustumCulled=false;g.add(smoke);W.smoke={geo:sg,v:sv};
 // Lava da erupção e bolas de fogo (só na visão de VORGAZHEK).
 const LN=160,lp=new Float32Array(LN*3),lv=[];for(let i=0;i<LN;i++){lv.push({vx:(Math.random()-.5)*14,vy:18+Math.random()*24,vz:(Math.random()-.5)*14,t:Math.random()*3});}
 const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.BufferAttribute(lp,3));
 const lava=new THREE.Points(lg,new THREE.PointsMaterial({map:softDot,color:0xff7a20,size:5,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));lava.frustumCulled=false;lava.visible=false;g.add(lava);W.lava={pts:lava,geo:lg,v:lv};
 W.fireballs=[];for(let i=0;i<10;i++){const f=glowSprite(0xff5a10,.95,6);f.visible=false;scene.add(f);W.fireballs.push({s:f,t:Math.random()*2.5,from:new THREE.Vector3(),to:new THREE.Vector3()});}
 // Cinzas caindo sobre a cidade.
 const AN=260,ap=new Float32Array(AN*3);for(let i=0;i<AN;i++){ap[i*3]=CITY.x+(Math.random()-.5)*80;ap[i*3+1]=Math.random()*24;ap[i*3+2]=CITY.z+(Math.random()-.5)*70;}
 const ag=new THREE.BufferGeometry();ag.setAttribute('position',new THREE.BufferAttribute(ap,3));
 const ash=new THREE.Points(ag,new THREE.PointsMaterial({color:0x9a908a,size:.09,transparent:true,opacity:.8,depthWrite:false}));ash.frustumCulled=false;scene.add(ash);W.ash={pts:ash,geo:ag};
 // Incêndios da cidade destruída.
 const firePts=[];for(const [x,z] of [[-138,-36],[-162,-36],[-182,-56],[-128,-58],[-178,-76],[-145,-84],[-122,-74],[-188,-36],[-150,-50],[-160,-72],[-140,-70]])for(let k=0;k<3;k++)firePts.push([x+(Math.random()-.5)*5,z+(Math.random()-.5)*5]);
 W.fires=firePts.map(([x,z])=>{const s=glowSprite(0xff6a18,.85,2.6+Math.random()*2.4);s.position.set(x,groundHeightAt(x,z)+1.4,z);s.visible=false;scene.add(s);return s;});
 // O abismo deixado pelo buraco negro: um rombo que mostra o espaço lá no fundo, como o fim do mundo.
 const abyss=new THREE.Mesh(new THREE.CircleGeometry(24,64),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0}},
  vertexShader:'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float uTime;varying vec2 vP;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){float r=length(vP)/24.;float a=atan(vP.y,vP.x);float edge=.9+.06*sin(a*9.)+.04*sin(a*23.+1.);if(r>edge)discard;vec2 sc=gl_FragCoord.xy*.35;vec2 c=floor(sc);float s=step(.985,h(c))*(.5+.5*sin(uTime*2.+h(c)*30.));vec3 sky=mix(vec3(.02,.0,.06),vec3(.0,.0,.01),r);float rim=smoothstep(edge-.12,edge,r);gl_FragColor=vec4(sky+vec3(s)*(1.-rim)+vec3(.35,.08,.02)*rim*.8,1.);}'}));
 abyss.rotation.x=-Math.PI/2;abyss.position.set(CITY.x,groundHeightAt(CITY.x,CITY.z)+.08,CITY.z);abyss.visible=false;abyss.renderOrder=3;scene.add(abyss);W.abyss=abyss;
 W.abyssBlock={x:CITY.x,z:CITY.z,radius:22.5,height:4};
 W.note=new THREE.Mesh(new THREE.PlaneGeometry(.5,.36),new THREE.MeshStandardMaterial({color:0xe8dcc0,roughness:.9,side:THREE.DoubleSide}));W.note.rotation.x=-Math.PI/2;
 {const p=DISTRICT_SPOTS.note;W.note.position.set(p.x,groundHeightAt(p.x,p.z)+.03,p.z);}W.note.visible=false;scene.add(W.note);
 // A antiga missão (família, livros e selo) deu lugar ao roteiro: o altar e os livros não aparecem mais.
 if(district.altar)district.altar.visible=false;for(const l of district.ledgers)l.group.visible=false;
 syncAct2World();
 return W;
}
function syncAct2World(){
 const W=act2World;if(!W)return;
 const destroyed=questStep>=ACT2.done;W.volcano.visible=questStep>=ACT2.start;
 for(const f of W.fires)f.visible=destroyed&&!act2Abyss;
 W.abyss.visible=act2Abyss;district.root.visible=!act2Abyss;
 const i=marketObstacles.indexOf(W.abyssBlock);if(act2Abyss&&i<0)marketObstacles.push(W.abyssBlock);else if(!act2Abyss&&i>=0)marketObstacles.splice(i,1);
 W.note.visible=questStep===ACT2.done&&act2Abyss;
 if(destroyed&&!W.sooted){W.sooted=true;district.root.traverse(o=>{if(o.isMesh&&o.material&&o.material.color&&!o.material.userData.soot){o.material.userData.soot=true;o.material.color.multiplyScalar(.45);}});}
}
let eruption=0;
function updateAct2World(dt,now){
 const W=act2World;if(!W)return;const t=now*.001;
 W.crater.material.opacity=.6+Math.sin(t*1.7)*.15+eruption*.3;
 {const a=W.smoke.geo.attributes.position;for(let i=0;i<W.smoke.v.length;i++){let y=a.array[i*3+1]+W.smoke.v[i]*dt;if(y>120)y=50;a.array[i*3+1]=y;a.array[i*3]+=dt*1.2;if(a.array[i*3]>30)a.array[i*3]=-4;}a.needsUpdate=true;}
 const nearCity=Math.hypot(player.position.x-CITY.x,player.position.z-CITY.z)<90&&!voidMode;W.ash.pts.visible=(nearCity||eruption>0)&&questStep>=ACT2.travel&&!act2Abyss;
 if(W.ash.pts.visible){const a=W.ash.geo.attributes.position;for(let i=0;i<a.count;i++){let y=a.array[i*3+1]-dt*(1.2+(i%5)*.2);if(y<0)y=24;a.array[i*3+1]=y;a.array[i*3]+=Math.sin(t+i)*dt*.3;}a.needsUpdate=true;}
 W.lava.pts.visible=eruption>0;
 if(eruption>0){const a=W.lava.geo.attributes.position;for(let i=0;i<W.lava.v.length;i++){const v=W.lava.v[i];v.t+=dt;if(v.t>3.2)v.t=0;a.array[i*3]=v.vx*v.t;a.array[i*3+1]=50+v.vy*v.t-9.8*v.t*v.t;a.array[i*3+2]=v.vz*v.t;}a.needsUpdate=true;
  for(const f of W.fireballs){f.t+=dt;if(f.t>2.6||!f.s.visible){f.t=0;f.from.set(W.volcano.position.x,W.volcano.position.y+51,W.volcano.position.z);f.to.set(CITY.x+(Math.random()-.5)*60,groundHeightAt(CITY.x,CITY.z),CITY.z+(Math.random()-.5)*50);f.s.visible=true;}const k=f.t/2.6;f.s.position.lerpVectors(f.from,f.to,k);f.s.position.y+=Math.sin(k*Math.PI)*30;}
 }else for(const f of W.fireballs)f.s.visible=false;
 for(const f of W.fires)if(f.visible)f.material.opacity=.65+Math.sin(t*9+f.position.x)*.2;
 if(W.abyss.visible)W.abyss.material.uniforms.uTime.value=t;
}
/* ---------- Moradores da cidade: bandidos ---------- */
let npcBasePromise=null;
function npcBase(){if(!npcBasePromise)npcBasePromise=new Promise((res,rej)=>new GLTFLoader().load('./Npc-lod2.glb?v=mod202',gltf=>{const base=gltf.scene,box=measureModelBounds(base),size=box.getSize(new THREE.Vector3());res({base,clips:gltf.animations||[],scale:size.y>.01?(playerReferenceHeight*.98)/size.y:1,box});},undefined,rej));return npcBasePromise;}
function makeTownsfolk(b,tint,clipName){const c=cloneSkinned(b.base),h=new THREE.Group();c.scale.setScalar(b.scale);c.position.y=-b.box.min.y*b.scale;c.rotation.y=Math.PI;h.add(c);
 c.traverse(o=>{if(o.isMesh&&o.material){o.material=o.material.clone();o.material.color.multiply(new THREE.Color(tint));o.material.metalness=0;o.material.metalnessMap=null;if(o.material.map){o.material.emissiveMap=o.material.map;o.material.emissive=new THREE.Color(0x4a3e36);o.material.emissiveIntensity=.7;}}});
 const m=new THREE.AnimationMixer(c),clip=b.clips.find(k=>k.name===clipName)||b.clips.find(k=>k.name==='Alert');const a=clip?m.clipAction(clip):null;if(a)a.play();scene.add(h);return{holder:h,mixer:m,action:a,model:c};}
function spawnBandits(){
 return npcBase().then(b=>{for(const x of act2Bandits.splice(0))scene.remove(x.holder);const A=DISTRICT_SPOTS.ambush;
  for(let i=0;i<ACT2.bandits;i++){const a=i/ACT2.bandits*6.28+.4,x=A.x+Math.cos(a)*4.2,z=A.z+Math.sin(a)*4.2,v=makeTownsfolk(b,[0x8a7a6a,0x6a5a4a,0x9a8070,0x5a6a5a,0x7a6050][i],'Alert');v.holder.position.set(x,groundHeightAt(x,z),z);act2Bandits.push({...v,home:{x,z}});}
  storyAnchors.bandit={x:A.x+Math.cos(.4)*4.2,z:A.z+Math.sin(.4)*4.2};
 });
}
function updateBandits(dt){
 for(const bd of act2Bandits){bd.mixer.update(dt);const h=bd.holder;
  if(bd.target){const dx=bd.target.x-h.position.x,dz=bd.target.z-h.position.z,d=Math.hypot(dx,dz);if(d>.3){h.position.x+=dx/d*dt*3.2;h.position.z+=dz/d*dt*3.2;h.rotation.y=Math.atan2(dx,dz);}else if(!bd.crouched){bd.crouched=true;h.scale.y=.7;}}
  else h.rotation.y=Math.atan2(player.position.x-h.position.x,player.position.z-h.position.z);
  h.position.y=groundHeightAt(h.position.x,h.position.z);}
}
/* ---------- Interior do vulcão ---------- */
let volcanoStatues=[],volcanoPortal=null;
function enterVolcano(at){
 inVolcano=true;volcanoArena=getDimArena('vulcao');enterDimensionArena('vulcao');
 voidSpec.walk=(lx,lz)=>volcanoWalkable(lx,lz,{doorOpen:questStep>ACT2.volcano||act1Sub>=2});
 const c=volcanoLocal(at||volcanoCheckpoint(questStep>ACT2.volcano?4:act1Sub));player.position.set(c.x,voidSpec.y,c.z);playerYaw=Math.PI;player.rotation.y=playerYaw;cameraYaw=0;
 checkpointX=c.x;checkpointZ=c.z;camera.position.set(c.x,voidSpec.y+3,c.z+6);
 const r=volcanoArena.refs;
 if(r.door){const open=questStep>ACT2.volcano||act1Sub>=2;r.door.position.y=open?-4.4:0;}
 if(r.bodies)r.bodies.visible=!(questStep>ACT2.volcano||act1Sub>=1);
 if(!volcanoStatues.length)loadRig('enemy2').then(rg=>{for(const s of r.statues){const cl=makeFoeClone('enemy2',volcanoLocal(s),{scale:1.7});if(!cl)continue;cl.mixer.update(.5);cl.mixer.timeScale=0;cl.holder.rotation.y=0;cl.holder.traverse(o=>{if(o.isMesh){o.material=new THREE.MeshStandardMaterial({color:0x5a5450,roughness:.9});}});cl.holder.position.y=voidSpec.y+1.2;cl.static=true;volcanoStatues.push(cl);}},()=>{});
 for(const s of volcanoStatues)s.holder.visible=true;
 syncVolcanoPortal();worldAudio.portalEnter();
}
function syncVolcanoPortal(){
 if(questStep>=ACT2.boss&&questStep<ACT2.done&&inVolcano){if(!volcanoPortal){volcanoPortal=buildDimensionPortal(THREE,'bishop2');if(volcanoPortal){const p=volcanoLocal(VOLCANO.portal);volcanoPortal.group.position.set(p.x,voidSpec.y,p.z);volcanoPortal.group.scale.setScalar(.42);scene.add(volcanoPortal.group);}}if(volcanoPortal)volcanoPortal.setActive(true);}
 else if(volcanoPortal)volcanoPortal.setActive(false);
}
function leaveVolcano(to){
 inVolcano=false;voidSpec.walk=null;leaveVoid();for(const s of volcanoStatues)s.holder.visible=false;if(volcanoPortal)volcanoPortal.setActive(false);guidePinned=false;
 const g=DISTRICT_SPOTS.volcanoGate,p=to||{x:g.x+4,z:g.z};player.position.set(p.x,terrainHeightAt(p.x,p.z),p.z);checkpointX=p.x;checkpointZ=p.z;setGameHour(16);
}
/* ---------- Etapas do Ato II ---------- */
function updateAct2Story(dt,now){
 updateBandits(dt);updateAct2World(dt,now);
 if(volcanoPortal&&volcanoPortal.group.visible)volcanoPortal.update(now,camera,innerHeight*renderer.getPixelRatio());
 if(rivalClone){rivalClone.mixer.update(dt);}
 if(bishop4Sky){bishop4Sky.t+=dt;bishop4Sky.holder.position.y=bishop4Sky.y+Math.sin(bishop4Sky.t*.8)*1.2;if(bishop4Sky.mixer)bishop4Sky.mixer.update(dt);}
 if(!cineActive&&questStep>=ACT2.travel)guide.visible=guidePinned||questStep>=20;
 if(questStep<ACT2.travel||questStep>ACT2.done)return;
 if(!act2World)buildAct2World();
 const px=player.position.x,pz=player.position.z,near=(p,r)=>Math.hypot(p.x-px,p.z-pz)<r,mark=p=>questMarker.position.set(p.x,terrainHeightAt(p.x,p.z)+.06,p.z);
 if(questStep>=ACT2.city&&questStep<=ACT2.volcano&&!rigLoads.enemy2)loadRig('enemy2').catch(()=>{});
 if(questStep===ACT2.travel){mark(gorgeGate.spot.x<px&&px>-90?gorgeGate.spot:CITY);storyAnchors.city={x:CITY.x,z:CITY.z,yaw:0};
  if(!act1Busy()&&near(CITY,40)){act1Lock=true;playStory('cidade',cityArrivalScene(),{focus:'guide',done:()=>{act1Lock=false;act1Advance(ACT2.city,0);status.textContent='Atravesse a cidade.';}});}return;}
 if(questStep===ACT2.city){
  if(act1Sub===0){const A=DISTRICT_SPOTS.ambush;mark(A);if(!act1Busy()&&near(A,7)){act1Lock=true;spawnBandits().then(()=>{playStory('bandidos',banditScene(),{focus:'bandit',face:'bandit',done:()=>{act1Lock=false;act1Advance(ACT2.city,1);status.textContent='Alguém na praça parece observar você.';}});},()=>{act1Lock=false;act1Advance(ACT2.city,1);});}}
  else{const R=DISTRICT_SPOTS.rival;mark(R);storyAnchors.rival={x:R.x,z:R.z,yaw:Math.atan2(px-R.x,pz-R.z)};
   if(!act1Busy()&&!pack&&!enemy.visible&&near(R,9)){act1Lock=true;startPack({rig:'rival',profile:'rival',hp:ACT2.rivalHp,spots:[R],hold:true,intro:'O desconhecido saca as lâminas.',onDone:rivalDown});
    playStory('misteriosa',rivalScene(),{focus:'rival',face:'rival',done:()=>{act1Lock=false;delete storyAnchors.rival;releasePack();}});}}
  return;
 }
 if(questStep===ACT2.gate){
  const G=DISTRICT_SPOTS.volcanoGate;mark(G);
  if(!act1Busy()&&!pack&&!enemy.visible&&near(G,14)){act1Lock=true;startPack({rig:'enemy2',profile:'demon2',hp:ACT2.enemy2Hp,spots:DISTRICT_SPOTS.volcanoGuards,hold:true,onDone:gateCleared});
   playStory('entrada',gateScene(),{focus:'enemy',done:()=>{act1Lock=false;releasePack();}});}
  return;
 }
 if(questStep===ACT2.volcano){
  if(!inVolcano){mark(DISTRICT_SPOTS.volcanoGate);return;}
  const V=VOLCANO;storyAnchors.lab={...volcanoLocal(V.lab),y:voidSpec.y,yaw:0};storyAnchors.door={...volcanoLocal(V.door),y:voidSpec.y,yaw:-Math.PI/2};storyAnchors.gold={...volcanoLocal(V.gold),y:voidSpec.y,yaw:-Math.PI/2};storyAnchors.portal={...volcanoLocal(V.portal),y:voidSpec.y,yaw:0};
  if(act1Sub===0){mark(volcanoLocal(V.lab));if(!act1Busy()&&!pack&&near(volcanoLocal(V.lab),V.lab.r+6)){act1Lock=true;playStory('laboratorio',labScene(),{focus:'enemy',done:()=>{act1Lock=false;releasePack();}});}}
  else if(act1Sub===1)mark(volcanoLocal(V.door));
  else if(act1Sub===2){mark(volcanoLocal(V.hall));if(!act1Busy()&&!pack&&near(volcanoLocal(V.hall),V.hall.r+5)){act1Lock=true;guidePinned=false;playStory('galeria',hallScene(),{focus:'enemy',done:()=>{act1Lock=false;releasePack();}});}}
  else{mark(volcanoLocal(V.miniboss));if(!act1Busy()&&!pack&&!enemy.visible&&near(volcanoLocal(V.throne),V.throne.r+4)){act1Lock=true;playStory('trono',throneScene(),{focus:'enemy',done:()=>{act1Lock=false;releasePack();}});}}
  return;
 }
 if(questStep===ACT2.boss){if(inVolcano)mark(volcanoLocal(VOLCANO.portal));else mark(DISTRICT_SPOTS.volcanoGate);return;}
 if(questStep===ACT2.done&&!act2Abyss){mark(CITY);storyAnchors.city={x:CITY.x,z:CITY.z,yaw:0};if(!act1Busy()&&!voidMode&&near(CITY,30)){act1Lock=true;playAfterVorgazhek();}}
}
function act2StoryLabel(){
 if(cineActive)return '';const px=player.position.x,pz=player.position.z;
 if(questStep>=ACT2.volcano&&questStep<ACT2.done&&!inVolcano){const g=DISTRICT_SPOTS.volcanoGate;if(Math.hypot(g.x-px,g.z-pz)<=4.5&&!enemy.visible)return 'ENTRAR NO VULCÃO';}
 if(inVolcano){
  if(questStep===ACT2.volcano&&act1Sub===1){const d=volcanoLocal(VOLCANO.door);if(Math.hypot(d.x-px,d.z-pz)<=4)return 'USAR A CHAVE';}
  if(questStep===ACT2.boss){const p=volcanoLocal(VOLCANO.portal);if(Math.hypot(p.x-px,p.z-pz)<=5)return 'ENTRAR NO PORTAL';}
  if(!enemy.visible&&!pack){const e=volcanoLocal(VOLCANO.checkpoints.entrance);if(Math.hypot(e.x-px,e.z-pz)<=3)return 'SAIR DO VULCÃO';}
 }
 return '';
}
function act2StoryInteract(){
 const l=act2StoryLabel();if(!l)return false;
 if(l==='ENTRAR NO VULCÃO'){travelVeil(()=>enterVolcano());return true;}
 if(l==='SAIR DO VULCÃO'){travelVeil(()=>leaveVolcano());return true;}
 if(l==='USAR A CHAVE'){act1Lock=true;playStory('ouro',goldScene(),{focus:'guide',done:()=>{act1Lock=false;act1Advance(ACT2.volcano,2);status.textContent='O Anjo ficou com o ouro. Siga mais fundo.';}});return true;}
 if(l==='ENTRAR NO PORTAL'){startBishop2Dimension();return true;}
 return false;
}
function rivalDown(){
 // Ela não morre: cai de joelhos, e o herói aponta a arma.
 const R=DISTRICT_SPOTS.rival,x=enemy.position.x||R.x,z=enemy.position.z||R.z;
 rivalClone=makeFoeClone('rival',{x,z},{role:'idle'});if(rivalClone){rivalClone.holder.scale.y=.82;rivalClone.holder.rotation.y=Math.atan2(player.position.x-x,player.position.z-z);hordeClones.push(rivalClone);}
 storyAnchors.rival={x,z,yaw:Math.atan2(player.position.x-x,player.position.z-z)};act1Lock=true;
 playStory('misteriosa-perde',rivalDefeatScene(),{focus:'rival',face:'rival',done:()=>{act1Lock=false;delete storyAnchors.rival;if(rivalClone){disposeClone(rivalClone);const i=hordeClones.indexOf(rivalClone);if(i>=0)hordeClones.splice(i,1);rivalClone=null;}act1Advance(ACT2.gate,0);status.textContent='A entrada do vulcão fica a oeste da cidade.';}});
}
function gateCleared(){act1Lock=true;const p=DISTRICT_SPOTS.volcanoGuards[0],c=makeFoeClone('enemy2',p,{role:'idle'});if(c){c.holder.scale.y=.8;hordeClones.push(c);storyAnchors.enemy={x:p.x,z:p.z,yaw:Math.atan2(player.position.x-p.x,player.position.z-p.z)};}
 playStory('entrada-cai',gateDefeatScene(),{focus:'enemy',done:()=>{act1Lock=false;delete storyAnchors.enemy;if(c){disposeClone(c);const i=hordeClones.indexOf(c);if(i>=0)hordeClones.splice(i,1);}act1Advance(ACT2.volcano,0);status.textContent='Entre no vulcão.';}});
 act2DyingClone=c;}
var act2DyingClone=null;
function labCleared(){act1Lock=true;playStory('chave2',keyScene(),{focus:'guide',done:()=>{act1Lock=false;act1Advance(ACT2.volcano,1);status.textContent='Procure o que a chave abre.';}});}
function hallCleared(){act1Lock=true;playStory('galeria-cai',hallDefeatScene(),{focus:'enemy',done:()=>{act1Lock=false;act1Advance(ACT2.volcano,3);}});}
function minibossDown(){
 const m=volcanoLocal(VOLCANO.miniboss),x=enemy.position.x||m.x,z=enemy.position.z||m.z,c=makeFoeClone('enemy2',{x,z},{role:'idle',scale:1.8});
 if(c){c.holder.scale.y=1.8*.82;hordeClones.push(c);storyAnchors.enemy={x,z,y:voidSpec.y,yaw:Math.atan2(player.position.x-x,player.position.z-z)};}act1Lock=true;
 playStory('trono-cai',minibossDefeatScene(),{focus:'enemy',done:()=>{act1Lock=false;delete storyAnchors.enemy;if(c){disposeClone(c);const i=hordeClones.indexOf(c);if(i>=0)hordeClones.splice(i,1);}act1Advance(ACT2.boss,0);syncVolcanoPortal();status.textContent='O portal de VORGAZHEK se abriu atrás do trono.';}});
}
function playAfterVorgazhek(){
 guide.visible=true;
 playStory('depois-vorgazhek',afterVorgazhekScene(),{focus:'guide',done:()=>{
  act1Lock=false;act2Abyss=true;guide.visible=false;syncAct2World();if(bishop4Sky){scene.remove(bishop4Sky.holder);bishop4Sky=null;}
  // O Ato III do roteiro (cidade de neve) é o próximo marco; até lá, o jogo segue para o Ato III atual.
  questStep=15;act1Sub=0;save3DProgress();updateQuestHud();setCineFade(0,1.2,false);status.textContent='O bilhete diz: vá à cidade de neve.';
 }});
}
/** Ações das cenas do Ato II (passos "do"). */
function storyDo2(id,args){
 const P=player.position;
 switch(id){
  case 'cercar':for(const bd of act2Bandits){bd.holder.position.x+=(P.x-bd.holder.position.x)*.25;bd.holder.position.z+=(P.z-bd.holder.position.z)*.25;}return true;
  case 'jogar-moedas':{coins=Math.max(0,coins-ACT2.bribe);updateQuestHud();showRewardPop('−'+ACT2.bribe+' MOEDAS');worldAudio.coins();
   const s=Math.sin(playerYaw),c=Math.cos(playerYaw),spot={x:P.x+s*1.6,z:P.z+c*1.6};
   for(let i=0;i<14;i++){const coin=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.015,8),mat(0xd8a032));coin.position.set(spot.x+(Math.random()-.5)*1.4,groundHeightAt(spot.x,spot.z)+.02,spot.z+(Math.random()-.5)*1.4);scene.add(coin);setTimeout(()=>scene.remove(coin),9000);}
   npcBase().then(b=>{const run=b.clips.find(k=>k.name==='Running');act2Bandits.forEach((bd,i)=>{bd.target={x:spot.x+(Math.random()-.5)*1.2,z:spot.z+(Math.random()-.5)*1.2};if(run){bd.mixer.stopAllAction();bd.mixer.clipAction(run).play();}});});
   setTimeout(()=>{for(const bd of act2Bandits.splice(0))scene.remove(bd.holder);},9000);return true;}
  case 'surgir-misteriosa':worldAudio.whoosh();if(pack&&pack.clones[0]){const h=pack.clones[0].holder;storyAnchors.rival={x:h.position.x,z:h.position.z,yaw:h.rotation.y};}return true;
  case 'apontar-arma':if(actions.attack)playOnce('attack',.1);return true;
  case 'misteriosa-parte':if(rivalClone)storyFx.push({t:0,tick(t){rivalClone.holder.position.x+=.06;if(t>1.2){rivalClone.holder.visible=false;return false;}},finish(){if(rivalClone)rivalClone.holder.visible=false;}});worldAudio.whoosh();return true;
  case 'eliminar':{const c=act2DyingClone;storyFlash('#200000',500);worldAudio.hit();if(c)storyFx.push({t:0,tick(t){c.holder.scale.setScalar(Math.max(.01,1-t));if(t>1){c.holder.visible=false;return false;}},finish(){c.holder.visible=false;}});return true;}
  case 'circulo-magico':{const r=volcanoArena&&volcanoArena.refs;if(r&&r.circle){worldAudio.magic('magic3');storyFx.push({t:0,tick(t){r.circle.material.opacity=Math.min(1,t);r.circle.rotation.z+=.01;if(t>8){r.circle.material.opacity=0;return false;}},finish(){r.circle.material.opacity=0;}});}return true;}
  case 'purificar':{const r=volcanoArena&&volcanoArena.refs;worldAudio.celestial();storyFlash('white',1600);if(r&&r.bodies)setTimeout(()=>{r.bodies.visible=false;},700);
   const L=volcanoLocal(VOLCANO.lab),beams=[];for(let i=0;i<6;i++){const s=glowSprite(0xfff2c8,.9,2);s.position.set(L.x+(Math.random()-.5)*12,voidSpec.y+1,L.z+(Math.random()-.5)*12);scene.add(s);beams.push(s);}
   storyFx.push({t:0,tick(t){for(const s of beams){s.position.y+=.08;s.material.opacity=Math.max(0,.9-t*.3);}if(t>3){for(const s of beams)scene.remove(s);return false;}},finish(){for(const s of beams)scene.remove(s);}});return true;}
  case 'surgir-tres':startPack({rig:'enemy2',profile:'demon2',hp:ACT2.enemy2Hp,spots:VOLCANO.labSpots.map(volcanoLocal),hold:true,onDone:labCleared});storyFlash('#300000',500);worldAudio.corrupt();return true;
  case 'abrir-porta':{const r=volcanoArena&&volcanoArena.refs;worldAudio.portalEnter();if(r&&r.door)storyFx.push({t:0,tick(t){r.door.position.y=-Math.min(4.4,t*2);if(t>2.3)return false;},finish(){r.door.position.y=-4.4;}});return true;}
  case 'anjo-fica-ouro':{const G=volcanoLocal(VOLCANO.gold);guide.position.set(G.x+1.5,voidSpec.y,G.z);guidePinned=true;return true;}
  case 'surgir-cinco':startPack({rig:'enemy2',profile:'demon2',hp:ACT2.enemy2Hp,spots:VOLCANO.hallSpots.map(volcanoLocal),hold:true,onDone:hallCleared});storyFlash('#300000',500);worldAudio.corrupt();return true;
  case 'surgir-mini-chefe':startPack({rig:'enemy2',profile:'miniboss2',hp:ACT2.minibossHp,spots:[volcanoLocal(VOLCANO.miniboss)],hold:true,scale:1.8,onDone:minibossDown});worldAudio.corrupt();cameraShake(.25);
   if(pack&&pack.clones[0]){pack.clones[0].holder.scale.setScalar(1.8);const h=pack.clones[0].holder;storyAnchors.enemy={x:h.position.x,z:h.position.z,y:voidSpec.y,yaw:Math.atan2(P.x-h.position.x,P.z-h.position.z)};}return true;
  case 'portal-surge':syncVolcanoPortal();if(!volcanoPortal){volcanoPortal=buildDimensionPortal(THREE,'bishop2');if(volcanoPortal){const p=volcanoLocal(VOLCANO.portal);volcanoPortal.group.position.set(p.x,voidSpec.y,p.z);volcanoPortal.group.scale.setScalar(.42);scene.add(volcanoPortal.group);}}if(volcanoPortal)volcanoPortal.setActive(true);worldAudio.portalEnter();storyFlash('#400010',700);return true;
  case 'visao-inicio':{
   // Visão: o mundo aparece por alguns segundos (a dimensão some), com o vulcão em erupção sobre a cidade.
   if(!act2World)buildAct2World();storyAnchors.city={x:CITY.x,z:CITY.z,yaw:0};const arena=dimKey?dimArenas[dimKey]:null;visionSave={pos:player.position.clone(),key:dimKey,spec:{...voidSpec}};
   voidMode=false;if(arena)arena.group.visible=false;enemy.visible=false;skyDome.visible=true;setGameHour(19);eruption=1;worldAudio.thunder&&worldAudio.thunder();cameraShake(.3);
   for(const f of act2World.fires)f.visible=true;storyFx.push({t:0,tick(t){if(t>.3)player.position.copy(visionSave?visionSave.pos:player.position);if(!visionSave)return false;},finish(){}});
   return true;}
  case 'visao-fim':{if(!visionSave)return true;const s=visionSave;visionSave=null;voidMode=true;voidSpec=s.spec;dimKey=s.key;const arena=dimKey?dimArenas[dimKey]:null;if(arena)arena.group.visible=true;skyDome.visible=false;eruption=0;enemy.visible=true;player.position.copy(s.pos);for(const f of act2World.fires)f.visible=false;return true;}
  case 'ato-3':{const card=cineEl('act-card');card.querySelector('#act-kicker').textContent='GALÁXIA 1 · GANÂNCIA';card.querySelector('h2').textContent='ATO III';card.querySelector('#act-bishop').textContent='A sombra no céu';card.classList.remove('hidden');worldAudio.chapter();return true;}
  case 'fecha-cartao':cineEl('act-card').classList.add('hidden');return true;
  case 'sombra-no-ceu':{loadRig('bishop4').then(rg=>{const c=cloneSkinned(rg.model);c.visible=true;c.traverse(o=>{if(o.isMesh)o.material=new THREE.MeshBasicMaterial({color:0x020204,fog:false});});const h=new THREE.Group();h.add(c);h.scale.setScalar(4.5);const s=Math.sin(playerYaw),k=Math.cos(playerYaw),x=P.x+s*16,z=P.z+k*16;h.position.set(x,P.y+14,z);h.rotation.y=Math.atan2(P.x-x,P.z-z);scene.add(h);const m=new THREE.AnimationMixer(c);if(rg.actions.idle)m.clipAction(rg.actions.idle.getClip()).play();bishop4Sky={holder:h,mixer:m,t:0,y:h.position.y};storyAnchors.sky={x,z,y:h.position.y-6,yaw:h.rotation.y};},()=>{});
   {const s=Math.sin(playerYaw),k=Math.cos(playerYaw);storyAnchors.sky={x:P.x+s*16,z:P.z+k*16,y:P.y+8,yaw:Math.atan2(-s,-k)};}worldAudio.corrupt();return true;}
  case 'feitico':{const g=storyAnchors.sky;if(!g)return true;const ring=glowSprite(0x8a20ff,.9,3);ring.position.set(g.x,g.y+10,g.z);scene.add(ring);storyFx.push({t:0,tick(t){ring.scale.setScalar(3+t*4);ring.material.opacity=.9-t*.15;if(t>5){scene.remove(ring);return false;}},finish(){scene.remove(ring);}});worldAudio.magic('ultimate');return true;}
  case 'buraco-negro':{const g=storyAnchors.sky;if(!g)return true;const hole=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:0}));const halo=glowSprite(0xb02aff,.9,8);const grp=new THREE.Group();grp.add(hole,halo);grp.position.set(g.x,g.y+12,g.z);scene.add(grp);
   storyFx.push({t:0,tick(t){const k=Math.min(1,t/2.4);grp.scale.setScalar(1+k*5);grp.position.lerpVectors(new THREE.Vector3(g.x,g.y+12,g.z),new THREE.Vector3(CITY.x,groundHeightAt(CITY.x,CITY.z)+4,CITY.z),k);if(t>2.6){scene.remove(grp);return false;}},finish(){scene.remove(grp);}});cameraShake(.3);return true;}
  case 'explosao':{worldAudio.hit();worldAudio.portalEnter();cameraShake(.6);vibrate(120);setCineFade(1,.25,true);
   // O Anjo empurra o herói; a cidade some no abismo.
   setTimeout(()=>{act2Abyss=true;syncAct2World();guide.visible=false;const n=DISTRICT_SPOTS.note;player.position.set(n.x+1.2,terrainHeightAt(n.x+1.2,n.z),n.z+1);faceTo(player,CITY);if(actions.kipUp){playOnce('kipUp',0);actions.kipUp.paused=true;actions.kipUp.time=0;}},500);return true;}
  case 'piscar-branco':{let n=0;const blink=()=>{setCineFade(n%2?.0:1,.2,true);n++;if(n<5)setTimeout(blink,300);else setCineFade(0,.8,true);};blink();return true;}
  case 'acordar':if(actions.kipUp)actions.kipUp.paused=false;setTimeout(()=>{if(cineActive&&actions.idle)play('idle',.4);},1600);return true;
  case 'abismo':worldAudio.reveal();if(bishop4Sky){scene.remove(bishop4Sky.holder);bishop4Sky=null;}return true;
  case 'bilhete':syncAct2World();if(act2World)act2World.note.visible=true;return true;
 }
 return false;
}
function startBishop2Dimension(){
 updateHeartsHud(true);if(!canChallengeBishop(heartState)){showDialogue([{who:'Anjo-Guia',text:'Sem corações, não. Espere um voltar — '+formatTimer(msToNextHeart(heartState))+'.'}]);return;}
 inVolcano=false;voidSpec.walk=null;guidePinned=false;for(const s of volcanoStatues)s.holder.visible=false;if(volcanoPortal)volcanoPortal.setActive(false);
 const back={x:CITY.x+26,z:CITY.z};
 startDimensionBattle('bishop2',{hp:ACT2.bossHp,returnTo:back,onVictory:act2Victory,onAbort:()=>{const g=DISTRICT_SPOTS.volcanoGate;player.position.set(g.x+4,terrainHeightAt(g.x+4,g.z),g.z);status.textContent='Sem corações. Recupere um e volte ao portal, no fundo do vulcão.';}});
}
let bishop2LoadState='idle';
function loadBishop2(){if(bishop2LoadState!=='idle')return;bishop2LoadState='loading';loadRig('bishop2').then(()=>{bishop2LoadState='ready';},()=>{bishop2LoadState='failed';status.textContent='Falha ao carregar o Segundo Bispo. Recarregue a página.';});}
function act2BossTick(){
 if(questStep!==ACT2.boss||!enemy.visible||!enemyAlive||encounterProfile!=='vorgazhek')return;
 if(!bossRageAnnounced&&bossPhase(enemyHP,enemyMaxHP)===2){bossRageAnnounced=true;showCombatCallout('FÚRIA DO ARAUTO');status.textContent='VORGAZHEK: “'+vorgazhekRageLine()+'”';enemyCastCooldown=0;cameraShake(.2);vibrate(60);}
}
function act2Victory(){
 const r=afterVorgazhek({vorgazhekRewardClaimed,bishopsDefeated});
 if(r.coinsGained){coins+=r.coinsGained;gainXp(r.xpGained);bumpStat('bishops');}
 bestiaryKnown.add('vorgazhek');questStep=r.questStep;act1Sub=0;bishopsDefeated=r.bishopsDefeated;vorgazhekRewardClaimed=true;
 enemy.visible=false;useRig('enemy1');const hud=document.getElementById('enemy-hud');if(hud)hud.classList.remove('boss');
 save3DProgress();updateQuestHud();syncAct2World();setGameHour(17);
 showRewardPop((r.coinsGained?'+'+r.coinsGained+' MOEDAS · ':'')+(r.xpGained?'+'+r.xpGained+' XP':''));act1Toast('VORGAZHEK CAIU · SEGUNDO SELO');
}
function bossDefeatedPlayer(){
 // Queda diante do Bispo: custa um coração; sem corações, o portal expulsa o jogador (volta à entrada do vulcão).
 spendHeart('bishop2');enemyHP=enemyMaxHP;bossRageAnnounced=false;
 if(heartState.hearts<=0){enemy.visible=false;status.textContent='Sem corações. Recupere um e volte ao portal, no fundo do vulcão.';}
}
function showActCard2(){const card=document.getElementById('act-card');if(!card)return;card.querySelector('#act-kicker').textContent='GALÁXIA 1 · GANÂNCIA';card.querySelector('h2').textContent='ATO II';card.querySelector('#act-bishop').textContent='A cidade do vulcão';card.classList.remove('hidden');worldAudio.chapter();const hide=()=>{card.classList.add('hidden');card.removeEventListener('pointerdown',hide);};card.addEventListener('pointerdown',hide);setTimeout(hide,4200);}
// MOD 205 — a antiga missão (família, livros-caixa e selo) deu lugar ao roteiro; a lógica nova está em updateAct2Story().
function act2Interact(){return false;}
function startAct2Travel(){questStep=ACT2.travel;act1Sub=0;cycleT=0;save3DProgress();updateQuestHud();gorgeGate.sync();showActCard2();status.textContent='Siga a oeste, pela Garganta, até a cidade do vulcão.';}
function act2TalkLabel(){return '';}
function updateAct2(dt,now){
 if(questStep>=15&&!cineActive&&!guidePinned){const g=GUIDE_ACT2_SPOT;if(Math.hypot(guide.position.x-g.x,guide.position.z-g.z)>.5){guide.position.x=g.x;guide.position.z=g.z;}}
 updateAct2Weather(dt,now);updateAct2Story(dt,now);
 if(questStep===ACT2.boss&&bishop2LoadState==='idle')loadBishop2();
 act2BossTick();
}
gorgeGate.sync();
/* MOD 206 — Marco 4: Ato III como no roteiro original (docs/roteiro/M4-ATO3.md). A cidade de neve ocupa o vale leste
   (o antigo Vale do Altar); a estalagem, a caverna de gelo e a dimensão distorcida são áreas abaixo do mundo, como o
   esgoto e o vulcão. Modelos novos do Blender: NeveKit.glb (cidade, estalagem, guilhotina) e Casaco.glb (o casaco). */
var act3World=null,act3Void=null,act3Npcs={},act3Folk=[],coatOwned=!!saved3DProgress.coatOwned,coatOn=!!saved3DProgress.coatOn,zarkhaelClaimed=!!saved3DProgress.zarkhaelClaimed;
var coldWarned=false,coatMesh=null,act3Clones=[],act3Portal=null,act3ZPortal=null,act3Raid=false,guideRun=null,greedClone=null,act3Climate={cold:false,speed:1,mana:1,dps:0},act3ColdAcc=0,act3Ready=true;
RIG_DEFS.anjo={file:'./AnjoGuia-lod.glb?v=mod194-lod',extra:'./Protagonista.glb?mod172-grounding',height:1.05,roles:{idle:'Idle',walk:'Walking',run:'Running',attack:'Skill_01',cast:'Skill_03',hit:'Hit Knockback',death:'Hit Knockback'},inPlace:['attack','cast','death','hit']};
Object.assign(SPEAKER_ACTOR,{[SPEAKERS3.seller]:'seller',[SPEAKERS3.fisher]:'fisher',[SPEAKERS3.villager]:'villager',[SPEAKERS3.keeper]:'keeper',[SPEAKERS3.miniboss]:'enemy',[SPEAKERS3.boss]:'enemy',[SPEAKERS3.greed]:'greed'});
Object.assign(STORY_EYE,{seller:1.5,fisher:1.3,villager:1.5,keeper:1.5,snowcity:2,greed:2.2});
const SC=SNOW_CITY;
function act3Local(key,p){const c=DIMENSIONS[key].center;return{x:p.x+c.x,z:p.z+c.z};}
/* ---------- A cidade de neve: casas, estalagem, lago congelado, guilhotina, caverna e neve caindo ---------- */
function buildAct3World(){
 if(act3World)return act3World;const W=act3World={kit:null,folkReady:false};
 // O antigo Vale do Altar (Ato III anterior) sai de cena: ídolos, altar e moradores dele.
 for(const idol of lateProps.idols)idol.g.visible=false;
 for(let i=marketObstacles.length-1;i>=0;i--){const o=marketObstacles[i];if(stepDef(18).def.items.some(p=>Math.abs(p.x-o.x)<.01&&Math.abs(p.z-o.z)<.01)||(o.shape==='box'&&Math.abs(o.x-stepDef(19).def.at.x)<.01&&Math.abs(o.z-(stepDef(19).def.at.z-7))<.01))marketObstacles.splice(i,1);}
 scene.traverse(o=>{if(o.isMesh&&o.parent&&o.parent.parent===scene&&Math.abs(o.parent.position.x-stepDef(19).def.at.x)<.01&&Math.abs(o.parent.position.z-(stepDef(19).def.at.z-6))<.01)o.parent.visible=false;});
 for(const k of ['resistente'])if(lateNpcs[k])lateNpcs[k].visible=false;
 // Lago congelado com o buraco do pescador.
 const L=SC.lake,ice=new THREE.Mesh(new THREE.CircleGeometry(L.r,48),new THREE.MeshStandardMaterial({color:0xcfe4f4,roughness:.12,metalness:.15,emissive:0x1a3048,emissiveIntensity:.25}));ice.rotation.x=-Math.PI/2;ice.position.set(L.x,groundHeightAt(L.x,L.z)+.05,L.z);ice.receiveShadow=true;scene.add(ice);W.ice=ice;
 // Neve caindo em volta do herói (uma chamada de desenho).
 const N=520,sp=new Float32Array(N*3);for(let i=0;i<N;i++){sp[i*3]=(Math.random()-.5)*60;sp[i*3+1]=Math.random()*22;sp[i*3+2]=(Math.random()-.5)*60;}
 const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
 W.snow=new THREE.Points(sg,new THREE.PointsMaterial({map:softDot,color:0xffffff,size:.22,transparent:true,opacity:.9,depthWrite:false}));W.snow.frustumCulled=false;W.snow.visible=false;scene.add(W.snow);W.snowGeo=sg;
 // Incêndios da noite do ataque.
 W.fires=[];for(const [x,z] of [[133,-30],[129,-44],[146,-62],[175,-35],[147,-22],[184,-46],[152,-30],[138,-52]])for(let k=0;k<3;k++){const s=glowSprite(0xff6a18,.85,2.4+Math.random()*2.2);const fx=x+(Math.random()-.5)*4,fz=z+(Math.random()-.5)*4;s.position.set(fx,groundHeightAt(fx,fz)+1.3,fz);s.visible=false;scene.add(s);W.fires.push(s);}
 // Entrada da caverna de gelo: arco de rocha com gelo, na encosta.
 const C=SC.cave,cy=groundHeightAt(C.x,C.z),arch=new THREE.Group();arch.position.set(C.x,cy,C.z);arch.rotation.y=C.yaw;scene.add(arch);
 const rock=new THREE.MeshStandardMaterial({color:0x6a7684,roughness:.9,flatShading:true});
 for(const sx of [-1,1]){const p=new THREE.Mesh(new THREE.DodecahedronGeometry(2.6,0),rock);p.scale.set(.9,1.8,1);p.position.set(sx*3.2,2.2,0);arch.add(p);}
 const top=new THREE.Mesh(new THREE.DodecahedronGeometry(3.4,0),rock);top.scale.set(1.6,.8,1);top.position.set(0,5.2,0);arch.add(top);
 const mouth=new THREE.Mesh(new THREE.CircleGeometry(2.6,24),new THREE.MeshBasicMaterial({color:0x0a1420}));mouth.position.set(0,2.2,-.4);mouth.scale.y=1.25;arch.add(mouth);
 const glow=glowSprite(0x8ac8ff,.55,6);glow.position.set(0,2.4,.2);arch.add(glow);W.cave=arch;
 // Kit da cidade (Blender).
 new GLTFLoader().load('./NeveKit.glb?v=mod206',gltf=>{
  const kit={};for(const c of gltf.scene.children)kit[c.name]=c;W.kit=kit;
  const place=(k,x,z,yaw,shadow)=>{const src=kit[k];if(!src)return null;const o=src.clone();o.position.set(x,groundHeightAt(x,z),z);o.rotation.y=yaw||0;o.traverse(m=>{if(m.isMesh){m.castShadow=!!shadow;m.receiveShadow=true;}});scene.add(o);return o;};
  for(const h of SC.houses){place(h.k,h.x,h.z,h.yaw,true);marketObstacles.push({x:h.x,z:h.z,shape:'circle',radius:h.k==='CasaNeveB'?3.1:3.3,height:4});}
  const I=SC.inn;place('Estalagem',I.x,I.z,I.yaw,true);marketObstacles.push({x:I.x,z:I.z,shape:'box',halfX:4.4,halfZ:3.4,height:5});
  const G=SC.guillotine;W.guillotine=place('Guilhotina',G.x,G.z,G.yaw,true);W.blade=place('Lamina',G.x,G.z,G.yaw,false);if(W.blade){W.bladeY=W.blade.position.y;W.blade.position.y+=5.0;W.blade.position.z+=.5;}
  marketObstacles.push({x:G.x,z:G.z,shape:'box',halfX:1.8,halfZ:1.3,height:1});
  for(const l of SC.lanterns){place('Lanterna',l.x,l.z,0,false);}
  for(const [x,z] of SC.pines)place('Pinheiro',x,z,Math.random()*6,true);
  place('BuracoGelo',SC.fisher.x-1.4,SC.fisher.z,0,false);place('Banquinho',SC.fisher.x,SC.fisher.z,0,false);const rod=place('VaraPesca',SC.fisher.x,SC.fisher.z,-Math.PI/2,false);
  syncAct3World();
 },undefined,e=>console.warn('NeveKit.glb não carregou.',e));
 // Moradores: vendedor de casacos, pescador, moradora, estalajadeiro e gente de casaco pela cidade.
 npcBase().then(b=>{
  const mk=(key,p,tint,clip,yaw)=>{const v=makeTownsfolk(b,tint,clip);v.holder.position.set(p.x,groundHeightAt(p.x,p.z),p.z);v.holder.rotation.y=yaw||0;act3Npcs[key]=v;return v;};
  mk('seller',SC.seller,0x7a6a5a,'Agree_Gesture',-Math.PI/2);mk('fisher',SC.fisher,0x5a6a7a,'_01a156a3_6952_769b_94bf_2cf0e9d19b46',SC.fisher.yaw);mk('villager',SC.villager,0x9a7a8a,'Alert',.6);
  const tints=[0x6a5a4a,0x5a4a5a,0x7a6a6a,0x4a5a6a,0x8a7a6a];SC.folk.forEach((p,i)=>{const v=makeTownsfolk(b,tints[i%5],i%2?'Alert':'_01a156a3_6952_769b_94bf_2cf0e9d19b46');v.holder.position.set(p.x,groundHeightAt(p.x,p.z),p.z);v.holder.rotation.y=Math.random()*6;act3Folk.push({...v,home:p});});
  W.folkReady=true;syncAct3World();
 },()=>{});
 syncAct3World();return W;
}
function syncAct3World(){
 const W=act3World;if(!W)return;const q=questStep,s=act1Sub;
 const night=(q===16&&s>=2)||q===17;const raid=q===17&&s>=2;
 for(const f of W.fires)f.visible=raid||(q===17&&s>=3)||(q>=18&&q<=19);
 if(act3Npcs.seller)act3Npcs.seller.holder.visible=q>=15&&q<=19&&!act3Void;
 if(act3Npcs.fisher)act3Npcs.fisher.holder.visible=q>=15&&!night&&q<17&&!act3Void;
 if(act3Npcs.villager)act3Npcs.villager.holder.visible=(q===15||q===16&&s<=1)&&!act3Void;
 for(const f of act3Folk)f.holder.visible=(q===15||(q===16&&s<=1))&&!act3Void;
 if(W.blade&&!W.bladeDrop)W.blade.position.y=W.bladeY+5.0;
}
function updateAct3World(dt,now){
 const W=act3World;if(!W)return;const P=player.position,inCity=inSnowCity(P.x,P.z)&&!voidMode;
 W.snow.visible=(inCity||Math.hypot(P.x-SC.center.x,P.z-SC.center.z)<SC.radius+30)&&!voidMode;
 if(W.snow.visible){W.snow.position.set(P.x,0,P.z);const a=W.snowGeo.attributes.position;for(let i=0;i<a.count;i++){let y=a.array[i*3+1]-dt*(1.4+(i%7)*.15);if(y<groundHeightAt(P.x,P.z)-1)y+=22;a.array[i*3+1]=y;a.array[i*3]+=Math.sin(now*.0007+i)*dt*.4;}a.needsUpdate=true;}
 for(const f of W.fires)if(f.visible)f.material.opacity=.65+Math.sin(now*.009+f.position.x)*.2;
 for(const v of Object.values(act3Npcs)){v.mixer.update(dt);}
 for(const f of act3Folk){f.mixer.update(dt);if(f.target){const h=f.holder,dx=f.target.x-h.position.x,dz=f.target.z-h.position.z,d=Math.hypot(dx,dz);if(d>.4){h.position.x+=dx/d*dt*3;h.position.z+=dz/d*dt*3;h.rotation.y=Math.atan2(dx,dz);h.position.y=groundHeightAt(h.position.x,h.position.z);}else{h.visible=false;f.target=null;}}}
 if(greedClone)greedClone.mixer.update(dt);
 for(const c of act3Clones)if(c.mixer)c.mixer.update(dt);
 if(act3Portal&&act3Portal.visible){act3Portal.rotation.z+=dt*.8;}
 if(act3ZPortal&&act3ZPortal.group.visible)act3ZPortal.update(now,camera,innerHeight*renderer.getPixelRatio());
 // Céu e névoa da cidade de neve (mais branca de dia, azulada à noite).
 if(inCity&&scene.fog){scene.fog.color.lerp(new THREE.Color(dayNightState.t>.5?0x2a3448:0xd8e2ec),.25);scene.fog.near=Math.min(scene.fog.near,12);scene.fog.far=Math.min(scene.fog.far,120);}
}
/* ---------- O casaco: compra, equipamento, efeitos e o frio ---------- */
let coatLoad=null;
function attachCoat(){
 // O casaco (Blender) sai sem esqueleto: os marcadores do arquivo são levados até as mesmas juntas do herói na pose
 // de ligação, e cada vértice recebe os pesos do vértice mais próximo do corpo. Assim ele dobra com qualquer animação.
 if(coatMesh||coatLoad||!model)return coatLoad;let pm=null;model.traverse(o=>{if(o.isSkinnedMesh&&!pm)pm=o;});if(!pm)return null;
 coatLoad=new Promise(res=>new GLTFLoader().load('./Casaco.glb?v=mod206',gltf=>{
  let src=null;const marks={};gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isMesh)src=o;else if(/^M_/.test(o.name))marks[o.name.slice(2)]=new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);});
  if(!src){res(null);return;}
  const idx={};pm.skeleton.bones.forEach((b,i)=>idx[b.name.replace(/^mixamorig:?/,'')]=i);const P=[],Q=[];
  for(const n in marks){const i=idx[n];if(i===undefined)continue;P.push(marks[n]);Q.push(new THREE.Vector3().setFromMatrixPosition(pm.skeleton.boneInverses[i].clone().invert()).applyMatrix4(pm.bindMatrixInverse));}
  const A=new THREE.Matrix4().set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0),e=A.elements,rows=[[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  for(let k=0;k<P.length;k++){const a=[P[k].x,P[k].y,P[k].z,1],q=[Q[k].x,Q[k].y,Q[k].z];for(let r=0;r<4;r++){for(let c=0;c<4;c++)e[c*4+r]+=a[r]*a[c];for(let d=0;d<3;d++)rows[d][r]+=a[r]*q[d];}}
  const ie=A.clone().invert().elements,cf=rows.map(rw=>[0,1,2,3].map(r=>[0,1,2,3].reduce((s,c)=>s+ie[c*4+r]*rw[c],0)));
  const g=src.geometry.clone();g.applyMatrix4(src.matrixWorld);g.applyMatrix4(new THREE.Matrix4().set(...cf[0],...cf[1],...cf[2],0,0,0,1));
  const bp=pm.geometry.attributes.position,bi=pm.geometry.attributes.skinIndex,bw=pm.geometry.attributes.skinWeight,cp=g.attributes.position,n=cp.count;
  const box=new THREE.Box3().setFromBufferAttribute(bp),sz=box.getSize(new THREE.Vector3()),cell=Math.max(sz.x,sz.y,sz.z)/24,grid=new Map(),key=(x,y,z)=>x+','+y+','+z;
  for(let i=0;i<bp.count;i++){const k=key(Math.floor(bp.getX(i)/cell),Math.floor(bp.getY(i)/cell),Math.floor(bp.getZ(i)/cell));let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(i);}
  const si=new Uint16Array(n*4),sw=new Float32Array(n*4);
  for(let v=0;v<n;v++){const x=cp.getX(v),y=cp.getY(v),z=cp.getZ(v),cx=Math.floor(x/cell),cy=Math.floor(y/cell),cz=Math.floor(z/cell);let best=0,bd=Infinity;
   for(let r=1;r<=3&&bd===Infinity;r++)for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++)for(let dz=-r;dz<=r;dz++){const a=grid.get(key(cx+dx,cy+dy,cz+dz));if(!a)continue;for(const i of a){const d=(bp.getX(i)-x)**2+(bp.getY(i)-y)**2+(bp.getZ(i)-z)**2;if(d<bd){bd=d;best=i;}}}
   si[v*4]=bi.getX(best);si[v*4+1]=bi.getY(best);si[v*4+2]=bi.getZ(best);si[v*4+3]=bi.getW(best);sw[v*4]=bw.getX(best);sw[v*4+1]=bw.getY(best);sw[v*4+2]=bw.getZ(best);sw[v*4+3]=bw.getW(best);}
  g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));
  const m=src.material;if(m){m.metalness=0;m.roughness=.85;}
  coatMesh=new THREE.SkinnedMesh(g,m);coatMesh.position.copy(pm.position);coatMesh.quaternion.copy(pm.quaternion);coatMesh.scale.copy(pm.scale);pm.parent.add(coatMesh);coatMesh.bind(pm.skeleton,pm.bindMatrix);coatMesh.frustumCulled=false;coatMesh.castShadow=true;coatMesh.visible=coatOn;
  res(coatMesh);
 },undefined,err=>{console.warn('Casaco.glb não carregou.',err);coatLoad=null;res(null);}));
 return coatLoad;
}
function setCoat(on){coatOn=!!on&&coatOwned;if(coatOn&&!coatMesh)attachCoat();if(coatMesh)coatMesh.visible=coatOn;applyLevelStats(false);save3DProgress();}
function coatHpBonus(){return typeof coatOn!=='undefined'&&coatOn?COAT.hp:0;}
function act3SpeedMul(){return act3Climate.speed;}
function act3ManaMul(){return act3Climate.mana;}
function updateClimate(dt){
 const inCity=!voidMode&&inSnowCity(player.position.x,player.position.z)&&questStep>=ACT3N.road;
 act3Climate=climate(inCity,coatOn&&questStep>=ACT3N.road);
 const chip=document.getElementById('cold-chip');if(chip)chip.hidden=!act3Climate.cold||cineActive||dialogueOpen;
 if(act3Climate.cold&&playerHP>1&&!cineActive){act3ColdAcc+=dt*act3Climate.dps;if(act3ColdAcc>=1){const k=Math.floor(act3ColdAcc);act3ColdAcc-=k;playerHP=Math.max(1,playerHP-k);updatePlayerHud();}}
 if(act3Climate.cold&&!coldWarned&&!act1Busy()){coldWarned=true;showDialogue([{who:playerName||'Herói',text:COLD_LINE}]);}
}
/* ---------- Áreas abaixo do mundo: estalagem, caverna de gelo e dimensão distorcida ---------- */
function enterAct3Void(key,at){
 act3Void=key;const a=getDimArena(key);enterDimensionArena(key);
 voidSpec.walk=key==='estalagem'?innWalkable:key==='gelo'?iceCaveWalkable:distortedWalkable;
 const p=act3Local(key,at);player.position.set(p.x,voidSpec.y,p.z);playerYaw=at.yaw||0;player.rotation.y=playerYaw;cameraYaw=playerYaw+Math.PI;moveVX=moveVZ=0;
 checkpointX=p.x;checkpointZ=p.z;camera.position.set(p.x,voidSpec.y+3,p.z+6);
 if(key==='estalagem'){furnishInn(a);if(questStep===ACT3N.city&&!act3Npcs.keeperHall)npcBase().then(b=>{if(act3Void!=='estalagem'||act3Npcs.keeperHall)return;const k=act3Local('estalagem',INN.keeper),v=makeTownsfolk(b,0x8a6a4a,'Agree_Gesture');v.holder.position.set(k.x,voidSpec.y,k.z);v.holder.rotation.y=0;act3Npcs.keeperHall=v;});}
 if(key==='gelo')decorateIceCave(a);distortControls(key==='distorcida');
 syncAct3World();worldAudio.portalEnter();
}
function leaveAct3Void(to){
 act3Void=null;voidSpec.walk=null;distortControls(false);if(act3Npcs.keeperHall){scene.remove(act3Npcs.keeperHall.holder);delete act3Npcs.keeperHall;}leaveVoid();for(const c of act3Clones.splice(0))disposeClone(c);if(act3Portal)act3Portal.visible=false;if(act3ZPortal)act3ZPortal.setActive(false);
 const p=to||SC.inn.door;player.position.set(p.x,terrainHeightAt(p.x,p.z),p.z);checkpointX=p.x;checkpointZ=p.z;syncAct3World();
}
function furnishInn(a){
 if(a.refs.furnished||!act3World||!act3World.kit)return;a.refs.furnished=true;const kit=act3World.kit,c=DIMENSIONS.estalagem.center,y=voidSpec.y;
 const put=(k,p,yaw,s)=>{const src=kit[k];if(!src)return null;const o=src.clone();o.position.set(p.x,0,p.z);o.rotation.y=yaw||0;if(s)o.scale.setScalar(s);o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});a.group.add(o);return o;};
 put('Balcao',INN.counter,0);put('Escada',{x:INN.stairsUp.x,z:INN.stairsUp.z+.6},Math.PI);put('Cama',INN.bed,0);put('Escada',{x:INN.cellarStairs.x,z:INN.cellarStairs.z+.4},0);
 for(let i=-1;i<=1;i++)put('Correntes',{x:INN.chains.x+i*2.6,z:INN.chains.z-.2},0);
}
function decorateIceCave(a){
 if(a.refs.decorated||!act3World||!act3World.kit)return;a.refs.decorated=true;const kit=act3World.kit;
 for(const cr of a.refs.crystals){const o=kit.Cristal.clone();o.position.set(cr.x,0,cr.z);o.rotation.y=cr.yaw;o.scale.setScalar(cr.s);a.group.add(o);}
 for(const ic of a.refs.icicles){const o=kit.Estalactite.clone();o.position.set(ic.x,ic.y,ic.z);o.scale.setScalar(ic.s);a.group.add(o);}
}
function act3Portal3(at){
 // Portal da caverna (aparece "atrás", no túnel por onde se veio): anel de gelo com redemoinho.
 if(!act3Portal){const g=new THREE.Group(),ring=new THREE.Mesh(new THREE.TorusGeometry(2.2,.22,10,40),new THREE.MeshBasicMaterial({color:0x9ad8ff,toneMapped:false}));g.add(ring);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(2.05,40),new THREE.MeshBasicMaterial({color:0x1a3a70,transparent:true,opacity:.85,side:THREE.DoubleSide}));g.add(disc);const gl=glowSprite(0x8ac8ff,.7,7);g.add(gl);scene.add(g);act3Portal=g;}
 act3Portal.position.set(at.x,voidSpec.y+2.4,at.z);act3Portal.visible=true;
}
/* ---------- Etapas do Ato III ---------- */
function updateAct3(dt,now){
 if(questStep>=ACT3N.road&&!act3World)buildAct3World();
 updateAct3World(dt,now);updateClimate(dt);
 if(!cineActive&&questStep>=ACT3N.road&&!guidePinned)guide.visible=false;
 if(guideRun)stepGuideRun(dt);
 if(questStep<ACT3N.road||questStep>ACT3N.boss)return;
 if(questStep===ACT3N.boss&&!rigLoads.bishop3)loadRig('bishop3').catch(()=>{});
 if((questStep===ACT3N.trap||questStep===ACT3N.cave)&&!rigLoads.enemy3)loadRig('enemy3').catch(()=>{});
 const px=player.position.x,pz=player.position.z,near=(p,r)=>Math.hypot(p.x-px,p.z-pz)<r,mark=p=>{questMarker.visible=true;questMarker.position.set(p.x,(voidMode?voidSpec.y:terrainHeightAt(p.x,p.z))+.06,p.z);};
 storyAnchors.snowcity={x:SC.plaza.x,z:SC.plaza.z,yaw:0};
 for(const k of ['seller','fisher','villager'])if(act3Npcs[k]){const h=act3Npcs[k].holder;storyAnchors[k]={x:h.position.x,z:h.position.z,yaw:h.rotation.y};}
 if(!act3World.resumed&&!act1Busy()){act3World.resumed=true;
  // Jogo salvo no meio de uma cena que não se repete sozinha: volta ao começo dela.
  if(questStep===ACT3N.trap&&act1Sub===0&&!act3Void&&!pack){startCellar();return;}
  if(questStep===ACT3N.trap&&act1Sub===1&&!act3Void)act1Advance(ACT3N.trap,2);
  if(questStep===ACT3N.boss&&act1Sub===0&&!dimBattle)act1Advance(ACT3N.cave,3);
 }
 const q=questStep,s=act1Sub;
 if(q===ACT3N.road){
  if(!coatOwned&&!act3World.sellerMet){if(near(SC.seller,7)&&!act1Busy()){act3World.sellerMet=true;offerCoat();return;}}
  mark(near(SC.seller,40)&&!coatOwned&&!act3World.sellerMet?SC.seller:SC.plaza);
  if(near(SC.plaza,30)&&!act1Busy()){act1Lock=true;playStory('cidade-neve',snowArrivalScene(),{focus:'hero',done:()=>{act1Lock=false;act1Advance(ACT3N.city,0);syncAct3World();status.textContent='Pergunte pelo Anjo na cidade.';}});}
  return;
 }
 if(q===ACT3N.city){
  if(s===0){mark(SC.fisher);if(near(SC.fisher,4.5)&&!act1Busy()){act1Lock=true;playStory('pescador',fisherScene(),{focus:'fisher',face:'fisher',done:()=>{act1Lock=false;act1Advance(ACT3N.city,1);}});}}
  else if(s===1){mark(SC.villager);if(near(SC.villager,4.5)&&!act1Busy()){act1Lock=true;playStory('moradora',villagerScene(),{focus:'villager',face:'villager',done:()=>{act1Lock=false;act1Advance(ACT3N.city,2);syncAct3World();status.textContent='Ache um lugar para dormir: a estalagem.';}});}}
  else if(s===2&&!act3Void)mark(SC.inn.door);
  else if(act3Void==='estalagem'){
   storyAnchors.keeper={...act3Local('estalagem',INN.keeper),y:voidSpec.y,yaw:0};
   if(s===2&&!act1Busy()&&near(act3Local('estalagem',INN.keeper),3.6)){act1Lock=true;playStory('estalagem',innScene(),{focus:'keeper',face:'keeper',two:true,done:()=>{act1Lock=false;act1Advance(ACT3N.city,4);status.textContent='Suba para o quarto e descanse.';}});}
   else if(s===2)mark(act3Local('estalagem',INN.keeper));
   else if(s>=3&&s<=4){const inRoom=Math.abs(pz-act3Local('estalagem',INN.room).z)<5;mark(act3Local('estalagem',inRoom?INN.bed:INN.stairsUp));}
  }
  return;
 }
 if(q===ACT3N.trap){
  if(act3Void==='estalagem'){
   if(s===0){storyAnchors.keeper={...act3Local('estalagem',INN.keeperCellar),y:voidSpec.y,yaw:0};}
   if(s===1)mark(act3Local('estalagem',INN.cellarStairs));
   return;
  }
  if(s===1){mark(SC.inn.door);return;}
  if(s===2){if(!act3Raid&&!act1Busy()&&!pack){act3Raid=true;act1Lock=true;startPack({rig:'enemy3',profile:'demon3',hp:ACT3N.enemy3Hp,spots:SC.raid,hold:true,onDone:raidCleared});playStory('ataque',raidScene(),{focus:'enemy',done:()=>{act1Lock=false;releasePack();}});}return;}
  if(s===3){mark(SC.cave);return;}
  return;
 }
 if(q===ACT3N.cave){
  if(!act3Void){mark(SC.cave);return;}
  if(act3Void==='gelo'){
   const E=act3Local('gelo',ICE_CAVE.end);storyAnchors.portal={...act3Local('gelo',ICE_CAVE.portal),y:voidSpec.y+2,yaw:0};
   if(s===0&&!act1Busy()){act1Lock=true;playStory('caverna',caveArrivalScene(),{focus:'guide',done:()=>{act1Lock=false;act1Advance(ACT3N.cave,1);guideRun={path:[act3Local('gelo',ICE_CAVE.path[2]),act3Local('gelo',ICE_CAVE.path[4]),act3Local('gelo',{x:2,z:-36})],i:0,speed:3.2,wait:true,y:voidSpec.y};}});}
   else if(s===1){mark(E);if(near(E,7)&&!act1Busy()){act1Lock=true;guideRun=null;guide.visible=true;guidePinned=true;guide.position.set(px+1.8,voidSpec.y,pz+.6);faceTo(guide,player.position);faceTo(player,guide.position);playStory('fundo',caveEndScene(),{focus:'guide',done:()=>{act1Lock=false;act1Advance(ACT3N.cave,2);guidePinned=false;guide.visible=false;status.textContent='Entre no portal.';}});}}
   else if(s===2){act3Portal3(act3Local('gelo',ICE_CAVE.portal));mark(act3Local('gelo',ICE_CAVE.portal));}
  }
  if(act3Void==='distorcida'){
   storyAnchors.sky={...act3Local('distorcida',{x:0,z:-14}),y:voidSpec.y+9,yaw:0};
   if(s===2&&!act1Busy()&&!pack&&!act3World.distStarted){act3World.distStarted=true;act1Lock=true;playStory('distorcida',distortedScene(),{focus:'enemy',done:()=>{act1Lock=false;releasePack();}});}
   if(s===3){const p=act3Local('distorcida',DISTORTED.portal);mark(p);}
  }
  return;
 }
 if(q===ACT3N.boss){
  if(s===0){if(act3Void==='distorcida')mark(act3Local('distorcida',DISTORTED.portal));return;}
  if(s===1&&!act1Busy()&&!enemy.visible&&!act3World.angelAsked){act3World.angelAsked=true;act1Lock=true;if(!pack)startAngelPack();guide.visible=true;guidePinned=true;const P=player.position;guide.position.set(P.x+2.4,terrainHeightAt(P.x+2.4,P.z),P.z-1);faceTo(guide,P);faceTo(player,guide.position);
   playStory('pergunta',angelQuestionScene(),{focus:'guide',face:'guide',done:()=>{act1Lock=false;releasePack();}});}
 }
}
function stepGuideRun(dt){
 // O Anjo corre na frente e espera o herói se ele ficar para trás.
 const r=guideRun;if(!r)return;guide.visible=true;guidePinned=true;const t=r.path[r.i];if(!t){guideRun=null;faceTo(guide,player.position);return;}
 const gx=guide.position.x,gz=guide.position.z,dx=t.x-gx,dz=t.z-gz,d=Math.hypot(dx,dz),far=Math.hypot(player.position.x-gx,player.position.z-gz)>9;
 if(d<.4){r.i++;return;}if(r.wait&&far){faceTo(guide,player.position);return;}
 const s=Math.min(d,dt*r.speed);guide.position.x+=dx/d*s;guide.position.z+=dz/d*s;guide.position.y=r.y!==undefined?r.y:terrainHeightAt(guide.position.x,guide.position.z);guide.rotation.y=Math.atan2(dx,dz);
}
function act3Label(){
 if(cineActive||questStep<ACT3N.road||questStep>ACT3N.boss)return '';const px=player.position.x,pz=player.position.z,q=questStep,s=act1Sub,d=(p,r)=>Math.hypot(p.x-px,p.z-pz)<=r;
 if(q===ACT3N.road&&!coatOwned&&act3World&&act3World.sellerMet&&act3Npcs.seller&&d(SC.seller,3.2))return 'COMPRAR CASACO';
 if(q>=ACT3N.city&&q<=ACT3N.boss&&!coatOwned&&!act3Void&&act3Npcs.seller&&d(SC.seller,3.2))return 'COMPRAR CASACO';
 if(!act3Void){
  if(q===ACT3N.city&&s>=2&&d(SC.inn.door,3.4))return 'ENTRAR NA ESTALAGEM';
  if((q===ACT3N.cave||(q===ACT3N.trap&&s===3&&!guideRun))&&d(SC.cave,5))return 'ENTRAR NA CAVERNA';
  return '';
 }
 if(act3Void==='estalagem'){
  if(q===ACT3N.city&&s>=3&&d(act3Local('estalagem',INN.stairsUp),2.2))return 'SUBIR AO QUARTO';
  if(q===ACT3N.city&&s>=3&&d(act3Local('estalagem',INN.bed),2.2))return 'DORMIR';
  if(q===ACT3N.city&&d(act3Local('estalagem',INN.door),2))return 'SAIR';
  if(q===ACT3N.trap&&s===1&&d(act3Local('estalagem',INN.cellarStairs),2.4))return 'SUBIR A ESCADA';
 }
 if(act3Void==='gelo'&&q===ACT3N.cave&&s===2&&d(act3Local('gelo',ICE_CAVE.portal),3.4))return 'ENTRAR NO PORTAL';
 if(act3Void==='distorcida'&&q===ACT3N.cave&&s===3&&d(act3Local('distorcida',DISTORTED.portal),4))return 'ATRAVESSAR O PORTAL';
 return '';
}
function act3Interact(){
 const l=act3Label();if(!l)return false;
 if(l==='COMPRAR CASACO'){offerCoat();return true;}
 if(l==='ENTRAR NA ESTALAGEM'){travelVeil(()=>enterAct3Void('estalagem',INN.spawn.hall));return true;}
 if(l==='SAIR'){travelVeil(()=>leaveAct3Void({x:SC.inn.door.x,z:SC.inn.door.z-1.5}));return true;}
 if(l==='SUBIR AO QUARTO'){travelVeil(()=>{const p=act3Local('estalagem',INN.spawn.room);player.position.set(p.x,voidSpec.y,p.z);playerYaw=Math.PI;player.rotation.y=playerYaw;});return true;}
 if(l==='DORMIR'){act1Lock=true;if(act3Npcs.keeperHall){scene.remove(act3Npcs.keeperHall.holder);delete act3Npcs.keeperHall;}
  // De pé ao lado da cama, virado para o meio do quarto (a câmera fica dentro do cômodo).
  {const b=act3Local('estalagem',INN.bed);player.position.set(b.x-1.4,voidSpec.y,b.z+.4);playerYaw=-Math.PI/2;player.rotation.y=playerYaw;}playStory('quarto',bedScene(),{focus:'hero',done:()=>{
startCellar();}});return true;}
 if(l==='SUBIR A ESCADA'){travelVeil(()=>{leaveAct3Void({x:SC.inn.door.x,z:SC.inn.door.z-2});act1Advance(ACT3N.trap,2);syncAct3World();setGameHour(0.5);});return true;}
 if(l==='ENTRAR NA CAVERNA'){travelVeil(()=>{if(questStep===ACT3N.trap)act1Advance(ACT3N.cave,0);guideRun=null;if(act1Sub>=3){enterAct3Void('distorcida',{x:DISTORTED.portal.x,z:DISTORTED.portal.z+6,yaw:Math.PI});storyDo3('portal-zarkhael');return;}enterAct3Void('gelo',ICE_CAVE.spawn);const p=act3Local('gelo',{x:1.6,z:33});guide.position.set(p.x,voidSpec.y,p.z);guide.visible=act1Sub<2;guidePinned=act1Sub<2;faceTo(guide,player.position);});return true;}
 if(l==='ENTRAR NO PORTAL'){travelVeil(()=>{if(act3Portal)act3Portal.visible=false;enterAct3Void('distorcida',DISTORTED.spawn);act3World.distStarted=false;});return true;}
 if(l==='ATRAVESSAR O PORTAL'){startZarkhael();return true;}
 return false;
}
function offerCoat(){act1Lock=true;faceTo(player,SC.seller);if(act3Npcs.seller)faceTo(act3Npcs.seller.holder,player.position);playStory('casaco',coatOfferScene(),{focus:'seller',face:'seller',done:()=>{act1Lock=false;}});}
function coatChoice(accept){
 const card=document.getElementById('choice-card');if(card)card.hidden=true;
 if(!accept){cineDirector.resume();setTimeout(()=>{if(cineActive)return;act1Lock=true;playStory('casaco-nao',coatRefuseScene(),{focus:'seller',done:()=>{act1Lock=false;}});},50);return;}
 const r=buyCoat(coins,coatOwned,COAT.price);cineDirector.resume();
 setTimeout(()=>{act1Lock=true;if(!r.ok){playStory('casaco-sem',coatNoMoneyScene(),{focus:'seller',done:()=>{act1Lock=false;}});return;}
  coins=r.coins;coatOwned=true;updateQuestHud();save3DProgress();showRewardPop('−'+COAT.price+' MOEDAS · CASACO');
  playStory('casaco-sim',coatAcceptScene(),{focus:'seller',done:()=>{act1Lock=false;announceCoat();}});},50);
}
function announceCoat(){
 // O casaco aparece desbloqueado em Equipamentos; o vendedor ensina a equipar (o Anjo está sumido).
 coatJustUnlocked=true;status.textContent='Abra a loja → Equipamentos e equipe o Casaco de Pele.';const b=document.getElementById('shop-btn')||document.querySelector('[data-open-shop]');if(b)b.classList.add('pulse-new');
}
var coatJustUnlocked=false;
function startCellar(){
 // O herói acorda acorrentado no porão; o estalajadeiro e os 3 Enemy3 já estão lá (também ao continuar um jogo salvo).
 if(act3Void!=='estalagem')enterAct3Void('estalagem',INN.spawn.cellar);
 const c=act3Local('estalagem',INN.chains);player.position.set(c.x,voidSpec.y,c.z+.4);playerYaw=0;player.rotation.y=0;cameraYaw=Math.PI;checkpointX=c.x;checkpointZ=c.z+1;act1Advance(ACT3N.trap,0);setGameHour(23);act1Lock=true;
 startPack({rig:'enemy3',profile:'demon3',hp:ACT3N.enemy3Hp,spots:INN.cellarFoes.map(p=>act3Local('estalagem',p)),hold:true,onDone:cellarCleared});
 spawnKeeperCellar();playStory('porao',cellarScene(),{focus:'enemy',done:()=>{act1Lock=false;releasePack();}});
}
function spawnKeeperCellar(){npcBase().then(b=>{const p=act3Local('estalagem',INN.keeperCellar),v=makeTownsfolk(b,0x8a6a4a,'Alert');v.holder.position.set(p.x,voidSpec.y,p.z);v.holder.rotation.y=Math.atan2(INN.cellarFoes[2].x-INN.keeperCellar.x,INN.cellarFoes[2].z-INN.keeperCellar.z);act3Npcs.keeper=v;storyAnchors.keeper={x:p.x,z:p.z,y:voidSpec.y,yaw:v.holder.rotation.y};});}
function cellarCleared(){
 const p=act3Local('estalagem',INN.cellarFoes[2]),c=makeFoeClone('enemy3',p,{role:'idle'});if(c){c.holder.position.y=voidSpec.y;c.holder.scale.y=.82;act3Clones.push(c);storyAnchors.enemy={x:p.x,z:p.z,y:voidSpec.y,yaw:Math.atan2(player.position.x-p.x,player.position.z-p.z)};}
 act1Lock=true;act3World.dying=c;playStory('porao-cai',cellarDefeatScene(),{focus:'enemy',done:()=>{act1Lock=false;delete storyAnchors.enemy;act1Advance(ACT3N.trap,1);status.textContent='Suba a escada e saia da estalagem.';}});
}
function raidCleared(){act1Lock=true;playStory('guilhotina',guillotineScene(),{focus:'hero',done:()=>{act1Lock=false;act1Advance(ACT3N.trap,3);syncAct3World();
 const P=player.position;guide.position.set(P.x+1.6,terrainHeightAt(P.x+1.6,P.z),P.z+1);guideRun={path:SC.anjoPath.map(([x,z])=>({x,z})),i:0,speed:3.6,wait:true};status.textContent='Siga o Anjo.';}});}
function distortedCleared(){
 const p=act3Local('distorcida',DISTORTED.miniboss),x=enemy.position.x||p.x,z=enemy.position.z||p.z,c=makeFoeClone('enemy4',{x,z},{role:'idle',scale:1.6});
 if(c){c.holder.position.y=voidSpec.y;c.holder.scale.set(1.6,1.6*.85,1.6);act3Clones.push(c);storyAnchors.enemy={x,z,y:voidSpec.y,yaw:Math.atan2(player.position.x-x,player.position.z-z)};}
 act1Lock=true;act3World.dying=c;playStory('distorcida-cai',distortedDefeatScene(),{focus:'enemy',done:()=>{act1Lock=false;delete storyAnchors.enemy;act1Advance(ACT3N.cave,3);status.textContent="Atravesse o portal de ZAR'KHAEL.";}});
}
function startZarkhael(){
 updateHeartsHud(true);if(!canChallengeBishop(heartState)){showDialogue([{who:playerName||'Herói',text:'Meus corações se apagaram. Preciso esperar um voltar — '+formatTimer(msToNextHeart(heartState))+'.'}]);return;}
 act3Void=null;voidSpec.walk=null;distortControls(false);if(act3ZPortal)act3ZPortal.setActive(false);for(const c of act3Clones.splice(0))disposeClone(c);
 act1Advance(ACT3N.boss,0);delete storyAnchors.enemy;delete storyAnchors.sky;
 startDimensionBattle('bishop3',{hp:ACT3N.bossHp,returnTo:{x:SC.plaza.x+6,z:SC.plaza.z+6},onVictory:act3Victory,onAbort:()=>{enterAct3Void('distorcida',{x:DISTORTED.portal.x,z:DISTORTED.portal.z+6,yaw:Math.PI});act1Advance(ACT3N.cave,3);status.textContent="Sem corações. Recupere um e atravesse o portal de ZAR'KHAEL de novo.";}});
}
function zarkhaelIntro(){if(!dimBattle||dimBattle.key!=='bishop3'||questStep!==ACT3N.boss)return;playStory('zarkhael',zarkhaelIntroScene(),{focus:'enemy',face:'enemy'});}
function act3Victory(){
 const r=afterZarkhael({claimed:zarkhaelClaimed,bishopsDefeated});
 if(r.coinsGained){coins+=r.coinsGained;gainXp(r.xpGained);bumpStat('bishops');}
 bestiaryKnown.add('zarkhael');bishopsDefeated=r.bishopsDefeated;zarkhaelClaimed=true;lateBossClaimed.zarkhael=true;
 enemy.visible=false;useRig('enemy1');const hud=document.getElementById('enemy-hud');if(hud)hud.classList.remove('boss');
 act1Advance(ACT3N.boss,1);syncAct3World();setGameHour(7);
 showRewardPop((r.coinsGained?'+'+r.coinsGained+' MOEDAS · ':'')+(r.xpGained?'+'+r.xpGained+' XP':''));act1Toast("ZAR'KHAEL CAIU · TERCEIRO SELO");
 act3World.angelAsked=false;startAngelPack();
}
function startAngelPack(){
 startPack({rig:'anjo',profile:'angel',hp:ACT3N.angelHp,spots:[{x:player.position.x+2.4,z:player.position.z-1}],hold:true,onDone:angelDown});
 const hide=()=>{if(pack&&pack.clones[0]&&!cineActive)pack.clones[0].holder.visible=false;};hide();setTimeout(hide,1500);
}
function angelDown(){
 const P=player.position;guide.visible=true;guidePinned=true;const x=enemy.position.x||P.x+2,z=enemy.position.z||P.z;guide.position.set(x,terrainHeightAt(x,z),z);faceTo(guide,P);faceTo(player,guide.position);
 act1Lock=true;playStory('verdade',angelTruthScene(),{focus:'guide',face:'guide',done:()=>{act1Lock=false;finishAct3();}});
}
function finishAct3(){
 guidePinned=false;guide.visible=false;if(greedClone){disposeClone(greedClone);greedClone=null;}
 // O Ato IV do roteiro é o próximo marco; até lá, o jogo segue para o Ato IV atual (a Serra), sem a conversa com o Anjo.
 questStep=ACT3N.next;act1Sub=0;save3DProgress();updateQuestHud();syncAct3World();setCineFade(0,1.2,false);status.textContent='O Anjo foi levado pela Ganância. Siga para a próxima cidade.';
}
function distortControls(on){distorted=!!on;}
var distorted=false;
/** Ações das cenas do Ato III (passos "do"). */
function storyDo3(id,args){
 const P=player.position;
 switch(id){
  case 'dar-casaco':worldAudio.reveal();return true;
  case 'neve-forte':if(act3World)act3World.snow.visible=true;return true;
  case 'todos-entram':for(const f of act3Folk){const h=f.home;let best=null,bd=1e9;for(const hs of SC.houses){const dd=Math.hypot(hs.x-h.x,hs.z-h.z);if(dd<bd){bd=dd;best=hs;}}if(best)f.target={x:best.x+Math.sin(best.yaw)*3,z:best.z+Math.cos(best.yaw)*3};npcBase().then(b=>{const run=b.clips.find(k=>k.name==='Running');if(run){f.mixer.stopAllAction();f.mixer.clipAction(run).play();}});}
   if(act3Npcs.villager){const v=act3Npcs.villager;act3Folk.push({...v,home:SC.villager,target:{x:SC.houses[5].x,z:SC.houses[5].z+3}});delete act3Npcs.villager;}return true;
  case 'anoitecer':setCineFade(.55,1.6,false);setTimeout(()=>{setGameHour(21);setCineFade(0,1.4,false);},1700);return true;
  case 'dormir':setCineFade(1,1.4,false);return true;
  case 'acordar-preso':{let n=0;const blink=()=>{setCineFade(n%2?.0:1,.25,true);n++;if(n<4)setTimeout(blink,350);else setCineFade(0,.8,true);};blink();
   if(actions.kipUp){playOnce('kipUp',0);actions.kipUp.paused=true;actions.kipUp.time=.35;}return true;}
  case 'olhar-correntes':if(actions.kipUp)actions.kipUp.paused=true;return true;
  case 'matar-estalajadeiro':{const k=act3Npcs.keeper;storyFlash('#300000',600);worldAudio.hit();if(k)storyFx.push({t:0,tick(t){k.holder.rotation.x=-Math.min(1.5,t*3);if(t>.6)return false;},finish(){k.holder.rotation.x=-1.5;}});return true;}
  case 'romper-correntes':worldAudio.hit();cameraShake(.25);if(actions.kipUp)actions.kipUp.paused=false;setTimeout(()=>{if(actions.idle)play('idle',.3);},900);return true;
  case 'eliminar3':{const c=act3World&&act3World.dying;storyFlash('#200000',500);worldAudio.hit();if(c)storyFx.push({t:0,tick(t){c.holder.scale.setScalar(Math.max(.01,1-t));if(t>1){c.holder.visible=false;return false;}},finish(){c.holder.visible=false;}});
   if(act3Npcs.keeper){scene.remove(act3Npcs.keeper.holder);delete act3Npcs.keeper;}return true;}
  case 'cidade-em-chamas':syncAct3World();worldAudio.corrupt();return true;
  case 'surgir-quatro':storyFlash('#300000',400);worldAudio.corrupt();return true;
  case 'golpe-por-tras':worldAudio.hit();cameraShake(.5);vibrate(120);setCineFade(1,.15,true);return true;
  case 'na-guilhotina':{const G=SC.guillotine,gx=G.x,gz=G.z+.2;player.position.set(gx,terrainHeightAt(gx,gz)+.9,gz-.5);playerYaw=Math.PI;player.rotation.y=playerYaw;
   if(actions.ajoelhar)playOnce('ajoelhar',0);else if(actions.kipUp){playOnce('kipUp',0);actions.kipUp.paused=true;actions.kipUp.time=.5;}
   loadRig('enemy3').then(()=>{const c=makeFoeClone('enemy3',{x:gx+1.3,z:gz+.6},{role:'idle'});if(c){c.holder.position.y=terrainHeightAt(gx,gz)+.9;act3Clones.push(c);act3World.executioner=c;storyAnchors.enemy={x:gx+1.3,z:gz+.6,y:c.holder.position.y,yaw:-Math.PI/2};}},()=>{});
   storyAnchors.enemy={x:gx+1.3,z:gz+.6,y:terrainHeightAt(gx,gz)+.9,yaw:-Math.PI/2};return true;}
  case 'piscar':{let n=0;const blink=()=>{setCineFade(n%2?.0:1,.22,true);n++;if(n<4)setTimeout(blink,330);else setCineFade(0,.8,true);};blink();return true;}
  case 'anjo-salva':{const ex=act3World.executioner;worldAudio.celestial();storyFlash('white',900);cameraShake(.3);
   if(ex)storyFx.push({t:0,tick(t){ex.holder.position.y+=.08;ex.holder.scale.setScalar(Math.max(.01,1-t*1.4));if(t>.8){ex.holder.visible=false;return false;}},finish(){ex.holder.visible=false;}});
   const G=SC.guillotine;guide.position.set(G.x+2.4,terrainHeightAt(G.x+2.4,G.z-2.4),G.z-2.4);guide.visible=true;guidePinned=true;faceTo(guide,P);
   setTimeout(()=>{player.position.set(G.x+.8,terrainHeightAt(G.x+.8,G.z-2.6),G.z-2.6);if(actions.idle)play('idle',.3);faceTo(player,guide.position);},500);return true;}
  case 'portal-atras':act3Portal3(act3Local('gelo',ICE_CAVE.portal));worldAudio.portalEnter();return true;
  case 'anjo-some':storyFx.push({t:0,tick(t){guide.scale.setScalar(Math.max(.01,1-t));if(t>1){guide.visible=false;guide.scale.setScalar(1);return false;}},finish(){guide.visible=false;guide.scale.setScalar(1);}});worldAudio.whoosh();return true;
  case 'surgir-guardiao':{distortControls(true);
   // O guardião vem com 2 Enemy3: primeiro os dois, depois ele (o motor luta um por vez; todos aparecem juntos).
   const mb=act3Local('distorcida',DISTORTED.miniboss);loadRig('enemy4').then(()=>{const c=makeFoeClone('enemy4',mb,{role:'idle',scale:1.6});if(c){c.holder.position.y=voidSpec.y;act3Clones.push(c);act3World.miniboss=c;}},()=>{});
   storyAnchors.enemy={...mb,y:voidSpec.y,yaw:0};
   startPack({rig:'enemy3',profile:'demon3',hp:ACT3N.enemy3Hp,spots:DISTORTED.foes.map(p=>act3Local('distorcida',p)),hold:true,onDone:()=>{
    const c=act3World.miniboss;if(c){disposeClone(c);const i=act3Clones.indexOf(c);if(i>=0)act3Clones.splice(i,1);act3World.miniboss=null;}
    startPack({rig:'enemy4',profile:'miniboss3',hp:ACT3N.minibossHp,spots:[mb],scale:1.6,onDone:distortedCleared});}});
   worldAudio.corrupt();return true;}
  case 'queimar':{const c=act3World&&act3World.dying;worldAudio.magic('magic3');if(c){const fire=glowSprite(0xff5a10,.95,4);fire.position.copy(c.holder.position);fire.position.y+=2;scene.add(fire);
   c.holder.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.emissive=new THREE.Color(0xff3000);o.material.emissiveIntensity=1.5;}});
   storyFx.push({t:0,tick(t){fire.scale.setScalar(4+t*3);fire.material.opacity=Math.max(0,.95-t*.4);c.holder.scale.y=Math.max(.01,1.6*(1-t*.5));if(t>2){c.holder.visible=false;scene.remove(fire);return false;}},finish(){c.holder.visible=false;scene.remove(fire);}});}return true;}
  case 'portal-zarkhael':{if(!act3ZPortal){act3ZPortal=buildDimensionPortal(THREE,'bishop3');if(act3ZPortal){act3ZPortal.group.scale.setScalar(.32);scene.add(act3ZPortal.group);}}
   if(act3ZPortal){const p=act3Local('distorcida',DISTORTED.portal);act3ZPortal.group.position.set(p.x,voidSpec.y,p.z-3);act3ZPortal.setActive(true);}worldAudio.portalEnter();storyFlash('#101020',600);return true;}
  case 'anjo-magia':{const e=enemy.position;guide.position.set(P.x-2,voidSpec.y,P.z+1.5);guide.visible=true;faceTo(guide,e);worldAudio.magic('ultimate');storyFlash('white',1200);cameraShake(.4);
   const beam=glowSprite(0xfff2c8,.95,3);beam.position.set(e.x,e.y+2,e.z);scene.add(beam);storyFx.push({t:0,tick(t){beam.scale.setScalar(3+t*6);beam.material.opacity=Math.max(0,.95-t*.5);if(t>1.6){scene.remove(beam);return false;}},finish(){scene.remove(beam);}});
   setTimeout(()=>{enemy.visible=false;},700);return true;}
  case 'dimensao-desaba':cameraShake(.6);worldAudio.portalEnter();storyFlash('white',900);return true;
  case 'lutar-anjo':{guide.visible=false;guidePinned=false;if(pack&&pack.clones[0]){const h=pack.clones[0].holder;h.visible=true;h.position.copy(guide.position);}worldAudio.whoosh();return true;}
  case 'ganancia-surge':{const g=guide.position,x=g.x-1.6,z=g.z-1.6;storyAnchors.greed={x,z,yaw:Math.atan2(P.x-x,P.z-z)};storyFlash('#400000',700);worldAudio.corrupt();cameraShake(.3);
   loadRig('greed1').then(()=>{greedClone=makeFoeClone('greed1',{x,z},{role:'idle'});if(greedClone)greedClone.holder.rotation.y=Math.atan2(P.x-x,P.z-z);},()=>{});return true;}
  case 'ganancia-leva':{storyFlash('#200000',900);worldAudio.portalEnter();const gc=greedClone;
   storyFx.push({t:0,tick(t){const k=Math.max(.01,1-t);guide.scale.setScalar(k);if(gc)gc.holder.scale.setScalar(k);if(t>1){guide.visible=false;guide.scale.setScalar(1);if(gc)gc.holder.visible=false;return false;}},finish(){guide.visible=false;guide.scale.setScalar(1);if(gc)gc.holder.visible=false;}});
   const g=guide.position;storyAnchors.sky={x:g.x,z:g.z,y:g.y+6,yaw:0};return true;}
  case 'escuro':setCineFade(1,1.2,false);return true;
  case 'ato-4':{const card=cineEl('act-card');card.querySelector('#act-kicker').textContent='GALÁXIA 1 · GANÂNCIA';card.querySelector('h2').textContent='ATO IV';card.querySelector('#act-bishop').textContent='A próxima cidade';card.classList.remove('hidden');worldAudio.chapter();return true;}
 }
 return false;
}
/* MOD 207 — Marco 5: Ato IV como no roteiro original (docs/roteiro/M5-ATO4.md). A torre de VÉRAXION ocupa a antiga
   Serra sem Ecos; cada piso é a mesma área abaixo do mundo (tema "tower"), redecorada. Modelo novo do Blender: TorreKit.glb. */
var act4World=null,inTower=false,scrollOwned=!!saved3DProgress.scrollOwned,veraxionClaimed=!!saved3DProgress.veraxionClaimed,act4Clones=[],rivalRun=null,act4Rival=null,towerPortal=null,choiceMode='casaco';
Object.assign(SPEAKER_ACTOR,{[SPEAKERS4.rival]:'rival',[SPEAKERS4.bandit]:'bandit',[SPEAKERS4.demon]:'enemy',[SPEAKERS4.miniboss]:'enemy',[SPEAKERS4.leader]:'enemy',[SPEAKERS4.greed]:'greed'});
Object.assign(STORY_EYE,{tower:30});
function towerLocal(p){const c=DIMENSIONS.torre.center;return{x:p.x+c.x,z:p.z+c.z};}
function scrollMul(){return scrollMultiplier(typeof scrollOwned!=='undefined'&&scrollOwned);}
function buildAct4World(){
 if(act4World)return act4World;const W=act4World={kit:null};
 // A antiga Serra sem Ecos (Ato IV anterior) sai de cena: o observatório, o abrigo e o pastor.
 const o=stepDef(25).def.at;scene.traverse(m=>{if(m.parent===scene&&m.isGroup&&Math.abs(m.position.x-o.x)<.01&&Math.abs(m.position.z-o.z)<.01)m.visible=false;});
 for(let i=marketObstacles.length-1;i>=0;i--){const b=marketObstacles[i];if(b.shape==='circle'&&Math.abs(Math.hypot(b.x-o.x,b.z-o.z)-11)<.05)marketObstacles.splice(i,1);}
 if(lateNpcs.civil)lateNpcs.civil.visible=false;
 new GLTFLoader().load('./TorreKit.glb?v=mod207',gltf=>{const kit={};for(const c of gltf.scene.children)kit[c.name]=c;W.kit=kit;
  const B=TOWER.base,t=kit.Torre.clone();t.position.set(B.x,groundHeightAt(B.x,B.z)-.6,B.z);t.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});scene.add(t);W.tower=t;W.towerY=t.position.y;
  W.towerBlock={x:B.x,z:B.z,shape:'circle',radius:TOWER.radius,height:60};marketObstacles.push(W.towerBlock);syncAct4World();
 },undefined,e=>console.warn('TorreKit.glb não carregou.',e));
 // Poeira da queda da torre.
 const N=300,sp=new Float32Array(N*3),sv=[];for(let i=0;i<N;i++){sv.push({a:Math.random()*6.28,r:Math.random()*14,v:2+Math.random()*5});}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(sp,3));W.dust=new THREE.Points(g,new THREE.PointsMaterial({map:softDot,color:0x8a8478,size:5,transparent:true,opacity:.55,depthWrite:false}));W.dust.frustumCulled=false;W.dust.visible=false;scene.add(W.dust);W.dustV=sv;W.dustT=0;
 return W;
}
function syncAct4World(){
 const W=act4World;if(!W||!W.tower)return;const fallen=questStep>ACT4N.after||(questStep===ACT4N.after&&W.fell);
 W.tower.visible=!fallen;const i=marketObstacles.indexOf(W.towerBlock);if(fallen&&i>=0)marketObstacles.splice(i,1);else if(!fallen&&i<0)marketObstacles.push(W.towerBlock);
}
function updateAct4World(dt){
 const W=act4World;if(!W)return;
 if(W.falling&&W.tower){W.fallT+=dt;const k=Math.min(1,W.fallT/4.5);W.tower.position.y=W.towerY-k*k*70;W.tower.rotation.z=k*k*.25;W.tower.rotation.x=k*.08;if(k>=1){W.falling=false;W.fell=true;W.tower.visible=false;}}
 if(W.dust.visible){W.dustT+=dt;const a=W.dust.geometry.attributes.position,B=TOWER.base;for(let i=0;i<W.dustV.length;i++){const v=W.dustV[i],rr=v.r+W.dustT*v.v;a.array[i*3]=B.x+Math.cos(v.a)*rr;a.array[i*3+1]=groundHeightAt(B.x,B.z)+1+Math.min(14,W.dustT*v.v*.6);a.array[i*3+2]=B.z+Math.sin(v.a)*rr;}a.needsUpdate=true;W.dust.material.opacity=Math.max(0,.55-W.dustT*.05);if(W.dustT>11)W.dust.visible=false;}
 for(const c of act4Clones)if(c.mixer)c.mixer.update(dt);
 if(act4Rival)act4Rival.mixer.update(dt);
 if(towerPortal&&towerPortal.visible)towerPortal.rotation.z+=dt*.9;
}
/* ---------- Pisos da torre ---------- */
function enterTower(floor){
 inTower=true;const a=getDimArena('torre');enterDimensionArena('torre');voidSpec.walk=towerWalkable;
 const p=towerLocal(TOWER_HALL.spawn);player.position.set(p.x,voidSpec.y,p.z);playerYaw=Math.PI;player.rotation.y=playerYaw;cameraYaw=0;moveVX=moveVZ=0;checkpointX=p.x;checkpointZ=p.z;camera.position.set(p.x,voidSpec.y+3,p.z+6);
 decorateFloor(a,floor);if(towerPortal)towerPortal.visible=false;act4World.floorDone=false;act4World.floorStarted=false;worldAudio.portalEnter();
}
function leaveTower(to){inTower=false;voidSpec.walk=null;leaveVoid();for(const c of act4Clones.splice(0))disposeClone(c);if(towerPortal)towerPortal.visible=false;const p=to||{x:TOWER.door.x,z:TOWER.door.z+3};player.position.set(p.x,terrainHeightAt(p.x,p.z),p.z);checkpointX=p.x;checkpointZ=p.z;}
function decorateFloor(a,n){
 const t=floorTint(n);if(a.refs.floorMat)a.refs.floorMat.color.setRGB(t[0]*2,t[1]*2,t[2]*2);if(a.refs.wallMat)a.refs.wallMat.color.setRGB(t[0]*.6,t[1]*.6,t[2]*.6);
 if(!a.refs.rest&&act4World.kit){const kit=act4World.kit,grp=new THREE.Group();const bath=kit.Banheira.clone();bath.position.set(TOWER_HALL.bath.x,0,TOWER_HALL.bath.z);grp.add(bath);
  const nk=act3World&&act3World.kit;if(nk&&nk.Cama){const bed=nk.Cama.clone();bed.position.set(TOWER_HALL.bed.x,0,TOWER_HALL.bed.z);bed.rotation.y=-Math.PI/2;grp.add(bed);}
  for(const [x,z] of [[-9,4],[9,4],[0,-10]]){const b=kit.Braseiro.clone();b.position.set(x,0,z);grp.add(b);}a.group.add(grp);a.refs.rest=grp;}
 if(a.refs.rest)a.refs.rest.visible=n===5;
}
function floorPortal(){
 if(!towerPortal){const g=new THREE.Group(),ring=new THREE.Mesh(new THREE.TorusGeometry(1.6,.16,10,40),new THREE.MeshBasicMaterial({color:0xeef2ff,toneMapped:false}));g.add(ring);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(1.5,40),new THREE.MeshBasicMaterial({color:0x10102a,transparent:true,opacity:.85,side:THREE.DoubleSide}));g.add(disc);g.add(glowSprite(0xdfe6ff,.6,5));scene.add(g);towerPortal=g;}
 const c=towerLocal(TOWER_HALL.center);towerPortal.position.set(c.x,voidSpec.y+2.1,c.z);towerPortal.visible=true;
}
function startFloor(n){
 const W=act4World;W.floorStarted=true;const foes=floorFoes(n),P=player.position;
 storyAnchors.enemy={...towerLocal(TOWER_HALL.boss),y:voidSpec.y,yaw:0};
 if(FLOORS[n].rest){act1Lock=true;playStory('piso5',floorIntroScene(5),{focus:'hero',done:()=>{act1Lock=false;}});return;}
 const plain=foes.filter(f=>f.kind==='enemy4'),spots=TOWER_HALL.foes.slice(0,plain.length).map(towerLocal),done=()=>{W.floorDone=true;floorCleared(n);};
 const big=foes.find(f=>f.kind!=='enemy4');
 const startBig=hold=>{if(big.kind==='miniboss')startPack({rig:'enemy3',profile:'miniboss4',hp:ACT4N.minibossHp,spots:[towerLocal(TOWER_HALL.boss)],scale:1.8,hold,cloneOpts:{scale:1.8},onDone:done});else startPack({rig:'enemy4',profile:'leader4',hp:ACT4N.leaderHp,spots:[towerLocal(TOWER_HALL.boss)],scale:2,hold,cloneOpts:{scale:2},onDone:done});};
 if(big&&big.kind==='leader'){loadRig('enemy4').then(()=>{const c=makeFoeClone('enemy4',towerLocal(TOWER_HALL.boss),{role:'idle',scale:2});if(c){c.holder.position.y=voidSpec.y;act4Clones.push(c);W.bigClone=c;}},()=>{});}
 act1Lock=true;
 if(plain.length)startPack({rig:'enemy4',profile:'demon4',hp:ACT4N.enemy4Hp,spots,hold:true,onDone:big?()=>{if(W.bigClone){disposeClone(W.bigClone);const i=act4Clones.indexOf(W.bigClone);if(i>=0)act4Clones.splice(i,1);W.bigClone=null;}startBig(false);}:done});
 else startBig(true);
 playStory('piso'+n,floorIntroScene(n),{focus:'enemy',done:()=>{act1Lock=false;releasePack();}});
}
function floorCleared(n){
 const W=act4World,x=enemy.position.x,z=enemy.position.z;
 if(n===6||n===7){const c=makeFoeClone(n===6?'enemy3':'enemy4',{x,z},{role:'idle',scale:n===6?1.8:2});if(c){c.holder.position.y=voidSpec.y;c.holder.scale.y*=.85;act4Clones.push(c);W.dying=c;storyAnchors.enemy={x,z,y:voidSpec.y,yaw:Math.atan2(player.position.x-x,player.position.z-z)};}}
 act1Lock=true;
 if(n===7){storyAnchors.sky={...towerLocal(TOWER_HALL.center),y:voidSpec.y+7,yaw:0};storyAnchors.portal={...towerLocal(TOWER_HALL.center),y:voidSpec.y+1,yaw:0};
  playStory('lider-cai',leaderDefeatScene(),{focus:'enemy',done:()=>{act1Lock=false;act1Advance(ACT4N.boss,0);status.textContent='Entre no portal.';}});return;}
 playStory('piso'+n+'-fim',floorClearScene(n),{focus:'hero',done:()=>{act1Lock=false;status.textContent='Suba para o próximo piso.';}});
}
/* ---------- Etapas do Ato IV ---------- */
function updateAct4(dt,now){
 if(questStep>=ACT4N.road&&!act4World)buildAct4World();
 updateAct4World(dt);if(rivalRun)stepRivalRun(dt);
 if(questStep<ACT4N.road||questStep>ACT4N.after)return;
 if(!rigLoads.rival)loadRig('rival').catch(()=>{});if(questStep>=ACT4N.road&&!rigLoads.enemy4)loadRig('enemy4').catch(()=>{});if(questStep===ACT4N.boss&&!rigLoads.bishop4)loadRig('bishop4').catch(()=>{});
 const px=player.position.x,pz=player.position.z,near=(p,r)=>Math.hypot(p.x-px,p.z-pz)<r,mark=p=>{questMarker.visible=true;questMarker.position.set(p.x,(voidMode?voidSpec.y:terrainHeightAt(p.x,p.z))+.06,p.z);};
 storyAnchors.tower={x:TOWER.base.x,z:TOWER.base.z,yaw:0};if(act4Rival){const h=act4Rival.holder;storyAnchors.rival={x:h.position.x,z:h.position.z,yaw:h.rotation.y};}
 if(!act4World.resumed&&!act1Busy()){act4World.resumed=true;
  if(questStep===ACT4N.road&&act1Sub===1&&!act4Rival)act1Advance(ACT4N.road,1);
  if(questStep===ACT4N.after&&!act1Busy()){act1Lock=true;act4World.fell=true;syncAct4World();if(!act4Rival&&rigs.rival){const P=player.position;act4Rival=makeFoeClone('rival',{x:P.x+2.6,z:P.z+1.2},{role:'idle'});if(act4Rival)faceTo(act4Rival.holder,P);}playStory('misteriosa-revela',rivalRevealScene(),{focus:'rival',face:'rival',done:()=>{act1Lock=false;finishAct4();}});return;}
 }
 const q=questStep,s=act1Sub;
 if(q===ACT4N.road){
  if(s===0){const B=TOWER.bandits[0];mark(B);if(near(B,10)&&!act1Busy()&&!pack){act1Lock=true;startPack({rig:'rival',profile:'bandit4',hp:ACT4N.banditHp,spots:TOWER.bandits,hold:true,onDone:()=>{act1Advance(ACT4N.road,1);status.textContent='Siga pela estrada da serra.';}});
    storyAnchors.bandit={...TOWER.bandits[0],yaw:0};playStory('bandidos4',banditScene4(),{focus:'bandit',done:()=>{act1Lock=false;releasePack();}});}}
  else if(s===1){const M=TOWER.rivalMeet;mark(M);
   if(!act4Rival&&rigs.rival){act4Rival=makeFoeClone('rival',M,{role:'idle'});}
   if(act4Rival&&near(M,8)&&!act1Busy()&&!rivalRun&&!act4World.met){act4World.met=true;act1Lock=true;faceTo(act4Rival.holder,player.position);faceTo(player,M);
    playStory('reencontro',rivalReturnScene(),{focus:'rival',face:'rival',done:()=>{act1Lock=false;rivalRun={path:TOWER.rivalPath.map(([x,z])=>({x,z})),i:0,speed:3.6};status.textContent='Siga a pessoa misteriosa.';}});}
   if(rivalRun===null&&act4World.met&&act4World.arrived&&!act1Busy()&&near(TOWER.view,8)){act1Lock=true;faceTo(player,TOWER.base);playStory('torre',towerViewScene(),{focus:'rival',done:()=>{act1Lock=false;act1Advance(ACT4N.road,2);status.textContent='Entre na torre.';}});}
   else if(act4World.arrived)mark(TOWER.view);
  }
  else mark(TOWER.door);
  return;
 }
 if(q===ACT4N.tower){
  if(!inTower){mark(TOWER.door);return;}
  if(!act4World.floorStarted&&!act1Busy()&&!pack)startFloor(Math.max(1,s));
  if(act4World.floorDone||(FLOORS[s]&&FLOORS[s].rest&&act4World.rested)){if(!towerPortal||!towerPortal.visible)floorPortal();mark(towerLocal(TOWER_HALL.center));}
  else if(FLOORS[s]&&FLOORS[s].rest)mark(towerLocal(TOWER_HALL.restSpot));
  return;
 }
 if(q===ACT4N.boss&&inTower){if(!towerPortal||!towerPortal.visible)floorPortal();mark(towerLocal(TOWER_HALL.center));}
}
function stepRivalRun(dt){
 const r=rivalRun,c=act4Rival;if(!r||!c)return;const h=c.holder,t=r.path[r.i];
 if(!t){rivalRun=null;act4World.arrived=true;faceTo(h,player.position);return;}
 const dx=t.x-h.position.x,dz=t.z-h.position.z,d=Math.hypot(dx,dz);if(d<.4){r.i++;return;}
 if(Math.hypot(player.position.x-h.position.x,player.position.z-h.position.z)>9){faceTo(h,player.position);return;}
 const s=Math.min(d,dt*r.speed);h.position.x+=dx/d*s;h.position.z+=dz/d*s;h.position.y=terrainHeightAt(h.position.x,h.position.z);h.rotation.y=Math.atan2(dx,dz);
 if(!r.running){r.running=true;const src=rigSource('rival');if(src&&src.actions.run){c.mixer.stopAllAction();c.mixer.clipAction(src.actions.run.getClip()).play();}}
}
function act4Label(){
 if(cineActive||questStep<ACT4N.road||questStep>ACT4N.after)return '';const px=player.position.x,pz=player.position.z,d=(p,r)=>Math.hypot(p.x-px,p.z-pz)<=r,q=questStep,s=act1Sub;
 if(!inTower){if((q===ACT4N.tower||(q===ACT4N.road&&s===2)||q===ACT4N.boss)&&d(TOWER.door,4.5))return 'ENTRAR';return '';}
 const c=towerLocal(TOWER_HALL.center);
 if(q===ACT4N.tower&&FLOORS[s]&&FLOORS[s].rest&&!act4World.rested&&d(towerLocal(TOWER_HALL.restSpot),3.5))return 'DESCANSAR';
 if(q===ACT4N.tower&&towerPortal&&towerPortal.visible&&d(c,3))return 'SUBIR AO ' +(s+1)+'º PISO';
 if(q===ACT4N.boss&&towerPortal&&towerPortal.visible&&d(c,3))return 'ENTRAR NO PORTAL';
 return '';
}
function act4Interact(){
 const l=act4Label();if(!l)return false;
 if(l==='ENTRAR'){travelVeil(()=>{if(questStep===ACT4N.road)act1Advance(ACT4N.tower,1);if(act4Rival){disposeClone(act4Rival);act4Rival=null;}enterTower(questStep===ACT4N.boss?7:Math.max(1,act1Sub));if(questStep===ACT4N.boss){act4World.floorStarted=true;}});return true;}
 if(l==='DESCANSAR'){act1Lock=true;playStory('descanso',restScene(),{focus:'hero',done:()=>{act1Lock=false;act4World.rested=true;}});return true;}
 if(/^SUBIR AO/.test(l)){travelVeil(()=>{act4World.rested=false;act1Advance(ACT4N.tower,nextFloor(act1Sub));enterTower(act1Sub);});return true;}
 if(l==='ENTRAR NO PORTAL'){startVeraxion();return true;}
 return false;
}
function startVeraxion(){
 updateHeartsHud(true);if(!canChallengeBishop(heartState)){showDialogue([{who:playerName||'Herói',text:'Meus corações se apagaram. Preciso esperar um voltar — '+formatTimer(msToNextHeart(heartState))+'.'}]);return;}
 inTower=false;voidSpec.walk=null;if(towerPortal)towerPortal.visible=false;for(const c of act4Clones.splice(0))disposeClone(c);delete storyAnchors.enemy;delete storyAnchors.sky;delete storyAnchors.portal;
 startDimensionBattle('bishop4',{hp:ACT4N.bossHp,returnTo:{x:TOWER.view.x,z:TOWER.view.z+6},onVictory:act4Victory,onAbort:()=>{enterTower(7);act4World.floorStarted=true;status.textContent='Sem corações. Recupere um e entre no portal de novo.';}});
}
function veraxionIntro(){if(!dimBattle||dimBattle.key!=='bishop4'||questStep!==ACT4N.boss)return;playStory('veraxion',veraxionIntroScene(),{focus:'enemy',face:'enemy'});}
function act4Victory(){
 const r=afterVeraxion({claimed:veraxionClaimed,bishopsDefeated});
 if(r.coinsGained){coins+=r.coinsGained;gainXp(r.xpGained);bumpStat('bishops');}
 bestiaryKnown.add('veraxion');bishopsDefeated=r.bishopsDefeated;veraxionClaimed=true;lateBossClaimed.veraxion=true;
 enemy.visible=false;useRig('enemy1');const hud=document.getElementById('enemy-hud');if(hud)hud.classList.remove('boss');
 act1Advance(ACT4N.after,0);setGameHour(17);showRewardPop((r.coinsGained?'+'+r.coinsGained+' MOEDAS · ':'')+(r.xpGained?'+'+r.xpGained+' XP':''));act1Toast('VÉRAXION CAIU · QUARTO SELO');
 act1Lock=true;faceTo(player,TOWER.base);
 playStory('torre-cai',towerFallScene(),{focus:'hero',done:()=>{act4World.resumed=true;
  if(!act4Rival&&rigs.rival){const P=player.position;act4Rival=makeFoeClone('rival',{x:P.x+2.6,z:P.z+1.2},{role:'idle'});if(act4Rival)faceTo(act4Rival.holder,P);}
  playStory('misteriosa-revela',rivalRevealScene(),{focus:'rival',face:'rival',done:()=>{act1Lock=false;finishAct4();}});}});
}
function finishAct4(){
 if(act4Rival){disposeClone(act4Rival);act4Rival=null;}
 // O Ato V do roteiro (o coliseu) é o próximo marco; até lá, o jogo segue para o arco final atual (os guardiões e a Ganância).
 questStep=ACT4N.next;act1Sub=0;save3DProgress();updateQuestHud();setCineFade(0,1.2,false);status.textContent='A pessoa misteriosa conhece um lugar para você se preparar.';
}
function receiveScroll(){
 const card=document.getElementById('choice-card');if(card)card.hidden=true;choiceMode='casaco';
 scrollOwned=true;save3DProgress();worldAudio.reveal();showRewardPop('PERGAMINHO · ESPADA +20% DE DANO');cineDirector.resume();
}
/** Ações das cenas do Ato IV (passos "do"). */
function storyDo4(id,args){
 const P=player.position;
 switch(id){
  case 'misteriosa-parte4':if(act4Rival){const c=act4Rival;storyFx.push({t:0,tick(t){c.holder.position.x+=.05;if(t>1.2){c.holder.visible=false;return false;}},finish(){c.holder.visible=false;}});}worldAudio.whoosh();return true;
  case 'escada':floorPortal();worldAudio.portalEnter();return true;
  case 'queimar4':{const c=act4World&&act4World.dying;worldAudio.magic('magic3');if(c){const fire=glowSprite(0xff5a10,.95,4);fire.position.copy(c.holder.position);fire.position.y+=2;scene.add(fire);
   c.holder.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.emissive=new THREE.Color(0xff3000);o.material.emissiveIntensity=1.5;}});
   storyFx.push({t:0,tick(t){fire.scale.setScalar(4+t*3);fire.material.opacity=Math.max(0,.95-t*.4);c.holder.scale.y=Math.max(.01,1.8*(1-t*.5));if(t>2){c.holder.visible=false;scene.remove(fire);return false;}},finish(){c.holder.visible=false;scene.remove(fire);}});}return true;}
  case 'descansar':setCineFade(1,1.2,false);playerHP=playerMaxHP;playerMana=MANA.max;updatePlayerHud();return true;
  case 'piscar4':{let n=0;const blink=()=>{setCineFade(n%2?.0:1,.22,true);n++;if(n<4)setTimeout(blink,330);else setCineFade(0,.8,true);};blink();return true;}
  case 'portal-torre':floorPortal();worldAudio.portalEnter();storyFlash('#101020',600);return true;
  case 'lembranca':{storyFlash('#300000',700);const e=enemy.position;storyAnchors.greed={x:e.x-2,z:e.z-1,y:e.y,yaw:Math.atan2(P.x-e.x,P.z-e.z)};
   loadRig('greed1').then(()=>{const g=makeFoeClone('greed1',{x:e.x-2,z:e.z-1},{role:'idle'});if(g){g.holder.position.y=voidSpec.y;g.holder.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.55;}});act4Clones.push(g);act4World.memory=g;}},()=>{});return true;}
  case 'fim-lembranca':if(act4World&&act4World.memory){disposeClone(act4World.memory);const i=act4Clones.indexOf(act4World.memory);if(i>=0)act4Clones.splice(i,1);act4World.memory=null;}storyFlash('#300000',500);return true;
  case 'dimensao-desaba4':cameraShake(.7);worldAudio.portalEnter();vibrate(120);return true;
  case 'correr-mao':{const e=enemy.position;storyMove={from:{x:P.x,z:P.z},to:{x:e.x+(P.x-e.x)*.25,z:e.z+(P.z-e.z)*.25},t:0,dur:1.8,done:()=>{storyFlash('white',1400);}};if(actions.walk)play('walk',.2);return true;}
  case 'torre-cai':if(act4World){act4World.falling=true;act4World.fallT=0;act4World.dust.visible=true;act4World.dustT=0;}cameraShake(.8);worldAudio.thunder&&worldAudio.thunder();vibrate(200);setTimeout(()=>syncAct4World(),4800);return true;
  case 'misteriosa-volta':worldAudio.whoosh();if(act4Rival)act4Rival.holder.visible=true;return true;
  case 'escuro4':setCineFade(1,1.2,false);return true;
  case 'ato-5':{const card=cineEl('act-card');card.querySelector('#act-kicker').textContent='GALÁXIA 1 · GANÂNCIA';card.querySelector('h2').textContent='ATO V';card.querySelector('#act-bishop').textContent='A jornada para ficar mais forte';card.classList.remove('hidden');worldAudio.chapter();return true;}
 }
 return false;
}
/* MOD 208 — Marco 6: Ato V como no roteiro original (docs/roteiro/M6-ATO5.md). O Coliseu da Ascensão fica num vale novo
   a leste da torre; oito rounds com inimigos "evoluídos" (auras), a torcida de demônios e a pessoa misteriosa lutando ao
   lado do herói no último round. Modelo novo do Blender: Coliseu.glb (arena, arquibancada, espectadores e estandartes). */
var act5Fx=[],act5World=null,act5Sandra=null,sandraRun=null,act5Round=null,act5Auras=[],act5Ally=null,inventoryOpen=false;
const ROUND_NAMES={evo1:'SEGUIDOR EVOLUÍDO',evo2:'DEMÔNIO EVOLUÍDO',evo3:'CARRASCO EVOLUÍDO',elite1:'ELITE DOS SEGUIDORES',elite2:'ELITE DOS DEMÔNIOS',elite3:'ELITE DOS CARRASCOS',elite4:'ELITE DOS GUARDIÕES'};
Object.assign(SPEAKER_ACTOR,{[SPEAKERS5.e1]:'enemy',[SPEAKERS5.e2]:'enemy',[SPEAKERS5.e3]:'enemy',[SPEAKERS5.m1]:'enemy',[SPEAKERS5.m2]:'enemy',[SPEAKERS5.m3]:'enemy',[SPEAKERS5.m4]:'enemy'});
Object.assign(STORY_EYE,{colosseum:6});
function buildAct5World(){
 if(act5World)return act5World;const W=act5World={kit:null,crowd:[],excite:{value:.2},time:{value:0}};
 for(const c of colosseumColliders())marketObstacles.push({x:c.x,z:c.z,shape:'circle',radius:c.r,height:20});
 new GLTFLoader().load('./Coliseu.glb?v=mod208',gltf=>{const kit={};for(const c of gltf.scene.children)kit[c.name]=c;W.kit=kit;
  const C=COLOSSEUM,y=groundHeightAt(C.center.x,C.center.z),col=kit.Coliseu.clone();col.position.set(C.center.x,y-.15,C.center.z);col.rotation.y=C.yaw;col.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});scene.add(col);W.col=col;W.colY=col.position.y;
  // Braseiros no muro do pódio e estandartes nos mastros.
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8,b=kit.Braseiro.clone();b.position.set(C.center.x+Math.cos(a)*17.4,y+2.55,C.center.z+Math.sin(a)*17.4);scene.add(b);W.crowd.push(b);
   const l=new THREE.PointLight(0xff6a20,1.3,16,1.6);l.position.set(b.position.x,b.position.y+2.4,b.position.z);if(i%2===0){scene.add(l);W.crowd.push(l);}
   const e=kit.Estandarte.clone(),r=C.wall-.4;e.position.set(C.center.x+Math.cos(a)*r,y+27.6,C.center.z+Math.sin(a)*r);e.rotation.y=-a+Math.PI/2;scene.add(e);W.crowd.push(e);}
  // A torcida: milhares de demônios instanciados nos degraus (fora dos portões), pulando com a luta.
  const N=terrainLowSpec?650:1500,mats=[];const src=[];kit.Espectador.traverse(o=>{if(o.isMesh)src.push(o);});
  const spots=[];for(let k=0;k<9&&spots.length<N*3;k++){const r0=18+k*15/9+.8,h=2.6+(k+1)*1.15,cnt=Math.floor(2*Math.PI*r0/.95);for(let i=0;i<cnt;i++){const a=i/cnt*Math.PI*2;if([0,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2].some(g=>Math.abs(a-g)<.2))continue;spots.push({a,r:r0+(Math.random()-.5)*.3,h});}}
  for(let i=spots.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[spots[i],spots[j]]=[spots[j],spots[i]];}
  const use=spots.slice(0,N),d=new THREE.Object3D();
  for(const m of src){const mat=m.material.clone();mat.onBeforeCompile=sh=>{sh.uniforms.uTime=W.time;sh.uniforms.uExcite=W.excite;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;uniform float uExcite;').replace('#include <begin_vertex>','#include <begin_vertex>\nfloat ph=float(gl_InstanceID)*1.713;transformed.y+=max(0.0,sin(uTime*(5.0+mod(ph,3.0))+ph))*(0.05+0.45*uExcite);transformed.x+=sin(uTime*2.0+ph)*0.04*uExcite;');};mat.customProgramCacheKey=()=>'mod208-crowd';
   const im=new THREE.InstancedMesh(m.geometry,mat,use.length);use.forEach((s,i)=>{d.position.set(C.center.x+Math.cos(s.a)*s.r,y+s.h,C.center.z+Math.sin(s.a)*s.r);d.rotation.set(0,Math.atan2(-Math.cos(s.a),-Math.sin(s.a)),0);const sc=.9+Math.random()*.35;d.scale.setScalar(sc*1.15);d.updateMatrix();im.setMatrixAt(i,d.matrix);});
   im.instanceMatrix.needsUpdate=true;im.frustumCulled=false;scene.add(im);W.crowd.push(im);}
  syncAct5World();
 },undefined,e=>console.warn('Coliseu.glb não carregou.',e));
 // Poeira do desabamento.
 const N=360,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3));W.dustV=[];for(let i=0;i<N;i++)W.dustV.push({a:Math.random()*6.28,r:10+Math.random()*28,v:2+Math.random()*6});
 W.dust=new THREE.Points(g,new THREE.PointsMaterial({map:softDot,color:0x7a5a4a,size:7,transparent:true,opacity:.6,depthWrite:false}));W.dust.frustumCulled=false;W.dust.visible=false;scene.add(W.dust);
 return W;
}
function syncAct5World(){const W=act5World;if(!W||!W.col)return;const gone=questStep>ACT5N.step||W.fell;W.col.visible=!gone;for(const c of W.crowd)c.visible=!gone;
 if(gone&&!W.freed){W.freed=true;for(let i=marketObstacles.length-1;i>=0;i--){const o=marketObstacles[i];if(o.height===20&&Math.hypot(o.x-COLOSSEUM.center.x,o.z-COLOSSEUM.center.z)<40)marketObstacles.splice(i,1);}}}
function updateAct5World(dt,now){
 const W=act5World;if(!W)return;W.time.value=now*.001;
 const target=act5Round&&enemy.visible?1:(questStep===ACT5N.step&&act1Sub>=ACT5N.arrival?.3:.15);W.excite.value+=(target-W.excite.value)*Math.min(1,dt*2);
 const near=Math.hypot(player.position.x-COLOSSEUM.center.x,player.position.z-COLOSSEUM.center.z)<70&&W.col&&W.col.visible&&!voidMode;worldAudio.setCrowd&&worldAudio.setCrowd(near?W.excite.value:0);
 if(W.falling&&W.col){W.fallT+=dt;const k=Math.min(1,W.fallT/5);W.col.position.y=W.colY-k*k*26;W.col.rotation.z=Math.sin(W.fallT*9)*.01*(1-k);for(const c of W.crowd){if(c.userData.y0===undefined)c.userData.y0=c.position.y;c.position.y=c.userData.y0-k*k*26;}if(k>=1){W.falling=false;W.fell=true;syncAct5World();}}
 if(W.dust.visible){W.dustT+=dt;const a=W.dust.geometry.attributes.position,C=COLOSSEUM.center,gy=groundHeightAt(C.x,C.z);for(let i=0;i<W.dustV.length;i++){const v=W.dustV[i],rr=v.r+W.dustT*v.v*.6;a.array[i*3]=C.x+Math.cos(v.a)*rr;a.array[i*3+1]=gy+1+Math.min(18,W.dustT*v.v*.7);a.array[i*3+2]=C.z+Math.sin(v.a)*rr;}a.needsUpdate=true;W.dust.material.opacity=Math.max(0,.6-W.dustT*.05);if(W.dustT>12)W.dust.visible=false;}
 for(const a of act5Auras)a.tick(dt,now);
 for(let i=act5Fx.length-1;i>=0;i--){const f=act5Fx[i];f.t+=dt;if(f.tick(f.t,dt)===false)act5Fx.splice(i,1);}
 if(act5Sandra)act5Sandra.mixer.update(dt);
}
/* ---------- Aura dos "evoluídos" (camadas concêntricas, runas, chamas e faíscas; leve no celular) ---------- */
let auraRuneTex=null,auraFlameTex=null;
function auraTextures(){
 if(auraRuneTex)return;
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.translate(128,128);x.strokeStyle='#fff';x.fillStyle='#fff';
 x.lineWidth=5;x.beginPath();x.arc(0,0,118,0,6.3);x.stroke();x.lineWidth=2;x.beginPath();x.arc(0,0,98,0,6.3);x.stroke();x.beginPath();x.arc(0,0,60,0,6.3);x.stroke();
 for(let i=0;i<6;i++){const a=i/6*6.283,b=(i+2)/6*6.283;x.beginPath();x.moveTo(Math.cos(a)*98,Math.sin(a)*98);x.lineTo(Math.cos(b)*98,Math.sin(b)*98);x.stroke();}
 x.font='bold 18px serif';for(let i=0;i<16;i++){x.save();x.rotate(i/16*6.283);x.fillText('ᚱᛟᚾᛖᛋᚦᚨᛉ'[i%8],-6,-104);x.restore();}
 auraRuneTex=new THREE.CanvasTexture(c);
 const f=document.createElement('canvas');f.width=64;f.height=128;const y=f.getContext('2d'),gr=y.createLinearGradient(0,128,0,0);gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(.45,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');y.fillStyle=gr;y.fillRect(0,0,64,128);
 for(let i=0;i<14;i++){y.fillStyle='rgba(0,0,0,.55)';y.fillRect(Math.random()*64,0,2+Math.random()*5,40+Math.random()*80);}
 auraFlameTex=new THREE.CanvasTexture(f);auraFlameTex.wrapS=THREE.RepeatWrapping;
}
function makeAura(color,size,follow){
 auraTextures();const g=new THREE.Group(),c=new THREE.Color(color),add={transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide};
 const rune=new THREE.Mesh(new THREE.PlaneGeometry(3.6,3.6),new THREE.MeshBasicMaterial({map:auraRuneTex,color:c,opacity:.85,...add}));rune.rotation.x=-Math.PI/2;rune.position.y=.06;g.add(rune);
 const rune2=rune.clone();rune2.material=rune.material.clone();rune2.scale.setScalar(.62);rune2.material.opacity=.6;g.add(rune2);
 const shells=[];for(let i=0;i<2;i++){const t=auraFlameTex.clone();t.needsUpdate=true;t.repeat.set(3+i,1);const m=new THREE.Mesh(new THREE.CylinderGeometry(.75+i*.28,.95+i*.35,2.6+i*.6,20,1,true),new THREE.MeshBasicMaterial({map:t,color:c,opacity:.42-i*.12,...add}));m.position.y=1.3+i*.3;g.add(m);shells.push(m);}
 const N=terrainLowSpec?24:46,pos=new Float32Array(N*3),seed=[];for(let i=0;i<N;i++)seed.push({a:Math.random()*6.28,r:.3+Math.random()*.9,v:.8+Math.random()*1.6,y:Math.random()*3});
 const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));const pts=new THREE.Points(pg,new THREE.PointsMaterial({map:softDot,color:c.clone().lerp(new THREE.Color(0xffffff),.35),size:.18,...add}));pts.frustumCulled=false;g.add(pts);
 g.scale.setScalar(size||1);scene.add(g);
 const aura={group:g,follow,tick(dt,now){const t=now*.001;if(follow){const o=follow();if(!o){g.visible=false;return;}g.visible=true;g.position.set(o.x,o.y,o.z);}
  rune.rotation.z+=dt*.6;rune2.rotation.z-=dt*1.1;shells.forEach((m,i)=>{m.material.map.offset.y=-(t*(.6+i*.3))%1;m.material.map.offset.x=t*.05*(i?1:-1);m.scale.x=m.scale.z=1+Math.sin(t*6+i)*.05;});
  for(let i=0;i<N;i++){const s=seed[i];s.y+=dt*s.v;if(s.y>3.4)s.y=0;pos[i*3]=Math.cos(s.a+t*.8)*s.r;pos[i*3+1]=s.y;pos[i*3+2]=Math.sin(s.a+t*.8)*s.r;}pg.attributes.position.needsUpdate=true;},
  dispose(){scene.remove(g);}};
 act5Auras.push(aura);return aura;
}
function clearAuras(){for(const a of act5Auras.splice(0))a.dispose();}
/* ---------- O torneio ---------- */
function enterArena(){const C=COLOSSEUM,p=C.spawn;player.position.set(p.x,terrainHeightAt(p.x,p.z),p.z);playerYaw=Math.PI/2;player.rotation.y=playerYaw;cameraYaw=playerYaw+Math.PI;checkpointX=p.x;checkpointZ=p.z;}
function startRound(n){
 const R=ROUNDS[n-1],C=COLOSSEUM;act5Round={n,i:0,clones:[]};clearAuras();act1Lock=true;
 if(!inArena(player.position.x,player.position.z))enterArena();
 const spots=[C.foe].concat(C.waiting),foes=R.foes;
 // Todos aparecem; o motor luta com um por vez (como nos outros atos).
 Promise.all(foes.map(f=>f.rig==='enemy1'?Promise.resolve():loadRig(f.rig))).then(()=>{
  foes.forEach((f,i)=>{if(i===0)return;const c=makeFoeClone(f.rig,spots[i],{role:'idle',scale:f.scale});if(c){act5Round.clones[i]=c;const h=c.holder;makeAura(f.aura||R.aura,f.scale*.75,()=>h.visible?h.position:null);}});
  makeAura(R.aura,1,()=>enemy.visible&&enemyAlive?enemy.position:null);
  fightRoundFoe(n,0,true);
  storyAnchors.enemy={...C.foe,yaw:-Math.PI/2};storyAnchors.colosseum={...C.center,yaw:0};
  playStory('round'+n,roundIntroScene(n),{focus:'enemy',face:'enemy',done:()=>{act1Lock=false;delete storyAnchors.enemy;releasePack();if(R.ally)startAlly();}});
 },()=>{act1Lock=false;});
}
function fightRoundFoe(n,i,hold){
 const R=ROUNDS[n-1],f=R.foes[i],C=COLOSSEUM,c=act5Round.clones[i],spot=c?{x:c.holder.position.x,z:c.holder.position.z}:C.foe;
 if(c){disposeClone(c);act5Round.clones[i]=null;}
 startPack({rig:f.rig,profile:f.profile,hp:f.hp,spots:[spot],scale:f.scale,hold,cloneOpts:{scale:f.scale},intro:f.name,onDone:()=>{
  if(i+1<R.foes.length){act5Round.i=i+1;setTimeout(()=>fightRoundFoe(n,i+1,false),500);return;}
  roundDone(n);}});
}
function roundDone(n){
 const R=ROUNDS[n-1];stopAlly();clearAuras();worldAudio.roar&&worldAudio.roar();act1Lock=true;act5Round=null;
 const next=()=>{act1Lock=false;if(n<ROUNDS.length){act1Advance(ACT5N.step,subForRound(n+1));setTimeout(()=>{if(questStep===ACT5N.step)startRound(n+1);},1300);}else finishColosseum();};
 const out=roundOutroScene(n);if(out.length){const x=enemy.position.x||COLOSSEUM.foe.x,z=enemy.position.z||COLOSSEUM.foe.z;const c=makeFoeClone(R.foes[R.foes.length-1].rig,{x,z},{role:'idle',scale:R.foes[R.foes.length-1].scale});if(c){c.holder.scale.y*=.82;hordeClones.push(c);storyAnchors.enemy={x,z,yaw:Math.atan2(player.position.x-x,player.position.z-z)};}
  playStory('round'+n+'-fim',out.concat([{type:'do',id:'apagar-oponente',args:{}}]),{focus:'enemy',done:()=>{delete storyAnchors.enemy;if(c){disposeClone(c);const i=hordeClones.indexOf(c);if(i>=0)hordeClones.splice(i,1);}next();}});}
 else next();
}
function finishColosseum(){
 act1Lock=true;if(!act5Sandra)spawnSandra({x:player.position.x+2.4,z:player.position.z+1});
 playStory('coliseu-fim',finalScene(),{focus:'rival',face:'rival',done:()=>{act1Lock=false;
  if(act5Sandra){disposeClone(act5Sandra);act5Sandra=null;}
  // O Ato VI do roteiro (o deserto) é o próximo marco; até lá, o jogo segue para o arco final atual (os guardiões e a Ganância).
  questStep=ACT5N.next;act1Sub=0;save3DProgress();updateQuestHud();syncAct5World();setCineFade(0,1.2,false);status.textContent='Rumo ao deserto: a estátua gigante.';}});
}
function spawnSandra(p){if(!rigs.rival)return null;act5Sandra=makeFoeClone('rival',p,{role:'idle'});return act5Sandra;}
/* ---------- A pessoa misteriosa luta junto no último round (não morre; golpes próprios e ilusões) ---------- */
function startAlly(){
 if(!act5Sandra)spawnSandra({x:player.position.x-2,z:player.position.z+1.5});if(!act5Sandra)return;
 act5Ally={cd:1.6,aura:makeAura(0xff3a6a,.7,()=>act5Sandra&&act5Sandra.holder.visible?act5Sandra.holder.position:null)};
}
function stopAlly(){act5Ally=null;}
function updateAlly(dt){
 const A=act5Ally,s=act5Sandra;if(!A||!s)return;const h=s.holder,src=rigSource('rival');
 if(!enemy.visible||!enemyAlive||cineActive){return;}
 const e=enemy.position,dx=e.x-h.position.x,dz=e.z-h.position.z,d=Math.hypot(dx,dz);h.rotation.y=Math.atan2(dx,dz);
 if(d>2.4){const sp=Math.min(d-2.2,dt*5.5);h.position.x+=dx/d*sp;h.position.z+=dz/d*sp;h.position.y=terrainHeightAt(h.position.x,h.position.z);if(A.anim!=='run'&&src&&src.actions.run){A.anim='run';s.mixer.stopAllAction();s.mixer.clipAction(src.actions.run.getClip()).play();}return;}
 A.cd-=dt;if(A.cd>0){if(A.anim!=='idle'&&A.cd<1.2&&src&&src.actions.idle){A.anim='idle';s.mixer.stopAllAction();s.mixer.clipAction(src.actions.idle.getClip()).play();}return;}
 A.cd=2.2+Math.random()*.8;A.hits=(A.hits||0)+1;
 if(src&&src.actions.attack){A.anim='attack';s.mixer.stopAllAction();const a=s.mixer.clipAction(src.actions.attack.getClip());a.reset();a.setLoop(THREE.LoopOnce,1);a.play();}
 // Ilusões: duas cópias translúcidas atacam junto (a cada terceiro golpe, um corte em X maior).
 const big=A.hits%3===0,dmg=big?26:14;setTimeout(()=>{if(!enemy.visible||!enemyAlive)return;enemyHP=Math.max(0,enemyHP-dmg);const p=enemy.position.clone();p.y+=1.6;damageNumber(p,String(dmg),big?'crit':'');burstSparks(p,0xff4a7a);worldAudio.hit();},320);
 for(let k=0;k<(big?3:2);k++){const g=makeFoeClone('rival',{x:e.x+Math.cos(k*2.1+A.hits)*1.8,z:e.z+Math.sin(k*2.1+A.hits)*1.8},{role:'attack'});if(!g)continue;g.holder.rotation.y=Math.atan2(e.x-g.holder.position.x,e.z-g.holder.position.z);g.holder.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.4;o.material.emissive=new THREE.Color(0xff2a6a);o.material.emissiveIntensity=.8;o.material.depthWrite=false;}});
  act5Fx.push({t:0,tick(t,dt){g.mixer.update(dt);g.holder.traverse(o=>{if(o.isMesh)o.material.opacity=Math.max(0,.4-t*.5);});if(t>.8){disposeClone(g);return false;}}});}
}
/* ---------- Etapas do Ato V ---------- */
function updateAct5(dt,now){
 if(questStep>=ACT5N.step&&!act5World)buildAct5World();
 updateAct5World(dt,now);updateAlly(dt);if(sandraRun)stepSandraRun(dt);
 if(questStep!==ACT5N.step)return;
 if(!rigLoads.rival)loadRig('rival').catch(()=>{});
 const px=player.position.x,pz=player.position.z,near=(p,r)=>Math.hypot(p.x-px,p.z-pz)<r,mark=p=>{questMarker.visible=true;questMarker.position.set(p.x,terrainHeightAt(p.x,p.z)+.06,p.z);};
 storyAnchors.colosseum={...COLOSSEUM.center,yaw:0};if(act5Sandra){const h=act5Sandra.holder;storyAnchors.rival={x:h.position.x,z:h.position.z,yaw:h.rotation.y};}
 const s=act1Sub;
 if(s===ACT5N.journey){
  if(!act5Sandra&&rigs.rival){const P=player.position;spawnSandra({x:P.x+2.2,z:P.z+1});}
  if(act5Sandra&&!act5World.journeyTold&&!act1Busy()){act5World.journeyTold=true;act1Lock=true;faceTo(act5Sandra.holder,player.position);
   playStory('jornada',journeyScene(),{focus:'rival',face:'rival',done:()=>{act1Lock=false;const h=act5Sandra.holder;sandraRun={path:[{x:h.position.x+6,z:h.position.z+4}].concat(COLOSSEUM_PASS.map(([x,z])=>({x,z})),[{x:COLOSSEUM.gate.x-16,z:COLOSSEUM.gate.z+3}]),i:0,speed:5};status.textContent='Acompanhe a pessoa misteriosa.';}});}
  if(act5Sandra)mark(act5Sandra.holder.position);else mark(COLOSSEUM.gate);
  if(act5World.arrived&&near({x:COLOSSEUM.gate.x-16,z:COLOSSEUM.gate.z},10)&&!act1Busy()){act1Lock=true;faceTo(player,COLOSSEUM.center);
   playStory('coliseu',arrivalScene(),{focus:'rival',done:()=>{act1Lock=false;act1Advance(ACT5N.step,ACT5N.arrival);status.textContent='Entre na arena do coliseu.';}});}
  return;
 }
 if(s===ACT5N.arrival){mark(COLOSSEUM.gateInner);if(near(COLOSSEUM.gateInner,4)&&!act1Busy()){act1Advance(ACT5N.step,subForRound(1));startRound(1);}return;}
 const R=roundForSub(s);
 if(R&&!act5Round&&!act1Busy()&&!pack)startRound(R.n);
}
function stepSandraRun(dt){
 const r=sandraRun,c=act5Sandra;if(!r||!c){sandraRun=null;return;}const h=c.holder,t=r.path[r.i];
 if(!t){sandraRun=null;act5World.arrived=true;faceTo(h,player.position);const src=rigSource('rival');if(src&&src.actions.idle){c.mixer.stopAllAction();c.mixer.clipAction(src.actions.idle.getClip()).play();}return;}
 const dx=t.x-h.position.x,dz=t.z-h.position.z,d=Math.hypot(dx,dz);if(d<.5){r.i++;return;}
 if(Math.hypot(player.position.x-h.position.x,player.position.z-h.position.z)>12){faceTo(h,player.position);return;}
 const s=Math.min(d,dt*r.speed);h.position.x+=dx/d*s;h.position.z+=dz/d*s;h.position.y=terrainHeightAt(h.position.x,h.position.z);h.rotation.y=Math.atan2(dx,dz);
 if(!r.running){r.running=true;const src=rigSource('rival');if(src&&src.actions.run){c.mixer.stopAllAction();c.mixer.clipAction(src.actions.run.getClip()).play();}}
}
/** Ações das cenas do Ato V (passos "do"). */
function storyDo5(id,args){
 const P=player.position;
 switch(id){
  case 'torcida':if(act5World)act5World.excite.value=args.level||.5;worldAudio.roar&&worldAudio.roar();return true;
  case 'misteriosa-demonio':if(act5Sandra){const c=act5Sandra;storyFlash('#300010',600);worldAudio.corrupt();storyFx.push({t:0,tick(t){c.holder.scale.setScalar(Math.max(.01,1-t));if(t>1){c.holder.visible=false;return false;}},finish(){c.holder.visible=false;}});}return true;
  case 'round':{showCombatCallout('ROUND '+args.n);worldAudio.roar&&worldAudio.roar();if(act5World)act5World.excite.value=1;cameraShake(.15);return true;}
  case 'misteriosa-entra':{if(act5Sandra){disposeClone(act5Sandra);act5Sandra=null;}const x=P.x-2.2,z=P.z+1.4;spawnSandra({x,z});if(act5Sandra){faceTo(act5Sandra.holder,enemy.position.x?enemy.position:COLOSSEUM.foe);storyAnchors.rival={x,z,yaw:act5Sandra.holder.rotation.y};}storyFlash('#400018',500);worldAudio.whoosh();return true;}
  case 'apagar-oponente':{storyFlash('#200000',400);worldAudio.hit();for(const c of hordeClones){if(c.holder.visible&&Math.hypot(c.holder.position.x-COLOSSEUM.foe.x,c.holder.position.z-COLOSSEUM.foe.z)<12){const h=c.holder;storyFx.push({t:0,tick(t){h.scale.y=Math.max(.01,h.scale.y-t*.08);if(t>.8){h.visible=false;return false;}},finish(){h.visible=false;}});}}return true;}
  case 'espada-celestial':{const t=document.getElementById('quest-toast');if(t){t.textContent='ESPADA CELESTIAL DESBLOQUEADA · NA LOJA';t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),3600);}worldAudio.reveal();worldAudio.celestial&&worldAudio.celestial();
   const beam=glowSprite(0xfff4d0,.95,4);beam.position.set(COLOSSEUM.center.x,terrainHeightAt(COLOSSEUM.center.x,COLOSSEUM.center.z)+9,COLOSSEUM.center.z);scene.add(beam);storyFx.push({t:0,tick(t){beam.scale.set(3+t*2,14+t*6,1);beam.material.opacity=Math.max(0,.95-t*.4);if(t>2.4){scene.remove(beam);return false;}},finish(){scene.remove(beam);}});
   return true;}
  case 'tremor':cameraShake(.6);vibrate(160);worldAudio.thunder&&worldAudio.thunder();if(act5World)act5World.excite.value=0;return true;
  case 'correr-saida':{const G=COLOSSEUM.exit;storyMove={from:{x:P.x,z:P.z},to:{x:G.x,z:G.z},t:0,dur:2.4,done:()=>{}};if(actions.walk)play('walk',.2);
   if(act5Sandra){const h=act5Sandra.holder,from={x:h.position.x,z:h.position.z};storyFx.push({t:0,tick(t){const k=Math.min(1,t/2.4);h.position.x=from.x+(G.x+2-from.x)*k;h.position.z=from.z+(G.z+2-from.z)*k;h.position.y=terrainHeightAt(h.position.x,h.position.z);if(k>=1)return false;},finish(){}});}return true;}
  case 'coliseu-cai':if(act5World){act5World.falling=true;act5World.fallT=0;act5World.dust.visible=true;act5World.dustT=0;}cameraShake(.9);vibrate(240);worldAudio.thunder&&worldAudio.thunder();worldAudio.setCrowd&&worldAudio.setCrowd(0);return true;
  case 'escuro5':setCineFade(1,1.2,false);return true;
  case 'ato-6':{const card=cineEl('act-card');card.querySelector('#act-kicker').textContent='GALÁXIA 1 · GANÂNCIA';card.querySelector('h2').textContent='ATO VI';card.querySelector('#act-bishop').textContent='Em busca da Ganância';card.classList.remove('hidden');worldAudio.chapter();return true;}
 }
 return false;
}
/* ---------- Inventário (espadas, roupa, encantamentos e poderes; "Equipar melhor") ---------- */
const SKILL_INFO={magic:{dmg:'3 × 14',what:'Três lâminas de luz à frente.'},magic2:{dmg:'5 × 10',what:'Cinco espadas em leque.'},magic3:{dmg:'28 + queimadura',what:'Um sol lento que queima.'},ultimate:{dmg:'60 (área)',what:'A espada colossal desce do céu.'},magic_plus:{dmg:'5 × 16',what:'Lâminas que perseguem o alvo.'},magic2_plus:{dmg:'7 × 10',what:'Espadas caem do céu.'},magic3_plus:{dmg:'28 + 40',what:'Uma espada gigante irrompe de um círculo mágico.'}};
function openInventory(){const p=document.getElementById('inv-panel');if(!p)return;inventoryOpen=true;setDefending(false);renderInventory();p.hidden=false;}
function closeInventory(){inventoryOpen=false;const p=document.getElementById('inv-panel');if(p)p.hidden=true;}
function equipBest(){const best=bestSword(SWORDS,ownedItems);if(best!==equippedSword)equipSword(best);if(coatOwned&&!coatOn)setCoat(true);renderInventory();status.textContent='Melhor equipamento: '+SWORDS[best].name+(coatOwned?' e Casaco de Pele':'')+'.';worldAudio.reveal();}
function renderInventory(){
 const body=document.getElementById('inv-body');if(!body)return;body.innerHTML='';
 const row=(title,sub,stats,btn,on)=>{const r=document.createElement('div');r.className='inv-row'+(on?' on':'');r.innerHTML='<div class="inv-txt"><strong>'+title+'</strong><span>'+sub+'</span></div><div class="inv-stats">'+stats+'</div>';if(btn)r.appendChild(btn);body.appendChild(r);};
 const head=t=>{const h=document.createElement('h3');h.textContent=t;body.appendChild(h);};
 const btn=(label,dis,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=!!dis;if(fn)bindInstantTap(b,()=>{fn();renderInventory();});return b;};
 const best=bestSword(SWORDS,ownedItems);head('ESPADAS');
 for(const id of Object.keys(SWORDS)){if(id!=='prota'&&!ownedItems.has(id))continue;const s=SWORDS[id],dmg=Math.round(s.damage*scrollMul());row(s.name+(id===best?' ★':''),id===best?'A melhor que você tem':'Espada',(scrollOwned?'<b>'+dmg+'</b> dano <small>(+20% pergaminho)</small>':'<b>'+dmg+'</b> dano')+' · alcance '+s.reach.toFixed(1),btn(equippedSword===id?'EQUIPADA':'EQUIPAR',equippedSword===id,()=>equipSword(id)),equippedSword===id);}
 if(coatOwned||scrollOwned){head('ROUPA E ENCANTAMENTOS');if(coatOwned)row('Casaco de Pele','Protege do frio','+15 vida · +10% mana',btn(coatOn?'DESEQUIPAR':'EQUIPAR',false,()=>setCoat(!coatOn)),coatOn);if(scrollOwned)row('Pergaminho de Encantamento','Sempre ativo','+20% dano da espada',null,true);}
 {const fr=questStep<ACT6N.desert?Math.min(4,bishopsDefeated):fragmentsHeld(questStep,act1Sub);if(bishopsDefeated>0&&questStep<ACT6N.done){head('FRAGMENTOS');row('Fragmentos espaciais','Caem dos Bispos; abrem o portal da Ganância','<b>'+fr+'</b> / 4',null,fr>=4);}}
 head('PODERES');let any=false;for(const id of Object.keys(SKILL_INFO)){if(!ownedItems.has(id))continue;any=true;const k=SKILLS[id]||SKILLS[id.replace('_plus','')]||{};row((SHOP_ITEMS.find(i=>i.id===id)||{}).name||id,SKILL_INFO[id].what,'<b>'+SKILL_INFO[id].dmg+'</b> dano · '+(k.mana||'—')+' mana · '+(k.cooldown?(k.cooldown/1000).toFixed(1)+' s':'—'),null,true);}
 if(!any){const p=document.createElement('p');p.className='inv-empty';p.textContent='Nenhum poder ainda. Compre na Loja.';body.appendChild(p);}
}
(function bindInventory(){const b=document.getElementById('inventory-btn'),c=document.getElementById('inv-close'),best=document.getElementById('inv-best');bindInstantTap(b,()=>{if(inventoryOpen)closeInventory();else openInventory();});bindInstantTap(c,closeInventory);bindInstantTap(best,equipBest);addEventListener('keydown',e=>{if((e.key==='i'||e.key==='I')&&!dialogueOpen&&!cineActive&&!(e.target&&/input/i.test(e.target.tagName))){if(inventoryOpen)closeInventory();else openInventory();}});})();
/* MOD 209 — Marco 7: Ato VI como no roteiro original (docs/roteiro/M7-ATO6.md). Substitui o arco final antigo nos
   passos 27–29: o deserto e a estátua dos fragmentos, o caos do ritual, a revanche dos quatro Bispos (tela de seleção com
   X), a Ganância em três formas (com o Anjo e Sandra lutando junto na última), a Inveja e o epílogo. Modelos novos do
   Blender: DesertoKit.glb (estátua, fragmento, portais, deserto) e Sandra-rig.glb (Sandra revelada). */
var act6World=null,act6Sandra=null,act6SandraRun=null,act6Allies=[],act6Fx=[],act6Form=0,greedClaimed=!!saved3DProgress.finaleClaimed,act6Chaos=0,act6Envy=null;
RIG_DEFS.sandra={file:'./Sandra-rig.glb?v=mod211',height:1.04,roles:RIG_DEFS.rival.roles,inPlace:RIG_DEFS.rival.inPlace};
Object.assign(SPEAKER_ACTOR,{[SPEAKERS6.sandra]:'rival',[SPEAKERS6.greed]:'enemy',[SPEAKERS6.greedSky]:'sky',[SPEAKERS6.envy]:'envy',[SPEAKERS6.b1]:'enemy',[SPEAKERS6.b2]:'enemy',[SPEAKERS6.b3]:'enemy',[SPEAKERS6.b4]:'enemy'});
Object.assign(STORY_EYE,{statue:20,angels:10,envy:3});
const DS=DESERT;
function buildAct6World(){
 const r6=(seed=>()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;})(209);// mesmo deserto a cada visita
 if(act6World)return act6World;const W=act6World={kit:null,decor:[]};
 marketObstacles.push({x:DS.statue.x,z:DS.statue.z,shape:'circle',radius:DS.statue.r,height:30});
 new GLTFLoader().load('./DesertoKit.glb?v=mod209',gltf=>{const kit={};for(const c of gltf.scene.children)kit[c.name]=c;W.kit=kit;
  const put=(k,x,z,yaw,s,shadow,lift)=>{const o=kit[k].clone(),gy=groundHeightAt(x,z);o.position.set(x,gy,z);o.rotation.y=yaw||0;if(s)o.scale.setScalar(s);if(lift){o.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(o);o.position.y+=gy-bb.min.y-.2;if(lift>1){o.position.x+=x-(bb.min.x+bb.max.x)/2;o.position.z+=z-(bb.min.z+bb.max.z)/2;}}o.traverse(m=>{if(m.isMesh){m.castShadow=!!shadow;m.receiveShadow=true;}});scene.add(o);W.decor.push(o);return o;};
  W.statue=put('Estatua',DS.statue.x,DS.statue.z,DS.statue.yaw,1,true);
  W.mystery=put('PortalMisterioso',DS.mystery.x,DS.mystery.z,-Math.PI/2,1,true,true);
  W.angels=put('PortalAnjos',DS.angels.x,DS.angels.z,DS.angels.yaw,1,true,2);W.angels.visible=false;
  const R=DESERT_REGION,rnd=(a,b)=>a+r6()*(b-a),free=(x,z)=>Math.hypot(x-DS.statue.x,z-DS.statue.z)>20&&Math.hypot(x-DS.mystery.x,z-DS.mystery.z)>10&&Math.hypot(x-DS.angels.x,z-DS.angels.z)>16&&Math.hypot(x-DS.offer.x+18,z-DS.offer.z-4)>10&&Math.hypot(x-DS.sandraStop.x,z-DS.sandraStop.z)>6;
  const spot=()=>{for(let i=0;i<20;i++){const x=rnd(R.cx-R.hx+4,R.cx+R.hx-4),z=rnd(R.cz-R.hz+3,R.cz+R.hz-3);if(free(x,z))return{x,z};}return{x:R.cx+R.hx-6,z:R.cz};};
  for(let i=0;i<DS.rocks;i++){const p=spot();put('Rocha',p.x,p.z,r6()*6,.6+r6()*1.2,true);}
  for(let i=0;i<DS.cacti;i++){const p=spot();put('Cacto',p.x,p.z,r6()*6,.8+r6()*.6,false);}
  for(let i=0;i<DS.bones;i++){const p=spot();put('Ossada',p.x,p.z,r6()*6,1+r6()*.6,false);}
  // Portal misterioso: redemoinho violeta no anel.
  const disc=new THREE.Mesh(new THREE.CircleGeometry(3.7,40),new THREE.MeshBasicMaterial({color:0x3a1060,transparent:true,opacity:.85,side:THREE.DoubleSide}));disc.position.set(0,0,0);disc.rotation.y=Math.PI/2;W.mystery.add(disc);
  const g=glowSprite(0xb070ff,.7,10);g.position.set(0,0,0);W.mystery.add(g);W.mysteryDisc=disc;
  syncAct6World();
 },undefined,e=>console.warn('DesertoKit.glb não carregou.',e));
 // Dunas (montes de areia instanciados) e areia soprada pelo vento.
 const dg=new THREE.SphereGeometry(1,14,7,0,Math.PI*2,0,Math.PI/2),dm=new THREE.MeshStandardMaterial({color:0xd8b27a,roughness:1}),dunes=new THREE.InstancedMesh(dg,dm,DS.dunes),d=new THREE.Object3D(),R=DESERT_REGION;
 for(let i=0;i<DS.dunes;i++){let x,z;do{x=R.cx+(r6()-.5)*2*(R.hx-4);z=R.cz+(r6()-.5)*2*(R.hz-3);}while(Math.hypot(x-DS.statue.x,z-DS.statue.z)<20||Math.hypot(x-DS.mystery.x,z-DS.mystery.z)<9||Math.hypot(x-DS.angels.x,z-DS.angels.z)<16||Math.hypot(x-DS.offer.x+18,z-DS.offer.z-4)<9||Math.hypot(x-DS.sandraStop.x,z-DS.sandraStop.z)<6);
  d.position.set(x,groundHeightAt(x,z)-.4,z);d.rotation.y=r6()*6;d.scale.set(4+r6()*6,.55+r6()*.5,2.5+r6()*3);d.updateMatrix();dunes.setMatrixAt(i,d.matrix);}
 dunes.receiveShadow=true;scene.add(dunes);W.decor.push(dunes);
 const N=terrainLowSpec?160:320,sp=new Float32Array(N*3);for(let i=0;i<N;i++){sp[i*3]=(r6()-.5)*50;sp[i*3+1]=r6()*4;sp[i*3+2]=(r6()-.5)*50;}
 const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));W.sand=new THREE.Points(sg,new THREE.PointsMaterial({color:0xe8c890,size:.07,transparent:true,opacity:.7,depthWrite:false}));W.sand.frustumCulled=false;W.sand.visible=false;scene.add(W.sand);
 // Caos do ritual: chuva, rachaduras no chão, três redemoinhos e o vórtice na frente da estátua.
 const RN=terrainLowSpec?500:1100,rp=new Float32Array(RN*3);for(let i=0;i<RN;i++){rp[i*3]=(r6()-.5)*60;rp[i*3+1]=r6()*30;rp[i*3+2]=(r6()-.5)*60;}
 const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.BufferAttribute(rp,3));W.rain=new THREE.Points(rg,new THREE.PointsMaterial({color:0xa8b4c8,size:.09,transparent:true,opacity:.75,depthWrite:false}));W.rain.frustumCulled=false;W.rain.visible=false;scene.add(W.rain);
 const cc=document.createElement('canvas');cc.width=cc.height=512;{const x=cc.getContext('2d');x.lineCap='round';for(let i=0;i<26;i++){let px=256,py=256;const a=i/26*6.283+r6()*.2;x.beginPath();x.moveTo(px,py);for(let k=0;k<9;k++){px+=Math.cos(a+(r6()-.5)*.9)*28;py+=Math.sin(a+(r6()-.5)*.9)*28;x.lineTo(px,py);}x.strokeStyle='rgba(255,90,20,.95)';x.lineWidth=5;x.stroke();x.strokeStyle='rgba(255,220,140,.9)';x.lineWidth=1.5;x.stroke();}}
 W.cracks=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cc),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));W.cracks.rotation.x=-Math.PI/2;W.cracks.position.set(DS.statue.x,groundHeightAt(DS.statue.x,DS.statue.z)+.15,DS.statue.z-8);scene.add(W.cracks);
 const tc=document.createElement('canvas');tc.width=64;tc.height=256;{const x=tc.getContext('2d');for(let i=0;i<40;i++){x.fillStyle='rgba(230,200,150,'+(.2+r6()*.5)+')';x.fillRect(0,r6()*256,64,2+r6()*6);}}
 const tt=new THREE.CanvasTexture(tc);tt.wrapS=tt.wrapT=THREE.RepeatWrapping;
 W.tornados=[];for(let i=0;i<3;i++){const t=tt.clone();t.needsUpdate=true;t.repeat.set(3,2);const m=new THREE.Mesh(new THREE.CylinderGeometry(5,.6,26,20,1,true),new THREE.MeshBasicMaterial({map:t,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}));m.visible=false;scene.add(m);W.tornados.push({m,a:i*2.1,r:28+i*6});}
 W.vortex=new THREE.Group();{const ring=new THREE.Mesh(new THREE.TorusGeometry(5,.35,10,48),new THREE.MeshBasicMaterial({color:0xff5a20,toneMapped:false}));W.vortex.add(ring);const disc=new THREE.Mesh(new THREE.CircleGeometry(4.8,48),new THREE.MeshBasicMaterial({color:0x200008,transparent:true,opacity:.9,side:THREE.DoubleSide}));W.vortex.add(disc);W.vortex.add(glowSprite(0xff4a20,.75,14));}
 W.vortex.position.set(DS.statue.x,groundHeightAt(DS.statue.x,DS.statue.z)+6,DS.offer.z+5.5);W.vortex.visible=false;scene.add(W.vortex);
 W.frags=[];return W;
}
function syncAct6World(){const W=act6World;if(!W)return;if(W.angels)W.angels.visible=questStep===ACT6N.greed&&act1Sub>=1||W.angelsOn;if(W.mystery)W.mystery.visible=questStep>=ACT6N.desert&&questStep<=ACT6N.greed;}
function updateAct6World(dt,now){
 const W=act6World;if(!W)return;const P=player.position,t=now*.001,inD=inDesert(P.x,P.z)&&!voidMode;
 W.sand.visible=inD&&act6Chaos<.5;if(W.sand.visible){W.sand.position.set(P.x,groundHeightAt(P.x,P.z),P.z);const a=W.sand.geometry.attributes.position;for(let i=0;i<a.count;i++){let x=a.array[i*3]+dt*(6+(i%5));if(x>25)x=-25;a.array[i*3]=x;a.array[i*3+1]=(a.array[i*3+1]+Math.sin(t*3+i)*dt*.3+4)%4;}a.needsUpdate=true;}
 if(inD&&scene.fog&&act6Chaos<.5){scene.fog.color.lerp(new THREE.Color(0xe0c08a),.2);scene.fog.far=Math.min(scene.fog.far,170);}
 const on=act6Chaos>0;W.rain.visible=on;W.cracks.material.opacity+=((on?.9:0)-W.cracks.material.opacity)*Math.min(1,dt*1.5);W.vortex.visible=on&&W.vortexOn;
 if(on){W.rain.position.set(P.x,groundHeightAt(P.x,P.z),P.z);const a=W.rain.geometry.attributes.position;for(let i=0;i<a.count;i++){let y=a.array[i*3+1]-dt*24;if(y<0)y=30;a.array[i*3+1]=y;}a.needsUpdate=true;
  if(scene.fog){scene.fog.color.lerp(new THREE.Color(0x1a1418),.5);scene.fog.far=Math.min(scene.fog.far,90);}hemiLight.intensity*=.55;
  W.vortex.rotation.z+=dt*1.6;W.vortex.children[0].scale.setScalar(1+Math.sin(t*6)*.04);
  if(Math.random()<dt*.5){storyFlash('white',260);worldAudio.thunder&&worldAudio.thunder();}
  for(const tr of W.tornados){tr.m.visible=true;tr.a+=dt*.25;tr.m.position.set(DS.statue.x+Math.cos(tr.a)*tr.r,groundHeightAt(DS.statue.x,DS.statue.z)+13,DS.statue.z+Math.sin(tr.a)*tr.r);tr.m.rotation.y+=dt*4;tr.m.material.map.offset.y-=dt*.8;}}
 else for(const tr of W.tornados)tr.m.visible=false;
 if(W.mysteryDisc)W.mysteryDisc.rotation.z+=dt*.7;
 for(let i=act6Fx.length-1;i>=0;i--){const f=act6Fx[i];f.t+=dt;if(f.tick(f.t,dt)===false)act6Fx.splice(i,1);}
 if(act6Sandra)act6Sandra.mixer.update(dt);if(act6Envy&&act6Envy.mixer)act6Envy.mixer.update(dt);
 for(const a of act6Allies)a.tick(dt);
}
/* ---------- Fragmentos voando até a esfera ---------- */
function flyFragments(){
 const W=act6World;if(!W||!W.kit)return;const P=player.position,gy=groundHeightAt(DS.statue.x,DS.statue.z),orb=new THREE.Vector3(DS.orb.x,gy+DS.orb.y,DS.orb.z),cols=[0xff6a40,0xffc040,0x60a0ff,0xc070ff];
 for(let i=0;i<4;i++){const f=W.kit.Fragmento.clone();f.scale.setScalar(.8);f.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.emissive=new THREE.Color(cols[i]);o.material.emissiveIntensity=2.5;}});const g=glowSprite(cols[i],.8,2.2);f.add(g);scene.add(f);
  const a=i/4*Math.PI*2+Math.PI/4,end=orb.clone().add(new THREE.Vector3(Math.cos(a)*2.4,Math.sin(a)*2.4,-2.3)),start=new THREE.Vector3(P.x+(i-1.5)*.6,P.y+1.4,P.z);
  act6Fx.push({t:0,tick(t){const k=Math.min(1,Math.max(0,(t-i*.35)/1.6)),e=k*k*(3-2*k);f.position.lerpVectors(start,end,e);f.position.y+=Math.sin(e*Math.PI)*6;f.rotation.y+=.1;if(t>4){W.frags.push(f);return false;}}});}
 worldAudio.reveal();worldAudio.magic&&worldAudio.magic('ultimate');
}
function clearFragments(){const W=act6World;if(!W)return;for(const f of W.frags.splice(0))scene.remove(f);}
/* ---------- Aliados na forma final (o Anjo e Sandra não sofrem dano; golpes próprios) ---------- */
function startAllies6(){
 act6Allies.length=0;const e=()=>enemy.visible&&enemyAlive?enemy.position:null;
 // O Anjo: escudos de luz e pilares que descem do céu sobre a Ganância.
 act6Allies.push({cd:2.2,tick(dt){const p=e();if(!p||cineActive)return;guide.visible=true;const dx=p.x-guide.position.x,dz=p.z-guide.position.z,d=Math.hypot(dx,dz);faceTo(guide,p);if(d>5){guide.position.x+=dx/d*dt*4;guide.position.z+=dz/d*dt*4;}guide.position.y=voidSpec.y;
  this.cd-=dt;if(this.cd>0)return;this.cd=3+Math.random();const beam=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.2,30,16,1,true),new THREE.MeshBasicMaterial({color:0xfff4d0,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));beam.position.set(p.x,p.y+15,p.z);scene.add(beam);worldAudio.magic&&worldAudio.magic('magic3');
  act6Fx.push({t:0,tick(t){beam.material.opacity=Math.max(0,.75-t*.9);beam.scale.x=beam.scale.z=1+t*.6;if(t>.85){scene.remove(beam);return false;}}});
  setTimeout(()=>{if(!enemy.visible||!enemyAlive)return;enemyHP=Math.max(0,enemyHP-18);const q=enemy.position.clone();q.y+=2;damageNumber(q,'18','');burstSparks(q,0xfff0b8);},260);}});
 // Sandra: cortes cruzados e ilusões.
 act6Allies.push({cd:1.4,hits:0,tick(dt){const s=act6Sandra,p=e();if(!s||!p||cineActive)return;const h=s.holder,src=rigSource(s.rig||'rival');const dx=p.x-h.position.x,dz=p.z-h.position.z,d=Math.hypot(dx,dz);h.rotation.y=Math.atan2(dx,dz);h.position.y=voidSpec.y;
  if(d>2.8){h.position.x+=dx/d*dt*5.5;h.position.z+=dz/d*dt*5.5;return;}this.cd-=dt;if(this.cd>0)return;this.cd=2+Math.random()*.8;this.hits++;
  if(src&&src.actions.attack){s.mixer.stopAllAction();const a=s.mixer.clipAction(src.actions.attack.getClip());a.reset();a.setLoop(THREE.LoopOnce,1);a.play();}
  const big=this.hits%3===0;for(let k=0;k<(big?2:1);k++){const x=glowSprite(0xff2a5a,.95,big?5:3);x.position.set(p.x,p.y+1.6,p.z);x.scale.set(big?6:4,.35,1);x.material.rotation=k?-.8:.8;scene.add(x);act6Fx.push({t:0,tick(t){x.material.opacity=Math.max(0,.95-t*2);if(t>.5){scene.remove(x);return false;}}});}
  setTimeout(()=>{if(!enemy.visible||!enemyAlive)return;const dmg=big?24:12;enemyHP=Math.max(0,enemyHP-dmg);const q=enemy.position.clone();q.y+=1.8;damageNumber(q,String(dmg),big?'crit':'');burstSparks(q,0xff4a7a);worldAudio.hit();},300);}});
}
function stopAllies6(){act6Allies.length=0;}
/* ---------- A revanche: tela de seleção com X ---------- */
function openRematch(){
 const p=document.getElementById('rematch-panel');if(!p)return;const done=Math.min(4,act1Sub),cards=document.getElementById('rematch-cards');cards.innerHTML='';
 REMATCH.forEach((r,i)=>{const c=document.createElement('div');c.className='rm-card'+(i<done?' done':i===done?' next':'');c.innerHTML='<img src="./'+DIMENSIONS[r.key].portrait+'" alt=""><span>'+r.name+'</span>'+(i<done?'<b class="rm-x">✕</b>':'');cards.appendChild(c);});
 document.getElementById('rematch-go').textContent=done>=4?'CONTINUAR':'LUTAR · '+REMATCH[done].name;p.hidden=false;
}
function closeRematch(){const p=document.getElementById('rematch-panel');if(p)p.hidden=true;}
function rematchGo(){
 closeRematch();const r=nextRematch(act1Sub);
 if(!r){act1Advance(ACT6N.rematch,4);status.textContent='Os quatro caíram de novo. Volte à estátua com os fragmentos.';return;}
 updateHeartsHud(true);if(!canChallengeBishop(heartState)){showDialogue([{who:playerName||'Herói',text:'Meus corações se apagaram. Preciso esperar um voltar — '+formatTimer(msToNextHeart(heartState))+'.'}]);return;}
 delete storyAnchors.enemy;delete storyAnchors.sky;
 startDimensionBattle(r.key,{hp:r.hp,returnTo:{x:DS.mystery.x-8,z:DS.mystery.z},onVictory:()=>{act1Advance(ACT6N.rematch,act1Sub+1);setTimeout(openRematch,700);},onAbort:()=>{status.textContent='Sem corações. Recupere um e entre de novo no portal misterioso.';}});
}
function rematchIntro(){const r=nextRematch(act1Sub);if(!dimBattle||questStep!==ACT6N.rematch||!r||dimBattle.key!==r.key)return;playStory('revanche',rematchIntroScene(r.key),{focus:'enemy',face:'enemy'});}
/* ---------- A Ganância: três formas no mesmo combate ---------- */
function startGreedBattle(){
 updateHeartsHud(true);if(!canChallengeBishop(heartState)){showDialogue([{who:playerName||'Herói',text:'Meus corações se apagaram. Preciso esperar um voltar — '+formatTimer(msToNextHeart(heartState))+'.'}]);return;}
 act6Form=0;act6Chaos=0;delete storyAnchors.enemy;delete storyAnchors.sky;
 startDimensionBattle('greed',{hp:GREED_FORMS[0].hp,returnTo:{x:DS.offer.x-18,z:DS.offer.z+4},onVictory:greedVictory,onAbort:()=>{stopAllies6();if(act6Sandra){disposeClone(act6Sandra);act6Sandra=null;}guidePinned=false;status.textContent='Sem corações. Recupere um e coloque os fragmentos na estátua de novo.';}});
}
function greedIntro(){if(!dimBattle||dimBattle.key!=='greed'||questStep!==ACT6N.greed)return;playStory('ganancia',greedIntroScene(),{focus:'enemy',face:'enemy'});}
function revealGreedForm(i){const f=GREED_FORMS[i],sp=arenaSpots('greed').boss;loadRig(f.rig).then(()=>{useRig(f.rig);revealEncounter(f.profile,sp,f.hp,'');enemy.visible=true;enemyAlive=true;bossRageAnnounced=false;if(enemyActions.arise)playEnemyAnimation('arise',.1,true);enemyAttackCooldown=2.4;const hud=document.getElementById('enemy-hud');if(hud){hud.style.display='';hud.classList.add('boss');}syncEnemyLabel();});}
/** Chamado quando uma forma da Ganância cai (true = tratado). */
function act6GreedDefeat(){
 if(!dimBattle||dimBattle.key!=='greed'||questStep!==ACT6N.greed)return false;
 enemy.visible=true;
 if(act6Form<2){act6Form++;const steps=act6Form===1?greedPhase2Scene():greedPhase3Scene();playStory('ganancia-'+act6Form,steps,{focus:'enemy',done:()=>{if(act6Form===2)startAllies6();}});return true;}
 stopAllies6();dimBattle.outro=true;playStory('ganancia-cai',greedFallScene(),{focus:'enemy',done:()=>{dimensionVictory();}});return true;
}
function greedVictory(){
 const rw=greedReward(greedClaimed);greedClaimed=true;finaleClaimed=true;if(rw.coins){coins+=rw.coins;gainXp(rw.xp);bumpStat('bishops');}bestiaryKnown.add('ganancia');
 enemy.visible=false;useRig('enemy1');const hud=document.getElementById('enemy-hud');if(hud)hud.classList.remove('boss');
 act1Advance(ACT6N.greed,1);act6Chaos=0;setGameHour(9);showRewardPop((rw.coins?'+'+rw.coins+' MOEDAS · +'+rw.xp+' XP':''));act1Toast('A GANÂNCIA CAIU');
 playEpilogue();
}
function playEpilogue(){
 const P=player.position,ex=DS.offer.x-18,ez=DS.offer.z+4;P.set(ex,terrainHeightAt(ex,ez),ez);act1Lock=true;guide.visible=true;guidePinned=true;guide.position.set(P.x+2.4,terrainHeightAt(P.x+2.4,P.z+1),P.z+1);faceTo(guide,P);
 const go=()=>{// os dois modelos carregam antes (ao continuar um jogo salvo aqui, a pessoa misteriosa ainda não existe)
  if(act6Sandra){disposeClone(act6Sandra);act6Sandra=null;}const sx=P.x-2.2,sz=P.z+1.2;if(rigs.rival)act6Sandra=makeFoeClone('rival',{x:sx,z:sz},{role:'idle'});if(act6Sandra){act6Sandra.rig='rival';faceTo(act6Sandra.holder,P);}
  storyAnchors.rival={x:sx,z:sz,yaw:Math.atan2(P.x-sx,P.z-sz)};storyAnchors.angels={x:DS.angels.x,z:DS.angels.z,yaw:-Math.PI/2};faceTo(player,guide.position);
  playStory('epilogo',epilogueScene(),{focus:'guide',face:'guide',done:()=>{act1Lock=false;finishAct6();}});
 };
 Promise.all([loadRig('rival'),loadRig('sandra')]).then(go,go);
}
function finishAct6(){
 guidePinned=false;guide.visible=false;if(act6Sandra){disposeClone(act6Sandra);act6Sandra=null;}act6World.angelsOn=false;syncAct6World();
 questStep=ACT6N.done;act1Sub=0;save3DProgress();updateQuestHud();setCineFade(0,1.2,false);freeNextGalaxy();
}
/* ---------- Etapas do Ato VI ---------- */
function updateAct6(dt,now){
 if(questStep>=ACT6N.desert&&questStep<=ACT6N.done&&!act6World)buildAct6World();
 updateAct6World(dt,now);if(act6SandraRun)stepSandra6(dt);
 if(!isAct6Step(questStep))return;
 if(!rigLoads.rival)loadRig('rival').catch(()=>{});
 const px=player.position.x,pz=player.position.z,near=(p,r)=>Math.hypot(p.x-px,p.z-pz)<r,mark=p=>{questMarker.visible=true;questMarker.position.set(p.x,terrainHeightAt(p.x,p.z)+.06,p.z);};
 storyAnchors.statue={x:DS.statue.x,z:DS.statue.z,yaw:0};if(act6Sandra){const h=act6Sandra.holder;storyAnchors.rival={x:h.position.x,z:h.position.z,yaw:h.rotation.y};}
 const q=questStep,s=act1Sub;
 if(q===ACT6N.desert){
  if(s===0){if(!act6Sandra&&rigs.rival){act6Sandra=makeFoeClone('rival',{x:px+2.2,z:pz+1},{role:'idle'});if(act6Sandra){act6Sandra.rig='rival';act6SandraRun={path:DESERT_PASS.map(([x,z])=>({x,z})).concat([DS.sandraStop]),i:0,speed:5};}}
   if(act6Sandra)mark(act6Sandra.holder.position);else mark(DS.offer);
   if(act6World.sandraArrived&&near(DS.sandraStop,14)&&!act1Busy()){act1Lock=true;faceTo(player,DS.statue);playStory('deserto',desertArrivalScene(),{focus:'rival',done:()=>{act1Lock=false;act1Advance(ACT6N.desert,1);status.textContent='Coloque os fragmentos na estátua.';}});}
   return;}
  if(s===1){mark(DS.offer);return;}
  if(s===2){mark(DS.offer);if(near(DS.offer,7)&&!act1Busy()){act1Lock=true;playStory('portal-fechado',closedPortalScene(),{focus:'hero',done:()=>{act1Lock=false;act1Advance(ACT6N.desert,3);}});}return;}
  if(s===3){mark(DS.mystery);return;}
 }
 if(q===ACT6N.rematch){mark(s>=4?DS.offer:DS.mystery);return;}
 if(q===ACT6N.greed&&s===0&&!dimBattle)mark(DS.offer);
 if(q===ACT6N.greed&&s===1&&!act1Busy()&&!dimBattle)playEpilogue();
}
function stepSandra6(dt){
 const r=act6SandraRun,c=act6Sandra;if(!r||!c){act6SandraRun=null;return;}const h=c.holder,t=r.path[r.i];
 if(!t){act6SandraRun=null;act6World.sandraArrived=true;faceTo(h,player.position);const src=rigSource('rival');if(src&&src.actions.idle){c.mixer.stopAllAction();c.mixer.clipAction(src.actions.idle.getClip()).play();}return;}
 const dx=t.x-h.position.x,dz=t.z-h.position.z,d=Math.hypot(dx,dz);if(d<.5){r.i++;return;}
 if(Math.hypot(player.position.x-h.position.x,player.position.z-h.position.z)>12){faceTo(h,player.position);return;}
 const s=Math.min(d,dt*r.speed);h.position.x+=dx/d*s;h.position.z+=dz/d*s;h.position.y=terrainHeightAt(h.position.x,h.position.z);h.rotation.y=Math.atan2(dx,dz);
 if(!r.running){r.running=true;const src=rigSource('rival');if(src&&src.actions.run){c.mixer.stopAllAction();c.mixer.clipAction(src.actions.run.getClip()).play();}}
}
function act6Label(){
 if(cineActive||!isAct6Step(questStep)||voidMode)return '';const px=player.position.x,pz=player.position.z,d=(p,r)=>Math.hypot(p.x-px,p.z-pz)<=r,q=questStep,s=act1Sub;
 if(((q===ACT6N.desert&&s===1)||(q===ACT6N.rematch&&s>=4)||(q===ACT6N.greed&&s===0))&&d(DS.offer,6))return 'COLOCAR OS FRAGMENTOS';
 if(((q===ACT6N.desert&&s===3)||(q===ACT6N.rematch&&s<4))&&d(DS.mystery,7))return 'ENTRAR NO PORTAL';
 return '';
}
function act6Interact(){
 const l=act6Label();if(!l)return false;const q=questStep;
 if(l==='COLOCAR OS FRAGMENTOS'){act1Lock=true;faceTo(player,DS.statue);
  if(q===ACT6N.desert){storyAnchors.greed={x:DS.statue.x,z:DS.offer.z+2,yaw:Math.PI};playStory('estatua',statueScene(),{focus:'hero',done:()=>{act1Lock=false;act1Advance(ACT6N.desert,2);status.textContent='Vá até a estátua.';}});}
  else{act1Advance(ACT6N.greed,0);playStory('estatua-2',returnStatueScene(),{focus:'hero',done:()=>{act1Lock=false;act6Chaos=0;if(act6World)act6World.vortexOn=false;clearFragments();startGreedBattle();}});}
  return true;}
 if(l==='ENTRAR NO PORTAL'){
  if(q===ACT6N.desert){act1Lock=true;faceTo(player,DS.mystery);playStory('portal-misterioso',mysteryPortalScene(),{focus:'hero',done:()=>{act1Lock=false;act1Advance(ACT6N.rematch,0);storyFlash('#200030',600);worldAudio.portalEnter();setTimeout(openRematch,500);}});}
  else openRematch();
  return true;}
 return false;
}
/** Ações das cenas do Ato VI (passos "do"). */
function storyDo6(id,args){
 const P=player.position,W=act6World;
 switch(id){
  case 'fragmentos':flyFragments();return true;
  case 'caos':act6Chaos=1;if(W)W.vortexOn=true;cameraShake(.5);vibrate(150);worldAudio.thunder&&worldAudio.thunder();worldAudio.corrupt();setGameHour(20);return true;
  case 'caos-forte':cameraShake(.8);storyFlash('white',300);return true;
  case 'puxar-misteriosa':{const c=act6Sandra;if(c){const h=c.holder,from=h.position.clone(),to=W.vortex.position.clone();act6Fx.push({t:0,tick(t){const k=Math.min(1,t/1.8);h.position.lerpVectors(from,to,k*k);h.rotation.y+=.3;h.scale.setScalar(Math.max(.01,1-k*.9));if(k>=1){h.visible=false;return false;}}});}worldAudio.portalEnter();return true;}
  case 'puxar-heroi':{const to=W.vortex.position.clone();storyMove={from:{x:P.x,z:P.z},to:{x:to.x,z:to.z},t:0,dur:1.6,done:()=>{}};storyFlash('#300000',900);worldAudio.portalEnter();return true;}
  case 'ganancia-aparece':{const g=storyAnchors.greed;loadRig('greed1').then(()=>{const c=makeFoeClone('greed1',{x:g.x,z:g.z},{role:'idle',scale:1.4});if(c){faceTo(c.holder,P);W.greedClone=c;act6Fx.push({t:0,tick(){c.mixer.update(.016);if(!W.greedClone)return false;}});}},()=>{});storyFlash('#400000',700);worldAudio.corrupt();return true;}
  case 'ganancia-some':{const c=W.greedClone;W.greedClone=null;if(c)act6Fx.push({t:0,tick(t){c.holder.scale.setScalar(Math.max(.01,1.4*(1-t)));if(t>1){disposeClone(c);return false;}}});storyFlash('#200000',500);return true;}
  case 'calma':act6Chaos=0;if(W)W.vortexOn=false;clearFragments();if(act6Sandra){disposeClone(act6Sandra);act6Sandra=null;}setGameHour(15);return true;
  case 'aviso-fragmentos':{const t=document.getElementById('quest-toast');if(t){t.textContent='Os fragmentos já foram usados. Para abrir um novo portal, junte de novo os 4 fragmentos espaciais.';t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),4200);}worldAudio.block&&worldAudio.block();storyAnchors.sky={x:DS.statue.x,z:DS.statue.z,y:groundHeightAt(DS.statue.x,DS.statue.z)+24,yaw:0};return true;}
  case 'encontre-portal':{const t=document.getElementById('quest-toast');if(t){t.textContent='ENCONTRE UM PORTAL MISTERIOSO';t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),3200);}worldAudio.chapter();return true;}
  case 'fragmento-cai':{const e=enemy.position,s=glowSprite(0xc070ff,.95,2.6);s.position.set(e.x,e.y+1.5,e.z);scene.add(s);act6Fx.push({t:0,tick(t){s.position.lerp(P.clone().setY(P.y+1.2),.06);s.material.opacity=Math.max(0,.95-t*.5);if(t>1.8){scene.remove(s);return false;}}});showRewardPop('+1 FRAGMENTO ESPACIAL · '+Math.min(4,act1Sub+1)+'/4');worldAudio.reveal();return true;}
  case 'transformar':{storyFlash('#500000',900);cameraShake(.6);vibrate(140);worldAudio.corrupt();revealGreedForm(act6Form);return true;}
  case 'aliados-chegam':{storyFlash('white',800);worldAudio.celestial&&worldAudio.celestial();guide.visible=true;guidePinned=true;guide.position.set(P.x+2.4,voidSpec.y,P.z+1.2);faceTo(guide,enemy.position);
   if(act6Sandra){disposeClone(act6Sandra);act6Sandra=null;}if(rigs.rival){act6Sandra=makeFoeClone('rival',{x:P.x-2.4,z:P.z+1.2},{role:'idle'});if(act6Sandra){act6Sandra.rig='rival';act6Sandra.holder.position.y=voidSpec.y;faceTo(act6Sandra.holder,enemy.position);storyAnchors.rival={x:P.x-2.4,z:P.z+1.2,y:voidSpec.y,yaw:0};}}return true;}
  case 'ultimate-heroi':{faceTo(player,enemy.position);castDivineJudgment();if(ultimateFx){ultimateFx.g.position.set(enemy.position.x,voidSpec.y,enemy.position.z);ultimateFx.target.set(enemy.position.x,voidSpec.y,enemy.position.z);}return true;}
  case 'ultimate-anjo':{const e=enemy.position,g=new THREE.Group();g.position.set(e.x,voidSpec.y,e.z);scene.add(g);for(let i=0;i<3;i++){const r=new THREE.Mesh(new THREE.RingGeometry(2+i*1.6,2.3+i*1.6,64),new THREE.MeshBasicMaterial({color:0xfff4d0,transparent:true,opacity:.9,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));r.rotation.x=-Math.PI/2;r.position.y=.1+i*.05;g.add(r);}
   const col=new THREE.Mesh(new THREE.CylinderGeometry(2.4,3.2,60,24,1,true),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));col.position.y=30;g.add(col);worldAudio.celestial&&worldAudio.celestial();
   act6Fx.push({t:0,tick(t){g.children.forEach((c,i)=>{if(c!==col)c.rotation.z+=.02*(i%2?1:-1);});col.material.opacity=Math.min(.85,t*.8);col.scale.x=col.scale.z=1+t*.5;cameraShake(.05);if(t>2.6){scene.remove(g);return false;}}});return true;}
  case 'ultimate-sandra':{// MOD 210 — a cruz demoníaca da referência: surge no alto, gira e crava na Ganância; depois os cortes vermelhos
   const e=enemy.position,g=new THREE.Group(),red=new THREE.MeshStandardMaterial({color:0x2a0006,emissive:0xff1030,emissiveIntensity:1.6,metalness:.4,roughness:.3}),dark=new THREE.MeshStandardMaterial({color:0x0a0a0e,metalness:.5,roughness:.35});
   g.add(new THREE.Mesh(new THREE.BoxGeometry(.6,8,.4),red),new THREE.Mesh(new THREE.BoxGeometry(4.4,.6,.4),red).translateY(2.2),new THREE.Mesh(new THREE.BoxGeometry(.9,9,.2),dark).translateZ(-.12));
   for(const [x,y,r] of [[0,4.6,0],[0,-4.6,Math.PI],[2.5,2.2,-Math.PI/2],[-2.5,2.2,Math.PI/2]]){const sp=new THREE.Mesh(new THREE.ConeGeometry(.42,1.4,4),red);sp.position.set(x,y,0);sp.rotation.z=r;g.add(sp);}
   const gem=glowSprite(0xff2040,1,3.4);gem.position.y=2.2;g.add(gem);g.position.set(e.x,e.y+16,e.z);scene.add(g);worldAudio.whoosh();worldAudio.corrupt();
   act6Fx.push({t:0,tick(t){g.rotation.y+=.25*(t<1?1:.2);if(t<.7)g.position.y=e.y+16-2*t;else if(t<1.05){const k=(t-.7)/.35;g.position.y=e.y+14.6-11*k*k;}else if(!g.userData.hit){g.userData.hit=true;g.position.y=e.y+3.6;cameraShake(.5);burstSparks(e.clone().setY(e.y+1),0xff2040);vibrate(120);
     for(let k=0;k<6;k++){const sl=glowSprite(0xff1a4a,.95,7);sl.position.set(e.x,e.y+2,e.z);sl.scale.set(10,.5,1);sl.material.rotation=k*Math.PI/6;scene.add(sl);act6Fx.push({t:0,tick(t2){const v=t2-k*.08;sl.material.opacity=v>0?Math.max(0,.95-v*1.2):0;if(t2>1.5){scene.remove(sl);return false;}}});}}
     if(t>1.05)g.traverse(o=>{if(o.material&&o.material.emissiveIntensity!==undefined)o.material.emissiveIntensity=Math.max(.2,1.6-(t-1.05)*2);});
     if(t>2.2){scene.remove(g);g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});return false;}}});return true;}
  case 'tudo-branco':setCineFade(1,.6,true);storyFlash('white',1600);setTimeout(()=>setCineFade(0,1.2,true),1000);return true;
  case 'ganancia-caida':enemy.visible=true;playEnemyAnimation('death',.1,true);return true;
  case 'rachadura':{const e=enemy.position,c=document.createElement('canvas');c.width=128;c.height=512;const x=c.getContext('2d');x.fillStyle='#000';x.beginPath();x.moveTo(64,0);for(let i=1;i<=16;i++)x.lineTo(64+(Math.random()-.5)*(60-Math.abs(i-8)*6),i*32);for(let i=16;i>=0;i--)x.lineTo(64+(Math.random()-.5)*20,i*32);x.fill();x.strokeStyle='#9a4aff';x.lineWidth=4;x.stroke();
   const m=new THREE.Mesh(new THREE.PlaneGeometry(4,16),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,side:THREE.DoubleSide}));m.position.set(e.x+5,voidSpec.y+8,e.z+2);faceTo(m,P);scene.add(m);storyAnchors.envy={x:e.x+5,z:e.z+2,y:voidSpec.y,yaw:Math.atan2(P.x-e.x-5,P.z-e.z-2)};act6World.crack=m;act6Fx.push({t:0,tick(t){m.scale.y=Math.min(1,t*2);if(!act6World.crack)return false;}});cameraShake(.5);worldAudio.corrupt();return true;}
  case 'inveja-surge':{const a=storyAnchors.envy;loadRig('enemy4').then(()=>{const c=makeFoeClone('enemy4',{x:a.x,z:a.z},{role:'idle',scale:2.4});if(!c)return;c.holder.position.y=voidSpec.y;c.holder.rotation.y=a.yaw;c.holder.traverse(o=>{if(o.isMesh)o.material=new THREE.MeshBasicMaterial({color:0x010203});});
   for(const sx of [-.12,.12]){const ey=glowSprite(0x6aff8a,.95,.5);ey.position.set(sx*2.4,1.9*2.4*.42,.35);c.holder.add(ey);}const rim=glowSprite(0x2a8a4a,.35,9);rim.position.y=3;c.holder.add(rim);act6Envy=c;},()=>{});storyFlash('#002010',700);return true;}
  case 'roubar-alma':{const e=enemy.position.clone(),a=storyAnchors.envy,soul=glowSprite(0xffd060,.95,2.4);soul.position.set(e.x,e.y+1.5,e.z);scene.add(soul);worldAudio.corrupt();
   act6Fx.push({t:0,tick(t){const k=Math.min(1,t/2);soul.position.set(e.x+(a.x-e.x)*k,e.y+1.5+Math.sin(k*Math.PI)*3+k*2,e.z+(a.z-e.z)*k);soul.material.color.lerp(new THREE.Color(0x6aff8a),.03);if(enemyModel)enemyModel.traverse(o=>{if(o.isMesh){o.material.transparent=true;o.material.opacity=Math.max(0,1-t*.6);}});if(t>2.2){scene.remove(soul);enemy.visible=false;return false;}}});return true;}
  case 'inveja-some':{const c=act6Envy;act6Envy=null;if(c)act6Fx.push({t:0,tick(t){c.holder.scale.setScalar(Math.max(.01,2.4*(1-t)));if(t>1){disposeClone(c);return false;}}});if(act6World.crack){scene.remove(act6World.crack);act6World.crack=null;}storyFlash('white',900);
   if(enemyModel)enemyModel.traverse(o=>{if(o.isMesh&&o.material){o.material.opacity=1;o.material.transparent=false;}});return true;}
  case 'sandra-revela':{const c=act6Sandra;if(!c)return true;const p={x:c.holder.position.x,z:c.holder.position.z},yaw=c.holder.rotation.y;storyFlash('#ff3050',700);worldAudio.reveal();
   loadRig('sandra').then(()=>{disposeClone(c);act6Sandra=makeFoeClone('sandra',p,{role:'idle'});if(act6Sandra){act6Sandra.rig='sandra';act6Sandra.holder.rotation.y=yaw;}},()=>{});return true;}
  case 'portal-anjos':{act6World.angelsOn=true;syncAct6World();if(act6World.angels&&!act6World.angelsSwirl){const d=new THREE.Mesh(new THREE.CircleGeometry(8.6,48),new THREE.MeshBasicMaterial({color:0xfff2d8,transparent:true,opacity:.0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));d.position.set(9,13,0);act6World.angels.add(d);act6World.angelsSwirl=d;}
   const d=act6World.angelsSwirl;if(d)act6Fx.push({t:0,tick(t){d.material.opacity=Math.min(.85,t*.4);d.rotation.z+=.01;if(!act6World.angelsOn)return false;}});storyFlash('white',900);worldAudio.celestial&&worldAudio.celestial();worldAudio.portalEnter();return true;}
  case 'entrar-portal':{const A=DS.angels;storyMove={from:{x:P.x,z:P.z},to:{x:A.x+3,z:A.z},t:0,dur:3,done:()=>{}};if(actions.walk)play('walk',.2);
   for(const o of [guide,act6Sandra&&act6Sandra.holder]){if(!o)continue;const from=o.position.clone();act6Fx.push({t:0,tick(t){const k=Math.min(1,t/3);o.position.x=from.x+(A.x+3-from.x)*k;o.position.z=from.z+(A.z-from.z)*k;o.position.y=terrainHeightAt(o.position.x,o.position.z);if(k>=1)return false;}});}return true;}
  case 'escuro6':setCineFade(1,1.2,false);return true;
 }
 return false;
}
/* ---------- Painel da revanche ---------- */
(function bindRematch(){bindInstantTap(document.getElementById('rematch-go'),()=>{rematchGo();});bindInstantTap(document.getElementById('rematch-close'),closeRematch);})();
/* ===================== MOD 196 — ATOS III E IV (motor genérico de etapas) ===================== */
var lateFound=Array.isArray(saved3DProgress.lateFound)?saved3DProgress.lateFound.slice():[];
var lateFightIndex=Number(saved3DProgress.lateFightIndex)||0,lateBossClaimed=Object.assign({},saved3DProgress.lateBossClaimed||{}),lateFoundStep=Number(saved3DProgress.lateFoundStep)||0;
let lateBossActive=false,lateRigLoading=false,lateTaunted=-1;
function lateDef(){if(questStep>=ACT3N.road&&questStep<=25)return null;const r=stepDef(questStep);return r?r.def:null;}
function lateEngaged(){const d=lateDef();return !!d&&((d.type==='fight')||(d.type==='boss'&&lateBossActive));}
// ---------- Moradores dos Atos III e IV ----------
const lateNpcs={};
new GLTFLoader().load('./Npc-lod2.glb?v=mod202',gltf=>{
 const base=gltf.scene,clips=gltf.animations||[],by=n=>clips.find(c=>c.name===n);
 const box=measureModelBounds(base),size=box.getSize(new THREE.Vector3()),scale=size.y>.01?(playerReferenceHeight*.97)/size.y:1;
 const place=(key,x,z,yaw,tint,clipName)=>{const c=cloneSkinned(base),h=new THREE.Group();c.scale.setScalar(scale);c.position.y=-box.min.y*scale;c.rotation.y=Math.PI;h.add(c);
  c.traverse(o=>{if(o.isMesh&&o.material){o.material=o.material.clone();o.material.color.multiply(new THREE.Color(tint));o.material.metalness=0;o.material.metalnessMap=null;if(o.material.map){o.material.emissiveMap=o.material.map;o.material.emissive=new THREE.Color(0x6a5a50);o.material.emissiveIntensity=.8;}}});
  h.position.set(x,groundHeightAt(x,z),z);h.rotation.y=yaw;scene.add(h);const m=new THREE.AnimationMixer(c),a=m.clipAction(by(clipName)||clips[0]);if(a){a.play();a.time=Math.random()*2;}villageNpcMixers.push(m);if(key)lateNpcs[key]=h;return h;};
 place('resistente',132,-22,Math.PI*.8,0xd8d0c8,'Agree_Gesture');place(null,128,-18,Math.PI*.6,0xa0a8b8,'_01a156a3_6952_769b_94bf_2cf0e9d19b46');place(null,136,-17,Math.PI,0xb8a890,'Alert');
 place('civil',-50,-224,-Math.PI/2,0x9a9080,'Alert');place(null,-54,-220,-Math.PI*.3,0x8090a0,'_01a156a3_6952_769b_94bf_2cf0e9d19b46');place(null,-55,-229,-Math.PI*.7,0xa09080,'Agree_Gesture');
},undefined,err=>console.warn('Moradores dos Atos III/IV sem modelo.',err));
// ---------- Ídolos (Ato III), cartas (Ato IV), altar e observatório ----------
const lateProps=(()=>{
 const gold=new THREE.MeshStandardMaterial({color:0xc9a24a,metalness:.7,roughness:.35,emissive:0x2a1a04,emissiveIntensity:.5}),clay=mat(0x7a5a40),stone=mat(0x8a8478),dark=mat(0x2a2630);
 const idols=stepDef(18).def.items.map((p,i)=>{const g=new THREE.Group(),y=groundHeightAt(p.x,p.z);g.position.set(p.x,y,p.z);scene.add(g);
  const ped=new THREE.Mesh(new THREE.BoxGeometry(1.4,.8,1.4),stone);ped.position.y=.4;ped.castShadow=true;g.add(ped);
  const fig=new THREE.Group();fig.position.y=.8;g.add(fig);
  const body=new THREE.Mesh(new THREE.ConeGeometry(.55,2.4,8),gold);body.position.y=1.2;body.castShadow=true;fig.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.3,10,8),gold);head.position.y=2.55;fig.add(head);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.42,.04,6,20),gold);halo.position.set(0,2.75,-.12);fig.add(halo);
  const base2=new THREE.Mesh(new THREE.CylinderGeometry(.45,.6,.3,8),clay);base2.position.y=.15;fig.add(base2);
  marketObstacles.push({x:p.x,z:p.z,shape:'circle',radius:.85,height:.8});
  return{g,fig,fallen:false,fallT:0,index:i};});
 const letters=stepDef(24).def.items.map((p,i)=>{const g=new THREE.Group();g.position.set(p.x,groundHeightAt(p.x,p.z)+.08,p.z);scene.add(g);
  const env=new THREE.Mesh(new THREE.BoxGeometry(.42,.03,.28),new THREE.MeshStandardMaterial({color:0xe8dcc0,roughness:.9}));env.position.y=.05;env.rotation.y=i;g.add(env);
  const sealDot=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.02,10),new THREE.MeshStandardMaterial({color:0x9a2020}));sealDot.position.set(0,.075,0);g.add(sealDot);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:softDot,color:0xcfe0ff,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));glow.position.y=.3;glow.scale.set(1,1,1);g.add(glow);
  g.visible=false;return{g,glow,index:i};});
 // Altar do Vale: escadaria e um trono vazio de ouro velho.
 const a=stepDef(19).def.at,ay=groundHeightAt(a.x,a.z),altar=new THREE.Group();altar.position.set(a.x,ay,a.z-6);scene.add(altar);
 for(let k=0;k<3;k++){const st=new THREE.Mesh(new THREE.BoxGeometry(9-k*2,.35,4-k),stone);st.position.set(0,.18+k*.35,-k*.4);st.receiveShadow=true;altar.add(st);}
 const throne=new THREE.Mesh(new THREE.BoxGeometry(1.4,2.6,1),gold);throne.position.set(0,2.4,-1.2);altar.add(throne);
 for(const sx of [-3.6,3.6]){const brazier=new THREE.Mesh(new THREE.CylinderGeometry(.4,.25,1.1,8),dark);brazier.position.set(sx,.9,0);altar.add(brazier);const fire=new THREE.PointLight(0xff9a40,1.4,10,1.6);fire.position.set(sx,1.7,0);altar.add(fire);}
 marketObstacles.push({x:a.x,z:a.z-7,shape:'box',halfX:4.5,halfZ:2,height:1});
 // Observatório da Serra: anel de pedras altas e um selo azul-pálido.
 const o=stepDef(25).def.at,oy=groundHeightAt(o.x,o.z),obs=new THREE.Group();obs.position.set(o.x,oy,o.z);scene.add(obs);
 for(let k=0;k<9;k++){const ang=k/9*Math.PI*2;const pil=new THREE.Mesh(new THREE.BoxGeometry(.8,3.4+(k%3)*.8,.8),stone);pil.position.set(Math.cos(ang)*11,1.7,Math.sin(ang)*11);pil.castShadow=true;obs.add(pil);marketObstacles.push({x:o.x+Math.cos(ang)*11,z:o.z+Math.sin(ang)*11,shape:'circle',radius:.6,height:3});}
 for(const [lx,lz] of [[8,6],[-8,6],[0,-9]]){const l=new THREE.PointLight(0x9ab8ff,1.6,18,1.4);l.position.set(lx,3,lz);obs.add(l);}
{const sh=stepDef(22).def.at,lamp=new THREE.PointLight(0xffb070,1.8,14,1.5);lamp.position.set(sh.x+2,groundHeightAt(sh.x,sh.z)+2.6,sh.z);scene.add(lamp);}
 const sealB=new THREE.Mesh(new THREE.TorusGeometry(1.2,.08,8,40),new THREE.MeshStandardMaterial({color:0x9ab8ff,emissive:0x4a6aff,emissiveIntensity:1.8}));sealB.rotation.x=Math.PI/2;sealB.position.y=.1;obs.add(sealB);
 // Arena do Vale (coliseu opcional).
 const ar=COLISEUM.spot,arena=new THREE.Group();arena.position.set(ar.x,groundHeightAt(ar.x,ar.z),ar.z);scene.add(arena);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(9,.25,6,48),stone);ring.rotation.x=Math.PI/2;ring.position.y=.2;arena.add(ring);
 for(let k=0;k<12;k++){const ang=k/12*Math.PI*2;const col=new THREE.Mesh(new THREE.CylinderGeometry(.3,.35,3,8),stone);col.position.set(Math.cos(ang)*9.6,1.5,Math.sin(ang)*9.6);arena.add(col);}
 const banner=makeMarketSign('ARENA DO VALE','#ffe3a0');banner.position.set(0,3.4,9.8);banner.rotation.y=Math.PI;arena.add(banner);
 return{idols,letters,sealB,arena};
})();
// ---------- Clima dos atos finais: névoa de incenso (III) e noite na serra (IV) ----------
function updateLateWeather(dt){
 const act=lateActFor(questStep);
 if(act===ACT3&&questStep<15){const inValley=Math.hypot(player.position.x-ALTAR_VALLEY.cx,player.position.z-ALTAR_VALLEY.cz)<70;const k=inValley?1:.35;scene.fog.color.lerp(new THREE.Color(0xc8bfae),.35*k);scene.fog.near=Math.min(scene.fog.near,THREE.MathUtils.lerp(scene.fog.near,6,k));scene.fog.far=Math.min(scene.fog.far,THREE.MathUtils.lerp(scene.fog.far,85,k));}
 if(act===ACT4){const inSerra=Math.hypot(player.position.x-SERRA.cx,player.position.z-SERRA.cz)<80;if(inSerra&&dayNightState.t>.5){hemiLight.intensity+=.45;hemiLight.color.lerp(new THREE.Color(0x8aa6d8),.4);}}
}
// ---------- Etapas ----------
function lateInteract(){
 const d=lateDef();if(!d)return false;const px=player.position.x,pz=player.position.z;
 if(d.type==='talk'){const at=d.who==='guide'?guide.position:d.at;if(Math.hypot(at.x-px,at.z-pz)>3.2)return false;
  showDialogue(d.lines(playerName),()=>{const first=d.who==='guide'?(stepDef(d.step).act):null;questStep=d.step+1;save3DProgress();updateQuestHud();if(first)showLateActCard(first);});return true;}
 if(d.type==='collect'){const i=nearestLateItem(d,2.4);if(i<0)return false;takeLateItem(d,i);return true;}
 if(d.type==='boss'&&!lateBossActive&&Math.hypot(d.at.x-px,d.at.z-pz)<9){
  updateHeartsHud(true);if(!canChallengeBishop(heartState)){showDialogue([{who:'Anjo-Guia',text:'Sem corações, não. Espere um voltar — '+formatTimer(msToNextHeart(heartState))+'.'}]);return true;}
  showDialogue(d.intro(playerName),()=>startLateBossDimension(d));return true;}
 if(coliseumNear()&&!coliseum.active&&questStep>=COLISEUM.unlockStep){startColiseum();return true;}
 return false;
}
function lateTalkLabel(){
 const d=lateDef(),px=player.position.x,pz=player.position.z;
 if(d&&d.type==='talk'){const at=d.who==='guide'?guide.position:d.at;if(Math.hypot(at.x-px,at.z-pz)<=3.2)return d.label;}
 if(d&&d.type==='collect'&&nearestLateItem(d,2.4)>=0)return d.label;
 if(d&&d.type==='boss'&&!lateBossActive&&Math.hypot(d.at.x-px,d.at.z-pz)<9)return 'ENTRAR NO PORTAL';
 if(coliseumNear()&&!coliseum.active&&questStep>=COLISEUM.unlockStep)return 'ARENA · DESAFIO';
 return '';
}
function nearestLateItem(d,r){if(lateFoundStep!==d.step){lateFound=[];lateFoundStep=d.step;}let best=-1,bd=r;d.items.forEach((p,i)=>{if(lateFound.includes(i))return;const dd=Math.hypot(p.x-player.position.x,p.z-player.position.z);if(dd<bd){bd=dd;best=i;}});return best;}
function takeLateItem(d,i){
 const r=collectItem(lateFound,i,questStep,d);if(r.found===lateFound)return;lateFound=r.found;worldAudio.reveal();
 if(d.kind==='idol'){const idol=lateProps.idols[i];idol.fallen=true;cameraShake(.12);}
 showRewardPop((d.kind==='idol'?'Ídolo derrubado':'Carta recolhida')+' · '+lateFound.length+'/'+d.items.length);save3DProgress();updateQuestHud();
 showDialogue([d.lines[Math.min(d.lines.length-1,lateFound.length-1)]],()=>{if(r.advanced){questStep=d.step+1;lateFound=[];save3DProgress();updateQuestHud();}});
}
function showLateActCard(act){const card=document.getElementById('act-card');if(!card)return;card.querySelector('#act-kicker').textContent=act.kicker;card.querySelector('h2').textContent=act.title;card.querySelector('#act-bishop').textContent=act.bishop;card.classList.remove('hidden');const hide=()=>{card.classList.add('hidden');card.removeEventListener('pointerdown',hide);};card.addEventListener('pointerdown',hide);setTimeout(hide,4200);}
function ensureRig(name,then){if(rigs[name]){then();return;}if(lateRigLoading)return;lateRigLoading=true;loadRig(name).then(()=>{lateRigLoading=false;then();},()=>{lateRigLoading=false;status.textContent='Falha ao carregar um modelo. Recarregue a página.';});}
function startLateBoss(d){ensureRig(d.rig,()=>{useRig(d.rig);lateBossActive=true;bossRageAnnounced=false;bossComboHits=0;bossHitCounter=0;revealEncounter(d.profile,d.at,d.hp,d.name+' desperta.');checkpointX=d.at.x+8;checkpointZ=d.at.z+4;const hud=document.getElementById('enemy-hud');if(hud)hud.classList.add('boss');});}
function lateFightTick(){
 const d=lateDef();if(!d||d.type!=='fight'||enemy.visible)return;
 const spot=d.spots[Math.min(lateFightIndex,d.spots.length-1)];if(!spot)return;
 const dist=Math.hypot(spot.x-player.position.x,spot.z-player.position.z);
 if(dist<12&&playerHP>0&&!dialogueOpen)ensureRig(d.rig,()=>{if(enemy.visible)return;useRig(d.rig);revealEncounter(d.profile,spot,d.hp,lateTaunted!==lateFightIndex?d.taunt:d.name);lateTaunted=lateFightIndex;checkpointX=spot.x+6;checkpointZ=spot.z+6;});
}
/** Chamado quando um inimigo cai; true se o motor tratou a derrota. */
function lateHandleDefeat(){
 if(coliseum.active&&coliseumHandleDefeat())return true;
 const d=lateDef();if(!d)return false;
 if(d.type==='fight'){registerEnemyDefeat(d.profile);enemy.visible=false;enemyAlive=true;lateFightIndex++;if(lateFightIndex>=d.spots.length){lateFightIndex=0;questStep=d.step+1;}save3DProgress();updateQuestHud();return true;}
 if(d.type==='boss'&&lateBossActive){
  registerEnemyDefeat(d.profile);lateBossActive=false;enemy.visible=false;const hud=document.getElementById('enemy-hud');if(hud)hud.classList.remove('boss');
  const rw=bossRewardOnce(!!lateBossClaimed[d.profile],d);lateBossClaimed[d.profile]=true;if(rw.coins){coins+=rw.coins;gainXp(rw.xp);bumpStat('bishops');}
  bestiaryKnown.add(d.profile);bishopsDefeated=Math.max(bishopsDefeated,d.profile==='zarkhael'?3:4);questStep=d.step+1;save3DProgress();updateQuestHud();
  if(rw.coins)showRewardPop('+'+rw.coins+' MOEDAS · +'+rw.xp+' XP');
  if(d.profile==='veraxion')lateProps.sealB.visible=false;
  setTimeout(()=>showDialogue(d.defeat(playerName),()=>{const toast=document.getElementById('quest-toast');if(toast){toast.textContent=(d.profile==='zarkhael'?'ATO III CONCLUÍDO · TERCEIRO SELO':'ATO IV CONCLUÍDO · QUARTO SELO');toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),3200);}}),1400);
  return true;}
 return false;
}
function lateBossPlayerDown(){
 const d=lateDef();if(!d||d.type!=='boss'||!lateBossActive)return;
 spendHeart(d.profile);enemyHP=enemyMaxHP;bossRageAnnounced=false;
 if(heartState.hearts<=0){lateBossActive=false;enemy.visible=false;const hud=document.getElementById('enemy-hud');if(hud)hud.classList.remove('boss');status.textContent='Sem corações. O Bispo recuou — recupere um coração e volte.';}
}
function lateBossTick(){
 const d=lateDef();if(!d||d.type!=='boss'||!lateBossActive||!enemy.visible||!enemyAlive)return;
 if(!bossRageAnnounced&&bossPhase(enemyHP,enemyMaxHP)===2){bossRageAnnounced=true;showCombatCallout('FÚRIA');status.textContent=d.name.split(' · ')[0]+': “'+d.rage+'”';enemyCastCooldown=0;cameraShake(.2);vibrate(60);}
}
// ---------- Arena do Vale (coliseu opcional) ----------
const COLISEUM_STORE='seven-sins-3d-coliseum';
const coliseum={active:false,round:0,...(()=>{try{return JSON.parse(localStorage.getItem(COLISEUM_STORE)||'{}');}catch(_){return{};}})()};
function saveColiseum(){try{localStorage.setItem(COLISEUM_STORE,JSON.stringify({best:coliseum.best||0,day:coliseum.day||'',paid:coliseum.paid||0}));}catch(_){}}
function coliseumNear(){return Math.hypot(COLISEUM.spot.x-player.position.x,COLISEUM.spot.z-player.position.z)<10.5;}
function startColiseum(){const today=new Date().toISOString().slice(0,10);if(coliseum.day!==today){coliseum.day=today;coliseum.paid=0;}coliseum.active=true;coliseum.round=0;showCombatCallout('ARENA · RODADA 1');nextColiseumRound();}
function nextColiseumRound(){const r=coliseum.round,rig=COLISEUM.enemyFor(r);ensureRig(rig,()=>{if(!coliseum.active)return;useRig(rig);revealEncounter('arena',COLISEUM.spot,COLISEUM.hpFor(r),'Rodada '+(r+1)+' de '+COLISEUM.rounds);checkpointX=COLISEUM.spot.x;checkpointZ=COLISEUM.spot.z+12;});}
function coliseumHandleDefeat(){
 bumpStat('kills');gainXp(10+coliseum.round*4);enemy.visible=false;enemyAlive=true;const pay=coliseumPayout(coliseum.round,coliseum.paid||0);coins+=pay;coliseum.paid=(coliseum.paid||0)+pay;coliseum.best=Math.max(coliseum.best||0,coliseum.round+1);saveColiseum();save3DProgress();updateQuestHud();
 showRewardPop('Rodada '+(coliseum.round+1)+(pay?' · +'+pay+' MOEDAS':' · teto diário atingido'));coliseum.round++;
 if(coliseum.round>=COLISEUM.rounds){coliseum.active=false;showCombatCallout('CAMPEÃO DA ARENA');return true;}
 setTimeout(()=>{if(coliseum.active){showCombatCallout('RODADA '+(coliseum.round+1));nextColiseumRound();}},1600);return true;
}
function coliseumTick(){if(coliseum.active&&!coliseumNear()&&Math.hypot(COLISEUM.spot.x-player.position.x,COLISEUM.spot.z-player.position.z)>22){coliseum.active=false;enemy.visible=false;status.textContent='Você deixou a arena. O desafio recomeça da rodada 1.';}}
// ---------- Atualização ----------
function updateLate(dt,now){
 updateLateWeather(dt);lateFightTick();lateBossTick();coliseumTick();
 for(const idol of lateProps.idols){const done=questStep>18||(questStep===18&&lateFoundStep===18&&lateFound.includes(idol.index));if(done&&!idol.fallen)idol.fallen=true;if(idol.fallen&&idol.fallT<1){idol.fallT=Math.min(1,idol.fallT+dt*1.4);idol.fig.rotation.x=-idol.fallT*idol.fallT*1.45;idol.fig.position.z=idol.fallT*.9;}}
 for(const l of lateProps.letters){l.g.visible=false&&questStep===24&&!(lateFoundStep===24&&lateFound.includes(l.index));if(l.g.visible)l.glow.material.opacity=.45+Math.sin(now*.004+l.index)*.25;}
 const d=lateDef();
 if(d){let m=null;if(d.type==='talk')m=d.who==='guide'?guide.position:d.at;else if(d.type==='reach')m=d.at;else if(d.type==='fight')m=d.spots[Math.min(lateFightIndex,d.spots.length-1)];else if(d.type==='collect'){const i=d.items.findIndex((_,k)=>!(lateFoundStep===d.step&&lateFound.includes(k)));m=i>=0?d.items[i]:null;}else if(d.type==='boss'&&!lateBossActive)m=d.at;
  if(m){questMarker.visible=true;questMarker.position.set(m.x,terrainHeightAt(m.x,m.z)+.06,m.z);}else if(d.type==='boss')questMarker.visible=false;
  if(d.type==='reach'&&Math.hypot(d.at.x-player.position.x,d.at.z-player.position.z)<d.radius){questStep=d.step+1;save3DProgress();updateQuestHud();const toast=document.getElementById('quest-toast');if(toast){toast.textContent=d.toast;toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2600);}}}
}
lateSystemsReady=true;
/* ===================== MOD 197 — ARCO FINAL: OS QUATRO GUARDIÕES E O PECADO DA GANÂNCIA ===================== */
RIG_DEFS.bishop1={file:'./Bispo1-lod.glb?v=mod202',height:1.4,roles:{idle:'Idle',walk:'Walk',attack:'Sword Aerial Combo',cast:'Sword Regular B',death:'Hit Knockback Root Motion'},inPlace:['attack','cast','death']};
RIG_DEFS.greed1={file:'./Ganancia1-lod.glb?v=mod197',height:1.7,roles:{idle:'_01a15a96_67a9_773a_89e1_3990f76b968d',walk:'Walking',run:'Running',attack:'Triple_Combo_Attack',cast:'Skill_03',dash:'_01a15a9f_d25c_70e1_bcee_3b20cf78b1d2',death:'Dead',arise:'Arise'},inPlace:['attack','dash','death']};
RIG_DEFS.greed2={file:'./Ganancia2-lod.glb?v=mod197',height:1.9,roles:{idle:'_01a156cd_69c5_76fe_b170_51aba82e74db',walk:'Walking',run:'Running',attack:'Triple_Combo_Attack',cast:'Skill_01',death:'Dead',arise:'Arise'},inPlace:['attack','death']};
RIG_DEFS.greed3={file:'./Ganancia3-lod.glb?v=mod197',height:2.15,roles:{idle:'_01a156df_e232_77c3_9887_dc9edce1e064',walk:'Unsteady_Walk',run:'Running',attack:'Skill_03',cast:'Skill_03',death:'Dead',arise:'Arise'},inPlace:['attack','death']};
for(const p of ['fallen1','fallen2','fallen3','fallen4','greed1','greed2','greed3'])BOSS_PROFILES.push(p);
var finaleEpilogueOpen=false,gauntletIndex=Number(saved3DProgress.gauntletIndex)||0,sinForm=0,finaleClaimed=!!saved3DProgress.finaleClaimed,voidMode=false,finaleFighting=false;
// ---------- Portal reaberto (vermelho-escuro) quando os quatro selos caem ----------
function syncFinalPortal(){
 const open=false; // MOD 209 — o arco final do roteiro (Ato VI) não reabre o portal da montanha
 if(open){for(const m of [portalRing,portalInnerRing,portalCore,vortex,portalFloorGlow,portalSigil])m.visible=true;portalLight.color.setHex(0xff3a3a);portalLight.intensity=3;portalRing.material.emissive.setHex(0xa01818);portalBeacon.visible=true;portalBeacon.material.color.setHex(0xff6a6a);}
}
// ---------- Vazio da Ganância: arena abaixo do mundo, olhos em várias distâncias ----------
const savedSky={};
function enterVoid(){enterDimensionArena('greed');}
function leaveVoid(){voidMode=false;for(const k in dimArenas)dimArenas[k].group.visible=false;dimLight.intensity=0;voidSpec={x:VOID.x,z:VOID.z,y:VOID.y,radius:VOID.radius};dimKey=null;skyDome.visible=true;renderer.toneMappingExposure=1;}
function updateVoid(dt,now){
 updateDimensionPortals(now);
 if(!voidMode)return;
 const arena=dimKey?dimArenas[dimKey]:null;
 if(arena){const e=arena.env;scene.background.setHex(e.bg);scene.fog.color.setHex(e.fog);scene.fog.near=e.fogNear;scene.fog.far=e.fogFar;hemiLight.color.setHex(e.hemi[0]);hemiLight.groundColor.setHex(e.hemi[1]);hemiLight.intensity=e.hemi[2];sunLight.color.setHex(e.sun[0]);sunLight.intensity=e.sun[1];fill.intensity=.2;renderer.toneMappingExposure=e.exposure;
  dimLight.color.setHex(e.light[0]);dimLight.intensity=e.light[1]*(1+Math.sin(now*.004)*.05);dimLight.distance=e.light[2];if(e.lightFollow)dimLight.position.set(player.position.x+e.light[3][0],player.position.y+e.light[3][1],player.position.z+e.light[3][2]);else dimLight.position.set(voidSpec.x+e.light[3][0],voidSpec.y+e.light[3][1],voidSpec.z+e.light[3][2]);
  arena.update(now,camera,innerHeight*renderer.getPixelRatio());
  if(dimBattle&&dimBattle.active&&dimBattle.key==='bishop1'&&enemy.visible&&enemyAlive&&!bossRageAnnounced&&bossPhase(enemyHP,enemyMaxHP)===2){bossRageAnnounced=true;showCombatCallout('FÚRIA DO GUARDIÃO');status.textContent='VALÉRIO: “'+DIMENSIONS.bishop1.rage+'”';enemyCastCooldown=0;cameraShake(.2);vibrate(60);}
 }
}
// ---------- Etapas ----------
function finaleInteract(){
 if(questStep>=ACT5N.step&&questStep<FINALE.done)return false; // MOD 209 — Atos V e VI
 const px=player.position.x,pz=player.position.z;
 if(questStep===FINALE.talk&&Math.hypot(guide.position.x-px,guide.position.z-pz)<=3.2){showDialogue(finaleTalkLines(playerName),()=>{questStep=FINALE.gauntlet;gauntletIndex=0;save3DProgress();updateQuestHud();syncFinalPortal();showLateActCard({kicker:'GALÁXIA 1 · ARCO FINAL',title:'A raiz de todos os males',bishop:'O Pecado da Ganância'});});return true;}
 if(questStep===FINALE.gauntlet&&!finaleFighting&&gauntletIndex<GAUNTLET.length&&Math.hypot(FINAL_PORTAL.x-px,FINAL_PORTAL.z-pz)<6){
  updateHeartsHud(true);if(!canChallengeBishop(heartState)){showDialogue([{who:'Anjo-Guia',text:'Sem corações, não. Espere um voltar — '+formatTimer(msToNextHeart(heartState))+'.'}]);return true;}
  showDialogue(gauntletIndex===0?gauntletIntroLines():[{who:GAUNTLET[gauntletIndex].name.split(' · ')[0],text:GAUNTLET[gauntletIndex].line}],()=>startGauntletFight());return true;}
 return false;
}
function finaleTalkLabel(){if(questStep>=ACT5N.step&&questStep<FINALE.done)return '';const px=player.position.x,pz=player.position.z;if(questStep===FINALE.talk&&Math.hypot(guide.position.x-px,guide.position.z-pz)<=3.2)return 'FALAR · ANJO';if(questStep===FINALE.gauntlet&&!finaleFighting&&gauntletIndex<GAUNTLET.length&&Math.hypot(FINAL_PORTAL.x-px,FINAL_PORTAL.z-pz)<6)return 'ENFRENTAR OS GUARDIÕES';return '';}
function startGauntletFight(){const g=GAUNTLET[gauntletIndex];ensureRig(g.rig,()=>{useRig(g.rig);finaleFighting=true;bossRageAnnounced=false;bossComboHits=0;const spot={x:FINAL_PORTAL.x,z:FINAL_PORTAL.z-1};revealEncounter(g.profile,spot,g.hp,g.line);checkpointX=FINAL_PORTAL.x;checkpointZ=FINAL_PORTAL.z+6;const hud=document.getElementById('enemy-hud');if(hud)hud.classList.add('boss');});}
function startSinForm(){const f=SIN_FORMS[sinForm];ensureRig(f.rig,()=>{useRig(f.rig);finaleFighting=true;bossRageAnnounced=false;bossComboHits=0;revealEncounter(f.profile,{x:VOID.x,z:VOID.z-4},f.hp,f.line);if(enemyActions.arise&&sinForm>0){playEnemyAnimation('arise',.1,true);enemyAttackCooldown=2.2;}checkpointX=VOID.x;checkpointZ=VOID.z+12;const hud=document.getElementById('enemy-hud');if(hud)hud.classList.add('boss');showCombatCallout(f.name);});}
function finaleCombatActive(){return finaleFighting&&(questStep===FINALE.gauntlet||questStep===FINALE.sin);}
function finaleNameFor(profile){const g=GAUNTLET.find(x=>x.profile===profile)||SIN_FORMS.find(x=>x.profile===profile);return g?g.name:null;}
function finaleHandleDefeat(){
 if(!finaleFighting)return false;
 if(questStep===FINALE.gauntlet){finaleFighting=false;enemy.visible=false;enemyAlive=true;const r=nextGauntlet(gauntletIndex);gauntletIndex=r.index;save3DProgress();
  if(!r.done){showRewardPop('Guardião '+gauntletIndex+'/4 em paz');setTimeout(()=>{const g=GAUNTLET[gauntletIndex];showDialogue([{who:g.name.split(' · ')[0],text:g.line}],()=>startGauntletFight());},1500);}
  else{const hud=document.getElementById('enemy-hud');if(hud)hud.classList.remove('boss');setTimeout(()=>showDialogue([{who:'VÉRAXION',text:'…Então vai. E não deixes ela te chamar pelo nome.'},{who:'Anjo-Guia',text:'Segure firme. O portal vai puxar com força desta vez.'}],()=>{questStep=FINALE.sin;sinForm=0;save3DProgress();updateQuestHud();showPortalVeil(true);setTimeout(()=>{openVsCard('greed',()=>{enterVoid();showDialogue(sinIntroLines(playerName),()=>startSinForm());});},900);}),1200);}
  return true;}
 if(questStep===FINALE.sin){finaleFighting=false;enemy.visible=false;enemyAlive=true;const r=nextSinForm(sinForm);sinForm=r.form;
  if(!r.done){cameraShake(.3);showCombatCallout('A GANÂNCIA SE TRANSFORMA');setTimeout(startSinForm,2200);}
  else finishSin();
  return true;}
 return false;
}
function finishSin(){
 const hud=document.getElementById('enemy-hud');if(hud)hud.classList.remove('boss');const rw=finaleReward(finaleClaimed);finaleClaimed=true;if(rw.coins){coins+=rw.coins;gainXp(rw.xp);bumpStat('bishops');}bestiaryKnown.add('ganancia');
 showCombatCallout('A RAIZ FOI ARRANCADA');const veil=document.getElementById('travel-veil');if(veil){veil.style.background='#fff';veil.classList.add('on');}
 setTimeout(()=>{leaveVoid();questStep=FINALE.epilogue;const x=GUIDE_ACT2_SPOT.x+1.5,z=GUIDE_ACT2_SPOT.z+2;player.position.set(x,terrainHeightAt(x,z),z);setGameHour(10);camera.position.set(x,player.position.y+3.5,z+8.5);save3DProgress();updateQuestHud();for(const m of [portalRing,portalInnerRing,portalCore,vortex,portalFloorGlow,portalSigil])m.visible=false;portalLight.intensity=0;portalBeacon.visible=false;
  if(veil){veil.classList.remove('on');setTimeout(()=>{veil.style.background='';},600);}
  finaleEpilogueOpen=true;showDialogue(epilogueLines(playerName),()=>{questStep=FINALE.done;save3DProgress();updateQuestHud();freeNextGalaxy();});},1800);
}
function freeNextGalaxy(){
 let save={};try{save=JSON.parse(localStorage.getItem(GALAXY_STORE)||'{}');}catch(_){}
 const already=(Number(save.unlocked)||1)>=2;save.unlocked=Math.max(2,Number(save.unlocked)||1);if(!already)save.celebrate=2;try{localStorage.setItem(GALAXY_STORE,JSON.stringify(save));}catch(_){}
 const toast=document.getElementById('quest-toast');if(toast){toast.textContent='GALÁXIA 1 LIBERTADA';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),3000);}
 setTimeout(openGalaxyScreen,2600);
}
function finalePlayerDown(){
 if(!finaleFighting)return;spendHeart('finale');finaleFighting=false;enemy.visible=false;const hud=document.getElementById('enemy-hud');if(hud)hud.classList.remove('boss');
 const r=finaleAfterDeath();questStep=r.questStep;gauntletIndex=r.gauntletIndex;sinForm=r.sinForm;if(voidMode){leaveVoid();camera.position.set(FINAL_PORTAL.x,groundHeightAt(FINAL_PORTAL.x,FINAL_PORTAL.z+7)+3.5,FINAL_PORTAL.z+15);}
 checkpointX=FINAL_PORTAL.x;checkpointZ=FINAL_PORTAL.z+7;save3DProgress();updateQuestHud();status.textContent='Você caiu. O arco final recomeça do primeiro guardião — o resto da jornada continua seu.';
}
function updateFinale(dt,now){
 syncFinalPortal();updateVoid(dt,now);
 if(questStep>=ACT5N.step&&questStep<FINALE.done)return; // MOD 209 — Atos V e VI
 if(questStep===FINALE.talk){questMarker.visible=true;questMarker.position.set(guide.position.x,terrainHeightAt(guide.position.x,guide.position.z)+.06,guide.position.z);}
 else if(questStep===FINALE.gauntlet&&!finaleFighting){questMarker.visible=true;questMarker.position.set(FINAL_PORTAL.x,terrainHeightAt(FINAL_PORTAL.x,FINAL_PORTAL.z)+.06,FINAL_PORTAL.z);}
 else if(questStep>=FINALE.gauntlet)questMarker.visible=false;
 // Epílogo interrompido (jogo fechado no meio): retoma a conversa e conclui.
 if(questStep===FINALE.epilogue&&!dialogueOpen&&player.userData.ready&&!menuGate&&!(document.getElementById('travel-veil')||{}).classList?.contains('on')){finaleEpilogueOpen=true;showDialogue(epilogueLines(playerName),()=>{questStep=FINALE.done;save3DProgress();updateQuestHud();freeNextGalaxy();});}
 // Recarga no meio do vazio: volta ao portal para recomeçar o arco.
 if(questStep===FINALE.sin&&!finaleFighting&&!voidMode&&!dialogueOpen){const r=finaleAfterDeath();questStep=r.questStep;gauntletIndex=0;save3DProgress();updateQuestHud();}
 if(finaleFighting&&enemy.visible&&enemyAlive&&!bossRageAnnounced&&bossPhase(enemyHP,enemyMaxHP)===2&&questStep===FINALE.sin){bossRageAnnounced=true;showCombatCallout('FÚRIA DA GANÂNCIA');enemyCastCooldown=0;cameraShake(.25);}
}
finaleReady=true;
/* MOD 198 — Julgamento Divino refeito: telegraph com círculo de runas douradas, pilar de luz, espada
   colossal que desce do céu, impacto com raios e onda de choque. Dano real em área, uma vez por uso. */
let ultimateFx=null;
function castDivineJudgment(){
 const tgt=combatStepNow()&&enemy.visible&&enemyAlive&&Math.hypot(enemy.position.x-player.position.x,enemy.position.z-player.position.z)<16?enemy.position.clone():player.position.clone().add(new THREE.Vector3(Math.sin(playerYaw)*6,0,Math.cos(playerYaw)*6));
 tgt.y=groundHeightAt(tgt.x,tgt.z);
 const g=new THREE.Group();g.position.copy(tgt);scene.add(g);
 const goldMat=new THREE.MeshBasicMaterial({color:0xffd56a,transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const ring=new THREE.Mesh(new THREE.RingGeometry(3.6,3.9,64),goldMat);ring.rotation.x=-Math.PI/2;ring.position.y=.08;g.add(ring);
 const ring2=new THREE.Mesh(new THREE.RingGeometry(2.2,2.35,6),goldMat.clone());ring2.rotation.x=-Math.PI/2;ring2.position.y=.09;g.add(ring2);
 const pillar=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.8,40,20,1,true),new THREE.MeshBasicMaterial({color:0xfff2c4,transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));pillar.position.y=20;g.add(pillar);
 const sword=new THREE.Group();const blade=new THREE.Mesh(new THREE.ConeGeometry(.55,7,4),new THREE.MeshStandardMaterial({color:0xfff6e0,emissive:0xffd56a,emissiveIntensity:2.2,metalness:.6,roughness:.2}));blade.rotation.x=Math.PI;blade.position.y=-3.5;sword.add(blade);
 const guard=new THREE.Mesh(new THREE.BoxGeometry(3,.35,.4),new THREE.MeshStandardMaterial({color:0xe2b04a,emissive:0x8a5a10,emissiveIntensity:1.2,metalness:.8}));sword.add(guard);
 const hilt=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,1.6,8),guard.material);hilt.position.y=.9;sword.add(hilt);sword.position.y=34;g.add(sword);
 const light=ultLight;light.position.set(tgt.x,tgt.y+4,tgt.z);light.intensity=0;
 const bolts=[];for(let i=0;i<6;i++){const pts=[];let x=0,z=0;for(let k=0;k<9;k++){pts.push(new THREE.Vector3(x,k*2.6,z));x+=(Math.random()-.5)*1.4;z+=(Math.random()-.5)*1.4;}const ln=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xfff6c8,transparent:true,opacity:0,toneMapped:false}));const a=i/6*Math.PI*2;ln.position.set(Math.cos(a)*3,0,Math.sin(a)*3);g.add(ln);bolts.push(ln);}
 const wave=new THREE.Mesh(new THREE.RingGeometry(.5,1,48),goldMat.clone());wave.rotation.x=-Math.PI/2;wave.position.y=.12;g.add(wave);
 ultimateFx={g,ring,ring2,pillar,sword,light,bolts,wave,t:0,hit:false,target:tgt};if(!bossUlt.kind){Object.assign(ultCam,{want:.75,height:5.5,dist:12});ultCam.look.set(tgt.x,tgt.y+3,tgt.z);}
 status.textContent='“O Senhor é a minha luz e a minha salvação; de quem terei medo?”';showCombatCallout('JULGAMENTO DIVINO');
}
function updateUltimateFx(dt){
 const f=ultimateFx;if(!f)return;f.t+=dt;const t=f.t;
 const tele=Math.min(1,t/1.1);f.ring.material.opacity=tele*.9;f.ring2.material.opacity=tele*.8;f.ring.rotation.z+=dt*.8;f.ring2.rotation.z-=dt*1.6;
 f.pillar.material.opacity=t<1.1?tele*.35:Math.max(0,.6-(t-1.1)*.7);f.pillar.scale.x=f.pillar.scale.z=t<1.1?1:1+(t-1.1)*2;
 if(t>.7&&t<1.25){const k=(t-.7)/.55;f.sword.position.y=34-33*k*k;}
 if(t>=1.25&&!f.hit){f.hit=true;f.sword.position.y=1;cameraShake(.4);hitStop(140);impactFrame(80);scorch(f.target.x,f.target.z,4);vibrate(90);burstSparks(f.target.clone().setY(f.target.y+1),0xfff0b8);worldAudio.magic&&worldAudio.magic('ultimate');
  if(combatStepNow()&&enemy.visible&&enemyAlive&&Math.hypot(enemy.position.x-f.target.x,enemy.position.z-f.target.z)<4.6){const dmg=Math.round(60*(1+statsForLevel(playerLevel()).damageBonus));enemyHP=Math.max(0,enemyHP-dmg);onEnemyDamaged(dmg,true);enemyKnockback=.9;const dx=enemy.position.x-f.target.x,dz=enemy.position.z-f.target.z,d=Math.hypot(dx,dz)||1;enemyKnockbackX=dx/d;enemyKnockbackZ=dz/d;
   if(enemyHP===0){enemyAlive=false;const hud=document.getElementById('enemy-hud');if(hud)hud.style.display='none';if(!playEnemyAnimation('death',.06,true))enemyHasDeathClip=false;setTimeout(()=>advanceAfterEnemyDefeat(),850);}else playEnemyAnimation('hit',.05,true);}}
 if(f.hit){const k=t-1.25;f.light.intensity=Math.max(0,6-k*5);for(const b of f.bolts){b.material.opacity=k<.5?(Math.random()>.4?.95:.2):Math.max(0,.9-k);b.rotation.y+=dt*3;}f.wave.scale.setScalar(1+k*12);f.wave.material.opacity=Math.max(0,.8-k*.9);f.ring.material.opacity=Math.max(0,.9-k);f.ring2.material.opacity=Math.max(0,.8-k);f.sword.position.y=1-k*1.2;f.sword.children.forEach(c=>{if(c.material){c.material.transparent=true;c.material.opacity=Math.max(0,1-k*.8);}});}
 if(t>1.7&&!bossUlt.kind)ultCam.want=0;
 if(t>2.6){ultLight.intensity=0;scene.remove(f.g);f.g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});ultimateFx=null;}
}
/* ===================== MOD 199 — CÂMERA, PRIMEIRA PESSOA, COMBO E PODERES DOS BISPOS ===================== */
// ---------- Câmera em terceira pessoa ----------
let lastLookInputAt=0,camDistSmooth=8.5,fovKick=0;const camFocus=new THREE.Vector3();let camFocusReady=false;
/** Alvo da câmera: ombro levemente à direita, enquadra o inimigo em combate e acompanha a altura com suavidade. */
function computeCameraTarget(base,dt){
 const shoulder=.42,rx=Math.cos(cameraYaw),rz=-Math.sin(cameraYaw);
 const t=base.clone();t.x+=rx*shoulder;t.z+=rz*shoulder;
 const engaged=combatStepNow()&&enemy.visible&&enemyAlive&&Math.hypot(enemy.position.x-player.position.x,enemy.position.z-player.position.z)<12;
 if(engaged&&!lockOnActive){t.x+=(enemy.position.x-player.position.x)*.22;t.z+=(enemy.position.z-player.position.z)*.22;}
 if(!camFocusReady){camFocus.copy(t);camFocusReady=true;}
 camFocus.x+=(t.x-camFocus.x)*Math.min(1,dt*12);camFocus.z+=(t.z-camFocus.z)*Math.min(1,dt*12);camFocus.y+=(t.y-camFocus.y)*Math.min(1,dt*6);
 return{focus:camFocus,engaged};
}
/** Distância efetiva: afasta um pouco em combate (vê os dois) e respeita o zoom do jogador. */
function effectiveCameraDistance(engaged,dt){const want=cameraDistance+(engaged?1.6:0);camDistSmooth+=(want-camDistSmooth)*Math.min(1,dt*3);return camDistSmooth;}
/** Recentraliza atrás do herói depois de um tempo andando sem mexer na câmera (opcional nos ajustes). */
function autoRecenterCamera(dt,now){
 if(!userSettings.autoCamera||lockOnActive||cameraDistance<1.05)return;
 if(now-lastLookInputAt<1600)return;const sp=Math.hypot(moveVX,moveVZ);if(sp<1.2)return;
 const want=Math.atan2(-moveVX,-moveVZ),d=Math.atan2(Math.sin(want-cameraYaw),Math.cos(want-cameraYaw));cameraYaw+=d*Math.min(1,dt*1.1);
}
function updateFovKick(dt){
 const fp=cameraDistance<1.05,base=fp?72:56,want=dashRemaining>0?7:(isSprinting()&&Math.hypot(moveVX,moveVZ)>5.2?4:0);fovKick+=(want-fovKick)*Math.min(1,dt*(want?14:5));
 const fov=base+fovKick;if(Math.abs(camera.fov-fov)>.05){camera.fov=fov;camera.updateProjectionMatrix();}
}
// ---------- Primeira pessoa: mira com alvo, golpes variados, guarda ----------
let fpSwingDir=0,hitMarkT=0;
const FP_SWINGS=[{x:-.42,y:.12,rz:1.6,rx:-.9},{x:.42,y:.1,rz:-1.4,rx:-.8},{x:0,y:.32,rz:.2,rx:-1.6}];
function fpTargetInSight(){
 if(!(combatStepNow()&&enemy.visible&&enemyAlive))return false;
 const v=new THREE.Vector3(enemy.position.x,enemy.position.y+1,enemy.position.z).project(camera);
 return v.z<1&&Math.abs(v.x)<.16&&Math.abs(v.y)<.3&&Math.hypot(enemy.position.x-player.position.x,enemy.position.z-player.position.z)<SWORDS[equippedSword].reach+1.2;
}
function updateFpExtras(dt){
 const cross=document.getElementById('crosshair');if(!cross||cross.hidden)return;
 cross.classList.toggle('on-target',fpTargetInSight());hitMarkT=Math.max(0,hitMarkT-dt);cross.classList.toggle('hit',hitMarkT>0);
}
function fpSwingPose(k,arc){const s=FP_SWINGS[fpSwingDir%FP_SWINGS.length];fpHolder.position.set(FP_REST.x+s.x*k*(arc<.5?-1:1)*.9,FP_REST.y+s.y*k,FP_REST.z-k*.14);fpHolder.rotation.set(FP_REST.rx+s.rx*k,FP_REST.ry+k*.4,FP_REST.rz+s.rz*k);}
// ---------- Combo de três golpes ----------
let comboCount=0,lastSwingAt=0;
function nextComboStep(now){comboCount=now-lastSwingAt<900?Math.min(3,comboCount+1):1;lastSwingAt=now;fpSwingDir=comboCount-1;return comboCount;}
function comboMultiplier(){return comboCount===3?1.5:comboCount===2?1.1:1;}
// ---------- Aviso do golpe inimigo ----------
const warnRing=new THREE.Mesh(new THREE.RingGeometry(.2,.32,40),new THREE.MeshBasicMaterial({color:0xff3a2a,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
warnRing.rotation.x=-Math.PI/2;scene.add(warnRing);let warnT=0,warnDur=0;
function telegraphEnemyAttack(windup){warnT=0;warnDur=Math.max(.2,windup);}
function updateWarnRing(dt){if(warnDur<=0){warnRing.visible=false;return;}warnT+=dt;const k=Math.min(1,warnT/warnDur);warnRing.visible=enemy.visible;warnRing.position.set(enemy.position.x,enemy.position.y+.05,enemy.position.z);const r=1+k*(BOSS_PROFILES.includes(encounterProfile)?2.2:1.4);warnRing.scale.setScalar(r*4);warnRing.material.opacity=(1-k)*.25+k*.8;if(warnT>warnDur+.15){warnDur=0;warnRing.visible=false;}}
// ---------- Poderes dos Bispos: zonas com aviso no chão ----------
const hazards=[];
const hazardGeo=new THREE.CircleGeometry(1,40),hazardRimGeo=new THREE.RingGeometry(.92,1,40);
function spawnHazard({x,z,radius=2.4,delay=1.1,damage=20,color=0xff3a2a,pull=0,life=0}){
 const g=new THREE.Group();g.position.set(x,groundHeightAt(x,z)+.06,z);g.rotation.x=-Math.PI/2;
 const fill=new THREE.Mesh(hazardGeo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.12,depthWrite:false,toneMapped:false}));
 const rim=new THREE.Mesh(hazardRimGeo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false,toneMapped:false}));
 const grow=new THREE.Mesh(hazardGeo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.28,depthWrite:false,toneMapped:false}));
 g.add(fill,rim,grow);g.scale.setScalar(radius);scene.add(g);
 hazards.push({g,fill,rim,grow,x,z,radius,delay,damage,pull,life,t:0,fired:false});
}
/** MOD 210 — fogo abissal (VÉRAXION): aviso no chão e, no disparo, uma coluna de chamas negras e violeta. */
function abyssFlame(x,z,delay,radius){spawnHazard({x,z,radius,delay,damage:22,color:0x8a2aff});const y=groundHeightAt(x,z),fl=new THREE.Mesh(new THREE.ConeGeometry(radius*.8,5,12,1,true),addMat(0x7a1aff,0)),core=new THREE.Mesh(new THREE.ConeGeometry(radius*.45,3.6,10,1,true),addMat(0xff5a1a,0));fl.position.set(x,y+2.5,z);core.position.set(x,y+1.8,z);scene.add(fl,core);
 ultFx.push({t:0,tick(t){const k=t-delay;if(k<0)return;const o=k<.15?k/.15:Math.max(0,1-(k-.15)/.7);fl.material.opacity=.75*o;core.material.opacity=.8*o;fl.scale.set(1,.6+k*1.5,1);core.scale.set(1,.5+k*1.8,1);fl.rotation.y+=.2;core.rotation.y-=.3;if(k>.9){scene.remove(fl,core);fl.geometry.dispose();core.geometry.dispose();fl.material.dispose();core.material.dispose();return false;}}});}
function clearHazards(){for(const h of hazards.splice(0)){scene.remove(h.g);h.g.traverse(o=>{if(o.material)o.material.dispose();});}}
function updateHazards(dt){
 for(let i=hazards.length-1;i>=0;i--){const h=hazards[i];h.t+=dt;const k=Math.min(1,h.t/h.delay);h.grow.scale.setScalar(k);
  if(h.pull&&!h.fired){const dx=h.x-player.position.x,dz=h.z-player.position.z,d=Math.hypot(dx,dz);if(d<h.radius*3.2&&d>.4&&dashRemaining<=0){const f=h.pull*dt*(1-d/(h.radius*3.2));const nx=player.position.x+dx/d*f,nz=player.position.z+dz/d*f;if(!blockedAt(nx,nz)){player.position.x=nx;player.position.z=nz;}}}
  if(!h.fired&&h.t>=h.delay){h.fired=true;if(Math.hypot(h.x-player.position.x,h.z-player.position.z)<h.radius&&playerHP>0&&dashRemaining<=0)damagePlayerFromEnemyAttack(h.damage);burstSparks(new THREE.Vector3(h.x,groundHeightAt(h.x,h.z)+.6,h.z),h.rim.material.color.getHex());cameraShake(.09);}
  if(h.fired){const f=(h.t-h.delay)/.4;h.fill.material.opacity=Math.max(0,.5-f);h.rim.material.opacity=Math.max(0,.85-f);h.grow.material.opacity=Math.max(0,.5-f);if(f>=1){scene.remove(h.g);h.g.traverse(o=>{if(o.material)o.material.dispose();});hazards.splice(i,1);}}
 }
}
// Buraco negro (Ganância e Valério caído): núcleo cresce, puxa o herói e partículas, explode; dash escapa.
const blackHole={g:null,t:0,active:false};
function castBlackHole(x,z){
 if(blackHole.active)return;const g=new THREE.Group();g.position.set(x,groundHeightAt(x,z)+2.2,z);scene.add(g);
 const core=new THREE.Mesh(new THREE.SphereGeometry(.5,24,16),new THREE.MeshBasicMaterial({color:0x000000}));g.add(core);
 const halo=new THREE.Mesh(new THREE.RingGeometry(.6,1.2,48),new THREE.MeshBasicMaterial({color:0xb02aff,transparent:true,opacity:.8,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));g.add(halo);
 const N=80,pos=new Float32Array(N*3),seeds=[];for(let i=0;i<N;i++){seeds.push({a:Math.random()*6.28,r:3+Math.random()*7,y:(Math.random()-.5)*4,s:.8+Math.random()*1.6});}
 const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));const pts=new THREE.Points(pg,new THREE.PointsMaterial({map:softDot,color:0xd08aff,size:.35,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));g.add(pts);
 Object.assign(blackHole,{g,core,halo,pts,pos,seeds,t:0,active:true,x,z});
 spawnHazard({x,z,radius:5.2,delay:3.2,damage:34,color:0xb02aff,pull:2.6});
 showCombatCallout('A FOME DA GANÂNCIA');status.textContent='Um núcleo de vazio puxa tudo ao redor — use o DASH para escapar!';
}
function updateBlackHole(dt,now){
 const b=blackHole;if(!b.active)return;b.t+=dt;const k=Math.min(1,b.t/3.2);
 b.core.scale.setScalar(.4+k*2.2);b.halo.scale.setScalar(.5+k*3);b.halo.lookAt(camera.position);b.halo.material.opacity=.5+.4*Math.sin(now*.02);
 for(let i=0;i<b.seeds.length;i++){const s=b.seeds[i];s.a+=dt*s.s*(1+k*3);s.r=Math.max(.3,s.r-dt*(1.2+k*3));b.pos[i*3]=Math.cos(s.a)*s.r;b.pos[i*3+1]=s.y*(s.r/8);b.pos[i*3+2]=Math.sin(s.a)*s.r;if(s.r<=.35){s.r=6+Math.random()*5;}}
 b.pts.geometry.attributes.position.needsUpdate=true;
 if(b.t>=3.2){burstSparks(b.g.position.clone(),0xd08aff);cameraShake(.3);}
 if(b.t>=3.6){scene.remove(b.g);b.g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});b.active=false;}
}
/* ---------- MOD 210 — Marco 8: ultimates dos chefes ----------
 * VÉRAXION: BURACO NEGRO (sucção controlada, núcleo que fere e colapso final; dash e corrida escapam).
 * Ganância (forma final): SUPERNOVA DA GANÂNCIA, inspirada no impacto de "I Am Atomic" com linguagem própria
 * (ouro e violeta): o mundo escurece, anéis de runas avisam a área, um círculo de luz é o abrigo e o dash no
 * instante do impacto também salva. Câmera dramática sem tirar o controle (mesmo ângulo de giro) e volta suave. */
let slowMoUntil=0,slowMoK=1;function slowMo(ms,k){slowMoUntil=performance.now()+ms;slowMoK=k;}
const ultCam={w:0,want:0,height:5,dist:13,look:new THREE.Vector3()};
function applyUltCam(dt,target){
 ultCam.w+=(ultCam.want-ultCam.w)*Math.min(1,dt*(ultCam.want>ultCam.w?3:1.5));if(ultCam.w<.003)return;
 const p=new THREE.Vector3(player.position.x+Math.sin(cameraYaw)*ultCam.dist,player.position.y+ultCam.height,player.position.z+Math.cos(cameraYaw)*ultCam.dist);
 camera.position.lerp(p,ultCam.w*Math.min(1,dt*6));camera.lookAt(target.clone().lerp(ultCam.look,ultCam.w));
}
let ultDimEl=null;
function ultDim(v,sec){if(!ultDimEl){ultDimEl=document.createElement('div');ultDimEl.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:6;opacity:0;background:radial-gradient(circle at 50% 45%,rgba(40,0,50,.15) 0,rgba(8,0,14,.9) 70%);transition:opacity .5s';document.body.appendChild(ultDimEl);}ultDimEl.style.transition='opacity '+(sec||.5)+'s';ultDimEl.style.opacity=String(v);}
const bossUlt={kind:null,t:0,used:{},fx:null,fight:''};
const ultFx=[];
function addMat(color,op){return new THREE.MeshBasicMaterial({color,transparent:true,opacity:op,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});}
function endBossUlt(){const f=bossUlt.fx;if(f){scene.remove(f.g);f.g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});}bossUlt.fx=null;bossUlt.kind=null;ultCam.want=0;ultDim(0,.8);}
function updateBossUltimates(dt,now){
 for(let i=ultFx.length-1;i>=0;i--){const f=ultFx[i];f.t+=dt;if(f.tick(f.t,dt)===false)ultFx.splice(i,1);}
 const fight=encounterProfile+':'+enemyMaxHP;if(fight!==bossUlt.fight){bossUlt.fight=fight;bossUlt.used={};}
 const live=combatStepNow()&&enemy.visible&&enemyAlive&&playerHP>0;
 if(bossUlt.kind){if(!live||cineActive){endBossUlt();return;}bossUlt.t+=dt;(bossUlt.kind==='void'?tickVoidUlt:bossUlt.kind==='kit'?tickKitUlt:tickSupernova)(dt,now);return;}
 if(!live||cineActive||dialogueOpen||blackHole.active)return;
 const n=bossUlt.used.n||0;if(ultimateDue(encounterProfile,enemyHP/Math.max(1,enemyMaxHP),n)<0)return;
 bossUlt.used.n=n+1;const uk=ultimateFor(encounterProfile).kind;if(uk==='void')startVoidUlt();else if(uk==='nova')startSupernova();else startKitUlt(uk);
}
function startVoidUlt(){
 if(bossUlt.kind)endBossUlt();
 const e=enemy.position,P=player.position,c=new THREE.Vector3(e.x+(P.x-e.x)*.45,0,e.z+(P.z-e.z)*.45);c.y=groundHeightAt(c.x,c.z)+3.2;
 const g=new THREE.Group();g.position.copy(c);scene.add(g);
 const core=new THREE.Mesh(new THREE.SphereGeometry(.6,28,18),new THREE.MeshBasicMaterial({color:0x000000}));g.add(core);
 const disk=new THREE.Mesh(new THREE.RingGeometry(1,2.6,64),addMat(0x9a2cff,.0));disk.rotation.x=-Math.PI/2.4;g.add(disk);
 const fire=new THREE.Mesh(new THREE.RingGeometry(2.4,3.4,64),addMat(0xff5a1a,.0));fire.rotation.x=-Math.PI/2.4;g.add(fire);
 const halo=new THREE.Mesh(new THREE.RingGeometry(.7,1.6,48),addMat(0xd8a0ff,.0));g.add(halo);
 const N=140,pos=new Float32Array(N*3),seeds=[];for(let i=0;i<N;i++)seeds.push({a:Math.random()*6.28,r:4+Math.random()*12,y:(Math.random()-.5)*6,s:.6+Math.random()*1.8});
 const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));const pts=new THREE.Points(pg,new THREE.PointsMaterial({map:softDot,color:0xc070ff,size:.4,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));g.add(pts);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.9,1,64),addMat(0x9a2cff,0));ring.rotation.x=-Math.PI/2;ring.position.y=-c.y+groundHeightAt(c.x,c.z)+.08;g.add(ring);
 bossUlt.fx={g,core,disk,fire,halo,pts,pos,seeds,ring,c,tick:0,boom:false};bossUlt.kind='void';bossUlt.t=0;
 showCombatCallout(ULTIMATES.veraxion.name);status.textContent='VÉRAXION rasga o espaço: corra contra a sucção e use o DASH!';
 worldAudio.voidCharge&&worldAudio.voidCharge();slowMo(650,.3);cameraShake(.25);vibrate(120);
 Object.assign(ultCam,{want:1,height:6.5,dist:14});ultCam.look.set(c.x,c.y-.5,c.z);ultDim(.45,.6);playPose(enemyPoseRoot(),'channel',5.6,foeYaw,.6);
}
function tickVoidUlt(dt,now){
 const f=bossUlt.fx,t=bossUlt.t,P=player.position,grow=Math.min(1,t/1.2),end=t>5.4?Math.max(0,1-(t-5.4)/.35):1;
 f.core.scale.setScalar((.5+grow*2.4)*end+.05);f.disk.material.opacity=.85*grow*end;f.fire.material.opacity=.55*grow*end;f.disk.rotation.z+=dt*2.2;f.fire.rotation.z-=dt*1.4;
 f.halo.lookAt(camera.position);f.halo.scale.setScalar(1+grow*1.5);f.halo.material.opacity=(.28+.14*Math.sin(now*.02))*grow*end;
 f.ring.scale.setScalar(2+grow*6);f.ring.material.opacity=.7*grow*end;
 for(let i=0;i<f.seeds.length;i++){const s=f.seeds[i];s.a+=dt*s.s*(1+grow*3);s.r=Math.max(.4,s.r-dt*(2+grow*5));f.pos[i*3]=Math.cos(s.a)*s.r;f.pos[i*3+1]=s.y*(s.r/12);f.pos[i*3+2]=Math.sin(s.a)*s.r;if(s.r<=.45)s.r=8+Math.random()*8;}
 f.pts.geometry.attributes.position.needsUpdate=true;
 if(t>1.3&&ultCam.want>.55)ultCam.want=.55;
 if(t>1&&t<5.4){const dx=f.c.x-P.x,dz=f.c.z-P.z,d=Math.hypot(dx,dz);
  if(d>.5&&dashRemaining<=0){const pull=Math.min(5.2,1.5+t*.9)*dt*Math.min(1,10/Math.max(2,d)),nx=P.x+dx/d*pull,nz=P.z+dz/d*pull;if(!blockedAt(nx,nz)){P.x=nx;P.z=nz;}}
  f.tick-=dt;if(d<2.6&&f.tick<=0){f.tick=.5;damagePlayerFromEnemyAttack(9);}}
 if(t>=5.75&&!f.boom){f.boom=true;impactFrame(90);for(let i=0;i<3;i++)lightning(f.c.x+(Math.random()-.5)*6,f.c.z+(Math.random()-.5)*6,0xc070ff);burstSparks(f.c.clone(),0xc070ff);burstSparks(f.c.clone(),0xff7a2a);cameraShake(.5);hitStop(120);vibrate(160);worldAudio.thunder&&worldAudio.thunder();
  if(Math.hypot(f.c.x-P.x,f.c.z-P.z)<6.5&&dashRemaining<=0)damagePlayerFromEnemyAttack(28);ultCam.want=0;ultDim(0,1);}
 if(t>6.3)endBossUlt();
}
function startSupernova(){
 if(bossUlt.kind)endBossUlt();
 const e=enemy.position,ey=groundHeightAt(e.x,e.z),g=new THREE.Group();g.position.set(e.x,ey,e.z);scene.add(g);
 const core=new THREE.Mesh(new THREE.SphereGeometry(.5,28,18),new THREE.MeshBasicMaterial({color:0xfff4d8,toneMapped:false}));core.position.y=4;g.add(core);
 const glow=glowSprite(0xffc860,.9,8);glow.position.y=4;g.add(glow);
 const rings=[];for(let i=0;i<3;i++){const r=new THREE.Mesh(new THREE.RingGeometry(.94,1,96),addMat(i===1?0xb070ff:0xffd060,0));r.rotation.x=-Math.PI/2;r.position.y=.08+i*.01;g.add(r);rings.push(r);}
 const runes=new THREE.Mesh(new THREE.RingGeometry(.8,1,12,1),addMat(0xffe0a0,0));runes.rotation.x=-Math.PI/2;runes.position.y=.1;g.add(runes);
 const shell=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),addMat(0xfff0c8,0));shell.position.y=1;g.add(shell);
 const pillar=new THREE.Mesh(new THREE.CylinderGeometry(1.4,3,60,24,1,true),addMat(0xffe6b0,0));pillar.position.y=30;g.add(pillar);
 const a=Math.random()*6.28,R=10,sx=e.x+Math.cos(a)*R,sz=e.z+Math.sin(a)*R,sy=groundHeightAt(sx,sz);
 const safe=new THREE.Group();safe.position.set(sx-e.x,sy-ey+.1,sz-e.z);g.add(safe);
 const sDisk=new THREE.Mesh(new THREE.CircleGeometry(2.2,48),addMat(0xffffff,0));sDisk.rotation.x=-Math.PI/2;safe.add(sDisk);
 const sBeam=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,10,32,1,true),addMat(0xfff6dc,0));sBeam.position.y=5;safe.add(sBeam);
 const N=160,pos=new Float32Array(N*3),seeds=[];for(let i=0;i<N;i++)seeds.push({a:Math.random()*6.28,r:3+Math.random()*16,y:Math.random()*8,s:.5+Math.random()*1.5});
 const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));const pts=new THREE.Points(pg,new THREE.PointsMaterial({map:softDot,color:0xffd88a,size:.35,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));g.add(pts);
 bossUlt.fx={g,core,glow,rings,runes,shell,pillar,safe:{x:sx,z:sz},sDisk,sBeam,pts,pos,seeds,boom:false,R:17};bossUlt.kind='nova';bossUlt.t=0;
 showCombatCallout(ULTIMATES.greed3.name);status.textContent='A Ganância concentra todo o ouro do mundo — entre no círculo de luz ou use o DASH no impacto!';
 worldAudio.novaCharge&&worldAudio.novaCharge();slowMo(800,.3);vibrate(140);ultDim(.55,.8);
 Object.assign(ultCam,{want:1,height:4.2,dist:17});ultCam.look.set(e.x,ey+4,e.z);playPose(enemyPoseRoot(),'channel',3.2,foeYaw,.9);
}
function tickSupernova(dt,now){
 const f=bossUlt.fx,t=bossUlt.t,P=player.position,ch=Math.min(1,t/2.8);
 if(t<2.8){f.core.scale.setScalar(.6+ch*3+Math.sin(now*.03)*.15*ch);f.glow.scale.setScalar(6+ch*14);
  f.rings.forEach((r,i)=>{const k=Math.min(1,Math.max(0,(t-i*.5)/1.6));r.scale.setScalar(.5+k*f.R);r.material.opacity=.85*k;});
  f.runes.scale.setScalar(3+ch*6);f.runes.rotation.z+=dt*1.5;f.runes.material.opacity=.7*ch;
  f.sDisk.material.opacity=.35+.3*Math.sin(now*.012);f.sBeam.material.opacity=.18*ch;
  for(let i=0;i<f.seeds.length;i++){const s=f.seeds[i];s.a+=dt*s.s*(1+ch*2);s.r=Math.max(.3,s.r-dt*(1.5+ch*7));f.pos[i*3]=Math.cos(s.a)*s.r;f.pos[i*3+1]=4+(s.y-4)*(s.r/16);f.pos[i*3+2]=Math.sin(s.a)*s.r;if(s.r<=.35)s.r=8+Math.random()*10;}
  f.pts.geometry.attributes.position.needsUpdate=true;if(t>1.6)ultCam.look.y+=(enemy.position.y+3-ultCam.look.y)*dt;}
 else if(t<3.15){const k=(t-2.8)/.35;f.core.scale.setScalar(Math.max(.05,3.6*(1-k)));f.glow.scale.setScalar(20*(1-k)+1);ultDim(.85,.25);f.pts.visible=false;}
 else if(!f.boom){f.boom=true;impactFrame(110);storyFlash('white',900);cameraShake(.7);hitStop(170);vibrate(260);worldAudio.novaBlast&&worldAudio.novaBlast();ultDim(0,1.4);ultCam.want=0;
  const inSafe=Math.hypot(P.x-f.safe.x,P.z-f.safe.z)<2.4,inR=Math.hypot(P.x-enemy.position.x,P.z-enemy.position.z)<f.R;
  if(inR&&!inSafe&&dashRemaining<=0)damagePlayerFromEnemyAttack(46);else if(inSafe){status.textContent='A luz te protegeu da Supernova!';}
  f.core.visible=false;f.glow.visible=false;}
 if(f.boom){const k=t-3.15;f.shell.scale.setScalar(1+k*30);f.shell.material.opacity=Math.max(0,.7-k*.6);f.pillar.material.opacity=Math.max(0,.6-k*.5);
  f.rings.forEach(r=>{r.material.opacity=Math.max(0,r.material.opacity-dt*.8);});f.runes.material.opacity=Math.max(0,f.runes.material.opacity-dt);f.sDisk.material.opacity=Math.max(0,f.sDisk.material.opacity-dt);f.sBeam.material.opacity=Math.max(0,f.sBeam.material.opacity-dt*.5);
  if(k>1.5)endBossUlt();}
}
/* ===================== MOD 212 — Marco 10: poderes de todos os inimigos (regras em powers3d.js) =====================
 * Cada família (Seguidor, Demônio, Carrasco, Guardião, os quatro Bispos e as três formas da Ganância) tem Habilidade
 * 1, 2 e 3, golpe de espada e ultimate. Todo poder tem aviso no chão e saída (correr, pular ou dash). Bispos e
 * Ganância invocam com o grimório aberto; o herói, com a Bíblia. Efeitos curtos, com poucas malhas cada. */
const kitState={cds:{},t:2.5,last:'',fight:''};
let foeSlowUntil=0,foeInvertUntil=0;
function foeSlowMul(){return performance.now()<foeSlowUntil?.4:1;}
function pHit(dmg){if(dashRemaining>0||!enemyAlive)return false;return damagePlayerFromEnemyAttack(dmg);}
function foeYaw(){return Math.atan2(player.position.x-enemy.position.x,player.position.z-enemy.position.z);}
function fxDispose(o){scene.remove(o);o.traverse(m=>{if(m.geometry&&!m.geometry.userData.keep)m.geometry.dispose();if(m.material&&!m.material.userData.keep)m.material.dispose();});}
function fxPush(fn){ultFx.push({t:0,tick:fn});}
function fxGy(x,z){return groundHeightAt(x,z);}
/** Grimório (Bispos/Ganância) ou Bíblia (herói) aberto, flutuando à frente de quem invoca. */
function showGrimoire(color,dur,onPlayer){
 const g=new THREE.Group(),cover=new THREE.MeshStandardMaterial({color:onPlayer?0xf2e2b8:0x1c0a16,emissive:color,emissiveIntensity:onPlayer?.45:.3,metalness:.35,roughness:.45}),page=new THREE.MeshBasicMaterial({color:onPlayer?0xfff6dc:0x2c1a30,side:THREE.DoubleSide});
 for(const s of [-1,1]){const c=new THREE.Mesh(new THREE.BoxGeometry(.4,.035,.54),cover);c.position.x=s*.2;c.rotation.z=s*.16;g.add(c);const pg=new THREE.Mesh(new THREE.PlaneGeometry(.36,.48),page);pg.rotation.set(-Math.PI/2,0,s*.16);pg.position.set(s*.19,.03,0);g.add(pg);}
 const rune=new THREE.Mesh(new THREE.RingGeometry(.36,.44,6),addMat(color,0));rune.rotation.x=-Math.PI/2;rune.position.y=.22;g.add(rune);
 const rune2=new THREE.Mesh(new THREE.RingGeometry(.22,.26,3),addMat(color,0));rune2.rotation.x=-Math.PI/2;rune2.position.y=.24;g.add(rune2);
 const glow=glowSprite(color,0,1.5);glow.position.y=.18;g.add(glow);scene.add(g);
 fxPush(function(t){const src=onPlayer?player.position:enemy.position,yaw=onPlayer?playerYaw:foeYaw();
  g.position.set(src.x+Math.sin(yaw)*.85+Math.cos(yaw)*.45,src.y+1.45+Math.sin(t*3)*.05,src.z+Math.cos(yaw)*.85-Math.sin(yaw)*.45);g.rotation.set(-.55,yaw,0,'YXZ');
  const a=Math.min(1,t/.22)*(t>dur?Math.max(0,1-(t-dur)/.3):1);g.scale.setScalar(.2+.8*a);rune.rotation.z+=.06;rune2.rotation.z-=.09;rune.material.opacity=.9*a;rune2.material.opacity=.8*a;glow.material.opacity=.75*a;
  if(t>dur+.3){fxDispose(g);return false;}});
}
/** Erupção: aviso circular (spawnHazard dá o dano) e, no disparo, uma coluna de duas cores. */
function fxErupt(x,z,delay,r,dmg,c1,c2,h=5){spawnHazard({x,z,radius:r,delay,damage:dmg,color:c1});const y=fxGy(x,z),a=new THREE.Mesh(new THREE.ConeGeometry(r*.8,h,12,1,true),addMat(c1,0)),b=new THREE.Mesh(new THREE.ConeGeometry(r*.45,h*.7,10,1,true),addMat(c2,0));a.position.set(x,y+h/2,z);b.position.set(x,y+h*.35,z);scene.add(a,b);
 fxPush(function(t){const k=t-delay;if(k<0)return;if(!a.userData.sc){a.userData.sc=1;scorch(x,z,r*.9);}const o=k<.15?k/.15:Math.max(0,1-(k-.15)/.6);a.material.opacity=.75*o;b.material.opacity=.85*o;a.scale.set(1,.6+k*1.4,1);b.scale.set(1,.5+k*1.7,1);a.rotation.y+=.2;b.rotation.y-=.3;if(k>.8){fxDispose(a);fxDispose(b);return false;}});}
/** Aviso em faixa (lança/raio) do ponto (x,z) na direção yaw; dispara depois de `delay`. */
function fxLine(x,z,yaw,len,w,delay,dmg,c1,c2){
 const y=fxGy(x,z)+.07,dx=Math.sin(yaw),dz=Math.cos(yaw),g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=yaw;scene.add(g);
 const tel=new THREE.Mesh(new THREE.PlaneGeometry(w,len),addMat(c1,.22));tel.rotation.x=-Math.PI/2;tel.position.z=len/2;g.add(tel);
 const edge=new THREE.Mesh(new THREE.PlaneGeometry(w*.12,len),addMat(c1,.8));edge.rotation.x=-Math.PI/2;edge.position.z=len/2;g.add(edge);
 const beam=new THREE.Mesh(new THREE.BoxGeometry(w*.8,w*.8,len),addMat(c2,0));beam.position.set(0,1,len/2);g.add(beam);let fired=false;
 fxPush(function(t){if(t<delay){tel.material.opacity=.15+.25*(t/delay);return;}
  if(!fired){fired=true;cameraShake(.15);const px=player.position.x-x,pz=player.position.z-z,along=px*dx+pz*dz,side=Math.abs(px*dz-pz*dx);if(along>-.5&&along<len&&side<w*.6&&player.position.y-y<1.8)pHit(dmg);}
  const k=t-delay;beam.material.opacity=Math.max(0,.9-k*1.8);beam.scale.set(1+k*2,1+k*2,1);tel.material.opacity=Math.max(0,.3-k);edge.material.opacity=Math.max(0,.8-k*2);if(k>.55){fxDispose(g);return false;}});
}
/** Varrida em leque à frente de quem ataca (raio r, abertura arc). */
function fxCone(x,z,yaw,r,arc,delay,dmg,c1,c2){
 const g=new THREE.Group();g.position.set(x,fxGy(x,z)+.07,z);scene.add(g);
 const tel=new THREE.Mesh(new THREE.CircleGeometry(r,28,Math.PI/2-yaw-arc/2,arc),addMat(c1,.2));tel.rotation.x=-Math.PI/2;g.add(tel);
 const sweep=new THREE.Mesh(new THREE.RingGeometry(r*.55,r,28,1,Math.PI/2-yaw-arc/2,arc),addMat(c2,0));sweep.rotation.x=-Math.PI/2;sweep.position.y=.9;g.add(sweep);let fired=false;
 fxPush(function(t){if(t<delay){tel.material.opacity=.12+.3*(t/delay);return;}
  if(!fired){fired=true;worldAudio.whoosh();const px=player.position.x-x,pz=player.position.z-z,d=Math.hypot(px,pz),a=Math.atan2(px,pz),da=Math.abs(Math.atan2(Math.sin(a-yaw),Math.cos(a-yaw)));if(d<r&&da<arc/2)pHit(dmg);}
  const k=t-delay;sweep.material.opacity=Math.max(0,.9-k*2);sweep.scale.setScalar(1+k*.6);tel.material.opacity=Math.max(0,.35-k);if(k>.5){fxDispose(g);return false;}});
}
/** Onda de choque que se expande a partir de (x,z): pule ou use o dash quando ela passar. */
function fxRing(x,z,r,delay,dmg,c1){
 const y=fxGy(x,z)+.1,tel=new THREE.Mesh(new THREE.RingGeometry(r-.15,r,64),addMat(c1,.35));tel.rotation.x=-Math.PI/2;tel.position.set(x,y,z);scene.add(tel);
 const wave=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.9,48,1,true),addMat(c1,0));wave.position.set(x,y+.45,z);scene.add(wave);const hit={v:false};
 fxPush(function(t){if(t<delay){tel.material.opacity=.2+.4*Math.abs(Math.sin(t*9));return;}
  const k=(t-delay)/.9,R=Math.max(.3,k*r);wave.scale.set(R,1,R);wave.material.opacity=Math.max(0,.8*(1-k));tel.material.opacity=Math.max(0,.4-k);
  const d=Math.hypot(player.position.x-x,player.position.z-z);if(!hit.v&&Math.abs(d-R)<.7&&player.position.y-y<.6){hit.v=true;pHit(dmg);}
  if(k>=1){fxDispose(tel);fxDispose(wave);return false;}});
}
/** Orbes (estilo Hellblaze): nascem em volta de quem invoca, giram e perseguem o herói. */
function fxOrbs(n,speed,dmg,c1,c2,size=.32){
 const e=enemy.position,orbs=[];
 for(let i=0;i<n;i++){const g=new THREE.Group(),core=new THREE.Mesh(new THREE.SphereGeometry(size,12,8),new THREE.MeshBasicMaterial({color:c2,toneMapped:false})),gl=glowSprite(c1,.9,size*5);g.add(core,gl);scene.add(g);orbs.push({g,a:i/n*6.28,vx:0,vz:0,live:true,launch:.5+i*.12});}
 fxPush(function(t,dt){let any=false;for(const o of orbs){if(!o.live)continue;any=true;
  if(t<o.launch){o.a+=dt*5;o.g.position.set(e.x+Math.cos(o.a)*1.4,e.y+1.6+Math.sin(o.a*2)*.2,e.z+Math.sin(o.a)*1.4);continue;}
  const p=o.g.position,tx=player.position.x-p.x,tz=player.position.z-p.z,ty=player.position.y+1-p.y,d=Math.hypot(tx,tz)||1;
  if(o.vx===0&&o.vz===0){o.vx=tx/d*speed;o.vz=tz/d*speed;}
  o.vx+=(tx/d*speed-o.vx)*Math.min(1,dt*1.6);o.vz+=(tz/d*speed-o.vz)*Math.min(1,dt*1.6);p.x+=o.vx*dt;p.z+=o.vz*dt;p.y+=ty*Math.min(1,dt*3);
  if(Math.hypot(player.position.x-p.x,player.position.z-p.z)<.75&&Math.abs(player.position.y+1-p.y)<1.2){pHit(dmg);burstSparks(p.clone(),c1);o.live=false;fxDispose(o.g);continue;}
  if(t>o.launch+3.2){o.live=false;fxDispose(o.g);}}
  return any?undefined:false;});
}
/** Cortes em lua crescente (corte negro), em leque, a partir de quem ataca. */
function fxWave(n,dmg,c1,c2,delay=.35){
 const e=enemy.position.clone(),yaw0=foeYaw(),waves=[];
 for(let i=0;i<n;i++){const yaw=yaw0+(i-(n-1)/2)*.28,g=new THREE.Group();const m=new THREE.Mesh(new THREE.RingGeometry(.9,1.35,32,1,-Math.PI/2-1.2,2.4),addMat(c1,0)),m2=new THREE.Mesh(new THREE.RingGeometry(1.35,1.5,32,1,-Math.PI/2-1.2,2.4),addMat(c2,0));
  for(const x of [m,m2]){x.rotation.x=-Math.PI/2;x.position.z=-1;g.add(x);}g.position.set(e.x,e.y+1.1,e.z);g.rotation.y=yaw;scene.add(g);waves.push({g,m,m2,yaw,live:true,hit:false});}
 fxPush(function(t,dt){if(t<delay)return;let any=false;const k=t-delay;for(const w of waves){if(!w.live)continue;any=true;
  w.g.position.x+=Math.sin(w.yaw)*13*dt;w.g.position.z+=Math.cos(w.yaw)*13*dt;w.g.scale.setScalar(1+k*.8);w.m.material.opacity=Math.max(0,.95-k*.7);w.m2.material.opacity=Math.max(0,.7-k*.6);
  if(!w.hit&&Math.hypot(player.position.x-w.g.position.x,player.position.z-w.g.position.z)<1.5&&Math.abs(player.position.y+1-w.g.position.y)<1.3){w.hit=true;pHit(dmg);}
  if(k>1.1){w.live=false;fxDispose(w.g);}}return any?undefined:false;});
}
/** Investida com aviso: quem ataca dispara em linha reta e fere quem estiver no caminho. */
function fxDash(len,dmg,c1){
 const e=enemy.position,yaw=foeYaw(),sx=e.x,sz=e.z;fxLine(sx,sz,yaw,len,1.4,.6,0,c1,c1);let done=false;
 fxPush(function(t){if(t<.6)return;const k=Math.min(1,(t-.6)/.25);if(!done){const nx=sx+Math.sin(yaw)*len*k,nz=sz+Math.cos(yaw)*len*k;if(!blockedAt(nx,nz)){enemy.position.x=nx;enemy.position.z=nz;}
   const px=player.position.x-sx,pz=player.position.z-sz,along=px*Math.sin(yaw)+pz*Math.cos(yaw),side=Math.abs(px*Math.cos(yaw)-pz*Math.sin(yaw));if(along>0&&along<len*k+.8&&side<1.1){done=true;pHit(dmg);burstSparks(player.position.clone().setY(player.position.y+1),c1);}}
  if(k>=1)return false;});
}
/** Mãos/correntes que brotam do chão: ferem e prendem (lentidão) quem fica no círculo. */
function fxGrab(x,z,r,delay,dmg,root,c1,c2,chain){
 const y=fxGy(x,z),tel=new THREE.Mesh(new THREE.CircleGeometry(r,32),addMat(c2,.0));tel.rotation.x=-Math.PI/2;tel.position.set(x,y+.07,z);scene.add(tel);
 const rim=new THREE.Mesh(new THREE.RingGeometry(r-.12,r,40),addMat(c1,.8));rim.rotation.x=-Math.PI/2;rim.position.set(x,y+.08,z);scene.add(rim);
 const hands=new THREE.Group();hands.position.set(x,y,z);scene.add(hands);const mat=chain?new THREE.MeshStandardMaterial({color:0xd8a030,metalness:.8,roughness:.3,emissive:0x3a2000}):new THREE.MeshBasicMaterial({color:0x07020a});
 for(let i=0;i<6;i++){const a=i/6*6.28,f=new THREE.Mesh(chain?new THREE.TorusGeometry(.22,.06,6,10):new THREE.ConeGeometry(.16,1.6,5),mat);f.position.set(Math.cos(a)*r*.6,-1.4,Math.sin(a)*r*.6);f.rotation.set(chain?0:(Math.cos(a)*-.5),a,chain?Math.PI/2:(Math.sin(a)*.5));f.userData.a=a;hands.add(f);}
 let fired=false;
 fxPush(function(t){if(t<delay){tel.material.opacity=.45*(t/delay);rim.material.opacity=.4+.4*Math.abs(Math.sin(t*10));return;}
  const k=t-delay;hands.children.forEach((f,i)=>{f.position.y=Math.min(chain?.9:.6,-1.4+k*9);if(chain)f.position.y+=Math.sin(k*10+i)*.15;});
  if(!fired){fired=true;worldAudio.corrupt();if(Math.hypot(player.position.x-x,player.position.z-z)<r){if(pHit(dmg))foeSlowUntil=performance.now()+root*1000;}}
  tel.material.opacity=Math.max(0,.45-k*.5);rim.material.opacity=Math.max(0,.8-k);if(k>.9){hands.position.y-=.15;}if(k>1.3){fxDispose(tel);fxDispose(rim);fxDispose(hands);return false;}});
}
/** Chuva de lâminas/moedas numa área (estilo "portões do tesouro"): aviso, depois dezenas caem do céu. */
const rainGeo=new THREE.ConeGeometry(.09,1.6,4);rainGeo.userData.keep=true;const coinGeo=new THREE.CylinderGeometry(.22,.22,.06,10);coinGeo.userData.keep=true;
function fxRain(x,z,r,n,dur,dmg,c1,gold,friendly){
 n=Math.round(n*(renderer.getPixelRatio()<1?.6:1));const y=fxGy(x,z),tel=new THREE.Mesh(new THREE.CircleGeometry(r,40),addMat(c1,0));tel.rotation.x=-Math.PI/2;tel.position.set(x,y+.07,z);scene.add(tel);
 const rim=new THREE.Mesh(new THREE.RingGeometry(r-.1,r,48),addMat(c1,.8));rim.rotation.x=-Math.PI/2;rim.position.set(x,y+.08,z);scene.add(rim);
 const portal=new THREE.Mesh(new THREE.RingGeometry(r*.7,r*.9,48),addMat(c1,0));portal.rotation.x=-Math.PI/2;portal.position.set(x,y+11,z);scene.add(portal);
 const mat=gold?new THREE.MeshStandardMaterial({color:0xffcf50,emissive:0x8a5a00,emissiveIntensity:.8,metalness:.85,roughness:.25}):new THREE.MeshBasicMaterial({color:c1,toneMapped:false});
 const im=new THREE.InstancedMesh(gold?coinGeo:rainGeo,mat,n);im.frustumCulled=false;scene.add(im);const drops=[],M=new THREE.Matrix4(),Q=new THREE.Quaternion(),V=new THREE.Vector3(),SC=new THREE.Vector3(1,1,1),E=new THREE.Euler();
 for(let i=0;i<n;i++){const a=Math.random()*6.28,rr=Math.sqrt(Math.random())*r;drops.push({x:x+Math.cos(a)*rr,z:z+Math.sin(a)*rr,t0:.7+Math.random()*dur,spin:Math.random()*6});}
 const ticks=[.7+dur*.35,.7+dur*.75],hit=[false,false];
 fxPush(function(t){const tl=Math.min(1,t/.7);tel.material.opacity=.18*tl;portal.material.opacity=.7*tl*(t<.7+dur?1:Math.max(0,1-(t-.7-dur)*2));portal.rotation.z+=.03;
  for(let i=0;i<n;i++){const d=drops[i],k=(t-d.t0)/.35;V.set(d.x,k<0?-50:Math.max(y+.4,y+11-k*10.6),d.z);E.set(gold?d.spin+t*8:Math.PI,0,gold?t*6:0);Q.setFromEuler(E);M.compose(V,Q,SC);im.setMatrixAt(i,M);}
  im.instanceMatrix.needsUpdate=true;
  for(let j=0;j<2;j++)if(!hit[j]&&t>ticks[j]){hit[j]=true;if(friendly){if(combatStepNow()&&enemy.visible&&enemyAlive&&Math.hypot(enemy.position.x-x,enemy.position.z-z)<r+.5)hurtEnemy(dmg,j===1);}else if(Math.hypot(player.position.x-x,player.position.z-z)<r)pHit(Math.round(dmg*.6));cameraShake(.08);}
  if(t>.7+dur+.7){fxDispose(tel);fxDispose(rim);fxDispose(portal);scene.remove(im);mat.dispose();im.dispose();return false;}});
}
/** Furacão (negro, de fogo ou de moedas) que persegue o herói, puxa um pouco e fere de perto. */
function fxVortex(dur,speed,dmg,c1,c2){
 const e=enemy.position,g=new THREE.Group();g.position.set(e.x,fxGy(e.x,e.z),e.z);scene.add(g);const shells=[];
 for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(.9+i*.7,.25+i*.2,4+i*1.6,18,1,true),addMat(i===1?c2:c1,0));m.position.y=(4+i*1.6)/2;g.add(m);shells.push(m);}
 const base=new THREE.Mesh(new THREE.RingGeometry(1.6,1.9,40),addMat(c1,.6));base.rotation.x=-Math.PI/2;base.position.y=.08;g.add(base);let tick=0;
 fxPush(function(t,dt){const a=Math.min(1,t/.5)*(t>dur?Math.max(0,1-(t-dur)/.5):1);shells.forEach((m,i)=>{m.rotation.y+=dt*(6-i*1.5);m.material.opacity=(.55-i*.12)*a;});
  const p=g.position,dx=player.position.x-p.x,dz=player.position.z-p.z,d=Math.hypot(dx,dz)||1;if(t<dur){const nx=p.x+dx/d*speed*dt,nz=p.z+dz/d*speed*dt;if(!blockedAt(nx,nz)){p.x=nx;p.z=nz;p.y=fxGy(nx,nz);}
   if(d<4.5&&d>.6&&dashRemaining<=0){const f=1.4*dt;const qx=player.position.x-dx/d*f,qz=player.position.z-dz/d*f;if(!blockedAt(qx,qz)){player.position.x=qx;player.position.z=qz;}}
   tick-=dt;if(d<1.8&&tick<=0){tick=.6;pHit(dmg);}}
  if(t>dur+.5){fxDispose(g);return false;}});
}
/** O herói machuca o chefe (efeitos amigos): mesma regra de morte do resto do combate. */
function hurtEnemy(dmg,big){if(!(combatStepNow()&&enemy.visible&&enemyAlive))return;enemyHP=Math.max(0,enemyHP-dmg);onEnemyDamaged(dmg,!!big);
 if(enemyHP===0){enemyAlive=false;const hud=document.getElementById('enemy-hud');if(hud)hud.style.display='none';if(!playEnemyAnimation('death',.06,true))enemyHasDeathClip=false;setTimeout(()=>advanceAfterEnemyDefeat(),850);}else playEnemyAnimation('hit',.05,true);}
/** Executa um poder do kit (habilidade ou golpe de espada) com os números já ajustados ao nível. */
function runFoeMove(m,k){
 const P=player.position,e=enemy.position,yaw=foeYaw(),c1=k.color,c2=k.color2;
 if(m.id==='sw'){playEnemyAnimation('attack',.08,true);playPose(enemyPoseRoot(),m.type==='dash'?'thrust':'sweep',.85,foeYaw);}else{playEnemyAnimation('cast',.1,true);if(k.book)showGrimoire(c1,1.3,false);playPose(enemyPoseRoot(),m.type==='dash'||m.type==='line'?'thrust':m.type==='ring'?'slam':'cast',1.1,foeYaw);}
 showCombatCallout(m.name.toUpperCase());worldAudio.magic&&worldAudio.magic('magic2');
 switch(m.type){
  case 'orbs':fxOrbs(m.n,m.speed,m.dmg,c1,c2);break;
  case 'grab':for(let i=0;i<m.n;i++){const lead=i*.9;fxGrab(P.x+moveVX*lead,P.z+moveVZ*lead,m.r,.85+i*.35,m.dmg,m.root,c1,c2,m.chain);}break;
  case 'circles':for(let i=0;i<m.n;i++){const a=Math.random()*6.28,r=i?1.2+Math.random()*3.5:0;fxErupt(P.x+Math.cos(a)*r,P.z+Math.sin(a)*r,.9+i*.22,m.r,m.dmg,c1,c2);}break;
  case 'rain':fxRain(P.x,P.z,m.r,m.n,m.dur,m.dmg,c1,m.gold);break;
  case 'wave':fxWave(m.n,m.dmg,c1,c2);break;
  case 'line':for(let i=0;i<(m.n||1);i++){const off=(i-((m.n||1)-1)/2)*.45;fxLine(e.x,e.z,yaw+off,m.len,m.w,.75+i*.15,m.dmg,c1,c2);}break;
  case 'ring':fxRing(e.x,e.z,m.r,.7,m.dmg,c1);break;
  case 'cone':fxCone(e.x,e.z,yaw,m.r,m.arc,.55,m.dmg,c1,c2);break;
  case 'dash':fxDash(m.len,m.dmg,c1);break;
  case 'vortex':fxVortex(m.dur,m.speed,m.dmg,m.gold?0xffd060:c1,c2);break;
  case 'abyss':{const d=Math.max(1,Math.hypot(P.x-e.x,P.z-e.z));for(let i=0;i<m.n;i++){const s=(i+1)/m.n*Math.min(12,d+3);abyssFlame(e.x+(P.x-e.x)/d*s,e.z+(P.z-e.z)/d*s,.8+i*.22,1.9);}abyssFlame(P.x,P.z,1.6,2.6);worldAudio.abyss&&worldAudio.abyss();break;}
  case 'blackhole':castBlackHole(e.x+(P.x-e.x)*.5,e.z+(P.z-e.z)*.5);break;
 }
}
function updateFoeKit(dt){
 const prof=encounterProfile,kit=kitFor(prof);if(!kit)return;
 const fight=prof+':'+enemyMaxHP;if(fight!==kitState.fight){kitState.fight=fight;kitState.cds={};kitState.t=2.5;kitState.last='';if(kitState.aura){kitState.aura.dispose();kitState.aura=null;}}
 // Aura de batalha (estilo Sol's RNG) quando o chefe ou a elite entra em fúria (menos de 50% de vida).
 if(kitState.aura){if(!enemy.visible||!enemyAlive||!combatStepNow()){kitState.aura.dispose();kitState.aura=null;}else kitState.aura.tick(dt,performance.now());}
 else if(tierOf(prof)!=='common'&&enemy.visible&&enemyAlive&&combatStepNow()&&enemyHP<enemyMaxHP*.5){const a=makeAura(kit.color,tierOf(prof)==='boss'?1.5:1.15,()=>enemy.position);const i=act5Auras.indexOf(a);if(i>=0)act5Auras.splice(i,1);kitState.aura=a;showCombatCallout('FÚRIA');}
 for(const id in kitState.cds)if((kitState.cds[id]-=dt)<=0)delete kitState.cds[id];
 if(!combatStepNow()||!enemy.visible||!enemyAlive||cineActive||dialogueOpen||playerHP<=0||bossUlt.kind||blackHole.active){kitState.t=Math.max(kitState.t,1.2);return;}
 kitState.t-=dt;if(kitState.t>0)return;
 const d=Math.hypot(enemy.position.x-player.position.x,enemy.position.z-player.position.z),m0=pickMove(prof,kitState.cds,d,kitState.last);if(!m0)return;
 const m=powerStats(prof,m0);runFoeMove(m,kit);kitState.cds[m.id]=m.cd;kitState.last=m.id;kitState.t=(m.id==='sw'?2.4:3.2)*(tierOf(prof)==='common'?1.6:1);
}
/* ---------- Ultimates das famílias (as do Bispo 4 e da Ganância final ficam no MOD 210) ---------- */
function startKitUlt(kind){
 if(bossUlt.kind)endBossUlt();const kit=kitFor(encounterProfile);if(!kit)return;const m=powerStats(encounterProfile,kit.ult),c1=kit.color,c2=kit.color2,e=enemy.position;
 const at=(time,fn)=>seq.push([time,fn]),seq=[];let dur=5;
 bossUlt.kind='kit';bossUlt.t=0;bossUlt.fx=null;bossUlt.seq=seq;
 showCombatCallout(m.name);playEnemyAnimation('cast',.1,true);if(kit.book)showGrimoire(c1,dur,false);worldAudio.voidCharge&&worldAudio.voidCharge();slowMo(500,.35);vibrate(120);
 Object.assign(ultCam,{want:.85,height:5.5,dist:14});ultCam.look.set(e.x,e.y+2.5,e.z);ultDim(.4,.6);
 const P=()=>player.position,D=m.dmg;
 if(kind==='ritual'){status.textContent='O culto fecha o círculo do sacrifício — saia do centro!';const p=P().clone();for(let i=0;i<6;i++){const a=i/6*6.28;fxErupt(p.x+Math.cos(a)*3.6,p.z+Math.sin(a)*3.6,1+i*.12,1.4,Math.round(D*.5),c1,c2);}at(.6,()=>fxErupt(p.x,p.z,2,2.8,D,c1,0xffffff,8));dur=3.6;}
 else if(kind==='inferno'){status.textContent='Dois furacões de fogo caçam você — corra e use o DASH!';fxRing(e.x,e.z,6,.4,Math.round(D*.5),c1);at(.8,()=>fxVortex(4.5,3.4,Math.round(D*.35),c1,0xffd060));at(1.6,()=>fxVortex(3.6,3,Math.round(D*.35),0xffd060,c1));dur=5.6;}
 else if(kind==='execution'){status.textContent='O carrasco salta para a execução — saia da marca!';const p=P().clone();spawnHazard({x:p.x,z:p.z,radius:3,delay:1.3,damage:D,color:c1});at(1.25,()=>{if(!blockedAt(p.x,p.z)){enemy.position.x=p.x;enemy.position.z=p.z;}cameraShake(.5);impactFrame(70);scorch(p.x,p.z,3);burstSparks(p.clone().setY(fxGy(p.x,p.z)+.5),c1);fxRing(p.x,p.z,8,0,Math.round(D*.5),c1);});at(2,()=>fxWave(3,Math.round(D*.45),c1,c2,0));dur=3.4;}
 else if(kind==='barrage'){status.textContent='Rajadas de orbes sombrios — não pare de se mover!';for(let i=0;i<3;i++)at(.3+i*.8,()=>fxOrbs(7,8.5,Math.round(D*.3),c1,c2,.28));dur=4.6;}
 else if(kind==='reaper'){status.textContent='VALÉRIO invoca o Ceifador: fique ATRÁS dele ou use o DASH no corte!';const yaw=foeYaw();
  for(let i=0;i<5;i++)at(.3+i*.35,()=>fxGrab(P().x,P().z,1.6,.8,Math.round(D*.35),1,c1,c2,false));
  const sc=new THREE.Group(),bm=addMat(0xd8c8ff,0),blade=new THREE.Mesh(new THREE.TorusGeometry(4.5,.35,6,32,2.2),bm),handle=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,9,8),addMat(0x2a0a3a,0));blade.position.set(0,4.5,0);handle.position.set(4.3,0,0);sc.add(blade,handle);sc.position.set(e.x,e.y+5,e.z);sc.rotation.y=yaw;scene.add(sc);
  fxCone(e.x,e.z,yaw,9,4.4,2.4,D,c1,0xd8c8ff);fxPush(function(t){const a=Math.min(1,t/.8);bm.opacity=.8*a;handle.material.opacity=.7*a;if(t>2.4)sc.rotation.y+=.25;if(t>3.1){fxDispose(sc);return false;}});dur=3.6;}
 else if(kind==='forge'){status.textContent='A Fornalha da Dívida: ouro derretido cai do céu — fuja da área e do sol de ouro!';const p=P().clone();fxRain(p.x,p.z,6,60,3,Math.round(D*.6),0xffb020,true);for(let i=0;i<5;i++)at(.6+i*.4,()=>fxErupt(P().x+(Math.random()-.5)*5,P().z+(Math.random()-.5)*5,.8,1.8,Math.round(D*.4),0xffb020,0xff4a00));
  const sun=new THREE.Mesh(new THREE.SphereGeometry(1.6,20,14),new THREE.MeshBasicMaterial({color:0xffc040,toneMapped:false})),glow=glowSprite(0xff8a20,.9,12);sun.add(glow);sun.position.set(p.x,fxGy(p.x,p.z)+16,p.z);scene.add(sun);
  at(1.6,()=>spawnHazard({x:P().x,z:P().z,radius:4,delay:2.2,damage:D,color:0xff6a10}));fxPush(function(t){if(t>1.6&&t<3.8){const q=P();sun.position.x+=(q.x-sun.position.x)*.02;sun.position.z+=(q.z-sun.position.z)*.02;sun.position.y=fxGy(sun.position.x,sun.position.z)+16-12*Math.max(0,(t-2.8)/1);}if(t>3.8){burstSparks(sun.position.clone(),0xffb020);cameraShake(.5);impactFrame(80);scorch(sun.position.x,sun.position.z,4);fxDispose(sun);return false;}});dur=4.4;}
 else if(kind==='sentence'){for(let i=0;i<5;i++)at(.6+i*.5,()=>lightning(P().x+(Math.random()-.5)*4,P().z+(Math.random()-.5)*4,0x9ae6ff));status.textContent="ZAR'KHAEL inverte o espaço: CONTROLES INVERTIDOS por alguns segundos!";foeInvertUntil=performance.now()+4200;showCombatCallout('CONTROLES INVERTIDOS');
  for(let i=0;i<6;i++)at(.4+i*.45,()=>fxErupt(P().x,P().z,.9,1.9,Math.round(D*.45),c1,0xffffff,7));for(let i=0;i<6;i++)at(1.2,()=>fxLine(e.x,e.z,i/6*6.28,13,1,.8,Math.round(D*.5),c1,0xffffff));dur=4.6;}
 else if(kind==='gate'){for(let i=0;i<6;i++)at(.4+i*.7,()=>lightning(P().x+(Math.random()-.5)*7,P().z+(Math.random()-.5)*7,0xffe08a));status.textContent='Os portões da Avareza se abrem: centenas de espadas de ouro caem — não fique parado!';for(let i=0;i<4;i++)at(.2+i*1,()=>fxRain(P().x,P().z,4.2,40,1.2,Math.round(D*.55),0xffd040,false));dur=5.2;}
 else if(kind==='hands'){status.textContent='As mãos da Avareza vão esmagar você — saia da marca!';
  for(let i=0;i<2;i++)at(.3+i*1.6,()=>{const p=P().clone(),hand=new THREE.Group(),gm=new THREE.MeshStandardMaterial({color:0xffcf50,emissive:0x6a4000,metalness:.9,roughness:.25});const palm=new THREE.Mesh(new THREE.BoxGeometry(3,.6,3.4),gm);hand.add(palm);for(let f=0;f<4;f++){const fg=new THREE.Mesh(new THREE.BoxGeometry(.55,.5,2.2),gm);fg.position.set(-1.1+f*.73,0,2.6);hand.add(fg);}const th=new THREE.Mesh(new THREE.BoxGeometry(.6,.5,1.6),gm);th.position.set(1.9,0,.6);th.rotation.y=-.6;hand.add(th);hand.position.set(p.x,fxGy(p.x,p.z)+14,p.z);hand.rotation.y=Math.random()*6;scene.add(hand);
   spawnHazard({x:p.x,z:p.z,radius:3.4,delay:1.2,damage:D,color:0xffb030});fxPush(function(t){if(t<1.2)hand.position.y=fxGy(p.x,p.z)+14-10*(t/1.2)**3;else if(t<1.25){hand.position.y=fxGy(p.x,p.z)+.4;if(!hand.userData.hit){hand.userData.hit=1;cameraShake(.45);impactFrame(60);scorch(p.x,p.z,3.4);}}if(t>2){hand.position.y+=.2;}if(t>2.6){fxDispose(hand);return false;}});});
  at(2.2,()=>fxVortex(3,3.4,Math.round(D*.3),0xffd060,c2));dur=5.4;}
 bossUlt.dur=dur;playPose(enemyPoseRoot(),kind==='execution'||kind==='hands'?'slam':'channel',Math.min(dur,kind==='execution'?1.6:dur),foeYaw,kind==='execution'?0:.5);
}
function tickKitUlt(dt){const s=bossUlt.seq||[];for(let i=s.length-1;i>=0;i--)if(bossUlt.t>=s[i][0]){const fn=s[i][1];s.splice(i,1);fn();}
 if(bossUlt.t>1.4&&ultCam.want>.5)ultCam.want=.5;if(bossUlt.t>=bossUlt.dur){endBossUlt();}}
/* ===================== MOD 213 — Marco 11: animações de poder, corrida e impacto =====================
 * Animações por cima dos clipes de cada modelo (funciona nos dois tipos de esqueleto do jogo, mixamo e humanoide):
 * invocação (mão erguida e o livro na outra), canalização das ultimates (braços abertos, levita), estocada,
 * varrida e golpe de cima. Os ossos são apontados em espaço de mundo, então não depende dos eixos de cada rig.
 * Impacto em estilo anime: quadro de impacto (cores invertidas por um instante), raios e marcas queimadas no chão. */
const POSE_BONES={chest:['Chest','mixamorigSpine1'],upper:['UpperChest','mixamorigSpine2'],head:['Head','mixamorigHead'],
 lua:['LeftUpperArm','mixamorigLeftArm'],lla:['LeftLowerArm','mixamorigLeftForeArm'],lh:['LeftHand','mixamorigLeftHand'],
 rua:['RightUpperArm','mixamorigRightArm'],rla:['RightLowerArm','mixamorigRightForeArm'],rh:['RightHand','mixamorigRightHand']};
function poseRig(root){
 if(root.userData.poseRig!==undefined)return root.userData.poseRig;const r={};
 for(const k in POSE_BONES)for(const n of POSE_BONES[k]){const b=root.getObjectByName(n);if(b&&b.isBone){r[k]=b;break;}}
 root.userData.poseRig=r.lua&&r.lla&&r.lh&&r.rua&&r.rla&&r.rh&&r.chest?r:null;return root.userData.poseRig;
}
const poseJobs=[],_pq=new THREE.Quaternion(),_pq2=new THREE.Quaternion(),_pq3=new THREE.Quaternion(),_pv=new THREE.Vector3(),_pv2=new THREE.Vector3(),UPV=new THREE.Vector3(0,1,0);
function enemyPoseRoot(){const r=rigs[activeRig];return r&&r.model&&enemy.visible?r.model:null;}
function playPose(root,kind,dur,yawFn,lift){
 if(!root)return;const rig=poseRig(root);if(!rig)return;
 for(const j of poseJobs)if(j.root===root){j.dead=true;}
 poseJobs.push({root,rig,kind,dur,t:0,yawFn,lift:lift||0,base:null,dead:false});
}
function aimBone(b,child,dir,w){
 if(w<=0)return;b.updateWorldMatrix(true,false);child.updateWorldMatrix(false,false);
 const cur=_pv2.setFromMatrixPosition(child.matrixWorld).sub(_pv.setFromMatrixPosition(b.matrixWorld));if(cur.lengthSq()<1e-8)return;cur.normalize();
 _pq.setFromUnitVectors(cur,dir);_pq2.identity().slerp(_pq,w);
 b.getWorldQuaternion(_pq3);_pq2.multiply(_pq3);b.parent.getWorldQuaternion(_pq3).invert();b.quaternion.copy(_pq3.multiply(_pq2));b.updateMatrixWorld(true);
}
function turnBone(b,axis,ang){
 if(!b||!ang)return;b.updateWorldMatrix(true,false);_pq.setFromAxisAngle(axis,ang);b.getWorldQuaternion(_pq3);_pq.multiply(_pq3);
 b.parent.getWorldQuaternion(_pq3).invert();b.quaternion.copy(_pq3.multiply(_pq));b.updateMatrixWorld(true);
}
function updatePoses(dt){
 for(let i=poseJobs.length-1;i>=0;i--){
  const j=poseJobs[i];j.t+=dt;
  if(j.dead||j.t>j.dur||!j.root.parent){if(j.base!==null)j.root.position.y=j.base;poseJobs.splice(i,1);continue;}
  const R=j.rig,w=Math.min(1,j.t/.18)*Math.min(1,Math.max(0,(j.dur-j.t)/.3)),yaw=j.yawFn(),f=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),r=new THREE.Vector3().crossVectors(f,UPV).normalize();
  const D=(x,y,z)=>new THREE.Vector3().addScaledVector(f,x).addScaledVector(UPV,y).addScaledVector(r,z).normalize(),k=j.t/j.dur;
  if(j.kind==='cast'){turnBone(R.chest,r,.12*w);aimBone(R.rua,R.rla,D(.7,.6,.25),w);aimBone(R.rla,R.rh,D(.5,.85,.1),w);aimBone(R.lua,R.lla,D(.55,-.6,-.35),w*.8);aimBone(R.lla,R.lh,D(.9,.15,.3),w*.8);turnBone(R.head,r,.1*w);}
  else if(j.kind==='channel'){turnBone(R.chest,r,.22*w);aimBone(R.rua,R.rla,D(.15,.85,.5),w);aimBone(R.rla,R.rh,D(.1,.95,.3),w);aimBone(R.lua,R.lla,D(.15,.85,-.5),w);aimBone(R.lla,R.lh,D(.1,.95,-.3),w);turnBone(R.head,r,.2*w);}
  else if(j.kind==='thrust'){turnBone(R.chest,r,-.28*w);aimBone(R.rua,R.rla,D(1,.08,.15),w);aimBone(R.rla,R.rh,D(1,.05,0),w);aimBone(R.lua,R.lla,D(-.45,-.7,-.4),w*.7);}
  else if(j.kind==='slam'){const up=k<.45;turnBone(R.chest,r,(up?.2:-.38)*w);for(const [ua,la,hd,s] of [[R.rua,R.rla,R.rh,1],[R.lua,R.lla,R.lh,-1]]){aimBone(ua,la,up?D(.35,.9,.15*s):D(.85,-.5,.12*s),w);aimBone(la,hd,up?D(.2,1,.05*s):D(.9,-.4,0),w);}}
  else if(j.kind==='sweep'){const tw=(.7-1.6*Math.min(1,k*1.4))*w;turnBone(R.chest,UPV,tw);aimBone(R.rua,R.rla,D(.55,.05,.85),w);aimBone(R.rla,R.rh,D(.75,0,.6),w);}
  if(j.lift){if(j.base===null)j.base=j.root.position.y;j.root.position.y=j.base+j.lift*w*(1+.12*Math.sin(j.t*3));}
 }
}
/* ---------- Impacto ---------- */
let impactUntil=0;
function impactFrame(ms=70){renderer.domElement.style.filter='invert(1) contrast(1.6) saturate(0)';impactUntil=performance.now()+ms;setTimeout(()=>{if(performance.now()>=impactUntil-5)renderer.domElement.style.filter='';},ms);}
/** Raio do céu até o chão: núcleo branco e halo colorido, piscando (os "raios de destruição" do prompt). */
function lightning(x,z,color=0xbfd8ff,h=26){
 const y=fxGy(x,z),pts=[];let px=x,pz=z;for(let k=0;k<=12;k++){pts.push(new THREE.Vector3(px,y+h-k/12*h,pz));px=x+(Math.random()-.5)*1.6*(1-k/12);pz=z+(Math.random()-.5)*1.6*(1-k/12);}pts[12].set(x,y,z);
 const geo=new THREE.BufferGeometry().setFromPoints(pts),core=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:1,toneMapped:false})),glow=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.16,4,false),addMat(color,.8));
 const flash=glowSprite(color,1,6);flash.position.set(x,y+.5,z);scene.add(core,glow,flash);
 fxPush(function(t){const o=t<.32?(Math.random()>.35?1:.25):Math.max(0,1-(t-.32)*4);core.material.opacity=o;glow.material.opacity=.8*o;flash.material.opacity=o;if(t>.6){fxDispose(core);fxDispose(glow);fxDispose(flash);return false;}});
 scorch(x,z,1.4);
}
const scorchTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),gr=g.createRadialGradient(32,32,2,32,32,31);gr.addColorStop(0,'rgba(0,0,0,.9)');gr.addColorStop(.6,'rgba(10,4,4,.55)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.userData={keep:true};return t;})();
const scorchGeo=new THREE.PlaneGeometry(1,1);scorchGeo.userData.keep=true;let scorchCount=0;
/** Marca queimada que some devagar (no máximo 12 ao mesmo tempo). */
function scorch(x,z,r){if(scorchCount>=12)return;scorchCount++;const m=new THREE.Mesh(scorchGeo,new THREE.MeshBasicMaterial({map:scorchTex,transparent:true,opacity:.75,depthWrite:false}));m.rotation.x=-Math.PI/2;m.rotation.z=Math.random()*6;m.scale.set(r*2.2,r*2.2,1);m.position.set(x,fxGy(x,z)+.05,z);scene.add(m);
 fxPush(function(t){if(t>3)m.material.opacity=Math.max(0,.75*(1-(t-3)/2.5));if(t>5.5){scene.remove(m);m.material.dispose();scorchCount--;return false;}});}
/* ---------- Corrida do herói ---------- */
let sprintToggle=false;
function isSprinting(){return (keys.shift||sprintToggle)&&!defending;}
/** Converte o "Running" (feito no Blender a partir da corrida da Misteriosa) para o esqueleto do herói carregado:
 *  rotação de mundo de cada osso em relação ao repouso dos dois arquivos (os eixos internos dos ossos diferem). */
function bakeRunClip(src,srcClip,target){
 const Q=()=>new THREE.Quaternion(),tB={},sB={};target.traverse(o=>{if(o.isBone)tB[o.name]=o;});src.traverse(o=>{sB[o.name]=o;});
 const names=Object.keys(tB).filter(n=>sB[n]);const depth=o=>{let k=0;while(o.parent){k++;o=o.parent;}return k;};names.sort((a,b)=>depth(tB[a])-depth(tB[b]));
 const saved=names.map(n=>tB[n].quaternion.clone());let sk=null;target.traverse(o=>{if(!sk&&o.isSkinnedMesh)sk=o.skeleton;});if(sk)sk.pose();
 target.updateMatrixWorld(true);src.updateMatrixWorld(true);
 const tRoot=target.getWorldQuaternion(Q()).invert(),sRoot=src.getWorldQuaternion(Q()).invert(),T0={},S0={},restW=o=>tRoot.clone().multiply(o.getWorldQuaternion(Q()));
 for(const n of names){T0[n]=restW(tB[n]);S0[n]=sRoot.clone().multiply(sB[n].getWorldQuaternion(Q()));}
 const mx=new THREE.AnimationMixer(src);mx.clipAction(srcClip).play();const fps=30,N=Math.max(2,Math.round(srcClip.duration*fps)+1),times=[],vals={};for(const n of names)vals[n]=[];
 for(let i=0;i<N;i++){const t=Math.min(srcClip.duration,i/fps);times.push(t);mx.setTime(t);src.updateMatrixWorld(true);const W={};
  for(const n of names){const qt=sRoot.clone().multiply(sB[n].getWorldQuaternion(Q())).multiply(S0[n].clone().invert()).multiply(T0[n]);W[n]=qt;
   const par=tB[n].parent,pw=par&&W[par.name]?W[par.name]:(par?restW(par):Q()),loc=pw.clone().invert().multiply(qt);vals[n].push(loc.x,loc.y,loc.z,loc.w);}}
 mx.stopAllAction();names.forEach((n,i)=>tB[n].quaternion.copy(saved[i]));
 return new THREE.AnimationClip('Running',srcClip.duration,names.map(n=>new THREE.QuaternionKeyframeTrack(n+'.quaternion',times,vals[n])));
}
const BOSS_POWERS={
 valerio:{cd:8,run(){status.textContent='VALÉRIO: “Cada moeda é uma alma.” As moedas caem sobre você!';for(let i=0;i<4;i++){const a=Math.random()*6.28,r=1+Math.random()*4;spawnHazard({x:player.position.x+Math.cos(a)*r,z:player.position.z+Math.sin(a)*r,radius:1.7,delay:1+i*.3,damage:16,color:0xffc04a});}if(bossRageAnnounced)castBlackHole(enemy.position.x,enemy.position.z);}},
 vorgazhek:{cd:7.5,run(){status.textContent='VORGAZHEK estende o livro: as correntes da dívida caem sobre você!';const px=player.position.x,pz=player.position.z,vx=moveVX*.5,vz=moveVZ*.5;for(let i=0;i<3;i++)spawnHazard({x:px+vx*(i+1),z:pz+vz*(i+1),radius:2.1,delay:.9+i*.45,damage:18,color:0xd25a2a});}},
 zarkhael:{cd:8,run(){status.textContent="ZAR'KHAEL ergue a mão: o juízo cai em pilares!";for(let i=0;i<5;i++){const a=Math.random()*6.28,r=1+Math.random()*4.5;spawnHazard({x:player.position.x+Math.cos(a)*r,z:player.position.z+Math.sin(a)*r,radius:1.8,delay:1.1+i*.18,damage:20,color:0xffc04a});}}},
 veraxion:{cd:8.5,run(){status.textContent='VÉRAXION invoca o fogo abissal — saia das chamas!';const ex=enemy.position.x,ez=enemy.position.z,dx=player.position.x-ex,dz=player.position.z-ez,d=Math.max(1,Math.hypot(dx,dz));for(let i=0;i<5;i++){const k=(i+1)/5*Math.min(12,d+3);abyssFlame(ex+dx/d*k,ez+dz/d*k,.8+i*.22,1.9);}abyssFlame(player.position.x,player.position.z,1.6,2.6);worldAudio.abyss&&worldAudio.abyss();}},
 greed1:{cd:9,run(){castBlackHole(enemy.position.x+(player.position.x-enemy.position.x)*.5,enemy.position.z+(player.position.z-enemy.position.z)*.5);}},
 greed2:{cd:7.5,run(){if(Math.random()<.5)castBlackHole(player.position.x+Math.sin(cameraYaw)*2,player.position.z+Math.cos(cameraYaw)*2);else BOSS_POWERS.zarkhael.run();}},
 greed3:{cd:6.5,run(){castBlackHole(player.position.x,player.position.z);BOSS_POWERS.vorgazhek.run();}}
};
BOSS_POWERS.fallen1={cd:9,run(){castBlackHole(enemy.position.x,enemy.position.z);}};
BOSS_POWERS.fallen2=BOSS_POWERS.vorgazhek;BOSS_POWERS.fallen3=BOSS_POWERS.zarkhael;BOSS_POWERS.fallen4=BOSS_POWERS.veraxion;
let bossPowerCd=4;
function updateBossPowers(dt){
 const power=BOSS_POWERS[encounterProfile];
 if(bossUlt.kind){bossPowerCd=Math.max(bossPowerCd,2.5);return;}
 if(!power||!enemy.visible||!enemyAlive||!combatStepNow()||dialogueOpen||cineActive||playerHP<=0){bossPowerCd=Math.max(bossPowerCd,3);if(!enemy.visible||!enemyAlive)clearHazards();return;}
 bossPowerCd-=dt;if(bossPowerCd>0)return;
 const d=Math.hypot(enemy.position.x-player.position.x,enemy.position.z-player.position.z);if(d>14)return;
 power.run();bossPowerCd=power.cd*(bossRageAnnounced?.65:1);
}
// ---------- Habilidades de arma dos inimigos (Enemy3+): investida com aviso ----------
let foeSkillCd=5;
function updateFoeWeaponSkills(dt){
 if(!['zealot','hollow','arena'].includes(encounterProfile)||!enemy.visible||!enemyAlive||!combatStepNow()||dialogueOpen||cineActive)return;
 foeSkillCd-=dt;if(foeSkillCd>0)return;const d=Math.hypot(enemy.position.x-player.position.x,enemy.position.z-player.position.z);if(d<3||d>9)return;
 foeSkillCd=6+Math.random()*3;const tx=player.position.x,tz=player.position.z;
 spawnHazard({x:tx,z:tz,radius:1.7,delay:1,damage:encounterProfile==='hollow'?18:14,color:encounterProfile==='hollow'?0x7a8aff:0xff8a3a});
 status.textContent=encounterProfile==='hollow'?'O servo marca o chão com um eco sombrio — afaste-se!':'O zelote mira as cinzas do incenso — afaste-se!';
}
// Espadas celestes do Julgamento Celestial II: caem com aviso dourado e ferem só o inimigo.
const friendlyStrikes=[];
function spawnHazardFriendly(x,z,delay){const g=new THREE.Group();g.position.set(x,groundHeightAt(x,z),z);scene.add(g);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.7,.85,32),new THREE.MeshBasicMaterial({color:0xffe08a,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.07;g.add(ring);
 const blade=new THREE.Mesh(new THREE.ConeGeometry(.16,1.8,4),new THREE.MeshStandardMaterial({color:0xfff6e0,emissive:0xffd56a,emissiveIntensity:2,toneMapped:false}));blade.rotation.x=Math.PI;blade.position.y=14;g.add(blade);
 friendlyStrikes.push({g,blade,ring,x,z,delay,t:0,hit:false});}
function updateFriendlyStrikes(dt){for(let i=friendlyStrikes.length-1;i>=0;i--){const f=friendlyStrikes[i];f.t+=dt;const k=Math.min(1,f.t/f.delay);f.blade.position.y=14-13.1*k*k;
 if(!f.hit&&k>=1){f.hit=true;burstSparks(new THREE.Vector3(f.x,groundHeightAt(f.x,f.z)+.5,f.z),0xfff0b8);if(combatStepNow()&&enemy.visible&&enemyAlive&&Math.hypot(enemy.position.x-f.x,enemy.position.z-f.z)<1.4){enemyHP=Math.max(0,enemyHP-9);onEnemyDamaged(9,false);if(enemyHP===0){enemyAlive=false;const hud=document.getElementById('enemy-hud');if(hud)hud.style.display='none';if(!playEnemyAnimation('death',.06,true))enemyHasDeathClip=false;setTimeout(()=>advanceAfterEnemyDefeat(),850);}}}
 if(f.t>f.delay+.5){scene.remove(f.g);f.g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});friendlyStrikes.splice(i,1);}}}
let debugCameraOverride=null;
/* Ganchos de verificação automática: só existem com ?debug3d=1 (nada aparece para o jogador). */
if(new URLSearchParams(location.search).has('debug3d'))window.SevenSinsDebug3D={
 teleport(x,z,yaw){player.position.set(x,terrainHeightAt(x,z),z);if(Number.isFinite(yaw)){cameraYaw=yaw;}},
 view(yaw,pitch,dist){cameraYaw=yaw;cameraPitch=pitch;cameraDistance=dist;},
 state(){return{x:player.position.x,y:player.position.y,z:player.position.z,walkable:terrain3D.walkable(player.position.x,player.position.z),edge:terrain3D.boundaryDistance(player.position.x,player.position.z),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,terrain:window.SevenSinsTerrainReport,forest:window.SevenSinsForestReport,trees:treeSpecs.length,fog:scene.fog.color.getHexString(),fogFar:scene.fog.far,night:dayNightState.t,quest:questStep,coins,dialogueOpen,namePromptOpen,awakeningActive,hp:playerHP,enemy:{hp:enemyHP,visible:enemy.visible,alive:enemyAlive,x:+enemy.position.x.toFixed(1),z:+enemy.position.z.toFixed(1),y:+enemy.position.y.toFixed(2)},objective:(document.getElementById('quest-objective')||{}).textContent,audio:worldAudio.state,dim:{vs:vsOpen,battle:!!dimBattle,active:!!(dimBattle&&dimBattle.active),key:dimKey,sent:handoffSent,pull:!!portalPull,pt:portalPull&&portalPull.t,paused:gamePaused,gate:menuGate,voidMode:!!voidMode,hour:+gameClock.hour.toFixed(2),enemyHP,enemyMaxHP,hp:playerHP}};},
 setNight(on){setDayNightMode(on?'night':'day');dayNightState.t=dayNightState.target;applyDayNightVisual(dayNightState.t);},
 fly(from,to){debugCameraOverride=from?{from:new THREE.Vector3(...from),to:new THREE.Vector3(...to)}:null;},
 cam(){return camera.position.toArray().map(v=>+v.toFixed(2));},
 freeRoam(){awakeningActive=false;namePromptOpen=false;dialogueOpen=false;},
 cine(id){awakeningActive=false;if(id==='ceu')return prepareHeaven().then(()=>{menuGate=false;startHeavenCine();});startAwakeningCine();return Promise.resolve();},
 cineState(){const s=cineDirector.step;return{active:cineActive,scene:cineDirector.scene,index:cineDirector.index,type:s&&s.type,id:s&&(s.id||s.who),shot:cineShot,waitingTap:cineDirector.waitingTap,waitingAsk:cineDirector.waitingAsk,heavenSeen,questStep,playerName,coins,menuGate,actions:Object.keys(actions),cam:camera.position.toArray().map(v=>+v.toFixed(2)),head:cineHead.toArray().map(v=>+v.toFixed(2)),player:player.position.toArray().map(v=>+v.toFixed(2)),yaw:+playerYaw.toFixed(2)};},
 voidTest(){enterVoid();},
 setHearts(n){heartState.hearts=n;updateHeartsHud(true);},
 killPlayer(){playerInvulnerableUntil=0;playerHP=1;defending=false;damagePlayerFromEnemyAttack(999);},
 cullInfo(){return instanceCullers.map(c=>({n:c.n,count:c.mesh.count,verts:c.mesh.geometry.attributes.position.count,min:Math.sqrt(c.min2),max:Math.sqrt(c.r2)}));},
 triBreakdown(){const out=[];scene.traverse(o=>{if(!o.isMesh&&!o.isPoints)return;let v=true,q=o;while(q){if(!q.visible){v=false;break;}q=q.parent;}if(!v)return;const g=o.geometry;if(!g)return;const n=g.index?g.index.count/3:(g.attributes.position?g.attributes.position.count/3:0);const inst=o.isInstancedMesh?o.count:1;let path='',pp=o.parent,d=0;while(pp&&d<4){path+='<'+(pp.name||pp.type);pp=pp.parent;d++;}const wp=new THREE.Vector3();o.getWorldPosition(wp);out.push({gt:g.type,gp:g.parameters?JSON.stringify(g.parameters).slice(0,80):'',mc:o.material&&o.material.color?o.material.color.getHexString():'',name:(o.name||o.type)+path,dist:Math.round(Math.hypot(wp.x-player.position.x,wp.z-player.position.z)),mat:(o.material&&o.material.name)||'',tri:Math.round(n*inst),inst,skinned:!!o.isSkinnedMesh,verts:g.attributes.position?g.attributes.position.count:0});});out.sort((a,b)=>b.tri-a.tri);return{total:out.reduce((a,b)=>a+b.tri,0),count:out.length,top:out.slice(0,40)};},
 rinfo(){return{geo:renderer.info.memory.geometries,tex:renderer.info.memory.textures,prog:renderer.info.programs?renderer.info.programs.length:0,shadow:sunLight.castShadow,pr:renderer.getPixelRatio(),lights:scene.children.filter(o=>o.isLight).length};},
 startDim(key){const d=DIMENSIONS[key];startDimensionBattle(key,{hp:d.hp,returnTo:{x:player.position.x,z:player.position.z},onVictory(){},onAbort(){}});},
 vsGo(){const b=document.getElementById('vs-go');if(b&&!b.disabled)b.click();return b?b.textContent:null;},
 setHour(h){setGameHour(h);},
 killBoss(){if(enemy.visible){enemyHP=1;}},
  /** MOD 210 — força uma ultimate de chefe ('void' ou 'nova') e lê o estado dela. */
  ult(k){if(k==='void')startVoidUlt();else startSupernova();return bossUlt.kind;},
  /** MOD 211 — testa os poderes novos: 'arc' (Corte de Luz) e 'circle' (Espada do Círculo, no inimigo). */
  fx(k){if(k==='arc')spawnHolyProjectile('arc');else circleSword(enemy.visible?enemy.position.x:player.position.x+4,enemy.visible?enemy.position.z:player.position.z);return enemyHP;},
  ultState(){return{kind:bossUlt.kind,t:+bossUlt.t.toFixed(2),hp:playerHP,profile:encounterProfile,ehp:enemyHP,emax:enemyMaxHP,cam:+ultCam.w.toFixed(2)};},
  bossHp(f){if(enemy.visible)enemyHP=Math.max(1,Math.round(enemyMaxHP*f));},
 /** MOD 204 — leva o Ato I a uma etapa/sub-etapa e põe o jogador perto do gatilho dela. */
 act1(step,sub=0){
  if(cineActive)cineDirector.skip();clearPack();for(const c of hordeClones.splice(0))disposeClone(c);enemy.visible=false;
  awakeningActive=false;awakeningSeen=true;if(!playerName)playerName='Davi';
  questStep=step;act1Sub=sub;journeyEnemyIndex=step>2?ACT1.enemyTotal:0;childrenFreed=step>3||(step===3&&sub>0);wardenTaunted=step>5;wardenDefeated=step>5;act1Night=step===2||step===3;setGameHour(act1Night?21.5:9);
  if(coins<ACT1.bribe)coins=ACT1.purse;save3DProgress();updateQuestHud();syncAct1World();
  const go=(x,z)=>{if(inSewer)leaveSewer({x,z});player.position.set(x,terrainHeightAt(x,z),z);};
  if(step===1)go(sub?villageVendors[2].x+1.6:VILLAGE_CENTER.x+30,sub?villageVendors[2].z+1.6:VILLAGE_CENTER.z+4);
  else if(step===2||step===3)go(CAGE_CENTER.x+(step===2?2:2.4),CAGE_CENTER.z+(step===2?16:2.6));
  else if(step===4&&sub===0)go(MASSACRE_SPOT.x+4,MASSACRE_SPOT.z+20);
  else if(step===4&&sub===1){const d=sewerDoorFront();go(d.x+1,d.z+1);}
  else if(step>=8)go(AWAKE_SPOT.x,AWAKE_SPOT.z);
  else if(step>=4){if(!inSewer)enterSewer();const c=sewerLocal(step===4&&sub===2?SEWER.checkpoints.entrance:step===4?SEWER.checkpoints.feeding:step===5?SEWER.checkpoints.path:SEWER.checkpoints.portal);player.position.set(c.x,voidSpec.y,c.z);}
  return this.storyState();
 },
 act3(step,sub=0){
  if(cineActive)cineDirector.skip();clearPack();for(const c of hordeClones.splice(0))disposeClone(c);enemy.visible=false;awakeningActive=false;awakeningSeen=true;if(!playerName)playerName='Davi';
  if(inSewer)leaveSewer();if(inVolcano)leaveVolcano();if(act3Void)leaveAct3Void({x:SC.plaza.x,z:SC.plaza.z});guideRun=null;guidePinned=false;act3Raid=false;
  questStep=step;act1Sub=sub;act2Abyss=true;if(coins<40)coins=40;bishopsDefeated=Math.max(2,bishopsDefeated);valerioRewardClaimed=true;vorgazhekRewardClaimed=true;save3DProgress();updateQuestHud();if(!act2World)buildAct2World();syncAct2World();buildAct3World();if(act3World){act3World.sellerMet=false;act3World.distStarted=false;act3World.angelAsked=false;}syncAct3World();setGameHour(step===16&&sub>=2||step===17?22:11);
  const go=(x,z)=>player.position.set(x,terrainHeightAt(x,z),z);
  if(step===15)go(SC.seller.x-12,SC.seller.z);else if(step===16&&sub<=1)go(SC.plaza.x,SC.plaza.z+4);else if(step===16)go(SC.inn.door.x,SC.inn.door.z-3);
  else if(step===17&&sub<=1){enterAct3Void('estalagem',INN.spawn.cellar);}else if(step===17)go(SC.plaza.x,SC.plaza.z+8);
  else if(step===18&&sub<=1){go(SC.cave.x-4,SC.cave.z+4);}else if(step===18){enterAct3Void('distorcida',DISTORTED.spawn);}
  else if(step===19){go(SC.plaza.x+6,SC.plaza.z+6);}
  return this.storyState();
 },
 act4(step,sub=0){
  if(cineActive)cineDirector.skip();clearPack();for(const c of hordeClones.splice(0))disposeClone(c);enemy.visible=false;awakeningActive=false;awakeningSeen=true;if(!playerName)playerName='Davi';
  if(inSewer)leaveSewer();if(inVolcano)leaveVolcano();if(act3Void)leaveAct3Void({x:0,z:-60});if(inTower)leaveTower();rivalRun=null;if(act4Rival){disposeClone(act4Rival);act4Rival=null;}
  questStep=step;act1Sub=sub;act2Abyss=true;if(coins<40)coins=40;bishopsDefeated=Math.max(3,bishopsDefeated);valerioRewardClaimed=true;vorgazhekRewardClaimed=true;zarkhaelClaimed=true;save3DProgress();updateQuestHud();buildAct3World();buildAct4World();act4World.met=false;act4World.arrived=false;act4World.resumed=true;act4World.fell=false;syncAct4World();setGameHour(11);
  const go=(x,z)=>player.position.set(x,terrainHeightAt(x,z),z);
  if(step===21&&sub===0)go(-4,-140);else if(step===21&&sub===1)go(TOWER.rivalMeet.x,TOWER.rivalMeet.z+12);else if(step===21)go(TOWER.door.x,TOWER.door.z+8);
  else if(step===22){enterTower(Math.max(1,sub));}else if(step===23){enterTower(7);act4World.floorStarted=true;}else go(TOWER.view.x,TOWER.view.z+6);
  return this.storyState();
 },
 act5(sub=0){
  if(cineActive)cineDirector.skip();clearPack();for(const c of hordeClones.splice(0))disposeClone(c);enemy.visible=false;awakeningActive=false;awakeningSeen=true;if(!playerName)playerName='Davi';
  if(inSewer)leaveSewer();if(inVolcano)leaveVolcano();if(act3Void)leaveAct3Void({x:0,z:-60});if(inTower)leaveTower();sandraRun=null;if(act5Sandra){disposeClone(act5Sandra);act5Sandra=null;}act5Round=null;clearAuras();stopAlly();
  questStep=ACT5N.step;act1Sub=sub;act2Abyss=true;if(coins<40)coins=40;bishopsDefeated=Math.max(4,bishopsDefeated);save3DProgress();updateQuestHud();buildAct3World();buildAct4World();buildAct5World();act5World.journeyTold=false;act5World.arrived=false;setGameHour(11);
  const go=(x,z)=>player.position.set(x,terrainHeightAt(x,z),z);
  if(sub===0)go(-30,-236);else if(sub===1)go(COLOSSEUM.gate.x-4,COLOSSEUM.gate.z);else enterArena();
  return this.storyState();
 },
 act6(step,sub=0){
  if(cineActive)cineDirector.skip();clearPack();for(const c of hordeClones.splice(0))disposeClone(c);enemy.visible=false;awakeningActive=false;awakeningSeen=true;if(!playerName)playerName='Davi';
  if(inSewer)leaveSewer();if(inVolcano)leaveVolcano();if(act3Void)leaveAct3Void({x:0,z:-60});if(inTower)leaveTower();act6SandraRun=null;if(act6Sandra){disposeClone(act6Sandra);act6Sandra=null;}stopAllies6();act6Chaos=0;closeRematch();
  questStep=step;act1Sub=sub;act2Abyss=true;if(coins<40)coins=40;bishopsDefeated=Math.max(4,bishopsDefeated);save3DProgress();updateQuestHud();buildAct3World();buildAct4World();buildAct5World();buildAct6World();act6World.sandraArrived=false;act5World.fell=true;syncAct5World();setGameHour(11);
  const go=(x,z)=>player.position.set(x,terrainHeightAt(x,z),z);
  if(step===27&&sub===0)go(COLOSSEUM.gate.x-2,COLOSSEUM.gate.z+4);else if(step===27&&sub<=2)go(DESERT.offer.x,DESERT.offer.z-4);else if(step===27||step===28)go(DESERT.mystery.x-6,DESERT.mystery.z);else go(DESERT.offer.x,DESERT.offer.z-3);
  return this.storyState();
 },
 coat(on){coatOwned=true;setCoat(on!==false);return{coatOwned,coatOn,maxHP:playerMaxHP};},
 act2(step,sub=0){
  if(cineActive)cineDirector.skip();clearPack();for(const c of hordeClones.splice(0))disposeClone(c);enemy.visible=false;awakeningActive=false;awakeningSeen=true;if(!playerName)playerName='Davi';
  if(inSewer)leaveSewer();if(inVolcano)leaveVolcano();
  questStep=step;act1Sub=sub;act2Abyss=step>=15;if(coins<20)coins=20;bishopsDefeated=Math.max(1,bishopsDefeated);valerioRewardClaimed=true;save3DProgress();updateQuestHud();gorgeGate.sync();if(!act2World)buildAct2World();syncAct2World();setGameHour(14);
  const go=(x,z)=>player.position.set(x,terrainHeightAt(x,z),z),D=DISTRICT_SPOTS;
  if(step===9)go(D.gate.x+30,D.gate.z+2);else if(step===10&&sub===0)go(D.ambush.x+9,D.ambush.z);else if(step===10)go(D.rival.x+11,D.rival.z);else if(step===11)go(D.volcanoGate.x+16,D.volcanoGate.z);
  else if(step===12||step===13){enterVolcano();if(step===13){const c=volcanoLocal(VOLCANO.portal);player.position.set(c.x,voidSpec.y,c.z+5);}}
  else if(step===14)go(D.plaza.x+26,D.plaza.z);
  return this.storyState();
 },
 storyState(){const st=cineDirector.step;return{q:questStep,sub:act1Sub,scene:cineActive?cineDirector.scene:null,step:st&&(st.id||st.type),waitingTap:cineDirector.waitingTap,pack:pack?{i:pack.index,n:pack.spots.length,active:pack.active,profile:pack.profile}:null,enemy:enemy.visible?{hp:enemyHP,profile:encounterProfile}:null,inSewer,night:act1Night,x:+player.position.x.toFixed(1),z:+player.position.z.toFixed(1),label:act1TalkLabel()||act2StoryLabel()||act3Label()||act4Label()||act6Label(),form:act6Form,dimKey:dimBattle?dimBattle.key:null,sandra6:act6Sandra?[+act6Sandra.holder.position.x.toFixed(1),+act6Sandra.holder.position.z.toFixed(1)]:null,inTower,scroll:scrollOwned,round:act5Round?act5Round.n:null,sandra:act5Sandra?[+act5Sandra.holder.position.x.toFixed(1),+act5Sandra.holder.position.z.toFixed(1)]:null,rv:act4Rival?[+act4Rival.holder.position.x.toFixed(1),+act4Rival.holder.position.z.toFixed(1)]:null,inVolcano,act3Void,coat:[coatOwned,coatOn],hp:playerHP,coins,cam:camera.position.toArray().map(v=>+v.toFixed(1)),guide:guide.position.toArray().map(v=>+v.toFixed(1)),gv:guide.visible};},
 playAfterValerio(){afterValerioStory();},
 tapStory(){return cineDirector.tap();},
 speed(k){debugDtScale=Math.max(.1,Math.min(8,+k||1));return debugDtScale;},
 skipStory(){if(cineActive)cineDirector.skip();},
 nearBoss(){if(!enemy.visible)return -1;const dx=player.position.x-enemy.position.x,dz=player.position.z-enemy.position.z,l=Math.hypot(dx,dz)||1;player.position.x=enemy.position.x+dx/l*1.5;player.position.z=enemy.position.z+dz/l*1.5;return l;},
 hurtPlayer(n){playerHP=Math.max(1,playerHP-(n||10));updatePlayerHud();},
 power(){bossPowerCd=0;foeSkillCd=0;kitState.cds={};kitState.t=0;},
  /** MOD 212 — força um poder do kit do inimigo atual: 's1','s2','s3','sw' ou 'ult'. */
  kitMove(id){const k=kitFor(encounterProfile);if(!k||!enemy.visible)return null;if(id==='ult'){const u=ultimateFor(encounterProfile);if(u.kind==='void')startVoidUlt();else if(u.kind==='nova')startSupernova();else startKitUlt(u.kind);return u.kind;}const m=id==='sw'?k.sword:k.skills.find(s=>s.id===id);runFoeMove(powerStats(encounterProfile,m),k);return m.name;},
  god(){playerInvulnerableUntil=performance.now()+1e9;},
  sprint(on){sprintToggle=!!on;return{run:!!actions.run,speed:+Math.hypot(moveVX,moveVZ).toFixed(2)};},
  pose(kind,who){playPose(who==='enemy'?enemyPoseRoot():model,kind,2,who==='enemy'?foeYaw:()=>playerYaw,kind==='channel'?.5:0);return poseJobs.length;},
  skills(){if(!skillSet)skillSet=new Set();for(const k of ['magic','magic2','magic3','ultimate'])skillSet.add(k);holyCooldowns.magic=holyCooldowns.magic2=holyCooldowns.magic3=holyCooldowns.ultimate=0;playerMana=999;return [...skillSet];},
  cast(k){castHolyMagic(k);return holyProjectiles.length;},
  kitInfo(){return{profile:encounterProfile,tier:tierOf(encounterProfile),cds:kitState.cds,ult:bossUlt.kind,hp:playerHP,ehp:enemyHP,fx:ultFx.length,slow:performance.now()<foeSlowUntil,inv:performance.now()<foeInvertUntil};},
 hazardCount(){return{hazards:hazards.length,blackHole:blackHole.active,combo:comboCount};},
 shop(){shopVisited=true;openShop();},
 grant(xp,gold,step){playerXp+=xp||0;coins+=gold||0;if(step!==undefined)questStep=step;applyLevelStats(true);updateQuestHud();},
 stats(){return{xp:playerXp,level:playerLevel(),owned:[...ownedItems],sword:equippedSword,coins,maxHP:playerMaxHP};},
 teo(){const t=villageVendors[2];return{x:t.x,z:t.z};},
 face(){if(enemy.visible){playerYaw=Math.atan2(enemy.position.x-player.position.x,enemy.position.z-player.position.z);player.rotation.y=playerYaw;}},
 target(){const m=questMarker.position;return questMarker.visible===false?null:{x:m.x,z:m.z};}
};

/* MOD 202 — braseiros nos pontos onde há luta provável. Quatro draw calls instanciados no total e UMA luz
   quente que acompanha o braseiro mais próximo (luzes por braseiro custariam caro no celular). */
const BRAZIER_SPOTS=(()=>{
 const list=[],add=(x,z)=>list.push({x,z});
 for(const e of JOURNEY_ENEMIES)add(e.x+3.4,e.z+1.2);
 for(const e of MOUNTAIN_SENTRIES)add(e.x-3.2,e.z+2.2);
 add(WARDEN_SPOT.x+3.6,WARDEN_SPOT.z+3);add(CAGE_CENTER.x+5.2,CAGE_CENTER.z+1.5);add(CAGE_CENTER.x-5.2,CAGE_CENTER.z+1.5);
 add(PORTAL.x-5,PORTAL.z+5);add(PORTAL.x+5,PORTAL.z+5);add(CLEARING.x+4,CLEARING.z);
 add(GUIDE_ACT2_SPOT.x+4,GUIDE_ACT2_SPOT.z+3);
 for(const [dx,dz] of [[-12,-8],[12,-8],[0,16],[-14,12],[14,12]])add(ALTAR_VALLEY.cx+dx,ALTAR_VALLEY.cz+dz);
 for(const [dx,dz] of [[-10,-6],[10,-6],[0,14],[-14,10],[14,10]])add(SERRA.cx+dx,SERRA.cz+dz);
 return list;
})();
const brazierBowl=new THREE.InstancedMesh(new THREE.CylinderGeometry(.62,.34,.4,10,1,true),new THREE.MeshStandardMaterial({color:0x2a2420,roughness:.7,metalness:.55,side:THREE.DoubleSide}),BRAZIER_SPOTS.length);
const brazierPole=new THREE.InstancedMesh(new THREE.CylinderGeometry(.07,.12,1.25,6),new THREE.MeshStandardMaterial({color:0x3a2f27,roughness:.8,metalness:.4}),BRAZIER_SPOTS.length);
const flameMat=new THREE.MeshBasicMaterial({color:0xff8a2c,transparent:true,opacity:.92,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
const brazierFlame=new THREE.InstancedMesh(new THREE.LatheGeometry([[0,0],[.3,.1],[.4,.35],[.33,.7],[.17,1.1],[0,1.55]].map(([x,y])=>new THREE.Vector2(x,y)),9),flameMat,BRAZIER_SPOTS.length);
const brazierCore=new THREE.InstancedMesh(new THREE.LatheGeometry([[0,0],[.18,.08],[.22,.25],[.15,.5],[0,.85]].map(([x,y])=>new THREE.Vector2(x,y)),8),new THREE.MeshBasicMaterial({color:0xffe08a,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}),BRAZIER_SPOTS.length);
for(const m of [brazierBowl,brazierPole,brazierFlame,brazierCore]){m.frustumCulled=false;scene.add(m);}
const brazierLight=new THREE.PointLight(0xff9a45,0,18,1.6);brazierLight.castShadow=false;scene.add(brazierLight);
// MOD 210 — luz da ultimate criada uma vez (intensidade 0): acender no golpe não recompila shaders.
const ultLight=new THREE.PointLight(0xffe0a0,0,30,1.2);ultLight.castShadow=false;scene.add(ultLight);
const _bm=new THREE.Matrix4(),_bq=new THREE.Quaternion(),_bs=new THREE.Vector3(),_bp=new THREE.Vector3();
const brazierGround=BRAZIER_SPOTS.map(b=>terrainHeightAt(b.x,b.z));
BRAZIER_SPOTS.forEach((b,i)=>{const y=brazierGround[i];
 _bm.compose(_bp.set(b.x,y+.62,b.z),_bq.identity(),_bs.set(1,1,1));brazierPole.setMatrixAt(i,_bm);
 _bm.compose(_bp.set(b.x,y+1.32,b.z),_bq.identity(),_bs.set(1,1,1));brazierBowl.setMatrixAt(i,_bm);});
brazierPole.instanceMatrix.needsUpdate=true;brazierBowl.instanceMatrix.needsUpdate=true;
let brazierFrame=0;
function updateBraziers(dt){
 const px=player.position.x,pz=player.position.z,t=performance.now()*.001,night=dayNightState.t;
 let best=-1,bd=1e9;
 BRAZIER_SPOTS.forEach((b,i)=>{const d=(b.x-px)*(b.x-px)+(b.z-pz)*(b.z-pz);if(d<bd){bd=d;best=i;}});
 const near=Math.sqrt(bd);
 if((brazierFrame++&1)===0)BRAZIER_SPOTS.forEach((b,i)=>{
  const dx=b.x-px,dz=b.z-pz;if(dx*dx+dz*dz>90*90){_bm.makeScale(0,0,0);brazierFlame.setMatrixAt(i,_bm);brazierCore.setMatrixAt(i,_bm);return;}
  const f=1+Math.sin(t*11+i*1.7)*.12+Math.sin(t*23+i)*.08,y=brazierGround[i]+1.52;
  _bm.compose(_bp.set(b.x,y-.1,b.z),_bq.identity(),_bs.set(1+Math.sin(t*9+i)*.07,f,1+Math.cos(t*8+i)*.07));brazierFlame.setMatrixAt(i,_bm);
  _bm.compose(_bp.set(b.x,y-.05,b.z),_bq.identity(),_bs.set(1,f*1.1,1));brazierCore.setMatrixAt(i,_bm);});
 brazierFlame.instanceMatrix.needsUpdate=true;brazierCore.instanceMatrix.needsUpdate=true;
 if(best>=0&&near<30){const b=BRAZIER_SPOTS[best];brazierLight.position.set(b.x,brazierGround[best]+2.1,b.z);
  brazierLight.intensity=(.7+night*2.6)*(1+Math.sin(t*13+best)*.07)*THREE.MathUtils.smoothstep(30-near,0,12);}
 else brazierLight.intensity=0;
}
animate();
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();applyGraphics3D(graphics3DMode,graphics3DScale);}
addEventListener('resize',resize);


/* MOD 200 — reinício da Galáxia 1 fica dentro do painel Configurações. */
(function addGalaxy1ResetSetting(){
  if(document.getElementById('galaxy1-reset-button')) return;
  const panel=document.getElementById('graphics-panel-3d');
  if(!panel) return;
  const box=document.createElement('div');
  box.className='audio-settings galaxy-reset-settings';
  box.innerHTML='<h2>Progresso da campanha</h2>'+
    '<p style="margin:0 0 10px;opacity:.82;font-size:13px;line-height:1.45">Começar a Galáxia 1 novamente, apagando missões, chefes, moedas, itens e descobertas salvos neste navegador.</p>';
  const button=document.createElement('button');
  button.id='galaxy1-reset-button';
  button.type='button';
  button.textContent='Reiniciar progresso da Galáxia 1';
  button.setAttribute('aria-label','Reiniciar progresso da Galáxia 1');
  button.style.cssText='display:block;width:100%;padding:12px 14px;border:1px solid rgba(255,130,130,.42);border-radius:10px;background:rgba(120,35,45,.28);color:inherit;font:600 14px/1.3 system-ui,sans-serif;touch-action:manipulation;';
  button.addEventListener('click',function(){
    if(!window.confirm('Tem certeza? Todo o progresso da campanha da Galáxia 1 neste navegador será reiniciado. As configurações gráficas, FPS e dia/noite serão preservadas.')) return;
    try{
      Object.keys(localStorage).forEach(function(key){
        if(/^sevenSins3DCampaignV[1-6]$/.test(key) ||
           (key.indexOf('seven-sins-')===0 && !/^seven-sins-3d-(daynight|fps|graphics|settings)$/.test(key))){
          localStorage.removeItem(key);
        }
      });
    }catch(e){}
    window.location.reload();
  });
  box.appendChild(button);
  const close=panel.querySelector('.panel-close');
  panel.insertBefore(box,close||null);
})();