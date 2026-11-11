/**
 * The author's TochaMedievalTripo.glb is one textured mesh: its flat, bright
 * triangular fire is painted into the SAME mesh as the real iron brazier.
 * Hiding separate objects cannot remove it. Keep the original 3D shaft and
 * material, but discard only the fire-colored pixels above the burner.
 *
 * No new torches, flame planes, sprites or particles are generated.
 */
export function removeTorchBakedFlames(source) {
 const stats={meshes:0,materials:0};
 const used=new Set();
 source.traverse(o=>{
  if(!o.isMesh||!o.geometry?.attributes?.position)return;
  stats.meshes++;
  for(const mat of (Array.isArray(o.material)?o.material:[o.material])){
   if(!mat||used.has(mat))continue;used.add(mat);
   // GLB mesh coordinates: Y runs 0..1; shaft/bowl are dark, baked fire is bright.
   // The more strongly colored material is cut only above the burner, preserving
   // the physical 3D torch below.
   const previous=mat.onBeforeCompile;
   mat.onBeforeCompile=shader=>{
    if(previous)previous(shader);
    shader.vertexShader=shader.vertexShader
     .replace('#include <common>','#include <common>\nvarying float vTorchLocalY;')
     .replace('#include <begin_vertex>','#include <begin_vertex>\nvTorchLocalY=position.y;');
    shader.fragmentShader=shader.fragmentShader
     .replace('#include <common>','#include <common>\nvarying float vTorchLocalY;')
     .replace('#include <map_fragment>',`#include <map_fragment>
      // Remove the embedded flame, not the metal brazier or shaft.
      if(vTorchLocalY>.58) discard;
      if(vTorchLocalY>.32 && diffuseColor.r>.26 && diffuseColor.g>.13 &&
         diffuseColor.r>diffuseColor.b*1.65 &&
         diffuseColor.g>diffuseColor.b*1.12) discard;
      if(vTorchLocalY>.32 && diffuseColor.r>.68 && diffuseColor.g>.60 &&
         diffuseColor.b>.28) discard;`);
   };
   mat.customProgramCacheKey=()=> 'tocha-autoral-sem-chama-triangular-v2';
   mat.needsUpdate=true;mat.userData.torchFlameMask=true;stats.materials++;
  }
 });
 return stats;
}
