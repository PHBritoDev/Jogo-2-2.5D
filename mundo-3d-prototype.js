import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

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
scene.add(new THREE.HemisphereLight(0xeaf7ff,0x59684b,1.55));
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
const fill=new THREE.DirectionalLight(0xa9d2e8,.38);fill.position.set(30,18,-22);scene.add(fill);
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
// Floresta procedural instanciada: copas altas, chão musgoso e caminhos que se abrem na mata.
const CLEARING={x:0,z:-29},PORTAL={x:0,z:-119},JOURNEY_ENEMIES=[{x:0,z:-59},{x:2.4,z:-79},{x:-2.2,z:-99}];
const VILLAGE_CENTER={x:-12.2,z:-44.5},VILLAGE_CLEAR_RADIUS=14.2;
const treeGroup=new THREE.Group();scene.add(treeGroup);
const treeObstacles=[],rockObstacles=[],marketObstacles=[],walkableObstacles=[],treeSpecs=[];
const leafMid=mat(0x245035),mossMatA=mat(0x34522e),mossMatB=mat(0x465e32),grassMatA=mat(0x58763d),grassMatB=mat(0x304d31);
const canopyWindUniforms=[leafMat,leafMid,leafLight].map((material,i)=>addInstancedWind(material,.075,'clamp((position.y+1.175)/2.35,0.0,1.0)',.72,'forest-canopy-wind-v163-'+i));
const mainTrail=[[0,14],[0,4],[.5,-6],[-1.8,-17],[0,-29],[2.2,-43],[-1.2,-59],[-2,-76],[2.4,-93],[-1,-107],[0,-119],[1.5,-140]];
const villageTrail=[[2.2,-43],[0,-41],[-4.6,-41.4],[-8.7,-43.3],[-12.2,-44.5]];
const trailRoutes=[{points:mainTrail,width:5.2},{points:villageTrail,width:4.0}];
function addTrail(points,width){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],0,p[1])),false,'centripetal');
 const steps=Math.max(48,points.length*14),vertices=[],uvs=[],indices=[];
 for(let i=0;i<=steps;i++){
  const t=i/steps,center=curve.getPoint(t),tangent=curve.getTangent(t),side=new THREE.Vector3(tangent.z,0,-tangent.x).normalize(),k=vertices.length/3;
  vertices.push(center.x+side.x*width*.5,.008,center.z+side.z*width*.5,center.x-side.x*width*.5,.008,center.z-side.z*width*.5);
   uvs.push((center.x+side.x*width*.5)*.14,(center.z+side.z*width*.5)*.14,(center.x-side.x*width*.5)*.14,(center.z-side.z*width*.5)*.14);
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
const treeDummy=new THREE.Object3D(),trunkGeo=new THREE.CylinderGeometry(.18,.34,1,7,1),rootGeo=new THREE.CylinderGeometry(.29,.48,.46,7,1),crownGeo=new THREE.ConeGeometry(1,2.35,8,2);
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
const villageVendors=[
 {name:'Lia · Frutas',shortName:'FRUTAS',x:marketStalls[0].x,z:marketStalls[0].z+1.65,yaw:Math.PI,greeting:'Frutas colhidas nesta clareira e provisões para quem cruza a mata.',hints:['O Anjo-Guia costuma esperar perto do começo da trilha. Siga as luzes da floresta.','As marcas da clareira ficam além da curva ao sul da vila.','Os viajantes que seguiram a trilha encontraram inimigos adiante. Não avance sem cuidado.','O portal fica longe daqui, no fim da trilha.','O comércio da vila está aberto a quem volta da jornada.']},
 {name:'Mara · Ervas',shortName:'ERVAS',x:marketStalls[1].x,z:marketStalls[1].z+1.55,yaw:Math.PI*.72,greeting:'Ervas, raízes e folhas aromáticas — tudo colhido sem ferir a floresta.',hints:['Procure o Anjo-Guia na entrada da mata; ele conhece os sinais antigos.','Observe o chão e as pedras na clareira, perto da trilha principal.','Há movimento no caminho adiante; os rastros levam mais fundo na floresta.','A trilha continua até uma passagem estranha, bem distante da vila.','Depois da missão, a mata parece mais tranquila.']},
 {name:'Téo · Provisões',shortName:'PROVISÕES',x:marketStalls[2].x,z:marketStalls[2].z+1.65,yaw:Math.PI,greeting:'Provisões de viagem e notícias frescas para quem chega pela estrada.',hints:['O Anjo-Guia deve estar por perto da entrada da floresta.','A clareira fica perto da estrada sinuosa; procure sinais no chão.','Ouvi passos pesados mais adiante. Fique atento aos encontros na trilha.','O portal ainda é um mistério; examine-o quando chegar ao destino.','Quando voltar, conte à vila o que descobriu na floresta.']},
 {name:'Nara · Artesanato',shortName:'ARTESANATO',x:marketStalls[3].x,z:marketStalls[3].z+1.55,yaw:Math.PI,greeting:'Peças de madeira e tecido feitas aqui mesmo, com materiais da região.',hints:['O guia celestial costuma receber os viajantes na trilha de entrada.','A clareira adiante guarda marcas que precisam ser investigadas.','O caminho segue em frente, mas há inimigos mais à frente.','Uma passagem antiga aguarda no fim da floresta.','A vila continuará aqui quando a sua missão estiver concluída.']}
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
let enemyModel=null,enemyMixer=null,enemyClips=[],enemyActions={},enemyCurrentAction=null,enemyCurrentRole='idle',enemyHasDeathClip=false;
let enemyLoadState='idle';
let enemyHP=100,enemyAlive=true,enemyHitFlash=0,enemyKnockback=0,enemyKnockbackX=0,enemyKnockbackZ=0;
let enemyAttackCooldown=0,enemyAttackElapsed=0,enemyAttackDuration=0,enemyAttackHitAt=0,enemyAttackResolved=true,enemyAttackFacingX=0,enemyAttackFacingZ=1,enemyAttackRole='attack';
let enemyDashRemaining=0,enemyDashCooldown=0,enemySpecialCooldown=0,enemyBlockCooldown=0;
let attackCooldown=0,pendingEnemyHitAt=0,playerAttackFacingX=0,playerAttackFacingZ=1;
let playerHP=100,playerMaxHP=100,playerInvulnerableUntil=0,playerRespawnAt=0;
const ENEMY_ATTACK_RANGE=1.55,ENEMY_ATTACK_DAMAGE=18,PLAYER_SPAWN={x:0,z:4};
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
function loadEnemyModel(){if(enemyLoadState!=='idle')return;enemyLoadState='loading';
new GLTFLoader().load('./Enemy1.glb?v=mod167-enemy-actions',gltf=>{
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
 const find=regex=>enemyClips.find(c=>regex.test(String(c.name||'')));
 const clipsByRole={
  idle:find(/idle|breath|falar|talk|stand|parad|repos/i),
  walk:find(/^andar$/i)||find(/walking/i)||find(/walk|locomotion|caminh/i),
  run:find(/^correr$/i)||find(/running/i)||find(/run|sprint/i),
  attack:find(/atq[_\s.-]*0?1|attack[_\s.-]*0?1|claw|strike|slash|swing|golpe|ataque/i),
  attack2:find(/habilidade[_\s.-]*0?3|skill[_\s.-]*0?3|special.*slash/i),
  cast:find(/hand.*forward|cast|spell|power|launch|skill[_\s.-]*0?2|habilidade[_\s.-]*0?2|ability[_\s.-]*0?2|mao.*frente/i),
  dash:find(/^dash$/i)||find(/dash|quickstep/i),
  block:find(/^block$/i)||find(/block|dodge|esquiva/i),
  hit:find(/hit|hurt|damage|reaction|impact|dano|atingido/i),
  death:find(/death|die|dead|dying|morte|morrer/i)
 };
 for(const role of Object.keys(clipsByRole)){const clip=clipsByRole[role];if(clip)enemyActions[role]=enemyMixer.clipAction(clip);}
 enemyHasDeathClip=!!clipsByRole.death;
 const fallbackIdle=enemyClips.find(c=>!/attack|atq|habilidade|skill|slash|claw|strike|swing|hit|hurt|damage|death|die|jump|leap|hop|saltar|salto|dash|dodge|block|walking|running|walk|run|fall|land|air/i.test(String(c.name||'')));
 if(!enemyActions.idle&&fallbackIdle)enemyActions.idle=enemyMixer.clipAction(fallbackIdle);
 if(!enemyActions.idle&&enemyActions.walk)enemyActions.idle=enemyActions.walk;
 if(enemyActions.idle)playEnemyAnimation('idle',0);
 window.Enemy1AnimationReport=enemyClips.map(c=>c.name);
 console.info('Enemy1.glb animações:',window.Enemy1AnimationReport);
},undefined,err=>{console.error('Enemy1.glb não carregou; mantendo sprite de segurança.',err);enemyLoadState='failed';enemyModelRoot.visible=false;});

}

function updateEnemyHud(){
 const p=enemy.position.clone().add(new THREE.Vector3(0,2.2,0)).project(camera);
 const hud=document.getElementById('enemy-hud');
 if(!hud)return;
 const visible=p.z>-1&&p.z<1&&p.x>-1.2&&p.x<1.2&&p.y>-1.2&&p.y<1.2&&enemyAlive&&enemy.visible;
 hud.style.display=visible?'block':'none';
 if(visible){hud.style.left=((p.x*.5+.5)*innerWidth)+'px';hud.style.top=((-p.y*.5+.5)*innerHeight)+'px';}
 const fill=document.getElementById('enemy-hp-fill');
 if(fill)fill.style.width=Math.max(0,enemyHP)+'%';
}
function tryPlayerAttack(){
 const now=performance.now();if(now<attackCooldown||!enemyAlive)return;if(questStep!==2){status.textContent='Siga o objetivo atual antes de iniciar este confronto.';return;}
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
 if(!enemyAlive||questStep!==2)return;
 const dx=enemy.position.x-player.position.x,dz=enemy.position.z-player.position.z;
 const distance=Math.hypot(dx,dz),facing=(dx*playerAttackFacingX+dz*playerAttackFacingZ)/(distance||1);
 if(distance>2.0||facing<.28||Math.abs(player.position.y-enemy.position.y)>1.05){status.textContent=distance>2.0?'Chegue mais perto para acertar o golpe':facing<.28?'O golpe não alcançou o inimigo':'O inimigo está fora da altura do golpe';return;}
 enemyHP=Math.max(0,enemyHP-25);enemyHitFlash=.2;enemyKnockback=.42;enemyKnockbackX=dx/(distance||1);enemyKnockbackZ=dz/(distance||1);
 if(enemyCurrentRole==='attack'){enemyAttackResolved=true;enemyAttackElapsed=enemyAttackDuration;playEnemyAnimation('idle',.05);}
 status.textContent=enemyHP===0?'Inimigo derrotado!':'Acertou! Vida do inimigo: '+enemyHP+'%';
 if(enemyHP===0){enemyAlive=false;document.getElementById('enemy-hud').style.display='none';if(!playEnemyAnimation('death',.06,true))enemyHasDeathClip=false;status.textContent='Caminho liberado.';setTimeout(()=>{if(questStep!==2)return;journeyEnemyIndex++;enemy.visible=false;enemy.rotation.set(0,0,0);enemy.scale.setScalar(1);enemyHP=100;enemyAlive=true;enemyAttackCooldown=0;enemyAttackResolved=true;if(journeyEnemyIndex>=JOURNEY_ENEMIES.length){questStep=4;portalGroup.visible=true;questMarker.position.set(PORTAL.x,.06,PORTAL.z);status.textContent='Os inimigos foram vencidos. Encontre o portal.';}else{status.textContent='Um inimigo foi derrotado. Continue pela trilha.';}save3DProgress();updateQuestHud();},850);}
 else playEnemyAnimation('hit',.05,true);
}
function updatePlayerHud(){
 const hud=document.getElementById('player-hud'),fill=document.getElementById('player-hp-fill'),text=document.getElementById('player-hp-text');
 if(hud)hud.hidden=!(questStep===2&&enemy.visible);
 if(fill)fill.style.width=Math.max(0,Math.min(100,playerHP/playerMaxHP*100))+'%';
 if(text)text.textContent=Math.ceil(playerHP/playerMaxHP*100)+'%';
}
function damagePlayerFromEnemyAttack(){
 const now=performance.now();if(playerHP<=0||now<playerInvulnerableUntil)return false;
 playerHP=Math.max(0,playerHP-ENEMY_ATTACK_DAMAGE);playerInvulnerableUntil=now+850;updatePlayerHud();
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
function enemyAttackContactIsValid(distance,heightDelta,facing){return Number.isFinite(distance)&&distance<=ENEMY_ATTACK_RANGE&&heightDelta<=.95&&facing>=.55;}
function updateEnemyAI(dt){
 if(enemyAttackCooldown>0)enemyAttackCooldown=Math.max(0,enemyAttackCooldown-dt);
 if(!enemy.visible||!enemyAlive||questStep!==2||dialogueOpen||playerHP<=0){if(enemyCurrentRole==='attack'){enemyAttackResolved=true;enemyAttackElapsed=enemyAttackDuration;playEnemyAnimation('idle',.08);}return;}
 if(enemyKnockback>0){const step=Math.min(enemyKnockback,dt*2.5),nextX=THREE.MathUtils.clamp(enemy.position.x+enemyKnockbackX*step,-62,62),nextZ=THREE.MathUtils.clamp(enemy.position.z+enemyKnockbackZ*step,-140,14);if(!blockedAt(nextX,enemy.position.z))enemy.position.x=nextX;if(!blockedAt(enemy.position.x,nextZ))enemy.position.z=nextZ;enemyKnockback=Math.max(0,enemyKnockback-step);return;}
 // Deixe a animação de reação terminar antes de voltar a perseguir; evita cortá-la no primeiro quadro.
 if(enemyCurrentRole==='hit'){
  if(enemyCurrentAction&&enemyCurrentAction.isRunning())return;
  playEnemyAnimation('idle',.08);
 }
 if(['block','cast','attack2'].includes(enemyCurrentRole)){
  if(enemyCurrentAction&&enemyCurrentAction.isRunning())return;
  playEnemyAnimation('idle',.08);
 }
 if(enemyCurrentRole==='dash'&&enemyDashRemaining<=0){
  if(enemyCurrentAction&&enemyCurrentAction.isRunning())return;
  playEnemyAnimation('idle',.08);
 }
 const dx=player.position.x-enemy.position.x,dz=player.position.z-enemy.position.z,distance=Math.hypot(dx,dz);
 if(enemyCurrentRole!=='attack'){const targetYaw=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(targetYaw-enemy.rotation.y),Math.cos(targetYaw-enemy.rotation.y));enemy.rotation.y+=delta*(1-Math.exp(-14*dt));}
 if(enemyCurrentRole==='attack'||enemyCurrentRole==='attack2'){
  enemyAttackElapsed+=dt;const role=enemyAttackRole,action=enemyActions[role];
  if(role==='attack'&&!enemyAttackResolved&&enemyAttackElapsed>=enemyAttackHitAt){enemyAttackResolved=true;const contactDistance=Math.hypot(dx,dz),facing=(dx*enemyAttackFacingX+dz*enemyAttackFacingZ)/(contactDistance||1),heightDelta=Math.abs(player.position.y-enemy.position.y);const attackStillRunning=enemyCurrentAction===action&&action&&enemyCurrentAction.isRunning()&&enemyAttackElapsed<=enemyAttackDuration+.02;if(attackStillRunning&&enemyAttackContactIsValid(contactDistance,heightDelta,facing))damagePlayerFromEnemyAttack();}
  if(enemyAttackElapsed<enemyAttackDuration)return;playEnemyAnimation('idle',.08);
 }
 if(enemyCurrentRole==='dash'&&enemyDashRemaining>0){
  const step=Math.min(6.2*dt,enemyDashRemaining*6.2);enemyDashRemaining=Math.max(0,enemyDashRemaining-dt);
  const nx=THREE.MathUtils.clamp(enemy.position.x+dx/(distance||1)*step,-62,62),nz=THREE.MathUtils.clamp(enemy.position.z+dz/(distance||1)*step,-140,14);
  if(!blockedAt(nx,enemy.position.z))enemy.position.x=nx;if(!blockedAt(enemy.position.x,nz))enemy.position.z=nz;
  if(enemyDashRemaining>0)return;
 }
 if(distance<=ENEMY_ATTACK_RANGE){if(enemyAttackCooldown<=0)startEnemyAttack('attack');else playEnemyAnimation('idle',.08);return;}
 if(distance>2.1&&distance<=3.4&&enemyActions.attack2&&enemySpecialCooldown<=0){
  const duration=enemyActions.attack2.getClip().duration;
  if(playEnemyAnimation('attack2',.08,true)){enemySpecialCooldown=4.5;enemyCurrentRole='attack2';enemyAttackRole='attack2';enemyAttackElapsed=0;enemyAttackDuration=duration;return;}
 }
 if(distance>3.4&&distance<=6.2&&enemyActions.cast&&enemySpecialCooldown<=0){
  if(playEnemyAnimation('cast',.08,true)){enemySpecialCooldown=5.5;return;}
 }
 if(distance>3.2&&distance<=7.5&&enemyActions.dash&&enemyDashCooldown<=0){
  if(playEnemyAnimation('dash',.06,true)){enemyDashRemaining=.24;enemyDashCooldown=3.2;return;}
 }
 if(distance>1.9&&distance<=3.5&&enemyActions.block&&enemyBlockCooldown<=0&&Math.random()<.008){
  if(playEnemyAnimation('block',.06,true)){enemyBlockCooldown=3.0;const side=enemy.rotation.y+Math.PI/2,sx=enemy.position.x+Math.sin(side)*.65,sz=enemy.position.z+Math.cos(side)*.65;if(!blockedAt(sx,enemy.position.z))enemy.position.x=sx;if(!blockedAt(enemy.position.x,sz))enemy.position.z=sz;return;}
 }
 const running=distance>7.5&&!!enemyActions.run,role=running?'run':'walk',speed=running?3.0:1.35,stopDistance=ENEMY_ATTACK_RANGE-.18,step=Math.min(speed*dt,Math.max(0,distance-stopDistance));if(step<=0){playEnemyAnimation('idle',.1);return;}
 const nextX=THREE.MathUtils.clamp(enemy.position.x+dx/(distance||1)*step,-62,62),nextZ=THREE.MathUtils.clamp(enemy.position.z+dz/(distance||1)*step,-140,14);let moved=false;
 if(!blockedAt(nextX,enemy.position.z)){enemy.position.x=nextX;moved=true;}if(!blockedAt(enemy.position.x,nextZ)){enemy.position.z=nextZ;moved=true;}
 playEnemyAnimation(moved?(role==='run'&&enemyActions.run?'run':'walk'):'idle',.12);
}
function updatePlayerRespawn(now){
 if(playerHP>0||!playerRespawnAt||now<playerRespawnAt)return;
 player.position.set(PLAYER_SPAWN.x,terrainHeightAt(PLAYER_SPAWN.x,PLAYER_SPAWN.z),PLAYER_SPAWN.z);playerHP=playerMaxHP;playerInvulnerableUntil=now+1000;playerRespawnAt=0;
 moveVX=moveVZ=0;verticalVelocity=0;grounded=true;dashRemaining=0;actionUntil=0;if(actions.idle)play('idle',.08);updatePlayerHud();status.textContent='Você voltou à trilha; o inimigo continua à espreita.';
}

// Anjo-Guia: usa o modelo GLB original adicionado ao repositório.
const guide=new THREE.Group();scene.add(guide);guide.position.set(3.3,0,-5.4);
const guideModelRoot=new THREE.Group();guide.add(guideModelRoot);
let guideModel=null,guideFitRoot=null,guideIdleMixer=null,playerIdleClip=null,playerReferenceHeight=1.7,vendorsSpawned=false,guideReferenceBounds=null;
const villageNpcMixers=[];
function playNativeGuideIdle(clips){
 const list=clips||[],idle=list.find(c=>/idle|breath|respir|falar|talk/i.test(String(c.name||'')))||list[0];
 if(!idle||!guideModel)return;
 const tracks=(idle.tracks||[]).filter(track=>!String(track.name||'').toLowerCase().endsWith('.scale'));
 const clip=tracks.length?new THREE.AnimationClip(idle.name,idle.duration,tracks,idle.blendMode):idle;
 guideIdleMixer=new THREE.AnimationMixer(guideModel);const action=guideIdleMixer.clipAction(clip);action.reset();action.setLoop(THREE.LoopRepeat,Infinity);action.setEffectiveWeight(1);action.play();guideIdleMixer.update(0);
}
function fitGuideModel(){
 if(!guideModel||!guideFitRoot)return;
 guideFitRoot.scale.setScalar(1);guideFitRoot.position.set(0,0,0);guideFitRoot.updateMatrixWorld(true);
 if(!guideReferenceBounds){const bounds=measureModelBounds(guideFitRoot),size=bounds.getSize(new THREE.Vector3());if(size.y<=.001)return;const center=bounds.getCenter(new THREE.Vector3());guideReferenceBounds={height:size.y,centerX:center.x,centerZ:center.z,minY:bounds.min.y};}
 const reference=guideReferenceBounds,targetHeight=playerReferenceHeight*.92,fitScale=targetHeight/reference.height;
 guideFitRoot.scale.setScalar(fitScale);guideFitRoot.position.set(-reference.centerX*fitScale,-reference.minY*fitScale,-reference.centerZ*fitScale);
 if(guideFitRoot.parent!==guideModelRoot)guideModelRoot.add(guideFitRoot);
 // Escala explícita adicional no grupo externo: o ajuste automático não pode anular o aumento pedido.
 guideModelRoot.scale.setScalar(2.6);
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
// Clareira natural com tronco caído e pedras pequenas: sem runas e sem personagem freira.
const fallenLog=new THREE.Mesh(new THREE.CylinderGeometry(.17,.22,3.1,7),barkMat);fallenLog.position.set(-2.5,.22,CLEARING.z-.7);fallenLog.rotation.z=Math.PI/2;fallenLog.rotation.y=.25;fallenLog.castShadow=true;scene.add(fallenLog);
walkableObstacles.push({type:'capsule',x:-2.5,z:CLEARING.z-.7,axisX:Math.cos(.25),axisZ:-Math.sin(.25),halfLength:1.55,radius:.22,height:.44});
for(const p of [{x:2.4,z:CLEARING.z-1.4,s:.55},{x:1.7,z:CLEARING.z+1.8,s:.42},{x:-2.9,z:CLEARING.z+1.6,s:.38}]){
 const stone=new THREE.Mesh(new THREE.DodecahedronGeometry(p.s,0),rockMat);stone.position.set(p.x,p.s*.45,p.z);stone.scale.y=.65;stone.castShadow=true;scene.add(stone);
 walkableObstacles.push({type:'circle',x:p.x,z:p.z,radius:p.s*.95,height:p.s*1.1});
}
const portalGroup=new THREE.Group();scene.add(portalGroup);portalGroup.position.set(PORTAL.x,0,PORTAL.z);portalGroup.visible=false;
const portalRing=new THREE.Mesh(new THREE.TorusGeometry(1.55,.16,10,40),new THREE.MeshStandardMaterial({color:0x8bded8,metalness:.25,roughness:.3,emissive:0x176b75,emissiveIntensity:1.15}));portalRing.position.y=2.1;portalRing.castShadow=true;portalGroup.add(portalRing);
const portalCore=new THREE.Mesh(new THREE.CircleGeometry(1.42,32),new THREE.MeshBasicMaterial({color:0x123e50,transparent:true,opacity:.78,side:THREE.DoubleSide,depthWrite:false}));portalCore.position.set(0,2.1,0);portalGroup.add(portalCore);
const portalLight=new THREE.PointLight(0x58cbd6,1.3,8);portalLight.position.set(0,2.1,.2);portalGroup.add(portalLight);
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
new GLTFLoader().load('./AnjoGuia.glb?v=mod167-guide-scale-breath',gltf=>{
 const imported=gltf.scene;imported.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material&&'side'in o.material)o.material.side=THREE.DoubleSide;}});
 guideFitRoot=new THREE.Group();guideFitRoot.name='AnjoGuia_FitRoot';guideFitRoot.add(imported);guideModel=imported;playNativeGuideIdle(gltf.animations||[]);fitGuideModel();
},undefined,err=>{console.error('AnjoGuia.glb não carregou:',err);status.textContent='Não foi possível carregar AnjoGuia.glb';});
const PROGRESS_KEY='sevenSins3DCampaignV4';
function read3DProgress(){try{const current=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'null');if(current&&current.version>=4)return {questStep:THREE.MathUtils.clamp(Math.floor(Number(current.questStep)||0),0,5),coins:Math.max(0,Math.floor(Number(current.coins)||0)),journeyEnemyIndex:THREE.MathUtils.clamp(Math.floor(Number(current.journeyEnemyIndex)||0),0,3)};const old=JSON.parse(localStorage.getItem('sevenSins3DCampaignV3')||localStorage.getItem('sevenSins3DCampaignV2')||localStorage.getItem('sevenSins3DCampaignV1')||'{}');return {questStep:0,coins:Math.max(0,Math.floor(Number(old.coins)||0)),journeyEnemyIndex:0};}catch(_){return {questStep:0,coins:0,journeyEnemyIndex:0};}}
let saved3DProgress=read3DProgress();
let questStep=saved3DProgress.questStep,coins=saved3DProgress.coins,journeyEnemyIndex=saved3DProgress.journeyEnemyIndex,dialogueOpen=false,dialoguePages=[],dialogueIndex=0,dialogueFinish=null;
if(questStep<2)enemy.visible=false;
if(questStep===2){enemy.position.set(JOURNEY_ENEMIES[journeyEnemyIndex]?.x||0,0,JOURNEY_ENEMIES[journeyEnemyIndex]?.z||-59);enemy.visible=false;}
if(questStep>=4)portalGroup.visible=true;
function save3DProgress(){const progress={version:4,questStep,coins,journeyEnemyIndex,updatedAt:Date.now()};try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));}catch(_){}window.SevenSins3DProgress=progress;try{if(window.parent!==window)window.parent.postMessage({type:'SEVEN_SINS_3D_PROGRESS',progress},window.location.origin);}catch(_){}}
function updateQuestHud(){const title=document.getElementById('quest-title'),objective=document.getElementById('quest-objective'),coinCount=document.getElementById('coin-count');if(title)title.textContent='MISSÃO 1 · A CLAREIRA E O PORTAL';if(objective)objective.textContent=questStep===0?'Fale com o Anjo-Guia':questStep===1?'Vá até a clareira e investigue o local':questStep===2?'Siga pela trilha; os inimigos aparecem mais adiante':questStep===4?'Encontre e examine o portal estranho':'Missão concluída! O portal ainda guarda seus segredos.';if(coinCount)coinCount.textContent=String(coins);}
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
function talkToGuide(){if(questStep!==0||dialogueOpen)return;guide.lookAt(player.position.x,guide.position.y,player.position.z);showDialogue([{who:'Anjo-Guia',text:'Antes de enfrentar qualquer inimigo, preciso que investigue a clareira adiante. Há sinais estranhos na floresta, mas não sabemos o que os causou.'},{who:'Anjo-Guia',text:'Explore com calma. Procure marcas antigas no chão e nas pedras. Só depois de entender a pista seguiremos em direção ao possível portal.'}],()=>{questStep=1;save3DProgress();updateQuestHud();document.getElementById('talk-button').classList.add('hidden');status.textContent='Nova etapa: investigue a clareira na floresta';});}
function nearestVillageVendor(){let nearest=null,best=2.85;for(const vendor of villageVendors){const distance=Math.hypot(vendor.x-player.position.x,vendor.z-player.position.z);if(distance<best){best=distance;nearest=vendor;}}return nearest;}
function talkToVillageVendor(vendor){if(!vendor||dialogueOpen)return;const stage=questStep===0?0:questStep===1?1:questStep===2?2:questStep===4?3:4;const hint=vendor.hints[stage]||vendor.hints[4];showDialogue([{who:vendor.name,text:vendor.greeting},{who:vendor.name,text:hint}]);}
function investigateClearing(){if(questStep!==1||dialogueOpen)return;showDialogue([{who:'Protagonista',text:'A clareira está afastada do começo da trilha. O tronco caído e as marcas no chão mostram que alguém passou por aqui há pouco.'},{who:'Anjo-Guia',text:'Há rastros que seguem floresta adentro. Ainda não sabemos o que existe no fim deles. Siga com cuidado; só mais adiante você encontrará perigo.'}],()=>{questStep=2;journeyEnemyIndex=0;enemyHP=100;enemyAlive=true;enemy.visible=false;save3DProgress();updateQuestHud();status.textContent='Nova etapa: siga a trilha pela floresta';});}
function investigatePortal(){if(questStep!==4||dialogueOpen)return;showDialogue([{who:'Protagonista',text:'Encontrei. Isto não parece uma passagem comum... não consigo ver o que existe do outro lado.'},{who:'Anjo-Guia',text:'Não atravesse ainda. Precisamos entender para onde leva e por que foi escondido tão fundo na floresta. Esta descoberta é apenas o começo.'}],()=>{questStep=5;coins+=5;questMarker.visible=false;save3DProgress();updateQuestHud();status.textContent='Missão concluída! +5 moedas';const toast=document.getElementById('quest-toast');toast.textContent='MISSÃO CONCLUÍDA · +5 MOEDAS';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2600);});}
document.getElementById('talk-button').addEventListener('click',()=>{if(questStep===0&&Math.hypot(guide.position.x-player.position.x,guide.position.z-player.position.z)<=2.7)talkToGuide();else if(questStep===1&&Math.hypot(CLEARING.x-player.position.x,CLEARING.z-player.position.z)<=3.2)investigateClearing();else if(questStep===4&&Math.hypot(PORTAL.x-player.position.x,PORTAL.z-player.position.z)<=3.4)investigatePortal();else talkToVillageVendor(nearestVillageVendor());});
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
new GLTFLoader().load('./Protagonista.glb?mod131-main-world',gltf=>{
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
 player.userData.ready=true;loading.classList.add('hidden');status.textContent='Missão 1 · encontre o Anjo-Guia e fale com ele';
},undefined,err=>{console.error(err);loading.innerHTML='Não foi possível carregar Protagonista.glb.<br>Verifique a conexão e tente novamente.';status.textContent='Falha ao carregar modelo';});
const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault();});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
addEventListener('keydown',e=>{if(e.repeat)return;if((e.key==='e'||e.key==='Enter')&&!dialogueOpen){if(questStep===0&&Math.hypot(guide.position.x-player.position.x,guide.position.z-player.position.z)<=2.7)talkToGuide();else if(questStep===1&&Math.hypot(CLEARING.x-player.position.x,CLEARING.z-player.position.z)<=3.2)investigateClearing();else if(questStep===4&&Math.hypot(PORTAL.x-player.position.x,player.position.z-PORTAL.z)<=3.4)investigatePortal();else talkToVillageVendor(nearestVillageVendor());}else if((e.key==='e'||e.key==='Enter')&&dialogueOpen)advanceDialogue();});
let joyX=0,joyY=0,joyActive=false;const stick=document.getElementById('stick'),knob=document.getElementById('knob');
function setJoy(e){const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.32;const d=Math.hypot(dx,dy);if(d>max){dx=dx/d*max;dy=dy/d*max;}joyX=dx/max;joyY=dy/max;knob.style.transform='translate('+dx+'px,'+dy+'px)';}
stick.addEventListener('pointerdown',e=>{joyActive=true;stick.setPointerCapture(e.pointerId);setJoy(e);});
stick.addEventListener('pointermove',e=>{if(joyActive)setJoy(e);});
function endJoy(){joyActive=false;joyX=joyY=0;knob.style.transform='translate(0,0)';}
stick.addEventListener('pointerup',endJoy);stick.addEventListener('pointercancel',endJoy);
let actionUntil=0,verticalVelocity=0;const gravity=15,jumpImpulse=5.2;let grounded=true;
let dashRemaining=0,dashCooldownUntil=0,dashDirX=0,dashDirZ=0;
function action(kind){if(playerHP<=0)return;const now=performance.now();if(kind==='dash'){if(now<dashCooldownUntil)return;dashCooldownUntil=now+720;let intentX=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joyX;let intentZ=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+joyY;let intentLen=Math.hypot(intentX,intentZ);if(intentLen>.12){intentX/=intentLen;intentZ/=intentLen;dashDirX=intentX*Math.cos(cameraYaw)+intentZ*Math.sin(cameraYaw);dashDirZ=-intentX*Math.sin(cameraYaw)+intentZ*Math.cos(cameraYaw);}else{const moveLen=Math.hypot(moveVX,moveVZ);if(moveLen>.2){dashDirX=moveVX/moveLen;dashDirZ=moveVZ/moveLen;}else{dashDirX=Math.sin(playerYaw);dashDirZ=Math.cos(playerYaw);}}dashRemaining=.32;if(actions.dash)playOnce('dash',.045);else if(actions.walk)play('walk',.045);actionUntil=now+360;return;}if(kind==='jump'){if(!grounded)return;grounded=false;verticalVelocity=jumpImpulse;if(actions.jump){playOnce('jump',.08);actionUntil=now+Math.max(320,Math.min(700,actions.jump.getClip().duration*1000));}else{actionUntil=now+180;}return;}if(kind==='attack'){tryPlayerAttack();return;}if(kind==='magic'||kind==='ultimate'){if(actions.attack){play('attack',.08);actionUntil=now+(kind==='ultimate'?1200:650);}status.textContent=kind==='magic'?'Magia celestial será integrada depois':'Ultimate será integrada depois';setTimeout(()=>{if(status.textContent.startsWith('Magia celestial')||status.textContent.startsWith('Ultimate será'))status.textContent='Protagonista 3D carregado · exploração ativa';},1900);}}
function bindInstantAction(id,kind){const button=document.getElementById(id);button.addEventListener('pointerdown',e=>{e.preventDefault();action(kind);});button.addEventListener('click',e=>{if(e.detail===0)action(kind);});}
bindInstantAction('attack','attack');bindInstantAction('dash','dash');
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

