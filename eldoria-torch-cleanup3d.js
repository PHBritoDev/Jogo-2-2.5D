/**
 * TochaMedievalTripo.glb brings a painted polygonal flame INSIDE its single
 * textured mesh (not a separate object). Retain the authored iron shaft and
 * brazier, remove only baked bright fire triangles and high fire geometry.
 *
 * One-time CPU work on GLB load; no changes to per-frame rendering/quality.
 */
export function removeTorchBakedFlames(source, topFraction=.90) {
  const stats={meshes:0,trianglesBefore:0,trianglesAfter:0,removedByColor:0,removedByHeight:0};
  source.traverse(o=>{
    if(!o.isMesh||!o.geometry?.attributes?.position)return;
    const geo=o.geometry,vertices=geo.attributes.position,uv=geo.attributes.uv,index=geo.index;
    geo.computeBoundingBox();
    const {min,max}=geo.boundingBox,dy=max.y-min.y;
    if(!(dy>0))return;
    const material=Array.isArray(o.material)?o.material[0]:o.material;
    const map=material?.map,img=map?.image;
    let bitmap=null,w=0,h=0;
    if(img&&uv&&typeof document!=='undefined')try{
      w=img.width;h=img.height;
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(img,0,0,w,h);bitmap=ctx.getImageData(0,0,w,h).data;
      canvas.width=0;canvas.height=0;
    }catch(e){console.warn('Tocha: textura sem amostragem, usar apenas altura',e);bitmap=null;}
    function sample(a,b,c){
      if(!bitmap)return null;
      const u=(uv.getX(a)+uv.getX(b)+uv.getX(c))/3,v=(uv.getY(a)+uv.getY(b)+uv.getY(c))/3;
      const tx=Math.min(w-1,Math.max(0,Math.floor(((u%1)+1)%1*w)));
      const vy=map.flipY?1-v:v,ty=Math.min(h-1,Math.max(0,Math.floor(((vy%1)+1)%1*h)));
      const i=(ty*w+tx)*4;
      return [bitmap[i],bitmap[i+1],bitmap[i+2]];
    }
    const n=index?index.count:vertices.count,keep=[];
    for(let j=0;j+2<n;j+=3){
      const a=index?index.getX(j):j,b=index?index.getX(j+1):j+1,c=index?index.getX(j+2):j+2;
      const y=Math.max(vertices.getY(a),vertices.getY(b),vertices.getY(c)),p=sample(a,b,c);
      // Flame is very bright yellow/orange/cream; the ironwork is dark brown.
      const bright=p&&((p[0]>160&&p[1]>100&&p[0]>p[2]*1.45&&p[1]>p[2]*1.2)||
                         (p[0]>205&&p[1]>186&&p[2]>110));
      const flameByColor=bright&&y>min.y+dy*.36;
      const highFire=y>min.y+dy*topFraction;
      if(flameByColor){stats.removedByColor++;continue;}
      if(highFire){stats.removedByHeight++;continue;}
      keep.push(a,b,c);
    }
    const result=geo.clone();result.setIndex(keep);result.clearGroups();
    result.computeBoundingBox();result.computeBoundingSphere();
    o.geometry=result;
    stats.meshes++;stats.trianglesBefore+=Math.floor(n/3);stats.trianglesAfter+=Math.floor(keep.length/3);
    // The material and texture are the ORIGINAL GLB, no fake 2D geometry added.
  });
  return stats;
}
