import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned, retargetClip } from 'three/addons/utils/SkeletonUtils.js';
import { SKILLS, SKILL_ORDER, MANA, unlockedSkills, newlyUnlocked, canCast, regenMana, manaFromHit, cooldownFraction } from './skills3d.js';
import { createWorldAudio } from './audio3d.js';
import { showGalaxyScreen } from './galaxies3d.js';
import { iconSvg } from './shop-icons3d.js';
import { DIMENSIONS, dimensionForProfile, arenaSpec, vsCard, arenaSpots } from './dimensions3d.js';
import { buildDimensionArena, buildDimensionPortal } from './dimension-arenas3d.js';
import { SIDE_QUESTS, createSideState, refreshSide, acceptSide, collectSide, turnInSide, questForGiver, activeSideLines } from './sidequests3d.js';
import { HEARTS, normalizeHearts, tickHearts, loseHeart, msToNextHeart, canChallengeBishop, formatTimer } from './hearts3d.js';
import { levelFromXp, levelProgress, statsForLevel, XP_REWARDS, SHOP_SECTORS, SHOP_ITEMS, SWORDS, shopStatus, buyItem, ACHIEVEMENTS, achievementState, BESTIARY, bestiaryEntry } from './progression3d.js';
import { MAP_STORE_KEY, MAP_BOUNDS, FOG_CELLS, MAP_POIS, WAYSTONES, createMapState, serializeMapState, revealAround, isRevealed, discoverPois, canFastTravel } from './map3d.js';
import { ACT2, DISTRICT, DISTRICT_PASS, PASS_RADIUS, DISTRICT_SPOTS, DISTRICT_CANAL, act2Presentation, act2Started, collectLedger, afterVorgazhek, bossPhase, act2GuideLines, familyLines, ledgerLines, vorgazhekIntroLines, vorgazhekRageLine, vorgazhekDefeatLines } from './act2-flow.js';
import { ACT3, ACT4, LATE_ACTS, EXTRA_REGIONS, EXTRA_PASSES, ALTAR_VALLEY, SERRA, stepDef, latePresentation, lateActFor, collectItem, bossRewardOnce, COLISEUM, coliseumPayout } from './acts34-flow.js';
import { FINALE, FINAL_PORTAL, VOID, GAUNTLET, SIN_FORMS, finaleTalkLines, gauntletIntroLines, sinIntroLines, epilogueLines, finaleAfterDeath, nextGauntlet, nextSinForm, finaleReward } from './finale-flow.js';
import { createTerrain, buildTerrainArrays, colorTerrain, scatterForest, fbm } from './world3d-terrain.js';
import { ACT1, sanitizePlayerName, migrateProgress, questPresentation, guideAwakeningLines, guideAfterNameLines, informantPoorLines, informantLines, captorTauntLines, freeChildrenLines, reunionLines, wardenTauntLines, portalBlockedLines, portalLines, afterEnemyDefeated, afterMountainDefeat, afterWardenDefeat, valerioHandoffPlan, afterValerioVictory, valerioVictoryLines } from './act1-flow.js';

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
const CLEARING={x:0,z:-29},PORTAL={x:44,z:-119},JOURNEY_ENEMIES=[{x:0,z:-59},{x:2.4,z:-79},{x:15,z:-99}];
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
const VILLAGE_CENTER={x:-12.2,z:-44.5},VILLAGE_CLEAR_RADIUS=14.2,SECRET_RUIN_SPOT={x:-18.5,z:-52};
// Lago da mata: ponto de interesse visível da trilha, com margem rasa caminhável e fundo bloqueado.
const FOREST_POND={x:-27,z:-88,r:11.5,depth:2.4,level:-.42};
const mainTrail=[[0,14],[0,4],[.5,-6],[-1.8,-17],[0,-29],[2.2,-43],[-1.2,-59],[-2,-76],[5,-91],[15,-99],[27,-108],[44,-119],[46,-132],[45,-140]];
const villageTrail=[[2.2,-43],[0,-41],[-4.6,-41.4],[-8.7,-43.3],[-12.2,-44.5]];
// Mod 188 — caminho da vila até a Loja Central (oeste da praça).
const SHOP_SPOT={x:-33,z:-45},shopTrail=[[-12.2,-44.5],[-18,-45.6],[-24,-45.2],[-27.4,-45]];
// Mod 195 — trilha da vila até o Distrito da Ferrugem (Ato II), pela Garganta da Dívida.
// Mod 196 — trilhas do Vale do Altar (leste) e da Serra sem Ecos (sul).
const altarTrail=[[2.2,-43],[20,-38],[44,-33],[60,-32]].concat(EXTRA_PASSES[0],[[132,-38],[150,-40]]),serraTrail=[[-2,-76],[-6,-110],[-4,-132]].concat(EXTRA_PASSES[1],[[-34,-226]]);
const districtTrail=[[-27.4,-45],[-40,-49],[-56,-56]].concat(DISTRICT_PASS,[[-130,-62],[DISTRICT_SPOTS.plaza.x,DISTRICT_SPOTS.plaza.z]]);
const terrain3D=createTerrain({
 hill:hillHeightAt,
 keepouts:[{x:0,z:4,r:11,fade:8},{x:3.3,z:-5.4,r:5},{x:CLEARING.x,z:CLEARING.z,r:10,fade:7},{x:VILLAGE_CENTER.x,z:VILLAGE_CENTER.z,r:VILLAGE_CLEAR_RADIUS+3,fade:8},{x:SECRET_RUIN_SPOT.x,z:SECRET_RUIN_SPOT.z,r:5},{x:PORTAL.x,z:PORTAL.z,r:12,fade:8},{x:0.1,z:-56.1,r:6},{x:SHOP_SPOT.x,z:SHOP_SPOT.z,r:9,fade:6},{x:DISTRICT_SPOTS.plaza.x,z:DISTRICT_SPOTS.plaza.z,r:22,fade:8},{x:ALTAR_VALLEY.cx,z:ALTAR_VALLEY.cz,r:16,fade:8},{x:SERRA.cx,z:SERRA.cz-8,r:16,fade:8},{x:FOREST_POND.x,z:FOREST_POND.z,r:FOREST_POND.r*1.3,fade:6}],
 ponds:[FOREST_POND],
 extraAreas:[DISTRICT,...EXTRA_REGIONS],passes:[{points:DISTRICT_PASS,r:PASS_RADIUS},...EXTRA_PASSES.map(points=>({points,r:PASS_RADIUS}))],channels:[{points:DISTRICT_CANAL,width:3.2,depth:1.8,level:-.6}],
 paths:[{points:mainTrail,r:5.5,fade:6},{points:villageTrail,r:4.5,fade:5},{points:shopTrail,r:4,fade:5},{points:districtTrail,r:4,fade:5},{points:altarTrail,r:4,fade:5},{points:serraTrail,r:4,fade:5}]
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
const trailRoutes=[{points:mainTrail,width:5.2},{points:villageTrail,width:4.0},{points:shopTrail,width:3.4},{points:districtTrail,width:3.6},{points:altarTrail,width:3.4},{points:serraTrail,width:3.4}];
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
 if(Math.hypot(x-SECRET_RUIN_SPOT.x,z-SECRET_RUIN_SPOT.z)<4.4||Math.hypot(x-PORTAL.x,z-PORTAL.z)<9.5||Math.hypot(x-.1,z+56.1)<5.2)return false;
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
const cabin=new THREE.Group();cabin.position.set(VILLAGE_CENTER.x-3.15,0,VILLAGE_CENTER.z-2.2);villageGroup.add(cabin);
addVillageBox(cabin,new THREE.BoxGeometry(1,1,1),woodMat,0,1.05,0,3.5,2.1,3.15);
const cabinRoof=new THREE.Mesh(new THREE.ConeGeometry(2.75,1.55,4),roofMat);cabinRoof.position.set(0,2.83,0);cabinRoof.rotation.y=Math.PI/4;cabinRoof.castShadow=true;cabin.add(cabinRoof);
addVillageBox(cabin,new THREE.BoxGeometry(.72,1.35,.08),doorMat,0,.675,1.62,1,1,1);
for(const side of [-1,1])addVillageBox(cabin,new THREE.BoxGeometry(.48,.48,.08),fabricGoldMat,side*1.05,1.3,1.62,1,1,1);
marketObstacles.push({x:cabin.position.x,z:cabin.position.z,shape:'box',halfX:1.95,halfZ:1.95,height:3.6});
function makeVillageHouse(x,z,scale,roofMaterial){const house=new THREE.Group();house.position.set(x,0,z);villageGroup.add(house);const width=3.5*scale,depth=2.8*scale,height=2.15*scale;const body=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),woodMat);body.position.y=height*.5;body.receiveShadow=true;house.add(body);const roof=new THREE.Mesh(new THREE.ConeGeometry(width*.82,1.45*scale,4),roofMaterial);roof.position.y=height+.68*scale;roof.rotation.y=Math.PI/4;roof.castShadow=true;house.add(roof);const door=new THREE.Mesh(new THREE.BoxGeometry(.7*scale,1.25*scale,.08),doorMat);door.position.set(0,.625*scale,depth*.5+.035);house.add(door);for(const side of [-1,1]){const window=new THREE.Mesh(new THREE.BoxGeometry(.48*scale,.43*scale,.07),windowMat);window.position.set(side*width*.27,1.25*scale,depth*.5+.04);house.add(window);}marketObstacles.push({x,z,shape:'box',halfX:width*.57,halfZ:depth*.57,height:height+1.6*scale});return house;}
makeVillageHouse(VILLAGE_CENTER.x-7.3,VILLAGE_CENTER.z-4.1,.96,roofMat);
makeVillageHouse(VILLAGE_CENTER.x+.9,VILLAGE_CENTER.z+9.1,.88,fabricGreenMat);
// Pequenas casas periféricas: ampliam a vila sem espalhar meshes pesadas pelo mapa.
makeVillageHouse(VILLAGE_CENTER.x-10.8,VILLAGE_CENTER.z+3.6,.82,roofMat);
makeVillageHouse(VILLAGE_CENTER.x+8.9,VILLAGE_CENTER.z-6.9,.78,fabricGreenMat);
makeVillageHouse(VILLAGE_CENTER.x+2.2,VILLAGE_CENTER.z-11.4,.72,roofMat);
function makeMarketSign(label,color){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;const ctx=canvas.getContext('2d');ctx.fillStyle='#3b2d1e';ctx.fillRect(0,0,512,160);ctx.strokeStyle='#d4b778';ctx.lineWidth=9;ctx.strokeRect(8,8,496,144);ctx.fillStyle=color;ctx.font='bold '+Math.min(72,Math.floor(430/label.length*1.35))+'px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,256,82);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(1.55,.48),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));}
const fruitGeo=new THREE.SphereGeometry(.16,8,6),fruitMats=[0xc84232,0xe5a63b,0x6e9c47,0xd8c64a,0x7e4c74].map(color=>mat(color));
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
 {name:'Lia · Frutas',shortName:'FRUTAS',x:marketStalls[0].x,z:marketStalls[0].z+1.65,yaw:Math.PI,greeting:'Frutas da clareira. Hoje o movimento está baixo — as mães não descem mais até a trilha.',hints:['O Anjo-Guia espera no começo da mata. Fale com ele antes de perguntar por aí.','Téo, nas provisões, é quem ouve os boatos. Eu só sei que faltam crianças.','Não vá para a mata sozinho de noite. Tem gente que cobra pedágio em vidas.','Se as trouxer de volta, a vila vai lembrar o seu nome.','O portal no alto não é mercado. Ainda bem.']},
 {name:'Mara · Ervas',shortName:'ERVAS',x:marketStalls[1].x,z:marketStalls[1].z+1.55,yaw:Math.PI*.72,greeting:'Ervas para febre e para medo. Ultimamente vendem mais do segundo.',hints:['O guia celestial está na entrada. Não atravesse a vila sem ouvi-lo.','Téo finge que não sabe. Uma oferta pequena costuma desatar a língua dele.','A noite ficou comprida. As gaiolas, se existirem, estão trilha adentro.','Traga as crianças pela estrada da vila. Eu preparo chá, não sermão.','Valério ainda não desceu. Isso não é alívio.']},
 {name:'Téo · Provisões',shortName:'PROVISÕES',x:marketStalls[2].x,z:marketStalls[2].z+1.65,yaw:Math.PI,greeting:'Provisões, notícias e silêncio. O silêncio é o que sai mais caro.',hints:['Fale primeiro com o Anjo-Guia. Eu não negocio com desconhecidos sem nome.','Se veio por respostas, diga logo. Eu cobro o risco, não a alma.','A trilha de noite não perdoa. Eles são três. Não tente ser herói para plateia.','Se voltar com elas, não me agradeça em público.','O mapa que restou sobe. Eu não subo com você.']},
 {name:'Nara · Artesanato',shortName:'ARTESANATO',x:marketStalls[3].x,z:marketStalls[3].z+1.55,yaw:Math.PI,greeting:'Faço fechaduras honestas. As gaiolas da mata não são trabalho meu.',hints:['O Anjo-Guia conhece o nome das coisas. Comece por ele.','Téo vende farinha e medo. Os dois estão na banca de provisões.','Se ouvir unhas na trilha, não é vento.','Quando as crianças passarem por aqui, eu baixo o preço do pão.','A montanha ficou com o resto da história. Eu fico com a vila.']}
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
 const blocked=(x,z)=>{if(!dryGround(x,z))return true;if(Math.abs(x-DISTRICT.cx)<DISTRICT.hx-2&&Math.abs(z-DISTRICT.cz)<DISTRICT.hz-2&&((x*7.3+z*3.1)%5+5)%5>1.2)return true;if(Math.hypot(x,z-4)<5.8||Math.hypot(x-CLEARING.x,z-CLEARING.z)<6.8||Math.hypot(x-VILLAGE_CENTER.x,z-VILLAGE_CENTER.z)<VILLAGE_CLEAR_RADIUS+1.6)return true;if(trailRoutes.some(route=>closeToPolyline(x,z,route.points,route.width*.5+.6)))return true;if(treeObstacles.some(o=>Math.abs(x-o.x)<o.radius+.5&&Math.hypot(x-o.x,z-o.z)<o.radius+.5))return true;if(rockObstacles.some(o=>Math.abs(x-o.x)<o.radius+.32&&Math.hypot(x-o.x,z-o.z)<o.radius+.32))return true;return marketObstacles.some(o=>o.shape==='box'?Math.abs(x-o.x)<o.halfX+.35&&Math.abs(z-o.z)<o.halfZ+.35:Math.hypot(x-o.x,z-o.z)<o.radius+.35);};
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
 const now=performance.now();if(now<attackCooldown||dialogueOpen||namePromptOpen||awakeningActive||portalPull)return;
 // MOD 187 — o golpe sai sempre (treino, exploração); o dano só é resolvido quando há um inimigo ativo.
 if(defending)setDefending(false);
 const engaged=combatStepNow()&&enemy.visible&&enemyAlive;if(engaged)assistAimAtEnemy();else if(cameraDistance<1.05){playerYaw=cameraYaw+Math.PI;player.rotation.y=playerYaw;}
 if(!model||!mixer||!attackClips.length){status.textContent='Não foi encontrado um clipe de ataque válido no Protagonista.glb.';return;}
 const attackClip=attackClips[attackClipIndex++%attackClips.length],duration=Number(attackClip&&attackClip.duration);
 if(!validAttackClip(attackClip)||!Number.isFinite(duration)||duration<=0){status.textContent='O ataque não tem uma animação válida; nenhum dano foi aplicado.';return;}
 attackCooldown=now+560;worldAudio.swing();{const step=nextComboStep(now);if(step===3)showCombatCallout('COMBO ×3');}const attackAction=mixer.clipAction(attackClip);
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
 {const crit=Math.random()<.12,dmg=Math.round(SWORDS[equippedSword].damage*(1+statsForLevel(playerLevel()).damageBonus)*(crit?1.6:1)*comboMultiplier());enemyHP=Math.max(0,enemyHP-dmg);onEnemyDamaged(dmg,crit);}({mana:playerMana,lastGainAt:manaHitAt}=manaFromHit(playerMana,manaHitAt,performance.now()));worldAudio.hit();enemyHitFlash=.2;enemyKnockback=comboCount===3?.9:.42;enemyKnockbackX=dx/(distance||1);enemyKnockbackZ=dz/(distance||1);
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
 const now=performance.now();if(playerHP<=0||now<playerInvulnerableUntil)return false;
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
 if(!enemy.visible||!enemyAlive||!combatStepNow()||dialogueOpen||playerHP<=0){if(enemyCurrentRole!=='idle'&&enemyActions.idle){enemyAttackResolved=true;enemyAttackElapsed=enemyAttackDuration;enemyDashRemaining=0;enemyCastResolved=true;wardenFanPending=false;playEnemyAnimation('idle',.1);}return;}
 if(enemyKnockback>0){const step=Math.min(enemyKnockback,dt*2.5),nextX=THREE.MathUtils.clamp(enemy.position.x+enemyKnockbackX*step,-400,400),nextZ=THREE.MathUtils.clamp(enemy.position.z+enemyKnockbackZ*step,-400,400);if(!enemyBlockedAt(nextX,enemy.position.z))enemy.position.x=nextX;if(!enemyBlockedAt(enemy.position.x,nextZ))enemy.position.z=nextZ;enemyKnockback=Math.max(0,enemyKnockback-step);return;}
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
  const nx=THREE.MathUtils.clamp(enemy.position.x+enemyDashDirectionX*step,-400,400),nz=THREE.MathUtils.clamp(enemy.position.z+enemyDashDirectionZ*step,-400,400);
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
 const nextX=THREE.MathUtils.clamp(enemy.position.x+dx/(distance||1)*step,-400,400),nextZ=THREE.MathUtils.clamp(enemy.position.z+dz/(distance||1)*step,-400,400);let moved=false;
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
const portalGroup=new THREE.Group();scene.add(portalGroup);portalGroup.position.set(PORTAL.x,groundHeightAt(PORTAL.x,PORTAL.z),PORTAL.z);portalGroup.visible=true;
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
function applyLevelStats(heal){const st=statsForLevel(playerLevel());const was=playerMaxHP;playerMaxHP=st.maxHP;if(heal)playerHP=playerMaxHP;else playerHP=Math.min(playerMaxHP,playerHP+(playerMaxHP-was));updatePlayerHud();updateLevelHud();}
function updateLevelHud(){const p=levelProgress(playerXp);const lv=document.getElementById('level-badge');if(lv)lv.textContent='NV '+p.level;const fill=document.getElementById('xp-fill');if(fill)fill.style.width=(p.max?100:Math.round(p.into/p.need*100))+'%';}
function gainXp(amount,why){
 if(!(amount>0))return;const before=playerLevel();playerXp+=amount;const after=playerLevel();
 if(after>before){applyLevelStats(true);showCombatCallout('NÍVEL '+after);worldAudio.reveal();status.textContent='Você alcançou o nível '+after+'. Vida máxima: '+playerMaxHP+'.';announceShopNews();}
 updateLevelHud();
}
function bumpStat(key,n=1){progressStats[key]=(progressStats[key]||0)+n;announceAchievements();}
let achievementsAnnounced=new Set(ACHIEVEMENTS.filter(a=>achievementState(a,progressStats,achievementsClaimed).done).map(a=>a.id));
function announceAchievements(){for(const a of ACHIEVEMENTS){const st=achievementState(a,progressStats,achievementsClaimed);if(st.done&&!achievementsAnnounced.has(a.id)){achievementsAnnounced.add(a.id);const toast=document.getElementById('quest-toast');if(toast){toast.textContent='CONQUISTA · '+a.name.toUpperCase()+' (resgate na loja)';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2800);}}}}
const BESTIARY_BY_PROFILE={captor:'captor',sentry:'sentry',warden:'warden',zealot:'zealot',hollow:'hollow'};
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
portalGroup.visible=true;
/* MOD 202 — os shaders do mundo compilam enquanto a tela das galáxias está aberta (compilação paralela), não no primeiro
   quadro depois do ENTRAR: era isso que travava o jogo por alguns segundos ao entrar. */
