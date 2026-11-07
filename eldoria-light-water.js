/**
 * Eldória: iluminação e água de duas qualidades para a prévia isolada.
 * Uma única luz direcional projeta sombras. A água usa normais procedurais
 * e deslocamento discreto na GPU (sem render-target de reflexão por frame).
 */
export function createEldoriaLighting(THREE,{renderer,scene,camera,sun,ambient,lowSpec}){
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
  sun.castShadow=true;
  const resolution=lowSpec?1024:2048;
  sun.shadow.mapSize.set(resolution,resolution);
  sun.shadow.bias=-0.0002;
  sun.shadow.normalBias=.035;
  const cam=sun.shadow.camera;
  const extent=lowSpec?52:65;
  cam.left=-extent;cam.right=extent;cam.top=extent;cam.bottom=-extent;
  cam.near=1;cam.far=260;cam.updateProjectionMatrix();
  sun.target.position.set(0,0,0);scene.add(sun.target);
  // Procedural light environment generated only once; never per frame.
  let envTarget=null;
  if(!lowSpec){
    const environment=new THREE.Scene();
    environment.background=new THREE.Color(0xbedbe3);
    environment.add(new THREE.HemisphereLight(0xf5fff0,0x6b827d,2.5));
    const environmentSun=new THREE.DirectionalLight(0xffeed1,2);
    environmentSun.position.set(-3,8,4);environment.add(environmentSun);
    const pmrem=new THREE.PMREMGenerator(renderer);
    envTarget=pmrem.fromScene(environment,0.05,0.1,40,{size:64});
    scene.environment=envTarget.texture;
    scene.environmentIntensity=.55;
    pmrem.dispose();
  }
  let lastX=NaN,lastZ=NaN;
  function focus(x,z,force=false){
    if(!force&&Math.abs(lastX-x)<10&&Math.abs(lastZ-z)<10)return;
    lastX=x;lastZ=z;
    sun.target.position.set(x,0,z);
    sun.position.set(x-65,120,z+35);
    sun.target.updateMatrixWorld();
    sun.updateMatrixWorld();
    renderer.shadowMap.needsUpdate=true;
  }
  function setNight(night){
    // Nocturnal shadows remain soft and understated, without adding shadow lights.
    sun.intensity=night?.35:2.35;
    sun.color.set(night?0x9caedf:0xffeed1);
    ambient.intensity=night?.9:1.7;
    ambient.color.set(night?0x8aa5c6:0xeaf4e5);
    scene.environmentIntensity=night?.20:.55;
    renderer.shadowMap.needsUpdate=true;
  }
  return {focus,setNight,shadowResolution:resolution,dispose(){envTarget?.dispose();}};
}
function makeNormalTexture(THREE,size=128){
  const pixels=new Uint8Array(size*size*4);
  const h=(u,v)=>Math.sin(u*2*Math.PI*3+Math.sin(v*2*Math.PI*2)*.6)*.17
    +Math.sin(v*2*Math.PI*5+u*2*Math.PI*2)*.095
    +Math.sin((u+v)*2*Math.PI*7)*.035;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size,e=1/size;
    const dx=(h(u+e,v)-h(u-e,v))/(2*e)*.055;
    const dy=(h(u,v+e)-h(u,v-e))/(2*e)*.055;
    const n=new THREE.Vector3(-dx,-dy,1).normalize();
    const i=(y*size+x)*4;
    pixels[i]=Math.round((n.x*.5+.5)*255);
    pixels[i+1]=Math.round((n.y*.5+.5)*255);
    pixels[i+2]=Math.round((n.z*.5+.5)*255);
    pixels[i+3]=255;
  }
  const texture=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat);
  texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;texture.needsUpdate=true;
  return texture;
}
export function createEldoriaWater(THREE,{lowSpec}){
  const normalMap=makeNormalTexture(THREE,lowSpec?64:128);
  normalMap.repeat.set(3.8,3.8);
  const createMaterial=(lake=false)=>{
    const shared={color:lake?0x56c8cd:0x39a9bd,roughness:lake?.17:.13,
      metalness:0,normalMap,normalScale:new THREE.Vector2(.19,.19),
      transparent:true,opacity:lake?.84:.77,depthWrite:false,
      side:THREE.DoubleSide};
    const material=lowSpec?new THREE.MeshStandardMaterial(shared):
      new THREE.MeshPhysicalMaterial({...shared,clearcoat:.7,clearcoatRoughness:.13,ior:1.33});
    // onBeforeCompile keeps built-in PBR lighting/tone mapping and normals.
    const uniforms={time:{value:0},amplitude:{value:lake?.045:.09}};
    material.onBeforeCompile=shader=>{
      shader.uniforms.uEldoriaTime=uniforms.time;
      shader.uniforms.uEldoriaAmplitude=uniforms.amplitude;
      shader.vertexShader=shader.vertexShader.replace(
        '#include <common>',
        '#include <common>\nuniform float uEldoriaTime;\nuniform float uEldoriaAmplitude;'
      ).replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\ntransformed.y += sin(position.x*0.36 + uEldoriaTime*0.9)*cos(position.z*0.27-uEldoriaTime*0.7)*uEldoriaAmplitude;'
      );
    };
    material.customProgramCacheKey=()=>lake?'eldoria-water-lake-v2':'eldoria-water-stream-v2';
    material.userData.waterUniforms=uniforms;
    return material;
  };
  const river=createMaterial(false),lake=createMaterial(true);
  // Two different periods avoid a synchronized, synthetic appearance.
  function update(time,night){
    river.normalMap.offset.set((time*.013)%1,(time*.034)%1);
    // Shared normalMap moves together; geometry motion differs for each material.
    river.userData.waterUniforms.time.value=time;
    lake.userData.waterUniforms.time.value=time*.48;
    river.userData.waterUniforms.amplitude.value=night?.06:.09;
    lake.userData.waterUniforms.amplitude.value=night?.025:.045;
    // No opacity oscillation: water reflects actual lights, not artificial pulsing.
  }
  return {river,lake,update,dispose(){
    river.dispose();lake.dispose();normalMap.dispose();
  }};
}
