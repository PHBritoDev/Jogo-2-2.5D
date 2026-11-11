/** Eldória — NPCs Meshy recentes, sem Npc.glb, NpcEspecial ou personagens procedurais. */
export const ELDORIA_NPC_MODELS=Object.freeze({
 man:'NPC_Masculino_Animado_Otimizado_1K.glb',
 woman:'MulherNpc-otimizado.glb',
 boy:'CriancaNpc-otimizado.glb',
 girl:'MeninaNpc-otimizado.glb',
 maleHair:'Cabelo-otimizado.glb',
 femaleHair:'CabeloMulher-otimizado.glb'
});
export const ELDORIA_NPC_ROLES=Object.freeze([
 {role:'vendedor-idoso',sex:'man',job:'organiza provisoes com dificuldade'},
 {role:'vendedor-meia-idade',sex:'man',job:'vigia alimentos e conversa'},
 {role:'vendedora-meia-idade',sex:'woman',job:'separa os frutos ainda aproveitaveis'},
 {role:'morador-desmaiado',sex:'man',job:'sem forcas junto a uma casa'},
 {role:'moradora-desmaiada',sex:'woman',job:'desmaiada longe da passagem'},
 {role:'morador-sentado',sex:'man',job:'descansa sem forcas perto da praca'},
 {role:'moradora-caminhando',sex:'woman',job:'caminha lentamente em busca de ajuda'}
]);
/** Compartilha downloads entre instâncias. Nenhuma malha substituta por código se o GLB falhar. */
export function createMeshyNpcFactory({THREE,GLTFLoader,cloneSkinned,groundHeightAt}){
 const loader=new GLTFLoader(),cache=new Map();
 const load=file=>{
  if(!cache.has(file))cache.set(file,new Promise((resolve,reject)=>loader.load('./'+file,resolve,undefined,reject)));
  return cache.get(file);
 };
 const clipFor=(clips,role)=> {
  const tests=role==='walk'?[/walk/i,/idle|breath/i]:role==='down'?[/fall|lie|sleep|dead|down/i,/idle|breath/i]:[/idle|breath|stand/i];
  for(const re of tests){const found=clips.find(c=>re.test(c.name)&&!/(attack|combat|sword)/i.test(c.name));if(found)return found;}
  return null;
 };
 async function create({sex,age='adult',role='idle',x,z,yaw=0,hair=true}){
  const file=ELDORIA_NPC_MODELS[sex];if(!file)throw Error('NPC Meshy desconhecido: '+sex);
  const gltf=await load(file),src=cloneSkinned(gltf.scene),box=new THREE.Box3().setFromObject(src);
  const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  if(size.y<.01||!Number.isFinite(size.y))throw Error('Altura NPC invalida: '+file);
  const target=sex==='boy'||sex==='girl'?1.18:age==='elder'?1.57:1.72;
  const k=target/size.y,holder=new THREE.Group(),body=new THREE.Group();
  // Normaliza dimensoes mantendo rig e clips no mesmo espaço local.
  src.scale.setScalar(k);src.position.set(-center.x*k,-box.min.y*k,-center.z*k);
  body.add(src);holder.add(body);holder.name='NPC-Meshy-'+sex+'-'+role;
  holder.position.set(x,groundHeightAt(x,z),z);holder.rotation.y=yaw;
  if(role==='down'){
   body.rotation.z=(sex==='woman'||sex==='girl'?-1:1)*Math.PI/2;
   body.rotation.x=.12;
   holder.updateMatrixWorld(true);
   const lying=new THREE.Box3().setFromObject(holder);
   body.position.y+=groundHeightAt(x,z)-lying.min.y+.035;
  }
  if(role==='sit'){
   body.rotation.x=-.14;
   holder.updateMatrixWorld(true);
   const sitting=new THREE.Box3().setFromObject(holder);
   body.position.y+=groundHeightAt(x,z)-sitting.min.y+.025;
  }
  src.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
  // Cabelos autorais: somente se o modelo tiver osso de cabeça válido.
  // Evita posicionar cabelo no ar com rig incompatível.
  if(hair){
   const hairFile=(sex==='woman'||sex==='girl')?ELDORIA_NPC_MODELS.femaleHair:ELDORIA_NPC_MODELS.maleHair;
   const head=[];src.traverse(o=>{if(o.isBone&&/(^head$|head$|cabeca$)/i.test(o.name))head.push(o);});
   if(head.length){
    try{
     const hairGltf=await load(hairFile),hairScene=hairGltf.scene.clone(true);
     const hb=new THREE.Box3().setFromObject(hairScene),hs=hb.getSize(new THREE.Vector3()),hc=hb.getCenter(new THREE.Vector3());
     // Pequeno acessório fixado ao osso, sem animação extra por frame.
     const mesh=new THREE.Group();const child=sex==='boy'||sex==='girl';
     const width=child?.245:.335,scale=width/Math.max(.01,hs.x,hs.z);
     hairScene.scale.setScalar(scale);hairScene.position.set(-hc.x*scale,-hb.min.y*scale,-hc.z*scale);mesh.add(hairScene);
     mesh.name='CabeloMeshy';mesh.position.set(0,child?.045:.075,0);
     head[0].add(mesh);
    }catch(error){console.warn('Cabelo Meshy não carregou:',hairFile,error);}
   }else console.warn('NPC sem osso Head identificado; cabelo separado não anexado:',file);
  }
  const clip=clipFor(gltf.animations||[],role),mixer=clip?new THREE.AnimationMixer(src):null;
  const action=mixer?mixer.clipAction(clip):null;
  if(action){action.play();if(role==='down'||role==='sit')action.paused=true;}
  return {holder,mixer,action,role,file,hair:hair?((sex==='woman'||sex==='girl')?ELDORIA_NPC_MODELS.femaleHair:ELDORIA_NPC_MODELS.maleHair):null,clips:(gltf.animations||[]).map(c=>c.name)};
 }
 return {create};
}