var worldCompiled=false,worldCompileStarted=false;
function precompileWorld(){
 if(worldCompileStarted)return;worldCompileStarted=true;
 const done=()=>{worldCompiled=true;};setTimeout(done,9000);
 try{if(renderer.compileAsync)renderer.compileAsync(scene,camera).then(done,done);else{renderer.compile(scene,camera);done();}}catch(e){done();}
}
function save3DProgress(){const progress={version:ACT1.version,questStep,coins,journeyEnemyIndex,mountainIndex,playerName,captorsTaunted,childrenFreed,awakeningSeen,actCardSeen,wardenTaunted,wardenDefeated,portalOpened,portalRewardClaimed,bishopsDefeated,valerioRewardClaimed,xp:playerXp,owned:[...ownedItems],sword:equippedSword,stats:progressStats,achievementsClaimed:[...achievementsClaimed],bestiary:[...bestiaryKnown],bestiaryRewarded:[...bestiaryRewarded],shopVisited,playSeconds:Math.floor(playSeconds),ledgersFound,vorgazhekRewardClaimed,lateFound:typeof lateFound!=='undefined'?lateFound:[],lateFoundStep:typeof lateFoundStep!=='undefined'?lateFoundStep:0,lateFightIndex:typeof lateFightIndex!=='undefined'?lateFightIndex:0,lateBossClaimed:typeof lateBossClaimed!=='undefined'?lateBossClaimed:{},gauntletIndex:typeof gauntletIndex!=='undefined'?gauntletIndex:0,finaleClaimed:typeof finaleClaimed!=='undefined'?!!finaleClaimed:false,updatedAt:Date.now()};try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));}catch(_){}window.SevenSins3DProgress=progress;try{if(window.parent!==window)window.parent.postMessage({type:'SEVEN_SINS_3D_PROGRESS',progress},window.location.origin);}catch(_){}}
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
function updateQuestHud(){refreshSkillUnlocks();if(typeof refreshSideQuests==='function'&&sideReady)refreshSideQuests();const view=finalePresentationFor(questStep)||latePresentation(questStep)||act2Presentation(questStep)||questPresentation(questStep);const title=document.getElementById('quest-title'),objective=document.getElementById('quest-objective'),coinCount=document.getElementById('coin-count'),hint=document.getElementById('hint'),hero=document.getElementById('hero-name');if(title)title.textContent=view.title;if(objective)objective.textContent=view.objective;if(hint)hint.textContent=view.title;if(coinCount)coinCount.textContent=String(coins);{const tag=document.getElementById('hero-name-tag');if(tag)tag.textContent=playerName?playerName.toUpperCase():'';}if(hero)hero.textContent=playerName?playerName.toUpperCase():'SEM NOME';const nameLabel=document.querySelector('#player-name span');if(nameLabel)nameLabel.textContent=(playerName||'PROTAGONISTA').toUpperCase();}
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
function talkToGuide(){if(questStep!==0||dialogueOpen||namePromptOpen)return;guide.lookAt(player.position.x,guide.position.y,player.position.z);const afterName=()=>{showDialogue(guideAfterNameLines(playerName),()=>{if(!purseGiven){coins+=ACT1.purse;purseGiven=true;}questStep=1;save3DProgress();updateQuestHud();document.getElementById('talk-button').classList.add('hidden');status.textContent='Téo espera na vila. A oferta mínima já está com você.';showActCard();});};if(playerName){afterName();return;}showDialogue(guideAwakeningLines(),()=>openNamePrompt(afterName));}