function blockedAt(x,z){
 for(const o of treeObstacles){const dx=x-o.x,dz=z-o.z;if(dx*dx+dz*dz<o.radius*o.radius)return true;}
 for(const o of marketObstacles){if(o.height!==undefined&&o.height<=.68)continue;const dx=x-o.x,dz=z-o.z;if(o.shape==='box'?Math.abs(dx)<o.halfX&&Math.abs(dz)<o.halfZ:dx*dx+dz*dz<o.radius*o.radius)return true;}
 for(const rock of rockObstacles){if(rock.height<=.68)continue;const dx=x-rock.x,dz=z-rock.z,collisionRadius=rock.radius*.74;if(dx*dx+dz*dz<collisionRadius*collisionRadius)return true;}
 return false;
}
function terrainHeightAt(x,z){
 let height=0;
 for(const rock of rockObstacles){const d=Math.hypot(x-rock.x,z-rock.z);if(d<rock.radius){const t=1-d/rock.radius;const smooth=t*t*(3-2*t);height=Math.max(height,rock.height*smooth);}}
 for(const obstacle of walkableObstacles){let distance;
  if(obstacle.type==='capsule'){const along=THREE.MathUtils.clamp((x-obstacle.x)*obstacle.axisX+(z-obstacle.z)*obstacle.axisZ,-obstacle.halfLength,obstacle.halfLength);distance=Math.hypot(x-(obstacle.x+obstacle.axisX*along),z-(obstacle.z+obstacle.axisZ*along));}
  else distance=Math.hypot(x-obstacle.x,z-obstacle.z);
  if(distance<obstacle.radius){const t=1-distance/obstacle.radius,smooth=t*t*(3-2*t);height=Math.max(height,obstacle.height*smooth);}
 }
 return height;
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04),now=performance.now();updatePlayerRespawn(now);for(const uniform of forestWindUniforms)uniform.value=now*.001;for(const cloud of movingClouds){cloud.group.position.x+=cloud.speed*dt;cloud.group.position.y=cloud.baseY+Math.sin(now*.00018+cloud.phase)*.34;if(cloud.group.position.x>145)cloud.group.position.x=-145;else if(cloud.group.position.x<-145)cloud.group.position.x=145;}for(const npc of villageNpcBreathing){npc.root.position.y=npc.baseY+Math.sin(now*.00145+npc.phase)*.022;npc.root.rotation.z=Math.sin(now*.0011+npc.phase)*.008;}if(mixer)mixer.update(dt);if(enemyMixer)enemyMixer.update(dt);if(enemyModel){
 // Reancora o modelo depois de atualizar o rig: animações com deslocamento vertical não deixam os pés flutuando.
 enemy.updateMatrixWorld(true);
 const animatedBounds=new THREE.Box3().setFromObject(enemyModel);
 if(!animatedBounds.isEmpty()&&Number.isFinite(animatedBounds.min.y)){
  const floorY=terrainHeightAt(enemy.position.x,enemy.position.z);
  enemyModelRoot.position.y+=floorY-animatedBounds.min.y-.045;
 }
 }if(guideIdleMixer)guideIdleMixer.update(dt);if(enemyDashCooldown>0)enemyDashCooldown=Math.max(0,enemyDashCooldown-dt);if(enemySpecialCooldown>0)enemySpecialCooldown=Math.max(0,enemySpecialCooldown-dt);if(enemyBlockCooldown>0)enemyBlockCooldown=Math.max(0,enemyBlockCooldown-dt);for(const npcMixer of villageNpcMixers)npcMixer.update(dt);if(questStep===2&&enemyLoadState==='idle')loadEnemyModel();
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
 const canTalk=(questStep===0&&guideDistance<=2.7)||(questStep===1&&clearingDistance<=3.2)||(questStep===4&&portalDistance<=3.4)||!!nearbyVendor;
 if(talkButton){talkButton.textContent=nearbyVendor?'FALAR · '+nearbyVendor.shortName:(questStep===1?'INVESTIGAR CLAREIRA':questStep===4?'EXAMINAR PORTAL':'FALAR');talkButton.classList.toggle('hidden',!canTalk||dialogueOpen);}
 questMarker.visible=questStep<5;
 if(questStep===0)questMarker.position.set(guide.position.x,.06,guide.position.z);
 if(questStep===1)questMarker.position.set(CLEARING.x,.06,CLEARING.z);
 if(questStep===2){const target=JOURNEY_ENEMIES[journeyEnemyIndex];if(target){questMarker.position.set(target.x,.06,target.z);if(!enemy.visible&&Math.hypot(target.x-player.position.x,target.z-player.position.z)<10){enemy.position.set(target.x,0,target.z);enemy.rotation.set(0,0,0);enemy.scale.setScalar(1);enemyHP=100;enemyAlive=true;enemyAttackElapsed=0;enemyAttackResolved=true;enemyAttackCooldown=0;enemyKnockback=0;enemy.visible=true;if(enemyActions.idle)playEnemyAnimation('idle',.05);status.textContent='Cuidado! Um inimigo bloqueia a trilha.';}}}
 if(questStep===4)questMarker.position.set(PORTAL.x,.06,PORTAL.z);
 if(questStep===2&&enemy.visible&&enemyAlive&&Math.hypot(enemy.position.x-player.position.x,enemy.position.z-player.position.z)<6.5)enemy.rotation.y=Math.atan2(player.position.x-enemy.position.x,player.position.z-enemy.position.z);
 if(dialogueOpen&&actions.idle&&now>actionUntil)play('idle',.08);
