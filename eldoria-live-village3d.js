/**
 * Eldória — módulo de substituição visual da cidade antiga no mundo jogável.
 * Os modelos GLB autorais são normalizados antes do posicionamento, como na prévia.
 * O cenário usa as coordenadas das antigas casas para preservar NPCs, lojas,
 * checkpoints, caminhos e missões existentes enquanto o roteiro V1 é integrado.
 *
 * Esta etapa NÃO injeta o roteiro proposto no gameplay nem muda a campanha.
 */
export function mountEldoriaLiveVillage({
  THREE,GLTFLoader,group,groundHeightAt,center,obstacles,lowSpec=false
}){
  if(!THREE||!GLTFLoader||!group||!groundHeightAt||!center||!obstacles)throw new Error('Eldoria: integration dependencies missing');
  const loader=new GLTFLoader();
  const promises=[],root=new THREE.Group();
  root.name='EldoriaCity1Live';
  group.add(root);
  const plots=[
    [-16,-16,'CasaEldoria01.glb',5.7,.3],[-5,-18,'CasaEldoria02.glb',5.9,-.3],
    [9,-17,'CasaEldoria01.glb',6.2,.18],[18,-9,'CasaEldoria02.glb',5.9,-.22],
    [-18,13,'CasaEldoria02.glb',6.3,.16],[-8,17,'CasaEldoria01.glb',5.7,-.32],
    [8,17,'CasaEldoria01.glb',6.0,.4],[18,12,'CasaEldoria02.glb',6.1,-.22],
    [-19,-3,'CasaEldoria01.glb',5.1,.23],[19,2,'CasaEldoria02.glb',5.4,-.34]
  ];
  const market=[
    [2.85,-2.5,3.65,.15],[-2.05,3.75,3.55,Math.PI],
    [4.5,3,3.7,.2],[1.8,-7.6,3.5,Math.PI]
  ];
  const props=[
    ['PocoEldoria.glb',-1.4,-.6,3.15,0,1.2],
    ['FerreiroEldoria.glb',16,-19,5.6,Math.PI*.3,2.4],
    ['Carroça.glb',-10,-27,3.6,.7,1.45],
    ['RochedoMusgoEldoria.glb',-23,-19,3.8,.2,1.75],
    ['RochedoMusgoEldoria.glb',22,17,4.1,.8,2],
  ];
  const specs=[];
  for(const [x,z,file,size,rotation] of plots)specs.push({file,x,z,size,rotation,collision:2.25,kind:'house'});
  for(const [x,z,size,rotation] of market)specs.push({file:'BarracaFrutasEldoria.glb',x,z,size,rotation,collision:1.22,kind:'market'});
  for(const [file,x,z,size,rotation,collision] of props)specs.push({file,x,z,size,rotation,collision,kind:'prop'});
  // Nunca duplicar GLB por arquivo. Um load, muitas instâncias estáticas.
  const sources=new Map(),failures=[];
  function fetchModel(file){
    if(!sources.has(file))sources.set(file,new Promise(resolve=>{
      loader.load('./'+file,gltf=>{
        try{
          const src=gltf.scene;
          const bounds=new THREE.Box3().setFromObject(src);
          if(bounds.isEmpty())throw Error('empty GLB');
          const size=bounds.getSize(new THREE.Vector3());
          const centerPoint=bounds.getCenter(new THREE.Vector3());
          resolve({src,size,centerPoint,bottom:bounds.min.y});
        }catch(error){failures.push(file+': '+error.message);resolve(null);}
      },undefined,error=>{failures.push(file+': '+(error?.message||String(error)));resolve(null);});
    }));
    return sources.get(file);
  }
  for(const spec of specs){
    promises.push(fetchModel(spec.file).then(asset=>{
      if(!asset)return;
      const obj=new THREE.Group();
      const model=asset.src.clone(true);
      const normalizedScale=spec.size/Math.max(.01,asset.size.x,asset.size.y,asset.size.z);
      model.scale.setScalar(normalizedScale);
      model.position.set(-asset.centerPoint.x*normalizedScale,-asset.bottom*normalizedScale,-asset.centerPoint.z*normalizedScale);
      obj.add(model);
      obj.position.set(center.x+spec.x,groundHeightAt(center.x+spec.x,center.z+spec.z),center.z+spec.z);
      obj.rotation.y=spec.rotation;
      obj.name='Eldoria_'+spec.kind+'_'+spec.file;
      obj.traverse(child=>{if(child.isMesh){child.receiveShadow=true;child.castShadow=!lowSpec&&spec.kind==='house';}});
      root.add(obj);
      obstacles.push({x:obj.position.x,z:obj.position.z,radius:spec.collision,height:spec.size});
    }));
  }
  // Os NPCs ficam nas mesmas posições que usavam na vila antiga.
  // Não eliminar objetos interativos nem recolocar os NPCs por estética.
  const complete=Promise.all(promises).then(()=>({
    loaded:specs.length-failures.length,expected:specs.length,failures:[...failures],
    root
  }));
  return {root,complete,expected:specs.length,failures};
}