function finalePresentationFor(step){const pages={26:['ARCO FINAL · QUATRO FENDAS','Fale com o Anjo-Guia na vila'],27:['ARCO FINAL · OS GUARDIÕES','Vá ao portal da montanha e enfrente os quatro guardiões'],28:['ARCO FINAL · O PECADO DA GANÂNCIA','Derrote as três formas da Ganância'],29:['EPÍLOGO','O mundo respira'],30:['GALÁXIA 1 · LIBERTADA','Escolha a próxima jornada na tela das galáxias']};const p=pages[step];return p?{title:p[0],objective:p[1]}:null;}
function combatStepNow(){return (dimBattle&&dimBattle.active)||questStep===2||questStep===4||questStep===5||questStep===13||(lateSystemsReady&&(lateEngaged()||coliseum.active))||(finaleReady&&finaleCombatActive());}
function enemyHpPercent(){return Math.max(0,Math.min(100,enemyHP/Math.max(1,enemyMaxHP)*100));}
function nextDashCooldown(){if(encounterProfile==='warden')return 2.15;if(encounterProfile==='sentry'&&mountainIndex>0)return 1.65;return 2.7;}
function syncEnemyLabel(){const el=document.getElementById('enemy-name');if(!el)return;const dimInfo=dimensionForProfile(encounterProfile);el.textContent=dimBattle&&dimBattle.active&&dimInfo?dimInfo.name+' · '+(dimInfo.order<5?dimInfo.order+'º BISPO':'PECADO'):(finaleReady&&finaleNameFor(encounterProfile))?finaleNameFor(encounterProfile):encounterProfile==='vorgazhek'?'VORGAZHEK · SEGUNDO BISPO':encounterProfile==='arena'?'ARENA DO VALE':(lateSystemsReady&&lateDef()&&lateDef().profile===encounterProfile)?lateDef().name:encounterProfile==='warden'?'GUARDA DA PASSAGEM':encounterProfile==='sentry'?'SENTINELA DA SUBIDA':'SEGUIDOR DA GANÂNCIA';if(wardenRing)wardenRing.visible=encounterProfile==='warden'&&enemy.visible;}
function revealEncounter(profile,spot,hp,intro){if(enemy.visible)return;encounterProfile=profile;enemyMaxHP=hp;enemyHP=hp;enemyAlive=true;enemy.position.set(spot.x,terrainHeightAt(spot.x,spot.z),spot.z);enemy.rotation.set(0,0,0);enemy.scale.setScalar(1);enemyAttackElapsed=0;enemyAttackResolved=true;enemyAttackCooldown=.35;enemyKnockback=0;enemyDashRemaining=0;enemyCastResolved=true;wardenFanPending=false;if(profile!=='warden')wardenPhaseUsed=false;enemy.visible=true;checkpointX=spot.x;checkpointZ=Math.min(12,spot.z+7.5);syncEnemyLabel();if(enemyActions.idle)playEnemyAnimation('idle',.05);status.textContent=intro;}
function advanceAfterEnemyDefeat(){if(dimBattle&&dimBattle.active){dimensionVictory();return;}if(finaleReady&&finaleHandleDefeat())return;if(lateSystemsReady&&lateHandleDefeat())return;if(encounterProfile==='vorgazhek'){registerEnemyDefeat('vorgazhek');act2Victory();return;}registerEnemyDefeat(encounterProfile);enemy.visible=false;enemy.rotation.set(0,0,0);enemy.scale.setScalar(1);enemyAttackCooldown=0;enemyAttackResolved=true;enemyDashRemaining=0;wardenFanPending=false;if(wardenRing)wardenRing.visible=false;if(questStep===2){enemyHP=100;enemyMaxHP=100;enemyAlive=true;encounterProfile='captor';const next=afterEnemyDefeated(journeyEnemyIndex,JOURNEY_ENEMIES.length);questStep=next.questStep;journeyEnemyIndex=next.journeyEnemyIndex;status.textContent=next.status;save3DProgress();updateQuestHud();return;}if(questStep===4){const next=afterMountainDefeat(mountainIndex,MOUNTAIN_SENTRIES.length);questStep=next.questStep;mountainIndex=next.mountainIndex;enemyHP=100;enemyMaxHP=100;enemyAlive=true;status.textContent=next.status;save3DProgress();updateQuestHud();if(questStep===5){const toast=document.getElementById('quest-toast');if(toast){toast.textContent='O GUARDA DA PASSAGEM ESPERA';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2400);}}return;}if(questStep===5){const next=afterWardenDefeat();questStep=next.questStep;wardenDefeated=true;enemyHP=100;enemyMaxHP=100;enemyAlive=true;coins+=ACT1.wardenReward;status.textContent=next.status;save3DProgress();updateQuestHud();const toast=document.getElementById('quest-toast');if(toast){toast.textContent='GUARDA DERROTADO · +'+ACT1.wardenReward+' MOEDAS';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2600);}}}
function nearestVillageVendor(){let nearest=null,best=2.85;for(const vendor of villageVendors){const distance=Math.hypot(vendor.x-player.position.x,vendor.z-player.position.z);if(distance<best){best=distance;nearest=vendor;}}return nearest;}
function talkToVillageVendor(vendor){if(!vendor||dialogueOpen||namePromptOpen)return;if(questStep===1&&vendor.shortName==='PROVISÕES'){talkToInformant();return;}if(trySideQuestTalk(vendor))return;const hint=vendor.hints[Math.min(4,questStep)]||vendor.hints[4];showDialogue([{who:vendor.name,text:vendor.greeting},{who:vendor.name,text:hint}]);}
function talkToInformant(){if(questStep!==1||dialogueOpen||namePromptOpen)return;if(coins<ACT1.bribe){showDialogue(informantPoorLines());return;}showDialogue(informantLines(playerName),()=>{coins=Math.max(0,coins-ACT1.bribe);questStep=2;journeyEnemyIndex=0;captorsTaunted=false;tauntLock=false;encounterProfile='captor';enemyHP=100;enemyMaxHP=100;enemyAlive=true;enemy.visible=false;save3DProgress();updateQuestHud();status.textContent='Siga a trilha até as gaiolas.';});}
function beginCaptorTaunt(){if(captorsTaunted||tauntLock||dialogueOpen||namePromptOpen)return;tauntLock=true;showDialogue(captorTauntLines(playerName),()=>{captorsTaunted=true;tauntLock=false;save3DProgress();status.textContent='Os captores avançam. Proteja as gaiolas.';});}
function freeChildren(){if(questStep!==3||childrenFreed||dialogueOpen||namePromptOpen)return;showDialogue(freeChildrenLines(playerName),()=>{childrenFreed=true;openCageDoors();save3DProgress();updateQuestHud();status.textContent='Escolte as crianças de volta à vila.';});}
function reunionDialogue(){if(reunionStarted||dialogueOpen||namePromptOpen||questStep!==3||!childrenFreed)return;reunionStarted=true;showDialogue(reunionLines(),()=>{questStep=4;bumpStat('rescues');gainXp(XP_REWARDS.rescue);coins+=ACT1.rescueReward;save3DProgress();updateQuestHud();status.textContent='As famílias as receberam. A subida tem sentinelas espaçadas antes do portal.';const toast=document.getElementById('quest-toast');if(toast){toast.textContent='AS CRIANÇAS ESTÃO SEGURAS · +'+ACT1.rescueReward+' MOEDAS';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2800);}});}
function beginWardenIntro(){if(wardenTaunted||wardenIntroLock||dialogueOpen||namePromptOpen)return;wardenIntroLock=true;showDialogue(wardenTauntLines(playerName),()=>{wardenTaunted=true;wardenIntroLock=false;save3DProgress();revealEncounter('warden',WARDEN_SPOT,ACT1.wardenHp,'O guarda da passagem entra na trilha.');});}
function startPortalPull(){if(!portalPull)portalPull={t:0};}
function updatePortalPull(dt){if(!portalPull||handoffSent)return;portalPull.t+=dt;player.position.x+=(PORTAL.x-player.position.x)*Math.min(1,dt*2.1);player.position.z+=((PORTAL.z+2.4)-player.position.z)*Math.min(1,dt*2.1);player.position.y=terrainHeightAt(player.position.x,player.position.z);const yaw=Math.atan2(PORTAL.x-player.position.x,PORTAL.z-player.position.z);player.rotation.y=yaw;playerYaw=yaw;if(portalPull.t>1.2)requestValerioHandoff();}
function openValerioPortal(){if(dialogueOpen||namePromptOpen||awakeningActive||portalPull)return;if(questStep>=8){status.textContent='O portal se fechou. O selo de Valério foi quebrado.';return;}updateHeartsHud(true);if(!canChallengeBishop(heartState)){status.textContent='Sem corações. O próximo volta em '+formatTimer(msToNextHeart(heartState))+'.';showDialogue([{who:'Anjo-Guia',text:'Não atravesse de peito vazio. Espere um coração voltar — a mata ainda pode te ensinar enquanto isso.'}]);return;}if(questStep===7||portalOpened){startPortalPull();return;}if(questStep!==6)return;showDialogue(portalLines(playerName),()=>{if(!portalRewardClaimed){coins+=ACT1.portalReward;portalRewardClaimed=true;}questStep=7;portalOpened=true;save3DProgress();updateQuestHud();status.textContent='O portal reconhece o seu nome e começa a puxar.';const toast=document.getElementById('quest-toast');if(toast){toast.textContent='A DIMENSÃO DE VALÉRIO SE ABRE';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2800);}startPortalPull();});}
function warnPortalBlocked(){if(dialogueOpen||namePromptOpen)return;showDialogue(portalBlockedLines());}
function tryInteract(){if(namePromptOpen||awakeningActive||portalPull||shopOpen)return;if(dialogueOpen){advanceDialogue();return;}if(act2Interact())return;if(finaleReady&&finaleInteract())return;if(lateSystemsReady&&lateInteract())return;const guideDistance=Math.hypot(guide.position.x-player.position.x,guide.position.z-player.position.z);const teo=villageVendors[2];const teoDistance=Math.hypot(teo.x-player.position.x,teo.z-player.position.z);const cageDistance=Math.hypot(CAGE_CENTER.x-player.position.x,CAGE_CENTER.z-player.position.z);const portalDistance=Math.hypot(PORTAL.x-player.position.x,PORTAL.z-player.position.z);if(questStep===0&&guideDistance<=2.7){talkToGuide();return;}if(questStep===1&&teoDistance<=2.9){talkToInformant();return;}if(questStep===3&&!childrenFreed&&cageDistance<=4.2){freeChildren();return;}const fighting=enemy.visible&&enemyAlive;if((questStep===4||questStep===5)&&portalDistance<=3.8&&!fighting){warnPortalBlocked();return;}if((questStep===6||questStep===7)&&portalDistance<=3.8&&!fighting){openValerioPortal();return;}if(nearShopDoor()){openShop();return;}const stone=nearestWaystone();if(stone){useWaystone(stone);return;}const vendor=nearestVillageVendor();if(vendor)talkToVillageVendor(vendor);}
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
 if(hit)actions.hit=mixer.clipAction(hit);if(death)actions.death=mixer.clipAction(death);if(dash)actions.dash=mixer.clipAction(dash);if(block)actions.block=mixer.clipAction(block);
 play(actions.idle?'idle':actions.walk?'walk':'idle',0);
 window.ProtagonistAnimationReport=clips.map(c=>c.name);console.info('Protagonista.glb animações:',window.ProtagonistAnimationReport);}
 fitGuideModel();addVillageVendors();
 player.userData.ready=true;loading.classList.add('hidden');precompileWorld();spawnAct1Children();status.textContent=questStep===0?'Ato I · o Anjo-Guia espera no começo da trilha':(finalePresentationFor(questStep)||latePresentation(questStep)||act2Presentation(questStep)||questPresentation(questStep)).objective;
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
 if(kind==='sun'){const orb=new THREE.Mesh(new THREE.SphereGeometry(.42,16,12),gold);group.add(orb);const halo=new THREE.Mesh(new THREE.TorusGeometry(.58,.035,6,24),white);halo.rotation.x=Math.PI/2;group.add(halo);}
 else{const blade=new THREE.Mesh(new THREE.ConeGeometry(.13,.95,5),gold);blade.rotation.x=Math.PI/2;group.add(blade);const core=new THREE.Mesh(new THREE.CylinderGeometry(.025,.045,.8,5),white);core.rotation.x=Math.PI/2;group.add(core);group.rotation.z=Math.PI/2;}
 const target=combatStepNow()&&enemy.visible&&enemyAlive&&Math.hypot(enemy.position.x-player.position.x,enemy.position.z-player.position.z)<22;
 const aimYaw=cameraDistance<1.05?cameraYaw+Math.PI:playerYaw,base=target?Math.atan2(enemy.position.x-player.position.x,enemy.position.z-player.position.z):aimYaw,angle=base+angleOffset,dirX=Math.sin(angle),dirZ=Math.cos(angle);
 group.position.set(player.position.x+dirX*.8,player.position.y+(kind==='sun'?1.65:1.35),player.position.z+dirZ*.8);group.rotation.y=angle;scene.add(group);
 holyProjectiles.push({group,dirX,dirZ,kind,delay,life:kind==='sun'?2.7:1.7,speed:kind==='sun'?4.2:8.5,damage:kind==='sun'?28:kind==='ultimate'?45:kind==='sword5'?10:kind==='swordHoming'?16:14,hit:false,homing:kind==='swordHoming'});
}
function castHolyMagic(kind){
 const now=performance.now();if(playerHP<=0)return;
 const check=canCast(kind,{unlocked:skillSet||new Set(),mana:playerMana,cooldownUntil:holyCooldowns,now});if(!check.ok){status.textContent=check.reason;return;}
 playerMana-=SKILLS[kind].mana;holyCooldowns[kind]=now+SKILLS[kind].cooldown;worldAudio.magic(kind);
 if(kind==='magic'&&ownedItems.has('magic_plus')){[-.3,-.15,0,.15,.3].forEach((a,i)=>spawnHolyProjectile('swordHoming',a,i*.07));status.textContent='Espadas da Palavra II — cinco lâminas perseguem o alvo!';}
 else if(kind==='magic'){[-.19,0,.19].forEach((a,i)=>spawnHolyProjectile('sword',a,i*.09));status.textContent='Espadas da Palavra — três lâminas de luz!';}
 else if(kind==='magic2'&&ownedItems.has('magic2_plus')&&combatStepNow()&&enemy.visible&&enemyAlive){for(let i=0;i<7;i++){const a=i/7*Math.PI*2;spawnHazardFriendly(enemy.position.x+Math.cos(a)*(i?1.6:0),enemy.position.z+Math.sin(a)*(i?1.6:0),.35+i*.12);}status.textContent='Julgamento Celestial II — sete espadas caem do céu!';}
 else if(kind==='magic2'){[-.28,-.14,0,.14,.28].forEach((a,i)=>spawnHolyProjectile('sword5',a,i*.12));status.textContent='Julgamento Celestial — cinco espadas descem em formação!';}
 else if(kind==='magic3'){spawnHolyProjectile('sun');status.textContent='Sol da Justiça — luz ardente lançada contra o inimigo!';}
 else{castDivineJudgment();}
}
function updateHolyProjectiles(dt){
 for(let i=holyProjectiles.length-1;i>=0;i--){const p=holyProjectiles[i];p.delay-=dt;if(p.delay>0)continue;p.life-=dt;if(p.homing&&enemy.visible&&enemyAlive){const hx=enemy.position.x-p.group.position.x,hz=enemy.position.z-p.group.position.z,hd=Math.hypot(hx,hz)||1;p.dirX+=(hx/hd-p.dirX)*Math.min(1,dt*5);p.dirZ+=(hz/hd-p.dirZ)*Math.min(1,dt*5);const n=Math.hypot(p.dirX,p.dirZ)||1;p.dirX/=n;p.dirZ/=n;p.group.rotation.y=Math.atan2(p.dirX,p.dirZ);}p.group.position.x+=p.dirX*p.speed*dt;p.group.position.z+=p.dirZ*p.speed*dt;if(p.kind==='sun'){p.group.position.y+=Math.sin(performance.now()*.006)*dt*.22;p.group.rotation.y+=dt*2;}else p.group.rotation.z+=dt*2;
  const d=Math.hypot(p.group.position.x-enemy.position.x,p.group.position.z-enemy.position.z);
  if(!p.hit&&enemyAlive&&combatStepNow()&&enemy.visible&&d<1.15&&Math.abs(p.group.position.y-(enemy.position.y+1))<1.8){p.hit=true;enemyHP=Math.max(0,enemyHP-p.damage);onEnemyDamaged(p.damage,p.kind==='ultimate');enemyHitFlash=.2;setEnemyHitFlash(true);setTimeout(()=>setEnemyHitFlash(false),130);const fill=document.getElementById('enemy-hp-fill');if(fill)fill.style.width=enemyHpPercent()+'%';p.life=0;if(enemyHP===0){enemyAlive=false;playEnemyAnimation('death',.06,true);status.textContent='A luz venceu este inimigo. Caminho liberado.';setTimeout(()=>advanceAfterEnemyDefeat(),650);}}
  if(p.life<=0){scene.remove(p.group);p.group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});holyProjectiles.splice(i,1);}
 }
}
function action(kind){if(playerHP<=0)return;const now=performance.now();if(kind==='dash'){if(now<dashCooldownUntil)return;dashCooldownUntil=now+720;let intentX=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joyX;let intentZ=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+joyY;let intentLen=Math.hypot(intentX,intentZ);if(intentLen>.12){intentX/=intentLen;intentZ/=intentLen;dashDirX=intentX*Math.cos(cameraYaw)+intentZ*Math.sin(cameraYaw);dashDirZ=-intentX*Math.sin(cameraYaw)+intentZ*Math.cos(cameraYaw);}else{const moveLen=Math.hypot(moveVX,moveVZ);if(moveLen>.2){dashDirX=moveVX/moveLen;dashDirZ=moveVZ/moveLen;}else{dashDirX=Math.sin(playerYaw);dashDirZ=Math.cos(playerYaw);}}dashRemaining=.32;playerInvulnerableUntil=Math.max(playerInvulnerableUntil,now+330);worldAudio.whoosh();if(actions.dash)playOnce('dash',.045);else if(actions.walk)play('walk',.045);actionUntil=now+360;return;}if(kind==='jump'){if(!grounded)return;grounded=false;verticalVelocity=jumpImpulse;worldAudio.whoosh();if(actions.jump){playOnce('jump',.08);actionUntil=now+Math.max(320,Math.min(700,actions.jump.getClip().duration*1000));}else{actionUntil=now+180;}return;}if(kind==='attack'){tryPlayerAttack();return;}if(kind==='magic'||kind==='magic2'||kind==='magic3'||kind==='ultimate'){castHolyMagic(kind);return;}}
// MOD 187 — o celular não gera 'click' para um segundo dedo enquanto o primeiro segura o joystick; pointerdown responde sempre.
function bindInstantTap(button,fn){if(!button)return;let lastTap=0;button.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();lastTap=performance.now();fn();});button.addEventListener('click',e=>{if(performance.now()-lastTap>500)fn();});}
function bindInstantAction(id,kind){bindInstantTap(document.getElementById(id),()=>action(kind));}
bindInstantAction('attack','attack');bindInstantAction('dash','dash');
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
 if(voidMode)return Math.hypot(x-voidSpec.x,z-voidSpec.z)>voidSpec.radius;
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

