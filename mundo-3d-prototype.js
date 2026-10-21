import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned, retargetClip } from 'three/addons/utils/SkeletonUtils.js';
import { ACT1, sanitizePlayerName, migrateProgress, questPresentation, guideAwakeningLines, guideAfterNameLines, informantPoorLines, informantLines, captorTauntLines, freeChildrenLines, reunionLines, wardenTauntLines, portalBlockedLines, portalLines, afterEnemyDefeated, afterMountainDefeat, afterWardenDefeat, valerioHandoffPlan } from './act1-flow.js';

const canvas=document.getElementById('scene'),status=document.getElementById('status'),loading=document.getElementById('loading');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xb8d4d7);
scene.fog=new THREE.Fog(0xa9c4c2,58,205);
const camera=new THREE.PerspectiveCamera(56,innerWidth/innerHeight,.1,280);
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
const sunPosition=new THREE.Vector3(-18,58,-170);
const sunLight=new THREE.DirectionalLight(0xffe6b5,2.1);sunLight.position.copy(sunPosition);sunLight.castShadow=true;
sunLight.shadow.mapSize.set(512,512);sunLight.shadow.camera.left=-68;sunLight.shadow.camera.right=68;sunLight.shadow.camera.top=68;sunLight.shadow.camera.bottom=-68;sunLight.shadow.bias=-0.0004;sunLight.shadow.normalBias=.035;scene.add(sunLight);
const fill=new THREE.DirectionalLight(0xa9d2e8,.48);fill.position.set(30,18,-22);scene.add(fill);

// Luz ambiente e sombra mais suaves, preservando o custo baixo no celular.
sunLight.shadow.camera.left=-76;sunLight.shadow.camera.right=76;sunLight.shadow.camera.top=76;sunLight.shadow.camera.bottom=-76;
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
const ground=new THREE.Mesh(new THREE.PlaneGeometry(280,280),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.04;ground.receiveShadow=true;scene.add(ground);
// Colina escalável: a trilha sobe suavemente até o santuário do portal.
const CLEARING={x:0,z:-29},PORTAL={x:44,z:-119},JOURNEY_ENEMIES=[{x:0,z:-59},{x:2.4,z:-79},{x:15,z:-99}];
const MOUNTAIN_SENTRIES=[{x:20,z:-103},{x:33,z:-113}],WARDEN_SPOT={x:41,z:-117};
function hillHeightAt(x,z){
 const progress=THREE.MathUtils.clamp((-z-70)/49,0,1),rise=progress*progress*(3-2*progress);
 const hillCenterX=44*progress,ax=Math.abs(x-hillCenterX);
 const edge=THREE.MathUtils.clamp((30-ax)/18,0,1),width=edge*edge*(3-2*edge);
 return 5.5*rise*width;
}
{
 const vertices=[],colors=[],indices=[],xSteps=34,zSteps=47,xMin=-34,zMin=-156,dx=2,dz=2;
 for(let iz=0;iz<=zSteps;iz++)for(let ix=0;ix<=xSteps;ix++){
  const x=xMin+ix*dx,z=zMin+iz*dz,y=hillHeightAt(x,z);
  vertices.push(x,y-.025,z);
  const n=.88+.08*Math.sin(x*1.7+z*.61)+.04*Math.sin(z*2.3-x*.8),shade=THREE.MathUtils.clamp(n,.68,1);
  colors.push(.29*shade,.30*shade,.32*shade);
  if(ix<xSteps&&iz<zSteps){const a=iz*(xSteps+1)+ix,b=a+1,c=a+xSteps+1,d=c+1;indices.push(a,c,b,b,c,d);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
 const hill=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));hill.receiveShadow=true;hill.castShadow=false;scene.add(hill);
}

/* MOD 183 — limites de exploração ampliados para permitir alcançar a região das serras; árvores/rochas seguem com colisão própria. */
/* MOD 178 — serras low-poly ao horizonte: poucos draws, sem sombras e sem colisões. */
/* Montanhas facetadas e irregulares: geometria compartilhada para manter poucos draw calls. */
function makeRuggedMountainGeometry(){
 const sides=9,rings=[[0,.82],[.12,1],[.31,.78],[.53,.58],[.74,.37],[.91,.19]],vertices=[],indices=[];
 const jag=[1.04,.82,1.12,.9,1.08,.78,1.15,.88,.97];
 for(let r=0;r<rings.length;r++){
  const [y,base]=rings[r];
  for(let i=0;i<sides;i++){
   const a=i/sides*Math.PI*2,rad=base*jag[i];
   vertices.push(Math.cos(a)*rad,y+(r>1&&r<5?((i%3)-1)*.025:0),Math.sin(a)*rad);
  }
 }
 for(let r=0;r<rings.length-1;r++)for(let i=0;i<sides;i++){
  const a=r*sides+i,b=r*sides+(i+1)%sides,c=(r+1)*sides+(i+1)%sides,d=(r+1)*sides+i;
  if((r+i)%2){indices.push(a,b,d,b,c,d);}else{indices.push(a,b,c,a,c,d);}
 }
 const top=vertices.length/3;vertices.push(.035,1.06,-.025);
 for(let i=0;i<sides;i++)indices.push((rings.length-1)*sides+i,(rings.length-1)*sides+(i+1)%sides,top);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
const mountainFarGeometry=makeRuggedMountainGeometry();
const mountainFarMaterial=new THREE.MeshStandardMaterial({color:0x667e82,roughness:1,flatShading:true});
const mountainNearMaterial=new THREE.MeshStandardMaterial({color:0x526d60,roughness:1,flatShading:true});
const mountainFarLayout=[
 [-124,-128,23,43],[-86,-141,29,52],[-40,-145,20,37],[8,-148,27,48],[57,-143,24,44],[104,-132,30,55],[133,-101,23,39],
 [143,-48,28,49],[145,14,22,39],[132,72,31,53],[105,116,24,42],[56,139,29,48],[0,145,23,41],[-57,138,31,54],[-106,116,25,43],[-135,74,29,50],[-145,16,22,39],[-141,-48,27,47],[-99,-92,18,31],[93,-94,20,34]
];
const mountainNearLayout=[[-112,-62,15,26],[-108,9,18,31],[-94,75,16,28],[-54,105,14,24],[0,117,18,31],[54,105,15,26],[96,74,18,30],[108,8,15,26],[101,-62,18,31],[-72,-28,12,21],[-38,88,13,22],[72,-38,14,24],[28,98,11,19],[-125,40,16,28],[118,48,15,27]];
function buildMountainRidge(layout,material,colorA,colorB){
 const mesh=new THREE.InstancedMesh(mountainFarGeometry,material,layout.length),dummy=new THREE.Object3D(),a=new THREE.Color(colorA),b=new THREE.Color(colorB);
 for(let i=0;i<layout.length;i++){
  const [x,z,radius,height]=layout[i];
  dummy.position.set(x,height*.48-.08,z);dummy.scale.set(radius,height,radius*(.78+(i%4)*.09));dummy.rotation.set(0,(i%5)*.31,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  mesh.setColorAt(i,a.clone().lerp(b,(i%7)/6));
 }
 mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=true;scene.add(mesh);return mesh;
}
const distantMountainRidge=buildMountainRidge(mountainFarLayout,mountainFarMaterial,0x647d83,0x8ca3a0);
const forestMountainRidge=buildMountainRidge(mountainNearLayout,mountainNearMaterial,0x3e5b4a,0x71836a);

/* MOD 181 — Lua 3D + ciclo dia/noite + expansão controlada do horizonte. */
const moonPosition=new THREE.Vector3(42,72,95);
let moonRoot=null,moonVisible=false;
new GLTFLoader().load('./Lua.glb?v=mod181-moon',gltf=>{
 const moon=gltf.scene;
 moon.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.frustumCulled=false;if(o.material){o.material.toneMapped=false;o.material.emissive=o.material.emissive||new THREE.Color(0x223344);}}});
 const bounds=new THREE.Box3().setFromObject(moon),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const target=7.5,scale=size.y>.001?target/size.y:1;
 moon.scale.setScalar(scale);moon.position.set(-center.x*scale,-center.y*scale,-center.z*scale);
 moonRoot=new THREE.Group();moonRoot.position.copy(moonPosition);moonRoot.add(moon);moonRoot.visible=false;scene.add(moonRoot);moonVisible=true;
},undefined,err=>console.warn('Lua.glb não carregou; mantendo céu sem modelo 3D.',err));

