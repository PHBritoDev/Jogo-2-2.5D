/** Menu-only CC0 photogrammetry from Poly Haven; provenance beside the assets. */
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
function dispose(root){const gs=new Set(),ms=new Set(),ts=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m?.isMaterial)ms.add(m);});ms.forEach(m=>{Object.values(m).forEach(t=>{if(t?.isTexture)ts.add(t);});m.dispose();});gs.forEach(g=>g.dispose());ts.forEach(t=>t.dispose());}
function fit(object,height){object.updateMatrixWorld(true);const box=new T.Box3().setFromObject(object),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),pivot=new T.Group();object.position.sub(center);pivot.add(object);pivot.scale.setScalar(height/size.y);return pivot;}
export function attachScannedScenery({root,scene,renderer,stage,planets,sky,width:W,height:H}){
 let alive=true,environmentMap,skyTexture;
 const refreshEnvironment=()=>{if(!skyTexture||!alive)return;environmentMap?.dispose();const pmrem=new T.PMREMGenerator(renderer);environmentMap=pmrem.fromEquirectangular(skyTexture);pmrem.dispose();scene.environment=environmentMap.texture;};
 const loader=new GLTFLoader(),base=new URL('./assets/ui/menu/polyhaven/',import.meta.url);
 const scenery=new T.Group();stage.group.add(scenery);
 const ready=Promise.allSettled([
  loader.loadAsync(new URL('rock_face_02/rock-menu.glb',base).href).then(({scene:model})=>{
   if(!alive){dispose(model);return;}
   model.traverse(o=>{if(o.isMesh){o.material.color.set('#9c9ca4');o.material.roughness=.96;o.material.envMapIntensity=.3;}});
   // Shared mesh/material clones: scanned strata replace rounded placeholder boulders.
   for(let i=0;i<(W<950?6:10);i++){
    const side=i%2?-1:1,j=Math.floor(i/2),rock=fit(model.clone(true),H*(.23+j*.023));
    rock.position.set(side*W*(.24+j*(W<950?.13:.07)),-H*(.37+j*.025),-120+j*9);
    rock.rotation.set(.04,side*(.08+j*.05),side*(.05+j*.025));scenery.add(rock);
   }
   stage.rocks.visible=false;root.dataset.gxScannedRock='rock_face_02';
  }),
  loader.loadAsync(new URL('modular_fort_01/modular_fort_01.gltf',base).href).then(({scene:model})=>{
   if(!alive){dispose(model);return;}
   model.traverse(o=>{if(o.isMesh){o.material.color.set('#72717f');o.material.envMapIntensity=.4;}});
   const find=suffix=>model.getObjectByName('modular_fort_01_'+suffix);
   const tower=find('tower_round'),gate=find('wall_thin_gate_01'),wall=find('wall_thick_straight_01');
   if(!tower||!wall||!gate){dispose(model);throw Error('CC0 fort modules missing');}
   let masonry;wall.traverse(o=>{if(o.isMesh&&!masonry)masonry=o.material;});
   if(masonry){
    for(const key of ['map','normalMap','roughnessMap','aoMap'])if(masonry[key])stage.stone[key]=masonry[key];stage.stone.needsUpdate=true;
    planets[0].getObjectByName('golden-citadel')?.traverse(o=>{if(o.isMesh&&o.material?.isMeshStandardMaterial){o.material.map=masonry.map;o.material.normalMap=masonry.normalMap;o.material.roughness=.72;o.material.envMapIntensity=.3;o.material.needsUpdate=true;}});
   }
   for(const side of [-1,1]){
    for(let i=0;i<3;i++){
     const t=fit(tower.clone(true),H*(.11+i*.028));t.position.set(side*W*(.25+i*.11),-H*(.17+i*.02),-135);t.rotation.y=-side*.35;scenery.add(t);const roof=new T.Mesh(new T.ConeGeometry(H*(.026+i*.004),H*(.08+i*.015),8),new T.MeshStandardMaterial({color:'#24212b',metalness:.25,roughness:.75}));roof.position.copy(t.position);roof.position.y+=H*(.09+i*.022);scenery.add(roof);
    }
    const g=fit(gate.clone(true),H*.13);g.position.set(side*W*.34,-H*.22,-124);g.scale.x*=1.7;scenery.add(g);
   }
   // A scanned masonry ring supports the golden city's original gothic towers.
   for(let i=0;i<4;i++){
    const t=fit(tower.clone(true),19+i%2*6);t.position.set((i-1.5)*21,30,51);t.rotation.y=i*.7;
    t.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.set('#c49c53');o.material.metalness=.45;o.material.envMapIntensity=.8;}});planets[0].add(t);
   }
   // Retain the source tree invisibly so the scene's owner disposes every source material/geometry.
   model.visible=false;scenery.add(model);root.dataset.gxScannedFort='modular_fort_01';
  }),
  new RGBELoader().loadAsync(new URL('clouds.hdr',base).href).then(texture=>{
   if(!alive){texture.dispose();return;}
   skyTexture=texture;refreshEnvironment();
   sky.uniforms.uClouds.value=texture;sky.uniforms.uHasClouds.value=1;root.dataset.gxEnvironment='CC0-clouds';
  })
 ]).then(results=>{for(const r of results)if(r.status==='rejected')console.warn('[Menu scenery]',r.reason);});
 return {ready,restore:refreshEnvironment,stop(){alive=false;scene.environment=null;environmentMap?.dispose();}};
}
