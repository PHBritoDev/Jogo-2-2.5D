/** Original generated artwork projected onto separate relief meshes, not a menu screenshot.
 * HTML owns every control; live iron chains, depth, wind and selection remain WebGL geometry.
 * Sources/provenance: assets/ui/menu/cinematic/README.md. */
import * as T from 'three';
const URLS=['./assets/ui/menu/cinematic/environment.webp','./assets/ui/menu/cinematic/worlds-hero.webp'];
function reliefGeometry(radius,cell,hero=false){
 const g=new T.PlaneGeometry(radius*2.18,radius*2.18,hero?32:40,hero?32:40),p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){
  const u=uv.getX(i),v=uv.getY(i),x=(u-.5)*2,y=(v-.5)*2;
  // Curved front surface retains genuine depth and changing silhouette during Y rotation.
  p.setZ(i,hero?0:radius*.48*Math.sqrt(Math.max(0,1-x*x-y*y)));
  uv.setXY(i,(cell%4+.003+u*.994)/4,(1-Math.floor(cell/4)+.003+v*.994)/2);
 }
 p.needsUpdate=true;uv.needsUpdate=true;g.computeVertexNormals();return g;
}
export function attachCinematicArt({root,scene,environment,stage,planets,width:W,height:H}){
 let active=true,ready=false,background,hero;
 const time={value:0},worlds=[];
 const layer=new T.Group();layer.name='cinematic-art-layers';scene.add(layer);
 const load=href=>new T.TextureLoader().loadAsync(href);/* MOD 376: uma nova tentativa antes da reserva geométrica */
 const promise=Promise.allSettled(URLS.map(url=>{const href=new URL(url,import.meta.url).href;return load(href).catch(()=>load(href));})).then(results=>{
  const textures=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
  if(!active||results.some(r=>r.status==='rejected')){textures.forEach(t=>t.dispose());return false;}
  const [backdrop,atlas]=textures;textures.forEach(t=>{t.colorSpace=T.SRGBColorSpace;t.anisotropy=2;});
  const backgroundMaterial=new T.MeshBasicMaterial({map:backdrop,toneMapped:false,depthWrite:false});
  backgroundMaterial.onBeforeCompile=s=>{s.uniforms.artTime=time;s.vertexShader='uniform float artTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float featherTip=(1.-smoothstep(.07,.20,uv.x))*smoothstep(.65,.85,uv.y);
   transformed.y+=sin(artTime*.38+uv.x*15.)*${(H*.0014).toFixed(6)}*featherTip;`);};
  const featherShader = backgroundMaterial.onBeforeCompile;
  backgroundMaterial.onBeforeCompile = shader => {
   featherShader(shader);
   shader.fragmentShader = 'uniform float artTime;\n' + shader.fragmentShader;
   shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
    vec2 waterUV = vMapUv;
    if (waterUV.x > .21 && waterUV.x < .29 && waterUV.y > .15 && waterUV.y < .40) {
     // Two cataracts in the environment painting. Feather the motion at the rock lips.
     float fallX = mix(.232, .223, smoothstep(.16, .40, waterUV.y));
     float mainFall = 1.0 - smoothstep(.004, .012, abs(waterUV.x - fallX));
     float sideFall = 1.0 - smoothstep(.002, .008, abs(waterUV.x - .269));
     float mask = smoothstep(.15,.21,waterUV.y)*(1.0-smoothstep(.37,.40,waterUV.y));
     float flow = sin(waterUV.y*125.0 + artTime*2.2 + waterUV.x*39.0);
     waterUV.y += mask*max(mainFall,sideFall)*flow*.0027;
    }
    diffuseColor *= texture2D(map,waterUV);
   `);
  };
  backgroundMaterial.customProgramCacheKey=()=> 'cinematic-running-water';
  background=new T.Mesh(new T.PlaneGeometry(W,H,36,24),backgroundMaterial);background.position.z=-320;layer.add(background);
  // The complete fallback sculpture is preserved for failed image loads, hidden only after success.
  stage.group.visible=false;stage.links.material.color.set('#8a7354');stage.links.material.metalness=.45;stage.links.material.roughness=.52;stage.links.material.emissive.set('#130c06');
  environment.children.forEach(o=>{if(!o.isPoints&&!o.material?.transparent)o.visible=false;});
  planets.forEach((planet,index)=>{
   planet.children.forEach(o=>{o.visible=false;});
   const m=new T.MeshBasicMaterial({map:atlas,transparent:true,alphaTest:.025,depthWrite:true,toneMapped:false,side:T.FrontSide});
   const world=new T.Mesh(reliefGeometry(planet.userData.originalRadius,index),m);world.name='cinematic-world-relief-'+(index+1);planet.add(world);planet.userData.artRelief=world;worlds.push(world);
  });
  const heroMaterial=new T.MeshBasicMaterial({map:atlas,transparent:true,alphaTest:.025,depthWrite:true,toneMapped:false,side:T.FrontSide});
  heroMaterial.onBeforeCompile=s=>{s.uniforms.artTime=time;s.vertexShader='uniform float artTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vec2 local=vec2(uv.x*4.-3.,uv.y*2.);
   float cape=(1.-smoothstep(.34,.67,local.x))*smoothstep(.08,.25,local.y)*(1.-smoothstep(.70,.88,local.y));
   transformed.x-=sin(artTime*.56+local.y*3.)*${(H*.003).toFixed(6)}*cape;
   float travellingFold=sin(artTime*1.2+local.x*7.+local.y*2.);
   transformed.y+=travellingFold*${(H*.0055).toFixed(6)}*cape;
   transformed.z+=sin(artTime*.48+local.x*8.)*${(H*.004).toFixed(6)}*cape;`);};
  heroMaterial.customProgramCacheKey=()=> 'cinematic-cape-wind';
  hero=new T.Mesh(reliefGeometry(H*.155,7,true),heroMaterial);hero.name='cinematic-hero';hero.position.set(-H*.055,-H*.30,165);layer.add(hero);
  ready=true;root.dataset.gxArtMode='relief';root.dataset.gxArtSources='2';root.dataset.gxWorldReliefs=String(worlds.length);root.dataset.gxReliefDepth=String(planets[0].userData.originalRadius*.48);
  return true;
 });
 return {ready:promise,
  resize(w,h){layer.scale.set(w/W,h/H,1);},
  update(t){if(!ready)return;time.value=t;worlds.forEach((o,i)=>{o.rotation.y=Math.sin(t*(.045+i*.004))*.085;o.position.y=Math.sin(t*(.17+i*.015)+i)*1.2;});},
  pose(){return {yaw:worlds[0]?.rotation.y||0,time:time.value};},
  stop(){active=false;}
 };
}