const dayNightState={mode:'day',t:0,target:0};
const villageTorchLights=[];
const dayPreset={bg:0xb8d4d7,fog:0xa9c4c2,fogNear:58,fogFar:205,hemiSky:0xeaf7ff,hemiGround:0x59684b,hemiInt:1.55,sunInt:2.1,fillInt:.48,exposure:1.02,sunDiskVis:true,moonVis:false,torchInt:.35};
const nightPreset={bg:0x0b1420,fog:0x0e1a24,fogNear:28,fogFar:145,hemiSky:0x1a2a3c,hemiGround:0x1a2218,hemiInt:.42,sunInt:.08,fillInt:.12,exposure:.88,sunDiskVis:false,moonVis:true,torchInt:1.55};
function lerpColorHex(a,b,t){const ca=new THREE.Color(a),cb=new THREE.Color(b);return ca.lerp(cb,t);}
function applyDayNightVisual(t){
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
 renderer.toneMappingExposure=THREE.MathUtils.lerp(dayPreset.exposure,nightPreset.exposure,p);
 if(sunDisk)sunDisk.visible=p<.55;
 if(sunHalo)sunHalo.visible=p<.55;
 if(moonRoot)moonRoot.visible=p>.35;
 for(const light of villageTorchLights)light.intensity=THREE.MathUtils.lerp(dayPreset.torchInt,nightPreset.torchInt,p);
 // Gradiente do céu diurno → noturno
 if(skyDome&&skyDome.geometry&&skyDome.geometry.attributes.color){
  const cols=skyDome.geometry.attributes.color,pos=skyDome.geometry.attributes.position;
  const dayH=new THREE.Color(0xc4dbd4),dayZ=new THREE.Color(0x559dcc);
  const nightH=new THREE.Color(0x121a28),nightZ=new THREE.Color(0x0a1020);
  for(let i=0;i<pos.count;i++){
   const y=pos.getY(i)/220;let u=THREE.MathUtils.clamp((y+.12)/.94,0,1);u=u*u*(3-2*u);
   const d=dayH.clone().lerp(dayZ,u),n=nightH.clone().lerp(nightZ,u),c=d.lerp(n,p);
   cols.setXYZ(i,c.r,c.g,c.b);
  }
  cols.needsUpdate=true;
 }
}
function setDayNightMode(mode){
 dayNightState.mode=mode==='night'?'night':'day';
 dayNightState.target=dayNightState.mode==='night'?1:0;
 try{localStorage.setItem('seven-sins-3d-daynight',dayNightState.mode);}catch(e){}
 const btn=document.getElementById('daynight-toggle-3d');
 if(btn){btn.textContent=dayNightState.mode==='night'?'NOITE':'DIA';btn.setAttribute('aria-pressed',String(dayNightState.mode==='night'));}
}
function updateDayNight(dt){
 const speed=1.35;
 if(Math.abs(dayNightState.t-dayNightState.target)<.002){dayNightState.t=dayNightState.target;applyDayNightVisual(dayNightState.t);return;}
 dayNightState.t=THREE.MathUtils.lerp(dayNightState.t,dayNightState.target,1-Math.exp(-speed*dt));
 applyDayNightVisual(dayNightState.t);
}
(function initDayNightUI(){
 let saved='day';try{const v=localStorage.getItem('seven-sins-3d-daynight');if(v==='night'||v==='day')saved=v;}catch(e){}
 const btn=document.getElementById('daynight-toggle-3d');
 if(btn)btn.addEventListener('click',()=>setDayNightMode(dayNightState.mode==='night'?'day':'night'));
 setDayNightMode(saved);
 if(saved==='night'){dayNightState.t=1;applyDayNightVisual(1);}
})();