let axisX=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joyX;
let axisZ=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+joyY;
if(dialogueOpen||playerHP<=0){axisX=0;axisZ=0;}
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
 const dashDt=Math.min(dt,dashRemaining);const nextX=THREE.MathUtils.clamp(player.position.x+dashDirX*12.5*dashDt,-62,62);const nextZ=THREE.MathUtils.clamp(player.position.z+dashDirZ*12.5*dashDt,-140,14);
 if(!blockedAt(nextX,player.position.z))player.position.x=nextX;
 if(!blockedAt(player.position.x,nextZ))player.position.z=nextZ;
 playerYaw=Math.atan2(dashDirX,dashDirZ);player.rotation.y=playerYaw;dashRemaining=Math.max(0,dashRemaining-dt);
}else if(moving){
 const nextX=THREE.MathUtils.clamp(player.position.x+moveVX*dt,-62,62);
 const nextZ=THREE.MathUtils.clamp(player.position.z+moveVZ*dt,-140,14);
 // Testa cada eixo separadamente para o jogador conseguir deslizar junto à árvore/pedra.
 if(!blockedAt(nextX,player.position.z))player.position.x=nextX;else moveVX=0;
 if(!blockedAt(player.position.x,nextZ))player.position.z=nextZ;else moveVZ=0;
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
updateEnemyAI(dt);updateEnemyHud();updatePlayerHud();
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
renderer.render(scene,camera);}
animate();
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));renderer.setSize(innerWidth,innerHeight);}
addEventListener('resize',resize);
