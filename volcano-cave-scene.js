import {ravine} from './volcano-cave-ravine.js';
import {caveShafts} from './volcano-cave-atmosphere.js';
import {calderaVault,upperGalleries,lowerSpillways} from './volcano-cave-galleries.js';
import {assetLod} from './volcano-cave-asset-lod.js';
import {crowns,ritual} from './volcano-cave-crowns.js';
const {grove} = await import('./volcano-cave-grove.js' + new URL(import.meta.url).search);
import {plates,supported,caveHeight,heatPools,caveHeat,solids,fixedRocks,resetStructures} from './volcano-cave-layout.js';
const {masonry} = await import('./volcano-cave-masonry.js' + new URL(import.meta.url).search);

const sector=z=>z>79?0:z> -14?1:2;
function molten(T, group,clock){
 const pos=[],uv=[];
 function strip(points){let prev;
  for(const [x,y,z,dx,dz,v] of points){const pair=[[x-dx,y,z-dz],[x+dx,y,z+dz]];
   if(prev){for(const [p,u,w] of [[prev[0],0,prev[2]],[prev[1],1,prev[2]],[pair[0],0,v],[prev[1],1,prev[2]],[pair[1],1,v],[pair[0],0,v]]){pos.push(...p);uv.push(u,w);}}
   prev=[...pair,v];
  }}
 function finish(){if(!pos.length)return;const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  const mat=new T.ShaderMaterial({uniforms:{clock,fogColor:{value:new T.Color()},fogNear:{value:10},fogFar:{value:200}},fog:true,side:T.DoubleSide,
   vertexShader:`varying vec2 q;
#include <fog_pars_vertex>
void main(){q=uv;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,fragmentShader:`varying vec2 q;uniform float clock;
#include <fog_pars_fragment>
float grain(vec2 p){
 vec2 cell=floor(p),t=fract(p);t=t*t*(3.-2.*t);
 vec4 hashes=fract(sin(vec4(dot(cell,vec2(127.1,311.7)))+vec4(0.,127.1,311.7,438.8))*43758.5453);
 return mix(mix(hashes.x,hashes.y,t.x),mix(hashes.z,hashes.w,t.x),t.y);
}
void main(){
 float edge=min(q.x,1.-q.x),flow=q.y*.85-clock*.77;
 vec2 p=vec2(q.x*4.7,flow);
 p+=vec2(.63*sin(flow*1.35+q.x*7.),.34*sin(q.x*9.+flow));
 float field=grain(p)+.36*grain(p*2.7+vec2(clock*.09,1.));
 float veins=1.-smoothstep(.015,.14,abs(field-.66));
 float plates=smoothstep(.57,.76,field);
 float filament=grain(vec2(q.x*20.+.8*sin(flow*.4),flow*.28));
 float stream=smoothstep(.16,.78,filament);
 float rim=smoothstep(0.,.12+.06*sin(flow*4.),edge);
 vec3 c=mix(vec3(1.,.41,.046),vec3(.51,.075,.016),plates);
 c+=stream*vec3(.52,.24,.043)+veins*vec3(.78,.57,.16)+.2*(1.-plates)*vec3(.68,.18,.025);
 c=mix(vec3(.46,.072,.018),c,rim);
gl_FragColor=vec4(c,1.);
#include <fog_fragment>
}`});const mesh=new T.Mesh(geo,mat);mesh.name='Calhas e cataratas de lava';group.add(mesh);}
 return {strip,finish};
}
function groundPlate(b,p,index){const forest=p.minZ>5&&p.maxZ<78;
 const color=forest?0x4a4144:p.key.includes('-')?0x71615d:0x605354,ring=p.poly.map(([x,z])=>[x,caveHeight(z)+index*.0003,z]);
 const x=ring.reduce((s,v)=>s+v[0],0)/ring.length,z=ring.reduce((s,v)=>s+v[2],0)/ring.length;
 for(let i=0;i<ring.length;i++){const a=ring[i],c=ring[(i+1)%ring.length];b.face([x,caveHeight(z)+index*.0003,z],a,c,color,.88+b.random()*.15);
  const depth=p.key.includes('-')?1.4:11+b.random()*9;b.quad(a,c,[c[0],c[1]-depth,c[2]],[a[0],a[1]-depth,a[2]],0x473b41);
 }
}
// Jointed paving follows the slope. Shared corner offsets keep neighbouring
// slabs keyed together; a bevel catches the source light at ankle height.
function basaltPaving(batch){
 const hash=(x,z)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
 const corner=(i,j)=>[(i+.4*(hash(i,j)-.5))*2.2,(j+.5*(hash(j,i+67)-.5))*1.65];
 for(let j=-59;j<164;j++)for(let i=-17;i<=17;i++){
  const polygon=[corner(i,j),corner(i,j+1),corner(i+1,j+1),corner(i+1,j)];
  const x=polygon.reduce((v,p)=>v+p[0],0)/4,z=polygon.reduce((v,p)=>v+p[1],0)/4;
  if(!supported(x,z)||!polygon.every(([u,v])=>supported(u,v)))continue;
  const distribution=hash(i+13,j);
  if(z<79&&z>0&&distribution>.065)continue;
  if(caveHeat(x,z)||heatPools.some(h=>Math.hypot(x-h.x,z-h.z)<h.r+1.6))continue;
  const shade=z<0?[0x504b55,0x625965,0x726871]:[0x715d60,0x87726c,0x65545a];
  const base=polygon.map(([u,v])=>[u,caveHeight(v)+.018,v]);
  const top=polygon.map(([u,v])=>{const a=x+(u-x)*.93,b=z+(v-z)*.94;return [a,caveHeight(b)+.048+distribution*.016,b];});
  batch.quad(...top,shade[Math.floor(distribution*3)]);
  for(let k=0;k<4;k++){const l=(k+1)%4;batch.quad(base[k],base[l],top[l],top[k],0x403239);}
 }
}
async function assets(T,group,file,instances,alive,updates){
 if(!instances.length)return;
 // Other arena entry points import only core Three.js.
 const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
 if(!alive())return;
 new GLTFLoader().load(new URL(file,import.meta.url).href,gltf=>{
  if(!alive()){gltf.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const value of new Set(Object.values(o.material)))if(value?.isTexture)value.dispose();o.material.dispose();}});return;}
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o=>{if(!o.isMesh)return;const crystal=file.startsWith('Cristal');
   const mat=o.material;
   if(crystal)mat.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
     'vec4 pigment=texture2D(map,vMapUv);float l=dot(pigment.rgb,vec3(.19,.45,.36));diffuseColor.rgb*=.13+1.35*l;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',
     '#include <emissivemap_fragment>\nfloat edge=1.-abs(dot(normalize(vViewPosition),normal));totalEmissiveRadiance+=diffuseColor.rgb*(.53+.65*edge*edge);');
   };
   updates.push(assetLod(T,group,file,o,mat,instances));
  });
 });
}
function flames(T,group,torches,clock){
 if(!torches.length)return;
 const xyz=[],colors=[],bend=[];
 const hues=[[0xe3deff,0x8174ff],[0xffe8a8,0xf96528],[0xd0f8ff,0x3486ff]];
 for(const [i,[x,y,z,size]] of torches.entries()){
  const [core,tip]=hues[i%hues.length].map(c=>new T.Color(c));
  for(let tongue=0;tongue<3;tongue++){
   const ts=tongue===0?1:.6,angle=i*2.4+tongue*2.1;
   let previous;
   for(const [h,r] of [[0,.10],[.15,.14],[.45,.10],[.73,.05],[1,.005]]){
    const ring=Array.from({length:6},(_,j)=>{
     const a=j*Math.PI/3+angle+h*1.6,off=tongue?.10:0;
     return [x+Math.cos(angle)*(off+h*h*.2)+Math.cos(a)*r*ts,y+size*.91+h*.81*ts,z+Math.sin(angle)*(off+h*.09)+Math.sin(a)*r*ts,h];
    });
    if(previous)for(let j=0;j<6;j++){
     const k=(j+1)%6;
     for(const v of [previous[j],previous[k],ring[j],previous[k],ring[k],ring[j]]){
      xyz.push(v[0],v[1],v[2]);bend.push(v[3],angle);
      const c=core.clone().lerp(tip,v[3]);colors.push(c.r,c.g,c.b);
     }
    }
    previous=ring;
   }
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('bend',new T.Float32BufferAttribute(bend,2));
 const material=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide});
 material.onBeforeCompile=shader=>{
  shader.uniforms.fireClock=clock;
  shader.vertexShader='uniform float fireClock;attribute vec2 bend;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\ntransformed.x+=bend.x*bend.x*.09*sin(8.*fireClock+bend.y);transformed.y+=bend.x*.07*sin(12.*fireClock+bend.y);');
 };
 const mesh=new T.Mesh(g,material);mesh.name='Chamas votivas';group.add(mesh);
}
function sanctuary(b,l,crystals,torches){
 const random=b.random,stone=0x705b65,basalt=0x514455;
 // The main fall starts at the broken upper cloister and feeds the lower river.
 for(const [x,z,y,rx,rz] of [[-41,117,24,21,30],[36,101,12,25,17],[58,76,41,23,24],[-65,60,34,27,26],[83,48,36,30,18],[-29,179,35,21,18],[52,153,15,20,18]]){
  b.cliff(x,y,z,rx,rz,68,basalt);const arches=3+Math.floor(random()*4);
  for(let j=0;j<arches;j++)b.arch(x+(j-arches*.5)*5,y,z+5,2.1,4+random()*1.2,2.4,stone);
  b.block(x,y+6.8,z+5,arches*5+1,1.1,3,0x695158);
 }
// The fallen reliquary spans the cleft at the vanishing point of the entry.
 for(let tier=0;tier<3;tier++){
  const y=tier===0?-16.4:-13+tier*13,z=83-tier*9,width=8.4-tier*.9;
  for(let k=-3;k<=3;k++)b.arch(k*width*2,y,z,width*.84,6.4,4.7,0x967779);
  b.block(0,y+6.4+width,z,width*15,1,6.9,0x907573);
 }
 for(const x of [-18,0,18]){const z=61;
  b.block(x,23,z,5,9,5,0x9b7976);b.arch(x,32,z,2.45,2.2,3,0xbb978a);
  b.stalk([[x,37,z,4.2],[x,40,z,2.6],[x,46+(x===0?5:0),z,.08]],6,0x716173);}
 const cascades=[[-31,23,149,3.3],[29,12,122,2.9],[51,41,104,5],[-50,32,91,2.6],[83,35,69,2.2]];
 for(const [x,y,z,r] of cascades){
  // A spillway touches the ledge all the way to the lip. Dark abutments
  // expose the molten centre and connect each sheet to the upper shelf.
  b.cliff(x,y-.63,z-7,r*2.6,7.2,Math.max(22,y+20),0x694951);
  for(const side of [-1,1]){
   const bx=x+side*(r+.75);
   b.stalk([[bx,y-7,z-2,1.6],[bx-.25,y+.15,z-2,1.1],[bx,y+.6,z-2,.68]],7,0x846659);
  }
  l.strip([[x,y,z-9,r,0,0],[x,y,z,r,0,4],[x+.3,y-2,z+1,r,0,5],[x+.7,-23,z+2,r*.8,0,19],[x+2,-23,z+10,r*1.5,0,24]]);}
 l.strip([[-48,-23,174,4,0,0],[-22,-23,142,5,0,8],[-12,-23,118,6,0,16],[21,-23,98,6,0,25],[36,-23,68,4,0,34]]);
 // Fluted fractured basalt beneath stepped terraces; capstones and shrines
 // repeat at progressively smaller apparent scales behind the cataracts.
 for(const [cx,y,cz,radius] of [[-42,24,116,27],[39,12,99,21],[57,41,77,25],[-62,33,59,28],[83,34,48,19]]){
  for(let i=0;i<45;i++){const a=i*2.399,r=.75+random()*2.6,x=cx+Math.cos(a)*radius,z=cz+Math.sin(a)*radius,h=y-2-random()*8;
   b.stalk([[x,-22,z,r*1.18],[x+.2,h-3,z,r],[x,h,z,r*.85]],6,i%3?0x624c5b:0x866659,.33);}
  for(let j=0;j<3;j++){const x=cx+(j-1)*9,z=cz-2+j*1.1,h=6+(j%2)*6;
   b.block(x,y,z,4.8,h,5.5,0x785f6e);b.block(x,y+h-1,z,5.6,1,6.3,0xb79589);
   b.stalk([[x,y+h,z,3.5],[x,y+h+6+j,z,.16]],4,0x564354);}
 }
 for(const [x,z] of [[-12,143],[-6,121],[6,101]]){const h=caveHeight(z);b.arch(x,-19,z,4,Math.max(3,h+13),3.8,stone,Math.PI/2);}
 for(let i=0;i<55;i++){const a=random()*6.28,rad=50+random()*35,x=Math.cos(a)*rad,z=126+Math.sin(a)*rad,y=52+random()*18;
  b.stalk([[x,y-12-random()*14,z,.04],[x+1,y-4,z+1,2+random()*2],[x,y+2,z,4+random()*4]],7,basalt,.65);
 }
 for(let i=0;i<18;i++){const a=i*.65,r=65+i%5*6;b.cliff(Math.cos(a)*r,68+random()*7,125+Math.sin(a)*r,35,29,7,0x372c42);}
 // A shattered brass orrery on the high terrace gives the falls a
 // recognisable skyline. Through the broken rim the player sees the far nave.
 const ox=36,oz=101,oy=24;
 for(let i=0;i<18;i++){
  if(i===6||i===7)continue;
  const a=i*Math.PI/9,beta=a+.31;
  const point=(t,r,d)=>[ox+Math.cos(t)*r,oy+Math.sin(t)*r,oz+d];
  b.quad(point(a,6,.48),point(beta,6,.48),point(beta,6.55,.48),point(a,6.55,.48),0xb3946a);
  b.quad(point(a,6.55,.48),point(beta,6.55,.48),point(beta,6.55,-.48),point(a,6.55,-.48),0x795d4c);
  if(i%3===0)b.face(point(a-.075,6.3,.5),point(a+.075,6.3,.5),point(a,7.5,.5),0xd5a86b);
 }
 for(let i=0;i<3;i++)b.block(ox,12+i*.7,oz,15-i*1.3,.75,8-i,0x8e7074);
 for(const side of [-1,1]){
  b.stalk([[ox+side*5,14,oz,1.8],[ox+side*4.3,18,oz,1.1],[ox+side*4,20,oz,.48]],7,0x685866);
  b.stalk([[ox+side*6,14,oz+2,.8],[ox+side*6,17,oz+2,.55],[ox+side*6,19,oz+2,.05]],6,0xb78e63);
 }
 const colors=[0xd496ff,0xa8d4ff,0xe4a2eb,0x8e9cff,0xa3f3fb];
 for(const [x,y,z,k,hang] of [[-11,17,160,2.4,0],[12,10,124,2.8,0],[-28,24,128,5,0],[30,13,111,5.5,0],[-9,38,146,3.5,1],[13,45,129,5.5,1],[47,43,85,6.5,0],[-32,43,93,4,1]]){
  if(!hang)b.cliff(x,y-.7,z,k*1.55,k*1.3,9,basalt);
  crystals.push([x,y+(hang?-1:1)*k*.55,z,k,hang?Math.PI:.11,random()*6,colors[crystals.length%colors.length]]);
 }
 crystals.push([ox,oy-1.6,oz,1.7,0,.38,0xff724f]);
 for(let j=0;j<24;j++){const z=168-j*2.8,x=z>154?(172-z)*(-7/18):z>137?-7+(154-z)*(-8/17):-15+(137-z)*15/25;
  if(z<112)break;for(const side of [-1,1]){const px=x+side*3.65,h=caveHeight(z);
   b.block(px,h+.035,z,.68,.32,2.35,0x9b7c74);
   if(j%3===1){b.block(px,h+.12,z,.82,.92,.84,0x75586a);b.block(px,h+1,z,1,.18,1,0xad867e);solids.push({x:px,z,base:h,r:.43,h:1.18});}
  }}
 for(const [x,z] of [[-3,169],[-11,151],[4.7,113]]){const h=caveHeight(z);torches.push([x,h,z,1.9,0,.3,0xcaa58d]);}
}
export function buildVolcanoCave(T,g,spec,ctx){
 const names=['Santuário das Cataratas de Fogo','Bosque das Veias Ardentes','Abismo das Coroas Mortas'];
 const lod=new T.LOD();lod.name="Instâncias da caverna";g.add(lod);
 const groups=names.map(n=>{const s=new T.Group();s.name=n;lod.add(s);return s;}),clock={value:0};
 let updateTrees,updateRavine;const assetUpdates=[[],[],[]];
 resetStructures();solids.splice(0,solids.length,...fixedRocks);let active=true;const env={bg:0x241623,fog:0x563b47,fogNear:14,fogFar:178,hemi:[0xf0b7ba,0x694146,1.2],sun:[0,0],light:[0xff7026,3,46,[-31,22,126]],exposure:1.1};
 const galleries=new T.Group();galleries.name="Santuário • galeria superior";groups[0].add(galleries);
 const floors=new T.Group();floors.name="pisos da caverna";g.add(floors);
 const stoneMap=new T.TextureLoader().load(new URL('./assets/ui/menu/polyhaven/rock_face_02/textures/rock_face_02_diff_1k.webp',import.meta.url).href);
 stoneMap.wrapS=stoneMap.wrapT=T.RepeatWrapping;
 stoneMap.colorSpace=T.SRGBColorSpace;
 const deck=masonry(T,floors,971,{stoneMap});
 plates.forEach((p,j)=>groundPlate(deck,p,j));basaltPaving(deck);deck.finish();
 for(let i=0;i<3;i++){const s=groups[i],b=masonry(T,s,862+i,{stoneMap}),l=molten(T,s,clock),crystals=[],torches=[];

  if(i===0){
   calderaVault(T,s);
   sanctuary(b,l,crystals,torches);
   lowerSpillways(b,l,crystals);
   const high=masonry(T,galleries,2491,{stoneMap}),flow=molten(T,galleries,clock),gems=[],lamps=[];
   upperGalleries(high,flow,gems,lamps);
   for(const [x,y,z,size,rotation] of gems)solids.push({x,z,base:y-(rotation>2?1.85*size:0),r:.7*size,h:1.85*size});
   high.finish();flow.finish();flames(T,galleries,lamps,clock);
   assets(T,galleries,'CristalCaverna01.glb',gems,()=>active,assetUpdates[i]);
   assets(T,galleries,'TochaMedievalTripo.glb',lamps,()=>active,assetUpdates[i]);
  }
  if(i===1){updateTrees=grove(T,b,l,s,crystals,clock);updateRavine=ravine(T,s);ritual(T,s,ctx.refs);}
  if(i===2)crowns(T,b,s,clock);
  if(i===0)caveShafts(T,s,[
   {start:[-29,27,148],end:[-27,-12,153],top:2,bottom:7,tint:0xff7d30,strength:.28},
   {start:[20,28,78],end:[21,-16,81],top:2,bottom:6,tint:0xff8b38,strength:.33},
   {start:[15,43,129],end:[10,8,122],top:1,bottom:6,tint:0x9771ff,strength:.14}]);
  if(i===1)caveShafts(T,s,[
   {start:[-11,24,37],end:[-1,-1,40],top:1.2,bottom:5.5,tint:0x8fabc2,strength:.094},
   {start:[7,26,63],end:[1,-1,66],top:1.4,bottom:4,tint:0x8fa6bd,strength:.083}]);
  if(i===2)caveShafts(T,s,[
   {start:[-15,74,-110],end:[-24,-42,-97],top:2,bottom:12,tint:0xc9c8da,strength:.14},
   {start:[-11,76,-109],end:[2,-39,-90],top:.9,bottom:8,tint:0xdddce9,strength:.13}]);
  for(const h of heatPools.filter(h=>sector(h.z)===i)){l.strip(Array.from({length:13},(_,j)=>{const a=Math.PI*j/12,dz=h.r*Math.cos(a);return [h.x,caveHeight(h.z+dz)+.065,h.z+dz,h.r*Math.sin(a),0,j*.22];}));}
  for(const [x,y,z,s,rotation] of crystals){
   solids.push({x,z,base:y-(rotation>2?1.85*s:0),r:.7*s,h:1.85*s});
  }
  l.finish();b.finish();flames(T,s,torches,clock);assets(T,s,'CristalCaverna01.glb',crystals,()=>active,assetUpdates[i]);assets(T,s,'TochaMedievalTripo.glb',torches,()=>active,assetUpdates[i]);
 }
 ctx.refs.lavaHeat=caveHeat;ctx.refs.statues=[{x:-9,z:-89},{x:9,z:-89}];
 const tint=new T.Color(),groveFog=new T.Color(0x414050),crownFog=new T.Color(0x777480),groveSky=new T.Color(0x272938),crownSky=new T.Color(0x98949b);
 const frustum=new T.Frustum(),clipFromCave=new T.Matrix4();
 const localHero=new T.Vector3();let quality='low';
 // Three calls LOD.update while building the render list, after cinematic
 // overrides and camera shake, before it traverses the instance batches.
 lod.update=camera=>{
  frustum.setFromProjectionMatrix(clipFromCave.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(g.matrixWorld));
  const {x,y,z}=localHero;
  if(groups[1].visible)updateTrees(x,z,frustum);
  groups.forEach((group,i)=>{if(group.visible)for(const update of assetUpdates[i])update(x,y,z,quality,frustum);});
 };
 ctx.tick.push((t,dt,c,opts)=>{
  clock.value=t;quality=opts?.quality;
  localHero.copy(opts?.player||c.position).sub(g.position);
  const z=localHero.z;
  groups[0].visible=z>77;galleries.visible=z>135;groups[1].visible=z>-70&&z<145;groups[2].visible=z<22;
  if(groups[1].visible)updateRavine(z,env.bg);
  const f=Math.max(0,Math.min(1,(86-z)/18)),a=Math.max(0,Math.min(1,(-z-3)/25));
  env.fogFar=226-104*f+150*a;env.fogNear=14-6*f+9*a;
  tint.setHex(0x5d5160).lerp(groveFog,f).lerp(crownFog,a);env.fog=tint.getHex();
  tint.setHex(0x241623).lerp(groveSky,f).lerp(crownSky,a);env.bg=tint.getHex();});
 ctx.refs.caveDispose=()=>{
  active=false;
  g.traverse(object=>{if(!object.isInstancedMesh)return;object.dispose();
   for(const texture of new Set(Object.values(object.material)))if(texture?.isTexture&&texture!==object.material.map)texture.dispose();
  });
 };
 return env;
}