const VILLAGE_CENTER={x:-12.2,z:-44.5},VILLAGE_CLEAR_RADIUS=14.2;
const treeGroup=new THREE.Group();scene.add(treeGroup);
const treeObstacles=[],rockObstacles=[],marketObstacles=[],walkableObstacles=[],treeSpecs=[];
const leafMid=mat(0x245035),mossMatA=mat(0x34522e),mossMatB=mat(0x465e32),grassMatA=mat(0x58763d),grassMatB=mat(0x304d31);
const canopyWindUniforms=[leafMat,leafMid,leafLight].map((material,i)=>addInstancedWind(material,.075,'clamp((position.y+1.175)/2.35,0.0,1.0)',.72,'forest-canopy-wind-v163-'+i));
const mainTrail=[[0,14],[0,4],[.5,-6],[-1.8,-17],[0,-29],[2.2,-43],[-1.2,-59],[-2,-76],[5,-91],[15,-99],[27,-108],[44,-119],[46,-132],[45,-140]];
const villageTrail=[[2.2,-43],[0,-41],[-4.6,-41.4],[-8.7,-43.3],[-12.2,-44.5]];
const trailRoutes=[{points:mainTrail,width:5.2},{points:villageTrail,width:4.0}];
function addTrail(points,width){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],hillHeightAt(p[0],p[1]),p[1])),false,'centripetal');
 const steps=Math.max(48,points.length*14),vertices=[],uvs=[],indices=[];
 for(let i=0;i<=steps;i++){
  const t=i/steps,center=curve.getPoint(t),tangent=curve.getTangent(t),side=new THREE.Vector3(tangent.z,0,-tangent.x).normalize(),k=vertices.length/3;
  const x1=center.x+side.x*width*.5,z1=center.z+side.z*width*.5,x2=center.x-side.x*width*.5,z2=center.z-side.z*width*.5;
  vertices.push(x1,hillHeightAt(x1,z1)+.035,z1,x2,hillHeightAt(x2,z2)+.035,z2);
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
function makeTree(x,z,s=1){const height=7.2+rand()*3.2;treeSpecs.push({x,z,s,height});treeObstacles.push({x,z,radius:.34*s+.18});}
for(let i=0;i<720;i++){
 const x=(rand()-.5)*116,z=15-rand()*153;
 if(Math.hypot(x,z-4)<6.5||Math.hypot(x-CLEARING.x,z-CLEARING.z)<8.6||Math.hypot(x-VILLAGE_CENTER.x,z-VILLAGE_CENTER.z)<VILLAGE_CLEAR_RADIUS+1)continue;
 if(trailRoutes.some(route=>closeToPolyline(x,z,route.points,route.width*.5+1.25)))continue;
 makeTree(x,z,.78+rand()*.88);
}
const treeDummy=new THREE.Object3D(),trunkGeo=new THREE.CylinderGeometry(.18,.34,1,7,1),rootGeo=new THREE.CylinderGeometry(.29,.48,.46,7,1),crownGeo=new THREE.IcosahedronGeometry(1,1);
const trunkInstances=new THREE.InstancedMesh(trunkGeo,barkMat,treeSpecs.length),rootInstances=new THREE.InstancedMesh(rootGeo,barkMat,treeSpecs.length);
trunkInstances.castShadow=true;trunkInstances.receiveShadow=true;rootInstances.castShadow=false;rootInstances.receiveShadow=true;
const crownInstances=[leafMat,leafMid,leafLight].map(material=>new THREE.InstancedMesh(crownGeo,material,treeSpecs.length));
for(const crown of crownInstances){crown.castShadow=false;crown.receiveShadow=true;}
for(let i=0;i<treeSpecs.length;i++){
 const t=treeSpecs[i],height=t.height*t.s;
 treeDummy.position.set(t.x,height*.5,t.z);treeDummy.scale.set(t.s,height,t.s);treeDummy.rotation.set(0,rand()*Math.PI*2,0);treeDummy.updateMatrix();trunkInstances.setMatrixAt(i,treeDummy.matrix);
 treeDummy.position.set(t.x,.23*t.s,t.z);treeDummy.scale.set(t.s,t.s,t.s);treeDummy.rotation.set(0,rand()*Math.PI*2,0);treeDummy.updateMatrix();rootInstances.setMatrixAt(i,treeDummy.matrix);
 for(let j=0;j<3;j++){
  const offset=(rand()-.5)*.18*t.s,level=.57+j*.14;
  treeDummy.position.set(t.x+offset,height*level,t.z+(rand()-.5)*.16*t.s);
  const crownScale=1.68-j*.2;treeDummy.scale.set(t.s*crownScale,t.s*(1.43-j*.06),t.s*crownScale);treeDummy.rotation.set(0,rand()*Math.PI*2,0);treeDummy.updateMatrix();crownInstances[j].setMatrixAt(i,treeDummy.matrix);
 }
}
trunkInstances.instanceMatrix.needsUpdate=true;rootInstances.instanceMatrix.needsUpdate=true;treeGroup.add(trunkInstances,rootInstances);for(const crown of crownInstances){crown.instanceMatrix.needsUpdate=true;treeGroup.add(crown);}
const mossGeo=new THREE.SphereGeometry(1,8,5),mossInstancesA=new THREE.InstancedMesh(mossGeo,mossMatA,190),mossInstancesB=new THREE.InstancedMesh(mossGeo,mossMatB,150);let mossIndexA=0,mossIndexB=0;
for(let i=0;i<360;i++){
 const x=(rand()-.5)*108,z=12-rand()*147;
 if(Math.hypot(x,z-4)<5.6||Math.hypot(x-CLEARING.x,z-CLEARING.z)<6.5||Math.hypot(x-VILLAGE_CENTER.x,z-VILLAGE_CENTER.z)<VILLAGE_CLEAR_RADIUS-1.3)continue;
 if(trailRoutes.some(route=>closeToPolyline(x,z,route.points,route.width*.5+.35)))continue;
 treeDummy.position.set(x,.026,z);treeDummy.scale.set(.65+rand()*1.15,.028+rand()*.025,.42+rand()*.8);treeDummy.rotation.set(0,rand()*Math.PI*2,0);treeDummy.updateMatrix();
 if(i%3){if(mossIndexA<mossInstancesA.count)mossInstancesA.setMatrixAt(mossIndexA++,treeDummy.matrix);}else if(mossIndexB<mossInstancesB.count)mossInstancesB.setMatrixAt(mossIndexB++,treeDummy.matrix);
}
mossInstancesA.count=mossIndexA;mossInstancesB.count=mossIndexB;mossInstancesA.instanceMatrix.needsUpdate=true;mossInstancesB.instanceMatrix.needsUpdate=true;mossInstancesA.castShadow=false;mossInstancesB.castShadow=false;scene.add(mossInstancesA,mossInstancesB);
const grassGeo=new THREE.ConeGeometry(.055,1,3),grassInstancesA=new THREE.InstancedMesh(grassGeo,grassMatA,220),grassInstancesB=new THREE.InstancedMesh(grassGeo,grassMatB,110);let grassAIndex=0,grassBIndex=0;
for(let i=0;i<330;i++){
 const x=(rand()-.5)*108,z=12-rand()*147;
 if(Math.hypot(x,z-4)<5.6||Math.hypot(x-CLEARING.x,z-CLEARING.z)<6.4||Math.hypot(x-VILLAGE_CENTER.x,z-VILLAGE_CENTER.z)<VILLAGE_CLEAR_RADIUS+1.2)continue;
 if(trailRoutes.some(route=>closeToPolyline(x,z,route.points,route.width*.5+.3)))continue;
 const h=.12+rand()*.3;treeDummy.position.set(x,h*.5,z);treeDummy.scale.set(.85,h,.85);treeDummy.rotation.set(0,rand()*Math.PI*2,(rand()-.5)*.42);treeDummy.updateMatrix();
 if(i%3){if(grassAIndex<grassInstancesA.count)grassInstancesA.setMatrixAt(grassAIndex++,treeDummy.matrix);}else if(grassBIndex<grassInstancesB.count)grassInstancesB.setMatrixAt(grassBIndex++,treeDummy.matrix);
}
grassInstancesA.count=grassAIndex;grassInstancesB.count=grassBIndex;grassInstancesA.instanceMatrix.needsUpdate=true;grassInstancesB.instanceMatrix.needsUpdate=true;grassInstancesA.castShadow=false;grassInstancesB.castShadow=false;const grassGroup=new THREE.Group();grassGroup.add(grassInstancesA,grassInstancesB);scene.add(grassGroup);
const rockSpecs=[];
for(let i=0;i<48;i++){
 const x=(rand()-.5)*104,z=12-rand()*145,radius=.28+rand()*.62,scaleY=.48+rand()*.42;
 if(Math.hypot(x,z-4)<7||Math.hypot(x-CLEARING.x,z-CLEARING.z)<7.5||Math.hypot(x-VILLAGE_CENTER.x,z-VILLAGE_CENTER.z)<VILLAGE_CLEAR_RADIUS+1.1)continue;
 if(trailRoutes.some(route=>closeToPolyline(x,z,route.points,route.width*.5+1.2)))continue;
 if(treeObstacles.some(o=>{const dx=x-o.x,dz=z-o.z;return dx*dx+dz*dz<(o.radius+radius+.35)*(o.radius+radius+.35);}))continue;
 const height=radius*scaleY;rockSpecs.push({x,z,radius,scaleY,height});rockObstacles.push({x,z,radius:radius*.92,height});
}
const rockInstances=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),rockMat,rockSpecs.length);
for(let i=0;i<rockSpecs.length;i++){const r=rockSpecs[i];treeDummy.position.set(r.x,r.height*.48,r.z);treeDummy.scale.set(r.radius,r.height,r.radius);treeDummy.rotation.set(rand(),rand()*Math.PI*2,rand());treeDummy.updateMatrix();rockInstances.setMatrixAt(i,treeDummy.matrix);}
rockInstances.instanceMatrix.needsUpdate=true;rockInstances.castShadow=false;rockInstances.receiveShadow=true;scene.add(rockInstances);
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
function scatterGrassTufts(geometry){let seed=1632026;const next=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const lowSpec=(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches)||innerWidth<700;const target=lowSpec?420:640,mesh=new THREE.InstancedMesh(geometry,grassMaterial,target),dummy=new THREE.Object3D();let placed=0,attempts=0;while(placed<target&&attempts<target*10){attempts++;const x=(next()-.5)*104,z=12-next()*147;if(Math.hypot(x,z-4)<5.8||Math.hypot(x-CLEARING.x,z-CLEARING.z)<6.8||Math.hypot(x-VILLAGE_CENTER.x,z-VILLAGE_CENTER.z)<VILLAGE_CLEAR_RADIUS+1.6)continue;if(trailRoutes.some(route=>closeToPolyline(x,z,route.points,route.width*.5+.6)))continue;if(treeObstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.radius+.5))continue;if(rockObstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.radius+.32))continue;if(marketObstacles.some(o=>o.shape==='box'?Math.abs(x-o.x)<o.halfX+.35&&Math.abs(z-o.z)<o.halfZ+.35:Math.hypot(x-o.x,z-o.z)<o.radius+.35))continue;dummy.position.set(x,.012,z);dummy.rotation.set(0,next()*Math.PI*2,0);dummy.scale.setScalar(2.65+next()*.85);dummy.updateMatrix();mesh.setMatrixAt(placed++,dummy.matrix);}mesh.count=placed;mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=false;mesh.computeBoundingSphere();grassGroup.remove(grassInstancesA,grassInstancesB);grassGroup.add(mesh);grassGroup.userData.grassInstances=mesh;grassGeo.dispose();grassMatA.dispose();grassMatB.dispose();window.SevenSinsGrassReport={asset:'Grama.glb',instances:placed,deviceTier:lowSpec?'mobile':'desktop'};}
const grassMaterial=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,side:THREE.DoubleSide});
addInstancedWind(grassMaterial,.045,'clamp(position.y*3.25,0.0,1.0)',1.05,'mod163-grass-wind');
new GLTFLoader().load('./Grama.glb?v=mod163-forest-grass-instances',gltf=>{try{const tuftGeometry=mergeGrassTuft(gltf.scene);scatterGrassTufts(tuftGeometry);const disposedGeometries=new Set(),disposedMaterials=new Set();gltf.scene.traverse(obj=>{if(!obj.isMesh)return;if(obj.geometry&&!disposedGeometries.has(obj.geometry)){obj.geometry.dispose();disposedGeometries.add(obj.geometry);}for(const material of (Array.isArray(obj.material)?obj.material:[obj.material]))if(material&&!disposedMaterials.has(material)){material.dispose();disposedMaterials.add(material);}});}catch(err){console.warn('Grama.glb não foi instanciada; mantendo a vegetação leve de reserva.',err);}},undefined,err=>console.warn('Grama.glb não carregou; mantendo a vegetação leve de reserva.',err));
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
 const timeScale=role==='idle'?.38:role==='run'?1.08:1;
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
new GLTFLoader().load('./Enemy1.glb?v=mod172-triple-spells-ai',gltf=>{
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
 const clipsByRole={
  idle:exact('idle')||exact('breath')||exact('breathing')||exact('respiracao'),
  walk:exact('andar')||exact('walk')||exact('walking'),
  run:exact('correr')||exact('run')||exact('running'),
  attack:exact('atq1')||exact('attack1')||exact('attack01'),
  attack2:enemyClips.find(c=>/(habilidade3|skill3|skill03|atq2|attack2|skill2)/.test(key(c))),
  cast:enemyClips.find(c=>/(handforward|handfront|maofrente|point|apont|cast|spell|magic|power|shoot|projectile|habilidade2|skill2|atq2|attack2)/.test(key(c))),
  dash:exact('dash'),
  block:exact('block'),
  jump:exact('jump')||exact('jumping')||exact('pulo')||exact('pular')||exact('saltar')||exact('salto'),
  hit:exact('hit')||exact('hurt')||exact('damage'),
  death:exact('death')||exact('die')||exact('morte')
 };
 // Não depender de um único nome: distribui clipes reais ainda não usados em papéis especiais distintos.
 const usedClips=new Set(Object.values(clipsByRole).filter(Boolean));
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
 if(clipsByRole.dash)retargetEnemyMovementClipToPlayer('dash',imported,clipsByRole.dash);
 if(clipsByRole.jump)retargetEnemyMovementClipToPlayer('jump',imported,clipsByRole.jump);
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
 const visible=p.z>-1&&p.z<1&&p.x>-1.2&&p.x<1.2&&p.y>-1.2&&p.y<1.2&&enemyAlive&&enemy.visible;
 hud.style.display=visible?'block':'none';
 if(visible){hud.style.left=((p.x*.5+.5)*innerWidth)+'px';hud.style.top=((-p.y*.5+.5)*innerHeight)+'px';}
 const fill=document.getElementById('enemy-hp-fill');
 if(fill)fill.style.width=enemyHpPercent()+'%';
}
function tryPlayerAttack(){
 const now=performance.now();if(now<attackCooldown||!enemyAlive)return;if(!combatStepNow()||!enemy.visible){status.textContent='Siga o objetivo atual antes de iniciar este confronto.';return;}
 if(!model||!mixer||!attackClips.length){status.textContent='Não foi encontrado um clipe de ataque válido no Protagonista.glb.';return;}
 const attackClip=attackClips[attackClipIndex++%attackClips.length],duration=Number(attackClip&&attackClip.duration);
 if(!validAttackClip(attackClip)||!Number.isFinite(duration)||duration<=0){status.textContent='O ataque não tem uma animação válida; nenhum dano foi aplicado.';return;}
 attackCooldown=now+680;const attackAction=mixer.clipAction(attackClip);
 if(activeAction&&activeAction!==attackAction)activeAction.fadeOut(.07);
 attackAction.reset();attackAction.enabled=true;attackAction.setEffectiveWeight(1);attackAction.setLoop(THREE.LoopOnce,1);attackAction.clampWhenFinished=true;attackAction.fadeIn(.07).play();activeAction=attackAction;actionUntil=now+duration*1000;
 playerAttackFacingX=Math.sin(playerYaw);playerAttackFacingZ=Math.cos(playerYaw);
 pendingEnemyHitAt=now+Math.min(460,Math.max(190,duration*.28*1000));
}
function resolvePlayerAttackHit(){
 if(!enemyAlive||!combatStepNow()||!enemy.visible)return;
 const dx=enemy.position.x-player.position.x,dz=enemy.position.z-player.position.z;
 const distance=Math.hypot(dx,dz),facing=(dx*playerAttackFacingX+dz*playerAttackFacingZ)/(distance||1);
 if(distance>2.0||facing<.28||Math.abs(player.position.y-enemy.position.y)>1.05){status.textContent=distance>2.0?'Chegue mais perto para acertar o golpe':facing<.28?'O golpe não alcançou o inimigo':'O inimigo está fora da altura do golpe';return;}
 enemyHP=Math.max(0,enemyHP-25);enemyHitFlash=.2;enemyKnockback=.42;enemyKnockbackX=dx/(distance||1);enemyKnockbackZ=dz/(distance||1);
 if(enemyCurrentRole==='attack'){enemyAttackResolved=true;enemyAttackElapsed=enemyAttackDuration;playEnemyAnimation('idle',.05);}
 status.textContent=enemyHP===0?'Inimigo derrotado!':'Acertou! Vida do inimigo: '+enemyHP+'%';
 if(enemyHP===0){enemyAlive=false;document.getElementById('enemy-hud').style.display='none';if(!playEnemyAnimation('death',.06,true))enemyHasDeathClip=false;status.textContent='Caminho liberado.';setTimeout(()=>advanceAfterEnemyDefeat(),850);}
 else playEnemyAnimation('hit',.05,true);
}
function updatePlayerHud(){
 const hud=document.getElementById('player-hud'),fill=document.getElementById('player-hp-fill'),text=document.getElementById('player-hp-text');
 if(hud)hud.hidden=!(combatStepNow()&&enemy.visible);
 if(fill)fill.style.width=Math.max(0,Math.min(100,playerHP/playerMaxHP*100))+'%';
 if(text)text.textContent=Math.ceil(playerHP/playerMaxHP*100)+'%';
}
function damagePlayerFromEnemyAttack(damage=ENEMY_ATTACK_DAMAGE){
 const now=performance.now();if(playerHP<=0||now<playerInvulnerableUntil)return false;
 const scaled=encounterProfile==='warden'?Math.max(1,Math.round((Number(damage)||ENEMY_ATTACK_DAMAGE)*1.15)):Math.max(1,Number(damage)||ENEMY_ATTACK_DAMAGE);
 playerHP=Math.max(0,playerHP-scaled);playerInvulnerableUntil=now+850;updatePlayerHud();
 if(playerHP===0){
  playerRespawnAt=now+1450;moveVX=moveVZ=0;dashRemaining=0;pendingEnemyHitAt=0;
  const death=actions.death||actions.hit;if(death){playOnce(death===actions.death?'death':'hit',.06);actionUntil=now+Math.max(250,Math.min(1300,death.getClip().duration*1000));}
  status.textContent='Protagonista derrotado. Retornando à trilha…';
 }else{
  if(actions.hit){playOnce('hit',.05);actionUntil=now+Math.max(220,Math.min(700,actions.hit.getClip().duration*1000));}
  status.textContent='O golpe do inimigo atingiu você. Vida: '+playerHP+'%';
 }
 return true;
}
function startEnemyAttack(role='attack'){
 const action=enemyActions[role],clip=action&&action.getClip(),duration=Number(clip&&clip.duration);
 if(!action||!Number.isFinite(duration)||duration<=0||!playEnemyAnimation(role,.08,true))return false;
 enemyAttackRole=role;enemyAttackElapsed=0;enemyAttackDuration=duration;enemyAttackHitAt=Math.min(duration*.55,Math.max(.08,duration*.42));
 enemyAttackFacingX=Math.sin(enemy.rotation.y);enemyAttackFacingZ=Math.cos(enemy.rotation.y);enemyAttackResolved=false;enemyAttackCooldown=duration+.65;return true;
}
function enemyAttackContactIsValid(distance,heightDelta,facing){return Number.isFinite(distance)&&distance<=2.4&&heightDelta<=1.2;}
function updateEnemyAI(dt){
 if(enemyAttackCooldown>0)enemyAttackCooldown=Math.max(0,enemyAttackCooldown-dt);
 if(!enemy.visible||!enemyAlive||!combatStepNow()||dialogueOpen||playerHP<=0){if(enemyCurrentRole!=='idle'&&enemyActions.idle){enemyAttackResolved=true;enemyAttackElapsed=enemyAttackDuration;enemyDashRemaining=0;enemyCastResolved=true;wardenFanPending=false;playEnemyAnimation('idle',.1);}return;}
 if(enemyKnockback>0){const step=Math.min(enemyKnockback,dt*2.5),nextX=THREE.MathUtils.clamp(enemy.position.x+enemyKnockbackX*step,-62,62),nextZ=THREE.MathUtils.clamp(enemy.position.z+enemyKnockbackZ*step,-140,14);if(!enemyBlockedAt(nextX,enemy.position.z))enemy.position.x=nextX;if(!enemyBlockedAt(enemy.position.x,nextZ))enemy.position.z=nextZ;enemyKnockback=Math.max(0,enemyKnockback-step);return;}
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
  if(!enemyAttackResolved&&enemyAttackElapsed>=enemyAttackHitAt){enemyAttackResolved=true;if(role==='attack'){const contactDistance=Math.hypot(dx,dz),facing=(dx*enemyAttackFacingX+dz*enemyAttackFacingZ)/(contactDistance||1),heightDelta=Math.abs(player.position.y-enemy.position.y);const attackStillRunning=enemyCurrentAction===action&&action&&enemyAttackElapsed<=enemyAttackDuration+.02;if(attackStillRunning&&enemyAttackContactIsValid(contactDistance,heightDelta,facing))damagePlayerFromEnemyAttack();}else if(role==='attack2'){spawnEnemyProjectile('slash',-.22);spawnEnemyProjectile('slash',0);spawnEnemyProjectile('slash',.22);}}
  if(enemyAttackElapsed<enemyAttackDuration)return;playEnemyAnimation('idle',.08);
 }
 if(enemyCurrentRole==='dash'&&enemyDashRemaining>0){
  const step=Math.min(8.0*dt,enemyDashRemaining*8.0);enemyDashRemaining=Math.max(0,enemyDashRemaining-dt);
  const nx=THREE.MathUtils.clamp(enemy.position.x+enemyDashDirectionX*step,-62,62),nz=THREE.MathUtils.clamp(enemy.position.z+enemyDashDirectionZ*step,-140,14);
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
   if(rangedRole==='cast'){enemyCastCooldown=4.6;enemyCastElapsed=0;enemyCastDuration=duration;enemyCastResolved=false;}
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
 const nextX=THREE.MathUtils.clamp(enemy.position.x+dx/(distance||1)*step,-62,62),nextZ=THREE.MathUtils.clamp(enemy.position.z+dz/(distance||1)*step,-140,14);let moved=false;
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
function addVillageVendors(){if(!model||vendorsSpawned)return;vendorsSpawned=true;for(let i=0;i<villageVendors.length;i++){const p=villageVendors[i],cloned=cloneSkinned(model),root=new THREE.Group();root.position.set(p.x,0,p.z);root.rotation.y=p.yaw;root.scale.setScalar(.76);root.userData.breathPhase=i*1.73;root.add(cloned);cloned.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});villageGroup.add(root);if(playerIdleClip){const npcMixer=new THREE.AnimationMixer(cloned),idle=npcMixer.clipAction(playerIdleClip);idle.setLoop(THREE.LoopRepeat,Infinity);idle.play();villageNpcMixers.push(npcMixer);}else villageNpcBreathing.push({root,baseY:0,phase:i*1.73});}}

