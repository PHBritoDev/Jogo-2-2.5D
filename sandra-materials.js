// Mod 214: keep the long hem and hair above the character's local floor after
// skinning. Body/boot contact is baked into the GLB; no gameplay state changes.
import {MeshDepthMaterial, MeshDistanceMaterial, RGBADepthPacking} from 'three';
export function prepareSandraMaterials(model){
 const patch=material=>{
  material.onBeforeCompile=shader=>{
   const hook='#include <skinning_vertex>';
   if(!shader.vertexShader.includes(hook))throw new Error('Sandra: skinning shader hook missing');
   shader.vertexShader=shader.vertexShader.replace(hook,hook+'\ntransformed.y = max(transformed.y, 0.006);');
  };
  material.customProgramCacheKey=()=> 'sandra-floor-214';
  material.needsUpdate=true;
 };
 model.traverse(mesh=>{
  if(!mesh.isSkinnedMesh||!['Saia','Cabelo'].includes(mesh.material?.name))return;
  patch(mesh.material);
  mesh.customDepthMaterial=new MeshDepthMaterial({depthPacking:RGBADepthPacking,side:mesh.material.side});
  mesh.customDistanceMaterial=new MeshDistanceMaterial({side:mesh.material.side});
  patch(mesh.customDepthMaterial);patch(mesh.customDistanceMaterial);
 });
}
