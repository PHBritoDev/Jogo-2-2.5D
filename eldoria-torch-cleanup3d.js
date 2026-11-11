/**
 * Remove fire geometry baked into TochaMedievalTripo.glb while retaining the
 * actual authored 3D iron shaft and brazier. The imported GLB has a single
 * textured mesh, so deleting 'flame' by mesh name is impossible.
 *
 * Only runs once when this specific torch GLB loads. Never affects trees,
 * combat, other GLBs, or runtime per-frame performance.
 */
export function removeTorchBakedFlames(source, topFraction = .74) {
  const stats={meshes:0,trianglesBefore:0,trianglesAfter:0,cut:topFraction};
  source.traverse(o=>{
    if(!o.isMesh||!o.geometry?.attributes?.position)return;
    const geo=o.geometry,vertices=geo.attributes.position,index=geo.index;
    geo.computeBoundingBox();
    const {min,max}=geo.boundingBox,cut=min.y+(max.y-min.y)*topFraction;
    if(!(max.y>min.y))return;
    const n=index?index.count:vertices.count;
    const keep=[];
    for(let j=0;j+2<n;j+=3){
      const a=index?index.getX(j):j,b=index?index.getX(j+1):j+1,c=index?index.getX(j+2):j+2;
      // Keep only triangles entirely below the start of the high flame.
      if(Math.max(vertices.getY(a),vertices.getY(b),vertices.getY(c))<=cut)keep.push(a,b,c);
    }
    const result=geo.clone();
    result.setIndex(keep);result.clearGroups();
    result.computeBoundingBox();result.computeBoundingSphere();
    o.geometry=result;
    stats.meshes++;stats.trianglesBefore+=Math.floor(n/3);stats.trianglesAfter+=Math.floor(keep.length/3);
  });
  return stats;
}