const guideAura=new THREE.PointLight(0xffe6a3,.45,2.8);guideAura.position.set(0,.78,.1);guide.add(guideAura);
const guideShadow=new THREE.Mesh(new THREE.CircleGeometry(.28,20),new THREE.MeshBasicMaterial({color:0x142019,transparent:true,opacity:.28,depthWrite:false}));
guideShadow.rotation.x=-Math.PI/2;guideShadow.position.y=.014;guide.add(guideShadow);
const questMarker=new THREE.Mesh(new THREE.TorusGeometry(.38,.04,8,28),new THREE.MeshBasicMaterial({color:0xffd65a}));
questMarker.rotation.x=Math.PI/2;questMarker.position.set(guide.position.x,.06,guide.position.z);scene.add(questMarker);
const clearingPatch=new THREE.Mesh(new THREE.CircleGeometry(5.4,24),new THREE.MeshStandardMaterial({color:0x786f55,roughness:1}));clearingPatch.rotation.x=-Math.PI/2;clearingPatch.position.set(CLEARING.x,.012,CLEARING.z);clearingPatch.receiveShadow=true;scene.add(clearingPatch);
/* MOD 181 — ruína secreta acessível ao lado da trilha, recompensa visual de exploração. */
const secretRuin=new THREE.Group();secretRuin.position.set(-18.5,0,-52);scene.add(secretRuin);
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
  secretRuinFound=true;
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
const portalGroup=new THREE.Group();scene.add(portalGroup);portalGroup.position.set(PORTAL.x,hillHeightAt(PORTAL.x,PORTAL.z),PORTAL.z);portalGroup.visible=true;
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
new GLTFLoader().load('./AnjoGuia.glb?v=mod170-guide-breath-scale',gltf=>{
 const imported=gltf.scene;imported.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material&&'side'in o.material)o.material.side=THREE.DoubleSide;}});
 guideFitRoot=new THREE.Group();guideFitRoot.name='AnjoGuia_FitRoot';guideFitRoot.add(imported);guideModel=imported;playNativeGuideIdle(gltf.animations||[]);fitGuideModel();
},undefined,err=>{console.error('AnjoGuia.glb não carregou:',err);status.textContent='Não foi possível carregar AnjoGuia.glb';});
const PROGRESS_KEY='sevenSins3DCampaignV6';
function read3DProgress(){try{const keys=[PROGRESS_KEY,'sevenSins3DCampaignV5','sevenSins3DCampaignV4','sevenSins3DCampaignV3','sevenSins3DCampaignV2','sevenSins3DCampaignV1'];for(const key of keys){const raw=JSON.parse(localStorage.getItem(key)||'null');if(raw)return migrateProgress(raw);}return migrateProgress({coins:0});}catch(_){return migrateProgress(null);}}
let saved3DProgress=read3DProgress();
let questStep=saved3DProgress.questStep,coins=saved3DProgress.coins,journeyEnemyIndex=saved3DProgress.journeyEnemyIndex,dialogueOpen=false,dialoguePages=[],dialogueIndex=0,dialogueFinish=null;
let playerName=saved3DProgress.playerName,captorsTaunted=saved3DProgress.captorsTaunted,childrenFreed=saved3DProgress.childrenFreed,awakeningSeen=saved3DProgress.awakeningSeen,actCardSeen=saved3DProgress.actCardSeen;
let mountainIndex=saved3DProgress.mountainIndex||0,wardenTaunted=!!saved3DProgress.wardenTaunted,wardenDefeated=!!saved3DProgress.wardenDefeated,portalOpened=!!saved3DProgress.portalOpened,portalRewardClaimed=!!saved3DProgress.portalRewardClaimed;
let wardenIntroLock=false,portalPull=null,handoffSent=false;
let namePromptOpen=false,awakeningActive=!awakeningSeen&&questStep===0,awakeningT=0,tauntLock=false,reunionStarted=false,purseGiven=questStep>0;
if(questStep<2)enemy.visible=false;
if(questStep===2){enemy.position.set(JOURNEY_ENEMIES[journeyEnemyIndex]?.x||0,0,JOURNEY_ENEMIES[journeyEnemyIndex]?.z||-59);enemy.visible=false;}
portalGroup.visible=true;
function save3DProgress(){const progress={version:ACT1.version,questStep,coins,journeyEnemyIndex,mountainIndex,playerName,captorsTaunted,childrenFreed,awakeningSeen,actCardSeen,wardenTaunted,wardenDefeated,portalOpened,portalRewardClaimed,updatedAt:Date.now()};try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));}catch(_){}window.SevenSins3DProgress=progress;try{if(window.parent!==window)window.parent.postMessage({type:'SEVEN_SINS_3D_PROGRESS',progress},window.location.origin);}catch(_){}}
function updateQuestHud(){const view=questPresentation(questStep);const title=document.getElementById('quest-title'),objective=document.getElementById('quest-objective'),coinCount=document.getElementById('coin-count'),hint=document.getElementById('hint'),hero=document.getElementById('hero-name');if(title)title.textContent=view.title;if(objective)objective.textContent=view.objective;if(hint)hint.textContent=view.title;if(coinCount)coinCount.textContent=String(coins);if(hero)hero.textContent=playerName?playerName.toUpperCase():'SEM NOME';const nameLabel=document.querySelector('#player-name span');if(nameLabel)nameLabel.textContent=(playerName||'PROTAGONISTA').toUpperCase();}
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
 const src=/anjo-guia/i.test(page.who||'')?'AnjoGuia.png':(page.portrait||'');
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