const CAGE_SPOTS=[{x:-2.55,z:-55.7},{x:2.75,z:-56.5}];
const CAGE_CENTER={x:0.1,z:-56.1};
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
function spawnAct1Children(){
 if(!model||childFollowers.length)return;
 CAGE_SPOTS.forEach((spot,i)=>{
  const cloned=cloneSkinned(model),root=new THREE.Group();
  root.position.set(spot.x,0,spot.z);root.scale.setScalar(.5);root.add(cloned);
  cloned.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  scene.add(root);
  let childMixer=null;
  if(playerIdleClip){childMixer=new THREE.AnimationMixer(cloned);const idle=childMixer.clipAction(playerIdleClip);idle.setLoop(THREE.LoopRepeat,Infinity);idle.play();}
  childFollowers.push({root,mixer:childMixer,home:spot,offset:i===0?-.9:.9});
 });
 if(childrenFreed)openCageDoors();
}
/* MOD 186 — escolta atrás do herói (não grudada no mundo +Z) e, depois do reencontro, as crianças ficam
   na vila com as famílias. Antes elas seguiam o jogador para sempre, inclusive nas lutas e até o portal. */
const CHILD_HOMES=[{x:VILLAGE_CENTER.x-4.6,z:VILLAGE_CENTER.z+1.5},{x:VILLAGE_CENTER.x-3.4,z:VILLAGE_CENTER.z+1.1}];
function updateChildren(dt){
 for(let i=0;i<childFollowers.length;i++){
  const child=childFollowers[i];
  child.root.visible=questStep>=2;
  if(!child.root.visible)continue;
  if(child.mixer)child.mixer.update(dt);
  let tx,tz,rate;
  if(!childrenFreed){tx=child.home.x;tz=child.home.z;rate=8;}
  else if(questStep>=4){const h=CHILD_HOMES[i%CHILD_HOMES.length];tx=h.x;tz=h.z;rate=1.4;}
  else{const fx=Math.sin(playerYaw),fz=Math.cos(playerYaw),back=1.55+i*.2;tx=player.position.x-fx*back+fz*child.offset*.85;tz=player.position.z-fz*back-fx*child.offset*.85;rate=2.6;}
  child.root.position.x+=(tx-child.root.position.x)*Math.min(1,dt*rate);
  child.root.position.z+=(tz-child.root.position.z)*Math.min(1,dt*rate);
  child.root.position.y=terrainHeightAt(child.root.position.x,child.root.position.z);
  if(childrenFreed){const lookX=questStep>=4?VILLAGE_CENTER.x:player.position.x,lookZ=questStep>=4?VILLAGE_CENTER.z:player.position.z;child.root.lookAt(lookX,child.root.position.y,lookZ);}
 }
}
buildAct1Cages();

