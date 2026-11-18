/**
 * Cinematic GLB art direction for the galaxy menu.
 * Real existing GLBs, not screenshots, silhouettes, decals or impostors.
 * These assets are deliberately loaded only while the galaxy menu is open.
 */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';

const ASSETS=Object.freeze({
 guardian:['./AnjoGuiador-otimizado.glb','./AnjoGuia-lod.glb','./Anjo-rig.glb'],
 mysterious:'./Misteriosa-rig.glb'
});
function disposeModel(model){const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();model.traverse(o=>{if(o.skeleton)skeletons.add(o.skeleton);if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m?.isMaterial)materials.add(m);});materials.forEach(m=>{Object.values(m).forEach(v=>{if(v?.isTexture)textures.add(v);});m.dispose();});textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());skeletons.forEach(s=>s.dispose());}
function fitModel(object,height){
 object.updateMatrixWorld(true);
 const bbox=new THREE.Box3().setFromObject(object),size=bbox.getSize(new THREE.Vector3());
 if(size.y<.001)throw Error('Modelo sem geometria mensurável');
 const s=height/size.y;
 object.scale.multiplyScalar(s);
 const center=bbox.getCenter(new THREE.Vector3());
 object.position.sub(center.multiplyScalar(s));
 object.updateMatrixWorld(true);
 return object;
}
function shadowMaterial(color,emissive){
 const m=new THREE.MeshStandardMaterial({
  color,roughness:.95,metalness:.06,emissive,emissiveIntensity:.26,
  envMapIntensity:.12,depthWrite:true,side:THREE.DoubleSide
 });
 // Real geometry silhouettes with view-dependent edge illumination.
 // The real facial details stay hidden, but the shape remains readable.
 const rgb=new THREE.Color(emissive);
 const c=rgb.toArray().map(v=>v.toFixed(5)).join(',');
 m.onBeforeCompile=shader=>{
  const anchor='#include <emissivemap_fragment>';
  shader.fragmentShader=shader.fragmentShader.replace(anchor,
   anchor+"\nfloat cinematicRim = pow(1. - abs(dot(normalize(normal),normalize(vViewPosition))),2.7);"+
   "\ntotalEmissiveRadiance += vec3("+c+") * cinematicRim * 1.25;");
 };
 m.customProgramCacheKey=()=>('galaxias-rim-'+c);
 return m;
}
function shadowMeshes(root,{color='#090715',emissive='#28122e'}={}){
 // Material próprio por elemento evita alterar assets que estão no jogo.
 const shadow=shadowMaterial(color,emissive);
 const originals=new Set(),textures=new Set();
 root.traverse(o=>{
  if(!o.isMesh)return;
  for(const m of (Array.isArray(o.material)?o.material:[o.material])){
   if(!m||originals.has(m))continue;
   originals.add(m);
   for(const v of Object.values(m))if(v?.isTexture)textures.add(v);
  }
  o.material=shadow;
  o.castShadow=false;o.receiveShadow=false;
  o.frustumCulled=false;
 });
 // Silhueta não usa texturas originais; liberá-las evita pressão de VRAM
 // no celular e preserva a geometria/armadura real do GLB.
 textures.forEach(t=>t.dispose());originals.forEach(m=>m.dispose());
}
function heartShape(){
 const sh=new THREE.Shape();
 sh.moveTo(0,-.68);
 sh.bezierCurveTo(-.12,-.45,-.85,.03,-.68,.47);
 sh.bezierCurveTo(-.46,.9,-.06,.79,0,.51);
 sh.bezierCurveTo(.06,.79,.46,.9,.68,.47);
 sh.bezierCurveTo(.85,.03,.12,-.45,0,-.68);
 return sh;
}
function hearts(parent,r){
 const shape=heartShape(),geo=new THREE.ShapeGeometry(shape,10);
 const mat=new THREE.MeshBasicMaterial({color:'#f367b6',transparent:true,opacity:.64,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
 const count=16,inst=new THREE.InstancedMesh(geo,mat,count),d=new THREE.Object3D();
 const update=t=>{
  for(let i=0;i<count;i++){
   const a=i*2*Math.PI/count + t*(.095+(i%3)*.024);
   const distance=r*(.75+.27*Math.sin(i*2.3+t*.15));
   d.position.set(Math.cos(a)*distance,Math.sin(a)*distance*.75+r*.13,r*(.9+.2*Math.sin(a*2+i)));
   d.rotation.set(0,0,.35*Math.sin(t*.4+i));
   const sc=r*(.055+(i%4)*.009)*(1+.12*Math.sin(t*2+i));
   d.scale.set(sc,sc,sc);d.updateMatrix();inst.setMatrixAt(i,d.matrix);
  }
  inst.instanceMatrix.needsUpdate=true;
 };
 parent.add(inst);update(0);
 return {update};
}
async function loadFirst(loader,paths){
 let lastErr;
 for(const path of paths)try{
  const gltf=await loader.loadAsync(new URL(path,import.meta.url).href);
  return {gltf,path};
 }catch(e){lastErr=e;}
 throw lastErr||new Error('Nenhum modelo disponível');
}
export function attachCinematicModels({root,environment,planets,detail,screenWidth,screenHeight,hero}){
 const loader=new GLTFLoader(),state={
  active:true,loaded:{},warnings:[],updaters:[],mixers:[],allocated:[],assets:{},
  angel:null,shadow:null
 };
 const viewportHeight={value:screenHeight};
 const alive=()=>state.active&&root.isConnected;
 const guardianPivot=new THREE.Group();
 guardianPivot.position.set(-screenWidth*.30,screenHeight*.225,-110);
 environment.add(guardianPivot);
 const angelHalo=new THREE.Mesh(new THREE.TorusGeometry(screenHeight*.078,screenHeight*.002,6,90),
   new THREE.MeshBasicMaterial({color:'#b4c5ee',transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending}));
 angelHalo.position.set(0,screenHeight*.145,-15);angelHalo.rotation.set(.15,.3,-.11);
 guardianPivot.add(angelHalo);
 const angelLight=new THREE.PointLight('#9caedc',65,screenHeight*.75,2);
 angelLight.position.set(-screenHeight*.12,screenHeight*.17,72);guardianPivot.add(angelLight);
 const loadAngel=async()=>{
  const {gltf,path}=await loadFirst(loader,ASSETS.guardian);
  if(!alive()){disposeModel(gltf.scene);return;}
  const figure=gltf.scene;
  figure.traverse(o=>{if(o.isMesh){const m=o.material;m.color.set('#d1d4dc');m.roughness=.57;m.metalness=.34;m.envMapIntensity=.75;m.emissive.set('#171923');m.transparent=true;m.depthWrite=false;
   m.onBeforeCompile=shader=>{shader.uniforms.uMenuHeight=viewportHeight;shader.vertexShader='varying float angelWorldY;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nangelWorldY=(modelMatrix*vec4(transformed,1.)).y;');shader.fragmentShader='uniform float uMenuHeight;varying float angelWorldY;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat pearlLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(vec3(pearlLuma),diffuseColor.rgb,.16);');shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>','gl_FragColor.a *= smoothstep(.02*uMenuHeight,.20*uMenuHeight,angelWorldY);\n#include <dithering_fragment>');};
   m.customProgramCacheKey=()=> 'menu-pearl-guardian';o.frustumCulled=false;
  }});
  fitModel(figure,screenHeight*.45);
  figure.rotation.y=.34;
  guardianPivot.add(figure);state.angel=figure;state.loaded.guardian=path;
  // Existindo uma animação adequada no rig, ela substitui o idle improvisado.
  if(gltf.animations?.length){
   const mixer=new THREE.AnimationMixer(figure);
   const idle=gltf.animations.find(a=>/idle|breath|float|respir|parado/i.test(a.name))||gltf.animations.find(a=>a.name==='Stand_Up1');
   if(idle){const action=mixer.clipAction(idle);action.play();if(idle.name==='Stand_Up1'){mixer.setTime(idle.duration*.98);action.paused=true;}else action.setEffectiveTimeScale(.22);state.mixers.push(mixer);root.dataset.gxGuardianAnimation=idle.name;}
  }
  root.dataset.gxGuardianModel=path.split('/').pop();
 };
 const loadMystery=async()=>{
  const {gltf,path}=await loadFirst(loader,[ASSETS.mysterious]);
  if(!alive()){disposeModel(gltf.scene);return;}
  state.loaded.lust=path;
  // Plano principal: figura humana real sobre a superfície do planeta.
  // Rosto e texturas originais sempre escondidos para manter o mistério.
  const create=(container,height)=>{
   const model=cloneSkinned(gltf.scene);
   shadowMeshes(model,{color:'#090512',emissive:'#2b0c28'});
   fitModel(model,height);
   const pivot=new THREE.Group();
   pivot.position.set(0,height*.04,74);pivot.add(model);
   container.add(pivot);
   const lamp=new THREE.PointLight('#f449ab',3.3,height*2.8,2);
   lamp.position.set(-height*.42,height*.41,0);container.add(lamp);
   const effect=hearts(container,height*.69);
   state.updaters.push(t=>{
    pivot.position.y=height*.04+Math.sin(t*.72)*height*.019;
    pivot.rotation.y=Math.sin(t*.33)*.13;
    effect.update(t);
   });
   return pivot;
  };
  create(planets[6],82);
  // Painel inferior troca de clone junto com a seleção: ao selecionar
  // Luxúria, a cópia da própria malha e dos corações aparece no detalhe.
  state.shadow=planets[6];
  root.dataset.gxLustModel=path.split('/').pop();
 };
 const loadHero=async()=>{
  const {gltf,path}=await loadFirst(loader,['./assets/ui/menu/hero-menu.glb','./Protagonista.glb']);
  if(!alive()){disposeModel(gltf.scene);return;}
  const model=gltf.scene;model.traverse(o=>{if(o.isMesh){o.material.color.set('#8d7c75');o.material.roughness=.76;o.material.metalness=.24;o.material.envMapIntensity=.25;}});
  fitModel(model,screenHeight*.22);model.rotation.y=Math.PI;model.position.y-=screenHeight*.04;
  if(gltf.animations?.length){const mixer=new THREE.AnimationMixer(model),idle=gltf.animations.find(c=>c.name==='Idle');if(idle){mixer.clipAction(idle).play();mixer.update(0);state.mixers.push(mixer);}}
  hero.children.filter(o=>o.name==='body-fallback').forEach(o=>o.visible=false);hero.add(model);root.dataset.gxHeroModel=path.split('/').pop();
 };
 const loadWings=async()=>{
  const {gltf}=await loadFirst(loader,['./Asas.glb']);
  if(!alive()){disposeModel(gltf.scene);return;}
  shadowMeshes(gltf.scene,{color:'#c1c8d0',emissive:'#464953'});fitModel(gltf.scene,screenHeight*.24);
  const wings=new THREE.Group();wings.add(gltf.scene);wings.position.set(-screenWidth*.30,screenHeight*.30,-120);environment.add(wings);
  const fallback=hero.parent.getObjectByName('menu-wings-fallback');if(fallback)fallback.visible=false;
  state.updaters.push(t=>{wings.rotation.z=-.22+Math.sin(t*.3)*.003;});root.dataset.gxWingsModel='Asas.glb';
 };
 const loadStorm=async()=>{
  const {gltf,path}=await loadFirst(loader,['./assets/ui/menu/storm-effigy.glb']);
  if(!alive()){disposeModel(gltf.scene);return;}
  gltf.scene.traverse(o=>{if(o.isMesh){o.material.color.set('#84606c');o.material.roughness=.65;o.material.metalness=.18;o.material.envMapIntensity=.5;}});fitModel(gltf.scene,screenHeight*.70);
  const fadedMaterials=new Set();
  gltf.scene.traverse(o=>{if(!o.isMesh||fadedMaterials.has(o.material))return;const m=o.material,previous=m.onBeforeCompile;fadedMaterials.add(m);m.transparent=true;m.depthWrite=false;m.onBeforeCompile=shader=>{previous.call(m,shader);shader.uniforms.uMenuHeight=viewportHeight;shader.vertexShader='varying float menuWorldY;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nmenuWorldY=(modelMatrix*vec4(transformed,1.)).y;');shader.fragmentShader='uniform float uMenuHeight;varying float menuWorldY;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`gl_FragColor.a *= smoothstep(-.08*uMenuHeight,.22*uMenuHeight,menuWorldY);\n#include <dithering_fragment>`);};m.customProgramCacheKey=()=> 'menu-storm-fade';});
  const pivot=new THREE.Group();pivot.position.set(screenWidth*.32,screenHeight*.10,-105);pivot.add(gltf.scene);gltf.scene.rotation.y=-.22;environment.add(pivot);
  const fallback=hero.parent.getObjectByName('menu-demon-fallback');if(fallback)fallback.visible=false;
  root.dataset.gxStormModel=path.split('/').pop();
 };
 const settled=Promise.allSettled([loadAngel(),loadMystery(),loadHero(),loadWings(),loadStorm()]);

 settled.then(results=>{
  results.forEach((result,i)=>{
   if(result.status==='rejected'){
    const message=['Anjo','Luxúria','Protagonista','Asas','Efígie'][i]+': '+result.reason?.message;
    state.warnings.push(message);console.warn('[Menu GLB]',message);
   }
  });
  if(alive())root.dataset.gxActorsReady='true';
 });
 return {
  state,ready:settled,resize(height){viewportHeight.value=height;},
  update(dt,time){
   if(!state.active)return;
   state.mixers.forEach(m=>m.update(dt));
   if(!state.mixers.length&&state.angel)state.angel.position.y=Math.sin(time*.67)*screenHeight*.003;
   angelHalo.material.opacity=.74+Math.sin(time*.35)*.035;
   state.updaters.forEach(fn=>fn(time));
  },
  stop(){state.active=false;state.mixers.forEach(m=>{m.stopAllAction();m.uncacheRoot(m.getRoot());});}
 };
}