function combatStepNow(){return questStep===2||questStep===4||questStep===5;}
function enemyHpPercent(){return Math.max(0,Math.min(100,enemyHP/Math.max(1,enemyMaxHP)*100));}
function nextDashCooldown(){if(encounterProfile==='warden')return 2.15;if(encounterProfile==='sentry'&&mountainIndex>0)return 1.65;return 2.7;}
function syncEnemyLabel(){const el=document.getElementById('enemy-name');if(!el)return;el.textContent=encounterProfile==='warden'?'GUARDA DA PASSAGEM':encounterProfile==='sentry'?'SENTINELA DA SUBIDA':'SEGUIDOR DA GANÂNCIA';if(wardenRing)wardenRing.visible=encounterProfile==='warden'&&enemy.visible;}
function revealEncounter(profile,spot,hp,intro){if(enemy.visible)return;encounterProfile=profile;enemyMaxHP=hp;enemyHP=hp;enemyAlive=true;enemy.position.set(spot.x,0,spot.z);enemy.rotation.set(0,0,0);enemy.scale.setScalar(1);enemyAttackElapsed=0;enemyAttackResolved=true;enemyAttackCooldown=.35;enemyKnockback=0;enemyDashRemaining=0;enemyCastResolved=true;wardenFanPending=false;if(profile!=='warden')wardenPhaseUsed=false;enemy.visible=true;checkpointX=spot.x;checkpointZ=Math.min(12,spot.z+7.5);syncEnemyLabel();if(enemyActions.idle)playEnemyAnimation('idle',.05);status.textContent=intro;}
function advanceAfterEnemyDefeat(){enemy.visible=false;enemy.rotation.set(0,0,0);enemy.scale.setScalar(1);enemyAttackCooldown=0;enemyAttackResolved=true;enemyDashRemaining=0;wardenFanPending=false;if(wardenRing)wardenRing.visible=false;if(questStep===2){enemyHP=100;enemyMaxHP=100;enemyAlive=true;encounterProfile='captor';const next=afterEnemyDefeated(journeyEnemyIndex,JOURNEY_ENEMIES.length);questStep=next.questStep;journeyEnemyIndex=next.journeyEnemyIndex;status.textContent=next.status;save3DProgress();updateQuestHud();return;}if(questStep===4){const next=afterMountainDefeat(mountainIndex,MOUNTAIN_SENTRIES.length);questStep=next.questStep;mountainIndex=next.mountainIndex;enemyHP=100;enemyMaxHP=100;enemyAlive=true;status.textContent=next.status;save3DProgress();updateQuestHud();if(questStep===5){const toast=document.getElementById('quest-toast');if(toast){toast.textContent='O GUARDA DA PASSAGEM ESPERA';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2400);}}return;}if(questStep===5){const next=afterWardenDefeat();questStep=next.questStep;wardenDefeated=true;enemyHP=100;enemyMaxHP=100;enemyAlive=true;coins+=ACT1.wardenReward;status.textContent=next.status;save3DProgress();updateQuestHud();const toast=document.getElementById('quest-toast');if(toast){toast.textContent='GUARDA DERROTADO · +'+ACT1.wardenReward+' MOEDAS';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2600);}}}
function nearestVillageVendor(){let nearest=null,best=2.85;for(const vendor of villageVendors){const distance=Math.hypot(vendor.x-player.position.x,vendor.z-player.position.z);if(distance<best){best=distance;nearest=vendor;}}return nearest;}
function talkToVillageVendor(vendor){if(!vendor||dialogueOpen||namePromptOpen)return;if(questStep===1&&vendor.shortName==='PROVISÕES'){talkToInformant();return;}const hint=vendor.hints[Math.min(4,questStep)]||vendor.hints[4];showDialogue([{who:vendor.name,text:vendor.greeting},{who:vendor.name,text:hint}]);}
function talkToInformant(){if(questStep!==1||dialogueOpen||namePromptOpen)return;if(coins<ACT1.bribe){showDialogue(informantPoorLines());return;}showDialogue(informantLines(playerName),()=>{coins=Math.max(0,coins-ACT1.bribe);questStep=2;journeyEnemyIndex=0;captorsTaunted=false;tauntLock=false;encounterProfile='captor';enemyHP=100;enemyMaxHP=100;enemyAlive=true;enemy.visible=false;setDayNightMode('night');save3DProgress();updateQuestHud();status.textContent='A noite caiu. Siga a trilha até as gaiolas.';});}
function beginCaptorTaunt(){if(captorsTaunted||tauntLock||dialogueOpen||namePromptOpen)return;tauntLock=true;showDialogue(captorTauntLines(playerName),()=>{captorsTaunted=true;tauntLock=false;save3DProgress();status.textContent='Os captores avançam. Proteja as gaiolas.';});}
function freeChildren(){if(questStep!==3||childrenFreed||dialogueOpen||namePromptOpen)return;showDialogue(freeChildrenLines(playerName),()=>{childrenFreed=true;openCageDoors();save3DProgress();updateQuestHud();status.textContent='Escolte as crianças de volta à vila.';});}
function reunionDialogue(){if(reunionStarted||dialogueOpen||namePromptOpen||questStep!==3||!childrenFreed)return;reunionStarted=true;showDialogue(reunionLines(),()=>{questStep=4;coins+=ACT1.rescueReward;save3DProgress();updateQuestHud();status.textContent='As famílias as receberam. A subida tem sentinelas espaçadas antes do portal.';const toast=document.getElementById('quest-toast');if(toast){toast.textContent='AS CRIANÇAS ESTÃO SEGURAS · +'+ACT1.rescueReward+' MOEDAS';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2800);}});}
function beginWardenIntro(){if(wardenTaunted||wardenIntroLock||dialogueOpen||namePromptOpen)return;wardenIntroLock=true;showDialogue(wardenTauntLines(playerName),()=>{wardenTaunted=true;wardenIntroLock=false;save3DProgress();revealEncounter('warden',WARDEN_SPOT,ACT1.wardenHp,'O guarda da passagem entra na trilha.');});}
function requestValerioHandoff(){if(handoffSent)return;handoffSent=true;const plan=valerioHandoffPlan();const target=new URL(plan.entry,window.location.href).href;status.textContent='O portal puxa você para a dimensão de Valério…';try{(window.top||window).location.replace(target);}catch(_){window.location.href=target;}}
function startPortalPull(){if(!portalPull)portalPull={t:0};}
function updatePortalPull(dt){if(!portalPull||handoffSent)return;portalPull.t+=dt;player.position.x+=(PORTAL.x-player.position.x)*Math.min(1,dt*2.1);player.position.z+=((PORTAL.z+2.4)-player.position.z)*Math.min(1,dt*2.1);player.position.y=terrainHeightAt(player.position.x,player.position.z);const yaw=Math.atan2(PORTAL.x-player.position.x,PORTAL.z-player.position.z);player.rotation.y=yaw;playerYaw=yaw;if(portalPull.t>1.2)requestValerioHandoff();}
function openValerioPortal(){if(dialogueOpen||namePromptOpen||awakeningActive||portalPull)return;if(questStep===7||portalOpened){startPortalPull();return;}if(questStep!==6)return;showDialogue(portalLines(playerName),()=>{if(!portalRewardClaimed){coins+=ACT1.portalReward;portalRewardClaimed=true;}questStep=7;portalOpened=true;save3DProgress();updateQuestHud();status.textContent='O portal reconhece o seu nome e começa a puxar.';const toast=document.getElementById('quest-toast');if(toast){toast.textContent='A DIMENSÃO DE VALÉRIO SE ABRE';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2800);}startPortalPull();});}
function warnPortalBlocked(){if(dialogueOpen||namePromptOpen)return;showDialogue(portalBlockedLines());}
function tryInteract(){if(namePromptOpen||awakeningActive||portalPull)return;if(dialogueOpen){advanceDialogue();return;}const guideDistance=Math.hypot(guide.position.x-player.position.x,guide.position.z-player.position.z);const teo=villageVendors[2];const teoDistance=Math.hypot(teo.x-player.position.x,teo.z-player.position.z);const cageDistance=Math.hypot(CAGE_CENTER.x-player.position.x,CAGE_CENTER.z-player.position.z);const portalDistance=Math.hypot(PORTAL.x-player.position.x,PORTAL.z-player.position.z);if(questStep===0&&guideDistance<=2.7){talkToGuide();return;}if(questStep===1&&teoDistance<=2.9){talkToInformant();return;}if(questStep===3&&!childrenFreed&&cageDistance<=4.2){freeChildren();return;}const fighting=enemy.visible&&enemyAlive;if((questStep===4||questStep===5)&&portalDistance<=3.8&&!fighting){warnPortalBlocked();return;}if((questStep===6||questStep===7)&&portalDistance<=3.8&&!fighting){openValerioPortal();return;}const vendor=nearestVillageVendor();if(vendor)talkToVillageVendor(vendor);}
document.getElementById('talk-button').addEventListener('click',tryInteract);
const skipAwakening=document.getElementById('skip-awakening');if(skipAwakening){if(awakeningActive)skipAwakening.classList.remove('hidden');skipAwakening.addEventListener('click',finishAwakening);}
if(questStep>=2&&questStep<=6){setDayNightMode('night');dayNightState.t=1;applyDayNightVisual(1);}
updateHeroNameQuiet();
function updateHeroNameQuiet(){updateQuestHud();}
document.getElementById('dialog-continue').addEventListener('click',advanceDialogue);
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
 player.userData.ready=true;loading.classList.add('hidden');spawnAct1Children();status.textContent=questStep===0?'Ato I · o Anjo-Guia espera no começo da trilha':questPresentation(questStep).objective;
},undefined,err=>{console.error(err);loading.innerHTML='Não foi possível carregar Protagonista.glb.<br>Verifique a conexão e tente novamente.';status.textContent='Falha ao carregar modelo';});
const keys={};addEventListener('keydown',e=>{const typing=document.activeElement&&(document.activeElement.tagName==='INPUT'||document.activeElement.tagName==='TEXTAREA');if(typing)return;keys[e.key.toLowerCase()]=true;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault();});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
addEventListener('keydown',e=>{if(e.repeat)return;const typing=document.activeElement&&(document.activeElement.tagName==='INPUT'||document.activeElement.tagName==='TEXTAREA'||document.activeElement.tagName==='SELECT');if(typing)return;if(e.code==='KeyJ'||e.code==='KeyX'){action('attack');return;}if(e.code==='KeyF'){action('dash');return;}if(e.code==='Space'){e.preventDefault();action('jump');return;}if(e.key==='e'||e.key==='Enter')tryInteract();});
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
 const dx=enemy.position.x-player.position.x,dz=enemy.position.z-player.position.z,base=Math.atan2(dx,dz),angle=base+angleOffset,dirX=Math.sin(angle),dirZ=Math.cos(angle);
 group.position.set(player.position.x+dirX*.8,player.position.y+(kind==='sun'?1.65:1.35),player.position.z+dirZ*.8);group.rotation.y=angle;scene.add(group);
 holyProjectiles.push({group,dirX,dirZ,kind,delay,life:kind==='sun'?2.7:1.7,speed:kind==='sun'?4.2:8.5,damage:kind==='sun'?28:kind==='ultimate'?45:kind==='sword5'?10:14,hit:false});
}
function castHolyMagic(kind){
 const now=performance.now();if(now<(holyCooldowns[kind]||0)||playerHP<=0)return;
 if(!combatStepNow()||!enemy.visible||!enemyAlive){status.textContent='A Palavra está pronta, mas ainda não há inimigo ao alcance desta batalha.';return;}
 const cooldown={magic:1800,magic2:4200,magic3:6200,ultimate:12000}[kind]||2500;holyCooldowns[kind]=now+cooldown;
 if(kind==='magic'){[-.19,0,.19].forEach((a,i)=>spawnHolyProjectile('sword',a,i*.09));status.textContent='Espadas da Palavra — três lâminas de luz!';}
 else if(kind==='magic2'){[-.28,-.14,0,.14,.28].forEach((a,i)=>spawnHolyProjectile('sword5',a,i*.12));status.textContent='Julgamento Celestial — cinco espadas descem em formação!';}
 else if(kind==='magic3'){spawnHolyProjectile('sun');status.textContent='Sol da Justiça — luz ardente lançada contra o inimigo!';}
 else{spawnHolyProjectile('ultimate');status.textContent='Julgamento Divino — a espada celestial foi invocada!';}
}
function updateHolyProjectiles(dt){
 for(let i=holyProjectiles.length-1;i>=0;i--){const p=holyProjectiles[i];p.delay-=dt;if(p.delay>0)continue;p.life-=dt;p.group.position.x+=p.dirX*p.speed*dt;p.group.position.z+=p.dirZ*p.speed*dt;if(p.kind==='sun'){p.group.position.y+=Math.sin(performance.now()*.006)*dt*.22;p.group.rotation.y+=dt*2;}else p.group.rotation.z+=dt*2;
  const d=Math.hypot(p.group.position.x-enemy.position.x,p.group.position.z-enemy.position.z);
  if(!p.hit&&enemyAlive&&combatStepNow()&&enemy.visible&&d<1.15&&Math.abs(p.group.position.y-(enemy.position.y+1))<1.8){p.hit=true;enemyHP=Math.max(0,enemyHP-p.damage);enemyHitFlash=.2;setEnemyHitFlash(true);setTimeout(()=>setEnemyHitFlash(false),130);const fill=document.getElementById('enemy-hp-fill');if(fill)fill.style.width=enemyHpPercent()+'%';p.life=0;if(enemyHP===0){enemyAlive=false;playEnemyAnimation('death',.06,true);status.textContent='A luz venceu este inimigo. Caminho liberado.';setTimeout(()=>advanceAfterEnemyDefeat(),650);}}
  if(p.life<=0){scene.remove(p.group);p.group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});holyProjectiles.splice(i,1);}
 }
}
function action(kind){if(playerHP<=0)return;const now=performance.now();if(kind==='dash'){if(now<dashCooldownUntil)return;dashCooldownUntil=now+720;let intentX=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joyX;let intentZ=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+joyY;let intentLen=Math.hypot(intentX,intentZ);if(intentLen>.12){intentX/=intentLen;intentZ/=intentLen;dashDirX=intentX*Math.cos(cameraYaw)+intentZ*Math.sin(cameraYaw);dashDirZ=-intentX*Math.sin(cameraYaw)+intentZ*Math.cos(cameraYaw);}else{const moveLen=Math.hypot(moveVX,moveVZ);if(moveLen>.2){dashDirX=moveVX/moveLen;dashDirZ=moveVZ/moveLen;}else{dashDirX=Math.sin(playerYaw);dashDirZ=Math.cos(playerYaw);}}dashRemaining=.32;if(actions.dash)playOnce('dash',.045);else if(actions.walk)play('walk',.045);actionUntil=now+360;return;}if(kind==='jump'){if(!grounded)return;grounded=false;verticalVelocity=jumpImpulse;if(actions.jump){playOnce('jump',.08);actionUntil=now+Math.max(320,Math.min(700,actions.jump.getClip().duration*1000));}else{actionUntil=now+180;}return;}if(kind==='attack'){tryPlayerAttack();return;}if(kind==='magic'||kind==='magic2'||kind==='magic3'||kind==='ultimate'){castHolyMagic(kind);return;}}
function bindInstantAction(id,kind){const button=document.getElementById(id);button.addEventListener('pointerdown',e=>{e.preventDefault();action(kind);});button.addEventListener('click',e=>{if(e.detail===0)action(kind);});}
bindInstantAction('attack','attack');bindInstantAction('dash','dash');
const jumpButton=document.getElementById('jump');
// pointerdown responde imediatamente ao segundo dedo enquanto o primeiro mantém o joystick.
jumpButton.addEventListener('pointerdown',e=>{e.preventDefault();action('jump');});
document.getElementById('magic').addEventListener('click',()=>action('magic'));document.getElementById('magic2').addEventListener('click',()=>action('magic2'));document.getElementById('magic3').addEventListener('click',()=>action('magic3'));document.getElementById('ultimate').addEventListener('click',()=>action('ultimate'));
addEventListener('keydown',e=>{if(e.repeat)return;if(e.key.toLowerCase()==='j'||e.key.toLowerCase()==='x')action('attack');if(e.key===' ')action('jump');if(e.key==='Shift')action('dash');if(e.key==='1')action('magic');if(e.key==='2')action('magic2');if(e.key==='3')action('magic3');if(e.key==='4')action('ultimate');});
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
if(cameraToggle3D)cameraToggle3D.addEventListener('click',()=>{
 cameraDistance=cameraDistance<1.05?8.5:.72;
 cameraPitch=THREE.MathUtils.clamp(cameraPitch,-1.05,1.05);
 syncCameraToggle3D();
 const status=document.getElementById('status');
 if(status)status.textContent=cameraDistance<1.05?'Câmera em primeira pessoa. Arraste para olhar ao redor.':'Câmera em terceira pessoa. Arraste para olhar e use dois dedos para ajustar a distância.';
});
const lookPointers=new Map();let lastPinchDistance=0;
function pinchDistance(){const pts=Array.from(lookPointers.values());return pts.length<2?0:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);}
let mouseLookStart=null;lookArea.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();lookPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(e.pointerType==='mouse')mouseLookStart={x:e.clientX,y:e.clientY,t:performance.now()};try{lookArea.setPointerCapture(e.pointerId);}catch(_){}if(lookPointers.size===2){lastPinchDistance=pinchDistance();return;} });
lookArea.addEventListener('pointermove',e=>{if(!lookPointers.has(e.pointerId))return;const prev=lookPointers.get(e.pointerId);lookPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(lookPointers.size>=2){const d=pinchDistance();if(lastPinchDistance>0&&d>0){cameraDistance=THREE.MathUtils.clamp(cameraDistance+(lastPinchDistance-d)*.025,.72,15);syncCameraToggle3D(); }lastPinchDistance=d;return;}const dx=e.clientX-prev.x,dy=e.clientY-prev.y;const firstPersonLook=cameraDistance<1.05;
const lookSensitivity=firstPersonLook?.0022:.004;
cameraYaw-=dx*lookSensitivity;
cameraPitch=THREE.MathUtils.clamp(cameraPitch+dy*(firstPersonLook?.003:.004),-1.32,1.32);});
function endLook(e){const start=mouseLookStart;mouseLookStart=null;lookPointers.delete(e.pointerId);lastPinchDistance=pinchDistance();if(start&&e.pointerType==='mouse'&&!dialogueOpen&&!namePromptOpen&&!awakeningActive&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<8&&performance.now()-start.t<420)action('attack');}
lookArea.addEventListener('pointerup',endLook);lookArea.addEventListener('pointercancel',endLook);lookArea.addEventListener('lostpointercapture',endLook);
lookArea.addEventListener('wheel',e=>{cameraDistance=THREE.MathUtils.clamp(cameraDistance+e.deltaY*.008,.72,15);syncCameraToggle3D();},{passive:true});
addEventListener('blur',()=>{lookPointers.clear();lastPinchDistance=0;joyActive=false;joyX=joyY=0;knob.style.transform='translate(0,0)';});

