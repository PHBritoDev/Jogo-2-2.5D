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
  const tests=role==='walk'?[/walk/i,/idle|breath/i]:role==='down'?[/side.?lying|falling.?down|knock.?down|lie|sleep|dead|down/i,/idle|breath/i]:role==='sit'?[/sit|sitting|rest/i,/arise/i,/idle|breath/i]:[/idle|breath|stand/i];
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
  const nativeDown=role==='down'&&(gltf.animations||[]).some(c=>/side.?lying|falling.?down|knock.?down|sleep|lying/i.test(c.name));
  if(role==='down'&&!nativeDown){
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
     const width=child?.18:sex==='man'?.255:.28;
     const maxHeight=child?.23:sex==='man'?.27:.42;
     // IMPORTANTE: os GLBs de cabelo têm eixo Y muito maior que X/Z.
     // Normalizar apenas pela largura produzia cabelos de 6–9 m (NPCs gigantes ao deitar).
     const scale=Math.min(width/Math.max(.01,hs.x,hs.z),maxHeight/Math.max(.01,hs.y));
     hairScene.scale.setScalar(scale);
     hairScene.position.set(-hc.x*scale,-hb.min.y*scale,-hc.z*scale);
     mesh.add(hairScene);
     mesh.name='CabeloMeshy';mesh.position.set(0,child?.055:.085,0);
     head[0].add(mesh);
    }catch(error){console.warn('Cabelo Meshy não carregou:',hairFile,error);}
   }else console.warn('NPC sem osso Head identificado; cabelo separado não anexado:',file);
  }
  const nativeClips=gltf.animations||[];
  // Em alguns GLBs só há Walking/Running: evitar a pose rígida em T.
  const clip=clipFor(nativeClips,role)||nativeClips.find(c=>/walking/i.test(c.name))||null;
  const mixer=clip?new THREE.AnimationMixer(src):null;
  const action=mixer?mixer.clipAction(clip):null;
  if(action){
   action.play();
   if(role==='idle'||role==='sit'||role==='down'){
    // Captura uma pose natural do clipe, mas não anima caminhada parado.
    const fraction=role==='down'&&nativeDown?.90:role==='sit'?.32:.28;
    mixer.update(Math.min(Math.max(clip.duration*fraction,.08),Math.max(.55,clip.duration*.95)));
    action.paused=true;
   }
  }
  // O corpo já foi normalizado antes do cabelo. Nunca redimensionar o CORPO
  // para compensar a altura de um acessório: foi a causa da regressão anterior.
  holder.updateMatrixWorld(true);
  let finalBox=new THREE.Box3().setFromObject(holder);
  if(finalBox.isEmpty())throw Error('NPC sem geometria visível: '+file);
  const dimensions=finalBox.getSize(new THREE.Vector3());
  if(Math.max(dimensions.x,dimensions.y,dimensions.z)>3.0)
   throw Error('Dimensões anormais do NPC '+file+' ('+dimensions.toArray()+')');
  const base=groundHeightAt(x,z);
  holder.position.y+=base-finalBox.min.y+.015;
  // Centralização horizontal após a pose real, importante para quem está deitado.
  const pivot=finalBox.getCenter(new THREE.Vector3());
  holder.position.x+=x-pivot.x;holder.position.z+=z-pivot.z;
  holder.updateMatrixWorld(true);
  finalBox.setFromObject(holder);
  return {holder,mixer,action,role,file,actualHeight:finalBox.getSize(new THREE.Vector3()).y,hair:hair?((sex==='woman'||sex==='girl')?ELDORIA_NPC_MODELS.femaleHair:ELDORIA_NPC_MODELS.maleHair):null,clips:nativeClips.map(c=>c.name)};
 }
 return {create};
}
