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
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
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
 return new THREE.MeshStandardMaterial({
  color,roughness:.96,metalness:.05,emissive,emissiveIntensity:.2,
  depthWrite:true,side:THREE.DoubleSide
 });
}
function shadowMeshes(root,{color='#090715',emissive='#28122e'}={}){
 // Material próprio por elemento evita alterar assets que estão no jogo.
 root.traverse(o=>{
  if(!o.isMesh)return;
  o.material=shadowMaterial(color,emissive);
  o.castShadow=false;o.receiveShadow=false;
  o.frustumCulled=false;
 });
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
export function attachCinematicModels({root,environment,planets,detail,screenWidth,screenHeight}){
 const loader=new GLTFLoader(),state={
  active:true,loaded:{},warnings:[],updaters:[],mixers:[],allocated:[],assets:{},
  angel:null,shadow:null
 };
 const alive=()=>state.active&&root.isConnected;
 const guardianPivot=new THREE.Group();
 guardianPivot.position.set(-screenWidth*.31,screenHeight*.265,-110);
 environment.add(guardianPivot);
 const angelHalo=new THREE.Mesh(new THREE.TorusGeometry(screenHeight*.115,screenHeight*.0025,6,90),
   new THREE.MeshBasicMaterial({color:'#b4c5ee',transparent:true,opacity:.42,depthWrite:false,blending:THREE.AdditiveBlending}));
 angelHalo.position.set(0,screenHeight*.125,-15);angelHalo.rotation.set(.15,.3,-.11);
 guardianPivot.add(angelHalo);
 const angelLight=new THREE.PointLight('#9caedc',65,screenHeight*.75,2);
 angelLight.position.set(-screenHeight*.12,screenHeight*.17,72);guardianPivot.add(angelLight);
 const loadAngel=async()=>{
  const {gltf,path}=await loadFirst(loader,ASSETS.guardian);
  if(!alive())return;
  const figure=gltf.scene;
  shadowMeshes(figure,{color:'#161b2a',emissive:'#2b354e'});
  fitModel(figure,screenHeight*.56);
  figure.rotation.y=-.12;
  guardianPivot.add(figure);state.angel=figure;state.loaded.guardian=path;
  // Existindo uma animação adequada no rig, ela substitui o idle improvisado.
  if(gltf.animations?.length){
   const mixer=new THREE.AnimationMixer(figure);
   const idle=gltf.animations.find(a=>/idle|breath|float|respir|parado/i.test(a.name))||gltf.animations[0];
   if(idle){mixer.clipAction(idle).setEffectiveWeight(.8).play();state.mixers.push(mixer);}
  }
  root.dataset.gxGuardianModel=path.split('/').pop();
 };
 const loadMystery=async()=>{
  const {gltf,path}=await loadFirst(loader,[ASSETS.mysterious]);
  if(!alive())return;
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
 const settled=Promise.allSettled([loadAngel(),loadMystery()]);
 settled.then(results=>{
  results.forEach((result,i)=>{
   if(result.status==='rejected'){
    const message=(i?'Luxúria':'Anjo')+': '+result.reason?.message;
    state.warnings.push(message);console.warn('[Menu GLB]',message);
   }
  });
  if(alive())root.dataset.gxModelsReady='true';
 });
 return {
  state,ready:settled,
  update(dt,time){
   if(!state.active)return;
   state.mixers.forEach(m=>m.update(dt));
   if(!state.mixers.length&&state.angel)state.angel.position.y=Math.sin(time*.67)*screenHeight*.003;
   angelHalo.material.opacity=.3+Math.sin(time*.7)*.13;
   state.updaters.forEach(fn=>fn(time));
  },
  stop(){state.active=false;state.mixers.forEach(m=>m.stopAllAction());}
 };
}