function blockedAt(x,z){
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
 let height=hillHeightAt(x,z);
 for(const rock of rockObstacles){const d=Math.hypot(x-rock.x,z-rock.z);if(d<rock.radius){const t=1-d/rock.radius;const smooth=t*t*(3-2*t);height=Math.max(height,rock.height*smooth);}}
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
function updateChildren(dt){
 for(const child of childFollowers){
  child.root.visible=questStep>=2;
  if(!child.root.visible)continue;
  if(child.mixer)child.mixer.update(dt);
  const home=childrenFreed?null:child.home;
  const tx=home?home.x:player.position.x+child.offset;
  const tz=home?home.z:player.position.z+1.25;
  child.root.position.x+=(tx-child.root.position.x)*Math.min(1,dt*(childrenFreed?2.4:8));
  child.root.position.z+=(tz-child.root.position.z)*Math.min(1,dt*(childrenFreed?2.4:8));
  child.root.position.y=terrainHeightAt(child.root.position.x,child.root.position.z);
  const faceX=childrenFreed?player.position.x:child.root.position.x;
  const faceZ=childrenFreed?player.position.z:child.root.position.z+1;
  if(childrenFreed)child.root.lookAt(faceX,child.root.position.y,faceZ);
 }
}
buildAct1Cages();

function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04),now=performance.now();updatePlayerRespawn(now);updateHolyProjectiles(dt);for(const uniform of forestWindUniforms)uniform.value=now*.001;portalRing.rotation.z=Math.sin(now*.00045)*.045;portalInnerRing.rotation.z=-now*.00032;vortex.rotation.z=-now*.00165;portalLight.intensity=2.7+Math.sin(now*.003)*.45;portalSigil.rotation.z=now*.00022;for(const relic of floatingRelics){relic.mesh.position.y=relic.baseY+Math.sin(now*.0015+relic.phase)*.16;relic.mesh.rotation.y+=dt*.42;}for(const cloud of movingClouds){cloud.group.position.x+=cloud.speed*dt;cloud.group.position.y=cloud.baseY+Math.sin(now*.00018+cloud.phase)*.34;if(cloud.group.position.x>145)cloud.group.position.x=-145;else if(cloud.group.position.x<-145)cloud.group.position.x=145;}for(const npc of villageNpcBreathing){npc.root.position.y=npc.baseY+Math.sin(now*.00145+npc.phase)*.022;npc.root.rotation.z=Math.sin(now*.0011+npc.phase)*.008;}if(mixer)mixer.update(dt);if(enemyMixer)enemyMixer.update(dt);if(model&&grounded&&Math.abs(verticalVelocity)<.015&&playerHP>0){model.updateMatrixWorld(true);const floorY=terrainHeightAt(player.position.x,player.position.z),feet=[];model.traverse(o=>{if(o.isBone&&/(left|right).*(foot|toe|ankle)|(foot|toe|ankle).*(left|right)/i.test(o.name||'')){o.updateWorldMatrix(true,false);const p=o.getWorldPosition(new THREE.Vector3());if(Number.isFinite(p.y))feet.push(p.y);}});if(feet.length){model.position.y+=floorY-Math.min(...feet);}}if(guideProceduralBreath){const breath=Math.sin(now*.00175);guideBreathingPivot.scale.set(1-breath*.008,1+breath*.022,1-breath*.008);guideBreathingPivot.position.y=.012+breath*.018;if(guideModel&&guideModel.userData.breathBones){for(const b of guideModel.userData.breathBones){b.bone.rotation.x=b.baseX+breath*.018;b.bone.scale.y=b.baseScaleY*(1+breath*.012);}}}if(enemyModel){
 // Reancora pelo ponto mais baixo dos ossos dos pés após cada atualização do rig.
 enemy.updateMatrixWorld(true);
 const floorY=terrainHeightAt(enemy.position.x,enemy.position.z),footPoints=[];
 enemyModel.traverse(o=>{if(o.isBone&&/(left|right).*(foot|toe|ankle)|(foot|toe|ankle).*(left|right)/i.test(o.name||'')){o.updateWorldMatrix(true,false);const p=o.getWorldPosition(new THREE.Vector3());if(Number.isFinite(p.y))footPoints.push(p.y);}});
 if(footPoints.length){enemyModelRoot.position.y+=floorY-Math.min(...footPoints);}
 else{const animatedBounds=new THREE.Box3().setFromObject(enemyModel);if(!animatedBounds.isEmpty()&&Number.isFinite(animatedBounds.min.y))enemyModelRoot.position.y+=floorY-animatedBounds.min.y;}
 }if(guideIdleMixer)guideIdleMixer.update(dt);if(enemyDashCooldown>0)enemyDashCooldown=Math.max(0,enemyDashCooldown-dt);if(enemySpecialCooldown>0)enemySpecialCooldown=Math.max(0,enemySpecialCooldown-dt);if(enemyCastCooldown>0)enemyCastCooldown=Math.max(0,enemyCastCooldown-dt);if(enemyBlockCooldown>0)enemyBlockCooldown=Math.max(0,enemyBlockCooldown-dt);updateEnemyProjectiles(dt);for(const npcMixer of villageNpcMixers)npcMixer.update(dt);if(combatStepNow()&&enemyLoadState==='idle')loadEnemyModel();updatePortalPull(dt);
 if(pendingEnemyHitAt&&now>=pendingEnemyHitAt){pendingEnemyHitAt=0;resolvePlayerAttackHit();}
    updatePlayerSwordMount();
 if(enemyHitFlash>0){enemyHitFlash=Math.max(0,enemyHitFlash-dt);setEnemyHitFlash(true);}else setEnemyHitFlash(false);
 if(enemyCurrentRole==='hit'&&enemyCurrentAction&&!enemyCurrentAction.isRunning()&&enemyAlive)playEnemyAnimation('idle',.08);
  if(!enemyAlive&&!enemyHasDeathClip&&enemy.visible){enemy.rotation.z=THREE.MathUtils.lerp(enemy.rotation.z,-1.35,1-Math.exp(-5*dt));enemy.position.y=Math.max(-.55,enemy.position.y-dt*1.3);enemy.scale.multiplyScalar(Math.max(.001,1-dt*.65));}
 guide.position.y=0;guideAura.intensity=.4+Math.sin(now*.003)*.06;
 const guideDistance=Math.hypot(guide.position.x-player.position.x,guide.position.z-player.position.z);
 const clearingDistance=Math.hypot(CLEARING.x-player.position.x,CLEARING.z-player.position.z);
 const portalDistance=Math.hypot(PORTAL.x-player.position.x,PORTAL.z-player.position.z);
 const talkButton=document.getElementById('talk-button');
 const nearbyVendor=nearestVillageVendor();
 const teo=villageVendors[2],teoDistance=Math.hypot(teo.x-player.position.x,teo.z-player.position.z),cageDistance=Math.hypot(CAGE_CENTER.x-player.position.x,CAGE_CENTER.z-player.position.z);
 const fightingNow=enemy.visible&&enemyAlive;const portalReady=(questStep===6||questStep===7)&&portalDistance<=3.8&&!fightingNow,portalSoon=(questStep===4||questStep===5)&&portalDistance<=3.8&&!fightingNow;const canTalk=(questStep===0&&guideDistance<=2.7)||(questStep===1&&teoDistance<=2.9)||(questStep===3&&!childrenFreed&&cageDistance<=4.2)||portalReady||portalSoon||!!nearbyVendor;
 if(talkButton){const label=questStep===1&&teoDistance<=2.9?(coins>=ACT1.bribe?'OFERECER 5':'FALAR · TÉO'):questStep===3&&!childrenFreed&&cageDistance<=4.2?'ABRIR GAIOLAS':portalReady?'ATRAVESSAR':portalSoon?'PORTAL FECHADO':nearbyVendor?'FALAR · '+nearbyVendor.shortName:'FALAR';talkButton.textContent=label;talkButton.classList.toggle('hidden',!canTalk||dialogueOpen||namePromptOpen||awakeningActive||!!portalPull);}
 questMarker.visible=questStep<7&&!portalPull;
 if(questStep===0)questMarker.position.set(guide.position.x,.06,guide.position.z);
 if(questStep===1)questMarker.position.set(teo.x,.06,teo.z);
 if(questStep===2){const target=JOURNEY_ENEMIES[journeyEnemyIndex];if(target){questMarker.position.set(target.x,.06,target.z);const near=Math.hypot(target.x-player.position.x,target.z-player.position.z)<10;if(journeyEnemyIndex===0&&!captorsTaunted){if(near)beginCaptorTaunt();}else if(near){revealEncounter('captor',target,100,'Cuidado! Um captor bloqueia a trilha.');}}}
 if(questStep===3){if(!childrenFreed)questMarker.position.set(CAGE_CENTER.x,.06,CAGE_CENTER.z);else questMarker.position.set(VILLAGE_CENTER.x,.06,VILLAGE_CENTER.z);}
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
// Pedras pequenas e o tronco baixo são degraus transponíveis; árvores e rochas altas continuam bloqueando.
if(dashRemaining>0){
 const dashDt=Math.min(dt,dashRemaining);const nextX=THREE.MathUtils.clamp(player.position.x+dashDirX*12.5*dashDt,-138,138);const nextZ=THREE.MathUtils.clamp(player.position.z+dashDirZ*12.5*dashDt,-138,138);
 if(!playerBlockedAt(nextX,player.position.z))player.position.x=nextX;
 if(!playerBlockedAt(player.position.x,nextZ))player.position.z=nextZ;
 playerYaw=Math.atan2(dashDirX,dashDirZ);player.rotation.y=playerYaw;dashRemaining=Math.max(0,dashRemaining-dt);
}else if(moving){
 const nextX=THREE.MathUtils.clamp(player.position.x+moveVX*dt,-138,138);
 const nextZ=THREE.MathUtils.clamp(player.position.z+moveVZ*dt,-138,138);
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
 if(player.position.y<=floorY){player.position.y=floorY;verticalVelocity=0;grounded=true;}
}else{
 player.position.y=floorY;
}
updateEnemyAI(dt);updateEnemyHud();updatePlayerHud();updateDayNight(dt);checkSecretRuin();
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
// Vegetação instanciada permanece imóvel; evita rotações por quadro de centenas de instâncias.
// A espada acompanha diretamente o osso da mão; o golpe vem do clipe de animação do personagem, sem balanço artificial por código.
updateAutoGraphics3D(dt,now);
 if(awakeningActive){awakeningT=Math.min(1,awakeningT+dt/5.4);const yaw=Math.sin(awakeningT*Math.PI*1.6)*.85,pitch=.22+Math.sin(awakeningT*Math.PI)*.16,dist=8.2;const target=new THREE.Vector3(player.position.x,player.position.y+1.35,player.position.z);camera.position.set(target.x+Math.sin(yaw)*dist*Math.cos(pitch),target.y+dist*Math.sin(pitch)+.35,target.z+Math.cos(yaw)*dist*Math.cos(pitch));camera.lookAt(target);if(awakeningT>=1)finishAwakening();}
 updateChildren(dt);updateCages();if(questStep===3&&childrenFreed&&!reunionStarted&&!dialogueOpen&&Math.hypot(VILLAGE_CENTER.x-player.position.x,VILLAGE_CENTER.z-player.position.z)<8)reunionDialogue();
 renderer.render(scene,camera);}