function animate(){requestAnimationFrame(animate);if(vsOpen||gamePaused||menuGate){clock.getDelta();return;}const rawDt=Math.min(clock.getDelta(),.04),now=performance.now(),dt=now<hitStopUntil?rawDt*.06:rawDt;updatePlayerRespawn(now);updateHolyProjectiles(dt);for(const uniform of forestWindUniforms)uniform.value=now*.001;portalRing.rotation.z=Math.sin(now*.00045)*.045;portalInnerRing.rotation.z=-now*.00032;vortex.rotation.z=-now*.00165;portalLight.intensity=2.7+Math.sin(now*.003)*.45;portalSigil.rotation.z=now*.00022;for(const relic of floatingRelics){relic.mesh.position.y=relic.baseY+Math.sin(now*.0015+relic.phase)*.16;relic.mesh.rotation.y+=dt*.42;}for(const cloud of movingClouds){cloud.group.position.x+=cloud.speed*dt;cloud.group.position.y=cloud.baseY+Math.sin(now*.00018+cloud.phase)*.34;if(cloud.group.position.x>145)cloud.group.position.x=-145;else if(cloud.group.position.x<-145)cloud.group.position.x=145;}for(const npc of villageNpcBreathing){npc.root.position.y=npc.baseY+Math.sin(now*.00145+npc.phase)*.022;npc.root.rotation.z=Math.sin(now*.0011+npc.phase)*.008;}if(mixer)mixer.update(dt);if(enemyMixer)enemyMixer.update(dt);if(model&&grounded&&Math.abs(verticalVelocity)<.015&&playerHP>0){model.updateMatrixWorld(true);const floorY=terrainHeightAt(player.position.x,player.position.z);if(!model.userData.footBones){const fb=[];model.traverse(o=>{if(o.isBone&&/(left|right).*(foot|toe|ankle)|(foot|toe|ankle).*(left|right)/i.test(o.name||''))fb.push(o);});model.userData.footBones=fb;}let lowFoot=Infinity;for(const o of model.userData.footBones){footTmpVec.setFromMatrixPosition(o.matrixWorld);if(Number.isFinite(footTmpVec.y)&&footTmpVec.y<lowFoot)lowFoot=footTmpVec.y;}if(lowFoot<Infinity){model.position.y+=floorY-lowFoot;}}if(guideProceduralBreath){const breath=Math.sin(now*.00175);guideBreathingPivot.scale.set(1-breath*.008,1+breath*.022,1-breath*.008);guideBreathingPivot.position.y=.012+breath*.018;if(guideModel&&guideModel.userData.breathBones){for(const b of guideModel.userData.breathBones){b.bone.rotation.x=b.baseX+breath*.018;b.bone.scale.y=b.baseScaleY*(1+breath*.012);}}}if(enemyModel){
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
 const teo=villageVendors[2],teoDistance=Math.hypot(teo.x-player.position.x,teo.z-player.position.z),cageDistance=Math.hypot(CAGE_CENTER.x-player.position.x,CAGE_CENTER.z-player.position.z);
 const fightingNow=enemy.visible&&enemyAlive;const portalReady=(questStep===6||questStep===7)&&portalDistance<=3.8&&!fightingNow,portalSoon=(questStep===4||questStep===5)&&portalDistance<=3.8&&!fightingNow;const nearStone=nearestWaystone(),atShop=nearShopDoor(),act2Label=act2TalkLabel()||(finaleReady?finaleTalkLabel():'')||(lateSystemsReady?lateTalkLabel():'');const canTalk=!!act2Label||atShop||!!nearStone||(questStep===0&&guideDistance<=2.7)||(questStep===1&&teoDistance<=2.9)||(questStep===3&&!childrenFreed&&cageDistance<=4.2)||portalReady||portalSoon||!!nearbyVendor;
 if(talkButton){const label=questStep===1&&teoDistance<=2.9?(coins>=ACT1.bribe?'OFERECER 5':'FALAR · TÉO'):questStep===3&&!childrenFreed&&cageDistance<=4.2?'ABRIR GAIOLAS':portalReady?'ATRAVESSAR':portalSoon?'PORTAL FECHADO':act2Label?act2Label:atShop?'LOJA CENTRAL':nearStone?(mapState.waystones.has(nearStone.id)?'ABRIGO · MAPA':'REGISTRAR ABRIGO'):nearbyVendor?'FALAR · '+nearbyVendor.shortName:'FALAR';talkButton.textContent=label;talkButton.classList.toggle('hidden',!canTalk||dialogueOpen||namePromptOpen||awakeningActive||!!portalPull);}
 questMarker.visible=(questStep<7||(questStep>=8&&questStep<13))&&!portalPull&&!voidMode;
 if(questStep===0)questMarker.position.set(guide.position.x,terrainHeightAt(guide.position.x,guide.position.z)+.06,guide.position.z);
 if(questStep===1)questMarker.position.set(teo.x,terrainHeightAt(teo.x,teo.z)+.06,teo.z);
 if(questStep===2){const target=JOURNEY_ENEMIES[journeyEnemyIndex];if(target){questMarker.position.set(target.x,terrainHeightAt(target.x,target.z)+.06,target.z);const near=Math.hypot(target.x-player.position.x,target.z-player.position.z)<10;if(journeyEnemyIndex===0&&!captorsTaunted){if(near)beginCaptorTaunt();}else if(near){revealEncounter('captor',target,100,'Cuidado! Um captor bloqueia a trilha.');}}}
 if(questStep===3){if(!childrenFreed)questMarker.position.set(CAGE_CENTER.x,terrainHeightAt(CAGE_CENTER.x,CAGE_CENTER.z)+.06,CAGE_CENTER.z);else questMarker.position.set(VILLAGE_CENTER.x,terrainHeightAt(VILLAGE_CENTER.x,VILLAGE_CENTER.z)+.06,VILLAGE_CENTER.z);}
 if(questStep===4){const spot=MOUNTAIN_SENTRIES[Math.min(mountainIndex,MOUNTAIN_SENTRIES.length-1)];if(spot&&mountainIndex<MOUNTAIN_SENTRIES.length){questMarker.position.set(spot.x,terrainHeightAt(spot.x,spot.z)+.06,spot.z);if(Math.hypot(spot.x-player.position.x,spot.z-player.position.z)<8)revealEncounter('sentry',spot,ACT1.sentryHp,mountainIndex>0?'A segunda sentinela desce um degrau da trilha.':'Uma sentinela bloqueia a subida.');}}
 if(questStep===5){questMarker.position.set(WARDEN_SPOT.x,terrainHeightAt(WARDEN_SPOT.x,WARDEN_SPOT.z)+.06,WARDEN_SPOT.z);const nearWarden=Math.hypot(WARDEN_SPOT.x-player.position.x,WARDEN_SPOT.z-player.position.z)<8;if(nearWarden&&!wardenTaunted)beginWardenIntro();else if(nearWarden)revealEncounter('warden',WARDEN_SPOT,ACT1.wardenHp,'O guarda ainda segura a passagem.');}
 if(questStep===6)questMarker.position.set(PORTAL.x,terrainHeightAt(PORTAL.x,PORTAL.z)+.06,PORTAL.z);
 if(combatStepNow()&&enemy.visible&&enemyAlive&&Math.hypot(enemy.position.x-player.position.x,enemy.position.z-player.position.z)<6.5)enemy.rotation.y=Math.atan2(player.position.x-enemy.position.x,player.position.z-enemy.position.z);
 if(dialogueOpen&&actions.idle&&now>actionUntil)play('idle',.08);
let axisX=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joyX;
let axisZ=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+joyY;
if(dialogueOpen||namePromptOpen||awakeningActive||playerHP<=0||portalPull){axisX=0;axisZ=0;}
let len=Math.hypot(axisX,axisZ);if(len>1){axisX/=len;axisZ/=len;len=1;}
// Mesmo princípio da dimensão do Valério: o joystick é relativo à orientação da câmera,
// com zona morta analógica e aceleração/desaceleração suaves, em vez de deslocar o modelo instantaneamente.
const dead=.12;if(len<dead){axisX=0;axisZ=0;}else{const power=(len-dead)/(1-dead);axisX=axisX/len*power;axisZ=axisZ/len*power;}
const worldX=axisX*Math.cos(cameraYaw)+axisZ*Math.sin(cameraYaw);
const worldZ=-axisX*Math.sin(cameraYaw)+axisZ*Math.cos(cameraYaw);
const speed=defending?1.9:4.3,targetVX=worldX*speed,targetVZ=worldZ*speed;
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
 const dashDt=Math.min(dt,dashRemaining);const nextX=THREE.MathUtils.clamp(player.position.x+dashDirX*12.5*dashDt,-400,400);const nextZ=THREE.MathUtils.clamp(player.position.z+dashDirZ*12.5*dashDt,-400,400);
 if(!playerBlockedAt(nextX,player.position.z))player.position.x=nextX;
 if(!playerBlockedAt(player.position.x,nextZ))player.position.z=nextZ;
 playerYaw=Math.atan2(dashDirX,dashDirZ);player.rotation.y=playerYaw;dashRemaining=Math.max(0,dashRemaining-dt);
}else if(moving){
 const nextX=THREE.MathUtils.clamp(player.position.x+moveVX*dt,-400,400);
 const nextZ=THREE.MathUtils.clamp(player.position.z+moveVZ*dt,-400,400);
 // Testa cada eixo separadamente para o jogador conseguir deslizar junto à árvore/pedra.
 if(!playerBlockedAt(nextX,player.position.z))player.position.x=nextX;else moveVX=0;
 if(!playerBlockedAt(player.position.x,nextZ))player.position.z=nextZ;else moveVZ=0;
 const wantedYaw=Math.atan2(moveVX,moveVZ);
 const yawDelta=Math.atan2(Math.sin(wantedYaw-playerYaw),Math.cos(wantedYaw-playerYaw));
 playerYaw+=yawDelta*(1-Math.exp(-12*dt));player.rotation.y=playerYaw;
 if(grounded&&now>actionUntil&&actions.walk){play('walk');const walkAction=actions.walk;if(walkAction)walkAction.setEffectiveTimeScale(THREE.MathUtils.clamp(Math.hypot(moveVX,moveVZ)/3.4,.55,1.45));}
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
updateEnemyAI(dt);updateEnemyHud();updatePlayerHud();playerMana=regenMana(playerMana,dt,combatStepNow()&&enemy.visible&&enemyAlive);updateSkillHud(now);updateDayNight(dt);updateInstanceCulling();checkSecretRuin();
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
 camera.position.lerp(desired,1-Math.exp(-8*dt));camera.lookAt(target);
}
// Vegetação instanciada permanece imóvel; evita rotações por quadro de centenas de instâncias.
// A espada acompanha diretamente o osso da mão; o golpe vem do clipe de animação do personagem, sem balanço artificial por código.
updateAutoGraphics3D(dt,now);
 if(awakeningActive){awakeningT=Math.min(1,awakeningT+dt/5.4);const yaw=Math.sin(awakeningT*Math.PI*1.6)*.85,pitch=.22+Math.sin(awakeningT*Math.PI)*.16,dist=8.2;const target=new THREE.Vector3(player.position.x,player.position.y+1.35,player.position.z);camera.position.set(target.x+Math.sin(yaw)*dist*Math.cos(pitch),target.y+dist*Math.sin(pitch)+.35,target.z+Math.cos(yaw)*dist*Math.cos(pitch));camera.lookAt(target);if(awakeningT>=1)finishAwakening();}
 updateChildren(dt);updateCages();if(questStep===3&&childrenFreed&&!reunionStarted&&!dialogueOpen&&Math.hypot(VILLAGE_CENTER.x-player.position.x,VILLAGE_CENTER.z-player.position.z)<8)reunionDialogue();
 updateFpsBadge(now);updateFriendlyStrikes(dt);autoRecenterCamera(dt,now);updateFovKick(rawDt);updateFpExtras(dt);updateWarnRing(dt);updateHazards(dt);updateBlackHole(dt,now);updateBossPowers(dt);updateFoeWeaponSkills(dt);updateAct2(dt,now);if(lateSystemsReady)updateLate(dt,now);if(finaleReady)updateFinale(dt,now);updateObjectiveArrow();updateCombatJuice(rawDt);updateSideItems(dt,now);tickPlayTime(dt,now);updateHeartsHud();if(!heroPortraitDone&&model)renderHeroPortrait();updateSlashTrail(dt);updateUltimateFx(rawDt);updateDefense(dt);updateLockOn(dt);updatePrologue(dt);updateFirstPerson(dt,now);updateAmbientLife(dt,now);updateWorldAudio(dt);keepCameraAboveTerrain();if(debugCameraOverride){camera.position.copy(debugCameraOverride.from);camera.lookAt(debugCameraOverride.to);}updateSkyAndShadows();applyCameraShake(rawDt);
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
let vsFailed=false;
function openVsCard(key){
 const card=vsCard(key,playerName),panel=document.getElementById('vs-panel'),go=document.getElementById('vs-go');
 if(!card||!panel||!go){beginDimensionFight();return;}
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
 bindInstantTap(go,()=>{if(go.disabled||!dimBattle)return;if(vsFailed){openVsCard(dimBattle.key);return;}beginDimensionFight();});
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
 else lateBossPlayerDown();
 if(!enemy.visible)abortDimensionBattle();
}
// ---- Valério (Ato I) ----
function requestValerioHandoff(){
 if(handoffSent||dimBattle)return;
 startDimensionBattle('bishop1',{hp:DIMENSIONS.bishop1.hp,returnTo:{x:PORTAL.x,z:PORTAL.z+5},onVictory:valerioVictory,onAbort:()=>{
  status.textContent='O portal te expulsou: seus corações se apagaram. Recupere ao menos um para voltar.';
  setTimeout(()=>showDialogue([{who:'Anjo-Guia',text:'Valério ainda está de pé, e você também — isso basta por hoje. Espere um coração voltar a bater. O portal vai reconhecer você.'}]),700);}});
}
function valerioVictory(){
 const result=afterValerioVictory({valerioRewardClaimed,bishopsDefeated});
 if(result.coinsGained){bumpStat('bishops');gainXp(XP_REWARDS.valerio);bestiaryKnown.add('valerio');}
 questStep=result.questStep;bishopsDefeated=result.bishopsDefeated;valerioRewardClaimed=true;coins+=result.coinsGained;
 closePortalVisuals();save3DProgress();updateQuestHud();
 const toast=document.getElementById('quest-toast');if(toast){toast.textContent='VALÉRIO FOI PURIFICADO'+(result.coinsGained?' · +'+result.coinsGained+' MOEDAS':'');toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),3200);}
 setTimeout(()=>showDialogue(valerioVictoryLines(playerName)),900);
}
// ---- Portais dos Bispos 2–4 (aparecem quando o confronto do ato está liberado) ----
const DIM_PORTAL_DEFS={
 bishop2:{at:()=>DISTRICT_SPOTS.arena,from:()=>DISTRICT_SPOTS.plaza,active:()=>questStep===ACT2.boss},
 bishop3:{at:()=>stepDef(19).def.at,from:()=>({x:132,z:-22}),active:()=>questStep===19},
 bishop4:{at:()=>stepDef(25).def.at,from:()=>({x:-50,z:-224}),active:()=>questStep===25}
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
function startBishop2Dimension(){
 updateHeartsHud(true);if(!canChallengeBishop(heartState)){showDialogue([{who:'Anjo-Guia',text:'Sem corações, não. Espere um voltar — '+formatTimer(msToNextHeart(heartState))+'.'}]);return;}
 startDimensionBattle('bishop2',{hp:ACT2.bossHp,returnTo:dimPortalReturn('bishop2'),onVictory:act2Victory,onAbort:()=>{status.textContent='Sem corações. VORGAZHEK recuou para o selo — recupere um coração e volte ao altar.';}});
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
const SHOP_ART={magic:'magic',magic2:'magic2',magic3:'magic3',ultimate:'ultimate',magic_plus:'magic_plus',magic2_plus:'magic2_plus',aurora:'sword_aurora',vigilia:'sword_vigilia'};
const SHOP_TAGS={magic:'HABILIDADE 1',magic2:'HABILIDADE 2',magic3:'HABILIDADE 3',ultimate:'ULTIMATE',magic_plus:'APRIMORAMENTO 1',magic2_plus:'APRIMORAMENTO 2',aurora:'ESPADA',vigilia:'ESPADA'};
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
const SWORD_PALETTES={aurora:{blade:0xf3f0e6,edge:0xffe6b0,fuller:0xffd56a,gold:0xe2b04a,pommel:0xffc24a},vigilia:{blade:0xdfe8f5,edge:0x9fc4ff,fuller:0x8fd0ff,gold:0x9aa8c0,pommel:0x7ab8ff}};
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
 showGalaxyScreen({progress:{questStep,bishopsDefeated},save,coins,onSettings:()=>{const gb=document.getElementById('graphics-toggle-3d');if(gb)gb.click();},onCelebrated:()=>{try{delete save.celebrate;localStorage.setItem(GALAXY_STORE,JSON.stringify(save));}catch(_){}},isReady:()=>(!loading||loading.classList.contains('hidden')||loading.style.display==='none')&&worldCompiled,onEnter:()=>{menuGate=false;worldAudio.unlock();if(pendingAwakening){pendingAwakening=false;startPrologue();}}});
}
if(menuGate){pendingAwakening=awakeningActive;awakeningActive=false;const skip=document.getElementById('skip-awakening');if(skip)skip.classList.add('hidden');openGalaxyScreen();}
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
 const show=userSettings.arrow&&questMarker.visible!==false&&!dialogueOpen&&!prologueActive&&!awakeningActive&&questStep<8&&!voidMode;
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
// ---------- Família Arruda (moradores reais do Npc-lod.glb) ----------
const familyRoots=[];
new GLTFLoader().load('./Npc-lod2.glb?v=mod202',gltf=>{
 const base=gltf.scene,clips=gltf.animations||[],idle=clips.find(c=>c.name==='Alert')||clips[0],cross=clips.find(c=>c.name==='_01a156a3_6952_769b_94bf_2cf0e9d19b46');
 const box=measureModelBounds(base),size=box.getSize(new THREE.Vector3()),scale=size.y>.01?(playerReferenceHeight*.97)/size.y:1;
 [[0,0,0x9a8a7a],[1.4,.3,0x7a8a9a]].forEach(([ox,oz,tint],i)=>{const c=cloneSkinned(base),h=new THREE.Group();c.scale.setScalar(scale);c.position.y=-box.min.y*scale;c.rotation.y=Math.PI;h.add(c);
  c.traverse(o=>{if(o.isMesh&&o.material){o.material=o.material.clone();o.material.color.multiply(new THREE.Color(tint));o.material.metalness=0;o.material.metalnessMap=null;if(o.material.map){o.material.emissiveMap=o.material.map;o.material.emissive=new THREE.Color(0x6a5a50);o.material.emissiveIntensity=.8;}}});
  const p=DISTRICT_SPOTS.family,x=p.x+ox,z=p.z+oz;h.position.set(x,groundHeightAt(x,z),z);h.rotation.y=-Math.PI/2;scene.add(h);familyRoots.push(h);
  const m=new THREE.AnimationMixer(c);const a=m.clipAction(i?cross||idle:idle);if(a)a.play();villageNpcMixers.push(m);});
},undefined,err=>console.warn('Família Arruda sem modelo (Npc-lod.glb).',err));
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
 const on=act2Started(questStep),raining=on&&questStep<14;
 
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
function loadRig(name){
 if(rigLoads[name])return rigLoads[name];const def=RIG_DEFS[name];
 rigLoads[name]=new Promise((resolve,reject)=>new GLTFLoader().load(def.file,gltf=>{
  const model=gltf.scene,clips=gltf.animations||[],by=n=>clips.find(c=>c.name===n);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;for(const m of [].concat(o.material))if(m&&!enemyMaterials.includes(m)){m.metalness=Math.min(m.metalness||0,.35);enemyMaterials.push(m);}}});
  const box=measureModelBounds(model),size=box.getSize(new THREE.Vector3()),scale=size.y>.01?(playerReferenceHeight*def.height)/size.y:1;
  model.scale.setScalar(scale);model.position.set(0,-box.min.y*scale,0);model.visible=false;enemyModelRoot.add(model);
  const mixer=new THREE.AnimationMixer(model),actions={};
  const inPlace=clip=>{const c=clip.clone();for(const t of c.tracks){if(!/hips[^.]*\.position$/i.test(t.name))continue;const v=t.values;for(let i=3;i<v.length;i+=3){v[i]=v[0];v[i+2]=v[2];}}return c;};
  for(const [role,clipName] of Object.entries(def.roles)){const c=by(clipName);if(c)actions[role]=mixer.clipAction((def.inPlace||[]).includes(role)?inPlace(c):c);}
  rigs[name]={model,mixer,actions,hasDeath:!!actions.death,timeScales:def.timeScales||null};resolve(rigs[name]);
 },undefined,err=>{console.error(def.file+' não carregou.',err);delete rigLoads[name];reject(err);}));
 return rigLoads[name];
}
function useRig(name){
 if(activeRig==='enemy1'&&enemyModel&&!Object.values(rigs).some(r=>r.model===enemyModel))enemy1Rig={model:enemyModel,mixer:enemyMixer,actions:enemyActions,hasDeath:enemyHasDeathClip};
 const rig=name==='enemy1'?enemy1Rig:rigs[name];if(!rig)return false;if(activeRig===name&&enemyModel===rig.model)return true;
 if(enemyModel)enemyModel.visible=false;if(enemyCurrentAction)enemyCurrentAction.stop();
 enemyModel=rig.model;enemyModel.visible=true;enemyMixer=rig.mixer;enemyActions=rig.actions;enemyHasDeathClip=rig.hasDeath;rigTimeScales=rig.timeScales||null;enemyCurrentAction=null;enemyCurrentRole='';enemySprite.visible=false;enemyModelRoot.visible=true;activeRig=name;return true;
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
 bestiaryKnown.add('vorgazhek');questStep=r.questStep;bishopsDefeated=r.bishopsDefeated;vorgazhekRewardClaimed=true;
 enemy.visible=false;useRig('enemy1');const hud=document.getElementById('enemy-hud');if(hud)hud.classList.remove('boss');
 district.seal.visible=false;district.sealLight.intensity=0;save3DProgress();updateQuestHud();
 showRewardPop((r.coinsGained?'+'+r.coinsGained+' MOEDAS · ':'')+(r.xpGained?'+'+r.xpGained+' XP':''));
 setTimeout(()=>showDialogue(vorgazhekDefeatLines(playerName),()=>{const toast=document.getElementById('quest-toast');if(toast){toast.textContent='ATO II CONCLUÍDO · SEGUNDO SELO QUEBRADO';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),3200);}}),1400);
}
function bossDefeatedPlayer(){
 // Queda diante do Bispo: custa um coração; sem corações, o Arauto recua e o selo volta a arder.
 spendHeart('bishop2');enemyHP=enemyMaxHP;bossRageAnnounced=false;
 if(heartState.hearts<=0){enemy.visible=false;useRig('enemy1');questStep=ACT2.seal;save3DProgress();updateQuestHud();status.textContent='Sem corações. VORGAZHEK recuou para o selo — recupere um coração e volte ao altar.';}
}
function showActCard2(){const card=document.getElementById('act-card');if(!card)return;card.querySelector('#act-kicker').textContent='GALÁXIA 1 · GANÂNCIA · ATO II';card.querySelector('h2').textContent='A dívida dos vivos';card.querySelector('#act-bishop').textContent='VORGAZHEK — O Arauto das Almas Endividadas';card.classList.remove('hidden');const hide=()=>{card.classList.add('hidden');card.removeEventListener('pointerdown',hide);};card.addEventListener('pointerdown',hide);setTimeout(hide,4200);}
// ---------- Interações e progressão do Ato II ----------
function act2Interact(){
 const px=player.position.x,pz=player.position.z;
 if(questStep===ACT2.talkGuide&&Math.hypot(guide.position.x-px,guide.position.z-pz)<=3){showDialogue(act2GuideLines(playerName),()=>{questStep=ACT2.travel;cycleT=0;save3DProgress();updateQuestHud();gorgeGate.sync();showActCard2();status.textContent='A chuva começou. A Garganta da Dívida está aberta, a oeste.';});return true;}
 if(questStep===ACT2.family&&familyNear()){showDialogue(familyLines(playerName),()=>{questStep=ACT2.ledgers;save3DProgress();updateQuestHud();});return true;}
 if(questStep===ACT2.seal&&sealNear()){
  updateHeartsHud(true);if(!canChallengeBishop(heartState)){showDialogue([{who:'Anjo-Guia',text:'Não acenda essa conta de peito vazio. Espere um coração voltar — '+formatTimer(msToNextHeart(heartState))+'.'}]);return true;}
  showDialogue(vorgazhekIntroLines(playerName),()=>{questStep=ACT2.boss;save3DProgress();updateQuestHud();status.textContent='O selo queimou. O portal da dimensão de VORGAZHEK se abriu no altar.';});return true;}
 if(questStep===ACT2.boss&&!dimBattle&&dimPortalNear('bishop2',10)){startBishop2Dimension();return true;}
 return false;
}
function familyNear(){const p=DISTRICT_SPOTS.family;return Math.hypot(p.x-player.position.x,p.z-player.position.z)<3.4;}
function sealNear(){const p=DISTRICT_SPOTS.seal;return Math.hypot(p.x-player.position.x,p.z-player.position.z)<3.4;}
function act2TalkLabel(){if(questStep===ACT2.talkGuide&&Math.hypot(guide.position.x-player.position.x,guide.position.z-player.position.z)<=3)return 'FALAR · ANJO';if(questStep===ACT2.family&&familyNear())return 'FALAR · FAMÍLIA';if(questStep===ACT2.seal&&sealNear())return 'QUEIMAR O SELO';if(questStep===ACT2.boss&&!dimBattle&&dimPortalNear('bishop2',10))return 'ENTRAR NO PORTAL';return '';}
function act2MarkerTarget(){
 if(questStep===ACT2.talkGuide)return guide.position;
 if(questStep===ACT2.travel)return Math.hypot(player.position.x-gorgeGate.spot.x,player.position.z-gorgeGate.spot.z)>14&&player.position.x>-90?gorgeGate.spot:DISTRICT_SPOTS.plaza;
 if(questStep===ACT2.family)return DISTRICT_SPOTS.family;
 if(questStep===ACT2.ledgers){const next=DISTRICT_SPOTS.ledgers.find((_,i)=>!ledgersFound.includes(i));return next||DISTRICT_SPOTS.seal;}
 if(questStep===ACT2.seal)return DISTRICT_SPOTS.seal;
 if(questStep===ACT2.boss&&!dimBattle)return DISTRICT_SPOTS.arena;
 return null;
}
function updateAct2(dt,now){
 if(questStep>=ACT2.talkGuide){const g=GUIDE_ACT2_SPOT;if(Math.hypot(guide.position.x-g.x,guide.position.z-g.z)>.5){guide.position.x=g.x;guide.position.z=g.z;}}
 updateAct2Weather(dt,now);
 if(questStep===ACT2.travel&&Math.hypot(player.position.x-DISTRICT_SPOTS.plaza.x,player.position.z-DISTRICT_SPOTS.plaza.z)<20){questStep=ACT2.family;save3DProgress();updateQuestHud();const toast=document.getElementById('quest-toast');if(toast){toast.textContent='DISTRITO DA FERRUGEM';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2600);}}
 for(const l of district.ledgers){const taken=ledgersFound.includes(l.index);l.group.visible=questStep===ACT2.ledgers&&!taken;if(!l.group.visible)continue;l.glow.material.opacity=.5+Math.sin(now*.004+l.index)*.25;l.book.rotation.y+=dt*.6;
  if(Math.hypot(l.group.position.x-player.position.x,l.group.position.z-player.position.z)<1.7&&!dialogueOpen){const r=collectLedger(ledgersFound,l.index,questStep);ledgersFound=r.found;worldAudio.reveal();showRewardPop('Livro-caixa · '+ledgersFound.length+'/'+ACT2.ledgerTotal);save3DProgress();updateQuestHud();showDialogue(ledgerLines(ledgersFound.length),()=>{if(r.advanced){questStep=ACT2.seal;save3DProgress();updateQuestHud();}});}}
 district.seal.rotation.y+=dt*.8;district.seal.rotation.x=Math.sin(now*.0012)*.3;district.sealLight.intensity=questStep>=ACT2.done?0:1.4+Math.sin(now*.005)*.4;district.seal.visible=questStep<ACT2.done;
 if(questStep>=ACT2.seal&&questStep<ACT2.done&&bishop2LoadState==='idle')loadBishop2();
 act2BossTick();
 const m=act2MarkerTarget();if(m)questMarker.position.set(m.x,terrainHeightAt(m.x,m.z)+.06,m.z);
}
gorgeGate.sync();
/* ===================== MOD 196 — ATOS III E IV (motor genérico de etapas) ===================== */
var lateFound=Array.isArray(saved3DProgress.lateFound)?saved3DProgress.lateFound.slice():[];
var lateFightIndex=Number(saved3DProgress.lateFightIndex)||0,lateBossClaimed=Object.assign({},saved3DProgress.lateBossClaimed||{}),lateFoundStep=Number(saved3DProgress.lateFoundStep)||0;
let lateBossActive=false,lateRigLoading=false,lateTaunted=-1;
function lateDef(){const r=stepDef(questStep);return r?r.def:null;}
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
 if(act===ACT3&&questStep<20){const inValley=Math.hypot(player.position.x-ALTAR_VALLEY.cx,player.position.z-ALTAR_VALLEY.cz)<70;const k=inValley?1:.35;scene.fog.color.lerp(new THREE.Color(0xc8bfae),.35*k);scene.fog.near=Math.min(scene.fog.near,THREE.MathUtils.lerp(scene.fog.near,6,k));scene.fog.far=Math.min(scene.fog.far,THREE.MathUtils.lerp(scene.fog.far,85,k));}
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
 for(const l of lateProps.letters){l.g.visible=questStep===24&&!(lateFoundStep===24&&lateFound.includes(l.index));if(l.g.visible)l.glow.material.opacity=.45+Math.sin(now*.004+l.index)*.25;}
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
 const open=questStep>=FINALE.talk+1&&questStep<FINALE.done;
 if(open){for(const m of [portalRing,portalInnerRing,portalCore,vortex,portalFloorGlow,portalSigil])m.visible=true;portalLight.color.setHex(0xff3a3a);portalLight.intensity=3;portalRing.material.emissive.setHex(0xa01818);portalBeacon.visible=true;portalBeacon.material.color.setHex(0xff6a6a);}
}
// ---------- Vazio da Ganância: arena abaixo do mundo, olhos em várias distâncias ----------
const voidArena=(()=>{
 const g=new THREE.Group();g.position.set(VOID.x,VOID.y,VOID.z);g.visible=false;scene.add(g);
 const runeTex=(()=>{const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle='#120609';x.fillRect(0,0,512,512);x.strokeStyle='rgba(220,60,40,.55)';x.lineWidth=3;for(const r of [70,150,230]){x.beginPath();x.arc(256,256,r,0,Math.PI*2);x.stroke();}for(let i=0;i<12;i++){const a=i/12*Math.PI*2;x.beginPath();x.moveTo(256+Math.cos(a)*70,256+Math.sin(a)*70);x.lineTo(256+Math.cos(a)*250,256+Math.sin(a)*250);x.stroke();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
 const floor=new THREE.Mesh(new THREE.CircleGeometry(VOID.radius+2,64),new THREE.MeshStandardMaterial({color:0x6a3a40,map:runeTex,emissiveMap:runeTex,roughness:.35,metalness:.3,emissive:0xffffff,emissiveIntensity:.55}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;g.add(floor);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(VOID.radius+1.5,.12,6,96),new THREE.MeshBasicMaterial({color:0xc0302a,toneMapped:false}));rim.rotation.x=Math.PI/2;rim.position.y=.05;g.add(rim);
 const eyeTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const gr=x.createRadialGradient(32,32,2,32,32,30);gr.addColorStop(0,'#fff6c0');gr.addColorStop(.18,'#ffb020');gr.addColorStop(.32,'#a01010');gr.addColorStop(.6,'rgba(60,0,0,.5)');gr.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gr;x.beginPath();x.ellipse(32,32,30,14,0,0,Math.PI*2);x.fill();x.fillStyle='#000';x.beginPath();x.ellipse(32,32,3,11,0,0,Math.PI*2);x.fill();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
 const eyes=[];for(let i=0;i<46;i++){const a=Math.random()*Math.PI*2,r=45+Math.random()*180,y=4+Math.random()*90,s=4+r*.09+Math.random()*6;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:eyeTex,transparent:true,depthWrite:false,fog:false,toneMapped:false,blending:THREE.AdditiveBlending}));sp.position.set(Math.cos(a)*r,y,Math.sin(a)*r);sp.scale.set(s*2,s,1);g.add(sp);eyes.push({sp,phase:Math.random()*10,base:s});}
 return{group:g,eyes,rim};
})();
const savedSky={};
function enterVoid(){
 voidSpec={x:VOID.x,z:VOID.z,y:VOID.y,radius:VOID.radius};dimKey=null;voidMode=true;voidArena.group.visible=true;skyDome.visible=false;portalBeacon.visible=false;sunDisk.visible=false;sunHalo.visible=false;if(moonRoot)moonRoot.visible=false;if(starField)starField.visible=false;
 savedSky.bg=scene.background.getHex();const x=VOID.x,z=VOID.z+12;player.position.set(x,VOID.y,z);playerYaw=Math.PI;cameraYaw=0;moveVX=moveVZ=0;camera.position.set(x,VOID.y+3.5,z+8.5);
}
function leaveVoid(){voidMode=false;voidArena.group.visible=false;for(const k in dimArenas)dimArenas[k].group.visible=false;dimLight.intensity=0;voidSpec={x:VOID.x,z:VOID.z,y:VOID.y,radius:VOID.radius};dimKey=null;skyDome.visible=true;renderer.toneMappingExposure=1;}
function updateVoid(dt,now){
 updateDimensionPortals(now);
 if(!voidMode)return;
 const arena=dimKey?dimArenas[dimKey]:null;
 if(arena){const e=arena.env;scene.background.setHex(e.bg);scene.fog.color.setHex(e.fog);scene.fog.near=e.fogNear;scene.fog.far=e.fogFar;hemiLight.color.setHex(e.hemi[0]);hemiLight.groundColor.setHex(e.hemi[1]);hemiLight.intensity=e.hemi[2];sunLight.color.setHex(e.sun[0]);sunLight.intensity=e.sun[1];fill.intensity=.2;renderer.toneMappingExposure=e.exposure;
  dimLight.color.setHex(e.light[0]);dimLight.intensity=e.light[1]*(1+Math.sin(now*.004)*.05);dimLight.distance=e.light[2];dimLight.position.set(voidSpec.x+e.light[3][0],voidSpec.y+e.light[3][1],voidSpec.z+e.light[3][2]);
  arena.update(now,camera,innerHeight*renderer.getPixelRatio());
  if(dimBattle&&dimBattle.active&&dimBattle.key==='bishop1'&&enemy.visible&&enemyAlive&&!bossRageAnnounced&&bossPhase(enemyHP,enemyMaxHP)===2){bossRageAnnounced=true;showCombatCallout('FÚRIA DO GUARDIÃO');status.textContent='VALÉRIO: “'+DIMENSIONS.bishop1.rage+'”';enemyCastCooldown=0;cameraShake(.2);vibrate(60);}
  return;}
 scene.background.setHex(0x050206);scene.fog.color.setHex(0x0a0306);scene.fog.near=20;scene.fog.far=260;hemiLight.intensity=1.1;hemiLight.color.setHex(0xffb0a8);hemiLight.groundColor.setHex(0x401018);sunLight.intensity=.6;renderer.toneMappingExposure=1.1;
 dimLight.color.setHex(0xff4a3a);dimLight.intensity=3.2;dimLight.distance=90;dimLight.position.set(VOID.x,VOID.y+14,VOID.z);
 for(const e of voidArena.eyes){const blink=Math.max(.08,Math.abs(Math.sin(now*.0007+e.phase))>0.97?.1:1);e.sp.scale.y=e.base*blink;e.sp.material.opacity=.55+.35*Math.sin(now*.002+e.phase);}
 voidArena.rim.material.color.setHSL(0,.7,.35+.1*Math.sin(now*.003));
}
// ---------- Etapas ----------
function finaleInteract(){
 const px=player.position.x,pz=player.position.z;
 if(questStep===FINALE.talk&&Math.hypot(guide.position.x-px,guide.position.z-pz)<=3.2){showDialogue(finaleTalkLines(playerName),()=>{questStep=FINALE.gauntlet;gauntletIndex=0;save3DProgress();updateQuestHud();syncFinalPortal();showLateActCard({kicker:'GALÁXIA 1 · ARCO FINAL',title:'A raiz de todos os males',bishop:'O Pecado da Ganância'});});return true;}
 if(questStep===FINALE.gauntlet&&!finaleFighting&&gauntletIndex<GAUNTLET.length&&Math.hypot(FINAL_PORTAL.x-px,FINAL_PORTAL.z-pz)<6){
  updateHeartsHud(true);if(!canChallengeBishop(heartState)){showDialogue([{who:'Anjo-Guia',text:'Sem corações, não. Espere um voltar — '+formatTimer(msToNextHeart(heartState))+'.'}]);return true;}
  showDialogue(gauntletIndex===0?gauntletIntroLines():[{who:GAUNTLET[gauntletIndex].name.split(' · ')[0],text:GAUNTLET[gauntletIndex].line}],()=>startGauntletFight());return true;}
 return false;
}
function finaleTalkLabel(){const px=player.position.x,pz=player.position.z;if(questStep===FINALE.talk&&Math.hypot(guide.position.x-px,guide.position.z-pz)<=3.2)return 'FALAR · ANJO';if(questStep===FINALE.gauntlet&&!finaleFighting&&gauntletIndex<GAUNTLET.length&&Math.hypot(FINAL_PORTAL.x-px,FINAL_PORTAL.z-pz)<6)return 'ENFRENTAR OS GUARDIÕES';return '';}
function startGauntletFight(){const g=GAUNTLET[gauntletIndex];ensureRig(g.rig,()=>{useRig(g.rig);finaleFighting=true;bossRageAnnounced=false;bossComboHits=0;const spot={x:FINAL_PORTAL.x,z:FINAL_PORTAL.z-1};revealEncounter(g.profile,spot,g.hp,g.line);checkpointX=FINAL_PORTAL.x;checkpointZ=FINAL_PORTAL.z+6;const hud=document.getElementById('enemy-hud');if(hud)hud.classList.add('boss');});}
function startSinForm(){const f=SIN_FORMS[sinForm];ensureRig(f.rig,()=>{useRig(f.rig);finaleFighting=true;bossRageAnnounced=false;bossComboHits=0;revealEncounter(f.profile,{x:VOID.x,z:VOID.z-4},f.hp,f.line);if(enemyActions.arise&&sinForm>0){playEnemyAnimation('arise',.1,true);enemyAttackCooldown=2.2;}checkpointX=VOID.x;checkpointZ=VOID.z+12;const hud=document.getElementById('enemy-hud');if(hud)hud.classList.add('boss');showCombatCallout(f.name);});}
function finaleCombatActive(){return finaleFighting&&(questStep===FINALE.gauntlet||questStep===FINALE.sin);}
function finaleNameFor(profile){const g=GAUNTLET.find(x=>x.profile===profile)||SIN_FORMS.find(x=>x.profile===profile);return g?g.name:null;}
function finaleHandleDefeat(){
 if(!finaleFighting)return false;
 if(questStep===FINALE.gauntlet){finaleFighting=false;enemy.visible=false;enemyAlive=true;const r=nextGauntlet(gauntletIndex);gauntletIndex=r.index;save3DProgress();
  if(!r.done){showRewardPop('Guardião '+gauntletIndex+'/4 em paz');setTimeout(()=>{const g=GAUNTLET[gauntletIndex];showDialogue([{who:g.name.split(' · ')[0],text:g.line}],()=>startGauntletFight());},1500);}
  else{const hud=document.getElementById('enemy-hud');if(hud)hud.classList.remove('boss');setTimeout(()=>showDialogue([{who:'VÉRAXION',text:'…Então vai. E não deixes ela te chamar pelo nome.'},{who:'Anjo-Guia',text:'Segure firme. O portal vai puxar com força desta vez.'}],()=>{questStep=FINALE.sin;sinForm=0;save3DProgress();updateQuestHud();showPortalVeil(true);setTimeout(()=>{enterVoid();showPortalVeil(false);showDialogue(sinIntroLines(playerName),()=>startSinForm());},900);}),1200);}
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
 const light=new THREE.PointLight(0xffe0a0,0,30,1.2);light.position.y=4;g.add(light);
 const bolts=[];for(let i=0;i<6;i++){const pts=[];let x=0,z=0;for(let k=0;k<9;k++){pts.push(new THREE.Vector3(x,k*2.6,z));x+=(Math.random()-.5)*1.4;z+=(Math.random()-.5)*1.4;}const ln=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xfff6c8,transparent:true,opacity:0,toneMapped:false}));const a=i/6*Math.PI*2;ln.position.set(Math.cos(a)*3,0,Math.sin(a)*3);g.add(ln);bolts.push(ln);}
 const wave=new THREE.Mesh(new THREE.RingGeometry(.5,1,48),goldMat.clone());wave.rotation.x=-Math.PI/2;wave.position.y=.12;g.add(wave);
 ultimateFx={g,ring,ring2,pillar,sword,light,bolts,wave,t:0,hit:false,target:tgt};
 status.textContent='“O Senhor é a minha luz e a minha salvação; de quem terei medo?”';showCombatCallout('JULGAMENTO DIVINO');
}
function updateUltimateFx(dt){
 const f=ultimateFx;if(!f)return;f.t+=dt;const t=f.t;
 const tele=Math.min(1,t/1.1);f.ring.material.opacity=tele*.9;f.ring2.material.opacity=tele*.8;f.ring.rotation.z+=dt*.8;f.ring2.rotation.z-=dt*1.6;
 f.pillar.material.opacity=t<1.1?tele*.35:Math.max(0,.6-(t-1.1)*.7);f.pillar.scale.x=f.pillar.scale.z=t<1.1?1:1+(t-1.1)*2;
 if(t>.7&&t<1.25){const k=(t-.7)/.55;f.sword.position.y=34-33*k*k;}
 if(t>=1.25&&!f.hit){f.hit=true;f.sword.position.y=1;cameraShake(.4);hitStop(140);vibrate(90);burstSparks(f.target.clone().setY(f.target.y+1),0xfff0b8);worldAudio.magic&&worldAudio.magic('ultimate');
  if(combatStepNow()&&enemy.visible&&enemyAlive&&Math.hypot(enemy.position.x-f.target.x,enemy.position.z-f.target.z)<4.6){const dmg=Math.round(60*(1+statsForLevel(playerLevel()).damageBonus));enemyHP=Math.max(0,enemyHP-dmg);onEnemyDamaged(dmg,true);enemyKnockback=.9;const dx=enemy.position.x-f.target.x,dz=enemy.position.z-f.target.z,d=Math.hypot(dx,dz)||1;enemyKnockbackX=dx/d;enemyKnockbackZ=dz/d;
   if(enemyHP===0){enemyAlive=false;const hud=document.getElementById('enemy-hud');if(hud)hud.style.display='none';if(!playEnemyAnimation('death',.06,true))enemyHasDeathClip=false;setTimeout(()=>advanceAfterEnemyDefeat(),850);}else playEnemyAnimation('hit',.05,true);}}
 if(f.hit){const k=t-1.25;f.light.intensity=Math.max(0,6-k*5);for(const b of f.bolts){b.material.opacity=k<.5?(Math.random()>.4?.95:.2):Math.max(0,.9-k);b.rotation.y+=dt*3;}f.wave.scale.setScalar(1+k*12);f.wave.material.opacity=Math.max(0,.8-k*.9);f.ring.material.opacity=Math.max(0,.9-k);f.ring2.material.opacity=Math.max(0,.8-k);f.sword.position.y=1-k*1.2;f.sword.children.forEach(c=>{if(c.material){c.material.transparent=true;c.material.opacity=Math.max(0,1-k*.8);}});}
 if(t>2.6){scene.remove(f.g);f.g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});ultimateFx=null;}
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
 const fp=cameraDistance<1.05,base=fp?72:56,want=dashRemaining>0?7:0;fovKick+=(want-fovKick)*Math.min(1,dt*(want?14:5));
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
const BOSS_POWERS={
 valerio:{cd:8,run(){status.textContent='VALÉRIO: “Cada moeda é uma alma.” As moedas caem sobre você!';for(let i=0;i<4;i++){const a=Math.random()*6.28,r=1+Math.random()*4;spawnHazard({x:player.position.x+Math.cos(a)*r,z:player.position.z+Math.sin(a)*r,radius:1.7,delay:1+i*.3,damage:16,color:0xffc04a});}if(bossRageAnnounced)castBlackHole(enemy.position.x,enemy.position.z);}},
 vorgazhek:{cd:7.5,run(){status.textContent='VORGAZHEK estende o livro: as correntes da dívida caem sobre você!';const px=player.position.x,pz=player.position.z,vx=moveVX*.5,vz=moveVZ*.5;for(let i=0;i<3;i++)spawnHazard({x:px+vx*(i+1),z:pz+vz*(i+1),radius:2.1,delay:.9+i*.45,damage:18,color:0xd25a2a});}},
 zarkhael:{cd:8,run(){status.textContent="ZAR'KHAEL ergue a mão: o juízo cai em pilares!";for(let i=0;i<5;i++){const a=Math.random()*6.28,r=1+Math.random()*4.5;spawnHazard({x:player.position.x+Math.cos(a)*r,z:player.position.z+Math.sin(a)*r,radius:1.8,delay:1.1+i*.18,damage:20,color:0xffc04a});}}},
 veraxion:{cd:8.5,run(){status.textContent='VÉRAXION fecha o selo ao seu redor — saia do círculo!';spawnHazard({x:player.position.x,z:player.position.z,radius:4.2,delay:1.5,damage:26,color:0x7aa0ff});spawnHazard({x:enemy.position.x,z:enemy.position.z,radius:2.6,delay:1.5,damage:20,color:0x7aa0ff});}},
 greed1:{cd:9,run(){castBlackHole(enemy.position.x+(player.position.x-enemy.position.x)*.5,enemy.position.z+(player.position.z-enemy.position.z)*.5);}},
 greed2:{cd:7.5,run(){if(Math.random()<.5)castBlackHole(player.position.x+Math.sin(cameraYaw)*2,player.position.z+Math.cos(cameraYaw)*2);else BOSS_POWERS.zarkhael.run();}},
 greed3:{cd:6.5,run(){castBlackHole(player.position.x,player.position.z);BOSS_POWERS.vorgazhek.run();}}
};
BOSS_POWERS.fallen1={cd:9,run(){castBlackHole(enemy.position.x,enemy.position.z);}};
BOSS_POWERS.fallen2=BOSS_POWERS.vorgazhek;BOSS_POWERS.fallen3=BOSS_POWERS.zarkhael;BOSS_POWERS.fallen4=BOSS_POWERS.veraxion;
let bossPowerCd=4;
function updateBossPowers(dt){
 const power=BOSS_POWERS[encounterProfile];
 if(!power||!enemy.visible||!enemyAlive||!combatStepNow()||dialogueOpen||playerHP<=0){bossPowerCd=Math.max(bossPowerCd,3);if(!enemy.visible||!enemyAlive)clearHazards();return;}
 bossPowerCd-=dt;if(bossPowerCd>0)return;
 const d=Math.hypot(enemy.position.x-player.position.x,enemy.position.z-player.position.z);if(d>14)return;
 power.run();bossPowerCd=power.cd*(bossRageAnnounced?.65:1);
}
// ---------- Habilidades de arma dos inimigos (Enemy3+): investida com aviso ----------
let foeSkillCd=5;
function updateFoeWeaponSkills(dt){
 if(!['zealot','hollow','arena'].includes(encounterProfile)||!enemy.visible||!enemyAlive||!combatStepNow()||dialogueOpen)return;
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
 voidTest(){enterVoid();},
 cullInfo(){return instanceCullers.map(c=>({n:c.n,count:c.mesh.count,verts:c.mesh.geometry.attributes.position.count,min:Math.sqrt(c.min2),max:Math.sqrt(c.r2)}));},
 triBreakdown(){const out=[];scene.traverse(o=>{if(!o.isMesh&&!o.isPoints)return;let v=true,q=o;while(q){if(!q.visible){v=false;break;}q=q.parent;}if(!v)return;const g=o.geometry;if(!g)return;const n=g.index?g.index.count/3:(g.attributes.position?g.attributes.position.count/3:0);const inst=o.isInstancedMesh?o.count:1;let path='',pp=o.parent,d=0;while(pp&&d<4){path+='<'+(pp.name||pp.type);pp=pp.parent;d++;}const wp=new THREE.Vector3();o.getWorldPosition(wp);out.push({gt:g.type,gp:g.parameters?JSON.stringify(g.parameters).slice(0,80):'',mc:o.material&&o.material.color?o.material.color.getHexString():'',name:(o.name||o.type)+path,dist:Math.round(Math.hypot(wp.x-player.position.x,wp.z-player.position.z)),mat:(o.material&&o.material.name)||'',tri:Math.round(n*inst),inst,skinned:!!o.isSkinnedMesh,verts:g.attributes.position?g.attributes.position.count:0});});out.sort((a,b)=>b.tri-a.tri);return{total:out.reduce((a,b)=>a+b.tri,0),count:out.length,top:out.slice(0,40)};},
 rinfo(){return{geo:renderer.info.memory.geometries,tex:renderer.info.memory.textures,prog:renderer.info.programs?renderer.info.programs.length:0,shadow:sunLight.castShadow,pr:renderer.getPixelRatio(),lights:scene.children.filter(o=>o.isLight).length};},
 startDim(key){const d=DIMENSIONS[key];startDimensionBattle(key,{hp:d.hp,returnTo:{x:player.position.x,z:player.position.z},onVictory(){},onAbort(){}});},
 vsGo(){const b=document.getElementById('vs-go');if(b&&!b.disabled)b.click();return b?b.textContent:null;},
 setHour(h){setGameHour(h);},
 killBoss(){if(enemy.visible){enemyHP=1;}},
 nearBoss(){if(!enemy.visible)return -1;const dx=player.position.x-enemy.position.x,dz=player.position.z-enemy.position.z,l=Math.hypot(dx,dz)||1;player.position.x=enemy.position.x+dx/l*1.5;player.position.z=enemy.position.z+dz/l*1.5;return l;},
 hurtPlayer(n){playerHP=Math.max(1,playerHP-(n||10));updatePlayerHud();},
 power(){bossPowerCd=0;foeSkillCd=0;},
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