/* MOD 176 — perfis gráficos reais para o mundo 3D; Auto ajusta a qualidade conforme FPS. */
const graphics3DProfiles={
 low:{scale:.62,shadows:false,shadowSize:256,foliage:false,clouds:false},
 high:{scale:.9,shadows:true,shadowSize:512,foliage:true,clouds:true},
 max:{scale:1.2,shadows:true,shadowSize:1024,foliage:true,clouds:true}
};
let graphics3DMode='auto',graphics3DScale=.78,graphics3DFps=0,graphics3DSampleTime=0,graphics3DSampleFrames=0,graphics3DLowTime=0,graphics3DHighTime=0,graphics3DLastChange=0;
function applyGraphics3D(mode,autoScale){
 const previousMode=graphics3DMode;
 if(mode!==previousMode){graphics3DFps=0;graphics3DSampleTime=0;graphics3DSampleFrames=0;graphics3DLowTime=0;graphics3DHighTime=0;}
 graphics3DMode=mode;
 const baseline=graphics3DProfiles[mode]||graphics3DProfiles.high;
 graphics3DScale=mode==='auto'?autoScale:baseline.scale;
 const shadowEnabled=mode==='auto'?graphics3DScale>=.78:baseline.shadows;
 const shadowSize=mode==='auto'?(graphics3DScale>=1?512:256):baseline.shadowSize;
 renderer.setPixelRatio(Math.min((devicePixelRatio||1)*graphics3DScale,1.5));
 renderer.setSize(innerWidth,innerHeight);
 renderer.shadowMap.enabled=shadowEnabled;
 sunLight.castShadow=shadowEnabled;
 sunLight.shadow.mapSize.set(shadowSize,shadowSize);
 sunLight.shadow.camera.updateProjectionMatrix();
 sunLight.shadow.needsUpdate=true;
 renderer.shadowMap.needsUpdate=true;
 grassGroup.visible=mode==='auto'?graphics3DScale>=.72:baseline.foliage;
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
(function initGraphics3D(){
 const toggle=document.getElementById('graphics-toggle-3d'),panel=document.getElementById('graphics-panel-3d'),select=document.getElementById('graphics-profile-3d');
 if(toggle&&panel){toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));});}
 let saved='auto';try{const value=localStorage.getItem('seven-sins-3d-graphics');if(['auto','low','high','max'].includes(value))saved=value;}catch(e){}
 if(select){select.value=saved;select.addEventListener('change',()=>{const mode=select.value;try{localStorage.setItem('seven-sins-3d-graphics',mode);}catch(e){};const initial=mode==='auto'?((navigator.deviceMemory&&navigator.deviceMemory<=4)? .68:.82):(graphics3DProfiles[mode]||graphics3DProfiles.high).scale;applyGraphics3D(mode,initial);});}
 const initial=saved==='auto'?((navigator.deviceMemory&&navigator.deviceMemory<=4)||((navigator.hardwareConcurrency||8)<=4)? .68:.82):graphics3DProfiles[saved].scale;
 applyGraphics3D(saved,initial);
 syncCameraToggle3D();
})();

animate();
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();applyGraphics3D(graphics3DMode,graphics3DScale);}
addEventListener('resize',resize);
